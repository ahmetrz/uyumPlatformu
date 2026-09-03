'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceEylemler } from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { zamanTR } from '@/lib/sabitler';
import type { FormAlani, Modul } from '@/lib/yonetim/moduller';
import { degerMetni, type AyarTanimi } from '@/lib/yapilandirma/tanimlar';
import {
  SAHA_MODULLERI, SAHA_MODUL_SOZLUGU, gorunur, kpiSirasi, sozlesmeKontrol, yerlesimDogrula, yerlesimFarki,
  yerlesimMetni, yerlesimNormalle, type SahaYerlesimi,
} from '@/lib/yonetim/sahaModulleri';
import {
  OLCULMEMIS_ILK_KAC_TAVAN, olculmemisDogrula, olculmemisMetni, olculmemisNormalle,
  type OlculmemisGosterimi,
} from '@/lib/yonetim/olculmemisGosterimi';
import {
  ayarKaydet, degisiklikIptal, degisiklikOnayla, degisiklikOner, degisiklikReddet, degisiklikUygula,
  etkiHesapla, katalogArsivle, katalogKaydet, tesisGorselAta, type EtkiSatiri,
} from '@/lib/eylemler2/yonetim';
import {
  EYLEM_ETIKET, TALEP_DURUM_ETIKET, TALEP_DURUM_IMI, degerYaz, fark,
  type IzKaydi, type KonsolAyar, type KonsolKayit, type KonsolVerisi, type Talep,
} from './konsolOrtak';

/* ═══ Konsol çekmeceleri — form, fark, etki, geçmiş ═══════════════════════

   Değişiklik modeli tek yerde uygulanır:
     A (doğrudan)  : form → fark ön izlemesi → gerekçe → Kaydet   (iz yazılır)
     B (onaylı)    : form → fark → etki → gerekçe → İncelemeye gönder
                     → başka bir onaycı Onaylar → Uygula (dört göz)
   Yıkıcı işlem (arşiv/pasif) iki adımdır ve gerekçe ister. Düğmelerin
   gizlenmesi yetki değildir; sunucu her eylemi ayrıca kapıdan geçirir. */

const GEREKCE_ASGARI = 10;

type Degerler = Record<string, unknown>;

function secenekListesi(alan: FormAlani, veri: KonsolVerisi): { id: string; ad: string }[] {
  if (!alan.secenekler) return [];
  if (Array.isArray(alan.secenekler)) return alan.secenekler;
  if (alan.secenekler === 'gorsel') return veri.secenekler.gorsel;
  return veri.secenekler[alan.secenekler].map((k) => ({ id: k.id, ad: `${k.kod} · ${k.ad}` }));
}

function secenekAdi(alan: FormAlani, veri: KonsolVerisi, id: unknown): string {
  if (id === null || id === undefined || id === '') return '—';
  return secenekListesi(alan, veri).find((s) => s.id === String(id))?.ad ?? String(id);
}

/** Alan değerini okunur hâle getirir (seçimler ad ile). */
function alanDegeri(alan: FormAlani, veri: KonsolVerisi, v: unknown): string {
  if (alan.tip === 'secim') return secenekAdi(alan, veri, v);
  return degerYaz(v);
}

function baslangicDegerleri(alanlar: FormAlani[], kaynak?: Degerler): Degerler {
  const d: Degerler = {};
  for (const a of alanlar) {
    const v = kaynak?.[a.ad];
    if (a.tip === 'mantik') d[a.ad] = v === undefined || v === null ? true : Boolean(v);
    else if (a.tip === 'json') d[a.ad] = typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v, null, 2);
    else d[a.ad] = v === undefined || v === null ? '' : String(v);
  }
  return d;
}

/** Sunucuya gidecek biçime çevirir: boş metin → undefined, sayı → number. */
function gonderilecek(alanlar: FormAlani[], d: Degerler): Degerler {
  const out: Degerler = {};
  for (const a of alanlar) {
    const v = d[a.ad];
    if (a.tip === 'mantik') out[a.ad] = Boolean(v);
    else if (a.tip === 'sayi') out[a.ad] = v === '' || v === null || v === undefined ? null : Number(v);
    else out[a.ad] = v === '' ? null : v;
  }
  return out;
}

/* ── Form alanları ─────────────────────────────────────────────────────── */
function AlanGirdisi({ alan, veri, deger, degistir, kilitli }: {
  alan: FormAlani; veri: KonsolVerisi; deger: unknown; degistir: (v: unknown) => void; kilitli: boolean;
}) {
  const ortak = { className: 'ab-gr', disabled: kilitli, 'aria-describedby': alan.aciklama ? `ac-${alan.ad}` : undefined };
  let kontrol: ReactNode;
  if (alan.tip === 'secim') {
    kontrol = (
      <select {...ortak} value={String(deger ?? '')} onChange={(e) => degistir(e.target.value)}>
        <option value="">{alan.zorunlu ? 'Seçin' : '— boş —'}</option>
        {secenekListesi(alan, veri).map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
      </select>
    );
  } else if (alan.tip === 'mantik') {
    kontrol = (
      <select {...ortak} value={deger ? 'true' : 'false'} onChange={(e) => degistir(e.target.value === 'true')}>
        <option value="true">açık</option>
        <option value="false">kapalı</option>
      </select>
    );
  } else if (alan.tip === 'json') {
    kontrol = <textarea {...ortak} rows={6} spellCheck={false} value={String(deger ?? '')} onChange={(e) => degistir(e.target.value)} />;
  } else if (alan.tip === 'sayi') {
    kontrol = <input {...ortak} type="number" inputMode="decimal" value={String(deger ?? '')} onChange={(e) => degistir(e.target.value)} />;
  } else {
    kontrol = <input {...ortak} type="text" value={String(deger ?? '')} onChange={(e) => degistir(e.target.value)} />;
  }
  return (
    <>
      <Alan etiket={`${alan.etiket}${kilitli ? ' · kimlik, değişmez' : ''}`} zorunlu={alan.zorunlu}>{kontrol}</Alan>
      {alan.aciklama && <p id={`ac-${alan.ad}`} className="ab-dip ab-konsol-alan-not">{alan.aciklama}</p>}
    </>
  );
}

function GerekceAlani({ deger, degistir, zorunlu }: { deger: string; degistir: (v: string) => void; zorunlu: boolean }) {
  return (
    <Alan etiket={`Gerekçe${zorunlu ? ` (en az ${GEREKCE_ASGARI} karakter)` : ''}`} zorunlu={zorunlu}>
      <textarea className="ab-gr" rows={3} value={deger} onChange={(e) => degistir(e.target.value)}
        placeholder="Neden değişiyor? Denetim izine bu metin yazılır." />
    </Alan>
  );
}

/* ── Fark tablosu ──────────────────────────────────────────────────────── */
export function FarkTablosu({ once, sonra, etiketler, bicim }: {
  once: Degerler | null; sonra: Degerler; etiketler?: Record<string, string>;
  bicim?: (alan: string, v: unknown) => string;
}) {
  const satirlar = fark(once, sonra);
  if (satirlar.length === 0) return <p className="ab-dip">Fark yok — kaydedilecek bir değişiklik bulunmuyor.</p>;
  const yaz = (alan: string, v: unknown) => (bicim ? bicim(alan, v) : degerYaz(v));
  return (
    <table className="ab-fark">
      <thead><tr><th scope="col">Alan</th><th scope="col">Önce</th><th scope="col">Sonra</th></tr></thead>
      <tbody>
        {satirlar.map((s) => (
          <tr key={s.alan}>
            <th scope="row">{etiketler?.[s.alan] ?? s.alan}</th>
            <td className="once">{yaz(s.alan, s.once)}</td>
            <td className="sonra">{yaz(s.alan, s.sonra)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Etki paneli ───────────────────────────────────────────────────────── */
function EtkiListesi({ etki }: { etki: EtkiSatiri[] }) {
  if (etki.length === 0) return <p className="ab-dip">Ölçülebilir bağlı kayıt bulunmadı.</p>;
  return (
    <ul className="ab-konsol-etki">
      {etki.map((e) => (
        <li key={e.baslik}>
          <span className="ad">{e.baslik}</span>
          <span className={`sayi mono${e.deger === null ? ' d-unk' : ''}`}>{e.deger === null ? 'bilinmiyor' : e.deger}</span>
          {e.not && <span className="not">{e.not}</span>}
        </li>
      ))}
    </ul>
  );
}

/** "Etkiyi hesapla" düğmesi + sonuç. Sonuç sunucudan gelir; tahmin yazılmaz. */
function EtkiPaneli({ hedefTipi, hedefId, sonra, basliklar }: {
  hedefTipi: string; hedefId?: string | null; sonra?: Degerler | null; basliklar?: string[];
}) {
  const [etki, setEtki] = useState<EtkiSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  async function hesapla() {
    setBekliyor(true); setHata(null);
    const s = await etkiHesapla({ hedefTipi, hedefId: hedefId ?? null, sonra: sonra ?? null });
    setBekliyor(false);
    if (s.ok) setEtki(s.etki); else setHata(s.hata);
  }
  return (
    <div className="ab-konsol-etki-sar">
      {basliklar && basliklar.length > 0 && (
        <p className="ab-dip">Bu değişiklik şuraları etkiler: {basliklar.join(' · ')}.</p>
      )}
      <Dugme tur="satir" onClick={hesapla} disabled={bekliyor}>{bekliyor ? 'Hesaplanıyor…' : etki ? 'Yeniden hesapla' : 'Etkiyi hesapla'}</Dugme>
      {etki && <EtkiListesi etki={etki} />}
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
    </div>
  );
}

/* ── Geçmiş listesi ────────────────────────────────────────────────────── */
function GecmisListesi({ gecmis }: { gecmis: IzKaydi[] }) {
  const [acik, setAcik] = useState<string | null>(null);
  if (gecmis.length === 0) return <p className="ab-dip">Bu kayıt için iz bulunmuyor (son 300 kayıt tarandı).</p>;
  return (
    <ol className="ab-konsol-iz">
      {gecmis.map((g) => (
        <li key={g.id}>
          <button type="button" className="satir" aria-expanded={acik === g.id}
            onClick={() => setAcik(acik === g.id ? null : g.id)}>
            <span className="mono zaman">{zamanTR(g.zaman)}</span>
            <span className="eylem">{EYLEM_ETIKET[g.eylem] ?? g.eylem}</span>
            <span className="aktor">{g.aktor ?? 'sistem'}</span>
          </button>
          {g.gerekce && <p className="gerekce">{g.gerekce}</p>}
          {acik === g.id && (
            <div className="ayrinti">
              <pre className="ab-konsol-json">{jsonOku(g.once)}</pre>
              <pre className="ab-konsol-json">{jsonOku(g.sonra)}</pre>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function jsonOku(s: string | null): string {
  if (s === null) return '—';
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}

/* ── Sekmeler ──────────────────────────────────────────────────────────── */
function Sekmeler<T extends string>({ secili, sec, secenekler }: {
  secili: T; sec: (t: T) => void; secenekler: { id: T; ad: string }[];
}) {
  return (
    <div className="ab-ikili ab-konsol-sekme" role="group" aria-label="Çekmece bölümleri">
      {secenekler.map((s) => (
        <button key={s.id} type="button" aria-pressed={secili === s.id} onClick={() => sec(s.id)}>{s.ad}</button>
      ))}
    </div>
  );
}

function AcikTalepUyarisi({ talepler }: { talepler: Talep[] }) {
  if (talepler.length === 0) return null;
  return (
    <p className="ab-dip ab-konsol-uyari" role="status">
      Bu hedef için {talepler.length} açık değişiklik talebi var ({talepler.map((t) => TALEP_DURUM_ETIKET[t.durum]).join(', ')}).
      Yeni bir öneri açılamaz; önce Onay kuyruğundan sonuçlandırın.
    </p>
  );
}

/* ═══ 1 · Yeni kayıt ═══════════════════════════════════════════════════ */
export function YeniKayitCekmecesi({ modul, veri, kapat, tazele }: {
  modul: Modul; veri: KonsolVerisi; kapat: () => void; tazele: () => void;
}) {
  const alanlar = useMemo(() => modul.alanlar ?? [], [modul.alanlar]);
  const onayli = modul.sinif === 'B';
  const [d, setD] = useState<Degerler>(() => baslangicDegerleri(alanlar));
  const [gerekce, setGerekce] = useState('');
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const sonra = useMemo(() => gonderilecek(alanlar, d), [alanlar, d]);

  const gonder = () => {
    if (onayli && gerekce.trim().length < GEREKCE_ASGARI) { setHata(`Gerekçe en az ${GEREKCE_ASGARI} karakter olmalı.`); return; }
    if (!modul.hedefTipi) return;
    const hedefTipi = modul.hedefTipi;
    calistir(
      () => onayli
        ? degisiklikOner({ hedefTipi, sonra, gerekce })
        : katalogKaydet({ tip: hedefTipi, degerler: sonra, gerekce: gerekce || undefined }),
      () => { kapat(); tazele(); },
    );
  };

  if (!veri.izin.yazma) {
    return (
      <Cekmece kod="yeni" kapat={kapat}>
        <CekmeceKimlik durum="pl" soz="yetki yok" baslik={`Yeni ${modul.ad.toLowerCase()}`} />
        <CekmeceEylemler dipNot="Yönetim yazma yetkisi gerekir. Yetkiler ekranındaki atama sunucuda doğrulanır." />
      </Cekmece>
    );
  }

  return (
    <Cekmece kod="yeni" kapat={kapat}>
      <CekmeceKimlik durum={onayli ? 'md' : 'ok'} soz={onayli ? 'B · onaylı' : 'A · doğrudan'}
        baslik={`Yeni ${modul.ad.toLowerCase()}`} cumle={modul.aciklama} />
      <form className="ab-konsol-form" onSubmit={(e) => { e.preventDefault(); gonder(); }}>
        {alanlar.map((a) => (
          <AlanGirdisi key={a.ad} alan={a} veri={veri} deger={d[a.ad]} kilitli={false}
            degistir={(v) => setD((p) => ({ ...p, [a.ad]: v }))} />
        ))}
        <GerekceAlani deger={gerekce} degistir={setGerekce} zorunlu={onayli} />
        {onayli && modul.hedefTipi && (
          <>
            <p className="etiket ab-panel-blokbas">Etki ön izlemesi</p>
            <EtkiPaneli hedefTipi={modul.hedefTipi} sonra={sonra} basliklar={modul.etki} />
          </>
        )}
        {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
        <CekmeceEylemler
          birincil={<Dugme tur="birincil" type="submit" disabled={bekliyor}>{bekliyor ? 'Gönderiliyor…' : onayli ? 'İncelemeye gönder' : 'Kaydet'}</Dugme>}
          ikincil={<Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>}
          dipNot={onayli
            ? 'B sınıfı: kayıt doğrudan yazılmaz. Talep, sizden başka bir onay yetkilisi onaylayıp uyguladığında geçerli olur.'
            : 'A sınıfı: doğrudan yazılır; kim/ne zaman/gerekçe denetim izine geçer.'} />
      </form>
    </Cekmece>
  );
}

/* ═══ 2 · Kayıt: ayrıntı · düzenle · etki · geçmiş · arşiv ═══════════════ */
type KayitSekmesi = 'ayrinti' | 'duzenle' | 'etki' | 'gecmis';

export function KayitCekmecesi({ modul, kayit, veri, kapat, tazele, gecmis, acikTalepler }: {
  modul: Modul; kayit: KonsolKayit; veri: KonsolVerisi; kapat: () => void; tazele: () => void;
  gecmis: IzKaydi[]; acikTalepler: Talep[];
}) {
  const alanlar = useMemo(() => modul.alanlar ?? [], [modul.alanlar]);
  const onayli = modul.sinif === 'B';
  const gorsel = modul.hedefTipi === 'tesisGorsel';
  const arsivlenebilir = veri.izin.yazma && !gorsel && !onayli && !kayit.pasif;
  const [sekme, setSekme] = useState<KayitSekmesi>('ayrinti');
  const [d, setD] = useState<Degerler>(() => baslangicDegerleri(alanlar, kayit.degerler));
  const [gerekce, setGerekce] = useState('');
  const [arsivAcik, setArsivAcik] = useState(false);
  const { bekliyor, hata, setHata, calistir } = useEylem();

  const sonra = useMemo(() => gonderilecek(alanlar, d), [alanlar, d]);
  const once = useMemo(() => gonderilecek(alanlar, baslangicDegerleri(alanlar, kayit.degerler)), [alanlar, kayit.degerler]);
  const etiketler = Object.fromEntries(alanlar.map((a) => [a.ad, a.etiket]));
  const bicim = (alan: string, v: unknown) => {
    const a = alanlar.find((x) => x.ad === alan);
    return a ? alanDegeri(a, veri, v) : degerYaz(v);
  };
  const farkVar = fark(once, sonra).length > 0;

  const kaydet = () => {
    if (!modul.hedefTipi) return;
    const hedefTipi = modul.hedefTipi;
    if ((onayli || gorsel) && gerekce.trim().length < GEREKCE_ASGARI) { setHata(`Gerekçe en az ${GEREKCE_ASGARI} karakter olmalı.`); return; }
    calistir(
      () => gorsel
        ? tesisGorselAta({ tesisId: kayit.id, gorselAnahtari: (sonra.gorselAnahtari as string | null) ?? null, gerekce })
        : onayli
          ? degisiklikOner({ hedefTipi, hedefId: kayit.id, sonra, gerekce })
          : katalogKaydet({ tip: hedefTipi, id: kayit.id, degerler: sonra, gerekce: gerekce || undefined }),
      () => { setSekme('ayrinti'); setGerekce(''); tazele(); },
    );
  };

  const arsivle = () => {
    if (!modul.hedefTipi) return;
    if (gerekce.trim().length < GEREKCE_ASGARI) { setHata(`Gerekçe en az ${GEREKCE_ASGARI} karakter olmalı.`); return; }
    const tip = modul.hedefTipi;
    calistir(() => katalogArsivle({ tip, id: kayit.id, gerekce }), () => { kapat(); tazele(); });
  };

  const sekmeler: { id: KayitSekmesi; ad: string }[] = [
    { id: 'ayrinti', ad: 'Ayrıntı' },
    ...(veri.izin.yazma ? [{ id: 'duzenle' as const, ad: 'Düzenle' }] : []),
    { id: 'etki', ad: 'Etki' },
    { id: 'gecmis', ad: `Geçmiş · ${gecmis.length}` },
  ];

  return (
    <Cekmece kod={kayit.kod} kapat={kapat}>
      <CekmeceKimlik durum={kayit.durum} soz={kayit.pasif ? 'pasif' : onayli ? 'B · onaylı' : 'A · doğrudan'}
        baslik={kayit.ad} cumle={kayit.alt} />
      <Sekmeler secili={sekme} sec={setSekme} secenekler={sekmeler} />

      {sekme === 'ayrinti' && (
        <>
          <CekmeceAlanlar alanlar={[
            ...alanlar.map((a) => ({ etiket: a.etiket, deger: alanDegeri(a, veri, kayit.degerler[a.ad]) })),
            { etiket: 'Bağlı kayıt', deger: kayit.bagli === null ? 'bilinmiyor' : String(kayit.bagli),
              durum: kayit.bagli === null ? ('unk' as const) : undefined },
            { etiket: 'Açık talep', deger: String(acikTalepler.length), durum: acikTalepler.length ? ('md' as const) : undefined },
          ]} />
          <AcikTalepUyarisi talepler={acikTalepler} />
          <CekmeceEylemler
            birincil={veri.izin.yazma ? <Dugme tur="birincil" onClick={() => setSekme('duzenle')}>Düzenle</Dugme> : undefined}
            ikincil={arsivlenebilir ? <Dugme tur="ret" onClick={() => { setSekme('duzenle'); setArsivAcik(true); }}>Arşivle / pasife al</Dugme> : undefined}
            dipNot={!veri.izin.yazma ? 'Yönetim yazma yetkiniz yok; kayıt yalnız okunur.' : undefined} />
        </>
      )}

      {sekme === 'duzenle' && veri.izin.yazma && (
        <form className="ab-konsol-form" onSubmit={(e) => { e.preventDefault(); if (arsivAcik) arsivle(); else kaydet(); }}>
          {!arsivAcik && alanlar.map((a) => (
            <AlanGirdisi key={a.ad} alan={a} veri={veri} deger={d[a.ad]} kilitli={Boolean(a.kimlik)}
              degistir={(v) => setD((p) => ({ ...p, [a.ad]: v }))} />
          ))}
          {!arsivAcik && (
            <>
              <p className="etiket ab-panel-blokbas">Fark ön izlemesi</p>
              <FarkTablosu once={once} sonra={sonra} etiketler={etiketler} bicim={bicim} />
            </>
          )}
          {arsivAcik && (
            <p className="ab-dip ab-konsol-uyari" role="status">
              Yıkıcı işlem: <strong>{kayit.ad}</strong>{' '}
              {modul.hedefTipi === 'uretimUnitesi' ? 'devre dışına alınır' : modul.hedefTipi === 'varlikTuru' ? 'pasife alınır' : 'silinir'}.
              Bağlı kayıt varsa sunucu işlemi reddeder ({kayit.bagli === null ? 'bağlı sayısı bilinmiyor' : `${kayit.bagli} bağlı kayıt`}).
            </p>
          )}
          <GerekceAlani deger={gerekce} degistir={setGerekce} zorunlu={onayli || gorsel || arsivAcik} />
          {onayli && <AcikTalepUyarisi talepler={acikTalepler} />}
          {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
          <CekmeceEylemler
            birincil={arsivAcik
              ? <Dugme tur="ret" type="submit" disabled={bekliyor}>{bekliyor ? 'Uygulanıyor…' : 'Evet, arşivle'}</Dugme>
              : <Dugme tur="birincil" type="submit" disabled={bekliyor || !farkVar || (onayli && acikTalepler.length > 0)}>
                  {bekliyor ? 'Gönderiliyor…' : onayli ? 'İncelemeye gönder' : 'Kaydet'}
                </Dugme>}
            ikincil={<Dugme onClick={() => { setArsivAcik(false); setSekme('ayrinti'); setHata(null); }} disabled={bekliyor}>Vazgeç</Dugme>}
            dipNot={arsivAcik
              ? 'Gerekçe zorunludur ve denetim izine yazılır. İşlem geri alınamaz; kayıt gerekirse yeniden oluşturulur.'
              : onayli
                ? 'B sınıfı: değişiklik talebe dönüşür; başka bir onaycı onaylar, ardından uygulanır ve kapsam yeniden hesaplanır.'
                : 'A sınıfı: doğrudan yazılır; önce/sonra değerleri denetim izine geçer.'} />
        </form>
      )}

      {sekme === 'etki' && modul.hedefTipi && (
        <>
          <p className="etiket ab-panel-blokbas">Bu kayda bağlı olanlar</p>
          <EtkiPaneli hedefTipi={modul.hedefTipi} hedefId={kayit.id} sonra={farkVar ? sonra : null} basliklar={modul.etki} />
          <CekmeceEylemler dipNot="Sayılar sunucudan ölçülür; ölçülemeyen bağ «bilinmiyor» yazılır, sıfır sayılmaz." />
        </>
      )}

      {sekme === 'gecmis' && (
        <>
          <p className="etiket ab-panel-blokbas">Denetim izi</p>
          <GecmisListesi gecmis={gecmis} />
          <CekmeceEylemler dipNot="İz kayıtları değiştirilemez ve silinemez." />
        </>
      )}
    </Cekmece>
  );
}

/* ═══ 3 · Ayar: değer · düzenle · geçmiş ══════════════════════════════════ */
type AyarSekmesi = 'deger' | 'duzenle' | 'gecmis';

const KAYNAK_SOZU: Record<KonsolAyar['kaynak'], string> = {
  varsayilan: 'kod varsayılanı', yapilandirma: 'yapılandırma kaydı', gecersiz_kayit: 'geçersiz kayıt → varsayılan kullanılıyor',
};

export function AyarCekmecesi({ tanim, okuma, veri, kapat, tazele, gecmis, acikTalepler }: {
  tanim: AyarTanimi; okuma: KonsolAyar | null; veri: KonsolVerisi; kapat: () => void; tazele: () => void;
  gecmis: IzKaydi[]; acikTalepler: Talep[];
}) {
  const onayli = tanim.sinif === 'B';
  const bugun = okuma ? okuma.deger : tanim.varsayilan;
  const tip = typeof tanim.varsayilan;
  const [sekme, setSekme] = useState<AyarSekmesi>('deger');
  const [metin, setMetin] = useState<string>(() => tip === 'boolean' ? String(Boolean(bugun)) : degerYazHam(bugun));
  const [gerekce, setGerekce] = useState('');
  const { bekliyor, hata, setHata, calistir } = useEylem();

  const yeni: unknown = tip === 'number' ? (metin.trim() === '' ? NaN : Number(metin)) : tip === 'boolean' ? metin === 'true' : metin;
  const farkVar = JSON.stringify(yeni) !== JSON.stringify(bugun);
  const gecerli = tip !== 'number' || Number.isFinite(yeni as number);

  const kaydet = () => {
    if (!gecerli) { setHata('Sayısal bir değer girin.'); return; }
    if (gerekce.trim().length < GEREKCE_ASGARI) { setHata(`Gerekçe en az ${GEREKCE_ASGARI} karakter olmalı.`); return; }
    calistir(
      () => onayli
        ? degisiklikOner({ hedefTipi: 'ayar', hedefId: tanim.anahtar, sonra: { anahtar: tanim.anahtar, deger: yeni }, gerekce })
        : ayarKaydet({ anahtar: tanim.anahtar, deger: yeni, gerekce }),
      () => { setSekme('deger'); setGerekce(''); tazele(); },
    );
  };

  const sekmeler: { id: AyarSekmesi; ad: string }[] = [
    { id: 'deger', ad: 'Değer' },
    ...(veri.izin.yazma ? [{ id: 'duzenle' as const, ad: 'Düzenle' }] : []),
    { id: 'gecmis', ad: `Geçmiş · ${gecmis.length}` },
  ];
  const kaynak = okuma?.kaynak ?? 'varsayilan';

  return (
    <Cekmece kod={tanim.anahtar} kapat={kapat}>
      <CekmeceKimlik durum={kaynak === 'gecersiz_kayit' ? 'bd' : okuma?.kaynak === 'yapilandirma' ? 'ok' : 'pl'}
        soz={onayli ? 'B · onaylı' : 'A · doğrudan'} baslik={tanim.etiket} cumle={tanim.aciklama} />
      <Sekmeler secili={sekme} sec={setSekme} secenekler={sekmeler} />

      {sekme === 'deger' && (
        <>
          <CekmeceAlanlar alanlar={[
            { etiket: 'Bugünkü değer', deger: <span className="mono">{degerMetni(tanim, bugun)}</span> },
            { etiket: 'Kaynak', deger: KAYNAK_SOZU[kaynak], durum: kaynak === 'gecersiz_kayit' ? ('bd' as const) : undefined },
            { etiket: 'Kod varsayılanı', deger: <span className="mono">{degerMetni(tanim, tanim.varsayilan)}</span> },
            { etiket: 'Son güncelleme', deger: okuma?.guncellendi ? <span className="mono">{zamanTR(okuma.guncellendi)}</span> : '—' },
            { etiket: 'Güncelleyen', deger: okuma?.guncelleyen ?? '—' },
            { etiket: 'Açık talep', deger: String(acikTalepler.length), durum: acikTalepler.length ? ('md' as const) : undefined },
          ]} />
          <p className="etiket ab-panel-blokbas">Değişiklik nereyi etkiler</p>
          <p className="ab-dip">{tanim.etki.length ? tanim.etki.join(' · ') : 'Kayıtlı etki bilgisi yok.'}</p>
          {tanim.anahtar === 'saha.yerlesim' && <YerlesimTablosu yerlesim={yerlesimNormalle(bugun)} />}
          {tanim.anahtar === 'saha.olculmemis' && (
            <p className="ab-dip">{olculmemisMetni(olculmemisNormalle(bugun))}</p>
          )}
          <AcikTalepUyarisi talepler={acikTalepler} />
          <CekmeceEylemler
            birincil={veri.izin.yazma ? <Dugme tur="birincil" onClick={() => setSekme('duzenle')}>Düzenle</Dugme> : undefined}
            dipNot={kaynak === 'gecersiz_kayit'
              ? 'Veritabanındaki kayıt şemaya uymuyor; motorlar kod varsayılanıyla çalışıyor. Yeni bir değer kaydedin.'
              : 'Ayarın yokluğu sıfır değil varsayılandır; kaynak sütunu bunu ayırır.'} />
        </>
      )}

      {sekme === 'duzenle' && veri.izin.yazma && tanim.anahtar === 'saha.yerlesim' && (
        <YerlesimDuzenleyici tanim={tanim} bugun={yerlesimNormalle(bugun)} vazgec={() => { setSekme('deger'); setHata(null); }}
          bitti={() => { setSekme('deger'); tazele(); }} />
      )}

      {sekme === 'duzenle' && veri.izin.yazma && tanim.anahtar === 'saha.olculmemis' && (
        <OlculmemisDuzenleyici tanim={tanim} bugun={olculmemisNormalle(bugun)}
          vazgec={() => { setSekme('deger'); setHata(null); }}
          bitti={() => { setSekme('deger'); tazele(); }} />
      )}

      {sekme === 'duzenle' && veri.izin.yazma
        && tanim.anahtar !== 'saha.yerlesim' && tanim.anahtar !== 'saha.olculmemis' && (
        <form className="ab-konsol-form" onSubmit={(e) => { e.preventDefault(); kaydet(); }}>
          <Alan etiket={`Yeni değer${tanim.birim ? ` (${tanim.birim})` : ''}`} zorunlu>
            {tip === 'boolean' ? (
              <select className="ab-gr" value={metin} onChange={(e) => setMetin(e.target.value)}>
                <option value="true">açık</option>
                <option value="false">kapalı</option>
              </select>
            ) : tip === 'number' ? (
              <input className="ab-gr" type="number" inputMode="decimal" step="any" value={metin} onChange={(e) => setMetin(e.target.value)} />
            ) : (
              <input className="ab-gr" type="text" value={metin} onChange={(e) => setMetin(e.target.value)} />
            )}
          </Alan>
          <p className="etiket ab-panel-blokbas">Fark ön izlemesi</p>
          <FarkTablosu once={{ deger: bugun }} sonra={{ deger: gecerli ? yeni : '' }} etiketler={{ deger: tanim.etiket }}
            bicim={(_a, v) => (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') && v !== '' ? degerMetni(tanim, v) : '—'} />
          <p className="etiket ab-panel-blokbas">Etki</p>
          <p className="ab-dip">{tanim.etki.length ? tanim.etki.join(' · ') : 'Kayıtlı etki bilgisi yok.'}</p>
          {onayli && <EtkiPaneli hedefTipi="ayar" hedefId={tanim.anahtar} sonra={{ anahtar: tanim.anahtar, deger: yeni }} />}
          <GerekceAlani deger={gerekce} degistir={setGerekce} zorunlu />
          {onayli && <AcikTalepUyarisi talepler={acikTalepler} />}
          {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
          <CekmeceEylemler
            birincil={<Dugme tur="birincil" type="submit" disabled={bekliyor || !farkVar || !gecerli || (onayli && acikTalepler.length > 0)}>
              {bekliyor ? 'Gönderiliyor…' : onayli ? 'İncelemeye gönder' : 'Kaydet'}
            </Dugme>}
            ikincil={<Dugme onClick={() => { setSekme('deger'); setHata(null); }} disabled={bekliyor}>Vazgeç</Dugme>}
            dipNot={onayli
              ? 'B sınıfı eşik: motor davranışını değiştirir; dört göz kuralı uygulanır (öneren onaylayamaz).'
              : 'A sınıfı: doğrudan yazılır; değer sınırları sunucuda şemayla doğrulanır.'} />
        </form>
      )}

      {sekme === 'gecmis' && (
        <>
          <p className="etiket ab-panel-blokbas">Denetim izi</p>
          <GecmisListesi gecmis={gecmis} />
          <CekmeceEylemler dipNot="İz kayıtları değiştirilemez ve silinemez." />
        </>
      )}
    </Cekmece>
  );
}

/* ═══ Saha yerleşimi düzenleyicisi (A · saha.yerlesim) ═══════════════════

   Serbest sürükle-bırak YOK. Kütük (`lib/yonetim/sahaModulleri.ts`) satır
   satır listelenir: görünür/gizli anahtarı yalnız `hideable` ve zorunlu
   olmayan modülde açılır; sıra düğmeleri yalnız KPI kalemlerinde ve izinli
   konum kümesi içinde çalışır. Kaydetmeden önce fark, etkilenen ekran ve
   tek ekran sözleşmesi hesaplanır; ihlal varsa Kaydet KAPALI kalır ve sunucu
   da aynı doğrulamayı yapar (istemcinin hesabı yetki değildir). */
const ALAN_ADI: Record<string, string> = { dikkat: 'Dikkat paneli', alan: 'Fotoğrafik alan', kpi: 'KPI şeridi', serit: 'Santral şeridi' };

function YerlesimTablosu({ yerlesim, taslak, degistir }: {
  yerlesim: SahaYerlesimi; taslak?: SahaYerlesimi; degistir?: (y: SahaYerlesimi) => void;
}) {
  const y = taslak ?? yerlesim;
  const sira = kpiSirasi(y);
  const duzenlenir = Boolean(degistir);
  const gorunurlukDegistir = (id: string, acik: boolean) => {
    if (!degistir) return;
    const gizli = acik ? y.gizli.filter((g) => g !== id) : [...y.gizli, id];
    const gorunen = SAHA_MODULLERI.filter((m) => m.alan === 'kpi' && !gizli.includes(m.id)).map((m) => m.id);
    const kpiSira = [...y.kpiSira.filter((k) => gorunen.includes(k)), ...gorunen.filter((k) => !y.kpiSira.includes(k))];
    degistir({ gizli, kpiSira });
  };
  const kaydir = (id: string, yon: -1 | 1) => {
    if (!degistir) return;
    const i = sira.indexOf(id); const j = i + yon;
    if (i < 0 || j < 0 || j >= sira.length) return;
    const yeni = [...sira]; [yeni[i], yeni[j]] = [yeni[j], yeni[i]];
    degistir({ gizli: y.gizli, kpiSira: yeni });
  };
  /* 400px çekmeceye 7 sütunlu tablo sığmaz; her modül tek satır blok:
     ad + alan/ekran · görünürlük denetimi · sıra denetimi · zorunlu/varsayılan. */
  return (
    <ul className="ab-yerlesim" aria-label="Saha modülleri">
      {SAHA_MODULLERI.map((m) => {
        const acik = gorunur(y, m.id);
        const konum = m.alan === 'kpi' && acik ? sira.indexOf(m.id) : -1;
        const kilitli = m.required || !m.hideable;
        return (
          <li key={m.id} className={acik ? undefined : 'gizli'}>
            <div className="bas">
              <span className="ad" title={m.aciklama}>{m.ad}</span>
              <span className="mono kunye">{ALAN_ADI[m.alan]} · {m.etkilenenEkran}</span>
            </div>
            <div className="denetim">
              {duzenlenir && !kilitli ? (
                <label className="ab-yerlesim-anahtar">
                  <input type="checkbox" checked={acik} onChange={(e) => gorunurlukDegistir(m.id, e.target.checked)}
                    aria-label={`${m.ad} görünür`} />
                  <span>{acik ? 'görünür' : 'gizli'}</span>
                </label>
              ) : (
                <span className={acik ? undefined : 'd-unk'}>{acik ? 'görünür' : 'gizli'}{kilitli ? ' · kilitli' : ''}</span>
              )}
              {konum >= 0 && (
                <span className="ab-yerlesim-sira">
                  <span className="mono">sıra {konum + 1}</span>
                  {duzenlenir && m.orderable && (
                    <>
                      <Dugme className="kucuk" aria-label={`${m.ad} yukarı`} disabled={konum === 0} onClick={() => kaydir(m.id, -1)}>↑</Dugme>
                      <Dugme className="kucuk" aria-label={`${m.ad} aşağı`} disabled={konum === sira.length - 1} onClick={() => kaydir(m.id, 1)}>↓</Dugme>
                    </>
                  )}
                  {m.allowedPositions && m.allowedPositions.length < 4 && (
                    <span className="not">izinli konum {m.allowedPositions.map((p) => p + 1).join('/')}</span>
                  )}
                </span>
              )}
              {konum < 0 && <span className="mono not">{m.orderable ? 'sıra —' : 'sıra sabit'}</span>}
            </div>
            <p className="mono meta">zorunlu {m.required ? 'evet' : 'hayır'} · varsayılan {m.defaultVisible ? 'görünür' : 'gizli'}</p>
          </li>
        );
      })}
    </ul>
  );
}

function YerlesimDuzenleyici({ tanim, bugun, vazgec, bitti }: {
  tanim: AyarTanimi; bugun: SahaYerlesimi; vazgec: () => void; bitti: () => void;
}) {
  const [taslak, setTaslak] = useState<SahaYerlesimi>(bugun);
  const [gerekce, setGerekce] = useState('');
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const dogrulama = useMemo(() => yerlesimDogrula(taslak), [taslak]);
  const sozlesme = useMemo(() => sozlesmeKontrol(taslak), [taslak]);
  const f = useMemo(() => yerlesimFarki(bugun, taslak), [bugun, taslak]);
  const farkVar = JSON.stringify({ gizli: [...bugun.gizli].sort(), sira: kpiSirasi(bugun) })
    !== JSON.stringify({ gizli: [...taslak.gizli].sort(), sira: kpiSirasi(taslak) });
  const ad = (id: string) => SAHA_MODUL_SOZLUGU[id]?.ad ?? id;

  const kaydet = () => {
    if (!dogrulama.ok) { setHata(dogrulama.hata); return; }
    if (sozlesme.ihlal) { setHata(`Tek ekran sözleşmesi ihlali — ${sozlesme.nedenler[0]}`); return; }
    if (gerekce.trim().length < GEREKCE_ASGARI) { setHata(`Gerekçe en az ${GEREKCE_ASGARI} karakter olmalı.`); return; }
    calistir(() => ayarKaydet({ anahtar: tanim.anahtar, deger: taslak, gerekce }), () => { setGerekce(''); bitti(); });
  };

  return (
    <form className="ab-konsol-form" onSubmit={(e) => { e.preventDefault(); kaydet(); }}>
      <p className="etiket ab-panel-blokbas">Modüller · görünürlük ve sıra</p>
      <YerlesimTablosu yerlesim={bugun} taslak={taslak} degistir={setTaslak} />
      <p className="ab-dip">Zorunlu ve kilitli modüller gizlenemez; bölgeler arası taşıma yok. KPI kalemleri yalnız izinli konumlara yerleşir.</p>

      <p className="etiket ab-panel-blokbas">Ön izleme · önce → sonra</p>
      <FarkTablosu once={{ yerlesim: yerlesimMetni(bugun) }} sonra={{ yerlesim: yerlesimMetni(taslak) }}
        etiketler={{ yerlesim: 'Saha yerleşimi' }} />

      <p className="etiket ab-panel-blokbas">Etki</p>
      <ul className="ab-konsol-etki">
        <li><span className="ad">Etkilenen ekran</span><span className="sayi mono">1</span><span className="not">Saha</span></li>
        <li><span className="ad">Gizlenen modül</span><span className="sayi mono">{f.gizlenen.length}</span>
          <span className="not">{f.gizlenen.length ? f.gizlenen.map(ad).join(' · ') : '—'}</span></li>
        <li><span className="ad">Yeniden gösterilen modül</span><span className="sayi mono">{f.gosterilen.length}</span>
          <span className="not">{f.gosterilen.length ? f.gosterilen.map(ad).join(' · ') : '—'}</span></li>
        <li><span className="ad">KPI sırası</span><span className="sayi mono">{f.kpiSayisi}</span>
          <span className="not">{f.siraDegisti ? 'değişir' : 'aynı'} · {kpiSirasi(taslak).map((id) => ad(id).replace('KPI · ', '')).join(' → ')}</span></li>
        <li>
          <span className="ad">Tek ekran sözleşmesi (1280×800)</span>
          <span className={`sayi mono${sozlesme.ihlal ? ' d-bd' : ''}`}>{sozlesme.ihlal ? 'İHLAL' : 'korunur'}</span>
          <span className="not">{sozlesme.ihlal ? sozlesme.nedenler.join(' ') : `fotoğrafik alana ${sozlesme.alanYukseklik}px kalır · scrollHeight === innerHeight`}</span>
        </li>
      </ul>
      {!dogrulama.ok && <p className="ab-gr-hata" role="alert">{dogrulama.hata}</p>}

      <GerekceAlani deger={gerekce} degistir={setGerekce} zorunlu />
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
      <CekmeceEylemler
        birincil={<Dugme tur="birincil" type="submit" disabled={bekliyor || !farkVar || !dogrulama.ok || sozlesme.ihlal}>
          {bekliyor ? 'Kaydediliyor...' : 'Kaydet'}
        </Dugme>}
        ikincil={<Dugme onClick={vazgec} disabled={bekliyor}>Vazgeç</Dugme>}
        dipNot={sozlesme.ihlal
          ? 'Sözleşmeyi bozan yerleşim KAYDEDİLMEZ; sunucu da aynı kuralı uygular.'
          : 'A sınıfı: doğrudan yazılır, iz düşer. Görünürlük sunum katmanıdır; yetki ya da veri erişimi değiştirmez.'} />
    </form>
  );
}

/* ── Değerlendirilmemiş özeti düzenleyicisi ───────────────────────────
   Nesne değerli ayarlar genel düzenleyiciden geçemez: `tip` orada
   `typeof varsayilan` ile bulunur ve nesne için ham METİN gönderilir,
   şema da haklı olarak reddeder. `saha.yerlesim` bu yüzden kendi
   düzenleyicisini taşıyor; bu ayar da taşımak zorunda — aksi hâlde
   "konsoldan yönetilebilir" yazıp yönetilemez bırakmış olurduk.

   "Tamamen gizle" seçeneği YOKTUR ve bu bir eksik değil, karardır:
   değerlendirilmemiş sayısı "bilinmeyen ≠ sıfır" kuralının ekrandaki
   karşılığıdır (bkz. lib/yonetim/olculmemisGosterimi.ts). */
function OlculmemisDuzenleyici({ tanim, bugun, vazgec, bitti }: {
  tanim: AyarTanimi; bugun: OlculmemisGosterimi; vazgec: () => void; bitti: () => void;
}) {
  const [taslak, setTaslak] = useState<OlculmemisGosterimi>(bugun);
  const [gerekce, setGerekce] = useState('');
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const dogrulama = useMemo(() => olculmemisDogrula(taslak), [taslak]);
  const farkVar = JSON.stringify(taslak) !== JSON.stringify(bugun);
  /* `sayi` kipinde ad yazılmaz; `ilkKac` alanı o zaman etkisizdir ve
     etkisiz bir alanı etkin göstermek yalan olurdu. */
  const adYazilir = taslak.gosterim === 'ozet';

  const kaydet = () => {
    if (!dogrulama.ok) { setHata(dogrulama.hata); return; }
    if (gerekce.trim().length < GEREKCE_ASGARI) { setHata(`Gerekçe en az ${GEREKCE_ASGARI} karakter olmalı.`); return; }
    calistir(() => ayarKaydet({ anahtar: tanim.anahtar, deger: taslak, gerekce }), () => { setGerekce(''); bitti(); });
  };

  return (
    <form className="ab-konsol-form" onSubmit={(e) => { e.preventDefault(); kaydet(); }}>
      <Alan etiket="Gösterim" zorunlu>
        <select className="ab-gr" value={taslak.gosterim}
          onChange={(e) => setTaslak({ ...taslak, gosterim: e.target.value as 'ozet' | 'sayi' })}>
          <option value="ozet">Özet — sayı, oran, MWe ve ilk santral adları</option>
          <option value="sayi">Yalnız sayı — sayı, oran ve MWe</option>
        </select>
      </Alan>
      <Alan etiket={`İlk görünümde yazılan santral adı (0–${OLCULMEMIS_ILK_KAC_TAVAN})`}>
        <input className="ab-gr" type="number" min={0} max={OLCULMEMIS_ILK_KAC_TAVAN} step={1}
          disabled={!adYazilir} value={taslak.ilkKac}
          onChange={(e) => setTaslak({ ...taslak, ilkKac: Number(e.target.value) })} />
      </Alan>
      <Alan etiket="Detay listesi" zorunlu>
        <select className="ab-gr" value={taslak.detay}
          onChange={(e) => setTaslak({ ...taslak, detay: e.target.value as 'panel' | 'kapali' })}>
          <option value="panel">Doklu panelde açılabilir</option>
          <option value="kapali">Açılamaz — yalnız özet</option>
        </select>
      </Alan>
      <p className="ab-dip">
        &quot;+N diğer&quot; eşiği AYRI bir ayar değildir: N, toplam eksi yazılan
        addır. İkinci bir eşik kaydı aynı sayının ikinci kaynağı olur ve ikisi
        çeliştiğinde ekran hangisine uyacağını bilemezdi.
      </p>

      <p className="etiket ab-panel-blokbas">Ön izleme · önce → sonra</p>
      <FarkTablosu once={{ g: olculmemisMetni(bugun) }} sonra={{ g: olculmemisMetni(taslak) }}
        etiketler={{ g: 'Değerlendirilmemiş özeti' }} />

      <p className="etiket ab-panel-blokbas">Etki</p>
      <ul className="ab-konsol-etki">
        <li><span className="ad">Etkilenen ekran</span><span className="sayi mono">1</span><span className="not">Saha</span></li>
        <li><span className="ad">Sayı ve oran</span><span className="sayi mono">her zaman</span>
          <span className="not">Kapatılamaz — &quot;bilinmeyen ≠ sıfır&quot; kuralı ayara bağlanmaz.</span></li>
        <li><span className="ad">Yazılan ad</span><span className="sayi mono">{adYazilir ? taslak.ilkKac : 0}</span>
          <span className="not">{adYazilir ? 'güce göre sıralı ilk santraller' : 'yalnız sayı kipinde ad yazılmaz'}</span></li>
        <li><span className="ad">Tek ekran sözleşmesi</span><span className="sayi mono">korunur</span>
          <span className="not">Özet başlık bloğundadır, detay `position: fixed` paneldedir; ızgara itilmez.</span></li>
      </ul>
      {!dogrulama.ok && <p className="ab-gr-hata" role="alert">{dogrulama.hata}</p>}

      <GerekceAlani deger={gerekce} degistir={setGerekce} zorunlu />
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
      <CekmeceEylemler
        birincil={<Dugme tur="birincil" type="submit" disabled={bekliyor || !farkVar || !dogrulama.ok}>
          {bekliyor ? 'Kaydediliyor...' : 'Kaydet'}
        </Dugme>}
        ikincil={<Dugme onClick={vazgec} disabled={bekliyor}>Vazgeç</Dugme>}
        dipNot="A sınıfı: doğrudan yazılır, iz düşer. Sunum katmanıdır; yetki ya da veri erişimi değiştirmez." />
    </form>
  );
}

function degerYazHam(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/* ═══ 4 · Değişiklik talebi: incele · onayla · reddet · uygula ═══════════ */
export function TalepCekmecesi({ talep, veri, kapat, tazele, gecmis }: {
  talep: Talep; veri: KonsolVerisi; kapat: () => void; tazele: () => void; gecmis: IzKaydi[];
}) {
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const [redAcik, setRedAcik] = useState(false);
  const [uygulaAcik, setUygulaAcik] = useState(false);
  const [neden, setNeden] = useState('');
  const benim = talep.talepEden.id === veri.aktifId;
  const incelemede = talep.durum === 'incelemede';
  const onaylanabilir = incelemede && veri.izin.onay && !benim;
  const uygulanabilir = talep.durum === 'onaylandi' && veri.izin.yazma;

  const reddet = () => {
    if (neden.trim().length < GEREKCE_ASGARI) { setHata(`Red nedeni en az ${GEREKCE_ASGARI} karakter olmalı.`); return; }
    calistir(() => degisiklikReddet({ id: talep.id, neden }), () => { setRedAcik(false); tazele(); });
  };

  const birincil = onaylanabilir
    ? <Dugme tur="birincil" disabled={bekliyor} onClick={() => calistir(() => degisiklikOnayla({ id: talep.id }), tazele)}>Onayla</Dugme>
    : uygulanabilir
      ? (uygulaAcik
        ? <Dugme tur="birincil" disabled={bekliyor} onClick={() => calistir(() => degisiklikUygula({ id: talep.id }), () => { setUygulaAcik(false); tazele(); })}>
            {bekliyor ? 'Uygulanıyor…' : 'Evet, şimdi uygula'}
          </Dugme>
        : <Dugme tur="birincil" onClick={() => setUygulaAcik(true)}>Uygula</Dugme>)
      : undefined;

  const ikincil = incelemede && (veri.izin.onay && !benim)
    ? <Dugme tur="ret" disabled={bekliyor} onClick={() => setRedAcik(true)}>Reddet</Dugme>
    : incelemede && benim
      ? <Dugme tur="ret" disabled={bekliyor} onClick={() => calistir(() => degisiklikIptal({ id: talep.id }), tazele)}>Talebi geri çek</Dugme>
      : uygulaAcik
        ? <Dugme onClick={() => setUygulaAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
        : undefined;

  const dipNot = incelemede && benim
    ? 'Dört göz: kendi talebinizi onaylayamazsınız; başka bir onay yetkilisi karar verir.'
    : incelemede && !veri.izin.onay
      ? 'Bu talebi onaylamak için yönetim onay yetkisi gerekir.'
      : talep.durum === 'onaylandi'
        ? 'Onaylandı ama henüz uygulanmadı. Uygula, değeri yazar ve kural ise kapsamı yeniden hesaplar.'
        : talep.durum === 'uygulandi'
          ? 'Uygulandı; iz kaydı değişiklik geçmişinde.'
          : undefined;

  return (
    <Cekmece kod={talep.id.slice(-8)} kapat={kapat}>
      <CekmeceKimlik durum={TALEP_DURUM_IMI[talep.durum]} soz={TALEP_DURUM_ETIKET[talep.durum]}
        baslik={talep.hedefEtiket} cumle={talep.gerekce} />
      <CekmeceAlanlar alanlar={[
        { etiket: 'Hedef tipi', deger: <span className="mono">{talep.hedefTipi}{talep.hedefId ? ` · ${talep.hedefId}` : ' · yeni kayıt'}</span> },
        { etiket: 'Talep eden', deger: `${talep.talepEden.ad}${benim ? ' (siz)' : ''}` },
        { etiket: 'Açılış', deger: <span className="mono">{zamanTR(talep.olusturuldu)}</span> },
        { etiket: 'Onaylayan', deger: talep.onaylayan ? `${talep.onaylayan} · ${talep.onaylandi ? zamanTR(talep.onaylandi) : ''}` : '—' },
        { etiket: 'Uygulayan', deger: talep.uygulayan ? `${talep.uygulayan} · ${talep.uygulandi ? zamanTR(talep.uygulandi) : ''}` : '—' },
        ...(talep.redNedeni ? [{ etiket: 'Red nedeni', deger: talep.redNedeni, durum: 'bd' as const }] : []),
      ]} />

      <p className="etiket ab-panel-blokbas">Fark (önce → sonra)</p>
      <FarkTablosu once={talep.once} sonra={talep.sonra} />

      <p className="etiket ab-panel-blokbas">Etki (talep anında donduruldu)</p>
      {talep.etki ? <EtkiListesi etki={talep.etki} /> : <p className="ab-dip">Etki ölçümü kaydedilmemiş.</p>}

      {redAcik && (
        <form className="ab-konsol-form" onSubmit={(e) => { e.preventDefault(); reddet(); }}>
          <p className="etiket ab-panel-blokbas">Red</p>
          <Alan etiket={`Red nedeni (en az ${GEREKCE_ASGARI} karakter)`} zorunlu>
            <textarea className="ab-gr" rows={3} value={neden} onChange={(e) => setNeden(e.target.value)} />
          </Alan>
          <div className="ab-konsol-ikili-dugme">
            <Dugme tur="ret" type="submit" disabled={bekliyor}>Reddi kaydet</Dugme>
            <Dugme onClick={() => { setRedAcik(false); setHata(null); }} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
        </form>
      )}

      {uygulaAcik && (
        <p className="ab-dip ab-konsol-uyari" role="status">
          Uygulama geri alınamaz: değer yazılır, iz oluşur{talep.hedefTipi === 'uygulanabilirlikKurali' ? ' ve tüm santrallerin kapsam kararı yeniden hesaplanır' : ''}.
        </p>
      )}

      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
      <CekmeceEylemler birincil={birincil} ikincil={ikincil} dipNot={dipNot} />

      <p className="etiket ab-panel-blokbas">Talep izi</p>
      <GecmisListesi gecmis={gecmis} />
    </Cekmece>
  );
}
