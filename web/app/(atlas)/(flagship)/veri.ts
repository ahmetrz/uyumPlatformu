import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamKosulu, modulKapisi } from '@/app/kapsam';
import { uyumOzeti, gecikmisMi, gecenGun } from '@/lib/sabitler';
import type { Kayit } from './Genel';

/* F1 · Executive Overview — SUNUCU VERİSİ.

   ═══ KAPSAM SIZINTISI ══════════════════════════════════════════════════
   Yönetici özeti bütün sorgularını kapsamsız yapıyordu: odak kartı ve
   kuyruk B santralinin bulgu başlığını, santral adını ve KİMLİĞİNİ
   (`tesisId`) taşıyordu; dört metriğin dördü de (uyum yüzdesi, kritik
   risk, gecikmiş aksiyon, yaklaşan denetim) ve bağlam şeridi (santral
   sayısı + toplam MWe) kapsamsız sayıyordu. Bu ekranın tamamı zaten
   metrikten ibarettir: burada satırı gizleyip sayacı bırakmak, ekranı
   olduğu gibi bırakmakla aynı şeydi.

   MODÜL SEÇİMİ: `uyum` — TEK modül, ekranın bütün toplamları için.
   Gerekçe kaydın konusudur: odak kartı ve kuyruk BULGUdur (uyum modülünün
   kaydı), baskın metrik uyum yüzdesidir; /uyum, /bulgular ve /portfoy aynı
   modülü kullanır.

   Kritik risk sayacını `risk`, yaklaşan denetimi `denetim` kapsamıyla
   daraltmak İLK BAKIŞTA daha ince görünür ama YANLIŞTIR: riski hiç
   okuyamayan bir kullanıcı için `izinliTesisIdleri(k,'risk')` boş küme
   döner ve sayaç `0` yazardı — "kritik risk yok" diye YALAN söylerdi.
   Kapsam bir SANTRAL sınırıdır; modül izni ayrı bir eksendir ve bir sayıyı
   sıfıra çevirerek anlatılamaz ("bilinmeyen ≠ sıfır"). Aynı gerekçeyle
   bağlam şeridi (santral sayısı + toplam MWe) de tek bir kapsamdan gelir:
   "kaç santral" sorusunun modüle göre değişen iki yanıtı aynı cümlede yan
   yana duramaz.

   ── SANTRALİ BİLİNMEYEN KAYIT ──────────────────────────────────────────
   `app/kapsam.ts → kapsamKosulu` = `lib/api/yetki.ts → tesisKapsamda`.
   Denetim bunun İSTİSNASIDIR ve bilinçlidir: kapsam satırı hiç girilmemiş
   bir denetim portföy geneli sayılır ve gizlenmez — /denetimler ekranı da
   aynı kuralı uygular, iki ekran ayrışamaz. */

export type EkranVerisi = {
  kullanici: string;
  ozet: {
    uyumYuzde: number | null; bilinmeyenOran: number | null;
    kritikRisk: number; gecikmisAksiyon: number;
    yaklasanDenetim: { kod: string; kalanGun: number } | null;
    tesisSayisi: number; toplamGucMw: number;
  };
  odak: Kayit | null;
  kuyruk: Kayit[];
  toplamKayit: number;
  /** true = özet bir santral kapsamıyla daraltıldı */
  kapsamli: boolean;
};

/** Odak kartı + kuyruk için çekilen en fazla bulgu. */
const KUYRUK_PENCERESI = 12;

export async function genelEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'uyum');
  const simdi = new Date();
  const uyumKapsami = izinliTesisIdleri(k, 'uyum');
  const tesisKosulu = uyumKapsami === null ? {} : { id: { in: uyumKapsami } };

  const [durumSayimlari, bulgular, riskler, aksiyonlar, denetimler, tesisSayisi, gucToplami] =
    await Promise.all([
      db.maddeDurumu.groupBy({
        by: ['durum'], _count: { _all: true }, where: kapsamKosulu(uyumKapsami),
      }),
      db.bulgu.findMany({
        where: {
          durum: { in: ['acik', 'aksiyonda'] }, silindi: null,
          maddeDurumu: kapsamKosulu(uyumKapsami),
        },
        include: {
          sorumlu: { select: { adSoyad: true } },
          maddeDurumu: {
            include: {
              madde: { select: { kod: true, baslik: true } },
              tesis: { select: { id: true, ad: true, kod: true } },
              surec: { include: { regulasyon: { select: { kod: true } } } },
            },
          },
          aksiyonlar: { select: { durum: true } },
        },
        orderBy: [{ onemDerecesi: 'asc' }, { hedefTarih: 'asc' }],
        take: KUYRUK_PENCERESI,
      }),
      db.risk.count({
        where: {
          silindi: null, durum: { in: ['acik', 'islemde'] },
          artikRisk: { gte: 15 }, ...kapsamKosulu(uyumKapsami),
        },
      }),
      db.aksiyon.count({
        where: {
          durum: { in: ['planlandi', 'devam'] }, hedef: { lt: simdi },
          bulgu: { maddeDurumu: kapsamKosulu(uyumKapsami) },
        },
      }),
      db.denetim.findMany({
        where: {
          silindi: null, planBitis: { gt: simdi },
          /* /denetimler ile AYNI kural: kapsam satırı olmayan denetim
             portföy geneli sayılır ve gizlenmez. */
          ...(uyumKapsami === null ? {} : {
            OR: [
              { kapsamlar: { none: {} } },
              { kapsamlar: { some: { tesisId: { in: uyumKapsami } } } },
            ],
          }),
        },
        select: { kod: true, ad: true, planBitis: true },
        orderBy: { planBitis: 'asc' }, take: 1,
      }),
      db.tesis.count({ where: { durum: 'aktif', ...tesisKosulu } }),
      db.tesis.aggregate({
        _sum: { kuruluGucMw: true }, where: { durum: 'aktif', ...tesisKosulu },
      }),
    ]);

  const sayim = Object.fromEntries(durumSayimlari.map((d) => [d.durum, d._count._all]));
  const ozet = uyumOzeti(sayim);
  const yaklasan = denetimler[0] ?? null;

  // Öncelik sırası: kritik/gecikmiş önce; ilk kayıt odak kartı, sonrakiler kuyruk.
  const sirali = [...bulgular].sort((a, b) => {
    const ag = gecikmisMi(a.hedefTarih) ? 0 : 1;
    const bg = gecikmisMi(b.hedefTarih) ? 0 : 1;
    if (ag !== bg) return ag - bg;
    return (a.onemDerecesi === 'kritik' ? 0 : 1) - (b.onemDerecesi === 'kritik' ? 0 : 1);
  });

  const kayit = (b: (typeof sirali)[number]): Kayit => ({
    id: b.id,
    baslik: b.baslik,
    aciklama: (b.aciklama ?? '').split(/(?<=\.)\s/)[0] || null,
    tesisAd: b.maddeDurumu.tesis.ad,
    tesisId: b.maddeDurumu.tesis.id,
    kontrolKodu: b.maddeDurumu.madde.kod,
    cerceve: b.maddeDurumu.surec.regulasyon.kod,
    onem: b.onemDerecesi,
    durum: b.durum,
    sorumlu: b.sorumlu?.adSoyad ?? null,
    hedefTarih: b.hedefTarih?.toISOString() ?? null,
    gecikmisGun: gecikmisMi(b.hedefTarih) ? gecenGun(b.hedefTarih!) : null,
    aksiyonTamam: b.aksiyonlar.filter((a) => a.durum === 'tamamlandi').length,
    aksiyonToplam: b.aksiyonlar.length,
  });

  return {
    kullanici: k.adSoyad,
    ozet: {
      uyumYuzde: ozet.yuzde,
      bilinmeyenOran: ozet.bilinmeyenOran,
      kritikRisk: riskler,
      gecikmisAksiyon: aksiyonlar,
      yaklasanDenetim: yaklasan
        ? { kod: yaklasan.kod, kalanGun: -gecenGun(yaklasan.planBitis!) }
        : null,
      tesisSayisi,
      toplamGucMw: Math.round((gucToplami._sum.kuruluGucMw ?? 0) * 10) / 10,
    },
    odak: sirali[0] ? kayit(sirali[0]) : null,
    kuyruk: sirali.slice(1, 4).map(kayit),
    toplamKayit: sirali.length,
    kapsamli: kapsamDaraltildi(uyumKapsami),
  };
}
