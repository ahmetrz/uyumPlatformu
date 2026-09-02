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

    /* TÜMÜ YA DA HİÇBİRİ.

       Bu blok eskiden transaction DIŞINDA dönüyordu: okuma, ardından
       kayıt başına bir `update` ve bir `iz`. Elliyedinci kayıtta bir şey
       patlarsa ilk elli altısı KALICI olarak kapanmış, çağıran ise hata
       görmüş oluyordu — yani modülün hemen üstteki "hiçbiri
       değiştirilmedi" sözü yalnız 'kayıt bulunamadı' dalında tutuluyordu.
       Yarım kapatılmış bir dead-letter kuyruğu, hiç kapatılmamış bir
       kuyruktan daha yanıltıcıdır: sayı düşer, sebep kalır.

       Okuma da transaction'a alındı. Dışarıda okuyup içeride yazmak
       TOCTOU açıyordu: iki inceleyen aynı kaydı aynı anda kapatırsa
       ikisi de "önceki durum: acik" diye iz yazar ve biri sessizce
       ezilir. Artık her satır KOŞULLU güncelleniyor (`where` beklenen
       durumu taşır) ve `count === 0` — yani başkası bizden önce
       davranmış — tüm işlemi geri alır.

       `iz()` transaction istemcisiyle çağrılıyor: `lib/db.ts` tek
       better-sqlite3 bağlantısı kullandığı için transaction dışında
       yazılan iz, transaction geri alınırsa sessizce yutulur
       (ölçüldü: tests/yaris-kosullari). */
    await db.$transaction(async (tx) => {
      const kayitlar = await tx.reddedilenKayit.findMany({
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
        const { count } = await tx.reddedilenKayit.updateMany({
          where: { id: r.id, durum: r.durum },
          data: {
            durum: v.durum,
            inceleyenId: v.durum === 'acik' ? null : k.id,
            incelemeNotu: v.not,
            incelemeZamani: v.durum === 'acik' ? null : simdi,
          },
        });
        if (count === 0) {
          throw new Error(`Kayıt ${r.id} bu sırada başkası tarafından değiştirildi `
            + '— listeyi yenileyip yeniden deneyin; hiçbiri değiştirilmedi');
        }
        await iz({
          aktorId: k.id, varlikTipi: 'ReddedilenKayit', varlikId: r.id,
          eylem: v.durum === 'yok_sayildi' ? 'red' : 'guncelleme', alan: 'durum',
          once: r.durum, sonra: v.durum,
          gerekce: `${v.not ?? 'not yok'} · ${r.asama}/${r.sebep} · kaynak: ${r.kaynakSistem}`,
        }, tx);
      }
    });

    revalidatePath('/saglik/reddedilenler');
    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}
