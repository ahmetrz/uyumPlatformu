'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BosIlk, Dugme, type Durum } from '@/components/atlas/temel';
import { Matris, Tablo, type Kolon, type MatrisSatiri, type Satir } from '@/components/atlas/tablo';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import {
  Cekmece, CekmeceAlanlar, CekmeceEylemler, CekmeceKimlik,
} from '@/components/atlas/cekmece';
import { DENKLIK_ETIKET } from '@/lib/sabitler';
import { DenklikFormu, DenklikKaldir } from './Formlar';
import {
  acilisCifti, anahtar, ciftinEsleri, cizilebilirEsler, DENKLIK_IM,
  digerCerceveEsleri, hucreIpucu,
  hucreleriKur, karsiliksizAlti, karsiliksizlar, kisaBaslik, matrisKur,
  type E, type Kodlu, type M,
} from './mantik';

/* Çapraz eşleme kütüğü — "hangi madde hangi maddeyi karşılıyor?"

   İki canvas modülü (06 §A1): denklik matrisi + karşılıksız maddeler
   tablosu. Matris YALNIZ eşlemesi olan maddelerden kurulur; boş bir satır
   "her yerde kapsam dışı" gibi okunur ve yanlış olurdu. Karşılığı olmayan
   madde bu yüzden ikinci modülde, kendi BİLİNMEYEN işaretçisiyle yaşar —
   eşleme yokluğu sıfır denklik değil, ölçülmemiş denkliktir.

   Hücrede yalnız işaretçi bulunur; denklik sözcüğü tüm ekranda yalnız
   çekmecenin kimlik bloğunda geçer (06 §A2). */

/** 06 §A3: karşılıksız tablosunda 5–9 satır; kalanı toplanır. */
const GORUNUR_BUTCE = 7;

const KOLONLAR: Kolon[] = [
  { baslik: 'Başka çerçevede', genislik: '168px' },
  { baslik: 'Madde kodu', genislik: '190px', ikincil: true },
];

type Secim =
  | { tip: 'denklik'; esId: string }
  | { tip: 'yeni'; kaynakId: string | null; hedefId: string | null };

const denklikSozu = (d: string) =>
  DENKLIK_ETIKET[d as keyof typeof DENKLIK_ETIKET] ?? d;

export default function EslestirmeIstemci({
  cerceveler, maddeler, esler, yazabilir,
}: {
  cerceveler: Kodlu[];
  maddeler: M[];
  esler: E[];
  yazabilir: boolean;
}) {
  /* Ekranın konuştuğu evren ÇİZİLEBİLİR eşlemelerdir: iki ucu da yaprak
     madde olanlar. Sayaçlar ile hücreler aynı kümeden okunmalı, yoksa
     "3 denklik" yazıp 2 hücre çizmiş oluruz. */
  const cizilebilir = useMemo(() => cizilebilirEsler(esler, maddeler), [esler, maddeler]);
  const yapraksiz = esler.length - cizilebilir.length;

  // Açılış çifti eşlemesi en yoğun ikiliye kurulur; ilk render boş matris
  // göstermesin (mantik.acilisCifti).
  const [acilis] = useState(() => acilisCifti(cerceveler, cizilebilir));
  const [solReg, setSolReg] = useState(acilis.sol);
  const [sagReg, setSagReg] = useState(acilis.sag);
  const [secim, setSecim] = useState<Secim | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const hucre = useMemo(() => hucreleriKur(cizilebilir), [cizilebilir]);
  const sol = useMemo(() => maddeler.filter((m) => m.regId === solReg), [maddeler, solReg]);
  const sag = useMemo(() => maddeler.filter((m) => m.regId === sagReg), [maddeler, sagReg]);

  const kurulum = useMemo(() => matrisKur(sol, sag, hucre), [sol, sag, hucre]);
  const cift = useMemo(() => ciftinEsleri(cizilebilir, solReg, sagReg),
    [cizilebilir, solReg, sagReg]);
  const bosta = useMemo(() => karsiliksizlar(sol, sag, hucre), [sol, sag, hucre]);

  const solKod = cerceveler.find((c) => c.id === solReg)?.kod ?? '—';
  const sagKod = cerceveler.find((c) => c.id === sagReg)?.kod ?? '—';
  const tamSayisi = cift.filter((e) => e.denklik === 'tam').length;

  const matrisSatirlari: MatrisSatiri[] = kurulum.satirlar.map((m) => ({
    id: m.id,
    ad: m.kisaKod,
    alt: kisaBaslik(m.baslik),
    hucreler: kurulum.kolonlar.map((k) => {
      const es = hucre.get(anahtar(m.id, k.id));
      return {
        /* Eşleşme yoksa hücre BOŞ kalır: denklik kaydı yok demektir,
           "sıfır denklik" değil. Sayısı satır sayacında söylenir. */
        durum: es ? DENKLIK_IM[es.denklik] ?? 'unk' : null,
        ipucu: hucreIpucu(m, k, es, denklikSozu),
      };
    }),
  }));

  const { gorunurBos, toplananBos } = useMemo(() => {
    if (kuyrukAcik) return { gorunurBos: bosta, toplananBos: [] as M[] };
    return { gorunurBos: bosta.slice(0, GORUNUR_BUTCE), toplananBos: bosta.slice(GORUNUR_BUTCE) };
  }, [bosta, kuyrukAcik]);

  const bosSatirlar: Satir[] = gorunurBos.map((m) => {
    const diger = digerCerceveEsleri(m, cizilebilir, sagReg);
    return {
      id: m.id,
      // Karşılığı olmayan madde ölçülmemiştir: elmas, kırmızı nokta değil.
      durum: 'unk',
      kenar: 'unk',
      konu: m.baslik,
      alt: karsiliksizAlti(m, diger),
      hucreler: [
        diger > 0
          ? <span key="d" style={{ color: 'var(--md)' }}>{diger} denklik</span>
          : <span key="d" style={{ color: 'var(--i3)' }}>hiç yok</span>,
        m.kod,
      ],
    };
  });

  const secilenEs = secim?.tip === 'denklik'
    ? cizilebilir.find((e) => e.id === secim.esId) ?? null : null;
  const yeniKaynak = secim?.tip === 'yeni' && secim.kaynakId
    ? maddeler.find((m) => m.id === secim.kaynakId) ?? null : null;
  const yeniHedef = secim?.tip === 'yeni' && secim.hedefId
    ? maddeler.find((m) => m.id === secim.hedefId) ?? null : null;

  const baslik = sol.length === 0
    ? { vurgu: undefined, ad: `${solKod} kataloğu boş`, durum: undefined }
    : bosta.length > 0
      ? { vurgu: `${bosta.length} madde`, ad: 'karşılıksız', durum: 'md' as Durum }
      : { vurgu: `${cift.length} denklik`, ad: 'kayıtlı', durum: undefined };

  function cerceveSec(id: string) {
    setSolReg(id);
    setSecim(null);
    setKuyrukAcik(false);
    // Aynı çerçeve iki eksende duramaz: hedef kendiliğinden kayar.
    if (id === sagReg) {
      setSagReg(cerceveler.find((c) => c.id !== id)?.id ?? id);
    }
  }

  function hucreSec(satirId: string, kolonIndeksi: number) {
    const hedef = kurulum.kolonlar[kolonIndeksi];
    if (!hedef) return;
    const es = hucre.get(anahtar(satirId, hedef.id));
    setSecim(es
      ? { tip: 'denklik', esId: es.id }
      : { tip: 'yeni', kaynakId: satirId, hedefId: hedef.id });
  }

  if (cerceveler.length === 0) {
    return (
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <EkranBasligi eyebrow="Çapraz eşleme" baslik="Çerçeve tanımlı değil" />
        <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <BosIlk
            cumle="Eşleme için en az iki aktif regülasyon gerekir."
            eylem={<Link className="dg dg-birincil" href="/regulasyonlar">Regülasyon kütüphanesi</Link>}
          />
        </section>
      </main>
    );
  }

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Çapraz eşleme · ${solKod} satır × ${sagKod} sütun`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            { deger: cift.length, yazi: 'Denklik' },
            { deger: tamSayisi, yazi: 'Tam denklik' },
            {
              deger: bosta.length,
              payda: sol.length > 0 ? sol.length : undefined,
              yazi: 'Karşılıksız',
              durum: bosta.length > 0 ? 'md' : undefined,
            },
            { deger: cizilebilir.length, yazi: 'Kütüphane' },
          ]}
        />

        <section className="ekran-govde">
          <Filtreler
            secenekler={cerceveler.map((c) => ({ id: c.id, ad: c.kod }))}
            aktif={solReg}
            sec={cerceveSec}
            kapsam={
              <>
                <HedefSecici cerceveler={cerceveler.filter((c) => c.id !== solReg)}
                  aktif={sagReg} sec={(id) => { setSagReg(id); setSecim(null); }} />
                {yazabilir && (
                  <button type="button" className="kapsam-dugme"
                    onClick={() => setSecim({ tip: 'yeni', kaynakId: null, hedefId: null })}>
                    + Denklik
                  </button>
                )}
              </>
            }
          />

          {kurulum.satirlar.length === 0 ? (
            <div style={{ marginTop: 'var(--s26)' }}>
              <BosIlk
                cumle={sol.length === 0 || sag.length === 0
                  ? `${sol.length === 0 ? solKod : sagKod} çerçevesinde yaprak madde yok — eşleme kurulamıyor.`
                  : `${solKod} ile ${sagKod} arasında denklik kaydı yok.`}
                eylem={yazabilir && sol.length > 0 && sag.length > 0
                  ? <Dugme tur="birincil"
                    onClick={() => setSecim({ tip: 'yeni', kaynakId: null, hedefId: null })}>
                    Denklik ekle
                  </Dugme>
                  : <Link className="dg dg-birincil" href="/regulasyonlar">Katalogu aç</Link>}
              />
            </div>
          ) : (
            <div style={{ marginTop: 'var(--s24)' }}>
              <Matris
                konuBasligi="Madde"
                kolonBasliklari={kurulum.kolonlar.map((k) => ({ ad: k.kisaKod }))}
                satirlar={matrisSatirlari}
                secili={secilenEs
                  ? (kurulum.satirlar.find((m) => m.id === secilenEs.kaynak.id
                    || m.id === secilenEs.hedef.id)?.id ?? null)
                  : secim?.tip === 'yeni' ? secim.kaynakId : null}
                sec={hucreSec}
              />

              <p className="dip-not">
                Satırlar {solKod}, sütunlar {sagKod} · hücreye tıklayınca denklik
                çekmecede açılır, boş hücre yeni denklik formunu açar
                {kurulum.toplananSatir > 0 && ` · eşlemesi olan ${kurulum.toplananSatir} madde matrise sığmadı`}
                {kurulum.toplananKolon > 0 && ` · ${kurulum.toplananKolon} sütun toplandı`}
                {/* Yaprak olmayan maddeye bağlanmış denklik çizilemez —
                    sessizce yok sayılmaz, veri sorunu olarak söylenir. */}
                {yapraksiz > 0 && ` · ${yapraksiz} denklik yaprak olmayan maddeye bağlı, çizilemiyor`}
              </p>
            </div>
          )}

          {bosta.length > 0 && (
            <div style={{ marginTop: 'var(--s30)' }}>
              <p className="t-colhead" style={{ margin: '0 0 var(--s10)' }}>
                {sagKod} çerçevesinde karşılığı olmayan {solKod} maddeleri
              </p>
              <Tablo
                sik
                konuBasligi="Madde"
                kolonlar={KOLONLAR}
                satirlar={bosSatirlar}
                secili={secim?.tip === 'yeni' ? secim.kaynakId : null}
                sec={(id) => setSecim({ tip: 'yeni', kaynakId: id, hedefId: null })}
                kuyruk={toplananBos.length > 0
                  ? { metin: `+${toplananBos.length} madde · karşılığı aranmadı`,
                    ac: () => setKuyrukAcik(true) }
                  : null}
                dipNot="Karşılığı olmayan madde eşleşmemiş değil, ÖLÇÜLMEMİŞTİR: satıra tıklayınca denklik formu o maddeyle açılır."
              />
            </div>
          )}
        </section>
      </main>

      {secim && (
        <Cekmece
          kod={secilenEs
            ? `${secilenEs.kaynak.kisaKod} ⇄ ${secilenEs.hedef.kisaKod}`
            : 'Yeni denklik'}
          kapat={() => setSecim(null)}
        >
          {secilenEs ? (
            <DenklikOzeti es={secilenEs} yazabilir={yazabilir}
              kapat={() => setSecim(null)} />
          ) : (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>
                  {yeniKaynak && yeniHedef
                    ? `${yeniKaynak.kisaKod} ⇄ ${yeniHedef.kisaKod}`
                    : 'Yeni denklik'}
                </p>
              </div>
              <div className="cekmece-blok">
                <DenklikFormu kaynak={yeniKaynak} hedef={yeniHedef}
                  maddeler={maddeler} kapat={() => setSecim(null)} />
              </div>
            </>
          )}
        </Cekmece>
      )}
    </>
  );
}

/* ── Hedef çerçeve seçici ──────────────────────────────────────────────
   Kutu yok, kenarlık yok: 9.5px mono açılır liste (02-components §4).
   Dışarı tık ve Esc kapatır — açık kalan menü matrisi örter. */

function HedefSecici({ cerceveler, aktif, sec }: {
  cerceveler: Kodlu[];
  aktif: string;
  sec: (id: string) => void;
}) {
  const kok = useRef<HTMLDetailsElement | null>(null);
  const secim = cerceveler.find((c) => c.id === aktif);

  useEffect(() => {
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
  }, []);

  return (
    <details ref={kok} style={{ position: 'relative' }}>
      <summary className="kapsam-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        Hedef · {secim?.kod ?? '—'} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 200,
        maxHeight: 300, overflowY: 'auto', background: 'var(--card)',
        border: 'var(--bw-strong) solid var(--hr2)', boxShadow: 'var(--sh-tip)',
        padding: 'var(--s8)',
      }}>
        {cerceveler.map((c) => (
          <button key={c.id} type="button" className="filtre"
            style={{ display: 'block', width: '100%', textAlign: 'left' }}
            aria-pressed={aktif === c.id}
            onClick={(e) => {
              sec(c.id);
              e.currentTarget.closest('details')?.removeAttribute('open');
            }}>
            {c.kod}
          </button>
        ))}
      </div>
    </details>
  );
}

/* ── Çekmece özeti ──────────────────────────────────────────────────── */

function DenklikOzeti({ es, yazabilir, kapat }: {
  es: E; yazabilir: boolean; kapat: () => void;
}) {
  return (
    <>
      {/* Denklik SÖZCÜĞÜ ürün genelinde yalnız burada geçer (06 §A2). */}
      <CekmeceKimlik
        durum={DENKLIK_IM[es.denklik] ?? 'unk'}
        soz={denklikSozu(es.denklik)}
        baslik={`${es.kaynak.kisaKod} ⇄ ${es.hedef.kisaKod}`}
        cumle={es.aciklama
          ?? `${es.kaynak.baslik} ile ${es.hedef.baslik} aynı kontrolü karşılıyor.`}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: es.kaynak.regKod, deger: es.kaynak.kisaKod },
        { etiket: es.hedef.regKod, deger: es.hedef.kisaKod },
        {
          etiket: 'Kanıt paylaşımı',
          deger: es.denklik === 'tam' ? 'tek kanıt yeter' : 'ayrı kanıt gerekir',
          durum: es.denklik === 'tam' ? undefined : 'md',
        },
      ]} />

      <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Maddeler</p>
        <div className="cekmece-alan">
          <span className="etiket" style={{ fontFamily: 'var(--mo)' }}>{es.kaynak.kod}</span>
          <span className="deger" style={{ fontWeight: 400 }}>{es.kaynak.baslik}</span>
        </div>
        <div className="cekmece-alan">
          <span className="etiket" style={{ fontFamily: 'var(--mo)' }}>{es.hedef.kod}</span>
          <span className="deger" style={{ fontWeight: 400 }}>{es.hedef.baslik}</span>
        </div>
      </div>

      <CekmeceEylemler
        birincil={
          <Link href="/regulasyonlar">
            <Dugme tur="cekmece">Katalogda aç</Dugme>
          </Link>
        }
        ikincil={yazabilir ? <DenklikKaldir es={es} kapat={kapat} /> : undefined}
        dipNot={es.denklik === 'tam'
          ? 'Tam denklikte bir kanıt her iki maddeyi karşılar.'
          : 'Kısmi ve ilgili denklikte kanıt her çerçevede yeniden değerlendirilir.'}
      />
    </>
  );
}
