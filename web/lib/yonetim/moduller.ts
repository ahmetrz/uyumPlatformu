import { AYARLAR, type AyarGrubu } from '../yapilandirma/tanimlar';
import {
  ESKALASYON_KAYNAKLARI, HEDEF_SOZU, HEDEF_TURLERI, KAYNAK_SOZU,
} from '../uyum/eskalasyon';

/* ═══ Yönetim konsolu modül kütüğü — yapılandırılabilir alan ENVANTERİ ═══

   Platformun yapılandırılabilir her alanı burada bir satırdır. Bu kütük
   üç şeyi aynı anda taşır ve ÜÇÜ BİRBİRİNDEN SAPAMAZ:
     1. Denetim envanteri (rapor bu listeden üretilir; elle sayı yazılmaz).
     2. Konsolun gezinmesi (9 grup × modüller).
     3. Sınıf sözleşmesi:
          A · ADMIN-MANAGED    — yetkili doğrudan kaydeder, iz düşer.
          B · APPROVAL-MANAGED — Kaydet → İncele → Onayla → Uygula; dört göz.
          C · CODE-MANAGED     — kodda kalır; konsolda salt okunur listelenir
                                 ve NEDENİ yazılır.

   `yer` alanı A/B modülün BUGÜN nereden yönetildiğini söyler:
     konsol        — bu konsolun kendi tablosu/çekmecesi (hedefTipi zorunlu)
     mevcut_ekran  — ürünün var olan bir ekranı (rota zorunlu); konsol oraya bağlar
     eksik         — A/B olması gerekir ama henüz yönetilemez (DÜRÜST işaret)
   C modülde `yer` daima `kod`dur ve `kodYeri` dosyayı gösterir.

   Bu dosya istemciye de gider: `db` içe aktarmaz. */

export type Sinif = 'A' | 'B' | 'C';
export type Yer = 'konsol' | 'mevcut_ekran' | 'eksik' | 'kod';

/* UY-36 · Eskalasyon seçenekleri. Sözlük `lib/uyum/eskalasyon.ts` ile
   BİREBİR olmak zorundadır: kütükte olmayan bir seçenek konsoldan
   yazılabilseydi motor onu tanımaz ve kural sessizce hiç çalışmazdı. */
const ESKALASYON_KAYNAK_SECENEKLERI = ESKALASYON_KAYNAKLARI.map((k) => ({
  id: k, ad: KAYNAK_SOZU[k],
}));
const HEDEF_TURU_SECENEKLERI = HEDEF_TURLERI.map((h) => ({
  id: h, ad: HEDEF_SOZU[h],
}));
const ONEM_SECENEKLERI = [
  { id: 'kritik', ad: 'Kritik' }, { id: 'yuksek', ad: 'Yüksek' },
  { id: 'orta', ad: 'Orta' }, { id: 'dusuk', ad: 'Düşük' },
];

export type HedefTipi =
  | 'grup' | 'tuzelKisi' | 'uretimUnitesi' | 'varlikTuru' | 'agBolgesi'
  | 'uygulanabilirlikKurali' | 'tesisGorsel' | 'ayar' | 'eskalasyonKurali';

export type AlanTipi = 'metin' | 'sayi' | 'secim' | 'mantik' | 'json';

export type FormAlani = {
  ad: string;
  etiket: string;
  tip: AlanTipi;
  zorunlu?: boolean;
  /** sabit seçenekler ya da sunucudan doldurulan sözlük adı */
  secenekler?: { id: string; ad: string }[] | 'tesis' | 'grup' | 'tuzelKisi' | 'regulasyon' | 'gorsel';
  aciklama?: string;
  /** kimlik alanı (kod) — düzenlemede değiştirilemez */
  kimlik?: boolean;
};

export type Modul = {
  kod: string;
  grup: AyarGrubu;
  ad: string;
  sinif: Sinif;
  yer: Yer;
  aciklama: string;
  hedefTipi?: HedefTipi;
  alanlar?: FormAlani[];
  /** mevcut ekranın rotası */
  rota?: string;
  /** C: kodun yeri */
  kodYeri?: string;
  /** C: kodda kalma nedeni · eksik: neyin eksik olduğu */
  neden?: string;
  /** hangi kayıtlar etkilenir (etki paneli başlıkları) */
  etki?: string[];
};

const VARLIK_SINIFLARI = [
  { id: 'BT', ad: 'BT' }, { id: 'OT', ad: 'OT' }, { id: 'BT_OT_KOPRU', ad: 'BT/OT köprü' },
  { id: 'ORTAK_ALTYAPI', ad: 'Ortak altyapı' }, { id: 'FIZIKSEL_EMNIYET', ad: 'Fiziksel emniyet' },
];
const BOLGE_TIPLERI = [
  { id: 'bt', ad: 'BT' }, { id: 'ot', ad: 'OT' }, { id: 'dmz', ad: 'DMZ' },
  { id: 'ot_dmz', ad: 'OT DMZ' }, { id: 'kurumsal', ad: 'Kurumsal' }, { id: 'internet', ad: 'İnternet' },
];
const UNITE_DURUMLARI = [
  { id: 'aktif', ad: 'Aktif' }, { id: 'bakim', ad: 'Bakımda' }, { id: 'devre_disi', ad: 'Devre dışı' },
];

export const MODULLER: Modul[] = [
  /* ═ 1 · ORGANİZASYON & SAHA ═══════════════════════════════════════════ */
  { kod: 'grup', grup: 'organizasyon', ad: 'Grup', sinif: 'A', yer: 'konsol', hedefTipi: 'grup',
    aciklama: 'Holding / grup kaydı; tüzel kişilerin çatısı.',
    alanlar: [
      { ad: 'kod', etiket: 'Kod', tip: 'metin', zorunlu: true, kimlik: true },
      { ad: 'ad', etiket: 'Ad', tip: 'metin', zorunlu: true },
    ], etki: ['tüzel kişi', 'santral'] },
  { kod: 'tuzelKisi', grup: 'organizasyon', ad: 'Tüzel kişi', sinif: 'A', yer: 'konsol', hedefTipi: 'tuzelKisi',
    aciklama: 'Şirket; santral sahipliği ve yetki kapsamı bu kayda bağlanır.',
    alanlar: [
      { ad: 'kod', etiket: 'Kod', tip: 'metin', zorunlu: true, kimlik: true },
      { ad: 'ad', etiket: 'Ad', tip: 'metin', zorunlu: true },
      { ad: 'grupId', etiket: 'Grup', tip: 'secim', zorunlu: true, secenekler: 'grup' },
      { ad: 'vergiNo', etiket: 'Vergi no', tip: 'metin' },
    ], etki: ['santral', 'yetki kapsamı'] },
  { kod: 'tesis', grup: 'organizasyon', ad: 'Santral', sinif: 'A', yer: 'mevcut_ekran', rota: '/yonetim-tezgahi?bolum=tanim',
    aciklama: 'Santral kimliği, tipi, kurulu güç, konum, tüzel kişi; kapatma gerekçeli.' },
  { kod: 'uretimUnitesi', grup: 'organizasyon', ad: 'Üretim ünitesi', sinif: 'A', yer: 'konsol', hedefTipi: 'uretimUnitesi',
    aciklama: 'Santral içi ünite (türbin, blok); varlık ve sistem bağları buraya iner.',
    alanlar: [
      { ad: 'tesisId', etiket: 'Santral', tip: 'secim', zorunlu: true, secenekler: 'tesis', kimlik: true },
      { ad: 'kod', etiket: 'Kod', tip: 'metin', zorunlu: true, kimlik: true },
      { ad: 'ad', etiket: 'Ad', tip: 'metin', zorunlu: true },
      { ad: 'kuruluGucMw', etiket: 'Kurulu güç (MW)', tip: 'sayi' },
      { ad: 'durum', etiket: 'Durum', tip: 'secim', secenekler: UNITE_DURUMLARI },
    ], etki: ['varlık', 'sistem/servis'] },
  { kod: 'tesisTipi', grup: 'organizasyon', ad: 'Üretim tipi (kırılım)', sinif: 'A', yer: 'mevcut_ekran', rota: '/yonetim-tezgahi?bolum=tanim',
    aciklama: 'JES / RES / HES / GES / DGKÇ / Merkez — sektöre bağlı üretim tipleri.' },
  { kod: 'sektor', grup: 'organizasyon', ad: 'Sektör', sinif: 'A', yer: 'mevcut_ekran', rota: '/yonetim-tezgahi?bolum=tanim',
    aciklama: 'Üretim tiplerinin üst kümesi.' },
  { kod: 'tesisProfili', grup: 'organizasyon', ad: 'Santral metadata (profil)', sinif: 'A', yer: 'mevcut_ekran', rota: '/tesisler',
    aciklama: 'Uygulanabilirlik kurallarının okuduğu profil alanları (TEİAŞ SCADA/EMS, seri haberleşme …); Santral 360 ekranından düzenlenir.' },
  { kod: 'tesisGorsel', grup: 'organizasyon', ad: 'Santral görsel eşlemesi', sinif: 'A', yer: 'konsol', hedefTipi: 'tesisGorsel',
    aciklama: 'Santral → fotoğraf anahtarı. Dosya seti repo\'dadır (künye public/santraller/KUNYE.md); eşleme buradan seçilir. Başka santralin görseli dolgu olarak ATANMAZ.',
    alanlar: [
      { ad: 'gorselAnahtari', etiket: 'Görsel anahtarı', tip: 'secim', secenekler: 'gorsel',
        aciklama: 'Boş bırakılırsa tipografik plaka çizilir.' },
    ], etki: ['Saha şeridi', 'Portföy', 'Santral 360'] },

  /* ═ 2 · UYUM & REGÜLASYON ═════════════════════════════════════════════ */
  { kod: 'regulasyon', grup: 'uyum', ad: 'Regülasyon / framework', sinif: 'A', yer: 'mevcut_ekran', rota: '/yonetim-tezgahi?bolum=tanim',
    aciklama: 'Kod, ad, otorite, yürürlük; etkin/pasif gerekçeli.' },
  { kod: 'frameworkSurumu', grup: 'uyum', ad: 'Framework sürümü', sinif: 'B', yer: 'mevcut_ekran', rota: '/regulasyonlar',
    aciklama: 'Taslak sürüm açma ve AKTİFLEŞTİRME; aktifleştirme eski değerlendirmeleri silmez, fark ve yeniden değerlendirme ihtiyacı üretir.' },
  { kod: 'madde', grup: 'uyum', ad: 'Kontrol (madde)', sinif: 'A', yer: 'mevcut_ekran', rota: '/regulasyonlar',
    aciklama: 'Kontrol metni, kanıt gereksinimi, inceleme periyodu; toplu içe aktarım onaylı.' },
  { kod: 'kapsamAlani', grup: 'uyum', ad: 'Kontrol ailesi (alan)', sinif: 'A', yer: 'mevcut_ekran', rota: '/yonetim-tezgahi?bolum=tanim',
    aciklama: 'Kontrollerin gruplandığı aileler; madde–alan ataması Regülasyonlar ekranında.' },
  { kod: 'esdegerlik', grup: 'uyum', ad: 'Çapraz eşleme (eşdeğerlik)', sinif: 'A', yer: 'mevcut_ekran', rota: '/eslestirme',
    aciklama: 'Framework\'ler arası kontrol eşdeğerlikleri.' },
  { kod: 'uygulanabilirlikKurali', grup: 'uyum', ad: 'Uygulanabilirlik kuralı', sinif: 'B', yer: 'konsol', hedefTipi: 'uygulanabilirlikKurali',
    aciklama: 'Regülasyonun hangi santrale uygulanacağını profil alanlarından karara bağlayan kural. Değişiklik kapsam kararlarını yeniden hesaplatır → onaylı.',
    alanlar: [
      { ad: 'regulasyonId', etiket: 'Regülasyon', tip: 'secim', zorunlu: true, secenekler: 'regulasyon', kimlik: true },
      { ad: 'ad', etiket: 'Kural adı', tip: 'metin', zorunlu: true },
      { ad: 'kosulJson', etiket: 'Koşul (JSON)', tip: 'json', zorunlu: true,
        aciklama: '{"herhangi":[{"alan":"kuruluGucMw","islec":">=","deger":100}]} ya da {"hepsi":[…]}' },
      { ad: 'aciklama', etiket: 'Açıklama', tip: 'metin' },
      { ad: 'aktif', etiket: 'Aktif', tip: 'mantik' },
    ], etki: ['santral kapsam kararı', 'uyum matrisi', 'madde durumu'] },
  { kod: 'olgunlukOlcegi', grup: 'uyum', ad: 'Olgunluk ölçeği (0-5)', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/olgunluk.ts → OLGUNLUK_ADI · olgunlukKapisi()',
    aciklama: 'UY-59 · Altı kademe: yok · başlangıç · tekrarlanabilir · tanımlı · yönetilen · optimize. Hedef seviye maddede, ölçülen seviye madde durumunda. Seviye 3 ve üstü gerekçe ister.',
    neden: 'Ölçek bir ANLAM sözleşmesidir: kademeler ekrandan değiştirilebilseydi iki santralin "seviye 3"ü aynı şeyi anlatmazdı ve karşılaştırma çökerdi. Ürün hiçbir düzenleyicinin resmî kademe metnini yeniden yazmaz; kurumun kendi çerçevesiyle eşlemesi bir yapılandırma kararıdır.' },
  { kod: 'kontrolTesti', grup: 'uyum', ad: 'Kontrol testi kaydı', sinif: 'A', yer: 'mevcut_ekran', rota: '/uyum',
    aciklama: 'UY-64 · Tasarım mı işleyiş mi, kaç örnek incelendi, kaçı uygun. Kayıt SİLİNMEZ ve değiştirilmez; düzeltme yeni bir test kaydıdır.' },
  { kod: 'testKurali', grup: 'uyum', ad: 'Kontrol testi kuralları', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/kontrolTesti.ts → testKapisi() · TEST_TAZELIK_GUN',
    aciklama: 'UY-64 · İşleyiş testi evren + örneklem + uygun sayısı ister; tasarım testinde bu alanlar boş kalır. Örneklemin tamamı uygunken sonuç "uygun değil" olamaz.',
    neden: 'Bu kurallar bir kaydın kendi sayılarıyla çelişmesini engeller. Gevşetilirse "işleyişini test ettik" cümlesi hiçbir sayıya dayanmayan bir iddiaya döner ve denetimde savunulamaz.' },
  { kod: 'bildirimYukumlulugu', grup: 'uyum', ad: 'Resmî bildirim süresi kuralı', sinif: 'A', yer: 'mevcut_ekran', rota: '/olaylar',
    aciklama: 'UY-63 · Regülasyon × şiddet eşiği × süre (saat) × merci × dayanak. Süreler ÜRÜNLE GELMEZ; kurum kendi mevzuatına göre tanımlar. Kural yoksa sayaç hiç işlemez.' },
  { kod: 'egitimKutugu', grup: 'uyum', ad: 'Eğitim ve farkındalık kütüğü', sinif: 'A', yer: 'mevcut_ekran', rota: '/egitimler',
    aciklama: 'UY-66 · Eğitim tanımı, geçerlilik süresi, katılım kaydı ve kontrol maddesi bağı. Zorunlu eğitimin paydası aktif kullanıcılardır.' },
  { kod: 'gozdenGecirme', grup: 'uyum', ad: 'Yönetim gözden geçirmesi', sinif: 'A', yer: 'mevcut_ekran', rota: '/gozden-gecirme',
    aciklama: 'UY-65 · Toplantı, katılımcı, gündem, özet ve KARARLAR. Kararsız bir kayıt "yapıldı" işaretlenemez; karardan görev açılabilir.' },
  { kod: 'kanitTazelik', grup: 'uyum', ad: 'Kanıt tazelik eşiği', sinif: 'B', yer: 'konsol', hedefTipi: 'ayar',
    aciklama: 'Taze / yenilenmeli / süresi dolmuş kovası; kod varsayılanı 90/180 gün, sunucu tek kaynaktan okur.',
    etki: ['Kanıt kütüphanesi', 'Bulgu detayı', 'Raporlar'] },
  { kod: 'uyumAgirlik', grup: 'uyum', ad: 'Uyum puanlama yöntemi (kısmi = 0,5)', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/sabitler.ts → uyumOzeti()',
    aciklama: 'Uyumlu = 1, kısmi = 0,5, bilinmeyen paydaya girmez.',
    neden: 'Puanlama yöntemi raporların dönemler arası karşılaştırılabilirliğidir; ayarla değişirse geçmiş anlıklar yeniden yorumlanamaz. Yöntem değişikliği sürüm değişikliğidir.' },
  { kod: 'uyumDurumlari', grup: 'uyum', ad: 'Uyum durum sözlüğü', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/sabitler.ts → DURUMLAR / DURUM_ETIKET',
    aciklama: 'uyumlu · kısmi · uyumsuz · incelemede · değerlendirilmedi · kapsam dışı.',
    neden: 'Durum semantiği (bilinmiyor ≠ sıfır ≠ sağlıklı) motorların ve renk paletinin sözleşmesidir; serbest etiket eklenmesi semantiği kırar.' },
  { kod: 'kanitTipleri', grup: 'uyum', ad: 'Kanıt tipi sözlüğü', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/kanitMetadata.ts → KANIT_TIPLERI',
    aciklama: 'UY-12 · 12 tip: politika · kayıt · konfigürasyon · ekran görüntüsü · rapor · log · bilet · onay · test sonucu · eğitim kaydı · sözleşme · ağ şeması.',
    neden: 'Tip listesi şemadaki `Kanit.tip` yorumuyla birebirdir ve kanıt gücü sınıflaması bu sözlüğe dayanır. Ekrandan serbest tip açılabilseydi, denetçiye "rapor" diye gösterilen kayıt hiçbir yerde tanımlı olmayan bir şey olabilirdi.' },
  { kod: 'kanitDurumlari', grup: 'uyum', ad: 'Kanıt kabul durumu', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/kanitMetadata.ts → KANIT_DURUMLARI · kanitGucu()',
    aciklama: 'UY-12 · taslak · geçerli · reddedildi · arşivlendi. Taslak ve reddedilmiş kanıt hiç tartılmaz.',
    neden: 'Kabul DURUMU ile geçerlilik TARİHİ ayrı alanlardır ve karıştırılmaları reddedilmiş bir kanıta dayanan "uyumlu" kararı üretir. Durum kümesini genişletmek, kanıt gücü sınıflamasının üç değerli mantığını kırar.' },
  { kod: 'kanitDosyaKurali', grup: 'uyum', ad: 'Kanıt dosyası izin listesi ve boyut sınırı', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/kanitDosyaKurali.ts → IZINLI_TIPLER · DOSYA_SINIRI',
    aciklama: 'UY-13 · 25 MiB sınır; sayılı MIME tipi kabul edilir (arşiv yok). Depo içerik adreslidir: kullanıcı girdisi dosya yoluna hiç girmez.',
    neden: 'Bu bir güvenlik sınırıdır, bir tercih değil. Ekrandan genişletilebilseydi izin listesi yasak listesine dönerdi: listede olmayan her yeni tehlikeli tip sessizce kabul edilirdi. Sınırın kendisi ekranda görünür, düzenlenemez.' },
  { kod: 'kanitSurumKurali', grup: 'uyum', ad: 'Kanıt sürüm açma kuralı', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/kanitMetadata.ts → surumGerekiyorMu() · prisma/schema.prisma → KanitSurumu',
    aciklama: 'UY-12 · İÇERİK özeti değişirse yeni sürüm; metadata değişirse değil. Sürüm geçmişi veritabanı tetikleyicisiyle değişmez ve silinmezdir.',
    neden: 'Sürüm geçmişi denetimin karşılaştırma zeminidir. Ayarla gevşetilebilseydi içerik sessizce değiştirilebilir ve "geçen sene de böyle miydi" sorusu cevapsız kalırdı.' },
  { kod: 'dogrulamaAyrimi', grup: 'uyum', ad: 'Değerlendirme–doğrulama ayrımı (dört göz)', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/kontrolSahipligi.ts → dogrulayabilirMi()',
    aciklama: 'UY-07 · Kendi değerlendirmesini kimse doğrulayamaz; değerlendirme doğrulamadan sonra değişirse doğrulama düşer.',
    neden: 'Dört göz ilkesi bir yetki ayarı değil bir denetim gereğidir; ayarla kapatılabilseydi tek kişilik bir "uyumlu" kararı doğrulanmış görünürdü.' },
  { kod: 'kanitImzasi', grup: 'uyum', ad: 'Kanıt paketi imzası (HSM / KMS)', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/disSaglayicilar.ts → kmsImzaSaglayici · lib/disaAktarim/paket.ts → paketImzasi()',
    aciklama: 'UY-18 · BAĞLI DEĞİL. Paket SHA-256 bütünlük damgası taşır ve başlığına "imzasız" yazar; ürün kendi anahtarıyla imza atmaz.',
    neden: 'Konsoldan "imzalı" işaretlenebilseydi, hiçbir şeyi kanıtlamayan bir imza beyanı üretilirdi. Bağlantı kurumun HSM/KMS erişimini gerektirir ve anahtar ürüne asla verilmez.' },
  { kod: 'eskalasyonMatrisi', grup: 'uyum', ad: 'Eskalasyon matrisi (kademeler)',
    sinif: 'A', yer: 'konsol', hedefTipi: 'eskalasyonKurali',
    aciklama: 'UY-36 · Gecikmiş bulgu/aksiyon/görev için kademe · gecikme · hedef. Her kademe BİR KEZ tetiklenir; hedef bulunamazsa sebebi kaydedilir.',
    alanlar: [
      { ad: 'kaynakTipi', etiket: 'Neyin gecikmesi', tip: 'secim', zorunlu: true,
        secenekler: ESKALASYON_KAYNAK_SECENEKLERI, kimlik: true },
      { ad: 'onemDerecesi', etiket: 'Önem derecesi', tip: 'secim',
        secenekler: ONEM_SECENEKLERI, kimlik: true,
        aciklama: 'Boş = HER önem derecesine uygulanır. Özel kural geneli EZER.' },
      { ad: 'kademe', etiket: 'Kademe', tip: 'sayi', zorunlu: true, kimlik: true,
        aciklama: '1 en alt kademedir; gecikme büyüdükçe daha yukarı haber verilir.' },
      { ad: 'gecikmeGun', etiket: 'Hedef tarihten kaç gün sonra', tip: 'sayi', zorunlu: true,
        aciklama: 'Üst kademenin gecikmesi alt kademeden BÜYÜK olmalı; değilse alt kademe hiç çalışmaz ve ekran bunu kusur sayar.' },
      { ad: 'hedefTuru', etiket: 'Kime haber verilir', tip: 'secim', zorunlu: true,
        secenekler: HEDEF_TURU_SECENEKLERI },
      { ad: 'hedefDeger', etiket: 'Hedef (rol adı ya da kullanıcı)', tip: 'metin',
        aciklama: '"Rol" ve "kullanıcı" hedeflerinde ZORUNLU: hedefsiz kural kayıt yazar ama kimseye haber vermez.' },
      { ad: 'aciklama', etiket: 'Açıklama', tip: 'metin' },
      { ad: 'aktif', etiket: 'Etkin', tip: 'mantik' },
    ],
    etki: ['eskalasyon motoru', 'Bildirimler'] },
  { kod: 'kokNedenKategorileri', grup: 'uyum', ad: 'Kök neden kategorileri', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/kokNeden.ts → KOK_NEDEN_KATEGORILERI',
    aciklama: 'UY-26 · 10 kategori. Kritik ve yüksek önemli bulgular ile TEKRAR eden bulgular kök neden analizi ister; kapanış kapısı bunu sorar.',
    neden: 'Kategori listesi "aynı kök neden kaç bulguda tekrarlıyor" sorusunun sayılabilir zeminidir. Ekrandan serbest kategori açılabilseydi dağılım anlamsızlaşır ve sistemik sorun görünmez olurdu.' },
  { kod: 'tekrarPenceresi', grup: 'uyum', ad: 'Tekrarlayan bulgu penceresi', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/tekrarBulgu.ts → TEKRAR_PENCERESI_GUN · KRONIK_ESIK',
    aciklama: 'UY-28 · 365 gün pencere, 3 halkada KRONİK. Tekrar tanımı DAR: aynı kontrol, aynı santral. Metin benzerliğine bakılmaz.',
    neden: 'Pencere ayarla değişirse eski bağların hangi eşikle kurulduğu kaybolurdu; bu yüzden pencere her bağın kendi kaydına yazılır ve eşik kodda durur. Metin benzerliğiyle tekrar aramak, farklı iki sorunu birleştirip denetçiye yanlış tarihçe sunardı.' },
  { kod: 'aktarimElemeTavani', grup: 'uyum', ad: 'Değerlendirme aktarımı eleme tavanı', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/degerlendirmeAktarimi.ts → ELEME_TAVANI · SATIR_TAVANI',
    aciklama: 'UY-43 · Satırların yarısından çoğu elenirse aktarım UYGULANMAZ; tek koşuda en çok 5000 satır. Kuru koşu zorunludur, uygulama kökeniyle ona bağlıdır.',
    neden: 'Bu bir güvenlik kapısıdır: yarısı elenen bir dosya büyük ihtimalle yanlış regülasyona ya da yanlış santrale aktarılıyordur ve kalan azınlığı sessizce yazmak, doğru görünen ama yanlış yere yazılmış bir aktarım üretir.' },
  { kod: 'mevzuatKaynakSaglayici', grup: 'uyum', ad: 'Resmî mevzuat kaynağı izleyici', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/mevzuatKaynagi.ts → mevzuatSaglayici',
    aciklama: 'UY-41 · BAĞLI DEĞİL. Kaynaklar elle kaydedilir, "en son ne zaman bakıldı" elle güncellenir; ürün hiçbir siteye kendiliğinden bağlanmaz ve "değişiklik yok" DEMEZ.',
    neden: 'Adres kurumun kararıdır ve ürüne gömülü bir adres, kurum başka bir kaynağı takip ediyorsa sessizce yanlış izlenim verir. Kaynak KAYITLARI konsolda değil regülasyon ekranında yönetilir, çünkü hangi regülasyonun nereden izlendiği o çerçevenin bilgisidir.' },
  { kod: 'dysBaglantisi', grup: 'uyum', ad: 'Belge yönetim sistemi (DYS) bağlantısı', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/disSaglayicilar.ts → dysSaglayici',
    aciklama: 'UY-20 · BAĞLI DEĞİL. Belge sürümü elle girilir; ekran "DYS ile senkron" demez ve kütüğün geride kalmış olabileceğini yazar.',
    neden: 'Bağlantı kurumun DYS ürününü ve salt okunur API erişimini gerektirir. Konsolda bir onay kutusuyla açılabilseydi, hiçbir yere bağlanmadan "senkron" gösteren bir ekran üretilirdi.' },

  /* ═ 3 · RİSK & DENETİM ════════════════════════════════════════════════ */
  { kod: 'riskEsik', grup: 'risk', ad: 'Risk skor eşikleri', sinif: 'B', yer: 'konsol', hedefTipi: 'ayar',
    aciklama: 'Kritik ≥ 15 · yüksek ≥ 8 (olasılık × etki, 5×5).', etki: ['Saha risk matrisi', 'risk kütüğü'] },
  { kod: 'sonTarihUfku', grup: 'risk', ad: 'Son tarih ufukları (deadline motoru)', sinif: 'B', yer: 'konsol', hedefTipi: 'ayar',
    aciklama: 'Bulgu 14 gün · denetim/sertifika 30 gün.', etki: ['deadline_motoru', 'iş kuyruğu'] },
  { kod: 'riskKategori', grup: 'risk', ad: 'Risk etki alanları', sinif: 'C', yer: 'kod',
    kodYeri: 'prisma/schema.prisma → Risk.etki* · lib/motorlar/olayEtki.ts → ETKI_ALANLARI',
    aciklama: 'Siber · itibar · çevre · veri … etki boyutları.',
    neden: 'Her etki alanı şemada bir sütundur ve olay-etki motorunun girdisidir; yeni alan şema + motor değişikliğidir.' },
  { kod: 'riskMatrisi', grup: 'risk', ad: 'Risk matrisi (5×5)', sinif: 'C', yer: 'kod',
    kodYeri: 'app/(kabuk)/(flagship)/veri.ts · riskler/ortak.ts',
    aciklama: 'Olasılık 1–5 × etki 1–5.', neden: 'Boyut değişimi geçmiş risk skorlarını karşılaştırılamaz kılar; eşikler (B) ayrı yönetilir.' },
  { kod: 'denetimTipleri', grup: 'risk', ad: 'Denetim tipleri ve fazları', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/sabitler.ts → DENETIM_* · Denetim.tip',
    aciklama: 'İç / dış / sertifikasyon; planlama → saha → rapor → kapanış.',
    neden: 'Fazlar durum makinesidir (geçiş kuralları kodda); tip sözlüğü de faz kurallarına bağlıdır.' },
  { kod: 'bulguKategori', grup: 'risk', ad: 'Bulgu önem dereceleri / CAPA durumları', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/sabitler.ts → ONEM_DERECELERI · BULGU_DURUMLARI · AKSIYON_DURUMLARI',
    aciklama: 'Kritik / yüksek / orta / düşük; açık → aksiyonda → doğrulama → kapalı.',
    neden: 'CAPA yaşam döngüsü kapanış doğrulaması ve onay akışıyla kilitlidir; durum eklemek geçiş kodudur.' },

  /* ═ 4 · VARLIK & OT ═══════════════════════════════════════════════════ */
  { kod: 'varlikTuru', grup: 'varlik', ad: 'Varlık türü', sinif: 'A', yer: 'konsol', hedefTipi: 'varlikTuru',
    aciklama: 'PLC, RTU, HMI, sunucu … türler ve BT/OT sınıfı; pasife alma bağlı varlıkları silmez.',
    alanlar: [
      { ad: 'kod', etiket: 'Kod', tip: 'metin', zorunlu: true, kimlik: true },
      { ad: 'ad', etiket: 'Ad', tip: 'metin', zorunlu: true },
      { ad: 'sinif', etiket: 'Sınıf', tip: 'secim', zorunlu: true, secenekler: VARLIK_SINIFLARI },
      { ad: 'aktif', etiket: 'Aktif', tip: 'mantik' },
    ], etki: ['varlık', 'keşif eşlemesi', 'içe aktarım'] },
  { kod: 'agBolgesi', grup: 'varlik', ad: 'Ağ bölgesi', sinif: 'A', yer: 'konsol', hedefTipi: 'agBolgesi',
    aciklama: 'Purdue / IEC 62443 bölgeleri; topoloji ve geçit kuralları buraya bağlanır.',
    alanlar: [
      { ad: 'kod', etiket: 'Kod', tip: 'metin', zorunlu: true, kimlik: true },
      { ad: 'ad', etiket: 'Ad', tip: 'metin', zorunlu: true },
      { ad: 'tip', etiket: 'Tip', tip: 'secim', zorunlu: true, secenekler: BOLGE_TIPLERI },
      { ad: 'tesisId', etiket: 'Santral', tip: 'secim', secenekler: 'tesis', aciklama: 'Boş = kurumsal / santral bağımsız' },
      { ad: 'guvenlikSeviyesi', etiket: 'Güvenlik seviyesi (Purdue)', tip: 'sayi' },
    ], etki: ['varlık', 'ağ geçidi', 'topoloji anlığı'] },
  { kod: 'agSegmenti', grup: 'varlik', ad: 'Ağ segmenti (VLAN / CIDR)', sinif: 'A', yer: 'mevcut_ekran',
    rota: '/topoloji?kip=segment',
    aciklama: 'OT-11 · Adresleme birimi: VLAN + CIDR + ağ geçidi. Bölgeden AYRIDIR — bölge güvenlik sınırıdır, bir bölge birden çok segment taşır. Tanım `tanimlar/onay` ister; CIDR sunucuda çözümlenir.' },
  { kod: 'firmwareTemeli', grup: 'varlik', ad: 'Firmware tabanı', sinif: 'A', yer: 'mevcut_ekran',
    rota: '/tabanlar',
    aciklama: 'OT-22 · Tür / üretici / model başına onaylı sürüm, asgari sürüm ve bilinen kötü sürümler. Uyum kararını motor verir; ekran yalnız tabanı tanımlar. `tanimlar/onay` ister.' },
  { kod: 'guvenlikKapsami', grup: 'varlik', ad: 'Güvenlik kapsaması (EDR · SIEM · yedek …)', sinif: 'A',
    yer: 'mevcut_ekran', rota: '/envanter',
    aciklama: 'OT-27 · Varlık başına on bir kapsam tipi, beş durum: kapsanan · kısmi · kapsanmayan · UYGULANAMAZ · bilinmiyor. Envanter çekmecesinin Duruş sekmesinden yönetilir; "uygulanamaz" gerekçe ister.' },
  { kod: 'alanUygulanabilirligi', grup: 'varlik', ad: 'Alan uygulanabilirliği', sinif: 'A',
    yer: 'mevcut_ekran', rota: '/envanter',
    aciklama: 'OT-03 · "Bu kimlik alanı bu cihaz için uygulanamaz" kararı, gerekçesiyle. Uygulanamaz alan doluluk oranının PAYDASINDAN düşer; ölçüm borcu sayılmaz.' },
  { kod: 'yamaKaydi', grup: 'varlik', ad: 'Yama kaydı', sinif: 'A', yer: 'mevcut_ekran', rota: '/envanter',
    aciklama: 'OT-21 · Kaynak sistem başına mevcut/taban yama seviyesi, eksik yama, istisna ve yamalanamazlık. Durum TÜRETİLİR, elle seçilmez.' },
  { kod: 'sbomBelgesi', grup: 'varlik', ad: 'Yazılım listesi (SBOM)', sinif: 'A', yer: 'mevcut_ekran',
    rota: '/envanter',
    aciklama: 'OT-26 · CycloneDX / SPDX belgesi yükleme ve bileşen kütüğü. Ayrıştırıcı hiç throw etmez; reddedilen bileşenler sayılır ve gösterilir.' },
  { kod: 'veriKalitesiKarari', grup: 'varlik', ad: 'Veri kalitesi bulgusu kararı', sinif: 'A',
    yer: 'mevcut_ekran', rota: '/saglik?kip=kalite',
    aciklama: 'OT-44 · Açık boşluğu GİDERİLDİ ya da KABUL EDİLDİ diye karara bağlama; gerekçe zorunlu. Motorun kendi çözdüğü bulgu bir sonraki koşuda kendiliğinden kapanır.' },
  { kod: 'isSureci', grup: 'varlik', ad: 'İş süreci (üretim zinciri)', sinif: 'A',
    yer: 'mevcut_ekran', rota: '/prosesler',
    aciklama: 'OT-05 · Adımların taşıyıcısı. Santralsiz süreç grup çapındadır; tesise kısıtlı rol onu düzenleyemez. Uyum SÜRECİYLE (/surecler) karıştırılmamalıdır — bu üretim zinciridir.' },
  { kod: 'prosesAdimi', grup: 'varlik', ad: 'Proses adımı', sinif: 'A', yer: 'mevcut_ekran',
    rota: '/prosesler',
    aciklama: 'OT-05 · İş sürecinin sıralı kırılımı; varlıklar adıma bağlanır. Bağın kendisi bilgi taşır: rol, tek nokta ve yedeklilik — üçü de ÜÇ DEĞERLİ, "değerlendirilmedi" ayrı bir durumdur.' },
  { kod: 'etkiDegerlendirmesi', grup: 'varlik', ad: 'Üretim etkisi değerlendirmesi', sinif: 'A',
    yer: 'mevcut_ekran', rota: '/envanter',
    aciklama: 'OT-08 · MW kaybı, RTO/RPO, emniyet ve çevre etkisi. Sayı yazan değerlendirme GEREKÇE ister; hesaplanmamış kayıp `null` kalır ve toplamda "0 MW" diye görünmez.' },
  { kod: 'ekip', grup: 'varlik', ad: 'Ekip ve ekip üyeliği', sinif: 'A', yer: 'mevcut_ekran',
    rota: '/yetkiler',
    aciklama: 'OT-09 · Sahipliğin devredilebilir birimi. Kişi sahipliğinin yerine geçmez, tamamlar: kişi ayrıldığında varlık öksüz kalmasın. Pasif kullanıcı ekibe eklenemez.' },
  { kod: 'kesifYetkiKarari', grup: 'varlik', ad: 'Keşif yetki kararı', sinif: 'A',
    yer: 'mevcut_ekran', rota: '/kesif',
    aciklama: 'OT-16 · Cihaz ağda OLMALI MIYDI? `durum` iş akışını, bu yetkiyi söyler. "Yetkisiz" ve "gerekçeyle yok sayıldı" kararları gerekçe ister.' },
  { kod: 'ouiKutugu', grup: 'varlik', ad: 'IEEE OUI kütüğü', sinif: 'A', yer: 'mevcut_ekran',
    rota: '/kesif',
    aciklama: 'OT-17 · MAC ön ekinden üretici. **Kütük ürünle GELMEZ** — kurum indirip yükler; yüklenmezse üretici alanı "kütükte yok" kalır, uydurulmaz.' },
  { kod: 'pasifGozlem', grup: 'varlik', ad: 'Pasif OT gözlemi', sinif: 'A', yer: 'mevcut_ekran',
    rota: '/kesif',
    aciklama: 'OT-17 · Firewall/span/ARP dışa aktarımı yükleme. Ürün OT ağında AKTİF TARAMA YAPMAZ; tanınmayan port imzası boş bırakılır.' },
  { kod: 'konfigTemeli', grup: 'varlik', ad: 'Konfigürasyon tabanı ve drift', sinif: 'B',
    yer: 'mevcut_ekran', rota: '/yedekleme',
    aciklama: 'OT-28 · Onaylı konfigürasyon (taban) ve ondan sapma. Onaylı drift bir kusur değildir ama izlenmeden geçmez; özetsiz yedek taban olamaz.' },
  { kod: 'hesapTipi', grup: 'erisim', ad: 'Hesap kaynak tipi ve MFA', sinif: 'A',
    yer: 'mevcut_ekran', rota: '/kimlik',
    aciklama: 'OT-33 · Hesabın NEREDE yaşadığı (yerel/dizin/uygulama/tedarikçi) `tip` alanından AYRI bir eksendir. MFA üç değerlidir: `null` "MFA yok" değil "ölçülmedi"dir.' },
  { kod: 'envanterSayimi', grup: 'varlik', ad: 'Fiziksel envanter sayımı', sinif: 'A', yer: 'mevcut_ekran', rota: '/sayim',
    aciklama: 'OT-55 · Kampanya, kapsam ve satır sonuçları. Payda açılışta DONAR; "sayılmadı" ile "bulunamadı" ayrı durumlardır ve sayım hiçbir varlığı silmez.' },
  { kod: 'sayimSonuclari', grup: 'varlik', ad: 'Sayım sonuç sözlüğü', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/varlik/sayim.ts → SONUCLAR · sayimOzeti()',
    aciklama: 'OT-55 · sayılmadı · doğrulandı · bulunamadı · yeri farklı · fazladan. Doğruluk oranı yalnız SAYILAN satırlar üzerinden hesaplanır.',
    neden: 'Sonuç kümesini ekrandan genişletmek, doğruluk oranının paydasını belirsiz kılar. "Sayılmadı" ile "bulunamadı" ayrımı bu ekranın var olma sebebidir; serbest bir sonuç eklenmesi o ayrımı ilk günde bozar.' },
  { kod: 'yedekParca', grup: 'varlik', ad: 'Kritik yedek parça', sinif: 'A', yer: 'mevcut_ekran', rota: '/yedek-parca',
    aciklama: 'OT-56 · Stok adedi, kritik eşik, tedarik süresi ve hizmet ettiği varlıklar. Tedarik süresi ölçülmediyse BOŞ kalır; sıfır yazılmaz.' },
  { kod: 'tasinabilirMedya', grup: 'varlik', ad: 'Taşınabilir medya kütüğü', sinif: 'A', yer: 'mevcut_ekran', rota: '/tasinabilir-medya',
    aciklama: 'OT-57 · USB ve harici medya kaydı, tarama damgası, varlık bazında kullanım. Ürün medyayı ENGELLEMEZ; kayıt tutar.' },
  { kod: 'medyaKurali', grup: 'varlik', ad: 'Medya tarama tazeliği ve onay kuralı', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/varlik/tasinabilirMedya.ts → TARAMA_TAZELIK_GUN · kullanimKapisi()',
    aciklama: 'OT-57 · 90 gün tarama tazeliği; karantina ve imha durumundaki medyaya kullanım kaydı GİRİLEMEZ. Onaysız kullanım reddedilmez, uyarıyla kaydedilir.',
    neden: 'Onayı zorunlu tutmak, kaydı hiç girilmeyen bir kullanım üretirdi ve kayıtsız kullanım hiç görünmez. Bu denge bir güvenlik kararıdır; ekrandan gevşetilirse kütük anlamını yitirir.' },
  { kod: 'tedarikci', grup: 'varlik', ad: 'Tedarikçi', sinif: 'A', yer: 'mevcut_ekran', rota: '/tedarikciler',
    aciklama: 'Tedarikçi kaydı, sözleşme ve erişim oturumları.' },
  { kod: 'yedeklemePolitikasi', grup: 'varlik', ad: 'Yedekleme politikası', sinif: 'A', yer: 'mevcut_ekran', rota: '/yedekleme',
    aciklama: 'Varlık sınıfı → yedek sıklığı ve doğrulama beklentisi.' },
  { kod: 'eslemeProfili', grup: 'varlik', ad: 'Keşif eşleme profili', sinif: 'A', yer: 'mevcut_ekran', rota: '/esleme',
    aciklama: 'Kaynak alan → varlık alanı kuralları; sürümlü yayın, kuru koşu ön izlemesi.' },
  { kod: 'connectorDeneme', grup: 'entegrasyon', ad: 'Connector deneme ve geri çekilme',
    sinif: 'B', yer: 'mevcut_ekran', rota: '/saglik?kip=entegrasyon',
    aciklama: 'OT-40 · Geçici hatada kaç deneme ve hangi geri çekilme merdiveni. Bu iki ayar bir dönem yazılıp HİÇ OKUNMUYORDU; artık çekirdek koşu başlarken connector kaydından okur. Boş bırakılan alan ürün varsayılanına düşer, sıfır beklemeye DEĞİL.' },
  { kod: 'mezarTasi', grup: 'entegrasyon', ad: 'Mezar taşı (kaynakta kaybolan kayıt)',
    sinif: 'C', yer: 'kod', kodYeri: 'lib/entegrasyon/mezarTasi.ts',
    neden: 'Kayıp oranı eşiği ve tavan bir GÜVENLİK sınırıdır: eşiği ekrandan yükseltebilmek, kaynak sorgusu daraldığında envanterin yarısını silme önerisiyle doldurmaya izin verirdi. Değer kodda, gerekçesiyle birlikte durur.',
    aciklama: 'OT-40 · Yalnız TAM koşuda, koşu eksiksiz bittiyse ve kayıp oranı eşiği aşmadıysa üretilir. Ürün hiçbir varlığı otomatik silmez; açılan şey bir veri kalitesi bulgusudur.' },
  { kod: 'altyapiSaglayici', grup: 'entegrasyon', ad: 'Altyapı sağlayıcıları (DB · nesne deposu · koordinasyon)',
    sinif: 'C', yer: 'kod', kodYeri: 'lib/altyapi/saglayicilar.ts',
    neden: 'Bir sağlayıcının BAĞLI olup olmadığı bir ayar değil, bir gerçektir: ekrandan "bağlı" işaretlenebilseydi, hiçbir şeye bağlı olmayan bir kurulum kendini hazır ilan edebilirdi. Bağlantı kod ve dağıtım işidir.',
    aciklama: 'OT-48 · Bağlı olmayan sağlayıcı listeden ÇIKARILMAZ ve "çalışıyor" numarası yapmaz; neyin eksik olduğunu yazar. PostgreSQL, S3 uyumlu depo ve dağıtık kilit bugün KAYITLI DEĞİLDİR.' },
  { kod: 'kurulumHazirligi', grup: 'entegrasyon', ad: 'Kurulum hazırlığı kontrolleri',
    sinif: 'B', yer: 'mevcut_ekran', rota: '/saglik?kip=hazirlik',
    aciklama: 'OT-48 · Yazma yoklaması, göç kütüğü, zamanlayıcı ve sağlayıcılar. Dört durum: hazır · kurulum eksik · arızalı · ÖLÇÜLEMEDİ. Zorunlu bir kontrol ölçülemediyse hazırlık iddia EDİLMEZ.' },
  { kod: 'baglantiIhtiyaci', grup: 'entegrasyon', ad: 'Bağlantı ihtiyacı kütüğü',
    sinif: 'C', yer: 'kod', kodYeri: 'lib/entegrasyon/adaptorler/',
    neden: 'İhtiyaç listesi adaptörün kendi bilgisidir: hangi uca hangi izinle bağlanacağını yazan taraf, o kalemleri de yazar. Ekrandan düzenlenebilseydi, kod bir izni isterken liste başkasını söyleyebilirdi. Liste `/saglik?kip=hazirlik` ekranında salt okunur görünür.',
    aciklama: 'OT-50 · Bağlanmamış her adaptörün kurumdan isteyeceği kalemler YAPISAL olarak beyan edilir; sertifikasyon boş listeyi kusur sayar. Liste bilgiyi İSTER, bilginin kendisini taşımaz.' },
  { kod: 'performansTabani', grup: 'entegrasyon', ad: 'Performans tabanı (p50 · p95 · p99)',
    sinif: 'C', yer: 'kod', kodYeri: 'arac/performans-tabani.json · arac/yuzdelik.mjs',
    neden: 'Taban bir ÖLÇÜM kaydıdır, bir hedef değil: ekrandan düzenlenebilseydi gerileyen bir sayıyı tabanı yükselterek "geçti" yapmak mümkün olurdu. Taban yalnız ölçüm aracıyla, ölçüldüğü hâliyle yazılır.',
    aciklama: 'OT-49 · Ölçüm TOHUM VERİSİYLEDİR ve gerçek veri hacmini temsil etmez (o UY-55). Gerileme sayılmak için hem oran hem ölçülmüş gürültü bandı aşılmalıdır.' },
  { kod: 'erisimEsik', grup: 'varlik', ad: 'Erişim değerlendirme eşikleri', sinif: 'B', yer: 'konsol', hedefTipi: 'ayar',
    aciklama: 'Koşu başına 1000 oturum · süren 24 saat · anormal 12 saat.', etki: ['erisim_degerlendirme'] },
  { kod: 'kritiklik', grup: 'varlik', ad: 'Kritiklik sınıfları', sinif: 'C', yer: 'kod',
    kodYeri: 'prisma/schema.prisma → Varlik.kritiklik · lib/motorlar/erisimDegerlendirme.ts → kritikligiCoz',
    aciklama: 'kritik / yüksek / orta / düşük / bilinmiyor.',
    neden: '"bilinmiyor" değeri motorların üç-değerli mantığının parçasıdır; sınıf eklemek yükseltme basamaklarını değiştirir.' },
  { kod: 'yasamDongusu', grup: 'varlik', ad: 'Varlık yaşam döngüsü durumları', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/sabitler.ts → VARLIK_DURUM* · app/(kabuk)/(operasyonel)/omur',
    aciklama: 'Devrede · bakımda · ömrü doldu · hurdaya ayrıldı.',
    neden: 'Ömür ekranı ve yedek doğrulama motoru durumlara göre karar verir; durum makinesi kodda.' },

  /* ═ 5 · İŞ AKIŞLARI ═══════════════════════════════════════════════════ */
  { kod: 'isKuyrugu', grup: 'akis', ad: 'Görev ve onay kuyruğu', sinif: 'A', yer: 'mevcut_ekran', rota: '/yonetim-tezgahi?bolum=is',
    aciklama: 'Manuel görev açma, durum değişimi, onay kararı (dört göz).' },
  { kod: 'degisiklikTalepleri', grup: 'akis', ad: 'Yapılandırma değişiklik talepleri', sinif: 'B', yer: 'konsol',
    aciklama: 'B sınıfı her değişiklik: Kaydet → İncele → Onayla → Uygula. Talep eden onaylayamaz; uygulama ayrı adımdır.' },
  { kod: 'gorevTipleri', grup: 'akis', ad: 'Görev tipleri', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/sabitler.ts → GOREV_TIP_ETIKET',
    aciklama: 'son_tarih · kanit_yenileme · erisim_incelemesi …',
    neden: 'Her tip bir motorun ürettiği iş kalemidir; motorsuz tip "hayalet görev" üretir.' },
  { kod: 'onayTipleri', grup: 'akis', ad: 'Onay akışı tipleri', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/eylemler2/gorev.ts → ONAY_TIP_MODUL',
    aciklama: 'bulgu_kapanis · risk_kabul · istisna · proje_aday · applicability_override · proje_kapanis.',
    neden: 'Onay tipi → hangi modülün onay yetkisi geçer eşlemesi bir GÜVENLİK KAPISIDIR; konsoldan değiştirilemez.' },
  { kod: 'motorAralik', grup: 'akis', ad: 'Motor koşu aralığı (SLA)', sinif: 'B', yer: 'konsol', hedefTipi: 'ayar',
    aciklama: 'Zamanlayıcının motorları yeniden vadeli sayma süresi.', etki: ['zamanlayıcı'] },

  /* ═ 6 · KULLANICI & ERİŞİM ════════════════════════════════════════════ */
  { kod: 'kullanici', grup: 'erisim', ad: 'Kullanıcılar', sinif: 'A', yer: 'mevcut_ekran', rota: '/yetkiler',
    aciklama: 'Hesap, parola sıfırlama, aktif/pasif.' },
  { kod: 'yetki', grup: 'erisim', ad: 'Rol + kapsam atamaları', sinif: 'A', yer: 'mevcut_ekran', rota: '/yetkiler',
    aciklama: 'Kullanıcıya rol; santral / süreç / regülasyon / tüzel kişi kapsamı.' },
  { kod: 'apiAnahtari', grup: 'erisim', ad: 'API anahtarları', sinif: 'A', yer: 'mevcut_ekran', rota: '/yonetim-tezgahi?bolum=anahtar',
    aciklama: 'Üretim (tek gösterim), kapsam ve iptal; hash saklanır.' },
  { kod: 'apiKapsami', grup: 'erisim', ad: 'API anahtarı uç kapsamı', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/api/kapsam.ts → UC_KIMLIKLERI · YAZMA_UCLARI · ucaErisim()',
    aciklama: 'UY-52 · Her anahtar hangi uçlara erişebileceğini sayarak bildirir; salt okunur işareti kapsam listesinden bağımsız ikinci katmandır. Kapsam rolü yalnız DARALTIR.',
    neden: 'Uç kütüğü kodun kendisiyle birebirdir: konsoldan yeni bir "uç" tanımlanabilseydi, var olmayan bir uca kapsam açılır ve kapsam listesi ürünün gerçeğinden koparadı. Yazma uçları listesi de bir güvenlik sınırıdır — ekrandan düzenlenebilseydi salt okunur bir anahtar yazma yapabilirdi.' },
  { kod: 'apiSozlesmesi', grup: 'erisim', ad: 'OpenAPI sözleşmesi', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/api/sozlesme.ts → openapiBelgesi()',
    aciklama: 'UY-52 · Belge uç kütüğünden ve zod şemalarından üretilir; ekranı /api-sozlesmesi. `servers` alanı bilerek YOKTUR.',
    neden: 'Elle düzenlenebilen bir sözleşme ilk uç değişikliğinde sessizce yanlışa döner ve entegrasyonu yazan taraf yanlış belgeye göre kod üretir. Belge ürünün türevi olmalı, ürünün yanında duran bir dosya değil.' },
  { kod: 'ssoMfa', grup: 'erisim', ad: 'Kurumsal kimlik (SSO) ve MFA', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/altyapi/kimlikSaglayici.ts → ssoSaglayici · mfaSaglayici',
    aciklama: 'UY-53 · Bugün giriş ürünün KENDİ kullanıcı kütüğündendir; SSO bağlı DEĞİLDİR ve ürün ikinci faktör istemez. Hazırlık ekranı bunu satır olarak gösterir.',
    neden: 'Tenant kimliği, metadata adresi ve claim eşlemesi kurumdan gelir; konsola örnek bir değer yazmak, kurulumda kimsenin değiştirmediği ve sessizce yanlış yere bakan bir yapılandırma bırakırdı.' },
  { kod: 'denetciErisimi', grup: 'erisim', ad: 'Dış denetçi erişimi', sinif: 'A', yer: 'mevcut_ekran', rota: '/denetci-erisimi',
    aciklama: 'UY-57 · Davet, süre (tavan 365 gün), santral kapsamı, iptal ve erişim izi. Davet `dis_denetci` yetki satırlarını açar; iptal ve süre sonu kapatır.' },
  { kod: 'rolMatrisi', grup: 'erisim', ad: 'Rol → modül izin matrisi', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/erisim.ts → ROL_IZINLERI',
    aciklama: '9 rol × 7 modül × okuma/yazma/onay.',
    neden: 'RBAC çekirdek yetki motoru: konsoldan düzenlenebilir olsaydı yetki yükseltme tek kayıt uzağında olurdu. Sunucu tarafı kapı, salt okunur gösterim.' },
  { kod: 'oturumPolitikasi', grup: 'erisim', ad: 'Oturum ve parola politikası', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/auth.ts',
    aciklama: 'Oturum ömrü, çerez, parola özeti.', neden: 'Güvenlik kontrol kapısı; değişiklik kod incelemesi ister.' },

  /* ═ 7 · ENTEGRASYON & VERİ ════════════════════════════════════════════ */
  { kod: 'connector', grup: 'entegrasyon', ad: 'Connector tanımları', sinif: 'A', yer: 'mevcut_ekran', rota: '/ice-aktarim',
    aciklama: 'Tip, ortam, poll aralığı, sır referansı, santral kapsamı; test / kuru koşu / senkron.' },
  { kod: 'connectorEsleme', grup: 'entegrasyon', ad: 'Connector ↔ eşleme profili bağı', sinif: 'A', yer: 'mevcut_ekran', rota: '/esleme',
    aciklama: 'Hangi connector hangi profil sürümüyle okunur.' },
  { kod: 'iceAktarim', grup: 'entegrasyon', ad: 'İçe aktarım profilleri (katalog / varlık)', sinif: 'A', yer: 'mevcut_ekran', rota: '/varlik-aktarim',
    aciklama: 'Dosyadan aktarım, doğrulama ve onay.' },
  { kod: 'reddedilenler', grup: 'entegrasyon', ad: 'Reddedilen kayıtlar (dead-letter)', sinif: 'A', yer: 'mevcut_ekran', rota: '/saglik',
    aciklama: 'Sözleşmeyi geçmeyen kayıtlar; neden ve yeniden deneme.' },
  { kod: 'veriKalitesiEsik', grup: 'entegrasyon', ad: 'Veri kalitesi eşikleri', sinif: 'B', yer: 'konsol', hedefTipi: 'ayar',
    aciklama: 'Bayatlık 30 gün · 3 periyot · inceleme yığılması 14 gün.', etki: ['veri_kalitesi', 'Sağlık'] },
  { kod: 'kokenKurallari', grup: 'entegrasyon', ad: 'Köken (provenance) kuralları', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/entegrasyon/koken.ts',
    aciklama: 'Hangi kaynağın hangi alanı yazabileceği, çakışma çözümü.',
    neden: 'Veri doğrulama çekirdeği: denetim izinin güvenilirliği bu kurallara dayanır.' },
  { kod: 'connectorSozlesme', grup: 'entegrasyon', ad: 'Connector sözleşmesi / adaptörler', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/entegrasyon/sozlesme.ts · adaptorler/',
    aciklama: 'Adaptör arayüzü ve gözlem şeması.', neden: 'Kod sözleşmesi; yeni adaptör = kod + test.' },

  /* ═ 8 · GÖRÜNÜM & İÇERİK ══════════════════════════════════════════════ */
  { kod: 'sahaPencere', grup: 'gorunum', ad: 'Saha pencereleri', sinif: 'A', yer: 'konsol', hedefTipi: 'ayar',
    aciklama: 'Odak kuyruğu 12 kayıt · takvim 90 gün · akış 12 hafta.', etki: ['Saha'] },
  { kod: 'kunye', grup: 'gorunum', ad: 'Ayak künye metni', sinif: 'A', yer: 'konsol', hedefTipi: 'ayar',
    aciklama: 'Her ekranın ayağındaki platform adı.', etki: ['Kabuk'] },
  { kod: 'gorselEsleme', grup: 'gorunum', ad: 'Santral görsel eşlemesi', sinif: 'A', yer: 'mevcut_ekran', rota: '/yonetim-tezgahi?bolum=organizasyon&modul=tesisGorsel',
    aciklama: 'Organizasyon grubunda yönetilir (aynı kayıt, iki giriş).' },
  { kod: 'moduleGorunurluk', grup: 'gorunum', ad: 'Dashboard modül görünürlüğü / KPI sırası', sinif: 'A', yer: 'konsol', hedefTipi: 'ayar',
    aciklama: 'Saha sunum bloklarının açık/kapalı durumu ve KPI sırası; güvenli beyaz liste (lib/yonetim/sahaModulleri.ts), zorunlu modül gizlenemez, tek ekran sözleşmesi hesaplanır.',
    etki: ['Saha'] },
  { kod: 'yardim', grup: 'gorunum', ad: 'Yardım içeriği', sinif: 'C', yer: 'kod',
    kodYeri: 'app/(kabuk)/(operasyonel)/yardim · tests/yardim.test.ts',
    aciklama: 'Okuma anahtarı, kısayollar, ekran açıklamaları.',
    neden: 'Yardım metni ekran sözleşmesiyle birlikte sürümlenir ve testle rotalara bağlıdır; serbest metin rotayla ayrışırdı.' },
  { kod: 'menu', grup: 'gorunum', ad: 'Menü sıralaması / görünürlüğü', sinif: 'C', yer: 'kod',
    kodYeri: 'components/kabuk/yonler.ts',
    aciklama: 'Beş alan ve ikincil sıralar.',
    neden: 'Gezinme bilgi mimarisi ölçülmüş tasarım sözleşmesidir; görünürlük yetkiden türetilir (gizleme ≠ yetki).' },
  { kod: 'durumSemantigi', grup: 'gorunum', ad: 'Durum sözcükleri ve sistem mesajları', sinif: 'C', yer: 'kod',
    kodYeri: 'components/kabuk/temel.tsx → DURUM_SOZU · lib/sabitler.ts',
    aciklama: 'Uyumlu / kısmi / uyumsuz / planlı / bilinmiyor; boş durum metinleri.',
    neden: 'Durum semantiği güvenlik ve ölçüm sözleşmesidir; "bilinmiyor" sözcüğünün değiştirilmesi yanlış güven üretir.' },
  { kod: 'tasarimBelirtecleri', grup: 'gorunum', ad: 'Tasarım belirteçleri (renk, tip, aralık)', sinif: 'C', yer: 'kod',
    kodYeri: 'app/kabuk.css · /sistem',
    aciklama: 'Palet, yazı aileleri, yoğunluk.', neden: 'Kontrast ve erişilebilirlik kapıları belirteç üzerinde ölçülür; serbest değişiklik kapıyı boşa çıkarır.' },

  /* ═ 9 · SİSTEM ════════════════════════════════════════════════════════ */
  { kod: 'motorBayraklari', grup: 'sistem', ad: 'Motor bayrakları (zamanlanmış koşu)', sinif: 'B', yer: 'konsol', hedefTipi: 'ayar',
    aciklama: '9 motorun zamanlayıcı tarafından koşturulup koşturulmayacağı; elle çalıştırma etkilenmez.', etki: ['zamanlayıcı'] },
  { kod: 'isler', grup: 'sistem', ad: 'İşler, kuyruk, son koşular', sinif: 'A', yer: 'mevcut_ekran', rota: '/saglik',
    aciklama: 'Motor ve connector koşuları; elle tetikleme.' },
  { kod: 'saklamaPolitikasi', grup: 'sistem', ad: 'Saklama · legal hold · imha', sinif: 'A', yer: 'mevcut_ekran', rota: '/saklama',
    aciklama: 'UY-56 · Kayıt ailesi başına saklama süresi ve dayanağı, hukuki muhafaza, dört gözle onaylanan imha kararı. Ürün kendiliğinden hiçbir kaydı silmez.' },
  { kod: 'degismezAileler', grup: 'sistem', ad: 'Değişmez kayıt aileleri', sinif: 'C', yer: 'kod',
    kodYeri: 'lib/uyum/saklama.ts → DEGISMEZ_TIPLER',
    aciklama: 'UY-56 · `AktiviteKaydi` ve `DegerlendirmeTarihcesi`: saklama süresi tanımlanabilir, imha kararı ASLA uygulanamaz.',
    neden: 'Değişmezlik veritabanı tetikleyicileriyle uygulanır; konsoldan bir aileyi listeden çıkarmak, tetikleyicinin reddedeceği bir imha kararının açılmasına izin verirdi. Kural kodda ve şemada aynı anda durmalı.' },
  { kod: 'yukOlcumu', grup: 'sistem', ad: 'Yük ölçümü ve performans tabanı', sinif: 'C', yer: 'kod',
    kodYeri: 'arac/yuk.mjs · arac/performans-tabani.json',
    aciklama: 'UY-55 · Ölçüm TOHUM VERİSİYLE koşar ve araç bunu her koşuda ekrana yazar; gerileme kapısı yine çalışır.',
    neden: 'Gerçek veri hacmi ve eşzamanlılık hedefleri kurumdan gelir. Konsola bir hedef yazmak, ölçülmemiş bir eşiği ölçülmüş gibi gösterirdi.' },
  { kod: 'denetimIzi', grup: 'sistem', ad: 'Denetim izi (aktivite kaydı)', sinif: 'C', yer: 'kod',
    kodYeri: 'prisma/migrations/20260830190000_denetim_izi_degismezligi',
    aciklama: 'Kim, ne zaman, neyi, hangi gerekçeyle; DB tetikleyicileriyle değişmez.',
    neden: 'Denetim izi değişmezliği: güncelleme/silme veritabanı seviyesinde engellenir; konsol yalnız okur (/aktivite).' },
  { kod: 'ortam', grup: 'sistem', ad: 'Ortam ve sürüm', sinif: 'C', yer: 'kod',
    kodYeri: 'package.json · NEXT_PUBLIC_DEMO · NODE_ENV',
    aciklama: 'Sürüm numarası ve demo / geliştirme / üretim.', neden: 'Yayın anında belirlenir; elle yazılan sürüm yalan söyler.' },
  { kod: 'migration', grup: 'sistem', ad: 'Şema / migration davranışı', sinif: 'C', yer: 'kod',
    kodYeri: 'prisma/schema.prisma · prisma/migrations',
    aciklama: 'Tablolar, kısıtlar, tetikleyiciler.', neden: 'Veri modeli; konsoldan değişmesi denetim izini ve testleri geçersiz kılar.' },
];

export const MODUL_SOZLUGU: Record<string, Modul> = Object.fromEntries(MODULLER.map((m) => [m.kod, m]));

/** Ayar anahtarı → onu taşıyan konsol modülü (grup ve ön ek eşlemesi). */
export function ayarinModulu(anahtar: string): Modul | null {
  if (anahtar.startsWith('risk.esik.')) return MODUL_SOZLUGU.riskEsik;
  if (anahtar.startsWith('motor.son_tarih.')) return MODUL_SOZLUGU.sonTarihUfku;
  if (anahtar.startsWith('motor.erisim.')) return MODUL_SOZLUGU.erisimEsik;
  if (anahtar.startsWith('motor.veri_kalitesi.')) return MODUL_SOZLUGU.veriKalitesiEsik;
  if (anahtar.startsWith('kanit.tazelik.')) return MODUL_SOZLUGU.kanitTazelik;
  /* İkisi de SUNUM ayarıdır ve aynı modülde durur; `sahaPencere` sayısal
     pencerelerin (kuyruk / takvim / akış) yeridir, görünürlüğün değil. */
  if (anahtar === 'saha.yerlesim' || anahtar === 'saha.olculmemis') return MODUL_SOZLUGU.moduleGorunurluk;
  if (anahtar.startsWith('saha.')) return MODUL_SOZLUGU.sahaPencere;
  if (anahtar === 'kabuk.kunye') return MODUL_SOZLUGU.kunye;
  if (anahtar === 'zamanlayici.motor_aralik_dk') return MODUL_SOZLUGU.motorAralik;
  if (/^motor\.[a-z_]+\.etkin$/.test(anahtar)) return MODUL_SOZLUGU.motorBayraklari;
  return null;
}

/** Modülün ayar anahtarları. */
export function modulAyarlari(kod: string): string[] {
  return AYARLAR.filter((a) => ayarinModulu(a.anahtar)?.kod === kod).map((a) => a.anahtar);
}

/* ── Kapsama ölçüsü ──────────────────────────────────────────────────────
   ADMIN COVERAGE = (A/B modüllerden BUGÜN yönetilebilen) / (tüm A/B modül).
   C modüller pay ve paydaya GİRMEZ: kodda kalmaları karardır, eksik değil.
   `eksik` modüller paydada kalır, payda sayılmaz — dürüst ölçü. */
export function kapsamaOzeti(moduller: readonly Modul[] = MODULLER) {
  const ab = moduller.filter((m) => m.sinif !== 'C');
  const yonetilen = ab.filter((m) => m.yer === 'konsol' || m.yer === 'mevcut_ekran');
  const eksik = ab.filter((m) => m.yer === 'eksik');
  const kodda = moduller.filter((m) => m.sinif === 'C');
  return {
    toplam: moduller.length,
    ab: ab.length,
    yonetilen: yonetilen.length,
    konsol: ab.filter((m) => m.yer === 'konsol').length,
    mevcutEkran: ab.filter((m) => m.yer === 'mevcut_ekran').length,
    eksik: eksik.length,
    eksikler: eksik.map((m) => m.kod),
    a: moduller.filter((m) => m.sinif === 'A').length,
    b: moduller.filter((m) => m.sinif === 'B').length,
    c: kodda.length,
  };
}

/** Kütük tutarlılığı — test bu yüklemleri doğrular. */
export function kutukTutarli(moduller: readonly Modul[] = MODULLER): string[] {
  const hatalar: string[] = [];
  const kodlar = new Set<string>();
  for (const m of moduller) {
    if (kodlar.has(m.kod)) hatalar.push(`kopya kod: ${m.kod}`);
    kodlar.add(m.kod);
    if (m.sinif === 'C' && m.yer !== 'kod') hatalar.push(`${m.kod}: C sınıfı yer=kod olmalı`);
    if (m.sinif === 'C' && !m.neden) hatalar.push(`${m.kod}: C sınıfı neden yazmalı`);
    if (m.sinif !== 'C' && m.yer === 'kod') hatalar.push(`${m.kod}: A/B sınıfı kodda kalamaz`);
    if (m.yer === 'eksik' && !m.neden) hatalar.push(`${m.kod}: eksik modül nedenini yazmalı`);
    if (m.yer === 'mevcut_ekran' && !m.rota) hatalar.push(`${m.kod}: mevcut ekran rotası yok`);
    if (m.yer === 'konsol' && !m.hedefTipi && m.kod !== 'degisiklikTalepleri') hatalar.push(`${m.kod}: konsol modülü hedefTipi ister`);
    if (m.hedefTipi && m.hedefTipi !== 'ayar' && m.yer === 'konsol' && !m.alanlar?.length)
      hatalar.push(`${m.kod}: katalog modülü form alanı ister`);
  }
  for (const a of AYARLAR) {
    if (!ayarinModulu(a.anahtar)) hatalar.push(`ayar modülsüz: ${a.anahtar}`);
  }
  return hatalar;
}
