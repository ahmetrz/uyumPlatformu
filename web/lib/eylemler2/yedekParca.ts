'use server';

/* ═══ OT-56 · Kritik yedek parça ═══════════════════════════════════════

   Stok bir SAYIMDIR, bir tahmin değil. Bu yüzden stok adedi zorunludur
   ve kayıt açarken "bilinmiyor" seçeneği yoktur: sayılmamış bir parça
   için kayıt açmanın anlamı da yoktur. Buna karşılık TEDARİK SÜRESİ
   boş bırakılabilir ve boş bırakılması gereken şey odur — ölçülmemiş
   süreye sıfır yazmak "hemen gelir" demektir. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import { parcaKapisi } from '../varlik/yedekParca';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

export async function yedekParcaKaydet(girdi: {
  id?: string | null;
  kod: string;
  ad: string;
  ureticiParcaNo?: string | null;
  turId?: string | null;
  tesisId?: string | null;
  konum?: string | null;
  stokAdedi: number;
  kritikEsik: number;
  tedarikSuresiGun?: number | null;
  tedarikciId?: string | null;
  aktif?: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: z.string().trim().max(64).nullable().optional(),
      kod: bosluksuz('Parça kodu').max(64),
      ad: bosluksuz('Parça adı').max(200),
      ureticiParcaNo: z.string().trim().max(120).nullable().optional(),
      turId: z.string().trim().max(64).nullable().optional(),
      tesisId: z.string().trim().max(64).nullable().optional(),
      konum: z.string().trim().max(200).nullable().optional(),
      stokAdedi: z.number().int(),
      kritikEsik: z.number().int(),
      tedarikSuresiGun: z.number().int().nullable().optional(),
      tedarikciId: z.string().trim().max(64).nullable().optional(),
      aktif: z.boolean().optional(),
    }).parse(girdi);

    const kapi = parcaKapisi({
      stokAdedi: v.stokAdedi,
      kritikEsik: v.kritikEsik,
      tedarikSuresiGun: v.tedarikSuresiGun ?? null,
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    /* Depoya bağlı parça o santralin kapsamına tabidir; merkezî depo
       (tesisId null) kapsamsız yazma izni ister. */
    kapsamZorunlu(k, 'envanter', 'yazma',
      v.tesisId ? { tesisId: v.tesisId } : {},
      'Bu depoda yedek parça yönetme yetkiniz yok');

    const veri = {
      kod: v.kod, ad: v.ad,
      ureticiParcaNo: v.ureticiParcaNo ?? null,
      turId: v.turId || null,
      tesisId: v.tesisId || null,
      konum: v.konum ?? null,
      stokAdedi: v.stokAdedi,
      kritikEsik: v.kritikEsik,
      tedarikSuresiGun: v.tedarikSuresiGun ?? null,
      tedarikciId: v.tedarikciId || null,
      aktif: v.aktif ?? true,
    };

    const onceki = v.id
      ? await db.yedekParca.findUnique({ where: { id: v.id } })
      : null;
    const kayit = onceki
      ? await db.yedekParca.update({ where: { id: onceki.id }, data: veri })
      : await db.yedekParca.create({ data: veri });

    await iz({
      aktorId: k.id, varlikTipi: 'YedekParca', varlikId: kayit.id,
      eylem: onceki ? 'guncelleme' : 'olusturma', alan: 'stok',
      once: onceki ? `${onceki.stokAdedi} adet` : null,
      sonra: `${v.ad} · ${v.stokAdedi} adet · eşik ${v.kritikEsik}`
        + (v.tedarikSuresiGun === null
          ? ' · tedarik süresi ÖLÇÜLMEDİ'
          : ` · tedarik ${v.tedarikSuresiGun} gün`),
    });

    revalidatePath('/yedek-parca');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Parçayı bir varlığa bağlar; kritiklik bu bağdan gelir. */
export async function yedekParcaVarlikBagla(girdi: {
  parcaId: string; varlikId: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      parcaId: bosluksuz('Parça id'),
      varlikId: bosluksuz('Varlık id'),
    }).parse(girdi);

    const varlik = await db.varlik.findUnique({
      where: { id: v.varlikId },
      select: { id: true, ad: true, tesisId: true, kritiklik: true },
    });
    if (!varlik) throw new Error('Varlık bulunamadı');
    kapsamZorunlu(k, 'envanter', 'yazma',
      varlik.tesisId ? { tesisId: varlik.tesisId } : {},
      'Bu varlığa parça bağlama yetkiniz yok');

    const mevcut = await db.yedekParcaVarlik.findFirst({
      where: { parcaId: v.parcaId, varlikId: v.varlikId }, select: { id: true },
    });
    if (mevcut) return tamam(); // idempotent

    await db.yedekParcaVarlik.create({ data: { parcaId: v.parcaId, varlikId: v.varlikId } });
    await iz({
      aktorId: k.id, varlikTipi: 'YedekParca', varlikId: v.parcaId,
      eylem: 'guncelleme', alan: 'varlik_bagi',
      sonra: `${varlik.ad} (${varlik.kritiklik})`,
    });

    revalidatePath('/yedek-parca');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function yedekParcaVarlikCoz(girdi: { id: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({ id: bosluksuz('Bağ id') }).parse(girdi);
    const bag = await db.yedekParcaVarlik.findUnique({
      where: { id: v.id },
      include: { varlik: { select: { ad: true, tesisId: true } } },
    });
    if (!bag) return tamam(); // idempotent
    kapsamZorunlu(k, 'envanter', 'yazma',
      bag.varlik.tesisId ? { tesisId: bag.varlik.tesisId } : {},
      'Bu bağı kaldırma yetkiniz yok');

    await db.yedekParcaVarlik.delete({ where: { id: v.id } });
    await iz({
      aktorId: k.id, varlikTipi: 'YedekParca', varlikId: bag.parcaId,
      eylem: 'guncelleme', alan: 'varlik_bagi',
      once: bag.varlik.ad, sonra: null,
    });
    revalidatePath('/yedek-parca');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Stok sayımı — elde kaç adet olduğunu YENİDEN ölçer.
 *
 * Ayrı bir eylemdir çünkü ayrı bir olaydır: parçanın tanımını
 * değiştirmeden yalnız sayısını günceller ve sayım tarihini damgalar.
 */
export async function yedekParcaSay(girdi: {
  id: string; stokAdedi: number; not?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: bosluksuz('Parça id'),
      stokAdedi: z.number().int().min(0, 'Stok adedi negatif olamaz'),
      not: z.string().trim().max(500).nullable().optional(),
    }).parse(girdi);

    const p = await db.yedekParca.findUnique({ where: { id: v.id } });
    if (!p) throw new Error('Parça bulunamadı');
    kapsamZorunlu(k, 'envanter', 'yazma',
      p.tesisId ? { tesisId: p.tesisId } : {},
      'Bu depoda sayım yapma yetkiniz yok');

    await db.yedekParca.update({
      where: { id: v.id },
      data: { stokAdedi: v.stokAdedi, sonSayim: new Date() },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'YedekParca', varlikId: v.id,
      eylem: 'guncelleme', alan: 'stokAdedi',
      once: String(p.stokAdedi), sonra: String(v.stokAdedi),
      gerekce: v.not ?? 'Stok sayımı',
    });

    revalidatePath('/yedek-parca');
    return tamam();
  } catch (e) { return hata(e); }
}
