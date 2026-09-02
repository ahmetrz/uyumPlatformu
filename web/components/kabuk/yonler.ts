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

export type Yogunluk = 'amiral' | 'operasyonel' | 'tezgah';

export type Oge = { ad: string; yol: string; kod?: string; ayrik?: boolean };

/* ── Alanlar — beş birincil alan ──────────────────────────────────────
   Risk artık KENDİ alanıdır (eskiden defterin bir sekmesi + varlık
   rayının bir öğesiydi, iki yerde birden). Beş alan ürünün beş sorusudur:
   ne oluyor (Saha) · nasıl karşılaştırılır (Portföy) · uygun muyuz (Uyum)
   · neyimiz var (Varlık) · ne ters gidebilir (Risk). */
export const ALANLAR: Oge[] = [
  { ad: 'Saha', yol: '/' },
  { ad: 'Portföy', yol: '/portfoy' },
  { ad: 'Uyum', yol: '/uyum' },
  { ad: 'Varlık', yol: '/envanter' },
  { ad: 'Risk', yol: '/riskler' },
];

/* Rota → alan. Kanonik yol dışındaki her rota buradan alanına bağlanır;
   listede olmayan rota (ayarlar, yardım, bildirimler, sistem, yönetim
   tezgâhı) YARDIMCI'dır: alan yanmaz, ikincil sıra çizilmez. */
const ALAN_ROTALARI: Record<string, string[]> = {
  '/': ['/', '/tesisler'],
  '/portfoy': ['/portfoy', '/harita'],
  '/uyum': [
    '/uyum', '/regulasyonlar', '/surecler', '/eslestirme', '/denetimler',
    '/bulgular', '/projeler', '/raporlar', '/dokumanlar', '/kanitlar', '/aktivite',
  ],
  '/envanter': [
    '/envanter', '/kesif', '/varlik-aktarim', '/ice-aktarim', '/topoloji', '/esleme',
    '/omur', '/yedekleme', '/tedarikciler', '/kimlik', '/yetkiler', '/olaylar',
    '/operasyon', '/saglik',
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
   ray KALDIRILDI) · Risk 2 · Portföy 2 · Saha yok (Saha'nın tek ekranı
   kendisidir; santral detayı şeritten açılır). Gruplar saç çizgisiyle
   ayrılır; grup başlığı yalnız Varlık'ta (beş grup adsız okunmaz). */
export const IKINCIL: Record<string, { baslik?: string; ogeler: Oge[] }[]> = {
  '/uyum': [
    { ogeler: [
      { ad: 'Matris', yol: '/uyum' },
      { ad: 'Regülasyonlar', yol: '/regulasyonlar' },
      { ad: 'Süreçler', yol: '/surecler' },
      { ad: 'Çapraz eşleme', yol: '/eslestirme' },
    ]},
    { ogeler: [
      { ad: 'Denetimler', yol: '/denetimler' },
      { ad: 'Bulgular & CAPA', yol: '/bulgular' },
      { ad: 'Projeler', yol: '/projeler' },
    ]},
    { ogeler: [
      { ad: 'Raporlar', yol: '/raporlar' },
      { ad: 'Belge kütüğü', yol: '/dokumanlar' },
      { ad: 'Kanıt', yol: '/kanitlar' },
      { ad: 'Denetim izi', yol: '/aktivite' },
    ]},
  ],
  '/riskler': [
    { ogeler: [
      { ad: 'Risk kütüğü', yol: '/riskler' },
      { ad: 'Bulgular & CAPA', yol: '/bulgular' },
    ]},
  ],
  '/envanter': [
    { baslik: 'Envanter', ogeler: [
      { ad: 'Kayıt', yol: '/envanter' },
      { ad: 'Keşif', yol: '/kesif' },
      { ad: 'Varlık aktarımı', yol: '/varlik-aktarim' },
      { ad: 'Model aktarımı', yol: '/ice-aktarim' },
    ]},
    { baslik: 'Ağ & bağımlılık', ogeler: [
      { ad: 'Topoloji', yol: '/topoloji' },
      { ad: 'Eşleme', yol: '/esleme' },
    ]},
    { baslik: 'Yaşam döngüsü', ogeler: [
      { ad: 'Ömür', yol: '/omur' },
      { ad: 'Yedekleme', yol: '/yedekleme' },
      { ad: 'Tedarikçiler', yol: '/tedarikciler' },
    ]},
    { baslik: 'Erişim', ogeler: [
      { ad: 'Kimlik', yol: '/kimlik' },
      { ad: 'Yetkiler', yol: '/yetkiler' },
    ]},
    { baslik: 'Olay & değişiklik', ogeler: [
      { ad: 'Olaylar', yol: '/olaylar' },
      { ad: 'Değişim', yol: '/operasyon' },
      { ad: 'Sağlık', yol: '/saglik' },
    ]},
  ],
  '/portfoy': [
    { ogeler: [
      { ad: 'Karşılaştırma', yol: '/portfoy' },
      { ad: 'Harita', yol: '/harita' },
    ]},
  ],
};

/** Patikanın ikincil sırası; Saha ve yardımcı rotalarda boş dizi. */
export function ikincilSec(patika: string): { baslik?: string; ogeler: Oge[] }[] {
  const alan = alanSec(patika);
  return alan ? (IKINCIL[alan] ?? []) : [];
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
   Santral 360) — 28px sıkı ayak, dolgu geniş.
   tezgâh: mühendislik ekranları (keşif, topoloji, aktarımlar, sağlık,
   yönetim tezgâhı, sistem) — 32px satır, dolgu dar.
   operasyonel: geri kalan tablo/matris/kütük ekranları — 36px satır. */
const AMIRAL_YOLLARI = ['/', '/tesisler', '/portfoy', '/harita', '/giris'];
const TEZGAH_YOLLARI = [
  '/kesif', '/ice-aktarim', '/varlik-aktarim', '/topoloji', '/esleme',
  '/operasyon', '/saglik', '/yonetim-tezgahi', '/sistem',
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
