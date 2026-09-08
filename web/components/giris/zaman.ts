export const SAHNELER = ['Dışarıdan yaklaşma', 'Kontrol binasına yaklaşma', 'Kontrol odasına giriş', 'Yönetim ekranı'] as const;
export const sinirla = (n: number) => Math.min(1, Math.max(0, n));
export function aralik(p: number, a: number, b: number) {
  const t = sinirla((p - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/**
 * Tek kamera yolunun zaman çizgisi. Görseller yalnız opacity ile değişmez:
 * her kare kendi hedef noktasına doğru zoom yapar ve bir sonraki kare aynı
 * hedef büyüklüğünden devralır. Böylece "slayt" değil, ileri dolly hissi oluşur.
 */
export function poz(p: number) {
  p = sinirla(p);

  const g12 = aralik(p, .20, .30);
  const g23 = aralik(p, .46, .57);
  const g34 = aralik(p, .69, .81);

  const katmanlar = {
    uzak: 1 - g12,
    yaklasma: g12 * (1 - g23),
    bina: g23 * (1 - g34),
    ekran: g34,
  };

  const zoomlar = {
    uzak: 1 + .48 * aralik(p, 0, .29),
    yaklasma: 1 + 1.10 * aralik(p, .20, .55),
    bina: 1 + 1.25 * aralik(p, .47, .79),
    ekran: 1 + 2.75 * aralik(p, .70, 1),
  };

  // Eski 3B projeksiyon sözleşmesini koruyan alanlar. Fotoğraf yolunun
  // çalışma mantığı yukarıdaki katmanlar/zoomlar ile belirlenir.
  const yaklasma = aralik(p, 0, .4), bina = aralik(p, .28, .42), oda = aralik(p, .58, .72);
  const ekran = aralik(p, .72, 1);

  return {
    p, katmanlar, zoomlar, yaklasma, bina, oda, ekran,
    arayuz: aralik(p, .90, .992),
    kamera: -17 * yaklasma - 17 * aralik(p, .35, .72) - 23.5 * ekran,
    metin: 1 - aralik(p, .05, .19),
    asama: p < .24 ? 0 : p < .50 ? 1 : p < .74 ? 2 : 3,
  };
}

export type Cerceve = { sol: number; sag: number; ust: number; alt: number };
export const ODA = { en: 64, boy: 36, z: -58 };
// Yeni final karedeki gerçek ana ekranın ölçülmüş yaklaşık sınırları.
export const EKRAN = { sol: .226, sag: .774, ust: .296, alt: .575 };
export const kaydirmaTamam = (offset: number, mesafe: number) => mesafe > 0 && offset >= mesafe - 1;

/** Eski WebGL izdüşüm testi için aynı pinhole kamera hesabını korur. */
export function fotografPozu(p: number, w: number, h: number) {
  const s = poz(p), cover = Math.max(1, w / h / (64 / 36));
  const cx = ((EKRAN.sol + EKRAN.sag) / 2 - .5) * ODA.en * cover * s.ekran;
  const cy = (.5 - (EKRAN.ust + EKRAN.alt) / 2) * ODA.boy * cover * s.ekran;
  function levha(en: number, boy: number, uzaklik: number) {
    const f = h / (2 * Math.tan(29 * Math.PI / 180) * Math.max(.1, uzaklik));
    return { x: w / 2 - en * f / 2 - cx * f, y: h / 2 - boy * f / 2 + cy * f, en: en * f, boy: boy * f };
  }
  const oda = levha(ODA.en * cover, ODA.boy * cover, -ODA.z + s.kamera);
  const dis = levha(64 * cover, 36 * cover, 32 + s.kamera);
  const bina = levha(64 * cover, 36 * cover, 44 + s.kamera);
  return { oda, dis, bina, ekran: { sol: oda.x + oda.en * EKRAN.sol, sag: oda.x + oda.en * EKRAN.sag,
    ust: oda.y + oda.boy * EKRAN.ust, alt: oda.y + oda.boy * EKRAN.alt } };
}

/** Fiziksel ekran yüzeyini canlı DOM arayüzüne bozmadan teslim eder. */
export function ekranYerlestir(rect: Cerceve, w: number, h: number) {
  const k = Math.min(1, Math.max((rect.sag - rect.sol) / w, (rect.alt - rect.ust) / h));
  const x = k === 1 ? 0 : (rect.sol + rect.sag - w * k) / 2;
  const y = k === 1 ? 0 : (rect.ust + rect.alt - h * k) / 2;
  return { k, x, y, sol: Math.max(0, (rect.sol - x) / k),
    sag: Math.max(0, (x + w * k - rect.sag) / k),
    ust: Math.max(0, (rect.ust - y) / k), boy: Math.min(h, (rect.alt - y) / k) };
}
