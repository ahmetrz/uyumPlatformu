'use client';
import { useEffect } from 'react';

/** Sayfadaki .belir öğelerini görünür olduklarında canlandırır,
 *  [data-sayac] metriklerini hedefe doğru sayar. */
export default function Canlandir() {
  useEffect(() => {
    const azaltilmis = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gozlemci = new IntersectionObserver(
      (girisler) => {
        for (const g of girisler) {
          if (g.isIntersecting) {
            g.target.classList.add('gorunur');
            gozlemci.unobserve(g.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll('.belir, .halka-izle').forEach((el) => gozlemci.observe(el));

    const sayaclar = document.querySelectorAll<HTMLElement>('[data-sayac]');
    if (!azaltilmis) {
      const sayacGozlemci = new IntersectionObserver((girisler) => {
        for (const g of girisler) {
          if (!g.isIntersecting) continue;
          const el = g.target as HTMLElement;
          sayacGozlemci.unobserve(el);
          const hedef = parseFloat(el.dataset.sayac ?? '0');
          const ondalik = el.dataset.ondalik ? parseInt(el.dataset.ondalik) : 0;
          const sure = 900;
          const t0 = performance.now();
          const adim = (t: number) => {
            const oran = Math.min((t - t0) / sure, 1);
            const kolay = 1 - Math.pow(1 - oran, 3);
            el.textContent = (hedef * kolay).toLocaleString('tr-TR', {
              minimumFractionDigits: ondalik, maximumFractionDigits: ondalik,
            });
            if (oran < 1) requestAnimationFrame(adim);
          };
          requestAnimationFrame(adim);
        }
      }, { threshold: 0.4 });
      sayaclar.forEach((el) => sayacGozlemci.observe(el));
    } else {
      sayaclar.forEach((el) => {
        const ondalik = el.dataset.ondalik ? parseInt(el.dataset.ondalik) : 0;
        el.textContent = parseFloat(el.dataset.sayac ?? '0').toLocaleString('tr-TR', {
          minimumFractionDigits: ondalik, maximumFractionDigits: ondalik,
        });
      });
    }
    return () => gozlemci.disconnect();
  });
  return null;
}
