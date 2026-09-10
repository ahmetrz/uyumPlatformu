import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { kapsamdaYetkili, modulYazabilir } from '@/app/kapsam';
import { Yetkisiz } from '@/components/kabuk/temel';
import { db } from '@/lib/db';
import { bildirimKarari } from '@/lib/uyum/bildirimSuresi';
import { geriSayim, gorunenDurum } from '@/lib/uyum/bildirimKaydi';
import { simdiOku } from './veri';
import { oneriOku, ETKI_ALANLARI } from '@/lib/motorlar/olayEtki';
import OlaylarIstemci from './OlaylarIstemci';
import type {
  BagAdayi, BagTipi, EtkiAlani, OlayKaydi, OneriGorunumu,
} from './mantik';

export const metadata: Metadata = { title: 'Olaylar' };

/* O · Olay → etki zinciri — "bu olay üretimi nasıl etkiledi, kim onayladı?"

   Sunucu yalnız veriyi toplar ve serileştirir; karar `mantik.ts`te, sunum
   istemcide. Zincir hesabı burada YAPILMAZ — motorun ürettiği ve
   `Olay.etkiOnerisiJson` alanında duran öneri okunur. Böylece ekran ile
   motor aynı zinciri iki farklı yerde iki farklı şekilde hesaplayamaz.

   Kapsam: olaylar kullanıcının envanter kapsamındaki tesislerle
   daraltılır (veri seviyesinde, ekranda değil). Tesisi OLMAYAN olay
   kapsamı daraltılmış kullanıcıya GÖSTERİLMEZ: "hangi tesiste olduğu
   yazılmamış" bir olayı dar kapsamlı birine açmak, kapsam sınırını
   sessizce delmek olurdu (aynı kural bağ adaylarında da geçerli).

   ── BAĞ ADAYLARI ────────────────────────────────────────────────────
   Zincire bağlanabilecek kayıtlar sunucuda ve KULLANICININ KAPSAMINDA
   toplanır; istemciye yalnız kimlik/etiket iner. Aday listesini istemcide
   üretmek ya da sınırsız çekmek, ekranı bir kapsam kaçağı yüzeyine
   çevirirdi — kullanıcı bağlayamayacağı kaydın var olduğunu öğrenirdi. */

/** Aday listesi tavanı: çekmecedeki seçici bir envanter tarayıcısı değildir. */
const ADAY_TAVANI = 400;

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'envanter', 'okuma')) return <Yetkisiz rol="envanter okuma" />;

  const izinli = izinliTesisIdleri(kullanici, 'envanter');
  const yazabilir = modulYazabilir(kullanici, 'envanter', 'yazma');
  const dogrulayabilir = izinVar(kullanici, 'yonetim', 'onay');

  /** Kapsam koşulu: null = tüm tesisler; aksi hâlde yalnız izinli küme. */
  const kapsam = izinli === null ? {} : { tesisId: { in: izinli } };

  /* UY-63 · Bildirim yükümlülüğü kuralları ve tesislerin regülasyon
     kapsamı. Kural yoksa sayaç HİÇ işlemez ve ekran süre uydurmaz.

     "Şimdi" burada bir kez okunur ve BÜTÜN satırlar için aynıdır; her
     satırda ayrı `Date.now()` çağırmak, uzun bir listede satırların
     birbirine göre milisaniyelerce kaymasına yol açardı. */
  const simdi = simdiOku();
  const [bildirimKurallari, uygulanabilirlikler] = await Promise.all([
    db.bildirimYukumlulugu.findMany({
      where: { aktif: true },
      select: {
        id: true, kod: true, ad: true, regulasyonId: true,
        asgariSiddet: true, sureSaat: true, merci: true, aktif: true,
        /* EKRAN DA AYNI KARARI OKUR. Bu alan olmadan `/olaylar` takvim
           tetikli yükümlülükleri olayın sayacına sokuyordu — sunucu
           motorlarıyla aynı kusur, üçüncü yüzeyde (bağımsız inceleme
           #49 tur 2, tip değişikliği bunu ortaya çıkardı). */
        tetikleyici: true,
      },
    }),
    db.uygulanabilirlikKarari.findMany({
      where: { uygulanabilir: true },
      select: { kapsamOgesi: { select: { tesisId: true } }, regulasyonId: true },
    }),
  ]);

  const [olaylar, tesisler, varliklar, sistemler, riskler, bulgular, projeler, degisiklikler] =
    await Promise.all([
      db.olay.findMany({
        where: kapsam,
        select: {
          id: true, kod: true, baslik: true, tip: true, siddet: true, durum: true,
          baslangic: true, cozum: true, ozet: true, tesisId: true,
          tespitKaynagi: true, etkiOnerisiJson: true,
          uretimEtkisi: true, emniyetEtkisi: true, regulasyonEtkisi: true, siberEtki: true,
          etkiDogrulamaZamani: true,
          kokNeden: true, sinirlama: true, kurtarma: true, ogrenilenler: true,
          bildirimGerekli: true, bildirimTarihi: true,
          /* R10 · Bu olayın mevzuat bildirimi kayıtları. Kayıt olayın
             kendisiyle birlikte gelir: ayrı bir ekran açmak, denetçinin
             ilk sorusunu ("bildirdiniz mi") bir tık uzağa taşırdı. */
          bildirimKayitlari: {
            select: {
              id: true, durum: true, sonTarih: true, referansNo: true,
              gonderimZamani: true, uygulanmazGerekcesi: true,
              yukumluluk: {
                select: { kod: true, ad: true, merci: true, sureSaat: true, kanalNotu: true },
              },
            },
            orderBy: { yukumluluk: { kod: 'asc' } },
          },
          tesis: { select: { kod: true, ad: true } },
          etkiDogrulayan: { select: { adSoyad: true } },
          varliklar: {
            select: { rol: true, varlik: { select: { id: true, etiket: true, ad: true, kritiklik: true } } },
          },
          sistemler: {
            select: { rol: true, sistem: { select: { id: true, kod: true, ad: true } } },
          },
          riskler: { select: { risk: { select: { id: true, kod: true, baslik: true, durum: true } } } },
          bulgular: { select: { bulgu: { select: { id: true, baslik: true, onemDerecesi: true } } } },
          projeler: { select: { proje: { select: { id: true, kod: true, ad: true, durum: true } } } },
          degisiklikler: {
            select: { degisiklik: { select: { id: true, kod: true, baslik: true, durum: true } } },
          },
        },
        orderBy: { baslangic: 'desc' },
      }),
      db.tesis.findMany({
        where: { durum: 'aktif', ...(izinli === null ? {} : { id: { in: izinli } }) },
        select: { id: true, kod: true, ad: true },
        orderBy: { kod: 'asc' },
      }),
      db.varlik.findMany({
        where: { silindi: null, ...kapsam },
        select: { id: true, etiket: true, ad: true, kritiklik: true },
        orderBy: { etiket: 'asc' },
        take: ADAY_TAVANI,
      }),
      db.sistemServis.findMany({
        // Sistemin tesisi null olabilir (grup çapında servis); kapsamı
        // daraltılmış kullanıcıya bu kayıt GÖSTERİLMEZ — bkz. dosya başı notu.
        where: kapsam,
        select: { id: true, kod: true, ad: true, kritiklik: true },
        orderBy: { kod: 'asc' },
        take: ADAY_TAVANI,
      }),
      db.risk.findMany({
        where: { silindi: null, ...kapsam },
        select: { id: true, kod: true, baslik: true, durum: true },
        orderBy: { kod: 'asc' },
        take: ADAY_TAVANI,
      }),
      db.bulgu.findMany({
        where: { silindi: null },
        select: { id: true, baslik: true, onemDerecesi: true, durum: true },
        orderBy: { tespitTarihi: 'desc' },
        take: ADAY_TAVANI,
      }),
      db.proje.findMany({
        where: { silindi: null },
        select: { id: true, kod: true, ad: true, durum: true },
        orderBy: { kod: 'asc' },
        take: ADAY_TAVANI,
      }),
      db.degisiklik.findMany({
        /* Değişiklikte tesissiz kayıt PORTFÖY GENELİdir (bkz.
           /operasyon kapsamKosulu) — gizlemek onu kimsenin görmemesi
           demek olurdu. Olay ve varlıkta ise tesissizlik bir kayıt
           boşluğudur; ikisi aynı kural değildir. */
        where: izinli === null ? {} : { OR: [{ tesisId: { in: izinli } }, { tesisId: null }] },
        select: { id: true, kod: true, baslik: true, durum: true },
        orderBy: { olusturuldu: 'desc' },
        take: ADAY_TAVANI,
      }),
    ]);

  const adaylar: Record<BagTipi, BagAdayi[]> = {
    varlik: varliklar.map((v) => ({ id: v.id, kod: v.etiket, alt: `${v.ad} · ${v.kritiklik}` })),
    sistem: sistemler.map((s) => ({ id: s.id, kod: s.kod, alt: `${s.ad} · ${s.kritiklik}` })),
    risk: riskler.map((r) => ({ id: r.id, kod: r.kod, alt: `${r.baslik} · ${r.durum}` })),
    bulgu: bulgular.map((b) => ({ id: b.id, kod: b.baslik, alt: `${b.onemDerecesi} · ${b.durum}` })),
    proje: projeler.map((p) => ({ id: p.id, kod: p.kod, alt: `${p.ad} · ${p.durum}` })),
    degisiklik: degisiklikler.map((d) => ({ id: d.id, kod: d.kod, alt: `${d.baslik} · ${d.durum}` })),
  };

  const kayitlar: OlayKaydi[] = olaylar.map((o) => {
    const cozulmus = oneriOku(o.etkiOnerisiJson);
    /* `etkiOnerisiJson` dolu ama çözülemiyorsa bunu SÖYLERİZ; sessizce
       "öneri yok" göstermek bilinmeyeni sıfıra çevirmek olurdu. */
    const oneriBozuk = o.etkiOnerisiJson !== null && cozulmus === null;

    const oneri: OneriGorunumu | null = cozulmus === null ? null : {
      uretilme: cozulmus.uretilme,
      degerler: Object.fromEntries(
        ETKI_ALANLARI.map((a) => [a, cozulmus[a]]),
      ) as Record<EtkiAlani, string>,
      dayanaklar: Object.fromEntries(
        ETKI_ALANLARI.map((a) => [
          a, cozulmus.gerekce.find((g) => g.alan === a)?.dayanak ?? 'dayanak kaydı yok',
        ]),
      ) as Record<EtkiAlani, string>,
      zincir: cozulmus.zincir.map((h) => ({
        giris: h.giris,
        varlik: h.varlik
          ? {
            id: h.varlik.id, etiket: h.varlik.etiket, ad: h.varlik.ad,
            kritiklik: h.varlik.kritiklik, rol: h.varlik.rol,
          }
          : null,
        sistem: h.sistem
          ? { id: h.sistem.id, kod: h.sistem.kod, ad: h.sistem.ad, kritiklik: h.sistem.kritiklik }
          : null,
        surecler: h.surecler.map((s) => ({
          id: s.id, kod: s.kod, ad: s.ad, uretimEtkisi: s.hamUretim ?? 'bilinmiyor',
        })),
        tesisler: h.tesisler.map((t) => ({
          id: t.id, kod: t.kod, ad: t.ad,
          kritiklikSinifi: t.kritiklikSinifi, kritikAltyapi: t.kritikAltyapi,
        })),
        kopukluk: h.kopukluk,
      })),
    };

    return {
      id: o.id, kod: o.kod, baslik: o.baslik, tip: o.tip,
      siddet: o.siddet, durum: o.durum,
      baslangic: o.baslangic.toISOString(),
      cozum: o.cozum?.toISOString() ?? null,
      ozet: o.ozet,
      tesisId: o.tesisId, tesisKod: o.tesis?.kod ?? null, tesisAd: o.tesis?.ad ?? null,
      tespitKaynagi: o.tespitKaynagi,
      etki: {
        uretimEtkisi: o.uretimEtkisi,
        emniyetEtkisi: o.emniyetEtkisi,
        regulasyonEtkisi: o.regulasyonEtkisi,
        siberEtki: o.siberEtki,
      },
      dogrulayan: o.etkiDogrulayan?.adSoyad ?? null,
      dogrulamaZamani: o.etkiDogrulamaZamani?.toISOString() ?? null,
      oneri,
      oneriBozuk,
      kokNeden: o.kokNeden, sinirlama: o.sinirlama, kurtarma: o.kurtarma,
      ogrenilenler: o.ogrenilenler,
      bildirimGerekli: o.bildirimGerekli,
      bildirimTarihi: o.bildirimTarihi?.toISOString() ?? null,
      /* UY-63 · Süre sayacı. Karar sunucuda verilir: istemci kendi
         saatine göre "geciktiniz" DEMEZ. */
      bildirim: (() => {
        const karar = bildirimKarari({
          siddet: o.siddet,
          baslangic: o.baslangic.getTime(),
          simdi,
          bildirimGerekli: o.bildirimGerekli,
          bildirimTarihi: o.bildirimTarihi?.getTime() ?? null,
          regulasyonIdleri: uygulanabilirlikler
            .filter((u) => u.kapsamOgesi.tesisId !== null && u.kapsamOgesi.tesisId === o.tesisId)
            .map((u) => u.regulasyonId),
          kurallar: bildirimKurallari,
        });
        return {
          durum: karar.durum,
          sonTarih: karar.sonTarih === null ? null : new Date(karar.sonTarih).toISOString(),
          kalanDakika: karar.kalanDakika,
          kural: karar.yukumluluk
            ? { ad: karar.yukumluluk.ad, merci: karar.yukumluluk.merci,
              sureSaat: karar.yukumluluk.sureSaat }
            : null,
        };
      })(),
      /* R10 · Kayıtlar SUNUCUDAN sayılmış gelir; geri sayım kararı da
         burada verilir. İstemci kendi saatine göre "geciktiniz" DEMEZ. */
      bildirimKayitlari: o.bildirimKayitlari.map((b) => {
        const gs = geriSayim({
          baslangic: o.baslangic.getTime(), simdi, sureSaat: b.yukumluluk.sureSaat,
        });
        /* Ekranın gösterdiği durum, sayacın söylediğiyle uzlaştırılır —
           gerekçe `lib/uyum/bildirimKaydi.ts` → `gorunenDurum`da. Yazma
           yok: veritabanını motor günceller. */
        const gorunen = gorunenDurum({ kayitDurumu: b.durum, geriSayim: gs });
        return {
          id: b.id,
          durum: gorunen,
          yukumlulukKod: b.yukumluluk.kod,
          yukumlulukAd: b.yukumluluk.ad,
          merci: b.yukumluluk.merci,
          /* Kanal NOTU — adres değil. Sır yalnız `sirReferansi` ile taşınır. */
          kanalNotu: b.yukumluluk.kanalNotu,
          sureSaat: b.yukumluluk.sureSaat,
          sonTarih: b.sonTarih?.toISOString() ?? null,
          /* Geri sayım SÖZÜ: süre yoksa "Süre mevzuatta belirlenmedi". */
          geriSayimSozu: gs.soz,
          sureVar: gs.sureVar,
          referansNo: b.referansNo,
          gonderimZamani: b.gonderimZamani?.toISOString() ?? null,
          uygulanmazGerekcesi: b.uygulanmazGerekcesi,
        };
      }),
      varliklar: o.varliklar.map((v) => ({
        id: v.varlik.id, kod: v.varlik.etiket,
        alt: `${v.varlik.ad} · ${v.rol}`, yol: '/envanter',
      })),
      sistemler: o.sistemler.map((s) => ({
        id: s.sistem.id, kod: s.sistem.kod,
        alt: `${s.sistem.ad} · ${s.rol}`, yol: '/topoloji',
      })),
      riskler: o.riskler.map((r) => ({
        id: r.risk.id, kod: r.risk.kod, alt: r.risk.baslik, yol: '/riskler',
      })),
      bulgular: o.bulgular.map((b) => ({
        id: b.bulgu.id, kod: b.bulgu.baslik, alt: b.bulgu.onemDerecesi,
        yol: `/bulgular/${b.bulgu.id}`,
      })),
      projeler: o.projeler.map((p) => ({
        id: p.proje.id, kod: p.proje.kod, alt: p.proje.ad, yol: '/projeler',
      })),
      degisiklikler: o.degisiklikler.map((d) => ({
        id: d.degisiklik.id, kod: d.degisiklik.kod, alt: d.degisiklik.baslik,
        yol: '/operasyon',
      })),
      /* Satır bazlı yetki: kapsamı daraltılmış kullanıcı bir olayı GÖRÜP
         yazamayabilir. Sunucu eylemi ayrıca denetler; bu bayrak yalnız
         yüzeyi kapatır ki kullanıcı reddedilecek bir formu doldurmasın. */
      yazilabilir: yazabilir && kapsamdaYetkili(kullanici, 'envanter', 'yazma', o.tesisId),
      /* BİLDİRİM EYLEMLERİ AYRI EKSEN — bağımsız inceleme bulgusu (P2,
         #47 turu 1). Düğmelerin görünürlüğü `envanter/yazma`ya bağlıydı,
         sunucu eylemi ise `uyum/onay` istiyor. `tesis_yoneticisi` ·
         `bt_yoneticisi` · `ot_yoneticisi` rolleri birincisini taşıyor,
         ikincisini taşımıyor: kullanıcı düğmeyi GÖRÜYOR, referansı
         dolduruyor, gönderiyor ve sunucu reddediyor. Güvenlik açığı
         değil (sunucu doğru engelliyor) ama emek israfı ve ürünün kendi
         cümlesiyle çelişiyor: "bir mevzuat bildiriminin yapıldığını
         beyan etmek yazma yetkisiyle yapılmaz". Aynı ekranda
         `EtkiDogrulama` bu ayrımı zaten doğru yapıyordu. */
      bildirimYetkili: kapsamdaYetkili(kullanici, 'uyum', 'onay', o.tesisId),
    };
  });

  return (
    <OlaylarIstemci
      olaylar={kayitlar}
      tesisler={tesisler}
      adaylar={adaylar}
      yazabilir={yazabilir}
      dogrulayabilir={dogrulayabilir}
    />
  );
}
