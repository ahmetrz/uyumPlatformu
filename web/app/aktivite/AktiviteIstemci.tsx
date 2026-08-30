'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Bos } from '@/components/ui';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { DURUM_ETIKET, BULGU_DURUM_ETIKET, zamanTR, type Durum, type BulguDurum } from '@/lib/sabitler';

type A = {
  id: string; aktor: string; varlikTipi: string; varlikId: string; eylem: string;
  alan: string | null; once: string | null; sonra: string | null;
  dosya: string | null; zaman: string;
};

const EYLEM_METNI: Record<string, string> = {
  olusturma: 'oluşturdu', durum_degisimi: 'durumu değiştirdi', guncelleme: 'güncelledi',
  dosya_ekleme: 'dosya ekledi', silme: 'sildi', kapsam_degisimi: 'kapsamı değiştirdi',
};
const TIP_ETIKET: Record<string, string> = {
  Bulgu: 'Bulgu', Aksiyon: 'Aksiyon', MaddeDurumu: 'Madde durumu', Madde: 'Madde',
  Kanit: 'Kanıt', Proje: 'Proje', Yetki: 'Yetki', Tesis: 'Tesis',
  UyumSureci: 'Uyum süreci', Regulasyon: 'Regülasyon', IceAktarim: 'İçe aktarım',
};

export default function AktiviteIstemci({ kayitlar }: { kayitlar: A[] }) {
  const [tipF, setTipF] = useState('hepsi');
  const [aktorF, setAktorF] = useState('hepsi');

  const aktorler = useMemo(() => [...new Set(kayitlar.map((k) => k.aktor))].sort(), [kayitlar]);
  const tipler = useMemo(() => [...new Set(kayitlar.map((k) => k.varlikTipi))].sort(), [kayitlar]);
  const gorunen = kayitlar.filter((k) =>
    (tipF === 'hepsi' || k.varlikTipi === tipF) && (aktorF === 'hepsi' || k.aktor === aktorF));

  // Güne göre grupla
  const gunler = useMemo(() => {
    const m = new Map<string, A[]>();
    for (const k of gorunen) {
      const g = new Date(k.zaman).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
      const l = m.get(g) ?? []; l.push(k); m.set(g, l);
    }
    return [...m.entries()];
  }, [gorunen]);

  return (
    <>
      <div className="filtreler">
        <select className="sec" value={tipF} onChange={(e) => setTipF(e.target.value)}>
          <option value="hepsi">Tüm varlıklar</option>
          {tipler.map((t) => <option key={t} value={t}>{TIP_ETIKET[t] ?? t}</option>)}
        </select>
        <select className="sec" value={aktorF} onChange={(e) => setAktorF(e.target.value)}>
          <option value="hepsi">Tüm kullanıcılar</option>
          {aktorler.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="mikro-etiket" style={{ marginLeft: 'auto' }}>
          {gorunen.length} KAYIT · DEĞİŞMEZ DENETİM İZİ
        </span>
        <button className="btn yazdirmada-gizle" onClick={pdfYazdir}>🖨 PDF</button>
        <button className="btn yazdirmada-gizle" onClick={() => exceleAktar('denetim-izi', [{
          ad: 'Denetim izi', satirlar: [
            ['Zaman', 'Aktör', 'Varlık', 'Eylem', 'Alan', 'Önceki', 'Yeni', 'Dosya'],
            ...gorunen.map((a) => [zamanTR(a.zaman), a.aktor, a.varlikTipi, a.eylem,
              a.alan, a.once, a.sonra, a.dosya]) ] }])}>⤓ Excel</button>
      </div>

      {gunler.map(([gun, liste]) => (
        <section key={gun}>
          <div className="sahne-baslik">
            <span className="no">◷</span><h3>{gun}</h3><span className="cizgi" />
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-3)' }}>
            <div className="kart-icerik">
              <ul className="zaman">
                {liste.map((a) => (
                  <li key={a.id} className="zaman-oge">
                    <span className="zaman-nokta" />
                    <div className="zaman-ust">
                      <span className="aktor">{a.aktor}</span>
                      <span style={{ color: 'var(--text-2)' }}>
                        {TIP_ETIKET[a.varlikTipi]?.toLocaleLowerCase('tr-TR') ?? a.varlikTipi}{' '}
                        {EYLEM_METNI[a.eylem] ?? a.eylem}
                      </span>
                      {a.varlikTipi === 'Bulgu' && (
                        <Link className="chip" href={`/bulgular/${a.varlikId}`}>görüntüle →</Link>
                      )}
                      <span className="an">{zamanTR(a.zaman)}</span>
                    </div>
                    {(a.once || a.sonra) && (
                      <div className="zaman-govde">
                        {a.alan && <span className="mikro-etiket">{a.alan}: </span>}
                        <span className="fark">
                          {a.once && <span className="eski">
                            {DURUM_ETIKET[a.once as Durum] ?? BULGU_DURUM_ETIKET[a.once as BulguDurum] ?? a.once}</span>}
                          {a.once && a.sonra && '→'}
                          {a.sonra && <span className="yeni">
                            {DURUM_ETIKET[a.sonra as Durum] ?? BULGU_DURUM_ETIKET[a.sonra as BulguDurum] ?? a.sonra}</span>}
                        </span>
                      </div>
                    )}
                    {a.dosya && <div className="zaman-govde mono">🗎 {a.dosya}</div>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}
      {gorunen.length === 0 && <div className="kart"><Bos baslik="Kayıt yok" /></div>}
    </>
  );
}
