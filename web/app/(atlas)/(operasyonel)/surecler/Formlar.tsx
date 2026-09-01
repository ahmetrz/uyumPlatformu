'use client';
import { an } from '@/lib/an';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/abacus/temel';
import { useEylem } from '@/components/useEylem';
import {
  surecKaydet, surecDurumDegistir, surecKapsamEkle, surecKapsamCikar,
  maddeDurumGuncelle, bulguOlustur, kanitEkle,
} from '@/lib/eylemler';
import { istisnaTalep } from '@/lib/eylemler2/istisna';
import {
  DURUMLAR, DURUM_ETIKET, ONEM_DERECELERI, ONEM_ETIKET,
  SUREC_DURUMLARI, SUREC_DURUM_ETIKET,
} from '@/lib/sabitler';
import type { Degerlendirme, Kisi, Kodlu, S } from './ortak';

/* Süreç yazma yüzeyleri — MODAL YOK (06 §B4). Hepsi 420px çekmecede
   render edilir. Mutasyonlar lib/eylemler.ts ve lib/eylemler2/istisna.ts'ten
   AYNEN çağrılır; imza değiştirilmez, doğrulama ve yetki sunucuda kalır. */

const KANIT_TIPLERI = ['politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor'] as const;

/* ── Kampanya kaydı ─────────────────────────────────────────────────── */

export function SurecFormu({ surec, regulasyonlar, kapat }: {
  surec: S | null;
  regulasyonlar: Kodlu[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({
    kod: surec?.kod ?? '',
    ad: surec?.ad ?? '',
    regulasyonId: surec?.regulasyon.id ?? '',
    baslangic: surec?.baslangic?.slice(0, 10) ?? '',
    bitis: surec?.bitis?.slice(0, 10) ?? '',
    aciklama: surec?.aciklama ?? '',
  });
  const tersPencere = !!f.baslangic && !!f.bitis && f.bitis < f.baslangic;
  const gecerli = !!f.kod.trim() && !!f.ad.trim() && !!f.regulasyonId && !tersPencere;

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Regülasyon" zorunlu>
        <select className="ab-gr" value={f.regulasyonId} disabled={!!surec}
          onChange={(e) => setF({ ...f, regulasyonId: e.target.value })}>
          <option value="">—</option>
          {regulasyonlar.map((r) => (
            <option key={r.id} value={r.id}>{r.kod} — {r.ad}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Kod" zorunlu>
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={f.kod}
          placeholder="EPDK-SYM-2027"
          onChange={(e) => setF({ ...f, kod: e.target.value })} />
      </Alan>
      <Alan etiket="Ad" zorunlu>
        <input className="ab-gr" value={f.ad} placeholder="EPDK SYM 2027 dönemi"
          onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </Alan>
      <div style={{ display: 'grid', gap: 'var(--s12)',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Alan etiket="Başlangıç">
          <input className="ab-gr" type="date" value={f.baslangic}
            onChange={(e) => setF({ ...f, baslangic: e.target.value })} />
        </Alan>
        <Alan etiket="Denetim tarihi"
          hata={tersPencere ? 'Denetim tarihi başlangıçtan önce olamaz' : null}>
          <input className="ab-gr" type="date" value={f.bitis}
            onChange={(e) => setF({ ...f, bitis: e.target.value })} />
        </Alan>
      </div>
      <Alan etiket="Açıklama">
        <textarea className="ab-gr" rows={2} value={f.aciklama}
          onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => surecKaydet({
            id: surec?.id, kod: f.kod, ad: f.ad, regulasyonId: f.regulasyonId,
            baslangic: f.baslangic || null, bitis: f.bitis || null,
            aciklama: f.aciklama || null,
          }), kapat)}>
          {surec ? 'Kampanyayı kaydet' : 'Kampanyayı başlat'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Denetim tarihi girilmezse gecikme ölçülemez — kampanya kuyrukta
        bilinmeyen kalır. Regülasyon kampanya açıldıktan sonra değiştirilemez:
        değerlendirmeler o çerçevenin maddelerine bağlıdır.
      </p>
    </div>
  );
}

/* ── Yaşam döngüsü ────────────────────────────────────────────────────
   Durum değişimi ONAY yetkisi ister (lib/eylemler.ts); yetkisi olmayan
   kullanıcıya düğme hiç gösterilmez. */

export function DurumFormu({ surec, kapat }: { surec: S; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [durum, setDurum] = useState(surec.durum);

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Kampanya durumu" zorunlu>
        <select className="ab-gr" value={durum} onChange={(e) => setDurum(e.target.value)}>
          {SUREC_DURUMLARI.map((d) => (
            <option key={d} value={d}>{SUREC_DURUM_ETIKET[d]}</option>
          ))}
        </select>
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme tur="tam" disabled={bekliyor || durum === surec.durum}
        onClick={() => calistir(() => surecDurumDegistir({ id: surec.id, durum }), kapat)}>
        Durumu değiştir
      </Dugme>
      <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Geçiş denetim izine yazılır. Askıya alınan kampanyada takvim durur;
        tamamlanan kampanya gecikmiş sayılmaz ama değerlendirmeleri silinmez.
      </p>
    </div>
  );
}

/* ── Kapsam ───────────────────────────────────────────────────────────
   Kapsam bir YAPILANDIRMADIR, iş kuyruğu değil: canvasta değil çekmecede
   yaşar. Tesis eklendiğinde sunucu o regülasyonun tüm yaprak maddeleri
   için değerlendirme kaydı açar; çıkarıldığında kayıtlar tarihçede kalır. */

export function KapsamPaneli({ surec, tesisler, kilitli }: {
  surec: S;
  tesisler: Kodlu[];
  kilitli: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [tesisId, setTesisId] = useState('');

  const disaridakiler = tesisler.filter((t) => !surec.tesisler.some((k) => k.id === t.id));

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <div>
        {surec.tesisler.length === 0 ? (
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Kapsamda tesis yok — bu kampanyada hiç değerlendirme açılmadı.
          </p>
        ) : surec.tesisler.map((t) => (
          <div key={t.id} className="ab-panel-alan">
            <span className="etiket">{t.kod}</span>
            <span className="deger" style={{ display: 'flex', alignItems: 'baseline',
              gap: 'var(--s10)', minWidth: 0 }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden',
                textOverflow: 'ellipsis' }}>{t.ad}</span>
              {!kilitli && (
                <button type="button" className="ab-dugme satir" disabled={bekliyor}
                  aria-label={`${t.kod} kapsamdan çıkar`}
                  onClick={() => calistir(() => surecKapsamCikar({
                    surecId: surec.id, tesisId: t.id,
                  }))}>✕</button>
              )}
            </span>
          </div>
        ))}
      </div>

      {!kilitli && (
        <>
          <Alan etiket="Santral ekle">
            <select className="ab-gr" value={tesisId}
              onChange={(e) => setTesisId(e.target.value)}>
              <option value="">—</option>
              {disaridakiler.map((t) => (
                <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>
              ))}
            </select>
          </Alan>
          <Dugme tur="birincil" disabled={bekliyor || !tesisId}
            onClick={() => calistir(() => surecKapsamEkle({
              surecId: surec.id, tesisId,
            }), () => setTesisId(''))}>
            Kapsama al
          </Dugme>
        </>
      )}

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Kapsama alınan tesise regülasyonun tüm yaprak maddeleri
        &quot;değerlendirilmedi&quot; olarak açılır. Kapsamdan çıkarılan tesisin
        geçmiş değerlendirmeleri tarihçede kalır, silinmez.
      </p>
    </div>
  );
}

/* ── Değerlendirme ────────────────────────────────────────────────────
   Durum + sorumlu + not tek çağrıda yazılır (maddeDurumGuncelle). Gerekçe
   yalnız DURUM değişiyorsa istenir: değişmeyen bir kaydı gerekçeye
   zorlamak sorumlusunu atamayı da bloke ederdi. */

export function DegerlendirmeFormu({ kayit, kullanicilar, kapat }: {
  kayit: Degerlendirme;
  kullanicilar: Kisi[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({
    durum: kayit.durum,
    sorumluId: kayit.sorumlu?.id ?? '',
    not: kayit.not ?? '',
    gerekce: '',
  });
  const durumDegisti = f.durum !== kayit.durum;
  const gecerli = !durumDegisti || !!f.gerekce.trim();

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Uyum durumu" zorunlu>
        <select className="ab-gr" value={f.durum}
          onChange={(e) => setF({ ...f, durum: e.target.value })}>
          {DURUMLAR.map((d) => <option key={d} value={d}>{DURUM_ETIKET[d]}</option>)}
        </select>
      </Alan>
      <Alan etiket="Sorumlu">
        <select className="ab-gr" value={f.sorumluId}
          onChange={(e) => setF({ ...f, sorumluId: e.target.value })}>
          <option value="">atanmadı</option>
          {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Değerlendirme notu">
        <textarea className="ab-gr" rows={2} value={f.not}
          placeholder="Bu kararı ne destekliyor?"
          onChange={(e) => setF({ ...f, not: e.target.value })} />
      </Alan>
      {durumDegisti && (
        <Alan etiket="Durum değişim gerekçesi" zorunlu>
          <textarea className="ab-gr" rows={2} value={f.gerekce}
            placeholder="Durum neden değişiyor?"
            onChange={(e) => setF({ ...f, gerekce: e.target.value })} />
        </Alan>
      )}

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => maddeDurumGuncelle({
            id: kayit.id, durum: f.durum,
            not: f.not.trim() || null,
            sorumluId: f.sorumluId || null,
            gerekce: f.gerekce.trim() || null,
          }), kapat)}>
          Değerlendirmeyi kaydet
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Kanıt güveni kayıtta yeniden hesaplanır: kanıtı olmayan ya da süresi
        dolmuş bir &quot;uyumlu&quot; kör güvenle gösterilmez. Durum değişimi
        değişmez değerlendirme tarihçesine yazılır.
      </p>
    </div>
  );
}

/* ── Bulgu ──────────────────────────────────────────────────────────── */

export function BulguFormu({ kayit, kapat }: { kayit: Degerlendirme; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({
    baslik: '', aciklama: '', onem: 'orta', hedef: '',
  });
  const gecerli = !!f.baslik.trim() && !!f.aciklama.trim();

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Bulgu başlığı" zorunlu>
        <input className="ab-gr" value={f.baslik}
          placeholder={`${kayit.madde.kisaKod} — ${kayit.tesis.kod}`}
          onChange={(e) => setF({ ...f, baslik: e.target.value })} />
      </Alan>
      <Alan etiket="Açıklama" zorunlu>
        <textarea className="ab-gr" rows={3} value={f.aciklama}
          placeholder="Ne eksik, ne bekleniyordu?"
          onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
      </Alan>
      <div style={{ display: 'grid', gap: 'var(--s12)',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Alan etiket="Önem">
          <select className="ab-gr" value={f.onem}
            onChange={(e) => setF({ ...f, onem: e.target.value })}>
            {ONEM_DERECELERI.map((o) => <option key={o} value={o}>{ONEM_ETIKET[o]}</option>)}
          </select>
        </Alan>
        <Alan etiket="Hedef tarih">
          <input className="ab-gr" type="date" value={f.hedef}
            onChange={(e) => setF({ ...f, hedef: e.target.value })} />
        </Alan>
      </div>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => bulguOlustur({
            maddeDurumuId: kayit.id, baslik: f.baslik, aciklama: f.aciklama,
            onemDerecesi: f.onem, hedefTarih: f.hedef || null,
          }), kapat)}>
          Bulgu aç
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Hedef tarihi girilmeyen bulgunun gecikmesi ölçülemez. Aksiyon ve
        kapanış doğrulaması bulgu kaydında yaşar.
      </p>
    </div>
  );
}

/* ── Kanıt ──────────────────────────────────────────────────────────── */

export function KanitFormu({ kayit, kapat }: { kayit: Degerlendirme; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({ ad: '', tip: kayit.madde.kanitTipi ?? 'kayit' });

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Kanıt adı" zorunlu>
        <input className="ab-gr" value={f.ad} placeholder="Dosya ya da kayıt adı"
          onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </Alan>
      <Alan etiket="Kanıt tipi">
        <select className="ab-gr" value={f.tip}
          onChange={(e) => setF({ ...f, tip: e.target.value })}>
          {KANIT_TIPLERI.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !f.ad.trim()}
          onClick={() => calistir(() => kanitEkle({
            maddeDurumuId: kayit.id, ad: f.ad, tip: f.tip,
          }), kapat)}>
          Kanıt ekle
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        {kayit.madde.kanitTipi
          ? `Bu madde ${kayit.madde.kanitTipi} tipinde kanıt bekliyor.`
          : 'Bu madde için beklenen kanıt tipi tanımlanmamış.'}
        {' '}Kanıt eklendikten sonra değerlendirmeyi yeniden kaydetmek güveni tazeler.
      </p>
    </div>
  );
}

/* ── İstisna (waiver) ─────────────────────────────────────────────────
   Süreli, gerekçeli, ONAYLI: talep onay merkezine düşer ve onaylanana
   kadar madde durumu DEĞİŞMEZ (lib/eylemler2/istisna.ts). */

export function IstisnaFormu({ kayit, kapat }: { kayit: Degerlendirme; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({ bitis: '', gerekce: '' });
  // Bitiş gelecekte olmak zorunda; alt sınır ilk çizimde sabitlenir.
  // Anı `an()` verir, ham saat DEĞİL — sunucu ile istemci ayrışmasın.
  const [enErken] = useState(() =>
    new Date(an() + 86_400_000).toISOString().slice(0, 10));
  const gecerli = !!f.bitis && f.bitis >= enErken && f.gerekce.trim().length >= 10;

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="İstisna bitişi" zorunlu
        hata={f.bitis && f.bitis < enErken ? 'Bitiş tarihi gelecekte olmalı' : null}>
        <input className="ab-gr" type="date" min={enErken} value={f.bitis}
          onChange={(e) => setF({ ...f, bitis: e.target.value })} />
      </Alan>
      <Alan etiket="Gerekçe" zorunlu
        hata={f.gerekce.trim() && f.gerekce.trim().length < 10
          ? 'Gerekçe en az 10 karakter olmalı' : null}>
        <textarea className="ab-gr" rows={3} value={f.gerekce}
          placeholder="Bu madde bu tesiste neden karşılanamıyor?"
          onChange={(e) => setF({ ...f, gerekce: e.target.value })} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => istisnaTalep({
            maddeDurumuId: kayit.id, bitis: f.bitis, gerekce: f.gerekce,
          }), kapat)}>
          Onaya gönder
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        İstisna onay merkezinden geçmeden uygulanmaz: talep açıkken madde
        durumu olduğu gibi kalır, bitişte istisna düşer.
      </p>
    </div>
  );
}
