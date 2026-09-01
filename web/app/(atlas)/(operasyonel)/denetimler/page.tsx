import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/abacus/temel';
import { db } from '@/lib/db';
import DenetimlerIstemci from './DenetimlerIstemci';
import { DENETIM_ICERIK, denetimeCevir } from './ortak';

export const metadata: Metadata = { title: 'Denetim programı' };

/* O5 · Audit Overview — "hangi denetim takvimini tutmuyor?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Kapsam VERİ seviyesinde daraltılır: kullanıcının denetim okuma yetkisi
   tesise kısıtlıysa yalnız o santralleri kapsayan denetimler görünür.
   Kapsamı hiç girilmemiş denetim portföy geneli sayılır ve gizlenmez —
   aksi hâlde kapsam eksikliği kaydı görünmez kılar. */

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'denetim', 'okuma')) return <Yetkisiz rol="denetim okuma" />;

  const izinli = izinliTesisIdleri(kullanici, 'denetim');
  const yazabilir = izinVar(kullanici, 'denetim', 'yazma');

  // `Date.now()` istek başına bir kez okunur; metrik, çizelge ve tablo
  // aynı "bugün"ü paylaşsın.
  const simdi = new Date().getTime();

  const [ham, tumKodlar, surecler] = await Promise.all([
    db.denetim.findMany({
      where: { silindi: null },
      include: DENETIM_ICERIK,
      orderBy: [{ planBaslangic: 'asc' }, { kod: 'asc' }],
    }),
    db.denetim.findMany({ select: { kod: true } }), // silinenler dahil — kod çakışmasın
    db.uyumSureci.findMany({ include: { regulasyon: true }, orderBy: { kod: 'asc' } }),
  ]);

  const hepsi = ham.map((d) => denetimeCevir(d, simdi));
  const denetimler = izinli === null
    ? hepsi
    : hepsi.filter((d) => d.tesisler.length === 0
      || d.tesisler.some((t) => izinli.includes(t.id)));

  // Kod önerisi: DEN-<yıl>-XXX — bu yılın en büyük sırası + 1
  const yil = new Date(simdi).getFullYear();
  const enBuyuk = tumKodlar.reduce((a, d) => {
    const m = /^DEN-(\d{4})-(\d+)$/.exec(d.kod);
    return m && Number(m[1]) === yil ? Math.max(a, Number(m[2])) : a;
  }, 0);
  const yeniKod = `DEN-${yil}-${String(enBuyuk + 1).padStart(3, '0')}`;

  return (
    <DenetimlerIstemci
      denetimler={denetimler}
      simdi={simdi}
      yeniKod={yeniKod}
      yazabilir={yazabilir}
      surecler={surecler.map((s) => ({
        id: s.id, kod: s.kod, ad: s.ad, regKod: s.regulasyon.kod,
      }))}
    />
  );
}
