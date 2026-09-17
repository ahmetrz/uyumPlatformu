/* ── EKSEN PENCERESİ ──────────────────────────────────────────────────
   Bir eksenin hangi ARALIĞI gösterdiğini veriden türetir.

   ── NİÇİN VAR ────────────────────────────────────────────────────────
   Takımyıldızın eksenleri sabitti: yatayda %0–100, dikeyde 0–enBüyükGüç.
   Ölçüldü (17 Eyl 2026 · `/` · üretim derlemesi · 1440×900 · 1366×768 ·
   1280×800, üç bantta da aynı): çizilen dört tesis yatayda %52,2–%66,7,
   dikeyde tuvalin %53,8–%85,7 bandına sıkışıyordu — yani 614×280'lik
   tuvalin kapladıkları dikdörtgen yüzde beşin altındaydı ve geri kalan
   her şey boştu. O sıkışma bir de künye çakışması üretiyordu: dört
   künyeden biri komşusunun işaretinin üstüne biniyordu.

   Boş tuval yalnız çirkin değil, KARAR TAŞIMIYOR: "hangi tesis hem
   büyük hem uyumsuz" sorusunun cevabı dört noktanın birbirine göre
   YERİDİR ve o yer ekranın %5'ine sıkışınca okunamaz.

   ── NİÇİN VERİYE YAPIŞMIYOR ──────────────────────────────────────────
   Ekseni doğrudan [enAz, enÇok] yapmak, grafiklerin en bilinen yalanını
   üretirdi: bir puan farkla ayrılan iki tesis tuvalin iki ucuna düşer
   ve okuyan kişi uçurum görür. Bu yüzden pencere İKİ ŞEYLE bağlanır:

     1 · UÇLAR YUVARLANIR ve EKRANDA YAZILIR. Çentik "%50" ve "%70"
         diyorsa okuyan kişi ölçeği bilir; yazmayan bir yakınlaştırma
         yalandır, yazan bir yakınlaştırma okumadır.
     2 · PENCERE EN AZ `asgariAdim` ADIM GENİŞTİR. Varsayılan iki adım
         olduğu için tek bir veri noktası aralığı sıfıra indiremez ve
         bir adımlık fark tuvalin yarısından fazlasını kaplayamaz.

   İkisi birlikte ölçülebilir bir sınır verir: yatay eksende bir endeks
   puanı, tuval genişliğinin en çok 1/20'sini kaplar.

   ── NİÇİN KAREKÖK KALKTI ─────────────────────────────────────────────
   Dikey eksen `√(guc / enBüyükGüç)` ile çiziliyordu ve gerekçesi
   yazılıydı: "1800 güçlük bir tesis ile 15 güçlük bir tesis aynı
   eksende DOĞRUSAL konursa küçükler tek şeride yığılır". O gerekçenin
   tamamı eksenin SIFIRA ÇAKILI olmasından geliyordu — yığılma, küçük
   değerlerin sıfır ile aralarındaki mesafenin ezilmesiydi. Pencere
   sıfır çıpasını kaldırdığı için gerekçe de kalkıyor; kalan şey, uçları
   yazılı bir eksende ara konumların interpolasyonu BOZAN bir eğridir.
   Dört noktalı bir grafikte okuyan kişi "bu iki nokta arası ne kadar"
   diye sorar ve doğrusal eksende cevap verebilir, karekökte veremez. */

export type Pencere = {
  /** Pencerenin alt ucu — ekranda yazılır. */
  alt: number;
  /** Pencerenin üst ucu — ekranda yazılır. */
  ust: number;
  /** Uçların yuvarlandığı adım; çentik metnini biçimlerken kullanılır. */
  adim: number;
};

/**
 * Bir yayılıma yakışan yuvarlak adım: 1 · 2 · 5 ve on katları.
 *
 * Hedef yaklaşık DÖRT adımlık bir pencere: daha azı uçları veriden
 * uzağa atar, daha çoğu çentikleri anlamsız sıklaştırır.
 */
export function yakinAdim(yayilim: number): number {
  if (!Number.isFinite(yayilim) || yayilim <= 0) return 1;
  const ham = yayilim / 4;
  const us = 10 ** Math.floor(Math.log10(ham));
  const n = ham / us;
  const k = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return k * us;
}

/**
 * Çizilen kümeden eksen penceresini türetir.
 *
 * `taban` / `tavan` verilirse pencere onların DIŞINA taşmaz (uyum
 * endeksi bir yüzdedir: %-10 diye bir çentik yazılamaz). Sınırlar
 * pencereyi `asgariAdim` kadar genişletmeye izin vermiyorsa pencere
 * olduğu gibi kalır — sınırı delmektense dar bir pencere yeğdir.
 *
 * Boş kümede `null` döner: çizilecek nokta yoksa eksen de yoktur ve
 * "0–100" gibi uydurma bir aralık yazmak, olmayan bir ölçümü varmış
 * gibi göstermek olurdu.
 */
export function eksenPenceresi(
  degerler: readonly number[],
  secenek: { taban?: number; tavan?: number; adim?: number; asgariAdim?: number } = {},
): Pencere | null {
  const sayilar = degerler.filter((d) => Number.isFinite(d));
  if (sayilar.length === 0) return null;

  const enAz = Math.min(...sayilar);
  const enCok = Math.max(...sayilar);
  const { taban, tavan, asgariAdim = 2 } = secenek;
  /* Tek noktalı kümede yayılım sıfırdır; adım o zaman DEĞERİN kendi
     büyüklüğünden gelir — yoksa 1800'lük tek bir tesis için 1'lik adım
     seçilir ve pencere 1800–1802 olur. */
  const adim = secenek.adim ?? yakinAdim(enCok - enAz || Math.abs(enCok));

  let alt = Math.floor(enAz / adim) * adim;
  let ust = Math.ceil(enCok / adim) * adim;
  if (ust === alt) ust = alt + adim;

  /* Genişletme ÜSTTEN başlar: dikey eksende "yukarı = daha güçlü"dur ve
     fazla nefesi üstte bırakmak künyelerin yukarı açılmasına yer verir. */
  let kalkan = 0;
  while ((ust - alt) / adim < asgariAdim) {
    const ustAcik = tavan === undefined || ust + adim <= tavan;
    const altAcik = taban === undefined || alt - adim >= taban;
    if (!ustAcik && !altAcik) break;
    if (ustAcik && (kalkan % 2 === 0 || !altAcik)) ust += adim;
    else alt -= adim;
    kalkan += 1;
  }

  return { alt, ust, adim };
}

/**
 * Bir değerin pencere içindeki oranı (0…1), DOĞRUSAL.
 *
 * Pencere dışındaki değer kırpılır: veri penceresinden türetildiği için
 * bu normalde olmaz, ama pencere elle verilirse nokta tuvalden taşmaz.
 */
export function pencereOrani(deger: number, p: Pencere): number {
  const genislik = p.ust - p.alt;
  if (!(genislik > 0)) return 0;
  return Math.min(1, Math.max(0, (deger - p.alt) / genislik));
}

/**
 * Çentik metni: adım ondalıklıysa değer de ondalıklı yazılır.
 *
 * `0.5`lik bir adımda "12" ile "12,5" arasındaki fark çentikte
 * görünmezse iki uç aynı sayıyı gösterir ve pencere yalan söyler.
 */
export function centikYazi(deger: number, adim: number): string {
  const basamak = adim >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(adim)));
  return deger.toLocaleString('tr-TR', {
    minimumFractionDigits: basamak, maximumFractionDigits: basamak,
  });
}
