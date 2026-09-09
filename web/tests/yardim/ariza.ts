import type { PrismaClient } from '@/lib/prisma-client/client';
import { SAGLAYICI } from '@/lib/veritabani';

/* ═══════════════════════════════════════════════════════════════════════
   ARIZA ENJEKSİYONU — İKİ SAĞLAYICIDA DA (R5)

   Bazı testler "yazma ORTADA patlarsa hiçbir satır kalmaz" iddiasını
   ölçer. Arıza ÜRETİM KODUNA DOKUNMADAN kurulur: test veritabanına
   geçici bir tetikleyici konur ve belirli bir satır yazılmak istendiğinde
   hata verir. Sahte değil, gerçek bir yazma arızasıdır.

   Tetikleyici sözdizimi SAĞLAYICIYA ÖZGÜDÜR ve üç test dosyası bunu üç
   kez SQLite'a gömülü yazıyordu (`RAISE(ABORT, …)`). PostgreSQL'de o
   sözdizimi `syntax error at or near "NEW"` verir; ölçüldü (R5): dört
   vaka, "yarım sürüm oluşmaz" iddiasını sınamak yerine ARACIN kendi
   sözdizimi hatasında düşüyordu — yani PostgreSQL'de o dört iddia HİÇ
   ÖLÇÜLMÜYORDU. Kırmızı, iddianın yanlış olduğunu değil, ölçülmediğini
   söylüyordu; ikisi aynı şey değildir.

   Koşul dizesi İKİ SAĞLAYICIDA DA geçerli olmalıdır: kolon adları çift
   tırnakla yazılır (`NEW."baslik" = 'X'`). Tırnaksız yazılan bir ad
   PostgreSQL'de küçük harfe katlanır ve kolon bulunamaz.
   ═══════════════════════════════════════════════════════════════════════ */

/** Arızanın verdiği hata metni — iki sağlayıcıda da aynı. */
export const ARIZA_METNI = 'disk doldu';

/** `kosul` sağlanan INSERT'i reddeden geçici tetikleyici kurar. */
export async function arizaKur(db: PrismaClient, ad: string, tablo: string, kosul: string): Promise<void> {
  if (SAGLAYICI === 'postgresql') {
    await db.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION ${ad}_fn() RETURNS trigger LANGUAGE plpgsql AS $ariza$ `
      + `BEGIN RAISE EXCEPTION '${ARIZA_METNI}'; END; $ariza$;`);
    await db.$executeRawUnsafe(
      `CREATE TRIGGER ${ad} BEFORE INSERT ON "${tablo}" FOR EACH ROW WHEN (${kosul}) `
      + `EXECUTE FUNCTION ${ad}_fn();`);
    return;
  }
  await db.$executeRawUnsafe(
    `CREATE TRIGGER ${ad} BEFORE INSERT ON "${tablo}" WHEN ${kosul} `
    + `BEGIN SELECT RAISE(ABORT, '${ARIZA_METNI}'); END;`);
}

/** Arıza tetikleyicisini kaldırır. PostgreSQL'de tetikleyici TABLOYA bağlıdır. */
export async function arizaKaldir(db: PrismaClient, ad: string, tablo: string): Promise<void> {
  if (SAGLAYICI === 'postgresql') {
    await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${ad} ON "${tablo}";`);
    await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${ad}_fn();`);
    return;
  }
  await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${ad};`);
}
