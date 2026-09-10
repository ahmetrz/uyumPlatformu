/* ═══════════════════════════════════════════════════════════════════════
   R10 · BİLDİRİM KAYDI AÇMA — TEK NÜSHA, İKİ ÇAĞIRAN

   Taslakları açan ve süresi geçeni işaretleyen döngü BURADADIR; motor
   (`lib/motorlar/bildirimSuresi.ts`) ve tohum (`prisma/seed.ts`) ikisi de
   bunu çağırır.

   Neden ayrı dosya: motor `server-only` taşır ve bu bilinçlidir (istemci
   paketine giremez). Tohum ise düz Node'da (`tsx`) koşar ve `server-only`
   orada FIRLATIR. Tohumun kayıtları ELLE yazması ise çok daha kötü olurdu:
   motorun yaptığı işi taklit eden ikinci bir gerçek doğardı ve motor bir
   gün değiştiğinde fikstür eski davranışı göstermeye devam ederdi —
   `paketiKur`un tohumda gerçek kurucuyu koşmasıyla aynı gerekçe.

   MOTORUN YAZABİLECEĞİ İKİ DURUM: `taslak` ve `suresi_gecti`.
   `gonderildi` · `teyit_alindi` · `uygulanmaz` insan kararıdır ve buraya
   ASLA yazılmaz (`MOTORUN_YAZABILECEGI`; bekçi:
   `tests/bekci/bildirim-motoru.test.ts`). */

import type { db as Db } from '../db';
import { iz } from '../eylemler2/ortak';
import {
  geriSayim, motorYazabilirMi, motorunKarari, uyanYukumlulukler,
  SURESIZ_SOZU, type SureliYukumluluk,
} from './bildirimKaydi';

export type KayitKosusu = {
  /** Bu koşuda AÇILAN taslak sayısı (idempotent: ikinci koşuda 0). */
  acilanTaslak: number;
  /** Bu koşuda `suresi_gecti` yazılan kayıt sayısı. */
  suresiGecen: number;
  /** Süresi mevzuatta belirlenmemiş olduğu için geri sayımı OLMAYAN kayıt. */
  suresiz: number;
};

export type OlaySatiri = {
  id: string;
  /** İz kaydında insanın tanıyacağı ad; yoksa id yazılır. */
  kod?: string | null;
  siddet: string;
  baslangic: Date;
  bildirimGerekli: boolean | null;
  /** Olayın tesisinin tabi olduğu regülasyonlar. */
  regulasyonIdleri: readonly string[];
};

/**
 * Bir olay için uyan HER yükümlülüğe kayıt açar / süresi geçeni işaretler.
 *
 * `bildirimGerekli === false` ise insan bakmış ve "bu kapsamda değil"
 * demiştir: taslak AÇILMAZ.
 */
export async function olayinKayitlarini(
  istemci: typeof Db,
  olay: OlaySatiri,
  kurallar: readonly SureliYukumluluk[],
  simdi: number,
): Promise<KayitKosusu> {
  const sonuc: KayitKosusu = { acilanTaslak: 0, suresiGecen: 0, suresiz: 0 };
  if (olay.bildirimGerekli === false) return sonuc;

  for (const y of uyanYukumlulukler({
    siddet: olay.siddet, regulasyonIdleri: olay.regulasyonIdleri, kurallar,
  })) {
    const gs = geriSayim({ baslangic: olay.baslangic.getTime(), simdi, sureSaat: y.sureSaat });
    if (!gs.sureVar) sonuc.suresiz += 1;

    const mevcut = await istemci.bildirimKaydi.findUnique({
      where: { olayId_yukumlulukId: { olayId: olay.id, yukumlulukId: y.id } },
      select: { id: true, durum: true },
    });

    if (!mevcut) {
      /* AÇILIŞ DURUMU DA HESAPLANIR. İlk tasarımda kayıt her zaman
         `taslak` açılıyordu ve süresi ÇOKTAN geçmiş bir olay için ekran
         bir tur boyunca "Taslak hazır" diyordu — oysa geri sayım aynı
         satırda "6 gün GECİKME" yazıyordu. İki söz aynı satırda
         çelişiyordu; ölçüldü (tarayıcı kanıtı, ilk koşum).
         Bugün açılış da `motorunKarari`den geçer: motorun yazabileceği
         küme değişmedi (`taslak` · `suresi_gecti`), yalnız kararın ne
         zaman verildiği düzeldi.

         Taslak METNİ ürün YAZMAZ: mercinin şablonu paketten gelir ve
         cevapları kurum doldurur. Boş bırakmak, uydurmaktan iyidir. */
      const acilis = motorunKarari({ mevcutDurum: 'taslak', geriSayim: gs }) ?? 'taslak';
      /* MOTORUN YAZDIĞI DA İZ BIRAKIR — bağımsız inceleme bulgusu (P2,
         #47 turu 1). Bir mevzuat yükümlülüğünün DOĞDUĞU ve SÜRESİNİN
         GEÇTİĞİ anlar bu özelliğin en denetim-kritik olaylarıdır ve
         hiçbir iz bırakmıyordu. Emsal aynı depoda: `motorlar/sonTarih.ts`
         riski otomatik yeniden açarken `kaynak: 'is_kosusu'` ile ize
         düşüyor. Aktör YOK (`aktorId: null`) çünkü kararı insan vermedi;
         iz bunu saklamaz, ADIYLA söyler. */
      await istemci.$transaction(async (tx) => {
        const kayit = await tx.bildirimKaydi.create({
          data: {
            olayId: olay.id,
            yukumlulukId: y.id,
            durum: acilis,
            sonTarih: gs.sonTarih === null ? null : new Date(gs.sonTarih),
          },
        });
        await iz({
          aktorId: null, varlikTipi: 'BildirimKaydi', varlikId: kayit.id,
          eylem: 'olusturma', alan: 'durum', once: null,
          sonra: acilis === 'suresi_gecti' ? 'Süresi geçmiş açıldı' : 'Taslak açıldı',
          gerekce: `motor · ${olay.kod ?? olay.id} · ${y.kod} · ${y.merci}`
            + ` · ${gs.sureVar ? `son tarih ${new Date(gs.sonTarih!).toISOString()}` : SURESIZ_SOZU}`,
        }, tx);
      });
      sonuc.acilanTaslak += 1;
      if (acilis === 'suresi_gecti') sonuc.suresiGecen += 1;
      continue;
    }

    /* Kapalı kayda (gönderildi · teyit · uygulanmaz) motor DOKUNMAZ. */
    const yeniDurum = motorunKarari({ mevcutDurum: mevcut.durum, geriSayim: gs });
    if (yeniDurum === null) continue;
    /* Bekçi kuşağı: motorun yazacağı her durum listeden geçer. Kod bir gün
       başka bir durum hesaplarsa burada durur, veritabanında değil. */
    if (!motorYazabilirMi(yeniDurum)) continue;
    await istemci.$transaction(async (tx) => {
      await tx.bildirimKaydi.update({ where: { id: mevcut.id }, data: { durum: yeniDurum } });
      await iz({
        aktorId: null, varlikTipi: 'BildirimKaydi', varlikId: mevcut.id,
        eylem: 'guncelleme', alan: 'durum',
        once: 'Taslak hazır — gönderilmedi', sonra: 'SÜRE GEÇTİ — hâlâ gönderilmedi',
        gerekce: `motor · ${olay.kod ?? olay.id} · ${y.kod} · ${y.merci}`
          + ' · süre doldu, bildirim hâlâ gönderilmedi',
      }, tx);
    });
    sonuc.suresiGecen += 1;
  }
  return sonuc;
}

/**
 * Açık olayların tamamı için koşar — tohumun ve motorun ortak girişi.
 *
 * Kural yoksa hiçbir şey yapılmaz ve bu bir HATA DEĞİLDİR: kurum henüz
 * kendi bildirim sürelerini tanımlamamıştır. Ürün bir süre uydurup sayaç
 * işletmez.
 */
export async function acikOlaylarinKayitlarini(istemci: typeof Db): Promise<KayitKosusu> {
  const kurallar = await istemci.bildirimYukumlulugu.findMany({
    where: { aktif: true },
    select: {
      id: true, kod: true, ad: true, regulasyonId: true,
      asgariSiddet: true, sureSaat: true, merci: true, aktif: true,
    },
  });
  const toplam: KayitKosusu = { acilanTaslak: 0, suresiGecen: 0, suresiz: 0 };
  if (kurallar.length === 0) return toplam;

  const olaylar = await istemci.olay.findMany({
    where: { durum: { in: ['acik', 'mudahale'] } },
    select: { id: true, kod: true, siddet: true, baslangic: true, tesisId: true, bildirimGerekli: true },
  });

  const simdi = Date.now();
  for (const o of olaylar) {
    const regulasyonIdleri = o.tesisId
      ? (await istemci.uygulanabilirlikKarari.findMany({
        where: { kapsamOgesi: { tesisId: o.tesisId }, uygulanabilir: true },
        select: { regulasyonId: true },
      })).map((x) => x.regulasyonId)
      : [];
    const k = await olayinKayitlarini(istemci, { ...o, regulasyonIdleri }, kurallar, simdi);
    toplam.acilanTaslak += k.acilanTaslak;
    toplam.suresiGecen += k.suresiGecen;
    toplam.suresiz += k.suresiz;
  }
  return toplam;
}
