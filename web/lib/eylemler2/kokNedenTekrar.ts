'use server';

/* ═══ UY-26 · Kök neden  ·  UY-28 · Tekrar bağı ════════════════════════

   Kalıp `eylemler2/*` ile aynıdır ve ondan sapılmaz:
     yetkiZorunlu(KAPSAM_SONRA) → zod → kayıt oku → kapsamZorunlu →
     db → iz → revalidatePath

   ── BULGUNUN KAPSAMI NEREDEN GELİR ────────────────────────────────────
   Bulgunun kendi `tesisId` alanı yoktur; kapsamı bağlı olduğu
   `MaddeDurumu` taşır. Kapsam kapısı bu yüzden bulguyu değil, bulgunun
   madde durumunu sorar. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, kapsamZorunlu, KAPSAM_SONRA } from '../erisim';
import type { AktifKullanici } from '../auth';
import {
  ANALIZ_ASGARI, KOK_NEDEN_KATEGORILERI,
} from '../uyum/kokNeden';
import { TEKRAR_PENCERESI_GUN, tekrarKarari } from '../uyum/tekrarBulgu';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

/** Bulgunun kapsamını madde durumundan sorar; bulgu kendi tesisini taşımaz. */
async function bulguKapsamiDayat(
  k: AktifKullanici, bulguId: string, islem: 'yazma' | 'onay', mesaj: string,
) {
  const b = await db.bulgu.findUnique({
    where: { id: bulguId },
    select: { maddeDurumu: { select: { tesisId: true, surecId: true } } },
  });
  if (!b) throw new Error('Bulgu bulunamadı');
  kapsamZorunlu(k, 'uyum', islem,
    { tesisId: b.maddeDurumu.tesisId, surecId: b.maddeDurumu.surecId }, mesaj);
}

/**
 * Kök neden analizini kaydeder (UY-26).
 *
 * Analizi KİMİN, NE ZAMAN yaptığı burada damgalanır: kim yazdığı
 * bilinmeyen bir kök neden analizi denetimde bir görüştür, bir kayıt
 * değil. Damga kullanıcıdan alınmaz, oturumdan yazılır.
 */
export async function kokNedenKaydet(girdi: {
  bulguId: string;
  kategori: string;
  metin: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      bulguId: bosluksuz('Bulgu'),
      kategori: z.enum(KOK_NEDEN_KATEGORILERI, 'Geçersiz kök neden kategorisi'),
      metin: z.string().trim().min(
        ANALIZ_ASGARI,
        `Kök neden analizi en az ${ANALIZ_ASGARI} karakter olmalı — `
        + 'kategori seçmek analiz değildir',
      ),
    }).parse(girdi);

    const eski = await db.bulgu.findUnique({
      where: { id: v.bulguId },
      select: { id: true, silindi: true, kokNeden: true, kokNedenKategori: true },
    });
    if (!eski || eski.silindi) return hata(new Error('Bulgu bulunamadı'));
    await bulguKapsamiDayat(k, v.bulguId, 'yazma',
      'Bu tesis kapsamında kök neden analizi yazma yetkiniz yok');

    await db.bulgu.update({
      where: { id: v.bulguId },
      data: {
        kokNeden: v.metin,
        kokNedenKategori: v.kategori,
        kokNedenAnalizEdenId: k.id,
        kokNedenAnalizZamani: new Date(),
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Bulgu', varlikId: v.bulguId,
      eylem: 'guncelleme', alan: 'kokNedenKategori',
      once: eski.kokNedenKategori, sonra: v.kategori, gerekce: v.metin,
    });
    revalidatePath('/bulgular');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Tekrar bağını ELLE kurar ya da kaldırır (UY-28).
 *
 * Motorun kurduğu bağdan ayrı bir eylemdir ve kayıt `tekrarKaynagi`
 * alanında hangisinin kurduğunu taşır: insanın gördüğü bir örüntü ile
 * motorun bulduğu bir eşleşme aynı güvende değildir ve ekran ikisini
 * ayırır.
 *
 * KENDİNE BAĞLAMA ve DÖNGÜ reddedilir: bir bulgu kendisinin tekrarı
 * olamaz ve zincir kendi üzerine kapanamaz — kapanırsa zincir
 * yürüyüşü sonsuza kadar döner.
 */
export async function tekrarBagiKur(girdi: {
  bulguId: string;
  oncekiBulguId: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      bulguId: bosluksuz('Bulgu'),
      oncekiBulguId: z.string().trim().transform((s) => s || null).nullable(),
    }).parse(girdi);

    const bulgu = await db.bulgu.findUnique({
      where: { id: v.bulguId },
      select: { id: true, silindi: true, tekrarBulguId: true, maddeDurumuId: true },
    });
    if (!bulgu || bulgu.silindi) return hata(new Error('Bulgu bulunamadı'));
    await bulguKapsamiDayat(k, v.bulguId, 'yazma',
      'Bu tesis kapsamında tekrar bağı kurma yetkiniz yok');

    if (v.oncekiBulguId !== null) {
      if (v.oncekiBulguId === v.bulguId) {
        return hata(new Error('Bir bulgu kendisinin tekrarı olamaz.'));
      }
      const onceki = await db.bulgu.findUnique({
        where: { id: v.oncekiBulguId },
        select: { id: true, silindi: true, maddeDurumuId: true, tekrarBulguId: true },
      });
      if (!onceki || onceki.silindi) {
        return hata(new Error('Bağlanacak önceki bulgu bulunamadı'));
      }
      /* Önceki bulgunun kapsamı da sorulur: A santralinde yetkili biri,
         B santralinin bulgusuna zincir kuramasın. */
      await bulguKapsamiDayat(k, v.oncekiBulguId, 'yazma',
        'Bağlanacak bulgunun tesisinde yetkiniz yok');

      if (onceki.maddeDurumuId !== bulgu.maddeDurumuId) {
        return hata(new Error(
          'Tekrar bağı yalnız AYNI kontrol ve AYNI santral içinde kurulur. '
          + 'Farklı kontrolleri birbirine bağlamak, denetçiye yanlış bir '
          + 'tarihçe sunardı.',
        ));
      }
      /* Döngü savunması: zinciri yukarı yürü, kendimize dönüyor muyuz? */
      let imlec: string | null = onceki.tekrarBulguId;
      for (let adim = 0; imlec !== null && adim < 100; adim++) {
        if (imlec === v.bulguId) {
          return hata(new Error('Bu bağ zinciri kendi üzerine kapatır (döngü).'));
        }
        const ust: { tekrarBulguId: string | null } | null = await db.bulgu.findUnique({
          where: { id: imlec }, select: { tekrarBulguId: true },
        });
        imlec = ust?.tekrarBulguId ?? null;
      }
    }

    await db.bulgu.update({
      where: { id: v.bulguId },
      data: {
        tekrarBulguId: v.oncekiBulguId,
        tekrarKaynagi: v.oncekiBulguId === null ? null : 'elle',
        tekrarPenceresiGun: v.oncekiBulguId === null ? null : TEKRAR_PENCERESI_GUN,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'Bulgu', varlikId: v.bulguId,
      eylem: 'guncelleme', alan: 'tekrarBulguId',
      once: bulgu.tekrarBulguId, sonra: v.oncekiBulguId,
      gerekce: v.oncekiBulguId === null
        ? 'Tekrar bağı elle kaldırıldı'
        : 'Tekrar bağı elle kuruldu',
    });
    revalidatePath('/bulgular');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Tekrar adaylarını hesaplar — HİÇBİR ŞEY YAZMAZ.
 *
 * Ekranın "bu bulgu bir tekrar olabilir mi" sorusuna cevabıdır ve
 * motorla AYNI saf kararı (`tekrarKarari`) kullanır: ekranın önerdiği
 * bağ ile motorun kuracağı bağ ayrışamaz.
 */
export async function tekrarAdayiSor(girdi: { bulguId: string }): Promise<
  Sonuc & { oncekiId?: string; gecenGun?: number; aciklama?: string }
> {
  try {
    const k = await yetkiZorunlu('uyum', 'okuma', KAPSAM_SONRA);
    const v = z.object({ bulguId: bosluksuz('Bulgu') }).parse(girdi);

    const bulgu = await db.bulgu.findUnique({
      where: { id: v.bulguId },
      select: {
        id: true, silindi: true, maddeDurumuId: true, durum: true,
        onemDerecesi: true, tespitTarihi: true, kapanmaTarihi: true,
        tekrarBulguId: true,
      },
    });
    if (!bulgu || bulgu.silindi) return hata(new Error('Bulgu bulunamadı'));
    await bulguKapsamiDayat(k, v.bulguId, 'yazma',
      'Bu tesis kapsamında bulguyu okuma yetkiniz yok');

    const gecmis = await db.bulgu.findMany({
      where: { maddeDurumuId: bulgu.maddeDurumuId, silindi: null, id: { not: bulgu.id } },
      select: {
        id: true, maddeDurumuId: true, durum: true, onemDerecesi: true,
        tespitTarihi: true, kapanmaTarihi: true, tekrarBulguId: true,
      },
    });

    const karar = tekrarKarari({
      yeni: {
        id: bulgu.id, maddeDurumuId: bulgu.maddeDurumuId, durum: bulgu.durum,
        onemDerecesi: bulgu.onemDerecesi, tespit: bulgu.tespitTarihi.getTime(),
        kapanma: bulgu.kapanmaTarihi?.getTime() ?? null,
        tekrarBulguId: bulgu.tekrarBulguId,
      },
      gecmis: gecmis.map((g) => ({
        id: g.id, maddeDurumuId: g.maddeDurumuId, durum: g.durum,
        onemDerecesi: g.onemDerecesi, tespit: g.tespitTarihi.getTime(),
        kapanma: g.kapanmaTarihi?.getTime() ?? null,
        tekrarBulguId: g.tekrarBulguId,
      })),
    });
    if (!karar.tekrar) return { ok: true, aciklama: karar.sebep };
    return {
      ok: true, oncekiId: karar.oncekiId, gecenGun: karar.gecenGun,
      aciklama: karar.sebep,
    };
  } catch (e) { return hata(e); }
}
