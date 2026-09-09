import { db } from '../db';
import type { Prisma } from '../prisma-client/client';
/* Alan adları ÇALIŞMA ZAMANINDA gerekir (üretilen `<Model>ScalarFieldEnum`
   sabitleri): `import type` yalnız tipleri getirir, değeri getirmez. */
import { Prisma as PrismaCalisma } from '../prisma-client/client';
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
  const kisit = surucu?.constraint as { fields?: unknown; index?: unknown } | undefined;
  if (Array.isArray(kisit?.fields)) return kisit.fields.filter((x): x is string => typeof x === 'string');
  /* PostgreSQL sürücüsü alan LİSTESİ değil KISIT ADI verir (`{ index: 'Dokuman_kod_key' }`);
     `@prisma/adapter-pg` 23505'te `error.constraint` doluysa her zaman bu dalı seçer. Ad
     okunmazsa alan-özel cümleler PostgreSQL'de HİÇ kurulmaz ve her kopya kayıt genel cümleye
     düşer — ölçüldü (R5): "aynı kod iki kez açılamaz" vakası PostgreSQL'de kırmızıydı.

     AD ÇÖZÜMLENİR AMA UYDURULMAZ. İlk sürüm adı `_` ile bölüp ilk parçadan sonrasını alan
     sayıyordu ve OLMAYAN alan adları üretiyordu (bağımsız inceleme, P1): kırpılmış
     `Yetki_..._regulas_key` → "regulas"; elle yazılan `ErisimAtamasi_tekil_coalesce_key` →
     "tekil, coalesce"; bunlar doğrudan kullanıcı cümlesine giriyordu. Bugün her parça
     MODELİN GERÇEK alanlarına karşı doğrulanır (`Prisma.dmmf`); bir parça tanınmıyorsa liste
     BOŞ döner ve genel cümleye düşülür. Eksik cümle, yanlış cümleden iyidir. */
  if (typeof kisit?.index === 'string') return kisitAdindanAlanlar(kisit.index);
  return [];
}

/** Model adı → alan adları (küçük harf anahtarlı). Üreteç her model için
    `<Model>ScalarFieldEnum` sabitini yazar; kaynak ŞEMANIN KENDİSİDİR, elle
    tutulan bir liste değil — şema değişince bu harita da değişir. */
let modelAlanlari: Map<string, Set<string>> | null = null;
function modelHaritasi(): Map<string, Set<string>> {
  if (modelAlanlari) return modelAlanlari;
  modelAlanlari = new Map();
  const SONEK = 'ScalarFieldEnum';
  for (const [ad, deger] of Object.entries(PrismaCalisma as unknown as Record<string, unknown>)) {
    if (!ad.endsWith(SONEK) || typeof deger !== 'object' || deger === null) continue;
    modelAlanlari.set(ad.slice(0, -SONEK.length).toLowerCase(), new Set(Object.keys(deger)));
  }
  return modelAlanlari;
}

/** `<Model>_<alan>…_key` → alan adları. Tanınmayan tek parça bile listeyi BOŞALTIR. */
export function kisitAdindanAlanlar(ad: string): string[] {
  const sonek = ['_pkey', '_fkey', '_key', '_idx'].find((x) => ad.endsWith(x));
  if (!sonek) return [];                       // elle yazılan indeks: adı alan listesi değildir
  const parcalar = ad.slice(0, -sonek.length).split('_');
  if (parcalar.length < 2) return [];
  const alanlar = modelHaritasi().get(parcalar[0].toLowerCase());
  if (!alanlar) return [];                     // model tanınmadı — uydurma yok
  const kalan = parcalar.slice(1);
  return kalan.every((p) => alanlar.has(p)) ? kalan : [];
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
