import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Veritabanı kısıtı kullanıcıya okunabilir bir cümleyle döner.

   Tekillik ihlali Prisma'nın ham metniyle çıkıyordu:
   "Unique constraint failed on the fields: (`kod`)". Kullanıcı bunu
   okuyamaz ve daha kötüsü, ne yapması gerektiğini öğrenemez.

   Kısıtın kendisi bir kusur DEĞİL, çalışan bir korumadır: kod önerileri
   (RSK-/DEN-/PRJ-) sayfa render'ında hesaplanıp forma varsayılan olarak
   veriliyor, yani iki kullanıcı formu aynı anda açarsa aynı kodu görür.
   Veritabanı kopyayı engelliyor — eksik olan tek şey insanın ne olduğunu
   anlamasıydı. Bu testler o cümlenin var olduğunu ve ham Prisma metninin
   SIZMADIĞINI dondurur. */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kisit-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { hata } = await import('@/lib/eylemler2/ortak');

describe('Tekillik kısıtı okunabilir cümleye çevrilir', () => {
  it('GERÇEK bir Prisma ihlali ham metinle dönmez', async () => {
    /* Elde uydurulmuş bir hata nesnesi değil, veritabanının gerçekten
       ürettiği istisna kullanılır: Prisma'nın hata biçimi değişirse bu
       test kırmızıya döner ve çeviri sessizce devre dışı kalmaz. */
    const t = await db.tesis.findFirstOrThrow();
    let yakalanan: unknown;
    try {
      await db.tesis.create({ data: { kod: t.kod, ad: 'Kopya kod denemesi' } });
    } catch (e) { yakalanan = e; }
    expect(yakalanan, 'tekillik kısıtı hiç tetiklenmedi — kısıt yok olabilir')
      .toBeDefined();

    const s = hata(yakalanan);
    expect(s.ok).toBe(false);
    if (!s.ok) {
      expect(s.hata).not.toContain('Unique constraint');
      expect(s.hata).not.toContain('prisma');
      expect(s.hata).toMatch(/kullanılıyor|benzersiz/i);
    }
  });

  it('`kod` alanı için NE YAPILACAĞINI söyler', () => {
    const s = hata({ code: 'P2002', meta: { target: ['kod'] } });
    expect(s.ok).toBe(false);
    if (!s.ok) {
      expect(s.hata).toContain('formu yenileyip');
      expect(s.hata).toContain('kullanılıyor');
    }
  });

  it('birden çok alanlı kısıt alanları sayar', () => {
    const s = hata({ code: 'P2002', meta: { target: ['kaynak', 'kaynakKayitId'] } });
    if (!s.ok) expect(s.hata).toContain('kaynak, kaynakKayitId');
  });

  it('hedef bildirilmeyen ihlal de anlamlı cümle verir', () => {
    const s = hata({ code: 'P2002' });
    if (!s.ok) expect(s.hata).toMatch(/aynı kayıt zaten var/);
  });

  it('BAŞKA hatalar çevrilmez — mesajları olduğu gibi kalır', () => {
    /* Çeviri yalnız P2002'ye uygulanır. Her hatayı "zaten var" diye
       göstermek, gerçek sebebi gizlemek olurdu. */
    const s = hata(new Error('Bağlantı zaman aşımına uğradı'));
    if (!s.ok) expect(s.hata).toBe('Bağlantı zaman aşımına uğradı');
    const y = hata({ code: 'P2025' });
    if (!y.ok) expect(y.hata).toBe('Beklenmeyen hata');
  });
});
