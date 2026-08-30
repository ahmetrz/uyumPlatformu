import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-test-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { kanitTazeligiIsle: kanitTazelikMotoru } = await import('@/lib/motorlar/kanitTazelik');
const { sonTarihleriIsle: sonTarihMotoru } = await import('@/lib/motorlar/sonTarih');
const { gapAksiyonIsle: gapAksiyonMotoru } = await import('@/lib/motorlar/gapAksiyon');
const { veriKalitesiniIsle: veriKalitesiMotoru } = await import('@/lib/motorlar/veriKalitesi');

describe('Motor entegrasyonları (izole DB kopyası)', () => {
  beforeAll(async () => {
    // temiz başlangıç: motor çıktıları sıfırlanır (denetim izi tablosuna dokunulmaz)
    await db.gorev.deleteMany({ where: { otomatikUretildi: true } });
    await db.projeAdayi.deleteMany();
    await db.veriKalitesiBulgusu.deleteMany();
  });

  it('kanıt tazelik: süresi dolan kanıt assessment SİLMEDEN bayat işaretler + görev üretir (kabul testi 3)', async () => {
    const onceDurumSayisi = await db.maddeDurumu.count();
    const sonuc = await kanitTazelikMotoru();
    expect(sonuc.islenen).toBeGreaterThan(0); // seed'de süresi dolmuş kanıt var (k3)
    // assessment kayıtları KORUNDU
    expect(await db.maddeDurumu.count()).toBe(onceDurumSayisi);
    // bayat işaretlendi
    const bayat = await db.maddeDurumu.findMany({ where: { kanitBayat: true } });
    expect(bayat.length).toBeGreaterThan(0);
    expect(bayat.every((d) => d.guven === 'bayat_kanit')).toBe(true);
    // görev üretildi
    const gorevler = await db.gorev.findMany({ where: { tip: 'kanit_yenileme', durum: 'acik' } });
    expect(gorevler.length).toBeGreaterThan(0);
    // idempotent: ikinci koşu aynı görevi ÇOĞALTMAZ
    await kanitTazelikMotoru();
    const tekrar = await db.gorev.count({ where: { tip: 'kanit_yenileme', durum: 'acik' } });
    expect(tekrar).toBe(gorevler.length);
  });

  it('son tarih: süresi dolan risk kabulü riski yeniden açar (§13.2)', async () => {
    const risk = await db.risk.create({ data: {
      kod: 'RSK-TEST-EXP', baslik: 'Süresi dolmuş kabul testi', aciklama: 't',
      durum: 'kabul_edildi', islemTipi: 'kabul',
      kabulBitis: new Date(Date.now() - 86_400_000) } });
    await sonTarihMotoru();
    const sonra = await db.risk.findUniqueOrThrow({ where: { id: risk.id } });
    expect(sonra.durum).toBe('acik'); // kabul süresi doldu → yeniden değerlendirme
  });

  it('gap-to-action: uyumsuz+kritik → proje adayı üretir; İNSAN ONAYSIZ projeye dönmez; mükerrer üretmez', async () => {
    const sonuc = await gapAksiyonMotoru();
    expect(sonuc.uretilen).toBeGreaterThan(0);
    const adaylar = await db.projeAdayi.findMany();
    expect(adaylar.every((a) => a.durum === 'oneri')).toBe(true); // hiçbiri otomatik proje olmadı
    expect(adaylar.every((a) => a.projeId === null)).toBe(true);
    const ilkSayi = adaylar.length;
    await gapAksiyonMotoru(); // ikinci koşu
    expect(await db.projeAdayi.count()).toBe(ilkSayi); // duplicate önleme
  });

  it('veri kalitesi: profilsiz tesis ve bilinmeyen kritiklik bulgu üretir; düzelince kapanır', async () => {
    await veriKalitesiMotoru();
    const acik = await db.veriKalitesiBulgusu.findMany({ where: { durum: 'acik' } });
    expect(acik.length).toBeGreaterThan(0);
    // düzeltme örneği: EWS varlığının kritikliği zaten 'yuksek'; bilinmeyen birini düzelt
    const bilinmeyen = await db.varlik.findFirst({ where: { kritiklik: 'bilinmiyor' } });
    if (bilinmeyen) {
      await db.varlik.update({ where: { id: bilinmeyen.id }, data: { kritiklik: 'orta' } });
      await veriKalitesiMotoru();
      const kalan = await db.veriKalitesiBulgusu.findMany({
        where: { durum: 'acik', kaynakId: bilinmeyen.id } });
      expect(kalan.length).toBe(0);
    }
  });

  it('kabul testi 5: proje tamamlandı yapılınca bağlı bulgu/risk OTOMATİK kapanmaz', async () => {
    const proje = await db.proje.findFirstOrThrow({ where: { kod: 'PRJ-OT-SEG' },
      include: { baglantilar: true } });
    await db.proje.update({ where: { id: proje.id }, data: { durum: 'tamamlandi' } });
    const bulgu = await db.bulgu.findFirst({ where: {
      projeBaglantilari: { some: { projeId: proje.id } } } });
    const risk = await db.risk.findFirst({ where: {
      projeler: { some: { projeId: proje.id } } } });
    expect(bulgu?.durum).not.toBe('kapali');   // doğrulama akışı olmadan kapanmadı
    expect(risk?.durum).not.toBe('kapali');
  });
});
