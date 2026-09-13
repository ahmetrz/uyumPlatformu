import { describe, expect, it } from 'vitest';
import {
  DEGISMEZ_TIPLER, POLITIKA_SINIFI, POLITIKA_SOZU, SAKLANABILIR_TIPLER,
  SURE_SONU_SECENEKLERI, SURE_SONU_SOZU, TIP_ETIKETI, degismezMi,
  holdAltindaMi, imhaOnayKapisi, imhaOnerisiKapisi, imhaUygulamaKapisi,
  politikaDurumu, saklamaCumlesi, saklamaOzeti,
} from '@/lib/uyum/saklama';
import {
  AZAMI_SURE_GUN, BITIS_UYARI_GUN, YASAYAN_SINIFI, YASAYAN_SOZU,
  davetKapisi, denetciCumlesi, denetciOzeti, erisimAcikMi, yasayanDurum,
} from '@/lib/uyum/denetciErisimi';
import {
  GIRIS_SOZU, KIMLIK_AILE_ETIKETI, PLATFORM_SAGLAYICILARI, girisYontemi,
  kimlikBeyani, platformSaglayicisi,
} from '@/lib/altyapi/kimlikSaglayici';

/* ═══════════════════════════════════════════════════════════════════════
   UY-53 · SSO/MFA  ·  UY-55 · yük  ·  UY-56 · saklama  ·  UY-57 · denetçi

   Saf karar katmanı. Veritabanına dokunan davranış
   `tests/faz-f-eylem.test.ts` içindedir.
   ═══════════════════════════════════════════════════════════════════════ */

const GUN = 86_400_000;

describe('UY-56 · Saklama politikası durumu', () => {
  it('politika yoksa TANIMSIZ — süresiz değil [SAK-SUR-001]', () => {
    expect(politikaDurumu(null)).toBe('tanimsiz');
  });

  /* Süresiz saklama bir KUSUR DEĞİLDİR ama ölçülmüş bir süre de
     değildir: ayrı yazılır ve gri gösterilir. */
  it('süresiz ile tanımlı AYRI durumlardır', () => {
    expect(politikaDurumu({ saklamaGun: null, aktif: true })).toBe('suresiz');
    expect(politikaDurumu({ saklamaGun: 365, aktif: true })).toBe('tanimli');
    expect(POLITIKA_SINIFI.suresiz).toBe('unk');
    expect(POLITIKA_SINIFI.tanimsiz).toBe('bd');
  });

  it('pasif politika tanımlı sayılmaz', () => {
    expect(politikaDurumu({ saklamaGun: 365, aktif: false })).toBe('pasif');
  });

  it('her durumun sözü vardır', () => {
    for (const d of ['tanimli', 'suresiz', 'tanimsiz', 'pasif'] as const) {
      expect(POLITIKA_SOZU[d]).toBeTruthy();
    }
    for (const t of SAKLANABILIR_TIPLER) expect(TIP_ETIKETI[t]).toBeTruthy();
    for (const s of SURE_SONU_SECENEKLERI) expect(SURE_SONU_SOZU[s]).toBeTruthy();
  });
});

describe('UY-56 · Değişmez aileler', () => {
  it('denetim izi ve değerlendirme tarihçesi DEĞİŞMEZDİR', () => {
    expect(degismezMi('AktiviteKaydi')).toBe(true);
    expect(degismezMi('DegerlendirmeTarihcesi')).toBe(true);
    expect(degismezMi('Bulgu')).toBe(false);
    for (const t of DEGISMEZ_TIPLER) expect(SAKLANABILIR_TIPLER).toContain(t);
  });

  it('değişmez aileye imha ÖNERİSİ bile açılamaz', () => {
    const k = imhaOnerisiKapisi({
      varlikTipi: 'AktiviteKaydi',
      politika: { saklamaGun: 30, aktif: true },
      holdVar: false,
    });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/DEĞİŞMEZ/);
  });
});

describe('UY-56 · Legal hold kapsamı GENİŞTEN DARA eşleşir', () => {
  const aileGeneli = {
    varlikTipi: 'Bulgu', varlikId: null, tesisId: null, durum: 'aktif',
  };
  const santralGeneli = {
    varlikTipi: 'Bulgu', varlikId: null, tesisId: 'T1', durum: 'aktif',
  };
  const tekKayit = {
    varlikTipi: 'Bulgu', varlikId: 'B1', tesisId: null, durum: 'aktif',
  };

  it('aile geneli hold her kaydı kapsar', () => {
    expect(holdAltindaMi({
      holdlar: [aileGeneli], varlikTipi: 'Bulgu', varlikId: 'B9', tesisId: 'T9',
    })).toBe(true);
  });

  it('santral geneli hold yalnız o santrali kapsar', () => {
    expect(holdAltindaMi({
      holdlar: [santralGeneli], varlikTipi: 'Bulgu', varlikId: 'B1', tesisId: 'T1',
    })).toBe(true);
    expect(holdAltindaMi({
      holdlar: [santralGeneli], varlikTipi: 'Bulgu', varlikId: 'B1', tesisId: 'T2',
    })).toBe(false);
  });

  it('tek kayıt hold\'u başka kaydı kapsamaz', () => {
    expect(holdAltindaMi({
      holdlar: [tekKayit], varlikTipi: 'Bulgu', varlikId: 'B2',
    })).toBe(false);
  });

  it('KALDIRILMIŞ hold kapsamaz', () => {
    expect(holdAltindaMi({
      holdlar: [{ ...aileGeneli, durum: 'kaldirildi' }], varlikTipi: 'Bulgu',
    })).toBe(false);
  });

  it('başka ailenin hold\'u kapsamaz', () => {
    expect(holdAltindaMi({ holdlar: [aileGeneli], varlikTipi: 'Kanit' })).toBe(false);
  });
});

describe('UY-56 · İmha kapıları', () => {
  it('politikasız imha önerisi açılamaz', () => {
    const k = imhaOnerisiKapisi({ varlikTipi: 'Bulgu', politika: null, holdVar: false });
    expect(k.ok).toBe(false);
  });

  it('SÜRESİZ politikada imha edilecek kayıt yoktur', () => {
    const k = imhaOnerisiKapisi({
      varlikTipi: 'Bulgu', politika: { saklamaGun: null, aktif: true }, holdVar: false,
    });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/SÜRESİZ/);
  });

  it('hold varken öneri açılamaz', () => {
    const k = imhaOnerisiKapisi({
      varlikTipi: 'Bulgu', politika: { saklamaGun: 30, aktif: true }, holdVar: true,
    });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/MUHAFAZA/);
  });

  it('politika sorunu HOLD\'dan önce söylenir', () => {
    /* Kullanıcı önce kendi politikasındaki eksiği görmeli; hold bir hata
       değil bir durumdur. */
    const k = imhaOnerisiKapisi({ varlikTipi: 'Bulgu', politika: null, holdVar: true });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/politika/i);
  });

  it('DÖRT GÖZ: öneren kendi önerisini onaylayamaz', () => {
    const k = imhaOnayKapisi({ durum: 'oneri', onerenId: 'A', onaylayanId: 'A' });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/dört göz/i);
  });

  it('DÖRT GÖZ uygulamada da geçerlidir', () => {
    const k = imhaUygulamaKapisi({
      durum: 'onaylandi', onerenId: 'A', onaylayanId: 'A',
      uygulayanId: 'B', holdVar: false,
    });
    expect(k.ok).toBe(false);
  });

  it('onaylanmamış karar uygulanamaz', () => {
    for (const durum of ['oneri', 'reddedildi', 'uygulandi']) {
      expect(imhaUygulamaKapisi({
        durum, onerenId: 'A', onaylayanId: 'B', uygulayanId: 'C', holdVar: false,
      }).ok).toBe(false);
    }
  });

  /* En pahalı kural: onaydan SONRA konan hold imhayı durdurur. */
  it('onaydan sonra konan hold imhayı DURDURUR', () => {
    const k = imhaUygulamaKapisi({
      durum: 'onaylandi', onerenId: 'A', onaylayanId: 'B',
      uygulayanId: 'B', holdVar: true,
    });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/SONRA/);
  });

  it('dört göz geçilmiş, hold\'suz onaylı karar uygulanabilir', () => {
    expect(imhaUygulamaKapisi({
      durum: 'onaylandi', onerenId: 'A', onaylayanId: 'B',
      uygulayanId: 'B', holdVar: false,
    }).ok).toBe(true);
  });
});

describe('UY-56 · Saklama özeti', () => {
  it('payda kayıt ailelerinin SAYISIDIR; süresiz de kapsamaya sayılır', () => {
    const o = saklamaOzeti({
      politikalar: [
        { varlikTipi: 'Bulgu', saklamaGun: 365, aktif: true },
        { varlikTipi: 'Kanit', saklamaGun: null, aktif: true },
      ],
      aktifHold: 0, bekleyenImha: 0,
    });
    expect(o.tanimlanabilir).toBe(SAKLANABILIR_TIPLER.length);
    expect(o.tanimli).toBe(1);
    expect(o.suresiz).toBe(1);
    expect(o.tanimsiz).toBe(SAKLANABILIR_TIPLER.length - 2);
    expect(o.kapsamaOrani).toBe(Math.round((2 / SAKLANABILIR_TIPLER.length) * 100));
    expect(saklamaCumlesi(o)).toMatch(/politikası YOK/);
  });

  it('hepsi tanımlıysa cümle bunu söyler', () => {
    const o = saklamaOzeti({
      politikalar: SAKLANABILIR_TIPLER.map((t) => ({
        varlikTipi: t, saklamaGun: 365, aktif: true,
      })),
      aktifHold: 0, bekleyenImha: 0,
    });
    expect(o.kapsamaOrani).toBe(100);
    expect(saklamaCumlesi(o)).toMatch(/tamamında/);
  });
});

describe('UY-57 · Dış denetçi erişiminin YAŞAYAN durumu', () => {
  const simdi = Date.UTC(2026, 5, 1);
  const temel = { durum: 'aktif', kapsamSayisi: 2, sonErisim: simdi - GUN };

  it('bitiş tarihi geçmişse kayıt "aktif" yazsa bile SÜRESİ DOLDU', () => {
    expect(yasayanDurum({ ...temel, bitis: simdi - GUN, simdi })).toBe('suresi_doldu');
  });

  it('iptal her şeyden önce gelir', () => {
    expect(yasayanDurum({
      ...temel, durum: 'iptal', bitis: simdi + 100 * GUN, simdi,
    })).toBe('iptal');
  });

  it('kapsamı boş aktif erişim KAPSAMSIZ görünür', () => {
    expect(yasayanDurum({
      ...temel, kapsamSayisi: 0, bitis: simdi + 100 * GUN, simdi,
    })).toBe('kapsamsiz');
  });

  it('bitişe az kalan erişim uyarır', () => {
    expect(yasayanDurum({
      ...temel, bitis: simdi + (BITIS_UYARI_GUN - 1) * GUN, simdi,
    })).toBe('bitmek_uzere');
  });

  it('hiç kullanılmamış erişim ayrı bir durumdur', () => {
    expect(yasayanDurum({
      ...temel, sonErisim: null, bitis: simdi + 100 * GUN, simdi,
    })).toBe('hic_kullanilmadi');
  });

  /* Süresi dolmuş erişim bir KUSUR DEĞİLDİR: sistem doğru çalıştı. */
  it('süresi dolan ve iptal edilen kusur GÖSTERİLMEZ', () => {
    expect(YASAYAN_SINIFI.suresi_doldu).toBe('pl');
    expect(YASAYAN_SINIFI.iptal).toBe('pl');
    expect(YASAYAN_SINIFI.kapsamsiz).toBe('md');
  });

  it('her yaşayan durumun sözü vardır', () => {
    for (const d of Object.keys(YASAYAN_SINIFI) as (keyof typeof YASAYAN_SINIFI)[]) {
      expect(YASAYAN_SOZU[d]).toBeTruthy();
    }
  });

  it('erisimAcikMi kapsamsız erişimi AÇIK saymaz', () => {
    expect(erisimAcikMi({
      durum: 'aktif', bitis: simdi + GUN, simdi, kapsamSayisi: 0,
    })).toBe(false);
    expect(erisimAcikMi({
      durum: 'aktif', bitis: simdi + GUN, simdi, kapsamSayisi: 1,
    })).toBe(true);
  });
});

describe('UY-57 · Davet kapısı', () => {
  const simdi = Date.UTC(2026, 5, 1);

  it('geçmiş bitiş reddedilir', () => {
    expect(davetKapisi({
      baslangic: simdi, bitis: simdi - GUN, simdi, kapsamSayisi: 1,
    }).ok).toBe(false);
  });

  it('süre TAVANI aşılamaz', () => {
    const k = davetKapisi({
      baslangic: simdi, bitis: simdi + (AZAMI_SURE_GUN + 1) * GUN,
      simdi, kapsamSayisi: 1,
    });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toContain(String(AZAMI_SURE_GUN));
  });

  it('BOŞ KAPSAM = HİÇBİR ŞEY — "her şey" değil', () => {
    const k = davetKapisi({
      baslangic: simdi, bitis: simdi + 30 * GUN, simdi, kapsamSayisi: 0,
    });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/boş kapsam = her şey/i);
  });

  it('süreli ve kapsamlı davet geçer', () => {
    expect(davetKapisi({
      baslangic: simdi, bitis: simdi + 30 * GUN, simdi, kapsamSayisi: 2,
    }).ok).toBe(true);
  });
});

describe('UY-57 · Denetçi özeti', () => {
  it('kapsamsız erişim cümlenin BAŞINA çıkar', () => {
    const o = denetciOzeti(['aktif', 'kapsamsiz', 'suresi_doldu']);
    expect(o.toplam).toBe(3);
    expect(denetciCumlesi(o)).toMatch(/kapsamı boş/i);
  });

  it('kayıt yoksa cümle bunu söyler', () => {
    expect(denetciCumlesi(denetciOzeti([]))).toMatch(/yok/i);
  });
});

describe('UY-53 · SSO/MFA  ·  UY-55 · yük — DÜRÜST BEYAN', () => {
  it('hiçbir sağlayıcı BAĞLI değildir ve ürün bunu saklamaz', () => {
    for (const s of PLATFORM_SAGLAYICILARI) {
      expect(s.bagli).toBe(false);
      expect(s.gereken.length).toBeGreaterThan(40);
      expect(s.bagliDegilkenDavranis.length).toBeGreaterThan(40);
      expect(KIMLIK_AILE_ETIKETI[s.aile]).toBeTruthy();
    }
    expect(platformSaglayicisi('sso')).toBeNull();
    expect(platformSaglayicisi('mfa')).toBeNull();
  });

  it('giriş bugün YEREL PAROLADIR ve ekran "SSO" demez', () => {
    expect(girisYontemi()).toBe('yerel_parola');
    expect(kimlikBeyani()).toMatch(/KENDİ kullanıcı kütüğünden/);
    expect(kimlikBeyani()).toMatch(/bağlı DEĞİLDİR/);
    expect(GIRIS_SOZU.yerel_parola).toBeTruthy();
  });

  /* Bu dosyada bir tenant kimliği, metadata adresi ya da örnek uç nokta
     BULUNMAMALIDIR: kurulumda kimsenin değiştirmediği bir yapılandırma
     bırakmak, sessizce yanlış yere bakan bir SSO demektir. */
  it('sağlayıcı kütüğünde HİÇBİR uç nokta ya da tenant yoktur', () => {
    const metin = JSON.stringify(PLATFORM_SAGLAYICILARI);
    expect(metin).not.toMatch(/https?:\/\//);
    expect(metin).not.toMatch(/\.onmicrosoft\.com|login\.microsoftonline|[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});
