'use client';
import { useEffect, useRef, useState } from 'react';
import { Im, type Durum } from './temel';

/* ═══════════════════════════════════════════════════════════════════════
   GRAFİK TUVALİ

   `a-assets` prototipinin tuvali: 22px nokta ızgarası, 168×46px kutu
   düğümler, eğri kenarlar, aktif zincirde AKAN kesik çizgi. Kademeli
   açılım: bir düğüme tıklayınca komşu katman öne çıkar, diğerleri
   SÖNÜMLENİR — kaybolmaz.

   Sözleşme aynen devralındı: akış animasyonu YÖNDEN başka bilgi taşımaz
   (yön ayrıca kenar sırasıyla kodludur), azaltılmış harekette durur,
   ekran dışındayken ve sekme gizliyken döngü kapanır. */

export type Dugum = {
  id: string;
  ad: string;
  alt: string;
  /** yüzde cinsinden konum — statik yerleşim, animasyon edilmez */
  x: number;
  y: number;
  kritik?: boolean;
  durum?: Durum;
  ustEtiket?: string;
};

export type Kenar = {
  kaynak: string;
  hedef: string;
  etiket?: string;
  aktif?: boolean;
};

export function Tuval({
  dugumler, kenarlar, odak, odakla, dipNot, yukseklik,
}: {
  dugumler: Dugum[];
  kenarlar: Kenar[];
  odak?: string | null;
  odakla?: (id: string) => void;
  dipNot?: string;
  yukseklik?: number;
}) {
  const kokRef = useRef<HTMLDivElement | null>(null);
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    const el = kokRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([g]) => setGorunur(g.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    const gizlilik = () => setGorunur(!document.hidden && !!el.getBoundingClientRect().height);
    document.addEventListener('visibilitychange', gizlilik);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', gizlilik); };
  }, []);

  const konum = (id: string) => {
    const d = dugumler.find((x) => x.id === id);
    return d ? { x: d.x, y: d.y } : { x: 0, y: 0 };
  };

  return (
    <div className="ab-tuval" ref={kokRef}
      style={yukseklik ? { minHeight: yukseklik } : undefined}>
      <svg aria-hidden preserveAspectRatio="none" viewBox="0 0 100 100">
        {kenarlar.map((k, i) => {
          const a = konum(k.kaynak);
          const b = konum(k.hedef);
          const ilgili = !odak || odak === k.kaynak || odak === k.hedef;
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              vectorEffect="non-scaling-stroke"
              className={`kenar${k.aktif ? ' aktif' : ''}${k.aktif && gorunur ? ' akis' : ''}`}
              style={{ opacity: ilgili ? 1 : 0.3 }} />
          );
        })}
      </svg>

      {dugumler.map((d) => (
        <button key={d.id} type="button"
          className={`dugum${d.kritik ? ' kritik' : ''}${odak === d.id ? ' on' : ''}`}
          aria-current={odak === d.id ? 'true' : undefined}
          style={{ left: `${d.x}%`, top: `${d.y}%`,
            /* Sönümlenen düğüm ERİŞİLEBİLİR kalır; opaklık bir sıralama
               işaretidir, erişim kısıtı değil (harita §7 kusur 4). */
            opacity: !odak || odak === d.id ? 1 : 0.52 }}
          onClick={() => odakla?.(d.id)}>
          {d.ustEtiket && (
            <span className="ust">
              {d.durum && <Im durum={d.durum} />}
              <span className="mono">{d.ustEtiket}</span>
            </span>
          )}
          <span className="ad">{d.ad}</span>
          <span className="mono alt">{d.alt}</span>
        </button>
      ))}

      {dipNot && <span className="mono dip">{dipNot}</span>}
    </div>
  );
}
