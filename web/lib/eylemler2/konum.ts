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
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      tesisId: z.string(),
      enlem: z.number().nullable(),
      boylam: z.number().nullable(),
    }).parse(girdi);

    /* İkisi birlikte gelir ya da ikisi birlikte silinir: tek başına enlem
       haritada yeri olmayan yarım bir kayıttır. */
    if ((v.enlem === null) !== (v.boylam === null)) {
      return { ok: false, hata: 'Enlem ve boylam birlikte girilir ya da birlikte silinir' };
    }
    if (v.enlem !== null && v.boylam !== null && !koordinatGecerli(v.enlem, v.boylam)) {
      return { ok: false, hata: 'Koordinat aralık dışında: enlem -90..90, boylam -180..180' };
    }

    const eski = await db.tesis.findUniqueOrThrow({
      where: { id: v.tesisId },
      select: { id: true, kod: true, enlem: true, boylam: true },
    });
    if (!izinVar(k, 'tanimlar', 'yazma', { tesisId: eski.id, surecId: null })) {
      return { ok: false, hata: 'Bu santralin sicilinde yazma yetkiniz yok' };
    }

    const yaz = (e: number | null, b: number | null) =>
      (e === null || b === null ? 'girilmedi' : `${e.toFixed(4)},${b.toFixed(4)}`);

    await db.$transaction(async (tx) => {
      await tx.tesis.update({
        where: { id: v.tesisId }, data: { enlem: v.enlem, boylam: v.boylam },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'Tesis', varlikId: v.tesisId,
        eylem: 'guncelleme', alan: 'koordinat',
        once: yaz(eski.enlem, eski.boylam), sonra: yaz(v.enlem, v.boylam),
      }, tx);
    });

    revalidatePath('/harita'); revalidatePath('/portfoy');
    revalidatePath(`/tesisler/${v.tesisId}`);
    return tamam();
  } catch (e) { return hata(e); }
}
