import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  KUNYE_BOY, KUNYE_BOY_PX, KUNYE_EN, KUNYE_EN_COK_YOL, TUVAL_TABAN_PX, kunyeYollari,
  type KunyeNoktasi, type KunyeYeri,
} from '@/app/(kabuk)/(flagship)/kunyeYolu';

const CSS = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../app/kabuk.css'), 'utf8');

/* Takımyıldız künyelerinin çakışmaması — SIS-SAHA-001.

   Kural saf bir fonksiyondadır; vakalar sentetiktir ve ekranın tohum
   verisine bağlı değildir. Böylece sabotaj KURALI sabote eder, ölçüm
   ortamını değil. */

/** İki künye gerçekten üst üste mi? Yeri koordinata çevirip bakar.
 *
 *  ÖLÇÜT KURALIN KENDİ GEOMETRİSİNDEN GELMEZ. Künyenin ekranda nereyi
 *  kapladığı `kabuk.css`te yazılıdır ve burada ELLE modellenir: doğal
 *  künye işaretin ALTINA sarkar (`top: -9px`), `kunye-yukari` künyesi
 *  ÜSTÜNE çıkar (`bottom: 4px`), `--yol` her ikisini de kendi yönünde
 *  bir künye boyu iter. Kuralın `dikeyAralik`ını çağırsaydık ölçüt ile
 *  ölçüm tek kaynaktan gelirdi: o fonksiyonu sabote eden bir değişiklik
 *  ikisini birden bozar ve test yeşil kalırdı (R-E · kırmızı yakmayan
 *  sabotaj bir bulgudur).
 *
 *  Eski model künyeyi noktanın MERKEZİNDE sayıyordu (`|Δy| < boy`) ve
 *  zıt yönlere açılan iki künyeyi "ayrık" görüyordu — kusurun kendisi. */
function ortusenler(noktalar: readonly KunyeNoktasi[], yerler: readonly KunyeYeri[]): number {
  const yer = noktalar.map((n, i) => ({
    a: yerler[i].sola ? n.x - KUNYE_EN : n.x,
    b: yerler[i].sola ? n.x : n.x + KUNYE_EN,
    /* Künye YÖNÜNDE bir şerit kaplar; `yol` onu aynı yönde iter. */
    yAlt: n.yukari
      ? n.y + yerler[i].yol * KUNYE_BOY
      : n.y - (yerler[i].yol + 1) * KUNYE_BOY,
    yUst: n.yukari
      ? n.y + (yerler[i].yol + 1) * KUNYE_BOY
      : n.y - yerler[i].yol * KUNYE_BOY,
  }));
  let n = 0;
  for (let i = 0; i < yer.length; i += 1) {
    for (let j = i + 1; j < yer.length; j += 1) {
      if (yer[i].a < yer[j].b && yer[j].a < yer[i].b
        && yer[i].yAlt < yer[j].yUst && yer[j].yAlt < yer[i].yUst) n += 1;
    }
  }
  return n;
}

/* ═══════════════════════════════════════════════════════════════════════
   SAH-TUV-002 · MODEL İLE EKRAN AYNI SAYIYI KULLANIR

   Künye kutusu PİKSEL, tuval yüksekliği DEĞİŞKEN. Aradaki yüzde elle
   yazıldığı sürece ikisi kaçınılmaz olarak ayrışır ve ayrıştığı an kural
   "bu iki künye ayrık" diyerek çakışmayı geçirir. Ölçüldü (17 Eyl 2026):
   elle yazılan %11, 1440×900'de gerçekte %10,5 · 1366×768'de %12,1'di.

   Bugün yüzde TABANDAN türetilir. Bu blok türetmenin üç ucunu da bağlar:
   TypeScript sabiti, CSS'teki tuval tabanı ve CSS'teki şerit adımı.
   ═══════════════════════════════════════════════════════════════════════ */
describe('SAH-TUV-002 · künye modeli tabandan TÜRETİLİR', () => {
  it('CSS tuval tabanı ile `TUVAL_TABAN_PX` AYNI sayıdır [SAH-TUV-002]', () => {
    const m = CSS.match(/\.ab-b-takim \.ab-tuval-sar > \.ab-tuval \{[^}]*min-height:\s*(\d+)px/);
    expect(m, 'tuval tabanı kuralı bulunamadı — taşınmış olabilir').toBeTruthy();
    expect(Number(m![1]),
      'CSS tabanı ile model tabanı ayrıştı: künye yüzdesi yanlış türer').toBe(TUVAL_TABAN_PX);
  });

  it('yüzde EN KÖTÜ durumdan türer — az ayırmaz [SAH-TUV-002]', () => {
    /* Tuval en kısayken künye en büyük payı kaplar; model o payı
       kullanmalıdır. Aşağı yuvarlamak "ayrık" diyen bir yalan üretir. */
    expect(KUNYE_BOY).toBe(Math.ceil((KUNYE_BOY_PX / TUVAL_TABAN_PX) * 100));
    expect(KUNYE_BOY_PX / TUVAL_TABAN_PX * 100).toBeLessThanOrEqual(KUNYE_BOY);
  });

  it('CSS şerit adımı yüzdesi `KUNYE_BOY` ile aynıdır [SAH-TUV-002]', () => {
    /* `--yol` künyeyi kendi yönünde bir künye boyu iter. CSS başka bir
       yüzde kullanırsa kural ekranda olmayan bir ayrım varsayar. */
    const adimlar = [...CSS.matchAll(/max\(34px,\s*(\d+)cqh\)/g)].map((x) => Number(x[1]));
    expect(adimlar.length, 'şerit adımı kuralları bulunamadı').toBeGreaterThanOrEqual(2);
    for (const a of adimlar) expect(a).toBe(KUNYE_BOY);
  });

  it('piksel taban, CSS künye kutusuyla tutarlıdır [SAH-TUV-002]', () => {
    /* 34px iki satırlık künyenin ölçülen boyudur ve `max(34px, …)` içinde
       CSS'te de yazılıdır; ikisi ayrışırsa taban yanlış yerden türer. */
    expect(CSS).toContain(`max(${KUNYE_BOY_PX}px,`);
  });
});

describe('Künye yolu · çakışma', () => {
  it('TEK nokta doğal yerinde kalır — gereksiz kaydırma yok', () => {
    expect(kunyeYollari([{ x: 50, y: 40, yukari: false, sola: false }])[0])
      .toEqual({ yol: 0, sola: false });
  });

  it('UZAK iki nokta ikisi de doğal yerinde kalır', () => {
    const n: KunyeNoktasi[] = [
      { x: 10, y: 40, yukari: false, sola: false },
      { x: 80, y: 40, yukari: false, sola: false },
    ];
    expect(kunyeYollari(n).map((y) => y.yol)).toEqual([0, 0]);
  });

  it('[SIS-SAHA-001] ÖLÇÜLEN KUSUR · güç kaydı olmayan altı tesis aynı banda iner ve '
    + 'hepsi YUKARI açar — eski kural hiçbirini kaydırmıyordu', () => {
    /* dikey = 8 + √(0/enGuc)·78 = 8 → hepsi `yukari`. Eski kuralda
       `yukari` dalı `kaydir`ı geçersiz kıldığı için altısı da tek
       şeride biniyordu (1440×900'de okunamaz metin üretti). */
    const n: KunyeNoktasi[] = [42, 50, 56, 60, 88, 98].map((x) => ({
      x, y: 8, yukari: true, sola: x > 58,
    }));
    const yerler = kunyeYollari(n);
    /* Yakın olanlar AYRI yere gitmek zorunda; uzaktakiler değil. */
    const anahtar = (y: KunyeYeri) => `${y.yol}/${y.sola}`;
    expect(anahtar(yerler[0])).not.toBe(anahtar(yerler[1]));
    expect(anahtar(yerler[1])).not.toBe(anahtar(yerler[2]));
    /* Çakışma sayısı SIFIR OLMAK ZORUNDA DEĞİL — tavan dolduğunda kural
       çakışmayı kabul eder. Ölçülen: altı künyenin en çok biri çakışır
       ve hiçbiri tavanı aşmaz. */
    expect(ortusenler(n, yerler), 'çakışma beklenenden çok').toBeLessThanOrEqual(1);
    expect(yerler.every((y) => y.yol <= KUNYE_EN_COK_YOL)).toBe(true);
  });

  it('[SIS-SAHA-001] ÜÇ nokta kümelendiğinde künyeler AYRILIR ama hiçbiri '
    + 'tavanı aşmaz — tek basamaklı kaydırma ikinci ve üçüncüyü aynı yere '
    + 'koyuyordu, sınırsız kaydırma ise künyeyi işaretinden koparıyordu', () => {
    const n: KunyeNoktasi[] = [
      { x: 50, y: 40, yukari: false, sola: false },
      { x: 52, y: 41, yukari: false, sola: false },
      { x: 54, y: 42, yukari: false, sola: false },
    ];
    const yerler = kunyeYollari(n);
    expect(yerler.every((y) => y.yol <= KUNYE_EN_COK_YOL),
      'künye tavanı aştı').toBe(true);
    /* İlk iki künye gerçekten ayrıldı; üçüncüsü tavanın içinde yer
       bulabildiyse o da ayrı durur. Ölçülen: en az iki ayrı yer. */
    expect(new Set(yerler.map((y) => `${y.yol}/${y.sola}`)).size,
      'hiçbir künye kaçmamış').toBeGreaterThanOrEqual(2);
  });

  it('[SIS-SAHA-001] TAVANIN KENDİSİ SINIRLIDIR — sabotaj turunda yakalandı: '
    + 'iddia tavanı SABİTE karşı ölçüyordu, sabiti 99 yapmak kuralı '
    + 'sessizce geçiriyordu', () => {
    /* SINIR PİKSELDİR — ve hep öyleydi. Bu iddia eskiden "üç şerit ≤ 33"
       diyordu; 33 sayısı "%11 × 300px tuval ≈ 33px"ten geliyordu, yani
       yüzdeyle yazılmış bir PİKSEL sınırıydı. Tuvalin yüksekliği
       değiştiği an ölçüt kendiliğinden kaydı: taban 245'e inince aynı
       34px'lik künye %14 oldu ve 3 × 14 = 42 > 33 diye KIRMIZI yandı —
       oysa ekranda mesafe değişmemişti, hâlâ 3 × 34 = 102px.

       Tasarım sınırı üç künye boyudur: saç telinin hâlâ doğru işareti
       gösterdiği mesafe (ölçülen kusur 9 yoldu, ≈303px). Bugün doğrudan
       pikselle yazılıyor. Tavan 105: ölçülen 102px'in üstünde küçük bir
       pay bırakır (künye kutusu bir piksel oynarsa yanlış kırmızı
       yanmasın), ama DÖRDÜNCÜ şerit (4 × 34 = 136px) geçemez.

       Sayıyı yükseltmek kuralı zayıflatmaktır ve GÖRÜNÜR olmalıdır —
       "taban indirmesi ve tavan yükseltmesi gerekçe ister" kuralının bu
       kütükteki karşılığı. */
    expect(KUNYE_EN_COK_YOL, 'künye tavanı yükseltilmiş — gerekçesi '
      + '`kunyeYolu.ts` içinde yazılı olmalı ve bu sayı onunla birlikte '
      + 'değişmeli').toBeLessThanOrEqual(3);
    expect(KUNYE_EN_COK_YOL * KUNYE_BOY_PX, 'künye işaretinden üç künye '
      + 'boyundan uzağa düşebiliyor — saç teli okunmaz').toBeLessThanOrEqual(105);
  });

  it('[SIS-SAHA-001] ÖLÇÜLEN KUSUR · künye İŞARETİNDEN KOPAMAZ — sınırsız '
    + 'kaydırma gerçek ekranda bir künyeyi 9. yola, kendi işaretinden 303px '
    + 'uzağa, BAŞKA bir kümenin içine düşürmüştü', () => {
    /* Tavanı sınayan vaka: aynı yere yığılmış on nokta. Eski kuralda
       onuncu künye yol 9'a çıkardı; bugün hiçbiri tavanı aşamaz. */
    const n: KunyeNoktasi[] = Array.from({ length: 10 }, (_, i) => ({
      x: 50, y: 30 + i * 0.1, yukari: true, sola: false,
    }));
    const enUzak = Math.max(...kunyeYollari(n).map((y) => y.yol));
    expect(enUzak, `künye ${enUzak} yol uzağa düştü`)
      .toBeLessThanOrEqual(KUNYE_EN_COK_YOL);
  });

  it('İKİNCİ BASAMAK KÖR DEĞİL · itilen künye, bir alttaki noktanın '
    + 'doğal künyesiyle çakışmaz', () => {
    /* Nokta yerine KÜNYENİN gerçek yerine bakılmazsa bu vaka kırmızı
       yanar: A yol 1'e itilir ve tam C'nin doğal künyesine iner. */
    const n: KunyeNoktasi[] = [
      { x: 50, y: 40, yukari: false, sola: false },
      { x: 51, y: 40, yukari: false, sola: false },
      { x: 52, y: 40 - KUNYE_BOY, yukari: false, sola: false },
    ];
    expect(ortusenler(n, kunyeYollari(n))).toBe(0);
  });

  it('YIRMI nokta üst üste — kural yine de ayırır ve DÖNGÜYE girmez', () => {
    const n: KunyeNoktasi[] = Array.from({ length: 20 }, () => ({
      x: 50, y: 30, yukari: false, sola: false,
    }));
    const yerler = kunyeYollari(n);
    expect(yerler).toHaveLength(20);
    /* YİRMİ nokta iki yana × üç şeride SIĞMAZ ve sığmamalıdır: kural
       künyeyi işaretinden koparmaktansa çakışmayı kabul eder. Ölçülen
       şey budur — sığmayan künye TAVANIN İÇİNDE kalır. */
    expect(yerler.every((y) => y.yol <= KUNYE_EN_COK_YOL),
      'künye tavanı aştı — işaretinden kopmuş olabilir').toBe(true);
  });

  it('[SIS-SAHA-001] YÖNLÜ ÇAKIŞMA · sağa açılan künye ile sola açılan künye '
    + 'merkezleri UZAK olsa bile örtüşür — simetrik kural bunu göremiyordu', () => {
    /* ÖLÇÜLEN KUSUR (düzeltme turu, 1440×900): "Saha A-1 İçme Suyu Arıtma"
       (x≈50, sağa açar) ile "Demo Enerji Genel Müdürlük" (x≈88, sola açar)
       hâlâ üst üste biniyordu — |Δx| = 38 ve eski `|Δx| < en` kuralı
       "uzak" diyordu. Künye aralıkları [50,78] ve [60,88]: örtüşüyorlar. */
    const n: KunyeNoktasi[] = [
      { x: 50, y: 8, yukari: true, sola: false },
      { x: 88, y: 8, yukari: true, sola: true },
    ];
    const yerler = kunyeYollari(n);
    expect(ortusenler(n, yerler), 'yönlü çakışma görülmedi').toBe(0);
    expect(yerler[1].yol > 0 || yerler[1].sola !== n[1].sola,
      'ikinci künye hiç kaçmamış').toBe(true);
  });

  it('[SAH-TUV-001] DİKEY YÖNLÜ ÇAKIŞMA · yukarı açan künye ile aşağı açan '
    + 'künye merkezleri UZAK olsa bile örtüşür', () => {
    /* ÖLÇÜLEN KUSUR (17 Eyl 2026 · 1440×900 · eksen penceresi geldikten
       sonra): aynı endeksteki iki tesis, tuval yüzdesinde 11,9 birim
       uzakta. `KUNYE_BOY` o gün 11'di; merkez modeli "ayrık" dedi, ikisi
       de yol 0'da kaldı ve ekranda künyeler 16 piksel üst üste bindi
       (`kanit:tuval` iki bantta da kırmızı yaktı).

       VAKA YENİDEN TEMELLENDİRİLDİ ve sebebi bir bulgudur: `KUNYE_BOY`
       tabandan türetilince 14 oldu ve ölçülen o çift artık MERKEZ
       modeliyle de yakalanıyor — iki düzeltme aynı çiftin üstünde
       örtüşüyor. Örtüşen bir vaka, yönlülüğü İZOLE ETMEZ: model yanlış
       sebeple geçer. Bu yüzden ayrım şimdi güncel `KUNYE_BOY`dan BÜYÜK
       seçiliyor; merkez modeli burada kesinlikle "ayrık" der, yalnız
       yönlü model çakışmayı görür. */
    const ayrim = KUNYE_BOY + 1;
    const n: KunyeNoktasi[] = [
      { x: 68.9, y: 8 + ayrim, yukari: false, sola: true },
      { x: 68.9, y: 8, yukari: true, sola: true },
    ];
    /* Vakanın ZORLUĞU: merkezler bir künye boyundan UZAK. Bu satır
       olmazsa test, kolay bir vakayı çözüp geçmiş olabilir. */
    expect(Math.abs(n[0].y - n[1].y)).toBeGreaterThan(KUNYE_BOY);
    const yerler = kunyeYollari(n);
    expect(ortusenler(n, yerler), 'dikey yönlü çakışma görülmedi').toBe(0);
    expect(yerler[1].yol > 0 || yerler[1].sola !== n[1].sola,
      'ikinci künye hiç kaçmamış').toBe(true);
  });

  it('SIRA KORUNUR · önce gelen künye doğal yerini korur', () => {
    const n: KunyeNoktasi[] = [
      { x: 50, y: 40, yukari: false, sola: false },
      { x: 50, y: 40, yukari: false, sola: false },
    ];
    expect(kunyeYollari(n)[0], 'ilk künye kaymış').toEqual({ yol: 0, sola: false });
  });
});
