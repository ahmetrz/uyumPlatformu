import Ray from '@/components/Ray';
import Canlandir from '@/components/Canlandir';
import KomutPaleti from '@/components/KomutPaleti';

/* Ozalit kabuğu — Atlas'a henüz taşınmamış ekranlar burada çalışır.
   Faz 5 sonunda bu grup boşalacak ve kaldırılacak. */

export default function OzalitYerlesim({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="shell">
        <Ray />
        <div className="govde">{children}</div>
      </div>
      <Canlandir />
      <KomutPaleti />
    </>
  );
}
