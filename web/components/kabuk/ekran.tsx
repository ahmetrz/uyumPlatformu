'use client';
import type { ReactNode } from 'react';
import { Metrikler, type Metrik, type Durum } from './temel';

/* ═══════════════════════════════════════════════════════════════════════
   EKRAN İSKELETİ

   Prototiplerin üçünde de ekran aynı üç parçadan kurulur:
     1 · LEDE — eyebrow, tek cümlelik soru başlığı, sağda ölçüt satırı;
     2 · SÜZGEÇ ŞERİDİ — mercekler + kapsam kontrolleri, tek satır;
     3 · GÖVDE.
   Ayrım MALZEMEDE: A'da 15px dar başlık ve mono etiketler, B'de dar
   başlıklı versal, C'de 34px serif soru cümlesi. Bu dosya yapıyı kurar,
   malzemeyi `[data-yon]` seçer.

   Önceki arayüz katmanından devralınan tek şey SÖZLEŞMEDİR: en fazla beş
   ölçüt, en fazla beş görünür süzgeç + taşma, aşama şeridi sekme DEĞİLDİR
   (sıralı liste + `aria-current="step"`). */

export function EkranBasligi({
  eyebrow, baslik, vurgu, vurguDurumu, metrikler, sag,
}: {
  eyebrow: string;
  baslik: string;
  vurgu?: string;
  vurguDurumu?: Durum;
  metrikler?: Metrik[];
  sag?: ReactNode;
}) {
  return (
    <header className="ab-lede">
      <div className="sol">
        <p className="etiket">{eyebrow}</p>
        <h1>
          {vurgu ? (
            <>
              <b className={vurguDurumu ? `d-${vurguDurumu}` : undefined}>{vurgu}</b>
              {' '}{baslik}
            </>
          ) : baslik}
        </h1>
      </div>
      {metrikler && <Metrikler metrikler={metrikler} />}
      {sag}
    </header>
  );
}

/* ── Süzgeç şeridi ────────────────────────────────────────────────────
   Aktif mercek DOLU ve köşeli; pasif olanlar yalnız metin. Hap yok.
   Beşten fazlası taşma listesine iner ve KAÇ TANE olduğu yazılır. */
export function Filtreler({
  secenekler, aktif, sec, tasma, kapsam,
}: {
  secenekler: { id: string; ad: string }[];
  aktif: string;
  sec: (id: string) => void;
  tasma?: { id: string; ad: string }[];
  kapsam?: ReactNode;
}) {
  const gorunur = secenekler.slice(0, 5);
  const kalan = tasma ?? secenekler.slice(5);
  return (
    <div className="ab-suzgec">
      <div className="mercekler" role="group" aria-label="Mercek">
        {gorunur.map((s) => (
          <button key={s.id} type="button" aria-pressed={aktif === s.id} onClick={() => sec(s.id)}>
            {s.ad}
          </button>
        ))}
        {kalan.map((s) => (
          <button key={s.id} type="button" className="tasma"
            aria-pressed={aktif === s.id} onClick={() => sec(s.id)}>
            {s.ad}
          </button>
        ))}
      </div>
      {kapsam && <div className="kapsam">{kapsam}</div>}
    </div>
  );
}

/** Kip değiştirici — prototipin ikili düğmesi (a-assets kip çubuğu). */
export function KipDegistir({ secenekler, aktif, sec }: {
  secenekler: { id: string; ad: string }[]; aktif: string; sec: (id: string) => void;
}) {
  return (
    <div className="ab-ikili" role="group" aria-label="Görünüm">
      {secenekler.map((s) => (
        <button key={s.id} type="button" aria-pressed={aktif === s.id} onClick={() => sec(s.id)}>
          {s.ad}
        </button>
      ))}
    </div>
  );
}

/** Yaşam döngüsü şeridi. SEKME DEĞİLDİR: tıklanmaz, görünüm değiştirmez;
    sıralı bir listedir ve bulunulan adım `aria-current="step"` taşır. */
export function Asamalar({ asamalar, aktifIndeks }: {
  asamalar: { ad: string; tarih?: string }[]; aktifIndeks: number;
}) {
  return (
    <ol className="ab-asamalar">
      {asamalar.map((a, i) => (
        <li key={a.ad}
          {...(i === aktifIndeks ? { 'aria-current': 'step' as const } : {})}
          className={i < aktifIndeks ? 'tamam' : i === aktifIndeks ? 'simdi' : undefined}>
          <span className="ad">{a.ad}</span>
          {a.tarih && <span className="mono tarih">{a.tarih}</span>}
        </li>
      ))}
    </ol>
  );
}

/* ── Odak kartı ───────────────────────────────────────────────────────
   Ekran başına BİR tane, en fazla bir cümle düzyazı. Prototipteki
   karşılığı b-executive'in "müdahale gerektirenler" ilk kalemi: sol
   kenarda şiddet çubuğu, sağda hedef sayısı. */
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
    <article className={`ab-odak d-${durum}`}>
      <span className="sap" aria-hidden />
      <div className="govde">
        <p className="etiket">{ust}</p>
        <h2>{vurgu ? <><b>{vurgu}</b>{baslik}</> : baslik}</h2>
        <p className="cumle">{cumle}</p>
        <dl className="seritler">
          {seritler.map((s) => (
            <div key={s.etiket}>
              <dt>{s.etiket}</dt>
              <dd>
                {s.deger}
                {s.not && <span className="mono not">{s.not}</span>}
              </dd>
            </div>
          ))}
        </dl>
        {eylemler && <div className="eylem">{eylemler}</div>}
      </div>
      {hedef && (
        <div className="hedef">
          <span className="etiket">Hedef</span>
          <span className="sayi">{hedef.sayi}</span>
          <span className="etiket">{hedef.yazi}</span>
        </div>
      )}
    </article>
  );
}
