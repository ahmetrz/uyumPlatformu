import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri } from '@/lib/erisim';
import { modulOkuyabilir } from '@/app/kapsam';
import { kapsamAnahtari, kapsamSozlugu } from '@/lib/dil/sozlukOku';
import { tBas } from '@/lib/dil/terimler';
import { Yetkisiz } from '@/components/kabuk/temel';
import { portfoyEkranVerisi } from '@/app/(tam)/portfoy/veri';
import Karne from './Karne';

export async function generateMetadata(): Promise<Metadata> {
  const k = await girisZorunlu();
  const sozluk = await kapsamSozlugu(kapsamAnahtari(izinliTesisIdleri(k, 'uyum')));
  return { title: `${tBas(sozluk, 'portfoy')} uyum karnesi` };
}

/* UYUM KARNESİ — müşterinin YANINDA GÖTÜRDÜĞÜ tek sayfa.

   ── NİÇİN AYRI ROTA ───────────────────────────────────────────────────
   Yazdırılabilir bir özet, ekranın "yazdır" görünümü değildir: farklı
   bir soruya cevap verir ("denetime ne göstereceğim") ve paylaşılabilir
   olmalı. Deep-link edilebilir bir rota bunu verir; `/raporlar`ın bir
   sekmesi olsaydı adresi paylaşılamazdı.

   ── VERİ İKİNCİ KEZ HESAPLANMAZ ───────────────────────────────────────
   Kaynak `portfoyEkranVerisi`: uyum endeksi, tesis başına yüzde, açık
   bulgu ve risk sayıları zaten orada ve AYNI formülle hesaplanıyor.
   Karne kendi sorgusunu yazsaydı iki ekran aynı kiracıda farklı sayı
   gösterebilirdi — bir denetim çıktısında bu, belgenin kendisini
   şüpheli yapar.

   ── KAPSAM ────────────────────────────────────────────────────────────
   `portfoyEkranVerisi` kapsamı kendi içinde daraltıyor; karne de aynı
   kapsamı görür. Yetki kapısı burada da ayrıca durur. */
export default async function KarneSayfasi() {
  const k = await girisZorunlu();
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;
  const veri = await portfoyEkranVerisi(k);
  return (
    <Karne
      satirlar={veri.satirlar}
      endeks={veri.endeks}
      endeksSektor={veri.endeksSektor}
      kapsamli={veri.kapsamli}
    />
  );
}
