import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { EKRAN, ODA, ekranYerlestir, fotografPozu, kaydirmaTamam, poz } from '../components/giris/zaman';

describe('Kaydırma ile jeotermal giriş', () => {
  it('ileri ve geri aynı kaydırma noktasında aynı pozu verir [SIS-SNG-001]', () => {
    const ilerleme = [0, .1, .2, .4, .46, .55, .64, .72, .9, 1];
    expect([...ilerleme].reverse().map(poz).reverse()).toEqual(ilerleme.map(poz));
    expect(poz(-1)).toEqual(poz(0)); expect(poz(2)).toEqual(poz(1));
  });
  it('ekran geçişi sonunda gerçek arayüzü ölçek ve konum sıçraması olmadan teslim eder [SIS-SNG-001]', () => {
    expect(kaydirmaTamam(2995, 2995.2)).toBe(true);
    expect(kaydirmaTamam(2993, 2995.2)).toBe(false);
    expect(kaydirmaTamam(0, 0)).toBe(false);
    for (const [w, h] of [[375, 780], [768, 1024], [1440, 900], [2560, 1080]]) {
      const yer = ekranYerlestir({ sol: -w, sag: 2 * w, ust: -h, alt: 2 * h }, w, h);
      expect(yer).toEqual({ k: 1, x: 0, y: 0, sol: 0, sag: 0, ust: 0, boy: h });
      const kucuk = ekranYerlestir({ sol: w / 4, sag: w * .75, ust: h / 4, alt: h * .75 }, w, h);
      expect(kucuk.k).toBe(.5); expect(kucuk.x).toBe(w / 4); expect(kucuk.y).toBe(h / 4);
      for (const p of [.46, .64, .9, 1]) {
        const s = poz(p), cover = Math.max(1, w / h / (64 / 36));
        const camera = new PerspectiveCamera(58, w / h, .05, 160);
        camera.position.set(((EKRAN.sol + EKRAN.sag) / 2 - .5) * ODA.en * cover * s.ekran,
          (.5 - (EKRAN.ust + EKRAN.alt) / 2) * ODA.boy * cover * s.ekran, s.kamera);
        camera.updateMatrixWorld(true);
        const corner = new Vector3((EKRAN.sol - .5) * ODA.en * cover, (.5 - EKRAN.ust) * ODA.boy * cover, ODA.z).project(camera);
        const frame = fotografPozu(p, w, h).ekran;
        expect(frame.sol).toBeCloseTo((corner.x + 1) * w / 2);
        expect(frame.ust).toBeCloseTo((1 - corner.y) * h / 2);
      }
    }
  });
  it('kamerayı odanın önünde tutar; ekran yaklaşmadan oda açılır ve hareket süreklidir [SIS-SNG-001]', () => {
    for (let i = 1; i <= 1000; i++) {
      const s = poz(i / 1000), once = poz((i - 1) / 1000);
      if (s.ekran > 0) expect(s.oda).toBe(1);
      expect(s.kamera).toBeLessThanOrEqual(once.kamera);
      expect(Math.abs(s.kamera - once.kamera)).toBeLessThan(.14);
      expect(s.kamera).toBeGreaterThan(ODA.z);
    }
    expect(poz(0).kamera).toBeCloseTo(0); expect(poz(1).oda).toBe(1); expect(poz(1).ekran).toBe(1);
  });
});
