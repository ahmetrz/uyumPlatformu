import 'server-only';
import { db } from '../../db';
import { imlecKosulu, sayfaSorgusu, sayfaYaniti } from '../sayfalama';
import { metinParam, nerede, secenekParam, tarihParam } from '../sorgu';
import { apiUcu } from '../ucnokta';
import { tesisKapsamZorunlu } from '../yetki';

/* GET /api/v1/evidence — kanıt metadatası (dış denetçi/GRC entegrasyonu için).

   İki sınır:
   - `dosyaYolu` DÖNMEZ. Depolama düzeni iç ayrıntıdır; kanıt dosyası bu
     API'den servis edilmez, yalnızca metadata + hash görünür.
   - Santrale kısıtlı anahtar YALNIZ o santrale bağlı kanıtı görür. Hiçbir
     santrale bağlı olmayan (kurum geneli) kanıt, kapsamı sınırlı anahtara
     gösterilmez — güvenli varsayılan. AMA bu artık SESSİZ değil: yanıtın
     `scope` bloğu bunu söyler (aşağı bakınız).

   ═══ BULGU #13 · KAPSAM NEDEN DEĞİŞTİ ══════════════════════════════════

   Kapsam eskiden `KanitTesis` (`tesisBaglantilari`) üzerinden uygulanıyordu.
   O tabloya ÜRETİMDE HİÇBİR YER YAZMIYOR — kanıtı açan üç yolun üçü de
   (`lib/eylemler.ts → kanitEkle`, `lib/eylemler2/denetim.ts →
   kanitTalebiDurum`, `prisma/seed-kanit.ts`) bağ kurmuyor; tabloya yalnızca
   `tests/api.test.ts` yazıyordu. Sonuç: santrale kısıtlı her anahtar HER
   ZAMAN boş liste ve her kayıtta `plantIds: []` alıyordu. Kayıt "bağlı
   değil" iken "yok" gibi görünüyordu; ucun kendi yorumu uygulanan bir
   kontrolü anlatıyordu, uygulanan şey ise "hiçbir şey görmezsin"di.

   KARAR (iki seçenekten İKİNCİSİ): kapsam artık kanıtın GERÇEKTEN VAR OLAN
   bağından türüyor —

       Kanit → KanitBaglantisi → MaddeDurumu.tesisId

   Bu bağ, ürünün ana kanıt ekleme yolunun (`kanitEkle`) yazdığı bağdır;
   geliştirme veritabanında 58 kanıta karşılık 60 `KanitBaglantisi` satırı,
   0 `KanitTesis` satırı var. Yani bu, kanıtın hangi santralin maddesini
   karşıladığının ÖLÇÜLMÜŞ kaydıdır, varsayım değil.

   Birinci seçenek (kanıt eklerken `KanitTesis` yazan bir yol açmak)
   seçilmedi: kanıtı açan üç yol da başka ajanların dosyalarında ve bağı
   yazacak yer orası. Kapsamı burada var olmayan bir yazıcıya bağlı
   bırakmak, düzeltmeyi başka bir dosyanın gelecekteki değişikliğine
   emanet etmek olurdu.

   `KanitTesis` OKUMA YOLUNDAN ÇIKARILDI (şemadan silinmedi: şema ve
   migration başka bir ajanın alanı). Yazıcısı olmayan bir tabloyu kapsam
   koşuluna ortak etmek, kapsam kararını yarısı hiç dolmayan iki kaynağa
   bölerdi — düzeltmeye çalıştığımız sessiz fallback'in ta kendisi. Bir gün
   kanıt ile santral arasında MADDEDEN BAĞIMSIZ bir bağ gerekirse, önce o
   bağı YAZAN yol açılmalı, sonra burası okumalı; tersi değil.

   ═══ BOŞ LİSTE ARTIK KENDİNİ AÇIKLAR ═══════════════════════════════════

   `scope` bloğu her yanıtta döner ve "kanıt yok" ile "kapsamınızda bağlı
   kanıt yok"u AYIRIR. Kapsamı sınırlı bir anahtar için ayrıca hiçbir
   santrale bağlanmamış kanıt sayısı (`unlinkedEvidenceExcluded`) verilir:
   bu sayı başka bir santralin verisi DEĞİLDİR (tanımı gereği hiçbir
   santrale bağlı değildir), bu yüzden santral izolasyonunu bozmaz — ama
   çağırana "görmediğin bir küme var ve sebebi bağ eksikliği" der. */

const TIPLER = [
  'politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor', 'log',
  'bilet', 'onay', 'test_sonucu', 'egitim_kaydi', 'sozlesme', 'ag_semasi',
] as const;

/** Kapsam koşulu: kanıtın bağlı olduğu madde durumlarından biri bu santral
    kümesinde mi? `KanitBaglantisi` hiç yoksa kanıt HİÇBİR santrale bağlı
    değildir ve kapsamlı anahtara görünmez. */
const tesisKosulu = (tesisIdleri: string[] | string) => ({
  baglantilar: {
    some: {
      maddeDurumu: {
        tesisId: Array.isArray(tesisIdleri) ? { in: tesisIdleri } : tesisIdleri,
      },
    },
  },
});

export const GET = apiUcu(
  { uc: 'evidence', modul: 'uyum', islem: 'okuma' },
  async ({ url, kapsam }) => {
  const { limit, imlec } = sayfaSorgusu(url);
  const tip = secenekParam(url, 'type', TIPLER);
  const tesisId = metinParam(url, 'plantId', 64);
  const toplananSonra = tarihParam(url, 'collectedSince');
  const yalnizGecerli = url.searchParams.get('validOnly') === 'true';

  // İstenen santral kapsam dışıysa 403; gövdede kayıt yok, varlık/yokluk sızmaz.
  if (tesisId) tesisKapsamZorunlu(kapsam, tesisId);

  const [satirlar, baglanmamis] = await Promise.all([
    db.kanit.findMany({
      where: nerede(
        { silindi: null },
        kapsam ? tesisKosulu(kapsam) : {},
        tesisId ? tesisKosulu(tesisId) : {},
        tip ? { tip } : {},
        toplananSonra ? { toplanmaTarihi: { gte: toplananSonra } } : {},
        yalnizGecerli ? { OR: [{ gecerliBitis: null }, { gecerliBitis: { gt: new Date() } }] } : {},
        imlecKosulu(imlec),
      ),
      orderBy: { id: 'asc' },
      take: limit + 1,
      // Santral bağı kanıtın madde durumlarından türer; ayrıca bir
      // `KanitTesis` sorgusu YOK (yukarıdaki gerekçe).
      include: {
        baglantilar: { select: { maddeDurumu: { select: { tesisId: true } } } },
      },
    }),
    /* Yalnızca kapsamı sınırlı anahtar için: hiçbir santrale bağlanmamış
       kanıt sayısı. Boş listenin sebebini söyleyebilmek için gerekli. */
    kapsam
      ? db.kanit.count({ where: { silindi: null, baglantilar: { none: {} } } })
      : Promise.resolve(0),
  ]);

  const sayfa = sayfaYaniti(satirlar, limit, (k) => {
    const tesisler = [...new Set(k.baglantilar.map((b) => b.maddeDurumu.tesisId))].sort();
    return {
      id: k.id,
      name: k.ad,
      type: k.tip,
      source: k.kaynakSistem,
      sourceUrl: k.kaynakUrl,
      contentHash: k.dosyaHash,
      version: k.surum,
      automatic: k.otomatik,
      confidentiality: k.gizlilik,
      collectedAt: k.toplanmaTarihi?.toISOString() ?? null,
      validFrom: k.gecerlilikBaslangic.toISOString(),
      // null = sonsuz geçerli DEĞİL, BİLİNMİYOR: tazelik motoru bunu ayırır
      validUntil: k.gecerliBitis?.toISOString() ?? null,
      plantIds: tesisler,
      /* Boş `plantIds` iki ayrı şey olabilirdi; artık olamaz:
         'requirement' = kanıt madde durumu üzerinden santral(ler)e bağlı,
         'none'        = kanıt hiçbir maddeye bağlı değil, santrali
                         BİLİNMİYOR (sıfır santral DEĞİL). */
      plantLink: tesisler.length > 0 ? 'requirement' : 'none',
    };
  });

  return {
    govde: {
      ...sayfa,
      /* Kapsam yüzünden boş kalan liste bunu SÖYLER. Blok her yanıtta döner
         ki çağıran "boş" gördüğünde nedenini tahmin etmek zorunda kalmasın. */
      scope: {
        applied: kapsam !== null,
        plantIds: kapsam,
        /** Santral bağı hangi ilişkiden türüyor — sözleşmenin görünür hâli. */
        basis: 'requirementStatus' as const,
        /** Hiçbir maddeye (dolayısıyla hiçbir santrale) bağlı olmayan kanıt
            sayısı; kapsamsız anahtarda 0 döner çünkü o küme zaten listede. */
        unlinkedEvidenceExcluded: baglanmamis,
        note: kapsam === null
          ? null
          : 'Liste yalnız kapsamınızdaki santrallerin maddelerine bağlı kanıtları '
            + 'içerir. Boş liste "kanıt yok" DEĞİL, "kapsamınızda bağlı kanıt yok" '
            + 'demektir; hiçbir maddeye bağlanmamış kanıtlar da bu anahtara '
            + 'gösterilmez (unlinkedEvidenceExcluded).',
      },
    },
  };
});
