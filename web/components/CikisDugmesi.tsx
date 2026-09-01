'use client';
import { useTransition } from 'react';
import { cikisYap } from '@/lib/girisEylemleri';

export default function CikisDugmesi() {
  const [bekliyor, baslat] = useTransition();
  /* `btn kucuk` eski tasarımın sınıfıydı, hiçbir CSS'te tanımı kalmadı:
     düğme üç kabukta da tarayıcı varsayılanı (açık gri kutu) olarak
     çiziliyordu (ölçüldü, koyu C başlığında göze battı). Ortak düğme
     grameri `ab-dugme`. */
  return (
    <button type="button" className="ab-dugme" disabled={bekliyor}
      onClick={() => baslat(async () => { await cikisYap(); })}>
      Çıkış
    </button>
  );
}
