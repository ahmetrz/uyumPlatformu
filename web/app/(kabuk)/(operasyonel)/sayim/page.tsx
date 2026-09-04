import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { kapsamKosulu, modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import SayimIstemci from './SayimIstemci';

export const metadata: Metadata = { title: 'Envanter sayımı' };

/* ═══ OT-55 · Fiziksel envanter sayımı ════════════════════════════════

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir.

   ── KAPSAM ────────────────────────────────────────────────────────────
   Sayım bir santralin işidir ve kütük yalnız kullanıcının kapsamındaki
   santrallerin sayımlarını gösterir. Sunucu eylemi kapıyı AYRICA
   uygular: ekranın filtrelemesi bir kolaylıktır, kapı değildir. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'envanter', 'okuma')) return <Yetkisiz rol="envanter okuma" />;

  const izinli = izinliTesisIdleri(k, 'envanter');
  const yazabilir = modulYazabilir(k, 'envanter', 'yazma');

  const [sayimlar, tesisler, turler, bolgeler] = await Promise.all([
    db.envanterSayimi.findMany({
      where: kapsamKosulu(izinli),
      include: {
        tesis: { select: { kod: true } },
        tur: { select: { ad: true } },
        bolge: { select: { kod: true } },
        acan: { select: { adSoyad: true } },
        satirlar: { select: { sonuc: true } },
      },
      orderBy: { olusturuldu: 'desc' },
      take: 50,
    }),
    db.tesis.findMany({
      where: izinli === null ? {} : { id: { in: izinli } },
      select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' },
    }),
    db.varlikTuru.findMany({
      where: { aktif: true }, select: { id: true, ad: true }, orderBy: { ad: 'asc' },
    }),
    db.agBolgesi.findMany({ select: { id: true, kod: true }, orderBy: { kod: 'asc' } }),
  ]);

  return (
    <SayimIstemci
      yazabilir={yazabilir}
      tesisler={tesisler}
      turler={turler}
      bolgeler={bolgeler}
      sayimlar={sayimlar.map((s) => ({
        id: s.id,
        kod: s.kod,
        ad: s.ad,
        tesisKod: s.tesis.kod,
        turAd: s.tur?.ad ?? null,
        bolgeKod: s.bolge?.kod ?? null,
        durum: s.durum,
        kapsamSayisi: s.kapsamSayisi,
        acan: s.acan.adSoyad,
        baslangic: s.baslangic.toISOString(),
        bitis: s.bitis?.toISOString() ?? null,
        gerekce: s.gerekce,
        sonuclar: s.satirlar.map((x) => x.sonuc),
      }))}
    />
  );
}
