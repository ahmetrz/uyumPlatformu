'use server';

/* ═══ UY-41 · Resmî mevzuat kaynağı kütüğü ═════════════════════════════

   Kalıp `eylemler2/*` ile aynıdır.

   ── ÜRÜN HİÇBİR ADRESLE GELMEZ ────────────────────────────────────────
   Bu modülde tek bir resmî site adresi yoktur. Adres kurumdan gelir ve
   kurum girene kadar alan boş kalır; ekran o kaydı "adres girilmemiş"
   diye gösterir, "güncel" diye DEĞİL.

   ── "BAKTIM" BİR KAYITTIR, BİR VARSAYIM DEĞİL ─────────────────────────
   `sonKontrol` yalnız bir insan "baktım" dediğinde yazılır. Ürün hiçbir
   siteye bağlanmadığı için "değişiklik yok" DEMEZ; yalnız en son ne
   zaman bakıldığını ve o bakışta ne not düşüldüğünü taşır. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { IZLEME_TURLERI } from '../uyum/mevzuatKaynagi';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

/** Adres serbesttir ama biçimi denetlenir; ürün onu ÇAĞIRMAZ, saklar. */
const adresAlani = z.string().trim()
  .transform((x) => x || null)
  .nullable()
  .refine(
    (x) => x === null || /^https?:\/\/\S+$/i.test(x),
    'Adres http(s) ile başlamalı',
  );

export async function mevzuatKaynagiKaydet(girdi: {
  id?: string;
  regulasyonId: string;
  ad: string;
  adres?: string | null;
  izlemeTuru?: string;
  kontrolAraligiGun?: number;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma');
    const v = z.object({
      id: z.string().optional(),
      regulasyonId: bosluksuz('Regülasyon'),
      ad: bosluksuz('Kaynak adı'),
      adres: adresAlani.optional(),
      izlemeTuru: z.enum(IZLEME_TURLERI).default('elle'),
      kontrolAraligiGun: z.number().int()
        .min(1, 'Kontrol aralığı en az 1 gün olmalı')
        .max(3650, 'Kontrol aralığı en çok 10 yıl olabilir')
        .default(90),
    }).parse(girdi);

    /* `saglayici` izlemesi bugün SEÇİLEMEZ: bağlı sağlayıcı yok ve
       seçilebilseydi kütükte "otomatik izleniyor" yazan ama hiçbir yere
       bağlanmayan bir kayıt dururdu. */
    if (v.izlemeTuru === 'saglayici') {
      return hata(new Error(
        'Sağlayıcı ile izleme seçilemez: kayıtlı ve BAĞLI bir resmî kaynak '
        + 'sağlayıcısı yok. Kurum erişimi tanımlanana kadar izleme "elle"dir.',
      ));
    }

    const reg = await db.regulasyon.findUnique({
      where: { id: v.regulasyonId }, select: { id: true },
    });
    if (!reg) return hata(new Error('Regülasyon bulunamadı'));

    if (v.id) {
      const eski = await db.regulasyonKaynagi.findUnique({
        where: { id: v.id }, select: { id: true, ad: true, adres: true },
      });
      if (!eski) return hata(new Error('Kaynak bulunamadı'));
      await db.regulasyonKaynagi.update({
        where: { id: v.id },
        data: {
          ad: v.ad, adres: v.adres ?? null, izlemeTuru: v.izlemeTuru,
          kontrolAraligiGun: v.kontrolAraligiGun,
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'RegulasyonKaynagi', varlikId: v.id,
        eylem: 'guncelleme', alan: 'adres', once: eski.adres, sonra: v.adres ?? null,
      });
    } else {
      const yeni = await db.regulasyonKaynagi.create({
        data: {
          regulasyonId: v.regulasyonId, ad: v.ad, adres: v.adres ?? null,
          izlemeTuru: v.izlemeTuru, kontrolAraligiGun: v.kontrolAraligiGun,
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'RegulasyonKaynagi', varlikId: yeni.id,
        eylem: 'olusturma', alan: 'ad', once: null, sonra: v.ad,
      });
    }
    revalidatePath('/regulasyonlar');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * "Bu kaynağa baktım" kaydı.
 *
 * Not ZORUNLUDUR ve bu bilinçlidir: notsuz bir "baktım", takip
 * sayacını sıfırlar ama denetçiye hiçbir şey söylemez. "Değişiklik
 * yok" da bir nottur ve yazılması gerekir.
 */
export async function kaynakKontroluKaydet(girdi: {
  kaynakId: string;
  not: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma');
    const v = z.object({
      kaynakId: bosluksuz('Kaynak'),
      not: z.string().trim().min(
        5,
        'Kontrol notu zorunlu — "değişiklik yok" da bir nottur ve yazılır',
      ),
    }).parse(girdi);

    const kaynak = await db.regulasyonKaynagi.findUnique({
      where: { id: v.kaynakId }, select: { id: true, adres: true, sonKontrol: true },
    });
    if (!kaynak) return hata(new Error('Kaynak bulunamadı'));
    if (!kaynak.adres) {
      return hata(new Error(
        'Bu kaynağın adresi girilmemiş; bakılacak bir yer yok. Önce adresi kaydedin.',
      ));
    }

    const simdi = new Date();
    await db.regulasyonKaynagi.update({
      where: { id: v.kaynakId },
      data: { sonKontrol: simdi, sonKontrolEdenId: k.id, sonNot: v.not },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'RegulasyonKaynagi', varlikId: v.kaynakId,
      eylem: 'guncelleme', alan: 'sonKontrol',
      once: kaynak.sonKontrol?.toISOString() ?? null, sonra: simdi.toISOString(),
      gerekce: v.not,
    });
    revalidatePath('/regulasyonlar');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function mevzuatKaynagiSil(girdi: { kaynakId: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'onay');
    const v = z.object({ kaynakId: bosluksuz('Kaynak') }).parse(girdi);
    const kaynak = await db.regulasyonKaynagi.findUnique({
      where: { id: v.kaynakId }, select: { id: true, ad: true },
    });
    if (!kaynak) return hata(new Error('Kaynak bulunamadı'));

    await db.regulasyonKaynagi.delete({ where: { id: v.kaynakId } });
    await iz({
      aktorId: k.id, varlikTipi: 'RegulasyonKaynagi', varlikId: v.kaynakId,
      eylem: 'silme', alan: 'ad', once: kaynak.ad, sonra: null,
    });
    revalidatePath('/regulasyonlar');
    return tamam();
  } catch (e) { return hata(e); }
}
