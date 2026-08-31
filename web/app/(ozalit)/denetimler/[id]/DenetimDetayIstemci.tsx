'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Pill, Bos } from '@/components/ui';
import Kip from '@/components/Kip';
import { useEylem } from '@/components/useEylem';
import {
  asamaIlerlet, asamaGeriAl, kanitTalebiEkle, kanitTalebiDurum,
  kapsamEkle, kapsamCikar,
} from '@/lib/eylemler2/denetim';
import {
  DENETIM_ASAMALARI, DENETIM_ASAMA_ETIKET, DENETIM_TIP_ETIKET,
  ONEM_ETIKET, ONEM_DURUM_RENGI, BULGU_DURUM_ETIKET, BULGU_DURUM_RENGI,
  etiketle, tarihTR, gecikmisMi, type Onem, type BulguDurum, type Durum,
} from '@/lib/sabitler';

type Asama = (typeof DENETIM_ASAMALARI)[number];

type Veri = {
  id: string; kod: string; ad: string; tip: string;
  denetleyen: string | null; durum: string;
  planBaslangic: string | null; planBitis: string | null; olusturuldu: string;
  surec: { id: string; kod: string; regKod: string } | null;
  kapsamlar: {
    id: string;
    tesis: { id: string; kod: string; ad: string } | null;
    madde: { id: string; kod: string; baslik: string } | null;
  }[];
  talepler: {
    id: string; baslik: string; aciklama: string | null; durum: string;
    sonTarih: string | null;
    sorumlu: { id: string; ad: string } | null;
    kanit: { id: string; ad: string } | null;
  }[];
  bulgular: {
    id: string; baslik: string; onem: string; durum: string;
    maddeKod: string; tesisKod: string; sorumlu: string | null; hedef: string | null;
  }[];
  kullanicilar: { id: string; ad: string }[];
  tesisler: { id: string; kod: string; ad: string }[];
  maddeler: { id: string; kod: string; baslik: string }[];
  kanitlar: { id: string; ad: string; tip: string }[];
};

/** Renk yalnız durumu anlatır: hazırlık incelemede, yürütme kısmi, kapanış uyumlu. */
function asamaRengi(a: string): Durum {
  if (a === 'kapanis') return 'uyumlu';
  if (a === 'plan' || a === 'kapsam') return 'incelemede';
  return 'kismi';
}

const TALEP_DURUMLARI = ['acik', 'saglandi', 'reddedildi'] as const;
const TALEP_ETIKET: Record<string, string> = {
  acik: 'Açık', saglandi: 'Sağlandı', reddedildi: 'Reddedildi',
};
const TALEP_RENGI: Record<string, Durum> = {
  acik: 'incelemede', saglandi: 'uyumlu', reddedildi: 'uyumsuz',
};

/** Yaşam döngüsü rayı: geçmiş adımlar dolu, aktif adım nabız, gelecek soluk. */
function YasamDongusuRayi({ aktif }: { aktif: number }) {
  return (
    <div style={{ display: 'flex', overflowX: 'auto', paddingTop: 4 }}>
      {DENETIM_ASAMALARI.map((a, i) => {
        const gecmis = i < aktif, simdiki = i === aktif;
        return (
          <div key={a} style={{ flex: 1, minWidth: 74, position: 'relative',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {i > 0 && (
              <span aria-hidden style={{ position: 'absolute', top: 7, right: '50%',
                width: '100%', height: 2,
                background: i <= aktif ? 'var(--accent)' : 'var(--border)' }} />
            )}
            <span className={simdiki ? 'nabiz' : undefined} style={{
              width: 16, height: 16, borderRadius: '50%', zIndex: 1, boxSizing: 'border-box',
              background: gecmis || simdiki ? 'var(--accent)' : 'var(--surface)',
              border: `2px solid ${gecmis || simdiki ? 'var(--accent)' : 'var(--border-strong)'}`,
            }} />
            <span style={{ fontSize: 'var(--fs-xs)', textAlign: 'center', lineHeight: 1.25,
              color: simdiki ? 'var(--text)' : gecmis ? 'var(--text-2)' : 'var(--text-3)',
              fontWeight: simdiki ? 600 : 400 }}>
              {DENETIM_ASAMA_ETIKET[a]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const BOS_TALEP = { baslik: '', aciklama: '', sorumluId: '', sonTarih: '' };

export default function DenetimDetayIstemci({ veri }: { veri: Veri }) {
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const [talepFormu, setTalepFormu] = useState(false);
  const [yeniTalep, setYeniTalep] = useState(BOS_TALEP);
  const [saglandiTalep, setSaglandiTalep] = useState<{ id: string; baslik: string } | null>(null);
  const [saglandi, setSaglandi] = useState({ kanitId: '', yeniKanitAd: '' });
  const [geriAcik, setGeriAcik] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const [yeniKapsam, setYeniKapsam] = useState({ tesisId: '', maddeId: '' });

  const aktifIx = DENETIM_ASAMALARI.indexOf(veri.durum as Asama);
  const sonraki = aktifIx >= 0 && aktifIx < DENETIM_ASAMALARI.length - 1
    ? DENETIM_ASAMALARI[aktifIx + 1] : null;
  const acikTalep = veri.talepler.filter((t) => t.durum === 'acik').length;
  const acikBulgu = veri.bulgular.filter((b) => b.durum === 'acik' || b.durum === 'aksiyonda').length;
  const kapanisEngeli = sonraki === 'kapanis' && (acikTalep > 0 || acikBulgu > 0);

  const kapsamTesisler = veri.kapsamlar.filter((x) => x.tesis);
  const kapsamMaddeler = veri.kapsamlar.filter((x) => x.madde);
  const bosTesisler = veri.tesisler.filter((t) => !kapsamTesisler.some((x) => x.tesis!.id === t.id));
  const bosMaddeler = veri.maddeler.filter((m) => !kapsamMaddeler.some((x) => x.madde!.id === m.id));

  return (
    <>
      {/* ------------------------------------------ yaşam döngüsü + kimlik */}
      <div className="kart belir gorunur">
        <div className="kart-baslik">
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="mikro-etiket">
              {DENETIM_TIP_ETIKET[veri.tip] ?? etiketle(veri.tip)}
              {veri.denetleyen && ` · ${veri.denetleyen}`}
              {veri.surec && ` · ${veri.surec.regKod}`}
              {' · plan '}{tarihTR(veri.planBaslangic)} – {tarihTR(veri.planBitis)}
            </span>
            <h1 style={{ marginTop: 4, fontSize: 'var(--fs-h2)' }}>{veri.ad}</h1>
          </div>
          <Pill durum={asamaRengi(veri.durum)}
            etiket={DENETIM_ASAMA_ETIKET[veri.durum as Asama] ?? etiketle(veri.durum)} />
        </div>
        <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <YasamDongusuRayi aktif={aktifIx} />
          <div className="filtreler yazdirmada-gizle">
            {aktifIx > 0 && (
              <button className="btn" disabled={bekliyor}
                onClick={() => { setHata(null); setGerekce(''); setGeriAcik(true); }}>
                ← Aşamayı geri al…
              </button>
            )}
            <span style={{ flex: 1 }} />
            {kapanisEngeli && (
              <span className="mikro-etiket" style={{ color: 'var(--uyumsuz-fg)' }}>
                Kapanış için önce {acikTalep > 0 && `${acikTalep} açık kanıt talebi`}
                {acikTalep > 0 && acikBulgu > 0 && ' ve '}
                {acikBulgu > 0 && `${acikBulgu} açık bulgu`} kapatılmalı
              </span>
            )}
            {sonraki && (
              <button className="btn birincil" disabled={bekliyor}
                onClick={() => calistir(() => asamaIlerlet({ id: veri.id }))}>
                Sonraki aşama: {DENETIM_ASAMA_ETIKET[sonraki]} →
              </button>
            )}
          </div>
          {hata && !geriAcik && !saglandiTalep && (
            <p className="pill durum-uyumsuz" role="alert" style={{ margin: 0 }}>{hata}</p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------- kanıt talepleri */}
      <section className="belir gorunur">
        <div className="sahne-baslik">
          <span className="no">01</span><h2>Kanıt talepleri</h2><span className="cizgi" />
          <span className="mikro-etiket">{acikTalep} açık / {veri.talepler.length}</span>
          <button className="btn kucuk yazdirmada-gizle"
            onClick={() => setTalepFormu(!talepFormu)}>+ Talep</button>
        </div>
        <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
          {talepFormu && (
            <div className="form-izgara" style={{ padding: 'var(--sp-4) var(--sp-5)',
              borderBottom: '1px solid var(--border)' }}>
              <input className="inp" placeholder="Talep başlığı (istenen kanıt)"
                value={yeniTalep.baslik} style={{ gridColumn: '1/-1' }}
                onChange={(e) => setYeniTalep({ ...yeniTalep, baslik: e.target.value })} />
              <input className="inp" placeholder="Açıklama (isteğe bağlı)"
                value={yeniTalep.aciklama} style={{ gridColumn: '1/-1' }}
                onChange={(e) => setYeniTalep({ ...yeniTalep, aciklama: e.target.value })} />
              <select className="sec" value={yeniTalep.sorumluId}
                onChange={(e) => setYeniTalep({ ...yeniTalep, sorumluId: e.target.value })}>
                <option value="">Sorumlu…</option>
                {veri.kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
              </select>
              <input className="inp" type="date" value={yeniTalep.sonTarih}
                onChange={(e) => setYeniTalep({ ...yeniTalep, sonTarih: e.target.value })} />
              <button className="btn birincil" disabled={bekliyor || !yeniTalep.baslik.trim()}
                onClick={() => calistir(() => kanitTalebiEkle({
                  denetimId: veri.id, baslik: yeniTalep.baslik,
                  aciklama: yeniTalep.aciklama || null,
                  sorumluId: yeniTalep.sorumluId || null,
                  sonTarih: yeniTalep.sonTarih || null,
                }), () => { setTalepFormu(false); setYeniTalep(BOS_TALEP); })}>
                Ekle
              </button>
            </div>
          )}
          <div className="tablo-sar">
            <table className="tablo">
              <thead><tr>
                <th>Talep</th><th>Sorumlu</th><th>Son tarih</th><th>Durum</th><th>Bağlı kanıt</th>
              </tr></thead>
              <tbody>
                {veri.talepler.map((t) => {
                  const gecikti = t.durum === 'acik' && gecikmisMi(t.sonTarih);
                  return (
                    <tr key={t.id}>
                      <td style={{ maxWidth: 360 }}>
                        <div style={{ fontWeight: 500 }}>{t.baslik}</div>
                        {t.aciklama && (
                          <div className="mikro-etiket sirada-gizli"
                            style={{ letterSpacing: '.04em' }}>{t.aciklama}</div>
                        )}
                      </td>
                      <td>{t.sorumlu?.ad ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {t.sonTarih ? (
                          <span style={{ color: gecikti ? 'var(--uyumsuz-fg)' : 'var(--text-2)' }}>
                            {tarihTR(t.sonTarih)}{gecikti && ' ⚠ gecikti'}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                          <Pill durum={TALEP_RENGI[t.durum] ?? 'degerlendirilmedi'}
                            etiket={TALEP_ETIKET[t.durum] ?? etiketle(t.durum)} />
                          <select className="sec sirada-gizli yazdirmada-gizle" value={t.durum}
                            disabled={bekliyor} aria-label="Talep durumu"
                            onChange={(e) => {
                              const d = e.target.value;
                              if (d === 'saglandi') {
                                setHata(null);
                                setSaglandi({ kanitId: '', yeniKanitAd: '' });
                                setSaglandiTalep({ id: t.id, baslik: t.baslik });
                              } else {
                                calistir(() => kanitTalebiDurum({ id: t.id, durum: d }));
                              }
                            }}>
                            {TALEP_DURUMLARI.map((d) => (
                              <option key={d} value={d}>{TALEP_ETIKET[d]}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td>{t.kanit ? <span className="chip">{t.kanit.ad}</span> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {veri.talepler.length === 0 && (
              <Bos baslik="Kanıt talebi yok"
                altMetin="Kanıt talebi aşamasında istenen kanıtları buradan talep edin." />
            )}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))',
        gap: 'var(--sp-6)' }}>
        {/* --------------------------------------------------------- kapsam */}
        <section className="belir gorunur">
          <div className="sahne-baslik">
            <span className="no">02</span><h2>Kapsam</h2><span className="cizgi" />
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div>
                <span className="mikro-etiket">Tesisler</span>
                <div className="filtreler" style={{ marginTop: 6 }}>
                  {kapsamTesisler.map((x) => (
                    <span key={x.id} className="chip mono" title={x.tesis!.ad}>
                      {x.tesis!.kod}
                      <button className="chip-sil yazdirmada-gizle" disabled={bekliyor}
                        aria-label={`${x.tesis!.kod} kapsamdan çıkar`}
                        onClick={() => calistir(() => kapsamCikar({ id: x.id }))}>✕</button>
                    </span>
                  ))}
                  {kapsamTesisler.length === 0 && (
                    <span className="mikro-etiket">Tesis kapsamı tanımlanmadı</span>
                  )}
                </div>
              </div>
              <div>
                <span className="mikro-etiket">Maddeler</span>
                <div className="filtreler" style={{ marginTop: 6 }}>
                  {kapsamMaddeler.map((x) => (
                    <span key={x.id} className="chip mono" title={x.madde!.baslik}>
                      {x.madde!.kod}
                      <button className="chip-sil yazdirmada-gizle" disabled={bekliyor}
                        aria-label={`${x.madde!.kod} kapsamdan çıkar`}
                        onClick={() => calistir(() => kapsamCikar({ id: x.id }))}>✕</button>
                    </span>
                  ))}
                  {kapsamMaddeler.length === 0 && (
                    <span className="mikro-etiket">Madde kapsamı tanımlanmadı</span>
                  )}
                </div>
              </div>
              <div className="filtreler yazdirmada-gizle"
                style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-4)' }}>
                <select className="sec" value={yeniKapsam.tesisId}
                  onChange={(e) => setYeniKapsam({ tesisId: e.target.value, maddeId: '' })}>
                  <option value="">Tesis ekle…</option>
                  {bosTesisler.map((t) => (
                    <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>
                  ))}
                </select>
                <select className="sec" value={yeniKapsam.maddeId}
                  style={{ maxWidth: 260 }}
                  onChange={(e) => setYeniKapsam({ tesisId: '', maddeId: e.target.value })}>
                  <option value="">Madde ekle…</option>
                  {bosMaddeler.map((m) => (
                    <option key={m.id} value={m.id}>{m.kod} — {m.baslik}</option>
                  ))}
                </select>
                <button className="btn kucuk" disabled={bekliyor || (!yeniKapsam.tesisId && !yeniKapsam.maddeId)}
                  onClick={() => calistir(() => kapsamEkle({
                    denetimId: veri.id,
                    tesisId: yeniKapsam.tesisId || null,
                    maddeId: yeniKapsam.maddeId || null,
                  }), () => setYeniKapsam({ tesisId: '', maddeId: '' }))}>
                  Ekle
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- bulgular */}
        <section className="belir gorunur">
          <div className="sahne-baslik">
            <span className="no">03</span><h2>Bulgular</h2><span className="cizgi" />
            <span className="mikro-etiket">{acikBulgu} açık / {veri.bulgular.length}</span>
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="kart-icerik sifir">
              {veri.bulgular.map((b) => (
                <div key={b.id} className="satir">
                  <span className={`serit serit-${ONEM_DURUM_RENGI[b.onem as Onem]}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/bulgular/${b.id}`} style={{ fontWeight: 500 }}>{b.baslik}</Link>
                    <div className="mikro-etiket" style={{ letterSpacing: '.04em' }}>
                      {b.maddeKod} · {b.tesisKod}
                      {b.sorumlu && ` · ${b.sorumlu}`}
                      {b.hedef && ` · hedef ${tarihTR(b.hedef)}`}
                    </div>
                  </div>
                  <Pill durum={ONEM_DURUM_RENGI[b.onem as Onem]}
                    etiket={ONEM_ETIKET[b.onem as Onem]} hollow={b.onem === 'yuksek'} />
                  <Pill durum={BULGU_DURUM_RENGI[b.durum as BulguDurum]}
                    etiket={BULGU_DURUM_ETIKET[b.durum as BulguDurum]} />
                </div>
              ))}
              {veri.bulgular.length === 0 && (
                <Bos baslik="Bu denetime bağlı bulgu yok" />
              )}
              <div className="mikro-etiket" style={{ padding: 'var(--sp-3) var(--sp-5)',
                borderTop: '1px solid var(--border)' }}>
                Yeni bulgu, bulgu kaydı üzerinden bu denetime bağlanır; burada yalnız izlenir.
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ---------------------------------------- aşama geri alma kip'i */}
      <Kip acik={geriAcik} kapat={() => setGeriAcik(false)} baslik="Aşamayı geri al"
        ust={<span className="mikro-etiket mono">{veri.kod}</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
            {DENETIM_ASAMA_ETIKET[veri.durum as Asama] ?? etiketle(veri.durum)} aşamasından{' '}
            {aktifIx > 0 ? DENETIM_ASAMA_ETIKET[DENETIM_ASAMALARI[aktifIx - 1]] : '—'} aşamasına
            dönülecek. Geri alma onay yetkisi ister; gerekçe iz kaydına yazılır.
          </p>
          <label className="form-satir">
            <span>Gerekçe (zorunlu)</span>
            <textarea className="inp" rows={3} value={gerekce}
              placeholder="Aşama neden geri alınıyor?"
              onChange={(e) => setGerekce(e.target.value)} />
          </label>
          <div className="filtreler">
            {hata && <span className="pill durum-uyumsuz" role="alert">{hata}</span>}
            <span style={{ flex: 1 }} />
            <button className="btn" onClick={() => setGeriAcik(false)} disabled={bekliyor}>Vazgeç</button>
            <button className="btn birincil" disabled={bekliyor || !gerekce.trim()}
              onClick={() => calistir(() => asamaGeriAl({ id: veri.id, gerekce }),
                () => setGeriAcik(false))}>
              Geri al
            </button>
          </div>
        </div>
      </Kip>

      {/* --------------------------------- talep "sağlandı" kanıt kip'i */}
      <Kip acik={!!saglandiTalep} kapat={() => setSaglandiTalep(null)} baslik="Kanıt sağlandı"
        ust={saglandiTalep && <span className="mikro-etiket">{saglandiTalep.baslik}</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
            Mevcut bir kanıt seçin ya da yeni kanıt adı girin; yeni kanıt oluşturulup
            talebe bağlanır.
          </p>
          <label className="form-satir">
            <span>Mevcut kanıt</span>
            <select className="sec" value={saglandi.kanitId}
              onChange={(e) => setSaglandi({ kanitId: e.target.value, yeniKanitAd: '' })}>
              <option value="">Yeni kanıt oluşturulacak…</option>
              {veri.kanitlar.map((ka) => (
                <option key={ka.id} value={ka.id}>{ka.ad} ({etiketle(ka.tip)})</option>
              ))}
            </select>
          </label>
          {!saglandi.kanitId && (
            <label className="form-satir">
              <span>Yeni kanıt adı</span>
              <input className="inp" value={saglandi.yeniKanitAd}
                placeholder="Örn. 2026 güvenlik duvarı kural seti raporu"
                onChange={(e) => setSaglandi({ ...saglandi, yeniKanitAd: e.target.value })} />
            </label>
          )}
          <div className="filtreler">
            {hata && <span className="pill durum-uyumsuz" role="alert">{hata}</span>}
            <span style={{ flex: 1 }} />
            <button className="btn" onClick={() => setSaglandiTalep(null)} disabled={bekliyor}>Vazgeç</button>
            <button className="btn birincil"
              disabled={bekliyor || (!saglandi.kanitId && !saglandi.yeniKanitAd.trim())}
              onClick={() => saglandiTalep && calistir(() => kanitTalebiDurum({
                id: saglandiTalep.id, durum: 'saglandi',
                kanitId: saglandi.kanitId || null,
                yeniKanitAd: saglandi.yeniKanitAd || null,
              }), () => setSaglandiTalep(null))}>
              Sağlandı olarak işaretle
            </button>
          </div>
        </div>
      </Kip>
    </>
  );
}
