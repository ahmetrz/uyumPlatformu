'use server';

/* Connector ÇALIŞMA AYARLARI — ortam · senkron kipi · devre kesici eşiği.

   ── Neden ayrı bir modül ──────────────────────────────────────────────
   `lib/eylemler2/entegrasyon.ts` connector'ın KİMLİK ve BAĞLANTI
   yapılandırmasını yazar (ad, tip, kaynak sistem, kimlik tipi, sır
   referansı, poll aralığı) ve o dosya bu çalışmada değiştirilmedi.
   Buradaki üç alan farklı bir soruya cevap verir: kayıt HANGİ ORTAMIN
   sistemine bakıyor, veriyi NASIL çekiyor, kaç ardışık hatadan sonra
   kendini duraklatıyor.

   Ayrı durmasının ikinci ve asıl sebebi: ORTAM DEĞİŞİKLİĞİ BİR GÜVENLİK
   OLAYIDIR. Bir kaydı "test" sanıp üretim OT ağına bağlamak bu üründe
   yapılabilecek en pahalı hatadır; bu yüzden ortam değiştiğinde GEREKÇE
   ZORUNLUDUR ve değişiklik kendi denetim izi satırını bırakır. Aynı
   alanı ad/etiket güncellemesiyle aynı formdan sessizce kaydırmak, o izi
   "connector güncellendi" gürültüsünün içinde kaybederdi.

   Kalıp: yetkiZorunlu → zod → kayıt → (ortam değişimi için gerekçe) →
   db → iz → revalidatePath. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

/** Şemadaki `Connector.ortam` yorumuyla BİREBİR. Buraya uydurma bir ortam
    eklenmez; şema sahibi listeyi genişletmeden yeni değer kabul edilmez. */
export const ORTAMLAR = ['gelistirme', 'test', 'uretim'] as const;
export const SENKRON_KIPLERI = ['tam', 'delta'] as const;

const Sema = z.object({
  /** Kayıt KOD ile bulunur: `connectorKaydet` yeni kaydın kimliğini
      döndürmez, kod ise benzersizdir. Böylece yeni açılan bir connector'ın
      çalışma ayarı ikinci bir sorgu turu olmadan yazılabilir. */
  kod: bosluksuz('Kod').transform((s) => s.toUpperCase()),
  ortam: z.enum(ORTAMLAR, 'Geçersiz ortam — gelistirme, test ya da uretim'),
  senkronKipi: z.enum(SENKRON_KIPLERI, 'Geçersiz senkron kipi — tam ya da delta'),
  /** null = otomatik duraklatma yok. Bu bilinçli bir seçimdir ve
      "bilinmiyor" değildir; ekran ikisini ayrı yazar. */
  ardisikHataSiniri: z.number().int()
    .positive('Ardışık hata sınırı pozitif olmalı').nullable().optional(),
  /* Deneme sayısı ve geri çekilme: ikisi de ÇEKİRDEK TARAFINDAN OKUNUR
     (lib/entegrasyon/cekirdek.ts). Bir zamanlar yazılıp hiç okunmuyorlardı;
     ekran ayarı kabul ediyor, koşu sabit varsayılanı kullanıyordu. Üst
     sınırlar keyfî değil: 10 denemeden fazlası kimlik hatası durumunda
     hesap kilitleme sayacını doldurur, 60 saniyeden uzun taban geri
     çekilme koşuyu bayat eşiğine (15 dk) taşır. */
  maksDeneme: z.number().int()
    .min(1, 'En az 1 deneme').max(10, 'En çok 10 deneme').nullable().optional(),
  geriCekilmeMs: z.number().int()
    .min(100, 'Geri çekilme en az 100 ms').max(60_000, 'Geri çekilme en çok 60.000 ms')
    .nullable().optional(),
  gerekce: z.string().trim().transform((s) => s || null).nullable().optional(),
});

/**
 * Connector'ın çalışma ayarlarını yazar.
 *
 * Ortam değişiyorsa gerekçe zorunludur — hangi kaydın ne zaman, kim
 * tarafından, neye dayanarak üretime çevrildiği altı ay sonra da
 * sorulabilir olmalıdır.
 */
export async function connectorCalismaAyari(girdi: {
  kod: string; ortam: string; senkronKipi: string;
  ardisikHataSiniri?: number | null; maksDeneme?: number | null;
  geriCekilmeMs?: number | null; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const v = Sema.parse(girdi);

    const c = await db.connector.findUnique({ where: { kod: v.kod } });
    if (!c) throw new Error(`Connector bulunamadı: ${v.kod}`);
    if (c.silindi) throw new Error('Silinmiş connector güncellenemez');

    const ortamDegisti = c.ortam !== v.ortam;
    if (ortamDegisti && !v.gerekce) {
      throw new Error(
        `Ortam '${c.ortam}' → '${v.ortam}' değiştiriliyor; gerekçe zorunlu. ` +
        'Bir connector\'ın hangi ortama baktığı güvenlik bilgisidir ve ' +
        'gerekçesiz değiştirilemez.');
    }

    await db.connector.update({
      where: { id: c.id },
      data: {
        ortam: v.ortam,
        senkronKipi: v.senkronKipi,
        ardisikHataSiniri: v.ardisikHataSiniri ?? null,
        maksDeneme: v.maksDeneme ?? null,
        geriCekilmeMs: v.geriCekilmeMs ?? null,
      },
    });

    /* Ortam değişimi KENDİ iz satırını alır: "connector güncellendi" ile
       aynı satıra sıkıştırılırsa denetimde görünmez olur. */
    if (ortamDegisti) {
      await iz({
        aktorId: k.id, varlikTipi: 'Connector', varlikId: c.id,
        eylem: 'ortam_degisikligi', alan: 'ortam',
        once: c.ortam, sonra: v.ortam, gerekce: v.gerekce,
      });
    }
    await iz({
      aktorId: k.id, varlikTipi: 'Connector', varlikId: c.id,
      eylem: 'guncelleme', alan: 'calisma',
      once: calismaOzeti(c),
      sonra: calismaOzeti(v),
      gerekce: v.gerekce,
    });

    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}

/** İz satırındaki tek satırlık çalışma özeti — `null` "varsayılan" yazar. */
function calismaOzeti(c: {
  senkronKipi: string; ardisikHataSiniri?: number | null;
  maksDeneme?: number | null; geriCekilmeMs?: number | null;
}): string {
  return [
    c.senkronKipi,
    `sınır ${c.ardisikHataSiniri ?? 'yok'}`,
    `deneme ${c.maksDeneme ?? 'varsayılan'}`,
    `geri çekilme ${c.geriCekilmeMs === null || c.geriCekilmeMs === undefined
      ? 'varsayılan' : `${c.geriCekilmeMs} ms`}`,
  ].join(' · ');
}
