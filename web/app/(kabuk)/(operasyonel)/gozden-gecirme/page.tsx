import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import { ggOzeti, yasayanDurum } from '@/lib/uyum/gozdenGecirme';
import GozdenGecirmeIstemci from './GozdenGecirmeIstemci';
import { simdiOku } from './veri';

export const metadata: Metadata = { title: 'Yönetim gözden geçirme' };

/* ═══ UY-65 · Yönetim gözden geçirmesi ════════════════════════════════

   ── EKRAN KAPSAMSIZDIR ────────────────────────────────────────────────
   Yönetim gözden geçirmesi kurum çapında bir toplantıdır; santral
   kapsamı yoktur. Bu yüzden `kapsamKosulu` KULLANILMAZ ve bu bilinçli:
   kapsam filtresi olmayan her ekran gibi bu da gerekçesini yazar.

   ── KAPI: uyum/okuma ──────────────────────────────────────────────────
   Kayıt denetimde gösterilir; yazma ve tamamlama `uyum/onay` ister. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma" />;

  const yonetebilir = modulYazabilir(k, 'uyum', 'onay');
  const simdi = simdiOku();

  const [kayitlar, regulasyonlar, kisiler] = await Promise.all([
    db.yonetimGozdenGecirme.findMany({
      include: {
        regulasyon: { select: { kod: true } },
        yuruten: { select: { adSoyad: true } },
        kararlar: {
          include: { sorumlu: { select: { adSoyad: true } } },
          orderBy: { olusturuldu: 'asc' },
        },
      },
      orderBy: { tarih: 'desc' },
      take: 50,
    }),
    db.regulasyon.findMany({
      where: { aktif: true }, select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
    db.kullanici.findMany({
      where: { aktif: true }, select: { id: true, adSoyad: true },
      orderBy: { adSoyad: 'asc' },
    }),
  ]);

  const satirlar = kayitlar.map((g) => ({
    id: g.id,
    kod: g.kod,
    baslik: g.baslik,
    tarih: g.tarih.toISOString(),
    durum: g.durum,
    regulasyonKod: g.regulasyon?.kod ?? null,
    yuruten: g.yuruten.adSoyad,
    katilimcilar: g.katilimcilar,
    gundem: g.gundem,
    ozet: g.ozet,
    yasayan: yasayanDurum({
      durum: g.durum, tarih: g.tarih.getTime(), simdi,
      kararSayisi: g.kararlar.length,
    }),
    kararlar: g.kararlar.map((c) => ({
      id: c.id,
      karar: c.karar,
      sorumlu: c.sorumlu?.adSoyad ?? null,
      sonTarih: c.sonTarih?.toISOString() ?? null,
      durum: c.durum,
      gorevVar: c.gorevId !== null,
      gecikti: c.durum === 'acik' && c.sonTarih !== null
        && c.sonTarih.getTime() < simdi,
    })),
  }));

  const yapilanlar = kayitlar
    .filter((g) => g.durum === 'yapildi')
    .map((g) => g.tarih.getTime());

  return (
    <GozdenGecirmeIstemci
      satirlar={satirlar}
      regulasyonlar={regulasyonlar}
      kisiler={kisiler}
      yonetebilir={yonetebilir}
      ozet={ggOzeti({
        duruslar: satirlar.map((s) => s.yasayan),
        acikKarar: satirlar.reduce(
          (n, s) => n + s.kararlar.filter((c) => c.durum === 'acik').length, 0),
        gecikmisKarar: satirlar.reduce(
          (n, s) => n + s.kararlar.filter((c) => c.gecikti).length, 0),
        sonYapilan: yapilanlar.length === 0 ? null : Math.max(...yapilanlar),
        simdi,
      })}
    />
  );
}
