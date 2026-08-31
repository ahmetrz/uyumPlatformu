import { db } from '../db';
import type { Prisma } from '../prisma-client/client';
import { z } from 'zod';

/* eylemler2 modülleri için ortak yardımcılar — lib/eylemler.ts ile aynı kalıp. */

export type Sonuc = { ok: true } | { ok: false; hata: string };
export const tamam = (): Sonuc => ({ ok: true });
export const hata = (m: unknown): Sonuc => ({
  ok: false,
  hata: m instanceof z.ZodError
    ? m.issues.map((i) => i.message).join(' · ')
    : m instanceof Error ? m.message : 'Beklenmeyen hata',
});

/* İz yazıcı bir transaction istemcisi de kabul eder.

   NİÇİN: `lib/db.ts` TEK better-sqlite3 bağlantısı kullanır. Bir çağrı
   transaction içindeyken BAŞKA bir çağrının transaction DIŞINDA yaptığı
   yazma aynı bağlantıya düşer ve o transaction geri alınırsa SESSİZCE
   YUTULUR (ölçüldü: tests/yaris-kosullari). Yani "durumu transaction'da
   değiştir, izi dışarıda yaz" kalıbı, eşzamanlı bir başarısız çağrı varken
   İZİ KAYBETTİRİR. Durum değişimi ile izi aynı transaction'a koymak hem bu
   kaybı hem de tersini (iz var ama geçiş geri alınmış) engeller. */
type IzIstemcisi = Prisma.TransactionClient | typeof db;

export async function iz(veri: {
  aktorId?: string | null; varlikTipi: string; varlikId: string; eylem: string;
  alan?: string; once?: string | null; sonra?: string | null;
  gerekce?: string | null; dosyaAdi?: string;
}, istemci: IzIstemcisi = db) {
  await istemci.aktiviteKaydi.create({ data: {
    aktorId: veri.aktorId ?? null,
    varlikTipi: veri.varlikTipi, varlikId: veri.varlikId, eylem: veri.eylem,
    alan: veri.alan ?? null, oncekiDeger: veri.once ?? null,
    yeniDeger: veri.sonra ?? null, gerekce: veri.gerekce ?? null,
    dosyaAdi: veri.dosyaAdi ?? null,
  } });
}

export const tarihAlani = z.string().transform((s) => (s ? new Date(s) : null)).nullable().optional();
export const bosluksuz = (ad: string) => z.string().trim().min(1, `${ad} boş olamaz`);
