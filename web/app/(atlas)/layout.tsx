/* Atlas kök yerleşimi GEÇİRGENDİR: ray katmana aittir, burada değil.
   (flagship) kısa rayı + fotoğrafik ayağı, (operasyonel) 11 öğeli düz
   listeyi verir. İç içe yerleşimler kompoze olduğu için burada bir ray
   render edilirse alt katmanınkiyle birlikte İKİSİ birden görünür. */
export default function AtlasYerlesim({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
