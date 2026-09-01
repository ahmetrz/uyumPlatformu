/* WCAG 2.1 göreli parlaklık ve kontrast oranı.
   Token referans sayfası oranları İDDİA ETMEZ, buradan hesaplar. */

function kanal(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const t = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(t.slice(0, 2), 16),
    parseInt(t.slice(2, 4), 16),
    parseInt(t.slice(4, 6), 16),
  ];
}

/** Göreli parlaklık (WCAG 2.1) */
export function parlaklik(hex: string): number {
  const [r, g, b] = hexRgb(hex);
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
}

/** İki renk arasındaki kontrast oranı — 1.0 ile 21.0 arası */
export function kontrast(a: string, b: string): number {
  const la = parlaklik(a);
  const lb = parlaklik(b);
  const [y, k] = la > lb ? [la, lb] : [lb, la];
  return (y + 0.05) / (k + 0.05);
}

/** WCAG AA: normal metin 4.5, büyük metin 3.0, arayüz bileşeni 3.0 */
export function aaGecer(oran: number, tur: 'metin' | 'buyuk' | 'bilesen' = 'metin'): boolean {
  return oran >= (tur === 'metin' ? 4.5 : 3);
}

export const bicimle = (oran: number) => `${oran.toFixed(2)}:1`;
