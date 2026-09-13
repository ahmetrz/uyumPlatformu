/* ═══════════════════════════════════════════════════════════════════════
   UYGULANABİLİRLİK BEYANI (SoA) — SAF

   Öz denetim formu "bu kontrolü ne kadar karşılıyoruz" sorusunu sorar.
   SoA başka bir soru sorar: "bu kontrol BİZE UYGULANIYOR MU, ve neden?"
   İkisi karıştırılırsa kapsam kararı bir olgunluk kademesinin arkasına
   saklanır — ölçüldü ve kural yazıldı (R-D): bir kaynak alanının ürünün
   yanlış alanına yazılması hiçbir kapının göremediği bir kusurdur.

   ── GEREKÇE İKİ YÖNDE DE İSTENİR, AMA AĞIRLIKLARI FARKLI ──────────────
   HARİÇ TUTMA gerekçesizse bu bir KUSURDUR: denetçi "neden bu kontrol
   yok" diye sorar ve cevabı kurum vermek zorundadır. DAHİL ETME
   gerekçesizse bu bir ölçüm boşluğudur — kontrol zaten uygulanıyor,
   eksik olan yalnız yazılı sebep. İkisi ayrı işaretlenir; ikisi de
   uydurulmaz.

   Bu dosya veritabanı, React ve tarayıcı bilmez. */

import {
  DEGERLENDIRILMEDI, type FormHucresi, type FormIsareti,
} from './formDoldurma';

export const GEREKCESIZ_HARIC = 'Hariç · GEREKÇE YOK';

export type SoaGirdisi = {
  kod: string;
  baslik: string;
  /** `true` = kapsamda (dahil), `false` = hariç. */
  uygulanabilir: boolean;
  /** Dahil ya da hariç kararının SEBEBİ; `null` = yazılmamış. */
  gerekce: string | null;
  /** Uygulama durumu; `null` = ölçülmedi. */
  uygulamaDurumu: string | null;
  /** Kanıt referansı (belge kodu, kanıt kimliği); `null` = ölçülmedi. */
  kanitReferansi: string | null;
  sorumlu: string | null;
};

export const SOA_SUTUNLARI = [
  { anahtar: 'maddeKod', etiket: 'Madde' },
  { anahtar: 'baslik', etiket: 'Kontrol' },
  { anahtar: 'uygulanabilir', etiket: 'Uygulanabilir mi' },
  { anahtar: 'gerekce', etiket: 'Gerekçe' },
  { anahtar: 'uygulamaDurumu', etiket: 'Uygulama durumu' },
  { anahtar: 'kanitReferansi', etiket: 'Kanıt referansı' },
  { anahtar: 'sorumlu', etiket: 'Sorumlu' },
] as const;

const bos = (d: string | null): boolean => d === null || d.trim() === '';

/** SoA satırı. Hücrelerin hiçbiri boş kalmaz. */
export function soaSatiri(g: SoaGirdisi): {
  maddeKod: string; hucreler: FormHucresi[]; isaretler: FormIsareti[];
} {
  const gerekceHucresi: FormHucresi = bos(g.gerekce)
    ? (g.uygulanabilir
      /* Dahil edilmiş ama sebebi yazılmamış: ölçüm boşluğu. */
      ? { anahtar: 'gerekce', deger: DEGERLENDIRILMEDI, isaret: 'olculmedi' }
      /* Hariç tutulmuş ve sebebi yazılmamış: KUSUR. */
      : { anahtar: 'gerekce', deger: GEREKCESIZ_HARIC, isaret: 'gerekcesiz_kapsam_disi' })
    : { anahtar: 'gerekce', deger: g.gerekce as string, isaret: null };

  const durumHucresi: FormHucresi = g.uygulanabilir
    ? (bos(g.uygulamaDurumu)
      ? { anahtar: 'uygulamaDurumu', deger: DEGERLENDIRILMEDI, isaret: 'olculmedi' }
      : { anahtar: 'uygulamaDurumu', deger: g.uygulamaDurumu as string, isaret: null })
    /* Hariç tutulan kontrolün uygulama durumu "ölçülmedi" değildir:
       uygulanması BEKLENMİYOR. İkisini aynı söze düşürmek, gerçek
       boşluğu kapsam kararının arkasına saklardı. */
    : { anahtar: 'uygulamaDurumu', deger: 'Uygulanmıyor (hariç)', isaret: null };

  const kanitHucresi: FormHucresi = g.uygulanabilir
    ? (bos(g.kanitReferansi)
      ? { anahtar: 'kanitReferansi', deger: DEGERLENDIRILMEDI, isaret: 'olculmedi' }
      : { anahtar: 'kanitReferansi', deger: g.kanitReferansi as string, isaret: null })
    : { anahtar: 'kanitReferansi', deger: 'Beklenmiyor (hariç)', isaret: null };

  const hucreler: FormHucresi[] = [
    { anahtar: 'maddeKod', deger: g.kod, isaret: null },
    { anahtar: 'baslik', deger: g.baslik, isaret: null },
    { anahtar: 'uygulanabilir', deger: g.uygulanabilir ? 'Evet' : 'Hayır', isaret: null },
    gerekceHucresi,
    durumHucresi,
    kanitHucresi,
    bos(g.sorumlu)
      ? { anahtar: 'sorumlu', deger: DEGERLENDIRILMEDI, isaret: 'olculmedi' }
      : { anahtar: 'sorumlu', deger: g.sorumlu as string, isaret: null },
  ];
  const isaretler = [...new Set(
    hucreler.map((h) => h.isaret).filter((i): i is FormIsareti => i !== null),
  )];
  return { maddeKod: g.kod, hucreler, isaretler };
}
