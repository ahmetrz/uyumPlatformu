'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { Im, DURUM_SOZU, type Durum } from './temel';

/* 10 · Drawer — 02-components §10.
   420px, surface/sunken, sol kenarda 1px, yarıçap yok, xl'de gölge yok.
   Detay ASLA modalda açılmaz (06 §B4). Esc ve ✕ kapatır; kapanış hiçbir
   şeyi commit etmez. İçerik 40ms kademeyle belirir (04 §6).

   Kabuk gridi CSS :has() ile açılır — bu bileşen <aside class="cekmece">
   olarak render edildiğinde ikinci kolon kendiliğinden oluşur. */

export function Cekmece({
  kod,
  kapat,
  children,
}: {
  /** 9.5px mono kayıt kimliği */
  kod: string;
  kapat: () => void;
  children: ReactNode;
}) {
  const kokRef = useRef<HTMLElement | null>(null);
  const oncekiOdak = useRef<Element | null>(null);

  useEffect(() => {
    oncekiOdak.current = document.activeElement;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') kapat(); };
    document.addEventListener('keydown', esc);
    // Odağı çekmeceye taşı; kapanınca çağırana geri ver.
    kokRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', esc);
      (oncekiOdak.current as HTMLElement | null)?.focus?.();
    };
  }, [kapat]);

  return (
    <aside className="ab-panel" ref={kokRef} tabIndex={-1}
      aria-label={`Kayıt detayı ${kod}`}>
      <div className="ust">
        <span className="kod">{kod}</span>
        <button type="button" className="ab-dugme" onClick={kapat} aria-label="Kapat">✕</button>
      </div>
      <div className="govde">{children}</div>
    </aside>
  );
}

/** Kimlik bloğu — durumun KELİMEYLE yazıldığı tek yer (06 §A2). */
export function CekmeceKimlik({
  durum, soz, baslik, cumle,
}: { durum: Durum; soz?: string; baslik: ReactNode; cumle?: string }) {
  return (
    <div className="ab-panel-blok">
      <div className="ust">
        <Im durum={durum} />
        <span className="soz" style={{ color: `var(--${durum === 'unk' ? 'unk' : durum})` }}>
          {soz ?? DURUM_SOZU[durum]}
        </span>
      </div>
      <h2 className="ab-bolum-basligi" style={{ margin: 0 }}>{baslik}</h2>
      {cumle && <p style={{ margin: 'var(--s10) 0 0', fontSize: 'var(--t-cell)',
        color: 'var(--i2)' }}>{cumle}</p>}
    </div>
  );
}

/** Alan listesi — 4–6 alan, etiket/değer çifti. */
export function CekmeceAlanlar({
  alanlar,
}: { alanlar: { etiket: string; deger: ReactNode; durum?: Durum }[] }) {
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s22)' }}>
      {alanlar.map((a) => (
        <div key={a.etiket} className="ab-panel-alan">
          <span className="etiket">{a.etiket}</span>
          <span className="deger" style={a.durum ? { color: `var(--${a.durum})` } : undefined}>
            {a.deger}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Bağlı kayıtlar — zincir. Süren proje/risk bakır kenar alır. */
export function CekmeceBagli({
  baslik = 'Zincir', kayitlar,
}: {
  baslik?: string;
  kayitlar: { id: string; kod: string; alt: string; yol: string; suren?: boolean }[];
}) {
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>{baslik}</p>
      <div className="ab-panel-zincir">
        {kayitlar.map((k) => (
          <Link key={k.id} href={k.yol} className={k.suren ? 'suren' : undefined}>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--t-cell)', fontWeight: 600 }}>{k.kod}</span>
              <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--veri)',
                fontSize: 'var(--t-label)', color: 'var(--i3)' }}>{k.alt}</span>
            </span>
            <span className="ab-ok" style={{ marginLeft: 'auto' }} aria-hidden>▸</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Eylemler + denetim izi sonucunu bildiren dip not. */
export function CekmeceEylemler({
  birincil, ikincil, dipNot,
}: { birincil?: ReactNode; ikincil?: ReactNode; dipNot?: string }) {
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s26)' }}>
      {birincil}
      {ikincil && <div style={{ marginTop: 'var(--s10)' }}>{ikincil}</div>}
      {dipNot && <p className="ab-panel-dip" style={{ margin: 'var(--s16) 0 0' }}>{dipNot}</p>}
    </div>
  );
}
