'use client';
import Link from 'next/link';
import { useState } from 'react';
import Kip from '@/components/Kip';
import { Pill, Bos } from '@/components/ui';
import { useEylem } from '@/components/useEylem';
import { projeKaydet, projeBaglantiEkle, projeBaglantiSil } from '@/lib/eylemler';
import { PROJE_DURUMLARI, PROJE_DURUM_ETIKET, PROJE_DURUM_RENGI,
  BULGU_DURUM_RENGI, tarihTR, type BulguDurum } from '@/lib/sabitler';

type Proje = {
  id: string; kod: string; ad: string; aciklama: string | null; durum: string;
  baslangic: string | null; hedef: string | null;
  sahip: { id: string; ad: string } | null;
  baglantilar: { id: string;
    madde: { id: string; kod: string; baslik: string } | null;
    bulgu: { id: string; baslik: string; durum: string; tesisKod: string } | null }[];
};

export default function ProjelerIstemci({ projeler, kullanicilar, maddeler, bulgular }: {
  projeler: Proje[];
  kullanicilar: { id: string; ad: string }[];
  maddeler: { id: string; kod: string; baslik: string }[];
  bulgular: { id: string; baslik: string; durum: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [duzenlenen, setDuzenlenen] = useState<Proje | 'yeni' | null>(null);
  const [baglantiProje, setBaglantiProje] = useState<Proje | null>(null);

  const baglantiGuncel = baglantiProje
    ? projeler.find((p) => p.id === baglantiProje.id) ?? null : null;

  return (
    <>
      <div className="filtreler">
        <span className="mikro-etiket">{projeler.length} PROJE · REGÜLASYON VE BULGULARLA EŞLEŞTİRİLMİŞ</span>
        <span style={{ flex: 1 }} />
        <button className="btn birincil" onClick={() => setDuzenlenen('yeni')}>+ Yeni proje</button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))' }}>
        {projeler.map((p) => (
          <div key={p.id} className="kart tikla">
            <div className="kart-baslik">
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="mikro-etiket">{p.kod}
                  {p.sahip && ` · ${p.sahip.ad}`}</span>
                <h3 style={{ marginTop: 2 }}>{p.ad}</h3>
              </div>
              <Pill durum={PROJE_DURUM_RENGI[p.durum as keyof typeof PROJE_DURUM_RENGI]}
                etiket={PROJE_DURUM_ETIKET[p.durum as keyof typeof PROJE_DURUM_ETIKET]} />
            </div>
            <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {p.aciklama && <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>{p.aciklama}</p>}
              <div className="filtreler">
                {p.baglantilar.filter((b) => b.madde).map((b) => (
                  <span key={b.id} className="chip mono" title={b.madde!.baslik}>§ {b.madde!.kod}</span>
                ))}
                {p.baglantilar.filter((b) => b.bulgu).map((b) => (
                  <Link key={b.id} href={`/bulgular/${b.bulgu!.id}`}
                    className={`pill durum-${BULGU_DURUM_RENGI[b.bulgu!.durum as BulguDurum]}`}
                    title={b.bulgu!.baslik}>
                    <span className="dot" />▲ {b.bulgu!.tesisKod}
                  </Link>
                ))}
                {p.baglantilar.length === 0 && <span className="chip">Bağlantı yok</span>}
              </div>
              <div className="mikro-etiket">{tarihTR(p.baslangic)} → {tarihTR(p.hedef)}</div>
              <div className="filtreler sirada-gizli">
                <button className="btn kucuk" onClick={() => setDuzenlenen(p)}>Düzenle</button>
                <button className="btn kucuk" onClick={() => setBaglantiProje(p)}>Eşleştir</button>
                {PROJE_DURUMLARI.filter((d) => d !== p.durum).slice(0, 2).map((d) => (
                  <button key={d} className="btn kucuk" disabled={bekliyor}
                    onClick={() => calistir(() => projeKaydet({
                      id: p.id, kod: p.kod, ad: p.ad, aciklama: p.aciklama,
                      durum: d, hedef: p.hedef, sahipId: p.sahip?.id ?? null }))}>
                    {PROJE_DURUM_ETIKET[d]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        {projeler.length === 0 && (
          <div className="kart"><Bos baslik="Proje yok"
            eylem={<button className="btn birincil" onClick={() => setDuzenlenen('yeni')}>+ Yeni proje</button>} /></div>
        )}
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      <ProjeKipi anahtar={duzenlenen === 'yeni' ? 'yeni' : duzenlenen?.id ?? 'kapali'}
        proje={duzenlenen === 'yeni' ? null : duzenlenen}
        acik={duzenlenen !== null} kapat={() => setDuzenlenen(null)} kullanicilar={kullanicilar} />

      <Kip acik={!!baglantiGuncel} kapat={() => setBaglantiProje(null)} genis
        baslik={`Eşleştir — ${baglantiGuncel?.ad ?? ''}`}
        ust={<span className="mikro-etiket">Projeyi regülasyon maddeleri ve bulgularla bağla</span>}>
        {baglantiGuncel && <BaglantiYonetimi proje={baglantiGuncel} maddeler={maddeler} bulgular={bulgular} />}
      </Kip>
    </>
  );
}

function ProjeKipi({ anahtar, proje, acik, kapat, kullanicilar }: {
  anahtar: string; proje: Proje | null; acik: boolean; kapat: () => void;
  kullanicilar: { id: string; ad: string }[];
}) {
  return (
    <Kip acik={acik} kapat={kapat} baslik={proje ? 'Projeyi düzenle' : 'Yeni proje'}>
      <ProjeFormu key={anahtar} proje={proje} kapat={kapat} kullanicilar={kullanicilar} />
    </Kip>
  );
}

function ProjeFormu({ proje, kapat, kullanicilar }: {
  proje: Proje | null; kapat: () => void; kullanicilar: { id: string; ad: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState({
    kod: proje?.kod ?? '', ad: proje?.ad ?? '', aciklama: proje?.aciklama ?? '',
    durum: proje?.durum ?? 'planlandi', hedef: proje?.hedef?.slice(0, 10) ?? '',
    sahipId: proje?.sahip?.id ?? '',
  });
  return (
    <>
      <div className="form-izgara">
        <label className="form-satir"><span>Kod</span>
          <input className="inp" value={v.kod} placeholder="PRJ-…"
            onChange={(e) => setV({ ...v, kod: e.target.value })} /></label>
        <label className="form-satir"><span>Sahip</span>
          <select className="sec" value={v.sahipId}
            onChange={(e) => setV({ ...v, sahipId: e.target.value })}>
            <option value="">Seçin…</option>
            {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
          </select></label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Ad</span>
          <input className="inp" value={v.ad}
            onChange={(e) => setV({ ...v, ad: e.target.value })} /></label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Açıklama</span>
          <textarea className="inp" rows={2} value={v.aciklama}
            onChange={(e) => setV({ ...v, aciklama: e.target.value })} /></label>
        <label className="form-satir"><span>Durum</span>
          <select className="sec" value={v.durum}
            onChange={(e) => setV({ ...v, durum: e.target.value })}>
            {PROJE_DURUMLARI.map((d) => <option key={d} value={d}>{PROJE_DURUM_ETIKET[d]}</option>)}
          </select></label>
        <label className="form-satir"><span>Hedef tarih</span>
          <input className="inp" type="date" value={v.hedef}
            onChange={(e) => setV({ ...v, hedef: e.target.value })} /></label>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert" style={{ marginTop: 'var(--sp-3)' }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={kapat}>Vazgeç</button>
        <button className="btn birincil" disabled={bekliyor}
          onClick={() => calistir(() => projeKaydet({
            id: proje?.id, kod: v.kod, ad: v.ad, aciklama: v.aciklama || null,
            durum: v.durum, hedef: v.hedef || null, sahipId: v.sahipId || null,
          }), kapat)}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </>
  );
}

function BaglantiYonetimi({ proje, maddeler, bulgular }: {
  proje: Proje;
  maddeler: { id: string; kod: string; baslik: string }[];
  bulgular: { id: string; baslik: string; durum: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [maddeSecim, setMaddeSecim] = useState('');
  const [bulguSecim, setBulguSecim] = useState('');
  const bagliMaddeler = new Set(proje.baglantilar.map((b) => b.madde?.id).filter(Boolean));
  const bagliBulgular = new Set(proje.baglantilar.map((b) => b.bulgu?.id).filter(Boolean));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="filtreler">
        <select className="sec" value={maddeSecim} onChange={(e) => setMaddeSecim(e.target.value)}
          style={{ maxWidth: 320 }}>
          <option value="">Madde seç…</option>
          {maddeler.filter((m) => !bagliMaddeler.has(m.id)).map((m) => (
            <option key={m.id} value={m.id}>{m.kod} — {m.baslik.slice(0, 44)}</option>))}
        </select>
        <button className="btn" disabled={bekliyor || !maddeSecim}
          onClick={() => calistir(() => projeBaglantiEkle({
            projeId: proje.id, maddeId: maddeSecim }), () => setMaddeSecim(''))}>
          + Madde bağla
        </button>
        <select className="sec" value={bulguSecim} onChange={(e) => setBulguSecim(e.target.value)}
          style={{ maxWidth: 320 }}>
          <option value="">Bulgu seç…</option>
          {bulgular.filter((b) => !bagliBulgular.has(b.id)).map((b) => (
            <option key={b.id} value={b.id}>{b.baslik.slice(0, 54)}</option>))}
        </select>
        <button className="btn" disabled={bekliyor || !bulguSecim}
          onClick={() => calistir(() => projeBaglantiEkle({
            projeId: proje.id, bulguId: bulguSecim }), () => setBulguSecim(''))}>
          + Bulgu bağla
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {proje.baglantilar.map((b) => (
          <div key={b.id} className="satir">
            {b.madde ? <><span className="chip mono">§ {b.madde.kod}</span>
              <span style={{ flex: 1 }}>{b.madde.baslik}</span></>
              : <><span className="chip">▲</span><span style={{ flex: 1 }}>{b.bulgu!.baslik}</span></>}
            <button className="btn kucuk tehlike sirada-gizli" disabled={bekliyor}
              onClick={() => calistir(() => projeBaglantiSil({ id: b.id }))}>Kaldır</button>
          </div>
        ))}
        {proje.baglantilar.length === 0 && <Bos baslik="Bağlantı yok" />}
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
    </div>
  );
}
