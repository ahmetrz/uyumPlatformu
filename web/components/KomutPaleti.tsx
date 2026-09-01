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
    /* Atlas gramerinde: yuvarlak köşe yok, chip yok, gölge yerine kenar.
       Eskiden Özalit sınıflarıyla (.kart, .chip) çiziliyordu ve yalnız
       (ozalit) kabuğunda monte olduğu için bu hiç göze batmıyordu; artık
       her Atlas ekranının üstünde açılıyor. */
    <div className="palet-perde" onClick={() => setAcik(false)}>
      <div className="palet" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Genel arama">
        <div className="palet-giris">
          <input autoFocus className="ab-gr" style={{ width: '100%' }}
            placeholder="Ara: santral, madde, bulgu, risk, varlık, proje, denetim…"
            value={sorgu} onChange={(e) => arama(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSecili((s) => Math.min(s + 1, sonuclar.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSecili((s) => Math.max(s - 1, 0)); }
              if (e.key === 'Enter' && sonuclar[secili]) {
                setAcik(false); router.push(sonuclar[secili].yol);
              }
            }} />
        </div>
        <div className="palet-liste" role="listbox" aria-label="Sonuçlar">
          {sonuclar.map((s, i) => (
            <button key={`${s.tip}-${s.id}`} type="button" role="option"
              className="palet-satir" aria-selected={i === secili}
              onMouseEnter={() => setSecili(i)}
              onClick={() => { setAcik(false); router.push(s.yol); }}>
              {/* Tür bir DURUM değil, bir sınıflandırma: rozet değil mono
                  etiket olarak yazılır (Part B3 chip yasağı). */}
              <span className="tur">{s.tip}</span>
              <span className="konu">{s.baslik}</span>
              <span className="alt">{s.altBilgi}</span>
            </button>
          ))}
          {sorgu.trim().length >= 2 && sonuclar.length === 0 && (
            <p className="palet-not">Sonuç yok</p>
          )}
          {sorgu.trim().length < 2 && (
            <p className="palet-not">EN AZ 2 KARAKTER · ↑↓ GEZ · ENTER AÇ · ESC KAPAT</p>
          )}
        </div>
      </div>
    </div>
  );
}
