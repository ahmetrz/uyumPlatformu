'use server';

/* ═══ OT-55 · Fiziksel envanter sayımı ═════════════════════════════════

   Kalıp `eylemler2/*` ile aynı: yetkiZorunlu(KAPSAM_SONRA) → zod →
   kayıt oku → kapsamZorunlu → db → iz → revalidatePath.

   ── SAYIM HİÇBİR VARLIĞI SİLMEZ ───────────────────────────────────────
   Bu dosyada `varlik.delete` ya da `varlik.update({ silindi })` YOKTUR
   ve olmayacak. "Bulunamadı" bir ölçüm sonucudur; envanterden düşürme
   ayrı bir insan kararıdır ve kendi ekranından yapılır. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import type { AktifKullanici } from '../auth';
import { kapatmaKapisi, satirKapisi, sayimAcmaKapisi, SONUCLAR } from '../varlik/sayim';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

async function sayimKapsami(k: AktifKullanici, sayimId: string, mesaj: string) {
  const s = await db.envanterSayimi.findUnique({
    where: { id: sayimId }, select: { tesisId: true, durum: true },
  });
  if (!s) throw new Error('Sayım bulunamadı');
  kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: s.tesisId }, mesaj);
  return s;
}

/**
 * Sayım kampanyası açar ve kapsamdaki varlıklar için satır üretir.
 *
 * Satırlar açılış anında donar: sonradan envantere eklenen varlık bu
 * sayımın paydasını DEĞİŞTİRMEZ. Yoksa oran her gün başka bir şey
 * söylerdi ve iki gün arayla alınan iki ekran görüntüsü çelişirdi.
 */
export async function sayimAc(girdi: {
  ad: string;
  tesisId: string;
  turId?: string | null;
  bolgeId?: string | null;
}): Promise<Sonuc & { id?: string }> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      ad: bosluksuz('Sayım adı').max(200),
      tesisId: bosluksuz('Santral'),
      turId: z.string().trim().max(64).nullable().optional(),
      bolgeId: z.string().trim().max(64).nullable().optional(),
    }).parse(girdi);

    kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: v.tesisId },
      'Bu santralde sayım açma yetkiniz yok');

    const kosul = {
      tesisId: v.tesisId,
      silindi: null,
      ...(v.turId ? { turId: v.turId } : {}),
      ...(v.bolgeId ? { bolgeId: v.bolgeId } : {}),
    };
    const varliklar = await db.varlik.findMany({ where: kosul, select: { id: true } });

    const kapi = sayimAcmaKapisi({ kapsamSayisi: varliklar.length });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    const kod = `SAY-${Date.now().toString(36).toUpperCase()}`;
    const sayim = await db.envanterSayimi.create({
      data: {
        kod, ad: v.ad, tesisId: v.tesisId,
        turId: v.turId || null, bolgeId: v.bolgeId || null,
        acanId: k.id, kapsamSayisi: varliklar.length,
        satirlar: { create: varliklar.map((x) => ({ varlikId: x.id })) },
      },
    });

    await iz({
      aktorId: k.id, varlikTipi: 'EnvanterSayimi', varlikId: sayim.id,
      eylem: 'olusturma',
      sonra: `${v.ad} · ${varliklar.length} varlık`,
      gerekce: 'Fiziksel envanter sayımı açıldı',
    });

    revalidatePath('/sayim');
    return { ok: true, id: sayim.id };
  } catch (e) { return hata(e); }
}

/** Sayım aşamasını ilerletir (hazırlık → sahada → karşılaştırma). */
export async function sayimDurumu(girdi: {
  id: string; durum: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: bosluksuz('Sayım id'),
      durum: z.enum(['hazirlik', 'sahada', 'karsilastirma']),
    }).parse(girdi);

    const s = await sayimKapsami(k, v.id, 'Bu sayımı değiştirme yetkiniz yok');
    if (s.durum === 'kapali') {
      return { ok: false, hata: 'Kapanmış sayım yeniden açılamaz.' };
    }
    await db.envanterSayimi.update({ where: { id: v.id }, data: { durum: v.durum } });
    await iz({
      aktorId: k.id, varlikTipi: 'EnvanterSayimi', varlikId: v.id,
      eylem: 'guncelleme', alan: 'durum', once: s.durum, sonra: v.durum,
    });
    revalidatePath('/sayim');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Bir satırın saha sonucunu yazar. */
export async function sayimSatiriKaydet(girdi: {
  sayimId: string;
  satirId?: string | null;
  sonuc: string;
  sahaKimligi?: string | null;
  bulunanYer?: string | null;
  not?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      sayimId: bosluksuz('Sayım id'),
      satirId: z.string().trim().max(64).nullable().optional(),
      sonuc: z.enum(SONUCLAR),
      sahaKimligi: z.string().trim().max(200).nullable().optional(),
      bulunanYer: z.string().trim().max(200).nullable().optional(),
      not: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    const s = await sayimKapsami(k, v.sayimId, 'Bu sayıma yazma yetkiniz yok');
    if (s.durum === 'kapali') {
      return { ok: false, hata: 'Sayım kapandı; satır değiştirilemez.' };
    }

    const mevcut = v.satirId
      ? await db.sayimSatiri.findUnique({ where: { id: v.satirId } })
      : null;
    if (v.satirId && (!mevcut || mevcut.sayimId !== v.sayimId)) {
      return { ok: false, hata: 'Satır bu sayıma ait değil.' };
    }

    const kapi = satirKapisi({
      sonuc: v.sonuc,
      varlikVar: mevcut?.varlikId != null,
      sahaKimligi: v.sahaKimligi ?? null,
      bulunanYer: v.bulunanYer ?? null,
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    if (mevcut) {
      await db.sayimSatiri.update({
        where: { id: mevcut.id },
        data: {
          sonuc: v.sonuc,
          bulunanYer: v.bulunanYer ?? null,
          not: v.not ?? null,
          sayanId: k.id,
          sayimZamani: new Date(),
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'SayimSatiri', varlikId: mevcut.id,
        eylem: 'guncelleme', alan: 'sonuc', once: mevcut.sonuc, sonra: v.sonuc,
        gerekce: v.not ?? null,
      });
    } else {
      /* Kayıtta olmayan cihaz: yalnız `fazladan` sonucuyla açılabilir
         (kapı bunu zaten sınadı). */
      const yeni = await db.sayimSatiri.create({
        data: {
          sayimId: v.sayimId,
          sonuc: v.sonuc,
          sahaKimligi: v.sahaKimligi ?? null,
          bulunanYer: v.bulunanYer ?? null,
          not: v.not ?? null,
          sayanId: k.id,
          sayimZamani: new Date(),
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'SayimSatiri', varlikId: yeni.id,
        eylem: 'olusturma',
        sonra: `KAYITSIZ cihaz: ${v.sahaKimligi}`,
        gerekce: v.not ?? null,
      });
    }

    revalidatePath('/sayim');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Sayımı kapatır.
 *
 * Sayılmamış satır varsa gerekçe zorunludur ve kapanış izi kaç satırın
 * hiç sayılmadığını YAZAR: eksik kapanan bir sayım, tam sayılmış gibi
 * görünmez.
 */
export async function sayimKapat(girdi: {
  id: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: bosluksuz('Sayım id'),
      gerekce: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    const s = await sayimKapsami(k, v.id, 'Bu sayımı kapatma yetkiniz yok');
    const sayilmayan = await db.sayimSatiri.count({
      where: { sayimId: v.id, sonuc: 'sayilmadi' },
    });

    const kapi = kapatmaKapisi({
      durum: s.durum, sayilmayan, gerekce: v.gerekce ?? null,
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    await db.envanterSayimi.update({
      where: { id: v.id },
      data: {
        durum: 'kapali', bitis: new Date(), kapatanId: k.id,
        gerekce: v.gerekce ?? null,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'EnvanterSayimi', varlikId: v.id,
      eylem: 'guncelleme', alan: 'durum', once: s.durum, sonra: 'kapali',
      gerekce: sayilmayan > 0
        ? `${sayilmayan} satır HİÇ SAYILMADI · ${v.gerekce}`
        : (v.gerekce ?? 'Kapsamın tamamı sayıldı'),
    });

    revalidatePath('/sayim');
    return tamam();
  } catch (e) { return hata(e); }
}
