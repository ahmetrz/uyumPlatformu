'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useEylem } from './useEylem';
import { bildirimOkundu } from '@/lib/eylemler2/bildirim';
import { zamanTR } from '@/lib/sabitler';

type B = { id: string; baslik: string; govde: string | null; tip: string;
  kaynakTipi: string | null; kaynakId: string | null; zaman: string };

export default function BildirimZili({ bildirimler }: { bildirimler: B[] }) {
  const [acik, setAcik] = useState(false);
  const { bekliyor, calistir } = useEylem();
  if (bildirimler.length === 0) return null;

  return (
    <span style={{ position: 'relative' }}>
      <button className="btn kucuk" onClick={() => setAcik(!acik)} aria-label="Bildirimler">
        🔔 <span className="mono">{bildirimler.length}</span>
      </button>
      {acik && (
        <div className="kart" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 360, zIndex: 60, boxShadow: 'var(--sh-3)' }}>
          <div className="kart-baslik" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
            <h3 style={{ fontSize: 'var(--fs-sm)' }}>Bildirimler</h3>
            <button className="btn kucuk" disabled={bekliyor}
              onClick={() => calistir(() => bildirimOkundu({ hepsi: true }), () => setAcik(false))}>
              Tümünü okundu yap
            </button>
          </div>
          <div className="kart-icerik sifir" style={{ maxHeight: 380, overflowY: 'auto' }}>
            {bildirimler.map((b) => (
              <div key={b.id} className="satir" style={{ alignItems: 'flex-start' }}>
                <span className={`dot`} style={{ marginTop: 6,
                  background: b.tip === 'eskalasyon' ? 'var(--uyumsuz-dot)'
                    : b.tip === 'uyari' ? 'var(--kismi-dot)' : 'var(--incelemede-dot)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 'var(--fs-sm)' }}>
                    {b.kaynakTipi === 'Bulgu' && b.kaynakId
                      ? <Link href={`/bulgular/${b.kaynakId}`}>{b.baslik}</Link> : b.baslik}
                  </div>
                  {b.govde && <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-xs)' }}>{b.govde}</div>}
                  <div className="mikro-etiket">{zamanTR(b.zaman)}</div>
                </div>
                <button className="kip-kapat" title="Okundu" disabled={bekliyor}
                  onClick={() => calistir(() => bildirimOkundu({ id: b.id }))}>✓</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
