import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir } from '@/app/kapsam';
import { HEDEF_ALANLAR } from '@/lib/entegrasyon/varlikAktarim';
import VarlikAktarimIstemci, { type AlanSecenegi } from './VarlikAktarimIstemci';
import { varlikAktarimVerisi } from './veri';

export const metadata: Metadata = { title: 'Varlık aktarımı' };

/* CMDB toplu aktarımı (P1-2) — "bu dosyayı envantere almak güvenli mi?"
   Yerleşim kabuğu (operasyonel)/layout.tsx'ten gelir; bu sayfa yalnız
   <main> ve seçim varsa <aside class="cekmece"> render eder.

   Sunucu tarafında ham satırlar İSTEMCİYE GÖNDERİLMEZ: dosya binlerce satır
   olabilir ve içeriği ekranda yaşamaz. Yalnız önizleme (ilk 20), hata listesi
   ve yinelenen listesi taşınır — kalanı raporda durur.

   Santral kapsamı `veri.ts`te uygulanır (modül: `envanter`). */

export default async function Sayfa() {
  const k = await girisZorunlu();
  /* Modül kapısı `modulOkuyabilir` ile sorulur, `izinVar(...,'okuma')` ile
     DEĞİL: ikincisi kapsamsız (global) bir okuma sorar ve tesise kısıtlı
     her kullanıcıyı ekrandan tümüyle atardı (bkz. app/kapsam.ts). */
  if (!modulOkuyabilir(k, 'envanter')) return <Yetkisiz rol="envanter okuma" />;

  const veri = await varlikAktarimVerisi(k);

  const alanlar: AlanSecenegi[] = HEDEF_ALANLAR.map((a) => ({
    anahtar: a.anahtar, etiket: a.etiket, tip: a.tip,
    zorunlu: a.zorunlu ?? false,
    sozluk: a.sozluk ? [...a.sozluk] : null,
  }));

  return (
    <VarlikAktarimIstemci
      aktarimlar={veri.aktarimlar}
      alanlar={alanlar}
      yukleyebilir={veri.yukleyebilir}
      onizlemeButcesi={veri.onizlemeButcesi}
      tanimliKodlar={veri.tanimliKodlar}
      kapsamli={veri.kapsamli}
    />
  );
}
