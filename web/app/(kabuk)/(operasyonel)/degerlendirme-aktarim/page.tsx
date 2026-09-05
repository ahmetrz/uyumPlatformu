import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { kapsamKosulu, modulOkuyabilir, modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import DegerlendirmeAktarimIstemci from './DegerlendirmeAktarimIstemci';
import type { AktarimSatiri } from './mantik';
import type { AktarimDurumu } from '@/lib/uyum/degerlendirmeAktarimi';

export const metadata: Metadata = { title: 'Değerlendirme aktarımı' };

/* ═══ UY-43 · Değerlendirme içe aktarımı ══════════════════════════════

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   ── /ice-aktarim'DAN NEDEN AYRI ───────────────────────────────────────
   O ekran regülasyonun MADDE metnini aktarır ve BİLEREK kapsamsızdır:
   madde kataloğu bütün santraller için ortaktır. Bu ekran kurumun o
   maddelere verdiği CEVABI aktarır ve cevap santrale özeldir — bu yüzden
   santral kapsamına tabidir. İkisini aynı ekrana koymak, kapsamsız bir
   yüzeyle kapsamlı bir yüzeyi aynı kapının arkasına almak olurdu.

   ── KURU KOŞU BİR SEÇENEK DEĞİL, BİR ADIMDIR ──────────────────────────
   Ekran önce hesaplar, sonra uygular; uygulama kaydı kendi kuru koşusuna
   KÖKENLE bağlıdır. Tek hamlede yüzlerce denetim kararı değiştirebilecek
   bir işlem, sonucu görülmeden yapılamaz.

   ── KAPSAM ────────────────────────────────────────────────────────────
   Kütük yalnız kullanıcının kapsamındaki santrallerin aktarımlarını
   gösterir; kapsam dışı kayıt SAYILMAZ ve gösterilmez. Sunucu eylemi
   kapıyı ayrıca uygular — ekranın filtrelemesi bir kolaylıktır, kapı
   değildir. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!modulOkuyabilir(k, 'uyum')) return <Yetkisiz rol="uyum okuma" />;

  const izinli = izinliTesisIdleri(k, 'uyum');
  /* Kuru koşu `uyum/yazma`, uygulama `uyum/onay` ister. İki ayrı yetki,
     iki ayrı düğme — sunucu da aynı ayrımı uygular. */
  const kosabilir = modulYazabilir(k, 'uyum', 'yazma');
  const uygulayabilir = modulYazabilir(k, 'uyum', 'onay');

  const [kayitlar, regulasyonlar, tesisler] = await Promise.all([
    db.degerlendirmeAktarimi.findMany({
      where: kapsamKosulu(izinli),
      include: {
        regulasyon: { select: { kod: true } },
        tesis: { select: { kod: true } },
        surec: { select: { kod: true } },
        yukleyen: { select: { adSoyad: true } },
        _count: { select: { uygulamalar: true } },
      },
      orderBy: { olusturuldu: 'desc' },
      take: 50,
    }),
    db.regulasyon.findMany({
      where: { aktif: true }, select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
    db.tesis.findMany({
      where: izinli === null ? {} : { id: { in: izinli } },
      select: { id: true, kod: true, ad: true },
      orderBy: { kod: 'asc' },
    }),
  ]);

  const satirlar: AktarimSatiri[] = kayitlar.map((a) => ({
    id: a.id,
    durum: a.durum as AktarimDurumu,
    kaynakAdi: a.kaynakAdi,
    regulasyonKod: a.regulasyon.kod,
    tesisKod: a.tesis.kod,
    surecKod: a.surec?.kod ?? null,
    okunan: a.okunan,
    eslesen: a.eslesen,
    elenen: a.elenen,
    degisen: a.degisen,
    kuruKosuId: a.kuruKosuId,
    uygulandiMi: a._count.uygulamalar > 0,
    yukleyen: a.yukleyen?.adSoyad ?? null,
    olusturuldu: a.olusturuldu.toISOString(),
    uygulandi: a.uygulandi?.toISOString() ?? null,
  }));

  return (
    <DegerlendirmeAktarimIstemci
      satirlar={satirlar}
      regulasyonlar={regulasyonlar}
      tesisler={tesisler}
      kosabilir={kosabilir}
      uygulayabilir={uygulayabilir}
    />
  );
}
