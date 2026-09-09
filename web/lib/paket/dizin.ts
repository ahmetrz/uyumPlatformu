/* Paket dizini çözümü — 'use server' modülünün DIŞINDA durur: o modül
   yalnız async eylem dışa açabilir (Next kuralı), yardımcı burada. */
import path from 'node:path';

export const PAKET_KOKU = 'paketler';

/** `paketler/<KOD>`; kök dışına çıkan yol (`..`, mutlak yol) reddedilir. */
export function paketDizini(kod: string, cwd: string = process.cwd()): string {
  const kok = path.resolve(cwd, PAKET_KOKU);
  const dizin = path.resolve(kok, kod);
  if (!dizin.startsWith(kok + path.sep)) throw new Error('paket yolu paketler/ dışına çıkamaz');
  return dizin;
}
