/* Testler için KAPSAM ÖĞESİ köprüsü (B1).

   Uyum zinciri (madde durumu · süreç kapsamı · istisna · karar · yetki …)
   tesise değil kapsam öğesine bağlıdır; test tesisi bilir, öğeyi buradan
   çözer. Kimlik kuralı göç ve tohumla AYNIDIR (`ko-<tesisId>`): bellek
   içi yetki nesnesi veritabanına hiç bakmadan doğru öğe kimliğini taşır,
   testin kendi açtığı tesis de aynı kuralla öğe alır. Kural değişirse üç
   yer birden değişir (göç · tohum · burası) — `tests/kapsam-ogesi-gocu`
   bunu sınar. */
import { db } from '@/lib/db';

/** Tesisin öğe kimliği — göç/tohum kuralı; tesissiz yetki için null. */
export const ogeKimligi = (tesisId: string | null | undefined): string | null =>
  (tesisId ? `ko-${tesisId}` : null);

/** Bellek içi yetki satırı: öğe kimliği köprüden türer. */
export function yetkiSatiri(rol: string, tesisId: string | null = null, ek: Partial<{
  surecId: string | null; tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
}> = {}) {
  return {
    rol, surecId: null, kapsamOgesiId: ogeKimligi(tesisId), tesisId,
    tuzelKisiId: null, regulasyonId: null, modul: null, ...ek,
  };
}

/** Tesisin öğesi veritabanından; yoksa ürünle AYNI kuralla açılır
    (`lib/eylemler.ts → tesisEkle` de tesisle birlikte öğe açar). Testin
    `db.tesis.create` ile açtığı tesis o eylemden geçmediği için öğesi
    burada tamamlanır; tesis yoksa fırlatır. */
export async function ogeIdAl(tesisId: string): Promise<string> {
  const oge = await db.kapsamOgesi.findUnique({ where: { tesisId }, select: { id: true } });
  if (oge) return oge.id;
  const tesis = await db.tesis.findUnique({ where: { id: tesisId }, select: { id: true, kod: true, ad: true } });
  if (!tesis) throw new Error(`Tesis yok: ${tesisId}`);
  return (await ogeAc(tesis)).id;
}

/** Testin açtığı tesise öğe açar (tür `tesis`, kimlik `ko-<tesisId>`). */
export async function ogeAc(tesis: { id: string; kod: string; ad: string }): Promise<{ id: string }> {
  const tur = await db.kapsamOgesiTuru.findUniqueOrThrow({ where: { kod: 'tesis' }, select: { id: true } });
  return db.kapsamOgesi.upsert({
    where: { tesisId: tesis.id },
    update: {},
    create: { id: `ko-${tesis.id}`, kod: tesis.kod, ad: tesis.ad, tesisId: tesis.id, turId: tur.id },
    select: { id: true },
  });
}
