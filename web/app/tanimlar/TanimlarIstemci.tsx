'use client';
import { useState } from 'react';
import Kip from '@/components/Kip';
import { Pill, Bos } from '@/components/ui';
import { TipCizimi } from '@/components/cizimler';
import { useEylem } from '@/components/useEylem';
import {
  sektorKaydet, tesisTipiKaydet, tesisKaydet, tesisKapat, tesisAc,
  regulasyonKaydet, regulasyonAktifDegistir, alanKaydet, tanimSil,
} from '@/lib/eylemler';
import { etiketle, tarihTR } from '@/lib/sabitler';

type Sektor = { id: string; kod: string; ad: string; tipSayisi: number };
type Tip = { id: string; kod: string; ad: string; sektorId: string | null;
  sektorKod: string | null; tesisSayisi: number };
type Tesis = { id: string; kod: string; ad: string; tipId: string | null; tipKod: string | null;
  guc: number | null; konum: string | null; durum: string; kapanisNedeni: string | null;
  kapanisTarihi: string | null; surecSayisi: number };
type Reg = { id: string; kod: string; ad: string; surum: string | null; kaynakUrl: string | null;
  aktif: boolean; maddeSayisi: number; surecSayisi: number };
type Alan = { id: string; kod: string; ad: string; aciklama: string | null; maddeSayisi: number };

export default function TanimlarIstemci({ sektorler, tipler, tesisler, regulasyonlar, alanlar }: {
  sektorler: Sektor[]; tipler: Tip[]; tesisler: Tesis[]; regulasyonlar: Reg[]; alanlar: Alan[];
}) {
  const [sekme, setSekme] = useState<'tesisler' | 'regulasyonlar' | 'alanlar' | 'kirilimlar'>('tesisler');

  return (
    <>
      <div className="filtreler">
        {([['tesisler', 'Tesisler'], ['regulasyonlar', 'Regülasyonlar'],
          ['alanlar', 'Kapsam alanları'], ['kirilimlar', 'Sektör & kırılımlar']] as const).map(([k, ad]) => (
          <button key={k} className={`btn${sekme === k ? ' birincil' : ''}`}
            onClick={() => setSekme(k)}>{ad}</button>
        ))}
      </div>
      {sekme === 'tesisler' && <TesisPaneli tesisler={tesisler} tipler={tipler} />}
      {sekme === 'regulasyonlar' && <RegPaneli regulasyonlar={regulasyonlar} />}
      {sekme === 'alanlar' && <AlanPaneli alanlar={alanlar} />}
      {sekme === 'kirilimlar' && <KirilimPaneli sektorler={sektorler} tipler={tipler} />}
    </>
  );
}

/* ------------------------------------------------------------- tesisler */

/** Tesis kapanış nedenleri — değer ham kalır, görünen metin merkezî sözlükten. */
const KAPANIS_NEDENLERI = ['satis', 'kapanis', 'birlesme'] as const;

function TesisPaneli({ tesisler, tipler }: { tesisler: Tesis[]; tipler: Tip[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [duzenlenen, setDuzenlenen] = useState<Tesis | 'yeni' | null>(null);
  const [kapatilan, setKapatilan] = useState<Tesis | null>(null);
  const [neden, setNeden] = useState('satis');

  return (
    <>
      <div className="filtreler">
        <span className="mikro-etiket">
          {tesisler.filter((t) => t.durum === 'aktif').length} AKTİF ·{' '}
          {tesisler.filter((t) => t.durum === 'kapali').length} KAPALI (SATIŞ/DEVİR)
        </span>
        <span style={{ flex: 1 }} />
        <button className="btn birincil" onClick={() => setDuzenlenen('yeni')}>+ Yeni tesis</button>
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
        {tesisler.map((t) => (
          <div key={t.id} className="kart tikla" style={{ position: 'relative', overflow: 'hidden',
            opacity: t.durum === 'kapali' ? .65 : 1 }}>
            <div style={{ position: 'absolute', right: -4, bottom: -6, color: 'var(--text-3)',
              opacity: .18, pointerEvents: 'none' }}>
              <TipCizimi kod={t.tipKod} boy={120} />
            </div>
            <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <div className="filtreler">
                <span className="chip mono">{t.kod}</span>
                {t.tipKod && <span className="chip">{t.tipKod}</span>}
                {t.durum === 'kapali'
                  ? <Pill durum="kapsamdisi"
                      etiket={`Kapalı · ${etiketle(t.kapanisNedeni, 'neden belirtilmemiş')} · ${tarihTR(t.kapanisTarihi)}`} />
                  : <Pill durum="uyumlu" etiket="Aktif" />}
              </div>
              <h3>{t.ad}</h3>
              <span className="mikro-etiket">
                {t.guc ? `${t.guc} MW · ` : ''}{t.konum ?? ''} · {t.surecSayisi} süreç kapsamında
              </span>
              <div className="filtreler sirada-gizli">
                <button className="btn kucuk" onClick={() => setDuzenlenen(t)}>Düzenle</button>
                {t.durum === 'aktif' ? (
                  <button className="btn kucuk tehlike" onClick={() => setKapatilan(t)}>Kapat / sat</button>
                ) : (
                  <button className="btn kucuk" disabled={bekliyor}
                    onClick={() => calistir(() => tesisAc({ id: t.id }))}>Yeniden aç</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      <Kip acik={duzenlenen !== null} kapat={() => setDuzenlenen(null)}
        baslik={duzenlenen === 'yeni' ? 'Yeni tesis' : 'Tesisi düzenle'}>
        <TesisFormu key={duzenlenen === 'yeni' ? 'yeni' : duzenlenen?.id ?? 't'}
          tesis={duzenlenen === 'yeni' ? null : duzenlenen}
          tipler={tipler} kapat={() => setDuzenlenen(null)} />
      </Kip>

      <Kip acik={!!kapatilan} kapat={() => setKapatilan(null)}
        baslik={`Tesisi kapat — ${kapatilan?.ad ?? ''}`}
        ust={<span className="mikro-etiket">Uyum kayıtları tarihçe olarak saklanır; aktif süreç kapsamından düşer</span>}>
        <div className="form-izgara">
          <label className="form-satir"><span>Neden</span>
            <select className="sec" value={neden} onChange={(e) => setNeden(e.target.value)}>
              {KAPANIS_NEDENLERI.map((n) => <option key={n} value={n}>{etiketle(n)}</option>)}
            </select></label>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setKapatilan(null)}>Vazgeç</button>
          <button className="btn tehlike" disabled={bekliyor}
            onClick={() => calistir(() => tesisKapat({ id: kapatilan!.id, neden }),
              () => setKapatilan(null))}>
            Tesisi kapat
          </button>
        </div>
      </Kip>
    </>
  );
}

function TesisFormu({ tesis, tipler, kapat }: {
  tesis: Tesis | null; tipler: Tip[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState({
    kod: tesis?.kod ?? '', ad: tesis?.ad ?? '', tipId: tesis?.tipId ?? '',
    guc: tesis?.guc?.toString() ?? '', konum: tesis?.konum ?? '' });
  return (
    <>
      <div className="form-izgara">
        <label className="form-satir"><span>Kod</span>
          <input className="inp" value={v.kod} placeholder="ADANA-DGKC"
            onChange={(e) => setV({ ...v, kod: e.target.value })} /></label>
        <label className="form-satir"><span>Kırılım (tip)</span>
          <select className="sec" value={v.tipId} onChange={(e) => setV({ ...v, tipId: e.target.value })}>
            <option value="">Seçin…</option>
            {tipler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
          </select></label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Ad</span>
          <input className="inp" value={v.ad} onChange={(e) => setV({ ...v, ad: e.target.value })} /></label>
        <label className="form-satir"><span>Kurulu güç (MW)</span>
          <input className="inp" type="number" value={v.guc}
            onChange={(e) => setV({ ...v, guc: e.target.value })} /></label>
        <label className="form-satir"><span>Konum</span>
          <input className="inp" value={v.konum} onChange={(e) => setV({ ...v, konum: e.target.value })} /></label>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert" style={{ marginTop: 'var(--sp-3)' }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={kapat}>Vazgeç</button>
        <button className="btn birincil" disabled={bekliyor}
          onClick={() => calistir(() => tesisKaydet({
            id: tesis?.id, kod: v.kod, ad: v.ad, tipId: v.tipId || null,
            kuruluGucMw: v.guc ? Number(v.guc) : null, konum: v.konum || null }), kapat)}>
          Kaydet
        </button>
      </div>
    </>
  );
}

/* --------------------------------------------------------- regülasyonlar */

function RegPaneli({ regulasyonlar }: { regulasyonlar: Reg[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [duzenlenen, setDuzenlenen] = useState<Reg | 'yeni' | null>(null);

  return (
    <>
      <div className="filtreler">
        <span className="mikro-etiket">YENİ UYUM YÜKÜMLÜLÜĞÜ GELDİĞİNDE BURADAN EKLENİR; MADDELER İÇE AKTARIMLA GELİR</span>
        <span style={{ flex: 1 }} />
        <button className="btn birincil" onClick={() => setDuzenlenen('yeni')}>+ Yeni regülasyon</button>
      </div>
      <div className="kart">
        <div className="tablo-sar"><table className="tablo">
          <thead><tr><th>Kod</th><th>Ad</th><th>Sürüm</th><th>Madde</th><th>Süreç</th><th>Durum</th><th className="sag">İşlem</th></tr></thead>
          <tbody>
            {regulasyonlar.map((r) => (
              <tr key={r.id} style={{ opacity: r.aktif ? 1 : .55 }}>
                <td><span className="chip mono">{r.kod}</span></td>
                <td style={{ fontWeight: 500 }}>{r.ad}
                  {r.kaynakUrl && <a className="mikro-etiket sirada-gizli" href={r.kaynakUrl}
                    target="_blank" rel="noreferrer" style={{ display: 'block' }}>{r.kaynakUrl} ↗</a>}
                </td>
                <td className="mono" style={{ color: 'var(--text-2)' }}>{r.surum ?? '—'}</td>
                <td className="mono">{r.maddeSayisi}</td>
                <td className="mono">{r.surecSayisi}</td>
                <td>{r.aktif ? <Pill durum="uyumlu" etiket="Aktif" /> : <Pill durum="kapsamdisi" etiket="Pasif" />}</td>
                <td className="sag"><span className="filtreler sirada-gizli" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn kucuk" onClick={() => setDuzenlenen(r)}>Düzenle</button>
                  <button className="btn kucuk" disabled={bekliyor}
                    onClick={() => calistir(() => regulasyonAktifDegistir({ id: r.id, aktif: !r.aktif }))}>
                    {r.aktif ? 'Pasifleştir' : 'Aktifleştir'}
                  </button>
                </span></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      <Kip acik={duzenlenen !== null} kapat={() => setDuzenlenen(null)}
        baslik={duzenlenen === 'yeni' ? 'Yeni regülasyon' : 'Regülasyonu düzenle'}>
        <RegFormu key={duzenlenen === 'yeni' ? 'yeni' : duzenlenen?.id ?? 'r'}
          reg={duzenlenen === 'yeni' ? null : duzenlenen} kapat={() => setDuzenlenen(null)} />
      </Kip>
    </>
  );
}

function RegFormu({ reg, kapat }: { reg: Reg | null; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState({ kod: reg?.kod ?? '', ad: reg?.ad ?? '',
    surum: reg?.surum ?? '', kaynakUrl: reg?.kaynakUrl ?? '' });
  return (
    <>
      <div className="form-izgara">
        <label className="form-satir"><span>Kod</span>
          <input className="inp" value={v.kod} placeholder="NIS2"
            onChange={(e) => setV({ ...v, kod: e.target.value })} /></label>
        <label className="form-satir"><span>Sürüm</span>
          <input className="inp" value={v.surum}
            onChange={(e) => setV({ ...v, surum: e.target.value })} /></label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Ad</span>
          <input className="inp" value={v.ad} onChange={(e) => setV({ ...v, ad: e.target.value })} /></label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Resmî kaynak URL (otomatik çekim için)</span>
          <input className="inp" value={v.kaynakUrl} placeholder="https://…"
            onChange={(e) => setV({ ...v, kaynakUrl: e.target.value })} /></label>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert" style={{ marginTop: 'var(--sp-3)' }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={kapat}>Vazgeç</button>
        <button className="btn birincil" disabled={bekliyor}
          onClick={() => calistir(() => regulasyonKaydet({
            id: reg?.id, kod: v.kod, ad: v.ad, surum: v.surum || null,
            kaynakUrl: v.kaynakUrl || null }), kapat)}>
          Kaydet
        </button>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- alanlar */

function AlanPaneli({ alanlar }: { alanlar: Alan[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [duzenlenen, setDuzenlenen] = useState<Alan | 'yeni' | null>(null);
  const [v, setV] = useState({ kod: '', ad: '', aciklama: '' });

  return (
    <>
      <div className="filtreler">
        <span className="mikro-etiket">MADDELER BU ALANLARLA EŞLEŞTİRİLİR; İÇE AKTARIMDA EŞLEŞMEYEN SATIR ELENİR</span>
        <span style={{ flex: 1 }} />
        <button className="btn birincil" onClick={() => { setV({ kod: '', ad: '', aciklama: '' }); setDuzenlenen('yeni'); }}>
          + Yeni alan</button>
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
        {alanlar.map((a) => (
          <div key={a.id} className="kart tikla">
            <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <div className="filtreler">
                <span className="chip mono">{a.kod}</span>
                <span className="mikro-etiket">{a.maddeSayisi} MADDE EŞLİ</span>
              </div>
              <h3>{a.ad}</h3>
              {a.aciklama && <span style={{ color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>{a.aciklama}</span>}
              <div className="filtreler sirada-gizli">
                <button className="btn kucuk" onClick={() => {
                  setV({ kod: a.kod, ad: a.ad, aciklama: a.aciklama ?? '' }); setDuzenlenen(a); }}>Düzenle</button>
                <button className="btn kucuk tehlike" disabled={bekliyor || a.maddeSayisi > 0}
                  title={a.maddeSayisi > 0 ? 'Eşleştirilmiş maddeler varken silinemez' : undefined}
                  onClick={() => calistir(() => tanimSil({ tur: 'alan', id: a.id }))}>Sil</button>
              </div>
            </div>
          </div>
        ))}
        {alanlar.length === 0 && <div className="kart"><Bos baslik="Alan yok" /></div>}
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      <Kip acik={duzenlenen !== null} kapat={() => setDuzenlenen(null)}
        baslik={duzenlenen === 'yeni' ? 'Yeni kapsam alanı' : 'Alanı düzenle'}>
        <div className="form-izgara">
          <label className="form-satir"><span>Kod</span>
            <input className="inp" value={v.kod} placeholder="OT"
              onChange={(e) => setV({ ...v, kod: e.target.value })} /></label>
          <label className="form-satir"><span>Ad</span>
            <input className="inp" value={v.ad}
              onChange={(e) => setV({ ...v, ad: e.target.value })} /></label>
          <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Açıklama</span>
            <input className="inp" value={v.aciklama}
              onChange={(e) => setV({ ...v, aciklama: e.target.value })} /></label>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setDuzenlenen(null)}>Vazgeç</button>
          <button className="btn birincil" disabled={bekliyor}
            onClick={() => calistir(() => alanKaydet({
              id: duzenlenen === 'yeni' ? undefined : duzenlenen?.id,
              kod: v.kod, ad: v.ad, aciklama: v.aciklama || null }), () => setDuzenlenen(null))}>
            Kaydet
          </button>
        </div>
      </Kip>
    </>
  );
}

/* ------------------------------------------------------ sektör & kırılım */

function KirilimPaneli({ sektorler, tipler }: { sektorler: Sektor[]; tipler: Tip[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [sektorForm, setSektorForm] = useState({ kod: '', ad: '' });
  const [tipForm, setTipForm] = useState({ kod: '', ad: '', sektorId: '' });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 'var(--sp-6)' }}>
      <div className="kart">
        <div className="kart-baslik"><h3>Sektörler</h3>
          <span className="mikro-etiket">YENİ SEKTÖR = YENİ İŞ KOLU</span></div>
        <div className="kart-icerik sifir">
          {sektorler.map((s) => (
            <div key={s.id} className="satir">
              <span className="chip mono">{s.kod}</span>
              <span style={{ flex: 1 }}>{s.ad}</span>
              <span className="mikro-etiket">{s.tipSayisi} KIRILIM</span>
              <button className="btn kucuk tehlike sirada-gizli" disabled={bekliyor || s.tipSayisi > 0}
                onClick={() => calistir(() => tanimSil({ tur: 'sektor', id: s.id }))}>Sil</button>
            </div>
          ))}
          <div className="satir" style={{ gap: 'var(--sp-2)' }}>
            <input className="inp" placeholder="Kod" value={sektorForm.kod} style={{ width: 130 }}
              onChange={(e) => setSektorForm({ ...sektorForm, kod: e.target.value })} />
            <input className="inp" placeholder="Sektör adı" value={sektorForm.ad} style={{ flex: 1 }}
              onChange={(e) => setSektorForm({ ...sektorForm, ad: e.target.value })} />
            <button className="btn birincil kucuk" disabled={bekliyor}
              onClick={() => calistir(() => sektorKaydet(sektorForm), () => setSektorForm({ kod: '', ad: '' }))}>
              + Ekle
            </button>
          </div>
        </div>
      </div>

      <div className="kart">
        <div className="kart-baslik"><h3>Tesis kırılımları</h3>
          <span className="mikro-etiket">DOĞALGAZ · JEOTERMAL · HES · RES …</span></div>
        <div className="kart-icerik sifir">
          {tipler.map((t) => (
            <div key={t.id} className="satir">
              <span style={{ color: 'var(--text-3)', display: 'inline-flex' }}>
                <TipCizimi kod={t.kod} boy={40} /></span>
              <span className="chip mono">{t.kod}</span>
              <span style={{ flex: 1 }}>{t.ad}</span>
              {t.sektorKod && <span className="chip">{t.sektorKod}</span>}
              <span className="mikro-etiket">{t.tesisSayisi} TESİS</span>
              <button className="btn kucuk tehlike sirada-gizli" disabled={bekliyor || t.tesisSayisi > 0}
                onClick={() => calistir(() => tanimSil({ tur: 'tesisTipi', id: t.id }))}>Sil</button>
            </div>
          ))}
          <div className="satir" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <input className="inp" placeholder="Kod" value={tipForm.kod} style={{ width: 100 }}
              onChange={(e) => setTipForm({ ...tipForm, kod: e.target.value })} />
            <input className="inp" placeholder="Kırılım adı (örn. Jeotermal)" value={tipForm.ad}
              style={{ flex: 1, minWidth: 150 }}
              onChange={(e) => setTipForm({ ...tipForm, ad: e.target.value })} />
            <select className="sec" value={tipForm.sektorId}
              onChange={(e) => setTipForm({ ...tipForm, sektorId: e.target.value })}>
              <option value="">Sektör…</option>
              {sektorler.map((s) => <option key={s.id} value={s.id}>{s.kod} — {s.ad}</option>)}
            </select>
            <button className="btn birincil kucuk" disabled={bekliyor}
              onClick={() => calistir(() => tesisTipiKaydet({
                kod: tipForm.kod, ad: tipForm.ad, sektorId: tipForm.sektorId || null }),
                () => setTipForm({ kod: '', ad: '', sektorId: '' }))}>
              + Ekle
            </button>
          </div>
        </div>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert" style={{ gridColumn: '1/-1' }}>{hata}</p>}
    </div>
  );
}
