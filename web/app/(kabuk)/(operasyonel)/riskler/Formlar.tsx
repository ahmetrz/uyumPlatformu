'use client';
import { an } from '@/lib/an';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import { riskKaydet, riskIslem, riskKabul } from '@/lib/eylemler2/risk';
import { ETKI_BOYUTLARI, RISK_DURUMLARI, RISK_DURUM_ETIKET, RISK_ISLEMLERI,
  RISK_ISLEM_ETIKET, etiketle } from '@/lib/sabitler';
import {
  maxEtki, skorHesapla, skorDurumu, SKOR_TAVANI,
  type BulguSecenegi, type EtkiAnahtari, type Kisi, type Kodlu, type R,
} from './ortak';

/* Risk yazma yüzeyleri — MODAL YOK (06 §B4). İkisi de hem 420px çekmecede
   hem O4 detay rotasında aynı bileşenle render edilir; `genis` yalnız
   kolon sayısını değiştirir. Mutasyonlar lib/eylemler2/risk.ts'ten
   AYNEN çağrılır; imza değiştirilmez. */

const KAYNAKLAR = ['manuel', 'bulgu', 'zafiyet', 'eol', 'denetim', 'veri_kalitesi'] as const;

const BOS_ETKILER = Object.fromEntries(
  ETKI_BOYUTLARI.map(([a]) => [a, null]),
) as Record<EtkiAnahtari, number | null>;

type FormDurumu = {
  id?: string; kod: string; baslik: string; aciklama: string; kaynak: string;
  tesisId: string; sistemId: string; bulguId: string; sahipId: string;
  tehdit: string; zayiflik: string; mevcutKontroller: string;
  olasilik: number | null; etkiler: Record<EtkiAnahtari, number | null>;
  durum: string;
};

function formBaslat(risk: R | null, yeniKod: string): FormDurumu {
  if (!risk) return {
    kod: yeniKod, baslik: '', aciklama: '', kaynak: 'manuel',
    tesisId: '', sistemId: '', bulguId: '', sahipId: '',
    tehdit: '', zayiflik: '', mevcutKontroller: '',
    olasilik: null, etkiler: { ...BOS_ETKILER }, durum: 'acik',
  };
  return {
    id: risk.id, kod: risk.kod, baslik: risk.baslik, aciklama: risk.aciklama,
    kaynak: risk.kaynak ?? 'manuel', tesisId: risk.tesis?.id ?? '',
    sistemId: risk.sistem?.id ?? '', bulguId: risk.bulgu?.id ?? '',
    sahipId: risk.sahip?.id ?? '', tehdit: risk.tehdit ?? '',
    zayiflik: risk.zayiflik ?? '', mevcutKontroller: risk.mevcutKontroller ?? '',
    olasilik: risk.olasilik, etkiler: { ...risk.etkiler }, durum: risk.durum,
  };
}

/** 1–5 puan seçimi; boş = BİLİNMİYOR (sıfır değil). */
function Puan({ etiket, deger, sec }: {
  etiket: string; deger: number | null; sec: (n: number | null) => void;
}) {
  return (
    <Alan etiket={etiket}>
      <select className="ab-gr" value={deger ?? ''}
        onChange={(e) => sec(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">bilinmiyor</option>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </Alan>
  );
}

export function RiskFormu({
  risk, yeniKod, kullanicilar, tesisler, sistemler, bulgular, kapat, genis = false,
}: {
  risk: R | null; yeniKod: string; kullanicilar: Kisi[]; tesisler: Kodlu[];
  sistemler: Kodlu[]; bulgular: BulguSecenegi[]; kapat: () => void; genis?: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState<FormDurumu>(() => formBaslat(risk, yeniKod));
  const skor = skorHesapla(f.olasilik, f.etkiler);
  const gecerli = !!f.kod.trim() && !!f.baslik.trim() && !!f.aciklama.trim();

  const izgara = {
    display: 'grid',
    gridTemplateColumns: genis ? 'repeat(3, minmax(0, 1fr))' : 'minmax(0, 1fr)',
    gap: 'var(--s14)',
  } as const;

  function kaydet() {
    calistir(() => riskKaydet({
      id: f.id, kod: f.kod, baslik: f.baslik, aciklama: f.aciklama,
      kaynak: f.kaynak || null, tesisId: f.tesisId || null,
      sistemId: f.sistemId || null, bulguId: f.bulguId || null,
      sahipId: f.sahipId || null, tehdit: f.tehdit.trim() || null,
      zayiflik: f.zayiflik.trim() || null,
      mevcutKontroller: f.mevcutKontroller.trim() || null,
      olasilik: f.olasilik, ...f.etkiler,
      durum: f.id ? f.durum : undefined,
    }), kapat);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s18)' }}>
      <div style={izgara}>
        <Alan etiket="Kod" zorunlu>
          <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={f.kod}
            onChange={(e) => setF({ ...f, kod: e.target.value })} />
        </Alan>
        <Alan etiket="Kaynak">
          <select className="ab-gr" value={f.kaynak}
            onChange={(e) => setF({ ...f, kaynak: e.target.value })}>
            {KAYNAKLAR.map((s) => <option key={s} value={s}>{etiketle(s)}</option>)}
          </select>
        </Alan>
        {f.id && (
          <Alan etiket="Durum">
            <select className="ab-gr" value={f.durum}
              onChange={(e) => setF({ ...f, durum: e.target.value })}>
              {RISK_DURUMLARI.map((d) => (
                <option key={d} value={d}>{RISK_DURUM_ETIKET[d]}</option>
              ))}
            </select>
          </Alan>
        )}
      </div>

      <Alan etiket="Başlık" zorunlu>
        <input className="ab-gr" value={f.baslik} placeholder="Risk başlığı"
          onChange={(e) => setF({ ...f, baslik: e.target.value })} />
      </Alan>
      <Alan etiket="Açıklama" zorunlu>
        <textarea className="ab-gr" rows={3} value={f.aciklama}
          onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
      </Alan>

      <div style={izgara}>
        <Alan etiket="Santral">
          <select className="ab-gr" value={f.tesisId}
            onChange={(e) => setF({ ...f, tesisId: e.target.value })}>
            <option value="">—</option>
            {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
          </select>
        </Alan>
        <Alan etiket="Sistem">
          <select className="ab-gr" value={f.sistemId}
            onChange={(e) => setF({ ...f, sistemId: e.target.value })}>
            <option value="">—</option>
            {sistemler.map((s) => <option key={s.id} value={s.id}>{s.kod} — {s.ad}</option>)}
          </select>
        </Alan>
        <Alan etiket="Sahip">
          <select className="ab-gr" value={f.sahipId}
            onChange={(e) => setF({ ...f, sahipId: e.target.value })}>
            <option value="">atanmadı</option>
            {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
          </select>
        </Alan>
      </div>

      <Alan etiket="Bağlı bulgu">
        <select className="ab-gr" value={f.bulguId}
          onChange={(e) => setF({ ...f, bulguId: e.target.value })}>
          <option value="">—</option>
          {bulgular.map((b) => <option key={b.id} value={b.id}>{b.baslik}</option>)}
        </select>
      </Alan>

      <div style={izgara}>
        <Alan etiket="Tehdit">
          <input className="ab-gr" value={f.tehdit}
            onChange={(e) => setF({ ...f, tehdit: e.target.value })} />
        </Alan>
        <Alan etiket="Zayıflık">
          <input className="ab-gr" value={f.zayiflik}
            onChange={(e) => setF({ ...f, zayiflik: e.target.value })} />
        </Alan>
      </div>

      <Alan etiket="Telafi edici kontroller">
        <textarea className="ab-gr" rows={2} value={f.mevcutKontroller}
          placeholder="Artık skoru düşüren mevcut kontroller"
          onChange={(e) => setF({ ...f, mevcutKontroller: e.target.value })} />
      </Alan>

      <div>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
          Olasılık ve 8 etki boyutu
        </p>
        <div style={{ display: 'grid', gap: 'var(--s12)',
          gridTemplateColumns: genis ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))' }}>
          <Puan etiket="Olasılık" deger={f.olasilik}
            sec={(n) => setF({ ...f, olasilik: n })} />
          {ETKI_BOYUTLARI.map(([anahtar, etiket]) => (
            <Puan key={anahtar} etiket={etiket} deger={f.etkiler[anahtar]}
              sec={(n) => setF({ ...f, etkiler: { ...f.etkiler, [anahtar]: n } })} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s12)',
        paddingTop: 'var(--s14)', borderTop: 'var(--bw-hair) solid var(--hr)' }}>
        <span style={{ fontSize: 'var(--t-metric)', lineHeight: 'var(--lh-metric)',
          fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          color: `var(--${skorDurumu(skor)})` }}>
          {skor ?? '—'}
          <span style={{ fontSize: 'var(--t-metric-den)', fontWeight: 400,
            color: 'var(--i3)' }}> / {SKOR_TAVANI}</span>
        </span>
        <span className="etiket">hesaplanan skor</span>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        {skor === null
          ? 'Olasılık veya en az bir etki boyutu bilinmeden skor hesaplanmaz — bilinmeyen sıfır sayılmaz.'
          : `olasılık ${f.olasilik} × en büyük etki ${maxEtki(f.etkiler)} · doğal ve artık risk otomatik yazılır`}
      </p>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" onClick={kaydet} disabled={bekliyor || !gecerli}>
          {f.id ? 'Değerlendirmeyi kaydet' : 'Risk oluştur'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
    </div>
  );
}

/* ── Karar kaydet ───────────────────────────────────────────────────── */

/** İşlem tipi seçimi + SÜRELİ/ONAYLI kabul (§13.2). Gerekçe ZORUNLU:
    girilmeden birincil düğme etkin olmaz. */
export function KararFormu({ risk, kapat }: { risk: R; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [tip, setTip] = useState<string>(risk.islemTipi ?? 'azalt');
  const [bitis, setBitis] = useState(risk.kabulBitis?.slice(0, 10) ?? '');
  const [gerekce, setGerekce] = useState('');
  // Kabul bitişi gelecekte olmak zorunda (§13.2) — alt sınır render'a göre
  // sabitlenir, her çizimde yeniden hesaplanmaz. Anı `an()` verir, ham
  // saat DEĞİL: sunucu HTML'i ile hidrasyon aynı günü yazsın (lib/an.ts).
  const [enErken] = useState(() =>
    new Date(an() + 86_400_000).toISOString().slice(0, 10));
  const kabul = tip === 'kabul';
  const gecerli = !!gerekce.trim() && (!kabul || !!bitis);

  function kaydet() {
    if (kabul) {
      calistir(() => riskKabul({ id: risk.id, kabulBitis: bitis, gerekce }), kapat);
    } else {
      calistir(() => riskIslem({ id: risk.id, islemTipi: tip, gerekce }), kapat);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="İşlem kararı" zorunlu>
        <select className="ab-gr" value={tip} onChange={(e) => setTip(e.target.value)}>
          {RISK_ISLEMLERI.map((i) => (
            <option key={i} value={i}>{RISK_ISLEM_ETIKET[i]}</option>
          ))}
        </select>
      </Alan>

      {kabul && (
        <Alan etiket="Kabul bitişi" zorunlu
          hata={bitis && bitis < enErken ? 'Bitiş tarihi gelecekte olmalı' : null}>
          <input className="ab-gr" type="date" min={enErken} value={bitis}
            onChange={(e) => setBitis(e.target.value)} />
        </Alan>
      )}

      <Alan etiket="Gerekçe" zorunlu>
        <textarea className="ab-gr" rows={3} value={gerekce}
          placeholder={kabul ? 'Bu risk neden kabul ediliyor?' : 'Bu karar neden veriliyor?'}
          onChange={(e) => setGerekce(e.target.value)} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme tur="tam" onClick={kaydet} disabled={bekliyor || !gecerli}>
        Karar kaydet
      </Dugme>
      <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        {kabul
          ? 'Kabul süreli ve onaylıdır: bitişte kabul düşer, risk yeniden değerlendirilir. Gerekçe ve onaylayan denetim izine yazılır.'
          : 'İşlem tipi ve tarihi kayda yazılır; denetim izi durum değişimini tutar.'}
      </p>
    </div>
  );
}
