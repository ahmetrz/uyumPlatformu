'use client';
import { useState } from 'react';
import { Alan, BosIlk, Dugme } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { useEylem } from '@/components/useEylem';
import { sayimAc, sayimDurumu, sayimKapat } from '@/lib/eylemler2/sayim';
import {
  SAYIM_DURUM_SOZU, sayimCumlesi, sayimOzeti, type SayimDurumu,
} from '@/lib/varlik/sayim';
import { tarihTR } from '@/lib/sabitler';
import type { Durum } from '@/components/kabuk/temel';

/* ═══ OT-55 · Envanter sayımı ekranı ══════════════════════════════════

   Kütük kampanya bazlıdır: her satır bir sayım turudur ve kendi
   ilerlemesini ile doğruluk oranını taşır.

   ── İKİ AYRI ORAN, BİLEREK ────────────────────────────────────────────
   İLERLEME kapsamın ne kadarına bakıldığını söyler; DOĞRULUK yalnız
   bakılanlar üzerinden hesaplanır. Sayılmamış satırı doğruluk paydasına
   koymak, sayımın ilk gününde envanteri "%2 doğru" gösterirdi. */

const KOLONLAR = [
  { baslik: 'Kapsam', genislik: '190px' },
  { baslik: 'İlerleme', genislik: '120px', sag: true },
  { baslik: 'Doğruluk', genislik: '120px', sag: true },
  { baslik: 'Açılış', genislik: '104px', sag: true, ikincil: true },
];

const DURUM_IM: Record<string, Durum> = {
  hazirlik: 'pl', sahada: 'md', karsilastirma: 'md', kapali: 'tamam',
};

type Sayim = {
  id: string; kod: string; ad: string; tesisKod: string;
  turAd: string | null; bolgeKod: string | null;
  durum: string; kapsamSayisi: number; acan: string;
  baslangic: string; bitis: string | null; gerekce: string | null;
  sonuclar: string[];
};

export default function SayimIstemci({
  sayimlar, tesisler, turler, bolgeler, yazabilir,
}: {
  sayimlar: Sayim[];
  tesisler: { id: string; kod: string; ad: string }[];
  turler: { id: string; ad: string }[];
  bolgeler: { id: string; kod: string }[];
  yazabilir: boolean;
}) {
  const [formAcik, setFormAcik] = useState(false);

  const ozetler = sayimlar.map((s) => ({
    s, o: sayimOzeti({ kapsam: s.kapsamSayisi, sonuclar: s.sonuclar }),
  }));
  const acik = ozetler.filter((x) => x.s.durum !== 'kapali');
  const kayip = ozetler.reduce((n, x) => n + x.o.bulunamayan, 0);
  const fazladan = ozetler.reduce((n, x) => n + x.o.fazladan, 0);

  const tablo: Satir[] = ozetler.map(({ s, o }) => ({
    id: s.id,
    durum: o.fazladan > 0 || o.bulunamayan > 0 ? 'bd' : DURUM_IM[s.durum] ?? 'unk',
    konu: s.ad,
    alt: `${SAYIM_DURUM_SOZU[s.durum as SayimDurumu] ?? s.durum} · ${sayimCumlesi(o)}`,
    hucreler: [
      `${s.tesisKod}${s.turAd ? ` · ${s.turAd}` : ''}${s.bolgeKod ? ` · ${s.bolgeKod}` : ''}`,
      `${o.sayilan}/${o.kapsam} · %${o.ilerleme}`,
      /* Hiç sayılmamışsa "%0 doğru" DEĞİL "ölçülmedi" yazılır. */
      o.dogrulukOrani === null ? 'ölçülmedi' : `%${o.dogrulukOrani}`,
      tarihTR(s.baslangic),
    ],
  }));

  return (
    /* Kabuk `<main>` basmaz; ana bölgeyi ekran çizer. */
    <main data-yuzey="defter" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow={`Envanter sayımı · ${sayimlar.length} tur`}
        baslik={acik.length > 0 ? 'sayım turu açık' : 'Açık sayım turu yok'}
        vurgu={acik.length > 0 ? `${acik.length}` : undefined}
        vurguDurumu={kayip > 0 || fazladan > 0 ? 'bd' : 'ok'}
        metrikler={[
          { deger: String(sayimlar.length), yazi: 'sayım turu' },
          { deger: String(kayip), yazi: 'sahada bulunamadı',
            durum: kayip > 0 ? 'bd' : undefined },
          { deger: String(fazladan), yazi: 'kayıtsız cihaz',
            durum: fazladan > 0 ? 'bd' : undefined },
        ]}
        sag={yazabilir
          ? <Dugme tur="birincil" onClick={() => setFormAcik(!formAcik)}>Sayım aç</Dugme>
          : undefined}
      />

      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s16)' }}>
        Keşif yalnız AĞDA GÖRÜNEN cihazı bulur; kapalı panodaki yedek bir kart
        hiçbir taramada çıkmaz. Sayım birinin gidip bakmasıdır. Sayım hiçbir
        varlığı silmez: &quot;bulunamadı&quot; bir ölçüm sonucudur, envanterden
        düşürme ayrı bir karardır.
      </p>

      {formAcik && (
        <SayimFormu tesisler={tesisler} turler={turler} bolgeler={bolgeler}
          kapat={() => setFormAcik(false)} />
      )}

      {tablo.length === 0
        ? (
          <BosIlk cumle="Hiç envanter sayımı açılmadı."
            eylem={yazabilir
              ? <Dugme tur="birincil" onClick={() => setFormAcik(true)}>Sayım aç</Dugme>
              : undefined} />
        )
        : <Tablo kolonlar={KOLONLAR} satirlar={tablo} />}

      {yazabilir && acik.length > 0 && (
        <SayimYonetimi sayimlar={acik.map((x) => ({ ...x.s, sayilmayan: x.o.sayilmayan }))} />
      )}
    </main>
  );
}

function SayimFormu({ tesisler, turler, bolgeler, kapat }: {
  tesisler: { id: string; kod: string; ad: string }[];
  turler: { id: string; ad: string }[];
  bolgeler: { id: string; kod: string }[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [ad, setAd] = useState('');
  const [tesisId, setTesisId] = useState(tesisler[0]?.id ?? '');
  const [turId, setTurId] = useState('');
  const [bolgeId, setBolgeId] = useState('');

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)',
      marginBottom: 'var(--s16)' }}>
      <p className="etiket" style={{ margin: 0 }}>Yeni sayım turu</p>
      <Alan etiket="Sayım adı" zorunlu>
        <input className="ab-gr" value={ad} placeholder="Örn. 2026 yılı OT sayımı"
          onChange={(e) => setAd(e.target.value)} />
      </Alan>
      <Alan etiket="Santral" zorunlu>
        <select className="ab-gr" value={tesisId} onChange={(e) => setTesisId(e.target.value)}>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} · {t.ad}</option>)}
        </select>
      </Alan>
      {/* Daraltıcılar isteğe bağlıdır ve boş bırakılırsa daraltma YOK
          demektir — "hiçbiri" değil. Küçük bir kapsamla başlamak, sayımı
          bitirilebilir kılar. */}
      <Alan etiket="Varlık türü · boş = hepsi">
        <select className="ab-gr" value={turId} onChange={(e) => setTurId(e.target.value)}>
          <option value="">bütün türler</option>
          {turler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Ağ bölgesi · boş = hepsi">
        <select className="ab-gr" value={bolgeId} onChange={(e) => setBolgeId(e.target.value)}>
          <option value="">bütün bölgeler</option>
          {bolgeler.map((b) => <option key={b.id} value={b.id}>{b.kod}</option>)}
        </select>
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !ad.trim() || !tesisId}
          onClick={() => calistir(async () => {
            const s = await sayimAc({
              ad, tesisId, turId: turId || null, bolgeId: bolgeId || null,
            });
            if (s.ok) kapat();
            return s;
          })}>
          Sayımı aç
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Kapsam açılış anında DONAR: sonradan envantere eklenen varlık bu
        sayımın paydasını değiştirmez, yoksa oran her gün başka bir şey söylerdi.
      </p>
    </div>
  );
}

function SayimYonetimi({ sayimlar }: {
  sayimlar: (Sayim & { sayilmayan: number })[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [id, setId] = useState(sayimlar[0]?.id ?? '');
  const [gerekce, setGerekce] = useState('');
  const secili = sayimlar.find((s) => s.id === id) ?? null;

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s10)',
      marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: 0 }}>Sayım yönetimi</p>
      <select className="ab-gr" value={id} onChange={(e) => setId(e.target.value)}>
        {sayimlar.map((s) => (
          <option key={s.id} value={s.id}>{s.ad} · {SAYIM_DURUM_SOZU[s.durum as SayimDurumu]}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
        {(['hazirlik', 'sahada', 'karsilastirma'] as const)
          .filter((d) => d !== secili?.durum)
          .map((d) => (
            <Dugme key={d} disabled={bekliyor || !id}
              onClick={() => calistir(() => sayimDurumu({ id, durum: d }))}>
              {SAYIM_DURUM_SOZU[d].split(' —')[0]}
            </Dugme>
          ))}
      </div>
      {secili && secili.sayilmayan > 0 && (
        <>
          <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>
            {secili.sayilmayan} satır hiç sayılmadı. Eksik kapatmak gerekçe ister;
            kapanış izi bu satırları &quot;doğrulandı&quot; diye göstermez.
          </p>
          <textarea className="ab-gr" rows={2} value={gerekce}
            placeholder="Sayım neden eksik kapatılıyor?"
            onChange={(e) => setGerekce(e.target.value)} />
        </>
      )}
      <Dugme tur="ret"
        disabled={bekliyor || !id || (!!secili && secili.sayilmayan > 0 && !gerekce.trim())}
        onClick={() => calistir(() => sayimKapat({ id, gerekce: gerekce || null }))}>
        Sayımı kapat
      </Dugme>
      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
    </div>
  );
}
