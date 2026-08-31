import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { db } from '@/lib/db';
import YedeklemeIstemci from './YedeklemeIstemci';
import type { Politika, Santral, TurKirilimi } from './mantik';

export const metadata: Metadata = { title: 'Yedekleme & kurtarma — Atlas' };

/* O14 · Yedekleme & DR hazırlığı — "kurtarabilir miyiz?" (03-screens O14).
   Yerleşim kabuğu (.atlas atlas-kabuk + Ray) (operasyonel)/layout.tsx'ten
   gelir; bu sayfa yalnız <main> ve seçim varsa <aside class="cekmece">
   render eder — UstCubuk ya da .icerik sarmalayıcısı YOK.

   Hiçbir metrik sabit yazılmaz: kapsama santral varlıklarının
   `yedekDurumu` alanından, kanıt tazeliği GeriYuklemeTesti'nden,
   kapsam dışı sistemler YedeklemePolitikasi.haricTutulan'dan hesaplanır. */

export default async function Sayfa() {
  const k = await girisZorunlu();

  const [tesisler, varliklar, politikalar] = await Promise.all([
    db.tesis.findMany({
      where: { durum: 'aktif' },
      select: { id: true, kod: true, ad: true, tip: { select: { kod: true } } },
      orderBy: { kod: 'asc' },
    }),
    db.varlik.findMany({
      where: { silindi: null, tesisId: { not: null } },
      select: {
        etiket: true, ad: true, tesisId: true, kritiklik: true, yedekDurumu: true,
        tur: { select: { ad: true } },
      },
      orderBy: { etiket: 'asc' },
    }),
    db.yedeklemePolitikasi.findMany({
      include: {
        kosular: {
          orderBy: { zaman: 'desc' },
          include: { geriYuklemeler: { orderBy: { zaman: 'desc' } } },
        },
      },
    }),
  ]);

  /* Politika ↔ santral bağı şemada yabancı anahtarla değil, politika ADINDA
     kurulmuş (`${tesis.ad} — kontrol sistemi yedeklemesi`). `kapsam` alanı
     ayırt edici değil — santrallerin çoğunda aynı metin. Bu yüzden ad
     önekiyle eşleştiriyoruz; ÖNCE UZUN ADLAR denenir ki "Kızıldere I JES"
     kendinden uzun adlı "Kızıldere II JES"in politikasını kapmasın. Eşleşen
     politika havuzdan düşer, iki santral aynı kaydı paylaşamaz. */
  const havuz = new Set(politikalar);
  const politikaHaritasi = new Map<string, (typeof politikalar)[number]>();
  for (const t of [...tesisler].sort((a, b) => b.ad.length - a.ad.length)) {
    for (const p of havuz) {
      if (p.ad.startsWith(t.ad)) { politikaHaritasi.set(t.id, p); havuz.delete(p); break; }
    }
  }

  const santraller: Santral[] = tesisler.map((t) => {
    const kendi = varliklar.filter((v) => v.tesisId === t.id);

    // Tür bazında kırılım — kapsama barının popover'ı ve çekmece bunu kullanır.
    const turler = new Map<string, TurKirilimi>();
    for (const v of kendi) {
      const ad = v.tur?.ad ?? 'Tür girilmemiş';
      const g = turler.get(ad) ?? { ad, yedekli: 0, bilinmeyen: 0, toplam: 0 };
      g.toplam += 1;
      if (v.yedekDurumu === 'var') g.yedekli += 1;
      else if (v.yedekDurumu === 'bilinmiyor') g.bilinmeyen += 1;
      turler.set(ad, g);
    }

    const ham = politikaHaritasi.get(t.id) ?? null;
    const politika: Politika | null = ham && {
      id: ham.id, ad: ham.ad, kapsam: ham.kapsam, siklik: ham.siklik,
      saklamaGun: ham.saklamaGun, hedef: ham.hedef,
      rpoSaat: ham.rpoSaat, rtoSaat: ham.rtoSaat, haricTutulan: ham.haricTutulan,
    };

    const kosular = ham?.kosular ?? [];
    const sonKosu = kosular[0] ?? null;
    // Testler koşulara bağlı; en yeni kanıt hangi koşuya asılıysa oradan gelir.
    const testler = kosular.flatMap((x) => x.geriYuklemeler)
      .sort((a, b) => b.zaman.getTime() - a.zaman.getTime());
    const sonTest = testler[0] ?? null;

    return {
      id: t.id, kod: t.kod, ad: t.ad, tip: t.tip?.kod ?? null,
      toplam: kendi.length,
      yedekli: kendi.filter((v) => v.yedekDurumu === 'var').length,
      yedeksiz: kendi.filter((v) => v.yedekDurumu === 'yok').length,
      bilinmeyen: kendi.filter((v) => v.yedekDurumu === 'bilinmiyor').length,
      kirilim: [...turler.values()].sort((a, b) =>
        (a.yedekli / a.toplam) - (b.yedekli / b.toplam) || a.ad.localeCompare(b.ad, 'tr')),
      politika,
      kosuOzeti: {
        basarili: kosular.filter((x) => x.durum === 'basarili').length,
        kismi: kosular.filter((x) => x.durum === 'kismi').length,
        basarisiz: kosular.filter((x) => x.durum === 'basarisiz').length,
      },
      sonKosu: sonKosu && {
        zaman: sonKosu.zaman.toISOString(), durum: sonKosu.durum,
        boyutMb: sonKosu.boyutMb, hata: sonKosu.hata,
      },
      sonTest: sonTest && {
        zaman: sonTest.zaman.toISOString(), sonuc: sonTest.sonuc,
        sureDk: sonTest.sureDk, not: sonTest.not,
      },
      // Yedeği olmayan ya da durumu bilinmeyen yüksek/kritik varlıklar:
      // "kapsam dışı sistem" iddiasının veriye dayanan karşılığı.
      acikVarliklar: kendi
        .filter((v) => v.yedekDurumu !== 'var'
          && (v.kritiklik === 'kritik' || v.kritiklik === 'yuksek'))
        .slice(0, 12)
        .map((v) => ({
          etiket: v.etiket, ad: v.ad, kritiklik: v.kritiklik, yedekDurumu: v.yedekDurumu,
        })),
      // Görev açma uyum/yazma ister ve tesis kapsamına tabidir (lib/erisim).
      planlanabilir: izinVar(k, 'uyum', 'yazma', { tesisId: t.id }),
    };
  });

  return <YedeklemeIstemci santraller={santraller} politikaSayisi={politikalar.length} />;
}
