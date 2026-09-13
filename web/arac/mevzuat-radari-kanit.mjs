/* R1 · MEVZUAT RADARI · TARAYICI KANITI (MEV-RAD-001 · MEV-RAD-002)

   Briften ölçülecek iddialar:
     · aday listesi ekranda            → karar bekleyen adaylar duruyor
     · ENGELLİ ve KARŞILAŞTIRILAMADI   → İKİ AYRI metrik, İKİ AYRI cümle
       ekranda AYRI görünüyor
     · kaynak durumu okunuyor          → taraması KAPALI kaynak "KAPALI" der
     · insan kararı eylemleri          → gerekçesiz karar REDDEDİLİR ve
                                          aday DEĞİŞMEZ
     · ENGELLİ kaynakta tarama açma    → düğme yok ya da sunucu reddediyor

   ── EN PAHALI İDDİA ───────────────────────────────────────────────────
   "Engelli" ile "karşılaştırılamadı" tek sayıya toplanmamalı. Toplansaydı
   ekran, bakılamamış bir kaynağı kaynağın kendi engeliyle aynı kefeye
   koyar ve iki bambaşka işi (kurumdan izin istemek · ayrıştırıcıyı
   düzeltmek) aynı satıra sıkıştırırdı. Bu betik ikisinin AYRI sayı ve
   AYRI cümle olduğunu ekranda ölçer.

   FİKSTÜRÜ DEĞİŞTİRMEZ: denenen tek yazma GEREKÇESİZ karardır ve
   reddedilir — yani hiçbir aday karara bağlanmaz.

   Kullanım: PORT=3210 node arac/mevzuat-radari-kanit.mjs (canlı sunucu ister) */
import { chromium } from 'playwright-core';
import { KOK, girisYap, tarayiciYolu } from './kosu-ortak.mjs';

const BANTLAR = [
  { ad: '1440×900', width: 1440, height: 900, tiklar: true },
  { ad: '1024×768', width: 1024, height: 768, tiklar: false },
];

/* TÜRKÇE BÜYÜK HARF TUZAĞI: `innerText` CSS `text-transform` sonucunu
   döndürür ve `İ` (U+0130) varsayılan case-fold ile `i`ye inmez. */
const kucuk = (m) => m.toLocaleLowerCase('tr');
const icerir = (govde, parca) => kucuk(govde).includes(kucuk(parca));

const iddialar = [];
const kaydet = (bant, ad, ok, not = '') => {
  iddialar.push({ bant, ad, ok, not });
  console.log(`  ${ok ? 'geçti  ' : 'KIRMIZI'} ${bant} · ${ad}${not ? ` — ${not}` : ''}`);
};

const satirBul = (page, kod) => page
  .locator('[role="row"], .vt-satir, tbody tr')
  .filter({ hasText: kod }).first();

const browser = await chromium.launch({
  executablePath: tarayiciYolu(), headless: true, args: ['--no-sandbox'],
});
try {
  for (const bant of BANTLAR) {
    const context = await browser.newContext({
      viewport: { width: bant.width, height: bant.height },
    });
    const page = await context.newPage();
    await girisYap(page);
    await page.goto(`${KOK}/mevzuat-radari`, { waitUntil: 'networkidle' });
    await page.locator('main').first().waitFor({ state: 'attached', timeout: 15_000 });

    /* GÖRÜNMEYEN İÇERİK TUZAĞI (arac/BENIOKU.md, beşinci tuzak):
       `innerText` gizli düğümde boş döner. `textContent` kullanılır. */
    const govde = (await page.locator('main').first().textContent()) ?? '';

    kaydet(bant.ad, 'ekran başlığı', icerir(govde, 'mevzuat radarı'),
      govde.slice(0, 60).replace(/\s+/g, ' '));

    /* ── YATAY TAŞMA ───────────────────────────────────────────────── */
    const tasma = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    kaydet(bant.ad, 'yatay taşma 0px', tasma <= 0, `${tasma}px`);

    /* ── İKİ AYRI HÂL ──────────────────────────────────────────────── */
    kaydet(bant.ad, 'ENGELLİ metriği ekranda', icerir(govde, 'Engelli kaynak'));
    kaydet(bant.ad, 'KARŞILAŞTIRILAMADI metriği ekranda AYRI',
      icerir(govde, 'Karşılaştırılamadı'));
    kaydet(bant.ad, 'iki hâl AYNI cümlede toplanmamış',
      icerir(govde, 'Engelli kaynak') && icerir(govde, 'Karşılaştırılamadı')
      && !icerir(govde, 'sorunlu kaynak'));

    /* Kapsam cümlesi neyin GÖRÜLMEDİĞİNİ söylüyor mu. */
    kaydet(bant.ad, 'kapsam cümlesi kaç kaynağın tarandığını yazıyor',
      /\d+\s*\/\s*\d+\s+kaynak taranıyor/.test(govde),
      (/[^·]*kaynak taranıyor/.exec(govde)?.[0] ?? '').trim().slice(0, 70));

    /* ── KAYNAK GÖRÜNÜMÜ ───────────────────────────────────────────── */
    await page.goto(`${KOK}/mevzuat-radari?mercek=kaynaklar`, { waitUntil: 'networkidle' });
    const kaynakGovde = (await page.locator('main').first().textContent()) ?? '';

    kaydet(bant.ad, 'kaynak listesi açıldı', icerir(kaynakGovde, 'DEMO-KAYNAK'));
    kaydet(bant.ad, 'taraması KAPALI kaynak "KAPALI" diyor',
      icerir(kaynakGovde, 'KAPALI'));
    kaydet(bant.ad, 'ENGELLİ kaynak satırda ADIYLA duruyor',
      icerir(kaynakGovde, 'ENGELLİ'));
    kaydet(bant.ad, 'KARŞILAŞTIRILAMADI satırda ADIYLA duruyor',
      icerir(kaynakGovde, 'KARŞILAŞTIRILAMADI'));

    /* ── ÇEKMECE: ENGELLİ KAYNAKTA TARAMA AÇILAMAZ ─────────────────── */
    const engelliSatir = satirBul(page, 'DEMO-KAYNAK-ENGELLI');
    if (await engelliSatir.count() > 0) {
      await engelliSatir.click();
      await page.waitForTimeout(300);
      const cekmece = (await page.locator('body').textContent()) ?? '';
      kaydet(bant.ad, 'engelli kaynak çekmecesi engeli AÇIKÇA söylüyor',
        icerir(cekmece, 'aşmaz') || icerir(cekmece, 'AÇILAMAZ'),
        cekmece.slice(cekmece.indexOf('ENGELLİ'), cekmece.indexOf('ENGELLİ') + 90).replace(/\s+/g, ' '));
      const acmaDugmesi = page.getByRole('button', { name: /taramayı aç/i });
      kaydet(bant.ad, 'engelli kaynakta "taramayı aç" düğmesi YOK',
        await acmaDugmesi.count() === 0);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    } else {
      kaydet(bant.ad, 'engelli kaynak satırı bulundu', false, 'satır yok — fikstür mü boş');
    }

    /* ── ADAY ÇEKMECESİ VE GEREKÇESİZ KARAR ────────────────────────── */
    await page.goto(`${KOK}/mevzuat-radari`, { waitUntil: 'networkidle' });
    const adaySatir = page.locator('[role="row"], .vt-satir, tbody tr')
      .filter({ hasText: 'Kurgusal tebliğ değişikliği' }).first();

    if (await adaySatir.count() > 0) {
      await adaySatir.click();
      await page.waitForTimeout(300);
      const cekmece = (await page.locator('body').textContent()) ?? '';
      kaydet(bant.ad, 'aday çekmecesi ÖNERİ olduğunu söylüyor',
        icerir(cekmece, 'ÖNERİDİR') || icerir(cekmece, 'hiçbir şeyi değiştirmedi'));
      kaydet(bant.ad, 'adayın adresi çekmecede', icerir(cekmece, 'kurgusal-merci.ornek')
        || icerir(cekmece, 'Adres'));

      if (bant.tiklar) {
        /* TÜRKÇE BÜYÜK HARF TUZAĞI, İKİNCİ YÜZÜ: `/^ilgisiz$/i` düğmeyi
           BULMAZ — JS'in case-insensitive eşlemesi `İ` (U+0130) ile `i`yi
           denk saymaz. Ad TAM DİZE olarak verilir. */
        const ilgisiz = page.getByRole('button', { name: 'İlgisiz' });
        if (await ilgisiz.count() > 0) {
          await ilgisiz.first().click();
          await page.waitForTimeout(200);
          /* GEREKÇE BOŞ BIRAKILIR: iddia "gerekçesiz karar reddedilir". */
          const kaydet2 = page.getByRole('button', { name: /kaydet/i }).first();
          await kaydet2.click();
          await page.waitForTimeout(700);
          const sonra = (await page.locator('body').textContent()) ?? '';
          kaydet(bant.ad, 'GEREKÇESİZ karar REDDEDİLDİ',
            icerir(sonra, 'Gerekçe en az') || icerir(sonra, 'karakter'),
            sonra.slice(0, 100).replace(/\s+/g, ' '));
          kaydet(bant.ad, 'red sonrası aday hâlâ "Yeni"',
            icerir(sonra, 'Yeni — inceleme bekliyor'));
        } else {
          kaydet(bant.ad, '"İlgisiz" düğmesi çekmecede', false, 'düğme yok');
        }
      }
      await page.keyboard.press('Escape');
    } else {
      kaydet(bant.ad, 'aday satırı bulundu', false, 'satır yok — fikstür mü boş');
    }

    await context.close();
  }
} finally { await browser.close(); }

/* ÖLÇÜM TABANI. Kusur sayısı sıfır olabilir; ÖLÇÜM sayısı olamaz.
   Fikstürde kaynak ya da aday yoksa betik yalnız birkaç iddia sayıp
   "geçti" derdi — hiçbir şeye bakmadan temiz raporlamak tam budur.
   Ölçüldü: tam koşum 30 iddia üretiyor (geniş bantta iki tıklama
   iddiası fazladan). Taban 22: iki bant da kaynak listesini açıp iki
   ayrı hâli ve engelli çekmecesini ölçmeden bu sayıya ulaşılamaz.
   Taban ölçümle konuldu ve ölçülen sayının ÜSTÜNE çıkarılmadı. */
const ASGARI_IDDIA = 22;
if (iddialar.length < ASGARI_IDDIA) {
  console.error(`\nÖLÇÜM YETERSİZ: ${iddialar.length} iddia ölçüldü, taban ${ASGARI_IDDIA}.`);
  console.error('  Kaynak ya da aday satırı bulunamadıysa bu bir EKRAN kusuru değil,');
  console.error('  fikstürün bu ekranı beslememesidir — ama ölçülmemiş bir kapı');
  console.error('  "geçti" diye yazılmaz. Veritabanını yeniden kurun: npm run db:hazirla');
  process.exit(1);
}

const kirmizi = iddialar.filter((i) => !i.ok);
console.log(`\nMevzuat radarı kanıtı: ${iddialar.length - kirmizi.length}/${iddialar.length}`
  + ` iddia geçti · bant ${BANTLAR.length}`);
if (kirmizi.length > 0) {
  console.error('KIRMIZI iddialar:');
  for (const i of kirmizi) console.error(`  · ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
  process.exit(1);
}
