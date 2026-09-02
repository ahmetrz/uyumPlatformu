import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import RisklerIstemci from './RisklerIstemci';
import { riskEkranVerisi } from './veri';

/* O3 · Risk Register — defter yerleşimi. Kabuk (ray + çekmece kolonu)
   (operasyonel)/layout.tsx tarafından verilir; burada UstCubuk ya da
   .icerik sarmalayıcısı YOK.

   Santral kapsamı, satır tavanı ve metrik sayımları `veri.ts`tedir
   (modül: `risk`); bu dosya yalnız oturumu doğrular ve sonucu istemciye
   verir. */

export default async function Riskler() {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'risk')) return <Yetkisiz rol="risk okuma" />;

  const veri = await riskEkranVerisi(k);

  return (
    <RisklerIstemci
      riskler={veri.riskler}
      yeniKod={veri.yeniKod}
      kullanicilar={veri.kullanicilar}
      tesisler={veri.tesisler}
      sistemler={veri.sistemler}
      bulgular={veri.bulgular}
      toplam={veri.toplam}
      metrikler={veri.metrikler}
      kapsamli={veri.kapsamli}
    />
  );
}
