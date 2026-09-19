/* Rota → ALAN ve YOĞUNLUK eşlemesi; tek kabuğun gezinme yapısı.

   ── TEK KABUK (UX denetimi 2026-09, PR #7 · §4–§5) ─────────────────────
   Üç ayrı kabuk (A tezgâh · B saha · C defter) BİRLEŞTİRİLDİ. Ölçülen
   gerekçe: aynı kullanıcı bir iş akışında üç palet, üç yazı ailesi, üç
   gezinme grameri görüyordu (52px+ray / 56px sekme / 122px künye);
   `/uyum`'da 207px'te başlayan içerik `/envanter`'de 52px'te başlıyordu.
   Şimdi: 56px üst çubuk + (alanı varsa) 36px ikincil sıra + gövde +
   sistem durumu + ayak. Saha'nın dili MASTER'dır — bakır aksan, Barlow
   Condensed / Inter / JetBrains Mono — ama Saha'nın yerleşimi diğer
   alanlara kopyalanmaz: yalnız dil ortaktır, düzen alana göredir.

   YOĞUNLUK, kabuğun değil ekranın ölçüsüdür (satır yüksekliği, dolgu,
   ayak boyu): amiral (fotoğrafik, tek ekran) · operasyonel (tablo/matris)
   · tezgâh (yoğun mühendislik ekranı). Palet ve tipografi ÜÇÜNDE AYNIDIR.

   Bu dosya SALT SUNUMDUR: URL'ler, RBAC, kapsam ve veri sözleşmeleri
   değişmez. */

import { tBas, type Sozluk, type TerimAnahtari } from '@/lib/dil/terimler';

export type Yogunluk = 'amiral' | 'operasyonel' | 'tezgah';

/* `alt`: öğenin ÜÇÜNCÜL ekranları (yalnız Varlık'ta). Grubun kendi yolu
   ilk alt ekranıdır; grup bağı oraya gider, alt ekranlar üçüncül sırada
   (`.ab-ucuncul`) listelenir. */
export type Oge = { ad: string; yol: string; kod?: string; ayrik?: boolean; alt?: Oge[] };

/* ── Alanlar — beş birincil alan ──────────────────────────────────────
   Risk artık KENDİ alanıdır (eskiden defterin bir sekmesi + varlık
   rayının bir öğesiydi, iki yerde birden). Beş alan ürünün beş sorusudur:
   ne oluyor (Saha) · nasıl karşılaştırılır (Portföy) · uygun muyuz (Uyum)
   · neyimiz var (Varlık) · ne ters gidebilir (Risk). */
/* Adlar ÇEKİRDEK varsayılanıdır: sözlük yokken (sektör paketi kurulu
   değil ya da kapsam tek sektöre inmiyor) ekranda görünen budur.
   Kiracının sözlüğü varsa kabuk `alanlariCoz` ile ezer — modül sabiti
   React bilmez, `useTerim()` burada çağrılamaz. */
export const ALANLAR: Oge[] = [
  { ad: 'Saha', yol: '/' },
  { ad: 'Portföy', yol: '/portfoy' },
  { ad: 'Uyum', yol: '/uyum' },
  { ad: 'Varlık', yol: '/envanter' },
  { ad: 'Risk', yol: '/riskler' },
];

/** Alan adlarının sözlükle çözülmüş hâli. Yalnız `/portfoy` terimlidir;
    diğer dördü çekirdek kavramdır ve sektör paketi onları değiştirmez. */
export function alanlariCoz(sozluk: Sozluk | null | undefined): Oge[] {
  return ALANLAR.map((o) => (o.yol === '/portfoy'
    ? { ...o, ad: tBas(sozluk, 'portfoy') } : o));
}

/* Rota → alan. Kanonik yol dışındaki her rota buradan alanına bağlanır;
   listede olmayan rota (ayarlar, yardım, bildirimler, sistem, yönetim
   tezgâhı) YARDIMCI'dır: alan yanmaz, ikincil sıra çizilmez. */
const ALAN_ROTALARI: Record<string, string[]> = {
  '/': ['/', '/tesisler'],
  '/portfoy': ['/portfoy', '/harita'],
  '/uyum': [
    '/uyum', '/regulasyonlar', '/paketler', '/mevzuat-radari', '/kisisel-veri',
    '/surecler', '/eslestirme', '/denetimler',
    '/bulgular', '/projeler', '/raporlar', '/dokumanlar', '/kanitlar', '/aktivite',
    '/degerlendirme-aktarim', '/denetci-erisimi', '/saklama',
    '/gozden-gecirme', '/egitimler',
  ],
  '/envanter': [
    '/envanter', '/kesif', '/varlik-aktarim', '/ice-aktarim', '/topoloji',
    '/prosesler', '/esleme',
    '/omur', '/tabanlar', '/yedekleme', '/tedarikciler', '/kimlik', '/yetkiler',
    '/olaylar', '/operasyon', '/saglik',
    '/sayim', '/yedek-parca', '/tasinabilir-medya',
    '/zimmetlerim',
  ],
  '/riskler': ['/riskler'],
};

/** Patikanın alanı (kanonik yol) ya da yardımcı rota için `null`. */
export function alanSec(patika: string): string | null {
  for (const [alan, rotalar] of Object.entries(ALAN_ROTALARI)) {
    if (rotalar.some((y) => aktifMi(y, patika))) return alan;
  }
  return null;
}

/** Sekme/alan aktifliği — alanın kendisi ya da alana bağlı bir rota. */
export function sekmeAktif(yol: string, patika: string): boolean {
  return alanSec(patika) === yol;
}

export function alanAktif(alan: Oge, patika: string): boolean {
  return sekmeAktif(alan.yol, patika);
}

/* ── İkincil sıra — alanın kendi ekranları ────────────────────────────
   Denetim §4: Uyum 3 grup · Varlık 5 operasyon grubu (iki harfli 16'lık
   ray KALDIRILDI; alt ekranlar üçüncül sırada) · Risk 2 · Portföy 2 ·
   Saha yok (Saha'nın tek ekranı kendisidir; tesis detayı şeritten
   açılır). Gruplar saç çizgisiyle ayrılır. */
/* Grubun ADI — ekran okuyucu için ZORUNLU, ekranda YAZILMAZ.

   Gören kullanıcı grupları dikey çizgiden ayırır (`.grup + .grup`
   border-left). Ekran okuyucu kullanan bunu göremez ve `/uyum`un on
   dokuz bağını TEK bir yığın olarak duyardı. Ad `aria-label` olarak
   verilir: yapı erişilebilir olur, satırın eni DEĞİŞMEZ — görünür bir
   başlık sırayı 1978'den 2176'ya çıkarırdı ve iki satır bütçesi 2260;
   ölçülen karakter genişliği ihtiyatlı bir ALT SINIR olduğu için
   (6,0 yerine gerçek ~6,34) üçüncü satır riski vardı.

   Önce `baslik?` diye isteğe bağlı ve GÖRÜNÜR bir alan vardı; hiçbir
   alanda doldurulmamıştı ve doldurulsa da `aria-hidden` ile gizlenirdi
   — yani hem ölü hem erişilemezdi. */
/** İkincil sıradaki grup. `ad` ÇEKİRDEK karşılıktır; `terim` verilmişse
    ekrana giden ad kiracının sözlüğünden çözülür — alan adlarıyla
    (`alanlariCoz`) aynı kural. Tek sektöre inen bir kapsamda üst alan
    "Enerji portföyü" derken grubun "Portföy" demesi, ekran okuyucuya
    ürünün kendi sözlüğünü YALANLAYAN bir ad duyurur. */
export type Grup = { ad: string; terim?: TerimAnahtari; ogeler: Oge[] };

export const IKINCIL: Record<string, Grup[]> = {
  /* ── UYUM · VARLIK'IN İKİ KADEMELİ GRAMERİ ────────────────────────────
     ÖLÇÜLEN KUSUR (15 Eylül 2026, kullanıcı geri bildirimi + ekran
     görüntüsü): Uyum alanı ikincil sırada ON DOKUZ düz sekme çiziyordu —
     üç satır gezinme, ~30 büyük harfli etiket, içerik 180px'te. Kullanıcı
     "her tarafta metin var, nereye odaklanacağımı anlamıyorum" dedi ve
     haklıydı: her şey aynı ağırlıkta konuşunca hiçbir şey öne çıkmaz.

     Varlık alanı aynı sorunu 2026-09'da çözmüştü (aşağıda): ikincil sırada
     YALNIZ gruplar, aktif grubun ekranları üçüncül sırada. Uyum o zaman
     düz kalmıştı ve iki alan iki ayrı gramer konuşuyordu — bu da başlı
     başına bir bilişsel yük. Bugün Uyum aynı grameri alır: üç grup sekmesi
     (Uyum durumu · Denetim ve aksiyon · Kayıt ve kanıt), aktif grubun
     ≤9 ekranı üçüncül sırada. 19 → 3 + ≤9; hiçbir rota kaybolmaz.

     Grubun kendi yolu ilk ekranıdır (Varlık'la aynı kural); öğelerin
     yerleşim gerekçeleri (UY-43, UY-56, UY-57, UY-65, UY-66, P4, R1, R15)
     alt listelerde olduğu gibi durur. */
  '/uyum': [
    { ad: 'Uyum', ogeler: [
      { ad: 'Uyum durumu', yol: '/uyum', alt: [
        { ad: 'Matris', yol: '/uyum' },
        { ad: 'Regülasyonlar', yol: '/regulasyonlar' },
        /* P4 · 2.6 · İçerik paketleri Regülasyonlar'ın YANINDA: paket
           regülasyonu getirir (taslak), aktifleştirme oradadır. */
        { ad: 'İçerik paketleri', yol: '/paketler' },
        /* R1 · Mevzuat radarı Regülasyonlar'ın YANINDA: radar bir
           regülasyonun DEĞİŞTİĞİNİ önerir, kararı oradaki akış verir.
           Ayrı bir üst başlığa koymak, "mevzuat değişti" ile "mevzuatımız
           ne" sorularını iki ayrı yere bölerdi. */
        { ad: 'Mevzuat radarı', yol: '/mevzuat-radari' },
        /* R15 · Kişisel veri koruma SÜREÇLERİN yanında: işleme envanterinin
           her satırı bir İŞ SÜRECİNE bağlıdır ve bağsız kaydedilemez.
           Ayrı bir üst başlığa koymak, "hangi süreç" ile "o süreçte hangi
           kişisel veri" sorularını iki ayrı yere bölerdi. Ad çekirdekte
           mevzuat adı taşımaz; TR kiracısında paket terimi "KVKK" der. */
        /* Ad kısa: üçüncül sıra SARAMAZ (30px sabit, yatay kayar) ve
           "Uyum durumu" sırası sekiz bağ taşır — ölçüldü, uzun adlarla
           1 143px, 1024px bandını taşırıyordu (SIS-KBK-017). Üst öğe
           bağlamı verir; "koruma" ekranın kendi başlığında durur. */
        { ad: 'Kişisel veri', yol: '/kisisel-veri' },
        { ad: 'Süreçler', yol: '/surecler' },
        { ad: 'Çapraz eşleme', yol: '/eslestirme' },
        /* UY-43 · Değerlendirme aktarımı MATRİSİN yanında durur çünkü
           matrisin içeriğini toplu değiştiren tek yol odur. Katalog
           aktarımı (`/ice-aktarim`) ayrıdır ve gezinmede yer almaz:
           o REGÜLASYONU aktarır, bu KURUMUN CEVABINI. */
        /* "Aktarım": Varlık'ın Envanter sırasındaki aynı gramer — üst öğe
           NEYİN aktarıldığını söyler (uyum durumu › aktarım). */
        { ad: 'Aktarım', yol: '/degerlendirme-aktarim' },
      ]},
      { ad: 'Denetim ve aksiyon', yol: '/denetimler', alt: [
        { ad: 'Denetimler', yol: '/denetimler' },
        { ad: 'Bulgular & CAPA', yol: '/bulgular' },
        { ad: 'Projeler', yol: '/projeler' },
        /* UY-57 · Dış denetçi erişimi denetimlerin YANINDA durur: erişim
           bir denetime bağlı açılır ve denetim bitince kapanır. Yönetim
           tezgâhına koymak, denetimi yürüten kişinin hiç bakmadığı bir
           yere koymak olurdu. */
        { ad: 'Dış denetçi erişimi', yol: '/denetci-erisimi' },
        /* UY-65 · Yönetim gözden geçirmesi de bir denetim kaydıdır ve
           denetimde istenir; bu grup onun doğal yeri. */
        { ad: 'Yönetim gözden geçirme', yol: '/gozden-gecirme' },
      ]},
      { ad: 'Kayıt ve kanıt', yol: '/raporlar', alt: [
        { ad: 'Raporlar', yol: '/raporlar' },
        { ad: 'Belge kütüğü', yol: '/dokumanlar' },
        { ad: 'Kanıt', yol: '/kanitlar' },
        { ad: 'Denetim izi', yol: '/aktivite' },
        /* UY-56 · Saklama, kayıt ailelerinin durduğu grupta: bu grubun
           hepsi "hangi kaydı ne kadar tutuyoruz" sorusunun konusu. */
        { ad: 'Saklama ve imha', yol: '/saklama' },
        /* UY-66 · Eğitim kütüğü kanıt grubunda: eğitim kaydı bir kontrolün
           kanıtıdır ve kanıt kütüğüyle aynı soruya hizmet eder. */
        { ad: 'Eğitim kütüğü', yol: '/egitimler' },
      ]},
    ]},
  ],
  '/riskler': [
    { ad: 'Risk', ogeler: [
      { ad: 'Risk kütüğü', yol: '/riskler' },
      { ad: 'Bulgular & CAPA', yol: '/bulgular' },
    ]},
  ],
  /* Varlık: ikincil sırada YALNIZ beş operasyon grubu görünür (ürün
     sahibi, benchmark kabulü 2026-09: 14 bağ ekrana sığsa da okunmuyordu).
     Alt ekranlar grubun üçüncül sırasında; depo rota yapısı gezinmeye
     dökülmez — `/ice-aktarim` (katalog/model içe aktarımı) gezinmede yer
     almaz, Regülasyonlar ve Yedekleme ekranlarındaki eylemden açılır,
     alanı Varlık kalır. */
  '/envanter': [
    { ad: 'Varlık operasyonları', ogeler: [
      { ad: 'Envanter', yol: '/envanter', alt: [
        { ad: 'Varlık', yol: '/envanter' },
        { ad: 'Keşif', yol: '/kesif' },
        /* OT-55 · Sayım keşfin YANINDA durur ve onun tamamlayıcısıdır:
           keşif ağda görüneni bulur, sayım sahada duranı. İkisi aynı
           sorunun (envanter gerçekle tutuyor mu) iki yarısıdır. */
        { ad: 'Sayım', yol: '/sayim' },
        /* OT-09b · Zimmet sahiplikle aynı grupta: "bu cihazın sahibi kim"
           sorusunun cevabı, kimsenin onaylamadığı bir isim olmamalıdır. */
        { ad: 'Zimmetlerim', yol: '/zimmetlerim' },
        { ad: 'Aktarım', yol: '/varlik-aktarim' },
      ]},
      { ad: 'Ağ & bağımlılık', yol: '/topoloji', alt: [
        { ad: 'Topoloji', yol: '/topoloji' },
        /* OT-05 · Proses zinciri cihazın ÜRETİMDE nerede durduğunu söyler;
           topoloji ağda nerede durduğunu. İkisi aynı sorunun iki yüzü
           olduğu için aynı grupta durur. */
        { ad: 'Proses zinciri', yol: '/prosesler' },
        { ad: 'Eşleme', yol: '/esleme' },
      ]},
      { ad: 'Yaşam döngüsü', yol: '/omur', alt: [
        { ad: 'Ömür', yol: '/omur' },
        /* OT-22 · Firmware tabanı bir ömür kararıdır: hangi sürüm onaylı,
           hangisi geri çekilmiş. Ömür ve Yedekleme ile aynı grupta durur. */
        { ad: 'Firmware tabanları', yol: '/tabanlar' },
        { ad: 'Yedekleme', yol: '/yedekleme' },
        /* OT-56 · Yedek parça bir ömür kararıdır: EOL "ne zaman
           desteksiz kalacak", yedek parça "bugün bozulursa ne olur"
           sorusudur ve ikisi birlikte okunur. */
        { ad: 'Yedek parça', yol: '/yedek-parca' },
        { ad: 'Tedarikçiler', yol: '/tedarikciler' },
      ]},
      { ad: 'Erişim', yol: '/kimlik', alt: [
        { ad: 'Kimlik', yol: '/kimlik' },
        { ad: 'Yetkiler', yol: '/yetkiler' },
        /* OT-57 · Taşınabilir medya bir ERİŞİM yoludur: hava boşluklu
           bir sistemi ağdan değil, elden giren bir bellekle vurursunuz.
           Kimlik ve yetkilerle aynı grupta durmasının sebebi budur. */
        { ad: 'Taşınabilir medya', yol: '/tasinabilir-medya' },
      ]},
      { ad: 'Olay & değişiklik', yol: '/olaylar', alt: [
        { ad: 'Olaylar', yol: '/olaylar' },
        { ad: 'Değişim', yol: '/operasyon' },
        { ad: 'Sağlık', yol: '/saglik' },
      ]},
    ]},
  ],
  '/portfoy': [
    { ad: 'Portföy', terim: 'portfoy', ogeler: [
      { ad: 'Karşılaştırma', yol: '/portfoy' },
      { ad: 'Harita', yol: '/harita' },
    ]},
  ],
};

/** Patikanın ikincil sırası; Saha ve yardımcı rotalarda boş dizi.
    Sözlük verilirse `terim` taşıyan grup adı ondan çözülür. */
export function ikincilSec(patika: string, sozluk?: Sozluk | null): Grup[] {
  const alan = alanSec(patika);
  const gruplar = alan ? (IKINCIL[alan] ?? []) : [];
  return gruplar.map((g) => (g.terim ? { ...g, ad: tBas(sozluk, g.terim) } : g));
}

/** İkincil öğe aktif mi — kendi yolu ya da alt ekranlarından biri. */
export function ogeAktif(o: Oge, patika: string): boolean {
  return aktifMi(o.yol, patika) || (o.alt ?? []).some((a) => aktifMi(a.yol, patika));
}

/* ── DAR BANTTA İKİNCİL SIRA KATLANIR ─────────────────────────────────
   ÖLÇÜLEN KUSUR (mobil audit, 375×812, 77 rota): ikincil sıra dokunmatik
   bantta yatay KAYIYORDU ve gerekçesi "parmakla kaydırmak beklenen
   jesttir" diye yazılıydı. Gerekçe, NEREYE kaydıracağını bilen bir
   kullanıcıyı varsayıyordu; ölçüm tersini söyledi:

     · Kayan 45 rotanın 24'ünde AKTİF SEKME EKRANIN DIŞINDAYDI. En kötüsü
       `/egitimler`: aktif sekme sıranın 1 982'nci pikselinde, yani beş
       ekran ötede. Kullanıcı "neredeyim" sorusuna bakarak cevap veremez.
     · `/uyum` sırası 2 111px ve 375px'te ON DOKUZ BAĞIN ÜÇÜ görünüyor
       (%16). Kalan on altısı keşfedilmeyi bekliyor.
     · Grup adları (`aria-label`) yalnız ekran okuyucuya ulaşıyor; GÖREN
       kullanıcı üç çıplak sekme görüyor, hiyerarşiyi göremiyor.

   Bugün dar bantta sıra KATLANIR: tek bir düğme "hangi gruptayım ·
   hangi bölümdeyim" der, dokunulunca bütün bölümler GRUPLANMIŞ ve dikey
   okunur. Hiçbir rota gizlenmez — ulaşım yolu değişir; yatay körlemesine
   arama yerine tek dokunuş.

   EŞİK ÖLÇÜLDÜ, uydurulmadı: 375px'te sıra üç-dört bağ gösteriyor
   (ölçüldü: 19 bağlık sırada 3, 5 bağlıkta 4). Ürünün ikincil sıraları
   bugün iki · iki · üç · beş bağ taşıyor (Uyum on dokuzdan üçe indi —
   yukarıdaki iki kademeli gramer). İki ve üç bağlık sıralar 375px'e
   sığar (ölçüldü), beş bağlık sıra 519px ile sığmaz. Tavan bu iki
   ölçümün arasındadır ve DÖRTTÜR: dörtten çok bağ taşıyan sıra katlanır.
   Hiçbir gerçek sıra tavanın tam üstünde durmaz (`SIS-KBK-024`): öyle
   olsaydı bir bağ eklendiği gün davranış sessizce değişirdi. */
export const DAR_BANT_BAG_TAVANI = 4;

/** Dar bantta (≤700px) sıra katlanır mı — bağ sayısı tavanı aşıyorsa. */
export function katlanirMi(gruplar: readonly Grup[]): boolean {
  return gruplar.reduce((n, g) => n + g.ogeler.length, 0) > DAR_BANT_BAG_TAVANI;
}

/** Patikanın aktif ikincil öğesi ve onu taşıyan grup; yoksa `null`.
    Katlanmış sıranın düğmesi "neredeyim" sorusunu bununla cevaplar. */
export function aktifBolum(gruplar: readonly Grup[], patika: string):
{ grup: Grup; oge: Oge } | null {
  for (const grup of gruplar) {
    const oge = grup.ogeler.find((o) => ogeAktif(o, patika));
    if (oge) return { grup, oge };
  }
  return null;
}

/** Patikanın üçüncül sırası: aktif ikincil öğenin alt ekranları (yoksa null). */
export function ucunculSec(patika: string): { grup: Oge; ogeler: Oge[] } | null {
  for (const g of ikincilSec(patika)) {
    const o = g.ogeler.find((x) => x.alt && x.alt.length > 0 && ogeAktif(x, patika));
    if (o && o.alt) return { grup: o, ogeler: o.alt };
  }
  return null;
}

/* Risk alanı `/bulgular`ı Uyum'la PAYLAŞIR (CAPA iki alanın da kaydıdır)
   ama rota tek alana bağlıdır (Uyum). İkincil sırada `/bulgular` Risk
   altında da listelenir; oraya gidildiğinde Uyum alanı yanar — rota
   sahipliği tek, erişim yolu iki. Bilinçli: iki alan birden yanmaz. */

/* ── Kabuk üst çubuğu bağları ─────────────────────────────────────────
   Alanı olmayan ama her ekrandan ulaşılması gereken iki rota: `/ayarlar`
   (hesap) ve `/yardim` (okuma anahtarı + kısayollar). Ayak da
   `/yardim`'a bağlanır; üstteki bağ hesap kümesinin parçasıdır. */
export const UST_BAGLAR: Oge[] = [
  { ad: 'Ayarlar', yol: '/ayarlar' },
  { ad: 'Yardım', yol: '/yardim' },
];

/* ── Okunmamış bildirim rozeti ────────────────────────────────────────
   Rozet bir SAYIDIR, sınıflandırma değil: kaç kaydın okunmadığını yazar.
   Sıfırda rozet YOKTUR — "0" yazmak boş kutuyu bir uyarıymış gibi
   gösterirdi. 99'dan sonrası kırpılır: "300 okunmamış" ile "99+" aynı
   kararı verdirir — kutuya git. */
export const SAYAC_TAVANI = 99;

/** Hesap düğmesinin dar bant karşılığı: adın baş harfleri.

    ── NİÇİN VAR ─────────────────────────────────────────────────────
    ≤620px'te kişi bloğu (ad + unvan) düşüyor ve düğmeden geriye YALNIZ
    bir `▾` kalıyordu: ne kimin hesabı olduğu, ne de tıklanınca ne
    açılacağı görünüyordu. Erişilebilir ad `aria-label`da tamdı, yani
    ekran okuyucu kullanan biliyordu — GÖREN kullanıcı bilmiyordu.

    Baş harf bir ROZET DEĞİL METİNDİR: kabuğun yeni grameri bar içinde
    dolgu ve çerçeve tanımıyor (bkz. sayaç kararı). Dolayısıyla daire
    ya da kare içine alınmaz; mürekkep kademesiyle durur.

    Türkçe büyütme ZORUNLU: `'ı'.toUpperCase()` İngilizce kurallarla
    `'I'` verir ama `'i'` için `'I'` döner ve nokta kaybolur — TR'de
    `'i' → 'İ'`dir. Ad "İlker" olan bir kullanıcı başka birinin baş
    harfini görürdü. */
export function basHarfler(ad: string): string {
  const parcalar = String(ad ?? '').trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return '';
  const ilk = parcalar[0];
  const son = parcalar.length > 1 ? parcalar[parcalar.length - 1] : '';
  return `${[...ilk][0] ?? ''}${[...son][0] ?? ''}`.toLocaleUpperCase('tr-TR');
}

/** Rozet metni; sıfır ya da geçersiz sayıda `null` = rozet çizilmez. */
export function sayacMetni(n: number): string | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > SAYAC_TAVANI ? `${SAYAC_TAVANI}+` : String(Math.floor(n));
}

/** Ekran okuyucu etiketi — sayı kırpılmaz, gerçek değer okunur. */
export function sayacEtiketi(n: number): string {
  return `${Math.max(0, Math.floor(n))} okunmamış bildirim`;
}

/* ── Rota → yoğunluk ──────────────────────────────────────────────────
   amiral: fotoğrafik, tek ekrana sığan yüzeyler (Saha, Portföy, Harita,
   Tesis 360) — 28px sıkı ayak, dolgu geniş.
   tezgâh: mühendislik ekranları (keşif, topoloji, aktarımlar, sağlık,
   yönetim tezgâhı, sistem) — 32px satır, dolgu dar.
   operasyonel: geri kalan tablo/matris/kütük ekranları — 36px satır. */
const AMIRAL_YOLLARI = ['/', '/tesisler', '/portfoy', '/harita', '/giris'];
const TEZGAH_YOLLARI = [
  '/kesif', '/ice-aktarim', '/varlik-aktarim', '/topoloji', '/prosesler', '/esleme',
  '/operasyon', '/saglik', '/yonetim-tezgahi', '/api-sozlesmesi', '/sistem',
];

export function yogunlukSec(patika: string): Yogunluk {
  if (AMIRAL_YOLLARI.some((y) => aktifMi(y, patika))) return 'amiral';
  if (TEZGAH_YOLLARI.some((y) => aktifMi(y, patika))) return 'tezgah';
  return 'operasyonel';
}

/** Aktif mi — `/riskler/[id]` de `/riskler` sekmesini aktif eder. */
export function aktifMi(yol: string, patika: string): boolean {
  if (yol === '/') return patika === '/';
  return patika === yol || patika.startsWith(`${yol}/`);
}
