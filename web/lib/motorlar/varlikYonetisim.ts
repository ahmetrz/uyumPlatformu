import 'server-only';
import { db } from '../db';
import { driftKarsilastir } from '../varlik/konfigDrift';
import { tersKarsilastir } from '../varlik/kesifYetkisi';

/* ═══ Varlık yönetişimi motorları — OT-28 · OT-16 ═════════════════════

   İkisi de aynı sözleşmeyi taşır (`() => Promise<{islenen, uretilen}>`),
   `isKos` sarmalayıcısından geçer ve hiçbiri throw etmez.

   ── MOTOR ÖNERİR, KARAR VERMEZ ────────────────────────────────────────
   Drift motoru sapma AÇAR; hangisinin onaylı bir değişiklikten geldiğini
   İNSAN söyler. Ters karşılaştırma motoru "bu varlık ağda görünmüyor"
   der; varlığı envanterden DÜŞÜRMEZ — silme kararı asla bir motorun
   işi değildir. */

/** Bir varlık "ağda görünmüyor" sayılmadan önce beklenecek gün. */
export const GORULMEME_ESIGI_GUN = 45;

/* ── OT-28 · Konfigürasyon drift ────────────────────────────────────── */

export async function konfigDriftiniIsle(): Promise<{ islenen: number; uretilen: number }> {
  const temeller = await db.konfigTemeli.findMany({
    select: { id: true, varlikId: true, ozetHash: true },
  });
  if (temeller.length === 0) return { islenen: 0, uretilen: 0 };

  let islenen = 0; let uretilen = 0;
  for (const t of temeller) {
    islenen += 1;
    /* Yalnız EN YENİ başarılı yedek karşılaştırılır: konfigürasyon bir
       anlık görüntüdür ve eski bir yedekteki fark bugünkü gerçeği
       anlatmaz. Başarısız yedek hiç okunmaz — içeriği eksik olabilir ve
       eksik içerik "değişmiş" gibi görünürdü. */
    const yedek = await db.konfigurasyonYedegi.findFirst({
      where: { varlikId: t.varlikId, basarili: true },
      orderBy: { yedekZamani: 'desc' },
      select: { id: true, icerikHash: true },
    });

    const karar = driftKarsilastir({
      temelHash: t.ozetHash,
      gozlenenHash: yedek?.icerikHash ?? null,
    });
    /* Karar verilemeyen durum sapma AÇMAZ: özeti olmayan bir yedek
       yüzünden cihazı "değişmiş" göstermek, hash hesaplayamayan bir
       konnektörün bütün filoyu kırmızıya boyaması demekti. */
    if (karar.sonuc !== 'sapma') {
      /* Düzelen sapma KAPATILIR — yoksa ekran çoktan geri alınmış bir
         değişikliği sonsuza kadar gösterirdi. Elle karara bağlanmış
         satırlara DOKUNULMAZ. */
      if (karar.sonuc === 'ayni') {
        const kapanan = await db.konfigSapmasi.updateMany({
          where: { temelId: t.id, durum: 'acik' },
          data: {
            durum: 'giderildi', kararZamani: new Date(),
            kararGerekcesi: 'Gözlenen konfigürasyon onaylı tabana döndü (motor).',
          },
        });
        uretilen += kapanan.count;
      }
      continue;
    }

    const gozlenen = yedek!.icerikHash!;
    /* Aynı özet için AÇIK bir sapma varsa yinelenmez: her koşuda yeni
       satır açmak, tek bir farkı yüzlerce bulguya çevirirdi. */
    const acik = await db.konfigSapmasi.findFirst({
      where: { temelId: t.id, durum: 'acik', gozlenenHash: gozlenen },
      select: { id: true },
    });
    if (acik) continue;

    await db.konfigSapmasi.create({
      data: {
        temelId: t.id, varlikId: t.varlikId, yedekId: yedek!.id,
        gozlenenHash: gozlenen, aciklama: karar.gerekce,
      },
    });
    uretilen += 1;
  }
  return { islenen, uretilen };
}

/* ── OT-16 · Envanter ↔ keşif ters karşılaştırması ──────────────────── */

/** Bu motorun açtığı veri kalitesi kuralları — kapatma da buradan yürür. */
export const GORUNURLUK_KURALLARI = ['agda_gorulmedi', 'hic_gorulmedi'] as const;

export async function envanterGorunurluguIsle(): Promise<{ islenen: number; uretilen: number }> {
  const varliklar = await db.varlik.findMany({
    where: { silindi: null, yasamDongusu: { notIn: ['emekli', 'imha'] } },
    select: { id: true, etiket: true },
  });
  if (varliklar.length === 0) return { islenen: 0, uretilen: 0 };

  /* Son görülme keşif kayıtlarından gelir. Varlık başına sorgu açmak
     N+1 olurdu; tek `groupBy` ile en yeni görülme toplanır. */
  const gorulmeler = await db.kesifKaydi.groupBy({
    by: ['eslesenVarlikId'],
    where: { eslesenVarlikId: { in: varliklar.map((v) => v.id) } },
    _max: { sonGorulme: true },
  });
  const sonGorulme = new Map(
    gorulmeler
      .filter((g): g is typeof g & { eslesenVarlikId: string } => g.eslesenVarlikId !== null)
      .map((g) => [g.eslesenVarlikId, g._max.sonGorulme?.getTime() ?? null]),
  );

  const { hicGorulmeyen, kayboldu } = tersKarsilastir({
    varliklar: varliklar.map((v) => ({
      id: v.id, etiket: v.etiket, sonGorulmeMs: sonGorulme.get(v.id) ?? null,
    })),
    esikGun: GORULMEME_ESIGI_GUN,
    simdi: Date.now(),
  });

  const acilacak = [
    ...hicGorulmeyen.map((a) => ({
      kural: 'hic_gorulmedi' as const, kaynakId: a.varlikId,
      aciklama: `${a.etiket} envanterde kayıtlı ama hiçbir keşif kaynağında görülmedi `
        + '— cihaz orada olabilir, kaynak kapsamı eksik olabilir.',
    })),
    ...kayboldu.map((a) => ({
      kural: 'agda_gorulmedi' as const, kaynakId: a.varlikId,
      aciklama: `${a.etiket} ${a.gecenGun} gündür hiçbir keşif kaynağında görülmedi `
        + '— sökülmüş ve envanterden düşülmemiş olabilir.',
    })),
  ];

  let uretilen = 0;
  for (const b of acilacak) {
    const acik = await db.veriKalitesiBulgusu.findFirst({
      where: { kural: b.kural, kaynakTipi: 'Varlik', kaynakId: b.kaynakId, durum: 'acik' },
    });
    if (acik) continue;
    await db.veriKalitesiBulgusu.create({
      data: { kural: b.kural, kaynakTipi: 'Varlik', kaynakId: b.kaynakId, aciklama: b.aciklama },
    });
    uretilen += 1;
  }

  /* Yeniden görülen varlığın bulgusu KAPANIR. */
  const halaVar = new Set(acilacak.map((b) => `${b.kural}|${b.kaynakId}`));
  const acikOlanlar = await db.veriKalitesiBulgusu.findMany({
    where: { durum: 'acik', kaynakTipi: 'Varlik', kural: { in: [...GORUNURLUK_KURALLARI] } },
    select: { id: true, kural: true, kaynakId: true },
  });
  for (const a of acikOlanlar) {
    if (halaVar.has(`${a.kural}|${a.kaynakId}`)) continue;
    await db.veriKalitesiBulgusu.update({
      where: { id: a.id }, data: { durum: 'kapandi', kapanis: new Date() },
    });
    uretilen += 1;
  }

  return { islenen: varliklar.length, uretilen };
}
