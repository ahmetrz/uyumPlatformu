import { notFound } from 'next/navigation';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import { uyumOzeti, gecikmisMi, gecenGun } from '@/lib/sabitler';
import Plant360 from './Plant360';

/* F3 · Plant 360 — "bu santral kontrol altında mı?" (5 saniyede okunur)
   Sunucu tarafı yalnız veriyi toplar ve serileştirir; sunum istemcide. */

export async function generateStaticParams() {
  const tesisler = await db.tesis.findMany({ select: { id: true } });
  return tesisler.map((t) => ({ id: t.id }));
}

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  await girisZorunlu();
  const { id } = await params;

  const tesis = await db.tesis.findUnique({
    where: { id },
    include: { tip: true, tuzelKisi: true, profil: true },
  });
  if (!tesis) notFound();

  const simdi = new Date();
  const [durumlar, bulgular, riskler, varliklar, denetimler, surecler, bolgeler, uniteler,
    tumTesisler] =
    await Promise.all([
      db.maddeDurumu.groupBy({ by: ['durum'], where: { tesisId: id }, _count: { _all: true } }),
      db.bulgu.findMany({
        where: { maddeDurumu: { tesisId: id }, durum: { in: ['acik', 'aksiyonda'] }, silindi: null },
        include: { sorumlu: { select: { adSoyad: true } },
          maddeDurumu: { include: { madde: { select: { kod: true, baslik: true } } } },
          aksiyonlar: { select: { durum: true } } },
        orderBy: [{ onemDerecesi: 'asc' }, { hedefTarih: 'asc' }],
        take: 6,
      }),
      db.risk.findMany({
        where: { tesisId: id, silindi: null, durum: { in: ['acik', 'islemde'] } },
        select: { id: true, kod: true, baslik: true, artikRisk: true, durum: true },
        orderBy: [{ artikRisk: 'desc' }], take: 4,
      }),
      db.varlik.findMany({
        where: { tesisId: id, silindi: null },
        select: { id: true, destekBitis: true }, }),
      db.denetimKapsami.findMany({
        where: { tesisId: id, denetim: { silindi: null } },
        include: { denetim: { select: { kod: true, ad: true, durum: true, planBitis: true } } },
      }),
      db.surecKapsami.findMany({
        where: { tesisId: id },
        include: { surec: { include: { regulasyon: { select: { kod: true } } } } },
      }),
      db.agBolgesi.count({ where: { tesisId: id } }),
      db.uretimUnitesi.count({ where: { tesisId: id } }),
      db.tesis.findMany({
        where: { durum: 'aktif' },
        select: { id: true, kod: true, ad: true, kuruluGucMw: true, gorselAnahtari: true,
          tip: { select: { kod: true, ad: true } } },
        orderBy: { ad: 'asc' },
      }),
    ]);

  const sayim = Object.fromEntries(durumlar.map((d) => [d.durum, d._count._all]));
  const ozet = uyumOzeti(sayim);
  const eos = varliklar.filter((v) => v.destekBitis && v.destekBitis < simdi).length;
  const gecikmisBulgu = bulgular.filter((b) => gecikmisMi(b.hedefTarih)).length;
  const yaklasanDenetim = denetimler
    .map((d) => d.denetim)
    .filter((d) => d.planBitis && d.planBitis > simdi)
    .sort((a, b) => (a.planBitis!.getTime() - b.planBitis!.getTime()))[0] ?? null;
  const enYuksekRisk = riskler[0] ?? null;

  return (
    <Plant360
      veri={{
        id: tesis.id,
        kod: tesis.kod,
        ad: tesis.ad,
        tipKod: tesis.tip?.kod ?? null,
        tipAdi: tesis.tip?.ad ?? 'Tesis',
        tuzelKisi: tesis.tuzelKisi?.ad ?? null,
        konum: tesis.konum,
        gucMw: tesis.kuruluGucMw,
        gorselAnahtari: tesis.gorselAnahtari,
        kritiklik: tesis.profil?.kritiklikSinifi ?? null,
        uniteSayisi: uniteler || null,
        // Uyum: bilinmeyen ASLA 0 sayılmaz — yüzde yalnız değerlendirilenden,
        // bilinmeyen oranı ayrıca taşınır (lib/sabitler.ts:uyumOzeti).
        uyumYuzde: ozet.yuzde,
        bilinmeyenOran: ozet.bilinmeyenOran,
        cerceveKodu: surecler[0]?.surec.regulasyon.kod ?? null,
        enYuksekRisk: enYuksekRisk
          ? { kod: enYuksekRisk.kod, baslik: enYuksekRisk.baslik, skor: enYuksekRisk.artikRisk }
          : null,
        acikBulgu: bulgular.length,
        gecikmisBulgu,
        yaklasanDenetim: yaklasanDenetim
          ? { kod: yaklasanDenetim.kod, ad: yaklasanDenetim.ad,
              // planBitis yukarıda "gelecekte" diye süzüldü; gecenGun negatif döner
              kalanGun: -gecenGun(yaklasanDenetim.planBitis!) }
          : null,
        eosVarlik: eos,
        varlikSayisi: varliklar.length,
        bolgeSayisi: bolgeler,
        surecSayisi: surecler.length,
        odak: bulgular[0]
          ? {
              id: bulgular[0].id,
              kod: bulgular[0].maddeDurumu.madde.kod,
              baslik: bulgular[0].baslik,
              aciklama: bulgurAciklama(bulgular[0].aciklama),
              onem: bulgular[0].onemDerecesi,
              durum: bulgular[0].durum,
              sorumlu: bulgular[0].sorumlu?.adSoyad ?? null,
              hedefTarih: bulgular[0].hedefTarih?.toISOString() ?? null,
              aksiyonTamam: bulgular[0].aksiyonlar.filter((a) => a.durum === 'tamamlandi').length,
              aksiyonToplam: bulgular[0].aksiyonlar.length,
            }
          : null,
        digerEksikler: bulgular.slice(1, 3).map((b) => ({
          id: b.id, baslik: b.baslik,
          alt: `${b.maddeDurumu.madde.kod} · ${b.sorumlu?.adSoyad ?? 'sahipsiz'}`,
        })),
      }}
      santraller={tumTesisler.map((x) => ({
        id: x.id, kod: x.kod, ad: x.ad,
        alt: x.kuruluGucMw ? `${x.kuruluGucMw} MWe` : '—',
        tip: x.tip?.ad ?? 'Diğer',
        gorselAnahtari: x.gorselAnahtari,
      }))}
    />
  );
}

/** Bulgu açıklaması tek cümleye indirilir (06 §A2: ekran başına bir cümle). */
function bulgurAciklama(metin: string | null): string | null {
  if (!metin) return null;
  const ilk = metin.split(/(?<=\.)\s/)[0];
  return ilk.length > 200 ? `${ilk.slice(0, 197)}…` : ilk;
}
