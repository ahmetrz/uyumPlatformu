'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import { tamam, hata, bosluksuz, type Sonuc } from './ortak';

/* Tedarikçi erişim oturumu — İNSAN KARARI YÜZEYİ.

   ── NE YAPMAZ ────────────────────────────────────────────────────────
   Bu dosya OTURUM KAPATMAZ, erişim kesmez, PAM/VPN'e bağlanmaz. Uyumsuz
   bir oturum burada bir ÖNERİdir; ekran onu gösterir, insan karar verir,
   karar denetim izine düşer. Kararın kendisi `TedarikciErisimOturumu`
   satırına DOKUNMAZ: o satır dış kaynağın gözlemidir, bizim kararımız
   değil. Kaynağı biz düzeltirsek bir daha hiçbir senkronizasyonda
   "gerçekte ne olduğunu" okuyamayız.

   Bu ayrım daha önce bir kez kaybedilmişti: bir ekranın "uyumsuz oturumu
   kapat" düğmesi gözlem satırının `durum` alanını 'kesildi' yapıyordu ve
   kaynak sistemde oturum sürüyordu — kayıt yalan söylüyordu. Karar ile
   gözlem artık iki ayrı tabloda yaşar (karar: `AktiviteKaydi`,
   gerekirse `Gorev`).

   ── KARAR TİPLERİ ────────────────────────────────────────────────────
   · kapatma_talebi  — erişimin sahada kesilmesi için görev açılır. Görevi
                       insan yürütür; platform kesmez.
   · istisna         — uyumsuzluk gerekçeli olarak kabul edilir.
   · yanlis_pozitif  — kaynak sistemin raporu hatalı; veri düzeltilmeli.
   Üçünde de GEREKÇE ZORUNLUDUR: gerekçesiz susturma denetimde savunulamaz. */

const KARARLAR = ['kapatma_talebi', 'istisna', 'yanlis_pozitif'] as const;
export type OturumKarari = (typeof KARARLAR)[number];

const KARAR_SOZU: Record<OturumKarari, string> = {
  kapatma_talebi: 'erişimin kesilmesi için görev açıldı',
  istisna: 'uyumsuzluk gerekçeli olarak kabul edildi',
  yanlis_pozitif: 'kaynak sistem raporu hatalı olarak işaretlendi',
};

/**
 * Uyumsuz bir oturum hakkında verilen insan kararını kaydeder.
 *
 * Kapsam: oturumun santralinde `envanter/yazma`. Santrali BİLİNMEYEN
 * (tesisId = null) oturum, ancak kapsamı sınırsız olan kullanıcının
 * kararına açıktır — `uyumsuzOturumlar` görünürlük kuralıyla birebir aynı.
 */
export async function oturumKarariKaydet(girdi: {
  oturumId: string; karar: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      oturumId: bosluksuz('Oturum'),
      karar: z.enum(KARARLAR, 'Geçersiz karar'),
      gerekce: z.string().trim().min(10, 'Gerekçe en az 10 karakter olmalı'),
    }).parse(girdi);

    const k = await yetkiZorunlu('envanter', 'yazma');
    const oturum = await db.tedarikciErisimOturumu.findUnique({
      where: { id: v.oturumId },
      select: {
        id: true, tesisId: true, baslangic: true, durum: true, kaynakSistem: true,
        onayli: true, mfaVar: true, izlendi: true,
        tedarikci: { select: { id: true, ad: true } },
        tesis: { select: { kod: true, ad: true } },
      },
    });
    if (!oturum) return { ok: false, hata: 'Oturum kaydı bulunamadı' };
    if (!izinVar(k, 'envanter', 'yazma', { tesisId: oturum.tesisId })) {
      return { ok: false, hata: oturum.tesisId
        ? 'Bu santral kapsamında yetkiniz yok'
        : 'Santrali bilinmeyen oturumda karar vermek kapsamsız yetki ister' };
    }

    /* Kanıtlı ihlaller karara YAZILIR: kararın neyi kapsadığı altı ay sonra
       da okunabilsin. Bilinmeyen alan (null) ihlal sayılmaz. */
    const ihlaller = [
      oturum.onayli === false ? 'onaysız' : null,
      oturum.mfaVar === false ? 'MFA yok' : null,
      oturum.izlendi === false ? 'izlenmemiş' : null,
    ].filter(Boolean).join(' · ') || 'kanıtlı ihlal yok';

    const ozet = `${oturum.tedarikci.ad} · ${oturum.kaynakSistem} `
      + `· ${oturum.baslangic.toISOString().slice(0, 16).replace('T', ' ')} · ${ihlaller}`;

    /* Görev + iz TEK işlemde. Yarım yazma "görev açıldı ama izi yok" ya da
       "iz var ama görev yok" demek olurdu; ikisi de denetimde delik. */
    await db.$transaction(async (tx) => {
      if (v.karar === 'kapatma_talebi') {
        await tx.gorev.create({ data: {
          baslik: `Tedarikçi erişimini kes · ${oturum.tedarikci.ad}`
            + (oturum.tesis ? ` · ${oturum.tesis.kod}` : ''),
          tip: 'erisim_incelemesi',
          tesisId: oturum.tesisId,
          otomatikUretildi: false,
        } });
      }
      await tx.aktiviteKaydi.create({ data: {
        aktorId: k.id,
        varlikTipi: 'TedarikciErisimOturumu',
        varlikId: oturum.id,
        eylem: 'oturum_karari',
        alan: v.karar,
        // Gözlem DEĞİŞMEDİ: önceki/sonraki aynı satırı gösterir, karar ayrı.
        oncekiDeger: ozet,
        yeniDeger: KARAR_SOZU[v.karar],
        gerekce: v.gerekce,
      } });
    });

    revalidatePath('/tedarikciler');
    revalidatePath('/yonetim-tezgahi');
    return tamam();
  } catch (e) { return hata(e); }
}
