export const KATMANLAR = ['Regülasyon', 'Kontrol', 'Kanıt', 'Risk', 'Denetim', 'Uyum'] as const;
export const sinirla = (n: number) => Math.min(1, Math.max(0, n));
export function aralik(p: number, a: number, b: number) {
  const t = sinirla((p - a) / (b - a));
  return t * t * (3 - 2 * t);
}
/** All poses derive from scroll, never elapsed time or a spring. */
export function poz(p: number) {
  p = sinirla(p);
  const ayrilma = aralik(p, .2, .55);
  const hizalama = aralik(p, .42, .72);
  return {
    p,
    ayrilma,
    x: 1 - hizalama,
    rx: .22 * (1 - hizalama),
    ry: (-.52 + .22 * aralik(p, 0, .2)) * (1 - hizalama),
    rz: -.08 * (1 - hizalama),
    aralik: .22 + .78 * ayrilma,
    kamera: 10 - 8 * aralik(p, .48, .8) - 6.75 * aralik(p, .8, 1),
    aciklik: aralik(p, .73, .84),
    metin: 1 - aralik(p, .14, .34),
  };
}
