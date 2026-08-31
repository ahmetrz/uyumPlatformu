'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Pill, Bos } from '@/components/ui';
import { TesisKapagi } from '@/components/Fotograf';
import { useEylem } from '@/components/useEylem';
import { bulguGuncelle, aksiyonEkle, aksiyonDurumDegistir } from '@/lib/eylemler';
import {
  ONEM_DERECELERI, ONEM_ETIKET, ONEM_DURUM_RENGI, BULGU_DURUMLARI, BULGU_DURUM_ETIKET,
  BULGU_DURUM_RENGI, AKSIYON_ETIKET, AKSIYON_DURUM_RENGI, AKSIYON_DURUMLARI,
  etiketle, eylemCumlesi, tarihTR, zamanTR, kanitTazelik, gecikmisMi,
  type Onem, type BulguDurum,
} from '@/lib/sabitler';

type Veri = {
  id: string; baslik: string; aciklama: string; onem: string; durum: string;
  kaynak: string | null; tespit: string; hedef: string | null; kapanma: string | null;
  sorumlu: { id: string; ad: string } | null;
  madde: { kod: string; baslik: string; metin: string };
  tesis: { kod: string; ad: string; tip: string | null };
  surec: { id: string; kod: string; regKod: string };
  aksiyonlar: { id: string; baslik: string; durum: string; sorumlu: string | null;
    hedef: string | null; tamamlanma: string | null }[];
  projeler: { id: string; kod: string; ad: string }[];
  kanitlar: { id: string; ad: string; tip: string; baslangic: string }[];
  aktiviteler: { id: string; aktor: string; eylem: string; alan: string | null;
    once: string | null; sonra: string | null; dosya: string | null;
    zaman: string; varlikTipi: string }[];
  kullanicilar: { id: string; ad: string }[];
};

export default function BulguDetayIstemci({ veri }: { veri: Veri }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [yeniAksiyon, setYeniAksiyon] = useState({ baslik: '', sorumluId: '', hedef: '' });
  const [aksiyonFormu, setAksiyonFormu] = useState(false);

  const gecikti = gecikmisMi(veri.hedef, veri.durum);

  return (
    <>
      <div className="kapsam-cubugu">
        ⛨ <strong>{veri.surec.regKod}</strong> · {veri.surec.kod} ·{' '}
        <span className="mono">{veri.madde.kod}</span> · {veri.tesis.kod}
      </div>

      <div className="kart belir gorunur" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <TesisKapagi tipKod={veri.tesis.tip} genis />
        </div>
        <div className="kart-baslik">
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="mikro-etiket">{etiketle(veri.kaynak, 'Bulgu')} ·
              tespit {tarihTR(veri.tespit)}</span>
            <h1 style={{ marginTop: 4, fontSize: 'var(--fs-h2)' }}>{veri.baslik}</h1>
          </div>
          <Pill durum={ONEM_DURUM_RENGI[veri.onem as Onem]}
            etiket={ONEM_ETIKET[veri.onem as Onem]} hollow={veri.onem === 'yuksek'} />
          <Pill durum={BULGU_DURUM_RENGI[veri.durum as BulguDurum]}
            etiket={BULGU_DURUM_ETIKET[veri.durum as BulguDurum]} />
        </div>
        <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <p style={{ margin: 0, color: 'var(--text-2)', maxWidth: '72ch' }}>{veri.aciklama}</p>
          <div className="filtreler">
            <span className="chip" title={veri.madde.metin}>§ {veri.madde.kod} — {veri.madde.baslik}</span>
            <span className="chip">{veri.tesis.ad}</span>
            {veri.sorumlu && <span className="chip">Sorumlu: {veri.sorumlu.ad}</span>}
            {veri.hedef && (
              <span className={`pill durum-${gecikti ? 'uyumsuz' : 'incelemede'}`}>
                <span className="dot" />hedef {tarihTR(veri.hedef)}
              </span>
            )}
            {veri.kapanma && <span className="pill durum-uyumlu"><span className="dot" />
              kapandı {tarihTR(veri.kapanma)}</span>}
            {veri.projeler.map((p) => (
              <Link key={p.id} href="/projeler" className="chip mono" title={p.ad}>▸ {p.kod}</Link>
            ))}
          </div>
          <div className="filtreler sirada-gizli">
            <select className="sec" value={veri.durum} disabled={bekliyor}
              onChange={(e) => calistir(() => bulguGuncelle({ id: veri.id, durum: e.target.value }))}>
              {BULGU_DURUMLARI.map((d) => <option key={d} value={d}>{BULGU_DURUM_ETIKET[d]}</option>)}
            </select>
            <select className="sec" value={veri.onem} disabled={bekliyor}
              onChange={(e) => calistir(() => bulguGuncelle({ id: veri.id, onemDerecesi: e.target.value }))}>
              {ONEM_DERECELERI.map((o) => <option key={o} value={o}>{ONEM_ETIKET[o]}</option>)}
            </select>
            <select className="sec" value={veri.sorumlu?.id ?? ''} disabled={bekliyor}
              onChange={(e) => calistir(() => bulguGuncelle({ id: veri.id, sorumluId: e.target.value || null }))}>
              <option value="">Sorumlu yok</option>
              {veri.kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
            </select>
          </div>
          {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: 'var(--sp-6)' }}>
        <section className="belir gorunur">
          <div className="sahne-baslik">
            <span className="no">01</span><h2>Aksiyonlar</h2><span className="cizgi" />
            <button className="btn kucuk" onClick={() => setAksiyonFormu(!aksiyonFormu)}>+ Aksiyon</button>
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="kart-icerik sifir">
              {aksiyonFormu && (
                <div className="form-izgara" style={{ padding: 'var(--sp-4) var(--sp-5)',
                  borderBottom: '1px solid var(--border)' }}>
                  <input className="inp" placeholder="Aksiyon başlığı" value={yeniAksiyon.baslik}
                    onChange={(e) => setYeniAksiyon({ ...yeniAksiyon, baslik: e.target.value })}
                    style={{ gridColumn: '1/-1' }} />
                  <select className="sec" value={yeniAksiyon.sorumluId}
                    onChange={(e) => setYeniAksiyon({ ...yeniAksiyon, sorumluId: e.target.value })}>
                    <option value="">Sorumlu…</option>
                    {veri.kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
                  </select>
                  <input className="inp" type="date" value={yeniAksiyon.hedef}
                    onChange={(e) => setYeniAksiyon({ ...yeniAksiyon, hedef: e.target.value })} />
                  <button className="btn birincil" disabled={bekliyor}
                    onClick={() => calistir(() => aksiyonEkle({
                      bulguId: veri.id, baslik: yeniAksiyon.baslik,
                      sorumluId: yeniAksiyon.sorumluId || null, hedef: yeniAksiyon.hedef || null,
                    }), () => { setAksiyonFormu(false); setYeniAksiyon({ baslik: '', sorumluId: '', hedef: '' }); })}>
                    Ekle
                  </button>
                </div>
              )}
              {veri.aksiyonlar.map((a) => (
                <div key={a.id} className="satir">
                  <span className={`serit serit-${AKSIYON_DURUM_RENGI[a.durum as keyof typeof AKSIYON_DURUM_RENGI]}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, textDecoration: a.durum === 'iptal' ? 'line-through' : undefined }}>
                      {a.baslik}
                    </div>
                    <div className="mikro-etiket" style={{ letterSpacing: '.04em' }}>
                      {a.sorumlu ?? '—'}{a.hedef && ` · hedef ${tarihTR(a.hedef)}`}
                      {a.tamamlanma && ` · bitti ${tarihTR(a.tamamlanma)}`}
                    </div>
                  </div>
                  <select className="sec sirada-gizli" value={a.durum} disabled={bekliyor}
                    onChange={(e) => calistir(() => aksiyonDurumDegistir({ id: a.id, durum: e.target.value }))}>
                    {AKSIYON_DURUMLARI.map((d) => <option key={d} value={d}>{AKSIYON_ETIKET[d]}</option>)}
                  </select>
                  <Pill durum={AKSIYON_DURUM_RENGI[a.durum as keyof typeof AKSIYON_DURUM_RENGI]}
                    etiket={AKSIYON_ETIKET[a.durum as keyof typeof AKSIYON_ETIKET]} />
                </div>
              ))}
              {veri.aksiyonlar.length === 0 && !aksiyonFormu && (
                <Bos baslik="Aksiyon yok" altMetin="Bu bulgu için henüz aksiyon planlanmadı."
                  eylem={<button className="btn birincil" onClick={() => setAksiyonFormu(true)}>+ Aksiyon planla</button>} />
              )}
            </div>
          </div>

          {veri.kanitlar.length > 0 && (
            <>
              <div className="sahne-baslik" style={{ marginTop: 'var(--sp-6)' }}>
                <span className="no">02</span><h2>Bağlı kanıtlar</h2><span className="cizgi" />
              </div>
              <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
                <div className="kart-icerik filtreler">
                  {veri.kanitlar.map((kn) => {
                    const taze = kanitTazelik(new Date(kn.baslangic));
                    return (
                      <span key={kn.id} className={`pill durum-${taze.durum}`}
                        title={`${etiketle(kn.tip)} · ${taze.etiket} · ${taze.gun} gün önce`}>
                        🗎 {kn.ad}
                      </span>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="belir gorunur">
          <div className="sahne-baslik">
            <span className="no">{veri.kanitlar.length > 0 ? '03' : '02'}</span>
            <h2>Zaman çizelgesi</h2><span className="cizgi" />
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="kart-icerik">
              <ul className="zaman">
                {veri.aktiviteler.map((a, i) => (
                  <li key={a.id} className="zaman-oge">
                    <span className={`zaman-nokta${i === 0 ? ' vurgu' : ''}`} />
                    <div className="zaman-ust">
                      <span className="aktor">{a.aktor}</span>
                      <span style={{ color: 'var(--text-2)' }}>
                        {eylemCumlesi(a.eylem, a.varlikTipi === 'Bulgu' ? null : a.varlikTipi)}
                      </span>
                      <span className="an">{zamanTR(a.zaman)}</span>
                    </div>
                    {(a.once || a.sonra) && (
                      <div className="zaman-govde">
                        {a.alan && <span className="mikro-etiket">{etiketle(a.alan)}: </span>}
                        <span className="fark">
                          {a.once && <span className="eski">{etiketle(a.once)}</span>}
                          {a.once && a.sonra && '→'}
                          {a.sonra && <span className="yeni">{etiketle(a.sonra)}</span>}
                        </span>
                      </div>
                    )}
                    {a.dosya && <div className="zaman-govde mono">🗎 {a.dosya}</div>}
                  </li>
                ))}
                {veri.aktiviteler.length === 0 && <Bos baslik="Kayıt yok" />}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
