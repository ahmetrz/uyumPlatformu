'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Dugme, BosIlk, BosFiltre } from '@/components/atlas/temel';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import { Cekmece, CekmeceAlanlar, CekmeceEylemler } from '@/components/atlas/cekmece';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { etiketle, eylemCumlesi, tarihTR, zamanTR } from '@/lib/sabitler';
import {
  MERCEKLER, aktorMetni, ayniKayit, degisimMetni, kaynakEtiketi, kisaZaman,
  kritikEylem, mercekUyar, metrikleriHesapla,
  type Kayit,
} from './mantik';

/* Denetim izi — "kim neyi ne zaman değiştirdi?"
   Tek canvas modülü: kütük. Satır Tablo bileşeni yerine .tbl gramerinin
   kendisiyle kurulur, çünkü ilk kolonda durum işaretçisi DEĞİL zaman damgası
   durur: kaydın taşıdığı "uyumlu → kısmi" değeri verinin kendisidir, satırın
   durumu değildir; ikisi aynı satırda üst üste binmemeli (06 §A2).

   Kütük değişmezdir; bu ekranda hiçbir düzenleme yüzeyi yoktur. */

/** 06 §A3: 5–9 satır görünür; geri alınamaz eylemler bütçenin dışındadır. */
const GORUNUR_BUTCE = 8;

const KOLONLAR = '104px minmax(0, 1fr) 236px 92px 26px';
const KOLONLAR_DAR = '104px minmax(0, 1fr) 236px 26px';

export default function AktiviteIstemci({ kayitlar, simdi, pencere }: {
  kayitlar: Kayit[]; simdi: number; pencere: number;
}) {
  const [mercek, setMercek] = useState('hepsi');
  const [tipF, setTipF] = useState<string | null>(null);
  const [aktorF, setAktorF] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [secili, setSecili] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const m = useMemo(() => metrikleriHesapla(kayitlar, simdi), [kayitlar, simdi]);

  const tipler = useMemo(
    () => [...new Set(kayitlar.map((k) => k.varlikTipi))].sort((a, b) => a.localeCompare(b, 'tr')),
    [kayitlar]);
  const aktorler = useMemo(
    () => [...new Set(kayitlar.map(aktorMetni))].sort((a, b) => a.localeCompare(b, 'tr')),
    [kayitlar]);

  const suzulmus = useMemo(() => kayitlar.filter((k) => {
    if (!mercekUyar(k, mercek)) return false;
    if (tipF && k.varlikTipi !== tipF) return false;
    if (aktorF && aktorMetni(k) !== aktorF) return false;
    if (arama) {
      const havuz = `${aktorMetni(k)} ${etiketle(k.varlikTipi)} `
        + `${eylemCumlesi(k.eylem, k.varlikTipi, k.alan)} ${degisimMetni(k) ?? ''}`;
      if (!havuz.toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    }
    return true;
  }), [kayitlar, mercek, tipF, aktorF, arama]);

  /* Geri alınamaz eylemler (silme, ret) sıralamadan bağımsız üste sabitlenir
     ve ASLA toplanmaz; kalan kütük zaman sırasında kuyrukta toplanır. */
  const { gorunur, toplanan } = useMemo(() => {
    const sabit = suzulmus.filter(kritikEylem);
    const kalan = suzulmus.filter((k) => !kritikEylem(k));
    if (kuyrukAcik) return { gorunur: [...sabit, ...kalan], toplanan: [] as Kayit[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return { gorunur: [...sabit, ...kalan.slice(0, slot)], toplanan: kalan.slice(slot) };
  }, [suzulmus, kuyrukAcik]);

  const secilen = kayitlar.find((k) => k.id === secili) ?? null;
  const filtreAktif = mercek !== 'hepsi' || tipF !== null || aktorF !== null || arama.trim() !== '';

  const baslik = m.son24 > 0
    ? { vurgu: `${m.son24} kayıt`, ad: 'son 24 saatte' }
    : { vurgu: `${m.toplam} kayıt`, ad: 'kütükte' };

  return (
    <>
      <main style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Denetim izi · en yeni ${Math.min(pencere, m.toplam)} kayıt`}
          vurgu={baslik.vurgu}
          baslik={baslik.ad}
          metrikler={[
            { deger: m.son24, yazi: 'Son 24 saat' },
            { deger: m.son7, yazi: 'Son 7 gün' },
            { deger: m.aktor, yazi: 'Aktör' },
            { deger: m.kritik, yazi: 'Silme ve ret', durum: m.kritik > 0 ? 'bd' : undefined },
          ]}
        />

        <section className="ekran-govde">
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Ara deger={arama} degistir={(v) => { setArama(v); setKuyrukAcik(false); }} />
                <Kapsam etiket="Varlık" aktif={tipF}
                  sec={(id) => { setTipF(id); setKuyrukAcik(false); }}
                  secenekler={tipler.map((t) => ({ id: t, ad: etiketle(t) }))} />
                <Kapsam etiket="Aktör" aktif={aktorF}
                  sec={(id) => { setAktorF(id); setKuyrukAcik(false); }}
                  secenekler={aktorler.map((a) => ({ id: a, ad: a }))} />
              </>
            }
          />

          {gorunur.length > 0 || toplanan.length > 0 ? (
            <div style={{ marginTop: 'var(--s22)' }}>
              <div className="tbl"
                style={{ '--kolonlar': KOLONLAR, '--kolonlar-dar': KOLONLAR_DAR } as CSSProperties}
                role="table">
                <div className="tbl-bas" role="row">
                  <span className="t-colhead">Zaman</span>
                  <span className="t-colhead">Kayıt</span>
                  <span className="t-colhead">Değişim</span>
                  <span className="t-colhead tbl-ikincil">Kaynak</span>
                  <span />
                </div>

                {gorunur.map((k) => (
                  <Satir key={k.id} kayit={k} secili={secili === k.id}
                    sec={() => setSecili((o) => (o === k.id ? null : k.id))} />
                ))}

                {toplanan.length > 0 && (
                  <button type="button" className="tbl-satir tbl-kuyruk"
                    style={{ gridTemplateColumns: '104px minmax(0, 1fr) 26px' }}
                    onClick={() => setKuyrukAcik(true)}>
                    <span />
                    <span className="tbl-hucre">
                      +{toplanan.length} kayıt · en eskisi {tarihTR(toplanan[toplanan.length - 1].zaman)}
                    </span>
                    <span className="tbl-ok" style={{ justifySelf: 'end' }} aria-hidden>▾</span>
                  </button>
                )}

                <p className="dip-not tbl-dip">{dipNot(gorunur.length, m)}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end',
                padding: 'var(--s10) 0 0' }}>
                <DisaAktar kayitlar={suzulmus} />
              </div>
            </div>
          ) : filtreAktif ? (
            <BosFiltre temizle={() => {
              setMercek('hepsi'); setTipF(null); setAktorF(null); setArama('');
            }} />
          ) : (
            <div style={{ marginTop: 'var(--s26)' }}>
              <BosIlk cumle="Denetim izi kütüğünde kayıt yok." />
            </div>
          )}
        </section>
      </main>

      {secilen && (
        <IzCekmecesi kayit={secilen} komsular={ayniKayit(kayitlar, secilen)}
          kapat={() => setSecili(null)} />
      )}
    </>
  );
}

function dipNot(gorunur: number, m: ReturnType<typeof metrikleriHesapla>): string {
  const parcalar = [`${gorunur} satır görünüyor`, 'kütük değişmez: kayıt güncellenmez, silinmez'];
  // Aktörü bilinmeyen kayıt "sistem" sayılmaz; ayrıca söylenir.
  if (m.aktorsuz > 0) parcalar.push(`${m.aktorsuz} kaydın aktörü bilinmiyor`);
  return parcalar.join(' · ');
}

/* ── Satır ──────────────────────────────────────────────────────────── */

function Satir({ kayit, secili, sec }: { kayit: Kayit; secili: boolean; sec: () => void }) {
  const degisim = degisimMetni(kayit);
  const kritik = kritikEylem(kayit);
  return (
    <button
      type="button"
      role="row"
      aria-selected={secili}
      className="tbl-satir"
      onClick={sec}
      style={{ borderLeftColor: secili ? (kritik ? 'var(--bd)' : 'var(--acc)') : 'transparent' }}
    >
      <span role="cell" style={{
        paddingLeft: 'var(--s16)', fontFamily: 'var(--mo)', fontSize: 'var(--t-code)',
        color: 'var(--i3)', fontVariantNumeric: 'tabular-nums',
      }}>
        {kisaZaman(kayit.zaman)}
      </span>
      <span role="cell" style={{ minWidth: 0 }}>
        <span className="tbl-konu">
          <b style={{ fontWeight: 700 }}>{aktorMetni(kayit)}</b>{' '}
          <span style={{ fontWeight: 400, color: 'var(--i2)' }}>
            {eylemCumlesi(kayit.eylem, kayit.varlikTipi, kayit.alan)}
          </span>
        </span>
        <span className="tbl-alt">{etiketle(kayit.varlikTipi)}</span>
      </span>
      <span role="cell" className="tbl-hucre"
        style={kritik ? { color: 'var(--bd)' } : undefined}>
        {degisim ?? <span style={{ color: 'var(--i3)' }}>—</span>}
      </span>
      <span role="cell" className="tbl-hucre tbl-ikincil"
        style={{ fontFamily: 'var(--mo)', fontSize: 'var(--t-code)' }}>
        {kaynakEtiketi(kayit.kaynak)}
      </span>
      <span className="tbl-ok" style={{ justifySelf: 'end' }} aria-hidden>▸</span>
    </button>
  );
}

/* ── Çekmece · salt okunur kayıt ─────────────────────────────────────────
   Kimlik bloğu YOK: kaydın taşıdığı sözcük onun verisidir, bir duruma
   çevirmek uydurma olurdu. Blok sırası: kayıt → alanlar → değişim → iz. */

function IzCekmecesi({ kayit, komsular, kapat }: {
  kayit: Kayit; komsular: Kayit[]; kapat: () => void;
}) {
  const degisim = degisimMetni(kayit);
  return (
    <Cekmece kod={`${etiketle(kayit.varlikTipi)} · ${kayit.varlikId.slice(-6)}`} kapat={kapat}>
      <div className="cekmece-blok">
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Kayıt</p>
        <p className="t-section" style={{ margin: 0 }}>
          <b style={{ fontWeight: 700 }}>{aktorMetni(kayit)}</b>{' '}
          {eylemCumlesi(kayit.eylem, kayit.varlikTipi, kayit.alan)}
        </p>
        <p style={{ margin: 'var(--s10) 0 0', fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>
          {zamanTR(kayit.zaman)}
        </p>
      </div>

      <CekmeceAlanlar alanlar={[
        { etiket: 'Varlık', deger: etiketle(kayit.varlikTipi) },
        { etiket: 'Eylem', deger: etiketle(kayit.eylem) },
        { etiket: 'Alan', deger: kayit.alan ? etiketle(kayit.alan) : 'kayıt geneli' },
        { etiket: 'Kaynak', deger: kaynakEtiketi(kayit.kaynak) },
      ]} />

      <div className="cekmece-blok" style={{ marginTop: 'var(--s22)' }}>
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Değişim</p>
        {degisim ? (
          <p style={{ margin: 0, fontSize: 'var(--t-cell)', fontFamily: 'var(--mo)' }}>
            {degisim}
          </p>
        ) : (
          <p className="cekmece-dip" style={{ margin: 0 }}>
            Kayıtta önceki/yeni değer tutulmamış — eylem alan bazında değil kayıt geneli.
          </p>
        )}
      </div>

      <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>
          Aynı kayıttaki iz · {komsular.length}
        </p>
        <div style={{ display: 'grid', gap: 'var(--s14)' }}>
          {komsular.slice(0, 8).map((k) => (
            <div key={k.id} style={{ display: 'grid', gap: 2,
              borderLeft: 'var(--bw-edge) solid',
              borderLeftColor: k.id === kayit.id ? 'var(--jes)' : 'var(--hr2)',
              paddingLeft: 'var(--s12)' }}>
              <span style={{ fontSize: 'var(--t-field)' }}>
                <b style={{ fontWeight: 600 }}>{aktorMetni(k)}</b>{' '}
                {eylemCumlesi(k.eylem, k.varlikTipi === kayit.varlikTipi ? null : k.varlikTipi, k.alan)}
              </span>
              <span style={{ fontFamily: 'var(--mo)', fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                {zamanTR(k.zaman)}
                {degisimMetni(k) && ` · ${degisimMetni(k)}`}
              </span>
            </div>
          ))}
        </div>
        {komsular.length > 8 && (
          <p className="cekmece-dip" style={{ margin: 'var(--s12) 0 0' }}>
            +{komsular.length - 8} kayıt daha bu pencerede.
          </p>
        )}
      </div>

      <CekmeceEylemler
        birincil={kayit.varlikTipi === 'Bulgu'
          ? <Link href={`/bulgular/${kayit.varlikId}`}><Dugme tur="cekmece">Kaydı aç</Dugme></Link>
          : undefined}
        dipNot={'Denetim izi salt okunurdur: veritabanı tetikleyicisi bu kütükte '
          + 'güncelleme ve silmeyi reddeder, kayıt yalnız eklenir.'}
      />
    </Cekmece>
  );
}

/* ── Kapsam kontrolleri ─────────────────────────────────────────────── */

function Ara({ deger, degistir }: { deger: string; degistir: (v: string) => void }) {
  return (
    <input
      className="gr"
      aria-label="Aktör, varlık ya da değişim ara"
      placeholder="Ara"
      value={deger}
      onChange={(e) => degistir(e.target.value)}
      style={{
        width: 118, background: 'none', border: 0,
        borderBottom: 'var(--bw-hair) solid var(--hr2)',
        padding: '3px 0', fontFamily: 'var(--mo)', fontSize: 'var(--t-label)',
        letterSpacing: 'var(--tr-label)', textTransform: 'uppercase',
      }}
    />
  );
}

/** Açılır listeyi dışarı tık ve Esc kapatır — açık kalan menü tabloyu örter. */
function disariKapat(kok: React.RefObject<HTMLDetailsElement | null>) {
  const kapat = (e: Event) => {
    const d = kok.current;
    if (!d?.open) return;
    if (e.type === 'keydown') {
      if ((e as KeyboardEvent).key === 'Escape') d.open = false;
      return;
    }
    if (!d.contains(e.target as Node)) d.open = false;
  };
  document.addEventListener('mousedown', kapat);
  document.addEventListener('keydown', kapat);
  return () => {
    document.removeEventListener('mousedown', kapat);
    document.removeEventListener('keydown', kapat);
  };
}

function Kapsam({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  const secim = secenekler.find((s) => s.id === aktif);
  const kok = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => disariKapat(kok), []);

  return (
    <details ref={kok} style={{ position: 'relative' }}>
      <summary className="kapsam-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 190,
        maxHeight: 300, overflowY: 'auto', background: 'var(--card)',
        border: 'var(--bw-strong) solid var(--hr2)', boxShadow: 'var(--sh-tip)',
        padding: 'var(--s8)',
      }}>
        {[{ id: '', ad: 'Tümü' }, ...secenekler].map((s) => (
          <button key={s.id} type="button" className="filtre"
            style={{ display: 'block', width: '100%', textAlign: 'left' }}
            aria-pressed={(aktif ?? '') === s.id}
            onClick={(e) => {
              sec(s.id === '' ? null : s.id);
              e.currentTarget.closest('details')?.removeAttribute('open');
            }}>
            {s.ad}
          </button>
        ))}
      </div>
    </details>
  );
}

/** Dışa aktarım filtre bütçesinin dışında, tabloyu izleyen tek sessiz bağlantı. */
function DisaAktar({ kayitlar }: { kayitlar: Kayit[] }) {
  const kok = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => disariKapat(kok), []);

  const kapatVe = (e: React.MouseEvent, is: () => void) => {
    e.currentTarget.closest('details')?.removeAttribute('open');
    is();
  };

  return (
    <details ref={kok} className="yazdirmada-gizle" style={{ position: 'relative' }}>
      <summary className="kapsam-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        ⤓ Dışa aktar <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', bottom: '100%', right: 0, zIndex: 5, minWidth: 150,
        background: 'var(--card)', border: 'var(--bw-strong) solid var(--hr2)',
        boxShadow: 'var(--sh-tip)', padding: 'var(--s8)',
      }}>
        <button type="button" className="filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, () => exceleAktar('denetim-izi', [{
            ad: 'Denetim izi',
            satirlar: [
              ['Zaman', 'Aktör', 'Varlık', 'Eylem', 'Alan', 'Önceki', 'Yeni', 'Dosya', 'Kaynak'],
              ...kayitlar.map((k) => [
                zamanTR(k.zaman), aktorMetni(k), etiketle(k.varlikTipi), etiketle(k.eylem),
                k.alan ? etiketle(k.alan) : '', etiketle(k.once, ''), etiketle(k.sonra, ''),
                k.dosya ?? '', kaynakEtiketi(k.kaynak),
              ]),
            ],
          }]))}>
          Excel
        </button>
        <button type="button" className="filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, pdfYazdir)}>
          PDF
        </button>
      </div>
    </details>
  );
}
