import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { db } from '@/lib/db';
import {
  connectorEslemeProfili, eslemeProfilGecmisi, eslemeSozlugu,
} from '@/lib/eylemler2/esleme';
import EslemeIstemci from './EslemeIstemci';
import { aileKur, type ConnectorSatiri, type ProfilAilesi } from './mantik';

export const metadata: Metadata = { title: 'Eşleme profilleri' };

/* O26 · Eşleme profili tezgâhı.

   VAR OLMA SEBEBİ (denetim bulgusu #10): `lib/eylemler2/esleme.ts`'in altı
   eylemi (`eslemeSozlugu`, `eslemeProfilYayinla`, `eslemeProfilGecmisi`,
   `eslemeProfilKurallari`, `connectorEslemeProfili`, `eslemeOnizle`)
   yazılmış, testlenmiş ama HİÇBİR YERDEN çağrılmıyordu. Bağlı olan tek
   kardeş `eslemeProfiliBagla`ydı: `/saglik` çekmecesinde bir profil
   SEÇİLEBİLİYOR ama ürünün hiçbir yerinde bir profil OLUŞTURULAMIYORDU.
   Seçme listesi kalıcı olarak boştu; şemadaki "sürümlü eşleme" gerekçesi
   ürün yüzeyinde karşılıksızdı. Bu ekran o altı eylemin yüzeyidir.

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   ─ YETKİ VE SANTRAL KAPSAMI ─────────────────────────────────────────────

   Kapı `yonetim/okuma`; yayın `yonetim/yazma`. Eylemlerin kendisi de aynı
   izinleri ister — buradaki kontrol ekranı susturmak içindir, sınır orada.

   SANTRAL KAPSAMI: eşleme profili KURUM GENELİ bir tanımdır; `EslemeProfili`
   şemada `tesisId` TAŞIMAZ ve bir profil tüm santrallerin verisini
   yorumlar. Bu yüzden burada `izinliTesisIdleri` ile daraltılacak bir
   sorgu yoktur — ve kapsam sessizce atlanmış da değildir: `izinVar` kapısı
   `lib/erisim.ts → kapsamUyar` gereği santrale KISITLI bir yetkiyi
   kapsamsız (global) `yonetim` işleminde zaten geçirmez. Yani A santraline
   kısıtlı bir kullanıcı bu ekranı hiç açamaz. Aynı gerekçe
   `/api/v1/integration-runs` ucunda da yazılıdır. */

/** Connector listesi tavanı — eşleme sorgusu connector başına bir çağrıdır. */
const CONNECTOR_TAVANI = 60;

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'yonetim', 'okuma')) return <Yetkisiz rol="yönetim okuma" />;
  const yazabilir = izinVar(k, 'yonetim', 'yazma');

  /* Profil KODLARI tek sorguda; her kodun SÜRÜMLERİ `eslemeProfilGecmisi`
     ile okunur. Sürüm listesini burada ikinci kez sorgulamak, "hangi sürüm
     etkin" kuralının iki ayrı yerde yaşaması demekti (bulgu #22'nin aynısı);
     kodların sayısı elle yazılan bir tanım kümesi olduğu için küçüktür. */
  const kodlar = await db.eslemeProfili.findMany({
    distinct: ['kod'], select: { kod: true }, orderBy: { kod: 'asc' },
  });

  const [sozluk, gecmisler, hamConnectorlar] = await Promise.all([
    eslemeSozlugu(),
    Promise.all(kodlar.map((r) => eslemeProfilGecmisi(r.kod))),
    db.connector.findMany({
      where: { silindi: null },
      select: { id: true, kod: true, ad: true, tip: true, eslemeProfilId: true },
      orderBy: { kod: 'asc' },
      take: CONNECTOR_TAVANI,
    }),
  ]);

  /* Okunamayan geçmiş SESSİZCE DÜŞÜRÜLMEZ: demo yayınında ya da yetki
     daralmasında eylem `ok:false` döner ve o kodu listeden silmek, profili
     hiç yokmuş gibi gösterirdi. Sebep ekrana taşınır. */
  const aileler: ProfilAilesi[] = [];
  const okunamayanKodlar: { kod: string; hata: string }[] = [];
  gecmisler.forEach((g, i) => {
    if (!g.ok) { okunamayanKodlar.push({ kod: kodlar[i].kod, hata: g.hata }); return; }
    const aile = aileKur(g.surumler);
    if (aile) aileler.push(aile);
  });

  /* Her connector'ın KOŞUDA geçerli olacak profili — öncelik kuralı
     (`connectorProfili`: bağlı profil > tipin etkin profili > gömülü)
     burada yeniden yazılmaz, eylem çağrılır. */
  const connectorlar: ConnectorSatiri[] = await Promise.all(
    hamConnectorlar.map(async (c): Promise<ConnectorSatiri> => {
      const sonuc = await connectorEslemeProfili(c.id);
      if (!sonuc.ok) {
        return {
          id: c.id, kod: c.kod, ad: c.ad, tip: c.tip,
          kaynak: 'gomulu', profilKodu: null, profilSurumu: null, profilDurumu: null,
          hata: sonuc.hata,
        };
      }
      const p = sonuc.profil;
      return {
        id: c.id, kod: c.kod, ad: c.ad, tip: c.tip,
        // Bağ AÇIKÇA kurulduysa kaynak 'bagli'dir; profil aynı olsa bile
        // "tipin etkini" ile "bilerek bağlanmış" aynı şey değildir.
        kaynak: p === null ? 'gomulu' : (c.eslemeProfilId ? 'bagli' : 'tip'),
        profilKodu: p?.kod ?? null,
        profilSurumu: p?.surum ?? null,
        profilDurumu: p?.durum ?? null,
        hata: null,
      };
    }),
  );

  /* Connector tipleri: yayın formundaki tip seçicisi kullanıcıya var olan
     tipleri önerir. Serbest metin alanı da kalır — henüz connector'ı
     açılmamış bir tip için önceden profil yazılabilmeli. */
  const tipler = [...new Set([
    ...hamConnectorlar.map((c) => c.tip),
    ...aileler.map((a) => a.connectorTipi),
  ])].sort();

  return (
    <EslemeIstemci
      aileler={aileler}
      connectorlar={connectorlar}
      okunamayanKodlar={okunamayanKodlar}
      sozluk={sozluk}
      tipler={tipler}
      yazabilir={yazabilir}
      connectorTavani={CONNECTOR_TAVANI}
    />
  );
}
