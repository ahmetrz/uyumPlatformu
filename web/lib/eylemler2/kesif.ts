'use server';

/* Varlık keşfi eylemleri (P2-1) — eşleştirme geçişi, elle aktarım ve
   keşif kuyruğunun insan kararları.

   Bu dosya connector KOŞTURMAZ: senkronizasyon çekirdeği
   (`lib/entegrasyon/cekirdek.ts`) ve onun eylemi
   (`lib/eylemler2/entegrasyon.ts → connectorSenkronize`) o işi yapar ve
   keşif kayıtlarını `normalize` durumunda bırakır. Buradaki
   `kesifEslestir` o kayıtları CMDB ile eşleştirip `eslesti` /
   `inceleme_bekliyor` durumuna taşır; karar hâlâ insanındır.

   Değişmezler:
   · Otomasyon ÖNERİR: eşleştirme hiçbir kaydı CMDB'ye yazmaz. Yazma
     yalnız `kesifKarariVer` / `kesifTopluKarar` üzerinden, `envanter/onay`
     yetkisiyle ve gerekçeyle olur.
   · Toplu karar VAR, "hepsini onayla" YOK: id listesi açıkça verilir, her
     kayıt kendi denetim izi satırını bırakır, biri başarısız olursa
     diğerleri geri alınmaz — sonuç kayıt bazında raporlanır.
   · PASSIVE-FIRST: elle aktarım yalnız verilen metni ayrıştırır; ağa
     hiçbir paket çıkmaz, tarama başlatılmaz.
   Kalıp: yetkiZorunlu → zod → db → iz → revalidatePath. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import { elleAktarimAdaptoru } from '../entegrasyon/adaptorler/elleAktarim';
import {
  bekleyenleriEslestir, kesfiIsle, kesifKararUygula,
  type KesifIsleOzeti, type KesifKarari,
} from '../entegrasyon/kesif';
import type { AdaptorBaglami } from '../entegrasyon/sozlesme';
import { zinciriCalistir } from '../entegrasyon/zincir';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

const YOL = '/kesif';

function ozetCumlesi(o: KesifIsleOzeti): string {
  return `alınan ${o.alinan} · kabul ${o.kabulEdilen} · yeni ${o.yeni} · `
    + `yinelenen ${o.yinelenen} · eşleşen ${o.eslesen} · inceleme ${o.incelemeBekleyen}`
    + (o.cakisan > 0 ? ` · çakışan ${o.cakisan}` : '')
    + (o.reddedilen > 0 ? ` · reddedilen ${o.reddedilen}` : '');
}

/* ═══ 1 · Eşleştirme geçişi ═══════════════════════════════════════════ */

/**
 * Bekleyen keşif kayıtlarını CMDB ile eşleştirir (normalize → eslesti /
 * inceleme_bekliyor). Hiçbir kayıt CMDB'ye yazılmaz; yalnız aday ve güven
 * skoru üretilir. Yeniden çalıştırılabilir ve karara bağlanmış kayda
 * dokunmaz.
 */
export async function kesifEslestir(girdi: { kaynak?: string } = {}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const kaynak = girdi.kaynak?.trim() || undefined;
    const ozet = await bekleyenleriEslestir({ kaynak });
    await iz({
      aktorId: k.id, varlikTipi: 'KesifKaydi', varlikId: kaynak ?? 'tumu',
      eylem: 'guncelleme', alan: 'eslesme',
      sonra: `bakılan ${ozet.bakilan} · eşleşen ${ozet.eslesen} · `
        + `inceleme ${ozet.incelemeBekleyen} · çakışan ${ozet.cakisan}`
        + (ozet.atlanan.length > 0 ? ` · atlanan ${ozet.atlanan.length}` : ''),
      gerekce: 'Keşif eşleştirme geçişi (öneri üretir, CMDB\'ye yazmaz)',
    });
    revalidatePath(YOL);
    return tamam();
  } catch (e) { return hata(e); }
}

/* ═══ 2 · Elle aktarım ════════════════════════════════════════════════ */

const ElleAktarimSemasi = z.object({
  kaynakSistem: bosluksuz('Kaynak sistem'),
  bicim: z.enum(['csv', 'json']).optional(),
  icerik: z.string().min(1, 'İçerik boş olamaz'),
  kimlikKolonu: z.string().trim().optional(),
});

/**
 * Yapıştırılan CSV/JSON içeriğini keşif kuyruğuna işler ve eşleştirir.
 *
 * Dış sistem gerektirmeyen tek keşif yolu budur ve pasiftir: ağa hiçbir
 * paket çıkmaz, yalnız verilen metin ayrıştırılır.
 *
 * `dosyaYolu` BİLEREK dışarıda bırakıldı: eylem katmanından sunucu dosya
 * yolu kabul etmek, yetkili bir kullanıcıya keyfî dosya okuma yeteneği
 * verirdi. Dosya tabanlı kaynak yalnız `Connector.yapilandirmaJson`
 * üzerinden, connector kurulum yetkisiyle tanımlanır.
 */
export async function elleAktarimCalistir(girdi: {
  kaynakSistem: string; bicim?: 'csv' | 'json';
  icerik: string; kimlikKolonu?: string;
}): Promise<Sonuc> {
  let kosuId: string | null = null;
  const basla = Date.now();
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = ElleAktarimSemasi.parse(girdi);

    const kosu = await db.entegrasyonKosusu.create({
      data: { kaynak: 'manual_import', tetikleyen: 'manuel', guvenEtiketi: 'otomatik' },
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
    // kaynak verilmiyor: `koken.kaynakSistem` tekillik anahtarı olur —
    // senkronizasyon çekirdeğiyle aynı anahtar, iki yol tek satır açar.
    const ozet = await kesfiIsle(dogrulama.gecerli, { kosuId: kosu.id });
    const toplamRed = ozet.reddedilen + dogrulama.reddedilen.length;
    const ilkRedSebebi = ozet.reddedilenler[0]?.sebep
      ?? dogrulama.reddedilen[0]?.sebep ?? null;

    await db.entegrasyonKosusu.update({
      where: { id: kosu.id },
      data: {
        durum: 'basarili', bitis: new Date(), sureMs: Date.now() - basla,
        kayitSayisi: ozet.kabulEdilen, alinan: ozet.alinan,
        kabulEdilen: ozet.kabulEdilen, reddedilen: toplamRed,
        yinelenen: ozet.yinelenen, imlecSonra: cekme.yeniImlec,
        // Hata DEĞİL, açıklama: kaç kayıt neden reddedildi.
        ayrinti: ozetCumlesi(ozet)
          + (ilkRedSebebi ? ` · ilk ret sebebi: ${ilkRedSebebi}` : ''),
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'EntegrasyonKosusu', varlikId: kosu.id,
      eylem: 'olusturma', alan: 'elle_aktarim', sonra: ozetCumlesi(ozet),
      gerekce: `Elle aktarım: ${v.kaynakSistem}`,
    });

    revalidatePath(YOL); revalidatePath('/saglik');
    if (ozet.kabulEdilen === 0) {
      return {
        ok: false,
        hata: `Hiçbir satır kabul edilmedi (alınan ${ozet.alinan}).`
          + (ilkRedSebebi ? ` İlk sebep: ${ilkRedSebebi}` : ''),
      };
    }
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
      // CMDB'ye yazılan her alan ayrı iz bırakır; KORUNAN alanlar da yazılır —
      // "keşif farklı söyledi ama insan değeri kaldı" bilgisi kaybolmasın.
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

    /* CMDB'ye gerçekten yazıldıysa motor zincirini tetikle: yeni varlık
       veri kalitesi kurallarını, yedek/etki zincirini ve gap-to-action'ı
       ilgilendirir. Zincir FIRLATMAZ — başarısız motor kendi IsKosusu
       satırını bırakır ve /saglik'te görünür; onay bu yüzden geri alınmaz. */
    if (sonuc.varlikId) await zinciriCalistir({ degisenler: { varlik: true } });

    revalidatePath(YOL); revalidatePath('/envanter'); revalidatePath('/saglik');
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
    let cmdbYazildi = false;
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
        if (sonuc.varlikId) cmdbYazildi = true;
        basarili += 1;
      } catch (e) {
        basarisiz.push(`${kesifId}: ${e instanceof Error ? e.message : 'hata'}`);
      }
    }

    // Zincir kayıt başına değil, TOPLU KARARIN SONUNDA bir kez koşar:
    // motorlar tam tarama yapıyor, 25 kayıt için 25 tarama israf olurdu.
    if (cmdbYazildi) await zinciriCalistir({ degisenler: { varlik: true } });

    revalidatePath(YOL); revalidatePath('/envanter'); revalidatePath('/saglik');
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
