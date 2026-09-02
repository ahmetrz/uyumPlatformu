import { db } from '../db';
import type { Prisma } from '../prisma-client/client';
import { z } from 'zod';

/* eylemler2 modülleri için ortak yardımcılar — lib/eylemler.ts ile aynı kalıp. */

export type Sonuc = { ok: true } | { ok: false; hata: string };
export const tamam = (): Sonuc => ({ ok: true });

/* Hangi alan(lar) kopya — İKİ BİÇİM okunur.

   Prisma 7 sürücü adaptörüyle (better-sqlite3) çalışırken P2002 hatası
   alan adını `meta.target` altına KOYMAZ; onu sürücünün kendi hatasına
   sarar:
     meta.driverAdapterError.cause.constraint.fields = ['kod']
   Yalnız `meta.target` okunduğu sürece aşağıdaki alan-özel cümleler HİÇ
   kurulmuyordu ve her kopya kayıt genel cümleye düşüyordu (ölçüldü:
   tests/dokuman-eylem "aynı kod iki kez açılamaz"). Klasik biçim de
   okunmaya devam eder: PostgreSQL'e geçişte ya da adaptörsüz kurulumda
   `meta.target` geri gelir. */
function ihlalAlanlari(m: unknown): string[] {
  const meta = (m as { meta?: Record<string, unknown> } | null)?.meta;
  if (!meta) return [];

  const hedef = meta.target;
  if (Array.isArray(hedef)) return hedef.filter((x): x is string => typeof x === 'string');
  if (typeof hedef === 'string') return [hedef];

  const surucu = (meta.driverAdapterError as { cause?: { constraint?: unknown } } | undefined)?.cause;
  const kisit = surucu?.constraint as { fields?: unknown } | undefined;
  return Array.isArray(kisit?.fields)
    ? kisit.fields.filter((x): x is string => typeof x === 'string')
    : [];
}

/* ── Veritabanı kısıtı → okunabilir cümle ─────────────────────────────
   Tekillik kısıtı ihlali kullanıcıya Prisma'nın ham metniyle çıkıyordu:
   "Unique constraint failed on the fields: (`kod`)". Bu, kullanıcının
   okuyamayacağı bir cümle olduğu gibi ne yapması gerektiğini de
   söylemiyor.

   Kısıt bir KUSUR DEĞİL, çalışan bir korumadır ve en çok şu senaryoda
   görünür: kod önerileri (RSK-/DEN-/PRJ-) sayfa render'ında hesaplanıp
   forma varsayılan olarak veriliyor; iki kullanıcı formu aynı anda açarsa
   ikisi de aynı kodu görür ve ikincisi kaydederken kısıta çarpar.
   Veritabanı kopyayı ENGELLİYOR — eksik olan tek şey, insanın ne olduğunu
   anlamasıydı.

   Çeviri burada tek yerde yapılır; her `eylemler2` eylemi kendiliğinden
   yararlanır. */
function kisitCumlesi(m: unknown): string | null {
  const kod = (m as { code?: unknown } | null)?.code;
  if (kod !== 'P2002') return null;
  const alanlar = ihlalAlanlari(m);
  if (alanlar.includes('kod')) {
    return 'Bu kod başka bir kayıtta kullanılıyor. Kod önerisi siz formu '
      + 'açtıktan sonra başkası tarafından alınmış olabilir — formu yenileyip '
      + 'yeni öneriyi kullanın.';
  }
  return alanlar.length > 0
    ? `Bu değer benzersiz olmalı ve zaten kullanılıyor: ${alanlar.join(', ')}.`
    : 'Bu kayıt benzersizlik kuralını çiğniyor; aynı kayıt zaten var.';
}

export const hata = (m: unknown): Sonuc => ({
  ok: false,
  hata: m instanceof z.ZodError
    ? m.issues.map((i) => i.message).join(' · ')
    : kisitCumlesi(m)
      ?? (m instanceof Error ? m.message : 'Beklenmeyen hata'),
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
