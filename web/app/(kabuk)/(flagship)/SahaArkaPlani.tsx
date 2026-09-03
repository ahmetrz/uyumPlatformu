'use client';
import { useEffect, useState } from 'react';
import {
  SAHA_ARKA_PLANLARI, SAHA_ARKA_PLAN_ANAHTARI, sonrakiIndeks,
} from '@/lib/sahaArkaPlan';

/* Saha · fotoğrafik alanın fonu. Katman sırası (kabuk.css `.ab-b-fon`):
   görsel → `.perde` karanlık/kontrast → çizim yüzeyi → veri → etkileşim.

   - SSR ve ilk istemci çizimi 0. görsel (deterministik → hydration
     uyuşmazlığı yok; `fetchPriority="high"` LCP adayı sunucudan gelir).
   - Bağlanınca oturumun son indeksinden bir sonraki seçilir; hedef
     görsel arka planda yüklenip DECODE edildikten sonra 400ms çapraz
     geçişle üste biner — yerleşim değişmez (her ikisi `inset: 0`).
   - Diğer görsel boşta (idle) düşük öncelikle ön yüklenir; havuz aynı
     anda tam çözünürlükte istenmez.
   - Zamanlayıcı yok: aynı görünümde görsel kendiliğinden dönmez. */

const GECIS_MS = 400;

/* Bu sayfa yüklemesinde seçilen hedef. Modül düzeyinde tutulur ki efekt
   birden çok kez koşsa da (StrictMode çift çağrı, istemci içi geri
   dönüş) sessionStorage sayacı yalnız BİR kez ilerlesin: dönüşüm yalnız
   sayfa yeniden yüklenince olur. */
let yuklemeHedefi: number | null = null;

function hedefiSec(): number {
  if (yuklemeHedefi !== null) return yuklemeHedefi;
  let son: string | null = null;
  try { son = window.sessionStorage.getItem(SAHA_ARKA_PLAN_ANAHTARI); } catch { /* özel mod */ }
  // İlk ziyaret: 0 gösterilir ve kaydedilir; geçiş yok.
  yuklemeHedefi = son === null ? 0 : sonrakiIndeks(son);
  try { window.sessionStorage.setItem(SAHA_ARKA_PLAN_ANAHTARI, String(yuklemeHedefi)); } catch { /* özel mod */ }
  return yuklemeHedefi;
}

export function SahaArkaPlani() {
  const [ustIndeks, setUstIndeks] = useState<number | null>(null);
  const [ustHazir, setUstHazir] = useState(false);

  useEffect(() => {
    let iptal = false;
    const hedef = hedefiSec();

    const zamanlayicilar: number[] = [];
    const onYukle = (i: number, oncelik: 'high' | 'low') => {
      const g = new Image();
      g.fetchPriority = oncelik;
      g.decoding = 'async';
      g.src = SAHA_ARKA_PLANLARI[i].src;
      return g;
    };

    if (hedef !== 0) {
      const g = onYukle(hedef, 'high');
      const goster = () => {
        if (iptal) return;
        setUstIndeks(hedef);
        // bir kare sonra opaklık: geçiş CSS'te, yerleşim sabit
        zamanlayicilar.push(window.requestAnimationFrame(() => { if (!iptal) setUstHazir(true); }));
      };
      g.decode().then(goster, goster);
    }

    // Kalan(lar) boşta, düşük öncelikle (sonraki yüklemede hazır olsun).
    const kalanlariYukle = () => {
      SAHA_ARKA_PLANLARI.forEach((_, i) => { if (i !== 0 && i !== hedef) onYukle(i, 'low'); });
    };
    const idleVar = 'requestIdleCallback' in window; // Safari'de yok
    const bosta = idleVar
      ? window.requestIdleCallback(kalanlariYukle, { timeout: 4000 })
      : window.setTimeout(kalanlariYukle, 2500);

    return () => {
      iptal = true;
      zamanlayicilar.forEach((z) => window.cancelAnimationFrame(z));
      if (idleVar) window.cancelIdleCallback(bosta);
      else window.clearTimeout(bosta);
    };
  }, []);

  const taban = SAHA_ARKA_PLANLARI[0];
  const ust = ustIndeks === null ? null : SAHA_ARKA_PLANLARI[ustIndeks];

  return (
    <div className="ab-b-fon" aria-hidden data-gorsel={ustHazir && ustIndeks !== null ? ustIndeks : 0}>
      {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım */}
      <img src={taban.src} alt="" decoding="async" fetchPriority="high"
        style={{ objectPosition: taban.konum }} />
      {ust && (
        // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım
        <img src={ust.src} alt="" decoding="async" className={`ust${ustHazir ? ' hazir' : ''}`}
          style={{ objectPosition: ust.konum, transitionDuration: `${GECIS_MS}ms` }} />
      )}
    </div>
  );
}
