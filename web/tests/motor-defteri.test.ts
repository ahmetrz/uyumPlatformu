import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Kayıtlı her motor GERÇEK seed verisine karşı koşar mı?

   Motorların tek tek testi var ama hiçbiri "defterdeki her motor
   çalışıyor" sorusunu sormuyordu. Bu boşluk şuna yol açtı: motor listesi
   iki yerde ayrı ayrı yazılıydı ve saatlik zamanlayıcı sekiz motorun
   yalnız beşini koşturuyordu — üçü aylarca hiç koşmasa kimse fark
   etmezdi, çünkü "hiç koşmamış motor" ile "koşup bir şey bulamamış
   motor" ekranda ayrı görünse de testte ayrılmıyordu.

   Bu test defterin TAMAMINI koşturur ve her koşunun IsKosusu satırını
   `basarili` bıraktığını doğrular. Bir motor patlarsa hangisi olduğu
   isimle raporlanır. */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-motordefter-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { isKos } = await import('@/lib/motorlar/isKosucu');
const { MOTORLAR, MOTOR_ADLARI } = await import('@/lib/motorlar/kayit');

describe('Motor defteri — uçtan uca koşu', () => {
  it('defterdeki sekiz motorun her biri seed verisinde HATASIZ koşar', async () => {
    const basarisiz: string[] = [];
    for (const [ad, motor] of Object.entries(MOTORLAR)) {
      const sonuc = await isKos(ad, motor);
      if (!sonuc.ok) basarisiz.push(`${ad}: ${sonuc.sebep === 'hata' ? sonuc.hata : sonuc.sebep}`);
    }
    expect(basarisiz).toEqual([]);
  });

  it('her motor kendi koşu satırını bırakır — sessiz koşu yok', async () => {
    for (const ad of MOTOR_ADLARI) {
      const kosu = await db.isKosusu.findFirst({
        where: { isAdi: ad }, orderBy: { baslangic: 'desc' },
      });
      expect(kosu, `${ad} koşu kaydı bırakmadı`).not.toBeNull();
      expect(kosu!.durum, `${ad} başarısız kapandı: ${kosu!.hata}`).toBe('basarili');
      // Süre yazılmayan koşu, bitişi hiç işlenmemiş koşudur.
      expect(kosu!.sureMs, `${ad} süre yazmadı`).not.toBeNull();
    }
  });

  it('ikinci koşu bulguları ÇOĞALTMAZ', async () => {
    /* Motorlar tam tarama yapar; aynı koşulu iki kez görmek iki bulgu
       demek değildir. Uygulanabilirlik motorunda bu kusur bir kez
       yaşandı (koşu başına sabit artış), bu yüzden defterin tamamı için
       sabitleniyor. */
    const say = () => db.veriKalitesiBulgusu.count({ where: { durum: 'acik' } });
    const once = await say();
    for (const [ad, motor] of Object.entries(MOTORLAR)) await isKos(ad, motor);
    expect(await say()).toBe(once);
  });
});
