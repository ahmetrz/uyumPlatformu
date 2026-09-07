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
