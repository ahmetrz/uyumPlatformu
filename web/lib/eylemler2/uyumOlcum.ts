'use server';

/* ═══ UY-59 · Olgunluk seviyesi  ·  UY-64 · Kontrol testi ══════════════

   İkisi de MADDE DURUMUNA (santral × kontrol) yazar ve ikisi de aynı
   kapsam kapısından geçer; bu yüzden aynı dosyada yaşarlar.

   ── OLGUNLUK BİR UYUM DURUMU DEĞİLDİR ─────────────────────────────────
   `MaddeDurumu.durum` "uyumlu mu" sorusunu yanıtlar; olgunluk "ne kadar
   oturmuş" sorusunu. Bir kontrol uyumlu olup olgunluk 1'de olabilir:
   çalışıyor ama tek bir kişiye bağlı. İkisini tek alana sıkıştırmak bu
   bilgiyi yok ederdi. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import type { AktifKullanici } from '../auth';
import { OLGUNLUK_ASGARI, OLGUNLUK_AZAMI, OLGUNLUK_KISA, olgunlukKapisi } from '../uyum/olgunluk';
import { SONUCLAR, YONTEMLER, testKapisi } from '../uyum/kontrolTesti';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

async function durumKapsami(k: AktifKullanici, id: string, mesaj: string) {
  const d = await db.maddeDurumu.findUnique({
    where: { id },
    select: {
      id: true, tesisId: true, surecId: true, olgunlukSeviyesi: true,
      madde: { select: { kod: true, olgunlukSeviyesi: true } },
    },
  });
  if (!d) throw new Error('Kontrol durumu bulunamadı');
  kapsamZorunlu(k, 'uyum', 'yazma', { tesisId: d.tesisId, surecId: d.surecId }, mesaj);
  return d;
}

/**
 * Bir kontrolün ÖLÇÜLEN olgunluk seviyesini yazar.
 *
 * `null` yazmak ölçümü KALDIRIR ve bu meşrudur: yanlış ölçülmüş bir
 * seviye, ölçülmemiş olmaktan kötüdür.
 */
export async function olgunlukKaydet(girdi: {
  maddeDurumuId: string;
  seviye: number | null;
  gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      maddeDurumuId: bosluksuz('Kontrol durumu id'),
      seviye: z.number().int().min(OLGUNLUK_ASGARI).max(OLGUNLUK_AZAMI).nullable(),
      gerekce: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    const d = await durumKapsami(k, v.maddeDurumuId,
      'Bu kontrolde olgunluk yazma yetkiniz yok');

    const kapi = olgunlukKapisi({ seviye: v.seviye, gerekce: v.gerekce ?? null });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    await db.maddeDurumu.update({
      where: { id: v.maddeDurumuId }, data: { olgunlukSeviyesi: v.seviye },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'MaddeDurumu', varlikId: v.maddeDurumuId,
      eylem: 'guncelleme', alan: 'olgunlukSeviyesi',
      once: d.olgunlukSeviyesi === null ? 'ölçülmedi' : OLGUNLUK_KISA[d.olgunlukSeviyesi],
      sonra: v.seviye === null ? 'ölçülmedi' : OLGUNLUK_KISA[v.seviye],
      gerekce: v.gerekce ?? null,
    });

    revalidatePath('/uyum');
    revalidatePath('/surecler');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Maddenin HEDEF olgunluk seviyesini yazar.
 *
 * Hedef bütün santraller için ortaktır: bu yüzden kapsam kapısı
 * santral değil, `uyum/onay` yetkisidir. Bir santral sorumlusunun
 * kurum genelindeki hedefi değiştirmesi doğru olmazdı.
 */
export async function hedefOlgunlukKaydet(girdi: {
  maddeId: string; seviye: number | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      maddeId: bosluksuz('Madde id'),
      seviye: z.number().int().min(OLGUNLUK_ASGARI).max(OLGUNLUK_AZAMI).nullable(),
    }).parse(girdi);

    const m = await db.madde.findUnique({
      where: { id: v.maddeId }, select: { kod: true, olgunlukSeviyesi: true },
    });
    if (!m) throw new Error('Madde bulunamadı');

    await db.madde.update({
      where: { id: v.maddeId }, data: { olgunlukSeviyesi: v.seviye },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Madde', varlikId: v.maddeId,
      eylem: 'guncelleme', alan: 'hedefOlgunluk',
      once: m.olgunlukSeviyesi === null ? 'tanımsız' : OLGUNLUK_KISA[m.olgunlukSeviyesi],
      sonra: v.seviye === null ? 'tanımsız' : OLGUNLUK_KISA[v.seviye],
    });

    revalidatePath('/uyum');
    revalidatePath('/regulasyonlar');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Kontrol testi kaydı (UY-64).
 *
 * Kayıt SİLİNMEZ ve DEĞİŞTİRİLMEZ: bir test yapılmıştır. Yanlış
 * girilen testin karşılığı yeni bir test kaydıdır, eskisinin
 * düzeltilmesi değil — denetçi zaman içindeki test geçmişini okur.
 */
export async function kontrolTestiKaydet(girdi: {
  maddeDurumuId: string;
  yontem: string;
  evrenSayisi?: number | null;
  orneklemSayisi?: number | null;
  uygunSayisi?: number | null;
  sonuc: string;
  testTarihi: string;
  not?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      maddeDurumuId: bosluksuz('Kontrol durumu id'),
      yontem: z.enum(YONTEMLER),
      evrenSayisi: z.number().int().nullable().optional(),
      orneklemSayisi: z.number().int().nullable().optional(),
      uygunSayisi: z.number().int().nullable().optional(),
      sonuc: z.enum(SONUCLAR),
      testTarihi: bosluksuz('Test tarihi'),
      not: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    await durumKapsami(k, v.maddeDurumuId, 'Bu kontrolde test kaydetme yetkiniz yok');

    const tarih = new Date(v.testTarihi);
    if (Number.isNaN(tarih.getTime())) {
      return { ok: false, hata: 'Test tarihi okunamadı.' };
    }

    const kapi = testKapisi({
      yontem: v.yontem,
      evrenSayisi: v.evrenSayisi ?? null,
      orneklemSayisi: v.orneklemSayisi ?? null,
      uygunSayisi: v.uygunSayisi ?? null,
      sonuc: v.sonuc,
      testTarihi: tarih.getTime(),
      simdi: Date.now(),
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    const kayit = await db.kontrolTesti.create({
      data: {
        maddeDurumuId: v.maddeDurumuId,
        yontem: v.yontem,
        evrenSayisi: v.evrenSayisi ?? null,
        orneklemSayisi: v.orneklemSayisi ?? null,
        uygunSayisi: v.uygunSayisi ?? null,
        sonuc: v.sonuc,
        testTarihi: tarih,
        testEdenId: k.id,
        not: v.not ?? null,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'KontrolTesti', varlikId: kayit.id,
      eylem: 'olusturma',
      sonra: `${v.yontem} testi · ${v.sonuc}`
        + (v.orneklemSayisi ? ` · ${v.uygunSayisi}/${v.orneklemSayisi} örnek uygun` : ''),
      gerekce: v.not ?? null,
    });

    revalidatePath('/uyum');
    revalidatePath('/surecler');
    return tamam();
  } catch (e) { return hata(e); }
}
