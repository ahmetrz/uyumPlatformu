import { describe, expect, it } from 'vitest';

/* Platform sağlığının saf mantığı. Bu modül veritabanına, React'e ve
   server-only'ye dokunmaz; testi de dokunmaz — izole DB kopyası gerekmez
   (bkz. tests/semantik.test.ts kalıbı).

   Testin asıl derdi tek bir ayrım: BİLİNMEYEN ≠ SIFIR ≠ HATA. Hiç koşmamış
   motor başarısız değildir, kimlik bekleyen connector hatalı değildir,
   ölçülemeyen tazelik gecikmiş değildir. */

import {
  ENTEGRASYON_ACIKLAMA, ENTEGRASYON_IM, ENTEGRASYON_SOZU, GORUNUR_BUTCE,
  IS_TANIMLARI,
  baslikMetni, bolumle, connectorAlt, connectorToplanabilir, dkFmt, kaliteImi,
  kaliteSirala, kaliteToplanabilir, kisalt, metrikleriHesapla, motorCumlesi,
  motorImi, motorSozu, motorToplanabilir, motorlariSirala, sonKosu, sureFmt,
  tazelikDurumu, tazelikYazisi,
  type KaliteBulgusu, type Kosu, type Motor,
} from '@/app/(atlas)/(operasyonel)/saglik/mantik';
import type {
  ConnectorSagligi, SaglikDurumu, Tazelik,
} from '@/lib/entegrasyon/saglikOzeti';

const AN = '2026-06-01T09:00:00.000Z';

function kosu(ozel: Partial<Kosu> = {}): Kosu {
  return {
    id: 'k1', isAdi: 'veri_kalitesi', durum: 'basarili', baslangic: AN,
    bitis: AN, sureMs: 1200, islenen: 40, uretilen: 3, hata: null, denemeNo: 1,
    ...ozel,
  };
}

function motor(ozel: Partial<Motor> = {}): Motor {
  return {
    ad: 'veri_kalitesi', etiket: 'Veri kalitesi', elleCalisir: true,
    aciklama: 'Governance verisindeki boşlukları tarar',
    kosular: [kosu()],
    ...ozel,
  };
}

function tazelik(ozel: Partial<Tazelik> = {}): Tazelik {
  return {
    durum: 'taze', gecenDk: 30, beklenenDk: 60, gecikmeOrani: 0.5,
    aciklama: 'Beklenen aralık içinde', ...ozel,
  };
}

function connector(ozel: Partial<ConnectorSagligi> = {}): ConnectorSagligi {
  return {
    id: 'c1', kod: 'AD-01', ad: 'Kurumsal dizin', tip: 'ad_entra',
    kaynakSistem: 'entra.zorlu.local', kayitDurumu: 'etkin', etkin: true,
    kimlikTipi: 'oauth2_client_credentials', sirMaskeli: 'env:AD_***',
    kimlikEksik: false, kimlikGerekce: null, durum: 'basarili',
    hicKosmadi: false, bayatKosu: false, sonKosu: null,
    sonBasariliKosu: AN, tazelik: tazelik(), sonHata: null, imlec: null,
    gecmis: [], ...ozel,
  };
}

function bulgu(ozel: Partial<KaliteBulgusu> = {}): KaliteBulgusu {
  return {
    id: 'b1', kural: 'sahipsiz_varlik', aciklama: 'Varlığın sahibi atanmamış',
    kaynakTipi: 'Varlik', olusturuldu: AN,
    kayitEtiket: 'ADANA-OTFW-01', href: '/envanter', ...ozel,
  };
}

describe('Motor kataloğu', () => {
  it('elle koşan ve zincirden koşan motorlar ayrı işaretlidir', () => {
    const zincirden = IS_TANIMLARI.filter((t) => !t.elleCalisir).map((t) => t.ad);
    expect(zincirden).toEqual(
      ['uygulanabilirlik', 'entegrasyon_zinciri', 'zincir_guvenlik_ihlali']);
    // lib/eylemler2/isler.ts'in ISLER haritasındaki sekiz motor elle koşar.
    expect(IS_TANIMLARI.filter((t) => t.elleCalisir)).toHaveLength(8);
  });

  it('katalogda motor adı tekrar etmez', () => {
    expect(new Set(IS_TANIMLARI.map((t) => t.ad)).size).toBe(IS_TANIMLARI.length);
  });
});

describe('Motor işaretçisi — hiç koşmamış motor BAŞARISIZ değildir', () => {
  it('koşu kaydı olmayan motor bilinmeyendir', () => {
    const m = motor({ kosular: [] });
    expect(sonKosu(m)).toBeNull();
    expect(motorImi(m)).toBe('unk');
    expect(motorImi(m)).not.toBe('bd');
    expect(motorSozu(m)).toBe('Hiç koşmadı');
    expect(motorCumlesi(m)).toContain('sağlıklı olduğu anlamına GELMEZ');
  });

  it('başarısız koşu kritiktir', () => {
    const m = motor({ kosular: [kosu({ durum: 'basarisiz', hata: 'kaynak yok' })] });
    expect(motorImi(m)).toBe('bd');
    expect(motorCumlesi(m)).toBe('kaynak yok');
  });

  it('hata metni yazılmamış başarısız koşu bunu saklamaz', () => {
    const m = motor({ kosular: [kosu({ durum: 'basarisiz', hata: null })] });
    expect(motorCumlesi(m)).toContain('kayıt boşluğudur');
  });

  it('süren koşu planlıdır, başarılı değildir', () => {
    expect(motorImi(motor({ kosular: [kosu({ durum: 'calisiyor' })] }))).toBe('pl');
  });

  it('yorumlanamayan koşu durumu uydurulmaz', () => {
    expect(motorImi(motor({ kosular: [kosu({ durum: 'kuyrukta' })] }))).toBe('unk');
  });

  it('yalnız son koşusu başarılı motor kuyruğa iner', () => {
    expect(motorToplanabilir(motor())).toBe(true);
    expect(motorToplanabilir(motor({ kosular: [] }))).toBe(false);
    expect(motorToplanabilir(motor({ kosular: [kosu({ durum: 'basarisiz' })] }))).toBe(false);
  });

  it('sıralama en çok müdahale isteni üste alır', () => {
    const sirali = motorlariSirala([
      motor({ ad: 'ok', etiket: 'Başarılı' }),
      motor({ ad: 'yok', etiket: 'Koşmamış', kosular: [] }),
      motor({ ad: 'hata', etiket: 'Hatalı', kosular: [kosu({ durum: 'basarisiz' })] }),
      motor({ ad: 'suren', etiket: 'Süren', kosular: [kosu({ durum: 'calisiyor' })] }),
    ]);
    expect(sirali.map((x) => x.ad)).toEqual(['hata', 'yok', 'suren', 'ok']);
  });
});

describe('Entegrasyon durumu — kimlik bekleyen HATA değildir', () => {
  it('yedi sağlık durumunun her biri bir işaretçiye eşlenir', () => {
    const hepsi: SaglikDurumu[] = ['basarili', 'basarisiz', 'kimlik_bekleniyor',
      'calisiyor', 'bayat_kosu', 'hic_kosmadi', 'bilinmiyor'];
    for (const d of hepsi) {
      expect(ENTEGRASYON_IM[d]).toBeDefined();
      expect(ENTEGRASYON_SOZU[d]).toBeTruthy();
      expect(ENTEGRASYON_ACIKLAMA[d]).toBeTruthy();
    }
  });

  it('kimlik_bekleniyor başarısızla AYNI kovada değildir', () => {
    expect(ENTEGRASYON_IM.kimlik_bekleniyor).toBe('pl');
    expect(ENTEGRASYON_IM.basarisiz).toBe('bd');
    expect(ENTEGRASYON_IM.kimlik_bekleniyor).not.toBe(ENTEGRASYON_IM.basarisiz);
  });

  it('hiç koşmamış ve bilinmeyen connector "sağlıklı" görünmez', () => {
    expect(ENTEGRASYON_IM.hic_kosmadi).toBe('unk');
    expect(ENTEGRASYON_IM.bilinmiyor).toBe('unk');
    expect(ENTEGRASYON_IM.hic_kosmadi).not.toBe(ENTEGRASYON_IM.basarili);
  });

  it('bayat koşu sessizce "çalışıyor" kalmaz', () => {
    expect(ENTEGRASYON_IM.bayat_kosu).toBe('bd');
    expect(ENTEGRASYON_IM.calisiyor).toBe('pl');
  });

  it('yalnız son koşusu başarılı connector kuyruğa iner', () => {
    expect(connectorToplanabilir(connector())).toBe(true);
    expect(connectorToplanabilir(connector({ durum: 'hic_kosmadi' }))).toBe(false);
    expect(connectorToplanabilir(connector({ durum: 'kimlik_bekleniyor' }))).toBe(false);
  });

  it('alt satır kimlik + en fazla iki olgu taşır ve pasifliği saklamaz', () => {
    expect(connectorAlt(connector())).toBe('AD-01 · Dizin (AD/Entra)');
    expect(connectorAlt(connector({ etkin: false })))
      .toBe('AD-01 · Dizin (AD/Entra) · otomatik koşuya kapalı');
  });
});

describe('Veri tazeliği — ölçülemeyen GECİKMİŞ değildir', () => {
  it('poll aralığı tanımsızsa sıfır gecikme uydurulmaz', () => {
    const t = tazelik({ durum: 'bilinmiyor', gecenDk: 240, beklenenDk: null, gecikmeOrani: null });
    expect(tazelikYazisi(t)).toBe('ölçülemedi · 4 sa');
    expect(tazelikDurumu(t)).toBe('unk');
    expect(tazelikDurumu(t)).not.toBe('bd');
  });

  it('hiç başarılı koşu yoksa geçen süre de yazılmaz', () => {
    const t = tazelik({ durum: 'bilinmiyor', gecenDk: null, beklenenDk: 60, gecikmeOrani: null });
    expect(tazelikYazisi(t)).toBe('ölçülemedi');
  });

  it('gecikmiş tazelik kritiktir, taze tazelik renksizdir', () => {
    expect(tazelikDurumu(tazelik({ durum: 'gecikmis', gecikmeOrani: 3.2 }))).toBe('bd');
    expect(tazelikDurumu(tazelik())).toBeUndefined();
    expect(tazelikYazisi(tazelik({ gecenDk: 90, gecikmeOrani: 1.5 }))).toBe('1 sa · 1.5×');
  });
});

describe('Veri kalitesi bulgusu', () => {
  it('açık bulgu bir boşluktur, çökme değil', () => {
    expect(kaliteImi(bulgu())).toBe('md');
    expect(kaliteToplanabilir(bulgu())).toBe(true);
  });

  it('işaret ettiği kayıt silinmiş bulgu DOĞRULANAMAZ — bilinmeyendir', () => {
    const silinmis = bulgu({ id: 'b2', kayitEtiket: null, href: null });
    expect(kaliteImi(silinmis)).toBe('unk');
    expect(kaliteToplanabilir(silinmis)).toBe(false);
  });

  it('doğrulanamayan bulgu listenin başına çıkar', () => {
    const sirali = kaliteSirala([
      bulgu({ id: 'a', kural: 'a_kural' }),
      bulgu({ id: 'b', kural: 'z_kural', kayitEtiket: null }),
    ]);
    expect(sirali.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('Kuyruk bütçesi', () => {
  it('kritik satır sayıdan bağımsız görünür kalır', () => {
    const motorlar = Array.from({ length: 11 }, (_, i) =>
      motor({ ad: `m${i}`, kosular: [kosu({ durum: 'basarisiz' })] }));
    const { gorunur, toplanan } = bolumle(motorlar, motorToplanabilir, false);
    expect(gorunur).toHaveLength(11);
    expect(toplanan).toHaveLength(0);
  });

  it('sağlıklı satırlar bütçeyi doldurur, kalanı kuyruğa iner', () => {
    const motorlar = [
      motor({ ad: 'hata', kosular: [kosu({ durum: 'basarisiz' })] }),
      ...Array.from({ length: 10 }, (_, i) => motor({ ad: `ok${i}` })),
    ];
    const kapali = bolumle(motorlar, motorToplanabilir, false);
    expect(kapali.gorunur).toHaveLength(GORUNUR_BUTCE);
    expect(kapali.toplanan).toHaveLength(4);
    expect(bolumle(motorlar, motorToplanabilir, true).gorunur).toHaveLength(11);
  });
});

describe('Metrikler ve başlık', () => {
  const motorlar = [
    motor({ ad: 'a' }),
    motor({ ad: 'b', kosular: [kosu({ durum: 'basarisiz' })] }),
    motor({ ad: 'c', kosular: [] }),
  ];
  const connectorlar = [
    connector({ id: '1' }),
    connector({ id: '2', durum: 'kimlik_bekleniyor' }),
    connector({ id: '3', durum: 'hic_kosmadi', hicKosmadi: true }),
    connector({ id: '4', durum: 'bayat_kosu', bayatKosu: true,
      tazelik: tazelik({ durum: 'gecikmis', gecikmeOrani: 4 }) }),
  ];
  const kalite = [bulgu({ id: 'k1' }), bulgu({ id: 'k2', kayitEtiket: null })];
  const m = metrikleriHesapla(motorlar, connectorlar, kalite);

  it('motorlar ve bağlantılar aynı kovada sayılır', () => {
    expect(m.basarisiz).toBe(2);       // bir motor + bir bayat connector
    expect(m.olculmedi).toBe(2);       // hiç koşmamış motor + hiç koşmamış connector
    expect(m.motorToplam).toBe(3);
    expect(m.connectorToplam).toBe(4);
  });

  it('kimlik bekleyen bağlantı hata sayısına EKLENMEZ', () => {
    expect(m.kimlikBekleyen).toBe(1);
    // 2 = başarısız motor + bayat koşu; kimlik bekleyen bunların dışında.
    expect(m.basarisiz).toBe(2);
  });

  it('veri boşlukları ve gecikmiş tazelik ayrı sayılır', () => {
    expect(m.kaliteAcik).toBe(2);
    expect(m.gecikmisTazelik).toBe(1);
  });

  it('başlık önce hatayı, sonra ölçülmemişi, sonra boşluğu vurgular', () => {
    expect(baslikMetni(m)).toEqual(
      { vurgu: '2 kaynak', ad: 'son koşusunu tamamlayamadı', durum: 'bd' });
    expect(baslikMetni(metrikleriHesapla([motor({ kosular: [] })], [], [])))
      .toEqual({ vurgu: '1 kaynak', ad: 'hiç ölçülmedi', durum: 'unk' });
    expect(baslikMetni(metrikleriHesapla([motor()], [], [bulgu()])))
      .toEqual({ vurgu: '1 veri boşluğu', ad: 'açık', durum: 'md' });
    expect(baslikMetni(metrikleriHesapla([motor()], [connector()], [])))
      .toEqual({ ad: 'Tüm motorlar ve bağlantılar koştu' });
  });
});

describe('Biçimlendirme', () => {
  it('süre saniyeye ancak bin milisaniyeden sonra çevrilir', () => {
    expect(sureFmt(null)).toBe('—');
    expect(sureFmt(940)).toBe('940 ms');
    expect(sureFmt(1500)).toBe('1.5 s');
  });

  it('dakika saate ve güne yükselir', () => {
    expect(dkFmt(45)).toBe('45 dk');
    expect(dkFmt(150)).toBe('2 sa');
    expect(dkFmt(3000)).toBe('2 g');
  });

  it('kısaltma yalnız taşan metne dokunur', () => {
    expect(kisalt('kısa', 10)).toBe('kısa');
    expect(kisalt('uzunca bir hata metni', 6)).toBe('uzunca…');
  });
});
