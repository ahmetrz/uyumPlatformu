import { BAGLAR, KARELER, gecisMaskesi, poz, type Kare, type Poz } from './zaman';

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
  const arka = root.querySelector<HTMLImageElement>('[data-uzak-plan]')!;
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
      arka.style.transform = `scale(${1 + s.yol * .08})`;
      const gorunen = KARELER.filter(ad => s.kareler[ad].opaklik > .0005);
      for (const ad of KARELER) {
        const img = imgs[ad], yer = s.kareler[ad];
        if (yer.opaklik <= 0.0005) { img.style.visibility = 'hidden'; img.style.opacity = '0'; continue; }
        img.style.visibility = 'visible';
        // Alt kare görüntüyü kaplar. Üst kare, fiziksel hedef çevresinden açılır.
        const icKare = gorunen.length === 2 && ad === gorunen[1];
        const bag = BAGLAR[KARELER.indexOf(ad) - 1];
        const maske = icKare && CSS.supports('mask-image', 'radial-gradient(black, transparent)');
        img.style.opacity = icKare && !maske ? yer.opaklik.toFixed(4) : '1';
        const odakMaskesi = maske ? gecisMaskesi(yer.opaklik,
          (bag.ic.sol + bag.ic.sag) / 2 * taban,
          (bag.ic.ust + bag.ic.alt) / 2 * taban * 9 / 16, taban, taban * 9 / 16) : 'none';
        const ufuk = [38.9, 32.4, 24.25][KARELER.indexOf(ad)];
        const derinlik = ad !== 'ekran' && CSS.supports('mask-composite', 'intersect');
        img.style.maskImage = derinlik
          ? `linear-gradient(to bottom, transparent ${ufuk}%, #000 ${ufuk + .25}%), ${odakMaskesi === 'none' ? 'linear-gradient(#000, #000)' : odakMaskesi}`
          : odakMaskesi;
        img.style.maskComposite = derinlik ? 'intersect' : 'add';
        img.style.transform = `translate3d(${yer.x.toFixed(2)}px, ${yer.y.toFixed(2)}px, 0) scale(${(yer.en / taban).toFixed(5)})`;
      }
      return s;
    },
    temizle() {
      arka.style.removeProperty('transform');
      for (const ad of KARELER) {
        const img = imgs[ad];
        for (const prop of ['width', 'height', 'transform', 'opacity', 'visibility', 'mask-image', 'mask-composite']) img.style.removeProperty(prop);
      }
    },
  };
}
