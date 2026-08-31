'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Metrikler, Dugme } from '@/components/atlas/temel';
import { OdakKarti } from '@/components/atlas/ekran';
import { NOTR_TRIPTIK } from '@/lib/atlas/gorsel';
import { etiketle, tarihTR } from '@/lib/sabitler';

/* F1 · Executive Overview — 03-screens.md.
   Bağlam şeridi grup özetini taşır (ayrı modül değil), bir odak kartı baskındır,
   kuyruk üç satırdır. "Sonraki ▸" öncelik motorunu ilerletir. */

export type Kayit = {
  id: string; baslik: string; aciklama: string | null;
  tesisAd: string; tesisId: string; kontrolKodu: string; cerceve: string;
  onem: string; durum: string; sorumlu: string | null;
  hedefTarih: string | null; gecikmisGun: number | null;
  aksiyonTamam: number; aksiyonToplam: number;
};

const ONEM: Record<string, 'bd' | 'md' | 'ok' | 'pl'> = {
  kritik: 'bd', yuksek: 'bd', orta: 'md', dusuk: 'pl',
};

export default function Genel({
  kullanici, ozet, odak, kuyruk, toplamKayit,
}: {
  kullanici: string;
  ozet: {
    uyumYuzde: number | null; bilinmeyenOran: number | null;
    kritikRisk: number; gecikmisAksiyon: number;
    yaklasanDenetim: { kod: string; kalanGun: number } | null;
    tesisSayisi: number; toplamGucMw: number;
  };
  odak: Kayit | null;
  kuyruk: Kayit[];
  toplamKayit: number;
}) {
  const tumu = odak ? [odak, ...kuyruk] : kuyruk;
  const [indeks, setIndeks] = useState(0);
  const aktif = tumu[indeks] ?? null;
  const dikkat = tumu.length;

  const bugun = new Date().toLocaleDateString('tr-TR',
    { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main style={{ minWidth: 0 }}>
      {/* ── Bağlam şeridi 132px: nötr grup kompozisyonu ─────────────── */}
      <div className="baglam-serit">
        {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım */}
        <img src={NOTR_TRIPTIK} alt="Zorlu Enerji üretim portföyü — jeotermal, hidro, rüzgâr"
          decoding="async" fetchPriority="high" />
        <span className="perde" aria-hidden />
        <span className="kontur" aria-hidden />
        <div className="icerik">
          <div>
            <p className="t-eyebrow" style={{ margin: 0, color: 'rgba(246,244,238,.62)' }}>
              {bugun} · Zorlu Enerji üretim portföyü · {ozet.tesisSayisi} santral
              {' · '}{ozet.toplamGucMw} MWe
            </p>
            <h1>
              {dikkat > 0
                ? <>Bugün <b>{dikkat} konu</b> yönetim dikkati istiyor</>
                : <>Bugün <b>kritik konu yok</b></>}
            </h1>
          </div>
          <Metrikler metrikler={[
            {
              deger: ozet.uyumYuzde === null ? '—' : `%${ozet.uyumYuzde}`,
              yazi: 'Zorunlu uyum',
            },
            { deger: ozet.kritikRisk, yazi: 'Kritik risk',
              durum: ozet.kritikRisk > 0 ? 'bd' : undefined },
            {
              deger: ozet.yaklasanDenetim ? `${ozet.yaklasanDenetim.kalanGun}g` : '—',
              yazi: ozet.yaklasanDenetim ? ozet.yaklasanDenetim.kod : 'Denetim',
              durum: ozet.yaklasanDenetim && ozet.yaklasanDenetim.kalanGun < 30 ? 'md' : undefined,
            },
            { deger: ozet.gecikmisAksiyon, yazi: 'Gecikmiş iş',
              durum: ozet.gecikmisAksiyon > 0 ? 'bd' : undefined },
            {
              deger: ozet.bilinmeyenOran === null ? '—' : `%${ozet.bilinmeyenOran}`,
              yazi: 'Bilinmeyen',
            },
          ]} />
        </div>
      </div>

      {/* ── Öncelik sırası ─────────────────────────────────────────── */}
      {aktif ? (
        <>
          <div className="oncelik-bas">
            <span className="t-label">Öncelik sırası · {indeks + 1} / {dikkat}</span>
            <span className="oncelik-tik" aria-hidden>
              {tumu.map((_, i) => (
                <span key={i} className={i <= indeks ? 'dolu' : undefined} />
              ))}
            </span>
            <button type="button" className="dg dg-satir" style={{ marginLeft: 'auto' }}
              onClick={() => setIndeks((i) => (i + 1) % dikkat)}>
              Sonraki ▸
            </button>
          </div>

          <section style={{ padding: 'var(--s20) var(--gutter-fs) 0' }}>
            <OdakKarti
              durum={ONEM[aktif.onem] ?? 'md'}
              ust={`${etiketle(aktif.onem)} · ${aktif.gecikmisGun ? 'gecikmiş' : etiketle(aktif.durum)}`}
              vurgu={`${aktif.tesisAd}`}
              baslik={`’te ${aktif.baslik.charAt(0).toLocaleLowerCase('tr-TR')}${aktif.baslik.slice(1)}`}
              cumle={aktif.aciklama ?? 'Ayrıntı için kaydı açın.'}
              hedef={aktif.gecikmisGun
                ? { sayi: `${aktif.gecikmisGun} gün`, yazi: 'gecikmiş' }
                : aktif.hedefTarih
                  ? { sayi: tarihTR(new Date(aktif.hedefTarih)), yazi: aktif.sorumlu ?? '—' }
                  : undefined}
              seritler={[
                { etiket: 'Uyum', deger: `${aktif.kontrolKodu}`, not: aktif.cerceve },
                { etiket: 'Santral', deger: aktif.tesisAd },
                { etiket: 'Aksiyon', deger: `${aktif.aksiyonTamam} / ${aktif.aksiyonToplam} tamam` },
                { etiket: 'Sahip', deger: aktif.sorumlu ?? '—' },
              ]}
              eylemler={
                <>
                  <Link href={`/bulgular/${aktif.id}`}><Dugme tur="birincil">Kaydı aç</Dugme></Link>
                  <Link href={`/tesisler/${aktif.tesisId}`}>
                    <Dugme tur="ikincil">Santral dosyası</Dugme>
                  </Link>
                </>
              }
            />
          </section>

          {/* ── Kuyruk: üç satır ─────────────────────────────────────── */}
          <section style={{ padding: 'var(--s30) var(--gutter-fs) var(--s46)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 'var(--s10)' }}>
              <span className="t-label">Sıradaki konular</span>
              <Link href="/bulgular" className="dg dg-satir" style={{ marginLeft: 'auto' }}>
                Tüm kayıtlar ({toplamKayit}) ▸
              </Link>
            </div>
            {tumu.map((k, i) => i === indeks ? null : (
              <button key={k.id} type="button" className="kuyruk-satir"
                onClick={() => setIndeks(i)}>
                <span className="sira">{i + 1}</span>
                <span className="konu">
                  {k.baslik} <span style={{ color: 'var(--i3)', fontWeight: 400 }}>— {k.tesisAd}</span>
                </span>
                <span className="baglam">{k.kontrolKodu} · {k.cerceve}</span>
                <span className="deger"
                  style={{ color: k.gecikmisGun ? 'var(--bd)' : 'var(--i2)' }}>
                  {k.gecikmisGun ? `Gecikmiş ${k.gecikmisGun}g`
                    : k.hedefTarih ? tarihTR(new Date(k.hedefTarih)) : '—'}
                </span>
                <span className="tbl-ok" aria-hidden>▸</span>
              </button>
            ))}
          </section>
        </>
      ) : (
        /* Boş: kritik konu yok — kart kaldırılır, metrikler kalır (§F1 states) */
        <section style={{ padding: 'var(--s38) var(--gutter-fs) var(--s46)' }}>
          <p className="t-section" style={{ margin: 0 }}>
            Bugün kritik konu yok, {kullanici.split(' ')[0]}.
          </p>
        </section>
      )}
    </main>
  );
}
