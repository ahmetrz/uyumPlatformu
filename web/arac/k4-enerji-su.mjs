#!/usr/bin/env node
/* K4 · ENERJİ VE SU BİREBİR AYNI DAVRANIR — regresyon kanıtı (Faz B).

   Sekiz demo ekranı (`docs/DEMO_YOLU.md`) iki sektör merceğinde açılır:
   aynı kod, sektörün kendi sözcüğü, hiçbir ekranda hata ya da boş gövde
   yok. Tesis 360'ta profil bloğunun alan sayısı ölçülür: enerji paketi 8
   öznitelik beyan eder (12+8), su paketi hiç beyan etmez (12) — sayı
   uydurulmaz, ekrandaki "N/M alan tanımsız" metninden okunur.

   Çıktı: `--dizin=<yol>` altına <mercek>-<rota>.jpg ve OZET.md.
   Kullanım: PORT=3210 node arac/k4-enerji-su.mjs --dizin=../docs/kanit/faz-b-k4 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { KOK, girisYap, tarayiciYolu } from './kosu-ortak.mjs';

const DIZIN = process.argv.find((a) => a.startsWith('--dizin='))?.slice(8) ?? path.join(process.cwd(), '.k4');
mkdirSync(DIZIN, { recursive: true });
const ROTALAR = ['/', '/portfoy', '/tesisler/[ilk]', '/uyum', '/bulgular', '/riskler', '/raporlar/karne'];
/* Hata metni ekranın kendi hata bileşenlerinden okunur (`<Yetkisiz />`
   "403 · Yetkisiz" yazar). Büyük/küçük harf duyarsız "yetkisiz" ARANMAZ:
   su demosunun bir risk adı "…yetkisiz erişim" içeriyor ve ilk koşuda iki
   sağlam ekranı kırmızıya boyadı (ölçüldü 2026-09-08). */
const HATA = /403 · Yetkisiz|Uygulama hatası|Bir şeyler ters gitti|Application error|Internal Server Error/;

const b = await chromium.launch({ executablePath: tarayiciYolu() });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
if (!(await girisYap(p, KOK))) throw new Error('giriş yapılamadı');

await p.goto(`${KOK}/portfoy`, { waitUntil: 'networkidle' });
const merceker = (await p.evaluate(() =>
  [...document.querySelectorAll('.ab-mercek-dar option, .ab-mercek button')]
    .map((o) => ({ deger: o.value ?? '', ad: o.textContent.trim() })))).filter((m) => m.deger);
if (merceker.length < 2) throw new Error(`iki mercek bekleniyordu, ölçülen: ${JSON.stringify(merceker)}`);

async function mercekAyarla(deger) {
  await p.evaluate((d) => {
    try { window.localStorage.setItem('uyum.sektorMercegi', d); } catch {}
    window.dispatchEvent(new Event('uyum:sektor-mercegi'));
  }, deger);
  await p.waitForTimeout(300);
}

const satirlar = [];
for (const m of merceker) {
  await p.goto(`${KOK}/portfoy`, { waitUntil: 'networkidle' });
  await mercekAyarla(m.deger);
  await p.reload({ waitUntil: 'networkidle' });
  const ilkTesis = await p.evaluate(() => document.querySelector('a[href^="/tesisler/"]')?.getAttribute('href') ?? null);
  for (const rota of ROTALAR) {
    const hedef = rota === '/tesisler/[ilk]' ? ilkTesis : rota;
    if (!hedef) { satirlar.push({ mercek: m.ad, rota, durum: 'ÖLÇÜLMEDİ — mercekte tesis bağlantısı yok' }); continue; }
    const yanit = await p.goto(`${KOK}${hedef}`, { waitUntil: 'networkidle' });
    await mercekAyarla(m.deger);
    await p.waitForTimeout(400);
    /* innerText CSS `text-transform`ı uygular ("12/12 ALAN TANIMSIZ"); "ı"
       büyük harfte "I" olduğundan /i bayrağı bile eşleşmez (ilk koşuda
       sütun boş kaldı). Ham metin `textContent`tan okunur; profil sayısı
       bloğun kendi başlığından, sayfanın tamamından değil. */
    const metin = await p.evaluate(() => document.body.innerText);
    const ham = await p.evaluate(() => ({
      govde: document.body.textContent ?? '',
      profil: document.querySelector('.ab-otprofil-blok header')?.textContent ?? '',
    }));
    const tanimsiz = /(\d+)\/(\d+) alan tanımsız|(\d+) alanın tamamı tanımlı/.exec(ham.profil);
    const dosya = `${m.ad.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${hedef.replace(/[^a-z0-9]+/gi, '-')}.jpg`;
    await p.screenshot({ path: path.join(DIZIN, dosya), fullPage: true, type: 'jpeg', quality: 45 });
    satirlar.push({
      mercek: m.ad, rota: hedef, http: yanit?.status() ?? 0, karakter: metin.length,
      hata: HATA.test(ham.govde), mercekSozcugu: metin.includes(m.ad),
      profilAlani: tanimsiz ? (tanimsiz[2] ?? tanimsiz[3]) : null, dosya,
    });
  }
}
await b.close();

const kirmizi = satirlar.filter((s) => s.durum || s.http !== 200 || s.hata || s.karakter < 400);
const md = [
  '# K4 · enerji ve su regresyon kanıtı',
  '',
  `Ölçüm: ${new Date().toISOString()} · sunucu ${KOK} · 1440×900 · \`node arac/k4-enerji-su.mjs\``,
  '',
  'Aynı kod iki mercekte: sekiz demo ekranı (mercek adımı hariç yedi rota) + Tesis 360.',
  'Profil alanı sayısı ekranın kendi metninden okunur ("N/M alan tanımsız").',
  '',
  '| Mercek | Rota | HTTP | Karakter | Hata metni | Mercek sözcüğü | Profil alanı (M) | Görüntü |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...satirlar.map((s) => s.durum
    ? `| ${s.mercek} | ${s.rota} | — | — | — | — | — | ${s.durum} |`
    : `| ${s.mercek} | \`${s.rota}\` | ${s.http} | ${s.karakter} | ${s.hata ? 'VAR' : 'yok'} | ${s.mercekSozcugu ? 'evet' : 'hayır'} | ${s.profilAlani ?? '—'} | \`${s.dosya}\` |`),
  '',
  kirmizi.length === 0 ? `**Sonuç: ${satirlar.length} ölçüm, kırmızı 0.**` : `**KIRMIZI ${kirmizi.length}:** ${kirmizi.map((k) => `${k.mercek} ${k.rota}`).join(' · ')}`,
  '',
].join('\n');
writeFileSync(path.join(DIZIN, 'OZET.md'), md);
console.log(md);
process.exit(kirmizi.length === 0 ? 0 : 1);
