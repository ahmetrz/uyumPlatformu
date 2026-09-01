import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamda, modulKapisi } from '@/app/kapsam';
import type { Veri } from './BulguDetayIstemci';

/* O7 · Bulgu kayıt ekranı — SUNUCU VERİSİ.

   ═══ KAPSAM SIZINTISI ══════════════════════════════════════════════════
   Rota `db.bulgu.findUnique({ where: { id } })` diyordu: kapsam dışı bir
   bulgunun id'sini deneyen herkes kaydı TAM hâliyle açabiliyordu — madde
   metni, santral kimliği/kodu/adı, kanıtlar, bağlı riskler, bağlı projeler
   ve BÜTÜN denetim izi dahil. Liste ekranındaki süzgeç bu rotayı korumaz;
   liste kapsamlı, detay kapsamsızsa sınır yalnız görünüşte vardır.

   MODÜL: `uyum` — liste ekranıyla aynı gerekçe (bkz. ../veri.ts).

   ── VARLIĞI DOĞRULAMAK DA BİR SIZINTIDIR ───────────────────────────────
   Kapsam dışı kayıt `null` döner ve rota `notFound()` çağırır. Hangi
   santralin dışarıda kaldığı SÖYLENMEZ: "B santrali kapsamınızda değil"
   demek, B'de o id'de bir bulgunun VAR OLDUĞUNU doğrulamak olurdu. */

/** Kapsam dışı ya da olmayan kayıt için `null` — çağıran `notFound()` der. */
export async function bulguDetayVerisi(
  k: AktifKullanici,
  id: string,
): Promise<Veri | null> {
  modulKapisi(k, 'uyum');
  const izinli = izinliTesisIdleri(k, 'uyum');

  const bulgu = await db.bulgu.findUnique({
    where: { id },
    include: {
      sorumlu: true,
      kapanisDogrulayan: true,
      aksiyonlar: {
        include: { sorumlu: true, dogrulayan: true },
        orderBy: [{ baslangic: 'asc' }],
      },
      projeBaglantilari: { include: { proje: true } },
      riskler: true,
      maddeDurumu: {
        include: {
          madde: true,
          tesis: { include: { tip: true } },
          surec: { include: { regulasyon: true } },
          kanitBaglantilari: { include: { kanit: true } },
        },
      },
    },
  });
  if (!bulgu) return null;
  // Kural `lib/api/yetki.ts → tesisKapsamda` ile aynı (app/kapsam.ts onu
  // aynen çağırır) — ekran ile API sınırı aynı yerde durur.
  if (!kapsamda(izinli, bulgu.maddeDurumu.tesisId)) return null;

  const [aktiviteler, kullanicilar] = await Promise.all([
    db.aktiviteKaydi.findMany({
      where: {
        OR: [
          { varlikTipi: 'Bulgu', varlikId: id },
          { varlikTipi: 'Aksiyon', varlikId: { in: bulgu.aksiyonlar.map((a) => a.id) } },
          { varlikTipi: 'MaddeDurumu', varlikId: bulgu.maddeDurumuId },
        ],
      },
      include: { aktor: true },
      orderBy: { zaman: 'desc' },
    }),
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
  ]);

  return {
    id: bulgu.id,
    maddeDurumuId: bulgu.maddeDurumuId,
    baslik: bulgu.baslik,
    aciklama: bulgu.aciklama,
    durum: bulgu.durum,
    onem: bulgu.onemDerecesi,
    kaynak: bulgu.kaynak,
    kokNeden: bulgu.kokNeden,
    tespit: bulgu.tespitTarihi.toISOString(),
    hedef: bulgu.hedefTarih?.toISOString() ?? null,
    kapanma: bulgu.kapanmaTarihi?.toISOString() ?? null,
    retestGerekli: bulgu.retestGerekli,
    retestSonucu: bulgu.retestSonucu,
    kapanisDogrulama: bulgu.kapanisDogrulama?.toISOString() ?? null,
    kapanisDogrulayan: bulgu.kapanisDogrulayan?.adSoyad ?? null,
    sorumluId: bulgu.sorumluId,
    sorumlu: bulgu.sorumlu?.adSoyad ?? null,
    madde: {
      kod: bulgu.maddeDurumu.madde.kod,
      baslik: bulgu.maddeDurumu.madde.baslik,
      metin: bulgu.maddeDurumu.madde.metin,
    },
    tesis: {
      id: bulgu.maddeDurumu.tesisId,
      kod: bulgu.maddeDurumu.tesis.kod,
      ad: bulgu.maddeDurumu.tesis.ad,
      tip: bulgu.maddeDurumu.tesis.tip?.kod ?? null,
    },
    surec: {
      id: bulgu.maddeDurumu.surecId,
      kod: bulgu.maddeDurumu.surec.kod,
      regKod: bulgu.maddeDurumu.surec.regulasyon.kod,
    },
    aksiyonlar: bulgu.aksiyonlar.map((a) => ({
      id: a.id, baslik: a.baslik, durum: a.durum,
      sorumlu: a.sorumlu?.adSoyad ?? null,
      hedef: a.hedef?.toISOString() ?? null,
      tamamlanma: a.tamamlanma?.toISOString() ?? null,
      dogrulama: a.dogrulamaDurumu,
      dogrulamaTarihi: a.dogrulamaTarihi?.toISOString() ?? null,
      dogrulayan: a.dogrulayan?.adSoyad ?? null,
      not: a.etkinlikNotu,
    })),
    projeler: bulgu.projeBaglantilari.map((p) => ({
      id: p.proje.id, kod: p.proje.kod, ad: p.proje.ad,
    })),
    riskler: bulgu.riskler.map((r) => ({ id: r.id, kod: r.kod, baslik: r.baslik })),
    kanitlar: bulgu.maddeDurumu.kanitBaglantilari.map((kb) => ({
      id: kb.kanit.id, ad: kb.kanit.ad, tip: kb.kanit.tip,
      baslangic: kb.kanit.gecerlilikBaslangic.toISOString(),
    })),
    aktiviteler: aktiviteler.map((a) => ({
      id: a.id, aktor: a.aktor?.adSoyad ?? 'Sistem', eylem: a.eylem,
      varlikTipi: a.varlikTipi, alan: a.alan,
      once: a.oncekiDeger, sonra: a.yeniDeger,
      dosya: a.dosyaAdi, zaman: a.zaman.toISOString(),
    })),
    kullanicilar: kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad })),
  };
}
