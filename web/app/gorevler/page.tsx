import { girisZorunlu, izinVar, type Modul } from '@/lib/erisim';
import { db } from '@/lib/db';
import UstCubuk from '@/components/UstCubuk';
import GorevlerIstemci from './GorevlerIstemci';

/* Onay talebi tipi → kararın dayandığı modül (eylem katmanındaki eşlemenin
   ekran kopyası; yonetim/onay her tipe yeter). */
const ONAY_TIP_MODUL: Record<string, Modul> = {
  bulgu_kapanis: 'uyum', risk_kabul: 'risk', istisna: 'uyum',
  proje_aday: 'proje', applicability_override: 'uyum', proje_kapanis: 'proje',
};

export default async function Gorevler() {
  const kullanici = await girisZorunlu();
  const [gorevler, onaylar, kullanicilar, tesisler] = await Promise.all([
    db.gorev.findMany({
      include: { sorumlu: true, tesis: true },
      orderBy: [{ sonTarih: { sort: 'asc', nulls: 'last' } }, { olusturuldu: 'desc' }],
    }),
    db.onayTalebi.findMany({
      include: { talepEden: true, onaylayan: true },
      orderBy: { olusturuldu: 'desc' },
    }),
    db.kullanici.findMany({
      where: { aktif: true }, select: { id: true, adSoyad: true },
      orderBy: { adSoyad: 'asc' },
    }),
    db.tesis.findMany({
      where: { durum: 'aktif' }, select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
  ]);

  const gorevVeri = gorevler.map((g) => ({
    id: g.id, baslik: g.baslik, tip: g.tip,
    kaynakTipi: g.kaynakTipi, kaynakId: g.kaynakId,
    sorumlu: g.sorumlu ? { id: g.sorumlu.id, ad: g.sorumlu.adSoyad } : null,
    tesisKod: g.tesis?.kod ?? null,
    tesisAd: g.tesis?.ad ?? null,
    sonTarih: g.sonTarih?.toISOString() ?? null,
    durum: g.durum, otomatik: g.otomatikUretildi,
    olusturuldu: g.olusturuldu.toISOString(),
    kapanis: g.kapanis?.toISOString() ?? null,
    // eylem katmanıyla aynı kural: sorumlusuz görev serbest; sorumlusu
    // atanmışsa sorumlu ya da uyum onay yetkisi.
    degistirebilir: izinVar(kullanici, 'uyum', 'yazma')
      && (!g.sorumluId || g.sorumluId === kullanici.id
        || izinVar(kullanici, 'uyum', 'onay', g.tesisId ? { tesisId: g.tesisId } : {})),
  }));

  const onayVeri = onaylar.map((o) => ({
    id: o.id, tip: o.tip, kaynakTipi: o.kaynakTipi, kaynakId: o.kaynakId,
    ozet: o.ozet, durum: o.durum, gerekce: o.gerekce,
    talepEden: o.talepEden?.adSoyad ?? null,
    onaylayan: o.onaylayan?.adSoyad ?? null,
    olusturuldu: o.olusturuldu.toISOString(),
    kapanis: o.kapanis?.toISOString() ?? null,
    // dört göz: kendi talebine karar verilemez; yetki yonetim/onay veya
    // talebin modülünde onay.
    karariVerebilir: o.talepEdenId !== kullanici.id
      && (izinVar(kullanici, 'yonetim', 'onay')
        || izinVar(kullanici, ONAY_TIP_MODUL[o.tip] ?? 'yonetim', 'onay')),
  }));

  return (
    <>
      <UstCubuk baslik="Görevler & onay" />
      <main className="icerik">
        <GorevlerIstemci
          aktifId={kullanici.id}
          gorevler={gorevVeri}
          onaylar={onayVeri}
          kullanicilar={kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad }))}
          tesisler={tesisler}
          gorevAcabilir={izinVar(kullanici, 'uyum', 'yazma')}
        />
      </main>
    </>
  );
}
