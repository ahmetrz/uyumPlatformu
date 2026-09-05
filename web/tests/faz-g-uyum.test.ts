import { describe, expect, it } from 'vitest';
import {
  OLGUNLUK_ADI, OLGUNLUK_AZAMI, OLGUNLUK_SINIFI, gecerliSeviye, kademeFarki,
  olgunlukCumlesi, olgunlukDurumu, olgunlukKapisi, olgunlukOzeti,
} from '@/lib/uyum/olgunluk';
import {
  BILDIRIM_SINIFI, SIDDET_SIRASI, bildirimCumlesi, bildirimKarari,
  bildirimOzeti, kuralKapisi, siddetYeterli, sonTarih, uyanYukumluluk,
  type Yukumluluk,
} from '@/lib/uyum/bildirimSuresi';
import {
  DURUS_SINIFI, TEST_TAZELIK_GUN, testCumlesi, testDurusu, testKapisi, testOzeti,
} from '@/lib/uyum/kontrolTesti';
import {
  PERIYOT_GUN, YASAYAN_SINIFI, ggCumlesi, ggOzeti, kararKapisi, yapildiKapisi,
  yasayanDurum,
} from '@/lib/uyum/gozdenGecirme';
import {
  YENILEME_UYARI_GUN, egitimCumlesi, egitimDurumu, egitimKapisi,
  egitimKapsamasi, gecerlilikBitisi, kayitKapisi,
} from '@/lib/uyum/egitim';

/* ═══════════════════════════════════════════════════════════════════════
   FAZ G · UY-59 · UY-63 · UY-64 · UY-65 · UY-66 — saf karar katmanı

   Çivilenen kurallar:
     · ölçülmemiş olgunluk `null`dur; SIFIR ayrı bir şeydir,
     · olgunlukta ORTALAMA alınmaz, dağılım tutulur,
     · seviye 3+ gerekçe ister,
     · bildirim süresi kural YOKSA hiç işlemez — süre uydurulmaz,
     · birden çok kural uyarsa EN KISA süre kazanır,
     · saat olayın BAŞLANGICINDAN işler,
     · işleyiş testi örneklem ister; tasarım testi çalıştığını göstermez,
     · kararsız gözden geçirme "yapıldı" olamaz,
     · süresiz eğitim bilinçli bir karardır; kapsamı sıfır eğitimde oran
       `null`dur — "%100" DEĞİL.
   ═══════════════════════════════════════════════════════════════════════ */

const GUN = 86_400_000;
const SAAT = 3_600_000;

describe('UY-59 · Olgunluk — ölçülmedi ≠ sıfır', () => {
  it('ölçülmemiş olgunluk `olculmedi`; sıfır ölçülmüş bir sonuçtur [UYU-OLG-001]', () => {
    expect(olgunlukDurumu({ olculen: null, hedef: 3 })).toBe('olculmedi');
    expect(olgunlukDurumu({ olculen: 0, hedef: 3 })).toBe('hedefin_altinda');
    expect(OLGUNLUK_SINIFI.olculmedi).toBe('unk');
    expect(OLGUNLUK_ADI[0]).toMatch(/başlamadı/);
  });

  it('hedefsiz ölçüm ayrı bir durumdur', () => {
    expect(olgunlukDurumu({ olculen: 4, hedef: null })).toBe('hedefsiz');
  });

  it('hedefte ve üstünde ayrı ama ikisi de yeşildir', () => {
    expect(olgunlukDurumu({ olculen: 3, hedef: 3 })).toBe('hedefte');
    expect(olgunlukDurumu({ olculen: 5, hedef: 3 })).toBe('hedefin_ustunde');
    expect(OLGUNLUK_SINIFI.hedefin_ustunde).toBe('ok');
  });

  it('kademe farkı ölçülmemişte NULL döner', () => {
    expect(kademeFarki({ olculen: 1, hedef: 4 })).toBe(-3);
    expect(kademeFarki({ olculen: null, hedef: 4 })).toBeNull();
    expect(kademeFarki({ olculen: 4, hedef: null })).toBeNull();
  });

  it('geçerli seviye 0-5 arası tam sayıdır', () => {
    expect(gecerliSeviye(0)).toBe(true);
    expect(gecerliSeviye(OLGUNLUK_AZAMI)).toBe(true);
    expect(gecerliSeviye(6)).toBe(false);
    expect(gecerliSeviye(2.5)).toBe(false);
    expect(gecerliSeviye('3')).toBe(false);
  });
});

describe('UY-59 · Olgunluk kapısı', () => {
  it('seviye 3 ve üstü GEREKÇE ister', () => {
    const k = olgunlukKapisi({ seviye: 3, gerekce: null });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/gerekçe ister/);
    expect(olgunlukKapisi({ seviye: 3, gerekce: 'Prosedür yayımlandı' }).ok).toBe(true);
  });

  it('alt kademeler gerekçesiz yazılabilir', () => {
    expect(olgunlukKapisi({ seviye: 0, gerekce: null }).ok).toBe(true);
    expect(olgunlukKapisi({ seviye: 2, gerekce: null }).ok).toBe(true);
  });

  it('ölçümü KALDIRMAK serbesttir', () => {
    expect(olgunlukKapisi({ seviye: null, gerekce: null }).ok).toBe(true);
  });

  it('aralık dışı seviye reddedilir', () => {
    expect(olgunlukKapisi({ seviye: 9, gerekce: 'x' }).ok).toBe(false);
  });
});

describe('UY-59 · Özet — ORTALAMA alınmaz', () => {
  it('dağılım tutulur; ortalama diye bir alan YOKTUR', () => {
    const o = olgunlukOzeti([
      { olculen: 5, hedef: 3 }, { olculen: 1, hedef: 3 },
      { olculen: null, hedef: 3 }, { olculen: 3, hedef: null },
    ]);
    expect(o.dagilim[5]).toBe(1);
    expect(o.dagilim[1]).toBe(1);
    expect(o.dagilim[3]).toBe(1);
    expect(o.olculen).toBe(3);
    expect(o.olculmeyen).toBe(1);
    expect(o.hedefsiz).toBe(1);
    expect(o.hedefinAltinda).toBe(1);
    expect('ortalama' in o).toBe(false);
  });

  it('hiç ölçülmemişse cümle bunu söyler', () => {
    const o = olgunlukOzeti([{ olculen: null, hedef: 3 }]);
    expect(olgunlukCumlesi(o)).toMatch(/sıfır DEĞİLDİR/);
  });
});

describe('UY-63 · Bildirim — süre ÜRÜNLE GELMEZ', () => {
  const kural = (ek: Partial<Yukumluluk> = {}): Yukumluluk => ({
    id: 'k1', kod: 'K1', ad: 'Kural', regulasyonId: null,
    asgariSiddet: 'yuksek', sureSaat: 24, merci: 'Merci', aktif: true, ...ek,
  });
  const simdi = Date.UTC(2026, 8, 4, 12);

  it('KURAL YOKSA sayaç hiç işlemez ve süre uydurulmaz', () => {
    const k = bildirimKarari({
      siddet: 'kritik', baslangic: simdi - 100 * SAAT, simdi,
      bildirimGerekli: true, bildirimTarihi: null,
      regulasyonIdleri: [], kurallar: [],
    });
    expect(k.durum).toBe('yukumluluk_yok');
    expect(k.sonTarih).toBeNull();
    expect(k.yukumluluk).toBeNull();
  });

  it('şiddet eşiği karşılanmazsa yükümlülük doğmaz', () => {
    expect(siddetYeterli('orta', 'yuksek')).toBe(false);
    expect(siddetYeterli('kritik', 'yuksek')).toBe(true);
    expect(siddetYeterli('bilinmeyen', 'yuksek')).toBe(false);
    for (const s of SIDDET_SIRASI) expect(siddetYeterli(s, 'dusuk')).toBe(true);
  });

  it('birden çok kural uyarsa EN KISA süre kazanır', () => {
    const k = uyanYukumluluk({
      siddet: 'kritik', regulasyonIdleri: ['r1'],
      kurallar: [kural({ sureSaat: 72 }), kural({ id: 'k2', sureSaat: 24, regulasyonId: 'r1' })],
    });
    expect(k?.sureSaat).toBe(24);
  });

  it('regülasyona bağlı kural, o regülasyon kapsamda değilse uymaz', () => {
    expect(uyanYukumluluk({
      siddet: 'kritik', regulasyonIdleri: ['r9'],
      kurallar: [kural({ regulasyonId: 'r1' })],
    })).toBeNull();
  });

  it('pasif kural uymaz', () => {
    expect(uyanYukumluluk({
      siddet: 'kritik', regulasyonIdleri: [], kurallar: [kural({ aktif: false })],
    })).toBeNull();
  });

  /* Saat KAYDIN AÇILDIĞI andan değil, OLAYIN BAŞLANGICINDAN işler. */
  it('son tarih olayın BAŞLANGICINDAN hesaplanır', () => {
    expect(sonTarih(simdi, 24)).toBe(simdi + 24 * SAAT);
  });

  it('süre geçtiyse GECİKTİ; kalan süre negatiftir', () => {
    const k = bildirimKarari({
      siddet: 'kritik', baslangic: simdi - 48 * SAAT, simdi,
      bildirimGerekli: null, bildirimTarihi: null,
      regulasyonIdleri: [], kurallar: [kural()],
    });
    expect(k.durum).toBe('GECIKTI');
    expect(k.kalanDakika).toBeLessThan(0);
    expect(BILDIRIM_SINIFI.GECIKTI).toBe('bd');
  });

  it('yarısı geçince süre DARALIYOR', () => {
    const k = bildirimKarari({
      siddet: 'kritik', baslangic: simdi - 20 * SAAT, simdi,
      bildirimGerekli: null, bildirimTarihi: null,
      regulasyonIdleri: [], kurallar: [kural()],
    });
    expect(k.durum).toBe('sure_daraliyor');
  });

  it('süresinde bildirim `bildirildi`, sonrası GEÇ BİLDİRİLDİ', () => {
    const ortak = {
      siddet: 'kritik', baslangic: simdi - 48 * SAAT, simdi,
      bildirimGerekli: true, regulasyonIdleri: [], kurallar: [kural()],
    };
    expect(bildirimKarari({ ...ortak, bildirimTarihi: simdi - 30 * SAAT }).durum)
      .toBe('bildirildi');
    expect(bildirimKarari({ ...ortak, bildirimTarihi: simdi - 2 * SAAT }).durum)
      .toBe('gec_bildirildi');
    /* Geç bildirim "tamam" değildir: yükümlülük ihlal edilmiştir. */
    expect(BILDIRIM_SINIFI.gec_bildirildi).toBe('bd');
  });

  it('insan "gerekmiyor" dediyse kural uysa bile sayaç susar', () => {
    const k = bildirimKarari({
      siddet: 'kritik', baslangic: simdi - 100 * SAAT, simdi,
      bildirimGerekli: false, bildirimTarihi: null,
      regulasyonIdleri: [], kurallar: [kural()],
    });
    expect(k.durum).toBe('yukumluluk_yok');
  });

  it('özet gecikeni öne çıkarır', () => {
    const o = bildirimOzeti([
      { durum: 'GECIKTI', sonTarih: 1, kalanDakika: -10, yukumluluk: kural() },
      { durum: 'bildirildi', sonTarih: 1, kalanDakika: 10, yukumluluk: kural() },
    ]);
    expect(o.gecikti).toBe(1);
    expect(bildirimCumlesi(o)).toMatch(/GEÇTİ/);
  });
});

describe('UY-63 · Kural kapısı — DAYANAKSIZ süre olmaz', () => {
  const temel = { sureSaat: 24, asgariSiddet: 'yuksek', dayanak: 'Madde 5', merci: 'Kurum' };

  it('dayanaksız kural reddedilir', () => {
    const k = kuralKapisi({ ...temel, dayanak: '  ' });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/hangi mevzuat/);
  });

  it('mercisiz kural reddedilir', () => {
    expect(kuralKapisi({ ...temel, merci: '' }).ok).toBe(false);
  });

  it('sıfır ve saçma süreler reddedilir', () => {
    expect(kuralKapisi({ ...temel, sureSaat: 0 }).ok).toBe(false);
    expect(kuralKapisi({ ...temel, sureSaat: 24 * 91 }).ok).toBe(false);
  });

  it('geçerli kural kabul edilir', () => {
    expect(kuralKapisi(temel).ok).toBe(true);
  });
});

describe('UY-64 · Kontrol testi kapısı', () => {
  const simdi = Date.UTC(2026, 8, 4);
  const tasarim = {
    yontem: 'tasarim', evrenSayisi: null, orneklemSayisi: null, uygunSayisi: null,
    sonuc: 'uygun', testTarihi: simdi - GUN, simdi,
  };

  it('tasarım testinde örneklem alanları BOŞ olmalı', () => {
    expect(testKapisi(tasarim).ok).toBe(true);
    const k = testKapisi({ ...tasarim, orneklemSayisi: 5 });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/örneklemi yoktur/);
  });

  it('işleyiş testi ÖRNEKLEM İSTER', () => {
    const k = testKapisi({ ...tasarim, yontem: 'isleyis' });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/ÖRNEKLEM ister/);
  });

  it('örneklem evrenden büyük olamaz', () => {
    expect(testKapisi({
      ...tasarim, yontem: 'isleyis', evrenSayisi: 10, orneklemSayisi: 11, uygunSayisi: 5,
    }).ok).toBe(false);
  });

  it('kayıt kendi sayılarıyla ÇELİŞEMEZ', () => {
    /* Örneklemin tamamı uygun ama sonuç "uygun değil". */
    const a = testKapisi({
      ...tasarim, yontem: 'isleyis', evrenSayisi: 10, orneklemSayisi: 5,
      uygunSayisi: 5, sonuc: 'uygun_degil',
    });
    expect(a.ok).toBe(false);
    /* Uygunsuz kayıt var ama sonuç "uygun". */
    const b = testKapisi({
      ...tasarim, yontem: 'isleyis', evrenSayisi: 10, orneklemSayisi: 5,
      uygunSayisi: 3, sonuc: 'uygun',
    });
    expect(b.ok).toBe(false);
    if (b.ok) return;
    expect(b.sebep).toMatch(/2 uygunsuz/);
  });

  it('tutarlı işleyiş testi kabul edilir', () => {
    expect(testKapisi({
      ...tasarim, yontem: 'isleyis', evrenSayisi: 100, orneklemSayisi: 20,
      uygunSayisi: 18, sonuc: 'kismen',
    }).ok).toBe(true);
  });

  it('gelecek tarihli test reddedilir', () => {
    expect(testKapisi({ ...tasarim, testTarihi: simdi + GUN }).ok).toBe(false);
  });
});

describe('UY-64 · Test duruşu — tasarım işleyişin yerine geçmez', () => {
  const simdi = Date.UTC(2026, 8, 4);

  it('test yoksa "uygunsuz" DEĞİL, ölçülmemiştir', () => {
    expect(testDurusu({ testler: [], simdi })).toBe('test_yok');
    expect(DURUS_SINIFI.test_yok).toBe('unk');
  });

  it('yalnız tasarım testi varsa duruş bunu AÇIKÇA söyler', () => {
    expect(testDurusu({
      testler: [{ yontem: 'tasarim', sonuc: 'uygun', testTarihi: simdi - GUN }], simdi,
    })).toBe('yalniz_tasarim');
    expect(DURUS_SINIFI.yalniz_tasarim).toBe('md');
  });

  it('işleyiş testi tasarımın önüne geçer', () => {
    expect(testDurusu({
      testler: [
        { yontem: 'tasarim', sonuc: 'uygun', testTarihi: simdi - GUN },
        { yontem: 'isleyis', sonuc: 'uygun_degil', testTarihi: simdi - 2 * GUN },
      ],
      simdi,
    })).toBe('isleyis_uygunsuz');
  });

  it('EN YENİ işleyiş testi belirleyicidir', () => {
    expect(testDurusu({
      testler: [
        { yontem: 'isleyis', sonuc: 'uygun_degil', testTarihi: simdi - 100 * GUN },
        { yontem: 'isleyis', sonuc: 'uygun', testTarihi: simdi - GUN },
      ],
      simdi,
    })).toBe('isleyis_uygun');
  });

  it('eski test BAYAT sayılır', () => {
    expect(testDurusu({
      testler: [{
        yontem: 'isleyis', sonuc: 'uygun',
        testTarihi: simdi - (TEST_TAZELIK_GUN + 1) * GUN,
      }],
      simdi,
    })).toBe('bayat');
  });

  it('özet testsiz kontrolü "uygunsuz" saymaz', () => {
    const o = testOzeti(['test_yok', 'test_yok', 'isleyis_uygun']);
    expect(o.testsiz).toBe(2);
    expect(o.isleyisKapsamasi).toBe(33);
    expect(testCumlesi(o)).toMatch(/ölçülmemiş/);
  });
});

describe('UY-65 · Gözden geçirme', () => {
  const simdi = Date.UTC(2026, 8, 4);

  it('KARARSIZ "yapıldı" kaydı en ağır kusurdur', () => {
    expect(yasayanDurum({
      durum: 'yapildi', tarih: simdi - GUN, simdi, kararSayisi: 0,
    })).toBe('kararsiz');
    expect(YASAYAN_SINIFI.kararsiz).toBe('bd');
  });

  it('planlanan tarih geçmişse uyarır', () => {
    expect(yasayanDurum({
      durum: 'planli', tarih: simdi - GUN, simdi, kararSayisi: 0,
    })).toBe('gecikmis_plan');
  });

  it('kararı olan yapıldı kaydı sağlamdır', () => {
    expect(yasayanDurum({
      durum: 'yapildi', tarih: simdi - GUN, simdi, kararSayisi: 3,
    })).toBe('yapildi');
  });

  it('kararsız toplantı TAMAMLANAMAZ', () => {
    const k = yapildiKapisi({ kararSayisi: 0, ozet: 'x', tarih: simdi - GUN, simdi });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/en az bir karar/i);
  });

  it('özetsiz toplantı tamamlanamaz', () => {
    expect(yapildiKapisi({
      kararSayisi: 2, ozet: '  ', tarih: simdi - GUN, simdi,
    }).ok).toBe(false);
  });

  it('gelecekteki toplantı "yapıldı" olamaz', () => {
    expect(yapildiKapisi({
      kararSayisi: 2, ozet: 'ok', tarih: simdi + GUN, simdi,
    }).ok).toBe(false);
  });

  it('karar SORUMLU ve SON TARİH ister', () => {
    expect(kararKapisi({ karar: 'tamam', sorumluVar: true, sonTarih: simdi }).ok).toBe(false);
    expect(kararKapisi({
      karar: 'Ağ segmentasyonu gözden geçirilecek', sorumluVar: false, sonTarih: simdi,
    }).ok).toBe(false);
    expect(kararKapisi({
      karar: 'Ağ segmentasyonu gözden geçirilecek', sorumluVar: true, sonTarih: null,
    }).ok).toBe(false);
    expect(kararKapisi({
      karar: 'Ağ segmentasyonu gözden geçirilecek', sorumluVar: true, sonTarih: simdi,
    }).ok).toBe(true);
  });

  it('hiç kayıt yoksa cümle bunun zorunlu bir kayıt olduğunu söyler', () => {
    const o = ggOzeti({ duruslar: [], acikKarar: 0, gecikmisKarar: 0, sonYapilan: null, simdi });
    expect(ggCumlesi(o)).toMatch(/zorunlu bir kayıt/);
  });

  it('periyot aşımı görünür', () => {
    const o = ggOzeti({
      duruslar: ['yapildi'], acikKarar: 0, gecikmisKarar: 0,
      sonYapilan: simdi - (PERIYOT_GUN + 10) * GUN, simdi,
    });
    expect(ggCumlesi(o)).toMatch(/gün geçti/);
  });
});

describe('UY-66 · Eğitim', () => {
  const simdi = Date.UTC(2026, 8, 4);

  it('kaydı olmayan kişi eğitimi ALMAMIŞ sayılır', () => {
    expect(egitimDurumu({ gecerlilikBitis: null, kayitVar: false, simdi })).toBe('kayit_yok');
  });

  it('süresiz eğitim GEÇERLİDİR — ölçülmemiş değil', () => {
    expect(egitimDurumu({ gecerlilikBitis: null, kayitVar: true, simdi })).toBe('suresiz');
  });

  it('geçerlilik bitişi ve yenileme uyarısı', () => {
    expect(egitimDurumu({
      gecerlilikBitis: simdi - GUN, kayitVar: true, simdi,
    })).toBe('suresi_doldu');
    expect(egitimDurumu({
      gecerlilikBitis: simdi + (YENILEME_UYARI_GUN - 1) * GUN, kayitVar: true, simdi,
    })).toBe('yenilenmeli');
    expect(egitimDurumu({
      gecerlilikBitis: simdi + 200 * GUN, kayitVar: true, simdi,
    })).toBe('gecerli');
  });

  it('geçerlilik TAMAMLANMA tarihinden hesaplanır', () => {
    const t = Date.UTC(2026, 0, 15);
    const b = gecerlilikBitisi(t, 12);
    expect(b).not.toBeNull();
    expect(new Date(b!).getUTCFullYear()).toBe(2027);
    expect(gecerlilikBitisi(t, null)).toBeNull();
  });

  it('geçersiz geçerlilik süresi reddedilir; süresiz kabul edilir', () => {
    expect(egitimKapisi({ gecerlilikAy: 0 }).ok).toBe(false);
    expect(egitimKapisi({ gecerlilikAy: 121 }).ok).toBe(false);
    expect(egitimKapisi({ gecerlilikAy: null }).ok).toBe(true);
  });

  it('gelecek tarihli katılım kaydı reddedilir', () => {
    expect(kayitKapisi({ tamamlanma: simdi + GUN, simdi }).ok).toBe(false);
    expect(kayitKapisi({ tamamlanma: simdi - GUN, simdi }).ok).toBe(true);
  });

  /* Kapsamı sıfır olan eğitimde oran NULL'dur: "%100 tamamlandı"
     göstermek ekranı yalan söyler hâle getirirdi. */
  it('kapsamı SIFIR eğitimde oran NULL — %100 DEĞİL', () => {
    const o = egitimKapsamasi({ durumlar: [] });
    expect(o.kapsam).toBe(0);
    expect(o.oran).toBeNull();
    expect(egitimCumlesi(o)).toMatch(/ÖLÇÜLMEDİ/);
  });

  it('kapsama oranı geçerli + yenilenmeli üzerinden hesaplanır', () => {
    const o = egitimKapsamasi({
      durumlar: ['gecerli', 'gecerli', 'yenilenmeli', 'suresi_doldu', 'kayit_yok'],
    });
    expect(o.kapsam).toBe(5);
    expect(o.gecerli).toBe(2);
    expect(o.kaydiOlmayan).toBe(1);
    expect(o.oran).toBe(60);
    expect(egitimCumlesi(o)).toMatch(/kaydı YOK/);
  });
});
