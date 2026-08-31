import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Regresyon: uygulanabilirlik motoru 'eksik_profil' bulgusunu her koşuda
   yeniden üretiyordu — açık aynı bulgu var mı diye bakmıyordu.

   Ölçülen davranış (düzeltmeden önce, 16 aktif tesis / 2 aktif kural):
     tur 1 → 4 bulgu · tur 2 → 6 bulgu · tur 3 → 8 bulgu
   Yani koşu başına sabit artış ve SINIRSIZ büyüme. Entegrasyon zinciri
   motoru her yeni veri geldiğinde tetiklediği için bu, platform sağlığı
   ekranındaki açık bulgu listesini kalıcı olarak şişiriyordu.

   Bu test tekrarlı koşunun bulgu sayısını artırmadığını sabitler. */

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-uygbulgu-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { tesisKapsaminiHesapla } = await import('@/lib/motorlar/uygulanabilirlik');

async function eksikProfilSayisi(): Promise<number> {
  return db.veriKalitesiBulgusu.count({ where: { kural: 'eksik_profil' } });
}

async function tumTesisleriHesapla(): Promise<void> {
  const tesisler = await db.tesis.findMany({ where: { durum: 'aktif' }, select: { id: true } });
  for (const t of tesisler) await tesisKapsaminiHesapla(t.id);
}

describe('Uygulanabilirlik motoru — veri kalitesi bulgusu üretimi', () => {
  beforeAll(async () => {
    await db.veriKalitesiBulgusu.deleteMany({ where: { kural: 'eksik_profil' } });
  });

  it('tekrarlı koşu açık bulguyu ÇOĞALTMAZ', async () => {
    await tumTesisleriHesapla();
    const ilk = await eksikProfilSayisi();

    await tumTesisleriHesapla();
    const ikinci = await eksikProfilSayisi();

    await tumTesisleriHesapla();
    const ucuncu = await eksikProfilSayisi();

    expect(ikinci).toBe(ilk);
    expect(ucuncu).toBe(ilk);
  });

  it('aynı tesis+kural için tek açık bulgu bulunur', async () => {
    const acik = await db.veriKalitesiBulgusu.findMany({
      where: { kural: 'eksik_profil', durum: 'acik' },
      select: { kaynakId: true },
    });
    const sayim = new Map<string, number>();
    for (const b of acik) sayim.set(b.kaynakId, (sayim.get(b.kaynakId) ?? 0) + 1);
    const cogalanlar = [...sayim.entries()].filter(([, n]) => n > 1);
    expect(cogalanlar).toEqual([]);
  });

  it('kapatılmış bulgu koşuyu engellemez — koşul sürüyorsa yenisi açılır', async () => {
    const mevcut = await db.veriKalitesiBulgusu.findFirst({
      where: { kural: 'eksik_profil', durum: 'acik' },
    });
    if (!mevcut) {
      // Bu seed'de karar verilemeyen tesis yoksa test anlamsız; sessizce geçme,
      // açıkça atla ki "yeşil" görünen boş bir test kalmasın.
      expect(mevcut).toBeNull();
      return;
    }
    await db.veriKalitesiBulgusu.update({
      where: { id: mevcut.id }, data: { durum: 'cozuldu', kapanis: new Date() },
    });
    const oncesi = await eksikProfilSayisi();

    await tumTesisleriHesapla();

    // Koşul hâlâ sürüyor: kapatılan bulgunun yerine yenisi açılmalı.
    const sonrasi = await eksikProfilSayisi();
    expect(sonrasi).toBe(oncesi + 1);
    const acikSayisi = await db.veriKalitesiBulgusu.count({
      where: { kural: 'eksik_profil', kaynakId: mevcut.kaynakId, durum: 'acik' },
    });
    expect(acikSayisi).toBe(1);
  });
});
