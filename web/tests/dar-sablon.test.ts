import { describe, expect, it } from 'vitest';
import { darSablon } from '@/components/kabuk/tablo';

/* ═══════════════════════════════════════════════════════════════════════
   Dar bant ızgara şablonu — SESSİZ ÜÇ KUSURUN KAPISI

   `darSablon` bir `grid-template-columns` değerini dar bant (≤1366px)
   karşılığına çevirir. Üç kural taşır ve üçü de ölçülmüş bir kusurdan
   doğdu; üçü de yanlış olsa hiçbir şey hata VERMEZ, ekran sessizce
   bozulur:

   1. Sabit kolon oransal olmalı. `minmax(0, 170px)` yazmak yetmez —
      ızgara algoritması esnek olmayan izleri büyüme sınırlarına kadar
      doldurur, `fr` izine artakalanı verir; 375px'te 170px'lik kolon
      yine 170px'i kapar ve `fr` kolonuna 1px kalır. Başlık düğmesi o
      izden taşar, sayfa yana kayar (/kanitlar'da 35px ölçüldü).
   2. Esneme katsayısı 1'in altındaysa (`0.7fr`) belirtim artakalanın
      yalnız o kesrini dağıtır; gerisi hiçbir ize gitmez (/dokumanlar:
      12px). Katsayı dar bantta 1'e çıkarılır.
   3. `minmax` TABANI dar bantta da duruyorsa kolon daralmaz ve konu
      sütunu sıfıra ezilir — başlık harf harf alt alta kırılır.

   Ayrıca iki geçersiz-CSS tuzağı vardır: `minmax(0, minmax(…))` ve
   `minmax(0, auto)` gibi üretimler tarayıcıya şablonun TAMAMINI
   attırır, yani ızgara tümden dağılır. Bu yüzden çıktının biçimi de
   sınanır, yalnız niyeti değil.
   ═══════════════════════════════════════════════════════════════════════ */

/** Şablonu üst düzey izlere ayırır (parantez içi bölünmez). */
function izler(sablon: string): string[] {
  const out: string[] = [];
  let derinlik = 0;
  let parca = '';
  for (const ch of sablon.trim()) {
    if (ch === '(') derinlik += 1;
    if (ch === ')') derinlik -= 1;
    if (ch === ' ' && derinlik === 0) {
      if (parca) out.push(parca);
      parca = '';
      continue;
    }
    parca += ch;
  }
  if (parca) out.push(parca);
  return out;
}

describe('darSablon — sabit kolonlar oransal olur', () => {
  it('büyük sabit kolonu yüzde tavanlı bir minmax yapar', () => {
    expect(darSablon('170px')).toBe('minmax(0, min(170px, 58%))');
  });

  it('tavanı, bütçeyi paylaşan iz sayısına böler', () => {
    /* Üç paydaş (92px · 1fr · 130px) → tavan %58/3 ≈ %19. Esnek kolon da
       paydaştır: ona pay ayrılmazsa sabitler bütçeyi tek başına yer ve
       konu sütunu 40px'e düşer (ölçüldü: /kanitlar'da "Bağlı kayıt"
       39px kalıyordu). 26px'lik ok izi paya girmez. */
    expect(darSablon('92px minmax(0, 1fr) 130px 26px'))
      .toBe('minmax(0, min(92px, 19%)) minmax(0, 1fr) minmax(0, min(130px, 19%)) 26px');
  });

  it('küçük izleri (im · ok) OLDUĞU GİBİ bırakır', () => {
    // 18px im ve 26px ok bir glif kadar yer tutar; oransal yapmak yalnız
    // hizayı bozar ve satır başındaki kare kolondan kolona kayar.
    const cikti = izler(darSablon('18px minmax(0, 1fr) 120px 26px'));
    expect(cikti[0]).toBe('18px');
    expect(cikti[3]).toBe('26px');
  });

  it('tavan asla %12\'nin altına inmez', () => {
    // Çok kolonlu bir kütükte pay küçülür ama sıfıra gitmez: tavan bir
    // ÜST sınırdır, kolonun kendi içeriği daha darsa zaten daralır.
    const cikti = darSablon('90px 90px 90px 90px 90px 90px');
    expect(cikti).toContain('12%');
    expect(cikti).not.toMatch(/\b([0-9]|1[01])%/);
  });
});

describe('darSablon — esneme katsayısı', () => {
  it('1\'in altındaki katsayıyı 1\'e çıkarır', () => {
    expect(darSablon('minmax(150px, 0.8fr)')).toBe('minmax(0, 1fr)');
    expect(darSablon('0.7fr')).toBe('1fr');
  });

  it('1 ve üstündeki katsayıya dokunmaz', () => {
    expect(darSablon('1fr')).toBe('1fr');
    expect(darSablon('2fr')).toBe('2fr');
  });

  it('ondalık NOKTASINI piksel değerinde katsayı sanmaz', () => {
    // `1.5px` bir esneme katsayısı değildir; `0?\.\d+fr` kalıbı yalnız
    // `fr` ile biten ondalığı yakalamalı.
    expect(darSablon('1.5px')).toBe('1.5px');
  });
});

describe('darSablon — minmax tabanı', () => {
  it('tabanı sıfırlar ki kolon dar bantta daralabilsin', () => {
    expect(darSablon('minmax(220px, 2fr)')).toBe('minmax(0, 2fr)');
  });

  it('üst sınırı piksel olan minmax\'i de tavanlar', () => {
    expect(darSablon('minmax(0, 236px)')).toBe('minmax(0, min(236px, 58%))');
  });
});

describe('darSablon — geçersiz CSS üretmez', () => {
  it('minmax\'i minmax içine sarmaz', () => {
    for (const s of ['minmax(150px, 0.8fr)', 'minmax(0, 236px)', 'minmax(96px, 1fr)']) {
      expect(darSablon(s)).not.toMatch(/minmax\([^)]*minmax\(/);
    }
  });

  it('auto taşıyan izi olduğu gibi bırakır', () => {
    // `minmax(0, auto)` geçerli olsa da niyeti değiştirir; `auto`
    // kolonlar içeriğine göre zaten daralır.
    expect(darSablon('auto')).toBe('auto');
    expect(darSablon('minmax(auto, 1fr)')).toBe('minmax(auto, 1fr)');
  });

  it('her iz dengeli parantezle biter', () => {
    const cikti = darSablon('18px minmax(0, 1fr) 132px 170px minmax(150px, 0.8fr) 126px');
    for (const iz of izler(cikti)) {
      const ac = (iz.match(/\(/g) ?? []).length;
      const kapa = (iz.match(/\)/g) ?? []).length;
      expect(ac, iz).toBe(kapa);
    }
  });

  it('iz SAYISINI korur — kolon kayması matrisi yalanlatır', () => {
    // Başlık ve satır aynı şablonu okur; iz sayısı değişirse başlık bir
    // kolon kayar ve "Sahip" yazan yerde tarih görünür.
    const kaynak = '18px minmax(0, 1fr) 132px 170px minmax(150px, 0.8fr) 126px';
    expect(izler(darSablon(kaynak))).toHaveLength(izler(kaynak).length);
  });
});

describe('darSablon — ölçülen şablonlar', () => {
  /* Ürünün gerçek beş dar şablonu. Toplam sabit genişlik telefonun
     ≈335px'lik iç alanına sığmalı: kapaklar (`min(...)`) %58'i aşamaz,
     küçük izler ve aralıklar da bütçeye girer. */
  const GERCEK = [
    '92px minmax(0, 1fr) 130px 26px',
    'minmax(0, 1fr) 140px 68px 26px',
    '104px minmax(0, 1fr) 236px 26px',
    '22px minmax(0, 1fr) 150px 150px 26px',
    '22px minmax(0, 1fr) 160px 140px 26px',
  ];

  it('yüzde tavanlarının toplamı bütçeyi aşmaz', () => {
    for (const s of GERCEK) {
      const yuzdeler = [...darSablon(s).matchAll(/(\d+)%/g)].map((m) => Number(m[1]));
      const toplam = yuzdeler.reduce((a, y) => a + y, 0);
      expect(toplam, s).toBeLessThanOrEqual(58);
    }
  });

  it('her şablonda esnek kolon KALIR — hepsi tavanlanırsa satır boş yer bırakır', () => {
    for (const s of GERCEK) {
      expect(darSablon(s), s).toMatch(/(?<![\d.])1fr/);
    }
  });
});
