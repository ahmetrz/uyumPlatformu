'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pill, SegBar, Bos, type DurumSayilari } from '@/components/ui';
import Kip from '@/components/Kip';
import { useEylem } from '@/components/useEylem';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { riskKaydet, riskIslem, riskKabul } from '@/lib/eylemler2/risk';
import {
  RISK_DURUMLARI, RISK_DURUM_ETIKET, RISK_DURUM_RENGI,
  RISK_ISLEMLERI, RISK_ISLEM_ETIKET, ETKI_BOYUTLARI,
  riskSeviyeRengi, tarihTR, type Durum,
} from '@/lib/sabitler';

type EtkiAnahtari = (typeof ETKI_BOYUTLARI)[number][0];
type RiskDurum = (typeof RISK_DURUMLARI)[number];

type R = {
  id: string; kod: string; baslik: string; aciklama: string; kaynak: string | null;
  tehdit: string | null; zayiflik: string | null; mevcutKontroller: string | null;
  olasilik: number | null;
  etkiler: Record<EtkiAnahtari, number | null>;
  dogalRisk: number | null; artikRisk: number | null;
  islemTipi: string | null; islemTarihi: string | null; kabulBitis: string | null;
  durum: string; olusturuldu: string;
  tesis: { id: string; kod: string; ad: string } | null;
  sistem: { id: string; kod: string; ad: string } | null;
  sahip: { id: string; ad: string } | null;
  onaylayan: { id: string; ad: string } | null;
  bulgu: { id: string; baslik: string } | null;
  varliklar: { id: string; etiket: string; ad: string }[];
  kontroller: { id: string; kod: string; baslik: string }[];
  projeler: { id: string; kod: string; ad: string }[];
};
type Kisi = { id: string; ad: string };
type Kodlu = { id: string; kod: string; ad: string };
type BulguSecenegi = { id: string; baslik: string };

const KAYNAKLAR = ['manuel', 'bulgu', 'zafiyet', 'eol', 'denetim', 'veri_kalitesi'] as const;
const KAYNAK_ETIKET: Record<string, string> = {
  manuel: 'Manuel', bulgu: 'Bulgu', zafiyet: 'Zafiyet', eol: 'EOL/EOS',
  denetim: 'Denetim', veri_kalitesi: 'Veri kalitesi',
};

/** max(etki boyutları) — null boyutlar dışarıda; hepsi null ise null. */
function maxEtki(etkiler: Record<EtkiAnahtari, number | null>): number | null {
  const bilinen = ETKI_BOYUTLARI.map(([a]) => etkiler[a]).filter((x): x is number => x !== null);
  return bilinen.length ? Math.max(...bilinen) : null;
}
function skorHesapla(olasilik: number | null, etkiler: Record<EtkiAnahtari, number | null>): number | null {
  const e = maxEtki(etkiler);
  return olasilik !== null && e !== null ? olasilik * e : null;
}
function kabulDoldu(r: R): boolean {
  return r.durum === 'kabul_edildi' && !!r.kabulBitis
    && new Date(r.kabulBitis).getTime() < Date.now();
}
/** Skor rengini metin rengine çevirir (degerlendirilmedi → kapsamdisi paleti). */
function seviyeFg(skor: number | null): string {
  const d = riskSeviyeRengi(skor);
  return `var(--${d === 'degerlendirilmedi' ? 'kapsamdisi' : d}-fg)`;
}

/** Skor pill'i: renk YALNIZ artık risk seviyesini anlatır. */
function SkorPill({ skor, etiket }: { skor: number | null; etiket?: string }) {
  return (
    <span className={`pill durum-${riskSeviyeRengi(skor)}`}
      style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
      {etiket && <span style={{ fontFamily: 'var(--font-sans, inherit)', fontWeight: 500 }}>{etiket}</span>}
      {skor ?? '—'}
    </span>
  );
}

function PuanSec({ etiket, deger, sec }: {
  etiket: string; deger: number | null; sec: (n: number | null) => void;
}) {
  return (
    <label className="form-satir">
      <span>{etiket}</span>
      <select className="sec" value={deger ?? ''}
        onChange={(e) => sec(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">Bilinmiyor</option>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
}

// ------------------------------------------------------------- ısı matrisi

function IsiMatrisi({ riskler, hucre, setHucre }: {
  riskler: R[];
  hucre: { o: number; e: number } | 'bilinmiyor' | null;
  setHucre: (h: { o: number; e: number } | 'bilinmiyor' | null) => void;
}) {
  const sayilar = new Map<string, number>();
  let bilinmeyen = 0;
  for (const r of riskler) {
    const e = maxEtki(r.etkiler);
    if (r.olasilik === null || e === null) { bilinmeyen += 1; continue; }
    const k = `${r.olasilik}-${e}`;
    sayilar.set(k, (sayilar.get(k) ?? 0) + 1);
  }
  return (
    <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div className="matris-sar">
        <table className="matris">
          <thead>
            <tr>
              <th style={{ fontWeight: 500 }}>Olasılık ↓</th>
              <th colSpan={5} style={{ textAlign: 'center', fontWeight: 500 }}>Etki →</th>
            </tr>
          </thead>
          <tbody>
            {[5, 4, 3, 2, 1].map((o) => (
              <tr key={o}>
                <th className="mono">{o}</th>
                {[1, 2, 3, 4, 5].map((e) => {
                  const n = sayilar.get(`${o}-${e}`) ?? 0;
                  const secili = hucre !== null && hucre !== 'bilinmiyor' && hucre.o === o && hucre.e === e;
                  return (
                    <td key={e} style={{ padding: 3 }}>
                      <button
                        className={`hucre durum-${riskSeviyeRengi(o * e)}`}
                        onClick={() => setHucre(secili ? null : { o, e })}
                        title={`Olasılık ${o} × Etki ${e} = ${o * e}${n ? ` · ${n} risk` : ''}`}
                        style={{
                          width: '100%', minWidth: 40, minHeight: 32, cursor: 'pointer',
                          fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--fs-sm)',
                          border: '1px solid transparent', opacity: n === 0 && !secili ? .45 : 1,
                          outline: secili ? '2px solid var(--accent)' : 'none', outlineOffset: 1,
                        }}>
                        {n || '·'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th></th>
              {[1, 2, 3, 4, 5].map((e) => <th key={e} className="mono">{e}</th>)}
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', fontSize: 'var(--fs-xs)' }}>
        <span className="mikro-etiket">Etki = boyutların en büyüğü</span>
        <span className="pill durum-uyumsuz"><span className="dot" />Yüksek (≥15)</span>
        <span className="pill durum-kismi"><span className="dot" />Orta (8–14)</span>
        <span className="pill durum-uyumlu"><span className="dot" />Düşük (≤7)</span>
        {bilinmeyen > 0 && (
          <button
            className={`pill durum-degerlendirilmedi`}
            onClick={() => setHucre(hucre === 'bilinmiyor' ? null : 'bilinmiyor')}
            style={{ cursor: 'pointer', outline: hucre === 'bilinmiyor' ? '2px solid var(--accent)' : 'none' }}>
            <span className="dot hollow" />Skoru bilinmeyen: {bilinmeyen}
          </button>
        )}
        {hucre !== null && (
          <button className="btn kucuk" onClick={() => setHucre(null)}>✕ Hücre filtresini kaldır</button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- risk formu

type FormDurumu = {
  id?: string; kod: string; baslik: string; aciklama: string; kaynak: string;
  tesisId: string; sistemId: string; bulguId: string; sahipId: string;
  tehdit: string; zayiflik: string; mevcutKontroller: string;
  olasilik: number | null; etkiler: Record<EtkiAnahtari, number | null>;
  durum: string;
};

const BOS_ETKILER = Object.fromEntries(
  ETKI_BOYUTLARI.map(([a]) => [a, null]),
) as Record<EtkiAnahtari, number | null>;

function formBaslat(risk: R | null, yeniKod: string): FormDurumu {
  if (!risk) return {
    kod: yeniKod, baslik: '', aciklama: '', kaynak: 'manuel',
    tesisId: '', sistemId: '', bulguId: '', sahipId: '',
    tehdit: '', zayiflik: '', mevcutKontroller: '',
    olasilik: null, etkiler: { ...BOS_ETKILER }, durum: 'acik',
  };
  return {
    id: risk.id, kod: risk.kod, baslik: risk.baslik, aciklama: risk.aciklama,
    kaynak: risk.kaynak ?? 'manuel', tesisId: risk.tesis?.id ?? '',
    sistemId: risk.sistem?.id ?? '', bulguId: risk.bulgu?.id ?? '',
    sahipId: risk.sahip?.id ?? '', tehdit: risk.tehdit ?? '',
    zayiflik: risk.zayiflik ?? '', mevcutKontroller: risk.mevcutKontroller ?? '',
    olasilik: risk.olasilik, etkiler: { ...risk.etkiler }, durum: risk.durum,
  };
}

function RiskFormu({ risk, yeniKod, kullanicilar, tesisler, sistemler, bulgular, kapat }: {
  risk: R | null; yeniKod: string; kullanicilar: Kisi[]; tesisler: Kodlu[];
  sistemler: Kodlu[]; bulgular: BulguSecenegi[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState<FormDurumu>(() => formBaslat(risk, yeniKod));
  const skor = skorHesapla(f.olasilik, f.etkiler);

  function kaydet() {
    calistir(() => riskKaydet({
      id: f.id, kod: f.kod, baslik: f.baslik, aciklama: f.aciklama,
      kaynak: f.kaynak || null, tesisId: f.tesisId || null,
      sistemId: f.sistemId || null, bulguId: f.bulguId || null,
      sahipId: f.sahipId || null, tehdit: f.tehdit.trim() || null,
      zayiflik: f.zayiflik.trim() || null,
      mevcutKontroller: f.mevcutKontroller.trim() || null,
      olasilik: f.olasilik, ...f.etkiler,
      durum: f.id ? f.durum : undefined,
    }), kapat);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="form-izgara">
        <label className="form-satir">
          <span>Kod</span>
          <input className="inp mono" value={f.kod}
            onChange={(e) => setF({ ...f, kod: e.target.value })} />
        </label>
        <label className="form-satir" style={{ gridColumn: 'span 2' }}>
          <span>Başlık</span>
          <input className="inp" value={f.baslik} placeholder="Risk başlığı"
            onChange={(e) => setF({ ...f, baslik: e.target.value })} />
        </label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}>
          <span>Açıklama</span>
          <textarea className="inp" rows={2} value={f.aciklama}
            onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
        </label>
        <label className="form-satir">
          <span>Kaynak</span>
          <select className="sec" value={f.kaynak} onChange={(e) => setF({ ...f, kaynak: e.target.value })}>
            {KAYNAKLAR.map((s) => <option key={s} value={s}>{KAYNAK_ETIKET[s]}</option>)}
          </select>
        </label>
        <label className="form-satir">
          <span>Tesis</span>
          <select className="sec" value={f.tesisId} onChange={(e) => setF({ ...f, tesisId: e.target.value })}>
            <option value="">—</option>
            {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
          </select>
        </label>
        <label className="form-satir">
          <span>Sistem</span>
          <select className="sec" value={f.sistemId} onChange={(e) => setF({ ...f, sistemId: e.target.value })}>
            <option value="">—</option>
            {sistemler.map((s) => <option key={s.id} value={s.id}>{s.kod} — {s.ad}</option>)}
          </select>
        </label>
        <label className="form-satir">
          <span>Bağlı bulgu</span>
          <select className="sec" value={f.bulguId} onChange={(e) => setF({ ...f, bulguId: e.target.value })}>
            <option value="">—</option>
            {bulgular.map((b) => <option key={b.id} value={b.id}>{b.baslik}</option>)}
          </select>
        </label>
        <label className="form-satir">
          <span>Sahip</span>
          <select className="sec" value={f.sahipId} onChange={(e) => setF({ ...f, sahipId: e.target.value })}>
            <option value="">—</option>
            {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
          </select>
        </label>
        {f.id && (
          <label className="form-satir">
            <span>Durum</span>
            <select className="sec" value={f.durum} onChange={(e) => setF({ ...f, durum: e.target.value })}>
              {RISK_DURUMLARI.map((d) => <option key={d} value={d}>{RISK_DURUM_ETIKET[d]}</option>)}
            </select>
          </label>
        )}
        <label className="form-satir" style={{ gridColumn: 'span 2' }}>
          <span>Tehdit</span>
          <input className="inp" value={f.tehdit}
            onChange={(e) => setF({ ...f, tehdit: e.target.value })} />
        </label>
        <label className="form-satir" style={{ gridColumn: 'span 2' }}>
          <span>Zayıflık</span>
          <input className="inp" value={f.zayiflik}
            onChange={(e) => setF({ ...f, zayiflik: e.target.value })} />
        </label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}>
          <span>Mevcut kontroller</span>
          <textarea className="inp" rows={2} value={f.mevcutKontroller}
            onChange={(e) => setF({ ...f, mevcutKontroller: e.target.value })} />
        </label>
      </div>

      <div>
        <span className="mikro-etiket">Olasılık ve etki (1–5, boş = bilinmiyor)</span>
        <div className="form-izgara" style={{ marginTop: 'var(--sp-2)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
          <PuanSec etiket="Olasılık" deger={f.olasilik} sec={(n) => setF({ ...f, olasilik: n })} />
          {ETKI_BOYUTLARI.map(([anahtar, etiket]) => (
            <PuanSec key={anahtar} etiket={etiket} deger={f.etkiler[anahtar]}
              sec={(n) => setF({ ...f, etkiler: { ...f.etkiler, [anahtar]: n } })} />
          ))}
        </div>
      </div>

      <div className="filtreler">
        <SkorPill skor={skor} etiket="Skor" />
        <span className="mikro-etiket">
          {skor === null
            ? 'Olasılık veya en az bir etki boyutu bilinmeden skor hesaplanmaz — bilinmeyen 0 sayılmaz.'
            : `olasılık ${f.olasilik} × en büyük etki ${maxEtki(f.etkiler)} — doğal ve artık risk otomatik yazılır.`}
        </span>
        <span style={{ flex: 1 }} />
        {hata && <span className="pill durum-uyumsuz" role="alert">{hata}</span>}
        <button className="btn" onClick={kapat} disabled={bekliyor}>Vazgeç</button>
        <button className="btn birincil" onClick={kaydet}
          disabled={bekliyor || !f.kod.trim() || !f.baslik.trim() || !f.aciklama.trim()}>
          {f.id ? 'Kaydet' : 'Risk oluştur'}
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- ana ekran

export default function RisklerIstemci({ riskler, yeniKod, kullanicilar, tesisler, sistemler, bulgular }: {
  riskler: R[]; yeniKod: string; kullanicilar: Kisi[]; tesisler: Kodlu[];
  sistemler: Kodlu[]; bulgular: BulguSecenegi[];
}) {
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const [durumF, setDurumF] = useState('aktif');
  const [tesisF, setTesisF] = useState('hepsi');
  const [arama, setArama] = useState('');
  const [hucre, setHucre] = useState<{ o: number; e: number } | 'bilinmiyor' | null>(null);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [duzenle, setDuzenle] = useState(false);
  const [yeniAcik, setYeniAcik] = useState(false);
  const [kabulAcik, setKabulAcik] = useState(false);
  const [kabul, setKabul] = useState({ bitis: '', gerekce: '', min: '' });

  const secili = riskler.find((r) => r.id === seciliId) ?? null;

  // durum/tesis/arama filtresi — ısı matrisi bu kümeden sayılır
  const taban = useMemo(() => riskler.filter((r) => {
    if (durumF === 'aktif' && r.durum === 'kapali') return false;
    if (durumF === 'kabul_doldu' && !kabulDoldu(r)) return false;
    if (durumF !== 'hepsi' && durumF !== 'aktif' && durumF !== 'kabul_doldu'
      && r.durum !== durumF) return false;
    if (tesisF !== 'hepsi' && r.tesis?.id !== tesisF) return false;
    if (arama && !`${r.kod} ${r.baslik} ${r.tesis?.kod ?? ''} ${r.sahip?.ad ?? ''}`
      .toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    return true;
  }), [riskler, durumF, tesisF, arama]);

  // + matris hücre filtresi — liste bu kümeyi gösterir
  const gorunen = useMemo(() => taban.filter((r) => {
    if (hucre === null) return true;
    const e = maxEtki(r.etkiler);
    if (hucre === 'bilinmiyor') return r.olasilik === null || e === null;
    return r.olasilik === hucre.o && e === hucre.e;
  }), [taban, hucre]);

  // üst band — filtrelerden bağımsız genel görünüm
  const acikRiskler = riskler.filter((r) => r.durum === 'acik' || r.durum === 'islemde');
  const seviyeSayilari: DurumSayilari = {};
  for (const r of acikRiskler) {
    const d: Durum = riskSeviyeRengi(r.artikRisk);
    seviyeSayilari[d] = (seviyeSayilari[d] ?? 0) + 1;
  }
  const dolanKabul = riskler.filter(kabulDoldu).length;
  const artiklar = riskler.filter((r) => r.durum !== 'kapali' && r.artikRisk !== null)
    .map((r) => r.artikRisk as number);
  const enYuksek = artiklar.length ? Math.max(...artiklar) : null;

  function detayKapat() { setSeciliId(null); setDuzenle(false); setHata(null); }

  return (
    <>
      <div className="kart">
        <div className="band">
          <div className="band-hucre">
            <span className="mikro-etiket">Açık risk</span>
            <span className="metrik-dev">{riskler.filter((r) => r.durum === 'acik').length}</span>
            <SegBar sayilar={seviyeSayilari} />
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">İşlemde</span>
            <span className="metrik-dev">{riskler.filter((r) => r.durum === 'islemde').length}</span>
          </div>
          <div className="band-hucre" onClick={() => setDurumF(dolanKabul ? 'kabul_doldu' : durumF)}
            style={dolanKabul ? { cursor: 'pointer' } : undefined}
            title={dolanKabul ? 'Süresi dolan kabulleri listele' : undefined}>
            <span className="mikro-etiket">Süresi dolan kabul</span>
            <span className="metrik-dev"
              style={dolanKabul ? { color: 'var(--uyumsuz-fg)' } : undefined}>{dolanKabul}</span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">En yüksek artık risk</span>
            <span className="metrik-dev" style={{ color: seviyeFg(enYuksek) }}>
              {enYuksek ?? '—'}{enYuksek !== null && <span className="birim">/25</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="kart">
        <div className="kart-baslik"><h3>Isı matrisi — olasılık × etki</h3></div>
        <div className="kart-icerik">
          <IsiMatrisi riskler={taban} hucre={hucre} setHucre={setHucre} />
        </div>
      </div>

      <div className="filtreler">
        <input className="inp" placeholder="Risk ara…" value={arama}
          onChange={(e) => setArama(e.target.value)} style={{ minWidth: 200 }} />
        <select className="sec" value={durumF} onChange={(e) => setDurumF(e.target.value)}>
          <option value="aktif">Açık + işlemde + kabul</option>
          <option value="hepsi">Tüm durumlar</option>
          <option value="kabul_doldu">Kabul süresi dolan</option>
          {RISK_DURUMLARI.map((d) => <option key={d} value={d}>{RISK_DURUM_ETIKET[d]}</option>)}
        </select>
        <select className="sec" value={tesisF} onChange={(e) => setTesisF(e.target.value)}>
          <option value="hepsi">Tüm tesisler</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn yazdirmada-gizle" onClick={pdfYazdir}>🖨 PDF</button>
        <button className="btn yazdirmada-gizle" onClick={() => exceleAktar('riskler', [{
          ad: 'Riskler', satirlar: [
            ['Kod', 'Başlık', 'Tesis', 'Sahip', 'Kaynak', 'Olasılık', 'Maks etki',
              'Doğal risk', 'Artık risk', 'İşlem', 'Durum', 'Kabul bitiş'],
            ...gorunen.map((r) => [r.kod, r.baslik, r.tesis?.kod, r.sahip?.ad,
              r.kaynak ? KAYNAK_ETIKET[r.kaynak] ?? r.kaynak : '',
              r.olasilik, maxEtki(r.etkiler), r.dogalRisk, r.artikRisk,
              r.islemTipi ? RISK_ISLEM_ETIKET[r.islemTipi as (typeof RISK_ISLEMLERI)[number]] : '',
              RISK_DURUM_ETIKET[r.durum as RiskDurum],
              r.kabulBitis ? tarihTR(r.kabulBitis) : '']),
          ] }])}>⤓ Excel</button>
        <button className="btn birincil yazdirmada-gizle" onClick={() => setYeniAcik(true)}>
          + Yeni risk</button>
      </div>

      <div className="kart">
        <div className="tablo-sar">
          <table className="tablo">
            <thead><tr>
              <th></th><th>Kod</th><th>Risk</th><th>Tesis</th><th>Sahip</th>
              <th>İşlem</th><th className="sag">Artık</th><th>Durum</th>
            </tr></thead>
            <tbody>
              {gorunen.map((r) => {
                const doldu = kabulDoldu(r);
                return (
                  <tr key={r.id} onClick={() => { setSeciliId(r.id); setDuzenle(false); }}
                    style={{ cursor: 'pointer' }}>
                    <td style={{ width: 4, padding: 0 }}>
                      <div className={`serit serit-${riskSeviyeRengi(r.artikRisk)}`}
                        style={{ height: 28, marginLeft: 'var(--sp-2)' }} />
                    </td>
                    <td><span className="chip mono">{r.kod}</span></td>
                    <td style={{ maxWidth: 380 }}>
                      <span style={{ fontWeight: 500 }}>{r.baslik}</span>
                      <div className="mikro-etiket sirada-gizli" style={{ letterSpacing: '.03em' }}>
                        {ETKI_BOYUTLARI.filter(([a]) => (r.etkiler[a] ?? 0) > 0)
                          .map(([a, e]) => `${e} ${r.etkiler[a]}`).join(' · ') || 'etki bilinmiyor'}
                        {r.kaynak && ` · ${KAYNAK_ETIKET[r.kaynak] ?? r.kaynak}`}
                      </div>
                    </td>
                    <td>{r.tesis ? <span className="chip mono">{r.tesis.kod}</span> : '—'}</td>
                    <td style={{ color: 'var(--text-2)' }}>{r.sahip?.ad ?? '—'}</td>
                    <td>{r.islemTipi ? (
                      <Pill durum={r.islemTipi === 'kabul' ? 'kapsamdisi' : 'incelemede'}
                        etiket={RISK_ISLEM_ETIKET[r.islemTipi as (typeof RISK_ISLEMLERI)[number]] ?? r.islemTipi} />
                    ) : '—'}</td>
                    <td className="sag"><SkorPill skor={r.artikRisk} /></td>
                    <td>{doldu
                      ? <Pill durum="uyumsuz" etiket="Kabul süresi doldu" hollow />
                      : <Pill durum={RISK_DURUM_RENGI[r.durum as RiskDurum]}
                          etiket={RISK_DURUM_ETIKET[r.durum as RiskDurum]} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {gorunen.length === 0 && <Bos baslik="Eşleşen risk yok"
            altMetin={hucre !== null ? 'Matris hücre filtresi etkin.' : undefined} />}
        </div>
      </div>

      {/* --------------------------------------------------- detay kip'i */}
      <Kip acik={!!secili} kapat={detayKapat} genis
        ust={secili && (
          <span className="mikro-etiket">
            <span className="mono">{secili.kod}</span>
            {secili.kaynak && ` · ${KAYNAK_ETIKET[secili.kaynak] ?? secili.kaynak}`}
            {` · ${tarihTR(secili.olusturuldu)}`}
          </span>
        )}
        baslik={secili?.baslik ?? ''}>
        {secili && (duzenle ? (
          <RiskFormu risk={secili} yeniKod={yeniKod} kullanicilar={kullanicilar}
            tesisler={tesisler} sistemler={sistemler} bulgular={bulgular}
            kapat={() => setDuzenle(false)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="filtreler">
              {kabulDoldu(secili)
                ? <Pill durum="uyumsuz" etiket="Kabul süresi doldu" hollow />
                : <Pill durum={RISK_DURUM_RENGI[secili.durum as RiskDurum]}
                    etiket={RISK_DURUM_ETIKET[secili.durum as RiskDurum]} />}
              {secili.islemTipi && (
                <Pill durum={secili.islemTipi === 'kabul' ? 'kapsamdisi' : 'incelemede'}
                  etiket={`İşlem: ${RISK_ISLEM_ETIKET[secili.islemTipi as (typeof RISK_ISLEMLERI)[number]] ?? secili.islemTipi}`} />
              )}
              <SkorPill skor={secili.dogalRisk} etiket="Doğal" />
              <SkorPill skor={secili.artikRisk} etiket="Artık" />
              {secili.tesis && <span className="chip mono" title={secili.tesis.ad}>{secili.tesis.kod}</span>}
              {secili.sistem && <span className="chip mono" title={secili.sistem.ad}>{secili.sistem.kod}</span>}
              {secili.sahip && <span className="chip">Sahip: {secili.sahip.ad}</span>}
            </div>

            <p style={{ margin: 0, color: 'var(--text-2)', maxWidth: '72ch' }}>{secili.aciklama}</p>

            <div className="form-izgara">
              {secili.tehdit && (
                <div className="form-satir"><span>Tehdit</span>
                  <span style={{ fontSize: 'var(--fs-sm)' }}>{secili.tehdit}</span></div>
              )}
              {secili.zayiflik && (
                <div className="form-satir"><span>Zayıflık</span>
                  <span style={{ fontSize: 'var(--fs-sm)' }}>{secili.zayiflik}</span></div>
              )}
              {secili.mevcutKontroller && (
                <div className="form-satir"><span>Mevcut kontroller</span>
                  <span style={{ fontSize: 'var(--fs-sm)' }}>{secili.mevcutKontroller}</span></div>
              )}
            </div>

            <div>
              <span className="mikro-etiket">Olasılık ve etki boyutları</span>
              <div className="filtreler" style={{ marginTop: 'var(--sp-2)' }}>
                <span className="chip">Olasılık <strong>{secili.olasilik ?? '—'}</strong></span>
                {ETKI_BOYUTLARI.map(([a, e]) => {
                  const deger = secili.etkiler[a];
                  return (
                    <span key={a} className="chip"
                      style={deger === null ? { opacity: .5 } : undefined}>
                      {e} <strong>{deger ?? '—'}</strong>
                    </span>
                  );
                })}
              </div>
            </div>

            {(secili.bulgu || secili.varliklar.length > 0 || secili.kontroller.length > 0
              || secili.projeler.length > 0) && (
              <div>
                <span className="mikro-etiket">Bağlantılar</span>
                <div className="filtreler" style={{ marginTop: 'var(--sp-2)' }}>
                  {secili.bulgu && (
                    <Link className="chip" href={`/bulgular/${secili.bulgu.id}`}
                      title={secili.bulgu.baslik}>⚑ Bulgu: {secili.bulgu.baslik.slice(0, 48)}
                      {secili.bulgu.baslik.length > 48 && '…'}</Link>
                  )}
                  {secili.varliklar.map((v) => (
                    <Link key={v.id} className="chip mono" href="/envanter" title={v.ad}>▣ {v.etiket}</Link>
                  ))}
                  {secili.kontroller.map((c) => (
                    <span key={c.id} className="chip mono" title={c.baslik}>§ {c.kod}</span>
                  ))}
                  {secili.projeler.map((p) => (
                    <Link key={p.id} className="chip mono" href="/projeler" title={p.ad}>▸ {p.kod}</Link>
                  ))}
                </div>
              </div>
            )}

            {secili.durum === 'kabul_edildi' && (
              <div className="filtreler" style={{ fontSize: 'var(--fs-sm)' }}>
                <span className="mikro-etiket">Kabul</span>
                {secili.onaylayan && <span className="chip">Onaylayan: {secili.onaylayan.ad}</span>}
                {secili.islemTarihi && <span className="chip">Karar: {tarihTR(secili.islemTarihi)}</span>}
                <span className={`pill durum-${kabulDoldu(secili) ? 'uyumsuz' : 'kapsamdisi'}`}>
                  <span className="dot" />bitiş {tarihTR(secili.kabulBitis)}
                </span>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-4)' }}>
              <span className="mikro-etiket">İşlem</span>
              <div className="filtreler" style={{ marginTop: 'var(--sp-2)' }}>
                {RISK_ISLEMLERI.filter((i) => i !== 'kabul').map((i) => (
                  <button key={i} disabled={bekliyor}
                    className={`btn kucuk${secili.islemTipi === i ? ' birincil' : ''}`}
                    onClick={() => calistir(() => riskIslem({ id: secili.id, islemTipi: i }))}>
                    {RISK_ISLEM_ETIKET[i]}
                  </button>
                ))}
                <button className="btn kucuk" disabled={bekliyor}
                  onClick={() => {
                    setKabul({ bitis: '', gerekce: '',
                      min: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10) });
                    setKabulAcik(true);
                  }}>
                  {RISK_ISLEM_ETIKET.kabul}…
                </button>
                <span style={{ flex: 1 }} />
                <button className="btn kucuk" onClick={() => setDuzenle(true)}>✎ Düzenle</button>
              </div>
              {hata && <p className="pill durum-uyumsuz" role="alert"
                style={{ marginTop: 'var(--sp-2)' }}>{hata}</p>}
            </div>
          </div>
        ))}
      </Kip>

      {/* ------------------------------------------------ yeni risk kip'i */}
      <Kip acik={yeniAcik} kapat={() => setYeniAcik(false)} genis baslik="Yeni risk"
        ust={<span className="mikro-etiket">Önerilen kod: <span className="mono">{yeniKod}</span></span>}>
        {yeniAcik && (
          <RiskFormu risk={null} yeniKod={yeniKod} kullanicilar={kullanicilar}
            tesisler={tesisler} sistemler={sistemler} bulgular={bulgular}
            kapat={() => setYeniAcik(false)} />
        )}
      </Kip>

      {/* ------------------------------------------- risk kabul kip'i §13.2 */}
      <Kip acik={kabulAcik} kapat={() => setKabulAcik(false)} baslik="Riski kabul et"
        ust={secili && <span className="mikro-etiket mono">{secili.kod}</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
            Risk kabulü süreli ve onaylıdır: bitiş tarihi geldiğinde kabul geçersiz
            sayılır ve risk yeniden değerlendirilir. Onaylayan olarak siz kaydedilirsiniz.
          </p>
          <div className="form-izgara">
            <label className="form-satir">
              <span>Kabul bitiş tarihi (zorunlu)</span>
              <input className="inp" type="date" min={kabul.min} value={kabul.bitis}
                onChange={(e) => setKabul({ ...kabul, bitis: e.target.value })} />
            </label>
            <label className="form-satir" style={{ gridColumn: '1/-1' }}>
              <span>Gerekçe (zorunlu)</span>
              <textarea className="inp" rows={3} value={kabul.gerekce}
                placeholder="Bu risk neden kabul ediliyor?"
                onChange={(e) => setKabul({ ...kabul, gerekce: e.target.value })} />
            </label>
          </div>
          <div className="filtreler">
            {hata && <span className="pill durum-uyumsuz" role="alert">{hata}</span>}
            <span style={{ flex: 1 }} />
            <button className="btn" onClick={() => setKabulAcik(false)} disabled={bekliyor}>Vazgeç</button>
            <button className="btn birincil"
              disabled={bekliyor || !kabul.bitis || !kabul.gerekce.trim() || !secili}
              onClick={() => secili && calistir(
                () => riskKabul({ id: secili.id, kabulBitis: kabul.bitis, gerekce: kabul.gerekce }),
                () => setKabulAcik(false),
              )}>
              Kabul et
            </button>
          </div>
        </div>
      </Kip>
    </>
  );
}
