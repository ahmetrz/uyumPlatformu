'use server';

/* Topoloji sapma eylemleri (P2-2).

   Otomasyon güvenliği sözleşmesi: bu dosyadaki hiçbir eylem ağ, geçit ya da
   varlık kaydını değiştirmez. Yaptıkları tek şey gözlemi kaydetmek, temeli
   İNSAN ONAYIYLA taşımak ve sapmayı karara bağlamaktır.

   Karar yetkisi: `envanter` modülünde `onay`. Gerekçe her kararda ZORUNLU. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import {
  anlikAl, anligiKarsilastir, bulguKaydiAc, incelemeyeAl, mevcutTopolojiOgeleri,
  riskKaydiAc, sapmaKarari, temelBelirle,
} from '../entegrasyon/topoloji';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

const gerekceAlani = bosluksuz('Gerekçe')
  .pipe(z.string().min(10, 'Gerekçe en az 10 karakter olmalı'));

function yenile() {
  revalidatePath('/topoloji');
  revalidatePath('/saglik');
}

/** Kapsam kontrolü: tesisi olmayan (global) kayıt için kapsamsız yetki gerekir. */
function kapsamli(
  k: Awaited<ReturnType<typeof yetkiZorunlu>>,
  islem: 'yazma' | 'onay',
  tesisId: string | null,
): boolean {
  return izinVar(k, 'envanter', islem, tesisId ? { tesisId } : {});
}

/**
 * Onaylı ağ kaydından (CMDB) anlık dondurur. Dış sisteme bağlanmaz; kaynağı
 * açıkça iç kayıttır. Anlık TEMEL OLMAZ — onayı ayrı bir adımdır.
 */
export async function kayittanAnlikAl(girdi: {
  tesisId?: string | null; not?: string | null;
}): Promise<Sonuc & { anlikId?: string; ogeSayisi?: number }> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma',
      girdi.tesisId ? { tesisId: girdi.tesisId } : {});
    const tesisId = girdi.tesisId ?? null;
    const ogeler = await mevcutTopolojiOgeleri(tesisId);
    if (ogeler.length === 0) {
      // Boş küme "topoloji boş" demektir; kastedilen o değil — açıkça söyle.
      return { ok: false, hata: 'Kayıtlı ağ topolojisi boş — anlık alınacak bölge/varlık yok.' };
    }
    const sonuc = await anlikAl(tesisId, 'cmdb_kayit', ogeler, { not: girdi.not ?? null });
    await iz({
      aktorId: k.id, varlikTipi: 'TopolojiAnlik', varlikId: sonuc.id,
      eylem: 'olusturma', alan: 'anlik',
      sonra: `${sonuc.ogeSayisi} öğe · ${sonuc.ozetHash.slice(0, 12)}`,
      gerekce: girdi.not ?? null,
    });
    yenile();
    return { ok: true, anlikId: sonuc.id, ogeSayisi: sonuc.ogeSayisi };
  } catch (e) { return hata(e); }
}

/**
 * Anlığı TEMEL yapar. İlk anlık dahi kendiliğinden temel olmaz — bu eylem
 * insanın onayıdır ve `envanter/onay` yetkisi ister.
 */
export async function temelOlarakOnayla(girdi: {
  anlikId: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({ anlikId: z.string().min(1), gerekce: gerekceAlani }).parse(girdi);
    const anlik = await db.topolojiAnlik.findUniqueOrThrow({ where: { id: v.anlikId } });
    const k = await yetkiZorunlu('envanter', 'onay',
      anlik.tesisId ? { tesisId: anlik.tesisId } : {});
    if (!kapsamli(k, 'onay', anlik.tesisId))
      return { ok: false, hata: 'Bu tesis kapsamında topoloji onay yetkiniz yok' };

    const { dusenTemelId } = await temelBelirle(v.anlikId, k.id, v.gerekce);
    await iz({
      aktorId: k.id, varlikTipi: 'TopolojiAnlik', varlikId: v.anlikId,
      eylem: 'onay', alan: 'temelMi',
      once: dusenTemelId ? `önceki temel: ${dusenTemelId}` : 'temel yoktu',
      sonra: 'temel', gerekce: v.gerekce,
    });
    yenile();
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Anlığı yürürlükteki temelle karşılaştırır ve sapmaları yazar.
 *
 * Karşılaştırma bir KARAR DEĞİLDİR: yalnız farkı yazar, hiçbir sapmayı
 * kapatmaz, hiçbir kaydı açmaz. Yazılan her sapma 'gozlendi' doğar.
 *
 * Sonuç FARK ÇIKMASA DA denetim izine yazılır. Sebep: /topoloji ekranı
 * "sapma yok — son karşılaştırma X" diyebilmek için karşılaştırmanın
 * yapıldığına dair kanıt arar; kanıt yoksa "bilinmiyor" der. İz olmadan
 * hiç karşılaştırılmamış bir anlık ile farkı çıkmamış bir anlık aynı boş
 * listeyle görünür ve ölçülmemiş sıfır "temiz" diye okunurdu.
 */
export async function anligiKarsilastirEylem(girdi: { anlikId: string }): Promise<
  Sonuc & { durum?: string; yazilan?: number }
> {
  try {
    const v = z.object({ anlikId: z.string().min(1) }).parse(girdi);
    const anlik = await db.topolojiAnlik.findUniqueOrThrow({ where: { id: v.anlikId } });
    const k = await yetkiZorunlu('envanter', 'yazma',
      anlik.tesisId ? { tesisId: anlik.tesisId } : {});
    const sonuc = await anligiKarsilastir(v.anlikId);
    if (sonuc.durum === 'temel_yok') {
      // İz YAZILMAZ: karşılaştırma yapılmadı. Yazılsaydı ekran bunu
      // "karşılaştırıldı, fark yok" sanardı.
      return { ok: false, hata: 'Onaylı topoloji temeli yok — sapma hesaplanmadı. Önce bir anlığı temel olarak onaylayın.' };
    }
    await iz({
      aktorId: k.id, varlikTipi: 'TopolojiAnlik', varlikId: v.anlikId,
      eylem: 'karsilastirma', alan: 'sapmalar',
      once: sonuc.temelAnlikId ? `temel: ${sonuc.temelAnlikId}` : null,
      sonra: `${sonuc.durum} · ${sonuc.yazilan} sapma yazıldı`,
    });
    yenile();
    return { ok: true, durum: sonuc.durum, yazilan: sonuc.yazilan };
  } catch (e) { return hata(e); }
}

/** gozlendi → inceleme. Karar değildir; gerekçe istemez. */
export async function sapmayiIncelemeyeAl(girdi: { sapmaId: string }): Promise<Sonuc> {
  try {
    const v = z.object({ sapmaId: z.string().min(1) }).parse(girdi);
    const s = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: v.sapmaId } });
    const k = await yetkiZorunlu('envanter', 'yazma', s.tesisId ? { tesisId: s.tesisId } : {});
    if (!kapsamli(k, 'yazma', s.tesisId))
      return { ok: false, hata: 'Bu tesis kapsamında yetkiniz yok' };
    await incelemeyeAl(v.sapmaId, k.id);
    await iz({
      aktorId: k.id, varlikTipi: 'TopolojiSapmasi', varlikId: v.sapmaId,
      eylem: 'durum_degisimi', alan: 'durum', once: 'gozlendi', sonra: 'inceleme',
    });
    yenile();
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Sapma kararı: kabul | ret. GEREKÇE ZORUNLU, `envanter/onay` yetkisi ister.
 * Kabul, anlığın tüm farkları kabul edildiğinde temeli taşır; ret temeli korur.
 * Hiçbir durumda `AgGeciti`/`Varlik` güncellenmez.
 */
export async function sapmaKararVer(girdi: {
  sapmaId: string; karar: 'kabul' | 'ret'; gerekce: string;
}): Promise<Sonuc & { temelGuncellendi?: boolean; bekleyen?: number }> {
  try {
    const v = z.object({
      sapmaId: z.string().min(1),
      karar: z.enum(['kabul', 'ret'], 'Karar kabul veya ret olmalı'),
      gerekce: gerekceAlani,
    }).parse(girdi);

    const s = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: v.sapmaId } });
    const k = await yetkiZorunlu('envanter', 'onay', s.tesisId ? { tesisId: s.tesisId } : {});
    if (!kapsamli(k, 'onay', s.tesisId))
      return { ok: false, hata: 'Bu tesis kapsamında topoloji karar yetkiniz yok' };

    const sonuc = await sapmaKarari({
      sapmaId: v.sapmaId, karar: v.karar, kararVerenId: k.id, gerekce: v.gerekce,
    });
    await iz({
      aktorId: k.id, varlikTipi: 'TopolojiSapmasi', varlikId: v.sapmaId,
      eylem: 'durum_degisimi', alan: 'durum', once: s.durum, sonra: v.karar,
      gerekce: v.gerekce,
    });
    if (sonuc.temelGuncellendi) {
      await iz({
        aktorId: k.id, varlikTipi: 'TopolojiAnlik', varlikId: s.anlikId,
        eylem: 'onay', alan: 'temelMi',
        once: sonuc.dusenTemelId ? `önceki temel: ${sonuc.dusenTemelId}` : 'temel yoktu',
        sonra: 'temel', gerekce: v.gerekce,
      });
    }
    yenile();
    return { ok: true, temelGuncellendi: sonuc.temelGuncellendi, bekleyen: sonuc.bekleyen };
  } catch (e) { return hata(e); }
}

/**
 * Kritik sapmanın risk ADAYINI gerçek risk kaydına çevirir — bunu YALNIZ
 * insan yapar. Motor bu eylemi çağırmaz; `uretilenRiskId` ancak burada dolar.
 */
export async function sapmadanRiskAc(girdi: {
  sapmaId: string; kod: string; baslik?: string; sahipId?: string | null; gerekce: string;
}): Promise<Sonuc & { riskId?: string }> {
  try {
    const v = z.object({
      sapmaId: z.string().min(1),
      kod: bosluksuz('Risk kodu'),
      baslik: z.string().trim().optional(),
      sahipId: z.string().nullable().optional(),
      gerekce: gerekceAlani,
    }).parse(girdi);

    const s = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: v.sapmaId } });
    const k = await yetkiZorunlu('risk', 'yazma', s.tesisId ? { tesisId: s.tesisId } : {});
    if (s.tesisId && !izinVar(k, 'risk', 'yazma', { tesisId: s.tesisId }))
      return { ok: false, hata: 'Bu tesis kapsamında risk yazma yetkiniz yok' };

    const { riskId, kod } = await riskKaydiAc(v.sapmaId, k.id, {
      kod: v.kod, baslik: v.baslik, sahipId: v.sahipId ?? null, gerekce: v.gerekce,
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Risk', varlikId: riskId, eylem: 'olusturma',
      sonra: kod, gerekce: `Topoloji sapmasından açıldı (${v.sapmaId}): ${v.gerekce}`,
    });
    yenile();
    revalidatePath('/riskler');
    return { ok: true, riskId };
  } catch (e) { return hata(e); }
}

/** Kritik sapmanın bulgu ADAYINI gerçek bulguya çevirir — yalnız insan. */
export async function sapmadanBulguAc(girdi: {
  sapmaId: string; maddeDurumuId: string; baslik?: string;
  sorumluId?: string | null; gerekce: string;
}): Promise<Sonuc & { bulguId?: string }> {
  try {
    const v = z.object({
      sapmaId: z.string().min(1),
      maddeDurumuId: z.string().min(1, 'Madde durumu zorunlu'),
      baslik: z.string().trim().optional(),
      sorumluId: z.string().nullable().optional(),
      gerekce: gerekceAlani,
    }).parse(girdi);

    const durum = await db.maddeDurumu.findUniqueOrThrow({
      where: { id: v.maddeDurumuId }, select: { tesisId: true, surecId: true } });
    const k = await yetkiZorunlu('uyum', 'yazma',
      { tesisId: durum.tesisId, surecId: durum.surecId });

    const { bulguId } = await bulguKaydiAc(v.sapmaId, k.id, {
      maddeDurumuId: v.maddeDurumuId, baslik: v.baslik,
      sorumluId: v.sorumluId ?? null, gerekce: v.gerekce,
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Bulgu', varlikId: bulguId, eylem: 'olusturma',
      gerekce: `Topoloji sapmasından açıldı (${v.sapmaId}): ${v.gerekce}`,
    });
    yenile();
    revalidatePath('/bulgular');
    return { ok: true, bulguId };
  } catch (e) { return hata(e); }
}
