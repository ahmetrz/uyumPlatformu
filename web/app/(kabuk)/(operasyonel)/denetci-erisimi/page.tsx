import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import { denetciOzeti, yasayanDurum, type YasayanDurum } from '@/lib/uyum/denetciErisimi';
import DenetciErisimiIstemci from './DenetciErisimiIstemci';
import { simdiOku } from './veri';

export const metadata: Metadata = { title: 'Dış denetçi erişimi' };

/* ═══ UY-57 · Dış denetçi erişimi ═════════════════════════════════════

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir.

   ── KAPI: yonetim ─────────────────────────────────────────────────────
   Dış denetçiye erişim açmak bir DENETİM işi değil, bir ERİŞİM YÖNETİMİ
   işidir: kimin hesabı olacağına denetim sorumlusu değil, yönetim karar
   verir. Bu yüzden ekran `yonetim/okuma`, davet `yonetim/yazma` ister —
   API anahtarlarıyla aynı kapı, aynı sebep.

   ── EKRAN KAPSAMSIZDIR ────────────────────────────────────────────────
   Erişimlerin kendisi santral kapsamı TAŞIR ama kütük kurum çapındadır:
   "hangi santrale kim bakıyor" sorusunu yalnız kendi santralini gören
   biri yanıtlayamaz. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'yonetim', 'okuma')) return <Yetkisiz rol="yönetim okuma" />;

  const yonetebilir = modulYazabilir(k, 'yonetim', 'yazma');
  const simdi = simdiOku();

  const [erisimler, adaylar, denetimler, tesisler] = await Promise.all([
    db.denetciErisimi.findMany({
      include: {
        kullanici: { select: { adSoyad: true, eposta: true } },
        davetEden: { select: { adSoyad: true } },
        denetim: { select: { ad: true } },
        kapsamlar: { include: { tesis: { select: { kod: true } } } },
      },
      orderBy: [{ durum: 'asc' }, { bitis: 'asc' }],
    }),
    db.kullanici.findMany({
      where: { aktif: true },
      select: { id: true, adSoyad: true, eposta: true },
      orderBy: { adSoyad: 'asc' },
    }),
    db.denetim.findMany({
      where: { silindi: null },
      select: { id: true, ad: true, kod: true },
      orderBy: { olusturuldu: 'desc' }, take: 50,
    }),
    db.tesis.findMany({ select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' } }),
  ]);

  const satirlar = erisimler.map((e) => {
    const durum: YasayanDurum = yasayanDurum({
      durum: e.durum,
      bitis: e.bitis.getTime(),
      simdi,
      kapsamSayisi: e.kapsamlar.length,
      sonErisim: e.sonErisim?.getTime() ?? null,
    });
    return {
      id: e.id,
      kisi: e.kullanici.adSoyad,
      eposta: e.kullanici.eposta,
      firma: e.firma,
      denetim: e.denetim?.ad ?? null,
      davetEden: e.davetEden.adSoyad,
      baslangic: e.baslangic.toISOString(),
      bitis: e.bitis.toISOString(),
      durum,
      kayitDurumu: e.durum,
      kapsam: e.kapsamlar.map((x) => x.tesis.kod),
      sonErisim: e.sonErisim?.toISOString() ?? null,
      iptalGerekcesi: e.iptalGerekcesi,
    };
  });

  return (
    <DenetciErisimiIstemci
      satirlar={satirlar}
      ozet={denetciOzeti(satirlar.map((s) => s.durum))}
      adaylar={adaylar}
      denetimler={denetimler}
      tesisler={tesisler}
      yonetebilir={yonetebilir}
      /* Süresi geçmiş ama hâlâ `aktif` yazan kayıt sayısı: zamanlayıcı
         değil, ekranın kendi ölçümü. Sıfırdan büyükse bir düğme çıkar. */
      isleneceklerSayisi={erisimler.filter(
        (e) => e.durum === 'aktif' && e.bitis.getTime() <= simdi,
      ).length}
    />
  );
}
