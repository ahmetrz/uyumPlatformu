'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { CekmeceEylemler } from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { erisimIncele, hesapKaydet } from '@/lib/eylemler2/kimlik';
import { hesapTipiKaydet } from '@/lib/eylemler2/varlikYonetisim';
import {
  HESAP_KAYNAK_TIPLERI, KAYNAK_TIP_ETIKETI, merkezdenKapatilabilir,
  type HesapKaynakTipi,
} from '@/lib/varlik/hesapTipi';
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
              className="ab-gr"
              rows={3}
              value={gerekce}
              onChange={(e) => setGerekce(e.target.value)}
              placeholder="Kararın dayanağı — denetim izine bu metin yazılır"
              style={{ resize: 'vertical' }}
            />
          </Alan>
          <div style={{ marginTop: 'var(--s12)' }}>
            <Dugme tur="tam" disabled={kararPasif} style={pasifStil(kararPasif)}
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
          {hata && <p className="ab-gr-hata" role="alert" style={{ width: '100%' }}>{hata}</p>}
        </div>
      }
      dipNot={dipNot}
    />
  );
}

/* ═══ OT-33 · Hesap kaynak tipi · MFA · süre ══════════════════════════

   `tip` hesabın KİME ait olduğunu söyler; bu form NEREDE yaşadığını,
   MFA'sı olup olmadığını ve ne zaman sona ereceğini kaydeder. İkisi ayrı
   eksendir ve tek alana sıkıştırılamaz: bir dizin hesabı da servis hesabı
   olabilir, "kaç yerel servis hesabı var" ancak ikisi ayrı durursa
   cevaplanır.

   ── MFA ÜÇ DEĞERLİDİR ─────────────────────────────────────────────────
   Boş bırakılan MFA `null` kalır ve bu "MFA yok" DEĞİL "ölçülmedi"dir.
   İkisini birleştirmek, kapatılması imkânsız bir ayrıcalıklı hesap
   listesi üretir ve o listeye kimse bakmaz. Bulgu mantığı da bunu
   dayatır: ayrıcalığı ölçülmemiş hesapta MFA bulgusu AÇILMAZ. */

const KAYNAK_SECENEK: { id: HesapKaynakTipi; ad: string }[] =
  HESAP_KAYNAK_TIPLERI.map((t) => ({ id: t, ad: KAYNAK_TIP_ETIKETI[t] }));

const UCLU = [
  { id: '', ad: 'Ölçülmedi' },
  { id: 'evet', ad: 'Var' },
  { id: 'hayir', ad: 'Yok' },
];

const uclu = (v: boolean | null) => (v === null ? '' : v ? 'evet' : 'hayir');
const ucluCoz = (v: string) => (v === '' ? null : v === 'evet');

export function HesapTipiFormu({ hesap }: { hesap: Hesap }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [kaynakTipi, setKaynakTipi] = useState(hesap.kaynakTipi);
  const [mfa, setMfa] = useState(uclu(hesap.mfaVar));
  const [ayricalik, setAyricalik] = useState(uclu(hesap.ayricalikli));
  const [sonaErme, setSonaErme] = useState(hesap.sonaErme?.slice(0, 10) ?? '');
  const [politika, setPolitika] = useState(hesap.parolaPolitikasi ?? '');

  const kt = (HESAP_KAYNAK_TIPLERI as readonly string[]).includes(hesap.kaynakTipi)
    ? hesap.kaynakTipi as HesapKaynakTipi : 'bilinmiyor';
  const kapatilabilir = merkezdenKapatilabilir(kt);

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Kaynak ve kimlik (OT-33)</p>
      <dl className="ab-panel-ciftler">
        <div>
          <dt>Kaynak tipi</dt>
          <dd className={kt === 'bilinmiyor' ? 'd-unk' : undefined}>
            {KAYNAK_TIP_ETIKETI[kt]}
          </dd>
        </div>
        <div>
          <dt>Merkezden kapatılabilir</dt>
          <dd className={kapatilabilir === null ? 'd-unk' : kapatilabilir ? undefined : 'd-md'}>
            {kapatilabilir === null ? 'karar verilemez' : kapatilabilir ? 'evet' : 'HAYIR'}
          </dd>
        </div>
        <div>
          <dt>MFA</dt>
          <dd className={hesap.mfaVar === null ? 'd-unk' : hesap.mfaVar ? undefined : 'd-bd'}>
            {hesap.mfaVar === null ? 'ölçülmedi' : hesap.mfaVar ? 'var' : 'YOK'}
          </dd>
        </div>
        <div>
          <dt>Sona erme</dt>
          <dd className={hesap.sonaErme ? undefined : 'd-unk'}>
            {hesap.sonaErme ? tarihTR(hesap.sonaErme) : 'belirlenmedi'}
          </dd>
        </div>
        <div>
          <dt>Parola politikası</dt>
          <dd className={hesap.parolaPolitikasi ? undefined : 'd-unk'}>
            {hesap.parolaPolitikasi ?? 'girilmedi'}
          </dd>
        </div>
      </dl>

      {!hesap.duzenlenebilir ? (
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
          Hesap tipi düzenlemek envanter yazma yetkisi ve hesabın santral
          kapsamı ister.
        </p>
      ) : !acik ? (
        <Dugme className="ab-baskida-gizle" style={{ marginTop: 'var(--s12)' }}
          onClick={() => setAcik(true)}>Kaynak ve kimliği düzenle</Dugme>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s12)' }}>
          <Alan etiket="Kaynak tipi">
            <select className="ab-gr" value={kaynakTipi}
              onChange={(e) => setKaynakTipi(e.target.value)}>
              {KAYNAK_SECENEK.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
            </select>
          </Alan>
          <Alan etiket="MFA (boş = ölçülmedi, &quot;yok&quot; DEĞİL)">
            <select className="ab-gr" value={mfa} onChange={(e) => setMfa(e.target.value)}>
              {UCLU.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
            </select>
          </Alan>
          <Alan etiket="Ayrıcalıklı (boş = ölçülmedi)">
            <select className="ab-gr" value={ayricalik}
              onChange={(e) => setAyricalik(e.target.value)}>
              {UCLU.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
            </select>
          </Alan>
          <Alan etiket="Sona erme tarihi">
            <input className="ab-gr" type="date" value={sonaErme}
              onChange={(e) => setSonaErme(e.target.value)} />
          </Alan>
          <Alan etiket="Parola politikası">
            <input className="ab-gr" value={politika}
              onChange={(e) => setPolitika(e.target.value)} />
          </Alan>
          {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
          <div style={{ display: 'flex', gap: 'var(--s12)' }}>
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(
                () => hesapTipiKaydet({
                  hesapId: hesap.id, kaynakTipi,
                  mfaVar: ucluCoz(mfa), ayricalikli: ucluCoz(ayricalik),
                  sonaErme: sonaErme || null,
                  parolaPolitikasi: politika || null,
                }),
                () => setAcik(false),
              )}>
              Kaydet
            </Dugme>
            <Dugme onClick={() => setAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
        </div>
      )}
    </div>
  );
}
