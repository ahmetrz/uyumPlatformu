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

   ── JS DEMETİ TARANMAZ ────────────────────────────────────────────────
   `marka.ts` şunu yazar: `process.env.NEXT_PUBLIC_MARKA_AD?.trim() ||
   '<varsayılan>'`. Derleyici ortam değişkenini gömer ama yedek operandı
   demette kalır. Bu bir sızıntı DEĞİL, gerekliliktir: o dizge yedeğin ta
   kendisidir.

   "Varsayılan demette yalnız `||` sağında durabilir" gibi bir kural
   yazmıyoruz; o kural demet hakkında değil KÜÇÜLTÜCÜ hakkında bir
   varsayım olurdu. Bugün `a||b` üretiliyor; yarın `a?a:b` üretilirse
   kapı sebepsiz kırmızı yanardı.

   Kapsam da kaybolmuyor: biri adı bir bileşene düz metin yazarsa,
   nöbetçi koşusunda o ad İŞLENMİŞ YÜZEYDE görünür ve (a) onu yakalar.
   Bu yüzden ölçüm `out/` altındaki `*.js` DIŞINDAKİ her şeydir.

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
import { yerVarMi } from './derleme-ortami.mjs';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CIKTI = path.join(WEB, 'out');
const DERLEME = path.join(WEB, '.next');

/* Nöbetçi: hiçbir Türkçe sözcükle, hiçbir kimlikle ve hiçbir örnek
   veriyle çakışamayacak bir dizge. Değişirse (a) ölçümü anlamsızlaşmaz,
   ama çakışmadığından emin olun. */
const NOBETCI = 'ZZ-MARKA-NOBETCI-7';

/* ── İKİNCİ AD, İKİNCİ NÖBETÇİ ────────────────────────────────────────
   Kapı doğduğunda YALNIZ `MARKA_AD`ı koruyordu ve bu bir körlüktü.
   Ölçüldü (18 Eyl 2026): ayak `© 2026 Demo Enerji` dizgesini KODA
   GÖMMÜŞTÜ (`components/kabuk/Kabuk.tsx`). Başlık kiracı adını
   yapılandırmadan okuyordu, ayak okumuyordu — yani su kiracısı
   `NEXT_PUBLIC_KIRACI_AD="Şehir Su"` verip kurduğunda başlıkta
   "ŞEHİR SU", ayakta "Demo Enerji" yazıyordu. Üstelik "Enerji" ÇEKİRDEK
   bir kabuk bileşeninde duran bir SEKTÖR sözcüğüydü.

   Kapı yeşildi, çünkü sızıntıyı aradığı dizge ürün adıydı — kiracı adı
   değil. İki ad var, iki nöbetçi olur. */
const NOBETCI_KIRACI = 'ZZ-KIRACI-NOBETCI-7';

/** `lib/marka.ts`teki bir varsayılan — kapının aradığı "sızıntı" dizgesi. */
function varsayilan(ad) {
  const kaynak = readFileSync(path.join(WEB, 'lib', 'marka.ts'), 'utf8');
  const m = new RegExp(`export const ${ad} = [^|]*\\|\\| '([^']+)'`).exec(kaynak);
  if (!m) throw new Error(`lib/marka.ts içinde ${ad} varsayılanı bulunamadı`);
  return m[1];
}

/** İşlenmiş yüzeyler — HTML, RSC yükü, JSON/manifest, CSS. `*.js` YOK
    (yukarıya bakın: demetteki varsayılan yedeğin kendisidir). */
function ciktiDosyalari(kok) {
  const cikti = [];
  const gez = (d) => {
    for (const ad of readdirSync(d)) {
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (/\.(html|txt|json|css|md|xml|webmanifest)$/.test(ad)) cikti.push(tam);
    }
  };
  gez(kok);
  return cikti;
}

function derle() {
  /* Derlemeden ÖNCE yer kontrolü: yarıda kalan bir derleme, bu kapının
     ölçtüğü çıktıyı yarım bırakır ve nöbetçi adı "hiçbir yüzeyde yok"
     diye okunur — yani kapı YANLIŞ YEŞİL verir. (`derleme-ortami.mjs`) */
  if (!yerVarMi('marka:kapi')) process.exit(1);
  console.log(`derleme: NEXT_PUBLIC_MARKA_AD="${NOBETCI}" · `
    + `NEXT_PUBLIC_KIRACI_AD="${NOBETCI_KIRACI}" · NEXT_PUBLIC_DEMO=1`);
  execFileSync('npx', ['next', 'build'], {
    cwd: WEB,
    env: {
      ...process.env, NEXT_PUBLIC_DEMO: '1',
      NEXT_PUBLIC_MARKA_AD: NOBETCI, NEXT_PUBLIC_KIRACI_AD: NOBETCI_KIRACI,
    },
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

/* Kiracı adının görünmesi GEREKEN yüzeyler. İkisi de `KIRACI_AD`ı
   okumalı; yalnız biri okursa ürün kendi künyesinde iki farklı kuruma
   ait olduğunu söyler. */
/* React Sunucu Bileşeni çıktısı bitişik ifadeleri `<!-- -->` ile ayırır:
   `© {yil} {ad}` → `© <!-- -->2026<!-- --> <!-- -->Demo Enerji`. Yüzeyin
   METNİNİ ölçmek isteyen bir kalıp bu ayraçları temizlemelidir; ölçüldü —
   ilk yazımda `[^<]*` ilk ayraçta kesiliyordu ve kapı, DOĞRU çalışan bir
   kodu "telif satırı boş" diye kırmızı yakıyordu. */
const govdeMetni = (html, sinif) => {
  const m = new RegExp(`<span class="${sinif}">([\\s\\S]*?)</span>`).exec(html);
  return m ? m[1].replace(/<!--[\\s\\S]*?-->/g, '').replace(/<[^>]*>/g, '').trim() : null;
};

const KIRACI_YUZEYLERI = [
  {
    dosya: 'uyum/index.html', nerede: 'kabuk sözcük markası (birinci satır)',
    cikar: (s) => /<a class="marka"[^>]*>([^<]*)</.exec(s)?.[1] ?? null,
    /* Marka ilk satırı ekranda BÜYÜK HARFTİR (`toLocaleUpperCase('tr-TR')`);
       karşılaştırma bu yüzden kasadan bağımsız yapılır. */
    kasasiz: true,
  },
  {
    dosya: 'uyum/index.html', nerede: 'ayak telif satırı',
    cikar: (s) => govdeMetni(s, 'telif'),
  },
];

/* ── (a) KİRACI ADI İÇİN KAPSAM DARALIR — ÖLÇÜLMÜŞ BİR KARAR ─────────
   Ürün adı için (a) bütün çıktıyı tarar: ürün adının veride işi yoktur,
   her geçtiği yer bir sızıntıdır. KİRACI adı için aynısı YAPILAMAZ ve
   bu ölçüldü: nöbetçi koşumunda varsayılan kiracı adı **567 dosyada**
   geçti — çünkü tohum verisinde tesis adları ("Demo Enerji Genel
   Müdürlük") meşru olarak o adı taşır. Genel bir tarama veriyi
   sızıntıdan ayıramaz ve kapı ya hep kırmızı yanar ya susturulur.

   Bu yüzden kiracı adının (a) ölçümü KABUK KROMUYLA sınırlıdır:
   başlık (`<header class="ab-ust">`) ve ayak (`<footer class="ab-alt">`).
   Kromda geçen bir kiracı adı, nöbetçi koşumunda YALNIZCA koda gömülü
   olabilir — orada veri yoktur. Sınır beyanlıdır: krom DIŞINDA koda
   gömülmüş bir kiracı adını bu kapı görmez; onu (b) yüzey listesi
   büyüdükçe görür. */
const KROM = [
  { ad: 'başlık', kalip: /<header class="ab-ust"[\s\S]*?<\/header>/ },
  { ad: 'ayak', kalip: /<footer class="ab-alt[^"]*"[\s\S]*?<\/footer>/ },
];

function main() {
  const ad = varsayilan('MARKA_AD');
  const kiraciAd = varsayilan('KIRACI_AD');
  if (ad === NOBETCI || kiraciAd === NOBETCI_KIRACI) {
    console.error('marka kapısı: varsayılan ad nöbetçiyle aynı — ölçüm anlamsız.');
    process.exit(1);
  }
  if (ad === kiraciAd) {
    /* İki ad aynı olursa (a) ölçümü hangi adın sızdığını söyleyemez ve
       kapı bir adı öbürünün arkasına saklar. */
    console.error('marka kapısı: ürün adı ile kiracı adı AYNI — iki sızıntı ayırt edilemez.');
    process.exit(1);
  }

  derle();
  if (!existsSync(CIKTI)) {
    console.error(`marka kapısı: çıktı dizini yok (${path.relative(WEB, CIKTI)}).`);
    process.exit(1);
  }

  const dosyalar = ciktiDosyalari(CIKTI);

  /* (a) — varsayılan ADLARIN İKİSİ DE işlenmiş yüzeylerin hiçbirinde
     geçmemeli. Ürün adı ile kiracı adı ayrı ayrı aranır ki kırmızı
     yandığında HANGİ adın sızdığı belli olsun. */
  const sizintiAra = (deger) => dosyalar
    .filter((f) => readFileSync(f, 'utf8').includes(deger))
    .map((f) => path.relative(CIKTI, f));
  const sizinti = sizintiAra(ad);
  /* Kiracı adı YALNIZ kabuk kromunda aranır (yukarıdaki gerekçe). */
  const kiraciSizinti = [];
  for (const f of dosyalar.filter((x) => x.endsWith('.html'))) {
    const html = readFileSync(f, 'utf8');
    for (const { ad: bolge, kalip } of KROM) {
      const dilim = kalip.exec(html)?.[0];
      if (dilim && dilim.includes(kiraciAd)) {
        kiraciSizinti.push(`${path.relative(CIKTI, f)} · ${bolge}`);
      }
    }
  }

  /* (b) — nöbetçi, görünmesi gereken yüzeylerde geçmeli. */
  const eksikAra = (yuzeyler, nobetci) => {
    const cikti = [];
    for (const { dosya, nerede, cikar, kasasiz } of yuzeyler) {
      const yol = path.join(CIKTI, dosya);
      if (!existsSync(yol)) { cikti.push(`${dosya} · ${nerede}: dosya üretilmemiş`); continue; }
      const bulunan = cikar(readFileSync(yol, 'utf8'));
      if (bulunan === null) { cikti.push(`${dosya} · ${nerede}: yüzey bulunamadı (biçim değişmiş)`); continue; }
      const iki = kasasiz
        ? bulunan.toLocaleUpperCase('tr-TR').includes(nobetci.toLocaleUpperCase('tr-TR'))
        : bulunan.includes(nobetci);
      if (!iki) cikti.push(`${dosya} · ${nerede}: "${bulunan}"`);
    }
    return cikti;
  };
  const eksik = eksikAra(YUZEYLER, NOBETCI);
  const kiraciEksik = eksikAra(KIRACI_YUZEYLERI, NOBETCI_KIRACI);

  /* Ölçüm bitti; nöbetçi taşıyan derleme çıktısı bırakılmaz. */
  rmSync(CIKTI, { recursive: true, force: true });
  rmSync(DERLEME, { recursive: true, force: true });

  console.log(`\ntaranan çıktı dosyası: ${dosyalar.length}`);
  console.log(`(a) ÜRÜN adı sızıntısı:   ${sizinti.length}`
    + ' (işlenmiş yüzeyler; JS demeti taranmaz)');
  console.log(`(a) KİRACI adı sızıntısı: ${kiraciSizinti.length}`);
  console.log(`(b) ürün nöbetçisi eksik:   ${eksik.length} / ${YUZEYLER.length}`);
  console.log(`(b) kiracı nöbetçisi eksik: ${kiraciEksik.length} / ${KIRACI_YUZEYLERI.length}`);
  console.log('not: statik demoda /giris bir yönlendirme koçanıdır; giriş ekranının '
    + 'hero metni ÖLÇÜLMEDİ (canlı sunucu ister).');

  if (sizinti.length > 0) {
    console.log(`\nSIZINTI — "${ad}" çıktıda geçiyor; bir yer adı yapılandırmadan okumuyor:`);
    for (const f of sizinti.slice(0, 20)) console.log(`  ${f}`);
    if (sizinti.length > 20) console.log(`  … ve ${sizinti.length - 20} dosya daha`);
  }
  if (kiraciSizinti.length > 0) {
    console.log(`\nSIZINTI — KİRACI adı "${kiraciAd}" çıktıda geçiyor; bir yer `
      + 'kiracı adını yapılandırmadan okumuyor:');
    for (const f of kiraciSizinti.slice(0, 20)) console.log(`  ${f}`);
    if (kiraciSizinti.length > 20) console.log(`  … ve ${kiraciSizinti.length - 20} dosya daha`);
  }
  if (eksik.length > 0) {
    console.log('\nEKSİK — ürün nöbetçisi şu yüzeylerde görünmüyor:');
    for (const e of eksik) console.log(`  ${e}`);
  }
  if (kiraciEksik.length > 0) {
    console.log('\nEKSİK — kiracı nöbetçisi şu yüzeylerde görünmüyor:');
    for (const e of kiraciEksik) console.log(`  ${e}`);
  }

  if (sizinti.length + kiraciSizinti.length + eksik.length + kiraciEksik.length > 0) {
    console.log('\nmarka kapısı: KIRMIZI');
    process.exit(1);
  }
  console.log('\nmarka kapısı: ürün adı VE kiracı adı tek kaynaktan geliyor (URN-KUR-004).');
}

main();
