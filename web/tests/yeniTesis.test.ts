import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// ENV, db'ye dokunan HER importtan önce ayarlanmalı (izolasyon kalıbı)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yeni-tesis-'));
const testDb = path.join(dizin, 't.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { tesisKapsaminiHesapla } = await import('@/lib/motorlar/uygulanabilirlik');

describe('Kabul testi 1 — yeni santral kapsam akışı (izole DB)', () => {
  it('profilsiz santral: karar verilmez + veri kalitesi bulgusu; profil gelince kapsam kararı gerekçeli yazılır [TES-PRF-003]', async () => {
    const yeni = await db.tesis.create({ data: { kod: 'TEST-YENI-HES', ad: 'Test HES' } });
    await tesisKapsaminiHesapla(yeni.id);
    expect(await db.uygulanabilirlikKarari.count({ where: { tesisId: yeni.id } })).toBe(0);
    expect(await db.veriKalitesiBulgusu.count({
      where: { kaynakId: yeni.id, kural: 'eksik_profil' } })).toBeGreaterThan(0);

    /* P1: kurulu güç kolon değil öznitelik satırı — motor da oradan okuyor. */
    await db.tesisOzellik.create({ data: { tesisId: yeni.id,
      anahtar: 'kuruluGucMw', sayisalDeger: 150, birim: 'MW', kaynak: 'test' } });
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
