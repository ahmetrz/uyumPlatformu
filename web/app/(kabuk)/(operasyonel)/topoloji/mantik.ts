import type { Durum } from '@/components/kabuk/temel';

/* O12 · Topoloji sapma tezgâhı — saf türetme katmanı.

   Sunucu sayfası ham kaydı serileştirir, karar burada verilir; aynı kural
   hem metrikte hem tabloda hem çekmecede tek yerden okunur. Veritabanı,
   React ve `server-only` bağımlılığı YOKTUR — bu yüzden testten doğrudan
   çağrılabilir.

   Bu dosya `lib/entegrasyon/topoloji.ts` sözlüklerinin İSTEMCİ İKİZİdir:
   o modül `server-only` taşır ve istemci paketine giremez. İkizin sunucu
   ile aynı anahtar kümesini taşıdığı testle sabitlenir (tests/
   topoloji-tezgah.test.ts) — yoksa yarın sunucuya eklenen bir sapma tipi
   ekranda boş hücre olarak görünür ve kimse fark etmez.

   ─ EKRANIN SERT KURALI ──────────────────────────────────────────────────
   Ekran sapmayı ÖNERİ olarak sunar. "Kabul et / reddet / incelemeye al"
   kararını insan verir; hiçbir hesap, sıralama ya da eşik bir sapmayı
   kendiliğinden kapatmaz. `kararPasifMi` bu kuralın kod hâlidir. */

/* ═══ Sunucu sözlüklerinin ikizi ══════════════════════════════════════ */

export const SAPMA_TIP_ETIKETI: Record<string, string> = {
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

export const SIDDET_ETIKETI: Record<string, string> = {
  dusuk: 'Düşük', orta: 'Orta', yuksek: 'Yüksek', kritik: 'Kritik',
};

export const SIDDET_SIRASI: Record<string, number> = {
  kritik: 0, yuksek: 1, orta: 2, dusuk: 3,
};

/** Sapma durumunun sözcüğü — YALNIZ çekmece kimlik bloğunda kullanılır. */
export const SAPMA_DURUM_SOZU: Record<string, string> = {
  gozlendi: 'Gözlendi · karar bekliyor',
  inceleme: 'İncelemede',
  kabul: 'Kabul edildi',
  ret: 'Reddedildi · temel korundu',
};

export const ACIK_DURUMLAR = ['gozlendi', 'inceleme'];

/** Anlık kaynağı → insan sözü. Bilinmeyen kod OLDUĞU GİBİ gösterilir. */
export const KAYNAK_SOZU: Record<string, string> = {
  cmdb_kayit: 'Onaylı ağ kaydı (CMDB)',
  ot_discovery: 'OT keşif ürünü (pasif)',
  network_firewall: 'Güvenlik duvarı kural dışa aktarımı',
};

/* ═══ Serileştirilmiş kayıtlar ════════════════════════════════════════ */

export type SapmaSatiri = {
  id: string;
  tip: string;
  siddet: string;
  durum: string;
  aciklama: string;
  /** sapmanın konusu: öğe anahtarı — `oncekiJson`/`sonrakiJson` içinden gelir */
  anahtar: string | null;
  tesisId: string | null;
  tesisKodu: string | null;
  anlikId: string;
  anlikKaynak: string;
  anlikAlindi: string;
  olusturuldu: string;
  kararVeren: string | null;
  kararZamani: string | null;
  kararGerekcesi: string | null;
  /** kritik sapmanın risk/bulgu ADAYI var mı — kayıt AÇILMIŞ demek değildir */
  adayVar: boolean;
  uretilenRiskId: string | null;
  uretilenRiskKodu: string | null;
  uretilenBulguId: string | null;
  /** farkın iki yakası — çekmecede alan alan gösterilir */
  onceki: Record<string, unknown> | null;
  sonraki: Record<string, unknown> | null;
  /** kullanıcı BU sapma için karar verebilir mi (tesis kapsamı dâhil) */
  kararVerilebilir: boolean;
};

/** Anlığın karşılaştırma hâli — beşi de AYRI şeydir, hiçbiri ötekinin yerine geçmez. */
export type AnlikKarsilastirma =
  | 'temel'              // bu anlık yürürlükteki temel — kendisiyle karşılaştırılmaz
  | 'sapma'              // karşılaştırıldı, fark yazıldı
  | 'sapmasiz'           // karşılaştırıldı, fark çıkmadı
  | 'karsilastirilmadi'  // BİLİNMİYOR — "fark yok" DEĞİLDİR
  | 'temelsiz';          // tesisin onaylı temeli yok → karşılaştırma yapılamaz

export type AnlikSatiri = {
  id: string;
  tesisId: string | null;
  tesisKodu: string | null;
  kaynak: string;
  alindi: string;
  ozetHash: string;
  temelMi: boolean;
  onaylayan: string | null;
  onayZamani: string | null;
  not: string | null;
  ogeSayisi: number;
  sapmaSayisi: number;
  acikSapma: number;
  kritikSapma: number;
  /** bu anlık için yazılmış karşılaştırma izi (AktiviteKaydi) — yoksa null */
  karsilastirmaZamani: string | null;
  /** kapsamındaki tesisin onaylı temeli var mı */
  temelVar: boolean;
  temelOnaylanabilir: boolean;
  karsilastirilabilir: boolean;
};

/** Kapsamdaki bir tesisin (ya da tesissiz kümenin) temel durumu. */
export type TemelSatiri = {
  kapsamId: string;
  tesisId: string | null;
  tesisKodu: string;
  temelVar: boolean;
  temelAnlikId: string | null;
  temelAlindi: string | null;
  temelOnayZamani: string | null;
  temelKaynak: string | null;
  anlikSayisi: number;
  acikSapma: number;
};

/**
 * Karşılaştırma izi. `sonKarsilastirma === null` "hiç karşılaştırma
 * yapılmadı" demektir ve "sapma yok"tan FARKLIDIR — biri bilinmeyen,
 * öteki ölçülmüş sıfırdır.
 */
export type KarsilastirmaIzi = {
  sonKarsilastirma: string | null;
  /** son karşılaştırmayı ne tetikledi */
  tetikleyen: 'motor' | 'elle' | null;
  /** motorun en son ilerlettiği imleç (ISO) — anlık kapsamı bundan türetilir */
  motorImleci: string | null;
  /** motorun son koşusu ne dedi (kaynak_yok / temel_yok / basarili …) */
  motorDurumu: string | null;
  motorZamani: string | null;
};

/* ═══ Türetmeler ══════════════════════════════════════════════════════ */

export const acikMi = (s: SapmaSatiri): boolean => ACIK_DURUMLAR.includes(s.durum);

/**
 * Satır işaretçisi KARAR HÂLİNİ kodlar, şiddeti değil: şiddet kendi
 * kolonunda kelimeyle durur, işaretçinin yanında tekrar edilmez (durum
 * sözleşmesi). "gozlendi" → `unk`, çünkü o sapmaya henüz kimse bakmadı;
 * "değerlendirilmedi" tam da budur.
 */
export function sapmaImi(s: SapmaSatiri): Durum {
  if (s.durum === 'kabul') return 'ok';
  if (s.durum === 'ret') return 'pl';
  if (s.durum === 'inceleme') return 'md';
  return 'unk';
}

/** Seçili satırın sol kenarı: açık KRİTİK sapma listede kaybolmasın. */
export function sapmaKenari(s: SapmaSatiri): Durum {
  if (acikMi(s) && s.siddet === 'kritik') return 'bd';
  return sapmaImi(s);
}

export function anlikImi(a: AnlikSatiri): Durum {
  const hal = anlikKarsilastirmasi(a);
  if (hal === 'temel') return 'ok';
  if (hal === 'sapma') return a.kritikSapma > 0 ? 'bd' : 'md';
  if (hal === 'sapmasiz') return 'ok';
  return 'unk'; // karsilastirilmadi | temelsiz — ikisi de BİLİNMEYEN
}

/**
 * Anlığın karşılaştırma hâli.
 *
 * Sıra bilerek böyle: temel olmak karşılaştırmanın önündedir, sapma yazısı
 * da izin önündedir. En sonda "bilinmiyor" durur — çünkü kanıt yoksa
 * ekran "fark yok" DİYEMEZ. Ekranın ilk sürümünde bu ayrım yoktu ve
 * karşılaştırılmamış anlık, sapması olmadığı için temiz görünüyordu;
 * kullanıcının gördüğü sıfır aslında ölçülmemişti.
 */
export function anlikKarsilastirmasi(a: AnlikSatiri): AnlikKarsilastirma {
  if (a.temelMi) return 'temel';
  if (a.sapmaSayisi > 0) return 'sapma';
  if (!a.temelVar) return 'temelsiz';
  if (a.karsilastirmaZamani) return 'sapmasiz';
  return 'karsilastirilmadi';
}

/**
 * Bu anlık en son ne zaman karşılaştırıldı? Kanıt yoksa null — TAHMİN YOK.
 *
 * İki kanıt vardır:
 *  1. Elle karşılaştırmanın denetim izi (`izZamani`) — kaydı ekranın
 *     kendi eylemi yazar, anlığa birebir bağlıdır, tartışmasızdır.
 *  2. Motor imleci — motor işlediği son anlığın `alindi` damgasını imleç
 *     olarak yazar; imlecin gerisinde kalan anlıklar işlenmiştir.
 *
 * İkinci kanıt ŞARTLIDIR: motor, temeli olmayan kapsamın anlığını
 * hesaplamadan atlar ve o anlık imleci ilerletmez — ama aynı koşuda başka
 * bir kapsamın anlığı imleci onun ötesine taşıyabilir. Bu yüzden imleç
 * kanıtı yalnız TEMEL ANLIKTAN ÖNCE ONAYLANMIŞSA sayılır: o durumda anlık
 * alındığında temel zaten yürürlükteydi, yani motor onu atlayamazdı.
 * Aksi hâlde ekran "fark yok" demez, "karşılaştırılmadı" der — ölçülmemiş
 * bir sıfırı temiz göstermek bu ekranın yapabileceği en kötü hatadır.
 */
export function anlikKarsilastirmaZamani(girdi: {
  alindi: string;
  izZamani: string | null;
  temelVar: boolean;
  temelOnayZamani: string | null;
  motorImleci: string | null;
  motorZamani: string | null;
}): string | null {
  if (girdi.izZamani) return girdi.izZamani;
  if (!girdi.temelVar || !girdi.motorImleci || !girdi.motorZamani) return null;
  if (!girdi.temelOnayZamani || girdi.temelOnayZamani > girdi.alindi) return null;
  return girdi.alindi <= girdi.motorImleci ? girdi.motorZamani : null;
}

export const KARSILASTIRMA_SOZU: Record<AnlikKarsilastirma, string> = {
  temel: 'yürürlükteki temel',
  sapma: 'sapma yazıldı',
  sapmasiz: 'fark yok',
  karsilastirilmadi: 'karşılaştırılmadı',
  temelsiz: 'temel yok',
};

/** Tabloda kısa hâl — sapma sayısı da görünsün. */
export function karsilastirmaHucresi(a: AnlikSatiri): string {
  const hal = anlikKarsilastirmasi(a);
  return hal === 'sapma' ? `${a.sapmaSayisi} sapma` : KARSILASTIRMA_SOZU[hal];
}

/* ═══ İNSAN ONAYI — ekranın kilidi ════════════════════════════════════ */

/** Sunucu `sapmaKarari` ile aynı alt sınır; ekran sunucudan gevşek olamaz. */
export const GEREKCE_ASGARI = 10;

/**
 * Karar düğmesi neden pasif? Boş string = düğme etkin.
 *
 * Bu fonksiyon ekranın insan onayı sözleşmesidir ve dört kapıyı da tek
 * yerde tutar: kapalı sapmaya yeniden karar verilemez, yetkisiz kullanıcı
 * karar veremez, gerekçesiz (ya da yetersiz gerekçeli) karar verilemez,
 * süren istek varken ikinci karar gönderilemez.
 *
 * Sunucu (`lib/eylemler2/topoloji.ts → sapmaKararVer`) aynı kuralları
 * yeniden uygular — buradaki kontrol nezakettir, güvenlik sınırı değildir.
 * İkisi birden gevşetilmedikçe otomatik karar mümkün olmaz.
 */
export function kararPasifMi(girdi: {
  acik: boolean;
  yetkili: boolean;
  gerekce: string;
  bekliyor: boolean;
}): string {
  if (!girdi.acik) return 'Bu sapma zaten karara bağlanmış.';
  if (!girdi.yetkili) return 'Karar için envanter onay yetkisi gerekiyor.';
  if (girdi.gerekce.trim().length === 0) return 'Gerekçe zorunlu.';
  if (girdi.gerekce.trim().length < GEREKCE_ASGARI) {
    return `Gerekçe en az ${GEREKCE_ASGARI} karakter olmalı.`;
  }
  if (girdi.bekliyor) return 'Önceki karar gönderiliyor.';
  return '';
}

/* ═══ Filtre · sıralama · katlama ═════════════════════════════════════ */

export type Mercek = 'acik' | 'kritik' | 'inceleme' | 'karar' | 'hepsi';

export const MERCEKLER: { id: Mercek; ad: string }[] = [
  { id: 'acik', ad: 'Karar bekleyen' },
  { id: 'kritik', ad: 'Kritik' },
  { id: 'inceleme', ad: 'İncelemede' },
  { id: 'karar', ad: 'Karara bağlandı' },
  { id: 'hepsi', ad: 'Tümü' },
];

export function mercekten(s: SapmaSatiri, m: Mercek): boolean {
  switch (m) {
    case 'acik': return acikMi(s);
    case 'kritik': return s.siddet === 'kritik';
    case 'inceleme': return s.durum === 'inceleme';
    case 'karar': return !acikMi(s);
    default: return true;
  }
}

/** Yoğunluk sözleşmesi: 5–9 görünür satır, gerisi katlanmış kuyruğa iner. */
export const GORUNUR_TAVAN = 9;

/** Karara bağlanmış sapma kuyruğa inebilir; AÇIK sapma asla katlanmaz. */
export const toplanabilir = (s: SapmaSatiri): boolean => !acikMi(s);

export function sirala(satirlar: SapmaSatiri[]): SapmaSatiri[] {
  return [...satirlar].sort((a, b) =>
    Number(acikMi(b)) - Number(acikMi(a))
    || (SIDDET_SIRASI[a.siddet] ?? 9) - (SIDDET_SIRASI[b.siddet] ?? 9)
    || b.olusturuldu.localeCompare(a.olusturuldu));
}

export function anliklariSirala(satirlar: AnlikSatiri[]): AnlikSatiri[] {
  return [...satirlar].sort((a, b) =>
    Number(b.temelMi) - Number(a.temelMi) || b.alindi.localeCompare(a.alindi));
}

/* ═══ Metrikler ═══════════════════════════════════════════════════════ */

export type Sayim = {
  acik: number;
  kritikAcik: number;
  inceleme: number;
  /** anlığı olan ama onaylı temeli olmayan kapsam sayısı */
  temelsizKapsam: number;
  /** hiç anlığı olmayan kapsam sayısı — sıfır sapma DEĞİL, ölçüm yok */
  anliksizKapsam: number;
  /** karşılaştırılmamış anlık — "fark yok" sayılmaz */
  karsilastirilmamisAnlik: number;
  /** kayda dönüşmemiş kritik aday — kaydı insan açar */
  bekleyenAday: number;
};

/**
 * Sunucunun TAVANDAN BAĞIMSIZ saydığı açık/kritik sapma sayısı
 * (`lib/entegrasyon/topoloji.ts → topolojiOzeti`).
 *
 * Sapma listesi 200 satırda kesilir; metriği kesilmiş listeden saymak
 * 201. sapmayı BAŞLIKTAN da düşürürdü — ekran, gerçekte 30 kritik sapma
 * olan bir kapsam için "12 kritik" yazardı. Liste kesilir, SAYI KESİLMEZ.
 */
export type SunucuOzeti = { acikSapma: number; kritikAcik: number };

export function sayimHesapla(
  sapmalar: SapmaSatiri[], anliklar: AnlikSatiri[], temeller: TemelSatiri[],
  ozet: SunucuOzeti | null = null,
): Sayim {
  const acik = sapmalar.filter(acikMi);
  return {
    acik: ozet ? ozet.acikSapma : acik.length,
    kritikAcik: ozet ? ozet.kritikAcik : acik.filter((s) => s.siddet === 'kritik').length,
    inceleme: sapmalar.filter((s) => s.durum === 'inceleme').length,
    temelsizKapsam: temeller.filter((t) => !t.temelVar && t.anlikSayisi > 0).length,
    anliksizKapsam: temeller.filter((t) => t.anlikSayisi === 0).length,
    karsilastirilmamisAnlik:
      anliklar.filter((a) => anlikKarsilastirmasi(a) === 'karsilastirilmadi').length,
    bekleyenAday: acik.filter(
      (s) => s.adayVar && !s.uretilenRiskId && !s.uretilenBulguId).length,
  };
}

/**
 * Ekranın tek cümlelik hâli. Dört sonuç birbirinden AYRI:
 * ölçülmemiş · temelsiz · ölçülmüş sıfır · açık sapma.
 */
export function ekranHali(sayim: Sayim, iz: KarsilastirmaIzi, anlikVar: boolean): {
  vurgu?: string; metin: string; durum?: Durum;
} {
  if (sayim.kritikAcik > 0) {
    return { vurgu: `${sayim.kritikAcik} kritik sapma`, metin: 'karar bekliyor', durum: 'bd' };
  }
  if (sayim.acik > 0) {
    return { vurgu: `${sayim.acik} sapma`, metin: 'karar bekliyor', durum: 'md' };
  }
  if (!anlikVar) return { metin: 'Topoloji anlığı alınmadı', durum: 'unk' };
  if (sayim.temelsizKapsam > 0 && iz.sonKarsilastirma === null) {
    return {
      vurgu: `${sayim.temelsizKapsam} kapsamda`,
      metin: 'onaylı temel yok — sapma hesaplanmıyor',
      durum: 'unk',
    };
  }
  if (iz.sonKarsilastirma === null) {
    // Bilinmeyen ≠ sıfır: hiç karşılaştırılmadıysa "sapma yok" DENMEZ.
    return { metin: 'Karşılaştırma yapılmadı — sapma bilinmiyor', durum: 'unk' };
  }
  return { metin: 'Sapma yok', durum: 'ok' };
}

/* ═══ B8/B10 · Bölge–geçit diyagramı ═════════════════════════════════

   AgBolgesi / AgGeciti tanımları bugüne dek hiçbir ekranda ÇİZİLMİYORDU:
   sapma tezgâhı "bölge değişti / yeni geçit" diyordu ama kullanıcı o
   bölgenin nerede durduğunu, hangi geçitten geçtiğini göremiyordu.

   Bu bölüm tanımı Purdue katmanlarına yerleştirir. Yerleşim STATİKTİR
   (yüzde konum, animasyon yok) ve saf fonksiyondur: aynı girdi aynı
   resmi verir, test bunu sabitler.

   Sözleşme:
     · seviye 0 ALTTA, 4 ÜSTTE — akış yönü değil, Purdue hiyerarşisi;
     · seviyesi TANIMSIZ bölge ayrı bir bantta durur, 0 sayılmaz;
     · geçit yalnız iki ucu da çizilmişse kenar olur — düğümsüz kenar
       yoktur; düşen geçit SAYILIR ve dip notta yazılır;
     · kapsamı daraltılmış kullanıcıda tesissiz (grup) bölge yalnız
       kapsamdaki bir bölgeye geçidi varsa görünür. */

export const BOLGE_TIP_SOZU: Record<string, string> = {
  bt: 'BT ağı', ot: 'OT ağı', dmz: 'DMZ', ot_dmz: 'OT DMZ',
  kurumsal: 'Kurumsal ağ', internet: 'İnternet',
};

/** Tuvalde aynı anda çizilen bölge tavanı (168px kutu, 5 bant). */
export const BOLGE_TAVANI = 30;

export type BolgeSatiri = {
  id: string;
  kod: string;
  ad: string;
  tip: string;
  /** Purdue / IEC 62443 seviyesi — null TANIMSIZ demektir, sıfır değil */
  seviye: number | null;
  tesisId: string | null;
  tesisKodu: string | null;
  /** bölgeye bağlı, silinmemiş varlık sayısı */
  varlikSayisi: number;
};

/* ── OT-11 · Adresleme segmenti ───────────────────────────────────────
   Bölge bir GÜVENLİK sınırıdır (Purdue seviyesi, geçit kuralı); segment
   bir ADRESLEME birimidir (VLAN + CIDR). İkisini aynı kayda sıkıştırmak,
   tek bölgede yaşayan beş VLAN'ı tek satıra indirir ve "bu IP hangi
   segmentte" sorusu cevapsız kalırdı. */
export type SegmentSatiri = {
  id: string;
  kod: string;
  ad: string;
  bolgeId: string;
  bolgeKodu: string;
  tesisKodu: string | null;
  cidr: string;
  /** null = VLAN BİLİNMİYOR (VLAN yok değil). */
  vlanId: number | null;
  gatewayIp: string | null;
  /** null = bant dışı yönetim ağı olup olmadığı ölçülmedi. */
  yonetimAgi: boolean | null;
  aciklama: string | null;
  /** segmente atanmış, silinmemiş varlık sayısı */
  varlikSayisi: number;
  /** bu segment hakkında AÇIK veri kalitesi bulgusu sayısı (OT-44) */
  acikBulgu: number;
  /** bu kullanıcı segmenti düzenleyebilir mi (tanimlar/onay) */
  yazilabilir: boolean;
};

export type GecitSatiri = {
  id: string;
  kaynakBolgeId: string;
  hedefBolgeId: string;
  /** güvenlik duvarı / diyot varlık etiketi — null: kontrol kaydı yok */
  kontrolVarligi: string | null;
  protokoller: string | null;
  onaylandi: boolean;
  /** null = hiç doğrulanmadı (BİLİNMEYEN) */
  sonDogrulama: string | null;
  aciklama: string | null;
};

/* Tuval sözleşmesiyle yapısal olarak aynı; grafik bileşeni 'use client'
   olduğu için saf mantık ondan tip almaz (test React yüklemesin). */
export type BolgeDugumu = {
  id: string; ad: string; alt: string; x: number; y: number;
  durum?: Durum; ustEtiket?: string;
};
export type BolgeKenari = { kaynak: string; hedef: string; etiket?: string };

/** Kenarın ortasına yazılan protokol etiketi — Tuval kenar etiketi çizmez,
    ekran bunu üstüne bindirir. */
export type KenarEtiketi = {
  id: string; kaynak: string; hedef: string; x: number; y: number; metin: string;
};

export type BolgeKatmani = { seviye: number | null; ad: string; y: number };

export type BolgeGrafigi = {
  dugumler: BolgeDugumu[];
  kenarlar: BolgeKenari[];
  etiketler: KenarEtiketi[];
  katmanlar: BolgeKatmani[];
  /** çizilen bölge / verilen bölge */
  cizilen: number;
  toplam: number;
  /** bir ucu çizilmediği için düşen geçit sayısı */
  dusenGecit: number;
};

/**
 * Kapsam budaması. Kapsamı daraltılmış kullanıcının sorgusu tesissiz
 * (grup düzeyi) bölgeleri de getirir — çünkü "kurumsal ağ → OT DMZ"
 * geçidinin bir ucu tesissizdir ve düğümü olmayan kenar çizilemez. Ama
 * hiçbir kapsam bölgesine bağlanmayan tesissiz bölge o kullanıcıya
 * yabancıdır; listede durması kapsamı genişletmiş görünürdü.
 * Kapsamı sınırsız kullanıcıda budama yapılmaz.
 */
export function kapsamBolgeleri(
  bolgeler: BolgeSatiri[], gecitler: GecitSatiri[], daraltildi: boolean,
): { bolgeler: BolgeSatiri[]; gecitler: GecitSatiri[] } {
  if (!daraltildi) return { bolgeler, gecitler };
  const kapsamdaki = new Set(bolgeler.filter((b) => b.tesisId !== null).map((b) => b.id));
  const bagli = new Set<string>();
  for (const g of gecitler) {
    if (kapsamdaki.has(g.kaynakBolgeId)) bagli.add(g.hedefBolgeId);
    if (kapsamdaki.has(g.hedefBolgeId)) bagli.add(g.kaynakBolgeId);
  }
  const kalan = bolgeler.filter((b) => b.tesisId !== null || bagli.has(b.id));
  const kalanId = new Set(kalan.map((b) => b.id));
  return {
    bolgeler: kalan,
    gecitler: gecitler.filter((g) => kalanId.has(g.kaynakBolgeId) && kalanId.has(g.hedefBolgeId)),
  };
}

/** Bant içi yatay dağılım: uçlarda 168px kutuya pay bırakır. */
function yatayDagit(n: number): number[] {
  if (n <= 1) return [50];
  return Array.from({ length: n }, (_, i) => Math.round(14 + (i * 72) / (n - 1)));
}

/** Bantların dikey dağılımı: üstte SL4, altta SL0, en altta tanımsız. */
function dikeyDagit(n: number): number[] {
  if (n <= 1) return [50];
  return Array.from({ length: n }, (_, i) => Math.round(14 + (i * 72) / (n - 1)));
}

const seviyeSozu = (s: number | null) => (s === null ? 'SL tanımsız' : `SL${s}`);

/**
 * Bölge–geçit grafiği. Düğüm = bölge, kenar = geçit; bantlar Purdue
 * seviyesine göre dikey sıralanır. Sıralama ve tavan deterministiktir:
 * çok varlıklı bölge önce, sonra kod.
 */
export function bolgeGrafigiKur(girdi: {
  bolgeler: BolgeSatiri[];
  gecitler: GecitSatiri[];
  tavan?: number;
}): BolgeGrafigi {
  const tavan = girdi.tavan ?? BOLGE_TAVANI;
  const sirali = [...girdi.bolgeler].sort((a, b) =>
    b.varlikSayisi - a.varlikSayisi || a.kod.localeCompare(b.kod, 'tr'));
  const secilen = sirali.slice(0, tavan);

  /* Bantlar: tanımlı seviyeler büyükten küçüğe, tanımsız en altta ve
     AYRI — tanımsız bölgeyi SL0'a koymak, ölçülmemişi sıfır saymaktır. */
  const seviyeler = [...new Set(secilen.map((b) => b.seviye).filter((s): s is number => s !== null))]
    .sort((a, b) => b - a);
  const tanimsizVar = secilen.some((b) => b.seviye === null);
  const bantSeviyeleri: (number | null)[] = [...seviyeler, ...(tanimsizVar ? [null] : [])];
  const bantY = dikeyDagit(bantSeviyeleri.length);
  const katmanlar: BolgeKatmani[] = bantSeviyeleri.map((s, i) => ({
    seviye: s, ad: seviyeSozu(s), y: bantY[i],
  }));

  const dugumler: BolgeDugumu[] = [];
  bantSeviyeleri.forEach((s, i) => {
    const banttakiler = secilen
      .filter((b) => b.seviye === s)
      .sort((a, b) => a.kod.localeCompare(b.kod, 'tr'));
    const x = yatayDagit(banttakiler.length);
    banttakiler.forEach((b, j) => {
      dugumler.push({
        id: b.id,
        ad: b.ad,
        alt: `${b.tesisKodu ?? 'tesissiz'} · ${b.varlikSayisi} varlık`,
        x: x[j], y: bantY[i],
        ustEtiket: `${seviyeSozu(b.seviye)} · ${BOLGE_TIP_SOZU[b.tip] ?? b.tip}`,
        // Seviyesi bilinmeyen bölge işaretlenir: eksik tanım, düşük seviye değil.
        durum: b.seviye === null ? 'unk' : undefined,
      });
    });
  });

  const konum = new Map(dugumler.map((d) => [d.id, d]));
  const kenarlar: BolgeKenari[] = [];
  const etiketler: KenarEtiketi[] = [];
  let dusenGecit = 0;
  for (const g of girdi.gecitler) {
    const a = konum.get(g.kaynakBolgeId);
    const b = konum.get(g.hedefBolgeId);
    if (!a || !b) { dusenGecit += 1; continue; }
    const etiket = g.protokoller?.trim() || undefined;
    kenarlar.push({ kaynak: a.id, hedef: b.id, etiket });
    if (etiket) {
      etiketler.push({
        id: g.id, kaynak: a.id, hedef: b.id,
        x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2), metin: etiket,
      });
    }
  }

  return {
    dugumler, kenarlar, etiketler, katmanlar,
    cizilen: secilen.length, toplam: girdi.bolgeler.length, dusenGecit,
  };
}

/** Bir bölgenin geçitleri, yönüyle. Çekmecedeki liste bundan çizilir. */
export type BolgeGeciti = GecitSatiri & {
  yon: 'giden' | 'gelen';
  diger: BolgeSatiri | null;
};

export function bolgeninGecitleri(
  bolgeId: string, gecitler: GecitSatiri[], bolgeler: BolgeSatiri[],
): BolgeGeciti[] {
  const harita = new Map(bolgeler.map((b) => [b.id, b]));
  return gecitler
    .filter((g) => g.kaynakBolgeId === bolgeId || g.hedefBolgeId === bolgeId)
    .map((g) => {
      const giden = g.kaynakBolgeId === bolgeId;
      return {
        ...g,
        yon: giden ? 'giden' as const : 'gelen' as const,
        diger: harita.get(giden ? g.hedefBolgeId : g.kaynakBolgeId) ?? null,
      };
    })
    .sort((a, b) => Number(a.onaylandi) - Number(b.onaylandi)
      || (a.diger?.kod ?? '').localeCompare(b.diger?.kod ?? '', 'tr'));
}

/**
 * Bölgenin kimlik işareti — geçit ONAY hâlini kodlar. Geçidi olmayan
 * bölge "temiz" DEĞİL, bilinmeyendir: geçitsiz bir OT bölgesi ya
 * gerçekten yalıtılmıştır ya da geçidi henüz kayda girmemiştir; ekran
 * ikisini ayırt edemez ve öyle der.
 */
export function bolgeImi(gecitler: BolgeGeciti[]): { durum: Durum; soz: string } {
  if (gecitler.length === 0) return { durum: 'unk', soz: 'Geçit kaydı yok' };
  const onaysiz = gecitler.filter((g) => !g.onaylandi).length;
  if (onaysiz > 0) return { durum: 'md', soz: `${onaysiz} geçit onaysız` };
  const dogrulanmamis = gecitler.filter((g) => !g.sonDogrulama).length;
  if (dogrulanmamis > 0) {
    return { durum: 'unk', soz: `Onaylı · ${dogrulanmamis} geçit hiç doğrulanmadı` };
  }
  return { durum: 'ok', soz: 'Geçitleri onaylı ve doğrulanmış' };
}

/** Bölgeye daraltılmış envanter bağı. Süzgeç anahtarı bölge KODUdur. */
export const envanterBagi = (kod: string): string => `/envanter?bolge=${encodeURIComponent(kod)}`;
