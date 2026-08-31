'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

/* Konfigürasyon yedeği eylemleri — İNSAN KARARLARI.

   Bu dosyadaki her eylem, motorun yapmasının YASAK olduğu şeyi yapar:
   bir yedeğin okunabilirliğini doğrulamak, "son bilinen iyi" sürümü
   işaretlemek, veri kalitesi kuyruğundaki bir boşluğu işlemek. Üçü de
   yargı gerektirir; motor bunları kendiliğinden yapamaz
   (detect → correlate → propose → HUMAN APPROVE).

   Yedek ALMAK ya da GERİ YÜKLEMEK burada da yoktur: platform yedekleme
   ürününün yerini almaz, yalnız durumunu izler ve kanıta bağlar. */

/** Yedeğin bağlı olduğu varlığın tesisinde yazma yetkisi var mı. */
async function yedegeErisim(yedekId: string) {
  const k = await yetkiZorunlu('envanter', 'yazma');
  const yedek = await db.konfigurasyonYedegi.findUnique({
    where: { id: yedekId },
    select: {
      id: true, varlikId: true, dogrulandi: true, sonBilinenIyi: true,
      basarili: true, yedekZamani: true, surum: true, kaynakSistem: true,
      varlik: { select: { etiket: true, tesisId: true } },
    },
  });
  if (!yedek) throw new Error('Yedek kaydı bulunamadı');
  if (yedek.varlik.tesisId
    && !izinVar(k, 'envanter', 'yazma', { tesisId: yedek.varlik.tesisId })) {
    throw new Error('Bu tesis kapsamında yetkiniz yok');
  }
  return { k, yedek };
}

/**
 * Yedeğin OKUNABİLİRLİĞİNİ insan doğrular.
 *
 * Bu bir geri yükleme testi DEĞİLDİR ("yedek açılabiliyor" ≠ "sistem geri
 * dönüyor") — restore testi santral katmanında `GeriYuklemeTesti` olarak
 * durur ve `restoreTestId` ile buraya bağlanır. Motor bu alanı kendisi
 * dolduramaz: kendi topladığı veriyi doğrulayamaz.
 */
export async function yedegiDogrula(girdi: {
  yedekId: string; dogrulandi: boolean; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      yedekId: bosluksuz('Yedek kaydı'),
      dogrulandi: z.boolean(),
      gerekce: z.string().nullable().optional(),
    }).parse(girdi);

    const { k, yedek } = await yedegeErisim(v.yedekId);
    if (v.dogrulandi && !yedek.basarili) {
      return { ok: false, hata: 'Başarısız bir yedek doğrulanmış sayılamaz' };
    }
    if (yedek.dogrulandi === v.dogrulandi) return tamam();

    await db.konfigurasyonYedegi.update({
      where: { id: yedek.id },
      data: {
        dogrulandi: v.dogrulandi,
        dogrulamaZamani: v.dogrulandi ? new Date() : null,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'KonfigurasyonYedegi', varlikId: yedek.id,
      eylem: 'guncelleme', alan: 'dogrulandi',
      once: String(yedek.dogrulandi), sonra: String(v.dogrulandi),
      gerekce: v.gerekce ?? null,
    });
    revalidatePath('/yedekleme');
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * "Son bilinen iyi" konfigürasyonu insan işaretler.
 *
 * Otomatik konmaz: başarıyla alınmış bir yedek, bozuk bir konfigürasyonu
 * taşıyor olabilir. Bir varlıkta yalnız bir kayıt işaretli kalır; işaret
 * taşındığında eskisi tek transaction içinde düşer (yarım durum olmaz).
 */
export async function sonBilinenIyiIsaretle(girdi: {
  yedekId: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      yedekId: bosluksuz('Yedek kaydı'),
      gerekce: z.string().nullable().optional(),
    }).parse(girdi);

    const { k, yedek } = await yedegeErisim(v.yedekId);
    if (!yedek.basarili) {
      return { ok: false, hata: 'Başarısız yedek "son bilinen iyi" olarak işaretlenemez' };
    }
    if (yedek.sonBilinenIyi) return tamam();

    const oncekiler = await db.$transaction(async (tx) => {
      const eski = await tx.konfigurasyonYedegi.findMany({
        where: { varlikId: yedek.varlikId, sonBilinenIyi: true, id: { not: yedek.id } },
        select: { id: true, yedekZamani: true },
      });
      await tx.konfigurasyonYedegi.updateMany({
        where: { varlikId: yedek.varlikId, sonBilinenIyi: true },
        data: { sonBilinenIyi: false },
      });
      await tx.konfigurasyonYedegi.update({
        where: { id: yedek.id }, data: { sonBilinenIyi: true } });
      return eski;
    });

    await iz({
      aktorId: k.id, varlikTipi: 'KonfigurasyonYedegi', varlikId: yedek.id,
      eylem: 'guncelleme', alan: 'sonBilinenIyi',
      once: oncekiler.length
        ? oncekiler.map((x) => x.yedekZamani.toISOString()).join(', ')
        : null,
      sonra: yedek.yedekZamani.toISOString(),
      gerekce: v.gerekce ?? `${yedek.varlik.etiket} için referans sürüm taşındı`,
    });
    revalidatePath('/yedekleme');
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Yedek doğrulama motorunun ürettiği veri kalitesi bulgusunu insan işler.
 *
 * Motor kendi bulgusunu KAPATAMAZ; yalnız koşul gerçekten düzeldiğinde
 * (yedek gelmiş) bir sonraki koşuda 'cozuldu' yapar. "Yok sayma" kararı
 * insanın ve GEREKÇE ZORUNLUDUR — gerekçesiz susturma denetim izinde
 * savunulamaz.
 */
export async function yedekBulgusunuIsle(girdi: {
  bulguId: string; karar: 'cozuldu' | 'yok_sayildi'; gerekce: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      bulguId: bosluksuz('Bulgu'),
      karar: z.enum(['cozuldu', 'yok_sayildi'], 'Geçersiz karar'),
      gerekce: bosluksuz('Gerekçe'),
    }).parse(girdi);

    const k = await yetkiZorunlu('yonetim', 'yazma');
    const bulgu = await db.veriKalitesiBulgusu.findUnique({ where: { id: v.bulguId } });
    if (!bulgu) return { ok: false, hata: 'Bulgu bulunamadı' };
    if (!bulgu.kural.startsWith('yedek')) {
      return { ok: false, hata: 'Bu eylem yalnız yedek bulgularını işler' };
    }
    if (bulgu.durum !== 'acik') return { ok: false, hata: 'Bulgu zaten kapalı' };

    await db.veriKalitesiBulgusu.update({
      where: { id: bulgu.id },
      data: { durum: v.karar, kapanis: new Date() },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'VeriKalitesiBulgusu', varlikId: bulgu.id,
      eylem: 'durum_degisimi', alan: bulgu.kural,
      once: 'acik', sonra: v.karar, gerekce: v.gerekce,
    });
    revalidatePath('/saglik');
    revalidatePath('/yedekleme');
    return tamam();
  } catch (e) { return hata(e); }
}
