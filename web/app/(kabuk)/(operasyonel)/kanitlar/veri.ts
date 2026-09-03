import 'server-only';
import { db } from '@/lib/db';
import { izinVar, izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamKosulu, modulKapisi, type TesisKapsami } from '@/app/kapsam';
import type { KanitSatiri } from './mantik';

/* C21 · Kanıt kütüphanesi — SUNUCU VERİSİ (kapsam kuralı JSX'ten ayrı).

   ═══ KANITIN SANTRALİ YOKTUR — BAĞI VARDIR ═════════════════════════════
   `Kanit` şemada `tesisId` taşımaz. Santrale üç yoldan bağlanır:
     · `baglantilar → maddeDurumu.tesisId`  (madde durumu; bulgular da
       aynı madde durumunun çocuğudur, yani bulgu bağı = madde bağı)
     · `tesisBaglantilari.tesisId`           (doğrudan santral bağı)
     · `varlikBaglantilari`                  (varlık; varlığın kendi santrali
       envanter modülünün konusudur, bu ekranda yalnız SAYILIR)
   Kapsamı daraltılmış kullanıcı yalnız bu bağlardan biri kendi santraline
   düşen kanıtı görür; kanıtın kapsam DIŞI bağları da satıra yazılmaz
   (`include` da aynı koşulla daraltılır — B santralinin madde kodu A'ya
   yetkili birinin çekmecesine sızmaz).

   ── BAĞLANTISIZ KANIT ────────────────────────────────────────────────
   Hiçbir bağı olmayan kanıtın santrali BİLİNMEZ. Kural `app/kapsam.ts →
   tesisKapsamda` ile aynıdır: santrali bilinmeyen kayıt yalnız kapsamı
   sınırsız kullanıcıya görünür. Daraltılmış kullanıcı için bunlar
   listelenmez ama SAYILIR ve ekran "N bağlantısız kanıt kapsam dışında"
   der — sessizce yok saymak, kütüphanede olmayan bir şeyi yok göstermektir.

   ═══ SINIRSIZ OKUMA ══════════════════════════════════════════════════
   Satırlar `SATIR_TAVANI` ile sınırlı, `toplam` ayrı `count` ile ölçülür;
   kesme olursa ekran "gösterilen N / M" der. Sıralama en eski geçerlilik
   başlangıcı önce: kesilirse elde kalan, yenilenmesi gerekenlerdir.

   MODÜL: `uyum` — kanıt bir uyum kaydını (`MaddeDurumu`) karşılar ve
   `kanitEkle` `yetkiZorunlu('uyum','yazma')` ister; /bulgular ile aynı. */

export const SATIR_TAVANI = 400;

export type EkranVerisi = {
  kanitlar: KanitSatiri[];
  /** kütüğün GERÇEK büyüklüğü (kapsam içinde) — kesme sessiz kalmasın */
  toplam: number;
  satirTavani: number;
  /** kapsam daraltıldığı için listelenmeyen bağlantısız kanıt sayısı */
  kapsamDisi: number;
  /** kanıt ekleme formu için kapsam içi madde durumu seçenekleri */
  maddeDurumlari: MaddeDurumuSecenegi[];
  yazabilir: boolean;
  kapsamli: boolean;
};

export type MaddeDurumuSecenegi = {
  id: string; maddeKod: string; maddeBaslik: string; tesisKod: string; surecKod: string;
};

/** Ekleme formunda listelenen en fazla madde durumu — form bir arama ekranı değildir. */
const SECENEK_TAVANI = 300;

/** Kanıt → santral kapsam koşulu: bağlarından biri izinli kümeye düşmeli.
    Üç bağ yolu da sayılır — madde durumu, doğrudan santral, VARLIK (varlığın
    santrali). Varlık yolu unutulsaydı yalnız varlığa bağlı kanıt ne listede
    ne sayaçta görünürdü: üçüncü, görünmez bir sınıf. */
function kanitKapsamKosulu(izinli: TesisKapsami) {
  if (izinli === null) return {};
  return {
    OR: [
      { baglantilar: { some: { maddeDurumu: { tesisId: { in: izinli } } } } },
      { tesisBaglantilari: { some: { tesisId: { in: izinli } } } },
      { varlikBaglantilari: { some: { varlik: { tesisId: { in: izinli } } } } },
    ],
  };
}

async function kanitSatirlari(izinli: TesisKapsami): Promise<KanitSatiri[]> {
  const kanitlar = await db.kanit.findMany({
    where: { silindi: null, ...kanitKapsamKosulu(izinli) },
    take: SATIR_TAVANI,
    orderBy: [{ gecerlilikBaslangic: 'asc' }],
    include: {
      yukleyen: true,
      sahip: true,
      baglantilar: {
        /* Kapsam dışı bağ satıra yazılmaz — daraltma include'a da uygulanır. */
        where: { maddeDurumu: kapsamKosulu(izinli) },
        include: {
          maddeDurumu: {
            include: {
              madde: true,
              tesis: true,
              surec: { include: { regulasyon: true } },
              bulgular: { where: { silindi: null }, select: { id: true, baslik: true, durum: true } },
            },
          },
        },
      },
      tesisBaglantilari: {
        where: kapsamKosulu(izinli),
        include: { tesis: true },
      },
      _count: { select: { varlikBaglantilari: true } },
    },
  });

  return kanitlar.map((k) => ({
    id: k.id,
    ad: k.ad,
    tip: k.tip,
    dosyaYolu: k.dosyaYolu,
    baslangic: k.gecerlilikBaslangic.toISOString(),
    toplanma: k.toplanmaTarihi?.toISOString() ?? null,
    bitis: k.gecerliBitis?.toISOString() ?? null,
    yukleyen: k.yukleyen?.adSoyad ?? null,
    sahip: k.sahip?.adSoyad ?? null,
    kaynakSistem: k.kaynakSistem,
    otomatik: k.otomatik,
    gizlilik: k.gizlilik,
    surum: k.surum,
    maddeler: k.baglantilar.map((b) => ({
      maddeDurumuId: b.maddeDurumuId,
      maddeKod: b.maddeDurumu.madde.kod,
      maddeBaslik: b.maddeDurumu.madde.baslik,
      surecId: b.maddeDurumu.surecId,
      surecKod: b.maddeDurumu.surec.kod,
      regKod: b.maddeDurumu.surec.regulasyon.kod,
      tesisId: b.maddeDurumu.tesisId,
      tesisKod: b.maddeDurumu.tesis.kod,
      tesisAd: b.maddeDurumu.tesis.ad,
    })),
    bulgular: k.baglantilar.flatMap((b) => b.maddeDurumu.bulgular.map((bu) => ({
      id: bu.id, baslik: bu.baslik, durum: bu.durum, tesisKod: b.maddeDurumu.tesis.kod,
    }))),
    tesisler: k.tesisBaglantilari.map((t) => ({ id: t.tesis.id, kod: t.tesis.kod, ad: t.tesis.ad })),
    varlikSayisi: k._count.varlikBaglantilari,
  }));
}

/** Ekleme formu: kapsam içi madde durumları (madde kodu · santral · süreç). */
async function maddeDurumuSecenekleri(izinli: TesisKapsami): Promise<MaddeDurumuSecenegi[]> {
  const durumlar = await db.maddeDurumu.findMany({
    where: kapsamKosulu(izinli),
    take: SECENEK_TAVANI,
    include: { madde: true, tesis: true, surec: true },
    orderBy: [{ tesis: { kod: 'asc' } }, { madde: { kod: 'asc' } }],
  });
  return durumlar.map((d) => ({
    id: d.id, maddeKod: d.madde.kod, maddeBaslik: d.madde.baslik,
    tesisKod: d.tesis.kod, surecKod: d.surec.kod,
  }));
}

export async function kanitEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'uyum');
  const izinli = izinliTesisIdleri(k, 'uyum');
  const [kanitlar, toplam, kapsamDisi, maddeDurumlari] = await Promise.all([
    kanitSatirlari(izinli),
    db.kanit.count({ where: { silindi: null, ...kanitKapsamKosulu(izinli) } }),
    /* Kapsam dışı sayacı: silinmemiş kanıtlardan kapsam koşuluna GİRMEYEN
       herkes — bağlantısız olanlar da, yalnız başka santrale bağlı olanlar
       da. Sınırsız kapsamda hepsi zaten listededir, sayı sıfırdır. Sayı
       yalnız daraltılmış kullanıcıya "görmediğin kayıt var" demek için. */
    izinli === null
      ? Promise.resolve(0)
      : db.kanit.count({ where: { silindi: null, NOT: kanitKapsamKosulu(izinli) } }),
    maddeDurumuSecenekleri(izinli),
  ]);
  return {
    kanitlar,
    toplam,
    satirTavani: SATIR_TAVANI,
    kapsamDisi,
    maddeDurumlari,
    /* Kapsamsız sorulur çünkü `kanitEkle` de kapsamsız korunuyor.
       AÇIK BORÇ: `MaddeDurumu` tesisId TAŞIR, yani kanıt aslında
       santral kapsamlı bir kayda bağlanır; sunucu kapısı iki aşamalı
       yazıldığında bu bayrak da `modulYazabilir` olmalıdır. Ekranı
       sunucudan önce gevşetmek, çalışmayan düğme göstermek olurdu. */
    yazabilir: izinVar(k, 'uyum', 'yazma'),
    kapsamli: kapsamDaraltildi(izinli),
  };
}
