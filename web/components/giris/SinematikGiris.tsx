'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MARKA_AD } from '@/lib/marka';
import { TEMEL } from '@/lib/demo';
import { KATMANLAR, poz, sinirla } from './zaman';
import type { Sahne } from './cekirdek';
import styles from './giris.module.css';

const HATIRLA = 'uyum-cekirdek-goruldu-v1';

export default function SinematikGiris({ children, sadeceAnaSayfa = false }: {
  children: ReactNode; sadeceAnaSayfa?: boolean;
}) {
  const pathname = usePathname();
  const uygun = !sadeceAnaSayfa || pathname === '/' || pathname === TEMEL || pathname === `${TEMEL}/`;
  return uygun ? <Giris key={pathname}>{children}</Giris> : children;
}

function Giris({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hedef = useRef<HTMLDivElement>(null);
  const atla = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const el = root.current!, tuval = canvas.current!, ui = hedef.current!;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const etiket = el.querySelector<HTMLElement>(`.${styles.current}`)!;
    let sahne: Sahne | undefined, kapandi = false, raf = 0, mesafe = 0;
    let hareketli = false, sonP = -1, sonTamam = false;
    const hatirla = () => { try { sessionStorage.setItem(HATIRLA, '1'); } catch { /* Storage is optional. */ } };
    const temizle = () => { sahne?.temizle(); sahne = undefined; };
    function statik(atlandi = false) {
      hareketli = false; cancelAnimationFrame(raf); raf = 0;
      ui.inert = false; ui.removeAttribute('aria-hidden');
      el.dataset.mod = atlandi ? 'dogrudan' : 'statik';
      el.style.removeProperty('--mesafe');
      el.style.removeProperty('--metin'); el.style.removeProperty('--ilerleme');
      el.dataset.tamam = 'false'; ui.style.cssText = '';
      temizle();
    }
    let goruldu = false;
    try { goruldu = sessionStorage.getItem(HATIRLA) === '1'; } catch { /* No persistence available. */ }
    // Explicit destinations and restored history never acquire a new entrance.
    const dogrudan = goruldu || !!location.hash || new URLSearchParams(location.search).has('next');
    statik(dogrudan);
    atla.current = () => {
      hatirla();
      if (hareketli) {
        window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top + mesafe, behavior: 'instant' });
        guncelle();
      } else {
        statik(true);
        ui.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
      ui.focus({ preventScroll: true });
    };
    function boyutla() {
      // svh avoids a moving timeline when mobile browser chrome expands/collapses.
      const stage = el.querySelector<HTMLElement>(`.${styles.stage}`)!;
      mesafe = stage.clientHeight * (window.innerWidth < 700 ? 2.1 : 3.2);
      el.style.setProperty('--mesafe', `${mesafe}px`);
      sahne?.boyutla(); sonP = -1; guncelle();
    }
    function guncelle() {
      raf = 0;
      if (!hareketli || !sahne || document.hidden) return;
      const offset = -el.getBoundingClientRect().top;
      const p = sinirla(offset / mesafe), tamam = p >= 1;
      if (p === sonP) return;
      sonP = p;
      const s = poz(p), w = window.innerWidth, h = tuval.clientHeight;
      const rect = sahne.ciz(p);
      el.dataset.ilerleme = p.toFixed(5);
      el.dataset.tamam = String(tamam);
      el.style.setProperty('--metin', String(s.metin));
      el.style.setProperty('--ilerleme', `${p * 100}%`);
      const i = Math.min(5, Math.floor(p * 6));
      etiket.textContent = `${String(i + 1).padStart(2, '0')} / ${KATMANLAR[i]}`;
      ui.inert = !tamam;
      if (tamam) ui.removeAttribute('aria-hidden'); else ui.setAttribute('aria-hidden', 'true');
      ui.style.transform = tamam ? 'none' : `translateY(${Math.min(mesafe, Math.max(0, offset)) - mesafe}px)`;
      ui.style.clipPath = tamam ? 'none' : `inset(${Math.max(0, rect.ust)}px ${Math.max(0, w - rect.sag)}px ${Math.max(0, ui.offsetHeight - Math.min(h, rect.alt))}px ${Math.max(0, rect.sol)}px)`;
      ui.style.visibility = s.aciklik > 0 || tamam ? 'visible' : 'hidden';
      if (tamam && !sonTamam) hatirla();
      // Moving backwards must not strand keyboard focus inside an inert subtree.
      if (!tamam && sonTamam && ui.contains(document.activeElement)) {
        el.querySelector<HTMLAnchorElement>(`.${styles.skip}`)?.focus({ preventScroll: true });
      }
      sonTamam = tamam;
    }
    function planla() { if (!raf && hareketli && !document.hidden) raf = requestAnimationFrame(guncelle); }
    function gorunurluk() {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else { sonP = -1; planla(); }
    }
    function hareketTercihi() {
      if (motion.matches) {
        const eskiY = ui.getBoundingClientRect().top;
        statik();
        if (sonP > 0) window.scrollBy({ top: ui.getBoundingClientRect().top - eskiY, behavior: 'instant' });
      }
    }
    function baglamKaybi(e: Event) {
      e.preventDefault();
      const ilerlemisti = sonP > 0;
      statik(ilerlemisti);
      if (ilerlemisti) { ui.scrollIntoView({ behavior: 'instant' }); ui.focus({ preventScroll: true }); }
    }
    if (!dogrudan && !motion.matches) {
      import('./cekirdek').then(({ cekirdekKur }) => {
        if (kapandi || motion.matches || el.dataset.mod === 'dogrudan') return;
        // Late code must not move a visitor who already scrolled into the static UI.
        if (window.scrollY > 8) return;
        try {
          sahne = cekirdekKur(tuval);
          hareketli = true; el.dataset.mod = 'hareketli';
          boyutla();
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') console.warn('Giriş sahnesi statik moda geçti:', error);
          statik();
        }
      }).catch((error) => {
        if (process.env.NODE_ENV !== 'production') console.warn('Giriş sahnesi yüklenemedi:', error);
        if (!kapandi) statik();
      });
    }
    window.addEventListener('scroll', planla, { passive: true });
    window.addEventListener('resize', boyutla);
    document.addEventListener('visibilitychange', gorunurluk);
    motion.addEventListener('change', hareketTercihi);
    tuval.addEventListener('webglcontextlost', baglamKaybi);
    return () => {
      kapandi = true; cancelAnimationFrame(raf);
      window.removeEventListener('scroll', planla); window.removeEventListener('resize', boyutla);
      document.removeEventListener('visibilitychange', gorunurluk);
      motion.removeEventListener('change', hareketTercihi);
      tuval.removeEventListener('webglcontextlost', baglamKaybi);
      temizle();
    };
  }, []);

  return (
    <div ref={root} className={styles.root} data-mod="statik">
      <div className={styles.runway}>
        <section className={styles.stage} aria-label="Platforma giriş">
          <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
          <div className={styles.staticCore} aria-hidden="true">
            {KATMANLAR.map((label, i) => <span key={label} style={{ '--katman': i } as React.CSSProperties} />)}
          </div>
          <header className={styles.header}>
            <span className={styles.brand}>{MARKA_AD}</span>
            <a className={styles.skip} href="#platform-arayuzu" onClick={e => { e.preventDefault(); atla.current(); }}>Girişi atla <span aria-hidden="true">↗</span></a>
          </header>
          <div className={styles.editorial}>
            <p className={styles.eyebrow}>BT/OT YÖNETİŞİM · UYUM · DÖNÜŞÜM</p>
            <h1>Regülasyondan<br />kanıta.<br /><span>Kanıttan güvene.</span></h1>
            <p className={styles.description}>Kontroller, kanıtlar ve riskler.<br />Aynı sistemin birbirine bağlı katmanları.</p>
            <a className={styles.cta} href="#platform-arayuzu" onClick={e => { e.preventDefault(); atla.current(); }}>Platforma Gir <span aria-hidden="true">↗</span></a>
          </div>
          <footer className={styles.footer}>
            <span className={styles.scroll}>Sistemin içine ilerlemek için kaydır <span aria-hidden="true">↓</span></span>
            <span className={styles.current}>01 / Regülasyon</span>
            <span className={styles.caption}>ALTI KATMAN. TEK UYUM ZİNCİRİ.</span>
          </footer>
          <div className={styles.progress} aria-hidden="true" />
        </section>
      </div>
      <div ref={hedef} id="platform-arayuzu" tabIndex={-1} className={styles.destination}>{children}</div>
    </div>
  );
}
