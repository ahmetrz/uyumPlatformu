import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import RisklerIstemci from './RisklerIstemci';
import { RISK_ICERIK, riskeCevir } from './ortak';

/* O3 · Risk Register — Atlas yerleşimi. Kabuk (ray + çekmece kolonu)
   (operasyonel)/layout.tsx tarafından verilir; burada UstCubuk ya da
   .icerik sarmalayıcısı YOK. */

export default async function Riskler() {
  await girisZorunlu();

  const [riskler, tumKodlar, kullanicilar, tesisler, sistemler, bulgular] = await Promise.all([
    db.risk.findMany({
      where: { silindi: null },
      include: RISK_ICERIK,
      orderBy: [{ artikRisk: 'desc' }, { kod: 'asc' }],
    }),
    db.risk.findMany({ select: { kod: true } }), // silinenler dahil — kod çakışmasın
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    db.tesis.findMany({ where: { durum: 'aktif' }, orderBy: { kod: 'asc' } }),
    db.sistemServis.findMany({ orderBy: { kod: 'asc' } }),
    db.bulgu.findMany({
      where: { silindi: null, durum: { in: ['acik', 'aksiyonda'] } },
      orderBy: { tespitTarihi: 'desc' },
    }),
  ]);

  // Kod önerisi: RSK-<yıl>-XXX — bu yılın en büyük sırası + 1
  const yil = new Date().getFullYear();
  const enBuyuk = tumKodlar.reduce((a, r) => {
    const m = /^RSK-(\d{4})-(\d+)$/.exec(r.kod);
    return m && Number(m[1]) === yil ? Math.max(a, Number(m[2])) : a;
  }, 0);
  const yeniKod = `RSK-${yil}-${String(enBuyuk + 1).padStart(3, '0')}`;

  return (
    <RisklerIstemci
      riskler={riskler.map(riskeCevir)}
      yeniKod={yeniKod}
      kullanicilar={kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad }))}
      tesisler={tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad }))}
      sistemler={sistemler.map((s) => ({ id: s.id, kod: s.kod, ad: s.ad }))}
      bulgular={bulgular.map((b) => ({ id: b.id, baslik: b.baslik }))}
    />
  );
}
