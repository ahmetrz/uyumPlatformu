'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import { kullaniciKaydet, yetkiVer } from '@/lib/eylemler';
import { parolaBelirle } from '@/lib/eylemler2/hesap';
import { ROLLER, ROL_ETIKET } from '@/lib/sabitler';
import { PAROLA_EN_AZ, parolaKusuru } from '../ayarlar/mantik';
import type { Hesap, Secenek } from './mantik';

/* Yetki yazma yüzeyleri — MODAL YOK (06 §B4): ikisi de 420px çekmecede
   açılır. Mutasyonlar lib/eylemler.ts'ten AYNEN çağrılır; imza değişmez. */

export function KullaniciFormu({ hesap, kapat }: { hesap: Hesap | null; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({
    adSoyad: hesap?.ad ?? '',
    eposta: hesap?.eposta ?? '',
    unvan: hesap?.unvan ?? '',
  });
  const gecerli = !!f.adSoyad.trim() && !!f.eposta.trim();

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Ad soyad" zorunlu>
        <input className="ab-gr" value={f.adSoyad}
          onChange={(e) => setF({ ...f, adSoyad: e.target.value })} />
      </Alan>
      <Alan etiket="E-posta" zorunlu>
        <input className="ab-gr" type="email" style={{ fontFamily: 'var(--veri)' }}
          value={f.eposta} onChange={(e) => setF({ ...f, eposta: e.target.value })} />
      </Alan>
      <Alan etiket="Unvan">
        <input className="ab-gr" value={f.unvan} placeholder="bilinmiyor"
          onChange={(e) => setF({ ...f, unvan: e.target.value })} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => kullaniciKaydet({
            id: hesap?.id, eposta: f.eposta, adSoyad: f.adSoyad,
            unvan: f.unvan.trim() || null,
          }), kapat)}>
          {hesap ? 'Kaydet' : 'Kullanıcı oluştur'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Kullanıcı oluşturmak erişim vermez: yetki ayrı verilir ve denetim izine yazılır.
      </p>
    </div>
  );
}

/* Yetki verme: üç eksen de boş bırakılabilir ve boş eksen "tümü" demektir —
   bu yüzden seçim ekranda açıkça yazılır, kullanıcı ne verdiğini görür. */

export function YetkiFormu({ hesap, surecler, tesisler, kisitliKapsam, kapat }: {
  hesap: Hesap;
  surecler: Secenek[];
  tesisler: Secenek[];
  kisitliKapsam: boolean;
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({ surecId: '', tesisId: '', rol: 'okuyucu' });

  const surecAdi = surecler.find((s) => s.id === f.surecId)?.ad ?? 'tüm süreçler';
  const tesisAdi = tesisler.find((t) => t.id === f.tesisId)?.ad ?? 'tüm santraller';

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Rol" zorunlu>
        <select className="ab-gr" value={f.rol}
          onChange={(e) => setF({ ...f, rol: e.target.value })}>
          {ROLLER.map((r) => <option key={r} value={r}>{ROL_ETIKET[r]}</option>)}
        </select>
      </Alan>
      <Alan etiket="Uyum süreci">
        <select className="ab-gr" value={f.surecId}
          onChange={(e) => setF({ ...f, surecId: e.target.value })}>
          <option value="">tüm süreçler</option>
          {surecler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Santral">
        <select className="ab-gr" value={f.tesisId}
          onChange={(e) => setF({ ...f, tesisId: e.target.value })}>
          <option value="">tüm santraller</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
        </select>
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme tur="tam" disabled={bekliyor}
        onClick={() => calistir(() => yetkiVer({
          kullaniciId: hesap.id,
          surecId: f.surecId || null,
          tesisId: f.tesisId || null,
          rol: f.rol,
        }), kapat)}>
        {bekliyor ? 'Veriliyor…' : 'Yetkiyi ver'}
      </Dugme>
      <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        {`${hesap.ad} · ${ROL_ETIKET[f.rol as keyof typeof ROL_ETIKET]} · ${surecAdi} · ${tesisAdi}`}
        {!f.surecId && !f.tesisId
          && ' — kapsam boş bırakıldı: yetki portföyün tamamına uygulanır.'}
        {kisitliKapsam && ' Santral listesi kendi kapsamınızla sınırlıdır.'}
      </p>
    </div>
  );
}

/* Parola tanımlama (D26): yönetici bir hesaba ilk parolayı verir ya da
   sıfırlar. Parola ekrandan sunucuya bir kez gider; tarayıcıda tutulmaz,
   izde görünmez. Onaylanınca o hesabın TÜM açık oturumları düşer — form
   bunu saklamaz, altına yazar. */

export function ParolaFormu({ hesap, kapat }: { hesap: Hesap; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [parola, setParola] = useState('');
  const [tekrar, setTekrar] = useState('');
  const kusur = parolaKusuru(parola);
  const uyusmuyor = tekrar.length > 0 && tekrar !== parola;
  const gecerli = parola.length >= PAROLA_EN_AZ && tekrar === parola;

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket={hesap.parolaVar ? 'Yeni parola' : 'İlk parola'} zorunlu hata={kusur ?? undefined}>
        <input className="ab-gr" type="password" autoComplete="new-password"
          style={{ fontFamily: 'var(--veri)' }} value={parola}
          onChange={(e) => setParola(e.target.value)} />
      </Alan>
      <Alan etiket="Parola (tekrar)" zorunlu hata={uyusmuyor ? 'İki parola aynı değil' : undefined}>
        <input className="ab-gr" type="password" autoComplete="new-password"
          style={{ fontFamily: 'var(--veri)' }} value={tekrar}
          onChange={(e) => setTekrar(e.target.value)} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(
            () => parolaBelirle({ kullaniciId: hesap.id, parola }),
            () => { setParola(''); setTekrar(''); kapat(); },
          )}>
          {bekliyor ? 'Kaydediliyor…' : (hesap.parolaVar ? 'Parolayı sıfırla' : 'Parolayı tanımla')}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        {`${hesap.ad} · en az ${PAROLA_EN_AZ} karakter. `}
        {hesap.parolaVar
          ? 'Kaydedilince bu hesabın açık oturumlarının tamamı kapanır; kişi yeni parolayla girer. '
          : 'Bu hesap şu an giriş yapamaz; parola tanımlanınca yapar. '}
        {'Parola denetim izine yazılmaz, yalnız "kim, kime, ne zaman" yazılır.'}
      </p>
    </div>
  );
}
