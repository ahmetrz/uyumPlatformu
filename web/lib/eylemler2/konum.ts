'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { yetkiZorunlu, izinVar, KAPSAM_SONRA } from '../erisim';
import { hata, iz, tamam, type Sonuc } from './ortak';
import { koordinatGecerli } from '@/app/(tam)/harita/mantik';

/* A4 · Santral koordinatı.

   YETKİ: `tanimlar/yazma` — koordinat santral SİCİLİNİN alanıdır (ad, kod,
   kurulu güç ile aynı raf), uyum kaydı değil. Kapsam kaydın kendi
   santralinden okunur: tesise kısıtlı kullanıcı yalnız kendi santralinin
   konumunu düzeltebilir.

   SİLME AÇIKÇA MÜMKÜNDÜR: `null` gönderilirse koordinat kaldırılır ve
   santral haritada yaklaşık işarete döner. "Yanlış girdim" demenin yolu
   olmalı; yanlış bir koordinat, hiç koordinat olmamasından kötüdür. */

export async function tesisKonumKaydet(girdi: {
  tesisId: string; enlem: number | null; boylam: number | null;
  kaynak?: string | null; dogrulandi?: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      tesisId: z.string(),
      enlem: z.number().nullable(),
      boylam: z.number().nullable(),
      /** Nereden geldiği: "saha GPS" · "EPDK lisans sicili" · "OpenStreetMap". */
      kaynak: z.string().trim().max(120).nullable().optional(),
      /** Bir İNSAN baktı mı? Varsayılan hayır. */
      dogrulandi: z.boolean().optional(),
    }).parse(girdi);

    /* İkisi birlikte gelir ya da ikisi birlikte silinir: tek başına enlem
       haritada yeri olmayan yarım bir kayıttır. */
    if ((v.enlem === null) !== (v.boylam === null)) {
      return { ok: false, hata: 'Enlem ve boylam birlikte girilir ya da birlikte silinir' };
    }
    if (v.enlem !== null && v.boylam !== null && !koordinatGecerli(v.enlem, v.boylam)) {
      return { ok: false, hata: 'Koordinat aralık dışında: enlem -90..90, boylam -180..180' };
    }
    /* Koordinatsız doğrulama anlamsızdır: olmayan bir noktaya "baktım"
       denemez. Sessizce yok saymak yerine açıkça reddedilir. */
    if (v.dogrulandi && v.enlem === null) {
      return { ok: false, hata: 'Koordinat girilmeden doğrulanmış işaretlenemez' };
    }

    const eski = await db.tesis.findUniqueOrThrow({
      where: { id: v.tesisId },
      select: {
        id: true, kod: true, enlem: true, boylam: true,
        konumKaynagi: true, konumDogrulandi: true,
      },
    });
    if (!izinVar(k, 'tanimlar', 'yazma', { tesisId: eski.id, surecId: null })) {
      return { ok: false, hata: 'Bu santralin sicilinde yazma yetkiniz yok' };
    }
    /* DOĞRULAMA AYRI BİR YETKİDİR. Koordinat girmek bir kayıt işidir;
       "bu noktaya biri baktı" demek bir ONAYDIR ve başka bir sorumluluk.
       Yazma yetkisi kendi doğrulamasını yapabilseydi dört göz kuralı
       koordinatta hiç kurulmamış olurdu. */
    if (v.dogrulandi && !izinVar(k, 'tanimlar', 'onay', { tesisId: eski.id, surecId: null })) {
      return { ok: false, hata: 'Koordinat doğrulamak tanımlar onay yetkisi ister' };
    }

    /* KOORDİNAT DEĞİŞTİYSE ESKİ ONAY DÜŞER. Düşmeseydi, kimsenin
       bakmadığı yeni bir nokta "doğrulanmış" damgasıyla haritada dururdu
       — doğrulamanın kendisini anlamsız kılan tek hata budur. */
    const noktaDegisti = v.enlem !== eski.enlem || v.boylam !== eski.boylam;
    const dogrulandi = v.dogrulandi === true;
    const onayKalir = !noktaDegisti && eski.konumDogrulandi;
    const yeniDogrulandi = v.enlem === null ? false : (dogrulandi || onayKalir);

    /* Koordinat silinince kaynak ve doğrulama da silinir: nokta yoksa
       kaynağı da doğrulaması da bir şeye işaret etmez. */
    const yeniKaynak = v.enlem === null
      ? null
      : (v.kaynak?.trim() || (noktaDegisti ? null : eski.konumKaynagi));

    const yaz = (
      e: number | null, b: number | null, kaynak: string | null, onay: boolean,
    ) => (e === null || b === null
      ? 'girilmedi'
      : `${e.toFixed(4)},${b.toFixed(4)}`
        + ` · kaynak: ${kaynak ?? 'belirtilmedi'}`
        + ` · ${onay ? 'doğrulandı' : 'doğrulanmadı'}`);

    await db.$transaction(async (tx) => {
      await tx.tesis.update({
        where: { id: v.tesisId },
        data: {
          enlem: v.enlem,
          boylam: v.boylam,
          konumKaynagi: yeniKaynak,
          konumDogrulandi: yeniDogrulandi,
          // Kim ve ne zaman, doğrulamayla BİRLİKTE yazılır; ayrışırlarsa
          // "doğrulandı ama kim bilmiyoruz" diye bir hâl doğar.
          konumDogrulayanId: yeniDogrulandi ? (dogrulandi ? k.id : undefined) : null,
          konumDogrulandiZaman: yeniDogrulandi ? (dogrulandi ? new Date() : undefined) : null,
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'Tesis', varlikId: v.tesisId,
        eylem: yeniDogrulandi && !eski.konumDogrulandi ? 'onay' : 'guncelleme',
        alan: 'koordinat',
        once: yaz(eski.enlem, eski.boylam, eski.konumKaynagi, eski.konumDogrulandi),
        sonra: yaz(v.enlem, v.boylam, yeniKaynak, yeniDogrulandi),
      }, tx);
    });

    revalidatePath('/harita'); revalidatePath('/portfoy');
    revalidatePath(`/tesisler/${v.tesisId}`);
    return tamam();
  } catch (e) { return hata(e); }
}
