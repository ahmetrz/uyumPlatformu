import 'server-only';
import { createHash } from 'node:crypto';
import { db } from '../db';
import type { Prisma } from '../prisma-client/client';
import { kokenYaz } from './koken';
import type { TopolojiGozlemiGirdi } from './sozlesme';

/* Topoloji anlık görüntüsü ve sapma tespiti (P2-2).

   SÖZLEŞME — bu dosya hiçbir koşulda ağı, geçidi ya da varlığı DEĞİŞTİRMEZ.
   Yaptığı tek şey: gözlemi kaydetmek, onaylı temelle karşılaştırmak ve
   FARKI İNSANA GÖSTERMEK. `AgGeciti`, `AgBolgesi`, `Varlik`, `VarlikIliskisi`
   tablolarına yazma yoktur — arama yapıp doğrulayabilirsiniz.

   Akış: gozlendi → inceleme → kabul | ret
     · kabul → o anlık yeni TEMEL olur (eski temel düşer), karar izi yazılır
     · ret   → temel korunur, sapma kapanır; gerekçe her iki durumda ZORUNLU

   Temel (baseline) OTOMATİK KURULMAZ. İlk anlık kendiliğinden temel olmaz;
   bir insan `temelBelirle` ile onaylayana kadar sistem "temel yok" der ve
   sapma hesaplamaz. Temelsiz karşılaştırma, her düğümü "yeni" gösterip
   gürültüden başka bir şey üretmez. */

/* ═══ Tipler ══════════════════════════════════════════════════════════ */

export const BOLGE_TIPLERI = ['bt', 'ot', 'dmz', 'ot_dmz', 'kurumsal', 'internet'] as const;
export type BolgeTipi = (typeof BOLGE_TIPLERI)[number];

export const OGE_TIPLERI = ['dugum', 'gecit', 'baglanti'] as const;
export type OgeTipi = (typeof OGE_TIPLERI)[number];

export const SAPMA_TIPLERI = [
  'yeni_dugum', 'kayip_dugum', 'ip_degisti', 'bolge_degisti',
  'yeni_gecit', 'silinen_gecit', 'beklenmeyen_protokol', 'yol_degisti',
  'yeni_bt_ot_koprusu', 'yetkisiz_dogrudan_baglanti',
] as const;
export type SapmaTipi = (typeof SAPMA_TIPLERI)[number];

export const SIDDETLER = ['dusuk', 'orta', 'yuksek', 'kritik'] as const;
export type Siddet = (typeof SIDDETLER)[number];

export const SAPMA_DURUMLARI = ['gozlendi', 'inceleme', 'kabul', 'ret'] as const;
export type SapmaDurumu = (typeof SAPMA_DURUMLARI)[number];

/** Açık = henüz karara bağlanmamış. Kapalı = kabul veya ret. */
export const ACIK_DURUMLAR: SapmaDurumu[] = ['gozlendi', 'inceleme'];

export const SAPMA_TIP_ETIKETI: Record<SapmaTipi, string> = {
  yeni_dugum: 'Yeni düğüm',
  kayip_dugum: 'Kayıp düğüm',
  ip_degisti: 'IP değişti',
  bolge_degisti: 'Bölge değişti',
  yeni_gecit: 'Yeni geçit',
  silinen_gecit: 'Silinen geçit',
  beklenmeyen_protokol: 'Beklenmeyen protokol',
  yol_degisti: 'Yol değişti',
  yeni_bt_ot_koprusu: 'Yeni BT–OT köprüsü',
  yetkisiz_dogrudan_baglanti: 'Yetkisiz doğrudan bağlantı',
};

export const SIDDET_ETIKETI: Record<Siddet, string> = {
  dusuk: 'Düşük', orta: 'Orta', yuksek: 'Yüksek', kritik: 'Kritik',
};

export const SIDDET_SIRASI: Record<Siddet, number> = {
  kritik: 0, yuksek: 1, orta: 2, dusuk: 3,
};

/**
 * Karşılaştırmanın tek girdi biçimi.
 *
 * `ozellikler` sözleşmesi (adaptör ve ekran bu adları kullanır):
 *   dugum    · anahtar = varlık etiketi (yoksa IP)
 *              { ad?, ip?, bolgeKodu?, bolgeTipi? }
 *   gecit    · anahtar = "KAYNAKBOLGE>HEDEFBOLGE"
 *              { kaynakBolge, hedefBolge, kaynakTipi?, hedefTipi?,
 *                protokoller?, onaylandi?, kontrolVarligi? }
 *   baglanti · anahtar = "KAYNAKDUGUM>HEDEFDUGUM"
 *              { kaynak, hedef, kaynakBolge?, hedefBolge?, kaynakTipi?,
 *                hedefTipi?, protokoller?, izinliProtokoller?, yol? }
 *
 * `onaylandi` üç değerlidir: true | false | null(bilinmiyor). null SIFIR
 * DEĞİLDİR — bilinmeyen onay durumu "onaysız" sayılmaz (§Bilinmeyen ≠ yanlış).
 */
export type TopolojiOgesi = {
  tip: OgeTipi;
  anahtar: string;
  ozellikler: Record<string, unknown>;
};

/** Karşılaştırılabilir anlık: DB satırından da, ham gözlemden de üretilir. */
export type AnlikGorunumu = {
  id?: string | null;
  tesisId?: string | null;
  ozetHash?: string;
  ogeler: TopolojiOgesi[];
};

/** Hesaplanmış ama HENÜZ YAZILMAMIŞ sapma. Yazma ayrı adımdır. */
export type SapmaAdayi = {
  tip: SapmaTipi;
  siddet: Siddet;
  /** hangi öğe — açıklamada da geçer, mükerrer yazımı bu engeller */
  anahtar: string;
  aciklama: string;
  onceki: Record<string, unknown> | null;
  sonraki: Record<string, unknown> | null;
};

export type AnlikGirdi = TopolojiOgesi | TopolojiGozlemiGirdi;

/* ═══ Küçük yardımcılar ═══════════════════════════════════════════════ */

const metin = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

/** protokol listesi: "https;opc-ua" da, ["https"] da kabul; normalize edilir. */
function protokoller(v: unknown): string[] {
  const ham = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[;,]/) : [];
  const temiz = ham
    .map((p) => (typeof p === 'string' ? p.trim().toLowerCase() : ''))
    .filter(Boolean);
  return [...new Set(temiz)].sort();
}

/** Üç değerli onay: true | false | null(bilinmiyor). */
const onayDurumu = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

function bolgeTipi(v: unknown): BolgeTipi | null {
  const s = metin(v)?.toLowerCase();
  return s && (BOLGE_TIPLERI as readonly string[]).includes(s) ? (s as BolgeTipi) : null;
}

function yol(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const d = v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
  return d.length ? d : null;
}

/** OT tarafı: saha/kontrol ağı ve onun DMZ'i. */
const otTarafi = (t: BolgeTipi | null) => t === 'ot' || t === 'ot_dmz';
/** BT tarafı: kurumsal ağ, genel BT ve internet. */
const btTarafi = (t: BolgeTipi | null) => t === 'bt' || t === 'kurumsal' || t === 'internet';
const araBolge = (t: BolgeTipi | null) => t === 'dmz' || t === 'ot_dmz';

/**
 * BT/kurumsal ile OT arasında ARA BÖLGE OLMADAN kurulan bağ.
 * Segmentasyonun (IEC 62443 zone/conduit) tek varlık sebebi bu bağın
 * olmamasıdır; bu yüzden ayrı bir sapma tipi ve en yüksek şiddet.
 */
const dogrudanBtOt = (a: BolgeTipi | null, b: BolgeTipi | null) =>
  (btTarafi(a) && b === 'ot') || (btTarafi(b) && a === 'ot');

/* ═══ Deterministik özet ══════════════════════════════════════════════ */

/** Anahtarları sıralı JSON — aynı içerik her zaman aynı metni verir. */
function kanonik(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return `[${v.map(kanonik).join(',')}]`;
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${kanonik(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

/**
 * Anlığın özeti. SIRALAMA BAĞIMSIZ: gözlemler hangi sırada gelirse gelsin
 * aynı küme aynı özeti verir. İki anlığın aynı olup olmadığı bu tek alanla
 * anlaşılır — tüm gözlemleri karşılaştırmaya gerek kalmaz.
 */
export function ozetHesapla(ogeler: TopolojiOgesi[]): string {
  const satirlar = ogeler
    .map((o) => `${o.tip}|${o.anahtar}|${kanonik(o.ozellikler ?? {})}`)
    .sort();
  return createHash('sha256').update(satirlar.join('\n')).digest('hex');
}

/* ═══ 1 · Anlık alma ══════════════════════════════════════════════════ */

function ogeyeCevir(g: AnlikGirdi): TopolojiOgesi {
  const tip = 'ogeTipi' in g ? g.ogeTipi : g.tip;
  if (!(OGE_TIPLERI as readonly string[]).includes(tip)) {
    throw new Error(`anlikAl: bilinmeyen öğe tipi "${tip}"`);
  }
  const anahtar = metin(g.anahtar);
  if (!anahtar) throw new Error('anlikAl: öğe anahtarı boş olamaz');
  return { tip: tip as OgeTipi, anahtar, ozellikler: g.ozellikler ?? {} };
}

export type AnlikSonucu = {
  id: string;
  ozetHash: string;
  ogeSayisi: number;
  /** temel ile aynı özet mi — "değişiklik yok" bunu okur, tekrar taramaz */
  temelleAyni: boolean;
  temelVar: boolean;
};

/**
 * Gözlem kümesinden bir anlık yazar.
 *
 * `temelMi` HER ZAMAN false başlar: hiçbir anlık kendiliğinden temel olmaz,
 * ilk anlık dahil. Temel yalnız `temelBelirle` (insan onayı) ile kurulur.
 *
 * BOŞ GÖZLEM KÜMESİ KABUL EDİLMEZ: boş liste "topolojide hiçbir şey yok"
 * demektir; temelle karşılaştırılınca her düğümü kayıp gösterir. Kaynak
 * gerçekten hiçbir şey döndürmediyse bu bir hatadır, anlık değil (§Sahte
 * entegrasyon yasağı: boş liste "kayıt yok" anlamına gelir).
 */
export async function anlikAl(
  tesisId: string | null,
  kaynak: string,
  gozlemler: AnlikGirdi[],
  secenekler: {
    connectorId?: string | null;
    kosuId?: string | null;
    not?: string | null;
    alindi?: Date;
  } = {},
): Promise<AnlikSonucu> {
  const kaynakAdi = metin(kaynak);
  if (!kaynakAdi) throw new Error('anlikAl: kaynak zorunlu — kaynağı bilinmeyen anlık yazılmaz');
  if (!Array.isArray(gozlemler) || gozlemler.length === 0) {
    throw new Error(
      'anlikAl: boş gözlem kümesi anlık sayılmaz — kaynak hiçbir öğe döndürmediyse bu bir hatadır',
    );
  }

  const ogeler = gozlemler.map(ogeyeCevir);
  const gorulen = new Set<string>();
  for (const o of ogeler) {
    const k = `${o.tip}|${o.anahtar}`;
    if (gorulen.has(k)) throw new Error(`anlikAl: aynı anlıkta yinelenen öğe anahtarı: ${k}`);
    gorulen.add(k);
  }

  const ozetHash = ozetHesapla(ogeler);
  const temel = await temelAnlik(tesisId);

  const anlik = await db.$transaction(async (tx) => {
    const kayit = await tx.topolojiAnlik.create({
      data: {
        tesisId,
        kaynak: kaynakAdi,
        ozetHash,
        temelMi: false, // otomatik temel YOK — insan onayı bekler
        not: secenekler.not ?? null,
        ...(secenekler.alindi ? { alindi: secenekler.alindi } : {}),
      },
    });
    await tx.topolojiGozlemi.createMany({
      data: ogeler.map((o) => ({
        anlikId: kayit.id,
        tip: o.tip,
        anahtar: o.anahtar,
        ozellikJson: JSON.stringify(o.ozellikler),
      })),
    });
    // Köken YALNIZ gerçek dış kaynak varsa yazılır. Connector yoksa kayıt
    // "otomatik" sayılmaz — iç kayıttan türetilmiş anlık manueldir (§Veri kökeni).
    if (secenekler.connectorId) {
      await kokenYaz(
        {
          varlikTipi: 'TopolojiAnlik',
          varlikId: kayit.id,
          kaynakSistem: kaynakAdi,
          kaynakKayitId: ozetHash, // kaynağın kararlı kimliği yok → deterministik özet
          connectorId: secenekler.connectorId,
          kosuId: secenekler.kosuId ?? null,
          toplanma: kayit.alindi,
          guven: null, // ÖLÇÜLMEDİ — sıfır güven değil
        },
        tx as unknown as Prisma.TransactionClient,
      );
    }
    return kayit;
  });

  return {
    id: anlik.id,
    ozetHash,
    ogeSayisi: ogeler.length,
    temelVar: temel !== null,
    temelleAyni: temel?.ozetHash === ozetHash,
  };
}

/* ═══ 2 · Temel (baseline) ════════════════════════════════════════════ */

/**
 * Yürürlükteki temel: `temelMi=true` VE onaylanmış en son anlık.
 * `onaylayanId` şartı bilerek var — onaysız bir satır temel sayılmaz.
 * Temel yoksa null döner; çağıran sapma hesaplamaz.
 */
export async function temelAnlik(tesisId: string | null) {
  return db.topolojiAnlik.findFirst({
    where: { tesisId, temelMi: true, onaylayanId: { not: null } },
    orderBy: [{ onayZamani: 'desc' }, { alindi: 'desc' }],
    include: { gozlemler: true },
  });
}

/**
 * Bir kapsamın (tesis ya da tesissiz küme) temel durumu — /topoloji
 * ekranındaki temel şeridi bunu okur.
 *
 * ÜÇ SAYI ÜÇ AYRI ŞEYDİR ve ekran bunları birbirinin yerine kullanamaz:
 *   · temelVar === false      → sapma HESAPLANMIYOR (bilinmiyor)
 *   · anlikSayisi === 0       → hiç gözlem yok (yine bilinmiyor, ama başka
 *                               sebeple: burada onaylanacak bir anlık bile yok)
 *   · acikSapma === 0         → ölçülmüş sıfır (temel varsa ve karşılaştırma
 *                               yapıldıysa anlamlıdır)
 *
 * `temelOlmayanAnlik` eskiden `onayBekleyen` adını taşıyordu; yanlış
 * isimdi: temel olmayan bir anlık çoğu zaman onay bekleyen değil, sadece
 * karşılaştırma girdisidir. İsim ekranda "N onay bekliyor" gibi sahte bir
 * iş kuyruğu doğuruyordu.
 */
export async function temelDurumu(tesisId: string | null): Promise<{
  temelVar: boolean;
  temel: { id: string; alindi: Date; kaynak: string; ozetHash: string; onayZamani: Date | null } | null;
  temelOlmayanAnlik: number;
  anlikSayisi: number;
  acikSapma: number;
}> {
  const [temel, temelOlmayanAnlik, anlikSayisi, acikSapma] = await Promise.all([
    temelAnlik(tesisId),
    db.topolojiAnlik.count({ where: { tesisId, temelMi: false } }),
    db.topolojiAnlik.count({ where: { tesisId } }),
    db.topolojiSapmasi.count({ where: { tesisId, durum: { in: ACIK_DURUMLAR } } }),
  ]);
  return {
    temelVar: temel !== null,
    temel: temel
      ? { id: temel.id, alindi: temel.alindi, kaynak: temel.kaynak,
          ozetHash: temel.ozetHash, onayZamani: temel.onayZamani }
      : null,
    temelOlmayanAnlik,
    anlikSayisi,
    acikSapma,
  };
}

/**
 * Bir anlığı temel yapar. YALNIZ İNSAN ÇAĞIRIR — motor çağıramaz, bu yüzden
 * `onaylayanId` zorunludur (§Doğrulama insanın işi). Aynı tesisin eski temeli
 * düşer; iki temel bir arada olmaz.
 */
export async function temelBelirle(
  anlikId: string,
  onaylayanId: string,
  gerekce: string,
): Promise<{ dusenTemelId: string | null }> {
  if (!metin(onaylayanId)) throw new Error('temelBelirle: onaylayan zorunlu — otomatik temel yasak');
  const g = metin(gerekce);
  if (!g) throw new Error('temelBelirle: gerekçe zorunlu');

  const anlik = await db.topolojiAnlik.findUniqueOrThrow({ where: { id: anlikId } });
  if (anlik.temelMi) return { dusenTemelId: null };

  return db.$transaction(async (tx) => {
    const eski = await tx.topolojiAnlik.findFirst({
      where: { tesisId: anlik.tesisId, temelMi: true },
      orderBy: { onayZamani: 'desc' },
    });
    if (eski) {
      await tx.topolojiAnlik.update({ where: { id: eski.id }, data: { temelMi: false } });
    }
    await tx.topolojiAnlik.update({
      where: { id: anlik.id },
      data: { temelMi: true, onaylayanId, onayZamani: new Date(), not: g },
    });
    return { dusenTemelId: eski?.id ?? null };
  });
}

/* ═══ 3 · Karşılaştırma ═══════════════════════════════════════════════ */

/** DB satırlarından karşılaştırılabilir görünüm üretir. */
export function anligiCoz(anlik: {
  id: string; tesisId: string | null; ozetHash: string;
  gozlemler: { tip: string; anahtar: string; ozellikJson: string }[];
}): AnlikGorunumu {
  return {
    id: anlik.id,
    tesisId: anlik.tesisId,
    ozetHash: anlik.ozetHash,
    ogeler: anlik.gozlemler.map((g) => {
      let ozellikler: Record<string, unknown> = {};
      try {
        const c = JSON.parse(g.ozellikJson);
        if (c && typeof c === 'object' && !Array.isArray(c)) ozellikler = c as Record<string, unknown>;
      } catch {
        // Bozuk JSON SESSİZCE YUTULMAZ: öğe "özellikleri okunamadı" olarak
        // taşınır, karşılaştırma bunu fark eder ve fark olarak gösterir.
        ozellikler = { okunamadi: g.ozellikJson };
      }
      return { tip: g.tip as OgeTipi, anahtar: g.anahtar, ozellikler };
    }),
  };
}

function haritala(ogeler: TopolojiOgesi[], tip: OgeTipi): Map<string, TopolojiOgesi> {
  return new Map(ogeler.filter((o) => o.tip === tip).map((o) => [o.anahtar, o]));
}

/** Anlıktaki bölge kodu → tip eşlemesi (düğüm ve geçit özelliklerinden). */
function bolgeTipHaritasi(...gorunumler: AnlikGorunumu[]): Map<string, BolgeTipi> {
  const h = new Map<string, BolgeTipi>();
  const ekle = (kod: unknown, tip: unknown) => {
    const k = metin(kod); const t = bolgeTipi(tip);
    if (k && t && !h.has(k)) h.set(k, t);
  };
  for (const g of gorunumler) {
    for (const o of g.ogeler) {
      const p = o.ozellikler;
      ekle(p.bolgeKodu, p.bolgeTipi);
      ekle(p.kaynakBolge, p.kaynakTipi);
      ekle(p.hedefBolge, p.hedefTipi);
    }
  }
  return h;
}

const bolgeTipiCoz = (
  h: Map<string, BolgeTipi>, dogrudan: unknown, kod: unknown,
): BolgeTipi | null => bolgeTipi(dogrudan) ?? (metin(kod) ? h.get(metin(kod)!) ?? null : null);

/** Anlıkta bu bölge çifti için ONAYLI bir geçit var mı (iki yön de sayılır)? */
function onayliGecitVar(gecitler: Map<string, TopolojiOgesi>, a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  for (const g of gecitler.values()) {
    const k = metin(g.ozellikler.kaynakBolge); const hh = metin(g.ozellikler.hedefBolge);
    const eslesti = (k === a && hh === b) || (k === b && hh === a);
    if (eslesti && onayDurumu(g.ozellikler.onaylandi) === true) return true;
  }
  return false;
}

/**
 * İki anlığı karşılaştırır. SAF FONKSİYON — veritabanına dokunmaz,
 * hiçbir şey yazmaz. Yalnız farkı ve şiddetini üretir.
 *
 * ŞİDDET KURALLARI (her biri kendi satırında gerekçeli):
 *  · kurumsal/BT → OT doğrudan yeni bağlantı  → kritik
 *  · onaysız yeni geçit                        → kritik
 *  · OT'de beklenmeyen protokol                → yuksek
 *  · kayıp düğüm                               → orta
 *  · IP değişikliği                            → dusuk
 */
export function sapmalariHesapla(temel: AnlikGorunumu, yeni: AnlikGorunumu): SapmaAdayi[] {
  const sapmalar: SapmaAdayi[] = [];
  const bt = bolgeTipHaritasi(temel, yeni);

  const tDugum = haritala(temel.ogeler, 'dugum');
  const yDugum = haritala(yeni.ogeler, 'dugum');
  const tGecit = haritala(temel.ogeler, 'gecit');
  const yGecit = haritala(yeni.ogeler, 'gecit');
  const tBag = haritala(temel.ogeler, 'baglanti');
  const yBag = haritala(yeni.ogeler, 'baglanti');

  const dugumBolge = (o: TopolojiOgesi) => bolgeTipiCoz(bt, o.ozellikler.bolgeTipi, o.ozellikler.bolgeKodu);

  /* ── düğümler ─────────────────────────────────────────────────────── */
  for (const [anahtar, oge] of yDugum) {
    const eski = tDugum.get(anahtar);
    if (!eski) {
      const b = dugumBolge(oge);
      sapmalar.push({
        tip: 'yeni_dugum',
        // ŞİDDET GEREKÇESİ: OT bölgesinde temelde olmayan düğüm, kimliği
        // doğrulanmamış cihaz (rogue device) adayıdır — kontrol ağında bu
        // doğrudan üretim/emniyet konusudur. BT tarafında aynı gözlem
        // envanter boşluğudur, tehdit değil.
        siddet: otTarafi(b) ? 'yuksek' : 'orta',
        anahtar,
        aciklama: `Temelde olmayan düğüm: ${anahtar}`
          + (metin(oge.ozellikler.bolgeKodu) ? ` (${metin(oge.ozellikler.bolgeKodu)})` : '')
          + (otTarafi(b) ? ' — OT bölgesinde kimliği doğrulanmamış cihaz.' : ''),
        onceki: null,
        sonraki: { anahtar, ...oge.ozellikler },
      });
      continue;
    }

    const eskiIp = metin(eski.ozellikler.ip);
    const yeniIp = metin(oge.ozellikler.ip);
    if (eskiIp !== yeniIp && (eskiIp || yeniIp)) {
      sapmalar.push({
        tip: 'ip_degisti',
        // ŞİDDET GEREKÇESİ: DHCP olan bir ağda adres değişimi olağandır;
        // tek başına güvenlik olayı değildir. Yüksek şiddet verilirse
        // gerçek sapmalar bu gürültünün altında kalır.
        siddet: 'dusuk',
        anahtar,
        aciklama: `${anahtar} IP değişti: ${eskiIp ?? 'bilinmiyor'} → ${yeniIp ?? 'bilinmiyor'}`,
        onceki: { anahtar, ip: eskiIp },
        sonraki: { anahtar, ip: yeniIp },
      });
    }

    const eskiBolge = metin(eski.ozellikler.bolgeKodu);
    const yeniBolge = metin(oge.ozellikler.bolgeKodu);
    if (eskiBolge !== yeniBolge) {
      const yeniTip = dugumBolge(oge);
      const eskiTip = bolgeTipiCoz(bt, eski.ozellikler.bolgeTipi, eski.ozellikler.bolgeKodu);
      sapmalar.push({
        tip: 'bolge_degisti',
        // ŞİDDET GEREKÇESİ: düğümün OT bölgesine taşınması segmentasyon
        // sınırını kaydırır — yeni saldırı yüzeyi açar. OT'den çıkma ya da
        // BT içi taşınma envanter değişikliğidir.
        siddet: otTarafi(yeniTip) && !otTarafi(eskiTip) ? 'yuksek' : 'orta',
        anahtar,
        aciklama: `${anahtar} bölge değişti: ${eskiBolge ?? 'bilinmiyor'} → ${yeniBolge ?? 'bilinmiyor'}`,
        onceki: { anahtar, bolgeKodu: eskiBolge, bolgeTipi: eskiTip },
        sonraki: { anahtar, bolgeKodu: yeniBolge, bolgeTipi: yeniTip },
      });
    }
  }

  for (const [anahtar, eski] of tDugum) {
    if (yDugum.has(anahtar)) continue;
    sapmalar.push({
      tip: 'kayip_dugum',
      // ŞİDDET GEREKÇESİ: BİLİNMİYOR. Cihaz sökülmüş de olabilir, kapalı da
      // olabilir, gözlem kaynağı onu görememiş de olabilir. Kayıp düğümü
      // kritik saymak yanlış alarm üretir, yok saymak envanteri çürütür —
      // doğru yer ortadır ve kararı insan verir.
      siddet: 'orta',
      anahtar,
      aciklama: `Temelde olan düğüm bu anlıkta görülmedi: ${anahtar}`
        + ' — kaldırılmış, kapalı ya da gözlem kaynağınca görülememiş olabilir.',
      onceki: { anahtar, ...eski.ozellikler },
      sonraki: null,
    });
  }

  /* ── geçitler (conduit) ───────────────────────────────────────────── */
  for (const [anahtar, oge] of yGecit) {
    const eski = tGecit.get(anahtar);
    const kTip = bolgeTipiCoz(bt, oge.ozellikler.kaynakTipi, oge.ozellikler.kaynakBolge);
    const hTip = bolgeTipiCoz(bt, oge.ozellikler.hedefTipi, oge.ozellikler.hedefBolge);
    const onay = onayDurumu(oge.ozellikler.onaylandi);

    if (!eski) {
      if (dogrudanBtOt(kTip, hTip)) {
        sapmalar.push({
          tip: 'yeni_bt_ot_koprusu',
          // ŞİDDET GEREKÇESİ: BT/kurumsal ile OT arasında ara bölge olmadan
          // açılan geçit, segmentasyonun tek varlık sebebini ortadan kaldırır.
          // Kayıtta "onaylı" görünse bile temelde olmayan bir köprü kritiktir.
          siddet: 'kritik',
          anahtar,
          aciklama: `BT/kurumsal ile OT arasında temelde olmayan doğrudan geçit: ${anahtar}`
            + (onay === true ? ' (kayıtta onaylı görünüyor)'
              : onay === false ? ' (onaysız)' : ' (onay durumu bilinmiyor)'),
          onceki: null,
          sonraki: { anahtar, ...oge.ozellikler },
        });
      } else {
        sapmalar.push({
          tip: 'yeni_gecit',
          // ŞİDDET GEREKÇESİ: onaysız geçit = conduit kuralı dışında açılmış
          // yol → kritik. Onay durumu BİLİNMİYORSA kritik denemez (bilinmeyen
          // ≠ yanlış) ama incelenmeden geçilemez → yuksek. Kayıtta onaylı
          // geçidin temelde olmaması da bir farktır → orta.
          siddet: onay === false ? 'kritik' : onay === null ? 'yuksek' : 'orta',
          anahtar,
          aciklama: `Temelde olmayan geçit: ${anahtar}`
            + (onay === false ? ' — onaysız.'
              : onay === null ? ' — onay durumu bilinmiyor.' : ' — kayıtta onaylı.'),
          onceki: null,
          sonraki: { anahtar, ...oge.ozellikler },
        });
      }
      continue;
    }

    const eskiP = protokoller(eski.ozellikler.protokoller);
    const yeniP = protokoller(oge.ozellikler.protokoller);
    const eklenen = yeniP.filter((p) => !eskiP.includes(p));
    if (eklenen.length) {
      sapmalar.push({
        tip: 'beklenmeyen_protokol',
        // ŞİDDET GEREKÇESİ: OT'ye dokunan bir geçitte temelde olmayan
        // protokol, kontrol trafiğinin kapsamını sessizce genişletir —
        // OT'de yuksek. BT tarafında konfigürasyon kaymasıdır.
        siddet: otTarafi(kTip) || otTarafi(hTip) ? 'yuksek' : 'orta',
        anahtar,
        aciklama: `${anahtar} geçidinde temelde olmayan protokol: ${eklenen.join(', ')}`,
        onceki: { anahtar, protokoller: eskiP },
        sonraki: { anahtar, protokoller: yeniP },
      });
    }
  }

  for (const [anahtar, eski] of tGecit) {
    if (yGecit.has(anahtar)) continue;
    sapmalar.push({
      tip: 'silinen_gecit',
      // ŞİDDET GEREKÇESİ: kaybolan geçit güvenlik açığı değil ama kör nokta
      // olabilir — kaldırıldı mı, yoksa gözlem mi göremedi, BİLİNMİYOR.
      siddet: 'orta',
      anahtar,
      aciklama: `Temelde olan geçit bu anlıkta görülmedi: ${anahtar}`,
      onceki: { anahtar, ...eski.ozellikler },
      sonraki: null,
    });
  }

  /* ── bağlantılar ──────────────────────────────────────────────────── */
  for (const [anahtar, oge] of yBag) {
    const eski = tBag.get(anahtar);
    const kBolge = metin(oge.ozellikler.kaynakBolge);
    const hBolge = metin(oge.ozellikler.hedefBolge);
    const kTip = bolgeTipiCoz(bt, oge.ozellikler.kaynakTipi, kBolge);
    const hTip = bolgeTipiCoz(bt, oge.ozellikler.hedefTipi, hBolge);
    const bolgelerArasi = !!kBolge && !!hBolge && kBolge !== hBolge;

    if (!eski) {
      if (dogrudanBtOt(kTip, hTip)) {
        sapmalar.push({
          tip: 'yetkisiz_dogrudan_baglanti',
          // ŞİDDET GEREKÇESİ (kural 4.1): kurumsal/BT bölgesinden OT
          // bölgesine DOĞRUDAN yeni bağlantı — DMZ atlanmış demektir.
          // Onaylı bir geçit olsa bile bu bağ temelde yoktu; kritik.
          siddet: 'kritik',
          anahtar,
          aciklama: `BT/kurumsal bölgeden OT bölgesine doğrudan yeni bağlantı: ${anahtar}`
            + ` (${kBolge ?? 'bilinmiyor'} → ${hBolge ?? 'bilinmiyor'})`,
          onceki: null,
          sonraki: { anahtar, ...oge.ozellikler },
        });
      } else if (bolgelerArasi && !onayliGecitVar(yGecit, kBolge, hBolge)) {
        sapmalar.push({
          tip: 'yetkisiz_dogrudan_baglanti',
          // ŞİDDET GEREKÇESİ: bölge sınırını onaylı bir geçit olmadan geçen
          // yeni bağlantı. OT'ye dokunuyorsa yuksek, BT içindeyse orta.
          siddet: otTarafi(kTip) || otTarafi(hTip) ? 'yuksek' : 'orta',
          anahtar,
          aciklama: `Onaylı geçidi olmayan bölgeler arası yeni bağlantı: ${anahtar}`
            + ` (${kBolge} → ${hBolge})`,
          onceki: null,
          sonraki: { anahtar, ...oge.ozellikler },
        });
      }
      // Aynı bölge içindeki yeni bağlantı sapma değildir: segmentasyon
      // sınırını geçmez. Her iç bağlantıyı sapma saymak listeyi çöpe çevirir.
      continue;
    }

    const eskiYol = yol(eski.ozellikler.yol);
    const yeniYol = yol(oge.ozellikler.yol);
    if (eskiYol && yeniYol && eskiYol.join('>') !== yeniYol.join('>')) {
      const eskideAra = eskiYol.some((b) => araBolge(bt.get(b) ?? null));
      const yenideAra = yeniYol.some((b) => araBolge(bt.get(b) ?? null));
      sapmalar.push({
        tip: 'yol_degisti',
        // ŞİDDET GEREKÇESİ: yeni yol DMZ'yi atlıyorsa bu FİİLEN doğrudan
        // BT→OT bağlantısıdır — aynı kural, aynı şiddet. Diğer yol
        // değişiklikleri yönlendirme/yedeklilik kaynaklı olabilir.
        siddet: eskideAra && !yenideAra ? 'kritik' : 'orta',
        anahtar,
        aciklama: `${anahtar} yolu değişti: ${eskiYol.join(' → ')} ⇒ ${yeniYol.join(' → ')}`
          + (eskideAra && !yenideAra ? ' — ara bölge (DMZ) artık atlanıyor.' : ''),
        onceki: { anahtar, yol: eskiYol },
        sonraki: { anahtar, yol: yeniYol },
      });
    }

    const izinli = protokoller(oge.ozellikler.izinliProtokoller);
    const eskiP = protokoller(eski.ozellikler.protokoller);
    const yeniP = protokoller(oge.ozellikler.protokoller);
    // İzinli liste biliniyorsa ölçüt odur; bilinmiyorsa temel referans alınır.
    const beklenen = izinli.length ? izinli : eskiP;
    const beklenmeyen = yeniP.filter((p) => !beklenen.includes(p));
    if (beklenmeyen.length) {
      sapmalar.push({
        tip: 'beklenmeyen_protokol',
        // ŞİDDET GEREKÇESİ (kural 4.3): OT bölgesinde beklenmeyen protokol
        // → yuksek. Kontrol protokolü listesi dışına çıkan trafik, geçidin
        // kuralını fiilen genişletir.
        siddet: otTarafi(kTip) || otTarafi(hTip) ? 'yuksek' : 'orta',
        anahtar,
        aciklama: `${anahtar} bağlantısında beklenmeyen protokol: ${beklenmeyen.join(', ')}`
          + (izinli.length ? ` (izinli: ${izinli.join(', ')})` : ''),
        onceki: { anahtar, protokoller: eskiP },
        sonraki: { anahtar, protokoller: yeniP },
      });
    }
  }

  return sapmalar.sort(
    (a, b) => SIDDET_SIRASI[a.siddet] - SIDDET_SIRASI[b.siddet]
      || a.tip.localeCompare(b.tip, 'tr') || a.anahtar.localeCompare(b.anahtar, 'tr'),
  );
}

/* ═══ 4 · Sapmaları yazma ═════════════════════════════════════════════ */

/** Mükerrer yazımı engeller: aynı anlık + tip + anahtar bir kez yazılır. */
export async function sapmalariYaz(anlikId: string, adaylar: SapmaAdayi[]): Promise<number> {
  if (adaylar.length === 0) return 0;
  const anlik = await db.topolojiAnlik.findUniqueOrThrow({ where: { id: anlikId } });
  const mevcut = await db.topolojiSapmasi.findMany({
    where: { anlikId }, select: { tip: true, aciklama: true },
  });
  const varOlan = new Set(mevcut.map((s) => `${s.tip}|${s.aciklama}`));

  let yazilan = 0;
  for (const a of adaylar) {
    if (varOlan.has(`${a.tip}|${a.aciklama}`)) continue;
    await db.topolojiSapmasi.create({
      data: {
        tesisId: anlik.tesisId,
        anlikId,
        tip: a.tip,
        siddet: a.siddet,
        aciklama: a.aciklama,
        oncekiJson: a.onceki ? JSON.stringify(a.onceki) : null,
        sonrakiJson: a.sonraki ? JSON.stringify(a.sonraki) : null,
        durum: 'gozlendi',
      },
    });
    varOlan.add(`${a.tip}|${a.aciklama}`);
    yazilan++;
  }
  return yazilan;
}

export type KarsilastirmaSonucu = {
  /** temel_yok = temel onaylanmadan sapma HESAPLANMAZ */
  durum: 'temel_yok' | 'degisiklik_yok' | 'sapma_var';
  temelAnlikId: string | null;
  sapmalar: SapmaAdayi[];
  yazilan: number;
};

/**
 * Bir anlığı yürürlükteki temelle karşılaştırır ve sapmaları yazar.
 * TEMEL YOKSA HİÇBİR ŞEY HESAPLANMAZ — "temel yok" döner (kural 2).
 */
export async function anligiKarsilastir(
  anlikId: string,
  secenekler: { yaz?: boolean } = {},
): Promise<KarsilastirmaSonucu> {
  const yeni = await db.topolojiAnlik.findUniqueOrThrow({
    where: { id: anlikId }, include: { gozlemler: true },
  });
  const temel = await temelAnlik(yeni.tesisId);
  if (!temel) {
    return { durum: 'temel_yok', temelAnlikId: null, sapmalar: [], yazilan: 0 };
  }
  if (temel.id === yeni.id) {
    return { durum: 'degisiklik_yok', temelAnlikId: temel.id, sapmalar: [], yazilan: 0 };
  }
  if (temel.ozetHash === yeni.ozetHash) {
    // Özet aynı → gözlem kümesi birebir aynı. Ayrıntı karşılaştırmasına gerek yok.
    return { durum: 'degisiklik_yok', temelAnlikId: temel.id, sapmalar: [], yazilan: 0 };
  }

  const sapmalar = sapmalariHesapla(anligiCoz(temel), anligiCoz(yeni));
  const yazilan = secenekler.yaz === false ? 0 : await sapmalariYaz(anlikId, sapmalar);
  return {
    durum: sapmalar.length ? 'sapma_var' : 'degisiklik_yok',
    temelAnlikId: temel.id,
    sapmalar,
    yazilan,
  };
}

/* ═══ 5 · Karar akışı ═════════════════════════════════════════════════ */

export type KararSonucu = {
  sapmaId: string;
  durum: 'kabul' | 'ret';
  /** kabul sonrası anlık temel oldu mu */
  temelGuncellendi: boolean;
  dusenTemelId: string | null;
  /** aynı anlıkta hâlâ karara bağlanmamış sapma sayısı */
  bekleyen: number;
};

/** gozlendi → inceleme. Karar değildir, gerekçe istemez. */
export async function incelemeyeAl(sapmaId: string, aktorId: string): Promise<void> {
  if (!metin(aktorId)) throw new Error('incelemeyeAl: aktör zorunlu');
  const s = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapmaId } });
  if (s.durum !== 'gozlendi') {
    throw new Error(`Yalnız "gözlendi" durumundaki sapma incelemeye alınır (şu an: ${s.durum})`);
  }
  await db.topolojiSapmasi.update({ where: { id: sapmaId }, data: { durum: 'inceleme' } });
}

/**
 * Sapma kararı — akışın tek yazma noktası.
 *
 * BU FONKSİYON AĞA DOKUNMAZ: `AgGeciti`, `AgBolgesi`, `Varlik` ve
 * `VarlikIliskisi` tablolarına hiçbir yazma yapmaz. Sapma bir GÖZLEMDİR;
 * gerçeği değiştirmek insanın ayrı bir işidir (§Otomasyon önerir, karar vermez).
 *
 *  · kabul → sapma kapanır. Anlığın TÜM sapmaları kabul edilmişse anlık yeni
 *            temel olur ve eski temel düşer. Bir tanesi bile reddedilmiş ya
 *            da açık ise temel değişmez — temel, kararı verilmemiş farkı
 *            sessizce yutamaz.
 *  · ret   → temel korunur, sapma kapanır.
 *  · Her iki durumda GEREKÇE ZORUNLU.
 */
export async function sapmaKarari(girdi: {
  sapmaId: string;
  karar: 'kabul' | 'ret';
  kararVerenId: string;
  gerekce: string;
}): Promise<KararSonucu> {
  const gerekce = metin(girdi.gerekce);
  if (!gerekce) throw new Error('Sapma kararı için gerekçe zorunlu');
  if (gerekce.length < 10) throw new Error('Gerekçe en az 10 karakter olmalı');
  if (!metin(girdi.kararVerenId)) throw new Error('Sapma kararı için karar veren zorunlu');
  if (girdi.karar !== 'kabul' && girdi.karar !== 'ret') {
    throw new Error(`Geçersiz karar: ${girdi.karar}`);
  }

  const sapma = await db.topolojiSapmasi.findUniqueOrThrow({
    where: { id: girdi.sapmaId }, include: { anlik: true },
  });
  // Bu okuma yalnız HIZLI RET içindir; gerçek kapı aşağıdaki koşullu
  // updateMany'dir. Okuma ile yazma arasında başkası karar verebilir (P6).
  if (!ACIK_DURUMLAR.includes(sapma.durum as SapmaDurumu)) {
    throw new Error(`Bu sapma zaten karara bağlanmış (${sapma.durum})`);
  }

  return db.$transaction(async (tx) => {
    /* Sapmayı KOŞULLU sahiplen (P6 · docs/POSTGRES_READINESS.md §c).
       Eski kod yukarıdaki okumaya güvenip koşulsuz `update` yapıyordu; motor
       ile kullanıcı aynı sapmayı aynı anda karara bağladığında ikisi de
       "açık" görüyor, ikincisi birincinin kararını ve gerekçesini SESSİZCE
       eziyordu. `durum` hâlâ açık durumlardan biriyken yazıldığı için
       kaybeden artık hiçbir şey yazmaz ve açık hata alır. */
    const sahiplenme = await tx.topolojiSapmasi.updateMany({
      where: { id: sapma.id, durum: { in: [...ACIK_DURUMLAR] } },
      data: {
        durum: girdi.karar,
        kararVerenId: girdi.kararVerenId,
        kararZamani: new Date(),
        kararGerekcesi: gerekce,
      },
    });
    if (sahiplenme.count === 0) {
      throw new Error('Bu sapma bu sırada başkası tarafından karara bağlandı');
    }

    const kardesler = await tx.topolojiSapmasi.findMany({
      where: { anlikId: sapma.anlikId }, select: { id: true, durum: true },
    });
    const bekleyen = kardesler.filter(
      (k) => k.id !== sapma.id && ACIK_DURUMLAR.includes(k.durum as SapmaDurumu),
    ).length;
    const reddedilenVar = kardesler.some((k) => k.id !== sapma.id && k.durum === 'ret');

    if (girdi.karar === 'ret') {
      // Temel KORUNUR. Hiçbir tabloya başka yazma yok.
      return { sapmaId: sapma.id, durum: 'ret' as const, temelGuncellendi: false,
        dusenTemelId: null, bekleyen };
    }

    // Kabul: temel ancak anlığın tüm farkları kabul edildiyse taşınır.
    if (bekleyen > 0 || reddedilenVar || sapma.anlik.temelMi) {
      return { sapmaId: sapma.id, durum: 'kabul' as const, temelGuncellendi: false,
        dusenTemelId: null, bekleyen };
    }

    const eski = await tx.topolojiAnlik.findFirst({
      where: { tesisId: sapma.anlik.tesisId, temelMi: true },
      orderBy: { onayZamani: 'desc' },
    });
    // Temel taşıma da koşullu: eski temel hâlâ temelken düşer, yeni anlık
    // hâlâ temel DEĞİLKEN yükselir. Aynı anlığın iki sapması aynı anda kabul
    // edilirse ikinci geçiş burada etkisiz kalır — çift "temel oldu" notu ve
    // iki temelli santral oluşmaz.
    if (eski) await tx.topolojiAnlik.updateMany({
      where: { id: eski.id, temelMi: true }, data: { temelMi: false } });
    await tx.topolojiAnlik.updateMany({
      where: { id: sapma.anlikId, temelMi: false },
      data: {
        temelMi: true,
        onaylayanId: girdi.kararVerenId,
        onayZamani: new Date(),
        not: `Sapma kabulüyle temel oldu: ${gerekce}`,
      },
    });
    return { sapmaId: sapma.id, durum: 'kabul' as const, temelGuncellendi: true,
      dusenTemelId: eski?.id ?? null, bekleyen };
  });
}

/* ═══ 6 · Risk / bulgu ADAYI ══════════════════════════════════════════ */

/**
 * Kritik sapma bir risk/bulgu ADAYI üretir — kaydı AÇMAZ.
 * `gapAksiyon.ts` disiplini: motor yalnız öneri seviyesinde durur, kaydı
 * insan açar. `uretilenRiskId` / `uretilenBulguId` yalnız insan kaydı
 * açtığında dolar (bkz. riskKaydiAc / bulguKaydiAc).
 */
export type AdayOnerisi = {
  baslik: string;
  gerekce: string;
  onemDerecesi: Siddet;
  kaynak: 'topoloji_sapma';
  kaynakRef: string;
  tesisId: string | null;
};

export function sapmaAdayi(sapma: {
  id: string; tip: string; siddet: string; aciklama: string;
  tesisId: string | null; olusturuldu?: Date;
}): AdayOnerisi | null {
  // Yalnız KRİTİK sapma aday üretir. Her sapmayı aday yapmak, risk
  // kütüğünü otomatik gürültüyle doldurur ve insan kararını değersizleştirir.
  if (sapma.siddet !== 'kritik') return null;
  const etiket = SAPMA_TIP_ETIKETI[sapma.tip as SapmaTipi] ?? sapma.tip;
  return {
    baslik: `Topoloji sapması: ${etiket}`,
    gerekce: `${sapma.aciklama} — onaylı topoloji temeliyle uyuşmayan kritik fark. `
      + 'Sapma otomatik olarak hiçbir ağ/varlık kaydını değiştirmedi; '
      + 'kayıt açma kararı insana aittir.',
    onemDerecesi: 'kritik',
    kaynak: 'topoloji_sapma',
    kaynakRef: sapma.id,
    tesisId: sapma.tesisId,
  };
}

/** Kayda dönüşmemiş kritik adaylar — ekran "aday" kuyruğunu buradan okur. */
export async function bekleyenAdaylar(tesisIdleri?: string[] | null) {
  const sapmalar = await db.topolojiSapmasi.findMany({
    where: {
      siddet: 'kritik',
      durum: { in: ACIK_DURUMLAR },
      uretilenRiskId: null,
      uretilenBulguId: null,
      ...(tesisIdleri ? { tesisId: { in: tesisIdleri } } : {}),
    },
    orderBy: { olusturuldu: 'desc' },
  });
  return sapmalar
    .map((s) => ({ sapma: s, aday: sapmaAdayi(s) }))
    .filter((x): x is { sapma: (typeof sapmalar)[number]; aday: AdayOnerisi } => x.aday !== null);
}

/* Türetilmiş kayıt açmada yarış (P6 · docs/POSTGRES_READINESS.md §c).

   Eski kod "bu sapmadan zaten kayıt açılmış mı?" diye OKUYOR, sonra kaydı
   açıyordu. Motor tetiklemesi ile insan aynı anda çalıştığında ikisi de
   `uretilenRiskId: null` görüyor ve risk kütüğüne İKİ KOPYA kayıt düşüyordu;
   sapmanın bağı ise yalnız sonuncusunu gösterdiği için kopya kayıt sahipsiz
   kalıyordu.

   SEÇİLEN ÇÖZÜM — "kaydı transaction içinde aç, bağı KOŞULLU yaz, kaybeden
   transaction'ı geri al":
     · `uretilenRiskId` / `uretilenBulguId` yabancı anahtar değil düz metin
       alanıdır, ama önce yer tutucu bir değerle "sahiplenip" sonra kaydı
       açmak, iki adım arasında bir çökme olursa sapmayı KALICI olarak
       sahte bir kimliğe bağlar ve kayıt hiç açılmamış olur — kurtarılması
       elle müdahale isteyen yarım bir durum.
     · Kayıt önce açılıp bağ koşullu yazıldığında ise kaybeden dalda
       `count === 0` olur ve transaction geri alınır: açılan risk/bulgu da
       geri alınır. Telafi kodu (elle silme) yazmaya gerek kalmaz; yarım
       kayıt HİÇBİR dalda kalmaz.
   `db.$transaction` geri alması bu projede sınanmıştır (tests/yaris-kosullari). */
/**
 * İNSAN kaydı açtığında çağrılır — motor asla çağırmaz. Risk kütüğüne kayıt
 * yazar ve sapmayı o kayda bağlar. İkinci kez çağrılamaz.
 */
export async function riskKaydiAc(
  sapmaId: string,
  aktorId: string,
  girdi: { kod: string; baslik?: string; sahipId?: string | null; gerekce: string },
): Promise<{ riskId: string; kod: string }> {
  if (!metin(aktorId)) throw new Error('riskKaydiAc: aktör zorunlu — otomatik kayıt açma yasak');
  const kod = metin(girdi.kod);
  if (!kod) throw new Error('riskKaydiAc: risk kodu zorunlu');
  const gerekce = metin(girdi.gerekce);
  if (!gerekce) throw new Error('riskKaydiAc: gerekçe zorunlu');

  const sapma = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapmaId } });
  // Hızlı ret; gerçek kapı aşağıdaki koşullu updateMany'dir.
  if (sapma.uretilenRiskId) throw new Error('Bu sapma için zaten bir risk kaydı açılmış');
  const aday = sapmaAdayi(sapma);

  return db.$transaction(async (tx) => {
    const risk = await tx.risk.create({
      data: {
        kod,
        baslik: metin(girdi.baslik) ?? aday?.baslik ?? `Topoloji sapması: ${sapma.tip}`,
        aciklama: `${sapma.aciklama}\n\nGerekçe: ${gerekce}`,
        kaynak: 'topoloji_sapma',
        tesisId: sapma.tesisId,
        sahipId: girdi.sahipId ?? null,
        durum: 'acik',
        // Skor alanları BİLEREK boş: olasılık/etki ölçülmedi. Otomatik bir
        // sayı uydurmak "bilinmiyor"u "düşük"e çevirir (§Bilinmeyen ≠ sıfır).
      },
    });
    const sahiplenme = await tx.topolojiSapmasi.updateMany({
      where: { id: sapmaId, uretilenRiskId: null },
      data: { uretilenRiskId: risk.id },
    });
    // Kaybeden dal: bağ zaten dolu → hata at, transaction geri alınsın.
    // Yukarıda açılan risk kaydı da geri alınır; kopya risk oluşmaz.
    if (sahiplenme.count === 0) {
      throw new Error('Bu sapma için zaten bir risk kaydı açılmış');
    }
    return { riskId: risk.id, kod: risk.kod };
  });
}

/**
 * İNSAN kaydı açtığında çağrılır. Bulgu bir madde durumuna bağlıdır; hangi
 * maddeye bağlanacağını motor bilemez, bu yüzden `maddeDurumuId` zorunludur.
 */
export async function bulguKaydiAc(
  sapmaId: string,
  aktorId: string,
  girdi: { maddeDurumuId: string; baslik?: string; gerekce: string; sorumluId?: string | null },
): Promise<{ bulguId: string }> {
  if (!metin(aktorId)) throw new Error('bulguKaydiAc: aktör zorunlu — otomatik kayıt açma yasak');
  const maddeDurumuId = metin(girdi.maddeDurumuId);
  if (!maddeDurumuId) throw new Error('bulguKaydiAc: madde durumu zorunlu');
  const gerekce = metin(girdi.gerekce);
  if (!gerekce) throw new Error('bulguKaydiAc: gerekçe zorunlu');

  const sapma = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapmaId } });
  // Hızlı ret; gerçek kapı aşağıdaki koşullu updateMany'dir (riskKaydiAc ile aynı).
  if (sapma.uretilenBulguId) throw new Error('Bu sapma için zaten bir bulgu kaydı açılmış');
  const aday = sapmaAdayi(sapma);

  return db.$transaction(async (tx) => {
    const bulgu = await tx.bulgu.create({
      data: {
        maddeDurumuId,
        baslik: metin(girdi.baslik) ?? aday?.baslik ?? `Topoloji sapması: ${sapma.tip}`,
        aciklama: `${sapma.aciklama}\n\nGerekçe: ${gerekce}`,
        onemDerecesi: sapma.siddet === 'kritik' ? 'kritik' : sapma.siddet,
        durum: 'acik',
        kaynak: 'oz_degerlendirme',
        sorumluId: girdi.sorumluId ?? null,
      },
    });
    const sahiplenme = await tx.topolojiSapmasi.updateMany({
      where: { id: sapmaId, uretilenBulguId: null },
      data: { uretilenBulguId: bulgu.id },
    });
    if (sahiplenme.count === 0) {
      throw new Error('Bu sapma için zaten bir bulgu kaydı açılmış');
    }
    return { bulguId: bulgu.id };
  });
}

/* ═══ 7 · Kayıtlı topolojiden anlık ═══════════════════════════════════ */

/**
 * ONAYLI KAYITTAN (CMDB) topoloji öğeleri üretir.
 *
 * Bu bir connector DEĞİLDİR ve dış sisteme bağlanmaz — kaynağı açıkça iç
 * kayıttır (`kaynak: 'cmdb_kayit'`). İlk temeli kurmanın dürüst yolu budur:
 * insan, onaylı ağ kaydını anlık olarak dondurur ve onaylar; sonraki gözlemler
 * buna göre karşılaştırılır.
 *
 * `sonDogrulama` bilerek DIŞARIDA: geçidin yeniden doğrulanması topolojiyi
 * değiştirmez, özeti değiştirip sahte "fark" üretmemeli.
 */
export async function mevcutTopolojiOgeleri(tesisId: string | null): Promise<TopolojiOgesi[]> {
  const bolgeFiltre = tesisId ? { tesisId } : {};
  const bolgeler = await db.agBolgesi.findMany({ where: bolgeFiltre });
  const bolgeById = new Map(bolgeler.map((b) => [b.id, b]));
  const bolgeIdleri = bolgeler.map((b) => b.id);

  const varliklar = await db.varlik.findMany({
    where: { silindi: null, ...(tesisId ? { tesisId } : {}) },
    select: { id: true, etiket: true, ad: true, ipAdresi: true, bolgeId: true },
  });
  const varlikById = new Map(varliklar.map((v) => [v.id, v]));

  const gecitler = await db.agGeciti.findMany({
    where: bolgeIdleri.length
      ? { kaynakBolgeId: { in: bolgeIdleri }, hedefBolgeId: { in: bolgeIdleri } }
      : {},
  });

  const iliskiler = await db.varlikIliskisi.findMany({
    where: { tip: 'connects_to', kaynakId: { in: varliklar.map((v) => v.id) } },
  });

  const ogeler: TopolojiOgesi[] = [];

  for (const v of varliklar) {
    const b = v.bolgeId ? bolgeById.get(v.bolgeId) : null;
    ogeler.push({
      tip: 'dugum',
      anahtar: v.etiket,
      ozellikler: {
        ad: v.ad,
        ip: v.ipAdresi ?? null,           // null = BİLİNMİYOR
        bolgeKodu: b?.kod ?? null,
        bolgeTipi: b?.tip ?? null,
      },
    });
  }

  const gecitAnahtari = new Map<string, { protokoller: string[]; onaylandi: boolean }>();
  for (const g of gecitler) {
    const k = bolgeById.get(g.kaynakBolgeId);
    const h = bolgeById.get(g.hedefBolgeId);
    if (!k || !h) continue;
    const p = protokoller(g.protokoller);
    ogeler.push({
      tip: 'gecit',
      anahtar: `${k.kod}>${h.kod}`,
      ozellikler: {
        kaynakBolge: k.kod, hedefBolge: h.kod,
        kaynakTipi: k.tip, hedefTipi: h.tip,
        protokoller: p,
        onaylandi: g.onaylandi,
        kontrolVarligi: g.kontrolVarligi ?? null,
      },
    });
    gecitAnahtari.set(`${k.kod}|${h.kod}`, { protokoller: p, onaylandi: g.onaylandi });
    gecitAnahtari.set(`${h.kod}|${k.kod}`, { protokoller: p, onaylandi: g.onaylandi });
  }

  for (const i of iliskiler) {
    const kv = varlikById.get(i.kaynakId);
    const hv = varlikById.get(i.hedefId);
    if (!kv || !hv) continue;
    const kb = kv.bolgeId ? bolgeById.get(kv.bolgeId) : null;
    const hb = hv.bolgeId ? bolgeById.get(hv.bolgeId) : null;
    const gecit = kb && hb ? gecitAnahtari.get(`${kb.kod}|${hb.kod}`) : undefined;
    ogeler.push({
      tip: 'baglanti',
      anahtar: `${kv.etiket}>${hv.etiket}`,
      ozellikler: {
        kaynak: kv.etiket, hedef: hv.etiket,
        kaynakBolge: kb?.kod ?? null, hedefBolge: hb?.kod ?? null,
        kaynakTipi: kb?.tip ?? null, hedefTipi: hb?.tip ?? null,
        izinliProtokoller: gecit?.protokoller ?? null, // null = BİLİNMİYOR
      },
    });
  }

  return ogeler;
}

/* ═══ 8 · Ekran sorguları ═════════════════════════════════════════════

   BURASI /topoloji EKRANININ TEK OKUMA KAYNAĞIDIR.

   Denetim bulgusu #22: bu dört yardımcı yazılmıştı ama hiçbir yerden
   çağrılmıyordu; `/topoloji` aynı işi kendi ham `db` sorgularıyla ikinci
   kez yapıyordu. İki tanım bugün aynı sonucu veriyordu, ama biri
   değişince öteki sessizce ayrışırdı — kapsam koşulu, tavan ya da
   `include` kümesi bir yerde düzelip diğerinde kalırdı.

   Karar: EKRAN YARDIMCILARA TAŞINDI, yardımcılar silinmedi. Gerekçe,
   sorgunun kendisinin bir kural taşıması: kapsam daraltması
   (`tesisIdleri`), şiddet sıralaması ve sayımların TAVANDAN BAĞIMSIZ
   olması bu ekranın doğruluk sözleşmesinin parçası. Sayfa bileşeninde
   yaşayan bir `findMany`, o sözleşmeyi test edilemez bir yere koyar;
   burada duran fonksiyon testten doğrudan çağrılabilir.

   Aynı geçişte iki ölü sarmalayıcı SİLİNDİ (#27):
   · `anlikOgeleri(anlikId)` — `anligiCoz` üstüne tek satırlık sarmal,
     hiçbir çağıranı yoktu; anlığın öğeleri hiçbir ekranda listelenmiyor
     ve listelenecekse kendi sayfalama yüzeyini isterdi.
   · `sapmaDetay(sapmaId)` — çekmecenin gösterdiği her alan zaten
     `sapmalariListele` yanıtında var; ikinci bir tekil sorgu, aynı
     çekmece için İKİNCİ bir tanım demekti (bulgunun kendisi). */

/** Kapsamdaki anlık görüntüler, yeniden eskiye. `tesisIdleri === null`
    = kapsam sınırı yok; `[]` hiçbir tesis demektir ve boş liste döner. */
export async function anliklariListele(
  tesisIdleri: string[] | null,
  limit = 20,
) {
  return db.topolojiAnlik.findMany({
    where: tesisIdleri ? { tesisId: { in: tesisIdleri } } : {},
    orderBy: { alindi: 'desc' },
    take: limit,
    include: {
      onaylayan: { select: { id: true, adSoyad: true } },
      tesis: { select: { id: true, kod: true } },
      _count: { select: { gozlemler: true, sapmalar: true } },
    },
  });
}

/** Kapsamdaki sapmalar. Tavan aşılabilir — bu yüzden EKRAN METRİKLERİ
    bu listeden değil `topolojiOzeti`den okunur (aşağıdaki gerekçe). */
export async function sapmalariListele(filtre: {
  tesisIdleri?: string[] | null;
  durumlar?: SapmaDurumu[];
  siddetler?: Siddet[];
  limit?: number;
} = {}) {
  const sapmalar = await db.topolojiSapmasi.findMany({
    where: {
      ...(filtre.tesisIdleri ? { tesisId: { in: filtre.tesisIdleri } } : {}),
      ...(filtre.durumlar?.length ? { durum: { in: filtre.durumlar } } : {}),
      ...(filtre.siddetler?.length ? { siddet: { in: filtre.siddetler } } : {}),
    },
    orderBy: { olusturuldu: 'desc' },
    take: filtre.limit ?? 200,
    include: {
      anlik: { select: { id: true, kaynak: true, alindi: true, ozetHash: true } },
      kararVeren: { select: { id: true, adSoyad: true } },
    },
  });
  // Şiddet sırası veritabanının alfabesine bırakılmaz: kritik > yuksek > orta > dusuk.
  return sapmalar.sort(
    (a, b) => SIDDET_SIRASI[a.siddet as Siddet] - SIDDET_SIRASI[b.siddet as Siddet]
      || b.olusturuldu.getTime() - a.olusturuldu.getTime(),
  );
}

/** Motorun koşu kaydında kullandığı kaynak adı — iz sorgusu bunu okur. */
const MOTOR_KAYNAGI = 'topoloji_sapma';

/**
 * Karşılaştırma izi: "en son NE ZAMAN karşılaştırıldı?" sorusunun cevabı.
 *
 * NEDEN GEREKLİ: sapma listesinin boş olması iki ayrı şey olabilir —
 * (a) karşılaştırıldı, fark çıkmadı; (b) hiç karşılaştırılmadı. İkisini
 * aynı boş ekranla göstermek, ölçülmemiş olanı "temiz" diye okutur.
 * Ekran bu ayrımı gösterebilsin diye kanıt buradan toplanır.
 *
 * İki kanıt kaynağı vardır ve ikisi de gerçek olaylardır, tahmin değil:
 *   · elle karşılaştırma → `AktiviteKaydi` (eylem: 'karsilastirma'),
 *     `lib/eylemler2/topoloji.ts → anligiKarsilastirEylem` yazar;
 *   · motor koşusu      → `EntegrasyonKosusu` (kaynak: topoloji_sapma),
 *     yalnız GERÇEKTEN anlık işlediyse (kabulEdilen > 0) sayılır.
 * Kaynağı olmayan bir zaman damgası uydurulmaz; ikisi de yoksa null döner.
 */
export async function karsilastirmaIzi(anlikIdleri: string[]): Promise<{
  sonKarsilastirma: Date | null;
  tetikleyen: 'motor' | 'elle' | null;
  anligaGore: Map<string, Date>;
  motorImleci: string | null;
  motorDurumu: string | null;
  motorZamani: Date | null;
}> {
  const [izler, isleyenKosu, sonKosu] = await Promise.all([
    anlikIdleri.length
      ? db.aktiviteKaydi.findMany({
        where: { varlikTipi: 'TopolojiAnlik', eylem: 'karsilastirma',
          varlikId: { in: anlikIdleri } },
        orderBy: { zaman: 'desc' },
        select: { varlikId: true, zaman: true },
      })
      : Promise.resolve([] as { varlikId: string; zaman: Date }[]),
    db.entegrasyonKosusu.findFirst({
      where: { kaynak: MOTOR_KAYNAGI, kabulEdilen: { gt: 0 } },
      orderBy: { baslangic: 'desc' },
      select: { bitis: true, baslangic: true, imlecSonra: true },
    }),
    db.entegrasyonKosusu.findFirst({
      where: { kaynak: MOTOR_KAYNAGI },
      orderBy: { baslangic: 'desc' },
      select: { durum: true, bitis: true, baslangic: true },
    }),
  ]);

  // `findMany` zaman'a göre azalan geldiği için ilk yazılan kalır → en yenisi.
  const anligaGore = new Map<string, Date>();
  for (const i of izler) if (!anligaGore.has(i.varlikId)) anligaGore.set(i.varlikId, i.zaman);

  const elle = izler[0]?.zaman ?? null;
  const motor = isleyenKosu ? isleyenKosu.bitis ?? isleyenKosu.baslangic : null;
  const sonKarsilastirma = elle && motor ? (elle > motor ? elle : motor) : elle ?? motor;

  return {
    sonKarsilastirma,
    tetikleyen: sonKarsilastirma === null ? null : sonKarsilastirma === elle ? 'elle' : 'motor',
    anligaGore,
    motorImleci: isleyenKosu?.imlecSonra ?? null,
    motorDurumu: sonKosu?.durum ?? null,
    motorZamani: sonKosu?.bitis ?? sonKosu?.baslangic ?? null,
  };
}

/**
 * Ekran metrikleri — en fazla dört sayı (yoğunluk sözleşmesi).
 *
 * NEDEN AYRI BİR SORGU: `/topoloji` sapmaları tavanla (200) çeker. Metriği
 * o kesilmiş listeden saymak, iki yüz birinci açık sapmayı METRİKTEN de
 * düşürürdü — kullanıcı "12 kritik" yazan bir başlıkla gerçekte 30 kritik
 * sapma olan bir kapsama bakardı. Sayım burada `count` ile, TAVANDAN
 * BAĞIMSIZ yapılır; liste kesilir, sayı kesilmez.
 */
export async function topolojiOzeti(tesisIdleri: string[] | null): Promise<{
  temelVar: boolean;
  sonAnlik: Date | null;
  acikSapma: number;
  kritikAcik: number;
}> {
  const kapsam = tesisIdleri ? { tesisId: { in: tesisIdleri } } : {};
  const [temelSayisi, sonAnlik, acikSapma, kritikAcik] = await Promise.all([
    db.topolojiAnlik.count({ where: { ...kapsam, temelMi: true, onaylayanId: { not: null } } }),
    db.topolojiAnlik.findFirst({ where: kapsam, orderBy: { alindi: 'desc' }, select: { alindi: true } }),
    db.topolojiSapmasi.count({ where: { ...kapsam, durum: { in: ACIK_DURUMLAR } } }),
    db.topolojiSapmasi.count({
      where: { ...kapsam, durum: { in: ACIK_DURUMLAR }, siddet: 'kritik' } }),
  ]);
  return { temelVar: temelSayisi > 0, sonAnlik: sonAnlik?.alindi ?? null, acikSapma, kritikAcik };
}
