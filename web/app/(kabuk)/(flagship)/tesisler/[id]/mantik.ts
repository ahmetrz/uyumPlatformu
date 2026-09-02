/* F3 · Plant 360 — OT mimari profili, SAF katman.

   `TesisProfili` uygulanabilirlik motorunun girdisidir (lib/motorlar/
   uygulanabilirlik.ts) ve /uyum ekranı "profil Plant 360'tan tamamlanır"
   der. Bu dosya profilin iki yönünü tek tanımdan türetir:
     · GÖSTERİM — her alan bir satır, boş alan "tanımsız" SÖZCÜĞÜYLE
       (boş bırakılmaz: bilinmeyen ≠ yok);
     · FORM — aynı alan listesi giriş alanına döner, boş giriş null'a
       (yani "bilinmiyor"a) çevrilir, üç durumlu boolean üç seçenektir.

   Veritabanı, React ve `server-only` bağımlılığı YOKTUR; test doğrudan
   çağırır (tests/plant360-profil.test.ts). */

/* ═══ Profil kaydı (serileştirilmiş) ═════════════════════════════════ */

export type OtProfili = {
  lisansTipi: string | null;
  lisansNo: string | null;
  kabulDurumu: string | null;
  /** ISO — sunucu Date'i serileştirir */
  kabulTarihi: string | null;
  blackStart: boolean | null;
  teiasScadaEms: boolean | null;
  seriHaberlesme: boolean | null;
  kritiklikSinifi: string | null;
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
  lisansTipi: null, lisansNo: null, kabulDurumu: null, kabulTarihi: null,
  blackStart: null, teiasScadaEms: null, seriHaberlesme: null,
  kritiklikSinifi: null, kritikAltyapiStatusu: null, internetMaruziyeti: null,
  uzaktanErisim: null, otMimariTipi: null, dcsSaglayici: null, scadaSaglayici: null,
  plcAileleri: null, iotVar: null, akilliSayacVar: null, yerelAdVar: null,
  yerelVeriMerkeziVar: null, grupOrtakServisler: null, guncellendi: null,
};

/* ═══ Alan tanımı — gösterim ve form aynı listeden ═══════════════════ */

export type AlanTuru = 'metin' | 'liste' | 'ucDurum' | 'secim' | 'tarih';

export type ProfilAlani = {
  anahtar: Exclude<keyof OtProfili, 'guncellendi'>;
  etiket: string;
  tur: AlanTuru;
  secenekler?: { deger: string; ad: string }[];
};

export type ProfilGrubu = { ad: string; alanlar: ProfilAlani[] };

export const OT_MIMARI_SECENEKLERI = [
  { deger: 'dcs', ad: 'DCS' },
  { deger: 'scada', ad: 'SCADA' },
  { deger: 'plc_scada', ad: 'PLC + SCADA' },
  { deger: 'hibrit', ad: 'Hibrit' },
];

export const KABUL_SECENEKLERI = [
  { deger: 'lisans_oncesi', ad: 'Lisans öncesi' },
  { deger: 'insaat', ad: 'İnşaat' },
  { deger: 'gecici_kabul', ad: 'Geçici kabul' },
  { deger: 'kesin_kabul', ad: 'Kesin kabul' },
];

export const KRITIKLIK_SECENEKLERI = [
  { deger: 'dusuk', ad: 'Düşük' },
  { deger: 'orta', ad: 'Orta' },
  { deger: 'yuksek', ad: 'Yüksek' },
  { deger: 'kritik', ad: 'Kritik' },
];

export const MARUZIYET_SECENEKLERI = [
  { deger: 'yok', ad: 'Yok' },
  { deger: 'sinirli', ad: 'Sınırlı' },
  { deger: 'var', ad: 'Var' },
];

/** Grup sırası ekranın okunma sırasıdır: önce OT mimarisi (bu bloğun
    adı), sonra lisans, şebeke, maruziyet, yerel altyapı. */
export const PROFIL_GRUPLARI: ProfilGrubu[] = [
  { ad: 'OT mimarisi', alanlar: [
    { anahtar: 'otMimariTipi', etiket: 'OT mimari tipi', tur: 'secim', secenekler: OT_MIMARI_SECENEKLERI },
    { anahtar: 'dcsSaglayici', etiket: 'DCS sağlayıcı', tur: 'metin' },
    { anahtar: 'scadaSaglayici', etiket: 'SCADA sağlayıcı', tur: 'metin' },
    { anahtar: 'plcAileleri', etiket: 'PLC aileleri', tur: 'liste' },
  ] },
  { ad: 'Lisans ve kabul', alanlar: [
    { anahtar: 'lisansTipi', etiket: 'Lisans tipi', tur: 'metin' },
    { anahtar: 'lisansNo', etiket: 'Lisans no', tur: 'metin' },
    { anahtar: 'kabulDurumu', etiket: 'Kabul durumu', tur: 'secim', secenekler: KABUL_SECENEKLERI },
    { anahtar: 'kabulTarihi', etiket: 'Kabul tarihi', tur: 'tarih' },
  ] },
  { ad: 'Şebeke ve haberleşme', alanlar: [
    { anahtar: 'blackStart', etiket: 'Black start', tur: 'ucDurum' },
    { anahtar: 'teiasScadaEms', etiket: 'TEİAŞ SCADA/EMS haberleşmesi', tur: 'ucDurum' },
    { anahtar: 'seriHaberlesme', etiket: 'Seri haberleşme', tur: 'ucDurum' },
  ] },
  { ad: 'Kritiklik ve maruziyet', alanlar: [
    { anahtar: 'kritiklikSinifi', etiket: 'Kritiklik sınıfı', tur: 'secim', secenekler: KRITIKLIK_SECENEKLERI },
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
  anahtar: ProfilAlani['anahtar'];
  etiket: string;
  deger: string;
  /** alan boş — ekranda "tanımsız" sözcüğü ve unk işareti */
  tanimsiz: boolean;
};

/**
 * Tek alanın insan sözü. Null her türde "tanımsız"dır — üç durumlu
 * boolean için null "hayır" DEĞİLDİR, bilinmeyendir.
 */
export function alanDegeri(profil: OtProfili, alan: ProfilAlani): ProfilSatiri {
  const ham = profil[alan.anahtar];
  const bos = ham === null || ham === undefined || ham === '';
  let deger = TANIMSIZ;
  if (!bos) {
    switch (alan.tur) {
      case 'ucDurum': deger = ham === true ? 'var' : 'yok'; break;
      case 'secim':
        deger = alan.secenekler?.find((s) => s.deger === ham)?.ad ?? String(ham);
        break;
      case 'liste': deger = listeyiAyristir(String(ham)).join(', ') || TANIMSIZ; break;
      case 'tarih': {
        const d = new Date(String(ham));
        deger = Number.isNaN(d.getTime()) ? 'geçersiz tarih' : TARIH.format(d);
        break;
      }
      default: deger = String(ham);
    }
  }
  return { anahtar: alan.anahtar, etiket: alan.etiket, deger, tanimsiz: deger === TANIMSIZ };
}

export function profilSatirlari(profil: OtProfili | null): { ad: string; satirlar: ProfilSatiri[] }[] {
  const p = profil ?? BOS_PROFIL;
  return PROFIL_GRUPLARI.map((g) => ({
    ad: g.ad, satirlar: g.alanlar.map((a) => alanDegeri(p, a)),
  }));
}

/** Kaç alan tanımsız — başlıkta "N/21 alan tanımsız" diye yazılır. */
export function tanimsizSayisi(profil: OtProfili | null): { tanimsiz: number; toplam: number } {
  const p = profil ?? BOS_PROFIL;
  const tanimsiz = PROFIL_ALANLARI.filter((a) => alanDegeri(p, a).tanimsiz).length;
  return { tanimsiz, toplam: PROFIL_ALANLARI.length };
}

/* ═══ Form ═══════════════════════════════════════════════════════════ */

/** Form durumu: her alan bir metin. Üç durumlu alan 'evet' | 'hayir' | ''. */
export type ProfilFormu = Record<ProfilAlani['anahtar'], string>;

export function formVarsayilani(profil: OtProfili | null): ProfilFormu {
  const p = profil ?? BOS_PROFIL;
  const f = {} as ProfilFormu;
  for (const a of PROFIL_ALANLARI) {
    const ham = p[a.anahtar];
    if (ham === null || ham === undefined) { f[a.anahtar] = ''; continue; }
    switch (a.tur) {
      case 'ucDurum': f[a.anahtar] = ham === true ? 'evet' : 'hayir'; break;
      case 'liste': f[a.anahtar] = listeyiAyristir(String(ham)).join(', '); break;
      case 'tarih': {
        const d = new Date(String(ham));
        f[a.anahtar] = Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
        break;
      }
      default: f[a.anahtar] = String(ham);
    }
  }
  return f;
}

/** `profilKaydet` girdisi — sunucu şemasıyla yapısal olarak aynı. */
export type ProfilGirdisi = {
  tesisId: string;
  lisansTipi: string | null;
  lisansNo: string | null;
  kabulDurumu: 'gecici_kabul' | 'kesin_kabul' | 'insaat' | 'lisans_oncesi' | null;
  kabulTarihi: string | null;
  blackStart: boolean | null;
  teiasScadaEms: boolean | null;
  seriHaberlesme: boolean | null;
  kritiklikSinifi: 'dusuk' | 'orta' | 'yuksek' | 'kritik' | null;
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
};

const ucDurumdan = (v: string): boolean | null =>
  (v === 'evet' ? true : v === 'hayir' ? false : null);

const metinden = (v: string): string | null => (v.trim() ? v.trim() : null);

const secimden = <T extends string>(v: string, secenekler: { deger: string }[]): T | null =>
  (secenekler.some((s) => s.deger === v) ? (v as T) : null);

/**
 * Formdan sunucu girdisine. Boş her şey null olur — "bilinmiyor" olarak
 * saklanır; ekran bunu sıfır ya da "yok" saymaz. Geçersiz seçim değeri
 * (ör. elle bozulmuş option) sessizce kaydedilmez, null'a düşer.
 */
export function formdanGirdi(tesisId: string, f: ProfilFormu): ProfilGirdisi {
  return {
    tesisId,
    lisansTipi: metinden(f.lisansTipi),
    lisansNo: metinden(f.lisansNo),
    kabulDurumu: secimden(f.kabulDurumu, KABUL_SECENEKLERI),
    kabulTarihi: /^\d{4}-\d{2}-\d{2}$/.test(f.kabulTarihi) ? f.kabulTarihi : null,
    blackStart: ucDurumdan(f.blackStart),
    teiasScadaEms: ucDurumdan(f.teiasScadaEms),
    seriHaberlesme: ucDurumdan(f.seriHaberlesme),
    kritiklikSinifi: secimden(f.kritiklikSinifi, KRITIKLIK_SECENEKLERI),
    kritikAltyapiStatusu: ucDurumdan(f.kritikAltyapiStatusu),
    internetMaruziyeti: secimden(f.internetMaruziyeti, MARUZIYET_SECENEKLERI),
    uzaktanErisim: ucDurumdan(f.uzaktanErisim),
    otMimariTipi: secimden(f.otMimariTipi, OT_MIMARI_SECENEKLERI),
    dcsSaglayici: metinden(f.dcsSaglayici),
    scadaSaglayici: metinden(f.scadaSaglayici),
    plcAileleri: listeyiSakla(f.plcAileleri),
    iotVar: ucDurumdan(f.iotVar),
    akilliSayacVar: ucDurumdan(f.akilliSayacVar),
    yerelAdVar: ucDurumdan(f.yerelAdVar),
    yerelVeriMerkeziVar: ucDurumdan(f.yerelVeriMerkeziVar),
    grupOrtakServisler: listeyiSakla(f.grupOrtakServisler),
  };
}
