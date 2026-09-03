'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import { Alan, BosIlk, BosFiltre, Dugme, Im } from '@/components/kabuk/temel';
import { Tablo, type Kolon } from '@/components/kabuk/tablo';
import { EkranBasligi, Filtreler } from '@/components/kabuk/ekran';
import { Cekmece, CekmeceAlanlar, CekmeceKimlik } from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import {
  adimVarligiAta, adimVarligiKaldir, isSureciKaydet, prosesAdimiKaydet,
} from '@/lib/eylemler2/varlikYonetisim';
import { ETKI_DUZEYLERI, ETKI_ETIKETI, etkiDuzeyi } from '@/lib/varlik/etki';
import {
  bagImi, bagSozu, saat, sayaclar, surecImi, surecSozu,
  type AdimSatiri, type BagSatiri, type SurecSatiri,
} from './mantik';

/* ═══ OT-05 · Proses zinciri ═══════════════════════════════════════════

   "Cihaz üretimde nerede duruyor?" — iş süreci → sıralı adım → varlık.

   ── ÜÇ SAYAÇ, ÜÇ AYRI İŞ ──────────────────────────────────────────────
   TEK NOKTA kanıtlanmış bir risktir ve yedeklilik işidir.
   DEĞERLENDİRİLMEDİ bir ölçüm borcudur ve masa başı işidir.
   VARLIKSIZ ADIM zincirin kopuk halkasıdır ve envanter işidir.
   Üçünü tek bir "sorunlu" sayacına toplamak, çözümü birbirinden tamamen
   farklı üç durumu aynı kutuya koyardı.

   Ekran hiçbir değerlendirmeyi TÜRETMEZ: tek nokta da, yedeklilik de,
   RTO/RPO da insan kararıdır. Boş bırakılan alan `null` kalır. */

const ROL_ETIKET: Record<string, string> = {
  kontrol: 'kontrol', olcum: 'ölçüm', iletisim: 'iletişim',
  kayit: 'kayıt', emniyet: 'emniyet', diger: 'diğer',
};
const ROLLER = Object.keys(ROL_ETIKET);

const KOLONLAR: Kolon[] = [
  { baslik: 'Santral', genislik: '168px' },
  { baslik: 'Adım', genislik: '68px', sag: true },
  { baslik: 'Bağ', genislik: '62px', sag: true },
  { baslik: 'Tek nokta', genislik: '96px', sag: true },
  { baslik: 'Değerlendirilmedi', genislik: '138px', sag: true, ikincil: true },
];

const MERCEKLER = [
  { id: 'hepsi', ad: 'Tümü' },
  { id: 'tekNokta', ad: 'Tek nokta var' },
  { id: 'borc', ad: 'Değerlendirilmemiş' },
  { id: 'adimsiz', ad: 'Adımı yok' },
  { id: 'bosAdim', ad: 'Varlıksız adımı olan' },
];

function mercekten(s: SurecSatiri, m: string): boolean {
  const c = sayaclar(s);
  if (m === 'tekNokta') return c.tekNokta > 0;
  if (m === 'borc') return c.degerlendirilmedi > 0;
  if (m === 'adimsiz') return c.adim === 0;
  if (m === 'bosAdim') return c.bosAdim > 0;
  return true;
}

/* ── üç değerli seçici ──────────────────────────────────────────────────
   Boş seçenek `null` yazar ve etiketi "değerlendirilmedi"dir. "Hayır"la
   aynı kutuya konsaydı, hiç bakılmamış bir bağ "tek nokta değil" diye
   okunurdu. */
const UCLU = [
  { id: '', ad: 'Değerlendirilmedi' },
  { id: 'evet', ad: 'Evet' },
  { id: 'hayir', ad: 'Hayır' },
];
const ucluCoz = (v: string) => (v === '' ? null : v === 'evet');

/* ── süreç formu ─────────────────────────────────────────────────────── */

type SurecFormu = {
  id?: string; kod: string; ad: string; tesisId: string; uretimEtkisi: string;
};

function SurecFormAlanlari({ f, setF, tesisler, kapat }: {
  f: SurecFormu; setF: (f: SurecFormu) => void;
  tesisler: { id: string; ad: string }[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const gecerli = f.kod.trim().length > 0 && f.ad.trim().length > 0;

  return (
    <div style={{ display: 'grid', gap: 'var(--s12)' }}>
      <Alan etiket="Kod" zorunlu>
        <input className="ab-gr" value={f.kod} disabled={!!f.id}
          style={{ fontFamily: 'var(--veri)' }}
          onChange={(e) => setF({ ...f, kod: e.target.value })} />
      </Alan>
      <Alan etiket="Ad" zorunlu>
        <input className="ab-gr" value={f.ad}
          onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </Alan>
      <Alan etiket="Santral">
        <select className="ab-gr" value={f.tesisId}
          onChange={(e) => setF({ ...f, tesisId: e.target.value })}>
          <option value="">— grup çapında (santralsiz) —</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Üretim etkisi">
        <select className="ab-gr" value={f.uretimEtkisi}
          onChange={(e) => setF({ ...f, uretimEtkisi: e.target.value })}>
          {ETKI_DUZEYLERI.map((d) => (
            <option key={d} value={d}>{ETKI_ETIKETI[d]}</option>
          ))}
        </select>
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => isSureciKaydet({
            id: f.id, kod: f.kod, ad: f.ad,
            tesisId: f.tesisId || null, uretimEtkisi: f.uretimEtkisi,
          }), kapat)}>
          {f.id ? 'Kaydet' : 'Süreç oluştur'}
        </Dugme>
        <Dugme tur="ret" onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Süreç kodu oluşturulduktan sonra değişmez. Santralsiz süreç grup
        çapındadır ve tesise kısıtlı bir rol onu düzenleyemez.
      </p>
    </div>
  );
}

/* ── adım formu ──────────────────────────────────────────────────────── */

type AdimFormu = {
  id?: string; kod: string; ad: string; sira: string;
  aciklama: string; rtoSaat: string; rpoSaat: string; uretimEtkisi: string;
};

const BOS_ADIM: AdimFormu = {
  kod: '', ad: '', sira: '', aciklama: '', rtoSaat: '', rpoSaat: '',
  uretimEtkisi: 'bilinmiyor',
};

const adimdan = (a: AdimSatiri): AdimFormu => ({
  id: a.id, kod: a.kod, ad: a.ad, sira: String(a.sira),
  aciklama: a.aciklama ?? '',
  rtoSaat: a.rtoSaat === null ? '' : String(a.rtoSaat),
  rpoSaat: a.rpoSaat === null ? '' : String(a.rpoSaat),
  uretimEtkisi: a.uretimEtkisi,
});

/** Boş girdi `null` gider; `Number('')` sıfır olurdu ve bu bir yalandır. */
const sayiYaNull = (x: string) => (x.trim() === '' ? null : Number(x));

function AdimFormAlanlari({ surecId, f, setF, kapat }: {
  surecId: string; f: AdimFormu; setF: (f: AdimFormu) => void; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const sira = Number(f.sira);
  const gecerli = f.kod.trim().length > 0 && f.ad.trim().length > 0
    && Number.isInteger(sira) && sira >= 1;

  return (
    <div style={{ display: 'grid', gap: 'var(--s12)' }}>
      <Alan etiket="Adım kodu" zorunlu>
        <input className="ab-gr" value={f.kod} style={{ fontFamily: 'var(--veri)' }}
          onChange={(e) => setF({ ...f, kod: e.target.value })} />
      </Alan>
      <Alan etiket="Adım adı" zorunlu>
        <input className="ab-gr" value={f.ad}
          onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </Alan>
      <Alan etiket="Sıra" zorunlu>
        <input className="ab-gr" type="number" min={1} value={f.sira}
          onChange={(e) => setF({ ...f, sira: e.target.value })} />
      </Alan>
      <Alan etiket="Üretim etkisi">
        <select className="ab-gr" value={f.uretimEtkisi}
          onChange={(e) => setF({ ...f, uretimEtkisi: e.target.value })}>
          {ETKI_DUZEYLERI.map((d) => (
            <option key={d} value={d}>{ETKI_ETIKETI[d]}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="RTO (saat) — boş = belirlenmedi">
        <input className="ab-gr" type="number" min={0} step="0.5" value={f.rtoSaat}
          onChange={(e) => setF({ ...f, rtoSaat: e.target.value })} />
      </Alan>
      <Alan etiket="RPO (saat) — boş = belirlenmedi">
        <input className="ab-gr" type="number" min={0} step="0.5" value={f.rpoSaat}
          onChange={(e) => setF({ ...f, rpoSaat: e.target.value })} />
      </Alan>
      <Alan etiket="Açıklama">
        <textarea className="ab-gr" rows={2} value={f.aciklama} style={{ resize: 'vertical' }}
          onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => prosesAdimiKaydet({
            id: f.id, surecId, kod: f.kod, ad: f.ad, sira,
            aciklama: f.aciklama || null,
            rtoSaat: sayiYaNull(f.rtoSaat), rpoSaat: sayiYaNull(f.rpoSaat),
            uretimEtkisi: f.uretimEtkisi,
          }), kapat)}>
          {f.id ? 'Kaydet' : 'Adım ekle'}
        </Dugme>
        <Dugme tur="ret" onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Sıra süreç içinde tekildir. Boş bırakılan RTO/RPO &quot;sıfır
        saat&quot; değil BELİRLENMEDİ olarak yazılır.
      </p>
    </div>
  );
}

/* ── bağ formu ───────────────────────────────────────────────────────── */

function BagFormu({ adimId, varliklar, kapat }: {
  adimId: string; varliklar: { id: string; ad: string }[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [varlikId, setVarlikId] = useState('');
  const [rol, setRol] = useState('diger');
  const [tekNokta, setTekNokta] = useState('');
  const [yedekli, setYedekli] = useState('');
  const [aciklama, setAciklama] = useState('');

  return (
    <div style={{ display: 'grid', gap: 'var(--s10)', marginTop: 'var(--s12)' }}>
      <Alan etiket="Varlık" zorunlu>
        <select className="ab-gr" value={varlikId}
          onChange={(e) => setVarlikId(e.target.value)}>
          <option value="">— seçin —</option>
          {varliklar.map((v) => <option key={v.id} value={v.id}>{v.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Rol">
        <select className="ab-gr" value={rol} onChange={(e) => setRol(e.target.value)}>
          {ROLLER.map((r) => <option key={r} value={r}>{ROL_ETIKET[r]}</option>)}
        </select>
      </Alan>
      <Alan etiket="Tek nokta mı?">
        <select className="ab-gr" value={tekNokta} onChange={(e) => setTekNokta(e.target.value)}>
          {UCLU.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Yedeği var mı?">
        <select className="ab-gr" value={yedekli} onChange={(e) => setYedekli(e.target.value)}>
          {UCLU.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Açıklama">
        <input className="ab-gr" value={aciklama}
          onChange={(e) => setAciklama(e.target.value)} />
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !varlikId}
          onClick={() => calistir(() => adimVarligiAta({
            adimId, varlikId, rol,
            tekNokta: ucluCoz(tekNokta), yedekli: ucluCoz(yedekli),
            aciklama: aciklama || null,
          }), kapat)}>
          Varlığı bağla
        </Dugme>
        <Dugme tur="ret" onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Aynı varlık aynı adımda farklı rollerle iki kez bağlanabilir; bağın
        kendisi bilgi taşır ve rolü değişince yedeklilik de değişir.
      </p>
    </div>
  );
}

function BagSatiriGorunumu({ bag }: { bag: BagSatiri }) {
  const { bekliyor, hata, calistir } = useEylem();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto',
      alignItems: 'start', gap: 'var(--s8)' }}>
      <span style={{ paddingTop: 3 }}><Im durum={bagImi(bag)} ad={bagSozu(bag)} /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 'var(--t-cell)', fontWeight: 600 }}>
          {bag.etiket} · {bag.ad}
        </span>
        <span className="mono" style={{ display: 'block', marginTop: 2,
          fontSize: 'var(--t-label)',
          color: bag.tekNokta === null ? 'var(--unk)' : 'var(--i3)' }}>
          {ROL_ETIKET[bag.rol] ?? bag.rol} · {bagSozu(bag)}
          {bag.aciklama && ` · ${bag.aciklama}`}
        </span>
        {hata && <span className="ab-gr-hata" role="alert">{hata}</span>}
      </span>
      {bag.duzenlenebilir && (
        <button type="button" className="ab-dugme satir" disabled={bekliyor}
          onClick={() => calistir(() => adimVarligiKaldir({ bagId: bag.id }))}>
          Kaldır
        </button>
      )}
    </div>
  );
}

/* ── ekran ───────────────────────────────────────────────────────────── */

export default function ProseslerIstemci({
  surecler, varliklar, tesisler, surecYazabilir, bagYazabilir,
}: {
  surecler: SurecSatiri[];
  varliklar: { id: string; ad: string }[];
  tesisler: { id: string; ad: string }[];
  /** Süreç ve adım tanımı `tanimlar/onay` ister. */
  surecYazabilir: boolean;
  /** Adım ↔ varlık bağı `envanter/yazma` ister — ayrı bir yetkidir. */
  bagYazabilir: boolean;
}) {
  const [mercek, setMercek] = useUrlDurumu<string>('mercek', 'hepsi');
  const [secili, setSecili] = useUrlDurumuBos('surec');
  const [yeniSurec, setYeniSurec] = useState<SurecFormu | null>(null);
  const [surecDuzenle, setSurecDuzenle] = useState<SurecFormu | null>(null);
  const [adimFormu, setAdimFormu] = useState<AdimFormu | null>(null);
  const [bagAdimi, setBagAdimi] = useState<string | null>(null);

  const suzulmus = useMemo(
    () => surecler.filter((s) => mercekten(s, mercek)), [surecler, mercek],
  );
  const surec = surecler.find((s) => s.id === secili) ?? null;

  const toplam = surecler.reduce((a, s) => {
    const c = sayaclar(s);
    return {
      tekNokta: a.tekNokta + c.tekNokta,
      borc: a.borc + c.degerlendirilmedi,
      bosAdim: a.bosAdim + c.bosAdim,
      adim: a.adim + c.adim,
    };
  }, { tekNokta: 0, borc: 0, bosAdim: 0, adim: 0 });

  return (
    <>
      <main className="ab-icerik">
        <EkranBasligi
          eyebrow="Varlık · Ağ & bağımlılık · OT-05"
          vurgu={String(toplam.tekNokta)}
          vurguDurumu={toplam.tekNokta > 0 ? 'bd' : 'ok'}
          baslik="bağ tek nokta ve yedeksiz"
          metrikler={[
            { deger: surecler.length, yazi: 'iş süreci' },
            { deger: toplam.adim, yazi: 'proses adımı' },
            {
              deger: toplam.borc, yazi: 'değerlendirilmedi',
              durum: toplam.borc > 0 ? 'unk' : undefined,
            },
            {
              deger: toplam.bosAdim, yazi: 'varlıksız adım',
              durum: toplam.bosAdim > 0 ? 'md' : undefined,
            },
          ]}
          sag={surecYazabilir
            ? (
              <Dugme onClick={() => setYeniSurec(yeniSurec
                ? null
                : { kod: '', ad: '', tesisId: '', uretimEtkisi: 'bilinmiyor' })}>
                {yeniSurec ? 'Formu kapat' : 'Yeni süreç'}
              </Dugme>
            )
            : <span className="etiket">Süreç tanımı tanımlar onay yetkisi ister</span>}
        />

        <section className="ab-blok">
          <p className="ab-dip" style={{ marginTop: 0 }}>
            Bu ekran cihazın ÜRETİMDE nerede durduğunu söyler;{' '}
            <Link href="/topoloji">Topoloji</Link> ağda nerede durduğunu.
            İkisi aynı cihazın iki ayrı yeridir ve biri diğerinden
            türetilemez. Tek nokta, yedeklilik ve RTO/RPO insan
            değerlendirmesidir — ürün bunları hesaplamaz. Varlık bazında
            aynı bağlar <Link href="/envanter">Envanter</Link> çekmecesinin
            Yönetişim sekmesindedir.
          </p>

          {yeniSurec && (
            <div style={{ marginBottom: 'var(--s18)' }}>
              <SurecFormAlanlari f={yeniSurec} setF={setYeniSurec} tesisler={tesisler}
                kapat={() => setYeniSurec(null)} />
            </div>
          )}

          {surecler.length === 0 ? (
            <BosIlk cumle={'Hiç iş süreci tanımlanmamış. Süreç yoksa "bu cihaz '
              + 'dururca ne durur" sorusu hiç sorulamaz; ekran bunu "risk yok" '
              + 'değil "değerlendirilmedi" sayar.'} />
          ) : suzulmus.length === 0 ? (
            <BosFiltre temizle={() => setMercek('hepsi')} />
          ) : (
            <>
              <Filtreler secenekler={MERCEKLER} aktif={mercek} sec={setMercek} />
              <Tablo
                konuBasligi="İş süreci"
                kolonlar={KOLONLAR}
                secili={secili}
                sec={(id) => setSecili(id === secili ? null : id)}
                dipNot={`${suzulmus.length} süreç gösteriliyor.`
                  + ' "Değerlendirilmedi" bir risk değil, bir ölçüm borcudur.'}
                satirlar={suzulmus.map((s) => {
                  const c = sayaclar(s);
                  return {
                    id: s.id,
                    durum: surecImi(s),
                    kenar: surecImi(s),
                    konu: `${s.kod} · ${s.ad}`,
                    alt: surecSozu(s),
                    hucreler: [
                      s.tesisAd ?? 'grup çapında',
                      c.adim,
                      c.bag,
                      <span key="t" style={c.tekNokta > 0 ? { color: 'var(--bd)' } : undefined}>
                        {c.tekNokta}
                      </span>,
                      <span key="d" style={c.degerlendirilmedi > 0
                        ? { color: 'var(--unk)' } : undefined}>
                        {c.degerlendirilmedi}
                      </span>,
                    ],
                  };
                })}
              />
            </>
          )}
        </section>
      </main>

      {surec && (
        <Cekmece kod={surec.kod} ad="İş süreci"
          kapat={() => {
            setSecili(null); setSurecDuzenle(null); setAdimFormu(null); setBagAdimi(null);
          }}>
          <CekmeceKimlik
            durum={surecImi(surec)}
            soz={surecSozu(surec)}
            baslik={surec.ad}
            cumle={`${surec.tesisAd ?? 'Grup çapında süreç'} · üretim etkisi `
              + `${ETKI_ETIKETI[etkiDuzeyi(surec.uretimEtkisi)]}`}
          />

          <CekmeceAlanlar alanlar={[
            { etiket: 'Santral', deger: surec.tesisAd ?? 'grup çapında',
              durum: surec.tesisAd ? undefined : 'unk' },
            { etiket: 'Üretim etkisi',
              deger: ETKI_ETIKETI[etkiDuzeyi(surec.uretimEtkisi)],
              durum: surec.uretimEtkisi === 'bilinmiyor' ? 'unk' : undefined },
            { etiket: 'Adım', deger: sayaclar(surec).adim },
            { etiket: 'Bağlı varlık', deger: sayaclar(surec).bag },
            { etiket: 'Tek nokta', deger: sayaclar(surec).tekNokta,
              durum: sayaclar(surec).tekNokta > 0 ? 'bd' : undefined },
            { etiket: 'Değerlendirilmedi', deger: sayaclar(surec).degerlendirilmedi,
              durum: sayaclar(surec).degerlendirilmedi > 0 ? 'unk' : undefined },
          ]} />

          {surec.duzenlenebilir && (
            <div className="ab-panel-blok">
              {surecDuzenle ? (
                <SurecFormAlanlari f={surecDuzenle} setF={setSurecDuzenle}
                  tesisler={tesisler} kapat={() => setSurecDuzenle(null)} />
              ) : (
                <Dugme onClick={() => setSurecDuzenle({
                  id: surec.id, kod: surec.kod, ad: surec.ad,
                  tesisId: surec.tesisId ?? '', uretimEtkisi: surec.uretimEtkisi,
                })}>Süreci düzenle</Dugme>
              )}
            </div>
          )}

          <div className="ab-panel-blok">
            <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
              Adımlar · {surec.adimlar.length}
            </p>
            {surec.adimlar.length === 0 && (
              <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--unk)' }}>
                Adım tanımlanmadı — bu süreç için hiçbir kırılım yok ve
                zincir hiç kurulmadı.
              </p>
            )}
            {surec.adimlar.map((a) => (
              <div key={a.id} style={{ marginTop: 'var(--s16)',
                borderLeft: 'var(--bw-edge) solid var(--hr2)', paddingLeft: 'var(--s12)' }}>
                <p style={{ margin: 0, fontSize: 'var(--t-field)', fontWeight: 600 }}>
                  {a.sira}. {a.kod} · {a.ad}
                </p>
                <p className="mono" style={{ margin: 'var(--s4) 0 var(--s10)',
                  fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                  RTO {saat(a.rtoSaat)} · RPO {saat(a.rpoSaat)} ·
                  {' '}etki {ETKI_ETIKETI[etkiDuzeyi(a.uretimEtkisi)]}
                </p>
                {a.aciklama && (
                  <p style={{ margin: '0 0 var(--s10)', fontSize: 'var(--t-label)',
                    color: 'var(--i2)' }}>{a.aciklama}</p>
                )}

                {a.varliklar.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--md)' }}>
                    Bu adıma hiç varlık bağlanmadı — zincirin kopuk halkası.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--s10)' }}>
                    {a.varliklar.map((b) => <BagSatiriGorunumu key={b.id} bag={b} />)}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap',
                  marginTop: 'var(--s12)' }}>
                  {surec.duzenlenebilir && adimFormu?.id !== a.id && (
                    <Dugme onClick={() => setAdimFormu(adimdan(a))}>Adımı düzenle</Dugme>
                  )}
                  {bagYazabilir && bagAdimi !== a.id && (
                    <Dugme onClick={() => setBagAdimi(a.id)}>Varlık bağla</Dugme>
                  )}
                </div>
                {adimFormu?.id === a.id && (
                  <div style={{ marginTop: 'var(--s12)' }}>
                    <AdimFormAlanlari surecId={surec.id} f={adimFormu} setF={setAdimFormu}
                      kapat={() => setAdimFormu(null)} />
                  </div>
                )}
                {bagAdimi === a.id && (
                  <BagFormu adimId={a.id} varliklar={varliklar}
                    kapat={() => setBagAdimi(null)} />
                )}
              </div>
            ))}

            {surec.duzenlenebilir && (
              <div style={{ marginTop: 'var(--s18)' }}>
                {adimFormu && !adimFormu.id ? (
                  <AdimFormAlanlari surecId={surec.id} f={adimFormu} setF={setAdimFormu}
                    kapat={() => setAdimFormu(null)} />
                ) : (
                  <Dugme tur="tam" onClick={() => setAdimFormu({
                    ...BOS_ADIM, sira: String(surec.adimlar.length + 1),
                  })}>Adım ekle</Dugme>
                )}
              </div>
            )}
            {!bagYazabilir && (
              <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
                Varlık bağlamak envanter yazma yetkisi ve varlığın santral
                kapsamını ister.
              </p>
            )}
          </div>
        </Cekmece>
      )}
    </>
  );
}
