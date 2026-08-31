'use client';
import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/* Kapsam ve seçim URL'de yaşar (07 §Phase 2 çıkış kriteri):
   "deep-link + back restores selection", "every drill-in preserves plant scope".

   Neden URL: seçimi React state'inde tutarsak tarayıcı geri tuşu onu geri
   getiremez ve derin bağlantı paylaşılamaz. Arama parametresi ikisini de
   bedavaya çözer; Next.js geri gidişte kaydırma konumunu zaten korur.

   Sözleşme:
     ?sec=<id>       seçili kayıt — çekmeceyi açan tek kaynak
     ?tesis=<id>     santral kapsamı — drill-in boyunca taşınır
     ?cerceve=<kod>  çerçeve kapsamı — drill-in boyunca taşınır */

export const KAPSAM_ANAHTARLARI = ['tesis', 'cerceve'] as const;
export type KapsamAnahtari = (typeof KAPSAM_ANAHTARLARI)[number];

export function useKapsam() {
  const router = useRouter();
  const patika = usePathname();
  const parametreler = useSearchParams();

  const secili = parametreler.get('sec');
  const tesis = parametreler.get('tesis');
  const cerceve = parametreler.get('cerceve');

  /** Parametreleri günceller; null verilen anahtar silinir. */
  const yaz = useCallback(
    (degisiklik: Record<string, string | null>, secenek?: { degistir?: boolean }) => {
      const p = new URLSearchParams(parametreler.toString());
      for (const [k, v] of Object.entries(degisiklik)) {
        if (v === null || v === '') p.delete(k);
        else p.set(k, v);
      }
      const sorgu = p.toString();
      const hedef = sorgu ? `${patika}?${sorgu}` : patika;
      // Seçim değişimi geçmişe yazılır (geri tuşu seçimi kapatır);
      // kapsam değişimi mevcut girdiyi değiştirir (geçmişi kirletmez).
      if (secenek?.degistir) router.replace(hedef, { scroll: false });
      else router.push(hedef, { scroll: false });
    },
    [parametreler, patika, router],
  );

  const sec = useCallback((id: string | null) => yaz({ sec: id }), [yaz]);
  const kapat = useCallback(() => yaz({ sec: null }), [yaz]);

  /** Başka bir ekrana giderken kapsamı taşır — seçim taşınmaz. */
  const kapsamliYol = useCallback(
    (yol: string, ek?: Record<string, string>) => {
      const p = new URLSearchParams();
      for (const k of KAPSAM_ANAHTARLARI) {
        const v = parametreler.get(k);
        if (v) p.set(k, v);
      }
      for (const [k, v] of Object.entries(ek ?? {})) p.set(k, v);
      const sorgu = p.toString();
      return sorgu ? `${yol}?${sorgu}` : yol;
    },
    [parametreler],
  );

  return { secili, tesis, cerceve, sec, kapat, yaz, kapsamliYol };
}
