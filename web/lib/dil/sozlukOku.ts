import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { sozlukKur, type Sozluk } from './terimler';

/* Sektör sözlüğünün SUNUCU tarafı. Ayrı dosya: `terimler.ts` veritabanı
   bilmez ve istemcide de çözülebilir; burası `server-only`.

   ── HANGİ SEKTÖR ──────────────────────────────────────────────────────
   Bugün kiracı modeli yok (P2 getirecek), o yüzden sektör KAYDIN
   kendisinden çözülür: tesis → tesis tipi → sektör. Bu, kiracı modeli
   geldiğinde de doğru kalır — iki sektörde tesisi olan bir kiracıda
   ekran her tesisi kendi sözcüğüyle anmalıdır, kiracının "ana" sektörüyle
   değil.

   ── SEKTÖRÜ OLMAYAN TESİS ─────────────────────────────────────────────
   Tipi ya da tipinin sektörü yoksa sözlük `null` döner ve ekran çekirdek
   sözcüğü ("tesis") kullanır. `null` burada "sözlük yok" demektir;
   "sözlük boş" demek değildir ve bir hata değildir. */

export const tesisSozlugu = cache(async (tesisId: string, dil = 'tr'): Promise<Sozluk | null> => {
  const tesis = await db.tesis.findUnique({
    where: { id: tesisId },
    select: { tip: { select: { sektorId: true } } },
  });
  const sektorId = tesis?.tip?.sektorId ?? null;
  if (!sektorId) return null;
  return sektorSozlugu(sektorId, dil);
});

export const sektorSozlugu = cache(async (sektorId: string, dil = 'tr'): Promise<Sozluk | null> => {
  const satirlar = await db.sektorSozlugu.findMany({
    where: { sektorId, dil },
    select: {
      anahtar: true, tekil: true, cogul: true, iyelik: true, belirtme: true,
      bulunma: true, yonelme: true,
    },
  });
  if (satirlar.length === 0) return null;
  return sozlukKur(satirlar);
});

/** Bir KAPSAMIN sözlüğü — kabuk gibi paylaşılan katmanlar için.

    `tesisIdleri` kullanıcının görebildiği tesisler (`null` = sınırsız).
    Kapsamdaki tesisler tek bir sektöre aitse o sektörün sözlüğü döner.
    BİRDEN ÇOK sektör varsa `null` döner ve çekirdek sözcük kullanılır:
    iki sektörlü bir kiracıda sektörlerden birinin sözcüğünü seçmek,
    portföyün öbür yarısı için yanlış olurdu. Sıfır sektör de `null`dur.

    P2 kiracı modelini getirdiğinde bu çözüm `Kiraci.sektorId`e taşınır;
    o güne kadar sektör, kullanıcının gerçekten gördüğü kayıtlardan
    türetilir — uydurulmaz. */
export const kapsamSozlugu = cache(async (
  tesisAnahtari: string | null, dil = 'tr',
): Promise<Sozluk | null> => {
  /* `cache()` argüman KİMLİĞİNE göre anahtarlar; dizi geçirmek her
     çağrıda ıskalardı. Çağıran kapsamı sıralı bir dizeye çevirir. */
  const idler = tesisAnahtari === null ? null : tesisAnahtari.split(',').filter(Boolean);
  const tesisler = await db.tesis.findMany({
    where: { durum: 'aktif', ...(idler === null ? {} : { id: { in: idler } }) },
    select: { tip: { select: { sektorId: true } } },
  });
  const sektorler = new Set(
    tesisler.map((t) => t.tip?.sektorId).filter((x): x is string => Boolean(x)),
  );
  if (sektorler.size !== 1) return null;
  return sektorSozlugu([...sektorler][0], dil);
});

/** Kapsam dizisini `kapsamSozlugu` anahtarına çevirir (sıralı, tekrarsız). */
export function kapsamAnahtari(tesisIdleri: string[] | null): string | null {
  return tesisIdleri === null ? null : [...new Set(tesisIdleri)].sort().join(',');
}
