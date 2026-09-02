'use client';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { Im, type Durum } from './temel';

/* ═══════════════════════════════════════════════════════════════════════
   TABLOLAR

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
  /* `role="columnheader"` + `aria-sort` YOK: bu tablo div/button gramerinde
     çizilir, ARIA satır/tablo ağacı kurulmaz; bağlamsız columnheader axe'de
     kritik ihlaldir (aria-required-parent). Sıralama yönü düğmenin
     erişilebilir adında söylenir — ekran okuyucu yine duyar. */
  return (
    <span
      className={`${sag ? 'sag' : ''}${ikincil ? ' ikincil-k' : ''}`.trim() || undefined}>
      <button type="button" className={`kolonbas sirali${etkin ? ' etkin' : ''}`}
        aria-label={`${ad} · ${etkin && sirala.yon === 'azalan' ? 'azalan' : 'artan'} sırala`}
        onClick={() => sirala.degistir(anahtar)}>
        {ad}<span aria-hidden className="yon">{etkin && sirala.yon === 'azalan' ? '▾' : '▴'}</span>
      </button>
    </span>
  );
}

/* ═══ Dar bant şablonu ════════════════════════════════════════════════
   Dar bantta (`≤1366px`) sabit kolon genişlikleri OLDUĞU GİBİ kalırsa
   üç ayrı yoldan kusur üretirler; üçü de ölçüldü:

   1. `170px` bir iz, `minmax(0, 170px)`e çevrilse bile 375px'te yine
      170px'i kapar — ızgara algoritması esnek OLMAYAN izleri büyüme
      sınırlarına kadar doldurur, `fr` izine artakalan ne varsa onu
      verir. /kanitlar'da `fr` kolonuna 1px kalıyor, başlık düğmesi o
      izden taşıp sayfayı 35px yana kaydırıyordu.
   2. Esneme katsayıları TOPLAMI 1'in altındaysa (`0.7fr` tek başına)
      belirtim `fr` izlerine artakalanın yalnız o kesrini verir; gerisi
      hiçbir ize gitmez. /dokumanlar'da 12px'lik taşma buydu.
   3. Taban 150px olan bir `minmax` dar bantta daralmaz; konu sütunu
      sıfıra ezilir ve başlık harf harf alt alta kırılır.

   Çare, sabit kolonu dar bantta ORANSAL davranmaya zorlamaktır:
   `minmax(0, min(170px, %T))`. Tavan, kolonların paylaşacağı bütçeden
   gelir — im sütunu, konu tabanı ve kolon aralıkları satırın ≈%42'sini
   alır, kalan ≈%58 sabit kolonlar ARASINDA bölüşülür.

   İm ve ok gibi küçük izler (≤40px) daraltılmaz: onlar bir glif kadar
   yer tutar, oransal yapmak yalnız hizayı bozar. */

/** Bütçe: sabit kolonların dar bantta paylaşacağı satır yüzdesi.
    Ölçülerek seçildi — bkz. `arac/yatay-tasma.mjs` ve dar bant
    ekran görüntüleri; konu sütununun 375px'te ≥100px kalması esas. */
const SABIT_BUTCE = 58;
/** Bu genişliğin altındaki izler (im · ok) daraltılmaz. */
const KUCUK_IZ = 40;

/** Şablonu üst düzey boşluklardan izlere ayırır (parantez içi bölünmez). */
function izlereAyir(sablon: string): string[] {
  const izler: string[] = [];
  let derinlik = 0;
  let parca = '';
  for (const ch of sablon.trim()) {
    if (ch === '(') derinlik += 1;
    if (ch === ')') derinlik -= 1;
    if (ch === ' ' && derinlik === 0) {
      if (parca) izler.push(parca);
      parca = '';
      continue;
    }
    parca += ch;
  }
  if (parca) izler.push(parca);
  return izler;
}

/** İzin daraltılabilir sabit piksel tavanı; yoksa null. */
function sabitTavan(iz: string): number | null {
  const duz = /^([\d.]+)px$/.exec(iz.trim());
  if (duz) return Number(duz[1]);
  const ust = /^minmax\([^,]+,\s*([\d.]+)px\s*\)$/.exec(iz.trim());
  return ust ? Number(ust[1]) : null;
}

/** Tek bir izi dar bant için daraltır. */
function daralt(iz: string, tavanYuzde: number): string {
  const g = iz.trim();
  if (g.includes('auto')) return g;

  const px = sabitTavan(g);
  if (px !== null) {
    if (px <= KUCUK_IZ) return g;
    return `minmax(0, min(${px}px, ${tavanYuzde}%))`;
  }

  if (g.startsWith('minmax(')) {
    return g.replace(/^minmax\(\s*[\d.]+(px|rem|em)\s*,/, 'minmax(0,')
      .replace(/(?<![\d.])0?\.\d+fr/, '1fr');
  }
  return g.replace(/(?<![\d.])0?\.\d+fr/, '1fr');
}

/** Bir ızgara şablonunun dar bant karşılığını üretir.
    Elle dar şablon yazan ekranlar da (`--kolonlar-dar`) bunu çağırır;
    kural tek yerde durur. */
export function darSablon(sablon: string): string {
  const izler = izlereAyir(sablon);
  /* Bütçeyi yalnız daraltılan kolonlar değil, ESNEK kolonlar da paylaşır:
     konu sütunu da bir izdir ve ona pay ayrılmazsa sabit kolonlar tavanı
     tek başına yer ve konu 40px'e düşer (ölçüldü: /kanitlar'da "Bağlı
     kayıt" 39px kalıyordu). Küçük izler (im · ok) paydan sayılmaz. */
  const paydas = izler.filter((iz) => {
    const px = sabitTavan(iz);
    return !(px !== null && px <= KUCUK_IZ);
  }).length;
  const tavan = Math.max(12, Math.round(SABIT_BUTCE / Math.max(1, paydas)));
  return izler.map((iz) => daralt(iz, tavan)).join(' ');
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
  /* Dar bantta sabit genişlikler DARALABİLİR olmalı (`minmax(0, X)`).
     Sabit kalırlarsa toplamları kapsayıcıyı aşar, `1fr` olan konu sütunu
     sıfıra ezilir ve başlık harf harf alt alta kırılır — 375px'te
     ölçüldü: dört kolonlu bir kütükte satır 600px yüksekliğe çıkıyordu.
     Konu sütununun tabanı da burada verilir; taban olmadan aynı ezilme
     bir sonraki geniş kolonda yeniden olur. */
  /* Konu sütununun 96px'lik tabanı burada verilir ve DARALTILMAZ: taban
     olmadan aynı ezilme bir sonraki geniş kolonda yeniden olur. */
  const dar = ['18px', 'minmax(96px, 1fr)',
    darSablon(kolonlar.filter((k) => !k.ikincil).map((k) => k.genislik).join(' '))].join(' ');
  const stil = { '--kolon': sablon, '--kolon-dar': dar } as CSSProperties;
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
