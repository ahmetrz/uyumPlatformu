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
import { sebepBayragi, tabanDogrula, tabanYaz } from './olcum-tabani.mjs';

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
   app+lib/eylemler2 119 · app+lib 293.

   ── `components/` EKLENDİ (düzeltme turu · inceleme bulgusu P1-1 eki) ──
   Boş durum türeticisi `['app','components']` tarıyordu; yani depo kendi
   ölçümüyle `components/`i EKRAN yüzeyi sayıyor, politika türeticisi ise
   onu beyansız dışarıda bırakıyordu. İki kütüğün aynı ürünün aynı
   yüzeyleri için farklı evrenler kullanması, hangisinin doğru olduğunu
   sormayı imkânsız kılar. Ölçüldü: `components/kabuk/temel.tsx`te ekrana
   çıkan "`…` bağlayıcısı bu ortamda tanımlı değil; … bu yüzden
   gösterilmez" cümlesi ne taranıyor ne sayılıyordu. */
/* Cümle uzunluk sınırları TEK YERDE. İki ayrı yerde iki ayrı sayı
   tutmak, DOM tanığının yakaladığı dördüncü körlüğü üretmişti. */
export const CUMLE_TABANI = 25;
export const CUMLE_TAVANI = 400;
/* ── DİZE SABİTLERİ REGEXLE DEĞİL, TARAYICIYLA OKUNUR ────────────────
   Eski kalıp `'([^'\\\n]{25,300})'|"..."|\`...\`` idi ve ÖRTÜŞME
   TEHLİKESİ taşıyordu: alternatifler açgözlüdür, bir eşleşme kendinden
   sonraki tırnakları YUTAR ve yutulan bölgedeki dize hiç görünmez.
   Tehlike ölçüldü — tavan 300'den 400'e çıkarılınca POL-062
   (`eyebrow="Platform sağlığı · reddedilen kayıtlar"`) kütükten SESSİZCE
   düştü: daha uzun bir eşleşme onun bölgesini kapsamıştı. Yani tavanı
   YÜKSELTMEK, ölçülen popülasyonu KÜÇÜLTÜYORDU.

   Bugün dizeler bir sözcük çözümleyicisinin yapacağı gibi okunur:
   açılış tırnağından KAPANIŞ tırnağına kadar, kaçış karakterleri
   atlanarak; tarama kapanıştan SONRA devam eder. Sınır değiştiğinde
   hangi dizelerin görüldüğü DEĞİŞMEZ — yalnız hangilerinin elendiği
   değişir. */
/* Türkçe KESME İŞARETİ bir tırnak DEĞİLDİR (düzeltme turu · tur 2 · P2-6).
   `EPDK'nın` · `2024'te` · `TEİAŞ'ın` — JSX metninde kesme işareti
   harften ya da rakamdan SONRA gelir; bir dize açılışı ise gelmez
   (`foo'bar'` JavaScript'te sözdizimi hatasıdır). Tarayıcı bu ayrımı
   yapmadığı için kesme işaretini açılış sayıyor, bir sonrakine kadar
   olan bölgeyi "dize" okuyor ve o bölgeyi ATLIYORDU — arada başlayan
   gerçek bir dize sessizce yutulabilirdi. Aynı sınıf tavan 300→400
   yükseltmesinde ÖLÇÜLMÜŞTÜ (POL-062 kütükten düşmüştü); bu sefer
   tetikleyici tavan değil, taranan 224 dosyada geçen Türkçe ekti. */
const HARF_VEYA_RAKAM = /[\p{L}\p{N}]/u;

export function kaynakDizeleri(kod, taban = CUMLE_TABANI, tavan = CUMLE_TAVANI) {
  const cikan = [];
  for (let i = 0; i < kod.length; i += 1) {
    const q = kod[i];
    if (q !== "'" && q !== '"' && q !== '`') continue;
    if (q === "'" && i > 0 && HARF_VEYA_RAKAM.test(kod[i - 1])) continue;
    let j = i + 1;
    let kapandi = false;
    while (j < kod.length) {
      const c = kod[j];
      if (c === '\\') { j += 2; continue; }
      if (c === q) { kapandi = true; break; }
      if (c === '\n' && q !== '`') break;   // tek/çift tırnak satır aşmaz
      j += 1;
    }
    if (!kapandi) continue;                 // kapanmayan tırnak: atla, yutma
    const govde = kod.slice(i + 1, j);
    if (govde.length >= taban && govde.length <= tavan) cikan.push(govde);
    i = j;                                  // tarama KAPANIŞTAN sonra sürer
  }
  return cikan;
}

/* ── TARANAN KÖKLER · BEYANLI SINIR ───────────────────────────────────
   Kök listesi bir sınırdır ve sınır olduğu BURADA yazılıdır: ekran
   bileşenleri (`app`, `components`) ve kullanıcıya dönen sunucu ret
   gerekçeleri (`lib/eylemler2`). `lib`in tamamını taramak denendi ve
   GERİ ALINDI: popülasyon 213 → 418'e çıkıyordu ve gelen satırların
   ezici çoğunluğunu tanık hiçbir ekranda GÖRMEMİŞTİ — yani ölçüt
   "ekranın politika cümlesi" değil "kaynakta politika gibi duran her
   dize" hâline geliyordu. Bir turda 205 satırı aceleyle ölçmek, bu
   deponun kaçındığı şeyin ta kendisidir.

   SINIRIN BEKÇİSİ TÜRETİCİ DEĞİL, TANIKTIR: `lib` içindeki bir cümle
   gerçekten ekrana çıkıyorsa DOM tanığı onu görür ve kütükte
   bulamayınca `tests/bekci/dom-tanik.test.ts` KIRMIZI yanar. Kapsamı
   varsayımla değil ÖLÇÜMLE genişletmenin yolu budur. */
const TARANAN = ['app', 'components', 'lib/eylemler2'];
const KUTUK = path.join(KOK, 'arac', 'politika-cumleleri.json');

const HARF = '\\p{L}';
const SOZCUK_BASI = `(?<![${HARF}])`;
const SOZCUK_SONU = `(?![${HARF}])`;

/* ── ÖZNE DE ASCII `\b` KULLANIYORDU (bağımsız inceleme · tur 2 · P1-1) ─
   `YUKLEM` ve sınıf kalıpları Türkçe harf sınırına çevrilmişti; ÖZNE
   atlanmıştı ve kusur aynıydı: `\b` ASCII'dir, Türkçe harfle BAŞLAYAN ya
   da BİTEN bir alternatifte sözcük sınırı hiç kurulmaz. Ölçüldü:

     /\bürün\b/iu.test('Ürün bu engeli aşmaz')  → false

   Sonuç: içlerinde CLAUDE.md'nin S1'i TANIMLARKEN kullandığı arketip de
   vardı — "Bu ürün OT ağında aktif tarama YAPMAZ." Yani "S1 tavanı 0 ·
   yedinci diş" kilitlerinin hepsi o cümlenin ÜSTÜNDEN atlıyordu.

   ── BEYANLI SINIR: GÖVDE GENİŞLETMESİ YAPILMADI ──────────────────────
   İncelemeci gövdeleri KÖK hâline getirmeyi de önerdi (`kütük|kütüğ`,
   `kayıt|kayd`, ardından serbest ek). ÖLÇÜLDÜ ve BU TURDA YAPILMADI:

     bugün (ASCII `\b`)                    216 satır
     yalnız Türkçe sınır (bu düzeltme)     220 satır   (+4)

   Gövde genişletmesi **51** satırlık yeni bir popülasyon açar
   (`korGovdeSayisi()`; ilk turda anılan "105" daha gevşek bir serbest-ek
   denemesinin sayısıydı ve türetilmemişti — bağımsız inceleme · P3-7) ve bu
   kütüğün yedinci dişi SIFIRDA KİLİTLİ: her satır gerçek yol ölçümüyle
   gelmek zorunda. Yüz satırı bir turda aceleyle ölçmek, bu deponun
   kaçındığı şeyin ta kendisidir — aynı gerekçe `TARANAN` kökleri için de
   yazılı. Sınırın BEKÇİSİ türetici değil TANIKTIR: çekimli bir özne
   taşıyan cümle gerçekten ekrana çıkıyorsa DOM tanığı onu görür ve
   kütükte bulamayınca `tests/bekci/dom-tanik.test.ts` KIRMIZI yanar.

   R0 kütüğüne SAHİBİ ve KAPANIŞ AŞAMASIYLA yazıldı (R0-23). */
export const OZNE = new RegExp(
  `${SOZCUK_BASI}(bu ekran|bu kutu|bu liste|bu kurulum\\w*|bu ortam\\w*`
  + `|bu sayfa|bu aktarım|sunucu|motor|kütük|ürün|sistem|platform`
  + `|kayıt|kayıtlar|kapsam|yetki\\w*|hiçbir|otomatik|denetim izi|iz)${SOZCUK_SONU}`,
  'iu');

/* ══ BEYANLI SINIRIN ÖLÇÜSÜ · R0-23 (Brief M · FAZ 3) ═══════════════════
   `OZNE` özneleri YALIN hâlleriyle arar. Türkçede özne çekim eki alır ve
   o hâlleri kalıp GÖRMEZ:

     görülen  : "Bu ekran …"   · "Kayıt silinmez"   · "Motor yazmaz"
     GÖRÜLMEYEN: "Kütüğün …"   · "Kaydı …"          · "Motorun …"
                 "Ürünün …"    · "Sistemin …"       · "Kapsamın …"

   Sınır bu turda GENİŞLETİLMEDİ ve sebebi ölçüldü: gövde + serbest ek
   kalıbı popülasyonu 220'den 325'e çıkarıyor, yani 105 satırlık yeni bir
   borç açıyor — ve bu kütüğün yedinci dişi SIFIRDA KİLİTLİ, her satır
   gerçek yol ölçümüyle gelmek zorunda. Yüz satırı bir turda aceleyle
   ölçmek, bu deponun kaçındığı şeyin ta kendisidir.

   Sınırın DONDURULMASI budur: kör satır sayısı ÖLÇÜLÜR ve BÜYÜYEMEZ.
   Yarın çekimli özneyle yazılan yeni bir politika cümlesi sayıyı
   artırır ve kapı KIRMIZI yanar; yazan kişi ya kalıbın gördüğü bir hâl
   kullanır ya da kalıbı genişletip 105 satırlık borcu üstlenir. Sınırın
   ikinci bekçisi DOM tanığıdır: çekimli özneli bir cümle gerçekten
   ekrana çıkıyorsa tanık onu görür ve kütükte bulamayınca kırmızı yanar.

   R0-23 · Sahip: KODLAYAN · Kapanış: P3 · mesaj kataloğu (arayüz metni
   sözlük anahtarına geçtiğinde tarama metinden ANAHTARA döner ve gövde
   sorunu ortadan kalkar). */
const GOVDE_EKLERI = '(?:[ıiuü]n|[ıiuü]|[ae]|d[ae]|d[ae]n|l[ae]|[ıiuü]m|[ıiuü]z)';
export const OZNE_GOVDE = new RegExp(
  `${SOZCUK_BASI}(kütü[kğ]|kayd?|ürün|sistem|platform|motor|sunucu|kapsam|yetki|iz)`
  + `${GOVDE_EKLERI}${SOZCUK_SONU}`,
  'iu');

/* ── SINIRIN GERÇEK BÜYÜKLÜĞÜ (bağımsız inceleme · P2-14 · P3-8) ─────
   İlk yazım yalnız `korGovdeSayisi()`yi (51) donduruyor ve buna
   "beyanlı sınır donduruldu" diyordu. Ölçüldü: yüklemi olup YALIN
   öznesi olmayan aday sayısı **382**; tavan bunun 51'ini kapsıyordu,
   yani sınırın sekizde birini. Öznesi hiç olmayan ya da on gövdeden
   birini kullanmayan yeni bir cümle ("Onay olmadan yayımlanmaz.")
   kör kümeyi büyütür ve hiçbir kapı kırmızı yanmazdı.

   İkinci düzeltme ADDADIR: `OZNE_GOVDE` gövde+ekini cümlenin HERHANGİ
   bir yerinde arar, özne KONUMUNU sormaz — ölçülen 51 satırın çoğunda
   eşleşen sözcük özne değil ("… bu kayda uygulanmaz" · "Sayılar
   sunucudan ölçülür"). Sayı gerçek bir sınırı dondurur (bu satırlar
   hakikaten kütüğe girmiyor) ama adı yanlıştı. Bugün iki sayı da
   ölçülüyor ve İKİSİ DE tavanlı:

     korGovde  · bilinen bir gövdenin çekimli hâlini TAŞIYAN aday
     korToplam · yüklemi olup YALIN öznesi olmayan BÜTÜN adaylar     */

/** Yüklemi olan ama YALIN özne taşımayan bütün adaylar (sınırın tamamı). */
export function korToplamSayisi() {
  return korAdaylar().length;
}

/** Kalıbın görmediği, bilinen bir gövdenin ÇEKİMLİ hâlini taşıyan adaylar. */
export function korGovdeSayisi() {
  return korAdaylar().filter((c) => OZNE_GOVDE.test(c)).length;
}

/** Ortak yürüyüş — iki sayı da AYNI popülasyondan çıkar. */
function korAdaylar() {
  /* Türeticinin KENDİ yürüyüşü kullanılır (ikinci bir tarama, ikinci bir
     körlük demektir). Fark yalnız ölçüttedir: `politikaMi` yerine
     "yüklem VAR, yalın özne YOK, ÇEKİMLİ özne VAR". */
  const kor = new Set();
  for (const kok of TARANAN) {
    for (const f of readdirSync(path.join(KOK, kok), { recursive: true }).map(String)) {
      if (!/\.(tsx|ts)$/.test(f) || /\.test\.tsx?$/.test(f)) continue;
      const kod = bitisikleriBirlestir(
        yorumsuz(readFileSync(path.join(KOK, `${kok}/${f}`), 'utf8')));
      const adaylar = [...kaynakDizeleri(kod), ...jsxMetinleri(kod)];
      for (const ham of adaylar) {
        const cumle = String(ham).trim();
        if (cumle.length < CUMLE_TABANI || cumle.length > CUMLE_TAVANI) continue;
        if (!YUKLEM.test(cumle)) continue;
        if (OZNE.test(cumle)) continue;            /* zaten görülüyor */
        kor.add(cumle);
      }
    }
  }
  return [...kor];
}

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

/* Satır içi (metni BÖLMEYEN) etiketler: bunlar bir cümlenin ortasında
   durur ve cümleyi ikiye ayırmaz. Blok etiketleri (`p`, `div`, `li`…)
   ayırır ve ayrı cümle sayılır. */
const SATIR_ICI = /<\/?(?:b|strong|em|i|u|code|abbr|small|sup|sub|mark|span|a|Link|Im|Rozet)\b[^>]*>/g;

/** Dengeli `{…}` ifadelerini boşluğa çevirir — iç içe süsleri de sayar. */
export function suslulariAt(metin) {
  let cikan = '';
  let derinlik = 0;
  for (const ch of metin) {
    if (ch === '{') { derinlik += 1; continue; }
    if (ch === '}') { derinlik = Math.max(0, derinlik - 1); cikan += ' '; continue; }
    if (derinlik === 0) cikan += ch;
  }
  return cikan;
}

/**
 * JSX gövdelerindeki STATİK metinler.
 *
 * Kalıp bir metin düğümü değil, BİR BLOK GÖVDESİ alır: açılış etiketinin
 * `>`sinden bir sonraki blok sınırına kadar. Satır içi etiketler ve
 * `{…}` ifadeleri boşluğa çevrilir; böylece `…erişim vermez{' '}` ile
 * `…erişim <strong>vermez</strong>` aynı cümleyi verir.
 */
export function jsxMetinleri(kod) {
  const cikan = [];
  /* Blok sınırı: bir blok etiketinin açılışı ya da kapanışı. */
  const blok = /<\/?(?:p|div|li|ul|ol|td|th|tr|table|section|article|aside|h[1-6]|summary|details|figcaption|label|button|form|option|BosIlk|BosFiltre|Alan|Dugme|VeriTablosu)\b/;
  for (const m of kod.matchAll(/>([^<]*(?:<(?!\/?(?:p|div|li|ul|ol|td|th|tr|table|section|article|aside|h[1-6]|summary|details|figcaption|label|button|form|option|BosIlk|BosFiltre|Alan|Dugme|VeriTablosu)\b)[^<]*)*)/g)) {
    const ham = m[1];
    if (!ham || blok.test(ham)) continue;
    const cumle = suslulariAt(ham.replace(SATIR_ICI, ' '))
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cumle.length < CUMLE_TABANI || cumle.length > CUMLE_TAVANI) continue;
    cikan.push(cumle);
  }
  return cikan;
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
      /* ── DÖRDÜNCÜ KÖRLÜK (DOM tanığı bulgusu) ────────────────────────
         Tavan 300 karakterdi ve bu bir ÖLÇÜ DEĞİL, bir varsayımdı:
         "politika cümlesi uzun olmaz". `/yardim` ekranının 337
         karakterlik "Kapanış bir DOĞRULAMA kapısıdır…" cevabı
         `politikaMi`den GEÇİYOR ama tavana takılıp hiç türetilmiyordu —
         ekranda duran, kullanıcının okuduğu bir yetki iddiası.
         Tanık onu DOM'da gördü, kütükte bulamadı.

         Tavan `CUMLE_TAVANI`ye bağlandı; `jsxMetinleri` zaten aynı
         sayıyı kullanıyor ve iki yerde iki farklı sayı olması bu
         körlüğü ilk etapta üreten şeydi. */
      for (const ham of kaynakDizeleri(kod)) {
        const cumle = ham.trim();
        if (!politikaMi(cumle)) continue;
        if (!cikan.some((c) => c.cumle === cumle)) cikan.push({ yer: rel, cumle });
      }
      /* ── DÜZ JSX METNİ DE TARANIR (bağımsız inceleme · Brief L tur 1) ──
         Tırnaklı dize sabitleri evrenin TAMAMI değildi: ekranda duran
         `<p>Kullanıcı oluşturmak erişim vermez: yetki ayrı verilir…</p>`
         gibi TIRNAKSIZ metin düğümleri türeticinin görüş alanının
         dışındaydı.

         ── ÜÇÜNCÜ KÖRLÜK (düzeltme turu · inceleme bulgusu P1-1) ────────
         İlk yazım `>([^<>{}]{25,300})<` kalıbını kullanıyordu ve karakter
         sınıfı `{` ile `}`yi DIŞLADIĞI için, bir metin düğümünde TEK bir
         `{…}` ifadesi ya da TEK bir satır içi etiket (`<b>`, `<strong>`)
         varsa O DÜĞÜMDEKİ BÜTÜN METİN düşüyordu — ifadenin kendisi değil,
         YANINDAKİ TAM STATİK CÜMLE. Beyan edilen sınır ("değerler çalışma
         anında doğar") atılan şeyi yanlış anlatıyordu.

         Ölçüldü: bu depoda `{t('tesis')}` · `{' '}` · `{sayi}` egemen
         stil; 17 tam statik politika cümlesi (8'i S1) bu yüzden paydanın
         dışında kalmıştı. "175/175 ölçüldü" oranı, kendi düzelttiğini
         iddia ettiği kusurla kör kalmıştı.

         Bugün metin düğümü DÜĞÜM OLARAK okunur: bir açılış etiketinin
         `>`si ile bir sonraki KAPANIŞ/BLOK etiketi arasındaki gövde
         alınır, içindeki `{…}` ifadeleri ve SATIR İÇİ etiketler
         boşluğa çevrilir, kalan statik metin cümledir. Beyanlı sınır
         daralır ve doğrulaşır: atılan şey yalnız ifadenin KENDİ
         DEĞERİDİR, çevresindeki cümle değil. */
      for (const cumle of jsxMetinleri(kod)) {
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

/* ═══════════════════════════════════════════════════════════════════════
   KAÇIŞ KAPISININ KENDİSİ · SAF KARAR

   Yedi dişin yedisi de aynı süzgeçle başlar: `s.sinif === 'POLITIKA'`.
   Ama `sinif` ELLE yazılır. Bu, kilidi bir SAYI değil bir ETİKET
   değiştirerek gevşetmeye açıktı ve açık ölçüldü: `IDDIA_DEGIL` yazıp
   yeterince uzun bir gerekçe eklemek yediyi birden atlatıyordu.

   Üç kusur ayrı ayrı sayılır; sayıya bakan TEK bir cırcır yanlış olurdu:
   türetici genişleyince kütüğe yeni İDDİA OLMAYAN satırlar da girer ve
   salt sayıya bakan bir diş, KÖRLÜĞÜ DÜZELTMEYİ cezalandırırdı.

   (a) SESSİZ İNDİRME — tabanda POLITIKA olan satır bu dalda IDDIA_DEGIL
       olamaz. Kaçış kapısının gerçek kullanımı budur.
   (b) ZAYIF YENİ — tabanda olmayan bir IDDIA_DEGIL satırı, neden iddia
       OLMADIĞINI kusur asgarisi kadar uzun anlatmak zorundadır.
   (c) YENİ S1 KAÇIŞI — cümlesi S1 TÜRETEN yeni bir satır IDDIA_DEGIL
       olamaz. Altıncı dişle simetriktir: orada "S1'de gerekçeli istisna
       kabul edilmez" yazılıydı, ama diş `sinif === 'POLITIKA'` süzgecinin
       ARKASINDAYDI — yani etiketi değiştiren kişi dişin önüne hiç
       gelmiyordu. Sınıf kütükten DEĞİL cümleden türetilir; elle verilen
       etiket burada delil değil, iddianın kendisidir.

   (c)'ye `kapanisAsamasi`/`sahip` zorunluluğu EKLENMEDİ ve sebebi şudur:
   IDDIA_DEGIL bir ERTELEME değildir, bir SINIFLANDIRMADIR — ölçülecek
   bir şey yoktur, dolayısıyla kapanacak bir aşama da yoktur. Oraya bir
   aşama yazmak, hiçbir zaman gelmeyecek bir tarih yazmaktır; "süresiz
   beyan yoktur" kuralını güçlendirmez, anlamsızlaştırır. Yeni S1
   satırının kaçışı ERTELENMEZ, YASAKLANIR.

   Fonksiyon SAF: taban sınıf eşlemesi dışarıdan verilir.
 *
 * @param {Array} satirlar bugünkü kütüğün satırları
 * @param {Map<string,string>} tabanSinif taban daldaki cümle → sınıf
 * @returns {string[]} kusur açıklamaları; boş dizi = temiz
 */
export function kacisKapisiKusurlari(satirlar, tabanSinif) {
  const kusur = [];
  for (const s of satirlar) {
    if (s.sinif !== 'IDDIA_DEGIL') continue;
    if (tabanSinif.get(s.cumle) === 'POLITIKA') {
      kusur.push(`${s.kod}: tabanda POLITIKA idi, bu dalda IDDIA_DEGIL`);
      continue; /* İndirmenin kendisi kusur: gerekçesine bakmaya gerek yok. */
    }
    if (tabanSinif.has(s.cumle)) continue; /* ESKİ ve zaten IDDIA_DEGIL */
    if (sonucSinifi(s.cumle) === 'S1') {
      kusur.push(`${s.kod}: YENİ satırın cümlesi S1 TÜRETİYOR — `
        + 'IDDIA_DEGIL etiketi S1 kaçışı olamaz');
      continue;
    }
    if ((s.gerekce ?? '').trim().length < GEREKCE_ASGARI) {
      kusur.push(`${s.kod}: YENİ IDDIA_DEGIL, gerekçe ${GEREKCE_ASGARI} karakterden kısa`);
    }
  }
  return kusur;
}

/* Doğrudan koşulduğunda: türet ve raporla. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const bulunan = turet();
  /* ── ÖLÇÜM TABANI · P1-4 ──────────────────────────────────────────────
     Taban 131'de KALMIŞTI; ölçülen 215'ti. Aradaki 84 satırlık pencere,
     türeticinin sessizce daralması için açık bir kapıydı: kütük yarıya
     inse bile taban "geçti" derdi. Kapının kendi kütüğünü yazan aracı,
     tabanı da yazmalı — yoksa taban ancak elle güncellenir ve elle
     güncellenen bir taban güncellenmez.

     Taban bu araçtan İNDİRİLEMEZ de: `yazimKarari` düşüş için 40
     karakterlik bir gerekçe ister ve gerekçe DOSYAYA yazılır. */
  if (process.argv.includes('--taban-yaz')) {
    const { onceki, yeni } = tabanYaz('politika.cumle', bulunan.length,
      { sebep: sebepBayragi(process.argv) });
    console.log(`taban yazıldı: politika.cumle ${onceki ?? '—'} → ${yeni}`);
  } else {
    tabanDogrula('politika.cumle', bulunan.length);
  }
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
