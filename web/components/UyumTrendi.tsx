import { uyumOzeti } from '@/lib/sabitler';

/* Uyum trendi (§44): günlük anlık görüntülerden mini alan grafiği.
   Gün bazında tüm aktif süreçlerin durum sayıları toplanır. */
export default function UyumTrendi({ anlikler }: {
  anlikler: { tarih: string; ozetJson: string }[];
}) {
  // güne topla
  const gunler = new Map<string, Record<string, number>>();
  for (const a of anlikler) {
    const gun = a.tarih.slice(0, 10);
    const veri = JSON.parse(a.ozetJson) as { durumlar: Record<string, number> };
    const toplam = gunler.get(gun) ?? {};
    for (const [d, n] of Object.entries(veri.durumlar))
      toplam[d] = (toplam[d] ?? 0) + n;
    gunler.set(gun, toplam);
  }
  const seri = [...gunler.entries()]
    .map(([gun, sayilar]) => ({ gun, yuzde: uyumOzeti(sayilar).yuzde }))
    .filter((x) => x.yuzde !== null) as { gun: string; yuzde: number }[];

  if (seri.length < 2) {
    return (
      <div>
        <span className="metrik-buyuk" style={{ fontSize: 'var(--fs-h2)' }}>
          {seri[0] ? `%${seri[0].yuzde}` : '—'}
        </span>
        <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-xs)' }}>
          Trend için en az iki günlük anlık görüntü gerekir
        </div>
      </div>
    );
  }

  const G = 220, Y = 56;
  const min = Math.min(...seri.map((s) => s.yuzde)) - 4;
  const max = Math.max(...seri.map((s) => s.yuzde)) + 4;
  const x = (i: number) => (i / (seri.length - 1)) * G;
  const y = (v: number) => Y - ((v - min) / Math.max(1, max - min)) * Y;
  const cizgi = seri.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(s.yuzde).toFixed(1)}`).join(' ');
  const son = seri[seri.length - 1], ilk = seri[0];
  const fark = son.yuzde - ilk.yuzde;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)' }}>
        <span className="metrik-buyuk" style={{ fontSize: 'var(--fs-h2)' }}>%{son.yuzde}</span>
        <span className={`pill durum-${fark >= 0 ? 'uyumlu' : 'uyumsuz'}`}>
          {fark >= 0 ? '▲' : '▼'} {Math.abs(fark)} puan
        </span>
      </div>
      <svg width={G} height={Y + 4} aria-hidden style={{ overflow: 'visible' }}>
        <path d={`${cizgi} L${G},${Y + 2} L0,${Y + 2} Z`} fill="var(--chart-fill)" stroke="none" />
        <path d={cizgi} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinecap="round" />
        <circle cx={x(seri.length - 1)} cy={y(son.yuzde)} r="3" fill="var(--chart-1)" className="parilti" />
      </svg>
    </div>
  );
}
