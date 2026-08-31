import { describe, expect, it } from 'vitest';

/* O · Değişiklik yönetiminin saf mantığı. Bu modül veritabanına, React'e ve
   server-only'ye dokunmaz; testi de dokunmaz — izole DB kopyası gerekmez
   (bkz. tests/semantik.test.ts kalıbı). */

import {
  ASAMALAR, GORUNUR_BUTCE,
  altSatir, asamaEtiketi, asamaIndeksi, baslikMetni, bolumle, degisiklikImi,
  dipNot, eksikKapilar, gecikmeGunu, kapandiMi, kapiHucresi, kapilar,
  kimlikCumlesi, kimlikSozu, mercekten, metrikleriHesapla, santralMetni,
  sirala, toplanabilir,
  type D,
} from '@/app/(atlas)/(operasyonel)/operasyon/mantik';

const SIMDI = Date.parse('2026-06-01T00:00:00.000Z');
const GUN = 86_400_000;
const gunSonra = (n: number) => new Date(SIMDI + n * GUN).toISOString();

function d(ozel: Partial<D> = {}): D {
  return {
    id: 'x', kod: 'DGS-0001', baslik: 'Firmware güncellemesi', aciklama: null,
    tesis: null, varlikEtiketi: null, otMu: false, durum: 'talep',
    saglayiciOnayi: null, bakimPenceresi: null, geriAlmaPlani: null,
    onDegisiklikYedegi: null, uretimEtkisi: null, sonDogrulama: null,
    talepEden: null, onaylayan: null,
    planTarihi: gunSonra(10), olusturuldu: gunSonra(-20),
    olaylar: [], yazilabilir: true, onaylanabilir: true,
    ...ozel,
  };
}

/** Beş kapısı da dolu bir OT değişikliği. */
function otTam(ozel: Partial<D> = {}): D {
  return d({
    otMu: true, saglayiciOnayi: true, bakimPenceresi: '12.10 02:00–05:00',
    geriAlmaPlani: 'Önceki imaja dön', onDegisiklikYedegi: true,
    uretimEtkisi: 'Ünite-2 30 dk yedekte',
    ...ozel,
  });
}

describe('Yaşam döngüsü', () => {
  it('aşama dizisi lib/eylemler2/operasyon.ts ile aynı beş adımı taşır', () => {
    expect([...ASAMALAR]).toEqual(['talep', 'onay', 'planlandi', 'uygulandi', 'dogrulandi']);
  });

  it('geri alma döngünün adımı değildir — indeksi yoktur', () => {
    expect(asamaIndeksi('geri_alindi')).toBe(-1);
    expect(asamaIndeksi('planlandi')).toBe(2);
    expect(asamaEtiketi('geri_alindi')).toBe('Geri alındı');
  });

  it('kapanış hem doğrulanmayı hem geri alınmayı kapsar', () => {
    expect(kapandiMi(d({ durum: 'dogrulandi' }))).toBe(true);
    expect(kapandiMi(d({ durum: 'geri_alindi' }))).toBe(true);
    expect(kapandiMi(d({ durum: 'uygulandi' }))).toBe(false);
  });
});

describe('OT emniyet kapıları', () => {
  it('BT değişikliğinin kapısı YOKTUR — "0/5" uydurulmaz', () => {
    expect(kapilar(d())).toEqual([]);
    expect(eksikKapilar(d())).toEqual([]);
    expect(kapiHucresi(d())).toBeNull();
  });

  it('OT değişikliği beş kapı taşır ve dolu olanları sayar', () => {
    expect(kapilar(otTam())).toHaveLength(5);
    expect(kapiHucresi(otTam())).toEqual({ pay: 5, payda: 5 });
    expect(eksikKapilar(otTam())).toEqual([]);
  });

  it('kapı yalnız açıkça doldurulduğunda tamamdır (sunucu kuralıyla aynı)', () => {
    const eksik = otTam({ saglayiciOnayi: false, uretimEtkisi: '' });
    expect(eksikKapilar(eksik)).toEqual(['Sağlayıcı onayı', 'Üretim etkisi']);
    expect(kapiHucresi(eksik)).toEqual({ pay: 3, payda: 5 });
  });

  it('KAYDEDİLMEDİ (null) ile ALINMADI (false) ayrı yazılır — ikisi de eksiktir', () => {
    const kayitsiz = kapilar(otTam({ saglayiciOnayi: null }))
      .find((x) => x.ad === 'Sağlayıcı onayı');
    const alinmadi = kapilar(otTam({ saglayiciOnayi: false }))
      .find((x) => x.ad === 'Sağlayıcı onayı');
    expect(kayitsiz).toEqual({ ad: 'Sağlayıcı onayı', tamam: false, deger: null });
    expect(alinmadi).toEqual({ ad: 'Sağlayıcı onayı', tamam: false, deger: 'alınmadı' });
  });
});

describe('Gecikme — bilinmeyen ≠ sıfır', () => {
  it('plan tarihi geçmiş açık kayıt gecikir', () => {
    expect(gecikmeGunu(d({ planTarihi: gunSonra(-3) }), SIMDI)).toBe(3);
  });

  it('kapanmış kayıt gecikmez', () => {
    expect(gecikmeGunu(d({ planTarihi: gunSonra(-30), durum: 'dogrulandi' }), SIMDI)).toBeNull();
    expect(gecikmeGunu(d({ planTarihi: gunSonra(-30), durum: 'geri_alindi' }), SIMDI)).toBeNull();
  });

  it('plan tarihi GİRİLMEMİŞ kayıt gecikmiş DEĞİLDİR — ölçülemez', () => {
    const tarihsiz = d({ planTarihi: null });
    expect(gecikmeGunu(tarihsiz, SIMDI)).toBeNull();
    // ve "zamanında" da sayılmaz: işaretçisi bilinmeyen elmasıdır
    expect(degisiklikImi(tarihsiz, SIMDI)).toBe('unk');
  });
});

describe('Satır işaretçisi', () => {
  it('geri alınan kayıt kritiktir', () => {
    expect(degisiklikImi(d({ durum: 'geri_alindi' }), SIMDI)).toBe('bd');
  });

  it('doğrulanan kayıt tamamdır', () => {
    expect(degisiklikImi(d({ durum: 'dogrulandi' }), SIMDI)).toBe('tamam');
  });

  it('plan tarihi aşılan açık kayıt kritiktir', () => {
    expect(degisiklikImi(d({ planTarihi: gunSonra(-1) }), SIMDI)).toBe('bd');
  });

  it('uygulanmış ama doğrulanmamış kayıt kapanış borcudur', () => {
    expect(degisiklikImi(d({ durum: 'uygulandi' }), SIMDI)).toBe('md');
  });

  it('kapısı eksik OT değişikliği uyarıdır, kritik değil', () => {
    expect(degisiklikImi(otTam({ bakimPenceresi: null }), SIMDI)).toBe('md');
  });

  it('kapıları tam ve takvimi girilmiş kayıt planlıdır', () => {
    expect(degisiklikImi(otTam(), SIMDI)).toBe('pl');
    expect(degisiklikImi(d(), SIMDI)).toBe('pl');
  });
});

describe('Çekmece sözcüğü ve cümlesi', () => {
  it('durum sözcüğü yalnız kimlik bloğu için üretilir', () => {
    expect(kimlikSozu(d({ durum: 'geri_alindi' }), SIMDI)).toBe('Geri alındı');
    expect(kimlikSozu(d({ durum: 'uygulandi' }), SIMDI)).toBe('Doğrulama bekliyor');
    expect(kimlikSozu(d({ planTarihi: null }), SIMDI)).toBe('Plan tarihi girilmedi');
    expect(kimlikSozu(d({ planTarihi: gunSonra(-4) }), SIMDI)).toBe('Plan tarihi 4 gün aşıldı');
    expect(kimlikSozu(otTam({ geriAlmaPlani: null }), SIMDI)).toBe('Emniyet kapısı eksik');
  });

  it('cümle eksik kapıları tek tek sayar', () => {
    const c = kimlikCumlesi(otTam({ geriAlmaPlani: null, uretimEtkisi: null }), SIMDI);
    expect(c).toContain('2 emniyet kapısı');
    expect(c).toContain('geri alma planı');
  });

  it('doğrulama notu olmayan kapanış bunu saklamaz', () => {
    expect(kimlikCumlesi(d({ durum: 'dogrulandi' }), SIMDI))
      .toContain('doğrulama notu kayıtta yok');
  });
});

describe('Satır metinleri', () => {
  it('alt satır kimlik + en fazla iki olgu taşır', () => {
    expect(altSatir(d({ otMu: true, varlikEtiketi: 'ADANA-OTFW-01', talepEden: 'A. Terzi' })))
      .toBe('DGS-0001 · OT · ADANA-OTFW-01');
    expect(altSatir(d({ talepEden: 'A. Terzi' }))).toBe('DGS-0001 · A. Terzi');
    expect(altSatir(d())).toBe('DGS-0001');
  });

  it('santralsiz değişiklik portföy geneli sayılır', () => {
    expect(santralMetni(d())).toBe('portföy');
    expect(santralMetni(d({ tesis: { id: 't', kod: 'KZD-3', ad: 'Kızıldere III' } })))
      .toBe('Kızıldere III');
  });
});

describe('Mercekler', () => {
  const kayitlar = [
    d({ id: 'a', durum: 'talep' }),
    d({ id: 'b', durum: 'uygulandi' }),
    d({ id: 'c', durum: 'dogrulandi' }),
    otTam({ id: 'e', bakimPenceresi: null }),
  ];

  it('açık mercek kapanmışları eler', () => {
    expect(kayitlar.filter((x) => mercekten(x, 'acik')).map((x) => x.id))
      .toEqual(['a', 'b', 'e']);
  });

  it('kapı merceği yalnız eksik kapılı AÇIK OT kayıtlarını gösterir', () => {
    expect(kayitlar.filter((x) => mercekten(x, 'kapi')).map((x) => x.id)).toEqual(['e']);
  });

  it('doğrulama merceği uygulanmışları gösterir', () => {
    expect(kayitlar.filter((x) => mercekten(x, 'dogrulama')).map((x) => x.id)).toEqual(['b']);
  });

  it('tümü merceği hiçbir kaydı elemez', () => {
    expect(kayitlar.filter((x) => mercekten(x, 'hepsi'))).toHaveLength(4);
  });
});

describe('Sıralama ve kuyruk', () => {
  it('en çok müdahale isteyen üstte durur', () => {
    const sirali = sirala([
      d({ id: 'kapali', durum: 'dogrulandi' }),
      d({ id: 'acik' }),
      d({ id: 'gecikmis', planTarihi: gunSonra(-5) }),
      d({ id: 'geri', durum: 'geri_alindi' }),
      d({ id: 'uygulandi', durum: 'uygulandi' }),
    ], SIMDI);
    expect(sirali.map((x) => x.id))
      .toEqual(['geri', 'gecikmis', 'uygulandi', 'acik', 'kapali']);
  });

  it('kuyruğa yalnız doğrulanmış kayıt iner; geri alınan ASLA toplanmaz', () => {
    expect(toplanabilir(d({ durum: 'dogrulandi' }))).toBe(true);
    expect(toplanabilir(d({ durum: 'geri_alindi' }))).toBe(false);
    expect(toplanabilir(d({ durum: 'uygulandi' }))).toBe(false);
  });

  it('kritik satırlar bütçeyi aşsa da görünür kalır', () => {
    const cok = Array.from({ length: 12 }, (_, i) =>
      d({ id: `g${i}`, planTarihi: gunSonra(-1 - i) }));
    const { gorunur, toplanan } = bolumle(sirala(cok, SIMDI), false);
    expect(gorunur).toHaveLength(12);
    expect(toplanan).toHaveLength(0);
  });

  it('bütçeyi aşan sağlıklı satırlar kuyruğa iner, kuyruk açılınca geri gelir', () => {
    const kayitlar = [
      d({ id: 'g', planTarihi: gunSonra(-2) }),
      ...Array.from({ length: 10 }, (_, i) => d({ id: `k${i}`, durum: 'dogrulandi' })),
    ];
    const sirali = sirala(kayitlar, SIMDI);
    const kapali = bolumle(sirali, false);
    expect(kapali.gorunur).toHaveLength(GORUNUR_BUTCE);
    expect(kapali.toplanan).toHaveLength(4);
    expect(kapali.gorunur[0].id).toBe('g');
    expect(bolumle(sirali, true).gorunur).toHaveLength(11);
  });
});

describe('Metrikler ve başlık', () => {
  const kayitlar = [
    d({ id: '1', planTarihi: gunSonra(-3) }),                 // gecikmiş
    d({ id: '2', durum: 'uygulandi' }),                        // doğrulama bekliyor
    otTam({ id: '3', geriAlmaPlani: null }),                   // kapı eksik
    d({ id: '4', planTarihi: null }),                          // takvimi bilinmiyor
    d({ id: '5', durum: 'dogrulandi' }),
    d({ id: '6', durum: 'geri_alindi' }),
  ];
  const m = metrikleriHesapla(kayitlar, SIMDI);

  it('metrikler kütüğün tamamını sayar', () => {
    expect(m.toplam).toBe(6);
    expect(m.acik).toBe(4);
    expect(m.gecikmis).toBe(1);
    expect(m.kapiEksik).toBe(1);
    expect(m.dogrulamaBekleyen).toBe(1);
    expect(m.kapanan).toBe(1);
    expect(m.geriAlinan).toBe(1);
    expect(m.otAcik).toBe(1);
  });

  it('takvimi girilmemiş kayıt AYRI sayılır, gecikmişe eklenmez', () => {
    expect(m.planTarihsiz).toBe(1);
    expect(m.gecikmis).toBe(1);
  });

  it('başlık en çok müdahale isteyen olguyu vurgular', () => {
    expect(baslikMetni(m)).toEqual({ vurgu: '1 değişiklik', ad: 'plan tarihini aştı', durum: 'bd' });
    const temiz = metrikleriHesapla([d({ durum: 'dogrulandi' })], SIMDI);
    expect(baslikMetni(temiz)).toEqual({ ad: 'Açık değişiklik yok' });
  });

  it('dip not bilinmeyeni ve gizleneni sessizce yutmaz', () => {
    const not = dipNot(4, m, 'acik');
    expect(not).toContain('1 kaydın plan tarihi girilmedi');
    expect(not).toContain('1 kayıt geri alınmış');
    expect(not).toContain('1 doğrulanmış kayıt bu mercekte gizli');
  });
});
