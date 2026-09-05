'use client';
import { useSyncExternalStore } from 'react';
import { ARAMA_AC } from '@/components/KomutPaleti';

/* Komut paletinin görünür kapısı. Palet yalnız Ctrl/⌘+K ile açılıyordu:
   kısayolu bilmeyen ya da dokunmatik kullanıcı için arama YOKTU. Düğme
   paletin dinlediği olayı yayar; kısayol yanında yazılı durur, telefonda
   gizlenir (`.ab-ara-dugme .kisayol`).

   Platform etiketi dış kaynaktan (tarayıcı) okunur: sunucu anlık görüntüsü
   "Ctrl K", istemci Mac'te "⌘ K" — hidrasyon sonrası tek yeniden çizim. */
const abone = () => () => {};
const istemciKisayol = () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘ K' : 'Ctrl K');
const sunucuKisayol = () => 'Ctrl K';

export default function AramaDugmesi() {
  const kisayol = useSyncExternalStore(abone, istemciKisayol, sunucuKisayol);
  return (
    <button type="button" className="ab-dugme ab-ara-dugme"
      aria-keyshortcuts="Control+K Meta+K"
      onClick={() => window.dispatchEvent(new Event(ARAMA_AC))}>
      Ara
      <span className="kisayol" aria-hidden>{kisayol}</span>
    </button>
  );
}
