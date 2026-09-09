import 'server-only';
import { gunluk } from '../gunluk';
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

/** Kapsam ÖĞESİNİN sözlüğü (B1): öğe tesise köprülüyse tesisin
    sektörü; köprüsüz öğe (ileride sistem, iş fonksiyonu) sektörsüzdür ve
    çekirdek sözcüğe düşer — null. Uyum eylemleri özneyi öğeyle
    bildiği için `tesisSozlugu`nun öğe kapısıdır. */
export const ogeSozlugu = cache(async (kapsamOgesiId: string, dil = 'tr'): Promise<Sozluk | null> => {
  const oge = await db.kapsamOgesi.findUnique({
    where: { id: kapsamOgesiId },
    select: { tesis: { select: { tip: { select: { sektorId: true } } } } },
  });
  const sektorId = oge?.tesis?.tip?.sektorId ?? null;
  if (!sektorId) return null;
  return sektorSozlugu(sektorId, dil);
});

/** Öznitelik ETİKETLERİ — sektör sözlüğünün çekirdek terim listesi
    DIŞINDAKİ anahtarları. `sozlukKur` çekirdeğin tanımadığı anahtarı
    atar (ekran onu terim olarak çözemez); paketin öznitelik şeması ise
    `etiketAnahtari`yi buradan çözer. Anahtar → tekil biçim. Satırı
    olmayan anahtar sözlükte YOKTUR: çağıran anahtarın kendisini yazar,
    sözcük uydurmaz. */
export const oznitelikEtiketleri = cache(async (sektorId: string, dil = 'tr'): Promise<Record<string, string>> => {
  // yalnız AKTİF satır: paket yükseltmesinin bıraktığı sözcük ekrana inmez (2.1)
  const satirlar = await db.sektorSozlugu.findMany({
    where: { sektorId, dil, aktif: true }, select: { anahtar: true, tekil: true } });
  return Object.fromEntries(satirlar.filter((s) => s.tekil).map((s) => [s.anahtar, s.tekil]));
});

export const sektorSozlugu = cache(async (sektorId: string, dil = 'tr'): Promise<Sozluk | null> => {
  const satirlar = await db.sektorSozlugu.findMany({
    where: { sektorId, dil, aktif: true },
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
    gunluk.hata('sozluk.eksik', { sektorId, mesaj: eksikSozlukMesaji(sektorId) });
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

/** Bir kapsamda GEÇEN sektörler — sözlükleriyle birlikte.

    ── NİÇİN VAR ─────────────────────────────────────────────────────────
    `kapsamSozlugu` çok sektörlü kapsamda `null` döner ve bu DOĞRUDUR:
    kabuk kendi başına sektörlerden birini seçemez, seçerse portföyün
    öbür yarısı için yalan söyler. Ama kullanıcı seçebilir. Bu okuma o
    seçimin malzemesini verir: kapsamda hangi sektörler var, her birinin
    sözcükleri ne.

    Karar hâlâ kabuğun değil KULLANICININ: araç sıralı bir liste döner,
    hangisinin etkin olduğunu söylemez.

    ── SÖZLÜĞÜ OLMAYAN SEKTÖR LİSTEYE GİRMEZ ─────────────────────────────
    Sözlüğü boş bir sektörü seçeneğe koymak, seçildiğinde hiçbir sözcüğü
    değiştirmeyen bir düğme çizmek olurdu — kullanıcı ürünün bozuk
    olduğunu düşünür. `sektorSozlugu` zaten "boş sözlük" hâlini kütüğe
    yazıyor; burada o sektör sessizce değil, GEREKÇELİ olarak dışarıda
    kalır.

    ── ÖLÇÜM SÖZLÜKLERİ BURADA YOKTUR ────────────────────────────────────
    `iki-sozluk` kapısının `stres` sözlüğü bir ÖLÇÜM ARACIDIR ve
    veritabanına hiç ekilmez; bu okuma yalnız kurulu sektör paketlerini
    görür. Yani ölçüm sözlüğünün arayüzde görünmesi için ayrı bir
    filtreye gerek yok — hiç var olmuyor. */
export const kapsamSektorleri = cache(async (
  tesisAnahtari: string | null, dil = 'tr',
): Promise<{ id: string; kod: string; ad: string; sozluk: Sozluk }[]> => {
  const idler = tesisAnahtari === null ? null : tesisAnahtari.split(',').filter(Boolean);
  const tesisler = await db.tesis.findMany({
    where: { durum: 'aktif', ...(idler === null ? {} : { id: { in: idler } }) },
    select: { tip: { select: { sektorId: true } } },
  });
  /* Sektörü BİLİNMEYEN tesis bir sektör seçeneği üretmez; onu bir
     kovaya atmak "bilinmeyen ≠ sıfır"ın seçici tarafındaki ihlali
     olurdu. Böyle bir tesis varsa kullanıcı hangi merceği seçerse
     seçsin o kayıt çekirdek sözcükle anılır — doğrusu budur. */
  const idKumesi = [...new Set(
    tesisler.map((t) => t.tip?.sektorId ?? null).filter((x): x is string => x !== null),
  )];
  if (idKumesi.length === 0) return [];
  const sektorler = await db.sektor.findMany({
    where: { id: { in: idKumesi }, aktif: true },
    select: { id: true, kod: true, ad: true },
    orderBy: { ad: 'asc' },
  });
  const cikti: { id: string; kod: string; ad: string; sozluk: Sozluk }[] = [];
  for (const s of sektorler) {
    const sozluk = await sektorSozlugu(s.id, dil);
    if (sozluk) cikti.push({ ...s, sozluk });
  }
  return cikti;
});
