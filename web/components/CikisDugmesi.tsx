'use client';
import { useTransition } from 'react';
import { cikisYap } from '@/lib/girisEylemleri';

export default function CikisDugmesi() {
  const [bekliyor, baslat] = useTransition();
  return (
    <button className="btn kucuk" disabled={bekliyor}
      onClick={() => baslat(async () => { await cikisYap(); })}>
      Çıkış
    </button>
  );
}
