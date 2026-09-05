import { describe, expect, it } from 'vitest';
import {
  BULUNAN, SONUCLAR, SONUC_SINIFI, kapatmaKapisi, satirKapisi,
  sayimAcmaKapisi, sayimCumlesi, sayimOzeti,
} from '@/lib/varlik/sayim';
import {
  STOK_SINIFI, maruziyet, parcaCumlesi, parcaKapisi, parcaOzeti, stokDurumu,
} from '@/lib/varlik/yedekParca';
import {
  HAL_SINIFI, TARAMA_TAZELIK_GUN, kullanimKapisi, medyaCumlesi, medyaHali,
  medyaOzeti,
} from '@/lib/varlik/tasinabilirMedya';

/* ═══════════════════════════════════════════════════════════════════════
   FAZ G · OT-55 · OT-56 · OT-57 — saf karar katmanı

   Çivilenen kurallar:
     · SAYILMADI ile BULUNAMADI ayrı durumlardır ve doğruluk oranı
       yalnız SAYILAN satırlar üzerinden hesaplanır,
     · hiç sayılmamış kampanyada doğruluk `null`dur — "%0" DEĞİL,
     · kayıtsız cihaz (fazladan) kimliksiz kaydedilemez,
     · ölçülmemiş tedarik süresi `null`dur ve sıfır yazılamaz,
     · stok sıfır her zaman arıza değildir — kritiklik bağlı varlıktan gelir,
     · ölçülmemiş şifreleme "şifresiz" DEĞİLDİR,
     · karantina ve imha medyaya kullanım kaydı girilemez, onaysız
       kullanım REDDEDİLMEZ.
   ═══════════════════════════════════════════════════════════════════════ */

const GUN = 86_400_000;

describe('OT-55 · Sayım açma kapısı', () => {
  it('boş kapsamda sayım açılmaz — sıfır paydalı kampanya olamaz [SAY-KMP-001]', () => {
    const k = sayimAcmaKapisi({ kapsamSayisi: 0 });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/hiç varlık yok/i);
  });

  it('kapsamda varlık varsa açılır', () => {
    expect(sayimAcmaKapisi({ kapsamSayisi: 1 }).ok).toBe(true);
  });
});

describe('OT-55 · Satır kapısı', () => {
  const temel = { varlikVar: true, sahaKimligi: null, bulunanYer: null };

  it('tanınmayan sonuç reddedilir', () => {
    expect(satirKapisi({ ...temel, sonuc: 'kayboldu' }).ok).toBe(false);
  });

  it('KAYITSIZ cihaz kimliksiz kaydedilemez', () => {
    const k = satirKapisi({
      sonuc: 'fazladan', varlikVar: false, sahaKimligi: '  ', bulunanYer: null,
    });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/saha kimliği/i);
  });

  it('kayıtlı varlık "fazladan" olamaz', () => {
    const k = satirKapisi({ ...temel, sonuc: 'fazladan', sahaKimligi: 'X' });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/KAYITLI OLAMAZ/);
  });

  it('kimlikli kayıtsız cihaz kabul edilir', () => {
    expect(satirKapisi({
      sonuc: 'fazladan', varlikVar: false, sahaKimligi: 'MAC 00:1B', bulunanYer: null,
    }).ok).toBe(true);
  });

  it('"yeri farklı" BULUNDUĞU yeri ister — yoksa kayıt düzeltilemez', () => {
    expect(satirKapisi({ ...temel, sonuc: 'yeri_farkli' }).ok).toBe(false);
    expect(satirKapisi({ ...temel, sonuc: 'yeri_farkli', bulunanYer: 'B-2 raf' }).ok).toBe(true);
  });

  it('kayıtta olmayan varlığa normal sonuç yazılamaz', () => {
    expect(satirKapisi({
      sonuc: 'dogrulandi', varlikVar: false, sahaKimligi: null, bulunanYer: null,
    }).ok).toBe(false);
  });
});

describe('OT-55 · Kapatma kapısı', () => {
  it('sayılmamış satır varken gerekçesiz kapanmaz', () => {
    const k = kapatmaKapisi({ durum: 'sahada', sayilmayan: 4, gerekce: null });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/4 satır/);
  });

  it('gerekçeyle eksik kapatılabilir', () => {
    expect(kapatmaKapisi({
      durum: 'sahada', sayilmayan: 4, gerekce: 'Saha erişimi kapandı',
    }).ok).toBe(true);
  });

  it('tamamı sayıldıysa gerekçe istenmez', () => {
    expect(kapatmaKapisi({ durum: 'sahada', sayilmayan: 0, gerekce: null }).ok).toBe(true);
  });

  it('kapalı sayım yeniden kapatılamaz', () => {
    expect(kapatmaKapisi({ durum: 'kapali', sayilmayan: 0, gerekce: null }).ok).toBe(false);
  });
});

describe('OT-55 · Özet — sayılmadı ≠ bulunamadı', () => {
  it('hiç sayılmamışsa doğruluk NULL döner, %0 değil', () => {
    const o = sayimOzeti({ kapsam: 50, sonuclar: Array(50).fill('sayilmadi') });
    expect(o.sayilan).toBe(0);
    expect(o.ilerleme).toBe(0);
    expect(o.dogrulukOrani).toBeNull();
    expect(sayimCumlesi(o)).toMatch(/ÖLÇÜLMEDİ/);
  });

  it('doğruluk yalnız SAYILAN satırlar üzerinden hesaplanır', () => {
    /* 10 kapsam, 4 sayıldı (3 doğru + 1 bulunamadı). Sayılmayan 6 satır
       doğruluk paydasına GİRMEZ; girseydi oran %30 çıkardı. */
    const o = sayimOzeti({
      kapsam: 10,
      sonuclar: ['dogrulandi', 'dogrulandi', 'dogrulandi', 'bulunamadi',
        ...Array(6).fill('sayilmadi')],
    });
    expect(o.sayilan).toBe(4);
    expect(o.ilerleme).toBe(40);
    expect(o.dogrulukOrani).toBe(75);
  });

  it('KAYITSIZ cihaz doğruluk paydasına girer, ilerleme paydasına girmez', () => {
    const o = sayimOzeti({
      kapsam: 2, sonuclar: ['dogrulandi', 'dogrulandi', 'fazladan'],
    });
    expect(o.ilerleme).toBe(100);
    // 2 doğru / (2 sayılan + 1 fazladan) = %67
    expect(o.dogrulukOrani).toBe(67);
    expect(sayimCumlesi(o)).toMatch(/KAYITLI DEĞİL/);
  });

  it('her sonucun ekran sınıfı vardır; sayılmadı GRİDİR', () => {
    for (const s of SONUCLAR) expect(SONUC_SINIFI[s]).toBeTruthy();
    expect(SONUC_SINIFI.sayilmadi).toBe('unk');
    expect(SONUC_SINIFI.fazladan).toBe('bd');
    expect(BULUNAN).toContain('yeri_farkli');
  });
});

describe('OT-56 · Stok durumu ve maruziyet', () => {
  it('eşiğe inen ile tükenen AYRI durumlardır', () => {
    expect(stokDurumu({ stokAdedi: 5, kritikEsik: 2, aktif: true })).toBe('yeterli');
    expect(stokDurumu({ stokAdedi: 2, kritikEsik: 2, aktif: true })).toBe('esikte');
    expect(stokDurumu({ stokAdedi: 0, kritikEsik: 2, aktif: true })).toBe('tukendi');
    expect(stokDurumu({ stokAdedi: 5, kritikEsik: 2, aktif: false })).toBe('pasif');
    expect(STOK_SINIFI.tukendi).toBe('bd');
  });

  /* Kritiklik parçadan değil, BAĞLI VARLIKTAN gelir. */
  it('kimseye bağlı olmayan tükenmiş parça AÇIK RİSK değildir', () => {
    const m = maruziyet({
      stokAdedi: 0, kritikEsik: 1, aktif: true,
      tedarikSuresiGun: 30, bagliKritiklikler: [],
    });
    expect(m.durum).toBe('tukendi');
    expect(m.acikRisk).toBe(false);
  });

  it('kritik varlığa bağlı tükenmiş parça AÇIK RİSKTİR', () => {
    const m = maruziyet({
      stokAdedi: 0, kritikEsik: 1, aktif: true,
      tedarikSuresiGun: 90, bagliKritiklikler: ['dusuk', 'kritik'],
    });
    expect(m.agirVarlik).toBe(1);
    expect(m.acikRisk).toBe(true);
  });

  it('düşük kritiklikli varlıklar ağır sayılmaz', () => {
    const m = maruziyet({
      stokAdedi: 0, kritikEsik: 1, aktif: true,
      tedarikSuresiGun: null, bagliKritiklikler: ['dusuk', 'orta'],
    });
    expect(m.agirVarlik).toBe(0);
    expect(m.acikRisk).toBe(false);
    expect(m.tedarikOlculdu).toBe(false);
  });
});

describe('OT-56 · Parça kapısı — ölçülmemiş süre sıfır yazılmaz', () => {
  const temel = { stokAdedi: 1, kritikEsik: 1, tedarikSuresiGun: null };

  it('negatif stok reddedilir', () => {
    expect(parcaKapisi({ ...temel, stokAdedi: -1 }).ok).toBe(false);
  });

  it('SIFIR gün tedarik süresi reddedilir — "hemen gelir" bir yalandır', () => {
    const k = parcaKapisi({ ...temel, tedarikSuresiGun: 0 });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/hemen gelir/);
  });

  it('ölçülmemiş süre (null) kabul edilir', () => {
    expect(parcaKapisi(temel).ok).toBe(true);
  });

  it('pozitif süre kabul edilir', () => {
    expect(parcaKapisi({ ...temel, tedarikSuresiGun: 45 }).ok).toBe(true);
  });
});

describe('OT-56 · Özet', () => {
  it('açık risk cümlenin başına çıkar', () => {
    const o = parcaOzeti([
      { stokAdedi: 0, kritikEsik: 1, aktif: true, tedarikSuresiGun: 30,
        bagliKritiklikler: ['kritik'] },
      { stokAdedi: 1, kritikEsik: 2, aktif: true, tedarikSuresiGun: null,
        bagliKritiklikler: [] },
    ]);
    expect(o.acikRisk).toBe(1);
    expect(o.esikte).toBe(1);
    expect(o.suresizOlculmedi).toBe(1);
    expect(parcaCumlesi(o)).toMatch(/TÜKENDİ/);
  });

  it('parça yoksa cümle bunu söyler', () => {
    expect(parcaCumlesi(parcaOzeti([]))).toMatch(/yok/i);
  });
});

describe('OT-57 · Medyanın hâli', () => {
  const simdi = Date.UTC(2026, 8, 4);
  const temel = { durum: 'kayitli', sonTarama: simdi - GUN, sifreli: true, simdi };

  it('kayıp ve karantina her şeyden önce gelir', () => {
    expect(medyaHali({ ...temel, durum: 'kayip', sonTarama: null })).toBe('kayip');
    expect(medyaHali({ ...temel, durum: 'karantina' })).toBe('karantina');
    expect(medyaHali({ ...temel, durum: 'imha' })).toBe('imha');
  });

  it('HİÇ taranmamış medya kusurdur', () => {
    expect(medyaHali({ ...temel, sonTarama: null })).toBe('taranmadi');
    expect(HAL_SINIFI.taranmadi).toBe('bd');
  });

  it('bayat tarama ayrı bir hâldir', () => {
    expect(medyaHali({
      ...temel, sonTarama: simdi - (TARAMA_TAZELIK_GUN + 1) * GUN,
    })).toBe('tarama_bayat');
  });

  /* Ölçülmemiş şifreleme "şifresiz" DEĞİLDİR; gri kalır. */
  it('ölçülmemiş şifreleme GRİDİR, kusur değil', () => {
    expect(medyaHali({ ...temel, sifreli: null })).toBe('sifreleme_olculmedi');
    expect(HAL_SINIFI.sifreleme_olculmedi).toBe('unk');
    // Şifresiz olduğu ÖLÇÜLMÜŞ medya kullanılabilir sayılır; ayrı bir karar.
    expect(medyaHali({ ...temel, sifreli: false })).toBe('kullanilabilir');
  });
});

describe('OT-57 · Kullanım kapısı', () => {
  const temel = {
    medyaDurumu: 'kayitli', onaylandi: true, varlikKritikligi: 'orta',
    baslangic: 1000, bitis: null as number | null,
  };

  it('KARANTİNA ve İMHA medyaya kullanım kaydı GİRİLEMEZ', () => {
    expect(kullanimKapisi({ ...temel, medyaDurumu: 'karantina' }).ok).toBe(false);
    expect(kullanimKapisi({ ...temel, medyaDurumu: 'imha' }).ok).toBe(false);
  });

  /* Kayıp medyanın kullanım kaydı GİRİLEBİLİR: "kayıp bellek şu makineye
     takılmış" bilgisi tam olarak olay incelemesinde aranan şeydir. */
  it('KAYIP medyaya kullanım kaydı girilebilir', () => {
    expect(kullanimKapisi({ ...temel, medyaDurumu: 'kayip' }).ok).toBe(true);
  });

  it('onaysız kullanım REDDEDİLMEZ, uyarıyla kaydedilir', () => {
    const k = kullanimKapisi({ ...temel, onaylandi: false });
    expect(k.ok).toBe(true);
    if (!k.ok) return;
    expect(k.uyari).toBeTruthy();
  });

  it('kritik varlıkta onaysız kullanım daha sert uyarır', () => {
    const k = kullanimKapisi({ ...temel, onaylandi: false, varlikKritikligi: 'kritik' });
    expect(k.ok).toBe(true);
    if (!k.ok) return;
    expect(k.uyari).toMatch(/ONAYSIZ/);
  });

  it('onaylı kullanımda uyarı yoktur', () => {
    const k = kullanimKapisi(temel);
    expect(k.ok).toBe(true);
    if (!k.ok) return;
    expect(k.uyari).toBeNull();
  });

  it('bitiş başlangıçtan önce olamaz', () => {
    expect(kullanimKapisi({ ...temel, bitis: 500 }).ok).toBe(false);
  });
});

describe('OT-57 · Özet', () => {
  it('kayıp medya cümlenin başına çıkar', () => {
    const o = medyaOzeti({
      haller: ['kayip', 'taranmadi', 'kullanilabilir'], onaysizKullanim: 2,
    });
    expect(o.kayip).toBe(1);
    expect(medyaCumlesi(o)).toMatch(/KAYIP/);
  });

  it('medya yoksa cümle bunun kendisinin bir boşluk olduğunu söyler', () => {
    expect(medyaCumlesi(medyaOzeti({ haller: [], onaysizKullanim: 0 })))
      .toMatch(/göremediği tek taşıyıcı/);
  });
});
