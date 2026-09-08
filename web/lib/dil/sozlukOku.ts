import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { eksikSozlukMesaji, kapsamKarari, sozlukKarari } from './sozlukDurumu';
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
  /* SESSİZ DÜŞÜŞ YOK. `satirlar.length === 0` iken sektör VAR demektir —
     kurulu bir sektör paketinin dili eksik. Bu "sözlük yok" değil,
     "sözlük BOŞ"tur ve kusurdur; çağıran yine `null` alır (ekran çalışır,
     çekirdek sözcük kullanır) ama durum artık kütüğe geçer. */
  if (sozlukKarari(sektorId, satirlar.length) === 'eksik') {
    console.error(eksikSozlukMesaji(sektorId));
    return null;
  }
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
  /* ÜÇ DEĞERLİ MANTIK — BİLİNMEYEN ≠ TEK. Eski kod sektörsüz tesisi
     `.filter(Boolean)` ile ATIYOR, sonra kalanlara "tek sektör" diyordu:
     bir sınıflı + bir sınıfsız tesis içeren kapsamda kabuk enerji
     sözlüğünü seçiyor ve SINIFSIZ kayda da o sektörün sözcüğünü
     veriyordu. Oysa
     `Tesis.tipId` de `TesisTipi.sektorId` de nullable; sınıfsız tesisin
     sektörü YANLIŞ değil, BİLİNMİYOR.

     Bilinmeyeni yok sayıp kalana bakmak, "bilinmeyen ≠ sıfır" kuralının
     tam ihlalidir. Kapsamda sektörü bilinmeyen tek bir tesis varsa
     çekirdeğe düşülür — çok sektörlü kapsamla aynı gerekçe: birinin
     sözcüğünü seçmek öbürü için yanlış olur. */
  const sektorId = kapsamKarari(tesisler.map((t) => t.tip?.sektorId ?? null));
  if (sektorId === null) return null;
  return sektorSozlugu(sektorId, dil);
});

/** Kapsam dizisini `kapsamSozlugu` anahtarına çevirir (sıralı, tekrarsız). */
export function kapsamAnahtari(tesisIdleri: string[] | null): string | null {
  return tesisIdleri === null ? null : [...new Set(tesisIdleri)].sort().join(',');
}
