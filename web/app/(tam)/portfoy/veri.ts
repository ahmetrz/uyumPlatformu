import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamKosulu, modulKapisi } from '@/app/kapsam';
import { uyumOzeti } from '@/lib/sabitler';
import type { PortfoySatiri } from './Portfoy';

/* F2 · Enerji Portföyü — SUNUCU VERİSİ.

   ═══ KAPSAM SIZINTISI ══════════════════════════════════════════════════
   Ekran `db.tesis.findMany({ where: { durum: 'aktif' } })` ile BÜTÜN aktif
   santralleri — id, kod, ad, tüzel kişi, konum, kurulu güç ve fotoğrafıyla
   — listeliyordu. Bu ekranın konusu SANTRALİN KENDİSİ olduğu için sızıntı
   en doğrudan biçimindeydi: kapsam dışı santral bir satır olarak değil,
   bir PLAKA olarak görünüyordu. Metrikler (uyum yüzdesi, açık bulgu, açık
   risk, toplam kurulu güç) de kapsamsız sorgulardan geliyordu.

   MODÜL SEÇİMİ: `uyum`. Gerekçe kaydın konusudur: satırın taşıdığı iki
   sayı — uyum yüzdesi ve açık bulgu — `MaddeDurumu` ve `Bulgu`dan gelir,
   ikisi de uyum modülünün kayıtlarıdır (/uyum, /surecler, /raporlar aynı
   modülü kullanır). `tanimlar` (santral sicilinin yazma modülü) seçmek
   yanlış olurdu: dış denetçinin (`dis_denetci`) `tanimlar` izni yoktur ve
   portföy ona tümüyle kapanırdı — oysa denetlediği santralleri görmesi
   gerekir.

   TEK MODÜL, tüm toplamlar: açık risk sayacı da `uyum` kapsamıyla
   daraltılır, `risk` kapsamıyla DEĞİL. Nedeni "bilinmeyen ≠ sıfır"dır:
   riski hiç okuyamayan bir kullanıcı için risk kapsamı `[]` döner ve sayaç
   `0` yazardı — yani "bu santralde açık risk yok" diye YALAN söylerdi.
   Kapsam bir santral sınırıdır; modül izni ayrı bir eksendir ve sayıyı
   sıfıra çevirerek anlatılamaz.

   ── SANTRALİ BİLİNMEYEN KAYIT ──────────────────────────────────────────
   Bu ekranda her satır bir santraldir; "santrali bilinmeyen" satır yoktur.
   Kural yine de tek yerden (`app/kapsam.ts`) gelir. */

export type EkranVerisi = {
  satirlar: PortfoySatiri[];
  toplamGucMw: number;
  /** true = portföy bir santral kapsamıyla daraltıldı */
  kapsamli: boolean;
};

export async function portfoyEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'uyum');
  const izinli = izinliTesisIdleri(k, 'uyum');

  const [tesisler, durumSayimlari, bulguSayimlari, riskSayimlari] = await Promise.all([
    db.tesis.findMany({
      where: { durum: 'aktif', ...(izinli === null ? {} : { id: { in: izinli } }) },
      include: { tip: true, tuzelKisi: true, profil: { select: { kritiklikSinifi: true } } },
      orderBy: [{ kuruluGucMw: 'desc' }, { ad: 'asc' }],
    }),
    db.maddeDurumu.groupBy({
      by: ['tesisId', 'durum'], _count: { _all: true },
      where: kapsamKosulu(izinli),
    }),
    db.bulgu.groupBy({
      by: ['maddeDurumuId'], _count: { _all: true },
      where: {
        durum: { in: ['acik', 'aksiyonda'] }, silindi: null,
        maddeDurumu: kapsamKosulu(izinli),
      },
    }),
    db.risk.groupBy({
      by: ['tesisId'], _count: { _all: true },
      where: {
        silindi: null, durum: { in: ['acik', 'islemde'] }, ...kapsamKosulu(izinli),
      },
    }),
  ]);

  // Bulgu sayısı tesise madde durumu üzerinden bağlanır
  const bulguDurumIdleri = bulguSayimlari.map((b) => b.maddeDurumuId);
  const durumTesis = bulguDurumIdleri.length
    ? await db.maddeDurumu.findMany({
        where: { id: { in: bulguDurumIdleri } }, select: { id: true, tesisId: true },
      })
    : [];
  const bulguTesise = new Map<string, number>();
  for (const b of bulguSayimlari) {
    const t = durumTesis.find((d) => d.id === b.maddeDurumuId)?.tesisId;
    if (t) bulguTesise.set(t, (bulguTesise.get(t) ?? 0) + b._count._all);
  }
  const riskTesise = new Map(riskSayimlari.map((r) => [r.tesisId ?? '', r._count._all]));

  const satirlar: PortfoySatiri[] = tesisler.map((t) => {
    const sayim: Record<string, number> = {};
    for (const d of durumSayimlari) {
      if (d.tesisId === t.id) sayim[d.durum] = d._count._all;
    }
    const ozet = uyumOzeti(sayim);
    return {
      id: t.id,
      kod: t.kod,
      ad: t.ad,
      tipKod: t.tip?.kod ?? null,
      tipAdi: t.tip?.ad ?? 'Diğer',
      tuzelKisi: t.tuzelKisi?.ad ?? null,
      konum: t.konum,
      gucMw: t.kuruluGucMw,
      gorselAnahtari: t.gorselAnahtari,
      kritiklik: t.profil?.kritiklikSinifi ?? null,
      uyumYuzde: ozet.yuzde,
      bilinmeyenOran: ozet.bilinmeyenOran,
      acikBulgu: bulguTesise.get(t.id) ?? 0,
      acikRisk: riskTesise.get(t.id) ?? 0,
    };
  });

  /* Toplam kurulu güç GÖRÜNEN satırlardan toplanır: kapsam dışı santralin
     MW'ı toplama girseydi, satırı gizlenmiş bir santralin varlığı tek bir
     sayıdan okunabilirdi. */
  const toplamGuc = satirlar.reduce((a, s) => a + (s.gucMw ?? 0), 0);

  return {
    satirlar,
    toplamGucMw: Math.round(toplamGuc * 10) / 10,
    kapsamli: kapsamDaraltildi(izinli),
  };
}
