import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { db } from '@/lib/db';
import { normalCoz } from '@/lib/entegrasyon/kesif';
import KesifIstemci from './KesifIstemci';
import { GORUNMEZ_ESIK_GUN, type Aday, type KesifSatiri } from './mantik';

export const metadata: Metadata = { title: 'Varlık keşfi — Atlas' };

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
  const onayYetkisi = izinVar(k, 'envanter', 'onay');
  const yazmaYetkisi = izinVar(k, 'envanter', 'yazma');

  const [kayitlar, turler, tesisler] = await Promise.all([
    db.kesifKaydi.findMany({
      orderBy: [{ sonGorulme: 'desc' }],
      take: KUYRUK_TAVANI,
      include: {
        connector: { select: { ad: true } },
        eslesenVarlik: { select: { id: true, etiket: true, ad: true, tesisId: true } },
        inceleyen: { select: { adSoyad: true } },
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

  /* `new Date()` sunucuda istek başına bir kez okunur; "kaç gündür
     görülmüyor" eşiği tüm satırlar için bu ana göre hesaplanır. */
  const simdi = new Date().getTime();

  const satirlar: KesifSatiri[] = [];
  for (const kayit of kayitlar) {
    const normal = normalCoz(kayit.normalJson);
    const g = normal?.gozlem ?? null;
    const eslesme = normal?.eslesme ?? null;

    /* Kapsam: eşleşen varlığı olan kayıt o varlığın tesisine tabidir.
       Eşleşmemiş kayıt hiçbir tesise ait değildir — kapsamı daraltılmış
       kullanıcıdan gizlenmez, çünkü henüz bir tesise bağlı değildir. */
    const tesisId = kayit.eslesenVarlik?.tesisId ?? null;
    if (gorulebilirTesisler !== null && tesisId && !gorulebilirTesisler.includes(tesisId)) {
      continue;
    }

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
      kararVerilebilir: onayYetkisi
        && (!tesisId || izinVar(k, 'envanter', 'onay', { tesisId })),
    });
  }

  return (
    <KesifIstemci
      satirlar={satirlar}
      turler={turler}
      tesisler={tesisler}
      yazabilir={yazmaYetkisi}
      onaylayabilir={onayYetkisi}
      gorunmezEsikGun={GORUNMEZ_ESIK_GUN}
      kuyrukTavani={KUYRUK_TAVANI}
    />
  );
}
