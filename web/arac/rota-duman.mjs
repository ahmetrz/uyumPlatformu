import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { chromium } from 'playwright-core';

/* Rota duman testi — KAPSAM DOSYA SİSTEMİNDEN TÜRER.

   ── Kapatılan kusur ───────────────────────────────────────────────────
   Bu araç ELLE YAZILMIŞ iki liste taşıyordu ve "31/31 geçti" yazıyordu.
   `next build` ise 40 rota üretiyordu. Dokuz rota hiç yoklanmıyordu ve
   çıktı bunu SÖYLEMİYORDU: okuyan "hepsi geçti" sanıyordu. Elle liste,
   ekran eklendiği gün sessizce eksilir; eksildiğini de kimse görmez.

   Kapsam artık `app` altındaki her `page.tsx` taramasından gelir. Yeni bir ekran
   eklendiği anda listeye kendiliğinden girer; yoklanamıyorsa çıktı
   NEDENİNİ yazar. "Geçti" ile "bakılmadı" bir daha karışmaz.

   ── Dinamik rotalar ───────────────────────────────────────────────────
   `[id]` / `[cerceve]` taşıyan rotalar için URL, TOHUM VERİTABANINDAKİ
   GERÇEK KAYITLARDAN üretilir (`prisma/dev.db`). Uydurma id ile 200
   üretmeye çalışmak yanlış güven verir: sayfa `notFound()` döndürürse
   404, dönmezse de gerçekte var olmayan bir kaydı gösteriyor demektir.
   Tohum kaydı yoksa rota "TEST EDİLEMEDİ · tohumda kayıt yok" diye
   raporlanır ve kapsam sayısına GEÇTİ olarak yazılmaz.

   Kullanım:
     PORT=3111 node arac/rota-duman.mjs
     PORT=3111 node arac/rota-duman.mjs --json    → makine okunur özet
*/

const WEB = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const KOK = `http://localhost:${process.env.PORT || 3111}`;
const DB_YOL = process.env.DB_YOL || path.join(WEB, 'prisma', 'dev.db');
const JSON_CIKTI = process.argv.includes('--json');

/* ── 1. Rota envanteri ─────────────────────────────────────────────── */

/** `app` altındaki her `page.tsx` → rota yolu. Grup segmentleri `(x)` düşer. */
function rotaEnvanteri() {
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

/* ── 2. Dinamik segmentlerin gerçek değerleri ──────────────────────── */

/* Her dinamik rota, değerini hangi tohum tablosundan alır. Uydurma değer
   YOK: tablo boşsa rota test edilmez ve sebebi raporlanır. */
const TOHUM_KAYNAGI = {
  '/tesisler/[id]': { tablo: 'Tesis', kolon: 'id' },
  '/bulgular/[id]': { tablo: 'Bulgu', kolon: 'id' },
  '/denetimler/[id]': { tablo: 'Denetim', kolon: 'id' },
  '/riskler/[id]': { tablo: 'Risk', kolon: 'id' },
  '/surecler/[id]': { tablo: 'UyumSureci', kolon: 'id' },
  /* Çerçeve detayının parametresi id değil regülasyon KODUDUR
     (bkz. uyum/[cerceve]/page.tsx: bağlantı paylaşılabilir olsun diye). */
  '/uyum/[cerceve]': { tablo: 'Regulasyon', kolon: 'kod' },
};

function tohumDegeri(rota) {
  const kaynak = TOHUM_KAYNAGI[rota];
  if (!kaynak) return { hata: `tohum kaynağı tanımsız (arac/rota-duman.mjs · TOHUM_KAYNAGI)` };
  let db;
  try { db = new Database(DB_YOL, { readonly: true }); } catch (e) {
    return { hata: `tohum veritabanı açılamadı: ${e.message}` };
  }
  try {
    const satir = db.prepare(`select ${kaynak.kolon} as v from ${kaynak.tablo} order by ${kaynak.kolon} limit 1`).get();
    if (!satir?.v) return { hata: `tohumda ${kaynak.tablo} kaydı yok` };
    return { deger: String(satir.v), kaynak: `${kaynak.tablo}.${kaynak.kolon}` };
  } catch (e) {
    return { hata: `tohum sorgusu başarısız (${kaynak.tablo}): ${e.message}` };
  } finally {
    db.close();
  }
}

/** Dinamik rotayı gerçek değerle somutlaştırır. */
function somutlastir(giris) {
  if (giris.dinamik.length === 0) return { url: giris.rota };
  if (giris.dinamik.length > 1) return { hata: 'çok parametreli rota — eşleme tanımlı değil' };
  const t = tohumDegeri(giris.rota);
  if (t.hata) return { hata: t.hata };
  return {
    url: giris.rota.replace(/\[[^\]]+\]/, encodeURIComponent(t.deger)),
    not: `${t.kaynak}=${t.deger.slice(0, 12)}…`,
  };
}

/* ── 3. Beklentiler ────────────────────────────────────────────────── */

/* Kabuk: `(atlas)` grubundaki her ekran rayı taşır. `(giris)` ve `(tam)`
   kendi kabuklarını taşır — rayları YOKTUR, bu bir kusur değil karardır. */
const rayBekleniyor = (g) => g.grup.includes('(atlas)');

/* Rayda KENDİ ÖĞESİ olmayan ama kabuğu paylaşan ekranlar: aktif öğe ya
   üst rotanınkidir ya da hiç yoktur. Aktif öğe sayısı > 1 her zaman
   kusurdur (iki yerde birden duruyormuş gibi görünür). */
const RAY_OGESI_YOK = new Set(['/sistem', '/sistem/bilesenler']);

/** Bir URL yolunu envanterdeki rota kalıbına eşler (dinamik segment dahil). */
function rotaEslestir(patika, envanter) {
  const tam = envanter.find((g) => g.rota === patika);
  if (tam) return tam;
  const parca = patika.split('/').filter(Boolean);
  return envanter.find((g) => {
    const kalip = g.rota.split('/').filter(Boolean);
    if (kalip.length !== parca.length) return false;
    return kalip.every((k, i) => (/^\[.*\]$/.test(k) ? true : k === parca[i]));
  }) ?? null;
}

/* Giriş öncesi yoklanacak rota: oturum açıldıktan sonra `/giris` kendini
   `/`'a atar, yani oturumlu yoklama bu ekranı HİÇ görmez. */
const GIRIS_ROTASI = '/giris';

/* ── 4. Tarayıcı ───────────────────────────────────────────────────── */

/* Tarayıcı yolu ortamdan ortama değişiyor; CHROME verilmemişse bilinen
   adaylardan VAR OLANI seçeriz. Var olmayan sabit yola bakıp "başlatılamadı"
   demek, aracı ortam ayarına bağımlı kılıyordu. */
function tarayiciYolu() {
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

const b = await chromium.launch({ executablePath: tarayiciYolu() });
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
  await sayfa.goto(`${kok}/giris`, { waitUntil: 'load' });
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

async function yokla(giris, url, envanter) {
  const y = await s.goto(KOK + url, { waitUntil: 'domcontentloaded' });
  await s.waitForTimeout(450);
  const kod = y?.status() ?? 0;
  /* Yönlendirme varsa BEKLENTİ VARILAN EKRANINDIR. `/tesisler` kendini
     `/portfoy`ya atar; `/portfoy` (tam) katmanında ve rayı yoktur — bunu
     "ray yok" kusuru saymak aracın kendi körlüğü olurdu. */
  const varilan = new URL(s.url()).pathname;
  const hedefGirisi = varilan === url ? giris : rotaEslestir(varilan, envanter);
  const beklenti = hedefGirisi ?? giris;
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

  const kusurlar = [];
  if (kod !== 200) kusurlar.push(`HTTP ${kod}`);
  /* Oturumluyken girişe atılmak yetki/oturum kusurudur, yönlendirme değil. */
  if (url !== GIRIS_ROTASI && varilan.startsWith('/giris')) kusurlar.push('girişe atıldı');
  if (rayBekleniyor(beklenti) && !olcu) kusurlar.push('ray yok');
  if (!rayBekleniyor(beklenti) && olcu) kusurlar.push('beklenmeyen ray');
  if (olcu && olcu.aktifSayi > 1) kusurlar.push(`aktif öğe ${olcu.aktifSayi} (>1)`);
  if (olcu && olcu.aktifSayi === 0 && rayBekleniyor(beklenti)
    && !RAY_OGESI_YOK.has(beklenti.rota)) kusurlar.push('aktif öğe yok');
  return { kod, olcu, kusurlar, varilan: varilan === url ? null : varilan };
}

/* ── 5. Koşu ───────────────────────────────────────────────────────── */

const envanter = rotaEnvanteri();
const sonuclar = [];

/* Giriş ekranı ÖNCE, oturum açılmadan. */
for (const g of envanter.filter((x) => x.rota === GIRIS_ROTASI)) {
  const r = await yokla(g, g.rota, envanter);
  sonuclar.push({ ...g, url: g.rota, durum: r.kusurlar.length ? 'KUSURLU' : 'GEÇTİ', ...r, not: 'oturum açılmadan' });
}

await girisYap(s, KOK);

for (const g of envanter.filter((x) => x.rota !== GIRIS_ROTASI)) {
  const c = somutlastir(g);
  if (c.hata) {
    sonuclar.push({ ...g, url: null, durum: 'TEST EDİLEMEDİ', sebep: c.hata, kusurlar: [] });
    continue;
  }
  const r = await yokla(g, c.url, envanter);
  const notlar = [c.not, r.varilan ? `→ ${r.varilan}` : null].filter(Boolean).join(' · ');
  sonuclar.push({ ...g, url: c.url, durum: r.kusurlar.length ? 'KUSURLU' : 'GEÇTİ', ...r, not: notlar || null });
}

await b.close();

/* ── 6. Rapor ──────────────────────────────────────────────────────── */

const gecen = sonuclar.filter((r) => r.durum === 'GEÇTİ').length;
const kusurlu = sonuclar.filter((r) => r.durum === 'KUSURLU');
const edilemeyen = sonuclar.filter((r) => r.durum === 'TEST EDİLEMEDİ');

if (JSON_CIKTI) {
  console.log(JSON.stringify({
    toplam: sonuclar.length, gecen, kusurlu: kusurlu.length, edilemeyen: edilemeyen.length,
    sayfaHatasi: hatalar.length, rotalar: sonuclar,
  }, null, 2));
} else {
  for (const r of sonuclar) {
    const im = r.durum === 'GEÇTİ' ? 'OK  ' : r.durum === 'KUSURLU' ? 'KUSUR' : 'YOK ';
    const ray = r.olcu
      ? `ray=${r.olcu.genislik}px inset=${r.olcu.inset} üst=${r.olcu.ustPad} aktif=${r.olcu.aktifSayi}:${r.olcu.aktifAd}`
      : (r.durum === 'GEÇTİ' ? 'ray yok (kabuk dışı)' : '');
    const kuyruk = r.durum === 'TEST EDİLEMEDİ'
      ? `TEST EDİLEMEDİ · ${r.sebep}`
      : `${r.kod ?? ''} ${ray}${r.kusurlar.length ? `  ← ${r.kusurlar.join(', ')}` : ''}${r.not ? `  (${r.not})` : ''}`;
    console.log(`${im} ${r.rota.padEnd(24)} ${kuyruk}`);
  }
  console.log(`\nkapsam: ${gecen}/${sonuclar.length} rota geçti`
    + ` · kusurlu ${kusurlu.length} · test edilemedi ${edilemeyen.length}`
    + ` · sayfa hatası ${hatalar.length}`);
  if (edilemeyen.length) {
    console.log('\nTest edilemeyenler:');
    for (const r of edilemeyen) console.log(`  ${r.rota} → ${r.sebep}`);
  }
  if (hatalar.length) console.log(hatalar.slice(0, 6));
}

if (kusurlu.length || edilemeyen.length || hatalar.length) process.exitCode = 1;
