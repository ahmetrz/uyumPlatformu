'use client';
import { useState, useTransition } from 'react';
import { girisYap } from '@/lib/girisEylemleri';

export default function GirisFormu() {
  const [v, setV] = useState({ eposta: '', parola: '' });
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();

  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
      onSubmit={(e) => {
        e.preventDefault();
        baslat(async () => {
          const sonuc = await girisYap(v);
          if (sonuc && !sonuc.ok) setHata(sonuc.hata);
        });
      }}>
      <label className="form-satir"><span>E-posta</span>
        <input className="inp" type="email" autoComplete="username" required
          value={v.eposta} onChange={(e) => setV({ ...v, eposta: e.target.value })} />
      </label>
      <label className="form-satir"><span>Parola</span>
        <input className="inp" type="password" autoComplete="current-password" required
          value={v.parola} onChange={(e) => setV({ ...v, parola: e.target.value })} />
      </label>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
      <button className="btn birincil" disabled={bekliyor} type="submit">
        {bekliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
    </form>
  );
}
