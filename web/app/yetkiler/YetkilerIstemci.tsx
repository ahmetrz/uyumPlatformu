'use client';
import { useState } from 'react';
import Kip from '@/components/Kip';
import { Bos } from '@/components/ui';
import { useEylem } from '@/components/useEylem';
import { kullaniciKaydet, kullaniciAktifDegistir, yetkiVer, yetkiSil } from '@/lib/eylemler';
import { ROLLER, ROL_ETIKET } from '@/lib/sabitler';

type K = {
  id: string; ad: string; eposta: string; unvan: string | null; aktif: boolean;
  yetkiler: { id: string; rol: string;
    surec: { kod: string; regKod: string } | null; tesis: { kod: string } | null }[];
};

const ROL_RENK: Record<string, string> = {
  yonetici: 'uyumsuz', denetim_sorumlusu: 'kismi', katkici: 'incelemede', okuyucu: 'kapsamdisi',
};

export default function YetkilerIstemci({ kullanicilar, surecler, tesisler }: {
  kullanicilar: K[];
  surecler: { id: string; kod: string; regKod: string }[];
  tesisler: { id: string; kod: string; ad: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [duzenlenen, setDuzenlenen] = useState<K | 'yeni' | null>(null);
  const [yetkiKisi, setYetkiKisi] = useState<K | null>(null);

  const yetkiGuncel = yetkiKisi ? kullanicilar.find((k) => k.id === yetkiKisi.id) ?? null : null;

  return (
    <>
      <div className="filtreler">
        <span className="mikro-etiket">
          YETKİ KAPSAMI: KULLANICI × UYUM SÜRECİ × TESİS · BOŞ ALAN &quot;TÜMÜ&quot; DEMEKTİR
        </span>
        <span style={{ flex: 1 }} />
        <button className="btn birincil" onClick={() => setDuzenlenen('yeni')}>+ Kullanıcı</button>
      </div>

      <div className="kart">
        <div className="tablo-sar">
          <table className="tablo">
            <thead><tr>
              <th>Kullanıcı</th><th>Unvan</th><th>Yetkiler</th><th className="sag">İşlem</th>
            </tr></thead>
            <tbody>
              {kullanicilar.map((k) => (
                <tr key={k.id} style={{ opacity: k.aktif ? 1 : .5 }}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{k.ad}</div>
                    <div className="mikro-etiket" style={{ letterSpacing: '.03em' }}>{k.eposta}</div>
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>{k.unvan ?? '—'}</td>
                  <td>
                    <div className="filtreler">
                      {k.yetkiler.map((y) => (
                        <span key={y.id} className={`pill durum-${ROL_RENK[y.rol] ?? 'incelemede'}`}
                          title={`${y.surec ? `${y.surec.regKod} · ${y.surec.kod}` : 'Tüm süreçler'} · ${y.tesis?.kod ?? 'tüm tesisler'}`}>
                          <span className="dot" />
                          {ROL_ETIKET[y.rol as keyof typeof ROL_ETIKET]}
                          {(y.surec || y.tesis) && (
                            <span className="mono" style={{ opacity: .8 }}>
                              {y.surec ? ` @${y.surec.regKod}` : ''}{y.tesis ? `/${y.tesis.kod}` : ''}
                            </span>
                          )}
                        </span>
                      ))}
                      {k.yetkiler.length === 0 && <span className="chip">Yetki yok</span>}
                    </div>
                  </td>
                  <td className="sag" style={{ whiteSpace: 'nowrap' }}>
                    <span className="filtreler sirada-gizli" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn kucuk" onClick={() => setYetkiKisi(k)}>Yetkiler</button>
                      <button className="btn kucuk" onClick={() => setDuzenlenen(k)}>Düzenle</button>
                      <button className="btn kucuk" disabled={bekliyor}
                        onClick={() => calistir(() => kullaniciAktifDegistir({ id: k.id, aktif: !k.aktif }))}>
                        {k.aktif ? 'Pasifleştir' : 'Aktifleştir'}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      <Kip acik={duzenlenen !== null} kapat={() => setDuzenlenen(null)}
        baslik={duzenlenen === 'yeni' ? 'Yeni kullanıcı' : 'Kullanıcıyı düzenle'}>
        <KullaniciFormu key={duzenlenen === 'yeni' ? 'yeni' : duzenlenen?.id ?? 'k'}
          kisi={duzenlenen === 'yeni' ? null : duzenlenen} kapat={() => setDuzenlenen(null)} />
      </Kip>

      <Kip acik={!!yetkiGuncel} kapat={() => setYetkiKisi(null)} genis
        baslik={`Yetkiler — ${yetkiGuncel?.ad ?? ''}`}
        ust={<span className="mikro-etiket">Süreç ve tesis boş bırakılırsa yetki tüm kapsama uygulanır</span>}>
        {yetkiGuncel && <YetkiYonetimi kisi={yetkiGuncel} surecler={surecler} tesisler={tesisler} />}
      </Kip>
    </>
  );
}

function KullaniciFormu({ kisi, kapat }: { kisi: K | null; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState({
    adSoyad: kisi?.ad ?? '', eposta: kisi?.eposta ?? '', unvan: kisi?.unvan ?? '' });
  return (
    <>
      <div className="form-izgara">
        <label className="form-satir"><span>Ad soyad</span>
          <input className="inp" value={v.adSoyad}
            onChange={(e) => setV({ ...v, adSoyad: e.target.value })} /></label>
        <label className="form-satir"><span>E-posta</span>
          <input className="inp" type="email" value={v.eposta}
            onChange={(e) => setV({ ...v, eposta: e.target.value })} /></label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Unvan</span>
          <input className="inp" value={v.unvan}
            onChange={(e) => setV({ ...v, unvan: e.target.value })} /></label>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert" style={{ marginTop: 'var(--sp-3)' }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={kapat}>Vazgeç</button>
        <button className="btn birincil" disabled={bekliyor}
          onClick={() => calistir(() => kullaniciKaydet({
            id: kisi?.id, eposta: v.eposta, adSoyad: v.adSoyad, unvan: v.unvan || null }), kapat)}>
          Kaydet
        </button>
      </div>
    </>
  );
}

function YetkiYonetimi({ kisi, surecler, tesisler }: {
  kisi: K;
  surecler: { id: string; kod: string; regKod: string }[];
  tesisler: { id: string; kod: string; ad: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState({ surecId: '', tesisId: '', rol: 'okuyucu' });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="filtreler">
        <select className="sec" value={v.surecId} onChange={(e) => setV({ ...v, surecId: e.target.value })}>
          <option value="">Tüm süreçler</option>
          {surecler.map((s) => <option key={s.id} value={s.id}>{s.regKod} · {s.kod}</option>)}
        </select>
        <select className="sec" value={v.tesisId} onChange={(e) => setV({ ...v, tesisId: e.target.value })}>
          <option value="">Tüm tesisler</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod}</option>)}
        </select>
        <select className="sec" value={v.rol} onChange={(e) => setV({ ...v, rol: e.target.value })}>
          {ROLLER.map((r) => <option key={r} value={r}>{ROL_ETIKET[r]}</option>)}
        </select>
        <button className="btn birincil" disabled={bekliyor}
          onClick={() => calistir(() => yetkiVer({
            kullaniciId: kisi.id, surecId: v.surecId || null,
            tesisId: v.tesisId || null, rol: v.rol }))}>
          + Yetki ver
        </button>
      </div>
      <div>
        {kisi.yetkiler.map((y) => (
          <div key={y.id} className="satir">
            <span className={`pill durum-${ROL_RENK[y.rol] ?? 'incelemede'}`}>
              <span className="dot" />{ROL_ETIKET[y.rol as keyof typeof ROL_ETIKET]}
            </span>
            <span style={{ flex: 1, color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
              {y.surec ? `${y.surec.regKod} · ${y.surec.kod}` : 'Tüm süreçler'}
              {' · '}{y.tesis?.kod ?? 'tüm tesisler'}
            </span>
            <button className="btn kucuk tehlike sirada-gizli" disabled={bekliyor}
              onClick={() => calistir(() => yetkiSil({ id: y.id }))}>Kaldır</button>
          </div>
        ))}
        {kisi.yetkiler.length === 0 && <Bos baslik="Yetki tanımlı değil" />}
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
    </div>
  );
}
