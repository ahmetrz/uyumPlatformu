import 'server-only';
import { ayarlar } from '@/lib/yapilandirma/oku';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamKosulu, modulKapisi } from '@/app/kapsam';
import { uyumOzeti, gecikmisMi, gecenGun } from '@/lib/sabitler';
import { maxEtki } from '@/app/(kabuk)/(operasyonel)/riskler/ortak';
import { anlikSayimi } from '@/app/(kabuk)/(operasyonel)/uyum/mantik';
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

/** Saha kartı — B yüzeyinin santral şeridi (b-executive prototipi). */
export type SantralKarti = {
  id: string; kod: string; ad: string;
  tipKod: string | null; tipAd: string | null;
  gucMw: number | null; konum: string | null; gorselAnahtari: string | null;
  /** ham durum → adet; kapsam dışı SAYILMAZ */
  sayim: Record<string, number>;
  /** `uyumOzeti` ile; hiç değerlendirilmemişse null — sıfır DEĞİL */
  endeks: number | null;
  bilinmeyen: number;
};

/** Üretim tipine göre uyum katmanı — prototipin sağ sütunu. */
export type TipKatmani = {
  kod: string; ad: string;
  santralSayisi: number; gucMw: number; kontrolSayisi: number;
  endeks: number | null;
  uygun: number; kismi: number; uygunsuz: number; bilinmeyen: number;
};

/** 5×5 risk yoğunluğu — olasılık × en büyük etki. */
export type RiskIzgarasi = {
  /** hucreler[etki-1][olasilik-1] — üst satır en yüksek etki */
  hucreler: number[][];
  enYuksek: number;
  kritik: number; yuksek: number;
  /** olasılık VEYA etki bilinmeyen risk sayısı — ızgaraya giremez */
  olculemeyen: number;
};

export type TakvimKalemi = {
  id: string; tarih: string; baslik: string; etiket: string;
  kalanGun: number; yol: string;
};

export type AkisHaftasi = { etiket: string; acilan: number; kapanan: number };

export type EkranVerisi = {
  kullanici: string;
  /* Ekranın "bugün"ü. SUNUCUDA hesaplanır ve prop olarak iner; istemci
     bileşeni `new Date()` çağırmaz. Statik dışa aktarımda HTML derleme
     anında üretilir, tarayıcı ise ziyaret gününü yazardı — React bunu
     hidrasyon uyuşmazlığı sayıp (#418) o alt ağacı atardı. Geliştirme
     kipinde HTML her istekte üretildiği için kusur GÖRÜNMEZ; yalnız
     yayınlanan demoda ortaya çıkar. */
  bugun: string;
  ozet: {
    uyumYuzde: number | null; bilinmeyenOran: number | null;
    kritikRisk: number; gecikmisAksiyon: number;
    /** En yakın planlı denetim: ad ve tarih ekranda YAZILIR, yalnız kod değil. */
    yaklasanDenetim: { kod: string; ad: string; tarih: string; kalanGun: number } | null;
    tesisSayisi: number; toplamGucMw: number;
  };
  odak: Kayit | null;
  kuyruk: Kayit[];
  toplamKayit: number;
  /** true = özet bir santral kapsamıyla daraltıldı */
  kapsamli: boolean;
  santraller: SantralKarti[];
  tipler: TipKatmani[];
  risk: RiskIzgarasi;
  takvim: TakvimKalemi[];
  akis: AkisHaftasi[];
  /** `UyumAnlik` kayıtlarından; anlık görüntü yoksa null — uydurulmaz. */
  egilim: { etiket: string; yuzde: number }[] | null;
};

/* Pencereler ve risk eşikleri yönetim konsolundan ayarlanır
   (`lib/yapilandirma/tanimlar.ts` · saha.* A sınıfı, risk.esik.* B sınıfı);
   kayıt yoksa kod varsayılanları: 12 kayıt · 90 gün · 12 hafta · 15 / 8. */
const HAFTA_MS = 7 * 86_400_000;

export async function genelEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  const ayarDegerleri = await ayarlar([
    'saha.kuyruk_penceresi', 'saha.takvim_gun', 'saha.akis_hafta',
    'risk.esik.kritik', 'risk.esik.yuksek'] as const);
  const KUYRUK_PENCERESI = Number(ayarDegerleri['saha.kuyruk_penceresi']);
  const TAKVIM_GUN = Number(ayarDegerleri['saha.takvim_gun']);
  const AKIS_HAFTA = Number(ayarDegerleri['saha.akis_hafta']);
  const RISK_KRITIK = Number(ayarDegerleri['risk.esik.kritik']);
  const RISK_YUKSEK = Number(ayarDegerleri['risk.esik.yuksek']);
  modulKapisi(k, 'uyum');
  const simdi = new Date();
  const bugun = simdi.toLocaleDateString('tr-TR',
    { day: 'numeric', month: 'long', year: 'numeric' });
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

  /* ── B yüzeyinin saha katmanı ────────────────────────────────────────
     Prototip (b-executive) santral şeridi, üretim tipi katmanları, 5×5
     risk yoğunluğu ve düzenleyici takvim ister. Hepsi KÜME SORGUSUYLA
     çekilir: santral başına sorgu açmak 16 santralde N+1 üretirdi. */
  const akisBaslangic = new Date(simdi.getTime() - AKIS_HAFTA * HAFTA_MS);
  const takvimSonu = new Date(simdi.getTime() + TAKVIM_GUN * 86_400_000);

  const [tesisler, tesisDurumlari, riskKayitlari, takvimDenetimleri, takvimSurecleri,
    akisBulgulari, anliklar] = await Promise.all([
    db.tesis.findMany({
      where: { durum: 'aktif', ...tesisKosulu },
      select: {
        id: true, kod: true, ad: true, konum: true, kuruluGucMw: true,
        gorselAnahtari: true, tip: { select: { kod: true, ad: true, sira: true } },
      },
      orderBy: [{ kuruluGucMw: 'desc' }, { ad: 'asc' }],
    }),
    db.maddeDurumu.groupBy({
      by: ['tesisId', 'durum'], _count: { _all: true },
      where: kapsamKosulu(uyumKapsami),
    }),
    db.risk.findMany({
      where: {
        silindi: null, durum: { in: ['acik', 'islemde'] },
        ...kapsamKosulu(uyumKapsami),
      },
      select: {
        olasilik: true, etkiUretim: true, etkiEmniyet: true, etkiRegulasyon: true,
        etkiFinans: true, etkiSiber: true, etkiItibar: true, etkiCevre: true,
        etkiVeri: true,
      },
    }),
    db.denetim.findMany({
      where: {
        silindi: null, planBitis: { gt: simdi, lte: takvimSonu },
        ...(uyumKapsami === null ? {} : {
          OR: [
            { kapsamlar: { none: {} } },
            { kapsamlar: { some: { tesisId: { in: uyumKapsami } } } },
          ],
        }),
      },
      select: { id: true, kod: true, ad: true, tip: true, planBitis: true },
      orderBy: { planBitis: 'asc' },
    }),
    db.uyumSureci.findMany({
      where: {
        bitis: { gt: simdi, lte: takvimSonu }, durum: { in: ['aktif', 'planlandi'] },
        ...(uyumKapsami === null ? {} : {
          OR: [
            { kapsam: { none: {} } },
            { kapsam: { some: { tesisId: { in: uyumKapsami } } } },
          ],
        }),
      },
      select: {
        id: true, kod: true, ad: true, bitis: true,
        regulasyon: { select: { kod: true } },
      },
      orderBy: { bitis: 'asc' },
    }),
    db.bulgu.findMany({
      where: {
        silindi: null,
        maddeDurumu: kapsamKosulu(uyumKapsami),
        OR: [
          { tespitTarihi: { gte: akisBaslangic } },
          { kapanmaTarihi: { gte: akisBaslangic } },
        ],
      },
      select: { tespitTarihi: true, kapanmaTarihi: true },
    }),
    /* Eğilim UYDURULMAZ: `UyumAnlik` yoksa çizgi de yok. Sistem saatiyle
       geriye doğru rastgele bir seri üretmek "iyileşiyoruz" yalanıdır. */
    db.uyumAnlik.findMany({
      where: uyumKapsami === null ? {} : {
        OR: [{ tesisId: null }, { tesisId: { in: uyumKapsami } }],
      },
      select: { tarih: true, ozetJson: true },
      orderBy: { tarih: 'desc' }, take: 400,
    }),
  ]);

  /* Santral × durum sayımı — tek groupBy'dan haritaya. */
  const tesisSayimi = new Map<string, Record<string, number>>();
  for (const d of tesisDurumlari) {
    if (!d.tesisId) continue;
    const kayitlar = tesisSayimi.get(d.tesisId) ?? {};
    kayitlar[d.durum] = (kayitlar[d.durum] ?? 0) + d._count._all;
    tesisSayimi.set(d.tesisId, kayitlar);
  }

  const santraller: SantralKarti[] = tesisler.map((t) => {
    const s = tesisSayimi.get(t.id) ?? {};
    const o = uyumOzeti(s);
    return {
      id: t.id, kod: t.kod, ad: t.ad,
      tipKod: t.tip?.kod ?? null, tipAd: t.tip?.ad ?? null,
      gucMw: t.kuruluGucMw, konum: t.konum, gorselAnahtari: t.gorselAnahtari,
      sayim: s, endeks: o.yuzde, bilinmeyen: o.bilinmeyen,
    };
  });

  /* Üretim tipi katmanları — tipi tanımsız santral KENDİ grubunda kalır,
     rastgele bir tipe atanmaz. */
  const tipHarita = new Map<string, TipKatmani>();
  for (const s of santraller) {
    const kod = s.tipKod ?? '—';
    const kat = tipHarita.get(kod) ?? {
      kod, ad: s.tipAd ?? 'Tipi tanımsız',
      santralSayisi: 0, gucMw: 0, kontrolSayisi: 0,
      endeks: null, uygun: 0, kismi: 0, uygunsuz: 0, bilinmeyen: 0,
    };
    kat.santralSayisi += 1;
    kat.gucMw += s.gucMw ?? 0;
    kat.uygun += s.sayim.uyumlu ?? 0;
    kat.kismi += s.sayim.kismi ?? 0;
    kat.uygunsuz += s.sayim.uyumsuz ?? 0;
    kat.bilinmeyen += (s.sayim.incelemede ?? 0) + (s.sayim.degerlendirilmedi ?? 0);
    tipHarita.set(kod, kat);
  }
  const tipler = [...tipHarita.values()].map((kat) => {
    const o = uyumOzeti({
      uyumlu: kat.uygun, kismi: kat.kismi, uyumsuz: kat.uygunsuz,
      degerlendirilmedi: kat.bilinmeyen,
    });
    return {
      ...kat,
      gucMw: Math.round(kat.gucMw * 10) / 10,
      kontrolSayisi: o.kapsam,
      endeks: o.yuzde,
    };
  }).sort((a, b) => b.kontrolSayisi - a.kontrolSayisi);

  /* 5×5 risk yoğunluğu. Olasılık VEYA etki bilinmiyorsa risk ızgaraya
     GİRMEZ ve ayrıca sayılır: bilinmeyeni (1,1) hücresine koymak "düşük
     risk" demek olurdu. */
  const hucreler = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
  let olculemeyen = 0; let kritik = 0; let yuksek = 0;
  for (const r of riskKayitlari) {
    const e = maxEtki({
      etkiUretim: r.etkiUretim, etkiEmniyet: r.etkiEmniyet,
      etkiRegulasyon: r.etkiRegulasyon, etkiFinans: r.etkiFinans,
      etkiSiber: r.etkiSiber, etkiItibar: r.etkiItibar,
      etkiCevre: r.etkiCevre, etkiVeri: r.etkiVeri,
    });
    if (r.olasilik === null || e === null) { olculemeyen += 1; continue; }
    const o = Math.min(5, Math.max(1, r.olasilik));
    const et = Math.min(5, Math.max(1, e));
    hucreler[5 - et][o - 1] += 1;      // 0. satır = en yüksek etki
    const skor = o * et;
    if (skor >= RISK_KRITIK) kritik += 1; else if (skor >= RISK_YUKSEK) yuksek += 1;
  }

  const takvim: TakvimKalemi[] = [
    ...takvimDenetimleri.map((d) => ({
      id: `denetim-${d.id}`,
      tarih: d.planBitis!.toISOString(),
      baslik: d.ad,
      etiket: d.tip === 'dis_denetim' ? 'dış denetim' : d.tip.replace(/_/g, ' '),
      kalanGun: -gecenGun(d.planBitis!),
      yol: `/denetimler/${d.id}`,
    })),
    ...takvimSurecleri.map((c) => ({
      id: `surec-${c.id}`,
      tarih: c.bitis!.toISOString(),
      baslik: c.ad,
      etiket: c.regulasyon.kod,
      kalanGun: -gecenGun(c.bitis!),
      yol: `/surecler/${c.id}`,
    })),
  ].sort((a, b) => a.tarih.localeCompare(b.tarih));

  /* Uygunsuzluk akışı — 12 hafta, açılan ve kapanan ayrı. */
  const akis: AkisHaftasi[] = Array.from({ length: AKIS_HAFTA }, (_, i) => {
    const bas = new Date(simdi.getTime() - (AKIS_HAFTA - i) * HAFTA_MS);
    return { etiket: `H-${AKIS_HAFTA - 1 - i}`, acilan: 0, kapanan: 0, _bas: bas.getTime() };
  }) as (AkisHaftasi & { _bas: number })[];
  const kova = (t: Date | null) => {
    if (!t) return -1;
    const fark = simdi.getTime() - t.getTime();
    if (fark < 0 || fark >= AKIS_HAFTA * HAFTA_MS) return -1;
    return AKIS_HAFTA - 1 - Math.floor(fark / HAFTA_MS);
  };
  for (const b of akisBulgulari) {
    const a = kova(b.tespitTarihi); if (a >= 0) akis[a].acilan += 1;
    const k2 = kova(b.kapanmaTarihi); if (k2 >= 0) akis[k2].kapanan += 1;
  }

  /* Eğilim: anlık görüntülerden AYA GÖRE en yenisi. Kayıt yoksa null. */
  const egilim = anlikEgilimi(anliklar);

  const kapsamOzeti = {
    santraller, tipler,
    risk: { hucreler, enYuksek: Math.max(0, ...hucreler.flat()), kritik, yuksek, olculemeyen },
    takvim, akis: akis.map(({ etiket, acilan, kapanan }) => ({ etiket, acilan, kapanan })),
    egilim,
  };

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
    bugun,
    ozet: {
      uyumYuzde: ozet.yuzde,
      bilinmeyenOran: ozet.bilinmeyenOran,
      kritikRisk: riskler,
      gecikmisAksiyon: aksiyonlar,
      yaklasanDenetim: yaklasan
        ? {
          kod: yaklasan.kod, ad: yaklasan.ad,
          tarih: yaklasan.planBitis!.toISOString(),
          kalanGun: -gecenGun(yaklasan.planBitis!),
        }
        : null,
      tesisSayisi,
      toplamGucMw: Math.round((gucToplami._sum.kuruluGucMw ?? 0) * 10) / 10,
    },
    odak: sirali[0] ? kayit(sirali[0]) : null,
    kuyruk: sirali.slice(1, 4).map(kayit),
    toplamKayit: sirali.length,
    kapsamli: kapsamDaraltildi(uyumKapsami),
    ...kapsamOzeti,
  };
}

/* ── Uyum anlık görüntülerinden eğilim ────────────────────────────────
   `UyumAnlik.ozetJson` durum sayılarını taşır; yüzde ORADAN yeniden
   hesaplanır (`uyumOzeti`), kayıtta saklı bir yüzdeye güvenilmez —
   formül değişirse tarihçe ile bugün ayrışırdı. Aynı ay birden çok
   anlık taşıyorsa en YENİSİ alınır. */
function anlikEgilimi(
  kayitlar: { tarih: Date; ozetJson: string }[],
): { etiket: string; yuzde: number }[] | null {
  if (kayitlar.length === 0) return null;
  const AY = new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit' });
  const aylar = new Map<string, { zaman: number; sayim: Record<string, number> }>();
  for (const a of kayitlar) {
    const anahtar = `${a.tarih.getUTCFullYear()}-${a.tarih.getUTCMonth()}`;
    /* Kayıt biçimi TEK yerden çözülür (uyum/mantik.ts): motorun yazdığı
       `{ durumlar }` burada da okunur, /uyum şeridi ile kök eğilim aynı
       kaydı aynı sayıyla okur. */
    const sayim = anlikSayimi(a.ozetJson);
    if (!sayim) continue;
    const onceki = aylar.get(anahtar);
    if (!onceki) { aylar.set(anahtar, { zaman: a.tarih.getTime(), sayim }); continue; }
    if (a.tarih.getTime() > onceki.zaman) { onceki.zaman = a.tarih.getTime(); onceki.sayim = sayim; }
    else {
      for (const [d, n] of Object.entries(sayim)) onceki.sayim[d] = (onceki.sayim[d] ?? 0) + n;
    }
  }
  const seri = [...aylar.values()]
    .sort((a, b) => a.zaman - b.zaman)
    .slice(-12)
    .map((a) => ({ etiket: AY.format(new Date(a.zaman)), yuzde: uyumOzeti(a.sayim).yuzde }))
    .filter((x): x is { etiket: string; yuzde: number } => x.yuzde !== null);
  return seri.length >= 2 ? seri : null;
}
