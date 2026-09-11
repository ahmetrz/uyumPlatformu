/* R10+ · TAKVİM TETİKLİ YÜKÜMLÜLÜK · TARAYICI KANITI (OLY-BIL-006)

   Briften ölçülecek dört iddia:
     · bir dönem AÇILIYOR              → ekranda dönem etiketiyle duruyor
     · geri sayım DOĞRU                → sunucunun son tarihinden türeyen
                                          gün sayısı ekranda yazılı
     · SÜRESİZ dönemde sayaç YOK       → "belirlenmedi" der, sayı yazmaz
     · motor hiçbir dönemi "yapıldı"    → açık dönemde teslim kaydı yok ve
       yazamıyor                          referans alanı boş

   Saf kurallar `tests/bildirim-donemi.test.ts`te, zincir
   `tests/bildirim-donemi-zincir.test.ts`te. Burada ölçülen EKRANIN
   KENDİSİ ve en pahalı iddia REFERANSSIZ TESLİM'in tarayıcıda
   reddedilmesi: kapı sunucu eyleminde, düğme istemcide ve arada bir
   sunucu eylemi sınırı var — R12'de tam o sınırda bir kusur ölçüldü
   (`'use server'` dosyası nesne ihraç ediyordu; tsc · lint · derleme
   temizdi, düğme tarayıcıda 500 döndü).

   FİKSTÜRÜ DEĞİŞTİRMEZ: referanssız teslim REDDEDİLİR, yani hiçbir dönem
   kapanmaz. `kanit:bildirim-kaydi`den farkı budur ve bilinçlidir — aynı
   sunucuda ardışık koşan iki betikten biri öbürünün fikstürünü bozmasın.

   Kullanım: PORT=3210 node arac/bildirim-donemi-kanit.mjs  (canlı sunucu ister) */
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

/** Satırı koduyla bulur — dizinle değil: sıralama ölçüme göre değişir. */
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
    /* `hepsi` merceği: varsayılan görünüm kapanmış dönemleri gizler ve
       ölçüm neyin gizlendiğine değil, neyin GÖSTERİLDİĞİNE bakmalı. */
    await page.goto(`${KOK}/raporlar/takvim?mercek=hepsi`, { waitUntil: 'networkidle' });

    /* 1 · Neredeyim. */
    const baslik = await page.locator('h1').first().innerText();
    kaydet(bant.ad, 'ekran başlığı', icerir(baslik, 'raporlama dönemi'),
      baslik.replace(/\s+/g, ' ').trim());

    /* 2 · Sayfa yana kaymıyor. */
    const tasma = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    kaydet(bant.ad, 'yatay taşma 0px', tasma === 0, `${tasma}px`);

    const govde = await page.locator('main').innerText();

    /* 3 · DÖNEM AÇILDI. Fikstürde açılmış dönem yoksa bu bir EKRAN kusuru
       değil fikstür kusurudur — ama sessiz geçilmez: taban kırmızı yakar. */
    const yillikSatir = satirBul(page, 'DEMO-DONEM-YILLIK');
    const acildi = (await yillikSatir.count()) > 0;
    kaydet(bant.ad, 'açılmış dönem listede', acildi);
    if (!acildi) { await context.close(); continue; }
    const yillikMetin = (await yillikSatir.innerText()).replace(/\s+/g, ' ');
    kaydet(bant.ad, 'dönem etiketi yazılı', /\b20\d\d\b/.test(yillikMetin),
      yillikMetin.match(/\b20\d\d\b/)?.[0] ?? 'yok');

    /* 4 · GERİ SAYIM DOĞRU. Ekranın yazdığı gün sayısı, ekranın kendi
       yazdığı son tarihten türemeli. İkisini AYRI yerlerden okuyup
       karşılaştırmak, tek yere bakıp "sayı var" demekten farklıdır:
       tutarsız bir çift, ikisi de tek başına doğru görünürken kırmızı
       yanar (ekran cümleleri BİRLİKTE tutarlı olmalı). */
    kaydet(bant.ad, 'geri sayım satırda', /\d+ gün .*(kaldı|GECİKME)/.test(yillikMetin),
      yillikMetin.match(/\d+ gün[^·]*/)?.[0]?.trim() ?? 'yok');

    /* 5 · SÜRESİZ DÖNEMDE SAYAÇ YOK. İki ayrı hâl, ikisi de ölçülür:
       teslim süresi olmayan dönem ve periyodu hiç belirlenmemiş
       yükümlülük. İkisi de sayı YAZMAZ. */
    const teslimsiz = satirBul(page, 'DEMO-DONEM-TESLIMSIZ');
    const teslimsizVar = (await teslimsiz.count()) > 0;
    kaydet(bant.ad, 'teslim süresiz dönem listede', teslimsizVar);
    if (teslimsizVar) {
      const m = (await teslimsiz.innerText()).replace(/\s+/g, ' ');
      kaydet(bant.ad, 'teslim süresiz dönemde "belirlenmedi"', icerir(m, 'belirlenmedi'), m);
      kaydet(bant.ad, 'teslim süresiz dönemde SAYAÇ YOK',
        !/\d+ gün .*(kaldı|GECİKME)/.test(m), m);
    }

    const donemsiz = satirBul(page, 'DEMO-DONEM-BELIRSIZ');
    const donemsizVar = (await donemsiz.count()) > 0;
    kaydet(bant.ad, 'dönemi belirlenmemiş yükümlülük listede', donemsizVar);
    if (donemsizVar) {
      const m = (await donemsiz.innerText()).replace(/\s+/g, ' ');
      kaydet(bant.ad, 'dönemsiz satırda "Dönem mevzuatta belirlenmedi"',
        icerir(m, 'Dönem mevzuatta belirlenmedi'), m);
      kaydet(bant.ad, 'dönemsiz satırda SAYAÇ YOK',
        !/\d+ gün .*(kaldı|GECİKME)/.test(m), m);
    }

    /* 6 · BİLİNMEYEN METRİĞİ AYRI. "Dönemi belirlenmemiş" sayısı ekranda
       kendi başına durur; açık dönem sayısına eklenmez, sıfıra da
       çekilmez. */
    kaydet(bant.ad, 'bilinmeyen metriği ayrı', icerir(govde, 'Dönemi belirlenmemiş'));

    if (!bant.tiklar) { await context.close(); continue; }

    /* 7 · MOTOR "YAPILDI" YAZAMIYOR — çekmecede ölçülür. */
    const oncekiYol = new URL(page.url()).pathname;
    await yillikSatir.click();
    const cekmece = page.locator('.ab-panel, [role="dialog"], aside').first();
    await cekmece.waitFor({ timeout: 5000 });
    /* ── SABİT `true` BİR İDDİA DEĞİLDİR (düzeltme turu · tur 2 · P2-5) ─
       Satır raporda "geçti" yazıyordu ve HİÇBİR ŞEY ölçmüyordu: üstündeki
       `waitFor` düşerse koşum zaten patlar, düşmezse bu satır her hâlde
       yeşil yanar. Yani rapora bakan insan, ölçülmüş bir iddia ile
       ölçülmemiş bir cümleyi ayırt edemiyordu — deponun "hiçbir şey
       ölçmeden yeşil yanan kapı" sınıfı. Bugün gözlem yazılır. */
    kaydet(bant.ad, 'satır seçimi çekmece açıyor',
      await cekmece.isVisible() && (await cekmece.innerText()).trim().length > 0,
      `çekmece metni ${(await cekmece.innerText()).trim().length} karakter`);
    /* ÖLÇÜLEN ŞEY YOLDUR, TAM URL DEĞİL. İlk turda bu iddia TAM URL'i
       karşılaştırıyordu ve kırmızı yandı — kusur ekranda değil İDDİADAYDI:
       seçim `?sec=` ile URL'e yazılıyor ve bu bilerek yapılıyor (çekmece
       derin bağlanabilir olmalı, seçili kayıt paylaşılabilmeli). Sayfa
       atlaması YOLUN değişmesidir; sorgu dizesinin değişmesi tam tersine
       bir ÖZELLİKTİR ve aşağıda ayrıca ölçülür. */
    kaydet(bant.ad, 'sayfa atlaması yok (yol değişmedi)',
      new URL(page.url()).pathname === oncekiYol, page.url());
    kaydet(bant.ad, 'seçim derin bağlanabilir (`?sec=`)',
      new URL(page.url()).searchParams.has('sec'));

    const c = (await cekmece.innerText()).replace(/\s+/g, ' ');
    kaydet(bant.ad, 'açık dönemde teslim kaydı YOK', !icerir(c, 'Referans:'), c.slice(0, 120));
    kaydet(bant.ad, 'çekmece "verildi YAZAMAZ" diyor', icerir(c, 'YAZAMAZ'));
    kaydet(bant.ad, 'dayanak çekmecede', icerir(c, 'Dayanak'));

    /* 8 · REFERANSSIZ TESLİM REDDEDİLİYOR — en pahalı iddia. Düğmeye
       basılır, alan BOŞ bırakılır, sunucu eylemi çağrılır ve kapının
       gerekçesi ekranda görünür. Fikstür DEĞİŞMEZ: dönem açık kalır. */
    await cekmece.getByRole('button', { name: 'Verildi olarak işaretle' }).click();
    const onay = cekmece.getByRole('button', { name: /Verildi olarak işaretle/ });
    await onay.waitFor({ timeout: 5000 });
    kaydet(bant.ad, 'referans alanı açıldı',
      (await cekmece.locator('input.ab-girdi').count()) > 0);
    await onay.click();
    /* BEKLEME KAPININ CÜMLESİNE KİLİTLENİR. `getByText(/referans/i)` ile
       beklemek burada ÖLÇMEZ: çekmecenin dip notu zaten "Referansı olmayan
       bir teslim denetimde doğrulanamaz" diyor ve bekleme daha sunucu
       cevap vermeden çözülürdü — tüketilmiş fikstür tuzağının bu
       ekrandaki hâli. Yoklama sınırlı turda döner; bulamazsa SUSMAZ,
       aşağıdaki iddia kırmızı yanar. */
    let sonra = '';
    for (let i = 0; i < 60; i += 1) {
      sonra = (await cekmece.innerText()).replace(/\s+/g, ' ');
      if (icerir(sonra, 'referans numarası zorunlu')) break;
      await page.waitForTimeout(250);
    }
    kaydet(bant.ad, 'referanssız teslim REDDEDİLDİ',
      icerir(sonra, 'referans numarası zorunlu'), sonra.slice(0, 180));
    kaydet(bant.ad, 'red sonrası dönem hâlâ açık',
      !icerir(sonra, 'Referans:'), sonra.slice(0, 120));

    await context.close();
  }
} finally { await browser.close(); }

/* ÖLÇÜM TABANI. Kusur sayısı sıfır olabilir; ÖLÇÜM sayısı olamaz.
   Fikstürde açılmış dönem yoksa betik yalnız üç iddia sayıp "geçti"
   derdi — hiçbir şeye bakmadan temiz raporlamak tam olarak budur.
   Ölçüldü: tam koşum 33 iddia üretiyor; taban onun altına düşmeye izin
   vermez. Taban 28: iki bant da dönem satırlarını bulup ekran
   iddialarını ölçmeden ve geniş bant çekmeceyi açıp referanssız teslimi
   denemeden bu sayıya ulaşılamaz. Taban ölçümle konuldu ve ölçülen
   sayının ÜSTÜNE çıkarılmadı. */
const ASGARI_IDDIA = 28;
if (iddialar.length < ASGARI_IDDIA) {
  console.error(`\nÖLÇÜM YETERSİZ: ${iddialar.length} iddia ölçüldü, taban ${ASGARI_IDDIA}.`);
  console.error('  Dönem satırı bulunamadıysa bu bir EKRAN kusuru değil, fikstürün bu');
  console.error('  ekranı beslememesidir — ama ölçülmemiş bir kapı "geçti" diye');
  console.error('  yazılmaz. Veritabanını yeniden kurun: npm run db:hazirla');
  process.exit(1);
}

const kirmizi = iddialar.filter((i) => !i.ok);
console.log(`\nBildirim dönemi kanıtı: ${iddialar.length - kirmizi.length}/${iddialar.length}`
  + ` iddia geçti · bant ${BANTLAR.length}`);
if (kirmizi.length > 0) {
  console.error('KIRMIZI iddialar:');
  for (const i of kirmizi) console.error(`  · ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
  process.exit(1);
}
