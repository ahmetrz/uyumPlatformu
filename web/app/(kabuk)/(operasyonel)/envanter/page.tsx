import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri } from '@/lib/erisim';
import { kapsamdaYetkili, modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import { ayar } from '@/lib/yapilandirma/oku';
import { DEMO } from '@/lib/demo';
import { ilkiniEsle } from '@/lib/sorguParcala';
import EnvanterIstemci from './EnvanterIstemci';
import type { Bolge, Durus, Iliski, Kodlu, Tur, Unite, V, Yonetisim } from './mantik';

export const metadata: Metadata = { title: 'Varlık zekâsı' };

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

export default async function Sayfa({ searchParams }: {
  searchParams: Promise<{ bolge?: string | string[] }>;
}) {
  const k = await girisZorunlu();
  /* Topoloji › Bölgeler çekmecesinden gelen `?bolge=KOD` bağı: liste bu
     kodla ARANMIŞ açılır (bölge kodu arama havuzundadır). Süzgeç durumunun
     kendisi URL'ye yazılmaz; yalnız başlangıç değeri buradan gelir.

     STATİK DEMODA OKUNMAZ — demo `output: 'export'` ile derlenir, HTML bir
     kez üretilir ve arkasında istek gören sunucu yoktur; `dynamic = "error"`
     altında `await searchParams` derlemeyi KIRAR (bkz. giris/page.tsx'teki
     aynı not). Demoda bağ yine çalışır, yalnız liste aranmış değil boş
     süzgeçle açılır. */
  const { bolge } = DEMO ? { bolge: undefined } : await searchParams;
  const baslangicArama = (Array.isArray(bolge) ? bolge[0] : bolge)?.trim().slice(0, 64) ?? '';

  /* `new Date()` sunucuda istek başına bir kez okunur; ömür eşikleri tüm
     satırlar için bu ana göre hesaplanır (istemcide saat kayması olmasın). */
  const simdi = new Date().getTime();
  const gorulebilir = izinliTesisIdleri(k, 'envanter');
  /* Varlık kapsamı TEK yerde tanımlanır: hem ana sorgu hem de ona bağlı
     alt sorgular (son yedek / son keşif) aynı koşulu kullanır. İkisi
     ayrışırsa ekran, göremediği bir varlığın yedek kaydını gösterirdi. */
  const varlikKapsami = { silindi: null, ...kapsamKosulu(gorulebilir) };
  const yazmaYetkisi = modulYazabilir(k, 'envanter', 'yazma');
  const onayYetkisi = modulYazabilir(k, 'envanter', 'onay');

  const [
    varliklar, tumTurler, tumTesisler, uniteler, sistemler, bolgeler,
    tumKullanicilar, tedarikciler, sozlesmeler,
    firmwareSatirlari, yamaSatirlari, kapsamSatirlari, korelasyonSatirlari,
    uygulanamazSatirlari, sbomSatirlari, segmentler, yazilimSatirlari,
    adimSatirlari, etkiSatirlari, ekipler, konfigTemelleri, sapmaSayaci,
  ] = await Promise.all([
      db.varlik.findMany({
        where: varlikKapsami,
        orderBy: { etiket: 'asc' },
        select: {
          id: true, etiket: true, ad: true,
          hostname: true, seriNo: true, uretici: true, model: true,
          ipAdresi: true, macAdresi: true, isletimSistemi: true,
          firmware: true, surum: true, rafOda: true, kimlikDogrulama: true,
          /* OT-03 · kimlik envanterinin ayrı ölçülen dört alanı. */
          ipv6Adresi: true, isletimSistemiSurumu: true,
          firmwareYapisi: true, donanimRevizyonu: true,
          segmentId: true, ekipId: true,
          /* OT-20 · Garanti sağlayıcı ve bakım takvimi. */
          garantiSaglayici: true, bakimBitis: true, sonBakim: true, sonrakiBakim: true,
          kritiklik: true, uretimEtkisi: true,
          yamaDurumu: true, edrDurumu: true, yedekDurumu: true,
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
      /* ── Güvenlik duruşu (OT-03 · OT-11 · OT-21 · OT-22 · OT-25 · OT-26 ·
         OT-27) ────────────────────────────────────────────────────────
         İlişki olarak DEĞİL, ayrı birer findMany ile okunur — yukarıdaki
         boyut tabloları için yazılmış gerekçenin aynısı: Prisma her
         ilişkiyi parçalı `id IN (…)` ile çeker; yedi ilişki daha onlarca
         sorgu açardı. Satırlar bellekte varlık kimliğine eşlenir.

         Kapsam süzgeci burada YOK, çünkü satırlar aşağıda yalnız görünür
         varlıkların kimliğine eşleniyor; kapsam dışı varlığın duruş satırı
         hiçbir haritaya girmiyor ve ekrana çıkmıyor. */
      db.firmwareUyumu.findMany({
        select: {
          varlikId: true, durum: true, kuruluSurum: true, gerekce: true,
          istisnaGerekcesi: true, sonDogrulama: true,
        },
      }),
      db.yamaKaydi.findMany({
        select: {
          varlikId: true, durum: true, mevcutSeviye: true, temelSeviye: true,
          eksikYama: true, siddet: true, yenidenBaslatmaGerekli: true,
          yamalanamaz: true, istisnaGerekcesi: true, kaynakSistem: true, sonDogrulama: true,
        },
      }),
      db.guvenlikKapsami.findMany({
        select: { varlikId: true, tip: true, durum: true, sonDogrulama: true, gerekce: true },
      }),
      db.zafiyetKorelasyonu.findMany({
        select: {
          id: true, varlikId: true, sonuc: true, guven: true, gerekce: true,
          elleSonuc: true, elleGerekce: true,
          zafiyet: { select: { kaynakRef: true, baslik: true, cvss: true } },
        },
      }),
      db.alanUygulanabilirligi.findMany({
        where: { varlikTipi: 'Varlik' },
        select: { varlikId: true, alan: true, gerekce: true },
      }),
      /* SBOM bir yazılım ürününe de bağlanabilir (`varlikId` null);
         çekmece yalnız varlığa bağlı olanları gösterir. */
      db.sbomBelgesi.findMany({
        where: { varlikId: { not: null } },
        select: { varlikId: true, bicim: true, bilesenSayisi: true, yuklendi: true },
      }),
      db.agSegmenti.findMany({
        select: { id: true, kod: true, ad: true, cidr: true, vlanId: true, bolgeId: true },
        orderBy: { kod: 'asc' },
      }),
      db.varlikYazilimi.findMany({
        select: {
          varlikId: true,
          yazilim: { select: { id: true, ad: true, surum: true } },
        },
      }),
      /* ── Yönetişim (OT-05 · OT-08 · OT-09 · OT-28) ──────────────────
         Aynı gerekçe: ilişki olarak değil ayrı findMany. */
      db.adimVarligi.findMany({
        select: {
          id: true, varlikId: true, rol: true, tekNokta: true, yedekli: true,
          adim: {
            select: {
              id: true, ad: true, sira: true, uretimEtkisi: true,
              rtoSaat: true, rpoSaat: true,
              surec: { select: { kod: true, ad: true } },
            },
          },
        },
      }),
      db.etkiDegerlendirmesi.findMany({
        select: {
          varlikId: true, uretimKaybiMw: true, kayipTipi: true,
          rtoSaat: true, rpoSaat: true, emniyetEtkisi: true, cevreEtkisi: true,
          gerekce: true, zaman: true,
          degerlendiren: { select: { adSoyad: true } },
        },
      }),
      db.ekip.findMany({
        select: {
          id: true, kod: true, ad: true, tip: true, aktif: true, tesisId: true,
          /* Aktif ÜYE sayısı sahiplik zincirinin can damarıdır: aktif üyesi
             olmayan bir ekip, atanmış görünüp kimsenin bakmadığı bir
             kutudur. */
          _count: { select: { uyeler: { where: { kullanici: { aktif: true } } } } },
        },
        orderBy: { kod: 'asc' },
      }),
      db.konfigTemeli.findMany({
        select: {
          varlikId: true, ozetHash: true, onayZamani: true,
          onaylayan: { select: { adSoyad: true } },
        },
      }),
      db.konfigSapmasi.groupBy({
        by: ['varlikId'], where: { durum: 'acik' }, _count: { _all: true },
      }),
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

  /* ── Duruş haritaları ────────────────────────────────────────────────
     Yedi tablo tek geçişte varlık kimliğine indekslenir. `çokluEsle`
     yerine döngü kullanılıyor çünkü satır sayısı varlık sayısının
     katıdır ve ara dizi üretmek boşuna kopya çıkarırdı. */
  function grupla<T extends { varlikId: string }>(satirlar: T[]): Map<string, T[]> {
    const harita = new Map<string, T[]>();
    for (const s of satirlar) {
      const mevcut = harita.get(s.varlikId);
      if (mevcut) mevcut.push(s); else harita.set(s.varlikId, [s]);
    }
    return harita;
  }
  const firmwareHaritasi = new Map(firmwareSatirlari.map((f) => [f.varlikId, f]));
  const yamaHaritasi = grupla(yamaSatirlari);
  const kapsamHaritasi = grupla(kapsamSatirlari);
  const korelasyonHaritasi = grupla(korelasyonSatirlari);
  const uygulanamazHaritasi = grupla(uygulanamazSatirlari);
  const yazilimHaritasi = grupla(yazilimSatirlari);
  const adimHaritasi = grupla(adimSatirlari);
  const segmentHaritasi = new Map(segmentler.map((s) => [s.id, s]));
  const etkiHaritasi = new Map(etkiSatirlari.map((e) => [e.varlikId, e]));
  const ekipHaritasi = new Map(ekipler.map((e) => [e.id, e]));
  const konfigHaritasi = new Map(konfigTemelleri.map((t) => [t.varlikId, t]));
  const sapmaHaritasi = new Map(sapmaSayaci.map((g) => [g.varlikId, g._count._all]));
  /* SBOM birden çok olabilir; ekranda EN YENİSİ gösterilir. Eskisini de
     göstermek "hangisi geçerli" sorusunu belirsizleştirirdi. */
  const sbomHaritasi = new Map<string, (typeof sbomSatirlari)[number]>();
  for (const s of sbomSatirlari) {
    if (s.varlikId === null) continue;              // sorgu süzer; tip de dayatır
    const onceki = sbomHaritasi.get(s.varlikId);
    if (!onceki || s.yuklendi > onceki.yuklendi) sbomHaritasi.set(s.varlikId, s);
  }

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
  const [yedekSatirlari, kesifSatirlari, zimmetSatirlari, durusSatirlari] = await Promise.all([
    /* `id` ve `icerikHash` OT-28 için okunur: konfigürasyon tabanı bir
       YEDEĞE dayanır ve sapma özet karşılaştırmasıyla bulunur. Ayrı bir
       sorgu açmak, aynı tabloyu iki kez taramak olurdu. */
    db.konfigurasyonYedegi.findMany({
      where: { varlik: varlikKapsami },
      select: {
        id: true, varlikId: true, yedekZamani: true,
        basarili: true, icerikHash: true,
      },
      orderBy: { yedekZamani: 'desc' },
    }),
    db.kesifKaydi.findMany({
      where: { eslesenVarlik: varlikKapsami },
      select: { id: true, kaynak: true, sonGorulme: true, eslesenVarlikId: true },
      orderBy: { sonGorulme: 'desc' },
    }),
    /* OT-09b · Cevap bekleyen zimmet talepleri. Yalnız `bekliyor` olanlar
       okunur: kapanmış talepler varlık künyesinin değil, denetim izinin
       konusudur. */
    db.varlikAtamaTalebi.findMany({
      where: { durum: 'bekliyor', varlik: varlikKapsami },
      select: {
        id: true, varlikId: true, olusturuldu: true, sonTarih: true, not: true,
        atanan: { select: { adSoyad: true } },
        atayan: { select: { adSoyad: true } },
      },
    }),
    /* OT-21b · Kaynak sistemlerin bildirdiği canlı duruş. Connector'ın
       KENDİ durumu da okunur: "canlı" sözcüğü yalnız bağlı, etkin ve
       hatasız bir kaynağın verisi için yazılabilir — bağlantı bilgisi
       olmadan tazelik ölçülemez, ölçülemeyen tazelik "güncel" sayılamaz. */
    db.varlikDurusGozlemi.findMany({
      where: { varlik: varlikKapsami },
      select: {
        varlikId: true, kaynakSistem: true, kaynakZamani: true, alinma: true,
        guven: true, isletimSistemi: true, osSurumu: true, osYapisi: true,
        yamaSeviyesi: true, sonYamaTarihi: true, firmware: true,
        connector: {
          select: {
            ad: true, etkin: true, durum: true, pollAralikDk: true,
            sonBasariliKosu: true, sonHata: true, silindi: true,
          },
        },
      },
      orderBy: { kaynakSistem: 'asc' },
    }),
  ]);
  /* OT-21b · Tazelik eşikleri ve çakışmada berabere bozan kaynak sırası
     konsoldan gelir; kod varsayılanı yalnız kayıt yoksa geçerlidir. */
  const [canliKat, guncelKat, kaynakOnceligi] = await Promise.all([
    ayar<number>('durus.canli_kat'),
    ayar<number>('durus.guncel_kat'),
    ayar<string[]>('durus.kaynak_onceligi'),
  ]);

  const sonYedekler = ilkiniEsle(yedekSatirlari, (y) => y.varlikId);
  const sonKesifler = ilkiniEsle(kesifSatirlari, (k) => k.eslesenVarlikId);
  const acikZimmetler = ilkiniEsle(zimmetSatirlari, (z) => z.varlikId);
  const durusHaritasi = new Map<string, typeof durusSatirlari>();
  for (const d of durusSatirlari) {
    durusHaritasi.set(d.varlikId, [...(durusHaritasi.get(d.varlikId) ?? []), d]);
  }
  /* OT-28 · Son BAŞARILI yedek ayrı tutulur: başarısız bir yedeğin özeti
     eksik olabilir ve eksik özet "konfigürasyon değişmiş" gibi
     görünürdü. Liste `yedekZamani desc` sıralı, `ilkiniEsle` en yeniyi
     tutar. */
  const sonBasariliYedek = ilkiniEsle(
    yedekSatirlari.filter((y) => y.basarili), (y) => y.varlikId,
  );

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

  /* Duruş kaydı SATIR BAŞINA kurulur; hiç kaydı olmayan varlık `null` ve
     boş dizilerle gelir — "kayıt yok" ile "sorun yok" ekranda ayrı okunur
     ve bu ayrımı yapan tek yer istemcideki Duruş sekmesidir. */
  function durusKur(varlikId: string, segmentId: string | null): Durus {
    const f = firmwareHaritasi.get(varlikId) ?? null;
    const sbom = sbomHaritasi.get(varlikId) ?? null;
    const segment = segmentId === null ? null : segmentHaritasi.get(segmentId) ?? null;
    return {
      firmware: f
        ? {
          durum: f.durum, kuruluSurum: f.kuruluSurum, gerekce: f.gerekce,
          istisnaGerekcesi: f.istisnaGerekcesi,
          sonDogrulama: f.sonDogrulama?.toISOString() ?? null,
        }
        : null,
      yamalar: (yamaHaritasi.get(varlikId) ?? []).map((y) => ({
        durum: y.durum, mevcutSeviye: y.mevcutSeviye, temelSeviye: y.temelSeviye,
        eksikYama: y.eksikYama, siddet: y.siddet,
        yenidenBaslatmaGerekli: y.yenidenBaslatmaGerekli,
        yamalanamaz: y.yamalanamaz, istisnaGerekcesi: y.istisnaGerekcesi,
        kaynakSistem: y.kaynakSistem,
        sonDogrulama: y.sonDogrulama?.toISOString() ?? null,
      })),
      kapsamlar: (kapsamHaritasi.get(varlikId) ?? []).map((c) => ({
        tip: c.tip, durum: c.durum, gerekce: c.gerekce,
        sonDogrulama: c.sonDogrulama?.toISOString() ?? null,
      })),
      korelasyonlar: (korelasyonHaritasi.get(varlikId) ?? [])
        .map((c) => ({
          id: c.id, ref: c.zafiyet.kaynakRef, baslik: c.zafiyet.baslik,
          cvss: c.zafiyet.cvss, sonuc: c.sonuc, guven: c.guven, gerekce: c.gerekce,
          elleSonuc: c.elleSonuc, elleGerekce: c.elleGerekce,
        }))
        .sort((a, b) => (b.cvss ?? -1) - (a.cvss ?? -1)),
      uygulanamaz: Object.fromEntries(
        (uygulanamazHaritasi.get(varlikId) ?? []).map((u) => [u.alan, u.gerekce]),
      ),
      sbom: sbom
        ? {
          bicim: sbom.bicim, bilesenSayisi: sbom.bilesenSayisi,
          yuklendi: sbom.yuklendi.toISOString(),
        }
        : null,
      segment: segment
        ? {
          id: segment.id, kod: segment.kod, ad: segment.ad,
          cidr: segment.cidr, vlanId: segment.vlanId,
        }
        : null,
      /* Silinmiş ya da pasif bir connector BAĞLI DEĞİLDİR: satırı
         silmiyoruz (gözlem bir kere gerçekten geldi) ama tazelik
         iddiasını da sürdürmüyoruz — ekran "kaynak bağlı değil" der. */
      canli: (durusHaritasi.get(varlikId) ?? []).map((d) => ({
        kaynakSistem: d.kaynakSistem,
        connectorAd: d.connector?.ad ?? null,
        bagli: d.connector != null && d.connector.silindi === null
          && d.connector.etkin && d.connector.durum === 'etkin',
        hatali: d.connector?.durum === 'hatali',
        pollAralikDk: d.connector?.pollAralikDk ?? null,
        kaynakZamani: d.kaynakZamani?.toISOString() ?? null,
        alinma: d.alinma.toISOString(),
        guven: d.guven,
        sonBasariliKosu: d.connector?.sonBasariliKosu?.toISOString() ?? null,
        sonHata: d.connector?.sonHata ?? null,
        isletimSistemi: d.isletimSistemi,
        osSurumu: d.osSurumu,
        osYapisi: d.osYapisi,
        yamaSeviyesi: d.yamaSeviyesi,
        sonYamaTarihi: d.sonYamaTarihi?.toISOString() ?? null,
        firmware: d.firmware,
      })),
    };
  }

  /* OT-05/08/09/28 · Yönetişim kaydı satır başına kurulur. Boş gelen her
     alan "yok" değil "ölçülmedi"dir ve ekran bunu ayrı yazar. */
  function yonetisimKur(varlikId: string, ekipId: string | null): Yonetisim {
    const e = etkiHaritasi.get(varlikId);
    const ekip = ekipId === null ? null : ekipHaritasi.get(ekipId) ?? null;
    const temel = konfigHaritasi.get(varlikId);
    const yedek = sonBasariliYedek.get(varlikId);
    return {
      adimlar: (adimHaritasi.get(varlikId) ?? [])
        .map((b) => ({
          bagId: b.id, adimId: b.adim.id, adimAd: b.adim.ad, sira: b.adim.sira,
          surecKod: b.adim.surec.kod, surecAd: b.adim.surec.ad,
          rol: b.rol, tekNokta: b.tekNokta, yedekli: b.yedekli,
          adimEtkisi: b.adim.uretimEtkisi,
          rtoSaat: b.adim.rtoSaat, rpoSaat: b.adim.rpoSaat,
        }))
        .sort((a, b) => a.sira - b.sira),
      etki: e
        ? {
          uretimKaybiMw: e.uretimKaybiMw, kayipTipi: e.kayipTipi,
          rtoSaat: e.rtoSaat, rpoSaat: e.rpoSaat,
          emniyetEtkisi: e.emniyetEtkisi, cevreEtkisi: e.cevreEtkisi,
          gerekce: e.gerekce,
          degerlendiren: e.degerlendiren?.adSoyad ?? null,
          zaman: e.zaman.toISOString(),
        }
        : null,
      ekip: ekip
        ? {
          id: ekip.id, kod: ekip.kod, ad: ekip.ad,
          aktif: ekip.aktif, aktifUye: ekip._count.uyeler,
        }
        : null,
      konfig: {
        temelHash: temel?.ozetHash ?? null,
        temelOnayZamani: temel?.onayZamani.toISOString() ?? null,
        temelOnaylayan: temel?.onaylayan?.adSoyad ?? null,
        sonYedekId: yedek?.id ?? null,
        sonYedekHash: yedek?.icerikHash ?? null,
        sonYedekZamani: yedek?.yedekZamani.toISOString() ?? null,
        acikSapma: sapmaHaritasi.get(varlikId) ?? 0,
      },
    };
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
    const zimmet = acikZimmetler.get(v.id) ?? null;
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
      ipv6Adresi: v.ipv6Adresi, isletimSistemiSurumu: v.isletimSistemiSurumu,
      firmwareYapisi: v.firmwareYapisi, donanimRevizyonu: v.donanimRevizyonu,
      yazilimlar: (yazilimHaritasi.get(v.id) ?? [])
        .map((y) => ({ id: y.yazilim.id, ad: y.yazilim.ad, surum: y.yazilim.surum }))
        .sort((a, b) => a.ad.localeCompare(b.ad, 'tr')),
      durus: durusKur(v.id, v.segmentId),
      yonetisim: yonetisimKur(v.id, v.ekipId),
      garantiSaglayici: v.garantiSaglayici,
      bakimBitis: v.bakimBitis?.toISOString() ?? null,
      sonBakim: v.sonBakim?.toISOString() ?? null,
      sonrakiBakim: v.sonrakiBakim?.toISOString() ?? null,
      kritiklik: v.kritiklik,
      /* Şemada nullable; ekranda üç değerli mantık `bilinmiyor` etiketiyle
         yürür ve `null` ile `'bilinmiyor'` aynı anlama gelir. */
      uretimEtkisi: v.uretimEtkisi ?? 'bilinmiyor',
      yamaDurumu: v.yamaDurumu, edrDurumu: v.edrDurumu,
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
      /* OT-09b · Cevap bekleyen zimmet. Sahiplik alanı DEĞİŞMEZ; bu satır
         "atandı ama henüz imzalanmadı" hâlini görünür kılar. */
      zimmet: zimmet
        ? {
          id: zimmet.id,
          atananAd: zimmet.atanan.adSoyad,
          atayanAd: zimmet.atayan.adSoyad,
          olusturuldu: zimmet.olusturuldu.toISOString(),
          sonTarih: zimmet.sonTarih.toISOString(),
          not: zimmet.not,
        }
        : null,
      yazilabilir: yazmaYetkisi && kapsamdaYetkili(k, 'envanter', 'yazma', kapsam.tesisId),
      onaylanabilir: onayYetkisi && kapsamdaYetkili(k, 'envanter', 'onay', kapsam.tesisId),
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
      segmentler={segmentler.map((s) => ({
        id: s.id, kod: s.kod, ad: s.ad, cidr: s.cidr, vlanId: s.vlanId,
      }))}
      ekipler={ekipler.filter((e) => e.aktif).map((e) => ({
        id: e.id, kod: e.kod, ad: e.ad, tip: e.tip, aktifUye: e._count.uyeler,
      }))}
      onaylayabilir={onayYetkisi}
      yazabilir={yazmaYetkisi}
      simdi={simdi}
      canliAyar={{ canliKat, guncelKat, kaynakOnceligi }}
      baslangicArama={baslangicArama}
    />
  );
}
