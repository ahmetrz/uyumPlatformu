import type { AktifKullanici } from '../auth';
import { izinVar, izinliTesisIdleri, type Modul } from '../erisim';
import { ApiHata } from './hatalar';

/* API yetki katmanı — lib/erisim.ts'in ÜSTÜNE ince bir kabuk.
   Karar veren hâlâ izinVar/izinliTesisIdleri; burada yalnız HTTP anlamı
   (403 kapsam_disi) ve "veri sızdırmama" kuralı uygulanır. */

/** Okuma kapsamı: null = tüm tesisler. Boş küme => modülde okuma izni yok. */
export function okumaKapsami(k: AktifKullanici, modul: Modul): string[] | null {
  const idler = izinliTesisIdleri(k, modul);
  if (idler !== null && idler.length === 0) {
    throw new ApiHata('kapsam_disi', `Bu anahtarın ${modul} modülünde okuma izni yok`);
  }
  return idler;
}

/** İstenen tesis kapsam içinde mi? Değilse 403 — 404 DEĞİL, ama gövdede
    kayıt yok: varlığın olup olmadığı sızmaz. */
export function tesisKapsamda(kapsam: string[] | null, tesisId: string | null): boolean {
  if (tesisId === null) return kapsam === null;
  return kapsam === null || kapsam.includes(tesisId);
}

export function tesisKapsamZorunlu(kapsam: string[] | null, tesisId: string | null): void {
  if (!tesisKapsamda(kapsam, tesisId)) {
    throw new ApiHata('kapsam_disi', 'İstenen santral bu anahtarın kapsamı dışında');
  }
}

/**
 * Yazma izni. tesisId null ise KAPSAMSIZ (global) yazma denenir; tesise
 * kısıtlı bir rol bunu geçemez — izinVar'ın kapsamUyar kuralı gereği
 * `{}` ile `{tesisId: null}` aynı şey DEĞİLDİR.
 */
export function yazmaIzniVar(k: AktifKullanici, modul: Modul, tesisId: string | null): boolean {
  return izinVar(k, modul, 'yazma', tesisId ? { tesisId } : {});
}

export function yazmaIzniZorunlu(k: AktifKullanici, modul: Modul, tesisId: string | null): void {
  if (!yazmaIzniVar(k, modul, tesisId)) {
    throw new ApiHata(
      'kapsam_disi',
      tesisId
        ? 'Hedef santral bu anahtarın yazma kapsamı dışında'
        : `Bu anahtarın ${modul} modülünde santral kapsamı olmayan yazma izni yok`,
    );
  }
}

/**
 * Modül düzeyinde herhangi bir yazma izni var mı? (kapsamdan bağımsız ön kontrol
 * — boş gövdeli istek bile yetkisiz modülde 403 alsın diye.)
 * izinVar'ı yeniden kullanır; paralel bir izin tablosu tutmaz.
 */
export function modulYazmaVar(k: AktifKullanici, modul: Modul): boolean {
  if (izinVar(k, modul, 'yazma')) return true;
  const tesisler = new Set(
    k.yetkiler.map((y) => y.tesisId).filter((t): t is string => typeof t === 'string'),
  );
  for (const t of tesisler) if (izinVar(k, modul, 'yazma', { tesisId: t })) return true;
  return false;
}

export function modulYazmaZorunlu(k: AktifKullanici, modul: Modul): void {
  if (!modulYazmaVar(k, modul)) {
    throw new ApiHata('kapsam_disi', `Bu anahtarın ${modul} modülünde yazma izni yok`);
  }
}
