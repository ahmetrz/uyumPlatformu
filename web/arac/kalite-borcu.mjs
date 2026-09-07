#!/usr/bin/env node
/* Kalite borcu izin listesinin OKUNMASI ve CIRCIRIN koşulması.

   Kararların kendisi `kalite-kurallari.mjs` içindedir ve tarayıcısız
   test edilir (`borcSuzgeci`, `circirKarari`); burada yalnız dosya ve
   git okuması ile raporlama vardır. Ayrım o dosyanın başındaki
   gerekçenin aynısıdır.

   Bu modülü `yatay-tasma.mjs` ve `erisim-axe.mjs` kullanır; ikisi de
   ham bulgularını ortak biçime çevirip `borcuUygula`ya verir. */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { WEB } from './kosu-ortak.mjs';
import { borcAnahtari, borcSuzgeci, ciMi, circirKarari } from './kalite-kurallari.mjs';

export const BORC_YOLU = path.join(WEB, 'arac', 'kalite-borcu.json');
/* Taban DALIN KENDİSİ DEĞİL: dalın kendi eklemesi kendini
   meşrulaştıramaz. Yerelde varsayılan `origin/main`'dir; CI bunu
   `KALITE_TABAN_DAL` ile PR'ın BASE COMMIT'ine sabitler — `origin/main`
   hareketli bir uçtur ve PR'ın merge ref'i kurulduktan sonra main
   ilerleyip bir satırı silerse, dalın değişmemiş listesi "eklenmiş"
   görünüp yanlış kırmızı üretirdi. Değişken bir dal adı ya da bir SHA
   alır; dişlerin ISIRDIĞINI denemek için de kullanılır. */
export const TABAN_DAL = process.env.KALITE_TABAN_DAL || 'origin/main';
/** Depo kökünden yol — `git show <dal>:<yol>` bunu ister. */
const BORC_GIT_YOLU = 'web/arac/kalite-borcu.json';

/** `--circir-atla="gerekçe"` — yalnız YERELDE geçerli (DİŞ 4). */
function atlamaGerekcesi(argv) {
  const a = (argv ?? process.argv).find((x) => x.startsWith('--circir-atla='));
  return a ? a.slice('--circir-atla='.length).trim() : null;
}

/* ── LİSTE MODÜL SEVİYESİNDE OKUNUR ────────────────────────────────
   Okuma `borcuUygula` içinde, çağrı anında yapılıyordu ve bu bir kaçış
   yolu bırakıyordu — ölçüldü: liste silinince kapı gerçekten kırmızı
   yanıyordu, ama (a) ham bir ENOENT yığın iziyle, (b) tarayıcı
   koşusunun 90 saniyesi harcandıktan SONRA.

   Asıl tehlike ölçülüp elendi: taban dalda liste yok + çalışma ağacında
   liste yok kombinasyonu "İLK KURULUM" diye OKUNMUYOR, çünkü okuma
   `tabanBorcOku`dan önce patlıyor. Ama bu, iki satırın SIRASINA bağlı
   bir güvenceydi; sıra değişirse liste silmek kalıcı bir kaçış olurdu.

   Şimdi güvence sıradan değil YAPIDAN geliyor: liste modül seviyesinde
   okunur, yani bu modülü içe aktaran her yol — kapılar, testler — liste
   okunamıyorsa daha ilk satırda düşer. Liste yoksa HİÇBİR bulgu muaf
   değildir ve kapı zaten kırmızı olmalıdır; listeyi silmek kapıyı
   susturmaz, kapının kendisini yıkar. */
function listeyiOku(yol) {
  const kunye = path.relative(path.dirname(WEB), yol);
  const patla = (sebep) => {
    throw new Error(
      `BORÇ LİSTESİ OKUNAMADI · ${kunye}\n`
      + '  Liste yoksa HİÇBİR bulgu muaf değildir ve kapı zaten kırmızı\n'
      + '  olmalıdır. Listeyi silmek bir kaçış yolu DEĞİLDİR: bu dosya\n'
      + '  kapının parçasıdır, muafiyet defteri değil.\n'
      + `  Sebep: ${sebep}`,
    );
  };
  let ham;
  try {
    ham = readFileSync(yol, 'utf8');
  } catch (e) {
    patla(`dosya okunamadı — ${e.code ?? e.message}`);
  }
  let belge;
  try {
    belge = JSON.parse(ham);
  } catch (e) {
    patla(`JSON ayrıştırılamadı — ${e.message}`);
  }
  /* `bulgular` yoksa sessizce boş listeye düşmek, bozuk bir dosyayı
     "borç yok" diye okumak olurdu — bozukluk kusur gibi görünmeli. */
  if (!Array.isArray(belge?.bulgular)) patla('`bulgular` dizisi yok');
  /* `_yeni_tur` bir kusur TÜRÜNÜN ilk kez ölçülmeye başladığını
     BEYAN eder (bkz. `circirKarari`). Yoksa boş liste demektir; bozuk
     yazılmışsa sessizce yutulmaz. */
  const yeniTurler = belge?._yeni_tur ?? [];
  if (!Array.isArray(yeniTurler)) patla('`_yeni_tur` bir dizi değil');
  return { bulgular: belge.bulgular, yeniTurler };
}

const BELGE = listeyiOku(BORC_YOLU);

/** Bu daldaki borç listesi. Modül yüklenirken okunur; okunamazsa atar. */
export const BORC = BELGE.bulgular;

/** Bu dalın BEYAN ettiği yeni kusur türleri (`kapi/tur`). */
export const YENI_TURLER = BELGE.yeniTurler;

/** Test ve araçlar için: başka bir yoldan da okunabilir, aynı sertlikle. */
export function borcOku(yol = BORC_YOLU) {
  return yol === BORC_YOLU ? BORC : listeyiOku(yol).bulgular;
}

/**
 * Taban dalın listesi. Üç ayrı sonuç döner ve AYRIMI ÖNEMLİDİR:
 *   { durum: 'var',   bulgular }  — karşılaştırılabilir
 *   { durum: 'kurulum' }          — taban dal ERİŞİLEBİLİR ama listeyi
 *                                   henüz taşımıyor; ilk kurulum commit'i.
 *                                   Cırcırın karşılaştıracağı bir geçmiş
 *                                   yoktur, bu yüzden bu tur muaftır.
 *   { durum: 'okunamadi' }        — taban dalın KENDİSİ yok (sığ klon,
 *                                   fetch edilmemiş remote). DİŞ 4.
 * İkisini bir arada "okunamadı" saymak, listeyi silmeyi de sığ klonu da
 * aynı torbaya atardı; ilki muaf olmamalı, ikincisi CI'da kırmızıdır.
 */
export function tabanBorcOku() {
  try {
    execFileSync('git', ['rev-parse', '--verify', `${TABAN_DAL}^{commit}`], {
      cwd: WEB, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'],
    });
  } catch {
    return { durum: 'okunamadi' };
  }
  /* YOKLUK ile OKUNAMAMA ayrı sorulur. Tek bir `try` ile sorulsaydı,
     tabandaki blob'un BOZUK olması da "ilk kurulum" sayılırdı ve DİŞ 4
     sessizce devre dışı kalırdı: bozuk bir taban listesi commit'lemek,
     cırcırı kalıcı olarak muaf yapardı. */
  try {
    execFileSync('git', ['cat-file', '-e', `${TABAN_DAL}:${BORC_GIT_YOLU}`], {
      cwd: WEB, stdio: ['ignore', 'ignore', 'ignore'],
    });
  } catch {
    return { durum: 'kurulum' };  // yol tabanda YOK — listeyi kuran commit
  }
  try {
    const ham = execFileSync('git', ['show', `${TABAN_DAL}:${BORC_GIT_YOLU}`], {
      cwd: WEB, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const belge = JSON.parse(ham);
    /* Taban daldaki liste BOZUKSA muafiyet üretemez: `?? []` deseydik
       bozuk bir taban, dalın her eklemesini "yeni değil" gösterirdi. */
    if (!Array.isArray(belge?.bulgular)) return { durum: 'okunamadi' };
    /* Tabanın BEYANI da okunur: yeni tür kapısı yalnız taban o türü
       HENÜZ beyan etmemişken açılır (aşağıda). Bozuk beyan muafiyet
       üretmemeli, o yüzden dizi değilse taban okunamadı sayılır. */
    const tabanTurler = belge?._yeni_tur ?? [];
    if (!Array.isArray(tabanTurler)) return { durum: 'okunamadi' };
    return { durum: 'var', bulgular: belge.bulgular, yeniTurler: tabanTurler };
  } catch {
    /* Yol VAR ama okunamadı ya da ayrıştırılamadı → DİŞ 4. */
    return { durum: 'okunamadi' };
  }
}

function satir(b) {
  /* Hedef kimliği anahtarın parçasıdır; raporda GÖRÜNMELİ, yoksa
     "hangi hedef ötekinin yerine geçti" sorusu çıktıdan okunamaz. */
  return `${b.kapi} · ${b.tur} · ${b.rota} · ${b.bant}px · ${b.hedef ?? '‹hedefsiz›'}`;
}

/**
 * Kapının son kararı. `bulgular` ortak biçimdedir:
 *   { kapi, tur, rota, bant, olcum, birim, not? }
 * @returns {boolean} kapı kapalı mı (true → çıkış kodu 1)
 */
export function borcuUygula(bulgular, { kapi, yaz = console.error, bilgi = console.log } = {}) {
  const dalBorcu = BORC.filter((b) => !kapi || b.kapi === kapi);
  const s = borcSuzgeci(bulgular, dalBorcu);

  /* ── DİŞ 3 + DİŞ 4 · taban dal karşılaştırması ───────────────────── */
  const taban = tabanBorcOku();
  const ciDe = ciMi(process.env.CI);
  const gerekce = atlamaGerekcesi();
  let circir = { eklenen: [], yukseltilen: [], kapiKapali: false };
  let circirNotu = null;

  if (taban.durum === 'okunamadi') {
    if (ciDe) {
      yaz(`\nDİŞ 4 · CIRCIR OKUNAMADI — taban ${TABAN_DAL}`);
      yaz('  Ya taban commit\'i bu klonda yok, ya da listesi okunamıyor /');
      yaz('  ayrıştırılamıyor. CI\'da ikisi de KIRMIZIDIR: karşılaştırılamayan');
      yaz('  bir izin listesi, listenin büyümediğini KANITLAMAZ.');
      yaz('  Gereken: actions/checkout `fetch-depth: 0` + taban commit fetch\'i.');
      return true;
    }
    if (!gerekce) {
      yaz(`\nDİŞ 4 · CIRCIR OKUNAMADI — taban ${TABAN_DAL}`);
      yaz('  Yerelde atlamak için GEREKÇE gerekir:');
      yaz('    --circir-atla="taban dal bu klonda yok"');
      return true;
    }
    circirNotu = `atlandı (yerel) · gerekçe: ${gerekce}`;
    bilgi(`\ncırcır ATLANDI (yerel) · gerekçe: ${gerekce}`);
  } else if (taban.durum === 'kurulum') {
    /* Taban dal erişilebilir ama listeyi henüz taşımıyor: bu, listeyi
       KURAN commit'tir ve karşılaştıracağı bir geçmiş yoktur. Bir sonraki
       turdan itibaren diş çalışır. */
    circirNotu = 'ilk kurulum';
    bilgi(`\ncırcır: ${TABAN_DAL} listeyi henüz taşımıyor — İLK KURULUM turu`);
  } else {
    circir = circirKarari(
      dalBorcu,
      taban.bulgular.filter((b) => !kapi || b.kapi === kapi),
      { dal: YENI_TURLER, taban: taban.yeniTurler },
    );
    if (circir.yeniTur?.length > 0) {
      bilgi(`\nYENİ KUSUR TÜRÜ · ${circir.yeniTur.length} satır — bu tür İLK KEZ ölçülüyor`);
      for (const b of circir.yeniTur) bilgi(`  ${satir(b)}`);
      bilgi('  Taban dalın aracı bu türü hiç ölçmemişti; satırlar bir BÜYÜME');
      bilgi('  değil, yeni bir kapının ilk fotoğrafıdır. Koşul TABANIN beyanıdır');
      bilgi('  ve dal onu belirleyemez: beyan main\'e girdiği an bu yol o tür');
      bilgi('  için kalıcı olarak kapanır.');
    }
    if (circir.gecis > 0) {
      bilgi(`\nANAHTAR ŞEMASI GEÇİŞİ · ${circir.gecis} satır — tabandaki HEDEFSİZ satırlar`);
      bilgi('  daha kesin yazıldı. Bu bir büyüme DEĞİLDİR ve bir kaldıraç da değildir:');
      bilgi('  koşul TABANIN şeklidir, dal onu belirleyemez. Taban hedefli satır');
      bilgi('  taşımaya başladığında bu yol kalıcı olarak kapanır.');
    }
  }

  /* ── Rapor ────────────────────────────────────────────────────────── */
  if (s.kalan.length > 0) {
    bilgi(`\nİZİN LİSTESİNDEKİ BORÇ · ${s.kalan.length} bulgu (kapıyı yakmaz, GÖRÜNÜR kalır)`);
    for (const b of s.kalan) bilgi(`  ${satir(b)} → ${b.olcum}/${b.azami} ${b.birim ?? ''}`);
  }
  if (s.duzelmis.length > 0) {
    bilgi(`\nDÜZELMİŞ BORÇ · ${s.duzelmis.length} satır — ${path.relative(WEB, BORC_YOLU)} içinden SİLİN`);
    for (const b of s.duzelmis) bilgi(`  ${satir(b)} (azami ${b.azami})`);
  }

  if (s.yeni.length > 0) {
    yaz(`\nDİŞ 2 · ALT KÜME — izin listesinde OLMAYAN ${s.yeni.length} bulgu`);
    for (const b of s.yeni) {
      yaz(`  ${satir(b)} → ${b.olcum} ${b.birim ?? ''}${b.not ? ` · ${b.not}` : ''}`);
      /* Aynı rota + bant + kuralda listede BAŞKA hedef var: bu bir yeni
         kusur değil, bir YER DEĞİŞTİRME olabilir — bypass'ın tam kendisi.
         İki iş farklıdır, ayrı yazılır. */
      if (b.hedefDegisti) {
        yaz(`      ↔ HEDEF DEĞİŞMİŞ olabilir — listedeki: ${b.hedefDegisti.join(' , ')}`);
      }
    }
    yaz('  Bunlar YENİDİR: düzeltin. Listeye eklemek DİŞ 3\'e takılır.');
  }
  if (s.asan.length > 0) {
    yaz(`\nDİŞ 1 · TAVAN — ${s.asan.length} bulgu izin verilen tavanı aştı`);
    for (const b of s.asan) yaz(`  ${satir(b)} → ${b.olcum} > ${b.azami} ${b.birim ?? ''}`);
  }
  if (circir.eklenen.length > 0) {
    yaz(`\nDİŞ 3 · TABAN DAL — izin listesine ${circir.eklenen.length} satır EKLENMİŞ (${TABAN_DAL})`);
    for (const b of circir.eklenen) yaz(`  + ${satir(b)} (azami ${b.azami})`);
    yaz('  Liste yalnız KÜÇÜLEBİLİR. Bulguyu düzeltin, listeye yazmayın.');
  }
  if (circir.yukseltilen.length > 0) {
    yaz(`\nDİŞ 3 · TABAN DAL — ${circir.yukseltilen.length} satırın tavanı YÜKSELTİLMİŞ`);
    for (const b of circir.yukseltilen) yaz(`  ↑ ${satir(b)} · ${b.tabanAzami} → ${b.azami}`);
  }

  const kapali = s.kapiKapali || circir.kapiKapali;
  bilgi(`\nkalite borcu (${kapi ?? 'tümü'}): izinli ${s.kalan.length} · yeni ${s.yeni.length}`
    + ` · tavan aşan ${s.asan.length} · düzelmiş ${s.duzelmis.length}`
    + ` · cırcır ${circirNotu ?? `${circir.eklenen.length} eklenen · ${circir.yukseltilen.length} yükseltilen`
      + `${circir.gecis ? ` · ${circir.gecis} şema geçişi` : ''}`}`);
  return kapali;
}

export { borcAnahtari };
