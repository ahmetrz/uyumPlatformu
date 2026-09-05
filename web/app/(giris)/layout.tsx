/* Giriş kabuğu — GEÇİRGENDİR: ray, üst çubuk, komut paleti YOKTUR.

   Eskiden /giris operasyonel kabuk grubunun içindeydi ve o grubun kabuğu 244px'lik
   navigasyon rayını render ediyordu: oturum açmamış bir ziyaretçi
   uygulamanın bilgi mimarisinin tamamını görüyor, rayın odaklanabilir
   bağlantıları da klavye sırasına giriyordu. Kendi grubuna alındı. */

export default function GirisYerlesim({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
