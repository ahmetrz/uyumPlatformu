'use server';

/* ═══ R10 · OLAY → MEVZUAT BİLDİRİMİ · İNSAN KARARLARI ══════════════════

   Motor taslağı açar ve geri sayımı işletir. Buradaki üç eylem motorun
   YAPAMADIĞI şeylerdir ve yapamaması bilinçlidir:

     gönderildi işaretle  → REFERANS NUMARASI zorunlu
     teyit işaretle       → yalnız gönderilmiş bir bildirime
     uygulanmaz işaretle  → GEREKÇE zorunlu

   Resmî bir bildirimin yapıldığını söyleyebilecek tek şey insandır.
   Motorun "gönderildi" yazması, yapılmamış bir bildirimi yapılmış
   göstermek olurdu; ürünün baştan beri reddettiği şey budur.

   ── REFERANS NUMARASI NEDEN ŞART ──────────────────────────────────────
   Referansı olmayan bir gönderim, denetimde "gönderdik" demekten
   ibarettir ve karşı tarafta karşılığı aranamaz. Kayıt ancak referansla
   bir KANIT olur; onsuz bir iddia kalır.

   ── KAPSAM İKİ AŞAMALI ────────────────────────────────────────────────
   Kaydın tesisi olayından gelir ve kayıt okunmadan bilinemez; bu yüzden
   ön kapı `KAPSAM_SONRA` ile açılır (bkz. `olay.ts` · `erisim.ts`) ve
   olay okunduktan sonra kapsam ZORUNLU olarak denetlenir. Tesisi olmayan
   olay kurumsaldır ve kapsamsız yetki ister — "tesis yoksa atla" yazmak,
   tesise kısıtlı rolün bütün tesissiz olaylara dokunmasına yol açardı.

   Kalıp: yetki (kapsam sonra) → kayıt oku → kapsam → kapı → yaz → iz. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import {
  yetkiZorunlu, kapsamZorunlu, izinliTesisIdleri, KAPSAM_SONRA,
} from '../erisim';
import { kapsamAnahtari, kapsamSozlugu, tesisSozlugu } from '../dil/sozlukOku';
import { t } from '../dil/terimler';
import {
  KAYIT_DURUM_SOZU, gonderimKapisi, teyitKapisi, uygulanmazKapisi,
} from '../uyum/bildirimKaydi';
import { type Sonuc, tamam, hata, iz, bosluksuz, type IzIstemcisi } from './ortak';

/** Kaydı, olayını ve kapsam yetkisini birlikte çözer. */
async function kayitKapisi(kayitId: string) {
  const k = await yetkiZorunlu('uyum', 'onay', KAPSAM_SONRA);
  const kayit = await db.bildirimKaydi.findUnique({
    where: { id: kayitId },
    select: {
      id: true, durum: true, referansNo: true,
      olay: { select: { id: true, kod: true, tesisId: true } },
      yukumluluk: { select: { kod: true, ad: true, merci: true } },
    },
  });
  if (!kayit) throw new Error('Bildirim kaydı bulunamadı');
  const sozluk = kayit.olay.tesisId
    ? await tesisSozlugu(kayit.olay.tesisId)
    : await kapsamSozlugu(kapsamAnahtari(izinliTesisIdleri(k, 'uyum')));
  kapsamZorunlu(k, 'uyum', 'onay', { tesisId: kayit.olay.tesisId },
    `Bu ${t(sozluk, 'tesis')} kapsamında yetkiniz yok`);
  return { k, kayit };
}

/* ── YAZMA VE İZ TEK İŞLEMDE ───────────────────────────────────────────
   Bağımsız inceleme bulgusu (P1, #47 turu 1): durum yazımı ile denetim
   izi İKİ ayrı çağrıydı. Aradaki çöküş — ya da better-sqlite3'ün TEK
   bağlantısını paylaşan eşzamanlı bir işlemin geri alınması — kaydı
   "gönderildi · referans dolu" bırakıp izi düşürebilirdi: bir uyum
   ürününde bildirimi KİMİN, NE ZAMAN yaptığını söyleyen tek kayıt odur.
   Ürünün kendi cümlesiyle "kayıt ancak referansla bir KANIT olur";
   kanıtlayan tarafın kendisi sessizce kaybolamaz.

   Emsal aynı depoda duruyordu ve izlenmemişti: `olay.ts` →
   `etkiDogrula`, "Alan yazımı ve denetim izi TEK işlemde: izi düşmeyen
   bir doğrulama kaydı kalamaz." */

/** Denetim izi — durum geçişi ADIYLA yazılır. İŞLEM İÇİNDE çağrılır. */
async function izYaz(tx: IzIstemcisi, o: {
  aktorId: string;
  kayitId: string;
  once: string;
  sonra: string;
  gerekce: string;
}) {
  await iz({
    aktorId: o.aktorId,
    varlikTipi: 'BildirimKaydi',
    varlikId: o.kayitId,
    eylem: 'guncelleme',
    alan: 'durum',
    once: o.once,
    sonra: o.sonra,
    gerekce: o.gerekce,
  }, tx);
}

/**
 * Bildirimin GÖNDERİLDİĞİNİ işaretler.
 *
 * Yetki `uyum/onay`: bir mevzuat bildiriminin yapıldığını beyan etmek,
 * kurumun yasal yükümlülüğü hakkında söz söylemektir ve yazma yetkisiyle
 * yapılmaz.
 */
export async function bildirimGonderildiIsaretle(girdi: {
  kayitId: string;
  referansNo: string;
  kanitId?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      kayitId: bosluksuz('Kayıt').max(64),
      /* Boşluk kuralı BURADA DEĞİL `gonderimKapisi`nda: zod'un genel
         "boş olamaz" mesajı, kapının "referansı olmayan bir gönderim
         denetimde doğrulanamaz" cümlesinin önüne geçerdi. Bir kural,
         bir yer. */
      referansNo: z.string().trim().max(120),
      kanitId: z.string().trim().max(64).nullable().optional(),
    }).parse(girdi);

    const { k, kayit } = await kayitKapisi(v.kayitId);

    const kapi = gonderimKapisi({ mevcutDurum: kayit.durum, referansNo: v.referansNo });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    if (v.kanitId) {
      const kanit = await db.kanit.findUnique({ where: { id: v.kanitId }, select: { id: true } });
      if (!kanit) throw new Error('Gönderim kanıtı bulunamadı');
    }

    await db.$transaction(async (tx) => {
      await tx.bildirimKaydi.update({
        where: { id: kayit.id },
        data: {
          durum: 'gonderildi',
          referansNo: v.referansNo.trim(),
          gonderenId: k.id,
          gonderimZamani: new Date(),
          kanitId: v.kanitId || null,
        },
      });
      await izYaz(tx, {
        aktorId: k.id,
        kayitId: kayit.id,
        once: KAYIT_DURUM_SOZU[kayit.durum as keyof typeof KAYIT_DURUM_SOZU] ?? kayit.durum,
        sonra: KAYIT_DURUM_SOZU.gonderildi,
        gerekce: `${kayit.olay.kod} · ${kayit.yukumluluk.kod} · ${kayit.yukumluluk.merci}`
          + ` · referans ${v.referansNo.trim()}`
          + (v.kanitId ? ' · kanıt bağlandı' : ' · kanıt bağlanmadı'),
      });
    });

    revalidatePath('/olaylar');
    return tamam();
  } catch (e) {
    return hata(e);
  }
}

/** Mercinin TEYİDİNİ işler — yalnız gönderilmiş bir bildirime. */
export async function bildirimTeyitIsaretle(girdi: { kayitId: string }): Promise<Sonuc> {
  try {
    const v = z.object({ kayitId: bosluksuz('Kayıt').max(64) }).parse(girdi);
    const { k, kayit } = await kayitKapisi(v.kayitId);

    const kapi = teyitKapisi({ mevcutDurum: kayit.durum });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    await db.$transaction(async (tx) => {
      await tx.bildirimKaydi.update({
        where: { id: kayit.id },
        data: { durum: 'teyit_alindi', teyitZamani: new Date() },
      });
      await izYaz(tx, {
        aktorId: k.id,
        kayitId: kayit.id,
        once: KAYIT_DURUM_SOZU.gonderildi,
        sonra: KAYIT_DURUM_SOZU.teyit_alindi,
        gerekce: `${kayit.olay.kod} · ${kayit.yukumluluk.kod} · ${kayit.yukumluluk.merci}`
          + ` · gönderim referansı ${kayit.referansNo ?? 'YOK'}`,
      });
    });

    revalidatePath('/olaylar');
    return tamam();
  } catch (e) {
    return hata(e);
  }
}

/**
 * Yükümlülüğü "uygulanmaz" olarak kapatır — GEREKÇE ZORUNLU.
 *
 * Kayıt SİLİNMEZ: silinseydi denetçi "bu yükümlülük neden
 * değerlendirilmedi" sorusunun cevabını hiçbir yerde bulamazdı.
 */
export async function bildirimUygulanmazIsaretle(girdi: {
  kayitId: string;
  gerekce: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      kayitId: bosluksuz('Kayıt').max(64),
      gerekce: z.string().trim().max(1000),
    }).parse(girdi);

    const { k, kayit } = await kayitKapisi(v.kayitId);

    const kapi = uygulanmazKapisi({ mevcutDurum: kayit.durum, gerekce: v.gerekce });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    await db.$transaction(async (tx) => {
      await tx.bildirimKaydi.update({
        where: { id: kayit.id },
        data: { durum: 'uygulanmaz', uygulanmazGerekcesi: v.gerekce.trim() },
      });
      await izYaz(tx, {
        aktorId: k.id,
        kayitId: kayit.id,
        once: KAYIT_DURUM_SOZU[kayit.durum as keyof typeof KAYIT_DURUM_SOZU] ?? kayit.durum,
        sonra: KAYIT_DURUM_SOZU.uygulanmaz,
        gerekce: `${kayit.olay.kod} · ${kayit.yukumluluk.kod} · ${v.gerekce.trim()}`,
      });
    });

    revalidatePath('/olaylar');
    return tamam();
  } catch (e) {
    return hata(e);
  }
}

/**
 * Taslak metnini düzenler.
 *
 * Ürün buraya bir cevap UYDURMAZ: mercinin sorduğu alanları kurum
 * doldurur. Taslak metni denetim izine GÖVDESİYLE yazılmaz — serbest
 * metindir ve içine bir sistem çıktısı yapıştırılmış olabilir; ize
 * uzunluğu yazılır, içeriği kaydın kendisinde durur.
 */
export async function bildirimTaslakDuzenle(girdi: {
  kayitId: string;
  taslakMetin: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      kayitId: bosluksuz('Kayıt').max(64),
      taslakMetin: z.string().max(20000),
    }).parse(girdi);

    const { k, kayit } = await kayitKapisi(v.kayitId);
    if (kayit.durum === 'gonderildi' || kayit.durum === 'teyit_alindi') {
      return {
        ok: false,
        hata: 'Gönderilmiş bir bildirimin taslağı değiştirilemez — gönderilen metin ile '
          + 'kayıttaki metin ayrışırsa kayıt kanıt olmaktan çıkar.',
      };
    }

    const metin = v.taslakMetin.trim();
    await db.$transaction(async (tx) => {
      await tx.bildirimKaydi.update({
        where: { id: kayit.id },
        data: { taslakMetin: metin === '' ? null : metin },
      });
      await iz({
        aktorId: k.id,
        varlikTipi: 'BildirimKaydi',
        varlikId: kayit.id,
        eylem: 'guncelleme',
        alan: 'taslakMetin',
        sonra: metin === '' ? 'taslak boşaltıldı' : `${metin.length} karakter`,
        gerekce: `${kayit.olay.kod} · ${kayit.yukumluluk.kod} taslağı düzenlendi`,
      }, tx);
    });

    revalidatePath('/olaylar');
    return tamam();
  } catch (e) {
    return hata(e);
  }
}
