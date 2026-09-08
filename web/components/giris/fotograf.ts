import { EKRAN, poz, sinirla } from './zaman';
import type { Sahne } from './cekirdek';

type Ad = 'uzak' | 'yaklasma' | 'bina' | 'ekran';
type Yer = { x: number; y: number; en: number; boy: number };

/* Her karedeki fiziksel hedefin normalize konumu. Hedefler görüntülerin
   merkez ekseninde tutuldu; zoom büyüdükçe küçük üretim farkları merkeze
   kilitlenir ve cross-dissolve sırasında "teleport" hissi azalır. */
const ODAKLAR: Record<Ad, { x: number; y: number }> = {
  uzak: { x: .50, y: .46 },
  yaklasma: { x: .50, y: .43 },
  bina: { x: .50, y: .42 },
  ekran: { x: .50, y: .435 },
};

/** WebGL yerine dört gerçek kareyi tek optik eksende ilerleten fotoğraf kamerası. */
export async function fotografKur(root: HTMLElement): Promise<Sahne> {
  const adlar: Ad[] = ['uzak', 'yaklasma', 'bina', 'ekran'];
  const imgs = Object.fromEntries(adlar.map(ad => [ad, root.querySelector<HTMLImageElement>(`[data-fotograf="${ad}"]`)!])) as Record<Ad, HTMLImageElement>;
  const stage = imgs.uzak.parentElement!;
  await Promise.all(adlar.map(ad => imgs[ad].decode()));

  let w = 1, h = 1;
  function boyutla() { w = Math.max(1, stage.clientWidth); h = Math.max(1, stage.clientHeight); }
  boyutla();

  function yerlestir(img: HTMLImageElement, ad: Ad, zoom: number): Yer {
    const taban = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const bw = img.naturalWidth * taban, bh = img.naturalHeight * taban;
    const bx = (w - bw) / 2, by = (h - bh) / 2;
    const odak = ODAKLAR[ad];
    const dogalX = bx + odak.x * bw, dogalY = by + odak.y * bh;

    // İlk pikselde görüntüyü oynatma. Zoom arttıkça hedefi ortak kamera
    // eksenine yumuşakça kilitle; büyümüş görüntü boş kenar oluşturmaz.
    const kilit = sinirla((zoom - 1) / .42);
    const hedefX = dogalX + (w * .5 - dogalX) * kilit;
    const hedefY = dogalY + (h * .455 - dogalY) * kilit;
    const en = bw * zoom, boy = bh * zoom;
    const x = hedefX - odak.x * en, y = hedefY - odak.y * boy;

    img.style.width = `${en}px`; img.style.height = `${boy}px`;
    img.style.left = `${x}px`; img.style.top = `${y}px`;
    return { x, y, en, boy };
  }

  return {
    boyutla,
    ciz(p) {
      const s = poz(p);
      const yerler = {
        uzak: yerlestir(imgs.uzak, 'uzak', s.zoomlar.uzak),
        yaklasma: yerlestir(imgs.yaklasma, 'yaklasma', s.zoomlar.yaklasma),
        bina: yerlestir(imgs.bina, 'bina', s.zoomlar.bina),
        ekran: yerlestir(imgs.ekran, 'ekran', s.zoomlar.ekran),
      };

      for (const ad of adlar) imgs[ad].style.opacity = String(s.katmanlar[ad]);

      const r = yerler.ekran;
      return {
        sol: r.x + r.en * EKRAN.sol,
        sag: r.x + r.en * EKRAN.sag,
        ust: r.y + r.boy * EKRAN.ust,
        alt: r.y + r.boy * EKRAN.alt,
      };
    },
    temizle() {
      for (const ad of adlar) {
        const img = imgs[ad];
        for (const prop of ['width', 'height', 'left', 'top', 'opacity']) img.style.removeProperty(prop);
      }
    },
  };
}
