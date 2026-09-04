import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { db } from '@/lib/db';
import { kaynaklariCoz } from './veri';
import RegulasyonlarIstemci from './RegulasyonlarIstemci';
import { kisaKod, type Reg } from './mantik';

export const metadata: Metadata = { title: 'Regülasyon kütüphanesi' };

/* Regülasyon kütüphanesi — "hangi çerçeve hangi sürümde, kataloğu tam mı?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir.

   Bu bir uyum ekranı DEĞİLDİR: madde ağacı burada değerlendirilmez,
   TANIMLANIR. Yetki bu yüzden `uyum` değil `tanimlar` modülünden gelir.

   Sorgu yalnız yürürlükteki sürümün (ve sürüme hiç bağlanmamış geçiş
   dönemi kayıtlarının) maddelerini getirir — arşiv sürümlerin maddeleri
   silinmez ama kütüphanede iki kez listelenmez.

   SANTRAL KAPSAMI: bu ekran BİLEREK kapsamsızdır, çünkü regülasyon ve madde
   kataloğu kurum geneli bir TANIMdır — `Regulasyon`/`Madde` şemada
   `tesisId` taşımaz ve aynı EPDK maddesi bütün santraller için aynıdır;
   santrale bağlanan şey maddenin kendisi değil, o maddenin bir santraldeki
   DEĞERLENDİRMESİdir (`MaddeDurumu`) ve o /uyum ile /bulgular ekranlarında
   kapsamla daraltılır. */

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'tanimlar', 'okuma')) return <Yetkisiz rol="tanımlar okuma" />;

  const yazabilir = izinVar(kullanici, 'tanimlar', 'yazma');
  const onaylayabilir = izinVar(kullanici, 'tanimlar', 'onay');

  const [regulasyonlar, alanlar] = await Promise.all([
    db.regulasyon.findMany({
      include: {
        maddeler: {
          where: {
            silindi: null,
            OR: [{ surum: { durum: 'aktif' } }, { surumId: null }],
          },
          include: {
            alanlar: { include: { alan: { select: { id: true, kod: true } } } },
            _count: { select: { altMaddeler: true, durumlar: true } },
          },
          orderBy: [{ sira: 'asc' }, { kod: 'asc' }],
        },
        surumler: {
          orderBy: { olusturuldu: 'desc' },
          include: { farklar: true, _count: { select: { maddeler: true } } },
        },
        /* UY-41 · Resmî kaynak kütüğü. Adres kurumdan gelir; ürün hiçbir
           adresle GELMEZ ve buraya hiçbir varsayılan yazılmaz. */
        kaynaklar: {
          orderBy: { ad: 'asc' },
          include: { sonKontrolEden: { select: { adSoyad: true } } },
        },
        _count: { select: { surecler: true } },
      },
      orderBy: { kod: 'asc' },
    }),
    db.kapsamAlani.findMany({
      where: { aktif: true },
      select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
  ]);

  const veri: Reg[] = regulasyonlar.map((r) => ({
    id: r.id, kod: r.kod, ad: r.ad, surum: r.surum, aktif: r.aktif,
    surecSayisi: r._count.surecler,
    maddeler: r.maddeler.map((m) => ({
      id: m.id, kod: m.kod, kisaKod: kisaKod(m.kod, r.kod),
      baslik: m.baslik, metin: m.metin,
      ustMaddeId: m.ustMaddeId, kanitTipi: m.kanitTipi,
      surumsuz: m.surumId === null,
      alanlar: m.alanlar.map((a) => a.alan),
      altSayisi: m._count.altMaddeler,
      kullanimSayisi: m._count.durumlar,
    })),
    /* Takip DURUMU `veri.ts` içinde, sunucuda hesaplanır: "şimdi" render
       gövdesinde okunamaz (React saflık kuralı). */
    kaynaklar: kaynaklariCoz(r.kaynaklar),
    surumler: r.surumler.map((sv) => ({
      id: sv.id, etiket: sv.surumEtiketi, durum: sv.durum,
      maddeSayisi: sv._count.maddeler,
      yururluk: sv.yururlukTarih?.toISOString() ?? null,
      farklar: sv.farklar.map((f) => ({
        kod: f.maddeKodu, tip: f.degisimTipi, ozet: f.ozet, etki: f.etkiNotu,
      })),
    })),
  }));

  return (
    <RegulasyonlarIstemci
      regulasyonlar={veri}
      alanlar={alanlar}
      yazabilir={yazabilir}
      onaylayabilir={onaylayabilir}
    />
  );
}
