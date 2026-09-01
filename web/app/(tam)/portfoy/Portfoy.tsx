'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { heroGorseli, gorselAlt, tipRengi } from '@/lib/atlas/gorsel';

/* F2 · Enerji Portföyü — 03-screens.md.
   Hiyerarşi: plaka fotoğrafı santralin NE OLDUĞUNU, sağdaki iki sayı
   BENİ İSTEYİP İSTEMEDİĞİNİ söyler. Kimlik paneli seçili santrali taşır.

   Fotoğrafı olmayan santral tipografik döşeme alır — kırık görsel yok,
   vekil sanat yok, başka santralin fotoğrafı hiç yok (05 §1.3, §1.6). */

export type PortfoySatiri = {
  id: string; kod: string; ad: string;
  tipKod: string | null; tipAdi: string; tuzelKisi: string | null;
  konum: string | null; gucMw: number | null; gorselAnahtari: string | null;
  kritiklik: string | null;
  uyumYuzde: number | null; bilinmeyenOran: number | null;
  acikBulgu: number; acikRisk: number;
};

export default function Portfoy({ satirlar, toplamGucMw }: {
  satirlar: PortfoySatiri[]; toplamGucMw: number;
}) {
  const [tip, setTip] = useState('hepsi');
  const [seciliId, setSeciliId] = useState(satirlar[0]?.id ?? null);

  const tipler = useMemo(() => {
    const m = new Map<string, { kod: string; ad: string; adet: number }>();
    for (const s of satirlar) {
      const k = s.tipKod ?? 'DIGER';
      const v = m.get(k) ?? { kod: k, ad: s.tipAdi, adet: 0 };
      v.adet += 1; m.set(k, v);
    }
    return [...m.values()].sort((a, b) => b.adet - a.adet);
  }, [satirlar]);

  const gorunen = tip === 'hepsi' ? satirlar : satirlar.filter((s) => (s.tipKod ?? 'DIGER') === tip);
  // Fotoğrafı olanlar plaka, olmayanlar tipografik döşeme (§1.6)
  const plakalar = gorunen.filter((s) => heroGorseli(s.gorselAnahtari));
  const dosemeler = gorunen.filter((s) => !heroGorseli(s.gorselAnahtari));
  const secili = gorunen.find((s) => s.id === seciliId) ?? gorunen[0] ?? null;

  return (
    <div className="portfoy">
      <header className="portfoy-ust">
        <span>
          <span style={{ fontSize: 'var(--t-cell)', fontWeight: 700 }}>Energy Operations</span>
          <span className="t-colhead" style={{ display: 'block', marginTop: 3,
            color: 'var(--jesd)' }}>Atlas</span>
        </span>
        <span className="t-label" style={{ color: 'rgba(246,244,238,.52)' }}>
          Enerji portföyü · üretim
        </span>
        <nav style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--s18)' }}
          aria-label="Üretim tipi">
          <button type="button" className="portfoy-tip" aria-pressed={tip === 'hepsi'}
            onClick={() => setTip('hepsi')}>Tümü {satirlar.length}</button>
          {tipler.map((t) => (
            <button key={t.kod} type="button" className="portfoy-tip"
              aria-pressed={tip === t.kod} onClick={() => setTip(t.kod)}>
              {t.kod} {t.adet}
            </button>
          ))}
        </nav>
      </header>

      <div className="portfoy-govde">
        {/* ── Kimlik paneli (sticky) ─────────────────────────────────── */}
        <aside className="portfoy-kimlik">
          {secili ? (
            <>
              <p className="ust" style={{ margin: 0, color: tipRengi(secili.tipKod, true) }}>
                Seçili · {secili.tipAdi}
              </p>
              <h2>{secili.ad}</h2>
              <span className="cizgi" style={{ background: tipRengi(secili.tipKod, true) }} />
              <p className="aciklama">
                {[secili.tuzelKisi, secili.konum,
                  secili.kritiklik ? `kritiklik ${secili.kritiklik}` : null]
                  .filter(Boolean).join(' · ')}
              </p>
              <div className="olgular">
                <div>
                  <span className="t-caption">Kurulu güç</span>
                  <span className="deger">{secili.gucMw != null ? `${secili.gucMw} MWe` : '—'}</span>
                </div>
                <div>
                  <span className="t-caption">Uyum</span>
                  <span className="deger">
                    {secili.uyumYuzde === null ? '—' : `%${secili.uyumYuzde}`}
                  </span>
                  {/* Yüzde gösterilen her yerde bilinmeyen payı da gösterilir (§A3) */}
                  {secili.bilinmeyenOran != null && secili.bilinmeyenOran > 0 && (
                    <span className="t-caption" style={{ display: 'block', marginTop: 4 }}>
                      Bilinmeyen %{secili.bilinmeyenOran}
                    </span>
                  )}
                </div>
                <div>
                  <span className="t-caption">Açık bulgu</span>
                  <span className="deger">{secili.acikBulgu}</span>
                </div>
                <div>
                  <span className="t-caption">Açık risk</span>
                  <span className="deger">{secili.acikRisk}</span>
                </div>
              </div>
              <p className="t-label" style={{ marginTop: 'var(--s34)',
                color: 'rgba(246,244,238,.42)', lineHeight: 1.8 }}>
                Plakaya tıkla · santral dosyası açılır
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 20 }}>Bu filtreyle santral yok</h2>
              <button type="button" className="portfoy-tip" style={{ marginTop: 'var(--s16)' }}
                onClick={() => setTip('hepsi')}>Filtreleri temizle</button>
            </>
          )}
          <p className="t-label" style={{ marginTop: 'var(--s24)',
            color: 'rgba(246,244,238,.42)' }}>
            {satirlar.length} santral · {toplamGucMw} MWe
          </p>
        </aside>

        {/* ── Plakalar ───────────────────────────────────────────────── */}
        <div>
          {plakalar.map((s) => {
            const foto = heroGorseli(s.gorselAnahtari)!;
            const renk = tipRengi(s.tipKod, true);
            return (
              <Link key={s.id} href={`/tesisler/${s.id}`} className="plaka"
                /* tip-tonlu tül: kimlik rengi düşük alfada, durum rengi DEĞİL */
                style={{ borderLeftColor: renk,
                  ['--tul' as string]: `color-mix(in srgb, ${renk} 16%, rgba(25,23,18,.34))` }}
                onMouseEnter={() => setSeciliId(s.id)}
                onFocus={() => setSeciliId(s.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım */}
                <img src={foto} alt={gorselAlt(s.ad, s.tipAdi, s.konum)} loading="lazy"
                  decoding="async" />
                <span className="perde" aria-hidden />
                <span className="icerik">
                  <span className="tip" style={{ color: renk }}>
                    {s.tipAdi.toLocaleUpperCase('tr-TR')}
                    {s.konum && ` · ${s.konum}`}
                  </span>
                  <h3>{s.ad}</h3>
                  <span className="kapsam" style={{ display: 'block' }}>
                    {[s.tuzelKisi, s.gucMw != null ? `${s.gucMw} MWe` : null]
                      .filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="metrik-sag">
                  <span>
                    <span className="deger" style={{ display: 'block' }}>
                      {s.uyumYuzde === null ? '—' : `%${s.uyumYuzde}`}
                    </span>
                    <span className="t-caption" style={{ color: 'rgba(246,244,238,.60)' }}>Uyum</span>
                  </span>
                  <span>
                    <span className="deger" style={{ display: 'block',
                      color: s.acikBulgu > 0 ? 'var(--bdp)' : undefined }}>{s.acikBulgu}</span>
                    <span className="t-caption" style={{ color: 'rgba(246,244,238,.60)' }}>Bulgu</span>
                  </span>
                </span>
              </Link>
            );
          })}

          {/* Fotoğrafı olmayanlar: tipografik döşeme (§1.5, §1.6) */}
          {dosemeler.map((s) => (
            <Link key={s.id} href={`/tesisler/${s.id}`} className="dosem"
              style={{ borderLeftColor: tipRengi(s.tipKod, true) }}
              onMouseEnter={() => setSeciliId(s.id)}
              onFocus={() => setSeciliId(s.id)}>
              <span className="tip t-label" style={{ color: tipRengi(s.tipKod, true) }}>
                {s.tipAdi.toLocaleUpperCase('tr-TR')}{s.konum && ` · ${s.konum}`}
              </span>
              <h3>{s.ad}</h3>
              <span className="kapsam" style={{ display: 'block', marginTop: 'var(--s10)',
                fontSize: 13.5, color: 'rgba(246,244,238,.66)', position: 'relative' }}>
                {[s.tuzelKisi, s.gucMw != null ? `${s.gucMw} MWe` : null,
                  s.uyumYuzde === null ? 'değerlendirme yok' : `uyum %${s.uyumYuzde}`,
                ].filter(Boolean).join(' · ')}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
