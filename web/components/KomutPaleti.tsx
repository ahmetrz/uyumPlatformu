'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ara, type AramaSonucu } from '@/lib/eylemler2/arama';

/* Global arama (Ctrl+K): tek kutudan tüm varlık tipleri; sonuçlar
   sunucuda kullanıcının tesis kapsamına göre daraltılır. */
export default function KomutPaleti() {
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState('');
  const [sonuclar, setSonuclar] = useState<AramaSonucu[]>([]);
  const [secili, setSecili] = useState(0);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const dinle = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setAcik((a) => !a); setSorgu(''); setSonuclar([]);
      }
      if (e.key === 'Escape') setAcik(false);
    };
    window.addEventListener('keydown', dinle);
    return () => window.removeEventListener('keydown', dinle);
  }, []);

  const arama = useCallback((deger: string) => {
    setSorgu(deger); setSecili(0);
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    zamanlayici.current = setTimeout(async () => {
      setSonuclar(deger.trim().length >= 2 ? await ara(deger) : []);
    }, 220);
  }, []);

  if (!acik) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'var(--scrim)',
      display: 'grid', placeItems: 'start center', paddingTop: '14vh' }}
      onClick={() => setAcik(false)}>
      <div className="kart" style={{ width: 'min(640px, calc(100vw - 32px))',
        boxShadow: 'var(--sh-3)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--border)' }}>
          <input autoFocus className="inp" style={{ width: '100%', fontSize: 'var(--fs-h3)' }}
            placeholder="Ara: tesis, madde, bulgu, risk, varlık, proje, denetim…"
            value={sorgu} onChange={(e) => arama(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSecili((s) => Math.min(s + 1, sonuclar.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSecili((s) => Math.max(s - 1, 0)); }
              if (e.key === 'Enter' && sonuclar[secili]) {
                setAcik(false); router.push(sonuclar[secili].yol);
              }
            }} />
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {sonuclar.map((s, i) => (
            <button key={`${s.tip}-${s.id}`} className="satir" style={{
              width: '100%', textAlign: 'left', background: i === secili ? 'var(--surface-2)' : 'none',
              border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit' }}
              onMouseEnter={() => setSecili(i)}
              onClick={() => { setAcik(false); router.push(s.yol); }}>
              <span className="chip">{s.tip}</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{s.baslik}</span>
              <span className="mikro-etiket">{s.altBilgi}</span>
            </button>
          ))}
          {sorgu.trim().length >= 2 && sonuclar.length === 0 && (
            <div className="bos" style={{ padding: 'var(--sp-6)' }}>Sonuç yok</div>
          )}
          {sorgu.trim().length < 2 && (
            <div className="mikro-etiket" style={{ padding: 'var(--sp-4)' }}>
              EN AZ 2 KARAKTER · ↑↓ GEZ · ENTER AÇ · ESC KAPAT
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
