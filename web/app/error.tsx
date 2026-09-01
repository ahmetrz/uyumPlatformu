'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import SistemSayfasi from '@/components/kabuk/SistemSayfasi';

/* 500 — kök hata sınırı. Sunucu bileşeni fırlatırsa Next hata nesnesinin
   mesajını üretimde SİLER ve `digest` bırakır; kullanıcıya gösterilecek
   tek güvenilir kimlik odur (destek talebinde aranır). Mesaj yalnız
   geliştirmede görünür. `reset` segmenti yeniden dener — tam sayfa
   yüklemesi değil, o yüzden ayrıca "ana ekran" bağı var. */
export default function Hata({ error, reset }: {
  error: Error & { digest?: string }; reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);
  const teknik = [error.digest && `Kayıt kimliği: ${error.digest}`, error.message]
    .filter(Boolean).join(' · ');
  return (
    <SistemSayfasi
      kod="500 · Sunucu hatası"
      baslik="Ekran yüklenirken bir hata oluştu."
      cumle="Veriniz kaybolmadı; kayıt işlemleri denetim izinde durur. Yeniden deneyin, sürerse teknik ayrıntıdaki kayıt kimliğiyle destek isteyin."
      teknik={teknik || undefined}
      eylemler={(
        <>
          <button type="button" className="ab-dugme birincil" onClick={reset}>Yeniden dene</button>
          <Link href="/" className="ab-dugme">Ana ekrana dön</Link>
        </>
      )}
    />
  );
}
