'use server';

/* ═══ UY-65 · Yönetim gözden geçirmesi ═════════════════════════════════

   Kapı `uyum/onay`: yönetim gözden geçirmesi kaydı, denetimde kurumun
   yönetim taahhüdünü gösteren belgedir. Yazma yetkisi olan herkesin
   "yapıldı" işaretleyebilmesi, kaydın değerini sıfırlardı. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { kararKapisi, yapildiKapisi } from '../uyum/gozdenGecirme';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

export async function gozdenGecirmeKaydet(girdi: {
  id?: string | null;
  baslik: string;
  tarih: string;
  regulasyonId?: string | null;
  katilimcilar?: string | null;
  gundem?: string | null;
}): Promise<Sonuc & { id?: string }> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      id: z.string().trim().max(64).nullable().optional(),
      baslik: bosluksuz('Başlık').max(200),
      tarih: bosluksuz('Tarih'),
      regulasyonId: z.string().trim().max(64).nullable().optional(),
      katilimcilar: z.string().trim().max(2000).nullable().optional(),
      gundem: z.string().trim().max(4000).nullable().optional(),
    }).parse(girdi);

    const tarih = new Date(v.tarih);
    if (Number.isNaN(tarih.getTime())) return { ok: false, hata: 'Tarih okunamadı.' };

    const veri = {
      baslik: v.baslik, tarih,
      regulasyonId: v.regulasyonId || null,
      katilimcilar: v.katilimcilar ?? null,
      gundem: v.gundem ?? null,
    };
    const onceki = v.id
      ? await db.yonetimGozdenGecirme.findUnique({ where: { id: v.id } })
      : null;
    if (onceki?.durum === 'yapildi') {
      return {
        ok: false,
        hata: 'Yapılmış bir gözden geçirmenin kaydı değiştirilemez; '
          + 'düzeltme yeni bir kayıtla yapılır.',
      };
    }

    const kayit = onceki
      ? await db.yonetimGozdenGecirme.update({ where: { id: onceki.id }, data: veri })
      : await db.yonetimGozdenGecirme.create({
        data: { ...veri, kod: `YGG-${Date.now().toString(36).toUpperCase()}`, yurutenId: k.id },
      });

    await iz({
      aktorId: k.id, varlikTipi: 'YonetimGozdenGecirme', varlikId: kayit.id,
      eylem: onceki ? 'guncelleme' : 'olusturma',
      sonra: `${v.baslik} · ${tarih.toISOString().slice(0, 10)}`,
    });

    revalidatePath('/gozden-gecirme');
    return { ok: true, id: kayit.id };
  } catch (e) { return hata(e); }
}

/**
 * Karar ekler ve istenirse karardan bir GÖREV açar.
 *
 * Görev açmak isteğe bağlıdır ama önerilendir: kararı görev kuyruğuna
 * düşmeyen bir gözden geçirme, bir sonraki toplantıya kadar
 * hatırlanmaz.
 */
export async function gozdenGecirmeKarariEkle(girdi: {
  gozdenGecirmeId: string;
  karar: string;
  sorumluId: string;
  sonTarih: string;
  gorevAc?: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      gozdenGecirmeId: bosluksuz('Gözden geçirme id'),
      karar: bosluksuz('Karar').max(2000),
      sorumluId: bosluksuz('Sorumlu'),
      sonTarih: bosluksuz('Son tarih'),
      gorevAc: z.boolean().optional(),
    }).parse(girdi);

    const gg = await db.yonetimGozdenGecirme.findUnique({
      where: { id: v.gozdenGecirmeId }, select: { id: true, durum: true, baslik: true },
    });
    if (!gg) throw new Error('Gözden geçirme bulunamadı');
    if (gg.durum === 'iptal') {
      return { ok: false, hata: 'İptal edilmiş gözden geçirmeye karar eklenemez.' };
    }

    const son = new Date(v.sonTarih);
    if (Number.isNaN(son.getTime())) return { ok: false, hata: 'Son tarih okunamadı.' };

    const kapi = kararKapisi({
      karar: v.karar, sorumluVar: true, sonTarih: son.getTime(),
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    let gorevId: string | null = null;
    if (v.gorevAc) {
      const gorev = await db.gorev.create({
        data: {
          baslik: v.karar.slice(0, 200),
          tip: 'manuel',
          kaynakTipi: 'YonetimGozdenGecirme',
          kaynakId: gg.id,
          sorumluId: v.sorumluId,
          sonTarih: son,
        },
      });
      gorevId = gorev.id;
    }

    const kayit = await db.gozdenGecirmeKarari.create({
      data: {
        gozdenGecirmeId: v.gozdenGecirmeId,
        karar: v.karar,
        sorumluId: v.sorumluId,
        sonTarih: son,
        gorevId,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'GozdenGecirmeKarari', varlikId: kayit.id,
      eylem: 'olusturma',
      sonra: v.karar.slice(0, 200),
      gerekce: gorevId ? 'Karardan görev açıldı' : 'Görev açılmadı',
    });

    revalidatePath('/gozden-gecirme');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function gozdenGecirmeKarariDurum(girdi: {
  id: string; durum: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      id: bosluksuz('Karar id'),
      durum: z.enum(['acik', 'tamamlandi', 'iptal']),
      gerekce: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    const karar = await db.gozdenGecirmeKarari.findUnique({ where: { id: v.id } });
    if (!karar) throw new Error('Karar bulunamadı');
    if (v.durum === 'iptal' && !v.gerekce?.trim()) {
      return { ok: false, hata: 'Karar iptali gerekçe ister.' };
    }

    await db.gozdenGecirmeKarari.update({ where: { id: v.id }, data: { durum: v.durum } });
    /* Karar kapanınca bağlı görev de kapanır: iki yerde ayrı ayrı
       kapatılması gereken bir iş, bir yerde açık kalır. */
    if (karar.gorevId && v.durum !== 'acik') {
      await db.gorev.update({
        where: { id: karar.gorevId },
        data: { durum: v.durum === 'tamamlandi' ? 'tamamlandi' : 'iptal', kapanis: new Date() },
      });
    }
    await iz({
      aktorId: k.id, varlikTipi: 'GozdenGecirmeKarari', varlikId: v.id,
      eylem: 'guncelleme', alan: 'durum', once: karar.durum, sonra: v.durum,
      gerekce: v.gerekce ?? null,
    });

    revalidatePath('/gozden-gecirme');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Gözden geçirmeyi "yapıldı" işaretler — kararsız kayıt geçmez. */
export async function gozdenGecirmeTamamla(girdi: {
  id: string; ozet: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      id: bosluksuz('Gözden geçirme id'),
      ozet: bosluksuz('Özet').max(4000),
    }).parse(girdi);

    const gg = await db.yonetimGozdenGecirme.findUnique({
      where: { id: v.id }, include: { _count: { select: { kararlar: true } } },
    });
    if (!gg) throw new Error('Gözden geçirme bulunamadı');
    if (gg.durum !== 'planli') {
      return { ok: false, hata: `Kayıt "${gg.durum}" durumunda; tamamlanamaz.` };
    }

    const kapi = yapildiKapisi({
      kararSayisi: gg._count.kararlar,
      ozet: v.ozet,
      tarih: gg.tarih.getTime(),
      simdi: Date.now(),
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    await db.yonetimGozdenGecirme.update({
      where: { id: v.id }, data: { durum: 'yapildi', ozet: v.ozet },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'YonetimGozdenGecirme', varlikId: v.id,
      eylem: 'guncelleme', alan: 'durum', once: 'planli', sonra: 'yapildi',
      gerekce: `${gg._count.kararlar} karar kaydedildi`,
    });

    revalidatePath('/gozden-gecirme');
    return tamam();
  } catch (e) { return hata(e); }
}
