import { describe, expect, it } from 'vitest';
import { SAHA_ARKA_PLANLARI, sonrakiIndeks } from '@/lib/sahaArkaPlan';

describe('Saha arka plan havuzu', () => {
  it('yalnız onaylı iki görsel içerir, üçüncü fallback yok', () => {
    expect(SAHA_ARKA_PLANLARI.map((g) => g.src.split('/').pop())).toEqual([
      'saha-03-res-sirt.webp', 'saha-04-baraj-gol-plume.webp',
    ]);
    for (const g of SAHA_ARKA_PLANLARI) expect(g.konum).toMatch(/^\d+% \d+%$/);
  });
  it('sıralı döner, aynı görsel arka arkaya çıkmaz', () => {
    const n = SAHA_ARKA_PLANLARI.length;
    let i = 0;
    for (let k = 0; k < 6; k++) { const s = sonrakiIndeks(String(i), n); expect(s).not.toBe(i); i = s; }
    expect(sonrakiIndeks('0', n)).toBe(1);
    expect(sonrakiIndeks('1', n)).toBe(0);
  });
  it('geçersiz/boş kayıt güvenli indeks verir', () => {
    const n = SAHA_ARKA_PLANLARI.length;
    for (const v of [null, undefined, 'x', '-1', '9', NaN]) {
      const s = sonrakiIndeks(v, n);
      expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThan(n);
    }
  });
});
