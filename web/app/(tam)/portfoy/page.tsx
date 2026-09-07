import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri } from '@/lib/erisim';
import { kapsamAnahtari, kapsamSozlugu } from '@/lib/dil/sozlukOku';
import { tBas } from '@/lib/dil/terimler';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import Portfoy from './Portfoy';
import { portfoyEkranVerisi } from './veri';

/* Sekme başlığı SÖZLÜKTEN. Sabit `metadata` kiracı bağlamını
   bekleyemezdi (R0-8); `generateMetadata` async olabildiği için burada o
   sınır YOK — bağlam kullanıcının kapsamı. */
export async function generateMetadata(): Promise<Metadata> {
  const k = await girisZorunlu();
  const sozluk = await kapsamSozlugu(kapsamAnahtari(izinliTesisIdleri(k, 'uyum')));
  return { title: `${tBas(sozluk, 'portfoy')}` };
}

/* F2 · Portföy — "hangi tesis beni istiyor ve nasıl bir tesis bu?"
   Kapsam yalnız ÜRETİM portföyüdür: dağıtım ve perakende tüzel kişileri
   bu kurulumun kapsamı dışındadır ve veriye de girmez.

   Tesis kapsamı `veri.ts`te uygulanır (modül: `uyum`). */

export default async function Sayfa() {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const veri = await portfoyEkranVerisi(k);
  return (
    <Portfoy
      satirlar={veri.satirlar}
      toplamGucMw={veri.toplamGucMw}
      endeks={veri.endeks}
      kapsamli={veri.kapsamli}
    />
  );
}
