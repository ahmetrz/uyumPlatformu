import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const TABAN = [0, 20, 2] as const;

const KOK = process.cwd();
const paket = JSON.parse(readFileSync(path.join(KOK, 'package.json'), 'utf8'));
const kilit = JSON.parse(readFileSync(path.join(KOK, 'package-lock.json'), 'utf8'));

function surumParcala(s: string): number[] {
  return s.split('.').map((p) => Number.parseInt(p, 10) || 0);
}

function enAz(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
}

const SPEC: string = paket.dependencies.xlsx;

describe('xlsx — depodaki yamalı tarball', () => {
  it('bağımlılık npm kayıt defterine değil DEPODAKİ dosyaya bağlıdır', () => {
    expect(SPEC, 'npm sürümü yamasızdır; bağımlılık `file:vendor/…` olmalı')
      .toMatch(/^file:vendor\/xlsx-\d+\.\d+\.\d+\.tgz$/);
  });

  it('dosya adındaki sürüm yamalı tabanın üstündedir', () => {
    const m = /xlsx-(\d+\.\d+\.\d+)\.tgz$/.exec(SPEC);
    expect(m, 'tarball adından sürüm okunamadı').not.toBeNull();
    expect(enAz(surumParcala(m![1]), TABAN), `${m![1]} < ${TABAN.join('.')}`).toBe(true);
  });

  it('tarball gerçekten depoda durur', () => {
    const yol = path.join(KOK, SPEC.replace(/^file:/, ''));
    expect(existsSync(yol), `depoda yok: ${SPEC}`).toBe(true);
  });

  it('KURULU sürüm de tabanın üstündedir', () => {
    const kurulu = JSON.parse(
      readFileSync(path.join(KOK, 'node_modules', 'xlsx', 'package.json'), 'utf8'),
    ).version as string;
    expect(enAz(surumParcala(kurulu), TABAN), `kurulu ${kurulu} < ${TABAN.join('.')}`).toBe(true);
  });

  it('depodaki ikilinin ÖZETİ kilit dosyasındakiyle birebir aynıdır', () => {
    
    const giris = kilit.packages?.['node_modules/xlsx'];
    expect(giris, 'kilit dosyasında xlsx girdisi yok').toBeTruthy();
    expect(giris.resolved).toBe(SPEC.replace(/^file:/, 'file:'));
    expect(giris.integrity, 'kilit dosyasında bütünlük özeti yok').toMatch(/^sha512-/);

    const bayt = readFileSync(path.join(KOK, SPEC.replace(/^file:/, '')));
    const ozet = `sha512-${createHash('sha512').update(bayt).digest('base64')}`;
    expect(ozet, 'depodaki tarball kilitte yazan dosya DEĞİL').toBe(giris.integrity);
  });
});
