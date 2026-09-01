import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/abacus/temel';
import { db } from '@/lib/db';
import EslestirmeIstemci from './EslestirmeIstemci';
import { kisaKod, type E, type Kodlu, type M } from './mantik';

export const metadata: Metadata = { title: 'Çapraz eşleme — Abacus' };

/* Çapraz eşleme kütüğü — "hangi madde hangi maddeyi karşılıyor?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir.

   Eşleme bir TANIM kaydıdır (uyum değerlendirmesi değil), yetki bu yüzden
   `tanimlar` modülünden gelir. Yalnız YAPRAK maddeler eşleştirilir: bir
   bölüm başlığı kanıt taşımaz, dolayısıyla denkliği de olmaz.

   SANTRAL KAPSAMI: bu ekran BİLEREK kapsamsızdır, çünkü madde–madde denkliği
   iki regülasyon arasındaki kurum geneli bir iddiadır — `MaddeEslestirmesi`
   şemada `tesisId` taşımaz ve "ISO 27001 A.8.1 ≙ EPDK 5.2" cümlesi
   santralden santrale değişmez; santrale bağlanan şey denklik değil, o
   maddelerin santraldeki değerlendirmesidir. */

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'tanimlar', 'okuma')) return <Yetkisiz rol="tanımlar okuma" />;

  const yazabilir = izinVar(kullanici, 'tanimlar', 'yazma');

  const [regulasyonlar, maddeler, esler] = await Promise.all([
    db.regulasyon.findMany({
      where: { aktif: true },
      select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
    db.madde.findMany({
      where: { silindi: null, altMaddeler: { none: {} } },
      select: {
        id: true, kod: true, baslik: true, regulasyonId: true,
        regulasyon: { select: { kod: true } },
      },
      orderBy: { kod: 'asc' },
    }),
    db.maddeEslestirmesi.findMany({
      include: {
        kaynak: { select: { id: true, kod: true, baslik: true, regulasyonId: true,
          regulasyon: { select: { kod: true } } } },
        hedef: { select: { id: true, kod: true, baslik: true, regulasyonId: true,
          regulasyon: { select: { kod: true } } } },
      },
    }),
  ]);

  type Ham = {
    id: string; kod: string; baslik: string; regulasyonId: string;
    regulasyon: { kod: string };
  };
  const cevir = (m: Ham): M => ({
    id: m.id, kod: m.kod, kisaKod: kisaKod(m.kod, m.regulasyon.kod),
    baslik: m.baslik, regId: m.regulasyonId, regKod: m.regulasyon.kod,
  });

  const cerceveler: Kodlu[] = regulasyonlar;
  const veri: M[] = maddeler.map(cevir);
  const iliskiler: E[] = esler.map((e) => ({
    id: e.id, denklik: e.denklik, aciklama: e.aciklama,
    kaynak: cevir(e.kaynak), hedef: cevir(e.hedef),
  }));

  return (
    <EslestirmeIstemci
      cerceveler={cerceveler}
      maddeler={veri}
      esler={iliskiler}
      yazabilir={yazabilir}
    />
  );
}
