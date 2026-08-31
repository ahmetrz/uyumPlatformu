'use server';

/* Varlık keşfi eylemleri (P2-1) — connector koşusu, elle aktarım ve
   keşif kuyruğunun insan kararları.

   Değişmezler:
   · Otomasyon ÖNERİR: hiçbir eylem keşif kaydını kendi kendine CMDB'ye
     yazmaz. Yazma yalnız `kesifKarariVer` / `kesifTopluKarar` üzerinden,
     `envanter/onay` yetkisiyle ve gerekçeyle olur.
   · Toplu karar VAR, "hepsini onayla" YOK: id listesi açıkça verilir,
     her kayıt kendi denetim izi satırını bırakır, ilk hata diğerlerini
     geri almaz — sonuçlar tek tek raporlanır.
   · Sessiz hata yok: her koşu bir EntegrasyonKosusu satırı bırakır,
     bağlanamayan adaptör "başarılı" numarası yapmaz.
   · Sır istemciye GELMEZ, loglanmaz: yalnız `siriCoz()` ile çözülür ve
     adaptör bağlamında kalır.
   Kalıp: yetkiZorunlu → zod → db → iz → revalidatePath. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import { adaptorGetir, adaptorGerekeni } from '../entegrasyon/adaptorler';
import { elleAktarimAdaptoru } from '../entegrasyon/adaptorler/elleAktarim';
import { siriCoz } from '../entegrasyon/sir';
import {
  kesfiIsle, kesifKararUygula, type KesifKarari, type KesifIsleOzeti,
} from '../entegrasyon/kesif';
import type { AdaptorBaglami } from '../entegrasyon/sozlesme';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

const YOL = '/kesif';

/* `Connector.tip` → `KesifKaydi.kaynak` kategorisi (şemadaki sözlük).
   Aynı tipte birden çok kurulum varsa (iki ayrı Claroty konsolu gibi)
   `yapilandirma.kesifKaynagi` ile ayrıştırılır; aksi hâlde iki konsolun
   aynı varlık kimliği (kaynak, kaynakKayitId) tekilliğinde çakışır. */
const KAYNAK_KATEGORISI: Record<string, string> = {
  ad_entra: 'vendor_export',
  vuln_scanner: 'vendor_export',
  edr: 'vendor_export',
  siem: 'siem',
  backup: 'vendor_export',
  network_firewall: 'firewall',
  ot_discovery: 'scada_export',
  manual_import: 'csv',
};

function yapilandirmaCoz(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const n: unknown = JSON.parse(json);
    return n && typeof n === 'object' && !Array.isArray(n) ? n as Record<string, unknown> : {};
  } catch {
    throw new Error('Connector yapılandırması geçerli JSON değil');
  }
}

function ozetCumlesi(o: KesifIsleOzeti): string {
  return `alınan ${o.alinan} · kabul ${o.kabulEdilen} · yeni ${o.yeni} · `
    + `yinelenen ${o.yinelenen} · eşleşen ${o.eslesen} · inceleme ${o.incelemeBekleyen}`
    + (o.cakisan > 0 ? ` · çakışan ${o.cakisan}` : '')
    + (o.reddedilen > 0 ? ` · reddedilen ${o.reddedilen}` : '');
}

/* ═══ 1 · Connector koşusu ════════════════════════════════════════════ */

/**
 * Bir connector'ı bir kez çalıştırır (elle tetikleme).
 *
 * Adaptör bağlı değilse koşu `kimlik_bekleniyor` durumuyla kapanır —
 * "başarılı" yazılmaz, boş sonuç "hiç kayıt yok" diye gösterilmez.
 */
export async function connectorKosusuCalistir(girdi: { kod: string }): Promise<Sonuc> {
  let kosuId: string | null = null;
  const basla = Date.now();
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const kod = bosluksuz('Connector kodu').parse(girdi.kod);

    const connector = await db.connector.findUnique({ where: { kod } });
    if (!connector || connector.silindi) throw new Error(`Connector bulunamadı: ${kod}`);
    if (!connector.etkin) throw new Error(`Connector etkin değil: ${kod}`);

    const adaptor = adaptorGetir(connector.tip);
    const yapilandirma = yapilandirmaCoz(connector.yapilandirmaJson);

    const kosu = await db.entegrasyonKosusu.create({
      data: {
        kaynak: connector.tip, connectorId: connector.id, tetikleyen: 'manuel',
        guvenEtiketi: 'otomatik', imlecOnce: connector.imlec,
      },
      select: { id: true },
    });
    kosuId = kosu.id;

    if (!adaptor.baglanabilir) {
      const gereken = adaptorGerekeni(adaptor) ?? 'gerçek credential/API';
      const mesaj = `Bağlı değil — gereken: ${gereken}`;
      await db.entegrasyonKosusu.update({
        where: { id: kosu.id },
        data: {
          durum: 'kimlik_bekleniyor', bitis: new Date(),
          sureMs: Date.now() - basla, hata: mesaj,
        },
      });
      await db.connector.update({
        where: { id: connector.id }, data: { sonHata: mesaj },
      });
      revalidatePath(YOL); revalidatePath('/saglik');
      return { ok: false, hata: `${connector.ad}: ${mesaj}` };
    }

    // Sır yalnız burada çözülür; değeri loglanmaz, yanıta konmaz.
    let sir: string | null = null;
    if (connector.sirReferansi) {
      const cozum = await siriCoz(connector.sirReferansi);
      if (!cozum.ok) throw new Error(`Sır çözülemedi: ${cozum.hata}`);
      sir = cozum.deger;
    }

    const baglam: AdaptorBaglami = {
      connectorId: connector.id, kod: connector.kod,
      kaynakSistem: connector.kaynakSistem, yapilandirma, sir, imlec: connector.imlec,
    };

    const cekme = await adaptor.fetchChanges(baglam);
    const dogrulama = adaptor.validate(cekme.gozlemler);
    const kaynak = typeof yapilandirma.kesifKaynagi === 'string' && yapilandirma.kesifKaynagi
      ? yapilandirma.kesifKaynagi
      : KAYNAK_KATEGORISI[connector.tip] ?? connector.tip;

    const ozet = await kesfiIsle(dogrulama.gecerli, {
      kaynak, connectorId: connector.id, kosuId: kosu.id,
    });
    const toplamRed = ozet.reddedilen + dogrulama.reddedilen.length;

    await db.entegrasyonKosusu.update({
      where: { id: kosu.id },
      data: {
        durum: 'basarili', bitis: new Date(), sureMs: Date.now() - basla,
        kayitSayisi: ozet.kabulEdilen, alinan: ozet.alinan,
        kabulEdilen: ozet.kabulEdilen, reddedilen: toplamRed,
        yinelenen: ozet.yinelenen, imlecSonra: cekme.yeniImlec,
      },
    });
    await db.connector.update({
      where: { id: connector.id },
      data: { sonBasariliKosu: new Date(), imlec: cekme.yeniImlec, sonHata: null },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Connector', varlikId: connector.id,
      eylem: 'guncelleme', alan: 'kosu', sonra: ozetCumlesi(ozet),
      gerekce: `Elle tetiklenen keşif koşusu (${connector.kod})`,
    });

    revalidatePath(YOL); revalidatePath('/saglik');
    return tamam();
  } catch (e) {
    // Sessiz hata yok: koşu satırı açıldıysa başarısız olarak kapanır.
    if (kosuId) {
      await db.entegrasyonKosusu.update({
        where: { id: kosuId },
        data: {
          durum: 'basarisiz', bitis: new Date(), sureMs: Date.now() - basla,
          hata: e instanceof Error ? e.message : String(e),
        },
      }).catch(() => undefined);
    }
    revalidatePath('/saglik');
    return hata(e);
  }
}

/* ═══ 2 · Elle aktarım ════════════════════════════════════════════════ */

const ElleAktarimSemasi = z.object({
  kaynakSistem: bosluksuz('Kaynak sistem'),
  kaynak: z.string().trim().min(1).default('csv'),
  bicim: z.enum(['csv', 'json']).optional(),
  icerik: z.string().min(1, 'İçerik boş olamaz'),
  kimlikKolonu: z.string().trim().optional(),
});

/**
 * Yapıştırılan CSV/JSON içeriğini keşif kuyruğuna işler.
 *
 * Bu, dış sistem gerektirmeyen tek keşif yoludur ve pasiftir: ağa hiçbir
 * paket çıkmaz, yalnız verilen metin ayrıştırılır.
 *
 * `dosyaYolu` BİLEREK dışarıda bırakıldı: eylem katmanından sunucu dosya
 * yolu kabul etmek, yetkili bir kullanıcıya keyfî dosya okuma yeteneği
 * verirdi. Dosya tabanlı kaynak yalnız `Connector.yapilandirmaJson`
 * üzerinden, kurulum yetkisiyle tanımlanır.
 */
export async function elleAktarimCalistir(girdi: {
  kaynakSistem: string; kaynak?: string; bicim?: 'csv' | 'json';
  icerik: string; kimlikKolonu?: string;
}): Promise<Sonuc> {
  let kosuId: string | null = null;
  const basla = Date.now();
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = ElleAktarimSemasi.parse(girdi);

    const kosu = await db.entegrasyonKosusu.create({
      data: {
        kaynak: 'manual_import', tetikleyen: 'manuel', guvenEtiketi: 'otomatik',
      },
      select: { id: true },
    });
    kosuId = kosu.id;

    const baglam: AdaptorBaglami = {
      connectorId: '', kod: 'elle_aktarim', kaynakSistem: v.kaynakSistem,
      yapilandirma: {
        bicim: v.bicim, icerik: v.icerik,
        kimlikKolonu: v.kimlikKolonu || undefined,
      },
      sir: null, imlec: null,
    };

    const cekme = await elleAktarimAdaptoru.fetchChanges(baglam);
    const dogrulama = elleAktarimAdaptoru.validate(cekme.gozlemler);
    const ozet = await kesfiIsle(dogrulama.gecerli, {
      kaynak: v.kaynak, kosuId: kosu.id,
    });
    const toplamRed = ozet.reddedilen + dogrulama.reddedilen.length;

    await db.entegrasyonKosusu.update({
      where: { id: kosu.id },
      data: {
        durum: 'basarili', bitis: new Date(), sureMs: Date.now() - basla,
        kayitSayisi: ozet.kabulEdilen, alinan: ozet.alinan,
        kabulEdilen: ozet.kabulEdilen, reddedilen: toplamRed,
        yinelenen: ozet.yinelenen, imlecSonra: cekme.yeniImlec,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'EntegrasyonKosusu', varlikId: kosu.id,
      eylem: 'olusturma', alan: 'elle_aktarim', sonra: ozetCumlesi(ozet),
      gerekce: `Elle aktarım: ${v.kaynakSistem}`,
    });

    revalidatePath(YOL); revalidatePath('/saglik');
    if (ozet.kabulEdilen === 0) {
      return { ok: false, hata: `Hiçbir satır kabul edilmedi (alınan ${ozet.alinan}). `
        + (ozet.reddedilenler[0]?.sebep ? `İlk sebep: ${ozet.reddedilenler[0].sebep}` : '') };
    }
    return tamam();
  } catch (e) {
    if (kosuId) {
      await db.entegrasyonKosusu.update({
        where: { id: kosuId },
        data: {
          durum: 'basarisiz', bitis: new Date(), sureMs: Date.now() - basla,
          hata: e instanceof Error ? e.message : String(e),
        },
      }).catch(() => undefined);
    }
    revalidatePath('/saglik');
    return hata(e);
  }
}

/* ═══ 3 · İnceleme kararları ══════════════════════════════════════════ */

const KARARLAR = ['onayla', 'reddet', 'yeni_varlik'] as const;

const KararSemasi = z.object({
  kesifId: bosluksuz('Keşif kaydı'),
  karar: z.enum(KARARLAR, 'Geçersiz karar'),
  not: bosluksuz('Gerekçe'),
  turId: z.string().trim().optional(),
  etiket: z.string().trim().optional(),
  ad: z.string().trim().optional(),
  tesisId: z.string().trim().optional(),
  uzerineYaz: z.boolean().optional(),
});

/** Kararın tesis kapsamı: eşleşen varlığın tesisi ya da yeni varlığın tesisi. */
async function kararKapsami(kesifId: string, seciliTesisId?: string) {
  const kayit = await db.kesifKaydi.findUnique({
    where: { id: kesifId },
    select: { id: true, durum: true, eslesenVarlik: { select: { tesisId: true } } },
  });
  if (!kayit) throw new Error('Keşif kaydı bulunamadı');
  return { kayit, tesisId: kayit.eslesenVarlik?.tesisId ?? seciliTesisId ?? null };
}

/** Tek kayıt için karar. CMDB'ye yazan tek yol budur. */
export async function kesifKarariVer(girdi: {
  kesifId: string; karar: KesifKarari; not: string;
  turId?: string; etiket?: string; ad?: string; tesisId?: string;
  uzerineYaz?: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay');
    const v = KararSemasi.parse(girdi);
    const { kayit, tesisId } = await kararKapsami(v.kesifId, v.tesisId);
    if (tesisId && !izinVar(k, 'envanter', 'onay', { tesisId })) {
      throw new Error('Bu tesis kapsamında envanter onay yetkiniz yok');
    }

    const sonuc = await kesifKararUygula({
      kesifId: v.kesifId,
      karar: v.karar,
      inceleyenId: k.id,
      not: v.not,
      uzerineYaz: v.uzerineYaz ?? false,
      yeniVarlik: v.karar === 'yeni_varlik'
        ? {
          turId: v.turId ?? '',
          etiket: v.etiket || null,
          ad: v.ad || null,
          tesisId: v.tesisId || null,
        }
        : undefined,
    });

    await iz({
      aktorId: k.id, varlikTipi: 'KesifKaydi', varlikId: v.kesifId,
      eylem: v.karar === 'reddet' ? 'red' : 'onay',
      alan: 'durum', once: kayit.durum,
      sonra: v.karar === 'reddet' ? 'reddedildi' : 'onaylandi',
      gerekce: v.not,
    });
    if (sonuc.varlikId) {
      // CMDB'ye yazılan her alan ayrı iz bırakır; korunan alanlar da yazılır.
      for (const a of sonuc.yazilanAlanlar) {
        await iz({
          aktorId: k.id, varlikTipi: 'Varlik', varlikId: sonuc.varlikId,
          eylem: sonuc.yeniVarlikAcildi ? 'olusturma' : 'guncelleme',
          alan: a.alan, once: a.once, sonra: a.sonra,
          gerekce: `Keşif onayı (${v.kesifId})`,
        });
      }
      for (const a of sonuc.korunanAlanlar) {
        await iz({
          aktorId: k.id, varlikTipi: 'Varlik', varlikId: sonuc.varlikId,
          eylem: 'guncelleme', alan: a.alan, once: a.mevcut, sonra: a.mevcut,
          gerekce: `Keşif farklı değer getirdi (${a.kesif}) — mevcut değer korundu`,
        });
      }
    }

    revalidatePath(YOL); revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

const TOPLU_SINIR = 25;

const TopluSemasi = z.object({
  kesifIdleri: z.array(bosluksuz('Keşif kaydı'))
    .min(1, 'En az bir kayıt seçin')
    .max(TOPLU_SINIR, `Tek seferde en fazla ${TOPLU_SINIR} kayıt`),
  karar: z.enum(['onayla', 'reddet'], 'Toplu kararda yalnız onayla/reddet olur'),
  not: bosluksuz('Gerekçe'),
  uzerineYaz: z.boolean().optional(),
});

/**
 * Toplu karar — "hepsini onayla" DEĞİL.
 *
 * Kayıt kimlikleri çağıran tarafından TEK TEK verilir (filtre gönderilmez),
 * her kayıt kendi işlemi ve kendi denetim izi satırıyla işlenir. Biri
 * başarısız olursa diğerleri geri alınmaz; sonuç kayıt bazında raporlanır.
 * `yeni_varlik` toplu yapılamaz: tür/etiket kayıt bazında insan kararıdır.
 */
export async function kesifTopluKarar(girdi: {
  kesifIdleri: string[]; karar: 'onayla' | 'reddet'; not: string; uzerineYaz?: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay');
    const v = TopluSemasi.parse(girdi);
    const benzersiz = [...new Set(v.kesifIdleri)];

    const basarisiz: string[] = [];
    let basarili = 0;
    for (const kesifId of benzersiz) {
      try {
        const { kayit, tesisId } = await kararKapsami(kesifId);
        if (tesisId && !izinVar(k, 'envanter', 'onay', { tesisId })) {
          throw new Error('tesis kapsamı dışında');
        }
        const sonuc = await kesifKararUygula({
          kesifId, karar: v.karar, inceleyenId: k.id, not: v.not,
          uzerineYaz: v.uzerineYaz ?? false,
        });
        await iz({
          aktorId: k.id, varlikTipi: 'KesifKaydi', varlikId: kesifId,
          eylem: v.karar === 'reddet' ? 'red' : 'onay',
          alan: 'durum', once: kayit.durum,
          sonra: v.karar === 'reddet' ? 'reddedildi' : 'onaylandi',
          gerekce: `${v.not} (toplu karar · ${benzersiz.length} kayıt)`,
        });
        if (sonuc.varlikId) {
          for (const a of sonuc.yazilanAlanlar) {
            await iz({
              aktorId: k.id, varlikTipi: 'Varlik', varlikId: sonuc.varlikId,
              eylem: 'guncelleme', alan: a.alan, once: a.once, sonra: a.sonra,
              gerekce: `Keşif onayı (${kesifId})`,
            });
          }
        }
        basarili += 1;
      } catch (e) {
        basarisiz.push(`${kesifId}: ${e instanceof Error ? e.message : 'hata'}`);
      }
    }

    revalidatePath(YOL); revalidatePath('/envanter');
    if (basarisiz.length > 0) {
      return {
        ok: false,
        hata: `${basarili} kayıt işlendi, ${basarisiz.length} kayıt işlenemedi — `
          + basarisiz.join(' · '),
      };
    }
    return tamam();
  } catch (e) { return hata(e); }
}
