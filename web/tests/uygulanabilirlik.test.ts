import { describe, it, expect } from 'vitest';
import { kuralDegerlendir } from '@/lib/motorlar/uygulanabilirlik';

const EPDK_KURALI = JSON.stringify({ herhangi: [
  { alan: 'kuruluGucMw', islec: '>=', deger: 100 },
  { alan: 'blackStart', islec: '=', deger: true },
  { alan: 'teiasScadaEmsSeriOlmayan', islec: '=', deger: true },
] });

describe('Uygulanabilirlik motoru (§5)', () => {
  it('kurulu güç ≥100 → kapsamda, gerekçeli', () => {
    const s = kuralDegerlendir(EPDK_KURALI, { kuruluGucMw: 790 }, { blackStart: false, teiasScadaEms: false });
    expect(s.uygulanabilir).toBe(true);
    expect(s.gerekce).toContain('kuruluGucMw');
  });

  it('küçük santral, koşulsuz → kapsam dışı', () => {
    const s = kuralDegerlendir(EPDK_KURALI, { kuruluGucMw: 47 },
      { blackStart: false, teiasScadaEms: false, seriHaberlesme: false });
    expect(s.uygulanabilir).toBe(false);
  });

  it('TEİAŞ SCADA/EMS seri OLMAYAN haberleşme → kapsamda (türetilmiş alan)', () => {
    const s = kuralDegerlendir(EPDK_KURALI, { kuruluGucMw: 50 },
      { blackStart: false, teiasScadaEms: true, seriHaberlesme: false });
    expect(s.uygulanabilir).toBe(true);
  });

  it('seri haberleşmeli TEİAŞ bağlantısı tek başına kapsama SOKMAZ', () => {
    const s = kuralDegerlendir(EPDK_KURALI, { kuruluGucMw: 50 },
      { blackStart: false, teiasScadaEms: true, seriHaberlesme: true });
    expect(s.uygulanabilir).toBe(false);
  });

  it('profil eksikse karar VERİLMEZ (bilinmiyor ≠ hayır)', () => {
    const s = kuralDegerlendir(EPDK_KURALI, { kuruluGucMw: 50 }, { });
    expect(s.uygulanabilir).toBeNull();
    expect(s.gerekce).toContain('bilinmiyor');
  });
});
