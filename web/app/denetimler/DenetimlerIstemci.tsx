'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pill, SegBar, Bos, type DurumSayilari } from '@/components/ui';
import Kip from '@/components/Kip';
import { useEylem } from '@/components/useEylem';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { denetimKaydet } from '@/lib/eylemler2/denetim';
import {
  DENETIM_ASAMALARI, DENETIM_ASAMA_ETIKET, DENETIM_TIP_ETIKET,
  etiketle, tarihTR, type Durum,
} from '@/lib/sabitler';

type Asama = (typeof DENETIM_ASAMALARI)[number];

type D = {
  id: string; kod: string; ad: string; tip: string;
  denetleyen: string | null; durum: string;
  planBaslangic: string | null; planBitis: string | null;
  surec: { id: string; kod: string; regKod: string } | null;
  tesisler: string[]; maddeSayisi: number;
  acikTalep: number; toplamTalep: number;
  acikBulgu: number; toplamBulgu: number;
};
type Surec = { id: string; kod: string; ad: string; regKod: string };

/** Renk yalnız durumu anlatır: hazırlık aşamaları incelemede, yürütme kısmi,
    kapanış uyumlu paletinden okunur. */
function asamaRengi(a: string): Durum {
  if (a === 'kapanis') return 'uyumlu';
  if (a === 'plan' || a === 'kapsam') return 'incelemede';
  return 'kismi';
}

const BOS_FORM = {
  kod: '', ad: '', tip: 'ic_denetim', denetleyen: '',
  surecId: '', planBaslangic: '', planBitis: '',
};

export default function DenetimlerIstemci({ denetimler, yeniKod, surecler }: {
  denetimler: D[]; yeniKod: string; surecler: Surec[];
}) {
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const [asamaF, setAsamaF] = useState('devam');
  const [tipF, setTipF] = useState('hepsi');
  const [arama, setArama] = useState('');
  const [yeniAcik, setYeniAcik] = useState(false);
  const [f, setF] = useState(BOS_FORM);

  const gorunen = useMemo(() => denetimler.filter((d) => {
    if (asamaF === 'devam' && d.durum === 'kapanis') return false;
    if (asamaF !== 'hepsi' && asamaF !== 'devam' && d.durum !== asamaF) return false;
    if (tipF !== 'hepsi' && d.tip !== tipF) return false;
    if (arama && !`${d.kod} ${d.ad} ${d.denetleyen ?? ''} ${d.tesisler.join(' ')}`
      .toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    return true;
  }), [denetimler, asamaF, tipF, arama]);

  const devamEden = denetimler.filter((d) => d.durum !== 'kapanis');
  const asamaSayilari: DurumSayilari = {};
  for (const d of devamEden) {
    const renk = asamaRengi(d.durum);
    asamaSayilari[renk] = (asamaSayilari[renk] ?? 0) + 1;
  }

  const ac = () => {
    setHata(null);
    setF({ ...BOS_FORM, kod: yeniKod });
    setYeniAcik(true);
  };

  return (
    <>
      <div className="kart">
        <div className="band">
          <div className="band-hucre">
            <span className="mikro-etiket">Devam eden denetim</span>
            <span className="metrik-dev">{devamEden.length}</span>
            <SegBar sayilar={asamaSayilari} />
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Açık kanıt talebi</span>
            <span className="metrik-dev">
              {denetimler.reduce((a, d) => a + d.acikTalep, 0)}
            </span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Denetim kaynaklı açık bulgu</span>
            <span className="metrik-dev">
              {denetimler.reduce((a, d) => a + d.acikBulgu, 0)}
            </span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Kapanan denetim</span>
            <span className="metrik-dev">
              {denetimler.filter((d) => d.durum === 'kapanis').length}
            </span>
          </div>
        </div>
      </div>

      <div className="filtreler">
        <input className="inp" placeholder="Denetim ara…" value={arama}
          onChange={(e) => setArama(e.target.value)} style={{ minWidth: 200 }} />
        <select className="sec" value={asamaF} onChange={(e) => setAsamaF(e.target.value)}>
          <option value="devam">Devam edenler</option>
          <option value="hepsi">Tüm aşamalar</option>
          {DENETIM_ASAMALARI.map((a) => (
            <option key={a} value={a}>{DENETIM_ASAMA_ETIKET[a]}</option>
          ))}
        </select>
        <select className="sec" value={tipF} onChange={(e) => setTipF(e.target.value)}>
          <option value="hepsi">Tüm tipler</option>
          {Object.entries(DENETIM_TIP_ETIKET).map(([t, e]) => (
            <option key={t} value={t}>{e}</option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn yazdirmada-gizle" onClick={pdfYazdir}>🖨 PDF</button>
        <button className="btn yazdirmada-gizle" onClick={() => exceleAktar('denetimler', [{
          ad: 'Denetimler', satirlar: [
            ['Kod', 'Ad', 'Tip', 'Denetleyen', 'Aşama', 'Plan başlangıç', 'Plan bitiş',
              'Tesisler', 'Açık kanıt talebi', 'Açık bulgu'],
            ...gorunen.map((d) => [d.kod, d.ad,
              DENETIM_TIP_ETIKET[d.tip] ?? etiketle(d.tip), d.denetleyen,
              DENETIM_ASAMA_ETIKET[d.durum as Asama] ?? etiketle(d.durum),
              d.planBaslangic ? tarihTR(d.planBaslangic) : '',
              d.planBitis ? tarihTR(d.planBitis) : '',
              d.tesisler.join(', '), d.acikTalep, d.acikBulgu]),
          ] }])}>
          ⤓ Excel</button>
        <button className="btn birincil yazdirmada-gizle" onClick={ac}>+ Yeni denetim</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))',
        gap: 'var(--sp-4)' }}>
        {gorunen.map((d) => {
          const ix = DENETIM_ASAMALARI.indexOf(d.durum as Asama);
          return (
            <Link key={d.id} href={`/denetimler/${d.id}`} className="kart tikla"
              style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="kart-icerik"
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <span className="chip mono">{d.kod}</span>
                  <span style={{ flex: 1 }} />
                  <Pill durum={asamaRengi(d.durum)}
                    etiket={DENETIM_ASAMA_ETIKET[d.durum as Asama] ?? etiketle(d.durum)} />
                </div>
                <div>
                  <span className="mikro-etiket">
                    {DENETIM_TIP_ETIKET[d.tip] ?? etiketle(d.tip)}
                    {d.denetleyen && ` · ${d.denetleyen}`}
                    {d.surec && ` · ${d.surec.regKod}`}
                  </span>
                  <h3 style={{ margin: '4px 0 0', fontSize: 'var(--fs-md, 1rem)' }}>{d.ad}</h3>
                </div>
                <div className="mikro-etiket" style={{ letterSpacing: '.04em' }}>
                  plan {tarihTR(d.planBaslangic)} – {tarihTR(d.planBitis)}
                  {' · '}<span className="mono">{ix < 0 ? '—' : `${ix + 1}/${DENETIM_ASAMALARI.length}`}</span> aşama
                </div>
                {(d.tesisler.length > 0 || d.maddeSayisi > 0) && (
                  <div className="filtreler" style={{ gap: 'var(--sp-1, 4px)' }}>
                    {d.tesisler.map((t) => <span key={t} className="chip mono">{t}</span>)}
                    {d.maddeSayisi > 0 && <span className="chip">{d.maddeSayisi} madde</span>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'auto',
                  fontSize: 'var(--fs-sm)', color: 'var(--text-2)' }}>
                  <span style={{ color: d.acikTalep > 0 ? 'var(--uyumsuz-fg)' : undefined }}>
                    <strong>{d.acikTalep}</strong>/{d.toplamTalep} açık kanıt talebi
                  </span>
                  <span style={{ color: d.acikBulgu > 0 ? 'var(--uyumsuz-fg)' : undefined }}>
                    <strong>{d.acikBulgu}</strong>/{d.toplamBulgu} açık bulgu
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {gorunen.length === 0 && (
        <div className="kart"><Bos baslik="Eşleşen denetim yok"
          altMetin="Filtreleri genişletin veya yeni denetim planlayın." /></div>
      )}

      {/* --------------------------------------------- yeni denetim kip'i */}
      <Kip acik={yeniAcik} kapat={() => setYeniAcik(false)} baslik="Yeni denetim"
        ust={<span className="mikro-etiket">Yaşam döngüsü <strong>plan</strong> aşamasından başlar</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-izgara">
            <label className="form-satir">
              <span>Kod</span>
              <input className="inp mono" value={f.kod}
                onChange={(e) => setF({ ...f, kod: e.target.value })} />
            </label>
            <label className="form-satir">
              <span>Tip</span>
              <select className="sec" value={f.tip}
                onChange={(e) => setF({ ...f, tip: e.target.value })}>
                {Object.entries(DENETIM_TIP_ETIKET).map(([t, e]) => (
                  <option key={t} value={t}>{e}</option>
                ))}
              </select>
            </label>
            <label className="form-satir" style={{ gridColumn: '1/-1' }}>
              <span>Ad</span>
              <input className="inp" placeholder="Örn. 2026 EPDK bilgi güvenliği denetimi"
                value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} />
            </label>
            <label className="form-satir">
              <span>Denetleyen (kurum/firma)</span>
              <input className="inp" value={f.denetleyen}
                onChange={(e) => setF({ ...f, denetleyen: e.target.value })} />
            </label>
            <label className="form-satir">
              <span>Uyum süreci</span>
              <select className="sec" value={f.surecId}
                onChange={(e) => setF({ ...f, surecId: e.target.value })}>
                <option value="">Süreç bağı yok</option>
                {surecler.map((s) => (
                  <option key={s.id} value={s.id}>{s.kod} — {s.ad}</option>
                ))}
              </select>
            </label>
            <label className="form-satir">
              <span>Plan başlangıcı</span>
              <input className="inp" type="date" value={f.planBaslangic}
                onChange={(e) => setF({ ...f, planBaslangic: e.target.value })} />
            </label>
            <label className="form-satir">
              <span>Plan bitişi</span>
              <input className="inp" type="date" value={f.planBitis}
                onChange={(e) => setF({ ...f, planBitis: e.target.value })} />
            </label>
          </div>
          <div className="filtreler">
            {hata && <span className="pill durum-uyumsuz" role="alert">{hata}</span>}
            <span style={{ flex: 1 }} />
            <button className="btn" onClick={() => setYeniAcik(false)} disabled={bekliyor}>Vazgeç</button>
            <button className="btn birincil"
              disabled={bekliyor || !f.kod.trim() || !f.ad.trim()}
              onClick={() => calistir(() => denetimKaydet({
                kod: f.kod, ad: f.ad, tip: f.tip,
                denetleyen: f.denetleyen || null, surecId: f.surecId || null,
                planBaslangic: f.planBaslangic || null, planBitis: f.planBitis || null,
              }), () => setYeniAcik(false))}>
              Denetimi planla
            </button>
          </div>
        </div>
      </Kip>
    </>
  );
}
