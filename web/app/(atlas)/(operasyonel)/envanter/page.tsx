import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { db } from '@/lib/db';
import { ilkiniEsle } from '@/lib/sorguParcala';
import EnvanterIstemci from './EnvanterIstemci';
import type { Bolge, Iliski, Kodlu, Tur, Unite, V } from './mantik';

export const metadata: Metadata = { title: 'Varlık zekâsı — Abacus' };

/* O10 · Asset Intelligence + O11 · Asset Detail.

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Ekran iki kip taşır: ilişki grafiği (varlık ↔ ağ bölgesi ↔ sistem) ve
   tablo. Detay AYNI ANDA canvasta durmaz — çekmeceye iner (yoğunluk borcu
   DESIGN_HANDOFF_GAP §6: "tablo + detay paneli aynı anda"). */

/**
 * Envanter okuma kapsamı.
 *
 * Santrali BİLİNEN varlık, o santrale yetkisi olana görünür. Santrali
 * OLMAYAN varlık (henüz bir sahaya atanmamış kayıt) herkese görünür:
 * gizlemek onu kimsenin düzeltmeyeceği anlamına gelirdi ve envanterin
 * boşluğu tam da orada durur. Yazma yetkisi ayrıca satır satır hesaplanır.
 */
function kapsamKosulu(gorulebilir: string[] | null) {
  if (gorulebilir === null) return {};
  return { OR: [{ tesisId: { in: gorulebilir } }, { tesisId: null }] };
}

export default async function Sayfa() {
  const k = await girisZorunlu();

  /* `new Date()` sunucuda istek başına bir kez okunur; ömür eşikleri tüm
     satırlar için bu ana göre hesaplanır (istemcide saat kayması olmasın). */
  const simdi = new Date().getTime();
  const gorulebilir = izinliTesisIdleri(k, 'envanter');
  /* Varlık kapsamı TEK yerde tanımlanır: hem ana sorgu hem de ona bağlı
     alt sorgular (son yedek / son keşif) aynı koşulu kullanır. İkisi
     ayrışırsa ekran, göremediği bir varlığın yedek kaydını gösterirdi. */
  const varlikKapsami = { silindi: null, ...kapsamKosulu(gorulebilir) };
  const yazmaYetkisi = izinVar(k, 'envanter', 'yazma');
  const onayYetkisi = izinVar(k, 'envanter', 'onay');

  const [
    varliklar, tumTurler, tumTesisler, uniteler, sistemler, bolgeler,
    tumKullanicilar, tedarikciler, sozlesmeler,
  ] = await Promise.all([
      db.varlik.findMany({
        where: varlikKapsami,
        orderBy: { etiket: 'asc' },
        select: {
          id: true, etiket: true, ad: true,
          hostname: true, seriNo: true, uretici: true, model: true,
          ipAdresi: true, macAdresi: true, isletimSistemi: true,
          firmware: true, surum: true, rafOda: true, kimlikDogrulama: true,
          kritiklik: true, yamaDurumu: true, edrDurumu: true, yedekDurumu: true,
          izlemeDurumu: true, logKaynagi: true, internetMaruziyeti: true,
          uzaktanErisim: true, yasamDongusu: true,
          kurulumTarihi: true, garantiBitis: true, destekBitis: true,
          eolTarihi: true, eosTarihi: true, guncellendi: true,
          /* Boyut tabloları (tür, santral, ünite, sistem, bölge, kişi,
             tedarikçi, sözleşme) ilişki olarak DEĞİL, yalnız yabancı
             anahtar olarak okunur. Nedeni ölçüm: Prisma her ilişkiyi
             `id IN (…)` ile 999'luk parçalar hâlinde çeker, yani 10.000
             varlıkta ilişki başına 11 sorgu — dokuz ilişki için 99 sorgu.
             Bu tabloların TAMAMI zaten aşağıda birer kez okunuyor (filtre
             açılırları için); satırlar bellekte eşlenir. */
          turId: true, tesisId: true, uniteId: true, sistemId: true,
          bolgeId: true, sahipId: true, emanetciId: true,
          tedarikciId: true, sozlesmeId: true,
          kaynakIliskiler: {
            select: {
              id: true, tip: true,
              hedef: { select: { id: true, etiket: true, ad: true } },
            },
          },
          hedefIliskiler: {
            select: {
              id: true, tip: true,
              kaynak: { select: { id: true, etiket: true, ad: true } },
            },
          },
          riskler: {
            select: {
              risk: { select: { id: true, kod: true, baslik: true, silindi: true } },
            },
          },
          kanitlar: {
            select: {
              kanit: { select: { id: true, ad: true, tip: true, silindi: true } },
            },
          },
          /* Zincir görünümü zafiyeti ADIYLA ister; sayaç tek başına
             "hangi zafiyet" sorusunu yanıtlamıyordu. */
          zafiyetler: {
            select: {
              durum: true, sonTarih: true,
              zafiyet: { select: { id: true, kaynakRef: true, baslik: true, cvss: true } },
            },
          },
        },
      }),
      /* Açılır listeler AKTİF kayıtları gösterir; satır eşlemesi ise
         TÜMÜNÜ ister — pasifleştirilmiş bir türe ya da kapatılmış bir
         santrale bağlı varlığın türü/santrali ekranda kaybolmamalı.
         Bu yüzden tablo bir kez tam okunur, ayrım JS'te yapılır. */
      db.varlikTuru.findMany({
        select: { id: true, kod: true, ad: true, sinif: true, aktif: true },
        orderBy: [{ sinif: 'asc' }, { ad: 'asc' }],
      }),
      db.tesis.findMany({
        select: { id: true, kod: true, ad: true, durum: true },
        orderBy: { kod: 'asc' },
      }),
      db.uretimUnitesi.findMany({
        select: { id: true, kod: true, ad: true, tesisId: true },
        orderBy: { kod: 'asc' },
      }),
      db.sistemServis.findMany({
        select: { id: true, kod: true, ad: true },
        orderBy: { kod: 'asc' },
      }),
      db.agBolgesi.findMany({
        select: { id: true, kod: true, ad: true, tip: true, guvenlikSeviyesi: true, tesisId: true },
        orderBy: { kod: 'asc' },
      }),
      db.kullanici.findMany({
        select: { id: true, adSoyad: true, aktif: true },
        orderBy: { adSoyad: 'asc' },
      }),
      db.tedarikci.findMany({ select: { id: true, ad: true } }),
      db.sozlesme.findMany({ select: { id: true, kod: true, ad: true } }),
    ]);

  /* Boyut haritaları: satır eşlemesi sözlük araması olur, sorgu değil. */
  const turHaritasi = new Map(tumTurler.map((t) => [t.id, t]));
  const tesisHaritasi = new Map(tumTesisler.map((t) => [t.id, t]));
  const uniteHaritasi = new Map(uniteler.map((u) => [u.id, u]));
  const sistemHaritasi = new Map(sistemler.map((x) => [x.id, x]));
  const bolgeHaritasi = new Map(bolgeler.map((b) => [b.id, b]));
  const kisiHaritasi = new Map(tumKullanicilar.map((u) => [u.id, u]));
  const tedarikciHaritasi = new Map(tedarikciler.map((t) => [t.id, t]));
  const sozlesmeHaritasi = new Map(sozlesmeler.map((x) => [x.id, x]));

  const turler = tumTurler.filter((t) => t.aktif)
    .map((t) => ({ id: t.id, kod: t.kod, ad: t.ad, sinif: t.sinif }));
  const tesisler = tumTesisler.filter((t) => t.durum === 'aktif')
    .map((t) => ({ id: t.id, kod: t.kod, ad: t.ad }));
  const kullanicilar = tumKullanicilar.filter((u) => u.aktif);

  /* Son yedek ve son keşif: varlığın kanıt zinciri. Kayıt YOKSA null —
     "yedek alınmadı" değil, "yedek kaydı görülmedi" demektir.

     NEDEN ayrı sorgu: bunlar önce ilişki seviyesinde `take: 1` ile
     okunuyordu. Prisma bu kalıbı ebeveyn başına BİR parametre taşıyan tek
     bir sorguya çevirir ve parçalayamaz; envanter 998. varlıkta
     "query parameter limit exceeded" ile TAMAMEN çöküyordu (yavaşlamıyordu,
     500 dönüyordu). Parçalı okuma sınırı kaldırır ve sorgu sayısını da
     düşürür.

     Kapsam kimlik listesiyle DEĞİL, ebeveynin kendi koşuluyla (ilişki
     filtresi) daraltılır: `id IN (10.000 değer)` hem 999 sınırına takılır
     hem de yalnız parametre bağlamak için ölçülebilir zaman harcar
     (boş tabloda 12 parçalı sorgu 34ms, ilişki filtresiyle 0ms).
     Süzülen küme birebir aynıdır — ebeveyn sorgusuyla aynı `where`. */
  const [yedekSatirlari, kesifSatirlari] = await Promise.all([
    db.konfigurasyonYedegi.findMany({
      where: { varlik: varlikKapsami },
      select: { varlikId: true, yedekZamani: true, basarili: true },
      orderBy: { yedekZamani: 'desc' },
    }),
    db.kesifKaydi.findMany({
      where: { eslesenVarlik: varlikKapsami },
      select: { id: true, kaynak: true, sonGorulme: true, eslesenVarlikId: true },
      orderBy: { sonGorulme: 'desc' },
    }),
  ]);
  const sonYedekler = ilkiniEsle(yedekSatirlari, (y) => y.varlikId);
  const sonKesifler = ilkiniEsle(kesifSatirlari, (k) => k.eslesenVarlikId);

  /* ── Yönetişim zinciri ────────────────────────────────────────────────
     Prototipin (a-assets) omurgası SANTRAL → SİSTEM → VARLIK → ZAFİYET →
     RİSK → KONTROL → PROJE. Son iki halka varlıkta yok; risk üzerinden
     KÜME sorgusuyla çekilir — varlık başına sorgu açmak envanterin
     boyutunda N+1 olurdu (aynı gerekçe boyut tabloları için de geçerli,
     yukarıya bakınız). */
  const riskIdleri = [...new Set(
    varliklar.flatMap((v) => v.riskler.filter((r) => !r.risk.silindi).map((r) => r.risk.id)),
  )];
  const varlikIdleri = varliklar.map((v) => v.id);

  const [riskKontrolleri, projeBaglantilari] = await Promise.all([
    riskIdleri.length === 0 ? Promise.resolve([]) : db.risk.findMany({
      where: { id: { in: riskIdleri } },
      select: {
        id: true, artikRisk: true, durum: true,
        bulgu: {
          select: {
            id: true, baslik: true,
            maddeDurumu: {
              select: {
                durum: true,
                madde: { select: { id: true, kod: true, baslik: true } },
              },
            },
          },
        },
      },
    }),
    db.projeBaglantisi.findMany({
      where: {
        OR: [
          { varlikId: { in: varlikIdleri } },
          ...(riskIdleri.length ? [{ riskId: { in: riskIdleri } }] : []),
        ],
        proje: { silindi: null },
      },
      select: {
        varlikId: true, riskId: true,
        proje: { select: { id: true, kod: true, ad: true, durum: true } },
      },
    }),
  ]);

  const kontrolHaritasi = new Map(riskKontrolleri.map((r) => [r.id, r]));
  const projeRiske = new Map<string, typeof projeBaglantilari>();
  const projeVarliga = new Map<string, typeof projeBaglantilari>();
  for (const b of projeBaglantilari) {
    if (b.riskId) projeRiske.set(b.riskId, [...(projeRiske.get(b.riskId) ?? []), b]);
    if (b.varlikId) projeVarliga.set(b.varlikId, [...(projeVarliga.get(b.varlikId) ?? []), b]);
  }

  const veri: V[] = varliklar.map((v) => {
    const iliskiler: Iliski[] = [
      ...v.kaynakIliskiler.map((i) => ({
        id: i.id, tip: i.tip, giden: true, diger: i.hedef,
      })),
      ...v.hedefIliskiler.map((i) => ({
        id: i.id, tip: i.tip, giden: false, diger: i.kaynak,
      })),
    ];
    const yedek = sonYedekler.get(v.id) ?? null;
    const kesif = sonKesifler.get(v.id) ?? null;
    /* Yazma kapsamı satır satır: tesise kısıtlı rol yalnız kendi santralinin
       varlığını yazabilir. Kural lib/eylemler2/envanter.ts ile aynıdır —
       ekran yalnız düğmeyi kapatır, sunucu ayrıca reddeder. */
    const tur = turHaritasi.get(v.turId);
    const tesis = v.tesisId === null ? null : tesisHaritasi.get(v.tesisId) ?? null;
    const unite = v.uniteId === null ? null : uniteHaritasi.get(v.uniteId) ?? null;
    const sistem = v.sistemId === null ? null : sistemHaritasi.get(v.sistemId) ?? null;
    const bolge = v.bolgeId === null ? null : bolgeHaritasi.get(v.bolgeId) ?? null;
    const sahip = v.sahipId === null ? null : kisiHaritasi.get(v.sahipId) ?? null;
    const emanetci = v.emanetciId === null ? null : kisiHaritasi.get(v.emanetciId) ?? null;
    const tedarikci = v.tedarikciId === null ? null : tedarikciHaritasi.get(v.tedarikciId) ?? null;
    const sozlesme = v.sozlesmeId === null ? null : sozlesmeHaritasi.get(v.sozlesmeId) ?? null;
    const kapsam = { tesisId: tesis?.id ?? null };
    return {
      id: v.id, etiket: v.etiket, ad: v.ad,
      /* turId zorunlu ve yabancı anahtarla güvence altında; yine de tür
         satırı bulunamazsa uydurmak yerine BİLİNMİYOR yazılır. */
      tur: tur
        ? { id: tur.id, kod: tur.kod, ad: tur.ad, sinif: tur.sinif }
        : { id: v.turId, kod: '—', ad: 'bilinmiyor', sinif: 'bilinmiyor' },
      tesis: tesis ? { id: tesis.id, kod: tesis.kod, ad: tesis.ad } : null,
      unite: unite ? { id: unite.id, kod: unite.kod, ad: unite.ad } : null,
      sistem: sistem ? { id: sistem.id, kod: sistem.kod, ad: sistem.ad } : null,
      bolge: bolge
        ? {
          id: bolge.id, kod: bolge.kod, ad: bolge.ad, tip: bolge.tip,
          seviye: bolge.guvenlikSeviyesi, tesisId: bolge.tesisId,
        }
        : null,
      sahip: sahip ? { id: sahip.id, ad: sahip.adSoyad } : null,
      emanetci: emanetci ? { id: emanetci.id, ad: emanetci.adSoyad } : null,
      tedarikci, sozlesme,
      hostname: v.hostname, seriNo: v.seriNo, uretici: v.uretici, model: v.model,
      ipAdresi: v.ipAdresi, macAdresi: v.macAdresi, isletimSistemi: v.isletimSistemi,
      firmware: v.firmware, surum: v.surum, rafOda: v.rafOda,
      kimlikDogrulama: v.kimlikDogrulama,
      kritiklik: v.kritiklik, yamaDurumu: v.yamaDurumu, edrDurumu: v.edrDurumu,
      yedekDurumu: v.yedekDurumu, izlemeDurumu: v.izlemeDurumu, logKaynagi: v.logKaynagi,
      internetMaruziyeti: v.internetMaruziyeti, uzaktanErisim: v.uzaktanErisim,
      yasamDongusu: v.yasamDongusu,
      kurulumTarihi: v.kurulumTarihi?.toISOString() ?? null,
      garantiBitis: v.garantiBitis?.toISOString() ?? null,
      destekBitis: v.destekBitis?.toISOString() ?? null,
      eolTarihi: v.eolTarihi?.toISOString() ?? null,
      eosTarihi: v.eosTarihi?.toISOString() ?? null,
      guncellendi: v.guncellendi.toISOString(),
      iliskiler,
      riskler: v.riskler.filter((r) => !r.risk.silindi)
        .map((r) => {
          const ek = kontrolHaritasi.get(r.risk.id);
          return {
            id: r.risk.id, kod: r.risk.kod, baslik: r.risk.baslik,
            artikRisk: ek?.artikRisk ?? null,
            kontrol: ek?.bulgu?.maddeDurumu
              ? {
                kod: ek.bulgu.maddeDurumu.madde.kod,
                baslik: ek.bulgu.maddeDurumu.madde.baslik,
                durum: ek.bulgu.maddeDurumu.durum,
              }
              : null,
            bulgu: ek?.bulgu ? { id: ek.bulgu.id, baslik: ek.bulgu.baslik } : null,
          };
        }),
      zafiyetler: v.zafiyetler
        .filter((z) => z.durum === 'acik')
        .map((z) => ({
          id: z.zafiyet.id,
          ref: z.zafiyet.kaynakRef,
          baslik: z.zafiyet.baslik,
          cvss: z.zafiyet.cvss,
          sonTarih: z.sonTarih?.toISOString() ?? null,
        }))
        .sort((a, b) => (b.cvss ?? -1) - (a.cvss ?? -1)),
      projeler: [
        ...(projeVarliga.get(v.id) ?? []),
        ...v.riskler.flatMap((r) => projeRiske.get(r.risk.id) ?? []),
      ]
        .filter((b, i, dizi) => dizi.findIndex((x) => x.proje.id === b.proje.id) === i)
        .map((b) => ({
          id: b.proje.id, kod: b.proje.kod, ad: b.proje.ad, durum: b.proje.durum,
        })),
      kanitlar: v.kanitlar.filter((kb) => !kb.kanit.silindi)
        .map((kb) => ({ id: kb.kanit.id, ad: kb.kanit.ad, tip: kb.kanit.tip })),
      acikZafiyet: v.zafiyetler.filter((z) => z.durum === 'acik').length,
      sonYedek: yedek
        ? { zaman: yedek.yedekZamani.toISOString(), basarili: yedek.basarili }
        : null,
      sonKesif: kesif
        ? { id: kesif.id, kaynak: kesif.kaynak, sonGorulme: kesif.sonGorulme.toISOString() }
        : null,
      yazilabilir: yazmaYetkisi && izinVar(k, 'envanter', 'yazma', kapsam),
      onaylanabilir: onayYetkisi && izinVar(k, 'envanter', 'onay', kapsam),
    };
  });

  return (
    <EnvanterIstemci
      varliklar={veri}
      turler={turler as Tur[]}
      tesisler={tesisler as Kodlu[]}
      uniteler={uniteler as Unite[]}
      sistemler={sistemler as Kodlu[]}
      bolgeler={bolgeler.map((b): Bolge => ({
        id: b.id, kod: b.kod, ad: b.ad, tip: b.tip,
        seviye: b.guvenlikSeviyesi, tesisId: b.tesisId,
      }))}
      kullanicilar={kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad }))}
      yazabilir={yazmaYetkisi}
      simdi={simdi}
    />
  );
}
