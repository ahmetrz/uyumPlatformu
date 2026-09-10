import 'server-only';
import { db } from '../db';
import { bildirimKarari, type Yukumluluk } from '../uyum/bildirimSuresi';
import { olayinKayitlarini } from '../uyum/bildirimKaydiAcma';
import { acikDonemleriKur } from '../uyum/bildirimDonemiAcma';
import type { SureliYukumluluk } from '../uyum/bildirimKaydi';

/* ═══ UY-63 · Bildirim süresi motoru ═══════════════════════════════════

   ── NE YAPAR ──────────────────────────────────────────────────────────
   Açık olayları bildirim yükümlülüğü kurallarıyla karşılaştırır; süresi
   daralan ya da GEÇEN olaylar için GÖREV açar.

   Görev açar, bildirim değil: olayın atanmış bir sorumlusu yoktur ve
   `Bildirim` bir kullanıcıya yazılır. Sahipsiz bir uyarıyı kime
   göndereceğini bilmeyen motor, onu ortak iş kuyruğuna bırakır — orada
   görülür ve oradan sahiplenilir.

   ── NE YAPMAZ ─────────────────────────────────────────────────────────
   · Olayın kendisine DOKUNMAZ: şiddet, durum, etki alanları motorun işi
     değildir.
   · `bildirimGerekli` ya da `bildirimTarihi` alanlarını YAZMAZ. Resmî
     bir bildirimin yapıldığını söyleyebilecek tek şey insandır; motorun
     "bildirildi" yazması, yapılmamış bir bildirimi yapılmış göstermek
     olurdu ve bu ürünün baştan beri reddettiği şeydir.
   · R10 · `BildirimKaydi` üstünde YALNIZ iki durum yazar: `taslak` (kaydı
     açar) ve `suresi_gecti`. `gonderildi` · `teyit_alindi` · `uygulanmaz`
     insan kararıdır ve motor onlara DOKUNAMAZ — kapalı bir kaydı geri
     açmaz, gönderilmiş bir kaydı süresi geçti diye işaretlemez.
   · Süre uydurmaz: kural yoksa sayaç işlemez ve motor hiçbir şey demez.

   ── HER OLAY İÇİN EN FAZLA BİR AÇIK GÖREV ─────────────────────────────
   Aynı olay için açık bir görev varken ikincisi açılmaz; yoksa her
   koşuda aynı iş yeniden düşer ve kuyruk okunmaz hâle gelir. */

export type BildirimSuresiKosusu = {
  islenen: number;
  /** Motor kayıt defterinin ortak sözleşmesi: açılan görev sayısı. */
  uretilen: number;
  daralan: number;
  geciken: number;
  /** Yükümlülük kuralı hiç tanımlanmamışsa sayaç HİÇ işlemez. */
  kuralYok: boolean;
  /* ── R10 · BİLDİRİM KAYDI ────────────────────────────────────────────
     Görev bir HATIRLATMADIR; kayıt ise bildirimin KENDİSİNİN kütüğüdür.
     İkisi ayrı sayılır: görev kapanabilir, kayıt kapanmaz. */
  /** Bu koşuda AÇILAN taslak sayısı (idempotent: ikinci koşuda 0). */
  acilanTaslak: number;
  /** Bu koşuda `suresi_gecti` yazılan kayıt sayısı. */
  suresiGecen: number;
  /** Süresi mevzuatta belirlenmemiş olduğu için geri sayımı OLMAYAN kayıt. */
  suresiz: number;
  /* ── R10+ · TAKVİM TETİKLİ ──────────────────────────────────────────
     Aynı motor iki tetikleyiciyi de yürütür: olay tetiklide kayıt bir
     OLAYDAN doğar, takvim tetiklide bir DÖNEMDEN. Sayılar AYRI durur —
     "kaç taslak açıldı" ile "kaç dönem açıldı" ayrı sorulardır. */
  acilanDonem: number;
  donemSuresiGecen: number;
  /** Periyodu mevzuatta belirlenmediği için dönem AÇILAMAYAN yükümlülük. */
  donemsiz: number;
};

export async function bildirimSurelerini(): Promise<BildirimSuresiKosusu> {
  const kurallar = await db.bildirimYukumlulugu.findMany({
    where: { aktif: true },
    select: {
      id: true, kod: true, ad: true, regulasyonId: true,
      asgariSiddet: true, sureSaat: true, merci: true, aktif: true,
    },
  });

  if (kurallar.length === 0) {
    /* Kural yoksa hiçbir şey yapılmaz ve bu bir HATA DEĞİLDİR: kurum
       henüz kendi bildirim sürelerini tanımlamamıştır. Ürün bir süre
       uydurup sayaç işletmez. */
    return {
      islenen: 0, uretilen: 0, daralan: 0, geciken: 0, kuralYok: true,
      acilanTaslak: 0, suresiGecen: 0, suresiz: 0,
      acilanDonem: 0, donemSuresiGecen: 0, donemsiz: 0,
    };
  }

  const olaylar = await db.olay.findMany({
    where: { durum: { in: ['acik', 'mudahale'] }, bildirimTarihi: null },
    select: {
      id: true, kod: true, baslik: true, siddet: true, baslangic: true,
      tesisId: true, bildirimGerekli: true,
    },
  });

  const simdi = Date.now();
  let daralan = 0;
  let geciken = 0;
  let uretilen = 0;
  let acilanTaslak = 0;
  let suresiGecen = 0;
  let suresiz = 0;

  for (const o of olaylar) {
    /* Tesisin tabi olduğu regülasyonlar: kurala bağlı yükümlülük
       yalnız o regülasyon tesisin kapsamındaysa uyar. */
    const regulasyonIdleri = o.tesisId
      ? (await db.uygulanabilirlikKarari.findMany({
        where: { kapsamOgesi: { tesisId: o.tesisId }, uygulanabilir: true },
        select: { regulasyonId: true },
      })).map((x) => x.regulasyonId)
      : [];

    /* ── R10 · HER UYAN YÜKÜMLÜLÜK İÇİN AYRI KAYIT ────────────────────
       UY-63 en kısa süreliyi seçiyordu; bir olay birden çok mercie
       bildirilir (7545 ayrı, KVKK ayrı) ve seçim yapmak ikinci merciyi
       görünmez bırakırdı. Döngünün KENDİSİ `lib/uyum/bildirimKaydiAcma.ts`
       içindedir — tohum da onu çağırır (bu dosya `server-only` taşır ve
       düz Node'da fırlatır; tohumun kayıtları elle yazması ise motorun
       işini taklit eden ikinci bir gerçek doğururdu). */
    const kayit = await olayinKayitlarini(
      db,
      { id: o.id, kod: o.kod, siddet: o.siddet, baslangic: o.baslangic,
        bildirimGerekli: o.bildirimGerekli, regulasyonIdleri },
      kurallar as SureliYukumluluk[],
      simdi,
    );
    acilanTaslak += kayit.acilanTaslak;
    suresiGecen += kayit.suresiGecen;
    suresiz += kayit.suresiz;

    const karar = bildirimKarari({
      siddet: o.siddet,
      baslangic: o.baslangic.getTime(),
      simdi,
      bildirimGerekli: o.bildirimGerekli,
      bildirimTarihi: null,
      regulasyonIdleri,
      kurallar: kurallar as Yukumluluk[],
    });

    if (karar.durum !== 'GECIKTI' && karar.durum !== 'sure_daraliyor') continue;
    if (karar.durum === 'GECIKTI') geciken++; else daralan++;

    /* Aynı olay için AÇIK bir görev varken ikincisi açılmaz. */
    const acik = await db.gorev.findFirst({
      where: {
        tip: 'son_tarih', kaynakTipi: 'Olay', kaynakId: o.id,
        durum: { in: ['acik', 'yapiliyor'] },
      },
      select: { id: true },
    });
    if (acik) continue;

    const k = karar.yukumluluk!;
    await db.gorev.create({
      data: {
        baslik: karar.durum === 'GECIKTI'
          ? `Bildirim süresi GEÇTİ: ${o.kod} · ${k.merci}`
          : `Bildirim süresi daralıyor: ${o.kod} · ${k.merci}`,
        tip: 'son_tarih',
        kaynakTipi: 'Olay',
        kaynakId: o.id,
        tesisId: o.tesisId,
        sonTarih: karar.sonTarih === null ? null : new Date(karar.sonTarih),
        otomatikUretildi: true,
      },
    });
    uretilen++;
  }

  return {
    islenen: olaylar.length,
    uretilen,
    daralan,
    geciken,
    kuralYok: false,
    ...(await acikDonemleriKur(db).then((d) => ({
      acilanDonem: d.acilanDonem,
      donemSuresiGecen: d.suresiGecen,
      donemsiz: d.donemsiz,
    }))),
    acilanTaslak,
    suresiGecen,
    suresiz,
  };
}
