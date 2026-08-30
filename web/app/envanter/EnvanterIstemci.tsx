'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pill, SegBar, Bos, type DurumSayilari } from '@/components/ui';
import Kip from '@/components/Kip';
import { useEylem } from '@/components/useEylem';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { varlikKaydet, iliskiEkle, iliskiSil, varlikYasamDongusu } from '@/lib/eylemler2/envanter';
import { VARLIK_SINIF_ETIKET, eolDurumu, tarihTR, type Durum } from '@/lib/sabitler';

type Kisi = { id: string; ad: string };
type Kodlu = { id: string; kod: string; ad: string };
type Tur = Kodlu & { sinif: string };
type Unite = Kodlu & { tesisId: string };
type Bolge = Kodlu & { tip: string };
type Iliski = { id: string; tip: string; diger: { id: string; etiket: string; ad: string } };

type V = {
  id: string; etiket: string; ad: string;
  tur: Tur; tesis: Kodlu | null; unite: Kodlu | null; sistem: Kodlu | null;
  bolge: Bolge | null; sahip: Kisi | null; emanetci: Kisi | null;
  tedarikci: { id: string; ad: string } | null; sozlesme: Kodlu | null;
  hostname: string | null; seriNo: string | null; uretici: string | null;
  model: string | null; ipAdresi: string | null; macAdresi: string | null;
  isletimSistemi: string | null; firmware: string | null; surum: string | null;
  rafOda: string | null; kimlikDogrulama: string | null;
  kritiklik: string; yamaDurumu: string; edrDurumu: string; yedekDurumu: string;
  izlemeDurumu: string; logKaynagi: string; internetMaruziyeti: string;
  uzaktanErisim: boolean | null; yasamDongusu: string;
  kurulumTarihi: string | null; garantiBitis: string | null; destekBitis: string | null;
  eolTarihi: string | null; eosTarihi: string | null; guncellendi: string;
  gidenIliskiler: Iliski[]; gelenIliskiler: Iliski[];
  riskler: { id: string; kod: string; baslik: string; durum: string }[];
  kanitlar: { id: string; ad: string; tip: string }[];
  acikZafiyet: number;
};

// ------------------------------------------------------------- sözlükler

const KRITIKLIKLER = ['kritik', 'yuksek', 'orta', 'dusuk', 'bilinmiyor'] as const;
const KRITIKLIK_ETIKET: Record<string, string> = {
  kritik: 'Kritik', yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük', bilinmiyor: 'Bilinmiyor',
};
const KRITIKLIK_RENGI: Record<string, Durum> = {
  kritik: 'uyumsuz', yuksek: 'uyumsuz', orta: 'kismi',
  dusuk: 'kapsamdisi', bilinmiyor: 'degerlendirilmedi',
};

const YASAM_DONGULERI = ['planlandi', 'aktif', 'bakim', 'emekli', 'imha'] as const;
const YASAM_ETIKET: Record<string, string> = {
  planlandi: 'Planlandı', aktif: 'Aktif', bakim: 'Bakım', emekli: 'Emekli', imha: 'İmha',
};
const YASAM_RENGI: Record<string, Durum> = {
  planlandi: 'incelemede', aktif: 'uyumlu', bakim: 'kismi', emekli: 'kapsamdisi', imha: 'kapsamdisi',
};

const ILISKI_TIPLERI = ['depends_on', 'runs_on', 'connects_to', 'hosts', 'backs_up'] as const;
/** Kaynak özne olacak şekilde okunur cümle bağlacı: "X şuna bağımlıdır: Y". */
const ILISKI_CUMLE: Record<string, string> = {
  depends_on: 'şuna bağımlıdır:', runs_on: 'şunun üzerinde çalışır:',
  connects_to: 'şuna bağlanır:', hosts: 'şunu barındırır:', backs_up: 'şunu yedekler:',
};

const YAMA_SECENEK = ['guncel', 'eksik', 'yamasiz', 'bilinmiyor'] as const;
const VAR_YOK_SECENEK = ['var', 'yok', 'bilinmiyor'] as const;
const MARUZIYET_SECENEK = ['yok', 'sinirli', 'var', 'bilinmiyor'] as const;
const DURUM_SOZ: Record<string, string> = {
  guncel: 'Güncel', eksik: 'Eksik', yamasiz: 'Yamasız',
  var: 'Var', yok: 'Yok', sinirli: 'Sınırlı', bilinmiyor: 'Bilinmiyor',
};

// -------------------------------------------------------------- yardımcı

/** EOL filtresi anahtarı: destekte | yaklasiyor | bitti | bilinmiyor. */
function eolAnahtar(eos: string | null): string {
  const d = eolDurumu(eos).durum;
  if (d === 'uyumsuz') return 'bitti';
  if (d === 'kismi') return 'yaklasiyor';
  if (d === 'uyumlu') return 'destekte';
  return 'bilinmiyor';
}

/** Bilinmeyen birinci sınıftır: hangi alanlar 'bilinmiyor'? */
function bilinmeyenAlanlar(v: V): string[] {
  const b: string[] = [];
  if (v.kritiklik === 'bilinmiyor') b.push('kritiklik');
  if (!v.eosTarihi) b.push('EOS tarihi');
  if (v.yamaDurumu === 'bilinmiyor') b.push('yama');
  if (v.edrDurumu === 'bilinmiyor') b.push('EDR');
  if (v.yedekDurumu === 'bilinmiyor') b.push('yedek');
  if (v.izlemeDurumu === 'bilinmiyor') b.push('izleme');
  if (v.logKaynagi === 'bilinmiyor') b.push('log');
  if (v.internetMaruziyeti === 'bilinmiyor') b.push('internet maruziyeti');
  return b;
}

function noktaRenk(deger: string): string {
  if (deger === 'guncel' || deger === 'var') return 'var(--uyumlu-dot)';
  if (deger === 'eksik' || deger === 'yok' || deger === 'yamasiz') return 'var(--uyumsuz-dot)';
  return 'var(--kapsamdisi-dot)'; // bilinmiyor = gri
}

/** Yama/EDR/yedek/izleme/log — beş küçük nokta; title açıklar. */
function KorumaNoktalari({ v }: { v: V }) {
  const alanlar: [string, string][] = [
    ['Yama', v.yamaDurumu], ['EDR', v.edrDurumu], ['Yedek', v.yedekDurumu],
    ['İzleme', v.izlemeDurumu], ['Log', v.logKaynagi],
  ];
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {alanlar.map(([ad, d]) => (
        <span key={ad} title={`${ad}: ${DURUM_SOZ[d] ?? d}`} style={{
          width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
          background: noktaRenk(d),
        }} />
      ))}
    </span>
  );
}

/** Salt okunur alan satırı — boş değerler gizlenmez, '—' ile gösterilir. */
function Alan({ ad, deger, mono }: { ad: string; deger: React.ReactNode; mono?: boolean }) {
  return (
    <div className="form-satir">
      <span>{ad}</span>
      <span className={mono ? 'mono' : undefined} style={{ fontSize: 'var(--fs-sm)' }}>
        {deger ?? '—'}
      </span>
    </div>
  );
}

// ------------------------------------------------------------ varlık formu

type FormDurumu = {
  id?: string; etiket: string; ad: string; turId: string;
  tesisId: string; uniteId: string; sistemId: string; bolgeId: string;
  sahipId: string; emanetciId: string;
  hostname: string; seriNo: string; uretici: string; model: string;
  ipAdresi: string; macAdresi: string; isletimSistemi: string;
  firmware: string; surum: string; rafOda: string; kimlikDogrulama: string;
  kritiklik: string; yamaDurumu: string; edrDurumu: string; yedekDurumu: string;
  izlemeDurumu: string; logKaynagi: string; internetMaruziyeti: string;
  uzaktanErisim: string; // '' = bilinmiyor | evet | hayir
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

function VarlikFormu({ varlik, turler, tesisler, uniteler, sistemler, bolgeler, kullanicilar, kapat }: {
  varlik: V | null; turler: Tur[]; tesisler: Kodlu[]; uniteler: Unite[];
  sistemler: Kodlu[]; bolgeler: Bolge[]; kullanicilar: Kisi[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState<FormDurumu>(() => formBaslat(varlik));
  const uygunUniteler = uniteler.filter((u) => u.tesisId === f.tesisId);

  function metinAlani(ad: keyof FormDurumu, etiket: string, mono?: boolean, genis?: boolean) {
    return (
      <label className="form-satir" style={genis ? { gridColumn: 'span 2' } : undefined}>
        <span>{etiket}</span>
        <input className={mono ? 'inp mono' : 'inp'} value={f[ad] as string}
          onChange={(e) => setF({ ...f, [ad]: e.target.value })} />
      </label>
    );
  }
  function durumAlani(ad: keyof FormDurumu, etiket: string, secenekler: readonly string[]) {
    return (
      <label className="form-satir">
        <span>{etiket}</span>
        <select className="sec" value={f[ad] as string}
          onChange={(e) => setF({ ...f, [ad]: e.target.value })}>
          {secenekler.map((s) => <option key={s} value={s}>{DURUM_SOZ[s] ?? s}</option>)}
        </select>
      </label>
    );
  }
  function tarihAlaniGir(ad: keyof FormDurumu, etiket: string) {
    return (
      <label className="form-satir">
        <span>{etiket}</span>
        <input className="inp" type="date" value={f[ad] as string}
          onChange={(e) => setF({ ...f, [ad]: e.target.value })} />
      </label>
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
      uzaktanErisim: f.uzaktanErisim === '' ? null : f.uzaktanErisim === 'evet',
      kurulumTarihi: f.kurulumTarihi || null, garantiBitis: f.garantiBitis || null,
      destekBitis: f.destekBitis || null, eolTarihi: f.eolTarihi || null,
      eosTarihi: f.eosTarihi || null,
    }), kapat);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div>
        <span className="mikro-etiket">Kimlik ve konum</span>
        <div className="form-izgara" style={{ marginTop: 'var(--sp-2)' }}>
          {metinAlani('etiket', 'Etiket', true)}
          {metinAlani('ad', 'Ad', false, true)}
          <label className="form-satir">
            <span>Tür</span>
            <select className="sec" value={f.turId}
              onChange={(e) => setF({ ...f, turId: e.target.value })}>
              <option value="">Seçin…</option>
              {turler.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ad} ({VARLIK_SINIF_ETIKET[t.sinif] ?? t.sinif})
                </option>
              ))}
            </select>
          </label>
          <label className="form-satir">
            <span>Tesis</span>
            <select className="sec" value={f.tesisId}
              onChange={(e) => setF({ ...f, tesisId: e.target.value, uniteId: '' })}>
              <option value="">—</option>
              {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
            </select>
          </label>
          <label className="form-satir">
            <span>Ünite</span>
            <select className="sec" value={f.uniteId} disabled={!f.tesisId}
              onChange={(e) => setF({ ...f, uniteId: e.target.value })}>
              <option value="">—</option>
              {uygunUniteler.map((u) => <option key={u.id} value={u.id}>{u.kod} — {u.ad}</option>)}
            </select>
          </label>
          <label className="form-satir">
            <span>Sistem/Servis</span>
            <select className="sec" value={f.sistemId}
              onChange={(e) => setF({ ...f, sistemId: e.target.value })}>
              <option value="">—</option>
              {sistemler.map((s) => <option key={s.id} value={s.id}>{s.kod} — {s.ad}</option>)}
            </select>
          </label>
          <label className="form-satir">
            <span>Ağ bölgesi</span>
            <select className="sec" value={f.bolgeId}
              onChange={(e) => setF({ ...f, bolgeId: e.target.value })}>
              <option value="">—</option>
              {bolgeler.map((b) => <option key={b.id} value={b.id}>{b.kod} — {b.ad}</option>)}
            </select>
          </label>
          {metinAlani('rafOda', 'Raf / oda')}
        </div>
      </div>

      <div>
        <span className="mikro-etiket">Donanım ve yazılım</span>
        <div className="form-izgara" style={{ marginTop: 'var(--sp-2)' }}>
          {metinAlani('uretici', 'Üretici')}
          {metinAlani('model', 'Model')}
          {metinAlani('seriNo', 'Seri no', true)}
          {metinAlani('hostname', 'Hostname', true)}
          {metinAlani('ipAdresi', 'IP adresi', true)}
          {metinAlani('macAdresi', 'MAC adresi', true)}
          {metinAlani('isletimSistemi', 'İşletim sistemi')}
          {metinAlani('firmware', 'Firmware', true)}
          {metinAlani('surum', 'Sürüm', true)}
          {metinAlani('kimlikDogrulama', 'Kimlik doğrulama')}
        </div>
      </div>

      <div>
        <span className="mikro-etiket">Kritiklik ve maruziyet — boş bırakmak yerine “Bilinmiyor” seçin</span>
        <div className="form-izgara" style={{ marginTop: 'var(--sp-2)' }}>
          <label className="form-satir">
            <span>Kritiklik</span>
            <select className="sec" value={f.kritiklik}
              onChange={(e) => setF({ ...f, kritiklik: e.target.value })}>
              {KRITIKLIKLER.map((s) => <option key={s} value={s}>{KRITIKLIK_ETIKET[s]}</option>)}
            </select>
          </label>
          {durumAlani('internetMaruziyeti', 'İnternet maruziyeti', MARUZIYET_SECENEK)}
          <label className="form-satir">
            <span>Uzaktan erişim</span>
            <select className="sec" value={f.uzaktanErisim}
              onChange={(e) => setF({ ...f, uzaktanErisim: e.target.value })}>
              <option value="">Bilinmiyor</option>
              <option value="evet">Var</option>
              <option value="hayir">Yok</option>
            </select>
          </label>
          {durumAlani('yamaDurumu', 'Yama durumu', YAMA_SECENEK)}
          {durumAlani('edrDurumu', 'EDR', VAR_YOK_SECENEK)}
          {durumAlani('yedekDurumu', 'Yedekleme', VAR_YOK_SECENEK)}
          {durumAlani('izlemeDurumu', 'İzleme', VAR_YOK_SECENEK)}
          {durumAlani('logKaynagi', 'Log kaynağı', VAR_YOK_SECENEK)}
        </div>
      </div>

      <div>
        <span className="mikro-etiket">Tarihler ve sahiplik</span>
        <div className="form-izgara" style={{ marginTop: 'var(--sp-2)' }}>
          {tarihAlaniGir('kurulumTarihi', 'Kurulum')}
          {tarihAlaniGir('garantiBitis', 'Garanti bitiş')}
          {tarihAlaniGir('destekBitis', 'Destek bitiş')}
          {tarihAlaniGir('eolTarihi', 'EOL tarihi')}
          {tarihAlaniGir('eosTarihi', 'EOS tarihi')}
          <label className="form-satir">
            <span>Sahip</span>
            <select className="sec" value={f.sahipId}
              onChange={(e) => setF({ ...f, sahipId: e.target.value })}>
              <option value="">—</option>
              {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
            </select>
          </label>
          <label className="form-satir">
            <span>Emanetçi</span>
            <select className="sec" value={f.emanetciId}
              onChange={(e) => setF({ ...f, emanetciId: e.target.value })}>
              <option value="">—</option>
              {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="filtreler">
        {hata && <span className="pill durum-uyumsuz" role="alert">{hata}</span>}
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={kapat} disabled={bekliyor}>Vazgeç</button>
        <button className="btn birincil" onClick={kaydet}
          disabled={bekliyor || !f.etiket.trim() || !f.ad.trim() || !f.turId}>
          {f.id ? 'Kaydet' : 'Varlık oluştur'}
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- ana ekran

export default function EnvanterIstemci({
  varliklar, turler, tesisler, uniteler, sistemler, bolgeler, kullanicilar,
}: {
  varliklar: V[]; turler: Tur[]; tesisler: Kodlu[]; uniteler: Unite[];
  sistemler: Kodlu[]; bolgeler: Bolge[]; kullanicilar: Kisi[];
}) {
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const [arama, setArama] = useState('');
  const [tesisF, setTesisF] = useState('hepsi');
  const [sinifF, setSinifF] = useState('hepsi');
  const [turF, setTurF] = useState('hepsi');
  const [kritiklikF, setKritiklikF] = useState('hepsi');
  const [eolF, setEolF] = useState('hepsi');
  const [yasamF, setYasamF] = useState('kullanimda');
  const [bilinmezF, setBilinmezF] = useState(false);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [duzenle, setDuzenle] = useState(false);
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniIliski, setYeniIliski] = useState({ hedefId: '', tip: 'depends_on' });
  const [gecis, setGecis] = useState<{ hedef: string; gerekce: string } | null>(null);

  const secili = varliklar.find((v) => v.id === seciliId) ?? null;

  const gorunen = useMemo(() => varliklar.filter((v) => {
    if (yasamF === 'kullanimda' && (v.yasamDongusu === 'emekli' || v.yasamDongusu === 'imha')) return false;
    if (yasamF !== 'hepsi' && yasamF !== 'kullanimda' && v.yasamDongusu !== yasamF) return false;
    if (tesisF !== 'hepsi' && v.tesis?.id !== tesisF) return false;
    if (sinifF !== 'hepsi' && v.tur.sinif !== sinifF) return false;
    if (turF !== 'hepsi' && v.tur.id !== turF) return false;
    if (kritiklikF !== 'hepsi' && v.kritiklik !== kritiklikF) return false;
    if (eolF !== 'hepsi' && eolAnahtar(v.eosTarihi) !== eolF) return false;
    if (bilinmezF && bilinmeyenAlanlar(v).length === 0) return false;
    if (arama && !`${v.etiket} ${v.ad} ${v.hostname ?? ''} ${v.ipAdresi ?? ''} ${v.isletimSistemi ?? ''} ${v.tesis?.kod ?? ''}`
      .toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    return true;
  }), [varliklar, arama, tesisF, sinifF, turF, kritiklikF, eolF, yasamF, bilinmezF]);

  // üst band — emekli/imha hariç genel görünüm, filtrelerden bağımsız
  const kullanimda = varliklar.filter((v) => v.yasamDongusu !== 'emekli' && v.yasamDongusu !== 'imha');
  const eolSayilari: DurumSayilari = {};
  for (const v of kullanimda) {
    const d = eolDurumu(v.eosTarihi).durum;
    eolSayilari[d] = (eolSayilari[d] ?? 0) + 1;
  }
  const otSayisi = kullanimda.filter((v) => v.tur.sinif === 'OT').length;
  const kopruSayisi = kullanimda.filter((v) => v.tur.sinif === 'BT_OT_KOPRU').length;
  const eosGecmis = kullanimda.filter((v) => eolAnahtar(v.eosTarihi) === 'bitti').length;
  const yamasiz = kullanimda.filter((v) => v.yamaDurumu === 'yamasiz').length;
  const bilinmezli = kullanimda.filter((v) => bilinmeyenAlanlar(v).length > 0).length;

  function detayKapat() {
    setSeciliId(null); setDuzenle(false); setHata(null);
    setYeniIliski({ hedefId: '', tip: 'depends_on' });
  }

  const iliskiler = secili ? [
    ...secili.gidenIliskiler.map((i) => ({ ...i, ozne: secili, nesne: i.diger })),
    ...secili.gelenIliskiler.map((i) => ({ ...i, ozne: i.diger, nesne: secili })),
  ] : [];

  return (
    <>
      <div className="kart">
        <div className="band">
          <div className="band-hucre" title="Emekli ve imha edilmiş varlıklar hariç">
            <span className="mikro-etiket">Toplam varlık</span>
            <span className="metrik-dev">{kullanimda.length}</span>
            <SegBar sayilar={eolSayilari} />
          </div>
          <div className="band-hucre" title={`BT/OT köprü: ${kopruSayisi}`}>
            <span className="mikro-etiket">OT varlık</span>
            <span className="metrik-dev">{otSayisi}</span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">EOS geçmiş</span>
            <span className="metrik-dev"
              style={eosGecmis ? { color: 'var(--uyumsuz-fg)' } : undefined}>{eosGecmis}</span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Yamasız</span>
            <span className="metrik-dev"
              style={yamasiz ? { color: 'var(--uyumsuz-fg)' } : undefined}>{yamasiz}</span>
          </div>
          <div className="band-hucre" onClick={() => setBilinmezF(!bilinmezF)}
            style={{ cursor: 'pointer' }}
            title="Kritikliği, EOS tarihi veya koruma durumlarından biri bilinmeyen varlıklar — tıklayıp listeleyin">
            <span className="mikro-etiket">Bilinmeyen alanlı{bilinmezF && ' ✓'}</span>
            <span className="metrik-dev" style={{ color: 'var(--kapsamdisi-fg)' }}>{bilinmezli}</span>
          </div>
        </div>
      </div>

      <div className="filtreler">
        <input className="inp" placeholder="Varlık ara…" value={arama}
          onChange={(e) => setArama(e.target.value)} style={{ minWidth: 200 }} />
        <select className="sec" value={tesisF} onChange={(e) => setTesisF(e.target.value)}>
          <option value="hepsi">Tüm tesisler</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod}</option>)}
        </select>
        <select className="sec" value={sinifF} onChange={(e) => setSinifF(e.target.value)}>
          <option value="hepsi">Tüm sınıflar</option>
          {Object.entries(VARLIK_SINIF_ETIKET).map(([s, e]) => <option key={s} value={s}>{e}</option>)}
        </select>
        <select className="sec" value={turF} onChange={(e) => setTurF(e.target.value)}>
          <option value="hepsi">Tüm türler</option>
          {turler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
        </select>
        <select className="sec" value={kritiklikF} onChange={(e) => setKritiklikF(e.target.value)}>
          <option value="hepsi">Tüm kritiklikler</option>
          {KRITIKLIKLER.map((s) => <option key={s} value={s}>{KRITIKLIK_ETIKET[s]}</option>)}
        </select>
        <select className="sec" value={eolF} onChange={(e) => setEolF(e.target.value)}>
          <option value="hepsi">Tüm EOL durumları</option>
          <option value="destekte">Destekte</option>
          <option value="yaklasiyor">1 yıldan az kaldı</option>
          <option value="bitti">Destek bitti</option>
          <option value="bilinmiyor">EOS bilinmiyor</option>
        </select>
        <select className="sec" value={yasamF} onChange={(e) => setYasamF(e.target.value)}>
          <option value="kullanimda">Kullanımda (emekli/imha hariç)</option>
          <option value="hepsi">Tüm yaşam döngüleri</option>
          {YASAM_DONGULERI.map((s) => <option key={s} value={s}>{YASAM_ETIKET[s]}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn yazdirmada-gizle" onClick={pdfYazdir}>🖨 PDF</button>
        <button className="btn yazdirmada-gizle" onClick={() => exceleAktar('envanter', [{
          ad: 'Envanter', satirlar: [
            ['Etiket', 'Ad', 'Tür', 'Sınıf', 'Tesis', 'Bölge', 'Kritiklik', 'İşletim sistemi',
              'EOS tarihi', 'EOS durumu', 'Yama', 'EDR', 'Yedek', 'İzleme', 'Log',
              'Yaşam döngüsü', 'Bilinmeyen alanlar'],
            ...gorunen.map((v) => [v.etiket, v.ad, v.tur.ad,
              VARLIK_SINIF_ETIKET[v.tur.sinif] ?? v.tur.sinif, v.tesis?.kod, v.bolge?.kod,
              KRITIKLIK_ETIKET[v.kritiklik] ?? v.kritiklik, v.isletimSistemi,
              v.eosTarihi ? tarihTR(v.eosTarihi) : '', eolDurumu(v.eosTarihi).etiket,
              DURUM_SOZ[v.yamaDurumu], DURUM_SOZ[v.edrDurumu], DURUM_SOZ[v.yedekDurumu],
              DURUM_SOZ[v.izlemeDurumu], DURUM_SOZ[v.logKaynagi],
              YASAM_ETIKET[v.yasamDongusu] ?? v.yasamDongusu,
              bilinmeyenAlanlar(v).join(', ')]),
          ] }])}>⤓ Excel</button>
        <button className="btn birincil yazdirmada-gizle" onClick={() => setYeniAcik(true)}>
          + Yeni varlık</button>
      </div>

      <div className="kart">
        <div className="tablo-sar">
          <table className="tablo">
            <thead><tr>
              <th></th><th>Etiket</th><th>Varlık</th><th>Tür</th><th>Sınıf</th>
              <th>Tesis</th><th>Kritiklik</th><th>EOS</th>
            </tr></thead>
            <tbody>
              {gorunen.map((v) => {
                const eol = eolDurumu(v.eosTarihi);
                return (
                  <tr key={v.id} onClick={() => { setSeciliId(v.id); setDuzenle(false); }}
                    style={{ cursor: 'pointer' }}>
                    <td style={{ width: 4, padding: 0 }}>
                      <div className={`serit serit-${KRITIKLIK_RENGI[v.kritiklik] ?? 'degerlendirilmedi'}`}
                        style={{ height: 28, marginLeft: 'var(--sp-2)' }} />
                    </td>
                    <td><span className="chip mono">{v.etiket}</span></td>
                    <td style={{ maxWidth: 360 }}>
                      <span style={{ fontWeight: 500 }}>{v.ad}</span>
                      {v.yasamDongusu !== 'aktif' && (
                        <>{' '}<Pill durum={YASAM_RENGI[v.yasamDongusu] ?? 'kapsamdisi'}
                          etiket={YASAM_ETIKET[v.yasamDongusu] ?? v.yasamDongusu} hollow /></>
                      )}
                      <div className="mikro-etiket sirada-gizli"
                        style={{ letterSpacing: '.03em', display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                        {v.bolge && <span className="chip mono" style={{ fontSize: 'inherit' }}>{v.bolge.kod}</span>}
                        {v.isletimSistemi && <span>{v.isletimSistemi}</span>}
                        <KorumaNoktalari v={v} />
                        {v.acikZafiyet > 0 && <span>{v.acikZafiyet} açık zafiyet</span>}
                      </div>
                    </td>
                    <td><span className="chip">{v.tur.ad}</span></td>
                    <td><span className="chip">{VARLIK_SINIF_ETIKET[v.tur.sinif] ?? v.tur.sinif}</span></td>
                    <td>{v.tesis ? <span className="chip mono" title={v.tesis.ad}>{v.tesis.kod}</span> : '—'}</td>
                    <td><Pill durum={KRITIKLIK_RENGI[v.kritiklik] ?? 'degerlendirilmedi'}
                      etiket={KRITIKLIK_ETIKET[v.kritiklik] ?? v.kritiklik}
                      hollow={v.kritiklik === 'yuksek'} /></td>
                    <td><Pill durum={eol.durum} etiket={eol.etiket} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {gorunen.length === 0 && <Bos baslik="Eşleşen varlık yok"
            altMetin={bilinmezF ? 'Bilinmeyen alanlı filtresi etkin.' : undefined} />}
        </div>
      </div>

      {/* --------------------------------------------------- detay kip'i */}
      <Kip acik={!!secili} kapat={detayKapat} genis
        ust={secili && (
          <span className="mikro-etiket">
            <span className="mono">{secili.etiket}</span>
            {` · ${secili.tur.ad} · ${VARLIK_SINIF_ETIKET[secili.tur.sinif] ?? secili.tur.sinif}`}
            {` · güncellendi ${tarihTR(secili.guncellendi)}`}
          </span>
        )}
        baslik={secili?.ad ?? ''}>
        {secili && (duzenle ? (
          <VarlikFormu varlik={secili} turler={turler} tesisler={tesisler} uniteler={uniteler}
            sistemler={sistemler} bolgeler={bolgeler} kullanicilar={kullanicilar}
            kapat={() => setDuzenle(false)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="filtreler">
              <Pill durum={KRITIKLIK_RENGI[secili.kritiklik] ?? 'degerlendirilmedi'}
                etiket={`Kritiklik: ${KRITIKLIK_ETIKET[secili.kritiklik] ?? secili.kritiklik}`}
                hollow={secili.kritiklik === 'yuksek'} />
              <Pill durum={eolDurumu(secili.eosTarihi).durum}
                etiket={`EOS: ${eolDurumu(secili.eosTarihi).etiket}`} />
              <Pill durum={YASAM_RENGI[secili.yasamDongusu] ?? 'kapsamdisi'}
                etiket={YASAM_ETIKET[secili.yasamDongusu] ?? secili.yasamDongusu} />
              {secili.tesis && <span className="chip mono" title={secili.tesis.ad}>{secili.tesis.kod}</span>}
              {secili.unite && <span className="chip mono" title={secili.unite.ad}>{secili.unite.kod}</span>}
              {secili.bolge && <span className="chip mono" title={`Ağ bölgesi: ${secili.bolge.ad}`}>
                {secili.bolge.kod}</span>}
              {secili.sistem && <span className="chip mono" title={secili.sistem.ad}>{secili.sistem.kod}</span>}
            </div>

            <div>
              <span className="mikro-etiket">Koruma durumları</span>
              <div className="filtreler" style={{ marginTop: 'var(--sp-2)' }}>
                {([['Yama', secili.yamaDurumu], ['EDR', secili.edrDurumu],
                  ['Yedekleme', secili.yedekDurumu], ['İzleme', secili.izlemeDurumu],
                  ['Log kaynağı', secili.logKaynagi],
                  ['İnternet maruziyeti', secili.internetMaruziyeti],
                  ['Uzaktan erişim', secili.uzaktanErisim === null
                    ? 'bilinmiyor' : secili.uzaktanErisim ? 'var' : 'yok'],
                ] as [string, string][]).map(([ad, d]) => (
                  <span key={ad} className="chip"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%',
                      background: ad === 'İnternet maruziyeti'
                        ? (d === 'bilinmiyor' ? 'var(--kapsamdisi-dot)'
                          : d === 'yok' ? 'var(--uyumlu-dot)' : 'var(--kismi-dot)')
                        : noktaRenk(d) }} />
                    {ad}: {DURUM_SOZ[d] ?? d}
                  </span>
                ))}
              </div>
            </div>

            <div className="form-izgara">
              <Alan ad="Hostname" deger={secili.hostname} mono />
              <Alan ad="IP adresi" deger={secili.ipAdresi} mono />
              <Alan ad="MAC adresi" deger={secili.macAdresi} mono />
              <Alan ad="İşletim sistemi" deger={secili.isletimSistemi} />
              <Alan ad="Firmware" deger={secili.firmware} mono />
              <Alan ad="Sürüm" deger={secili.surum} mono />
              <Alan ad="Üretici" deger={secili.uretici} />
              <Alan ad="Model" deger={secili.model} />
              <Alan ad="Seri no" deger={secili.seriNo} mono />
              <Alan ad="Raf / oda" deger={secili.rafOda} />
              <Alan ad="Kimlik doğrulama" deger={secili.kimlikDogrulama} />
              <Alan ad="Kurulum" deger={secili.kurulumTarihi ? tarihTR(secili.kurulumTarihi) : null} />
              <Alan ad="Garanti bitiş" deger={secili.garantiBitis ? tarihTR(secili.garantiBitis) : null} />
              <Alan ad="Destek bitiş" deger={secili.destekBitis ? tarihTR(secili.destekBitis) : null} />
              <Alan ad="EOL tarihi" deger={secili.eolTarihi ? tarihTR(secili.eolTarihi) : null} />
              <Alan ad="EOS tarihi" deger={secili.eosTarihi ? tarihTR(secili.eosTarihi) : null} />
              <Alan ad="Sahip" deger={secili.sahip?.ad} />
              <Alan ad="Emanetçi" deger={secili.emanetci?.ad} />
              <Alan ad="Tedarikçi" deger={secili.tedarikci?.ad} />
              <Alan ad="Sözleşme" deger={secili.sozlesme ? `${secili.sozlesme.kod} — ${secili.sozlesme.ad}` : null} />
            </div>

            {bilinmeyenAlanlar(secili).length > 0 && (
              <div className="filtreler">
                <Pill durum="degerlendirilmedi"
                  etiket={`Bilinmeyen alanlar: ${bilinmeyenAlanlar(secili).join(', ')}`} hollow />
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-4)' }}>
              <span className="mikro-etiket">İlişkiler</span>
              {iliskiler.length === 0 && (
                <p className="mikro-etiket" style={{ margin: 'var(--sp-2) 0 0' }}>
                  Tanımlı ilişki yok.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)',
                marginTop: 'var(--sp-2)' }}>
                {iliskiler.map((i) => (
                  <div key={i.id} className="filtreler" style={{ gap: 'var(--sp-2)' }}>
                    <span className="chip mono" title={i.ozne.ad}>{i.ozne.etiket}</span>
                    <span style={{ color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
                      {ILISKI_CUMLE[i.tip] ?? i.tip}
                    </span>
                    <span className="chip mono" title={i.nesne.ad}>{i.nesne.etiket}</span>
                    <span className="mikro-etiket mono">{i.tip}</span>
                    <button className="chip-sil" title="İlişkiyi kaldır" disabled={bekliyor}
                      onClick={() => calistir(() => iliskiSil({ id: i.id }))}>✕</button>
                  </div>
                ))}
              </div>
              <div className="filtreler" style={{ marginTop: 'var(--sp-3)' }}>
                <span className="chip mono">{secili.etiket}</span>
                <select className="sec" value={yeniIliski.tip}
                  onChange={(e) => setYeniIliski({ ...yeniIliski, tip: e.target.value })}>
                  {ILISKI_TIPLERI.map((t) => (
                    <option key={t} value={t}>{ILISKI_CUMLE[t]} ({t})</option>
                  ))}
                </select>
                <select className="sec" value={yeniIliski.hedefId} style={{ minWidth: 220 }}
                  onChange={(e) => setYeniIliski({ ...yeniIliski, hedefId: e.target.value })}>
                  <option value="">Hedef varlık seçin…</option>
                  {varliklar.filter((v) => v.id !== secili.id).map((v) => (
                    <option key={v.id} value={v.id}>{v.etiket} — {v.ad}</option>
                  ))}
                </select>
                <button className="btn kucuk" disabled={bekliyor || !yeniIliski.hedefId}
                  onClick={() => calistir(
                    () => iliskiEkle({ kaynakId: secili.id, hedefId: yeniIliski.hedefId, tip: yeniIliski.tip }),
                    () => setYeniIliski({ hedefId: '', tip: yeniIliski.tip }),
                  )}>+ İlişki ekle</button>
              </div>
            </div>

            {(secili.riskler.length > 0 || secili.kanitlar.length > 0 || secili.acikZafiyet > 0) && (
              <div>
                <span className="mikro-etiket">Bağlı riskler ve kanıtlar</span>
                <div className="filtreler" style={{ marginTop: 'var(--sp-2)' }}>
                  {secili.riskler.map((r) => (
                    <Link key={r.id} className="chip mono" href="/riskler" title={r.baslik}>
                      ⚠ {r.kod}</Link>
                  ))}
                  {secili.kanitlar.map((ka) => (
                    <span key={ka.id} className="chip" title={ka.tip}>▤ {ka.ad}</span>
                  ))}
                  {secili.acikZafiyet > 0 && (
                    <Pill durum="uyumsuz" etiket={`${secili.acikZafiyet} açık zafiyet`} hollow />
                  )}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-4)' }}>
              <span className="mikro-etiket">
                Yaşam döngüsü — emekli/imha geçişi onay yetkisi ve gerekçe ister
              </span>
              <div className="filtreler" style={{ marginTop: 'var(--sp-2)' }}>
                {YASAM_DONGULERI.map((s) => (
                  <button key={s} disabled={bekliyor || secili.yasamDongusu === s}
                    className={`btn kucuk${secili.yasamDongusu === s ? ' birincil' : ''}`}
                    onClick={() => {
                      if (s === 'emekli' || s === 'imha') setGecis({ hedef: s, gerekce: '' });
                      else calistir(() => varlikYasamDongusu({ id: secili.id, yasamDongusu: s }));
                    }}>
                    {YASAM_ETIKET[s]}
                  </button>
                ))}
                <span style={{ flex: 1 }} />
                <button className="btn kucuk" onClick={() => setDuzenle(true)}>✎ Düzenle</button>
              </div>
              {hata && <p className="pill durum-uyumsuz" role="alert"
                style={{ marginTop: 'var(--sp-2)' }}>{hata}</p>}
            </div>
          </div>
        ))}
      </Kip>

      {/* ------------------------------------------------ yeni varlık kip'i */}
      <Kip acik={yeniAcik} kapat={() => setYeniAcik(false)} genis baslik="Yeni varlık"
        ust={<span className="mikro-etiket">Bilinmeyen alanları boş bırakın veya “Bilinmiyor” seçin — 0 sayılmaz</span>}>
        {yeniAcik && (
          <VarlikFormu varlik={null} turler={turler} tesisler={tesisler} uniteler={uniteler}
            sistemler={sistemler} bolgeler={bolgeler} kullanicilar={kullanicilar}
            kapat={() => setYeniAcik(false)} />
        )}
      </Kip>

      {/* --------------------------------------- emekli/imha onay kip'i */}
      <Kip acik={!!gecis} kapat={() => setGecis(null)}
        baslik={gecis?.hedef === 'imha' ? 'Varlığı imha et' : 'Varlığı emekliye ayır'}
        ust={secili && <span className="mikro-etiket mono">{secili.etiket}</span>}>
        {gecis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
              Bu geçiş denetimlidir: envanter onay yetkisi ister, gerekçeyle birlikte
              aktivite kaydına yazılır. Varlık listeden silinmez, yaşam döngüsü değişir.
            </p>
            <label className="form-satir">
              <span>Gerekçe (zorunlu)</span>
              <textarea className="inp" rows={3} value={gecis.gerekce}
                placeholder={gecis.hedef === 'imha'
                  ? 'Varlık neden imha ediliyor? Veri imha yöntemini belirtin.'
                  : 'Varlık neden emekliye ayrılıyor?'}
                onChange={(e) => setGecis({ ...gecis, gerekce: e.target.value })} />
            </label>
            <div className="filtreler">
              {hata && <span className="pill durum-uyumsuz" role="alert">{hata}</span>}
              <span style={{ flex: 1 }} />
              <button className="btn" onClick={() => setGecis(null)} disabled={bekliyor}>Vazgeç</button>
              <button className="btn birincil"
                disabled={bekliyor || !gecis.gerekce.trim() || !secili}
                onClick={() => secili && calistir(
                  () => varlikYasamDongusu({
                    id: secili.id, yasamDongusu: gecis.hedef, gerekce: gecis.gerekce,
                  }),
                  () => setGecis(null),
                )}>
                {gecis.hedef === 'imha' ? 'İmha et' : 'Emekliye ayır'}
              </button>
            </div>
          </div>
        )}
      </Kip>
    </>
  );
}
