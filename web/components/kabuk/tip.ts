/* Tesis tipi kimliği — SUNUM tarafı.

   Renk KİMLİKTİR, durum değil: bir tip her yüzeyde aynı rengi taşır,
   "iyi" ya da "kötü" demez. Ton kararı CSS'e bırakılır (`--jes` üç yönde
   üç değer taşır); bu dosya yalnız "hangi token" sorusunu yanıtlar.

   Önceki arayüz katmanındaki eşdeğeri eski token'lara (`--jesd`)
   bağlıydı ve koyu/açık yüzeyi çağıranın bilmesini istiyordu. Yeni kabukta
   yüzeyi YÖN belirler, ekran değil.

   ── TİP ADI ARTIK BURADA DEĞİL (P1 · Aşama E) ─────────────────────────
   Burada bir `TIP_ADI` sözlüğü vardı ve `TesisTipi.ad` ile AYNI bilgiyi
   ikinci kez tutuyordu: bütün çağıranlar zaten veritabanındaki adı
   `yedek` olarak geçiriyordu, gömülü sözlük onu susturuyordu. Kopya
   silindi; ad tek kaynaktan, VERİDEN gelir. Yan etkisi ölçüldü: yalnız
   `DGKC` tipinin yazımı değişti ("Doğal gaz kombine çevrim" → tohumdaki
   "Doğal Gaz Kombine Çevrim").

   ── RENK EŞLEMESİ NEDEN KALDI ─────────────────────────────────────────
   `TOKEN` hâlâ enerji tip kodlarına bakıyor ve bu dosyayı bekçinin izin
   listesinde tutan tek şey odur. Rengi de veriye taşımak `TesisTipi`ye
   bir kimlik alanı eklemeyi gerektirir; o karar sektör paketiyle
   birlikte verilir (Aşama G). Tanımadığı kod için nötr mürekkebe
   düşüyor: yanlış renk basmıyor, renksiz kalıyor. */

const TOKEN: Record<string, string> = {
  JEO: 'var(--aksan)', HES: 'var(--hes)', RES: 'var(--res)', GES: 'var(--ges)',
};

/** Kimlik rengi; tanımsız tip için nötr mürekkep. */
export function tipRengi(kod: string | null | undefined): string {
  return TOKEN[(kod ?? '').toUpperCase()] ?? 'var(--i2)';
}

/** Yığın çubuğunun "uygun" parçası: kimliği olmayan tipte durum rengine
    düşer, yoksa nötr gri "bilinmeyen" tarama deseniyle karışırdı. */
export function uygunRengi(kod: string | null | undefined): string {
  return TOKEN[(kod ?? '').toUpperCase()] ?? 'var(--ok)';
}

/** Tipin görünen adı. Ad VERİDEN gelir (`TesisTipi.ad`, çağıranın
    geçirdiği `yedek`); kod yalnız ad yokken son çare olarak yazılır. */
export function tipAdi(kod: string | null | undefined, yedek?: string | null): string {
  if (!kod) return yedek ?? 'tipi tanımsız';
  return yedek ?? kod;
}
