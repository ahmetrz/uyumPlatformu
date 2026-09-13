import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import AyarlarIstemci from './AyarlarIstemci';
import { ayarlarVerisi } from './veri';

export const metadata: Metadata = { title: 'Ayarlar' };

/* D31 · Ayarlar — "ben kimim, nereye girebiliyorum, oturumum ne durumda?"

   A tezgâh kabuğundadır; kabuk (ray + kapsam çubuğu) (operasyonel)/
   layout.tsx'ten gelir, rota → yön eşlemesi `components/kabuk/yonler.ts`
   içinde (eşleşmeyen rota A'ya düşer; ayrıca üst çubuk bağı olarak
   `UST_BAGLAR`da kayıtlı).

   Yetki kapısı YOK, yalnız oturum kapısı: kendi hesabını görmek bir modül
   yetkisi değildir — hiçbir modülde yetkisi olmayan bir hesap da adını
   düzeltip parolasını değiştirebilmeli. Yazma tarafı aynı kuralla
   `lib/eylemler2/hesap.ts` → `kendiHesabi()`.

   Ekranda OLMAYANLAR ve neden:
     · Bildirim tercihi — kanal modeli yok; şemada `Bildirim` yalnız
       uygulama içi kutuya yazılır (/bildirimler). Ekran bunu bir satırla
       söyler, sahte bir tercih formu çizmez.
     · Tema seçimi — platform tek koyu temadır (üç kabuk da koyu).
     · E-posta değişikliği — e-posta kimliktir; yönetici /yetkiler'den
       değiştirir ve iz oraya yazılır. */

export default async function Sayfa() {
  /* Sunucu saati BİR KEZ okunur: "kaç dakikadır açık", "24 saatte kaç
     ret" ve metrikler aynı andan türesin (kardeş ekranların kalıbı). */
  const simdi = new Date().getTime();
  const k = await girisZorunlu();
  const veri = await ayarlarVerisi(k, simdi);
  return <AyarlarIstemci veri={veri} simdi={simdi} />;
}
