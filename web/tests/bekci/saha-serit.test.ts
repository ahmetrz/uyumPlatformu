import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · SAHA ŞERİDİ ÖLÇÜLENİ DÜŞÜREMEZ (SAH-SER-002)

   ── ÖLÇÜLEN ───────────────────────────────────────────────────────────
   Kullanıcı saha şeridinin kaydırma çubuğunu İKİ KEZ bildirdi (15 ve
   18 Eyl 2026): "siteden bağımsız, kötü ve çok dikkat çekiyor". Çubuğun
   RENGİ düşürülemez (WCAG 1.4.11 · 3:1, `DESIGN.md`de dört zeminde
   ölçülü) ve GİZLENEMEZ (gizleme izni kabuk gezinme raylarıyla sınırlı,
   URN-CBK-001). Kalan tek yol uzunluktu ve orası ölçüldü:

     24 kart × 218px = 5 224px · 1914px bantta başparmak %37

   İlk plan "yalnız müdahale gerektirenleri göster" idi ve ÖLÇÜM ONU
   ÇÜRÜTTÜ: 6 tesisin uygunsuzu var, **16'sı ÖLÇÜLMEMİŞ**, 2'si temiz.
   "Müdahale gerektiren" = uygunsuz + bilinmeyen = 22/24; süzmek iki
   kartı düşürürdü. Şerit çok şey gösterdiği için uzun değildi.

   Asıl bulgu bir TEKRARDI: o 16 tesis aynı ekranda İKİ KEZ duruyor —
   takımyıldızın değerlendirilmemiş bandında (sayı · güç · ilk üç ad ·
   açılır panel) ve şeritte 16 kart olarak (3 488px). Tekrar eden bir
   değer farklı bir karar amacı taşımıyorsa bilişsel yük kusurudur.

   ── BU BEKÇİ NEYİ KORUR ───────────────────────────────────────────────
   Süzgeç bir RİSK taşır: ölçütü kayan bir filtre, bir gün gerçekten
   karar gerektiren bir tesisi sessizce düşürebilir. Diş bu yüzden
   ölçütün KENDİSİNİ sabitler.

   1 · Şerit ÖLÇÜLENİ süzer — ölçütü `endeks !== null`dur. Uygunsuzluğa,
       skora ya da tipe göre süzmek YASAK: o ölçütler bir uygunsuzu
       gizleyebilir.
   2 · Süzülen küme ADLARIYLA başka bir yüzeyde durur — takımyıldızın
       değerlendirilmemiş şeridi (`olculmemisSirali` · `serit=`).
   3 · Başlık PORTFÖYÜN TAMAMINI söyler; şeridin uzunluğu değil.
   4 · Şeridin sonunda tümüne giden bağ vardır.

   ── BEŞİNCİ DİŞ · İKİ EŞİK TEK KARARDIR (SAH-SER-003 · 19 Eyl 2026) ───
   Şerit artık yalnız KÜNYESİZ bantta çizilir. Ölçüldü, sınır iki
   pikselde kesin:

     1101px → künye 4 · güçsüz şerit 4 · şerit 8 · ŞERİDE ÖZGÜ AD 0
     1100px → künye 0 · güçsüz şerit 4 · şerit 8 · ŞERİDE ÖZGÜ AD 4

   Yani 1101'de şerit ekranda başka yerde olmayan tek bir ad bile
   taşımıyordu (304k px² ve tek ekran bütçesinden 159px karşılığında);
   1100'de en kötü dört tesisin adının okunduğu TEK yüzey.

   Kusur sınıfı buradan doğar: eşiklerden biri (`max-width: 1100px` —
   künyeyi susturan) `kabuk.css`in bir yerinde, öbürü (`min-width: 1101px`
   — şeridi gizleyen) başka bir yerinde durur. Biri değişip öbürü
   değişmezse arada bir PENCERE açılır ve o pencerede dört ad ekrandan
   tümüyle kaybolur — iki kural da tek başına doğru olduğu için hiçbir
   kapı görmez ("tek tek doğru, BİRLİKTE tutarsız").

   Bu diş eşiklerin BİTİŞİKLİĞİNİ ölçer; SONUCU (adların iki bantta da
   okunduğunu) gerçek tarayıcıda `arac/tuval-kanit.mjs` ölçer. İkisi
   birbirinin yerine geçmez: bu diş sayıyı, o kapı ekranı görür.
   ═══════════════════════════════════════════════════════════════════════ */

const CSS = readFileSync(join(__dirname, '..', '..', 'app', 'kabuk.css'), 'utf8');

const KAYNAK = readFileSync(
  join(__dirname, '..', '..', 'app', '(kabuk)', '(flagship)', 'Genel.tsx'), 'utf8',
);
/** Yorumsuz: gerekçe metnindeki kod örneği kural sayılmaz. */
const KOD = KAYNAK.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** `.kartlar` bloğunun gövdesi. */
function seritGovdesi(): string {
  const bas = KOD.indexOf('<div className="kartlar">');
  expect(bas, 'şerit kabı (.kartlar) bulunamadı').toBeGreaterThan(-1);
  return KOD.slice(bas, KOD.indexOf('</div>', bas));
}

describe('bekçi · saha şeridi', () => {
  it('BİRİNCİ DİŞ · süzgeç ÖLÇÜLMÜŞLÜĞE bakar, uygunsuzluğa değil [SAH-SER-002]', () => {
    const g = seritGovdesi();
    const suzgec = /\.filter\(\((\w+)\) => \1\.endeks !== null\)/.exec(g);
    expect(suzgec, 'Şerit süzgeci `endeks !== null` DEĞİL. Uygunsuzluğa, skora ya da '
      + 'tipe göre süzmek bir uygunsuzu gizleyebilir; ölçüt yalnız ÖLÇÜLMÜŞLÜKTÜR.\n'
      + g.slice(0, 400)).not.toBeNull();
    /* İkinci bir süzgeç eklemek ölçütü sessizce daraltır. */
    expect((g.match(/\.filter\(/g) ?? []).length, 'Şeritte birden çok süzgeç var — '
      + 'ölçüt tek olmalı').toBe(1);
  });

  it('İKİNCİ DİŞ · süzülen küme başka bir yüzeyde ADIYLA durur [SAH-SER-002]', () => {
    /* Ölçülmemişler takımyıldızın kendi şeridinde gösterilir; o bağ
       koparsa 16 tesis ekrandan TÜMÜYLE kaybolur ve "bilinmeyen ≠ sıfır"
       kuralı çiğnenir. */
    expect(KOD, 'ölçülmemiş şeridi türetilmiyor').toMatch(/olculmemisSirali\(tesisler\)/);
    expect(KOD, 'ölçülmemiş şeridi takımyıldıza verilmiyor — süzülen küme hiçbir '
      + 'yüzeyde görünmüyor olurdu').toMatch(/serit=\{olculmemisSerit\}/);
    expect(KOD, 'ölçülmemiş süzgeci `endeks === null` değil')
      .toMatch(/\.filter\(\((\w+)\) => \1\.endeks === null\)/);
  });

  it('ÜÇÜNCÜ DİŞ · portföyün TAMAMI İKİ bantta da yazılı [SAH-SER-002 · SAH-SER-003]', () => {
    /* DAR BANT — şeridin kendi başlığı. */
    const bas = KOD.indexOf('<section className="ab-b-serit"');
    const baslik = KOD.slice(bas, KOD.indexOf('</header>', bas));
    expect(baslik, 'şerit başlığı toplam tesis sayısını taşımıyor — kullanıcı '
      + 'gördüğü kart sayısını portföyün tamamı sanardı').toMatch(/ozet\.tesisSayisi/);
    expect(baslik, 'şerit başlığı güç toplamını taşımıyor').toMatch(/ozet\.gucYazi/);

    /* GENİŞ BANT — o başlık GİZLİ. Şerit 19 Eyl 2026'da ≥1101px'te
       gizlendiğinde bu diş sessizce yarısını kaybetti: portföyün sayısı
       ve güç toplamı geniş bantta hiçbir yerde yazmıyordu ve diş yine
       yeşil yanıyordu (gizlenen bir başlığı okuyordu). Sayılar
       takımyıldızın başlığına taşındı; diş oraya da bakar.

       Kusur sınıfı kütüklüdür: bir yüzey gizlendiğinde onu ölçen kapı
       kendiliğinden susar ve susması "geçti" diye okunur. */
    const tBas = KOD.indexOf('function Takimyildizi');
    expect(tBas, 'takımyıldız bileşeni bulunamadı').toBeGreaterThan(-1);
    const tGovde = KOD.slice(tBas);
    expect(tGovde, 'takımyıldız portföy sayısını almıyor — geniş bantta (şerit gizliyken) '
      + 'kullanıcı gördüğü nokta sayısını portföyün tamamı sanardı')
      .toMatch(/portfoy\.sayi/);
    expect(tGovde, 'takımyıldız portföyün güç toplamını yazmıyor — geniş bantta o sayının '
      + 'TEK yüzeyi burasıdır').toMatch(/portfoy\.gucYazi/);
    expect(KOD, 'portföy özeti takımyıldıza geçirilmiyor')
      .toMatch(/portfoy=\{\{ sayi: ozet\.tesisSayisi, gucYazi: ozet\.gucYazi \}\}/);
  });

  it('BEŞİNCİ DİŞ · şeridi gizleyen eşik künyeyi susturan eşiğin BİTİŞİĞİ [SAH-SER-003]', () => {
    /* Künyeyi susturan kural: `.ab-b-takim .isaret .kunye { display: none }`
       bir `max-width` medya kuralının İÇİNDE durur. Eşiği metinden değil
       KURALIN KENDİ BAĞLAMINDAN okuyoruz: sabit bir sayı yazmak, kural
       taşınınca yalan söylerdi. */
    const kunyeYeri = CSS.indexOf('.ab-b-takim .isaret .kunye { display: none; }');
    expect(kunyeYeri, 'künyeyi susturan kural bulunamadı — ya taşındı ya silindi; '
      + 'şerit kararının DAYANAĞI o kuraldır').toBeGreaterThan(-1);
    const oncesi = CSS.slice(0, kunyeYeri);
    const kunyeEsigi = [...oncesi.matchAll(/@media \(max-width: (\d+)px\)/g)].at(-1);
    expect(kunyeEsigi, 'künye kuralı bir max-width bandının içinde değil').not.toBeUndefined();

    const seritKurali = /@media \(min-width: (\d+)px\) \{\s*\.ab-b-genel \.ab-b-serit \{ display: none; \}/
      .exec(CSS);
    expect(seritKurali, 'şeridi geniş bantta gizleyen kural yok — şerit her bantta '
      + 'çiziliyorsa 1101px’te ölçülen tekrar geri gelmiş demektir').not.toBeNull();

    const kunye = Number(kunyeEsigi![1]);
    const serit = Number(seritKurali![1]);
    expect(serit, `Eşikler ayrışmış: künye ≤${kunye}px’te susuyor, şerit ≥${serit}px’te `
      + `gizleniyor. Arada ${serit - kunye - 1}px genişliğinde bir pencere kalır ve o `
      + 'pencerede DÖRT TESİSİN ADI ekrandan tümüyle kaybolur — künye de şerit de '
      + 'çizilmez. İki eşik tek karardır; biri değişirse öbürü de değişir.')
      .toBe(kunye + 1);
  });

  it('DÖRDÜNCÜ DİŞ · şeridin sonunda tümüne giden bağ var [SAH-SER-002]', () => {
    const g = seritGovdesi();
    expect(g, 'şeritte portföye giden bağ yok').toMatch(/href="\/tesisler"/);
    /* Bağ SONDA durur: karar sırası önce, gezinme sonra. */
    expect(g.indexOf('href="/tesisler"'), 'tümü bağı kartlardan ÖNCE geliyor')
      .toBeGreaterThan(g.indexOf('SahaKarti'));
  });
});
