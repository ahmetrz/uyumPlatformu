import 'server-only';
import { db } from '../db';
import { enOzgulTemel, firmwareKarariVer } from '../varlik/firmwareKarari';
import {
  enAgirSonuc, korelasyonKarariVer, type KorelasyonSonucu,
} from '../varlik/zafiyetKarari';
import { agiDenetle } from '../varlik/agTutarliligi';

/* ═══ Varlık güvenlik duruşu motorları — OT-11 · OT-22 · OT-25 ═════════

   Üç motor, üç ayrı soru. Hepsi aynı sözleşmeyi taşır
   (`() => Promise<{islenen, uretilen}>`), hepsi `isKos` sarmalayıcısından
   geçer ve hiçbiri throw etmez — sessiz hata yasağı `isKosucu.ts`te.

   ── MOTOR ÖNERİR, KARAR VERMEZ ────────────────────────────────────────
   Bu deponun değişmez kuralı burada da geçerli: motorlar hesapladıkları
   sonucu KENDİ tablolarına yazar; `Varlik` satırına, zafiyet durumuna ya
   da bulgu durumuna DOKUNMAZLAR. Firmware motoru bir cihazı "uyumsuz"
   işaretler ama kimseyi kapatmaz; korelasyon motoru "etkilenen" der ama
   `VarlikZafiyeti.durum`u değiştirmez — o insanın kararıdır.

   ── ELLE VERİLEN KARAR EZİLMEZ ────────────────────────────────────────
   `ZafiyetKorelasyonu.elleSonuc` doluysa motor hesabı yazar ama elle
   verilen kararı KORUR. Yanlış pozitif bastırma yolu budur; her koşuda
   silinseydi kimse kullanmazdı. */

/* ── OT-22 · Firmware uyumu ─────────────────────────────────────────── */

export async function firmwareUyumunuIsle(): Promise<{ islenen: number; uretilen: number }> {
  const temeller = await db.firmwareTemeli.findMany({
    select: { id: true, turId: true, uretici: true, model: true, aktif: true,
      onayliSurum: true, asgariSurum: true, bilinenKotuSurumler: true },
  });
  const varliklar = await db.varlik.findMany({
    where: { silindi: null },
    select: { id: true, turId: true, uretici: true, model: true, firmware: true },
  });

  let islenen = 0; let uretilen = 0;
  for (const v of varliklar) {
    islenen += 1;
    const temel = enOzgulTemel(temeller, v);
    const karar = firmwareKarariVer(v.firmware, temel);

    const mevcut = await db.firmwareUyumu.findUnique({ where: { varlikId: v.id } });
    /* Aynı sonuç yeniden yazılmaz: `hesaplanma` her koşuda tazelenirse
       "bu karar ne zaman değişti" sorusu cevapsız kalır. */
    if (mevcut && mevcut.durum === karar.durum && mevcut.kuruluSurum === v.firmware
      && mevcut.temelId === (temel?.id ?? null)) continue;

    await db.firmwareUyumu.upsert({
      where: { varlikId: v.id },
      create: {
        varlikId: v.id, temelId: temel?.id ?? null, kuruluSurum: v.firmware,
        durum: karar.durum, gerekce: karar.gerekce,
      },
      update: {
        temelId: temel?.id ?? null, kuruluSurum: v.firmware,
        durum: karar.durum, gerekce: karar.gerekce, hesaplanma: new Date(),
      },
    });
    uretilen += 1;
  }
  return { islenen, uretilen };
}

/* ── OT-25 · Zafiyet korelasyonu ────────────────────────────────────── */

export async function zafiyetKorelasyonunuIsle(): Promise<{ islenen: number; uretilen: number }> {
  const urunler = await db.advisoryUrunu.findMany({
    include: { advisory: { include: { zafiyetler: true } } },
  });
  if (urunler.length === 0) return { islenen: 0, uretilen: 0 };

  const varliklar = await db.varlik.findMany({
    where: { silindi: null },
    select: { id: true, uretici: true, model: true, firmware: true, surum: true },
  });

  let islenen = 0; let uretilen = 0;
  for (const v of varliklar) {
    islenen += 1;
    /* Değerlendirilecek sürüm: firmware önce, yoksa genel sürüm alanı.
       İkisi de yoksa karar `karar_verilemedi` olur — bu doğrudur ve
       satır yine de yazılır, çünkü "bakılmadı" ile "bakıldı, bilinmiyor"
       farklıdır. */
    const surum = v.firmware ?? v.surum;

    /* Zafiyet başına EN AĞIR sonuç: bir advisory birden çok ürün satırı
       taşıyabilir ve cihaz yalnız birinden etkileniyor olabilir. */
    const zafiyetSonuclari = new Map<string, { sonuc: KorelasyonSonucu; urunId: string }>();
    for (const u of urunler) {
      const karar = korelasyonKarariVer(
        {
          uretici: u.uretici, urunAdi: u.urunAdi, cpe: u.cpe,
          etkilenenAlt: u.etkilenenAlt, etkilenenAltDahil: u.etkilenenAltDahil,
          etkilenenUst: u.etkilenenUst, etkilenenUstDahil: u.etkilenenUstDahil,
          duzeltilenSurum: u.duzeltilenSurum,
        },
        { uretici: v.uretici, model: v.model, cpe: null, surum },
      );
      /* Eşleşmeyen ürün satırları için kayıt AÇILMAZ: her varlık × her
         advisory satırı için satır açmak tabloyu şişirir ve hiçbir şey
         söylemez. Yalnız etkilenen ve karar verilemeyen saklanır. */
      if (karar.sonuc === 'etkilenmeyen') continue;
      for (const az of u.advisory.zafiyetler) {
        const onceki = zafiyetSonuclari.get(az.zafiyetId);
        const enAgir = enAgirSonuc([...(onceki ? [onceki.sonuc] : []), karar]);
        if (enAgir) zafiyetSonuclari.set(az.zafiyetId, { sonuc: enAgir, urunId: u.id });
      }
    }

    for (const [zafiyetId, { sonuc, urunId }] of zafiyetSonuclari) {
      const mevcut = await db.zafiyetKorelasyonu.findUnique({
        where: { varlikId_zafiyetId_yontem: { varlikId: v.id, zafiyetId, yontem: 'surum_araligi' } },
      });
      if (mevcut && mevcut.sonuc === sonuc.sonuc && mevcut.gerekce === sonuc.gerekce) continue;

      await db.zafiyetKorelasyonu.upsert({
        where: { varlikId_zafiyetId_yontem: { varlikId: v.id, zafiyetId, yontem: 'surum_araligi' } },
        create: {
          varlikId: v.id, zafiyetId, advisoryUrunId: urunId, yontem: 'surum_araligi',
          sonuc: sonuc.sonuc, guven: sonuc.guven, gerekce: sonuc.gerekce,
          kanitJson: JSON.stringify(sonuc.kanit),
        },
        /* `elleSonuc` ve gerekçesi UPDATE'te YOK: insan kararı korunur. */
        update: {
          advisoryUrunId: urunId, sonuc: sonuc.sonuc, guven: sonuc.guven,
          gerekce: sonuc.gerekce, kanitJson: JSON.stringify(sonuc.kanit),
          hesaplanma: new Date(),
        },
      });
      uretilen += 1;
    }
  }
  return { islenen, uretilen };
}

/* ── OT-11 · OT-44 · Ağ tutarlılığı ─────────────────────────────────── */

/** Bu motorun açtığı veri kalitesi kuralları — kapatma da buradan yürür. */
export const AG_KURALLARI = [
  'gecersiz_cidr', 'gateway_segment_disi', 'cakisan_segment',
  'ip_segment_disi', 'cift_ip', 'segment_yok',
] as const;

export async function agTutarliliginiIsle(): Promise<{ islenen: number; uretilen: number }> {
  const segmentler = await db.agSegmenti.findMany({
    select: { id: true, kod: true, cidr: true, gatewayIp: true, bolgeId: true },
  });
  const varliklar = await db.varlik.findMany({
    where: { silindi: null },
    select: { id: true, etiket: true, ipAdresi: true, segmentId: true },
  });

  const { bulgular, borclar } = agiDenetle(varliklar, segmentler);
  const islenen = varliklar.length + segmentler.length;

  /* Ölçüm borcu da bir veri kalitesi bulgusudur — ayrı bir kural adıyla.
     Borcu kayda geçirmemek, "ölçemedik" ile "sorun yok"u aynı sayardı. */
  const acilacak = [
    ...bulgular.map((b) => ({
      kural: b.kural, kaynakTipi: b.kaynakTipi, kaynakId: b.kaynakId, aciklama: b.aciklama,
    })),
    ...borclar.map((b) => ({
      kural: `${b.kural}_olculemedi`, kaynakTipi: b.kaynakTipi, kaynakId: b.kaynakId,
      aciklama: b.sebep,
    })),
  ];

  let uretilen = 0;
  for (const b of acilacak) {
    const acik = await db.veriKalitesiBulgusu.findFirst({
      where: { kural: b.kural, kaynakTipi: b.kaynakTipi, kaynakId: b.kaynakId, durum: 'acik' },
    });
    if (acik) continue;                                  // yinelenen bulgu açılmaz
    await db.veriKalitesiBulgusu.create({
      data: { kural: b.kural, kaynakTipi: b.kaynakTipi, kaynakId: b.kaynakId, aciklama: b.aciklama },
    });
    uretilen += 1;
  }

  /* Düzelen bulgu KAPATILIR. Kapatmasaydık ekran, çoktan giderilmiş bir
     çakışmayı sonsuza kadar gösterirdi ve kimse listeye güvenmezdi. */
  const halaVar = new Set(acilacak.map((b) => `${b.kural}|${b.kaynakTipi}|${b.kaynakId}`));
  const acikOlanlar = await db.veriKalitesiBulgusu.findMany({
    where: {
      durum: 'acik',
      kural: { in: [...AG_KURALLARI, ...AG_KURALLARI.map((k) => `${k}_olculemedi`)] },
    },
    select: { id: true, kural: true, kaynakTipi: true, kaynakId: true },
  });
  for (const a of acikOlanlar) {
    if (halaVar.has(`${a.kural}|${a.kaynakTipi}|${a.kaynakId}`)) continue;
    await db.veriKalitesiBulgusu.update({
      where: { id: a.id }, data: { durum: 'kapandi', kapanis: new Date() },
    });
    uretilen += 1;
  }
  return { islenen, uretilen };
}
