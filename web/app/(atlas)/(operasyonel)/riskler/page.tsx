import { girisZorunlu } from '@/lib/erisim';
import RisklerIstemci from './RisklerIstemci';
import { riskEkranVerisi } from './veri';

/* O3 · Risk Register — Atlas yerleşimi. Kabuk (ray + çekmece kolonu)
   (operasyonel)/layout.tsx tarafından verilir; burada UstCubuk ya da
   .icerik sarmalayıcısı YOK.

   Santral kapsamı, satır tavanı ve metrik sayımları `veri.ts`tedir
   (modül: `risk`); bu dosya yalnız oturumu doğrular ve sonucu istemciye
   verir. */

export default async function Riskler() {
  const k = await girisZorunlu();
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
