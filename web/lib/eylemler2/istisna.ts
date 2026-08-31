'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

/* İstisna / waiver (§50): süreli, gerekçeli, ONAYLI. Talep onay merkezine
   düşer; onaylanana kadar madde durumu değişmez. Onay yan etkisi
   lib/eylemler2/gorev.ts onayKarar içindedir. */

export async function istisnaTalep(girdi: {
  maddeDurumuId: string; bitis: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma');
    const v = z.object({
      maddeDurumuId: z.string().min(1),
      bitis: z.string().min(1, 'Bitiş tarihi zorunlu'),
      gerekce: bosluksuz('Gerekçe').pipe(z.string().min(10, 'Gerekçe en az 10 karakter')),
    }).parse(girdi);
    const bitis = new Date(v.bitis);
    if (bitis <= new Date()) return { ok: false, hata: 'İstisna bitişi gelecekte olmalı' };

    const durum = await db.maddeDurumu.findUniqueOrThrow({
      where: { id: v.maddeDurumuId }, include: { madde: true, tesis: true } });
    if (!izinVar(k, 'uyum', 'yazma', { tesisId: durum.tesisId, surecId: durum.surecId }))
      return { ok: false, hata: 'Bu tesis kapsamında yetkiniz yok' };

    const acikIstisna = await db.istisna.findFirst({ where: {
      maddeId: durum.maddeId, tesisId: durum.tesisId,
      durum: { in: ['onay_bekliyor', 'aktif'] } } });
    if (acikIstisna) return { ok: false, hata: 'Bu madde/tesis için açık bir istisna zaten var' };

    const istisna = await db.istisna.create({ data: {
      maddeId: durum.maddeId, tesisId: durum.tesisId,
      gerekce: v.gerekce, bitis } });
    await db.onayTalebi.create({ data: {
      tip: 'istisna', kaynakTipi: 'Istisna', kaynakId: istisna.id,
      ozet: `${durum.madde.kod} · ${durum.tesis.kod} — ${new Intl.DateTimeFormat('tr-TR').format(bitis)} tarihine kadar istisna: ${v.gerekce.slice(0, 120)}`,
      talepEdenId: k.id } });
    await iz({ aktorId: k.id, varlikTipi: 'Istisna', varlikId: istisna.id,
      eylem: 'olusturma', gerekce: v.gerekce });
    revalidatePath('/yonetim-tezgahi'); revalidatePath('/surecler');
    return tamam();
  } catch (e) { return hata(e); }
}
