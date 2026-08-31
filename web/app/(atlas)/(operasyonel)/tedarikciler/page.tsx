import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { db } from '@/lib/db';
import TedarikcilerIstemci from './TedarikcilerIstemci';
import { UFUK, type Bag, type SantralBagi, type SertifikaOzeti, type T } from './ortak';

export const metadata: Metadata = { title: 'Tedarikçiler — Atlas' };

/* O16 · Tedarikçiler / üçüncü taraf — "hangi tedarikçi bizi açıkta bırakıyor?"
   (03-screens O16). Sunucu yalnız veriyi toplar ve gün sayılarına indirger;
   sunum ve etkileşim istemcide. Metrikler SABİT DEĞİL — üçü de aşağıdaki
   sorgudan hesaplanır.

   Üç bağ zinciri gerçek veriden gelir:
   · santral  = Varlik.tedarikciId → Varlik.tesisId
   · sertifika = Sertifika.varlikId → Varlik.tedarikciId
   · risk      = RiskVarlik → Varlik.tedarikciId (doğrudan), yoksa
                 Risk.sistemId ∈ tedarikçinin varlıklarının sistemleri.
   İkinci yol daha zayıftır; bu yüzden bağın DAYANAĞI çekmecede yazılır. */

const GUN = 86_400_000;

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  // Eylem katmanıyla birebir aynı kapı: tedarikciKaydet → envanter/yazma.
  const yazabilir = izinVar(kullanici, 'envanter', 'yazma');

  const [tedarikciler, sertifikalar, riskler] = await Promise.all([
    db.tedarikci.findMany({
      where: { silindi: null },
      include: {
        sozlesmeler: { where: { silindi: null }, orderBy: { bitis: 'asc' } },
        varliklar: {
          where: { silindi: null },
          select: {
            id: true, etiket: true, kritiklik: true, sistemId: true,
            tesis: { select: { id: true, kod: true, ad: true } },
          },
        },
      },
      orderBy: { ad: 'asc' },
    }),
    // Sertifikanın durum alanı yenilemeden sonra bayatlayabilir; tek doğru
    // kaynak BİTİŞ TARİHİdir, gün sayısı ondan hesaplanır.
    db.sertifika.findMany({
      select: {
        id: true, ad: true, veren: true, bitis: true,
        varlik: { select: { id: true, etiket: true, tedarikciId: true } },
      },
      orderBy: { bitis: 'asc' },
    }),
    db.risk.findMany({
      where: { silindi: null, durum: { in: ['acik', 'islemde'] } },
      select: {
        id: true, kod: true, baslik: true, sistemId: true,
        sistem: { select: { kod: true } },
        tesis: { select: { kod: true } },
        varliklar: { select: { varlikId: true } },
        kontroller: { select: { madde: { select: { id: true, kod: true, baslik: true } } } },
      },
      orderBy: [{ artikRisk: 'desc' }, { kod: 'asc' }],
    }),
  ]);

  const simdi = new Date();
  const kalan = (d: Date | null) =>
    (d === null ? null : Math.ceil((d.getTime() - simdi.getTime()) / GUN));

  const veri: T[] = tedarikciler.map((t) => {
    /* Santraller varlıklardan türetilir: aynı tesise düşen varlıklar toplanır. */
    const tesisHarita = new Map<string, SantralBagi>();
    for (const v of t.varliklar) {
      if (!v.tesis) continue;
      const mevcut = tesisHarita.get(v.tesis.id);
      if (mevcut) mevcut.varlikSayisi += 1;
      else tesisHarita.set(v.tesis.id, {
        id: v.tesis.id, kod: v.tesis.kod, ad: v.tesis.ad, varlikSayisi: 1,
      });
    }

    const varlikIdleri = new Set(t.varliklar.map((v) => v.id));
    const sistemIdleri = new Set(
      t.varliklar.map((v) => v.sistemId).filter((s): s is string => s !== null),
    );

    const tedarikciSertifikalari: SertifikaOzeti[] = sertifikalar
      .filter((s) => s.varlik?.tedarikciId === t.id)
      .map((s) => ({
        id: s.id, ad: s.ad, veren: s.veren,
        bitis: s.bitis.toISOString(),
        kalanGun: kalan(s.bitis) as number,
        varlikId: s.varlik?.id ?? null,
        varlikEtiketi: s.varlik?.etiket ?? null,
      }));

    /* Risk bağı: önce doğrudan varlık bağı, yoksa sistem ortaklığı.
       Dayanak `alt` içinde yazılır — zayıf bağ sessizce güçlü görünmesin. */
    const bagliRiskler = riskler
      .map((r) => {
        const dogrudan = r.varliklar.some((rv) => varlikIdleri.has(rv.varlikId));
        const sistemden = !dogrudan && r.sistemId !== null && sistemIdleri.has(r.sistemId);
        if (!dogrudan && !sistemden) return null;
        return { risk: r, dayanak: dogrudan ? 'varlık bağı' : 'sistem ortaklığı' };
      })
      .filter((x): x is { risk: (typeof riskler)[number]; dayanak: string } => x !== null);

    const riskBaglari: Bag[] = bagliRiskler.map(({ risk, dayanak }) => ({
      id: risk.id,
      kod: risk.kod,
      alt: `${risk.sistem?.kod ?? risk.tesis?.kod ?? 'kapsam yok'} · ${dayanak}`,
      yol: '/riskler',
    }));

    const kontrolHarita = new Map<string, Bag>();
    for (const { risk } of bagliRiskler) {
      for (const k of risk.kontroller) {
        if (!kontrolHarita.has(k.madde.id)) {
          kontrolHarita.set(k.madde.id, {
            id: k.madde.id, kod: k.madde.kod, alt: k.madde.baslik, yol: '/uyum',
          });
        }
      }
    }

    return {
      id: t.id,
      ad: t.ad,
      tip: t.tip,
      kritiklik: t.kritiklik,
      uzaktanErisimVar: t.uzaktanErisimVar,
      uzaktanErisimYontemi: t.uzaktanErisimYontemi,
      oturumKaydiVar: t.oturumKaydiVar,
      santraller: [...tesisHarita.values()],
      varlikSayisi: t.varliklar.length,
      kritikVarlikSayisi: t.varliklar.filter((v) => v.kritiklik === 'kritik').length,
      sozlesmeler: t.sozlesmeler.map((s) => ({
        id: s.id, kod: s.kod, ad: s.ad,
        baslangic: s.baslangic?.toISOString() ?? null,
        bitis: s.bitis?.toISOString() ?? null,
        kalanGun: kalan(s.bitis),
        slaOzeti: s.slaOzeti,
        guvenlikSartlariVar: s.guvenlikSartlariVar,
      })),
      sertifikalar: tedarikciSertifikalari,
      riskler: riskBaglari,
      kontroller: [...kontrolHarita.values()],
    };
  });

  /* Metrik 2 tüm portföyü ölçer: tedarikçi varlıklarına kurulu sertifikalar
     içinde ufka en yakın olan. Tedarikçi başına değil, ekran başına. */
  const tedarikciSertifikaGunleri = sertifikalar
    .filter((s) => s.varlik?.tedarikciId != null)
    .map((s) => kalan(s.bitis) as number);
  const yakinSertifikaGunu = tedarikciSertifikaGunleri
    .filter((g) => g >= 0)
    .reduce<number | null>((a, g) => (a === null || g < a ? g : a), null);
  const dolmusSertifikaSayisi = tedarikciSertifikaGunleri.filter((g) => g < 0).length;

  return (
    <TedarikcilerIstemci
      tedarikciler={veri}
      yazabilir={yazabilir}
      sertifikaUfku={{ yakinGun: yakinSertifikaGunu, dolmus: dolmusSertifikaSayisi, ufuk: UFUK }}
    />
  );
}
