import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/atlas/temel';
import { db } from '@/lib/db';
import { oneriOku, ETKI_ALANLARI } from '@/lib/motorlar/olayEtki';
import OlaylarIstemci from './OlaylarIstemci';
import type { EtkiAlani, OlayKaydi, OneriGorunumu } from './mantik';

export const metadata: Metadata = { title: 'Olaylar — Atlas' };

/* O · Olay → etki zinciri — "bu olay üretimi nasıl etkiledi, kim onayladı?"

   Sunucu yalnız veriyi toplar ve serileştirir; karar `mantik.ts`te,
   sunum istemcide. Zincir hesabı burada YAPILMAZ — motorun ürettiği ve
   `Olay.etkiOnerisiJson` alanında duran öneri okunur. Böylece ekran ile
   motor aynı zinciri iki farklı yerde iki farklı şekilde hesaplayamaz.

   Kapsam: olaylar kullanıcının envanter kapsamındaki santrallerle
   daraltılır (veri seviyesinde, ekranda değil). */

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'envanter', 'okuma')) return <Yetkisiz rol="envanter okuma" />;

  const izinli = izinliTesisIdleri(kullanici, 'envanter');
  const yazabilir = izinVar(kullanici, 'envanter', 'yazma');
  const dogrulayabilir = izinVar(kullanici, 'yonetim', 'onay');

  const olaylar = await db.olay.findMany({
    where: izinli === null ? {} : { tesisId: { in: izinli } },
    select: {
      id: true, kod: true, baslik: true, tip: true, siddet: true, durum: true,
      baslangic: true, cozum: true, ozet: true, tesisId: true,
      tespitKaynagi: true, etkiOnerisiJson: true,
      uretimEtkisi: true, emniyetEtkisi: true, regulasyonEtkisi: true, siberEtki: true,
      etkiDogrulamaZamani: true,
      kokNeden: true, sinirlama: true, kurtarma: true, ogrenilenler: true,
      bildirimGerekli: true, bildirimTarihi: true,
      tesis: { select: { kod: true, ad: true } },
      etkiDogrulayan: { select: { adSoyad: true } },
      riskler: { select: { risk: { select: { id: true, kod: true, baslik: true, durum: true } } } },
      bulgular: { select: { bulgu: { select: { id: true, baslik: true, onemDerecesi: true } } } },
      projeler: { select: { proje: { select: { id: true, kod: true, ad: true, durum: true } } } },
      degisiklikler: {
        select: { degisiklik: { select: { id: true, kod: true, baslik: true, durum: true } } },
      },
    },
    orderBy: { baslangic: 'desc' },
  });

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
    };
  });

  return (
    <OlaylarIstemci
      olaylar={kayitlar}
      yazabilir={yazabilir}
      dogrulayabilir={dogrulayabilir}
    />
  );
}
