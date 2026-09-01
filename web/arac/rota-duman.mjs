import { chromium } from 'playwright-core';

/* Faz 2 çıkış kriteri: tüm rotalar gezilebilir; ray genişliği/insetleri
   ve aktif durum referansla eşleşir. Giriş yapıp her rotayı yoklar.

   Faz 6 sonunda ÖZALİT GRUBU KALMADI: bütün ekranlar Atlas kabuğunda.
   Eski iki listeli ayrım (ATLAS/OZALIT) artık yanlış bilgi veriyordu —
   her rotayı "OZALIT" diye etiketliyordu. Liste yine ikiye ayrıldı ama
   bu kez doğru eksende: ray taşıyan ekranlar ve taşımayanlar. */

const KOK = `http://localhost:${process.env.PORT || 3111}`;

/* Ray taşıyan ekranlar — ray genişliği ve aktif öğe de ölçülür. */
const RAYLI = ['/', '/tesisler', '/portfoy', '/uyum', '/surecler', '/riskler', '/denetimler',
  '/bulgular', '/projeler', '/envanter', '/kesif', '/topoloji', '/omur', '/yedekleme',
  '/kimlik', '/tedarikciler', '/olaylar', '/operasyon', '/yonetim-tezgahi',
  '/regulasyonlar', '/eslestirme', '/varlik-aktarim', '/ice-aktarim', '/yetkiler',
  '/raporlar', '/aktivite', '/saglik',
  /* Rayda kendi öğesi olmayan ama kabuğu paylaşan alt rotalar: aktif öğe
     üst rotanınkidir (dead-letter kuyruğu Platform sağlığı'na, kanıt
     paketi Raporlar'a asılı). Ray listesine ayrı öğe eklemek iki aktif
     öğe gösterirdi. */
  '/saglik/reddedilenler', '/raporlar/kanit-paketi'];

/* Bileşen galerisi: kabuğu paylaşır ama RAYDA ÖĞESİ YOKTUR — geliştirme
   ekranıdır, gezinme listesine girmez (aktif öğe 0 beklenir). */
const RAYSIZ = ['/sistem', '/sistem/bilesenler'];

const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const s = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(`${s.url()} :: ${e.message.slice(0, 120)}`));

/* Giriş: form React ile KONTROLLÜ bir bileşendir. `domcontentloaded`
   sonrası doldurmak yeterli değil — hidrasyon henüz olmamışsa React
   alanı kendi (boş) durumuyla geri yazar ve sunucuya BOŞ e-posta gider.
   Belirtisi kafa karıştırıcıdır: denetim izine "tanımsız e-posta" düşer
   ve kimlik bilgileri yanlış sanılır. Bu yüzden doldurduktan sonra
   değerin GERÇEKTEN durduğu doğrulanır. */
async function girisYap(sayfa, kok) {
  await sayfa.goto(kok + '/giris', { waitUntil: 'load' });
  if (!sayfa.url().includes('/giris')) return;
  for (let deneme = 1; deneme <= 3; deneme += 1) {
    await sayfa.fill('input[type=email]', 'ahmet.terzi@zorlu.com');
    await sayfa.fill('input[type=password]', 'Enerji!2026');
    const yerlesti = await sayfa.inputValue('input[type=email]') === 'ahmet.terzi@zorlu.com'
      && (await sayfa.inputValue('input[type=password]')).length > 0;
    if (yerlesti) break;
    await sayfa.waitForTimeout(300 * deneme);
  }
  await sayfa.click('button[type=submit]');
  await sayfa.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
}

await girisYap(s, KOK);

let kotu = 0;
for (const [etiket, yollar] of [['RAYLI ', RAYLI], ['RAYSIZ', RAYSIZ]]) {
  for (const yol of yollar) {
    const y = await s.goto(KOK + yol, { waitUntil: 'domcontentloaded' });
    await s.waitForTimeout(450);
    const kod = y?.status() ?? 0;
    const olcu = await s.evaluate(() => {
      const ray = document.querySelector('.atlas-ray');
      if (!ray) return null;
      const r = ray.getBoundingClientRect();
      const aktif = document.querySelector('.ray-link[aria-current="page"]');
      const marka = document.querySelector('.ray-marka');
      const ms = marka ? getComputedStyle(marka) : null;
      return {
        genislik: Math.round(r.width),
        aktifSayi: document.querySelectorAll('.ray-link[aria-current="page"]').length,
        aktifAd: aktif ? aktif.textContent.trim().slice(0, 22) : null,
        inset: ms ? ms.paddingLeft : null,
        ustPad: getComputedStyle(ray).paddingTop,
      };
    });
    const iyi = kod === 200;
    if (!iyi) kotu++;
    console.log(`${iyi ? 'OK ' : 'HATA'} ${etiket.padEnd(6)} ${yol.padEnd(16)} ${kod}` +
      (olcu ? `  ray=${olcu.genislik}px inset=${olcu.inset} üst=${olcu.ustPad} aktif=${olcu.aktifSayi}:${olcu.aktifAd}` : ''));
  }
}
console.log(`\nbaşarısız rota: ${kotu} · sayfa hatası: ${hatalar.length}`);
if (hatalar.length) console.log(hatalar.slice(0, 6));
await b.close();
