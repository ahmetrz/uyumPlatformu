import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Kayıtlı her motor GERÇEK seed verisine karşı koşar mı?

   Motorların tek tek testi var ama hiçbiri "defterdeki her motor
   çalışıyor" sorusunu sormuyordu. Bu boşluk şuna yol açtı: motor listesi
   iki yerde ayrı ayrı yazılıydı ve saatlik zamanlayıcı o günkü sekiz
   motorun yalnız beşini koşturuyordu — üçü aylarca hiç koşmasa kimse
   fark etmezdi, çünkü "hiç koşmamış motor" ile "koşup bir şey bulamamış
   motor" ekranda ayrı görünse de testte ayrılmıyordu.

   Defter bugün ON İKİ motor taşıyor. Son üçü varlık güvenlik duruşu
   üçlüsüdür (`firmware_uyumu` · `zafiyet_korelasyonu` · `ag_tutarliligi`)
   ve üçü de OT-22/OT-25/OT-11 maddeleriyle birlikte geldi.
   Sayı BİLEREK sabit yazılıyor: koşu döngüsü
   zaten defterden okuduğu için sayı olmadan da her motoru koşturur, ama
   o hâlde defterden bir motorun YANLIŞLIKLA DÜŞMESİ testi hiç kırmazdı —
   sabit sayı, sessiz kaybı yakalayan tek şeydir. Motor eklendiğinde bu
   satır da bilerek güncellenir.

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
  it('defterdeki on sekiz motorun her biri seed verisinde HATASIZ koşar [YON-MOT-003]', async () => {
    // Defterin dolu olduğunu da ölç: boş bir defter bu testi yanlışlıkla geçerdi.
    expect(MOTOR_ADLARI).toHaveLength(18);
    expect(MOTOR_ADLARI).toContain('erisim_degerlendirme');
    expect(MOTOR_ADLARI).toContain('zimmet_suresi');
    /* Duruş üçlüsü ADIYLA aranır: sayıyı 12'ye çıkarıp üçünden birini
       düşürmek testi geçirirdi. */
    for (const ad of ['firmware_uyumu', 'zafiyet_korelasyonu', 'ag_tutarliligi']) {
      expect(MOTOR_ADLARI, `${ad} defterden düşmüş`).toContain(ad);
    }
    /* Uyum yönetişimi ikilisi de ADIYLA aranır (UY-28 · UY-36): ikisi de
       ölü şema alanlarını YAZAN motorlardır ve defterden sessizce
       düşerlerse o alanlar yeniden ölür. */
    for (const ad of ['tekrar_bulgu', 'eskalasyon']) {
      expect(MOTOR_ADLARI, `${ad} defterden düşmüş`).toContain(ad);
    }

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
