'use client';
import { useState } from 'react';
import { Alan as AlanKutusu, Dugme } from '@/components/atlas/temel';
import { useEylem } from '@/components/useEylem';
import { maddeAlanAta, maddeKaydet, maddeSil } from '@/lib/eylemler';
import { surumAktiflestir, surumOlustur } from '@/lib/eylemler2/surum';
import { silinebilir, type Alan, type Madde, type Reg, type Surum } from './mantik';

/* Katalog yazma yüzeyleri — MODAL YOK (06 §B4). Hepsi 420px çekmecede
   render edilir; yıkıcı işlemler `confirm()` yerine iki adımlı satır içi
   onayla korunur (tarayıcı diyaloğu da bir modaldır).

   Mutasyonlar lib/eylemler.ts ve lib/eylemler2/surum.ts'ten AYNEN çağrılır;
   sürümleme mantığına (kopyalama, diff, yeni değerlendirme açma) ekran
   hiç dokunmaz. */

const KANIT_TIPLERI = ['politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor'] as const;

/* ── Madde ──────────────────────────────────────────────────────────── */

export function MaddeFormu({ madde, reg, alanlar, kapat }: {
  madde: Madde | null;
  reg: Reg;
  alanlar: Alan[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [silOnayi, setSilOnayi] = useState(false);
  const [f, setF] = useState({
    kod: madde?.kod ?? '',
    baslik: madde?.baslik ?? '',
    metin: madde?.metin ?? '',
    ustMaddeId: madde?.ustMaddeId ?? '',
    kanitTipi: madde?.kanitTipi ?? '',
    alanIdler: madde?.alanlar.map((a) => a.id) ?? [],
  });
  const gecerli = !!f.kod.trim() && !!f.baslik.trim() && !!f.metin.trim();

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <AlanKutusu etiket="Kod" zorunlu>
        <input className="gr" style={{ fontFamily: 'var(--mo)' }} value={f.kod}
          placeholder={`${reg.kod}-4.3`}
          onChange={(e) => setF({ ...f, kod: e.target.value })} />
      </AlanKutusu>
      <AlanKutusu etiket="Üst madde">
        <select className="gr" value={f.ustMaddeId}
          onChange={(e) => setF({ ...f, ustMaddeId: e.target.value })}>
          <option value="">kök seviye</option>
          {reg.maddeler.filter((m) => m.id !== madde?.id).map((m) => (
            <option key={m.id} value={m.id}>{m.kisaKod} — {m.baslik}</option>
          ))}
        </select>
      </AlanKutusu>
      <AlanKutusu etiket="Başlık" zorunlu>
        <input className="gr" value={f.baslik}
          onChange={(e) => setF({ ...f, baslik: e.target.value })} />
      </AlanKutusu>
      <AlanKutusu etiket="Metin" zorunlu>
        <textarea className="gr" rows={4} value={f.metin}
          placeholder="Regülasyonun kendi ifadesi"
          onChange={(e) => setF({ ...f, metin: e.target.value })} />
      </AlanKutusu>
      <AlanKutusu etiket="Beklenen kanıt tipi">
        <select className="gr" value={f.kanitTipi}
          onChange={(e) => setF({ ...f, kanitTipi: e.target.value })}>
          <option value="">—</option>
          {KANIT_TIPLERI.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </AlanKutusu>

      <div>
        <span className="gr-etiket">Kapsam alanları</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s6)' }}>
          {alanlar.map((a) => {
            const secildi = f.alanIdler.includes(a.id);
            return (
              <button key={a.id} type="button" className="filtre"
                aria-pressed={secildi} title={a.ad}
                onClick={() => setF({
                  ...f,
                  alanIdler: secildi
                    ? f.alanIdler.filter((x) => x !== a.id)
                    : [...f.alanIdler, a.id],
                })}>
                {a.kod}
              </button>
            );
          })}
        </div>
      </div>

      {hata && <p className="gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme tur="cekmece" disabled={bekliyor || !gecerli}
        onClick={() => calistir(() => maddeKaydet({
          id: madde?.id, regulasyonId: reg.id, kod: f.kod, baslik: f.baslik,
          metin: f.metin, ustMaddeId: f.ustMaddeId || null,
          kanitTipi: f.kanitTipi || null, alanIdler: f.alanIdler,
        }), kapat)}>
        {madde ? 'Maddeyi kaydet' : 'Madde ekle'}
      </Dugme>

      <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
        {madde && (
          <Dugme disabled={bekliyor}
            onClick={() => calistir(() => maddeAlanAta({
              maddeId: madde.id, alanIdler: f.alanIdler,
            }), kapat)}>
            Yalnız alanları kaydet
          </Dugme>
        )}
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>

      {/* Silme yıkıcıdır: iki adım ister ve yalnız kullanımsız yaprakta açılır. */}
      {madde && silinebilir(madde) && (
        silOnayi ? (
          <div style={{ display: 'grid', gap: 'var(--s10)' }}>
            <p className="cekmece-dip" style={{ margin: 0, color: 'var(--bd)' }}>
              {madde.kisaKod} kalıcı olarak silinecek. Bu madde hiçbir
              değerlendirmede kullanılmıyor.
            </p>
            <div style={{ display: 'flex', gap: 'var(--s10)' }}>
              <Dugme tur="ret" disabled={bekliyor}
                onClick={() => calistir(() => maddeSil({ id: madde.id }), kapat)}>
                Sil
              </Dugme>
              <Dugme onClick={() => setSilOnayi(false)} disabled={bekliyor}>Vazgeç</Dugme>
            </div>
          </div>
        ) : (
          <Dugme tur="ret" onClick={() => setSilOnayi(true)} disabled={bekliyor}>
            Maddeyi sil
          </Dugme>
        )
      )}

      <p className="cekmece-dip" style={{ margin: 0 }}>
        {madde && !silinebilir(madde)
          ? `Bu madde ${madde.altSayisi} alt madde ve ${madde.kullanimSayisi} değerlendirme taşıyor — silinemez, yerine yeni sürümde kaldırılır.`
          : 'Kapsam alanı eşleşmemiş yaprak madde, hangi ekipten sorulacağı bilinmeyen maddedir.'}
      </p>
    </div>
  );
}

/* ── Sürüm ──────────────────────────────────────────────────────────────
   Taslak açmak aktif sürümün maddelerini KOPYALAR; aktifleştirme eskiyi
   arşive indirir, diff üretir ve değişen maddeler için yeni değerlendirme
   açar. Bu ekran o zinciri yalnız tetikler. */

export function TaslakFormu({ reg, kapat }: { reg: Reg; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [etiket, setEtiket] = useState('');

  return (
    <div style={{ display: 'grid', gap: 'var(--s14)' }}>
      <AlanKutusu etiket="Yeni sürüm etiketi" zorunlu>
        <input className="gr" style={{ fontFamily: 'var(--mo)' }} value={etiket}
          placeholder="2027" onChange={(e) => setEtiket(e.target.value)} />
      </AlanKutusu>

      {hata && <p className="gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !etiket.trim()}
          onClick={() => calistir(() => surumOlustur({
            regulasyonId: reg.id, etiket,
          }), () => { setEtiket(''); kapat(); })}>
          Taslak aç
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="cekmece-dip" style={{ margin: 0 }}>
        Yürürlükteki sürümün maddeleri taslağa kopyalanır; içe aktarım ve elle
        düzenleme taslak üzerinde yapılır. Eski sürüm ve değerlendirmeleri
        silinmez.
      </p>
    </div>
  );
}

/** Aktifleştirme onaylı ve geri alınamazdır: iki adımlı satır içi onay. */
export function AktiflestirmeOnayi({ surum, kapat }: { surum: Surum; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();

  return (
    <div style={{ display: 'grid', gap: 'var(--s12)' }}>
      <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
        {surum.etiket} yürürlüğe girecek: yürürlükteki sürüm arşive iner, kod
        bazında diff üretilir ve değişen maddeler için aktif kampanyaların
        kapsamındaki santrallere yeni değerlendirme açılır.
      </p>

      {hata && <p className="gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme tur="cekmece" disabled={bekliyor}
        onClick={() => calistir(() => surumAktiflestir({ surumId: surum.id }), kapat)}>
        {surum.etiket} sürümünü yürürlüğe al
      </Dugme>
      <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>

      <p className="cekmece-dip" style={{ margin: 0 }}>
        Eski değerlendirmeler korunur; yalnız değişen ve yeni maddeler
        yeniden değerlendirme ister.
      </p>
    </div>
  );
}
