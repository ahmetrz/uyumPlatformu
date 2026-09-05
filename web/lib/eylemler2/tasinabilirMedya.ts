'use server';

/* ═══ OT-57 · Taşınabilir medya ════════════════════════════════════════

   Ürün medyayı ENGELLEMEZ; kayıt tutar. Engelleme uç nokta koruma
   ürününün işidir ve bu dosya onun yaptığını yapıyormuş gibi yapmaz. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import {
  MEDYA_DURUMLARI, MEDYA_TIPLERI, kullanimKapisi,
} from '../varlik/tasinabilirMedya';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

export async function medyaKaydet(girdi: {
  id?: string | null;
  kod: string;
  ad: string;
  tip: string;
  seriNo?: string | null;
  tesisId?: string | null;
  sahibiId?: string | null;
  sifreli?: boolean | null;
  not?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: z.string().trim().max(64).nullable().optional(),
      kod: bosluksuz('Medya kodu').max(64),
      ad: bosluksuz('Medya adı').max(200),
      tip: z.enum(MEDYA_TIPLERI),
      seriNo: z.string().trim().max(120).nullable().optional(),
      tesisId: z.string().trim().max(64).nullable().optional(),
      sahibiId: z.string().trim().max(64).nullable().optional(),
      /* Üç değerli: true / false / null. `null` "ölçülmedi" demektir ve
         `false` ile aynı şey DEĞİLDİR. */
      sifreli: z.boolean().nullable().optional(),
      not: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    kapsamZorunlu(k, 'envanter', 'yazma',
      v.tesisId ? { tesisId: v.tesisId } : {},
      'Bu santralde medya kaydetme yetkiniz yok');

    const veri = {
      kod: v.kod, ad: v.ad, tip: v.tip,
      seriNo: v.seriNo ?? null,
      tesisId: v.tesisId || null,
      sahibiId: v.sahibiId || null,
      sifreli: v.sifreli ?? null,
      not: v.not ?? null,
    };
    const onceki = v.id
      ? await db.tasinabilirMedya.findUnique({ where: { id: v.id } })
      : null;
    const kayit = onceki
      ? await db.tasinabilirMedya.update({ where: { id: onceki.id }, data: veri })
      : await db.tasinabilirMedya.create({ data: veri });

    await iz({
      aktorId: k.id, varlikTipi: 'TasinabilirMedya', varlikId: kayit.id,
      eylem: onceki ? 'guncelleme' : 'olusturma',
      sonra: `${v.ad} (${v.tip})`
        + (v.sifreli === null ? ' · şifreleme ÖLÇÜLMEDİ'
          : v.sifreli ? ' · şifreli' : ' · ŞİFRESİZ'),
    });

    revalidatePath('/tasinabilir-medya');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Medyanın durumunu değiştirir (karantina, kayıp, imha).
 *
 * Kayıp ve imha GERİ ALINAMAZ bir bildirimdir; gerekçe zorunludur.
 */
export async function medyaDurumu(girdi: {
  id: string; durum: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: bosluksuz('Medya id'),
      durum: z.enum(MEDYA_DURUMLARI),
      gerekce: bosluksuz('Gerekçe').max(1000),
    }).parse(girdi);

    const m = await db.tasinabilirMedya.findUnique({ where: { id: v.id } });
    if (!m) throw new Error('Medya bulunamadı');
    kapsamZorunlu(k, 'envanter', 'yazma',
      m.tesisId ? { tesisId: m.tesisId } : {},
      'Bu medyayı değiştirme yetkiniz yok');
    if (m.durum === 'imha') {
      return { ok: false, hata: 'İmha edilmiş medyanın durumu değiştirilemez.' };
    }

    await db.tasinabilirMedya.update({ where: { id: v.id }, data: { durum: v.durum } });
    await iz({
      aktorId: k.id, varlikTipi: 'TasinabilirMedya', varlikId: v.id,
      eylem: v.durum === 'imha' ? 'silme' : 'guncelleme',
      alan: 'durum', once: m.durum, sonra: v.durum, gerekce: v.gerekce,
    });

    revalidatePath('/tasinabilir-medya');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Zararlı yazılım taraması damgası. Ürün taramaz; sonucu KAYDEDER. */
export async function medyaTaramaKaydet(girdi: {
  id: string; temiz: boolean; not?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: bosluksuz('Medya id'),
      temiz: z.boolean(),
      not: z.string().trim().max(500).nullable().optional(),
    }).parse(girdi);

    const m = await db.tasinabilirMedya.findUnique({ where: { id: v.id } });
    if (!m) throw new Error('Medya bulunamadı');
    kapsamZorunlu(k, 'envanter', 'yazma',
      m.tesisId ? { tesisId: m.tesisId } : {},
      'Bu medyaya tarama kaydetme yetkiniz yok');

    /* Kirli çıkan medya kendiliğinden KARANTİNAYA alınır: temiz
       olmadığı bilinen bir belleğin kullanımda kalması, kaydın
       kendisini anlamsız kılardı. */
    await db.tasinabilirMedya.update({
      where: { id: v.id },
      data: {
        sonTarama: new Date(),
        ...(v.temiz ? {} : { durum: 'karantina' }),
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'TasinabilirMedya', varlikId: v.id,
      eylem: 'guncelleme', alan: 'sonTarama',
      once: m.sonTarama?.toISOString() ?? 'hiç taranmadı',
      sonra: v.temiz ? 'temiz' : 'ZARARLI BULUNDU — karantinaya alındı',
      gerekce: v.not ?? null,
    });

    revalidatePath('/tasinabilir-medya');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Medyanın bir varlıkta kullanıldığını kaydeder.
 *
 * Onaysız kullanım REDDEDİLMEZ, uyarıyla kaydedilir: kaydı
 * zorlaştırmak kayıtsızlık üretir ve kayıtsız kullanım hiç görünmez.
 */
export async function medyaKullanimKaydet(girdi: {
  medyaId: string;
  varlikId: string;
  baslangic: string;
  bitis?: string | null;
  amac: string;
  onaylandi?: boolean;
  kaynakSistem?: string | null;
}): Promise<Sonuc & { uyari?: string | null }> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      medyaId: bosluksuz('Medya id'),
      varlikId: bosluksuz('Varlık id'),
      baslangic: bosluksuz('Başlangıç'),
      bitis: z.string().trim().nullable().optional(),
      amac: bosluksuz('Kullanım amacı').max(500),
      onaylandi: z.boolean().optional(),
      kaynakSistem: z.string().trim().max(120).nullable().optional(),
    }).parse(girdi);

    const [medya, varlik] = await Promise.all([
      db.tasinabilirMedya.findUnique({ where: { id: v.medyaId } }),
      db.varlik.findUnique({
        where: { id: v.varlikId },
        select: { id: true, ad: true, tesisId: true, kritiklik: true },
      }),
    ]);
    if (!medya) throw new Error('Medya bulunamadı');
    if (!varlik) throw new Error('Varlık bulunamadı');
    kapsamZorunlu(k, 'envanter', 'yazma',
      varlik.tesisId ? { tesisId: varlik.tesisId } : {},
      'Bu varlıkta medya kullanımı kaydetme yetkiniz yok');

    const bas = new Date(v.baslangic);
    const bit = v.bitis ? new Date(v.bitis) : null;
    if (Number.isNaN(bas.getTime())) return { ok: false, hata: 'Başlangıç zamanı okunamadı.' };
    if (bit && Number.isNaN(bit.getTime())) return { ok: false, hata: 'Bitiş zamanı okunamadı.' };

    const onaylandi = v.onaylandi ?? false;
    const kapi = kullanimKapisi({
      medyaDurumu: medya.durum,
      onaylandi,
      varlikKritikligi: varlik.kritiklik,
      baslangic: bas.getTime(),
      bitis: bit?.getTime() ?? null,
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    const kayit = await db.medyaKullanimi.create({
      data: {
        medyaId: v.medyaId, varlikId: v.varlikId,
        baslangic: bas, bitis: bit, amac: v.amac,
        onaylayanId: onaylandi ? k.id : null,
        onayZamani: onaylandi ? new Date() : null,
        kaynakSistem: v.kaynakSistem ?? null,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'MedyaKullanimi', varlikId: kayit.id,
      eylem: 'olusturma',
      sonra: `${medya.ad} → ${varlik.ad}`,
      gerekce: `${v.amac}${onaylandi ? '' : ' · ONAYSIZ'}`,
    });

    revalidatePath('/tasinabilir-medya');
    return { ok: true, uyari: kapi.uyari };
  } catch (e) { return hata(e); }
}
