'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pill, Bos } from '@/components/ui';
import { BosTemiz } from '@/components/sahneler';
import Kip from '@/components/Kip';
import { useEylem } from '@/components/useEylem';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { gorevOlustur, gorevDurum, onayKarar } from '@/lib/eylemler2/gorev';
import { GOREV_TIP_ETIKET, etiketle, tarihTR, zamanTR, gecikmisMi, type Durum } from '@/lib/sabitler';

/* Görev/onay durum sözlükleri bu ekrana özgüdür; renk yalnız durumu anlatır. */
const GOREV_DURUMLARI = ['acik', 'yapiliyor', 'tamamlandi', 'iptal'] as const;
const GOREV_DURUM_ETIKET: Record<string, string> = {
  acik: 'Açık', yapiliyor: 'Yapılıyor', tamamlandi: 'Tamamlandı', iptal: 'İptal',
};
const GOREV_DURUM_RENGI: Record<string, Durum> = {
  acik: 'incelemede', yapiliyor: 'kismi', tamamlandi: 'uyumlu', iptal: 'kapsamdisi',
};
const ONAY_TIP_ETIKET: Record<string, string> = {
  bulgu_kapanis: 'Bulgu kapanışı', risk_kabul: 'Risk kabulü', istisna: 'İstisna',
  proje_aday: 'Proje adayı', applicability_override: 'Uygulanabilirlik istisnası',
  proje_kapanis: 'Proje kapanışı',
};
const ONAY_DURUM_ETIKET: Record<string, string> = {
  bekliyor: 'Bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi',
};
const ONAY_DURUM_RENGI: Record<string, Durum> = {
  bekliyor: 'kismi', onaylandi: 'uyumlu', reddedildi: 'uyumsuz',
};

type G = {
  id: string; baslik: string; tip: string;
  kaynakTipi: string | null; kaynakId: string | null;
  sorumlu: { id: string; ad: string } | null;
  tesisKod: string | null; tesisAd: string | null;
  sonTarih: string | null; durum: string; otomatik: boolean;
  olusturuldu: string; kapanis: string | null; degistirebilir: boolean;
};
type O = {
  id: string; tip: string; kaynakTipi: string; kaynakId: string;
  ozet: string; durum: string; gerekce: string | null;
  talepEden: string | null; onaylayan: string | null;
  olusturuldu: string; kapanis: string | null; karariVerebilir: boolean;
};
type Kisi = { id: string; ad: string };
type Tesis = { id: string; kod: string; ad: string };

const acikMi = (durum: string) => durum === 'acik' || durum === 'yapiliyor';

/** Kaynağı olan ekrana bağlantı; ekranı olmayan tipler chip olarak kalır. */
function kaynakYolu(tipi: string | null, id: string | null): string | null {
  if (!tipi || !id) return null;
  if (tipi === 'Bulgu') return `/bulgular/${id}`;
  if (tipi === 'KanitTalebi') return '/denetimler';
  return null;
}

const BOS_FORM = { baslik: '', tip: 'manuel', sorumluId: '', tesisId: '', sonTarih: '' };

export default function GorevlerIstemci({
  aktifId, gorevler, onaylar, kullanicilar, tesisler, gorevAcabilir,
}: {
  aktifId: string; gorevler: G[]; onaylar: O[];
  kullanicilar: Kisi[]; tesisler: Tesis[]; gorevAcabilir: boolean;
}) {
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const [tipF, setTipF] = useState('hepsi');
  const [durumF, setDurumF] = useState('acik-hepsi');
  const [sorumluF, setSorumluF] = useState('hepsi');
  const [yeniAcik, setYeniAcik] = useState(false);
  const [f, setF] = useState(BOS_FORM);
  const [gerekceler, setGerekceler] = useState<Record<string, string>>({});

  const gorunen = useMemo(() => gorevler.filter((g) => {
    if (durumF === 'acik-hepsi' && !acikMi(g.durum)) return false;
    if (durumF !== 'hepsi' && durumF !== 'acik-hepsi' && g.durum !== durumF) return false;
    if (tipF !== 'hepsi' && g.tip !== tipF) return false;
    if (sorumluF === 'bana' && g.sorumlu?.id !== aktifId) return false;
    if (sorumluF === 'sahipsiz' && g.sorumlu) return false;
    if (sorumluF !== 'hepsi' && sorumluF !== 'bana' && sorumluF !== 'sahipsiz'
      && g.sorumlu?.id !== sorumluF) return false;
    return true;
  }), [gorevler, durumF, tipF, sorumluF, aktifId]);

  const sorumlular = useMemo(() => {
    const idler = new Set(gorevler.map((g) => g.sorumlu?.id).filter(Boolean));
    return kullanicilar.filter((u) => idler.has(u.id));
  }, [gorevler, kullanicilar]);

  const acikGorevler = gorevler.filter((g) => acikMi(g.durum));
  const gecikmisler = acikGorevler.filter((g) => gecikmisMi(g.sonTarih));
  const banaAtanan = acikGorevler.filter((g) => g.sorumlu?.id === aktifId);
  const bekleyenler = onaylar.filter((o) => o.durum === 'bekliyor');
  const kararlilar = onaylar.filter((o) => o.durum !== 'bekliyor');

  return (
    <>
      <div className="kart">
        <div className="band">
          <div className="band-hucre">
            <span className="mikro-etiket">Açık görev</span>
            <span className="metrik-dev">{acikGorevler.length}</span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Gecikmiş</span>
            <span className="metrik-dev" style={gecikmisler.length > 0
              ? { color: 'var(--uyumsuz-fg)' } : undefined}>{gecikmisler.length}</span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Bana atanan</span>
            <span className="metrik-dev">{banaAtanan.length}</span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Bekleyen onay</span>
            <span className="metrik-dev">{bekleyenler.length}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- görevler */}
      <div className="sahne-baslik" style={{ marginTop: 'var(--sp-6)' }}>
        <span className="no">01</span><h2>Görevler</h2><span className="cizgi" />
        {gorevAcabilir && (
          <button className="btn birincil kucuk yazdirmada-gizle"
            onClick={() => { setF(BOS_FORM); setHata(null); setYeniAcik(true); }}>
            + Görev
          </button>
        )}
      </div>

      <div className="filtreler" style={{ marginTop: 'var(--sp-3)' }}>
        <select className="sec" value={durumF} onChange={(e) => setDurumF(e.target.value)}>
          <option value="acik-hepsi">Açık + yapılıyor</option>
          <option value="hepsi">Tüm durumlar</option>
          {GOREV_DURUMLARI.map((d) => <option key={d} value={d}>{GOREV_DURUM_ETIKET[d]}</option>)}
        </select>
        <select className="sec" value={tipF} onChange={(e) => setTipF(e.target.value)}>
          <option value="hepsi">Tüm tipler</option>
          {Object.entries(GOREV_TIP_ETIKET).map(([t, e]) => <option key={t} value={t}>{e}</option>)}
        </select>
        <select className="sec" value={sorumluF} onChange={(e) => setSorumluF(e.target.value)}>
          <option value="hepsi">Tüm sorumlular</option>
          <option value="bana">Bana atanan</option>
          <option value="sahipsiz">Sorumlusuz</option>
          {sorumlular.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        {hata && <span className="pill durum-uyumsuz" role="alert">{hata}</span>}
        <button className="btn yazdirmada-gizle" onClick={pdfYazdir}>🖨 PDF</button>
        <button className="btn yazdirmada-gizle" onClick={() => exceleAktar('gorevler-onaylar', [
          { ad: 'Görevler', satirlar: [
            ['Görev', 'Tip', 'Durum', 'Sorumlu', 'Tesis', 'Kaynak', 'Son tarih', 'Oluşturulma', 'Kapanış', 'Otomatik'],
            ...gorunen.map((g) => [g.baslik, GOREV_TIP_ETIKET[g.tip] ?? etiketle(g.tip),
              GOREV_DURUM_ETIKET[g.durum] ?? etiketle(g.durum), g.sorumlu?.ad, g.tesisKod,
              etiketle(g.kaynakTipi, ''), g.sonTarih ? tarihTR(g.sonTarih) : '', tarihTR(g.olusturuldu),
              g.kapanis ? tarihTR(g.kapanis) : '', g.otomatik ? 'Evet' : 'Hayır']) ] },
          { ad: 'Onay talepleri', satirlar: [
            ['Tip', 'Özet', 'Durum', 'Talep eden', 'Onaylayan', 'Gerekçe', 'Talep', 'Karar'],
            ...onaylar.map((o) => [ONAY_TIP_ETIKET[o.tip] ?? etiketle(o.tip), o.ozet,
              ONAY_DURUM_ETIKET[o.durum] ?? etiketle(o.durum), o.talepEden, o.onaylayan, o.gerekce,
              tarihTR(o.olusturuldu), o.kapanis ? tarihTR(o.kapanis) : '']) ] },
        ])}>⤓ Excel</button>
      </div>

      <div className="kart" style={{ marginTop: 'var(--sp-3)' }}>
        <div className="tablo-sar">
          <table className="tablo">
            <thead><tr>
              <th></th><th>Görev</th><th>Tip</th><th>Kaynak</th>
              <th>Sorumlu</th><th>Son tarih</th><th>Durum</th>
            </tr></thead>
            <tbody>
              {gorunen.map((g) => {
                const gecikti = acikMi(g.durum) && gecikmisMi(g.sonTarih);
                const yol = kaynakYolu(g.kaynakTipi, g.kaynakId);
                return (
                  <tr key={g.id}>
                    <td style={{ width: 4, padding: 0 }}>
                      <div className={`serit serit-${gecikti ? 'uyumsuz' : GOREV_DURUM_RENGI[g.durum] ?? 'incelemede'}`}
                        style={{ height: 28, marginLeft: 'var(--sp-2)' }} />
                    </td>
                    <td style={{ maxWidth: 420 }}>
                      <span style={{ fontWeight: 500 }}>{g.baslik}</span>
                      {g.otomatik && <span className="chip" style={{ marginLeft: 'var(--sp-2)' }}
                        title="Görev motoru tarafından üretildi">⚙ otomatik</span>}
                      <div className="mikro-etiket sirada-gizli" style={{ letterSpacing: '.04em' }}>
                        {tarihTR(g.olusturuldu)}
                        {g.tesisAd && <> · <span title={g.tesisKod ?? undefined}>{g.tesisAd}</span></>}
                        {g.kapanis && ` · kapandı ${tarihTR(g.kapanis)}`}
                      </div>
                    </td>
                    <td><span className="chip">{GOREV_TIP_ETIKET[g.tip] ?? etiketle(g.tip)}</span></td>
                    <td>
                      {yol
                        ? <Link href={yol} className="chip">{etiketle(g.kaynakTipi)} ↗</Link>
                        : g.kaynakTipi
                          ? <span className="chip">{etiketle(g.kaynakTipi)}</span>
                          : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {g.sorumlu
                        ? <>{g.sorumlu.ad}{g.sorumlu.id === aktifId && ' (ben)'}</>
                        : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {g.sonTarih ? (
                        <span style={{ color: gecikti ? 'var(--uyumsuz-fg)' : 'var(--text-2)' }}>
                          {tarihTR(g.sonTarih)}{gecikti && ' ⚠'}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {g.degistirebilir ? (
                        <select className="sec" value={g.durum} disabled={bekliyor}
                          onChange={(e) => calistir(() => gorevDurum({ id: g.id, durum: e.target.value }))}>
                          {GOREV_DURUMLARI.map((d) => (
                            <option key={d} value={d}>{GOREV_DURUM_ETIKET[d]}</option>
                          ))}
                        </select>
                      ) : (
                        <Pill durum={GOREV_DURUM_RENGI[g.durum] ?? 'incelemede'}
                          etiket={GOREV_DURUM_ETIKET[g.durum] ?? etiketle(g.durum)} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {gorunen.length === 0 && <Bos gorsel={<BosTemiz />} baslik="Eşleşen görev yok"
            altMetin="Filtreleri genişletin veya yeni görev açın." />}
        </div>
      </div>

      {/* -------------------------------------------------- onay talepleri */}
      <div className="sahne-baslik" style={{ marginTop: 'var(--sp-8)' }}>
        <span className="no">02</span><h2>Onay talepleri</h2><span className="cizgi" />
        <span className="mikro-etiket">{bekleyenler.length} bekleyen</span>
      </div>

      {bekleyenler.length === 0 ? (
        <div className="kart" style={{ marginTop: 'var(--sp-3)' }}>
          <Bos baslik="Bekleyen onay talebi yok" />
        </div>
      ) : (
        <div style={{ marginTop: 'var(--sp-3)', display: 'grid', gap: 'var(--sp-4)',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {bekleyenler.map((o) => (
            <div key={o.id} className="kart">
              <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                <div className="filtreler">
                  <span className="chip">{ONAY_TIP_ETIKET[o.tip] ?? etiketle(o.tip)}</span>
                  <span style={{ flex: 1 }} />
                  <span className="mikro-etiket">{zamanTR(o.olusturuldu)}</span>
                </div>
                <p style={{ margin: 0, fontWeight: 500 }}>{o.ozet}</p>
                <span className="mikro-etiket">
                  Talep eden: {o.talepEden ?? 'sistem'} · {etiketle(o.kaynakTipi)}
                </span>
                {o.karariVerebilir ? (
                  <>
                    <input className="inp" placeholder="Gerekçe (red için zorunlu)"
                      value={gerekceler[o.id] ?? ''}
                      onChange={(e) => setGerekceler({ ...gerekceler, [o.id]: e.target.value })} />
                    <div className="filtreler">
                      <button className="btn birincil" disabled={bekliyor}
                        onClick={() => calistir(() => onayKarar({
                          id: o.id, karar: 'onaylandi', gerekce: gerekceler[o.id] || null }))}>
                        Onayla
                      </button>
                      <button className="btn tehlike"
                        disabled={bekliyor || !gerekceler[o.id]?.trim()}
                        title={!gerekceler[o.id]?.trim() ? 'Red için gerekçe girin' : undefined}
                        onClick={() => calistir(() => onayKarar({
                          id: o.id, karar: 'reddedildi', gerekce: gerekceler[o.id] }))}>
                        Reddet
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="mikro-etiket">
                    Karar yetkisi sizde değil (ilgili modülde onay yetkisi gerekir;
                    kendi talebiniz ise başka bir onaylayan karar verir).
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {kararlilar.length > 0 && (
        <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
          <div className="kart-baslik"><h3>Karara bağlananlar</h3></div>
          <div className="tablo-sar">
            <table className="tablo">
              <thead><tr>
                <th>Tip</th><th>Özet</th><th>Talep eden</th>
                <th>Karar</th><th>Onaylayan</th><th>Karar tarihi</th>
              </tr></thead>
              <tbody>
                {kararlilar.map((o) => (
                  <tr key={o.id}>
                    <td><span className="chip">{ONAY_TIP_ETIKET[o.tip] ?? etiketle(o.tip)}</span></td>
                    <td style={{ maxWidth: 420 }}>
                      {o.ozet}
                      {o.gerekce && (
                        <div className="mikro-etiket sirada-gizli" style={{ letterSpacing: '.04em' }}>
                          Gerekçe: {o.gerekce}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{o.talepEden ?? 'sistem'}</td>
                    <td><Pill durum={ONAY_DURUM_RENGI[o.durum] ?? 'incelemede'}
                      etiket={ONAY_DURUM_ETIKET[o.durum] ?? etiketle(o.durum)} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{o.onaylayan ?? '—'}</td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-2)' }}>
                      {o.kapanis ? tarihTR(o.kapanis) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------- yeni görev kipi */}
      <Kip acik={yeniAcik} kapat={() => setYeniAcik(false)} baslik="Yeni görev"
        ust={<span className="mikro-etiket">Elle açılan görev — motor görevleri ⚙ işaretiyle ayrışır</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="form-izgara">
            <label className="form-satir" style={{ gridColumn: '1/-1' }}>
              <span>Başlık</span>
              <input className="inp" placeholder="Örn. UPS bakım sözleşmesi kanıtı toplansın"
                value={f.baslik} onChange={(e) => setF({ ...f, baslik: e.target.value })} />
            </label>
            <label className="form-satir">
              <span>Tip</span>
              <select className="sec" value={f.tip}
                onChange={(e) => setF({ ...f, tip: e.target.value })}>
                {Object.entries(GOREV_TIP_ETIKET).map(([t, e]) => (
                  <option key={t} value={t}>{e}</option>
                ))}
              </select>
            </label>
            <label className="form-satir">
              <span>Sorumlu</span>
              <select className="sec" value={f.sorumluId}
                onChange={(e) => setF({ ...f, sorumluId: e.target.value })}>
                <option value="">Sorumlu yok</option>
                {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
              </select>
            </label>
            <label className="form-satir">
              <span>Tesis</span>
              <select className="sec" value={f.tesisId}
                onChange={(e) => setF({ ...f, tesisId: e.target.value })}>
                <option value="">Tesis bağı yok</option>
                {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
              </select>
            </label>
            <label className="form-satir">
              <span>Son tarih</span>
              <input className="inp" type="date" value={f.sonTarih}
                onChange={(e) => setF({ ...f, sonTarih: e.target.value })} />
            </label>
          </div>
          <div className="filtreler">
            {hata && <span className="pill durum-uyumsuz" role="alert">{hata}</span>}
            <span style={{ flex: 1 }} />
            <button className="btn" onClick={() => setYeniAcik(false)} disabled={bekliyor}>Vazgeç</button>
            <button className="btn birincil" disabled={bekliyor || !f.baslik.trim()}
              onClick={() => calistir(() => gorevOlustur({
                baslik: f.baslik, tip: f.tip,
                sorumluId: f.sorumluId || null, tesisId: f.tesisId || null,
                sonTarih: f.sonTarih || null,
              }), () => setYeniAcik(false))}>
              Görevi aç
            </button>
          </div>
        </div>
      </Kip>
    </>
  );
}
