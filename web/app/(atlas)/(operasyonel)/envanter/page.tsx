import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { db } from '@/lib/db';
import EnvanterIstemci from './EnvanterIstemci';
import type { Bolge, Iliski, Kodlu, Tur, Unite, V } from './mantik';

export const metadata: Metadata = { title: 'Varlık zekâsı — Atlas' };

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
  const yazmaYetkisi = izinVar(k, 'envanter', 'yazma');
  const onayYetkisi = izinVar(k, 'envanter', 'onay');

  const [varliklar, turler, tesisler, uniteler, sistemler, bolgeler, kullanicilar] =
    await Promise.all([
      db.varlik.findMany({
        where: { silindi: null, ...kapsamKosulu(gorulebilir) },
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
          tur: { select: { id: true, kod: true, ad: true, sinif: true } },
          tesis: { select: { id: true, kod: true, ad: true } },
          unite: { select: { id: true, kod: true, ad: true } },
          sistem: { select: { id: true, kod: true, ad: true } },
          bolge: {
            select: {
              id: true, kod: true, ad: true, tip: true,
              guvenlikSeviyesi: true, tesisId: true,
            },
          },
          sahip: { select: { id: true, adSoyad: true } },
          emanetci: { select: { id: true, adSoyad: true } },
          tedarikci: { select: { id: true, ad: true } },
          sozlesme: { select: { id: true, kod: true, ad: true } },
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
          zafiyetler: { select: { durum: true } },
          // Son yedek ve son keşif: varlığın kanıt zinciri. Kayıt YOKSA null —
          // "yedek alınmadı" değil, "yedek kaydı görülmedi" demektir.
          konfigYedekleri: {
            select: { yedekZamani: true, basarili: true },
            orderBy: { yedekZamani: 'desc' }, take: 1,
          },
          kesifler: {
            select: { id: true, kaynak: true, sonGorulme: true },
            orderBy: { sonGorulme: 'desc' }, take: 1,
          },
        },
      }),
      db.varlikTuru.findMany({
        where: { aktif: true },
        select: { id: true, kod: true, ad: true, sinif: true },
        orderBy: [{ sinif: 'asc' }, { ad: 'asc' }],
      }),
      db.tesis.findMany({
        where: { durum: 'aktif' },
        select: { id: true, kod: true, ad: true },
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
        where: { aktif: true },
        select: { id: true, adSoyad: true },
        orderBy: { adSoyad: 'asc' },
      }),
    ]);

  const veri: V[] = varliklar.map((v) => {
    const iliskiler: Iliski[] = [
      ...v.kaynakIliskiler.map((i) => ({
        id: i.id, tip: i.tip, giden: true, diger: i.hedef,
      })),
      ...v.hedefIliskiler.map((i) => ({
        id: i.id, tip: i.tip, giden: false, diger: i.kaynak,
      })),
    ];
    const yedek = v.konfigYedekleri[0] ?? null;
    const kesif = v.kesifler[0] ?? null;
    /* Yazma kapsamı satır satır: tesise kısıtlı rol yalnız kendi santralinin
       varlığını yazabilir. Kural lib/eylemler2/envanter.ts ile aynıdır —
       ekran yalnız düğmeyi kapatır, sunucu ayrıca reddeder. */
    const kapsam = { tesisId: v.tesis?.id ?? null };
    return {
      id: v.id, etiket: v.etiket, ad: v.ad,
      tur: v.tur,
      tesis: v.tesis, unite: v.unite, sistem: v.sistem,
      bolge: v.bolge
        ? {
          id: v.bolge.id, kod: v.bolge.kod, ad: v.bolge.ad, tip: v.bolge.tip,
          seviye: v.bolge.guvenlikSeviyesi, tesisId: v.bolge.tesisId,
        }
        : null,
      sahip: v.sahip ? { id: v.sahip.id, ad: v.sahip.adSoyad } : null,
      emanetci: v.emanetci ? { id: v.emanetci.id, ad: v.emanetci.adSoyad } : null,
      tedarikci: v.tedarikci, sozlesme: v.sozlesme,
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
        .map((r) => ({ id: r.risk.id, kod: r.risk.kod, baslik: r.risk.baslik })),
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
