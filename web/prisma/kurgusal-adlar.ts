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

/** Bütün kurgusal kuruluş adları — bekçinin karşılaştırdığı küme. */
export const TUM_KURULUS_ADLARI: ReadonlySet<string> = new Set([
  ...TEDARIKCILER.map((x) => x.ad),
  ...URETICILER.map((x) => x.ad),
  ...DENETLEYICILER.map((x) => x.ad),
  ...TUZEL_KISILER.map((x) => x.ad),
]);

/** Kolay erişim: kategoriye göre tek ad (tohum tabloları kısa kalsın). */
export const TED = Object.fromEntries(
  TEDARIKCILER.map((x) => [x.ad, x.ad]),
) as Record<string, string>;
