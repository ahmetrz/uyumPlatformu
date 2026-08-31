import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/atlas/temel';
import { db } from '@/lib/db';
import SureclerIstemci from './SureclerIstemci';
import { sayimla, type S } from './ortak';

export const metadata: Metadata = { title: 'Uyum süreçleri — Atlas' };

/* Uyum süreç kütüğü — "hangi kampanya denetim tarihine yetişmiyor?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Kapsam VERİ seviyesinde daraltılır: uyum okuma yetkisi tesise kısıtlıysa
   yalnız o santralleri kapsayan kampanyalar görünür ve sayaçlar da yalnız
   o tesislerin değerlendirmelerinden toplanır. Kapsamı hiç girilmemiş
   kampanya gizlenmez — aksi hâlde kapsam eksikliği kaydı görünmez kılardı. */

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma" />;

  const izinli = izinliTesisIdleri(kullanici, 'uyum');
  /* Tesise kısıtlı rol kapsamsız (global) yazma yapamaz ama KENDİ
     santralinde yazabilir — kapsam düğmesi bu yüzden global yetkiye değil,
     "en az bir izinli tesiste yazabiliyor mu"ya bakar. Sunucu her çağrıda
     tesis kapsamını yeniden doğrular. */
  const yazabilir = izinVar(kullanici, 'uyum', 'yazma')
    || (izinli ?? []).some((t) => izinVar(kullanici, 'uyum', 'yazma', { tesisId: t }));
  const onaylayabilir = izinVar(kullanici, 'uyum', 'onay');

  // `Date.now()` istek başına bir kez okunur; metrik, çizelge ve tablo
  // aynı "bugün"ü paylaşsın.
  const simdi = new Date().getTime();
  const tesisSuzgeci = izinli === null ? {} : { tesisId: { in: izinli } };

  const [ham, gruplar, acikBulgular, regulasyonlar, tesisler] = await Promise.all([
    db.uyumSureci.findMany({
      include: {
        regulasyon: { select: { id: true, kod: true, ad: true } },
        kapsam: { include: { tesis: { select: { id: true, kod: true, ad: true } } } },
        denetimler: { where: { silindi: null }, select: { id: true, kod: true, durum: true } },
      },
      orderBy: [{ bitis: 'asc' }, { kod: 'asc' }],
    }),
    db.maddeDurumu.groupBy({
      by: ['surecId', 'durum'],
      where: tesisSuzgeci,
      _count: { _all: true },
    }),
    db.bulgu.findMany({
      where: {
        silindi: null,
        durum: { in: ['acik', 'aksiyonda'] },
        maddeDurumu: tesisSuzgeci,
      },
      select: { maddeDurumu: { select: { surecId: true } } },
    }),
    db.regulasyon.findMany({
      where: { aktif: true },
      select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
    db.tesis.findMany({
      where: { durum: 'aktif', ...(izinli === null ? {} : { id: { in: izinli } }) },
      select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
  ]);

  const hamSayilar = new Map<string, Record<string, number>>();
  for (const g of gruplar) {
    const s = hamSayilar.get(g.surecId) ?? {};
    s[g.durum] = (s[g.durum] ?? 0) + g._count._all;
    hamSayilar.set(g.surecId, s);
  }

  const bulguSayisi = new Map<string, number>();
  for (const b of acikBulgular) {
    const id = b.maddeDurumu.surecId;
    bulguSayisi.set(id, (bulguSayisi.get(id) ?? 0) + 1);
  }

  const hepsi: S[] = ham.map((s) => ({
    id: s.id, kod: s.kod, ad: s.ad, durum: s.durum,
    baslangic: s.baslangic?.toISOString() ?? null,
    bitis: s.bitis?.toISOString() ?? null,
    aciklama: s.aciklama,
    regulasyon: s.regulasyon,
    tesisler: s.kapsam
      .map((k) => k.tesis)
      .filter((t) => izinli === null || izinli.includes(t.id)),
    sayim: sayimla(hamSayilar.get(s.id) ?? {}),
    acikBulgu: bulguSayisi.get(s.id) ?? 0,
    denetimler: s.denetimler,
  }));

  const surecler = izinli === null
    ? hepsi
    : hepsi.filter((s) => {
      const kapsamli = ham.find((x) => x.id === s.id)?.kapsam ?? [];
      return kapsamli.length === 0 || s.tesisler.length > 0;
    });

  return (
    <SureclerIstemci
      surecler={surecler}
      simdi={simdi}
      regulasyonlar={regulasyonlar}
      tesisler={tesisler}
      yazabilir={yazabilir}
      onaylayabilir={onaylayabilir}
    />
  );
}
