/* İKİNCİ BAĞIMSIZ POPÜLASYON TANIĞI — RENDER EDİLMİŞ DOM

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Bu depoda iki kütük, popülasyonunu TEK bir regex türeticisinden alıyor:

     · `arac/politika-kutugu.mjs`  → politika cümleleri
     · `arac/bos-durum-kutugu.mjs` → boş durumlar

   Cırcırın "tavan sıfır" dişi, yalnız TÜRETİCİNİN GÖRDÜĞÜ popülasyonu
   korur. Türetici kör olduğunda kapı, göremediği kadarını "sıfır kusur"
   diye raporlar — ve bu, ölçülmüş bir başarısızlık biçimidir:

     politika evreni : 131 → 184   (tırnaksız JSX metni görülmüyordu)
     boş durum evreni: 74 → 94 → 95 → 102 → 100   (beş kez genişledi)

   Beş kez kör çıkan bir türeticinin "ölçülmeyen 0" çıktısı, popülasyonu
   BAĞIMSIZ doğrulanmadıkça bir ölçüm değildir. Alet, ürün değil.

   ── TANIĞIN MEKANİZMASI FARKLIDIR ─────────────────────────────────────
   Bu betik kaynağı HİÇ OKUMAZ. Ürünü gerçek bir tarayıcıda açar ve
   KULLANICIYA GÖRÜNEN metni toplar. Aynı kusur iki mekanizmada birden
   olmadıkça ayrışma görünür: regex bir metni kaçırırsa DOM onu yakalar,
   DOM bir metni gösteremezse (ölü kütük satırı) regex tarafı açıkta kalır.

   Demo ikizlerinde aynı kalıp zaten kullanıldı: popülasyon hem dosya
   sisteminden hem `import.meta.glob`tan türetilir ve ikisinin aynı
   kümeyi verdiği ölçülür.

   ── NE ÜRETİR ─────────────────────────────────────────────────────────
   `arac/dom-tanik.json`:
     { uretilme, rota: [...], politikaAdaylari: [...], bosDurumlar: [...] }

   Karşılaştırmayı bekçi yapar (`tests/bekci/dom-tanik.test.ts`); bu
   betik yalnız TOPLAR. Toplayan ile yargılayanı ayırmak bilinçlidir:
   yargı saf bir fonksiyonda kalsın ve sentetik kütüklerle sınanabilsin.

   Kullanım: PORT=3210 node arac/dom-tanik.mjs        (canlı sunucu ister)
             PORT=3210 node arac/dom-tanik.mjs --yaz  (kütüğü yaz)        */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { KOK, WEB, girisYap, sayfaEnvanteri, tarayiciYolu, tohumDegeri } from './kosu-ortak.mjs';
import { CUMLE_TABANI, CUMLE_TAVANI } from './politika-kutugu.mjs';
import { sebepBayragi, tabanDogrula, tabanYaz } from './olcum-tabani.mjs';

/* ── İKİ VERİ HÂLİ, TEK TANIK ────────────────────────────────────────
   Tanık iki kez koşar ve ikisi de AYNI aracın koşumudur:

     (varsayılan)  TOHUMLU kurulum → `arac/dom-tanik.json`
     `--bos`       BOŞ kurulum     → `arac/dom-tanik-bos.json`

   Neden iki hâl gerekti (Brief M · FAZ 1): cümlesiz boş yüzey ancak
   VERİ YOKKEN görünür. Tohumlu kurulumda tabloların çoğu doludur ve
   ölçüm 0 çıkar — ölçüldü, bu turda tohumlu koşumda cümlesiz yüzey 0.
   "Tohumlu koşumda 0" ile "böyle bir kusur yok" AYNI ŞEY DEĞİLDİR;
   ikisini ayıran tek şey boş veriyle bir koşumdur.

   ── FİKSTÜRÜNÜ KENDİ KURAR ──────────────────────────────────────────
   Boş koşum, kendi veritabanını kurar: göç zinciri uygulanır, ürünün
   KENDİ kurucu hesap aracıyla (`arac/kurucu-hesap.ts`) tek bir yönetici
   açılır, sunucu o veritabanıyla ayrı bir portta başlatılır ve koşum
   sonunda ikisi de kaldırılır. Kendi kurmadığı bir duruma yaslanan kapı
   yanlış sebeple geçebilir — bu deponun POL-084'te ölçtüğü sınıf. */
export const CIKTI = path.join(WEB, 'arac', 'dom-tanik.json');
export const CIKTI_BOS = path.join(WEB, 'arac', 'dom-tanik-bos.json');

/* ── POLİTİKA ADAYI SEÇİCİSİ ───────────────────────────────────────────
   Kütüğün kendi sınıflandırıcısı (`politikaMi`) burada YENİDEN
   KULLANILIR — bilerek. Tanığın işi "politika nedir"i yeniden tanımlamak
   değil, POPÜLASYONUN kendisini ikinci bir yoldan görmek. Ölçüt aynı
   kalmazsa iki taraf hiçbir zaman örtüşmez ve ayrışma dişi gürültüye
   boğulur. */
const { politikaMi } = await import('./politika-kutugu.mjs');

/** Ekranda görünen metin bloklarını normalleştirir. */
const duz = (m) => String(m ?? '').replace(/\s+/g, ' ').trim();

/* Toplanan metin, kütüğün taşıdığı biçime yaklaştırılır: kütük JSX
   kaynağındaki metni tutar (`&quot;` çözülmüş, satır sonları boşluk).
   Tam eşleşme beklenmez — karşılaştırma NORMALLEŞTİRİLMİŞ ÇEKİRDEK
   üzerinden yapılır (bkz. `cekirdek`, bekçi tarafında). */

async function sayfaTopla(page) {
  /* ── SINIRLAR TÜRETİCİDEN GELİR (düzeltme turu · tur 2 · P2-7) ──────
     Tanık `25` ve `400`ü KENDİ İÇİNE yazıyordu. İki ayrı yerde iki ayrı
     sayı tutmak, tanığın var oluş sebebini yok eder: türeticinin sınırı
     değiştiği gün ayrışma GERÇEK bir körlüğü değil, iki sabitin
     kaymasını gösterirdi — ve bu, tanığın yakaladığı dördüncü körlüğün
     ta kendisiydi. Sayılar `page.evaluate`e argüman olarak geçer;
     tarayıcı bağlamı modül kapsamını görmez. */
  return page.evaluate(({ taban, tavan }) => {
    const cikan = { politika: [], bos: [], cumlesiz: [], bosYuzeySayisi: 0, veriYuzeyi: 0, kapsayiciBos: [] };
    const gorunur = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    /* POLİTİKA ADAYI: kendi içinde başka blok taşımayan metin taşıyıcıları.
       İç içe elemanları iki kez saymamak için yalnız "yaprak blok"lar
       alınır — yoksa aynı cümle sarmalayıcılarıyla birlikte onlarca kez
       görünürdü. */
    const bloklar = document.querySelectorAll('p, li, span, div, td, th, h1, h2, h3, h4, summary, figcaption, label');
    for (const el of bloklar) {
      if (el.querySelector('p, li, div, td, th, h1, h2, h3, h4, summary')) continue;
      if (!gorunur(el)) continue;
      const metin = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (metin.length < taban || metin.length > tavan) continue;
      cikan.politika.push(metin);
    }
    /* ── BOŞ DURUM · TANIĞIN KENDİ KUSURU DÜZELTİLDİ ──────────────────
       İlk yazım `[class*="bos"]` kullanıyordu ve bu İKİ YÖNDE de yanlıştı:

       (a) YANLIŞ POZİTİF: alt dize eşleşmesi `ab-dok-bosluk` ve
           `ab-harita-bos` gibi YERLEŞİM sınıflarını da yakalıyordu.
           `/topoloji`nin "22 kapsam · 4 temeli onaylı" ÖZET paneli boş
           durum sanılıp "eylemsiz" diye kırmızı yakmıştı.
       (b) YANLIŞ NEGATİF: ürünün asıl boş durum bileşeni `BosIlk`
           `bos` sınıfını HİÇ basmıyor — `div.ab-blok` + `span.etiket`
           ("Boş · ilk kurulum") basıyor. Yani tanık, aradığı şeyi hiç
           göremiyordu.

       Bugün ürünün KENDİ sözleşmesi okunur: bileşenin etiket metni ve
       satır içi `bos` SINIF ADI (alt dize değil, tam belirteç). */
    const ETIKETLER = { 'Boş · ilk kurulum': 'BosIlk', 'Beklenen durum': 'BosIlk-iyi', 'Süzgeç': 'BosFiltre' };
    const ekle = (el, tur) => {
      if (!gorunur(el)) return;
      const metin = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (metin.length < 3) return;
      cikan.bos.push({
        metin,
        tur,
        sinif: el.getAttribute('class') || '',
        iyiHaber: tur === 'BosIlk-iyi' || el.classList.contains('iyi'),
        eylem: !!el.querySelector('a[href], button'),
      });
    };
    for (const el of document.querySelectorAll('div.ab-blok > span.etiket')) {
      const tur = ETIKETLER[(el.textContent || '').replace(/\s+/g, ' ').trim()];
      if (tur) ekle(el.parentElement, tur);
    }
    for (const el of document.querySelectorAll('.bos')) ekle(el, 'satirIci');

    /* ══ CÜMLESİZ BOŞ YÜZEY ═══════════════════════════════════════════
       ── ÖLÇÜLEN KUSUR (Brief M · FAZ 1) ─────────────────────────────
       Düzeltme turunda `VeriTablosu` KENDİ boş durumunu bıraktı ve
       gerekçe doğruydu: paylaşılan bir bileşen boşluğun SEBEBİNİ
       bilemez. Ama sonucu bir delik açtı — bugün sıfır satırlı bir
       tablo HİÇ CÜMLE OLMADAN render edilebiliyor. Cümle yoksa kaynak
       türeticisi onu göremez (okuyacağı bir metin yoktur), kütüğe
       girmez ve "eylemsiz 0" yeşil kalır. Kütük bir satırı SİLEREK
       iyileşmişti; bu bir bulgudur.

       Kaynak türeticisi bunu YAPISAL OLARAK ölçemez: "bu tablo boş
       render edilecek mi" sorusunun cevabı çalışma anındadır. Diş bu
       yüzden TANIKTA durur.

       ── ÖLÇÜT ───────────────────────────────────────────────────────
       Sıfır VERİ SATIRI olan her görünür tablo/liste için, düğümün
       KAPSAMINDA bir boş durum cümlesi bulunmalıdır. Kapsam = en yakın
       bölüm atası; cümle = ürünün kendi boş durum işaretleri
       (`BosIlk` · `BosFiltre` · `.bos` · `.ab-vt-cagiran`) ya da o
       kapsamda tablonun BAŞLIĞI OLMAYAN, en az 12 karakterlik görünür
       bir metin. İkisi de yoksa yüzey CÜMLESİZDİR. */
    const YUKLENIYOR = (el) => !!el.closest('.ab-iskelet, [aria-busy="true"]')
      || !!el.querySelector('.ab-iskelet');
    /* Kapsam ve işaret tanımları AŞAĞIDA kullanılan yerlerden ÖNCE. */
    /* Kapsam DAR tutulur: `main` BİLEREK yok. Sayfanın herhangi bir
       yerindeki bir boş durum işareti, BAŞKA bir bölümdeki cümlesiz
       tabloyu aklıyordu — ölçüt o zaman "sayfada bir yerde cümle var"
       olur ve dişin ölçtüğü şey kaybolur. */
    const BOLUM = 'section, article, .ab-blok, .ab-panel, .ab-kutu, .ab-kart';
    /* Ürünün KENDİ boş durum sözleşmesi. Genel metin yedeği DENENDİ ve
       GERİ ALINDI (ölçüldü: diş 0 buldu, çünkü her kapsayıcıda başlık,
       süzgeç etiketi ya da düğme metni var — yedek "cümle" diye onları
       sayıyordu ve diş ÖLÜ kalıyordu). Başlık bir boş durum cümlesi
       değildir: sebebi söylemez, çözüme işaret etmez ve boş durum
       kütüğüne girmez. Ölçülen şey tam olarak budur — sözleşmeye
       girmeyen bir boşluk, kütüğün göremediği bir boşluktur. */
    const ISARET = '.bos, .ab-vt-cagiran, .ab-bos';
    const veriSatiri = (t) => {
      /* `tbody` yoksa tarayıcı onu kendisi kurar; yine de savunmalı. */
      const govde = t.tBodies && t.tBodies.length ? t.tBodies[0] : null;
      if (!govde) return t.querySelectorAll('tr').length
        - t.querySelectorAll('thead tr').length;
      return govde.querySelectorAll('tr').length;
    };
    /* ── `gorunur` BURADA KULLANILAMAZ (ölçülmüş kusur) ──────────────
       İlk yazım `gorunur(dugum)` istiyordu ve diş POPÜLASYONU SIFIRA
       düşürüyordu: SIFIR SATIRLI bir listenin YÜKSEKLİĞİ SIFIRDIR, yani
       aradığı şeyin tanımı gereği eleniyordu. Diş "0 kusur" diyordu ve
       hiçbir şeye bakmamıştı — bu turun kovaladığı kusurun ta kendisi,
       bu kez kendi dişimde. Burada yalnız GİZLENMİŞ olma sorulur. */
    const gizli = (el) => {
      const st = getComputedStyle(el);
      return st.display === 'none' || st.visibility === 'hidden'
        || !el.isConnected || !!el.closest('[hidden], [aria-hidden="true"]');
    };
    /* ── ÜRÜNÜN BEYAN ETTİĞİ BOŞ VERİ YÜZEYİ ─────────────────────────
       Paylaşılan tablo sıfır satırda HİÇBİR ŞEY çizmiyor; ortada bir
       `<table>` bile olmadığı için aşağıdaki tarama onu göremez.
       Bileşen bu yüzden görünmez bir işaret basıyor
       (`[data-bos-yuzey]`) ve tanık sözleşmeyi buradan okur. */
    for (const isaret of document.querySelectorAll('[data-bos-yuzey]')) {
      cikan.veriYuzeyi += 1;
      cikan.bosYuzeySayisi += 1;
      const kapsam = isaret.closest(BOLUM) || isaret.parentElement;
      if (!kapsam) continue;
      const cumleVar = !!kapsam.querySelector(ISARET)
        || !!kapsam.querySelector('div.ab-blok > span.etiket');
      if (cumleVar) continue;
      cikan.cumlesiz.push({
        etiket: isaret.getAttribute('data-bos-yuzey'),
        kapsam: (kapsam.getAttribute('class') || kapsam.tagName).slice(0, 60),
        baslik: (kapsam.innerText || kapsam.textContent || '')
          .replace(/\s+/g, ' ').trim().slice(0, 80),
      });
    }
    for (const dugum of document.querySelectorAll('table, ul, ol')) {
      if (gizli(dugum) || YUKLENIYOR(dugum)) continue;
      cikan.veriYuzeyi += 1;   /* TARANAN yüzey: taban buradan gelir */
      /* İç içe liste/tablo iki kez sayılmasın: en dıştaki boş olan alınır. */
      if (dugum.parentElement && dugum.parentElement.closest('table, ul, ol')) continue;
      const sayi = dugum.tagName === 'TABLE'
        ? veriSatiri(dugum)
        : dugum.querySelectorAll(':scope > li').length;
      if (sayi > 0) continue;
      const kapsam = dugum.closest(BOLUM) || dugum.parentElement;
      if (!kapsam) continue;
      /* Ürünün KENDİ boş durum işareti kapsamda mı? */
      let cumleVar = !!kapsam.querySelector(ISARET)
        || !!kapsam.querySelector('div.ab-blok > span.etiket');
      cikan.bosYuzeySayisi += 1;   /* POPÜLASYON: kaç sıfır satırlı düğüme bakıldı */
      if (cumleVar) continue;
      cikan.cumlesiz.push({
        etiket: dugum.tagName.toLowerCase(),
        kapsam: (kapsam.getAttribute('class') || kapsam.tagName).slice(0, 60),
        baslik: (dugum.querySelector('thead') ? dugum.querySelector('thead').innerText : '')
          .replace(/\s+/g, ' ').trim().slice(0, 80),
      });
    }
    /* İKİNCİ ŞEKİL: tablo HİÇ RENDER EDİLMEMİŞ olabilir. `VeriTablosu`
       sıfır satırda `null` döndürüyor — yani ortada bir `<table>` bile
       yok ve yukarıdaki tarama onu göremez. O yüzden görünür ama
       METNİ OLMAYAN bölüm kapsayıcıları da sayılır. */
    for (const k of document.querySelectorAll(BOLUM)) {
      if (!gorunur(k) || YUKLENIYOR(k)) continue;
      if (k.querySelector(BOLUM)) continue;          // yalnız YAPRAK bölüm
      const metin = (k.innerText || k.textContent || '').replace(/\s+/g, ' ').trim();
      if (metin.length >= 12) continue;
      cikan.kapsayiciBos.push({
        kapsam: (k.getAttribute('class') || k.tagName).slice(0, 60),
        metin: metin.slice(0, 40),
      });
    }
    return cikan;
  }, { taban: CUMLE_TABANI, tavan: CUMLE_TAVANI });
}

/** Gezilecek rota kümesi — envanterden TÜRETİLİR, elle liste yok. */
/* ── ATLANAN ROTA SESSİZ DÜŞMEZ (düzeltme turu · tur 2 · P3-10) ──────
   Eski yazımda iki `continue` vardı ve birinin yorumu "atlanır, SAYILIR"
   diyordu — ama sayılmıyordu: rota `atlanan`a hiç girmiyor, kütükte iz
   bırakmıyordu. Bekçi de `atlanan` listesinin BOŞ olmasını istiyordu,
   yani tanık rota kaybettikçe kapı daha da mutlu oluyordu. Tanığın
   göremediği yer, ayrışmanın göremediği yerdir: körlük sıfır kusura
   dönüşüyordu.

   Bugün atlama İŞARETLİ: sebebiyle `atlanan`a girer ve bekçi sebebin
   BİLİNEN bir sınıftan olmasını ve sayının tavan altında kalmasını
   ister. Atlamanın kendisi meşru olabilir; SESSİZ olması olamaz. */
function rotalar(atlananListesi) {
  const liste = [];
  for (const s of sayfaEnvanteri()) {
    if (s.dinamik.length === 0) { liste.push(s.rota); continue; }
    if (s.dinamik.length > 1) {
      atlananListesi.push({ rota: s.rota, sebep: 'cok-parametreli' });
      continue;
    }
    const kalip = s.rota;
    const t = tohumDegeri(kalip);
    if (t.hata || !t.degerler?.length) {
      atlananListesi.push({ rota: kalip, sebep: `tohum-degeri-yok: ${t.hata ?? 'boş'}` });
      continue;
    }
    liste.push(kalip.replace(/\[[^\]]+\]/, t.degerler[0]));
  }
  return [...new Set(liste)].sort();
}

const BOS_KOSUM = process.argv.includes('--bos');

/* ── BOŞ KURULUM FİKSTÜRÜ ─────────────────────────────────────────────
   Göç zinciri + TEK kurucu hesap. Tohum YOK: ölçülmek istenen hâl tam
   olarak "müşterinin birinci günü". Kurucu, ürünün KENDİ aracıyla
   açılır — buraya ikinci bir hesap açma yolu yazmak, o aracın
   "kurulumda bir kullanıcı varsa hiçbir şey yazma" korumasını kapının
   içinden delmek olurdu. */
const BOS_GIRIS = { eposta: 'kurgusal.kurucu@bos.local', parola: 'BosKurulumKurgusalParola-2026' };
let bosDbYolu = null;
let bosSunucu = null;

async function bosKurulumKur() {
  const { mkdtempSync, mkdirSync, rmSync } = await import('node:fs');
  const { execFileSync, spawn } = await import('node:child_process');
  /* ── ÇALIŞMA DİZİNİ DEPO İÇİNDE ─────────────────────────────────────
     Ölçüldü: `os.tmpdir()` altına yazılan `prisma.config.ts` "Failed to
     load config file … as a TypeScript/JavaScript module" ile düştü —
     `prisma/config` içe aktarımı orada çözülemiyor (yukarı doğru
     `node_modules` yok). Boş kurulum duman kapısı da bu yüzden
     `.parti/` altında çalışıyor. */
  const yuva = path.join(WEB, '.parti');
  mkdirSync(yuva, { recursive: true });
  const dizin = mkdtempSync(path.join(yuva, 'dom-tanik-bos-'));
  bosDbYolu = path.join(dizin, 'bos.db');
  const url = `file:${bosDbYolu}`;
  /* ── GÖÇ HEDEFİ `DATABASE_URL` DEĞİL, AYAR DOSYASIDIR ─────────────
     Ölçüldü: `prisma.config.ts` veri kaynağını SABİT yazıyor
     (`file:prisma/dev.db`), yani `DATABASE_URL` ile başka bir dosyaya
     göç edilemiyor — komut "No pending migrations" deyip GEÇİYOR ve
     ardından kurucu adımı "table Kullanici does not exist" ile
     düşüyordu. Sessizce yanlış veritabanına bakan bir kurulum, bu
     kapının ölçmek istediği şeyi baştan kaybettirirdi.
     Kalıp boş kurulum duman kapısından alındı (`tests/
     bos-kurulum-duman.test.ts`): koşuma özel bir ayar dosyası yazılır. */
  const ayar = path.join(dizin, 'prisma.config.ts');
  writeFileSync(ayar, [
    "import { defineConfig } from 'prisma/config';",
    'export default defineConfig({',
    `  schema: ${JSON.stringify(path.join(WEB, 'prisma', 'schema.prisma'))},`,
    `  migrations: { path: ${JSON.stringify(path.join(WEB, 'prisma', 'migrations'))} },`,
    `  datasource: { url: ${JSON.stringify(url)} },`,
    '});',
    '',
  ].join('\n'));
  execFileSync(path.join(WEB, 'node_modules', '.bin', 'prisma'),
    ['migrate', 'deploy', '--config', ayar],
    { cwd: WEB, stdio: 'pipe', env: { ...process.env, BROWSER: 'none' } });
  /* Kurucu hesap: ürünün KENDİ aracı, BELGELENMİŞ komut satırından —
     modülü içe aktarmak değil. İki sebep: (1) `docs/KURULUM.md`'nin
     müşteri mühendisine yazdırdığı yolun ta kendisi budur, yani kapı
     ürünün gerçek kurulum yolunu sürer; (2) parola yalnız stdin'den
     geçer, `ps` çıktısına düşmez — aracın kendi kuralı. */
  execFileSync('npx', ['tsx', 'arac/kurucu-hesap.ts',
    `--eposta=${BOS_GIRIS.eposta}`, '--ad=Kurgusal Kurucu'],
  { cwd: WEB, env: { ...process.env, DATABASE_URL: url },
    input: BOS_GIRIS.parola, stdio: ['pipe', 'pipe', 'pipe'] });
  /* Sunucu AYRI portta: tohumlu koşumun sunucusu ayakta kalabilir. */
  const port = Number(process.env.BOS_PORT ?? 3211);
  bosSunucu = spawn('npx', ['next', 'start', '-p', String(port)], {
    cwd: WEB, env: { ...process.env, DATABASE_URL: url, PORT: String(port) },
    stdio: 'pipe', detached: true,
  });
  const kok = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i += 1) {
    try {
      const y = await fetch(`${kok}/giris`, { signal: AbortSignal.timeout(2000) });
      if (y.ok) return { kok, dizin, rmSync };
    } catch { /* henüz kalkmadı */ }
    await new Promise((r) => { setTimeout(r, 1000); });
  }
  throw new Error(`boş kurulum sunucusu ${port} portunda kalkmadı`);
}

const atlanan = [];
const cumlesizYuzeyler = [];   // sıfır satırlı ama cümlesiz tablo/liste
let bosYuzeyPopulasyonu = 0;   // BAKILAN sıfır satırlı düğüm sayısı
let veriYuzeyiPopulasyonu = 0; // TARANAN tablo/liste sayısı (taban)
const bosKapsayicilar = [];    // görünür ama metinsiz bölüm kapsayıcısı
const ROTALAR = rotalar(atlanan);
const politikaAdaylari = new Map();   // metin → [rota]
const bosDurumlar = new Map();        // metin → { rotalar, sinif, eylem } · EN KÖTÜ hâl

/* Boş koşumda kök ve kimlik FİKSTÜRDEN gelir; tohumlu koşumda aynen
   eski davranış. */
const fikstur = BOS_KOSUM ? await bosKurulumKur() : null;
const SUNUCU = fikstur ? fikstur.kok : KOK;
const OTURUM = BOS_KOSUM ? BOS_GIRIS : undefined;

const browser = await chromium.launch({
  executablePath: tarayiciYolu(), headless: true, args: ['--no-sandbox'],
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await girisYap(page, SUNUCU, OTURUM);
  for (const rota of ROTALAR) {
    try {
      const yanit = await page.goto(`${SUNUCU}${rota}`, { waitUntil: 'networkidle', timeout: 30_000 });
      if (!yanit || yanit.status() >= 400) { atlanan.push({ rota, sebep: `HTTP ${yanit?.status() ?? '—'}` }); continue; }
      const { politika, bos, cumlesiz, bosYuzeySayisi, veriYuzeyi, kapsayiciBos } = await sayfaTopla(page);
      veriYuzeyiPopulasyonu += veriYuzeyi;
      for (const c of cumlesiz) cumlesizYuzeyler.push({ rota, ...c });
      bosYuzeyPopulasyonu += bosYuzeySayisi;
      for (const k of kapsayiciBos) bosKapsayicilar.push({ rota, ...k });
      for (const m of politika) {
        if (!politikaMi(m)) continue;
        const k = duz(m);
        if (!politikaAdaylari.has(k)) politikaAdaylari.set(k, []);
        if (!politikaAdaylari.get(k).includes(rota)) politikaAdaylari.get(k).push(rota);
      }
      for (const b of bos) {
        /* ── İLK GELEN DEĞİL, EN KÖTÜ HÂL KAZANIR (P3-11) ────────────
           Eski yazım `if (!bosDurumlar.has(k))` diyordu: aynı metin iki
           ekranda görünüyorsa yalnız İLKİNİN öznitelikleri saklanıyordu.
           Birinci ekranda eylem varsa, ikincideki EYLEMSİZ hâl kütüğe
           hiç girmiyordu — ve cırcırın tuttuğu sayı tam olarak
           "eylemsiz 0"dı. İlk gelenin kazandığı bir ölçüm, ölçtüğü
           kusuru saklar. */
        const k = duz(b.metin);
        const varolan = bosDurumlar.get(k);
        if (!varolan) {
          bosDurumlar.set(k, {
            rotalar: [rota], tur: b.tur, sinif: b.sinif, iyiHaber: b.iyiHaber, eylem: b.eylem });
          continue;
        }
        if (!varolan.rotalar.includes(rota)) varolan.rotalar.push(rota);
        varolan.eylem = varolan.eylem && b.eylem;          // eylemsiz hâl kazanır
        varolan.iyiHaber = varolan.iyiHaber && b.iyiHaber; // muafiyet DARALIR
      }
    } catch (e) { atlanan.push({ rota, sebep: e.message.slice(0, 120) }); }
  }
  await context.close();
} finally {
  await browser.close();
  /* TEMİZLİK SON KOŞULUNU DOĞRULAR: "durdurdum · sildim" diyen adım
     dediğini yaptığını ÖLÇER. Öldüren sinyal, doğrulayan `fetch` —
     tek araca bakan kontrol, o araç yoksa kandırılır. */
  if (fikstur) {
    try { process.kill(-bosSunucu.pid, 'SIGTERM'); } catch { /* zaten gitti */ }
    let kapandi = false;
    for (let i = 0; i < 20; i += 1) {
      try {
        await fetch(`${fikstur.kok}/giris`, { signal: AbortSignal.timeout(1000) });
      } catch { kapandi = true; break; }
      await new Promise((r) => { setTimeout(r, 500); });
    }
    if (!kapandi) throw new Error(`boş kurulum sunucusu KAPANMADI: ${fikstur.kok}`);
    fikstur.rmSync(fikstur.dizin, { recursive: true, force: true });
    const { existsSync } = await import('node:fs');
    if (existsSync(bosDbYolu)) throw new Error(`boş kurulum veritabanı SİLİNMEDİ: ${bosDbYolu}`);
  }
}

const kutuk = {
  uretilme: new Date().toISOString(),
  rota: ROTALAR,
  atlanan,
  politikaAdaylari: [...politikaAdaylari.entries()]
    .map(([cumle, rotalar]) => ({ cumle, rotalar })).sort((a, b) => a.cumle.localeCompare(b.cumle)),
  bosDurumlar: [...bosDurumlar.entries()]
    .map(([metin, d]) => ({ metin, ...d })).sort((a, b) => a.metin.localeCompare(b.metin)),
  /* DİŞİN POPÜLASYONU: kaç tablo/liste/işaret tarandı. Sayı YAZILMAZSA
     kapı onu 0 okur ve "sıfır ölçümle kusur yok" hâline döner — ölçüldü,
     ilk yazımda alan kütüğe hiç girmiyordu. */
  veriYuzeyi: veriYuzeyiPopulasyonu,
  /* Sıfır satırlı ama kapsamında CÜMLE OLMAYAN yüzeyler (Brief M · FAZ 1). */
  cumlesizYuzeyler: cumlesizYuzeyler
    .sort((a, b) => `${a.rota}${a.baslik}`.localeCompare(`${b.rota}${b.baslik}`)),
};

console.log(`DOM tanığı${BOS_KOSUM ? ' · BOŞ KURULUM' : ''}: ${ROTALAR.length} rota gezildi · atlanan ${atlanan.length}`);
console.log(`  politika adayı: ${kutuk.politikaAdaylari.length}`);
console.log(`  boş durum: ${kutuk.bosDurumlar.length}`);
console.log(`  taranan veri yüzeyi (tablo/liste): ${veriYuzeyiPopulasyonu}`);
console.log(`  sıfır satırlı düğüm: ${bosYuzeyPopulasyonu}`);
console.log(`  METİNSİZ bölüm kapsayıcısı: ${bosKapsayicilar.length}`);
console.log(`  CÜMLESİZ boş yüzey: ${kutuk.cumlesizYuzeyler.length}`);
for (const c of kutuk.cumlesizYuzeyler) {
  console.log(`    ${c.rota} · <${c.etiket}> · kapsam "${c.kapsam}" · başlık "${c.baslik}"`);
}
for (const a of atlanan) console.log(`  atlandı ${a.rota} — ${a.sebep}`);

/* ── ÖLÇÜM TABANI · `olcum-tabani.json` (düzeltme turu · tur 2 · P2-3) ──
   Sıfır rota gezen bir tanık sıfır ayrışma bulur; ama sabit `30`
   ARACIN İÇİNE yazılıydı ve tanık 65 rota geziyordu — otuz beş rota
   kaybedilse araç yine "yeterli" diyordu. Kendi kütüğünü yazan araç
   tabanını da yazar: taban ancak `--taban-yaz --sebep="..."` ile ve
   gerekçesi DOSYAYA işlenerek iner. */
const TANIK_TABANLARI = [
  ['tanik.rota', ROTALAR.length],
  ['tanik.cumle', kutuk.politikaAdaylari.length],
  ['tanik.bosDurum', kutuk.bosDurumlar.length],
];
if (BOS_KOSUM) {
  /* Boş koşum tanık TABANLARINI yazmaz ve doğrulamaz: gezdiği rota
     kümesi aynı, ama gördüğü cümle/boş durum sayısı DOĞASI GEREĞİ
     farklıdır (veri yok). O tabanlar tohumlu koşumun ölçüsüdür;
     buradan yazmak ikisini karıştırırdı. */
} else if (process.argv.includes('--taban-yaz')) {
  for (const [anahtar, olculen] of TANIK_TABANLARI) {
    const { onceki, yeni } = tabanYaz(anahtar, olculen, { sebep: sebepBayragi(process.argv) });
    console.log(`taban yazıldı: ${anahtar} ${onceki ?? '—'} → ${yeni}`);
  }
} else {
  for (const [anahtar, olculen] of TANIK_TABANLARI) tabanDogrula(anahtar, olculen);
}

if (process.argv.includes('--yaz')) {
  const hedef = BOS_KOSUM ? CIKTI_BOS : CIKTI;
  writeFileSync(hedef, `${JSON.stringify(kutuk, null, 2)}\n`);
  console.log(`güncellendi: ${path.relative(WEB, hedef)}`);
}
