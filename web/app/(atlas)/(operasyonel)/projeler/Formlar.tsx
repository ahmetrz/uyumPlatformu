'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/abacus/temel';
import { useEylem } from '@/components/useEylem';
import { projeKaydet, projeBaglantiEkle, projeBaglantiSil } from '@/lib/eylemler';
import { PROJE_DURUMLARI, PROJE_DURUM_ETIKET } from '@/lib/sabitler';
import type { P, Kisi, Secenek } from './ortak';

/* Proje yazma yüzeyleri — MODAL YOK (06 §B4). Üçü de 420px çekmecede
   render edilir. Mutasyonlar lib/eylemler.ts'ten AYNEN çağrılır; imza
   değiştirilmez: `projeKaydet` kod/ad/açıklama/durum/hedef/sahip yazar,
   `projeBaglantiEkle` ve `projeBaglantiSil` bulgu–madde bağını yönetir. */

type FormDurumu = {
  id?: string; kod: string; ad: string; aciklama: string;
  durum: string; hedef: string; sahipId: string;
};

function formBaslat(proje: P | null, yeniKod: string): FormDurumu {
  if (!proje) return {
    kod: yeniKod, ad: '', aciklama: '', durum: 'planlandi', hedef: '', sahipId: '',
  };
  return {
    id: proje.id, kod: proje.kod, ad: proje.ad, aciklama: proje.aciklama ?? '',
    durum: proje.durum, hedef: proje.hedef?.slice(0, 10) ?? '',
    sahipId: proje.sahip?.id ?? '',
  };
}

export function ProjeFormu({ proje, yeniKod, kullanicilar, kapat }: {
  proje: P | null; yeniKod: string; kullanicilar: Kisi[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState<FormDurumu>(() => formBaslat(proje, yeniKod));
  const gecerli = !!f.kod.trim() && !!f.ad.trim();

  function kaydet() {
    calistir(() => projeKaydet({
      id: f.id, kod: f.kod, ad: f.ad, aciklama: f.aciklama.trim() || null,
      durum: f.durum, hedef: f.hedef || null, sahipId: f.sahipId || null,
    }), kapat);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Kod" zorunlu>
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={f.kod}
          onChange={(e) => setF({ ...f, kod: e.target.value })} />
      </Alan>
      <Alan etiket="Ad" zorunlu>
        <input className="ab-gr" value={f.ad} placeholder="Proje adı"
          onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </Alan>
      <Alan etiket="Açıklama">
        <textarea className="ab-gr" rows={3} value={f.aciklama}
          onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
      </Alan>
      <Alan etiket="Sahip">
        <select className="ab-gr" value={f.sahipId}
          onChange={(e) => setF({ ...f, sahipId: e.target.value })}>
          <option value="">atanmadı</option>
          {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Durum">
        <select className="ab-gr" value={f.durum}
          onChange={(e) => setF({ ...f, durum: e.target.value })}>
          {PROJE_DURUMLARI.map((d) => (
            <option key={d} value={d}>{PROJE_DURUM_ETIKET[d]}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Hedef tarih">
        <input className="ab-gr" type="date" value={f.hedef}
          onChange={(e) => setF({ ...f, hedef: e.target.value })} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" onClick={kaydet} disabled={bekliyor || !gecerli}>
          {f.id ? 'Kaydet' : 'Proje oluştur'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Faz takvimi ve bütçe satırları bu sürümde yalnız okunur; ikisi de
        planlama sisteminden gelir.
      </p>
    </div>
  );
}

/* ── Durum güncelle ─────────────────────────────────────────────────────
   Kaydın geri kalanı olduğu gibi geri yazılır: `projeKaydet` tam kayıt
   bekliyor, yalnız durum alanı gönderilirse ad ve hedef sıfırlanırdı. */

export function DurumFormu({ proje, kapat }: { proje: P; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [durum, setDurum] = useState(proje.durum);

  function kaydet() {
    calistir(() => projeKaydet({
      id: proje.id, kod: proje.kod, ad: proje.ad, aciklama: proje.aciklama,
      durum, hedef: proje.hedef, sahipId: proje.sahip?.id ?? null,
    }), kapat);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Durum" zorunlu>
        <select className="ab-gr" value={durum} onChange={(e) => setDurum(e.target.value)}>
          {PROJE_DURUMLARI.map((d) => (
            <option key={d} value={d}>{PROJE_DURUM_ETIKET[d]}</option>
          ))}
        </select>
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme tur="tam" onClick={kaydet} disabled={bekliyor || durum === proje.durum}>
        Durumu kaydet
      </Dugme>
      <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Durum değişimi denetim izine yazılır; faz takvimi bundan etkilenmez.
      </p>
    </div>
  );
}

/* ── Bağ yönetimi ───────────────────────────────────────────────────────
   Projenin varoluş gerekçesi buradan kurulur: kapattığı kontrol maddesi ve
   bulgu. Aynı bağ bulgu ekranından da görülür — çift yönlü okuma budur. */

export function BaglantiFormu({ proje, maddeler, bulgular, kapat }: {
  proje: P; maddeler: Secenek[]; bulgular: Secenek[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [maddeId, setMaddeId] = useState('');
  const [bulguId, setBulguId] = useState('');

  // Zaten bağlı kayıt listede kalmaz: aynı bağ ikinci kez yazılamaz (@@unique).
  const bagli = new Set(proje.baglantilar.map((b) => b.hedefId));

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Kontrol maddesi">
        <select className="ab-gr" value={maddeId} onChange={(e) => setMaddeId(e.target.value)}>
          <option value="">—</option>
          {maddeler.filter((m) => !bagli.has(m.id))
            .map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
        </select>
      </Alan>
      <Dugme onClick={() => calistir(
        () => projeBaglantiEkle({ projeId: proje.id, maddeId }), () => setMaddeId(''),
      )} disabled={bekliyor || !maddeId}>
        Maddeyi bağla
      </Dugme>

      <Alan etiket="Bulgu">
        <select className="ab-gr" value={bulguId} onChange={(e) => setBulguId(e.target.value)}>
          <option value="">—</option>
          {bulgular.filter((b) => !bagli.has(b.id))
            .map((b) => <option key={b.id} value={b.id}>{b.ad}</option>)}
        </select>
      </Alan>
      <Dugme onClick={() => calistir(
        () => projeBaglantiEkle({ projeId: proje.id, bulguId }), () => setBulguId(''),
      )} disabled={bekliyor || !bulguId}>
        Bulguyu bağla
      </Dugme>

      {proje.baglantilar.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--s10)',
          paddingTop: 'var(--s14)', borderTop: 'var(--bw-hair) solid var(--hr)' }}>
          {proje.baglantilar.map((b) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'baseline',
              gap: 'var(--s10)' }}>
              <span style={{ minWidth: 0, flex: 1, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: 'var(--t-cell)' }}>
                {b.kod}
              </span>
              <span style={{ fontFamily: 'var(--veri)', fontSize: 'var(--t-label)',
                color: 'var(--i3)' }}>{b.tur === 'madde' ? 'kontrol' : b.tur}</span>
              <button type="button" className="ab-dugme satir" disabled={bekliyor}
                onClick={() => calistir(() => projeBaglantiSil({ id: b.id }))}>
                Kaldır
              </button>
            </div>
          ))}
        </div>
      )}

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme onClick={kapat} disabled={bekliyor}>Bitti</Dugme>
    </div>
  );
}
