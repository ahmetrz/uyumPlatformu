import { db } from '../db';
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

export async function iz(veri: {
  aktorId?: string | null; varlikTipi: string; varlikId: string; eylem: string;
  alan?: string; once?: string | null; sonra?: string | null;
  gerekce?: string | null; dosyaAdi?: string;
}) {
  await db.aktiviteKaydi.create({ data: {
    aktorId: veri.aktorId ?? null,
    varlikTipi: veri.varlikTipi, varlikId: veri.varlikId, eylem: veri.eylem,
    alan: veri.alan ?? null, oncekiDeger: veri.once ?? null,
    yeniDeger: veri.sonra ?? null, gerekce: veri.gerekce ?? null,
    dosyaAdi: veri.dosyaAdi ?? null,
  } });
}

export const tarihAlani = z.string().transform((s) => (s ? new Date(s) : null)).nullable().optional();
export const bosluksuz = (ad: string) => z.string().trim().min(1, `${ad} boş olamaz`);
