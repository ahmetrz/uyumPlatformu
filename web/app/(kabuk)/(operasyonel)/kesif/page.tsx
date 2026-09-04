import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { kapsamdaYetkili, modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import { normalCoz } from '@/lib/entegrasyon/kesif';
import { ayar } from '@/lib/yapilandirma/oku';
import KesifIstemci from './KesifIstemci';
import { kesifKapsamKosulu, type Aday, type KesifSatiri } from './mantik';

export const metadata: Metadata = { title: 'Varlık keşfi' };

/* Varlık keşfi · inceleme kuyruğu.

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Ekran hiçbir şeyi otomatik onaylamaz: keşif kayıtları CMDB'ye ancak bir
   insan karar verdiğinde yazılır (lib/eylemler2/kesif.ts). Kayıtların
   hepsi pasif kaynaklardan gelir — bu ürün OT'de aktif tarama yapmaz. */

const KUYRUK_TAVANI = 250;

/** Gözlemin dolu alanlarını çekmece için hazırlar; boş alan GÖSTERİLMEZ. */
function gozlemAlanlari(g: NonNullable<ReturnType<typeof normalCoz>>['gozlem']) {
  const sozluk: [keyof typeof g, string][] = [
    ['seriNo', 'Seri no'], ['macAdresi', 'MAC'], ['ipAdresi', 'IP'],
    ['hostname', 'Hostname'], ['etiket', 'Etiket'],
    ['uretici', 'Üretici'], ['model', 'Model'],
    ['isletimSistemi', 'İşletim sistemi'], ['firmware', 'Firmware'],
    ['tesisKodu', 'Tesis kodu'], ['bolgeKodu', 'Ağ bölgesi'], ['turKodu', 'Tür'],
  ];
  return sozluk
    .map(([alan, etiket]) => ({ etiket, deger: g[alan] }))
    .filter((a): a is { etiket: string; deger: string } => !!a.deger);
}

export default async function Sayfa() {
  const k = await girisZorunlu();
  const gorulebilirTesisler = izinliTesisIdleri(k, 'envanter');
  const onayYetkisi = modulYazabilir(k, 'envanter', 'onay');
  /* Karar kapısı kayıttan sonra sorulur (`kesifKarariVer` iki aşamalı),
     ama YAZMA bayrağı elle aktarım ve eşleştirme düğmelerini açar;
     `elleAktarimCalistir` ve `kesifEslestir` kurumsal kuyruk işleridir
     ve kapsamsız korunur. İkisi ayrı sorudur, ayrı sorulur. */
  const yazmaYetkisi = izinVar(k, 'envanter', 'yazma');

  const [kayitlar, turler, tesisler] = await Promise.all([
    db.kesifKaydi.findMany({
      /* Kapsam daraltması SORGUDA yapılır: kuyruk tavanı, kullanıcının
         göremeyeceği kayıtlarla dolup görebileceklerini dışarıda
         bırakmasın. Santrali BİLİNMEYEN kayıt (tesisId ve eşleşen varlık
         yoksa) herkese görünür — henüz bir santrale ait değildir ve
         gizlenmesi onu kimsenin incelemeyeceği anlamına gelirdi. */
      where: kesifKapsamKosulu(gorulebilirTesisler),
      orderBy: [{ sonGorulme: 'desc' }],
      take: KUYRUK_TAVANI,
      include: {
        connector: { select: { ad: true } },
        /* OT-16b · Sahiplik boşluğu bu ekranın konusudur: eşleşen varlığın
           SORUMLUSU okunur. "Envanterde var" ile "sahibi var" ayrı iki
           gerçektir ve ikincisi olmadan yama, yedek ve emeklilik
           kararlarını kimse üstlenmez. */
        eslesenVarlik: {
          select: {
            id: true, etiket: true, ad: true, tesisId: true,
            sahip: { select: { adSoyad: true } },
          },
        },
        inceleyen: { select: { adSoyad: true } },
        yetkiKararVeren: { select: { adSoyad: true } },
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
  ]);

  /* OT-16b · "Kaç gündür görülmüyor" eşiği konsoldan gelir: bir OT
     santralinde ayda bir açılan bir cihaz ile sürekli çalışan bir sunucu
     aynı eşikle ölçülemez. */
  const gorunmezEsikGun = await ayar<number>('kesif.gorunmez_gun');

  /* OT-17 · OUI kütüğü — YALNIZ görünen kayıtların ön ekleri okunur.
     Kütüğün tamamını çekmek 50.000 satır demekti; burada gerekli olan
     en çok `KUYRUK_TAVANI` kadar farklı ön ektir. Kütük BOŞ olabilir ve
     bu bir kusur değildir: IEEE kaydı kurumun yüklediği veridir. */
  const onEkler = [...new Set(
    kayitlar.map((x) => x.ouiOnEki).filter((x): x is string => x !== null),
  )];
  const ouiKutugu = new Map(
    onEkler.length === 0 ? [] : (await db.ouiKaydi.findMany({
      where: { onEk: { in: onEkler } },
      select: { onEk: true, uretici: true },
    })).map((o) => [o.onEk, o.uretici] as const),
  );

  /* `new Date()` sunucuda istek başına bir kez okunur; "kaç gündür
     görülmüyor" eşiği tüm satırlar için bu ana göre hesaplanır. */
  const simdi = new Date().getTime();

  const tesisKodlari = new Map(tesisler.map((t) => [t.id, t.kod] as const));

  const satirlar: KesifSatiri[] = [];
  for (const kayit of kayitlar) {
    const normal = normalCoz(kayit.normalJson);
    const g = normal?.gozlem ?? null;
    const eslesme = normal?.eslesme ?? null;

    /* Kapsam: eşleşmiş kayıt eşleştiği varlığın santraline tabidir;
       eşleşmemiş kayıt, kaynağın BEYAN ETTİĞİ santrale (kayit.tesisId).
       İkisi de yoksa santral bilinmiyordur. Filtreleme sorguda yapıldı;
       buradaki değer yalnız satırın karar yetkisini belirler. */
    const tesisId = kayit.eslesenVarlik?.tesisId ?? kayit.tesisId;

    const konu = g?.hostname || g?.etiket || g?.seriNo || g?.macAdresi
      || g?.ipAdresi || kayit.kaynakKayitId;
    const altParcalar = [
      g?.seriNo ? `seri ${g.seriNo}` : null,
      g?.macAdresi ? `mac ${g.macAdresi}` : null,
      g?.ipAdresi ? `ip ${g.ipAdresi}` : null,
    ].filter((x): x is string => !!x).slice(0, 2);

    satirlar.push({
      id: kayit.id,
      kaynak: kayit.kaynak,
      kaynakKayitId: kayit.kaynakKayitId,
      durum: kayit.durum,
      connectorAd: kayit.connector?.ad ?? null,
      konu,
      alt: altParcalar.join(' · ') || kayit.kaynakKayitId,
      guvenSkoru: kayit.guvenSkoru,
      kaynakGuveni: normal?.koken.guven ?? null,
      eslestirilmedi: eslesme === null,
      eslesmeAnahtari: kayit.eslesmeAnahtari,
      eslesen: kayit.eslesenVarlik
        ? {
          id: kayit.eslesenVarlik.id, etiket: kayit.eslesenVarlik.etiket,
          ad: kayit.eslesenVarlik.ad, tesisId: kayit.eslesenVarlik.tesisId,
          sahipVar: kayit.eslesenVarlik.sahip !== null,
          sahipAd: kayit.eslesenVarlik.sahip?.adSoyad ?? null,
        }
        : null,
      adaylar: (eslesme?.adaylar ?? []) as Aday[],
      cakisma: eslesme?.cakisma ?? false,
      gerekce: eslesme?.gerekce
        ?? (normal
          ? 'Henüz eşleştirilmedi — eşleştirme geçişi bu kayda uğramadı.'
          : 'Kayıt normalize edilmemiş; karar verilemez.'),
      gozlemAlanlari: g ? gozlemAlanlari(g) : [],
      ilkGorulme: kayit.ilkGorulme.toISOString(),
      sonGorulme: kayit.sonGorulme.toISOString(),
      gunGorulmedi: Math.floor((simdi - kayit.sonGorulme.getTime()) / 86_400_000),
      inceleyen: kayit.inceleyen?.adSoyad ?? null,
      incelemeZamani: kayit.incelemeZamani?.toISOString() ?? null,
      incelemeNotu: kayit.incelemeNotu,
      kararVerilebilir: onayYetkisi && kapsamdaYetkili(k, 'envanter', 'onay', tesisId),
      yetkiDurumu: kayit.yetkiDurumu,
      yetkiGerekcesi: kayit.yetkiGerekcesi,
      yetkiKararVeren: kayit.yetkiKararVeren?.adSoyad ?? null,
      yetkiKararZamani: kayit.yetkiKararZamani?.toISOString() ?? null,
      ouiOnEki: kayit.ouiOnEki,
      /* Üretici KÜTÜKTEN gelir; kütük boşsa null kalır ve ekran
         "kütükte yok" der — "üreticisi yok" demez. */
      ouiUretici: kayit.ouiOnEki ? ouiKutugu.get(kayit.ouiOnEki) ?? null : null,
      otProtokolu: kayit.otProtokolu,
      tesisId,
      tesisKod: tesisId === null ? null : tesisKodlari.get(tesisId) ?? null,
    });
  }

  return (
    <KesifIstemci
      satirlar={satirlar}
      turler={turler}
      tesisler={tesisler}
      yazabilir={yazmaYetkisi}
      onaylayabilir={onayYetkisi}
      gorunmezEsikGun={gorunmezEsikGun}
      kuyrukTavani={KUYRUK_TAVANI}
      simdi={simdi}
    />
  );
}
