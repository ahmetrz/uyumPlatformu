import type { Metadata } from 'next';
import Link from 'next/link';
import SistemSayfasi from '@/components/kabuk/SistemSayfasi';

/* 404 — kök seviyede: kabuğun altındaki rotalar da, dışındakiler de
   buraya düşer. Yanlış adres bir KULLANICI hatası değil, çoğu zaman
   taşınmış bir bağlantıdır; o yüzden çıkış yolu ikili — ana ekran ve
   genel arama (Ctrl/⌘+K kabukta; burada kabuk yok, aramaya kapı
   tezgâhtan). */
export const metadata: Metadata = { title: 'Sayfa bulunamadı' };

export default function Bulunamadi() {
  return (
    <SistemSayfasi
      kod="404 · Sayfa yok"
      baslik="Bu adreste bir ekran yok."
      cumle="Bağlantı taşınmış ya da adres yanlış yazılmış olabilir. Aradığınız kaydı ana ekrandaki genel aramayla (Ctrl / ⌘ + K) bulabilirsiniz."
      eylemler={(
        <>
          <Link href="/" className="ab-dugme birincil">Ana ekrana dön</Link>
          <Link href="/uyum" className="ab-dugme">Uyum defteri</Link>
          <Link href="/envanter" className="ab-dugme">Varlık envanteri</Link>
        </>
      )}
    />
  );
}
