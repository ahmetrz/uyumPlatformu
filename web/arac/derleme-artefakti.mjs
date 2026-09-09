/* ═══════════════════════════════════════════════════════════════════════
   PAYLAŞILAN DERLEME ARTEFAKTI · ORTAM BEYANI

   KOMŞUSUYLA KARIŞTIRMAYIN: `derleme-ortami.mjs` ölçüm ortamının FİZİĞİNİ
   sorar (yeter disk var mı · elimizdeki `out/` TAM mı). Bu dosya ise
   paylaşılan bir derleme artefaktının HANGİ ORTAMDA üretildiğini ve onu
   indiren işin AYNI ortamı isteyip istemediğini sorar. İkisi ayrı
   sorudur ve ayrı dosyalarda durur.

   ── NEDEN VAR ─────────────────────────────────────────────────────────
   Üretim derlemesi CI'da İKİ işte birden koşuyordu (`kapi` ve
   `kapi-yavas`); tarayıcılı kapılar dört ayrı işe bölününce aynı derleme
   DÖRT kez koşacaktı. Çözüm derlemeyi bir kez koşup çıktısını artefakt
   olarak paylaşmak — ama paylaşılan bir derleme, ORTAMI DA paylaşır ve
   ortam sessizdir.

   ÖLÇÜLDÜ, İKİ KEZ:
     · `NEXT_PUBLIC_DEMO` — `npm run demo:build` betiği bu değişkeni
       AYARLAMIYOR (iş akışında duruyor). Yerelde koşan şey statik dışa
       aktarım değil, ikinci bir sunucu derlemesiydi; "statik demo
       bozulmadı, ölçüldü" cümlesi yazıldığı anda yanlıştı.
     · `TEST_PG_URL` — kabukta duran değer, onu BEYAN ETMEYEN adıma da
       sızıyor ve SQLite birim testlerini "adaptör uyumsuz" diye kırmızı
       yakıyordu. Kusur kodda değil, ölçüm ortamındaydı.

   `NEXT_PUBLIC_*` değerleri istemci paketine DERLEME ANINDA gömülür.
   Bir iş artefaktı indirip kendi `NEXT_PUBLIC_*` değerini verirse o
   değer HİÇBİR ŞEY yapmaz; ekran derleyenin değerini gösterir, iş
   akışını okuyan ise kendi verdiğini sanır. Sessiz ve inandırıcı.

   ── KURAL ─────────────────────────────────────────────────────────────
   Artefaktı üreten ve tüketen HER iş, hangi derleme ortamını istediğini
   `DERLEME_ORTAMI` ile BEYAN EDER. Beyansız tüketim kırmızıdır. Beyanı
   üreticiden FARKLI olan iş artefaktı tüketemez — kendi derlemesini
   yapar (statik demo tam olarak budur: `NEXT_PUBLIC_DEMO=1`).

   Kullanım:
     node arac/derleme-artefakti.mjs --damgala   (derlemeden sonra: damga yaz)
     node arac/derleme-artefakti.mjs --dogrula   (artefaktı indiren işte)
     node arac/derleme-artefakti.mjs --kapi      (iş akışını ölç · statik)
*/
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEPO = path.resolve(WEB, '..');
const PR_KAPISI = path.join(DEPO, '.github/workflows/pr-kapisi.yml');
export const DAMGA_DOSYASI = path.join(WEB, '.next', 'DERLEME-ORTAMI.json');

/** Derlemeye GÖMÜLEN değişkenler. `NEXT_PUBLIC_` öneki Next.js'in kendi
    sözleşmesidir: bu önekli her değer istemci paketine yazılır.

    @param {Record<string, string | undefined>} [cevre]
    @returns {Record<string, string>} */
export function gomulenler(cevre = process.env) {
  return Object.fromEntries(
    Object.entries(cevre)
      .filter(([k]) => k.startsWith('NEXT_PUBLIC_'))
      .map(([k, v]) => [k, String(v)])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

/** Beyan · damga karşılaştırması — SAF. Kusurları ADIYLA döner. */
export function karsilastir({ beyan, damga, cevre }) {
  const kusurlar = [];
  if (!beyan) {
    kusurlar.push('BEYANSIZ TÜKETİM: iş `DERLEME_ORTAMI` beyan etmiyor.'
      + ' Paylaşılan derlemeyi hangi ortam için istediğini söylemeyen bir iş,'
      + ' yanlış ortamda derlenmiş bir çıktıyı sessizce ölçer.');
  }
  if (!damga) {
    kusurlar.push('DAMGA YOK: indirilen derlemede `DERLEME-ORTAMI.json` yok —'
      + ' artefaktın hangi ortamda üretildiği ÖLÇÜLEMEDİ.');
    return kusurlar;
  }
  if (beyan && damga.ortam !== beyan) {
    kusurlar.push(`ORTAM UYUŞMUYOR: iş "${beyan}" istiyor, artefakt "${damga.ortam}"`
      + ' ortamında üretilmiş. Beyanı farklı olan iş artefaktı tüketemez;'
      + ' kendi derlemesini yapar.');
  }
  const simdi = gomulenler(cevre);
  for (const [k, v] of Object.entries(simdi)) {
    if ((damga.gomulenler ?? {})[k] !== v) {
      kusurlar.push(`GÖMÜLÜ DEĞER FARKLI: ${k} — bu işte "${v}",`
        + ` derlemede "${(damga.gomulenler ?? {})[k] ?? '(yok)'}".`
        + ' `NEXT_PUBLIC_*` derleme anında gömülür; buradaki değer HİÇBİR'
        + ' ŞEY yapmaz ve ekran derleyenin değerini gösterir.');
    }
  }
  return kusurlar;
}

/* ── İŞ AKIŞI ÇÖZÜMLEMESİ (statik kapı) ──────────────────────────────── */

/** İş akışını iş bloklarına böler: ad → { metin, cevre }. */
export function isBloklari(isAkisiMetni) {
  const satirlar = isAkisiMetni.split('\n').filter((s) => !s.trimStart().startsWith('#'));
  const bloklar = new Map();
  let icinde = false;
  let ad = null;
  for (const ham of satirlar) {
    if (/^jobs:\s*$/.test(ham)) { icinde = true; continue; }
    if (icinde && /^[a-zA-Z]/.test(ham)) { icinde = false; ad = null; continue; }
    if (!icinde) continue;
    const m = ham.match(/^ {2}([a-z][\w-]*):\s*$/);
    if (m) { ad = m[1]; bloklar.set(ad, []); continue; }
    if (ad) bloklar.get(ad).push(ham);
  }
  const cikti = new Map();
  for (const [is, satir] of bloklar) {
    const metin = satir.join('\n');
    /* İŞ DÜZEYİ `env:` — dört boşluklu anahtar, altı boşluklu değerler. */
    const cevre = {};
    let girinti = null;
    for (const ham of satir) {
      if (/^ {4}env:\s*$/.test(ham)) { girinti = 6; continue; }
      if (girinti === null) continue;
      const g = ham.match(/^(\s*)([A-Z_][A-Z0-9_]*):\s*(.*?)\s*$/);
      if (g && g[1].length >= girinti) { cevre[g[2]] = g[3].replace(/^['"]|['"]$/g, ''); continue; }
      girinti = null;
    }
    cikti.set(is, { metin, cevre });
  }
  return cikti;
}

/** ARTEFAKT KAPISI — üreten ve tüketen işler beyanlı mı, beyanlar uyuşuyor mu. */
export function artefaktKapisi(isAkisiMetni) {
  const bloklar = isBloklari(isAkisiMetni);
  const kusurlar = [];
  const ureten = [];
  const tuketen = [];
  for (const [is, { metin, cevre }] of bloklar) {
    const yukler = /uses:\s*actions\/upload-artifact/.test(metin);
    const indirir = /uses:\s*actions\/download-artifact/.test(metin);
    const kendiDerler = /run:\s*npm run (build|demo:build)/.test(metin);
    if (yukler) ureten.push({ is, beyan: cevre.DERLEME_ORTAMI ?? null });
    if (indirir) {
      tuketen.push({ is, beyan: cevre.DERLEME_ORTAMI ?? null });
      if (kendiDerler) {
        kusurlar.push(`\`${is}\` hem artefakt indiriyor hem KENDİ derlemesini`
          + ' yapıyor — hangisini ölçtüğü belirsiz.');
      }
    }
  }
  /* GİZLİ YOL TUZAĞI. `upload-artifact@v4` NOKTAYLA başlayan yolları
     varsayılan olarak DIŞLAR ve `.next` tam olarak öyle bir yoldur.
     Ölçüldü (CI, `eb2cdeb`): bayraksız koşuda adım "No files were found
     with the provided path: web/.next" diyerek düştü. Yüksek sesle
     düşmesinin sebebi `if-no-files-found: error` idi; varsayılan `warn`
     olsaydı iş YEŞİL biter, tüketiciler boş bir artefakt indirir ve kusur
     ancak sunucu açılmayınca görünürdü. Kapı ikisini birden ister.

     Kontrol İŞ düzeyindedir: bir işte birden çok yükleme adımı varsa
     hangi adımın hangi bayrağı taşıdığını ayırmaz — bugün her işte en
     çok bir yükleme var ve bu sınır burada yazılı. */
  for (const [is, { metin }] of bloklar) {
    if (!/uses:\s*actions\/upload-artifact/.test(metin)) continue;
    const gizliYol = /^\s*(?:-\s*)?[\w./-]*\/\.[\w-]+\s*$/m.test(metin)
      || /path:\s*\S*\/\.[\w-]/.test(metin);
    if (gizliYol && !/include-hidden-files:\s*true/.test(metin)) {
      kusurlar.push(`\`${is}\` NOKTAYLA başlayan bir yol yüklüyor ama`
        + ' `include-hidden-files: true` yok — v4 o yolu sessizce dışlar.');
    }
    if (!/if-no-files-found:\s*error/.test(metin)) {
      kusurlar.push(`\`${is}\` yüklemesinde \`if-no-files-found: error\` yok —`
        + ' dosya bulunamazsa iş YEŞİL biter ve tüketici boş artefakt indirir.');
    }
  }

  for (const { is, beyan } of [...ureten, ...tuketen]) {
    if (!beyan) {
      kusurlar.push(`\`${is}\` derleme artefaktına dokunuyor ama`
        + ' `DERLEME_ORTAMI` beyan etmiyor — beyansız tüketim kırmızıdır.');
    }
  }
  /* Tüketicinin beyanı ÜRETİCİNİNKİYLE aynı olmalı; farklıysa o iş
     artefaktı tüketemez, kendi derlemesini yapar. */
  const uretilen = new Set(ureten.map((u) => u.beyan).filter(Boolean));
  for (const { is, beyan } of tuketen) {
    if (beyan && !uretilen.has(beyan)) {
      kusurlar.push(`\`${is}\` "${beyan}" ortamını istiyor ama o ortamı üreten`
        + ` bir iş yok (üretilen: ${[...uretilen].join(', ') || 'yok'}).`);
    }
  }
  return { ureten, tuketen, kusurlar };
}

/* ── CLI ─────────────────────────────────────────────────────────────── */

const dogrudan = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (dogrudan) {
  const kip = ['--damgala', '--dogrula', '--kapi'].find((k) => process.argv.includes(k));
  if (!kip) {
    console.error('Kip gerekli: --damgala · --dogrula · --kapi');
    process.exit(1);
  }

  if (kip === '--damgala') {
    const ortam = process.env.DERLEME_ORTAMI;
    if (!ortam) {
      console.error('DERLEME_ORTAMI beyan edilmeden damga yazılmaz —'
        + ' beyansız bir artefakt, tüketicisine hiçbir şey söyleyemez.');
      process.exit(1);
    }
    if (!existsSync(path.join(WEB, '.next'))) {
      console.error('`.next` yok — damga derlemeden SONRA yazılır.');
      process.exit(1);
    }
    const damga = { ortam, gomulenler: gomulenler(), yazildi: new Date().toISOString() };
    writeFileSync(DAMGA_DOSYASI, `${JSON.stringify(damga, null, 2)}\n`);
    console.log(`Derleme damgası yazıldı · ortam "${ortam}"`
      + ` · gömülü ${Object.keys(damga.gomulenler).length} değişken`);
    process.exit(0);
  }

  if (kip === '--dogrula') {
    const damga = existsSync(DAMGA_DOSYASI)
      ? JSON.parse(readFileSync(DAMGA_DOSYASI, 'utf8')) : null;
    const kusurlar = karsilastir({
      beyan: process.env.DERLEME_ORTAMI || null, damga, cevre: process.env,
    });
    if (kusurlar.length > 0) {
      console.error('DERLEME ORTAMI KIRMIZI');
      for (const k of kusurlar) console.error(`  · ${k}`);
      process.exit(1);
    }
    console.log(`Derleme ortamı doğrulandı · "${damga.ortam}"`
      + ` · gömülü ${Object.keys(damga.gomulenler ?? {}).length} değişken`);
    process.exit(0);
  }

  const { ureten, tuketen, kusurlar } = artefaktKapisi(readFileSync(PR_KAPISI, 'utf8'));
  console.log(`Derleme artefaktı · üreten ${ureten.length} · tüketen ${tuketen.length}`);
  for (const { is, beyan } of [...ureten, ...tuketen]) {
    console.log(`  ${is.padEnd(16)} ${beyan ?? 'BEYANSIZ'}`);
  }
  if (kusurlar.length > 0) {
    console.error('\nDERLEME ORTAMI KAPISI KIRMIZI');
    for (const k of kusurlar) console.error(`  · ${k}`);
    process.exit(1);
  }
  console.log('Derleme ortamı kapısı: her iş beyanlı, beyanlar uyuşuyor.');
}
