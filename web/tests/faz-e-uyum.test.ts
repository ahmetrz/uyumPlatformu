import { describe, expect, it } from 'vitest';
import {
  ANALIZ_ASGARI, ANALIZ_SINIFI, KOK_NEDEN_KATEGORILERI, analizDurumu,
  analizZorunluMu, kapanisKapisi, kokNedenCumlesi, kokNedenDagilimi,
} from '@/lib/uyum/kokNeden';
import {
  KRONIK_ESIK, TEKRAR_PENCERESI_GUN, tekrarCumlesi, tekrarKarari,
  tekrarOzeti, tekrarZinciri,
} from '@/lib/uyum/tekrarBulgu';
import {
  eskalasyonBasligi, gecerliKurallar, hedefiCoz, matrisKusurlari,
  tetikKarari, type Kural,
} from '@/lib/uyum/eskalasyon';
import {
  AGIRLIK_SINIFI, etkiAgirligi, etkiCumlesi, etkiOzeti, etkiSonucu,
  surumFarki, type MaddeAyakIzi,
} from '@/lib/uyum/degisiklikEtkisi';
import {
  KAYNAK_SAGLAYICILARI, TAKIP_SINIFI, etkinKaynakSaglayici, takipCumlesi,
  takipDurumu, takipOzeti,
} from '@/lib/uyum/mevzuatKaynagi';
import {
  ELEME_TAVANI, SATIR_TAVANI, aktarimCumlesi, aktarimSayimlari,
  gerekceZorunluMu, kuruKosu, uygulamaKapisi, type MevcutKayit,
} from '@/lib/uyum/degerlendirmeAktarimi';
import {
  aktarimOzeti, metniAyristir, ozetCumlesi, satirAlti,
} from '@/app/(kabuk)/(operasyonel)/degerlendirme-aktarim/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   FAZ E · Uyum yönetişimi — saf karar kodunun nöbetçisi

   Bu dosya veritabanına, React'e ve `server-only`ye dokunmaz. Buradaki
   kararların hepsi ekranda tek bir cümleye iner ve o cümle yanlışsa
   denetimde pahalı bir hata üretilir: kapatılmaması gereken bir bulgu
   kapanır, tekrarlayan bir sorun tekrar görünmez, gecikmiş bir iş
   kimseye haber vermez ya da bir sürüm etkisi görülmeden aktifleşir. */

/* ══ UY-26 · Kök neden ═══════════════════════════════════════════════ */

describe('UY-26 · analiz zorunluluğu', () => {
  it('kritik ve yüksek önem analiz ister', () => {
    expect(analizZorunluMu({ onemDerecesi: 'kritik', tekrarMi: false })).toBe(true);
    expect(analizZorunluMu({ onemDerecesi: 'yuksek', tekrarMi: false })).toBe(true);
  });

  it('orta ve düşük önemde zorunlu DEĞİL', () => {
    /* Her bulguya tam analiz dayatmak, analizi bir form doldurma
       törenine çevirir ve kritik bulgudaki analizin değerini düşürür. */
    expect(analizZorunluMu({ onemDerecesi: 'orta', tekrarMi: false })).toBe(false);
    expect(analizZorunluMu({ onemDerecesi: 'dusuk', tekrarMi: false })).toBe(false);
  });

  it('TEKRAR eden bulgu önem derecesinden BAĞIMSIZ olarak analiz ister', () => {
    /* Bir şeyin ikinci kez olması, ilk teşhisin yanlış olduğunun
       kanıtıdır. */
    expect(analizZorunluMu({ onemDerecesi: 'dusuk', tekrarMi: true })).toBe(true);
  });
});

describe('UY-26 · analiz durumu', () => {
  const uzun = 'a'.repeat(ANALIZ_ASGARI);

  it('hiçbiri yoksa yok', () => {
    expect(analizDurumu({
      kategori: null, metin: null, analizEdenId: null, analizZamani: null,
    })).toBe('yok');
  });

  it('metin var kategori yok → kategorisiz', () => {
    expect(analizDurumu({
      kategori: null, metin: uzun, analizEdenId: 'a', analizZamani: 1,
    })).toBe('kategorisiz');
  });

  it('kategori var metin kısa → metinsiz (kategori seçmek analiz değildir)', () => {
    expect(analizDurumu({
      kategori: 'surec_yok', metin: 'kısa', analizEdenId: 'a', analizZamani: 1,
    })).toBe('metinsiz');
  });

  it('damgasız analiz KUSURDUR: kim yazdığı bilinmeyen analiz bir görüştür', () => {
    const d = analizDurumu({
      kategori: 'surec_yok', metin: uzun, analizEdenId: null, analizZamani: null,
    });
    expect(d).toBe('imzasiz');
    expect(ANALIZ_SINIFI[d]).toBe('md');
  });

  it('tam analiz', () => {
    expect(analizDurumu({
      kategori: 'surec_yok', metin: uzun, analizEdenId: 'a', analizZamani: 1,
    })).toBe('tam');
  });
});

describe('UY-26 · KAPANIŞ KAPISI (ölçülmüş kusur)', () => {
  const uzun = 'b'.repeat(ANALIZ_ASGARI);
  const tamAnaliz = {
    kategori: 'surec_yok', metin: uzun, analizEdenId: 'a', analizZamani: 1,
  };
  const bosAnaliz = {
    kategori: null, metin: null, analizEdenId: null, analizZamani: null,
  };

  it('açık aksiyonu olan bulgu kapatılamaz', () => {
    const k = kapanisKapisi({
      onemDerecesi: 'dusuk', tekrarMi: false, analiz: tamAnaliz, acikAksiyon: 2,
    });
    expect(k.ok).toBe(false);
    expect(k.ok === false && k.sebep).toContain('2 aksiyon');
  });

  it('KRİTİK bulgu kök neden analizi olmadan KAPATILAMAZ', () => {
    /* ÖLÇÜLMÜŞ KUSUR: eski kapı yalnız açık aksiyona bakıyordu; kök
       nedeni hiç yazılmamış bir bulgu kapatılabiliyordu. */
    const k = kapanisKapisi({
      onemDerecesi: 'kritik', tekrarMi: false, analiz: bosAnaliz, acikAksiyon: 0,
    });
    expect(k.ok).toBe(false);
    expect(k.ok === false && k.sebep).toContain('Analiz hiç yapılmamış');
  });

  it('TEKRAR eden düşük önemli bulgu da analiz olmadan kapatılamaz', () => {
    const k = kapanisKapisi({
      onemDerecesi: 'dusuk', tekrarMi: true, analiz: bosAnaliz, acikAksiyon: 0,
    });
    expect(k.ok).toBe(false);
    expect(k.ok === false && k.sebep).toContain('TEKRAR');
  });

  it('düşük önemli, ilk kez görülen bulgu analizsiz kapatılabilir', () => {
    /* Kapıyı her yere koymak, kapının kendisini anlamsız kılar. */
    expect(kapanisKapisi({
      onemDerecesi: 'dusuk', tekrarMi: false, analiz: bosAnaliz, acikAksiyon: 0,
    }).ok).toBe(true);
  });

  it('kategori seçilmiş ama metin yazılmamışsa kapı KAPALI kalır', () => {
    const k = kapanisKapisi({
      onemDerecesi: 'kritik', tekrarMi: false, acikAksiyon: 0,
      analiz: { kategori: 'surec_yok', metin: 'iki kelime', analizEdenId: 'a', analizZamani: 1 },
    });
    expect(k.ok).toBe(false);
    expect(k.ok === false && k.sebep).toContain('kategori seçmek analiz değildir');
  });

  it('tam analizli kritik bulgu kapatılabilir', () => {
    expect(kapanisKapisi({
      onemDerecesi: 'kritik', tekrarMi: false, analiz: tamAnaliz, acikAksiyon: 0,
    }).ok).toBe(true);
  });
});

describe('UY-26 · kök neden dağılımı', () => {
  it('kategorisiz bulgu bir kovaya TOPLANMAZ, ayrı sayılır', () => {
    const d = kokNedenDagilimi([
      { kategori: 'surec_yok', tekrarMi: false },
      { kategori: null, tekrarMi: false },
      { kategori: 'gecersiz_kategori', tekrarMi: false },
    ]);
    expect(d.kategorisiz).toBe(2);
    expect(d.satirlar.length).toBe(1);
    expect(d.toplam).toBe(3);
  });

  it('tekrar sayısı sıralamayı belirler — sistemik sinyal önde', () => {
    const d = kokNedenDagilimi([
      { kategori: 'egitim_farkindalik', tekrarMi: false },
      { kategori: 'egitim_farkindalik', tekrarMi: false },
      { kategori: 'egitim_farkindalik', tekrarMi: false },
      { kategori: 'surec_yok', tekrarMi: true },
    ]);
    expect(d.satirlar[0].kategori).toBe('surec_yok');
  });

  it('kategorisiz çoğunluktaysa cümle ÖNCE onu söyler', () => {
    const d = kokNedenDagilimi([
      { kategori: null, tekrarMi: false }, { kategori: null, tekrarMi: false },
      { kategori: 'surec_yok', tekrarMi: false },
    ]);
    expect(kokNedenCumlesi(d)).toContain('sınıflandırılmamış');
  });

  it('bulgu yoksa dağılım hesaplanamaz', () => {
    expect(kokNedenCumlesi(kokNedenDagilimi([]))).toContain('hesaplanamaz');
  });

  it('kategori sözlüğü 10 kategoridir ve tekrarsızdır', () => {
    expect(KOK_NEDEN_KATEGORILERI.length).toBe(10);
    expect(new Set(KOK_NEDEN_KATEGORILERI).size).toBe(10);
  });
});

/* ══ UY-28 · Tekrar ══════════════════════════════════════════════════ */

describe('UY-28 · tekrar kararı', () => {
  const gun = 86_400_000;
  const simdi = 1_800_000_000_000;
  const bulgu = (o: Partial<Parameters<typeof tekrarKarari>[0]['yeni']>) => ({
    id: 'y', maddeDurumuId: 'md1', durum: 'acik', onemDerecesi: 'orta',
    tespit: simdi, kapanma: null, tekrarBulguId: null, ...o,
  });

  it('aynı kontrolde pencere içinde kapanmış bulgu → TEKRAR', () => {
    const k = tekrarKarari({
      yeni: bulgu({}),
      gecmis: [bulgu({
        id: 'e', durum: 'kapali', tespit: simdi - 100 * gun, kapanma: simdi - 50 * gun,
      })],
    });
    expect(k.tekrar).toBe(true);
    expect(k.tekrar === true && k.oncekiId).toBe('e');
    expect(k.tekrar === true && k.gecenGun).toBe(50);
  });

  it('AÇIK bir bulgunun yanında ikinci bulgu TEKRAR DEĞİLDİR', () => {
    /* Bu aynı sorunun ikinci kaydıdır ve ayrı bir veri kalitesi
       sorunudur; tekrar saymak tarihçeyi yalanlardı. */
    const k = tekrarKarari({
      yeni: bulgu({}),
      gecmis: [bulgu({ id: 'e', durum: 'acik', tespit: simdi - 10 * gun })],
    });
    expect(k.tekrar).toBe(false);
  });

  it('DURUMU açık ama kapanma tarihi dolu kayıt tekrar ÜRETMEZ', () => {
    /* Veri tutarsızlığı: bir bulgu "açık" görünüp kapanma tarihi
       taşıyabilir (elle düzenleme, bozuk aktarım). Karar DURUMA bakar,
       yalnız tarihe değil — yoksa kapanmamış bir sorun "tekrarladı"
       diye kapanmış sayılırdı.

       Bu vaka sabotajla ölçüldü: `durum === 'kapali'` denetimi
       kaldırıldığında ÖNCE hiçbir test kırılmıyordu. */
    const k = tekrarKarari({
      yeni: bulgu({}),
      gecmis: [bulgu({
        id: 'e', durum: 'acik',
        tespit: simdi - 100 * gun, kapanma: simdi - 50 * gun,
      })],
    });
    expect(k.tekrar).toBe(false);
  });

  it('"kabul_edildi" durumundaki bulgu da tekrar üretmez', () => {
    /* Kapanış tek bir durumdur: `kapali`. Kabul edilmiş bir bulgu
       kapanmamıştır, kabul edilmiştir — ikisi ayrı kararlardır. */
    const k = tekrarKarari({
      yeni: bulgu({}),
      gecmis: [bulgu({
        id: 'e', durum: 'kabul_edildi',
        tespit: simdi - 100 * gun, kapanma: simdi - 50 * gun,
      })],
    });
    expect(k.tekrar).toBe(false);
  });

  it('BAŞKA kontroldeki kapanmış bulgu tekrar üretmez', () => {
    const k = tekrarKarari({
      yeni: bulgu({}),
      gecmis: [bulgu({
        id: 'e', maddeDurumuId: 'BASKA', durum: 'kapali',
        tespit: simdi - 100 * gun, kapanma: simdi - 50 * gun,
      })],
    });
    expect(k.tekrar).toBe(false);
  });

  it('pencere dışında kalan kapanış tekrar üretmez', () => {
    const k = tekrarKarari({
      yeni: bulgu({}),
      gecmis: [bulgu({
        id: 'e', durum: 'kapali', tespit: simdi - 900 * gun, kapanma: simdi - 800 * gun,
      })],
    });
    expect(k.tekrar).toBe(false);
  });

  it('bağı olan bulguya yeniden bağ kurulmaz — insanın kararı ezilmez', () => {
    const k = tekrarKarari({
      yeni: bulgu({ tekrarBulguId: 'baska' }),
      gecmis: [bulgu({
        id: 'e', durum: 'kapali', tespit: simdi - 100 * gun, kapanma: simdi - 50 * gun,
      })],
    });
    expect(k.tekrar).toBe(false);
    expect(k.tekrar === false && k.sebep).toContain('zaten');
  });

  it('EN YAKIN kapanış seçilir — zincir halka halka kurulur', () => {
    const k = tekrarKarari({
      yeni: bulgu({}),
      gecmis: [
        bulgu({ id: 'eski', durum: 'kapali', tespit: simdi - 300 * gun, kapanma: simdi - 250 * gun }),
        bulgu({ id: 'yakin', durum: 'kapali', tespit: simdi - 100 * gun, kapanma: simdi - 20 * gun }),
      ],
    });
    expect(k.tekrar === true && k.oncekiId).toBe('yakin');
  });

  it('kapanışı GELECEKTE olan bulgu aday değildir', () => {
    const k = tekrarKarari({
      yeni: bulgu({}),
      gecmis: [bulgu({
        id: 'e', durum: 'kapali', tespit: simdi - 10 * gun, kapanma: simdi + 5 * gun,
      })],
    });
    expect(k.tekrar).toBe(false);
  });

  it('pencere varsayılanı 365 gündür', () => {
    expect(TEKRAR_PENCERESI_GUN).toBe(365);
  });
});

describe('UY-28 · zincir', () => {
  const gun = 86_400_000;
  const t = 1_800_000_000_000;

  it('tek halkalı zincirde ortalama aralık NULL — sıfır değil', () => {
    /* "Ortalama 0 gün" cümlesi, sorunun sürekli tekrarladığı izlenimini
       verirdi. */
    const z = tekrarZinciri([
      { id: 'a', tespit: t, kapanma: null, durum: 'acik', onemDerecesi: 'orta' },
    ]);
    expect(z.uzunluk).toBe(1);
    expect(z.kronik).toBe(false);
    expect(z.ortalamaAralikGun).toBeNull();
  });

  it('halkalar en ESKİDEN yeniye sıralanır', () => {
    const z = tekrarZinciri([
      { id: 'yeni', tespit: t, kapanma: null, durum: 'acik', onemDerecesi: 'orta' },
      { id: 'eski', tespit: t - 100 * gun, kapanma: t - 90 * gun, durum: 'kapali', onemDerecesi: 'orta' },
    ]);
    expect(z.halkalar.map((h) => h.id)).toEqual(['eski', 'yeni']);
    expect(z.ortalamaAralikGun).toBe(90);
  });

  it(`${KRONIK_ESIK} halkada KRONİK`, () => {
    const z = tekrarZinciri([
      { id: 'a', tespit: t - 300 * gun, kapanma: t - 250 * gun, durum: 'kapali', onemDerecesi: 'orta' },
      { id: 'b', tespit: t - 200 * gun, kapanma: t - 150 * gun, durum: 'kapali', onemDerecesi: 'orta' },
      { id: 'c', tespit: t - 50 * gun, kapanma: null, durum: 'acik', onemDerecesi: 'orta' },
    ]);
    expect(z.kronik).toBe(true);
  });

  it('kapanmamış halka ortalamaya girmez', () => {
    const z = tekrarZinciri([
      { id: 'a', tespit: t - 300 * gun, kapanma: null, durum: 'acik', onemDerecesi: 'orta' },
      { id: 'b', tespit: t - 200 * gun, kapanma: null, durum: 'acik', onemDerecesi: 'orta' },
    ]);
    expect(z.ortalamaAralikGun).toBeNull();
  });
});

describe('UY-28 · özet', () => {
  it('motor bağı ile elle bağ AYRI sayılır', () => {
    const o = tekrarOzeti([
      { tekrarBulguId: 'x', tekrarKaynagi: 'motor', zincirUzunlugu: 2 },
      { tekrarBulguId: 'y', tekrarKaynagi: 'elle', zincirUzunlugu: 2 },
      { tekrarBulguId: null, tekrarKaynagi: null, zincirUzunlugu: 1 },
    ]);
    expect(o.motorBagi).toBe(1);
    expect(o.elleBag).toBe(1);
    expect(o.tekrarEden).toBe(2);
    expect(o.tekrarOrani).toBe(67);
  });

  it('bulgu yoksa oran NULL', () => {
    const o = tekrarOzeti([]);
    expect(o.tekrarOrani).toBeNull();
    expect(tekrarCumlesi(o)).toContain('hesaplanamaz');
  });

  it('kronik varsa cümle ÖNCE onu söyler', () => {
    const o = tekrarOzeti([
      { tekrarBulguId: 'x', tekrarKaynagi: 'motor', zincirUzunlugu: 3 },
    ]);
    expect(tekrarCumlesi(o)).toContain('KRONİK');
  });
});

/* ══ UY-36 · Eskalasyon ══════════════════════════════════════════════ */

describe('UY-36 · kural seçimi', () => {
  const k = (o: Partial<Kural>): Kural => ({
    id: 'k', kaynakTipi: 'bulgu', onemDerecesi: null, kademe: 1,
    gecikmeGun: 7, hedefTuru: 'sorumlu', hedefDeger: null, aktif: true, ...o,
  });

  it('ÖZEL kural GENELİ ezer — aynı kademe iki kez uygulanmaz', () => {
    const secim = gecerliKurallar({
      kurallar: [
        k({ id: 'genel', onemDerecesi: null, kademe: 1, gecikmeGun: 30 }),
        k({ id: 'ozel', onemDerecesi: 'kritik', kademe: 1, gecikmeGun: 3 }),
      ],
      kaynakTipi: 'bulgu', onemDerecesi: 'kritik',
    });
    expect(secim.length).toBe(1);
    expect(secim[0].id).toBe('ozel');
  });

  it('pasif kural seçilmez', () => {
    expect(gecerliKurallar({
      kurallar: [k({ aktif: false })], kaynakTipi: 'bulgu', onemDerecesi: 'orta',
    })).toEqual([]);
  });

  it('başka kaynak tipinin kuralı seçilmez', () => {
    expect(gecerliKurallar({
      kurallar: [k({ kaynakTipi: 'gorev' })], kaynakTipi: 'bulgu', onemDerecesi: 'orta',
    })).toEqual([]);
  });
});

describe('UY-36 · tetikleme', () => {
  const gun = 86_400_000;
  const simdi = 1_800_000_000_000;
  const kurallar: Kural[] = [
    { id: 'k1', kaynakTipi: 'bulgu', onemDerecesi: null, kademe: 1, gecikmeGun: 7,
      hedefTuru: 'sorumlu', hedefDeger: null, aktif: true },
    { id: 'k2', kaynakTipi: 'bulgu', onemDerecesi: null, kademe: 2, gecikmeGun: 14,
      hedefTuru: 'rol', hedefDeger: 'yonetici', aktif: true },
    { id: 'k3', kaynakTipi: 'bulgu', onemDerecesi: null, kademe: 3, gecikmeGun: 30,
      hedefTuru: 'rol', hedefDeger: 'yonetici', aktif: true },
  ];

  it('hedef tarihi OLMAYAN kayıt eskale EDİLMEZ', () => {
    /* Gecikme olmayan bir tarihe göre ölçülemez; "tarihi yok demek ki
       gecikmiş" varsayımı ölçülmemişi kusur saymak olurdu. */
    const t = tetikKarari({
      kurallar, kaynakTipi: 'bulgu', onemDerecesi: 'orta',
      hedefTarih: null, simdi, tetiklenmisKademeler: [],
    });
    expect(t.tetikle).toBe(false);
    expect(t.tetikle === false && t.sebep).toContain('ölçülemez');
  });

  it('hedef tarih geçmediyse tetiklenmez', () => {
    expect(tetikKarari({
      kurallar, kaynakTipi: 'bulgu', onemDerecesi: 'orta',
      hedefTarih: simdi + 5 * gun, simdi, tetiklenmisKademeler: [],
    }).tetikle).toBe(false);
  });

  it('EN YÜKSEK hak edilmiş kademe seçilir, alttakiler ATLANIR', () => {
    /* 40 gün gecikmiş bir kayda üç kademeyi arka arkaya yazmak üç
       bildirim üretir ve hiçbiri okunmaz. */
    const t = tetikKarari({
      kurallar, kaynakTipi: 'bulgu', onemDerecesi: 'orta',
      hedefTarih: simdi - 40 * gun, simdi, tetiklenmisKademeler: [],
    });
    expect(t.tetikle).toBe(true);
    expect(t.tetikle === true && t.kural.kademe).toBe(3);
  });

  it('aynı kademe İKİ KEZ tetiklenmez', () => {
    expect(tetikKarari({
      kurallar, kaynakTipi: 'bulgu', onemDerecesi: 'orta',
      hedefTarih: simdi - 40 * gun, simdi, tetiklenmisKademeler: [3],
    }).tetikle).toBe(false);
  });

  it('ilk eşiğin altındaki gecikme tetiklemez', () => {
    const t = tetikKarari({
      kurallar, kaynakTipi: 'bulgu', onemDerecesi: 'orta',
      hedefTarih: simdi - 3 * gun, simdi, tetiklenmisKademeler: [],
    });
    expect(t.tetikle).toBe(false);
    expect(t.tetikle === false && t.sebep).toContain('altında');
  });

  it('kural yoksa tetiklenmez ve sebebi söylenir', () => {
    const t = tetikKarari({
      kurallar: [], kaynakTipi: 'bulgu', onemDerecesi: 'orta',
      hedefTarih: simdi - 40 * gun, simdi, tetiklenmisKademeler: [],
    });
    expect(t.tetikle).toBe(false);
    expect(t.tetikle === false && t.sebep).toContain('tanımlı eskalasyon kuralı yok');
  });
});

describe('UY-36 · hedef çözümü — hedefsizlik SESSİZCE geçilmez', () => {
  const taban = {
    kaydinSorumlusu: null as string | null, roldekiler: [] as string[],
    kullaniciAktif: null as boolean | null,
  };

  it('sorumlu atanmamışsa hedef bulunamaz ve sebebi yazılır', () => {
    const h = hedefiCoz({ ...taban, hedefTuru: 'sorumlu', hedefDeger: null });
    expect(h.bulundu).toBe(false);
    expect(h.bulundu === false && h.sebep).toContain('sorumlusu atanmamış');
  });

  it('sorumlu varsa çözülür', () => {
    const h = hedefiCoz({
      ...taban, hedefTuru: 'sorumlu', hedefDeger: null, kaydinSorumlusu: 'u1',
    });
    expect(h.bulundu === true && h.kullaniciIdleri).toEqual(['u1']);
  });

  it('rolde aktif kullanıcı yoksa hedef bulunamaz', () => {
    const h = hedefiCoz({ ...taban, hedefTuru: 'rol', hedefDeger: 'yonetici' });
    expect(h.bulundu).toBe(false);
    expect(h.bulundu === false && h.sebep).toContain('aktif kullanıcı yok');
  });

  it('PASİF hedef kullanıcı reddedilir — bildirim okunmayacaktı', () => {
    const h = hedefiCoz({
      ...taban, hedefTuru: 'kullanici', hedefDeger: 'u9', kullaniciAktif: false,
    });
    expect(h.bulundu).toBe(false);
    expect(h.bulundu === false && h.sebep).toContain('PASİF');
  });

  it('tanımsız hedef türü reddedilir', () => {
    expect(hedefiCoz({ ...taban, hedefTuru: 'her_ne_ise', hedefDeger: null })
      .bulundu).toBe(false);
  });
});

describe('UY-36 · matrisin kendi kusurları', () => {
  const k = (o: Partial<Kural>): Kural => ({
    id: 'k', kaynakTipi: 'bulgu', onemDerecesi: null, kademe: 1,
    gecikmeGun: 7, hedefTuru: 'sorumlu', hedefDeger: null, aktif: true, ...o,
  });

  it('üst kademe alttan ÖNCE tetikleniyorsa kusur açılır', () => {
    /* Alt kademe hiç çalışmaz ve kimse fark etmez. */
    const kusurlar = matrisKusurlari([
      k({ id: 'a', kademe: 1, gecikmeGun: 30 }),
      k({ id: 'b', kademe: 2, gecikmeGun: 7 }),
    ]);
    expect(kusurlar.length).toBeGreaterThan(0);
    expect(kusurlar[0].sebep).toContain('alt kademe hiç çalışmaz');
  });

  it('artan gecikmeli matris kusursuzdur', () => {
    expect(matrisKusurlari([
      k({ id: 'a', kademe: 1, gecikmeGun: 7 }),
      k({ id: 'b', kademe: 2, gecikmeGun: 14 }),
    ])).toEqual([]);
  });

  it('boş rol hedefi kusurdur', () => {
    const kusurlar = matrisKusurlari([k({ hedefTuru: 'rol', hedefDeger: null })]);
    expect(kusurlar.some((x) => x.sebep.includes('rol hedefi boş'))).toBe(true);
  });

  it('negatif gecikme kusurdur — hedef tarihten ÖNCE tetiklenir', () => {
    const kusurlar = matrisKusurlari([k({ gecikmeGun: -3 })]);
    expect(kusurlar.some((x) => x.sebep.includes('negatif'))).toBe(true);
  });

  it('pasif kural kusur üretmez', () => {
    expect(matrisKusurlari([
      k({ id: 'a', kademe: 1, gecikmeGun: 30, aktif: false }),
      k({ id: 'b', kademe: 2, gecikmeGun: 7, aktif: false }),
    ])).toEqual([]);
  });

  it('bildirim başlığı kademeyi ve gecikmeyi taşır', () => {
    const b = eskalasyonBasligi({
      kaynakTipi: 'bulgu', kademe: 2, gecikmeGun: 21, baslik: 'Test bulgusu',
    });
    expect(b).toContain('kademe 2');
    expect(b).toContain('21 gün');
  });
});

/* ══ UY-39 · Değişiklik etkisi ═══════════════════════════════════════ */

describe('UY-39 · sürüm farkı', () => {
  const m = (kod: string, baslik: string, metin: string) => ({
    id: `id-${kod}`, kod, baslik, metin,
  });

  it('yeni · değişen · kaldırılan ayrı ayrı bulunur', () => {
    const f = surumFarki({
      eski: [m('A', 'A', 'x'), m('B', 'B', 'y'), m('C', 'C', 'z')],
      yeni: [m('A', 'A', 'x'), m('B', 'B', 'DEĞİŞTİ'), m('D', 'D', 'w')],
    });
    const tip = (kod: string) => f.find((x) => x.maddeKodu === kod)?.degisimTipi;
    expect(tip('B')).toBe('degisti');
    expect(tip('C')).toBe('kaldirildi');
    expect(tip('D')).toBe('yeni');
  });

  it('DEĞİŞMEYEN madde satır ÜRETMEZ', () => {
    /* 300 değişmeyen maddeyi listelemek, değişen 4 maddeyi görünmez
       kılardı. */
    const f = surumFarki({ eski: [m('A', 'A', 'x')], yeni: [m('A', 'A', 'x')] });
    expect(f).toEqual([]);
  });

  it('yalnız başlık değişse de "değişti" sayılır', () => {
    const f = surumFarki({
      eski: [m('A', 'Eski başlık', 'x')], yeni: [m('A', 'Yeni başlık', 'x')],
    });
    expect(f[0].degisimTipi).toBe('degisti');
    expect(f[0].ozet).toContain('→');
  });

  it('kaldırılan satır ESKİ maddenin kimliğini taşır', () => {
    const f = surumFarki({ eski: [m('A', 'A', 'x')], yeni: [] });
    expect(f[0].maddeId).toBe('id-A');
  });
});

describe('UY-39 · etki ağırlığı', () => {
  const iz = (o: Partial<MaddeAyakIzi> = {}): MaddeAyakIzi => ({
    maddeId: 'm', degerlendirme: 0, kararliDegerlendirme: 0, kanitBagi: 0,
    acikBulgu: 0, acikAksiyon: 0, risk: 0, belge: 0, esdegerlik: 0, istisna: 0,
    ...o,
  });

  it('YENİ madde mevcut hiçbir kaydı etkilemez', () => {
    expect(etkiAgirligi({
      degisimTipi: 'yeni', ayakIzi: iz({ acikBulgu: 5 }),
    })).toBe('yok');
  });

  it('açık bulgu en ağır hâldir', () => {
    const a = etkiAgirligi({ degisimTipi: 'kaldirildi', ayakIzi: iz({ acikBulgu: 1 }) });
    expect(a).toBe('yuksek');
    expect(AGIRLIK_SINIFI[a]).toBe('bd');
  });

  it('karar verilmiş değerlendirme orta ağırlıktır', () => {
    expect(etkiAgirligi({
      degisimTipi: 'degisti', ayakIzi: iz({ degerlendirme: 3, kararliDegerlendirme: 3 }),
    })).toBe('orta');
  });

  it('yalnız bağ varsa düşük', () => {
    expect(etkiAgirligi({
      degisimTipi: 'degisti', ayakIzi: iz({ kanitBagi: 2 }),
    })).toBe('dusuk');
  });

  it('bağsız madde: etki yok', () => {
    expect(etkiAgirligi({ degisimTipi: 'kaldirildi', ayakIzi: iz() })).toBe('yok');
  });

  it('sonuç cümlesi NE OLACAĞINI söyler, "olabilir" demez', () => {
    const c = etkiSonucu({
      degisimTipi: 'kaldirildi',
      ayakIzi: iz({ acikBulgu: 2, kararliDegerlendirme: 4, esdegerlik: 1 }),
    });
    expect(c).toContain('2 açık bulgu dayanaksız kalır');
    expect(c).toContain('tarihçede kalır');
    expect(c).not.toContain('olabilir');
  });
});

describe('UY-39 · etki özeti', () => {
  const iz = (o: Partial<MaddeAyakIzi> = {}): MaddeAyakIzi => ({
    maddeId: 'm', degerlendirme: 0, kararliDegerlendirme: 0, kanitBagi: 0,
    acikBulgu: 0, acikAksiyon: 0, risk: 0, belge: 0, esdegerlik: 0, istisna: 0,
    ...o,
  });
  const satir = (tip: 'yeni' | 'degisti' | 'kaldirildi', ayakIzi: MaddeAyakIzi) => ({
    maddeKodu: 'X', degisimTipi: tip, ozet: null, maddeId: ayakIzi.maddeId,
    ayakIzi, agirlik: etkiAgirligi({ degisimTipi: tip, ayakIzi }),
    sonuc: etkiSonucu({ degisimTipi: tip, ayakIzi }),
  });

  it('YENİ maddenin ayak izi halkalara SAYILMAZ', () => {
    /* Yeni madde mevcut kayıtları etkilemez; sayılsaydı "42 kayıt
       etkilenir" sayısı olduğundan büyük çıkardı. */
    const o = etkiOzeti({
      satirlar: [satir('yeni', iz({ degerlendirme: 9 }))], degismeyen: 0,
    });
    expect(o.halkalar.degerlendirme).toBe(0);
    expect(o.yeni).toBe(1);
  });

  it('halkalar AYRI AYRI toplanır, tek sayıya indirilmez', () => {
    const o = etkiOzeti({
      satirlar: [satir('degisti', iz({ kanitBagi: 40, acikBulgu: 2 }))],
      degismeyen: 0,
    });
    expect(o.halkalar.kanitBagi).toBe(40);
    expect(o.halkalar.acikBulgu).toBe(2);
  });

  it('fark yoksa cümle bunu söyler', () => {
    expect(etkiCumlesi(etkiOzeti({ satirlar: [], degismeyen: 300 })))
      .toContain('madde farkı yok');
  });

  it('yüksek etki cümlede ÖNCE söylenir', () => {
    const o = etkiOzeti({
      satirlar: [
        satir('yeni', iz()), satir('yeni', iz()),
        satir('kaldirildi', iz({ acikBulgu: 1 })),
      ],
      degismeyen: 0,
    });
    expect(etkiCumlesi(o)).toContain('açık bulgu');
  });
});

/* ══ UY-41 · Resmî kaynak ════════════════════════════════════════════ */

describe('UY-41 · mevzuat kaynağı', () => {
  const gun = 86_400_000;
  const simdi = 1_800_000_000_000;

  it('kayıtlı sağlayıcı BAĞLI DEĞİL ve bu gizlenmez', () => {
    expect(KAYNAK_SAGLAYICILARI.every((s) => !s.bagli)).toBe(true);
    expect(etkinKaynakSaglayici()).toBeNull();
  });

  it('sağlayıcı ne gerektiğini ve bağlı değilken ne YAPTIĞINI yazar', () => {
    for (const s of KAYNAK_SAGLAYICILARI) {
      expect(s.gereken.length).toBeGreaterThan(40);
      expect(s.bagliDegilkenDavranis.length).toBeGreaterThan(40);
    }
  });

  it('adres yoksa "adressiz" — gecikti DEĞİL', () => {
    /* Adresi olmayan bir kayda "gecikti" demek, kurumun yapmadığı bir
       işi kusur saymak olurdu. */
    const d = takipDurumu({ adres: null, sonKontrol: null, araliksGun: 90, simdi });
    expect(d).toBe('adressiz');
    expect(TAKIP_SINIFI[d]).toBe('unk');
  });

  it('boşluk dolu adres de adressiz sayılır', () => {
    expect(takipDurumu({ adres: '   ', sonKontrol: null, araliksGun: 90, simdi }))
      .toBe('adressiz');
  });

  it('hiç bakılmadıysa "hiç bakılmadı" — sıfır gün DEĞİL', () => {
    const d = takipDurumu({
      adres: 'https://ornek', sonKontrol: null, araliksGun: 90, simdi,
    });
    expect(d).toBe('hic_bakilmadi');
    expect(TAKIP_SINIFI[d]).toBe('unk');
  });

  it('aralık aşılmışsa gecikti', () => {
    expect(takipDurumu({
      adres: 'https://ornek', sonKontrol: simdi - 100 * gun, araliksGun: 90, simdi,
    })).toBe('gecikti');
  });

  it('aralığın %80inden sonrası "yaklaşıyor"', () => {
    expect(takipDurumu({
      adres: 'https://ornek', sonKontrol: simdi - 80 * gun, araliksGun: 90, simdi,
    })).toBe('yaklasiyor');
  });

  it('yeni bakılmış kaynak güncel', () => {
    expect(takipDurumu({
      adres: 'https://ornek', sonKontrol: simdi - 5 * gun, araliksGun: 90, simdi,
    })).toBe('guncel');
  });

  it('güncel oranı yalnız ADRESİ OLANLAR üzerinden; payda 0 ise null', () => {
    const o = takipOzeti(['adressiz', 'adressiz']);
    expect(o.guncelOrani).toBeNull();
    expect(o.adressiz).toBe(2);
  });

  it('gecikme varsa cümle ÖNCE onu söyler', () => {
    expect(takipCumlesi(takipOzeti(['gecikti', 'guncel'])))
      .toContain('kontrol zamanı geçti');
  });

  it('kaynak yoksa "izlenmiyor" denir', () => {
    expect(takipCumlesi(takipOzeti([]))).toContain('izlenmiyor');
  });
});

/* ══ UY-43 · Değerlendirme aktarımı ══════════════════════════════════ */

describe('UY-43 · kuru koşu', () => {
  const mevcut: MevcutKayit[] = [
    { maddeKodu: 'A-1', maddeDurumuId: 'd1', durum: 'degerlendirilmedi', kapsamda: true },
    { maddeKodu: 'A-2', maddeDurumuId: 'd2', durum: 'uyumlu', kapsamda: true },
    { maddeKodu: 'A-3', maddeDurumuId: 'd3', durum: 'uyumlu', kapsamda: false },
  ];

  it('bilinmeyen kod ELENİR', () => {
    const s = kuruKosu({
      satirlar: [{ satirNo: 1, maddeKodu: 'YOK', durum: 'uyumlu' }], mevcut,
    });
    expect(s[0].kabul).toBe(false);
    expect(s[0].kabul === false && s[0].sebep).toBe('kod_bulunamadi');
  });

  it('boş kod elenir', () => {
    const s = kuruKosu({ satirlar: [{ satirNo: 1, maddeKodu: '  ', durum: 'uyumlu' }], mevcut });
    expect(s[0].kabul === false && s[0].sebep).toBe('kod_bos');
  });

  it('YİNELENEN kod elenir — ilki kabul, ikincisi elenir', () => {
    const s = kuruKosu({
      satirlar: [
        { satirNo: 1, maddeKodu: 'A-1', durum: 'uyumlu' },
        { satirNo: 2, maddeKodu: 'A-1', durum: 'kismi' },
      ],
      mevcut,
    });
    expect(s[0].kabul).toBe(true);
    expect(s[1].kabul === false && s[1].sebep).toBe('kod_yinelendi');
  });

  it('sözlükte olmayan durum elenir', () => {
    const s = kuruKosu({
      satirlar: [{ satirNo: 1, maddeKodu: 'A-1', durum: 'her_ne_ise' }], mevcut,
    });
    expect(s[0].kabul === false && s[0].sebep).toBe('durum_gecersiz');
  });

  it('AKTİF istisnası olan madde elenir — onaylı karar ezilmez', () => {
    const s = kuruKosu({
      satirlar: [{ satirNo: 1, maddeKodu: 'A-3', durum: 'uyumlu' }], mevcut,
    });
    expect(s[0].kabul === false && s[0].sebep).toBe('kapsam_disi_madde');
  });

  it('"uyumsuz" gerekçesiz elenir', () => {
    /* Kurumun kendi aleyhine verdiği karar denetimde ilk sorulandır;
       gerekçesiz toplu aktarımla yazılması tam olarak yakalanmak
       isteneni üretirdi. */
    const s = kuruKosu({
      satirlar: [{ satirNo: 1, maddeKodu: 'A-1', durum: 'uyumsuz' }], mevcut,
    });
    expect(s[0].kabul === false && s[0].sebep).toBe('gerekce_eksik');
  });

  it('gerekçeli "uyumsuz" kabul edilir', () => {
    const s = kuruKosu({
      satirlar: [{
        satirNo: 1, maddeKodu: 'A-1', durum: 'uyumsuz', gerekce: 'Kontrol kurulmadı',
      }],
      mevcut,
    });
    expect(s[0].kabul).toBe(true);
  });

  it('gerekçe zorunluluğu yalnız uyumsuz ve kapsam dışı için', () => {
    expect(gerekceZorunluMu('uyumsuz')).toBe(true);
    expect(gerekceZorunluMu('kapsamdisi')).toBe(true);
    expect(gerekceZorunluMu('uyumlu')).toBe(false);
    expect(gerekceZorunluMu('kismi')).toBe(false);
  });

  it('AYNI durum kabul edilir ama "değişmiyor" işaretlenir', () => {
    /* 300 satırın 300'ü aynıysa "300 kayıt güncellendi" demek denetim
       izini gürültüye boğardı. */
    const s = kuruKosu({
      satirlar: [{ satirNo: 1, maddeKodu: 'A-2', durum: 'uyumlu' }], mevcut,
    });
    expect(s[0].kabul).toBe(true);
    expect(s[0].kabul === true && s[0].degisiyor).toBe(false);
  });
});

describe('UY-43 · sayımlar ve uygulama kapısı', () => {
  const mevcut: MevcutKayit[] = [
    { maddeKodu: 'A-1', maddeDurumuId: 'd1', durum: 'degerlendirilmedi', kapsamda: true },
    { maddeKodu: 'A-2', maddeDurumuId: 'd2', durum: 'uyumlu', kapsamda: true },
  ];

  it('eşleşen ile değişen AYRI sayılır', () => {
    const s = kuruKosu({
      satirlar: [
        { satirNo: 1, maddeKodu: 'A-1', durum: 'uyumlu' },
        { satirNo: 2, maddeKodu: 'A-2', durum: 'uyumlu' },
      ],
      mevcut,
    });
    const c = aktarimSayimlari(s);
    expect(c.eslesen).toBe(2);
    expect(c.degisen).toBe(1);
    expect(c.aynikalan).toBe(1);
  });

  it('KURU KOŞUSUZ uygulama reddedilir', () => {
    const k = uygulamaKapisi({
      sayimlar: { okunan: 5, eslesen: 5, elenen: 0, degisen: 5, aynikalan: 0, sebepler: {} },
      kuruKosuVar: false,
    });
    expect(k.ok).toBe(false);
    expect(k.ok === false && k.sebep).toContain('önizlemesiz uygulanamaz');
  });

  it('değişecek satır yoksa uygulanmaz', () => {
    const k = uygulamaKapisi({
      sayimlar: { okunan: 5, eslesen: 5, elenen: 0, degisen: 0, aynikalan: 5, sebepler: {} },
      kuruKosuVar: true,
    });
    expect(k.ok).toBe(false);
  });

  it('eleme oranı tavanı aşarsa aktarım UYGULANMAZ', () => {
    /* Yarısı elenen bir dosya büyük ihtimalle yanlış regülasyona ya da
       yanlış santrale aktarılıyordur; kalan azınlığı sessizce yazmak
       doğru görünen ama yanlış yere yazılmış bir aktarım üretirdi. */
    const k = uygulamaKapisi({
      sayimlar: { okunan: 10, eslesen: 4, elenen: 6, degisen: 4, aynikalan: 0, sebepler: {} },
      kuruKosuVar: true,
    });
    expect(k.ok).toBe(false);
    expect(k.ok === false && k.sebep).toContain('yanlış');
  });

  it('tavan altındaki eleme oranı geçer', () => {
    expect(uygulamaKapisi({
      sayimlar: { okunan: 10, eslesen: 8, elenen: 2, degisen: 8, aynikalan: 0, sebepler: {} },
      kuruKosuVar: true,
    }).ok).toBe(true);
  });

  it('tavan ve satır sınırı sabittir', () => {
    expect(ELEME_TAVANI).toBe(0.5);
    expect(SATIR_TAVANI).toBe(5000);
  });

  it('cümle eşleşen–değişen ayrımını taşır', () => {
    const c = aktarimCumlesi({
      okunan: 10, eslesen: 8, elenen: 2, degisen: 3, aynikalan: 5, sebepler: {},
    });
    expect(c).toContain('3 kontrolün durumu değişecek');
    expect(c).toContain('5 satır zaten aynı durumda');
  });
});

describe('UY-43 · metin ayrıştırma (ekran mantığı)', () => {
  it('sekmeyle ayrılmış satırlar okunur', () => {
    const a = metniAyristir('A-1\tuyumlu\nA-2\tkismi\tnot metni');
    expect(a.satirlar.length).toBe(2);
    expect(a.satirlar[1].not).toBe('not metni');
  });

  it('VİRGÜL ayraç DEĞİLDİR — gerekçe metinleri virgül taşır', () => {
    const a = metniAyristir('A-1\tuyumsuz\t\tKontrol yok, süreç de yok');
    expect(a.satirlar[0].gerekce).toBe('Kontrol yok, süreç de yok');
  });

  it('noktalı virgül ayraç kabul edilir', () => {
    const a = metniAyristir('A-1;uyumlu');
    expect(a.satirlar[0].maddeKodu).toBe('A-1');
    expect(a.satirlar[0].durum).toBe('uyumlu');
  });

  it('başlık satırı atlanır ve bozuk sayılmaz', () => {
    const a = metniAyristir('Madde kodu\tDurum\nA-1\tuyumlu');
    expect(a.satirlar.length).toBe(1);
    expect(a.bozuk.length).toBe(0);
  });

  it('tek sütunlu satır SESSİZCE ATILMAZ, bozuk olarak sayılır', () => {
    const a = metniAyristir('A-1\tuyumlu\nsadece-bir-hucre');
    expect(a.satirlar.length).toBe(1);
    expect(a.bozuk.length).toBe(1);
    expect(a.bozuk[0].satirNo).toBe(2);
  });

  it('boş satırlar atlanır', () => {
    const a = metniAyristir('A-1\tuyumlu\n\n\nA-2\tkismi');
    expect(a.satirlar.length).toBe(2);
    expect(a.bozuk.length).toBe(0);
  });

  it('satır numarası KAYNAK dosyadaki numaradır', () => {
    const a = metniAyristir('A-1\tuyumlu\n\nA-2\tkismi');
    expect(a.satirlar[1].satirNo).toBe(3);
  });
});

describe('UY-43 · kütük özeti (ekran mantığı)', () => {
  const satir = (o: Record<string, unknown>) => ({
    id: 'a', durum: 'kuru_kosu' as const, kaynakAdi: 'k', regulasyonKod: 'R',
    tesisKod: 'T', surecKod: null, okunan: 10, eslesen: 8, elenen: 2, degisen: 3,
    kuruKosuId: null, uygulandiMi: false, yukleyen: null,
    olusturuldu: '2026-01-01', uygulandi: null, ...o,
  });

  it('uygulanmış kuru koşu "bekleyen" sayılmaz', () => {
    const o = aktarimOzeti([satir({ uygulandiMi: true })]);
    expect(o.bekleyen).toBe(0);
  });

  it('KÖKENSİZ uygulama sayılır ve cümlede ÖNCE söylenir', () => {
    /* Sunucu kökensiz uygulama yazmaz; sıfırdan büyükse veritabanı
       dışarıdan değiştirilmiş demektir. */
    const o = aktarimOzeti([satir({ durum: 'uygulandi', kuruKosuId: null })]);
    expect(o.kokensizUygulama).toBe(1);
    expect(ozetCumlesi(o)).toContain('kökensiz');
  });

  it('kökenli uygulama kusur değildir', () => {
    const o = aktarimOzeti([satir({ durum: 'uygulandi', kuruKosuId: 'k1', degisen: 4 })]);
    expect(o.kokensizUygulama).toBe(0);
    expect(o.degisenToplam).toBe(4);
  });

  it('kayıt yoksa cümle bunu söyler', () => {
    expect(ozetCumlesi(aktarimOzeti([]))).toContain('kaydı yok');
  });

  it('satır altı kuru koşuda "değişecek", uygulamada "DEĞİŞTİ" der', () => {
    expect(satirAlti(satir({}) as never)).toContain('değişecek');
    expect(satirAlti(satir({ durum: 'uygulandi' }) as never)).toContain('DEĞİŞTİ');
  });
});
