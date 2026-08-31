import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-surum-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');

// Eylem katmanını doğrudan çağırmak oturum ister; motor mantığını
// surumAktiflestir ile aynı adımlarla DB seviyesinde doğruluyoruz —
// bu test sürümleme VERİ kurallarını sabitler (kabul testi 6).
describe('Kabul testi 6 — regülasyon yeni sürüm', () => {
  it('yeni sürüm eski değerlendirmeleri SİLMEZ; diff oluşur; yeni değerlendirme ihtiyacı açılır', async () => {
    const reg = await db.regulasyon.findFirstOrThrow({ where: { kod: 'EPDK-SYM' } });
    const eskiSurum = await db.frameworkSurumu.findFirstOrThrow({
      where: { regulasyonId: reg.id, durum: 'aktif' } });
    const eskiMaddeler = await db.madde.findMany({
      where: { regulasyonId: reg.id, surumId: eskiSurum.id } });
    const eskiDurumSayisi = await db.maddeDurumu.count({
      where: { madde: { surumId: eskiSurum.id } } });
    expect(eskiDurumSayisi).toBeGreaterThan(0);

    // taslak sürüm + kopya maddeler (bir maddeyi değiştir, bir yeni ekle)
    const taslak = await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: 'TEST-2027', durum: 'taslak' } });
    const kodIdx = new Map<string, string>();
    for (const m of eskiMaddeler) {
      const k = await db.madde.create({ data: {
        regulasyonId: reg.id, surumId: taslak.id, kod: m.kod,
        baslik: m.baslik,
        metin: m.kod === 'EPDK-SYM-4.2.1' ? m.metin + ' (IEC 62443 bölge modeli zorunlu.)' : m.metin,
        sira: m.sira } });
      kodIdx.set(m.kod, k.id);
    }
    const yeniMadde = await db.madde.create({ data: {
      regulasyonId: reg.id, surumId: taslak.id, kod: 'EPDK-SYM-8.1',
      baslik: 'Tedarik zinciri güvenliği', metin: 'OT tedarikçileri değerlendirilir.' } });

    // --- aktifleştirme mantığı (surumAktiflestir ile birebir)
    const yeniler = await db.madde.findMany({ where: { surumId: taslak.id } });
    const eskiIdx = new Map(eskiMaddeler.map((m) => [m.kod, m]));
    const degisen: string[] = [];
    for (const m of yeniler) {
      const e = eskiIdx.get(m.kod);
      if (!e) { degisen.push(m.id);
        await db.surumFarki.create({ data: { eskiSurumId: eskiSurum.id,
          yeniSurumId: taslak.id, maddeKodu: m.kod, degisimTipi: 'yeni' } });
      } else if (e.metin !== m.metin) { degisen.push(m.id);
        await db.surumFarki.create({ data: { eskiSurumId: eskiSurum.id,
          yeniSurumId: taslak.id, maddeKodu: m.kod, degisimTipi: 'degisti' } });
      }
    }
    /* SIRA ÖNEMLİ: önce eskiyi arşivle, sonra yeniyi aktifleştir.
       `FrameworkSurumu_tekAktif` kısmi tekil indeksi (migration
       20260901201000) bir regülasyonda ikinci aktif sürümü VERİTABANI
       seviyesinde reddeder; ters sırada bu satır P2002 ile patlar.
       Bu, testin kurulumu değil ürünün kuralıdır — bkz. lib/eylemler2/surum.ts */
    await db.frameworkSurumu.update({ where: { id: eskiSurum.id }, data: { durum: 'arsiv' } });
    await db.frameworkSurumu.update({ where: { id: taslak.id }, data: { durum: 'aktif' } });
    const surec = await db.uyumSureci.findFirstOrThrow({
      where: { regulasyonId: reg.id, durum: 'aktif' }, include: { kapsam: true } });
    for (const maddeId of degisen)
      for (const kk of surec.kapsam)
        await db.maddeDurumu.upsert({
          where: { surecId_maddeId_tesisId: { surecId: surec.id, maddeId, tesisId: kk.tesisId } },
          update: {}, create: { surecId: surec.id, maddeId, tesisId: kk.tesisId } });

    // --- DOĞRULAMALAR
    // 1) eski değerlendirmeler aynen duruyor
    expect(await db.maddeDurumu.count({ where: { madde: { surumId: eskiSurum.id } } }))
      .toBe(eskiDurumSayisi);
    // 2) diff kayıtları: 1 değişen + 1 yeni
    const farklar = await db.surumFarki.findMany({ where: { yeniSurumId: taslak.id } });
    expect(farklar.filter((f) => f.degisimTipi === 'degisti').map((f) => f.maddeKodu))
      .toContain('EPDK-SYM-4.2.1');
    expect(farklar.filter((f) => f.degisimTipi === 'yeni').map((f) => f.maddeKodu))
      .toContain('EPDK-SYM-8.1');
    // 3) yeni değerlendirme ihtiyacı: kapsam tesislerine 'degerlendirilmedi' açıldı
    const yeniDurumlar = await db.maddeDurumu.findMany({
      where: { maddeId: yeniMadde.id } });
    expect(yeniDurumlar.length).toBe(surec.kapsam.length);
    expect(yeniDurumlar.every((d) => d.durum === 'degerlendirilmedi')).toBe(true);
    // 4) eski sürüm arşivde, maddeleri silinmedi
    expect((await db.frameworkSurumu.findUniqueOrThrow({ where: { id: eskiSurum.id } })).durum)
      .toBe('arsiv');
    expect(await db.madde.count({ where: { surumId: eskiSurum.id } })).toBe(eskiMaddeler.length);
  });
});
