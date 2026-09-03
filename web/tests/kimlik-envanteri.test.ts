import { describe, expect, it } from 'vitest';
import {
  BOS_DURUS, KIMLIK_ALANLARI, kimlikEnvanteri, kimlikTamligi,
  type Durus, type V,
} from '../app/(kabuk)/(operasyonel)/envanter/mantik';

/* ═══ OT-03 · Kimlik alanı envanteri ══════════════════════════════════

   Tek bir kural sınanıyor ve her testi o kuralın bir yüzü:

     UYGULANAMAZ ≠ ÖLÇÜLMEDİ ≠ DOLU

   Üçünü ikiye indiren her sadeleştirme ya kapatılamayan bir borç ya da
   sessizce kapatılmış bir kusur üretir. */

const TUR: V['tur'] = { id: 't', kod: 'PLC', ad: 'PLC', sinif: 'OT' };

function varlik(ek: Partial<V> = {}, durus: Partial<Durus> = {}): V {
  return {
    id: 'v1', etiket: 'KIZ-PLC-01', ad: 'Saha PLC', tur: TUR,
    tesis: null, unite: null, sistem: null, bolge: null,
    sahip: null, emanetci: null, tedarikci: null, sozlesme: null,
    hostname: null, seriNo: null, uretici: null, model: null, ipAdresi: null,
    macAdresi: null, isletimSistemi: null, firmware: null, surum: null,
    rafOda: null, kimlikDogrulama: null,
    ipv6Adresi: null, isletimSistemiSurumu: null,
    firmwareYapisi: null, donanimRevizyonu: null, yazilimlar: [],
    kritiklik: 'orta', yamaDurumu: 'guncel', edrDurumu: 'var', yedekDurumu: 'var',
    izlemeDurumu: 'var', logKaynagi: 'var', internetMaruziyeti: 'yok',
    uzaktanErisim: false, yasamDongusu: 'aktif',
    kurulumTarihi: null, garantiBitis: null, destekBitis: null,
    eolTarihi: null, eosTarihi: null, guncellendi: '2026-01-01T00:00:00.000Z',
    iliskiler: [], riskler: [], zafiyetler: [], projeler: [], kanitlar: [],
    acikZafiyet: 0, sonYedek: null, sonKesif: null,
    yazilabilir: true, onaylanabilir: true,
    durus: { ...BOS_DURUS, ...durus },
    ...ek,
  };
}

describe('Envanter on dört alanı da listeler — boş olan gizlenmez', () => {
  it('hiçbir alan doldurulmamış olsa da liste tam gelir', () => {
    const alanlar = kimlikEnvanteri(varlik());
    expect(alanlar).toHaveLength(KIMLIK_ALANLARI.length);
    expect(alanlar).toHaveLength(14);
  });

  it('etiket şemada zorunludur; her zaman dolu görünür', () => {
    const etiket = kimlikEnvanteri(varlik()).find((a) => a.anahtar === 'etiket');
    expect(etiket?.deger).toBe('KIZ-PLC-01');
  });

  it('yalnız boşluktan ibaret değer ÖLÇÜLMEMİŞ sayılır', () => {
    const a = kimlikEnvanteri(varlik({ seriNo: '   ' }));
    expect(a.find((x) => x.anahtar === 'seriNo')?.deger).toBeNull();
  });

  it('kurulu yazılım ad + sürüm olarak tek satıra iner', () => {
    const v = varlik({
      yazilimlar: [
        { id: 'y1', ad: 'WinCC', surum: '7.5' },
        { id: 'y2', ad: 'Step7', surum: null },
      ],
    });
    expect(kimlikEnvanteri(v).find((a) => a.anahtar === 'yazilim')?.deger)
      .toBe('WinCC 7.5 · Step7');
  });

  it('kurulu yazılım yoksa alan ÖLÇÜLMEDİ olur, "yok" değil', () => {
    expect(kimlikEnvanteri(varlik()).find((a) => a.anahtar === 'yazilim')?.deger)
      .toBeNull();
  });
});

describe('Uygulanamaz bir KARARDIR; eksik veri değildir', () => {
  const gerekce = 'Seri hat dönüştürücüsünün hostname alanı yoktur.';

  it('uygulanamaz alan gerekçesiyle birlikte döner', () => {
    const v = varlik({}, { uygulanamaz: { hostname: gerekce } });
    const h = kimlikEnvanteri(v).find((a) => a.anahtar === 'hostname');
    expect(h?.uygulanamaz).toBe(gerekce);
  });

  it('uygulanamaz alan ölçüm borcuna GİRMEZ', () => {
    const bos = kimlikTamligi(varlik());
    const isaretli = kimlikTamligi(varlik({}, { uygulanamaz: { hostname: gerekce } }));
    expect(bos.olculmedi).toBe(13);          // etiket dolu, kalan 13 boş
    expect(isaretli.olculmedi).toBe(12);     // hostname borç olmaktan çıktı
    expect(isaretli.uygulanamaz).toBe(1);
  });

  it('uygulanamaz alan PAYDAYA da girmez: oran yükselir', () => {
    const bos = kimlikTamligi(varlik());
    const isaretli = kimlikTamligi(varlik({}, { uygulanamaz: { hostname: gerekce } }));
    expect(bos.oran).toBe(Math.round((1 / 14) * 100));       // %7
    expect(isaretli.oran).toBe(Math.round((1 / 13) * 100));  // %8
    expect(isaretli.oran! > bos.oran!).toBe(true);
  });

  it('her alan uygulanamazsa oran NULL olur — %0 da %100 de yalan olurdu', () => {
    const hepsi = Object.fromEntries(KIMLIK_ALANLARI.map((a) => [a.anahtar, gerekce]));
    const t = kimlikTamligi(varlik({}, { uygulanamaz: hepsi }));
    expect(t.uygulanamaz).toBe(14);
    expect(t.olculmedi).toBe(0);
    expect(t.dolu).toBe(0);
    expect(t.oran).toBeNull();
  });

  it('uygulanamaz işareti DOLU bir alanı da örtebilir; o alan sayılmaz', () => {
    const v = varlik({ hostname: 'plc-01' }, { uygulanamaz: { hostname: gerekce } });
    const t = kimlikTamligi(v);
    expect(t.dolu).toBe(1);                 // yalnız etiket
    expect(t.uygulanamaz).toBe(1);
    expect(t.dolu + t.olculmedi + t.uygulanamaz).toBe(14);
  });
});

describe('Sayaçlar birbirini tamamlar — hiçbir alan iki kez sayılmaz', () => {
  it('dolu + ölçülmedi + uygulanamaz = alan sayısı, her kurulumda', () => {
    const durumlar: V[] = [
      varlik(),
      varlik({ hostname: 'h', ipAdresi: '10.0.0.1' }),
      varlik({ uretici: 'Siemens' }, { uygulanamaz: { ipv6Adresi: 'IPv6 yığını yok.' } }),
      varlik({ yazilimlar: [{ id: 'y', ad: 'X', surum: '1' }] },
        { uygulanamaz: { firmwareYapisi: 'Üretici yapı damgası yayımlamıyor.' } }),
    ];
    for (const v of durumlar) {
      const t = kimlikTamligi(v);
      expect(t.dolu + t.olculmedi + t.uygulanamaz).toBe(KIMLIK_ALANLARI.length);
    }
  });

  it('bilinmeyen bir alan adı uygulanamaz işaretlense bile sayaçları bozmaz', () => {
    const t = kimlikTamligi(varlik({}, { uygulanamaz: { boyleBirAlanYok: 'x' } }));
    expect(t.uygulanamaz).toBe(0);
    expect(t.dolu + t.olculmedi).toBe(14);
  });
});
