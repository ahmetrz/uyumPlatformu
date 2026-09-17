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
/* SAYI DEĞİŞMEDİ, SINIRI BEYAN EDİLDİ. `KUNYE_EN` künyenin YATAY
   kapladığı yer, tuval yüzdesi cinsinden — ve künye piksel genişliğinde
   bir metin kutusudur (`white-space: nowrap`). Ölçüldü (17 Eyl 2026,
   aynı dört tesis, künye 106px):

     1440×900  tuval 688px → %15,4      1366×768  tuval 614px → %17,3
     1280×800  tuval 528px → %20,1      375×812   tuval 311px → %34,1

   Yani %28 masaüstünde FAZLA ayırır (zararsız: künye işaretine biraz
   daha yakın durur), telefonda AZ ayırır — ve orada model "ayrık" derken
   künyeler gerçekten biniyor. `main` üzerinde de ölçüldü: 1024×768 ve
   375×812'de bu yüzden birer künye-künye çakışması VAR.

   Sayıyı telefona göre büyütmek çözüm DEĞİLDİR: 311px tuvalde uzun
   Türkçe adlar (~200px) künyenin %64'ünü ister; iki künye hiçbir sayıyla
   yan yana sığmaz. Dar bantta çözüm STRATEJİDİR, sayı değil — künye
   yüzeyi orada hiç çizilmez (`kabuk.css`, `.ab-b-alan` tek kolona
   indiğinde) ve adlar rayda tam hâliyle durur. */
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
/** Künye kutusunun ÖLÇÜLEN piksel yüksekliği — iki satır (`kabuk.css`). */
export const KUNYE_BOY_PX = 34;

/** Tuvalin inebileceği EN KISA yükseklik (`.ab-tuval { min-height }`).
 *  İki sayı BİRLİKTE değişir; ayrıştıkları an model ekranda olmayan bir
 *  ayrım varsayar. Bekçi ikisini CSS'ten okuyup karşılaştırır. */
export const TUVAL_TABAN_PX = 245;

/* YÜZDE ARTIK TÜRETİLİR — VE EN KÖTÜ DURUMDAN.

   Elle yazılan %11 iki yönde birden YANLIŞTI ve ölçüldü (17 Eyl 2026,
   üretim derlemesi): künye her bantta 34px, tuval 1440×900'de 324px
   (künye = %10,5), 1366×768 ve 1280×800'de 280px (künye = %12,1). Yani
   model dar bantta gerçek künyeyi OLDUĞUNDAN KÜÇÜK sanıyor ve "bu iki
   künye ayrık" diyerek çakışmayı geçiriyordu. Sabit bir yüzde, boyu
   piksel olan bir kutuyu yüksekliği değişen bir tuvale ölçmeye çalışmanın
   kaçınılmaz sonucudur.

   Doğrusu EN KÖTÜ durumdur: tuval en kısayken künye en büyük payı kaplar.
   Taban 245px olduğu için yüzde yukarı yuvarlanarak 14 çıkar. Daha uzun
   tuvalde model fazla ayırır — bu zararsızdır (künye işaretine biraz daha
   yakın durur); AZ ayırmak ise çakışma demektir. */
export const KUNYE_BOY = Math.ceil((KUNYE_BOY_PX / TUVAL_TABAN_PX) * 100);

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

/* İŞARET KUTULARI ÇÖZÜCÜYE VERİLDİ VE GERİ ALINDI — ölçümle.

   Kritik "çözücüye işaret kutularını besle" diyordu ve bir tur denendi:
   künye başka bir tesisin işaretine inemesin. Ölçüldü (17 Eyl 2026, beş
   bant): 1024×768'de bir çakışmayı kapattı, ama 1366×768, 1280×800 ve
   375×812'de YENİ künye-künye çakışmaları doğurdu — kısıt artınca çözücü
   üç şeridi de doldurup pes ediyor ve künyeyi doğal yerinde bırakıyor.
   1280 kapı bandıdır, yani değişiklik `kanit:tuval`ı kırmızı yakıyordu.

   Dahası teşhis YANLIŞTI: aynı beş bant `main` üzerinde ölçüldüğünde
   1024 ve 375'teki çakışmalar ZATEN VARDI ve türü künye×künyeydi,
   künye×işaret değil. Yani eklenen kısıt, ölçülen kusurun sebebine hiç
   dokunmuyordu; 1024'ü düzeltmesi tesadüftü (fazladan baskı bir künyeyi
   oynattı). Sebep aşağıda, `KUNYE_EN` yorumunda. */

/* Künye YÖNLÜDÜR: işaretin sağına açılır, sağ yarıda (`.sola`) soluna.
   Simetrik bir "|Δx| < en" kuralı bu yüzden kördü — x=50'de sağa açılan
   künye [50, 78]'i, x=88'de sola açılan künye [60, 88]'i kaplar; ikisi
   örtüşür ama merkezleri 38 birim uzaktır. */
function aralik(n: KunyeNoktasi, en: number): [number, number] {
  return n.sola ? [n.x - en, n.x] : [n.x, n.x + en];
}

/* KÜNYE DİKEYDE DE YÖNLÜDÜR — ve bu kural burada YOKTU.

   Eski model künyeyi noktanın MERKEZİNDE sayıyordu: iki künye
   `|Δy| < boy` ise çakışık, değilse ayrık. Oysa künye noktanın üstünde
   ya da altında durur, ortasında değil (`kabuk.css`): doğal hâlde
   `top: -9px`ten aşağı sarkar, `kunye-yukari` hâlinde `bottom: 4px`ten
   yukarı çıkar. İki künye ZIT yönlere açıldığında merkezleri bir künye
   boyundan uzak olsa bile kutuları ortada buluşur.

   ÖLÇÜLDÜ (17 Eyl 2026 · 1440×900 · eksen penceresi geldikten sonra):
   aynı endeksteki (73) iki tesisten biri künyesini aşağı, öbürü yukarı
   açıyordu ve tuval yüzdesinde 11,9 birim uzaktılar — `boy` 11 olduğu
   için model "ayrık" dedi ve ikisini de doğal yerinde bıraktı (yol 0).
   Ekranda künyeler 16 piksel üst üste biniyordu ve tarayıcı kapısı
   (`kanit:tuval`) iki bantta da kırmızı yaktı.

   Bugün künyenin kapladığı DİKEY ŞERİT hesaplanır. Şerit yönlüdür ve
   `yol` onu kendi yönünde iter — yani şeritler hiç örtüşmezse künyeler
   de örtüşmez. Simetrik kural yatayda `aralik` ile zaten düzeltilmişti
   (SIS-SAHA-001); bu, aynı körlüğün dikey yüzüdür. */
function dikeyAralik(n: KunyeNoktasi, yol: number, boy: number): [number, number] {
  return n.yukari
    ? [n.y + yol * boy, n.y + (yol + 1) * boy]
    : [n.y - (yol + 1) * boy, n.y - yol * boy];
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
  const yerlesik: { a: number; b: number; yAlt: number; yUst: number }[] = [];

  noktalar.forEach((n, i) => {
    const dolu = (a: number, b: number, yAlt: number, yUst: number) => yerlesik.some(
      (o) => o.a < b && a < o.b && o.yAlt < yUst && yAlt < o.yUst,
    );

    let secilen: KunyeYeri | null = null;
    let kutu = aralik(n, en);
    let dikey = dikeyAralik(n, 0, boy);
    for (const sola of [n.sola, !n.sola]) {
      const [a, b] = aralik({ ...n, sola }, en);
      for (let yol = 0; yol <= enCokYol; yol += 1) {
        const [yAlt, yUst] = dikeyAralik(n, yol, boy);
        if (!dolu(a, b, yAlt, yUst)) {
          secilen = { yol, sola };
          kutu = [a, b];
          dikey = [yAlt, yUst];
          break;
        }
      }
      if (secilen) break;
    }

    const yer = secilen ?? { yol: 0, sola: n.sola };
    if (!secilen) {
      kutu = aralik(n, en);
      dikey = dikeyAralik(n, 0, boy);
    }
    yerler[i] = yer;
    yerlesik.push({ a: kutu[0], b: kutu[1], yAlt: dikey[0], yUst: dikey[1] });
  });

  return yerler;
}
