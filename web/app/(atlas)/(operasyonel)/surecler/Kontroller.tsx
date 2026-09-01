'use client';
import { useEffect, useRef } from 'react';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';

/* Filtre şeridinin sağ ucundaki kapsam kontrolleri — kutu yok, kenarlık yok:
   arama tek satır alt çizgili girdi, açılır listeler 9.5px mono
   (02-components §4). Süreç kütüğünün iki rotası (liste ve kayıt) aynı
   kontrolleri kullanır; iki dosyada iki ayrı kopya tutulmaz. */

export function Ara({ deger, degistir, etiket }: {
  deger: string; degistir: (v: string) => void; etiket: string;
}) {
  return (
    <input
      className="ab-gr"
      aria-label={etiket}
      placeholder="Ara"
      value={deger}
      onChange={(e) => degistir(e.target.value)}
      style={{
        width: 118, background: 'none', border: 0,
        borderBottom: 'var(--bw-hair) solid var(--hr2)',
        padding: '3px 0', fontFamily: 'var(--veri)', fontSize: 'var(--t-label)',
        letterSpacing: 'var(--tr-label)', textTransform: 'uppercase',
      }}
    />
  );
}

/** Açılır listeyi dışarı tık ve Esc kapatır — açık kalan menü tabloyu örter. */
export function disariKapat(kok: React.RefObject<HTMLDetailsElement | null>) {
  const kapat = (e: Event) => {
    const d = kok.current;
    if (!d?.open) return;
    if (e.type === 'keydown') {
      if ((e as KeyboardEvent).key === 'Escape') d.open = false;
      return;
    }
    if (!d.contains(e.target as Node)) d.open = false;
  };
  document.addEventListener('mousedown', kapat);
  document.addEventListener('keydown', kapat);
  return () => {
    document.removeEventListener('mousedown', kapat);
    document.removeEventListener('keydown', kapat);
  };
}

export function Kapsam({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  const secim = secenekler.find((s) => s.id === aktif);
  const kok = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => disariKapat(kok), []);

  return (
    <details ref={kok} style={{ position: 'relative' }}>
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 200,
        maxHeight: 300, overflowY: 'auto', background: 'var(--panel)',
        border: 'var(--bw-strong) solid var(--hr2)', boxShadow: 'none',
        padding: 'var(--s8)',
      }}>
        {[{ id: '', ad: 'Tümü' }, ...secenekler].map((s) => (
          <button key={s.id} type="button" className="ab-filtre"
            style={{ display: 'block', width: '100%', textAlign: 'left' }}
            aria-pressed={(aktif ?? '') === s.id}
            onClick={(e) => {
              sec(s.id === '' ? null : s.id);
              e.currentTarget.closest('details')?.removeAttribute('open');
            }}>
            {s.ad}
          </button>
        ))}
      </div>
    </details>
  );
}

/** Dışa aktarım filtre bütçesinin dışında, tabloyu izleyen tek sessiz bağlantı. */
export function DisaAktar({ dosya, sayfaAdi, basliklar, satirlar }: {
  dosya: string;
  sayfaAdi: string;
  basliklar: string[];
  satirlar: (string | number)[][];
}) {
  const kok = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => disariKapat(kok), []);

  const kapatVe = (e: React.MouseEvent, is: () => void) => {
    e.currentTarget.closest('details')?.removeAttribute('open');
    is();
  };

  return (
    <details ref={kok} className="ab-baskida-gizle" style={{ position: 'relative' }}>
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        ⤓ Dışa aktar <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', bottom: '100%', right: 0, zIndex: 5, minWidth: 150,
        background: 'var(--panel)', border: 'var(--bw-strong) solid var(--hr2)',
        boxShadow: 'none', padding: 'var(--s8)',
      }}>
        <button type="button" className="ab-filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, () => exceleAktar(dosya, [{
            ad: sayfaAdi, satirlar: [basliklar, ...satirlar],
          }]))}>
          Excel
        </button>
        <button type="button" className="ab-filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, pdfYazdir)}>
          PDF
        </button>
      </div>
    </details>
  );
}
