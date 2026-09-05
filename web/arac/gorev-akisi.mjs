#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   GÖREV AKIŞI ÖLÇÜMÜ — "bu işi kaç tıkla bitiriyorum?"

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   `bilissel-yuk.mjs` bir ekranı ölçer. Ama kullanıcı ekranda değil, bir
   İŞİN içinde yaşar ve iş çoğu zaman üç ekrandan geçer. Bir ekran tek
   başına temiz olabilir; iki ekran arasındaki geçiş kaybolduğunda iş yine
   bitmez.

   Bu araç yirmi gerçek görevi baştan sona koşar ve dört şey sayar:

     tıklama       kaç kez tıklandı (klavye eşdeğeri de tıklama sayılır)
     geçiş         kaç kez SAYFA değişti — bağlam kaybının ölçüsü
     çıkmaz        hedefe hiç ulaşılamadı mı
     süre          ilk tıklamadan hedefin görünmesine kadar (ms, gürültülü)

   ── HEDEF ─────────────────────────────────────────────────────────────
   Sık yapılan işlerde 0–1 gezinme + 1–3 etkileşim. Bu bir EŞİK DEĞİL bir
   yöndür: bazı işler doğası gereği çok adımlıdır (dosya yükle → eşle →
   önizle → onayla) ve onları tek tıka indirmek, onaysız yazmak demek
   olurdu. Araç eşik koymaz; ÇIKMAZ dışında hiçbir şeyi kusur saymaz.
   Sayıların yorumu `docs/UX_SIMPLIFICATION_AUDIT.md` içindedir.

   ── NEDEN GERÇEK TARAYICI ─────────────────────────────────────────────
   Tıklama sayısını kaynaktan tahmin etmek mümkün değil: bir çekmecenin
   açık gelip gelmediği, bir formun katlanıp katlanmadığı, bir satırın
   seçilebilir olup olmadığı çalışma anında belli olur.

   GÜVENLİK: kurum sistemine giden hiçbir şey yoktur; oturum yerel
   geliştirme sunucusundaki TOHUM kullanıcısıyla açılır ve görevler
   YALNIZ OKUR — hiçbiri kayıt yazmaz.

   Kullanım: PORT=3210 node arac/gorev-akisi.mjs
             PORT=3210 node arac/gorev-akisi.mjs --gorev TASK-001
             PORT=3210 node arac/gorev-akisi.mjs --json cikti.json
   ═══════════════════════════════════════════════════════════════════ */

import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import {
  KOK, bayrakDegeri, girisYap, tarayiciYolu,
} from './kosu-ortak.mjs';

/* Adım biçimleri:
     { ad, rol, isim }      → erişilebilir rolle bul ve tıkla
     { ad, metin }          → görünür metinle bul ve tıkla
     { ad, secici }         → CSS seçiciyle bul ve tıkla
     { ad, bekle }          → tıklamadan bekle (görünürlük sınaması)
   `hedef` görevin BİTTİĞİNİ kanıtlayan görünür şeydir. */
const GOREVLER = [
  {
    kod: 'TASK-001',
    ad: 'Kritik ve gecikmiş bulgunun kapanması için eksik adımı bul',
    baslangic: '/bulgular',
    adimlar: [
      { ad: 'İlk bulgu satırını aç', secici: '[role="grid"] tbody tr' },
      { ad: 'Kaydı aç', metin: 'Kaydı aç' },
    ],
    hedef: 'text=Kapanış için gerekenler',
  },
  {
    kod: 'TASK-002',
    ad: 'Bulgunun sıradaki işine git',
    baslangic: '/bulgular',
    adimlar: [
      { ad: 'İlk bulgu satırını aç', secici: '[role="grid"] tbody tr' },
      { ad: 'Kaydı aç', metin: 'Kaydı aç' },
      { ad: 'Kapanış şeridinde sıradaki adım', secici: '.ab-yol-serit li.eksik button' },
    ],
    hedef: '.ab-panel',
  },
  {
    kod: 'TASK-003',
    ad: 'Sahibi olmayan kritik varlığı bul',
    baslangic: '/envanter',
    adimlar: [{ ad: 'Tablo görünümüne geç', metin: 'Tablo görünümü' }],
    hedef: '.ab-vt, table',
  },
  {
    kod: 'TASK-004',
    ad: 'Ömrü yaklaşan varlıkları gör',
    baslangic: '/omur',
    adimlar: [],
    hedef: '.ab-vt, table, .ab-blok',
  },
  {
    kod: 'TASK-005',
    ad: 'Bir regülasyon maddesinin kanıtını kontrol et',
    baslangic: '/uyum',
    adimlar: [{ ad: 'Matriste bir kontrol hücresi', secici: '.ab-mtx button, .ab-matris button' }],
    hedef: '.ab-panel, .ab-mtx-acilan',
  },
  {
    kod: 'TASK-006',
    ad: 'Son 7 günde keşfedilen bilinmeyen cihazları incele',
    baslangic: '/kesif',
    adimlar: [{ ad: 'İlk keşif kaydını aç', secici: '[role="grid"] tbody tr' }],
    hedef: '.ab-panel',
  },
  {
    kod: 'TASK-007',
    ad: 'Reddedilen bir kaydın düşme sebebini gör',
    baslangic: '/saglik/reddedilenler',
    adimlar: [{ ad: 'İlk reddedilen kaydı aç', secici: '[role="grid"] tbody tr' }],
    hedef: '.ab-panel',
  },
  {
    kod: 'TASK-008',
    ad: 'Bir santralin açık bulgularını gör',
    baslangic: '/portfoy',
    adimlar: [{ ad: 'İlk santral plakasını aç', secici: '.plaka' }],
    hedef: 'text=Açık bulgular',
  },
  {
    kod: 'TASK-009',
    ad: 'Topoloji sapmasını karara bağla',
    baslangic: '/topoloji',
    adimlar: [{ ad: 'İlk sapma satırını aç', secici: '[role="grid"] tbody tr' }],
    hedef: '.ab-panel',
  },
  {
    kod: 'TASK-010',
    ad: 'Takvimini tutmayan denetimi bul',
    baslangic: '/denetimler',
    adimlar: [{ ad: 'İlk denetim satırını aç', secici: '[role="grid"] tbody tr' }],
    hedef: '.ab-panel, .ab-ekran-govde',
  },
  {
    kod: 'TASK-011',
    ad: 'Taahhüdünü tutmayan projeyi bul',
    baslangic: '/projeler',
    adimlar: [{ ad: 'İlk proje satırını aç', secici: '[role="grid"] tbody tr' }],
    hedef: '.ab-panel',
  },
  {
    kod: 'TASK-012',
    ad: 'Skoru ölçülmemiş riski bul',
    baslangic: '/riskler',
    adimlar: [{ ad: 'İlk risk satırını aç', secici: '[role="grid"] tbody tr' }],
    hedef: '.ab-panel',
  },
  {
    kod: 'TASK-013',
    ad: 'Süresi dolmuş kanıtı bul',
    baslangic: '/kanitlar',
    adimlar: [{ ad: 'Süresi dolmuş süzgeci', metin: 'Süresi dolmuş' }],
    hedef: '.ab-vt, table, .ab-blok',
  },
  {
    kod: 'TASK-014',
    ad: 'Karşılıksız kontrolün belgesine git',
    baslangic: '/dokumanlar',
    adimlar: [{ ad: 'Karşılıksız kontrol bağı', secici: '.ab-dok-liste a.kod' }],
    hedef: '.ab-panel',
  },
  {
    kod: 'TASK-015',
    ad: 'Bana düşen görevi bul',
    baslangic: '/yonetim-tezgahi',
    adimlar: [],
    hedef: '.ab-vt, table, .ab-blok',
  },
  {
    kod: 'TASK-016',
    ad: 'Bir bağlayıcının son koşusunu gör',
    baslangic: '/saglik',
    adimlar: [{ ad: 'İlk bağlayıcı satırını aç', secici: '[role="grid"] tbody tr' }],
    hedef: '.ab-panel',
  },
  {
    kod: 'TASK-017',
    ad: 'Denetim izinde bir değişikliği bul',
    baslangic: '/aktivite',
    adimlar: [{ ad: 'Karar merceği', metin: 'Onay ve ret' }],
    hedef: '.ab-vt, table, .ab-blok',
  },
  {
    kod: 'TASK-018',
    ad: 'Fazla yetkisi olan hesabı incelemeye al',
    baslangic: '/kimlik',
    adimlar: [{ ad: 'İlk hesap satırını aç', secici: '[role="grid"] tbody tr' }],
    hedef: '.ab-panel',
  },
  {
    kod: 'TASK-019',
    ad: 'Denetçiye verilecek kanıt paketinin kapsamını seç',
    baslangic: '/raporlar/kanit-paketi',
    adimlar: [{ ad: 'İlk kapsam satırını seç', secici: '[role="grid"] tbody tr' }],
    hedef: '.ab-panel',
  },
  {
    kod: 'TASK-020',
    ad: 'Bir ekranın nasıl okunduğunu öğren',
    baslangic: '/yardim',
    /* Yardım bir OKUMA ekranıdır: okuma anahtarı tıklama istemeden
       açılır. Sıfır tıklama burada kusur değil, ekranın kendisidir. */
    adimlar: [],
    hedef: '.ab-yardim-ekran',
  },
];

function konum(sayfa, adim) {
  if (adim.rol) return sayfa.getByRole(adim.rol, { name: adim.isim, exact: false }).first();
  if (adim.metin) return sayfa.getByText(adim.metin, { exact: false }).first();
  return sayfa.locator(adim.secici).first();
}

const seciliGorev = bayrakDegeri('--gorev');
const jsonYolu = bayrakDegeri('--json');
const liste = seciliGorev ? GOREVLER.filter((g) => g.kod === seciliGorev) : GOREVLER;

const tarayici = await chromium.launch({ executablePath: tarayiciYolu() });
const baglam = await tarayici.newContext({ viewport: { width: 1440, height: 900 } });
const sayfa = await baglam.newPage();
await girisYap(sayfa, KOK);

const sonuclar = [];
for (const g of liste) {
  const adres = `${KOK}${g.baslangic === '/' ? '' : g.baslangic}`;
  let tiklama = 0;
  let gecis = 0;
  let cikmaz = null;
  const baslangicAn = Date.now();
  try {
    await sayfa.goto(adres, { waitUntil: 'load', timeout: 30000 });
    await sayfa.waitForTimeout(300);
    let oncekiYol = new URL(sayfa.url()).pathname;

    for (const adim of g.adimlar) {
      const oge = konum(sayfa, adim);
      await oge.waitFor({ state: 'visible', timeout: 8000 });
      await oge.click({ timeout: 8000 });
      tiklama += 1;
      await sayfa.waitForTimeout(450);
      const yeniYol = new URL(sayfa.url()).pathname;
      if (yeniYol !== oncekiYol) { gecis += 1; oncekiYol = yeniYol; }
    }

    await sayfa.locator(g.hedef).first().waitFor({ state: 'visible', timeout: 8000 });
  } catch (e) {
    cikmaz = String(e).split('\n')[0].slice(0, 100);
  }
  sonuclar.push({
    kod: g.kod, ad: g.ad, baslangic: g.baslangic,
    tiklama, gecis, cikmaz, sure: Date.now() - baslangicAn,
  });
}

await tarayici.close();

console.log('');
console.log('KOD'.padEnd(10) + 'TIK'.padStart(4) + 'GEÇİŞ'.padStart(6)
  + 'SÜRE'.padStart(7) + '  GÖREV');
for (const s of sonuclar) {
  console.log(s.kod.padEnd(10) + String(s.tiklama).padStart(4)
    + String(s.gecis).padStart(6) + `${s.sure}ms`.padStart(7)
    + '  ' + (s.cikmaz ? `ÇIKMAZ · ${s.cikmaz}` : s.ad));
}

const cikmazlar = sonuclar.filter((s) => s.cikmaz);
const ortTik = (sonuclar.reduce((a, s) => a + s.tiklama, 0) / sonuclar.length).toFixed(1);
const ortGecis = (sonuclar.reduce((a, s) => a + s.gecis, 0) / sonuclar.length).toFixed(1);
console.log('');
console.log(`${sonuclar.length} görev · ortalama tıklama ${ortTik}`
  + ` · ortalama sayfa geçişi ${ortGecis} · ÇIKMAZ ${cikmazlar.length}`);

if (jsonYolu) {
  writeFileSync(jsonYolu, JSON.stringify({ sonuclar }, null, 2) + '\n');
  console.log(`json: ${jsonYolu}`);
}

process.exit(cikmazlar.length === 0 ? 0 : 1);
