/* Üretim tipi kimliği — SUNUM tarafı.

   Renk KİMLİKTİR, durum değil: jeotermal her yüzeyde jeotermaldir,
   "iyi" ya da "kötü" demez. Ton kararı CSS'e bırakılır (`--jes` üç yönde
   üç değer taşır); bu dosya yalnız "hangi token" sorusunu yanıtlar.

   Önceki arayüz katmanındaki eşdeğeri eski token'lara (`--jesd`)
   bağlıydı ve koyu/açık yüzeyi çağıranın bilmesini istiyordu. Yeni kabukta
   yüzeyi YÖN belirler, ekran değil. */

export const TIP_ADI: Record<string, string> = {
  JEO: 'Jeotermal', HES: 'Hidroelektrik', RES: 'Rüzgâr', GES: 'Güneş',
  DGKC: 'Doğal gaz kombine çevrim', TERMIK: 'Termik', MERKEZ: 'Merkez BT',
};

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

export function tipAdi(kod: string | null | undefined, yedek?: string | null): string {
  if (!kod) return yedek ?? 'tipi tanımsız';
  return TIP_ADI[kod] ?? yedek ?? kod;
}
