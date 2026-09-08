export const SAHNELER = ['Santrale yaklaşma', 'Kontrol odasına giriş', 'Yönetim ekranı'] as const;
export const sinirla = (n: number) => Math.min(1, Math.max(0, n));
export function aralik(p: number, a: number, b: number) {
  const t = sinirla((p - a) / (b - a));
  return t * t * (3 - 2 * t);
}
/** Camera and vapor depend on scroll alone: stop and reverse are exact. */
export function poz(p: number) {
  p = sinirla(p);
  const yaklasma = aralik(p, 0, .4), bina = aralik(p, .28, .42), oda = aralik(p, .58, .72);
  const ekran = aralik(p, .72, 1);
  return { p, yaklasma, bina, oda, ekran, arayuz: aralik(p, .9, .985),
    kamera: -17 * yaklasma - 17 * aralik(p, .35, .72) - 23.5 * ekran,
    metin: 1 - aralik(p, .08, .26), asama: p < .28 ? 0 : p < .72 ? 1 : 2 };
}
export type Cerceve = { sol: number; sag: number; ust: number; alt: number };
export const ODA = { en: 64, boy: 36, z: -58 };
// Unobstructed center of the supplied operator's monitor; artwork is never edited.
export const EKRAN = { sol: .365, sag: .55, ust: .47, alt: .625 };
export const kaydirmaTamam = (offset: number, mesafe: number) => mesafe > 0 && offset >= mesafe - 1;

/** The same pinhole camera is used by WebGL and the photographic fallback. */
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
/** Cover the physical display without distorting the live application's aspect ratio. */
export function ekranYerlestir(rect: Cerceve, w: number, h: number) {
  const k = Math.min(1, Math.max((rect.sag - rect.sol) / w, (rect.alt - rect.ust) / h));
  const x = k === 1 ? 0 : (rect.sol + rect.sag - w * k) / 2;
  const y = k === 1 ? 0 : (rect.ust + rect.alt - h * k) / 2;
  return { k, x, y, sol: Math.max(0, (rect.sol - x) / k),
    sag: Math.max(0, (x + w * k - rect.sag) / k),
    ust: Math.max(0, (rect.ust - y) / k), boy: Math.min(h, (rect.alt - y) / k) };
}
