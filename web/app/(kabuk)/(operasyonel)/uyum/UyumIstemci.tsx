'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEylem } from '@/components/useEylem';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { kanitTalebiEkle } from '@/lib/eylemler2/denetim';
import { DURUM_ETIKET, etiketle, uyumOzeti } from '@/lib/sabitler';
import {
  TREND_BOY, TREND_EN, acikMi, kisaTarih, trendFarki, trendGeometrisi,
  type CerceveVerisi, type Kontrol, type TesisSatiri, type TrendNoktasi,
} from './mantik';
/* C22/C23 ters bağı — belge kuralı kütükte yaşar, burada YENİDEN YAZILMAZ. */
import {
  ORTU_IM, ORTU_SOZU, belgeOrtusu,
  DURUM_IM as BELGE_IM, DURUM_SOZU as BELGE_SOZU, type BelgeDurumu,
} from '../dokumanlar/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   UYUM KONTROL ODASI — C · OPERATIONAL LUXURY

   Görsel source of truth: `c-compliance.html`
   (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §3 ve §4).

   Bu bir yeniden STİLLENDİRME değil. Orijinal tasarım ürünün eski
   ekranından üç noktada MADDİ olarak ayrılıyor ve üçü de burada uygulandı:

   1 · MATRİS DEVRİKTİR. Eskiden satır = santral, sütun = kontrol ailesiydi
       ve hücre bir AİLEYİ temsil ettiği için "hangi kontrol?" sorusu
       hücreden okunamıyordu. Prototipte satır = KONTROL, sütun = SANTRAL:
       defterin sorusu "bu kontrolde kim uygunsuz" hâline gelir.

   2 · DETAY ÇEKMECEDE DEĞİL SATIR İÇİNDE AÇILIR. 420px çekmece defteri
       terk ettirir; prototip gerekçeyi satırın altında, aynı sayfada
       sütunlar hâlinde açar: NEDEN · KANIT · BELGE · YÖNETİŞİM ZİNCİRİ ·
       SORUMLULUK. Okuyucu bağlamı kaybetmez.

   3 · DURUM GLİF AĞIRLIĞIYLA KODLANIR (daire ailesi), renkle değil:
       ● uygun · ○ kısmi · ⊖ uygunsuz · ◌ değerlendirilmedi · – kapsam dışı.
       Efsane sol dizin sütununda OKUMA ANAHTARI olarak yaşar — arayüzün
       parçası, dipnot değil.

   PROTOTİPTE OLMAYAN, BURADA EKLENEN (harita §7):
   · gerçek klavye gezinmesi (satır bir <button>, Enter/Space açar,
     Esc kapatır) — prototipte yalnız ipucu metni vardı;
   · `aria-expanded` / `aria-controls` sözleşmesi;
   · ölçülmemiş hücre "—" gösterir, SIFIR DEĞİL (UNKNOWN ≠ ZERO);
   · kapsam dışı ve kararsız santraller matrisin altında sessiz satırda —
     gizlenmez, çünkü "kapsam dışı" bir KARARDIR.

   İŞ MANTIĞI DEĞİŞMEDİ: veri sözleşmesi (`CerceveVerisi`), `mantik.ts`
   yüklemleri, `?cerceve=&kontrol=` derin bağlantısı, kapsam kuralları ve
   yazma eylemleri aynı.
   ═══════════════════════════════════════════════════════════════════════ */

type Odak = { cerceve: string; madde: string | null };

/** Defterde aynı anda AÇIK tek satır olur — okuma sırası korunur. */
type Acik = { maddeId: string; tesisId: string } | null;

/* Kapsam URL'de yaşar: çerçeve değiştirici paylaşılabilir bir bağlantı
   üretmeli ama tarayıcı geçmişini kirletmemeli. Statik dışa aktarımda
   sunucu `searchParams` okuyamadığı için History API köprüsü kullanılır. */
function kapsamiYaz(cerceveKodu: string) {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams(window.location.search);
  p.set('cerceve', cerceveKodu);
  p.delete('kontrol');
  window.history.replaceState(null, '', `?${p.toString()}`);
}

function acilisOdagi(
  cerceveler: CerceveVerisi[], kontrolParam: string | null, cerceveParam: string | null,
): Odak {
  if (kontrolParam) {
    for (const c of cerceveler) {
      for (const a of c.aileler) {
        const y = a.yapraklar.find((x) => x.kod === kontrolParam || x.kisaKod === kontrolParam);
        if (y) return { cerceve: c.kod, madde: y.id };
      }
    }
  }
  const c = cerceveler.find((x) => x.kod === cerceveParam)
    ?? cerceveler.find((x) => x.satirlar.length > 0)
    ?? cerceveler[0];
  return { cerceve: c?.kod ?? '', madde: null };
}

/* ── Devrik matris ────────────────────────────────────────────────────
   Veri santral başına gelir (`satirlar[].kontroller[]`); defter kontrol
   başına okur. Çevrim burada, TEK YERDE yapılır ve veri sözleşmesine
   dokunmaz. */
type MaddeSatiri = {
  maddeId: string;
  kod: string;
  kisaKod: string;
  baslik: string;
  aileId: string;
  aileKod: string;
  /** tesisId → o santraldeki kontrol; santral kapsam dışıysa yok. */
  hucreler: Map<string, Kontrol>;
  /** kapsam içi hücre sayısı — "6 / 6" kapsam sütunu */
  kapsamda: number;
};

function devir(cerceve: CerceveVerisi): MaddeSatiri[] {
  const harita = new Map<string, MaddeSatiri>();
  const aileKodu = new Map(cerceve.aileler.map((a) => [a.id, a.kisaKod || a.kod]));
  for (const t of cerceve.satirlar) {
    for (const k of t.kontroller) {
      let m = harita.get(k.maddeId);
      if (!m) {
        m = {
          maddeId: k.maddeId, kod: k.kod, kisaKod: k.kisaKod, baslik: k.baslik,
          aileId: k.aileId, aileKod: aileKodu.get(k.aileId) ?? '',
          hucreler: new Map(), kapsamda: 0,
        };
        harita.set(k.maddeId, m);
      }
      m.hucreler.set(t.id, k);
      if (k.im !== null) m.kapsamda += 1;
    }
  }
  /* Sıra kontrol koduna göre: defter bir kütüktür, kod sırası okunur. */
  return [...harita.values()].sort((a, b) => a.kod.localeCompare(b.kod, 'tr'));
}

/* Glif sınıfı — durum yalnız renkle anlatılmaz (harita §7 kusur 2).
   Eşleme HAM dizeye değil `mantik.ts`in ürettiği `im` işaretçisine bakar:
   ham → im çevrimi tek yerde (DURUM_IM) yaşar ve bu ekran onu YENİDEN
   TANIMLAMAZ; aksi hâlde matris ile çerçeve detayı birbirini yalanlar. */
const GLIF_SINIF: Record<string, string> = {
  ok: 'g-uygun', tamam: 'g-uygun', md: 'g-kismi',
  bd: 'g-uygunsuz', unk: 'g-yok', pl: 'g-yok',
};

function durumSozu(ham: string): string {
  return DURUM_ETIKET[ham as keyof typeof DURUM_ETIKET] ?? etiketle(ham);
}

function glif(k: Kontrol | undefined): { sinif: string; soz: string } {
  if (!k || k.im === null) return { sinif: 'g-disi', soz: 'Kapsam dışı' };
  return { sinif: GLIF_SINIF[k.im] ?? 'g-yok', soz: durumSozu(k.ham) };
}

/* Efsane ürünün SÖZLÜĞÜNDEN türer, elle yazılmaz: durum sözcükleri tek
   kaynaktan gelir (`DURUM_ETIKET`), efsane ile hücre ipucu ayrışamaz. */
const OKUMA_ANAHTARI: { sinif: string; yazi: string }[] = [
  { sinif: 'g-uygun', yazi: DURUM_ETIKET.uyumlu },
  { sinif: 'g-kismi', yazi: DURUM_ETIKET.kismi },
  { sinif: 'g-uygunsuz', yazi: DURUM_ETIKET.uyumsuz },
  { sinif: 'g-yok', yazi: `${DURUM_ETIKET.degerlendirilmedi} · ${DURUM_ETIKET.incelemede}` },
  { sinif: 'g-disi', yazi: DURUM_ETIKET.kapsamdisi },
];

export default function UyumIstemci({
  cerceveler, trend, yazabilir,
}: { cerceveler: CerceveVerisi[]; trend: TrendNoktasi[]; yazabilir: boolean }) {
  const parametreler = useSearchParams();
  const kontrolParam = parametreler.get('kontrol');
  const cerceveParam = parametreler.get('cerceve');

  const [odak, setOdak] = useState<Odak>(
    () => acilisOdagi(cerceveler, kontrolParam, cerceveParam));
  const [acik, setAcik] = useState<Acik>(null);
  const [aile, setAile] = useState<string | null>(null);

  const cerceve = cerceveler.find((c) => c.kod === odak.cerceve) ?? cerceveler[0];
  const satirlar = useMemo(() => (cerceve ? devir(cerceve) : []), [cerceve]);
  const gorunur = useMemo(
    () => (aile ? satirlar.filter((s) => s.aileId === aile) : satirlar),
    [satirlar, aile],
  );

  /* Metrikler KESİLMEMİŞ kümeden sayılır: aile süzgeci listeyi daraltır,
     defterin toplamını değiştirmez (06 §A2 ile aynı kural). */
  const m = useMemo(() => {
    const sayilar = sayHam(satirlar);
    /* Endeks `uyumOzeti` ile hesaplanır — ürünün TEK uyum formülü odur
       (lib/sabitler.ts): payda değerlendirilmiş kayıtlardır, bilinmeyen
       ne 0 ne 1 sayılır ve ayrıca raporlanır (UNKNOWN ≠ ZERO). Bu ekran
       kendi yüzdesini icat ederse defter ile çerçeve detayı çelişir. */
    const o = uyumOzeti(sayilar);
    return {
      uygun: sayilar.uyumlu ?? 0,
      kismi: sayilar.kismi ?? 0,
      uygunsuz: sayilar.uyumsuz ?? 0,
      olculmemis: o.bilinmeyen,
      toplam: o.kapsam,
      endeks: o.yuzde,
    };
  }, [satirlar]);

  const santraller: TesisSatiri[] = cerceve?.satirlar ?? [];

  /* C15 · Eğilim çerçevenin YÜRÜYEN sürecine bağlıdır: anlık görüntü
     sürecin kaydıdır, çerçevenin değil. Süreci olmayan çerçevede şerit
     "süreç yok" der; süreci olup anlığı olmayan çerçevede "henüz anlık
     görüntü yok". İkisi de boş grafik değildir. */
  const surecId = cerceve?.surec?.id ?? null;
  const egilim = useMemo(
    () => (surecId ? trend.filter((p) => p.surecId === surecId) : []),
    [trend, surecId],
  );

  if (!cerceve) {
    return (
      <div className="ab-c-ekrandizin" data-dizin="ekran">
        <aside className="ab-c-dizin" />
        <div><p style={{ color: 'var(--i3)' }}>Yürürlükte çerçeve yok.</p></div>
      </div>
    );
  }

  /* Bu ekran KENDİ dizinini verir; kabuğun varsayılan defter dizini
     `data-dizin="ekran"` görünce gizlenir (bkz. Kabuk.tsx · KabukC). */
  return (
    <div className="ab-c-ekrandizin" data-dizin="ekran">
      {/* ── Dizin sütunu: çerçeve · kontrol ailesi · OKUMA ANAHTARI ──── */}
      <aside className="ab-c-dizin" aria-label="Defter dizini">
        <div className="bolum">
          <span className="etiket">Çerçeve</span>
          {cerceveler.map((c) => (
            <button
              key={c.kod}
              type="button"
              className="satir"
              aria-current={c.kod === cerceve.kod ? 'true' : undefined}
              onClick={() => { setOdak({ cerceve: c.kod, madde: null }); setAile(null); setAcik(null); kapsamiYaz(c.kod); }}
            >
              <span>{c.ad}</span>
              <span className="sayi">{c.aileler.reduce((t, a) => t + a.yapraklar.length, 0)}</span>
            </button>
          ))}
        </div>

        <div className="bolum">
          <span className="etiket">Kontrol ailesi</span>
          <button type="button" className="satir"
            aria-current={aile === null ? 'true' : undefined}
            onClick={() => { setAile(null); setAcik(null); }}>
            <span>Tümü</span>
            <span className="sayi">{satirlar.length}</span>
          </button>
          {cerceve.aileler.map((a) => (
            <button key={a.id} type="button" className="satir"
              aria-current={aile === a.id ? 'true' : undefined}
              onClick={() => { setAile(a.id); setAcik(null); }}>
              <span>{a.kisa || a.baslik}</span>
              <span className="sayi">{a.yapraklar.length}</span>
            </button>
          ))}
        </div>

        {/* Efsane ARAYÜZÜN PARÇASI — dipnot değil (prototip sol kolonu). */}
        <div className="bolum">
          <span className="etiket">Okuma anahtarı</span>
          {OKUMA_ANAHTARI.map((o) => (
            <span key={o.sinif} className="anahtar">
              <span className={`ab-glif ${o.sinif}`} aria-hidden />
              {o.yazi}
            </span>
          ))}
        </div>
      </aside>

      {/* ── Defter gövdesi ───────────────────────────────────────────── */}
      {/* `<main>` — `<div>` DEĞİL: kabuk kendi ana bölgesini açmaz, onu
          ekran çizer (`Kabuk.tsx` §309) ve `MatrisIskeleti` de öyle yapar.
          Burada `<div>` kalmıştı: sayfanın hiç ana bölgesi olmuyordu.
          axe'ın wcag2a/aa kümesi bunu görmez (`landmark-one-main` en iyi
          uygulama kuralıdır); Lighthouse erişilebilirliği 98'de tutuyordu
          ve gerekçe hiçbir yerde yazmıyordu. */}
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        {/* Lede paylaşılan gramerdir (`EkranBasligi`): Risk ve Varlık ile
            aynı Barlow 26px başlık, aynı ölçüt satırı. Eylül 2026 denetimi
            bu ekranda 34px ayrı bir başlık + ayrı kural ölçtü; gövde
            (matris) 1366×768'de 283px'te başlıyordu. Endeks ölçülemediyse
            "—" ve `unk` durumu: sıfır değil, bilinmeyen. */}
        <EkranBasligi
          eyebrow={`Uyum · ${cerceve.ad}`}
          baslik="Nerede uygunsuz, ve neden?"
          metrikler={[
            { deger: m.uygun, yazi: 'Uygun', durum: 'ok' },
            { deger: m.kismi, yazi: 'Kısmi', durum: m.kismi > 0 ? 'md' : undefined },
            { deger: m.uygunsuz, yazi: 'Uygunsuz', durum: m.uygunsuz > 0 ? 'bd' : undefined },
            { deger: m.endeks === null ? '—' : `%${m.endeks}`, yazi: 'Endeks', durum: m.endeks === null ? 'unk' : undefined },
          ]}
        />
        {/* Giriş satırı: solda okuma cümlesi, sağda eğilim şeridi — iki
            ayrı bant değil tek satır; matris 1366×768'de ~260px'te başlar. */}
        <div className="ab-c-giris">
          <p className="cumle">
            Satır = kontrol · sütun = santral · satıra tıklayınca gerekçe aynı defterde açılır
          </p>
          <EgilimSeridi noktalar={egilim} surecVar={surecId !== null} bugun={m.endeks} />
        </div>

        {gorunur.length === 0 ? (
          <p style={{ color: 'var(--i3)', fontSize: 13 }}>
            Bu çerçevede uygulanabilir kontrol bulunmuyor.
          </p>
        ) : (
          <UyumMatrisi
            cerceve={cerceve}
            satirlar={gorunur}
            santraller={santraller}
            acik={acik}
            setAcik={setAcik}
            yazabilir={yazabilir}
          />
        )}

        <p className="etiket" style={{ marginTop: 26, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span>{m.toplam} kapsam içi hücre</span>
          {m.olculmemis > 0 && <span>{m.olculmemis} hücre değerlendirilmedi — sıfır değil, bilinmeyen</span>}
          <span>Gösterilen {gorunur.length} kontrol / {satirlar.length}</span>
          {cerceve.surumEtiketi && <span>Sürüm {cerceve.surumEtiketi}</span>}
          {cerceve.yururluk && <span>Yürürlük {kisaTarih(cerceve.yururluk)}</span>}
        </p>

        <KapsamDisi cerceve={cerceve} />
      </main>
    </div>
  );
}

/* ── C15 · Eğilim şeridi ──────────────────────────────────────────────
   Son 12 anlık görüntünün endeksi, 320×48 çizgi. Donut yok, alan dolgusu
   yok: defter bir çizgi ve tarih eksenidir. Yüzde her noktada ekranda
   yazılmaz — ilk, son ve fark sözcükle yazılır; ara noktalar `<title>`
   ile okunur ama kritik bilgi (fark) ipucuna hapsedilmez.

   Ölçülmemiş nokta (o gün değerlendirilmiş kontrol yok) çizgiye girmez;
   eksende boş bir tik olarak kalır. Sıfıra çekmek "düştük" yalanı olurdu. */
function EgilimSeridi({ noktalar, surecVar, bugun }: {
  noktalar: TrendNoktasi[]; surecVar: boolean; bugun: number | null;
}) {
  const geometri = trendGeometrisi(noktalar);
  const fark = trendFarki(noktalar);
  const olculen = geometri.filter((g) => g.y !== null);
  const cizgi = olculen.map((g) => `${g.x.toFixed(1)},${(g.y as number).toFixed(1)}`).join(' ');
  const ilk = noktalar.find((p) => p.yuzde !== null) ?? null;
  const son = [...noktalar].reverse().find((p) => p.yuzde !== null) ?? null;

  const farkYazisi = fark === null
    ? 'fark ölçülmedi'
    : fark === 0 ? 'değişim yok' : `${fark > 0 ? '+' : '−'}${Math.abs(fark)} puan`;
  const farkDurumu = fark === null ? 'unk' : fark > 0 ? 'ok' : fark < 0 ? 'bd' : 'pl';

  return (
    <section className="ab-trend" aria-label="Uyum eğilimi">
      <div className="bas">
        <span className="etiket">
          Eğilim{noktalar.length > 0 && <> · son {noktalar.length} anlık görüntü</>}
        </span>
        {noktalar.length > 0 && (
          <span className={`mono cumle d-${farkDurumu}`}>
            {ilk && son && ilk !== son
              ? <>{ilk.etiket} %{ilk.yuzde} → {son.etiket} %{son.yuzde} · {farkYazisi}</>
              : son ? <>{son.etiket} %{son.yuzde} · tek ölçüm</> : 'anlıklarda değerlendirilmiş kontrol yok'}
            {bugun !== null && <> · bugün %{bugun}</>}
          </span>
        )}
      </div>

      {!surecVar ? (
        <p className="cumle bos">Bu çerçevenin yürüyen uyum süreci yok — eğilim tutulmuyor.</p>
      ) : noktalar.length === 0 ? (
        <p className="cumle bos">Henüz anlık görüntü yok — ilk anlık motor çalışınca düşer.</p>
      ) : (
        <figure className="cizim">
          <svg
            viewBox={`0 0 ${TREND_EN} ${TREND_BOY}`}
            width={TREND_EN} height={TREND_BOY}
            role="img"
            aria-label={`Uyum endeksi eğilimi, ${noktalar.length} nokta, ${farkYazisi}`}
          >
            {/* %50 ve %100 kılavuzları — eksen sözcükle okunur, renkle değil. */}
            <line className="kilavuz" x1={0} x2={TREND_EN} y1={TREND_BOY / 2} y2={TREND_BOY / 2} />
            {olculen.length > 1 && <polyline className="cizgi" points={cizgi} />}
            {geometri.map((g) => g.y === null ? (
              <line key={g.nokta.tarih} className="tik bos"
                x1={g.x} x2={g.x} y1={TREND_BOY - 6} y2={TREND_BOY}>
                {/* <title> çocuğu TEK dize: birden çok JSX ifadesi React 19'da
                    hidrasyon uyuşmazlığı verir (sunucu tek düğüm yazar). */}
                <title>{`${g.nokta.etiket} · ölçülmedi`}</title>
              </line>
            ) : (
              <circle key={g.nokta.tarih} className="nokta" cx={g.x} cy={g.y} r={2.5}>
                <title>{`${g.nokta.etiket} · %${g.nokta.yuzde} · ${g.nokta.degerlendirilen} değerlendirilen`}</title>
              </circle>
            ))}
          </svg>
          <figcaption className="mono eksen">
            <span>{noktalar[0].etiket}</span>
            <span>{noktalar[noktalar.length - 1].etiket}</span>
          </figcaption>
        </figure>
      )}
    </section>
  );
}

/* ── Matris + satır içi genişleme ────────────────────────────────────── */

function UyumMatrisi({ cerceve, satirlar, santraller, acik, setAcik, yazabilir }: {
  cerceve: CerceveVerisi;
  satirlar: MaddeSatiri[];
  santraller: TesisSatiri[];
  acik: Acik;
  setAcik: (a: Acik) => void;
  yazabilir: boolean;
}) {
  /* Santral sütunu 68→88px: "Kızıldere III JES" ve "Zorlu Center Genel
     Müdürlük" 68px'te 3–4 satıra kırılıyor, altındaki kod da sarıyordu
     (ölçüldü, 1366×768: başlık satırı 5 satır/64px). Başlıkta yalnız
     kısa ad kalır, EN FAZLA 2 satır (`line-clamp`); kod ve künye `title`a
     ve hücrenin `aria-label`ına gider — bilgi kaybolmaz, satır sayısı
     denetim altına girer (ürün sahibi kabulü 2026-09, madde 2). */
  const kolonlar = `92px minmax(220px, 1fr) repeat(${santraller.length}, 88px) 78px`;
  const genel = uyumOzeti(sayHam(satirlar)).yuzde;
  /* Yapışkan başlık ↔ yatay kaydırma çelişkisi: `overflow-x:auto` olan
     bir kap içinde `position:sticky` sayfaya değil kaba yapışır (etkisiz).
     Bu yüzden kaydırma yalnız GEREKİNCE açılır: içerik sığıyorsa kap
     taşmasız kalır ve başlık sayfa kaydırılırken üstte durur; sığmıyorsa
     (çok santralli çerçeve) kap yatay kayar, başlık akışta kalır. Ölçüm
     ResizeObserver ile; sunum kararı, veri akışına dokunmaz. */
  const kap = useRef<HTMLDivElement>(null);
  const [tasar, setTasar] = useState(false);
  useEffect(() => {
    const el = kap.current;
    if (!el) return;
    const olc = () => {
      // kaydırma kapalıyken ölç: ızgaranın gerçek genişliği ilk satırdan okunur
      const bas = el.querySelector<HTMLElement>('.bas');
      const gerek = bas ? bas.scrollWidth : el.scrollWidth;
      setTasar(gerek > el.clientWidth + 1);
    };
    olc();
    const ro = new ResizeObserver(olc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [santraller.length]);
  return (
    <div
      ref={kap}
      className={`ab-mtx${tasar ? ' kayar' : ''}`}
      style={{ ['--mtx-kolon' as string]: kolonlar }}
      onKeyDown={(e) => { if (e.key === 'Escape' && acik) { e.stopPropagation(); setAcik(null); } }}
    >
      <div className="bas">
        <span className="kolonbas">Kontrol</span>
        <span className="kolonbas">Başlık</span>
        {santraller.map((t) => (
          <span key={t.id} className="santral" title={`${t.ad} · ${t.kod} · ${t.alt}`}>
            <span className="ad">{t.ad}</span>
          </span>
        ))}
        <span className="kolonbas" style={{ textAlign: 'right' }}>Kapsam</span>
      </div>

      {satirlar.map((s) => {
        const satirAcik = acik?.maddeId === s.maddeId;
        return (
          <div key={s.maddeId}>
            <div className={`satir${satirAcik ? ' acik' : ''}`}>
              <span className="mono kod">{s.kisaKod || s.kod}</span>
              <span className="baslik">{s.baslik}</span>
              {santraller.map((t) => {
                const k = s.hucreler.get(t.id);
                const g = glif(k);
                const bu = satirAcik && acik?.tesisId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`hucre${bu ? ' secili' : ''}`}
                    aria-expanded={bu}
                    aria-label={`${s.kisaKod || s.kod} · ${t.ad} · ${g.soz}`}
                    onClick={() => setAcik(bu ? null : (k ? { maddeId: s.maddeId, tesisId: t.id } : null))}
                    disabled={!k || k.im === null}
                  >
                    <span className={`ab-glif ${g.sinif}`} aria-hidden />
                  </button>
                );
              })}
              <span className="mono kapsam">{s.kapsamda} / {santraller.length}</span>
            </div>

            {satirAcik && acik && (
              <Gerekce
                cerceve={cerceve}
                satir={s}
                tesis={santraller.find((t) => t.id === acik.tesisId)!}
                kontrol={s.hucreler.get(acik.tesisId)!}
                kapat={() => setAcik(null)}
                yazabilir={yazabilir}
              />
            )}
          </div>
        );
      })}

      {/* Santral endeksi — matrisin altında, prototipteki gibi */}
      {/* Sütun özeti — prototipteki gibi matrisin ALTINDA, kalın kuralla.
          Ölçülmemiş sütun "—" gösterir: 0 uyum ile hiç değerlendirilmemiş
          aynı şey değildir (UNKNOWN ≠ ZERO). */}
      <div className="satir endeks">
        <span className="etiket">Endeks</span>
        <span style={{ fontSize: 11.5, color: 'var(--i3)' }}>
          Santral bazında ağırlıklı uyum
        </span>
        {santraller.map((t) => {
          const e = santralEndeksi(satirlar, t.id);
          return (
            <span key={t.id} className="mono num deger"
              style={e === null ? { color: 'var(--i3)' } : undefined}>
              {e === null ? '—' : `%${e}`}
            </span>
          );
        })}
        <span className="mono num" style={{ textAlign: 'right', fontSize: 12 }}>
          {genel === null ? '—' : `%${genel}`}
        </span>
      </div>
    </div>
  );
}

/** Kapsam içi hücrelerin HAM durum sayımı — `uyumOzeti` girdisi. */
function sayHam(satirlar: MaddeSatiri[], tesisId?: string): Record<string, number> {
  const sayilar: Record<string, number> = {};
  for (const s of satirlar) {
    const hucreler = tesisId
      ? [s.hucreler.get(tesisId)].filter(Boolean) as Kontrol[]
      : [...s.hucreler.values()];
    for (const k of hucreler) {
      if (k.im === null) continue;          // kapsam dışı: iki paydanın da dışında
      sayilar[k.ham] = (sayilar[k.ham] ?? 0) + 1;
    }
  }
  return sayilar;
}

/** Santral sütununun endeksi. Hiç DEĞERLENDİRİLMEMİŞSE null — sıfır değil. */
function santralEndeksi(satirlar: MaddeSatiri[], tesisId: string): number | null {
  return uyumOzeti(sayHam(satirlar, tesisId)).yuzde;
}

/* ── Satır içi gerekçe — çekmece DEĞİL ───────────────────────────────
   Prototipin materyal farkı: 420px çekmece defteri terk ettirir, gerekçe
   SATIRIN ALTINDA sütunlar hâlinde açılır ve okuyucu matrisi görmeye
   devam eder. Yazma eylemi (kanıt talebi) İÇERİK OLARAK AYNIDIR: aynı
   sunucu eylemi, aynı denetim bağı, aynı yetki kapısı — yalnız çekmece
   yerine bu blokta yaşar. */

function Gerekce({ cerceve, satir, tesis, kontrol, kapat, yazabilir }: {
  cerceve: CerceveVerisi;
  satir: MaddeSatiri;
  tesis: TesisSatiri;
  kontrol: Kontrol;
  kapat: () => void;
  yazabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [form, setForm] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);
  const [talep, setTalep] = useState({
    baslik: `${kontrol.kisaKod} ${kontrol.baslik} — ${tesis.ad}`,
    sonTarih: '',
  });

  /* Aile sayacı çekmeceden devralındı: "bu ailede kaç kontrol takipte".
     Sayım o SANTRALİN satırından gelir — matris devrildi, veri değil. */
  const aile = cerceve.aileler.find((a) => a.id === kontrol.aileId);
  const aileKontrolleri = tesis.kontroller.filter((k) => k.aileId === kontrol.aileId);
  const aileAcik = aileKontrolleri.filter((k) => acikMi(k.ham)).length;

  const denetimYok = !cerceve.denetim;
  const kapali = !yazabilir || denetimYok;

  /* Örtü kararı kütüğün kuralıyla alınır (`belgeOrtusu`); matris kendi
     "karşılandı" tanımını icat ederse iki ekran birbirini yalanlar. */
  const ortu = belgeOrtusu(kontrol.belgeler.map((b) => b.durum));

  return (
    <section
      className="ab-mtx-acilan"
      aria-label={`${satir.kisaKod || satir.kod} · ${tesis.ad} gerekçesi`}
    >
      <header>
        <span className="etiket">Açılan hücre</span>
        <span className="etiket sag">
          Son değerlendirme {kisaTarih(kontrol.sonDegerlendirme)}
        </span>
        <button type="button" className="ab-dugme" onClick={kapat}>
          Satırı kapat
        </button>
      </header>

      <h2 className="ab-c-baslik acilan-baslik">
        {satir.kisaKod || satir.kod} · {tesis.ad} — {durumSozu(kontrol.ham).toLocaleLowerCase('tr-TR')}
      </h2>
      {/* Prototipte kontrol adı yalnız matris satırında vardı; ISO kodu
          kendini anlatıyordu. Bizim kodlarımız (4.2.1) anlatmıyor, o
          yüzden başlık burada da yazılır. */}
      <p className="acilan-ust">
        {kontrol.kod} · {kontrol.baslik}
        {aile && ` · ${aile.baslik}`}
      </p>

      <div className="sutunlar">
        {/* 1 · NEDEN */}
        <div>
          <span className="etiket">Neden bu durumda</span>
          <p className="acilan-metin">
            {kontrol.gerekce || 'Gerekçe kaydı yok — değerlendirme notu girilmemiş.'}
          </p>
          <dl className="acilan-dl">
            <Satirci ad="Takipte" deger={acikMi(kontrol.ham) ? 'evet' : 'hayır'} />
            <Satirci ad={`${aile?.kisa ?? 'Aile'} · takipte`}
              deger={`${aileAcik} / ${aileKontrolleri.length}`} mono />
            <Satirci ad="Bu santralde kapsam"
              deger={`${satir.kapsamda} / ${cerceve.satirlar.length}`} mono />
          </dl>
        </div>

        {/* 2 · KANIT — ve tek yazma eylemi */}
        <div>
          <span className="etiket">Kanıt dosyası</span>
          <p className="acilan-metin mono kucuk kanit">
            <span className={`ab-glif ${GLIF_SINIF[kontrol.kanitIm] ?? 'g-yok'}`} aria-hidden />
            {kanitSozu(kontrol)}
          </p>
          <dl className="acilan-dl">
            <Satirci ad="Güven" deger={etiketle(kontrol.guven)} />
          </dl>

          {form ? (
            <div className="acilan-form">
              <label>
                <span className="etiket">Talep başlığı</span>
                <input value={talep.baslik} disabled={bekliyor}
                  onChange={(e) => setTalep({ ...talep, baslik: e.target.value })} />
              </label>
              <label>
                <span className="etiket">Son tarih</span>
                <input type="date" value={talep.sonTarih} disabled={bekliyor}
                  onChange={(e) => setTalep({ ...talep, sonTarih: e.target.value })} />
              </label>
              {hata && <p className="acilan-hata" role="alert">{hata}</p>}
              <div className="acilan-dugmeler">
                <button type="button" className="ab-dugme birincil"
                  disabled={bekliyor || kapali || !talep.baslik.trim()}
                  onClick={() => calistir(
                    () => kanitTalebiEkle({
                      denetimId: cerceve.denetim!.id,
                      baslik: talep.baslik,
                      aciklama: `${kontrol.kod} · ${tesis.ad} · ${kontrol.gerekce}`,
                      sonTarih: talep.sonTarih || null,
                    }),
                    () => { setForm(false); setGonderildi(true); },
                  )}>
                  {bekliyor ? 'Açılıyor…' : 'Talebi aç'}
                </button>
                <button type="button" className="ab-dugme" onClick={() => setForm(false)}>
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="ab-dugme" disabled={kapali}
              onClick={() => setForm(true)}>
              Kanıt talep et
            </button>
          )}

          {/* Kapalı düğmenin NEDENİ yazılır — prototipte gri düğmenin
              gerekçesi yoktu (harita §7 kusur 1: kritik bilgi salt görsel). */}
          <p className="acilan-dip">
            {[
              gonderildi && 'Kanıt talebi açıldı; denetim izine yazıldı.',
              denetimYok && 'Bu çerçevede açık denetim yok — talep denetime bağlanır.',
              !yazabilir && !denetimYok && 'Kanıt talebi için denetim yazma yetkisi gerekir.',
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* 3 · BELGE ÖRTÜSÜ — C22/C23 ters bağı
            Kütük "hangi kontrolün karşılığı yok" diye sorar; burası aynı
            sorunun öbür yönüdür: bu kontrolü hangi belge karşılıyor. Kanıtın
            YANINDA durur çünkü ikisi karıştırılan iki şeydir — kanıt bir anın
            ispatıdır, belge yaşam döngüsü olan yönetişim kaydıdır. */}
        <div>
          <span className="etiket">Karşılayan belge</span>
          <p className="acilan-metin mono kucuk kanit">
            <span className={`ab-glif ${GLIF_SINIF[ORTU_IM[ortu]] ?? 'g-yok'}`} aria-hidden />
            {ORTU_SOZU[ortu]}
          </p>

          {kontrol.belgeler.length > 0 ? (
            <div className="acilan-zincir">
              {kontrol.belgeler.map((b) => (
                <Link key={b.id} href={`/dokumanlar#belge=${encodeURIComponent(b.kod)}`}>
                  <span className="ust">
                    <span className={`ab-glif ${GLIF_SINIF[BELGE_IM[b.durum as BelgeDurumu]] ?? 'g-yok'}`}
                      aria-hidden />
                    <span className="tur">
                      {BELGE_SOZU[b.durum as BelgeDurumu] ?? b.durum}
                      {b.kurumsal && ' · kurumsal'}
                    </span>
                  </span>
                  <span className="mono kod">{b.kod}</span>
                  <span className="alt">{b.baslik}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="acilan-metin kucuk">
              Bu kontrole bağlanmış yönetişim belgesi yok. Kütükte karşılığı
              olmayan bir kontrol, denetimde sözlü savunmayla karşılanır.
            </p>
          )}

          <Link className="ab-dugme bagli" href="/dokumanlar">
            Belge kütüğünde aç →
          </Link>

          {/* Kritik bilgi ipucunda DEĞİL, burada yazılı: taslak belge
              "karşıladı" demek denetimde en pahalı yalandır. */}
          <p className="acilan-dip">
            {ortu === 'yalniz_taslak'
              ? 'Bağlı belge yürürlükte değil — denetimde karşılığı yoktur.'
              : ortu === 'belgesiz'
                ? 'Belge bağı hiç kurulmamış olabilir; kütük bunu bilmez.'
                : 'Yalnız yürürlükteki belge karşılar; taslak ve askıdakiler sayılmaz.'}
          </p>
        </div>

        {/* 4 · YÖNETİŞİM ZİNCİRİ */}
        <div>
          <span className="etiket">Yönetişim zinciri</span>
          {kontrol.zincir.length > 0 ? (
            <div className="acilan-zincir">
              {kontrol.zincir.map((z) => {
                const [tur, ...kalan] = z.alt.split(' · ');
                return (
                  <Link key={z.id} href={z.yol}>
                    <span className="ust">
                      <span className="tur">{tur}</span>
                      {z.suren && <span className="ab-glif g-kismi" aria-hidden />}
                    </span>
                    <span className="mono kod">{z.kod}</span>
                    {kalan.length > 0 && <span className="alt">{kalan.join(' · ')}</span>}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="acilan-metin kucuk">
              Bu kontrole bağlı risk, bulgu veya proje kaydı yok.
            </p>
          )}
          <Link className="ab-dugme bagli"
            href={`/uyum/${cerceve.kod}?aile=${encodeURIComponent(aile?.kod ?? '')}`
              + `&kontrol=${encodeURIComponent(kontrol.kod)}`}>
            Kontrol ağacında aç →
          </Link>
        </div>

        {/* 5 · SORUMLULUK VE SÜRE */}
        <div>
          <span className="etiket">Sorumluluk ve süre</span>
          <dl className="acilan-dl">
            <Satirci ad="Kontrol sahibi" deger={kontrol.sahip ?? 'atanmadı'} />
            <Satirci ad="Son tarih" deger={kontrol.termin || '—'} />
            <Satirci ad="Santral" deger={tesis.kod} mono />
          </dl>
          <p className="acilan-dip">{tesis.ad} · {tesis.alt}</p>
        </div>
      </div>
    </section>
  );
}

/** Kanıt dizesi ham sayaç olabiliyor ("1"); tek başına ne olduğu
    okunmuyor. Sözcük `veri.ts`teki ipucu kalıbıyla aynıdır. */
function kanitSozu(k: Kontrol): string {
  if (!k.kanitYazi || k.kanitYazi === 'yok') return 'kanıt yok';
  return `kanıt ${k.kanitYazi}`;
}

function Satirci({ ad, deger, mono, im }: {
  ad: string; deger: string; mono?: boolean; im?: string;
}) {
  return (
    <div className="cift">
      <dt>{ad}</dt>
      <dd className={mono ? 'mono' : undefined}>
        {im && <span className={`ab-glif ${GLIF_SINIF[im] ?? 'g-yok'}`} aria-hidden />}
        {deger}
      </dd>
    </div>
  );
}

/* ── Kapsam dışı ve kararsız santraller ──────────────────────────────
   GİZLENMEZ: "kapsam dışı" bir karardır ve gerekçesi okunabilir olmalı. */
function KapsamDisi({ cerceve }: { cerceve: CerceveVerisi }) {
  const disarida = cerceve.kapsam?.filter((k) => k.durum !== 'kapsamda') ?? [];
  if (disarida.length === 0) return null;
  return (
    <div style={{ marginTop: 30, borderTop: '1px solid var(--hr)', paddingTop: 16 }}>
      <span className="etiket">Kapsam kararı</span>
      <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
        {disarida.map((k) => (
          <li key={k.tesisId} style={{ fontSize: 12, color: 'var(--i2)', display: 'flex', gap: 12 }}>
            <span className="mono" style={{ color: 'var(--i3)', minWidth: 96 }}>{k.kod}</span>
            <span style={{ minWidth: 120 }}>{k.durum === 'disarida' ? 'kapsam dışı' : 'karar verilmedi'}</span>
            <span style={{ color: 'var(--i3)' }}>{k.gerekce}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
