import { describe, expect, it } from 'vitest';
import {
  SINIR_CERCEVESI, SINIR_TOLERANSI, TURKIYE_SINIRI,
} from '@/lib/cografya/turkiyeSiniri';
import { CERCEVE, SINIR_YOLLARI, TUVAL, yerlestir } from '@/app/(tam)/harita/mantik';

/* `lib/cografya/turkiyeSiniri.ts` ÜRETİLMİŞ bir dosyadır
   (`arac/turkiye-siniri.mjs`). Üretilmiş dosyanın tehlikesi bayatlamasıdır:
   kaynak değişir, çerçeve değişir, kimse fark etmez. Aşağıdakiler onun
   nöbetçisidir. */

describe('Türkiye sınırı · üretilmiş dosya bayatlamaz', () => {
  it('kırpma çerçevesi haritanın ÇERÇEVESİYLE aynıdır', () => {
    /* Ayrışırsa sınır ya tuvalden taşar ya da erken kesilir. Araç .mjs
       olduğu için `CERCEVE`yi içe aktaramaz ve değeri kendi taşır; bu
       test iki kopyayı birbirine bağlar. Kırmızıya düşerse düzeltme
       `npm run harita:sinir` ile yeniden üretmektir. */
    expect(SINIR_CERCEVESI).toEqual(CERCEVE);
  });

  it('tolerans bir pikselin altında kalır', () => {
    /* Tuvalde 1px ≈ 0,0216° boylam · 0,0187° enlem. Tolerans bunun
       üstüne çıkarsa sadeleştirme EKRANDA görünür hâle gelir; o noktada
       silüet "yaklaştırılmış" olmaktan çıkıp "değiştirilmiş" olur. */
    const icBoy = TUVAL.boy - TUVAL.kenar * 2;
    const derecePx = (CERCEVE.kuzey - CERCEVE.güney) / icBoy;
    expect(SINIR_TOLERANSI).toBeLessThan(derecePx);
  });
});

describe('Türkiye sınırı · geometri sağlam', () => {
  it('en az bir halka var ve her halka çizilebilir', () => {
    expect(TURKIYE_SINIRI.length).toBeGreaterThan(0);
    for (const halka of TURKIYE_SINIRI) expect(halka.length).toBeGreaterThanOrEqual(4);
  });

  it('her halka KAPALIDIR — ilk nokta son noktayla aynı', () => {
    for (const halka of TURKIYE_SINIRI) {
      expect(halka[0]).toEqual(halka[halka.length - 1]);
    }
  });

  it('hiçbir nokta çerçevenin dışında değil — kırpma gerçekten koştu', () => {
    for (const halka of TURKIYE_SINIRI) {
      for (const [boylam, enlem] of halka) {
        expect(boylam).toBeGreaterThanOrEqual(CERCEVE.batı);
        expect(boylam).toBeLessThanOrEqual(CERCEVE.doğu);
        expect(enlem).toBeGreaterThanOrEqual(CERCEVE.güney);
        expect(enlem).toBeLessThanOrEqual(CERCEVE.kuzey);
      }
    }
  });
});

describe('Türkiye sınırı · tuvale sığar', () => {
  it('izdüşürülen her nokta tuvalin İÇİNDE kalır', () => {
    /* Asıl güvence bu: SVG taşan bir yolu kırpmaz, tuvalin dışına boyar.
       Kırpmanın işe yaradığı burada, izdüşümden SONRA ölçülür. */
    for (const halka of TURKIYE_SINIRI) {
      for (const [boylam, enlem] of halka) {
        const { x, y } = yerlestir(enlem, boylam);
        expect(x).toBeGreaterThanOrEqual(TUVAL.kenar - 0.01);
        expect(x).toBeLessThanOrEqual(TUVAL.en - TUVAL.kenar + 0.01);
        expect(y).toBeGreaterThanOrEqual(TUVAL.kenar - 0.01);
        expect(y).toBeLessThanOrEqual(TUVAL.boy - TUVAL.kenar + 0.01);
      }
    }
  });

  it('SVG yolları halkalarla birebir ve kapalı çizilir', () => {
    expect(SINIR_YOLLARI.length).toBe(TURKIYE_SINIRI.length);
    for (const d of SINIR_YOLLARI) {
      expect(d.startsWith('M')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
      expect(d).not.toContain('NaN');
    }
  });
});

/* ── Bu poligon GERÇEKTEN Türkiye mi? ─────────────────────────────────
   Şema doğrulaması "bir poligon var" der, "doğru poligon" demez. Yanlış
   ülkeyi çıkaran bir araç yukarıdaki testlerin hepsinden geçerdi. Bilinen
   noktalarla sınanır: karadaki nokta içeride, denizdeki nokta dışarıda. */
function icerideMi(enlem: number, boylam: number): boolean {
  for (const halka of TURKIYE_SINIRI) {
    let icinde = false;
    for (let i = 0, j = halka.length - 1; i < halka.length; j = i, i += 1) {
      const [xi, yi] = halka[i];
      const [xj, yj] = halka[j];
      if ((yi > enlem) !== (yj > enlem)
        && boylam < ((xj - xi) * (enlem - yi)) / (yj - yi) + xi) icinde = !icinde;
    }
    if (icinde) return true;
  }
  return false;
}

describe('Türkiye sınırı · doğru ülke', () => {
  it('karadaki bilinen noktalar poligonun İÇİNDE', () => {
    const kara: [string, number, number][] = [
      ['Ankara', 39.93, 32.86],
      ['Konya', 37.87, 32.48],
      ['Sivas', 39.75, 37.02],
      ['Erzurum', 39.90, 41.27],
    ];
    for (const [ad, enlem, boylam] of kara) {
      expect(icerideMi(enlem, boylam), `${ad} karada olmalı`).toBe(true);
    }
  });

  it('denizdeki bilinen noktalar poligonun DIŞINDA', () => {
    const deniz: [string, number, number][] = [
      ['Karadeniz açıkları', 42.3, 35.0],
      ['Akdeniz açıkları', 35.8, 32.0],
      ['Ege açıkları', 38.5, 25.6],
    ];
    for (const [ad, enlem, boylam] of deniz) {
      expect(icerideMi(enlem, boylam), `${ad} denizde olmalı`).toBe(false);
    }
  });
});
