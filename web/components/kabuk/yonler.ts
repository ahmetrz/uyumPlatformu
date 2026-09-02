/* Rota → YÖN eşlemesi ve her yönün gezinme yapısı.

   Görsel source of truth: on iki orijinal HTML prototipi
   (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §6). Üç yön üç AYRI KABUKTUR —
   tek bir gramerin renk varyantları değil:

     A · Industrial Precision — 52px kapsam çubuğu + 60px ikon rayı
     B · Energy Intelligence  — ray YOK, 56px yatay sekme, fotoğrafik hero
     C · Operational Luxury   — künye + serif sekme + 212px editoryal dizin

   Bu dosya SALT SUNUMDUR: URL'ler, RBAC, kapsam ve veri sözleşmeleri
   değişmez. */

export type Yon = 'a' | 'b' | 'c';

export type Oge = { ad: string; yol: string; kod?: string; ayrik?: boolean };

/* ── Alanlar — üç kabuğun ORTAK üst gezinmesi ─────────────────────────
   Ürünün beş alanı; her kabuk bunları kendi gramerinde çizer (B'de sekme,
   A'da kapsam çubuğundaki bağlantı dizisi, C'de künyedeki bölüm dizisi).
   Kabuklar birbirinden ayrı kapılar değil, aynı binanın katlarıdır:
   hangi ekranda olursa olsun kişi diğer alana TEK tıkla geçer. Eskiden
   A'dan C'ye ya da C'den portföye gitmenin tek yolu ana ekrana dönmekti
   ("bazı sayfalar arası geçiş yapılamıyor" — ölçüldü, erişim taraması). */
export const ALANLAR: Oge[] = [
  { ad: 'Saha', yol: '/' },
  { ad: 'Portföy', yol: '/portfoy' },
  { ad: 'Uyum', yol: '/uyum' },
  { ad: 'Varlık', yol: '/envanter' },
  { ad: 'Risk', yol: '/riskler' },
];

/* Kabuğun EV alanı: o kabuktaki bir rota hiçbir alanla doğrudan
   eşleşmiyorsa (ör. `/kesif` A'da, `/denetimler` C'de, `/tesisler/x` B'de)
   kabuğun ev alanı aktif sayılır — kişi "hangi alandayım" sorusuna her
   ekranda cevap alır. */
const EV_ALAN: Record<Yon, string> = { a: '/envanter', b: '/', c: '/uyum' };

/* Bir alanın KARDEŞ rotaları: alanın kanonik yolu değildir ama o alanın
   okumasıdır. `/harita` portföyün coğrafi okumasıdır — sekme çubuğunda
   "Portföy" yanmazsa kişi hangi alanda olduğunu bilemez (rota duman:
   "aktif öğe yok"). Kardeşlik TEK YÖNLÜDÜR: /portfoy açıkken harita
   yanmaz, tersi yanar. */
const KARDES_ALAN: Record<string, string> = { '/harita': '/portfoy' };

/** Sekme/alan aktifliği — kanonik eşleşme ya da kardeş rota. */
export function sekmeAktif(yol: string, patika: string): boolean {
  return aktifMi(yol, patika) || KARDES_ALAN[patika] === yol;
}

export function alanAktif(alan: Oge, patika: string): boolean {
  if (sekmeAktif(alan.yol, patika)) return true;
  const ev = EV_ALAN[yonSec(patika)];
  return alan.yol === ev
    && !ALANLAR.some((a) => a.yol !== ev && sekmeAktif(a.yol, patika));
}

/* ── B · saha ─────────────────────────────────────────────────────────
   Yatay sekme çubuğu. Prototipte beş sekme vardı; ürünün B yüzeyi de beş
   yüzeye oturuyor — ve bu beş, ortak alan listesinin kendisidir. */
export const B_SEKMELER: Oge[] = ALANLAR;

/* ── A · tezgâh ───────────────────────────────────────────────────────
   İkon rayı: iki harf monogram + 7,5px etiket, öğe 40px. Prototipte
   altıncı öğeden sonra 33px boşluk vardı — grup BAŞLIĞI değil, "buradan
   sonrası günlük tezgâh değil, kurulum ve kayıt" diyen bir ayraç. */
export const A_RAY: Oge[] = [
  { kod: 'VR', ad: 'Varlık', yol: '/envanter' },
  { kod: 'KŞ', ad: 'Keşif', yol: '/kesif' },
  { kod: 'AĞ', ad: 'Topoloji', yol: '/topoloji' },
  { kod: 'ÖM', ad: 'Ömür', yol: '/omur' },
  { kod: 'YD', ad: 'Yedek', yol: '/yedekleme' },
  { kod: 'ER', ad: 'Erişim', yol: '/kimlik' },
  { kod: 'TD', ad: 'Tedarik', yol: '/tedarikciler' },
  { kod: 'OL', ad: 'Olay', yol: '/olaylar' },
  { kod: 'DĞ', ad: 'Değişim', yol: '/operasyon' },
  { kod: 'SĞ', ad: 'Sağlık', yol: '/saglik' },
  { kod: 'BL', ad: 'Bildirim', yol: '/bildirimler' },
  { kod: 'YT', ad: 'Yetki', yol: '/yetkiler', ayrik: true },
  { kod: 'EŞ', ad: 'Eşleme', yol: '/esleme' },
  { kod: 'VA', ad: 'V.aktarım', yol: '/varlik-aktarim' },
  { kod: 'MA', ad: 'M.aktarım', yol: '/ice-aktarim' },
  { kod: 'YN', ad: 'Yönetim', yol: '/yonetim-tezgahi' },
];

/* ── C · defter ───────────────────────────────────────────────────────
   Serif sekmeler. Prototipte beş sekme + sağda çerçeve bilgisi. */
export const C_SEKMELER: Oge[] = [
  { ad: 'Uyum', yol: '/uyum' },
  { ad: 'Risk & CAPA', yol: '/riskler' },
  { ad: 'Denetim', yol: '/denetimler' },
  { ad: 'Bulgu', yol: '/bulgular' },
  { ad: 'Proje', yol: '/projeler' },
  { ad: 'Kayıt', yol: '/aktivite' },
];

/* C dizin sütunu, aktif sekmenin komşu ekranlarını taşır — içindekiler
   tablosu ve kaynakça aynı sütunda (prototip `c-compliance` sol kolonu). */
export const C_DIZIN: { baslik: string; ogeler: Oge[] }[] = [
  { baslik: 'Uyum', ogeler: [
    { ad: 'Uyum matrisi', yol: '/uyum' },
    { ad: 'Uyum süreçleri', yol: '/surecler' },
    { ad: 'Regülasyonlar', yol: '/regulasyonlar' },
    { ad: 'Çapraz eşleme', yol: '/eslestirme' },
  ]},
  { baslik: 'Kütük', ogeler: [
    { ad: 'Risk kütüğü', yol: '/riskler' },
    { ad: 'Denetimler', yol: '/denetimler' },
    { ad: 'Bulgu & CAPA', yol: '/bulgular' },
    { ad: 'Projeler', yol: '/projeler' },
  ]},
  { baslik: 'Kayıt', ogeler: [
    { ad: 'Raporlar', yol: '/raporlar' },
    { ad: 'Belge kütüğü', yol: '/dokumanlar' },
    { ad: 'Kanıt kütüphanesi', yol: '/kanitlar' },
    { ad: 'Kanıt paketi', yol: '/raporlar/kanit-paketi' },
    { ad: 'Denetim izi', yol: '/aktivite' },
  ]},
];

/* ── Kabuk üst çubuğu bağları ─────────────────────────────────────────
   Rayda ve sekmede YERİ OLMAYAN ama her ekrandan ulaşılması gereken iki
   rota: `/ayarlar` (hesap) ve `/yardim` (okuma anahtarı + kısayollar).
   İkisi de A'ya düşer (varsayılan yön) — tezgâh ekranı değildirler, o
   yüzden rayda değil, üç kabuğun üst çubuğunda Çıkış'ın yanında dururlar. */
export const UST_BAGLAR: Oge[] = [
  { ad: 'Ayarlar', yol: '/ayarlar' },
  { ad: 'Yardım', yol: '/yardim' },
];

/* ── Okunmamış bildirim rozeti ────────────────────────────────────────
   Rozet bir SAYIDIR, sınıflandırma değil: kaç kaydın okunmadığını yazar.
   Sıfırda rozet YOKTUR — "0" yazmak boş kutuyu bir uyarıymış gibi
   gösterirdi. 99'dan sonrası kırpılır: ray hücresi üç haneyi taşımaz ve
   "300 okunmamış" ile "99+" aynı kararı verdirir — kutuya git. */
export const SAYAC_TAVANI = 99;

/** Rozet metni; sıfır ya da geçersiz sayıda `null` = rozet çizilmez. */
export function sayacMetni(n: number): string | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > SAYAC_TAVANI ? `${SAYAC_TAVANI}+` : String(Math.floor(n));
}

/** Ekran okuyucu etiketi — sayı kırpılmaz, gerçek değer okunur. */
export function sayacEtiketi(n: number): string {
  return `${Math.max(0, Math.floor(n))} okunmamış bildirim`;
}

/* ── Rota → yön ───────────────────────────────────────────────────────
   Uygulama haritası §6 ile birebir. Eşleşmeyen rota A'ya düşer: tezgâh
   yönü en nötr olanıdır ve yeni bir yönetim ekranı eklendiğinde sessizce
   yanlış KABUĞA değil, en yakın kabuğa oturur. */
/* Harita portföyün bir GÖRÜNÜMÜDÜR: aynı veri, aynı kapsam, farklı
   okuma. Bu yüzden B saha yüzeyine düşer, kendi alanını açmaz. */
const B_YOLLAR = ['/', '/tesisler', '/portfoy', '/harita', '/giris'];
const C_YOLLAR = [
  '/uyum', '/regulasyonlar', '/riskler', '/denetimler', '/bulgular',
  '/projeler', '/surecler', '/raporlar', '/eslestirme', '/aktivite',
  /* Kanıt kütüphanesi defterin "Kayıt" bölümüdür: kanıt, uyum kaydının
     dayanağıdır; tezgâhta değil defterde okunur. */
  '/dokumanlar',
  '/kanitlar',
];

export function yonSec(patika: string): Yon {
  if (patika === '/') return 'b';
  if (B_YOLLAR.some((y) => y !== '/' && (patika === y || patika.startsWith(`${y}/`)))) return 'b';
  if (C_YOLLAR.some((y) => patika === y || patika.startsWith(`${y}/`))) return 'c';
  return 'a';
}

/** Aktif mi — `/riskler/[id]` de `/riskler` sekmesini aktif eder. */
export function aktifMi(yol: string, patika: string): boolean {
  if (yol === '/') return patika === '/';
  return patika === yol || patika.startsWith(`${yol}/`);
}
