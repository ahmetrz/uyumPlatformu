'use server';

/* ═══ R10+ · TAKVİM TETİKLİ YÜKÜMLÜLÜK · İNSAN KARARLARI ═══════════════

   Olay tarafındaki `bildirimKaydi.ts` ile BİREBİR aynı sözleşme; farklı
   olan yalnız yükümlülüğün nereden doğduğudur. Motor dönemi AÇAR ve
   süresi geçtiğini yazar; buradaki üç eylem motorun yapamadıklarıdır:

     verildi işaretle     → REFERANS NUMARASI zorunlu
     teyit işaretle       → yalnız verilmiş bir rapora
     uygulanmaz işaretle  → GEREKÇE zorunlu

   ── KAPSAM: TAKVİM YÜKÜMLÜLÜĞÜ KURUMSALDIR ────────────────────────────
   `BildirimYukumlulugu` bir tesise bağlı DEĞİLDİR: düzenleyiciye verilen
   yıllık öz denetim raporu KURUMUN raporudur, tek bir tesisin değil. Bu
   yüzden
   kapı KAPSAMSIZ sorulur (`izinVar(k, 'uyum', 'onay')`) ve `kapsamUyar`
   gereği tesise kısıtlı rol geçmez — ekranın kapısıyla birebir aynı
   kural. Tek tesise yetkili bir dış denetçinin kurumun EPDK raporlama
   durumunu görmesi, kapsam sınırını takvim üzerinden delmek olurdu
   (#48'in dışa aktarım bulgusunun aynısı, başka bir yüzeyde).

   ── EŞZAMANLILIK ──────────────────────────────────────────────────────
   Kapı okumayı işlem DIŞINDA yapar; yazma `updateMany` ile BEKLENEN
   duruma koşullanır. İki onaycı aynı dönemde biri "verildi" öbürü
   "uygulanmaz" derse kaybeden sessizce ezilmez, "yeniden bakın" der
   (#47 turu 2 bulgusu; `tests/bildirim-donemi-eylem.test.ts`).

   Kalıp: yetki → dönem oku → kapı → koşullu yaz + iz (TEK işlem). */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import {
  DONEM_DURUM_SOZU, donemTeyitKapisi, donemUygulanmazKapisi, verildiKapisi,
} from '../uyum/bildirimDonemi';
import { type Sonuc, tamam, hata, iz, bosluksuz, type IzIstemcisi } from './ortak';

/** Ekranın yolu — üç eylem de aynı yüzeyi tazeler. */
const YOL = '/raporlar/takvim';

const ARADA_DEGISTI = 'Bu dönem siz bakarken değişti — ekranı yenileyip yeniden'
  + ' bakın. Aynı raporlama dönemi üzerinde başka biri karar vermiş olabilir.';

/**
 * Dönemi ve yetkiyi birlikte çözer.
 *
 * Yetki `uyum/onay`: bir mevzuat raporunun verildiğini beyan etmek
 * kurumun yasal yükümlülüğü hakkında söz söylemektir ve yazma yetkisiyle
 * yapılmaz. Kapsam KAPSAMSIZ sorulur (dosya başındaki gerekçe).
 */
async function donemKapisi(donemId: string) {
  const k = await yetkiZorunlu('uyum', 'onay');
  const donem = await db.bildirimDonemi.findUnique({
    where: { id: donemId },
    select: {
      id: true, durum: true, donemEtiketi: true, referansNo: true,
      yukumluluk: { select: { kod: true, ad: true, merci: true } },
    },
  });
  if (!donem) throw new Error('Raporlama dönemi bulunamadı');
  return { k, donem };
}

/** Yalnız BEKLENEN durumdayken yazar; yazamazsa işlemi geri alır. */
async function durumKorumaliYaz(
  tx: IzIstemcisi, donemId: string, beklenen: string, veri: Record<string, unknown>,
) {
  const { count } = await tx.bildirimDonemi.updateMany({
    where: { id: donemId, durum: beklenen },
    data: veri,
  });
  if (count === 0) throw new Error(ARADA_DEGISTI);
}

/** Denetim izi — durum geçişi ADIYLA yazılır. İŞLEM İÇİNDE çağrılır. */
async function izYaz(tx: IzIstemcisi, o: {
  aktorId: string; donemId: string; once: string; sonra: string; gerekce: string;
}) {
  await iz({
    aktorId: o.aktorId,
    varlikTipi: 'BildirimDonemi',
    varlikId: o.donemId,
    eylem: 'guncelleme',
    alan: 'durum',
    once: o.once,
    sonra: o.sonra,
    gerekce: o.gerekce,
  }, tx);
}

const sozu = (d: string) => DONEM_DURUM_SOZU[d as keyof typeof DONEM_DURUM_SOZU] ?? d;

/**
 * Dönem raporunun VERİLDİĞİNİ işaretler — referans numarası zorunlu.
 *
 * `suresi_gecti` bir dönemde de verilebilir: gecikmiş bir rapor verilmiş
 * sayılmalıdır ve gecikme izde durur. Kapatan şey teslimin kendisidir,
 * zamanında olması değil.
 */
export async function donemVerildiIsaretle(girdi: {
  donemId: string;
  referansNo: string;
  kanitId?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      donemId: bosluksuz('Dönem').max(64),
      /* Boşluk kuralı BURADA DEĞİL `verildiKapisi`nda: zod'un genel "boş
         olamaz" mesajı kapının gerekçesinin önüne geçerdi. Bir kural,
         bir yer. */
      referansNo: z.string().trim().max(120),
      kanitId: z.string().trim().max(64).nullable().optional(),
    }).parse(girdi);

    const { k, donem } = await donemKapisi(v.donemId);

    const kapi = verildiKapisi({ mevcutDurum: donem.durum, referansNo: v.referansNo });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    if (v.kanitId) {
      const kanit = await db.kanit.findUnique({ where: { id: v.kanitId }, select: { id: true } });
      if (!kanit) throw new Error('Teslim kanıtı bulunamadı');
    }

    await db.$transaction(async (tx) => {
      await durumKorumaliYaz(tx, donem.id, donem.durum, {
        durum: 'verildi',
        referansNo: v.referansNo.trim(),
        verenId: k.id,
        verilmeZamani: new Date(),
        kanitId: v.kanitId || null,
      });
      await izYaz(tx, {
        aktorId: k.id,
        donemId: donem.id,
        once: sozu(donem.durum),
        sonra: DONEM_DURUM_SOZU.verildi,
        gerekce: `${donem.yukumluluk.kod} · ${donem.donemEtiketi} dönemi`
          + ` · ${donem.yukumluluk.merci} · referans ${v.referansNo.trim()}`
          /* Gecikmeli teslim izde ADIYLA durur: "verildi" tek başına
             zamanında verildiği anlamına gelmemeli. */
          + (donem.durum === 'suresi_gecti' ? ' · SÜRESİ GEÇTİKTEN SONRA' : '')
          + (v.kanitId ? ' · kanıt bağlandı' : ' · kanıt bağlanmadı'),
      });
    });

    revalidatePath(YOL);
    return tamam();
  } catch (e) {
    return hata(e);
  }
}

/** Mercinin TEYİDİNİ işler — yalnız verilmiş bir rapora. */
export async function donemTeyitIsaretle(girdi: { donemId: string }): Promise<Sonuc> {
  try {
    const v = z.object({ donemId: bosluksuz('Dönem').max(64) }).parse(girdi);
    const { k, donem } = await donemKapisi(v.donemId);

    const kapi = donemTeyitKapisi({ mevcutDurum: donem.durum });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    await db.$transaction(async (tx) => {
      await durumKorumaliYaz(tx, donem.id, donem.durum,
        { durum: 'teyit_alindi', teyitZamani: new Date() });
      await izYaz(tx, {
        aktorId: k.id,
        donemId: donem.id,
        once: DONEM_DURUM_SOZU.verildi,
        sonra: DONEM_DURUM_SOZU.teyit_alindi,
        gerekce: `${donem.yukumluluk.kod} · ${donem.donemEtiketi} dönemi`
          + ` · teslim referansı ${donem.referansNo ?? 'YOK'}`,
      });
    });

    revalidatePath(YOL);
    return tamam();
  } catch (e) {
    return hata(e);
  }
}

/**
 * Dönemi "uygulanmaz" olarak kapatır — GEREKÇE ZORUNLU.
 *
 * Dönem SİLİNMEZ: silinseydi denetçi "bu raporlama dönemi neden boş"
 * sorusunun cevabını hiçbir yerde bulamazdı. Kapsam dışı kalmış bir yıl
 * ile hiç açılmamış bir yıl ekranda da kütükte de ayrı durur.
 */
export async function donemUygulanmazIsaretle(girdi: {
  donemId: string;
  gerekce: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      donemId: bosluksuz('Dönem').max(64),
      gerekce: z.string().trim().max(1000),
    }).parse(girdi);

    const { k, donem } = await donemKapisi(v.donemId);

    const kapi = donemUygulanmazKapisi({ mevcutDurum: donem.durum, gerekce: v.gerekce });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    await db.$transaction(async (tx) => {
      await durumKorumaliYaz(tx, donem.id, donem.durum,
        { durum: 'uygulanmaz', uygulanmazGerekcesi: v.gerekce.trim() });
      await izYaz(tx, {
        aktorId: k.id,
        donemId: donem.id,
        once: sozu(donem.durum),
        sonra: DONEM_DURUM_SOZU.uygulanmaz,
        gerekce: `${donem.yukumluluk.kod} · ${donem.donemEtiketi} dönemi`
          + ` · ${v.gerekce.trim()}`,
      });
    });

    revalidatePath(YOL);
    return tamam();
  } catch (e) {
    return hata(e);
  }
}
