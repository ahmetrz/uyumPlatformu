#!/usr/bin/env node
/* Kapı farkı — YERELDE KOŞAN AMA CI'DA KOŞMAYAN betikler.

   ── Neden var ─────────────────────────────────────────────────────────
   `rota-duman.mjs` ve `gezinme-testi.mjs` aylarca kendi `girisYap`
   kopyalarını taşıdı; #28 ortak işleve bir adım ekleyince ikisi de giriş
   yapamaz oldu ve HİÇBİR ŞEY bunu söylemedi. Kopyalar sebep değildi:
   asıl sebep, iki aracın CI'da hiç koşmamasıydı. Koşmayan bir kapı
   kırıldığını da bildiremez.

   Bu araç o boşluğu SAYIYA çevirir: `package.json`'daki her betik ya PR
   kapısında koşar, ya burada GEREKÇESİYLE beyan edilir. Üçüncü bir
   ihtimal yok — beyansız betik kapıyı kırmızı yakar. Yeni bir kapı
   yazıp CI'ya bağlamayı unutmak artık sessiz değil.

   ── "CI'da koşuyor" nasıl ölçülür ──────────────────────────────────────
   Adı geçmesi yetmez; KAPSANMASI da sayılır. Her betiğin çağırdığı
   `arac/*.mjs` dosyaları çıkarılır (`npm run` zincirleri çözülerek), iş
   akışının çağırdıklarıyla karşılaştırılır:

     · betiğin adı iş akışında geçiyorsa            → koşuyor
     · betiğin BÜTÜN araçları iş akışında koşuyorsa → kapsanıyor
       (`tasarim:kontrast` · `tasarim:font` · `tasarim:iz` üçü de
        `tasarim:kapi` içinde koşar; ayrıca beyan edilmeleri gereksiz
        ikinci nüsha olurdu)

   Bu ölçüm PR KAPISINA bakar (`pr-kapisi.yml`). `publish.yml` main'e
   girdikten SONRA koşar; birleşmeyi engellemez, dolayısıyla kapı
   sayılmaz — ama beyanı "yalnız yayında koşuyor" diyebilir ve bu ayrı
   bir şeydir.

   Kullanım:  npm run kapi:farki        → tablo + sayı, beyansız betik varsa çıkış 1
              npm run kapi:farki --json → makine okunur özet
*/

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEPO = path.resolve(WEB, '..');
const PR_KAPISI = path.join(DEPO, '.github/workflows/pr-kapisi.yml');

/* ── BEYAN ─────────────────────────────────────────────────────────────
   PR kapısında koşmayan her betik burada, gerekçesiyle. Gerekçe bir
   ETİKET değil bir CÜMLE: "neden koşmuyor" ve "koşması için ne gerek"
   okunabilmeli. Beyan listesi yalnız KÜÇÜLMELİ; bir satırın silinmesi o
   betiğin CI'ya bağlandığı anlamına gelir.

   `kapi` alanı, betiğin kapı olup olmadığını söyler: kapı olmayanlar
   (üretici, işletim, geliştirme betikleri) sayıya girmez. Ayrım
   ölçülemez — bir betiğin "ürünü ölçtüğünü" kaynaktan çıkaramayız — o
   yüzden BEYAN edilir ve gerekçe onu savunur. */
const BEYAN = {
  dev: { kapi: false, sebep: 'geliştirme sunucusu; ölçmez' },
  start: { kapi: false, sebep: 'üretim sunucusunu başlatır; ölçmez' },
  seed: { kapi: false, sebep: 'tohum yükler; CI `db:hazirla` adımında zaten koşar' },
  'db:hazirla': { kapi: false, sebep: 'CI aynı üç komutu adım olarak koşar (prisma migrate/generate/seed)' },
  yedek: { kapi: false, sebep: 'işletim aracı: ürünün kendi yedeğini alır, ürünü ölçmez' },
  sabotaj: { kapi: false, sebep: 'kapıların kendini sınadığı el aracı; bilerek KIRMIZI üretir, CI\'da koşarsa kapıyı yalancı yakar' },
  'harita:sinir': { kapi: false, sebep: 'üretici: Natural Earth\'ten silüet çizer, ağ ister; çıktısı depoda' },
  'sayimlar:yenile': { kapi: false, sebep: 'üretici: envanteri YAZAR; CI okuyanı (`sayimlar:denetle`) koşmalı' },
  'konsol:olcum': { kapi: false, sebep: 'ölçüm sondası: konsol gürültüsünü RAPORLAR, eşiği yok' },
  'pg:istemci': { kapi: false, sebep: 'sağlayıcı yaşam döngüsünün ADIMI, kapı değil: istemciyi PostgreSQL/SQLite için yeniden üretir. `test:pg` onu kendi içinde koşar ve sonunda SQLite\'a GERİ ALIR — iş akışına ayrı adım olarak yazılsaydı `kapi:parti` onu kapı sanar ve dizini PostgreSQL istemcisiyle bırakırdı' },
  'pg:test-sablonu': { kapi: false, sebep: 'kurulum adımı: PostgreSQL test şablonunu (taban göçü + tohum) kurar; ölçmez, hüküm vermez. `test:pg` içinde koşar' },
  'paket:dogrula': { kapi: false, sebep: 'yazar aracı: bir paket dizinini doğrular; iskelet paketlerin doğrulayıcıdan geçtiğini CI `npm test` içindeki `tests/paket-iskeletler.test.ts` ölçer' },

  'test:kapsam': { kapi: true, sebep: 'CI `npm test` koşuyor; kapsam raporu eşiksiz ve süreyi ikiye katlıyor — eşik konduğu gün bağlanır' },
  'tasarim:rota': { kapi: true, sebep: 'canlı sunucu · 4 bant × 58 rota; `rota:duman` ile örtüşüyor, ayrıştırılmadan bağlanırsa süre iki katına çıkar' },
  'tasarim:dizustu': { kapi: true, sebep: 'canlı sunucu · 1366×768 kırpılma; `yatay-tasma` üç bandı ölçüyor, dördüncü bant borç listesine girmedi' },
  'tasarim:erisim': { kapi: true, sebep: 'canlı sunucu · `erisim-axe` bunun yerini aldı (axe-core, üç bant, cırcırlı); bu araç emekliye ayrılacak' },
  'tasarim:gorsel': { kapi: true, sebep: 'canlı sunucu · altın görüntüler depoda yok; altınsız koşarsa "altın yok" diye kırmızı yanar' },
  /* ÖLÇÜLDÜ 8 Eyl 2026, P1 ucunda: 9 koşum · ~25 dk · KUSURLU 6. Altısı
     da AYNI kusur (`/omur` 375px 4px + 768px 3px) ve üç sözlükte de
     birebir aynı — yani sözlük katmanının kendi kusuru DEĞİL, main'in
     kapattığı taşma borcunun P1 ucunda henüz kapanmamış hâli. Düzeltme
     bu birleşmeyle geldi; kapı bağlanmadan önce yeşil görülmeli. */
  'kalite:lighthouse': { kapi: true, sebep: 'canlı sunucu · runner\'da puanlar donanıma göre kayar; eşik CI\'da anlamsız' },
  'tasarim:ux': { kapi: true, sebep: 'canlı sunucu · bulguları borç listesine girmedi; cırcırsız bağlanırsa ilk turda kırmızı' },
  'tasarim:cekmece': { kapi: true, sebep: 'canlı sunucu · aynı gerekçe: borç listesi yok' },
  'tasarim:yuk': { kapi: true, sebep: 'canlı sunucu · bilişsel yük RAPORLAR, kusur eşiği yok (çıkış kodu hep 0)' },
  'tasarim:gorev': { kapi: true, sebep: 'canlı sunucu · görev akışı sayar, eşiği yok' },
  'olcum:yuk': { kapi: true, sebep: 'canlı sunucu · yük ölçümü; eşiği runner\'a bağlı' },
  /* ÖLÇÜLDÜ 8 Eyl 2026, P1 ucunda (main birleşmeden ÖNCE): 9 koşum ·
     ~25 dk · KUSURLU 6. Altısı da AYNI kusur (`/omur` 375px 4px +
     768px 3px) ve üç sözlükte BİREBİR aynı — yani sözlük katmanının
     kendi kusuru değil, main'in kapattığı taşma borcunun o uçta henüz
     kapanmamış hâli. `erisim-axe` üç sözlükte de temizdi. Düzeltme bu
     birleşmeyle geldi; kapı CI'ya bağlanmadan önce YEŞİL görülmeli. */
  'kapi:iki-sozluk': { kapi: true, sebep: 'canlı sunucu · üç düzen kapısını ÜÇ sözlükle koşar (9 koşum, ~25 dk); tarayıcılı bloğu üçe katlar — süre bütçesi ayrılınca bağlanır' },
  /* Bu beyan bir ERTELEME DEĞİL, bir totolojidir: `kapi:parti` iş
     akışının KENDİSİNDEN türetilir ve onu birebir koşar. CI'ya
     bağlanması, iş akışının kendi kendini çağırması olurdu — ölçtüğü
     şeyin içine konan bir ölçü. Yeri PR öncesidir, PR sırası değil. */
  'kapi:parti': { kapi: false, sebep: 'PR kapı kümesini `pr-kapisi.yml`den TÜRETİP koşar; iş akışına bağlanması iş akışının kendini çağırması olur — ölçen, ölçtüğünün içine konamaz' },
};

/* ── Betiklerin çağırdığı araçlar ──────────────────────────────────── */

/* Kimlik DOSYA + BAYRAK'tır, yalnız dosya değil. Ölçüldü: `sayimlar:yenile`
   (`--yaz`) ile `sayimlar:denetle` (`--denetle`) AYNI dosyayı çağırır ama
   biri envanteri YAZAR, öbürü DENETLER. Yalnız dosyaya bakan bir kapsama
   kuralı, denetleyici CI'ya bağlandığı anda yazıcıyı da "koşuyor" sayıyordu
   — kapsama kuralının kendi yanlış pozitifi. */
const ARAC_KALIBI = /arac\/([a-z0-9-]+\.mjs)((?:\s+--[\w-]+)*)/g;

/** Bir komut satırındaki `arac/*.mjs` çağrıları + çözülmüş `npm run` zincirleri. */
function araclar(komut, betikler, gorulen = new Set()) {
  const bulunan = new Set();
  for (const [, dosya, bayraklar] of komut.matchAll(ARAC_KALIBI)) {
    const b = (bayraklar || '').trim().split(/\s+/).filter(Boolean).sort();
    bulunan.add(b.length ? `${dosya} ${b.join(' ')}` : dosya);
  }
  for (const [, ad] of komut.matchAll(/npm run ([\w:-]+)/g)) {
    if (gorulen.has(ad) || !betikler[ad]) continue;
    gorulen.add(ad);
    for (const d of araclar(betikler[ad], betikler, gorulen)) bulunan.add(d);
  }
  return bulunan;
}

/** İş akışı metnindeki `run:` gövdeleri — YORUM SATIRLARI ATILIR.

    Yorumlanmış bir `npm run X` satırı "koşuyor" sayılsaydı, bir kapıyı
    yorum içine alıp beyandan da kaçırmak mümkün olurdu. */
function isAkisiKomutlari(yol) {
  return readFileSync(yol, 'utf8')
    .split('\n')
    .filter((s) => !s.trimStart().startsWith('#'))
    .join('\n');
}

/** İş akışının `run:` ADIMLARI — SIRAYLA, adıyla ve dizini ile.

    `fark()` kapıların KÜMESİNE bakar; parti kapanışı ise SIRAYA ve
    adımın kendisine ihtiyaç duyar (`arac/parti-kapanisi.mjs`). İkisi
    aynı dosyayı okur ve aynı yorum kuralına uyar; ikinci bir ayrıştırıcı
    yazılsaydı biri yorumlanmış satırı sayar öbürü saymazdı.

    Yorum satırları burada da atılır: `isAkisiKomutlari` ile aynı gerekçe. */
export function adimlar(isAkisiMetni) {
  const satirlar = isAkisiMetni.split('\n');
  const cikti = [];
  let simdiki = null;
  /* HANGİ İŞE AİT. Kapı kümesi hızlı/yavaş diye ikiye bölündüğünde,
     adımın hangi işte koştuğu bir ADIM ÖZELLİĞİDİR — çağıranın elinde
     tuttuğu ayrı bir liste değil. Liste tutulsaydı iş akışına yeni bir
     iş eklendiği gün liste yalan söylerdi. */
  let is = null;
  let blok = null;                       /* `run: |` gövdesinin girintisi */
  let cevre = null;                      /* `env:` bloğunun girintisi */
  let adimGirinti = null;                /* adım anahtarlarının girintisi */
  let isCevresi = {};                    /* İŞ düzeyi `env:` */
  let isCevreGirinti = null;
  /* Aracın GERÇEKTEN uyguladığı adım anahtarları. Bu kümenin dışındaki
     her anahtar `bilinmeyen`e düşer ve raporda ORTAM FARKI olarak
     görünür — sessizce atlanmaz. `env:` körlüğü tam olarak buradan
     doğdu: anahtar okunmuyordu, kimse fark etmiyordu, kapı yanlış
     ortamda koşuyordu ve rapor "koştu" diyordu. */
  const UYGULANAN = new Set(['name', 'run', 'working-directory', 'env', 'continue-on-error']);
  for (const ham of satirlar) {
    if (blok !== null) {
      if (ham.trim() === '' || ham.search(/\S/) >= blok) {
        simdiki.komut += `${simdiki.komut ? '\n' : ''}${ham.trim()}`;
        continue;
      }
      blok = null;
    }
    if (cevre !== null) {
      const g = ham.match(/^(\s*)([A-Z_][A-Z0-9_]*):\s*(.*?)\s*$/);
      if (g && g[1].length >= cevre) {
        simdiki.cevre[g[2]] = g[3].replace(/^['"]|['"]$/g, '');
        continue;
      }
      cevre = null;
    }
    /* `jobs:` altındaki iki boşluklu anahtar = bir İŞ adı. */
    const isAdi = ham.match(IS_ADI_KALIBI);
    /* Yeni iş: adım bağlamı da sıfırlanır. Sıfırlanmasaydı önceki işin son
       adımının girintisi taşınır ve İŞ DÜZEYİ `env:` hiç okunmazdı (ölçüldü). */
    if (isAdi) { is = isAdi[1]; isCevresi = {}; isCevreGirinti = null; adimGirinti = null; }
    /* İŞ DÜZEYİ `env:` — adım düzeyindekiyle aynı gerekçe: okunmazsa kapı
       yanlış ortamda koşar ve rapor "koştu" der. PostgreSQL işi bağlantı
       dizesini iş düzeyinde verir; adım düzeyinde hiç görünmez. Adımın
       kendi `env:`i İŞİNKİNİ EZER (GitHub da böyle yapar). */
    if (adimGirinti === null) {
      const isEnv = ham.match(/^ {4}env:\s*$/);
      if (isEnv) { isCevreGirinti = 6; continue; }
      if (isCevreGirinti !== null) {
        const g = ham.match(/^(\s*)([A-Z_][A-Z0-9_]*):\s*(.*?)\s*$/);
        if (g && g[1].length >= isCevreGirinti) { isCevresi[g[2]] = g[3].replace(/^['"]|['"]$/g, ''); continue; }
        isCevreGirinti = null;
      }
    }
    const ad = ham.match(/^(\s*)-\s+name:\s*(.+?)\s*$/);
    if (ad) {
      if (simdiki?.komut) cikti.push(simdiki);
      adimGirinti = ad[1].length + 2;
      simdiki = {
        ad: ad[2].replace(/^['"]|['"]$/g, ''),
        is,
        /* İŞ düzeyi ortam KOPYALANIR; adımın kendi `env:`i üstüne yazar. */
        komut: '', dizin: '.', cevre: { ...isCevresi }, bilinmeyen: {}, bloklamaz: false,
      };
      continue;
    }
    if (!simdiki) continue;
    /* Adım düzeyindeki HER anahtar görülür; uygulanmayanlar kaydedilir. */
    const anahtar = adimGirinti === null ? null
      : ham.match(new RegExp(`^\\s{${adimGirinti}}([a-z][a-z0-9-]*):\\s*(.*?)\\s*$`));
    if (anahtar && !UYGULANAN.has(anahtar[1])) {
      simdiki.bilinmeyen[anahtar[1]] = anahtar[2] || '(blok)';
      continue;
    }
    /* ADIMIN `env:` BLOĞU DA ADIMIN PARÇASIDIR. Ölçüldü: `env:` atlanınca
       `demo:build` KIRMIZI yandı — `NEXT_PUBLIC_DEMO=1` olmadan statik
       çıktı üretilmiyor ("çıktı dizini yok → web/out"). Kusur kodda değil
       ölçen araçtaydı: aynı komutu FARKLI ortamda koşan bir araç, PR
       kapısını kopyalamış olmaz. */
    const cevreBas = ham.match(/^(\s*)env:\s*$/);
    if (cevreBas) { cevre = cevreBas[1].length + 2; continue; }
    /* `continue-on-error: true` = ADIM CI'DA BLOKLAMAZ. Bunu okumayan bir
       ayna kendi yorumunu ekler: yerelde kırmızı, CI'da yeşil bir kapı
       önce görmezden gelinir, sonra atlanır. Kümeleri eşitlemek için
       kurulan araç, ilk aşınmayı tam oradan yaşar. */
    const hosgoru = ham.match(/^\s*continue-on-error:\s*(\S+)/);
    if (hosgoru) { simdiki.bloklamaz = hosgoru[1] === 'true'; continue; }
    const dizin = ham.match(/^\s*working-directory:\s*(\S+)/);
    if (dizin) { simdiki.dizin = dizin[1]; continue; }
    const kosBlok = ham.match(/^(\s*)run:\s*\|\s*$/);
    if (kosBlok) { blok = kosBlok[1].length + 2; continue; }
    const kos = ham.match(/^\s*run:\s*(.+?)\s*$/);
    if (kos) { simdiki.komut = kos[1]; continue; }
  }
  if (simdiki?.komut) cikti.push(simdiki);
  return cikti;
}

/* KAPI MI, KURULUM MU? Kapı, ölçen ve HÜKÜM VEREN adımdır. Kurulum
   adımları (bağımlılık, veritabanı, tarayıcı indirme, artefakt indirme,
   sunucu başlatma / durdurma) ölçmez; koşulmamaları bir kapının
   eksikliği değildir. İki kalıp da `parti-kapanisi.mjs` içinde
   duruyordu; testin aynı kararı ikinci kez yazması gerekiyordu ve iki
   nüsha ayrı ayrı bayatlayabilirdi. */
const KAPI_KALIBI = /(npm run [\w:-]+|npm test\b|npx tsc\b|node arac\/)/;
const KURULUM_KALIBI = /(npm ci|prisma |playwright-core\/cli|git fetch|fuser -k|next start)/;

/** KAPI ADIMLARI — iş akışından türetilmiş, tekilleştirilmiş kapı listesi.

    `isSuzgeci` verilirse tekilleştirmeden ÖNCE uygulanır. Sıra önemli:
    aynı komut iki işte duruyorsa (üretim derlemesi böyleydi), önce
    tekilleştirip sonra süzmek o komutu seçilen işten DÜŞÜRÜRDÜ — kapı
    koşulmamış olurdu ve kimse görmezdi. */
/**
 * @param {string} isAkisiMetni
 * @param {Set<string>|null} [isSuzgeci]
 */
export function kapiAdimlari(isAkisiMetni, isSuzgeci = null) {
  /* Yorum satırları BURADA atılır. Çağıranın atmasına bırakılsaydı,
     atmayı unutan çağıran yoruma alınmış bir kapıyı "koşuyor" sayardı —
     kapıyı yoruma alıp kaçmak tam olarak bu yolla mümkün olurdu. */
  const temiz = isAkisiMetni.split('\n')
    .filter((x) => !x.trimStart().startsWith('#')).join('\n');
  const { adimlar: tum } = sunucuYasamDongusu(temiz);

  /* YAŞAM DÖNGÜSÜ İŞ BAŞINA ÖLÇÜLÜR. Tarayıcılı kapılar tek işteyken
     iş akışı genelindeki İLK `next start` ile İLK `fuser -k` yetiyordu.
     Kapılar paralel işlere bölününce her işin KENDİ çifti oluyor ve
     "genelde ilk" olan çift yalnız BİRİNCİ işi doğru sınıflar: kalan
     işlerin kapıları "sunucu istemez" diye işaretlenir, yerel kapanış
     onları sunucusuz koşar ve kırmızı yakar — kusur kodda değil ölçen
     araçta olurdu. */
  const dongu = new Map();
  tum.forEach((a, i) => {
    const d = dongu.get(a.is) ?? { baslar: -1, durur: -1 };
    if (d.baslar < 0 && /next start/.test(a.komut)) d.baslar = i;
    if (d.durur < 0 && /fuser\s+-k/.test(a.komut)) d.durur = i;
    dongu.set(a.is, d);
  });
  for (const [is, d] of dongu) {
    if (d.baslar >= 0 && d.durur < 0) {
      throw new Error(`\`${is}\` işi sunucu BAŞLATIYOR ama durduran adım yok`
        + ' — sunucu ayakta kalır ve sonraki ölçüm bayat olur.');
    }
  }
  const yasam = new Set(
    [...dongu.values()].flatMap((d) => [d.baslar, d.durur]).filter((i) => i >= 0),
  );

  const gorulen = new Set();
  return tum
    .map((a, i) => ({ ...a, sira: i }))
    .filter((a) => !yasam.has(a.sira)
      && KAPI_KALIBI.test(a.komut) && !KURULUM_KALIBI.test(a.komut))
    .filter((a) => isSuzgeci === null || isSuzgeci.has(a.is))
    .filter((a) => {
      const anahtar = `${a.komut}\u0000${JSON.stringify(a.cevre)}`;
      if (gorulen.has(anahtar)) return false;
      gorulen.add(anahtar); return true;
    })
    .map((a) => {
      /* Sunucu isteyen kapı SIRADAN anlaşılır: KENDİ İŞİNDEKİ başlatan
         ile durduran adımın arasında duruyorsa canlı sunucu ister. Ad
         listesi tutulmuyor — iş akışı yeniden sıralanırsa liste yalan
         söylerdi. */
      const d = dongu.get(a.is) ?? { baslar: -1, durur: -1 };
      return {
        ...a,
        sunucuIster: d.baslar >= 0 && a.sira > d.baslar
          && (d.durur < 0 || a.sira < d.durur),
      };
    });
}

/** KAPI TAŞIYAN İŞLER — hangi işte en az bir kapı var. */
export function kapiliIsler(isAkisiMetni) {
  return new Set(kapiAdimlari(isAkisiMetni).map((a) => a.is));
}

/** İŞ ADLARI — iş akışının `jobs:` bloğundan TÜRETİLİR.

    NEDEN LİSTE DEĞİL: `parti-kapanisi.mjs` dört iş adını SABİT yazıyordu
    (`kapi` · `kapi-yavas` · `kapi-postgres` · `kapi-compose`). Liste iş
    akışından ayrı yaşar: CI'ya beşinci bir iş eklendiği gün yerel kapanış
    onu HİÇ koşmaz ve yine de "tamamı koştu" der. Kapı kümesinin kendisi
    zaten türetiliyordu; türetilmeyen tek şey İŞ katmanıydı.

    `jobs:` bloğunun İÇİNDE olmak şart: `on:` altındaki `pull_request:` ·
    `schedule:` · `workflow_dispatch:` de iki boşluklu, değersiz
    anahtarlardır ve blok takibi olmadan iş sanılırlar (ölçüldü). */
/* İŞ ADI KALIBI — TEK NÜSHA ve satır-içi yorum TOLERANSLI.

   Ölçüldü (bağımsız inceleme, PR #46): kalıp satırın tamamen boşlukla
   bitmesini şart koşuyordu; `  kapi-yavas:  # toplayıcı` gibi bir satır
   HİÇ eşleşmiyor ve o iş türetilen listeden SESSİZCE düşüyordu. İki
   sonucu birden vardı: `isler()` işi görmez (parti kapsamı eksilir) ve
   `adimlar()` o işin adımlarını bir öncekine yazar — kapanış yine
   "tamamı koştu" derdi. Kalıp iki yerde ayrı ayrı yazılıydı; bugün tek
   nüshadır ki biri düzeltilip öbürü bayatlamasın. */
export const IS_ADI_KALIBI = /^ {2}([a-z][\w-]*):\s*(?:#.*)?$/;

export function isler(isAkisiMetni) {
  const satirlar = isAkisiMetni.split('\n')
    .filter((s) => !s.trimStart().startsWith('#'));
  const cikti = [];
  let icinde = false;
  for (const ham of satirlar) {
    if (/^jobs:\s*$/.test(ham)) { icinde = true; continue; }
    /* Girintisiz bir anahtar `jobs:` bloğunu kapatır. */
    if (icinde && /^[a-zA-Z]/.test(ham)) { icinde = false; continue; }
    if (!icinde) continue;
    const m = ham.match(IS_ADI_KALIBI);
    if (m) cikti.push(m[1]);
  }
  return cikti;
}

/** DURDURMA ADIMININ KARARI — saf: komut metnini alır, kusurları döner.

    Saf olması SABOTAJI mümkün kılar: kusurun ESKİ hâli
    (`pkill -f 'next start' || true`) fikstür olarak verilebilir ve
    kapının onda hâlâ kırmızı yandığı görülebilir. Düzeltilmiş bir kapı,
    kusurun eski hâlinde hâlâ kırmızı yanmalıdır — yoksa düzeltme değil,
    delik açılmış olur.

    Üç kusur ayrı ayrı sayılır çünkü üçü ayrı ayrı yeterlidir:
    ad eşleştirme yanlış şeyi öldürür, `|| true` yanlışı gizler, son
    koşulu doğrulamayan adım da ikisini birden görünmez yapar. */
export function durdurmaKarari(komut) {
  const kusurlar = [];
  if (/\b(pkill|killall|pgrep)\b/.test(komut)) {
    kusurlar.push('süreç ADIYLA öldürüyor — ad öldürdüğümüz programın iç'
      + ' detayıdır ve sürümle kayar (ölçüldü: `next start` → `next-server`)');
  }
  if (/\|\|\s*true/.test(komut)) {
    kusurlar.push('`|| true` sonucu yutuyor — başarısız OLAMAYAN adım, adım değildir');
  }
  const sonda = /curl|\bnc\b|fuser\s+-s/.test(komut);
  const kirmiziYolu = /exit\s+1/.test(komut);
  if (!sonda || !kirmiziYolu) {
    kusurlar.push('SON KOŞULU doğrulamıyor — öldürdükten sonra portu yoklayıp'
      + ' kırmızı yakabileceği bir yol yok');
  }
  return { saglam: kusurlar.length === 0, kusurlar };
}

/** SUNUCU YAŞAM DÖNGÜSÜ — iş akışındaki başlatma ve durdurma adımlarının
    sıra numaraları, adımların kendisiyle birlikte.

    TEK NÜSHA BURADA. `arac/parti-kapanisi.mjs` bu adımları KOŞAR,
    `tests/bekci/sunucu-durdurma.test.ts` bunları SINAR. İkisi ayrı ayrı
    arasaydı biri düzeltilir öbürü bayatlardı — kapının okuduğu şey tek
    yerde tutulur.

    Adım ADIYLA değil YAPTIĞI İŞLE tanınır; ama tanınan dizge BİZİM
    yazdığımız komut olmalıdır. ÖLÇÜLDÜ: durdurma adımı bir zamanlar
    YABANCI bir dizgeyle tanınıyordu (`pkill` → Next'in süreç adı) ve
    Next açılışta adını `next-server (vX.Y.Z)` yapınca kalıp hiçbir şeye
    eşleşmedi. `next start` ve `fuser -k` iş akışının kendi metnidir.

    BAŞLATAN VAR DA DURDURAN TANINMIYORSA BU BİR KUSURDUR — sessiz bir
    `-1` değil. Sessiz kalsaydı çağıran durdurmayı hiç koşmaz, sunucuyu
    ayakta bırakır ve bir sonraki ölçümü bayat sunucuya yaptırırdı. */
export function sunucuYasamDongusu(isAkisiMetni) {
  const tum = adimlar(isAkisiMetni);
  const baslar = tum.findIndex((a) => /next start/.test(a.komut));
  const durur = tum.findIndex((a) => /fuser\s+-k/.test(a.komut));
  if (baslar >= 0 && durur < 0) {
    throw new Error('İş akışı sunucu BAŞLATIYOR ama durduran adım tanınamadı'
      + ' (`fuser -k` aranıyor). Durdurma adımı değiştiyse tanıma da burada'
      + ' güncellenmeli — yoksa sunucu ayakta kalır ve sonraki ölçüm bayat olur.');
  }
  if (baslar >= 0 && durur >= 0 && durur < baslar) {
    throw new Error('Durdurma adımı başlatma adımından ÖNCE geliyor —'
      + ' tarayıcılı kapıların hangileri olduğu bu sıradan türetiliyor.');
  }
  return { baslar, durur, adimlar: tum };
}

/** İŞ DÜZEYİNDEKİ ortam anahtarları — araç bunların HİÇBİRİNİ uygulamaz.

    Adım anahtarları `adimlar()` içinde toplanıyor; ama ortamı asıl
    belirleyen katman iş düzeyidir: hangi işletim sistemi, hangi node,
    hangi servis kabı. Yerel makine bunların hiçbirini taklit etmez ve
    etmeyi de iddia etmemeli — raporun görevi farkı SÖYLEMEK. */
export function isOrtami(isAkisiMetni) {
  const ilgi = ['runs-on', 'container', 'services', 'strategy', 'defaults', 'timeout-minutes'];
  const bulunan = {};
  for (const ad of ilgi) {
    const m = isAkisiMetni.match(new RegExp(`^\\s{4,6}${ad}:\\s*(.*?)\\s*$`, 'm'));
    if (m) bulunan[ad] = m[1] || '(blok)';
  }
  /* `uses:` adımları kurulumdur (checkout, setup-node, cache); araç
     onları koşmaz — yerel node ve yerel bağımlılıklar kullanılır. */
  const kurulumlar = [...isAkisiMetni.matchAll(/^\s*uses:\s*(\S+)/gm)].map((m) => m[1]);
  const nodeSurumu = isAkisiMetni.match(/node-version:\s*['"]?([\d.]+)/);
  return { bulunan, kurulumlar, nodeSurumu: nodeSurumu?.[1] ?? null };
}

export function fark({ betikler, isAkisiMetni, beyan = BEYAN }) {
  const ciAraclari = araclar(isAkisiMetni, betikler);
  const adiGecen = new Set();
  for (const [, ad] of isAkisiMetni.matchAll(/npm run ([\w:-]+)/g)) adiGecen.add(ad);
  if (/npm test\b/.test(isAkisiMetni)) adiGecen.add('test');

  const satirlar = [];
  for (const [ad, komut] of Object.entries(betikler)) {
    const kendi = araclar(komut, betikler);
    const dogrudan = adiGecen.has(ad);
    /* Araçsız betikler (`next build`, `vitest run`) yalnız ADLA sayılır:
       boş küme her kümenin alt kümesidir, kapsama kuralı onları
       yanlışlıkla "koşuyor" yapardı. */
    const kapsanan = !dogrudan && kendi.size > 0 && [...kendi].every((d) => ciAraclari.has(d));
    satirlar.push({
      ad, komut,
      araclar: [...kendi].sort(),
      durum: dogrudan ? 'adıyla' : kapsanan ? 'kapsanıyor' : 'koşmuyor',
      beyan: beyan[ad] ?? null,
    });
  }
  return satirlar;
}

/* ── Rapor ─────────────────────────────────────────────────────────── */

if (import.meta.url === `file://${process.argv[1]}`) {
  const betikler = JSON.parse(readFileSync(path.join(WEB, 'package.json'), 'utf8')).scripts;
  const satirlar = fark({ betikler, isAkisiMetni: isAkisiKomutlari(PR_KAPISI) });

  const kosan = satirlar.filter((s) => s.durum !== 'koşmuyor');
  const kosmayan = satirlar.filter((s) => s.durum === 'koşmuyor');
  const beyansiz = kosmayan.filter((s) => !s.beyan);
  const kapiBorcu = kosmayan.filter((s) => s.beyan?.kapi === true);
  const kapiDegil = kosmayan.filter((s) => s.beyan?.kapi === false);
  /* CI'da koşup da beyanı olan betik: beyan bayatlamış demektir. Liste
     yalnız küçülmeli; küçüldüğünü söyleyecek olan da bu kontrol. */
  const bayatBeyan = kosan.filter((s) => s.beyan);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
      toplam: satirlar.length,
      kosan: kosan.length,
      kapiBorcu: kapiBorcu.map((s) => s.ad),
      kapiDegil: kapiDegil.map((s) => s.ad),
      beyansiz: beyansiz.map((s) => s.ad),
      bayatBeyan: bayatBeyan.map((s) => s.ad),
    }, null, 2));
  } else {
    console.log('KAPI FARKI · PR kapısında koşan ile `package.json` betikleri\n');
    console.log(`  betik toplamı            ${satirlar.length}`);
    console.log(`  PR kapısında koşuyor     ${kosan.length}` +
      `  (${kosan.filter((s) => s.durum === 'adıyla').length} adıyla · ` +
      `${kosan.filter((s) => s.durum === 'kapsanıyor').length} kapsanıyor)`);
    console.log(`  koşmuyor · KAPI DEĞİL    ${kapiDegil.length}`);
    console.log(`  koşmuyor · KAPI          ${kapiBorcu.length}   ← ölçülen fark\n`);

    if (kapiBorcu.length) {
      console.log('KAPI OLUP CI\'DA KOŞMAYANLAR');
      for (const s of kapiBorcu) console.log(`  · ${s.ad.padEnd(20)} ${s.beyan.sebep}`);
      console.log('');
    }
    if (bayatBeyan.length) {
      console.log('BAYAT BEYAN — bu betikler artık CI\'da koşuyor, beyan satırı silinmeli:');
      for (const s of bayatBeyan) console.log(`  · ${s.ad}  (${s.durum})`);
      console.log('');
    }
    if (beyansiz.length) {
      console.log('BEYANSIZ BETİK — ne CI\'da koşuyor ne beyan edilmiş:');
      for (const s of beyansiz) console.log(`  · ${s.ad.padEnd(20)} ${s.komut}`);
      console.log('\n  Her betik ya PR kapısında koşar ya `arac/kapi-farki.mjs`');
      console.log('  BEYAN tablosunda gerekçesiyle durur. Üçüncü ihtimal yok.\n');
    }
  }

  process.exitCode = beyansiz.length || bayatBeyan.length ? 1 : 0;
}
