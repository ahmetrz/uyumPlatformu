'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/atlas/temel';
import { CekmeceEylemler } from '@/components/atlas/cekmece';
import { useEylem } from '@/components/useEylem';
import { erisimIncele, hesapKaydet } from '@/lib/eylemler2/kimlik';
import { tarihTR } from '@/lib/sabitler';
import { SONUC_ETIKET, type Hesap, type Yetki } from './mantik';

/* Dönemsel erişim incelemesi — yazma yüzeyi. MODAL YOK: karar çekmecede
   verilir. Mutasyonlar lib/eylemler2/kimlik.ts'ten AYNEN çağrılır, imza
   değiştirilmez; erisimIncele denetim izine gerekçeyle yazar.

   Gerekçe ZORUNLU: girilene kadar üç karar düğmesi de disabled. */

const KARARLAR = [
  { sonuc: 'onaylandi', ad: 'İncelemeyi onayla' },
  { sonuc: 'kaldirilsin', ad: 'Yetkiyi kaldır' },
  { sonuc: 'degistirilsin', ad: 'Kapsam değişsin' },
] as const;

/** dg-ret tek başına kenarlık taşımıyor; dg-ikincil ile birleştirilir. */
const RET_SINIFI = 'dg dg-ikincil dg-ret';

function pasifStil(pasif: boolean) {
  return pasif ? { opacity: 0.45, cursor: 'not-allowed' } : undefined;
}

export function IncelemeEylemleri({ hesap, yetki }: { hesap: Hesap; yetki: Yetki | null }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [gerekce, setGerekce] = useState('');

  const gerekceVar = gerekce.trim().length > 0;
  const kapali = !yetki || yetki.bitis !== null;
  const kararPasif = !gerekceVar || kapali || bekliyor;

  function karar(sonuc: (typeof KARARLAR)[number]['sonuc']) {
    if (!yetki || !gerekceVar) return;
    calistir(
      () => erisimIncele({ atamaId: yetki.id, sonuc, not: gerekce.trim() }),
      () => setGerekce(''),
    );
  }

  /** Sahipsiz / atıl hesabın karşılığı atama değil hesabın kendisidir. */
  function durumDegistir() {
    calistir(() => hesapKaydet({
      id: hesap.id,
      hesapAdi: hesap.hesapAdi,
      tip: hesap.tip,
      tesisId: hesap.tesisId,
      kaynakSistem: hesap.kaynakSistem,
      ayricalikli: hesap.ayricalikli,
      parolaRotasyon: hesap.parolaRotasyon,
      durum: hesap.durum === 'askida' ? 'aktif' : 'askida',
    }));
  }

  const son = yetki?.sonInceleme;
  const dipNot = [
    yetki
      ? son
        ? `Son inceleme ${tarihTR(son.zaman)} · ${SONUC_ETIKET[son.sonuc] ?? son.sonuc}`
          + (son.inceleyen ? ` · ${son.inceleyen}` : '')
        : 'Bu atama hiç incelenmedi'
      : 'Karar verilecek atama yok',
    'Karar denetim izine gerekçesiyle yazılır.',
  ].join(' · ');

  return (
    <CekmeceEylemler
      birincil={
        <>
          <Alan etiket="Gerekçe" zorunlu>
            <textarea
              className="gr"
              rows={3}
              value={gerekce}
              onChange={(e) => setGerekce(e.target.value)}
              placeholder="Kararın dayanağı — denetim izine bu metin yazılır"
              style={{ resize: 'vertical' }}
            />
          </Alan>
          <div style={{ marginTop: 'var(--s12)' }}>
            <Dugme tur="cekmece" disabled={kararPasif} style={pasifStil(kararPasif)}
              onClick={() => karar('onaylandi')}>
              {KARARLAR[0].ad}
            </Dugme>
          </div>
        </>
      }
      ikincil={
        <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
          <Dugme className={RET_SINIFI} disabled={kararPasif} style={pasifStil(kararPasif)}
            onClick={() => karar('kaldirilsin')}>
            {KARARLAR[1].ad}
          </Dugme>
          <Dugme disabled={kararPasif} style={pasifStil(kararPasif)}
            onClick={() => karar('degistirilsin')}>
            {KARARLAR[2].ad}
          </Dugme>
          <Dugme disabled={bekliyor} style={pasifStil(bekliyor)} onClick={durumDegistir}>
            {hesap.durum === 'askida' ? 'Hesabı geri aç' : 'Hesabı askıya al'}
          </Dugme>
          {hata && <p className="gr-hata" role="alert" style={{ width: '100%' }}>{hata}</p>}
        </div>
      }
      dipNot={dipNot}
    />
  );
}
