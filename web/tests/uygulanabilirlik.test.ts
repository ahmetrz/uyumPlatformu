import { describe, it, expect } from 'vitest';
import { kuralDegerlendir, type Oznitelik } from '@/lib/motorlar/uygulanabilirlik';

/* P1: kurulu güç artık kolon değil ÖZNİTELİK satırı. Yardımcı, testin
   niyetini ("bu tesisin gücü şu") okunur bırakır; ölçülmemiş niteliği
   ifade etmek için `guc()` HİÇ çağrılmaz — satırın yokluğu ölçümün
   yokluğudur. */
const guc = (mw: number): Oznitelik[] =>
  [{ anahtar: 'kuruluGuc', sayisalDeger: mw, metinDeger: null }];
/* B2: black start · TEİAŞ · seri haberleşme de ÖZNİTELİKTİR (mantık →
   0/1 sayısal satır); profil kolonu değil. Satır yoksa bilinmiyor. */
const mantik = (anahtar: string, deger: boolean): Oznitelik =>
  ({ anahtar, sayisalDeger: deger ? 1 : 0, metinDeger: null });
const OLCULMEDI: Oznitelik[] = [];

/* "TEİAŞ SCADA/EMS var VE seri değil" türetilmiş alan değil, iç içe
   `hepsi`dir (B2) — tohum ve göç aynı kuralı yazar. */
const EPDK_KURALI = JSON.stringify({ herhangi: [
  { alan: 'kuruluGuc', islec: '>=', deger: 100 },
  { alan: 'blackStart', islec: '=', deger: true },
  { hepsi: [
    { alan: 'teiasScadaEms', islec: '=', deger: true },
    { alan: 'seriHaberlesme', islec: '!=', deger: true },
  ] },
] });

describe('Uygulanabilirlik motoru (§5)', () => {
  it('kurulu güç ≥100 → kapsamda, gerekçeli', () => {
    const s = kuralDegerlendir(EPDK_KURALI,
      [...guc(790), mantik('blackStart', false), mantik('teiasScadaEms', false)], null);
    expect(s.uygulanabilir).toBe(true);
    expect(s.gerekce).toContain('kuruluGuc');
  });

  it('küçük santral, koşulsuz → kapsam dışı [UYU-UYG-001]', () => {
    const s = kuralDegerlendir(EPDK_KURALI,
      [...guc(47), mantik('blackStart', false), mantik('teiasScadaEms', false), mantik('seriHaberlesme', false)], null);
    expect(s.uygulanabilir).toBe(false);
  });

  it('TEİAŞ SCADA/EMS seri OLMAYAN haberleşme → kapsamda (iç içe hepsi)', () => {
    const s = kuralDegerlendir(EPDK_KURALI,
      [...guc(50), mantik('blackStart', false), mantik('teiasScadaEms', true), mantik('seriHaberlesme', false)], null);
    expect(s.uygulanabilir).toBe(true);
  });

  it('seri haberleşmeli TEİAŞ bağlantısı tek başına kapsama SOKMAZ', () => {
    const s = kuralDegerlendir(EPDK_KURALI,
      [...guc(50), mantik('blackStart', false), mantik('teiasScadaEms', true), mantik('seriHaberlesme', true)], null);
    expect(s.uygulanabilir).toBe(false);
  });

  it('profil eksikse karar VERİLMEZ (bilinmiyor ≠ hayır) [UYU-UYG-002]', () => {
    const s = kuralDegerlendir(EPDK_KURALI, guc(50), null);
    expect(s.uygulanabilir).toBeNull();
    expect(s.gerekce).toContain('bilinmiyor');
  });

  it('öznitelik ÖLÇÜLMEMİŞSE karar verilmez, kapsam dışı sayılmaz [URN-ALN-002]', () => {
    /* P1'in asıl sınavı: kurulu güç artık kolon değil, satır. Satır YOKSA
       değer 0 değil, YOK. Motor bunu "kapsam dışı" saymamalı — sayarsa
       ölçülmemiş her tesis sessizce kapsamdan düşerdi. */
    const s = kuralDegerlendir(EPDK_KURALI, OLCULMEDI, null);
    expect(s.uygulanabilir, 'ölçülmemiş öznitelik kapsam dışı sayıldı').toBeNull();
    expect(s.gerekce).toContain('bilinmiyor');
  });

  it('`icinde` işleci: kapsam öğesi TÜRÜ paket beyanından okunur [URN-PKT-020]', () => {
    /* Paket beyanı `kapsamTuru icinde [...]` yazar; tür bağlamda profil
       tarafındadır (`tesisKapsaminiHesapla` koyar). Liste dışı tür kapsam
       dışıdır, listede olan kapsamdadır; tür BİLİNMİYORSA karar verilmez. */
    const KURAL = JSON.stringify({ hepsi: [
      { alan: 'kapsamTuru', islec: 'icinde', deger: ['tesis', 'kontrol_sistemi'] },
      { alan: 'kuruluGuc', islec: '>=', deger: 100 },
    ] });
    expect(kuralDegerlendir(KURAL, guc(790), { kapsamTuru: 'tesis' }).uygulanabilir).toBe(true);
    expect(kuralDegerlendir(KURAL, guc(790), { kapsamTuru: 'dis_hizmet' }).uygulanabilir).toBe(false);
    expect(kuralDegerlendir(KURAL, guc(790), null).uygulanabilir, 'tür bilinmiyorken karar üretildi').toBeNull();
  });

  it('paket beyanının türü, aynı adlı bir ÖZNİTELİKLE ezilemez [URN-PKT-020]', () => {
    /* Öznitelik anahtarı serbest bir dizedir; `kapsamTuru` adlı bir öznitelik
       satırı kapsam kararını sessizce çevirebilirdi. Profil otoriterdir ve
       düşürülen öznitelik gerekçeye yazılır. */
    const KURAL = JSON.stringify({ hepsi: [{ alan: 'kapsamTuru', islec: 'icinde', deger: ['tesis'] }] });
    const s = kuralDegerlendir(KURAL, [{ anahtar: 'kapsamTuru', sayisalDeger: null, metinDeger: 'dis_hizmet' }], { kapsamTuru: 'tesis' });
    expect(s.uygulanabilir).toBe(true);
    expect(s.gerekce).toContain('öznitelik yok sayıldı');
  });

  it('ölçülmemiş öznitelik, sağlanan başka bir koşulu ENGELLEMEZ [URN-ALN-002]', () => {
    /* Bilinmiyor bir yutucu değil: `herhangi` kuralında sağlanan tek bir
       koşul yeter. Ölçülmemiş güç, black-start ile gelen kapsamı
       düşürmemeli. */
    const s = kuralDegerlendir(EPDK_KURALI, [mantik('blackStart', true)], null);
    expect(s.uygulanabilir).toBe(true);
  });
});
