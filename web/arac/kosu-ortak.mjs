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
