import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import { saklamaOzeti } from '@/lib/uyum/saklama';
import SaklamaIstemci from './SaklamaIstemci';

export const metadata: Metadata = { title: 'Saklama ve imha' };

/* ═══ UY-56 · Saklama · legal hold · kontrollü imha ═══════════════════

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir.

   ── KAPSAMSIZ BİR EKRAN ───────────────────────────────────────────────
   Saklama politikası kayıt AİLESİNE konur, santrale değil: "bulguları kaç
   yıl tutuyoruz" sorusunun santral bazlı bir cevabı yoktur. Bu yüzden
   ekran `kapsamKosulu` KULLANMAZ ve kullanmaması bilinçlidir — kapsam
   filtresi olmayan her ekran gibi bu da gerekçesini yazar.

   Legal hold bir santrale bağlanabilir; o zaman kaydın kendi `tesisId`
   alanı dolar ama ekran yine kurum çapındadır: hukuki muhafaza kurumun
   kararıdır. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma" />;

  /* Politika yazmak, hold koymak ve imha kararı vermek AYNI kapıdadır:
     `uyum/onay`. Saklama süresini kısaltmak, kayıt silmenin dolaylı
     yoludur ve yazma yetkisiyle yapılamaz. */
  const yonetebilir = modulYazabilir(k, 'uyum', 'onay');

  const [politikalar, holdlar, kararlar, tesisler] = await Promise.all([
    db.saklamaPolitikasi.findMany({
      include: { guncelleyen: { select: { adSoyad: true } } },
      orderBy: { varlikTipi: 'asc' },
    }),
    db.legalHold.findMany({
      include: {
        koyan: { select: { adSoyad: true } },
        tesis: { select: { kod: true } },
      },
      orderBy: [{ durum: 'asc' }, { konuldu: 'desc' }],
      take: 100,
    }),
    db.imhaKarari.findMany({
      include: {
        oneren: { select: { adSoyad: true } },
        onaylayan: { select: { adSoyad: true } },
      },
      orderBy: { olusturuldu: 'desc' },
      take: 100,
    }),
    db.tesis.findMany({ select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' } }),
  ]);

  const ozet = saklamaOzeti({
    politikalar: politikalar.map((p) => ({
      varlikTipi: p.varlikTipi, saklamaGun: p.saklamaGun, aktif: p.aktif,
    })),
    aktifHold: holdlar.filter((h) => h.durum === 'aktif').length,
    bekleyenImha: kararlar.filter((r) => r.durum === 'oneri' || r.durum === 'onaylandi').length,
  });

  return (
    <SaklamaIstemci
      ozet={ozet}
      yonetebilir={yonetebilir}
      tesisler={tesisler}
      politikalar={politikalar.map((p) => ({
        id: p.id,
        varlikTipi: p.varlikTipi,
        saklamaGun: p.saklamaGun,
        sureSonu: p.sureSonu,
        dayanak: p.dayanak,
        aktif: p.aktif,
        guncelleyen: p.guncelleyen?.adSoyad ?? null,
      }))}
      holdlar={holdlar.map((h) => ({
        id: h.id,
        ad: h.ad,
        varlikTipi: h.varlikTipi,
        varlikId: h.varlikId,
        tesisKod: h.tesis?.kod ?? null,
        gerekce: h.gerekce,
        durum: h.durum,
        koyan: h.koyan.adSoyad,
        konuldu: h.konuldu.toISOString(),
      }))}
      kararlar={kararlar.map((r) => ({
        id: r.id,
        varlikTipi: r.varlikTipi,
        kapsananSayi: r.kapsananSayi,
        silinenSayi: r.silinenSayi,
        durum: r.durum,
        gerekce: r.gerekce,
        oneren: r.oneren.adSoyad,
        onaylayan: r.onaylayan?.adSoyad ?? null,
        olusturuldu: r.olusturuldu.toISOString(),
        donemBaslangic: r.donemBaslangic?.toISOString() ?? null,
        donemBitis: r.donemBitis?.toISOString() ?? null,
      }))}
    />
  );
}
