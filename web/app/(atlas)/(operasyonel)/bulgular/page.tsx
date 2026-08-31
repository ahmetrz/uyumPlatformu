import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import BulgularIstemci from './BulgularIstemci';

export const metadata: Metadata = { title: 'Bulgu & CAPA — Atlas' };

/* O7 · Bulgu & Düzeltici Aksiyon — "nerede takıldı?" (03-screens O7).
   Tek 5 kolonlu tablo soldan sağa bir ilerleme gibi okunur:
   bulgu · aksiyon · sahip · son tarih · doğrulama.
   Yerleşim kabuğu (.atlas atlas-kabuk + Ray) üst katmandan gelir; bu sayfa
   yalnız <main> ve seçim varsa <aside class="cekmece"> render eder. */

export default async function Sayfa() {
  await girisZorunlu();

  const bulgular = await db.bulgu.findMany({
    where: { silindi: null },
    include: {
      sorumlu: true,
      kapanisDogrulayan: true,
      aksiyonlar: {
        include: { sorumlu: true, dogrulayan: true },
        orderBy: [{ durum: 'asc' }, { hedef: 'asc' }],
      },
      maddeDurumu: {
        include: { madde: true, tesis: true, surec: { include: { regulasyon: true } } },
      },
    },
    orderBy: [{ durum: 'asc' }, { onemDerecesi: 'asc' }],
  });

  // Denetim izi çekmecede "bulgu → aksiyon → doğrulama" geçmişini besler.
  const aksiyonIdleri = bulgular.flatMap((b) => b.aksiyonlar.map((a) => a.id));
  const aksiyonunBulgusu = new Map(
    bulgular.flatMap((b) => b.aksiyonlar.map((a) => [a.id, b.id] as const)),
  );
  const izler = bulgular.length === 0 ? [] : await db.aktiviteKaydi.findMany({
    where: {
      OR: [
        { varlikTipi: 'Bulgu', varlikId: { in: bulgular.map((b) => b.id) } },
        ...(aksiyonIdleri.length ? [{ varlikTipi: 'Aksiyon', varlikId: { in: aksiyonIdleri } }] : []),
      ],
    },
    include: { aktor: true },
    orderBy: { zaman: 'desc' },
    take: 600,
  });

  const izHaritasi: Record<string, {
    id: string; aktor: string; eylem: string; varlikTipi: string;
    alan: string | null; once: string | null; sonra: string | null;
    dosya: string | null; zaman: string;
  }[]> = {};
  for (const i of izler) {
    const bulguId = i.varlikTipi === 'Bulgu' ? i.varlikId : aksiyonunBulgusu.get(i.varlikId);
    if (!bulguId) continue;
    const liste = (izHaritasi[bulguId] ??= []);
    if (liste.length >= 8) continue;   // çekmece 8 kaydı gösterir, gerisi kayıt ekranında
    liste.push({
      id: i.id, aktor: i.aktor?.adSoyad ?? 'Sistem', eylem: i.eylem, varlikTipi: i.varlikTipi,
      alan: i.alan, once: i.oncekiDeger, sonra: i.yeniDeger,
      dosya: i.dosyaAdi, zaman: i.zaman.toISOString(),
    });
  }

  const veri = bulgular.map((b) => ({
    id: b.id,
    baslik: b.baslik,
    aciklama: b.aciklama,
    durum: b.durum,
    onem: b.onemDerecesi,
    kaynak: b.kaynak,
    tespit: b.tespitTarihi.toISOString(),
    hedef: b.hedefTarih?.toISOString() ?? null,
    kapanma: b.kapanmaTarihi?.toISOString() ?? null,
    retestGerekli: b.retestGerekli,
    retestSonucu: b.retestSonucu,
    kapanisDogrulama: b.kapanisDogrulama?.toISOString() ?? null,
    kapanisDogrulayan: b.kapanisDogrulayan?.adSoyad ?? null,
    sorumlu: b.sorumlu?.adSoyad ?? null,
    maddeKod: b.maddeDurumu.madde.kod,
    maddeBaslik: b.maddeDurumu.madde.baslik,
    tesisId: b.maddeDurumu.tesisId,
    tesisKod: b.maddeDurumu.tesis.kod,
    tesisAd: b.maddeDurumu.tesis.ad,
    surecId: b.maddeDurumu.surecId,
    surecKod: b.maddeDurumu.surec.kod,
    regKod: b.maddeDurumu.surec.regulasyon.kod,
    aksiyonlar: b.aksiyonlar.map((a) => ({
      id: a.id, baslik: a.baslik, durum: a.durum,
      sorumlu: a.sorumlu?.adSoyad ?? null,
      hedef: a.hedef?.toISOString() ?? null,
      tamamlanma: a.tamamlanma?.toISOString() ?? null,
      dogrulama: a.dogrulamaDurumu,
      dogrulamaTarihi: a.dogrulamaTarihi?.toISOString() ?? null,
      dogrulayan: a.dogrulayan?.adSoyad ?? null,
      not: a.etkinlikNotu,
    })),
    iz: izHaritasi[b.id] ?? [],
  }));

  return <BulgularIstemci bulgular={veri} />;
}
