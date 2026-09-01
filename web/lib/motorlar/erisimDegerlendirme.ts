import 'server-only';
import { db } from '../db';
import { zamanTR } from '../sabitler';
import { OTURUM_VARLIK_TIPI, oturumKaynagiBagliMi, type UcDegerAlan }
  from '../entegrasyon/tedarikciOturum';

/* ═══════════════════════════════════════════════════════════════════════
   ERİŞİM DEĞERLENDİRME MOTORU (`erisim_degerlendirme`)

   ── NE YAPAR ─────────────────────────────────────────────────────────
   Veritabanındaki `TedarikciErisimOturumu` KAYITLARINI okur, uzaktan
   erişim kontrol kurallarını işletir ve sonucu bir İŞ KUYRUĞUNA çevirir:
     · kanıtlı ihlal      → `Gorev` (tip 'erisim_incelemesi', otomatikUretildi)
     · ölçüm/ilişki boşluğu → `VeriKalitesiBulgusu`
     · yalnız KRİTİK sonuç → risk/bulgu ADAYI (kaydı insan açar)

   `lib/entegrasyon/tedarikciOturum.ts → uyumsuzOturumlar()` bir OKUMA
   raporudur: ekran açıldığı anda hesaplar, kapanınca unutur. Bu motor onun
   eksiğini kapatır — tespit kalıcı bir iş kalemine dönüşür, koşu izi
   bırakır ve sağlık ekranında görünür.

   ── NE YAPMAZ (ihlal edilemez sınır) ─────────────────────────────────
   Bu motor bir PAM / VPN / vendor-session ürünü DEĞİLDİR ve öyle bir
   sisteme BAĞLANMAZ. Şunların hiçbirini yapmaz:
     · oturum sonlandırmaz / kesmez     · erişim vermez, geri almaz
     · `TedarikciErisimOturumu` satırına DOKUNMAZ (tek update bile yok)
     · `Risk` ya da `Bulgu` KAYDI AÇMAZ, kapatmaz, kabul etmez
     · risk kabul etmez, bulgu durumu değiştirmez
   Akış: TESPİT → KORELASYON → ÖNERİ → İNSAN İNCELEMESİ.

   ── ÜÇ DEĞERLİ MANTIK (bu motorun omurgası) ──────────────────────────
   `onayli`, `mfaVar`, `izlendi` üç değerlidir:
     false → KANITLI İHLAL   → ihlal sayılır, puan alır, görev açılır
     null  → BİLİNMİYOR      → İHLAL SAYILMAZ; "ölçülmedi" sayacına girer
                               ve veri kalitesi bulgusu üretir
     true  → temiz
   Ölçülemeyen bir şeyi sıfır ya da düşük saymak YASAKTIR: "MFA'sı olmayan
   oturum" ile "MFA'sı olup olmadığını bilmediğimiz oturum" farklı iki
   sorundur ve farklı iki aksiyon gerektirir. Bu ayrım kritiklik
   çözümünde de geçerlidir (aşağıya bakınız).

   ── KAYIT YOKLUĞU ≠ İHLAL YOKLUĞU ────────────────────────────────────
   Tablo boşsa motor SESSİZCE BAŞARILI OLMAZ: `oturumKaynagiBagliMi()`
   false dönerse koşu `kaynak_yok` durumuyla kapanır ve gerekçesi
   `ayrinti` alanına yazılır. "Hiç oturum kaydı yok" ile "hiç ihlal yok"
   iki ayrı cümledir; ikincisini söylemek için önce görüyor olmak gerekir.
   Kaynak bağlı değilken AÇIK BULGU/GÖREV DE ÇÖZÜLMEZ: kaynağın susması
   ihlalin düzeldiği anlamına gelmez.
   ═══════════════════════════════════════════════════════════════════ */

/** Koşu defterindeki kaynak adı — `/saglik` ve `sonErisimKosusu()` bunu okur. */
export const KAYNAK = 'erisim_degerlendirme';

/** Bu motorun ürettiği görev tipi (şemadaki `Gorev.tip` sözlüğünde tanımlı). */
export const GOREV_TIPI = 'erisim_incelemesi';

/** Bu motora ait veri kalitesi kuralları. `veriKalitesi.ts` kuralları ile
    ADLARI ÇAKIŞMAZ: o motorun `KURALLAR` listesi kendi kurallarını
    kapsar, ikisi birbirinin bulgusunu çözmeye kalkmaz. */
export const ERISIM_KURALLARI = [
  'erisim_kontrolu_olculmedi',
  'erisim_kapsami_cozulemedi',
  'erisim_kritikligi_bilinmiyor',
  'erisim_sozlesme_kaydi_yok',
] as const;
export type ErisimKuralAdi = (typeof ERISIM_KURALLARI)[number];

/** Bir koşuda değerlendirilecek en fazla oturum. Sınır, uzun koşunun
    motor kilidini tutmasını engeller. Sınırın BEDELİ vardır ve bilinçli
    yönetilir: pencere dışında kalan oturumların açık görevleri bu koşuda
    ÇÖZÜLMEZ (aşağıdaki `degerlendirilenIdler` süzgeci) — görmediğimiz bir
    kaydın düzeldiğini iddia edemeyiz. */
export const KOSU_BASINA_OTURUM = 1000;

/** `suruyor` görünen bir oturum bu saatten sonra bayat sayılır: kaynak
    sistem oturumu kapatmayı raporlamamış ya da erişim gerçekten açık
    kalmış olabilir. İkisi de incelenmelidir. */
export const SUREN_BAYAT_SAAT = 24;

/** Tamamlanmış oturum bu süreyi aşarsa "anormal uzun" sayılır. Bakım
    penceresi tipik olarak bir vardiyadır; bunu aşan uzaktan erişim
    gerekçelendirilmelidir. */
export const ANORMAL_UZUN_SAAT = 12;

export type Siddet = 'dusuk' | 'orta' | 'yuksek' | 'kritik';
const SIDDET_MERDIVENI: Siddet[] = ['dusuk', 'orta', 'yuksek', 'kritik'];

export type Kritiklik = Siddet | 'bilinmiyor';

/** Tedarikçinin sözleşme kapsamı — ÜÇ DEĞERLİ, tıpkı kontrol alanları gibi. */
export type SozlesmeKapsami = 'kapsamda' | 'suresi_gecmis' | 'bilinmiyor';

/* ═══ 1 · Kritiklik çözümü ════════════════════════════════════════════ */

/**
 * Erişilen hedefin kritikliğini çözer: VARLIK → SİSTEM → SANTRAL sırasıyla.
 *
 * Sıra bilinçlidir: en dar kapsam en iyi bilgidir. Bir üst basamağa ancak
 * alttaki basamak ÖLÇÜLMEMİŞSE (`bilinmiyor`/null) inilir — yani
 * "bilinmiyor" bir cevap değil, bir sonraki kaynağa geçme sebebidir.
 *
 * `bilinmiyor` DÖNMEK, "düşük" dönmekten farklıdır ve öyle kullanılır
 * (bkz. `yukseltmeBasamagi`): ölçülmemiş kritiklik, ölçülene kadar düşük
 * SAYILMAZ.
 */
export function kritikligiCoz(hedef: {
  varlikKritikligi?: string | null;
  sistemKritikligi?: string | null;
  tesisKritikAltyapi?: boolean | null;
  tesisKritiklikSinifi?: string | null;
}): { seviye: Kritiklik; kaynak: 'varlik' | 'sistem' | 'tesis' | 'yok' } {
  const seviyele = (v: string | null | undefined): Siddet | null =>
    (v && (SIDDET_MERDIVENI as string[]).includes(v)) ? (v as Siddet) : null;

  const varlik = seviyele(hedef.varlikKritikligi);
  if (varlik) return { seviye: varlik, kaynak: 'varlik' };

  const sistem = seviyele(hedef.sistemKritikligi);
  if (sistem) return { seviye: sistem, kaynak: 'sistem' };

  /* Santral basamağı: `kritikAltyapiStatusu === true` doğrudan 'kritik'tir
     (kritik altyapı beyanı). `false` ise "kritik altyapı değil" demektir,
     "kritikliği düşük" DEMEK DEĞİLDİR — o yüzden sınıfa bakılır ve sınıf
     da yoksa 'bilinmiyor' kalır. */
  if (hedef.tesisKritikAltyapi === true) return { seviye: 'kritik', kaynak: 'tesis' };
  const tesis = seviyele(hedef.tesisKritiklikSinifi);
  if (tesis) return { seviye: tesis, kaynak: 'tesis' };

  return { seviye: 'bilinmiyor', kaynak: 'yok' };
}

/* ═══ 2 · Değerlendirme (SAF fonksiyon — veritabanına dokunmaz) ═══════ */

export type OturumGirdisi = {
  id: string;
  tedarikciAdi: string;
  tesisKodu: string | null;
  tesisId: string | null;
  varlikId: string | null;
  sistemId: string | null;
  baslangic: Date;
  bitis: Date | null;
  /** suruyor | tamamlandi | kesildi */
  durum: string;
  onayli: UcDegerAlan;
  mfaVar: UcDegerAlan;
  izlendi: UcDegerAlan;
  talepReferansi: string | null;
  kayitReferansi: string | null;
  kritiklik: Kritiklik;
  kritiklikKaynagi: 'varlik' | 'sistem' | 'tesis' | 'yok';
  sozlesmeKapsami: SozlesmeKapsami;
};

export type ErisimIhlali = { kural: string; puan: number; aciklama: string };
export type ErisimKaliteBulgusu = { kural: ErisimKuralAdi; aciklama: string };

export type ErisimSonucu = {
  oturumId: string;
  /** Kanıtlı ihlaller — YALNIZ `false` değerinden ve ölçülmüş olgudan doğar. */
  ihlaller: ErisimIhlali[];
  /** Ölçülmemiş alanlar (null). İHLAL DEĞİL; ayrı sayılır. */
  bilinmeyenler: string[];
  /** Erişim ihlaliyle KARIŞTIRILMAYAN veri kalitesi problemleri. */
  veriKalitesi: ErisimKaliteBulgusu[];
  /** Ham ihlal puanı (yükseltme öncesi). */
  puan: number;
  /** Puandan gelen taban şiddet; ihlal yoksa null. */
  temelSiddet: Siddet | null;
  /** Kritiklikten gelen basamak yükseltmesi (0, 1 ya da 2). */
  yukseltme: number;
  /** Nihai önem derecesi; ihlal yoksa null. */
  siddet: Siddet | null;
};

/* ── PUANLAMA GEREKÇESİ ────────────────────────────────────────────────
   Puan, ihlalin DENETLENEBİLİRLİĞE verdiği zarara göre verilir; ne kadar
   "kötü hissettirdiğine" göre değil:

     3 · onay yok      — erişim hiç yetkilendirilmemiş; kimin izin verdiği
                         sorusunun cevabı YOK.
     3 · izlenmemiş    — olay sonrası "kim ne yaptı" GERİYE DÖNÜK olarak
                         cevaplanamaz; kanıt kalıcı olarak kaybolmuştur.
     3 · sözleşme dışı — ticari/hukuki dayanağı bitmiş bir tarafın canlı
                         erişimi; hem uyum hem sözleşme ihlali.
     2 · MFA yok       — kimlik kanıtı zayıf ama erişim yine de bir hesaba
                         bağlı; onay/izleme kadar tam bir boşluk değil.
     2 · bayat 'suruyor' — kapandığı raporlanmamış erişim; süresi
                         belirsiz açık kapı.
     1 · anormal uzun  — tek başına ihlal değil, orantısızlık sinyali.
     1 · referans yok  — izlenebilirlik boşluğu; erişim geçerli olabilir
                         ama hangi talebe dayandığı gösterilemez.

   Taban şiddet: 1-2 düşük · 3-4 orta · 5-6 yüksek · 7+ kritik.
   Eşikler şöyle seçildi: TEK bir ağır ihlal (3) orta'dır — insan baksın
   ama alarm değil; İKİ ağır ihlal (6) yüksek'tir — kontrol yığını
   çökmüştür; üç ağır ihlal (9) kritiktir — erişim tamamen kör.       */
const PUANLAR = {
  onay_yok: 3,
  izlenmiyor: 3,
  sozlesme_disi: 3,
  mfa_yok: 2,
  bayat_suruyor: 2,
  anormal_uzun: 1,
  referans_yok: 1,
} as const;

function puandanSiddet(puan: number): Siddet | null {
  if (puan <= 0) return null;
  if (puan <= 2) return 'dusuk';
  if (puan <= 4) return 'orta';
  if (puan <= 6) return 'yuksek';
  return 'kritik';
}

/**
 * Kritikliğin şiddete kaç basamak eklediği.
 *
 * DEĞİŞMEZ: yalnız YÜKSELTİR, asla düşürmez. "Varlık düşük kritiklikte"
 * diye şiddeti indirmek, ihlali gizlemenin en kolay yoludur.
 *
 * `bilinmiyor` = `yuksek` ile AYNI basamağı alır (+1). Gerekçe: ölçülmemiş
 * kritiklik, ölçülene kadar düşük SAYILAMAZ; en güvenli varsayım "ölçseydik
 * yüksek çıkabilirdi"dir. Sıfır vermek, bilinmeyeni sessizce "düşük"e
 * çevirirdi — bu ürünün açıkça yasakladığı şey. `kritik` ise iki basamak
 * alır: kritik santral/varlığa zayıf kontrollü uzaktan erişim, bu motorun
 * tarif ettiği en ağır durumdur.
 *
 * Bilinmeyen aynı zamanda bir VERİ KALİTESİ bulgusu üretir (aşağıda):
 * yükseltme sorunu görünür kılar, veri kalitesi bulgusu ise ölçülmesini
 * ister. İkisi birlikte "bilinmeyeni cezalandır ama ölçmeyi de talep et"
 * demektir.
 */
export function yukseltmeBasamagi(kritiklik: Kritiklik): number {
  if (kritiklik === 'kritik') return 2;
  if (kritiklik === 'yuksek' || kritiklik === 'bilinmiyor') return 1;
  return 0; // orta / dusuk — yükseltme yok, DÜŞÜRME de yok
}

function basamakYukselt(siddet: Siddet, basamak: number): Siddet {
  const i = SIDDET_MERDIVENI.indexOf(siddet);
  return SIDDET_MERDIVENI[Math.min(i + basamak, SIDDET_MERDIVENI.length - 1)];
}

const saat = (ms: number) => ms / 3_600_000;

/**
 * Tek bir oturumu değerlendirir. SAF: hiçbir sorgu atmaz, hiçbir kayıt
 * yazmaz — bu yüzden testler kuralları veritabanı kurmadan sınayabilir.
 *
 * `simdi` dışarıdan verilir ki zamana bağlı kurallar (bayat `suruyor`,
 * anormal uzun oturum) testte deterministik olsun.
 */
export function oturumuDegerlendir(o: OturumGirdisi, simdi: Date = new Date()): ErisimSonucu {
  const ihlaller: ErisimIhlali[] = [];
  const bilinmeyenler: string[] = [];
  const veriKalitesi: ErisimKaliteBulgusu[] = [];

  /* ── Kural 1-3: üç değerli kontrol alanları ─────────────────────────
     `=== false` yazılması ZORUNLUDUR. `!o.onayli` yazmak null'ı da yakalar
     ve ölçülmemiş alanı ihlale çevirirdi — bu motorun temel hatası olurdu. */
  if (o.onayli === false)
    ihlaller.push({ kural: 'onay_yok', puan: PUANLAR.onay_yok,
      aciklama: 'Kaynak sistem oturumun ONAYSIZ olduğunu raporluyor — erişimi kimin '
        + 'yetkilendirdiği sorusunun cevabı yok.' });
  else if (o.onayli === null)
    bilinmeyenler.push('onay durumu kaynak sistemde raporlanmıyor');

  if (o.mfaVar === false)
    ihlaller.push({ kural: 'mfa_yok', puan: PUANLAR.mfa_yok,
      aciklama: 'Oturumda çok faktörlü doğrulama kullanılmamış — kimlik kanıtı tek '
        + 'faktöre dayanıyor.' });
  else if (o.mfaVar === null)
    bilinmeyenler.push('MFA kullanılıp kullanılmadığı raporlanmıyor');

  if (o.izlendi === false)
    ihlaller.push({ kural: 'izlenmiyor', puan: PUANLAR.izlenmiyor,
      aciklama: 'Oturum izlenmemiş / kaydı alınmamış — geriye dönük "kim ne yaptı" '
        + 'gösterilemez.' });
  else if (o.izlendi === null)
    bilinmeyenler.push('oturumun izlenip izlenmediği raporlanmıyor');

  /* Ölçülmemiş alan İHLAL DEĞİL ama SESSİZ de değil: ayrı bir veri kalitesi
     bulgusu olur. Aksi hâlde "hiç ihlal yok" cümlesi, aslında hiçbir şeyin
     ölçülmediği bir oturum için de kurulabilirdi. */
  if (bilinmeyenler.length > 0)
    veriKalitesi.push({ kural: 'erisim_kontrolu_olculmedi',
      aciklama: `${o.tedarikciAdi} oturumunda ${bilinmeyenler.length} kontrol alanı `
        + `ÖLÇÜLMEMİŞ (${bilinmeyenler.join('; ')}). Bu bir ihlal değil, bir ölçüm `
        + 'boşluğudur: kaynak sistem bu alanları raporlamıyor.' });

  /* ── Kural 4: sözleşme/destek kapsamı dışı AKTİF erişim ─────────────
     `bilinmiyor` burada da ihlal SAYILMAZ; tedarikçinin hiç sözleşme kaydı
     yoksa kapsam ölçülememiştir, "kapsam dışı" değildir. */
  if (o.sozlesmeKapsami === 'suresi_gecmis')
    ihlaller.push({ kural: 'sozlesme_disi', puan: PUANLAR.sozlesme_disi,
      aciklama: `${o.tedarikciAdi} tedarikçisinin bilinen tüm sözleşmelerinin süresi `
        + 'oturum başladığında GEÇMİŞTİ — dayanağı bitmiş bir tarafın erişimi.' });
  else if (o.sozlesmeKapsami === 'bilinmiyor')
    veriKalitesi.push({ kural: 'erisim_sozlesme_kaydi_yok',
      aciklama: `${o.tedarikciAdi} tedarikçisinin sözleşme kaydı yok ya da bitiş `
        + 'tarihi boş; erişimin sözleşme kapsamında olup olmadığı ÖLÇÜLEMİYOR. '
        + '"Kapsam dışı" DEĞİL, "kapsamı bilinmiyor".' });

  /* ── Kural 5: izlenebilirlik boşluğu ─────────────────────────────────
     Tek başına düşük puanlıdır: erişim tamamen meşru olup yalnız referansı
     eksik olabilir. Yine de sessiz geçilmez — denetimde "hangi talebe
     dayanıyordu?" sorusunun cevabı budur. */
  const talep = o.talepReferansi?.trim();
  const kayit = o.kayitReferansi?.trim();
  if (!talep && !kayit)
    ihlaller.push({ kural: 'referans_yok', puan: PUANLAR.referans_yok,
      aciklama: 'Oturuma bağlı talep ya da değişiklik referansı yok — erişimin hangi '
        + 'işe dayandığı izlenemez.' });

  /* ── Kural 7: bayat `suruyor` / anormal uzun oturum ──────────────────
     İkisi AYRI kuraldır ve aynı oturumda ikisi birden olamaz: biri hâlâ
     açık görünen, diğeri kapanmış ama uzun süren oturumu ölçer. */
  if (o.durum === 'suruyor') {
    const gecen = saat(simdi.getTime() - o.baslangic.getTime());
    if (gecen > SUREN_BAYAT_SAAT)
      ihlaller.push({ kural: 'bayat_suruyor', puan: PUANLAR.bayat_suruyor,
        aciklama: `Oturum ${Math.round(gecen)} saattir hâlâ "sürüyor" görünüyor `
          + `(eşik ${SUREN_BAYAT_SAAT} saat). Kaynak kapanışı raporlamamış ya da `
          + 'erişim gerçekten açık kalmış olabilir.' });
  } else if (o.bitis) {
    const sure = saat(o.bitis.getTime() - o.baslangic.getTime());
    if (sure > ANORMAL_UZUN_SAAT)
      ihlaller.push({ kural: 'anormal_uzun', puan: PUANLAR.anormal_uzun,
        aciklama: `Oturum ${Math.round(sure)} saat sürmüş (eşik ${ANORMAL_UZUN_SAAT} `
          + 'saat) — tipik bakım penceresinin dışında.' });
  }

  /* ── Kural 8: ilişki çözülemiyor → VERİ KALİTESİ, erişim ihlali DEĞİL
     İkisini karıştırmak, envanterdeki bir eksiği tedarikçinin suçu gibi
     gösterirdi. Kapsamı çözülemeyen oturum ayrıca yetki süzgecinden de
     geçemez; bu yüzden görünmezleşmeden önce bulgu olur. */
  if (!o.varlikId && !o.sistemId && !o.tesisId)
    veriKalitesi.push({ kural: 'erisim_kapsami_cozulemedi',
      aciklama: `${o.tedarikciAdi} oturumunun varlık/sistem/santral bağı ÇÖZÜLEMEDİ. `
        + 'Bu bir erişim ihlali değil, bir envanter/eşleme boşluğudur: kapsam '
        + 'süzgecinden geçemediği için kısıtlı yetkili hiç kimse göremez.' });

  /* ── Kural 6: kritiklik yükseltmesi ─────────────────────────────────── */
  if (o.kritiklik === 'bilinmiyor')
    veriKalitesi.push({ kural: 'erisim_kritikligi_bilinmiyor',
      aciklama: `${o.tedarikciAdi} oturumunun eriştiği hedefin kritikliği ölçülmemiş. `
        + 'Değerlendirme onu DÜŞÜK saymaz; yüksek gibi ele alır ve ölçülmesini ister.' });

  const puan = ihlaller.reduce((t, i) => t + i.puan, 0);
  const temelSiddet = puandanSiddet(puan);
  const yukseltme = yukseltmeBasamagi(o.kritiklik);

  return {
    oturumId: o.id,
    ihlaller, bilinmeyenler, veriKalitesi,
    puan, temelSiddet, yukseltme,
    siddet: temelSiddet ? basamakYukselt(temelSiddet, yukseltme) : null,
  };
}

/* ═══ 3 · Risk / bulgu ADAYI ══════════════════════════════════════════ */

/**
 * Kritik sonuç bir risk/bulgu ADAYI üretir — kaydı AÇMAZ.
 *
 * `lib/entegrasyon/topoloji.ts → sapmaAdayi` ile aynı disiplin: motor
 * öneri seviyesinde durur, `Risk`/`Bulgu` satırını insan açar. Bu üründe
 * aday ile kayıt arasındaki bağ `TopolojiSapmasi.uretilenRiskId` gibi bir
 * kolonda yaşar; `TedarikciErisimOturumu` şemasında böyle bir kolon YOK
 * ve şemaya dokunmuyoruz — bu yüzden aday burada TÜRETİLİR (saklanmaz) ve
 * insanın açtığı kayıtla eşleştirme bugün mümkün değildir. Sonuç: motor
 * hiçbir koşulda `Risk`/`Bulgu` yazmaz; aday yalnız bir öneri nesnesidir.
 *
 * Yalnız 'kritik' aday üretir: her ihlali aday yapmak risk kütüğünü
 * otomatik gürültüyle doldurur ve insan kararını değersizleştirir.
 */
export type ErisimAdayi = {
  baslik: string;
  gerekce: string;
  onemDerecesi: Siddet;
  kaynak: typeof KAYNAK;
  /** Oturum kimliği — kayıt DEĞİL, kaynağa işaret. */
  kaynakRef: string;
  tesisId: string | null;
};

export function erisimAdayi(o: OturumGirdisi, sonuc: ErisimSonucu): ErisimAdayi | null {
  if (sonuc.siddet !== 'kritik') return null;
  return {
    baslik: `Tedarikçi uzaktan erişimi: ${o.tedarikciAdi}`
      + (o.tesisKodu ? ` · ${o.tesisKodu}` : ''),
    gerekce: `${zamanTR(o.baslangic)} oturumunda kanıtlı ihlaller: `
      + `${sonuc.ihlaller.map((i) => i.aciklama).join(' ')} `
      + `Hedef kritikliği: ${o.kritiklik}. `
      + 'Motor hiçbir oturumu sonlandırmadı, hiçbir kaydı değiştirmedi; '
      + 'risk/bulgu kaydı açma kararı insana aittir.',
    onemDerecesi: 'kritik',
    kaynak: KAYNAK,
    kaynakRef: o.id,
    tesisId: o.tesisId,
  };
}

/* ═══ 4 · Veri okuma ══════════════════════════════════════════════════ */

/** Tedarikçinin sözleşme kapsamı — ÜÇ DEĞERLİ.
    · en az bir sözleşme oturum başlangıcında geçerliyse → 'kapsamda'
    · bitişi BOŞ bir sözleşme varsa → 'kapsamda' (süresiz/bilinmeyen bitiş
      "geçmiş" değildir; bitmediğini varsaymak güvenli taraftır)
    · hiç sözleşme yoksa → 'bilinmiyor' (kapsam dışı DEĞİL)
    · tüm sözleşmelerin bitişi oturum başlangıcından önceyse → 'suresi_gecmis' */
function sozlesmeKapsamiCoz(
  sozlesmeler: { bitis: Date | null }[], oturumBaslangici: Date,
): SozlesmeKapsami {
  if (sozlesmeler.length === 0) return 'bilinmiyor';
  const gecerli = sozlesmeler.some(
    (s) => s.bitis === null || s.bitis.getTime() >= oturumBaslangici.getTime());
  return gecerli ? 'kapsamda' : 'suresi_gecmis';
}

async function girdileriTopla(simdi: Date): Promise<OturumGirdisi[]> {
  const satirlar = await db.tedarikciErisimOturumu.findMany({
    orderBy: { baslangic: 'desc' },
    take: KOSU_BASINA_OTURUM,
    include: {
      tedarikci: { select: {
        ad: true,
        sozlesmeler: { where: { silindi: null }, select: { bitis: true } },
      } },
      tesis: { select: { kod: true,
        profil: { select: { kritikAltyapiStatusu: true, kritiklikSinifi: true } } } },
      varlik: { select: { kritiklik: true } },
      sistem: { select: { kritiklik: true } },
    },
  });

  return satirlar.map((s) => {
    const k = kritikligiCoz({
      varlikKritikligi: s.varlik?.kritiklik ?? null,
      sistemKritikligi: s.sistem?.kritiklik ?? null,
      tesisKritikAltyapi: s.tesis?.profil?.kritikAltyapiStatusu ?? null,
      tesisKritiklikSinifi: s.tesis?.profil?.kritiklikSinifi ?? null,
    });
    return {
      id: s.id,
      tedarikciAdi: s.tedarikci.ad,
      tesisKodu: s.tesis?.kod ?? null,
      tesisId: s.tesisId,
      varlikId: s.varlikId,
      sistemId: s.sistemId,
      baslangic: s.baslangic,
      bitis: s.bitis,
      durum: s.durum,
      onayli: s.onayli, mfaVar: s.mfaVar, izlendi: s.izlendi,
      talepReferansi: s.talepReferansi, kayitReferansi: s.kayitReferansi,
      kritiklik: k.seviye,
      kritiklikKaynagi: k.kaynak,
      /* Sözleşme kapsamı OTURUM BAŞLANGICINA göre ölçülür, bugüne göre
         değil: geçen yıl sözleşme yürürlükteyken yapılan bir erişim,
         sözleşme bu yıl bittiği için geriye dönük ihlal olmaz. `simdi`
         yalnız süren oturumun bayatlığında kullanılır. */
      sozlesmeKapsami: sozlesmeKapsamiCoz(
        s.tedarikci.sozlesmeler,
        s.durum === 'suruyor' ? simdi : s.baslangic,
      ),
    };
  });
}

/* ═══ 5 · Motor ═══════════════════════════════════════════════════════ */

const gorevBasligi = (o: OturumGirdisi, s: ErisimSonucu) =>
  `Erişim incelemesi (${s.siddet}): ${o.tedarikciAdi}`
  + (o.tesisKodu ? ` · ${o.tesisKodu}` : '')
  + ` · ${s.ihlaller.map((i) => i.kural).join(', ')}`;

const kaliteAnahtari = (b: { kural: string; kaynakId: string }) => `${b.kural}|${b.kaynakId}`;

/**
 * `erisim_degerlendirme` motoru.
 *
 * Sözleşme: `Promise<{ islenen, uretilen }>` döner, `isKos` ile sarmalanır.
 * `islenen` = değerlendirilen oturum sayısı, `uretilen` = bu koşuda AÇILAN
 * yeni görev + veri kalitesi bulgusu sayısı (kapatılanlar sayılmaz).
 *
 * İDEMPOTENT: aynı oturum için açık bir görev/bulgu varsa yenisi
 * ÜRETİLMEZ; koşul düzelmişse açık kayıt çözülür (aşağıdaki sınırlarla).
 */
export async function erisimleriDegerlendir(): Promise<{ islenen: number; uretilen: number }> {
  const basla = Date.now();
  const simdi = new Date();

  const kosu = await db.entegrasyonKosusu.create({
    data: { kaynak: KAYNAK, durum: 'calisiyor', tetikleyen: 'zamanlanmis',
      guvenEtiketi: 'otomatik' },
  });

  try {
    /* ── Kaynak bağlı mı? ───────────────────────────────────────────────
       "Kayıt yok" ile "ihlal yok" AYRI ŞEYLERDİR. Tablo boşken motor
       sessizce 'basarili' kapanırsa, sağlık ekranı bunu "erişim tarafı
       temiz" diye okur — oysa hiçbir şey görmüyoruz.

       Bu dalda AÇIK GÖREV/BULGU DA ÇÖZÜLMEZ: kaynağın susması, daha önce
       tespit edilmiş ihlalin düzeldiği anlamına gelmez. Kaynak kesilince
       kuyruğun kendiliğinden boşalması, sorunu görünmez kılmanın en sinsi
       yolu olurdu. */
    if (!(await oturumKaynagiBagliMi())) {
      await db.entegrasyonKosusu.update({
        where: { id: kosu.id },
        data: {
          durum: 'kaynak_yok',
          bitis: new Date(), sureMs: Date.now() - basla,
          // `hata` BOŞ bırakılır: kaynak yokluğu bir başarısızlık değil, bir durumdur.
          ayrinti: 'Hiçbir PAM/VPN/jump-host kaynağından oturum kaydı akmıyor '
            + '(TedarikciErisimOturumu tablosu boş). Bu "ihlal yok" DEMEK DEĞİLDİR: '
            + 'tedarikçiler pekâlâ bağlanmış olabilir, biz göremiyoruz. Daha önce '
            + 'açılmış görev ve veri kalitesi bulguları da bu koşuda ÇÖZÜLMEDİ — '
            + 'kaynağın susması ihlalin düzelmesi değildir.',
        },
      });
      return { islenen: 0, uretilen: 0 };
    }

    const girdiler = await girdileriTopla(simdi);
    const degerlendirilenIdler = girdiler.map((g) => g.id);

    /* Mevcut açık kayıtlar — YALNIZ bu motorun ürettikleri.
       · Görevde `otomatikUretildi: true` şartı ZORUNLU: insanın
         `lib/eylemler2/tedarikciOturum.ts` üzerinden açtığı
         'erisim_incelemesi' görevlerine motor DOKUNMAZ.
       · `durum: 'acik'` şartı da zorunlu: 'yapiliyor' bir görevi insan
         eline almıştır; onu iptal etmek insanın işini silmek olurdu. */
    const acikGorevler = await db.gorev.findMany({
      where: {
        tip: GOREV_TIPI, kaynakTipi: OTURUM_VARLIK_TIPI, otomatikUretildi: true,
        durum: 'acik', kaynakId: { in: degerlendirilenIdler },
      },
      select: { id: true, kaynakId: true, baslik: true },
    });
    const acikKalite = await db.veriKalitesiBulgusu.findMany({
      where: {
        durum: 'acik', kural: { in: [...ERISIM_KURALLARI] },
        kaynakTipi: OTURUM_VARLIK_TIPI, kaynakId: { in: degerlendirilenIdler },
      },
      select: { id: true, kural: true, kaynakId: true },
    });

    const gorevHaritasi = new Map(acikGorevler.map((g) => [g.kaynakId ?? '', g]));
    const kaliteKumesi = new Set(acikKalite.map(kaliteAnahtari));

    const istenenGorevler = new Set<string>();
    const istenenKalite = new Set<string>();
    let uretilen = 0;
    let ihlalliOturum = 0;
    let olculmeyenAlan = 0;
    let kritikAday = 0;

    for (const g of girdiler) {
      const s = oturumuDegerlendir(g, simdi);
      olculmeyenAlan += s.bilinmeyenler.length;

      if (s.ihlaller.length > 0 && s.siddet) {
        ihlalliOturum++;
        if (erisimAdayi(g, s)) kritikAday++;
        istenenGorevler.add(g.id);
        const mevcut = gorevHaritasi.get(g.id);
        const baslik = gorevBasligi(g, s);
        if (!mevcut) {
          /* GÖREV açılır — oturum satırına DOKUNULMAZ, hiçbir Risk/Bulgu
             yazılmaz. `sonTarih` bilerek boş: motorun uyduracağı bir hedef
             tarih, ölçülmemiş bir taahhüttür; tarihi insan koyar.
             `sorumluId` de boş: erişim sahibini motor bilemez. */
          await db.gorev.create({ data: {
            baslik,
            tip: GOREV_TIPI,
            kaynakTipi: OTURUM_VARLIK_TIPI,
            kaynakId: g.id,
            tesisId: g.tesisId,
            otomatikUretildi: true,
          } });
          uretilen++;
        } else if (mevcut.baslik !== baslik) {
          /* Şiddet/ihlal listesi değişmiş (kaynak sistem alanı güncellemiş).
             Yalnız BAŞLIK tazelenir; `durum` ve `sorumluId` ASLA
             değiştirilmez — görevin sahipliği insanındır. */
          await db.gorev.update({ where: { id: mevcut.id }, data: { baslik } });
        }
      }

      for (const vk of s.veriKalitesi) {
        const anahtar = `${vk.kural}|${g.id}`;
        istenenKalite.add(anahtar);
        if (kaliteKumesi.has(anahtar)) continue;
        await db.veriKalitesiBulgusu.create({ data: {
          kural: vk.kural, kaynakTipi: OTURUM_VARLIK_TIPI, kaynakId: g.id,
          aciklama: vk.aciklama,
        } });
        uretilen++;
      }
    }

    /* ── Koşul düzelince kapanış (veriKalitesi.ts kalıbı) ───────────────
       YALNIZ bu koşuda GERÇEKTEN değerlendirilmiş oturumlar için. Pencere
       (`KOSU_BASINA_OTURUM`) dışında kalan kayıtların görevleri sabit
       kalır: bakmadığımız bir oturumun düzeldiğini iddia edemeyiz. */
    let cozulen = 0;
    for (const gorev of acikGorevler) {
      if (gorev.kaynakId && istenenGorevler.has(gorev.kaynakId)) continue;
      /* İhlal artık yok → otomatik açılmış ve HÂLÂ 'acik' olan görev iptal
         edilir. Bu bir `Bulgu`/`Risk` kapatma DEĞİLDİR: motorun kendi
         açtığı, kimsenin eline almadığı iş kalemini geri almasıdır. */
      await db.gorev.update({ where: { id: gorev.id },
        data: { durum: 'iptal', kapanis: new Date() } });
      cozulen++;
    }
    for (const b of acikKalite) {
      if (istenenKalite.has(kaliteAnahtari(b))) continue;
      await db.veriKalitesiBulgusu.update({ where: { id: b.id },
        data: { durum: 'cozuldu', kapanis: new Date() } });
      cozulen++;
    }

    await db.entegrasyonKosusu.update({
      where: { id: kosu.id },
      data: {
        durum: 'basarili',
        bitis: new Date(), sureMs: Date.now() - basla,
        alinan: girdiler.length,
        kabulEdilen: ihlalliOturum,
        kayitSayisi: uretilen,
        ayrinti: `${girdiler.length} oturum değerlendirildi · ${ihlalliOturum} oturumda `
          + `kanıtlı ihlal · ${kritikAday} kritik risk/bulgu ADAYI (kayıt AÇILMADI) · `
          + `${olculmeyenAlan} kontrol alanı ÖLÇÜLMEMİŞ (ihlal sayılmadı) · `
          + `${cozulen} açık kayıt koşul düzeldiği için kapandı.`,
      },
    });

    return { islenen: girdiler.length, uretilen };
  } catch (e) {
    // Sessiz hata yasak: koşu kaydı hatayı taşır, sonra `isKos` da IsKosusu'na yazsın.
    await db.entegrasyonKosusu.update({
      where: { id: kosu.id },
      data: {
        durum: 'basarisiz', bitis: new Date(), sureMs: Date.now() - basla,
        hata: e instanceof Error ? e.message : String(e),
      },
    });
    throw e;
  }
}

/* ═══ 6 · Okuma yüzeyleri ═════════════════════════════════════════════ */

/** Sağlık ekranı / teşhis için: bu motorun son koşusu ne dedi? */
export async function sonErisimKosusu() {
  return db.entegrasyonKosusu.findFirst({
    where: { kaynak: KAYNAK }, orderBy: { baslangic: 'desc' },
  });
}

/**
 * Kayda dönüşmemiş KRİTİK adaylar — ekran "aday" kuyruğunu buradan okur.
 * Hiçbir şey yazmaz; her çağrıda yeniden hesaplanır.
 */
export async function bekleyenErisimAdaylari(
  simdi: Date = new Date(),
): Promise<ErisimAdayi[]> {
  const girdiler = await girdileriTopla(simdi);
  return girdiler
    .map((g) => erisimAdayi(g, oturumuDegerlendir(g, simdi)))
    .filter((a): a is ErisimAdayi => a !== null);
}
