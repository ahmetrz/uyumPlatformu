'use server';

/* Risk kütüğü eylemleri (§13): kayıt (upsert + otomatik skor), işlem tipi
   seçimi ve SÜRELİ + ONAYLI risk kabulü (§13.2). Skor kuralı: bilinmeyen
   (null) boyutlar hesaba katılmaz; hepsi bilinmiyorsa skor null kalır —
   bilinmeyen asla 0 sayılmaz. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import { RISK_DURUMLARI } from '../sabitler';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

const puan = z.number().int('Puan tam sayı olmalı')
  .min(1, 'Puan 1-5 aralığında olmalı').max(5, 'Puan 1-5 aralığında olmalı')
  .nullable().optional();

const RiskGirdisi = z.object({
  id: z.string().optional(),
  kod: bosluksuz('Kod'),
  baslik: bosluksuz('Başlık'),
  aciklama: bosluksuz('Açıklama'),
  kaynak: z.string().nullable().optional(),
  tesisId: z.string().nullable().optional(),
  sistemId: z.string().nullable().optional(),
  bulguId: z.string().nullable().optional(),
  sahipId: z.string().nullable().optional(),
  tehdit: z.string().nullable().optional(),
  zayiflik: z.string().nullable().optional(),
  mevcutKontroller: z.string().nullable().optional(),
  olasilik: puan,
  etkiUretim: puan, etkiEmniyet: puan, etkiRegulasyon: puan, etkiFinans: puan,
  etkiSiber: puan, etkiItibar: puan, etkiCevre: puan, etkiVeri: puan,
  durum: z.enum(RISK_DURUMLARI).optional(),
});

/** olasılık × max(etki boyutları) — null boyutlar dışarıda; hepsi null ise null. */
function skorHesapla(
  olasilik: number | null | undefined,
  etkiler: (number | null | undefined)[],
): number | null {
  const bilinen = etkiler.filter((e): e is number => e !== null && e !== undefined);
  if (olasilik === null || olasilik === undefined || bilinen.length === 0) return null;
  return olasilik * Math.max(...bilinen);
}

/** Risk oluştur/güncelle. Doğal ve artık risk skoru otomatik hesaplanır. */
export async function riskKaydet(girdi: {
  id?: string; kod: string; baslik: string; aciklama: string;
  kaynak?: string | null; tesisId?: string | null; sistemId?: string | null;
  bulguId?: string | null; sahipId?: string | null;
  tehdit?: string | null; zayiflik?: string | null; mevcutKontroller?: string | null;
  olasilik?: number | null;
  etkiUretim?: number | null; etkiEmniyet?: number | null; etkiRegulasyon?: number | null;
  etkiFinans?: number | null; etkiSiber?: number | null; etkiItibar?: number | null;
  etkiCevre?: number | null; etkiVeri?: number | null;
  durum?: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('risk', 'yazma');
    const v = RiskGirdisi.parse(girdi);
    if (v.tesisId && !izinVar(k, 'risk', 'yazma', { tesisId: v.tesisId }))
      throw new Error('Bu tesis kapsamında risk yazma yetkiniz yok');

    const skor = skorHesapla(v.olasilik, [
      v.etkiUretim, v.etkiEmniyet, v.etkiRegulasyon, v.etkiFinans,
      v.etkiSiber, v.etkiItibar, v.etkiCevre, v.etkiVeri,
    ]);
    const veri = {
      kod: v.kod, baslik: v.baslik, aciklama: v.aciklama,
      kaynak: v.kaynak ?? null, tesisId: v.tesisId ?? null,
      sistemId: v.sistemId ?? null, bulguId: v.bulguId ?? null,
      sahipId: v.sahipId ?? null, tehdit: v.tehdit ?? null,
      zayiflik: v.zayiflik ?? null, mevcutKontroller: v.mevcutKontroller ?? null,
      olasilik: v.olasilik ?? null,
      etkiUretim: v.etkiUretim ?? null, etkiEmniyet: v.etkiEmniyet ?? null,
      etkiRegulasyon: v.etkiRegulasyon ?? null, etkiFinans: v.etkiFinans ?? null,
      etkiSiber: v.etkiSiber ?? null, etkiItibar: v.etkiItibar ?? null,
      etkiCevre: v.etkiCevre ?? null, etkiVeri: v.etkiVeri ?? null,
      dogalRisk: skor, artikRisk: skor,
    };

    if (v.id) {
      const eski = await db.risk.findUnique({ where: { id: v.id } });
      if (!eski) throw new Error('Risk bulunamadı');
      if (eski.tesisId && !izinVar(k, 'risk', 'yazma', { tesisId: eski.tesisId }))
        throw new Error('Bu tesis kapsamında risk yazma yetkiniz yok');
      await db.risk.update({ where: { id: v.id }, data: { ...veri, durum: v.durum ?? eski.durum } });
      await iz({
        aktorId: k.id, varlikTipi: 'Risk', varlikId: v.id, eylem: 'guncelleme',
        alan: 'artikRisk',
        once: eski.artikRisk === null ? 'bilinmiyor' : String(eski.artikRisk),
        sonra: skor === null ? 'bilinmiyor' : String(skor),
      });
    } else {
      const yeni = await db.risk.create({ data: { ...veri, durum: v.durum ?? 'acik' } });
      await iz({
        aktorId: k.id, varlikTipi: 'Risk', varlikId: yeni.id,
        eylem: 'olusturma', sonra: yeni.kod,
      });
    }
    revalidatePath('/riskler');
    return tamam();
  } catch (e) { return hata(e); }
}

/** İşlem tipi seçimi (azalt / kaçın / devret) → risk işleme alınır.
    Kabul bu eylemden geçmez; riskKabul ayrı ve onay yetkisi ister. */
export async function riskIslem(girdi: {
  id: string; islemTipi: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('risk', 'yazma');
    const v = z.object({
      id: z.string(),
      islemTipi: z.enum(['azalt', 'kacin', 'devret'], 'Geçersiz işlem tipi'),
      // Gerekçe kabul yolunda zorunlu; azalt/kaçın/devret yolunda isteğe
      // bağlı ama verilirse denetim izine yazılır — karar kaydı eksik kalmasın.
      gerekce: z.string().trim().min(1).nullable().optional(),
    }).parse(girdi);
    const risk = await db.risk.findUnique({ where: { id: v.id } });
    if (!risk) throw new Error('Risk bulunamadı');
    if (risk.tesisId && !izinVar(k, 'risk', 'yazma', { tesisId: risk.tesisId }))
      throw new Error('Bu tesis kapsamında risk yazma yetkiniz yok');

    await db.risk.update({ where: { id: v.id }, data: {
      islemTipi: v.islemTipi, islemTarihi: new Date(),
      kabulBitis: null, onaylayanId: null, durum: 'islemde',
    } });
    await iz({
      aktorId: k.id, varlikTipi: 'Risk', varlikId: v.id, eylem: 'durum_degisimi',
      alan: 'islemTipi', once: risk.islemTipi, sonra: v.islemTipi,
      gerekce: v.gerekce ?? null,
    });
    revalidatePath('/riskler');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Risk kabulü (§13.2): SÜRELİ ve ONAYLI. Bitiş tarihi gelecekte olmak
    zorunda, gerekçe zorunlu; onaylayan = eylemi yapan (risk/onay yetkisi). */
export async function riskKabul(girdi: {
  id: string; kabulBitis: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('risk', 'onay');
    const v = z.object({
      id: z.string(),
      kabulBitis: z.string().min(1, 'Kabul bitiş tarihi zorunlu')
        .transform((s) => new Date(s))
        .refine((t) => !Number.isNaN(t.getTime()), 'Kabul bitiş tarihi geçersiz')
        .refine((t) => t.getTime() > Date.now(), 'Kabul bitiş tarihi gelecekte olmalı'),
      gerekce: bosluksuz('Gerekçe'),
    }).parse(girdi);
    const risk = await db.risk.findUnique({ where: { id: v.id } });
    if (!risk) throw new Error('Risk bulunamadı');
    if (risk.tesisId && !izinVar(k, 'risk', 'onay', { tesisId: risk.tesisId }))
      throw new Error('Bu tesis kapsamında risk kabul onayı yetkiniz yok');

    await db.risk.update({ where: { id: v.id }, data: {
      islemTipi: 'kabul', islemTarihi: new Date(), kabulBitis: v.kabulBitis,
      onaylayanId: k.id, durum: 'kabul_edildi',
    } });
    await iz({
      aktorId: k.id, varlikTipi: 'Risk', varlikId: v.id, eylem: 'onay',
      alan: 'durum', once: risk.durum, sonra: 'kabul_edildi', gerekce: v.gerekce,
    });
    revalidatePath('/riskler');
    return tamam();
  } catch (e) { return hata(e); }
}
