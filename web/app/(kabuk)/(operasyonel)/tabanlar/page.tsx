import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulOkuyabilir, modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import TabanlarIstemci from './TabanlarIstemci';
import type { TabanSatiri } from './mantik';

export const metadata: Metadata = { title: 'Firmware tabanları' };

/* O13b · OT-22 · Firmware tabanları — "hangi sürüm onaylı?"

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir.

   ── TABAN BİR KÜTÜK KAYDIDIR, BİR ÖLÇÜM DEĞİL ─────────────────────────
   Cihazdaki firmware bir ÖLÇÜMDÜR (keşif/CMDB getirir). Onaylı sürüm bir
   KARARDIR: kim, ne zaman, hangi advisory'ye dayanarak. Bu yüzden ekran
   `tanimlar/onay` ister — envanter yazma yetkisi yetmez.

   ── EKRAN KARAR VERMEZ ────────────────────────────────────────────────
   Uyum kararını `motor.firmware_uyumu` verir ve sonucu `FirmwareUyumu`
   satırına yazar. Bu ekran yalnız tabanı tanımlar; taban değişince karar
   bir sonraki koşuda güncellenir. "Şimdi hesapla" düğmesi bilerek yoktur
   — motor defteri (Sağlık ekranı) tetiklemenin tek yeridir.

   ── KAPSAM ────────────────────────────────────────────────────────────
   Taban santrale bağlı DEĞİLDİR (bir Siemens S7-1500 tabanı bütün
   santrallerde aynıdır); bu yüzden tesis kapsamı süzgeci YOKTUR. Etki
   sayacı ise kapsamdan bağımsız TÜM eşleşen varlıkları sayar, çünkü
   tabanın etkisi de kapsamdan bağımsızdır. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!modulOkuyabilir(k, 'envanter')) return <Yetkisiz rol="envanter okuma" />;
  const yazabilir = modulYazabilir(k, 'tanimlar', 'onay');

  const [temeller, turler, uyumlar, duyuruSayisi, sonDuyuru, urunSayisi, korelasyon] = await Promise.all([
    db.firmwareTemeli.findMany({
      orderBy: [{ aktif: 'desc' }, { uretici: 'asc' }, { model: 'asc' }],
      select: {
        id: true, turId: true, uretici: true, model: true,
        onayliSurum: true, asgariSurum: true, hedefSurum: true,
        bilinenKotuSurumler: true, advisoryReferansi: true,
        aciklama: true, aktif: true, guncellendi: true,
      },
    }),
    db.varlikTuru.findMany({
      select: { id: true, kod: true, ad: true, aktif: true },
      orderBy: [{ sinif: 'asc' }, { ad: 'asc' }],
    }),
    /* Tabana bağlı uyum satırlarının durum dağılımı: "bu taban kaç cihazı
       uyumsuz gösteriyor" sorusu tek `groupBy` ile cevaplanır. Taban başına
       saymak N+1 olurdu. */
    db.firmwareUyumu.groupBy({
      by: ['temelId', 'durum'],
      _count: { _all: true },
    }),
    /* OT-25 · Duyuru kütüğünün özeti. Duyuru içe aktarımı da bu ekrandan
       yürür: ikisi de "hangi sürüm sorunlu" sorusunun kaynağıdır. */
    db.advisory.count(),
    db.advisory.findFirst({
      orderBy: { olusturuldu: 'desc' },
      select: { referans: true, baslik: true, olusturuldu: true },
    }),
    db.advisoryUrunu.count(),
    db.zafiyetKorelasyonu.groupBy({ by: ['sonuc'], _count: { _all: true } }),
  ]);

  const turAdi = new Map(turler.map((t) => [t.id, `${t.kod} · ${t.ad}`]));

  /* Taban → { durum: adet }. `temelId` null olan satırlar TABANSIZ
     cihazlardır ve hiçbir tabanın sayacına girmez. */
  const sayaclar = new Map<string, Record<string, number>>();
  for (const g of uyumlar) {
    if (g.temelId === null) continue;
    const mevcut = sayaclar.get(g.temelId) ?? {};
    mevcut[g.durum] = (mevcut[g.durum] ?? 0) + g._count._all;
    sayaclar.set(g.temelId, mevcut);
  }
  /* Hiçbir tabana bağlanamayan cihaz sayısı ekranın en dürüst rakamıdır:
     taban yoksa firmware kararı verilemez ve bu bir ölçüm borcudur. */
  const tabansiz = uyumlar
    .filter((g) => g.temelId === null)
    .reduce((t, g) => t + g._count._all, 0);

  const satirlar: TabanSatiri[] = temeller.map((t) => {
    const s = sayaclar.get(t.id) ?? {};
    return {
      id: t.id,
      turId: t.turId,
      turAdi: t.turId === null ? null : turAdi.get(t.turId) ?? null,
      uretici: t.uretici, model: t.model,
      onayliSurum: t.onayliSurum, asgariSurum: t.asgariSurum, hedefSurum: t.hedefSurum,
      bilenenKotu: t.bilinenKotuSurumler,
      advisoryReferansi: t.advisoryReferansi,
      aciklama: t.aciklama, aktif: t.aktif,
      guncellendi: t.guncellendi.toISOString(),
      uyumlu: s.uyumlu ?? 0,
      eski: s.eski ?? 0,
      bilinenKotu: s.bilinen_kotu ?? 0,
      kararVerilemedi: s.karar_verilemedi ?? 0,
    };
  });

  const korelasyonSayaci = Object.fromEntries(
    korelasyon.map((g) => [g.sonuc, g._count._all]),
  ) as Record<string, number | undefined>;

  return (
    <TabanlarIstemci
      tabanlar={satirlar}
      turler={turler.filter((t) => t.aktif).map((t) => ({ id: t.id, ad: `${t.kod} · ${t.ad}` }))}
      tabansizCihaz={tabansiz}
      yazabilir={yazabilir}
      duyuru={{
        toplam: duyuruSayisi,
        urun: urunSayisi,
        sonReferans: sonDuyuru?.referans ?? null,
        sonBaslik: sonDuyuru?.baslik ?? null,
        sonZaman: sonDuyuru?.olusturuldu.toISOString() ?? null,
        etkilenen: korelasyonSayaci.etkilenen ?? 0,
        kararVerilemedi: korelasyonSayaci.karar_verilemedi ?? 0,
      }}
    />
  );
}
