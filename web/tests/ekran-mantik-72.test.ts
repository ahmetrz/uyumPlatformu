import { describe, expect, it } from 'vitest';
import {
  HEPSI, TUZEL_YOK, enZayif, olcuYazisi, sirala, suz, tuzelKisiler,
  type PortfoySatiri,
} from '@/app/(tam)/portfoy/mantik';
import {
  hucreEsigi, hucredeMi, isiHaritasi, isiKonumu,
} from '@/app/(kabuk)/(operasyonel)/riskler/ortak';
import {
  TREND_BOY, TREND_EN, anlikSayimi, trendFarki, trendGeometrisi,
  type TrendNoktasi,
} from '@/app/(kabuk)/(operasyonel)/uyum/mantik';

/* #72 · Ekran mantığı (A2 portföy · C15 uyum eğilimi · C18 risk ısı
   haritası). Üç ekranın SAF katmanı burada sınanır; JSX'e dokunulmaz.
   Ortak iddia: bilinmeyen ≠ sıfır — ölçülmemiş satır ne en kötü ne en
   iyi sayılır, ızgaraya ya da çizgiye sokulmaz. */

function santral(kismi: Partial<PortfoySatiri> & { id: string }): PortfoySatiri {
  return {
    kod: kismi.id.toUpperCase(), ad: kismi.id,
    tipKod: 'HES', tipAdi: 'Hidroelektrik', tuzelKisi: 'Zorlu Doğal',
    konum: null, gucMw: 100, gorselAnahtari: null, kritiklik: null,
    uyumYuzde: 80, bilinmeyenOran: 0, acikBulgu: 0, acikRisk: 0,
    ...kismi,
  };
}

describe('A2 · portföy sıralama', () => {
  const satirlar = [
    santral({ id: 'a', gucMw: 50, acikBulgu: 2, acikRisk: 1, uyumYuzde: 70 }),
    santral({ id: 'b', gucMw: 200, acikBulgu: 0, acikRisk: 4, uyumYuzde: 95 }),
    santral({ id: 'c', gucMw: null, acikBulgu: 5, acikRisk: 0, uyumYuzde: null }),
  ];

  it('kurulu güç azalan; ölçülmemiş (null) sona düşer', () => {
    expect(sirala(satirlar, 'guc').map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('uyum oranı ARTAN (kötüden iyiye); ölçülmemiş yine sona düşer', () => {
    expect(sirala(satirlar, 'uyum').map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('açık bulgu ve açık risk azalan', () => {
    expect(sirala(satirlar, 'bulgu').map((s) => s.id)).toEqual(['c', 'a', 'b']);
    expect(sirala(satirlar, 'risk').map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('eşitlikte ad sırası — aynı veriyle aynı liste', () => {
    const esit = [santral({ id: 'z', gucMw: 10 }), santral({ id: 'y', gucMw: 10 })];
    expect(sirala(esit, 'guc').map((s) => s.id)).toEqual(['y', 'z']);
  });

  it('girdi dizisini değiştirmez', () => {
    const kopya = [...satirlar];
    sirala(satirlar, 'uyum');
    expect(satirlar).toEqual(kopya);
  });
});

describe('A2 · portföy süzgeç ve en zayıf', () => {
  const satirlar = [
    santral({ id: 'a', tuzelKisi: 'Zorlu Doğal', tipKod: 'HES', acikBulgu: 2, uyumYuzde: 70 }),
    santral({ id: 'b', tuzelKisi: 'Zorlu Jeotermal', tipKod: 'JES', acikBulgu: 0, uyumYuzde: 95 }),
    santral({ id: 'c', tuzelKisi: null, tipKod: null, acikBulgu: 0, uyumYuzde: null }),
  ];

  it('tüzel kişi süzgeci; kayıtsız tüzel kişi ayrı anahtarla süzülür', () => {
    expect(suz(satirlar, { tuzelKisi: 'Zorlu Doğal' }).map((s) => s.id)).toEqual(['a']);
    expect(suz(satirlar, { tuzelKisi: TUZEL_YOK }).map((s) => s.id)).toEqual(['c']);
    expect(suz(satirlar, { tuzelKisi: HEPSI })).toHaveLength(3);
  });

  it('tip süzgeci; tipi olmayan santral DIGER sayılır', () => {
    expect(suz(satirlar, { tip: 'JES' }).map((s) => s.id)).toEqual(['b']);
    expect(suz(satirlar, { tip: 'DIGER' }).map((s) => s.id)).toEqual(['c']);
  });

  it('tüzel kişi listesi adetle, kayıtsız için sözcük', () => {
    const liste = tuzelKisiler(satirlar);
    expect(liste).toHaveLength(3);
    expect(liste.find((t) => t.anahtar === TUZEL_YOK)?.ad).toBe('Tüzel kişi kayıtsız');
    expect(liste.every((t) => t.adet === 1)).toBe(true);
  });

  it('en zayıf: kurulu güçte TANIMSIZ', () => {
    expect(enZayif(satirlar, 'guc')).toBeNull();
  });

  it('en zayıf: bulguda en çok bulgulu; hepsi sıfırsa yok', () => {
    expect(enZayif(satirlar, 'bulgu')).toEqual({ id: 'a', neden: '2 açık bulgu' });
    expect(enZayif(satirlar.map((s) => ({ ...s, acikBulgu: 0 })), 'bulgu')).toBeNull();
  });

  it('en zayıf: uyumda en düşük ölçülmüş; ölçülmemiş aday olamaz', () => {
    expect(enZayif(satirlar, 'uyum')).toEqual({ id: 'a', neden: '%70 uyum' });
    expect(enZayif([satirlar[2]], 'uyum')).toBeNull();
  });

  it('ölçü yazısı: null → "ölçülmedi", birim anahtara göre', () => {
    expect(olcuYazisi(satirlar[2], 'uyum')).toBe('ölçülmedi');
    expect(olcuYazisi(satirlar[0], 'uyum')).toBe('%70');
    expect(olcuYazisi(satirlar[0], 'guc')).toBe('100 MWe');
    expect(olcuYazisi(satirlar[0], 'bulgu')).toBe('2');
  });
});

/* ── C18 ─────────────────────────────────────────────────────────────── */

const etkiYok = {
  etkiUretim: null, etkiEmniyet: null, etkiRegulasyon: null, etkiFinans: null,
  etkiSiber: null, etkiItibar: null, etkiCevre: null, etkiVeri: null,
};

describe('C18 · risk ısı haritası', () => {
  it('hücre yerleşimi: hucreler[5 - etki][olasilik - 1], etki = en büyük boyut', () => {
    const h = isiHaritasi([
      { olasilik: 4, etkiler: { ...etkiYok, etkiUretim: 2, etkiSiber: 5 } },
      { olasilik: 1, etkiler: { ...etkiYok, etkiFinans: 1 } },
    ]);
    expect(h.hucreler[0][3]).toBe(1);   // etki 5, olasılık 4
    expect(h.hucreler[4][0]).toBe(1);   // etki 1, olasılık 1
    expect(h.yerlesen).toBe(2);
    expect(h.enYuksek).toBe(1);
  });

  it('olasılık VEYA etki bilinmeyen risk haritaya girmez, ayrıca sayılır', () => {
    const h = isiHaritasi([
      { olasilik: null, etkiler: { ...etkiYok, etkiUretim: 3 } },
      { olasilik: 3, etkiler: etkiYok },
    ]);
    expect(h.olculemeyen).toBe(2);
    expect(h.yerlesen).toBe(0);
    expect(h.hucreler.flat().every((n) => n === 0)).toBe(true);
  });

  it('sınır dışı değer kenara kırpılır', () => {
    expect(isiKonumu({ olasilik: 9, etkiler: { ...etkiYok, etkiVeri: 0 } }))
      .toEqual({ olasilik: 5, etki: 1 });
  });

  it('eşik sözcüğü skorDurumu ile aynı sınırları kullanır', () => {
    expect(hucreEsigi(5, 5)).toBe('son');   // 25
    expect(hucreEsigi(3, 5)).toBe('son');   // 15
    expect(hucreEsigi(2, 4)).toBe('orta');  // 8
    expect(hucreEsigi(2, 3)).toBe('ilk');   // 6
    expect(hucreEsigi(1, 1)).toBe('ilk');
  });

  it('hücre süzgeci: yalnız o hücredeki riskler; ölçülemeyen hiçbir hücrede değil', () => {
    const r = { olasilik: 2, etkiler: { ...etkiYok, etkiEmniyet: 4 } };
    expect(hucredeMi(r, { olasilik: 2, etki: 4 })).toBe(true);
    expect(hucredeMi(r, { olasilik: 2, etki: 3 })).toBe(false);
    expect(hucredeMi({ olasilik: null, etkiler: etkiYok }, { olasilik: 1, etki: 1 })).toBe(false);
  });
});

/* ── C15 ─────────────────────────────────────────────────────────────── */

function nokta(tarih: string, yuzde: number | null): TrendNoktasi {
  return { surecId: 's', tarih, etiket: tarih.slice(5), yuzde, degerlendirilen: yuzde === null ? 0 : 10, bilinmeyen: 0 };
}

describe('C15 · uyum eğilimi', () => {
  it('ozetJson üç biçimde okunur: motor {durumlar}, eski {sayilar}, düz', () => {
    expect(anlikSayimi(JSON.stringify({ durumlar: { uyumlu: 3, kismi: 1 }, guvenler: { yuksek: 4 } })))
      .toEqual({ uyumlu: 3, kismi: 1 });
    expect(anlikSayimi(JSON.stringify({ sayilar: { uyumsuz: 2 } }))).toEqual({ uyumsuz: 2 });
    expect(anlikSayimi(JSON.stringify({ uyumlu: 5 }))).toEqual({ uyumlu: 5 });
  });

  it('okunamayan ya da boş kayıt null döner — sıfır değil', () => {
    expect(anlikSayimi('{bozuk')).toBeNull();
    expect(anlikSayimi('42')).toBeNull();
    expect(anlikSayimi(JSON.stringify({ durumlar: {} }))).toBeNull();
    expect(anlikSayimi(JSON.stringify({ not: 'sayı değil' }))).toBeNull();
  });

  it('geometri: ölçülmemiş nokta y=null, çizgiye girmez; kenar boşluğu korunur', () => {
    const g = trendGeometrisi([nokta('2026-01-01', 0), nokta('2026-02-01', null), nokta('2026-03-01', 100)]);
    expect(g).toHaveLength(3);
    expect(g[0].y).toBeCloseTo(TREND_BOY - 4);
    expect(g[1].y).toBeNull();
    expect(g[2].y).toBeCloseTo(4);
    expect(g[0].x).toBe(4);
    expect(g[2].x).toBe(TREND_EN - 4);
  });

  it('tek nokta ortaya yerleşir, boş dizi boş döner', () => {
    expect(trendGeometrisi([nokta('2026-01-01', 50)])[0].x).toBe(TREND_EN / 2);
    expect(trendGeometrisi([])).toEqual([]);
  });

  it('fark: ilk ve son ÖLÇÜLMÜŞ nokta; iki ölçüm yoksa null', () => {
    expect(trendFarki([nokta('a', null), nokta('b', 40), nokta('c', null), nokta('d', 55)])).toBe(15);
    expect(trendFarki([nokta('a', 40)])).toBeNull();
    expect(trendFarki([nokta('a', null), nokta('b', null)])).toBeNull();
  });
});
