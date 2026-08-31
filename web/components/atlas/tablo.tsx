'use client';
import type { CSSProperties, ReactNode } from 'react';
import { Im, Ok, type Durum } from './temel';

/* Tablolar — 02-components §5, §6, §7.
   Tek bileşen, üç yapılandırma. Sarmalayıcı kart YOK, zebra YOK,
   satır içinde eylem düğmesi YOK (eylemler çekmecede yaşar). */

export type Kolon = {
  baslik?: string;
  /** grid-template-columns parçası */
  genislik: string;
  sag?: boolean;
  /** dar alanda (çekmece açıkken) düşer — kritik bilgi ikincil olamaz */
  ikincil?: boolean;
};

export type Satir = {
  id: string;
  durum: Durum;
  konu: ReactNode;
  /** kayıt kimliği + en fazla iki olgu */
  alt?: ReactNode;
  /** kolon sırasına göre hücreler (konu ve chevron hariç) */
  hucreler: ReactNode[];
  /** seçimi sürükleyen durum — seçili satırın sol kenar rengi */
  kenar?: Durum;
};

export function Tablo({
  kolonlar,
  satirlar,
  secili,
  sec,
  sik = false,
  /** sağlıklı kalanı toplayan son satır */
  kuyruk,
  dipNot,
}: {
  kolonlar: Kolon[];
  satirlar: Satir[];
  secili?: string | null;
  sec?: (id: string) => void;
  sik?: boolean;
  kuyruk?: { metin: string; ac?: () => void } | null;
  dipNot?: string;
}) {
  // marker · konu · …hücreler · chevron
  const sablon = ['22px', '1fr', ...kolonlar.map((k) => k.genislik), '26px'].join(' ');
  const darSablon = ['22px', '1fr',
    ...kolonlar.filter((k) => !k.ikincil).map((k) => k.genislik), '26px'].join(' ');
  const stil = { '--kolonlar': sablon, '--kolonlar-dar': darSablon } as CSSProperties;
  const basliklarVar = kolonlar.some((k) => k.baslik);

  return (
    <div className={`tbl${sik ? ' sik' : ''}`} style={stil} role="table">
      {basliklarVar && (
        <div className="tbl-bas" role="row">
          <span />
          <span className="t-colhead">Konu</span>
          {kolonlar.map((k, i) => (
            <span key={i}
              className={`t-colhead${k.sag ? ' tbl-sag' : ''}${k.ikincil ? ' tbl-ikincil' : ''}`}>
              {k.baslik ?? ''}
            </span>
          ))}
          <span />
        </div>
      )}

      {satirlar.map((s) => {
        const secim = secili === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="row"
            aria-selected={secim}
            className={`tbl-satir${s.kenar ? ` s-${s.kenar}` : ''}`}
            onClick={() => sec?.(s.id)}
          >
            <Im durum={s.durum} />
            <span role="cell" style={{ minWidth: 0 }}>
              <span className="tbl-konu">{s.konu}</span>
              {s.alt && <span className="tbl-alt">{s.alt}</span>}
            </span>
            {s.hucreler.map((h, i) => (
              <span key={i} role="cell"
                className={`tbl-hucre${kolonlar[i]?.sag ? ' tbl-sag' : ''}` +
                  `${kolonlar[i]?.ikincil ? ' tbl-ikincil' : ''}`}>{h}</span>
            ))}
            <Ok />
          </button>
        );
      })}

      {/* Kuyruk satırı kolon düşürmeden etkilenmesin diye kendi şablonunu taşır. */}
      {kuyruk && (
        <button type="button" className="tbl-satir tbl-kuyruk" onClick={kuyruk.ac}
          style={{ gridTemplateColumns: '22px 1fr 26px' }}>
          <span />
          <span className="tbl-hucre">{kuyruk.metin}</span>
          <span className="tbl-ok" aria-hidden>▾</span>
        </button>
      )}

      {dipNot && <p className="dip-not tbl-dip">{dipNot}</p>}
    </div>
  );
}

/* ═══ 7 · MatrixTable (santral × kontrol) ═══════════════════════════════
   Hücrelerde YALNIZ StatusMarker bulunur — asla metin. Satırın en kötü
   hücresi bir kademe büyük ve haleli. Sakin satırlar %58 opaklıkta. */

export type MatrisSatiri = {
  id: string;
  ad: string;
  alt: string;
  hucreler: { durum: Durum; ipucu: string }[];
  sakin?: boolean;
};

export function Matris({
  kolonBasliklari,
  satirlar,
  secili,
  sec,
  dipNot,
}: {
  kolonBasliklari: string[];
  satirlar: MatrisSatiri[];
  secili?: string | null;
  sec?: (satirId: string, kolon: number) => void;
  dipNot?: string;
}) {
  const stil = { '--kolon-sayisi': kolonBasliklari.length } as CSSProperties;
  // Satırın en kötüsü: kritik > kısmi > bilinmeyen sırasıyla ilk eşleşen.
  const enKotuIndeks = (h: MatrisSatiri['hucreler']) => {
    for (const d of ['bd', 'md', 'unk'] as Durum[]) {
      const i = h.findIndex((x) => x.durum === d);
      if (i >= 0) return i;
    }
    return -1;
  };

  return (
    <div className="mtx" style={stil} role="table">
      <div className="mtx-bas" role="row">
        <span className="t-colhead">Santral</span>
        {kolonBasliklari.map((b) => (
          <span key={b} className="t-colhead bslk">{b}</span>
        ))}
      </div>

      {satirlar.map((s) => {
        const kotu = enKotuIndeks(s.hucreler);
        return (
          <div key={s.id} role="row"
            className={`mtx-satir${s.sakin ? ' sakin' : ''}`}
            aria-selected={secili === s.id}
            style={{ display: 'grid' }}>
            <button type="button" style={{ background: 'none', border: 0, textAlign: 'left',
              font: 'inherit', color: 'inherit', cursor: 'pointer', padding: 0 }}
              onClick={() => sec?.(s.id, 0)}>
              <span className="mtx-ad">{s.ad}</span>
              <span className="mtx-alt">{s.alt}</span>
            </button>
            {s.hucreler.map((h, i) => (
              <button key={i} type="button" className="mtx-hucre" title={h.ipucu}
                onClick={() => sec?.(s.id, i)}
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 'var(--s8) 0' }}>
                <Im durum={h.durum} enKotu={i === kotu} ad={h.ipucu} />
              </button>
            ))}
          </div>
        );
      })}

      {dipNot && <p className="dip-not">{dipNot}</p>}
    </div>
  );
}

/* ═══ 11 · ExpandableRow ════════════════════════════════════════════════
   Kontrol aileleri ve santral katmanları. Varsayılan olarak aynı anda TEK
   aile açık; <details name> ile tarayıcı bunu kendisi sağlar. */

export function GenisleyenSatir({
  ad, adet, durum, grup, cocuklar, varsayilanAcik = false,
}: {
  ad: string;
  adet: string;
  durum: Durum;
  /** aynı grubun üyelerinden yalnız biri açık kalır */
  grup: string;
  cocuklar: ReactNode;
  varsayilanAcik?: boolean;
}) {
  return (
    <details className="gen-satir" name={grup} open={varsayilanAcik}>
      <summary>
        <span className="ad">{ad}</span>
        <span className="adet">{adet}</span>
        <Im durum={durum} />
        <span className="ok" aria-hidden>▸</span>
      </summary>
      <div className="gen-cocuk">{cocuklar}</div>
    </details>
  );
}
