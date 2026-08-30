'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

/* Kimlik ve erişim yönetimi (§9): kişi/servis/paylaşımlı/acil durum hesapları,
   erişim atamaları ve DÖNEMSEL erişim incelemesi. Servis hesapları parola
   rotasyonuyla izlenir (EPDK-SYM-5.1.1 bulgusunun veri temeli). */

export async function hesapKaydet(girdi: {
  id?: string; hesapAdi: string; tip: string; tesisId?: string | null;
  kaynakSistem?: string | null; ayricalikli: boolean;
  parolaRotasyon?: string | null; durum?: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({
      id: z.string().optional(), hesapAdi: bosluksuz('Hesap adı'),
      tip: z.enum(['kisi', 'servis', 'paylasimli', 'acil_durum']),
      tesisId: z.string().nullable().optional(),
      kaynakSistem: z.string().nullable().optional(),
      ayricalikli: z.boolean(),
      parolaRotasyon: z.string().nullable().optional(),
      durum: z.enum(['aktif', 'askida', 'kapatildi']).optional(),
    }).parse(girdi);
    const veri = {
      hesapAdi: v.hesapAdi, tip: v.tip, tesisId: v.tesisId ?? null,
      kaynakSistem: v.kaynakSistem ?? null, ayricalikli: v.ayricalikli,
      parolaRotasyon: v.parolaRotasyon ? new Date(v.parolaRotasyon) : null,
      ...(v.durum ? { durum: v.durum } : {}),
    };
    if (v.id) {
      const eski = await db.kimlikHesabi.findUniqueOrThrow({ where: { id: v.id } });
      await db.kimlikHesabi.update({ where: { id: v.id }, data: veri });
      if (v.durum && v.durum !== eski.durum)
        await iz({ aktorId: k.id, varlikTipi: 'KimlikHesabi', varlikId: v.id,
          eylem: 'durum_degisimi', alan: 'durum', once: eski.durum, sonra: v.durum });
    } else {
      const yeni = await db.kimlikHesabi.create({ data: veri });
      await iz({ aktorId: k.id, varlikTipi: 'KimlikHesabi', varlikId: yeni.id, eylem: 'olusturma' });
    }
    revalidatePath('/operasyon');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function erisimAta(girdi: {
  hesapId: string; varlikId?: string | null; kapsam?: string | null; yetkiSeviyesi: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({
      hesapId: z.string(), varlikId: z.string().nullable().optional(),
      kapsam: z.string().nullable().optional(),
      yetkiSeviyesi: z.enum(['okuma', 'yazma', 'yonetici']),
    }).parse(girdi);
    const yeni = await db.erisimAtamasi.create({ data: {
      hesapId: v.hesapId, varlikId: v.varlikId ?? null,
      kapsam: v.kapsam ?? null, yetkiSeviyesi: v.yetkiSeviyesi } });
    await iz({ aktorId: k.id, varlikTipi: 'ErisimAtamasi', varlikId: yeni.id,
      eylem: 'olusturma', sonra: v.yetkiSeviyesi });
    revalidatePath('/operasyon');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Dönemsel erişim incelemesi: onaylandı / kaldırılsın / değiştirilsin.
    'kaldırılsın' kararı atamayı bitirir (bitiş damgası). */
export async function erisimIncele(girdi: {
  atamaId: string; sonuc: string; not?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay');
    const v = z.object({
      atamaId: z.string(),
      sonuc: z.enum(['onaylandi', 'kaldirilsin', 'degistirilsin']),
      not: z.string().nullable().optional(),
    }).parse(girdi);
    await db.erisimIncelemesi.create({ data: {
      atamaId: v.atamaId, inceleyenId: k.id, sonuc: v.sonuc, not: v.not ?? null } });
    if (v.sonuc === 'kaldirilsin')
      await db.erisimAtamasi.update({ where: { id: v.atamaId },
        data: { bitis: new Date() } });
    await iz({ aktorId: k.id, varlikTipi: 'ErisimAtamasi', varlikId: v.atamaId,
      eylem: v.sonuc === 'onaylandi' ? 'onay' : 'guncelleme',
      alan: 'inceleme', sonra: v.sonuc, gerekce: v.not ?? null });
    revalidatePath('/operasyon');
    return tamam();
  } catch (e) { return hata(e); }
}
