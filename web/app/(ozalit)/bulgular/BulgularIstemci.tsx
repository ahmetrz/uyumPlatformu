'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pill, SegBar, Bos } from '@/components/ui';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import {
  ONEM_DERECELERI, ONEM_ETIKET, ONEM_DURUM_RENGI, BULGU_DURUMLARI,
  BULGU_DURUM_ETIKET, BULGU_DURUM_RENGI, tarihTR, gecikmisMi, type Onem, type BulguDurum, type Durum,
} from '@/lib/sabitler';

type B = {
  id: string; baslik: string; durum: string; onem: string; kaynak: string | null;
  tespit: string; hedef: string | null; sorumlu: string | null;
  maddeKod: string; maddeBaslik: string; tesisKod: string; tesisAd: string;
  surecKod: string; regKod: string;
  aksiyonToplam: number; aksiyonBiten: number;
};

export default function BulgularIstemci({ bulgular }: { bulgular: B[] }) {
  const [durumF, setDurumF] = useState('acik-hepsi');
  const [onemF, setOnemF] = useState('hepsi');
  const [arama, setArama] = useState('');

  const gorunen = useMemo(() => bulgular.filter((b) => {
    if (durumF === 'acik-hepsi' && (b.durum === 'kapali' || b.durum === 'kabul_edildi')) return false;
    if (durumF !== 'hepsi' && durumF !== 'acik-hepsi' && b.durum !== durumF) return false;
    if (onemF !== 'hepsi' && b.onem !== onemF) return false;
    if (arama && !`${b.baslik} ${b.maddeKod} ${b.tesisKod} ${b.tesisAd}`.toLocaleLowerCase('tr-TR')
      .includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    return true;
  }), [bulgular, durumF, onemF, arama]);

  const onemSayilari: Partial<Record<Durum, number>> = {};
  for (const b of bulgular) {
    if (b.durum === 'kapali' || b.durum === 'kabul_edildi') continue;
    const renk = ONEM_DURUM_RENGI[b.onem as Onem];
    onemSayilari[renk] = (onemSayilari[renk] ?? 0) + 1;
  }

  return (
    <>
      <div className="kart">
        <div className="band">
          <div className="band-hucre">
            <span className="mikro-etiket">Açık bulgu</span>
            <span className="metrik-dev">
              {bulgular.filter((b) => b.durum !== 'kapali' && b.durum !== 'kabul_edildi').length}
            </span>
            <SegBar sayilar={onemSayilari} />
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Kritik + yüksek</span>
            <span className="metrik-dev">
              {bulgular.filter((b) => b.durum !== 'kapali' && b.durum !== 'kabul_edildi'
                && (b.onem === 'kritik' || b.onem === 'yuksek')).length}
            </span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Hedefi geçen</span>
            <span className="metrik-dev">
              {bulgular.filter((b) => gecikmisMi(b.hedef, b.durum)).length}
            </span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Kapalı (dönem)</span>
            <span className="metrik-dev">{bulgular.filter((b) => b.durum === 'kapali').length}</span>
          </div>
        </div>
      </div>

      <div className="filtreler">
        <input className="inp" placeholder="Bulgu ara…" value={arama}
          onChange={(e) => setArama(e.target.value)} style={{ minWidth: 200 }} />
        <select className="sec" value={durumF} onChange={(e) => setDurumF(e.target.value)}>
          <option value="acik-hepsi">Açık + aksiyonda</option>
          <option value="hepsi">Tüm durumlar</option>
          {BULGU_DURUMLARI.map((d) => <option key={d} value={d}>{BULGU_DURUM_ETIKET[d]}</option>)}
        </select>
        <select className="sec" value={onemF} onChange={(e) => setOnemF(e.target.value)}>
          <option value="hepsi">Tüm önem dereceleri</option>
          {ONEM_DERECELERI.map((o) => <option key={o} value={o}>{ONEM_ETIKET[o]}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn yazdirmada-gizle" onClick={pdfYazdir}>🖨 PDF</button>
        <button className="btn yazdirmada-gizle" onClick={() => exceleAktar('bulgular', [{
          ad: 'Bulgular', satirlar: [
            ['Bulgu', 'Madde', 'Tesis', 'Süreç', 'Önem', 'Durum', 'Sorumlu', 'Tespit', 'Hedef'],
            ...gorunen.map((b) => [b.baslik, b.maddeKod, b.tesisKod, b.surecKod,
              b.onem, b.durum, b.sorumlu, tarihTR(b.tespit), b.hedef ? tarihTR(b.hedef) : '']) ] }])}>
          ⤓ Excel</button>
      </div>

      <div className="kart">
        <div className="tablo-sar">
          <table className="tablo">
            <thead><tr>
              <th></th><th>Bulgu</th><th>Madde · Tesis</th><th>Önem</th>
              <th>Durum</th><th>Aksiyon</th><th>Hedef</th>
            </tr></thead>
            <tbody>
              {gorunen.map((b) => {
                const gecikti = gecikmisMi(b.hedef, b.durum);
                return (
                  <tr key={b.id}>
                    <td style={{ width: 4, padding: 0 }}>
                      <div className={`serit serit-${ONEM_DURUM_RENGI[b.onem as Onem]}`}
                        style={{ height: 28, marginLeft: 'var(--sp-2)' }} />
                    </td>
                    <td style={{ maxWidth: 380 }}>
                      <Link href={`/bulgular/${b.id}`} style={{ fontWeight: 500 }}>{b.baslik}</Link>
                      <div className="mikro-etiket sirada-gizli" style={{ letterSpacing: '.04em' }}>
                        {b.regKod} · {b.surecKod}{b.sorumlu && ` · ${b.sorumlu}`}
                        {b.kaynak && ` · ${b.kaynak.replace('_', ' ')}`}
                      </div>
                    </td>
                    <td><span className="chip mono" title={b.maddeBaslik}>{b.maddeKod}</span>{' '}
                      <span className="chip mono" title={b.tesisAd}>{b.tesisKod}</span></td>
                    <td><Pill durum={ONEM_DURUM_RENGI[b.onem as Onem]}
                      etiket={ONEM_ETIKET[b.onem as Onem]} hollow={b.onem === 'yuksek'} /></td>
                    <td><Pill durum={BULGU_DURUM_RENGI[b.durum as BulguDurum]}
                      etiket={BULGU_DURUM_ETIKET[b.durum as BulguDurum]} /></td>
                    <td className="mono" style={{ color: 'var(--text-2)' }}>
                      {b.aksiyonToplam === 0 ? '—' : `${b.aksiyonBiten}/${b.aksiyonToplam}`}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {b.hedef ? (
                        <span style={{ color: gecikti ? 'var(--uyumsuz-fg)' : 'var(--text-2)' }}>
                          {tarihTR(b.hedef)}{gecikti && ' ⚠'}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {gorunen.length === 0 && <Bos baslik="Eşleşen bulgu yok" />}
        </div>
      </div>
    </>
  );
}
