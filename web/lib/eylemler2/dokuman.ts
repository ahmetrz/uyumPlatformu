'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { yetkiZorunlu, izinVar, KAPSAM_SONRA } from '../erisim';
import { hata, iz, tamam, type Sonuc } from './ortak';
import {
  DURUMLAR, TURLER, gecisGecerli, sonrakiGozdenGecirme, ONAY_ISTEYEN,
} from '@/app/(kabuk)/(operasyonel)/dokumanlar/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   YÖNETİŞİM BELGESİ EYLEMLERİ (C22 · C23)

   YETKİ: kütük `uyum` modülünün altındadır — belge bir kontrol gereğini
   karşıladığını iddia eder, dolayısıyla uyum kaydıdır. Yazma `uyum/yazma`,
   YÜRÜRLÜĞE ALMA `uyum/onay` ister: bir politikayı yürürlükte ilan etmek
   bulgu kapatmakla aynı ağırlıktadır, ikisi de "artık bu doğru" der.

   KAPSAM: belge kurumsal olabildiği için (santral bağı yok) kapsamlı yetki
   kapısı `KAPSAM_SONRA` ile iki aşamalıdır — tesise kısıtlı bir kullanıcı
   ön kapıdan geçer, sonra bağlı santrallerin HEPSİ kapsamındaysa yazabilir.
   Kurumsal belgeye (bağsız) yalnız kapsamsız yetkisi olan dokunabilir:
   tek santralin sorumlusu tüm portföyü bağlayan bir politikayı değiştiremez.

   DOSYA: yüklenmez. `disKaynak` yalnız kaydedilir, ürün o adrese İSTEK
   ATMAZ — dış sistemlere bağlanmama sınırı burada da geçerlidir.
   ═══════════════════════════════════════════════════════════════════════ */

const metin = (ad: string, en = 200) => z.string().trim().min(1, `${ad} boş olamaz`).max(en);
const serbest = z.string().trim().transform((s) => (s ? s : null)).nullable().optional();
const tarih = z.string().trim().transform((s) => (s ? new Date(s) : null)).nullable().optional();

/** Kapsam kapısı: belgenin bağlı olduğu santrallerin hepsi kullanıcının
    kapsamında mı? Bağ yoksa belge kurumsaldır ve kapsamsız yetki ister. */
function kapsamYetkisi(
  k: Parameters<typeof izinVar>[0], islem: 'yazma' | 'onay', tesisIdleri: string[],
): boolean {
  if (tesisIdleri.length === 0) return izinVar(k, 'uyum', islem);
  return tesisIdleri.every((tesisId) => izinVar(k, 'uyum', islem, { tesisId, surecId: null }));
}

const KAPSAM_HATASI = 'Bu belgenin kapsamı yetkinizin dışında; kurumsal belgeler '
  + 'santral kısıtı olmayan yetki ister.';

export async function dokumanKaydet(girdi: {
  id?: string;
  kod: string; baslik: string; tur: string; surum?: string;
  sahipId?: string | null; aciklama?: string | null;
  gozdenGecirmeAy?: number | null;
  yururlukTarihi?: string | null; sonGozdenGecirme?: string | null;
  disKaynak?: string | null; kaynakSistem?: string | null; gizlilik?: string;
  maddeIdleri?: string[]; tesisIdleri?: string[];
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: z.string().optional(),
      kod: metin('Kod', 40), baslik: metin('Başlık', 200),
      tur: z.enum(TURLER), surum: z.string().trim().max(20).optional(),
      sahipId: z.string().nullable().optional(), aciklama: serbest,
      gozdenGecirmeAy: z.number().int().min(1).max(120).nullable().optional(),
      yururlukTarihi: tarih, sonGozdenGecirme: tarih,
      disKaynak: serbest, kaynakSistem: serbest,
      gizlilik: z.enum(['acik', 'kurumsal', 'gizli', 'ot_hassas']).optional(),
      maddeIdleri: z.array(z.string()).optional(),
      tesisIdleri: z.array(z.string()).optional(),
    }).parse(girdi);

    const eski = v.id
      ? await db.dokuman.findUniqueOrThrow({
        where: { id: v.id }, include: { tesisBaglantilari: true },
      })
      : null;

    /* Kapsam ESKİ ve YENİ bağın birleşimine bakar: kullanıcı kapsamı
       dışındaki bir santrali listeden çıkararak belgeyi ele geçiremesin. */
    const eskiTesisler = eski?.tesisBaglantilari.map((b) => b.tesisId) ?? [];
    const yeniTesisler = v.tesisIdleri ?? eskiTesisler;
    const birlesim = [...new Set([...eskiTesisler, ...yeniTesisler])];
    if (!kapsamYetkisi(k, 'yazma', birlesim)) return { ok: false, hata: KAPSAM_HATASI };

    const sonraki = sonrakiGozdenGecirme(
      v.gozdenGecirmeAy ?? eski?.gozdenGecirmeAy ?? null,
      v.sonGozdenGecirme === undefined ? eski?.sonGozdenGecirme ?? null : v.sonGozdenGecirme,
      v.yururlukTarihi === undefined ? eski?.yururlukTarihi ?? null : v.yururlukTarihi,
    );

    const veri = {
      kod: v.kod, baslik: v.baslik, tur: v.tur,
      surum: v.surum || eski?.surum || '1.0',
      sahipId: v.sahipId === undefined ? eski?.sahipId ?? null : v.sahipId,
      aciklama: v.aciklama === undefined ? eski?.aciklama ?? null : v.aciklama,
      gozdenGecirmeAy: v.gozdenGecirmeAy === undefined
        ? eski?.gozdenGecirmeAy ?? null : v.gozdenGecirmeAy,
      yururlukTarihi: v.yururlukTarihi === undefined
        ? eski?.yururlukTarihi ?? null : v.yururlukTarihi,
      sonGozdenGecirme: v.sonGozdenGecirme === undefined
        ? eski?.sonGozdenGecirme ?? null : v.sonGozdenGecirme,
      sonrakiGozdenGecirme: sonraki,
      disKaynak: v.disKaynak === undefined ? eski?.disKaynak ?? null : v.disKaynak,
      kaynakSistem: v.kaynakSistem === undefined ? eski?.kaynakSistem ?? null : v.kaynakSistem,
      gizlilik: v.gizlilik ?? eski?.gizlilik ?? 'kurumsal',
    };

    await db.$transaction(async (tx) => {
      const kayit = eski
        ? await tx.dokuman.update({ where: { id: eski.id }, data: veri })
        : await tx.dokuman.create({ data: veri });

      /* Bağlar TAM LİSTE olarak gelir (verilmediyse dokunulmaz): ekranda
         çoklu seçim var, tek tek ekle/çıkar eylemi yok. */
      if (v.maddeIdleri) {
        await tx.dokumanMadde.deleteMany({
          where: { dokumanId: kayit.id, maddeId: { notIn: v.maddeIdleri.length ? v.maddeIdleri : ['-'] } },
        });
        for (const maddeId of v.maddeIdleri) {
          await tx.dokumanMadde.upsert({
            where: { dokumanId_maddeId: { dokumanId: kayit.id, maddeId } },
            create: { dokumanId: kayit.id, maddeId }, update: {},
          });
        }
      }
      if (v.tesisIdleri) {
        await tx.dokumanTesis.deleteMany({
          where: { dokumanId: kayit.id, tesisId: { notIn: v.tesisIdleri.length ? v.tesisIdleri : ['-'] } },
        });
        for (const tesisId of v.tesisIdleri) {
          await tx.dokumanTesis.upsert({
            where: { dokumanId_tesisId: { dokumanId: kayit.id, tesisId } },
            create: { dokumanId: kayit.id, tesisId }, update: {},
          });
        }
      }
      await iz({
        aktorId: k.id, varlikTipi: 'Dokuman', varlikId: kayit.id,
        eylem: eski ? 'guncelleme' : 'olusturma',
        alan: eski ? 'kunye' : undefined,
      }, tx);
    });

    revalidatePath('/dokumanlar'); revalidatePath('/uyum');
    return tamam();
  } catch (e) { return hata(e); }
}

/* Durum geçişi — yaşam döngüsünün tek kapısı.
   Yürürlüğe alma: onay yetkisi + yürürlük tarihi + onaylayan kaydı; gözden
   geçirme takvimi bu anda kurulur. Yürürlükten kaldırma kanıtları SİLMEZ:
   geçmiş kanıt o gün geçerliydi, kütük bunu tarihçede tutar. */
export async function dokumanDurumDegistir(girdi: {
  id: string; durum: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const yururluge = girdi.durum === 'yururlukte';
    const k = await yetkiZorunlu('uyum', yururluge ? 'onay' : 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: z.string(), durum: z.enum(DURUMLAR), gerekce: serbest,
    }).parse(girdi);

    const eski = await db.dokuman.findUniqueOrThrow({
      where: { id: v.id }, include: { tesisBaglantilari: true },
    });
    const tesisler = eski.tesisBaglantilari.map((b) => b.tesisId);
    const islem = ONAY_ISTEYEN.includes(v.durum) ? 'onay' as const : 'yazma' as const;
    if (!kapsamYetkisi(k, islem, tesisler)) return { ok: false, hata: KAPSAM_HATASI };

    if (eski.durum === v.durum) return { ok: false, hata: 'Belge zaten bu durumda' };
    if (!gecisGecerli(eski.durum, v.durum)) {
      return {
        ok: false,
        hata: `Bu geçiş tanımlı değil: ${eski.durum} → ${v.durum}. `
          + 'Taslak önce incelemeye alınır; yürürlükten kalkmış belge geri döndürülmez.',
      };
    }
    if (v.durum === 'askida' && !v.gerekce) {
      return { ok: false, hata: 'Askıya alma gerekçesi yazılmalı: belge bir boşluk bırakıyor' };
    }

    const simdi = new Date();
    const yururlukTarihi = yururluge ? (eski.yururlukTarihi ?? simdi) : eski.yururlukTarihi;
    const sonGozden = yururluge ? simdi : eski.sonGozdenGecirme;

    await db.$transaction(async (tx) => {
      await tx.dokuman.update({
        where: { id: v.id },
        data: {
          durum: v.durum,
          yururlukTarihi,
          sonGozdenGecirme: sonGozden,
          sonrakiGozdenGecirme: sonrakiGozdenGecirme(
            eski.gozdenGecirmeAy, sonGozden, yururlukTarihi),
          onaylayanId: yururluge ? k.id : eski.onaylayanId,
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'Dokuman', varlikId: v.id,
        eylem: yururluge ? 'onay' : 'durum_degisimi', alan: 'durum',
        once: eski.durum, sonra: v.durum, gerekce: v.gerekce ?? null,
      }, tx);
    });

    revalidatePath('/dokumanlar'); revalidatePath('/uyum');
    return tamam();
  } catch (e) { return hata(e); }
}

/* Gözden geçirildi damgası — belgeyi değiştirmeden takvimi ileri atar.
   "Okudum, hâlâ geçerli" bir karardır ve iz bırakır; sessizce tarih
   güncellemek denetimde kimin baktığını kaybettirir. */
export async function dokumanGozdenGecirildi(girdi: {
  id: string; not?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay', KAPSAM_SONRA);
    const v = z.object({ id: z.string(), not: serbest }).parse(girdi);
    const eski = await db.dokuman.findUniqueOrThrow({
      where: { id: v.id }, include: { tesisBaglantilari: true },
    });
    if (!kapsamYetkisi(k, 'onay', eski.tesisBaglantilari.map((b) => b.tesisId))) {
      return { ok: false, hata: KAPSAM_HATASI };
    }
    if (eski.durum !== 'yururlukte') {
      return { ok: false, hata: 'Yalnız yürürlükteki belge gözden geçirilmiş sayılır' };
    }
    if (!eski.gozdenGecirmeAy) {
      return {
        ok: false,
        hata: 'Bu belgenin gözden geçirme periyodu tanımlı değil; önce künyede periyodu yazın',
      };
    }
    const simdi = new Date();
    await db.$transaction(async (tx) => {
      await tx.dokuman.update({
        where: { id: v.id },
        data: {
          sonGozdenGecirme: simdi,
          sonrakiGozdenGecirme: sonrakiGozdenGecirme(
            eski.gozdenGecirmeAy, simdi, eski.yururlukTarihi),
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'Dokuman', varlikId: v.id,
        eylem: 'onay', alan: 'gozden_gecirme',
        once: eski.sonGozdenGecirme?.toISOString() ?? null,
        sonra: simdi.toISOString(), gerekce: v.not ?? null,
      }, tx);
    });
    revalidatePath('/dokumanlar');
    return tamam();
  } catch (e) { return hata(e); }
}
