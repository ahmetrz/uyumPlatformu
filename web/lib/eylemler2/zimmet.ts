'use server';

/* ═══ OT-09b · Varlık zimmeti — kabul / red akışı ══════════════════════

   Kalıp `eylemler2/*` ile aynı: yetkiZorunlu(KAPSAM_SONRA) → zod →
   kayıt oku → kapsamZorunlu → db → iz → revalidatePath.

   ── BURADA KİMSE BAŞKASI ADINA CEVAP VEREMEZ ──────────────────────────
   `zimmetCevapla` oturumdaki kullanıcının kimliğini alır ve talebin
   `atananId` alanıyla karşılaştırır. Girdi olarak "kim cevaplıyor"
   ALINMAZ — alınsaydı, gövdeyi elle kuran biri başkası adına kabul
   verebilirdi. Ekranın düğmeyi gizlemesi bir yetki denetimi değildir.

   ── SAHİPLİK YALNIZ KABULDE DEĞİŞİR ───────────────────────────────────
   Talep açmak `Varlik.sahipId` alanına DOKUNMAZ. Dokunsaydı, kabul
   edilmemiş bir atama ekranda sahiplik olarak görünürdü ve akışın var
   olma sebebi ortadan kalkardı. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import {
  girisZorunlu, izinVar, kapsamZorunlu, yetkiZorunlu, KAPSAM_SONRA,
} from '../erisim';
import {
  ZIMMET_AZAMI_GUN, ZIMMET_VARSAYILAN_GUN, cevapKapisi, iptalKapisi,
  redSonrasi, sonTarihAni, talepKapisi,
} from '../varlik/zimmet';
import { ayar } from '../yapilandirma/oku';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

const TAVAN = 200;

/**
 * Zimmet talebi açar.
 *
 * Varlığın sahibi DEĞİŞMEZ — talep bir niyet kaydıdır. Sahiplik ancak
 * kabul edildiğinde geçer.
 */
export async function zimmetAc(girdi: {
  varlikId: string; atananId: string; sureGun?: number | null; not?: string | null;
}): Promise<Sonuc & { id?: string }> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      varlikId: bosluksuz('Varlık'),
      atananId: bosluksuz('Atanacak kişi'),
      sureGun: z.number().int().nullable().optional(),
      not: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    const varlik = await db.varlik.findUnique({
      where: { id: v.varlikId },
      select: { id: true, etiket: true, tesisId: true, sahipId: true, silindi: true },
    });
    if (!varlik || varlik.silindi) return hata(new Error('Varlık bulunamadı'));
    kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: varlik.tesisId },
      'Bu santralde zimmet açma yetkiniz yok');

    const atanan = await db.kullanici.findUnique({
      where: { id: v.atananId }, select: { id: true, adSoyad: true, aktif: true },
    });
    if (!atanan) return hata(new Error('Atanacak kişi bulunamadı'));

    const acik = await db.varlikAtamaTalebi.findFirst({
      where: { varlikId: v.varlikId, durum: 'bekliyor' }, select: { id: true },
    });

    /* Süre konsoldan yönetilir; girdi verilmediyse ayardan okunur.
       Ayar yoksa kod varsayılanına düşer — yazılıp okunmayan bir
       ayar bırakmak, konsolda çalışıyormuş gibi görünen ölü bir
       alan üretirdi. */
    const sureGun = v.sureGun ?? await ayar<number>('zimmet.cevap_suresi_gun');
    const kapi = talepKapisi({
      atananId: atanan.id, atayanId: k.id, atananAktif: atanan.aktif,
      mevcutSahipId: varlik.sahipId, acikTalepVar: acik !== null, sureGun,
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    const simdi = new Date();
    let talep;
    try {
      talep = await db.varlikAtamaTalebi.create({
        data: {
          varlikId: varlik.id, atananId: atanan.id, atayanId: k.id,
          oncekiSahipId: varlik.sahipId,
          not: v.not ?? null,
          olusturuldu: simdi,
          sonTarih: new Date(sonTarihAni(simdi.getTime(), sureGun)),
        },
      });
    } catch {
      /* Kısmi tekil indeks ikinci bekleyen talebi VERİTABANINDA reddeder;
         yukarıdaki okuma ile bu yazma arasına giren eşzamanlı bir istek
         buraya düşer. Kullanıcı teknik hata değil, olguyu görür. */
      return {
        ok: false,
        hata: 'Bu varlık için cevap bekleyen bir zimmet talebi az önce açıldı.',
      };
    }

    await iz({
      aktorId: k.id, varlikTipi: 'VarlikAtamaTalebi', varlikId: talep.id,
      eylem: 'olusturma',
      sonra: `${varlik.etiket} → ${atanan.adSoyad} (${sureGun} gün)`,
      gerekce: v.not ?? null,
    });

    revalidatePath('/envanter');
    revalidatePath('/zimmetlerim');
    revalidatePath('/yetkiler');
    return { ok: true, id: talep.id };
  } catch (e) { return hata(e); }
}

/**
 * Zimmeti kabul eder ya da reddeder.
 *
 * Cevaplayan kimlik OTURUMDAN gelir; girdi olarak alınmaz.
 */
export async function zimmetCevapla(girdi: {
  talepId: string; kabul: boolean; not?: string | null;
}): Promise<Sonuc> {
  try {
    /* Burada MODÜL izni aranmaz ve bu bilinçlidir: sahibi olduğu varlığı
       devralan saha mühendisinin envanteri okuma yetkisi olmayabilir,
       olmasa da kendi imzasını atabilmelidir.

       Kapı kimliğin KENDİSİDİR: `cevapKapisi` cevaplayanın talebin
       `atananId` alanıyla aynı kişi olmasını şart koşar. Bu yüzden ön
       kapıda `KAPSAM_SONRA` da kullanılmaz — kapsam kapısı bir SANTRAL
       sorusudur, buradaki soru "bu senin zimmetin mi" sorusudur. */
    const k = await girisZorunlu();
    const v = z.object({
      talepId: bosluksuz('Talep'),
      kabul: z.boolean(),
      not: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    const talep = await db.varlikAtamaTalebi.findUnique({
      where: { id: v.talepId },
      include: {
        varlik: { select: { id: true, etiket: true, tesisId: true, sahipId: true } },
        oncekiSahip: { select: { id: true, aktif: true } },
      },
    });
    if (!talep) return hata(new Error('Zimmet talebi bulunamadı'));

    const kapi = cevapKapisi({
      durum: talep.durum, atananId: talep.atananId, cevaplayanId: k.id,
      kabul: v.kabul, cevapNotu: v.not ?? null,
      sonTarih: talep.sonTarih.getTime(), simdi: Date.now(),
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    const simdi = new Date();
    if (v.kabul) {
      await db.varlikAtamaTalebi.update({
        where: { id: talep.id },
        data: {
          durum: 'kabul_edildi', cevapZamani: simdi, cevapNotu: v.not ?? null,
        },
      });
      await db.varlik.update({
        where: { id: talep.varlikId }, data: { sahipId: talep.atananId },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'VarlikAtamaTalebi', varlikId: talep.id,
        eylem: 'guncelleme', alan: 'durum', once: 'bekliyor', sonra: 'kabul_edildi',
        gerekce: v.not ?? null,
      });
      /* Sahiplik değişimi AYRI bir izdir: "zimmet kabul edildi" ile
         "varlığın sahibi değişti" iki farklı olaydır ve denetimde ikisi
         de ayrı ayrı aranır. */
      await iz({
        aktorId: k.id, varlikTipi: 'Varlik', varlikId: talep.varlikId,
        eylem: 'guncelleme', alan: 'sahipId',
        once: talep.varlik.sahipId, sonra: talep.atananId,
        gerekce: 'Zimmet kabul edildi',
      });
    } else {
      const sonuc = redSonrasi({
        oncekiSahipId: talep.oncekiSahipId,
        oncekiSahipAktif: talep.oncekiSahip?.aktif ?? false,
      });
      await db.varlikAtamaTalebi.update({
        where: { id: talep.id },
        data: { durum: 'reddedildi', cevapZamani: simdi, cevapNotu: v.not ?? null },
      });
      /* Varlığın sahibi talep sırasında başkasına geçmiş olabilir; o
         durumda geri alma YAPILMAZ — daha yeni bir karar vardır. */
      if (talep.varlik.sahipId === talep.oncekiSahipId) {
        await db.varlik.update({
          where: { id: talep.varlikId }, data: { sahipId: sonuc.yeniSahipId },
        });
      }
      await iz({
        aktorId: k.id, varlikTipi: 'VarlikAtamaTalebi', varlikId: talep.id,
        eylem: 'guncelleme', alan: 'durum', once: 'bekliyor', sonra: 'reddedildi',
        gerekce: v.not ?? null,
      });
      if (sonuc.sahipsizKaliyor) {
        /* Sahipsiz kalan varlık sessizce bırakılmaz: veri kalitesi
           kütüğüne düşer ve sahiplik ekranında görünür. */
        await db.veriKalitesiBulgusu.create({
          data: {
            kural: 'sahipsiz_varlik', kaynakTipi: 'Varlik', kaynakId: talep.varlikId,
            aciklama: `${talep.varlik.etiket}: zimmet reddedildi ve dönülecek `
              + 'aktif bir önceki sahip yok — varlık sahipsiz kaldı.',
          },
        });
      }
    }

    revalidatePath('/envanter');
    revalidatePath('/zimmetlerim');
    revalidatePath('/yetkiler');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Bekleyen talebi iptal eder. Yönetici kimse ADINA KABUL EDEMEZ, yalnız iptal eder. */
export async function zimmetIptal(girdi: {
  talepId: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      talepId: bosluksuz('Talep'),
      gerekce: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    const talep = await db.varlikAtamaTalebi.findUnique({
      where: { id: v.talepId },
      include: { varlik: { select: { etiket: true, tesisId: true } } },
    });
    if (!talep) return hata(new Error('Zimmet talebi bulunamadı'));
    kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: talep.varlik.tesisId },
      'Bu santralde zimmet iptal etme yetkiniz yok');

    const kapi = iptalKapisi({
      durum: talep.durum, iptalEdenId: k.id, atayanId: talep.atayanId,
      yoneticiMi: izinVar(k, 'envanter', 'onay', { tesisId: talep.varlik.tesisId }),
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    await db.varlikAtamaTalebi.update({
      where: { id: talep.id },
      data: { durum: 'iptal_edildi', iptalZamani: new Date(), iptalEdenId: k.id },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'VarlikAtamaTalebi', varlikId: talep.id,
      eylem: 'guncelleme', alan: 'durum', once: 'bekliyor', sonra: 'iptal_edildi',
      gerekce: v.gerekce ?? null,
    });

    revalidatePath('/envanter');
    revalidatePath('/zimmetlerim');
    revalidatePath('/yetkiler');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Toplu zimmet açar.
 *
 * Kapsam HER KAYIT İÇİN ayrı sorulur ve tek bir kapsam dışı varlık varsa
 * işlemin TAMAMI reddedilir: kısmi bir toplu atama, kullanıcının hangi
 * kayıtların değiştiğini bilmediği bir sonuç üretirdi.
 *
 * Kapıya takılan tek tek kayıtlar ise işlemi durdurmaz — sebepleriyle
 * birlikte geri döner. "Zaten bu kişide" olan bir varlık yüzünden 50
 * kayıtlık bir devrin tamamını reddetmek işi durdururdu.
 */
export async function topluZimmetAc(girdi: {
  varlikIdleri: string[]; atananId: string; sureGun?: number | null; not?: string | null;
}): Promise<Sonuc & { ozet?: { acilan: number; atlanan: number; sebepler: string[] } }> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = z.object({
      varlikIdleri: z.array(z.string().trim().min(1))
        .min(1, 'En az bir varlık seçin')
        .max(TAVAN, `Tek seferde en çok ${TAVAN} varlık zimmetlenebilir`),
      atananId: bosluksuz('Atanacak kişi'),
      sureGun: z.number().int().nullable().optional(),
      not: z.string().trim().max(1000).nullable().optional(),
    }).parse(girdi);

    const atanan = await db.kullanici.findUnique({
      where: { id: v.atananId }, select: { id: true, adSoyad: true, aktif: true },
    });
    if (!atanan) return hata(new Error('Atanacak kişi bulunamadı'));

    const varliklar = await db.varlik.findMany({
      where: { id: { in: v.varlikIdleri }, silindi: null },
      select: { id: true, etiket: true, tesisId: true, sahipId: true },
    });
    if (varliklar.length === 0) return hata(new Error('Zimmetlenecek varlık bulunamadı'));

    for (const varlik of varliklar) {
      kapsamZorunlu(k, 'envanter', 'onay', { tesisId: varlik.tesisId },
        `Bu santralde zimmet yetkiniz yok (${varlik.etiket})`);
    }

    const acikOlanlar = new Set((await db.varlikAtamaTalebi.findMany({
      where: { varlikId: { in: varliklar.map((x) => x.id) }, durum: 'bekliyor' },
      select: { varlikId: true },
    })).map((x: { varlikId: string }) => x.varlikId));

    const sureGun = v.sureGun ?? await ayar<number>('zimmet.cevap_suresi_gun');
    const simdi = new Date();
    const sebepler: string[] = [];
    let acilan = 0;

    for (const varlik of varliklar) {
      const kapi = talepKapisi({
        atananId: atanan.id, atayanId: k.id, atananAktif: atanan.aktif,
        mevcutSahipId: varlik.sahipId, acikTalepVar: acikOlanlar.has(varlik.id), sureGun,
      });
      if (!kapi.ok) { sebepler.push(`${varlik.etiket}: ${kapi.sebep}`); continue; }
      const talep = await db.varlikAtamaTalebi.create({
        data: {
          varlikId: varlik.id, atananId: atanan.id, atayanId: k.id,
          oncekiSahipId: varlik.sahipId, not: v.not ?? null, olusturuldu: simdi,
          sonTarih: new Date(sonTarihAni(simdi.getTime(), sureGun)),
        },
      });
      await iz({
        aktorId: k.id, varlikTipi: 'VarlikAtamaTalebi', varlikId: talep.id,
        eylem: 'olusturma',
        sonra: `${varlik.etiket} → ${atanan.adSoyad} (toplu, ${sureGun} gün)`,
        gerekce: v.not ?? null,
      });
      acilan += 1;
    }

    revalidatePath('/envanter');
    revalidatePath('/zimmetlerim');
    revalidatePath('/yetkiler');
    return {
      ...tamam(),
      ozet: { acilan, atlanan: varliklar.length - acilan, sebepler },
    };
  } catch (e) { return hata(e); }
}

/** Süre tavanı ve varsayılanı ekrana taşınır — iki yerde yazılmasın. */
export async function zimmetSureSinirlari(): Promise<{ varsayilan: number; azami: number }> {
  return { varsayilan: ZIMMET_VARSAYILAN_GUN, azami: ZIMMET_AZAMI_GUN };
}
