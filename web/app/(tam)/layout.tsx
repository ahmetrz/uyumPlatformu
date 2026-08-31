/* Tam ekran katmanı — F2 Enerji Portföyü gibi kendi üst çubuğunu taşıyan,
   nav rayı olmayan boardlar. Token kapsamı (.atlas) yine gerekli. */
export default function TamYerlesim({ children }: { children: React.ReactNode }) {
  return <div className="atlas">{children}</div>;
}
