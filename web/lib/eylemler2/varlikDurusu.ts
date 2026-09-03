'use server';

/* ═══ Varlık güvenlik duruşu eylemleri ═════════════════════════════════
   OT-03 · OT-11 · OT-21 · OT-22 · OT-25 · OT-26 · OT-27 · OT-44

   Kalıp `envanter.ts` ile aynıdır ve ondan sapılmaz:
     yetkiZorunlu(KAPSAM_SONRA) → zod → kayıt oku → kapsamZorunlu →
     db → iz → revalidatePath

   İki aşamalı kapı burada da zorunludur: ön kapı kapsamsız sorar
   (`KAPSAM_SONRA`), ikinci aşama kaydı OKUDUKTAN SONRA tesis kapsamını
   dayatır. Tek aşamalı bir kapı, tesise kısıtlı kullanıcıyı ya tümüyle
   dışarıda bırakır ya da başka tesisin kaydına yazdırır.

   ── HANGİ MODÜL, NEDEN ─────────────────────────────────────────────────
   Varlık duruşu kayıtlarının hepsi `envanter` modülüdür: konuları CMDB
   kaydıdır, uyum kaydı değil. Firmware TABANI ve ağ SEGMENTİ ise
   `tanimlar` modülüdür — ikisi de tek bir varlığı değil, bir SINIFI
   bağlar; kütük değişikliğidir ve `onay` ister. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import { subnetCozumle } from '../alan/ag';
import { surumCozumle } from '../alan/surum';
import { sbomAyristir, bilesenleriTekillestir, bilesenKimligi } from '../varlik/sbom';
import { KAPSAM_DURUMLARI, KAPSAM_TIPLERI } from '../varlik/kapsam';
import { type Sonuc, tamam, hata, iz, tarihAlani, bosluksuz } from './ortak';

const metin = z.string().trim().transform((s) => s || null).nullable().optional();
const gerekceAlani = z.string().trim().min(10, 'Gerekçe en az 10 karakter olmalı');

/** Varlığı okur ve kapsamını dayatır; bulunamazsa anlamlı hata. */
async function varligiAlVeKapsamiDayat(
  k: Awaited<ReturnType<typeof yetkiZorunlu>>, varlikId: string, mesaj: string,
) {
  const v = await db.varlik.findUnique({
    where: { id: varlikId },
    select: { id: true, etiket: true, tesisId: true, silindi: true },
  });
  if (!v || v.silindi) throw new Error('Varlık bulunamadı');
  kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: v.tesisId }, mesaj);
  return v;
}

/* ══ OT-03 · Alan uygulanabilirliği ═══════════════════════════════════
   "Bu alan bu cihaz için UYGULANAMAZ" bir ölçüm değil, bir KARARDIR:
   gerekçesiyle ve kim verdiğiyle saklanır. Gerekçesiz uygulanamazlık,
   kapatılmış bir kusurdan ayırt edilemezdi. */

export async function alanUygulanamazIsaretle(girdi: {
  varlikId: string; alan: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'), alan: bosluksuz('Alan'), gerekce: gerekceAlani,
    }).parse(girdi);
    await varligiAlVeKapsamiDayat(k, v.varlikId, 'Bu tesis kapsamında varlık düzenleme yetkiniz yok');

    await db.alanUygulanabilirligi.upsert({
      where: { varlikTipi_varlikId_alan: { varlikTipi: 'Varlik', varlikId: v.varlikId, alan: v.alan } },
      create: { varlikTipi: 'Varlik', varlikId: v.varlikId, alan: v.alan, gerekce: v.gerekce, kaydedenId: k.id },
      update: { gerekce: v.gerekce, kaydedenId: k.id, zaman: new Date() },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId,
      eylem: 'guncelleme', alan: `uygulanamaz:${v.alan}`, sonra: 'uygulanamaz',
      gerekce: v.gerekce,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function alanUygulanabilirligiKaldir(girdi: {
  varlikId: string; alan: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'), alan: bosluksuz('Alan'), gerekce: gerekceAlani,
    }).parse(girdi);
    await varligiAlVeKapsamiDayat(k, v.varlikId, 'Bu tesis kapsamında varlık düzenleme yetkiniz yok');

    await db.alanUygulanabilirligi.deleteMany({
      where: { varlikTipi: 'Varlik', varlikId: v.varlikId, alan: v.alan },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId,
      eylem: 'guncelleme', alan: `uygulanamaz:${v.alan}`, once: 'uygulanamaz', sonra: null,
      gerekce: v.gerekce,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ══ OT-11 · Ağ segmenti ══════════════════════════════════════════════
   Segment bir KÜTÜK kaydıdır (bir varlığın değil, bir ağın tanımı):
   `tanimlar` modülü ve `onay` yetkisi ister. */

const SegmentSemasi = z.object({
  id: z.string().optional(),
  bolgeId: bosluksuz('Bölge'),
  kod: bosluksuz('Kod'),
  ad: bosluksuz('Ad'),
  vlanId: z.number().int().min(1).max(4094).nullable().optional(),
  cidr: bosluksuz('CIDR'),
  gatewayIp: metin,
  yonetimAgi: z.boolean().nullable().optional(),
  aciklama: metin,
});

export async function agSegmentiKaydet(girdi: unknown): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'onay');
    const v = SegmentSemasi.parse(girdi);

    /* CIDR ÜRÜNE GİRMEDEN doğrulanır. Geçersiz bir CIDR kaydedilseydi
       ağ tutarlılık motoru her koşuda aynı bulguyu açar ve kural
       motorunun kendisi gürültü kaynağı olurdu. */
    const subnet = subnetCozumle(v.cidr);
    if (!subnet) return hata(new Error(`CIDR çözümlenemedi: "${v.cidr}". Örnek: 10.0.0.0/24`));

    const bolge = await db.agBolgesi.findUnique({ where: { id: v.bolgeId }, select: { id: true } });
    if (!bolge) return hata(new Error('Ağ bölgesi bulunamadı'));

    if (v.id) {
      const eski = await db.agSegmenti.findUnique({ where: { id: v.id } });
      if (!eski) return hata(new Error('Segment bulunamadı'));
      await db.agSegmenti.update({
        where: { id: v.id },
        data: {
          bolgeId: v.bolgeId, kod: v.kod, ad: v.ad, vlanId: v.vlanId ?? null,
          cidr: v.cidr, gatewayIp: v.gatewayIp ?? null,
          yonetimAgi: v.yonetimAgi ?? null, aciklama: v.aciklama ?? null,
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'AgSegmenti', varlikId: v.id, eylem: 'guncelleme',
        alan: 'cidr', once: eski.cidr, sonra: v.cidr,
      });
    } else {
      const yeni = await db.agSegmenti.create({
        data: {
          bolgeId: v.bolgeId, kod: v.kod, ad: v.ad, vlanId: v.vlanId ?? null,
          cidr: v.cidr, gatewayIp: v.gatewayIp ?? null,
          yonetimAgi: v.yonetimAgi ?? null, aciklama: v.aciklama ?? null,
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'AgSegmenti', varlikId: yeni.id, eylem: 'olusturma',
        alan: 'cidr', sonra: v.cidr,
      });
    }
    revalidatePath('/topoloji');
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function varligaSegmentAta(girdi: {
  varlikId: string; segmentId: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'),
      segmentId: z.string().trim().transform((s) => s || null).nullable(),
    }).parse(girdi);
    await varligiAlVeKapsamiDayat(k, v.varlikId, 'Bu tesis kapsamında varlık düzenleme yetkiniz yok');
    const eski = await db.varlik.findUnique({
      where: { id: v.varlikId }, select: { segmentId: true },
    });
    if (v.segmentId) {
      const s = await db.agSegmenti.findUnique({ where: { id: v.segmentId }, select: { id: true } });
      if (!s) return hata(new Error('Ağ segmenti bulunamadı'));
    }
    await db.varlik.update({ where: { id: v.varlikId }, data: { segmentId: v.segmentId } });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId, eylem: 'guncelleme',
      alan: 'segmentId', once: eski?.segmentId ?? null, sonra: v.segmentId,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ══ OT-21 · Yama kaydı ═══════════════════════════════════════════════ */

const YAMA_SIDDETLERI = ['kritik', 'yuksek', 'orta', 'dusuk', 'bilinmiyor'] as const;

export async function yamaKaydiKaydet(girdi: unknown): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'),
      kaynakSistem: bosluksuz('Kaynak sistem'),
      kaynakKayitId: bosluksuz('Kaynak kayıt'),
      mevcutSeviye: metin, temelSeviye: metin, eksikYama: metin,
      yamaTarihi: tarihAlani,
      siddet: z.enum(YAMA_SIDDETLERI).default('bilinmiyor'),
      yenidenBaslatmaGerekli: z.boolean().nullable().optional(),
      bakimPenceresi: metin, istisnaGerekcesi: metin, telafiEdiciKontrol: metin,
      yamalanamaz: z.boolean().default(false),
    }).parse(girdi);
    await varligiAlVeKapsamiDayat(k, v.varlikId, 'Bu tesis kapsamında varlık düzenleme yetkiniz yok');

    /* Durum burada TÜRETİLİR, kullanıcıdan alınmaz: alanlardan bağımsız
       bir durum yazılabilseydi "uyumlu" işaretli ama eksik yaması olan
       kayıt üretmek mümkün olurdu. */
    const durum = yamaDurumuTuret(v);

    await db.yamaKaydi.upsert({
      where: {
        varlikId_kaynakSistem_kaynakKayitId: {
          varlikId: v.varlikId, kaynakSistem: v.kaynakSistem, kaynakKayitId: v.kaynakKayitId,
        },
      },
      create: {
        varlikId: v.varlikId, kaynakSistem: v.kaynakSistem, kaynakKayitId: v.kaynakKayitId,
        mevcutSeviye: v.mevcutSeviye ?? null, temelSeviye: v.temelSeviye ?? null,
        yamaTarihi: v.yamaTarihi ?? null, eksikYama: v.eksikYama ?? null,
        siddet: v.siddet, yenidenBaslatmaGerekli: v.yenidenBaslatmaGerekli ?? null,
        bakimPenceresi: v.bakimPenceresi ?? null, istisnaGerekcesi: v.istisnaGerekcesi ?? null,
        telafiEdiciKontrol: v.telafiEdiciKontrol ?? null, yamalanamaz: v.yamalanamaz,
        durum, sonDogrulama: new Date(),
      },
      update: {
        mevcutSeviye: v.mevcutSeviye ?? null, temelSeviye: v.temelSeviye ?? null,
        yamaTarihi: v.yamaTarihi ?? null, eksikYama: v.eksikYama ?? null,
        siddet: v.siddet, yenidenBaslatmaGerekli: v.yenidenBaslatmaGerekli ?? null,
        bakimPenceresi: v.bakimPenceresi ?? null, istisnaGerekcesi: v.istisnaGerekcesi ?? null,
        telafiEdiciKontrol: v.telafiEdiciKontrol ?? null, yamalanamaz: v.yamalanamaz,
        durum, sonDogrulama: new Date(),
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId, eylem: 'guncelleme',
      alan: 'yamaKaydi', sonra: durum,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Yama durumunu alanlardan türetir. Sıra ÖNEMLİ:
 * yamalanamaz → istisna → eksik → uyumlu → karar verilemedi.
 *
 * `karar_verilemedi` son çare değil, ölçülmemişliğin adıdır: taban ya da
 * mevcut seviye yoksa cihazın uyumlu olup olmadığı BİLİNMEZ ve `uyumlu`
 * yazmak ölçülmemiş bir cihazı yeşil göstermek olurdu.
 */
export function yamaDurumuTuret(v: {
  yamalanamaz: boolean; istisnaGerekcesi?: string | null;
  eksikYama?: string | null; mevcutSeviye?: string | null; temelSeviye?: string | null;
}): 'uyumlu' | 'eksik' | 'yamalanamaz' | 'istisna' | 'karar_verilemedi' {
  if (v.yamalanamaz) return 'yamalanamaz';
  if (v.istisnaGerekcesi) return 'istisna';
  if (v.eksikYama) return 'eksik';
  if (!v.mevcutSeviye || !v.temelSeviye) return 'karar_verilemedi';
  if (!surumCozumle(v.mevcutSeviye) || !surumCozumle(v.temelSeviye)) return 'karar_verilemedi';
  return 'uyumlu';
}

/* ══ OT-22 · Firmware tabanı ══════════════════════════════════════════ */

export async function firmwareTemeliKaydet(girdi: unknown): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'onay');
    const v = z.object({
      id: z.string().optional(),
      turId: z.string().trim().transform((s) => s || null).nullable().optional(),
      uretici: metin, model: metin,
      onayliSurum: bosluksuz('Onaylı sürüm'),
      asgariSurum: metin, hedefSurum: metin, bilinenKotuSurumler: metin,
      advisoryReferansi: metin, aciklama: metin,
      aktif: z.boolean().default(true),
    }).parse(girdi);

    /* Sürümler ÜRÜNE GİRMEDEN çözümlenir: çözümlenemeyen bir taban,
       bağlı bütün cihazları sonsuza kadar `karar_verilemedi` yapardı ve
       sebebi tabanın kendisi olurdu. */
    for (const [ad, deger] of [['Onaylı sürüm', v.onayliSurum], ['Asgari sürüm', v.asgariSurum],
      ['Hedef sürüm', v.hedefSurum]] as const) {
      if (deger && !surumCozumle(deger)) {
        return hata(new Error(`${ad} çözümlenemedi: "${deger}"`));
      }
    }
    if (v.turId === null && !v.uretici && !v.model) {
      return hata(new Error('Taban en az bir boyuta bağlanmalı: tür, üretici ya da model.'));
    }

    const veri = {
      turId: v.turId ?? null, uretici: v.uretici ?? null, model: v.model ?? null,
      onayliSurum: v.onayliSurum, asgariSurum: v.asgariSurum ?? null,
      hedefSurum: v.hedefSurum ?? null, bilinenKotuSurumler: v.bilinenKotuSurumler ?? null,
      advisoryReferansi: v.advisoryReferansi ?? null, aciklama: v.aciklama ?? null,
      aktif: v.aktif,
    };
    const kayit = v.id
      ? await db.firmwareTemeli.update({ where: { id: v.id }, data: veri })
      : await db.firmwareTemeli.create({ data: veri });
    await iz({
      aktorId: k.id, varlikTipi: 'FirmwareTemeli', varlikId: kayit.id,
      eylem: v.id ? 'guncelleme' : 'olusturma', alan: 'onayliSurum', sonra: v.onayliSurum,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Firmware uyumsuzluğu için onaylı istisna — kararı EZMEZ, yanına yazar. */
export async function firmwareIstisnasiKaydet(girdi: {
  varlikId: string; gerekce: string; yukseltmePlani?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'), gerekce: gerekceAlani,
      yukseltmePlani: metin,
    }).parse(girdi);
    const varlik = await db.varlik.findUnique({
      where: { id: v.varlikId }, select: { tesisId: true, silindi: true },
    });
    if (!varlik || varlik.silindi) return hata(new Error('Varlık bulunamadı'));
    kapsamZorunlu(k, 'envanter', 'onay', { tesisId: varlik.tesisId },
      'Bu tesis kapsamında istisna onaylama yetkiniz yok');

    /* İstisna `durum`u DEĞİŞTİRMEZ: cihaz hâlâ eski firmware'dedir ve
       ekran öyle göstermelidir. İstisna yalnız "bu biliniyor ve kabul
       edildi" bilgisini ekler. */
    await db.firmwareUyumu.update({
      where: { varlikId: v.varlikId },
      data: { istisnaGerekcesi: v.gerekce, yukseltmePlani: v.yukseltmePlani ?? null },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId, eylem: 'onay',
      alan: 'firmwareIstisnasi', sonra: 'onaylandi', gerekce: v.gerekce,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ══ OT-25 · Korelasyon elle kararı — yanlış pozitif bastırma ═════════ */

export async function korelasyonElleKarar(girdi: {
  korelasyonId: string; sonuc: 'etkilenen' | 'etkilenmeyen'; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = z.object({
      korelasyonId: bosluksuz('Korelasyon'),
      sonuc: z.enum(['etkilenen', 'etkilenmeyen'], 'Geçersiz karar'),
      gerekce: gerekceAlani,
    }).parse(girdi);

    const kor = await db.zafiyetKorelasyonu.findUnique({
      where: { id: v.korelasyonId },
      select: { id: true, sonuc: true, varlik: { select: { tesisId: true } } },
    });
    if (!kor) return hata(new Error('Korelasyon kaydı bulunamadı'));
    kapsamZorunlu(k, 'envanter', 'onay', { tesisId: kor.varlik.tesisId },
      'Bu tesis kapsamında zafiyet kararı verme yetkiniz yok');

    await db.zafiyetKorelasyonu.update({
      where: { id: v.korelasyonId },
      data: {
        elleSonuc: v.sonuc, elleGerekce: v.gerekce,
        elleKararVerenId: k.id, elleKararZamani: new Date(),
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'ZafiyetKorelasyonu', varlikId: v.korelasyonId,
      eylem: 'onay', alan: 'elleSonuc', once: kor.sonuc, sonra: v.sonuc, gerekce: v.gerekce,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ══ OT-26 · SBOM yükleme ═════════════════════════════════════════════ */

/** Tek yüklemede işlenecek EN ÇOK bileşen — büyük SBOM parça parça gelir. */
export const SBOM_PARTI_BOYU = 500;

export async function sbomYukle(girdi: {
  varlikId: string; icerik: string; kaynakSistem: string; kaynakKayitId: string;
}): Promise<Sonuc & { ozet?: { kabul: number; red: number; bicim: string | null } }> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'),
      icerik: bosluksuz('SBOM içeriği'),
      kaynakSistem: bosluksuz('Kaynak sistem'),
      kaynakKayitId: bosluksuz('Kaynak kayıt'),
    }).parse(girdi);
    await varligiAlVeKapsamiDayat(k, v.varlikId, 'Bu tesis kapsamında SBOM yükleme yetkiniz yok');

    const cozum = sbomAyristir(v.icerik);
    if (!cozum.ok) return hata(new Error(cozum.hata ?? 'SBOM çözümlenemedi'));

    const bilesenler = bilesenleriTekillestir(cozum.bilesenler);
    if (bilesenler.length > SBOM_PARTI_BOYU * 20) {
      return hata(new Error(
        `SBOM çok büyük (${bilesenler.length} bileşen). Parça parça yükleyin.`,
      ));
    }

    const belge = await db.sbomBelgesi.upsert({
      where: {
        kaynakSistem_kaynakKayitId: {
          kaynakSistem: v.kaynakSistem, kaynakKayitId: v.kaynakKayitId,
        },
      },
      create: {
        varlikId: v.varlikId, bicim: cozum.bicim ?? 'cyclonedx',
        bicimSurumu: cozum.bicimSurumu, seriNo: cozum.seriNo,
        uretimZamani: cozum.uretimZamani ? new Date(cozum.uretimZamani) : null,
        kaynakSistem: v.kaynakSistem, kaynakKayitId: v.kaynakKayitId,
        bilesenSayisi: bilesenler.length, yukleyenId: k.id,
      },
      update: {
        varlikId: v.varlikId, bicim: cozum.bicim ?? 'cyclonedx',
        bicimSurumu: cozum.bicimSurumu, seriNo: cozum.seriNo,
        bilesenSayisi: bilesenler.length, yukleyenId: k.id, yuklendi: new Date(),
        belgeSurumu: { increment: 1 },
      },
    });

    /* Aynı belge yeniden yüklendiğinde eski girdiler silinir: SBOM bir
       ANLIK GÖRÜNTÜDÜR; kaldırılmış bir bileşenin listede kalması,
       olmayan bir bağımlılığı varmış gibi göstermek olurdu. */
    await db.sbomGirdisi.deleteMany({ where: { sbomId: belge.id } });

    for (let i = 0; i < bilesenler.length; i += SBOM_PARTI_BOYU) {
      const parti = bilesenler.slice(i, i + SBOM_PARTI_BOYU);
      for (const b of parti) {
        const bilesen = await db.yazilimBileseni.upsert({
          where: { kimlik: bilesenKimligi(b) },
          create: {
            kimlik: bilesenKimligi(b),
            ad: b.ad, surum: b.surum, purl: b.purl, cpe: b.cpe,
            tedarikci: b.tedarikci, lisans: b.lisans, ozet: b.ozet,
          },
          update: {
            cpe: b.cpe ?? undefined, tedarikci: b.tedarikci ?? undefined,
            lisans: b.lisans ?? undefined, ozet: b.ozet ?? undefined,
          },
        });
        await db.sbomGirdisi.upsert({
          where: { sbomId_bilesenId: { sbomId: belge.id, bilesenId: bilesen.id } },
          create: { sbomId: belge.id, bilesenId: bilesen.id, kapsam: b.kapsam },
          update: { kapsam: b.kapsam },
        });
      }
    }

    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId, eylem: 'olusturma',
      alan: 'sbom', sonra: `${cozum.bicim} · ${bilesenler.length} bileşen`,
      gerekce: cozum.reddedilen.length ? `${cozum.reddedilen.length} satır okunamadı` : null,
    });
    revalidatePath('/envanter');
    return { ...tamam(), ozet: { kabul: bilesenler.length, red: cozum.reddedilen.length, bicim: cozum.bicim } };
  } catch (e) { return hata(e); }
}

/* ══ OT-27 · Güvenlik kapsaması ═══════════════════════════════════════ */

export async function kapsamKaydet(girdi: {
  varlikId: string; tip: string; durum: string; gerekce?: string | null;
  kaynakSistem?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'),
      tip: z.enum(KAPSAM_TIPLERI, 'Geçersiz kapsam tipi'),
      durum: z.enum(KAPSAM_DURUMLARI, 'Geçersiz kapsam durumu'),
      gerekce: metin, kaynakSistem: metin,
    }).parse(girdi);
    await varligiAlVeKapsamiDayat(k, v.varlikId, 'Bu tesis kapsamında varlık düzenleme yetkiniz yok');

    /* `uygulanamaz` GEREKÇE İSTER: gerekçesiz uygulanamazlık, kapatılmış
       bir kusurdan ayırt edilemez ve denetimde savunulamaz. */
    if (v.durum === 'uygulanamaz' && !(v.gerekce && v.gerekce.trim().length >= 10)) {
      return hata(new Error('"Uygulanamaz" kaydı en az 10 karakterlik gerekçe ister.'));
    }

    const eski = await db.guvenlikKapsami.findUnique({
      where: { varlikId_tip: { varlikId: v.varlikId, tip: v.tip } },
      select: { durum: true },
    });
    await db.guvenlikKapsami.upsert({
      where: { varlikId_tip: { varlikId: v.varlikId, tip: v.tip } },
      create: {
        varlikId: v.varlikId, tip: v.tip, durum: v.durum,
        gerekce: v.gerekce ?? null, kaynakSistem: v.kaynakSistem ?? null,
        /* Elle kaydedilen kapsam O AN doğrulanmıştır: tarih burada
           yazılır, yoksa tazelik kuralı elle girilen her kaydı bayat
           sayardı. */
        sonDogrulama: new Date(),
      },
      update: {
        durum: v.durum, gerekce: v.gerekce ?? null,
        kaynakSistem: v.kaynakSistem ?? null, sonDogrulama: new Date(),
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Varlik', varlikId: v.varlikId, eylem: 'guncelleme',
      alan: `kapsam:${v.tip}`, once: eski?.durum ?? null, sonra: v.durum, gerekce: v.gerekce ?? null,
    });
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ══ OT-44 · Veri kalitesi bulgusu kararı ═════════════════════════════ */

export async function veriKalitesiBulgusuKapat(girdi: {
  bulguId: string; karar: 'giderildi' | 'kabul_edildi'; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = z.object({
      bulguId: bosluksuz('Bulgu'),
      karar: z.enum(['giderildi', 'kabul_edildi'], 'Geçersiz karar'),
      gerekce: gerekceAlani,
    }).parse(girdi);

    const b = await db.veriKalitesiBulgusu.findUnique({ where: { id: v.bulguId } });
    if (!b) return hata(new Error('Veri kalitesi bulgusu bulunamadı'));
    if (b.durum !== 'acik') return hata(new Error('Bu bulgu zaten kapalı.'));

    /* Kaynağı bir varlıksa tesis kapsamı dayatılır. Kaynağı bir segment
       ya da tesis ise kapsam varlık üzerinden sorulamaz; o kayıtlar
       kurumsaldır ve `envanter/onay` yetkisi yeterlidir. */
    if (b.kaynakTipi === 'Varlik') {
      const varlik = await db.varlik.findUnique({
        where: { id: b.kaynakId }, select: { tesisId: true },
      });
      if (varlik) {
        kapsamZorunlu(k, 'envanter', 'onay', { tesisId: varlik.tesisId },
          'Bu tesis kapsamında veri kalitesi kararı verme yetkiniz yok');
      }
    }

    await db.veriKalitesiBulgusu.update({
      where: { id: v.bulguId }, data: { durum: 'kapandi', kapanis: new Date() },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'VeriKalitesiBulgusu', varlikId: v.bulguId,
      eylem: 'guncelleme', alan: 'durum', once: 'acik', sonra: v.karar, gerekce: v.gerekce,
    });
    revalidatePath('/saglik');
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}
