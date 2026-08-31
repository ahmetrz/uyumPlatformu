import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import YetkilerIstemci from './YetkilerIstemci';


export default async function Yetkiler() {
  await girisZorunlu();
  const [kullanicilar, surecler, tesisler] = await Promise.all([
    db.kullanici.findMany({
      include: { yetkiler: { include: {
        surec: { include: { regulasyon: true } }, tesis: true } } },
      orderBy: { adSoyad: 'asc' },
    }),
    db.uyumSureci.findMany({ where: { durum: { in: ['aktif', 'planlandi'] } },
      include: { regulasyon: true }, orderBy: { kod: 'asc' } }),
    db.tesis.findMany({ where: { durum: 'aktif' }, orderBy: { kod: 'asc' } }),
  ]);

  return (
    <>
      <UstCubuk baslik="Kullanıcı & yetki" />
      <main className="icerik">
        <YetkilerIstemci
          kullanicilar={kullanicilar.map((k) => ({
            id: k.id, ad: k.adSoyad, eposta: k.eposta, unvan: k.unvan, aktif: k.aktif,
            yetkiler: k.yetkiler.map((y) => ({
              id: y.id, rol: y.rol,
              surec: y.surec ? { kod: y.surec.kod, regKod: y.surec.regulasyon.kod } : null,
              tesis: y.tesis ? { kod: y.tesis.kod, ad: y.tesis.ad } : null,
            })),
          }))}
          surecler={surecler.map((s) => ({ id: s.id, kod: s.kod, regKod: s.regulasyon.kod }))}
          tesisler={tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad }))} />
      </main>
    </>
  );
}
