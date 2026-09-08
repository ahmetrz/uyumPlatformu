import { fotografPozu, poz } from './zaman';
import type { Sahne } from './cekirdek';

/** Preserve the photographic camera journey on devices without WebGL. */
export async function fotografKur(root: HTMLElement): Promise<Sahne> {
  const dis = root.querySelector<HTMLImageElement>('[data-fotograf="dis"]')!;
  const oda = root.querySelector<HTMLImageElement>('[data-fotograf="oda"]')!;
  const bina = root.querySelector<HTMLImageElement>('[data-fotograf="bina"]')!;
  const stage = dis.parentElement!;
  await Promise.all([dis.decode(), bina.decode(), oda.decode()]);
  let w = 1, h = 1;
  function boyutla() { w = stage.clientWidth; h = stage.clientHeight; }
  boyutla();
  function yerlestir(img: HTMLImageElement, r: { x: number; y: number; en: number; boy: number }) {
    img.style.width = `${r.en}px`; img.style.height = `${r.boy}px`;
    img.style.left = `${r.x}px`; img.style.top = `${r.y}px`;
  }
  return {
    boyutla,
    ciz(p) {
      const s = poz(p), r = fotografPozu(p, w, h);
      yerlestir(oda, r.oda);
      if (s.bina < 1) yerlestir(dis, r.dis);
      if (s.oda < 1) yerlestir(bina, r.bina);
      dis.style.opacity = String(1 - s.bina);
      bina.style.opacity = String(1 - s.oda);
      return r.ekran;
    },
    temizle() {
      for (const img of [dis, bina, oda]) {
        for (const prop of ['width', 'height', 'left', 'top', 'opacity']) img.style.removeProperty(prop);
      }
    },
  };
}
