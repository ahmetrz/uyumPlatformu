'use client';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

type Guncelleme<T> = T | ((onceki: T) => T);
const coz = <T,>(g: Guncelleme<T>, onceki: T): T => (typeof g === 'function' ? (g as (o: T) => T)(onceki) : g);

/* ═══ URL DURUMU — bağlam korunumu ═══════════════════════════════════
   Kütük ekranlarında mercek, süzgeç, sıralama ve seçim ADRESTE yaşar:
   yenilemede kaybolmaz, bağlantı paylaşılabilir, geri tuşu kirlenmez
   (`history.replaceState`, gezinme yok).

   Statik dışa aktarımda sunucu `searchParams` okuyamaz; bu yüzden
   `useSearchParams` yerine History API köprüsü kullanılır:
   - Sunucu ve ilk istemci çizimi VARSAYILANI verir (hydration eşit).
   - Bağlanınca `useSyncExternalStore` adresten okur; React uyumsuzluğu
     hydration sonrası tek geçişte kapatır (efekt içinde setState yok).
   - Yazma: anahtar varsayılana eşitse adresten SİLİNİR — temiz URL.

   `useState`'in yerine geçer: `const [mercek, setMercek] = useUrlDurumu('mercek', 'acik')`. */

const DINLEYICILER = new Set<() => void>();
let ILK_ABONELIK = true;

function bildir() { DINLEYICILER.forEach((d) => d()); }

function abone(d: () => void) {
  DINLEYICILER.add(d);
  if (ILK_ABONELIK && typeof window !== 'undefined') {
    ILK_ABONELIK = false;
    window.addEventListener('popstate', bildir);
  }
  return () => { DINLEYICILER.delete(d); };
}

function oku(anahtar: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(anahtar);
}

/** Adrese yaz; `null`/varsayılan → anahtar silinir. Gezinme üretmez. */
export function urlDurumuYaz(anahtar: string, deger: string | null, varsayilan?: string | null) {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams(window.location.search);
  if (deger === null || deger === '' || deger === varsayilan) p.delete(anahtar);
  else p.set(anahtar, deger);
  const s = p.toString();
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${s ? `?${s}` : ''}${window.location.hash}`);
  bildir();
}

/** Tek anahtarlı, string değerli URL durumu. `gecerli` verilirse adresteki
    tanınmayan değer varsayılana düşer (bozuk bağlantı ekranı bozmaz). */
export function useUrlDurumu<T extends string>(
  anahtar: string, varsayilan: T, gecerli?: readonly T[],
): [T, (d: Guncelleme<T>) => void] {
  const deger = useSyncExternalStore(
    abone,
    () => {
      const v = oku(anahtar);
      if (v === null) return varsayilan;
      if (gecerli && !gecerli.includes(v as T)) return varsayilan;
      return v as T;
    },
    () => varsayilan,
  );
  const yaz = useCallback(
    (d: Guncelleme<T>) => urlDurumuYaz(anahtar, coz(d, (oku(anahtar) as T | null) ?? varsayilan), varsayilan),
    [anahtar, varsayilan],
  );
  return [deger, yaz];
}

/** Boş olabilen (null) URL durumu — tesis/sahip/önem gibi ikincil süzgeçler ve seçim. */
export function useUrlDurumuBos(anahtar: string): [string | null, (d: Guncelleme<string | null>) => void] {
  const deger = useSyncExternalStore(abone, () => oku(anahtar), () => null);
  const yaz = useCallback(
    (d: Guncelleme<string | null>) => urlDurumuYaz(anahtar, coz(d, oku(anahtar)), null),
    [anahtar],
  );
  return [deger, yaz];
}

/** Sıralama: `anahtar:yon` biçiminde tek parametre (`?sira=puan:azalan`). */
export function useUrlSira<A extends string>(
  varsayilan: { anahtar: A; yon: 'artan' | 'azalan' }, gecerli?: readonly A[], param = 'sira',
): [Sira<A>, (s: Guncelleme<Sira<A>>) => void] {
  const varsayilanMetin = `${varsayilan.anahtar}:${varsayilan.yon}`;
  const metin = useSyncExternalStore(
    abone,
    () => oku(param) ?? varsayilanMetin,
    () => varsayilanMetin,
  );
  // Çağıran varsayılanı satır içi nesne verir; kimliği metinden türetip sabitleriz.
  const sabit = useMemo<Sira<A>>(() => {
    const [a, y] = varsayilanMetin.split(':');
    return { anahtar: a as A, yon: y === 'azalan' ? 'azalan' : 'artan' };
  }, [varsayilanMetin]);
  const deger = useMemo(() => siraCoz(metin, sabit, gecerli), [metin, sabit, gecerli]);
  const yaz = useCallback(
    (s: Guncelleme<Sira<A>>) => {
      const yeni = coz(s, siraCoz(oku(param) ?? varsayilanMetin, sabit, gecerli));
      urlDurumuYaz(param, `${yeni.anahtar}:${yeni.yon}`, varsayilanMetin);
    },
    [param, varsayilanMetin, sabit, gecerli],
  );
  return [deger, yaz];
}

type Sira<A extends string> = { anahtar: A; yon: 'artan' | 'azalan' };

function siraCoz<A extends string>(metin: string, varsayilan: Sira<A>, gecerli?: readonly A[]): Sira<A> {
  const [a, y] = metin.split(':');
  const gecerliMi = (!gecerli || gecerli.includes(a as A)) && (y === 'artan' || y === 'azalan');
  return gecerliMi ? { anahtar: a as A, yon: y as 'artan' | 'azalan' } : varsayilan;
}
