'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/atlas/temel';
import { useEylem } from '@/components/useEylem';
import { eslestirmeEkle, eslestirmeSil } from '@/lib/eylemler';
import { DENKLIKLER, DENKLIK_ETIKET } from '@/lib/sabitler';
import type { E, M } from './mantik';

/* Eşleme yazma yüzeyleri — MODAL YOK (06 §B4) ve `confirm()` YOK: tarayıcı
   diyaloğu da bir modaldır. Kaldırma iki adımlı satır içi onayla korunur.
   Mutasyonlar lib/eylemler.ts'ten AYNEN çağrılır. */

export function DenklikFormu({ kaynak, hedef, maddeler, kapat }: {
  /** matris hücresinden gelindiyse önceden dolu */
  kaynak: M | null;
  hedef: M | null;
  maddeler: M[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({
    kaynakId: kaynak?.id ?? '',
    hedefId: hedef?.id ?? '',
    denklik: 'kismi',
    aciklama: '',
  });
  const gecerli = !!f.kaynakId && !!f.hedefId && f.kaynakId !== f.hedefId;

  const secenek = (m: M) => `${m.regKod} · ${m.kisaKod} — ${m.baslik}`;

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Kaynak madde" zorunlu>
        <select className="gr" value={f.kaynakId}
          onChange={(e) => setF({ ...f, kaynakId: e.target.value })}>
          <option value="">—</option>
          {maddeler.map((m) => <option key={m.id} value={m.id}>{secenek(m)}</option>)}
        </select>
      </Alan>
      <Alan etiket="Hedef madde" zorunlu
        hata={f.kaynakId && f.kaynakId === f.hedefId
          ? 'Madde kendisiyle eşleştirilemez' : null}>
        <select className="gr" value={f.hedefId}
          onChange={(e) => setF({ ...f, hedefId: e.target.value })}>
          <option value="">—</option>
          {maddeler.filter((m) => m.id !== f.kaynakId)
            .map((m) => <option key={m.id} value={m.id}>{secenek(m)}</option>)}
        </select>
      </Alan>
      <Alan etiket="Denklik gücü" zorunlu>
        <select className="gr" value={f.denklik}
          onChange={(e) => setF({ ...f, denklik: e.target.value })}>
          {DENKLIKLER.map((d) => <option key={d} value={d}>{DENKLIK_ETIKET[d]}</option>)}
        </select>
      </Alan>
      <Alan etiket="Açıklama">
        <textarea className="gr" rows={2} value={f.aciklama}
          placeholder="Denklik hangi ölçüde geçerli, nerede ayrışıyor?"
          onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
      </Alan>

      {hata && <p className="gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => eslestirmeEkle({
            kaynakId: f.kaynakId, hedefId: f.hedefId,
            denklik: f.denklik, aciklama: f.aciklama || null,
          }), kapat)}>
          Denkliği kaydet
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="cekmece-dip" style={{ margin: 0 }}>
        Eşleme yönsüzdür: aynı kayıt iki çerçevede de görünür. Tam denklikte
        bir kanıt her iki maddeyi karşılar; kısmi ve ilgili denklikte kanıt
        yeniden değerlendirilmelidir.
      </p>
    </div>
  );
}

/** Kaldırma yıkıcıdır: iki adım ister, gerekçesi ekranda yazılıdır. */
export function DenklikKaldir({ es, kapat }: { es: E; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [onay, setOnay] = useState(false);

  if (!onay) {
    return (
      <Dugme tur="ret" onClick={() => setOnay(true)}>Denkliği kaldır</Dugme>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s10)' }}>
      <p className="cekmece-dip" style={{ margin: 0, color: 'var(--bd)' }}>
        {es.kaynak.kisaKod} ⇄ {es.hedef.kisaKod} denkliği kaldırılacak. Bu
        maddeler bundan sonra birbirinin kanıtını karşılamaz.
      </p>
      {hata && <p className="gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="ret" disabled={bekliyor}
          onClick={() => calistir(() => eslestirmeSil({ id: es.id }), kapat)}>
          Kaldır
        </Dugme>
        <Dugme onClick={() => setOnay(false)} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
    </div>
  );
}
