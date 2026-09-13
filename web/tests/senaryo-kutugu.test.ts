import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SENARYOLAR, alanOzeti, kutukTutarli } from '@/lib/senaryo/kutuk';
import { TEST_KATMANLARI } from '@/lib/senaryo/tipler';
import { KUTUKSUZ_DOSYALAR, olc } from '../arac/senaryo-belge.mjs';

const KOK = process.cwd();
const olcum = olc(SENARYOLAR);

describe('Kütüğün kendi tutarlılığı', () => {
  it('kimlikler tekildir, kalıba uyar ve hiçbir alan boş değildir', () => {
    expect(kutukTutarli()).toEqual([]);
  });

  it('kütük gerçekten dolu ve alanlara yayılmış', () => {
    expect(SENARYOLAR.length).toBeGreaterThanOrEqual(150);
    const alanlar = alanOzeti();
    expect(alanlar.length).toBeGreaterThanOrEqual(20);
    const enBuyuk = Math.max(...alanlar.map(([, n]) => n));
    expect(enBuyuk).toBeLessThan(SENARYOLAR.length * 0.5);
  });

  it('her senaryo tanımlı bir katman bildirir', () => {
    for (const s of SENARYOLAR) {
      for (const k of s.katmanlar) {
        expect(TEST_KATMANLARI, `${s.id}: ${k}`).toContain(k);
      }
    }
  });

  it('ekranı olan her senaryonun rotası vardır', () => {
    const eksik: string[] = [];
    for (const s of SENARYOLAR) {
      if (s.rota === '—') continue;
      const parca = s.rota.replace(/^\//, '');
      const adaylar = [
        `app/(kabuk)/(operasyonel)/${parca}/page.tsx`,
        `app/(kabuk)/(flagship)/${parca}/page.tsx`,
        `app/(tam)/${parca}/page.tsx`,
        `app/(giris)/${parca}/page.tsx`,
        `app/${parca}/page.tsx`,
      ];
      if (!adaylar.some((a) => existsSync(path.join(KOK, a)))) {
        eksik.push(`${s.id} → ${s.rota}`);
      }
    }
    expect(eksik, eksik.join(' · ')).toEqual([]);
  });
});

describe('Kapsam ölçüsü', () => {
  it('testi olmayan senaryo yoktur', () => {
    expect(olcum.bosluklar, `testsiz senaryo: ${olcum.bosluklar.join(' ')}`).toEqual([]);
  });

  it('kütükte olmayan senaryo işareti yoktur', () => {
    expect(olcum.hayaletler, `kütükte yok: ${olcum.hayaletler.join(' ')}`).toEqual([]);
  });

  it('gerekçesiz kütüksüz test dosyası yoktur', () => {
    expect(olcum.oksuzDosyalar, `bağsız: ${olcum.oksuzDosyalar.join(' ')}`).toEqual([]);
  });

  it('muafiyetlerin gerekçesi vardır', () => {
    for (const [dosya, neden] of Object.entries(KUTUKSUZ_DOSYALAR)) {
      expect(neden.length, `${dosya} muafiyeti gerekçesiz`).toBeGreaterThan(15);
    }
  });

  it('her test katmanında en az bir senaryo vardır', () => {
    for (const k of TEST_KATMANLARI) {
      expect(SENARYOLAR.some((s) => s.katmanlar.includes(k)), `${k} katmanında senaryo yok`)
        .toBe(true);
    }
  });

  it('her alanda en az bir aykırı veri hâli vardır', () => {
    const alanlar = [...new Set(SENARYOLAR.map((s) => s.alan))];
    const yalnizMutluYol = alanlar.filter((a) =>
      SENARYOLAR.filter((s) => s.alan === a).every((s) => s.veriHali === 'normal'));
    expect(yalnizMutluYol, `yalnız mutlu yol: ${yalnizMutluYol.join(', ')}`).toEqual([]);
  });
});

describe('Üretilen senaryo belgeleri günceldir', () => {
  const belge = (ad: string) => readFileSync(path.join(KOK, '..', 'docs', ad), 'utf8');

  it('ana kütük güncel senaryo sayısını taşır', () => {
    const metin = belge('MASTER_SCENARIO_REGISTRY.md');
    expect(metin).toContain(`Senaryo: **${SENARYOLAR.length}**`);
    expect(metin).toContain('GAP: **0**');
  });

  it('test matrisi her senaryoyu içerir', () => {
    const metin = belge('SCENARIO_TEST_MATRIX.md');
    for (const s of SENARYOLAR) {
      expect(metin, `${s.id} matriste yok`).toContain(`\`${s.id}\``);
    }
    expect(metin).toContain('| **GAP** | **0** |');
  });
});
