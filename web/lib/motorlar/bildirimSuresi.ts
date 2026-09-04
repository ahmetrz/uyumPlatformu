import 'server-only';
import { db } from '../db';
import { bildirimKarari, type Yukumluluk } from '../uyum/bildirimSuresi';

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
    return { islenen: 0, uretilen: 0, daralan: 0, geciken: 0, kuralYok: true };
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

  for (const o of olaylar) {
    /* Santralin tabi olduğu regülasyonlar: kurala bağlı yükümlülük
       yalnız o regülasyon santralin kapsamındaysa uyar. */
    const regulasyonIdleri = o.tesisId
      ? (await db.uygulanabilirlikKarari.findMany({
        where: { tesisId: o.tesisId, uygulanabilir: true },
        select: { regulasyonId: true },
      })).map((x) => x.regulasyonId)
      : [];

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
  };
}
