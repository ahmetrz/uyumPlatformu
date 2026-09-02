/* Tarayıcılı araçların ORTAK parçaları — oturum açma, tarayıcı yolu,
   rota listesi.

   Aynı üç işlev beş araçta kopyalanmıştı ve kopyalar birbirinden
   uzaklaşıyordu: biri hidrasyonu bekliyor, öbürü beklemiyordu; biri
   tarayıcı yolunu adaylardan seçiyor, öbürü sabit yol taşıyordu. Yeni
   araçlar (lighthouse · görsel regresyon · axe) buradan alır; eski
   araçlar kendi kopyalarını koruyor — onları elden geçirmek bu dilimin
   işi değil.

   GÜVENLİK: burada kurum sistemine giden hiçbir şey yoktur. Oturum,
   yerel geliştirme sunucusundaki TOHUM kullanıcısıyla açılır
   (prisma/seed.ts); gerçek kimlik bilgisi yoktur, olmamalıdır. */

import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Uygulama kökü — kalite araçları 3210'da koşar (`next dev` ile çakışmasın). */
export const KOK = `http://localhost:${process.env.PORT || 3210}`;

/* Tohum geliştirme girişi (prisma/seed.ts). Gerçek hesap DEĞİLDİR. */
export const GIRIS = { eposta: 'ahmet.terzi@zorlu.com', parola: 'Enerji!2026' };

/* Tarayıcı yolu ortamdan ortama değişir; CHROME verilmemişse bilinen
   adaylardan VAR OLANI seçeriz. */
export function tarayiciYolu() {
  if (process.env.CHROME) return process.env.CHROME;
  const adaylar = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
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
