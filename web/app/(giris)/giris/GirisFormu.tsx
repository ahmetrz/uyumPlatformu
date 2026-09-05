'use client';
import { useState, useTransition } from 'react';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { girisYap } from '@/lib/girisEylemleri';

/* Giriş formu — paylaşılan form grameri (`Alan` primitifi): etiket 9.5px mono, girdi
   köşeli ve tek kenarlı, hata kırmızı tek satır. Pill yok, snackbar yok.

   `next` sunucudan (page.tsx → searchParams) gelir ve eyleme olduğu gibi
   iletilir; süzme SUNUCUDA yapılır (`guvenliHedef`). İstemcide süzmek
   yetmezdi: eylem doğrudan da çağrılabilir. */

export default function GirisFormu({ next = null }: { next?: string | null }) {
  const [v, setV] = useState({ eposta: '', parola: '' });
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, baslat] = useTransition();

  return (
    <form
      style={{ display: 'grid', gap: 'var(--s16)' }}
      onSubmit={(e) => {
        e.preventDefault();
        baslat(async () => {
          const sonuc = await girisYap({ ...v, next });
          if (sonuc && !sonuc.ok) setHata(sonuc.hata);
        });
      }}
    >
      <Alan etiket="E-posta" zorunlu>
        <input className="ab-gr" type="email" autoComplete="username" required
          style={{ fontFamily: 'var(--veri)' }}
          value={v.eposta} onChange={(e) => setV({ ...v, eposta: e.target.value })} />
      </Alan>
      <Alan etiket="Parola" zorunlu>
        <input className="ab-gr" type="password" autoComplete="current-password" required
          value={v.parola} onChange={(e) => setV({ ...v, parola: e.target.value })} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme tur="tam" type="submit" disabled={bekliyor}>
        {bekliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </Dugme>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Her oturum açılışı denetim izine yazılır.
        {next ? ` Girişten sonra ${next} ekranına dönülür.` : ''}
      </p>
    </form>
  );
}
