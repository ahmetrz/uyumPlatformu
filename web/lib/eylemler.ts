'use server';

/* Tüm yazma eylemleri. Kimlik doğrulama bu fazda yok; aktivite kaydı
   aktörsüz (Sistem) düşer. Statik demo yayınında bu modülün yerine
   lib/eylemler.demo.ts geçer. */

import { revalidatePath } from 'next/cache';
import { db } from './db';
import {
  DurumSemasi, OnemSemasi, BulguDurumSemasi, SurecDurumSemasi,
  RolSemasi, DenklikSemasi,
} from './sabitler';
import { z } from 'zod';

type Sonuc = { ok: true } | { ok: false; hata: string };

const tamam = (): Sonuc => ({ ok: true });
const hata = (m: unknown): Sonuc => ({
  ok: false,
  hata: m instanceof z.ZodError
    ? m.issues.map((i) => i.message).join(' · ')
    : m instanceof Error ? m.message : 'Beklenmeyen hata',
});

async function iz(veri: {
  varlikTipi: string; varlikId: string; eylem: string;
  alan?: string; once?: string | null; sonra?: string | null; dosyaAdi?: string;
}) {
  await db.aktiviteKaydi.create({ data: {
    varlikTipi: veri.varlikTipi, varlikId: veri.varlikId, eylem: veri.eylem,
    alan: veri.alan ?? null, oncekiDeger: veri.once ?? null,
    yeniDeger: veri.sonra ?? null, dosyaAdi: veri.dosyaAdi ?? null,
  } });
}

const tarih = z.string().transform((s) => (s ? new Date(s) : null)).nullable().optional();
const bosluksuz = (ad: string) => z.string().trim().min(1, `${ad} boş olamaz`);

// ---------------------------------------------------------------- tanımlar

export async function sektorKaydet(girdi: { id?: string; kod: string; ad: string }): Promise<Sonuc> {
  try {
    const v = z.object({ id: z.string().optional(), kod: bosluksuz('Kod'), ad: bosluksuz('Ad') }).parse(girdi);
    if (v.id) await db.sektor.update({ where: { id: v.id }, data: { kod: v.kod, ad: v.ad } });
    else await db.sektor.create({ data: { kod: v.kod, ad: v.ad } });
    revalidatePath('/tanimlar');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function tesisTipiKaydet(girdi: {
  id?: string; kod: string; ad: string; sektorId?: string | null; sira?: number;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: z.string().optional(), kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
      sektorId: z.string().nullable().optional(), sira: z.coerce.number().int().default(0),
    }).parse(girdi);
    const veri = { kod: v.kod, ad: v.ad, sektorId: v.sektorId ?? null, sira: v.sira };
    if (v.id) await db.tesisTipi.update({ where: { id: v.id }, data: veri });
    else await db.tesisTipi.create({ data: veri });
    revalidatePath('/tanimlar');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function tesisKaydet(girdi: {
  id?: string; kod: string; ad: string; tipId?: string | null;
  kuruluGucMw?: number | null; konum?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: z.string().optional(), kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
      tipId: z.string().nullable().optional(),
      kuruluGucMw: z.coerce.number().positive().nullable().optional(),
      konum: z.string().nullable().optional(),
    }).parse(girdi);
    const veri = {
      kod: v.kod, ad: v.ad, tipId: v.tipId ?? null,
      kuruluGucMw: v.kuruluGucMw ?? null, konum: v.konum ?? null,
    };
    if (v.id) await db.tesis.update({ where: { id: v.id }, data: veri });
    else {
      const yeni = await db.tesis.create({ data: veri });
      await iz({ varlikTipi: 'Tesis', varlikId: yeni.id, eylem: 'olusturma' });
    }
    revalidatePath('/tanimlar');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Santral kapanışı (satış vb.): tesis kapalıya çekilir, süreç kapsamındaki
    kayıtları tarihçe olarak kalır. */
export async function tesisKapat(girdi: { id: string; neden: string }): Promise<Sonuc> {
  try {
    const v = z.object({ id: z.string(), neden: bosluksuz('Neden') }).parse(girdi);
    await db.tesis.update({ where: { id: v.id }, data: {
      durum: 'kapali', kapanisTarihi: new Date(), kapanisNedeni: v.neden } });
    await iz({ varlikTipi: 'Tesis', varlikId: v.id, eylem: 'guncelleme',
      alan: 'durum', once: 'aktif', sonra: `kapali (${v.neden})` });
    revalidatePath('/tanimlar'); revalidatePath('/');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function tesisAc(girdi: { id: string }): Promise<Sonuc> {
  try {
    await db.tesis.update({ where: { id: girdi.id }, data: {
      durum: 'aktif', kapanisTarihi: null, kapanisNedeni: null } });
    await iz({ varlikTipi: 'Tesis', varlikId: girdi.id, eylem: 'guncelleme',
      alan: 'durum', once: 'kapali', sonra: 'aktif' });
    revalidatePath('/tanimlar');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function regulasyonKaydet(girdi: {
  id?: string; kod: string; ad: string; surum?: string | null; kaynakUrl?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: z.string().optional(), kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
      surum: z.string().nullable().optional(), kaynakUrl: z.string().nullable().optional(),
    }).parse(girdi);
    const veri = { kod: v.kod, ad: v.ad, surum: v.surum ?? null, kaynakUrl: v.kaynakUrl ?? null };
    if (v.id) await db.regulasyon.update({ where: { id: v.id }, data: veri });
    else {
      const yeni = await db.regulasyon.create({ data: veri });
      await iz({ varlikTipi: 'Regulasyon', varlikId: yeni.id, eylem: 'olusturma' });
    }
    revalidatePath('/tanimlar'); revalidatePath('/regulasyonlar');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function alanKaydet(girdi: {
  id?: string; kod: string; ad: string; aciklama?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: z.string().optional(), kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
      aciklama: z.string().nullable().optional(),
    }).parse(girdi);
    const veri = { kod: v.kod, ad: v.ad, aciklama: v.aciklama ?? null };
    if (v.id) await db.kapsamAlani.update({ where: { id: v.id }, data: veri });
    else await db.kapsamAlani.create({ data: veri });
    revalidatePath('/tanimlar');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Madde ↔ kapsam alanı eşleştirmesini topluca günceller. */
export async function maddeAlanAta(girdi: { maddeId: string; alanIdler: string[] }): Promise<Sonuc> {
  try {
    await db.maddeAlan.deleteMany({ where: { maddeId: girdi.maddeId } });
    for (const alanId of girdi.alanIdler)
      await db.maddeAlan.create({ data: { maddeId: girdi.maddeId, alanId } });
    await iz({ varlikTipi: 'Madde', varlikId: girdi.maddeId, eylem: 'guncelleme',
      alan: 'alanlar', sonra: `${girdi.alanIdler.length} alan` });
    revalidatePath('/regulasyonlar'); revalidatePath('/maddeler');
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------------ süreç

export async function surecKaydet(girdi: {
  id?: string; kod: string; ad: string; regulasyonId: string;
  baslangic?: string | null; bitis?: string | null; aciklama?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: z.string().optional(), kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
      regulasyonId: z.string().min(1, 'Regülasyon seçin'),
      baslangic: tarih, bitis: tarih, aciklama: z.string().nullable().optional(),
    }).parse(girdi);
    const veri = {
      kod: v.kod, ad: v.ad, regulasyonId: v.regulasyonId,
      baslangic: v.baslangic ?? null, bitis: v.bitis ?? null, aciklama: v.aciklama ?? null,
    };
    if (v.id) await db.uyumSureci.update({ where: { id: v.id }, data: veri });
    else {
      const yeni = await db.uyumSureci.create({ data: veri });
      await iz({ varlikTipi: 'UyumSureci', varlikId: yeni.id, eylem: 'olusturma' });
    }
    revalidatePath('/surecler'); revalidatePath('/');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function surecDurumDegistir(girdi: { id: string; durum: string }): Promise<Sonuc> {
  try {
    const v = z.object({ id: z.string(), durum: SurecDurumSemasi }).parse(girdi);
    const eski = await db.uyumSureci.findUniqueOrThrow({ where: { id: v.id } });
    await db.uyumSureci.update({ where: { id: v.id }, data: { durum: v.durum } });
    await iz({ varlikTipi: 'UyumSureci', varlikId: v.id, eylem: 'durum_degisimi',
      alan: 'durum', once: eski.durum, sonra: v.durum });
    revalidatePath('/surecler'); revalidatePath('/');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Kapsama tesis ekler; regülasyonun yaprak maddeleri için durum kayıtlarını açar. */
export async function surecKapsamEkle(girdi: { surecId: string; tesisId: string }): Promise<Sonuc> {
  try {
    const surec = await db.uyumSureci.findUniqueOrThrow({
      where: { id: girdi.surecId }, include: { regulasyon: true } });
    await db.surecKapsami.create({ data: { surecId: girdi.surecId, tesisId: girdi.tesisId } });
    const yapraklar = await db.madde.findMany({
      where: { regulasyonId: surec.regulasyonId, altMaddeler: { none: {} } },
      select: { id: true },
    });
    for (const m of yapraklar)
      await db.maddeDurumu.upsert({
        where: { surecId_maddeId_tesisId: {
          surecId: girdi.surecId, maddeId: m.id, tesisId: girdi.tesisId } },
        update: {},
        create: { surecId: girdi.surecId, maddeId: m.id, tesisId: girdi.tesisId },
      });
    await iz({ varlikTipi: 'UyumSureci', varlikId: girdi.surecId, eylem: 'kapsam_degisimi',
      alan: 'kapsam', sonra: `tesis eklendi (${yapraklar.length} madde açıldı)` });
    revalidatePath('/surecler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function surecKapsamCikar(girdi: { surecId: string; tesisId: string }): Promise<Sonuc> {
  try {
    await db.surecKapsami.delete({ where: { surecId_tesisId: {
      surecId: girdi.surecId, tesisId: girdi.tesisId } } });
    await iz({ varlikTipi: 'UyumSureci', varlikId: girdi.surecId, eylem: 'kapsam_degisimi',
      alan: 'kapsam', sonra: 'tesis çıkarıldı (durum kayıtları tarihçede)' });
    revalidatePath('/surecler');
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------ durum/bulgu

export async function maddeDurumGuncelle(girdi: {
  id: string; durum: string; not?: string | null; sorumluId?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: z.string(), durum: DurumSemasi,
      not: z.string().nullable().optional(), sorumluId: z.string().nullable().optional(),
    }).parse(girdi);
    const eski = await db.maddeDurumu.findUniqueOrThrow({ where: { id: v.id } });
    await db.maddeDurumu.update({ where: { id: v.id }, data: {
      durum: v.durum, not: v.not ?? eski.not,
      sorumluId: v.sorumluId === undefined ? eski.sorumluId : v.sorumluId,
      sonDegerlendirme: new Date(),
    } });
    if (eski.durum !== v.durum)
      await iz({ varlikTipi: 'MaddeDurumu', varlikId: v.id, eylem: 'durum_degisimi',
        alan: 'durum', once: eski.durum, sonra: v.durum });
    revalidatePath('/surecler'); revalidatePath('/maddeler'); revalidatePath('/');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function bulguOlustur(girdi: {
  maddeDurumuId: string; baslik: string; aciklama: string;
  onemDerecesi: string; hedefTarih?: string | null; sorumluId?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      maddeDurumuId: z.string(), baslik: bosluksuz('Başlık'), aciklama: bosluksuz('Açıklama'),
      onemDerecesi: OnemSemasi, hedefTarih: tarih, sorumluId: z.string().nullable().optional(),
    }).parse(girdi);
    const yeni = await db.bulgu.create({ data: {
      maddeDurumuId: v.maddeDurumuId, baslik: v.baslik, aciklama: v.aciklama,
      onemDerecesi: v.onemDerecesi, hedefTarih: v.hedefTarih ?? null,
      sorumluId: v.sorumluId ?? null,
    } });
    await iz({ varlikTipi: 'Bulgu', varlikId: yeni.id, eylem: 'olusturma' });
    revalidatePath('/bulgular'); revalidatePath('/');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function bulguGuncelle(girdi: {
  id: string; durum?: string; onemDerecesi?: string;
  hedefTarih?: string | null; sorumluId?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: z.string(), durum: BulguDurumSemasi.optional(), onemDerecesi: OnemSemasi.optional(),
      hedefTarih: tarih, sorumluId: z.string().nullable().optional(),
    }).parse(girdi);
    const eski = await db.bulgu.findUniqueOrThrow({ where: { id: v.id } });
    await db.bulgu.update({ where: { id: v.id }, data: {
      durum: v.durum ?? eski.durum,
      onemDerecesi: v.onemDerecesi ?? eski.onemDerecesi,
      hedefTarih: v.hedefTarih === undefined ? eski.hedefTarih : v.hedefTarih,
      sorumluId: v.sorumluId === undefined ? eski.sorumluId : v.sorumluId,
      kapanmaTarihi: v.durum === 'kapali' && eski.durum !== 'kapali' ? new Date() : eski.kapanmaTarihi,
    } });
    if (v.durum && v.durum !== eski.durum)
      await iz({ varlikTipi: 'Bulgu', varlikId: v.id, eylem: 'durum_degisimi',
        alan: 'durum', once: eski.durum, sonra: v.durum });
    if (v.onemDerecesi && v.onemDerecesi !== eski.onemDerecesi)
      await iz({ varlikTipi: 'Bulgu', varlikId: v.id, eylem: 'guncelleme',
        alan: 'onemDerecesi', once: eski.onemDerecesi, sonra: v.onemDerecesi });
    revalidatePath('/bulgular'); revalidatePath('/');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function aksiyonEkle(girdi: {
  bulguId: string; baslik: string; sorumluId?: string | null; hedef?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      bulguId: z.string(), baslik: bosluksuz('Başlık'),
      sorumluId: z.string().nullable().optional(), hedef: tarih,
    }).parse(girdi);
    const yeni = await db.aksiyon.create({ data: {
      bulguId: v.bulguId, baslik: v.baslik, sorumluId: v.sorumluId ?? null,
      baslangic: new Date(), hedef: v.hedef ?? null,
    } });
    await iz({ varlikTipi: 'Aksiyon', varlikId: yeni.id, eylem: 'olusturma' });
    revalidatePath('/bulgular');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function aksiyonDurumDegistir(girdi: { id: string; durum: string }): Promise<Sonuc> {
  try {
    const v = z.object({ id: z.string(), durum: z.enum(['planlandi', 'devam', 'tamamlandi', 'iptal']) }).parse(girdi);
    const eski = await db.aksiyon.findUniqueOrThrow({ where: { id: v.id } });
    await db.aksiyon.update({ where: { id: v.id }, data: {
      durum: v.durum, tamamlanma: v.durum === 'tamamlandi' ? new Date() : null } });
    await iz({ varlikTipi: 'Aksiyon', varlikId: v.id, eylem: 'durum_degisimi',
      alan: 'durum', once: eski.durum, sonra: v.durum });
    revalidatePath('/bulgular');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function kanitEkle(girdi: {
  maddeDurumuId: string; ad: string; tip: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      maddeDurumuId: z.string(), ad: bosluksuz('Ad'),
      tip: z.enum(['politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor']),
    }).parse(girdi);
    const kanit = await db.kanit.create({ data: { ad: v.ad, tip: v.tip } });
    await db.kanitBaglantisi.create({ data: {
      kanitId: kanit.id, maddeDurumuId: v.maddeDurumuId } });
    await iz({ varlikTipi: 'MaddeDurumu', varlikId: v.maddeDurumuId,
      eylem: 'dosya_ekleme', dosyaAdi: v.ad });
    revalidatePath('/maddeler'); revalidatePath('/surecler');
    return tamam();
  } catch (e) { return hata(e); }
}

// -------------------------------------------------------------- eşleştirme

export async function eslestirmeEkle(girdi: {
  kaynakId: string; hedefId: string; denklik: string; aciklama?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      kaynakId: z.string().min(1, 'Kaynak madde seçin'),
      hedefId: z.string().min(1, 'Hedef madde seçin'),
      denklik: DenklikSemasi, aciklama: z.string().nullable().optional(),
    }).parse(girdi);
    if (v.kaynakId === v.hedefId) return { ok: false, hata: 'Madde kendisiyle eşleştirilemez' };
    await db.maddeEslestirmesi.create({ data: {
      kaynakId: v.kaynakId, hedefId: v.hedefId,
      denklik: v.denklik, aciklama: v.aciklama ?? null } });
    revalidatePath('/eslestirme');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function eslestirmeSil(girdi: { id: string }): Promise<Sonuc> {
  try {
    await db.maddeEslestirmesi.delete({ where: { id: girdi.id } });
    revalidatePath('/eslestirme');
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------------ proje

export async function projeKaydet(girdi: {
  id?: string; kod: string; ad: string; aciklama?: string | null;
  durum?: string; hedef?: string | null; sahipId?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: z.string().optional(), kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
      aciklama: z.string().nullable().optional(),
      durum: z.enum(['planlandi', 'devam', 'tamamlandi', 'beklemede']).optional(),
      hedef: tarih, sahipId: z.string().nullable().optional(),
    }).parse(girdi);
    const veri = {
      kod: v.kod, ad: v.ad, aciklama: v.aciklama ?? null,
      durum: v.durum ?? 'planlandi', hedef: v.hedef ?? null, sahipId: v.sahipId ?? null,
    };
    if (v.id) await db.proje.update({ where: { id: v.id }, data: veri });
    else {
      const yeni = await db.proje.create({ data: { ...veri, baslangic: new Date() } });
      await iz({ varlikTipi: 'Proje', varlikId: yeni.id, eylem: 'olusturma' });
    }
    revalidatePath('/projeler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function projeBaglantiEkle(girdi: {
  projeId: string; maddeId?: string | null; bulguId?: string | null;
}): Promise<Sonuc> {
  try {
    if (!girdi.maddeId && !girdi.bulguId) return { ok: false, hata: 'Madde veya bulgu seçin' };
    await db.projeBaglantisi.create({ data: {
      projeId: girdi.projeId, maddeId: girdi.maddeId ?? null, bulguId: girdi.bulguId ?? null } });
    revalidatePath('/projeler'); revalidatePath('/eslestirme');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function projeBaglantiSil(girdi: { id: string }): Promise<Sonuc> {
  try {
    await db.projeBaglantisi.delete({ where: { id: girdi.id } });
    revalidatePath('/projeler'); revalidatePath('/eslestirme');
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------ yetki/kullanıcı

export async function kullaniciKaydet(girdi: {
  id?: string; eposta: string; adSoyad: string; unvan?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: z.string().optional(), eposta: z.string().email('Geçerli e-posta girin'),
      adSoyad: bosluksuz('Ad soyad'), unvan: z.string().nullable().optional(),
    }).parse(girdi);
    const veri = { eposta: v.eposta, adSoyad: v.adSoyad, unvan: v.unvan ?? null };
    if (v.id) await db.kullanici.update({ where: { id: v.id }, data: veri });
    else await db.kullanici.create({ data: veri });
    revalidatePath('/yetkiler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function yetkiVer(girdi: {
  kullaniciId: string; surecId?: string | null; tesisId?: string | null; rol: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      kullaniciId: z.string().min(1, 'Kullanıcı seçin'),
      surecId: z.string().nullable().optional(), tesisId: z.string().nullable().optional(),
      rol: RolSemasi,
    }).parse(girdi);
    const yeni = await db.yetki.create({ data: {
      kullaniciId: v.kullaniciId, surecId: v.surecId ?? null,
      tesisId: v.tesisId ?? null, rol: v.rol } });
    await iz({ varlikTipi: 'Yetki', varlikId: yeni.id, eylem: 'olusturma',
      alan: 'rol', sonra: v.rol });
    revalidatePath('/yetkiler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function yetkiSil(girdi: { id: string }): Promise<Sonuc> {
  try {
    await db.yetki.delete({ where: { id: girdi.id } });
    await iz({ varlikTipi: 'Yetki', varlikId: girdi.id, eylem: 'silme' });
    revalidatePath('/yetkiler');
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------ içe aktarım

/** Excel/CSV satırlarını doğrulayıp ONAY KUYRUĞUNA yazar; hiçbir madde
    doğrudan yayına girmez (otomasyon-öncelikli akışın insan onayı adımı). */
export async function aktarimYukle(form: FormData): Promise<Sonuc> {
  try {
    const dosya = form.get('dosya') as File | null;
    const regulasyonId = String(form.get('regulasyonId') ?? '');
    if (!dosya || !regulasyonId) return { ok: false, hata: 'Dosya ve regülasyon gerekli' };

    const XLSX = await import('xlsx');
    const buf = Buffer.from(await dosya.arrayBuffer());
    const kitap = XLSX.read(buf, { type: 'buffer' });
    const sayfa = kitap.Sheets[kitap.SheetNames[0]];
    const ham = XLSX.utils.sheet_to_json<Record<string, unknown>>(sayfa, { defval: '' });

    const alanlar = await db.kapsamAlani.findMany({ where: { aktif: true } });
    const alanKodlari = new Set(alanlar.map((a) => a.kod.toUpperCase()));
    const reg = await db.regulasyon.findUniqueOrThrow({ where: { id: regulasyonId } });
    const mevcut = new Map((await db.madde.findMany({
      where: { regulasyonId }, select: { kod: true } })).map((m) => [m.kod, true]));

    const satirlar: unknown[] = [];
    const elenenler: { satir: number; sebep: string }[] = [];
    const gorulen = new Set<string>();

    ham.forEach((s, i) => {
      const no = i + 2; // başlık satırı
      const kod = String(s['madde_kodu'] ?? '').trim();
      const baslik = String(s['baslik'] ?? '').trim();
      const metin = String(s['metin'] ?? '').trim();
      const alanHam = String(s['alan'] ?? '').trim();
      if (!kod || !baslik) { elenenler.push({ satir: no, sebep: 'madde_kodu veya baslik boş' }); return; }
      if (gorulen.has(kod)) { elenenler.push({ satir: no, sebep: `madde_kodu tekrarı (${kod})` }); return; }
      gorulen.add(kod);
      const alanKodlariSatir = alanHam.split(/[;,/+]/).map((a) => a.trim().toUpperCase()).filter(Boolean);
      const gecerli = alanKodlariSatir.filter((a) => alanKodlari.has(a));
      if (gecerli.length === 0) {
        elenenler.push({ satir: no, sebep: `alan kolonu tanımlı bir kapsam alanıyla eşleşmiyor (${alanHam || 'boş'})` });
        return;
      }
      const tamKod = kod.startsWith(reg.kod) ? kod : `${reg.kod}-${kod}`;
      satirlar.push({
        kod: tamKod, baslik, metin,
        ustKod: String(s['ust_madde_kodu'] ?? '').trim() || null,
        kanitTipi: String(s['kanit_tipi'] ?? '').trim() || null,
        alanlar: gecerli,
        islem: mevcut.has(tamKod) ? 'guncelleme' : 'yeni',
      });
    });

    await db.iceAktarim.create({ data: {
      regulasyonId, kaynakTipi: 'excel', kaynakAdi: dosya.name,
      okunan: ham.length, elenen: elenenler.length,
      raporJson: JSON.stringify({ satirlar, elenenler }),
    } });
    revalidatePath('/ice-aktarim');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Onay: kuyruğa alınmış satırlar maddelere upsert edilir, alanlar eşleştirilir. */
export async function aktarimOnayla(girdi: { id: string }): Promise<Sonuc> {
  try {
    const kayit = await db.iceAktarim.findUniqueOrThrow({
      where: { id: girdi.id }, include: { regulasyon: true } });
    if (kayit.durum !== 'dogrulama_bekliyor') return { ok: false, hata: 'Kayıt onay beklemiyor' };
    const rapor = JSON.parse(kayit.raporJson ?? '{}') as {
      satirlar?: { kod: string; baslik: string; metin: string; ustKod: string | null;
        kanitTipi: string | null; alanlar: string[]; islem: string }[];
    };
    const alanlar = await db.kapsamAlani.findMany();
    const alanIdx = new Map(alanlar.map((a) => [a.kod.toUpperCase(), a.id]));
    let eklenen = 0, guncellenen = 0;

    for (const s of rapor.satirlar ?? []) {
      let ustId: string | null = null;
      if (s.ustKod) {
        const ustTam = s.ustKod.startsWith(kayit.regulasyon.kod)
          ? s.ustKod : `${kayit.regulasyon.kod}-${s.ustKod}`;
        ustId = (await db.madde.findUnique({ where: { regulasyonId_kod: {
          regulasyonId: kayit.regulasyonId, kod: ustTam } } }))?.id ?? null;
      }
      const madde = await db.madde.upsert({
        where: { regulasyonId_kod: { regulasyonId: kayit.regulasyonId, kod: s.kod } },
        update: { baslik: s.baslik, metin: s.metin, ustMaddeId: ustId, kanitTipi: s.kanitTipi },
        create: {
          regulasyonId: kayit.regulasyonId, kod: s.kod, baslik: s.baslik,
          metin: s.metin, ustMaddeId: ustId, kanitTipi: s.kanitTipi,
        },
      });
      if (s.islem === 'yeni') eklenen++; else guncellenen++;
      await db.maddeAlan.deleteMany({ where: { maddeId: madde.id } });
      for (const a of s.alanlar) {
        const alanId = alanIdx.get(a.toUpperCase());
        if (alanId) await db.maddeAlan.create({ data: { maddeId: madde.id, alanId } });
      }
    }
    await db.iceAktarim.update({ where: { id: girdi.id }, data: {
      durum: 'onaylandi', eklenen, guncellenen } });
    await iz({ varlikTipi: 'IceAktarim', varlikId: girdi.id, eylem: 'guncelleme',
      alan: 'durum', once: 'dogrulama_bekliyor', sonra: `onaylandi (+${eklenen} / ~${guncellenen})`,
      dosyaAdi: kayit.kaynakAdi });
    revalidatePath('/ice-aktarim'); revalidatePath('/regulasyonlar');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function aktarimReddet(girdi: { id: string }): Promise<Sonuc> {
  try {
    await db.iceAktarim.update({ where: { id: girdi.id }, data: { durum: 'reddedildi' } });
    await iz({ varlikTipi: 'IceAktarim', varlikId: girdi.id, eylem: 'guncelleme',
      alan: 'durum', once: 'dogrulama_bekliyor', sonra: 'reddedildi' });
    revalidatePath('/ice-aktarim');
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------- madde (manuel yönetim)

/** Maddeler yalnızca içe aktarımdan gelmez; panelden de eklenir/düzenlenir. */
export async function maddeKaydet(girdi: {
  id?: string; regulasyonId: string; kod: string; baslik: string; metin: string;
  ustMaddeId?: string | null; kanitTipi?: string | null; alanIdler?: string[];
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: z.string().optional(), regulasyonId: z.string().min(1, 'Regülasyon seçin'),
      kod: bosluksuz('Kod'), baslik: bosluksuz('Başlık'), metin: bosluksuz('Metin'),
      ustMaddeId: z.string().nullable().optional(), kanitTipi: z.string().nullable().optional(),
      alanIdler: z.array(z.string()).optional(),
    }).parse(girdi);
    const veri = {
      regulasyonId: v.regulasyonId, kod: v.kod, baslik: v.baslik, metin: v.metin,
      ustMaddeId: v.ustMaddeId ?? null, kanitTipi: v.kanitTipi ?? null,
    };
    let maddeId: string;
    if (v.id) {
      await db.madde.update({ where: { id: v.id }, data: veri });
      maddeId = v.id;
    } else {
      const yeni = await db.madde.create({ data: veri });
      maddeId = yeni.id;
      await iz({ varlikTipi: 'Madde', varlikId: maddeId, eylem: 'olusturma' });
    }
    if (v.alanIdler) {
      await db.maddeAlan.deleteMany({ where: { maddeId } });
      for (const alanId of v.alanIdler)
        await db.maddeAlan.create({ data: { maddeId, alanId } });
    }
    revalidatePath('/regulasyonlar'); revalidatePath('/maddeler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function maddeSil(girdi: { id: string }): Promise<Sonuc> {
  try {
    const altSayisi = await db.madde.count({ where: { ustMaddeId: girdi.id } });
    if (altSayisi > 0) return { ok: false, hata: 'Önce alt maddeleri silin veya taşıyın' };
    await db.madde.delete({ where: { id: girdi.id } });
    await iz({ varlikTipi: 'Madde', varlikId: girdi.id, eylem: 'silme' });
    revalidatePath('/regulasyonlar');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function regulasyonAktifDegistir(girdi: { id: string; aktif: boolean }): Promise<Sonuc> {
  try {
    await db.regulasyon.update({ where: { id: girdi.id }, data: { aktif: girdi.aktif } });
    await iz({ varlikTipi: 'Regulasyon', varlikId: girdi.id, eylem: 'guncelleme',
      alan: 'aktif', sonra: girdi.aktif ? 'aktif' : 'pasif' });
    revalidatePath('/tanimlar'); revalidatePath('/regulasyonlar');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function kullaniciAktifDegistir(girdi: { id: string; aktif: boolean }): Promise<Sonuc> {
  try {
    await db.kullanici.update({ where: { id: girdi.id }, data: { aktif: girdi.aktif } });
    revalidatePath('/yetkiler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function tanimSil(girdi: {
  tur: 'sektor' | 'tesisTipi' | 'alan'; id: string;
}): Promise<Sonuc> {
  try {
    if (girdi.tur === 'sektor') {
      if (await db.tesisTipi.count({ where: { sektorId: girdi.id } }))
        return { ok: false, hata: 'Sektöre bağlı tesis tipleri var' };
      await db.sektor.delete({ where: { id: girdi.id } });
    } else if (girdi.tur === 'tesisTipi') {
      if (await db.tesis.count({ where: { tipId: girdi.id } }))
        return { ok: false, hata: 'Tipe bağlı tesisler var' };
      await db.tesisTipi.delete({ where: { id: girdi.id } });
    } else {
      await db.kapsamAlani.delete({ where: { id: girdi.id } });
    }
    revalidatePath('/tanimlar');
    return tamam();
  } catch (e) { return hata(e); }
}
