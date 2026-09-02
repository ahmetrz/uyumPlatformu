import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import Genel from './Genel';
import { genelEkranVerisi } from './veri';

export const metadata: Metadata = { title: 'Bugün' };

/* F1 · Executive Overview — "bugün neyin yönetim dikkatine ihtiyacı var?"
   Hiyerarşi: bir kart baskındır; şerit bağlamdır; kuyruk kuyruktur.
   Grup özeti şeritte yaşar, ayrı bir modül olarak DEĞİL (§F1).

   Santral kapsamı `veri.ts`te uygulanır; her toplam kendi modülünün
   kapsamıyla daraltılır (uyum · risk · denetim). */

export default async function Sayfa() {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const veri = await genelEkranVerisi(k);

  return (
    <Genel
      kullanici={veri.kullanici}
      bugun={veri.bugun}
      ozet={veri.ozet}
      odak={veri.odak}
      kuyruk={veri.kuyruk}
      toplamKayit={veri.toplamKayit}
      kapsamli={veri.kapsamli}
      santraller={veri.santraller}
      tipler={veri.tipler}
      risk={veri.risk}
      takvim={veri.takvim}
      akis={veri.akis}
      egilim={veri.egilim}
    />
  );
}
