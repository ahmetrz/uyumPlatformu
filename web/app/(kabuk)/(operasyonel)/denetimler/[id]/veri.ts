import 'server-only';
import { db } from '@/lib/db';
import { izinVar, izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { modulKapisi, type TesisKapsami } from '@/app/kapsam';
import { DENETIM_ICERIK, denetimeCevir } from '../ortak';
import type { DetayVerisi } from './DenetimDetayIstemci';

/* O6 · Audit Detail & Evidence — SUNUCU VERİSİ.

   ═══ KAPSAM SIZINTISI ══════════════════════════════════════════════════
   /denetimler LİSTESİ kapsamlıydı, detay rotası DEĞİLDİ: liste satırı
   gizlense bile `/denetimler/<id>` kapsam dışı denetimin kapsam
   santrallerini (id · kod · ad), bulgularını, bulguların santral kodlarını
   ve kanıt taleplerini tam hâliyle veriyordu. Liste kapsamlı, detay
   kapsamsızsa sınır yalnız görünüştedir.

   MODÜL: `denetim` — liste ekranıyla AYNI (`izinliTesisIdleri(k,'denetim')`)
   ve `lib/eylemler2/denetim.ts`teki bütün eylemlerle aynı
   (`yetkiZorunlu('denetim', …)`). İki rota ayrı modül seçseydi kullanıcı
   listede gördüğü satıra tıklayıp "bulunamadı" alırdı.

   ── KAPSAM SATIRI OLMAYAN DENETİM ──────────────────────────────────────
   Liste ekranının kuralı AYNEN korunur ve tekrarlanmaz, tek yerden
   (`denetimGorunur`) gelir: kapsamı hiç girilmemiş denetim PORTFÖY geneli
   sayılır ve gizlenmez. Bu, `lib/api/yetki.ts → tesisKapsamda`nın
   "santrali bilinmeyen kayıt yalnız kapsamsıza görünür" kuralından
   bilinçli bir SAPMADIR ve gerekçesi listede yazılıdır: aksi hâlde kapsam
   satırı unutulmuş bir denetim kimseye görünmez olur — yani veri
   eksikliği, kaydı yok etmenin yolu hâline gelirdi.

   ── VARLIĞI DOĞRULAMAK DA BİR SIZINTIDIR ───────────────────────────────
   Kapsam dışı denetim `null` döner, rota `notFound()` çağırır; hangi
   santralin dışarıda kaldığı SÖYLENMEZ. */

/** Liste ve detayın PAYLAŞTIĞI görünürlük kuralı — iki rota ayrışamaz. */
export function denetimGorunur(
  kapsam: TesisKapsami,
  tesisIdleri: (string | null)[],
): boolean {
  if (kapsam === null) return true;
  const bilinen = tesisIdleri.filter((t): t is string => t !== null);
  // Kapsam satırı yoksa portföy geneli sayılır (bkz. yukarıdaki gerekçe).
  if (bilinen.length === 0) return true;
  return bilinen.some((t) => kapsam.includes(t));
}

/** Kapsam dışı ya da silinmiş denetim için `null` — çağıran `notFound()` der. */
export async function denetimDetayVerisi(
  k: AktifKullanici,
  id: string,
): Promise<DetayVerisi | null> {
  modulKapisi(k, 'denetim');
  const izinli = izinliTesisIdleri(k, 'denetim');
  const simdi = new Date().getTime();

  const ham = await db.denetim.findUnique({
    where: { id },
    include: {
      ...DENETIM_ICERIK,
      // Kapsam formu çerçeveyle daraltılacak — regülasyon kimliği de gerekli.
      surec: {
        select: {
          id: true, kod: true, regulasyonId: true,
          regulasyon: { select: { kod: true } },
        },
      },
      kapsamlar: {
        select: {
          id: true,
          maddeId: true,
          tesis: { select: { id: true, kod: true, ad: true } },
          madde: { select: { id: true, kod: true, baslik: true } },
        },
      },
      talepler: {
        select: {
          id: true, baslik: true, aciklama: true, durum: true, sonTarih: true,
          sorumlu: { select: { id: true, adSoyad: true } },
          kanit: { select: { id: true, ad: true } },
        },
        orderBy: [{ durum: 'asc' }, { sonTarih: 'asc' }],
      },
      bulgular: {
        where: { silindi: null },
        select: {
          id: true, baslik: true, onemDerecesi: true, durum: true, hedefTarih: true,
          sorumlu: { select: { adSoyad: true } },
          maddeDurumu: {
            select: {
              tesisId: true,
              madde: { select: { kod: true } },
              tesis: { select: { kod: true } },
            },
          },
        },
        orderBy: [{ durum: 'asc' }, { onemDerecesi: 'asc' }],
      },
    },
  });
  if (!ham || ham.silindi) return null;
  if (!denetimGorunur(izinli, ham.kapsamlar.map((x) => x.tesis?.id ?? null))) return null;

  /* Denetim görünür olsa bile İÇİNDEKİ satırlar ayrıca daraltılır: çok
     santralli bir denetimin kapsam satırı ve bulgusu, kullanıcının
     göremediği bir santrali adıyla ve koduyla taşıyabilir. */
  const gorunurKapsamlar = izinli === null
    ? ham.kapsamlar
    : ham.kapsamlar.filter((x) => x.tesis === null || izinli.includes(x.tesis.id));
  const gorunurBulgular = izinli === null
    ? ham.bulgular
    : ham.bulgular.filter((b) => izinli.includes(b.maddeDurumu.tesisId));

  /* Madde havuzu denetimin çerçevesiyle daraltılır: EPDK denetiminin
     kapsamına ISO maddesi eklenmesi anlamsız olur. */
  const [kullanicilar, tesisler, maddeler, kanitlar] = await Promise.all([
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    db.tesis.findMany({
      where: { durum: 'aktif', ...(izinli === null ? {} : { id: { in: izinli } }) },
      orderBy: { kod: 'asc' },
    }),
    db.madde.findMany({
      where: {
        silindi: null,
        ...(ham.surec ? { regulasyonId: ham.surec.regulasyonId } : {}),
      },
      select: { id: true, kod: true, baslik: true },
      orderBy: [{ sira: 'asc' }, { kod: 'asc' }],
    }),
    db.kanit.findMany({
      where: { silindi: null },
      select: { id: true, ad: true, tip: true },
      orderBy: { ad: 'asc' },
    }),
  ]);

  /* Başlık ölçüleri (kaç santral, kaç bulgu) DARALTILMIŞ kümeden hesaplanır:
     satırı gizleyip sayacı bırakmak, sayının kendisini sızıntıya çevirirdi. */
  const denetim = denetimeCevir(
    {
      ...ham,
      kapsamlar: gorunurKapsamlar.map((x) => ({ tesis: x.tesis, maddeId: x.maddeId })),
      bulgular: gorunurBulgular.map((b) => ({ durum: b.durum })),
    },
    simdi,
  );

  return {
    denetim,
    simdi,
    kapsamlar: gorunurKapsamlar.map((x) => ({ id: x.id, tesis: x.tesis, madde: x.madde })),
    talepler: ham.talepler.map((t) => ({
      id: t.id, baslik: t.baslik, aciklama: t.aciklama, durum: t.durum,
      sonTarih: t.sonTarih?.toISOString() ?? null,
      sorumlu: t.sorumlu ? { id: t.sorumlu.id, ad: t.sorumlu.adSoyad } : null,
      kanit: t.kanit,
    })),
    bulgular: gorunurBulgular.map((b) => ({
      id: b.id, baslik: b.baslik, onem: b.onemDerecesi, durum: b.durum,
      maddeKod: b.maddeDurumu.madde.kod,
      tesisKod: b.maddeDurumu.tesis.kod,
      sorumlu: b.sorumlu?.adSoyad ?? null,
      hedef: b.hedefTarih?.toISOString() ?? null,
    })),
    kullanicilar: kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad })),
    /* Kapsama yalnız kullanıcının o santralde yazma yetkisi olan tesisler
       önerilir; sunucu eylemi aynı kontrolü tekrar uygular. */
    tesisler: tesisler
      .filter((t) => izinVar(k, 'denetim', 'yazma', { tesisId: t.id }))
      .map((t) => ({ id: t.id, kod: t.kod, ad: t.ad })),
    maddeler,
    kanitlar,
    /* Kapsamsız: `Denetim` tesisId taşımaz (kapsam `DenetimKapsami`
       ilişkisiyle kurulur) ve aşama eylemleri de kapsamsız korunur.
       Yukarıdaki tesis listesi AYRI bir sorudur: denetimin kapsamına
       hangi santrallerin eklenebileceğini santral santral sorar. */
    yazabilir: izinVar(k, 'denetim', 'yazma'),
    onaylayabilir: izinVar(k, 'denetim', 'onay'),
  };
}
