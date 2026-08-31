import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Arama koşulu tek yerde mi?

   Prisma'nın `contains` koşulu SQLite'ta büyük/küçük harf DUYARSIZ,
   PostgreSQL'de DUYARLI çalışır. Bugün "kizildere" yazınca "Kızıldere I
   JES" bulunuyor; PostgreSQL'e geçildiği gün aynı arama sessizce boş
   dönecek — hata vermez, sadece hiçbir şey bulmaz.

   Koşul on bir ayrı yerde tekrarlanıyordu. Bu test onu tek yerde tutar:
   göç günü değişecek satır bir tane olsun. Yeni bir ham `contains:` eklenen
   gün bu test kırmızıya döner ve yazan kişi tuzağı öğrenir.

   Test dosya İÇERİĞİNE bakar; bir birim testinden çok bir mimari kural
   bekçisidir ve bunu bilerek yapar: kuralın kendisi çalışma zamanında
   gözlemlenebilir değil, yalnız göç gününde gözlemlenebilir olurdu. */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-arama-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const KOK = path.resolve('.');
const TARANAN = ['lib', 'app'];
const MUAF = new Set([path.join('lib', 'aramaKosulu.ts')]);

function tsDosyalari(dizin: string, birikim: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    const tam = path.join(dizin, ad);
    if (ad === 'prisma-client' || ad === 'node_modules') continue;
    if (statSync(tam).isDirectory()) tsDosyalari(tam, birikim);
    else if (/\.tsx?$/.test(ad)) birikim.push(tam);
  }
  return birikim;
}

describe('Metin arama koşulu tek yerde', () => {
  it('lib/ ve app/ altında ham `contains:` KALMADI', () => {
    const suclular: string[] = [];
    for (const kok of TARANAN) {
      for (const dosya of tsDosyalari(path.join(KOK, kok))) {
        const bagil = path.relative(KOK, dosya);
        if (MUAF.has(bagil)) continue;
        const icerik = readFileSync(dosya, 'utf8');
        icerik.split('\n').forEach((satir, i) => {
          if (/\bcontains:\s/.test(satir)) suclular.push(`${bagil}:${i + 1}`);
        });
      }
    }
    expect(
      suclular,
      'Ham `contains:` PostgreSQL\'de büyük/küçük harfe duyarlı olur ve arama '
      + 'sessizce boş döner. lib/aramaKosulu.ts içindeki aramaKosulu()/aramaOr() kullanın.',
    ).toEqual([]);
  });

  it('yardımcı, bugünkü sağlayıcının desteklemediği kipi GÖNDERMEZ', async () => {
    /* `mode: 'insensitive'` Prisma'nın SQLite sağlayıcısında kabul
       edilmez ve sorgu ÇALIŞMA ZAMANINDA patlar. Bayrak bugün kapalı
       olmalı; açık unutulursa arama tamamen çöker. */
    const { aramaKosulu, DUYARSIZ_KIP_DESTEKLI } = await import('@/lib/aramaKosulu');
    expect(DUYARSIZ_KIP_DESTEKLI).toBe(false);
    expect(aramaKosulu('  kizildere  ')).toEqual({ contains: 'kizildere' });
    expect('mode' in aramaKosulu('x')).toBe(false);
  });

  it('çok alanlı OR bloğu alan adlarını korur', async () => {
    const { aramaOr } = await import('@/lib/aramaKosulu');
    expect(aramaOr(['kod', 'ad'], 'JES')).toEqual([
      { kod: { contains: 'JES' } },
      { ad: { contains: 'JES' } },
    ]);
  });
});


/* ═══ Refaktörün davranışı bozmadığının kanıtı ════════════════════════ */

describe('Arama gerçekten çalışıyor', () => {
  let db: typeof import('@/lib/db')['db'];

  beforeAll(async () => {
    ({ db } = await import('@/lib/db'));
    const { oturumCereziAyarla } = await import('./sahte/next-headers');
    const k = await db.kullanici.create({
      data: {
        adSoyad: 'Arama Testi', eposta: `arama-${Date.now()}@ornek.test`, aktif: true,
        yetkiler: { create: [{ rol: 'yonetici', modul: null }] },
      },
    });
    const jeton = randomBytes(32).toString('base64url');
    await db.oturum.create({
      data: {
        kullaniciId: k.id, tokenHash: createHash('sha256').update(jeton).digest('hex'),
        bitis: new Date(Date.now() + 3_600_000),
      },
    });
    oturumCereziAyarla(jeton);
  });

  it('santral kodunu bulur — koşul yardımcıya taşındıktan sonra da', async () => {
    const { ara } = await import('@/lib/eylemler2/arama');
    const tesis = await db.tesis.findFirstOrThrow();
    const sonuc = await ara(tesis.kod.slice(0, 5));
    expect(sonuc.some((s) => s.id === tesis.id)).toBe(true);
  });

  it('iki karakterden kısa sorgu sonuç döndürmez', async () => {
    const { ara } = await import('@/lib/eylemler2/arama');
    expect(await ara('a')).toEqual([]);
  });

  /* Bugünkü davranışı KAYIT ALTINA alır, doğru olduğunu iddia etmez:
     SQLite'ın LIKE'ı ASCII için duyarsız olduğu için küçük harfle yazılan
     bir kod da bulunur. PostgreSQL'de bu test kırmızıya döner — ve
     dönmesi GEREKİR, çünkü tam olarak o gün arama sessizce bozulacaktır.
     Kırmızı bir test, sessiz bir regresyondan iyidir. */
  it('bugün büyük/küçük harf duyarsız (SQLite) — göç günü bu test uyarır', async () => {
    const { ara } = await import('@/lib/eylemler2/arama');
    const tesis = await db.tesis.findFirstOrThrow();
    const kucuk = tesis.kod.slice(0, 5).toLowerCase();
    const buyuk = tesis.kod.slice(0, 5).toUpperCase();
    if (kucuk === buyuk) return; // kodda harf yok, vaka uygulanamaz
    expect((await ara(kucuk)).some((s) => s.id === tesis.id)).toBe(true);
    expect((await ara(buyuk)).some((s) => s.id === tesis.id)).toBe(true);
  });
});
