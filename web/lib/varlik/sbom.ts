/* ═══ OT-26 · SBOM ayrıştırma — CycloneDX ve SPDX ══════════════════════

   Denetim: repoda `sbom|cyclonedx|spdx|purl|cpe` araması SIFIR sonuç
   veriyordu. `YazilimUrunu` ve `VarlikYazilimi` modelleri şemada duruyor
   ama hiçbir kod onları okumuyor/yazmıyordu — ölü modeller.

   ── AYRIŞTIRICI FIRLATMAZ ─────────────────────────────────────────────
   Bozuk bir SBOM yüklendiğinde işlemin patlaması, kullanıcıya "dosyanın
   NESİ bozuk" sorusunun cevabını vermez. Bu yüzden ayrıştırıcı her zaman
   bir SONUÇ döner: kabul edilen bileşenler + reddedilen satırlar + sebep.
   Kısmi başarı birinci sınıf bir sonuçtur; 900 bileşenin 3'ü okunamadıysa
   897'sini atmak veri kaybıdır.

   ── SÜRÜM UYDURULMAZ ──────────────────────────────────────────────────
   Sürümü olmayan bileşen `surum: null` ile geçer, `'0'` ya da `'bilinmiyor'`
   ile DEĞİL. Sürüm alanı zafiyet korelasyonunun girdisidir; oraya uydurma
   bir değer koymak, korelasyonu sessizce yanlış cevap üretmeye zorlar.

   ── purl KANONİK KİMLİKTİR ────────────────────────────────────────────
   Aynı bileşen CycloneDX'te `lodash`, SPDX'te `npm/lodash` diye geçebilir.
   İkisinin de taşıdığı `pkg:npm/lodash@4.17.21` biçimindeki purl, tekilliği
   kuran alandır. purl yoksa (ad, sürüm) çifti kullanılır ve bu daha zayıf
   bir kimliktir — kayıt öyle işaretlenir. */

/**
 * Tek yüklemede işlenecek EN ÇOK bileşen.
 *
 * Büyük bir SBOM on binlerce bileşen taşıyabilir; hepsini tek bir yazma
 * turunda işlemek SQLite'ı ve isteği kilitler. Sınır BURADA durur —
 * ayrıştırıcının yanında — çünkü hem sunucu eylemi hem demo ikizi hem de
 * testler aynı sayıyı okumak zorundadır.
 */
export const SBOM_PARTI_BOYU = 500;

export type SbomBicimi = 'cyclonedx' | 'spdx';

export type SbomBileseni = {
  ad: string;
  /** null = sürüm BELGEDE YOK (sıfır ya da "bilinmiyor" değil). */
  surum: string | null;
  purl: string | null;
  cpe: string | null;
  tedarikci: string | null;
  lisans: string | null;
  /** `sha256:…` biçiminde, algoritma öneki ile. */
  ozet: string | null;
  /** gerekli | istege_bagli | haric | bilinmiyor */
  kapsam: 'gerekli' | 'istege_bagli' | 'haric' | 'bilinmiyor';
  /** Kimliğin purl'den mi yoksa (ad, sürüm) çiftinden mi geldiği. */
  kimlikGucu: 'purl' | 'ad_surum';
};

export type SbomAyristirmaSonucu = {
  ok: boolean;
  bicim: SbomBicimi | null;
  bicimSurumu: string | null;
  seriNo: string | null;
  uretimZamani: string | null;
  bilesenler: SbomBileseni[];
  /** Okunamayan satırlar — sayısı ve sebebi kaybolmaz. */
  reddedilen: { sira: number; sebep: string }[];
  /** Belge düzeyinde hata (biçim tanınmadı, JSON bozuk …). */
  hata: string | null;
};

function bosNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t : null;
}

const BOS_SONUC = (hata: string): SbomAyristirmaSonucu => ({
  ok: false, bicim: null, bicimSurumu: null, seriNo: null, uretimZamani: null,
  bilesenler: [], reddedilen: [], hata,
});

/* ── CycloneDX ─────────────────────────────────────────────────────── */
function cycloneKapsam(v: unknown): SbomBileseni['kapsam'] {
  if (v === 'required') return 'gerekli';
  if (v === 'optional') return 'istege_bagli';
  if (v === 'excluded') return 'haric';
  return 'bilinmiyor';
}

function cycloneOzet(hashes: unknown): string | null {
  if (!Array.isArray(hashes)) return null;
  /* SHA-256 yeğlenir; yoksa ilk okunabilir özet alınır. Algoritma
     ÖNEKLE saklanır — öneksiz bir özet, hangi algoritmayla üretildiği
     bilinmeden karşılaştırılamaz. */
  const sirali = [...hashes].sort((a, b) => {
    const p = (h: unknown) => (typeof (h as { alg?: string })?.alg === 'string'
      && /sha-?256/i.test((h as { alg: string }).alg) ? 0 : 1);
    return p(a) - p(b);
  });
  for (const h of sirali) {
    const alg = bosNull((h as { alg?: unknown })?.alg);
    const icerik = bosNull((h as { content?: unknown })?.content);
    if (alg && icerik) return `${alg.toLowerCase().replace('-', '')}:${icerik}`;
  }
  return null;
}

function cycloneLisans(licenses: unknown): string | null {
  if (!Array.isArray(licenses)) return null;
  const adlar: string[] = [];
  for (const l of licenses) {
    const lic = (l as { license?: { id?: unknown; name?: unknown }; expression?: unknown });
    const d = bosNull(lic?.license?.id) ?? bosNull(lic?.license?.name) ?? bosNull(lic?.expression);
    if (d) adlar.push(d);
  }
  return adlar.length ? adlar.join(' AND ') : null;
}

function cycloneAyristir(k: Record<string, unknown>): SbomAyristirmaSonucu {
  const bilesenler: SbomBileseni[] = [];
  const reddedilen: { sira: number; sebep: string }[] = [];
  const liste = Array.isArray(k.components) ? k.components : [];

  liste.forEach((ham, i) => {
    const c = ham as Record<string, unknown>;
    const ad = bosNull(c.name);
    if (!ad) { reddedilen.push({ sira: i, sebep: 'bileşen adı yok' }); return; }
    const purl = bosNull(c.purl);
    bilesenler.push({
      ad,
      surum: bosNull(c.version),
      purl,
      cpe: bosNull(c.cpe),
      tedarikci: bosNull((c.supplier as { name?: unknown })?.name) ?? bosNull(c.publisher),
      lisans: cycloneLisans(c.licenses),
      ozet: cycloneOzet(c.hashes),
      kapsam: cycloneKapsam(c.scope),
      kimlikGucu: purl ? 'purl' : 'ad_surum',
    });
  });

  return {
    ok: true,
    bicim: 'cyclonedx',
    bicimSurumu: bosNull(k.specVersion),
    seriNo: bosNull(k.serialNumber),
    uretimZamani: bosNull((k.metadata as { timestamp?: unknown })?.timestamp),
    bilesenler,
    reddedilen,
    hata: null,
  };
}

/* ── SPDX ──────────────────────────────────────────────────────────── */
function spdxPurl(externalRefs: unknown): string | null {
  if (!Array.isArray(externalRefs)) return null;
  for (const r of externalRefs) {
    const ref = r as { referenceType?: unknown; referenceLocator?: unknown };
    if (bosNull(ref.referenceType)?.toLowerCase() === 'purl') return bosNull(ref.referenceLocator);
  }
  return null;
}

function spdxCpe(externalRefs: unknown): string | null {
  if (!Array.isArray(externalRefs)) return null;
  for (const r of externalRefs) {
    const ref = r as { referenceType?: unknown; referenceLocator?: unknown };
    const t = bosNull(ref.referenceType)?.toLowerCase();
    if (t === 'cpe23type' || t === 'cpe22type') return bosNull(ref.referenceLocator);
  }
  return null;
}

function spdxOzet(checksums: unknown): string | null {
  if (!Array.isArray(checksums)) return null;
  const sirali = [...checksums].sort((a, b) => {
    const p = (h: unknown) => (/sha-?256/i.test(String((h as { algorithm?: string })?.algorithm ?? '')) ? 0 : 1);
    return p(a) - p(b);
  });
  for (const c of sirali) {
    const alg = bosNull((c as { algorithm?: unknown })?.algorithm);
    const deger = bosNull((c as { checksumValue?: unknown })?.checksumValue);
    if (alg && deger) return `${alg.toLowerCase().replace('-', '')}:${deger}`;
  }
  return null;
}

/* SPDX tedarikçiyi `Organization: Adı (eposta)` biçiminde yazar; öneki
   atıp yalnız adı saklarız — önek bir değer değil, bir etikettir. */
function spdxTedarikci(v: unknown): string | null {
  const ham = bosNull(v);
  if (!ham || ham === 'NOASSERTION') return null;
  const m = /^(?:Organization|Person)\s*:\s*(.+)$/i.exec(ham);
  return bosNull(m ? m[1] : ham);
}

function spdxLisans(v: unknown): string | null {
  const ham = bosNull(v);
  /* NOASSERTION "lisans yok" demek DEĞİL, "belirlenmedi" demektir;
     null olarak geçer. */
  return !ham || ham === 'NOASSERTION' || ham === 'NONE' ? null : ham;
}

function spdxAyristir(k: Record<string, unknown>): SbomAyristirmaSonucu {
  const bilesenler: SbomBileseni[] = [];
  const reddedilen: { sira: number; sebep: string }[] = [];
  const liste = Array.isArray(k.packages) ? k.packages : [];

  liste.forEach((ham, i) => {
    const p = ham as Record<string, unknown>;
    const ad = bosNull(p.name);
    if (!ad) { reddedilen.push({ sira: i, sebep: 'paket adı yok' }); return; }
    const purl = spdxPurl(p.externalRefs);
    bilesenler.push({
      ad,
      surum: bosNull(p.versionInfo),
      purl,
      cpe: spdxCpe(p.externalRefs),
      tedarikci: spdxTedarikci(p.supplier) ?? spdxTedarikci(p.originator),
      lisans: spdxLisans(p.licenseConcluded) ?? spdxLisans(p.licenseDeclared),
      ozet: spdxOzet(p.checksums),
      /* SPDX'te kapsam alanı yoktur; uydurmak yerine bilinmiyor kalır. */
      kapsam: 'bilinmiyor',
      kimlikGucu: purl ? 'purl' : 'ad_surum',
    });
  });

  return {
    ok: true,
    bicim: 'spdx',
    bicimSurumu: bosNull(k.spdxVersion),
    seriNo: bosNull(k.documentNamespace),
    uretimZamani: bosNull((k.creationInfo as { created?: unknown })?.created),
    bilesenler,
    reddedilen,
    hata: null,
  };
}

/**
 * SBOM metnini ayrıştırır. Biçim İÇERİKTEN tanınır, dosya adından değil:
 * uzantı yalan söyleyebilir, `bomFormat`/`spdxVersion` söyleyemez.
 */
export function sbomAyristir(metin: string): SbomAyristirmaSonucu {
  let kok: unknown;
  try {
    kok = JSON.parse(metin);
  } catch {
    return BOS_SONUC('Dosya geçerli JSON değil.');
  }
  if (!kok || typeof kok !== 'object' || Array.isArray(kok)) {
    return BOS_SONUC('Belgenin kökü bir nesne değil.');
  }
  const k = kok as Record<string, unknown>;

  if (bosNull(k.bomFormat)?.toLowerCase() === 'cyclonedx' || Array.isArray(k.components)) {
    return cycloneAyristir(k);
  }
  if (bosNull(k.spdxVersion) || Array.isArray(k.packages)) {
    return spdxAyristir(k);
  }
  return BOS_SONUC('Biçim tanınmadı — CycloneDX (`bomFormat`) ya da SPDX (`spdxVersion`) beklenir.');
}

/**
 * Bileşenleri kanonik kimliğe göre tekilleştirir.
 * purl varsa purl, yoksa (ad, sürüm) çifti kimliktir.
 */
/**
 * Bileşenin KANONİK KİMLİĞİ — `purl` varsa o, yoksa `ad@surum`.
 *
 * Veritabanındaki `YazilimBileseni.kimlik` kolonu da budur. Tekilliği
 * nullable kolonlardan kurulu bileşik bir kısıta bırakmak SQLite'ta iş
 * görmez: NULL'lar birbirinden farklı sayılır ve sürümü olmayan her
 * bileşen her yüklemede yeni satır açardı.
 */
export function bilesenKimligi(b: Pick<SbomBileseni, 'ad' | 'surum' | 'purl'>): string {
  return b.purl ?? `${b.ad}@${b.surum ?? ''}`;
}

export function bilesenleriTekillestir(bilesenler: readonly SbomBileseni[]): SbomBileseni[] {
  const harita = new Map<string, SbomBileseni>();
  for (const b of bilesenler) {
    const anahtar = bilesenKimligi(b);
    const mevcut = harita.get(anahtar);
    /* Aynı bileşen iki kez geldiyse DAHA DOLU olanı tutulur: bir kaynak
       lisansı, öbürü özeti taşıyor olabilir. */
    if (!mevcut) { harita.set(anahtar, b); continue; }
    harita.set(anahtar, {
      ...mevcut,
      surum: mevcut.surum ?? b.surum,
      cpe: mevcut.cpe ?? b.cpe,
      tedarikci: mevcut.tedarikci ?? b.tedarikci,
      lisans: mevcut.lisans ?? b.lisans,
      ozet: mevcut.ozet ?? b.ozet,
      kapsam: mevcut.kapsam === 'bilinmiyor' ? b.kapsam : mevcut.kapsam,
    });
  }
  return [...harita.values()];
}
