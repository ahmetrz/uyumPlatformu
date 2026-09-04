import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import { egitimDurumu, egitimKapsamasi, type EgitimDurumu } from '@/lib/uyum/egitim';
import EgitimlerIstemci from './EgitimlerIstemci';
import { simdiOku } from './veri';

export const metadata: Metadata = { title: 'Eğitim kütüğü' };

/* ═══ UY-66 · Eğitim ve farkındalık ═══════════════════════════════════

   ── EKRAN KAPSAMSIZDIR ────────────────────────────────────────────────
   Eğitim kişiye bağlıdır, santrale değil: bir kişi birden çok santralde
   çalışabilir ve eğitimi hepsinde geçerlidir. Bu yüzden `kapsamKosulu`
   KULLANILMAZ; kapsam filtresi olmayan her ekran gibi gerekçesi burada.

   ── ZORUNLU EĞİTİMİN PAYDASI ──────────────────────────────────────────
   Kapsam = AKTİF kullanıcılar. Pasif hesabı paydaya koymak, ayrılmış
   personel yüzünden oranı sonsuza kadar düşük gösterirdi. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma" />;

  const yazabilir = modulYazabilir(k, 'uyum', 'yazma');
  const yonetebilir = modulYazabilir(k, 'uyum', 'onay');
  const simdi = simdiOku();

  const [egitimler, kisiler, maddeler] = await Promise.all([
    db.egitim.findMany({
      include: {
        kayitlar: {
          include: { kullanici: { select: { id: true, adSoyad: true, aktif: true } } },
          orderBy: { tamamlanma: 'desc' },
        },
        maddeler: { include: { madde: { select: { kod: true, baslik: true } } } },
      },
      orderBy: [{ aktif: 'desc' }, { kod: 'asc' }],
    }),
    db.kullanici.findMany({
      where: { aktif: true }, select: { id: true, adSoyad: true },
      orderBy: { adSoyad: 'asc' },
    }),
    db.madde.findMany({
      select: { id: true, kod: true, baslik: true },
      orderBy: { kod: 'asc' }, take: 500,
    }),
  ]);

  const satirlar = egitimler.map((e) => {
    /* Kişi başına EN YENİ kayıt esas alınır: aynı eğitimi ikinci kez
       alan kişinin durumu tazelenmelidir. */
    const enYeni = new Map<string, { bitis: number | null }>();
    for (const kayit of e.kayitlar) {
      if (!kayit.kullanici.aktif) continue;
      if (enYeni.has(kayit.kullaniciId)) continue; // liste zaten yeniden eskiye
      enYeni.set(kayit.kullaniciId, {
        bitis: kayit.gecerlilikBitis?.getTime() ?? null,
      });
    }

    /* Zorunlu eğitimin paydası bütün aktif kullanıcılar; isteğe bağlı
       eğitimin paydası yalnız kaydı olanlardır — kimsenin almadığı bir
       seçmeli eğitimi "%0" göstermek yanıltıcı olurdu. */
    const kapsamKisiler = e.zorunlu
      ? kisiler.map((x) => x.id)
      : [...enYeni.keys()];

    const durumlar: EgitimDurumu[] = kapsamKisiler.map((id) => {
      const kayit = enYeni.get(id);
      return egitimDurumu({
        gecerlilikBitis: kayit?.bitis ?? null,
        kayitVar: kayit !== undefined,
        simdi,
      });
    });

    return {
      id: e.id,
      kod: e.kod,
      ad: e.ad,
      gecerlilikAy: e.gecerlilikAy,
      zorunlu: e.zorunlu,
      aciklama: e.aciklama,
      aktif: e.aktif,
      kapsama: egitimKapsamasi({ durumlar }),
      maddeler: e.maddeler.map((m) => ({
        bagId: m.id, kod: m.madde.kod, baslik: m.madde.baslik,
      })),
      kayitSayisi: e.kayitlar.length,
    };
  });

  return (
    <EgitimlerIstemci
      satirlar={satirlar}
      kisiler={kisiler}
      maddeler={maddeler}
      yazabilir={yazabilir}
      yonetebilir={yonetebilir}
    />
  );
}
