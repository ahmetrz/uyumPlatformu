import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { kapsamdaYetkili, modulOkuyabilir, modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import ProseslerIstemci from './ProseslerIstemci';
import type { SurecSatiri } from './mantik';

export const metadata: Metadata = { title: 'Proses zinciri' };

/* ═══ OT-05 · Proses zinciri — "cihaz üretimde nerede duruyor?" ════════

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   ── TOPOLOJİDEN AYRI BİR SORU ─────────────────────────────────────────
   /topoloji cihazın AĞDA nerede durduğunu söyler. Bu ekran cihazın
   ÜRETİMDE nerede durduğunu söyler: hangi iş sürecinin hangi adımında,
   hangi rolle. İkisi aynı cihazın iki ayrı yeridir ve biri diğerinden
   türetilemez — bir DMZ sunucusu üretim zincirinin tam ortasında
   olabilir, bir saha PLC'si hiçbir tanımlı adımda olmayabilir.

   ── EKRAN HİÇBİR ŞEYİ TÜRETMEZ ────────────────────────────────────────
   Tek nokta, yedeklilik ve RTO/RPO insan DEĞERLENDİRMESİDİR; ürün bunları
   hesaplamaz, tahmin etmez. Değerlendirilmemiş bağ `null` kalır ve
   ekranda "değerlendirilmedi" diye yazılır — "tek nokta değil" diye
   DEĞİL.

   ── KAPSAM ────────────────────────────────────────────────────────────
   Santrali olan süreç kullanıcının envanter kapsamına tabidir; santralsiz
   (grup çapında) süreç herkese görünür — onu gizlemek, kimsenin
   görmemesi demek olurdu. Düzenleme yetkisi ayrıca sorulur ve santral
   bazında verilir. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!modulOkuyabilir(k, 'envanter')) return <Yetkisiz rol="envanter okuma" />;

  const izinli = izinliTesisIdleri(k, 'envanter');
  /* Süreç ve adım TANIMI kütük işidir (`tanimlar/onay`); bağın kendisi
     tek varlığa dokunur (`envanter/yazma`). İki ayrı yetki, iki ayrı
     düğme kümesi — sunucu da aynı ayrımı uygular. */
  const surecYazabilir = modulYazabilir(k, 'tanimlar', 'onay');
  const bagYazabilir = modulYazabilir(k, 'envanter', 'yazma');

  const [surecler, varliklar] = await Promise.all([
    db.isSureci.findMany({
      where: izinli === null
        ? {}
        : { OR: [{ tesisId: { in: izinli } }, { tesisId: null }] },
      include: {
        tesis: { select: { ad: true } },
        adimlar: {
          orderBy: { sira: 'asc' },
          include: {
            varliklar: {
              include: {
                varlik: {
                  select: {
                    id: true, etiket: true, ad: true, kritiklik: true,
                    tesisId: true, silindi: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { kod: 'asc' },
    }),
    /* Adıma bağlanabilecek varlıklar — YALNIZ kapsam içindekiler. Kapsam
       dışı bir varlığı seçtirmek, sunucunun kesin olarak reddedeceği bir
       işi kullanıcıya yaptırmak olurdu. */
    db.varlik.findMany({
      where: {
        silindi: null,
        ...(izinli === null ? {} : { tesisId: { in: izinli } }),
      },
      select: { id: true, etiket: true, ad: true, tesisId: true },
      orderBy: { etiket: 'asc' },
    }),
  ]);

  const tesisler = await db.tesis.findMany({
    where: { durum: 'aktif', ...(izinli === null ? {} : { id: { in: izinli } }) },
    select: { id: true, kod: true, ad: true },
    orderBy: { kod: 'asc' },
  });

  const satirlar: SurecSatiri[] = surecler.map((s) => ({
    id: s.id, kod: s.kod, ad: s.ad,
    tesisId: s.tesisId, tesisAd: s.tesis?.ad ?? null,
    uretimEtkisi: s.uretimEtkisi,
    duzenlenebilir: surecYazabilir && kapsamdaYetkili(k, 'tanimlar', 'onay', s.tesisId),
    adimlar: s.adimlar.map((a) => ({
      id: a.id, kod: a.kod, ad: a.ad, sira: a.sira, aciklama: a.aciklama,
      rtoSaat: a.rtoSaat, rpoSaat: a.rpoSaat, uretimEtkisi: a.uretimEtkisi,
      /* Silinmiş varlığın bağı listelenmez ama SESSİZCE de yok sayılmaz:
         bağ kaydı şemada duruyor, ekran yalnız canlı varlıkları çizer. */
      varliklar: a.varliklar
        .filter((b) => b.varlik.silindi === null)
        .map((b) => ({
          id: b.id, varlikId: b.varlikId,
          etiket: b.varlik.etiket, ad: b.varlik.ad, kritiklik: b.varlik.kritiklik,
          rol: b.rol, tekNokta: b.tekNokta, yedekli: b.yedekli, aciklama: b.aciklama,
          duzenlenebilir: bagYazabilir
            && kapsamdaYetkili(k, 'envanter', 'yazma', b.varlik.tesisId),
        })),
    })),
  }));

  return (
    <ProseslerIstemci
      surecler={satirlar}
      varliklar={varliklar.map((v) => ({ id: v.id, ad: `${v.etiket} · ${v.ad}` }))}
      tesisler={tesisler.map((t) => ({ id: t.id, ad: `${t.kod} — ${t.ad}` }))}
      surecYazabilir={surecYazabilir}
      bagYazabilir={bagYazabilir}
    />
  );
}
