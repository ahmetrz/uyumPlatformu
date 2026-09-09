import Link from 'next/link';
/* HATA EKRANI ÜRÜNÜN ADINI BASAR, KİRACININ ADINI DEĞİL (P7 · ölçüldü).

   Bu yüzey bir İSTEMCİ sınırından da çizilir (`app/error.tsx`,
   `app/global-error.tsx`) ve orada `NEXT_PUBLIC_*` değeri İSTEMCİ
   PAKETİNE DERLEME ANINDA gömülüdür. Kiracı adını basmak, `Ada Enerji`
   kurulumundaki bir kullanıcıya hata anında BAŞKA bir kiracının adını
   göstermek olurdu (bağımsız inceleme bulgusu).

   Kiracı adı kurulumdan gelir ve sunucudan veri olarak iner
   (`KabukVerisi.kiraciAd`); hata sınırında o veri YOKTUR — zaten hata
   sınırının işi kurulumu tanıtmak değil, ürünü tanıtmaktır. */
import { MARKA_AD } from '@/lib/marka';
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
          <Link href="/" className="marka" aria-label={`${MARKA_AD} — ana ekran`}>
            {MARKA_AD.toLocaleUpperCase('tr-TR')}
          </Link>
          {/* İkinci satır KURULUMUN adıydı (`KIRACI_AD`) ve kaldırıldı: bu
              yüzey istemci sınırından da çizilir, orada değer derleme
              sabitidir ve başka bir kiracının adını gösterirdi. Kalan
              boşluğa ürün adını İKİNCİ KEZ basmak sözcük markasını
              "ürün / ürün" yapardı — bu yüzden ikinci satır ekranın ne
              olduğunu söyler (bağımsız inceleme, tur 2). */}
          <span className="etiket">Sistem</span>
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
