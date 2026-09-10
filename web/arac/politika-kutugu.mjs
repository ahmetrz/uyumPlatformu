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
export const S1_KALIBI = /\byetki\w*|\bkapsam\w*|\byalnız SİZE\b|\bsır\b|\bMFA\b|dört göz|onaylayamaz|ağa .*paket|\btara(maz|nmaz|mıyor)\b|salt okunur|\bgöremez\b|\bgiremez\b|\bokuyucu\b|\bdemo hesab/iu;
export const S2_KALIBI = /\bsilinmez\b|\bsilmez\b|\bdeğiştirilemez\b|\bdeğiştirmez\b|\bmotor\b|\bsunucu\b|aktifleştir\w*|uydur\w*|\barşiv\w*|\bdokunmaz\b|\byazmaz\b|\byazılmaz\b|\byazılamaz\b|\bkaydedilmez\b|\bgüncellenmez\b|\bkesmez\b|\büretmez\b|geri alınamaz|\bgizlenmez\b|\breddeder\b/iu;

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
    }
  }
  return cikan.sort((a, b) => a.cumle.localeCompare(b.cumle, 'tr'));
}

export function kutuguOku() {
  return JSON.parse(readFileSync(KUTUK, 'utf8'));
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
