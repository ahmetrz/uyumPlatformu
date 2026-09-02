'use client';
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import { Im, Iskelet, type Durum } from './temel';

/* ═══════════════════════════════════════════════════════════════════════
   TABLOLAR — A5 KÜTÜK arketipi (Faz 3)

   Tek semantik çekirdek, iki giriş kapısı:
   · `VeriTablosu` — tipli kütük: kolon tanımı hücreyi ve sıralamayı bilir.
   · `Tablo`       — Faz 2 öncesi kütük API'si (`Kolon[]` + `Satir[]`).
                     Faz 3'te ARTIK aynı `<table role="grid">` çekirdeğine
                     iner; div/button ızgarası ve `darSablon` kalktı.
                     Rotalar kendi alan adlarını korur, grameri paylaşır.
   · `Matris`      — kesişim ızgarası. Hücrede YALNIZ glif bulunur.

   Ortak sözleşme (kullanıcı Faz 3 özeti): semantic table · sticky header ·
   sticky ilk kimlik sütunu · aria-sort · ↑↓ Home End Enter Boşluk ·
   aria-selected satır seçimi · kuyruk (+N) satırı · boş/yükleniyor hâli
   ayrı · satır İÇİ bağlar satır seçimini tetiklemez. */

/* ═══ VeriTablosu — SEMANTİK kütük ══════════════════════════════════════
   Eylül 2026 denetimi: platformda hiç `<table>` yoktu; kütükler div/button
   ızgarasıyla çiziliyordu — ekran okuyucu satır/sütun ilişkisini
   duymuyor, sütun başlığı `aria-sort` taşıyamıyor, başlık kaydırmada
   kayboluyordu. Bu bileşen aynı GÖRSEL grameri (sol kenar durum çubuğu,
   mono kod, olgu alt satırı) gerçek tablo ağacıyla verir:

   · `<table role="grid">` — satır seçilebilir olduğu için grid; `<tr>`
     `aria-selected` ve dolaşan odak (`tabIndex` 0 / −1) taşır.
   · Ok tuşları satırlar arasında gezer (↑ ↓ Home End), Enter/Boşluk
     seçer; fare tıklaması aynı `sec`i çağırır. Hücre içindeki bağ ya da
     düğme tıklaması satırı SEÇMEZ (tedarikçi → santral bağı gibi).
   · Başlık YAPIŞKAN (`position: sticky; top: 0`), ilk sütun (kimlik) da
     yatay kaydırmada yapışkan kalır — `.ab-vt-sar` kaydırma kabıdır.
   · Sıralama sütun başlığındaki DÜĞMEDEDİR ve `<th aria-sort>` ile
     duyurulur. `sirala` bir karşılaştırıcıysa tablo kendisi sıralar;
     `true` ise sıralamayı rota yapar (kütük zaten sıralı gelir), tablo
     yalnız duyurur ve düğmeyi çizer.
   · Kuyruk satırı (+N) tablo ağacının içinde tek hücreli bir satırdır:
     ekran okuyucu "kalan 12 kayıt" cümlesini tablonun parçası olarak duyar.
   · Grup başlığı (`grup`): ardışık satırlar aynı grup adını taşıyorsa
     bir kez `<th scope="colgroup">` başlığı yazılır (kimlik: hesap/grup).
   · Boş küme cümleyle söylenir; `bosCumle === null` ise hiç çizilmez
     (rota kendi boş hâlini — BosIlk/BosFiltre — gösterir).
   · `yukleniyor` verilirse o kadar iskelet satırı çizer; iskelet
     `aria-busy` taşır, sahte veri göstermez.
   Satır yüksekliği yoğunluk sözleşmesinden gelir (`--satir-h`). */

export type VtKolon<T> = {
  anahtar: string;
  baslik: string;
  hucre: (satir: T) => ReactNode;
  /** karşılaştırıcı → tablo sıralar; `true` → rota sıralar, tablo duyurur */
  sirala?: ((a: T, b: T) => number) | true;
  sag?: boolean;
  /** dar bantta düşer — kritik bilgi ikincil OLAMAZ */
  ikincil?: boolean;
  genislik?: string;
  /** sütun başlığının erişilebilir adı başlıktan farklıysa */
  ad?: string;
};

export type VtSira = { anahtar: string; yon: 'artan' | 'azalan' };

export type VtKuyruk = { metin: string; ac?: () => void };

/** Satır içi etkileşimli öğe (bağ, düğme, girdi) satırı seçmemeli. */
function icEtkilesim(e: MouseEvent<HTMLElement>): boolean {
  const hedef = e.target as HTMLElement | null;
  return !!hedef?.closest('a, button, input, select, textarea, summary, label');
}

export function VeriTablosu<T extends { id: string }>({
  etiket, kolonlar, satirlar, secili, sec, durum, sira, siraDegistir, bosCumle, sik, yukseklik,
  kuyruk, dipNot, grup, acik, yukleniyor,
}: {
  etiket: string;
  kolonlar: VtKolon<T>[];
  satirlar: T[];
  secili?: string | null;
  sec?: (id: string | null) => void;
  /** satırın sol kenar durumu */
  durum?: (satir: T) => Durum | undefined;
  sira?: VtSira | null;
  siraDegistir?: (sira: VtSira | null) => void;
  /** `null`: boş kümede hiçbir şey çizme (rota kendi boş hâlini gösterir) */
  bosCumle?: string | null;
  sik?: boolean;
  /** kaydırma kabı yüksekliği (CSS uzunluğu); verilmezse tablo akar */
  yukseklik?: string;
  /** "+N kayıt" toplanan kuyruk satırı */
  kuyruk?: VtKuyruk | null;
  dipNot?: ReactNode;
  /** satırın grup başlığı; ardışık aynı gruplar tek başlık alır */
  grup?: (satir: T) => string | undefined;
  /** genişleyebilen satır: true/false → aria-expanded; undefined → öznitelik yok */
  acik?: (satir: T) => boolean | undefined;
  /** iskelet satırı sayısı (veri gelmeden) */
  yukleniyor?: number;
}) {
  const sirali = (() => {
    if (!sira) return satirlar;
    const k = kolonlar.find((x) => x.anahtar === sira.anahtar);
    if (!k?.sirala || k.sirala === true) return satirlar;
    const kopya = [...satirlar].sort(k.sirala);
    return sira.yon === 'azalan' ? kopya.reverse() : kopya;
  })();

  const odakIndeksi = Math.max(0, sirali.findIndex((s) => s.id === secili));

  const tusla = (e: KeyboardEvent<HTMLTableRowElement>, i: number) => {
    const satirlarDom = e.currentTarget.parentElement
      ?.querySelectorAll<HTMLTableRowElement>('tr[aria-rowindex]');
    if (!satirlarDom) return;
    let hedef: number | null = null;
    if (e.key === 'ArrowDown') hedef = Math.min(sirali.length - 1, i + 1);
    else if (e.key === 'ArrowUp') hedef = Math.max(0, i - 1);
    else if (e.key === 'Home') hedef = 0;
    else if (e.key === 'End') hedef = sirali.length - 1;
    else if (e.key === 'Enter' || e.key === ' ') {
      if (e.target !== e.currentTarget) return; // hücre içi düğme kendi işini yapar
      e.preventDefault();
      sec?.(sirali[i].id === secili ? null : sirali[i].id);
      return;
    }
    if (hedef === null) return;
    e.preventDefault();
    satirlarDom[hedef]?.focus();
  };

  const basTikla = (k: VtKolon<T>) => {
    if (!k.sirala || !siraDegistir) return;
    if (!sira || sira.anahtar !== k.anahtar) siraDegistir({ anahtar: k.anahtar, yon: 'artan' });
    else if (sira.yon === 'artan') siraDegistir({ anahtar: k.anahtar, yon: 'azalan' });
    else siraDegistir(null);
  };

  const kolonSayisi = kolonlar.length;
  const sinifi = (k: VtKolon<T>) =>
    `${k.sag ? 'sag' : ''}${k.ikincil ? ' ikincil-k' : ''}`.trim() || undefined;

  if (yukleniyor && satirlar.length === 0) {
    return (
      <div className="ab-vt-sar" aria-busy="true">
        <table className={`ab-vt${sik ? ' sik' : ''}`} aria-label={`${etiket} · yükleniyor`}>
          <thead>
            <tr>
              {kolonlar.map((k) => (
                <th key={k.anahtar} scope="col" className={sinifi(k)}
                  style={k.genislik ? { width: k.genislik } : undefined}>
                  <span className="kolonbas">{k.baslik}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: yukleniyor }, (_, i) => (
              <tr key={i} className="iskelet">
                {kolonlar.map((k, ki) => (
                  <td key={k.anahtar} className={sinifi(k)}>
                    <Iskelet stil={{ width: ki === 0 ? '62%' : '40%' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (satirlar.length === 0 && !kuyruk) {
    if (bosCumle === null) return null;
    return <p className="ab-vt-bos">{bosCumle ?? 'Bu süzgeçte kayıt yok.'}</p>;
  }

  /* Grup başlığı: satırın grubu bir öncekinden farklıysa başlık satırı
     çizilir (render içinde değişken tutulmaz; öncekine bakılır). */
  const grupBasiMi = (s: T, i: number) => {
    const g = grup?.(s);
    if (g === undefined) return null;
    const onceki = i > 0 ? grup?.(sirali[i - 1]) : undefined;
    return g !== onceki ? g : null;
  };

  return (
    <>
    <div className="ab-vt-sar" style={yukseklik ? ({ '--vt-h': yukseklik } as CSSProperties) : undefined}>
      <table className={`ab-vt${sik ? ' sik' : ''}`} role="grid" aria-label={etiket}
        aria-rowcount={sirali.length + 1}>
        <thead>
          <tr>
            {kolonlar.map((k) => {
              const etkin = sira?.anahtar === k.anahtar;
              const ariaSort = !k.sirala ? undefined
                : etkin ? (sira!.yon === 'artan' ? 'ascending' : 'descending') : 'none';
              /* Genişlik `<col>` yerine başlıktadır: dar bantta gizlenen
                 ikincil sütunun `<col>`u yerinde kalıyor ve tablo o genişliği
                 boş bırakıyordu (ölçüldü: 918px tablo, 730px hücre). */
              return (
                <th key={k.anahtar} scope="col" className={sinifi(k)} aria-sort={ariaSort}
                  style={k.genislik ? { width: k.genislik } : undefined}>
                  {k.sirala ? (
                    <button type="button" className={`kolonbas sirali${etkin ? ' etkin' : ''}`}
                      onClick={() => basTikla(k)}
                      aria-label={`${k.ad ?? k.baslik}${etkin ? (sira!.yon === 'artan' ? ' · artan, azalana çevir' : ' · azalan, sıralamayı kaldır') : ' · sırala'}`}>
                      {k.baslik}
                      <span className="ok" aria-hidden>{etkin ? (sira!.yon === 'artan' ? '↑' : '↓') : '↕'}</span>
                    </button>
                  ) : <span className="kolonbas">{k.baslik}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sirali.map((s, i) => {
            const d = durum?.(s);
            const seciliMi = s.id === secili;
            const g = grupBasiMi(s, i);
            return [
              g !== null ? (
                <tr key={`g-${s.id}`} className="grup">
                  <th scope="colgroup" colSpan={kolonSayisi}>{g}</th>
                </tr>
              ) : null,
              <tr key={s.id}
                className={d ? `d-${d}` : undefined}
                aria-selected={sec ? seciliMi : undefined}
                aria-expanded={acik?.(s)}
                aria-rowindex={i + 2}
                tabIndex={sec ? (i === odakIndeksi ? 0 : -1) : undefined}
                onClick={sec ? (e) => { if (!icEtkilesim(e)) sec(seciliMi ? null : s.id); } : undefined}
                onKeyDown={sec ? (e) => tusla(e, i) : undefined}>
                {kolonlar.map((k, ki) => (
                  ki === 0
                    ? <th key={k.anahtar} scope="row" className={sinifi(k)}>{k.hucre(s)}</th>
                    : <td key={k.anahtar} className={sinifi(k)}>{k.hucre(s)}</td>
                ))}
              </tr>,
            ];
          })}
          {kuyruk && (
            <tr className="kuyruk">
              <td colSpan={kolonSayisi}>
                {kuyruk.ac
                  ? <button type="button" className="kuyruk-ac" onClick={kuyruk.ac}>
                      {kuyruk.metin}<span className="ok" aria-hidden>▾</span>
                    </button>
                  : <span>{kuyruk.metin}</span>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    {dipNot && <p className="mono ab-vt-dip">{dipNot}</p>}
    </>
  );
}

/* ═══ Tablo — kütük API'si, semantik çekirdek ═══════════════════════════
   Yirmi dört rota kütüğü `Kolon[]` + `Satir[]` sözleşmesiyle yazıyor.
   Faz 3'te bu sözleşme KORUNUR (alan adları, hücreler, sıralama anahtarı
   rotada kalır) ama çizim `VeriTablosu` çekirdeğine iner: her kütük tek
   seferde semantik tablo, aria-sort, yapışkan başlık ve klavye dolaşımı
   kazanır. Kimlik hücresi = durum glifi + konu + olgu alt satırı. */

export type Kolon = {
  baslik?: string;
  /** ızgara izi; yalnız `px` değerleri sütun genişliğine çevrilir */
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
  /** grup başlığı (ardışık aynı gruplar tek başlık alır) */
  grup?: string;
};

function pxGenislik(iz: string): string | undefined {
  const m = /^([\d.]+)px$/.exec(iz.trim());
  return m ? `${m[1]}px` : undefined;
}

export function Tablo({
  kolonlar, satirlar, secili, sec, sik = false, kuyruk, dipNot,
  konuBasligi = 'Konu', sirala, etiket, yukseklik,
}: {
  kolonlar: Kolon[];
  satirlar: Satir[];
  secili?: string | null;
  sec?: (id: string) => void;
  sik?: boolean;
  kuyruk?: VtKuyruk | null;
  dipNot?: string;
  konuBasligi?: string;
  sirala?: Sirala;
  /** tablonun erişilebilir adı; verilmezse konu başlığı kütüğü adlandırır */
  etiket?: string;
  yukseklik?: string;
}) {
  const vtKolonlar: VtKolon<Satir>[] = [
    {
      anahtar: 'konu',
      baslik: konuBasligi,
      sirala: sirala ? true : undefined,
      hucre: (s) => (
        <span className="kimlik">
          <Im durum={s.durum} />
          <span className="konu">
            {s.konu}
            {s.alt && <span className="alt">{s.alt}</span>}
          </span>
        </span>
      ),
    },
    ...kolonlar.map((k, i): VtKolon<Satir> => ({
      anahtar: k.siraAnahtari ?? `k${i}`,
      baslik: k.baslik ?? '',
      ad: k.baslik ? undefined : `${i + 1}. sütun`,
      sirala: sirala && k.siraAnahtari ? true : undefined,
      sag: k.sag,
      ikincil: k.ikincil,
      genislik: pxGenislik(k.genislik),
      hucre: (s) => s.hucreler[i],
    })),
  ];
  const grupluMu = satirlar.some((s) => s.grup !== undefined);

  return (
    <VeriTablosu<Satir>
      etiket={etiket ?? `${konuBasligi} kütüğü`}
      kolonlar={vtKolonlar}
      satirlar={satirlar}
      secili={secili}
      sec={sec ? (id) => sec(id ?? secili ?? '') : undefined}
      durum={(s) => s.kenar ?? s.durum}
      sira={sirala ? { anahtar: sirala.anahtar, yon: sirala.yon } : null}
      siraDegistir={sirala ? (s) => sirala.degistir(s?.anahtar ?? sirala.anahtar) : undefined}
      bosCumle={null}
      sik={sik}
      kuyruk={kuyruk}
      dipNot={dipNot}
      grup={grupluMu ? (s) => s.grup : undefined}
      yukseklik={yukseklik}
    />
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
