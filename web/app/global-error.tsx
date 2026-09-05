'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import './globals.css';
import './kabuk.css';

/* Kök yerleşim bile çökerse burası çizilir; kök yerleşimin YERİNE geçtiği
   için `<html>`/`<body>` ve stil yaprakları burada tekrar edilir. */
export default function KokHata({ error, reset }: {
  error: Error & { digest?: string }; reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <html lang="tr">
      <body>
        <div className="ab" data-yogunluk="operasyonel">
          <div className="ab-sistem-sayfa">
            <header>
              <Link href="/" className="marka">ZORLU ENERJİ</Link>
              <span className="etiket">Yönetişim Platformu</span>
            </header>
            <main>
              <p className="kod">500 · Uygulama hatası</p>
              <h1 className="ab-pano-basligi">Uygulama açılamadı.</h1>
              <p className="cumle">
                Kabuk yüklenemedi. Yeniden deneyin; sürerse sayfayı tümüyle
                yenileyin ve teknik ayrıntıdaki kayıt kimliğiyle destek isteyin.
              </p>
              <div className="eylem">
                <button type="button" className="ab-dugme birincil" onClick={reset}>Yeniden dene</button>
                <Link href="/" className="ab-dugme">Ana ekrana dön</Link>
              </div>
              {(error.digest || error.message) && (
                <details className="ab-teknik">
                  <summary>Teknik ayrıntı</summary>
                  <p className="mono">
                    {[error.digest && `Kayıt kimliği: ${error.digest}`, error.message]
                      .filter(Boolean).join(' · ')}
                  </p>
                </details>
              )}
            </main>
            <footer>BT/OT yönetişim · uyum · dönüşüm</footer>
          </div>
        </div>
      </body>
    </html>
  );
}
