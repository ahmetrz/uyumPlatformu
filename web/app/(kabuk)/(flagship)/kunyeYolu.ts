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
export const KUNYE_BOY = 11;

/* Künye YÖNLÜDÜR: işaretin sağına açılır, sağ yarıda (`.sola`) soluna.
   Simetrik bir "|Δx| < en" kuralı bu yüzden kördü — x=50'de sağa açılan
   künye [50, 78]'i, x=88'de sola açılan künye [60, 88]'i kaplar; ikisi
   örtüşür ama merkezleri 38 birim uzaktır. */
function aralik(n: KunyeNoktasi, en: number): [number, number] {
  return n.sola ? [n.x - en, n.x] : [n.x, n.x + en];
}

/**
 * Her nokta için künye yolunu döndürür. Yol 0 künyenin doğal yeridir;
 * 1, 2, … künyeyi kendi yönünde bir künye boyu daha iter.
 *
 * Sıra ÖNEMLİDİR ve çağıranın verdiği sıradır: önce gelen künye doğal
 * yerini korur, sonra gelen kayar. Ekran uygunsuzu olan tesisi öne
 * aldığı için kritik künye yerinde kalır.
 */
export function kunyeYollari(
  noktalar: readonly KunyeNoktasi[],
  en = KUNYE_EN,
  boy = KUNYE_BOY,
): number[] {
  const yollar: number[] = [];
  /* Yerleşmiş künyelerin GERÇEK yeri — noktanın yeri değil. İkisini
     karıştırmak ikinci basamağı kör eder: yol 1'e itilmiş bir künye,
     bir üstteki noktanın doğal künyesiyle çakışabilir. */
  const yerlesik: { a: number; b: number; y: number }[] = [];

  noktalar.forEach((n, i) => {
    const [a, b] = aralik(n, en);
    let yol = 0;
    let y = n.y;
    const yon = n.yukari ? 1 : -1;
    /* Üst sınır: künye sayısı kadar deneme yeter — her denemede en az
       bir yerleşik künyenin üstünden geçilir. Sonsuz döngü olamaz. */
    while (yol <= noktalar.length
      && yerlesik.some((o) => o.a < b && a < o.b && Math.abs(o.y - y) < boy)) {
      yol += 1;
      y = n.y + yon * yol * boy;
    }
    yollar[i] = yol;
    yerlesik.push({ a, b, y });
  });

  return yollar;
}
