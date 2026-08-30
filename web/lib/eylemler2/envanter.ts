'use server';

/* IT/OT varlık envanteri (CMDB, §7.2) eylemleri: varlık upsert, varlık
   ilişkisi ekle/sil ve yaşam döngüsü geçişi. Bilinmeyen birinci sınıftır:
   boş metin null'a, durum alanları 'bilinmiyor'a düşer — asla 0/yok sayılmaz.
   Kalıp: yetkiZorunlu → zod → (kapsamlıysa izinVar) → db → iz → revalidatePath. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import { type Sonuc, tamam, hata, iz, tarihAlani, bosluksuz } from './ortak';

/* null = BİLİNMİYOR (§5.1): boş metin null'a çevrilir. */
const metin = z.string().trim().transform((s) => s || null).nullable().optional();
/* Boş seçim ('') → null: ilişki alanları için. */
const kimlik = z.string().trim().transform((s) => s || null).nullable().optional();

export type YasamDongusu = 'planlandi' | 'aktif' | 'bakim' | 'emekli' | 'imha';

const KRITIKLIKLER = ['dusuk', 'orta', 'yuksek', 'kritik', 'bilinmiyor'] as const;
const YAMA_DURUMLARI = ['guncel', 'eksik', 'yamasiz', 'bilinmiyor'] as const;
const VAR_YOK = ['var', 'yok', 'bilinmiyor'] as const;
const MARUZIYETLER = ['yok', 'sinirli', 'var', 'bilinmiyor'] as const;
const YASAM_DONGULERI = ['planlandi', 'aktif', 'bakim', 'emekli', 'imha'] as const;
const ILISKI_TIPLERI = ['depends_on', 'runs_on', 'connects_to', 'hosts', 'backs_up'] as const;

const VarlikSemasi = z.object({
  id: z.string().optional(),
  etiket: bosluksuz('Etiket'),
  ad: bosluksuz('Ad'),
  turId: bosluksuz('Tür'),
  tesisId: kimlik, uniteId: kimlik, sistemId: kimlik, bolgeId: kimlik,
  sahipId: kimlik, emanetciId: kimlik,
  hostname: metin, seriNo: metin, uretici: metin, model: metin,
  ipAdresi: metin, macAdresi: metin, isletimSistemi: metin,
  firmware: metin, surum: metin, rafOda: metin, kimlikDogrulama: metin,
  kritiklik: z.enum(KRITIKLIKLER, 'Geçersiz kritiklik').default('bilinmiyor'),
  yamaDurumu: z.enum(YAMA_DURUMLARI, 'Geçersiz yama durumu').default('bilinmiyor'),
  edrDurumu: z.enum(VAR_YOK, 'Geçersiz EDR durumu').default('bilinmiyor'),
  yedekDurumu: z.enum(VAR_YOK, 'Geçersiz yedek durumu').default('bilinmiyor'),
  izlemeDurumu: z.enum(VAR_YOK, 'Geçersiz izleme durumu').default('bilinmiyor'),
  logKaynagi: z.enum(VAR_YOK, 'Geçersiz log durumu').default('bilinmiyor'),
  internetMaruziyeti: z.enum(MARUZIYETLER, 'Geçersiz internet maruziyeti').default('bilinmiyor'),
  uzaktanErisim: z.boolean().nullable().optional(), // üç durumlu: null = bilinmiyor
  kurulumTarihi: tarihAlani, garantiBitis: tarihAlani,
  destekBitis: tarihAlani, eolTarihi: tarihAlani, eosTarihi: tarihAlani,
});

/** Varlık oluştur/güncelle (upsert). Etiket benzersizdir; tesis kapsamı denetlenir. */
export async function varlikKaydet(girdi: {
  id?: string; etiket: string; ad: string; turId: string;
  tesisId?: string | null; uniteId?: string | null; sistemId?: string | null;
  bolgeId?: string | null; sahipId?: string | null; emanetciId?: string | null;
  hostname?: string | null; seriNo?: string | null; uretici?: string | null;
  model?: string | null; ipAdresi?: string | null; macAdresi?: string | null;
  isletimSistemi?: string | null; firmware?: string | null; surum?: string | null;
  rafOda?: string | null; kimlikDogrulama?: string | null;
  kritiklik?: string; yamaDurumu?: string; edrDurumu?: string; yedekDurumu?: string;
  izlemeDurumu?: string; logKaynagi?: string; internetMaruziyeti?: string;
  uzaktanErisim?: boolean | null;
  kurulumTarihi?: string | null; garantiBitis?: string | null;
  destekBitis?: string | null; eolTarihi?: string | null; eosTarihi?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = VarlikSemasi.parse(girdi);
    if (v.tesisId && !izinVar(k, 'envanter', 'yazma', { tesisId: v.tesisId }))
      throw new Error('Bu tesis kapsamında envanter yazma yetkiniz yok');

    const ayniEtiket = await db.varlik.findUnique({ where: { etiket: v.etiket } });
    if (ayniEtiket && ayniEtiket.id !== v.id)
      throw new Error(`"${v.etiket}" etiketi başka bir varlıkta kullanılıyor`);

    const veri = {
      etiket: v.etiket, ad: v.ad, turId: v.turId,
      tesisId: v.tesisId ?? null, uniteId: v.uniteId ?? null,
      sistemId: v.sistemId ?? null, bolgeId: v.bolgeId ?? null,
      sahipId: v.sahipId ?? null, emanetciId: v.emanetciId ?? null,
      hostname: v.hostname ?? null, seriNo: v.seriNo ?? null,
      uretici: v.uretici ?? null, model: v.model ?? null,
      ipAdresi: v.ipAdresi ?? null, macAdresi: v.macAdresi ?? null,
      isletimSistemi: v.isletimSistemi ?? null, firmware: v.firmware ?? null,
      surum: v.surum ?? null, rafOda: v.rafOda ?? null,
      kimlikDogrulama: v.kimlikDogrulama ?? null,
      kritiklik: v.kritiklik, yamaDurumu: v.yamaDurumu, edrDurumu: v.edrDurumu,
      yedekDurumu: v.yedekDurumu, izlemeDurumu: v.izlemeDurumu,
      logKaynagi: v.logKaynagi, internetMaruziyeti: v.internetMaruziyeti,
      uzaktanErisim: v.uzaktanErisim ?? null,
      kurulumTarihi: v.kurulumTarihi ?? null, garantiBitis: v.garantiBitis ?? null,
      destekBitis: v.destekBitis ?? null, eolTarihi: v.eolTarihi ?? null,
      eosTarihi: v.eosTarihi ?? null,
    };

    if (v.id) {
      const eski = await db.varlik.findUnique({ where: { id: v.id } });
      if (!eski || eski.silindi) throw new Error('Varlık bulunamadı');
      if (eski.tesisId && !izinVar(k, 'envanter', 'yazma', { tesisId: eski.tesisId }))
        throw new Error('Bu tesis kapsamında envanter yazma yetkiniz yok');
      await db.varlik.update({ where: { id: v.id }, data: veri });
      await iz({
        aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.id,
        eylem: 'guncelleme', sonra: v.etiket,
      });
    } else {
      const yeni = await db.varlik.create({ data: veri });
      await iz({
        aktorId: k.id, varlikTipi: 'Varlik', varlikId: yeni.id,
        eylem: 'olusturma', sonra: yeni.etiket,
      });
    }
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Varlık ilişkisi ekle: kaynak → tip → hedef (ör. X depends_on Y). */
export async function iliskiEkle(girdi: {
  kaynakId: string; hedefId: string; tip: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({
      kaynakId: bosluksuz('Kaynak varlık'),
      hedefId: bosluksuz('Hedef varlık'),
      tip: z.enum(ILISKI_TIPLERI, 'Geçersiz ilişki tipi'),
    }).refine((g) => g.kaynakId !== g.hedefId, 'Varlık kendisiyle ilişkilendirilemez')
      .parse(girdi);

    const [kaynak, hedef] = await Promise.all([
      db.varlik.findUnique({ where: { id: v.kaynakId } }),
      db.varlik.findUnique({ where: { id: v.hedefId } }),
    ]);
    if (!kaynak || kaynak.silindi) throw new Error('Kaynak varlık bulunamadı');
    if (!hedef || hedef.silindi) throw new Error('Hedef varlık bulunamadı');
    if (kaynak.tesisId && !izinVar(k, 'envanter', 'yazma', { tesisId: kaynak.tesisId }))
      throw new Error('Bu tesis kapsamında envanter yazma yetkiniz yok');

    const mevcut = await db.varlikIliskisi.findUnique({
      where: { kaynakId_hedefId_tip: { kaynakId: v.kaynakId, hedefId: v.hedefId, tip: v.tip } },
    });
    if (mevcut) throw new Error('Bu ilişki zaten tanımlı');

    await db.varlikIliskisi.create({ data: { kaynakId: v.kaynakId, hedefId: v.hedefId, tip: v.tip } });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.kaynakId,
      eylem: 'iliski_ekleme', alan: v.tip, sonra: hedef.etiket,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Varlık ilişkisini kaldır. */
export async function iliskiSil(girdi: { id: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({ id: bosluksuz('İlişki') }).parse(girdi);
    const iliski = await db.varlikIliskisi.findUnique({
      where: { id: v.id }, include: { kaynak: true, hedef: true },
    });
    if (!iliski) throw new Error('İlişki bulunamadı');
    if (iliski.kaynak.tesisId && !izinVar(k, 'envanter', 'yazma', { tesisId: iliski.kaynak.tesisId }))
      throw new Error('Bu tesis kapsamında envanter yazma yetkiniz yok');

    await db.varlikIliskisi.delete({ where: { id: v.id } });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: iliski.kaynakId,
      eylem: 'iliski_silme', alan: iliski.tip, once: iliski.hedef.etiket,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Yaşam döngüsü geçişi. Emekli/imha DENETİMLİDİR: envanter/onay yetkisi
    ve gerekçe ister; diğer geçişler envanter/yazma ile yapılır. */
export async function varlikYasamDongusu(girdi: {
  id: string; yasamDongusu: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: bosluksuz('Varlık'),
      yasamDongusu: z.enum(YASAM_DONGULERI, 'Geçersiz yaşam döngüsü'),
      gerekce: metin,
    }).parse(girdi);

    const denetimli = v.yasamDongusu === 'emekli' || v.yasamDongusu === 'imha';
    const islem = denetimli ? 'onay' : 'yazma';
    const k = await yetkiZorunlu('envanter', islem);
    if (denetimli && !v.gerekce)
      throw new Error('Emekli/imha geçişi için gerekçe zorunlu');

    const eski = await db.varlik.findUnique({ where: { id: v.id } });
    if (!eski || eski.silindi) throw new Error('Varlık bulunamadı');
    if (eski.tesisId && !izinVar(k, 'envanter', islem, { tesisId: eski.tesisId }))
      throw new Error('Bu tesis kapsamında yetkiniz yok');
    if (eski.yasamDongusu === v.yasamDongusu) return tamam();

    await db.varlik.update({ where: { id: v.id }, data: { yasamDongusu: v.yasamDongusu } });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.id,
      eylem: denetimli ? 'onay' : 'durum_degisimi', alan: 'yasamDongusu',
      once: eski.yasamDongusu, sonra: v.yasamDongusu, gerekce: v.gerekce ?? null,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}
