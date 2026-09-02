import 'server-only';
import { db } from '@/lib/db';
import { izinVar, izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { tumTedarikciOturumOzetleri } from '@/lib/entegrasyon/tedarikciOturum';
import {
  UFUK,
  type Bag, type OturumSatiri, type SantralBagi, type SertifikaOzeti, type T,
} from './ortak';

/* O16 · Tedarikçiler — SUNUCU VERİSİ. Sayfadan ayrı bir modülde durur ki
   kapsam kuralları JSX olmadan, doğrudan test edilebilsin.

   ═══ KAPSAM SIZINTISI — NE OLDU, NEDEN BÖYLE DÜZELDİ ═══════════════════
   Bu ekran daha önce `girisZorunlu()` dışında hiçbir kapsam uygulamıyordu:
   `db.tedarikci.findMany` tedarikçilerin BÜTÜN varlıklarını (ve o
   varlıkların tesislerini), `db.risk.findMany` de bütün açık riskleri
   çekiyordu. Sonuç: yalnız A santraline yetkili bir kullanıcı, tedarikçi
   ekranı üzerinden B santralinin varlık sayısını, santral adını/kodunu ve
   risk kayıtlarını görüyordu. Üç metrik de aynı kapsamsız sorgudan
   türediği için sayılar da sızıyordu — satır gizlense bile metrik
   "başka bir yerde bir şey var" diyordu.

   Düzeltme TEK YERDE: her ilişki `izinliTesisIdleri(k, 'envanter')` ile
   daraltılır ve metrikler bu daraltılmış veriden hesaplanır.

   ── SANTRALİ BİLİNMEYEN KAYIT ──────────────────────────────────────────
   `lib/api/yetki.ts → tesisKapsamda` ile aynı kural: santrali `null` olan
   bir kayıt YALNIZ kapsamı sınırsız kullanıcıya görünür. Kapsamı
   daraltılmış birine "hangi santralde olduğu bilinmeyen" bir varlığı ya da
   erişim oturumunu göstermek, sınırı sessizce delmek olurdu.

   ── TEDARİKÇİ KAYDININ KENDİSİ ─────────────────────────────────────────
   `Tedarikci` şemada santrale bağlı DEĞİLDİR; grup seviyesinde bir
   sicildir (ad, sözleşme, uzaktan erişim beyanı). Bu yüzden sicil satırı
   gizlenmez; santrale bağlı olan HER ŞEY (varlık, santral bağı, sertifika,
   risk, kontrol, erişim oturumu) daraltılır. Kapsam dışı bir tedarikçi
   ekranda "bağlı varlık kaydı yok" olarak görünür — başka santralin
   verisiyle değil. */

const GUN = 86_400_000;

/** İnsan kararına sunulacak oturum satırı tavanı (çekmece bir günlük değildir). */
const OTURUM_TAVANI = 12;

export type EkranVerisi = {
  tedarikciler: T[];
  yazabilir: boolean;
  sertifikaUfku: { yakinGun: number | null; dolmus: number; ufuk: number };
};

export async function tedarikciEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  // Eylem katmanıyla birebir aynı kapı: tedarikciKaydet → envanter/yazma.
  const yazabilir = izinVar(k, 'envanter', 'yazma');
  const izinli = izinliTesisIdleri(k, 'envanter');

  /* İlişki süzgeci. `null` = tüm santraller; aksi hâlde yalnız izinli küme.
     Santrali null olan varlık kapsamı daraltılmış kullanıcıya GÖRÜNMEZ. */
  const varlikKapsami = izinli === null ? {} : { tesisId: { in: izinli } };

  const [tedarikciler, sertifikalar, riskler, oturumOzetleri] = await Promise.all([
    db.tedarikci.findMany({
      where: { silindi: null },
      include: {
        sozlesmeler: { where: { silindi: null }, orderBy: { bitis: 'asc' } },
        varliklar: {
          where: { silindi: null, ...varlikKapsami },
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
      where: { varlik: { silindi: null, ...varlikKapsami } },
      select: {
        id: true, ad: true, veren: true, bitis: true,
        varlik: { select: { id: true, etiket: true, tedarikciId: true } },
      },
      orderBy: { bitis: 'asc' },
    }),
    db.risk.findMany({
      where: { silindi: null, durum: { in: ['acik', 'islemde'] }, ...varlikKapsami },
      select: {
        id: true, kod: true, baslik: true, sistemId: true,
        sistem: { select: { kod: true } },
        tesis: { select: { kod: true } },
        varliklar: { select: { varlikId: true } },
        kontroller: { select: { madde: { select: { id: true, kod: true, baslik: true } } } },
      },
      orderBy: [{ artikRisk: 'desc' }, { kod: 'asc' }],
    }),
    /* ÖLÇÜM katmanı, tedarikçi başına DEĞİL toplu okunur. Döngü içinde
       çağrıldığında bu ekran on sekiz tedarikçi için 175 SQL ifadesi
       koşuyordu (ölçüldü) — oturum tablosu boşken bile. Kapsam
       `izinliTesisIdleri` sözleşmesiyle geçirilir: `null` = tümü,
       `[]` = hiçbiri. */
    tumTedarikciOturumOzetleri({ tesisIdler: izinli }),
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
      for (const k2 of risk.kontroller) {
        if (!kontrolHarita.has(k2.madde.id)) {
          kontrolHarita.set(k2.madde.id, {
            id: k2.madde.id, kod: k2.madde.kod, alt: k2.madde.baslik, yol: '/uyum',
          });
        }
      }
    }

    /* ÖLÇÜM katmanı yukarıda TOPLU okundu; burada yalnız bu tedarikçinin
       payı alınır. Toplu okuma silinmemiş HER tedarikçiyi kapsar, yani
       anahtar her zaman bulunur — bulunamazsa bu bir kusurdur ve sessizce
       "ölçüm yok" göstermek yanıltıcı olurdu. */
    const olcum = oturumOzetleri.get(t.id);
    if (!olcum) {
      throw new Error(`tedarikciEkranVerisi: ${t.id} için oturum özeti üretilmedi`);
    }
    const { ozet, rapor } = olcum;

    const tesisKodlari = new Map(
      [...tesisHarita.values()].map((x) => [x.id, x.kod] as const),
    );

    /* Önce kanıtlı ihlaller, sonra ölçülmemişler. İki liste BİRLEŞTİRİLİR
       ama sınıfları satırda ayrı ayrı okunur — sayılar asla toplanmaz. */
    const oturumlar: OturumSatiri[] = [...rapor.uyumsuz, ...rapor.bilinmeyen]
      .slice(0, OTURUM_TAVANI)
      .map((d) => ({
        id: d.oturum.id,
        tesisId: d.oturum.tesisId,
        tesisKod: d.oturum.tesisId ? tesisKodlari.get(d.oturum.tesisId) ?? null : null,
        hesapId: d.oturum.hesapId,
        baslangic: d.oturum.baslangic.toISOString(),
        bitis: d.oturum.bitis?.toISOString() ?? null,
        kaynakSistem: d.oturum.kaynakSistem,
        durum: d.oturum.durum,
        ihlaller: d.ihlaller,
        bilinmeyenler: d.bilinmeyenler,
        talepReferansi: d.oturum.talepReferansi,
        kayitReferansi: d.oturum.kayitReferansi,
        // Karar eylemi ile AYNI kapı: envanter/yazma + oturumun santral kapsamı.
        kararVerebilir: izinVar(k, 'envanter', 'yazma', { tesisId: d.oturum.tesisId }),
      }));

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
      oturum: {
        kapsam: ozet.kapsam,
        gerekce: ozet.gerekce,
        toplam: ozet.toplam,
        uyumsuzSayisi: ozet.uyumsuzSayisi,
        bilinmeyenSayisi: ozet.bilinmeyenSayisi,
        uyumluSayisi: ozet.uyumluSayisi,
        sayaclar: ozet.sayaclar,
        suren: ozet.suren,
        kaynakSistemler: ozet.kaynakSistemler,
        tutarsizliklar: ozet.tutarsizliklar,
        sonOturum: ozet.sonOturum && {
          baslangic: ozet.sonOturum.baslangic.toISOString(),
          bitis: ozet.sonOturum.bitis?.toISOString() ?? null,
          kaynakSistem: ozet.sonOturum.kaynakSistem,
          durum: ozet.sonOturum.durum,
        },
      },
      oturumlar,
    };
  });

  /* Metrik 2 tüm (KAPSAM İÇİ) portföyü ölçer: tedarikçi varlıklarına kurulu
     sertifikalar içinde ufka en yakın olan. Kaynağı yukarıdaki daraltılmış
     sorgudur — metrik kapsam dışına bakamaz. */
  const tedarikciSertifikaGunleri = sertifikalar
    .filter((s) => s.varlik?.tedarikciId != null)
    .map((s) => kalan(s.bitis) as number);
  const yakinSertifikaGunu = tedarikciSertifikaGunleri
    .filter((g) => g >= 0)
    .reduce<number | null>((a, g) => (a === null || g < a ? g : a), null);
  const dolmusSertifikaSayisi = tedarikciSertifikaGunleri.filter((g) => g < 0).length;

  return {
    tedarikciler: veri,
    yazabilir,
    sertifikaUfku: { yakinGun: yakinSertifikaGunu, dolmus: dolmusSertifikaSayisi, ufuk: UFUK },
  };
}
