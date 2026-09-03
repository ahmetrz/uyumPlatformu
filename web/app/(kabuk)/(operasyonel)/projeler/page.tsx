import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { db } from '@/lib/db';
import ProjelerIstemci from './ProjelerIstemci';
import { PROJE_ICERIK, projeyeCevir } from './ortak';

export const metadata: Metadata = { title: 'Dönüşüm portföyü' };

/* O8 · Transformation Portfolio — "hangi proje taahhüdünü tutmuyor?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx tarafından verilir;
   burada UstCubuk ya da .icerik sarmalayıcısı YOK.

   Sunucu yalnız veriyi toplar ve serileştirir; ilerleme, gecikme ve bütçe
   sapması `ortak.ts`teki saf yüklemlerden çıkar. `simdi` istekte bir kez
   okunup taşınır — istemci `Date.now()` çağırmaz, hidrasyon sapmaz. */

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'proje', 'okuma')) return <Yetkisiz rol="proje okuma" />;

  const simdi = new Date().getTime();
  const izinli = izinliTesisIdleri(kullanici, 'proje');
  /* KAPSAMSIZ sorulur ve bilinçlidir: `Proje` şemada `tesisId` TAŞIMAZ,
     `projeKaydet` kapısı da kapsamsızdır. Ekranı gevşetmek santral
     yöneticisine kaydedilmeyecek düğme göstermek olurdu. */
  const yazabilir = izinVar(kullanici, 'proje', 'yazma');

  const [projeler, kullanicilar, maddeler, bulgular] = await Promise.all([
    db.proje.findMany({
      where: { silindi: null },
      include: PROJE_ICERIK,
      orderBy: [{ hedef: 'asc' }, { kod: 'asc' }],
    }),
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    db.madde.findMany({ orderBy: { kod: 'asc' }, select: { id: true, kod: true, baslik: true } }),
    db.bulgu.findMany({
      where: { silindi: null },
      orderBy: { tespitTarihi: 'desc' },
      select: { id: true, baslik: true },
    }),
  ]);

  const cevrilmis = projeler.map(projeyeCevir);

  /* Kapsam VERİ seviyesinde daraltılır, ekranda değil. Tesise kısıtlı bir
     rol kendi santralinin projelerini görür; hiçbir santrale bağlanmamış
     proje PORTFÖY projesidir ve herkesi ilgilendirir, gizlenmez. */
  const gorunur = izinli === null
    ? cevrilmis
    : cevrilmis.filter((p) => p.tesisler.length === 0
      || p.tesisler.some((t) => izinli.includes(t.id)));

  // Kod önerisi: PRJ-<yıl>-XXX — bu yılın en büyük sırası + 1
  const yil = new Date(simdi).getFullYear();
  const enBuyuk = projeler.reduce((a, p) => {
    const m = /^PRJ-(\d{4})-(\d+)$/.exec(p.kod);
    return m && Number(m[1]) === yil ? Math.max(a, Number(m[2])) : a;
  }, 0);
  const yeniKod = `PRJ-${yil}-${String(enBuyuk + 1).padStart(3, '0')}`;

  return (
    <ProjelerIstemci
      projeler={gorunur}
      simdi={simdi}
      yeniKod={yeniKod}
      yazabilir={yazabilir}
      kullanicilar={kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad }))}
      maddeler={maddeler.map((m) => ({ id: m.id, ad: `${m.kod} — ${m.baslik}` }))}
      bulgular={bulgular.map((b) => ({ id: b.id, ad: b.baslik }))}
    />
  );
}
