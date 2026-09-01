'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Metrikler, Im, Dugme } from '@/components/atlas/temel';
import { OdakKarti } from '@/components/atlas/ekran';
import BaglamCubugu from '@/components/atlas/BaglamCubugu';
import {
  heroGorseli, kucukGorsel, gorselAlt, tipRengi, BOLUM_KIRPIMI,
} from '@/lib/atlas/gorsel';
import { etiketle, tarihTR } from '@/lib/sabitler';

/* F3 · Plant 360 — 03-screens.md.
   Hiyerarşi: hero kimliği ve her şeyi belirleyen dört sayıyı taşır; bir kart
   şu anki problemi taşır; gerisi bölümdür. Hero'nun tıklama hedefi yoktur. */

export type Plant360Veri = {
  id: string; kod: string; ad: string;
  tipKod: string | null; tipAdi: string; tuzelKisi: string | null;
  konum: string | null; gucMw: number | null; gorselAnahtari: string | null;
  kritiklik: string | null; uniteSayisi: number | null;
  uyumYuzde: number | null; bilinmeyenOran: number | null; cerceveKodu: string | null;
  enYuksekRisk: { kod: string; baslik: string; skor: number | null } | null;
  acikBulgu: number; gecikmisBulgu: number;
  yaklasanDenetim: { kod: string; ad: string; kalanGun: number } | null;
  eosVarlik: number; varlikSayisi: number; bolgeSayisi: number; surecSayisi: number;
  odak: {
    id: string; kod: string; baslik: string; aciklama: string | null;
    onem: string; durum: string; sorumlu: string | null; hedefTarih: string | null;
    aksiyonTamam: number; aksiyonToplam: number;
  } | null;
  digerEksikler: { id: string; baslik: string; alt: string }[];
};

export type Santral = { id: string; kod: string; ad: string; alt: string; tip: string;
  gorselAnahtari: string | null };

/* Odak kartının sol kenarı yalnız sürükleyen dört durumu alır — bilinmeyen
   bir kaydı "odak" yapmaz, o durumda kart yerine boş blok render edilir. */
const ONEM_DURUM: Record<string, 'bd' | 'md' | 'ok' | 'pl'> = {
  kritik: 'bd', yuksek: 'bd', orta: 'md', dusuk: 'pl',
};

export default function Plant360({ veri, santraller }: {
  veri: Plant360Veri; santraller: Santral[];
}) {
  const [bolum, setBolum] = useState('onemli');
  const foto = heroGorseli(veri.gorselAnahtari);
  const renk = tipRengi(veri.tipKod, true);

  const bolumler = [
    { id: 'onemli', ad: 'Şu an önemli olan', ek: String(veri.acikBulgu) },
    { id: 'kapsam', ad: 'Kapsam & çerçeveler', ek: String(veri.surecSayisi) },
    { id: 'uyum', ad: 'Uyum detayı', ek: veri.uyumYuzde === null ? '—' : `%${veri.uyumYuzde}` },
    { id: 'risk', ad: 'Risk & bulgular', ek: String(veri.acikBulgu) },
    { id: 'varlik', ad: 'Varlıklar & ömür', ek: veri.eosVarlik ? `${veri.eosVarlik} EOL` : String(veri.varlikSayisi) },
    { id: 'ag', ad: 'Ağ topolojisi', ek: `${veri.bolgeSayisi} bölge` },
    { id: 'denetim', ad: 'Denetim & kanıt', ek: veri.yaklasanDenetim ? `${veri.yaklasanDenetim.kalanGun}g` : '—' },
  ];

  return (
    <main data-yuzey="saha" style={{ minWidth: 0 }}>
      {/* ── Hero 560px ─────────────────────────────────────────────── */}
      <div className={`hero360${foto ? '' : ' tipografik'}`}>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım
          <img src={foto} alt={gorselAlt(veri.ad, veri.tipAdi, veri.konum)}
            decoding="async" fetchPriority="high" />
        )}
        <span className="perde" aria-hidden />
        {/* Buhar yalnız jeotermalde ve yalnız fotoğraf varsa — dekoratif,
            bilgi taşımaz, azaltılmış harekette durur (04 §17). */}
        {foto && veri.tipKod === 'JEO' && (
          <>
            <span className="buhar" aria-hidden
              style={{ left: '52%', top: '6%', width: 190, height: 300 }} />
            <span className="buhar" aria-hidden
              style={{ left: '68%', top: '18%', width: 150, height: 240, animationDelay: '-6s' }} />
          </>
        )}
        <span className="kontur" aria-hidden />

        <BaglamCubugu
          koyu
          kirintiler={[
            { ad: 'Portföy', yol: '/portfoy' },
            ...(veri.tuzelKisi ? [{ ad: veri.tuzelKisi }] : []),
            { ad: veri.ad },
          ]}
          seciciEtiketi="Santral"
          secici={santraller.map((s) => ({
            id: s.id, ad: s.ad, alt: s.alt, tip: s.tip,
            gorsel: kucukGorsel(s.gorselAnahtari), yol: `/tesisler/${s.id}`,
          }))}
          sag={veri.konum ? <span className="t-label">{veri.konum}</span> : null}
        />

        <div className="icerik">
          <p className="kimlik" style={{ margin: 0, color: renk }}>
            {veri.tipAdi.toLocaleUpperCase('tr-TR')}
            {veri.tuzelKisi && ` · ${veri.tuzelKisi}`}
            {veri.gucMw != null && ` · ${veri.gucMw} MWe`}
            {veri.uniteSayisi && ` · ${veri.uniteSayisi} ünite`}
          </p>
          <h1>{ayirBaslik(veri.ad)}</h1>
          <span className="cizgi" style={{ background: renk }} />
          <p className="cumle">{durumCumlesi(veri)}</p>
          {veri.kritiklik && (
            <span className="rozet">
              <Im durum={veri.acikBulgu > 0 ? 'md' : 'ok'} ad="Operasyonel durum" />
              Operasyonel · kritiklik {veri.kritiklik}
            </span>
          )}
        </div>

        <div className="alt">
          <Metrikler metrikler={[
            {
              deger: veri.uyumYuzde === null ? '—' : `%${veri.uyumYuzde}`,
              yazi: veri.cerceveKodu ? `Uyum · ${veri.cerceveKodu}` : 'Uyum',
            },
            {
              deger: veri.enYuksekRisk?.skor != null ? `${veri.enYuksekRisk.skor}/25` : '—',
              yazi: 'En yüksek risk',
            },
            { deger: veri.acikBulgu, yazi: 'Açık bulgu', durum: veri.gecikmisBulgu ? 'bd' : undefined },
            {
              deger: veri.yaklasanDenetim ? `${veri.yaklasanDenetim.kalanGun}g` : '—',
              yazi: veri.yaklasanDenetim ? `İç denetim · ${veri.yaklasanDenetim.kod}` : 'İç denetim',
            },
          ]} />
          <p className="saha" style={{ margin: 0 }}>
            {veri.kod}
            {veri.bilinmeyenOran != null && veri.bilinmeyenOran > 0 && (
              <><br />Bilinmeyen %{veri.bilinmeyenOran}</>
            )}
          </p>
        </div>
      </div>

      {/* ── Bölüm rayı + içerik ────────────────────────────────────── */}
      <div className="bolum-duzen">
        <nav className="bolum-ray" aria-label="Santral dosyası">
          <p className="t-label" style={{ margin: '0 0 var(--s14)' }}>Santral dosyası</p>
          {bolumler.map((b) => (
            <button key={b.id} type="button" className="bolum-link"
              aria-current={bolum === b.id ? 'true' : undefined}
              onClick={() => setBolum(b.id)}>
              {b.ad}<span className="ek">{b.ek}</span>
            </button>
          ))}
          {veri.gorselAnahtari === 'kizildere3' && (
            <div className="bolum-kirpim">
              {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım */}
              <img src={BOLUM_KIRPIMI} alt={`${veri.ad} — separatör sahası`} loading="lazy" />
              <span className="perde" aria-hidden />
              <span className="yazi">Separatör sahası</span>
            </div>
          )}
        </nav>

        <section className="ekran-govde" style={{ paddingTop: 'var(--s34)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 'var(--s18)' }}>
            <p className="t-label" style={{ margin: 0 }}>
              {bolumler.find((b) => b.id === bolum)?.ad}
            </p>
            <span className="t-label" style={{ marginLeft: 'auto' }}>
              {veri.acikBulgu} kayıt
            </span>
          </div>

          {veri.odak ? (
            <>
              <OdakKarti
                durum={ONEM_DURUM[veri.odak.onem] ?? 'md'}
                ust={`${etiketle(veri.odak.onem)} bulgu · ${etiketle(veri.odak.durum)}`}
                baslik={veri.odak.baslik}
                cumle={veri.odak.aciklama ?? 'Ayrıntı için kaydı açın.'}
                seritler={[
                  { etiket: 'Hedef', deger: veri.odak.hedefTarih ? tarihTR(new Date(veri.odak.hedefTarih)) : '—' },
                  { etiket: 'Sahip', deger: veri.odak.sorumlu ?? '—' },
                  { etiket: 'Aksiyon', deger: `${veri.odak.aksiyonTamam} / ${veri.odak.aksiyonToplam} tamam` },
                  { etiket: 'Kontrol', deger: veri.odak.kod },
                ]}
                eylemler={
                  <>
                    <Link href={`/bulgular/${veri.odak.id}`}>
                      <Dugme tur="birincil">Kaydı aç</Dugme>
                    </Link>
                    <Link href={`/riskler?tesis=${veri.id}`}>
                      <Dugme tur="ikincil">Zinciri gör</Dugme>
                    </Link>
                  </>
                }
              />
              {veri.digerEksikler.map((e) => (
                <Link key={e.id} href={`/bulgular/${e.id}`}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 26px', alignItems: 'center',
                    padding: 'var(--s16) var(--s20)', marginTop: 'var(--s3)',
                    background: 'var(--card)', border: 'var(--bw-hair) solid var(--hr2)',
                    borderLeft: 'var(--bw-edge) solid var(--md)' }}>
                  <span>
                    <span style={{ display: 'block', fontSize: 'var(--t-row)', fontWeight: 600 }}>
                      {e.baslik}
                    </span>
                    <span style={{ display: 'block', marginTop: 3, fontFamily: 'var(--mo)',
                      fontSize: 'var(--t-code)', color: 'var(--i3)' }}>{e.alt}</span>
                  </span>
                  <span className="tbl-ok" aria-hidden>▸</span>
                </Link>
              ))}
            </>
          ) : (
            /* Boş: değerlendirme başlatılmamış — sıfır UYDURULMAZ (§19) */
            <div className="blok">
              <p className="t-caption" style={{ margin: 0 }}>Boş · ilk kurulum</p>
              <p className="cumle">Bu santralde değerlendirme başlatılmadı.</p>
              <div className="eylem">
                <Link href={`/uyum?tesis=${veri.id}`}>
                  <Dugme tur="birincil">Kapsamı çalıştır</Dugme>
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/** Adın son kelimesi kalın: "Kızıldere III **JES**" (referans kalıbı). */
function ayirBaslik(ad: string) {
  const parcalar = ad.trim().split(' ');
  if (parcalar.length < 2) return <b>{ad}</b>;
  return <>{parcalar.slice(0, -1).join(' ')} <b>{parcalar.at(-1)}</b></>;
}

/** Hero'nun tek cümlesi: durumu sayıyla söyler, düzyazı yapmaz (06 §B5). */
function durumCumlesi(v: Plant360Veri): string {
  const parcalar: string[] = [];
  if (v.gucMw != null && v.cerceveKodu) {
    parcalar.push(`${v.gucMw} MWe kurulu güçle ${v.cerceveKodu} kapsamında`);
  } else if (v.cerceveKodu) {
    parcalar.push(`${v.cerceveKodu} kapsamında`);
  }
  if (v.acikBulgu > 0) {
    parcalar.push(v.gecikmisBulgu > 0
      ? `${v.gecikmisBulgu} bulgu gecikmiş`
      : `${v.acikBulgu} bulgu aksiyonda`);
  } else if (v.uyumYuzde !== null) {
    parcalar.push('açık bulgu yok');
  }
  return parcalar.length ? `${parcalar.join('; ')}.` : 'Değerlendirme başlatılmadı.';
}
