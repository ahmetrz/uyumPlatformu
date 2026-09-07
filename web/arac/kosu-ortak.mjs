/* Tarayıcılı araçların ORTAK parçaları — oturum açma, tarayıcı yolu,
   rota listesi.

   Aynı üç işlev beş araçta kopyalanmıştı ve kopyalar birbirinden
   uzaklaşıyordu: biri hidrasyonu bekliyor, öbürü beklemiyordu; biri
   tarayıcı yolunu adaylardan seçiyor, öbürü sabit yol taşıyordu.
   Tarayıcılı kalite araçları ortak çözümleyiciyi buradan kullanır; böylece
   Playwright revision değişiklikleri tek yerde ele alınır.

   GÜVENLİK: burada kurum sistemine giden hiçbir şey yoktur. Oturum,
   yerel geliştirme sunucusundaki TOHUM kullanıcısıyla açılır
   (prisma/seed.ts); gerçek kimlik bilgisi yoktur, olmamalıdır. */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Uygulama kökü — kalite araçları 3210'da koşar (`next dev` ile çakışmasın). */
export const KOK = `http://localhost:${process.env.PORT || 3210}`;

/* Tohum geliştirme girişi (prisma/seed.ts). Gerçek hesap DEĞİLDİR. */
export const GIRIS = { eposta: 'kullanici.a@demo.local', parola: 'Enerji!2026' };

function playwrightTarayicilari(kok) {
  if (!kok) return [];
  try {
    return readdirSync(kok)
      .filter((ad) => ad.startsWith('chromium'))
      .flatMap((ad) => [
        path.join(kok, ad, 'chrome-linux', 'chrome'),
        path.join(kok, ad, 'chrome-linux64', 'chrome'),
        path.join(kok, ad, 'chrome-headless-shell-linux', 'chrome-headless-shell'),
        path.join(kok, ad, 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
      ]);
  } catch {
    return [];
  }
}

/* Tarayıcı revision'ı Playwright sürümüyle değişir; sabit revision yolu tutulmaz. */
export function tarayiciYolu() {
  if (process.env.CHROME) return process.env.CHROME;
  const adaylar = [
    ...playwrightTarayicilari(process.env.PLAYWRIGHT_BROWSERS_PATH),
    ...playwrightTarayicilari('/opt/pw-browsers'),
    ...playwrightTarayicilari(path.join(os.homedir(), '.cache', 'ms-playwright')),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/local/bin/chromium',
  ];
  const bulunan = adaylar.find((y) => { try { return statSync(y).isFile(); } catch { return false; } });
  if (!bulunan) throw new Error(`Tarayıcı bulunamadı. CHROME=<yol> verin. Bakılanlar: ${adaylar.join(', ')}`);
  return bulunan;
}

/** arac/rotalar.json — kabuk rotalarının kanonik listesi. */
export function rotalarOku() {
  return JSON.parse(readFileSync(path.join(WEB, 'arac', 'rotalar.json'), 'utf8'));
}

/* ── Dinamik rotalar ────────────────────────────────────────────────────
   `rotalar.json` yalnız STATİK rotaları taşır; kayıt detayı ekranları
   (`/tesisler/[id]` gibi) orada yoktur ve `/tesisler` zaten `/portfoy`'a
   yönlenir. Bu, kapılarda ölçülmüş bir KÖR NOKTA üretti: tarayıcılı
   kapılar varsayılan listeyle koşunca altı kayıt detayı ekranının HİÇBİRİ
   taranmıyordu — Tesis 360 dahil, yani kapıların koruması gereken
   yüzeyin ta kendisi.

   Değer UYDURULMAZ: her dinamik segment değerini tohum tablosundan alır;
   tablo boşsa rota listeye girmez ve sebebi raporlanır. Eşleme uzun süre
   yalnız `rota-duman.mjs` içindeydi; kopyalanmasın diye buraya taşındı —
   bu modülün var oluş gerekçesinin aynısı. */
export const TOHUM_KAYNAGI = {
  '/tesisler/[id]': { tablo: 'Tesis', kolon: 'id', sira: 'kod' },
  '/bulgular/[id]': { tablo: 'Bulgu', kolon: 'id', sira: 'baslik' },
  '/denetimler/[id]': { tablo: 'Denetim', kolon: 'id', sira: 'kod' },
  '/riskler/[id]': { tablo: 'Risk', kolon: 'id', sira: 'kod' },
  '/surecler/[id]': { tablo: 'UyumSureci', kolon: 'id', sira: 'kod' },
  /* Çerçeve detayının parametresi id değil regülasyon KODUDUR
     (bkz. uyum/[cerceve]/page.tsx: bağlantı paylaşılabilir olsun diye). */
  '/uyum/[cerceve]': { tablo: 'Regulasyon', kolon: 'kod', sira: 'kod' },
};

const DB_YOL = process.env.DB_YOL || path.join(WEB, 'prisma', 'dev.db');

/* Kayıt BAŞINA bir ekran taranmaz, kayıt VARYANTLARI taranır. Tek kayıt
   ölçmek, içeriğe bağlı kusuru kaçırır ve bunun kanıtı bu depodadır:
   Tesis 360'ın 768px kusuru 17 tesisin YALNIZ 5'inde çıkıyordu (açık
   bulgusu olanlarda). `kod`a göre sıralı ilk üç tesis SAHA-A1 · A2 · A3
   ve kusurlu beşin ikisi (A2, A3) bu üçün içindeydi — yani üç örnek o
   kusuru YAKALARDI, tek örnek kaçırırdı.

   Üç, ölçülmüş bir dengedir: kapsam ile CI süresi arasında. `TOHUM_ORNEK`
   ile artırılabilir. */
const ORNEK_SAYISI = Math.max(1, Number(process.env.TOHUM_ORNEK) || 3);

/** Tek bir dinamik rotanın tohumdaki gerçek değeri. */
export function tohumDegeri(rota) {
  const kaynak = TOHUM_KAYNAGI[rota];
  if (!kaynak) return { hata: 'tohum kaynağı tanımsız (kosu-ortak.mjs · TOHUM_KAYNAGI)' };
  let db;
  try { db = new Database(DB_YOL, { readonly: true }); } catch (e) {
    return { hata: `tohum veritabanı açılamadı: ${e.message}` };
  }
  try {
    /* Sıralama `id`ye göre YAPILMAZ: kimlikler `@default(cuid())` ile
       üretilir ve her seed koşusunda başka bir kayıt "ilk" olur — kapı
       her koşuda farklı bir ekranı ölçerdi ve borç tavanları koşudan
       koşuya oynardı. Sıra, tohumda ELLE yazılmış bir alandan alınır
       (kod ya da başlık); kimlik yalnız URL'e konur. */
    const satirlar = db.prepare(
      `select ${kaynak.kolon} as v from ${kaynak.tablo}`
      + ` order by ${kaynak.sira ?? kaynak.kolon} limit ${ORNEK_SAYISI}`,
    ).all();
    if (satirlar.length === 0) return { hata: `tohumda ${kaynak.tablo} kaydı yok` };
    return {
      degerler: satirlar.map((r) => String(r.v)),
      kaynak: `${kaynak.tablo}.${kaynak.kolon}`,
    };
  } catch (e) {
    return { hata: `tohum sorgusu başarısız (${kaynak.tablo}): ${e.message}` };
  } finally {
    db?.close();
  }
}

/**
 * Dinamik rotaların somut URL'leri, KALIPLARIYLA birlikte.
 *
 * Kalıp şart: tohum kimlikleri `@default(cuid())` ile üretilir ve her
 * seed koşusunda DEĞİŞİR. Kalite borcu satırı somut URL'e anahtarlansaydı
 * CI'daki kimlik yerelde ölçülene hiç uymaz, satır "düzelmiş" görünür ve
 * aynı bulgu "yeni" diye kapıyı yakardı — kilitlenirdi.
 *
 * Değeri çözülemeyen rota SESSİZCE düşmez: `atlanan` içinde sebebiyle
 * döner ve çağıran onu yazar.
 */
export function dinamikRotalar() {
  const liste = [];
  const atlanan = [];
  for (const kalip of Object.keys(TOHUM_KAYNAGI)) {
    const d = tohumDegeri(kalip);
    if (d.hata) { atlanan.push({ rota: kalip, sebep: d.hata }); continue; }
    for (const deger of d.degerler) {
      liste.push({ kalip, url: kalip.replace(/\[[^\]]+\]/, encodeURIComponent(deger)) });
    }
  }
  return { liste, url: liste.map((x) => x.url), atlanan };
}

/** Somut URL → kalıp eşlemesi; kalıbı olmayan rota kendisini döner. */
export function kalipCozucu(dinamik) {
  const eslesme = new Map((dinamik?.liste ?? []).map((x) => [x.url, x.kalip]));
  return (rota) => eslesme.get(rota) ?? rota;
}

/** `--rota=` verilmiş mi — kapılar varsayılan kapsamı bilmek ister. */
export function rotaBayragiVar() {
  return process.argv.some((a) => a.startsWith('--rota='));
}

/** `--rota=/a,/b` bayrağı varsa onu, yoksa verilen varsayılanı döner. */
export function rotaBayragi(varsayilan) {
  const arg = process.argv.find((a) => a.startsWith('--rota='));
  return arg ? arg.slice('--rota='.length).split(',').map((r) => (r === '' ? '/' : r)) : varsayilan;
}

/** `--ad <deger>` biçimli bayrak; yoksa `null`. */
export function bayrakDegeri(ad) {
  const i = process.argv.indexOf(ad);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

/**
 * `app` altındaki her `page.tsx` → rota yolu. Grup segmentleri `(x)` düşer.
 *
 * Buraya TAŞINDI (eskiden `rota-duman.mjs` içindeydi): oturumsuz liste
 * çapraz kontrolü de aynı envanteri istiyor ve iki kopya birbirinden
 * uzaklaşırdı — bu modülün var oluş gerekçesinin aynısı. Kapsam DİSKTEN
 * gelir, elle tutulan `rotalar.json`dan değil; elle tutulan bir listeyi
 * elle tutulan başka bir listeye karşı kontrol etmek, ikisinin de aynı
 * yüzeyi kaçırmasını engellemez (ölçüldü: `/giris` ikisinde de yoktu).
 */
export function sayfaEnvanteri() {
  const app = path.join(WEB, 'app');
  const cikti = [];
  const gez = (d) => {
    for (const ad of readdirSync(d).sort()) {
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) { gez(tam); continue; }
      if (ad !== 'page.tsx') continue;
      const bagil = path.relative(app, path.dirname(tam));
      const segmentler = bagil === '' ? [] : bagil.split(path.sep).filter((s) => !/^\(.*\)$/.test(s));
      cikti.push({
        kaynak: path.relative(WEB, tam),
        rota: `/${segmentler.join('/')}`.replace(/\/$/, '') || '/',
        grup: (bagil.match(/\(([^)]+)\)/g) ?? []).join(''),
        dinamik: segmentler.filter((s) => /^\[.*\]$/.test(s)),
      });
    }
  };
  gez(app);
  return cikti.sort((a, b) => a.rota.localeCompare(b.rota));
}

/* ── OTURUMSUZ YÜZEYLER ─────────────────────────────────────────────────
   İki tarayıcılı kapı da ölçmeden ÖNCE oturum açar. Bunun sessiz bedeli
   şudur: oturum İSTEMEYEN yüzeyler hiç ölçülmez, çünkü giriş yapmış bir
   tarayıcı onları hiç görmez — sunucu `/giris`'i doğrudan panoya
   yönlendirir. `rotalar.json` da `/giris`i taşımaz. Yani ürünün İLK
   gördüğü yüzey iki kapının da dışındaydı.

   ÖLÇÜLDÜ (oturumsuz · 7 Eylül 2026): `/giris` 375px'te sayfayı 25px
   kaydırıyordu — `minmax(0, 1fr) 400px` ızgarasında görsel sütunu 0px'e
   çöküyor ve 400px form şeridi taşırıyor. `/riskler/[id]`'de kapıların
   YAKALADIĞI kusurun aynısı; burada yalnız kimse bakmıyordu.

   Liste UYDURULMAZ ve kendiliğinden büyümez: yalnız oturum
   GEREKTİRMEYEN gerçek yüzeyler girer. Her satır bir NÖBETÇİ seçici
   taşır — sayfanın gerçekten o yüzey olduğunun kanıtı. Nöbetçi
   bulunamazsa tarama KIRIKTIR ve kapı kırmızıdır; bu, "yanlış yüzeyi
   ölçmek ölçmemekten beterdir" kuralının oturumsuz karşılığıdır
   (oturum çerezi sızarsa `/giris` panoya yönlenir ve kapı sessizce
   PANOYU ölçmeye başlardı). */
export const OTURUMSUZ_ROTALAR = [
  /* `/giris` İKİ yüzeydir: sinematik giriş (PR #28) ve CTA'dan sonraki
     gerçek form. İkisi de oturumsuzdur ve ikisi de ölçülür — `nobetci`
     giriş yüzeyini, `formNobetci` formu kanıtlar. Tek nöbetçiyle
     kalsaydı ölçüm ya girişte takılır ya formu hiç görmezdi. */
  {
    yol: '/giris',
    nobetci: 'a[href="#platform-arayuzu"], input[type=email]',
    formNobetci: 'input[type=email]',
    ctaTakip: true,
    kod: 200,
  },
  /* 404 da bir YÜZEYDİR ve oturum istemez: yanlış adres yazan ya da
     taşınmış bir bağlantıya tıklayan herkes onu görür. `rotalar.json`da
     olamaz (bir rota değil, rotasızlığın ekranı), o yüzden burada
     yaşar. Yol bilerek var olmayan bir adrestir. */
  { yol: '/boyle-bir-rota-yok', nobetci: '.ab-sistem-sayfa p.kod', kod: 404 },
  /* `/bakim` — yük dengeleyicinin bakım sırasında yönlendirdiği ekran.
     Kodunda yazılı: "kabuk yok, oturum şartı yok". `rotalar.json`da
     değildi, beyanda değildi; ÇAPRAZ KONTROL onu ilk koşuda buldu —
     kapsam elle tutulan listeden değil DİSKTEN türediği için. */
  { yol: '/bakim', nobetci: '.ab-sistem-sayfa p.kod', kod: 200 },
];

/* `global-error.tsx` bilerek DIŞARIDADIR: onu göstermek için kök
   düzende bir istisna fırlatmak gerekir ve bunu istek üzerine
   yapmanın deterministik bir yolu yok. Ölçülemeyen bir yüzey için
   kapı yazmak, tahmini kapı diye satmak olurdu. */

/** `--rota=` verilmişse oturumsuz listeyi ONA göre daraltır. */
export function oturumsuzRotalar() {
  if (!rotaBayragiVar()) return OTURUMSUZ_ROTALAR;
  const istenen = new Set(rotaBayragi([]));
  return OTURUMSUZ_ROTALAR.filter((r) => istenen.has(r.yol));
}

/**
 * ÇAPRAZ KONTROL — beyan edilen liste EKSİK mi?
 *
 * Elle tutulan bir liste, elle tutulan `rotalar.json`ın hatasını
 * tekrarlar: o liste dinamik rotaları taşımıyordu ve altı kayıt detayı
 * ekranı aylarca hiç taranmadı. Liste TÜRETİLEMEZ, çünkü koruma bir
 * middleware'de değil sayfa başına `lib/erisim.ts` içindedir ve statik
 * olarak okunamaz — ama ÖLÇÜLEBİLİR: her rota oturumsuz istenir ve
 * `/giris`e yönlenmesi beklenir. Yönlenmeyen ve beyan edilmemiş her
 * rota, listenin eksik olduğunun kanıtıdır.
 *
 * `networkidle` ŞARTTIR ve bu ölçülmüştür: `domcontentloaded` ile
 * `/tedarikciler` "oturumsuz açık" görünüyordu — yakalanan şey
 * `loading.tsx` iskeletiydi, sunucu yönlendirmesi henüz inmemişti.
 * Yanlış bir güvenlik alarmı, kaçırılan bir yüzey kadar zararlıdır.
 *
 * @returns {Promise<{yol:string, varilan:string, kod:number}[]>} beyansız açık yüzeyler
 */
export async function oturumsuzAcikYuzeyler(sayfa, ekRotalar = [], kok = KOK) {
  const beyan = new Set(OTURUMSUZ_ROTALAR.map((r) => r.yol));
  /* Kapsam DİSKTEN türetilir: her `page.tsx` bir yüzeydir. Dinamik
     segmentli olanlar somut URL'leriyle ayrıca gelir. */
  const yollar = [
    ...sayfaEnvanteri().filter((r) => r.dinamik.length === 0).map((r) => r.rota),
    ...ekRotalar,
  ];
  const acik = [];
  for (const yol of [...new Set(yollar)]) {
    if (beyan.has(yol)) continue;
    let kod = 0;
    let varilan = yol;
    try {
      const y = await sayfa.goto(`${kok}${yol}`, { waitUntil: 'networkidle', timeout: 20000 });
      kod = y?.status() ?? 0;
      await sayfa.waitForTimeout(200);
      varilan = new URL(sayfa.url()).pathname;
    } catch {
      /* Ulaşılamayan rota bu ölçünün konusu değil; yüzey kırığı ölçüsü
         onu zaten oturumlu turda yakalar. */
      continue;
    }
    /* "Giriş ekranına varmak" korunma kanıtıdır — AMA giriş ekranının
       KENDİSİ için değil: `/giris` istenip `/giris`e varmak yönlendirme
       değil, o yüzeyin ta kendisidir. Ayrım yazılmasaydı giriş ekranı
       beyandan düştüğünde çapraz kontrol susardı ve tam da kaçırdığı
       yüzeyi kaçırmaya devam ederdi (denendi: diş ısırmadı). */
    const korunuyor = varilan === '/giris' && yol !== '/giris';
    if (!korunuyor) acik.push({ yol, varilan, kod });
  }
  return acik;
}

/* Giriş: form React ile KONTROLLÜ bir bileşendir. `domcontentloaded`
   sonrası doldurmak yeterli değil — hidrasyon henüz olmamışsa React
   alanı kendi (boş) durumuyla geri yazar ve sunucuya BOŞ e-posta gider.
   Bu yüzden doldurduktan sonra değerin GERÇEKTEN durduğu doğrulanır.

   Dönüş: `true` oturum açıldı · `false` giriş formu yok (oturum zaten
   açık ya da sunucu bu uygulama değil — çağıran karar verir). */
export async function girisYap(sayfa, kok = KOK) {
  await sayfa.goto(`${kok}/giris`, { waitUntil: 'load' });
  if (!sayfa.url().includes('/giris')) return false;
  // Yeni girişte formdan önce kullanıcının gördüğü CTA'yı izleriz.
  const platformaGir = sayfa.getByRole('link', { name: 'Platforma Gir' });
  if (await platformaGir.isVisible()) await platformaGir.click();
  const eposta = sayfa.locator('input[type=email]');
  if (!(await eposta.count())) return false;
  for (let deneme = 1; deneme <= 3; deneme += 1) {
    await sayfa.fill('input[type=email]', GIRIS.eposta);
    await sayfa.fill('input[type=password]', GIRIS.parola);
    const yerlesti = (await sayfa.inputValue('input[type=email]')) === GIRIS.eposta
      && (await sayfa.inputValue('input[type=password]')).length > 0;
    if (yerlesti) break;
    await sayfa.waitForTimeout(300 * deneme);
  }
  await sayfa.click('button[type=submit]');
  await sayfa.waitForURL((u) => !u.pathname.startsWith('/giris'), { timeout: 25000 });
  return true;
}

/** Bağlamdaki çerezleri tek `Cookie` başlığına çevirir (Lighthouse `extraHeaders` için). */
export async function cerezBasligi(baglam, kok = KOK) {
  const cerezler = await baglam.cookies(kok);
  return cerezler.map((c) => `${c.name}=${c.value}`).join('; ');
}
