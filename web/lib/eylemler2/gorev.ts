'use server';

/* Görev ve onay merkezi eylemleri: manuel görev açma, görev durum değişimi
   (sahiplik: sorumlu ya da uyum onay yetkisi) ve onay taleplerinin karara
   bağlanması. Onay kararı yonetim/onay VEYA talebin ilgili modülünde onay
   yetkisi ister; red gerekçesiz verilemez; her karar iz bırakır. Karar kaydı
   kaynak kaydı otomatik DEĞİŞTİRMEZ — uygulama ilgili modülün sorumluluğudur. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar, type Modul } from '../erisim';
import { GOREV_TIP_ETIKET } from '../sabitler';
import type { AktifKullanici } from '../auth';
import { tamam, hata, iz, bosluksuz, tarihAlani, type Sonuc } from './ortak';

const GOREV_DURUMLARI = ['acik', 'yapiliyor', 'tamamlandi', 'iptal'] as const;

/* Onay talebi tipi → kararın dayandığı modül (yonetim/onay her tipe yeter). */
const ONAY_TIP_MODUL: Record<string, Modul> = {
  bulgu_kapanis: 'uyum', risk_kabul: 'risk', istisna: 'uyum',
  proje_aday: 'proje', applicability_override: 'uyum', proje_kapanis: 'proje',
};

function tazele() {
  revalidatePath('/gorevler');
  revalidatePath('/'); // ana panodaki açık görev / bekleyen onay sayaçları
}

// ------------------------------------------------------------ manuel görev

const GorevGirdisi = z.object({
  baslik: bosluksuz('Başlık'),
  tip: bosluksuz('Tip').refine((t) => t in GOREV_TIP_ETIKET, 'Geçersiz görev tipi'),
  sorumluId: z.string().nullable().optional(),
  tesisId: z.string().nullable().optional(),
  sonTarih: tarihAlani,
});

/** Elle görev açar (otomatikUretildi=false). Tesise bağlı görevde o tesis
    kapsamında uyum yazma yetkisi aranır. */
export async function gorevOlustur(girdi: {
  baslik: string; tip: string; sorumluId?: string | null;
  tesisId?: string | null; sonTarih?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma');
    const v = GorevGirdisi.parse(girdi);
    if (v.tesisId && !izinVar(k, 'uyum', 'yazma', { tesisId: v.tesisId }))
      throw new Error('Bu tesis kapsamında görev açma yetkiniz yok');
    if (v.sorumluId) {
      const sorumlu = await db.kullanici.findUnique({ where: { id: v.sorumluId } });
      if (!sorumlu || !sorumlu.aktif) throw new Error('Seçilen sorumlu bulunamadı ya da pasif');
    }
    if (v.tesisId && !(await db.tesis.findUnique({ where: { id: v.tesisId } })))
      throw new Error('Seçilen tesis bulunamadı');

    const yeni = await db.gorev.create({ data: {
      baslik: v.baslik, tip: v.tip,
      sorumluId: v.sorumluId || null, tesisId: v.tesisId || null,
      sonTarih: v.sonTarih ?? null, otomatikUretildi: false,
    } });
    await iz({ aktorId: k.id, varlikTipi: 'Gorev', varlikId: yeni.id,
      eylem: 'olusturma', sonra: v.baslik });
    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------ görev durumu

/** Görev durum değişimi: uyum/yazma yeterli; sorumlusu atanmış görevi yalnız
    sorumlusu ya da uyum onay yetkisi olan değiştirir. 'tamamlandi' kapanış
    damgası basar; yeniden açılış damgayı siler. */
export async function gorevDurum(girdi: { id: string; durum: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma');
    const v = z.object({
      id: z.string(),
      durum: z.enum(GOREV_DURUMLARI, 'Geçersiz görev durumu'),
    }).parse(girdi);
    const g = await db.gorev.findUnique({ where: { id: v.id } });
    if (!g) throw new Error('Görev bulunamadı');
    if (g.durum === v.durum) return tamam();
    if (g.sorumluId && g.sorumluId !== k.id
      && !izinVar(k, 'uyum', 'onay', g.tesisId ? { tesisId: g.tesisId } : {}))
      throw new Error('Bu görevi yalnız sorumlusu ya da uyum onay yetkisi olan kapatabilir');

    await db.gorev.update({ where: { id: v.id }, data: {
      durum: v.durum,
      kapanis: v.durum === 'tamamlandi' || v.durum === 'iptal' ? new Date() : null,
    } });
    await iz({ aktorId: k.id, varlikTipi: 'Gorev', varlikId: v.id,
      eylem: 'durum_degisimi', alan: 'durum', once: g.durum, sonra: v.durum });
    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------- onay kararı

const OnayKararGirdisi = z.object({
  id: z.string(),
  karar: z.enum(['onaylandi', 'reddedildi'], 'Geçersiz karar'),
  gerekce: z.string().nullable().optional(),
}).refine((g) => g.karar !== 'reddedildi' || !!g.gerekce?.trim(),
  { message: 'Red kararı gerekçesiz verilemez' });

/** Bekleyen onay talebini karara bağlar. Yetki: yonetim/onay VEYA talebin
    tipine karşılık gelen modülde onay. Dört göz ilkesi: talebi açan kendi
    talebini karara bağlayamaz. */
export async function onayKarar(girdi: {
  id: string; karar: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const v = OnayKararGirdisi.parse(girdi);
    const talep = await db.onayTalebi.findUnique({ where: { id: v.id } });
    if (!talep) throw new Error('Onay talebi bulunamadı');

    const modul = ONAY_TIP_MODUL[talep.tip] ?? 'yonetim';
    let k: AktifKullanici;
    try {
      k = await yetkiZorunlu('yonetim', 'onay');
    } catch (e) {
      // yonetim/onay yoksa ilgili modülün onay yetkisi de kabul edilir;
      // oturum/demo hataları olduğu gibi yükselir.
      if (e instanceof Error && e.message.startsWith('Bu işlem için yetkiniz yok'))
        k = await yetkiZorunlu(modul, 'onay');
      else throw e;
    }

    if (talep.durum !== 'bekliyor') throw new Error('Bu talep zaten karara bağlanmış');
    if (talep.talepEdenId === k.id)
      throw new Error('Dört göz ilkesi: kendi açtığınız talebi siz karara bağlayamazsınız');

    await db.onayTalebi.update({ where: { id: v.id }, data: {
      durum: v.karar, gerekce: v.gerekce?.trim() || null,
      onaylayanId: k.id, kapanis: new Date(),
    } });
    await iz({ aktorId: k.id, varlikTipi: 'OnayTalebi', varlikId: v.id,
      eylem: v.karar === 'onaylandi' ? 'onay' : 'red',
      alan: 'durum', once: 'bekliyor', sonra: v.karar,
      gerekce: v.gerekce?.trim() || null });
    await onayYanEtkisi(talep, v.karar, k.id);
    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}


/* Onay kararlarının tip bazlı yan etkileri. Şimdilik: istisna (§50) —
   onaylanınca istisna aktifleşir ve ilgili madde durumu 'kapsamdisi' olur;
   süre bitiminde deadline motoru yeniden değerlendirme açar. */
async function onayYanEtkisi(
  talep: { tip: string; kaynakTipi: string; kaynakId: string },
  karar: string, aktorId: string,
): Promise<void> {
  if (talep.tip !== 'istisna' || talep.kaynakTipi !== 'Istisna') return;
  const istisna = await db.istisna.findUnique({ where: { id: talep.kaynakId } });
  if (!istisna || istisna.durum !== 'onay_bekliyor') return;

  if (karar !== 'onaylandi') {
    await db.istisna.update({ where: { id: istisna.id },
      data: { durum: 'reddedildi' } });
    return;
  }
  await db.istisna.update({ where: { id: istisna.id },
    data: { durum: 'aktif', onaylayanId: aktorId } });
  const durumlar = await db.maddeDurumu.findMany({ where: {
    maddeId: istisna.maddeId, tesisId: istisna.tesisId } });
  for (const d of durumlar) {
    if (d.durum === 'kapsamdisi') continue;
    await db.degerlendirmeTarihcesi.create({ data: {
      maddeDurumuId: d.id, eskiDurum: d.durum, yeniDurum: 'kapsamdisi',
      gerekce: `İstisna onayı: ${istisna.gerekce}`, aktorId } });
    await db.maddeDurumu.update({ where: { id: d.id },
      data: { durum: 'kapsamdisi' } });
    await iz({ aktorId, varlikTipi: 'MaddeDurumu', varlikId: d.id,
      eylem: 'durum_degisimi', alan: 'durum', once: d.durum, sonra: 'kapsamdisi',
      gerekce: `İstisna ${istisna.id} onaylandı (bitiş: ${istisna.bitis.toISOString().slice(0, 10)})` });
  }
}
