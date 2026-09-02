import 'server-only';
import { db } from '@/lib/db';
import { izinVar } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';

/* Durum ayağının VERİSİ — bileşenden ayrı durur ki yetki ve sayım kuralları
   JSX olmadan doğrudan test edilebilsin (proje kalıbı: `page.tsx → veri.ts`).

   ═══ İKİ İNCELEME KUSURU BURADA KAPANIR ════════════════════════════════

   1 · YETKİ (P2). Şerit uygulama kabuğunun içindedir, yani HER operasyonel ve
   flagship ekranda çizilir, ve entegrasyon sağlığını yetki sormadan
   okuyordu. Kanonik özet (`lib/entegrasyon/saglikOzeti.ts →
   entegrasyonSagligiOzeti`) aynı veriyi `yonetim/okuma` olmadan VERMEZ;
   bilerek yetkisi alınmış bir kullanıcı /saglik ekranında boş özet
   görürken her sayfanın altında grup geneli connector durumunu okuyordu.
   Aynı kapı buraya kondu ve kapı SORGUDAN ÖNCEDİR: yetkisiz kullanıcı için
   veritabanına hiç gidilmez.

   2 · SİLİNEN KAYIT (P2). İki aggregate de `silindi` alanı dolu kayıtları
   sayıyordu. Kanonik sorgu `where: { silindi: null }` süzer; şerit
   süzmediği için silinmiş bir connector'ın eski durumu sayılmaya, hatta
   onun koşusu "son başarılı koşu" olarak sonsuza kadar görünmeye devam
   ediyordu. */

/** Kanonik özetle BİREBİR aynı yüklem: silinen kayıt hiçbir sayıya girmez. */
export const ETKIN_KAYIT = { silindi: null } as const;

/** Şeridin okuduğu izin — `entegrasyonSagligiOzeti` ile aynı. */
export const AYAK_MODULU = 'yonetim' as const;
export const AYAK_ISLEMI = 'okuma' as const;

export type AyakVerisi = {
  toplam: number;
  /** durum → adet; yalnız kaydı olan durumlar. */
  sayimlar: Record<string, number>;
  /** Son başarılı koşu; hiç yoksa `null` — tarih UYDURULMAZ. */
  sonKosu: Date | null;
};

/**
 * Yetkisiz kullanıcı, oturumsuz istek ve veritabanına ulaşılamayan
 * (demo/statik) derleme için `null` döner — şerit o zaman hiç çizilmez.
 * Sıfır connector `null` DEĞİLDİR: "hiç bağlayıcı tanımlı değil" bir
 * cevaptır ve şerit bunu yazar.
 */
export async function durumAyagiVerisi(
  k: AktifKullanici | null,
): Promise<AyakVerisi | null> {
  if (!k || !izinVar(k, AYAK_MODULU, AYAK_ISLEMI)) return null;

  try {
    const [gruplar, sonKosu] = await Promise.all([
      db.connector.groupBy({ by: ['durum'], where: ETKIN_KAYIT, _count: { _all: true } }),
      db.connector
        .aggregate({ where: ETKIN_KAYIT, _max: { sonBasariliKosu: true } })
        .then((a) => a._max.sonBasariliKosu),
    ]);
    const sayimlar: Record<string, number> = {};
    let toplam = 0;
    for (const g of gruplar) {
      sayimlar[g.durum] = g._count._all;
      toplam += g._count._all;
    }
    return { toplam, sayimlar, sonKosu: sonKosu ?? null };
  } catch {
    /* Demo/statik derlemede veritabanı yoksa şerit çizilmez —
       uydurma sayı göstermekten iyidir. */
    return null;
  }
}
