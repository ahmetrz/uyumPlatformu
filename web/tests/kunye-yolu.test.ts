import { describe, expect, it } from 'vitest';
import {
  KUNYE_BOY, KUNYE_EN, kunyeYollari, type KunyeNoktasi,
} from '@/app/(kabuk)/(flagship)/kunyeYolu';

/* Takımyıldız künyelerinin çakışmaması — SIS-SAHA-001.

   Kural saf bir fonksiyondadır; vakalar sentetiktir ve ekranın tohum
   verisine bağlı değildir. Böylece sabotaj KURALI sabote eder, ölçüm
   ortamını değil. */

/** İki künye gerçekten üst üste mi? Yolu koordinata çevirip bakar. */
function ortusenler(noktalar: readonly KunyeNoktasi[], yollar: readonly number[]): number {
  const yer = noktalar.map((n, i) => ({
    a: n.sola ? n.x - KUNYE_EN : n.x,
    b: n.sola ? n.x : n.x + KUNYE_EN,
    y: n.y + (n.yukari ? 1 : -1) * yollar[i] * KUNYE_BOY,
  }));
  let n = 0;
  for (let i = 0; i < yer.length; i += 1) {
    for (let j = i + 1; j < yer.length; j += 1) {
      if (yer[i].a < yer[j].b && yer[j].a < yer[i].b
        && Math.abs(yer[i].y - yer[j].y) < KUNYE_BOY) n += 1;
    }
  }
  return n;
}

describe('Künye yolu · çakışma', () => {
  it('TEK nokta doğal yerinde kalır — gereksiz kaydırma yok', () => {
    expect(kunyeYollari([{ x: 50, y: 40, yukari: false, sola: false }])).toEqual([0]);
  });

  it('UZAK iki nokta ikisi de doğal yerinde kalır', () => {
    const n: KunyeNoktasi[] = [
      { x: 10, y: 40, yukari: false, sola: false },
      { x: 80, y: 40, yukari: false, sola: false },
    ];
    expect(kunyeYollari(n)).toEqual([0, 0]);
  });

  it('[SIS-SAHA-001] ÖLÇÜLEN KUSUR · güç kaydı olmayan altı tesis aynı banda iner ve '
    + 'hepsi YUKARI açar — eski kural hiçbirini kaydırmıyordu', () => {
    /* dikey = 8 + √(0/enGuc)·78 = 8 → hepsi `yukari`. Eski kuralda
       `yukari` dalı `kaydir`ı geçersiz kıldığı için altısı da tek
       şeride biniyordu (1440×900'de okunamaz metin üretti). */
    const n: KunyeNoktasi[] = [42, 50, 56, 60, 88, 98].map((x) => ({
      x, y: 8, yukari: true, sola: x > 58,
    }));
    const yollar = kunyeYollari(n);
    expect(ortusenler(n, yollar), 'künyeler hâlâ üst üste biniyor').toBe(0);
    /* Yakın olanlar AYRI yollara çıkmak zorunda; uzaktakiler değil. */
    expect(yollar[0]).not.toBe(yollar[1]);
    expect(yollar[1]).not.toBe(yollar[2]);
  });

  it('[SIS-SAHA-001] ÜÇ nokta kümelendiğinde üçü de AYRI yola çıkar — tek basamaklı '
    + 'kaydırma ikinci ve üçüncüyü aynı yere koyuyordu', () => {
    const n: KunyeNoktasi[] = [
      { x: 50, y: 40, yukari: false, sola: false },
      { x: 52, y: 41, yukari: false, sola: false },
      { x: 54, y: 42, yukari: false, sola: false },
    ];
    const yollar = kunyeYollari(n);
    expect(new Set(yollar).size, 'iki künye aynı yolda').toBe(3);
    expect(ortusenler(n, yollar)).toBe(0);
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
    const yollar = kunyeYollari(n);
    expect(yollar).toHaveLength(20);
    expect(ortusenler(n, yollar)).toBe(0);
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
    const yollar = kunyeYollari(n);
    expect(ortusenler(n, yollar), 'yönlü çakışma görülmedi').toBe(0);
    expect(yollar[1], 'ikinci künye kaymamış').toBeGreaterThan(0);
  });

  it('SIRA KORUNUR · önce gelen künye doğal yerini korur', () => {
    const n: KunyeNoktasi[] = [
      { x: 50, y: 40, yukari: false, sola: false },
      { x: 50, y: 40, yukari: false, sola: false },
    ];
    expect(kunyeYollari(n)[0], 'ilk künye kaymış').toBe(0);
  });
});
