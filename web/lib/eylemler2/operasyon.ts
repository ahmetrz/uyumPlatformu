'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import { tamam, hata, iz, tarihAlani, bosluksuz, type Sonuc } from './ortak';

/* Operasyonel güvenlik eylemleri: OT kapılı değişiklik yönetimi (§19),
   olay (§20), yedekleme/restore (§12), tedarikçi/sözleşme/sertifika (§21-22). */

// ------------------------------------------------------------- değişiklik

const DEGISIKLIK_SIRASI = ['talep', 'onay', 'planlandi', 'uygulandi', 'dogrulandi'] as const;

export async function degisiklikKaydet(girdi: {
  id?: string; baslik: string; aciklama?: string | null; tesisId?: string | null;
  varlikEtiketi?: string | null; otMu: boolean; planTarihi?: string | null;
  saglayiciOnayi?: boolean | null; bakimPenceresi?: string | null;
  geriAlmaPlani?: string | null; onDegisiklikYedegi?: boolean | null;
  uretimEtkisi?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({
      id: z.string().optional(), baslik: bosluksuz('Başlık'),
      aciklama: z.string().nullable().optional(),
      tesisId: z.string().nullable().optional(),
      varlikEtiketi: z.string().nullable().optional(),
      otMu: z.boolean(), planTarihi: tarihAlani,
      saglayiciOnayi: z.boolean().nullable().optional(),
      bakimPenceresi: z.string().nullable().optional(),
      geriAlmaPlani: z.string().nullable().optional(),
      onDegisiklikYedegi: z.boolean().nullable().optional(),
      uretimEtkisi: z.string().nullable().optional(),
    }).parse(girdi);
    if (v.tesisId && !izinVar(k, 'envanter', 'yazma', { tesisId: v.tesisId }))
      return { ok: false, hata: 'Bu tesis kapsamında yetkiniz yok' };
    const veri = {
      baslik: v.baslik, aciklama: v.aciklama ?? null, tesisId: v.tesisId ?? null,
      varlikEtiketi: v.varlikEtiketi ?? null, otMu: v.otMu,
      planTarihi: v.planTarihi ?? null,
      saglayiciOnayi: v.saglayiciOnayi ?? null, bakimPenceresi: v.bakimPenceresi ?? null,
      geriAlmaPlani: v.geriAlmaPlani ?? null,
      onDegisiklikYedegi: v.onDegisiklikYedegi ?? null,
      uretimEtkisi: v.uretimEtkisi ?? null,
    };
    if (v.id) await db.degisiklik.update({ where: { id: v.id }, data: veri });
    else {
      const say = await db.degisiklik.count();
      const yeni = await db.degisiklik.create({ data: {
        ...veri, kod: `DGS-${String(say + 1).padStart(4, '0')}`, talepEdenId: k.id } });
      await iz({ aktorId: k.id, varlikTipi: 'Degisiklik', varlikId: yeni.id, eylem: 'olusturma' });
    }
    revalidatePath('/operasyon');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Aşama ilerletme: OT değişikliğinde EMNİYET KAPILARI zorunlu —
    onaysız/plansız OT değişikliği uygulanamaz, doğrulamasız kapanamaz. */
export async function degisiklikIlerlet(girdi: { id: string; sonDogrulama?: string | null }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const d = await db.degisiklik.findUniqueOrThrow({ where: { id: girdi.id } });
    const su = DEGISIKLIK_SIRASI.indexOf(d.durum as (typeof DEGISIKLIK_SIRASI)[number]);
    if (su < 0 || su === DEGISIKLIK_SIRASI.length - 1)
      return { ok: false, hata: 'Bu durumdan ilerlenemez' };
    const hedef = DEGISIKLIK_SIRASI[su + 1];

    if (hedef === 'onay' || hedef === 'planlandi') {
      if (!izinVar(k, 'envanter', 'onay'))
        return { ok: false, hata: 'Onay/planlama envanter onay yetkisi ister' };
    }
    if (d.otMu && hedef === 'planlandi') {
      const eksikler: string[] = [];
      if (d.saglayiciOnayi !== true) eksikler.push('sağlayıcı (vendor) onayı');
      if (!d.bakimPenceresi) eksikler.push('bakım penceresi');
      if (!d.geriAlmaPlani) eksikler.push('geri alma planı');
      if (d.onDegisiklikYedegi !== true) eksikler.push('değişiklik öncesi yedek');
      if (!d.uretimEtkisi) eksikler.push('üretim etkisi değerlendirmesi');
      if (eksikler.length > 0)
        return { ok: false, hata: `OT değişikliği planlanamaz — emniyet kapıları eksik: ${eksikler.join(', ')}` };
    }
    if (hedef === 'dogrulandi' && !girdi.sonDogrulama?.trim())
      return { ok: false, hata: 'Kapanış için değişiklik-sonrası doğrulama notu zorunlu' };

    await db.degisiklik.update({ where: { id: girdi.id }, data: {
      durum: hedef,
      ...(hedef === 'onay' ? { onaylayanId: k.id } : {}),
      ...(hedef === 'dogrulandi' ? { sonDogrulama: girdi.sonDogrulama } : {}),
    } });
    await iz({ aktorId: k.id, varlikTipi: 'Degisiklik', varlikId: d.id,
      eylem: 'durum_degisimi', alan: 'durum', once: d.durum, sonra: hedef,
      gerekce: hedef === 'dogrulandi' ? girdi.sonDogrulama : null });
    revalidatePath('/operasyon');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function degisiklikGeriAl(girdi: { id: string; gerekce: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay');
    const v = z.object({ id: z.string(), gerekce: bosluksuz('Gerekçe') }).parse(girdi);
    const d = await db.degisiklik.findUniqueOrThrow({ where: { id: v.id } });
    await db.degisiklik.update({ where: { id: v.id }, data: { durum: 'geri_alindi' } });
    await iz({ aktorId: k.id, varlikTipi: 'Degisiklik', varlikId: v.id,
      eylem: 'durum_degisimi', alan: 'durum', once: d.durum, sonra: 'geri_alindi',
      gerekce: v.gerekce });
    revalidatePath('/operasyon');
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------------ olay

export async function olayKaydet(girdi: {
  id?: string; baslik: string; tip?: string; tesisId?: string | null;
  siddet: string; durum?: string; ozet?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({
      id: z.string().optional(), baslik: bosluksuz('Başlık'),
      tip: z.enum(['olay', 'problem']).default('olay'),
      tesisId: z.string().nullable().optional(),
      siddet: z.enum(['dusuk', 'orta', 'yuksek', 'kritik']),
      durum: z.enum(['acik', 'mudahale', 'cozuldu', 'kapali']).optional(),
      ozet: z.string().nullable().optional(),
    }).parse(girdi);
    if (v.id) {
      const eski = await db.olay.findUniqueOrThrow({ where: { id: v.id } });
      await db.olay.update({ where: { id: v.id }, data: {
        baslik: v.baslik, tip: v.tip, tesisId: v.tesisId ?? null, siddet: v.siddet,
        durum: v.durum ?? eski.durum, ozet: v.ozet ?? null,
        cozum: v.durum === 'cozuldu' && eski.durum !== 'cozuldu' ? new Date() : eski.cozum } });
      if (v.durum && v.durum !== eski.durum)
        await iz({ aktorId: k.id, varlikTipi: 'Olay', varlikId: v.id,
          eylem: 'durum_degisimi', alan: 'durum', once: eski.durum, sonra: v.durum });
    } else {
      const say = await db.olay.count();
      const yeni = await db.olay.create({ data: {
        kod: `OLY-${String(say + 1).padStart(4, '0')}`, baslik: v.baslik, tip: v.tip,
        tesisId: v.tesisId ?? null, siddet: v.siddet, ozet: v.ozet ?? null } });
      await iz({ aktorId: k.id, varlikTipi: 'Olay', varlikId: yeni.id, eylem: 'olusturma' });
    }
    revalidatePath('/operasyon');
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------- yedekleme / test

export async function yedeklemePolitikasiKaydet(girdi: {
  id?: string; ad: string; kapsam?: string | null; siklik?: string | null;
  saklamaGun?: number | null; hedef?: string | null;
}): Promise<Sonuc> {
  try {
    await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({
      id: z.string().optional(), ad: bosluksuz('Ad'),
      kapsam: z.string().nullable().optional(), siklik: z.string().nullable().optional(),
      saklamaGun: z.coerce.number().int().positive().nullable().optional(),
      hedef: z.string().nullable().optional(),
    }).parse(girdi);
    const veri = { ad: v.ad, kapsam: v.kapsam ?? null, siklik: v.siklik ?? null,
      saklamaGun: v.saklamaGun ?? null, hedef: v.hedef ?? null };
    if (v.id) await db.yedeklemePolitikasi.update({ where: { id: v.id }, data: veri });
    else await db.yedeklemePolitikasi.create({ data: veri });
    revalidatePath('/operasyon');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function yedeklemeKosusuKaydet(girdi: {
  politikaId: string; durum: string; boyutMb?: number | null; hata?: string | null;
}): Promise<Sonuc> {
  try {
    await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({
      politikaId: z.string(), durum: z.enum(['basarili', 'basarisiz', 'kismi']),
      boyutMb: z.coerce.number().nullable().optional(), hata: z.string().nullable().optional(),
    }).parse(girdi);
    await db.yedeklemeKosusu.create({ data: {
      politikaId: v.politikaId, durum: v.durum,
      boyutMb: v.boyutMb ?? null, hata: v.hata ?? null } });
    revalidatePath('/operasyon');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Restore testi: yedeğin geri dönebildiğinin KANITI (§12). */
export async function restoreTestiKaydet(girdi: {
  kosuId: string; sonuc: string; sureDk?: number | null; not?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({
      kosuId: z.string(), sonuc: z.enum(['basarili', 'basarisiz']),
      sureDk: z.coerce.number().int().nullable().optional(),
      not: z.string().nullable().optional(),
    }).parse(girdi);
    const t = await db.geriYuklemeTesti.create({ data: {
      kosuId: v.kosuId, sonuc: v.sonuc, sureDk: v.sureDk ?? null, not: v.not ?? null } });
    await iz({ aktorId: k.id, varlikTipi: 'GeriYuklemeTesti', varlikId: t.id,
      eylem: 'olusturma', sonra: v.sonuc });
    revalidatePath('/operasyon');
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------- tedarikçi / sözleşme / sertifika

export async function tedarikciKaydet(girdi: {
  id?: string; ad: string; tip?: string | null;
  uzaktanErisimVar: boolean; kritiklik?: string;
  uzaktanErisimYontemi?: string | null;
  /** üç değerli: true kayıt var · false kayıt alınmıyor · null bilinmiyor */
  oturumKaydiVar?: boolean | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({
      id: z.string().optional(), ad: bosluksuz('Ad'),
      tip: z.string().nullable().optional(), uzaktanErisimVar: z.boolean(),
      kritiklik: z.string().default('bilinmiyor'),
      uzaktanErisimYontemi: z.string().nullable().optional(),
      oturumKaydiVar: z.boolean().nullable().optional(),
    }).parse(girdi);
    const veri = {
      ad: v.ad, tip: v.tip ?? null,
      uzaktanErisimVar: v.uzaktanErisimVar, kritiklik: v.kritiklik,
      // undefined geçilirse alan hiç yazılmaz; null bilerek "bilinmiyor" demektir.
      ...(v.uzaktanErisimYontemi !== undefined
        ? { uzaktanErisimYontemi: v.uzaktanErisimYontemi } : {}),
      ...(v.oturumKaydiVar !== undefined ? { oturumKaydiVar: v.oturumKaydiVar } : {}),
    };
    const onceki = v.id ? await db.tedarikci.findUnique({ where: { id: v.id } }) : null;
    const kayit = v.id
      ? await db.tedarikci.update({ where: { id: v.id }, data: veri })
      : await db.tedarikci.create({ data: veri });
    // Uzaktan erişim ve oturum kaydı bir uyum kontrolünün kanıtıdır;
    // değişimi denetim izine yazılmadan kabul edilemez.
    await iz({
      aktorId: k.id, varlikTipi: 'Tedarikci', varlikId: kayit.id,
      eylem: v.id ? 'guncelleme' : 'olusturma',
      alan: 'uzaktanErisim',
      once: onceki
        ? `${onceki.uzaktanErisimVar ? 'var' : 'yok'} · ${onceki.uzaktanErisimYontemi ?? 'yöntem yok'} · oturum kaydı ${onceki.oturumKaydiVar === null ? 'bilinmiyor' : onceki.oturumKaydiVar ? 'var' : 'yok'}`
        : null,
      sonra: `${kayit.uzaktanErisimVar ? 'var' : 'yok'} · ${kayit.uzaktanErisimYontemi ?? 'yöntem yok'} · oturum kaydı ${kayit.oturumKaydiVar === null ? 'bilinmiyor' : kayit.oturumKaydiVar ? 'var' : 'yok'}`,
    });
    revalidatePath('/operasyon');
    revalidatePath('/tedarikciler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function sertifikaKaydet(girdi: {
  id?: string; ad: string; varlikId?: string | null; veren?: string | null; bitis: string;
}): Promise<Sonuc> {
  try {
    await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({
      id: z.string().optional(), ad: bosluksuz('Ad'),
      varlikId: z.string().nullable().optional(),
      veren: z.string().nullable().optional(),
      bitis: z.string().min(1, 'Bitiş tarihi zorunlu'),
    }).parse(girdi);
    const bitis = new Date(v.bitis);
    /* durum bitiş tarihinden TÜRETİLİR; elle girilmez. Aksi hâlde yenilenen
       bir sertifika kayıtta 'suresi_doldu' kalıyordu. */
    const kalanGun = Math.floor((bitis.getTime() - Date.now()) / 86_400_000);
    const durum = kalanGun < 0 ? 'suresi_doldu' : kalanGun <= 30 ? 'yaklasiyor' : 'gecerli';
    const veri = { ad: v.ad, varlikId: v.varlikId ?? null,
      veren: v.veren ?? null, bitis, durum };
    if (v.id) await db.sertifika.update({ where: { id: v.id }, data: veri });
    else await db.sertifika.create({ data: veri });
    revalidatePath('/operasyon');
    revalidatePath('/tedarikciler');
    return tamam();
  } catch (e) { return hata(e); }
}
