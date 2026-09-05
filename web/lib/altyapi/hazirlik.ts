import 'server-only';
import { db } from '../db';
import { AILE_ETIKETI, cokOrnekEngelleri, etkinSaglayici } from './saglayicilar';
import { KIMLIK_AILE_ETIKETI, PLATFORM_SAGLAYICILARI } from './kimlikSaglayici';
import { sirSaglayicilari } from '../entegrasyon/sir';
import type { Kontrol } from './hazirlikKarari';

/* ═══════════════════════════════════════════════════════════════════════
   OT-48 · Başlangıç hazırlığı — KONTROLLERİ KOŞAN taraf

   Kararın kendisi `hazirlikKarari.ts`tedir; burası yalnız ölçer.

   ── HER KONTROL GERÇEKTEN KOŞAR ──────────────────────────────────────
   Hiçbir kontrol "muhtemelen tamamdır" demez. Ölçemediği yerde
   `bilinmiyor` döner ve SEBEBİNİ yazar. Sessizce `hazir` dönen bir
   kontrol, hazırlık ekranını tamamen değersiz kılardı: kimse bir daha
   ona bakmaz.

   ── Kontrol bir SAĞLIK YOKLAMASI DEĞİLDİR ────────────────────────────
   `/saglik` ekranı entegrasyonların o anki durumunu izler. Burası
   KURULUMUN kendisini sorar: veritabanına yazılabiliyor mu, göçler
   uygulanmış mı, zamanlayıcı koşuyor mu, hangi sağlayıcı etkin. İkisi
   ayrı sorulardır ve ayrı yerlerde durur. */

/** Bu süreden uzun süredir hiç iş koşusu yoksa zamanlayıcı durmuş olabilir. */
export const ZAMANLAYICI_SESSIZLIK_DK = 180;

async function veritabaniKontrolu(): Promise<Kontrol> {
  const taban = {
    kod: 'veritabani_yazma', ad: 'Veritabanına yazılabiliyor', zorunlu: true,
  };
  try {
    /* Salt okuma yeterli değil: kurulumun en sık kusuru salt-okunur bir
       birime yazmaya çalışmaktır ve o kusur ancak İLK YAZMADA görünür.
       Kilit tablosu bunun için doğru yer — kira modeli sayesinde bıraktığı
       satır kendiliğinden düşer ve gerçek bir iş kilidiyle çakışmaz. */
    const ad = `hazirlik-yoklama-${process.pid}`;
    const gecerlilik = new Date(Date.now() + 5_000);
    await db.isKilidi.upsert({
      where: { ad },
      create: { ad, sahip: 'hazirlik', gecerlilik },
      update: { gecerlilik },
    });
    await db.isKilidi.delete({ where: { ad } });
    return { ...taban, durum: 'hazir', ayrinti: 'Yazma yoklaması geçti.', yapilacak: null };
  } catch (e) {
    return {
      ...taban, durum: 'bozuk',
      ayrinti: `Yazma yoklaması başarısız: ${(e as Error).message}`,
      yapilacak: 'Veritabanı dosyasının yazma izinlerini ve disk alanını denetleyin.',
    };
  }
}

async function gocKontrolu(): Promise<Kontrol> {
  const taban = { kod: 'gocler', ad: 'Şema göçleri uygulanmış', zorunlu: true };
  try {
    const satirlar = await db.$queryRawUnsafe<{ n: bigint | number }[]>(
      'SELECT COUNT(*) AS n FROM _prisma_migrations WHERE finished_at IS NULL',
    );
    const yarim = Number(satirlar[0]?.n ?? 0);
    if (yarim > 0) {
      return {
        ...taban, durum: 'bozuk',
        ayrinti: `${yarim} göç yarım kalmış (finished_at boş).`,
        yapilacak: 'Yarım göçü çözün: `prisma migrate resolve` ya da yedekten dönüş.',
      };
    }
    const toplam = await db.$queryRawUnsafe<{ n: bigint | number }[]>(
      'SELECT COUNT(*) AS n FROM _prisma_migrations',
    );
    return {
      ...taban, durum: 'hazir',
      ayrinti: `${Number(toplam[0]?.n ?? 0)} göç uygulanmış, yarım kalan yok.`,
      yapilacak: null,
    };
  } catch (e) {
    /* Göç tablosu okunamıyorsa hazırlık İDDİA EDİLEMEZ; ama bu tek
       başına arıza da değildir (tablo adı sürüme göre değişebilir). */
    return {
      ...taban, durum: 'bilinmiyor',
      ayrinti: `Göç tablosu okunamadı: ${(e as Error).message}`,
      yapilacak: 'Göç kütüğünü elle doğrulayın (`prisma migrate status`).',
    };
  }
}

async function zamanlayiciKontrolu(): Promise<Kontrol> {
  const taban = { kod: 'zamanlayici', ad: 'Zamanlayıcı koşuyor', zorunlu: true };
  const son = await db.isKosusu.findFirst({
    orderBy: { baslangic: 'desc' }, select: { baslangic: true, isAdi: true },
  });
  if (!son) {
    return {
      ...taban, durum: 'eksik',
      ayrinti: 'Hiç iş koşusu kaydı yok — otomasyon bir kez bile çalışmamış.',
      yapilacak: 'Zamanlayıcıyı başlatın ya da bir motoru elle tetikleyip kaydı doğrulayın.',
    };
  }
  const gecenDk = Math.floor((Date.now() - son.baslangic.getTime()) / 60_000);
  if (gecenDk > ZAMANLAYICI_SESSIZLIK_DK) {
    return {
      ...taban, durum: 'bozuk',
      ayrinti: `Son iş koşusu ${gecenDk} dakika önce (${son.isAdi}); `
        + `beklenen sessizlik sınırı ${ZAMANLAYICI_SESSIZLIK_DK} dakika.`,
      yapilacak: 'Zamanlayıcı sürecinin ayakta olduğunu doğrulayın.',
    };
  }
  return {
    ...taban, durum: 'hazir',
    ayrinti: `Son iş koşusu ${gecenDk} dakika önce (${son.isAdi}).`,
    yapilacak: null,
  };
}

function saglayiciKontrolu(
  aile: 'veritabani' | 'nesne_deposu' | 'koordinasyon',
  zorunlu: boolean,
): Kontrol {
  const etkin = etkinSaglayici(aile);
  const taban = {
    kod: `saglayici_${aile}`, ad: `${AILE_ETIKETI[aile]} sağlayıcısı`, zorunlu,
  };
  if (!etkin) {
    return {
      ...taban, durum: 'eksik',
      ayrinti: 'Bu ailede bağlı sağlayıcı yok.',
      yapilacak: 'Sağlayıcı kütüğündeki adaylardan birini bağlayın.',
    };
  }
  return {
    ...taban, durum: 'hazir',
    ayrinti: `${etkin.ad} · ${etkin.ozet}`,
    yapilacak: null,
  };
}

/**
 * Çok örnekli dağıtım kontrolü — BİLGİ kalemidir, zorunlu değil.
 *
 * Tek örnekli bir kurulum tamamen geçerlidir; bu satırın işi "yatay
 * ölçekleyelim" denince hangi bileşenin engel olduğunu ADIYLA söylemek.
 */
function cokOrnekKontrolu(): Kontrol {
  const engeller = cokOrnekEngelleri();
  const taban = {
    kod: 'cok_ornek', ad: 'Çok örnekli dağıtıma uygun', zorunlu: false,
  };
  if (engeller.length === 0) {
    return {
      ...taban, durum: 'hazir',
      ayrinti: 'Etkin sağlayıcıların tamamı çok örnekli çalışmayı destekliyor.',
      yapilacak: null,
    };
  }
  return {
    ...taban, durum: 'eksik',
    ayrinti: engeller
      .map((e) => `${AILE_ETIKETI[e.aile]}: ${e.saglayici}`)
      .join(' · ') + ' tek örnek varsayıyor.',
    yapilacak: 'Yatay ölçekleme öncesi bu ailelerde çok örnekli sağlayıcıya geçin.',
  };
}

/**
 * UY-54 · Sır sağlayıcısı — Vault/KMS bağlı mı?
 *
 * BİLGİ KALEMİDİR. `env:` ve `dosya:` sağlayıcıları bağlıdır ve çalışan
 * bir kurulum verirler; Vault/KMS bunun ÜSTÜNE gelen bir sertleştirmedir
 * (döndürme, merkezî iptal, erişim izi). Zorunlu göstermek, bugün doğru
 * çalışan her kurulumu arızalı ilan ederdi — ama satırın hiç olmaması da
 * "sırlar merkezî kasada" sanılmasına yol açardı.
 */
function sirKontrolu(): Kontrol {
  const taban = { kod: 'sir_saglayici', ad: 'Sır kasası (Vault/KMS) bağlı', zorunlu: false };
  const hepsi = sirSaglayicilari();
  const kasa = hepsi.find((s) => s.ad === 'vault');
  const bagliOlanlar = hepsi.filter((s) => s.bagli).map((s) => s.ad);
  if (kasa?.bagli) {
    return {
      ...taban, durum: 'hazir',
      ayrinti: 'Sırlar merkezî kasadan çözülüyor.',
      yapilacak: null,
    };
  }
  return {
    ...taban, durum: 'eksik',
    ayrinti: `Kasa bağlı değil; sırlar ${bagliOlanlar.join(' / ')} sağlayıcılarından `
      + 'çözülüyor. Döndürme ve merkezî iptal ürünün dışındadır.',
    yapilacak: kasa?.gereken ?? 'Sır kasası sağlayıcısı bağlayın.',
  };
}

/**
 * UY-53 · SSO/MFA  ·  UY-55 · gerçek veri yükü.
 *
 * Üçü de BİLGİ kalemidir ve üçü de bugün bağlı değildir. Kütükten
 * türetilir: sağlayıcı listesine yeni bir aile eklendiğinde bu satırlar
 * kendiliğinden gelir, elle güncellenecek ikinci bir liste yoktur.
 */
function platformKontrolleri(): Kontrol[] {
  return PLATFORM_SAGLAYICILARI.map((s) => {
    const taban = {
      kod: `platform_${s.aile}`, ad: KIMLIK_AILE_ETIKETI[s.aile], zorunlu: false,
    };
    if (s.bagli) {
      return { ...taban, durum: 'hazir' as const, ayrinti: `${s.ad} bağlı.`, yapilacak: null };
    }
    return {
      ...taban, durum: 'eksik' as const,
      ayrinti: s.bagliDegilkenDavranis,
      yapilacak: s.gereken,
    };
  });
}

/** Bütün kontroller. Sıra `kontrolleriSirala` ile ekranda belirlenir. */
export async function hazirligiOlc(): Promise<Kontrol[]> {
  const [vt, goc, zaman] = await Promise.all([
    veritabaniKontrolu(), gocKontrolu(), zamanlayiciKontrolu(),
  ]);
  return [
    vt, goc, zaman,
    saglayiciKontrolu('veritabani', true),
    saglayiciKontrolu('koordinasyon', true),
    /* Nesne deposu ZORUNLU DEĞİL. UY-13 ile kanıt dosyası katmanı ARTIK
       VAR (`lib/uyum/kanitDeposu.ts`) ve bugün yerel dosya sisteminde
       çalışıyor; S3 uyumlu bir depo tek örnekli kurulumda gerekmez.
       Zorunlu yapmak, çalışan bir kurulumu kırmızıya boyardı. */
    saglayiciKontrolu('nesne_deposu', false),
    sirKontrolu(),
    ...platformKontrolleri(),
    cokOrnekKontrolu(),
  ];
}
