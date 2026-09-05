import Link from 'next/link';
import type { ReactNode } from 'react';

/* Sistem sayfası — 404 · 500 · bakım. Kabuğun DIŞINDA yaşar (kök
   `not-found`, `global-error`) ama kabukla aynı dilde konuşur:
   `.ab` sarmalayıcısı paleti getirir. Sorunu
   adıyla söyler, çıkış yolunu yanına koyar; süsleme yok, resim yok.

   Sunucu ya da istemci bileşeninden çağrılabilir (server-only import yok):
   `error.tsx` istemci sınırıdır ve bu bileşeni doğrudan kullanır. */
export default function SistemSayfasi({ kod, baslik, cumle, eylemler, teknik, dip }: {
  /** Mono üst satır: "404 · Sayfa yok" gibi durum kodu + kısa ad. */
  kod: string;
  baslik: string;
  cumle: string;
  /** Kurtarma yolları; ilki birincil. Boşsa yalnız "Ana ekran" bağı çizilir. */
  eylemler?: ReactNode;
  /** Hata ayrıntısı (yalnız 500'de). İpucunda değil, açılır blokta. */
  teknik?: string;
  dip?: string;
}) {
  return (
    <div className="ab" data-yogunluk="operasyonel">
      <div className="ab-sistem-sayfa">
        <header>
          <Link href="/" className="marka" aria-label="Zorlu Enerji Yönetişim Platformu — ana ekran">
            ZORLU ENERJİ
          </Link>
          <span className="etiket">Yönetişim Platformu</span>
        </header>
        <main>
          <p className="kod">{kod}</p>
          <h1 className="ab-pano-basligi">{baslik}</h1>
          <p className="cumle">{cumle}</p>
          <div className="eylem">
            {eylemler ?? <Link href="/" className="ab-dugme birincil">Ana ekrana dön</Link>}
          </div>
          {teknik && (
            <details className="ab-teknik">
              <summary>Teknik ayrıntı</summary>
              <p className="mono">{teknik}</p>
            </details>
          )}
        </main>
        <footer>{dip ?? 'BT/OT yönetişim · uyum · dönüşüm'}</footer>
      </div>
    </div>
  );
}
