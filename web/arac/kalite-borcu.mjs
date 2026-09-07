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
import { borcAnahtari, borcSuzgeci, circirKarari } from './kalite-kurallari.mjs';

export const BORC_YOLU = path.join(WEB, 'arac', 'kalite-borcu.json');
/* Taban dal DAL DEĞİL: dalın kendi eklemesi kendini meşrulaştıramaz.
   `KALITE_TABAN_DAL` yalnız iki iş için vardır — varsayılan dalı başka
   olan bir çatal, ve dişlerin ISIRDIĞINI denemek. CI onu ayarlamaz. */
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
  return belge.bulgular;
}

/** Bu daldaki borç listesi. Modül yüklenirken okunur; okunamazsa atar. */
export const BORC = listeyiOku(BORC_YOLU);

/** Test ve araçlar için: başka bir yoldan da okunabilir, aynı sertlikle. */
export function borcOku(yol = BORC_YOLU) {
  return yol === BORC_YOLU ? BORC : listeyiOku(yol);
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
  try {
    const ham = execFileSync('git', ['show', `${TABAN_DAL}:${BORC_GIT_YOLU}`], {
      cwd: WEB, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const bulgular = JSON.parse(ham).bulgular;
    /* Taban daldaki liste BOZUKSA muafiyet üretemez: `?? []` deseydik
       bozuk bir taban, dalın her eklemesini "yeni değil" gösterirdi. */
    if (!Array.isArray(bulgular)) return { durum: 'okunamadi' };
    return { durum: 'var', bulgular };
  } catch {
    return { durum: 'kurulum' };
  }
}

function satir(b) {
  return `${b.kapi} · ${b.tur} · ${b.rota} · ${b.bant}px`;
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
  const ciDe = Boolean(process.env.CI);
  const gerekce = atlamaGerekcesi();
  let circir = { eklenen: [], yukseltilen: [], kapiKapali: false };
  let circirNotu = null;

  if (taban.durum === 'okunamadi') {
    if (ciDe) {
      yaz(`\nDİŞ 4 · CIRCIR OKUNAMADI — ${TABAN_DAL} bu klonda yok`);
      yaz('  CI\'da taban dal okunamıyorsa kapı KIRMIZIDIR: karşılaştırılamayan');
      yaz('  bir izin listesi, listenin büyümediğini KANITLAMAZ.');
      yaz('  Gereken: actions/checkout `fetch-depth: 0` + `git fetch origin main`.');
      return true;
    }
    if (!gerekce) {
      yaz(`\nDİŞ 4 · CIRCIR OKUNAMADI — ${TABAN_DAL} bu klonda yok`);
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
    circir = circirKarari(dalBorcu, taban.bulgular.filter((b) => !kapi || b.kapi === kapi));
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
    for (const b of s.yeni) yaz(`  ${satir(b)} → ${b.olcum} ${b.birim ?? ''}${b.not ? ` · ${b.not}` : ''}`);
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
    + ` · cırcır ${circirNotu ?? `${circir.eklenen.length} eklenen · ${circir.yukseltilen.length} yükseltilen`}`);
  return kapali;
}

export { borcAnahtari };
