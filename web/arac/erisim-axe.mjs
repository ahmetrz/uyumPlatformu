#!/usr/bin/env node
/* axe-core kapısı — WCAG 2.x A/AA ihlal listesi, tüm rotalarda.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   `erisim.mjs` prototiplerin dört bilinen kusurunu ölçer (odak halkası,
   klavye, azaltılmış hareket, renk kanalı). Bu araç geri kalanı için
   axe-core'un kural kümesini çalıştırır: etiketleri olmayan form
   alanları, boş bağlantılar, kontrast, işaret rolü, dil niteliği,
   yinelenen id… Kurallar `wcag2a` + `wcag2aa` etiketleriyle sınırlıdır;
   "en iyi uygulama" kuralları burada raporlanmaz — kapı, uyum
   sözleşmesidir, üslup listesi değil.

   Ciddi (`serious`) ya da kritik (`critical`) etkili bir ihlal varsa
   çıkış kodu 1. `minor`/`moderate` ihlaller yine listelenir — sonraki
   turun işi, bu turun engeli değil.

   Giriş ekranı OTURUMSUZ ölçülür (oturumluyken kendini `/`'a atar).

   Kullanım:
     PORT=3210 node arac/erisim-axe.mjs
     PORT=3210 node arac/erisim-axe.mjs --rota=/uyum,/riskler --json /yol/axe.json
     npm run tasarim:axe
*/
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  KOK, WEB, bayrakDegeri, girisYap, rotaBayragi, rotalarOku, tarayiciYolu,
} from './kosu-ortak.mjs';
import { axeOzeti } from './kalite-kurallari.mjs';

const GIRIS_ROTASI = '/giris';
/* rotalar.json'daki '' ana ekrandır; giriş listede yoktur, ayrıca eklenir. */
const ROTALAR = rotaBayragi([GIRIS_ROTASI, ...rotalarOku().map((r) => (r === '' ? '/' : r))]);
const JSON_YOLU = bayrakDegeri('--json');
const AXE_YOLU = path.join(WEB, 'node_modules', 'axe-core', 'axe.min.js');
const ETIKETLER = ['wcag2a', 'wcag2aa'];

const b = await chromium.launch({ executablePath: tarayiciYolu() });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR' });
const s = await ctx.newPage();

async function tara(rota) {
  const y = await s.goto(KOK + rota, { waitUntil: 'load' });
  await s.waitForTimeout(450);
  const varilan = new URL(s.url()).pathname;
  await s.addScriptTag({ path: AXE_YOLU });
  const sonuc = await s.evaluate(async (etiketler) => {
    /* `axe` az önce `addScriptTag` ile sayfaya enjekte edildi; burada
       tarayıcı bağlamında küresel olarak vardır. */
    const r = await globalThis.axe.run(document, { runOnly: { type: 'tag', values: etiketler } });
    /* Yalnız gereken alanlar: tam sonuç HTML parçalarıyla şişer. */
    return {
      ihlaller: r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        dugum: v.nodes.length,
        ornek: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
      })),
      gecen: r.passes.length,
      belirsiz: r.incomplete.length,
    };
  }, ETIKETLER);
  const ozet = axeOzeti(sonuc.ihlaller);
  return {
    rota,
    kod: y?.status() ?? 0,
    varilan: varilan === rota ? null : varilan,
    ...sonuc,
    ciddi: ozet.ciddi.length,
    diger: ozet.diger.length,
  };
}

const rapor = [];
try {
  if (ROTALAR.includes(GIRIS_ROTASI)) rapor.push(await tara(GIRIS_ROTASI));
  await girisYap(s, KOK);
  for (const rota of ROTALAR.filter((r) => r !== GIRIS_ROTASI)) {
    try {
      rapor.push(await tara(rota));
    } catch (e) {
      rapor.push({ rota, kod: -1, hata: String(e).slice(0, 160), ihlaller: [], ciddi: 0, diger: 0 });
    }
  }
} finally {
  await b.close();
}

/* ── Rapor ─────────────────────────────────────────────────────────── */

let ciddiToplam = 0;
let digerToplam = 0;
const kirik = [];
console.log(`${'ROTA'.padEnd(26)} DURUM  CİDDİ  DİĞER  GEÇEN  İHLALLER`);
for (const r of rapor) {
  ciddiToplam += r.ciddi;
  digerToplam += r.diger;
  if (r.hata) kirik.push(r);
  const kusur = [];
  if (r.hata) kusur.push(`tarama kırıldı: ${r.hata}`);
  if (r.varilan?.startsWith('/giris')) kusur.push('girişe atıldı');
  const ihlalOzet = r.ihlaller.map((i) => `${i.id}[${i.impact}]×${i.dugum}`).join(' ');
  console.log(
    `${r.rota.padEnd(26)} ${String(r.kod).padEnd(6)} ${String(r.ciddi).padStart(5)}  ${String(r.diger).padStart(5)}`
    + `  ${String(r.gecen ?? '-').padStart(5)}  ${[...kusur, ihlalOzet].filter(Boolean).join(' · ')}`,
  );
  for (const i of r.ihlaller.filter((v) => v.impact === 'serious' || v.impact === 'critical')) {
    console.log(`    ${i.impact.toUpperCase()} ${i.id} — ${i.help}\n      örnek: ${i.ornek.join(' | ')}`);
  }
}
console.log(`\naxe (${ETIKETLER.join(', ')}): rota ${rapor.length} · ciddi/kritik ihlal ${ciddiToplam}`
  + ` · diğer ${digerToplam} · kırık tarama ${kirik.length}`);

if (JSON_YOLU) {
  writeFileSync(JSON_YOLU, JSON.stringify({ kok: KOK, etiketler: ETIKETLER, rotalar: rapor }, null, 2));
  console.log(`JSON → ${JSON_YOLU}`);
}
process.exitCode = ciddiToplam > 0 || kirik.length > 0 ? 1 : 0;
