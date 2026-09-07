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
import { readFileSync, writeFileSync } from 'node:fs';
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
       `'tesis'` bir ekran metni değil, anahtarın kendisidir.

    3. MODEL ADI ALANLARININ DEĞERLERİ atlanır — R0-9, YAPISAL olarak.
       `varlikTipi` (`AktiviteKaydi`) ve `kaynakTipi`
       (`VeriKalitesiBulgusu` · köken kayıtları) SAKLANIR ve değerleri
       Prisma MODEL adıdır (`'Varlik'` · `'MaddeDurumu'` · `'Tesis'` …);
       depodaki 280+ geçişin hepsi böyle. Değişmez kayda kiracıya göre
       değişen sözcük gömülemez, yani buradaki `'Tesis'` çakılı olmak
       ZORUNDA.

       Kural KONUMLUDUR, küme değil: aynı dosyada `baslik: 'Tesis'` bir
       EKRAN etiketidir ve yakalanmaya devam eder (`lib/eylemler2/
       yonetim.ts` ikisini birden taşıyor). Kümeye atsaydık ikincisi de
       sessizce kaybolurdu. */
const IZ_ALANI = /\b(?:varlikTipi|kaynakTipi)\s*(?::|={2,3}|!={1,2})\s*$/;

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
    if (IZ_ALANI.test(kaynak.slice(Math.max(0, m.index - 40), m.index))) continue;
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

/** Eşleşme bir TANIMLAYICI parçası mı, yoksa ekran metni mi?

    ── NİÇİN KOMŞU KARAKTERE BAKILIYOR ───────────────────────────────────
    Prozanın içinde dosya adı ve nitelikli ad geçer: `sahabjes-yardimci-
    tesis.csv`, `Connector.kapsamTesisleriJson`, `/tesisler/${id}`. Bunlar
    ekranda "tesis" sözcüğü DEĞİLDİR; kiracıya göre değişmezler.

    ── EKSİK KALAN HÂL (ölçüldü) ─────────────────────────────────────────
    İlk kural komşuda `- . _ /` görünce ATLIYORDU ve bu, gerçek ekran
    metnini kaçırıyordu: `"Bu tesis/süreç kapsamında doğrulama yetkiniz
    yok"` (`lib/eylemler2/uyumSahiplik.ts`, iki mesaj). Türkçede eğik
    çizgi bir SEÇENEK bağıdır ("tesis/süreç" = "tesis ya da süreç"), yol
    ayracı değil. Kural olduğu gibi kalsaydı bu iki mesaj sınıf
    taramasının kalıcı kör noktası olurdu.

    ── AYIRT EDİCİ ───────────────────────────────────────────────────────
    1. Eşleşmeyi çevreleyen BOŞLUKSUZ koşu `.` ya da `_` taşıyorsa
       tanımlayıcıdır (uzantı, nitelikli ad, snake_case).
    2. Komşu `-` ise tanımlayıcıdır (slug: `yardimci-tesis`).
    3. Komşu `/` ise: çizginin ÖTESİ harfse seçenek bağıdır (proza);
       değilse yol ayracıdır (`/tesisler/`).
    4. Başka her hâl ekran metnidir. */
export function tanimlayiciMi(metin, bas, uzunluk) {
  const son = bas + uzunluk;
  let sol = bas; while (sol > 0 && !/\s/.test(metin[sol - 1])) sol -= 1;
  let sag = son; while (sag < metin.length && !/\s/.test(metin[sag])) sag += 1;
  if (/[._]/.test(metin.slice(sol, sag))) return true;
  const once = metin[bas - 1] ?? ' ';
  const sonra = metin[son] ?? ' ';
  if (once === '-' || sonra === '-') return true;
  if (once === '/' && !/\p{L}/u.test(metin[bas - 2] ?? ' ')) return true;
  if (sonra === '/' && !/\p{L}/u.test(metin[son + 1] ?? ' ')) return true;
  return false;
}

const ATLA = [`${path.sep}dil${path.sep}`, `prisma${path.sep}`, `tests${path.sep}`,
  `arac${path.sep}`, `${path.sep}prisma-client${path.sep}`];

/* Gerekçeli muafiyetler — çekirdek sözcüğün DOĞRU olduğu yerler
   (R0-8 · R0-9 · kod anahtarı · ölçü birimi). Ölü kayıt kırmızı verir.

   ── İKİ BİRİM: DOSYA ve DİZE ──────────────────────────────────────────
   Kayıt bir DİZE ise bütün dosya muaftır; sebep dosya düzeyinde geçerli
   demektir (bütün bir sözleşme modülü, bütün bir saklanan artefakt).
   Kayıt `{ sebep, dizeler }` ise YALNIZ o dizeler muaftır ve dosyanın
   geri kalanı taranmaya devam eder.

   İkinci biçim ölçümden çıktı: `disaAktarim.ts` bir R0-8 sınırı taşıyor
   (zod, oturumdan ÖNCE koşuyor — dosyanın kendi denetim gerekçesi) ama
   dosyanın geri kalanı sıradan sunucu eylemi. Dosyayı bütün muaf etmek,
   bir satırlık gerçek bir sebeple 200 satırı kör etmek olurdu. */
const TABAN = 'cekirdek-sozcuk-taban.json';
const MUAFIYET = JSON.parse(
  readFileSync(path.join(WEB, 'arac', 'cekirdek-sozcuk-muafiyet.json'), 'utf8')).dosyalar;

/** Dosyanın TAMAMI muaf mı? (kayıt dize ise evet) */
const dosyaMuaf = (yol) => typeof MUAFIYET[yol] === 'string';
/** Bu dize muaf mı? Eşleşme TAM: `includes` olsaydı kısa bir kayıt
    ("Birim") uzun kardeşini ("Birim en fazla 16 karakter") yutar ve ölü
    kayıt algılaması sessizce yanlış konuşurdu. Muafiyet dar olmalı. */
function dizeMuaf(yol, metin) {
  const kayit = MUAFIYET[yol];
  if (!kayit || typeof kayit === 'string') return null;
  const s = metin.trim();
  return kayit.dizeler.find((d) => s === d) ?? null;
}

/* Test dosyası bu modülü İMPORT eder; taramanın kendisi yalnız doğrudan
   çalıştırıldığında koşar. Aksi hâlde her test koşumu 500 dosya tarardı. */
const DOGRUDAN = process.argv[1]?.endsWith('cekirdek-sozcuk-taramasi.mjs');

const bulgular = [];
const muafKullanildi = new Set();
if (DOGRUDAN) {
for (const gorece of taranacakDosyalar()) {
  if (!/\.(ts|tsx)$/.test(gorece)) continue;
  if (ATLA.some((x) => gorece.includes(x.replace(/\\/g, '/')))) continue;
  if (dosyaMuaf(gorece)) { muafKullanildi.add(gorece); continue; }
  const kaynak = yorumsuz(readFileSync(path.join(WEB, gorece), 'utf8'));
  for (const parca of metinParcalari(kaynak)) {
    const k = kanonik(parca);
    for (const { anahtar, formlar } of ARANAN) {
      for (const form of formlar) {
        const re = sinirKalibi(kanonik(form).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u');
        const m = re.exec(k);
        if (!m) continue;
        if (tanimlayiciMi(k, m.index, m[0].length)) continue;
        const muafDize = dizeMuaf(gorece, parca);
        if (muafDize !== null) { muafKullanildi.add(`${gorece}\u0000${muafDize}`); break; }
        bulgular.push({ dosya: gorece, anahtar, form, metin: parca.trim().slice(0, 72) });
        break;
      }
    }
  }
}

}

/* `--taban`: ölçümü taban dosyasına yazar. Sayı DÜŞTÜĞÜNDE çalıştırılır;
   yükseldiğinde çalıştırmak cırcırı delmek olur — test zaten kırmızı
   yanar ve önce sebep düzeltilir. */
if (DOGRUDAN && process.argv.includes('--taban')) {
  const dosyalar = {};
  for (const b of bulgular) dosyalar[b.dosya] = (dosyalar[b.dosya] ?? 0) + 1;
  const eski = JSON.parse(readFileSync(path.join(WEB, 'arac', TABAN), 'utf8'));
  writeFileSync(path.join(WEB, 'arac', TABAN), `${JSON.stringify({
    '//': eski['//'],
    toplam: bulgular.length,
    dosyalar: Object.fromEntries(Object.entries(dosyalar).sort()),
  }, null, 2)}\n`);
  console.log(`taban güncellendi: ${eski.toplam} → ${bulgular.length}`);
} else if (DOGRUDAN && process.argv.includes('--json')) {
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
  /* Beklenen kayıtlar: dosya muafiyeti bir, dize muafiyeti dizesi kadar. */
  const beklenen = Object.entries(MUAFIYET).flatMap(([d, k]) => (typeof k === 'string'
    ? [d] : k.dizeler.map((x) => `${d}\u0000${x}`)));
  console.log(`\ncekirdek-sozcuk: ${bulgular.length} bulgu · ${dosyaBasina.size} dosya`
    + ` · ${muafKullanildi.size}/${beklenen.length} muafiyet kullanıldı`);

  /* ÖLÜ MUAFİYET: dosya artık yok, dize artık geçmiyor ya da içinde
     çekirdek sözcük kalmadı. Elle tutulan liste sessizce bayatlar. */
  const olu = beklenen.filter((d) => !muafKullanildi.has(d));
  if (olu.length > 0) {
    console.error('\nÖLÜ MUAFİYET — dosya taranmıyor ya da artık çekirdek sözcük taşımıyor:');
    for (const d of olu) console.error(`  ${d.replace('\u0000', '  →  ')}`);
    console.error('  Kaydı düşürün; gereksiz muafiyet kapının kör noktasıdır.');
    process.exit(1);
  }
}
