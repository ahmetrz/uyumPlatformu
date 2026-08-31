import 'server-only';
import { db } from '../db';
import { kritikVarliklardaEksikYedek, type EksikYedekVarligi } from '../entegrasyon/konfigYedek';

/* ═══════════════════════════════════════════════════════════════════════
   YEDEK DOĞRULAMA MOTORU  (isKos('yedek_dogrulama', …))

   Ne yapar: kritik/yüksek kritiklikteki varlıkların konfigürasyon yedeği
   durumunu tarar ve boşlukları VERİ KALİTESİ KUYRUĞUNA düşürür.

   Ne YAPMAZ — sözleşme gereği, hiçbir koşulda:
    · Yedek almaz, geri yüklemez, cihaza bağlanmaz, konfigürasyon değiştirmez.
    · OTOMATİK RİSK ya da BULGU AÇMAZ. `Risk`, `Bulgu`, `ProjeAdayi`,
      `Gorev` tablolarına tek satır yazmaz. Bulduğu şey bir "veri kalitesi
      bulgusu"dur: insanın bakacağı bir kuyruk maddesi, kapatılmış bir karar
      değil. Riski insan açar (detect → correlate → propose → human approve).
    · `MaddeDurumu` güncellemez. Uyum bağı `yedekKontrolBagi()` üzerinden
      ÖNERİ olarak sunulur.
    · Bilinmeyeni yokluk saymaz: iki ayrı kural üretir (aşağı bakın).

   ── İKİ KURAL, ÇÜNKÜ İKİ FARKLI OLGU ─────────────────────────────────
     yedeksiz_kritik_varlik          → KANITLI YOKLUK. Yedek denemeleri var
                                       ve hepsi başarısız, ya da envanterde
                                       "yok" beyan edilmiş. Kapatılacak açık.
     yedegi_bilinmeyen_kritik_varlik → ÖLÇÜM YOK. Ne otomatik kayıt ne beyan.
                                       Kapatılacak açık değil, doldurulacak
                                       kör nokta. Tek kurala toplanamaz:
                                       toplanırsa "yedeksiz" sayısı şişer ve
                                       kimse hangisinin gerçek olduğunu bilemez.

   ── KAYNAK BAĞLI DEĞİLSE ─────────────────────────────────────────────
   Sistemde tek bir `KonfigurasyonYedegi` kaydı bile yoksa motor HATA
   VERMEZ ve tarama yapmaz: hiçbir varlığın yedeği ölçülmemiştir, hepsini
   "bilinmeyen" diye kuyruğa atmak yüzlerce anlamsız satır üretirdi.
   Temiz kapanır ama bunu KOŞU KAYDINDA söyler: her koşu bir
   `EntegrasyonKosusu` satırı bırakır ve kaynak yoksa `durum` alanı
   `kaynak_bagli_degil` olur (sessiz hata yasağı — /saglik bunu görür).
   Bu bir hata değildir, o yüzden `hata` alanı doldurulmaz.
   ═══════════════════════════════════════════════════════════════════ */

export const YEDEK_KURALLARI = {
  yok: 'yedeksiz_kritik_varlik',
  bilinmiyor: 'yedegi_bilinmeyen_kritik_varlik',
} as const;

export const KOSU_KAYNAGI = 'backup';

/** EntegrasyonKosusu.durum değerleri — 'kaynak_bagli_degil' hata DEĞİLDİR. */
export const KOSU_DURUM_SOZU: Record<string, string> = {
  basarili: 'Tarama tamamlandı',
  kaynak_bagli_degil: 'Konfigürasyon yedeği kaynağı bağlı değil — tarama yapılmadı '
    + '(bu bir hata değil; hiçbir varlığın yedek durumu ölçülmemiş demektir)',
  basarisiz: 'Tarama başarısız',
};

type Ihlal = { kural: string; kaynakTipi: string; kaynakId: string; aciklama: string };
const anahtar = (x: { kural: string; kaynakTipi: string; kaynakId: string }) =>
  `${x.kural}|${x.kaynakTipi}|${x.kaynakId}`;

function aciklamaYaz(v: EksikYedekVarligi, kural: string): string {
  const yer = v.tesisKodu ? ` (${v.tesisKodu})` : '';
  return kural === YEDEK_KURALLARI.yok
    ? `${v.etiket} — ${v.ad}${yer}: ${v.kritiklik} kritiklikteki varlığın kullanılabilir `
      + `konfigürasyon yedeği yok. ${v.gerekce} Risk kaydı AÇILMADI: değerlendirme insanın.`
    : `${v.etiket} — ${v.ad}${yer}: ${v.kritiklik} kritiklikteki varlığın yedek durumu `
      + `ÖLÇÜLMEMİŞ (yedeksiz olduğu iddia edilmiyor). ${v.gerekce}`;
}

/**
 * Motor girişi. `isKos('yedek_dogrulama', yedekDogrulamayiIsle)` ile koşar.
 * Dönen sayaçlar `IsKosusu` satırına yazılır; ayrıntı `EntegrasyonKosusu`da.
 */
export async function yedekDogrulamayiIsle(): Promise<{ islenen: number; uretilen: number }> {
  const basla = Date.now();
  const kosu = await db.entegrasyonKosusu.create({
    data: { kaynak: KOSU_KAYNAGI, guvenEtiketi: 'otomatik', tetikleyen: 'zamanlanmis' },
  });

  try {
    return await tara(kosu.id, basla);
  } catch (e) {
    /* Yutmuyoruz: koşu satırı 'calisiyor' asılı kalmasın diye kapatıp
       yeniden fırlatıyoruz — isKos da IsKosusu'na başarısız yazsın. */
    await db.entegrasyonKosusu.update({
      where: { id: kosu.id },
      data: {
        durum: 'basarisiz', bitis: new Date(), sureMs: Date.now() - basla,
        hata: e instanceof Error ? e.message : String(e),
      },
    });
    throw e;
  }
}

async function tara(kosuId: string, basla: number): Promise<{ islenen: number; uretilen: number }> {
  const kurallar = [YEDEK_KURALLARI.yok, YEDEK_KURALLARI.bilinmiyor];
  const acikBulgular = await db.veriKalitesiBulgusu.findMany({
    where: { durum: 'acik', kural: { in: kurallar } },
  });

  const rapor = await kritikVarliklardaEksikYedek();

  /* Kaynak yok: tarama yapılmadı. Mevcut açık bulguları da KAPATMAYIZ —
     kaynak kesildi diye eski bir açık "çözüldü" sayılamaz. */
  if (!rapor.kaynakBagli) {
    await db.entegrasyonKosusu.update({
      where: { id: kosuId },
      data: {
        durum: 'kaynak_bagli_degil', bitis: new Date(), sureMs: Date.now() - basla,
        kayitSayisi: 0, alinan: 0, kabulEdilen: 0, reddedilen: 0,
      },
    });
    return { islenen: 0, uretilen: 0 };
  }

  const ihlaller: Ihlal[] = [
    ...rapor.yedeksiz.map((v) => ({
      kural: YEDEK_KURALLARI.yok, kaynakTipi: 'Varlik', kaynakId: v.varlikId,
      aciklama: aciklamaYaz(v, YEDEK_KURALLARI.yok),
    })),
    ...rapor.bilinmeyen.map((v) => ({
      kural: YEDEK_KURALLARI.bilinmiyor, kaynakTipi: 'Varlik', kaynakId: v.varlikId,
      aciklama: aciklamaYaz(v, YEDEK_KURALLARI.bilinmiyor),
    })),
  ];

  const acikKume = new Set(acikBulgular.map(anahtar));
  const ihlalKume = new Set(ihlaller.map(anahtar));

  let uretilen = 0;
  for (const i of ihlaller) {
    if (acikKume.has(anahtar(i))) continue;   // aynı açık bulgu duruyor — çoğaltma
    await db.veriKalitesiBulgusu.create({ data: i });
    uretilen++;
  }
  let cozulen = 0;
  for (const b of acikBulgular) {
    if (ihlalKume.has(anahtar(b))) continue;
    // Koşul düzelmiş (yedek gelmiş ya da varlık kritik olmaktan çıkmış).
    await db.veriKalitesiBulgusu.update({
      where: { id: b.id }, data: { durum: 'cozuldu', kapanis: new Date() } });
    cozulen++;
  }

  await db.entegrasyonKosusu.update({
    where: { id: kosuId },
    data: {
      durum: 'basarili', bitis: new Date(), sureMs: Date.now() - basla,
      kayitSayisi: rapor.toplamKritik,
      alinan: rapor.toplamKritik,
      kabulEdilen: uretilen + cozulen,
      reddedilen: 0,
    },
  });

  return { islenen: rapor.toplamKritik, uretilen };
}

/** /saglik ve yedekleme ekranının okuyacağı son koşu özeti. */
export async function yedekDogrulamaSonKosu() {
  const kosu = await db.entegrasyonKosusu.findFirst({
    where: { kaynak: KOSU_KAYNAGI },
    orderBy: { baslangic: 'desc' },
  });
  if (!kosu) return null;
  return {
    id: kosu.id, durum: kosu.durum, baslangic: kosu.baslangic, bitis: kosu.bitis,
    sureMs: kosu.sureMs, taranan: kosu.kayitSayisi, hata: kosu.hata,
    soz: KOSU_DURUM_SOZU[kosu.durum] ?? kosu.durum,
  };
}
