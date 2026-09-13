'use client';
import { useState } from 'react';
import { Alan, Dugme, Im } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import { mfaDogrula, mfaKaldir, mfaKur } from '@/lib/eylemler2/mfa';

/* P6 · ÇOK ADIMLI DOĞRULAMA — kullanıcının KENDİ kaydı.

   ── SIR BİR KEZ GÖRÜNÜR ───────────────────────────────────────────────
   Kaydolma sırrı yalnız kurulum anında, yalnız bu ekranda görünür.
   Sunucu onu şifreli saklar; ikinci kez göstermek için çözmek gerekirdi
   ve ürün bunu yapmaz. Kullanıcı sırrı kaybederse kayıt YENİDEN kurulur.

   ── KURTARMA KODLARI DA BİR KEZ ───────────────────────────────────────
   Veritabanında yalnız ÖZETLERİ durur. "Tekrar göster" düğmesi YOKTUR
   ve olmayacak: gösterilebilen bir kurtarma kodu, ikinci faktörü
   veritabanı yedeğine indirger.

   ── QR YOK, METİN VAR ─────────────────────────────────────────────────
   QR üretmek bir çizim kütüphanesi ister; `otpauth://` adresi ve base32
   sır, her doğrulayıcı uygulamada elle girilebilir. Eksik değil,
   kapsam kararıdır ve burada yazılıdır. */

export default function MfaKarti({ kurulu, anahtarVar, anahtarNotu, zorunlu }: {
  kurulu: boolean; anahtarVar: boolean; anahtarNotu: string; zorunlu: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [sir, setSir] = useState<{ sirBase32: string; uri: string } | null>(null);
  const [kod, setKod] = useState('');
  const [kurtarma, setKurtarma] = useState<string[] | null>(null);
  const [yerelHata, setYerelHata] = useState<string | null>(null);

  const durum = kurulu ? 'ok' : (anahtarVar ? 'md' : 'unk');

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Çok adımlı doğrulama
      </p>

      <p className={`ikincil d-${durum}`} style={{ margin: '0 0 var(--s10)' }}>
        <Im durum={durum} ad="MFA durumu" />{' '}
        {kurulu
          ? 'Doğrulanmış TOTP kaydınız var.'
          : anahtarVar
            ? 'Kayıtlı değil.' + (zorunlu ? ' Bu kurulumda MFA ZORUNLU.' : '')
            /* BAĞLI DEĞİL SESSİZ DEĞİLDİR: eksiği adıyla söyler. */
            : `Bu kurulumda çok adımlı doğrulama bağlı değil: ${anahtarNotu}`}
      </p>

      {kurtarma && (
        <div style={{ marginBottom: 'var(--s12)' }}>
          <p className="ikincil" style={{ margin: '0 0 var(--s6)' }}>
            Kurtarma kodları — BİR KEZ gösterilir, her biri BİR KEZ kullanılır.
            Şimdi güvenli bir yere alın.
          </p>
          <p className="mono" style={{ margin: 0, lineHeight: 1.7 }}>
            {kurtarma.join(' · ')}
          </p>
        </div>
      )}

      {sir && !kurulu && (
        <div style={{ marginBottom: 'var(--s12)' }}>
          <p className="ikincil" style={{ margin: '0 0 var(--s6)' }}>
            Doğrulayıcı uygulamanıza bu sırrı girin, sonra ürettiği kodu yazın.
            Sır BİR KEZ görünür.
          </p>
          <p className="mono" style={{ margin: '0 0 var(--s10)', wordBreak: 'break-all' }}>
            {sir.sirBase32}
          </p>
          <Alan etiket="Doğrulayıcıdaki kod">
            <input className="ab-girdi" inputMode="numeric" value={kod} disabled={bekliyor}
              onChange={(e) => setKod(e.target.value)} />
          </Alan>
          <div style={{ marginTop: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(async () => {
                const r = await mfaDogrula({ kod });
                if (r.ok) { setKurtarma(r.kurtarmaKodlari); setSir(null); setKod(''); }
                return r.ok ? { ok: true } : { ok: false, hata: r.hata };
              })}>
              {bekliyor ? 'İşleniyor…' : 'Kodu doğrula'}
            </Dugme>
          </div>
        </div>
      )}

      {!sir && (
        <div style={{ display: 'flex', gap: 'var(--s8)' }}>
          {!kurulu && anahtarVar && (
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(async () => {
                setYerelHata(null);
                const r = await mfaKur();
                if (r.ok) setSir({ sirBase32: r.sirBase32, uri: r.uri });
                else setYerelHata(r.hata);
                return { ok: true };
              })}>
              {bekliyor ? 'İşleniyor…' : 'MFA kaydı aç'}
            </Dugme>
          )}
          {kurulu && (
            <Dugme disabled={bekliyor || zorunlu}
              onClick={() => calistir(() => mfaKaldir())}>
              Kaydı kaldır
            </Dugme>
          )}
        </div>
      )}

      <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
        {hata ?? yerelHata ?? (zorunlu && kurulu
          ? 'Bu kurulumda MFA zorunlu — kaydınızı kaldıramazsınız.'
          : 'Sır, veritabanında ŞİFRELİ durur; şifreleme anahtarı veritabanında'
            + ' değildir. QR yerine metin sır kullanılır ve her doğrulayıcı'
            + ' uygulamada elle girilebilir.')}
      </p>
    </div>
  );
}
