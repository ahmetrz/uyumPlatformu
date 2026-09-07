#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   POZİTİF ÖLÇÜ — SÖZLÜK EKRANA ULAŞIYOR MU?

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Bekçi (`tests/bekci/sektor-terimi.test.ts`) NEGATİF ölçüdür: dosyada
   sektör sözcüğü kaldı mı diye bakar. Kabul modelindeki boşluk şu:

     Bekçi "sektör sözcüğü kalmadı" der; "sözlükten geliyor" DEMEZ.

   Bir dosya `santral`ı çekirdek sözcük `tesis` ile SABİT değiştirirse
   bekçi yeşil yanar ve hedef ıskalanmış olur — ekran her kiracıda aynı
   sözcüğü gösterir. Ölçüldü (7 Eyl 2026): `envanter/EnvanterIstemci.tsx`
   zincir halka etiketi tam olarak böyle kaçtı. Bekçi göremedi; iki
   sözlükle ekranı açan bir sonda gördü. O sonda elle yazılmıştı ve her
   ekran için yeniden yazılması gerekiyordu.

   Bu araç o sondayı ÖLÇÜYE çevirir.

   ── ÖLÇÜM ─────────────────────────────────────────────────────────────
   Aynı rotanın render edilen metni iki sözlükle alınır (`enerji` · `su`)
   ve FARK çıkarılır. Fark satır satır hizalanır; yalnız TERİM BİÇİMLİ
   farklar sayılır — yani ayrılan satırın bir yanında enerji karşılığı,
   öbür yanında su karşılığı olanlar.

   Terim biçimi şartı gürültüyü keser: iki koşum dakikalar arayla olur ve
   saat/"3 dk önce" gibi alanlar kendiliğinden değişir. Onları saymak
   sabit çakılı bir terimi "fark var" diye gizlerdi — ölçünün tam olarak
   yakalaması gereken kusuru.

   ── İDDİA · ÇEKİRDEK SÖZCÜK AVI ───────────────────────────────────────
   İlk kurgu "çevrilmiş ailenin rotasında fark boş olamaz" idi. İlk tam
   koşumda ÜÇ yanlış alarm verdi (`/bakim` · `/api-sozlesmesi` ·
   `/yedek-parca` hiç terim taşımıyor) ve BİR açıklanabilir vaka
   (`/raporlar/kanit-paketi` — tek sözlük çağrısı boş-durum dalında,
   demo veride hiç render edilmiyor). Ölçü fazla kabaydı: "listede değil"
   ile "çevrildi" aynı şey değil, ve çevrilmiş bir ailenin terimi koşula
   bağlı bir dalda olabilir.

   Keskin sinyal başka: ENERJİ sözlüğü kuruluyken ekranda ÇEKİRDEK
   SÖZCÜK ("tesis" · "birim") görünmesi. Sözlükten beslenen hiçbir yer
   enerji altında çekirdek sözcüğü yazamaz — yazıyorsa o yer SABİT
   ÇAKILIDIR. Koşula bağlı dallar hiç render edilmedikleri için yanlış
   alarm üretmez; hiç terim taşımayan rota da sessiz kalır.

   Bu kurgu ilk koşumunda iki gerçek bulgu verdi (ikisi de aşağıda) ve
   sıfır yanlış alarm üretti — bu yüzden seçildi.

   · Çevrilmiş ailede çekirdek sözcük → KUSUR.
   · Çevrilmemiş ailede → BİLGİ; gelecek dilimin işi, kapı kırmızı olmaz.
   · Fark SAYISI her rotada yazılır: bir ailede beklenen 6 yerde 4 fark
     çıkıyorsa iki yer kaçmış demektir. Sayıyı kapı değil insan okur —
     tam kaçağı otomatik yakalayan şey modül sabitlerinin kendi
     vakalarıdır (`tests/envanter-mantik.test.ts`).

   ── "AİLE ÇEVRİLDİ Mİ" ELLE TUTULMAZ ──────────────────────────────────
   Rota başına bayrak tutmak, unutulacak ikinci bir liste olurdu. İki
   kaynaktan TÜRETİLİR, ikisi de kendiliğinden güncellenir:

     1. Ailenin bir dosyası izin listesinden ÇIKARILMIŞSA (git geçmişi) —
        yani bir zaman kirliydi, artık değil: çevrilmiştir.
     2. Ya da ailenin bir dosyası sözlüğü ÇAĞIRIYORSA (`useTerim` ·
        `lib/dil/terimler`).

   "Listede değil" TEK BAŞINA yetmez: `/bakim` hiç sektör sözcüğü
   taşımamıştı, çevrilmedi — hakkında söylenecek bir şey yok. İlk kurgu
   bu ayrımı yapmıyordu ve üç rotada yanlış alarm verdi.

   Ayrıca izin listesinde SÖZLÜKLE İFADE EDİLEBİLİR terim ayrımı yapılır:
   `MW` · `JES` · `türbin` · `--hes` sözlükte YOKTUR, öznitelik/şema
   işidir (P1'in öbür ekseni) ve bir aileyi "çevrilmedi" saydırmaz.
   `envanter/Yonetisim.tsx` yalnız `MW` yüzünden listede duruyor;
   `/envanter` yine de çevrilmiş sayılır.

   "Sözlükle ifade edilebilir" ayrımı önemli: `MW`, `JES`, `türbin`,
   `--hes` sözlükte YOKTUR — bunlar öznitelik/şema işidir (P1'in öbür
   ekseni) ve sözlüğün ekrana ulaşıp ulaşmadığı sorusunu bloke etmez.
   `envanter/Yonetisim.tsx` yalnız `MW` yüzünden listede duruyor;
   `/envanter` yine de bu iddiaya girer.

   Kullanım:
     PORT=3210 node arac/sozluk-farki.mjs --rota=/envanter
     PORT=3210 node arac/sozluk-farki.mjs --rota=/uyum --bekle=/uyum:4
     PORT=3210 node arac/sozluk-farki.mjs              (tüm küme)
   ═══════════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { db } from '../lib/db.ts';
import { CEKIRDEK_TERIMLER } from '../lib/dil/terimler';
import { WEB, rotalarOku } from './kosu-ortak.mjs';
import { SOZLUKLER, sozlukleKos } from './sozluk-takas.mjs';
import { kanonik, katlamaliVarMi, sinirKalibi } from './turkce-arama.mjs';
import { rotaDizinleri } from './rota-dizini.mjs';
import { sozluklesebilirTerimliDosyalar } from './izin-listesi.mjs';

/* Karşılaştırılan iki sözlük. `stres` DIŞARIDA: gövdesi boşluksuz uydurma
   bir dizedir, düzen sınavı içindir; buradaki soru "sözcük değişiyor mu",
   onun için iki GERÇEK sektör yeter. */
const A = 'enerji';
const B = 'su';

/* Sözlük satırları veritabanı biçiminde gelir (dizi); anahtar → karşılık
   haritasına burada çevrilir. */
function haritala(satirlar) {
  const h = {};
  for (const s of satirlar) {
    h[s.anahtar] = Object.entries(s)
      .filter(([k, v]) => k !== 'anahtar' && typeof v === 'string' && v.length >= 3)
      .map(([, v]) => v);
  }
  return h;
}
const KARSILIK = { [A]: haritala(SOZLUKLER[A]), [B]: haritala(SOZLUKLER[B]) };

const kacir = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* AVLANAN ÇEKİRDEK SÖZCÜKLER: yalnız enerji sözlüğünün çekirdekten
   AYRILDIĞI anahtarlar. Ayrılmayan bir anahtarda çekirdek sözcüğü görmek
   hiçbir şey söylemez — sözlük de aynı sözcüğü yazardı. */
const AVLANAN = Object.entries(CEKIRDEK_TERIMLER)
  .filter(([anahtar]) => {
    const e = KARSILIK[A][anahtar];
    return e && !e.includes(CEKIRDEK_TERIMLER[anahtar].tekil);
  })
  .map(([anahtar, terim]) => ({
    anahtar,
    kaliplar: Object.values(terim).filter((x) => typeof x === 'string')
      .map((f) => sinirKalibi(kacir(kanonik(f)), 'u')),
    /* Uzun karşılık önce silinsin: "enerji portföyü" silinmeden
       "portföy" silinirse geriye "enerji ü" kalır ve iz kaybolur. */
    sektor: [...KARSILIK[A][anahtar]]
      .sort((x, y) => y.length - x.length)
      .map((f) => sinirKalibi(kacir(kanonik(f)), 'gu')),
  }));

/* VERİ İÇİNDEKİ çekirdek sözcük çakılı DEĞİLDİR.

   Ölçüldü: `/varlik-aktarim` ekranında "sahabjes-yardimci-tesis.csv"
   dosya adı `tesis` taşıyor ve av onu çakılı sandı. Dosya adı KULLANICI
   VERİSİDİR; sözlükten beslenmez ve beslenmemeli — kayıt neyse odur.

   Ayırt eden şey komşu karakter: sözcüğün hemen yanında `-` `.` `/` `_`
   varsa o bir tanımlayıcı/dosya adı parçasıdır, cümle içindeki sözcük
   değil. Bekçinin `--hes` (CSS jetonu) ile sıradan sözcüğü ayırdığı
   ayrımın aynısı. */
const VERI_KOMSUSU = /[-./_]/;

/** Enerji render'ında çekirdek sözcük taşıyan satırlar — SABİT ÇAKILI yerler.

    Sektör karşılığı ÖNCE satırdan silinir. Sebep ölçüldü: enerji
    karşılığı "enerji portföyü" ve içinde çekirdek "portföyü" GEÇİYOR —
    doğrudan aramak, doğru çalışan bir yeri çakılı sanardı. Silip kalanda
    aramak aynı satırda hem doğru hem çakılı yer olması hâlini de doğru
    çözer: doğru olan silinir, çakılı olan kalır. */
function cakiliSatirlar(metin) {
  const bulgu = [];
  for (const ham of metin.split('\n')) {
    for (const { anahtar, kaliplar, sektor } of AVLANAN) {
      let kalan = kanonik(ham);
      for (const re of sektor) kalan = kalan.replace(re, ' ');
      const vuran = kaliplar.map((re) => {
        const g = new RegExp(re.source, 'gu');
        const m = g.exec(kalan);
        if (!m) return null;
        const onceki = kalan[m.index - 1] ?? ' ';
        const sonraki = kalan[m.index + m[0].length] ?? ' ';
        /* Dosya adı / tanımlayıcı parçasıysa VERİDİR, çakılı değil. */
        return VERI_KOMSUSU.test(onceki) || VERI_KOMSUSU.test(sonraki) ? null : m;
      }).filter(Boolean);
      if (vuran.length > 0) {
        bulgu.push({ anahtar, satir: ham.trim() });
        break;
      }
    }
  }
  return bulgu;
}

/** Bir satır bu sözlüğün karşılıklarından birini taşıyor mu. */
function terimliMi(satir, harita) {
  for (const formlar of Object.values(harita)) {
    for (const f of formlar) {
      if (katlamaliVarMi(new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), satir)) return true;
    }
  }
  return false;
}

/** İki metnin TERİM BİÇİMLİ fark satırları. */
function terimFarklari(a, b) {
  const sa = a.split('\n');
  const sb = b.split('\n');
  const farklar = [];
  const n = Math.max(sa.length, sb.length);
  for (let i = 0; i < n; i += 1) {
    const x = sa[i] ?? '';
    const y = sb[i] ?? '';
    if (x === y) continue;
    if (terimliMi(x, KARSILIK[A]) || terimliMi(y, KARSILIK[B])) {
      farklar.push({ a: x.trim(), b: y.trim() });
    }
  }
  return farklar;
}

/* ── BEKLENEN FARK ─────────────────────────────────────────────────────
   `--bekle=/rota:N,...` — o rotada EN AZ kaç terim farkı beklendiği.

   Niçin: "çakılı 0" sözcüğün SABİT olmadığını söyler, ekrana ULAŞTIĞINI
   değil. 16 dosyalık bir aile çevrilip ekranda 4 fark çıkıyorsa soru
   şudur: 4 doğru mu, yoksa iki yer kaçtı mı? Sayıyı yazmadan bu soru
   sorulamaz. Beklenti aileyi çeviren kişinin ölçümüdür — kaç ekran
   noktasının sözlükten beslendiğini o bilir.

   Ölçülen beklenenin ALTINDAysa kusur: bir yer kaçmış ya da koşula bağlı
   bir dalda kalmış. ÜSTÜNDEyse kusur değil — beklenti güncellenir. */
const bekleArg = process.argv.find((a) => a.startsWith('--bekle='));
/* Kayıtlı beklentiler: aile kapanırken ölçülen sayı buraya yazılır ve
   bundan sonra HER koşumda denetlenir. CLI bayrağı üzerine yazar. */
const KAYITLI = JSON.parse(
  readFileSync(path.join(WEB, 'arac', 'beklenen-fark.json'), 'utf8')).rotalar;
const BEKLENEN = new Map(Object.entries(KAYITLI));
for (const [r, n] of (
  (bekleArg ? bekleArg.slice('--bekle='.length).split(',') : [])
    .map((x) => x.split(':'))
    .filter(([r, n]) => r && n)
    .map(([r, n]) => [r.trim(), Number(n)]))) BEKLENEN.set(r, n);

const rotaArg = process.argv.find((a) => a.startsWith('--rota='));
const istenen = rotaArg
  ? rotaArg.slice('--rota='.length).split(',').map((r) => r.trim()).filter(Boolean)
  : rotalarOku().map((r) => (typeof r === 'string' ? r : r.yol))
    .filter((r) => r !== undefined).map((r) => (r === '' ? '/' : r));

/* ── AİLE ÇEVRİLDİ Mİ · iki kaynaktan türetilir ───────────────────────── */
const izinListesi = JSON.parse(
  readFileSync(path.join(WEB, 'tests/bekci/sektor-terimi-izin.json'), 'utf8')).dosyalar;
const kirli = sozluklesebilirTerimliDosyalar(izinListesi);

/* (1) Bir zaman listedeydi, artık değil — git geçmişinden. */
const cikarilan = new Set();
try {
  const gecmis = execFileSync('git',
    ['log', '--all', '-p', '--', 'web/tests/bekci/sektor-terimi-izin.json'],
    { cwd: path.join(WEB, '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  for (const satir of gecmis.split('\n')) {
    const m = /^-\s*"(.+?)",?$/.exec(satir.trim());
    if (m) cikarilan.add(m[1]);
  }
} catch {
  console.warn('  (git geçmişi okunamadı — çevrilmişlik yalnız sözlük çağrısından)');
}

/* (2) Ya da sözlüğü çağırıyor. */
const sozlukCagiran = new Set();
try {
  const cikti = execFileSync('grep',
    ['-rl', '-e', 'useTerim', '-e', 'dil/terimler', 'app', 'lib'],
    { cwd: WEB, encoding: 'utf8' });
  for (const y of cikti.split('\n')) if (y) sozlukCagiran.add(y);
} catch { /* eşleşme yoksa grep 1 döner */ }

const dizinler = rotaDizinleri();
function aileDurumu(rota) {
  const kok = dizinler.get(rota === '' ? '/' : rota);
  if (!kok) return { kok: null, cevrildi: false, kirliMi: false };
  const on = `${kok}/`;
  return {
    kok,
    kirliMi: kirli.some((d) => d.startsWith(on)),
    cevrildi: [...cikarilan].some((d) => d.startsWith(on))
      || [...sozlukCagiran].some((d) => d.startsWith(on)),
  };
}

const gecici = mkdtempSync(path.join(tmpdir(), 'sozluk-farki-'));
const dosya = (ad) => path.join(gecici, `${ad}.json`);

console.log(`sozluk-farki: ${istenen.length} rota · ${A} ↔ ${B}`
  + ` · avlanan anahtar ${AVLANAN.map((x) => x.anahtar).join('/') || '(yok)'}\n`);

try {
  for (const ad of [A, B]) {
    const komut = ['node', 'arac/sozluk-metni.mjs',
      `--rota=${istenen.join(',')}`, `--cikti=${dosya(ad)}`];
    const { kod, dogrulama } = await sozlukleKos(ad, komut, { yakala: true });
    if (kod !== 0) throw new Error(`${ad} sözlüğüyle metin yakalanamadı (çıkış ${kod})`);
    console.log(`  yakalandı: ${ad.padEnd(7)} 'tesis'="${dogrulama ?? '(yok)'}"`);
  }

  const ma = JSON.parse(readFileSync(dosya(A), 'utf8'));
  const mb = JSON.parse(readFileSync(dosya(B), 'utf8'));

  const kusurlar = [];   // sözcük çakılı — bekçinin göremediği kusur
  const eksikler = [];   // beklenen fark sayısına ulaşılmadı
  const bilgiler = [];
  console.log('');
  for (const rota of istenen) {
    const yol = rota === '' ? '/' : rota;
    const a = ma[yol] ?? '';
    const b = mb[yol] ?? '';
    if (a.startsWith('__HATA__') || b.startsWith('__HATA__')) {
      kusurlar.push(`${yol}: rota açılmadı — ${a.startsWith('__HATA__') ? a : b}`);
      continue;
    }
    const { cevrildi, kirliMi } = aileDurumu(yol);
    const farklar = terimFarklari(a, b);
    const cakili = cakiliSatirlar(a);
    const etiket = cevrildi ? (kirliMi ? 'çevrildi (şema kaldı)' : 'çevrildi') : 'çevrilmedi';
    const bekle = BEKLENEN.get(yol);
    const bekleSoz = bekle === undefined
      ? ''
      : farklar.length >= bekle ? ` (≥${bekle} ✓)` : ` (BEKLENEN ${bekle} — EKSİK)`;
    console.log(`  ${yol.padEnd(26)} ${etiket.padEnd(21)}`
      + ` ${farklar.length} fark${bekleSoz}${cakili.length ? ` · ${cakili.length} ÇAKILI` : ''}`);
    if (bekle !== undefined && farklar.length < bekle) {
      eksikler.push(`${yol}: ${bekle} fark bekleniyordu, ${farklar.length} ölçüldü —`
        + ' bir yer sözlüğe bağlanmamış ya da koşula bağlı bir dalda kalmış.');
    }
    for (const f of farklar.slice(0, 4)) console.log(`      ${f.a}  →  ${f.b}`);
    if (farklar.length > 4) console.log(`      … +${farklar.length - 4} fark daha`);
    for (const c of cakili) {
      const satir = `${yol} · '${c.anahtar}' çekirdek sözcükte: "${c.satir.slice(0, 70)}"`;
      if (cevrildi) kusurlar.push(satir);
      else bilgiler.push(satir);
    }
  }

  if (bilgiler.length > 0) {
    console.log('\nBİLGİ — çevrilmemiş ailede çekirdek sözcük (gelecek dilimin işi):');
    for (const b of bilgiler) console.log(`  ${b}`);
  }
  if (kusurlar.length > 0) {
    console.error('\nKUSUR — ÇEVRİLMİŞ ailede sözcük SABİT ÇAKILI (bekçi bunu göremez):');
    for (const k of kusurlar) console.error(`  ${k}`);
  }
  if (eksikler.length > 0) {
    console.error('\nEKSİK — beklenen fark sayısına ulaşılmadı:');
    for (const e of eksikler) console.error(`  ${e}`);
  }
  console.log(`\nsozluk-farki: ${istenen.length} rota · çakılı ${kusurlar.length}`
    + ` · eksik ${eksikler.length} · bilgi ${bilgiler.length}`);
  await db.$disconnect();
  process.exit(kusurlar.length + eksikler.length > 0 ? 1 : 0);
} finally {
  rmSync(gecici, { recursive: true, force: true });
}
