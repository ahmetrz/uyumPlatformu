'use server';

/* Reddedilen kayıt (dead-letter) inceleme eylemi.

   `ReddedilenKayit` tablosuna çekirdek YAZIYOR ama hiçbir yerden
   OKUNMUYOR ve hiçbir kayıt kapatılamıyordu: kuyruk büyüyor, kimse
   bakmıyordu. Bir kaydın reddedilmesi bir sayıdan ibaret olamaz — hangi
   kayıt, neden, hangi aşamada düştü ve İNSAN NE KARAR VERDİ, hepsi
   saklanmalı.

   Değişmezler:
   · Kayıt SİLİNMEZ. 'yok sayıldı' bile bir karardır ve saklanır; silmek,
     aynı kusurun altı ay sonra yeniden keşfedilmesi demektir.
   · Karar NOTU zorunludur. Notsuz kapatılan bir dead-letter satırı,
     kapatılmamış bir satırdan daha kötüdür: sorun çözülmüş görünür.
   · Kaydı otomatik hiçbir şey kapatamaz; bu kuyruk motor tarafından
     boşaltılmaz.

   Kalıp: yetkiZorunlu → zod → db → iz → revalidatePath. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

/** Şemadaki `ReddedilenKayit.durum` ile birebir. */
export const RED_DURUMLARI = ['acik', 'incelendi', 'duzeltildi', 'yok_sayildi'] as const;

/** Tek çağrıda kapatılabilecek en fazla kayıt — sınırsız toplu işlem,
    gözden geçirilemeyen bir denetim izi üretir. */
const TOPLU_SINIR = 100;

const Sema = z.object({
  idler: z.array(bosluksuz('Kayıt')).min(1, 'En az bir kayıt seçilmeli'),
  durum: z.enum(RED_DURUMLARI, 'Geçersiz inceleme durumu'),
  not: z.string().trim().transform((s) => s || null).nullable().optional(),
});

/**
 * Reddedilen kayıtları inceler. `durum: 'acik'` dışındaki her karar NOT
 * ister; not olmadan kapatılan bir kayıt "çözüldü" gibi görünür ama
 * neyin çözüldüğü bilinmez.
 *
 * Her kayıt KENDİ denetim izi satırını alır: toplu işlem tek satıra
 * indirgenirse hangi kaydın neden kapatıldığı kaybolur.
 */
export async function redKaydiIncele(girdi: {
  idler: string[]; durum: string; not?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const v = Sema.parse(girdi);
    const idler = [...new Set(v.idler)];
    if (idler.length > TOPLU_SINIR) {
      throw new Error(`Tek seferde en fazla ${TOPLU_SINIR} kayıt incelenebilir `
        + `(${idler.length} istendi)`);
    }
    if (v.durum !== 'acik' && !v.not) {
      throw new Error('İnceleme notu zorunlu — dayanağı yazılmadan kapatılan bir '
        + 'dead-letter kaydı, kapatılmamış bir kayıttan daha yanıltıcıdır.');
    }

    const kayitlar = await db.reddedilenKayit.findMany({
      where: { id: { in: idler } },
      select: { id: true, durum: true, asama: true, sebep: true, kaynakSistem: true },
    });
    // Eksik kayıt sessizce atlanmaz: yarım işlem gizli kalmamalı.
    if (kayitlar.length !== idler.length) {
      throw new Error(`${idler.length} kayıt istendi, ${kayitlar.length} tanesi bulundu — `
        + 'hiçbiri değiştirilmedi');
    }

    const simdi = new Date();
    for (const r of kayitlar) {
      await db.reddedilenKayit.update({
        where: { id: r.id },
        data: {
          durum: v.durum,
          inceleyenId: v.durum === 'acik' ? null : k.id,
          incelemeNotu: v.not,
          incelemeZamani: v.durum === 'acik' ? null : simdi,
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'ReddedilenKayit', varlikId: r.id,
        eylem: v.durum === 'yok_sayildi' ? 'red' : 'guncelleme', alan: 'durum',
        once: r.durum, sonra: v.durum,
        gerekce: `${v.not ?? 'not yok'} · ${r.asama}/${r.sebep} · kaynak: ${r.kaynakSistem}`,
      });
    }

    revalidatePath('/saglik/reddedilenler');
    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}
