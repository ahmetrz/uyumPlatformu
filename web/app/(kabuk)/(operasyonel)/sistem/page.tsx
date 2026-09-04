import type { Metadata } from 'next';
import Link from 'next/link';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { kontrast, bicimle, aaGecer } from '@/lib/kontrast';
import { girisZorunlu } from '@/lib/erisim';

export const metadata: Metadata = { title: 'Tasarım sistemi' };

/* ═══════════════════════════════════════════════════════════════════════
   TOKEN REFERANSI

   Bu ekran token değerlerini İDDİA ETMEZ: `app/kabuk.css` dosyasını
   OKUR ve tek paletin token değerlerini olduğu gibi
   listeler; kontrast oranları `lib/kontrast.ts` ile HESAPLANIR.

   Eski sürüm değerleri kaynak dosyadan bağımsız, elle yazılmış tablolarda
   tutuyordu. Bir token değişince referans sessizce yalan söylüyordu —
   tasarım sistemi belgesinin yapabileceği en kötü şey budur. Şimdi
   kaynak tek: CSS dosyası.

   SANTRAL KAPSAMI: bu ekran bilerek kapsamsızdır çünkü hiç KAYIT okumaz;
   içeriğinin tamamı stil dosyasından gelir, daraltılacak bir veri yok.

   OTURUM KAPISI: kapsamsız olması oturumsuz olması demek değildir. Ekran
   kabuğun içinde çizilir ve kabuk, kurumun bilgi mimarisini (ray, kapsam
   çubuğu, grup adı) gösterir; oturumsuz bir ziyaretçi bunu görmemeli.
   Kardeş ekranların kalıbı aynen: `girisZorunlu()` — oturum yoksa /giris.
   ═══════════════════════════════════════════════════════════════════════ */

const KAYNAK = path.join(process.cwd(), 'app', 'kabuk.css');

type Palet = Record<string, string>;

/** Bir `.ab[data-yon='x'] { … }` bloğundaki renk token'larını çıkarır. */
function paletOku(css: string, secici: string): Palet {
  const i = css.indexOf(secici);
  if (i === -1) return {};
  const govde = css.slice(i, css.indexOf('}', i));
  const harita: Palet = {};
  for (const m of govde.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    harita[m[1]] = m[2];
  }
  return harita;
}

/** `.ab { --s10: 10px; … }` ölçek bloğunu çıkarır. */
function olcekOku(css: string): Palet {
  const i = css.indexOf('.ab {\n  --s2:');
  if (i === -1) return {};
  const govde = css.slice(i, css.indexOf('\n}', i));
  const harita: Palet = {};
  for (const m of govde.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) harita[m[1]] = m[2].trim();
  return harita;
}

/* Tek palet (UX denetimi 2026-09): üç yön kipi birleştirildi; yoğunluk
   (amiral · operasyonel · tezgâh) ölçüdür, renk değil. */
const YONLER = [
  { kod: 'tek', ad: 'Tek palet · Saha dili', alt: 'Bakır aksan · Barlow Condensed / Inter / JetBrains Mono · 56px üst çubuk + 36px ikincil sıra' },
] as const;

/** Mürekkep token'ı → hangi zeminlerde ve hangi eşikte okunmalı. */
const MUREKKEPLER: { anahtar: string; rol: string; esik: 'metin' | 'bilesen' }[] = [
  { anahtar: '--murekkep', rol: 'Başlık, anahtar değer', esik: 'metin' },
  { anahtar: '--i2', rol: 'Gövde metni', esik: 'metin' },
  { anahtar: '--i3', rol: 'Etiket, meta, kolon başlığı', esik: 'metin' },
  { anahtar: '--ok', rol: 'Uyumlu · yolunda · doğrulandı', esik: 'metin' },
  { anahtar: '--md', rol: 'Kısmi · bayat kanıt · ufuk yaklaşıyor', esik: 'metin' },
  { anahtar: '--bd', rol: 'Uyumsuz · gecikmiş · kritik risk', esik: 'metin' },
  { anahtar: '--pl', rol: 'Taslak · aday · süreli', esik: 'metin' },
  { anahtar: '--unk', rol: 'Değerlendirilmedi — bilinmeyen', esik: 'metin' },
  { anahtar: '--aksan', rol: 'Aktif kenar, işaret, odak halkası', esik: 'bilesen' },
  { anahtar: '--jes', rol: 'Jeotermal kimliği', esik: 'bilesen' },
  { anahtar: '--hes', rol: 'Hidroelektrik kimliği', esik: 'bilesen' },
  { anahtar: '--res', rol: 'Rüzgâr kimliği', esik: 'bilesen' },
  { anahtar: '--ges', rol: 'Güneş kimliği', esik: 'bilesen' },
];

const ZEMINLER = ['--zemin', '--panel', '--panel2', '--secim'] as const;

const TIPOGRAFI = [
  ['--t-hero', 'Hero başlığı (Santral 360)', 'Kızıldere III JES'],
  ['--t-board', 'Pano başlığı (portföy)', 'Enerji portföyü'],
  ['--t-screen', 'Ekran başlığı', 'Risk kütüğü'],
  ['--t-metric', 'Ölçüt değeri', '78'],
  ['--t-section', 'Bölüm başlığı', 'Kuyubaşı RTU güzergâhı'],
  ['--t-lead', 'Giriş cümlesi', 'Nerede uygunsuz, ve neden?'],
  ['--t-row', 'Kütük satırı', 'Ağ güvenliği ve segmentasyon'],
  ['--t-cell', 'Hücre metni', 'Kızıldere III JES'],
  ['--t-code-lg', 'Kod (büyük)', 'RSK-2026-001'],
  ['--t-caption', 'Alt yazı', 'Bilinmeyen %18'],
  ['--t-label', 'Bölüm etiketi', 'ŞU AN ÖNEMLİ OLAN'],
  ['--t-code', 'Kod (küçük)', 'EPDK-SYM-4.2.1'],
  ['--t-colhead', 'Kolon başlığı', 'SANTRAL · SAHİP · HEDEF'],
] as const;

const OLCEK_SIRASI = [
  '--s2', '--s3', '--s4', '--s6', '--s8', '--s9', '--s10', '--s12', '--s14',
  '--s16', '--s18', '--s20', '--s22', '--s24', '--s26', '--s28', '--s30',
  '--s32', '--s34', '--s36', '--s38', '--s40', '--s44',
];

export default async function TasarimSistemi() {
  await girisZorunlu();
  const css = readFileSync(KAYNAK, 'utf8');
  const paletler = YONLER.map((y) => ({
    ...y, palet: paletOku(css, '.ab {\n  --zemin:'),
  }));
  const olcek = olcekOku(css);

  return (
    <main className="ab-ekran-govde ab-sistem">
      <header className="ab-lede">
        <div className="sol">
          <p className="etiket">Tasarım sistemi · kabuk.css okunarak üretildi</p>
          <h1>Tek kabuk, tek sözleşme</h1>
        </div>
        <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
          <p className="mono ab-dip" style={{ maxWidth: 420, margin: 0 }}>
            Değerler bu sayfada yazılı değil: kaynak dosyadan okunuyor, kontrast
            oranları hesaplanıyor. Bir token değişirse referans da değişir.
          </p>
          <Link href="/sistem/bilesenler" className="ab-dugme">Bileşen galerisi →</Link>
        </div>
      </header>

      {paletler.map((y) => (
        <section key={y.kod} className="bolum">
          <h2 className="ab-bolum-basligi">{y.ad}</h2>
          <p className="mono ab-dip">{y.alt}</p>

          <div className="zeminler">
            {ZEMINLER.map((z) => (
              <div key={z} className="zemin">
                <span className="ornek" style={{ background: y.palet[z] }} />
                <span className="mono ad">{z}</span>
                <span className="mono deger">{y.palet[z] ?? '—'}</span>
              </div>
            ))}
          </div>

          <div className="ab-sistem-kaydir">
          <table className="ab-sistem-tablo">
            <thead>
              <tr>
                <th className="kolonbas">Token</th>
                <th className="kolonbas">Rol</th>
                <th className="kolonbas">Değer</th>
                {ZEMINLER.map((z) => (
                  <th key={z} className="kolonbas sag">{z.replace('--', '')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MUREKKEPLER.filter((m) => y.palet[m.anahtar]).map((m) => (
                <tr key={m.anahtar}>
                  <td className="mono">{m.anahtar}</td>
                  <td>{m.rol}</td>
                  <td className="mono">
                    <span className="nokta" style={{ background: y.palet[m.anahtar] }} />
                    {y.palet[m.anahtar]}
                  </td>
                  {ZEMINLER.map((z) => {
                    const zemin = y.palet[z];
                    if (!zemin) return <td key={z} className="mono sag">—</td>;
                    const o = kontrast(y.palet[m.anahtar], zemin);
                    const gecti = aaGecer(o, m.esik);
                    return (
                      <td key={z} className={`mono sag${gecti ? '' : ' kaldi'}`}>
                        {bicimle(o)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className="mono ab-dip">
            Eşik: metin 4.5:1 · grafik ve büyük tipografi 3.0:1. Kapı
            <code> arac/kontrast.mjs</code> ile her derlemede koşar.
          </p>
        </section>
      ))}

      <section className="bolum">
        <h2 className="ab-bolum-basligi">Tipografi kademeleri</h2>
        <div className="ab-sistem-kaydir">
          <table className="ab-sistem-tablo">
          <thead>
            <tr>
              <th className="kolonbas">Token</th>
              <th className="kolonbas">Rol</th>
              <th className="kolonbas">Boy</th>
              <th className="kolonbas">Örnek</th>
            </tr>
          </thead>
          <tbody>
            {TIPOGRAFI.map(([tok, rol, ornek]) => (
              <tr key={tok}>
                <td className="mono">{tok}</td>
                <td>{rol}</td>
                <td className="mono">{olcek[tok] ?? '—'}</td>
                <td style={{ fontSize: `var(${tok})` }}>{ornek}</td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        <p className="mono ab-dip">
          Arayüz Inter/Inter Tight, veri IBM Plex Mono / JetBrains Mono,
          görünüm Archivo / Barlow Condensed / Newsreader — yön seçer.
        </p>
      </section>

      <section className="bolum">
        <h2 className="ab-bolum-basligi">Boşluk ölçeği</h2>
        <div className="olcek">
          {OLCEK_SIRASI.filter((t) => olcek[t]).map((t) => (
            <div key={t}>
              <span className="cubuk" style={{ width: `var(${t})` }} />
              <span className="mono ad">{t}</span>
              <span className="mono deger">{olcek[t]}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
