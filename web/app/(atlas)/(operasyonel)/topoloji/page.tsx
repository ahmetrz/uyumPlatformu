import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { db } from '@/lib/db';
import {
  anliklariListele, karsilastirmaIzi, sapmalariListele, temelDurumu, topolojiOzeti,
} from '@/lib/entegrasyon/topoloji';
import TopolojiIstemci from './TopolojiIstemci';
import {
  anlikKarsilastirmaZamani,
  type AnlikSatiri, type KarsilastirmaIzi, type SapmaSatiri, type TemelSatiri,
} from './mantik';

export const metadata: Metadata = { title: 'Ağ / OT topolojisi — Abacus' };

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
  const yazabilir = izinVar(k, 'envanter', 'yazma');
  const onaylayabilir = izinVar(k, 'envanter', 'onay');
  const riskYazabilir = izinVar(k, 'risk', 'yazma');
  const uyumYazabilir = izinVar(k, 'uyum', 'yazma');

  const tesisKosulu = gorulebilir ? { tesisId: { in: gorulebilir } } : {};

  /* Sapma ve anlık listeleri EKRANIN KENDİ SORGUSU DEĞİL: ikisi de
     `lib/entegrasyon/topoloji.ts` yardımcılarından gelir (#22). Burada
     ikinci bir `findMany` yazmak, kapsam koşulunun ve şiddet sırasının
     iki ayrı yerde yaşaması demekti. */
  const [tesisler, hamSapmalar, hamAnliklar, anlikSayimlari, ozet, maddeDurumlari]
    = await Promise.all([
    db.tesis.findMany({
      where: { durum: 'aktif', ...(gorulebilir ? { id: { in: gorulebilir } } : {}) },
      select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
    sapmalariListele({ tesisIdleri: gorulebilir, limit: SAPMA_TAVANI }),
    anliklariListele(gorulebilir, ANLIK_TAVANI),
    /* Kapsam başına anlık sayısı tek sorguda: "hiç anlığı yok" ile "temeli
       yok" ayrı sayılar ve ikisi de sıfır sapmadan farklıdır. */
    db.topolojiAnlik.groupBy({ by: ['tesisId'], where: tesisKosulu, _count: { _all: true } }),
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
  ]);

  const tesisKodu = new Map(tesisler.map((t) => [t.id, t.kod]));

  /* ── kapsam satırları (temel şeridi) ─────────────────────────────────
     Tesissiz (global) anlıklar yalnız kapsamı sınırsız kullanıcıya
     gösterilir; kapsamı daraltılmış kullanıcının sorgusu zaten onları
     getirmiyor ve boş bir "Tesissiz" satırı yanıltıcı olurdu. */
  const kapsamlar: { tesisId: string | null; kod: string }[] = [
    ...tesisler.map((t) => ({ tesisId: t.id as string | null, kod: t.kod })),
    ...(gorulebilir === null ? [{ tesisId: null, kod: 'Tesissiz' }] : []),
  ];
  const anlikSayisiHaritasi = new Map(
    anlikSayimlari.map((s) => [s.tesisId ?? '__global__', s._count._all]),
  );

  const temeller: TemelSatiri[] = await Promise.all(kapsamlar.map(async (kap) => {
    const kapsamId = kap.tesisId ?? '__global__';
    const anlikSayisi = anlikSayisiHaritasi.get(kapsamId) ?? 0;
    // Anlığı olmayan kapsam için sorgu açmaya gerek yok: anlık yoksa temel
    // de yoktur. Boş kapsam yine de LİSTEDE KALIR — görünmemesi onu
    // "sorunsuz" gösterirdi, oysa hiç ölçülmemiştir.
    if (anlikSayisi === 0) {
      return {
        kapsamId, tesisId: kap.tesisId, tesisKodu: kap.kod, temelVar: false,
        temelAnlikId: null, temelAlindi: null, temelOnayZamani: null, temelKaynak: null,
        anlikSayisi: 0, acikSapma: 0,
      };
    }
    const d = await temelDurumu(kap.tesisId);
    return {
      kapsamId,
      tesisId: kap.tesisId,
      tesisKodu: kap.kod,
      temelVar: d.temelVar,
      temelAnlikId: d.temel?.id ?? null,
      temelAlindi: d.temel?.alindi.toISOString() ?? null,
      temelOnayZamani: d.temel?.onayZamani?.toISOString() ?? null,
      temelKaynak: d.temel?.kaynak ?? null,
      anlikSayisi: d.anlikSayisi,
      acikSapma: d.acikSapma,
    };
  }));

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
      kararVerilebilir: onaylayabilir
        && (!s.tesisId || izinVar(k, 'envanter', 'onay', { tesisId: s.tesisId })),
    };
  });

  const anliklar: AnlikSatiri[] = hamAnliklar.map((a) => {
    const kapsam = temelHaritasi.get(a.tesisId ?? '__global__');
    const sapmalariBu = sapmalar.filter((s) => s.anlikId === a.id);
    const yetkili = !a.tesisId || izinVar(k, 'envanter', 'onay', { tesisId: a.tesisId });
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
      karsilastirilabilir: yazabilir
        && (!a.tesisId || izinVar(k, 'envanter', 'yazma', { tesisId: a.tesisId })),
    };
  });

  return (
    <TopolojiIstemci
      sapmalar={sapmalar}
      anliklar={anliklar}
      temeller={temeller}
      ozet={{ acikSapma: ozet.acikSapma, kritikAcik: ozet.kritikAcik }}
      iz={izGorunumu}
      tesisler={tesisler}
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
