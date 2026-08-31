import { notFound } from 'next/navigation';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import { kucukGorsel } from '@/lib/atlas/gorsel';
import RiskDetayIstemci, { type DetayVerisi } from './RiskDetayIstemci';
import { RISK_ICERIK, riskeCevir } from '../ortak';

/* O4 · Risk Detail — "bu risk nasıl kapanacak?"
   Kapanma zinciri (kontrol boşluğu → bulgu → proje → doğrulama) ve skor
   eğilimi GERÇEK veriden türetilir; olmayan halka uydurulmaz, bilinmeyen
   elmasıyla ve "yok" notuyla gösterilir (06 §19). */

export async function generateStaticParams() {
  const riskler = await db.risk.findMany({ where: { silindi: null }, select: { id: true } });
  return riskler.map((r) => ({ id: r.id }));
}

export default async function RiskDetay({ params }: { params: Promise<{ id: string }> }) {
  await girisZorunlu();
  const { id } = await params;

  const ham = await db.risk.findUnique({ where: { id }, include: RISK_ICERIK });
  if (!ham || ham.silindi) notFound();

  const risk = riskeCevir(ham);

  const maddeIdleri = risk.kontroller.map((k) => k.id);
  const [aksiyonlar, bulguKapanis, maddeDurumlari, izler, kullanicilar,
    tesisler, sistemler, acikBulgular] = await Promise.all([
    // Aksiyonlar bulgu üzerinden yaşar (§ CAPA zinciri).
    risk.bulgu
      ? db.aksiyon.findMany({
          where: { bulguId: risk.bulgu.id },
          include: { sorumlu: { select: { adSoyad: true } } },
          orderBy: [{ hedef: 'asc' }, { baslangic: 'asc' }],
        })
      : Promise.resolve([]),
    risk.bulgu
      ? db.bulgu.findUnique({
          where: { id: risk.bulgu.id },
          select: {
            tespitTarihi: true, kapanmaTarihi: true, kapanisDogrulama: true,
            kapanisDogrulayan: { select: { adSoyad: true } },
          },
        })
      : Promise.resolve(null),
    maddeIdleri.length
      ? db.maddeDurumu.findMany({
          where: {
            maddeId: { in: maddeIdleri },
            ...(risk.tesis ? { tesisId: risk.tesis.id } : {}),
          },
          select: { maddeId: true, durum: true, sonDegerlendirme: true },
        })
      : Promise.resolve([]),
    // Skor eğilimi: değişmez iz kaydından — anlık görüntü uydurulmaz.
    db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'Risk', varlikId: id, alan: 'artikRisk' },
      select: { zaman: true, oncekiDeger: true, yeniDeger: true },
      orderBy: { zaman: 'asc' },
    }),
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    db.tesis.findMany({ where: { durum: 'aktif' }, include: { tip: true }, orderBy: { kod: 'asc' } }),
    db.sistemServis.findMany({ orderBy: { kod: 'asc' } }),
    db.bulgu.findMany({
      where: { silindi: null, durum: { in: ['acik', 'aksiyonda'] } },
      orderBy: { tespitTarihi: 'desc' },
    }),
  ]);

  /* Kontrol halkası: aynı madde birden çok santralde değerlendirilmişse
     EN KÖTÜ durum yönetir; hiç değerlendirilmemişse bilinmeyen kalır. */
  const KOTU_SIRA = ['uyumsuz', 'kismi', 'incelemede', 'degerlendirilmedi', 'uyumlu', 'kapsamdisi'];
  const siraNo = (d: string) => {
    const i = KOTU_SIRA.indexOf(d);
    return i < 0 ? KOTU_SIRA.length : i;
  };
  const kontrolDurumu = maddeDurumlari.length
    ? [...maddeDurumlari].sort((a, b) => siraNo(a.durum) - siraNo(b.durum))[0].durum
    : null;
  const kontrolTarihi = maddeDurumlari
    .map((m) => m.sonDegerlendirme)
    .filter((t): t is Date => !!t)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  /* Skor eğilimi: iz kayıtlarının ÖNCEKİ değerinden başlar, son nokta
     kaydın bugünkü artık skorudur. İki noktadan azsa eğilim BİLİNMEZ. */
  const noktalar: { zaman: string; deger: number | null }[] = [];
  if (izler.length) {
    const ilk = izler[0].oncekiDeger;
    noktalar.push({
      zaman: izler[0].zaman.toISOString(),
      deger: ilk && ilk !== 'bilinmiyor' ? Number(ilk) : null,
    });
    for (const iz of izler) {
      noktalar.push({
        zaman: iz.zaman.toISOString(),
        deger: iz.yeniDeger && iz.yeniDeger !== 'bilinmiyor' ? Number(iz.yeniDeger) : null,
      });
    }
  }
  if (noktalar.at(-1)?.deger !== risk.artikRisk) {
    noktalar.push({ zaman: risk.guncellendi, deger: risk.artikRisk });
  }

  const veri: DetayVerisi = {
    risk,
    aksiyonlar: aksiyonlar.map((a) => ({
      id: a.id, baslik: a.baslik, durum: a.durum,
      sorumlu: a.sorumlu?.adSoyad ?? null,
      hedef: a.hedef?.toISOString() ?? null,
      tamamlanma: a.tamamlanma?.toISOString() ?? null,
      dogrulamaDurumu: a.dogrulamaDurumu,
    })),
    bulguTespit: bulguKapanis?.tespitTarihi?.toISOString() ?? null,
    bulguKapanma: bulguKapanis?.kapanmaTarihi?.toISOString() ?? null,
    dogrulamaTarihi: bulguKapanis?.kapanisDogrulama?.toISOString() ?? null,
    dogrulayan: bulguKapanis?.kapanisDogrulayan?.adSoyad ?? null,
    kontrolDurumu,
    kontrolTarihi: kontrolTarihi?.toISOString() ?? null,
    trend: noktalar,
    kullanicilar: kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad })),
    tesisler: tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad })),
    sistemler: sistemler.map((s) => ({ id: s.id, kod: s.kod, ad: s.ad })),
    bulgular: acikBulgular.map((b) => ({ id: b.id, baslik: b.baslik })),
    santraller: tesisler.map((t) => ({
      id: t.id,
      ad: t.ad,
      alt: [t.kuruluGucMw ? `${t.kuruluGucMw} MWe` : null, t.konum]
        .filter(Boolean).join(' · ') || t.kod,
      tip: t.tip?.kod ?? '—',
      gorsel: kucukGorsel(t.gorselAnahtari),
      yol: `/tesisler/${t.id}`,
    })),
  };

  return <RiskDetayIstemci veri={veri} />;
}
