import { describe, expect, it } from 'vitest';

/* O10/O11 · Varlık zekâsının saf mantığı. Bu modül veritabanına, React'e
   ve server-only'ye dokunmaz; testi de dokunmaz — izole DB kopyası
   gerekmez (bkz. tests/semantik.test.ts kalıbı). */

import {
  GORUNUR_TAVAN, GRAFIK_VARLIK_TAVANI,
  bilinmeyenAlanlar, bolumle, grafigiKur, karariBloklayanBilinmeyen, kisaEtiket,
  korumaAcigi, kullanimda, kuyrukMetni, mercekten, metrikleriHesapla, olgu,
  omurGunu, sirala, suz, turKapsamindan, varlikDurumu, varsayilanTesis,
  BOS_DURUS, BOS_YONETISIM, type Bolge, type Kodlu, type V,
} from '@/app/(kabuk)/(operasyonel)/envanter/mantik';

const SIMDI = Date.parse('2026-06-01T00:00:00.000Z');
const GUN = 86_400_000;
const gunSonra = (n: number) => new Date(SIMDI + n * GUN).toISOString();

const TUR_OT: V['tur'] = { id: 't-ot', kod: 'PLC', ad: 'PLC', sinif: 'OT' };
const TUR_BT: V['tur'] = { id: 't-bt', kod: 'SRV', ad: 'Sanal Sunucu', sinif: 'BT' };

const KIZILDERE: Kodlu = { id: 'tesis-1', kod: 'KIZILDERE-3', ad: 'Kızıldere III JES' };
const GOKCEDAG: Kodlu = { id: 'tesis-2', kod: 'GOKCEDAG-RES', ad: 'Gökçedağ RES' };

const OT_BOLGE: Bolge = {
  id: 'b-ot', kod: 'KIZILDERE3-OT', ad: 'Süreç Kontrol Ağı',
  tip: 'ot', seviye: 2, tesisId: KIZILDERE.id,
};
const DMZ_BOLGE: Bolge = {
  id: 'b-dmz', kod: 'KIZILDERE3-OT-DMZ', ad: 'OT DMZ',
  tip: 'ot_dmz', seviye: 3, tesisId: KIZILDERE.id,
};
const YABANCI_BOLGE: Bolge = {
  id: 'b-yad', kod: 'GOKCEDAG-OT', ad: 'Türbin SCADA Ağı',
  tip: 'ot', seviye: 2, tesisId: GOKCEDAG.id,
};

/** Her alanı BİLİNEN ve sağlıklı bir taban varlık; testler tek alan bozar. */
function varlik(ek: Partial<V> = {}): V {
  return {
    id: ek.id ?? 'v1', etiket: ek.etiket ?? 'KIZILDERE-3-PLC-01', ad: ek.ad ?? 'Saha PLC',
    tur: TUR_OT, tesis: KIZILDERE, unite: null, sistem: null, bolge: OT_BOLGE,
    sahip: { id: 'k1', ad: 'B. Şahin' }, emanetci: null, tedarikci: null, sozlesme: null,
    hostname: null, seriNo: null, uretici: null, model: null, ipAdresi: null,
    macAdresi: null, isletimSistemi: null, firmware: null, surum: null,
    rafOda: null, kimlikDogrulama: null,
    ipv6Adresi: null, isletimSistemiSurumu: null,
    firmwareYapisi: null, donanimRevizyonu: null, yazilimlar: [],
    garantiSaglayici: null, bakimBitis: null, sonBakim: null, sonrakiBakim: null,
    kritiklik: 'orta', uretimEtkisi: 'bilinmiyor', yamaDurumu: 'guncel', edrDurumu: 'var', yedekDurumu: 'var',
    izlemeDurumu: 'var', logKaynagi: 'var', internetMaruziyeti: 'yok',
    uzaktanErisim: false, yasamDongusu: 'aktif',
    kurulumTarihi: null, garantiBitis: null, destekBitis: null, eolTarihi: null,
    eosTarihi: gunSonra(900), guncellendi: gunSonra(-10),
    iliskiler: [], riskler: [], kanitlar: [], acikZafiyet: 0,
    zafiyetler: [], projeler: [],
    sonYedek: null, sonKesif: null, zimmet: null, yazilabilir: true, onaylanabilir: true,
    durus: BOS_DURUS, yonetisim: BOS_YONETISIM,
    ...ek,
  };
}

describe('Bilinmeyen birinci sınıftır — sıfır ya da sağlıklı sayılmaz', () => {
  it('EOS tarihi girilmemiş varlık "ömrü bitmedi" değildir: unk, ok DEĞİL', () => {
    const v = varlik({ eosTarihi: null });
    expect(omurGunu(v, SIMDI)).toBeNull();
    expect(varlikDurumu(v, SIMDI)).toBe('unk');
  });

  it('kritikliği girilmemiş varlık "kritik değil" değildir: unk', () => {
    expect(varlikDurumu(varlik({ kritiklik: 'bilinmiyor' }), SIMDI)).toBe('unk');
  });

  it('ölçülmemiş koruma alanı açık SAYILMAZ — korumaAcigi yalnız bilineni toplar', () => {
    const olculmemis = varlik({ edrDurumu: 'bilinmiyor', yedekDurumu: 'bilinmiyor' });
    expect(korumaAcigi(olculmemis)).toEqual([]);
    expect(bilinmeyenAlanlar(olculmemis)).toContain('EDR');
    expect(varlikDurumu(olculmemis, SIMDI)).toBe('ok');
  });

  it('bilinen eksik koruma açıktır ve kısmi işaret verir', () => {
    const v = varlik({ yedekDurumu: 'yok' });
    expect(korumaAcigi(v)).toEqual(['yedek yok']);
    expect(varlikDurumu(v, SIMDI)).toBe('md');
  });

  it('metriklerde bilinmeyen ayrı sayılır, açıklara eklenmez', () => {
    const m = metrikleriHesapla([
      varlik({ id: 'a', eosTarihi: gunSonra(-30) }),          // desteksiz
      varlik({ id: 'b', yedekDurumu: 'yok' }),                // koruma açığı
      varlik({ id: 'c', eosTarihi: null }),                   // ömür bilinmiyor
      varlik({ id: 'd', kritiklik: 'bilinmiyor' }),           // kritiklik bilinmiyor
      varlik({ id: 'e' }),                                    // sağlıklı
    ], SIMDI);
    expect(m.kullanimdaki).toBe(5);
    expect(m.desteksiz).toBe(1);
    expect(m.korumaAcikli).toBe(1);
    expect(m.bilinmeyen).toBe(2);
    expect(m.ot).toBe(5);
  });
});

describe('Şiddet sırası: bilinen kötü > bilinen kısmi > bilinmeyen > sağlıklı', () => {
  it('EOS geçmişse kritik işaret', () => {
    expect(varlikDurumu(varlik({ eosTarihi: gunSonra(-1) }), SIMDI)).toBe('bd');
  });

  it('yamasız kayıt EOS bilinmese de kritik işaret alır', () => {
    expect(varlikDurumu(varlik({ yamaDurumu: 'yamasiz', eosTarihi: null }), SIMDI)).toBe('bd');
  });

  it('bir yıldan az ömür kısmi işarettir', () => {
    expect(varlikDurumu(varlik({ eosTarihi: gunSonra(100) }), SIMDI)).toBe('md');
  });

  it('her alanı bilinen ve açığı olmayan kayıt sağlıklıdır', () => {
    expect(varlikDurumu(varlik(), SIMDI)).toBe('ok');
  });
});

describe('Satır olgusu durum sözcüğü değil, olgu taşır', () => {
  it('bilinen açık varsa açığı yazar', () => {
    expect(olgu(varlik({ yamaDurumu: 'yamasiz' }), SIMDI)).toBe('yamasız');
  });
  it('EOS yoksa bunu söyler', () => {
    expect(olgu(varlik({ eosTarihi: null }), SIMDI)).toBe('EOS girilmedi');
  });
  it('sağlıklı satırda olgu boştur — boş yere metin üretmez', () => {
    expect(olgu(varlik(), SIMDI)).toBe('');
  });
});

describe('Mercek ve kapsam', () => {
  const emekli = varlik({ id: 'em', yasamDongusu: 'emekli' });

  it('emekli/imha kayıtlar kullanımdaki merceklerin dışındadır', () => {
    expect(kullanimda(emekli)).toBe(false);
    expect(mercekten(emekli, 'hepsi', SIMDI)).toBe(false);
    expect(mercekten(emekli, 'emekli', SIMDI)).toBe(true);
  });

  it('sinyal merceği yalnız bilinen kötü ve kısmi kayıtları alır', () => {
    expect(mercekten(varlik({ eosTarihi: gunSonra(-1) }), 'sinyal', SIMDI)).toBe(true);
    expect(mercekten(varlik({ eosTarihi: null }), 'sinyal', SIMDI)).toBe(false);
    expect(mercekten(varlik(), 'sinyal', SIMDI)).toBe(false);
  });

  it('ömür mercekleri bilinmeyen tarihi ne "bitti" ne "yakın" sayar', () => {
    const gecmis = varlik({ eosTarihi: gunSonra(-1) });
    const yakin = varlik({ eosTarihi: gunSonra(100) });
    const bilinmeyen = varlik({ eosTarihi: null });
    expect(mercekten(gecmis, 'desteksiz', SIMDI)).toBe(true);
    expect(mercekten(gecmis, 'omurYakin', SIMDI)).toBe(false);
    expect(mercekten(yakin, 'omurYakin', SIMDI)).toBe(true);
    expect(mercekten(yakin, 'desteksiz', SIMDI)).toBe(false);
    expect(mercekten(bilinmeyen, 'desteksiz', SIMDI)).toBe(false);
    expect(mercekten(bilinmeyen, 'omurYakin', SIMDI)).toBe(false);
    expect(mercekten(bilinmeyen, 'bilinmeyen', SIMDI)).toBe(true);
  });

  it('maruziyet merceği internet ve uzaktan erişimi birlikte kapsar', () => {
    expect(mercekten(varlik({ internetMaruziyeti: 'sinirli' }), 'maruz', SIMDI)).toBe(true);
    expect(mercekten(varlik({ uzaktanErisim: true }), 'maruz', SIMDI)).toBe(true);
    expect(mercekten(varlik(), 'maruz', SIMDI)).toBe(false);
  });

  it('OT merceği BT/OT köprüsünü de kapsar', () => {
    const kopru = varlik({ tur: { id: 't-k', kod: 'OTFW', ad: 'OT FW', sinif: 'BT_OT_KOPRU' } });
    expect(mercekten(kopru, 'ot', SIMDI)).toBe(true);
    expect(mercekten(varlik({ tur: TUR_BT }), 'ot', SIMDI)).toBe(false);
  });

  it('tür kapsamı tek kontrolde hem sınıfı hem türü süzer', () => {
    const v = varlik();
    expect(turKapsamindan(v, null)).toBe(true);
    expect(turKapsamindan(v, 's:OT')).toBe(true);
    expect(turKapsamindan(v, 's:BT')).toBe(false);
    expect(turKapsamindan(v, `t:${TUR_OT.id}`)).toBe(true);
    expect(turKapsamindan(v, 't:baska')).toBe(false);
  });

  it('santral kapsamı dışındaki varlık süzülür', () => {
    const havuz = [varlik({ id: 'a' }), varlik({ id: 'b', tesis: GOKCEDAG })];
    const sonuc = suz(havuz, {
      mercek: 'hepsi', tesisId: GOKCEDAG.id, turKapsami: null, kritiklik: null, arama: '',
    }, SIMDI);
    expect(sonuc.map((v) => v.id)).toEqual(['b']);
  });

  it('kritiklik kapsamı her kademeyi ayrı ayrı süzer, bilinmiyor dâhil', () => {
    const havuz = [
      varlik({ id: 'k', kritiklik: 'kritik' }),
      varlik({ id: 'y', kritiklik: 'yuksek' }),
      varlik({ id: 'b', kritiklik: 'bilinmiyor' }),
    ];
    const ile = (k: string) => suz(havuz, {
      mercek: 'hepsi', tesisId: null, turKapsami: null, kritiklik: k, arama: '',
    }, SIMDI).map((v) => v.id);
    expect(ile('yuksek')).toEqual(['y']);
    expect(ile('bilinmiyor')).toEqual(['b']);
  });

  it('arama etiket, ad ve ağ bilgisi üzerinde çalışır', () => {
    const havuz = [varlik({ id: 'a', hostname: 'kzd3-plc-01' }), varlik({ id: 'b' })];
    expect(suz(havuz, {
      mercek: 'hepsi', tesisId: null, turKapsami: null, kritiklik: null, arama: 'KZD3',
    }, SIMDI).map((v) => v.id)).toEqual(['a']);
  });
});

describe('Sıralama ve kuyruk — kritik satır ASLA toplanmaz', () => {
  it('kritik işaretli satırlar bütçeden bağımsız görünür kalır', () => {
    const kritikler = Array.from({ length: 12 }, (_, i) =>
      varlik({ id: `k${i}`, etiket: `KRT-${i}`, eosTarihi: gunSonra(-i - 1) }));
    const sakinler = Array.from({ length: 40 }, (_, i) =>
      varlik({ id: `s${i}`, etiket: `SKN-${i}` }));
    const { gorunur, toplanan } = bolumle(
      sirala([...sakinler, ...kritikler], SIMDI), SIMDI, false);
    expect(gorunur).toHaveLength(12);
    expect(gorunur.every((v) => varlikDurumu(v, SIMDI) === 'bd')).toBe(true);
    expect(toplanan).toHaveLength(40);
  });

  it('kritik satır azsa bütçe sakin satırlarla dolar', () => {
    const havuz = [
      varlik({ id: 'k', etiket: 'KRT', eosTarihi: gunSonra(-5) }),
      ...Array.from({ length: 20 }, (_, i) => varlik({ id: `s${i}`, etiket: `SKN-${i}` })),
    ];
    const { gorunur, toplanan } = bolumle(sirala(havuz, SIMDI), SIMDI, false);
    expect(gorunur).toHaveLength(GORUNUR_TAVAN);
    expect(toplanan).toHaveLength(12);
  });

  it('kuyruk açıldığında hiçbir satır gizlenmez', () => {
    const havuz = Array.from({ length: 30 }, (_, i) => varlik({ id: `s${i}`, etiket: `S-${i}` }));
    const { gorunur, toplanan } = bolumle(sirala(havuz, SIMDI), SIMDI, true);
    expect(gorunur).toHaveLength(30);
    expect(toplanan).toHaveLength(0);
  });

  it('kuyruk satırı neyi topladığını yazar', () => {
    const karisik = kuyrukMetni([
      varlik({ id: 'a', yedekDurumu: 'yok' }),
      varlik({ id: 'b', eosTarihi: null }),
    ], SIMDI);
    expect(karisik).toBe('+2 varlık · 1 koruma açığı · 1 ömür/kritiklik girilmemiş');
    // Tek sınıflı kuyrukta sayı iki kez yazılmaz.
    const tekSinif = kuyrukMetni([
      varlik({ id: 'a', yedekDurumu: 'yok' }),
      varlik({ id: 'b', izlemeDurumu: 'yok' }),
    ], SIMDI);
    expect(tekSinif).toBe('+2 varlık · koruma açığı');
    // İki sayı kuyruğu bölmez: aynı varlık iki olguyu birden taşıyabilir ve
    // bilinmeyen sayısı ekranın metriğiyle aynı ölçütten okunur.
    const ortusen = kuyrukMetni([varlik({ id: 'a', yedekDurumu: 'yok', eosTarihi: null })], SIMDI);
    expect(ortusen).toBe('+1 varlık · 1 koruma açığı · 1 ömür/kritiklik girilmemiş');
  });

  it('sıralama önce şiddeti, sonra kritikliği izler; bilinmeyen kritiklik dibe atılmaz', () => {
    const sonuc = sirala([
      varlik({ id: 'dusuk', etiket: 'A', kritiklik: 'dusuk' }),
      varlik({ id: 'bilinmiyor', etiket: 'B', kritiklik: 'bilinmiyor' }),
      varlik({ id: 'orta', etiket: 'C', kritiklik: 'orta' }),
      varlik({ id: 'kritik', etiket: 'D', kritiklik: 'kritik' }),
    ], SIMDI);
    // Kritikliği girilmemiş kayıt `unk` işaret üretir ve şiddet sırasında
    // sağlıklıların ÖNÜNE geçer: bilinmeyen "düşük" muamelesi görmez.
    expect(sonuc.map((v) => v.id)).toEqual(['bilinmiyor', 'kritik', 'orta', 'dusuk']);
    expect(varlikDurumu(sonuc[0], SIMDI)).toBe('unk');
  });
});

describe('İlişki grafiği — kapsam daraltması zorunludur', () => {
  const kapsamli = (id: string, ek: Partial<V> = {}) =>
    varlik({ id, etiket: `KIZILDERE-3-${id.toUpperCase()}`, ...ek });

  it('seçili santralin dışındaki hiçbir düğüm çizilmez', () => {
    const g = grafigiKur({
      varliklar: [
        kapsamli('a'),
        varlik({ id: 'yabanci', etiket: 'GOKCEDAG-RES-PLC-01', tesis: GOKCEDAG,
          bolge: YABANCI_BOLGE }),
      ],
      bolgeler: [OT_BOLGE, DMZ_BOLGE, YABANCI_BOLGE],
      tesis: KIZILDERE,
      simdi: SIMDI,
    });
    expect(g.kapsamdaki).toBe(1);
    expect(g.dugumler.some((d) => d.id === 'v-yabanci')).toBe(false);
    expect(g.dugumler.some((d) => d.id === `b-${YABANCI_BOLGE.id}`)).toBe(false);
  });

  it('347 düğüm çizilmez: varlık tavanı uygulanır ve en ağır sinyaller seçilir', () => {
    const havuz = [
      ...Array.from({ length: 40 }, (_, i) => kapsamli(`ok${i}`)),
      kapsamli('agir', { eosTarihi: gunSonra(-20) }),
    ];
    const g = grafigiKur({
      varliklar: havuz, bolgeler: [OT_BOLGE], tesis: KIZILDERE, simdi: SIMDI,
    });
    expect(g.kapsamdaki).toBe(41);
    expect(g.cizilen).toBe(GRAFIK_VARLIK_TAVANI);
    expect(g.dugumler.filter((d) => d.id.startsWith('v-'))).toHaveLength(GRAFIK_VARLIK_TAVANI);
    expect(g.dugumler.some((d) => d.id === 'v-agir')).toBe(true);
  });

  it('bölge sayacı mercekten değil santralin tamamından okunur', () => {
    const havuz = [
      kapsamli('a', { eosTarihi: gunSonra(-10) }),           // mercekten geçer
      kapsamli('b'), kapsamli('c'),                          // geçmez ama bölgede durur
    ];
    const g = grafigiKur({
      varliklar: havuz,
      adaylar: [havuz[0]],
      bolgeler: [OT_BOLGE], tesis: KIZILDERE, simdi: SIMDI,
    });
    expect(g.kapsamdaki).toBe(3);
    expect(g.aday).toBe(1);
    expect(g.cizilen).toBe(1);
    // "0 varlık" yazan bölge düğümü bölgenin boş olduğu yalanını söylerdi.
    expect(g.dugumler.find((d) => d.id === `b-${OT_BOLGE.id}`)?.alt).toBe('SL2 · 3 varlık');
  });

  it('kenarsız sistem düğümü çizilmez', () => {
    const sistem: Kodlu = { id: 'sis-1', kod: 'KIZILDERE3-DCS', ad: 'Türbin DCS' };
    const g = grafigiKur({
      varliklar: [kapsamli('a', { sistem }), kapsamli('b', { eosTarihi: gunSonra(-10) })],
      adaylar: [kapsamli('b', { eosTarihi: gunSonra(-10) })],
      bolgeler: [OT_BOLGE], tesis: KIZILDERE, simdi: SIMDI,
    });
    expect(g.dugumler.some((d) => d.id === 's-sis-1')).toBe(false);
  });

  it('varlık ↔ bölge ↔ sistem üçlüsü kenarlarla bağlanır', () => {
    const sistem: Kodlu = { id: 'sis-1', kod: 'KIZILDERE3-DCS', ad: 'Türbin DCS' };
    const g = grafigiKur({
      varliklar: [kapsamli('a', { sistem })],
      bolgeler: [OT_BOLGE], tesis: KIZILDERE, simdi: SIMDI,
    });
    expect(g.kenarlar).toContainEqual({ kaynak: `b-${OT_BOLGE.id}`, hedef: 'v-a' });
    expect(g.kenarlar).toContainEqual({ kaynak: 'v-a', hedef: 's-sis-1', aktif: true });
  });

  it('varlık–varlık bağı yalnız iki ucu da çizilmişse kenara dönüşür', () => {
    const a = kapsamli('a', {
      eosTarihi: gunSonra(-30),
      iliskiler: [
        { id: 'i1', tip: 'depends_on', giden: true,
          diger: { id: 'b', etiket: 'KIZILDERE-3-B', ad: 'B' } },
        { id: 'i2', tip: 'connects_to', giden: true,
          diger: { id: 'yok', etiket: 'BASKA', ad: 'Başka' } },
      ],
    });
    const b = kapsamli('b', { eosTarihi: gunSonra(-20) });
    const g = grafigiKur({
      varliklar: [a, b], bolgeler: [OT_BOLGE], tesis: KIZILDERE, simdi: SIMDI,
    });
    expect(g.kenarlar).toContainEqual({ kaynak: 'v-a', hedef: 'v-b', etiket: 'depends_on' });
    expect(g.kenarlar.some((k) => k.hedef === 'v-yok')).toBe(false);
  });

  it('düğüm üst etiketi durum sözcüğü değil, olgu taşır', () => {
    const g = grafigiKur({
      varliklar: [kapsamli('a', { eosTarihi: null })],
      bolgeler: [OT_BOLGE], tesis: KIZILDERE, simdi: SIMDI,
    });
    const dugum = g.dugumler.find((d) => d.id === 'v-a');
    expect(dugum?.ustEtiket).toBe('EOS YOK');
    expect(dugum?.durum).toBe('unk');
  });

  it('kapsam boşken bile grafik üretilir ama hiçbir varlık çizilmez', () => {
    const g = grafigiKur({
      varliklar: [], bolgeler: [OT_BOLGE, DMZ_BOLGE], tesis: KIZILDERE, simdi: SIMDI,
    });
    expect(g.cizilen).toBe(0);
    expect(g.dugumler.every((d) => d.id.startsWith('b-'))).toBe(true);
    expect(g.kenarlar).toEqual([]);
  });

  it('varsayılan kapsam en çok varlığı olan santraldir', () => {
    const secim = varsayilanTesis(
      [varlik({ id: 'a', tesis: GOKCEDAG }), varlik({ id: 'b', tesis: GOKCEDAG }),
        varlik({ id: 'c' })],
      [KIZILDERE, GOKCEDAG],
    );
    expect(secim?.id).toBe(GOKCEDAG.id);
  });
});

describe('Düğüm etiketi santral önekini tekrar etmez', () => {
  it('santral kodu önekse düşer', () => {
    expect(kisaEtiket('KIZILDERE-3-SCADA-01', 'KIZILDERE-3')).toBe('SCADA-01');
    expect(kisaEtiket('KIZILDERE3-SCADA-01', 'KIZILDERE-3')).toBe('SCADA-01');
  });
  it('önek uymuyorsa etiket olduğu gibi kalır', () => {
    expect(kisaEtiket('MERKEZ-ESX-02', 'KIZILDERE-3')).toBe('MERKEZ-ESX-02');
    expect(kisaEtiket('SCADA-01', null)).toBe('SCADA-01');
  });
});

describe('Karar bloklayan bilinmeyen', () => {
  it('yalnız kritiklik ve ömür sonu kararı bloklar', () => {
    expect(karariBloklayanBilinmeyen(varlik())).toBe(false);
    expect(karariBloklayanBilinmeyen(varlik({ eosTarihi: null }))).toBe(true);
    expect(karariBloklayanBilinmeyen(varlik({ kritiklik: 'bilinmiyor' }))).toBe(true);
    // EDR ölçülmemiş olması kararı bloklamaz ama kayıtta görünür kalır.
    expect(karariBloklayanBilinmeyen(varlik({ edrDurumu: 'bilinmiyor' }))).toBe(false);
    expect(bilinmeyenAlanlar(varlik({ edrDurumu: 'bilinmiyor' }))).toEqual(['EDR']);
  });
});
