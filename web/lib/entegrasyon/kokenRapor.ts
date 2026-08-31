import 'server-only';
import { db } from '../db';
import type { DogrulamaDurumu, KokenTipi } from './koken';

/* Veri kökeni raporlaması — "bu kaydı nereden biliyoruz?" sorusunun
   sorgulanabilir hâli.

   Üç kural bu dosyanın tamamına hâkim:

   1. **Kökeni olmayan kayıt manueldir.** Bu yüzden MANUEL sayısı köken
      tablosundan okunamaz; kayıt evreninden kökenli kayıtlar düşülerek
      bulunur. Evreni bilinmeyen bir varlık tipi için manuel sayısı
      `null`'dır — sıfır DEĞİL (§ bilinmeyen ≠ sıfır).
   2. **Kapsam sessizce genişletilmez.** `tesisIdler` verildiğinde her köken
      satırı gerçek bir tesise bağlanır; bağlanamayan satır rapordan düşer
      ama sayılır ve `tesisiBilinmeyen` olarak geri bildirilir. Filtrenin
      yuttuğu kayıt görünmez olmaz.
   3. **`guven: null` ölçülmedi demektir.** Ortalama güven hesabına yalnız
      ölçülmüş değerler girer; ölçülmemişler ayrı sayılır, 0 sayılmaz.

   `tesisIdler` sözleşmesi `lib/erisim.ts` → `izinliTesisIdleri` ile aynıdır:
   `null`/tanımsız = tüm tesisler, `[]` = hiçbiri. */

export type KokenKapsami = {
  /** null / tanımsız = tüm tesisler; [] = hiçbir tesis. */
  tesisIdler?: string[] | null;
};

/** Her raporun kapsam dürüstlüğü notu — filtrenin ne yuttuğunu söyler. */
export type KapsamNotu = {
  /** Tesise bağlanma yolu tanımlı OLMAYAN varlık tipleri. Tesis filtresi
      etkinken bu tiplerin satırları rapora giremez; "kayıt yok" demek değil. */
  kapsanamayanTipler: string[];
  /** Tipi kapsanabilir olduğu hâlde tesisi belirlenemeyen köken satırı sayısı
      (tesisi boş kayıt ya da kaydı silinmiş öksüz köken). */
  tesisiBilinmeyen: number;
};

type HamKoken = {
  id: string;
  varlikTipi: string;
  varlikId: string;
  kokenTipi: string;
  kaynakSistem: string;
  kaynakKayitId: string;
  connectorId: string | null;
  guven: number | null;
  dogrulamaDurumu: string;
  dogrulayanId: string | null;
  dogrulamaZamani: Date | null;
  toplanma: Date | null;
  aktarim: Date;
};

const SECIM = {
  id: true, varlikTipi: true, varlikId: true, kokenTipi: true, kaynakSistem: true,
  kaynakKayitId: true, connectorId: true, guven: true, dogrulamaDurumu: true,
  dogrulayanId: true, dogrulamaZamani: true, toplanma: true, aktarim: true,
} as const;

/* ═══ Tesis çözücü kayıt defteri ══════════════════════════════════════
   Köken satırı tesise doğrudan bağlı değildir (varlikTipi + varlikId taşır),
   bu yüzden santral kapsamı tip başına çözülür. Buraya yalnız tesise GERÇEK
   bir yolu olan tipler yazılır: uydurma bir yol, kapsam sızıntısı demektir.
   Listede olmayan tip, tesis filtresi etkinken rapordan düşer ve
   `kapsanamayanTipler` içinde görünür. */

type TipCozucu = {
  /** Kapsamdaki kayıt evreni: manuel sayısı bunun üstünden çıkar.
      `tesisiBilinmeyen`, tesisi boş olduğu için hiçbir kapsama giremeyen
      kayıtların sayısıdır. */
  evren: (tesisIdler: string[] | null) => Promise<{ kapsamda: number; tesisiBilinmeyen: number }>;
  /** Verilen kayıt kimliklerinin tesisleri. Haritada bulunmayan kimlik =
      kaydı silinmiş öksüz köken. */
  tesisleri: (idler: string[]) => Promise<Map<string, string | null>>;
};

const TIP_COZUCU: Record<string, TipCozucu> = {
  Varlik: {
    evren: async (t) => ({
      kapsamda: await db.varlik.count({
        where: { silindi: null, ...(t ? { tesisId: { in: t } } : {}) } }),
      tesisiBilinmeyen: t ? await db.varlik.count({ where: { silindi: null, tesisId: null } }) : 0,
    }),
    tesisleri: async (idler) => new Map((await db.varlik.findMany({
      where: { id: { in: idler } }, select: { id: true, tesisId: true },
    })).map((r) => [r.id, r.tesisId])),
  },
  VarlikZafiyeti: {
    evren: async (t) => ({
      kapsamda: await db.varlikZafiyeti.count({
        where: { varlik: { silindi: null, ...(t ? { tesisId: { in: t } } : {}) } } }),
      tesisiBilinmeyen: t
        ? await db.varlikZafiyeti.count({ where: { varlik: { silindi: null, tesisId: null } } }) : 0,
    }),
    tesisleri: async (idler) => new Map((await db.varlikZafiyeti.findMany({
      where: { id: { in: idler } }, select: { id: true, varlik: { select: { tesisId: true } } },
    })).map((r) => [r.id, r.varlik.tesisId])),
  },
  KonfigurasyonYedegi: {
    evren: async (t) => ({
      kapsamda: await db.konfigurasyonYedegi.count({
        where: { varlik: { silindi: null, ...(t ? { tesisId: { in: t } } : {}) } } }),
      tesisiBilinmeyen: t
        ? await db.konfigurasyonYedegi.count({ where: { varlik: { silindi: null, tesisId: null } } }) : 0,
    }),
    tesisleri: async (idler) => new Map((await db.konfigurasyonYedegi.findMany({
      where: { id: { in: idler } }, select: { id: true, varlik: { select: { tesisId: true } } },
    })).map((r) => [r.id, r.varlik.tesisId])),
  },
  ErisimAtamasi: {
    evren: async (t) => ({
      kapsamda: await db.erisimAtamasi.count({
        where: t ? { varlik: { tesisId: { in: t } } } : {} }),
      // varlığı olmayan atama hiçbir santrale bağlanamaz — kapsama giremez.
      tesisiBilinmeyen: t ? await db.erisimAtamasi.count({
        where: { OR: [{ varlikId: null }, { varlik: { tesisId: null } }] } }) : 0,
    }),
    tesisleri: async (idler) => new Map((await db.erisimAtamasi.findMany({
      where: { id: { in: idler } }, select: { id: true, varlik: { select: { tesisId: true } } },
    })).map((r) => [r.id, r.varlik?.tesisId ?? null])),
  },
  TedarikciErisimOturumu: {
    evren: async (t) => ({
      kapsamda: await db.tedarikciErisimOturumu.count({
        where: t ? { OR: [{ tesisId: { in: t } }, { varlik: { tesisId: { in: t } } }] } : {} }),
      tesisiBilinmeyen: t ? await db.tedarikciErisimOturumu.count({
        where: { tesisId: null, OR: [{ varlikId: null }, { varlik: { tesisId: null } }] } }) : 0,
    }),
    tesisleri: async (idler) => new Map((await db.tedarikciErisimOturumu.findMany({
      where: { id: { in: idler } },
      select: { id: true, tesisId: true, varlik: { select: { tesisId: true } } },
    })).map((r) => [r.id, r.tesisId ?? r.varlik?.tesisId ?? null])),
  },
  TopolojiAnlik: {
    evren: async (t) => ({
      kapsamda: await db.topolojiAnlik.count({ where: t ? { tesisId: { in: t } } : {} }),
      tesisiBilinmeyen: t ? await db.topolojiAnlik.count({ where: { tesisId: null } }) : 0,
    }),
    tesisleri: async (idler) => new Map((await db.topolojiAnlik.findMany({
      where: { id: { in: idler } }, select: { id: true, tesisId: true },
    })).map((r) => [r.id, r.tesisId])),
  },
  KesifKaydi: {
    evren: async (t) => ({
      kapsamda: await db.kesifKaydi.count({
        where: t ? { eslesenVarlik: { tesisId: { in: t } } } : {} }),
      // henüz varlığa eşlenmemiş keşif kaydının santrali BİLİNMİYOR.
      tesisiBilinmeyen: t ? await db.kesifKaydi.count({
        where: { OR: [{ eslesenVarlikId: null }, { eslesenVarlik: { tesisId: null } }] } }) : 0,
    }),
    tesisleri: async (idler) => new Map((await db.kesifKaydi.findMany({
      where: { id: { in: idler } },
      select: { id: true, eslesenVarlik: { select: { tesisId: true } } },
    })).map((r) => [r.id, r.eslesenVarlik?.tesisId ?? null])),
  },
};

/** Bir varlık tipi santral kapsamına daraltılabiliyor mu? */
export function kapsanabilirTip(varlikTipi: string): boolean {
  return varlikTipi in TIP_COZUCU;
}

/* ═══ Çekirdek: kapsam saygılı köken çekimi ═══════════════════════════ */

async function kokenleriTopla(
  nerede: { varlikTipi?: string; dogrulamaDurumu?: string; aktarim?: { lt: Date } },
  kapsam: KokenKapsami,
): Promise<{ satirlar: HamKoken[]; not: KapsamNotu }> {
  const t = kapsam.tesisIdler;
  // [] = "hiçbir tesise yetkim yok". Boş liste burada gerçekten boş demektir.
  if (Array.isArray(t) && t.length === 0)
    return { satirlar: [], not: { kapsanamayanTipler: [], tesisiBilinmeyen: 0 } };

  const satirlar = await db.veriKokeni.findMany({
    where: nerede, select: SECIM, orderBy: { aktarim: 'desc' },
  });
  if (t == null) return { satirlar, not: { kapsanamayanTipler: [], tesisiBilinmeyen: 0 } };

  const tipeGore = new Map<string, string[]>();
  for (const s of satirlar) {
    const liste = tipeGore.get(s.varlikTipi);
    if (liste) liste.push(s.varlikId);
    else tipeGore.set(s.varlikTipi, [s.varlikId]);
  }

  const kapsanamayanTipler: string[] = [];
  const tesisHaritasi = new Map<string, Map<string, string | null>>();
  for (const [tip, idler] of tipeGore) {
    const cozucu = TIP_COZUCU[tip];
    if (!cozucu) { kapsanamayanTipler.push(tip); continue; }
    tesisHaritasi.set(tip, await cozucu.tesisleri([...new Set(idler)]));
  }

  const izinli = new Set(t);
  let tesisiBilinmeyen = 0;
  const kapsamdakiler = satirlar.filter((s) => {
    const harita = tesisHaritasi.get(s.varlikTipi);
    if (!harita) return false; // tipi kapsanamıyor — ayrıca raporlanıyor
    if (!harita.has(s.varlikId)) { tesisiBilinmeyen += 1; return false; } // öksüz köken
    const tesisId = harita.get(s.varlikId) ?? null;
    if (tesisId == null) { tesisiBilinmeyen += 1; return false; }
    return izinli.has(tesisId);
  });

  return {
    satirlar: kapsamdakiler,
    not: { kapsanamayanTipler: kapsanamayanTipler.sort(), tesisiBilinmeyen },
  };
}

/* ═══ 1 · Varlık tipine göre MANUEL / OTOMATİK / DOĞRULANMIŞ ══════════ */

export type KokenSayimi = {
  varlikTipi: string;
  /** Kökeni olmayan kayıt sayısı. null = kayıt evreni bilinmiyor (tipin
      tesis/evren çözücüsü yok) — SIFIR DEĞİL. */
  manuel: number | null;
  /** Kökeni var, henüz insan doğrulaması yok. */
  otomatik: number;
  /** İnsan doğrulamış. */
  dogrulanmis: number;
  /** İnsan bakmış ve reddetmiş — otomatik sayılmaz, sessizce gizlenmez. */
  reddedildi: number;
  /** Köken satırı olan ayrık kayıt sayısı. */
  kokenli: number;
  /** Kayıt evreni; null = bilinmiyor. */
  toplam: number | null;
};

/**
 * Varlık tipine göre köken dağılımı. MANUEL, köken tablosundan değil kayıt
 * evreninden türetilir: kökeni olmayan kayıt manueldir.
 */
export async function kokenSayimlari(
  kapsam: KokenKapsami = {},
): Promise<{ satirlar: KokenSayimi[]; not: KapsamNotu }> {
  const { satirlar, not } = await kokenleriTopla({}, kapsam);

  type Kova = { kayitlar: Map<string, { dogrulandi: boolean; reddedildi: boolean }> };
  const kovalar = new Map<string, Kova>();
  for (const s of satirlar) {
    let kova = kovalar.get(s.varlikTipi);
    if (!kova) { kova = { kayitlar: new Map() }; kovalar.set(s.varlikTipi, kova); }
    // Bir kayda birden çok kaynak köken yazabilir: kayıt bazında toplarız,
    // yoksa iki kaynaklı bir varlık iki kere sayılırdı.
    const mevcut = kova.kayitlar.get(s.varlikId) ?? { dogrulandi: false, reddedildi: false };
    if (s.dogrulamaDurumu === 'dogrulandi') mevcut.dogrulandi = true;
    if (s.dogrulamaDurumu === 'reddedildi') mevcut.reddedildi = true;
    kova.kayitlar.set(s.varlikId, mevcut);
  }

  // Kapsanabilen her tip, hiç köken satırı olmasa bile raporda görünür:
  // "hiç otomatik veri gelmemiş" de raporlanması gereken bir gerçektir.
  const tipler = new Set([...kovalar.keys(), ...Object.keys(TIP_COZUCU)]);
  const sonuc: KokenSayimi[] = [];
  for (const tip of [...tipler].sort()) {
    const kayitlar = kovalar.get(tip)?.kayitlar ?? new Map();
    let dogrulanmis = 0, reddedildi = 0, otomatik = 0;
    for (const k of kayitlar.values()) {
      if (k.dogrulandi) dogrulanmis += 1;
      else if (k.reddedildi) reddedildi += 1;
      else otomatik += 1;
    }
    const cozucu = TIP_COZUCU[tip];
    const evren = cozucu ? await cozucu.evren(kapsam.tesisIdler ?? null) : null;
    const kokenli = kayitlar.size;
    sonuc.push({
      varlikTipi: tip,
      // Evren kökenli kayıttan küçük çıkarsa (kaydı silinmiş öksüz köken)
      // negatif manuel yazmayız — sıfırda keseriz.
      manuel: evren ? Math.max(0, evren.kapsamda - kokenli) : null,
      otomatik, dogrulanmis, reddedildi, kokenli,
      toplam: evren ? evren.kapsamda : null,
    });
  }
  return { satirlar: sonuc, not };
}

/* ═══ 2 · Doğrulama bekleyenler ═══════════════════════════════════════ */

export type DogrulanmamisKayit = {
  kokenId: string;
  varlikTipi: string;
  varlikId: string;
  kaynakSistem: string;
  kaynakKayitId: string;
  connectorId: string | null;
  /** null = ÖLÇÜLMEDİ (sıfır güven değil). */
  guven: number | null;
  toplanma: Date | null;
  aktarim: Date;
  bekleyenGun: number;
};

/**
 * İnsan doğrulaması bekleyen otomatik kayıtlar — en uzun bekleyen başta.
 * Doğrulama insanın işi olduğu için bu kuyruk hiçbir koşulda motor
 * tarafından boşaltılmaz; yalnızca gösterilir.
 */
export async function dogrulanmamisKayitlar(
  varlikTipi: string,
  limit = 50,
  kapsam: KokenKapsami = {},
): Promise<{ satirlar: DogrulanmamisKayit[]; not: KapsamNotu; toplam: number }> {
  if (!varlikTipi) throw new Error('dogrulanmamisKayitlar: varlikTipi zorunlu');
  if (limit <= 0) throw new Error(`dogrulanmamisKayitlar: limit pozitif olmalı (${limit})`);

  // Kapsam süzgeci LIMIT'ten SONRA çalışsaydı eksik liste dönerdi; bu yüzden
  // tipin tüm köken satırları çekilip süzülür, kırpma en sonda yapılır.
  const { satirlar, not } = await kokenleriTopla(
    { varlikTipi, dogrulamaDurumu: 'dogrulanmadi' }, kapsam);
  const simdi = Date.now();
  const sirali = [...satirlar].sort((a, b) => a.aktarim.getTime() - b.aktarim.getTime());
  return {
    toplam: sirali.length,
    not,
    satirlar: sirali.slice(0, limit).map((s) => ({
      kokenId: s.id, varlikTipi: s.varlikTipi, varlikId: s.varlikId,
      kaynakSistem: s.kaynakSistem, kaynakKayitId: s.kaynakKayitId,
      connectorId: s.connectorId, guven: s.guven,
      toplanma: s.toplanma, aktarim: s.aktarim,
      bekleyenGun: Math.floor((simdi - s.aktarim.getTime()) / 86_400_000),
    })),
  };
}

/* ═══ 3 · Kaynak sistem dağılımı ══════════════════════════════════════ */

export type KaynakSistemSatiri = {
  kaynakSistem: string;
  /** Bu kaynağın beslediği ayrık kayıt sayısı. */
  kayit: number;
  dogrulanmis: number;
  dogrulanmadi: number;
  reddedildi: number;
  /** Güveni ÖLÇÜLMÜŞ satır sayısı. */
  guveniOlculen: number;
  /** Güveni ölçülmemiş satır sayısı — ortalamaya girmez. */
  guveniOlculmemis: number;
  /** Ölçülmüş güvenlerin ortalaması; null = hiç ölçüm yok (0 değil). */
  ortalamaGuven: number | null;
  sonAktarim: Date;
};

/** Hangi kaynak sistem kaç kaydı besliyor — kaynak bağımlılığının haritası. */
export async function kaynakSistemDagilimi(
  kapsam: KokenKapsami = {},
): Promise<{ satirlar: KaynakSistemSatiri[]; not: KapsamNotu }> {
  const { satirlar, not } = await kokenleriTopla({}, kapsam);

  const kovalar = new Map<string, {
    kayitlar: Set<string>; dogrulanmis: number; dogrulanmadi: number; reddedildi: number;
    guvenToplami: number; guveniOlculen: number; guveniOlculmemis: number; sonAktarim: Date;
  }>();
  for (const s of satirlar) {
    let kova = kovalar.get(s.kaynakSistem);
    if (!kova) {
      kova = { kayitlar: new Set(), dogrulanmis: 0, dogrulanmadi: 0, reddedildi: 0,
        guvenToplami: 0, guveniOlculen: 0, guveniOlculmemis: 0, sonAktarim: s.aktarim };
      kovalar.set(s.kaynakSistem, kova);
    }
    kova.kayitlar.add(`${s.varlikTipi}|${s.varlikId}`);
    if (s.dogrulamaDurumu === 'dogrulandi') kova.dogrulanmis += 1;
    else if (s.dogrulamaDurumu === 'reddedildi') kova.reddedildi += 1;
    else kova.dogrulanmadi += 1;
    // guven === 0 gerçek bir ölçümdür; null ise ölçülmemiştir. İkisi ayrı sayılır.
    if (s.guven == null) kova.guveniOlculmemis += 1;
    else { kova.guveniOlculen += 1; kova.guvenToplami += s.guven; }
    if (s.aktarim > kova.sonAktarim) kova.sonAktarim = s.aktarim;
  }

  return {
    not,
    satirlar: [...kovalar.entries()]
      .map(([kaynakSistem, k]) => ({
        kaynakSistem,
        kayit: k.kayitlar.size,
        dogrulanmis: k.dogrulanmis,
        dogrulanmadi: k.dogrulanmadi,
        reddedildi: k.reddedildi,
        guveniOlculen: k.guveniOlculen,
        guveniOlculmemis: k.guveniOlculmemis,
        ortalamaGuven: k.guveniOlculen === 0 ? null : k.guvenToplami / k.guveniOlculen,
        sonAktarim: k.sonAktarim,
      }))
      .sort((a, b) => b.kayit - a.kayit || a.kaynakSistem.localeCompare(b.kaynakSistem, 'tr')),
  };
}

/* ═══ 4 · Bayat kökenler ══════════════════════════════════════════════ */

export type BayatKoken = {
  kokenId: string;
  varlikTipi: string;
  varlikId: string;
  kaynakSistem: string;
  connectorId: string | null;
  kokenTipi: KokenTipi;
  dogrulamaDurumu: DogrulamaDurumu;
  guven: number | null;
  sonAktarim: Date;
  gecenGun: number;
};

/**
 * Uzun süredir tazelenmemiş otomatik kayıtlar. Bayat köken "yanlış veri"
 * demek değildir; kaynağın artık bu kaydı doğrulamadığı, dolayısıyla
 * güncelliğinin BİLİNMEDİĞİ anlamına gelir.
 */
export async function bayatKokenler(
  gunEsigi: number,
  kapsam: KokenKapsami = {},
): Promise<{ satirlar: BayatKoken[]; not: KapsamNotu; esikGun: number }> {
  if (!Number.isFinite(gunEsigi) || gunEsigi <= 0)
    throw new Error(`bayatKokenler: gün eşiği pozitif olmalı (${gunEsigi})`);

  const esik = new Date(Date.now() - gunEsigi * 86_400_000);
  const { satirlar, not } = await kokenleriTopla({ aktarim: { lt: esik } }, kapsam);
  const simdi = Date.now();
  return {
    esikGun: gunEsigi,
    not,
    satirlar: satirlar
      .map((s) => ({
        kokenId: s.id, varlikTipi: s.varlikTipi, varlikId: s.varlikId,
        kaynakSistem: s.kaynakSistem, connectorId: s.connectorId,
        kokenTipi: s.kokenTipi as KokenTipi,
        dogrulamaDurumu: s.dogrulamaDurumu as DogrulamaDurumu,
        guven: s.guven, sonAktarim: s.aktarim,
        gecenGun: Math.floor((simdi - s.aktarim.getTime()) / 86_400_000),
      }))
      .sort((a, b) => b.gecenGun - a.gecenGun),
  };
}

/* ═══ Kapsam yardımcısı — eylem katmanı da kullanır ═══════════════════ */

/**
 * Bir köken satırının bağlı olduğu tesis. `bilinen: false` "tesis yok"
 * demek DEĞİL, "bu tipin tesise bağlanma yolu tanımlı değil" demektir —
 * çağıran ikisini karıştırmamalıdır.
 */
export async function kokenTesisi(
  varlikTipi: string,
  varlikId: string,
): Promise<{ bilinen: boolean; tesisId: string | null }> {
  const cozucu = TIP_COZUCU[varlikTipi];
  if (!cozucu) return { bilinen: false, tesisId: null };
  const harita = await cozucu.tesisleri([varlikId]);
  if (!harita.has(varlikId)) return { bilinen: false, tesisId: null };
  return { bilinen: true, tesisId: harita.get(varlikId) ?? null };
}
