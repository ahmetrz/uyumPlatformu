#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   MARKA KAPISI — ürün adı gerçekten tek yerden mi geliyor?

   ── NEDEN METİN TARAMASI DEĞİL ────────────────────────────────────────
   Önceki ölçüm kaynak ağacında adı düz dizge olarak arıyordu. O ölçüm,
   ad ayırt edici bir dizge olduğu sürece çalışır; ad Türkçe bir sözcük
   olursa çöker. 6 Eylül 2026'da denendi: varsayılan geçici olarak
   "Kayda" yapıldığında dört dosya kusurlu göründü — "Kayda git"
   düğmesi ve üç yorumdaki "Kayda dönüşmemiş…" / "Kayda PAROLA ASLA
   GİRMEZ" cümleleri. Üçü yorum, biri gerçek arayüz metniydi. Hiçbir
   düzenli ifade onları marka kullanımından ayıramaz.

   Bu kapı kaynağa hiç bakmaz. Nöbetçi bir adla derleme yapar ve
   ÜRETİLEN ÇIKTIYA bakar. Yorumdaki sözcük çakışması çıktıya girmez;
   düğme metnindeki çakışma da girer ama nöbetçi ad doğal olarak hiçbir
   yerde geçemeyeceği için (a) ölçümünü kirletmez.

   ── İKİ İDDİA ─────────────────────────────────────────────────────────
   (a) `lib/marka.ts` varsayılanı, nöbetçiyle yapılan derlemenin
       çıktısında HİÇBİR yerde geçmez. Geçiyorsa bir yer adı
       yapılandırmadan okumuyor demektir.
   (b) Nöbetçi, adın görünmesi GEREKEN yüzeylerde geçer. Yalnız (a)
       ölçülseydi adı her yerden silmek de kapıyı geçerdi.

   ── ÖLÜ YEDEK DİZGE ───────────────────────────────────────────────────
   `marka.ts` şunu yazar: `process.env.NEXT_PUBLIC_MARKA_AD?.trim() ||
   '<varsayılan>'`. Derleyici ortam değişkenini yerine gömer ama YEDEK
   OPERANDI silmez; varsayılan dizge JS demetinde ölü kod olarak kalır.
   Çalışma zamanında hiç okunmaz — nöbetçi kazanır, (b) bunu zaten
   kanıtlar.

   Bu yüzden ölçüm iki bölümdür: işlenmiş yüzeylerde (HTML, RSC yükü,
   CSS, manifest) SIFIR tolerans; JS demetlerinde ise varsayılan yalnız
   `||` operatörünün sağında, yani bir yedek operandı olarak durabilir.
   Demette başka bir bağlamda geçmesi gerçek bir sızıntıdır: ikinci bir
   doğruluk kaynağı demektir.

   ── SINIR ─────────────────────────────────────────────────────────────
   Statik demo derlemesinde `/giris` bir yönlendirme koçanıdır: demo
   kimliği her zaman dolu olduğu için sayfa gövdesi boş çıkar ve giriş
   ekranının hero metni HTML'e hiç girmez. Bu yüzden giriş rotası burada
   yalnız SEKME BAŞLIĞIYLA ölçülür; hero metnini ölçmek canlı sunucu
   ister ve o ayrı bir kapıdır. Ölçülemeyen şey "geçti" diye yazılmaz.

   ── YAN ETKİ ──────────────────────────────────────────────────────────
   Derleme nöbetçi adla yapıldığı için `out/` ve `.next` nöbetçi değer
   taşır. Kapı bitince ikisini de SİLER — nöbetçi bir derlemenin
   yayımlanması ürün adının yanlış görünmesi demektir. Sonraki gerçek
   derleme sıfırdan koşar.

   Kullanım: node arac/marka-kapisi.mjs
   ═══════════════════════════════════════════════════════════════════════ */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CIKTI = path.join(WEB, 'out');
const DERLEME = path.join(WEB, '.next');

/* Nöbetçi: hiçbir Türkçe sözcükle, hiçbir kimlikle ve hiçbir örnek
   veriyle çakışamayacak bir dizge. Değişirse (a) ölçümü anlamsızlaşmaz,
   ama çakışmadığından emin olun. */
const NOBETCI = 'ZZ-MARKA-NOBETCI-7';

/** `lib/marka.ts`teki varsayılan ad — kapının aradığı "sızıntı" dizgesi. */
function varsayilanAd() {
  const kaynak = readFileSync(path.join(WEB, 'lib', 'marka.ts'), 'utf8');
  const m = /export const MARKA_AD = [^|]*\|\| '([^']+)'/.exec(kaynak);
  if (!m) throw new Error('lib/marka.ts içinde MARKA_AD varsayılanı bulunamadı');
  return m[1];
}

/** Çıktıdaki bütün metin dosyaları — HTML, RSC yükü, JS demeti, CSS. */
function ciktiDosyalari(kok) {
  const cikti = [];
  const gez = (d) => {
    for (const ad of readdirSync(d)) {
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (/\.(html|txt|json|js|css|md|xml|webmanifest)$/.test(ad)) cikti.push(tam);
    }
  };
  gez(kok);
  return cikti;
}

function derle() {
  console.log(`derleme: NEXT_PUBLIC_MARKA_AD="${NOBETCI}" · NEXT_PUBLIC_DEMO=1`);
  execFileSync('npx', ['next', 'build'], {
    cwd: WEB,
    env: { ...process.env, NEXT_PUBLIC_DEMO: '1', NEXT_PUBLIC_MARKA_AD: NOBETCI },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

/* ── (b) adın GÖRÜNMESİ gereken yüzeyler ────────────────────────────────
   Her satır: dosya · ne aradığımız · dizgeyi üreten kalıp. Kalıp
   eşleşmezse bu da kusurdur: yüzey kaybolmuşsa kapı ölçmüyordur. */
const YUZEYLER = [
  {
    dosya: 'index.html', nerede: 'kök sekme başlığı',
    cikar: (s) => /<title>([^<]*)<\/title>/.exec(s)?.[1] ?? null,
  },
  {
    dosya: 'giris/index.html', nerede: 'giriş rotasının sekme başlığı',
    cikar: (s) => /<title>([^<]*)<\/title>/.exec(s)?.[1] ?? null,
  },
  {
    dosya: 'uyum/index.html', nerede: 'kabuk sözcük markası (ikinci satır)',
    cikar: (s) => /<span class="ikinci">([^<]*)<\/span>/.exec(s)?.[1] ?? null,
  },
  {
    dosya: 'uyum/index.html', nerede: 'kabuk sözcük markası erişilebilir adı',
    cikar: (s) => /class="marka" aria-label="([^"]*)"/.exec(s)?.[1] ?? null,
  },
];

function main() {
  const ad = varsayilanAd();
  if (ad === NOBETCI) {
    console.error('marka kapısı: varsayılan ad nöbetçiyle aynı — ölçüm anlamsız.');
    process.exit(1);
  }

  derle();
  if (!existsSync(CIKTI)) {
    console.error(`marka kapısı: çıktı dizini yok (${path.relative(WEB, CIKTI)}).`);
    process.exit(1);
  }

  const dosyalar = ciktiDosyalari(CIKTI);

  /* (a) — varsayılan ad işlenmiş yüzeylerde HİÇ geçmemeli; JS demetinde
     yalnız `||` yedek operandı olarak durabilir (ölü kod). */
  const kacir = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const YEDEK_OPERANDI = new RegExp(`\\|\\|\\s*["']${kacir(ad)}["']`, 'g');

  const sizinti = [];
  for (const f of dosyalar) {
    const metin = readFileSync(f, 'utf8');
    if (!metin.includes(ad)) continue;
    const goreli = path.relative(CIKTI, f);

    if (!f.endsWith('.js')) { sizinti.push(`${goreli} (işlenmiş yüzey)`); continue; }

    /* Demet: yedek operandlarını düşür, kalan varsa gerçek sızıntıdır. */
    const kalan = metin.replace(YEDEK_OPERANDI, '');
    if (kalan.includes(ad)) sizinti.push(`${goreli} (demette yedek operandı DIŞINDA)`);
  }

  /* (b) — nöbetçi, görünmesi gereken yüzeylerde geçmeli. */
  const eksik = [];
  for (const { dosya, nerede, cikar } of YUZEYLER) {
    const yol = path.join(CIKTI, dosya);
    if (!existsSync(yol)) { eksik.push(`${dosya} · ${nerede}: dosya üretilmemiş`); continue; }
    const bulunan = cikar(readFileSync(yol, 'utf8'));
    if (bulunan === null) { eksik.push(`${dosya} · ${nerede}: yüzey bulunamadı (biçim değişmiş)`); continue; }
    if (!bulunan.includes(NOBETCI)) eksik.push(`${dosya} · ${nerede}: "${bulunan}"`);
  }

  /* Ölçüm bitti; nöbetçi taşıyan derleme çıktısı bırakılmaz. */
  rmSync(CIKTI, { recursive: true, force: true });
  rmSync(DERLEME, { recursive: true, force: true });

  console.log(`\ntaranan çıktı dosyası: ${dosyalar.length}`);
  console.log(`(a) varsayılan ad sızıntısı: ${sizinti.length}`
    + ' (işlenmiş yüzeylerde sıfır tolerans; demette yedek operandı serbest)');
  console.log(`(b) nöbetçi eksik olan yüzey: ${eksik.length} / ${YUZEYLER.length}`);
  console.log('not: statik demoda /giris bir yönlendirme koçanıdır; giriş ekranının '
    + 'hero metni ÖLÇÜLMEDİ (canlı sunucu ister).');

  if (sizinti.length > 0) {
    console.log(`\nSIZINTI — "${ad}" çıktıda geçiyor; bir yer adı yapılandırmadan okumuyor:`);
    for (const f of sizinti.slice(0, 20)) console.log(`  ${f}`);
    if (sizinti.length > 20) console.log(`  … ve ${sizinti.length - 20} dosya daha`);
  }
  if (eksik.length > 0) {
    console.log('\nEKSİK — nöbetçi ad şu yüzeylerde görünmüyor:');
    for (const e of eksik) console.log(`  ${e}`);
  }

  if (sizinti.length > 0 || eksik.length > 0) {
    console.log('\nmarka kapısı: KIRMIZI');
    process.exit(1);
  }
  console.log('\nmarka kapısı: ürün adı tek kaynaktan geliyor (URN-KUR-004).');
}

main();
