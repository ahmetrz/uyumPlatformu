'use client';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { Im, type Durum } from './temel';

/* ═══════════════════════════════════════════════════════════════════════
   ABACUS TABLOLARI

   İki gramer, üç yönde farklı malzeme:
   · `Tablo`  — kütük satırı. Sol kenar durumun ŞİDDETİNİ taşır, konu
                sütununun altında OLGU yazar ("yamasız", "yedek yok").
                Prototiplerde sarmalayıcı kart, zebra ve satır içi eylem
                düğmesi YOK; eylemler detay panelinde yaşar.
   · `Matris` — kesişim ızgarası. Hücrede YALNIZ glif bulunur, asla metin;
                satırın en kötü hücresi bir kademe büyür.

   Satır bir DÜĞMEDİR ve seçim `aria-pressed` ile taşınır: `aria-selected`
   düğme rolünde geçersizdir (ölçüldü — eslint jsx-a11y bunu yakalıyor). */

export type Kolon = {
  baslik?: string;
  /** grid-template-columns parçası */
  genislik: string;
  sag?: boolean;
  /** dar bantta düşer — kritik bilgi ikincil OLAMAZ */
  ikincil?: boolean;
  siraAnahtari?: string;
};

export type Sirala = {
  anahtar: string;
  yon: 'artan' | 'azalan';
  degistir: (anahtar: string) => void;
};

export type Satir = {
  id: string;
  durum: Durum;
  konu: ReactNode;
  alt?: ReactNode;
  hucreler: ReactNode[];
  kenar?: Durum;
};

function Baslik({ ad, anahtar, sag, ikincil, sirala }: {
  ad: string; anahtar?: string; sag?: boolean; ikincil?: boolean; sirala?: Sirala;
}) {
  const sinif = `kolonbas${sag ? ' sag' : ''}${ikincil ? ' ikincil-k' : ''}`;
  if (!sirala || !anahtar) return <span className={sinif}>{ad}</span>;
  const etkin = sirala.anahtar === anahtar;
  /* İşaret DIŞ sarmalayıcıya da gider: sıralanabilir başlık ayrı bir
     span'a sarılıdır ve dar ekranda gizlenmezse başlık satırı
     hücrelerden bir kolon kayar (ölçüldü). */
  return (
    <span role="columnheader"
      className={`${sag ? 'sag' : ''}${ikincil ? ' ikincil-k' : ''}`.trim() || undefined}
      aria-sort={etkin ? (sirala.yon === 'artan' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`kolonbas sirali${etkin ? ' etkin' : ''}`}
        aria-label={`${ad} · ${etkin && sirala.yon === 'azalan' ? 'azalan' : 'artan'} sırala`}
        onClick={() => sirala.degistir(anahtar)}>
        {ad}<span aria-hidden className="yon">{etkin && sirala.yon === 'azalan' ? '▾' : '▴'}</span>
      </button>
    </span>
  );
}

export function Tablo({
  kolonlar, satirlar, secili, sec, sik = false, kuyruk, dipNot,
  konuBasligi = 'Konu', sirala,
}: {
  kolonlar: Kolon[];
  satirlar: Satir[];
  secili?: string | null;
  sec?: (id: string) => void;
  sik?: boolean;
  kuyruk?: { metin: string; ac?: () => void } | null;
  dipNot?: string;
  konuBasligi?: string;
  sirala?: Sirala;
}) {
  const sablon = ['18px', 'minmax(0, 1fr)', ...kolonlar.map((k) => k.genislik)].join(' ');
  const darSablon = ['18px', 'minmax(0, 1fr)',
    ...kolonlar.filter((k) => !k.ikincil).map((k) => k.genislik)].join(' ');
  const stil = { '--kolon': sablon, '--kolon-dar': darSablon } as CSSProperties;
  const basliklarVar = kolonlar.some((k) => k.baslik);

  return (
    <div className={`ab-tablo${sik ? ' sik' : ''}`} style={stil}>
      {basliklarVar && (
        <div className="bas">
          <span />
          <Baslik ad={konuBasligi} anahtar="konu" sirala={sirala} />
          {kolonlar.map((k, i) => (
            <Baslik key={i} ad={k.baslik ?? ''} anahtar={k.siraAnahtari}
              sag={k.sag} ikincil={k.ikincil} sirala={sirala} />
          ))}
        </div>
      )}

      {satirlar.map((s) => (
        <button key={s.id} type="button"
          aria-pressed={secili === s.id}
          className={`satir${s.kenar ? ` d-${s.kenar}` : ''}`}
          onClick={() => sec?.(s.id)}>
          <Im durum={s.durum} />
          <span className="konu">
            {s.konu}
            {s.alt && <span className="alt">{s.alt}</span>}
          </span>
          {s.hucreler.map((h, i) => (
            <span key={i}
              className={`${kolonlar[i]?.sag ? 'sag ' : ''}${kolonlar[i]?.ikincil ? 'ikincil' : ''}`.trim()
                || undefined}>{h}</span>
          ))}
        </button>
      ))}

      {kuyruk && (
        <button type="button" className="satir kuyruk" onClick={kuyruk.ac}
          style={{ gridTemplateColumns: '18px minmax(0, 1fr)' }}>
          <span />
          <span className="konu">{kuyruk.metin}</span>
        </button>
      )}

      {dipNot && <p className="mono dip">{dipNot}</p>}
    </div>
  );
}

/* ── Matris ───────────────────────────────────────────────────────────
   `c-compliance` grameri: hücrede YALNIZ glif bulunur, asla metin;
   satırın en kötü hücresi bir kademe büyür ve sakin satırlar arkaya
   çekilir. Sütun sayısı veriden gelir (`--kolon-sayisi`).

   `durum === null` KAPSAM DIŞIDIR, "bilinmeyen" değildir: hücre boş
   kalmaz, kapsam dışı çizgisini alır ve erişilebilir adı nedeni söyler
   (UNKNOWN ≠ OUT OF SCOPE ≠ ZERO). */

export type MatrisKolonu = { ad: string; yol?: string };

export type MatrisSatiri = {
  id: string;
  ad: string;
  alt: string;
  hucreler: { durum: Durum | null; ipucu: string }[];
  sakin?: boolean;
  /** satır etiketinin hedefi; hücre tıklaması detayı açmaya devam eder */
  yol?: string;
};

export function Matris({
  kolonBasliklari, satirlar, secili, sec, dipNot, konuBasligi = 'Konu',
}: {
  kolonBasliklari: (string | MatrisKolonu)[];
  satirlar: MatrisSatiri[];
  secili?: string | null;
  sec?: (satirId: string, kolon: number) => void;
  dipNot?: string;
  konuBasligi?: string;
}) {
  const stil = { '--kolon-sayisi': kolonBasliklari.length } as CSSProperties;
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
    <div className="ab-matris" style={stil}>
      <div className="bas">
        <span className="kolonbas">{konuBasligi}</span>
        {kolonBasliklari.map((b) => {
          const k = kolon(b);
          return (
            <span key={k.ad} className="kolonbas kesik">
              {k.yol ? <Link href={k.yol}>{k.ad}</Link> : k.ad}
            </span>
          );
        })}
      </div>

      {satirlar.map((s) => {
        const kotu = enKotuIndeks(s.hucreler);
        return (
          <div key={s.id}
            className={`satir${s.sakin ? ' sakin' : ''}${secili === s.id ? ' secili' : ''}`}>
            {s.yol ? (
              <Link href={s.yol} className="ad">
                <span className="baslik">{s.ad}</span>
                <span className="mono alt">{s.alt}</span>
              </Link>
            ) : (
              <button type="button" className="ad" onClick={() => sec?.(s.id, 0)}>
                <span className="baslik">{s.ad}</span>
                <span className="mono alt">{s.alt}</span>
              </button>
            )}
            {s.hucreler.map((h, i) => (
              <button key={i} type="button" className="hucre"
                aria-expanded={secili === s.id ? undefined : undefined}
                onClick={() => sec?.(s.id, i)}>
                {h.durum
                  ? <Im durum={h.durum} enKotu={i === kotu} ad={h.ipucu} />
                  : <span className="ab-glif g-disi" role="img" aria-label={h.ipucu} />}
              </button>
            ))}
          </div>
        );
      })}

      {dipNot && <p className="mono dip">{dipNot}</p>}
    </div>
  );
}

/* ── Genişleyen satır ─────────────────────────────────────────────────
   Kontrol aileleri ve santral katmanları. Aynı anda TEK aile açık kalır;
   `<details name>` bunu tarayıcıya yaptırır. `c-compliance`ın satır içi
   açılımıyla aynı fikir: detay ÇEKMECEDE değil, yerinde açılır. */
export function GenisleyenSatir({
  ad, adet, durum, grup, cocuklar, varsayilanAcik = false,
}: {
  ad: string;
  adet: string;
  durum: Durum;
  grup: string;
  cocuklar: ReactNode;
  varsayilanAcik?: boolean;
}) {
  return (
    <details className="ab-genisleyen" name={grup} open={varsayilanAcik}>
      <summary>
        <span className="ad">{ad}</span>
        <span className="mono adet">{adet}</span>
        <Im durum={durum} />
        <span className="ok" aria-hidden>▸</span>
      </summary>
      <div className="cocuk">{cocuklar}</div>
    </details>
  );
}
