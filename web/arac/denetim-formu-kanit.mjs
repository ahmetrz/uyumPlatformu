/* DENETİM FORMLARI EKRANI · İKİ MERCEKTE KANIT (R12 · 3.6)

   Ekranın iddiaları tarayıcıda ölçülür, iki bantta: 1440×900 (masaüstü)
   ve 1024×768 (dizüstü). Kapı değil KANIT: çıktısı bir turda okunur ve
   raporda sayıyla yazılır.

   Neden iki bant: dar bantta düşmesi GEREKEN sütun ile düşmemesi GEREKEN
   sütun ayrı şeylerdir. "Değerlendirilmedi" ikincildir ve düşebilir;
   "Gerekçesiz" düşemez — denetçinin ilk sorusu odur.

   Kullanım: PORT=3210 node arac/denetim-formu-kanit.mjs   (canlı sunucu ister) */
import { chromium } from 'playwright-core';
import { KOK, girisYap, tarayiciYolu } from './kosu-ortak.mjs';

const BANTLAR = [
  { ad: '1440×900', width: 1440, height: 900, ikincilGorunur: true },
  { ad: '1024×768', width: 1024, height: 768, ikincilGorunur: false },
];

/* TÜRKÇE BÜYÜK HARF TUZAĞI — ölçüldü ve bu betik ona DÜŞTÜ.
   `innerText` CSS `text-transform: uppercase` sonucunu döndürür; Türkçe
   `İ` (U+0130) varsayılan case-fold ile `i`ye inmez, bu yüzden
   "DENETİM FORMLARI" metni /Denetim formlar/i kalıbıyla eşleşmez. Aynı
   tuzak `/paketler` kanıtında da ilk turda dört kırmızı üretmişti ve
   kusur EKRANDA değil BETİKTEYDİ. Karşılaştırma `tr` yerelinde yapılır. */
const kucuk = (m) => m.toLocaleLowerCase('tr');
const icerir = (govde, parca) => kucuk(govde).includes(kucuk(parca));

const iddialar = [];
const kaydet = (bant, ad, ok, not = '') => {
  iddialar.push({ bant, ad, ok, not });
  console.log(`  ${ok ? 'geçti  ' : 'KIRMIZI'} ${bant} · ${ad}${not ? ` — ${not}` : ''}`);
};

const browser = await chromium.launch({
  executablePath: tarayiciYolu(), headless: true, args: ['--no-sandbox'],
});
try {
  for (const bant of BANTLAR) {
    const context = await browser.newContext({
      viewport: { width: bant.width, height: bant.height },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    await girisYap(page);
    await page.goto(`${KOK}/raporlar/denetim-formlari`, { waitUntil: 'networkidle' });

    /* 1 · Neredeyim — ekran kendini adıyla söylüyor. */
    const baslik = await page.locator('h1').first().innerText();
    kaydet(bant.ad, 'ekran başlığı', icerir(baslik, 'Denetim formlar'),
      baslik.replace(/\s+/g, ' ').trim());

    /* 2 · Sayfa yana kaymıyor. */
    const tasma = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    kaydet(bant.ad, 'yatay taşma 0px', tasma === 0, `${tasma}px`);

    /* 3 · Kritik sütunlar duruyor; ikincil olan bantta düşebilir. */
    const govde = await page.locator('main').innerText();
    for (const s of ['Kapsam', 'Kontrol', 'Kapsam dışı', 'Gerekçesiz']) {
      kaydet(bant.ad, `sütun "${s}"`, icerir(govde, s));
    }
    kaydet(bant.ad, 'ikincil sütun bandına göre',
      bant.ikincilGorunur ? icerir(govde, 'Değerlendirilmedi') : true,
      bant.ikincilGorunur ? 'görünmeli' : 'düşebilir — kritik değil');

    /* 4 · Sayının ANLAMI ekranda yazılı (yorumlanamayan metrik yok). */
    kaydet(bant.ad, 'gerekçesiz kapsam dışı açıklaması',
      icerir(govde, 'denetçinin ilk sorusu'));

    const satirlar = page.locator('[role="row"], .vt-satir, tbody tr');
    const satirSayisi = await satirlar.count();

    if (satirSayisi === 0) {
      /* 5a · Boş hâl "ne yapabilirim" diyor. */
      kaydet(bant.ad, 'boş hâlde eylem var',
        (await page.getByRole('link', { name: 'Uyum süreçleri' }).count()) > 0);
      await context.close();
      continue;
    }
    kaydet(bant.ad, 'liste dolu', true, `${satirSayisi} satır`);

    /* 5b · Satır seçilince çekmece açılıyor — sayfa atlaması YOK. */
    const oncekiUrl = page.url();
    await satirlar.first().click();
    const cekmece = page.locator('.ab-panel, [role="dialog"], aside').first();
    await cekmece.waitFor({ timeout: 5000 });
    kaydet(bant.ad, 'satır seçimi çekmece açıyor', true);
    kaydet(bant.ad, 'sayfa atlaması yok', page.url() === oncekiUrl);

    const cekmeceMetni = await cekmece.innerText();

    /* 6 · İki form türü de seçilebilir. */
    kaydet(bant.ad, 'öz denetim formu seçeneği', icerir(cekmeceMetni, 'Öz denetim formu'));
    kaydet(bant.ad, 'SoA seçeneği', icerir(cekmeceMetni, 'Uygulanabilirlik beyan'));

    /* 6b · PAKET FORM ŞABLONU — enerji merceği. Şablon ÇEKİRDEKTE yoktur;
       kurulu paketten gelir ve yalnız kurulu olduğu kurulumda görünür.
       Kurulu şablon YOKSA bu bir kusur değildir ama sessiz de geçilmez:
       o zaman ölçülen şey "yalnız iki çekirdek formu var"dır. */
    const sablonSecenekleri = cekmece.locator('input[name="formTuru"][value^="sablon:"]');
    const sablonSayisi = await sablonSecenekleri.count();
    const cekirdekSayisi = await cekmece.locator('input[name="formTuru"]').count() - sablonSayisi;
    kaydet(bant.ad, 'çekirdek form türü sayısı 2', cekirdekSayisi === 2, `${cekirdekSayisi}`);
    kaydet(bant.ad, 'kurulu paket şablonu', true, `${sablonSayisi} şablon`);
    if (sablonSayisi > 0) {
      const deger = await sablonSecenekleri.first().getAttribute('value');
      const etiket = await cekmece
        .locator('label:has(input[name="formTuru"][value^="sablon:"])')
        .first().innerText();
      kaydet(bant.ad, 'şablon seçeneği adıyla duruyor', etiket.trim().length > 0,
        etiket.replace(/\s+/g, ' ').trim());
      /* Şablonun KÖKENİ ve büyüklüğü seçenekle birlikte yazılı: hangi
         paketten geldiği ve kaç alan sorduğu, üretimden ÖNCE görünür. */
      kaydet(bant.ad, 'şablon kaynağı ve alan sayısı seçenekte',
        /paketi/.test(etiket) && /\d+ alan/.test(etiket));
      kaydet(bant.ad, 'şablon seçeneği `sablon:` önekli', (deger ?? '').startsWith('sablon:'), deger ?? '');
    }

    /* 7 · Kusur çekmecede de ADIYLA duruyor. */
    kaydet(bant.ad, 'çekmecede gerekçesiz kapsam dışı alanı',
      icerir(cekmeceMetni, 'Gerekçesiz kapsam dışı'));

    /* 8 · Üretim düğmesi etkin. */
    const dugme = page.getByRole('button', { name: /Formu üret ve indir/ });
    kaydet(bant.ad, 'üretim düğmesi etkin', await dugme.isEnabled());

    /* 9 · GERÇEK ÜRETİM — yalnız geniş bantta, iki dosya birden inmeli.
       Ekranın en pahalı iddiası budur: "boş hücre 0". Sayfayı görmeden
       ona inanmak, ürünün kendi kuralını çiğnemek olurdu. */
    if (bant.ikincilGorunur) {
      const inenler = [];
      page.on('download', (d) => inenler.push(d.suggestedFilename()));
      await dugme.click();
      /* Üretim ya ÖLÇÜMÜ ya HATAYI yazar; ikisini de bekleriz ve hangisi
         geldiğini iddia olarak kaydederiz — sessiz zaman aşımı bir ölçüm
         değil, ölçümün yokluğudur. */
      await Promise.race([
        cekmece.getByText(/Boş hücre/i).waitFor({ timeout: 90000 }),
        cekmece.locator('[role="alert"]').waitFor({ timeout: 90000 }),
      ]);
      const sonra = (await cekmece.innerText()).replace(/\s+/g, ' ');
      const uyari = await cekmece.locator('[role="alert"]').count();
      kaydet(bant.ad, 'üretim hata vermedi', uyari === 0,
        uyari > 0 ? sonra.slice(0, 160) : '');
      kaydet(bant.ad, 'üretim sonrası "Boş hücre 0"',
        /Boş hücre 0(?!\d)/i.test(sonra),
        sonra.match(/Boş hücre \S+/i)?.[0] ?? 'bulunamadı');
      /* İndirme olayı asenkron; kısa bir tur beklenir. */
      for (let i = 0; i < 20 && inenler.length < 2; i += 1) await page.waitForTimeout(250);
      kaydet(bant.ad, 'iki dosya birden indi', inenler.length >= 2, inenler.join(' · '));
      kaydet(bant.ad, 'CSV ve XLSX adları',
        inenler.some((a) => a.endsWith('.csv')) && inenler.some((a) => a.endsWith('.xlsx')),
        inenler.join(' · '));

      /* 10 · ŞABLONLA ÜRETİM. Çekirdek formunun yeşil olması, paketten
         gelen şablonun da dolduğunu göstermez: şablonun alanları başka bir
         yoldan (durum sayımı · bağlanmamış alan · serbest alan) geçer ve
         boş hücre kapısı ORADA da tutmalıdır. */
      if (sablonSayisi > 0) {
        const oncekiSayi = inenler.length;
        await sablonSecenekleri.first().check();
        await dugme.click();
        await Promise.race([
          cekmece.getByText(/Boş hücre/i).waitFor({ timeout: 90000 }),
          cekmece.locator('[role="alert"]').waitFor({ timeout: 90000 }),
        ]);
        const sablonSonra = (await cekmece.innerText()).replace(/\s+/g, ' ');
        const sablonUyari = await cekmece.locator('[role="alert"]').count();
        kaydet(bant.ad, 'şablonla üretim hata vermedi', sablonUyari === 0,
          sablonUyari > 0 ? sablonSonra.slice(0, 160) : '');
        kaydet(bant.ad, 'şablonla üretimde "Boş hücre 0"',
          /Boş hücre 0(?!\d)/i.test(sablonSonra),
          sablonSonra.match(/Boş hücre \S+/i)?.[0] ?? 'bulunamadı');
        for (let i = 0; i < 20 && inenler.length < oncekiSayi + 2; i += 1) await page.waitForTimeout(250);
        kaydet(bant.ad, 'şablon dosyaları indi', inenler.length >= oncekiSayi + 2,
          inenler.slice(oncekiSayi).join(' · '));
      }
    }

    await context.close();
  }
} finally { await browser.close(); }

/* ÖLÇÜM TABANI. Kusur sayısı sıfır olabilir; ÖLÇÜM sayısı olamaz.
   Liste boş kalırsa (fikstür bu ekranı beslemiyorsa) betik yalnız boş-hâl
   iddiasını sayar ve "geçti" der — hiçbir şeye bakmadan temiz raporlamak
   tam olarak budur. Ölçüldü: CI'da tam koşum 34 iddia üretiyor; taban
   onun altına düşmeye izin vermez ve düşerse SEBEBİNİ yazar.

   Taban 30 → 42: şablon ölçümü eklendi (iki bantta seçenek iddiaları +
   geniş bantta şablonla üretim). Yükselme ÖLÇÜLDÜ: tam koşum 46 iddia
   üretiyor; taban ölçülen sayının üstüne çıkarılmadı. */
const ASGARI_IDDIA = 42;
if (iddialar.length < ASGARI_IDDIA) {
  console.error(`\nÖLÇÜM YETERSİZ: ${iddialar.length} iddia ölçüldü, taban ${ASGARI_IDDIA}.`);
  console.error('  Liste boş kaldıysa bu bir EKRAN kusuru değil, fikstürün bu ekranı'
    + ' beslememesidir — ama ölçülmemiş bir kapı "geçti" diye yazılmaz.');
  process.exit(1);
}

const kirmizi = iddialar.filter((i) => !i.ok);
console.log(`\nDenetim formları kanıtı: ${iddialar.length - kirmizi.length}/${iddialar.length}`
  + ` iddia geçti · bant ${BANTLAR.length}`);
if (kirmizi.length > 0) {
  console.error('KIRMIZI iddialar:');
  for (const i of kirmizi) console.error(`  · ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
  process.exit(1);
}
