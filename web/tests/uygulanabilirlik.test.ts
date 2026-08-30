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

// --- entegrasyon: yeni santral akışı (kabul testi 1'in veri katmanı)
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('Kabul testi 1 — yeni santral kapsam akışı (izole DB)', () => {
  it('profilsiz santral: karar verilmez + veri kalitesi bulgusu; profil gelince kapsam kararı gerekçeli yazılır', async () => {
    const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-app-'));
    const testDb = path.join(dizin, 't.db');
    copyFileSync('prisma/dev.db', testDb);
    process.env.TEST_DB = testDb;
    const { db } = await import('@/lib/db');
    const { tesisKapsaminiHesapla } = await import('@/lib/motorlar/uygulanabilirlik');

    const yeni = await db.tesis.create({ data: { kod: 'TEST-YENI-HES', ad: 'Test HES' } });
    await tesisKapsaminiHesapla(yeni.id);
    // profil yok → EPDK kararı YOK (bilinmiyor ≠ kapsam dışı), veri kalitesi bulgusu VAR
    expect(await db.uygulanabilirlikKarari.count({ where: { tesisId: yeni.id } })).toBe(0);
    expect(await db.veriKalitesiBulgusu.count({
      where: { kaynakId: yeni.id, kural: 'eksik_profil' } })).toBeGreaterThan(0);

    // profil geldi: 150 MW → EPDK kapsamda, gerekçeli
    await db.tesis.update({ where: { id: yeni.id }, data: { kuruluGucMw: 150 } });
    await db.tesisProfili.create({ data: { tesisId: yeni.id,
      blackStart: false, teiasScadaEms: false, seriHaberlesme: false } });
    await tesisKapsaminiHesapla(yeni.id);
    const karar = await db.uygulanabilirlikKarari.findFirstOrThrow({
      where: { tesisId: yeni.id } });
    expect(karar.uygulanabilir).toBe(true);
    expect(karar.gerekce).toContain('kuruluGucMw');
    expect(karar.kuralSurumu).toBe(1);
  });
});
