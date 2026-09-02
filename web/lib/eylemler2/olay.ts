'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import {
  etkiOnerisiUret, oneriOku, dayanak,
  ETKI_ALANLARI, ETKI_ALAN_ETIKET, SEVIYE_ETIKET, SEVIYE_KUMESI,
  type EtkiAlani, type EtkiSeviyesi,
} from '../motorlar/olayEtki';
import { tamam, hata, iz, tarihAlani, bosluksuz, type Sonuc } from './ortak';

/* Olay etki zinciri yazma yüzeyi (P1-4).

   `lib/eylemler2/operasyon.ts` içindeki `olayKaydet` DURUYOR ve
   BOZULMUYOR: temel alanları (başlık/tip/tesis/şiddet/durum/özet) o yazar.
   Bu dosya onun YANINDA genişletilmiş yüzeyi kurar — müdahale/kök neden
   alanları, zincir bağları ve etki doğrulaması.

   ─ SÖZLEŞME ─────────────────────────────────────────────────────────────
   · `uretimEtkisi / emniyetEtkisi / regulasyonEtkisi / siberEtki` alanlarına
     YALNIZ `etkiDogrula` yazar. Ne `olayGuncelle` ne motor bu alanlara
     dokunur; alan doluysa arkasında bir insan kararı ve bir iz kaydı vardır.
   · Doğrulanmamış öneri "etki" değildir — raporlar boş alanı okur.
   · Yetki: okuma/yazma `envanter`, etki doğrulama `yonetim/onay`.
     Santral kapsamı olayın tesisi üzerinden uygulanır. */

const YOLLAR = ['/olaylar', '/operasyon'];
const tazele = () => YOLLAR.forEach((y) => revalidatePath(y));

const SIDDETLER = ['dusuk', 'orta', 'yuksek', 'kritik'] as const;
const DURUMLAR = ['acik', 'mudahale', 'cozuldu', 'kapali'] as const;
const TESPIT_KAYNAKLARI = [
  'siem', 'operator', 'tedarikci', 'denetim', 'musteri', 'otomatik_kural',
] as const;

/* Bağ tipleri — her biri kendi bağ tablosuna düşer. `use server` dosyası
   yalnız async fonksiyon dışa vurabildiği için liste burada YEREL kalır;
   ekranın kullandığı kopya `app/(kabuk)/(operasyonel)/olaylar/mantik.ts`. */
const BAG_TIPLERI = [
  'varlik', 'sistem', 'risk', 'bulgu', 'proje', 'degisiklik',
] as const;
export type BagTipi = (typeof BAG_TIPLERI)[number];

const BAG_ETIKET: Record<BagTipi, string> = {
  varlik: 'Varlık', sistem: 'Sistem', risk: 'Risk',
  bulgu: 'Bulgu', proje: 'Proje', degisiklik: 'Değişiklik',
};

/** Olayı ve kapsam yetkisini birlikte çözer. Olayın tesisi varsa kapsam
    kontrolü ZORUNLU: başka santralin olayına yazılamaz. */
async function olayKapisi(olayId: string, modul: 'envanter' | 'yonetim', islem: 'yazma' | 'onay') {
  const k = await yetkiZorunlu(modul, islem);
  const olay = await db.olay.findUnique({
    where: { id: olayId },
    select: {
      id: true, kod: true, baslik: true, durum: true, tesisId: true,
      uretimEtkisi: true, emniyetEtkisi: true, regulasyonEtkisi: true, siberEtki: true,
      etkiOnerisiJson: true,
    },
  });
  if (!olay) throw new Error('Olay bulunamadı');
  if (olay.tesisId && !izinVar(k, modul, islem, { tesisId: olay.tesisId }))
    throw new Error('Bu santral kapsamında yetkiniz yok');
  return { k, olay };
}

/* ── olay alanları ────────────────────────────────────────────────────── */

/** Genişletilmiş olay güncellemesi: müdahale ve öğrenme alanları.
    Etki alanları BİLEREK yoktur — onlar `etkiDogrula`ya aittir. */
export async function olayGuncelle(girdi: {
  id: string;
  baslik?: string;
  tip?: string;
  tesisId?: string | null;
  siddet?: string;
  durum?: string;
  ozet?: string | null;
  tespitKaynagi?: string | null;
  kokNeden?: string | null;
  sinirlama?: string | null;
  kurtarma?: string | null;
  ogrenilenler?: string | null;
  bildirimGerekli?: boolean | null;
  bildirimTarihi?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      id: bosluksuz('Olay'),
      baslik: bosluksuz('Başlık').optional(),
      tip: z.enum(['olay', 'problem']).optional(),
      tesisId: z.string().nullable().optional(),
      siddet: z.enum(SIDDETLER).optional(),
      durum: z.enum(DURUMLAR).optional(),
      ozet: z.string().nullable().optional(),
      tespitKaynagi: z.enum(TESPIT_KAYNAKLARI).nullable().optional(),
      kokNeden: z.string().nullable().optional(),
      sinirlama: z.string().nullable().optional(),
      kurtarma: z.string().nullable().optional(),
      ogrenilenler: z.string().nullable().optional(),
      bildirimGerekli: z.boolean().nullable().optional(),
      bildirimTarihi: tarihAlani,
    }).parse(girdi);

    const { k, olay } = await olayKapisi(v.id, 'envanter', 'yazma');
    // Tesis DEĞİŞTİRİLİYORSA hedef santralde de yetki aranır.
    if (v.tesisId && v.tesisId !== olay.tesisId
      && !izinVar(k, 'envanter', 'yazma', { tesisId: v.tesisId }))
      return { ok: false, hata: 'Hedef santral kapsamında yetkiniz yok' };

    const eski = await db.olay.findUniqueOrThrow({ where: { id: v.id } });
    const yaz = <T,>(deger: T | undefined, mevcut: T): T => (deger === undefined ? mevcut : deger);

    const durum = yaz(v.durum, eski.durum as (typeof DURUMLAR)[number]);
    await db.olay.update({
      where: { id: v.id },
      data: {
        baslik: yaz(v.baslik, eski.baslik),
        tip: yaz(v.tip, eski.tip as 'olay' | 'problem'),
        tesisId: yaz(v.tesisId, eski.tesisId),
        siddet: yaz(v.siddet, eski.siddet as (typeof SIDDETLER)[number]),
        durum,
        ozet: yaz(v.ozet, eski.ozet),
        tespitKaynagi: yaz(v.tespitKaynagi, eski.tespitKaynagi),
        kokNeden: yaz(v.kokNeden, eski.kokNeden),
        sinirlama: yaz(v.sinirlama, eski.sinirlama),
        kurtarma: yaz(v.kurtarma, eski.kurtarma),
        ogrenilenler: yaz(v.ogrenilenler, eski.ogrenilenler),
        bildirimGerekli: yaz(v.bildirimGerekli, eski.bildirimGerekli),
        bildirimTarihi: yaz(v.bildirimTarihi, eski.bildirimTarihi),
        cozum: durum === 'cozuldu' && eski.durum !== 'cozuldu' ? new Date() : eski.cozum,
      },
    });

    if (v.durum && v.durum !== eski.durum) {
      await iz({
        aktorId: k.id, varlikTipi: 'Olay', varlikId: v.id,
        eylem: 'durum_degisimi', alan: 'durum', once: eski.durum, sonra: v.durum,
      });
    }
    // Kök neden ve öğrenilenler denetim kanıtıdır — değişimi ize düşer.
    for (const alan of ['kokNeden', 'sinirlama', 'kurtarma', 'ogrenilenler'] as const) {
      const yeni = v[alan];
      if (yeni === undefined || yeni === eski[alan]) continue;
      await iz({
        aktorId: k.id, varlikTipi: 'Olay', varlikId: v.id,
        eylem: 'guncelleme', alan, once: eski[alan], sonra: yeni,
      });
    }

    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}

/* ── zincir bağları ───────────────────────────────────────────────────── */

const BagSemasi = z.object({
  olayId: bosluksuz('Olay'),
  tip: z.enum(BAG_TIPLERI, 'Bilinmeyen bağ tipi'),
  hedefId: bosluksuz('Bağlanacak kayıt'),
  rol: z.enum(['etkilenen', 'kaynak', 'telafi_edici']).optional(),
});

/** Olayı zincirin bir halkasına bağlar. Varlık/sistem bağı etki önerisini
    besler; bağ eklendikten sonra öneri yeniden üretilir. */
export async function olayBagla(girdi: {
  olayId: string; tip: string; hedefId: string; rol?: string;
}): Promise<Sonuc> {
  try {
    const v = BagSemasi.parse(girdi);
    const { k, olay } = await olayKapisi(v.olayId, 'envanter', 'yazma');

    const kod = await bagKur(v.tip, v.olayId, v.hedefId, v.rol ?? 'etkilenen');
    await iz({
      aktorId: k.id, varlikTipi: 'Olay', varlikId: olay.id,
      eylem: 'baglama', alan: v.tip, sonra: kod,
    });

    // Zincir değişti — öneri tazelenir. Etki alanlarına DOKUNULMAZ.
    if (v.tip === 'varlik' || v.tip === 'sistem') await etkiOnerisiUret(olay.id);

    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}

export async function olayBagKaldir(girdi: {
  olayId: string; tip: string; hedefId: string;
}): Promise<Sonuc> {
  try {
    const v = BagSemasi.omit({ rol: true }).parse(girdi);
    const { k, olay } = await olayKapisi(v.olayId, 'envanter', 'yazma');

    const kod = await bagKaldir(v.tip, v.olayId, v.hedefId);
    await iz({
      aktorId: k.id, varlikTipi: 'Olay', varlikId: olay.id,
      eylem: 'bag_kaldirma', alan: v.tip, once: kod,
    });

    if (v.tip === 'varlik' || v.tip === 'sistem') await etkiOnerisiUret(olay.id);

    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}

/** Bağ tablosuna yazar ve bağlanan kaydın kodunu (iz için) döner.
    Var olan bağ hata değildir — bağlama idempotenttir. */
async function bagKur(tip: BagTipi, olayId: string, hedefId: string, rol: string): Promise<string> {
  switch (tip) {
    case 'varlik': {
      const h = await db.varlik.findUnique({ where: { id: hedefId }, select: { etiket: true, silindi: true } });
      if (!h || h.silindi) throw new Error('Varlık bulunamadı');
      await db.olayVarlik.upsert({
        where: { olayId_varlikId: { olayId, varlikId: hedefId } },
        create: { olayId, varlikId: hedefId, rol }, update: { rol },
      });
      return h.etiket;
    }
    case 'sistem': {
      const h = await db.sistemServis.findUnique({ where: { id: hedefId }, select: { kod: true } });
      if (!h) throw new Error('Sistem bulunamadı');
      await db.olaySistem.upsert({
        where: { olayId_sistemId: { olayId, sistemId: hedefId } },
        create: { olayId, sistemId: hedefId, rol }, update: { rol },
      });
      return h.kod;
    }
    case 'risk': {
      const h = await db.risk.findUnique({ where: { id: hedefId }, select: { kod: true, silindi: true } });
      if (!h || h.silindi) throw new Error('Risk bulunamadı');
      await db.olayRisk.upsert({
        where: { olayId_riskId: { olayId, riskId: hedefId } },
        create: { olayId, riskId: hedefId }, update: {},
      });
      return h.kod;
    }
    case 'bulgu': {
      const h = await db.bulgu.findUnique({ where: { id: hedefId }, select: { baslik: true, silindi: true } });
      if (!h || h.silindi) throw new Error('Bulgu bulunamadı');
      await db.olayBulgu.upsert({
        where: { olayId_bulguId: { olayId, bulguId: hedefId } },
        create: { olayId, bulguId: hedefId }, update: {},
      });
      return h.baslik;
    }
    case 'proje': {
      const h = await db.proje.findUnique({ where: { id: hedefId }, select: { kod: true, silindi: true } });
      if (!h || h.silindi) throw new Error('Proje bulunamadı');
      await db.olayProje.upsert({
        where: { olayId_projeId: { olayId, projeId: hedefId } },
        create: { olayId, projeId: hedefId }, update: {},
      });
      return h.kod;
    }
    case 'degisiklik': {
      const h = await db.degisiklik.findUnique({ where: { id: hedefId }, select: { kod: true } });
      if (!h) throw new Error('Değişiklik bulunamadı');
      await db.olayDegisiklik.upsert({
        where: { olayId_degisiklikId: { olayId, degisiklikId: hedefId } },
        create: { olayId, degisiklikId: hedefId }, update: {},
      });
      return h.kod;
    }
  }
}

async function bagKaldir(tip: BagTipi, olayId: string, hedefId: string): Promise<string> {
  const silindi = tip === 'varlik'
    ? await db.olayVarlik.deleteMany({ where: { olayId, varlikId: hedefId } })
    : tip === 'sistem'
      ? await db.olaySistem.deleteMany({ where: { olayId, sistemId: hedefId } })
      : tip === 'risk'
        ? await db.olayRisk.deleteMany({ where: { olayId, riskId: hedefId } })
        : tip === 'bulgu'
          ? await db.olayBulgu.deleteMany({ where: { olayId, bulguId: hedefId } })
          : tip === 'proje'
            ? await db.olayProje.deleteMany({ where: { olayId, projeId: hedefId } })
            : await db.olayDegisiklik.deleteMany({ where: { olayId, degisiklikId: hedefId } });
  if (silindi.count === 0) throw new Error(`${BAG_ETIKET[tip]} bağı zaten yok`);
  return hedefId;
}

/* ── öneri ────────────────────────────────────────────────────────────── */

/** Tek olayın etki önerisini yeniden üretir (motorun toplu koşusunun
    tekil hâli). Yalnız `etkiOnerisiJson` yazılır. */
export async function etkiOnerisiYenile(olayId: string): Promise<Sonuc> {
  try {
    await olayKapisi(olayId, 'envanter', 'yazma');
    await etkiOnerisiUret(olayId);
    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}

/* ── etki doğrulama ───────────────────────────────────────────────────── */

/** Etki alanının Prisma güncelleme parçası. Hesaplanmış anahtar yerine
    açık dallanma: yanlış alana yazma derleme zamanında yakalanır. */
function etkiAlaniVerisi(alan: EtkiAlani, deger: string | null) {
  switch (alan) {
    case 'uretimEtkisi': return { uretimEtkisi: deger };
    case 'emniyetEtkisi': return { emniyetEtkisi: deger };
    case 'regulasyonEtkisi': return { regulasyonEtkisi: deger };
    case 'siberEtki': return { siberEtki: deger };
  }
}

/** İNSAN ONAYI. Öneri burada — ve yalnız burada — gerçek etki alanına
    yazılır. Gerekçe zorunludur; `bilinmiyor` doğrulanamaz (değerlendirme
    yapılmadıysa alan BOŞ kalır, "yok" olmaz). */
export async function etkiDogrula(girdi: {
  olayId: string; alan: string; deger: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      olayId: bosluksuz('Olay'),
      alan: z.enum(ETKI_ALANLARI, 'Bilinmeyen etki alanı'),
      deger: bosluksuz('Etki değeri'),
      gerekce: z.string().trim().min(3, 'Doğrulama gerekçesi zorunlu'),
    }).parse(girdi);

    const gecerli = SEVIYE_KUMESI[v.alan as EtkiAlani];
    if (v.deger === 'bilinmiyor')
      return {
        ok: false,
        hata: 'Bilinmiyor doğrulanamaz — değerlendirme yapılmadıysa alan boş kalır.',
      };
    if (!gecerli.includes(v.deger as EtkiSeviyesi))
      return {
        ok: false,
        hata: `${ETKI_ALAN_ETIKET[v.alan as EtkiAlani]} için geçerli değerler: `
          + gecerli.map((d) => SEVIYE_ETIKET[d]).join(', '),
      };

    // Etki doğrulama ONAY yetkisidir — yazma yetkisi yetmez.
    const { k, olay } = await olayKapisi(v.olayId, 'yonetim', 'onay');

    const oneri = oneriOku(olay.etkiOnerisiJson);
    const onerilen = oneri ? oneri[v.alan as EtkiAlani] : null;
    const oncekiDeger = olay[v.alan as EtkiAlani];

    /* Gerekçeye önerinin kaderi de yazılır: kabul mü, değiştirme mi, yoksa
       öneri olmadan verilmiş insan değerlendirmesi mi. */
    const oneriNotu = onerilen === null || onerilen === undefined
      ? 'motor önerisi yok — insan değerlendirmesi'
      : onerilen === 'bilinmiyor'
        ? `motor "bilinmiyor" demişti (${dayanak(oneri, v.alan as EtkiAlani) ?? 'dayanak yok'})`
        : onerilen === v.deger
          ? `motor önerisi kabul edildi: ${SEVIYE_ETIKET[onerilen]}`
            + ` (${dayanak(oneri, v.alan as EtkiAlani) ?? 'dayanak yok'})`
          : `motor önerisi ${SEVIYE_ETIKET[onerilen]} idi, insan ${SEVIYE_ETIKET[v.deger as EtkiSeviyesi]} dedi`
            + ` (${dayanak(oneri, v.alan as EtkiAlani) ?? 'dayanak yok'})`;

    /* Alan yazımı ve denetim izi TEK işlemde: izi düşmeyen bir doğrulama
       kaydı kalamaz. (better-sqlite3 adaptörü geri alma yapıyor.) */
    await db.$transaction(async (tx) => {
      await tx.olay.update({
        where: { id: olay.id },
        data: {
          ...etkiAlaniVerisi(v.alan, v.deger),
          etkiDogrulayanId: k.id,
          etkiDogrulamaZamani: new Date(),
        },
      });
      await tx.aktiviteKaydi.create({ data: {
        aktorId: k.id, varlikTipi: 'Olay', varlikId: olay.id,
        eylem: 'etki_dogrulama', alan: v.alan,
        oncekiDeger: oncekiDeger ?? null, yeniDeger: v.deger,
        gerekce: `${v.gerekce} · ${oneriNotu}`,
      } });
    });

    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}

/** Doğrulamayı geri alır: alan BOŞA döner (yok'a değil), izi kalır.
    Öneri silinmez — insan yeniden karar verene kadar öneri olarak durur. */
export async function etkiDogrulamaGeriAl(girdi: {
  olayId: string; alan: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      olayId: bosluksuz('Olay'),
      alan: z.enum(ETKI_ALANLARI, 'Bilinmeyen etki alanı'),
      gerekce: z.string().trim().min(3, 'Geri alma gerekçesi zorunlu'),
    }).parse(girdi);
    const { k, olay } = await olayKapisi(v.olayId, 'yonetim', 'onay');

    const oncekiDeger = olay[v.alan as EtkiAlani];
    if (oncekiDeger === null) return { ok: false, hata: 'Bu alan zaten doğrulanmamış' };

    // Başka doğrulanmış alan kalmadıysa doğrulama damgası da düşer.
    const kalan = ETKI_ALANLARI.filter((a) => a !== v.alan && olay[a] !== null);
    await db.$transaction(async (tx) => {
      await tx.olay.update({
        where: { id: olay.id },
        data: {
          ...etkiAlaniVerisi(v.alan, null),
          ...(kalan.length === 0 ? { etkiDogrulayanId: null, etkiDogrulamaZamani: null } : {}),
        },
      });
      await tx.aktiviteKaydi.create({ data: {
        aktorId: k.id, varlikTipi: 'Olay', varlikId: olay.id,
        eylem: 'etki_dogrulama_geri_alma', alan: v.alan,
        oncekiDeger, yeniDeger: null, gerekce: v.gerekce,
      } });
    });

    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}
