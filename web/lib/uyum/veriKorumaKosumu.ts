/* ═══════════════════════════════════════════════════════════════════════
   R15 · VERİ SAHİBİ BAŞVURUSU SÜRE KOŞUMU — TEK NÜSHA, İKİ ÇAĞIRAN

   Motor (`lib/motorlar/veriKoruma.ts`) ve tohum ikisi de bunu çağırır —
   `bildirimKaydiAcma.ts` ile aynı gerekçe: motor `server-only` taşır,
   tohum düz Node'da koşar.

   ── MOTOR CEVABI YAZMAZ (KVK-ENV-002) ─────────────────────────────────
   Motorun yazabileceği TEK durum `suresi_gecti`dir ve tek yan etkisi bir
   GÖREV açmaktır. `yanitMetni` bir insanın kalemidir: bir veri sahibine
   ürünün cevap yazması, kurumun adına beyanda bulunmaktır.

   ── SÜRE KURALI YOKSA SAYAÇ YOKTUR ────────────────────────────────────
   `VeriKorumaSuresi` satırı yoksa ya da `gun === null` ise geri sayım
   gösterilmez ve `suresi_gecti` ASLA yazılmaz — ürün bir süre UYDURMAZ.
   ═══════════════════════════════════════════════════════════════════════ */

import type { db as Db } from '../db';
import { iz } from '../eylemler2/ortak';
import {
  basvuruGeriSayimi, basvuruKarari, motorYazabilirMi,
} from '../veriKoruma/basvuru';
import { sonTarih, type SureKurali } from '../veriKoruma/sureler';

export type VeriKorumaKosusu = {
  /** Bu koşuda `suresi_gecti` yazılan başvuru sayısı. */
  suresiGecen: number;
  /** Bu koşuda açılan görev sayısı. */
  acilanGorev: number;
  /** Süre kuralı olmadığı için geri sayımı OLMAYAN başvuru. */
  suresiz: number;
  /** Son tarihi hesaplanıp yazılan başvuru (kural sonradan geldi). */
  sonTarihYazilan: number;
};

/** Süre kuralını satırdan okur; JSON hafta sonu alanı burada çözülür. */
export function kuraliCoz(satir: {
  konu: string; gun: number | null; isGunu: boolean;
  haftaSonuJson: string | null; dayanak: string; aktif: boolean;
} | null): SureKurali | null {
  if (!satir) return null;
  let haftaSonu: number[] | null = null;
  if (satir.haftaSonuJson) {
    try {
      const c = JSON.parse(satir.haftaSonuJson) as unknown;
      /* BİÇİMİ TANINMAYAN yapılandırma VARSAYIMA düşer, sessizce
         boş kümeye değil: boş küme "hafta sonu yok" demek olurdu ve
         sayaç sessizce hızlanırdı. */
      if (Array.isArray(c) && c.every((x) => typeof x === 'number')) haftaSonu = c as number[];
    } catch { haftaSonu = null; }
  }
  return {
    konu: satir.konu, gun: satir.gun, isGunu: satir.isGunu,
    haftaSonu, dayanak: satir.dayanak, aktif: satir.aktif,
  };
}

export async function veriKorumaSurelerini(
  istemci: typeof Db, o: { simdiMs: number },
): Promise<VeriKorumaKosusu> {
  const sonuc: VeriKorumaKosusu = {
    suresiGecen: 0, acilanGorev: 0, suresiz: 0, sonTarihYazilan: 0,
  };

  const kural = kuraliCoz(await istemci.veriKorumaSuresi.findUnique({
    where: { konu: 'basvuru_yanit' },
    select: {
      konu: true, gun: true, isGunu: true, haftaSonuJson: true,
      dayanak: true, aktif: true,
    },
  }));

  /* KAPALI BAŞVURUYA MOTOR DOKUNMAZ — pozitif küme ile sorulur:
     `notIn` yazmak, yarın eklenen bir durumu sessizce içeri alırdı. */
  const basvurular = await istemci.veriSahibiBasvurusu.findMany({
    where: { durum: { in: ['yeni', 'incelemede', 'suresi_gecti'] } },
    select: { id: true, kod: true, alinma: true, durum: true, sonTarih: true, gorevId: true },
    orderBy: { kod: 'asc' },
  });

  for (const b of basvurular) {
    const geri = basvuruGeriSayimi({
      alinmaMs: b.alinma.getTime(), simdiMs: o.simdiMs, kural,
    });
    if (!geri.sureVar) { sonuc.suresiz += 1; continue; }

    /* SON TARİH KAYDA YAZILIR: ekran onu hesaplamak zorunda kalmasın ve
       kural sonradan değiştiğinde hangi tarihle çalışıldığı görünsün. */
    const hesap = sonTarih(b.alinma.getTime(), kural);
    if (hesap !== null && b.sonTarih?.getTime() !== hesap) {
      await istemci.veriSahibiBasvurusu.update({
        where: { id: b.id }, data: { sonTarih: new Date(hesap) },
      });
      sonuc.sonTarihYazilan += 1;
    }

    const yeniDurum = basvuruKarari({ mevcutDurum: b.durum, geri });
    if (yeniDurum === null) continue;
    /* Bekçi kuşağı: motorun yazacağı her durum listeden geçer. */
    if (!motorYazabilirMi(yeniDurum)) continue;

    await istemci.$transaction(async (tx) => {
      /* GÖREV AÇILIR, CEVAP YAZILMAZ. Görev insanın önüne konur;
         `yanitMetni` alanına bu döngü HİÇ dokunmaz. */
      const gorev = b.gorevId ? null : await tx.gorev.create({
        data: {
          baslik: `Veri sahibi başvurusu süresi geçti — ${b.kod}`,
          tip: 'son_tarih', kaynakTipi: 'VeriSahibiBasvurusu', kaynakId: b.id,
          sonTarih: new Date(geri.sonTarihMs), otomatikUretildi: true,
        },
      });
      await tx.veriSahibiBasvurusu.update({
        where: { id: b.id },
        data: { durum: yeniDurum, ...(gorev ? { gorevId: gorev.id } : {}) },
      });
      /* Motorun yazdığı da iz bırakır; aktör YOK çünkü kararı insan
         vermedi ve iz bunu saklamaz, adıyla söyler. */
      await iz({
        aktorId: null, varlikTipi: 'VeriSahibiBasvurusu', varlikId: b.id,
        eylem: 'guncelleme', alan: 'durum',
        once: 'Yanıt bekliyor', sonra: 'SÜRE GEÇTİ — hâlâ yanıtlanmadı',
        gerekce: `motor · ${b.kod} · ${kural?.dayanak ?? 'süre kuralı'}`
          + ` · son tarih ${new Date(geri.sonTarihMs).toISOString()}`,
      }, tx);
      if (gorev) sonuc.acilanGorev += 1;
    });
    sonuc.suresiGecen += 1;
  }

  return sonuc;
}
