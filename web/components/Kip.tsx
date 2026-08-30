'use client';
import { useCallback, useEffect, useRef } from 'react';

/** Aşamalı açığa çıkarma: derin detaylar sayfa değiştirmeden dialog'da açılır. */
export default function Kip({
  acik, kapat, baslik, ust, genis, children,
}: {
  acik: boolean; kapat: () => void; baslik: React.ReactNode;
  ust?: React.ReactNode; genis?: boolean; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (acik && !d.open) d.showModal();
    if (!acik && d.open) d.close();
  }, [acik]);

  const tikla = useCallback((e: React.MouseEvent) => {
    if (e.target === ref.current) kapat(); // zemin tıklaması
  }, [kapat]);

  return (
    <dialog ref={ref} className="kip" onClose={kapat} onClick={tikla}
      style={genis ? { width: 'min(980px, calc(100vw - 32px))' } : undefined}>
      <div className="kip-baslik">
        <div style={{ flex: 1, minWidth: 0 }}>
          {ust}
          <h3>{baslik}</h3>
        </div>
        <button className="kip-kapat" onClick={kapat} aria-label="Kapat">✕</button>
      </div>
      <div className="kip-icerik">{children}</div>
    </dialog>
  );
}
