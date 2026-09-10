/* P6 · KİMLİK VE SSO · TARAYICI KANITI (SIS-KML)

   Briften ölçülecekler:
     · `/ayarlar/kimlik` iki bantta çalışıyor ve BOŞ hâli "ne yapabilirim"
       diyor
     · SIR DEĞERİ HİÇBİR EKRANDA GÖRÜNMÜYOR — form sırra giden ADRESİ
       ister, çekmece maskeli adresi gösterir
     · sağlayıcı BAĞLI DEĞİL doğuyor; bağlanmadan aktif EDİLEMİYOR
     · aktif edilince giriş ekranında "… ile giriş yap" çıkıyor, aktiflik
       kaldırılınca DÜŞÜYOR
     · tanınmayan kimlik ret cümlesi giriş ekranında görünüyor

   Kimlik jetonu doğrulaması BURADA ölçülmez: gerçek bir IdP'ye
   bağlanmak bu deponun kuralına aykırıdır. O katman sahte bir sağlayıcıyla
   `tests/kimlik-oidc.test.ts` ve `tests/kimlik-akis.test.ts`te ölçülür;
   burada ölçülen EKRANIN KENDİSİ ve sunucu eylemi sınırıdır — R12'de tam
   o sınırda bir kusur çıkmıştı (`'use server'` dosyası nesne ihraç
   ediyordu; tsc · lint · derleme temizdi, düğme tarayıcıda 500 döndü).

   FİKSTÜRÜ GERİ ALIR: ürettiği sağlayıcıyı sonda AKTİFLİKTEN ÇIKARIR ve
   giriş ekranından düştüğünü DOĞRULAR. Temizlik adımı son koşulunu ölçer.

   Kullanım: PORT=3210 node arac/kimlik-kanit.mjs   (canlı sunucu ister) */
import { chromium } from 'playwright-core';
import { KOK, girisYap, tarayiciYolu } from './kosu-ortak.mjs';

const BANTLAR = [
  { ad: '1440×900', width: 1440, height: 900, yazar: true },
  { ad: '1024×768', width: 1024, height: 768, yazar: false },
];

const kucuk = (m) => m.toLocaleLowerCase('tr');
const icerir = (govde, parca) => kucuk(govde).includes(kucuk(parca));

/* GİRİŞ EKRANI TUZAĞI — ölçüldü ve bu betik ona DÜŞTÜ (ilk tur, beş
   kırmızı). `/giris` sinematik bir açılışın içinde yaşar ve içerik
   animasyon bitene kadar GÖRÜNMEZ; `innerText` görünmeyen düğümün
   metnini BOŞ döndürür, `locator(...).count()` ise DOM'da onu bulur.
   Sonuç: aynı sayfada "bağ var" geçerken "metin yok" kırmızı yanıyordu
   ve kusur EKRANDA değil BETİKTEYDİ. Giriş ekranında `textContent`
   okunur — stil uygulanmadan, ham metin. */
const hamMetin = async (loc) => (await loc.evaluate((e) => e.textContent ?? ''));

const iddialar = [];
const kaydet = (bant, ad, ok, not = '') => {
  iddialar.push({ bant, ad, ok, not });
  console.log(`  ${ok ? 'geçti  ' : 'KIRMIZI'} ${bant} · ${ad}${not ? ` — ${not}` : ''}`);
};

/* KURGUSAL sağlayıcı. Gerçek bir kimlik sağlayıcı adı, adresi ya da
   istemci kimliği BURAYA GİRMEZ; depo geneldir. */
const AD = `Kurgusal IdP ${Date.now()}`;
const ALANLAR = [
  ['Sağlayıcı adı', AD],
  ['Issuer', 'https://kurgusal-idp.ornek/'],
  ['İstemci kimliği (client_id)', 'kurgusal-istemci'],
  ['İstemci sırrı ADRESİ', 'env:KURGUSAL_OIDC_SIR'],
  ['Yetkilendirme ucu', 'https://kurgusal-idp.ornek/yetki'],
  ['Jeton ucu', 'https://kurgusal-idp.ornek/jeton'],
  ['JWKS ucu', 'https://kurgusal-idp.ornek/jwks'],
  ['Yönlendirme adresi', 'https://urun.ornek/kimlik/geri'],
];
/* Formda GERÇEKTEN YAZILAN ve reddedilmesi gereken bir "sır değeri".
   İlk turda bu sabit hiçbir yere yazılmıyordu ve "sayfada yok" iddiası
   HİÇBİR ŞEY ölçmüyordu — hiç yazılmayan bir dize elbette görünmez.
   Bugün: değer alana YAZILIR, sunucu kapısı onu REDDEDER ve ancak
   ondan sonra "ekranda görünmüyor" iddiası bir şey ölçer. */
const SIR_DEGERI = 'BU-DEGER-EKRANDA-GORUNMEMELI';

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
    await page.goto(`${KOK}/ayarlar/kimlik`, { waitUntil: 'networkidle' });

    /* 1 · Neredeyim ve sayfa kaymıyor. */
    const baslik = await page.locator('h1').first().innerText();
    kaydet(bant.ad, 'ekran başlığı', icerir(baslik, 'kurum hesabıyla giriş'),
      baslik.replace(/\s+/g, ' ').trim());
    const tasma = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    kaydet(bant.ad, 'yatay taşma 0px', tasma === 0, `${tasma}px`);

    const govde = await page.locator('main').innerText();

    /* 2 · Oturum politikası: kayıt yoksa VARSAYILAN olduğu yazılı. */
    kaydet(bant.ad, 'oturum politikası bölümü', icerir(govde, 'Oturum politikası'));
    kaydet(bant.ad, 'politika varsayılanı ya da değeri yazılı',
      /VARSAYILAN uygulanıyor|Mutlak \d+ saat/.test(govde),
      (govde.match(/(VARSAYILAN uygulanıyor|Mutlak \d+ saat)[^\n]*/) ?? ['yok'])[0]);

    /* 3 · MFA: anahtar yoksa "bağlı değil" der ve SESSİZ DÜŞMEZ. */
    kaydet(bant.ad, 'MFA bölümü var', icerir(govde, 'Çok adımlı doğrulama'));
    kaydet(bant.ad, 'MFA hâli açıkça yazılı',
      /BAĞLI DEĞİL|kullanıcıda doğrulanmış TOTP/.test(govde),
      (govde.match(/(BAĞLI DEĞİL|\d+\/\d+ kullanıcıda)[^\n]*/) ?? ['yok'])[0]);

    if (!bant.yazar) { await context.close(); continue; }

    /* 4 · YENİ SAĞLAYICI — form sır DEĞERİ değil ADRES ister. */
    const yeniDugme = page.getByRole('button', { name: /(Yeni )?[Ss]ağlayıcı tanımla/ }).first();
    kaydet(bant.ad, 'sağlayıcı tanımlama düğmesi', await yeniDugme.count() > 0);
    await yeniDugme.click();
    const cekmece = page.locator('.ab-panel, [role="dialog"], aside').first();
    await cekmece.waitFor({ timeout: 5000 });

    const formMetni = (await cekmece.innerText()).replace(/\s+/g, ' ');
    kaydet(bant.ad, 'sır alanı ADRES ister, DEĞER değil',
      icerir(formMetni, 'Sırrın DEĞERİ değil adresi'), '');
    kaydet(bant.ad, 'JIT varsayılan KAPALI',
      !(await cekmece.locator('input[type="checkbox"]').first().isChecked()));

    /* 4a · SIR DEĞERİ YAPIŞTIRILIRSA SUNUCU REDDEDER. En pahalı iddia
       budur ve ancak değer GERÇEKTEN yazılınca ölçülür. */
    for (const [etiket, deger] of ALANLAR) {
      const d = etiket === 'İstemci sırrı ADRESİ' ? SIR_DEGERI : deger;
      await cekmece.locator(`label:has-text("${etiket}") input`).first().fill(d);
    }
    await cekmece.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForTimeout(1200);
    /* ÇEKMECE HÂLÂ AÇIK OLMALI: red kabul edilirse form kapanır ve
       aşağıdaki okuma zaman aşımına düşerdi. Zaman aşımı bir ölçüm
       değildir — bu yüzden hâl ÖNCE sorulur ve kapanmışsa BULGU olarak
       kaydedilir (sabotaj turunda ölçüldü: sunucu kapısı devre dışıyken
       betik kırmızı yazmak yerine ÇÖKÜYORDU). */
    const cekmeceAcik = await cekmece.count() > 0 && await cekmece.isVisible();
    const retMetni2 = cekmeceAcik
      ? (await cekmece.innerText()).replace(/\s+/g, ' ')
      : '(çekmece kapandı — kayıt REDDEDİLMEDİ)';
    kaydet(bant.ad, 'yapıştırılan SIR DEĞERİ reddedildi',
      cekmeceAcik && icerir(retMetni2, 'Sır DEĞERİ buraya yazılmaz'), retMetni2.slice(0, 140));
    kaydet(bant.ad, 'red sonrası kayıt AÇILMADI',
      !icerir(await page.locator('main').innerText(), AD), '');
    if (!cekmeceAcik) {
      /* Kapı düştüyse kalan adımlar (bağla · aktif et · giriş ekranı) bu
         bandın fikstürünü bozmadan koşamaz; bant burada kapanır ve
         eksik iddialar ÖLÇÜM TABANINDA görünür. */
      await context.close();
      continue;
    }

    /* 4b · Doğru biçimde ADRES verilir ve kayıt geçer. */
    await cekmece.locator('label:has-text("İstemci sırrı ADRESİ") input').first()
      .fill('env:KURGUSAL_OIDC_SIR');
    await cekmece.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForTimeout(1200);

    /* 5 · Kayıt BAĞLI DEĞİL doğar. */
    const liste = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    kaydet(bant.ad, 'sağlayıcı listede', icerir(liste, AD), '');
    kaydet(bant.ad, 'kayıt BAĞLI DEĞİL doğdu',
      icerir(liste, 'Yapılandırma tam — bağlanmayı bekliyor'), '');

    /* 6 · SIR DEĞERİ HİÇBİR YERDE GÖRÜNMÜYOR. */
    const satir = page.locator('[role="row"], .vt-satir, tbody tr').filter({ hasText: AD }).first();
    await satir.click();
    const detay = page.locator('.ab-panel, [role="dialog"], aside').first();
    await detay.waitFor({ timeout: 5000 });
    const detayMetni = (await detay.innerText()).replace(/\s+/g, ' ');
    kaydet(bant.ad, 'çekmecede MASKELİ adres var',
      icerir(detayMetni, 'env: KURGUSAL_OIDC_SIR'), '');
    const tumSayfa = await page.content();
    kaydet(bant.ad, 'SIR DEĞERİ sayfada YOK', !tumSayfa.includes(SIR_DEGERI));
    kaydet(bant.ad, 'otomatik hesap açma KAPALI yazıyor',
      icerir(detayMetni, 'Kapalı — tanınmayan kimlik REDDEDİLİR'), '');

    /* 7 · BAĞLA → AKTİF ET. İki ayrı karar, iki ayrı düğme. */
    await detay.getByRole('button', { name: 'Bağla' }).click();
    await page.waitForTimeout(1200);
    const sonrasi = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    kaydet(bant.ad, 'bağlandı ama giriş ekranında GÖRÜNMÜYOR',
      icerir(sonrasi, 'Bağlı — giriş ekranında GÖRÜNMÜYOR'), '');

    await satir.click();
    await detay.waitFor({ timeout: 5000 });
    await detay.getByRole('button', { name: 'Giriş ekranında göster' }).click();
    await page.waitForTimeout(1200);
    kaydet(bant.ad, 'aktif edildi',
      icerir((await page.locator('main').innerText()), 'Giriş ekranında görünüyor'), '');

    /* 8 · GİRİŞ EKRANI — "kurum hesabıyla gir" yalnız bağlı VE aktif
       sağlayıcı varsa çizilir. */
    const oturumsuz = await browser.newContext({
      viewport: { width: bant.width, height: bant.height },
    });
    const gs = await oturumsuz.newPage();
    await gs.goto(`${KOK}/giris`, { waitUntil: 'networkidle' });
    const girisMetni = await hamMetin(gs.locator('main'));
    kaydet(bant.ad, 'giriş ekranında kurum hesabı bölümü',
      icerir(girisMetni, 'Kurum kimlik sağlayıcısı'), '');
    kaydet(bant.ad, 'sağlayıcı adıyla düğme',
      icerir(girisMetni, `${AD} ile giriş yap`), '');
    const bag = gs.locator(`a[href*="/kimlik/basla"]`).first();
    kaydet(bant.ad, 'düğme JavaScript istemeyen bir BAĞ', await bag.count() > 0);

    /* 9 · RET CÜMLELERİ — tanınmayan kimlik ne yapması gerektiğini söyler. */
    await gs.goto(`${KOK}/giris?kimlik=taninmayan`, { waitUntil: 'networkidle' });
    const retMetni = await hamMetin(gs.locator('main'));
    kaydet(bant.ad, 'tanınmayan kimlik ret cümlesi',
      icerir(retMetni, 'bu kurulumda bir hesabınız yok'), '');
    kaydet(bant.ad, 'ret cümlesi NE YAPILACAĞINI söylüyor',
      icerir(retMetni, 'Yöneticinizden hesabınızı açmasını isteyin'), '');

    /* 10 · BAĞLI OLMAYAN SAĞLAYICIYA doğrudan adresle başlanamaz. */
    await gs.goto(`${KOK}/kimlik/basla?saglayici=yok-boyle-bir-saglayici`,
      { waitUntil: 'networkidle' });
    kaydet(bant.ad, 'bilinmeyen sağlayıcı girişe geri atıyor',
      gs.url().includes('/giris'), gs.url().replace(KOK, ''));
    kaydet(bant.ad, 'ret sebebi ekranda',
      icerir(await hamMetin(gs.locator('main')), 'bağlı değil'), '');
    await oturumsuz.close();

    /* 11 · TEMİZLİK SON KOŞULUNU DOĞRULAR: aktiflik kaldırılır ve giriş
       ekranından DÜŞTÜĞÜ ölçülür. Bu hem bir temizlik hem bir iddiadır. */
    await page.goto(`${KOK}/ayarlar/kimlik`, { waitUntil: 'networkidle' });
    await page.locator('[role="row"], .vt-satir, tbody tr').filter({ hasText: AD })
      .first().click();
    const detay2 = page.locator('.ab-panel, [role="dialog"], aside').first();
    await detay2.waitFor({ timeout: 5000 });
    await detay2.getByRole('button', { name: 'Giriş ekranından kaldır' }).click();
    await page.waitForTimeout(1200);

    const temiz = await browser.newContext({
      viewport: { width: bant.width, height: bant.height },
    });
    const ts = await temiz.newPage();
    await ts.goto(`${KOK}/giris`, { waitUntil: 'networkidle' });
    kaydet(bant.ad, 'aktiflik kalkınca düğme DÜŞÜYOR',
      !icerir(await hamMetin(ts.locator('main')), `${AD} ile giriş yap`), '');
    await temiz.close();

    await context.close();
  }
} finally { await browser.close(); }

/* ÖLÇÜM TABANI. Kusur sayısı sıfır olabilir; ÖLÇÜM sayısı olamaz.
   Ölçüldü: tam koşum 32 iddia üretiyor; taban onun altına düşmeye izin
   vermez. Taban 28: iki bant da ekran iddialarını ölçmeden ve geniş bant
   sağlayıcıyı kurup bağlayıp aktif etmeden bu sayıya ulaşılamaz. Taban
   22 → 28: yapıştırılan sır değerinin reddi ölçüsü eklendi (iki iddia)
   ve önceki taban ölçülen sayının çok altındaydı. Taban ölçümle konuldu
   ve ölçülen sayının ÜSTÜNE çıkarılmadı. */
const ASGARI_IDDIA = 28;
if (iddialar.length < ASGARI_IDDIA) {
  console.error(`\nÖLÇÜM YETERSİZ: ${iddialar.length} iddia ölçüldü, taban ${ASGARI_IDDIA}.`);
  console.error('  Ekran açılmadıysa ya da form doldurulamadıysa bu bir EKRAN kusurudur');
  console.error('  ama ölçülmemiş bir kapı "geçti" diye yazılmaz.');
  process.exit(1);
}

const kirmizi = iddialar.filter((i) => !i.ok);
console.log(`\nKimlik kanıtı: ${iddialar.length - kirmizi.length}/${iddialar.length}`
  + ` iddia geçti · bant ${BANTLAR.length}`);
if (kirmizi.length > 0) {
  console.error('KIRMIZI iddialar:');
  for (const i of kirmizi) console.error(`  · ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
  process.exit(1);
}
