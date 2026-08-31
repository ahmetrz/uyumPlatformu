'use client';
import type { ReactNode } from 'react';
import { Metrikler, type Metrik, type Durum } from './temel';

/* Ekran iskeleti, FilterBar ve sekmeler — 02-components §4, §12
   ve 03-screens'in "paylaşılan varsayılanlar" başlığı. */

/** Başlık bloğu: eyebrow → başlık (tek kalın span) → sağa yaslı MetricRow. */
export function EkranBasligi({
  eyebrow, baslik, vurgu, vurguDurumu, metrikler, sag,
}: {
  eyebrow: string;
  baslik: string;
  /** başlıktaki tek kalın parça */
  vurgu?: string;
  /** vurgunun taşıdığı durum — kapatılamayan uyarılarda başlık da renk alır
      (03-screens O15: "metric and header carry state/critical") */
  vurguDurumu?: Durum;
  metrikler?: Metrik[];
  sag?: ReactNode;
}) {
  return (
    <header className="ekran-bas">
      <div className="sol">
        <p className="t-eyebrow" style={{ margin: '0 0 var(--s10)' }}>{eyebrow}</p>
        <h1 className="t-screen" style={{ margin: 0 }}>
          {vurgu ? (
            <><b style={vurguDurumu ? { color: `var(--${vurguDurumu})` } : undefined}>{vurgu}</b> {baslik}</>
          ) : baslik}
        </h1>
      </div>
      {metrikler && <Metrikler metrikler={metrikler} />}
      {sag}
    </header>
  );
}

/* ═══ 4 · FilterBar ═════════════════════════════════════════════════════
   Aktif filtre dolu ve KÖŞELİ; pasif olanlar SADECE METİN — pill yok,
   kenarlık yok. En fazla 5 görünür filtre + taşma + 2 kapsam kontrolü. */

export function Filtreler({
  secenekler, aktif, sec, tasma, kapsam,
}: {
  secenekler: { id: string; ad: string }[];
  aktif: string;
  sec: (id: string) => void;
  /** 5'ten fazlası "Diğer N ▾" altına iner */
  tasma?: { id: string; ad: string }[];
  kapsam?: ReactNode;
}) {
  const gorunur = secenekler.slice(0, 5);
  const kalan = tasma ?? secenekler.slice(5);
  return (
    <div className="filtreler-atlas">
      {gorunur.map((s) => (
        <button key={s.id} type="button" className="filtre"
          aria-pressed={aktif === s.id} onClick={() => sec(s.id)}>
          {s.ad}
        </button>
      ))}
      {kalan.length > 0 && (
        <details style={{ position: 'relative' }}>
          <summary className="filtre" style={{ listStyle: 'none' }}>
            Diğer {kalan.length} ▾
          </summary>
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 5,
            background: 'var(--card)', border: 'var(--bw-strong) solid var(--hr2)',
            boxShadow: 'var(--sh-tip)', padding: 'var(--s8)', minWidth: 180 }}>
            {kalan.map((s) => (
              <button key={s.id} type="button" className="filtre"
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
                aria-pressed={aktif === s.id} onClick={() => sec(s.id)}>
                {s.ad}
              </button>
            ))}
          </div>
        </details>
      )}
      {kapsam && <div className="filtre-sag">{kapsam}</div>}
    </div>
  );
}

/* ═══ 12 · ModeSwitch ═══════════════════════════════════════════════════
   Kayan gösterge YOK, pill grubu YOK, ikonlu sekme YOK. */

export function KipDegistir({
  secenekler, aktif, sec,
}: { secenekler: { id: string; ad: string }[]; aktif: string; sec: (id: string) => void }) {
  return (
    <div className="filtreler-atlas" style={{ marginTop: 0 }} role="tablist">
      {secenekler.map((s) => (
        <button key={s.id} type="button" role="tab" className="filtre"
          aria-selected={aktif === s.id} onClick={() => sec(s.id)}>
          {s.ad}
        </button>
      ))}
    </div>
  );
}

/** Yaşam döngüsü sekmeleri: 5 eşit segment, 3px alt kenar durum renginde. */
/* Aşama şeridi bir SEKME KÜMESİ DEĞİLDİR: segmentler tıklanmaz, bir
   görünümü değiştirmez, yalnız kaydın yaşam döngüsünde nerede olduğunu
   söyler. Eskiden `role="tablist"` + `role="tab"` taşıyordu; aynı ekranda
   gerçek bir `KipDegistir` tablist'i varken ekran okuyucu iki ayrı sekme
   kümesi duyuruyor ve klavye ikisini ayıramıyordu. Doğru anlam sıralı bir
   listedir; bulunulan adım `aria-current="step"` ile işaretlenir. */
export function Asamalar({
  asamalar, aktifIndeks,
}: { asamalar: { ad: string; tarih?: string }[]; aktifIndeks: number }) {
  return (
    <ol className="asamalar">
      {asamalar.map((a, i) => (
        <li key={a.ad}
          {...(i === aktifIndeks ? { 'aria-current': 'step' as const } : {})}
          className={`asama${i < aktifIndeks ? ' tamam' : i === aktifIndeks ? ' simdi' : ''}`}>
          <span className="ad">{a.ad}</span>
          {a.tarih && <span className="tarih">{a.tarih}</span>}
        </li>
      ))}
    </ol>
  );
}

/* ═══ 9 · RecordCard ════════════════════════════════════════════════════
   Ekran başına BİR tane. En fazla bir cümle düzyazı. */

export function OdakKarti({
  ust, baslik, vurgu, cumle, hedef, seritler, eylemler, durum = 'bd',
}: {
  ust: string;
  baslik: string;
  vurgu?: string;
  cumle: string;
  hedef?: { sayi: string; yazi: string };
  seritler: { etiket: string; deger: ReactNode; not?: string }[];
  eylemler?: ReactNode;
  durum?: 'bd' | 'md' | 'ok' | 'pl';
}) {
  return (
    <article className={`odak s-${durum}`}>
      {hedef && (
        <div className="odak-hedef">
          <span className="t-caption">Hedef</span>
          <div className="sayi">{hedef.sayi}</div>
          <span className="t-caption">{hedef.yazi}</span>
        </div>
      )}
      <p className="odak-ust" style={{ margin: 0 }}>{ust}</p>
      <h2 className="odak-baslik">
        {vurgu ? (<><b>{vurgu}</b>{baslik}</>) : baslik}
      </h2>
      <p className="odak-cumle">{cumle}</p>
      <div className="odak-seritler">
        {seritler.map((s) => (
          <div key={s.etiket} className="odak-serit">
            <span className="t-caption">{s.etiket}</span>
            <span className="deger">{s.deger}</span>
            {s.not && <span className="not">{s.not}</span>}
          </div>
        ))}
      </div>
      {eylemler && <div className="odak-eylem">{eylemler}</div>}
    </article>
  );
}
