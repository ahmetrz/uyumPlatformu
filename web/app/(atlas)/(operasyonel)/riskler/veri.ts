import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamKosulu, kapsamda, modulKapisi } from '@/app/kapsam';
import {
  RISK_ICERIK, riskeCevir,
  type BulguSecenegi, type Kisi, type Kodlu, type R,
} from './ortak';

/* O3 · Risk kütüğü — SUNUCU VERİSİ. Sayfadan ayrı durur ki kapsam kuralı
   JSX olmadan, doğrudan test edilebilsin (bkz. tedarikciler/veri.ts).

   ═══ KAPSAM SIZINTISI — NE OLDU, NEDEN BÖYLE DÜZELDİ ═══════════════════
   Ekran `girisZorunlu()` dışında hiçbir kapsam uygulamıyordu:
   `db.risk.findMany({ where: { silindi: null } })` — `Risk.tesisId` şemada
   VAR, süzgeç yoktu. Yalnız A santraline yetkili bir kullanıcı B
   santralinin risk kodunu, başlığını, sahibini ve santral adını görüyordu.
   Santral açılırı (`db.tesis.findMany`) ise B'nin kimliğini ve kodunu
   doğrudan taşıyordu — satır hiç olmasa bile.

   ═══ SINIRSIZ OKUMA (P1) ═══════════════════════════════════════════════
   Ekran hem bütün riskleri (bağlı varlık · kontrol · proje ilişkileriyle)
   hem bütün açık bulguları `take` olmadan çekiyordu. Bugün küçük; sınırı
   yok ve büyüme tek yönlü. Üç kural uygulandı:
     1. Satırlar `SATIR_TAVANI` ile sınırlı — skor sırasına göre, yani
        kesme olursa elde kalan EN YÜKSEK skorlu risklerdir.
     2. Kesme SESSİZ DEĞİL: `toplam` ayrı bir `count` ile ölçülür ve ekran
        "gösterilen N · kütükte M" der.
     3. Metrikler KESİLMEMİŞ kütükten gelir: hepsi `count`/`aggregate` ile
        sunucuda ölçülür (satır için `take`, sayım için `count`). Sayacı
        kesilmiş listeden hesaplamak sayıyı yanlış yapardı.

   MODÜL SEÇİMİ: `risk`. Gerekçe kaydın konusudur, ekranın adı değil:
   `lib/eylemler2/risk.ts`teki üç eylem de (`riskKaydet`, `riskDurumDegistir`,
   `riskKarar`) `yetkiZorunlu('risk', …)` çağırır ve `lib/erisim.ts`teki
   `Modul` tipinde `risk` ayrı bir modüldür. Okuma kapsamı yazma kapısıyla
   aynı modülden gelmezse `risk_sahibi` rolü yazabildiği kaydı göremez ya da
   göremediği kaydı yazabilir olurdu. Kardeş ekranların kalıbı da budur:
   /envanter → envanter, /surecler → uyum, /denetimler → denetim.

   Ekrandaki HER santrale bağlı küme aynı `risk` kapsamıyla daraltılır —
   risk satırları, riske bağlı varlıklar, santral açılırı ve bulgu seçenekleri.
   İkisi ayrışsaydı ekran, göremediği bir riske bağlayabileceği bir bulgu
   önerirdi.

   ── SANTRALİ BİLİNMEYEN KAYIT ──────────────────────────────────────────
   `app/kapsam.ts → kapsamda` (= `lib/api/yetki.ts → tesisKapsamda`):
   `tesisId` null olan risk YALNIZ kapsamı sınırsız kullanıcıya görünür.
   Risk kütüğünde tesissiz kayıt "portföy riski" demektir; portföyün
   tamamını görmeyen birine portföy riskini göstermek, sınırı sessizce
   delmek olurdu. */

/**
 * Sunucudan çekilen en fazla risk satırı.
 *
 * Atlas sözleşmesi 7 görünür satır + katlanmış kuyruk der; istemci filtre,
 * kapsam açılırı ve çekmece için kütüğün geri kalanını da ister. 400,
 * "bir kurumun aynı anda yönettiği risk sayısı"nın üstünde, "tabloyu
 * belleğe almak"ın altında bir sınırdır. Aşıldığında ekran SÖYLER.
 */
export const SATIR_TAVANI = 400;

/** Metrikler — kesilmemiş kütük üzerinde `count`/`aggregate` ile ölçülür. */
export type RiskMetrikleri = {
  /** aktif (kapanmamış) risk sayısı */
  aktif: number;
  /** en yüksek artık skor; hiç skorlu aktif risk yoksa null (0 DEĞİL) */
  enYuksek: number | null;
  kritik: number;
  gecikmis: number;
  kabul: number;
  sahipsiz: number;
  /** skoru hiç girilmemiş aktif risk — bilinmeyen ≠ sıfır */
  skorsuz: number;
};

export type EkranVerisi = {
  riskler: R[];
  /** kütüğün GERÇEK büyüklüğü — `take` kesmesi sessiz kalmasın diye */
  toplam: number;
  satirTavani: number;
  metrikler: RiskMetrikleri;
  yeniKod: string;
  kullanicilar: Kisi[];
  tesisler: Kodlu[];
  sistemler: Kodlu[];
  bulgular: BulguSecenegi[];
  /** true = liste bir santral kapsamıyla daraltıldı (boş ekranın sözü değişir) */
  kapsamli: boolean;
};

export async function riskEkranVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'risk');
  const izinli = izinliTesisIdleri(k, 'risk');
  const an = new Date();
  // Kapsam TEK yerde: satırlar, toplam ve altı metrik aynı koşuldan türer.
  const kutuk = { silindi: null, ...kapsamKosulu(izinli) };
  const aktifKutuk = { ...kutuk, durum: { not: 'kapali' } };

  const [
    riskler, toplam, enYuksekOlcum, aktifSayisi, kritikSayisi, gecikmisSayisi,
    kabulSayisi, sahipsizSayisi, skorsuzSayisi,
    tumKodlar, kullanicilar, tesisler, sistemler, bulgular,
  ] = await Promise.all([
    db.risk.findMany({
      where: kutuk,
      include: RISK_ICERIK,
      /* Kesme olursa elde kalan EN YÜKSEK skorlu riskler olsun: sıralama
         `take` ile birlikte bir güvenlik kararıdır, yalnız görünüm değil. */
      take: SATIR_TAVANI,
      orderBy: [{ artikRisk: 'desc' }, { kod: 'asc' }],
    }),
    db.risk.count({ where: kutuk }),
    /* ── Metrikler · hepsi KESİLMEMİŞ kütük üzerinde ─────────────────── */
    db.risk.aggregate({ _max: { artikRisk: true }, where: aktifKutuk }),
    db.risk.count({ where: aktifKutuk }),
    db.risk.count({ where: { ...aktifKutuk, artikRisk: { gte: 15 } } }),
    /* `ortak.ts → gecikmis` ile birebir: süresi dolan kabul VEYA hedefi
       geçmiş, hâlâ açık bulgu. İki ayağı da SQL'de ifade edilir. */
    db.risk.count({
      where: {
        ...aktifKutuk,
        OR: [
          { durum: 'kabul_edildi', kabulBitis: { lt: an } },
          { bulgu: { hedefTarih: { lt: an }, durum: { notIn: ['kapali', 'kabul_edildi'] } } },
        ],
      },
    }),
    db.risk.count({ where: { ...kutuk, durum: 'kabul_edildi' } }),
    db.risk.count({ where: { ...aktifKutuk, sahipId: null } }),
    db.risk.count({ where: { ...aktifKutuk, artikRisk: null } }),
    /* Kod önerisi BİLEREK kapsamsızdır ve bir sızıntı değildir: `RSK-<yıl>-NNN`
       bir sayaçtır, santral kimliği taşımaz. Kapsamla daraltılsaydı iki farklı
       santralin sorumlusu aynı kodu üretir ve ikincisi benzersizlik ihlaline
       çarpardı — kapsam, kayıt açmayı engelleyen bir kusura dönüşürdü. */
    db.risk.findMany({ select: { kod: true } }), // silinenler dahil — kod çakışmasın
    db.kullanici.findMany({ where: { aktif: true }, orderBy: { adSoyad: 'asc' } }),
    db.tesis.findMany({
      where: { durum: 'aktif', ...(izinli === null ? {} : { id: { in: izinli } }) },
      orderBy: { kod: 'asc' },
    }),
    db.sistemServis.findMany({ orderBy: { kod: 'asc' } }),
    /* Bulgu seçenekleri riskin bağlanabileceği kayıtlardır; bulgu santrale
       `maddeDurumu.tesisId` üzerinden bağlıdır. Aynı `risk` kapsamı: bu
       ekranda görünmeyen bir santralin bulgusu seçenek olarak da anılmaz. */
    db.bulgu.findMany({
      where: {
        silindi: null,
        durum: { in: ['acik', 'aksiyonda'] },
        maddeDurumu: kapsamKosulu(izinli),
      },
      // Seçenek listesi de sınırsız değildir; en yeni tespitler önce gelir.
      take: SATIR_TAVANI,
      orderBy: { tespitTarihi: 'desc' },
    }),
  ]);

  // Kod önerisi: RSK-<yıl>-XXX — bu yılın en büyük sırası + 1
  const yil = new Date().getFullYear();
  const enBuyuk = tumKodlar.reduce((a, r) => {
    const m = /^RSK-(\d{4})-(\d+)$/.exec(r.kod);
    return m && Number(m[1]) === yil ? Math.max(a, Number(m[2])) : a;
  }, 0);

  return {
    /* `gorulebilir` süzgeci riske BAĞLI VARLIKLARA da uygulanır: kapsam içi
       bir riske kapsam dışı bir varlık bağlıysa o varlığın etiketi/adı
       ekrana çıkmaz. Süzgeç `riskeCevir` içinde çalıştığı için `ot` ve
       `santralSayisi` türetmeleri — yani satırın METRİKLERİ — de daraltılmış
       kümeden hesaplanır; satırı gizleyip sayacı bırakmak, sayının kendisini
       sızıntıya çevirirdi. */
    riskler: riskler.map((r) => riskeCevir(r, (t) => kapsamda(izinli, t))),
    toplam,
    satirTavani: SATIR_TAVANI,
    metrikler: {
      aktif: aktifSayisi,
      enYuksek: enYuksekOlcum._max.artikRisk ?? null,
      kritik: kritikSayisi,
      gecikmis: gecikmisSayisi,
      kabul: kabulSayisi,
      sahipsiz: sahipsizSayisi,
      skorsuz: skorsuzSayisi,
    },
    yeniKod: `RSK-${yil}-${String(enBuyuk + 1).padStart(3, '0')}`,
    kullanicilar: kullanicilar.map((u) => ({ id: u.id, ad: u.adSoyad })),
    tesisler: tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad })),
    sistemler: sistemler.map((s) => ({ id: s.id, kod: s.kod, ad: s.ad })),
    bulgular: bulgular.map((b) => ({ id: b.id, baslik: b.baslik })),
    kapsamli: kapsamDaraltildi(izinli),
  };
}
