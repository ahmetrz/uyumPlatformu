/* Takımyıldız künyelerinin YERLEŞİM YOLU (lane).

   ── NEDEN BİR MODÜL ───────────────────────────────────────────────────
   Künye çakışması ekranda GÖRÜLEN bir kusurdur ama kuralı saf bir
   fonksiyondur: nokta koordinatları girer, yol numaraları çıkar. Saf
   olduğu için sentetik vakalarla sınanabilir ve sabotajı ölçüm ortamını
   değil KURALI sabote eder.

   ── KUSUR, ÖLÇÜLDÜ (1440×900, tohum verisi) ───────────────────────────
   Eski kural iki şey yapıyordu ve ikisi de yetmiyordu:

     kaydir[i] = kendinden ÖNCE gelen ve yakın duran BİR komşu var mı
     yukari(s) = nokta x eksenine yakın mı (dikey < 14)

   ve sınıf seçimi şuydu:  yukari(s) ? 'kunye-yukari' : kaydir[i] ? 'kunye-asagi' : ''

   Birinci kusur: `yukari` dalı `kaydir`ı TÜMÜYLE geçersiz kılıyordu.
   Gücü kaydedilmemiş tesislerin hepsi dikeyde 8'e iner (dikey =
   8 + √(0/enGuc)·78), yani hepsi `yukari` olur ve o bantta HİÇBİR künye
   kaydırılmazdı. Ölçülen sonuç: altı künye tek şeride binmiş ve okunamaz
   bir metin üretmişti — "Saha B-1 AtıksuAhtmae SuyuArıtmanelMüdürlükel
   Müdürlük".

   İkinci kusur: kaydırma TEK basamaklıydı. Üç nokta kümelendiğinde
   ikinci ve üçüncü künye AYNI kaydırılmış yere iniyor, bu kez birbirine
   biniyordu.

   ── KURAL ─────────────────────────────────────────────────────────────
   Künye NOKTAYI OYNATMAZ — nokta ölçülen veridir (uyum endeksi × kurulu
   güç) ve yerini değiştirmek grafiği yalan söyletir. Yalnız KÜNYE kayar:
   her künye, daha önce yerleşmiş künyelerin hiçbiriyle örtüşmeyen ilk
   yola oturur. Yol numarası CSS'e `--yol` olarak geçer.
*/

/** Künye yerleşimi için gereken en az bilgi — ekran bileşeninden bağımsız. */
export type KunyeNoktasi = {
  /** Yatay konum, tuval yüzdesi (uyum endeksi). */
  x: number;
  /** Dikey konum, tuval yüzdesi, TABANDAN (kurulu güç). */
  y: number;
  /** Künye yukarı mı açılıyor? Eksene yakın nokta yukarı açar. */
  yukari: boolean;
  /** Künye SOLA mı açılıyor? Sağ yarıdaki nokta sola açar (`.sola`). */
  sola: boolean;
};

/** Bir künyenin kapladığı yer, tuval yüzdesi olarak. ÖLÇÜLDÜ (1440×900):
 *  uzun Türkçe adlar — "Saha A-1 İçme Suyu Arıtma", "Demo Enerji Genel
 *  Müdürlük" — ~200px; tuval ~700px ⇒ %28. İlk yazımda %17 denendi ve
 *  YETMEDİ: o iki künye hâlâ üst üste biniyordu (ölçüldü, düzeltme turu).
 *  İki satırlık künye 28px ≈ %11 (tuval ~260px). */
export const KUNYE_EN = 28;
/* Künye boyu TUVAL YÜZDESİDİR: 34px künye / ~300px tuval ≈ %11.
   Yüzde olması, sabitin tuval yüksekliğine BAĞIMLI olması demektir ve
   bu bağımlılık ölçüldü (tuval kanıtı, 1280×800): tuval `flex: 1` ile
   viewport'tan pay alıyordu ve orada 203px'e iniyordu; aynı künye
   artık %17 ediyor, kural %11 varsayıp "yeterince uzak" diyor ve iki
   künye ekranda üst üste biniyordu.

   Sabiti 17'ye çekmek denendi ve GERİ ALINDI: çakışma bitiyordu ama
   künye–işaret mesafesi 100px'ten 180px'e çıkıyordu — yani kapatılan
   P0 (künyenin işaretinden kopması) geri geliyordu. İki kusur arasında
   seçim yapmak yerine varsayım gerçek kılındı: tuval artık tasarlandığı
   yüksekliğin ALTINA İNEMEZ (`.ab-tuval { min-height }`, kabuk.css) ve
   %11 her bantta 34px'e karşılık gelir. */
export const KUNYE_BOY = 11;

/* KÜNYE KENDİ İŞARETİNDEN KOPAMAZ — ölçülen kusur (bağımsız audit,
   14 Eylül 2026, 1440×900). İlk yazımda yol sayısı SINIRSIZDI: üst sınır
   yalnız "sonsuz döngü olmasın" diyeydi (`yol <= noktalar.length`).
   Gerçek ekranda "Saha A-1 İçme Suyu Arıtma" künyesi 9. yola çıktı ve
   kendi işaretinden 303 PİKSEL uzağa, BAŞKA bir tesis kümesinin içine
   düştü. Künyeyi işarete bağlayan saç teli (`.kunye::before`, 8px) o
   mesafede hiçbir şeye işaret etmiyor; okuyan kişi "%50 · 2 uygunsuz"u
   YANLIŞ tesise atfeder. Çakışmayı önlerken yanlış bilgi üretmek,
   çakışmadan daha ağır bir kusurdur.

   Bugün iki sınır var: yol sayısı TAVANLIDIR ve tavan dolunca künye
   işaretin ÖBÜR YANINA geçer (aynı mesafe, ikinci bir şerit kümesi).
   İkisi de dolarsa künye doğal yerinde kalır — çakışabilir, ama
   işaretinden en fazla üç künye boyu uzakta durur ve saç teli hâlâ
   doğru işareti gösterir.

   TAVAN NEDEN 3: bir şerit `KUNYE_BOY` = %11 tuval yüksekliğidir; 300px
   tuvalde ≈ 33px. Yol 3 ≈ 99px — künyeyi işaretine bağlayan saç teli bu
   mesafede hâlâ okunur. Ölçülen kusur yol 9'du (≈297px) ve künye komşu
   kümenin İÇİNE düşmüştü. Tavan, ÇAKIŞMAYI çözemediğinde çakışmayı
   kabul eder: yanlış tesise atfedilen bir sayı, üst üste binen iki
   künyeden daha ağır bir kusurdur — okuyan kişi birincisini fark etmez,
   ikincisini fark eder. */
export const KUNYE_EN_COK_YOL = 3;

/* Künye YÖNLÜDÜR: işaretin sağına açılır, sağ yarıda (`.sola`) soluna.
   Simetrik bir "|Δx| < en" kuralı bu yüzden kördü — x=50'de sağa açılan
   künye [50, 78]'i, x=88'de sola açılan künye [60, 88]'i kaplar; ikisi
   örtüşür ama merkezleri 38 birim uzaktır. */
function aralik(n: KunyeNoktasi, en: number): [number, number] {
  return n.sola ? [n.x - en, n.x] : [n.x, n.x + en];
}

/** Künyenin bulduğu yer: kaçıncı şerit ve hangi yana açıldığı. */
export type KunyeYeri = {
  /** 0 = doğal yer; 1…`enCokYol` künyeyi kendi yönünde bir boy daha iter. */
  yol: number;
  /** Künye SOLA mı açıldı? Doğal yanı doluysa öbür yana geçmiş olabilir. */
  sola: boolean;
};

/**
 * Her nokta için künyenin yerini döndürür.
 *
 * Sıra ÖNEMLİDİR ve çağıranın verdiği sıradır: önce gelen künye doğal
 * yerini korur, sonra gelen kayar. Ekran uygunsuzu olan tesisi öne
 * aldığı için kritik künye yerinde kalır.
 *
 * Aranan yerler, bulunduğu ilk yer kazanacak şekilde SIRAYLA denenir:
 * doğal yanda 0…tavan, sonra öbür yanda 0…tavan. Hiçbiri boş değilse
 * künye doğal yerinde bırakılır — işaretinden kopmaktansa komşusuyla
 * çakışması yeğdir (bkz. `KUNYE_EN_COK_YOL`).
 */
export function kunyeYollari(
  noktalar: readonly KunyeNoktasi[],
  en = KUNYE_EN,
  boy = KUNYE_BOY,
  enCokYol = KUNYE_EN_COK_YOL,
): KunyeYeri[] {
  const yerler: KunyeYeri[] = [];
  /* Yerleşmiş künyelerin GERÇEK yeri — noktanın yeri değil. İkisini
     karıştırmak ikinci basamağı kör eder: yol 1'e itilmiş bir künye,
     bir üstteki noktanın doğal künyesiyle çakışabilir. */
  const yerlesik: { a: number; b: number; y: number }[] = [];

  noktalar.forEach((n, i) => {
    const yon = n.yukari ? 1 : -1;
    const dolu = (a: number, b: number, y: number) => yerlesik.some(
      (o) => o.a < b && a < o.b && Math.abs(o.y - y) < boy,
    );

    let secilen: KunyeYeri | null = null;
    let kutu = aralik(n, en);
    for (const sola of [n.sola, !n.sola]) {
      const [a, b] = aralik({ ...n, sola }, en);
      for (let yol = 0; yol <= enCokYol; yol += 1) {
        if (!dolu(a, b, n.y + yon * yol * boy)) {
          secilen = { yol, sola };
          kutu = [a, b];
          break;
        }
      }
      if (secilen) break;
    }

    const yer = secilen ?? { yol: 0, sola: n.sola };
    if (!secilen) kutu = aralik(n, en);
    yerler[i] = yer;
    yerlesik.push({ a: kutu[0], b: kutu[1], y: n.y + yon * yer.yol * boy });
  });

  return yerler;
}
