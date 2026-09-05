'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

/* Kimlik ve erişim yönetimi (§9): kişi/servis/paylaşımlı/acil durum hesapları,
   erişim atamaları ve DÖNEMSEL erişim incelemesi. Servis hesapları parola
   rotasyonuyla izlenir (EPDK-SYM-5.1.1 bulgusunun veri temeli). */

export async function hesapKaydet(girdi: {
  id?: string; hesapAdi: string; tip: string; tesisId?: string | null;
  kaynakSistem?: string | null; ayricalikli: boolean | null;
  parolaRotasyon?: string | null; durum?: string;
}): Promise<Sonuc> {
  try {
    /* İKİ AŞAMALI KAPI. `KimlikHesabi.tesisId` şemada VAR: bir hesap bir
       santrale ait olabilir. Hangi santral olduğu girdiden VE kaydın
       kendisinden gelir, ikisi de sorulur. */
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: z.string().optional(), hesapAdi: bosluksuz('Hesap adı'),
      tip: z.enum(['kisi', 'servis', 'paylasimli', 'acil_durum']),
      tesisId: z.string().nullable().optional(),
      kaynakSistem: z.string().nullable().optional(),
      /* null = ÖLÇÜLMEDİ. Dizinden gelen hesabın ayrıcalık bilgisi
         yoksa formu açan kullanıcı da "hayır" demiş sayılmaz; değeri
         olduğu gibi geri gönderebilsin. */
      ayricalikli: z.boolean().nullable(),
      parolaRotasyon: z.string().nullable().optional(),
      durum: z.enum(['aktif', 'askida', 'kapatildi']).optional(),
    }).parse(girdi);
    const veri = {
      hesapAdi: v.hesapAdi, tip: v.tip, tesisId: v.tesisId ?? null,
      kaynakSistem: v.kaynakSistem ?? null, ayricalikli: v.ayricalikli,
      parolaRotasyon: v.parolaRotasyon ? new Date(v.parolaRotasyon) : null,
      ...(v.durum ? { durum: v.durum } : {}),
    };
    // HEDEF santral: hesabın açılacağı/taşınacağı yer.
    kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: v.tesisId },
      'Bu santral kapsamında hesap yönetme yetkiniz yok');
    if (v.id) {
      const eski = await db.kimlikHesabi.findUniqueOrThrow({ where: { id: v.id } });
      /* KAYDIN KENDİ santrali de sorulur. Yalnız hedef denetlenseydi,
         yabancı bir hesap "kendi santralime al" denerek ele geçirilirdi. */
      kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: eski.tesisId },
        'Bu hesabın santrali kapsamınızda değil');
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

/** Tekillik kısıtı ihlali mi? İki indeks de aynı kuralı uygular:
    Prisma'nın bildiği `@@unique` (P2002) ve göçte elle kurulan
    COALESCE'li ifade indeksi (sürücüden ham SQLite hatası olarak gelir —
    Prisma o indeksi tanımaz). İkisi de "bu atama zaten var" demektir. */
function tekillikIhlali(e: unknown): boolean {
  const kod = (e as { code?: unknown })?.code;
  if (kod === 'P2002') return true;
  const mesaj = e instanceof Error ? e.message : String(e);
  return /UNIQUE constraint failed:\s*(index\s*'?)?ErisimAtamasi/i.test(mesaj);
}

/**
 * Erişim ataması açar.
 *
 * TEKİLLİK VERİTABANINDADIR: (hesapId, varlikId, kapsam) üçlüsü tekildir
 * (bkz. göç 20260901210000). Aşağıdaki ön kontrol bir kapı DEĞİLDİR —
 * yalnız kullanıcıya anlaşılır bir cümle döndürmek içindir; eşzamanlı iki
 * çağrıda kapıyı kısıt tutar ve ikincisi aynı mesajla reddedilir. Aynı
 * üçlüye farklı yetki seviyesi vermek de yeni satır AÇMAZ: bir atamanın
 * seviyesi değişiyorsa bu yeni bir erişim değil, mevcut erişimin
 * değişimidir ve dönemsel incelemeden (`erisimIncele`) geçer.
 */
export async function erisimAta(girdi: {
  hesapId: string; varlikId?: string | null; kapsam?: string | null; yetkiSeviyesi: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      hesapId: z.string(), varlikId: z.string().nullable().optional(),
      kapsam: z.string().nullable().optional(),
      yetkiSeviyesi: z.enum(['okuma', 'yazma', 'yonetici']),
    }).parse(girdi);
    /* Kapsam HESAPTAN okunur: atama hesaba bağlıdır, santralini ondan
       alır. Kayıt okunması ayrıca "hesap bulunamadı"yı yabancı anahtar
       hatası yerine düzgün bir cümleye çevirir. */
    const hesap = await db.kimlikHesabi.findUnique({
      where: { id: v.hesapId }, select: { tesisId: true },
    });
    if (!hesap) throw new Error('Hesap bulunamadı');
    kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: hesap.tesisId },
      'Bu hesabın santrali kapsamınızda değil');
    const zatenVar = 'Bu hesabın aynı varlık ve kapsam için erişim ataması zaten var; '
      + 'ikinci satır açılmaz. Seviyeyi değiştirmek için erişim incelemesini kullanın.';
    const mevcut = await db.erisimAtamasi.findFirst({
      where: {
        hesapId: v.hesapId, varlikId: v.varlikId ?? null, kapsam: v.kapsam ?? null,
      },
      select: { id: true },
    });
    if (mevcut) return { ok: false, hata: zatenVar };
    let yeni;
    try {
      yeni = await db.erisimAtamasi.create({ data: {
        hesapId: v.hesapId, varlikId: v.varlikId ?? null,
        kapsam: v.kapsam ?? null, yetkiSeviyesi: v.yetkiSeviyesi } });
    } catch (e) {
      if (tekillikIhlali(e)) return { ok: false, hata: zatenVar };
      throw e;
    }
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
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = z.object({
      atamaId: z.string(),
      sonuc: z.enum(['onaylandi', 'kaldirilsin', 'degistirilsin']),
      not: z.string().nullable().optional(),
    }).parse(girdi);
    // Kapsam atamanın HESABINDAN gelir (atama → hesap → santral).
    const atama = await db.erisimAtamasi.findUnique({
      where: { id: v.atamaId }, select: { hesap: { select: { tesisId: true } } },
    });
    if (!atama) throw new Error('Erişim ataması bulunamadı');
    kapsamZorunlu(k, 'envanter', 'onay', { tesisId: atama.hesap.tesisId },
      'Bu atamanın santrali kapsamınızda değil');
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
