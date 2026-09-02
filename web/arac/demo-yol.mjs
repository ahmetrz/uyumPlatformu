#!/usr/bin/env node
/* Statik yayın yol düzeltmesi — derleme SONRASI.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   GitHub Pages proje sayfası siteyi `/<depo>/` altında sunar ve Next bunu
   `basePath` ile kurar. Ama `basePath` CSS'in İÇİNDEKİ mutlak `url()`
   başvurularına DOKUNMAZ: `app/kabuk.css` içindeki
   `url('/fontlar/inter-latin.woff2')` derlenmiş çıktıya olduğu gibi
   geçer ve yayında `https://<kullanıcı>.github.io/fontlar/…` adresini
   ister — yani 404.

   Sonuç sessizdir ve tam da bu yüzden tehlikelidir: sayfa açılır,
   yerleşim doğrudur, YALNIZ yazı tipleri sistem yazısına düşer. Ölçüldü:
   yayındaki `url(/fontlar/archivo-latin.woff2)` 404, aynı dosya
   `/uyumPlatformu/fontlar/archivo-latin.woff2` altında 200.

   ── NEDEN BAŞKA ÇÖZÜM DEĞİL ───────────────────────────────────────────
   · Göreli yol (`../../../fontlar/…`): paketleyici göreli `url()`
     başvurusunu KAYNAK dosyaya göre çözer (`web/fontlar/` — yok) ve
     derleme kırılır. Ayrıca geliştirme kipinde çıktı bir kademe daha
     derindir (`_next/dev/static/chunks`), sabit derinlik tutmaz.
   · Çoklu `src` yedeği: çalışır ama yayında her yüzde bir 404 üretir.
   · `next/font/local`: unicode-range alt kümelerini (latin / latin-ext)
     yüz başına ifade edemiyor; Türkçe ğ/ş/ı için alt küme ayrımı şart.

   Bu araç yalnız ÇIKTIYI düzeltir; kaynak dosyalar geliştirme ve üretim
   için doğru kalır. `arac/yayin-kontrol.mjs` sonucu ayrıca doğrular.

   Kullanım: node arac/demo-yol.mjs [out dizini]
*/
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIKTI = path.resolve(process.argv[2] ?? path.join(WEB, 'out'));

const kaynak = readFileSync(path.join(WEB, 'lib', 'demo.ts'), 'utf8');
const m = /export const YAYIN_KOKU = '([^']+)'/.exec(kaynak);
if (!m) throw new Error('lib/demo.ts içinde YAYIN_KOKU bulunamadı');
const KOK = m[1];

if (!existsSync(CIKTI)) {
  console.error(`demo-yol: çıktı dizini yok → ${CIKTI}`);
  process.exit(1);
}

function cssDosyalari(dizin) {
  const cikti = [];
  for (const ad of readdirSync(dizin)) {
    const t = path.join(dizin, ad);
    if (statSync(t).isDirectory()) cikti.push(...cssDosyalari(t));
    else if (ad.endsWith('.css')) cikti.push(t);
  }
  return cikti;
}

/* `public/` altındaki üst düzey klasörler — CSS'ten mutlak yolla
   istenebilecek varlık kökleri. Listeyi diskten türetiyoruz ki yeni bir
   klasör eklendiğinde burası unutulmasın. */
const VARLIK_KOKLERI = readdirSync(path.join(WEB, 'public'))
  .filter((ad) => statSync(path.join(WEB, 'public', ad)).isDirectory());

let dosya = 0;
let degisiklik = 0;
for (const yol of cssDosyalari(CIKTI)) {
  const metin = readFileSync(yol, 'utf8');
  let yeni = metin;
  for (const kokAd of VARLIK_KOKLERI) {
    /* Yalnız `url(` içindeki ve ZATEN ön eki olmayan mutlak yollar. */
    yeni = yeni.replace(
      new RegExp(`url\\((['"]?)/${kokAd}/`, 'g'),
      `url($1${KOK}/${kokAd}/`,
    );
  }
  if (yeni !== metin) {
    writeFileSync(yol, yeni);
    dosya += 1;
    degisiklik += (yeni.match(new RegExp(`${KOK}/`, 'g')) ?? []).length;
  }
}

console.log(
  `demo-yol: ${dosya} CSS dosyasında ${degisiklik} varlık yolu `
  + `"${KOK}" ön ekiyle yeniden yazıldı (kökler: ${VARLIK_KOKLERI.join(', ')})`,
);
