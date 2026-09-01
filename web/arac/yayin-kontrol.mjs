#!/usr/bin/env node
/* Statik yayın bütünlük kapısı — derleme SONRASI, `demo-yol.mjs`'den sonra.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Yayında kırık bir varlık başvurusu SESSİZDİR. Sayfa açılır, yerleşim
   doğrudur, yalnız yazı tipi sistem yazısına düşer ya da bir fotoğraf
   boş kalır. Kimse hata görmez; tasarım yanlış görünür ve bunu ancak
   birisi gözüyle fark ederse öğreniriz.

   Tam olarak bu oldu: `app/abacus.css` (öncesinde `atlas.css`) mutlak
   `url('/fontlar/…')` yazıyordu, site ise `/uyumPlatformu/` altında
   sunuluyordu. Ölçüldü — `…github.io/fontlar/archivo-latin.woff2` 404,
   `…github.io/uyumPlatformu/fontlar/archivo-latin.woff2` 200. Yayınlanan
   demoda HİÇBİR yazı tipi yüklenmiyordu ve bunu kimse fark etmemişti.

   Bu araç aynı hatanın bir daha sessizce geçmesini imkânsız kılar:
   çıktıdaki her CSS `url()` ve her HTML `href`/`src`/`srcset` başvurusunu
   diskte ARAR. Bulamazsa derleme kırılır.

   İki ayrı kusur ayrı raporlanır:
     · KÖK DIŞI — mutlak yol yayın kökü ile başlamıyor (basePath atlanmış)
     · EKSİK    — yol doğru ama hedef dosya çıktıda yok

   Kullanım: node arac/yayin-kontrol.mjs [out dizini]
*/
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIKTI = path.resolve(process.argv[2] ?? path.join(WEB, 'out'));

const kaynak = readFileSync(path.join(WEB, 'lib', 'demo.ts'), 'utf8');
const m = /export const YAYIN_KOKU = '([^']+)'/.exec(kaynak);
if (!m) throw new Error('lib/demo.ts içinde YAYIN_KOKU bulunamadı');
const KOK = m[1];

if (!existsSync(CIKTI)) {
  console.error(`yayin-kontrol: çıktı dizini yok → ${CIKTI}`);
  process.exit(1);
}

function dosyalar(dizin, uzanti) {
  const cikti = [];
  for (const ad of readdirSync(dizin)) {
    const t = path.join(dizin, ad);
    if (statSync(t).isDirectory()) cikti.push(...dosyalar(t, uzanti));
    else if (uzanti.some((u) => ad.endsWith(u))) cikti.push(t);
  }
  return cikti;
}

/* Dışarıya çıkan ya da dosya olmayan başvurular: kontrol edilmez. */
const DIS = /^(data:|https?:|mailto:|tel:|blob:|javascript:|#|\/\/)/i;

const kokDisi = new Map();   // başvuru → onu yazan dosyalar
const eksik = new Map();
let denetlenen = 0;

/** Bir yayın yolunu (KOK dâhil) diskteki dosyaya çözer; yoksa null. */
function coz(yayinYolu) {
  const temiz = yayinYolu.split('#')[0].split('?')[0];
  const goreli = temiz.slice(KOK.length).replace(/^\//, '');
  const taban = path.join(CIKTI, decodeURIComponent(goreli));
  /* `trailingSlash` yayınında rota klasördür: `…/bulgular/` → index.html.
     Uzantısız bir yol da aynı şekilde sayfa olabilir. */
  for (const aday of [taban, path.join(taban, 'index.html'), `${taban}.html`]) {
    if (existsSync(aday) && statSync(aday).isFile()) return aday;
  }
  return null;
}

function kaydet(harita, anahtar, yazan) {
  const dizi = harita.get(anahtar) ?? [];
  dizi.push(path.relative(CIKTI, yazan));
  harita.set(anahtar, dizi);
}

function denetle(basvuru, yazan, kaynakDizin) {
  if (!basvuru || DIS.test(basvuru)) return;
  denetlenen += 1;
  if (basvuru.startsWith('/')) {
    if (!basvuru.startsWith(`${KOK}/`) && basvuru !== KOK) {
      kaydet(kokDisi, basvuru, yazan);
      return;
    }
    if (!coz(basvuru)) kaydet(eksik, basvuru, yazan);
    return;
  }
  /* Göreli başvuru: yazan dosyanın klasörüne göre çözülür. */
  const temiz = basvuru.split('#')[0].split('?')[0];
  if (!temiz) return;
  const hedef = path.resolve(kaynakDizin, decodeURIComponent(temiz));
  const adaylar = [hedef, path.join(hedef, 'index.html'), `${hedef}.html`];
  if (!adaylar.some((a) => existsSync(a) && statSync(a).isFile())) {
    kaydet(eksik, basvuru, yazan);
  }
}

for (const yol of dosyalar(CIKTI, ['.css'])) {
  const metin = readFileSync(yol, 'utf8');
  for (const g of metin.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    denetle(g[2].trim(), yol, path.dirname(yol));
  }
}

for (const yol of dosyalar(CIKTI, ['.html'])) {
  const metin = readFileSync(yol, 'utf8');
  for (const g of metin.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    denetle(g[1].trim(), yol, path.dirname(yol));
  }
  for (const g of metin.matchAll(/\ssrcset="([^"]*)"/g)) {
    for (const parca of g[1].split(',')) {
      denetle(parca.trim().split(/\s+/)[0], yol, path.dirname(yol));
    }
  }
}

function bildir(baslik, harita, aciklama) {
  if (harita.size === 0) return 0;
  console.error(`\n  ${baslik} (${harita.size})`);
  console.error(`  ${aciklama}`);
  for (const [basvuru, yazanlar] of [...harita].sort()) {
    const ilk = yazanlar.slice(0, 3).join(', ');
    const fazla = yazanlar.length > 3 ? ` … +${yazanlar.length - 3}` : '';
    console.error(`    ${basvuru}\n      ← ${ilk}${fazla}`);
  }
  return harita.size;
}

const a = bildir('KÖK DIŞI', kokDisi,
  `Mutlak yol "${KOK}" ile başlamıyor; yayında 404 olur.`);
const b = bildir('EKSİK', eksik,
  'Yol doğru ama hedef dosya çıktıda yok.');

if (a + b > 0) {
  console.error(`\nyayin-kontrol: ${a + b} kırık başvuru — yayın durduruldu.\n`);
  process.exit(1);
}

console.log(
  `yayin-kontrol: ${denetlenen} varlık başvurusu doğrulandı, hepsi "${KOK}" `
  + 'altında ve diskte mevcut.',
);
