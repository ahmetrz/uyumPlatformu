'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Sonuc = { ok: true } | { ok: false; hata: string };

/** Eylem çağrısı kalıbı: bekleme durumu + hata + başarılıysa sunucu verisini tazele. */
export function useEylem() {
  const router = useRouter();
  const [bekliyor, baslat] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  function calistir(is: () => Promise<Sonuc>, sonra?: () => void) {
    setHata(null);
    baslat(async () => {
      const sonuc = await is();
      if (sonuc.ok) { sonra?.(); router.refresh(); }
      else setHata(sonuc.hata);
    });
  }
  return { bekliyor, hata, setHata, calistir };
}
