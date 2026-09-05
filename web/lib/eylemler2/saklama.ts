'use server';

/* ═══ UY-56 · Saklama · legal hold · kontrollü imha ════════════════════

   Kalıp `eylemler2/*` ile aynı: yetkiZorunlu → zod → kayıt oku → kapı →
   db → iz → revalidatePath. Kararlar `lib/uyum/saklama.ts`tedir.

   ── BU DOSYA HİÇBİR ŞEYİ KENDİLİĞİNDEN SİLMEZ ─────────────────────────
   Silme YALNIZ `imhaKarariniUygula` içinde ve YALNIZ dört göz kapısından
   geçmiş, onaylanmış bir kararla olur. Bir motorun, bir zamanlayıcının ya
   da bir politikanın kendiliğinden silmesi diye bir yol YOKTUR
   (`tests/otomasyon-guvenligi.test.ts` bunu ölçer).

   ── KAPSAMSIZ BİR YETKİ ───────────────────────────────────────────────
   Saklama politikası bütün kurumu bağlar; santral kapsamı yoktur.
   Bu yüzden kapı `uyum/onay` ister ve `kapsamZorunlu` ÇAĞRILMAZ: burada
   daraltılacak bir santral kümesi yok. Legal hold santrale bağlanabilir
   ama koyan kişi yine kurum çapında yetkilidir — bir santral sorumlusunun
   başka santralin kayıtlarını dondurmaması için değil, hukuki muhafazanın
   bir hukuk kararı olması için. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import {
  SAKLANABILIR_TIPLER, SURE_SONU_SECENEKLERI, degismezMi, holdAltindaMi,
  imhaOnayKapisi, imhaOnerisiKapisi, imhaUygulamaKapisi,
} from '../uyum/saklama';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

const TIP = z.enum(SAKLANABILIR_TIPLER);

/* ── Politika ────────────────────────────────────────────────────────── */

/**
 * Bir kayıt ailesinin saklama politikasını yazar ya da günceller.
 *
 * `saklamaGun: null` SÜRESİZ demektir ve geçerli bir karardır; ama
 * dayanağı yine zorunludur. Dayanaksız bir "süresiz saklıyoruz", bir
 * politika değil bir alışkanlıktır.
 */
export async function saklamaPolitikasiKaydet(girdi: {
  varlikTipi: string;
  saklamaGun: number | null;
  sureSonu: string;
  dayanak: string;
  aktif?: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      varlikTipi: TIP,
      saklamaGun: z.number().int().min(1).max(36_500).nullable(),
      sureSonu: z.enum(SURE_SONU_SECENEKLERI),
      dayanak: bosluksuz('Dayanak').max(500),
      aktif: z.boolean().optional(),
    }).parse(girdi);

    /* Değişmez aileye `imha_oner` yazmak, uygulanamayacak bir öneri
       üretmekten başka bir şey yapmaz; kapı burada söylenir. */
    if (v.sureSonu === 'imha_oner' && degismezMi(v.varlikTipi)) {
      return {
        ok: false,
        hata: `"${v.varlikTipi}" DEĞİŞMEZ bir kayıt ailesidir: veritabanı `
          + 'tetikleyicisi silmeyi reddeder. Süre sonu davranışı imha olamaz.',
      };
    }

    const onceki = await db.saklamaPolitikasi.findUnique({
      where: { varlikTipi: v.varlikTipi },
    });
    const veri = {
      saklamaGun: v.saklamaGun,
      sureSonu: v.sureSonu,
      dayanak: v.dayanak,
      aktif: v.aktif ?? true,
      guncelleyenId: k.id,
    };
    const kayit = await db.saklamaPolitikasi.upsert({
      where: { varlikTipi: v.varlikTipi },
      create: { varlikTipi: v.varlikTipi, ...veri },
      update: veri,
    });

    const ozet = `${v.saklamaGun === null ? 'süresiz' : `${v.saklamaGun} gün`} · ${v.sureSonu}`;
    await iz({
      aktorId: k.id, varlikTipi: 'SaklamaPolitikasi', varlikId: kayit.id,
      eylem: onceki ? 'guncelleme' : 'olusturma', alan: 'saklama',
      once: onceki
        ? `${onceki.saklamaGun === null ? 'süresiz' : `${onceki.saklamaGun} gün`} · ${onceki.sureSonu}`
        : null,
      sonra: `${v.varlikTipi}: ${ozet}`,
      gerekce: v.dayanak,
    });

    revalidatePath('/saklama');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ── Legal hold ──────────────────────────────────────────────────────── */

/**
 * Hukuki muhafaza koyar.
 *
 * Hold BİR KAYIT AİLESİNE konur; `varlikId` boşsa ailenin tamamı, doluysa
 * tek kayıt. Bir soruşturma çoğu zaman "şu santralin bütün bulguları"
 * gibi bir kümedir ve tek tek kayıt işaretlemek pratikte uygulanmaz.
 */
export async function legalHoldKoy(girdi: {
  ad: string;
  varlikTipi: string;
  varlikId?: string | null;
  tesisId?: string | null;
  gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      ad: bosluksuz('Hold adı').max(200),
      varlikTipi: TIP,
      varlikId: z.string().trim().max(64).nullable().optional(),
      tesisId: z.string().trim().max(64).nullable().optional(),
      gerekce: bosluksuz('Gerekçe').max(1000),
    }).parse(girdi);

    const kayit = await db.legalHold.create({
      data: {
        ad: v.ad, varlikTipi: v.varlikTipi,
        varlikId: v.varlikId ?? null, tesisId: v.tesisId ?? null,
        gerekce: v.gerekce, koyanId: k.id,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'LegalHold', varlikId: kayit.id,
      eylem: 'olusturma',
      sonra: `${v.ad} · ${v.varlikTipi}${v.varlikId ? ` #${v.varlikId}` : ' (aile geneli)'}`,
      gerekce: v.gerekce,
    });

    revalidatePath('/saklama');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Hold'u kaldırır.
 *
 * Kayıt SİLİNMEZ, durumu değişir: bir hold'un ne zaman konduğu ve ne
 * zaman kalktığı denetimin sorusudur ve silinmiş bir hold o soruyu
 * cevapsız bırakır. Kaldırma gerekçesi zorunludur — hukuki muhafazayı
 * kaldırmak, koymak kadar hesap sorulabilir bir karardır.
 */
export async function legalHoldKaldir(girdi: {
  id: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      id: bosluksuz('Hold id'),
      gerekce: bosluksuz('Kaldırma gerekçesi').max(1000),
    }).parse(girdi);

    const hold = await db.legalHold.findUnique({ where: { id: v.id } });
    if (!hold) throw new Error('Hold bulunamadı');
    if (hold.durum !== 'aktif') return tamam(); // idempotent

    await db.legalHold.update({
      where: { id: v.id },
      data: {
        durum: 'kaldirildi', kaldiranId: k.id, kaldirildi: new Date(),
        kaldirmaGerekcesi: v.gerekce,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'LegalHold', varlikId: v.id,
      eylem: 'guncelleme', alan: 'durum', once: 'aktif', sonra: 'kaldirildi',
      gerekce: v.gerekce,
    });

    revalidatePath('/saklama');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ── İmha ────────────────────────────────────────────────────────────── */

/** Politikanın kapsadığı kayıt sayısını ÖLÇER — tahmin etmez. */
async function suresiDolanSayisi(
  varlikTipi: string, saklamaGun: number,
): Promise<{ sayi: number; enEski: Date | null; enYeni: Date | null }> {
  const esik = new Date(Date.now() - saklamaGun * 86_400_000);
  /* Her ailenin "yaş" alanı farklıdır; tek bir jenerik sorgu yazmak
     yerine aile başına doğru alan seçilir. Yanlış alanla ölçülen bir
     imha kapsamı, yanlış kayıtları silmeye götürür. */
  switch (varlikTipi) {
    case 'Bulgu': {
      /* Bulgunun yaşı TESPİT tarihinden sayılır: kaydın veritabanına ne
         zaman girdiği değil, olayın ne zaman görüldüğü. Saklama süresi
         de mevzuatta böyle yazılır. */
      const satirlar = await db.bulgu.findMany({
        where: { tespitTarihi: { lt: esik } },
        select: { tespitTarihi: true },
        orderBy: { tespitTarihi: 'asc' },
      });
      return ozetle(satirlar.map((s) => s.tespitTarihi));
    }
    case 'Kanit': {
      const satirlar = await db.kanit.findMany({
        where: { olusturuldu: { lt: esik } },
        select: { olusturuldu: true },
        orderBy: { olusturuldu: 'asc' },
      });
      return ozetle(satirlar.map((s) => s.olusturuldu));
    }
    case 'IsKosusu': {
      const satirlar = await db.isKosusu.findMany({
        where: { baslangic: { lt: esik } },
        select: { baslangic: true },
        orderBy: { baslangic: 'asc' },
      });
      return ozetle(satirlar.map((s) => s.baslangic));
    }
    case 'ApiIstegi': {
      const satirlar = await db.apiIstegi.findMany({
        where: { zaman: { lt: esik } },
        select: { zaman: true },
        orderBy: { zaman: 'asc' },
      });
      return ozetle(satirlar.map((s) => s.zaman));
    }
    case 'Bildirim': {
      const satirlar = await db.bildirim.findMany({
        where: { olusturuldu: { lt: esik } },
        select: { olusturuldu: true },
        orderBy: { olusturuldu: 'asc' },
      });
      return ozetle(satirlar.map((s) => s.olusturuldu));
    }
    case 'EskalasyonKaydi': {
      const satirlar = await db.eskalasyonKaydi.findMany({
        where: { zaman: { lt: esik } },
        select: { zaman: true },
        orderBy: { zaman: 'asc' },
      });
      return ozetle(satirlar.map((s) => s.zaman));
    }
    default:
      /* Değişmez aileler buraya HİÇ gelmez (kapı önce keser); yeni bir
         aile eklenip burası unutulursa sıfır DÖNMEZ, hata atar: sessiz
         sıfır, "imha edilecek kayıt yok" diye okunurdu. */
      throw new Error(`"${varlikTipi}" için imha kapsamı ölçülemiyor`);
  }
}

function ozetle(tarihler: Date[]) {
  return {
    sayi: tarihler.length,
    enEski: tarihler[0] ?? null,
    enYeni: tarihler[tarihler.length - 1] ?? null,
  };
}

/** Aktif hold'ları okur — kapı hem öneride hem uygulamada bunu sorar. */
async function aktifHoldlar(varlikTipi: string) {
  return db.legalHold.findMany({
    where: { durum: 'aktif', varlikTipi },
    select: { varlikTipi: true, varlikId: true, tesisId: true, durum: true },
  });
}

/**
 * İmha ÖNERİSİ açar. Hiçbir şey silinmez.
 *
 * Kapsanan kayıt sayısı öneri anında ÖLÇÜLÜR ve karara yazılır: denetçi
 * "kaç kayıt imha edildi" diye sorduğunda cevap tahmin olmaz.
 */
export async function imhaOnerisiAc(girdi: {
  varlikTipi: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      varlikTipi: TIP,
      gerekce: bosluksuz('Gerekçe').max(1000),
    }).parse(girdi);

    const politika = await db.saklamaPolitikasi.findUnique({
      where: { varlikTipi: v.varlikTipi },
    });
    const holdlar = await aktifHoldlar(v.varlikTipi);
    const kapi = imhaOnerisiKapisi({
      varlikTipi: v.varlikTipi,
      politika: politika
        ? { saklamaGun: politika.saklamaGun, aktif: politika.aktif }
        : null,
      holdVar: holdAltindaMi({ holdlar, varlikTipi: v.varlikTipi }),
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };
    /* Kapı geçtiyse politika ve süresi kesin doludur; TypeScript'e de
       bunu söylemek gerekiyor. */
    if (!politika || politika.saklamaGun === null) {
      return { ok: false, hata: 'Saklama süresi tanımlı değil.' };
    }

    const olcum = await suresiDolanSayisi(v.varlikTipi, politika.saklamaGun);
    if (olcum.sayi === 0) {
      return {
        ok: false,
        hata: 'Saklama süresi dolmuş kayıt yok; imha kararı açılmadı.',
      };
    }

    const karar = await db.imhaKarari.create({
      data: {
        politikaId: politika.id,
        varlikTipi: v.varlikTipi,
        kapsananSayi: olcum.sayi,
        donemBaslangic: olcum.enEski,
        donemBitis: olcum.enYeni,
        gerekce: v.gerekce,
        onerenId: k.id,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'ImhaKarari', varlikId: karar.id,
      eylem: 'olusturma',
      sonra: `${v.varlikTipi} · ${olcum.sayi} kayıt · ÖNERİ`,
      gerekce: v.gerekce,
    });

    revalidatePath('/saklama');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Öneriyi onaylar. Öneren kendi önerisini onaylayamaz — dört göz. */
export async function imhaKarariniOnayla(girdi: {
  id: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      id: bosluksuz('Karar id'),
      gerekce: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    const karar = await db.imhaKarari.findUnique({ where: { id: v.id } });
    if (!karar) throw new Error('Karar bulunamadı');

    const kapi = imhaOnayKapisi({
      durum: karar.durum, onerenId: karar.onerenId, onaylayanId: k.id,
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    await db.imhaKarari.update({
      where: { id: v.id },
      data: { durum: 'onaylandi', onaylayanId: k.id, onaylandi: new Date() },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'ImhaKarari', varlikId: v.id,
      eylem: 'onay', alan: 'durum', once: 'oneri', sonra: 'onaylandi',
      gerekce: v.gerekce ?? null,
    });

    revalidatePath('/saklama');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Öneriyi reddeder. Reddedilen karar SİLİNMEZ: kararın kendisi kayıttır. */
export async function imhaKarariniReddet(girdi: {
  id: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      id: bosluksuz('Karar id'),
      gerekce: bosluksuz('Ret gerekçesi').max(1000),
    }).parse(girdi);

    const karar = await db.imhaKarari.findUnique({ where: { id: v.id } });
    if (!karar) throw new Error('Karar bulunamadı');
    if (karar.durum !== 'oneri') {
      return { ok: false, hata: `Karar "${karar.durum}" durumunda; reddedilemez.` };
    }

    await db.imhaKarari.update({ where: { id: v.id }, data: { durum: 'reddedildi' } });
    await iz({
      aktorId: k.id, varlikTipi: 'ImhaKarari', varlikId: v.id,
      eylem: 'ret', alan: 'durum', once: 'oneri', sonra: 'reddedildi',
      gerekce: v.gerekce,
    });

    revalidatePath('/saklama');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Onaylanmış kararı UYGULAR — ürünün gerçekten sildiği tek yer.
 *
 * ── HOLD YENİDEN SORULUR ──────────────────────────────────────────────
 * Öneri ile uygulama arasında bir soruşturma başlamış olabilir. Öneri
 * anındaki "hold yok" cevabına güvenmek, dondurulmuş kayıtları silmek
 * demek olurdu.
 *
 * ── SİLİNEN SAYI YENİDEN ÖLÇÜLÜR ──────────────────────────────────────
 * `kapsananSayi` öneri anının ölçümüdür; uygulama anında kayıt sayısı
 * değişmiş olabilir. Karara İKİSİ de yazılır.
 */
export async function imhaKarariniUygula(girdi: { id: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({ id: bosluksuz('Karar id') }).parse(girdi);

    const karar = await db.imhaKarari.findUnique({
      where: { id: v.id }, include: { politika: true },
    });
    if (!karar) throw new Error('Karar bulunamadı');

    const holdlar = await aktifHoldlar(karar.varlikTipi);
    const kapi = imhaUygulamaKapisi({
      durum: karar.durum,
      onerenId: karar.onerenId,
      onaylayanId: karar.onaylayanId,
      uygulayanId: k.id,
      holdVar: holdAltindaMi({ holdlar, varlikTipi: karar.varlikTipi }),
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };
    if (karar.politika.saklamaGun === null) {
      return { ok: false, hata: 'Politika süresiz saklama diyor; imha uygulanamaz.' };
    }

    const esik = new Date(Date.now() - karar.politika.saklamaGun * 86_400_000);
    const silinen = await sil(karar.varlikTipi, esik);

    await db.imhaKarari.update({
      where: { id: v.id },
      data: { durum: 'uygulandi', uygulandi: new Date(), silinenSayi: silinen },
    });
    /* Denetim izi imhadan SONRA yazılır ve kendisi imha edilemez
       (`AktiviteKaydi` değişmez ailedir): silinen kayıtların ardında
       kalan tek şey budur. */
    await iz({
      aktorId: k.id, varlikTipi: 'ImhaKarari', varlikId: v.id,
      eylem: 'guncelleme', alan: 'durum', once: 'onaylandi', sonra: 'uygulandi',
      gerekce: `${karar.varlikTipi}: ${silinen} kayıt imha edildi `
        + `(öneri anında ${karar.kapsananSayi} ölçülmüştü). ${karar.gerekce}`,
    });

    revalidatePath('/saklama');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Gerçek silme. Yalnız `imhaKarariniUygula` çağırır. */
async function sil(varlikTipi: string, esik: Date): Promise<number> {
  switch (varlikTipi) {
    case 'Bulgu':
      return (await db.bulgu.deleteMany({ where: { tespitTarihi: { lt: esik } } })).count;
    case 'Kanit':
      return (await db.kanit.deleteMany({ where: { olusturuldu: { lt: esik } } })).count;
    case 'IsKosusu':
      return (await db.isKosusu.deleteMany({ where: { baslangic: { lt: esik } } })).count;
    case 'ApiIstegi':
      return (await db.apiIstegi.deleteMany({ where: { zaman: { lt: esik } } })).count;
    case 'Bildirim':
      return (await db.bildirim.deleteMany({ where: { olusturuldu: { lt: esik } } })).count;
    case 'EskalasyonKaydi':
      return (await db.eskalasyonKaydi.deleteMany({ where: { zaman: { lt: esik } } })).count;
    default:
      throw new Error(`"${varlikTipi}" imha edilemez`);
  }
}
