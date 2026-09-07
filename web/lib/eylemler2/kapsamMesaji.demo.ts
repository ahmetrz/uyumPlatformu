/* Statik demo: yetki kapısı yok, kapsam mesajı da yok.

   Demo ikizi ÇEKİRDEK sözcüğü döner — demo tek sözlüklüdür ve sözlük
   okuması veritabanı ister. Mesaj yine de doğru şekilli kalsın diye
   metin üretilir; demo derlemesinde bu yol hiç çağrılmaz (yazma yok). */
import { CEKIRDEK_TERIMLER, type Bicim } from '../dil/terimler';

export const kapsamMesaji = async (
  _k: unknown, _modul: unknown, sonek: string, _tesisId?: string | null,
  bicim: Bicim = 'tekil',
): Promise<string> => `Bu ${CEKIRDEK_TERIMLER.tesis[bicim]} kapsamında ${sonek}`;

export const kapsamTerimi = async (
  _k: unknown, _modul: unknown, bicim: Bicim = 'tekil',
): Promise<string> => CEKIRDEK_TERIMLER.tesis[bicim];
