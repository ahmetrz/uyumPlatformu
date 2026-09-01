'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import {
  varlikKaydet, iliskiEkle, iliskiSil, varlikYasamDongusu,
} from '@/lib/eylemler2/envanter';
import { etiketle, tarihTR } from '@/lib/sabitler';
import {
  ILISKI_CUMLE, ILISKI_TIPLERI, KRITIKLIKLER, MARUZIYET_SECENEK,
  VAR_YOK_SECENEK, YAMA_SECENEK, YASAM_DONGULERI, YASAM_ETIKET,
  type Bolge, type Kisi, type Kodlu, type Tur, type Unite, type V,
} from './mantik';

/* Varlık yazma yüzeyleri — MODAL YOK (06 §B4). Üçü de 420px çekmecede
   render edilir. Mutasyonlar lib/eylemler2/envanter.ts'ten AYNEN çağrılır;
   imza değiştirilmez, yetki sunucuda ayrıca denetlenir. */

const ikili = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 'var(--s12)',
} as const;

function Bolum({ ad, children }: { ad: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--s12)' }}>
      <p className="etiket" style={{ margin: 0 }}>{ad}</p>
      {children}
    </div>
  );
}

/* ── Varlık formu ───────────────────────────────────────────────────── */

type FormDurumu = {
  id?: string; etiket: string; ad: string; turId: string;
  tesisId: string; uniteId: string; sistemId: string; bolgeId: string;
  sahipId: string; emanetciId: string;
  hostname: string; seriNo: string; uretici: string; model: string;
  ipAdresi: string; macAdresi: string; isletimSistemi: string;
  firmware: string; surum: string; rafOda: string; kimlikDogrulama: string;
  kritiklik: string; yamaDurumu: string; edrDurumu: string; yedekDurumu: string;
  izlemeDurumu: string; logKaynagi: string; internetMaruziyeti: string;
  /** üç durumlu: '' = bilinmiyor | evet | hayir */
  uzaktanErisim: string;
  kurulumTarihi: string; garantiBitis: string; destekBitis: string;
  eolTarihi: string; eosTarihi: string;
};

const tarihe = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

function formBaslat(v: V | null): FormDurumu {
  if (!v) return {
    etiket: '', ad: '', turId: '', tesisId: '', uniteId: '', sistemId: '', bolgeId: '',
    sahipId: '', emanetciId: '', hostname: '', seriNo: '', uretici: '', model: '',
    ipAdresi: '', macAdresi: '', isletimSistemi: '', firmware: '', surum: '',
    rafOda: '', kimlikDogrulama: '', kritiklik: 'bilinmiyor', yamaDurumu: 'bilinmiyor',
    edrDurumu: 'bilinmiyor', yedekDurumu: 'bilinmiyor', izlemeDurumu: 'bilinmiyor',
    logKaynagi: 'bilinmiyor', internetMaruziyeti: 'bilinmiyor', uzaktanErisim: '',
    kurulumTarihi: '', garantiBitis: '', destekBitis: '', eolTarihi: '', eosTarihi: '',
  };
  return {
    id: v.id, etiket: v.etiket, ad: v.ad, turId: v.tur.id,
    tesisId: v.tesis?.id ?? '', uniteId: v.unite?.id ?? '', sistemId: v.sistem?.id ?? '',
    bolgeId: v.bolge?.id ?? '', sahipId: v.sahip?.id ?? '', emanetciId: v.emanetci?.id ?? '',
    hostname: v.hostname ?? '', seriNo: v.seriNo ?? '', uretici: v.uretici ?? '',
    model: v.model ?? '', ipAdresi: v.ipAdresi ?? '', macAdresi: v.macAdresi ?? '',
    isletimSistemi: v.isletimSistemi ?? '', firmware: v.firmware ?? '', surum: v.surum ?? '',
    rafOda: v.rafOda ?? '', kimlikDogrulama: v.kimlikDogrulama ?? '',
    kritiklik: v.kritiklik, yamaDurumu: v.yamaDurumu, edrDurumu: v.edrDurumu,
    yedekDurumu: v.yedekDurumu, izlemeDurumu: v.izlemeDurumu, logKaynagi: v.logKaynagi,
    internetMaruziyeti: v.internetMaruziyeti,
    uzaktanErisim: v.uzaktanErisim === null ? '' : v.uzaktanErisim ? 'evet' : 'hayir',
    kurulumTarihi: tarihe(v.kurulumTarihi), garantiBitis: tarihe(v.garantiBitis),
    destekBitis: tarihe(v.destekBitis), eolTarihi: tarihe(v.eolTarihi),
    eosTarihi: tarihe(v.eosTarihi),
  };
}

export function VarlikFormu({
  varlik, turler, tesisler, uniteler, sistemler, bolgeler, kullanicilar, kapat,
}: {
  varlik: V | null; turler: Tur[]; tesisler: Kodlu[]; uniteler: Unite[];
  sistemler: Kodlu[]; bolgeler: Bolge[]; kullanicilar: Kisi[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState<FormDurumu>(() => formBaslat(varlik));
  const uygunUniteler = uniteler.filter((u) => u.tesisId === f.tesisId);
  const gecerli = !!f.etiket.trim() && !!f.ad.trim() && !!f.turId;

  const yaz = (ad: keyof FormDurumu, deger: string) => setF({ ...f, [ad]: deger });

  function metin(ad: keyof FormDurumu, etiket: string, mono = false) {
    return (
      <Alan etiket={etiket}>
        <input className="ab-gr" value={f[ad] as string}
          style={mono ? { fontFamily: 'var(--veri)' } : undefined}
          onChange={(e) => yaz(ad, e.target.value)} />
      </Alan>
    );
  }
  function secim(ad: keyof FormDurumu, etiket: string, secenekler: readonly string[]) {
    return (
      <Alan etiket={etiket}>
        <select className="ab-gr" value={f[ad] as string}
          onChange={(e) => yaz(ad, e.target.value)}>
          {secenekler.map((s) => <option key={s} value={s}>{etiketle(s)}</option>)}
        </select>
      </Alan>
    );
  }
  function tarih(ad: keyof FormDurumu, etiket: string) {
    return (
      <Alan etiket={etiket}>
        <input className="ab-gr" type="date" value={f[ad] as string}
          onChange={(e) => yaz(ad, e.target.value)} />
      </Alan>
    );
  }

  function kaydet() {
    calistir(() => varlikKaydet({
      id: f.id, etiket: f.etiket, ad: f.ad, turId: f.turId,
      tesisId: f.tesisId || null, uniteId: f.uniteId || null,
      sistemId: f.sistemId || null, bolgeId: f.bolgeId || null,
      sahipId: f.sahipId || null, emanetciId: f.emanetciId || null,
      hostname: f.hostname, seriNo: f.seriNo, uretici: f.uretici, model: f.model,
      ipAdresi: f.ipAdresi, macAdresi: f.macAdresi, isletimSistemi: f.isletimSistemi,
      firmware: f.firmware, surum: f.surum, rafOda: f.rafOda,
      kimlikDogrulama: f.kimlikDogrulama,
      kritiklik: f.kritiklik, yamaDurumu: f.yamaDurumu, edrDurumu: f.edrDurumu,
      yedekDurumu: f.yedekDurumu, izlemeDurumu: f.izlemeDurumu, logKaynagi: f.logKaynagi,
      internetMaruziyeti: f.internetMaruziyeti,
      // Boş seçim null'a düşer: 'hayır' ile 'bilinmiyor' aynı şey değildir.
      uzaktanErisim: f.uzaktanErisim === '' ? null : f.uzaktanErisim === 'evet',
      kurulumTarihi: f.kurulumTarihi || null, garantiBitis: f.garantiBitis || null,
      destekBitis: f.destekBitis || null, eolTarihi: f.eolTarihi || null,
      eosTarihi: f.eosTarihi || null,
    }), kapat);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--s20)' }}>
      <Bolum ad="Kimlik ve konum">
        <div style={ikili}>
          <Alan etiket="Etiket" zorunlu>
            <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={f.etiket}
              onChange={(e) => yaz('etiket', e.target.value)} />
          </Alan>
          <Alan etiket="Tür" zorunlu>
            <select className="ab-gr" value={f.turId}
              onChange={(e) => yaz('turId', e.target.value)}>
              <option value="">seçin</option>
              {turler.map((t) => (
                <option key={t.id} value={t.id}>{t.ad} · {etiketle(t.sinif)}</option>
              ))}
            </select>
          </Alan>
        </div>
        <Alan etiket="Ad" zorunlu>
          <input className="ab-gr" value={f.ad} onChange={(e) => yaz('ad', e.target.value)} />
        </Alan>
        <div style={ikili}>
          <Alan etiket="Santral">
            <select className="ab-gr" value={f.tesisId}
              onChange={(e) => setF({ ...f, tesisId: e.target.value, uniteId: '' })}>
              <option value="">—</option>
              {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod}</option>)}
            </select>
          </Alan>
          <Alan etiket="Ünite">
            <select className="ab-gr" value={f.uniteId} disabled={!f.tesisId}
              onChange={(e) => yaz('uniteId', e.target.value)}>
              <option value="">—</option>
              {uygunUniteler.map((u) => <option key={u.id} value={u.id}>{u.kod}</option>)}
            </select>
          </Alan>
          <Alan etiket="Sistem / servis">
            <select className="ab-gr" value={f.sistemId}
              onChange={(e) => yaz('sistemId', e.target.value)}>
              <option value="">—</option>
              {sistemler.map((s) => <option key={s.id} value={s.id}>{s.kod}</option>)}
            </select>
          </Alan>
          <Alan etiket="Ağ bölgesi">
            <select className="ab-gr" value={f.bolgeId}
              onChange={(e) => yaz('bolgeId', e.target.value)}>
              <option value="">—</option>
              {bolgeler.map((b) => <option key={b.id} value={b.id}>{b.kod}</option>)}
            </select>
          </Alan>
          {metin('rafOda', 'Raf / oda')}
        </div>
      </Bolum>

      <Bolum ad="Donanım ve yazılım">
        <div style={ikili}>
          {metin('uretici', 'Üretici')}
          {metin('model', 'Model')}
          {metin('seriNo', 'Seri no', true)}
          {metin('hostname', 'Hostname', true)}
          {metin('ipAdresi', 'IP adresi', true)}
          {metin('macAdresi', 'MAC adresi', true)}
          {metin('isletimSistemi', 'İşletim sistemi')}
          {metin('firmware', 'Firmware', true)}
          {metin('surum', 'Sürüm', true)}
          {metin('kimlikDogrulama', 'Kimlik doğrulama')}
        </div>
      </Bolum>

      <Bolum ad="Kritiklik ve maruziyet">
        <div style={ikili}>
          {secim('kritiklik', 'Kritiklik', KRITIKLIKLER)}
          {secim('internetMaruziyeti', 'İnternet maruziyeti', MARUZIYET_SECENEK)}
          <Alan etiket="Uzaktan erişim">
            <select className="ab-gr" value={f.uzaktanErisim}
              onChange={(e) => yaz('uzaktanErisim', e.target.value)}>
              <option value="">Bilinmiyor</option>
              <option value="evet">Var</option>
              <option value="hayir">Yok</option>
            </select>
          </Alan>
          {secim('yamaDurumu', 'Yama', YAMA_SECENEK)}
          {secim('edrDurumu', 'EDR', VAR_YOK_SECENEK)}
          {secim('yedekDurumu', 'Yedekleme', VAR_YOK_SECENEK)}
          {secim('izlemeDurumu', 'İzleme', VAR_YOK_SECENEK)}
          {secim('logKaynagi', 'Log kaynağı', VAR_YOK_SECENEK)}
        </div>
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          Ölçülmemiş alan boş bırakılmaz, “bilinmiyor” seçilir — sıfır sayılmaz.
        </p>
      </Bolum>

      <Bolum ad="Ömür ve sahiplik">
        <div style={ikili}>
          {tarih('kurulumTarihi', 'Kurulum')}
          {tarih('garantiBitis', 'Garanti bitiş')}
          {tarih('destekBitis', 'Destek bitiş')}
          {tarih('eolTarihi', 'EOL')}
          {tarih('eosTarihi', 'EOS')}
          <Alan etiket="Sahip">
            <select className="ab-gr" value={f.sahipId}
              onChange={(e) => yaz('sahipId', e.target.value)}>
              <option value="">atanmadı</option>
              {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
            </select>
          </Alan>
          <Alan etiket="Emanetçi">
            <select className="ab-gr" value={f.emanetciId}
              onChange={(e) => yaz('emanetciId', e.target.value)}>
              <option value="">atanmadı</option>
              {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
            </select>
          </Alan>
        </div>
      </Bolum>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" onClick={kaydet} disabled={bekliyor || !gecerli}>
          {f.id ? 'Kaydet' : 'Varlık oluştur'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
    </div>
  );
}

/* ── İlişki editörü ─────────────────────────────────────────────────── */

/** Bir ilişki satırı: özne · bağlaç · nesne · kaldır. Yön cümlede yaşar. */
export function IliskiEditoru({
  varlik, varliklar, sec, kapat,
}: {
  varlik: V; varliklar: V[]; sec: (id: string) => void; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [yeni, setYeni] = useState({ hedefId: '', tip: 'depends_on' });

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      {varlik.iliskiler.length === 0 ? (
        <p className="ab-panel-dip" style={{ margin: 0 }}>Tanımlı ilişki yok.</p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s3)' }}>
          {varlik.iliskiler.map((i) => (
            <div key={i.id} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--s10)',
              background: 'var(--panel)', border: 'var(--bw-hair) solid var(--hr2)',
              padding: 'var(--s10) var(--s14)',
            }}>
              <button type="button"
                onClick={() => sec(i.diger.id)}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer',
                  textAlign: 'left', font: 'inherit', color: 'inherit', minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontSize: 'var(--t-cell)', fontWeight: 600 }}>
                  {i.diger.etiket}
                </span>
                <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--veri)',
                  fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                  {i.giden
                    ? `${ILISKI_CUMLE[i.tip] ?? etiketle(i.tip)} ${i.diger.etiket}`
                    : `${i.diger.etiket} ${ILISKI_CUMLE[i.tip] ?? etiketle(i.tip)} bu varlık`}
                </span>
              </button>
              {varlik.yazilabilir && (
                <Dugme tur="satir" disabled={bekliyor}
                  aria-label={`${i.diger.etiket} ilişkisini kaldır`}
                  onClick={() => calistir(() => iliskiSil({ id: i.id }))}>✕</Dugme>
              )}
            </div>
          ))}
        </div>
      )}

      {varlik.yazilabilir && (
        <div style={{ display: 'grid', gap: 'var(--s12)' }}>
          <Alan etiket="Bağ">
            <select className="ab-gr" value={yeni.tip}
              onChange={(e) => setYeni({ ...yeni, tip: e.target.value })}>
              {ILISKI_TIPLERI.map((t) => (
                <option key={t} value={t}>{etiketle(t)}</option>
              ))}
            </select>
          </Alan>
          <Alan etiket="Hedef varlık">
            <select className="ab-gr" value={yeni.hedefId}
              onChange={(e) => setYeni({ ...yeni, hedefId: e.target.value })}>
              <option value="">seçin</option>
              {varliklar.filter((x) => x.id !== varlik.id).map((x) => (
                <option key={x.id} value={x.id}>{x.etiket} — {x.ad}</option>
              ))}
            </select>
          </Alan>
          <Dugme tur="tam" disabled={bekliyor || !yeni.hedefId}
            onClick={() => calistir(
              () => iliskiEkle({ kaynakId: varlik.id, hedefId: yeni.hedefId, tip: yeni.tip }),
              () => setYeni({ hedefId: '', tip: yeni.tip }),
            )}>
            İlişki ekle
          </Dugme>
        </div>
      )}

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
      <Dugme onClick={kapat} disabled={bekliyor}>Geri</Dugme>
    </div>
  );
}

/* ── Yaşam döngüsü ──────────────────────────────────────────────────── */

/** Emekli/imha DENETİMLİDİR: envanter/onay yetkisi ve gerekçe ister (§7.2). */
export function YasamFormu({ varlik, kapat }: { varlik: V; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [hedef, setHedef] = useState<string>(varlik.yasamDongusu);
  const [gerekce, setGerekce] = useState('');

  const denetimli = hedef === 'emekli' || hedef === 'imha';
  const yetki = denetimli ? varlik.onaylanabilir : varlik.yazilabilir;
  const gecerli = hedef !== varlik.yasamDongusu && yetki && (!denetimli || !!gerekce.trim());

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Yeni durum">
        <select className="ab-gr" value={hedef} onChange={(e) => setHedef(e.target.value)}>
          {YASAM_DONGULERI.map((s) => (
            <option key={s} value={s}>{YASAM_ETIKET[s]}</option>
          ))}
        </select>
      </Alan>

      {denetimli && (
        <Alan etiket="Gerekçe" zorunlu>
          <textarea className="ab-gr" rows={3} value={gerekce}
            placeholder={hedef === 'imha'
              ? 'Varlık neden imha ediliyor? Veri imha yöntemini yazın.'
              : 'Varlık neden emekliye ayrılıyor?'}
            onChange={(e) => setGerekce(e.target.value)} />
        </Alan>
      )}

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme tur="tam" disabled={bekliyor || !gecerli}
        onClick={() => calistir(() => varlikYasamDongusu({
          id: varlik.id, yasamDongusu: hedef, gerekce: gerekce.trim() || null,
        }), kapat)}>
        Geçişi kaydet
      </Dugme>
      <Dugme onClick={kapat} disabled={bekliyor}>Geri</Dugme>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        {denetimli
          ? 'Varlık listeden silinmez; yaşam döngüsü değişir ve gerekçe denetim izine yazılır.'
          : `Son güncelleme ${tarihTR(varlik.guncellendi)} · geçiş denetim izine yazılır.`}
      </p>
    </div>
  );
}
