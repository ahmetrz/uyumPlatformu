'use server';

/* Santral 360 eylemleri: tesis profili (uygulanabilirlik motorunun girdisi),
   kapsam yeniden hesaplama ve onaylı uygulanabilirlik override'ı.
   Kalıp: her eylem yetkiZorunlu → zod → db → iz → revalidatePath → Sonuc. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { tesisKapsaminiHesapla } from '../motorlar/uygulanabilirlik';
import { type Sonuc, tamam, hata, iz, tarihAlani, bosluksuz } from './ortak';

/* null = BİLİNMİYOR (§5.1): boş metin null'a çevrilir, boolean üç durumludur. */
const metin = z.string().trim().transform((s) => s || null).nullable().optional();
const ucDurum = z.boolean().nullable().optional();

const ProfilSemasi = z.object({
  tesisId: bosluksuz('Tesis'),
  lisansTipi: metin,
  lisansNo: metin,
  kabulDurumu: z.enum(['gecici_kabul', 'kesin_kabul', 'insaat', 'lisans_oncesi']).nullable().optional(),
  kabulTarihi: tarihAlani,
  blackStart: ucDurum,
  teiasScadaEms: ucDurum,
  seriHaberlesme: ucDurum,
  kritiklikSinifi: z.enum(['dusuk', 'orta', 'yuksek', 'kritik']).nullable().optional(),
  kritikAltyapiStatusu: ucDurum,
  internetMaruziyeti: z.enum(['yok', 'sinirli', 'var']).nullable().optional(),
  uzaktanErisim: ucDurum,
  otMimariTipi: z.enum(['dcs', 'scada', 'plc_scada', 'hibrit']).nullable().optional(),
  dcsSaglayici: metin,
  scadaSaglayici: metin,
  plcAileleri: metin,
  iotVar: ucDurum,
  akilliSayacVar: ucDurum,
  yerelAdVar: ucDurum,
  yerelVeriMerkeziVar: ucDurum,
  grupOrtakServisler: metin,
});

type ProfilGirdisi = z.input<typeof ProfilSemasi>;

/** Tesis profili upsert — null gönderilen alan "bilinmiyor" olarak saklanır. */
export async function profilKaydet(girdi: ProfilGirdisi): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma', { tesisId: girdi.tesisId });
    const v = ProfilSemasi.parse(girdi);
    const veri = {
      lisansTipi: v.lisansTipi ?? null,
      lisansNo: v.lisansNo ?? null,
      kabulDurumu: v.kabulDurumu ?? null,
      kabulTarihi: v.kabulTarihi ?? null,
      blackStart: v.blackStart ?? null,
      teiasScadaEms: v.teiasScadaEms ?? null,
      seriHaberlesme: v.seriHaberlesme ?? null,
      kritiklikSinifi: v.kritiklikSinifi ?? null,
      kritikAltyapiStatusu: v.kritikAltyapiStatusu ?? null,
      internetMaruziyeti: v.internetMaruziyeti ?? null,
      uzaktanErisim: v.uzaktanErisim ?? null,
      otMimariTipi: v.otMimariTipi ?? null,
      dcsSaglayici: v.dcsSaglayici ?? null,
      scadaSaglayici: v.scadaSaglayici ?? null,
      plcAileleri: v.plcAileleri ?? null,
      iotVar: v.iotVar ?? null,
      akilliSayacVar: v.akilliSayacVar ?? null,
      yerelAdVar: v.yerelAdVar ?? null,
      yerelVeriMerkeziVar: v.yerelVeriMerkeziVar ?? null,
      grupOrtakServisler: v.grupOrtakServisler ?? null,
    };
    const onceki = await db.tesisProfili.findUnique({ where: { tesisId: v.tesisId } });
    await db.tesisProfili.upsert({
      where: { tesisId: v.tesisId },
      update: veri,
      create: { tesisId: v.tesisId, ...veri },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'TesisProfili', varlikId: v.tesisId,
      eylem: onceki ? 'guncelleme' : 'olusturma', alan: 'profil',
    });
    revalidatePath(`/tesisler/${v.tesisId}`); revalidatePath('/tesisler');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Uygulanabilirlik motorunu bu tesis için koşturur.
    Override'lı (el ile değiştirilmiş) kararlara motor dokunmaz. */
export async function kapsamYenidenHesapla(girdi: { tesisId: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma', { tesisId: girdi.tesisId });
    const v = z.object({ tesisId: bosluksuz('Tesis') }).parse(girdi);
    await tesisKapsaminiHesapla(v.tesisId, k.id); // motor kendi iz kayıtlarını düşer
    revalidatePath(`/tesisler/${v.tesisId}`); revalidatePath('/tesisler');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Kapsam kararını el ile değiştirir — GEREKÇE ZORUNLU, onay yetkisi ister.
    elIleDegistirildi=true işaretlenir; motor bu kararı bir daha ezmez. */
export async function uygulanabilirlikOverride(girdi: {
  tesisId: string; regulasyonId: string; uygulanabilir: boolean; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'onay', { tesisId: girdi.tesisId });
    const v = z.object({
      tesisId: bosluksuz('Tesis'), regulasyonId: bosluksuz('Regülasyon'),
      uygulanabilir: z.boolean(),
      gerekce: z.string().trim().min(10, 'Gerekçe zorunlu (en az 10 karakter)'),
    }).parse(girdi);
    const anahtar = { tesisId: v.tesisId, regulasyonId: v.regulasyonId };
    const onceki = await db.uygulanabilirlikKarari.findUnique({
      where: { tesisId_regulasyonId: anahtar } });
    const karar = await db.uygulanabilirlikKarari.upsert({
      where: { tesisId_regulasyonId: anahtar },
      update: {
        uygulanabilir: v.uygulanabilir, elIleDegistirildi: true,
        degistirmeGerekcesi: v.gerekce, onaylayanId: k.id, hesaplandi: new Date(),
      },
      create: {
        ...anahtar, uygulanabilir: v.uygulanabilir, gerekce: v.gerekce,
        elIleDegistirildi: true, degistirmeGerekcesi: v.gerekce, onaylayanId: k.id,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'UygulanabilirlikKarari', varlikId: karar.id,
      eylem: 'onay', alan: 'uygulanabilirlik',
      once: onceki ? (onceki.uygulanabilir ? 'kapsamda' : 'kapsam dışı') : null,
      sonra: v.uygulanabilir ? 'kapsamda (el ile)' : 'kapsam dışı (el ile)',
      gerekce: v.gerekce,
    });
    revalidatePath(`/tesisler/${v.tesisId}`); revalidatePath('/tesisler');
    return tamam();
  } catch (e) { return hata(e); }
}
