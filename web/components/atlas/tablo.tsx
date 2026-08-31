'use client';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
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
  /** verilirse başlık sıralama düğmesine dönüşür */
  siraAnahtari?: string;
};

export type Sirala = {
  anahtar: string;
  yon: 'artan' | 'azalan';
  degistir: (anahtar: string) => void;
};

/* Sıralama durumunu BAŞLIK HÜCRESİ taşır, tetikleyici içindeki düğmedir:
   düğmeye columnheader rolü verilirse düğme semantiği kaybolur. */
function TabloBasligi({ ad, anahtar, sag, ikincil, sirala }: {
  ad: string; anahtar?: string; sag?: boolean; ikincil?: boolean; sirala?: Sirala;
}) {
  const sinif = `t-colhead${sag ? ' tbl-sag' : ''}${ikincil ? ' tbl-ikincil' : ''}`;
  if (!sirala || !anahtar) return <span className={sinif}>{ad}</span>;
  const etkin = sirala.anahtar === anahtar;
  const dis = `${sag ? 'tbl-sag ' : ''}${ikincil ? 'tbl-ikincil' : ''}`.trim();
  return (
    <span role="columnheader" className={dis || undefined}
      aria-sort={etkin ? (sirala.yon === 'artan' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="t-colhead"
        aria-label={`${ad} · ${etkin && sirala.yon === 'azalan' ? 'azalan' : 'artan'} sırala`}
        onClick={() => sirala.degistir(anahtar)}
        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer',
          width: '100%', textAlign: sag ? 'right' : 'left',
          color: etkin ? 'var(--ink)' : undefined }}>
        {ad}
        <span aria-hidden style={{ marginLeft: 'var(--s6)',
          color: etkin ? 'var(--jes)' : 'transparent' }}>
          {etkin && sirala.yon === 'azalan' ? '▾' : '▴'}
        </span>
      </button>
    </span>
  );
}

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
  konuBasligi = 'Konu',
  sirala,
}: {
  kolonlar: Kolon[];
  satirlar: Satir[];
  secili?: string | null;
  sec?: (id: string) => void;
  sik?: boolean;
  kuyruk?: { metin: string; ac?: () => void } | null;
  dipNot?: string;
  /** konu kolonunun başlığı — ekranın kendi sözcüğü (BULGU, VARLIK, HESAP…) */
  konuBasligi?: string;
  /** kolon başlığından sıralama; anahtar 'konu' ya da Kolon.siraAnahtari */
  sirala?: Sirala;
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
          <TabloBasligi ad={konuBasligi} anahtar="konu" sirala={sirala} />
          {kolonlar.map((k, i) => (
            <TabloBasligi key={i} ad={k.baslik ?? ''} anahtar={k.siraAnahtari}
              sag={k.sag} ikincil={k.ikincil} sirala={sirala} />
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

/** Sütun başlığı: düz metin ya da bir rotaya açılan başlık (03-screens O1:
    sütun başlığına tıklayınca çerçeve detayı o ailede açılır). */
export type MatrisKolonu = { ad: string; yol?: string };

export type MatrisSatiri = {
  id: string;
  ad: string;
  alt: string;
  /** durum null → hücre BOŞ kalır: kapsam dışı, "bilinmeyen" DEĞİLDİR. */
  hucreler: { durum: Durum | null; ipucu: string }[];
  sakin?: boolean;
  /** satır etiketinin hedefi — verilirse etiket kayıt ekranına götürür,
      hücre tıklaması çekmeceyi açmaya devam eder (03-screens O1). */
  yol?: string;
};

export function Matris({
  kolonBasliklari,
  satirlar,
  secili,
  sec,
  dipNot,
  konuBasligi = 'Santral',
}: {
  kolonBasliklari: (string | MatrisKolonu)[];
  satirlar: MatrisSatiri[];
  secili?: string | null;
  sec?: (satirId: string, kolon: number) => void;
  dipNot?: string;
  /* Konu kolonunun başlığı sabit 'Santral' yazılıydı; matrisin satırları
     her ekranda santral DEĞİL. Çapraz eşleştirmede satırlar maddedir ve
     başlık düpedüz yanlış bilgi veriyordu. */
  konuBasligi?: string;
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
  const kolon = (b: string | MatrisKolonu): MatrisKolonu =>
    (typeof b === 'string' ? { ad: b } : b);

  return (
    <div className="mtx" style={stil} role="table">
      <div className="mtx-bas" role="row">
        <span className="t-colhead">{konuBasligi}</span>
        {kolonBasliklari.map((b) => {
          const k = kolon(b);
          return (
            <span key={k.ad} className="t-colhead bslk">
              {k.yol ? <Link href={k.yol}>{k.ad}</Link> : k.ad}
            </span>
          );
        })}
      </div>

      {satirlar.map((s) => {
        const kotu = enKotuIndeks(s.hucreler);
        return (
          <div key={s.id} role="row"
            className={`mtx-satir${s.sakin ? ' sakin' : ''}`}
            aria-selected={secili === s.id}
            style={{ display: 'grid' }}>
            {s.yol ? (
              <Link href={s.yol} style={{ minWidth: 0 }}>
                <span className="mtx-ad">{s.ad}</span>
                <span className="mtx-alt">{s.alt}</span>
              </Link>
            ) : (
              <button type="button" style={{ background: 'none', border: 0, textAlign: 'left',
                font: 'inherit', color: 'inherit', cursor: 'pointer', padding: 0 }}
                onClick={() => sec?.(s.id, 0)}>
                <span className="mtx-ad">{s.ad}</span>
                <span className="mtx-alt">{s.alt}</span>
              </button>
            )}
            {s.hucreler.map((h, i) => (
              <button key={i} type="button" className="mtx-hucre" title={h.ipucu}
                onClick={() => sec?.(s.id, i)}
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 'var(--s8) 0' }}>
                {/* Kapsam dışı hücre boş kalır; erişilebilir ad nedeni söyler. */}
                {h.durum
                  ? <Im durum={h.durum} enKotu={i === kotu} ad={h.ipucu} />
                  : <span role="img" aria-label={h.ipucu} />}
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
