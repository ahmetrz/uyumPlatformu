import { describe, expect, it } from 'vitest';
import {
  CERCEVE, IL_MERKEZI, TUVAL,
  baslikMetni, cercevede, cerceveUyarisi, ilAyikla, kaynakYazisi, kilavuz,
  koordinatGecerli, koordinatYazisi, olcu, uyumDurumu, yaricap, yerlesimKur,
  yerlestir, yiginKaydir,
} from '@/app/(tam)/harita/mantik';
import type { PortfoySatiri } from '@/app/(tam)/portfoy/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   A4 · Harita saf kuralları

   Ekranın tek ahlaki kuralı: UYDURMA KONUM YOK.
     · koordinat varsa kesin işaret,
     · yoksa ve il tanınıyorsa YAKLAŞIK işaret (ve öyle yazar),
     · ikisi de yoksa santral haritaya KONMAZ, listede kalır.
   Bu üç hâl testte ayrı ayrı sabitlenir; biri diğerine karışırsa saha
   ekibi yanlış noktaya gider.
   ═══════════════════════════════════════════════════════════════════════ */

function santral(ek: Partial<PortfoySatiri> & { id: string }): PortfoySatiri {
  return {
    kod: ek.id.toUpperCase(), ad: ek.id,
    tipKod: 'JES', tipAdi: 'Jeotermal', tuzelKisi: 'Zorlu Jeotermal',
    konum: null, gucMw: 100, gorselAnahtari: null, kritiklik: null,
    enlem: null, boylam: null,
    konumKaynagi: null, konumDogrulandi: false,
    uyumYuzde: 80, bilinmeyenOran: 0, acikBulgu: 0, acikRisk: 0,
    ...ek,
  };
}

describe('İl ayıklama', () => {
  it('serbest metinden tanınan ili çıkarır; "Denizli/Aydın" ilkini alır', () => {
    expect(ilAyikla('Denizli')).toBe('Denizli');
    expect(ilAyikla('Denizli/Aydın')).toBe('Denizli');
    expect(ilAyikla(' Osmaniye ')).toBe('Osmaniye');
  });

  it('tanınmayan il null döner — haritanın ortasına konmaz', () => {
    expect(ilAyikla('Ankara')).toBeNull();   // listede yok
    expect(ilAyikla('')).toBeNull();
    expect(ilAyikla(null)).toBeNull();
  });

  it('il merkezi listesi Türkiye çerçevesinin içindedir', () => {
    for (const [il, m] of Object.entries(IL_MERKEZI)) {
      expect(cercevede(m.enlem, m.boylam), il).toBe(true);
    }
  });
});

describe('Projeksiyon', () => {
  it('çerçeve köşeleri tuvalin kenar payına oturur', () => {
    const sk = yerlestir(CERCEVE.kuzey, CERCEVE.batı);
    expect(sk.x).toBeCloseTo(TUVAL.kenar, 5);
    expect(sk.y).toBeCloseTo(TUVAL.kenar, 5);
    const gd = yerlestir(CERCEVE.güney, CERCEVE.doğu);
    expect(gd.x).toBeCloseTo(TUVAL.en - TUVAL.kenar, 5);
    expect(gd.y).toBeCloseTo(TUVAL.boy - TUVAL.kenar, 5);
  });

  it('enlem yukarı artar ama SVG y aşağı artar', () => {
    const kuzey = yerlestir(41, 30);
    const guney = yerlestir(37, 30);
    expect(kuzey.y).toBeLessThan(guney.y);
  });

  it('doğuya gidince x büyür', () => {
    expect(yerlestir(39, 28).x).toBeLessThan(yerlestir(39, 40).x);
  });

  it('çerçeve dışı koordinat çerçevede sayılmaz', () => {
    expect(cercevede(39, 30)).toBe(true);
    expect(cercevede(52, 13)).toBe(false);  // Berlin
    expect(cercevede(39, 60)).toBe(false);
  });

  it('kılavuz tam dereceli meridyen ve paralel üretir', () => {
    const k = kilavuz();
    expect(k.dikey.every((d) => d.boylam % 5 === 0)).toBe(true);
    expect(k.yatay.every((y) => y.enlem % 2 === 0)).toBe(true);
    expect(k.dikey.length).toBeGreaterThan(2);
    expect(k.yatay.length).toBeGreaterThan(2);
  });
});

describe('Yerleşim — üç hâl karışmaz', () => {
  const liste = [
    santral({ id: 'kesin', konum: 'Denizli', enlem: 37.9, boylam: 29.1 }),
    santral({ id: 'yaklasik', konum: 'Osmaniye' }),
    santral({ id: 'bilinmeyen', konum: 'Ankara' }),
    santral({ id: 'konumsuz', konum: null }),
  ];

  it('koordinatı olan yerleşir, ili olan YAKLAŞIK, ikisi de yoksa haritada YOK [HRT-KNM-001]', () => {
    const y = yerlesimKur(liste);
    expect(y.isaretler.map((i) => i.id).sort()).toEqual(['kesin', 'yaklasik']);
    expect(y.yerlestirilemeyen.map((s) => s.id).sort()).toEqual(['bilinmeyen', 'konumsuz']);
    /* Fikstürdeki koordinat DOĞRULANMAMIŞ (varsayılan): sayım da öyle
       diyor. Eskiden tek bir "kesin" kovası vardı ve doğrulanmamış nokta
       oraya düşüyordu — P3-8'de kapatılan yalan buydu. */
    expect(y.dogrulanmisSayisi).toBe(0);
    expect(y.dogrulanmamisSayisi).toBe(1);
    expect(y.yaklasikSayisi).toBe(1);
  });

  it('yaklaşık işaret il merkezine oturur ve kaynağını söyler', () => {
    const y = yerlesimKur([liste[1]]);
    const i = y.isaretler[0];
    expect(i.kaynak).toBe('il');
    expect(i.enlem).toBe(IL_MERKEZI.Osmaniye.enlem);
    expect(kaynakYazisi(i)).toBe('Osmaniye il merkezi · konum girilmedi');
  });

  it('koordinatlı işaret noktasını yazar, il merkezini DEĞİL', () => {
    const y = yerlesimKur([liste[0]]);
    const i = y.isaretler[0];
    expect(i.kaynak).toBe('dogrulanmamis');
    expect(i.enlem).not.toBe(IL_MERKEZI.Denizli.enlem);
    // Doğrulanmamış nokta KENDİNİ SÖYLER; sessiz kalmak onu doğrulanmış
    // gibi göstermekle aynı kapıya çıkardı.
    expect(kaynakYazisi(i)).toContain(koordinatYazisi(37.9, 29.1));
    expect(kaynakYazisi(i)).toMatch(/DOĞRULANMADI/);
  });

  it('DOĞRULANMIŞ işaret damgasız yazar ve kaynağını künyeye koyar', () => {
    const y = yerlesimKur([santral({
      id: 'dogru', konum: 'Denizli', enlem: 37.9, boylam: 29.1,
      konumKaynagi: 'saha GPS', konumDogrulandi: true,
    })]);
    const i = y.isaretler[0];
    expect(i.kaynak).toBe('dogrulanmis');
    expect(kaynakYazisi(i)).toBe(`${koordinatYazisi(37.9, 29.1)} · saha GPS`);
    expect(kaynakYazisi(i)).not.toMatch(/DOĞRULANMADI/);
    expect(y.dogrulanmisSayisi).toBe(1);
  });

  it('çerçeve dışı KESİN koordinat ile merkezine düşer, zorlanmaz', () => {
    // Enlem/boylam ters girilmiş bir kayıt: 29.1 K, 37.9 D → çerçeve dışı.
    const y = yerlesimKur([santral({ id: 'ters', konum: 'Denizli', enlem: 29.1, boylam: 37.9 })]);
    expect(y.isaretler[0].kaynak).toBe('il');
    expect(y.dogrulanmisSayisi).toBe(0);
    expect(y.dogrulanmamisSayisi).toBe(0);
  });

  it('ili de tanınmayan çerçeve dışı kayıt haritaya hiç girmez', () => {
    const y = yerlesimKur([santral({ id: 'uzak', konum: 'Berlin', enlem: 52.5, boylam: 13.4 })]);
    expect(y.isaretler).toHaveLength(0);
    expect(y.yerlestirilemeyen.map((s) => s.id)).toEqual(['uzak']);
  });
});

describe('İşaret biçimi', () => {
  it('ölçülmemiş uyum YEŞİL değil bilinmeyendir', () => {
    expect(uyumDurumu(null)).toBe('unk');
    expect(uyumDurumu(90)).toBe('ok');
    expect(uyumDurumu(85)).toBe('ok');
    expect(uyumDurumu(84)).toBe('md');
    expect(uyumDurumu(60)).toBe('md');
    expect(uyumDurumu(59)).toBe('bd');
    expect(uyumDurumu(0)).toBe('bd');
  });

  it('yarıçap güçle büyür ama tavanı vardır; güçsüz kayıt en küçük halka', () => {
    expect(yaricap(null)).toBe(4);
    expect(yaricap(0)).toBe(4);
    expect(yaricap(16)).toBeCloseTo(7.6, 1);
    expect(yaricap(165)).toBeLessThanOrEqual(16);
    expect(yaricap(100000)).toBe(16);
    expect(yaricap(165)).toBeGreaterThan(yaricap(15));
  });

  it('aynı noktaya düşen işaretler dağıtılır, tek başına duran KAYMAZ', () => {
    const y = yerlesimKur([
      santral({ id: 'a', konum: 'Osmaniye' }),
      santral({ id: 'b', konum: 'Osmaniye' }),
      santral({ id: 'c', konum: 'Rize' }),
    ]);
    const kaydirilmis = yiginKaydir(y.isaretler);
    const a = kaydirilmis.find((i) => i.id === 'a')!;
    const b = kaydirilmis.find((i) => i.id === 'b')!;
    const c0 = y.isaretler.find((i) => i.id === 'c')!;
    const c1 = kaydirilmis.find((i) => i.id === 'c')!;
    expect(a.x === b.x && a.y === b.y).toBe(false);
    expect(c1.x).toBe(c0.x);
    expect(c1.y).toBe(c0.y);
  });
});

describe('Ölçü ve başlık', () => {
  it('başlık en kötü olguyu önce söyler', () => {
    const y1 = yerlesimKur([santral({ id: 'x', konum: 'Ankara' })]);
    expect(baslikMetni(olcu(y1)).ad).toBe('haritaya yerleştirilemedi');

    const y2 = yerlesimKur([santral({ id: 'y', konum: 'Rize' })]);
    expect(baslikMetni(olcu(y2)).ad).toBe('il merkezine yaklaştırıldı');

    /* DOĞRULANMAMIŞ nokta, il merkezine yaklaştırılmış noktadan DAHA
       yanıltıcıdır: ikincisi zaten "yaklaşık" diyor, birincisi kesin
       görünüyor. Bu yüzden başlıkta önce o söylenir. */
    const y3 = yerlesimKur([
      santral({ id: 'k', konum: 'Denizli', enlem: 37.9, boylam: 29.1 }),
      santral({ id: 'y', konum: 'Rize' }),
    ]);
    expect(baslikMetni(olcu(y3)).ad).toBe('koordinatı doğrulanmadı');

    const dogru = (id: string, konum: string, enlem: number, boylam: number) =>
      santral({ id, konum, enlem, boylam, konumKaynagi: 'saha GPS', konumDogrulandi: true });

    const y3b = yerlesimKur([dogru('k', 'Denizli', 37.9, 29.1), santral({ id: 'y', konum: 'Rize' })]);
    expect(baslikMetni(olcu(y3b)).ad).toBe('konumu girilmemiş');

    const y4 = yerlesimKur([dogru('k', 'Denizli', 37.9, 29.1)]);
    expect(baslikMetni(olcu(y4)))
      .toMatchObject({ ad: 'doğrulanmış konumuyla haritada', durum: 'ok' });

    expect(baslikMetni(olcu(yerlesimKur([]))).ad).toBe('Kapsamınızda santral yok');
  });

  it('ölçü ölçülmemiş uyumu ayrı sayar', () => {
    const y = yerlesimKur([
      santral({ id: 'a', konum: 'Rize', uyumYuzde: null }),
      santral({ id: 'b', konum: 'Kars', uyumYuzde: 90 }),
    ]);
    expect(olcu(y)).toMatchObject({
      toplam: 2, yaklasik: 2, dogrulanmis: 0, dogrulanmamis: 0, olculmeyenUyum: 1,
    });
  });
});

describe('Koordinat doğrulaması', () => {
  it('aralık dışı ve sayı olmayan reddedilir', () => {
    expect(koordinatGecerli(37.9, 29.1)).toBe(true);
    expect(koordinatGecerli(-90, -180)).toBe(true);
    expect(koordinatGecerli(91, 29)).toBe(false);
    expect(koordinatGecerli(37, 181)).toBe(false);
    expect(koordinatGecerli(Number.NaN, 29)).toBe(false);
  });

  it('geçerli ama Türkiye dışı koordinat UYARIR, engellemez', () => {
    expect(cerceveUyarisi(37.9, 29.1)).toBeNull();
    const u = cerceveUyarisi(52.5, 13.4);
    expect(u).toMatch(/çerçevesinin dışında/);
    expect(u).toMatch(/sırasını karıştırmış/);
  });

  it('koordinat yazısı saha çözünürlüğünde (4 ondalık)', () => {
    expect(koordinatYazisi(37.8, 29.09)).toBe('37.8000° K · 29.0900° D');
  });
});
