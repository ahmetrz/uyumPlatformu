/* F3 · Tesis 360 — OT mimari profili, SAF katman.

   Profil İKİ kaynaktan gelir ve ekran ikisini TEK listede çizer:
     · ÇEKİRDEK — `TesisProfili` kolonları: sektörsüz OT alanları
       (mimari tipi, sağlayıcılar, maruziyet, yerel altyapı). Bu dosya
       onları adıyla bilir; hepsi her sektörde anlamlıdır.
     · SEKTÖR — paketin `SektorOznitelikSemasi` ile beyan ettiği
       öznitelikler (B2: lisans, kabul, black start, TEİAŞ, seri
       haberleşme, kritiklik sınıfı enerji PAKETİNİNDİR, çekirdek
       kolonu değil). Çekirdek bunların adını BİLMEZ: şemadan gelen
       tip, etiket, seçenek ve grupla çizer. Şeması boş sektörde bu
       kaynak boştur ve ekran yalnız çekirdek alanları gösterir —
       enerji ile su aynı kodla, kendi alanlarıyla çalışır (K4).

   Her iki kaynak için tek sözleşme:
     · GÖSTERİM — her alan bir satır, boş alan "tanımsız" SÖZCÜĞÜYLE
       (boş bırakılmaz: bilinmeyen ≠ yok);
     · FORM — aynı alan listesi giriş alanına döner, boş giriş null'a
       (yani "bilinmiyor"a) çevrilir, üç durumlu boolean üç seçenektir.

   Veritabanı, React ve `server-only` bağımlılığı YOKTUR; test doğrudan
   çağırır (tests/tesis360-profil.test.ts). */

/* ═══ Çekirdek profil kaydı (serileştirilmiş) ═════════════════════════ */

export type OtProfili = {
  kritikAltyapiStatusu: boolean | null;
  internetMaruziyeti: string | null;
  uzaktanErisim: boolean | null;
  otMimariTipi: string | null;
  dcsSaglayici: string | null;
  scadaSaglayici: string | null;
  /** noktalı virgülle liste (şema sözleşmesi) */
  plcAileleri: string | null;
  iotVar: boolean | null;
  akilliSayacVar: boolean | null;
  yerelAdVar: boolean | null;
  yerelVeriMerkeziVar: boolean | null;
  /** noktalı virgülle liste */
  grupOrtakServisler: string | null;
  guncellendi: string | null;
};

export const BOS_PROFIL: OtProfili = {
  kritikAltyapiStatusu: null, internetMaruziyeti: null,
  uzaktanErisim: null, otMimariTipi: null, dcsSaglayici: null, scadaSaglayici: null,
  plcAileleri: null, iotVar: null, akilliSayacVar: null, yerelAdVar: null,
  yerelVeriMerkeziVar: null, grupOrtakServisler: null, guncellendi: null,
};

/* ═══ Alan tanımı — gösterim ve form aynı listeden ═══════════════════ */

export type AlanTuru = 'metin' | 'liste' | 'ucDurum' | 'secim' | 'tarih' | 'sayi';

export type Secenek = { deger: string; ad: string };

export type ProfilAlani = {
  anahtar: Exclude<keyof OtProfili, 'guncellendi'>;
  etiket: string;
  tur: AlanTuru;
  secenekler?: Secenek[];
};

export type ProfilGrubu = { ad: string; alanlar: ProfilAlani[] };

export const OT_MIMARI_SECENEKLERI = [
  { deger: 'dcs', ad: 'DCS' },
  { deger: 'scada', ad: 'SCADA' },
  { deger: 'plc_scada', ad: 'PLC + SCADA' },
  { deger: 'hibrit', ad: 'Hibrit' },
];

export const MARUZIYET_SECENEKLERI = [
  { deger: 'yok', ad: 'Yok' },
  { deger: 'sinirli', ad: 'Sınırlı' },
  { deger: 'var', ad: 'Var' },
];

/** Çekirdek gruplar. Sektör grupları İLK grubun ardına girer; çekirdek
    grupla aynı adı taşıyan sektör grubu o grubun sonuna eklenir
    (`profilGruplari`). Böylece enerji paketi "Kritiklik ve maruziyet"
    grubuna kendi kritiklik sınıfını koyabilir. */
export const PROFIL_GRUPLARI: ProfilGrubu[] = [
  { ad: 'OT mimarisi', alanlar: [
    { anahtar: 'otMimariTipi', etiket: 'OT mimari tipi', tur: 'secim', secenekler: OT_MIMARI_SECENEKLERI },
    { anahtar: 'dcsSaglayici', etiket: 'DCS sağlayıcı', tur: 'metin' },
    { anahtar: 'scadaSaglayici', etiket: 'SCADA sağlayıcı', tur: 'metin' },
    { anahtar: 'plcAileleri', etiket: 'PLC aileleri', tur: 'liste' },
  ] },
  { ad: 'Kritiklik ve maruziyet', alanlar: [
    { anahtar: 'kritikAltyapiStatusu', etiket: 'Kritik altyapı statüsü', tur: 'ucDurum' },
    { anahtar: 'internetMaruziyeti', etiket: 'İnternet maruziyeti', tur: 'secim', secenekler: MARUZIYET_SECENEKLERI },
    { anahtar: 'uzaktanErisim', etiket: 'Uzaktan erişim', tur: 'ucDurum' },
  ] },
  { ad: 'Yerel altyapı', alanlar: [
    { anahtar: 'iotVar', etiket: 'IoT cihazı', tur: 'ucDurum' },
    { anahtar: 'akilliSayacVar', etiket: 'Akıllı sayaç', tur: 'ucDurum' },
    { anahtar: 'yerelAdVar', etiket: 'Yerel dizin (AD)', tur: 'ucDurum' },
    { anahtar: 'yerelVeriMerkeziVar', etiket: 'Yerel veri merkezi', tur: 'ucDurum' },
    { anahtar: 'grupOrtakServisler', etiket: 'Grup ortak servisleri', tur: 'liste' },
  ] },
];

export const PROFIL_ALANLARI: ProfilAlani[] = PROFIL_GRUPLARI.flatMap((g) => g.alanlar);

/* ═══ Sektör öznitelikleri (paketin beyanı) ══════════════════════════ */

/** Şema satırından türetilen alan. `etiket` sözlükten çözülmüş metindir
    (sunucu çözer; çözülemezse anahtarın kendisi — uydurulmaz). */
export type SektorAlani = {
  anahtar: string;
  etiket: string;
  tur: AlanTuru;
  secenekler?: Secenek[];
  /** Ekran grubu — paket verir; null → "Sektör öznitelikleri". */
  grup: string | null;
  birim: string | null;
};

/** Serileştirilmiş öznitelik değeri: mantık → boolean, sayı → number,
    metin/tarih → string; satır yoksa null (ÖLÇÜLMEDİ). */
export type SektorDegeri = string | number | boolean | null;

export type SektorProfili = {
  alanlar: SektorAlani[];
  degerler: Record<string, SektorDegeri>;
};

export const BOS_SEKTOR_PROFILI: SektorProfili = { alanlar: [], degerler: {} };

export const SEKTOR_GRUBU_VARSAYILAN = 'Sektör öznitelikleri';

/** Şema `tip`i → alan türü. Seçenekli metin seçimdir. */
export function sektorAlaniKur(sema: {
  anahtar: string; tip: string; etiket: string; secenekler: string | null;
  grup: string | null; birim: string | null;
}): SektorAlani {
  const secenekler = seceneklerOku(sema.secenekler);
  const tur: AlanTuru = sema.tip === 'mantik' ? 'ucDurum'
    : sema.tip === 'tarih' ? 'tarih'
      : sema.tip === 'sayi' ? 'sayi'
        : secenekler ? 'secim' : 'metin';
  return {
    anahtar: sema.anahtar, etiket: sema.etiket, tur,
    ...(secenekler ? { secenekler } : {}),
    grup: sema.grup, birim: sema.birim,
  };
}

/** `secenekler` JSON'u: `[{deger, ad}]`. Bozuk ya da boş → seçeneksiz
    (alan metin olur; sessizce "geçerli" sayılmaz, form kısıtı düşer). */
export function seceneklerOku(json: string | null | undefined): Secenek[] | null {
  if (!json) return null;
  try {
    const ham: unknown = JSON.parse(json);
    if (!Array.isArray(ham)) return null;
    const liste = ham.filter((x): x is Secenek =>
      typeof x === 'object' && x !== null
      && typeof (x as Secenek).deger === 'string' && typeof (x as Secenek).ad === 'string');
    return liste.length ? liste : null;
  } catch { return null; }
}

/** `TesisOzellik` satırlarından alan başına değer. Satır yoksa null. */
export function sektorDegerleri(
  alanlar: readonly SektorAlani[],
  ozellikler: readonly { anahtar: string; sayisalDeger: number | null; metinDeger?: string | null }[],
): Record<string, SektorDegeri> {
  const d: Record<string, SektorDegeri> = {};
  for (const a of alanlar) {
    const o = ozellikler.find((x) => x.anahtar === a.anahtar);
    if (!o) { d[a.anahtar] = null; continue; }
    switch (a.tur) {
      case 'ucDurum': d[a.anahtar] = o.sayisalDeger === null ? null : o.sayisalDeger === 1; break;
      case 'sayi': d[a.anahtar] = o.sayisalDeger; break;
      default: d[a.anahtar] = o.metinDeger ?? null;
    }
  }
  return d;
}

/* ═══ Birleşik alan görünümü — gösterim ve form ═════════════════════ */

/** Ekranın çizdiği alan: kaynağı çekirdek ya da sektör. Form durumu
    `formAnahtari` ile anahtarlanır — sektör anahtarı `oz:` önekiyle,
    paketin bir çekirdek adını (ör. `iotVar`) kullanması çakışmasın. */
export type GorunumAlani = {
  kaynak: 'cekirdek' | 'sektor';
  anahtar: string;
  formAnahtari: string;
  etiket: string;
  tur: AlanTuru;
  secenekler?: Secenek[];
  birim: string | null;
};

export type GorunumGrubu = { ad: string; alanlar: GorunumAlani[] };

const cekirdekAlani = (a: ProfilAlani): GorunumAlani => ({
  kaynak: 'cekirdek', anahtar: a.anahtar, formAnahtari: a.anahtar,
  etiket: a.etiket, tur: a.tur, ...(a.secenekler ? { secenekler: a.secenekler } : {}), birim: null,
});

const sektorAlani = (a: SektorAlani): GorunumAlani => ({
  kaynak: 'sektor', anahtar: a.anahtar, formAnahtari: `oz:${a.anahtar}`,
  etiket: a.etiket, tur: a.tur, ...(a.secenekler ? { secenekler: a.secenekler } : {}), birim: a.birim,
});

/**
 * Çekirdek + sektör gruplarının birleşimi. Sektör alanları şema sırasıyla
 * gruplanır; adı bir çekirdek grupla aynı olan sektör grubu o grubun
 * SONUNA eklenir, diğerleri ilk çekirdek grubun ardına girer.
 */
export function profilGruplari(sektor: SektorProfili = BOS_SEKTOR_PROFILI): GorunumGrubu[] {
  const gruplar: GorunumGrubu[] = PROFIL_GRUPLARI.map((g) => ({
    ad: g.ad, alanlar: g.alanlar.map(cekirdekAlani),
  }));
  const sektorGruplari: GorunumGrubu[] = [];
  for (const a of sektor.alanlar) {
    const ad = a.grup ?? SEKTOR_GRUBU_VARSAYILAN;
    const cekirdek = gruplar.find((g) => g.ad === ad);
    if (cekirdek) { cekirdek.alanlar.push(sektorAlani(a)); continue; }
    let g = sektorGruplari.find((x) => x.ad === ad);
    if (!g) { g = { ad, alanlar: [] }; sektorGruplari.push(g); }
    g.alanlar.push(sektorAlani(a));
  }
  return [gruplar[0], ...sektorGruplari, ...gruplar.slice(1)];
}

export function profilAlanlari(sektor: SektorProfili = BOS_SEKTOR_PROFILI): GorunumAlani[] {
  return profilGruplari(sektor).flatMap((g) => g.alanlar);
}

function hamDeger(
  alan: GorunumAlani, profil: OtProfili, sektor: SektorProfili,
): string | number | boolean | null {
  if (alan.kaynak === 'cekirdek') return profil[alan.anahtar as ProfilAlani['anahtar']];
  return sektor.degerler[alan.anahtar] ?? null;
}

/* ═══ Liste alanları ═════════════════════════════════════════════════ */

/**
 * Noktalı virgül ya da virgülle ayrılmış listeyi ayrıştırır. Şema
 * "noktalı virgülle liste" der; kullanıcı virgülle de yazar — ikisi de
 * kabul edilir. Boşluk kırpılır, boş parça ve tekrar düşer.
 */
export function listeyiAyristir(metin: string | null | undefined): string[] {
  if (!metin) return [];
  const gorulen = new Set<string>();
  const cikti: string[] = [];
  for (const parca of metin.split(/[;,]/)) {
    const p = parca.trim();
    const anahtar = p.toLocaleLowerCase('tr-TR');
    if (!p || gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    cikti.push(p);
  }
  return cikti;
}

/** Saklama biçimi: şema sözleşmesi (noktalı virgül). Boş liste → null. */
export function listeyiSakla(metin: string | null | undefined): string | null {
  const parcalar = listeyiAyristir(metin);
  return parcalar.length ? parcalar.join('; ') : null;
}

/* ═══ Gösterim ═══════════════════════════════════════════════════════ */

export const TANIMSIZ = 'tanımsız';

const TARIH = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export type ProfilSatiri = {
  anahtar: string;
  etiket: string;
  deger: string;
  /** alan boş — ekranda "tanımsız" sözcüğü ve unk işareti */
  tanimsiz: boolean;
};

/**
 * Tek değerin insan sözü. Null her türde "tanımsız"dır — üç durumlu
 * boolean için null "hayır" DEĞİLDİR, bilinmeyendir.
 */
export function degerYazisi(
  ham: string | number | boolean | null | undefined,
  alan: Pick<GorunumAlani, 'tur' | 'secenekler' | 'birim'>,
): string {
  const bos = ham === null || ham === undefined || ham === '';
  if (bos) return TANIMSIZ;
  switch (alan.tur) {
    case 'ucDurum': return ham === true ? 'var' : 'yok';
    case 'secim': return alan.secenekler?.find((s) => s.deger === ham)?.ad ?? String(ham);
    case 'liste': return listeyiAyristir(String(ham)).join(', ') || TANIMSIZ;
    case 'tarih': {
      const d = new Date(String(ham));
      return Number.isNaN(d.getTime()) ? 'geçersiz tarih' : TARIH.format(d);
    }
    case 'sayi': return alan.birim ? `${String(ham)} ${alan.birim}` : String(ham);
    default: return String(ham);
  }
}

/** Çekirdek alanın satırı (testler ve eski çağıranlar için). */
export function alanDegeri(profil: OtProfili, alan: ProfilAlani): ProfilSatiri {
  const deger = degerYazisi(profil[alan.anahtar], { tur: alan.tur, secenekler: alan.secenekler, birim: null });
  return { anahtar: alan.anahtar, etiket: alan.etiket, deger, tanimsiz: deger === TANIMSIZ };
}

export function profilSatirlari(
  profil: OtProfili | null, sektor: SektorProfili = BOS_SEKTOR_PROFILI,
): { ad: string; satirlar: ProfilSatiri[] }[] {
  const p = profil ?? BOS_PROFIL;
  return profilGruplari(sektor).map((g) => ({
    ad: g.ad,
    satirlar: g.alanlar.map((a) => {
      const deger = degerYazisi(hamDeger(a, p, sektor), a);
      return { anahtar: a.formAnahtari, etiket: a.etiket, deger, tanimsiz: deger === TANIMSIZ };
    }),
  }));
}

/** Kaç alan tanımsız — başlıkta "N/M alan tanımsız" diye yazılır. M
    sektöre göre değişir: çekirdek 13 + paketin beyan ettiği kadar. */
export function tanimsizSayisi(
  profil: OtProfili | null, sektor: SektorProfili = BOS_SEKTOR_PROFILI,
): { tanimsiz: number; toplam: number } {
  const satirlar = profilSatirlari(profil, sektor).flatMap((g) => g.satirlar);
  return { tanimsiz: satirlar.filter((s) => s.tanimsiz).length, toplam: satirlar.length };
}

/* ═══ Form ═══════════════════════════════════════════════════════════ */

/** Form durumu: her alan bir metin (`formAnahtari` ile). Üç durumlu alan
    'evet' | 'hayir' | ''. */
export type ProfilFormu = Record<string, string>;

function formDegeri(ham: string | number | boolean | null | undefined, tur: AlanTuru): string {
  if (ham === null || ham === undefined) return '';
  switch (tur) {
    case 'ucDurum': return ham === true ? 'evet' : 'hayir';
    case 'liste': return listeyiAyristir(String(ham)).join(', ');
    case 'tarih': {
      const d = new Date(String(ham));
      return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    default: return String(ham);
  }
}

export function formVarsayilani(
  profil: OtProfili | null, sektor: SektorProfili = BOS_SEKTOR_PROFILI,
): ProfilFormu {
  const p = profil ?? BOS_PROFIL;
  const f: ProfilFormu = {};
  for (const a of profilAlanlari(sektor)) f[a.formAnahtari] = formDegeri(hamDeger(a, p, sektor), a.tur);
  return f;
}

/** `profilKaydet` girdisi — sunucu şemasıyla yapısal olarak aynı.
    `oznitelikler` paketin BÜTÜN anahtarlarını taşır; boş bırakılanın
    değeri null'dur ve sunucu satırı siler (ölçülmedi = satırsızlık). */
export type ProfilGirdisi = {
  tesisId: string;
  kritikAltyapiStatusu: boolean | null;
  internetMaruziyeti: 'yok' | 'sinirli' | 'var' | null;
  uzaktanErisim: boolean | null;
  otMimariTipi: 'dcs' | 'scada' | 'plc_scada' | 'hibrit' | null;
  dcsSaglayici: string | null;
  scadaSaglayici: string | null;
  plcAileleri: string | null;
  iotVar: boolean | null;
  akilliSayacVar: boolean | null;
  yerelAdVar: boolean | null;
  yerelVeriMerkeziVar: boolean | null;
  grupOrtakServisler: string | null;
  oznitelikler: Record<string, SektorDegeri>;
};

const ucDurumdan = (v: string): boolean | null =>
  (v === 'evet' ? true : v === 'hayir' ? false : null);

const metinden = (v: string): string | null => (v.trim() ? v.trim() : null);

const secimden = <T extends string>(v: string, secenekler: { deger: string }[]): T | null =>
  (secenekler.some((s) => s.deger === v) ? (v as T) : null);

const tarihten = (v: string): string | null => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

const sayidan = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Sektör alanının form değerinden saklanacak değere. Boş ve geçersiz
    → null (bilinmiyor); sessizce başka bir şey kaydedilmez. */
export function sektorDegeriCoz(alan: Pick<GorunumAlani, 'tur' | 'secenekler'>, v: string): SektorDegeri {
  switch (alan.tur) {
    case 'ucDurum': return ucDurumdan(v);
    case 'secim': return secimden(v, alan.secenekler ?? []);
    case 'tarih': return tarihten(v);
    case 'sayi': return sayidan(v);
    case 'liste': return listeyiSakla(v);
    default: return metinden(v);
  }
}

/**
 * Formdan sunucu girdisine. Boş her şey null olur — "bilinmiyor" olarak
 * saklanır; ekran bunu sıfır ya da "yok" saymaz. Geçersiz seçim değeri
 * (ör. elle bozulmuş option) sessizce kaydedilmez, null'a düşer.
 */
export function formdanGirdi(
  tesisId: string, f: ProfilFormu, sektor: SektorProfili = BOS_SEKTOR_PROFILI,
): ProfilGirdisi {
  const oznitelikler: Record<string, SektorDegeri> = {};
  for (const a of sektor.alanlar) oznitelikler[a.anahtar] = sektorDegeriCoz(a, f[`oz:${a.anahtar}`] ?? '');
  return {
    tesisId,
    kritikAltyapiStatusu: ucDurumdan(f.kritikAltyapiStatusu ?? ''),
    internetMaruziyeti: secimden(f.internetMaruziyeti ?? '', MARUZIYET_SECENEKLERI),
    uzaktanErisim: ucDurumdan(f.uzaktanErisim ?? ''),
    otMimariTipi: secimden(f.otMimariTipi ?? '', OT_MIMARI_SECENEKLERI),
    dcsSaglayici: metinden(f.dcsSaglayici ?? ''),
    scadaSaglayici: metinden(f.scadaSaglayici ?? ''),
    plcAileleri: listeyiSakla(f.plcAileleri),
    iotVar: ucDurumdan(f.iotVar ?? ''),
    akilliSayacVar: ucDurumdan(f.akilliSayacVar ?? ''),
    yerelAdVar: ucDurumdan(f.yerelAdVar ?? ''),
    yerelVeriMerkeziVar: ucDurumdan(f.yerelVeriMerkeziVar ?? ''),
    grupOrtakServisler: listeyiSakla(f.grupOrtakServisler),
    oznitelikler,
  };
}
