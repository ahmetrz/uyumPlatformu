import type { Metadata } from 'next';
import { kontrast, bicimle, aaGecer } from '@/lib/atlas/kontrast';

export const metadata: Metadata = { title: 'Atlas — Tasarım Sistemi' };

/* Faz 1 çıkış kriteri (07 §Phase 1):
   "a token reference page renders every colour with its measured contrast ratio,
    every type role at its exact size/tracking, and the spacing scale."
   Oranlar iddia edilmez — lib/atlas/kontrast.ts ile hesaplanır.

   SANTRAL KAPSAMI: bu ekran BİLEREK kapsamsızdır, çünkü hiç veri okumaz —
   içeriğinin tamamı bu dosyadaki sabit token tablolarından ve
   `lib/atlas/kontrast.ts` hesabından gelir; ortada daraltılacak bir kayıt,
   dolayısıyla sızacak bir santral yoktur. */

const PP = '#F6F4EE';

/** Koyu yüzeyde mürekkep ters döner — kontrast doğru tarafla ölçülsün. */
const koyuYuzey = (hex: string) => ['#221F1B', '#191713'].includes(hex.toUpperCase());

const YUZEYLER = [
  ['surface/paper', '--pp', '#F6F4EE', 'Birincil uygulama yüzeyi'],
  ['surface/card', '--card', '#FFFFFF', 'Kayıt kartı, tablo gövdesi'],
  ['surface/sunken', '--sunken', '#F1EEE6', 'Drawer zemini, tablo başlığı'],
  ['surface/row-hover', '--row-hover', '#EFECE3', 'Satır hover — tek değer'],
  ['surface/row-selected', '--row-sel', '#FBF6F0', 'Seçili/kritik satır tonu'],
  ['surface/band', '--band', '#221F1B', 'Koyu bant, birincil düğme, tooltip'],
  ['surface/band-deep', '--band2', '#191713', 'Fotoğrafik hero tabanı, grafik tuvali'],
] as const;

const MUREKKEP = [
  ['ink/primary', '--ink', '#1E2120', 'Başlık, anahtar değer', true],
  ['ink/secondary', '--i2', '#585C58', 'Gövde, destekleyici değer', true],
  ['ink/tertiary', '--i3', '#696D68', 'Etiket, meta, eksen — en düşük yasal işlevsel mürekkep', true],
  ['ink/decorative', '--i4', '#8D918C', 'Kesikli alt çizgi, saç çizgisi — ASLA metin', false],
  ['border/hairline', '--hr', '#E5E2D9', 'Satır ayracı', false],
  ['border/strong', '--hr2', '#D0CCC0', 'Kart kenarı, bölüm çizgisi', false],
] as const;

const DURUMLAR = [
  ['state/ok', '--ok', '#2B7548', 'Uyumlu · yolunda · doğrulandı'],
  ['state/warn', '--md', '#8A6412', 'Kısmi · bayat kanıt · ufuk yaklaşıyor'],
  ['state/critical', '--bd', '#AC3F2D', 'Uyumsuz · gecikmiş · bloke · kritik risk'],
  ['state/planned', '--pl', '#3A6590', 'Taslak · aday · süreli'],
  ['state/unknown', '--unk', '#696D68', 'Değerlendirilmedi — içi boş 45° elmas'],
] as const;

const URETIM = [
  ['gen/jes', '--jes', '#A15B2C', '#C47A3F', 'Jeotermal'],
  ['gen/hes', '--hes', '#2F5C74', '#5F8FA8', 'Hidro'],
  ['gen/res', '--res', '#6D8480', '#9DB3A8', 'Rüzgâr'],
  ['gen/ges', '--ges', '#A2822F', null, 'Güneş (hibrit yardımcı)'],
] as const;

const TIPOGRAFI = [
  ['Hero başlığı (Plant 360)', 't-hero', '56 / 1.0 · Archivo · −0.032em · 87%', 'Kızıldere 3 JES'],
  ['Board başlığı (flagship)', 't-board', '30 / 1.12 · Archivo · −0.024em · 90%', 'Enerji portföyü'],
  ['Ekran başlığı (operasyonel)', 't-screen', '28 / 1.10 · Archivo · −0.022em · 90%', 'Risk kütüğü'],
  ['Drawer / bölüm başlığı', 't-section', '20 / 1.28 · Archivo · −0.016em · 92%', 'Kuyubaşı RTU güzergâhı'],
] as const;

const KUCUK = [
  ['Eyebrow (bağlam)', 't-eyebrow', '9.5 · Azeret Mono · 0.20em', 'PORTFÖY / ZORLU DOĞAL'],
  ['Bölüm etiketi', 't-label', '9.5 · Azeret Mono · 0.16em', 'ŞU AN ÖNEMLİ OLAN'],
  ['Metrik alt yazısı', 't-caption', '9 · Azeret Mono · 0.13em', 'BİLİNMEYEN %18'],
  ['Kolon başlığı', 't-colhead', '8.5 · Azeret Mono · 0.13em', 'SANTRAL · SAHİP · HEDEF'],
] as const;

const BOSLUK = [2, 3, 4, 6, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 44, 46, 52, 56];

function Oran({ on, zemin, tur = 'metin' }: { on: string; zemin: string; tur?: 'metin' | 'buyuk' | 'bilesen' }) {
  const o = kontrast(on, zemin);
  const gecer = aaGecer(o, tur);
  return (
    <span className="mono num" style={{ fontSize: 'var(--t-code)', color: gecer ? 'var(--ok)' : 'var(--bd)' }}>
      {bicimle(o)}{gecer ? '' : ' ✕'}
    </span>
  );
}

function Bolum({ no, baslik, cocuklar }: { no: string; baslik: string; cocuklar: React.ReactNode }) {
  return (
    <section style={{ padding: '0 var(--gutter-op) var(--sec-pad-bot)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s12)',
        padding: 'var(--sec-pad-top) 0 var(--s18)' }}>
        <span className="t-caption num">{no}</span>
        <h2 className="t-section" style={{ margin: 0 }}>{baslik}</h2>
        <span style={{ flex: 1, height: 1, background: 'var(--hr)' }} />
      </div>
      {cocuklar}
    </section>
  );
}

export default function TasarimSistemi() {
  return (
    <main style={{ minHeight: '100dvh' }}>
      <header style={{ padding: 'var(--s38) var(--gutter-op) var(--s26)',
        borderBottom: '1px solid var(--hr2)' }}>
        <p className="t-eyebrow" style={{ margin: '0 0 var(--s10)' }}>
          ENERGY OPERATIONS ATLAS · FAZ 1 · TOKEN REFERANSI
        </p>
        <h1 className="t-screen" style={{ margin: 0 }}>
          Tasarım <b>token katmanı</b>
        </h1>
        <p style={{ margin: 'var(--s12) 0 0', color: 'var(--i2)', maxWidth: 720 }}>
          Kontrast oranları hesaplanmıştır (WCAG 2.1 göreli parlaklık), iddia edilmemiştir.
        </p>
      </header>

      <Bolum no="01" baslik="Yüzeyler" cocuklar={
        <div style={{ display: 'grid', gap: 'var(--s3)' }}>
          {YUZEYLER.map(([ad, degisken, hex, kullanim]) => (
            <div key={ad} style={{ display: 'grid', gridTemplateColumns: '64px 190px 92px 1fr 74px',
              alignItems: 'center', gap: 'var(--col-gap)', padding: 'var(--s10) 0',
              borderBottom: '1px solid var(--hr)' }}>
              <span style={{ height: 34, background: hex, border: '1px solid var(--hr2)' }} />
              <span className="mono" style={{ fontSize: 'var(--t-code-lg)' }}>{ad}</span>
              <span className="mono" style={{ fontSize: 'var(--t-code)', color: 'var(--i3)' }}>
                {hex}<br /><span style={{ opacity: .72 }}>{degisken}</span>
              </span>
              <span style={{ fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>{kullanim}</span>
              {/* Yüzey kendi başına ölçülmez: üzerine düşen metnin kontrastı ölçülür. */}
              <Oran on={koyuYuzey(hex) ? '#F6F4EE' : '#1E2120'} zemin={hex} />
            </div>
          ))}
        </div>
      } />

      <Bolum no="02" baslik="Mürekkep ve kenarlıklar" cocuklar={
        <div style={{ display: 'grid', gap: 'var(--s3)' }}>
          {MUREKKEP.map(([ad, degisken, hex, kullanim, islevsel]) => (
            <div key={ad} style={{ display: 'grid', gridTemplateColumns: '64px 190px 92px 1fr 74px',
              alignItems: 'center', gap: 'var(--col-gap)', padding: 'var(--s10) 0',
              borderBottom: '1px solid var(--hr)' }}>
              <span style={{ color: hex, fontSize: 'var(--t-row)', fontWeight: 600 }}>Aa</span>
              <span className="mono" style={{ fontSize: 'var(--t-code-lg)' }}>{ad}</span>
              <span className="mono" style={{ fontSize: 'var(--t-code)', color: 'var(--i3)' }}>
                {hex}<br /><span style={{ opacity: .72 }}>{degisken}</span>
              </span>
              <span style={{ fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>{kullanim}</span>
              {islevsel
                ? <Oran on={hex} zemin={PP} />
                : <span className="mono" style={{ fontSize: 'var(--t-code)', color: 'var(--i3)' }}>süs</span>}
            </div>
          ))}
        </div>
      } />

      <Bolum no="03" baslik="Semantik durumlar" cocuklar={
        <div style={{ display: 'grid', gap: 'var(--s3)' }}>
          {DURUMLAR.map(([ad, degisken, hex, anlam]) => (
            <div key={ad} style={{ display: 'grid', gridTemplateColumns: '64px 190px 92px 1fr 74px',
              alignItems: 'center', gap: 'var(--col-gap)', padding: 'var(--s10) 0',
              borderBottom: '1px solid var(--hr)' }}>
              <span>{ad === 'state/unknown'
                ? <span style={{ display: 'inline-block', width: 10, height: 10,
                    border: `1.5px solid ${hex}`, transform: 'rotate(45deg)' }} />
                : <span className="yuvarlak" style={{ display: 'inline-block', width: 11, height: 11,
                    background: hex }} />}
              </span>
              <span className="mono" style={{ fontSize: 'var(--t-code-lg)' }}>{ad}</span>
              <span className="mono" style={{ fontSize: 'var(--t-code)', color: 'var(--i3)' }}>
                {hex}<br /><span style={{ opacity: .72 }}>{degisken}</span>
              </span>
              <span style={{ fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>{anlam}</span>
              <Oran on={hex} zemin={PP} />
            </div>
          ))}
        </div>
      } />

      <Bolum no="04" baslik="Etkileşim aksanı ve üretim tipi kimliği" cocuklar={
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 190px 92px 1fr 74px',
            alignItems: 'center', gap: 'var(--col-gap)', padding: 'var(--s10) 0',
            borderBottom: '1px solid var(--hr)' }}>
            <span style={{ height: 34, background: '#3D4A4E' }} />
            <span className="mono" style={{ fontSize: 'var(--t-code-lg)' }}>accent/product</span>
            <span className="mono" style={{ fontSize: 'var(--t-code)', color: 'var(--i3)' }}>#3D4A4E</span>
            <span style={{ fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>
              Tüm etkileşim. Üretim tipi rengi DEĞİLDİR — bakır asla etkileşim için kullanılmaz.
            </span>
            <Oran on="#3D4A4E" zemin={PP} />
          </div>
          {URETIM.map(([ad, degisken, acik, koyu, tip]) => (
            <div key={ad} style={{ display: 'grid', gridTemplateColumns: '64px 190px 92px 1fr 74px',
              alignItems: 'center', gap: 'var(--col-gap)', padding: 'var(--s10) 0',
              borderBottom: '1px solid var(--hr)' }}>
              <span style={{ display: 'flex', height: 34 }}>
                <span style={{ flex: 1, background: acik }} />
                {koyu && <span style={{ flex: 1, background: koyu }} />}
              </span>
              <span className="mono" style={{ fontSize: 'var(--t-code-lg)' }}>{ad}</span>
              <span className="mono" style={{ fontSize: 'var(--t-code)', color: 'var(--i3)' }}>
                {acik}{koyu ? ` / ${koyu}` : ''}<br /><span style={{ opacity: .72 }}>{degisken}</span>
              </span>
              <span style={{ fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>
                {tip} — yalnız kimlik: santral işareti, hero eyebrow, plaka kenarı, bölüm rayı.
              </span>
              <Oran on={acik} zemin={PP} tur="bilesen" />
            </div>
          ))}
        </>
      } />

      <Bolum no="05" baslik="Tipografi rolleri" cocuklar={
        <div style={{ display: 'grid', gap: 'var(--s24)' }}>
          {TIPOGRAFI.map(([rol, sinif, olcu, ornek]) => (
            <div key={rol} style={{ borderBottom: '1px solid var(--hr)', paddingBottom: 'var(--s18)' }}>
              <div style={{ display: 'flex', gap: 'var(--s14)', marginBottom: 'var(--s10)' }}>
                <span className="t-colhead">{rol}</span>
                <span className="mono" style={{ fontSize: 'var(--t-code)', color: 'var(--i3)' }}>{olcu}</span>
              </div>
              <div className={sinif}>{ornek.split(' ').slice(0, -1).join(' ')} <b>{ornek.split(' ').slice(-1)}</b></div>
            </div>
          ))}
          <div style={{ display: 'grid', gap: 'var(--s14)' }}>
            {KUCUK.map(([rol, sinif, olcu, ornek]) => (
              <div key={rol} style={{ display: 'grid', gridTemplateColumns: '190px 210px 1fr',
                alignItems: 'center', gap: 'var(--col-gap)', padding: 'var(--s8) 0',
                borderBottom: '1px solid var(--hr)' }}>
                <span style={{ fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>{rol}</span>
                <span className="mono" style={{ fontSize: 'var(--t-code)', color: 'var(--i3)' }}>{olcu}</span>
                <span className={sinif}>{ornek}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="t-colhead" style={{ margin: '0 0 var(--s10)' }}>VERİ TİPOGRAFİSİ · TABULAR</p>
            <div className="num" style={{ fontSize: 'var(--t-metric)', fontWeight: 700, lineHeight: 1 }}>
              165<span style={{ fontSize: 'var(--t-metric-den)', fontWeight: 400, color: 'var(--i3)' }}> / 412</span>
            </div>
            <p className="t-caption" style={{ margin: 'var(--s6) 0 0' }}>METRİK DEĞERİ 26 / 700 · PAYDA 15 / 400</p>
          </div>
        </div>
      } />

      <Bolum no="06" baslik="Boşluk ölçeği" cocuklar={
        <div style={{ display: 'grid', gap: 'var(--s6)' }}>
          {BOSLUK.map((n) => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '54px 1fr',
              alignItems: 'center', gap: 'var(--col-gap)' }}>
              <span className="mono num" style={{ fontSize: 'var(--t-code)', color: 'var(--i3)' }}>{n}px</span>
              <span style={{ height: 8, width: n, background: 'var(--jes)', opacity: .55 }} />
            </div>
          ))}
        </div>
      } />

      <Bolum no="07" baslik="Kenarlık, yarıçap, yükseklik" cocuklar={
        <div style={{ display: 'grid', gap: 'var(--s18)', maxWidth: 760 }}>
          <p style={{ margin: 0, fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>
            Yarıçap her yerde <b>0</b>. İstisna yalnız durum noktası ve avatar dairesi.
            Gölge yalnız üç durumda vardır; tablo, satır, kart, drawer ve düğmede gölge yoktur.
          </p>
          <div style={{ display: 'flex', gap: 'var(--s24)' }}>
            {([['--sh-lift', 'timeline / EOL hover'], ['--sh-tip', 'tooltip / popover'],
               ['--sh-node', 'koyu yüzeyde grafik düğümü']] as const).map(([v, n]) => (
              <div key={v} style={{ flex: 1 }}>
                <div style={{ height: 62, background: v === '--sh-node' ? 'var(--band2)' : 'var(--card)',
                  border: '1px solid var(--hr2)', boxShadow: `var(${v})` }} />
                <p className="t-caption" style={{ margin: 'var(--s10) 0 0' }}>{n}</p>
              </div>
            ))}
          </div>
        </div>
      } />

      <Bolum no="08" baslik="Materyaller" cocuklar={
        <div style={{ display: 'flex', gap: 'var(--s24)' }}>
          {([['--strata', 'strata — ray, odak kartı arkası'],
             ['--contour', 'contour — hero alt bandı'],
             ['--graph-glow', 'graph-glow — ilişki/topoloji tuvali']] as const).map(([v, n]) => (
            <div key={v} style={{ flex: 1 }}>
              <div className="dokulu" style={{ height: 92, border: '1px solid var(--hr2)',
                background: v === '--graph-glow' ? `var(${v}), var(--band2)` : `var(${v}), var(--pp)` }} />
              <p className="t-caption" style={{ margin: 'var(--s10) 0 0' }}>{n}</p>
            </div>
          ))}
        </div>
      } />
    </main>
  );
}
