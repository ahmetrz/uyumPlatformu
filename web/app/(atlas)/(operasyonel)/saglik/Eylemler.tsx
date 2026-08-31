'use client';
import { Dugme } from '@/components/atlas/temel';
import { CekmeceEylemler } from '@/components/atlas/cekmece';
import { useEylem } from '@/components/useEylem';
import { tumIsleriCalistir, tekIsCalistir } from '@/lib/eylemler2/isler';
import { sonKosu, type Motor } from './mantik';

/* Motor tetikleme yüzeyleri. Mutasyonlar lib/eylemler2/isler.ts'ten AYNEN
   çağrılır: motor çalıştırmak `yonetim/yazma` ister ve yetki sunucuda
   denetlenir — buradaki `yazabilir` yalnız yüzeyi kapatır, kapıyı değil.

   Snackbar YOK: sonuç ya hata satırı olarak yazılır ya da koşu kaydı
   tabloda kendiliğinden belirir (useEylem başarıda router.refresh çağırır). */

export function TumunuCalistir({ yazabilir }: { yazabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();

  if (!yazabilir) {
    return (
      <span className="t-caption" style={{ alignSelf: 'center' }}>
        Motor çalıştırmak yönetim yazma yetkisi ister
      </span>
    );
  }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s12)' }}>
      {hata && (
        <span className="t-caption" role="alert" style={{ color: 'var(--bd)', maxWidth: 320 }}>
          {hata}
        </span>
      )}
      <button type="button" className="kapsam-dugme yazdirmada-gizle" disabled={bekliyor}
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
        <Dugme tur="cekmece" disabled={bekliyor || kosuyor}
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
