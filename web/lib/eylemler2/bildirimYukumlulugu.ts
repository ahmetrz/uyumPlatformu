'use server';

/* ═══ UY-63 · Resmî bildirim süresi ════════════════════════════════════

   ── SÜRELER ÜRÜNLE GELMEZ ─────────────────────────────────────────────
   Bu dosya hiçbir varsayılan süre YAZMAZ ve tohum veri de bir süre
   içermez. Kaç saat içinde bildirileceği kurumun tabi olduğu
   mevzuattan gelir; örnek bir süre yazmak, kimsenin değiştirmediği
   yanlış bir sayaç bırakırdı. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import { SIDDET_SIRASI, kuralKapisi } from '../uyum/bildirimSuresi';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

/**
 * Bildirim yükümlülüğü kuralı yazar.
 *
 * Kapı `uyum/onay`: bir bildirim süresini değiştirmek, kurumun yasal
 * yükümlülüğünü yeniden yorumlamaktır ve yazma yetkisiyle yapılmaz.
 */
export async function bildirimKuraliKaydet(girdi: {
  id?: string | null;
  kod: string;
  ad: string;
  regulasyonId?: string | null;
  asgariSiddet: string;
  sureSaat: number;
  dayanak: string;
  merci: string;
  aktif?: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      id: z.string().trim().max(64).nullable().optional(),
      kod: bosluksuz('Kural kodu').max(64),
      ad: bosluksuz('Kural adı').max(200),
      regulasyonId: z.string().trim().max(64).nullable().optional(),
      asgariSiddet: z.enum(SIDDET_SIRASI),
      sureSaat: z.number().int(),
      /* Boşluk kuralı BURADA DEĞİL `kuralKapisi`ndadır: zod'un genel
         "boş olamaz" mesajı, kapının "bu sürenin hangi mevzuattan
         geldiği yazılmadan kural savunulamaz" cümlesinin önüne geçiyordu
         ve kullanıcı sebebi göremiyordu. Bir kural, bir yer. */
      dayanak: z.string().trim().max(500),
      merci: z.string().trim().max(200),
      aktif: z.boolean().optional(),
    }).parse(girdi);

    const kapi = kuralKapisi({
      sureSaat: v.sureSaat, asgariSiddet: v.asgariSiddet,
      dayanak: v.dayanak, merci: v.merci,
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    const veri = {
      kod: v.kod, ad: v.ad,
      regulasyonId: v.regulasyonId || null,
      asgariSiddet: v.asgariSiddet,
      sureSaat: v.sureSaat,
      dayanak: v.dayanak,
      merci: v.merci,
      aktif: v.aktif ?? true,
      guncelleyenId: k.id,
    };
    const onceki = v.id
      ? await db.bildirimYukumlulugu.findUnique({ where: { id: v.id } })
      : null;
    const kayit = onceki
      ? await db.bildirimYukumlulugu.update({ where: { id: onceki.id }, data: veri })
      : await db.bildirimYukumlulugu.create({ data: veri });

    await iz({
      aktorId: k.id, varlikTipi: 'BildirimYukumlulugu', varlikId: kayit.id,
      eylem: onceki ? 'guncelleme' : 'olusturma', alan: 'sureSaat',
      once: onceki ? `${onceki.sureSaat} saat` : null,
      sonra: `${v.ad}: ${v.asgariSiddet} ve üstü → ${v.sureSaat} saat · ${v.merci}`,
      gerekce: v.dayanak,
    });

    revalidatePath('/olaylar');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function bildirimKuraliSil(girdi: {
  id: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      id: bosluksuz('Kural id'),
      gerekce: bosluksuz('Gerekçe').max(500),
    }).parse(girdi);
    const kural = await db.bildirimYukumlulugu.findUnique({ where: { id: v.id } });
    if (!kural) return tamam();
    /* Silme yerine PASİFLEŞTİRME: geçmiş olayların hangi kurala göre
       değerlendirildiği kayıtta kalmalı. */
    await db.bildirimYukumlulugu.update({ where: { id: v.id }, data: { aktif: false } });
    await iz({
      aktorId: k.id, varlikTipi: 'BildirimYukumlulugu', varlikId: v.id,
      eylem: 'guncelleme', alan: 'aktif', once: 'true', sonra: 'false',
      gerekce: v.gerekce,
    });
    revalidatePath('/olaylar');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Bir olayın bildirimini damgalar.
 *
 * Geç bildirim REDDEDİLMEZ — olan olmuştur ve kaydedilmesi gerekir.
 * Ekran onu "geç bildirildi" diye gösterir ve bu kayıt saklanmaz.
 */
export async function olayBildirimiKaydet(girdi: {
  olayId: string;
  bildirildi: boolean;
  bildirimTarihi?: string | null;
  gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      olayId: bosluksuz('Olay id'),
      bildirildi: z.boolean(),
      bildirimTarihi: z.string().trim().nullable().optional(),
      gerekce: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    const olay = await db.olay.findUnique({
      where: { id: v.olayId },
      select: { id: true, kod: true, tesisId: true, bildirimTarihi: true, bildirimGerekli: true },
    });
    if (!olay) throw new Error('Olay bulunamadı');
    kapsamZorunlu(k, 'uyum', 'yazma',
      olay.tesisId ? { tesisId: olay.tesisId } : {},
      'Bu olayda bildirim kaydetme yetkiniz yok');

    if (!v.bildirildi) {
      /* "Bildirim gerekmiyor" bir KARARDIR ve gerekçe ister: yükümlülük
         kuralı uyuyorken sayacı susturmanın tek meşru yolu budur. */
      if (!v.gerekce?.trim()) {
        return {
          ok: false,
          hata: 'Bildirim gerekmediğini söylemek bir karardır ve gerekçe ister.',
        };
      }
      await db.olay.update({
        where: { id: v.olayId },
        data: { bildirimGerekli: false, bildirimTarihi: null },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'Olay', varlikId: v.olayId,
        eylem: 'guncelleme', alan: 'bildirimGerekli',
        once: String(olay.bildirimGerekli), sonra: 'false', gerekce: v.gerekce,
      });
      revalidatePath('/olaylar');
      return tamam();
    }

    const tarih = v.bildirimTarihi ? new Date(v.bildirimTarihi) : new Date();
    if (Number.isNaN(tarih.getTime())) {
      return { ok: false, hata: 'Bildirim tarihi okunamadı.' };
    }
    if (tarih.getTime() > Date.now()) {
      return { ok: false, hata: 'Bildirim tarihi gelecekte olamaz.' };
    }

    await db.olay.update({
      where: { id: v.olayId },
      data: { bildirimGerekli: true, bildirimTarihi: tarih },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Olay', varlikId: v.olayId,
      eylem: 'guncelleme', alan: 'bildirimTarihi',
      once: olay.bildirimTarihi?.toISOString() ?? 'bildirilmedi',
      sonra: tarih.toISOString(), gerekce: v.gerekce ?? null,
    });

    revalidatePath('/olaylar');
    return tamam();
  } catch (e) { return hata(e); }
}
