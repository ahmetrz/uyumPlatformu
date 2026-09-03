import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri, izinVar } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamda, modulKapisi } from '@/app/kapsam';
import { tekrarZinciri } from '@/lib/uyum/tekrarBulgu';
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
      kokNedenAnalizEden: true,
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

  /* UY-28 · Tekrar zinciri: AYNI kontrolün bütün bulguları okunur ve saf
     `tekrarZinciri()` ile sıralanır. Zincir bulgunun kendi tekrar bağını
     yukarı yürüyerek değil, aynı `maddeDurumuId` üzerinden kurulur:
     motorun ya da insanın bağ kurmayı atladığı bir halka da görünsün. */
  const kontroldekiler = await db.bulgu.findMany({
    where: { maddeDurumuId: bulgu.maddeDurumuId, silindi: null },
    select: {
      id: true, tespitTarihi: true, kapanmaTarihi: true, durum: true,
      onemDerecesi: true, baslik: true,
    },
  });
  const zincirHesabi = tekrarZinciri(kontroldekiler.map((b) => ({
    id: b.id, tespit: b.tespitTarihi.getTime(),
    kapanma: b.kapanmaTarihi?.getTime() ?? null,
    durum: b.durum, onemDerecesi: b.onemDerecesi,
  })));
  const baslikIdx = new Map(kontroldekiler.map((b) => [b.id, b.baslik]));
  const zincir = {
    uzunluk: zincirHesabi.uzunluk,
    kronik: zincirHesabi.kronik,
    ortalamaAralikGun: zincirHesabi.ortalamaAralikGun,
    halkalar: zincirHesabi.halkalar.map((h) => ({
      id: h.id,
      baslik: baslikIdx.get(h.id) ?? '',
      tespit: new Date(h.tespit).toISOString(),
      kapanma: h.kapanma === null ? null : new Date(h.kapanma).toISOString(),
      durum: h.durum,
      onem: h.onemDerecesi,
      buMu: h.id === bulgu.id,
    })),
  };

  /* C20 · Yetki bayrakları sunucuda hesaplanır; istemci düğmeyi buna göre
     gösterir ya da gizler. Bu bir GÖRÜNÜM kararıdır — asıl kapı sunucu
     eyleminin içindedir (`aksiyonDogrula` yeniden denetler). Görev
     ayrılığı satır bazlıdır (sorumlu ≠ doğrulayan), o yüzden aktif
     kullanıcının kimliği ve her aksiyonun sorumlusu da taşınır. */
  const kapsam = { tesisId: bulgu.maddeDurumu.tesisId, surecId: bulgu.maddeDurumu.surecId };
  const yazabilir = izinVar(k, 'uyum', 'yazma', kapsam);
  const dogrulayabilir = izinVar(k, 'uyum', 'onay', kapsam);

  return {
    id: bulgu.id,
    maddeDurumuId: bulgu.maddeDurumuId,
    aktifKullaniciId: k.id,
    yazabilir,
    dogrulayabilir,
    baslik: bulgu.baslik,
    aciklama: bulgu.aciklama,
    durum: bulgu.durum,
    onem: bulgu.onemDerecesi,
    kaynak: bulgu.kaynak,
    kokNeden: bulgu.kokNeden,
    /* UY-26 · Kategori ve analiz damgası; serbest metnin YANINDA durur ve
       onun yerine geçmez (kategori sayılır, metin anlatır). */
    kokNedenKategori: bulgu.kokNedenKategori,
    kokNedenAnalizEden: bulgu.kokNedenAnalizEden?.adSoyad ?? null,
    kokNedenAnalizZamani: bulgu.kokNedenAnalizZamani?.toISOString() ?? null,
    /* UY-28 · Tekrar bağı ve zinciri. */
    tekrarBulguId: bulgu.tekrarBulguId,
    tekrarKaynagi: bulgu.tekrarKaynagi,
    tekrarPenceresiGun: bulgu.tekrarPenceresiGun,
    zincir,
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
      sorumluId: a.sorumluId,
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
