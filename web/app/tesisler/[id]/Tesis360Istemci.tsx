'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pill, SegBar, Bos, type DurumSayilari } from '@/components/ui';
import Kip from '@/components/Kip';
import { KapakSec } from '@/components/sahneler';
import { useEylem } from '@/components/useEylem';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { profilKaydet, kapsamYenidenHesapla, uygulanabilirlikOverride } from '@/lib/eylemler2/tesis360';
import {
  DURUM_ETIKET, ONEM_ETIKET, ONEM_DURUM_RENGI, BULGU_DURUM_ETIKET,
  RISK_DURUM_ETIKET, DENETIM_ASAMA_ETIKET, DENETIM_TIP_ETIKET,
  SUREC_DURUM_ETIKET, SUREC_DURUM_RENGI, VARLIK_SINIF_ETIKET,
  eolDurumu, riskSeviyeRengi, tarihTR, gecikmisMi,
  type Durum, type Onem, type SurecDurum,
} from '@/lib/sabitler';

/* ---- yerel sözlükler (yalnız bu ekranın alanları) ---- */
const KABUL_ETIKET: Record<string, string> = {
  gecici_kabul: 'Geçici kabul', kesin_kabul: 'Kesin kabul',
  insaat: 'İnşaat', lisans_oncesi: 'Lisans öncesi',
};
const OT_MIMARI_ETIKET: Record<string, string> = {
  dcs: 'DCS', scada: 'SCADA', plc_scada: 'PLC + SCADA', hibrit: 'Hibrit',
};
const MARUZIYET_ETIKET: Record<string, string> = { yok: 'Yok', sinirli: 'Sınırlı', var: 'Var' };
const KRITIKLIK_ETIKET: Record<string, string> = {
  dusuk: 'Düşük', orta: 'Orta', yuksek: 'Yüksek', kritik: 'Kritik', bilinmiyor: 'Bilinmiyor',
};
const ASAMA_RENK: Record<string, Durum> = {
  plan: 'incelemede', kapsam: 'incelemede', kanit_talebi: 'kismi', saha: 'kismi',
  bulgu: 'kismi', yanit: 'kismi', aksiyon: 'kismi', dogrulama: 'kismi', kapanis: 'uyumlu',
};
const EKSIK_TIP_ETIKET: Record<string, string> = {
  risk: 'Risk', uyumsuz: 'Uyumsuz', kismi: 'Kısmi', eos: 'EOS',
  bulgu: 'Bulgu', aksiyon: 'Geciken aksiyon', bayat: 'Bayat kanıt',
};
const ONEM_SIRA: Record<string, number> = { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 };

/* =====================================================================
   /tesisler kart listesi — sunucu sayfası serileştirir, burada filtre + dışa aktarım.
   ===================================================================== */

export type TesisKart = {
  id: string; kod: string; ad: string; durum: string;
  tipKod: string | null; tipAd: string | null; tuzelKisi: string | null;
  kuruluGucMw: number | null; konum: string | null; kritiklik: string | null;
  profilEksik: boolean; sayilar: DurumSayilari; acikBulgu: number; acikRisk: number;
};

export function TesisKartlari({ tesisler }: { tesisler: TesisKart[] }) {
  const [arama, setArama] = useState('');
  const [durumF, setDurumF] = useState('aktif');

  const gorunen = tesisler.filter((t) => {
    if (durumF !== 'hepsi' && t.durum !== durumF) return false;
    if (arama && !`${t.kod} ${t.ad} ${t.konum ?? ''} ${t.tuzelKisi ?? ''}`
      .toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    return true;
  });

  return (
    <>
      <div className="filtreler">
        <input className="inp" placeholder="Tesis ara…" value={arama}
          onChange={(e) => setArama(e.target.value)} style={{ minWidth: 200 }} />
        <select className="sec" value={durumF} onChange={(e) => setDurumF(e.target.value)}>
          <option value="aktif">Aktif tesisler</option>
          <option value="kapali">Kapalı tesisler</option>
          <option value="hepsi">Tümü</option>
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn yazdirmada-gizle" onClick={pdfYazdir}>🖨 PDF</button>
        <button className="btn yazdirmada-gizle" onClick={() => exceleAktar('tesisler', [{
          ad: 'Tesisler', satirlar: [
            ['Kod', 'Ad', 'Tip', 'Tüzel kişi', 'Durum', 'Kurulu güç (MW)', 'Kritiklik',
              'Profil', 'Açık bulgu', 'Açık risk'],
            ...gorunen.map((t) => [t.kod, t.ad, t.tipAd, t.tuzelKisi, t.durum, t.kuruluGucMw,
              t.kritiklik ? KRITIKLIK_ETIKET[t.kritiklik] ?? t.kritiklik : 'bilinmiyor',
              t.profilEksik ? 'eksik' : 'tam', t.acikBulgu, t.acikRisk]),
          ] }])}>⤓ Excel</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
        gap: 'var(--sp-5)' }}>
        {gorunen.map((t) => (
          <Link key={t.id} href={`/tesisler/${t.id}`} className="kart tikla belir gorunur"
            style={{ display: 'block', position: 'relative', overflow: 'hidden' }}>
            <span className="kapak kapak-dar" style={{ color: 'var(--text-2)' }}>
              <KapakSec tipKod={t.tipKod} />
            </span>
            <div className="kart-icerik" style={{ position: 'relative', display: 'flex',
              flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div className="mikro-etiket">
                {t.tipAd ?? t.tipKod ?? 'Tesis'}{t.konum ? ` · ${t.konum}` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-3)', minWidth: 0 }}>
                <span className="chip mono" style={{ flex: 'none' }}>{t.kod}</span>
                <span style={{ fontWeight: 600, fontSize: 'var(--fs-h3)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.ad}</span>
              </div>
              <div className="filtreler" style={{ gap: 'var(--sp-2)' }}>
                {t.tuzelKisi && <span className="chip">{t.tuzelKisi}</span>}
                {t.kritiklik && (
                  <Pill durum={(ONEM_DURUM_RENGI as Record<string, Durum>)[t.kritiklik] ?? 'degerlendirilmedi'}
                    etiket={KRITIKLIK_ETIKET[t.kritiklik] ?? t.kritiklik}
                    hollow={t.kritiklik === 'yuksek'} />
                )}
                {t.profilEksik && <Pill durum="kismi" etiket="Profil eksik" />}
                {t.durum === 'kapali' && <Pill durum="kapsamdisi" etiket="Kapalı" />}
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-6)' }}>
                <div>
                  <div className="mikro-etiket">Güç</div>
                  <div className="metrik-buyuk" style={{ fontSize: '1.35rem' }}>
                    {t.kuruluGucMw != null
                      ? <>{t.kuruluGucMw.toLocaleString('tr-TR')}<span style={{ fontSize: '.6em',
                          color: 'var(--text-2)' }}> MW</span></>
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="mikro-etiket">Açık bulgu</div>
                  <div className="metrik-buyuk" style={{ fontSize: '1.35rem',
                    color: t.acikBulgu > 0 ? 'var(--uyumsuz-fg)' : undefined }}>{t.acikBulgu}</div>
                </div>
                <div>
                  <div className="mikro-etiket">Açık risk</div>
                  <div className="metrik-buyuk" style={{ fontSize: '1.35rem',
                    color: t.acikRisk > 0 ? 'var(--kismi-fg)' : undefined }}>{t.acikRisk}</div>
                </div>
              </div>
              <SegBar sayilar={t.sayilar} />
            </div>
          </Link>
        ))}
      </div>
      {gorunen.length === 0 && <Bos baslik="Eşleşen tesis yok"
        altMetin="Tesisler Tanımlar panelinden eklenir." />}
    </>
  );
}

/* =====================================================================
   Santral 360 — tesis detay merkezi ekranı (hedef doküman §6, §64).
   ===================================================================== */

type Profil = {
  lisansTipi: string | null; lisansNo: string | null; kabulDurumu: string | null;
  kabulTarihi: string | null; blackStart: boolean | null; teiasScadaEms: boolean | null;
  seriHaberlesme: boolean | null; kritiklikSinifi: string | null;
  kritikAltyapiStatusu: boolean | null; internetMaruziyeti: string | null;
  uzaktanErisim: boolean | null; otMimariTipi: string | null; dcsSaglayici: string | null;
  scadaSaglayici: string | null; plcAileleri: string | null; iotVar: boolean | null;
  akilliSayacVar: boolean | null; yerelAdVar: boolean | null;
  yerelVeriMerkeziVar: boolean | null; grupOrtakServisler: string | null;
};

type Karar = {
  id: string; regId: string; regKod: string; regAd: string; uygulanabilir: boolean;
  gerekce: string; degistirmeGerekcesi: string | null; kuralAd: string | null;
  kuralSurumu: number | null; hesaplandi: string; elIle: boolean; onaylayan: string | null;
};

type Veri = {
  id: string; kod: string; ad: string; durum: string;
  tipKod: string | null; tipAd: string | null; tuzelKisi: string | null;
  kuruluGucMw: number | null; konum: string | null; devreyeGiris: string | null;
  profil: Profil | null;
  kararlar: Karar[];
  regulasyonlar: { id: string; kod: string; ad: string }[];
  eksikMaddeler: { id: string; durum: string; kanitBayat: boolean; maddeKod: string;
    maddeBaslik: string; surecId: string; surecKod: string; regKod: string }[];
  bulgular: { id: string; baslik: string; onem: string; durum: string; hedef: string | null;
    sorumlu: string | null; maddeKod: string }[];
  gecikenAksiyonlar: { id: string; baslik: string; bulguId: string; bulguBaslik: string;
    hedef: string | null; sorumlu: string | null }[];
  varliklar: { id: string; etiket: string; ad: string; sinif: string; turAd: string;
    kritiklik: string; eos: string | null; isletimSistemi: string | null }[];
  riskler: { id: string; kod: string; baslik: string; durum: string; artikRisk: number | null;
    sahip: string | null }[];
  denetimler: { id: string; kod: string; ad: string; tip: string; durum: string;
    planBaslangic: string | null; planBitis: string | null }[];
  surecler: { id: string; kod: string; ad: string; durum: string; regKod: string;
    bitis: string | null }[];
};

type EksikSatir = {
  anahtar: string; tip: string; agirlik: number; ikincil: number;
  serit: Durum; baslik: string; detay: string; href: string;
};

/* profil → form (boş metin / '' seçenek = bilinmiyor) */
function profilFormdan(p: Profil | null) {
  const b = (v: boolean | null | undefined) => (v === true ? 'evet' : v === false ? 'hayir' : '');
  return {
    lisansTipi: p?.lisansTipi ?? '', lisansNo: p?.lisansNo ?? '',
    kabulDurumu: p?.kabulDurumu ?? '',
    kabulTarihi: p?.kabulTarihi ? p.kabulTarihi.slice(0, 10) : '',
    blackStart: b(p?.blackStart), teiasScadaEms: b(p?.teiasScadaEms),
    seriHaberlesme: b(p?.seriHaberlesme), kritiklikSinifi: p?.kritiklikSinifi ?? '',
    kritikAltyapiStatusu: b(p?.kritikAltyapiStatusu),
    internetMaruziyeti: p?.internetMaruziyeti ?? '', uzaktanErisim: b(p?.uzaktanErisim),
    otMimariTipi: p?.otMimariTipi ?? '', dcsSaglayici: p?.dcsSaglayici ?? '',
    scadaSaglayici: p?.scadaSaglayici ?? '', plcAileleri: p?.plcAileleri ?? '',
    iotVar: b(p?.iotVar), akilliSayacVar: b(p?.akilliSayacVar),
    yerelAdVar: b(p?.yerelAdVar), yerelVeriMerkeziVar: b(p?.yerelVeriMerkeziVar),
    grupOrtakServisler: p?.grupOrtakServisler ?? '',
  };
}
type ProfilFormu = ReturnType<typeof profilFormdan>;
const formBool = (v: string) => (v === 'evet' ? true : v === 'hayir' ? false : null);

/** Profil kartındaki tek alan: değer yoksa "Bilinmiyor" soluk yazılır. */
function Alan({ etiket, deger }: { etiket: string; deger: string | null }) {
  return (
    <div>
      <div className="mikro-etiket">{etiket}</div>
      <div style={{ marginTop: 2, fontSize: 'var(--fs-sm)',
        color: deger === null ? 'var(--text-3)' : undefined,
        fontStyle: deger === null ? 'italic' : undefined }}>
        {deger ?? 'Bilinmiyor'}
      </div>
    </div>
  );
}

const evetHayir = (v: boolean | null) => (v === null ? null : v ? 'Evet' : 'Hayır');

export default function Tesis360Istemci({ veri }: { veri: Veri }) {
  const { bekliyor, hata, calistir } = useEylem();

  const [profilAcik, setProfilAcik] = useState(false);
  const [pf, setPf] = useState<ProfilFormu>(() => profilFormdan(veri.profil));
  const [ovAcik, setOvAcik] = useState(false);
  const [ov, setOv] = useState({ regulasyonId: '', uygulanabilir: 'kapsamda', gerekce: '' });
  const [eksikF, setEksikF] = useState('hepsi');

  const p = veri.profil;

  /* ---- üst band metrikleri ---- */
  const uygulanabilirSayisi = veri.kararlar.filter((k) => k.uygulanabilir).length;
  const overrideSayisi = veri.kararlar.filter((k) => k.elIle).length;
  const eosVarliklar = veri.varliklar.filter((v) => eolDurumu(v.eos).etiket === 'Destek bitti');
  const kritikBulgu = veri.bulgular.filter((b) => b.onem === 'kritik').length;
  const kritikRisk = veri.riskler.filter((r) => (r.artikRisk ?? 0) >= 15).length;

  /* ---- profil eksik alan sayısı ---- */
  const profilBosSayisi = p
    ? (Object.values(p) as (string | boolean | null)[]).filter((v) => v === null).length
    : null;

  /* ---- EKSİKLER birleşik listesi (§64): kritik risk > uyumsuz > EOS > bulgu > bayat ---- */
  const eksikler = useMemo(() => {
    const liste: EksikSatir[] = [];
    for (const r of veri.riskler) {
      const kritik = (r.artikRisk ?? 0) >= 15;
      liste.push({
        anahtar: `risk-${r.id}`, tip: 'risk', agirlik: kritik ? 0 : 35,
        ikincil: -(r.artikRisk ?? 0), serit: riskSeviyeRengi(r.artikRisk), baslik: r.baslik,
        detay: `${r.kod} · artık risk ${r.artikRisk ?? 'bilinmiyor'} · ${
          RISK_DURUM_ETIKET[r.durum as keyof typeof RISK_DURUM_ETIKET] ?? r.durum}${
          r.sahip ? ` · ${r.sahip}` : ''}`,
        href: '/riskler',
      });
    }
    for (const m of veri.eksikMaddeler) {
      if (m.durum === 'uyumsuz' || m.durum === 'kismi') {
        liste.push({
          anahtar: `md-${m.id}`, tip: m.durum, agirlik: m.durum === 'uyumsuz' ? 10 : 45,
          ikincil: 0, serit: m.durum as Durum,
          baslik: `${m.maddeKod} — ${m.maddeBaslik}`,
          detay: `${m.regKod} · ${m.surecKod} · ${
            DURUM_ETIKET[m.durum as Durum]}${m.kanitBayat ? ' · kanıt bayat' : ''}`,
          href: `/surecler/${m.surecId}`,
        });
      } else if (m.kanitBayat) {
        liste.push({
          anahtar: `bk-${m.id}`, tip: 'bayat', agirlik: 50, ikincil: 0, serit: 'kismi',
          baslik: `${m.maddeKod} — ${m.maddeBaslik}`,
          detay: `${m.regKod} · ${m.surecKod} · kanıt tazeliği yitirilmiş`,
          href: `/surecler/${m.surecId}`,
        });
      }
    }
    for (const v of eosVarliklar) {
      liste.push({
        anahtar: `eos-${v.id}`, tip: 'eos', agirlik: 20, ikincil: 0, serit: 'uyumsuz',
        baslik: `${v.etiket} — ${v.ad}`,
        detay: `${v.turAd} · destek bitişi ${tarihTR(v.eos)} · kritiklik ${
          KRITIKLIK_ETIKET[v.kritiklik] ?? v.kritiklik}`,
        href: '/envanter',
      });
    }
    for (const b of veri.bulgular) {
      liste.push({
        anahtar: `bulgu-${b.id}`, tip: 'bulgu', agirlik: 30, ikincil: ONEM_SIRA[b.onem] ?? 9,
        serit: ONEM_DURUM_RENGI[b.onem as Onem] ?? 'kismi', baslik: b.baslik,
        detay: `${b.maddeKod} · ${ONEM_ETIKET[b.onem as Onem] ?? b.onem} · ${
          BULGU_DURUM_ETIKET[b.durum as keyof typeof BULGU_DURUM_ETIKET] ?? b.durum}${
          b.hedef ? ` · hedef ${tarihTR(b.hedef)}${gecikmisMi(b.hedef, b.durum) ? ' ⚠' : ''}` : ''}${
          b.sorumlu ? ` · ${b.sorumlu}` : ''}`,
        href: `/bulgular/${b.id}`,
      });
    }
    for (const a of veri.gecikenAksiyonlar) {
      liste.push({
        anahtar: `aks-${a.id}`, tip: 'aksiyon', agirlik: 40, ikincil: 0, serit: 'uyumsuz',
        baslik: a.baslik,
        detay: `bulgu: ${a.bulguBaslik} · hedef ${tarihTR(a.hedef)} geçti${
          a.sorumlu ? ` · ${a.sorumlu}` : ''}`,
        href: `/bulgular/${a.bulguId}`,
      });
    }
    return liste.sort((x, y) => x.agirlik - y.agirlik || x.ikincil - y.ikincil);
  }, [veri, eosVarliklar]);

  const gorunenEksikler = eksikF === 'hepsi' ? eksikler : eksikler.filter((e) => e.tip === eksikF);

  /* ---- varlık özeti ---- */
  const sinifSayilari = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of veri.varliklar) m.set(v.sinif, (m.get(v.sinif) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [veri.varliklar]);
  const enCokSinif = Math.max(1, ...sinifSayilari.map(([, n]) => n));
  const kritikVarliklar = veri.varliklar
    .filter((v) => v.kritiklik === 'kritik' || v.kritiklik === 'yuksek')
    .sort((a, b) => (a.kritiklik === b.kritiklik ? 0 : a.kritiklik === 'kritik' ? -1 : 1))
    .slice(0, 8);

  /* ---- eylem sarmalayıcıları ---- */
  const profilGonder = () => calistir(() => profilKaydet({
    tesisId: veri.id,
    lisansTipi: pf.lisansTipi.trim() || null,
    lisansNo: pf.lisansNo.trim() || null,
    kabulDurumu: (pf.kabulDurumu || null) as 'gecici_kabul' | 'kesin_kabul' | 'insaat' | 'lisans_oncesi' | null,
    kabulTarihi: pf.kabulTarihi || null,
    blackStart: formBool(pf.blackStart),
    teiasScadaEms: formBool(pf.teiasScadaEms),
    seriHaberlesme: formBool(pf.seriHaberlesme),
    kritiklikSinifi: (pf.kritiklikSinifi || null) as 'dusuk' | 'orta' | 'yuksek' | 'kritik' | null,
    kritikAltyapiStatusu: formBool(pf.kritikAltyapiStatusu),
    internetMaruziyeti: (pf.internetMaruziyeti || null) as 'yok' | 'sinirli' | 'var' | null,
    uzaktanErisim: formBool(pf.uzaktanErisim),
    otMimariTipi: (pf.otMimariTipi || null) as 'dcs' | 'scada' | 'plc_scada' | 'hibrit' | null,
    dcsSaglayici: pf.dcsSaglayici.trim() || null,
    scadaSaglayici: pf.scadaSaglayici.trim() || null,
    plcAileleri: pf.plcAileleri.trim() || null,
    iotVar: formBool(pf.iotVar),
    akilliSayacVar: formBool(pf.akilliSayacVar),
    yerelAdVar: formBool(pf.yerelAdVar),
    yerelVeriMerkeziVar: formBool(pf.yerelVeriMerkeziVar),
    grupOrtakServisler: pf.grupOrtakServisler.trim() || null,
  }), () => setProfilAcik(false));

  const overrideAc = (regId: string, mevcutKapsamda?: boolean) => {
    setOv({ regulasyonId: regId,
      uygulanabilir: mevcutKapsamda === true ? 'kapsam_disi' : 'kapsamda', gerekce: '' });
    setOvAcik(true);
  };
  const overrideGonder = () => calistir(() => uygulanabilirlikOverride({
    tesisId: veri.id, regulasyonId: ov.regulasyonId,
    uygulanabilir: ov.uygulanabilir === 'kapsamda', gerekce: ov.gerekce.trim(),
  }), () => setOvAcik(false));

  const ucSecim = (etiket: string, alan: keyof ProfilFormu) => (
    <label className="form-satir" key={alan}>
      <span>{etiket}</span>
      <select className="sec" value={pf[alan]}
        onChange={(e) => setPf({ ...pf, [alan]: e.target.value })}>
        <option value="">Bilinmiyor</option>
        <option value="evet">Evet</option>
        <option value="hayir">Hayır</option>
      </select>
    </label>
  );

  return (
    <>
      {/* ============ üst band ============ */}
      <div className="belir gorunur">
        <div className="mikro-etiket">
          SANTRAL 360 · <span className="vurgu">{veri.kod}</span>
          {veri.tuzelKisi && ` · ${veri.tuzelKisi.toLocaleUpperCase('tr-TR')}`}
        </div>
        <div className="kart" style={{ marginTop: 'var(--sp-3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: '0 0 0 auto', width: 'min(46%, 560px)',
            color: 'var(--text-2)', opacity: .34, pointerEvents: 'none',
            maskImage: 'linear-gradient(90deg, transparent, #000 32%)' }}>
            <KapakSec tipKod={veri.tipKod} />
          </div>
          <div className="kart-baslik" style={{ position: 'relative' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="mikro-etiket">
                {veri.tipAd ?? 'Tesis'}{veri.konum && ` · ${veri.konum}`}
                {veri.devreyeGiris && ` · devrede ${tarihTR(veri.devreyeGiris)}`}
              </span>
              <h1 style={{ marginTop: 4, fontSize: 'var(--fs-h2)' }}>{veri.ad}</h1>
            </div>
            {veri.durum === 'kapali' && <Pill durum="kapsamdisi" etiket="Kapalı tesis" />}
            {p?.kritikAltyapiStatusu === true && <Pill durum="uyumsuz" etiket="Kritik altyapı" hollow />}
          </div>
          <div className="band" style={{ position: 'relative',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <div className="band-hucre">
              <span className="mikro-etiket">Kurulu güç</span>
              <span className="metrik-dev">
                {veri.kuruluGucMw != null
                  ? <><span data-sayac={veri.kuruluGucMw}
                      data-ondalik={Number.isInteger(veri.kuruluGucMw) ? undefined : 1}>0</span>
                      <span className="birim"> MW</span></>
                  : '—'}
              </span>
            </div>
            <div className="band-hucre">
              <span className="mikro-etiket">Kritiklik sınıfı</span>
              <span className="metrik-buyuk" style={{ fontSize: 'clamp(1.4rem,2vw,1.9rem)' }}>
                {p?.kritiklikSinifi ? KRITIKLIK_ETIKET[p.kritiklikSinifi] ?? p.kritiklikSinifi : '—'}
              </span>
              {!p?.kritiklikSinifi && <span className="mikro-etiket">profilde tanımsız</span>}
            </div>
            <div className="band-hucre">
              <span className="mikro-etiket">Uygulanabilir regülasyon</span>
              <span className="metrik-dev"><span data-sayac={uygulanabilirSayisi}>0</span></span>
              <span className="mikro-etiket">
                {veri.kararlar.length} karar{overrideSayisi > 0 && ` · ${overrideSayisi} el ile`}
              </span>
            </div>
            <div className="band-hucre">
              <span className="mikro-etiket">Açık bulgu</span>
              <span className="metrik-dev"><span data-sayac={veri.bulgular.length}>0</span></span>
              <span>{kritikBulgu > 0
                ? <Pill durum="uyumsuz" etiket={`${kritikBulgu} kritik`} />
                : <Pill durum="uyumlu" etiket="Kritik yok" />}</span>
            </div>
            <div className="band-hucre">
              <span className="mikro-etiket">Açık risk</span>
              <span className="metrik-dev"><span data-sayac={veri.riskler.length}>0</span></span>
              <span>{kritikRisk > 0
                ? <Pill durum="uyumsuz" etiket={`${kritikRisk} yüksek artık risk`} />
                : <Pill durum="uyumlu" etiket="Yüksek risk yok" />}</span>
            </div>
            <div className="band-hucre">
              <span className="mikro-etiket">EOS varlık</span>
              <span className="metrik-dev"><span data-sayac={eosVarliklar.length}>0</span></span>
              <span>{eosVarliklar.length > 0
                ? <Pill durum="uyumsuz" etiket="Destek bitti" />
                : <Pill durum="uyumlu" etiket="Destekte" />}</span>
            </div>
          </div>
        </div>
      </div>

      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      {/* ============ 01 profil + 02 uygulanabilirlik ============ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))',
        gap: 'var(--sp-6)' }}>
        <section className="belir gorunur">
          <div className="sahne-baslik">
            <span className="no">01</span><h2>Santral profili</h2><span className="cizgi" />
            {p
              ? (profilBosSayisi
                ? <Pill durum="kismi" etiket={`${profilBosSayisi} alan bilinmiyor`} />
                : <Pill durum="uyumlu" etiket="Profil tam" />)
              : <Pill durum="uyumsuz" etiket="Profil yok" />}
            <button className="btn kucuk"
              onClick={() => { setPf(profilFormdan(veri.profil)); setProfilAcik(true); }}>
              Düzenle
            </button>
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="kart-icerik">
              {p ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
                  <div className="form-izgara">
                    <Alan etiket="Lisans" deger={p.lisansTipi
                      ? `${p.lisansTipi}${p.lisansNo ? ` · ${p.lisansNo}` : ''}` : null} />
                    <Alan etiket="Kabul" deger={p.kabulDurumu
                      ? `${KABUL_ETIKET[p.kabulDurumu] ?? p.kabulDurumu}${
                        p.kabulTarihi ? ` · ${tarihTR(p.kabulTarihi)}` : ''}` : null} />
                    <Alan etiket="Black-Start" deger={evetHayir(p.blackStart)} />
                    <Alan etiket="TEİAŞ SCADA/EMS" deger={evetHayir(p.teiasScadaEms)} />
                    <Alan etiket="Seri haberleşme" deger={evetHayir(p.seriHaberlesme)} />
                    <Alan etiket="Kritiklik sınıfı" deger={p.kritiklikSinifi
                      ? KRITIKLIK_ETIKET[p.kritiklikSinifi] ?? p.kritiklikSinifi : null} />
                    <Alan etiket="Kritik altyapı" deger={evetHayir(p.kritikAltyapiStatusu)} />
                    <Alan etiket="İnternet maruziyeti" deger={p.internetMaruziyeti
                      ? MARUZIYET_ETIKET[p.internetMaruziyeti] ?? p.internetMaruziyeti : null} />
                    <Alan etiket="Uzaktan erişim" deger={evetHayir(p.uzaktanErisim)} />
                    <Alan etiket="OT mimarisi" deger={p.otMimariTipi
                      ? OT_MIMARI_ETIKET[p.otMimariTipi] ?? p.otMimariTipi : null} />
                    <Alan etiket="DCS sağlayıcı" deger={p.dcsSaglayici} />
                    <Alan etiket="SCADA sağlayıcı" deger={p.scadaSaglayici} />
                    <Alan etiket="PLC aileleri" deger={p.plcAileleri} />
                    <Alan etiket="IoT / akıllı sayaç" deger={
                      p.iotVar === null && p.akilliSayacVar === null ? null
                        : `IoT: ${evetHayir(p.iotVar) ?? '?'} · Sayaç: ${evetHayir(p.akilliSayacVar) ?? '?'}`} />
                    <Alan etiket="Yerel AD / veri merkezi" deger={
                      p.yerelAdVar === null && p.yerelVeriMerkeziVar === null ? null
                        : `AD: ${evetHayir(p.yerelAdVar) ?? '?'} · VM: ${evetHayir(p.yerelVeriMerkeziVar) ?? '?'}`} />
                  </div>
                  <div>
                    <div className="mikro-etiket">Grup ortak servisleri</div>
                    <div className="filtreler" style={{ marginTop: 4, gap: 'var(--sp-2)' }}>
                      {p.grupOrtakServisler
                        ? p.grupOrtakServisler.split(';').filter(Boolean).map((s) => (
                          <span key={s} className="chip mono">{s.trim()}</span>))
                        : <span style={{ color: 'var(--text-3)', fontStyle: 'italic',
                            fontSize: 'var(--fs-sm)' }}>Bilinmiyor</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <Bos baslik="Profil henüz doldurulmadı"
                  altMetin="Uygulanabilirlik motoru profilsiz karar veremez — 'Düzenle' ile başlayın." />
              )}
            </div>
          </div>
        </section>

        <section className="belir gorunur">
          <div className="sahne-baslik">
            <span className="no">02</span><h2>Uygulanabilirlik</h2><span className="cizgi" />
            <button className="btn kucuk" disabled={bekliyor}
              onClick={() => calistir(() => kapsamYenidenHesapla({ tesisId: veri.id }))}>
              ⟳ Yeniden hesapla
            </button>
            <button className="btn kucuk" onClick={() => overrideAc('')}>Override</button>
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="kart-icerik sifir">
              {veri.kararlar.map((k) => (
                <div className="satir" key={k.id}>
                  <span className={`serit serit-${k.uygulanabilir ? 'uyumlu' : 'kapsamdisi'}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
                      flexWrap: 'wrap' }}>
                      <span className="chip mono">{k.regKod}</span>
                      <span style={{ fontWeight: 500 }}>{k.regAd}</span>
                      <Pill durum={k.uygulanabilir ? 'uyumlu' : 'kapsamdisi'}
                        etiket={k.uygulanabilir ? 'Kapsamda' : 'Kapsam dışı'} />
                      {k.elIle && <Pill durum="incelemede" hollow
                        etiket={`El ile${k.onaylayan ? ` · onay: ${k.onaylayan}` : ''}`} />}
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)', marginTop: 2 }}>
                      {k.elIle && k.degistirmeGerekcesi ? k.degistirmeGerekcesi : k.gerekce}
                    </div>
                    <div className="mikro-etiket sirada-gizli" style={{ letterSpacing: '.04em' }}>
                      {k.kuralAd ? `kural: ${k.kuralAd} · v${k.kuralSurumu ?? '—'}` : 'kural bağlantısız'}
                      {` · hesap ${tarihTR(k.hesaplandi)}`}
                    </div>
                  </div>
                  <button className="btn kucuk sirada-gizli"
                    onClick={() => overrideAc(k.regId, k.uygulanabilir)}>Değiştir</button>
                </div>
              ))}
              {veri.kararlar.length === 0 && (
                <Bos baslik="Kapsam kararı yok"
                  altMetin="Profili doldurup 'Yeniden hesapla' ile motoru çalıştırın." />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ============ 03 eksikler ============ */}
      <section className="belir gorunur">
        <div className="sahne-baslik">
          <span className="no">03</span><h2>Eksikler</h2><span className="cizgi" />
          <span className="chip mono">{gorunenEksikler.length}/{eksikler.length}</span>
          <select className="sec" value={eksikF} onChange={(e) => setEksikF(e.target.value)}>
            <option value="hepsi">Tüm tipler</option>
            {Object.entries(EKSIK_TIP_ETIKET).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button className="btn kucuk yazdirmada-gizle" onClick={pdfYazdir}>🖨 PDF</button>
          <button className="btn kucuk yazdirmada-gizle" onClick={() => exceleAktar(
            `eksikler-${veri.kod}`, [{ ad: 'Eksikler', satirlar: [
              ['Tip', 'Başlık', 'Detay'],
              ...gorunenEksikler.map((e) => [EKSIK_TIP_ETIKET[e.tip] ?? e.tip, e.baslik, e.detay]),
            ] }])}>⤓ Excel</button>
        </div>
        <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
          <div className="kart-icerik sifir">
            {gorunenEksikler.map((e) => (
              <div className="satir" key={e.anahtar}>
                <span className={`serit serit-${e.serit}`} />
                <span className="chip" style={{ flex: 'none', fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--fs-micro)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {EKSIK_TIP_ETIKET[e.tip] ?? e.tip}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={e.href} style={{ fontWeight: 500 }}>{e.baslik}</Link>
                  <div className="mikro-etiket sirada-gizli" style={{ letterSpacing: '.04em' }}>
                    {e.detay}
                  </div>
                </div>
                <span className="sirada-gizli" style={{ color: 'var(--text-3)' }}>→</span>
              </div>
            ))}
            {gorunenEksikler.length === 0 && (
              <Bos baslik="Eksik yok"
                altMetin="Bu tesiste açık risk, uyumsuzluk, EOS varlık veya bayat kanıt görünmüyor." />
            )}
          </div>
        </div>
      </section>

      {/* ============ 04 varlıklar + 05 denetimler & süreçler ============ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))',
        gap: 'var(--sp-6)' }}>
        <section className="belir gorunur">
          <div className="sahne-baslik">
            <span className="no">04</span><h2>Varlıklar</h2><span className="cizgi" />
            <span className="chip mono">{veri.varliklar.length}</span>
            <Link className="btn kucuk" href="/envanter">Envanter →</Link>
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            {sinifSayilari.length > 0 && (
              <div className="kart-icerik" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="mini-cubuklar">
                  {sinifSayilari.map(([sinif, n]) => (
                    <div className="mini-cubuk" key={sinif}>
                      <span className="etiket">{VARLIK_SINIF_ETIKET[sinif] ?? sinif}</span>
                      <span style={{ display: 'block', height: 8, borderRadius: 999,
                        background: 'var(--chart-grid)', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%',
                          width: `${(n / enCokSinif) * 100}%`, background: 'var(--accent)',
                          borderRadius: 999 }} />
                      </span>
                      <span className="sayi">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="tablo-sar">
              <table className="tablo">
                <thead><tr><th>Kritik varlık</th><th>Sınıf</th><th>Kritiklik</th><th>Destek (EOS)</th></tr></thead>
                <tbody>
                  {kritikVarliklar.map((v) => {
                    const eol = eolDurumu(v.eos);
                    return (
                      <tr key={v.id}>
                        <td style={{ maxWidth: 260 }}>
                          <span className="chip mono">{v.etiket}</span>{' '}
                          <span style={{ fontWeight: 500 }}>{v.ad}</span>
                          <div className="mikro-etiket sirada-gizli" style={{ letterSpacing: '.04em' }}>
                            {v.turAd}{v.isletimSistemi && ` · ${v.isletimSistemi}`}
                          </div>
                        </td>
                        <td><span className="chip">{VARLIK_SINIF_ETIKET[v.sinif] ?? v.sinif}</span></td>
                        <td><Pill durum={(ONEM_DURUM_RENGI as Record<string, Durum>)[v.kritiklik] ?? 'degerlendirilmedi'}
                          etiket={KRITIKLIK_ETIKET[v.kritiklik] ?? v.kritiklik}
                          hollow={v.kritiklik === 'yuksek'} /></td>
                        <td><Pill durum={eol.durum} etiket={eol.etiket} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {kritikVarliklar.length === 0 && (
                <Bos baslik="Kritik varlık işaretlenmemiş"
                  altMetin="Envanterde kritiklik alanı doldurulmamış olabilir." />
              )}
            </div>
          </div>
        </section>

        <section className="belir gorunur">
          <div className="sahne-baslik">
            <span className="no">05</span><h2>Denetimler ve süreçler</h2><span className="cizgi" />
            <Link className="btn kucuk" href="/denetimler">Denetimler →</Link>
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="kart-icerik sifir">
              {veri.denetimler.map((d) => (
                <div className="satir" key={d.id}>
                  <span className={`serit serit-${ASAMA_RENK[d.durum] ?? 'incelemede'}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="chip mono">{d.kod}</span>{' '}
                    <span style={{ fontWeight: 500 }}>{d.ad}</span>
                    <div className="mikro-etiket sirada-gizli" style={{ letterSpacing: '.04em' }}>
                      {DENETIM_TIP_ETIKET[d.tip] ?? d.tip}
                      {d.planBaslangic && ` · ${tarihTR(d.planBaslangic)}`}
                      {d.planBitis && ` – ${tarihTR(d.planBitis)}`}
                    </div>
                  </div>
                  <Pill durum={ASAMA_RENK[d.durum] ?? 'incelemede'}
                    etiket={DENETIM_ASAMA_ETIKET[d.durum as keyof typeof DENETIM_ASAMA_ETIKET] ?? d.durum} />
                </div>
              ))}
              {veri.denetimler.length === 0 && (
                <div className="satir" style={{ color: 'var(--text-3)', fontSize: 'var(--fs-sm)' }}>
                  Bu tesisi kapsayan denetim yok.
                </div>
              )}
              {veri.surecler.map((s) => (
                <div className="satir" key={s.id}>
                  <span className={`serit serit-${SUREC_DURUM_RENGI[s.durum as SurecDurum] ?? 'incelemede'}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/surecler/${s.id}`} className="chip mono">{s.kod}</Link>{' '}
                    <span style={{ fontWeight: 500 }}>{s.ad}</span>
                    <div className="mikro-etiket sirada-gizli" style={{ letterSpacing: '.04em' }}>
                      {s.regKod}{s.bitis && ` · bitiş ${tarihTR(s.bitis)}`}
                    </div>
                  </div>
                  <Pill durum={SUREC_DURUM_RENGI[s.durum as SurecDurum] ?? 'incelemede'}
                    etiket={SUREC_DURUM_ETIKET[s.durum as SurecDurum] ?? s.durum} />
                </div>
              ))}
              {veri.surecler.length === 0 && (
                <div className="satir" style={{ color: 'var(--text-3)', fontSize: 'var(--fs-sm)' }}>
                  Bu tesis hiçbir uyum sürecinin kapsamında değil.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ============ profil düzenleme kipi ============ */}
      <Kip acik={profilAcik} kapat={() => setProfilAcik(false)} baslik="Santral profili" genis
        ust={<span className="mikro-etiket">{veri.kod} · boş bırakılan alan = bilinmiyor</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <div className="form-izgara">
            <label className="form-satir"><span>Lisans tipi</span>
              <input className="inp" value={pf.lisansTipi} placeholder="uretim…"
                onChange={(e) => setPf({ ...pf, lisansTipi: e.target.value })} /></label>
            <label className="form-satir"><span>Lisans no</span>
              <input className="inp" value={pf.lisansNo}
                onChange={(e) => setPf({ ...pf, lisansNo: e.target.value })} /></label>
            <label className="form-satir"><span>Kabul durumu</span>
              <select className="sec" value={pf.kabulDurumu}
                onChange={(e) => setPf({ ...pf, kabulDurumu: e.target.value })}>
                <option value="">Bilinmiyor</option>
                {Object.entries(KABUL_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
            <label className="form-satir"><span>Kabul tarihi</span>
              <input className="inp" type="date" value={pf.kabulTarihi}
                onChange={(e) => setPf({ ...pf, kabulTarihi: e.target.value })} /></label>
            <label className="form-satir"><span>Kritiklik sınıfı</span>
              <select className="sec" value={pf.kritiklikSinifi}
                onChange={(e) => setPf({ ...pf, kritiklikSinifi: e.target.value })}>
                <option value="">Bilinmiyor</option>
                {(['dusuk', 'orta', 'yuksek', 'kritik'] as const).map((k) => (
                  <option key={k} value={k}>{KRITIKLIK_ETIKET[k]}</option>))}
              </select></label>
            <label className="form-satir"><span>İnternet maruziyeti</span>
              <select className="sec" value={pf.internetMaruziyeti}
                onChange={(e) => setPf({ ...pf, internetMaruziyeti: e.target.value })}>
                <option value="">Bilinmiyor</option>
                {Object.entries(MARUZIYET_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
            {ucSecim('Black-Start', 'blackStart')}
            {ucSecim('TEİAŞ SCADA/EMS', 'teiasScadaEms')}
            {ucSecim('Seri haberleşme', 'seriHaberlesme')}
            {ucSecim('Kritik altyapı statüsü', 'kritikAltyapiStatusu')}
            {ucSecim('Uzaktan erişim', 'uzaktanErisim')}
            <label className="form-satir"><span>OT mimari tipi</span>
              <select className="sec" value={pf.otMimariTipi}
                onChange={(e) => setPf({ ...pf, otMimariTipi: e.target.value })}>
                <option value="">Bilinmiyor</option>
                {Object.entries(OT_MIMARI_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
            <label className="form-satir"><span>DCS sağlayıcı</span>
              <input className="inp" value={pf.dcsSaglayici}
                onChange={(e) => setPf({ ...pf, dcsSaglayici: e.target.value })} /></label>
            <label className="form-satir"><span>SCADA sağlayıcı</span>
              <input className="inp" value={pf.scadaSaglayici}
                onChange={(e) => setPf({ ...pf, scadaSaglayici: e.target.value })} /></label>
            <label className="form-satir"><span>PLC aileleri</span>
              <input className="inp" value={pf.plcAileleri} placeholder="Siemens S7; ABB AC500…"
                onChange={(e) => setPf({ ...pf, plcAileleri: e.target.value })} /></label>
            {ucSecim('IoT var', 'iotVar')}
            {ucSecim('Akıllı sayaç', 'akilliSayacVar')}
            {ucSecim('Yerel AD', 'yerelAdVar')}
            {ucSecim('Yerel veri merkezi', 'yerelVeriMerkeziVar')}
            <label className="form-satir" style={{ gridColumn: '1/-1' }}>
              <span>Grup ortak servisleri (noktalı virgülle)</span>
              <input className="inp" value={pf.grupOrtakServisler} placeholder="merkezi_ad;soc;edr…"
                onChange={(e) => setPf({ ...pf, grupOrtakServisler: e.target.value })} /></label>
          </div>
          {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
          <div className="filtreler" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setProfilAcik(false)}>Vazgeç</button>
            <button className="btn birincil" disabled={bekliyor} onClick={profilGonder}>
              {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      </Kip>

      {/* ============ uygulanabilirlik override kipi ============ */}
      <Kip acik={ovAcik} kapat={() => setOvAcik(false)} baslik="Kapsam kararını el ile değiştir"
        ust={<span className="mikro-etiket">{veri.kod} · onay yetkisi ve gerekçe zorunlu</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
            El ile değiştirilen karar motor tarafından bir daha ezilmez; karar onaylayanla
            birlikte iz kaydına düşer.
          </p>
          <div className="form-izgara">
            <label className="form-satir"><span>Regülasyon</span>
              <select className="sec" value={ov.regulasyonId}
                onChange={(e) => setOv({ ...ov, regulasyonId: e.target.value })}>
                <option value="">Seçin…</option>
                {veri.regulasyonlar.map((r) => (
                  <option key={r.id} value={r.id}>{r.kod} — {r.ad}</option>))}
              </select></label>
            <label className="form-satir"><span>Karar</span>
              <select className="sec" value={ov.uygulanabilir}
                onChange={(e) => setOv({ ...ov, uygulanabilir: e.target.value })}>
                <option value="kapsamda">Kapsamda (uygulanabilir)</option>
                <option value="kapsam_disi">Kapsam dışı</option>
              </select></label>
          </div>
          <label className="form-satir"><span>Gerekçe (zorunlu)</span>
            <textarea className="inp" rows={3} value={ov.gerekce}
              placeholder="Bu karar neden el ile değiştiriliyor?"
              onChange={(e) => setOv({ ...ov, gerekce: e.target.value })} /></label>
          {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
          <div className="filtreler" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setOvAcik(false)}>Vazgeç</button>
            <button className="btn birincil" onClick={overrideGonder}
              disabled={bekliyor || !ov.regulasyonId || ov.gerekce.trim().length < 10}>
              {bekliyor ? 'Kaydediliyor…' : 'Onayla ve kaydet'}
            </button>
          </div>
        </div>
      </Kip>
    </>
  );
}
