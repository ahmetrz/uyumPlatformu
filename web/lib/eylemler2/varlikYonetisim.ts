'use server';

/* ═══ Varlık yönetişimi eylemleri ══════════════════════════════════════
   OT-05 · OT-08 · OT-09 · OT-16 · OT-17 · OT-28 · OT-33

   Kalıp `envanter.ts` ve `varlikDurusu.ts` ile aynıdır ve ondan sapılmaz:
     yetkiZorunlu(KAPSAM_SONRA) → zod → kayıt oku → kapsamZorunlu →
     db → iz → revalidatePath

   ── HANGİ MODÜL, NEDEN ─────────────────────────────────────────────────
   Tek bir VARLIĞA dokunan her şey `envanter`; bir SINIFI ya da kütüğü
   tanımlayan her şey `tanimlar`. Proses adımı, ekip ve OUI kütüğü
   kütüktür (`tanimlar/onay`); etki değerlendirmesi, keşif yetki kararı,
   konfigürasyon onayı ve hesap tipi tek kayda dokunur (`envanter`).

   Konfigürasyon TABANI ve keşif YETKİ kararı `onay` ister: ikisi de
   sonradan "böyle olması gerekiyordu" diye okunacak kararlardır. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import { EKIP_TIPLERI, UYELIK_ROLLERI } from '../varlik/sahiplik';
import { ETKI_DUZEYLERI } from '../varlik/etki';
import { YETKI_DURUMLARI, kararGecerliMi } from '../varlik/kesifYetkisi';
import { SAPMA_DURUMLARI, SIDDETLER, kararGerekceIster } from '../varlik/konfigDrift';
import { HESAP_KAYNAK_TIPLERI } from '../varlik/hesapTipi';
import { macKanonik, ouiOnEki, protokolKodu } from '../varlik/otGozlem';
import { type Sonuc, tamam, hata, iz, tarihAlani, bosluksuz } from './ortak';

const metin = z.string().trim().transform((s) => s || null).nullable().optional();
const gerekceAlani = z.string().trim().min(10, 'Gerekçe en az 10 karakter olmalı');
const sayiYaNull = z.number().finite().nullable().optional();

/** Varlığı okur ve tesis kapsamını dayatır. */
async function varligiAlVeKapsamiDayat(
  k: Awaited<ReturnType<typeof yetkiZorunlu>>,
  varlikId: string, islem: 'yazma' | 'onay', mesaj: string,
) {
  const v = await db.varlik.findUnique({
    where: { id: varlikId },
    select: { id: true, etiket: true, tesisId: true, silindi: true },
  });
  if (!v || v.silindi) throw new Error('Varlık bulunamadı');
  kapsamZorunlu(k, 'envanter', islem, { tesisId: v.tesisId }, mesaj);
  return v;
}

/* ══ OT-05 · İş süreci ve proses adımı ════════════════════════════════ */

/**
 * İş sürecinin kendisi — adımların taşıyıcısı.
 *
 * Adım yazılabilen ama süreç yazılamayan bir ürün, ilk süreci seed'den
 * gelen iki kayda mahkûm ederdi; santralin kendi üretim zincirini
 * tanımlaması imkânsız olurdu.
 */
export async function isSureciKaydet(girdi: unknown): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'onay', KAPSAM_SONRA);
    const v = z.object({
      id: z.string().optional(),
      kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
      tesisId: z.string().trim().transform((s) => s || null).nullable().optional(),
      uretimEtkisi: z.enum(ETKI_DUZEYLERI).default('bilinmiyor'),
    }).parse(girdi);

    if (v.tesisId) {
      const t = await db.tesis.findUnique({ where: { id: v.tesisId }, select: { id: true } });
      if (!t) return hata(new Error('Seçilen santral bulunamadı'));
    }
    kapsamZorunlu(k, 'tanimlar', 'onay', { tesisId: v.tesisId ?? null },
      'Bu tesis kapsamında iş süreci tanımlama yetkiniz yok');
    /* Süreci BAŞKA bir santrale taşımak da bir kapsam kararıdır: eski
       santralin kapsamı sorulmazsa, A'ya yetkili biri B'nin sürecini
       kendine çekebilirdi. */
    if (v.id) {
      const eski = await db.isSureci.findUnique({
        where: { id: v.id }, select: { tesisId: true },
      });
      if (!eski) return hata(new Error('İş süreci bulunamadı'));
      kapsamZorunlu(k, 'tanimlar', 'onay', { tesisId: eski.tesisId },
        'Bu sürecin bugünkü santral kapsamında düzenleme yetkiniz yok');
    }

    const veri = {
      ad: v.ad, tesisId: v.tesisId ?? null, uretimEtkisi: v.uretimEtkisi,
    };
    const kayit = v.id
      ? await db.isSureci.update({ where: { id: v.id }, data: veri })
      : await db.isSureci.create({ data: { kod: v.kod, ...veri } });

    await iz({
      aktorId: k.id, varlikTipi: 'IsSureci', varlikId: kayit.id,
      eylem: v.id ? 'guncelleme' : 'olusturma', alan: 'kod', sonra: v.kod,
    });
    revalidatePath('/prosesler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function prosesAdimiKaydet(girdi: unknown): Promise<Sonuc> {
  try {
    /* İKİ AŞAMALI KAPI: adım bir SÜRECE, süreç de bir santrale bağlıdır.
       Ön kapı kapsamsız sorulur (`KAPSAM_SONRA`), gerçek kapsam süreç
       okunduktan sonra dayatılır. Tek aşamalı kapsamsız bir kapı,
       santral ekibinin KENDİ sürecine adım yazmasını engellerdi. */
    const k = await yetkiZorunlu('tanimlar', 'onay', KAPSAM_SONRA);
    const v = z.object({
      id: z.string().optional(),
      surecId: bosluksuz('Süreç'),
      kod: bosluksuz('Kod'),
      ad: bosluksuz('Ad'),
      sira: z.number().int().min(1, 'Sıra 1 ya da daha büyük olmalı'),
      aciklama: metin,
      rtoSaat: sayiYaNull, rpoSaat: sayiYaNull,
      uretimEtkisi: z.enum(ETKI_DUZEYLERI).default('bilinmiyor'),
    }).parse(girdi);

    const surec = await db.isSureci.findUnique({
      where: { id: v.surecId }, select: { id: true, tesisId: true },
    });
    if (!surec) return hata(new Error('İş süreci bulunamadı'));
    kapsamZorunlu(k, 'tanimlar', 'onay', { tesisId: surec.tesisId },
      'Bu tesis kapsamında proses adımı tanımlama yetkiniz yok');

    /* Sıra süreç içinde TEKİLDİR (şemadaki `@@unique`); çakışmayı burada
       anlamlı bir mesajla yakalıyoruz, yoksa kullanıcı ham kısıt hatası
       görürdü. */
    const cakisan = await db.prosesAdimi.findFirst({
      where: { surecId: v.surecId, sira: v.sira, ...(v.id ? { NOT: { id: v.id } } : {}) },
      select: { kod: true },
    });
    if (cakisan) {
      return hata(new Error(`${v.sira}. sıra "${cakisan.kod}" adımında kullanılıyor.`));
    }

    const veri = {
      surecId: v.surecId, kod: v.kod, ad: v.ad, sira: v.sira,
      aciklama: v.aciklama ?? null,
      rtoSaat: v.rtoSaat ?? null, rpoSaat: v.rpoSaat ?? null,
      uretimEtkisi: v.uretimEtkisi,
    };
    const kayit = v.id
      ? await db.prosesAdimi.update({ where: { id: v.id }, data: veri })
      : await db.prosesAdimi.create({ data: veri });

    await iz({
      aktorId: k.id, varlikTipi: 'ProsesAdimi', varlikId: kayit.id,
      eylem: v.id ? 'guncelleme' : 'olusturma', alan: 'kod', sonra: v.kod,
    });
    revalidatePath('/prosesler');
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

const ADIM_ROLLERI = ['kontrol', 'olcum', 'iletisim', 'kayit', 'emniyet', 'diger'] as const;

export async function adimVarligiAta(girdi: unknown): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      adimId: bosluksuz('Adım'),
      varlikId: bosluksuz('Varlık'),
      rol: z.enum(ADIM_ROLLERI).default('diger'),
      /* Üç durumlu: null = DEĞERLENDİRİLMEDİ. `false` varsayılanı,
         değerlendirilmemiş bir bağı "tek nokta değil" saymak olurdu. */
      tekNokta: z.boolean().nullable().optional(),
      yedekli: z.boolean().nullable().optional(),
      aciklama: metin,
    }).parse(girdi);

    await varligiAlVeKapsamiDayat(k, v.varlikId, 'yazma',
      'Bu tesis kapsamında varlık düzenleme yetkiniz yok');
    const adim = await db.prosesAdimi.findUnique({
      where: { id: v.adimId }, select: { id: true, kod: true },
    });
    if (!adim) return hata(new Error('Proses adımı bulunamadı'));

    await db.adimVarligi.upsert({
      where: { adimId_varlikId_rol: { adimId: v.adimId, varlikId: v.varlikId, rol: v.rol } },
      create: {
        adimId: v.adimId, varlikId: v.varlikId, rol: v.rol,
        tekNokta: v.tekNokta ?? null, yedekli: v.yedekli ?? null,
        aciklama: v.aciklama ?? null,
      },
      update: {
        tekNokta: v.tekNokta ?? null, yedekli: v.yedekli ?? null,
        aciklama: v.aciklama ?? null,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId, eylem: 'guncelleme',
      alan: `prosesAdimi:${adim.kod}`, sonra: v.rol,
    });
    revalidatePath('/envanter');
    revalidatePath('/prosesler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function adimVarligiKaldir(girdi: {
  bagId: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({ bagId: bosluksuz('Bağ') }).parse(girdi);
    const bag = await db.adimVarligi.findUnique({
      where: { id: v.bagId },
      select: { varlikId: true, rol: true, adim: { select: { kod: true } } },
    });
    if (!bag) return hata(new Error('Bağ bulunamadı'));
    await varligiAlVeKapsamiDayat(k, bag.varlikId, 'yazma',
      'Bu tesis kapsamında varlık düzenleme yetkiniz yok');

    await db.adimVarligi.delete({ where: { id: v.bagId } });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: bag.varlikId, eylem: 'guncelleme',
      alan: `prosesAdimi:${bag.adim.kod}`, once: bag.rol, sonra: null,
    });
    revalidatePath('/envanter');
    revalidatePath('/prosesler');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ══ OT-08 · Etki değerlendirmesi ═════════════════════════════════════ */

const KAYIP_TIPLERI = ['tam', 'kismi', 'yok', 'bilinmiyor'] as const;
const ETKI_SIDDETLERI = ['yok', 'dusuk', 'orta', 'yuksek', 'bilinmiyor'] as const;

export async function etkiDegerlendirmesiKaydet(girdi: unknown): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'),
      /* MW kaybı NEGATİF olamaz ve `null` = hesaplanmadı. Sıfır geçerli
         bir ölçümdür ("bu cihaz durursa üretim etkilenmez") ve
         hesaplanmamışlıkla karıştırılmaz. */
      uretimKaybiMw: z.number().finite().min(0, 'Üretim kaybı negatif olamaz').nullable().optional(),
      kayipTipi: z.enum(KAYIP_TIPLERI).default('bilinmiyor'),
      rtoSaat: z.number().finite().min(0).nullable().optional(),
      rpoSaat: z.number().finite().min(0).nullable().optional(),
      emniyetEtkisi: z.enum(ETKI_SIDDETLERI).default('bilinmiyor'),
      cevreEtkisi: z.enum(ETKI_SIDDETLERI).default('bilinmiyor'),
      gerekce: metin,
    }).parse(girdi);

    await varligiAlVeKapsamiDayat(k, v.varlikId, 'yazma',
      'Bu tesis kapsamında etki değerlendirmesi yetkiniz yok');

    /* Sayı yazan değerlendirme GEREKÇE İSTER: gerekçesiz bir "12,5 MW"
       denetimde savunulamaz ve nereden geldiği sorulduğunda cevap kalmaz. */
    if (typeof v.uretimKaybiMw === 'number' && !(v.gerekce && v.gerekce.length >= 10)) {
      return hata(new Error('Üretim kaybı sayısı en az 10 karakterlik gerekçe ister.'));
    }

    const eski = await db.etkiDegerlendirmesi.findUnique({
      where: { varlikId: v.varlikId }, select: { uretimKaybiMw: true },
    });
    const veri = {
      uretimKaybiMw: v.uretimKaybiMw ?? null, kayipTipi: v.kayipTipi,
      rtoSaat: v.rtoSaat ?? null, rpoSaat: v.rpoSaat ?? null,
      emniyetEtkisi: v.emniyetEtkisi, cevreEtkisi: v.cevreEtkisi,
      gerekce: v.gerekce ?? null, degerlendirenId: k.id,
    };
    await db.etkiDegerlendirmesi.upsert({
      where: { varlikId: v.varlikId },
      create: { varlikId: v.varlikId, ...veri },
      update: { ...veri, zaman: new Date() },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId, eylem: 'guncelleme',
      alan: 'etkiDegerlendirmesi',
      once: eski?.uretimKaybiMw === null || eski === null ? null : String(eski.uretimKaybiMw),
      sonra: v.uretimKaybiMw === null || v.uretimKaybiMw === undefined
        ? 'hesaplanmadı' : String(v.uretimKaybiMw),
      gerekce: v.gerekce ?? null,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ══ OT-09 · Ekip ve sahiplik ═════════════════════════════════════════ */

export async function ekipKaydet(girdi: unknown): Promise<Sonuc> {
  try {
    /* İKİ AŞAMALI KAPI: ekip bir santrale bağlı OLABİLİR ve o zaman
       kapsam kararı ekibin santraline aittir. Santralsiz (kurumsal) ekip
       için `kapsamZorunlu` null kapsamı zaten doğru değerlendirir. */
    const k = await yetkiZorunlu('tanimlar', 'onay', KAPSAM_SONRA);
    const v = z.object({
      id: z.string().optional(),
      kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
      tip: z.enum(EKIP_TIPLERI).default('diger'),
      tesisId: z.string().trim().transform((s) => s || null).nullable().optional(),
      eposta: metin,
      aktif: z.boolean().default(true),
    }).parse(girdi);

    if (v.tesisId) {
      const t = await db.tesis.findUnique({ where: { id: v.tesisId }, select: { id: true } });
      if (!t) return hata(new Error('Seçilen santral bulunamadı'));
    }
    kapsamZorunlu(k, 'tanimlar', 'onay', { tesisId: v.tesisId ?? null },
      'Bu tesis kapsamında ekip tanımlama yetkiniz yok');
    /* Ekibi BAŞKA bir santrale taşımak da bir kapsam kararıdır: eski
       santralin kapsamı da sorulmazsa, A santraline yetkili biri B'nin
       ekibini kendine çekebilirdi. */
    if (v.id) {
      const eski = await db.ekip.findUnique({
        where: { id: v.id }, select: { tesisId: true },
      });
      if (!eski) return hata(new Error('Ekip bulunamadı'));
      kapsamZorunlu(k, 'tanimlar', 'onay', { tesisId: eski.tesisId },
        'Bu ekibin bugünkü santral kapsamında düzenleme yetkiniz yok');
    }
    const veri = {
      ad: v.ad, tip: v.tip, tesisId: v.tesisId ?? null,
      eposta: v.eposta ?? null, aktif: v.aktif,
    };
    const kayit = v.id
      ? await db.ekip.update({ where: { id: v.id }, data: veri })
      : await db.ekip.create({ data: { kod: v.kod, ...veri } });

    await iz({
      aktorId: k.id, varlikTipi: 'Ekip', varlikId: kayit.id,
      eylem: v.id ? 'guncelleme' : 'olusturma', alan: 'kod', sonra: v.kod,
    });
    revalidatePath('/yetkiler');
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function ekipUyeligiKaydet(girdi: {
  ekipId: string; kullaniciId: string; rol: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'onay');
    const v = z.object({
      ekipId: bosluksuz('Ekip'), kullaniciId: bosluksuz('Kullanıcı'),
      rol: z.enum(UYELIK_ROLLERI).default('uye'),
    }).parse(girdi);

    const [ekip, kullanici] = await Promise.all([
      db.ekip.findUnique({ where: { id: v.ekipId }, select: { id: true, kod: true } }),
      db.kullanici.findUnique({ where: { id: v.kullaniciId }, select: { id: true, aktif: true } }),
    ]);
    if (!ekip) return hata(new Error('Ekip bulunamadı'));
    if (!kullanici) return hata(new Error('Kullanıcı bulunamadı'));
    /* PASİF kullanıcı ekibe eklenemez: pasif bir üye, ekibin "aktif üyesi
       var" görünmesine yol açar ve sahiplik zinciri sahte biçimde sağlam
       okunur. */
    if (!kullanici.aktif) {
      return hata(new Error('Pasif kullanıcı ekibe eklenemez; sahiplik zinciri sahte görünürdü.'));
    }

    await db.ekipUyeligi.upsert({
      where: { ekipId_kullaniciId: { ekipId: v.ekipId, kullaniciId: v.kullaniciId } },
      create: { ekipId: v.ekipId, kullaniciId: v.kullaniciId, rol: v.rol },
      update: { rol: v.rol },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Ekip', varlikId: v.ekipId, eylem: 'guncelleme',
      alan: `uyelik:${v.kullaniciId}`, sonra: v.rol,
    });
    revalidatePath('/yetkiler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function ekipUyeligiKaldir(girdi: {
  ekipId: string; kullaniciId: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'onay');
    const v = z.object({
      ekipId: bosluksuz('Ekip'), kullaniciId: bosluksuz('Kullanıcı'),
    }).parse(girdi);
    const mevcut = await db.ekipUyeligi.findUnique({
      where: { ekipId_kullaniciId: { ekipId: v.ekipId, kullaniciId: v.kullaniciId } },
      select: { rol: true },
    });
    if (!mevcut) return hata(new Error('Üyelik bulunamadı'));

    await db.ekipUyeligi.delete({
      where: { ekipId_kullaniciId: { ekipId: v.ekipId, kullaniciId: v.kullaniciId } },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Ekip', varlikId: v.ekipId, eylem: 'guncelleme',
      alan: `uyelik:${v.kullaniciId}`, once: mevcut.rol, sonra: null,
    });
    revalidatePath('/yetkiler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function varligaEkipAta(girdi: {
  varlikId: string; ekipId: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'),
      ekipId: z.string().trim().transform((s) => s || null).nullable(),
    }).parse(girdi);
    await varligiAlVeKapsamiDayat(k, v.varlikId, 'yazma',
      'Bu tesis kapsamında varlık düzenleme yetkiniz yok');

    if (v.ekipId) {
      const e = await db.ekip.findUnique({
        where: { id: v.ekipId }, select: { id: true, aktif: true },
      });
      if (!e) return hata(new Error('Ekip bulunamadı'));
      if (!e.aktif) return hata(new Error('Pasif ekibe varlık atanamaz.'));
    }
    const eski = await db.varlik.findUnique({
      where: { id: v.varlikId }, select: { ekipId: true },
    });
    await db.varlik.update({ where: { id: v.varlikId }, data: { ekipId: v.ekipId } });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId, eylem: 'guncelleme',
      alan: 'ekipId', once: eski?.ekipId ?? null, sonra: v.ekipId,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Bir devirde işlenecek EN ÇOK varlık — kaza eseri filo devri olmasın. */
const DEVIR_TAVANI = 500;

/**
 * Toplu sahiplik devri.
 *
 * Geri alınamaz ve tek tuşla yüzlerce kaydı değiştirir; bu yüzden
 * GEREKÇE zorunludur, tavan vardır ve her kayıt AYRI iz satırı bırakır.
 * Tek bir toplu iz satırı, "bu varlığın sahibi neden değişti" sorusunu
 * varlık bazında cevaplayamazdı.
 */
export async function topluSahipDevri(girdi: {
  varlikIdleri: string[]; hedefKullaniciId: string | null; gerekce: string;
}): Promise<Sonuc & { ozet?: { degisen: number; degismeyen: number } }> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = z.object({
      varlikIdleri: z.array(z.string().trim().min(1))
        .min(1, 'En az bir varlık seçin')
        .max(DEVIR_TAVANI, `Tek seferde en çok ${DEVIR_TAVANI} varlık devredilebilir`),
      hedefKullaniciId: z.string().trim().transform((s) => s || null).nullable(),
      gerekce: gerekceAlani,
    }).parse(girdi);

    if (v.hedefKullaniciId) {
      const u = await db.kullanici.findUnique({
        where: { id: v.hedefKullaniciId }, select: { id: true, aktif: true },
      });
      if (!u) return hata(new Error('Hedef kullanıcı bulunamadı'));
      /* Pasif kullanıcıya devir, kaydı görünürde sahipli ama gerçekte
         sahipsiz yapardı — OT-09'un tam da kapatmaya çalıştığı hâl. */
      if (!u.aktif) return hata(new Error('Pasif kullanıcıya sahiplik devredilemez.'));
    }

    const varliklar = await db.varlik.findMany({
      where: { id: { in: v.varlikIdleri }, silindi: null },
      select: { id: true, etiket: true, tesisId: true, sahipId: true },
    });
    if (varliklar.length === 0) return hata(new Error('Devredilecek varlık bulunamadı'));

    /* Kapsam HER KAYIT İÇİN ayrı sorulur: listede tek bir kapsam dışı
       varlık varsa devrin TAMAMI reddedilir. Kısmi devir, kullanıcının
       hangi kayıtların değiştiğini bilmediği bir sonuç üretirdi. */
    for (const varlik of varliklar) {
      kapsamZorunlu(k, 'envanter', 'onay', { tesisId: varlik.tesisId },
        `Bu tesis kapsamında devir yetkiniz yok (${varlik.etiket})`);
    }

    let degisen = 0; let degismeyen = 0;
    for (const varlik of varliklar) {
      if ((varlik.sahipId ?? null) === v.hedefKullaniciId) { degismeyen += 1; continue; }
      await db.varlik.update({
        where: { id: varlik.id }, data: { sahipId: v.hedefKullaniciId },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'Varlik', varlikId: varlik.id, eylem: 'guncelleme',
        alan: 'sahipId', once: varlik.sahipId, sonra: v.hedefKullaniciId, gerekce: v.gerekce,
      });
      degisen += 1;
    }
    revalidatePath('/envanter');
    return { ...tamam(), ozet: { degisen, degismeyen } };
  } catch (e) { return hata(e); }
}

/* ══ OT-16 · Keşif yetki kararı ═══════════════════════════════════════ */

export async function kesifYetkiKarari(girdi: {
  kesifId: string; yetkiDurumu: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = z.object({
      kesifId: bosluksuz('Keşif kaydı'),
      yetkiDurumu: z.enum(YETKI_DURUMLARI, 'Geçersiz yetki durumu'),
      gerekce: metin,
    }).parse(girdi);

    const kayit = await db.kesifKaydi.findUnique({
      where: { id: v.kesifId },
      select: { id: true, tesisId: true, yetkiDurumu: true, kaynakKayitId: true },
    });
    if (!kayit) return hata(new Error('Keşif kaydı bulunamadı'));
    kapsamZorunlu(k, 'envanter', 'onay', { tesisId: kayit.tesisId },
      'Bu tesis kapsamında keşif kararı verme yetkiniz yok');

    /* Gerekçe kuralı ALAN MANTIĞINDA durur; sunucu onu çağırır. İki yerde
       ayrı yazılsaydı ekran ile sunucu ayrışırdı. */
    const gecerli = kararGecerliMi(v.yetkiDurumu, v.gerekce ?? null);
    if (!gecerli.ok) return hata(new Error(gecerli.hata));

    await db.kesifKaydi.update({
      where: { id: v.kesifId },
      data: {
        yetkiDurumu: v.yetkiDurumu, yetkiGerekcesi: v.gerekce ?? null,
        yetkiKararVerenId: k.id, yetkiKararZamani: new Date(),
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'KesifKaydi', varlikId: v.kesifId, eylem: 'onay',
      alan: 'yetkiDurumu', once: kayit.yetkiDurumu, sonra: v.yetkiDurumu,
      gerekce: v.gerekce ?? null,
    });
    revalidatePath('/kesif');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ══ OT-17 · OUI kütüğü ve pasif gözlem ═══════════════════════════════ */

/** Tek yüklemede alınacak en çok OUI satırı. */
const OUI_TAVANI = 50_000;

/**
 * IEEE OUI kütüğünü yükler.
 *
 * **Kütük ürünle GELMEZ.** IEEE kaydı kurumun indirip yüklediği bir
 * veridir; uydurma bir üretici eşlemesi, MAC'ten yanlış üretici okuyan bir
 * envanter üretirdi. Biçim: her satır `ONEK<TAB|;|,>Üretici`.
 */
export async function ouiKutuguYukle(girdi: {
  icerik: string; kaynak: string;
}): Promise<Sonuc & { ozet?: { alinan: number; reddedilen: number } }> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'onay');
    const v = z.object({
      icerik: bosluksuz('Kütük içeriği'), kaynak: bosluksuz('Kaynak'),
    }).parse(girdi);

    const satirlar = v.icerik.split(/\r?\n/);
    const kabul = new Map<string, string>();
    let reddedilen = 0;
    for (const ham of satirlar) {
      const s = ham.trim();
      if (s === '' || s.startsWith('#')) continue;
      const parca = s.split(/[\t;,]/);
      if (parca.length < 2) { reddedilen += 1; continue; }
      /* Ön ek MAC'in ilk üç sekizlisidir; `macKanonik` tam adres bekler,
         bu yüzden ön eki altı hanelik hâline getirip doğruluyoruz. */
      const onEk = ouiOnEki(`${parca[0].trim()}000000`.slice(0, 17));
      const uretici = parca.slice(1).join(' ').trim();
      if (onEk === null || uretici === '') { reddedilen += 1; continue; }
      kabul.set(onEk, uretici);
    }
    if (kabul.size === 0) {
      return hata(new Error('Kütükten hiçbir OUI satırı okunamadı.'));
    }
    if (kabul.size > OUI_TAVANI) {
      return hata(new Error(`Kütük çok büyük (${kabul.size} satır). Parça parça yükleyin.`));
    }

    for (const [onEk, uretici] of kabul) {
      await db.ouiKaydi.upsert({
        where: { onEk },
        create: { onEk, uretici, kaynak: v.kaynak },
        update: { uretici, kaynak: v.kaynak, yuklendi: new Date() },
      });
    }
    await iz({
      aktorId: k.id, varlikTipi: 'OuiKaydi', varlikId: v.kaynak, eylem: 'olusturma',
      alan: 'kutuk', sonra: `${kabul.size} kayıt`,
      gerekce: reddedilen ? `${reddedilen} satır okunamadı` : null,
    });
    revalidatePath('/kesif');
    return { ...tamam(), ozet: { alinan: kabul.size, reddedilen } };
  } catch (e) { return hata(e); }
}

/** Tek yüklemede alınacak en çok pasif gözlem. */
const GOZLEM_TAVANI = 5_000;

/**
 * Pasif OT gözlemi yükler (firewall oturumu, span port dışa aktarımı,
 * switch ARP tablosu).
 *
 * **Bu eylem AĞA DOKUNMAZ.** Ürün OT ağında aktif tarama yapmaz; burada
 * yüklenen, başka bir yerde toplanmış ve insanın getirdiği gözlemdir.
 * OUI ve protokol türetilir ama UYDURULMAZ: kütükte yoksa üretici `null`,
 * tanınmayan port için protokol `null` kalır.
 */
export async function pasifGozlemYukle(girdi: {
  icerik: string; kaynak: string; tesisId?: string | null;
}): Promise<Sonuc & {
  ozet?: { alinan: number; guncellenen: number; reddedilen: number; protokollu: number };
}> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      icerik: bosluksuz('Gözlem içeriği'),
      kaynak: bosluksuz('Kaynak'),
      tesisId: z.string().trim().transform((s) => s || null).nullable().optional(),
    }).parse(girdi);

    kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: v.tesisId ?? null },
      'Bu tesis kapsamında gözlem yükleme yetkiniz yok');

    let kok: unknown;
    try { kok = JSON.parse(v.icerik); } catch {
      return hata(new Error('Gözlem belgesi geçerli JSON değil.'));
    }
    const dizi = Array.isArray(kok) ? kok
      : kok && typeof kok === 'object' && Array.isArray((kok as { gozlemler?: unknown }).gozlemler)
        ? (kok as { gozlemler: unknown[] }).gozlemler : null;
    if (dizi === null) {
      return hata(new Error('Belge bir gözlem dizisi ya da { gozlemler: [...] } değil.'));
    }
    if (dizi.length > GOZLEM_TAVANI) {
      return hata(new Error(`Belge çok büyük (${dizi.length} gözlem). Parça parça yükleyin.`));
    }

    let alinan = 0; let guncellenen = 0; let reddedilen = 0; let protokollu = 0;
    for (const ham of dizi) {
      if (!ham || typeof ham !== 'object' || Array.isArray(ham)) { reddedilen += 1; continue; }
      const o = ham as Record<string, unknown>;
      const kayitId = typeof o.kayitId === 'string' ? o.kayitId.trim() : '';
      if (kayitId === '') { reddedilen += 1; continue; }

      const mac = typeof o.mac === 'string' ? macKanonik(o.mac) : null;
      const port = typeof o.port === 'number' ? o.port : null;
      const tasima = o.tasima === 'tcp' || o.tasima === 'udp' ? o.tasima : null;
      const protokol = protokolKodu(port, tasima);
      if (protokol) protokollu += 1;

      const veri = {
        kaynak: v.kaynak, kaynakKayitId: kayitId,
        tesisId: v.tesisId ?? null,
        hamJson: JSON.stringify(o),
        ouiOnEki: mac === null ? null : mac.slice(0, 6),
        otProtokolu: protokol,
      };
      const mevcut = await db.kesifKaydi.findUnique({
        where: { kaynak_kaynakKayitId: { kaynak: v.kaynak, kaynakKayitId: kayitId } },
        select: { id: true },
      });
      if (mevcut) {
        /* `durum` ve `yetkiDurumu` GÜNCELLENMEZ: yeniden görülen bir cihaz
           hakkında verilmiş insan kararı, yeni bir gözlemle silinmez. */
        await db.kesifKaydi.update({
          where: { id: mevcut.id },
          data: {
            hamJson: veri.hamJson, ouiOnEki: veri.ouiOnEki,
            otProtokolu: veri.otProtokolu, sonGorulme: new Date(),
          },
        });
        guncellenen += 1;
      } else {
        await db.kesifKaydi.create({ data: veri });
        alinan += 1;
      }
    }

    await iz({
      aktorId: k.id, varlikTipi: 'KesifKaydi', varlikId: v.kaynak, eylem: 'olusturma',
      alan: 'pasifGozlem', sonra: `${alinan} yeni · ${guncellenen} güncel`,
      gerekce: reddedilen ? `${reddedilen} kayıt okunamadı` : null,
    });
    revalidatePath('/kesif');
    return { ...tamam(), ozet: { alinan, guncellenen, reddedilen, protokollu } };
  } catch (e) { return hata(e); }
}

/* ══ OT-28 · Konfigürasyon tabanı ve sapması ══════════════════════════ */

export async function konfigTemeliOnayla(girdi: {
  varlikId: string; yedekId: string; not?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'), yedekId: bosluksuz('Yedek'), not: metin,
    }).parse(girdi);
    await varligiAlVeKapsamiDayat(k, v.varlikId, 'onay',
      'Bu tesis kapsamında konfigürasyon onaylama yetkiniz yok');

    const yedek = await db.konfigurasyonYedegi.findUnique({
      where: { id: v.yedekId },
      select: { id: true, varlikId: true, icerikHash: true, basarili: true },
    });
    if (!yedek) return hata(new Error('Yedek bulunamadı'));
    if (yedek.varlikId !== v.varlikId) {
      return hata(new Error('Yedek bu varlığa ait değil.'));
    }
    /* Özeti olmayan yedek TABAN OLAMAZ: karşılaştıracak bir şey olmadan
       "onaylı konfigürasyon" diye bir kayıt açmak, sonsuza kadar
       `karar_verilemedi` üreten bir taban yaratırdı. */
    if (!yedek.icerikHash) {
      return hata(new Error('Bu yedeğin içerik özeti yok; taban olarak onaylanamaz.'));
    }
    if (!yedek.basarili) {
      return hata(new Error('Başarısız yedek taban olarak onaylanamaz.'));
    }

    const eski = await db.konfigTemeli.findUnique({
      where: { varlikId: v.varlikId }, select: { ozetHash: true },
    });
    await db.konfigTemeli.upsert({
      where: { varlikId: v.varlikId },
      create: {
        varlikId: v.varlikId, yedekId: yedek.id, ozetHash: yedek.icerikHash,
        onaylayanId: k.id, not: v.not ?? null,
      },
      update: {
        yedekId: yedek.id, ozetHash: yedek.icerikHash,
        onaylayanId: k.id, onayZamani: new Date(), not: v.not ?? null,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId, eylem: 'onay',
      alan: 'konfigTemeli', once: eski?.ozetHash ?? null, sonra: yedek.icerikHash,
      gerekce: v.not ?? null,
    });
    revalidatePath('/yedekleme');
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function konfigSapmasiKarari(girdi: {
  sapmaId: string; durum: string; gerekce: string; degisiklikRef?: string | null;
  siddet?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = z.object({
      sapmaId: bosluksuz('Sapma'),
      durum: z.enum(SAPMA_DURUMLARI, 'Geçersiz sapma durumu'),
      gerekce: gerekceAlani,
      degisiklikRef: metin,
      siddet: z.enum(SIDDETLER).nullable().optional(),
    }).parse(girdi);

    const sapma = await db.konfigSapmasi.findUnique({
      where: { id: v.sapmaId },
      select: { id: true, durum: true, varlik: { select: { tesisId: true } } },
    });
    if (!sapma) return hata(new Error('Konfigürasyon sapması bulunamadı'));
    kapsamZorunlu(k, 'envanter', 'onay', { tesisId: sapma.varlik.tesisId },
      'Bu tesis kapsamında sapma kararı verme yetkiniz yok');

    if (!kararGerekceIster(v.durum)) {
      return hata(new Error('"Açık" bir karar değildir; sapma zaten açık durumdadır.'));
    }
    /* Onaylı drift bir DEĞİŞİKLİK REFERANSI ister: referanssız bir
       "onaylı" kaydı, gerekçesiz bir yok saymadan ayırt edilemez. */
    if (v.durum === 'onayli' && !v.degisiklikRef) {
      return hata(new Error('"Onaylı değişiklik" kararı bir değişiklik referansı ister.'));
    }

    await db.konfigSapmasi.update({
      where: { id: v.sapmaId },
      data: {
        durum: v.durum, degisiklikRef: v.degisiklikRef ?? null,
        ...(v.siddet ? { siddet: v.siddet } : {}),
        kararVerenId: k.id, kararZamani: new Date(), kararGerekcesi: v.gerekce,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'KonfigSapmasi', varlikId: v.sapmaId, eylem: 'onay',
      alan: 'durum', once: sapma.durum, sonra: v.durum, gerekce: v.gerekce,
    });
    revalidatePath('/yedekleme');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ══ OT-33 · Hesap tipi ve süre alanları ══════════════════════════════ */

export async function hesapTipiKaydet(girdi: {
  hesapId: string; kaynakTipi: string; mfaVar?: boolean | null;
  sonaErme?: string | null; parolaPolitikasi?: string | null;
  ayricalikli?: boolean | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      hesapId: bosluksuz('Hesap'),
      kaynakTipi: z.enum(HESAP_KAYNAK_TIPLERI, 'Geçersiz kaynak tipi'),
      /* Üç durumlu: `null` = ÖLÇÜLMEDİ. `false` varsayılanı, ölçülmemiş
         her hesabı "MFA yok" saymak olurdu ve ayrıcalıklı hesap raporunun
         tamamını bozardı. */
      mfaVar: z.boolean().nullable().optional(),
      ayricalikli: z.boolean().nullable().optional(),
      sonaErme: tarihAlani,
      parolaPolitikasi: metin,
    }).parse(girdi);

    const hesap = await db.kimlikHesabi.findUnique({
      where: { id: v.hesapId },
      select: { id: true, hesapAdi: true, tesisId: true, kaynakTipi: true },
    });
    if (!hesap) return hata(new Error('Kimlik hesabı bulunamadı'));
    kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: hesap.tesisId },
      'Bu tesis kapsamında hesap düzenleme yetkiniz yok');

    await db.kimlikHesabi.update({
      where: { id: v.hesapId },
      data: {
        kaynakTipi: v.kaynakTipi,
        mfaVar: v.mfaVar ?? null,
        ayricalikli: v.ayricalikli ?? null,
        sonaErme: v.sonaErme ?? null,
        parolaPolitikasi: v.parolaPolitikasi ?? null,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'KimlikHesabi', varlikId: v.hesapId, eylem: 'guncelleme',
      alan: 'kaynakTipi', once: hesap.kaynakTipi, sonra: v.kaynakTipi,
    });
    revalidatePath('/kimlik');
    return tamam();
  } catch (e) { return hata(e); }
}
