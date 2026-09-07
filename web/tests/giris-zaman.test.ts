import { describe, expect, it } from 'vitest';
import { poz } from '../components/giris/zaman';

describe('Kaydırma ile giriş', () => {
  it('ileri ve geri aynı kaydırma noktasında aynı pozu verir [SIS-SNG-001]', () => {
    const ilerleme = [0, .1, .2, .4, .55, .72, .8, .9, .97, 1];
    const ileri = ilerleme.map(poz);
    expect([...ilerleme].reverse().map(poz).reverse()).toEqual(ileri);
    expect(poz(.55)).toEqual(poz(.55));
  });
  it('kamerayı son düzleme ulaşmadan tam ekran açıklığa taşır [SIS-SNG-001]', () => {
    const son = poz(1);
    expect(son.aciklik).toBe(1);
    expect(son.rx).toBe(0); expect(Math.abs(son.ry)).toBe(0);
    expect(son.kamera).toBeGreaterThan(-5 * son.aralik + .12);
    expect(son.kamera - (-5 * son.aralik)).toBeLessThan(.3);
  });
  it('açıklık açılmadan önce katmanlar hizalanır; zaman çizgisi süreksizlik taşımaz [SIS-SNG-001]', () => {
    for (let i = 0; i <= 1000; i++) {
      const p = i / 1000, s = poz(p);
      if (s.aciklik > 0) expect(s.x).toBe(0);
      if (i) expect(Math.abs(s.kamera - poz(p - .001).kamera)).toBeLessThan(.07);
    }
    expect(poz(-1)).toEqual(poz(0)); expect(poz(2)).toEqual(poz(1));
  });
});
