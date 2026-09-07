/* Statik demo: yetki kapısı yok, kapsam mesajı da yok.

   Demo ikizi ÇEKİRDEK sözcüğü döner — demo tek sözlüklüdür ve sözlük
   okuması veritabanı ister. Mesaj yine de doğru şekilli kalsın diye
   metin üretilir; demo derlemesinde bu yol hiç çağrılmaz (yazma yok). */
import { CEKIRDEK_TERIMLER, type Bicim, type Sozluk, type Terim } from '../dil/terimler';

export const kapsamMesaji = async (
  _k: unknown, _modul: unknown, sonek: string, _tesisId?: string | null,
  bicim: Bicim = 'tekil',
): Promise<string> => `Bu ${CEKIRDEK_TERIMLER.tesis[bicim]} kapsamında ${sonek}`;

export const kapsamTerimi = async (
  _k: unknown, _modul: unknown, _tesisId?: string | null, bicim: Bicim = 'tekil',
): Promise<string> => CEKIRDEK_TERIMLER.tesis[bicim];

/* Parametreler KULLANILMIYOR ama duruyor: gerçek modülle KONUM KONUM
   aynı olmalı — demo derlemesinde çağrılar bu ikize alias'lanıyor ve
   üçüncü argüman `tesisId`. Depo düzeni `void` ile susturur. */
export const eylemSozlugu = async (
  _k: unknown, _modul: unknown, _tesisId?: string | null,
): Promise<Sozluk | null> => { void _k; void _modul; void _tesisId; return null; };

export const kapsamTerimiBas = async (
  _k: unknown, _modul?: unknown, _tesisId?: string | null, bicim: Bicim = 'tekil',
): Promise<string> => {
  const s = CEKIRDEK_TERIMLER.tesis[bicim];
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
};

export const eylemTerimi = async (
  _k: unknown, _modul: unknown, _tesisId?: string | null,
): Promise<Terim> => {
  void _k; void _modul; void _tesisId; return CEKIRDEK_TERIMLER.tesis;
};
