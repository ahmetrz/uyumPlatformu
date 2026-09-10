import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { db } from '@/lib/db';
import { Yetkisiz } from '@/components/kabuk/temel';
import RadarIstemci from './RadarIstemci';
import { kaynakSatirlari, type AdayKaydi, type KaynakKaydi } from './mantik';

export const metadata: Metadata = { title: 'Mevzuat radarı' };

/* MEVZUAT RADARI (R1) — "güncel kalır" sözünün karşılığı.

   BİRİNCİL İŞ: "mevzuatta bir şey değişti mi, değiştiyse ne yapacağım".
   İKİNCİ İŞ, aynı ağırlıkta: "nereye BAKAMADIM". İkincisi gizlenirse
   ekran "bekleyen değişiklik yok" derken aslında hiçbir yere bakmamış
   olabilir.

   ── KAPSAM: KURUMSAL, KAPSAMSIZ SORULUR ───────────────────────────────
   Bir tebliğ değişikliği tek bir tesisin değil KURUMUN meselesidir; kapı
   `izinVar(k, 'uyum', 'okuma')` ile KAPSAMSIZ sorulur ve `kapsamUyar`
   gereği tesise kısıtlı rol geçmez. Eylem katmanı aynı kuralı taşır
   (`lib/eylemler2/mevzuatRadari.ts`): ekranda gösterip eylemde reddetmek
   ya da tersi, #48'in dışa aktarım bulgusunun bu yüzeydeki hâli olurdu.

   ── İKİ AYRI YETKİ ────────────────────────────────────────────────────
   Aday kararı `uyum/onay`, taramayı açıp kapatmak `yonetim/onay` ister.
   Ayrım bilinçli: "bu değişiklik bizi ilgilendiriyor mu" uyum sorusu,
   "bu kaynağa istek gönderelim mi" kurulum sorusudur. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma (kurum geneli)" />;

  const [kaynakKayitlari, adayKayitlari] = await Promise.all([
    db.mevzuatKaynagi.findMany({
      select: {
        id: true, kod: true, ad: true, yayinKanali: true, merci: true,
        paketKodu: true, etkin: true, durum: true, durumNotu: true, sonTarama: true,
        /* SON tarama — üç değerli sonucu ekrana taşıyan tek alan. */
        taramalar: {
          select: { farkVar: true, sebep: true },
          orderBy: { zaman: 'desc' }, take: 1,
        },
        _count: { select: { adaylar: { where: { durum: 'yeni' } } } },
      },
      orderBy: { kod: 'asc' },
    }),
    db.mevzuatDegisiklikAdayi.findMany({
      select: {
        id: true, url: true, baslik: true, yayinTarihi: true, ozet: true,
        bulundu: true, durum: true, gerekce: true,
        kaynak: { select: { kod: true, ad: true, merci: true } },
      },
      orderBy: [{ bulundu: 'desc' }],
      take: 200,
    }),
  ]);

  const kaynaklar: KaynakKaydi[] = kaynakKayitlari.map((s) => ({
    id: s.id, kod: s.kod, ad: s.ad, yayinKanali: s.yayinKanali, merci: s.merci,
    paketKodu: s.paketKodu, etkin: s.etkin, durum: s.durum, durumNotu: s.durumNotu,
    sonTarama: s.sonTarama,
    /* Tarama kaydı YOKSA `farkVar` null'dur ve bu "fark yok" DEĞİLDİR —
       ekran mantığı ikisini `hicTaranmadi` ile ayırır. */
    sonTaramaFarkVar: s.taramalar[0]?.farkVar ?? null,
    sonTaramaSebep: s.taramalar[0]?.sebep ?? null,
    bekleyenAday: s._count.adaylar,
  }));

  const adaylar: AdayKaydi[] = adayKayitlari.map((a) => ({
    id: a.id, kaynakKod: a.kaynak.kod, kaynakAd: a.kaynak.ad, merci: a.kaynak.merci,
    url: a.url, baslik: a.baslik, yayinTarihi: a.yayinTarihi, ozet: a.ozet,
    bulundu: a.bulundu, durum: a.durum, gerekce: a.gerekce,
  }));

  return (
    <RadarIstemci
      adaylar={adaylar}
      kaynaklar={kaynakSatirlari(kaynaklar)}
      karar={izinVar(k, 'uyum', 'onay')}
      yonetim={izinVar(k, 'yonetim', 'onay')}
    />
  );
}
