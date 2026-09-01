'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { heroGorseli, kucukGorsel, gorselAlt } from '@/lib/atlas/gorsel';
import { tipAdi, tipRengi } from '@/components/abacus/tip';
import { etiketle } from '@/lib/sabitler';

/* ═══════════════════════════════════════════════════════════════════════
   ENERJİ PORTFÖYÜ — B · ENERGY INTELLIGENCE

   Prototiplerde ayrı bir portföy ekranı yok; en yakın gramer
   `b-executive`in SAHA ŞERİDİDİR: fotoğraf + perde + üretim tipi + ad +
   MW + endeks + dört parçalı yığın. Bu ekran o şeridi tam sayfaya
   açar; solda 380px kimlik paneli seçili santrali taşır.

   Sözleşme aynen korundu:
   · fotoğrafı olmayan santral için başka santralin fotoğrafı ASLA
     kullanılmaz — tipografik döşeme alır (harita §7 kusur 3);
   · yüzde gösterilen her yerde BİLİNMEYEN payı da yazılır;
   · kapsam yüzünden boşalan portföy "santral yok" demez, "kapsamınızda
     santral yok" der — ikisi farklı şeydir.

   Kimlik rengi ÜRETİM TİPİNİ söyler, durumu değil. */

export type PortfoySatiri = {
  id: string; kod: string; ad: string;
  tipKod: string | null; tipAdi: string; tuzelKisi: string | null;
  konum: string | null; gucMw: number | null; gorselAnahtari: string | null;
  kritiklik: string | null;
  uyumYuzde: number | null; bilinmeyenOran: number | null;
  acikBulgu: number; acikRisk: number;
};

export default function Portfoy({ satirlar, toplamGucMw, kapsamli = false }: {
  satirlar: PortfoySatiri[]; toplamGucMw: number;
  kapsamli?: boolean;
}) {
  const [tip, setTip] = useState('hepsi');
  const [seciliId, setSeciliId] = useState(satirlar[0]?.id ?? null);

  const tipler = useMemo(() => {
    const m = new Map<string, { kod: string; ad: string; adet: number; guc: number }>();
    for (const s of satirlar) {
      const k = s.tipKod ?? 'DIGER';
      const v = m.get(k) ?? { kod: k, ad: s.tipAdi, adet: 0, guc: 0 };
      v.adet += 1; v.guc += s.gucMw ?? 0; m.set(k, v);
    }
    return [...m.values()].sort((a, b) => b.adet - a.adet);
  }, [satirlar]);

  const gorunen = tip === 'hepsi'
    ? satirlar
    : satirlar.filter((s) => (s.tipKod ?? 'DIGER') === tip);
  const secili = gorunen.find((s) => s.id === seciliId) ?? gorunen[0] ?? null;
  const gorunenGuc = Math.round(gorunen.reduce((a, s) => a + (s.gucMw ?? 0), 0) * 10) / 10;

  return (
    <main className="ab-b-portfoy">
      <header className="ab-b-portfoy-ust">
        <span className="etiket">
          Enerji portföyü · üretim · {satirlar.length} santral · {toplamGucMw} MWe
        </span>
        <nav aria-label="Üretim tipi">
          <button type="button" aria-pressed={tip === 'hepsi'} onClick={() => setTip('hepsi')}>
            Tümü <span className="mono">{satirlar.length}</span>
          </button>
          {tipler.map((t) => (
            <button key={t.kod} type="button" aria-pressed={tip === t.kod}
              onClick={() => setTip(t.kod)}>
              {tipAdi(t.kod, t.ad)} <span className="mono">{t.adet}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="ab-b-portfoy-govde">
        {/* ── Kimlik paneli ─────────────────────────────────────────── */}
        <aside className="kimlik" aria-label="Seçili santral">
          {secili ? (
            <>
              <p className="etiket" style={{ color: tipRengi(secili.tipKod) }}>
                Seçili · {tipAdi(secili.tipKod, secili.tipAdi)}
              </p>
              <h2>{secili.ad}</h2>
              <span className="cizgi" style={{ background: tipRengi(secili.tipKod) }} />
              <p className="alt">
                {[secili.tuzelKisi, secili.konum,
                  secili.kritiklik ? `kritiklik ${etiketle(secili.kritiklik)}` : null]
                  .filter(Boolean).join(' · ')}
              </p>
              <dl className="olgular">
                <Olgu ad="Kurulu güç"
                  deger={secili.gucMw != null ? `${secili.gucMw} MWe` : '—'} />
                <Olgu ad="Uyum endeksi"
                  deger={secili.uyumYuzde === null ? '—' : `%${secili.uyumYuzde}`}
                  not={secili.bilinmeyenOran != null && secili.bilinmeyenOran > 0
                    ? `%${secili.bilinmeyenOran} bilinmeyen`
                    : secili.uyumYuzde === null ? 'değerlendirme yok' : undefined} />
                <Olgu ad="Açık bulgu" deger={String(secili.acikBulgu)}
                  vurgu={secili.acikBulgu > 0} />
                <Olgu ad="Açık risk" deger={String(secili.acikRisk)}
                  vurgu={secili.acikRisk > 0} />
              </dl>
              <Link href={`/tesisler/${secili.id}`} className="ab-dugme tam">
                Santral dosyasını aç →
              </Link>
            </>
          ) : satirlar.length === 0 && kapsamli ? (
            <>
              <h2>Kapsamınızda santral yok</h2>
              <p className="alt">
                Bu hesap bir santral kapsamıyla sınırlı; portföyde gösterilecek
                kayıt bulunmuyor.
              </p>
            </>
          ) : (
            <>
              <h2>Bu süzgeçte santral yok</h2>
              <button type="button" className="ab-dugme" onClick={() => setTip('hepsi')}>
                Süzgeci temizle
              </button>
            </>
          )}
          <p className="mono dip">
            Gösterilen {gorunen.length} santral · {gorunenGuc} MWe
          </p>
        </aside>

        {/* ── Plakalar ──────────────────────────────────────────────── */}
        <div className="plakalar">
          {gorunen.map((s) => {
            const foto = heroGorseli(s.gorselAnahtari) ?? kucukGorsel(s.gorselAnahtari);
            const renk = tipRengi(s.tipKod);
            return (
              <Link key={s.id} href={`/tesisler/${s.id}`}
                className={`plaka${s.id === secili?.id ? ' secili' : ''}`}
                style={{ borderLeftColor: renk }}
                onMouseEnter={() => setSeciliId(s.id)}
                onFocus={() => setSeciliId(s.id)}>
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım
                  <img src={foto} alt={gorselAlt(s.ad, s.tipAdi, s.konum)}
                    loading="lazy" decoding="async" />
                ) : (
                  /* Fotoğrafı olmayan santrale BAŞKA santralin fotoğrafı
                     konmaz; tipografik döşeme (harita §7 kusur 3). */
                  <span className="fotoyok" aria-hidden />
                )}
                <span className="perde" aria-hidden />
                <span className="icerik">
                  <span className="mono tip" style={{ color: renk }}>
                    {tipAdi(s.tipKod, s.tipAdi)}{s.konum && ` · ${s.konum}`}
                  </span>
                  <span className="ad">{s.ad}</span>
                  <span className="olcu">
                    <span className="mono guc">
                      {[s.tuzelKisi, s.gucMw != null ? `${s.gucMw} MWe` : null]
                        .filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </span>
                <span className="sayilar">
                  <span>
                    <span className="deger">
                      {s.uyumYuzde === null ? '—' : `%${s.uyumYuzde}`}
                    </span>
                    <span className="etiket">Uyum</span>
                  </span>
                  <span>
                    <span className={`deger${s.acikBulgu > 0 ? ' vurgu' : ''}`}>
                      {s.acikBulgu}
                    </span>
                    <span className="etiket">Bulgu</span>
                  </span>
                  <span>
                    <span className={`deger${s.acikRisk > 0 ? ' vurgu' : ''}`}>
                      {s.acikRisk}
                    </span>
                    <span className="etiket">Risk</span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function Olgu({ ad, deger, not, vurgu }: {
  ad: string; deger: string; not?: string; vurgu?: boolean;
}) {
  return (
    <div>
      <dt>{ad}</dt>
      <dd className={vurgu ? 'vurgu' : undefined}>
        {deger}
        {not && <span className="mono not">{not}</span>}
      </dd>
    </div>
  );
}
