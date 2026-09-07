#!/usr/bin/env node
/* ÇEKİRDEK SÖZCÜK TARAMASI — bekçinin yapısal kör noktası.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Bekçi NEGATİF kanıt üretir: "sektör sözcüğü kalmadı". Bir ekran
   `santral`ı çekirdek `tesis`/`portföy` ile SABİT değiştirirse bekçi
   yeşil yanar — ortada sektör sözcüğü yoktur. `sozluk-farki` bunu
   ekranda yakalar, ama YALNIZ o an render edilen metinde: koşula bağlı
   dallar (boş durum, yetki kısıtı, modal) görünmez.

   Aynı kusur BEŞ ailede aynı şekilde bulundu (riskler · kimlik ·
   yetkiler · ayarlar · dokümanlar) ve hepsi `portfoy` anahtarındaydı:
   "tesissiz kayıt" hâli için ekranlar çekirdek sözcüğü yazıyordu. Aile
   aile keşfetmek, her seferinde aynı dersi yeniden öğrenmek demek.

   Bu araç sınıfı TOPLUCA görünür kılar: kaynakta, DİZE ve JSX METNİ
   içinde geçen çekirdek sözcükleri arar. Statik olduğu için koşula bağlı
   dalları da görür — çalışma anındaki avın göremediği yeri.

   ── NE ARANIR ─────────────────────────────────────────────────────────
   Yalnız sektör sözlüğünün çekirdekten AYRILDIĞI anahtarlar. Ayrılmayan
   bir anahtarda çekirdek sözcüğü görmek hiçbir şey söylemez — sözlük de
   aynı sözcüğü yazardı (`sistem` · `varlik` bugün böyle).

   ── NE ARANMAZ ────────────────────────────────────────────────────────
   · YORUMLAR — render edilmez; sökülür.
   · `lib/dil/` — sözlüğün kendi tanımı orada yaşar.
   · Tohum ve test verisi — kayıt neyse odur (`prisma/` · `tests/`).
   · Tanımlayıcı/dosya adı parçaları — komşusunda `-` `.` `_` olan.

   Kullanım:  npx tsx arac/cekirdek-sozcuk-taramasi.mjs [--json]
*/
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CEKIRDEK_TERIMLER } from '../lib/dil/terimler';
import { SOZLUKLER } from './sozluk-takas.mjs';
import { WEB } from './kosu-ortak.mjs';
import { taranacakDosyalar } from '../tests/bekci/terimler';
import { kanonik, sinirKalibi } from './turkce-arama.mjs';

/* Sektör sözlüğünün çekirdekten ayrıldığı anahtarlar. */
const enerji = Object.fromEntries(SOZLUKLER.enerji.map((s) => [s.anahtar, s]));
const ARANAN = Object.entries(CEKIRDEK_TERIMLER)
  .filter(([anahtar, terim]) => enerji[anahtar] && enerji[anahtar].tekil !== terim.tekil)
  .map(([anahtar, terim]) => ({
    anahtar,
    formlar: Object.values(terim).filter((x) => typeof x === 'string' && x.length >= 4),
  }));

/** Yorumları söker: render edilmeyen metin aranmaz. */
export function yorumsuz(kaynak) {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/** Dize ve JSX metni parçaları — kodun geri kalanı elenir.

    İKİ ELEME, ikisi de ölçümden çıktı:

    1. `${…}` İÇİ SÖKÜLÜR. `` `${t(sozluk, 'tesis')}siz kayıt` `` dizesi
       çekirdek sözcük taşıyor GÖRÜNÜR, oysa taşıdığı şey sözlük
       ÇAĞRISININ anahtarıdır — o satır zaten doğru çalışıyor. Sökülmezse
       çevrilmiş her yer yeniden "borç" diye sayılır.

    2. SÖZLÜK ANAHTARI ARGÜMANLARI atlanır: `t(sozluk, 'tesis')` içindeki
       `'tesis'` bir ekran metni değil, anahtarın kendisidir. */
export function metinParcalari(kaynak) {
  const parcalar = [];
  /* Anahtar argümanları: `t(`/`tBas(` çağrılarındaki dizeler. */
  const anahtarlar = new Set();
  for (const m of kaynak.matchAll(/\b(?:t|tBas|terim|terimBas)\s*\([^)]*?'([^']+)'/g)) {
    anahtarlar.add(m[1]);
  }
  const sok = (x) => x.replace(/\$\{[^}]*\}/g, ' ');
  for (const m of kaynak.matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`\\]*)`/g)) {
    const ham = sok(m[1] ?? m[2] ?? m[3] ?? '');
    if (anahtarlar.has(ham.trim())) continue;
    if (gorunenMetin(ham)) parcalar.push(ham);
  }
  return parcalar;
}

/** Dize EKRAN METNİ mi, yoksa kod tanımlayıcısı mı?

    Ayrım ölçümden çıktı: ilk kurgu JSX metnini de (`>…<`) tarıyordu ve
    TypeScript'te o kalıp güvenilmez — ok işlevi (`=>`), jenerik (`<T>`)
    ve karşılaştırma yakalanıyordu. Sonuç 554 "bulgu"ydu ve çoğu koddu;
    gürültü, aradığı sinyali gizliyordu.

    Ekran metni PROZADIR: ya boşluk taşır ("kurumsal · tüm portföy"), ya
    da tek başına duran BÜYÜK harfle başlayan bir sözcüktür ("Tesis").
    Alan adı ve anahtar küçük harfli tek jetondur (`tesisler`, `tesis`)
    ve ekranda görünmez. */
export function gorunenMetin(dize) {
  const s = dize.trim();
  if (s.length < 4) return false;
  if (/\s/.test(s)) return true;
  return /^\p{Lu}/u.test(s);
}

const ATLA = [`${path.sep}dil${path.sep}`, `prisma${path.sep}`, `tests${path.sep}`,
  `arac${path.sep}`, `${path.sep}prisma-client${path.sep}`];

/* Gerekçeli muafiyetler — çekirdek sözcüğün DOĞRU olduğu dosyalar
   (R0-8 · R0-9 · kod anahtarı · ölçü birimi). Ölü kayıt kırmızı verir. */
const MUAFIYET = JSON.parse(
  readFileSync(path.join(WEB, 'arac', 'cekirdek-sozcuk-muafiyet.json'), 'utf8')).dosyalar;

/* Test dosyası bu modülü İMPORT eder; taramanın kendisi yalnız doğrudan
   çalıştırıldığında koşar. Aksi hâlde her test koşumu 500 dosya tarardı. */
const DOGRUDAN = process.argv[1]?.endsWith('cekirdek-sozcuk-taramasi.mjs');

const bulgular = [];
const muafKullanildi = new Set();
if (DOGRUDAN) {
for (const gorece of taranacakDosyalar()) {
  if (!/\.(ts|tsx)$/.test(gorece)) continue;
  if (ATLA.some((x) => gorece.includes(x.replace(/\\/g, '/')))) continue;
  if (gorece in MUAFIYET) { muafKullanildi.add(gorece); continue; }
  const kaynak = yorumsuz(readFileSync(path.join(WEB, gorece), 'utf8'));
  for (const parca of metinParcalari(kaynak)) {
    const k = kanonik(parca);
    for (const { anahtar, formlar } of ARANAN) {
      for (const form of formlar) {
        const re = sinirKalibi(kanonik(form).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u');
        const m = re.exec(k);
        if (!m) continue;
        const once = k[m.index - 1] ?? ' ';
        const sonra = k[m.index + m[0].length] ?? ' ';
        if (/[-._/]/.test(once) || /[-._/]/.test(sonra)) continue;  // tanımlayıcı
        bulgular.push({ dosya: gorece, anahtar, form, metin: parca.trim().slice(0, 72) });
        break;
      }
    }
  }
}

}

if (DOGRUDAN && process.argv.includes('--json')) {
  console.log(JSON.stringify(bulgular, null, 2));
} else if (DOGRUDAN) {
  const dosyaBasina = new Map();
  for (const b of bulgular) {
    if (!dosyaBasina.has(b.dosya)) dosyaBasina.set(b.dosya, []);
    dosyaBasina.get(b.dosya).push(b);
  }
  console.log(`cekirdek-sozcuk: aranan anahtar ${ARANAN.map((a) => a.anahtar).join(' · ')}\n`);
  for (const [dosya, liste] of [...dosyaBasina].sort()) {
    console.log(`  ${dosya}  (${liste.length})`);
    for (const b of liste.slice(0, 4)) console.log(`      '${b.anahtar}'  "${b.metin}"`);
  }
  console.log(`\ncekirdek-sozcuk: ${bulgular.length} bulgu · ${dosyaBasina.size} dosya`
    + ` · ${muafKullanildi.size}/${Object.keys(MUAFIYET).length} muafiyet kullanıldı`);

  /* ÖLÜ MUAFİYET: dosya artık yok ya da içinde çekirdek sözcük kalmadı.
     Elle tutulan liste sessizce bayatlar — kırmızı versin. */
  const olu = Object.keys(MUAFIYET).filter((d) => !muafKullanildi.has(d));
  if (olu.length > 0) {
    console.error('\nÖLÜ MUAFİYET — dosya taranmıyor ya da artık çekirdek sözcük taşımıyor:');
    for (const d of olu) console.error(`  ${d}`);
    console.error('  Kaydı düşürün; gereksiz muafiyet kapının kör noktasıdır.');
    process.exit(1);
  }
}
