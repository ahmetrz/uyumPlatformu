import { KARELER, poz, type Kare, type Poz } from './zaman';

export type Sahne = { ciz: (p: number) => Poz; boyutla: () => void; temizle: () => void };

/**
 * Dört kareyi tek optik eksende ilerleten "scrub" işleyicisi. Kareler bir
 * kez kaplama boyutuna dikilir; her kaydırma karesinde yalnız
 * `transform` ve `opacity` değişir (kompozitör katmanı, yerleşim yok).
 * Görünmeyen kare `visibility: hidden` ile kompozisyondan tamamen çıkar.
 */
export async function sahneKur(root: HTMLElement): Promise<Sahne> {
  const imgs = Object.fromEntries(KARELER.map(ad => [ad, root.querySelector<HTMLImageElement>(`[data-kare="${ad}"]`)!])) as Record<Kare, HTMLImageElement>;
  const stage = imgs.uzak.parentElement!;
  await Promise.all(KARELER.map(async ad => {
    const img = imgs[ad];
    if (!img.complete || img.naturalWidth === 0) await img.decode();
  }));

  let w = 1, h = 1;
  function boyutla() {
    w = Math.max(1, stage.clientWidth); h = Math.max(1, stage.clientHeight);
    // Her karenin kutusu, ilk kareyi görüntü alanına kaplayan tabanla aynı orana dikilir;
    // gerçek büyüklük `transform: scale` ile gelir.
    const taban = Math.max(w, h * 16 / 9);
    for (const ad of KARELER) {
      const img = imgs[ad];
      img.style.width = `${taban}px`; img.style.height = `${taban * 9 / 16}px`;
    }
  }
  boyutla();

  return {
    boyutla,
    ciz(p) {
      const s = poz(p, w, h);
      const taban = Math.max(w, h * 16 / 9);
      for (const ad of KARELER) {
        const img = imgs[ad], yer = s.kareler[ad];
        if (yer.opaklik <= 0.0005) { img.style.visibility = 'hidden'; img.style.opacity = '0'; continue; }
        img.style.visibility = 'visible';
        img.style.opacity = yer.opaklik.toFixed(4);
        img.style.transform = `translate3d(${yer.x.toFixed(2)}px, ${yer.y.toFixed(2)}px, 0) scale(${(yer.en / taban).toFixed(5)})`;
      }
      return s;
    },
    temizle() {
      for (const ad of KARELER) {
        const img = imgs[ad];
        for (const prop of ['width', 'height', 'transform', 'opacity', 'visibility']) img.style.removeProperty(prop);
      }
    },
  };
}
