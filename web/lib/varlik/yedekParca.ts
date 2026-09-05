/* ═══════════════════════════════════════════════════════════════════════
   OT-56 · Kritik yedek parça — SAF KARAR

   EOL/EOS takibi "bu cihaz ne zaman desteksiz kalacak" sorusunu
   yanıtlar. Yedek parça başka bir soruyu yanıtlar: "bu kart BUGÜN
   bozulursa elimizde var mı, yoksa ne kadar bekleriz?"

   OT'de çoğu zaman ikincisi daha acildir. Tedarik süresi aylarla
   ölçülen bir PLC kartı, üretimi durduran bir arızada EOL tarihinden
   çok daha belirleyicidir.

   ── TEDARİK SÜRESİ SIFIR YAZILMAZ ─────────────────────────────────────
   Ölçülmemiş tedarik süresi `null`dur. Sıfır yazmak "hemen gelir"
   demektir ve bu bir yalandır: kimse ölçmemiştir.

   ── STOK SIFIR HER ZAMAN ARIZA DEĞİLDİR ───────────────────────────────
   Hiçbir kritik varlığa hizmet etmeyen bir parçanın stoğunun sıfır
   olması bir operasyon kararıdır. Kritiklik parçanın kendisinden değil,
   BAĞLI OLDUĞU VARLIKTAN gelir.

   Bu dosya veritabanı ve React bilmez. */

export const KRITIKLIK_SIRASI = ['dusuk', 'orta', 'yuksek', 'kritik'] as const;
export type VarlikKritikligi = (typeof KRITIKLIK_SIRASI)[number];

/** Bu kritiklikten itibaren parça stoğu bir emniyet konusudur. */
export const AGIR_KRITIKLIK: readonly string[] = ['yuksek', 'kritik'];

export type StokDurumu = 'yeterli' | 'esikte' | 'tukendi' | 'pasif';

export const STOK_SOZU: Record<StokDurumu, string> = {
  yeterli: 'stok yeterli',
  esikte: 'kritik eşiğe indi',
  tukendi: 'stok TÜKENDİ',
  pasif: 'kayıt pasif',
};

export const STOK_SINIFI: Record<StokDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  yeterli: 'ok', esikte: 'md', tukendi: 'bd', pasif: 'unk',
};

export function stokDurumu(o: {
  stokAdedi: number; kritikEsik: number; aktif: boolean;
}): StokDurumu {
  if (!o.aktif) return 'pasif';
  if (o.stokAdedi <= 0) return 'tukendi';
  return o.stokAdedi <= o.kritikEsik ? 'esikte' : 'yeterli';
}

/* ── Maruziyet ───────────────────────────────────────────────────────── */

export type Maruziyet = {
  durum: StokDurumu;
  /** Bu parçaya bağlı ağır kritiklikteki varlık sayısı. */
  agirVarlik: number;
  /** Stok yokken ağır kritik varlık varsa: emniyet konusu. */
  acikRisk: boolean;
  /** Ölçülmemiş tedarik süresi ayrı sayılır — uzun süre DEĞİL. */
  tedarikOlculdu: boolean;
};

/**
 * Bir parçanın bugünkü maruziyeti.
 *
 * `acikRisk` yalnız İKİSİ birden doğruyken açılır: stok tükenmiş VE
 * ağır kritiklikte en az bir varlık bu parçaya bağlı. Yalnız stoğa
 * bakmak, kimsenin umursamadığı bir parçayı da kırmızı gösterirdi.
 */
export function maruziyet(o: {
  stokAdedi: number;
  kritikEsik: number;
  aktif: boolean;
  tedarikSuresiGun: number | null;
  bagliKritiklikler: readonly string[];
}): Maruziyet {
  const durum = stokDurumu(o);
  const agirVarlik = o.bagliKritiklikler.filter((k) => AGIR_KRITIKLIK.includes(k)).length;
  return {
    durum,
    agirVarlik,
    acikRisk: durum === 'tukendi' && agirVarlik > 0,
    tedarikOlculdu: o.tedarikSuresiGun !== null,
  };
}

/* ── Kapı ────────────────────────────────────────────────────────────── */

export type Karar = { ok: true } | { ok: false; sebep: string };

/**
 * Parça kaydı yazılabilir mi?
 *
 * Negatif stok yoktur; kritik eşik negatif olamaz. Tedarik süresi
 * girildiyse pozitif olmalı — sıfır gün "hemen gelir" demektir ve
 * ölçülmemiş süreyi anlatmak için `null` vardır.
 */
export function parcaKapisi(o: {
  stokAdedi: number;
  kritikEsik: number;
  tedarikSuresiGun: number | null;
}): Karar {
  if (!Number.isInteger(o.stokAdedi) || o.stokAdedi < 0) {
    return { ok: false, sebep: 'Stok adedi negatif olamaz.' };
  }
  if (!Number.isInteger(o.kritikEsik) || o.kritikEsik < 0) {
    return { ok: false, sebep: 'Kritik eşik negatif olamaz.' };
  }
  if (o.tedarikSuresiGun !== null) {
    if (!Number.isInteger(o.tedarikSuresiGun) || o.tedarikSuresiGun <= 0) {
      return {
        ok: false,
        sebep: 'Tedarik süresi girildiyse en az 1 gün olmalı. Ölçülmediyse '
          + 'BOŞ bırakın: sıfır gün "hemen gelir" demektir.',
      };
    }
  }
  return { ok: true };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type ParcaOzeti = {
  toplam: number;
  aktif: number;
  tukenen: number;
  esikte: number;
  /** Stoğu tükenmiş VE ağır kritik varlığa bağlı parça sayısı. */
  acikRisk: number;
  /** Tedarik süresi ölçülmemiş aktif parça — bilinmeyen, sıfır değil. */
  suresizOlculmedi: number;
};

export function parcaOzeti(
  parcalar: readonly {
    stokAdedi: number; kritikEsik: number; aktif: boolean;
    tedarikSuresiGun: number | null; bagliKritiklikler: readonly string[];
  }[],
): ParcaOzeti {
  const m = parcalar.map(maruziyet);
  return {
    toplam: parcalar.length,
    aktif: parcalar.filter((p) => p.aktif).length,
    tukenen: m.filter((x) => x.durum === 'tukendi').length,
    esikte: m.filter((x) => x.durum === 'esikte').length,
    acikRisk: m.filter((x) => x.acikRisk).length,
    suresizOlculmedi: parcalar.filter(
      (p) => p.aktif && p.tedarikSuresiGun === null,
    ).length,
  };
}

export function parcaCumlesi(o: ParcaOzeti): string {
  if (o.toplam === 0) return 'Kayıtlı yedek parça yok.';
  if (o.acikRisk > 0) {
    return `${o.acikRisk} parçanın stoğu TÜKENDİ ve bu parçalar yüksek ya da `
      + 'kritik varlıklara hizmet ediyor.';
  }
  if (o.esikte > 0) {
    return `${o.esikte} parça kritik eşiğe indi; tedarik başlatılmalı.`;
  }
  if (o.suresizOlculmedi > 0) {
    return `${o.aktif} aktif parça · ${o.suresizOlculmedi} tanesinin tedarik `
      + 'süresi ÖLÇÜLMEDİ: arıza anında ne kadar bekleneceği bilinmiyor.';
  }
  return `${o.aktif} aktif parçanın tamamında stok yeterli.`;
}
