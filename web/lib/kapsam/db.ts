import 'server-only';
import { db } from '../db';

/* Tesis ↔ kapsam öğesi KÖPRÜSÜ (sunucu). Tesis kimliğiyle gelen çağrılar
   (tesis 360, uygulanabilirlik, kanıt paketi) özneyi buradan çözer.
   Öğesi olmayan tesis "kapsam dışı" DEĞİLDİR — bilinmiyordur (K2);
   çağıran null'u öyle okur. */

export async function tesisinOgesi(tesisId: string) {
  return db.kapsamOgesi.findUnique({ where: { tesisId }, include: { tur: true } });
}

/** Yeni tesise kapsam öğesi açar (B1): kod ve ad tesisinki, tür tipin
    varsayılanı (yoksa `tesis`), kimlik göç ve tohumla aynı kuralda
    (`ko-<tesisId>`). Öğesi olmayan tesis uyum zincirine giremez; tesis
    kaydı açan eylem bunu hemen çağırır. Var olan öğeye dokunmaz. */
export async function tesiseOgeAc(tesis: { id: string; kod: string; ad: string; tipId: string | null }) {
  const tip = tesis.tipId
    ? await db.tesisTipi.findUnique({ where: { id: tesis.tipId }, select: { varsayilanKapsamTuruId: true } })
    : null;
  const turId = tip?.varsayilanKapsamTuruId
    ?? (await db.kapsamOgesiTuru.findUniqueOrThrow({ where: { kod: 'tesis' }, select: { id: true } })).id;
  return db.kapsamOgesi.upsert({
    where: { tesisId: tesis.id },
    update: {},
    create: { id: `ko-${tesis.id}`, kod: tesis.kod, ad: tesis.ad, tesisId: tesis.id, turId },
  });
}

/** Tesis kimlik listesi → öğe kimlik listesi. Öğesi olmayan tesis düşer
    (bilinmiyor); null (tümü) olduğu gibi geçer. */
export async function tesisIdleriIcinOgeIdleri(tesisIdleri: string[] | null): Promise<string[] | null> {
  if (tesisIdleri === null) return null;
  if (tesisIdleri.length === 0) return [];
  const ogeler = await db.kapsamOgesi.findMany({
    where: { tesisId: { in: tesisIdleri } }, select: { id: true } });
  return ogeler.map((o) => o.id);
}

/** Öğe kimliği → tesis köprüsü (null = köprüsüz öğe). Tesis başına
    sayım yapan ekranlar `groupBy(kapsamOgesiId)` sonucunu bununla tesise
    bağlar; köprüsüz öğenin sayımı hiçbir tesise YAZILMAZ (kurum, sistem
    … bir tesis değildir). */
export async function ogeTesisKoprusu(ogeIdleri: readonly string[]): Promise<Map<string, string | null>> {
  const tekil = [...new Set(ogeIdleri)];
  if (tekil.length === 0) return new Map();
  const ogeler = await db.kapsamOgesi.findMany({
    where: { id: { in: tekil } }, select: { id: true, tesisId: true } });
  return new Map(ogeler.map((o) => [o.id, o.tesisId]));
}

/** Omurga sorguları için ortak seçim: öğenin kimliği, adı, kodu, türü ve
    tesis köprüsü — ekran "hangi tesis" derken de, "hangi kurum" derken
    de aynı alanları okur. */
export const KAPSAM_OGESI_SECIMI = {
  select: { id: true, kod: true, ad: true, tesisId: true, tur: { select: { kod: true, ad: true, aktif: true } } },
} as const;
