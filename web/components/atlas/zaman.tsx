'use client';
import type { CSSProperties } from 'react';
import type { Durum } from './temel';

/* 14 · Timeline — 02-components §14.
   İki varyant tek iskelet paylaşır: 1px eksen, bakır "bugün" tırnağı,
   dönem etiketleri eksenin ÜSTÜNDE, kartlar eksenin ALTINDA ayrılmış
   şeritte. Kural: etiket ve kartlar asla aynı şeridi paylaşmaz; kart
   genişliği bir sonraki dönem tırnağını geçmez.

   Konumlar statik yerleşimdir — animasyon edilmez (04 §4). */

export type ZamanKarti = {
  id: string;
  ad: string;
  /** sağa yaslı geri sayım */
  geri: string;
  kapsam: string;
  durum: Durum;
  /** 0–1 arası eksen üzerindeki oran */
  konum: number;
};

export function ZamanCizelgesi({
  donemler, kartlar, bugun, tikla,
}: {
  donemler: { ad: string; konum: number }[];
  kartlar: ZamanKarti[];
  /** 0–1; verilmezse tırnak çizilmez */
  bugun?: number;
  tikla?: (id: string) => void;
}) {
  return (
    <div className="zaman-atlas">
      {donemler.map((d) => (
        <span key={d.ad} className="donem" style={{ left: `${d.konum * 100}%` }}>{d.ad}</span>
      ))}
      <span className="eksen" />
      {bugun != null && <span className="bugun" style={{ left: `${bugun * 100}%` }} />}
      {kartlar.map((k) => (
        <button
          key={k.id}
          type="button"
          className={`zaman-kart s-${k.durum}`}
          style={{ left: `min(${k.konum * 100}%, calc(100% - 208px))` } as CSSProperties}
          onClick={() => tikla?.(k.id)}
        >
          <span className="geri">{k.geri}</span>
          <span className="ad">{k.ad}</span>
          <span className="kapsam">{k.kapsam}</span>
        </button>
      ))}
    </div>
  );
}

/* EOL ufku: kartlar eksenin altında/üstünde dönüşümlü, 3px SOL kenar,
   geçmiş kartlar kritik renkte, gelecek kartlar %80 opaklıkta. */

export function OmurUfku({
  kartlar, tikla,
}: {
  kartlar: (Omit<ZamanKarti, 'durum'> & { gecmis: boolean })[];
  tikla?: (id: string) => void;
}) {
  return (
    <div className="omur-serit">
      <span className="eksen" style={{ position: 'absolute', left: 0, right: 0, top: 93,
        height: 1, background: 'var(--hr2)' }} />
      {kartlar.map((k, i) => (
        <button
          key={k.id}
          type="button"
          className={`omur-kart ${k.gecmis ? 'gecmis' : 'gelecek'}`}
          style={{ left: `min(${k.konum * 100}%, calc(100% - 196px))`,
            top: i % 2 === 0 ? 0 : 108 }}
          onClick={() => tikla?.(k.id)}
        >
          <span className="geri" style={{ float: 'right', fontFamily: 'var(--mo)',
            fontSize: 'var(--t-code-lg)', color: k.gecmis ? 'var(--bd)' : 'var(--i3)' }}>
            {k.geri}
          </span>
          <span className="ad" style={{ fontSize: 13, fontWeight: 600 }}>{k.ad}</span>
          <span className="kapsam" style={{ display: 'block', marginTop: 'var(--s6)',
            fontFamily: 'var(--mo)', fontSize: 'var(--t-code)', color: 'var(--i3)' }}>
            {k.kapsam}
          </span>
        </button>
      ))}
    </div>
  );
}
