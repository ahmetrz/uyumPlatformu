'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Im, Metrikler, type Metrik, type Durum } from './temel';

/* ═══════════════════════════════════════════════════════════════════════
   EKRAN İSKELETİ

   Prototiplerin üçünde de ekran aynı üç parçadan kurulur:
     1 · LEDE — eyebrow, tek cümlelik soru başlığı, sağda ölçüt satırı;
     2 · SÜZGEÇ ŞERİDİ — mercekler + kapsam kontrolleri, tek satır;
     3 · GÖVDE.
   Tek malzeme (UX denetimi 2026-09): Barlow Condensed başlık, Inter
   gövde, JetBrains Mono veri; yoğunluk `[data-yogunluk]` ile ölçülenir.

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

/* ── Tezgâh hattı (A7 ortak gramer) ──────────────────────────────────
   Her tezgâh ekranı (keşif, içe aktarım, varlık aktarımı, yönetim,
   operasyon) aynı üç bölgeyle okunur: AŞAMA şeridi → çalışma alanı →
   sonuç/doğrulama. Bu bileşen ilk bölgeyi kurar: hangi aşamadayız,
   reddedilen/ölü-mektup kuyruğu nerede. Aşama listesi veriden gelir;
   aktif adım sekme değil, hattın durduğu yerdir. */
export function TezgahHatti({ asamalar, aktifIndeks, not, reddedilenler = true }: {
  asamalar: { ad: string; tarih?: string }[];
  aktifIndeks: number;
  /** hattın tek cümlelik açıklaması (ne girer, ne çıkar) */
  not?: string;
  /** reddedilen/ölü-mektup kuyruğu bağlantısı gösterilsin mi */
  reddedilenler?: boolean;
}) {
  return (
    <nav className="ab-tezgah-hat" aria-label="İş hattı aşamaları">
      <Asamalar asamalar={asamalar} aktifIndeks={aktifIndeks} />
      {(not || reddedilenler) && (
        <p className="ab-dip hat-not">
          {not}
          {not && reddedilenler && ' · '}
          {reddedilenler && (
            <Link href="/saglik/reddedilenler">Reddedilen kayıtlar →</Link>
          )}
        </p>
      )}
    </nav>
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

/* ── Kapanış yolu şeridi ──────────────────────────────────────────────
   K arketipinin (kayıt detayı) ana yüzeydeki karar bandı.

   Buradan ÖNCE bu şeridin yerinde `Asamalar` vardı ve dekoratifti:
   dört aşamayı ve tarihlerini çiziyor, hiçbiri tıklanmıyordu. Kullanıcı
   "ne eksik" sorusunun cevabını dört ayrı yerden kendi topluyordu ve
   ekranın ana kolonunda tek bir eylem düğmesi yoktu — ölçüm: ilk
   birincil eylem 1098px, çekmecenin içinde.

   Bu şerit üç şeyi birden yapar ve üçü de aynı veriden gelir:
     1 · her adımın DURUMU (yapıldı · sıradaki iş · sırası gelmedi),
     2 · sıradaki işin GÖREV DİLİNDE tek cümlesi,
     3 · o işe götüren BİRİNCİL eylem.

   Adımlar düğmedir: şerit bir navigatördür, ilerleme süsü değil.

   Renk semantiği (§22): yapılan `ok`, sıradaki iş `md` (dikkat, hata
   değil), sırası gelmemiş `unk` (nötr belirsizlik). Eksik bir adım
   KIRMIZI DEĞİLDİR — kırmızı gerçek kusur içindir ve her açık kaydı
   kırmızıya boyamak kırmızının anlamını tüketirdi. */

export type YolAdimi = {
  anahtar: string;
  ad: string;
  durum: 'tamam' | 'eksik' | 'bekliyor';
  /** Görev dilinde tek cümle. */
  cumle: string;
  /** Adın altındaki olgu: tarih, sayı. Yoksa boş. */
  olgu: string;
};

const YOL_IMI: Record<YolAdimi['durum'], Durum> = {
  tamam: 'ok', eksik: 'md', bekliyor: 'unk',
};

export function KapanisBandi({
  baslik = 'Kapanış için gerekenler', adimlar, sonraki, git, birincil, bittiCumlesi,
}: {
  adimlar: YolAdimi[];
  /** Sıradaki iş; `null` = yapacak bir şey yok. */
  sonraki: { anahtar: string; cumle: string } | null;
  /** Adıma tıklanınca çağrılır — o adımın işine götürür. */
  git: (anahtar: string) => void;
  /** Sıradaki işin birincil eylemi. */
  birincil?: ReactNode;
  baslik?: string;
  /** Sıradaki iş yokken yazılan cümle (kapandı · riski kabul edildi). */
  bittiCumlesi?: string;
}) {
  return (
    <section className="ab-yol" aria-label={baslik}>
      <p className="etiket ab-yol-bas">{baslik}</p>
      <ol className="ab-yol-serit">
        {adimlar.map((a) => (
          <li key={a.anahtar} className={a.durum}>
            <button type="button" onClick={() => git(a.anahtar)}
              {...(a.anahtar === sonraki?.anahtar ? { 'aria-current': 'step' as const } : {})}
              title={a.cumle}>
              <Im durum={YOL_IMI[a.durum]} ad={`${a.ad} — ${a.cumle}`} />
              <span className="ad">{a.ad}</span>
              {a.olgu && <span className="mono olgu">{a.olgu}</span>}
            </button>
          </li>
        ))}
      </ol>
      <p className="ab-yol-sonraki">
        <span className="cumle">
          {sonraki ? <><b>Sıradaki iş —</b> {sonraki.cumle}</> : bittiCumlesi}
        </span>
        {birincil}
      </p>
    </section>
  );
}
