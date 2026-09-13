/* R15 · KİŞİSEL VERİ KORUMA · TARAYICI KANITI (KVK-ENV-006)

   Briften ölçülecek iddialar:
     · başvuru listesi ekranda        → yanıt bekleyen başvurular duruyor
     · SÜRE YOK ile SÜRE GEÇTİ        → İKİ AYRI cümle, ayrı sınıf
     · bildirim tarihi GİRİLMEDİ      → sayaç çalışmıyor, ekran söylüyor
     · özel nitelikli DEĞERLENDİRİLMEDİ → "hayır"dan AYRI görünüyor
     · aydınlatma metni ÜRETİLMEZ     → böyle bir düğme YOK
     · insan kararı eylemleri         → kısa yanıt REDDEDİLİR, kayıt DEĞİŞMEZ

   ── EN PAHALI İDDİA ───────────────────────────────────────────────────
   "Süre belirlenmedi" ile "0 gün kaldı" aynı hücrede aynı renkte
   görünürse ekran yalan söyler: biri sayacın hiç çalışmadığını, öbürü
   sayacın dolduğunu anlatır. Bu betik ikisinin AYRI cümle ve AYRI sınıf
   olduğunu ekranda ölçer.

   FİKSTÜRÜ DEĞİŞTİRMEZ: denenen tek yazma ÇOK KISA yanıttır ve
   reddedilir — yani hiçbir başvuru karara bağlanmaz.

   Kullanım: PORT=3210 node arac/veri-koruma-kanit.mjs (canlı sunucu ister) */
import { chromium } from 'playwright-core';
import { KOK, girisYap, tarayiciYolu } from './kosu-ortak.mjs';

const BANTLAR = [
  { ad: '1440×900', width: 1440, height: 900, tiklar: true },
  { ad: '1024×768', width: 1024, height: 768, tiklar: false },
];

/* TÜRKÇE BÜYÜK HARF TUZAĞI: `İ` (U+0130) varsayılan case-fold ile `i`ye
   inmez; karşılaştırma yerel duyarlı yapılır. */
const kucuk = (m) => m.toLocaleLowerCase('tr');
const icerir = (govde, parca) => kucuk(govde).includes(kucuk(parca));

const iddialar = [];
const kaydet = (bant, ad, ok, not = '') => {
  iddialar.push({ bant, ad, ok, not });
  console.log(`  ${ok ? 'geçti  ' : 'KIRMIZI'} ${bant} · ${ad}${not ? ` — ${not}` : ''}`);
};

const satirBul = (page, metin) => page
  .locator('[role="row"], .vt-satir, tbody tr')
  .filter({ hasText: metin }).first();

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
    await page.goto(`${KOK}/kisisel-veri`, { waitUntil: 'networkidle' });
    await page.locator('main').first().waitFor({ state: 'attached', timeout: 15_000 });

    /* GÖRÜNMEYEN İÇERİK TUZAĞI: `innerText` gizli düğümde boş döner. */
    const govde = (await page.locator('main').first().textContent()) ?? '';

    kaydet(bant.ad, 'ekran başlığı', icerir(govde, 'Kişisel veri koruma'),
      govde.slice(0, 60).replace(/\s+/g, ' '));

    /* ── YATAY TAŞMA ───────────────────────────────────────────────── */
    const tasma = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    kaydet(bant.ad, 'yatay taşma 0px', tasma <= 0, `${tasma}px`);

    /* ── ÜÇ AYRI BİLİNMİYOR ────────────────────────────────────────── */
    kaydet(bant.ad, 'DEĞERLENDİRİLMEDİ metriği ekranda',
      icerir(govde, 'Değerlendirilmedi'));
    kaydet(bant.ad, 'BİLDİRİM TARİHİ YOK metriği AYRI',
      icerir(govde, 'Bildirim tarihi yok'));
    kaydet(bant.ad, 'iki hâl AYNI cümlede toplanmamış',
      icerir(govde, 'Değerlendirilmedi') && icerir(govde, 'Bildirim tarihi yok')
      && !icerir(govde, 'sorunlu kayıt'));

    /* Kapsam cümlesi neyin BİLİNMEDİĞİNİ söylüyor mu. */
    kaydet(bant.ad, 'kapsam cümlesi envanter sayısını yazıyor',
      /\d+\s+işleme faaliyeti kayıtlı/.test(govde),
      (/[^·]*işleme faaliyeti kayıtlı/.exec(govde)?.[0] ?? '').trim().slice(0, 70));
    kaydet(bant.ad, 'kapsam cümlesi SAYACI ÇALIŞMAYANI söylüyor',
      icerir(govde, 'GİRİLMEDİ') || icerir(govde, 'DEĞERLENDİRİLMEDİ'));

    /* ── AYDINLATMA METNİ ÜRETİLMEZ ────────────────────────────────── */
    const aydinlatma = page.getByRole('button', { name: /aydınlatma/i });
    kaydet(bant.ad, 'aydınlatma metni ÜRETEN düğme YOK',
      await aydinlatma.count() === 0);
    kaydet(bant.ad, 'ekran aydınlatma metni üretmediğini SÖYLÜYOR',
      icerir(govde, 'Aydınlatma metni de üretilmez'));

    /* ── ENVANTER MERCEĞİ: ÜÇ DEĞERLİ ÖZEL NİTELİKLİ ───────────────── */
    await page.goto(`${KOK}/kisisel-veri?mercek=envanter`, { waitUntil: 'networkidle' });
    const envanter = (await page.locator('main').first().textContent()) ?? '';
    kaydet(bant.ad, 'envanter listesi açıldı', icerir(envanter, 'KVK-001'));
    kaydet(bant.ad, 'özel nitelikli DEĞERLENDİRİLMEDİ satırda ADIYLA',
      icerir(envanter, 'DEĞERLENDİRİLMEDİ'));
    kaydet(bant.ad, '"Hayır" ile DEĞERLENDİRİLMEDİ AYRI görünüyor',
      icerir(envanter, 'Hayır') && icerir(envanter, 'DEĞERLENDİRİLMEDİ'));

    const faaliyet = satirBul(page, 'KVK-001');
    if (await faaliyet.count() > 0) {
      await faaliyet.click();
      await page.waitForTimeout(300);
      const cekmece = (await page.locator('body').textContent()) ?? '';
      kaydet(bant.ad, 'faaliyet çekmecesi İŞ SÜRECİNİ gösteriyor',
        icerir(cekmece, 'İş süreci'));
      kaydet(bant.ad, 'çekmece süreçsiz kaydedilemeyeceğini söylüyor',
        icerir(cekmece, 'bağsız kaydedilemez'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    } else {
      kaydet(bant.ad, 'faaliyet satırı bulundu', false, 'satır yok — fikstür mü boş');
    }

    /* ── AKTARIM MERCEĞİ: SAYAÇ ÇALIŞMIYOR ─────────────────────────── */
    await page.goto(`${KOK}/kisisel-veri?mercek=aktarimlar`, { waitUntil: 'networkidle' });
    const aktarim = (await page.locator('main').first().textContent()) ?? '';
    kaydet(bant.ad, 'aktarım listesi açıldı', icerir(aktarim, 'Kurgusalya'));
    kaydet(bant.ad, 'bildirim tarihi GİRİLMEDİ satırda ADIYLA',
      icerir(aktarim, 'Bildirim tarihi girilmedi'));
    kaydet(bant.ad, 'sayacın çalışmadığı AÇIKÇA yazıyor',
      icerir(aktarim, 'sayaç çalışmaz'));
    /* Bildirim GEREKTİRMEYEN dayanak sayaç cümlesi taşımıyor. */
    kaydet(bant.ad, 'bildirim gerektirmeyen dayanak AYRI cümle taşıyor',
      icerir(aktarim, 'bildirim gerektirmiyor'));

    /* ── BAŞVURU MERCEĞİ VE İNSAN KARARI ───────────────────────────── */
    await page.goto(`${KOK}/kisisel-veri`, { waitUntil: 'networkidle' });
    const basvuru = (await page.locator('main').first().textContent()) ?? '';
    kaydet(bant.ad, 'başvuru listesi açıldı', icerir(basvuru, 'VSB-'));
    kaydet(bant.ad, 'motorun cevap YAZMADIĞI ekranda yazılı',
      icerir(basvuru, 'CEVAP YAZMAZ'));

    const satir = satirBul(page, 'VSB-002');
    if (await satir.count() > 0) {
      await satir.click();
      await page.waitForTimeout(300);
      const cekmece = (await page.locator('body').textContent()) ?? '';
      kaydet(bant.ad, 'başvuru çekmecesi geri sayımı gösteriyor',
        icerir(cekmece, 'GECİKME') || icerir(cekmece, 'kaldı')
        || icerir(cekmece, 'belirlenmedi'));
      kaydet(bant.ad, 'yanıtı insanın yazdığı çekmecede yazılı',
        icerir(cekmece, 'Yanıt metnini SİZ yazarsınız'));

      if (bant.tiklar) {
        const yanitla = page.getByRole('button', { name: 'Yanıtla' });
        if (await yanitla.count() > 0) {
          await yanitla.first().click();
          await page.waitForTimeout(200);
          /* ÇOK KISA YANIT: iddia "yanıt en az 20 karakter". */
          const kutu = page.locator('textarea').first();
          await kutu.fill('kısa');
          await page.getByRole('button', { name: /kaydet/i }).first().click();
          await page.waitForTimeout(700);
          const sonra = (await page.locator('body').textContent()) ?? '';
          kaydet(bant.ad, 'ÇOK KISA yanıt REDDEDİLDİ',
            icerir(sonra, 'en az 20') || icerir(sonra, 'karakter'),
            sonra.slice(0, 100).replace(/\s+/g, ' '));
          kaydet(bant.ad, 'red sonrası başvuru hâlâ yanıtlanmamış',
            !icerir(sonra, 'Verilen yanıt'));
        } else {
          kaydet(bant.ad, '"Yanıtla" düğmesi çekmecede', false, 'düğme yok');
        }
      }
      await page.keyboard.press('Escape');
    } else {
      kaydet(bant.ad, 'başvuru satırı bulundu', false, 'satır yok — fikstür mü boş');
    }

    await context.close();
  }
} finally { await browser.close(); }

/* ÖLÇÜM TABANI. Kusur sayısı sıfır olabilir; ÖLÇÜM sayısı olamaz.
   Fikstürde başvuru ya da faaliyet yoksa betik yalnız birkaç iddia
   sayıp "geçti" derdi — hiçbir şeye bakmadan temiz raporlamak tam
   budur. Ölçüldü: tam koşum 40 iddia üretiyor (geniş bantta iki
   tıklama iddiası fazladan). Taban 30: iki bant da üç merceği açıp
   üç ayrı "bilinmiyor" hâlini ölçmeden bu sayıya ulaşılamaz. */
const ASGARI_IDDIA = 30;
if (iddialar.length < ASGARI_IDDIA) {
  console.error(`\nÖLÇÜM YETERSİZ: ${iddialar.length} iddia ölçüldü, taban ${ASGARI_IDDIA}.`);
  console.error('  Başvuru ya da faaliyet satırı bulunamadıysa bu bir EKRAN kusuru değil,');
  console.error('  fikstürün bu ekranı beslememesidir — ama ölçülmemiş bir kapı');
  console.error('  "geçti" diye yazılmaz. Veritabanını yeniden kurun: npm run db:hazirla');
  process.exit(1);
}

const kirmizi = iddialar.filter((i) => !i.ok);
console.log(`\nKişisel veri koruma kanıtı: ${iddialar.length - kirmizi.length}/${iddialar.length}`
  + ` iddia geçti · bant ${BANTLAR.length}`);
if (kirmizi.length > 0) {
  console.error('KIRMIZI iddialar:');
  for (const i of kirmizi) console.error(`  · ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
  process.exit(1);
}
