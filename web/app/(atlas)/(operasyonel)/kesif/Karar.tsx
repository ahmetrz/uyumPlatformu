'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/abacus/temel';
import { CekmeceEylemler } from '@/components/abacus/panel';
import { useEylem } from '@/components/useEylem';
import {
  elleAktarimCalistir, kesifEslestir, kesifKarariVer, kesifTopluKarar,
} from '@/lib/eylemler2/kesif';
import { zamanTR } from '@/lib/sabitler';
import { bekliyorMu, guvenYazisi, type KesifSatiri } from './mantik';

/* Keşif kuyruğunun yazma yüzeyi. MODAL YOK: karar çekmecede verilir.

   Üç değişmez burada görünür hâle gelir:
   1. Gerekçe ZORUNLU — girilmeden hiçbir karar düğmesi etkin olmaz.
   2. "Hepsini onayla" YOK — toplu karar ancak çekmeceden tek tek seçime
      eklenmiş kayıtlar üzerinde çalışır. Yani her kayıt en az bir kez
      açılmış, güveni ve adayı görülmüş olur.
   3. Yüksek güven otomatik onay DEĞİLDİR; düğmeye insan basar. */

const RET_SINIFI = 'dg dg-ikincil dg-ret';
const pasifStil = (pasif: boolean) =>
  (pasif ? { opacity: 0.45, cursor: 'not-allowed' } : undefined);

export type Tur = { id: string; kod: string; ad: string; sinif: string };
export type Tesis = { id: string; kod: string; ad: string };

/* ═══ Çekmece kararları ═══════════════════════════════════════════════ */

export function KararEylemleri({
  satir, turler, tesisler, seciliMi, secimeEkle, secimdenCikar, onaylayabilir,
}: {
  satir: KesifSatiri;
  turler: Tur[];
  tesisler: Tesis[];
  seciliMi: boolean;
  secimeEkle: (id: string) => void;
  secimdenCikar: (id: string) => void;
  onaylayabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [gerekce, setGerekce] = useState('');
  const [yeniAcik, setYeniAcik] = useState(false);
  const [turId, setTurId] = useState('');
  const [etiket, setEtiket] = useState('');
  const [tesisId, setTesisId] = useState('');
  const [uzerineYaz, setUzerineYaz] = useState(false);

  const acik = bekliyorMu(satir);
  const gerekceVar = gerekce.trim().length > 0;
  const yetkili = onaylayabilir && satir.kararVerilebilir;
  const kararPasif = !acik || !yetkili || !gerekceVar || bekliyor;

  function karar(tip: 'onayla' | 'reddet') {
    calistir(
      () => kesifKarariVer({
        kesifId: satir.id, karar: tip, not: gerekce.trim(), uzerineYaz,
      }),
      () => setGerekce(''),
    );
  }

  function yeniVarlik() {
    calistir(
      () => kesifKarariVer({
        kesifId: satir.id, karar: 'yeni_varlik', not: gerekce.trim(),
        turId, etiket: etiket.trim() || undefined, tesisId: tesisId || undefined,
      }),
      () => { setGerekce(''); setYeniAcik(false); setEtiket(''); },
    );
  }

  const etiketGerekli = !satir.gozlemAlanlari.some((a) => a.etiket === 'Etiket');
  const yeniPasif = kararPasif || !turId || (etiketGerekli && !etiket.trim());

  const dipNot = [
    acik
      ? satir.eslesen
        ? `Aday ${satir.eslesen.etiket} · güven ${guvenYazisi(satir.guvenSkoru)} — `
          + 'onay verilene kadar CMDB\'ye yazılmadı'
        : 'Eşleşen varlık yok — yeni varlık açılabilir ya da kayıt reddedilebilir'
      : `${satir.inceleyen ?? 'Bilinmeyen inceleyen'} · `
        + `${satir.incelemeZamani ? zamanTR(satir.incelemeZamani) : 'zaman yok'}`
        + (satir.incelemeNotu ? ` · ${satir.incelemeNotu}` : ''),
    'Her karar denetim izine gerekçesiyle yazılır.',
  ].join(' · ');

  if (!acik) return <CekmeceEylemler dipNot={dipNot} />;

  return (
    <CekmeceEylemler
      birincil={
        <>
          <Alan etiket="Gerekçe" zorunlu>
            <textarea
              className="ab-gr" rows={3} value={gerekce}
              onChange={(e) => setGerekce(e.target.value)}
              placeholder="Kararın dayanağı — denetim izine bu metin yazılır"
              style={{ resize: 'vertical' }}
            />
          </Alan>
          {satir.eslesen && (
            <>
              <label style={{ display: 'flex', gap: 'var(--s8)', alignItems: 'center',
                marginTop: 'var(--s10)', fontSize: 'var(--t-code-lg)', color: 'var(--i2)' }}>
                <input type="checkbox" checked={uzerineYaz}
                  onChange={(e) => setUzerineYaz(e.target.checked)} />
                Farklı gelen alanlar mevcut değeri ezsin
              </label>
              <div style={{ marginTop: 'var(--s12)' }}>
                <Dugme tur="tam" disabled={kararPasif} style={pasifStil(kararPasif)}
                  onClick={() => karar('onayla')}>
                  Eşleşmeyi onayla · {satir.eslesen.etiket}
                </Dugme>
              </div>
            </>
          )}
        </>
      }
      ikincil={
        <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
          <Dugme disabled={kararPasif} style={pasifStil(kararPasif)}
            onClick={() => setYeniAcik((v) => !v)}>
            {yeniAcik ? 'Yeni varlık formunu kapat' : 'Yeni varlık aç'}
          </Dugme>
          <Dugme className={RET_SINIFI} disabled={kararPasif} style={pasifStil(kararPasif)}
            onClick={() => karar('reddet')}>
            Reddet
          </Dugme>
          <Dugme disabled={!yetkili}
            onClick={() => (seciliMi ? secimdenCikar(satir.id) : secimeEkle(satir.id))}>
            {seciliMi ? 'Seçimden çıkar' : 'Toplu karara ekle'}
          </Dugme>

          {yeniAcik && (
            <div style={{ width: '100%', marginTop: 'var(--s12)',
              display: 'grid', gap: 'var(--s10)' }}>
              <Alan etiket="Varlık türü" zorunlu>
                <select className="ab-gr" value={turId} onChange={(e) => setTurId(e.target.value)}>
                  <option value="">Seçin…</option>
                  {turler.map((t) => (
                    <option key={t.id} value={t.id}>{t.ad} · {t.sinif}</option>
                  ))}
                </select>
              </Alan>
              <Alan etiket="Etiket (asset tag)" zorunlu={etiketGerekli}>
                <input className="ab-gr" value={etiket} onChange={(e) => setEtiket(e.target.value)}
                  placeholder={etiketGerekli ? 'Keşifte etiket yok — elle verin' : 'Keşiften gelen etiket kullanılır'} />
              </Alan>
              <Alan etiket="Tesis">
                <select className="ab-gr" value={tesisId} onChange={(e) => setTesisId(e.target.value)}>
                  <option value="">Bilinmiyor</option>
                  {tesisler.map((t) => (
                    <option key={t.id} value={t.id}>{t.kod} · {t.ad}</option>
                  ))}
                </select>
              </Alan>
              <div>
                <Dugme tur="tam" disabled={yeniPasif} style={pasifStil(yeniPasif)}
                  onClick={yeniVarlik}>
                  Yeni varlık olarak aç
                </Dugme>
              </div>
            </div>
          )}

          {!yetkili && (
            <p className="ab-dip" style={{ width: '100%' }}>
              Karar için envanter onay yetkisi gerekiyor.
            </p>
          )}
          {hata && <p className="ab-gr-hata" role="alert" style={{ width: '100%' }}>{hata}</p>}
        </div>
      }
      dipNot={dipNot}
    />
  );
}

/* ═══ Toplu karar tepsisi ═════════════════════════════════════════════ */

export function TopluKararTepsisi({
  secilenler, cikar, temizle,
}: {
  secilenler: KesifSatiri[];
  cikar: (id: string) => void;
  temizle: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [gerekce, setGerekce] = useState('');
  const gerekceVar = gerekce.trim().length > 0;
  const pasif = !gerekceVar || bekliyor || secilenler.length === 0;

  function topluKarar(karar: 'onayla' | 'reddet') {
    calistir(
      () => kesifTopluKarar({
        kesifIdleri: secilenler.map((s) => s.id), karar, not: gerekce.trim(),
      }),
      () => { setGerekce(''); temizle(); },
    );
  }

  if (secilenler.length === 0) return null;

  return (
    <section className="ab-blok" style={{ maxWidth: 'none', marginBottom: 'var(--s20)' }}>
      <p className="etiket" style={{ margin: 0 }}>
        Toplu karar · {secilenler.length} kayıt
      </p>
      <p className="ab-dip" style={{ marginTop: 'var(--s6)' }}>
        Kayıtlar tek tek çekmeceden eklendi. Her biri kendi denetim izi satırını
        bırakır; biri başarısız olursa diğerleri geri alınmaz.
      </p>
      <ul style={{ listStyle: 'none', margin: 'var(--s12) 0 0', padding: 0,
        display: 'grid', gap: 'var(--s6)' }}>
        {secilenler.map((s) => (
          <li key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s10)',
            fontSize: 'var(--t-code-lg)' }}>
            <span style={{ fontWeight: 600 }}>{s.konu}</span>
            <span style={{ fontFamily: 'var(--veri)', color: 'var(--i3)' }}>
              {s.eslesen ? s.eslesen.etiket : 'eşleşme yok'} · {guvenYazisi(s.guvenSkoru)}
            </span>
            <button type="button" className="ab-dugme satir" style={{ marginLeft: 'auto' }}
              onClick={() => cikar(s.id)}>Çıkar</button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 'var(--s12)' }}>
        <Alan etiket="Ortak gerekçe" zorunlu>
          <textarea className="ab-gr" rows={2} value={gerekce}
            onChange={(e) => setGerekce(e.target.value)}
            placeholder="Bu toplu kararın dayanağı" style={{ resize: 'vertical' }} />
        </Alan>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s10)', marginTop: 'var(--s12)',
        flexWrap: 'wrap' }}>
        <Dugme tur="birincil" disabled={pasif} style={pasifStil(pasif)}
          onClick={() => topluKarar('onayla')}>
          Seçilen {secilenler.length} kaydı onayla
        </Dugme>
        <Dugme className={RET_SINIFI} disabled={pasif} style={pasifStil(pasif)}
          onClick={() => topluKarar('reddet')}>
          Seçilenleri reddet
        </Dugme>
        <Dugme onClick={temizle}>Seçimi boşalt</Dugme>
        {hata && <p className="ab-gr-hata" role="alert" style={{ width: '100%' }}>{hata}</p>}
      </div>
    </section>
  );
}

/* ═══ Eşleştirme geçişi ═══════════════════════════════════════════════ */

/** Bekleyen kayıtları CMDB ile eşleştirir. ÖNERİ üretir — hiçbir kaydı
    CMDB'ye yazmaz; yazma yalnız kayıt bazında insan kararıyla olur. */
export function EslestirmeDugmesi({ yazabilir }: { yazabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s10)' }}>
      <Dugme disabled={!yazabilir || bekliyor} style={pasifStil(!yazabilir || bekliyor)}
        onClick={() => calistir(() => kesifEslestir({}))}>
        {bekliyor ? 'Eşleştiriliyor…' : 'Bekleyenleri eşleştir'}
      </Dugme>
      {hata && <span className="ab-gr-hata" role="alert">{hata}</span>}
    </span>
  );
}

/* ═══ Elle aktarım ════════════════════════════════════════════════════ */

/** Pasif keşif kaynağı: mevcut bir dışa aktarımın içeriği yapıştırılır.
    Ağa hiçbir paket çıkmaz; bu ürün OT'de aktif tarama YAPMAZ. */
export function ElleAktarimFormu({ yazabilir }: { yazabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [kaynakSistem, setKaynakSistem] = useState('');
  const [bicim, setBicim] = useState<'csv' | 'json'>('csv');
  const [icerik, setIcerik] = useState('');

  const pasif = !yazabilir || bekliyor
    || kaynakSistem.trim().length === 0 || icerik.trim().length === 0;

  return (
    <details style={{ marginBottom: 'var(--s20)' }}>
      <summary className="ab-filtre" style={{ listStyle: 'none', cursor: 'pointer' }}>
        Dışa aktarım yükle ▾
      </summary>
      <div className="ab-blok" style={{ maxWidth: 'none', marginTop: 'var(--s12)',
        display: 'grid', gap: 'var(--s12)' }}>
        <p className="ab-dip" style={{ margin: 0 }}>
          Yalnız pasif kaynaklar: mevcut keşif ürünü, switch ARP/MAC tablosu,
          DHCP kiraları, SIEM raporu, SCADA envanter ya da tedarikçi dışa
          aktarımı. Buradan tarama başlatılmaz.
        </p>
        <Alan etiket="Kaynak sistem" zorunlu>
          <input className="ab-gr" value={kaynakSistem}
            onChange={(e) => setKaynakSistem(e.target.value)}
            placeholder="ör. SCADA envanter dışa aktarımı — Kızıldere II" />
        </Alan>
        <Alan etiket="Biçim">
          <select className="ab-gr" value={bicim}
            onChange={(e) => setBicim(e.target.value === 'json' ? 'json' : 'csv')}>
            <option value="csv">CSV (başlık satırlı)</option>
            <option value="json">JSON (kayıt dizisi)</option>
          </select>
        </Alan>
        <Alan etiket="İçerik" zorunlu>
          <textarea className="ab-gr" rows={6} value={icerik}
            onChange={(e) => setIcerik(e.target.value)}
            placeholder={'hostname,serial_number,mac,ip,vendor,model\nPLC-01,SN-1234,00:11:22:33:44:55,10.20.0.5,Siemens,S7-1500'}
            style={{ resize: 'vertical', fontFamily: 'var(--veri)' }} />
        </Alan>
        <div>
          <Dugme tur="birincil" disabled={pasif} style={pasifStil(pasif)}
            onClick={() => calistir(
              () => elleAktarimCalistir({ kaynakSistem: kaynakSistem.trim(), bicim, icerik }),
              () => setIcerik(''),
            )}>
            Keşif kuyruğuna işle
          </Dugme>
          {!yazabilir && (
            <p className="ab-dip">Aktarım için envanter yazma yetkisi gerekiyor.</p>
          )}
          {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
        </div>
      </div>
    </details>
  );
}
