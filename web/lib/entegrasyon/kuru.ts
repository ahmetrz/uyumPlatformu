import 'server-only';
import { createHash } from 'node:crypto';
import { esle, type VarlikIndeksi } from './kesif';
import type { Gozlem, VarlikGozlemi } from './sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   KURU KOŞU (dry-run) defteri — §6

   Bir senkronizasyonun NE YAPACAĞINI hiçbir şey değiştirmeden hesaplar.

   YAPAR:  dış yükü normalize eder · eşleme uygular · yinelenen hesaplar ·
           doğrular · kökeni bellekte üretir · etkileri sayar.
   YAPMAZ: CMDB'ye yazmaz · risk/bulgu/proje adayı üretmez · temeli
           değiştirmez · imleci ilerletmez · motor zincirini tetiklemez.

   Bu dosyanın tek yazma yolu YOKTUR: içeride `db` bile içe aktarılmaz.
   Okuma gereken tek şey (kaynak kaydı daha önce görülmüş mü) çağıran
   tarafından enjekte edilir. Böylece "kuru koşu hiçbir şeyi değiştirmez"
   iddiası bir yorum değil, modülün yapısal özelliğidir.

   Sayaç sözleşmesi:
     alinan      = gecerli + gecersiz
     gecerli     = olusacak + guncellenecek + (kapsam/eşleme red sayısı)
     reddedilecek= gecersiz + kapsam/eşleme redleri            (toplam)
     eslesen + yeni + bilinmeyen = olusacak + guncellenecek
   Son satır: eşleşme sınıflaması YALNIZ yazılacak kayıtlar için yapılır;
   reddedilen kayıt için "hangi varlığa eşleşirdi" sorusu anlamsızdır. */

export type KuruSayaclar = {
  /** kaynaktan gelen kayıt */
  alinan: number;
  /** doğrulamadan geçen */
  gecerli: number;
  /** doğrulamada/normalizasyonda düşen */
  gecersiz: number;
  /** mevcut bir CMDB varlığıyla eşleşecek */
  eslesen: number;
  /** eşleşen varlık yok — yeni varlık adayı olacak */
  yeni: number;
  /** aynı kaynak kaydı daha önce görülmüş (idempotent tazeleme) */
  yinelenen: number;
  /** eşleşme kararı VERİLEMEDİ (çakışma, yalnız IP, ya da varlık dışı gözlem) */
  bilinmeyen: number;
  /** yeni `KesifKaydi` satırı açılacak */
  olusacak: number;
  /** var olan `KesifKaydi` satırı tazelenecek */
  guncellenecek: number;
  /** hiç yazılmayacak (doğrulama + kapsam + eşleme redleri) */
  reddedilecek: number;
};

export function bosKuruSayac(): KuruSayaclar {
  return {
    alinan: 0, gecerli: 0, gecersiz: 0, eslesen: 0, yeni: 0, yinelenen: 0,
    bilinmeyen: 0, olusacak: 0, guncellenecek: 0, reddedilecek: 0,
  };
}

export type EslesmeSinifi = 'eslesen' | 'yeni' | 'bilinmeyen';

/** Kuru koşuda BELLEKTE üretilen köken. Yazılmaz; "yazılsaydı ne
    yazılırdı" sorusunun tam yanıtıdır. */
export type KuruKoken = {
  kaynakSistem: string;
  kaynakKayitId: string;
  kokenTipi: 'otomatik';
  /** doğrulama insanın işidir: otomatik gelen kayıt doğrulanmamış başlar */
  dogrulamaDurumu: 'dogrulanmadi';
  /** 0–1; null = ÖLÇÜLMEDİ (sıfır güven değil) */
  guven: number | null;
  toplanma: string | null;
  /** ham kaydın SHA-256 özeti; null = hesaplanamadı (serileştirilemeyen yük) */
  kayitOzeti: string | null;
};

/** Tek bir kaydın "olsaydı ne olurdu" satırı — ekran örnek olarak gösterir. */
export type KuruKayitEtkisi = {
  kaynakSistem: string;
  kaynakKayitId: string;
  gozlemTipi: string;
  etki: 'olusacak' | 'guncellenecek';
  eslesme: EslesmeSinifi;
  eslesenVarlikId: string | null;
  /** CMDB EŞLEŞMESİNİN güveni — kökenin güveniyle aynı şey DEĞİLDİR.
      0–1; ölçülemediyse null (SIFIR DEĞİL) */
  eslesmeGuveni: number | null;
  /** bellekte üretilen köken — hiçbir yere yazılmadı */
  koken: KuruKoken;
  /** kaydın hangi santrale yazılacağı — kod düzeyinde; null = bilinmiyor */
  tesisKodu: string | null;
  gerekce: string;
};

export type KuruOzet = {
  sayaclar: KuruSayaclar;
  /** kullanılan eşleme profili; null = adaptörün gömülü eşlemesi */
  eslemeProfili: { kod: string; surum: number } | null;
  /** ilk N kaydın etkisi — tüm kayıtları özete koymak koşu satırını şişirir */
  ornekler: KuruKayitEtkisi[];
  ornekSiniri: number;
  /** ret sebepleri, çoktan aza */
  redSebepleri: { sebep: string; adet: number }[];
  /** kuru koşunun kendi sınırları (ölçemediği şeyler) — sessiz geçilmez */
  uyarilar: string[];
  uretildi: string;
};

/** Özetteki örnek kayıt sayısı — koşu satırı ~2KB sınırında kalsın. */
export const ORNEK_SINIRI = 20;

/* ═══ Defter ══════════════════════════════════════════════════════════ */

export type KuruDefterSecenegi = {
  /** CMDB varlık indeksi (salt okunur). null = eşleşme ÖLÇÜLEMEZ. */
  indeks: VarlikIndeksi | null;
  /** kaynak kaydı daha önce yazılmış mı — SALT OKUMA sorgusu */
  mevcutMu: (kaynak: string, kaynakKayitId: string) => Promise<boolean>;
  ornekSiniri?: number;
};

/** Reddin hangi aşamada olduğu. `dogrulama` (ve normalize) reddi kaydı
    GEÇERSİZ yapar; `kapsam`/`esleme` reddi geçerli ama YAZILMAYACAK kayıttır.
    İkisini aynı sayaca koymak `alinan = gecerli + gecersiz` sözleşmesini
    bozar ve "kaç kayıt doğrulamayı geçti" sorusunu yanıltır. */
/** Kaydın hangi aşamada düştüğü. `prisma/schema.prisma` içindeki
    `ReddedilenKayit.asama` sözlüğüyle AYNI olmalıdır: kuru koşunun
    saydığı aşama ile gerçek koşunun dead-letter'a yazdığı aşama
    ayrışırsa, kuru koşu "burada düşecek" dediği yerden başka bir yerde
    düşer ve önizlemenin değeri kalmaz.

    `esleme` (eşleme profili çevirisi) ile `eslesme` (CMDB eşleştirmesi)
    ayrı aşamalardır. */
export type RedAsamasi = 'dogrulama' | 'kapsam' | 'esleme' | 'yazma';

export type KuruDefter = {
  /** doğrulamadan geçmiş bir gözlemin etkisini hesaplar */
  yaz: (g: Gozlem) => Promise<KuruKayitEtkisi>;
  /** doğrulama/kapsam/eşleme reddi */
  redEkle: (sebep: string, asama: RedAsamasi, adet?: number) => void;
  /** kaynaktan kaç kayıt geldi */
  alinanEkle: (adet: number) => void;
  gecerliEkle: (adet: number) => void;
  uyarEkle: (metin: string) => void;
  sayaclar: () => KuruSayaclar;
  ozet: (eslemeProfili: { kod: string; surum: number } | null) => KuruOzet;
};

/**
 * Kuru koşu defteri açar.
 *
 * `indeks` null ise eşleşme sınıflaması yapılmaz ve her kayıt
 * `bilinmeyen` sayılır — ölçemediğimizi ölçtük gibi göstermeyiz.
 */
export function kuruDefterAc(o: KuruDefterSecenegi): KuruDefter {
  const s = bosKuruSayac();
  const ornekler: KuruKayitEtkisi[] = [];
  const redSebepleri = new Map<string, number>();
  const uyarilar: string[] = [];
  const ornekSiniri = o.ornekSiniri ?? ORNEK_SINIRI;
  /* Aynı koşuda aynı kaynak kaydı iki kez gelebilir (kaynağın sayfalaması
     çakışırsa). İkincisi YENİ satır açmaz, tazeler — gerçek koşuda da öyle
     olur; kuru koşu bunu doğru saymazsa "kaç satır açılacak" yalan olur. */
  const gorulen = new Set<string>();

  const kaynakAnahtari = (g: Gozlem) => `${g.koken?.kaynakSistem ?? ''} ${g.koken?.kaynakKayitId ?? ''}`;

  /* Ham yükün özeti gerçek koşuda kökene yazılır; kuru koşu da aynı özeti
     üretir ki "yazılsaydı ne yazılırdı" eksiksiz olsun. Serileştirilemeyen
     yük sessizce boş geçilmez: null = HESAPLANAMADI. */
  const hamOzet = (ham: unknown): string | null => {
    try {
      const metin = JSON.stringify(ham ?? null);
      if (metin === undefined) return null;
      return createHash('sha256').update(metin).digest('hex');
    } catch {
      return null;
    }
  };

  const eslesmeHesapla = (g: Gozlem): {
    sinif: EslesmeSinifi; varlikId: string | null; guven: number | null; gerekce: string;
  } => {
    if (g.tip !== 'varlik') {
      return {
        sinif: 'bilinmeyen', varlikId: null, guven: null,
        gerekce: `'${g.tip}' gözlemi CMDB varlığıyla doğrudan eşleştirilmez — etki ölçülmedi`,
      };
    }
    if (!o.indeks) {
      return {
        sinif: 'bilinmeyen', varlikId: null, guven: null,
        gerekce: 'CMDB indeksi yüklenmedi — eşleşme ölçülemedi',
      };
    }
    const sonuc = esle(g as VarlikGozlemi, o.indeks);
    if (sonuc.durum === 'eslesti' && sonuc.eslesenVarlikId) {
      return {
        sinif: 'eslesen', varlikId: sonuc.eslesenVarlikId,
        guven: sonuc.guvenSkoru, gerekce: sonuc.gerekce,
      };
    }
    /* `inceleme_bekliyor` iki farklı şeyi kapsar: (a) hiç aday yok → YENİ
       varlık adayı, (b) çakışma / yalnız IP → karar VERİLEMEDİ. İkisini
       aynı kovaya koymak "kaç yeni varlık gelecek" sorusunu yanıltırdı. */
    if (sonuc.adaylar.length === 0) {
      return { sinif: 'yeni', varlikId: null, guven: sonuc.guvenSkoru, gerekce: sonuc.gerekce };
    }
    return { sinif: 'bilinmeyen', varlikId: null, guven: sonuc.guvenSkoru, gerekce: sonuc.gerekce };
  };

  return {
    alinanEkle: (adet) => { s.alinan += adet; },
    gecerliEkle: (adet) => { s.gecerli += adet; },
    uyarEkle: (metin) => { if (!uyarilar.includes(metin)) uyarilar.push(metin); },

    redEkle: (sebep, asama, adet = 1) => {
      const k = `${asama}: ${sebep.replace(/\s+/g, ' ').trim() || 'sebep bildirilmedi'}`;
      redSebepleri.set(k, (redSebepleri.get(k) ?? 0) + adet);
      s.reddedilecek += adet;
      // Yalnız doğrulama/normalize reddi kaydı GEÇERSİZ yapar.
      if (asama === 'dogrulama') s.gecersiz += adet;
    },

    yaz: async (g) => {
      const kaynak = g.koken?.kaynakSistem ?? '';
      const kaynakKayitId = g.koken?.kaynakKayitId ?? '';
      const anahtar = kaynakAnahtari(g);
      const dahaOnceGorulen = gorulen.has(anahtar);
      gorulen.add(anahtar);
      const mevcut = dahaOnceGorulen || await o.mevcutMu(kaynak, kaynakKayitId);

      const e = eslesmeHesapla(g);
      const etki: KuruKayitEtkisi = {
        kaynakSistem: kaynak,
        kaynakKayitId,
        gozlemTipi: g.tip,
        etki: mevcut ? 'guncellenecek' : 'olusacak',
        eslesme: e.sinif,
        eslesenVarlikId: e.varlikId,
        eslesmeGuveni: e.guven,
        koken: {
          kaynakSistem: kaynak,
          kaynakKayitId,
          kokenTipi: 'otomatik',
          dogrulamaDurumu: 'dogrulanmadi',
          guven: g.koken?.guven ?? null,
          toplanma: g.koken?.toplanma ? new Date(g.koken.toplanma).toISOString() : null,
          kayitOzeti: hamOzet(g.ham),
        },
        tesisKodu: 'tesisKodu' in g ? ((g as { tesisKodu?: string | null }).tesisKodu ?? null) : null,
        gerekce: e.gerekce,
      };

      if (mevcut) { s.guncellenecek += 1; s.yinelenen += 1; } else s.olusacak += 1;
      s[e.sinif] += 1;
      if (ornekler.length < ornekSiniri) ornekler.push(etki);
      return etki;
    },

    sayaclar: () => ({ ...s }),

    ozet: (eslemeProfili) => ({
      sayaclar: { ...s },
      eslemeProfili,
      ornekler,
      ornekSiniri,
      redSebepleri: [...redSebepleri.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([sebep, adet]) => ({ sebep, adet })),
      uyarilar,
      uretildi: new Date().toISOString(),
    }),
  };
}

/** Sayaç sözleşmesi tutuyor mu? Tutmuyorsa koşu özeti YALAN söylüyordur;
    çekirdek bunu uyarı olarak kaydeder, sessizce geçmez. */
export function sayacTutarsizligi(s: KuruSayaclar): string | null {
  const sorunlar: string[] = [];
  if (s.alinan !== s.gecerli + s.gecersiz) {
    sorunlar.push(`alinan(${s.alinan}) ≠ gecerli(${s.gecerli}) + gecersiz(${s.gecersiz})`);
  }
  if (s.eslesen + s.yeni + s.bilinmeyen !== s.olusacak + s.guncellenecek) {
    sorunlar.push(
      `eslesen+yeni+bilinmeyen(${s.eslesen + s.yeni + s.bilinmeyen}) ≠ `
      + `olusacak+guncellenecek(${s.olusacak + s.guncellenecek})`);
  }
  if (s.gecerli < s.olusacak + s.guncellenecek) {
    sorunlar.push(`gecerli(${s.gecerli}) < olusacak+guncellenecek(${s.olusacak + s.guncellenecek})`);
  }
  if (s.reddedilecek < s.gecersiz) {
    sorunlar.push(`reddedilecek(${s.reddedilecek}) < gecersiz(${s.gecersiz})`);
  }
  if (s.yinelenen !== s.guncellenecek) {
    sorunlar.push(`yinelenen(${s.yinelenen}) ≠ guncellenecek(${s.guncellenecek})`);
  }
  return sorunlar.length > 0 ? sorunlar.join(' · ') : null;
}

/** Kuru koşu özetini insan cümlesine çevirir (koşu satırının `ayrinti`si). */
export function kuruCumle(s: KuruSayaclar): string {
  return `KURU KOŞU (hiçbir şey yazılmadı) · ${s.alinan} alındı · ${s.gecerli} geçerli · `
    + `${s.gecersiz} geçersiz · ${s.olusacak} oluşacak · ${s.guncellenecek} güncellenecek · `
    + `${s.reddedilecek} reddedilecek · ${s.eslesen} eşleşen · ${s.yeni} yeni · `
    + `${s.yinelenen} yinelenen · ${s.bilinmeyen} bilinmeyen`;
}

/** Koşu satırındaki `kuruOzetJson` için üst sınır (~8KB). */
export const OZET_JSON_SINIRI = 8_000;

/**
 * Özeti koşu satırına sığan GEÇERLİ JSON'a çevirir.
 *
 * Metni kırpmak kolaydı ama bozuk JSON üretirdi: okuyan ekran özeti hiç
 * ayrıştıramaz ve "kuru koşu raporu yok" sanırdı. Bunun yerine örnek
 * kayıtlar azaltılır ve kaç örneğin düştüğü uyarılara yazılır — kayıp
 * sessiz olmaz.
 */
export function kuruOzetJson(ozet: KuruOzet, sinir = OZET_JSON_SINIRI): string {
  let calisma: KuruOzet = ozet;
  let metin = JSON.stringify(calisma);
  while (metin.length > sinir && calisma.ornekler.length > 0) {
    const kalan = Math.floor(calisma.ornekler.length / 2);
    calisma = {
      ...calisma,
      ornekler: calisma.ornekler.slice(0, kalan),
      uyarilar: [
        ...ozet.uyarilar.filter((u) => !u.startsWith('Örnek kayıtlar kırpıldı')),
        `Örnek kayıtlar kırpıldı: ${ozet.ornekler.length} örnekten ${kalan} tanesi saklandı `
        + '(özet boyut sınırı). Sayaçlar TAM kayıt kümesini yansıtır.',
      ],
    };
    metin = JSON.stringify(calisma);
  }
  return metin;
}
