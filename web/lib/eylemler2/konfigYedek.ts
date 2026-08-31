'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import {
  yedekVarMi, sonBilinenIyi, konfigurasyonDegistiMi, yedekKontrolBagi,
} from '../entegrasyon/konfigYedek';
import { YEDEK_KURALLARI } from '../motorlar/yedekDogrulama';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

/* Konfigürasyon yedeği eylemleri — İNSAN KARARLARI.

   Bu dosyadaki her eylem, motorun yapmasının YASAK olduğu şeyi yapar:
   bir yedeğin okunabilirliğini doğrulamak, "son bilinen iyi" sürümü
   işaretlemek, veri kalitesi kuyruğundaki bir boşluğu işlemek. Üçü de
   yargı gerektirir; motor bunları kendiliğinden yapamaz
   (detect → correlate → propose → HUMAN APPROVE).

   Yedek ALMAK ya da GERİ YÜKLEMEK burada da yoktur: platform yedekleme
   ürününün yerini almaz, yalnız durumunu izler ve kanıta bağlar. */

/** Bu eylemin işleyebileceği veri kalitesi kuralları — motorun ürettiği
    iki kuralın tam adı. Önek eşleştirmesi kullanılmaz (aşağıdaki nota bakın). */
const YEDEK_BULGU_KURALLARI: string[] = Object.values(YEDEK_KURALLARI);

/** Yedeğin bağlı olduğu varlığın tesisinde yazma yetkisi var mı. */
async function yedegeErisim(yedekId: string) {
  const k = await yetkiZorunlu('envanter', 'yazma');
  const yedek = await db.konfigurasyonYedegi.findUnique({
    where: { id: yedekId },
    select: {
      id: true, varlikId: true, dogrulandi: true, sonBilinenIyi: true,
      basarili: true, yedekZamani: true, surum: true, kaynakSistem: true,
      varlik: { select: { etiket: true, tesisId: true } },
    },
  });
  if (!yedek) throw new Error('Yedek kaydı bulunamadı');
  if (yedek.varlik.tesisId
    && !izinVar(k, 'envanter', 'yazma', { tesisId: yedek.varlik.tesisId })) {
    throw new Error('Bu tesis kapsamında yetkiniz yok');
  }
  return { k, yedek };
}

/**
 * Yedeğin OKUNABİLİRLİĞİNİ insan doğrular.
 *
 * Bu bir geri yükleme testi DEĞİLDİR ("yedek açılabiliyor" ≠ "sistem geri
 * dönüyor") — restore testi santral katmanında `GeriYuklemeTesti` olarak
 * durur ve `restoreTestId` ile buraya bağlanır. Motor bu alanı kendisi
 * dolduramaz: kendi topladığı veriyi doğrulayamaz.
 */
export async function yedegiDogrula(girdi: {
  yedekId: string; dogrulandi: boolean; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      yedekId: bosluksuz('Yedek kaydı'),
      dogrulandi: z.boolean(),
      gerekce: z.string().nullable().optional(),
    }).parse(girdi);

    const { k, yedek } = await yedegeErisim(v.yedekId);
    if (v.dogrulandi && !yedek.basarili) {
      return { ok: false, hata: 'Başarısız bir yedek doğrulanmış sayılamaz' };
    }
    if (yedek.dogrulandi === v.dogrulandi) return tamam();

    await db.konfigurasyonYedegi.update({
      where: { id: yedek.id },
      data: {
        dogrulandi: v.dogrulandi,
        dogrulamaZamani: v.dogrulandi ? new Date() : null,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'KonfigurasyonYedegi', varlikId: yedek.id,
      eylem: 'guncelleme', alan: 'dogrulandi',
      once: String(yedek.dogrulandi), sonra: String(v.dogrulandi),
      gerekce: v.gerekce ?? null,
    });
    revalidatePath('/yedekleme');
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * "Son bilinen iyi" konfigürasyonu insan işaretler.
 *
 * Otomatik konmaz: başarıyla alınmış bir yedek, bozuk bir konfigürasyonu
 * taşıyor olabilir. Bir varlıkta yalnız bir kayıt işaretli kalır; işaret
 * taşındığında eskisi tek transaction içinde düşer (yarım durum olmaz).
 */
export async function sonBilinenIyiIsaretle(girdi: {
  yedekId: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      yedekId: bosluksuz('Yedek kaydı'),
      gerekce: z.string().nullable().optional(),
    }).parse(girdi);

    const { k, yedek } = await yedegeErisim(v.yedekId);
    if (!yedek.basarili) {
      return { ok: false, hata: 'Başarısız yedek "son bilinen iyi" olarak işaretlenemez' };
    }
    if (yedek.sonBilinenIyi) return tamam();

    const oncekiler = await db.$transaction(async (tx) => {
      const eski = await tx.konfigurasyonYedegi.findMany({
        where: { varlikId: yedek.varlikId, sonBilinenIyi: true, id: { not: yedek.id } },
        select: { id: true, yedekZamani: true },
      });
      await tx.konfigurasyonYedegi.updateMany({
        where: { varlikId: yedek.varlikId, sonBilinenIyi: true },
        data: { sonBilinenIyi: false },
      });
      await tx.konfigurasyonYedegi.update({
        where: { id: yedek.id }, data: { sonBilinenIyi: true } });
      return eski;
    });

    await iz({
      aktorId: k.id, varlikTipi: 'KonfigurasyonYedegi', varlikId: yedek.id,
      eylem: 'guncelleme', alan: 'sonBilinenIyi',
      once: oncekiler.length
        ? oncekiler.map((x) => x.yedekZamani.toISOString()).join(', ')
        : null,
      sonra: yedek.yedekZamani.toISOString(),
      gerekce: v.gerekce ?? `${yedek.varlik.etiket} için referans sürüm taşındı`,
    });
    revalidatePath('/yedekleme');
    revalidatePath('/envanter');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Yedek doğrulama motorunun ürettiği veri kalitesi bulgusunu insan işler.
 *
 * Motor kendi bulgusunu KAPATAMAZ; yalnız koşul gerçekten düzeldiğinde
 * (yedek gelmiş) bir sonraki koşuda 'cozuldu' yapar. "Yok sayma" kararı
 * insanın ve GEREKÇE ZORUNLUDUR — gerekçesiz susturma denetim izinde
 * savunulamaz.
 */
export async function yedekBulgusunuIsle(girdi: {
  bulguId: string; karar: 'cozuldu' | 'yok_sayildi'; gerekce: string;
}): Promise<Sonuc> {
  try {
    const v = z.object({
      bulguId: bosluksuz('Bulgu'),
      karar: z.enum(['cozuldu', 'yok_sayildi'], 'Geçersiz karar'),
      gerekce: bosluksuz('Gerekçe'),
    }).parse(girdi);

    const k = await yetkiZorunlu('yonetim', 'yazma');
    const bulgu = await db.veriKalitesiBulgusu.findUnique({ where: { id: v.bulguId } });
    if (!bulgu) return { ok: false, hata: 'Bulgu bulunamadı' };
    /* Kural adı ÖNEKLE değil, motorun kendi sabitiyle eşleşir.
       Önceki koşul `kural.startsWith('yedek')` idi ve sessizce yanlıştı:
       motorun ikinci kuralı `yedegi_bilinmeyen_kritik_varlik` — 'yedeg',
       'yedek' değil. Yani "yedek durumu ÖLÇÜLMEMİŞ" bulguları hiçbir
       zaman bu kapıdan geçemiyordu; ölçüm boşluğu kuyruğunun insan kararı
       yüzeyi yoktu ve bulgu sonsuza kadar açık kalıyordu. Kaynağı tek
       yere bağladık: liste motorda, kopyası burada YOK. */
    if (!YEDEK_BULGU_KURALLARI.includes(bulgu.kural)) {
      return { ok: false, hata: 'Bu eylem yalnız yedek bulgularını işler' };
    }
    if (bulgu.durum !== 'acik') return { ok: false, hata: 'Bulgu zaten kapalı' };

    await db.veriKalitesiBulgusu.update({
      where: { id: bulgu.id },
      data: { durum: v.karar, kapanis: new Date() },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'VeriKalitesiBulgusu', varlikId: bulgu.id,
      eylem: 'durum_degisimi', alan: bulgu.kural,
      once: 'acik', sonra: v.karar, gerekce: v.gerekce,
    });
    revalidatePath('/saglik');
    revalidatePath('/yedekleme');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ═══ Okuma yüzeyi — çekmecenin tembel yüklediği varlık yedek detayı ═══

   NEDEN EYLEM KATMANINDA BİR OKUMA VAR
   /yedekleme sayfası 17 santrali birden çiziyor; her santralin her kritik
   varlığı için `yedekVarMi + sonBilinenIyi + konfigurasyonDegistiMi +
   yedekKontrolBagi` koşturmak yüzlerce sorgu eder ve ekranın %99'u hiç
   açılmayan çekmece için harcanır. Detay bu yüzden ÇEKMECE AÇILINCA
   çekilir. Ekran kendi yedek yargısını KURMAZ — hepsi
   `lib/entegrasyon/konfigYedek.ts` özetlerinden gelir, tek doğruluk
   kaynağı orasıdır. */

type YedekSatiri = {
  id: string; yedekZamani: string; surum: string | null; kaynakSistem: string;
  basarili: boolean; dogrulandi: boolean; dogrulamaZamani: string | null;
  sonBilinenIyi: boolean; icerikHash: string | null; hata: string | null;
  depolamaKonumu: string | null; saklamaGun: number | null; restoreTestId: string | null;
};

export type VarlikYedekDetayi = {
  varlikId: string;
  etiket: string;
  ad: string;
  /** `yedekVarMi` — var | yok | bilinmiyor. "yok" ile "bilinmiyor" AYRI. */
  varlik: { sonuc: string; gerekce: string; kayitSayisi: number; basariliSayisi: number };
  /** `sonBilinenIyi` — işaret otomatik konmaz, insan koyar. */
  iyi: { sonuc: string; gerekce: string; yedekId: string | null };
  /** `konfigurasyonDegistiMi` — hash yoksa 'bilinmiyor', 'değişmedi' DEĞİL. */
  degisim: { sonuc: string; gerekce: string };
  /** `yedekKontrolBagi` — uyum maddesi ÖNERİsi; MaddeDurumu'na yazılmaz. */
  kontroller: {
    maddeKodu: string; maddeBaslik: string; katki: string; gerekce: string; oneri: string;
  }[];
  kayitlar: YedekSatiri[];
  /** İnsan kararı verebilir mi (doğrulama / son bilinen iyi işareti). */
  yazabilir: boolean;
};

/**
 * Bir varlığın yedek durumunu ve uyum bağı ÖNERİSİNİ okur.
 *
 * Yalnız okur; hiçbir alanı yazmaz. Yetki: `envanter/okuma` ve varlığın
 * santral kapsamı. Kapsam dışı varlık için kayıt DÖNMEZ — çekmece bir
 * yetki kaçağı yüzeyi olamaz.
 */
export async function varlikYedekDurumu(
  varlikId: string,
): Promise<{ ok: true; veri: VarlikYedekDetayi } | { ok: false; hata: string }> {
  try {
    const k = await yetkiZorunlu('envanter', 'okuma');
    const varlik = await db.varlik.findUnique({
      where: { id: varlikId },
      select: { id: true, etiket: true, ad: true, tesisId: true, silindi: true },
    });
    if (!varlik || varlik.silindi) return { ok: false, hata: 'Varlık bulunamadı' };
    if (!izinVar(k, 'envanter', 'okuma', { tesisId: varlik.tesisId })) {
      return { ok: false, hata: 'Bu tesis kapsamında yetkiniz yok' };
    }

    const [varligiVar, iyi, degisim, kontroller, kayitlar] = await Promise.all([
      yedekVarMi(varlikId),
      sonBilinenIyi(varlikId),
      konfigurasyonDegistiMi(varlikId),
      yedekKontrolBagi(varlikId),
      db.konfigurasyonYedegi.findMany({
        where: { varlikId },
        orderBy: { yedekZamani: 'desc' },
        take: 12,
      }),
    ]);

    return { ok: true, veri: {
      varlikId: varlik.id, etiket: varlik.etiket, ad: varlik.ad,
      varlik: {
        sonuc: varligiVar.sonuc, gerekce: varligiVar.gerekce,
        kayitSayisi: varligiVar.kayitSayisi, basariliSayisi: varligiVar.basariliSayisi,
      },
      iyi: { sonuc: iyi.sonuc, gerekce: iyi.gerekce, yedekId: iyi.yedek?.id ?? null },
      degisim: { sonuc: degisim.sonuc, gerekce: degisim.gerekce },
      kontroller: kontroller.map((c) => ({
        maddeKodu: c.maddeKodu, maddeBaslik: c.maddeBaslik,
        katki: c.katki, gerekce: c.gerekce, oneri: c.oneri,
      })),
      kayitlar: kayitlar.map((y) => ({
        id: y.id,
        yedekZamani: y.yedekZamani.toISOString(),
        surum: y.surum, kaynakSistem: y.kaynakSistem,
        basarili: y.basarili, dogrulandi: y.dogrulandi,
        dogrulamaZamani: y.dogrulamaZamani?.toISOString() ?? null,
        sonBilinenIyi: y.sonBilinenIyi, icerikHash: y.icerikHash, hata: y.hata,
        depolamaKonumu: y.depolamaKonumu, saklamaGun: y.saklamaGun,
        restoreTestId: y.restoreTestId,
      })),
      yazabilir: izinVar(k, 'envanter', 'yazma', { tesisId: varlik.tesisId }),
    } };
  } catch (e) { return hata(e) as { ok: false; hata: string }; }
}
