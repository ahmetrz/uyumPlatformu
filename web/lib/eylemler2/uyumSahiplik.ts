'use server';

/* ═══ UY-07 · Kontrol sahipliği ve dört göz eylemleri ══════════════════

   Kalıp `eylemler2/*` ile aynıdır ve ondan sapılmaz:
     yetkiZorunlu(KAPSAM_SONRA) → zod → kayıt oku → kapsamZorunlu →
     db → iz → revalidatePath

   ── DOĞRULAMA BİR ONAY DEĞİLDİR ───────────────────────────────────────
   Onay akışı ayrı bir mekanizmadır (`OnayTalebi`). Buradaki doğrulama,
   değerlendirmeyi YAPANDAN BAŞKA birinin kaydı okuyup "dayanağı yeterli"
   demesidir. Aynı kişinin kendi kararını doğrulaması hiç doğrulanmamış
   olmakla aynı kapıya çıkar — ama ekranda "doğrulandı" yazar; bu yüzden
   sunucu reddeder.

   ── KİM DEĞERLENDİRDİ ─────────────────────────────────────────────────
   Değerlendirmeyi yapan kişi `MaddeDurumu` üzerinde TUTULMAZ; değişmez
   `DegerlendirmeTarihcesi` tablosunun son satırındaki `aktorId`dir.
   Ayrı bir alanda kopyalamak, iki doğruluk kaynağı üretirdi. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import { dogrulayabilirMi } from '../uyum/kontrolSahipligi';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

const gerekceAlani = z.string().trim().min(10, 'Gerekçe en az 10 karakter olmalı');

/**
 * Değerlendirmeyi doğrular (dört göz).
 *
 * `onay: false` doğrulamayı GERİ ALIR; bu da bir karardır ve gerekçe
 * ister. Damgayı sessizce silmek, doğrulamanın hiç yapılmadığı
 * izlenimini verirdi.
 */
export async function degerlendirmeDogrula(girdi: {
  maddeDurumuId: string; onay: boolean; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay', KAPSAM_SONRA);
    const v = z.object({
      maddeDurumuId: bosluksuz('Madde durumu'),
      onay: z.boolean(),
      gerekce: gerekceAlani,
    }).parse(girdi);

    const kayit = await db.maddeDurumu.findUnique({
      where: { id: v.maddeDurumuId },
      select: {
        id: true, tesisId: true, surecId: true, durum: true,
        sonDegerlendirme: true, dogrulayanId: true,
      },
    });
    if (!kayit) return hata(new Error('Madde durumu bulunamadı'));
    kapsamZorunlu(k, 'uyum', 'onay', { tesisId: kayit.tesisId, surecId: kayit.surecId },
      'Bu tesis/süreç kapsamında doğrulama yetkiniz yok');

    if (!v.onay) {
      if (kayit.dogrulayanId === null) {
        return hata(new Error('Bu değerlendirme zaten doğrulanmamış.'));
      }
      await db.maddeDurumu.update({
        where: { id: v.maddeDurumuId },
        data: { dogrulayanId: null, dogrulamaZamani: null },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'MaddeDurumu', varlikId: v.maddeDurumuId,
        eylem: 'guncelleme', alan: 'dogrulayanId',
        once: kayit.dogrulayanId, sonra: null, gerekce: v.gerekce,
      });
      revalidatePath('/surecler');
      return tamam();
    }

    /* Değerlendirmeyi kim yaptı: değişmez tarihçenin SON satırı. */
    const son = await db.degerlendirmeTarihcesi.findFirst({
      where: { maddeDurumuId: v.maddeDurumuId },
      orderBy: { zaman: 'desc' },
      select: { aktorId: true },
    });

    const karar = dogrulayabilirMi({
      dogrulayanId: k.id,
      degerlendirenId: son?.aktorId ?? null,
      degerlendirildi: kayit.sonDegerlendirme !== null,
    });
    if (!karar.ok) return hata(new Error(karar.sebep));

    await db.maddeDurumu.update({
      where: { id: v.maddeDurumuId },
      data: { dogrulayanId: k.id, dogrulamaZamani: new Date() },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'MaddeDurumu', varlikId: v.maddeDurumuId,
      eylem: 'onay', alan: 'dogrulayanId',
      once: kayit.dogrulayanId, sonra: k.id, gerekce: v.gerekce,
    });
    revalidatePath('/surecler');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Kontrolün sorumlu EKİBİNİ atar ya da kaldırır.
 *
 * Ayrı bir eylem olmasının sebebi: ekip ataması bir değerlendirme
 * DEĞİLDİR. `maddeDurumGuncelle` çağrıldığında `sonDegerlendirme`
 * bugüne çekilir ve kanıt güveni yeniden hesaplanır; yalnız ekip
 * atamak için o kaydı "yeniden değerlendirilmiş" göstermek, tazelik
 * ölçümünü sessizce yalanlardı.
 */
export async function kontrolEkibiAta(girdi: {
  maddeDurumuId: string; ekipId: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      maddeDurumuId: bosluksuz('Madde durumu'),
      ekipId: z.string().trim().transform((s) => s || null).nullable(),
    }).parse(girdi);

    const kayit = await db.maddeDurumu.findUnique({
      where: { id: v.maddeDurumuId },
      select: { id: true, tesisId: true, surecId: true, ekipId: true },
    });
    if (!kayit) return hata(new Error('Madde durumu bulunamadı'));
    kapsamZorunlu(k, 'uyum', 'yazma', { tesisId: kayit.tesisId, surecId: kayit.surecId },
      'Bu tesis/süreç kapsamında sorumluluk atama yetkiniz yok');

    if (v.ekipId) {
      const e = await db.ekip.findUnique({
        where: { id: v.ekipId }, select: { id: true, aktif: true },
      });
      if (!e) return hata(new Error('Ekip bulunamadı'));
      /* Pasif ekip sorumlu OLAMAZ: ekranda "sorumlusu var" yazar,
         gerçekte kimse bakmaz — OT-09 ile aynı kural. */
      if (!e.aktif) return hata(new Error('Pasif ekip kontrol sorumlusu olamaz.'));
    }

    await db.maddeDurumu.update({
      where: { id: v.maddeDurumuId }, data: { ekipId: v.ekipId },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'MaddeDurumu', varlikId: v.maddeDurumuId,
      eylem: 'guncelleme', alan: 'ekipId',
      once: kayit.ekipId, sonra: v.ekipId,
    });
    revalidatePath('/surecler');
    return tamam();
  } catch (e) { return hata(e); }
}
