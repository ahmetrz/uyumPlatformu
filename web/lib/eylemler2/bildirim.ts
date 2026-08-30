'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { tamam, hata, type Sonuc } from './ortak';

/** Bildirim okundu işareti — yalnız kendi bildirimleri. */
export async function bildirimOkundu(girdi: { id?: string; hepsi?: boolean }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'okuma');
    if (girdi.hepsi) {
      await db.bildirim.updateMany({
        where: { kullaniciId: k.id, okundu: null }, data: { okundu: new Date() } });
    } else if (girdi.id) {
      await db.bildirim.updateMany({
        where: { id: girdi.id, kullaniciId: k.id }, data: { okundu: new Date() } });
    }
    revalidatePath('/');
    return tamam();
  } catch (e) { return hata(e); }
}
