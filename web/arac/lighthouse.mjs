#!/usr/bin/env node
/* Lighthouse kapısı — dört kanonik ekran + giriş, dört kategori.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   "Performans iyi", "erişilebilirlik tamam" cümleleri ölçüsüz söylenince
   boştur. Bu araç Lighthouse'u oturum açılmış bir tarayıcıya bağlar ve
   her rota için dört kategori puanını (performans · erişilebilirlik ·
   en iyi uygulamalar · SEO) 0–100 ölçeğinde yazar. Eşiğin (varsayılan
   90) altında kalan her kategori, o kategoriyi düşüren ilk denetimlerle
   birlikte listelenir; biri bile eşiğin altındaysa çıkış kodu 1.

   ── OTURUM NASIL AÇILIR ──────────────────────────────────────────────
   Lighthouse kendi tarayıcısını açmaz; Playwright'ın KALICI bağlamla
   (`launchPersistentContext`) açtığı Chromium'a `--remote-debugging-port`
   üzerinden bağlanır. Kalıcı bağlam seçildi çünkü Lighthouse yeni
   sekmeyi tarayıcının VARSAYILAN profilinde açar; `newContext()` ile
   açılan yalıtık profildeki oturum çerezi oraya ulaşmazdı. Ek olarak
   aynı çerezler `extraHeaders.Cookie` ile de verilir — iki kanaldan
   biri kapansa öbürü oturumu taşır.

   `/giris` OTURUMSUZ ölçülür: oturum açıkken kendini `/`'a atar ve
   ölçülen şey giriş ekranı olmaz. Bu yüzden sıra: önce `/giris`, sonra
   giriş, sonra oturumlu rotalar.

   Puanlar makine paylaşımlı bir ortamda gürültülüdür; performans
   kategorisi özellikle. Sayıya değil, düşüren denetime bakın.

   Kullanım:
     PORT=3210 node arac/lighthouse.mjs
     PORT=3210 node arac/lighthouse.mjs --rota=/,/uyum --esik 85 --json /yol/rapor.json
     npm run kalite:lighthouse
*/
import lighthouse from 'lighthouse';
import masaustuYapilandirma from 'lighthouse/core/config/desktop-config.js';
import { chromium } from 'playwright-core';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  KOK, bayrakDegeri, cerezBasligi, girisYap, rotaBayragi, tarayiciYolu,
} from './kosu-ortak.mjs';
import { esikAltindakiler, yuzPuan } from './kalite-kurallari.mjs';

/* Kanonik dörtlü + giriş. Giriş oturum GEREKTİRMEZ ve ilk sırada ölçülür. */
const GIRIS_ROTASI = '/giris';
const VARSAYILAN = [GIRIS_ROTASI, '/', '/portfoy', '/uyum', '/bulgular'];
const ROTALAR = rotaBayragi(VARSAYILAN);
const ESIK = Number(bayrakDegeri('--esik') ?? process.env.ESIK ?? 90);
const JSON_YOLU = bayrakDegeri('--json');
/** Eksik puanın gerekçe satırlarını bastırır — tablo tek satırda kalır. */
const SESSIZ = process.argv.includes('--sessiz');

const KATEGORILER = {
  performance: 'performans',
  accessibility: 'erişilebilirlik',
  'best-practices': 'en iyi uygulamalar',
  seo: 'SEO',
};

/* ── Tarayıcı ──────────────────────────────────────────────────────── */

/* Profil dizini geçicidir ve sonunda silinir; CHROME'un yazdığı
   `DevToolsActivePort` dosyasından hangi porta bağlanacağımızı okuruz —
   `--remote-debugging-port=0` sabit port çakışmasını önler. */
const profil = mkdtempSync(path.join(os.tmpdir(), 'lh-profil-'));
const baglam = await chromium.launchPersistentContext(profil, {
  executablePath: tarayiciYolu(),
  args: ['--remote-debugging-port=0'],
  viewport: { width: 1440, height: 900 },
});

function cdpPortu() {
  const dosya = path.join(profil, 'DevToolsActivePort');
  const port = Number(readFileSync(dosya, 'utf8').split('\n')[0]);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`DevToolsActivePort okunamadı: ${dosya}`);
  return port;
}

/* ── Ölçüm ─────────────────────────────────────────────────────────── */

async function olc(rota, port, cookie) {
  const bayraklar = {
    port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: Object.keys(KATEGORILER),
    ...(cookie ? { extraHeaders: { Cookie: cookie } } : {}),
  };
  const sonuc = await lighthouse(KOK + rota, bayraklar, masaustuYapilandirma);
  const lhr = sonuc?.lhr;
  if (!lhr) return { rota, hata: 'Lighthouse sonuç üretmedi', puanlar: {} };

  const puanlar = Object.fromEntries(
    Object.keys(KATEGORILER).map((k) => [k, yuzPuan(lhr.categories[k]?.score)]),
  );
  const varilan = new URL(lhr.finalDisplayedUrl || lhr.requestedUrl).pathname;

  /* TAM OLMAYAN her kategori için puanı düşüren denetimler — puanı 1'in
     altında ve ağırlığı sıfırdan büyük olanlar, en ağırdan başa.

     Eşik değil TAM PUAN ölçüt: yalnız eşiğin altını toplamak, 100'den
     91'e düşen bir kategoriyi sessiz bırakırdı. /uyum erişilebilirlik
     98'de duruyordu ve neden olduğu hiçbir yerde yazmıyordu; ölçen bir
     araç "geçti" demekle yetinmemeli, neyin eksik olduğunu söylemeli. */
  const dusurenler = {};
  for (const kategori of Object.keys(KATEGORILER)) {
    const puan = puanlar[kategori];
    if (Number.isFinite(puan) && puan >= 100) continue;
    const k = lhr.categories[kategori];
    if (!k) continue;
    dusurenler[kategori] = k.auditRefs
      .filter((r) => r.weight > 0)
      .map((r) => ({ id: r.id, agirlik: r.weight, puan: lhr.audits[r.id]?.score, baslik: lhr.audits[r.id]?.title }))
      .filter((a) => a.puan !== null && a.puan !== undefined && a.puan < 1)
      .sort((a, b) => b.agirlik - a.agirlik)
      .slice(0, 6);
  }
  return {
    rota,
    varilan: varilan === rota ? null : varilan,
    puanlar,
    dusurenler,
    hata: lhr.runtimeError?.message ?? null,
  };
}

const rapor = [];
try {
  const port = cdpPortu();
  /* 1 · giriş ekranı, oturumsuz */
  if (ROTALAR.includes(GIRIS_ROTASI)) rapor.push(await olc(GIRIS_ROTASI, port, null));

  /* 2 · oturum aç, çerezi al */
  const sayfa = await baglam.newPage();
  const acildi = await girisYap(sayfa, KOK);
  await sayfa.close();
  const cookie = await cerezBasligi(baglam, KOK);
  if (!acildi && !cookie) console.error('UYARI: giriş formu bulunamadı; oturumsuz ölçülüyor.');

  /* 3 · oturumlu rotalar */
  for (const rota of ROTALAR.filter((r) => r !== GIRIS_ROTASI)) rapor.push(await olc(rota, port, cookie));
} finally {
  await baglam.close();
  rmSync(profil, { recursive: true, force: true });
}

/* ── Rapor ─────────────────────────────────────────────────────────── */

const kusurlu = [];
console.log(`${'ROTA'.padEnd(16)} ${Object.values(KATEGORILER).map((a) => a.padStart(19)).join('')}`);
for (const r of rapor) {
  const alt = esikAltindakiler(r.puanlar, ESIK);
  const kusur = [];
  if (r.hata) kusur.push(`çalışma hatası: ${r.hata}`);
  if (r.varilan) kusur.push(`varış ${r.varilan}${r.varilan.startsWith('/giris') ? ' (girişe atıldı)' : ''}`);
  for (const a of alt) kusur.push(`${KATEGORILER[a.kategori]} ${a.puan ?? 'ölçülemedi'} < ${ESIK}`);
  if (kusur.length) kusurlu.push({ rota: r.rota, kusur });
  const hucreler = Object.keys(KATEGORILER)
    .map((k) => String(r.puanlar[k] ?? 'ölçülemedi').padStart(19));
  console.log(`${r.rota.padEnd(16)} ${hucreler.join('')}${kusur.length ? '  ← ' + kusur.join(' · ') : ''}`);
  /* Eksik puanın gerekçesi eşiğin ÜSTÜNDE de yazılır; `--sessiz` susturur. */
  if (!SESSIZ) {
    for (const [k, liste] of Object.entries(r.dusurenler ?? {})) {
      for (const d of liste) {
        console.log(`    ${KATEGORILER[k]} · ${d.id} (ağırlık ${d.agirlik}, puan ${d.puan}) — ${d.baslik}`);
      }
    }
  }
}
console.log(`\neşik ${ESIK} · rota ${rapor.length} · eşiğin altında ${kusurlu.length}`);

if (JSON_YOLU) {
  writeFileSync(JSON_YOLU, JSON.stringify({ kok: KOK, esik: ESIK, rotalar: rapor, kusurlu }, null, 2));
  console.log(`JSON → ${JSON_YOLU}`);
}
process.exitCode = kusurlu.length ? 1 : 0;
