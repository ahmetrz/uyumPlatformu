'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ARAMA_AC } from '@/components/KomutPaleti';
import {
  KISAYOLLAR, YARDIM_AC, yardimTusuMu, yazmaAlanindaMi,
} from '@/app/(kabuk)/(operasyonel)/yardim/mantik';

/* Kısayol katmanı — `?` (Shift + /) ile açılır (E35).

   KomutPaleti ile AYNI olay kalıbı: pencere `keydown` dinleyicisi + bir
   pencere olayı (`yardim:ac`) — kısayolu bilmeyen kullanıcı için üst
   çubuktaki "Yardım" bağı tam ekrana götürür, bu katman klavye
   kullanıcısının hızlı kapısıdır.

   Yazı alanında TETİKLENMEZ: `?` bir metin karakteridir; arama kutusuna
   "?" yazan kişinin önüne katman açılmaz (`yazmaAlanindaMi`).

   Erişilebilirlik sözleşmesi:
   · `role="dialog"` + `aria-modal` + `aria-labelledby`;
   · Esc kapatır; perdeye tıklamak kapatır;
   · ODAK TUZAĞI — Tab katmanın içinde döner, sayfaya kaçmaz;
   · açılınca odak kapat düğmesine gider, kapanınca AÇAN öğeye döner.
   Bileşen `Kabuk` içinde monte edilir ki `.ab[data-yon]` token'larını
   alsın (palet için de aynı ders alınmıştı). */

export default function YardimKatmani() {
  const [acik, setAcik] = useState(false);
  const katman = useRef<HTMLDivElement | null>(null);
  const onceki = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dinle = (e: KeyboardEvent) => {
      if (yardimTusuMu(e) && !yazmaAlanindaMi(e.target as HTMLElement | null)) {
        e.preventDefault(); setAcik((a) => !a);
        return;
      }
      if (e.key === 'Escape') setAcik(false);
      /* Ctrl/⌘+K paleti açar; iki katman üst üste binmesin diye bu katman
         aynı tuşta KAPANIR (palet kendi dinleyicisiyle açılır). */
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') setAcik(false);
    };
    const ac = () => setAcik(true);
    const kapat = () => setAcik(false);
    window.addEventListener('keydown', dinle);
    window.addEventListener(YARDIM_AC, ac);
    /* "Ara" düğmesi paleti olayla açar; aynı olay bu katmanı kapatır. */
    window.addEventListener(ARAMA_AC, kapat);
    return () => {
      window.removeEventListener('keydown', dinle);
      window.removeEventListener(YARDIM_AC, ac);
      window.removeEventListener(ARAMA_AC, kapat);
    };
  }, []);

  /* Odak yönetimi: açılışta odağı içeri al, kapanışta geri ver. Odak
     tuzağı Tab'ı katmanın ilk/son odaklanabilir öğesi arasında döndürür. */
  useEffect(() => {
    if (!acik) {
      onceki.current?.focus?.();
      onceki.current = null;
      return;
    }
    onceki.current = document.activeElement as HTMLElement | null;
    const kok = katman.current;
    if (!kok) return;
    const odaklanabilir = () => Array.from(
      kok.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    );
    odaklanabilir()[0]?.focus();
    const tuzak = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const liste = odaklanabilir();
      if (liste.length === 0) { e.preventDefault(); return; }
      const ilk = liste[0], son = liste[liste.length - 1];
      const aktif = document.activeElement;
      if (e.shiftKey && (aktif === ilk || !kok.contains(aktif))) { e.preventDefault(); son.focus(); }
      else if (!e.shiftKey && (aktif === son || !kok.contains(aktif))) { e.preventDefault(); ilk.focus(); }
    };
    kok.addEventListener('keydown', tuzak);
    return () => kok.removeEventListener('keydown', tuzak);
  }, [acik]);

  if (!acik) return null;
  return (
    /* Perde paletinkiyle ortak (`.palet-perde`): aynı z-katmanı, aynı
       karartma. Kutu `.palet` zeminini alır; ek ölçüler `.ab-yardim-*`. */
    <div className="palet-perde" onClick={() => setAcik(false)}>
      <div ref={katman} className="palet ab-yardim-katman" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="yardim-katman-baslik">
        <div className="ab-yardim-ust">
          <h2 id="yardim-katman-baslik" className="ab-yardim-baslik">Klavye kısayolları</h2>
          <button type="button" className="ab-dugme" onClick={() => setAcik(false)}
            aria-keyshortcuts="Escape">
            Kapat
          </button>
        </div>
        <dl className="ab-yardim-liste">
          {KISAYOLLAR.map((k) => (
            <div key={k.tuslar.join('+')} className="ab-yardim-satir">
              <dt>
                {k.tuslar.map((t, i) => (
                  <span key={t}>
                    {i > 0 && <span className="ab-yardim-arti" aria-hidden>+</span>}
                    <kbd className="ab-yardim-tus">{t}</kbd>
                  </span>
                ))}
              </dt>
              <dd>
                {k.yapar}
                <span className="mono ab-yardim-baglam"> · {k.baglam}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="palet-not">
          <Link href="/yardim" onClick={() => setAcik(false)}>Tam yardım sayfası →</Link>
        </p>
      </div>
    </div>
  );
}
