'use client';
import { useEffect, useRef, useState } from 'react';
import { Im, type Durum } from './temel';

/* 15 · GraphCanvas — 02-components §15.
   İlişki ve topoloji tek bileşen. İlk render YALNIZ bölgeleri ve kritik
   düğümleri gösterir; varlık kırılımı etkileşimle açılır (yoğunluk §A2).

   Akış animasyonu yalnız yön anlatır ve bilgi TAŞIMAZ: yön ayrıca kenar
   sırasıyla kodlanır, azaltılmış harekette kesik çizgi durur (04 §16).
   Ambient döngü ekran dışındayken ve sekme gizliyken durur (04 §4). */

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
  /** aktif yönetişim/OT zinciri — akan kesik çizgi */
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
  /* Düğümler mutlak konumlu, yani tuval içerikle BÜYÜMEZ: yükseklik
     CSS'te 388px'e sabitliyken kaç düğüm çizilebileceği de sabitleniyordu
     (dörtten fazlası üst üste biniyor). Daha kalabalık bir kapsam gösteren
     ekran kendi yüksekliğini verir; verilmezse CSS varsayılanı kalır. */
  yukseklik?: number;
}) {
  const kokRef = useRef<HTMLDivElement | null>(null);
  const [gorunur, setGorunur] = useState(false);

  // Ekran dışında ve sekme gizliyken akış döngüsü durur (performans kuralı).
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
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              vectorEffect="non-scaling-stroke"
              className={`kenar${k.aktif ? ' aktif' : ''}${k.aktif && gorunur ? ' akis-kenar' : ''}`}
              style={{ opacity: ilgili ? 1 : 0.3,
                transition: 'opacity var(--mo-topo) var(--ez-out)' }}
            />
          );
        })}
      </svg>

      {dugumler.map((d) => (
        <button
          key={d.id}
          type="button"
          className="dugum"
          aria-current={odak === d.id ? 'true' : undefined}
          style={{
            left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -50%)',
            borderColor: d.kritik ? 'var(--aksan)' : undefined,
            borderWidth: d.kritik ? 1.5 : undefined,
            background: d.kritik ? 'rgba(50,32,18,.90)' : undefined,
            opacity: !odak || odak === d.id ? 1 : 0.55,
          }}
          onClick={() => odakla?.(d.id)}
        >
          {d.ustEtiket && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 4, fontFamily: 'var(--veri)', fontSize: 'var(--t-caption)',
              letterSpacing: 'var(--tr-caption)', textTransform: 'uppercase',
              color: 'var(--aksan)' }}>
              {d.durum && <Im durum={d.durum} />}
              {d.ustEtiket}
            </span>
          )}
          <span className="ad">{d.ad}</span>
          <span className="alt">{d.alt}</span>
        </button>
      ))}

      {dipNot && <span className="dip">{dipNot}</span>}
    </div>
  );
}
