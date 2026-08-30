import Link from 'next/link';
import type { Durum } from '@/lib/sabitler';
import { DURUM_ETIKET } from '@/lib/sabitler';

/** Durum pill'i — renk yalnızca durumu anlatır. */
export function Pill({ durum, etiket, hollow }: { durum: Durum; etiket?: string; hollow?: boolean }) {
  return (
    <span className={`pill durum-${durum}`}>
      <span className={`dot${hollow ? ' hollow' : ''}`} />
      {etiket ?? DURUM_ETIKET[durum]}
    </span>
  );
}

export type DurumSayilari = Partial<Record<Durum, number>>;

/** Durum dağılımı segment çubuğu. */
export function SegBar({ sayilar, yukseklik }: { sayilar: DurumSayilari; yukseklik?: number }) {
  const sira: Durum[] = ['uyumlu', 'kismi', 'uyumsuz', 'incelemede', 'degerlendirilmedi', 'kapsamdisi'];
  const toplam = sira.reduce((a, d) => a + (sayilar[d] ?? 0), 0);
  if (toplam === 0) return <div className="seg-bar" style={yukseklik ? { height: yukseklik } : undefined} />;
  return (
    <div className="seg-bar" style={yukseklik ? { height: yukseklik } : undefined}
      title={sira.filter((d) => sayilar[d]).map((d) => `${DURUM_ETIKET[d]}: ${sayilar[d]}`).join(' · ')}>
      {sira.map((d) =>
        sayilar[d] ? (
          <span key={d} className={`seg-${d}`} style={{ width: `${((sayilar[d] ?? 0) / toplam) * 100}%` }} />
        ) : null,
      )}
    </div>
  );
}

/** Uyum yüzdesi halkası — görünür olunca çizilir (Canlandir). */
export function Halka({ yuzde, cap = 84, kalinlik = 8 }: { yuzde: number | null; cap?: number; kalinlik?: number }) {
  const r = (cap - kalinlik) / 2;
  const cevre = 2 * Math.PI * r;
  const hedef = yuzde === null ? cevre : cevre * (1 - yuzde / 100);
  return (
    <div className="halka-sar halka-izle" style={{ position: 'relative', width: cap, height: cap }}>
      <svg className="halka" width={cap} height={cap}
        style={{ ['--cevre' as string]: `${cevre}px`, ['--hedef' as string]: `${hedef}px` }}>
        <circle className="iz" cx={cap / 2} cy={cap / 2} r={r} fill="none" strokeWidth={kalinlik} />
        <circle className="dolgu" cx={cap / 2} cy={cap / 2} r={r} fill="none" strokeWidth={kalinlik}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset var(--mo-draw) var(--ease-out)' }} />
      </svg>
      <span className="halka-metin" style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        fontSize: cap > 70 ? 'var(--fs-h2)' : 'var(--fs-sm)',
      }}>
        {yuzde === null ? '—' : `%${yuzde}`}
      </span>
    </div>
  );
}

/** Boş durum — isteğe bağlı illüstrasyonla. */
export function Bos({ baslik, altMetin, eylem, gorsel }: {
  baslik: string; altMetin?: string; eylem?: React.ReactNode; gorsel?: React.ReactNode;
}) {
  return (
    <div className="bos">
      {gorsel && (
        <span style={{ width: 'min(300px, 70%)', color: 'var(--text-3)', display: 'block' }}>
          {gorsel}
        </span>
      )}
      <span className="buyuk">{baslik}</span>
      {altMetin && <span>{altMetin}</span>}
      {eylem}
    </div>
  );
}

/** Madde kodu chip'i (mono). */
export function KodChip({ kod, href }: { kod: string; href?: string }) {
  const ic = <span className="chip mono">{kod}</span>;
  return href ? <Link href={href} className="chip mono">{kod}</Link> : ic;
}
