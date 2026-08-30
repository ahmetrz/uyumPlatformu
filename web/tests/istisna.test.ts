import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-ist-'));
const testDb = path.join(dizin, 't.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { sonTarihleriIsle } = await import('@/lib/motorlar/sonTarih');

describe('İstisna / waiver yaşam döngüsü (§50)', () => {
  it('onaylı istisna maddeyi kapsam dışına alır; süre dolunca yeniden değerlendirme açılır', async () => {
    const durum = await db.maddeDurumu.findFirstOrThrow({
      where: { durum: 'uyumlu' }, include: { madde: true } });

    // onay yan etkisinin veri kuralları (gorev.ts onayYanEtkisi ile birebir)
    const istisna = await db.istisna.create({ data: {
      maddeId: durum.maddeId, tesisId: durum.tesisId,
      gerekce: 'Donanım değişimi bekleniyor; geçici muafiyet.',
      bitis: new Date(Date.now() - 3_600_000), // test için: süresi zaten geçmiş
      durum: 'aktif' } });
    await db.degerlendirmeTarihcesi.create({ data: {
      maddeDurumuId: durum.id, eskiDurum: durum.durum, yeniDurum: 'kapsamdisi',
      gerekce: 'İstisna onayı (test)' } });
    await db.maddeDurumu.update({ where: { id: durum.id }, data: { durum: 'kapsamdisi' } });

    // deadline motoru: süresi dolan istisna → yeniden değerlendirme
    await sonTarihleriIsle();

    expect((await db.istisna.findUniqueOrThrow({ where: { id: istisna.id } })).durum)
      .toBe('suresi_doldu');
    const yeniDurum = await db.maddeDurumu.findUniqueOrThrow({ where: { id: durum.id } });
    expect(yeniDurum.durum).toBe('degerlendirilmedi'); // uyumlu'ya GERİ DÖNMEZ — insan yeniden değerlendirir
    // tarihçe iki geçişi de tutuyor
    const tarihce = await db.degerlendirmeTarihcesi.findMany({
      where: { maddeDurumuId: durum.id }, orderBy: { zaman: 'asc' } });
    expect(tarihce.map((t) => t.yeniDurum)).toContain('kapsamdisi');
    expect(tarihce[tarihce.length - 1].yeniDurum).toBe('degerlendirilmedi');
    // yeniden değerlendirme görevi açıldı
    expect(await db.gorev.count({ where: {
      kaynakTipi: 'MaddeDurumu', kaynakId: durum.id, durum: 'acik' } })).toBeGreaterThan(0);
  });
});
