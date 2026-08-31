'use client';
import { useMemo, useState } from 'react';
import { Bos } from '@/components/ui';
import { useEylem } from '@/components/useEylem';
import { eslestirmeEkle, eslestirmeSil } from '@/lib/eylemler';
import { DENKLIKLER, DENKLIK_ETIKET } from '@/lib/sabitler';

type M = { id: string; kod: string; baslik: string; regId: string };
type E = { id: string; denklik: string; aciklama: string | null; kaynak: M; hedef: M };

const DENKLIK_ISARET: Record<string, string> = { tam: '●', kismi: '◐', ilgili: '○' };

export default function EslestirmeIstemci({ regulasyonlar, maddeler, esler }: {
  regulasyonlar: { id: string; kod: string; ad: string }[];
  maddeler: M[]; esler: E[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [solReg, setSolReg] = useState(regulasyonlar[0]?.id ?? '');
  const [sagReg, setSagReg] = useState(regulasyonlar[1]?.id ?? '');
  const [yeni, setYeni] = useState({ kaynakId: '', hedefId: '', denklik: 'kismi', aciklama: '' });
  const [formAcik, setFormAcik] = useState(false);

  const solMaddeler = useMemo(() => maddeler.filter((m) => m.regId === solReg), [maddeler, solReg]);
  const sagMaddeler = useMemo(() => maddeler.filter((m) => m.regId === sagReg), [maddeler, sagReg]);

  // (sol, sağ) → eşleştirme
  const hucre = useMemo(() => {
    const h = new Map<string, E>();
    for (const e of esler) {
      h.set(`${e.kaynak.id}|${e.hedef.id}`, e);
      h.set(`${e.hedef.id}|${e.kaynak.id}`, e);
    }
    return h;
  }, [esler]);

  // matriste yalnızca eşleşmesi olan sağ kolonlar önde; boşlar sonda
  const sagSirali = useMemo(() => {
    const dolu = sagMaddeler.filter((s) => solMaddeler.some((m) => hucre.has(`${m.id}|${s.id}`)));
    const bos = sagMaddeler.filter((s) => !dolu.includes(s));
    return [...dolu, ...bos];
  }, [sagMaddeler, solMaddeler, hucre]);

  const iliskiler = esler.filter((e) =>
    (e.kaynak.regId === solReg && e.hedef.regId === sagReg) ||
    (e.kaynak.regId === sagReg && e.hedef.regId === solReg));

  return (
    <>
      <div className="kart">
        <div className="band">
          <div className="band-hucre">
            <span className="mikro-etiket">Toplam denklik</span>
            <span className="metrik-dev">{esler.length}</span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Seçili çift arasında</span>
            <span className="metrik-dev">{iliskiler.length}</span>
          </div>
          <div className="band-hucre" style={{ justifyContent: 'center' }}>
            <span className="mikro-etiket">Gösterim</span>
            <div className="filtreler">
              {DENKLIKLER.map((d) => (
                <span key={d} className={`pill denk-${d}`} style={{ border: '1px solid var(--border)' }}>
                  {DENKLIK_ISARET[d]} {DENKLIK_ETIKET[d]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="filtreler">
        <select className="sec" value={solReg} onChange={(e) => setSolReg(e.target.value)}>
          {regulasyonlar.map((r) => <option key={r.id} value={r.id}>{r.kod} (satırlar)</option>)}
        </select>
        <span className="mikro-etiket">×</span>
        <select className="sec" value={sagReg} onChange={(e) => setSagReg(e.target.value)}>
          {regulasyonlar.map((r) => <option key={r.id} value={r.id}>{r.kod} (kolonlar)</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn birincil" onClick={() => setFormAcik(!formAcik)}>+ Denklik ekle</button>
      </div>

      {formAcik && (
        <div className="kart">
          <div className="kart-icerik form-izgara">
            <label className="form-satir"><span>Kaynak madde</span>
              <select className="sec" value={yeni.kaynakId}
                onChange={(e) => setYeni({ ...yeni, kaynakId: e.target.value })}>
                <option value="">Seçin…</option>
                {maddeler.map((m) => <option key={m.id} value={m.id}>{m.kod} — {m.baslik.slice(0, 40)}</option>)}
              </select></label>
            <label className="form-satir"><span>Hedef madde</span>
              <select className="sec" value={yeni.hedefId}
                onChange={(e) => setYeni({ ...yeni, hedefId: e.target.value })}>
                <option value="">Seçin…</option>
                {maddeler.filter((m) => m.id !== yeni.kaynakId).map((m) =>
                  <option key={m.id} value={m.id}>{m.kod} — {m.baslik.slice(0, 40)}</option>)}
              </select></label>
            <label className="form-satir"><span>Denklik</span>
              <select className="sec" value={yeni.denklik}
                onChange={(e) => setYeni({ ...yeni, denklik: e.target.value })}>
                {DENKLIKLER.map((d) => <option key={d} value={d}>{DENKLIK_ETIKET[d]}</option>)}
              </select></label>
            <label className="form-satir"><span>Açıklama (isteğe bağlı)</span>
              <input className="inp" value={yeni.aciklama}
                onChange={(e) => setYeni({ ...yeni, aciklama: e.target.value })} /></label>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn birincil" disabled={bekliyor}
                onClick={() => calistir(() => eslestirmeEkle({
                  kaynakId: yeni.kaynakId, hedefId: yeni.hedefId,
                  denklik: yeni.denklik, aciklama: yeni.aciklama || null,
                }), () => { setFormAcik(false); setYeni({ kaynakId: '', hedefId: '', denklik: 'kismi', aciklama: '' }); })}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      <div className="kart">
        <div className="matris-sar">
          <table className="matris">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>
                  {regulasyonlar.find((r) => r.id === solReg)?.kod} ↓ ·{' '}
                  {regulasyonlar.find((r) => r.id === sagReg)?.kod} →
                </th>
                {sagSirali.map((s) => (
                  <th key={s.id} title={`${s.kod} — ${s.baslik}`}>
                    {s.kod.split('-').slice(-1)[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {solMaddeler.map((m) => (
                <tr key={m.id}>
                  <th title={m.baslik}>{m.kod}</th>
                  {sagSirali.map((s) => {
                    const e = hucre.get(`${m.id}|${s.id}`);
                    return (
                      <td key={s.id}>
                        {e ? (
                          <button className={`hucre denk-${e.denklik}`}
                            style={{ width: '100%', border: 'none', cursor: 'pointer', font: 'inherit' }}
                            title={`${e.kaynak.kod} ⇄ ${e.hedef.kod} · ${DENKLIK_ETIKET[e.denklik as keyof typeof DENKLIK_ETIKET]}${e.aciklama ? ` · ${e.aciklama}` : ''}\nKaldırmak için tıklayın`}
                            disabled={bekliyor}
                            onClick={() => {
                              if (confirm(`${e.kaynak.kod} ⇄ ${e.hedef.kod} denkliği kaldırılsın mı?`))
                                calistir(() => eslestirmeSil({ id: e.id }));
                            }}>
                            {DENKLIK_ISARET[e.denklik]}
                          </button>
                        ) : <span style={{ color: 'var(--text-3)', opacity: .3 }}>·</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {(solMaddeler.length === 0 || sagSirali.length === 0) && (
            <Bos baslik="Madde yok" altMetin="Seçili regülasyonlarda yaprak madde bulunmuyor." />
          )}
        </div>
      </div>

      <div className="kart">
        <div className="kart-baslik"><h3>Denklik listesi</h3>
          <span className="mikro-etiket">{iliskiler.length} kayıt · seçili çift</span></div>
        <div className="kart-icerik sifir">
          {iliskiler.map((e) => (
            <div key={e.id} className="satir">
              <span className={`pill denk-${e.denklik}`}>{DENKLIK_ISARET[e.denklik]}</span>
              <span className="chip mono">{e.kaynak.kod}</span>
              <span style={{ color: 'var(--text-3)' }}>⇄</span>
              <span className="chip mono">{e.hedef.kod}</span>
              <span style={{ flex: 1, color: 'var(--text-2)', fontSize: 'var(--fs-sm)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.aciklama ?? `${e.kaynak.baslik} ↔ ${e.hedef.baslik}`}
              </span>
              <button className="btn kucuk tehlike sirada-gizli" disabled={bekliyor}
                onClick={() => calistir(() => eslestirmeSil({ id: e.id }))}>Kaldır</button>
            </div>
          ))}
          {iliskiler.length === 0 && <Bos baslik="Bu çift arasında denklik yok" />}
        </div>
      </div>
    </>
  );
}
