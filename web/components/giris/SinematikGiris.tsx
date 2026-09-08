'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { MARKA_AD } from '@/lib/marka';
import { TEMEL } from '@/lib/demo';
import { mercegiSec } from '@/lib/dil/SozlukSaglayici';
import { SAHNELER, ekranYerlestir, kaydirmaTamam, poz, sinirla } from './zaman';
import { fotografKur } from './fotograf';
import type { Sahne } from './cekirdek';
import styles from './giris.module.css';

const HATIRLA = 'uyum-sahne-goruldu-v3';

export default function SinematikGiris({ children, sadeceAnaSayfa = false, sektorler = [] }: {
  children: ReactNode; sadeceAnaSayfa?: boolean;
  /** Kurulu sektör paketleri — açılışta mercek seçilebilsin diye. */
  sektorler?: { id: string; kod: string; ad: string }[];
}) {
  const pathname = usePathname();
  const uygun = !sadeceAnaSayfa || pathname === '/' || pathname === TEMEL || pathname === `${TEMEL}/`;
  return uygun ? <Giris key={pathname} sektorler={sektorler}>{children}</Giris> : children;
}

function Giris({ children, sektorler }: {
  children: ReactNode; sektorler: { id: string; kod: string; ad: string }[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const hedef = useRef<HTMLDivElement>(null);
  const atla = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const el = root.current!, ui = hedef.current!;
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
      el.dataset.cizim = '';
      el.style.removeProperty('--mesafe');
      el.style.removeProperty('--metin'); el.style.removeProperty('--ilerleme');
      el.dataset.tamam = 'false'; el.dataset.metinsiz = 'false'; ui.style.cssText = '';
      temizle();
    }
    let goruldu = false;
    try { goruldu = sessionStorage.getItem(HATIRLA) === '1'; } catch { /* No persistence available. */ }
    const dogrudan = goruldu || !!location.hash || new URLSearchParams(location.search).has('next');
    statik(dogrudan);
    atla.current = () => {
      hatirla();
      statik(true);
      ui.scrollIntoView({ behavior: 'instant', block: 'start' });
      ui.focus({ preventScroll: true });
    };
    function boyutla() {
      const stage = el.querySelector<HTMLElement>(`.${styles.stage}`)!;
      const katsayi = window.innerWidth < 700 ? 5.6 : window.innerWidth < 1100 ? 6 : 6.6;
      mesafe = stage.clientHeight * katsayi;
      el.style.setProperty('--mesafe', `${mesafe}px`);
      sahne?.boyutla(); sonP = -1; guncelle();
    }
    function guncelle() {
      raf = 0;
      if (!hareketli || !sahne || document.hidden) return;
      const stage = el.querySelector<HTMLElement>(`.${styles.stage}`)!;
      const offset = -el.getBoundingClientRect().top;
      const tamam = kaydirmaTamam(offset, mesafe), p = tamam ? 1 : sinirla(offset / mesafe);
      if (p === sonP) return;
      sonP = p;
      const s = poz(p), w = stage.clientWidth, h = stage.clientHeight;
      const rect = sahne.ciz(p);
      el.dataset.ilerleme = p.toFixed(5);
      el.dataset.tamam = String(tamam);
      el.style.setProperty('--metin', String(s.metin));
      el.dataset.metinsiz = String(s.metin === 0);
      el.style.setProperty('--ilerleme', `${p * 100}%`);
      etiket.textContent = `${String(s.asama + 1).padStart(2, '0')} / ${SAHNELER[s.asama]}`;
      ui.inert = !tamam;
      if (tamam) ui.removeAttribute('aria-hidden'); else ui.setAttribute('aria-hidden', 'true');
      const ekran = ekranYerlestir(rect, w, h);
      ui.style.transform = tamam ? 'none' : `translate(${ekran.x}px, ${Math.min(mesafe, Math.max(0, offset)) - mesafe + ekran.y}px) scale(${ekran.k})`;
      ui.style.clipPath = tamam ? 'none' : `inset(${ekran.ust}px ${ekran.sag}px ${Math.max(0, ui.offsetHeight - ekran.boy)}px ${ekran.sol}px)`;
      ui.style.opacity = String(s.arayuz);
      ui.style.visibility = s.arayuz > 0 || tamam ? 'visible' : 'hidden';
      if (tamam && !sonTamam) hatirla();
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
    if (!dogrudan && !motion.matches) {
      async function baslat() {
        if (kapandi || motion.matches || el.dataset.mod === 'dogrudan' || window.scrollY > 8) return;
        try {
          const yeni = await fotografKur(el);
          if (kapandi || motion.matches || el.dataset.mod === 'dogrudan' || window.scrollY > 8) {
            yeni.temizle(); return;
          }
          sahne = yeni;
          el.dataset.cizim = 'fotograf';
          hareketli = true; el.dataset.mod = 'hareketli';
          boyutla();
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') console.warn('Giriş sahnesi statik moda geçti:', error);
          if (!kapandi && el.dataset.mod !== 'dogrudan') statik();
        }
      }
      void baslat();
    }
    window.addEventListener('scroll', planla, { passive: true });
    window.addEventListener('resize', boyutla);
    document.addEventListener('visibilitychange', gorunurluk);
    motion.addEventListener('change', hareketTercihi);
    return () => {
      kapandi = true; cancelAnimationFrame(raf);
      window.removeEventListener('scroll', planla); window.removeEventListener('resize', boyutla);
      document.removeEventListener('visibilitychange', gorunurluk);
      motion.removeEventListener('change', hareketTercihi);
      temizle();
    };
  }, []);

  return (
    <div ref={root} className={styles.root} data-mod="statik">
      <div className={styles.runway}>
        <section className={styles.stage} aria-label="Platforma giriş">
          <Image data-fotograf="uzak" className={styles.poster} src={`${TEMEL}/gorseller/giris/sahne-01-uzak.webp`} alt="" aria-hidden="true" fill sizes="100vw" priority unoptimized />
          <Image data-fotograf="yaklasma" className={styles.roomPoster} src={`${TEMEL}/gorseller/giris/sahne-02-yaklasma.webp`} alt="" aria-hidden="true" fill sizes="100vw" loading="eager" unoptimized />
          <Image data-fotograf="bina" className={styles.roomPoster} src={`${TEMEL}/gorseller/giris/sahne-03-bina.webp`} alt="" aria-hidden="true" fill sizes="100vw" loading="eager" unoptimized />
          <Image data-fotograf="ekran" className={styles.roomPoster} src={`${TEMEL}/gorseller/giris/sahne-04-ekran.webp`} alt="" aria-hidden="true" fill sizes="100vw" loading="eager" unoptimized />
          <div className={styles.shade} aria-hidden="true" />
          <header className={styles.header}>
            <span className={styles.brand}>{MARKA_AD}</span>
            <a className={styles.skip} href="#platform-arayuzu" onClick={e => { e.preventDefault(); atla.current(); }}>Girişi atla <span aria-hidden="true">↗</span></a>
          </header>
          <div className={styles.editorial}>
            <p className={styles.eyebrow}>SAHA · YÖNETİŞİM · UYUM</p>
            <h1>Enerjinin<br /><span>kalbine doğru.</span></h1>
            <p className={styles.description}>Sahadan kontrol odasına.<br />Operasyondan güvenilir yönetişime.</p>
            {/* ── SEKTÖR SEÇİMİ AÇILIŞTA ─────────────────────────────────
                Yabancı bir ziyaretçinin ilk on beş saniyede alması gereken
                cevap "bu ürün BENİM işim için mi". Merceği kabuğun içine
                saklamak, o cevabı ekranın ikinci dakikasına erteliyordu.

                Açılış kabuğu SARAR, yani sözlük sağlayıcısının DIŞINDADIR
                ve `useSektorSecimi()` buradan görünmez; seçim ortak
                `mercegiSec()` ile yazılır. Kabuk `useSyncExternalStore`
                ile dinlediği için değişiklik anında iner — bu ekranın
                sözcükleri değişmez (henüz kabuk yok), ARDINDAKİ ekran
                zaten seçilmiş mercekle açılır.

                İkiden az seçenek varsa çizilmez: tek seçenekli bir seçim,
                seçim değildir. */}
            {sektorler.length >= 2 && (
              <div className={styles.sektor}>
                <span>Sektörünüzü seçin</span>
                <div>
                  {sektorler.map(s => (
                    <button key={s.id} type="button"
                      onClick={() => mercegiSec(s.id)}>{s.ad}</button>
                  ))}
                  <button type="button" onClick={() => mercegiSec(null)}>Sektörsüz</button>
                </div>
              </div>
            )}
            {/* `data-cta` KARARLI KANCADIR, görünen ad değil. ÖLÇÜLDÜ (8 Eyl
                2026): `arac/kosu-ortak.mjs` bu bağı ADIYLA arıyordu ve
                metin değişince giriş yardımcısı CTA'yı bulamadı; perde
                açılmadı, rota duman kapısı 58 rotanın hepsinde düştü.
                Depo bu sınıfı #28'de zaten yaşamıştı. Görünen metin bir
                ÜRÜN kararıdır ve değişir; kapı değişmeyen bir şeye
                tutunur. */}
            <a className={styles.cta} data-cta="platforma-gir" href="#platform-arayuzu" onClick={e => { e.preventDefault(); atla.current(); }}>Platforma Gir <span aria-hidden="true">↗</span></a>
          </div>
          <footer className={styles.footer}>
            <span className={styles.scroll}>İlerlemek için kaydır <span aria-hidden="true">↓</span></span>
            <span className={styles.current}>01 / Dışarıdan yaklaşma</span>
            <span className={styles.caption}>SAHA. KONTROL. GÜVEN.</span>
          </footer>
          <div className={styles.progress} aria-hidden="true" />
        </section>
      </div>
      <div ref={hedef} id="platform-arayuzu" tabIndex={-1} className={styles.destination}>{children}</div>
    </div>
  );
}
