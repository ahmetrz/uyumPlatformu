import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamKosulu, modulKapisi } from '@/app/kapsam';
import { uyumOzeti } from '@/lib/sabitler';
import type { PortfoyEndeksi, PortfoySatiri } from './mantik';
import { KURULU_GUC, birimliOzellik, ozelligeGoreSirala } from '@/lib/alan/oznitelik';

/* F2 · Enerji Portföyü — SUNUCU VERİSİ.

   ═══ KAPSAM SIZINTISI ══════════════════════════════════════════════════
   Ekran `db.tesis.findMany({ where: { durum: 'aktif' } })` ile BÜTÜN aktif
   tesisleri — id, kod, ad, tüzel kişi, konum, kurulu güç ve fotoğrafıyla
   — listeliyordu. Bu ekranın konusu TESİSİN KENDİSİ olduğu için sızıntı
   en doğrudan biçimindeydi: kapsam dışı tesis bir satır olarak değil,
   bir PLAKA olarak görünüyordu. Metrikler (uyum yüzdesi, açık bulgu, açık
   risk, toplam kurulu güç) de kapsamsız sorgulardan geliyordu.

   MODÜL SEÇİMİ: `uyum`. Gerekçe kaydın konusudur: satırın taşıdığı iki
   sayı — uyum yüzdesi ve açık bulgu — `MaddeDurumu` ve `Bulgu`dan gelir,
   ikisi de uyum modülünün kayıtlarıdır (/uyum, /surecler, /raporlar aynı
   modülü kullanır). `tanimlar` (tesis sicilinin yazma modülü) seçmek
   yanlış olurdu: dış denetçinin (`dis_denetci`) `tanimlar` izni yoktur ve
   portföy ona tümüyle kapanırdı — oysa denetlediği tesisleri görmesi
   gerekir.

   TEK MODÜL, tüm toplamlar: açık risk sayacı da `uyum` kapsamıyla
   daraltılır, `risk` kapsamıyla DEĞİL. Nedeni "bilinmeyen ≠ sıfır"dır:
   riski hiç okuyamayan bir kullanıcı için risk kapsamı `[]` döner ve sayaç
   `0` yazardı — yani "bu tesiste açık risk yok" diye YALAN söylerdi.
   Kapsam bir tesis sınırıdır; modül izni ayrı bir eksendir ve sayıyı
   sıfıra çevirerek anlatılamaz.

   ── TESİSİ BİLİNMEYEN KAYIT ────────────────────────────────────────────
   Bu ekranda her satır bir tesistir; "tesisi bilinmeyen" satır yoktur.
   Kural yine de tek yerden (`app/kapsam.ts`) gelir. */

export type EkranVerisi = {
  satirlar: PortfoySatiri[];
  toplamKuruluGuc: number;
  /** Portföy geneli uyum endeksi — kök ekranla AYNI formül (`uyumOzeti`),
      aynı kapsam. Değerlendirilmiş kontrol yoksa `yuzde: null`. */
  endeks: PortfoyEndeksi;
  /** true = portföy bir tesis kapsamıyla daraltıldı */
  kapsamli: boolean;
};

export async function portfoyEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'uyum');
  const izinli = izinliTesisIdleri(k, 'uyum');

  const [tesisSirasiz, durumSayimlari, bulguSayimlari, riskSayimlari] = await Promise.all([
    db.tesis.findMany({
      where: { durum: 'aktif', ...(izinli === null ? {} : { id: { in: izinli } }) },
      include: {
        tip: true, tuzelKisi: true, profil: { select: { kritiklikSinifi: true } },
        ozellikler: { select: { anahtar: true, sayisalDeger: true, birim: true } },
      },
      /* Sıra JS'te: kurulu güç artık öznitelik satırı (P1). Sorgu `take`
         almıyor, küme tamamı geliyor — sonuç veritabanı sırasıyla aynı. */
      orderBy: { ad: 'asc' },
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

  const tesisler = ozelligeGoreSirala(tesisSirasiz, KURULU_GUC);

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
      /* Sayı ve BİRİM birlikte taşınır: birimi ekranda sabit yazmak
         çekirdeğe enerji birimi gömerdi (§0.5). `birimliOzellik` satırda
         ne yazıyorsa onu verir; yoksa birimsiz yazılır, uydurulmaz. */
      ...((o) => ({ kuruluGuc: o.deger, gucBirim: o.birim }))(
        birimliOzellik(t.ozellikler, KURULU_GUC)),
      gorselAnahtari: t.gorselAnahtari,
      enlem: t.enlem, boylam: t.boylam,
      konumKaynagi: t.konumKaynagi, konumDogrulandi: t.konumDogrulandi,
      kritiklik: t.profil?.kritiklikSinifi ?? null,
      uyumYuzde: ozet.yuzde,
      bilinmeyenOran: ozet.bilinmeyenOran,
      acikBulgu: bulguTesise.get(t.id) ?? 0,
      acikRisk: riskTesise.get(t.id) ?? 0,
    };
  });

  /* Toplam kurulu güç GÖRÜNEN satırlardan toplanır: kapsam dışı tesisin
     gücü toplama girseydi, satırı gizlenmiş bir tesisin varlığı tek bir
     sayıdan okunabilirdi. */
  const toplamGuc = satirlar.reduce((a, s) => a + (s.kuruluGuc ?? 0), 0);

  /* Portföy endeksi tesis yüzdelerinin ORTALAMASI değildir: 900 kontrollü
     bir tesisle 40 kontrollü bir tesisi eşit ağırlıkta toplamak yanlış
     olurdu.
     Kapsamdaki tüm madde durumları tek havuzda sayılır — kök ekran (/)
     aynı havuzdan aynı formülle hesaplar, iki ekran birbirini tutar. */
  const genelSayim: Record<string, number> = {};
  for (const d of durumSayimlari) genelSayim[d.durum] = (genelSayim[d.durum] ?? 0) + d._count._all;
  const genel = uyumOzeti(genelSayim);

  return {
    satirlar,
    toplamKuruluGuc: Math.round(toplamGuc * 10) / 10,
    endeks: {
      yuzde: genel.yuzde,
      bilinmeyenOran: genel.bilinmeyenOran,
      degerlendirilen: genel.degerlendirilen,
      kapsam: genel.kapsam,
    },
    kapsamli: kapsamDaraltildi(izinli),
  };
}
