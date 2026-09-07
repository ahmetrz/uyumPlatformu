import { describe, expect, it } from 'vitest';
import {
  KIRPILMA_TOLERANSI, altinDosyaAdi, axeCiddiMi, axeOzeti, borcAnahtari, borcSuzgeci,
  ciMi, circirKarari, enDistakiKirpilmalar, esikAltindakiler, gorselFark, kirpilmaKarari,
  rotaAdi, yuzPuan,
} from '../arac/kalite-kurallari.mjs';

/* Kalite kapılarının SAF kuralları — tarayıcısız doğrulanır.
   Kararlar araçların içinde gömülü kalsaydı yalnız canlı sunucuyla
   yoklanabilirdi; burada eşikler ve sınıflandırma sunucusuz sabitlenir. */

describe('rota → dosya adı', () => {
  it('kök rota "ana", iç rota çift alt çizgiyle düzleşir', () => {
    expect(rotaAdi('/')).toBe('ana');
    expect(rotaAdi('')).toBe('ana');
    expect(rotaAdi('/uyum')).toBe('uyum');
    expect(rotaAdi('/raporlar/kanit-paketi')).toBe('raporlar__kanit-paketi');
  });
  it('altın adı rota + bant taşır', () => {
    expect(altinDosyaAdi('/portfoy', 1440)).toBe('portfoy-1440.png');
    expect(altinDosyaAdi('/', 375)).toBe('ana-375.png');
  });
});

describe('görsel fark eşiği', () => {
  it('eşiğin altı geçer, üstü kusur', () => {
    expect(gorselFark(4, 1000).kusur).toBe(false);          // %0,4
    expect(gorselFark(6, 1000).kusur).toBe(true);           // %0,6
    expect(gorselFark(6, 1000).sebep).toContain('%0.60');
  });
  it('tam eşik kusur DEĞİL (">" karşılaştırması)', () => {
    expect(gorselFark(5, 1000).kusur).toBe(false);
  });
  it('boş görüntü sessizce geçmez', () => {
    expect(gorselFark(0, 0).kusur).toBe(true);
    expect(gorselFark(0, 0).yuzde).toBeNull();
  });
  it('eşik parametresi uygulanır', () => {
    expect(gorselFark(20, 1000, 2.5).kusur).toBe(false);
  });
});

describe('lighthouse eşiği', () => {
  it('0–1 puanı 0–100 tam sayıya çevirir, ölçülemeyeni null bırakır', () => {
    expect(yuzPuan(0.925)).toBe(93);
    expect(yuzPuan(1)).toBe(100);
    expect(yuzPuan(null)).toBeNull();
    expect(yuzPuan(undefined)).toBeNull();
  });
  it('eşiğin altında kalan ve ölçülemeyen kategorileri listeler', () => {
    const alt = esikAltindakiler({ performance: 72, accessibility: 100, seo: null, 'best-practices': 90 }, 90);
    expect(alt.map((a) => a.kategori)).toEqual(['performance', 'seo']);
    expect(alt[1].puan).toBeNull();
  });
  it('tam eşik geçer', () => {
    expect(esikAltindakiler({ performance: 90 }, 90)).toEqual([]);
  });
});

describe('axe etki sınıflandırması', () => {
  it('yalnız serious ve critical kapıyı kapatır', () => {
    expect(axeCiddiMi('critical')).toBe(true);
    expect(axeCiddiMi('Serious')).toBe(true);
    expect(axeCiddiMi('moderate')).toBe(false);
    expect(axeCiddiMi('minor')).toBe(false);
    expect(axeCiddiMi(undefined)).toBe(false);
  });
  it('özet ihlalleri ikiye ayırır ve kapı kararını verir', () => {
    const o = axeOzeti([
      { id: 'a', impact: 'minor' },
      { id: 'b', impact: 'serious' },
      { id: 'c', impact: 'moderate' },
    ]);
    expect(o.ciddi.map((i) => i.id)).toEqual(['b']);
    expect(o.diger.map((i) => i.id)).toEqual(['a', 'c']);
    expect(o.kapiKapali).toBe(true);
    expect(axeOzeti([]).kapiKapali).toBe(false);
  });
});

/* ── Kırpılan içerik — ayrım "kaydırılabiliyor mu" değil, "erişilebiliyor mu" ── */

describe('kırpılma kararı', () => {
  const temel = { disari: 0, tasma: 0, kendiOverflow: 'visible', kapTuru: 'hidden', erisilir: false };

  it('kaydırılabilen kabın içindeki taşma kusur DEĞİLDİR', () => {
    const k = kirpilmaKarari({ ...temel, erisilir: true, kapTuru: null, tasma: 200 });
    expect(k.kusur).toBe(false);
    expect(k.sebep).toContain('kaydırılarak');
  });

  it('kırpan ata yoksa kusur değildir — taşma belgeye çıkar, birinci ölçü yakalar', () => {
    expect(kirpilmaKarari({ ...temel, kapTuru: null, tasma: 200 }).kusur).toBe(false);
  });

  it('kutu kırpan atanın dışında kalıyorsa KUSURDUR', () => {
    /* Ölçülen hâl: 420px veri paneli `left: -45px`, plaka `overflow: hidden`. */
    const k = kirpilmaKarari({ ...temel, disari: 45 });
    expect(k.kusur).toBe(true);
    expect(k.tur).toBe('kap dışı');
    expect(k.sebep).toContain('45px');
  });

  it('kutu dışı kuralının KENDİ overflow muafiyeti YOKTUR', () => {
    /* Panel `overflow-y: auto` taşır (hesaplanan `overflow-x: auto`) ama
       yine de atasının kenarında kesilir. */
    expect(kirpilmaKarari({ ...temel, disari: 45, kendiOverflow: 'auto' }).kusur).toBe(true);
  });

  it('içerik kutusuna sığmıyorsa ve kap kırpıyorsa KUSURDUR', () => {
    const k = kirpilmaKarari({ ...temel, tasma: 112 });
    expect(k.kusur).toBe(true);
    expect(k.tur).toBe('kutuya sığmıyor');
  });

  it('öğe kendi kırpmasını yönetiyorsa (üç nokta) taşma kusur değildir', () => {
    const k = kirpilmaKarari({ ...temel, tasma: 112, kendiOverflow: 'hidden' });
    expect(k.kusur).toBe(false);
    expect(k.sebep).toContain('kendi kırpmasını');
  });

  it('tolerans altı kusur değil, üstü kusurdur', () => {
    expect(kirpilmaKarari({ ...temel, tasma: KIRPILMA_TOLERANSI }).kusur).toBe(false);
    expect(kirpilmaKarari({ ...temel, tasma: KIRPILMA_TOLERANSI + 1 }).kusur).toBe(true);
    expect(kirpilmaKarari({ ...temel, disari: KIRPILMA_TOLERANSI }).kusur).toBe(false);
    expect(kirpilmaKarari({ ...temel, disari: KIRPILMA_TOLERANSI + 1 }).kusur).toBe(true);
  });

  it('ölçülemeyen değer kusur üretmez', () => {
    expect(kirpilmaKarari({ ...temel, tasma: Number.NaN }).kusur).toBe(false);
    expect(kirpilmaKarari(undefined).kusur).toBe(false);
    expect(kirpilmaKarari({}).kusur).toBe(false);
  });
});

describe('en dıştaki kırpılma', () => {
  it('atası da kusurluysa çocuk düşer', () => {
    const liste = [
      { yol: [3], etiket: 'section' },
      { yol: [3, 0], etiket: 'div' },
      { yol: [3, 0, 1], etiket: 'h1' },
      { yol: [4], etiket: 'aside' },
    ];
    expect(enDistakiKirpilmalar(liste).map((a) => a.etiket)).toEqual(['section', 'aside']);
  });

  it('kardeş kusurlar birbirini elemez', () => {
    const liste = [{ yol: [1, 2] }, { yol: [1, 3] }];
    expect(enDistakiKirpilmalar(liste)).toHaveLength(2);
  });

  it('yolu olmayan aday listeye girmez', () => {
    expect(enDistakiKirpilmalar([{ yol: undefined, etiket: 'div' }])).toEqual([]);
    expect(enDistakiKirpilmalar(undefined)).toEqual([]);
  });
});

/* ── Kalite borcu cırcırı — liste yalnız KÜÇÜLEBİLİR ──────────────────
   Dört diş ayrı ayrı sınanır; biri gevşerse ötekiler kâğıttan kalır. */

const BORC = { kapi: 'tasma', tur: 'kirpilan-icerik', rota: '/sistem/bilesenler', bant: 375, azami: 4 };
const BULGU = { kapi: 'tasma', tur: 'kirpilan-icerik', rota: '/sistem/bilesenler', bant: 375, olcum: 4 };

describe('borç anahtarı', () => {
  it('kapı + tür + rota + bant birlikte kimliktir', () => {
    expect(borcAnahtari(BORC)).toBe(borcAnahtari(BULGU));
    expect(borcAnahtari({ ...BULGU, bant: 768 })).not.toBe(borcAnahtari(BORC));
    expect(borcAnahtari({ ...BULGU, rota: '/omur' })).not.toBe(borcAnahtari(BORC));
  });
});

describe('DİŞ 1 · tavan · DİŞ 2 · alt küme', () => {
  it('tavanın altı ve tam tavan izinlidir, kapıyı yakmaz', () => {
    expect(borcSuzgeci([{ ...BULGU, olcum: 3 }], [BORC]).kapiKapali).toBe(false);
    expect(borcSuzgeci([BULGU], [BORC]).kapiKapali).toBe(false);
    expect(borcSuzgeci([BULGU], [BORC]).kalan).toHaveLength(1);
  });

  it('DİŞ 1 — tavanın bir üstü kapıyı yakar', () => {
    const s = borcSuzgeci([{ ...BULGU, olcum: 5 }], [BORC]);
    expect(s.kapiKapali).toBe(true);
    expect(s.asan).toHaveLength(1);
    expect(s.asan[0].azami).toBe(4);
  });

  it('DİŞ 2 — listede olmayan bulgu kapıyı yakar', () => {
    const s = borcSuzgeci([{ ...BULGU, rota: '/uyum' }], [BORC]);
    expect(s.kapiKapali).toBe(true);
    expect(s.yeni).toHaveLength(1);
  });

  it('DİŞ 2 — aynı rotanın BAŞKA bandı yeni bulgudur', () => {
    expect(borcSuzgeci([{ ...BULGU, bant: 768 }], [BORC]).yeni).toHaveLength(1);
  });

  it('düzelmiş borç kapıyı yakmaz ama SİLİNMESİ gerektiğini söyler', () => {
    const s = borcSuzgeci([], [BORC]);
    expect(s.kapiKapali).toBe(false);
    expect(s.duzelmis).toHaveLength(1);
  });

  it('boş liste her bulguyu yeni sayar', () => {
    expect(borcSuzgeci([BULGU], []).kapiKapali).toBe(true);
    expect(borcSuzgeci([], []).kapiKapali).toBe(false);
  });
});

describe('DİŞ 3 · taban dal — liste yalnız küçülebilir', () => {
  it('aynı liste geçer', () => {
    expect(circirKarari([BORC], [BORC]).kapiKapali).toBe(false);
  });

  it('satır SİLMEK serbesttir — cırcır bu yöne döner', () => {
    expect(circirKarari([], [BORC]).kapiKapali).toBe(false);
  });

  it('tavan DÜŞÜRMEK serbesttir', () => {
    expect(circirKarari([{ ...BORC, azami: 2 }], [BORC]).kapiKapali).toBe(false);
  });

  it('satır EKLEMEK kırmızıdır — yoksa DİŞ 1 ve 2 kâğıttan olurdu', () => {
    const c = circirKarari([BORC, { ...BORC, rota: '/uyum' }], [BORC]);
    expect(c.kapiKapali).toBe(true);
    expect(c.eklenen).toHaveLength(1);
    expect(c.eklenen[0].rota).toBe('/uyum');
  });

  it('tavan YÜKSELTMEK kırmızıdır', () => {
    const c = circirKarari([{ ...BORC, azami: 9 }], [BORC]);
    expect(c.kapiKapali).toBe(true);
    expect(c.yukseltilen[0].tabanAzami).toBe(4);
    expect(c.yukseltilen[0].azami).toBe(9);
  });
});

/* Listenin KENDİSİNE dair iddialar `kalite-borcu-listesi.test.ts`
   içindedir ve bilerek ayrı dosyadadır: liste silindiğinde bu dosyanın
   toplanması kırılıyordu ve cırcırın 36 birim vakası, adsız bir modül
   yükleme hatasına dönüşüyordu (ölçüldü). */

describe('CI ortam değişkeni AYRIŞTIRILIR', () => {
  it('CI olduğunu söyleyen değerler', () => {
    for (const v of ['1', 'true', 'TRUE', 'yes', 'github']) expect(ciMi(v)).toBe(true);
  });

  it('CI OLMADIĞINI söyleyen değerler — `Boolean()` bunları kaçırırdı', () => {
    /* Kabuklar ve araçlar `CI=false` / `CI=0` ihraç eder; dizge olarak
       ikisi de doğrudur. Ayrıştırılmasaydı yerel bir kabuk kendini CI
       sanar ve belgelenmiş `--circir-atla` çıkışı sessizce kaybolurdu. */
    for (const v of ['0', 'false', 'FALSE', 'no', 'off', '', '  ']) expect(ciMi(v)).toBe(false);
  });

  it('tanımsızlık CI değildir', () => {
    expect(ciMi(undefined)).toBe(false);
    expect(ciMi(null)).toBe(false);
  });
});
