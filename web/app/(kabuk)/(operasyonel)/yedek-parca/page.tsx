import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { modulYazabilir } from '@/app/kapsam';
import { db } from '@/lib/db';
import YedekParcaIstemci from './YedekParcaIstemci';

export const metadata: Metadata = { title: 'Yedek parça' };

/* ═══ OT-56 · Kritik yedek parça ══════════════════════════════════════

   ── KAPSAM ────────────────────────────────────────────────────────────
   Parça bir depoya bağlıdır; merkezî depodaki parçanın `tesisId`si
   NULL'dur ve kapsamı olmayan bir kayıttır. Kütük kullanıcının
   kapsamındaki depoları VE merkezî depoyu gösterir: merkezî depo
   herkesin ortak kaynağıdır ve onu gizlemek, kritik bir parçanın
   varlığını görünmez kılardı. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'envanter', 'okuma')) return <Yetkisiz rol="envanter okuma" />;

  const izinli = izinliTesisIdleri(k, 'envanter');
  const yazabilir = modulYazabilir(k, 'envanter', 'yazma');

  const [parcalar, tesisler, turler, tedarikciler] = await Promise.all([
    db.yedekParca.findMany({
      where: izinli === null
        ? {}
        : { OR: [{ tesisId: { in: izinli } }, { tesisId: null }] },
      include: {
        tesis: { select: { kod: true } },
        tur: { select: { ad: true } },
        tedarikci: { select: { ad: true } },
        varliklar: {
          include: { varlik: { select: { id: true, ad: true, kritiklik: true } } },
        },
      },
      orderBy: [{ aktif: 'desc' }, { kod: 'asc' }],
    }),
    db.tesis.findMany({
      where: izinli === null ? {} : { id: { in: izinli } },
      select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' },
    }),
    db.varlikTuru.findMany({
      where: { aktif: true }, select: { id: true, ad: true }, orderBy: { ad: 'asc' },
    }),
    db.tedarikci.findMany({ select: { id: true, ad: true }, orderBy: { ad: 'asc' } }),
  ]);

  return (
    <YedekParcaIstemci
      yazabilir={yazabilir}
      tesisler={tesisler}
      turler={turler}
      tedarikciler={tedarikciler}
      parcalar={parcalar.map((p) => ({
        id: p.id,
        kod: p.kod,
        ad: p.ad,
        ureticiParcaNo: p.ureticiParcaNo,
        turAd: p.tur?.ad ?? null,
        tesisKod: p.tesis?.kod ?? null,
        konum: p.konum,
        stokAdedi: p.stokAdedi,
        kritikEsik: p.kritikEsik,
        tedarikSuresiGun: p.tedarikSuresiGun,
        tedarikciAd: p.tedarikci?.ad ?? null,
        sonSayim: p.sonSayim?.toISOString() ?? null,
        aktif: p.aktif,
        bagliVarliklar: p.varliklar.map((x) => ({
          bagId: x.id, ad: x.varlik.ad, kritiklik: x.varlik.kritiklik,
        })),
      }))}
    />
  );
}
