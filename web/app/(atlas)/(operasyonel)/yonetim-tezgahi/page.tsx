import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri, type Modul } from '@/lib/erisim';
import { Yetkisiz } from '@/components/abacus/temel';
import { db } from '@/lib/db';
import TezgahIstemci from './TezgahIstemci';
import type { Anahtar, Is, Tanim } from './ortak';

export const metadata: Metadata = { title: 'Yönetim tezgâhı — Atlas' };

/* M1/M2/P1-3 · Yönetim tezgâhı — eski /tanimlar + /gorevler ekranlarının
   birleşimi, üstüne dış API anahtarı yüzeyi. Kabuk (ray + çekmece kolonu)
   (operasyonel)/layout.tsx'ten gelir; burada UstCubuk ya da .icerik
   sarmalayıcısı YOK.

   Kapsam VERİ seviyesinde daraltılır (referans: /denetimler):
     · tanım katalogları `tanimlar` modülüne tabidir,
     · görev/onay akışı `uyum` modülüne tabidir,
     · API anahtarları `yonetim` modülüne tabidir; okuma yetkisi yoksa
       sorgu HİÇ ÇALIŞMAZ (ekranda gizlemek yetmez),
     · tesise bağlı olmayan kayıt portföy geneli sayılır ve GİZLENMEZ —
       aksi hâlde kapsam eksikliği kaydı görünmez kılardı.

   TANIM KATALOGLARI ve API ANAHTARLARI bölümleri BİLEREK kapsamsızdır,
   çünkü ikisi de kurum geneli sicillerdir: `Sektor`, `TesisTipi`,
   `VarlikTuru`, `Alan`, `Regulasyon` şemada `tesisId` taşımaz (bir varlık
   TÜRÜ tek bir santralin malı değildir), `ApiAnahtari` ise bir kullanıcıya
   bağlıdır ve kapsamını zaten o kullanıcının yetkilerinden alır
   (lib/api/yetki.ts → okumaKapsami). Kapsamla daraltılan yalnız görev/onay
   akışıdır; o da yukarıdaki `izinliIs` ile. */

/* Onay talebi tipi → kararın dayandığı modül (lib/eylemler2/gorev.ts
   içindeki eşlemenin ekran kopyası; yonetim/onay her tipe yeter). */
const ONAY_TIP_MODUL: Record<string, Modul> = {
  bulgu_kapanis: 'uyum', risk_kabul: 'risk', istisna: 'uyum',
  proje_aday: 'proje', applicability_override: 'uyum', proje_kapanis: 'proje',
};

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  const tanimOkuyabilir = izinVar(kullanici, 'tanimlar', 'okuma');
  const isOkuyabilir = izinVar(kullanici, 'uyum', 'okuma');
  const anahtarOkuyabilir = izinVar(kullanici, 'yonetim', 'okuma');
  if (!tanimOkuyabilir && !isOkuyabilir && !anahtarOkuyabilir) {
    return <Yetkisiz rol="tanımlar, uyum ya da yönetim okuma" />;
  }

  const tanimYazabilir = izinVar(kullanici, 'tanimlar', 'yazma');
  const tanimOnaylayabilir = izinVar(kullanici, 'tanimlar', 'onay');
  const gorevAcabilir = izinVar(kullanici, 'uyum', 'yazma');
  // Anahtar üretimi/iptali yonetim/yazma ister; eylemin kapısıyla AYNI kural
  // (lib/eylemler2/apiAnahtari.ts → yetkiZorunlu('yonetim', 'yazma')).
  const anahtarYazabilir = izinVar(kullanici, 'yonetim', 'yazma');
  const izinliTanim = izinliTesisIdleri(kullanici, 'tanimlar');
  const izinliIs = izinliTesisIdleri(kullanici, 'uyum');

  // `Date.now()` istek başına bir kez okunur; metrik ve tablo aynı "bugün"ü
  // paylaşsın (referans: /denetimler).
  const simdi = new Date().getTime();

  /* Anahtar sorgusu Promise.all ile birlikte koşsun diye önce kurulur.
     `select` bilinçlidir: tokenHash SORGUYA HİÇ GİRMEZ — doğrulama dışında
     hiçbir işe yaramaz ve istemciye sızma riski taşımasın. */
  const anahtarSorgusu = anahtarOkuyabilir
    ? db.apiAnahtari.findMany({
      select: {
        id: true, ad: true, onEk: true, sonKullanim: true, bitis: true,
        iptalZamani: true, olusturuldu: true,
        kullanici: { select: { id: true, adSoyad: true, aktif: true } },
        olusturan: { select: { adSoyad: true } },
        _count: { select: { istekler: true } },
      },
      orderBy: { olusturuldu: 'desc' },
    })
    : null;

  const [sektorler, tipler, tesisler, regulasyonlar, alanlar,
    gorevler, onaylar, kullanicilar] = await Promise.all([
    db.sektor.findMany({ include: { _count: { select: { tipler: true } } },
      orderBy: { kod: 'asc' } }),
    db.tesisTipi.findMany({ include: { sektor: true, _count: { select: { tesisler: true } } },
      orderBy: { sira: 'asc' } }),
    db.tesis.findMany({ include: { tip: true, _count: { select: { surecKapsamlari: true } } },
      orderBy: { kod: 'asc' } }),
    db.regulasyon.findMany({ include: { _count: { select: { maddeler: true, surecler: true } } },
      orderBy: { kod: 'asc' } }),
    db.kapsamAlani.findMany({ include: { _count: { select: { maddeAlanlari: true } } },
      orderBy: { kod: 'asc' } }),
    db.gorev.findMany({
      include: { sorumlu: true, tesis: true },
      orderBy: [{ sonTarih: { sort: 'asc', nulls: 'last' } }, { olusturuldu: 'desc' }],
    }),
    db.onayTalebi.findMany({
      include: { talepEden: true, onaylayan: true },
      orderBy: { olusturuldu: 'desc' },
    }),
    db.kullanici.findMany({ where: { aktif: true }, select: { id: true, adSoyad: true },
      orderBy: { adSoyad: 'asc' } }),
  ]);

  /* ── M1 · beş katalog tek satır tipine iner ─────────────────────────── */

  const bos = {
    tipId: null, guc: null, konum: null, kapanisNedeni: null, kapanisTarihi: null,
    surum: null, kaynakUrl: null, aciklama: null, sektorId: null,
  };

  const tanimlar: Tanim[] = tanimOkuyabilir ? [
    ...tesisler
      .filter((t) => izinliTanim === null || izinliTanim.includes(t.id))
      .map((t): Tanim => ({
        ...bos,
        id: `tesis-${t.id}`, kayitId: t.id, katalog: 'tesis',
        kod: t.kod, ad: t.ad,
        kullanim: t._count.surecKapsamlari, ikincilKullanim: null,
        devreDisi: t.durum === 'kapali',
        // Kırılımı olmayan AKTİF santralde uygulanabilirlik motoru karar
        // üretemez — zinciri kıran tek eksik budur. Kapalı santralde aranmaz.
        eksik: t.durum === 'aktif' && !t.tipId ? 'kırılım atanmadı' : null,
        // Kurulu güç girilmemişse "bilinmiyor" yazılır, 0 MW uydurulmaz (§19).
        not: t.konum ?? (t.kuruluGucMw !== null ? `${t.kuruluGucMw} MW` : 'konum bilinmiyor'),
        tipId: t.tipId, guc: t.kuruluGucMw, konum: t.konum,
        kapanisNedeni: t.kapanisNedeni,
        kapanisTarihi: t.kapanisTarihi?.toISOString() ?? null,
      })),
    ...regulasyonlar.map((r): Tanim => ({
      ...bos,
      id: `regulasyon-${r.id}`, kayitId: r.id, katalog: 'regulasyon',
      kod: r.kod, ad: r.ad,
      kullanim: r._count.maddeler,
      ikincilKullanim: { sayi: r._count.surecler, birim: 'süreç' },
      devreDisi: !r.aktif,
      eksik: r.aktif && r._count.maddeler === 0 ? 'madde içe aktarılmadı' : null,
      not: r.surum ?? 'sürüm girilmedi',
      surum: r.surum, kaynakUrl: r.kaynakUrl,
    })),
    ...alanlar.map((a): Tanim => ({
      ...bos,
      id: `alan-${a.id}`, kayitId: a.id, katalog: 'alan',
      kod: a.kod, ad: a.ad,
      kullanim: a._count.maddeAlanlari, ikincilKullanim: null,
      devreDisi: !a.aktif, eksik: null,
      not: a.aciklama ?? 'açıklama yok',
      aciklama: a.aciklama,
    })),
    ...tipler.map((t): Tanim => ({
      ...bos,
      id: `kirilim-${t.id}`, kayitId: t.id, katalog: 'kirilim',
      kod: t.kod, ad: t.ad,
      kullanim: t._count.tesisler, ikincilKullanim: null,
      devreDisi: !t.aktif,
      // Sektörsüz kırılım portföy kesitine düşmez: zinciri kırar.
      eksik: t.aktif && !t.sektorId ? 'sektör bağı yok' : null,
      not: t.sektor?.kod ?? 'sektörsüz',
      sektorId: t.sektorId,
    })),
    ...sektorler.map((s): Tanim => ({
      ...bos,
      id: `sektor-${s.id}`, kayitId: s.id, katalog: 'sektor',
      kod: s.kod, ad: s.ad,
      kullanim: s._count.tipler, ikincilKullanim: null,
      devreDisi: !s.aktif, eksik: null,
      not: 'iş kolu',
    })),
  ] : [];

  /* ── M2 · görev + onay talebi tek kuyruğa iner ──────────────────────── */

  const isler: Is[] = isOkuyabilir ? [
    ...gorevler
      .filter((g) => !g.tesisId || izinliIs === null || izinliIs.includes(g.tesisId))
      .map((g): Is => ({
        id: `g-${g.id}`, kayitId: g.id, tur: 'gorev',
        baslik: g.baslik, tip: g.tip,
        kaynakTipi: g.kaynakTipi, kaynakId: g.kaynakId,
        kisi: g.sorumlu ? { id: g.sorumlu.id, ad: g.sorumlu.adSoyad } : null,
        tesis: g.tesis ? { id: g.tesis.id, kod: g.tesis.kod, ad: g.tesis.ad } : null,
        sonTarih: g.sonTarih?.toISOString() ?? null,
        durum: g.durum, otomatik: g.otomatikUretildi,
        olusturuldu: g.olusturuldu.toISOString(),
        kapanis: g.kapanis?.toISOString() ?? null,
        gerekce: null, onaylayan: null,
        // eylem katmanıyla aynı kural: sorumlusuz görev serbest; sorumlusu
        // atanmışsa sorumlu ya da uyum onay yetkisi.
        yetkili: gorevAcabilir
          && (!g.sorumluId || g.sorumluId === kullanici.id
            || izinVar(kullanici, 'uyum', 'onay', g.tesisId ? { tesisId: g.tesisId } : {})),
      })),
    ...onaylar.map((o): Is => ({
      id: `o-${o.id}`, kayitId: o.id, tur: 'onay',
      baslik: o.ozet, tip: o.tip,
      kaynakTipi: o.kaynakTipi, kaynakId: o.kaynakId,
      kisi: o.talepEden ? { id: o.talepEden.id, ad: o.talepEden.adSoyad } : null,
      tesis: null, sonTarih: null,
      durum: o.durum, otomatik: false,
      olusturuldu: o.olusturuldu.toISOString(),
      kapanis: o.kapanis?.toISOString() ?? null,
      gerekce: o.gerekce,
      onaylayan: o.onaylayan?.adSoyad ?? null,
      // dört göz: kendi talebine karar verilemez; yetki yonetim/onay veya
      // talebin modülünde onay.
      yetkili: o.talepEdenId !== kullanici.id
        && (izinVar(kullanici, 'yonetim', 'onay')
          || izinVar(kullanici, ONAY_TIP_MODUL[o.tip] ?? 'yonetim', 'onay')),
    })),
  ] : [];

  /* ── P1-3 · API anahtarları ─────────────────────────────────────────
     Tam token bu haritada YOKTUR ve olamaz: veritabanında yalnız SHA-256
     özeti var, o da sorgulanmıyor. Ekrana giden tek tanıtıcı `onEk`. */

  const anahtarlar: Anahtar[] = anahtarSorgusu
    ? (await anahtarSorgusu).map((a): Anahtar => ({
      id: a.id,
      ad: a.ad,
      onEk: a.onEk,
      sahip: { id: a.kullanici.id, ad: a.kullanici.adSoyad },
      sahipAktif: a.kullanici.aktif,
      olusturan: a.olusturan?.adSoyad ?? null,
      // sonKullanim null = "kullanılmadı"; ölçüm var, değeri henüz oluşmadı.
      sonKullanim: a.sonKullanim?.toISOString() ?? null,
      bitis: a.bitis?.toISOString() ?? null,
      iptalZamani: a.iptalZamani?.toISOString() ?? null,
      olusturuldu: a.olusturuldu.toISOString(),
      /* Prisma COUNT'u: burada 0 UYDURMA DEĞİL, ölçülmüş sıfırdır. ApiIstegi
         tablosu boş olsa bile sayım yapılmıştır — "istek yok" demek yerine
         "0 istek" yazmak doğrudur. Bilinmeyeni sıfır saymak (§19) ancak
         ölçümün YAPILMADIĞI yerde yasaktır; burada ölçüm var. */
      istekSayisi: a._count.istekler,
    }))
    : [];

  return (
    <TezgahIstemci
      aktifId={kullanici.id}
      simdi={simdi}
      isler={isler}
      tanimlar={tanimlar}
      anahtarlar={anahtarlar}
      kullanicilar={kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad }))}
      tesisSecenekleri={tesisler
        .filter((t) => t.durum === 'aktif')
        .filter((t) => !izinliIs || izinliIs.includes(t.id))
        .map((t) => ({ id: t.id, kod: t.kod, ad: t.ad }))}
      kirilimSecenekleri={tipler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad }))}
      sektorSecenekleri={sektorler.map((s) => ({ id: s.id, kod: s.kod, ad: s.ad }))}
      tanimOkuyabilir={tanimOkuyabilir}
      isOkuyabilir={isOkuyabilir}
      anahtarOkuyabilir={anahtarOkuyabilir}
      tanimYazabilir={tanimYazabilir}
      tanimOnaylayabilir={tanimOnaylayabilir}
      gorevAcabilir={gorevAcabilir}
      anahtarYazabilir={anahtarYazabilir}
    />
  );
}
