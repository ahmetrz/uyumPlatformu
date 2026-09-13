import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

async function sayimAraci() {
  return import('../arac/sayimlar.mjs');
}

async function envanterAraci() {
  return import('../arac/test-envanteri.mjs');
}

describe('Kaynak sayımları', () => {
  it('test envanteri doludur ve tutarlıdır', async () => {
    const { sayimlar } = await sayimAraci();
    const s = sayimlar();
    expect(s['test dosyası']).toBeGreaterThan(30);
    expect(s['test vakası']).toBeGreaterThan(s['test dosyası']);
    expect(s['atlanan test']).toBeLessThanOrEqual(s['test vakası']);
  });

  it('test envanteri anlık görüntüsü tazedir', async () => {
    const { anlik, imza, ANLIK_YOL } = await envanterAraci();
    expect(existsSync(ANLIK_YOL), 'Tazeleyin: npm run sayimlar:yenile').toBe(true);
    const kayitli = JSON.parse(readFileSync(ANLIK_YOL, 'utf8')).imza;
    expect(kayitli, 'Tazeleyin: npm run sayimlar:yenile').toBe(imza());
    expect(() => anlik()).not.toThrow();
  });

  it('anlık görüntü dosya kümesi vitest globuyla birebirdir', async () => {
    const { anlik, testDosyalari } = await envanterAraci();
    const kesif = Object.keys(anlik().dosyalar).sort();
    const glob = testDosyalari()
      .map((f: string) => path.relative(path.resolve('.'), f))
      .sort();
    expect(kesif).toEqual(glob);
  });

  it('vaka sayımı satır taramasına düşmez', async () => {
    const { sayimlar } = await sayimAraci();
    const { anlik, testDosyalari } = await envanterAraci();
    const envanter = anlik();

    let naif = 0;
    for (const f of testDosyalari()) {
      for (const satir of readFileSync(f, 'utf8').split('\n')) {
        if (/^\s*(it|test)(\.skip|\.only)?\s*\(/.test(satir)) naif += 1;
      }
    }

    expect(sayimlar()['test vakası']).toBe(envanter.vaka);
    expect(sayimlar()['atlanan test']).toBe(envanter.atlanan);
    expect(naif).toBeLessThan(envanter.vaka);
  });

  it('kaynaktan türetilen ölçüler sıfır değildir', async () => {
    const { sayimlar } = await sayimAraci();
    for (const [ad, deger] of Object.entries(sayimlar())) {
      if (ad === 'atlanan test') continue;
      expect(deger, `${ad} sıfır çıktı`).toBeGreaterThan(0);
    }
  });
});
