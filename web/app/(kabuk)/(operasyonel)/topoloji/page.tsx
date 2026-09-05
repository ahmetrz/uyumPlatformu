import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri } from '@/lib/erisim';
import { kapsamdaYetkili, modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import {
  anliklariListele, karsilastirmaIzi, sapmalariListele, temelDurumlari, topolojiOzeti,
} from '@/lib/entegrasyon/topoloji';
import TopolojiIstemci from './TopolojiIstemci';
import {
  anlikKarsilastirmaZamani, kapsamBolgeleri,
  type AnlikSatiri, type BolgeSatiri, type GecitSatiri, type KarsilastirmaIzi,
  type SapmaSatiri, type SegmentSatiri, type TemelSatiri,
} from './mantik';

export const metadata: Metadata = { title: 'Ağ / OT topolojisi' };

/* O12 · Topoloji sapma tezgâhı.

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Ekran hiçbir şeyi otomatik yapmaz: sapmayı motor tespit eder, ekran onu
   ÖNERİ olarak sunar, kabul/ret kararını insan verir (lib/eylemler2/
   topoloji.ts). Kabul bile ağa dokunmaz — yalnız temeli taşır.

   Bu ürün OT ağında aktif tarama YAPMAZ: anlıklar ya onaylı iç kayıttan
   (CMDB) dondurulur ya da pasif gözlem kaynaklarının dışa aktarımından
   gelir. Ekranda "tara" diye bir düğme bilerek yoktur. */

const SAPMA_TAVANI = 200;
const ANLIK_TAVANI = 20;
/** Bulgu formunun madde seçicisi — kapsamdan bu kadar madde durumu okunur. */
const MADDE_TAVANI = 200;

/** JSON alanı sessizce yutulmaz: bozuksa okunamadı olarak taşınır. */
function nesne(ham: string | null): Record<string, unknown> | null {
  if (!ham) return null;
  try {
    const c = JSON.parse(ham);
    return c && typeof c === 'object' && !Array.isArray(c) ? c as Record<string, unknown> : null;
  } catch {
    return { okunamadi: ham };
  }
}

const metin = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

export default async function Sayfa() {
  const k = await girisZorunlu();
  const gorulebilir = izinliTesisIdleri(k, 'envanter');
  const yazabilir = modulYazabilir(k, 'envanter', 'yazma');
  const onaylayabilir = modulYazabilir(k, 'envanter', 'onay');
  const riskYazabilir = modulYazabilir(k, 'risk', 'yazma');
  const uyumYazabilir = modulYazabilir(k, 'uyum', 'yazma');
  /* OT-11 · Segment tanımı kütük kaydıdır: `tanimlar/onay`. */
  const tanimOnaylayabilir = modulYazabilir(k, 'tanimlar', 'onay');


  /* Sapma ve anlık listeleri EKRANIN KENDİ SORGUSU DEĞİL: ikisi de
     `lib/entegrasyon/topoloji.ts` yardımcılarından gelir (#22). Burada
     ikinci bir `findMany` yazmak, kapsam koşulunun ve şiddet sırasının
     iki ayrı yerde yaşaması demekti. */
  const [tesisler, hamSapmalar, hamAnliklar, ozet, maddeDurumlari, hamBolgeler]
    = await Promise.all([
    db.tesis.findMany({
      where: { durum: 'aktif', ...(gorulebilir ? { id: { in: gorulebilir } } : {}) },
      select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
    sapmalariListele({ tesisIdleri: gorulebilir, limit: SAPMA_TAVANI }),
    anliklariListele(gorulebilir, ANLIK_TAVANI),
    /* Metrikler TAVANDAN BAĞIMSIZ sayılır. Liste 200 satırda kesilir;
       "kaç açık sapma var" sorusunun cevabı kesilmiş listeden okunursa
       201. sapma başlıktan da düşer. */
    topolojiOzeti(gorulebilir),
    uyumYazabilir
      ? db.maddeDurumu.findMany({
        where: gorulebilir ? { tesisId: { in: gorulebilir } } : {},
        take: MADDE_TAVANI,
        select: { id: true, tesisId: true, madde: { select: { kod: true, baslik: true } } },
        orderBy: { guncellendi: 'desc' },
      })
      : Promise.resolve([]),
    /* B8/B10 · Bölge–geçit diyagramı. Tesissiz (grup düzeyi) bölgeler
       daraltılmış kapsamda da OKUNUR — "kurumsal ağ → OT DMZ" geçidinin
       bir ucu tesissizdir ve düğümü olmayan kenar çizilemez. Kapsamdaki
       hiçbir bölgeye bağlanmayanlar aşağıda `kapsamBolgeleri` ile budanır. */
    db.agBolgesi.findMany({
      where: gorulebilir
        ? { OR: [{ tesisId: { in: gorulebilir } }, { tesisId: null }] }
        : {},
      select: {
        id: true, kod: true, ad: true, tip: true, guvenlikSeviyesi: true, tesisId: true,
        tesis: { select: { kod: true } },
        // Silinmiş varlık bölge sayacına girmez; envanter de onu göstermez.
        _count: { select: { varliklar: { where: { silindi: null } } } },
      },
      orderBy: { kod: 'asc' },
    }),
  ]);

  const tesisKodu = new Map(tesisler.map((t) => [t.id, t.kod]));

  /* Geçit yalnız iki ucu da okunmuş bölgeler arasında sorulur; kapsam
     dışı bir bölgeye giden geçit varlığıyla bile o bölgeyi doğrulardı. */
  const bolgeIdleri = hamBolgeler.map((b) => b.id);
  const hamGecitler = bolgeIdleri.length
    ? await db.agGeciti.findMany({
      where: { kaynakBolgeId: { in: bolgeIdleri }, hedefBolgeId: { in: bolgeIdleri } },
      orderBy: { id: 'asc' },
    })
    : [];
  /* ── OT-11 · Segmentler ──────────────────────────────────────────────
     Segment kapsamı BÖLGE üzerinden gelir: bölge kapsam dışıysa onun
     segmenti de görünmez. Ayrı bir tesis koşulu yazmak, iki kapsam
     kuralının ayrışması demekti (`AgSegmenti`nin kendi tesisi yok). */
  const hamSegmentler = bolgeIdleri.length
    ? await db.agSegmenti.findMany({
      where: { bolgeId: { in: bolgeIdleri } },
      select: {
        id: true, kod: true, ad: true, bolgeId: true, cidr: true, vlanId: true,
        gatewayIp: true, yonetimAgi: true, aciklama: true,
        _count: { select: { varliklar: { where: { silindi: null } } } },
      },
      orderBy: { kod: 'asc' },
    })
    : [];
  /* Segmentin AÇIK veri kalitesi bulguları (OT-44). `groupBy` tek sorgu;
     segment başına saymak N+1 olurdu. */
  const segmentBulgulari = hamSegmentler.length
    ? await db.veriKalitesiBulgusu.groupBy({
      by: ['kaynakId'],
      where: {
        durum: 'acik', kaynakTipi: 'AgSegmenti',
        kaynakId: { in: hamSegmentler.map((s) => s.id) },
      },
      _count: { _all: true },
    })
    : [];
  const bulguSayaci = new Map(segmentBulgulari.map((b) => [b.kaynakId, b._count._all]));

  const { bolgeler, gecitler } = kapsamBolgeleri(
    hamBolgeler.map((b): BolgeSatiri => ({
      id: b.id, kod: b.kod, ad: b.ad, tip: b.tip,
      seviye: b.guvenlikSeviyesi,
      tesisId: b.tesisId, tesisKodu: b.tesis?.kod ?? null,
      varlikSayisi: b._count.varliklar,
    })),
    hamGecitler.map((g): GecitSatiri => ({
      id: g.id, kaynakBolgeId: g.kaynakBolgeId, hedefBolgeId: g.hedefBolgeId,
      kontrolVarligi: g.kontrolVarligi, protokoller: g.protokoller,
      onaylandi: g.onaylandi,
      sonDogrulama: g.sonDogrulama?.toISOString() ?? null,
      aciklama: g.aciklama,
    })),
    gorulebilir !== null,
  );

  /* ── kapsam satırları (temel şeridi) ─────────────────────────────────
     Tesissiz (global) anlıklar yalnız kapsamı sınırsız kullanıcıya
     gösterilir; kapsamı daraltılmış kullanıcının sorgusu zaten onları
     getirmiyor ve boş bir "Tesissiz" satırı yanıltıcı olurdu. */
  const kapsamlar: { tesisId: string | null; kod: string }[] = [
    ...tesisler.map((t) => ({ tesisId: t.id as string | null, kod: t.kod })),
    ...(gorulebilir === null ? [{ tesisId: null, kod: 'Tesissiz' }] : []),
  ];
  /* Temel durumu KAPSAM BAŞINA DEĞİL toplu okunur. Eskiden şerit her
     kapsam için ayrı bir temel-durumu sorgusu koşuyordu: dört sorgu, biri de temelin
     BÜTÜN gözlemlerini yükleyen `temelAnlik()`. Şerit bu gözlemlerden tek
     birini bile çizmez; yirmi santralde bu seksen sorgu ve yirmi tam
     topoloji okuması ederdi. Örnek veride anlık tablosu boş olduğu için
     eski kısayol maliyeti gizliyordu — gerçek gözlem akmaya başladığı gün
     görünür olurdu. */
  const durumlar = await temelDurumlari(gorulebilir);

  const temeller: TemelSatiri[] = kapsamlar.map((kap) => {
    const kapsamId = kap.tesisId ?? '__global__';
    // Hiç ölçülmemiş kapsam LİSTEDE KALIR: görünmemesi onu "sorunsuz"
    // gösterirdi, oysa hakkında hiçbir gözlem yok.
    const d = durumlar.get(kapsamId);
    return {
      kapsamId,
      tesisId: kap.tesisId,
      tesisKodu: kap.kod,
      temelVar: d?.temelVar ?? false,
      temelAnlikId: d?.temel?.id ?? null,
      temelAlindi: d?.temel?.alindi.toISOString() ?? null,
      temelOnayZamani: d?.temel?.onayZamani?.toISOString() ?? null,
      temelKaynak: d?.temel?.kaynak ?? null,
      anlikSayisi: d?.anlikSayisi ?? 0,
      acikSapma: d?.acikSapma ?? 0,
    };
  });

  const temelHaritasi = new Map(temeller.map((t) => [t.kapsamId, t]));

  /* ── karşılaştırma izi ───────────────────────────────────────────────
     "Sapma yok" diyebilmek için karşılaştırmanın YAPILDIĞINA dair kanıt
     gerekir; kanıt yoksa ekran "bilinmiyor" der. */
  const iz = await karsilastirmaIzi(hamAnliklar.map((a) => a.id));
  const izGorunumu: KarsilastirmaIzi = {
    sonKarsilastirma: iz.sonKarsilastirma?.toISOString() ?? null,
    tetikleyen: iz.tetikleyen,
    motorImleci: iz.motorImleci,
    motorDurumu: iz.motorDurumu,
    motorZamani: iz.motorZamani?.toISOString() ?? null,
  };

  /* ── açılmış risk kayıtlarının kodu ─────────────────────────────────
     Sapma satırı "risk açıldı" derken hangi riski işaret ettiğini de
     söylemeli; kod olmadan iz sürülemez. */
  const riskIdleri = [...new Set(
    hamSapmalar.map((s) => s.uretilenRiskId).filter((x): x is string => !!x))];
  const riskler = riskIdleri.length
    ? await db.risk.findMany({ where: { id: { in: riskIdleri } }, select: { id: true, kod: true } })
    : [];
  const riskKodu = new Map(riskler.map((r) => [r.id, r.kod]));

  const sapmalar: SapmaSatiri[] = hamSapmalar.map((s) => {
    const onceki = nesne(s.oncekiJson);
    const sonraki = nesne(s.sonrakiJson);
    return {
      id: s.id,
      tip: s.tip,
      siddet: s.siddet,
      durum: s.durum,
      aciklama: s.aciklama,
      anahtar: metin(sonraki?.anahtar) ?? metin(onceki?.anahtar),
      tesisId: s.tesisId,
      tesisKodu: s.tesisId ? tesisKodu.get(s.tesisId) ?? null : null,
      anlikId: s.anlikId,
      anlikKaynak: s.anlik.kaynak,
      anlikAlindi: s.anlik.alindi.toISOString(),
      olusturuldu: s.olusturuldu.toISOString(),
      kararVeren: s.kararVeren?.adSoyad ?? null,
      kararZamani: s.kararZamani?.toISOString() ?? null,
      kararGerekcesi: s.kararGerekcesi,
      // Aday YALNIZ kritik sapmada doğar (lib/entegrasyon/topoloji.ts →
      // sapmaAdayi). Aday olması kayıt açıldığı anlamına GELMEZ.
      adayVar: s.siddet === 'kritik',
      uretilenRiskId: s.uretilenRiskId,
      uretilenRiskKodu: s.uretilenRiskId ? riskKodu.get(s.uretilenRiskId) ?? null : null,
      uretilenBulguId: s.uretilenBulguId,
      onceki,
      sonraki,
      kararVerilebilir: onaylayabilir && kapsamdaYetkili(k, 'envanter', 'onay', s.tesisId),
    };
  });

  const anliklar: AnlikSatiri[] = hamAnliklar.map((a) => {
    const kapsam = temelHaritasi.get(a.tesisId ?? '__global__');
    const sapmalariBu = sapmalar.filter((s) => s.anlikId === a.id);
    const yetkili = kapsamdaYetkili(k, 'envanter', 'onay', a.tesisId);
    return {
      id: a.id,
      tesisId: a.tesisId,
      tesisKodu: a.tesis?.kod ?? null,
      kaynak: a.kaynak,
      alindi: a.alindi.toISOString(),
      ozetHash: a.ozetHash,
      temelMi: a.temelMi,
      onaylayan: a.onaylayan?.adSoyad ?? null,
      onayZamani: a.onayZamani?.toISOString() ?? null,
      not: a.not,
      ogeSayisi: a._count.gozlemler,
      sapmaSayisi: a._count.sapmalar,
      // Sapma sayımları TAVANLA SINIRLI listeden değil, sayfadaki tam
      // listeden gelir; tavan aşılırsa dip not bunu söyler.
      acikSapma: sapmalariBu.filter((s) => s.durum === 'gozlendi' || s.durum === 'inceleme').length,
      kritikSapma: sapmalariBu.filter((s) => s.siddet === 'kritik').length,
      karsilastirmaZamani: anlikKarsilastirmaZamani({
        alindi: a.alindi.toISOString(),
        izZamani: iz.anligaGore.get(a.id)?.toISOString() ?? null,
        temelVar: kapsam?.temelVar ?? false,
        temelOnayZamani: kapsam?.temelOnayZamani ?? null,
        motorImleci: iz.motorImleci,
        motorZamani: izGorunumu.motorZamani,
      }),
      temelVar: kapsam?.temelVar ?? false,
      temelOnaylanabilir: onaylayabilir && yetkili && !a.temelMi,
      karsilastirilabilir: yazabilir && kapsamdaYetkili(k, 'envanter', 'yazma', a.tesisId),
    };
  });

  /* Segment satırı yalnız KAPSAMDA KALAN bölgelere bağlıysa taşınır:
     `kapsamBolgeleri` budaması burada da geçerli olmalı, yoksa budanmış
     bir bölgenin segmenti listede öksüz kalırdı. */
  const bolgeKodu = new Map(bolgeler.map((b) => [b.id, b]));
  const segmentler: SegmentSatiri[] = hamSegmentler
    .filter((s) => bolgeKodu.has(s.bolgeId))
    .map((s) => {
      const b = bolgeKodu.get(s.bolgeId)!;
      return {
        id: s.id, kod: s.kod, ad: s.ad,
        bolgeId: s.bolgeId, bolgeKodu: b.kod, tesisKodu: b.tesisKodu,
        cidr: s.cidr, vlanId: s.vlanId, gatewayIp: s.gatewayIp,
        yonetimAgi: s.yonetimAgi, aciklama: s.aciklama,
        varlikSayisi: s._count.varliklar,
        acikBulgu: bulguSayaci.get(s.id) ?? 0,
        /* Segment bir KÜTÜK kaydıdır: `tanimlar/onay` ister ve tesise
           bağlı olmadığı için kapsam kısıtı yoktur (lib/eylemler2/
           varlikDurusu.ts → agSegmentiKaydet ile aynı kural). */
        yazilabilir: tanimOnaylayabilir,
      };
    });

  return (
    <TopolojiIstemci
      sapmalar={sapmalar}
      segmentler={segmentler}
      anliklar={anliklar}
      temeller={temeller}
      ozet={{ acikSapma: ozet.acikSapma, kritikAcik: ozet.kritikAcik }}
      iz={izGorunumu}
      tesisler={tesisler}
      bolgeler={bolgeler}
      gecitler={gecitler}
      segmentYazabilir={tanimOnaylayabilir}
      maddeDurumlari={maddeDurumlari.map((m) => ({
        id: m.id, tesisId: m.tesisId,
        etiket: `${m.madde.kod} · ${m.madde.baslik}`,
      }))}
      yazabilir={yazabilir}
      onaylayabilir={onaylayabilir}
      riskYazabilir={riskYazabilir}
      uyumYazabilir={uyumYazabilir}
      sapmaTavani={SAPMA_TAVANI}
      anlikTavani={ANLIK_TAVANI}
    />
  );
}
