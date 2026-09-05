'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { CekmeceEylemler } from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { tumIsleriCalistir, tekIsCalistir } from '@/lib/eylemler2/isler';
import { veriKalitesiBulgusuKapat } from '@/lib/eylemler2/varlikDurusu';
import { sonKosu, type KaliteBulgusu, type Motor } from './mantik';

/* Motor tetikleme yüzeyleri. Mutasyonlar lib/eylemler2/isler.ts'ten AYNEN
   çağrılır: motor çalıştırmak `yonetim/yazma` ister ve yetki sunucuda
   denetlenir — buradaki `yazabilir` yalnız yüzeyi kapatır, kapıyı değil.

   Snackbar YOK: sonuç ya hata satırı olarak yazılır ya da koşu kaydı
   tabloda kendiliğinden belirir (useEylem başarıda router.refresh çağırır). */

export function TumunuCalistir({ yazabilir }: { yazabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();

  if (!yazabilir) {
    return (
      <span className="etiket" style={{ alignSelf: 'center' }}>
        Motor çalıştırmak yönetim yazma yetkisi ister
      </span>
    );
  }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s12)' }}>
      {hata && (
        <span className="etiket" role="alert" style={{ color: 'var(--bd)', maxWidth: 320 }}>
          {hata}
        </span>
      )}
      <button type="button" className="ab-dugme ab-baskida-gizle" disabled={bekliyor}
        onClick={() => calistir(() => tumIsleriCalistir())}>
        {bekliyor ? '▸ Koşuyor…' : '▸ Tümünü çalıştır'}
      </button>
    </span>
  );
}

/** Tek motorun çekmece eylemi. Zincirden koşan motorlar elle tetiklenmez —
    düğme yerine nedenini yazan bir dip not gösterilir (sunucu da reddeder). */
export function MotorCalistir({ motor, yazabilir }: { motor: Motor; yazabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const s = sonKosu(motor);
  const kosuyor = s?.durum === 'calisiyor';

  if (!motor.elleCalisir) {
    return (
      <CekmeceEylemler dipNot={'Bu motor entegrasyon zincirinden koşar; elle '
        + 'tetiklenmez ama koşuları burada görünür.'} />
    );
  }
  if (!yazabilir) {
    return (
      <CekmeceEylemler dipNot="Motor çalıştırmak yönetim yazma yetkisi ister." />
    );
  }

  return (
    <CekmeceEylemler
      birincil={
        <Dugme tur="tam" disabled={bekliyor || kosuyor}
          onClick={() => calistir(() => tekIsCalistir(motor.ad))}>
          {bekliyor ? 'Koşuyor…' : 'Motoru çalıştır'}
        </Dugme>
      }
      dipNot={hata ?? (kosuyor
        ? 'Koşu sürerken yeni koşu başlatılamaz.'
        : 'Her koşu bir IsKosusu satırı bırakır; başarısız koşu da sessiz kalmaz.')}
    />
  );
}

/* ── OT-44 · Veri kalitesi bulgusunu karara bağla ─────────────────────

   Bulgu iki yoldan kapanır ve ikisi AYNI ŞEY DEĞİLDİR:

     GİDERİLDİ    — boşluk kapatıldı, veri artık doğru.
     KABUL EDİLDİ — boşluk duruyor ama gerekçesiyle üstlenildi.

   İkisini tek bir "kapat" düğmesine indirmek, denetimde "bu kayıt neden
   temiz" sorusunu cevapsız bırakırdı. Gerekçe her iki yolda da zorunlu.

   Motorun kendisi de bulgu kapatır (agTutarliliginiIsle): düzelen bir
   çakışma bir sonraki koşuda otomatik kapanır. Buradaki karar, motorun
   ÇÖZEMEDİĞİ bulgular içindir. */

export function KaliteKarari({ bulgu }: { bulgu: KaliteBulgusu }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [karar, setKarar] = useState<'giderildi' | 'kabul_edildi'>('giderildi');
  const [gerekce, setGerekce] = useState('');

  if (!bulgu.kapatilabilir) {
    return (
      <CekmeceEylemler dipNot={'Bu bulguyu karara bağlamak envanter onay '
        + 'yetkisi ve kaydın santral kapsamı ister.'} />
    );
  }

  if (!acik) {
    return (
      <CekmeceEylemler
        birincil={<Dugme tur="tam" onClick={() => setAcik(true)}>Karara bağla</Dugme>}
        dipNot="Karar geri alınamaz; bulgu yeniden doğarsa motor onu yeni bir kayıt olarak açar."
      />
    );
  }

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)', display: 'grid', gap: 'var(--s12)' }}>
      <Alan etiket="Karar">
        <select className="ab-gr" value={karar}
          onChange={(e) => setKarar(e.target.value as 'giderildi' | 'kabul_edildi')}>
          <option value="giderildi">Giderildi — boşluk kapatıldı</option>
          <option value="kabul_edildi">Kabul edildi — boşluk gerekçesiyle üstlenildi</option>
        </select>
      </Alan>
      <Alan etiket="Gerekçe (en az 10 karakter)">
        <textarea className="ab-gr" rows={3} value={gerekce}
          onChange={(e) => setGerekce(e.target.value)} />
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s12)' }}>
        <Dugme tur="birincil" disabled={bekliyor || gerekce.trim().length < 10}
          onClick={() => calistir(
            () => veriKalitesiBulgusuKapat({ bulguId: bulgu.id, karar, gerekce }),
            () => { setAcik(false); setGerekce(''); },
          )}>
          Kararı kaydet
        </Dugme>
        <Dugme onClick={() => setAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
    </div>
  );
}
