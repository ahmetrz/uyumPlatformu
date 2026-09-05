import { describe, expect, it } from 'vitest';
import {
  altinDosyaAdi, axeCiddiMi, axeOzeti, esikAltindakiler, gorselFark, rotaAdi, yuzPuan,
} from '../arac/kalite-kurallari.mjs';

/* Kalite kapılarının SAF kuralları — tarayıcısız doğrulanır.
   Kararlar araçların içinde gömülü kalsaydı yalnız canlı sunucuyla
   yoklanabilirdi; burada eşikler ve sınıflandırma sunucusuz sabitlenir. */

describe('rota → dosya adı', () => {
  it('kök rota "ana", iç rota çift alt çizgiyle düzleşir', () => {
    expect(rotaAdi('/')).toBe('ana');
    expect(rotaAdi('')).toBe('ana');
    expect(rotaAdi('/uyum')).toBe('uyum');
    expect(rotaAdi('/raporlar/kanit-paketi')).toBe('raporlar__kanit-paketi');
  });
  it('altın adı rota + bant taşır', () => {
    expect(altinDosyaAdi('/portfoy', 1440)).toBe('portfoy-1440.png');
    expect(altinDosyaAdi('/', 375)).toBe('ana-375.png');
  });
});

describe('görsel fark eşiği', () => {
  it('eşiğin altı geçer, üstü kusur', () => {
    expect(gorselFark(4, 1000).kusur).toBe(false);          // %0,4
    expect(gorselFark(6, 1000).kusur).toBe(true);           // %0,6
    expect(gorselFark(6, 1000).sebep).toContain('%0.60');
  });
  it('tam eşik kusur DEĞİL (">" karşılaştırması)', () => {
    expect(gorselFark(5, 1000).kusur).toBe(false);
  });
  it('boş görüntü sessizce geçmez', () => {
    expect(gorselFark(0, 0).kusur).toBe(true);
    expect(gorselFark(0, 0).yuzde).toBeNull();
  });
  it('eşik parametresi uygulanır', () => {
    expect(gorselFark(20, 1000, 2.5).kusur).toBe(false);
  });
});

describe('lighthouse eşiği', () => {
  it('0–1 puanı 0–100 tam sayıya çevirir, ölçülemeyeni null bırakır', () => {
    expect(yuzPuan(0.925)).toBe(93);
    expect(yuzPuan(1)).toBe(100);
    expect(yuzPuan(null)).toBeNull();
    expect(yuzPuan(undefined)).toBeNull();
  });
  it('eşiğin altında kalan ve ölçülemeyen kategorileri listeler', () => {
    const alt = esikAltindakiler({ performance: 72, accessibility: 100, seo: null, 'best-practices': 90 }, 90);
    expect(alt.map((a) => a.kategori)).toEqual(['performance', 'seo']);
    expect(alt[1].puan).toBeNull();
  });
  it('tam eşik geçer', () => {
    expect(esikAltindakiler({ performance: 90 }, 90)).toEqual([]);
  });
});

describe('axe etki sınıflandırması', () => {
  it('yalnız serious ve critical kapıyı kapatır', () => {
    expect(axeCiddiMi('critical')).toBe(true);
    expect(axeCiddiMi('Serious')).toBe(true);
    expect(axeCiddiMi('moderate')).toBe(false);
    expect(axeCiddiMi('minor')).toBe(false);
    expect(axeCiddiMi(undefined)).toBe(false);
  });
  it('özet ihlalleri ikiye ayırır ve kapı kararını verir', () => {
    const o = axeOzeti([
      { id: 'a', impact: 'minor' },
      { id: 'b', impact: 'serious' },
      { id: 'c', impact: 'moderate' },
    ]);
    expect(o.ciddi.map((i) => i.id)).toEqual(['b']);
    expect(o.diger.map((i) => i.id)).toEqual(['a', 'c']);
    expect(o.kapiKapali).toBe(true);
    expect(axeOzeti([]).kapiKapali).toBe(false);
  });
});
