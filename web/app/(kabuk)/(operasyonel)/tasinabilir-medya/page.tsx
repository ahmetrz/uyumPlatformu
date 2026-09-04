import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import { medyaHali } from '@/lib/varlik/tasinabilirMedya';
import TasinabilirMedyaIstemci from './TasinabilirMedyaIstemci';
import { simdiOku } from './veri';

export const metadata: Metadata = { title: 'Taşınabilir medya' };

/* ═══ OT-57 · Taşınabilir medya ═══════════════════════════════════════

   ── ÜRÜN MEDYAYI ENGELLEMEZ ───────────────────────────────────────────
   Bu ekran bir KÜTÜKTÜR. Engelleme uç nokta koruma ürününün işidir;
   ekran onun yaptığını yapıyormuş gibi göstermez.

   ── KAPSAM ────────────────────────────────────────────────────────────
   Santrale bağlı medya o santralin kapsamına tabidir; santrali olmayan
   medya (havuz) herkese görünür — kayıtsız dolaşan bir belleğin
   görünmez olması, kaydın kendisini anlamsız kılardı. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'envanter', 'okuma')) return <Yetkisiz rol="envanter okuma" />;

  const izinli = izinliTesisIdleri(k, 'envanter');
  const yazabilir = modulYazabilir(k, 'envanter', 'yazma');
  const simdi = simdiOku();

  const [medyalar, tesisler, kisiler, varliklar] = await Promise.all([
    db.tasinabilirMedya.findMany({
      where: izinli === null
        ? {}
        : { OR: [{ tesisId: { in: izinli } }, { tesisId: null }] },
      include: {
        tesis: { select: { kod: true } },
        sahibi: { select: { adSoyad: true } },
        kullanimlar: {
          include: { varlik: { select: { ad: true, kritiklik: true } } },
          orderBy: { baslangic: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ durum: 'asc' }, { kod: 'asc' }],
    }),
    db.tesis.findMany({
      where: izinli === null ? {} : { id: { in: izinli } },
      select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' },
    }),
    db.kullanici.findMany({
      where: { aktif: true }, select: { id: true, adSoyad: true },
      orderBy: { adSoyad: 'asc' },
    }),
    db.varlik.findMany({
      where: {
        silindi: null,
        ...(izinli === null ? {} : { tesisId: { in: izinli } }),
      },
      select: { id: true, ad: true, kritiklik: true },
      orderBy: { ad: 'asc' },
      take: 500,
    }),
  ]);

  const onaysiz = await db.medyaKullanimi.count({
    where: {
      onaylayanId: null,
      ...(izinli === null ? {} : { varlik: { tesisId: { in: izinli } } }),
    },
  });

  return (
    <TasinabilirMedyaIstemci
      yazabilir={yazabilir}
      tesisler={tesisler}
      kisiler={kisiler}
      varliklar={varliklar}
      onaysizKullanim={onaysiz}
      medyalar={medyalar.map((m) => ({
        id: m.id,
        kod: m.kod,
        ad: m.ad,
        tip: m.tip,
        seriNo: m.seriNo,
        tesisKod: m.tesis?.kod ?? null,
        sahibi: m.sahibi?.adSoyad ?? null,
        durum: m.durum,
        sifreli: m.sifreli,
        sonTarama: m.sonTarama?.toISOString() ?? null,
        hal: medyaHali({
          durum: m.durum,
          sonTarama: m.sonTarama?.getTime() ?? null,
          sifreli: m.sifreli,
          simdi,
        }),
        sonKullanimlar: m.kullanimlar.map((x) => ({
          varlik: x.varlik.ad,
          kritiklik: x.varlik.kritiklik,
          baslangic: x.baslangic.toISOString(),
          onayli: x.onaylayanId !== null,
        })),
      }))}
    />
  );
}
