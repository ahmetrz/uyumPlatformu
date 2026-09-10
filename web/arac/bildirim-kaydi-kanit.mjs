/* R10 · OLAY → MEVZUAT BİLDİRİMİ · TARAYICI KANITI (OLY-BIL)

   Saf kurallar testte, zincir veritabanı testinde. Burada ölçülen şey
   EKRANIN KENDİSİ: geri sayım gerçekten görünüyor mu, süresiz yükümlülük
   sayaç göstermiyor mu, ve en pahalı iddia — REFERANSSIZ GÖNDERİM
   TARAYICIDA REDDEDİLİYOR MU.

   Bu son iddia bir birim testiyle kanıtlanamaz: kapı sunucu eyleminde
   ama düğme istemcide ve ikisi arasında bir sunucu eylemi sınırı var.
   R12'de tam bu sınırda bir kusur ölçüldü (`'use server'` dosyası nesne
   ihraç ediyordu; tsc · lint · derleme · rota duman temizdi, düğme 500
   döndü). O yüzden burada TIKLANIR.

   FİKSTÜRÜ DEĞİŞTİRİR: bir taslağı "gönderildi" yapar. CI her koşumda
   veritabanını yeniden kurduğu için sorun değil; yerelde ikinci koşumdan
   önce `npm run db:hazirla` gerekir ve betik taslak bulamazsa SUSMAZ,
   kırmızı yanar.

   Kullanım: PORT=3210 node arac/bildirim-kaydi-kanit.mjs   (canlı sunucu ister) */
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

const browser = await chromium.launch({
  executablePath: tarayiciYolu(), headless: true, args: ['--no-sandbox'],
});
try {
  for (const bant of BANTLAR) {
    const context = await browser.newContext({ viewport: { width: bant.width, height: bant.height } });
    const page = await context.newPage();
    await girisYap(page);
    await page.goto(`${KOK}/olaylar`, { waitUntil: 'networkidle' });

    const baslik = await page.locator('h1').first().innerText();
    kaydet(bant.ad, 'ekran başlığı', icerir(baslik, 'Olay'), baslik.replace(/\s+/g, ' ').trim());

    const tasma = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    kaydet(bant.ad, 'yatay taşma 0px', tasma === 0, `${tasma}px`);

    /* BİLDİRİM KAYDI OLAN olayı bul: her satır tıklanır, çekmecede blok
       aranır. Blok hiçbir olayda yoksa bu bir EKRAN kusuru değil fikstür
       kusurudur — ama sessiz geçilmez, aşağıdaki taban kırmızı yakar. */
    const satirlar = page.locator('[role="row"], .vt-satir, tbody tr');
    const sayi = await satirlar.count();
    kaydet(bant.ad, 'liste dolu', sayi > 0, `${sayi} satır`);

    let cekmece = null;
    let blokMetni = '';
    for (let i = 0; i < sayi; i += 1) {
      await satirlar.nth(i).click();
      const c = page.locator('.ab-panel, [role="dialog"], aside').first();
      await c.waitFor({ timeout: 5000 });
      const metin = await c.innerText();
      if (icerir(metin, 'Bildirim yükümlülükleri')) { cekmece = c; blokMetni = metin; break; }
    }

    kaydet(bant.ad, 'bildirim yükümlülükleri bloğu var', cekmece !== null);
    if (!cekmece) { await context.close(); continue; }

    /* İKİ DURUM AYNI EKRANDA: geri sayımı OLAN ve OLMAYAN. */
    kaydet(bant.ad, 'merci adı yazılı', icerir(blokMetni, 'Kurgusal Merci'));
    /* Kalıp DAR: yalnız "3 gün 4 saat kaldı" biçimi sayılır. Yalın
       `kaldı` sözcüğü ilk turda olay BAŞLIĞINDAKİ "kayıt dışı kaldı"
       ifadesine takıldı ve kanıt kendi kendini yanlış doğruladı. */
    const GERI_SAYIM = /\d+\s+(gün|saat|dakika)\s+.*?(kaldı|GECİKME)/;
    kaydet(bant.ad, 'geri sayım görünüyor',
      GERI_SAYIM.test(blokMetni),
      blokMetni.match(new RegExp(`[^\n]*${GERI_SAYIM.source}[^\n]*`))?.[0]?.trim() ?? 'bulunamadı');
    kaydet(bant.ad, 'SÜRESİZ yükümlülükte sayaç YOK, mevzuatın hâli yazılı',
      icerir(blokMetni, 'Süre mevzuatta belirlenmedi'));

    /* AYNI SATIRDA İKİ SÖZ ÇELİŞEMEZ. Ölçüldü (bu betiğin ilk koşumu):
       motor kaydı her zaman `taslak` açıyordu ve süresi ÇOKTAN geçmiş bir
       olay için ekran "Taslak hazır — gönderilmedi · 6 gün 0 saat GECİKME"
       diyordu. İki cümlenin ikisi de doğru biçimliydi, ikisi de dolu
       veriydi ve HİÇBİR kapı göremiyordu — kusuru rapordaki satırı okuyan
       insan gördü. Kapının kendisi göremediği bir kusuru kanıtlamış
       sayılmaz; iddia bu yüzden buraya YAZILDI ve gecikmiş bir kaydın
       "Taslak hazır" DEMEDİĞİ ölçülür. */
    const gecikmeSatirlari = blokMetni.split('\n').filter((r) => r.includes('GECİKME'));
    const celisen = gecikmeSatirlari.filter((r) => icerir(r, 'Taslak hazır'));
    kaydet(bant.ad, 'gecikmiş kayıt "Taslak hazır" DEMİYOR — çelişen satır yok',
      gecikmeSatirlari.length > 0 && celisen.length === 0,
      celisen.length > 0
        ? `çelişen: ${celisen[0].trim().slice(0, 90)}`
        : `${gecikmeSatirlari.length} gecikme satırı, çelişen 0`);
    kaydet(bant.ad, 'kanal notu yazılı (adres değil)', icerir(blokMetni, 'Kanal:'));
    /* Kanal notu bir ADRES DEĞİLDİR: ekranda uç nokta görünmemeli. */
    kaydet(bant.ad, 'ekranda uç nokta/adres yok',
      !/https?:\/\/|vault:|env:|dosya:/i.test(blokMetni));

    if (!bant.tiklar) { await context.close(); continue; }

    /* ── EN PAHALI İDDİA: REFERANSSIZ GÖNDERİM REDDEDİLİR ───────────── */
    const isaretle = cekmece.getByRole('button', { name: /Gönderildi olarak işaretle/ }).first();
    kaydet(bant.ad, 'gönderim düğmesi var', await isaretle.count() > 0);
    if (await isaretle.count() === 0) { await context.close(); continue; }

    await isaretle.click();
    const alan = cekmece.locator('input.ab-girdi').first();
    await alan.waitFor({ timeout: 5000 });
    kaydet(bant.ad, 'referans alanı açıldı', true);

    /* Boş referansla gönder: sunucu REDDETMELİ ve kayıt DEĞİŞMEMELİ. */
    const gonder = cekmece.getByRole('button', { name: /Gönderildi olarak işaretle/ }).first();
    await gonder.click();
    await page.waitForTimeout(1500);
    const bosSonra = await cekmece.innerText();
    kaydet(bant.ad, 'REFERANSSIZ gönderim reddedildi',
      icerir(bosSonra, 'referans numarası zorunlu'),
      /* Not alanı HATA satırını gösterir, alan ETİKETİNİ değil: ilk turda
         etiketi ("Merciden alınan referans numarası") yazıyordu ve rapor
         okuyan, kapının çalıştığını değil formun açıldığını görüyordu. */
      bosSonra.match(/[^\n]*referans numarası zorunlu[^\n]*/i)?.[0]?.trim().slice(0, 110)
        ?? 'hata mesajı bulunamadı');
    kaydet(bant.ad, 'kayıt "Gönderildi" olmadı', !icerir(bosSonra, 'Referans:'));

    /* Referansla gönder: geçmeli ve referans ekranda kalmalı. */
    const referans = `KANIT-${Date.now()}`;
    await alan.fill(referans);
    await gonder.click();
    /* Başarılı yazma `revalidatePath` tetikler ve çekmece KAPANABİLİR;
       ilk turda betik kapanan çekmeceyi okumaya çalışıp zaman aşımına
       düştü. Kayıt SUNUCUDAN yeniden okunur: ekranın kalıcı hâli budur,
       çekmecenin o anki DOM'u değil. */
    await page.waitForTimeout(2500);
    await page.goto(`${KOK}/olaylar`, { waitUntil: 'networkidle' });
    let doluSonra = '';
    const yeniSatirlar = page.locator('[role="row"], .vt-satir, tbody tr');
    for (let i = 0; i < await yeniSatirlar.count(); i += 1) {
      await yeniSatirlar.nth(i).click();
      const c = page.locator('.ab-panel, [role="dialog"], aside').first();
      await c.waitFor({ timeout: 5000 });
      const metin = await c.innerText();
      if (icerir(metin, 'Bildirim yükümlülükleri')) { cekmece = c; doluSonra = metin; break; }
    }
    kaydet(bant.ad, 'referansla gönderim geçti', icerir(doluSonra, 'Gönderildi'),
      doluSonra.match(/[^\n]*Gönderildi[^\n]*/)?.[0]?.trim().slice(0, 90) ?? 'bulunamadı');
    kaydet(bant.ad, 'referans numarası ekranda kalıyor', icerir(doluSonra, referans));
    kaydet(bant.ad, 'gönderim sonrası TEYİT eylemi çıkıyor',
      icerir(doluSonra, 'Merci teyidini işle'));

    await context.close();
  }
} finally { await browser.close(); }

/* ÖLÇÜM TABANI. Kusur sayısı sıfır olabilir; ÖLÇÜM sayısı olamaz.
   Fikstürde bildirim kaydı yoksa betik yalnız üç iddia sayıp "geçti"
   derdi — hiçbir şeye bakmadan temiz raporlamak tam olarak budur.
   Ölçüldü: tam koşum 27 iddia üretiyor; taban onun altına düşmeye izin
   vermez ve düşerse SEBEBİNİ yazar. Taban 24: iki bant da bloğu bulup
   ekran iddialarını ölçmeden bu sayıya ulaşılamaz. */
const ASGARI_IDDIA = 24;
if (iddialar.length < ASGARI_IDDIA) {
  console.error(`\nÖLÇÜM YETERSİZ: ${iddialar.length} iddia ölçüldü, taban ${ASGARI_IDDIA}.`);
  console.error('  Çekmecede bildirim bloğu bulunamadıysa bu bir EKRAN kusuru değil,');
  console.error('  fikstürün bu ekranı beslememesidir — ama ölçülmemiş bir kapı');
  console.error('  "geçti" diye yazılmaz. Veritabanını yeniden kurun: npm run db:hazirla');
  process.exit(1);
}

const kirmizi = iddialar.filter((i) => !i.ok);
console.log(`\nBildirim kaydı kanıtı: ${iddialar.length - kirmizi.length}/${iddialar.length}`
  + ` iddia geçti · bant ${BANTLAR.length}`);
if (kirmizi.length > 0) {
  console.error('KIRMIZI iddialar:');
  for (const i of kirmizi) console.error(`  · ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
  process.exit(1);
}
