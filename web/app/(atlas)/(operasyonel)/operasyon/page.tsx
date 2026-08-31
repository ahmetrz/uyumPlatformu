import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/atlas/temel';
import { db } from '@/lib/db';
import OperasyonIstemci from './OperasyonIstemci';
import type { Bagli, D } from './mantik';

export const metadata: Metadata = { title: 'Değişiklik yönetimi — Atlas' };

/* O · Değişiklik yönetimi (OT emniyet kapılı).

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Sunucu yalnız veriyi toplar ve serileştirir; karar `mantik.ts`te, sunum
   istemcide. Emniyet kapısı kuralının kendisi lib/eylemler2/operasyon.ts'te
   yaşar — ekran onu yalnız ÖNCEDEN söyler, uygulamaz. */

/** Kapsam koşulu: santrali olan değişiklik kullanıcının envanter kapsamına
    tabidir; santralsiz (grup çapında) değişiklik herkese görünür. Grup
    değişikliğini gizlemek onu kimsenin görmemesi demek olurdu — "santral
    yok" burada "yasak" değil "portföy geneli"dir. */
function kapsamKosulu(gorulebilir: string[] | null) {
  if (gorulebilir === null) return {};
  return { OR: [{ tesisId: { in: gorulebilir } }, { tesisId: null }] };
}

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'envanter', 'okuma')) return <Yetkisiz rol="envanter okuma" />;

  const gorulebilir = izinliTesisIdleri(k, 'envanter');
  const yazmaYetkisi = izinVar(k, 'envanter', 'yazma');

  const [degisiklikler, tesisler] = await Promise.all([
    db.degisiklik.findMany({
      where: kapsamKosulu(gorulebilir),
      orderBy: [{ olusturuldu: 'desc' }],
      include: {
        tesis: { select: { id: true, kod: true, ad: true } },
        talepEden: { select: { adSoyad: true } },
        onaylayan: { select: { adSoyad: true } },
        olaylar: {
          select: { olay: { select: { id: true, kod: true, baslik: true, durum: true } } },
        },
      },
    }),
    db.tesis.findMany({
      where: { durum: 'aktif' },
      select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
  ]);

  /* `new Date()` sunucuda istek başına BİR kez okunur; metrik, tablo ve
     çekmece aynı "bugün"ü konuşsun. */
  const simdi = new Date().getTime();

  const kayitlar: D[] = degisiklikler.map((d) => ({
    id: d.id,
    kod: d.kod,
    baslik: d.baslik,
    aciklama: d.aciklama,
    tesis: d.tesis ?? null,
    varlikEtiketi: d.varlikEtiketi,
    otMu: d.otMu,
    durum: d.durum,
    saglayiciOnayi: d.saglayiciOnayi,
    bakimPenceresi: d.bakimPenceresi,
    geriAlmaPlani: d.geriAlmaPlani,
    onDegisiklikYedegi: d.onDegisiklikYedegi,
    uretimEtkisi: d.uretimEtkisi,
    sonDogrulama: d.sonDogrulama,
    talepEden: d.talepEden?.adSoyad ?? null,
    onaylayan: d.onaylayan?.adSoyad ?? null,
    planTarihi: d.planTarihi?.toISOString() ?? null,
    olusturuldu: d.olusturuldu.toISOString(),
    olaylar: d.olaylar.map((o): Bagli => ({
      id: o.olay.id, kod: o.olay.kod, alt: o.olay.baslik, yol: '/olaylar',
    })),
    // Satır bazlı yetki: santral kapsamı daraltılmış kullanıcı grup
    // değişikliğini GÖRÜR ama santrali olan kaydı yazamayabilir.
    yazilabilir: yazmaYetkisi
      && (!d.tesisId || izinVar(k, 'envanter', 'yazma', { tesisId: d.tesisId })),
    onaylanabilir: izinVar(k, 'envanter', 'onay')
      && (!d.tesisId || izinVar(k, 'envanter', 'onay', { tesisId: d.tesisId })),
  }));

  return (
    <OperasyonIstemci
      degisiklikler={kayitlar}
      tesisler={tesisler}
      simdi={simdi}
      yazabilir={yazmaYetkisi}
    />
  );
}
