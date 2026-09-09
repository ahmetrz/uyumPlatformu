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
const { ogeAc } = await import('./yardim/kapsam');

describe('Kabul testi 1 — yeni santral kapsam akışı (izole DB)', () => {
  it('profilsiz santral: karar verilmez + veri kalitesi bulgusu; profil gelince kapsam kararı gerekçeli yazılır [TES-PRF-003]', async () => {
    /* Yeni tesis ENERJİ tipiyle açılır: kural enerji paketinin öznitelik
       şemasına yazılmıştır (B2); tipi/sektörü olmayan tesis o şemayı
       taşımaz. Uyum zinciri kapsam öğesine bağlıdır (B1) — öğe açılır. */
    const tip = await db.tesisTipi.findFirstOrThrow({ where: { kod: 'HES' }, select: { id: true } });
    const yeni = await db.tesis.create({ data: { kod: 'TEST-YENI-HES', ad: 'Test HES', tipId: tip.id } });
    await ogeAc(yeni);
    await tesisKapsaminiHesapla(yeni.id);
    expect(await db.uygulanabilirlikKarari.count({ where: { kapsamOgesi: { tesisId: yeni.id } } })).toBe(0);
    expect(await db.veriKalitesiBulgusu.count({
      where: { kaynakId: yeni.id, kural: 'eksik_profil' } })).toBeGreaterThan(0);

    /* P1: kurulu güç kolon değil öznitelik satırı — motor da oradan okuyor. */
    await db.tesisOzellik.create({ data: { tesisId: yeni.id,
      anahtar: 'kuruluGuc', sayisalDeger: 150, birim: 'MW', kaynak: 'test' } });
    /* B2: black start · TEİAŞ · seri haberleşme ÇEKİRDEK KOLON DEĞİL, enerji
       paketinin öznitelikleri — mantık 0/1 sayısal satır. Profil kaydı OT
       çekirdeği için açılır. */
    await db.tesisProfili.create({ data: { tesisId: yeni.id } });
    await db.tesisOzellik.createMany({ data: ['blackStart', 'teiasScadaEms', 'seriHaberlesme']
      .map((anahtar) => ({ tesisId: yeni.id, anahtar, sayisalDeger: 0, kaynak: 'test' })) });
    await tesisKapsaminiHesapla(yeni.id);
    const karar = await db.uygulanabilirlikKarari.findFirstOrThrow({
      where: { kapsamOgesi: { tesisId: yeni.id } } });
    expect(karar.uygulanabilir).toBe(true);
    expect(karar.gerekce).toContain('kuruluGuc');
    expect(karar.kuralSurumu).toBe(1);
  });
});
