import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';
import { db } from '@/lib/db';
import { sureDurumu, zimmetOzeti } from '@/lib/varlik/zimmet';
import ZimmetlerimIstemci from './ZimmetlerimIstemci';
import { simdiOku } from './veri';

export const metadata: Metadata = { title: 'Bana atanan varlıklar' };

/* ═══ OT-09b · Bana atanan varlıklar ══════════════════════════════════

   ── EKRAN KİŞİYE AİTTİR, KAPSAMA DEĞİL ────────────────────────────────
   Burada `kapsamKosulu` YOKTUR ve bu bilinçlidir: liste oturumdaki
   kullanıcının KENDİ zimmetleridir ve sorgu `atananId` ile daraltılır.
   Bir başkasının zimmetlerini görmenin yolu yoktur — kapsam yerine
   kimliğin kendisi filtredir.

   ── KAPI: envanter/okuma DEĞİL, YALNIZ GİRİŞ ──────────────────────────
   Kendi zimmetini görmek için envanter yetkisi aranmaz. Sahipliği
   devralması istenen saha mühendisinin envanteri okuma yetkisi
   olmayabilir; olmasa da kendi imzasını atabilmelidir. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  const simdi = simdiOku();

  const kayitlar = await db.varlikAtamaTalebi.findMany({
    where: { atananId: k.id },
    include: {
      varlik: {
        select: {
          id: true, etiket: true, ad: true,
          tur: { select: { ad: true } },
          tesis: { select: { kod: true } },
          sahip: { select: { adSoyad: true } },
        },
      },
      atayan: { select: { adSoyad: true } },
      oncekiSahip: { select: { adSoyad: true } },
    },
    orderBy: [{ durum: 'asc' }, { sonTarih: 'asc' }],
    take: 200,
  });

  const satirlar = kayitlar.map((t) => ({
    id: t.id,
    durum: t.durum,
    varlikEtiket: t.varlik.etiket,
    varlikAd: t.varlik.ad,
    tur: t.varlik.tur.ad,
    tesisKod: t.varlik.tesis?.kod ?? null,
    mevcutSahip: t.varlik.sahip?.adSoyad ?? null,
    atayan: t.atayan.adSoyad,
    oncekiSahip: t.oncekiSahip?.adSoyad ?? null,
    not: t.not,
    olusturuldu: t.olusturuldu.toISOString(),
    sonTarih: t.sonTarih.toISOString(),
    cevapZamani: t.cevapZamani?.toISOString() ?? null,
    cevapNotu: t.cevapNotu,
    sure: sureDurumu({ sonTarih: t.sonTarih.getTime(), simdi }),
  }));

  return (
    <ZimmetlerimIstemci
      satirlar={satirlar}
      ozet={zimmetOzeti(
        kayitlar.map((t) => ({ durum: t.durum, sonTarih: t.sonTarih.getTime() })),
        simdi,
      )}
    />
  );
}
