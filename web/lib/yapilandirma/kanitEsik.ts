import 'server-only';
import { KANIT_ESIK_VARSAYILAN, type KanitEsik } from '../sabitler';
import { ayarOku, type AyarOkuma } from './oku';

/* ═══ Kanıt tazelik eşiği — SUNUCU TEK DOĞRULUK KAYNAĞI ═══════════════════

   Kanıt kütüphanesi, bulgu detayı ve raporlar eşiği BURADAN alır ve istemci
   bileşenine prop olarak indirir; istemci kendi başına 90/180 bilmez.
   Okuma kuralı `ayarOku` ile aynıdır: kayıt yok → kod varsayılanı; şemayı
   geçmeyen kayıt → kod varsayılanı + `gecersiz_kayit`. Buna bir kural
   eklenir: iki değer tek tek geçerli olsa da ÇİFT olarak tutarsızsa
   (taze ≥ dolmuş) ikisi de varsayılana düşer ve `gecersiz_kayit` işaretlenir —
   yarım geçerli eşik, kanıtı sessizce yanlış kovaya koyardı. */

export type KanitEsikOkuma = {
  esik: KanitEsik;
  kaynak: { taze: AyarOkuma<number>['kaynak']; dolmus: AyarOkuma<number>['kaynak'] };
  /** çift tutarsızsa neden; ekran "varsayılanla çalışıyor" diye gösterir */
  uyari: string | null;
};

export async function kanitEsikleri(): Promise<KanitEsikOkuma> {
  const [taze, dolmus] = await Promise.all([
    ayarOku<number>('kanit.tazelik.taze_gun'), ayarOku<number>('kanit.tazelik.dolmus_gun')]);
  const t = typeof taze.deger === 'number' ? taze.deger : KANIT_ESIK_VARSAYILAN.taze;
  const d = typeof dolmus.deger === 'number' ? dolmus.deger : KANIT_ESIK_VARSAYILAN.dolmus;
  if (t >= d) {
    return {
      esik: { ...KANIT_ESIK_VARSAYILAN },
      kaynak: { taze: 'gecersiz_kayit', dolmus: 'gecersiz_kayit' },
      uyari: `Kayıtlı eşikler tutarsız (taze ${t} ≥ dolmuş ${d}); kod varsayılanı (${KANIT_ESIK_VARSAYILAN.taze}/${KANIT_ESIK_VARSAYILAN.dolmus}) kullanılıyor.`,
    };
  }
  return { esik: { taze: t, dolmus: d }, kaynak: { taze: taze.kaynak, dolmus: dolmus.kaynak }, uyari: null };
}
