'use server';

/* ═══ UY-43 · Değerlendirme içe aktarımı ═══════════════════════════════

   İki eylem, iki adım: KURU KOŞU ve UYGULAMA. İkisi ayrıdır ve uygulama
   kendi kuru koşusuna KÖKENLE bağlıdır — bağsız uygulama yazılamaz.

   ── NEDEN İKİ ADIM ────────────────────────────────────────────────────
   Bir değerlendirme aktarımı tek hamlede yüzlerce kontrolün durumunu
   değiştirir ve bunların her biri bir DENETİM KARARIDIR. Önizlemesiz
   uygulamak, kararları körlemesine toptan yazmaktır.

   ── HESAP TEK YERDE ───────────────────────────────────────────────────
   Hem kuru koşu hem uygulama `lib/uyum/degerlendirmeAktarimi.ts →
   kuruKosu()` çağırır. İki ayrı hesap, önizlemenin gösterdiği ile
   uygulamanın yazdığı şeyin ayrışmasını üretirdi.

   ── HER SATIR KENDİ İZİNİ BIRAKIR ─────────────────────────────────────
   Toplu aktarım tek bir "aktarım yapıldı" satırı bırakmaz: her durum
   değişikliği kendi `DegerlendirmeTarihcesi` ve `AktiviteKaydi`
   satırını yazar. Toplu yazmayı izsiz geçirmek, denetimde en pahalı
   boşluktur. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import {
  aktarimCumlesi, aktarimSayimlari, kuruKosu, uygulamaKapisi,
  type HamSatir, type OnizlemeSatiri,
} from '../uyum/degerlendirmeAktarimi';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

const SatirSemasi = z.object({
  satirNo: z.number().int().min(1),
  maddeKodu: z.string(),
  durum: z.string(),
  not: z.string().nullable().optional(),
  gerekce: z.string().nullable().optional(),
});

/** Tek koşuda okunabilecek en çok satır — sınırsız yükleme kabul edilmez. */
export const SATIR_TAVANI = 5000;

export type KuruKosuSonucu = Sonuc & {
  aktarimId?: string;
  satirlar?: OnizlemeSatiri[];
  cumle?: string;
  okunan?: number;
  eslesen?: number;
  elenen?: number;
  degisen?: number;
};

/**
 * Kuru koşu: ne olacağını hesaplar ve KAYDEDER — ama hiçbir
 * değerlendirmeye dokunmaz.
 *
 * Kaydedilmesinin sebebi köken: uygulama adımı bu kaydın kimliğini
 * ister ve ona bağlanır. Kuru koşu kaydı bir yan etki değil, uygulama
 * için bir ÖN KOŞULDUR.
 */
export async function degerlendirmeKuruKosu(girdi: {
  regulasyonId: string;
  tesisId: string;
  surecId?: string | null;
  kaynakAdi: string;
  satirlar: HamSatir[];
}): Promise<KuruKosuSonucu> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      regulasyonId: bosluksuz('Regülasyon'),
      tesisId: bosluksuz('Santral'),
      surecId: z.string().trim().transform((s) => s || null).nullable().optional(),
      kaynakAdi: bosluksuz('Kaynak adı'),
      satirlar: z.array(SatirSemasi)
        .min(1, 'Aktarılacak satır yok')
        .max(SATIR_TAVANI, `Tek koşuda en çok ${SATIR_TAVANI} satır okunur`),
    }).parse(girdi);

    /* Kapsam kapısı HEDEF santrale sorulur: aktarım o santralin
       değerlendirmelerini değiştirecek. */
    kapsamZorunlu(k, 'uyum', 'yazma',
      { tesisId: v.tesisId, surecId: v.surecId ?? null },
      'Bu santralde değerlendirme aktarma yetkiniz yok');

    const mevcutKayitlar = await db.maddeDurumu.findMany({
      where: {
        tesisId: v.tesisId,
        madde: { regulasyonId: v.regulasyonId, silindi: null },
        ...(v.surecId ? { surecId: v.surecId } : {}),
      },
      select: {
        id: true, durum: true, maddeId: true,
        madde: { select: { kod: true } },
      },
    });

    /* AKTİF istisnası olan maddeler ayrı okunur: kurum o maddeyi bu
       santral için bilinçli olarak kapsam dışı bırakmıştır ve toplu bir
       aktarımın o kararı sessizce ezmesi, onaylı bir istisnayı bir
       elektronik tablo satırıyla geçersiz kılmak olurdu. */
    const istisnalar = await db.istisna.findMany({
      where: { tesisId: v.tesisId, durum: 'aktif' },
      select: { maddeId: true },
    });
    const disMaddeler = new Set(istisnalar.map((d) => d.maddeId));

    const satirlar = kuruKosu({
      satirlar: v.satirlar,
      mevcut: mevcutKayitlar.map((m) => ({
        maddeKodu: m.madde.kod,
        maddeDurumuId: m.id,
        durum: m.durum,
        kapsamda: !disMaddeler.has(m.maddeId),
      })),
    });
    const sayimlar = aktarimSayimlari(satirlar);

    const kayit = await db.degerlendirmeAktarimi.create({
      data: {
        regulasyonId: v.regulasyonId, tesisId: v.tesisId, surecId: v.surecId ?? null,
        kaynakAdi: v.kaynakAdi, durum: 'kuru_kosu',
        okunan: sayimlar.okunan, eslesen: sayimlar.eslesen,
        elenen: sayimlar.elenen, degisen: sayimlar.degisen,
        raporJson: JSON.stringify({ satirlar, sayimlar }),
        yukleyenId: k.id,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'DegerlendirmeAktarimi', varlikId: kayit.id,
      eylem: 'olusturma', alan: 'durum', once: null, sonra: 'kuru_kosu',
      gerekce: `${v.kaynakAdi} · ${aktarimCumlesi(sayimlar)}`,
    });
    return {
      ok: true, aktarimId: kayit.id, satirlar, cumle: aktarimCumlesi(sayimlar),
      okunan: sayimlar.okunan, eslesen: sayimlar.eslesen,
      elenen: sayimlar.elenen, degisen: sayimlar.degisen,
    };
  } catch (e) { return hata(e); }
}

export type UygulamaSonucu = Sonuc & { degisen?: number; aktarimId?: string };

/**
 * Kuru koşuyu uygular.
 *
 * Kuru koşu YENİDEN hesaplanır ve kaydedilmiş rapora güvenilmez: kuru
 * koşu ile uygulama arasında biri o kontrollerin durumunu elle
 * değiştirmiş olabilir ve önizlemedeki "eski durum" artık doğru
 * değildir. Kaydedilen rapora körü körüne yazmak, aradaki insan
 * kararını sessizce ezerdi.
 */
export async function degerlendirmeAktarimiUygula(girdi: {
  kuruKosuId: string;
  gerekce: string;
}): Promise<UygulamaSonucu> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay', KAPSAM_SONRA);
    const v = z.object({
      kuruKosuId: bosluksuz('Kuru koşu'),
      gerekce: z.string().trim().min(10, 'Gerekçe en az 10 karakter olmalı'),
    }).parse(girdi);

    const kuru = await db.degerlendirmeAktarimi.findUnique({
      where: { id: v.kuruKosuId },
      select: {
        id: true, durum: true, regulasyonId: true, tesisId: true, surecId: true,
        kaynakAdi: true, raporJson: true,
      },
    });
    if (!kuru) return hata(new Error('Kuru koşu bulunamadı'));
    if (kuru.durum !== 'kuru_kosu') {
      return hata(new Error(
        `Bu kayıt bir kuru koşu değil (durum: ${kuru.durum}); uygulanamaz.`,
      ));
    }
    kapsamZorunlu(k, 'uyum', 'onay',
      { tesisId: kuru.tesisId, surecId: kuru.surecId },
      'Bu santralde değerlendirme aktarımı uygulama yetkiniz yok');

    const rapor = JSON.parse(kuru.raporJson ?? '{"satirlar":[]}') as {
      satirlar: OnizlemeSatiri[];
    };
    const hamSatirlar: HamSatir[] = rapor.satirlar
      .filter((s): s is Extract<OnizlemeSatiri, { kabul: true }> => s.kabul)
      .map((s) => ({
        satirNo: s.satirNo, maddeKodu: s.maddeKodu, durum: s.yeniDurum,
        not: s.not, gerekce: s.gerekce,
      }));

    /* Bugünkü durumlar YENİDEN okunur ve kuru koşu YENİDEN hesaplanır. */
    const mevcutKayitlar = await db.maddeDurumu.findMany({
      where: {
        tesisId: kuru.tesisId,
        madde: { regulasyonId: kuru.regulasyonId, silindi: null },
        ...(kuru.surecId ? { surecId: kuru.surecId } : {}),
      },
      select: { id: true, durum: true, maddeId: true, madde: { select: { kod: true } } },
    });
    const istisnalar = await db.istisna.findMany({
      where: { tesisId: kuru.tesisId, durum: 'aktif' },
      select: { maddeId: true },
    });
    const disMaddeler = new Set(istisnalar.map((d) => d.maddeId));

    const taze = kuruKosu({
      satirlar: hamSatirlar,
      mevcut: mevcutKayitlar.map((m) => ({
        maddeKodu: m.madde.kod, maddeDurumuId: m.id, durum: m.durum,
        kapsamda: !disMaddeler.has(m.maddeId),
      })),
    });
    const sayimlar = aktarimSayimlari(taze);

    const kapi = uygulamaKapisi({ sayimlar, kuruKosuVar: true });
    if (!kapi.ok) return hata(new Error(kapi.sebep));

    const uygulanacak = taze
      .filter((s): s is Extract<OnizlemeSatiri, { kabul: true }> => s.kabul)
      .filter((s) => s.degisiyor);

    const uygulama = await db.degerlendirmeAktarimi.create({
      data: {
        regulasyonId: kuru.regulasyonId, tesisId: kuru.tesisId, surecId: kuru.surecId,
        kaynakAdi: kuru.kaynakAdi, durum: 'uygulandi',
        okunan: sayimlar.okunan, eslesen: sayimlar.eslesen,
        elenen: sayimlar.elenen, degisen: uygulanacak.length,
        raporJson: JSON.stringify({ satirlar: taze, sayimlar }),
        kuruKosuId: kuru.id, yukleyenId: k.id, uygulandi: new Date(),
      },
    });

    const simdi = new Date();
    for (const s of uygulanacak) {
      await db.maddeDurumu.update({
        where: { id: s.maddeDurumuId },
        data: { durum: s.yeniDurum, sonDegerlendirme: simdi, not: s.not ?? undefined },
      });
      /* HER SATIR kendi tarihçe kaydını yazar: toplu aktarımı tek satırda
         özetlemek, "bu kontrol ne zaman uyumsuz oldu" sorusunu
         cevapsız bırakırdı. */
      await db.degerlendirmeTarihcesi.create({
        data: {
          maddeDurumuId: s.maddeDurumuId, eskiDurum: s.eskiDurum,
          yeniDurum: s.yeniDurum, aktorId: k.id,
          gerekce: s.gerekce
            ?? `Toplu aktarım (${kuru.kaynakAdi}, satır ${s.satirNo}): ${v.gerekce}`,
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'MaddeDurumu', varlikId: s.maddeDurumuId,
        eylem: 'durum_degisimi', alan: 'durum',
        once: s.eskiDurum, sonra: s.yeniDurum,
        gerekce: `Değerlendirme aktarımı ${uygulama.id} · satır ${s.satirNo}`,
      });
    }

    await iz({
      aktorId: k.id, varlikTipi: 'DegerlendirmeAktarimi', varlikId: uygulama.id,
      eylem: 'olusturma', alan: 'durum', once: 'kuru_kosu', sonra: 'uygulandi',
      gerekce: `${v.gerekce} · ${uygulanacak.length} kontrolün durumu değişti`,
    });
    revalidatePath('/surecler');
    revalidatePath('/uyum');
    return { ok: true, degisen: uygulanacak.length, aktarimId: uygulama.id };
  } catch (e) { return hata(e); }
}

/** Kuru koşuyu reddeder — uygulanmayacağı KAYDA GEÇER, silinmez. */
export async function degerlendirmeAktarimiReddet(girdi: {
  kuruKosuId: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      kuruKosuId: bosluksuz('Kuru koşu'),
      gerekce: z.string().trim().min(10, 'Gerekçe en az 10 karakter olmalı'),
    }).parse(girdi);

    const kuru = await db.degerlendirmeAktarimi.findUnique({
      where: { id: v.kuruKosuId },
      select: { id: true, durum: true, tesisId: true, surecId: true },
    });
    if (!kuru) return hata(new Error('Kuru koşu bulunamadı'));
    if (kuru.durum !== 'kuru_kosu') {
      return hata(new Error(`Bu kayıt bir kuru koşu değil (durum: ${kuru.durum}).`));
    }
    kapsamZorunlu(k, 'uyum', 'yazma',
      { tesisId: kuru.tesisId, surecId: kuru.surecId },
      'Bu santralde aktarım reddetme yetkiniz yok');

    await db.degerlendirmeAktarimi.update({
      where: { id: v.kuruKosuId }, data: { durum: 'reddedildi' },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'DegerlendirmeAktarimi', varlikId: v.kuruKosuId,
      eylem: 'red', alan: 'durum', once: 'kuru_kosu', sonra: 'reddedildi',
      gerekce: v.gerekce,
    });
    return tamam();
  } catch (e) { return hata(e); }
}
