import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamKosulu, kapsamda, modulKapisi } from '@/app/kapsam';
import { ilkiniEsle } from '@/lib/sorguParcala';
import type { Bag, Hesap } from './mantik';

/* O15 · Identity & Access Review — SUNUCU VERİSİ.

   ═══ İKİ AYRI KUSUR ════════════════════════════════════════════════════
   (1) MODÜL İZNİ HİÇ SORULMUYORDU. Ekran yalnız `girisZorunlu()` çağırıyor,
       sonra bütün `KimlikHesabi` satırlarını okuyordu. Yani `risk_sahibi`
       gibi envanterde HİÇ okuma izni olmayan bir rol, kurumdaki her
       ayrıcalıklı hesabı, servis hesabını, son kullanım zamanını ve
       yetki atamalarını görebiliyordu. Kapı artık kardeş ekranlarla aynı:
       `izinVar(k, 'envanter', 'okuma')` → `<Yetkisiz />` (bkz.
       /projeler, /denetimler, /varlik-aktarim).
   (2) SANTRAL KAPSAMI HİÇ UYGULANMIYORDU. `KimlikHesabi.tesisId` şemada
       var; A santraline kısıtlı kullanıcı B'nin hesap adlarını, santral
       kodunu/adını ve B'deki varlıklara verilmiş yetkileri görüyordu.

   MODÜL SEÇİMİ: `envanter`. Gerekçe kaydın konusudur: hesap yetkileri
   VARLIKLARA verilir (`ErisimAtamasi.varlikId`) ve `lib/eylemler2/kimlik.ts`
   içindeki üç eylem de (`erisimIncele`, `hesapDurumDegistir`,
   `atamaKaldir`) `yetkiZorunlu('envanter', …)` çağırır. `yonetim` seçmek
   yanlış olurdu: `yonetim` platformun KENDİ kullanıcı/rol yönetimidir
   (/yetkiler), buradaki hesaplar ise dış sistemlerin hesaplarıdır.

   BAĞLI KAYIT kutuları (risk · bulgu) da AYNI `envanter` kapsamıyla
   daraltılır, kendi modülleriyle değil. Nedeni "bilinmeyen ≠ sıfır"dır:
   riski hiç okuyamayan bir kullanıcı için `izinliTesisIdleri(k,'risk')`
   boş küme döner ve çekmece "bağlı kayıt yok" diye YALAN söylerdi. Kapsam
   bir SANTRAL sınırıdır; modül izni ayrı bir eksendir ve boş liste
   göstererek anlatılamaz.

   ── SANTRALİ BİLİNMEYEN KAYIT ──────────────────────────────────────────
   `app/kapsam.ts → kapsamda` (= `lib/api/yetki.ts → tesisKapsamda`):
   `tesisId` null olan hesap (hangi sahaya ait olduğu bilinmeyen dizin
   hesabı) YALNIZ kapsamsız kullanıcıya görünür. */

const BAG_BUTCESI = 4;

export type EkranVerisi = {
  hesaplar: Hesap[];
  tesisler: { id: string; ad: string }[];
  kaynaklar: string[];
  /** true = liste bir santral kapsamıyla daraltıldı */
  kapsamli: boolean;
};

export async function kimlikEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'envanter');
  const izinli = izinliTesisIdleri(k, 'envanter');

  const [hesaplar, riskler, bulgular, incelemeSatirlari] = await Promise.all([
    db.kimlikHesabi.findMany({
      where: kapsamKosulu(izinli),
      include: {
        kullanici: true,
        tesis: true,
        atamalar: {
          /* Atama santrale VARLIK üzerinden bağlıdır. Kapsam içi bir hesaba
             kapsam dışı bir varlık için yetki verilmişse o varlığın etiketi
             ve adı ekrana çıkmaz — ama atamanın KENDİSİ görünür kalır,
             çünkü "bu hesabın göremediğim bir yerde yetkisi var" bilgisi
             incelemenin konusudur ve gizlenmesi incelemeyi yanıltırdı.
             Varlıksız (kapsam metniyle verilmiş) atama da görünür. */
          include: { varlik: { select: { id: true, etiket: true, ad: true, tesisId: true } } },
          orderBy: { verilis: 'asc' },
        },
      },
      orderBy: { hesapAdi: 'asc' },
    }),
    db.risk.findMany({
      where: {
        silindi: null, durum: { in: ['acik', 'islemde'] }, ...kapsamKosulu(izinli),
      },
      include: { varliklar: { select: { varlikId: true } }, tesis: true },
      orderBy: { artikRisk: 'desc' },
    }),
    db.bulgu.findMany({
      where: {
        silindi: null,
        durum: { in: ['acik', 'aksiyonda'] },
        maddeDurumu: kapsamKosulu(izinli),
      },
      include: { maddeDurumu: { include: { madde: true, tesis: true } } },
      orderBy: { onemDerecesi: 'asc' },
    }),
    /* Atama başına SON inceleme ayrı sorguyla okunur.
       NEDEN: ilişki seviyesinde `take: 1` Prisma'da ebeveyn başına bir
       parametre taşıyan TEK, parçalanamayan sorguya çevrilir; atama sayısı
       997'yi geçtiğinde ekran yavaşlamaz, "query parameter limit exceeded"
       ile 500 döner. Burada satırlar zamana göre azalan okunur ve her
       atama için ilki tutulur — sonuç birebir aynıdır. */
    db.erisimIncelemesi.findMany({
      include: { inceleyen: true },
      orderBy: { zaman: 'desc' },
    }),
  ]);

  const sonIncelemeler = ilkiniEsle(incelemeSatirlari, (i) => i.atamaId);

  /* Bağlı kayıt iki yoldan kurulur ve hangisi olduğu satırda YAZILIR:
     (a) atamanın varlığı üzerinden — kesin bağ,
     (b) hesabın santralindeki açık risk/bulgu — bağlam bağı.
     Uydurma ilişki kurulmaz; ikisi de yoksa çekmece bunu söyler. */
  const varlikRiski = new Map<string, typeof riskler>();
  for (const r of riskler) {
    for (const v of r.varliklar) {
      varlikRiski.set(v.varlikId, [...(varlikRiski.get(v.varlikId) ?? []), r]);
    }
  }

  const veri: Hesap[] = hesaplar.map((h) => {
    const varlikIdleri = h.atamalar
      .map((a) => a.varlik)
      .filter((v) => v !== null && kapsamda(izinli, v.tesisId))
      .map((v) => v!.id);

    const kesin: Bag[] = [...new Set(varlikIdleri.flatMap((v) => varlikRiski.get(v) ?? []))]
      .map((r) => ({
        id: `r-${r.id}`, kod: r.kod, alt: 'risk · varlık üzerinden',
        yol: `/riskler/${r.id}`, suren: r.durum === 'islemde',
      }));

    const santralRiski: Bag[] = h.tesisId
      ? riskler
        .filter((r) => r.tesisId === h.tesisId && !kesin.some((x) => x.id === `r-${r.id}`))
        .slice(0, 2)
        .map((r) => ({
          id: `r-${r.id}`, kod: r.kod, alt: `risk · ${r.tesis?.kod ?? 'portföy'}`,
          yol: `/riskler/${r.id}`, suren: r.durum === 'islemde',
        }))
      : [];

    const santralBulgusu: Bag[] = h.tesisId
      ? bulgular
        .filter((b) => b.maddeDurumu.tesisId === h.tesisId)
        .slice(0, 2)
        .map((b) => ({
          id: `b-${b.id}`, kod: b.baslik,
          alt: `bulgu · ${b.maddeDurumu.madde.kod}`,
          yol: `/bulgular/${b.id}`,
        }))
      : [];

    return {
      id: h.id,
      hesapAdi: h.hesapAdi,
      tip: h.tip,
      kaynakSistem: h.kaynakSistem,
      ayricalikli: h.ayricalikli,
      parolaRotasyon: h.parolaRotasyon?.toISOString() ?? null,
      sonKullanim: h.sonKullanim?.toISOString() ?? null,
      durum: h.durum,
      sahip: h.kullanici?.adSoyad ?? null,
      tesisId: h.tesisId,
      tesisKod: h.tesis?.kod ?? null,
      tesisAd: h.tesis?.ad ?? null,
      yetkiler: h.atamalar.map((a) => {
        // Kapsam dışı varlığın ETİKETİ/ADI taşınmaz; atama satırı kalır.
        const gorunurVarlik = a.varlik && kapsamda(izinli, a.varlik.tesisId) ? a.varlik : null;
        return {
          id: a.id,
          kapsam: a.kapsam,
          yetkiSeviyesi: a.yetkiSeviyesi,
          verilis: a.verilis.toISOString(),
          bitis: a.bitis?.toISOString() ?? null,
          varlikEtiketi: gorunurVarlik?.etiket ?? null,
          varlikAd: gorunurVarlik?.ad ?? null,
          sonInceleme: ((son) => (son
            ? {
              sonuc: son.sonuc,
              zaman: son.zaman.toISOString(),
              inceleyen: son.inceleyen?.adSoyad ?? null,
              not: son.not,
            }
            : null))(sonIncelemeler.get(a.id)),
        };
      }),
      bagli: [...kesin, ...santralRiski, ...santralBulgusu].slice(0, BAG_BUTCESI),
    };
  });

  /* Santral süzgeci açılırı GÖRÜNEN hesaplardan türetilir — kapsam dışı bir
     santral süzgeç seçeneği olarak da anılmaz. */
  const tesisler = [...new Map(
    hesaplar
      .filter((h) => h.tesis)
      .map((h) => [h.tesis!.id, { id: h.tesis!.id, ad: h.tesis!.ad }]),
  ).values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

  const kaynaklar = [...new Set(veri.map((h) => h.kaynakSistem).filter((x): x is string => !!x))]
    .sort((a, b) => a.localeCompare(b, 'tr'));

  return { hesaplar: veri, tesisler, kaynaklar, kapsamli: kapsamDaraltildi(izinli) };
}
