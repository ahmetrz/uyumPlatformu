'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MARKA_AD } from '@/lib/marka';
import { TEMEL } from '@/lib/demo';
import { mercegiSec } from '@/lib/dil/SozlukSaglayici';
import { KARELER, SAHNELER, ekranYerlestir, kaydirmaKatsayisi, kaydirmaTamam, sinirla } from './zaman';
import { sahneKur, type Sahne } from './sahne';
import styles from './giris.module.css';

const DOSYALAR = ['sahne-01-uzak', 'sahne-02-yaklasma', 'sahne-03-bina', 'sahne-04-ekran'] as const;

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
  const tempoDegistir = useRef<(carpan: number) => void>(() => {});

  useLayoutEffect(() => {
    const el = root.current!, ui = hedef.current!;
    const stage = el.querySelector<HTMLElement>(`.${styles.stage}`)!;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const etiket = el.querySelector<HTMLElement>(`.${styles.current}`)!;
    let sahne: Sahne | undefined, kapandi = false, raf = 0, mesafe = 0;
    let hareketli = false, sonP = -1, sonTamam = false, tempo = 1;
    const temizle = () => { sahne?.temizle(); sahne = undefined; };
    function statik(atlandi = false) {
      hareketli = false; cancelAnimationFrame(raf); raf = 0;
      ui.inert = false; ui.removeAttribute('aria-hidden');
      el.dataset.mod = atlandi ? 'dogrudan' : 'statik';
      el.style.removeProperty('--mesafe');
      el.style.removeProperty('--metin'); el.style.removeProperty('--arayuz'); el.style.removeProperty('--ilerleme');
      el.dataset.tamam = 'false'; el.dataset.metinsiz = 'false'; el.dataset.asama = '0'; el.dataset.arayuz = '0'; ui.style.cssText = '';
      temizle();
    }
    const dogrudan = !!location.hash || new URLSearchParams(location.search).has('next');
    statik(dogrudan);
    atla.current = () => {
      statik(true);
      ui.scrollIntoView({ behavior: 'instant', block: 'start' });
      ui.focus({ preventScroll: true });
    };
    function boyutla() {
      mesafe = stage.clientHeight * kaydirmaKatsayisi(window.innerWidth) * tempo;
      el.style.setProperty('--mesafe', `${mesafe}px`);
      sahne?.boyutla(); sonP = -1; guncelle();
    }
    tempoDegistir.current = carpan => {
      tempo = carpan;
      if (!hareketli || sonTamam) return;
      // Hız seçimi kamerayı başka konuma atmaz; mevcut ilerleme korunur.
      const p = Math.max(0, sonP), ust = el.getBoundingClientRect().top + window.scrollY;
      mesafe = stage.clientHeight * kaydirmaKatsayisi(window.innerWidth) * tempo;
      el.style.setProperty('--mesafe', `${mesafe}px`);
      window.scrollTo({ top: ust + p * mesafe, behavior: 'instant' });
      sonP = -1; guncelle();
    };
    function guncelle() {
      raf = 0;
      if (!hareketli || !sahne || document.hidden) return;
      const offset = -el.getBoundingClientRect().top;
      const tamam = kaydirmaTamam(offset, mesafe), p = tamam ? 1 : sinirla(offset / mesafe);
      if (p === sonP) return;
      sonP = p;
      const w = stage.clientWidth, h = stage.clientHeight;
      const s = sahne.ciz(p);
      el.dataset.ilerleme = p.toFixed(5);
      el.dataset.tamam = String(tamam);
      el.dataset.asama = String(s.asama);
      el.style.setProperty('--metin', String(s.metin));
      el.dataset.metinsiz = String(s.metin === 0);
      el.style.setProperty('--arayuz', String(s.arayuz));
      el.dataset.arayuz = s.arayuz >= 1 ? '1' : '0';
      el.style.setProperty('--ilerleme', `${p * 100}%`);
      etiket.textContent = `${String(s.asama + 1).padStart(2, '0')} / ${SAHNELER[s.asama]}`;
      ui.inert = !tamam;
      if (tamam) ui.removeAttribute('aria-hidden'); else ui.setAttribute('aria-hidden', 'true');
      // Fiziksel ekran yüzeyi → canlı arayüz: aynı dikdörtgen, aynı ölçek, aynı konum.
      const ekran = ekranYerlestir(s.ekran, w, h);
      ui.style.transform = tamam ? 'none' : `translate(${ekran.x}px, ${Math.min(mesafe, Math.max(0, offset)) - mesafe + ekran.y}px) scale(${ekran.k})`;
      ui.style.clipPath = tamam ? 'none' : `inset(${ekran.ust}px ${ekran.sag}px ${Math.max(0, ui.offsetHeight - ekran.boy)}px ${ekran.sol}px)`;
      ui.style.opacity = String(s.arayuz);
      ui.style.visibility = s.arayuz > 0 || tamam ? 'visible' : 'hidden';
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
      // Görseller çözülmeden kaydırma alanını ayır; erken scroll yolculuğu iptal etmez.
      el.dataset.mod = 'hareketli';
      ui.inert = true; ui.setAttribute('aria-hidden', 'true');
      boyutla();
      async function baslat() {
        if (kapandi || motion.matches || el.dataset.mod === 'dogrudan') return;
        try {
          const yeni = await sahneKur(el);
          if (kapandi || motion.matches || el.dataset.mod === 'dogrudan') {
            yeni.temizle(); return;
          }
          sahne = yeni;
          hareketli = true; el.dataset.mod = 'hareketli';
          boyutla();
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') console.warn('Giriş sahnesi statik moda geçti:', error);
          if (!kapandi && el.dataset.mod !== 'dogrudan') {
            const eskiUst = stage.getBoundingClientRect().top;
            statik();
            // Kaydırma alanı daralırken görünür giriş karesi aynı yerde kalır.
            window.scrollBy({ top: stage.getBoundingClientRect().top - eskiUst, behavior: 'instant' });
          }
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
    <div ref={root} className={styles.root} data-mod="statik" data-asama="0" data-arayuz="0">
      <div className={styles.runway}>
        <section className={styles.stage} aria-label="Platforma giriş">
          {/* Uzak manzara aynı kalır; yaklaşan yapıdan daha yavaş büyür. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- aynı yerel statik kaynak */}
          <img data-uzak-plan className={styles.backdrop} src={`${TEMEL}/gorseller/giris/${DOSYALAR[0]}.webp`} alt="" aria-hidden="true" width={1600} height={900} />
          {/* Dört onaylı kare tek optik eksende ilerler; dekoratiftir (alt="", aria-hidden).
              Statik dışa aktarımda görsel optimizasyonu kapalı; düz <img> kullanılır. */}
          {KARELER.map((ad, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım: optimizasyon kapalı
            <img key={ad} data-kare={ad} className={styles.kare}
              src={`${TEMEL}/gorseller/giris/${DOSYALAR[i]}.webp`} alt="" aria-hidden="true"
              width={1600} height={900} decoding="async" loading="eager"
              fetchPriority={i === 0 ? 'high' : 'auto'} />
          ))}
          <div className={styles.vignette} aria-hidden="true" />
          <div className={styles.shade} aria-hidden="true" />
          <header className={styles.header}>
            <span className={styles.brand}>{MARKA_AD}</span>
            <a className={styles.skip} href="#platform-arayuzu" onClick={e => { e.preventDefault(); atla.current(); }}>Girişi atla <span aria-hidden="true">↗</span></a>
          </header>
          <div className={styles.editorial}>
            <p className={styles.eyebrow}>SAHA · YÖNETİŞİM · UYUM</p>
            <h1>Büyük resmi<br /><span>görün.</span></h1>
            <p className={styles.description}>Sahadan kontrol odasına.<br />Her kararın arkasındaki bütüne.</p>
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
            <label className={styles.tempo}>Yolculuk temposu
              <select aria-label="Yolculuk temposu" defaultValue="1" onChange={e => tempoDegistir.current(Number(e.target.value))}>
                <option value="1.35">Sakin</option><option value="1">Dengeli</option><option value="0.72">Hızlı</option>
              </select>
            </label>
          </footer>
          <div className={styles.progress} aria-hidden="true" />
        </section>
      </div>
      <div ref={hedef} id="platform-arayuzu" tabIndex={-1} className={styles.destination}>{children}</div>
    </div>
  );
}
