/* ═══════════════════════════════════════════════════════════════════════
   KURGUSAL ADLAR — kuruluş, üretici, denetleyici ve kişi adlarının
   TEK KAYNAĞI

   ── DOĞURAN KUSUR (ölçüldü · 8 Eylül 2026) ────────────────────────────
   Tohumda on sekiz GERÇEK şirket adı vardı ve bazılarına uydurma
   güvenlik zafiyeti bağlıydı: bir firma için "uzaktan erişimi var,
   oturum kaydı YOK, kritiklik kritik". Depo public, sayfa yayında ve
   demo dışarıya gösteriliyor — yani gerçek firmalar hakkında gerçekmiş
   gibi okunacak olumsuz bir iddia. Kusur main'e girdi ve yayına çıktı.

   Ürünün kendi kuralı zaten bunu yasaklıyordu (`CLAUDE.md` →
   "Depodaki veri kurgusaldır"), ama kuralı tutan bir şey yoktu.

   ── NİÇİN KARA LİSTE DEĞİL ────────────────────────────────────────────
   "Siemens · ABB · Cisco…" diye bir yasak liste, BİLİNEN kötü örnekleri
   yakalar; yarın eklenecek on dokuzuncu gerçek adı yakalamaz. Kapı bu
   yüzden tersten kurulur: ad KAYNAĞI tektir ve bu dosyadır. Veritabanına
   buradan gelmeyen bir kuruluş adı düşerse bekçi kırmızı yanar
   (`tests/bekci/kurgusal-adlar.test.ts`).

   ── GERÇEKÇİLİK KATEGORİYLE KORUNUR, MARKAYLA DEĞİL ───────────────────
   Demo inandırıcı olmalı ama inandırıcılık markadan gelmez: bir OT
   sağlayıcısının ekranda ne yaptığı, adının tanınması değil TİPİ ve
   erişim biçimidir. Adlar bu yüzden kategoriyi söyler ("Demo Türbin
   Sistemleri"), markayı değil.

   ── YENİ AD EKLERKEN ──────────────────────────────────────────────────
   Buraya ekleyin. Tohuma doğrudan yazılan bir ad, bekçiyi kırmızı
   yakar — bilerek.
   ═══════════════════════════════════════════════════════════════════════ */

/** Bir kurgusal kuruluş: adı ve NE İŞ YAPTIĞI. */
export type KurgusalKurulus = { ad: string; kategori: string };

/* Tedarikçiler — enerji portföyünün karşı tarafı. Kategoriler gerçek
   bir tedarikçi tabanının şeklini korur: OT sağlayıcı, donanım,
   yazılım, hizmet. */
export const TEDARIKCILER: KurgusalKurulus[] = [
  { ad: 'Demo Türbin Sistemleri', kategori: 'Türbin ve DCS sağlayıcısı' },
  { ad: 'Demo Jeotermal Teknoloji', kategori: 'Jeotermal ünite sağlayıcısı' },
  { ad: 'Demo Enerji Ekipmanları', kategori: 'Üretim ekipmanı sağlayıcısı' },
  { ad: 'Demo Rüzgâr Türbini', kategori: 'Rüzgâr türbini üreticisi' },
  { ad: 'Demo Rüzgâr Sistemleri', kategori: 'Rüzgâr kontrol sistemleri' },
  { ad: 'Demo Hidro Türbin', kategori: 'Hidroelektrik türbin sağlayıcısı' },
  { ad: 'Demo Hidro Ekipman', kategori: 'Hidroelektrik ekipman sağlayıcısı' },
  { ad: 'Demo Elektrik Ekipmanları', kategori: 'Elektrik donanımı üreticisi' },
  { ad: 'Demo Güç Otomasyonu', kategori: 'Güç otomasyonu ve koruma' },
  { ad: 'Demo Proses Otomasyonu', kategori: 'Proses kontrol sistemleri' },
  { ad: 'Demo Ölçüm Sistemleri', kategori: 'Saha ölçüm ve enstrümantasyon' },
  { ad: 'Demo Ağ Donanımı', kategori: 'Kurumsal ağ donanımı' },
  { ad: 'Demo Ağ Güvenliği', kategori: 'Güvenlik duvarı ve ağ güvenliği' },
  { ad: 'Demo İşletim Sistemleri', kategori: 'İşletim sistemi ve ofis yazılımı' },
  { ad: 'Demo Sanallaştırma', kategori: 'Sanallaştırma platformu' },
  { ad: 'Demo Telekom Altyapı', kategori: 'Sabit hat ve veri hattı' },
  { ad: 'Demo Mobil Operatör', kategori: 'Mobil veri ve M2M' },
  { ad: 'Demo Ulusal Test Merkezi', kategori: 'Bağımsız test ve değerlendirme' },
  /* Su portföyünün tedarikçileri. */
  { ad: 'Demo Otomasyon Sistemleri', kategori: 'Su otomasyonu ve SCADA' },
  { ad: 'Demo Laboratuvar Hizmetleri', kategori: 'Numune analizi' },
  { ad: 'Demo Pompa ve Ekipman', kategori: 'Pompa ve mekanik ekipman' },
];

/* Varlık üreticileri — envanterdeki `Varlik.uretici` alanı. Nötr bir
   envanter satırındaki üretici adı da GERÇEK OLMAMALI: satır bugün
   nötr, yarın bir zafiyet kaydına bağlanır. */
export const URETICILER: KurgusalKurulus[] = TEDARIKCILER.filter((x) => ![
  'Demo Laboratuvar Hizmetleri', 'Demo Ulusal Test Merkezi',
  'Demo Telekom Altyapı', 'Demo Mobil Operatör',
].includes(x.ad)).concat([
  { ad: 'Demo Sunucu Donanımı', kategori: 'Sunucu ve istemci donanımı' },
  /* Yalnız ENVANTERDE geçen üreticiler: sözleşmeli tedarikçi değiller,
     kurulu ürünün üreticisiler. Bekçi ikisini de aynı kümede arar —
     ekranda ikisi de bir kuruluş adı olarak görünür. */
  { ad: 'Demo Endüstriyel Kontrol', kategori: 'PLC ve programlama yazılımı' },
  { ad: 'Demo Endüstriyel Ağ', kategori: 'Endüstriyel anahtar' },
  { ad: 'Demo Endüstriyel Bilgisayar', kategori: 'Saha bilgisayarı' },
  { ad: 'Demo Seri Dönüştürücü', kategori: 'Seri-Ethernet dönüştürücü' },
  { ad: 'Demo Veritabanı Sistemleri', kategori: 'Veritabanı yazılımı' },
]);

/** Denetimi yapan taraflar. */
export const DENETLEYICILER: KurgusalKurulus[] = [
  { ad: 'İç Denetim Birimi', kategori: 'Kurum içi' },
  { ad: 'Uyum ve Regülasyon', kategori: 'Kurum içi' },
  { ad: 'Demo Belgelendirme Kuruluşu', kategori: 'Bağımsız belgelendirme' },
  { ad: 'CBDDÖ', kategori: 'Kamu — kamuya açık resmî kaynak, kurgusallaştırılmaz' },
];

/** Model/parça adları — marka çağrıştırmayan kodlar. */
export const MODELLER = ['DEMO-SRV-740', 'DEMO-DCS-3000', 'DEMO-FW-200'] as const;

/* ── ÜRÜN VE YAZILIM ADLARI ────────────────────────────────────────────
   Kuruluş adı kadar ürün adı da bir iddia taşır: "şu üründe uzaktan
   erişim var, oturum kaydı yok" cümlesi, ürünün adı gerçekse o ürün
   hakkındadır. Bu yüzden envanterde ve yazılım kataloğunda görünen
   ürün adları da TEK KAYNAKTAN gelir.

   `Varlik.isletimSistemi` alanı "<ürün> <sürüm>" birleşiğidir
   ("Demo Sunucu OS 2016"): bekçi ÖN EKİ arar, tam eşleşmeyi değil —
   sürüm bir ad değildir ve listeyi sürüm sayısı kadar şişirmesi
   gerekmez. */
export const URUNLER = [
  'Demo Sunucu OS', 'Demo SCADA HMI', 'Demo DCS Paketi', 'Demo DCS Platformu',
  'Demo Hipervizör', 'Demo Ağ İşletim Sistemi', 'Demo Ağ İşletim Sistemi X',
  'Demo Güvenlik Duvarı OS', 'Demo PLC Programlama', 'Demo Veritabanı',
  'Demo Linux', 'Demo Uç OS',
  ...MODELLER,
] as const;

/** Kiracının kendi tüzel kişileri. */
export const TUZEL_KISILER: KurgusalKurulus[] = [
  { ad: 'Demo Enerji Üretim A.Ş.', kategori: 'Ana üretim şirketi' },
  { ad: 'Demo Jeotermal Üretim A.Ş.', kategori: 'Jeotermal portföy' },
  { ad: 'Demo Rüzgâr Üretim A.Ş.', kategori: 'Rüzgâr portföyü' },
  { ad: 'Demo Doğal Üretim A.Ş.', kategori: 'Karma portföy' },
];

/** Kurgusal kişiler — rol taşır, ad taşımaz. Gerçek bir kişi adı,
    kurgusal bir yetki ve davranış kaydına bağlandığı anda o kişi
    hakkında bir iddiaya dönüşür. */
export const KISILER = [
  'Kullanıcı A', 'Kullanıcı B', 'Kullanıcı C', 'Kullanıcı D', 'Kullanıcı E',
] as const;

/** Kiracının KENDİ iç hizmetleri — dışarıdan alınmayan, kurum içinde
    işletilen birimler. Sertifikayı veren "iç PKI mi kamu CA'sı mı"
    ayrımı uyum ekranının okuduğu sinyaldir; iç tarafın da bir adı
    olmalı ve o ad da buradan gelmeli. */
export const IC_BIRIMLER: KurgusalKurulus[] = [
  { ad: 'Demo Enerji İç PKI', kategori: 'Kurum içi sertifika otoritesi' },
];

/** Bütün kurgusal kuruluş adları — bekçinin karşılaştırdığı küme. */
export const TUM_KURULUS_ADLARI: ReadonlySet<string> = new Set([
  ...TEDARIKCILER.map((x) => x.ad),
  ...URETICILER.map((x) => x.ad),
  ...DENETLEYICILER.map((x) => x.ad),
  ...TUZEL_KISILER.map((x) => x.ad),
  ...IC_BIRIMLER.map((x) => x.ad),
]);

/* ═══════════════════════════════════════════════════════════════════════
   İSTİSNA — BEYAN EDİLEN GERÇEK ADLAR

   Her gerçek ad kusur değildir. İki şeyi ayırmak gerekir:

     (a) GERÇEK BİR KURULUŞ HAKKINDA UYDURMA İDDİA — yasak. Doğuran
         kusur buydu: gerçek bir firmaya "uzaktan erişimi var, oturum
         kaydı yok, kritiklik kritik" bağlanmıştı.

     (b) KAMUYA AÇIK BİR GERÇEĞİN ANILMASI — meşru. Bir connector'ın
         hangi dış sisteme bağlanacağı, bir sertifikayı hangi CA'nın
         verdiği, bir CVE'nin hangi ürüne ait olduğu — bunlar
         doğrulanabilir kayıtlardır ve kurgusallaştırılırsa kayıt
         yanlışlanır, temizlenmez.

   Ayrımı kural yapan şey BEYANDIR: (b) sessiz geçemez. Buraya yazılmayan
   her gerçek ad bekçiyi kırmızı yakar; buraya yazılan her ad da
   veritabanında GERÇEKTEN GÖRÜNMEK ZORUNDADIR — kullanılmayan bir beyan
   silinir. O diş olmasaydı bu tablo, "ihtiyaç olur" diye ad biriktirilen
   bir kaçış kapısına dönerdi: kara liste yazmamak için kurulan kapı,
   tersinden bir beyaz listeye çürürdü.

   ── GEREKÇE KUSURU ANLATIR, MALİYETİ DEĞİL ────────────────────────────
   Buradaki `gerekce`, adın gerçek olmasının NİÇİN KUSUR OLMADIĞINI
   söylemelidir. "Kurgusallaştırmak çok yeri değiştirirdi" bir gerekçe
   değildir — düzeltmenin maliyetini anlatır ve düzeltme yapıldığı gün
   buharlaşır (`CLAUDE.md` → gerekçe kuralı).

   ── BEKÇİ NEYİ ÖLÇER, NEYİ ÖLÇMEZ ─────────────────────────────────────
   Bekçi YAPIYI ölçer: beyan var mı, kaynağı yazılı mı, gerekçesi boş mu,
   ad gerçekten kullanılıyor mu. Gerekçenin MALİYET CÜMLESİ olup olmadığı
   sezgisel bir sorudur ve `arac/gerekce-tarama.mjs` kendi başlığında
   bunun niçin kapıya bağlanmadığını yazar: kalıp sözcük arar, argümanı
   anlamaz — maliyeti REDDETMEK için anan doğru bir gerekçe de işaretlenir.
   Bu yüzden sözcük avı orada (tarama, insan sınıflandırır), yapı burada
   (kapı, kırmızı yakar).
   ═══════════════════════════════════════════════════════════════════════ */

/** Beyan edilen gerçek ad: nerede geçtiği, hangi kamuya açık kaynağa
    dayandığı ve gerçek olmasının niçin kusur olmadığı. */
export type GercekAdBeyani = {
  /** Gerçek ad — veritabanında aynen bu şekilde geçer. */
  ad: string;
  /** `Model.alan` — beyanın kapsadığı yüzey. */
  alan: string;
  /** Adı doğrulanabilir kılan kamuya açık kaynak. */
  kaynak: string;
  /** Adın gerçek olması niçin kusur değil. */
  gerekce: string;
};

/* Bir connector kaydı, kurulumda BAĞLANILACAK dış sistemi adlandırır;
   hedef sistemin adı kurgusallaştırılırsa kayıt yapılandırma olmaktan
   çıkar — hangi API'ye hangi izinle bağlanılacağı okunamaz hâle gelir ve
   ekranda "bağlanmaya hazır" görünen bir kayıt aslında hiçbir şeye
   bağlanamaz. Kayıt hedef ürün hakkında bir iddia TAŞIMAZ: `etkin=false`,
   kimlik bilgisi yok, durum `kimlik_bekleniyor`; tek söylediği KENDİ
   kurulumumuzun neye bağlanacağıdır. */
const ENTEGRASYON_HEDEFI =
  'Entegrasyon hedefi: kayıt ürün hakkında değil, kurulumun hangi dış '
  + 'sisteme bağlanacağı hakkındadır. Ad kurgusallaştırılırsa yapılandırma '
  + 'okunamaz olur (hangi API, hangi izin) ve kayıt bağlanamayacağı bir '
  + 'sistemi bağlanacakmış gibi gösterir. Kayıt etkin değildir, kimlik '
  + 'bilgisi yoktur; hedef ürüne dair hiçbir güvenlik iddiası içermez.';

const CVE_KAYDI =
  'Yayımlanmış CVE kaydının alıntısı: zafiyetin hangi ürüne ait olduğu '
  + 'kaydın kendisidir ve numarasıyla NVD\'den doğrulanır. Ürün adı '
  + 'değiştirilirse kayıt temizlenmez, YANLIŞLANIR — başlık kendi CVE '
  + 'numarasıyla çelişir. Satır üreticiye dair bir iddia kurmaz; iddiayı '
  + 'üreticinin kendi bülteni kurar, biz yalnız hangi kurgusal '
  + 'varlığımızın etkilendiğini söyleriz.';

export const GERCEK_AD_BEYANLARI: GercekAdBeyani[] = [
  { ad: 'Entra ID', alan: 'Connector.ad · Connector.kaynakSistem · '
      + 'KimlikHesabi.kaynakSistem · Risk.mevcutKontroller',
    kaynak: 'Microsoft Graph v1.0 — kamuya açık API belgesi',
    gerekce: ENTEGRASYON_HEDEFI },
  { ad: 'Entra', alan: 'KimlikHesabi.kaynakSistem',
    kaynak: 'Microsoft Graph v1.0 — kamuya açık API belgesi',
    gerekce: ENTEGRASYON_HEDEFI },
  { ad: 'CrowdStrike Falcon', alan: 'Connector.ad · Connector.kaynakSistem',
    kaynak: 'CrowdStrike Falcon — kamuya açık API belgesi',
    gerekce: ENTEGRASYON_HEDEFI },
  { ad: 'Tenable Nessus', alan: 'Connector.kaynakSistem',
    kaynak: 'Tenable Nessus — kamuya açık dışa aktarım belgesi',
    gerekce: ENTEGRASYON_HEDEFI },
  { ad: 'Tenable Nessus (elle dışa aktarım)', alan: 'Connector.ad',
    kaynak: 'Tenable Nessus — kamuya açık dışa aktarım belgesi',
    gerekce: ENTEGRASYON_HEDEFI },
  { ad: 'Veeam', alan: 'Connector.kaynakSistem',
    kaynak: 'Veeam — kamuya açık REST API belgesi',
    gerekce: ENTEGRASYON_HEDEFI },
  { ad: 'FortiManager', alan: 'Connector.kaynakSistem',
    kaynak: 'FortiManager JSON-RPC — kamuya açık API belgesi',
    gerekce: ENTEGRASYON_HEDEFI },

  /* Sertifikayı VEREN, sertifikanın doğrulanabilir bir özelliğidir:
     zincir kamuya açık kök depolarından okunur. Kurgusallaştırılırsa
     uyum ekranının okuduğu tek sinyal — "iç PKI mi, kamu CA'sı mı" —
     kaybolur; ikisi farklı kanıt ve farklı yenileme süreci ister.
     Kayıt CA hakkında değil, sertifikanın SAHİBİ olan kurgusal kiracı
     hakkındadır: süresi dolmuş bir sertifika sahibinin kusurudur. */
  { ad: 'DigiCert', alan: 'Sertifika.veren',
    kaynak: 'Kamuya açık kök sertifika depoları (CA/Browser Forum)',
    gerekce: 'Veren, sertifikanın doğrulanabilir bir özelliğidir; '
      + 'kurgusallaştırılırsa "iç PKI mi kamu CA\'sı mı" ayrımı kaybolur '
      + 've bu ayrım ekranın okuduğu tek sinyaldir. Kayıt CA hakkında '
      + 'değil, sertifikanın sahibi olan kurgusal kiracı hakkındadır.' },
  { ad: "Let's Encrypt", alan: 'Sertifika.veren',
    kaynak: 'Kamuya açık kök sertifika depoları (CA/Browser Forum)',
    gerekce: 'Veren, sertifikanın doğrulanabilir bir özelliğidir; '
      + 'kurgusallaştırılırsa "iç PKI mi kamu CA\'sı mı" ayrımı kaybolur '
      + 've bu ayrım ekranın okuduğu tek sinyaldir. Süresi dolmuş bir '
      + 'sertifika sahibinin kusurudur, verenin değil.' },

  /* Bir CVE kaydı yayımlanmış, numarasıyla doğrulanabilir bir belgedir
     ve `CLAUDE.md` §0.2 NVD'yi kamuya açık resmî kaynak olarak sayar.
     Zafiyetin hangi ÜRÜNE ait olduğu o kaydın kendisidir: ürün adını
     değiştiren satır kaydı temizlemez, YANLIŞLAR — CVE numarası ile
     başlık birbirini tutmaz olur. Satır, ürünü yapan firma hakkında bir
     iddia da taşımaz; iddiayı firmanın kendi yayımladığı bülten kurar,
     biz yalnız hangi kurgusal varlığımızın etkilendiğini söyleriz. */
  { ad: 'Rockwell Automation ControlLogix', alan: 'Zafiyet.baslik',
    kaynak: 'NVD · CVE-2023-3595',
    gerekce: CVE_KAYDI },
  { ad: 'Siemens SIMATIC', alan: 'Zafiyet.baslik',
    kaynak: 'NVD · CVE-2022-38465',
    gerekce: CVE_KAYDI },
  { ad: 'Apache Log4j', alan: 'Zafiyet.baslik',
    kaynak: 'NVD · CVE-2021-44228',
    gerekce: CVE_KAYDI },
  { ad: 'FortiOS', alan: 'Zafiyet.baslik',
    kaynak: 'NVD · CVE-2024-21762',
    gerekce: CVE_KAYDI },
  { ad: 'MOVEit Transfer', alan: 'Zafiyet.baslik',
    kaynak: 'NVD · CVE-2023-34362',
    gerekce: CVE_KAYDI },
  { ad: 'Netlogon', alan: 'Zafiyet.baslik',
    kaynak: 'NVD · CVE-2020-1472',
    gerekce: CVE_KAYDI },
  { ad: 'Cisco IOS XE', alan: 'Zafiyet.baslik',
    kaynak: 'NVD · CVE-2023-20198',
    gerekce: CVE_KAYDI },
  { ad: 'pfSense', alan: 'Zafiyet.baslik',
    kaynak: 'NVD · CVE-2022-31814',
    gerekce: CVE_KAYDI },
  { ad: 'PAN-OS GlobalProtect', alan: 'Zafiyet.baslik',
    kaynak: 'NVD · CVE-2024-3400',
    gerekce: CVE_KAYDI },
];

/** ZAFİYET BAŞLIKLARI — beyan tek tek ad değil, KAYIT BAŞINA kaynaktır.

    Bir zafiyet başlığı ya kamuya açık bir kaydın alıntısıdır ya da
    uydurma bir güvenlik iddiasıdır; üçüncüsü yoktur. Bu yüzden bekçi ad
    listesi tutmaz, her satırdan KAMUYA AÇIK KAYNAK REFERANSI ister:
    referans, o satırın beyanıdır ve NVD'den doğrulanabilir.

    İkinci diş, kendi elimizle ürettiğimiz kusuru kapatır: gerçek bir
    CVE'ye atıf yapan bir satırın başlığına KURGUSAL bir ad karışamaz.
    Ölçüldü (8 Eylül 2026) — kuruluş adlarını kurgusallaştıran geçiş,
    CVE başlıklarının içindeki üretici adlarını da değiştirmişti:
    "Demo Endüstriyel Kontrol ControlLogix" satırı CVE-2023-3595'e atıf
    yapıyordu ama o CVE'nin kendi yayımlanmış kaydıyla artık
    çelişiyordu. Kurgusallaştırma orada temizlik değil, doğrulanabilir
    bir kaydın yanlışlanmasıydı. */
export const ZAFIYET_KAYNAK_BICIMI = /^(CVE-\d{4}-\d{4,}|ICSA-\d{2}-\d{3}-\d{2})$/;

/** Bütün kurgusal ürün adları — bekçinin karşılaştırdığı küme. */
export const TUM_URUN_ADLARI: ReadonlySet<string> = new Set(URUNLER);

/** Beyan edilmiş gerçek adlar — kurgusal değildir, ama sessiz de değildir. */
export const BEYANLI_GERCEK_ADLAR: ReadonlySet<string> =
  new Set(GERCEK_AD_BEYANLARI.map((x) => x.ad));

/** Kategori sözcükleri — ad DEĞİLDİR, tip söyler. Bir connector'ın
    kaynak sistemi her zaman bir ürün olmak zorunda değil: dosyadan
    okuyan bir connector'ın kaynağı "dosya"dır ve bunu markalaştırmak
    olmayan bir ürün uydurmak olurdu. Bekçi bunları ayrı bir küme olarak
    tanır; kaçış kapısı değildir, çünkü her biri bir MARKAYI DEĞİL bir
    TİPİ adlandırır ve tipler bu dosyada sayılıdır. */
export const JENERIK_SISTEMLER = [
  'dosya', 'OT keşif ürünü',
  /* Kimlik hesabının kaynağı çoğu satırda bir ürün değil bir TİPTİR:
     dizin servisi (AD), makinenin kendi yerel hesabı, SCADA'nın kendi
     hesap deposu. Bunları markalaştırmak olmayan bir ürün uydurmak
     olurdu — "yerel hesap" bir ürün adı değil, bir hesabın nerede
     durduğudur. */
  'AD', 'yerel', 'SCADA yerel', 'Historian yerel',
] as const;

/* ── KARIŞIM YASAĞI ────────────────────────────────────────────────────
   Bir kaydın metninde HEM kurgusal bir ad HEM beyan edilmiş gerçek bir
   ad geçemez. Kurgusal bir üreticiyi gerçek bir ürünle aynı cümlede
   birleştiren kayıt ikisi hakkında da yanlış bir şey söyler ve
   doğrulanamaz hâle gelir.

   Bu diş bir KARA LİSTE DEĞİLDİR: iki tarafı da bu dosyadan okur.
   Ölçüldü (8 Eyl 2026) — kurgusallaştırma turu beş kayıt üretmişti:
   "Demo Ağ Güvenliği FortiManager", "Demo Entra ID", "Demo Endüstriyel
   Kontrol ControlLogix", "Demo Türbin Sistemleri Demo Kontrol Ailesi
   S7-1200/1500", "Demo Güvenlik Duvarı OS SSL-VPN". Beşi de tek tek
   bakınca "kurgusallaştırılmış" görünüyordu; kusur ancak iki kümeyi
   yan yana koyunca göründü. */
export function karisikAd(metin: string): { kurgusal: string; gercek: string } | null {
  const kurgusal = [...TUM_KURULUS_ADLARI, ...URUNLER]
    .find((ad) => metin.includes(ad));
  if (!kurgusal) return null;
  const gercek = GERCEK_AD_BEYANLARI.map((x) => x.ad).find((ad) => metin.includes(ad));
  return gercek ? { kurgusal, gercek } : null;
}

/** Kolay erişim: kategoriye göre tek ad (tohum tabloları kısa kalsın). */
export const TED = Object.fromEntries(
  TEDARIKCILER.map((x) => [x.ad, x.ad]),
) as Record<string, string>;
