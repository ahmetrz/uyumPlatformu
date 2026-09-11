#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   R-F · POLİTİKA CÜMLESİ KÜTÜĞÜ · TÜRETİCİ

   ── NE ÖLÇER ─────────────────────────────────────────────────────────
   Ekranda görünen ve sistemin NE YAPACAĞINI / NE YAPMAYACAĞINI iddia
   eden cümleleri koddan TÜRETİR ve kütükle (`politika-cumleleri.json`)
   karşılaştırır.

   ── NEDEN ELLE LİSTE OLMAZ ───────────────────────────────────────────
   Elle yazılmış liste yeni ekran eklendiği gün eksik kalır ve bekçi ona
   hiç bakmaz. Bu depoda aynı kusur iki kez ölçüldü: kapı iş adları
   (sabit liste, beşinci iş hiç girmedi) ve dışa aktarım yüzeyleri.

   ── KALIP NASIL SEÇİLDİ ──────────────────────────────────────────────
   Politika iddiasını alan doğrulamasından ("Negatif olamaz") ayıran şey
   ÖZNEDİR: iddia sisteme bağlanır. Bu yüzden iki koşul birden aranır —
   bir SİSTEM ÖZNESİ ve bir POLİTİKA YÜKLEMİ. Türkçede yüklemin en güçlü
   işareti olumsuz geniş zamandır (-maz/-mez): "açılmaz", "silmez",
   "değiştirmez".

   Kalıbın kendisi ölçüldü: yalnız yüklem arandığında 1 137 aday çıkıyor
   ve içi alan doğrulaması ve durum etiketiyle doluydu; özne koşulu
   eklenince 72'ye indi.
   ═══════════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const KOK = process.cwd();
/* ── NE TARANIR, NE TARANMAZ · BEYANLI SINIR ──────────────────────────
   R-F'in öznesi EKRANIN iddiasıdır. Ekrana çıkan metin iki yerde yaşar:
   `app/**` (ekranların kendisi) ve `lib/eylemler2/**` (sunucu eyleminin
   fırlattığı ve arayüzün `hata()` ile gösterdiği mesajlar). İkisi de
   taranır.

   `lib/`in geri kalanı taranMAZ ve bu bir eksiklik değil, ÖLÇÜLMÜŞ bir
   sınırdır: tamamı tarandığında aday 293'e çıkıyor ve fark, ekrana hiç
   çıkmayan motor gerekçeleri, iz kaydı metinleri ve günlük satırlarıdır.
   Onları kütüğe almak, ölçülmeyen sayısını ekranın iddialarıyla ilgisi
   olmayan satırlarla şişirir ve cırcırı anlamsız yapardı — cırcır neyi
   koruduğunu bilmediği gün bir sayı bekçisine döner.

   Sınır BURADA yazılıdır ki bir gün genişletilmek istendiğinde
   tartışılacak şey açık olsun. Ölçüm (10 Eyl 2026): app 85 ·
   app+lib/eylemler2 119 · app+lib 293. */
const TARANAN = ['app', 'lib/eylemler2'];
const KUTUK = path.join(KOK, 'arac', 'politika-cumleleri.json');

/** İddiayı SİSTEME bağlayan sözcük. */
export const OZNE = /\b(bu ekran|bu kutu|bu liste|bu kurulum\w*|bu ortam\w*|bu sayfa|bu aktarım|sunucu|motor|kütük|ürün|sistem|platform|kayıt|kayıtlar|kapsam|yetki\w*|hiçbir|otomatik|denetim izi|iz)\b/iu;

/** Sistemin ne yapacağı/yapmayacağı.
 *
 * ── TÜRKÇE HARF `\w` DEĞİLDİR ─────────────────────────────────────────
 * İlk yazımda yüklem `\b\w+m[ae]z\b` idi ve JavaScript'te `\w`
 * `[A-Za-z0-9_]`dir — `u` bayrağı bunu değiştirmez. Sonuç ÖLÇÜLDÜ
 * (bağımsız inceleme, PR #50 tur 1): `aşmaz` · `bağlanmaz` · `açılamaz`
 * gibi Türkçe harf taşıyan yüklemler HİÇ eşleşmiyordu ve mevzuat
 * radarının en çok tekrarlanan iddiası ("ürün bu engeli AŞMAZ") kütüğe
 * hiç girmemişti. Türkçe yazan bir üründe Türkçe harfi görmeyen bir
 * ölçüm aracı, ölçtüğünü sandığı şeyin yarısını görmez.
 *
 * Bugün harf sınıfı `\p{L}` ile kurulur ve sözcük sınırı `\b` yerine
 * harf-olmayan bakışlarla (`(?<![\p{L}])`) verilir: `\b` de ASCII'dir. */
const HARF = '\\p{L}';
const SOZCUK_BASI = `(?<![${HARF}])`;
const SOZCUK_SONU = `(?![${HARF}])`;
export const YUKLEM = new RegExp(
  `(${SOZCUK_BASI}[${HARF}]+m[ae]z${SOZCUK_SONU}`
  + `|${SOZCUK_BASI}[${HARF}]+[ae]m[ae]z(siniz)?${SOZCUK_SONU}`
  + '|\\bzorunlu\\b|\\byalnız(ca)?\\b|\\bsadece\\b'
  + `|\\breddedil[${HARF}]*|\\bizin verilm[${HARF}]*`
  + '|\\bkapalı\\b|\\bdeğişmez\\b)', 'iu');

export const yorumsuz = (m) => m
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((s) => s.replace(/\/\/.*$/, '')).join('\n');

/**
 * `'...' + '...'` ile bölünmüş dizeleri TEK dizeye indirir.
 *
 * ── NEDEN GEREKLİ ─────────────────────────────────────────────────────
 * Bu depoda uzun ekran cümleleri satır sınırına sığsın diye ikiye
 * bölünür ve bu EGEMEN stildir. Türetici her tırnaklı parçayı ayrı
 * eşleştirdiği için, öznesi ilk parçada yüklemi ikinci parçada olan bir
 * cümle İKİSİNDE DE eşleşmiyordu — birleşik hâli politika olsa bile.
 * Ölçüldü (bağımsız inceleme, PR #50 tur 1): birleştirmeyle `app`
 * altındaki aday 76'dan 85'e çıkıyor; dokuz cümle yalnız bölündüğü için
 * görünmezdi.
 *
 * Birleştirme SABİT NOKTAYA kadar yinelenir: üçe bölünmüş bir cümle tek
 * turda ikiye iner, ikinci turda bire.
 */
export function bitisikleriBirlestir(kod) {
  let onceki;
  let simdi = kod;
  do {
    onceki = simdi;
    simdi = simdi.replace(
      /(['"])([^'"\\\n]*)\1\s*\+\s*(['"])([^'"\\\n]*)\3/g,
      (_t, _a, sol, _b, sag) => `'${(sol + sag).replace(/'/g, '')}'`,
    );
  } while (simdi !== onceki);
  return simdi;
}

/** Bir metin sabiti politika cümlesi mi? */
export function politikaMi(s) {
  if (s.split(/\s+/).length < 4) return false;
  /* JSX ve biçem parçası cümle değildir. */
  if (/[<>]|style=\{|className=|var\(--/.test(s)) return false;
  return OZNE.test(s) && YUKLEM.test(s);
}

/* ── SONUÇ SINIFI · TÜRETİLİR ──────────────────────────────────────────
   Bir politika cümlesinin ihlali ne yapar? Üç sonuç, üç sınıf:

     S1 · YETKİ VE GÜVENLİK — ihlali VERİ SIZDIRIR ya da bir OT ağına
          paket yollar. Bu sınıfta gerekçeli istisna KABUL EDİLMEZ.
     S2 · ÜRÜN DEĞİŞMEZİ — ihlali GÜVENİ BOZAR: silinmez dediği kaydı
          siler, dokunmaz dediği alana dokunur.
     S3 · BİLGİLENDİRME — yanıltır ama zarar sınırlıdır ("veri yok",
          "ölçülmedi", "süre belirlenmedi").

   Sınıf ELLE VERİLMEZ, cümleden TÜRETİLİR ve bekçi yeniden türetip
   kütüktekiyle karşılaştırır: elle verilseydi bir cümle S1'den S3'e
   sessizce indirilebilir ve cırcırın en sıkı dişi buharlaşırdı.

   Sıra bağlayıcıdır: bir cümle hem yetki hem değişmez işareti
   taşıyorsa S1 kazanır — sınıflandırma GÜVENLİ TARAFA yanılır. */
/* ── `\b` ASCII'DİR — SINIF KALIPLARINDA DA (bağımsız inceleme · tur 1) ──
   Dosyanın üst kısmında YUKLEM için bir kez ölçülüp düzeltilen kusur,
   SINIF kalıplarına uygulanmamıştı: `\bsır\b` "sırrının" içindeki `sır`ı
   tutmaz (ardından `r` gelir, ASCII sözcük sınırı oluşmaz) ve
   `\bgöremez\b` "görünmez"i hiç görmez. Ölçüldü: POL-118 — "İstemci
   sırrının DEĞERİ hiçbir ekranda görünmez" — bir SIR SIZINTISI iddiası
   olduğu hâlde S3 sayılıyordu; yani S1'in sıfır tavanı ve "S1'de istisna
   yok" dişi onun üzerinden ATLIYORDU. Sınıflandırmanın GÜVENLİ TARAFA
   yanıldığı iddiası bu hâliyle yanlıştı.

   Sözcük sınırı bugün Unicode harf sınıfıyla kurulur; Türkçe ekler
   (sır-rının · gör-ünmez) artık kalıbın dışında kalmaz. */
const H = '(?<![\\p{L}])';   /* sol Unicode sözcük sınırı */
const S = '(?![\\p{L}])';    /* sağ Unicode sözcük sınırı */
export const S1_KALIBI = new RegExp(
  `${H}yetki|${H}kapsam|${H}yalnız SİZE${S}|${H}sır|${H}MFA${S}|dört göz`
  + `|onaylayama|ağa .*paket|${H}tara(maz|nmaz|mıyor)|salt okunur`
  + `|${H}gör(emez|ünmez|ünemez)|${H}gir(emez|ilemez)|${H}okuyucu${S}`
  + `|${H}demo hesab|${H}loglanmaz|${H}tutulmaz${S}`
  /* SIR AİLESİ: token · parola · kimlik bilgisi de sır DEĞERİDİR ve
     sızıntısı S1'dir. Kalıpta yoklardı — "Token hiçbir yanıtta geri
     dönmez." S3 sayılıyordu (bağımsız inceleme · tur 1). */
  + `|${H}token|${H}parola|${H}kimlik bilgisi`,
  'iu',
);
export const S2_KALIBI = new RegExp(
  `${H}silinmez${S}|${H}silmez${S}|${H}değiştirilemez${S}|${H}değiştirmez${S}`
  + `|${H}motor|${H}sunucu|aktifleştir|uydur|${H}arşiv|${H}dokunmaz${S}`
  + `|${H}yazmaz${S}|${H}yazılmaz${S}|${H}yazılamaz${S}|${H}kaydedilmez${S}`
  + `|${H}güncellenmez${S}|${H}kesmez${S}|${H}üretmez${S}|geri alınamaz`
  + `|${H}gizlenmez${S}|${H}reddeder${S}`,
  'iu',
);

export function sonucSinifi(cumle) {
  if (S1_KALIBI.test(cumle)) return 'S1';
  if (S2_KALIBI.test(cumle)) return 'S2';
  return 'S3';
}

export function turet() {
  const cikan = [];
  for (const kok of TARANAN) {
    for (const f of readdirSync(path.join(KOK, kok), { recursive: true }).map(String)) {
      /* DEMO DOSYALARI DA TARANIR. Önce dışlanıyorlardı; oysa demo
         sürümünün "bu kurulumda karara bağlanmaz" cümlesi ekranda
         GÖRÜNEN bir politika iddiasıdır ve `kapi-demo` ile yayımlanan
         gerçek bir yüzeydir. Dışlamak, ürünün en çok gösterilen
         sürümünü R-F'in dışında bırakıyordu. */
      if (!/\.(tsx|ts)$/.test(f) || /\.test\.tsx?$/.test(f)) continue;
      const rel = `${kok}/${f}`;
      const kod = bitisikleriBirlestir(yorumsuz(readFileSync(path.join(KOK, rel), 'utf8')));
      for (const m of kod.matchAll(/'([^'\\\n]{25,300})'|"([^"\\\n]{25,300})"|`([^`\\]{25,300})`/g)) {
        const cumle = (m[1] ?? m[2] ?? m[3]).trim();
        if (!politikaMi(cumle)) continue;
        if (!cikan.some((c) => c.cumle === cumle)) cikan.push({ yer: rel, cumle });
      }
      /* ── DÜZ JSX METNİ DE TARANIR (bağımsız inceleme · Brief L tur 1) ──
         Tırnaklı dize sabitleri evrenin TAMAMI değildi: ekranda duran
         `<p>Kullanıcı oluşturmak erişim vermez: yetki ayrı verilir…</p>`
         gibi TIRNAKSIZ metin düğümleri türeticinin görüş alanının
         dışındaydı. Payda kör olunca "123/123 ölçüldü" oranı da kör olur;
         bu, körlük düzeltilirken açılan ikinci körlüğün (boş durum
         türeticisinde iki kez ölçüldü) politika tarafındaki eşidir.

         Metin düğümü: bir etiketin `>`si ile bir sonraki `<` arasındaki
         gövde. Süslü ifade içeren parçalar atılır — değerleri çalışma
         anında doğar ve statik okuma onları bilemez (beyanlı sınır). */
      for (const m of kod.matchAll(/>([^<>{}]{25,300})</g)) {
        const cumle = m[1].replace(/\s+/g, ' ').trim();
        if (!politikaMi(cumle)) continue;
        if (!cikan.some((c) => c.cumle === cumle)) cikan.push({ yer: rel, cumle });
      }
    }
  }
  return cikan.sort((a, b) => a.cumle.localeCompare(b.cumle, 'tr'));
}

export function kutuguOku() {
  return JSON.parse(readFileSync(KUTUK, 'utf8'));
}

/* ── ALTINCI DİŞ · YENİ CÜMLENİN VARSAYILANI ÖLÇÜLÜDÜR ────────────────
   R-F EKİ. Cırcırın ilk beş dişi TOPLAMA bakar: liste yalnız küçülür,
   tavan ölçülene eşittir, yükselme gerekçe ister. Hepsi doğruydu ve yine
   de bir delik bıraktı — ÖLÇÜLDÜ:

     eski ölçülmeyen 65 · iki eski cümle ölçüldü · bir YENİ cümle
     ölçülmeden eklendi → 64. Cırcırın beş dişi de yeşil. Liste küçüldü,
     ama depoya ölçülmemiş YENİ bir iddia girdi.

   Toplam düşerken içeri sızan cümle, cırcırın göremediği şeydir: cırcır
   BORCU ölçer, borcun BİLEŞİMİNİ değil. Bu yüzden yeni satır ayrı
   yargılanır ve varsayılanı ÖLÇÜLÜ olmaktır.

   Gerekçeli istisna mümkündür — ama iki koşulla: gerekçe KUSURU anlatır
   (maliyeti değil) ve HANGİ AŞAMADA kapanacağını yazar. Aşamasız gerekçe
   kabul edilmez; "süresiz beyan yoktur" kuralının bu kütükteki
   karşılığıdır.

   S1'de istisna HİÇ yoktur. İhlali veri sızdıran bir cümle, gerekçesi ne
   olursa olsun ölçülmeden depoya giremez — R-C bekçisiyle aynı sertlik.

   Fonksiyon SAF tutuldu: taban kütüğü dışarıdan verilir. Böylece kural
   git durumundan bağımsız, sentetik kütüklerle sınanabilir — ve sabotaj
   gerçekten kuralı sabote eder, ölçüm ortamını değil. */

/** Ölçülmeme gerekçesinin asgari uzunluğu. Kısa gerekçe kusuru anlatmaz;
    "vakit yoktu" bir gerekçe değildir. */
export const GEREKCE_ASGARI = 40;

/**
 * Taban dalda OLMAYAN (yani YENİ) politika satırlarının kusurlarını
 * döndürür. Eski satırlar bu dişin konusu değildir — onları cırcırın
 * öbür dişleri tutar.
 *
 * @param {Array} satirlar bugünkü kütüğün satırları
 * @param {Set<string>} tabanCumleleri taban daldaki cümleler
 * @returns {string[]} kusur açıklamaları; boş dizi = temiz
 */
export function yeniSatirKusurlari(satirlar, tabanCumleleri) {
  const kusur = [];
  for (const s of satirlar) {
    if (s.sinif !== 'POLITIKA') continue;
    if (tabanCumleleri.has(s.cumle)) continue; /* ESKİ satır: cırcırın işi */
    if (s.olcum) continue; /* VARSAYILAN yerine gelmiş */

    /* Sınıf kütükten DEĞİL cümleden türetilir: elle verilmiş bir sınıf
       bu dişi S1'den kaçırmak için kullanılabilirdi. */
    if (sonucSinifi(s.cumle) === 'S1') {
      kusur.push(`${s.kod}: YENİ S1 cümlesi ÖLÇÜLMEDEN giremez — `
        + 'S1\'de gerekçeli istisna kabul edilmez');
      continue;
    }
    const b = s.olculmedi;
    if (!b) {
      kusur.push(`${s.kod}: YENİ cümle ne ÖLÇÜM ne GEREKÇE taşıyor — `
        + 'yeni bir politika cümlesinin varsayılanı ölçülü olmaktır');
      continue;
    }
    if (!(b.kapanisAsamasi ?? '').trim()) {
      kusur.push(`${s.kod}: AŞAMASIZ GEREKÇE — hangi aşamada kapanacağı yazılmamış`);
    }
    if ((b.gerekce ?? '').trim().length < GEREKCE_ASGARI) {
      kusur.push(`${s.kod}: YENİ cümlenin ölçülmeme GEREKÇESİ yok ya da `
        + `kusuru anlatmıyor (asgari ${GEREKCE_ASGARI} karakter)`);
    }
  }
  return kusur;
}

/* Doğrudan koşulduğunda: türet ve raporla. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const bulunan = turet();
  const yaz = process.argv.includes('--yaz');
  if (yaz) {
    const eski = (() => { try { return kutuguOku(); } catch { return { satirlar: [] }; } })();
    const eskiler = new Map(eski.satirlar.map((s) => [s.cumle, s]));
    /* YENİ SATIRA BOŞ KOD VERİLİR. İndise göre kod üretmek, listeye bir
       cümle eklendiği gün var olan kodlarla ÇAKIŞIYORDU (ölçüldü: dört
       çift kod). Kod bir kez verilir ve cümle kalktığında geri gelmez. */
    let sonraki = eski.satirlar.reduce(
      (a, s) => Math.max(a, Number((s.kod ?? '').replace('POL-', '')) || 0), 0);
    const satirlar = bulunan.map((b) => {
      const varolan = eskiler.get(b.cumle);
      if (varolan) return varolan;
      sonraki += 1;
      return {
        kod: `POL-${String(sonraki).padStart(3, '0')}`,
        cumle: b.cumle, yer: b.yer, sinif: 'SINIFLANDIRILMADI',
        sonucSinifi: sonucSinifi(b.cumle),
      };
    });
    writeFileSync(KUTUK, `${JSON.stringify({ ...eski, satirlar }, null, 2)}\n`);
    console.log(`kütük yazıldı: ${satirlar.length} satır`);
  } else {
    console.log(`politika cümlesi: ${bulunan.length}`);
    for (const b of bulunan) console.log(`  ${b.yer} :: ${b.cumle.slice(0, 100)}`);
  }
}
