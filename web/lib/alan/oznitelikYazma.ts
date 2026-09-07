import 'server-only';
import { db } from '@/lib/db';

/* ═══════════════════════════════════════════════════════════════════════
   ÖZNİTELİK YAZMA — tek kapı (P1 · URN-ALN)

   Okuma tarafı (`oznitelik.ts`) veritabanı bilmez; yazma tarafı bilmek
   zorunda, bu yüzden ayrı dosya. İkisini birleştirmek okuma
   yardımcılarını sunucuya çivilerdi.

   ── DEĞER SİLİNİRSE SATIR SİLİNİR ─────────────────────────────────────
   Formda kurulu güç boşaltılınca `sayisalDeger = null` YAZILMAZ, satır
   SİLİNİR. İkisi ekranda aynı görünür ama anlamları farklıdır: kalan bir
   satır "ölçtük, sonucu yok" der; satırın yokluğu "ölçmedik" der. Göç
   (`20260906230000`) ölçülmemiş tesise satır açmadı; formun onu geri
   açması, göçün koruduğu ayrımı ilk düzenlemede yok ederdi.

   ── KAYNAK YAZILIR, ÖLÇÜM ZAMANI YAZILMAZ ─────────────────────────────
   `kaynak: 'elle'` değerin kimden geldiğini söyler. `olcumZamani` boş
   bırakılır: formu dolduran kişi değeri O AN ölçmedi, kayda geçirdi.
   `guncellendi` zaten kaydın ne zaman değiştiğini tutuyor; ölçüm zamanı
   uydurulursa köken yalan söyler.
   ═══════════════════════════════════════════════════════════════════════ */

export type OzellikHedefi =
  | { tip: 'tesis'; id: string }
  | { tip: 'birim'; id: string };

/** Sayısal özniteliği yazar; `deger === null` ise satırı SİLER. */
export async function sayisalOzellikYaz(
  hedef: OzellikHedefi,
  anahtar: string,
  deger: number | null,
  secenek: { birim?: string | null; kaynak?: string } = {},
): Promise<void> {
  const kaynak = secenek.kaynak ?? 'elle';
  const birim = secenek.birim ?? null;

  if (hedef.tip === 'tesis') {
    if (deger === null) {
      await db.tesisOzellik.deleteMany({ where: { tesisId: hedef.id, anahtar } });
      return;
    }
    await db.tesisOzellik.upsert({
      where: { tesisId_anahtar: { tesisId: hedef.id, anahtar } },
      create: { tesisId: hedef.id, anahtar, sayisalDeger: deger, birim, kaynak },
      update: { sayisalDeger: deger, metinDeger: null, birim, kaynak },
    });
    return;
  }

  if (deger === null) {
    await db.birimOzellik.deleteMany({ where: { birimId: hedef.id, anahtar } });
    return;
  }
  await db.birimOzellik.upsert({
    where: { birimId_anahtar: { birimId: hedef.id, anahtar } },
    create: { birimId: hedef.id, anahtar, sayisalDeger: deger, birim, kaynak },
    update: { sayisalDeger: deger, metinDeger: null, birim, kaynak },
  });
}
