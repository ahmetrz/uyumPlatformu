import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamKosulu, modulKapisi, modulYazabilir } from '@/app/kapsam';
import { acikMi, bulguImi, dogrulamaBekliyorMu, gecikmeGunu } from './mantik';

/* O7 · Bulgu & CAPA — SUNUCU VERİSİ (kapsam kuralı JSX'ten ayrı test edilsin).

   ═══ KAPSAM SIZINTISI ══════════════════════════════════════════════════
   Ekran `db.bulgu.findMany({ where: { silindi: null } })` diyordu. Bulgunun
   kendi `tesisId`si yoktur; santrale `maddeDurumu.tesisId` üzerinden
   bağlıdır ve ekran o alanı (id · kod · ad) satıra da yazıyordu. Yalnız A
   santraline yetkili bir kullanıcı B'nin bulgu başlığını, sorumlusunu,
   santral kodunu ve — çekmecedeki denetim izi üzerinden — kim neyi ne zaman
   değiştirdiğini görüyordu.

   ═══ SINIRSIZ OKUMA (P1) ═══════════════════════════════════════════════
   Ekran bütün bulguları, hepsinin aksiyonlarını ve 600 iz satırını `take`
   olmadan çekiyordu. Üç kural uygulandı:
     1. Satırlar `SATIR_TAVANI` ile sınırlı (açık kayıtlar önce sıralanır,
        yani kesme olursa elde kalan açık bulgulardır).
     2. Kesme SESSİZ DEĞİL: `toplam` ayrı bir `count` ile ölçülür, ekran
        "gösterilen N / M" der.
     3. Metrikler KESİLMEMİŞ kütükten gelir. Bunun için sayım ayrı bir HAFİF
        geçişle yapılır: `sayimGecisi` yalnız durum/termin/aksiyon
        kolonlarını okur (sorumlu · madde · tesis · süreç · denetim izi YOK),
        `take` almaz ve `mantik.ts`in saf yüklemlerini aynen kullanır. Böylece
        sayı satır kesmesinden etkilenmez ve iki yerde iki farklı "gecikmiş"
        tanımı doğmaz.

   MODÜL SEÇİMİ: `uyum`. Gerekçe kaydın konusudur: bulgu bir UYUM kaydının
   (`MaddeDurumu`) çocuğudur ve `lib/eylemler.ts`teki bütün bulgu/aksiyon
   eylemleri (`bulguOlustur`, `bulguGuncelle`, `aksiyonEkle`,
   `aksiyonDurumDegistir`, `kanitEkle`) `yetkiZorunlu('uyum', …)` çağırır.
   Kardeş ekranlar da aynı modülü kullanır: /uyum, /surecler, /raporlar.
   `denetim` seçmek yanlış olurdu — bulgu denetim dışında da (olaydan,
   iç incelemeden) doğar.

   ── SANTRALİ BİLİNMEYEN KAYIT ──────────────────────────────────────────
   `MaddeDurumu.tesisId` şemada ZORUNLUDUR (String, null değil): bu ekranda
   santrali bilinmeyen bulgu YOKTUR. Kural yine de tek yerden gelir
   (`app/kapsam.ts → kapsamKosulu`), çünkü şema değişirse davranışın
   `lib/api/yetki.ts → tesisKapsamda` ile aynı kalması gerekir. */

/** Çekmecede gösterilen denetim izi derinliği (satır başına). */
const IZ_BUTCESI = 8;
/** Kütükten çekilen en fazla iz kaydı. */
const IZ_PENCERESI = 600;

/**
 * Sunucudan çekilen en fazla bulgu satırı.
 *
 * Yoğunluk sözleşmesi 5–9 GÖRÜNÜR satır + katlanmış kuyruk der; istemci mercek,
 * arama ve çekmece için kütüğün geri kalanını da ister. 400, "bir kurumun
 * aynı anda takip ettiği açık bulgu sayısı"nın üstünde, "tabloyu belleğe
 * almak"ın altında bir sınırdır. Aşıldığında ekran SÖYLER.
 */
export const SATIR_TAVANI = 400;

/** Metrikler — kesilmemiş kütük üzerinde, hafif bir sayım geçişiyle. */
export type BulguMetrikleri = {
  acik: number;
  gecikmis: number;
  dogrulama: number;
  zamaninda: number;
  aksiyonsuz: number;
  kapali: number;
};

export type Iz = {
  id: string; aktor: string; eylem: string; varlikTipi: string;
  alan: string | null; once: string | null; sonra: string | null;
  dosya: string | null; zaman: string;
};

export type EkranVerisi = {
  bulgular: Awaited<ReturnType<typeof bulguSatirlari>>;
  /** kütüğün GERÇEK büyüklüğü — `take` kesmesi sessiz kalmasın diye */
  toplam: number;
  satirTavani: number;
  metrikler: BulguMetrikleri;
  yazabilir: boolean;
  /** true = liste bir santral kapsamıyla daraltıldı (boş ekranın sözü değişir) */
  kapsamli: boolean;
};

async function bulguSatirlari(izinli: string[] | null) {
  const bulgular = await db.bulgu.findMany({
    where: { silindi: null, maddeDurumu: kapsamKosulu(izinli) },
    /* Kesme olursa elde kalan AÇIK bulgular olsun: `durum asc` kapalıyı
       sona atar. Sıralama `take` ile birlikte bir karardır, süs değil. */
    take: SATIR_TAVANI,
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

  /* Denetim izi kapsam İÇİ bulgulardan türetilir: sorgu yalnız yukarıdaki
     daraltılmış kümenin id'lerini sorar, dolayısıyla kapsam dışı bir
     bulgunun değişiklik geçmişi buraya hiç girmez. */
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
    take: IZ_PENCERESI,
  });

  const izHaritasi: Record<string, Iz[]> = {};
  for (const i of izler) {
    const bulguId = i.varlikTipi === 'Bulgu' ? i.varlikId : aksiyonunBulgusu.get(i.varlikId);
    if (!bulguId) continue;
    const liste = (izHaritasi[bulguId] ??= []);
    if (liste.length >= IZ_BUTCESI) continue; // çekmece 8 kaydı gösterir
    liste.push({
      id: i.id, aktor: i.aktor?.adSoyad ?? 'Sistem', eylem: i.eylem, varlikTipi: i.varlikTipi,
      alan: i.alan, once: i.oncekiDeger, sonra: i.yeniDeger,
      dosya: i.dosyaAdi, zaman: i.zaman.toISOString(),
    });
  }

  return bulgular.map((b) => ({
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
}

/**
 * SAYIM GEÇİŞİ — kesilmemiş kütüğün tamamı, ama yalnız sayının ihtiyaç
 * duyduğu kolonlar. `take` YOKTUR (sayı kesilmemeli), ilişki olarak yalnız
 * aksiyonların durum/doğrulama alanları okunur (satır geçişindeki sorumlu ·
 * madde · tesis · süreç · denetim izi burada YOK). Türetme `mantik.ts`in
 * saf yüklemleriyle yapılır ki liste ile metrik aynı tanımı konuşsun.
 */
async function sayimGecisi(izinli: string[] | null): Promise<BulguMetrikleri> {
  const satirlar = await db.bulgu.findMany({
    where: { silindi: null, maddeDurumu: kapsamKosulu(izinli) },
    select: {
      durum: true, hedefTarih: true, retestGerekli: true, retestSonucu: true,
      kapanisDogrulama: true, kapanisDogrulayan: { select: { adSoyad: true } },
      aksiyonlar: {
        select: {
          id: true, baslik: true, durum: true, dogrulamaDurumu: true,
          hedef: true, tamamlanma: true, dogrulamaTarihi: true,
          dogrulayan: { select: { adSoyad: true } }, etkinlikNotu: true,
        },
      },
    },
  });

  const ozetler = satirlar.map((b) => ({
    durum: b.durum,
    hedef: b.hedefTarih?.toISOString() ?? null,
    retestGerekli: b.retestGerekli,
    retestSonucu: b.retestSonucu,
    kapanisDogrulama: b.kapanisDogrulama?.toISOString() ?? null,
    kapanisDogrulayan: b.kapanisDogrulayan?.adSoyad ?? null,
    aksiyonlar: b.aksiyonlar.map((a) => ({
      id: a.id, baslik: a.baslik, durum: a.durum,
      sorumlu: null,
      hedef: a.hedef?.toISOString() ?? null,
      tamamlanma: a.tamamlanma?.toISOString() ?? null,
      dogrulama: a.dogrulamaDurumu,
      dogrulamaTarihi: a.dogrulamaTarihi?.toISOString() ?? null,
      dogrulayan: a.dogrulayan?.adSoyad ?? null,
      not: a.etkinlikNotu,
    })),
  }));

  const acik = ozetler.filter((b) => acikMi(b.durum));
  const gecikmis = acik.filter((b) => gecikmeGunu(b) !== null);
  return {
    acik: acik.length,
    gecikmis: gecikmis.length,
    dogrulama: acik.filter((b) => gecikmeGunu(b) === null && dogrulamaBekliyorMu(b)).length,
    zamaninda: acik.filter((b) => bulguImi(b) === 'ok').length,
    aksiyonsuz: acik.filter((b) => b.aksiyonlar.length === 0).length,
    kapali: ozetler.length - acik.length,
  };
}

export async function bulguEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'uyum');
  const izinli = izinliTesisIdleri(k, 'uyum');
  const [bulgular, toplam, metrikler] = await Promise.all([
    bulguSatirlari(izinli),
    db.bulgu.count({ where: { silindi: null, maddeDurumu: kapsamKosulu(izinli) } }),
    sayimGecisi(izinli),
  ]);
  return {
    bulgular,
    toplam,
    satirTavani: SATIR_TAVANI,
    metrikler,
    yazabilir: modulYazabilir(k, 'uyum', 'yazma'),
    kapsamli: kapsamDaraltildi(izinli),
  };
}
