import { describe, expect, it } from 'vitest';
import {
  KIRPILMA_TOLERANSI, altinDosyaAdi, axeCiddiMi, axeKimlikBicimi, axeOzeti, borcAnahtari,
  borcSuzgeci, ciMi, circirKarari, enDistakiKirpilmalar, esikAltindakiler, gorselFark,
  ayristirilanHedefler, kirpilmaKarari, rotaAdi, tasmaHedefi, yuzPuan,
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

  it('öğe kırpmayı GÖSTEREREK yönetiyorsa (üç nokta) kusur değildir', () => {
    const k = kirpilmaKarari({
      ...temel, tasma: 112, kendiOverflow: 'hidden', metinTasmasi: 'ellipsis',
    });
    expect(k.kusur).toBe(false);
    expect(k.sebep).toContain('GÖSTEREREK');
  });

  it('satır kırpma (line-clamp) da görünür bir işarettir', () => {
    expect(kirpilmaKarari({
      ...temel, tasma: 112, kendiOverflow: 'hidden', satirKirpma: 2,
    }).kusur).toBe(false);
  });

  it('İŞARETSİZ kendi kırpması KUSURDUR — sessizce kesip hiç söylemez', () => {
    /* `overflow: hidden` + `white-space: nowrap`, üç nokta yok. Metin
       düğümleri ağaçta gezilmediği için bu kayıp başka hiçbir ölçüde
       görünmezdi; muafiyeti "kendi yönetiyor" diye vermek onu aklardı. */
    const k = kirpilmaKarari({
      ...temel, tasma: 112, kendiOverflow: 'hidden', metinTasmasi: 'clip',
    });
    expect(k.kusur).toBe(true);
    expect(k.tur).toBe('işaretsiz kırpma');
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

/* ═══════════════════════════════════════════════════════════════════════
   İKİ KAPININ ORTAK ANAHTAR SÖZLEŞMESİ

   Bu blok bilerek TEK bir iddiayı iki kapıya birden sorar: borç anahtarı
   rota + bant + kural/tür YANINDA kararlı bir HEDEF KİMLİĞİ taşımalı.
   Taşımadığında — ve iki kapıda da taşımıyordu — bloklayıcı kapının
   içinde bir bypass açılır: izinli hedef kaldırılır, aynı rotada aynı
   kuralla başka bir hedef gelir, sayı tavanı aşmaz, ihlal "mevcut borç"
   sayılır.

   Kapılar hedefi ayrı üretir (`tasmaHedefi` etiket+kutu eni,
   `axeKimlikBicimi` yapısal yol + sıra) ama sözleşme tektir. Bir sonraki ayrışma incelemede
   değil BURADA çıkar.
   ═══════════════════════════════════════════════════════════════════════ */

describe('borç anahtarı · iki kapının ortak değişmezi', () => {
  const ORTAK = { rota: '/saklama', bant: 375 };

  /* Her kapı için: aynı rota + bant + kural, İKİ FARKLI hedef. */
  const KAPILAR = [
    {
      ad: 'taşma',
      a: { ...ORTAK, kapi: 'tasma', tur: 'kirpilan-icerik', hedef: tasmaHedefi({ etiket: 'span.kolonbas', genislik: 43 }) },
      b: { ...ORTAK, kapi: 'tasma', tur: 'kirpilan-icerik', hedef: tasmaHedefi({ etiket: 'span.kimlik', genislik: 150 }) },
    },
    {
      ad: 'axe',
      a: { ...ORTAK, kapi: 'axe', tur: 'scrollable-region-focusable', hedef: axeKimlikBicimi({ yol: 'section > div.k', sira: 1 }) },
      b: { ...ORTAK, kapi: 'axe', tur: 'scrollable-region-focusable', hedef: axeKimlikBicimi({ yol: 'section > div.k', sira: 2 }) },
    },
  ];

  for (const k of KAPILAR) {
    it(`${k.ad} · aynı rota + bant + kural, FARKLI hedef → FARKLI anahtar`, () => {
      expect(borcAnahtari(k.a)).not.toBe(borcAnahtari(k.b));
    });

    it(`${k.ad} · aynı hedef → AYNI anahtar (kimlik kararlıdır)`, () => {
      expect(borcAnahtari(k.a)).toBe(borcAnahtari({ ...k.a }));
    });

    it(`${k.ad} · hedef anahtarda GERÇEKTEN var — düşerse bypass geri açılır`, () => {
      const { hedef, ...hedefsiz } = k.a;
      expect(hedef.length).toBeGreaterThan(0);
      expect(borcAnahtari(hedefsiz)).not.toBe(borcAnahtari(k.a));
    });

    it(`${k.ad} · hedef DEĞİŞTİĞİNDE bulgu "mevcut borç" sayılmaz`, () => {
      /* Bypass'ın kendisi: izinli hedef listede, gelen bulgu başka hedef. */
      const s = borcSuzgeci([{ ...k.b, olcum: 1 }], [{ ...k.a, azami: 9 }]);
      expect(s.kapiKapali).toBe(true);
      expect(s.yeni).toHaveLength(1);
      /* Ve bunun bir YER DEĞİŞTİRME olduğu söylenir — "yeni kusur"dan ayrı iş. */
      expect(s.yeni[0].hedefDegisti).toEqual([k.a.hedef]);
    });
  }
});

describe('taşma hedef kimliği', () => {
  it('etiket + kutu eni birlikte kimliktir', () => {
    expect(tasmaHedefi({ etiket: 'span.kolonbas', genislik: 43 })).toBe('span.kolonbas@43px');
    expect(tasmaHedefi({ etiket: 'span.kolonbas', genislik: 43 }))
      .not.toBe(tasmaHedefi({ etiket: 'span.kolonbas', genislik: 90 }));
  });

  it('ölçülemeyen en sessizce 0 olmaz', () => {
    expect(tasmaHedefi({ etiket: 'div' })).toBe('div@?px');
    expect(tasmaHedefi(undefined)).toBe('‹etiketsiz›@?px');
  });
});

describe('anahtar şeması geçişi · kaldıraç DEĞİL, kanıt', () => {
  const ESKI = { kapi: 'tasma', tur: 'kirpilan-icerik', rota: '/aktivite', bant: 375, azami: 2 };
  const yeni = (hedef: string, azami = 1) => ({ ...ESKI, hedef, azami });

  it('hedefsiz taban satırı, hedefli satırlarla DAHA KESİN yazılabilir', () => {
    const c = circirKarari([yeni('span.kolonbas@43px'), yeni('span.kimlik@150px')], [ESKI]);
    expect(c.kapiKapali).toBe(false);
    expect(c.gecis).toBe(2);
  });

  it('geçiş SINIRSIZ değil: eski tavandan çok satır konamaz', () => {
    /* Yoksa "daha kesin yazmak", borcu büyütmenin yolu olurdu. */
    const c = circirKarari(
      [yeni('a@1px'), yeni('b@2px'), yeni('c@3px')],
      [ESKI],
    );
    expect(c.kapiKapali).toBe(true);
    expect(c.eklenen).toHaveLength(3);
    expect(c.eklenen[0].gecisAsimi).toBe(2);
  });

  it('geçişte tavan YÜKSELTİLEMEZ', () => {
    const c = circirKarari([yeni('a@1px', 9)], [ESKI]);
    expect(c.kapiKapali).toBe(true);
    expect(c.yukseltilen[0].tabanAzami).toBe(2);
  });

  it('taban HEDEFLİ satır taşıyorsa geçiş YOLU KAPALIDIR — kalıcı olarak', () => {
    /* Bu değişiklik main'e girdikten sonra her taban satırı hedeflidir;
       hiçbir PR geçişi yeniden açamaz, çünkü koşul TABANIN şeklidir. */
    const tabanHedefli = { ...ESKI, hedef: 'span.kolonbas@43px', azami: 1 };
    const c = circirKarari([yeni('span.YENI@43px')], [tabanHedefli]);
    expect(c.kapiKapali).toBe(true);
    expect(c.eklenen).toHaveLength(1);
    expect(c.gecis).toBe(0);
  });

  it('geçiş BAŞKA bir rotaya sızmaz', () => {
    const c = circirKarari([{ ...yeni('a@1px'), rota: '/uyum' }], [ESKI]);
    expect(c.kapiKapali).toBe(true);
    expect(c.gecis).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   axe HEDEF KİMLİĞİ · YAPISAL YOL + SIRA

   Kimlik axe'ın seçicisinden türetilmez ve bu ÖLÇÜMLE kararlaştırıldı:
   /saklama'ya tek bir kayıt eklenince axe hedefi ".ab-vt-sar"dan
   "section > .ab-vt-sar"a, eşleşme sayısı 1'den 2'ye çıktı. İkisine de
   bağlanan bir kimlik, veri değişince satırı "yeni" gösterir ve DİŞ 3
   yeniden yazmayı yasaklar — düzeltmeyi yapan kişi kilitlenir.
   ═══════════════════════════════════════════════════════════════════════ */

describe('axe hedef kimliği · yapısal', () => {
  it('sıra HER ZAMAN yazılır — tek düğümde de', () => {
    /* Yalnız çakışınca eklenseydi, ikinci düğüm ortaya çıktığında
       BİRİNCİNİN kimliği "yol" → "yol#1" diye değişirdi. */
    expect(axeKimlikBicimi({ yol: 'section > div.ab-vt-sar', sira: 1 }))
      .toBe('section > div.ab-vt-sar#1');
  });

  it('aynı yol, farklı sıra → FARKLI kimlik', () => {
    expect(axeKimlikBicimi({ yol: 'a > b', sira: 1 }))
      .not.toBe(axeKimlikBicimi({ yol: 'a > b', sira: 2 }));
  });

  it('bir düğüm eklenince ÖTEKİNİN kimliği kaymaz', () => {
    const once = [{ yol: 'a > b', sira: 1 }];
    const sonra = [{ yol: 'a > b', sira: 1 }, { yol: 'a > b', sira: 2 }];
    expect(axeKimlikBicimi(sonra[0])).toBe(axeKimlikBicimi(once[0]));
  });

  it('ölçülemeyen sıra sessizce 1 olmaz', () => {
    expect(axeKimlikBicimi({ yol: 'a' })).toBe('a#?');
    expect(axeKimlikBicimi(undefined)).toBe('‹yolsuz›#?');
  });

  it('aynı yolu paylaşan düğümler AYRIŞTIRILDI diye raporlanır', () => {
    const a = ayristirilanHedefler([
      { yol: 'section > div.k', sira: 1 },
      { yol: 'section > div.k', sira: 2 },
      { yol: 'main > div.t', sira: 1 },
    ]);
    expect(a).toHaveLength(1);
    expect(a[0].norm).toBe('section > div.k');
    expect(a[0].hedefler).toEqual(['section > div.k#1', 'section > div.k#2']);
  });

  it('ayrıştırma yoksa rapor boştur', () => {
    expect(ayristirilanHedefler([{ yol: 'a', sira: 1 }])).toEqual([]);
  });
});
