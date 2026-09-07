import { describe, it, expect } from 'vitest';
import { kuralDegerlendir, type Oznitelik } from '@/lib/motorlar/uygulanabilirlik';

/* P1: kurulu güç artık kolon değil ÖZNİTELİK satırı. Yardımcı, testin
   niyetini ("bu tesisin gücü şu") okunur bırakır; ölçülmemiş niteliği
   ifade etmek için `guc()` HİÇ çağrılmaz — satırın yokluğu ölçümün
   yokluğudur. */
const guc = (mw: number): Oznitelik[] =>
  [{ anahtar: 'kuruluGucMw', sayisalDeger: mw, metinDeger: null }];
const OLCULMEDI: Oznitelik[] = [];

const EPDK_KURALI = JSON.stringify({ herhangi: [
  { alan: 'kuruluGucMw', islec: '>=', deger: 100 },
  { alan: 'blackStart', islec: '=', deger: true },
  { alan: 'teiasScadaEmsSeriOlmayan', islec: '=', deger: true },
] });

describe('Uygulanabilirlik motoru (§5)', () => {
  it('kurulu güç ≥100 → kapsamda, gerekçeli', () => {
    const s = kuralDegerlendir(EPDK_KURALI, guc(790), { blackStart: false, teiasScadaEms: false });
    expect(s.uygulanabilir).toBe(true);
    expect(s.gerekce).toContain('kuruluGucMw');
  });

  it('küçük santral, koşulsuz → kapsam dışı [UYU-UYG-001]', () => {
    const s = kuralDegerlendir(EPDK_KURALI, guc(47),
      { blackStart: false, teiasScadaEms: false, seriHaberlesme: false });
    expect(s.uygulanabilir).toBe(false);
  });

  it('TEİAŞ SCADA/EMS seri OLMAYAN haberleşme → kapsamda (türetilmiş alan)', () => {
    const s = kuralDegerlendir(EPDK_KURALI, guc(50),
      { blackStart: false, teiasScadaEms: true, seriHaberlesme: false });
    expect(s.uygulanabilir).toBe(true);
  });

  it('seri haberleşmeli TEİAŞ bağlantısı tek başına kapsama SOKMAZ', () => {
    const s = kuralDegerlendir(EPDK_KURALI, guc(50),
      { blackStart: false, teiasScadaEms: true, seriHaberlesme: true });
    expect(s.uygulanabilir).toBe(false);
  });

  it('profil eksikse karar VERİLMEZ (bilinmiyor ≠ hayır) [UYU-UYG-002]', () => {
    const s = kuralDegerlendir(EPDK_KURALI, guc(50), { });
    expect(s.uygulanabilir).toBeNull();
    expect(s.gerekce).toContain('bilinmiyor');
  });

  it('öznitelik ÖLÇÜLMEMİŞSE karar verilmez, kapsam dışı sayılmaz [URN-ALN-002]', () => {
    /* P1'in asıl sınavı: kurulu güç artık kolon değil, satır. Satır YOKSA
       değer 0 değil, YOK. Motor bunu "kapsam dışı" saymamalı — sayarsa
       ölçülmemiş her tesis sessizce kapsamdan düşerdi. */
    const s = kuralDegerlendir(EPDK_KURALI, OLCULMEDI,
      { blackStart: null, teiasScadaEms: null });
    expect(s.uygulanabilir, 'ölçülmemiş öznitelik kapsam dışı sayıldı').toBeNull();
    expect(s.gerekce).toContain('bilinmiyor');
  });

  it('ölçülmemiş öznitelik, sağlanan başka bir koşulu ENGELLEMEZ [URN-ALN-002]', () => {
    /* Bilinmiyor bir yutucu değil: `herhangi` kuralında sağlanan tek bir
       koşul yeter. Ölçülmemiş güç, black-start ile gelen kapsamı
       düşürmemeli. */
    const s = kuralDegerlendir(EPDK_KURALI, OLCULMEDI, { blackStart: true });
    expect(s.uygulanabilir).toBe(true);
  });
});
