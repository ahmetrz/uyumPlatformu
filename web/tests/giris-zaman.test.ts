import { describe, expect, it } from 'vitest';
import {
  ARAYUZ_BANDI, BAGLAR, DUNYA, EKRAN, IRIS_BANDI, KARELER, KARE_ORANI, bitisOlcegi, dunyaKur, ekranYerlestir,
  hizEgrisi, kaydirmaKatsayisi, kaydirmaTamam, poz,
} from '../components/giris/zaman';

const BANTLAR: [number, number][] = [[375, 780], [768, 1024], [1440, 900], [1366, 768], [2560, 1080]];
const ADIM = 800;

describe('Kaydırma ile jeotermal giriş', () => {
  it('ileri ve geri aynı kaydırma noktasında aynı pozu verir [SIS-SNG-001]', () => {
    const ilerleme = [0, .1, .2, .4, .46, .55, .64, .72, .9, 1];
    const ileri = ilerleme.map(p => poz(p, 1440, 900));
    const geri = [...ilerleme].reverse().map(p => poz(p, 1440, 900)).reverse();
    expect(geri).toEqual(ileri);
    expect(poz(-1, 1440, 900)).toEqual(poz(0, 1440, 900)); expect(poz(2, 1440, 900)).toEqual(poz(1, 1440, 900));
  });

  it('dört kareyi tek dünya koordinatına diker: ortak hedef komşu karelerde aynı noktadadır [SIS-SNG-001]', () => {
    const d = dunyaKur();
    expect(d.olcek[0]).toBe(1);
    for (let i = 1; i < d.olcek.length; i++) expect(d.olcek[i]).toBeLessThan(d.olcek[i - 1]);
    BAGLAR.forEach((bag, j) => {
      const dis = { x: d.koken[j].x + d.olcek[j] * (bag.dis.sol + bag.dis.sag) / 2, y: d.koken[j].y + d.olcek[j] * ((bag.dis.ust + bag.dis.alt) / 2) * KARE_ORANI };
      const ic = { x: d.koken[j + 1].x + d.olcek[j + 1] * (bag.ic.sol + bag.ic.sag) / 2, y: d.koken[j + 1].y + d.olcek[j + 1] * ((bag.ic.ust + bag.ic.alt) / 2) * KARE_ORANI };
      expect(ic.x).toBeCloseTo(dis.x, 9); expect(ic.y).toBeCloseTo(dis.y, 9);
      expect(d.odaklar[j + 1]).toEqual(dis);
      // Çözünme, iç kare hedef sapmasına rağmen görüntü alanını KAPLADIKTAN sonra başlar.
      expect(d.bantlar[j][0]).toBeGreaterThan(1.08); expect(d.bantlar[j][1]).toBeGreaterThan(d.bantlar[j][0]);
    });
    // Bitiş cihazdan bağımsızdır: son çözünme → arayüz bandı → iris.
    expect(bitisOlcegi()).toBeCloseTo(d.bantlar[2][1] * ARAYUZ_BANDI * IRIS_BANDI);
  });

  it('her bantta en fazla iki komşu kare görünür, toplam opaklık 1 ve görünen her kare görüntü alanını kaplar [SIS-SNG-001]', () => {
    for (const [w, h] of BANTLAR) {
      let sonBaskin = 0;
      const tekBasina = new Set<number>();
      for (let i = 0; i <= ADIM; i++) {
        const s = poz(i / ADIM, w, h);
        const gorunen = KARELER.map((ad, k) => ({ k, yer: s.kareler[ad] })).filter(x => x.yer.opaklik > 0.0005);
        expect(KARELER.reduce((a, ad) => a + s.kareler[ad].opaklik, 0)).toBeCloseTo(1, 7);
        expect(gorunen.length).toBeLessThanOrEqual(2);
        if (gorunen.length === 2) expect(gorunen[1].k - gorunen[0].k).toBe(1);
        if (gorunen.length === 1) tekBasina.add(gorunen[0].k);
        for (const { yer } of gorunen) {
          // Boşluk yok: kare görüntü alanının dört kenarını da aşar (yarım piksel tolerans).
          expect(yer.x).toBeLessThanOrEqual(.5); expect(yer.y).toBeLessThanOrEqual(.5);
          expect(yer.x + yer.en).toBeGreaterThanOrEqual(w - .5); expect(yer.y + yer.boy).toBeGreaterThanOrEqual(h - .5);
        }
        expect(s.asama).toBeGreaterThanOrEqual(sonBaskin); sonBaskin = s.asama;
      }
      // Her kare bir süre TEK BAŞINA kalır; üç çözünme birbirine yapışmaz.
      expect([...tekBasina].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it('çözünme boyunca ortak hedef iki karede aynı piksel dikdörtgenindedir: tek kamera, slayt değil [SIS-SNG-001]', () => {
    for (const [w, h] of BANTLAR) {
      let olculen = 0;
      for (let i = 0; i <= ADIM; i++) {
        const s = poz(i / ADIM, w, h);
        BAGLAR.forEach((bag, j) => {
          const dis = s.kareler[KARELER[j]], ic = s.kareler[KARELER[j + 1]];
          if (dis.opaklik <= 0.0005 || ic.opaklik <= 0.0005) return;
          const disMerkez = { x: dis.x + dis.en * (bag.dis.sol + bag.dis.sag) / 2, y: dis.y + dis.boy * (bag.dis.ust + bag.dis.alt) / 2 };
          const icMerkez = { x: ic.x + ic.en * (bag.ic.sol + bag.ic.sag) / 2, y: ic.y + ic.boy * (bag.ic.ust + bag.ic.alt) / 2 };
          expect(Math.abs(disMerkez.x - icMerkez.x)).toBeLessThan(.01);
          expect(Math.abs(disMerkez.y - icMerkez.y)).toBeLessThan(.01);
          // Genişlikler geometrik ortalamayla eşlenir: iki karede hedef aynı büyüklük sınıfındadır.
          const oran = (dis.en * (bag.dis.sag - bag.dis.sol)) / (ic.en * (bag.ic.sag - bag.ic.sol));
          expect(oran).toBeGreaterThan(.85); expect(oran).toBeLessThan(1.2);
          olculen++;
        });
      }
      expect(olculen).toBeGreaterThan(30);
    }
  });

  it('kamera yalnız ileri gider; yavaş başlar, ortada hızlanır, sonda yavaşlar [SIS-SNG-001]', () => {
    let once = poz(0, 1440, 900);
    expect(once.zoom).toBe(1);
    for (let i = 1; i <= ADIM; i++) {
      const s = poz(i / ADIM, 1440, 900);
      expect(s.zoom).toBeGreaterThanOrEqual(once.zoom);
      for (const ad of KARELER) expect(s.kareler[ad].en).toBeGreaterThanOrEqual(once.kareler[ad].en);
      // Logaritmik yolda ani sıçrama yok.
      expect(Math.log(s.zoom / once.zoom)).toBeLessThan(.012);
      once = s;
    }
    const orta = hizEgrisi(.55) - hizEgrisi(.45);
    expect(orta).toBeGreaterThan(2 * (hizEgrisi(.1) - hizEgrisi(0)));
    expect(orta).toBeGreaterThan(2 * (hizEgrisi(1) - hizEgrisi(.9)));
    expect(hizEgrisi(.05)).toBeGreaterThan(0); // başlangıç yavaş ama ölü değil
    // Kaydırma mesafesi önceki sürümden (5,6 · 6 · 6,6 ekran) belirgin uzundur.
    expect(kaydirmaKatsayisi(375)).toBeGreaterThanOrEqual(7); expect(kaydirmaKatsayisi(900)).toBeGreaterThanOrEqual(8); expect(kaydirmaKatsayisi(1440)).toBeGreaterThanOrEqual(9);
  });

  it('canlı arayüz yalnız son kare tek başınayken belirir ve ekran yüzeyinden sıçramasız devralır [SIS-SNG-001]', () => {
    expect(kaydirmaTamam(2995, 2995.2)).toBe(true);
    expect(kaydirmaTamam(2993, 2995.2)).toBe(false);
    expect(kaydirmaTamam(0, 0)).toBe(false);
    for (const [w, h] of BANTLAR) {
      const yer = ekranYerlestir({ sol: -w, sag: 2 * w, ust: -h, alt: 2 * h }, w, h);
      expect(yer).toEqual({ k: 1, x: 0, y: 0, sol: 0, sag: 0, ust: 0, boy: h });
      const kucuk = ekranYerlestir({ sol: w / 4, sag: w * .75, ust: h / 4, alt: h * .75 }, w, h);
      expect(kucuk.k).toBe(.5); expect(kucuk.x).toBe(w / 4); expect(kucuk.y).toBe(h / 4);

      let onceK = 0, onceArayuz = 0;
      for (let i = 0; i <= ADIM; i++) {
        const s = poz(i / ADIM, w, h);
        if (s.arayuz > 0) {
          expect(s.kareler.ekran.opaklik).toBe(1); // üçüncü katman yok
          expect(s.metin).toBe(0);
        }
        expect(s.arayuz).toBeGreaterThanOrEqual(onceArayuz); onceArayuz = s.arayuz;
        if (s.iris > 0) expect(s.arayuz).toBe(1); // iris ancak arayüz tamamen görününce açılır
        const e = ekranYerlestir(s.ekran, w, h);
        expect(e.k).toBeGreaterThanOrEqual(onceK - 1e-9); onceK = e.k;
        // Ekran yüzeyi her zaman görüntü alanı merkezine yakın: teslimde yatay kayma yok.
        if (s.arayuz > 0) expect(Math.abs((s.ekran.sol + s.ekran.sag) / 2 - w / 2)).toBeLessThan(1);
      }
      const son = poz(1, w, h), e = ekranYerlestir(son.ekran, w, h);
      expect(son.arayuz).toBe(1); expect(son.iris).toBe(1);
      expect(e).toEqual({ k: 1, x: 0, y: 0, sol: 0, sag: 0, ust: 0, boy: h });
      // Fiziksel ekranın ölçülmüş oranı korunur: teslim dikdörtgeni son karenin EKRAN alanından türer.
      const orta = poz(.72, w, h), kare = orta.kareler.ekran;
      expect(orta.ekran.sol).toBeCloseTo(kare.x + kare.en * EKRAN.sol, 6);
      expect(orta.ekran.alt).toBeCloseTo(kare.y + kare.boy * EKRAN.alt, 6);
    }
  });

  it('ölçülen bağlar dünyadaki hedef zincirini kesintisiz kurar: farklı bağ setiyle model bozulmaz [SIS-SNG-001]', () => {
    const d = dunyaKur([{ hedef: 'x', dis: { sol: .4, sag: .6, ust: .4, alt: .6 }, ic: { sol: .2, sag: .8, ust: .2, alt: .8 } }]);
    expect(d.olcek[0]).toBe(1); expect(d.olcek[1]).toBeCloseTo(1 / 3);
    expect(d.koken[1].x).toBeCloseTo(.5 - .5 / 3); expect(d.koken[1].y).toBeCloseTo((.5 - .5 / 3) * KARE_ORANI);
    expect(d.bantlar[0][0]).toBeCloseTo(1.08 * 1.03);
    expect(DUNYA.olcek).toHaveLength(4);
  });
});
