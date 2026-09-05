import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, modulKapisi, modulYazabilir, type TesisKapsami } from '@/app/kapsam';
import type { BelgeSatiri, KontrolSatiri } from './mantik';

/* C22 · C23 — Yönetişim belgesi kütüğü, SUNUCU VERİSİ.

   ═══ BELGENİN SANTRALİ ÇOĞU ZAMAN YOKTUR ═══════════════════════════════
   Bir politika kurumsaldır: `DokumanTesis` bağı yoksa TÜM portföyü bağlar.
   Kapsamı daraltılmış kullanıcı için kural şudur:
     · bağsız (kurumsal) belge GÖRÜNÜR — onu da bağlar, gizlemek yanlış
       olurdu; kendi santralinin uyacağı kuralı görmeyen kimse uyamaz.
     · santral bağı olan belge, bağlarından biri kullanıcının kapsamına
       düşüyorsa görünür.
     · çekmecedeki santral listesi kapsam dışı santralleri YAZMAZ; sayı
       olarak "+N santral daha" der. Belgenin varlığı sır değildir, başka
       santralin adı olabilir.
   Bu, kanıt kütüphanesinin tersidir: kanıtın bağı yoksa santrali BİLİNMEZ
   ve gizlenir; belgenin bağı yoksa santrali TÜMÜDÜR ve gösterilir.

   ═══ KARŞILIKSIZ KONTROL ══════════════════════════════════════════════
   Ekranın asıl sorusu. Yalnız `yururlukte` belgeler karşılar; taslak bir
   politikayla "kapsandı" demek denetimde en pahalı yalandır. Kontrol
   listesi kapsamdan BAĞIMSIZ okunur: kontrol gereği kurumun tamamına
   aittir, tek santralin sorumlusu da eksiği görmeli. */

export const SATIR_TAVANI = 300;

export type EkranVerisi = {
  belgeler: BelgeSatiri[];
  toplam: number;
  satirTavani: number;
  /** Kapsam daraltıldığı için listelenmeyen belge sayısı. */
  kapsamDisi: number;
  kontroller: KontrolSatiri[];
  /** Form seçenekleri. */
  maddeSecenekleri: { id: string; kod: string; baslik: string; regulasyon: string }[];
  tesisSecenekleri: { id: string; kod: string; ad: string }[];
  kisiler: { id: string; ad: string }[];
  mevcutKodlar: string[];
  yazabilir: boolean;
  onaylayabilir: boolean;
  kapsamli: boolean;
};

/** Kapsam koşulu: kurumsal (bağsız) belgeler + kapsama düşen bağlı belgeler. */
function belgeKapsamKosulu(izinli: TesisKapsami) {
  if (izinli === null) return {};
  return {
    OR: [
      { tesisBaglantilari: { none: {} } },
      { tesisBaglantilari: { some: { tesisId: { in: izinli } } } },
    ],
  };
}

const ad = (k: { adSoyad: string } | null | undefined) => k?.adSoyad ?? null;

export async function dokumanEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'uyum');
  const izinli = izinliTesisIdleri(k, 'uyum');
  const kosul = { silindi: null, ...belgeKapsamKosulu(izinli) };

  const [kayitlar, toplam, kapsamToplami, maddeler, tesisler, kisiler, kodlar] = await Promise.all([
    db.dokuman.findMany({
      where: kosul,
      orderBy: [{ sonrakiGozdenGecirme: 'asc' }, { kod: 'asc' }],
      take: SATIR_TAVANI,
      include: {
        sahip: { select: { adSoyad: true } },
        onaylayan: { select: { adSoyad: true } },
        maddeBaglantilari: {
          include: {
            madde: {
              select: {
                id: true, kod: true, baslik: true,
                regulasyon: { select: { kod: true } },
              },
            },
          },
        },
        tesisBaglantilari: {
          include: { tesis: { select: { id: true, kod: true, ad: true } } },
        },
        _count: { select: { kanitlar: true } },
      },
    }),
    db.dokuman.count({ where: kosul }),
    db.dokuman.count({ where: { silindi: null } }),
    db.madde.findMany({
      where: { silindi: null },
      select: { id: true, kod: true, baslik: true, regulasyon: { select: { kod: true } } },
      orderBy: { kod: 'asc' },
    }),
    db.tesis.findMany({
      where: izinli === null ? {} : { id: { in: izinli } },
      select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' },
    }),
    db.kullanici.findMany({
      where: { aktif: true }, select: { id: true, adSoyad: true }, orderBy: { adSoyad: 'asc' },
    }),
    db.dokuman.findMany({ where: { silindi: null }, select: { kod: true } }),
  ]);

  const belgeler: BelgeSatiri[] = kayitlar.map((d) => {
    /* Kapsam dışı santral ADI yazılmaz; sayısı çekmecede söylenir. */
    const gorunurTesisler = d.tesisBaglantilari
      .filter((b) => izinli === null || izinli.includes(b.tesisId))
      .map((b) => ({ id: b.tesis.id, kod: b.tesis.kod, ad: b.tesis.ad }));
    return {
      id: d.id, kod: d.kod, baslik: d.baslik, tur: d.tur, durum: d.durum, surum: d.surum,
      sahip: ad(d.sahip), onaylayan: ad(d.onaylayan),
      yururlukTarihi: d.yururlukTarihi?.toISOString() ?? null,
      gozdenGecirmeAy: d.gozdenGecirmeAy,
      sonrakiGozdenGecirme: d.sonrakiGozdenGecirme?.toISOString() ?? null,
      disKaynak: d.disKaynak, kaynakSistem: d.kaynakSistem,
      gizlilik: d.gizlilik, aciklama: d.aciklama,
      maddeler: d.maddeBaglantilari.map((b) => ({
        id: b.madde.id, kod: b.madde.kod, baslik: b.madde.baslik,
        regulasyon: b.madde.regulasyon.kod,
      })),
      tesisler: gorunurTesisler,
      kanitSayisi: d._count.kanitlar,
    };
  });

  /* Kontrol listesi kapsamdan bağımsız: eksik, kurumun eksiğidir.

     YALNIZ YAPRAK MADDELER sayılır. `EPDK-SYM-4 Varlık Yönetimi` bir
     kontrol gereği değil BAŞLIKTIR; altındaki 4.1 ve 4.2 karşılanmışken
     onu "belgesiz" diye listelemek panelin en zararlı yanlış pozitifiydi
     (ölçüldü: 38 maddenin 13'ü başlık). Kurum bir başlığa politika yazmaz,
     gereğe yazar. */
  const kontrolKayitlari = await db.madde.findMany({
    where: { silindi: null, altMaddeler: { none: { silindi: null } } },
    select: {
      id: true, kod: true, baslik: true, zorunlulukTipi: true,
      regulasyon: { select: { kod: true } },
      belgeBaglantilari: {
        select: { dokuman: { select: { id: true, kod: true, durum: true, silindi: true } } },
      },
    },
    orderBy: { kod: 'asc' },
  });
  const kontroller: KontrolSatiri[] = kontrolKayitlari.map((m) => ({
    maddeId: m.id, kod: m.kod, baslik: m.baslik,
    regulasyon: m.regulasyon.kod, zorunlulukTipi: m.zorunlulukTipi,
    belgeler: m.belgeBaglantilari
      .filter((b) => b.dokuman.silindi === null)
      .map((b) => ({ id: b.dokuman.id, kod: b.dokuman.kod, durum: b.dokuman.durum })),
  }));

  return {
    belgeler,
    toplam,
    satirTavani: SATIR_TAVANI,
    kapsamDisi: Math.max(0, kapsamToplami - toplam),
    kontroller,
    maddeSecenekleri: maddeler.map((m) => ({
      id: m.id, kod: m.kod, baslik: m.baslik, regulasyon: m.regulasyon.kod,
    })),
    tesisSecenekleri: tesisler,
    kisiler: kisiler.map((u) => ({ id: u.id, ad: u.adSoyad })),
    mevcutKodlar: kodlar.map((x) => x.kod),
    /* Yazma bayrağı kapsamsız sorulur; asıl kapı eylemin içindedir
       (`lib/eylemler2/dokuman.ts` — kurumsal belge kapsamsız yetki ister). */
    yazabilir: modulYazabilir(k, 'uyum', 'yazma'),
    onaylayabilir: modulYazabilir(k, 'uyum', 'onay'),
    kapsamli: kapsamDaraltildi(izinli),
  };
}
