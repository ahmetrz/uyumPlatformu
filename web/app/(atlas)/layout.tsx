import KomutPaleti from '@/components/KomutPaleti';

/* Atlas kök yerleşimi ray bakımından GEÇİRGENDİR: ray katmana aittir,
   burada değil. (flagship) kısa rayı + fotoğrafik ayağı, (operasyonel)
   iki bloklu listeyi verir. İç içe yerleşimler kompoze olduğu için burada
   bir ray render edilirse alt katmanınkiyle birlikte İKİSİ birden görünür.

   Komut paleti (Ctrl+K) BURADA monte edilir: eskiden yalnız (ozalit)
   kabuğundaydı ve o grup Faz 6'da boşaldığı için hiçbir Atlas ekranında
   çalışmıyordu. Global arama katmandan bağımsızdır, bu yüzden kökte. */
export default function AtlasYerlesim({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <KomutPaleti />
    </>
  );
}
