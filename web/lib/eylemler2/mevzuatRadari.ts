'use server';

/* ═══ R1 · MEVZUAT RADARI · İNSAN KARARLARI ════════════════════════════

   Motor aday AÇAR; buradaki eylemler motorun yapamadıklarıdır:

     incelendi işaretle   → GEREKÇE zorunlu (ne bulundu)
     ilgisiz işaretle     → GEREKÇE zorunlu ("ilgisiz" DE bir karardır)
     taramayı aç / kapat  → kaynağa istek göndermek KURULUMUN kararıdır

   ── KAPSAM: MEVZUAT KURUMSALDIR ───────────────────────────────────────
   Bir tebliğ değişikliği tek bir tesisin değil KURUMUN meselesidir; kapı
   KAPSAMSIZ sorulur ve `kapsamUyar` gereği tesise kısıtlı rol geçmez —
   takvim yükümlülüğüyle birebir aynı kural.

   ── EŞZAMANLILIK ──────────────────────────────────────────────────────
   Yazma `updateMany` ile BEKLENEN duruma koşullanır: iki inceleyici aynı
   adaya farklı karar verirse kaybeden sessizce ezilmez, "yeniden bakın"
   der.

   ── NE YAPILMAZ ───────────────────────────────────────────────────────
   Hiçbir eylem `Regulasyon`, `FrameworkSurumu` ya da madde yazmaz. Aday
   "sürüm taslağı açıldı" durumuna geçtiğinde bile aktif sürüm DEĞİŞMEZ:
   taslak açmak ayrı, aktifleştirmek ayrı bir insan kararıdır ve ikincisi
   mevcut sürüm akışında yaşar. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { ADAY_DURUM_SOZU } from '../mevzuat/radar';
import { type Sonuc, tamam, hata, iz } from './ortak';

const YOL = '/mevzuat-radari';

const ARADA_DEGISTI = 'Bu aday siz bakarken değişti — ekranı yenileyip yeniden'
  + ' bakın. Aynı değişiklik üzerinde başka biri karar vermiş olabilir.';

const GEREKCE_ASGARI = 10;

const KararGirdisi = z.object({
  adayId: z.string().min(1),
  gerekce: z.string().min(GEREKCE_ASGARI,
    `gerekçe en az ${GEREKCE_ASGARI} karakter — kararın sebebi yazılır`),
});

/** `incelendi` ve `ilgisiz` aynı kalıbı paylaşır; ayrım yalnız hedef durumdur. */
async function kararVer(
  girdi: { adayId: string; gerekce: string }, hedef: 'incelendi' | 'ilgisiz',
): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = KararGirdisi.parse(girdi);
    /* Boşluk doldurarak asgariyi geçmek sayılmaz. */
    if (v.gerekce.trim().length < GEREKCE_ASGARI) {
      throw new Error(`Gerekçe en az ${GEREKCE_ASGARI} karakter olmalı.`);
    }

    const aday = await db.mevzuatDegisiklikAdayi.findUnique({
      where: { id: v.adayId },
      select: { id: true, durum: true, baslik: true },
    });
    if (!aday) throw new Error('Aday bulunamadı.');
    if (aday.durum !== 'yeni') {
      throw new Error(`Bu aday zaten "${ADAY_DURUM_SOZU[aday.durum as keyof typeof ADAY_DURUM_SOZU]}" durumunda.`);
    }

    return await db.$transaction(async (tx) => {
      /* KOŞULLU YAZMA: okunan durum hâlâ geçerli mi. */
      const { count } = await tx.mevzuatDegisiklikAdayi.updateMany({
        where: { id: aday.id, durum: 'yeni' },
        data: {
          durum: hedef, gerekce: v.gerekce, kararVerenId: k.id,
          kararZamani: new Date(),
        },
      });
      if (count === 0) throw new Error(ARADA_DEGISTI);
      await iz({
        aktorId: k.id, varlikTipi: 'MevzuatDegisiklikAdayi', varlikId: aday.id,
        eylem: 'guncelleme', alan: 'durum', once: 'yeni', sonra: hedef,
        gerekce: v.gerekce,
      }, tx);
      revalidatePath(YOL);
      return tamam();
    });
  } catch (e) {
    return hata(e);
  }
}

export async function adayIncelendi(girdi: { adayId: string; gerekce: string }): Promise<Sonuc> {
  return kararVer(girdi, 'incelendi');
}

export async function adayIlgisiz(girdi: { adayId: string; gerekce: string }): Promise<Sonuc> {
  /* "İlgisiz" de bir karardır: gerekçesiz kapatılan bir aday, üç ay
     sonra neden kapatıldığı bilinmeyen bir boşluktur. */
  return kararVer(girdi, 'ilgisiz');
}

const TaramaGirdisi = z.object({
  kaynakId: z.string().min(1),
  etkin: z.boolean(),
  gerekce: z.string().min(GEREKCE_ASGARI),
});

/**
 * Taramayı aç ya da kapat.
 *
 * KAYNAĞA İSTEK GÖNDERMEK KURULUMUN KARARIDIR. Paket kanalı önerir ve
 * kaynak KAPALI doğar; bu eylem o kararın kaydıdır. Motor bu alana
 * dokunmaz — engelli hâle düşen bir kaynağı bile kendi kapatamaz.
 */
export async function taramayiAyarla(
  girdi: { kaynakId: string; etkin: boolean; gerekce: string },
): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'onay');
    const v = TaramaGirdisi.parse(girdi);
    /* Boşluk doldurarak asgariyi geçmek sayılmaz. */
    if (v.gerekce.trim().length < GEREKCE_ASGARI) {
      throw new Error(`Gerekçe en az ${GEREKCE_ASGARI} karakter olmalı.`);
    }

    const kaynak = await db.mevzuatKaynagi.findUnique({
      where: { id: v.kaynakId }, select: { id: true, etkin: true, durum: true, ad: true },
    });
    if (!kaynak) throw new Error('Kaynak bulunamadı.');
    if (kaynak.etkin === v.etkin) {
      throw new Error(v.etkin ? 'Tarama zaten açık.' : 'Tarama zaten kapalı.');
    }
    if (v.etkin && kaynak.durum === 'engelli') {
      /* ENGELLİ KAYNAK AÇILAMAZ. Kaynak otomatik erişime kapalı diyorsa
         ürün bu engeli aşmaz; elle izleme yolu açık kalır. */
      throw new Error('Bu kaynak otomatik erişime KAPALI (engelli). Tarama'
        + ' açılamaz; kaynak elle izlenir. Engel kalktıysa önce durumu'
        + ' yeniden ölçün.');
    }

    return await db.$transaction(async (tx) => {
      const { count } = await tx.mevzuatKaynagi.updateMany({
        where: { id: kaynak.id, etkin: kaynak.etkin },
        data: { etkin: v.etkin },
      });
      if (count === 0) throw new Error(ARADA_DEGISTI);
      await iz({
        aktorId: k.id, varlikTipi: 'MevzuatKaynagi', varlikId: kaynak.id,
        eylem: 'guncelleme', alan: 'etkin',
        once: String(kaynak.etkin), sonra: String(v.etkin),
        gerekce: v.gerekce,
      }, tx);
      revalidatePath(YOL);
      return tamam();
    });
  } catch (e) {
    return hata(e);
  }
}
