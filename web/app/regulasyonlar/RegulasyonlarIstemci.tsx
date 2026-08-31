'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Kip from '@/components/Kip';
import { Bos, Pill } from '@/components/ui';
import { useEylem } from '@/components/useEylem';
import { maddeKaydet, maddeSil, maddeAlanAta } from '@/lib/eylemler';
import { surumOlustur, surumAktiflestir } from '@/lib/eylemler2/surum';

type Madde = {
  id: string; kod: string; baslik: string; metin: string;
  ustMaddeId: string | null; kanitTipi: string | null;
  alanlar: { id: string; kod: string }[]; altSayisi: number; kullanimSayisi: number;
};
type Surum = { id: string; etiket: string; durum: string; maddeSayisi: number;
  yururluk: string | null;
  farklar: { kod: string; tip: string; ozet: string | null; etki: string | null }[] };
type Reg = { id: string; kod: string; ad: string; surum: string | null; aktif: boolean;
  surecSayisi: number; maddeler: Madde[]; surumler: Surum[] };

export default function RegulasyonlarIstemci({ regulasyonlar, alanlar }: {
  regulasyonlar: Reg[]; alanlar: { id: string; kod: string; ad: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [secili, setSecili] = useState(regulasyonlar[0]?.id ?? '');
  const [arama, setArama] = useState('');
  const [duzenlenen, setDuzenlenen] = useState<Madde | 'yeni' | null>(null);

  const reg = regulasyonlar.find((r) => r.id === secili);
  const cocuklar = useMemo(() => {
    const m = new Map<string | null, Madde[]>();
    for (const md of reg?.maddeler ?? []) {
      const l = m.get(md.ustMaddeId) ?? []; l.push(md); m.set(md.ustMaddeId, l);
    }
    return m;
  }, [reg]);

  const eslesiyor = (m: Madde): boolean =>
    !arama || `${m.kod} ${m.baslik}`.toLocaleLowerCase('tr-TR')
      .includes(arama.toLocaleLowerCase('tr-TR'))
    || (cocuklar.get(m.id) ?? []).some(eslesiyor);

  function Dal({ madde, derinlik }: { madde: Madde; derinlik: number }) {
    const altlar = (cocuklar.get(madde.id) ?? []).filter(eslesiyor);
    return (
      <>
        <div className="satir" style={{ paddingLeft: `calc(var(--sp-4) + ${derinlik} * var(--sp-6))` }}>
          <span className="chip mono">{madde.kod}</span>
          <span style={{ flex: 1, minWidth: 0, fontWeight: madde.altSayisi > 0 ? 600 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={madde.metin}>
            {madde.baslik}
          </span>
          <span className="filtreler" style={{ flexWrap: 'nowrap' }}>
            {madde.alanlar.map((a) => <span key={a.id} className="chip">{a.kod}</span>)}
            {madde.alanlar.length === 0 && madde.altSayisi === 0 &&
              <Pill durum="kismi" etiket="alan eşleşmemiş" />}
          </span>
          <span className="filtreler sirada-gizli" style={{ flexWrap: 'nowrap' }}>
            <button className="btn kucuk" onClick={() => setDuzenlenen(madde)}>Düzenle</button>
            {madde.altSayisi === 0 && madde.kullanimSayisi === 0 && (
              <button className="btn kucuk tehlike" disabled={bekliyor}
                onClick={() => { if (confirm(`${madde.kod} silinsin mi?`))
                  calistir(() => maddeSil({ id: madde.id })); }}>Sil</button>
            )}
          </span>
        </div>
        {altlar.map((a) => <Dal key={a.id} madde={a} derinlik={derinlik + 1} />)}
      </>
    );
  }

  return (
    <>
      <div className="filtreler">
        {regulasyonlar.map((r) => (
          <button key={r.id} className={`btn${secili === r.id ? ' birincil' : ''}`}
            onClick={() => setSecili(r.id)}>
            {r.kod} <span className="mono" style={{ opacity: .7 }}>({r.maddeler.length})</span>
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <input className="inp" placeholder="Madde ara…" value={arama}
          onChange={(e) => setArama(e.target.value)} />
        <button className="btn birincil" onClick={() => setDuzenlenen('yeni')}>+ Madde</button>
      </div>

      {reg && (
        <div className="kart">
          <div className="kart-baslik">
            <div><span className="mikro-etiket">{reg.kod} {reg.surum && `· ${reg.surum}`}</span>
              <h3 style={{ marginTop: 2 }}>{reg.ad}</h3></div>
            <span className="mikro-etiket">{reg.surecSayisi} SÜREÇTE KULLANILIYOR ·{' '}
              <Link href="/ice-aktarim" style={{ color: 'var(--accent)' }}>İÇE AKTAR ⤓</Link></span>
          </div>
          <div className="kart-icerik sifir">
            {(cocuklar.get(null) ?? []).filter(eslesiyor).map((m) => (
              <Dal key={m.id} madde={m} derinlik={0} />
            ))}
            {(cocuklar.get(null) ?? []).filter(eslesiyor).length === 0 && (
              <Bos baslik="Madde yok"
                altMetin="Excel içe aktarımı veya + Madde ile başlayın."
                eylem={<Link className="btn birincil" href="/ice-aktarim">⤓ İçe aktar</Link>} />
            )}
          </div>
        </div>
      )}
      {reg && <SurumBolumu reg={reg} />}
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      <Kip acik={duzenlenen !== null} kapat={() => setDuzenlenen(null)} genis
        baslik={duzenlenen === 'yeni' ? 'Yeni madde' : `Maddeyi düzenle — ${duzenlenen?.kod ?? ''}`}
        ust={<span className="mikro-etiket">{reg?.kod}</span>}>
        {reg && (
          <MaddeFormu key={duzenlenen === 'yeni' ? 'yeni' : duzenlenen?.id ?? 'm'}
            madde={duzenlenen === 'yeni' ? null : duzenlenen}
            regId={reg.id} maddeler={reg.maddeler} alanlar={alanlar}
            kapat={() => setDuzenlenen(null)} />
        )}
      </Kip>
    </>
  );
}

function MaddeFormu({ madde, regId, maddeler, alanlar, kapat }: {
  madde: Madde | null; regId: string; maddeler: Madde[];
  alanlar: { id: string; kod: string; ad: string }[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState({
    kod: madde?.kod ?? '', baslik: madde?.baslik ?? '', metin: madde?.metin ?? '',
    ustMaddeId: madde?.ustMaddeId ?? '', kanitTipi: madde?.kanitTipi ?? '',
    alanIdler: madde?.alanlar.map((a) => a.id) ?? [] as string[],
  });

  return (
    <>
      <div className="form-izgara">
        <label className="form-satir"><span>Kod</span>
          <input className="inp" value={v.kod} placeholder="EPDK-SYM-4.3"
            onChange={(e) => setV({ ...v, kod: e.target.value })} /></label>
        <label className="form-satir"><span>Üst madde</span>
          <select className="sec" value={v.ustMaddeId}
            onChange={(e) => setV({ ...v, ustMaddeId: e.target.value })}>
            <option value="">Kök seviye</option>
            {maddeler.filter((m) => m.id !== madde?.id).map((m) =>
              <option key={m.id} value={m.id}>{m.kod} — {m.baslik}</option>)}
          </select></label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Başlık</span>
          <input className="inp" value={v.baslik}
            onChange={(e) => setV({ ...v, baslik: e.target.value })} /></label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Metin</span>
          <textarea className="inp" rows={3} value={v.metin}
            onChange={(e) => setV({ ...v, metin: e.target.value })} /></label>
        <label className="form-satir"><span>Kanıt tipi</span>
          <select className="sec" value={v.kanitTipi}
            onChange={(e) => setV({ ...v, kanitTipi: e.target.value })}>
            <option value="">—</option>
            {['politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor'].map((t) =>
              <option key={t} value={t}>{t}</option>)}
          </select></label>
        <div className="form-satir"><span>Kapsam alanları</span>
          <div className="filtreler">
            {alanlar.map((a) => {
              const secildi = v.alanIdler.includes(a.id);
              return (
                <button key={a.id} className={`btn kucuk${secildi ? ' birincil' : ''}`}
                  title={a.ad}
                  onClick={() => setV({ ...v, alanIdler: secildi
                    ? v.alanIdler.filter((x) => x !== a.id)
                    : [...v.alanIdler, a.id] })}>
                  {a.kod}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert" style={{ marginTop: 'var(--sp-3)' }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', justifyContent: 'flex-end' }}>
        {madde && (
          <button className="btn" disabled={bekliyor}
            onClick={() => calistir(() => maddeAlanAta({
              maddeId: madde.id, alanIdler: v.alanIdler }), kapat)}>
            Yalnızca alanları kaydet
          </button>
        )}
        <button className="btn" onClick={kapat}>Vazgeç</button>
        <button className="btn birincil" disabled={bekliyor}
          onClick={() => calistir(() => maddeKaydet({
            id: madde?.id, regulasyonId: regId, kod: v.kod, baslik: v.baslik,
            metin: v.metin, ustMaddeId: v.ustMaddeId || null,
            kanitTipi: v.kanitTipi || null, alanIdler: v.alanIdler }), kapat)}>
          Kaydet
        </button>
      </div>
    </>
  );
}


const FARK_ETIKET: Record<string, { ad: string; renk: string }> = {
  yeni: { ad: 'Yeni', renk: 'uyumlu' },
  degisti: { ad: 'Değişti', renk: 'kismi' },
  kaldirildi: { ad: 'Kaldırıldı', renk: 'uyumsuz' },
  ayni: { ad: 'Aynı', renk: 'kapsamdisi' },
};

function SurumBolumu({ reg }: { reg: Reg }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [etiket, setEtiket] = useState('');
  const [farkAcik, setFarkAcik] = useState<Surum | null>(null);

  return (
    <div className="kart">
      <div className="kart-baslik">
        <div>
          <span className="mikro-etiket">SÜRÜM YAŞAM DÖNGÜSÜ — YENİ SÜRÜM ESKİYİ EZMEZ, DIFF ÜRETİR (§42)</span>
          <h3 style={{ marginTop: 2 }}>Sürümler</h3>
        </div>
        <input className="inp" placeholder="Yeni sürüm etiketi (örn. 2027)" value={etiket}
          onChange={(e) => setEtiket(e.target.value)} style={{ maxWidth: 200 }} />
        <button className="btn birincil kucuk" disabled={bekliyor || !etiket}
          onClick={() => calistir(() => surumOlustur({ regulasyonId: reg.id, etiket }),
            () => setEtiket(''))}>
          + Taslak sürüm
        </button>
      </div>
      <div className="kart-icerik sifir">
        {reg.surumler.map((sv) => (
          <div key={sv.id} className="satir">
            <span className="chip mono">{sv.etiket}</span>
            <Pill durum={sv.durum === 'aktif' ? 'uyumlu' : sv.durum === 'taslak' ? 'incelemede' : 'kapsamdisi'}
              etiket={sv.durum === 'aktif' ? 'Aktif' : sv.durum === 'taslak' ? 'Taslak' : 'Arşiv'} />
            <span className="mikro-etiket">{sv.maddeSayisi} MADDE</span>
            <span style={{ flex: 1 }} />
            {sv.farklar.length > 0 && (
              <button className="btn kucuk" onClick={() => setFarkAcik(sv)}>
                Δ {sv.farklar.filter((f) => f.tip !== 'ayni').length} fark
              </button>
            )}
            {sv.durum === 'taslak' && (
              <button className="btn kucuk birincil sirada-gizli" disabled={bekliyor}
                onClick={() => {
                  if (confirm(`${sv.etiket} aktifleştirilsin mi? Eski sürüm arşive iner, diff üretilir, değişen maddeler için yeni değerlendirmeler açılır.`))
                    calistir(() => surumAktiflestir({ surumId: sv.id }));
                }}>
                Aktifleştir
              </button>
            )}
          </div>
        ))}
        {reg.surumler.length === 0 && (
          <Bos baslik="Sürüm kaydı yok"
            altMetin="Maddeler geçiş dönemi (sürümsüz) kayıtlar olarak duruyor. Taslak sürüm açınca kopyalanır." />
        )}
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert"
        style={{ margin: 'var(--sp-3) var(--sp-5)' }}>{hata}</p>}

      <Kip acik={!!farkAcik} kapat={() => setFarkAcik(null)} genis
        baslik={`Sürüm farkları — ${farkAcik?.etiket ?? ''}`}
        ust={<span className="mikro-etiket">REGÜLASYON DEĞİŞİRSE NE OLUR (§66): eski değerlendirmeler korunur; değişen maddeler yeni değerlendirme ister</span>}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {farkAcik?.farklar.filter((f) => f.tip !== 'ayni').map((f, i) => (
            <div key={i} className="satir" style={{ padding: 'var(--sp-2) 0' }}>
              <Pill durum={(FARK_ETIKET[f.tip]?.renk ?? 'incelemede') as Parameters<typeof Pill>[0]['durum']}
                etiket={FARK_ETIKET[f.tip]?.ad ?? f.tip} />
              <span className="chip mono">{f.kod}</span>
              <span style={{ flex: 1, color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>{f.ozet}</span>
              {f.etki && <span className="mikro-etiket">{f.etki}</span>}
            </div>
          ))}
          {farkAcik && farkAcik.farklar.filter((f) => f.tip !== 'ayni').length === 0 && (
            <Bos baslik="İçerik farkı yok" />
          )}
        </div>
      </Kip>
    </div>
  );
}
