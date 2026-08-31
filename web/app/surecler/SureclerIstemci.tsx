'use client';
import Link from 'next/link';
import { useState } from 'react';
import Kip from '@/components/Kip';
import { Pill, SegBar, Halka, Bos, type DurumSayilari } from '@/components/ui';
import { TipCizimi } from '@/components/cizimler';
import { useEylem } from '@/components/useEylem';
import { surecKaydet, surecDurumDegistir, surecKapsamEkle, surecKapsamCikar } from '@/lib/eylemler';
import { SUREC_DURUMLARI, SUREC_DURUM_ETIKET, SUREC_DURUM_RENGI,
  tarihTR, type SurecDurum } from '@/lib/sabitler';

type Surec = {
  id: string; kod: string; ad: string; durum: string;
  baslangic: string | null; bitis: string | null; aciklama: string | null;
  regulasyon: { id: string; kod: string; ad: string };
  tesisler: { id: string; kod: string; ad: string; tip: string | null }[];
  sayilar: DurumSayilari; yuzde: number | null; kayitSayisi: number;
};

export default function SureclerIstemci({ surecler, regulasyonlar, tesisler }: {
  surecler: Surec[];
  regulasyonlar: { id: string; kod: string; ad: string }[];
  tesisler: { id: string; kod: string; ad: string; tip: string | null }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [yeniAcik, setYeniAcik] = useState(false);
  const [kapsamSurec, setKapsamSurec] = useState<Surec | null>(null);
  const [filtre, setFiltre] = useState<string>('hepsi');

  const gorunen = surecler.filter((s) => filtre === 'hepsi' || s.durum === filtre);
  const kapsamGuncel = kapsamSurec ? surecler.find((s) => s.id === kapsamSurec.id) ?? null : null;

  return (
    <>
      <div className="filtreler">
        {(['hepsi', ...SUREC_DURUMLARI] as const).map((d) => (
          <button key={d} className={`btn kucuk${filtre === d ? ' birincil' : ''}`}
            onClick={() => setFiltre(d)}>
            {d === 'hepsi' ? 'Tümü' : SUREC_DURUM_ETIKET[d]}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="btn birincil" onClick={() => setYeniAcik(true)}>+ Yeni süreç</button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))' }}>
        {gorunen.map((s) => (
          <div key={s.id} className="kart tikla" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -4, bottom: -8, color: 'var(--text-3)',
              opacity: .13, pointerEvents: 'none' }}>
              <TipCizimi kod={s.tesisler[0]?.tip} boy={140} />
            </div>
            <div className="kart-baslik" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="mikro-etiket">{s.regulasyon.kod} · {s.kod}</span>
                <h3 style={{ marginTop: 2 }}>
                  <Link href={`/surecler/${s.id}`}>{s.ad}</Link>
                </h3>
              </div>
              <Pill durum={SUREC_DURUM_RENGI[s.durum as SurecDurum]}
                etiket={SUREC_DURUM_ETIKET[s.durum as SurecDurum]} />
            </div>
            <div className="kart-icerik" style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'center' }}>
              <Halka yuzde={s.yuzde} cap={72} kalinlik={7} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <SegBar sayilar={s.sayilar} />
                <div className="filtreler">
                  {s.tesisler.slice(0, 4).map((t) =>
                    <span key={t.id} className="chip mono" title={t.ad}>{t.kod}</span>)}
                  {s.tesisler.length > 4 && <span className="chip">+{s.tesisler.length - 4}</span>}
                  {s.tesisler.length === 0 && <span className="chip">kapsam boş</span>}
                </div>
                <span className="mikro-etiket">
                  {tarihTR(s.baslangic)} → {tarihTR(s.bitis)} · {s.kayitSayisi} kayıt
                </span>
              </div>
            </div>
            <div className="kart-icerik sirada-gizli" style={{
              paddingTop: 0, display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              <Link className="btn kucuk" href={`/surecler/${s.id}`}>Maddeler →</Link>
              <button className="btn kucuk" onClick={() => setKapsamSurec(s)}>Kapsam</button>
              {SUREC_DURUMLARI.filter((d) => d !== s.durum).map((d) => (
                <button key={d} className="btn kucuk" disabled={bekliyor}
                  onClick={() => calistir(() => surecDurumDegistir({ id: s.id, durum: d }))}>
                  {SUREC_DURUM_ETIKET[d]} yap
                </button>
              ))}
            </div>
          </div>
        ))}
        {gorunen.length === 0 && (
          <div className="kart"><Bos baslik="Süreç yok"
            altMetin="Bu filtrede uyum süreci bulunmuyor."
            eylem={<button className="btn birincil" onClick={() => setYeniAcik(true)}>+ Yeni süreç</button>} /></div>
        )}
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      <YeniSurecKipi acik={yeniAcik} kapat={() => setYeniAcik(false)} regulasyonlar={regulasyonlar} />

      <Kip acik={!!kapsamGuncel} kapat={() => setKapsamSurec(null)}
        baslik={`Kapsam — ${kapsamGuncel?.ad ?? ''}`}
        ust={<span className="mikro-etiket">Tesis ekleyin/çıkarın; eklenen tesise tüm yaprak maddeler açılır</span>}>
        {kapsamGuncel && <KapsamYonetimi surec={kapsamGuncel} tumTesisler={tesisler} />}
      </Kip>
    </>
  );
}

function YeniSurecKipi({ acik, kapat, regulasyonlar }: {
  acik: boolean; kapat: () => void;
  regulasyonlar: { id: string; kod: string; ad: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState({ kod: '', ad: '', regulasyonId: '', baslangic: '', bitis: '', aciklama: '' });

  return (
    <Kip acik={acik} kapat={kapat} baslik="Yeni uyum süreci"
      ust={<span className="mikro-etiket">Denetim dönemi tanımla</span>}>
      <div className="form-izgara">
        <label className="form-satir"><span>Regülasyon</span>
          <select className="sec" value={v.regulasyonId}
            onChange={(e) => setV({ ...v, regulasyonId: e.target.value })}>
            <option value="">Seçin…</option>
            {regulasyonlar.map((r) => <option key={r.id} value={r.id}>{r.kod} — {r.ad}</option>)}
          </select>
        </label>
        <label className="form-satir"><span>Kod</span>
          <input className="inp" value={v.kod} placeholder="EPDK-SYM-2027"
            onChange={(e) => setV({ ...v, kod: e.target.value })} />
        </label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Ad</span>
          <input className="inp" value={v.ad} placeholder="EPDK SYM 2027 Dönemi"
            onChange={(e) => setV({ ...v, ad: e.target.value })} />
        </label>
        <label className="form-satir"><span>Başlangıç</span>
          <input className="inp" type="date" value={v.baslangic}
            onChange={(e) => setV({ ...v, baslangic: e.target.value })} />
        </label>
        <label className="form-satir"><span>Bitiş (denetim tarihi)</span>
          <input className="inp" type="date" value={v.bitis}
            onChange={(e) => setV({ ...v, bitis: e.target.value })} />
        </label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Açıklama</span>
          <textarea className="inp" rows={2} value={v.aciklama}
            onChange={(e) => setV({ ...v, aciklama: e.target.value })} />
        </label>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert" style={{ marginTop: 'var(--sp-3)' }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={kapat}>Vazgeç</button>
        <button className="btn birincil" disabled={bekliyor}
          onClick={() => calistir(() => surecKaydet({
            kod: v.kod, ad: v.ad, regulasyonId: v.regulasyonId,
            baslangic: v.baslangic || null, bitis: v.bitis || null,
            aciklama: v.aciklama || null,
          }), kapat)}>
          {bekliyor ? 'Kaydediliyor…' : 'Süreci başlat'}
        </button>
      </div>
    </Kip>
  );
}

function KapsamYonetimi({ surec, tumTesisler }: {
  surec: { id: string; tesisler: { id: string; kod: string; ad: string; tip: string | null }[] };
  tumTesisler: { id: string; kod: string; ad: string; tip: string | null }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const kapsamda = new Set(surec.tesisler.map((t) => t.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {tumTesisler.map((t) => (
        <div key={t.id} className="satir" style={{ padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--r-md)' }}>
          <span style={{ color: 'var(--text-3)', display: 'inline-flex' }}>
            <TipCizimi kod={t.tip} boy={44} /></span>
          <span className="chip mono">{t.kod}</span>
          <span style={{ flex: 1 }}>{t.ad}</span>
          {kapsamda.has(t.id) ? (
            <button className="btn kucuk tehlike" disabled={bekliyor}
              onClick={() => calistir(() => surecKapsamCikar({ surecId: surec.id, tesisId: t.id }))}>
              Kapsamdan çıkar
            </button>
          ) : (
            <button className="btn kucuk" disabled={bekliyor}
              onClick={() => calistir(() => surecKapsamEkle({ surecId: surec.id, tesisId: t.id }))}>
              + Kapsama al
            </button>
          )}
        </div>
      ))}
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
    </div>
  );
}
