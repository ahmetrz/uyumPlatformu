/* ═══════════════════════════════════════════════════════════════════════
   KAPSAM ÖĞESİ — uyum zincirinin öznesi (B1)

   Uyum durumu, süreç kapsamı, uygulanabilirlik, istisna, kanıt bağı,
   denetçi kapsamı ve anlık görüntü artık `Tesis`e değil `KapsamOgesi`ne
   asılıdır. Öğenin TÜRÜ bir katalogdur (`KapsamOgesiTuru`), enum değil:
   çekirdek iki türü kutudan çıkarır (`tesis`, `kurum`), sektör paketi
   ekler. Bu modül çekirdeğin türle ilgili bildiği HER ŞEYİ toplar; tür
   kodu başka hiçbir yerde sabit olarak geçmez.

   ── K2 · bilinmeyen ≠ sıfır ──────────────────────────────────────────
   Bir öğenin türü çözülemiyorsa (tür kaydı pasif) öğe KAPSAM DIŞI
   sayılmaz; durumu BİLİNMİYOR olur ve ekran bunu söyler. Kapsam dışı bir
   karardır, bilinmiyor bir ölçüm eksikliğidir — ikisini aynı kovaya
   koymak, hiç bakmadan "kapsam dışı" demektir.
   ═══════════════════════════════════════════════════════════════════════ */
import { basHarf, CEKIRDEK_TERIMLER } from '../dil/terimler';

/** Çekirdeğin kutudan çıkardığı iki tür. Paket türleri buraya EKLENMEZ;
    katalog satırı olarak gelir. Türün `ad`ı çekirdek terimden türer —
    sözcük buraya çakılmaz; ekran etiketi `etiketAnahtari` ile sektör
    sözlüğünden çözülür. */
export const CEKIRDEK_KAPSAM_TURLERI = {
  tesis: { kod: 'tesis', ad: basHarf(CEKIRDEK_TERIMLER.tesis.tekil), etiketAnahtari: 'tesis', tesiseBagli: true, sira: 10 },
  kurum: { kod: 'kurum', ad: 'Kuruluş', etiketAnahtari: null, tesiseBagli: true, sira: 20 },
} as const;

export type KapsamOgesiDurumu = 'aktif' | 'pasif' | 'bilinmiyor';

/** Öğenin işlevsel durumu: öğe pasifse pasif; türü pasifse BİLİNMİYOR
    (K2) — kapsam dışı değil. Saf; ekran ve motor aynı kararı çağırır. */
export function ogeDurumu(oge: {
  durum: string; tur: { aktif: boolean } | null | undefined;
}): KapsamOgesiDurumu {
  if (!oge.tur || !oge.tur.aktif) return 'bilinmiyor';
  return oge.durum === 'pasif' ? 'pasif' : 'aktif';
}

/** Tesisten türetilen öğenin kimliği: kod ve ad tesisinkidir — göç de
    böyle kurar, `arac/goc-sayimi.mjs` dağılımı bu koda göre karşılaştırır. */
export function tesistenOge(tesis: { kod: string; ad: string; id: string }, turId: string) {
  return { kod: tesis.kod, ad: tesis.ad, turId, tesisId: tesis.id };
}
