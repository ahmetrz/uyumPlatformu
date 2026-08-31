'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/atlas/temel';
import { useEylem } from '@/components/useEylem';
import {
  denetimKaydet, asamaIlerlet, asamaGeriAl,
  kanitTalebiEkle, kanitTalebiDurum, kapsamEkle, kapsamCikar,
} from '@/lib/eylemler2/denetim';
import { DENETIM_TIP_ETIKET } from '@/lib/sabitler';
import {
  asamaEtiketi, type Kisi, type Kodlu, type SurecSecenegi, type Talep,
} from './ortak';

/* Denetim yazma yüzeyleri — MODAL YOK (06 §B4). Hepsi 420px çekmecede
   render edilir. Mutasyonlar lib/eylemler2/denetim.ts'ten AYNEN çağrılır;
   imza değiştirilmez, doğrulama ve yetki sunucuda kalır. */

/* ── Yeni denetim ───────────────────────────────────────────────────── */

const BOS_DENETIM = {
  kod: '', ad: '', tip: 'ic_denetim', denetleyen: '',
  surecId: '', planBaslangic: '', planBitis: '',
};

export function DenetimFormu({ yeniKod, surecler, kapat }: {
  yeniKod: string; surecler: SurecSecenegi[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({ ...BOS_DENETIM, kod: yeniKod });
  const tersPencere = !!f.planBaslangic && !!f.planBitis && f.planBitis < f.planBaslangic;
  const gecerli = !!f.kod.trim() && !!f.ad.trim() && !tersPencere;

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Kod" zorunlu>
        <input className="gr" style={{ fontFamily: 'var(--mo)' }} value={f.kod}
          onChange={(e) => setF({ ...f, kod: e.target.value })} />
      </Alan>
      <Alan etiket="Ad" zorunlu>
        <input className="gr" value={f.ad} placeholder="Örn. 2026 EPDK bilgi güvenliği denetimi"
          onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </Alan>
      <Alan etiket="Tip">
        <select className="gr" value={f.tip}
          onChange={(e) => setF({ ...f, tip: e.target.value })}>
          {Object.entries(DENETIM_TIP_ETIKET).map(([t, e]) => (
            <option key={t} value={t}>{e}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Denetleyen">
        <input className="gr" value={f.denetleyen} placeholder="Kurum ya da firma"
          onChange={(e) => setF({ ...f, denetleyen: e.target.value })} />
      </Alan>
      <Alan etiket="Uyum süreci">
        <select className="gr" value={f.surecId}
          onChange={(e) => setF({ ...f, surecId: e.target.value })}>
          <option value="">süreç bağı yok</option>
          {surecler.map((s) => <option key={s.id} value={s.id}>{s.kod} — {s.ad}</option>)}
        </select>
      </Alan>
      <div style={{ display: 'grid', gap: 'var(--s12)',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Alan etiket="Plan başlangıcı">
          <input className="gr" type="date" value={f.planBaslangic}
            onChange={(e) => setF({ ...f, planBaslangic: e.target.value })} />
        </Alan>
        <Alan etiket="Plan bitişi"
          hata={tersPencere ? 'Bitiş başlangıçtan önce olamaz' : null}>
          <input className="gr" type="date" value={f.planBitis}
            onChange={(e) => setF({ ...f, planBitis: e.target.value })} />
        </Alan>
      </div>

      {hata && <p className="gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => denetimKaydet({
            kod: f.kod, ad: f.ad, tip: f.tip,
            denetleyen: f.denetleyen || null, surecId: f.surecId || null,
            planBaslangic: f.planBaslangic || null, planBitis: f.planBitis || null,
          }), kapat)}>
          Denetimi planla
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="cekmece-dip" style={{ margin: 0 }}>
        Yaşam döngüsü plan aşamasından başlar ve atlanamaz; her geçiş denetim izine yazılır.
      </p>
    </div>
  );
}

/* ── Aşama ilerlet / geri al ────────────────────────────────────────────
   İlerleme tek adımlıdır (sunucu atlamayı reddeder). Kapanış engeli
   ekranda ÖNCEDEN söylenir: kullanıcı düğmeye basıp hata almasın. */

export function AsamaEylemleri({
  id, sonraki, onceki, engel, ilerletebilir, geriAlabilir,
}: {
  id: string;
  sonraki: string | null;
  onceki: string | null;
  /** kapanışa geçişi engelleyen açık kayıtlar — yoksa null */
  engel: string | null;
  ilerletebilir: boolean;
  geriAlabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [geriAcik, setGeriAcik] = useState(false);
  const [gerekce, setGerekce] = useState('');

  if (!sonraki && !onceki) return null;

  return (
    <div style={{ display: 'grid', gap: 'var(--s12)' }}>
      {sonraki && ilerletebilir && (
        <Dugme tur="cekmece" disabled={bekliyor || !!engel}
          onClick={() => calistir(() => asamaIlerlet({ id }))}>
          Sonraki aşama · {asamaEtiketi(sonraki)}
        </Dugme>
      )}
      {engel && sonraki && (
        <p className="cekmece-dip" style={{ margin: 0, color: 'var(--bd)' }}>
          Kapanış için önce {engel} kapatılmalı.
        </p>
      )}

      {onceki && geriAlabilir && (geriAcik ? (
        <div style={{ display: 'grid', gap: 'var(--s12)' }}>
          <Alan etiket={`Geri alma gerekçesi · ${asamaEtiketi(onceki)}`} zorunlu>
            <textarea className="gr" rows={3} value={gerekce}
              placeholder="Aşama neden geri alınıyor?"
              onChange={(e) => setGerekce(e.target.value)} />
          </Alan>
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor || !gerekce.trim()}
              onClick={() => calistir(() => asamaGeriAl({ id, gerekce }),
                () => { setGeriAcik(false); setGerekce(''); })}>
              Geri al
            </Dugme>
            <Dugme onClick={() => setGeriAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
        </div>
      ) : (
        <Dugme onClick={() => setGeriAcik(true)} disabled={bekliyor}>
          Aşamayı geri al
        </Dugme>
      ))}

      {hata && <p className="gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
    </div>
  );
}

/* ── Kanıt talebi ekle ──────────────────────────────────────────────── */

const BOS_TALEP = { baslik: '', aciklama: '', sorumluId: '', sonTarih: '' };

export function TalepFormu({ denetimId, kullanicilar, kapat }: {
  denetimId: string; kullanicilar: Kisi[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState(BOS_TALEP);

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="İstenen kanıt" zorunlu>
        <input className="gr" value={f.baslik} placeholder="Talep başlığı"
          onChange={(e) => setF({ ...f, baslik: e.target.value })} />
      </Alan>
      <Alan etiket="Açıklama">
        <textarea className="gr" rows={2} value={f.aciklama}
          onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
      </Alan>
      <Alan etiket="Sorumlu">
        <select className="gr" value={f.sorumluId}
          onChange={(e) => setF({ ...f, sorumluId: e.target.value })}>
          <option value="">atanmadı</option>
          {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Son tarih">
        <input className="gr" type="date" value={f.sonTarih}
          onChange={(e) => setF({ ...f, sonTarih: e.target.value })} />
      </Alan>

      {hata && <p className="gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !f.baslik.trim()}
          onClick={() => calistir(() => kanitTalebiEkle({
            denetimId, baslik: f.baslik,
            aciklama: f.aciklama || null,
            sorumluId: f.sorumluId || null,
            sonTarih: f.sonTarih || null,
          }), kapat)}>
          Talebi ekle
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="cekmece-dip" style={{ margin: 0 }}>
        Son tarihi girilmeyen talebin gecikmesi ölçülemez — kuyrukta bilinmeyen kalır.
      </p>
    </div>
  );
}

/* ── Talep sonucu ───────────────────────────────────────────────────────
   "Sağlandı" bir kanıt kaydı ister: mevcut kanıt seçilir ya da verilen adla
   yenisi oluşturulup talebe bağlanır (sunucu ikisini de kabul eder). */

export function TalepSonucFormu({ talep, kanitlar, kapat }: {
  talep: Talep; kanitlar: { id: string; ad: string; tip: string }[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [kanitId, setKanitId] = useState(talep.kanit?.id ?? '');
  const [yeniAd, setYeniAd] = useState('');
  const saglanabilir = !!kanitId || !!yeniAd.trim();

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Mevcut kanıt">
        <select className="gr" value={kanitId}
          onChange={(e) => { setKanitId(e.target.value); setYeniAd(''); }}>
          <option value="">yeni kanıt oluşturulacak</option>
          {kanitlar.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
        </select>
      </Alan>
      {!kanitId && (
        <Alan etiket="Yeni kanıt adı">
          <input className="gr" value={yeniAd}
            placeholder="Örn. 2026 güvenlik duvarı kural seti raporu"
            onChange={(e) => setYeniAd(e.target.value)} />
        </Alan>
      )}

      {hata && <p className="gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme tur="cekmece" disabled={bekliyor || !saglanabilir}
        onClick={() => calistir(() => kanitTalebiDurum({
          id: talep.id, durum: 'saglandi',
          kanitId: kanitId || null, yeniKanitAd: yeniAd || null,
        }), kapat)}>
        Kanıt sağlandı
      </Dugme>
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        {talep.durum !== 'reddedildi' && (
          <Dugme tur="ret" disabled={bekliyor}
            onClick={() => calistir(() => kanitTalebiDurum({
              id: talep.id, durum: 'reddedildi',
            }), kapat)}>
            Talebi reddet
          </Dugme>
        )}
        {talep.durum !== 'acik' && (
          <Dugme disabled={bekliyor}
            onClick={() => calistir(() => kanitTalebiDurum({
              id: talep.id, durum: 'acik',
            }), kapat)}>
            Yeniden aç
          </Dugme>
        )}
      </div>
      <p className="cekmece-dip" style={{ margin: 0 }}>
        Sağlandı dışındaki her geçişte kanıt bağı çözülür; değişim denetim izine yazılır.
      </p>
    </div>
  );
}

/* ── Kapsam ─────────────────────────────────────────────────────────────
   Kapsam bir yapılandırmadır, iş kuyruğu değil: canvasta değil çekmecede
   yaşar. Tesis eklemede sunucu ayrıca o santralin yazma yetkisini arar. */

export function KapsamPaneli({
  denetimId, tesisler, maddeler, kapsamlar, kilitli,
}: {
  denetimId: string;
  tesisler: Kodlu[];
  maddeler: { id: string; kod: string; baslik: string }[];
  kapsamlar: {
    id: string;
    tesis: Kodlu | null;
    madde: { id: string; kod: string; baslik: string } | null;
  }[];
  /** kapanmış denetimin kapsamı değiştirilemez (sunucu da reddeder) */
  kilitli: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [tesisId, setTesisId] = useState('');
  const [maddeId, setMaddeId] = useState('');

  const bosTesisler = tesisler.filter((t) => !kapsamlar.some((k) => k.tesis?.id === t.id));
  const bosMaddeler = maddeler.filter((m) => !kapsamlar.some((k) => k.madde?.id === m.id));

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <div>
        {kapsamlar.length === 0 ? (
          <p className="cekmece-dip" style={{ margin: 0 }}>
            Kapsam girilmedi — denetim portföyün tamamı sayılır.
          </p>
        ) : kapsamlar.map((k) => (
          <div key={k.id} className="cekmece-alan">
            <span className="etiket">{k.tesis?.kod ?? k.madde?.kod}</span>
            <span className="deger" style={{ display: 'flex', alignItems: 'baseline',
              gap: 'var(--s10)', minWidth: 0 }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden',
                textOverflow: 'ellipsis' }}>
                {k.tesis?.ad ?? k.madde?.baslik}
              </span>
              {!kilitli && (
                <button type="button" className="dg dg-satir" disabled={bekliyor}
                  aria-label={`${k.tesis?.kod ?? k.madde?.kod} kapsamdan çıkar`}
                  onClick={() => calistir(() => kapsamCikar({ id: k.id }))}>✕</button>
              )}
            </span>
          </div>
        ))}
      </div>

      {!kilitli && (
        <>
          <Alan etiket="Santral ekle">
            <select className="gr" value={tesisId}
              onChange={(e) => { setTesisId(e.target.value); setMaddeId(''); }}>
              <option value="">—</option>
              {bosTesisler.map((t) => (
                <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>
              ))}
            </select>
          </Alan>
          <Alan etiket="Madde ekle">
            <select className="gr" value={maddeId}
              onChange={(e) => { setMaddeId(e.target.value); setTesisId(''); }}>
              <option value="">—</option>
              {bosMaddeler.map((m) => (
                <option key={m.id} value={m.id}>{m.kod} — {m.baslik}</option>
              ))}
            </select>
          </Alan>
          <Dugme tur="birincil" disabled={bekliyor || (!tesisId && !maddeId)}
            onClick={() => calistir(() => kapsamEkle({
              denetimId, tesisId: tesisId || null, maddeId: maddeId || null,
            }), () => { setTesisId(''); setMaddeId(''); })}>
            Kapsama ekle
          </Dugme>
        </>
      )}

      {hata && <p className="gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
    </div>
  );
}
