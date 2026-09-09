import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Arama koşulu tek yerde mi?

   Prisma'nın `contains` koşulu SQLite'ta büyük/küçük harf DUYARSIZ,
   PostgreSQL'de DUYARLI çalışır. Bugün "saha-ı" yazınca "Saha I
   HES" bulunuyor; PostgreSQL'e geçildiği gün aynı arama sessizce boş
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

  it('kip SAĞLAYICIDAN gelir: PostgreSQL duyarsız kip gönderir, SQLite göndermez [URN-KUR-009]', async () => {
    /* `mode: 'insensitive'` Prisma'nın SQLite sağlayıcısında KABUL EDİLMEZ
       ve sorgu ÇALIŞMA ZAMANINDA patlar; PostgreSQL'de ise ZORUNLUDUR —
       onsuz `contains` duyarlıdır ve arama sessizce boş döner. İki dalın
       ikisi de burada ölçülür: ortam değişkeni oynatmadan, saf fonksiyona
       sağlayıcı verilerek. */
    const { aramaKosulu, aramaOr, DUYARSIZ_KIP_DESTEKLI } = await import('@/lib/aramaKosulu');
    const { DUYARSIZ_KIP_DESTEKLI: TEK_KAYNAK, SAGLAYICI } = await import('@/lib/veritabani');
    expect(DUYARSIZ_KIP_DESTEKLI, 'bayrak tek kaynaktan okunmuyor').toBe(TEK_KAYNAK);
    expect(TEK_KAYNAK).toBe(SAGLAYICI === 'postgresql');

    expect(aramaKosulu('  saha-ı  ', false)).toEqual({ contains: 'saha-ı' });
    expect('mode' in aramaKosulu('x', false)).toBe(false);
    expect(aramaKosulu('  saha-ı  ', true)).toEqual({ contains: 'saha-ı', mode: 'insensitive' });
    expect(aramaOr(['kod', 'ad'], 'JES', true)).toEqual([
      { kod: { contains: 'JES', mode: 'insensitive' } },
      { ad: { contains: 'JES', mode: 'insensitive' } },
    ]);
  });

  it('sağlayıcı bağlantı dizesinden çözülür; tanınmayan şema SESSİZCE SQLite olmaz [URN-KUR-009]', async () => {
    const { saglayiciCoz } = await import('@/lib/veritabani');
    expect(saglayiciCoz(undefined)).toBe('sqlite');
    expect(saglayiciCoz('')).toBe('sqlite');
    expect(saglayiciCoz('file:./dev.db')).toBe('sqlite');
    expect(saglayiciCoz('/veri/uyum.db')).toBe('sqlite');
    expect(saglayiciCoz('postgres://u@h:5432/d')).toBe('postgresql');
    expect(saglayiciCoz('postgresql://u@h:5432/d')).toBe('postgresql');
    /* Sessiz düşüş = yanlış sağlayıcıyla çalışan kurulum; bunu müşteri fark eder. */
    expect(() => saglayiciCoz('mysql://u@h/d')).toThrow(/tanınmayan bir sağlayıcı/);
  });

  it('TEST_PG_URL ürünü yönetemez: yalnız test koşumunda okunur [URN-KUR-009]', async () => {
    /* Ölçüldü (R5, parti kapanışı): kabukta kalmış bir `TEST_PG_URL`, marka
       kapısının ÜRETİM DERLEMESİNE sızdı; uygulama PostgreSQL sürücüsünü
       seçti, şema SQLite'tı ve derleme "adaptör uyumsuz" diye düştü. Test
       değişkeni ürünü yönetemez — üretimde tek söz sahibi `DATABASE_URL`. */
    const { TEST_KOSUMU } = await import('@/lib/veritabani');
    expect(TEST_KOSUMU, 'test koşumu tanınmıyor').toBe(true);
    const kaynak = await import('node:fs').then((f) => f.readFileSync('lib/veritabani.ts', 'utf8'));
    expect(kaynak, 'TEST_PG_URL test kapısı olmadan okunuyor')
      .toMatch(/TEST_KOSUMU \? process\.env\.TEST_PG_URL : undefined/);
  });

  it('çok alanlı OR bloğu alan adlarını korur', async () => {
    /* Sağlayıcı AÇIKÇA verilir: kip sağlayıcıya bağlı olduğu için varsayılana
       bırakılan bir beklenti PostgreSQL koşusunda kırmızı yanardı ve kırmızının
       sebebi "alan adları bozuldu" gibi okunurdu. */
    const { aramaOr } = await import('@/lib/aramaKosulu');
    expect(aramaOr(['kod', 'ad'], 'JES', false)).toEqual([
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
    /* Arama sonucu SINIRLIDIR (`take: 5`). Sorgu ÖNEK olursa (`SAHA-`) on beş
       tesis eşleşir ve aranan kayıt ilk beşe girmeyebilir — testin kırmızısı
       "arama bozuk" demez, "sorgu ayırt edici değil" der. Ölçüldü (R5):
       PostgreSQL'de tam olarak bu oldu. Bu yüzden sorgu TAM koddur ve tesis
       sıralı seçilir (sırasız `findFirstOrThrow` PostgreSQL'de rastgeledir). */
    const { ara } = await import('@/lib/eylemler2/arama');
    const tesis = await db.tesis.findFirstOrThrow({ orderBy: { kod: 'asc' } });
    const sonuc = await ara(tesis.kod);
    expect(sonuc.some((s) => s.id === tesis.id), `aranan: ${tesis.kod}`).toBe(true);
  });

  it('iki karakterden kısa sorgu sonuç döndürmez', async () => {
    const { ara } = await import('@/lib/eylemler2/arama');
    expect(await ara('a')).toEqual([]);
  });

  /* DOĞRU DAVRANIŞ: arama büyük/küçük harf duyarsızdır — sağlayıcı ne
     olursa olsun. SQLite'ta bunu `LIKE`ın ASCII duyarsızlığı sağlar,
     PostgreSQL'de `mode: 'insensitive'` (R5, `lib/veritabani.ts`).
     Önceki hâli "bugünkü davranışı kayıt altına alır, doğru olduğunu
     iddia etmez" diyordu ve PostgreSQL'de kırmızıya dönecek şekilde
     yazılmıştı; kip sağlayıcıdan geldiği için artık İKİ SAĞLAYICIDA DA
     yeşildir — test devre dışı bırakılmadı, doğru davranışa göre
     yeniden yazıldı. Türkçe İ/ı katlaması hâlâ kapsam dışıdır
     (`lib/aramaKosulu.ts` § Türkçe uyarısı). */
  it('arama büyük/küçük harf duyarsızdır — iki sağlayıcıda da [URN-KUR-009]', async () => {
    const { ara } = await import('@/lib/eylemler2/arama');
    const tesis = await db.tesis.findFirstOrThrow({ orderBy: { kod: 'asc' } });
    const kucuk = tesis.kod.toLowerCase();
    const buyuk = tesis.kod.toUpperCase();
    expect(kucuk, 'kodda harf yok — duyarsızlık ölçülemez').not.toBe(buyuk);
    expect((await ara(kucuk)).some((s) => s.id === tesis.id), `küçük: ${kucuk}`).toBe(true);
    expect((await ara(buyuk)).some((s) => s.id === tesis.id), `büyük: ${buyuk}`).toBe(true);
  });
});
