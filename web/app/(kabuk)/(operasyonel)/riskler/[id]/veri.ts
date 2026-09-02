import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamKosulu, kapsamda, modulKapisi } from '@/app/kapsam';
import { kucukGorsel } from '@/lib/gorsel';
import { RISK_ICERIK, riskeCevir } from '../ortak';
import type { DetayVerisi } from './RiskDetayIstemci';

/* O4 · Risk Detail — SUNUCU VERİSİ (kapsam kuralı JSX'ten ayrı test edilsin).

   ═══ KAPSAM SIZINTISI ══════════════════════════════════════════════════
   Detay rotası `db.risk.findUnique({ where: { id } })` diyordu: kapsam dışı
   bir riskin id'sini bilen (ya da deneyen) herkes kaydı tam hâliyle
   açabiliyordu — liste ekranı satırı gizlese bile. Ayrıca form açılırları
   (`db.tesis.findMany`) ve alt gezinme şeridi (`santraller`) BÜTÜN aktif
   santralleri, görseliyle ve koduyla taşıyordu.

   MODÜL: `risk` — liste ekranıyla aynı gerekçe (bkz. ../veri.ts).

   ── VARLIĞI DOĞRULAMAK DA BİR SIZINTIDIR ───────────────────────────────
   Kapsam dışı kayıt için ayrı bir "yetkiniz yok" mesajı VERİLMEZ ve hangi
   santralin dışarıda kaldığı SÖYLENMEZ: bu fonksiyon `null` döner, rota
   `notFound()` çağırır. "Bulunamadı" ile "göremezsin" ekranda ayırt
   edilemez olmalıdır — ayırt edilebilseydi, id deneyerek başka santralde
   hangi risklerin VAR OLDUĞU sayılabilirdi. */

/** Kapsam dışı ya da silinmiş kayıt için `null` — çağıran `notFound()` der. */
export async function riskDetayVerisi(
  k: AktifKullanici,
  id: string,
): Promise<DetayVerisi | null> {
  modulKapisi(k, 'risk');
  const izinli = izinliTesisIdleri(k, 'risk');

  const ham = await db.risk.findUnique({ where: { id }, include: RISK_ICERIK });
  if (!ham || ham.silindi) return null;
  // Kapsam kararı `lib/api/yetki.ts → tesisKapsamda` ile aynı kuraldır:
  // santrali bilinmeyen (portföy) risk yalnız kapsamsız kullanıcıya açılır.
  if (!kapsamda(izinli, ham.tesisId)) return null;

  const risk = riskeCevir(ham, (t) => kapsamda(izinli, t));

  const maddeIdleri = risk.kontroller.map((c) => c.id);
  const [aksiyonlar, bulguKapanis, maddeDurumlari, izler, kullanicilar,
    tesisler, sistemler, acikBulgular] = await Promise.all([
    // Aksiyonlar bulgu üzerinden yaşar (§ CAPA zinciri).
    risk.bulgu
      ? db.aksiyon.findMany({
          where: { bulguId: risk.bulgu.id },
          include: { sorumlu: { select: { adSoyad: true } } },
          orderBy: [{ hedef: 'asc' }, { baslangic: 'asc' }],
        })
      : Promise.resolve([]),
    risk.bulgu
      ? db.bulgu.findUnique({
          where: { id: risk.bulgu.id },
          select: {
            tespitTarihi: true, kapanmaTarihi: true, kapanisDogrulama: true,
            kapanisDogrulayan: { select: { adSoyad: true } },
          },
        })
      : Promise.resolve(null),
    /* Kontrol halkası riskin kendi santraliyle daraltılıydı; santrali
       olmayan (portföy) riskte madde BÜTÜN santrallerde değerlendirilmiş
       olabilir. Bu yüzden kapsam ayrıca uygulanır — aksi hâlde portföy
       riskinin kontrol durumu, göremediğim bir santralin değerlendirmesinden
       gelebilirdi. */
    maddeIdleri.length
      ? db.maddeDurumu.findMany({
          where: {
            maddeId: { in: maddeIdleri },
            ...(risk.tesis ? { tesisId: risk.tesis.id } : kapsamKosulu(izinli)),
          },
          select: { maddeId: true, durum: true, sonDegerlendirme: true },
        })
      : Promise.resolve([]),
    // Skor eğilimi: değişmez iz kaydından — anlık görüntü uydurulmaz.
    db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'Risk', varlikId: id, alan: 'artikRisk' },
      select: { zaman: true, oncekiDeger: true, yeniDeger: true },
      orderBy: { zaman: 'asc' },
    }),
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    /* Santral açılırı ve alt gezinme şeridi AYNI daraltılmış kümeden gelir:
       formda seçilemeyen bir santral şeritte de anılmaz. */
    db.tesis.findMany({
      where: { durum: 'aktif', ...(izinli === null ? {} : { id: { in: izinli } }) },
      include: { tip: true },
      orderBy: { kod: 'asc' },
    }),
    db.sistemServis.findMany({ orderBy: { kod: 'asc' } }),
    db.bulgu.findMany({
      where: {
        silindi: null,
        durum: { in: ['acik', 'aksiyonda'] },
        maddeDurumu: kapsamKosulu(izinli),
      },
      orderBy: { tespitTarihi: 'desc' },
    }),
  ]);

  /* Kontrol halkası: aynı madde birden çok santralde değerlendirilmişse
     EN KÖTÜ durum yönetir; hiç değerlendirilmemişse bilinmeyen kalır. */
  const KOTU_SIRA = ['uyumsuz', 'kismi', 'incelemede', 'degerlendirilmedi', 'uyumlu', 'kapsamdisi'];
  const siraNo = (d: string) => {
    const i = KOTU_SIRA.indexOf(d);
    return i < 0 ? KOTU_SIRA.length : i;
  };
  const kontrolDurumu = maddeDurumlari.length
    ? [...maddeDurumlari].sort((a, b) => siraNo(a.durum) - siraNo(b.durum))[0].durum
    : null;
  const kontrolTarihi = maddeDurumlari
    .map((m) => m.sonDegerlendirme)
    .filter((t): t is Date => !!t)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  /* Skor eğilimi: iz kayıtlarının ÖNCEKİ değerinden başlar, son nokta
     kaydın bugünkü artık skorudur. İki noktadan azsa eğilim BİLİNMEZ. */
  const noktalar: { zaman: string; deger: number | null }[] = [];
  if (izler.length) {
    const ilk = izler[0].oncekiDeger;
    noktalar.push({
      zaman: izler[0].zaman.toISOString(),
      deger: ilk && ilk !== 'bilinmiyor' ? Number(ilk) : null,
    });
    for (const iz of izler) {
      noktalar.push({
        zaman: iz.zaman.toISOString(),
        deger: iz.yeniDeger && iz.yeniDeger !== 'bilinmiyor' ? Number(iz.yeniDeger) : null,
      });
    }
  }
  if (noktalar.at(-1)?.deger !== risk.artikRisk) {
    noktalar.push({ zaman: risk.guncellendi, deger: risk.artikRisk });
  }

  return {
    risk,
    aksiyonlar: aksiyonlar.map((a) => ({
      id: a.id, baslik: a.baslik, durum: a.durum,
      sorumlu: a.sorumlu?.adSoyad ?? null,
      hedef: a.hedef?.toISOString() ?? null,
      tamamlanma: a.tamamlanma?.toISOString() ?? null,
      dogrulamaDurumu: a.dogrulamaDurumu,
    })),
    bulguTespit: bulguKapanis?.tespitTarihi?.toISOString() ?? null,
    bulguKapanma: bulguKapanis?.kapanmaTarihi?.toISOString() ?? null,
    dogrulamaTarihi: bulguKapanis?.kapanisDogrulama?.toISOString() ?? null,
    dogrulayan: bulguKapanis?.kapanisDogrulayan?.adSoyad ?? null,
    kontrolDurumu,
    kontrolTarihi: kontrolTarihi?.toISOString() ?? null,
    trend: noktalar,
    kullanicilar: kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad })),
    tesisler: tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad })),
    sistemler: sistemler.map((s) => ({ id: s.id, kod: s.kod, ad: s.ad })),
    bulgular: acikBulgular.map((b) => ({ id: b.id, baslik: b.baslik })),
    santraller: tesisler.map((t) => ({
      id: t.id,
      ad: t.ad,
      alt: [t.kuruluGucMw ? `${t.kuruluGucMw} MWe` : null, t.konum]
        .filter(Boolean).join(' · ') || t.kod,
      tip: t.tip?.kod ?? '—',
      gorsel: kucukGorsel(t.gorselAnahtari),
      yol: `/tesisler/${t.id}`,
    })),
  };
}
