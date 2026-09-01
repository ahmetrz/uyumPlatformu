import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamKosulu, modulKapisi } from '@/app/kapsam';
import { omruCoz, type Proje, type VarlikKaydi } from './mantik';

/* O13 · EOL/EOS & Ömür yönetimi — SUNUCU VERİSİ.

   ═══ İKİ AYRI KUSUR ════════════════════════════════════════════════════
   (1) MODÜL İZNİ HİÇ SORULMUYORDU: ekran yalnız `girisZorunlu()` çağırıp
       bütün varlıkları okuyordu. Envanterde okuma izni olmayan bir rol
       (ör. `risk_sahibi`) kurumun tüm cihaz envanterini — etiket, ad,
       üretici, destek bitişi — bu ekrandan görebiliyordu. Kapı artık
       kardeş ekranlarla aynı: `izinVar(k, 'envanter', 'okuma')`.
   (2) SANTRAL KAPSAMI HİÇ UYGULANMIYORDU: `Varlik.tesisId` var, süzgeç
       yoktu. A santraline kısıtlı kullanıcı B'nin varlık etiketlerini ve
       santral adını görüyordu; `toplamVarlik` sayacı da kapsamsız
       sayıyordu — satır gizlense bile sayaç "başka bir yerde 400 varlık
       var" diyordu.

   ═══ SINIRSIZ OKUMA (P1 · ölçülmüş) ═══════════════════════════════════
   Ekran HER İSTEKTE bütün `Varlik` tablosunu, üstüne `yazilimlar`,
   `riskler` (+`kontroller`, `projeler`) ve `projeBaglantilari` ilişkileriyle
   belleğe alıyor, sonra ömür sinyali taşımayanları JS'te atıyordu.
   `docs/PERFORMANS_TABANI.md` §4: 10.347 varlıkta 422,7 ms · 33,7 MB heap
   (taban 6,0 MB). Kapsam süzgeci bunu KENDİLİĞİNDEN çözmez — kapsamsız bir
   yönetici hâlâ tabloyu tümüyle çekerdi.

   İki ayrı düzeltme:
     1. ÖMÜR SİNYALİ ARTIK SQL'DE. Kuyruk ölçütü (`omruCoz` → bd / tarihYok /
        yaklaşan / EOL geçmiş) `kuyrukKosulu` içinde birebir Prisma koşuluna
        çevrildi. Ekrana yalnız KUYRUK gelir; sağlıklı varlık hiç okunmaz.
        Bu, bellek sorununun kendisidir — `take` değil.
     2. `SATIR_TAVANI` bir güvenlik supabıdır: kuyruk patolojik büyüse bile
        istek sınırlı kalır. Kesme SESSİZ DEĞİLDİR: `kuyrukToplami` ayrı bir
        `count` ile ölçülür ve ekran "gösterilen N · kuyrukta M" der.
        Sessizce kırpılmış liste "hepsi bu" der; bu, olmayan bir tamlık
        iddiasıdır.
     3. METRİKLER KESİLMEMİŞ VERİDEN gelir: üçü de kuyruğun TAMAMI üzerinde
        `count` ile ölçülür (satır için `take`, sayım için `count`). Satırı
        sınırlayıp sayacı ondan hesaplamak sayıyı yanlış yapardı.

   MODÜL SEÇİMİ: `envanter`. Kaydın konusu VARLIKTIR (`Varlik` tablosu,
   EOL/EOS alanları); /envanter, /kesif, /operasyon, /yedekleme ve
   /topoloji aynı modülü kullanır ve `lib/eylemler2/envanter.ts`teki
   eylemler de `yetkiZorunlu('envanter', …)` çağırır.

   ── SANTRALİ BİLİNMEYEN KAYIT ──────────────────────────────────────────
   `app/kapsam.ts → kapsamKosulu` (= `lib/api/yetki.ts → tesisKapsamda`
   kuralı): santrali null olan varlık YALNIZ kapsamsız kullanıcıya görünür.
   NOT: /envanter bugün bunun tersini yapıyor (tesissiz varlığı herkese
   gösteriyor) ve gerekçesini kendi yorumunda yazıyor; o davranış bu
   görevin kapsamı dışındadır ve DEĞİŞTİRİLMEDİ. Ömür kuyruğunda ise
   ayrıcalık tanınmaz: kuyruk bir DEĞİŞTİRME LİSTESİDİR, sahibi belli
   olmayan bir cihazı kapsamı dar bir kullanıcının kuyruğuna koymak onu
   yanlış bir bütçe kararına götürürdü. */

/**
 * Sunucudan çekilen en fazla kuyruk satırı.
 *
 * Atlas sözleşmesi 5–9 GÖRÜNÜR satır + katlanmış kuyruk der; istemci
 * gruplama, ufuk çizelgesi ve çekmece için kuyruğun tamamını ister. 500,
 * "bir insanın tek oturumda karara bağlayabileceğinden fazlası" ile
 * "tabloyu belleğe almak" arasındaki sınırdır: bugünkü seed'de kuyruk
 * onlarca satır, 10.000 varlıklı bir kurulumda birkaç yüz olur. Üstüne
 * çıkıldığında ekran bunu SÖYLER (bkz. `kuyrukToplami`).
 */
export const SATIR_TAVANI = 500;

/** Metrikler — kesilmemiş kuyruğun TAMAMI üzerinde `count` ile ölçülür. */
export type OmurMetrikleri = {
  destekBitti: number;
  yaklasan: number;
  projeyeBagli: number;
};

export type EkranVerisi = {
  kayitlar: VarlikKaydi[];
  toplamVarlik: number;
  /** kuyruğun GERÇEK büyüklüğü — `take` kesmesi sessiz kalmasın diye */
  kuyrukToplami: number;
  satirTavani: number;
  metrikler: OmurMetrikleri;
  simdi: number;
  /** true = kuyruk bir santral kapsamıyla daraltıldı */
  kapsamli: boolean;
};

const GUN = 86_400_000;

/**
 * Ömür kuyruğu ölçütünün SQL karşılığı — `mantik.ts → omruCoz` ile birebir:
 *   durum 'bd' (desteksiz) = destek bitti · EOS geçti · üstündeki yazılımın
 *                            EOS'u geçti
 *   tarihYok               = üç ömür tarihinin üçü de boş
 *   yaklasan               = EOS önümüzdeki 365 gün içinde
 *   EOL geçmiş             = eolTarihi bugünden önce
 * `eosTarihi <= şimdi+365g` tek koşulu hem "EOS geçti"yi hem "yaklaşan"ı
 * kapsar — ikisi bitişik aralıklardır.
 */
function kuyrukKosulu(simdi: number) {
  const an = new Date(simdi);
  const ufuk = new Date(simdi + 365 * GUN);
  return {
    OR: [
      { destekBitis: { lt: an } },
      { eosTarihi: { lte: ufuk } },
      { eolTarihi: { lt: an } },
      { AND: [{ destekBitis: null }, { eolTarihi: null }, { eosTarihi: null }] },
      { yazilimlar: { some: { yazilim: { eosTarihi: { lt: an } } } } },
    ],
  };
}

export async function omurEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'envanter');
  // `new Date()` sunucuda istek başına bir kez okunur; tüm eşikler bu ana göre.
  const simdi = new Date().getTime();
  const izinli = izinliTesisIdleri(k, 'envanter');
  /* Varlık kapsamı TEK yerde tanımlanır: hem kuyruk hem de "toplam varlık"
     sayacı aynı koşulu kullanır. Ayrışsalardı metrik, satırı gizlenmiş bir
     varlığı saymaya devam ederdi. */
  const varlikKapsami = { silindi: null, ...kapsamKosulu(izinli) };
  const an = new Date(simdi);
  const ufuk = new Date(simdi + 365 * GUN);
  // Kuyruk ölçütü TEK yerde: satırlar, toplam ve metrikler aynı koşuldan.
  const kuyrukSorgusu = { ...varlikKapsami, ...kuyrukKosulu(simdi) };
  /* Bitmemiş proje — `omruCoz`un `proje` alanıyla aynı tanım: doğrudan
     varlık bağı ya da varlığın riski üzerinden. */
  const bitmemisProje = { silindi: null, durum: { not: 'tamamlandi' } };

  const [
    varliklar, toplamVarlik, kuyrukToplami, destekBitti, yaklasan, projeyeBagli,
  ] = await Promise.all([
    db.varlik.findMany({
      where: kuyrukSorgusu,
      /* Kesme olursa en aciliyetli satırlar elde kalsın: en erken biten
         destek başta. `take` bir supap olduğu için sıralama da savunmacıdır. */
      take: SATIR_TAVANI,
      select: {
        id: true, etiket: true, ad: true, kritiklik: true, yasamDongusu: true,
        destekBitis: true, eolTarihi: true, eosTarihi: true,
        /* Tür / santral / tedarikçi ilişki olarak DEĞİL, yabancı anahtar
           olarak okunur ve aşağıda bellekte eşlenir. Nedeni ölçüm: Prisma
           her ilişkiyi `id IN (…)` ile 999'luk parçalar hâlinde çeker —
           10.000 varlıkta üç ilişki için 33 sorgu ve ~54ms, oysa üç
           tablonun tamamı 56 satır. */
        turId: true, tesisId: true, tedarikciId: true,
        yazilimlar: {
          select: {
            yazilim: {
              select: { ad: true, surum: true, uretici: true, eolTarihi: true, eosTarihi: true },
            },
          },
        },
        riskler: {
          select: {
            risk: {
              select: {
                id: true, kod: true, baslik: true, durum: true, silindi: true,
                kontroller: { select: { madde: { select: { kod: true, baslik: true } } } },
                projeler: {
                  select: {
                    proje: { select: { id: true, kod: true, ad: true, durum: true, silindi: true } },
                  },
                },
              },
            },
          },
        },
        projeBaglantilari: {
          select: {
            proje: { select: { id: true, kod: true, ad: true, durum: true, silindi: true } },
          },
        },
      },
      orderBy: [{ destekBitis: 'asc' }, { eosTarihi: 'asc' }, { etiket: 'asc' }],
    }),
    db.varlik.count({ where: varlikKapsami }),
    db.varlik.count({ where: kuyrukSorgusu }),
    /* ── Metrikler · üçü de KESİLMEMİŞ kuyruk üzerinde sayılır ───────── */
    db.varlik.count({
      where: {
        ...kuyrukSorgusu,
        OR: [
          { destekBitis: { lt: an } },
          { eosTarihi: { lt: an } },
          { yazilimlar: { some: { yazilim: { eosTarihi: { lt: an } } } } },
        ],
      },
    }),
    db.varlik.count({
      where: { ...kuyrukSorgusu, eosTarihi: { gte: an, lte: ufuk } },
    }),
    db.varlik.count({
      where: {
        ...kuyrukSorgusu,
        OR: [
          { projeBaglantilari: { some: { proje: bitmemisProje } } },
          { riskler: { some: { risk: {
            silindi: null, projeler: { some: { proje: bitmemisProje } },
          } } } },
        ],
      },
    }),
  ]);

  /* Boyut tabloları TAM okunur (filtresiz) ve İSTEMCİYE GİTMEZ: yalnız
     görünen satırın tür/santral/tedarikçi adını çözmek için kullanılır.
     Pasifleştirilmiş bir türe ya da kapatılmış bir santrale bağlı varlık
     ömür kuyruğundan düşmemeli — bu yüzden süzgeç yok. */
  const [turAdlari, tesisAdlari, tedarikciAdlari] = await Promise.all([
    db.varlikTuru.findMany({ select: { id: true, ad: true } }),
    db.tesis.findMany({ select: { id: true, ad: true } }),
    db.tedarikci.findMany({ select: { id: true, ad: true } }),
  ]);
  const turHaritasi = new Map(turAdlari.map((t) => [t.id, t.ad]));
  const tesisHaritasi = new Map(tesisAdlari.map((t) => [t.id, t.ad]));
  const tedarikciHaritasi = new Map(tedarikciAdlari.map((t) => [t.id, t.ad]));

  const kayitlar: VarlikKaydi[] = varliklar.map((v) => {
    // Desteği bitmiş yazılım kurulumları — en erken EOS önce (satırda ürün adı yazılır).
    const bitenYazilimlar = v.yazilimlar
      .map((y) => y.yazilim)
      .filter((y) => y.eosTarihi !== null && y.eosTarihi.getTime() < simdi)
      .sort((a, b) => (a.eosTarihi as Date).getTime() - (b.eosTarihi as Date).getTime())
      .map((y) => ({
        ad: y.ad, surum: y.surum, uretici: y.uretici,
        eos: (y.eosTarihi as Date).toISOString(),
      }));

    const riskler = v.riskler.map((r) => r.risk).filter((r) => r.silindi === null);

    // Telafi edici kontrol = varlığa bağlı risklerin RiskKontrol maddeleri.
    const kontroller = riskler.flatMap((r) =>
      r.kontroller.map((c) => ({ kod: c.madde.kod, baslik: c.madde.baslik, riskKod: r.kod })));

    /* Bağlı proje: doğrudan varlık bağlantısı ya da varlığın riski üzerinden.
       Seed'de varlık→proje doğrudan bağı henüz yok; zincir risk üzerinden
       kuruluyor, ikisi de aynı ProjeBaglantisi kaydından okunur. */
    const projeHavuzu = [
      ...v.projeBaglantilari.map((p) => p.proje),
      ...riskler.flatMap((r) => r.projeler.map((p) => p.proje)),
    ].filter((p) => p.silindi === null && p.durum !== 'tamamlandi');
    const projeler: Proje[] = [];
    for (const p of projeHavuzu) {
      if (!projeler.some((x) => x.id === p.id)) {
        projeler.push({ id: p.id, kod: p.kod, ad: p.ad, durum: p.durum });
      }
    }

    return {
      id: v.id,
      etiket: v.etiket,
      ad: v.ad,
      // Tür satırı bulunamazsa uydurulmaz — BİLİNMİYOR yazılır.
      turAd: turHaritasi.get(v.turId) ?? 'bilinmiyor',
      tesisId: v.tesisId,
      tesisAd: v.tesisId === null ? null : tesisHaritasi.get(v.tesisId) ?? null,
      tedarikciAd: v.tedarikciId === null ? null : tedarikciHaritasi.get(v.tedarikciId) ?? null,
      kritiklik: v.kritiklik,
      yasamDongusu: v.yasamDongusu,
      destekBitis: v.destekBitis?.toISOString() ?? null,
      eolTarihi: v.eolTarihi?.toISOString() ?? null,
      eosTarihi: v.eosTarihi?.toISOString() ?? null,
      bitenYazilimlar,
      kontroller,
      riskler: riskler.map((r) => ({ id: r.id, kod: r.kod, baslik: r.baslik })),
      projeler,
    };
  });

  /* İkinci süzgeç bilerek DURUYOR ve bir GÜVENLİK AĞIdır, kopya değil:
     SQL koşulu ile `omruCoz` bir gün ayrışırsa (biri güncellenip diğeri
     unutulursa) ekranda ömür sinyali taşımayan bir satır belirmesin.
     Bugün ikisi aynı kümeyi seçer — SQL geniş yakalar, bu daraltmaz. */
  const kuyruk = kayitlar.filter((v) => {
    const o = omruCoz(v, simdi);
    return o.durum === 'bd' || o.tarihYok || o.yaklasan
      || (v.eolTarihi !== null && new Date(v.eolTarihi).getTime() < simdi);
  });

  return {
    kayitlar: kuyruk,
    toplamVarlik,
    kuyrukToplami,
    satirTavani: SATIR_TAVANI,
    metrikler: { destekBitti, yaklasan, projeyeBagli },
    simdi,
    kapsamli: kapsamDaraltildi(izinli),
  };
}
