'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BosFiltre, BosIlk, Dugme, type Durum } from '@/components/atlas/temel';
import { EkranBasligi, Filtreler, KipDegistir } from '@/components/atlas/ekran';
import { Tablo, type Kolon, type Satir } from '@/components/atlas/tablo';
import { Tuval } from '@/components/atlas/grafik';
import {
  Cekmece, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler, CekmeceKimlik,
} from '@/components/atlas/cekmece';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { VARLIK_SINIF_ETIKET, etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import { IliskiEditoru, VarlikFormu, YasamFormu } from './Formlar';
import {
  ILISKI_CUMLE, KRITIKLIKLER, MERCEKLER, MERCEK_TASMA, YASAM_ETIKET,
  ayYil, bilinmeyenAlanlar, bolumle, grafigiKur, karariBloklayanBilinmeyen,
  korumaAcigi, kullanimda, kuyrukMetni, metrikleriHesapla, olgu, omurGunu,
  sirala, suz, varlikDurumu, varsayilanTesis,
  type Bolge, type Kisi, type Kodlu, type Mercek, type Tur, type Unite, type V,
} from './mantik';

/* O10 · Asset Intelligence — "hangi varlık zinciri kırıyor?"
   İki kip tek canvasta değil, YAN YANA DEĞİL, sırayla durur (ModeSwitch):
   ilişki grafiği ve tablo. Detay ikisinin de yanında değil, 420px
   çekmecede açılır — yoğunluk borcu (§6) tam burada kapanır.

   Durum sözcüğü canvasta geçmez: satır işaretçisi şiddeti, alt satır
   OLGUYU taşır ("yamasız", "yedek yok", "EOS girilmedi"). */

const KOLONLAR: Kolon[] = [
  { baslik: 'Santral', genislik: '150px', ikincil: true },
  { baslik: 'Ağ bölgesi', genislik: 'minmax(120px, 168px)' },
  { baslik: 'Sahip', genislik: '124px', ikincil: true },
  { baslik: 'Ömür', genislik: '96px', sag: true },
];

type Kip = 'tablo' | 'iliski';
type CekmeceKipi = 'ozet' | 'form' | 'iliski' | 'yasam';

export default function EnvanterIstemci({
  varliklar, turler, tesisler, uniteler, sistemler, bolgeler, kullanicilar,
  yazabilir, simdi,
}: {
  varliklar: V[]; turler: Tur[]; tesisler: Kodlu[]; uniteler: Unite[];
  sistemler: Kodlu[]; bolgeler: Bolge[]; kullanicilar: Kisi[];
  yazabilir: boolean; simdi: number;
}) {
  const [kip, setKip] = useState<Kip>('tablo');
  const [mercek, setMercek] = useState<Mercek>('sinyal');
  const [tesisF, setTesisF] = useState<string | null>(null);
  const [turF, setTurF] = useState<string | null>(null);
  const [kritiklikF, setKritiklikF] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [cekmeceKipi, setCekmeceKipi] = useState<CekmeceKipi>('ozet');
  const [yeniAcik, setYeniAcik] = useState(false);
  const [odak, setOdak] = useState<string | null>(null);

  const m = useMemo(() => metrikleriHesapla(varliklar, simdi), [varliklar, simdi]);

  const suzulmus = useMemo(
    () => suz(varliklar, {
      mercek, tesisId: tesisF, turKapsami: turF, kritiklik: kritiklikF, arama,
    }, simdi),
    [varliklar, mercek, tesisF, turF, kritiklikF, arama, simdi],
  );
  const sirali = useMemo(() => sirala(suzulmus, simdi), [suzulmus, simdi]);
  const { gorunur, toplanan } = useMemo(
    () => bolumle(sirali, simdi, kuyrukAcik), [sirali, simdi, kuyrukAcik],
  );

  /* Grafik kapsamı ZORUNLUDUR: santral seçilmemişse süzülmüş kümede en çok
     varlığı olan santral kullanılır ve dip not hangi kapsamın çizildiğini
     yazar. Kapsam dışındaki hiçbir düğüm çizilmez. */
  const grafikTesisi = useMemo(() => {
    if (tesisF) return tesisler.find((t) => t.id === tesisF) ?? null;
    return varsayilanTesis(suzulmus, tesisler);
  }, [tesisF, tesisler, suzulmus]);

  const grafik = useMemo(
    () => (grafikTesisi
      ? grafigiKur({
        // Bölge sayaçları santralin TAMAMINDAN, çizilen düğümler mercekten.
        varliklar: varliklar.filter(kullanimda),
        adaylar: suzulmus,
        bolgeler,
        tesis: grafikTesisi,
        simdi,
      })
      : null),
    [varliklar, suzulmus, bolgeler, grafikTesisi, simdi],
  );

  const secili = varliklar.find((v) => v.id === seciliId) ?? null;
  const filtreAktif = mercek !== 'sinyal' || tesisF !== null || turF !== null
    || kritiklikF !== null || arama.trim() !== '';

  function filtreleriTemizle() {
    setMercek('sinyal'); setTesisF(null); setTurF(null);
    setKritiklikF(null); setArama('');
  }

  function sec(id: string | null) {
    setSeciliId(id);
    setCekmeceKipi('ozet');
    setYeniAcik(false);
  }

  function tuvaldenSec(dugumId: string) {
    setOdak((o) => (o === dugumId ? null : dugumId));
    if (dugumId.startsWith('v-')) sec(dugumId.slice(2));
  }

  const baslik = m.desteksiz > 0
    ? { vurgu: `${m.desteksiz} varlık`, ad: 'desteksiz çalışıyor', durum: 'bd' as Durum }
    : m.korumaAcikli > 0
      ? { vurgu: `${m.korumaAcikli} varlık`, ad: 'koruma açığı taşıyor', durum: 'md' as Durum }
      : m.bilinmeyen > 0
        ? { vurgu: `${m.bilinmeyen} varlık`, ad: 'ömrü ya da kritikliği girilmemiş',
          durum: 'unk' as Durum }
        : { vurgu: String(m.kullanimdaki), ad: 'varlık kayıtlı', durum: undefined };

  return (
    <>
      <main style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Varlık zekâsı · ${m.kullanimdaki} varlık · ${tesisler.length} santral`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            { deger: m.desteksiz, yazi: 'Desteksiz', durum: m.desteksiz > 0 ? 'bd' : undefined },
            { deger: m.korumaAcikli, yazi: 'Koruma açığı',
              durum: m.korumaAcikli > 0 ? 'md' : undefined },
            // Ölçülmemiş alan sıfır sayılmaz: kendi metriğinde, kendi renginde.
            { deger: m.bilinmeyen, yazi: 'Ömür/kritiklik yok',
              durum: m.bilinmeyen > 0 ? 'unk' : undefined },
            { deger: m.ot, yazi: 'OT ve köprü' },
          ]}
        />

        <section className="ekran-govde">
          <Filtreler
            secenekler={MERCEKLER}
            tasma={MERCEK_TASMA}
            aktif={mercek}
            sec={(id) => { setMercek(id as Mercek); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Ara deger={arama} degistir={(v) => { setArama(v); setKuyrukAcik(false); }} />
                <Kapsam etiket="Santral" aktif={tesisF}
                  sec={(id) => { setTesisF(id); setKuyrukAcik(false); setOdak(null); }}
                  secenekler={tesisler.map((t) => ({ id: t.id, ad: t.ad }))} />
                {/* Sınıf ve tür TEK kontrolde: ikisi de "bu ne tür bir
                    varlık" sorusunu yanıtlar, iki ayrı açılır liste
                    filtre bütçesini boşa harcardı. */}
                <Kapsam etiket="Tür" aktif={turF}
                  sec={(id) => { setTurF(id); setKuyrukAcik(false); }}
                  secenekler={[
                    ...Object.entries(VARLIK_SINIF_ETIKET)
                      .map(([kod, ad]) => ({ id: `s:${kod}`, ad })),
                    ...turler.map((t) => ({ id: `t:${t.id}`, ad: t.ad })),
                  ]} />
                <Kapsam etiket="Kritiklik" aktif={kritiklikF}
                  sec={(id) => { setKritiklikF(id); setKuyrukAcik(false); }}
                  secenekler={KRITIKLIKLER.map((k) => ({ id: k, ad: etiketle(k) }))} />
                {yazabilir && (
                  <button type="button" className="kapsam-dugme"
                    onClick={() => { setYeniAcik(true); setSeciliId(null); }}>
                    + Yeni varlık
                  </button>
                )}
              </>
            }
          />

          <div style={{ marginTop: 'var(--s22)' }}>
            <KipDegistir
              secenekler={[{ id: 'tablo', ad: 'Tablo' }, { id: 'iliski', ad: 'İlişki' }]}
              aktif={kip}
              sec={(id) => setKip(id as Kip)}
            />
          </div>

          {suzulmus.length === 0 ? (
            <div style={{ marginTop: 'var(--s22)' }}>
              {filtreAktif ? (
                <BosFiltre temizle={filtreleriTemizle} />
              ) : (
                <BosIlk
                  cumle={varliklar.length === 0
                    ? 'Kapsamınızda varlık kaydı yok.'
                    : 'Sinyal merceğinde varlık yok — bilinen açık ve geçmiş ömür yok.'}
                  eylem={varliklar.length === 0 && yazabilir
                    ? <Dugme tur="birincil" onClick={() => setYeniAcik(true)}>Varlık oluştur</Dugme>
                    : <Dugme onClick={() => setMercek('hepsi')}>Tüm varlıklar</Dugme>} />
              )}
            </div>
          ) : kip === 'tablo' ? (
            <div style={{ marginTop: 'var(--s22)' }}>
              <Tablo
                konuBasligi="Varlık"
                kolonlar={KOLONLAR}
                satirlar={gorunur.map((v) => satirYap(v, simdi))}
                secili={seciliId}
                sec={(id) => sec(id === seciliId ? null : id)}
                kuyruk={toplanan.length > 0
                  ? { metin: kuyrukMetni(toplanan, simdi), ac: () => setKuyrukAcik(true) }
                  : null}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s16)',
                padding: 'var(--s14) 0 0' }}>
                <p className="dip-not" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                  {dipNot(gorunur.length, suzulmus.length, m.bilinmeyen, m.emekli, mercek)}
                </p>
                <DisaAktar varliklar={sirali} simdi={simdi} />
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 'var(--s22)' }}>
              {grafik && grafikTesisi ? (
                <>
                  <Tuval
                    odak={odak}
                    odakla={tuvaldenSec}
                    dugumler={grafik.dugumler}
                    kenarlar={grafik.kenarlar}
                    dipNot={[
                      grafikTesisi.kod,
                      `${grafik.kapsamdaki} varlık`,
                      grafik.aday !== grafik.kapsamdaki ? `${grafik.aday} mercekte` : null,
                      `${grafik.cizilen} düğüm`,
                    ].filter(Boolean).join(' · ')}
                  />
                  <p className="dip-not">
                    Kapsam santralle sınırlı · düğüme tıklayınca çekmece açılır
                  </p>
                </>
              ) : (
                <BosIlk cumle="Grafik bir santral kapsamı ister; seçili kapsamda santral yok." />
              )}
            </div>
          )}
        </section>
      </main>

      {secili && (
        <Cekmece kod={secili.etiket} kapat={() => sec(null)}>
          {cekmeceKipi === 'ozet' && (
            <Ozet
              v={secili}
              simdi={simdi}
              duzenle={() => setCekmeceKipi('form')}
              iliskiler={() => setCekmeceKipi('iliski')}
              yasam={() => setCekmeceKipi('yasam')}
            />
          )}
          {cekmeceKipi === 'form' && (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Kaydı düzenle</p>
              </div>
              <div className="cekmece-blok">
                <VarlikFormu varlik={secili} turler={turler} tesisler={tesisler}
                  uniteler={uniteler} sistemler={sistemler} bolgeler={bolgeler}
                  kullanicilar={kullanicilar} kapat={() => setCekmeceKipi('ozet')} />
              </div>
            </>
          )}
          {cekmeceKipi === 'iliski' && (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>İlişkiler</p>
              </div>
              <div className="cekmece-blok">
                <IliskiEditoru varlik={secili} varliklar={varliklar}
                  sec={(id) => sec(id)} kapat={() => setCekmeceKipi('ozet')} />
              </div>
            </>
          )}
          {cekmeceKipi === 'yasam' && (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Yaşam döngüsü</p>
              </div>
              <div className="cekmece-blok">
                <YasamFormu varlik={secili} kapat={() => setCekmeceKipi('ozet')} />
              </div>
            </>
          )}
        </Cekmece>
      )}

      {yeniAcik && !secili && (
        <Cekmece kod="yeni varlık" kapat={() => setYeniAcik(false)}>
          <div className="cekmece-blok">
            <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Yeni varlık</p>
          </div>
          <div className="cekmece-blok">
            <VarlikFormu varlik={null} turler={turler} tesisler={tesisler}
              uniteler={uniteler} sistemler={sistemler} bolgeler={bolgeler}
              kullanicilar={kullanicilar} kapat={() => setYeniAcik(false)} />
          </div>
        </Cekmece>
      )}
    </>
  );
}

/* ── Satır ──────────────────────────────────────────────────────────── */

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

function satirYap(v: V, simdi: number): Satir {
  const d = varlikDurumu(v, simdi);
  const o = olgu(v, simdi);
  return {
    id: v.id,
    durum: d,
    kenar: d,
    konu: v.ad,
    alt: `${v.etiket} · ${v.tur.ad}${o ? ` · ${o}` : ''}`,
    hucreler: [
      v.tesis?.ad ?? <Bos key="t" />,
      v.bolge
        ? <span key="b" style={{ fontFamily: 'var(--mo)', fontSize: 'var(--t-code)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block' }}>{v.bolge.kod}</span>
        : <Bos key="b" />,
      v.sahip?.ad ?? <Bos key="s" />,
      <OmurHucresi key="o" v={v} simdi={simdi} />,
    ],
  };
}

/** Ömür hücresi tarihi taşır; "destek bitti" gibi durum sözcüğü YAZILMAZ. */
function OmurHucresi({ v, simdi }: { v: V; simdi: number }) {
  const gun = omurGunu(v, simdi);
  if (gun === null || !v.eosTarihi) return <Bos />;
  const renk = gun < 0 ? 'var(--bd)' : gun < 365 ? 'var(--md)' : undefined;
  return (
    <span style={{ color: renk, fontWeight: renk ? 600 : undefined,
      fontVariantNumeric: 'tabular-nums' }}>
      {ayYil(v.eosTarihi)}
    </span>
  );
}

function dipNot(
  gorunur: number, kapsam: number, bilinmeyen: number, emekli: number, mercek: Mercek,
): string {
  const parcalar = [`${gorunur} satır görünüyor`, `${kapsam} varlık mercekte`];
  if (bilinmeyen > 0) parcalar.push(`${bilinmeyen} varlıkta ömür/kritiklik girilmedi`);
  if (emekli > 0 && mercek !== 'emekli') {
    parcalar.push(`${emekli} emekli kayıt bu mercekte gizli`);
  }
  return parcalar.join(' · ');
}

/* ── Kapsam kontrolleri ─────────────────────────────────────────────── */

function Ara({ deger, degistir }: { deger: string; degistir: (v: string) => void }) {
  return (
    <input
      className="gr"
      aria-label="Varlık, hostname, IP ya da santral ara"
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

function Kapsam({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  const secim = secenekler.find((s) => s.id === aktif);
  const kok = useRef<HTMLDetailsElement | null>(null);

  // Açık kalan bir kapsam listesi altındaki tabloyu örter: dışarı tık ve Esc kapatır.
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
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 210,
        maxHeight: 320, overflowY: 'auto', background: 'var(--card)',
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
function DisaAktar({ varliklar, simdi }: { varliklar: V[]; simdi: number }) {
  const kok = useRef<HTMLDetailsElement | null>(null);
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

  const kapatVe = (e: React.MouseEvent, is: () => void) => {
    e.currentTarget.closest('details')?.removeAttribute('open');
    is();
  };

  const satirlar = varliklar.map((v) => [
    v.etiket, v.ad, v.tur.ad, etiketle(v.tur.sinif),
    v.tesis?.kod ?? '', v.bolge?.kod ?? '', v.sistem?.kod ?? '',
    etiketle(v.kritiklik), v.isletimSistemi ?? '',
    v.eosTarihi ? tarihTR(v.eosTarihi) : '',
    etiketle(v.yamaDurumu), etiketle(v.edrDurumu), etiketle(v.yedekDurumu),
    etiketle(v.izlemeDurumu), etiketle(v.logKaynagi), etiketle(v.internetMaruziyeti),
    YASAM_ETIKET[v.yasamDongusu] ?? etiketle(v.yasamDongusu),
    v.sahip?.ad ?? '', korumaAcigi(v).join(', '), bilinmeyenAlanlar(v).join(', '),
    varlikDurumu(v, simdi),
  ]);

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
          onClick={(e) => kapatVe(e, () => exceleAktar('envanter', [{
            ad: 'Envanter',
            satirlar: [
              ['Etiket', 'Ad', 'Tür', 'Sınıf', 'Santral', 'Ağ bölgesi', 'Sistem',
                'Kritiklik', 'İşletim sistemi', 'EOS', 'Yama', 'EDR', 'Yedek',
                'İzleme', 'Log', 'İnternet maruziyeti', 'Yaşam döngüsü', 'Sahip',
                'Koruma açığı', 'Bilinmeyen alanlar', 'İşaret'],
              ...satirlar,
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

/* ── O11 · Çekmece özeti ────────────────────────────────────────────────
   Durum sözcüğünün geçtiği TEK yer kimlik bloğudur (06 §A2). */

function durumSozu(v: V, simdi: number): string {
  const gun = omurGunu(v, simdi);
  if (gun !== null && gun < 0) return 'Desteksiz';
  if (v.yamaDurumu === 'yamasiz') return 'Yamasız';
  if (gun !== null && gun < 365) return 'Ömür sonu yakın';
  if (korumaAcigi(v).length > 0) return 'Koruma açığı';
  if (karariBloklayanBilinmeyen(v)) return 'Ömür/kritiklik girilmedi';
  return 'Kaydı tam';
}

function kimlikCumlesi(v: V, simdi: number): string {
  const gun = omurGunu(v, simdi);
  if (gun !== null && gun < 0 && v.eosTarihi) {
    return `Üretici desteği ${tarihTR(v.eosTarihi)} tarihinde bitti; `
      + `${Math.abs(gun)} gündür desteksiz çalışıyor.`;
  }
  const acik = korumaAcigi(v);
  if (acik.length > 0) return `Bilinen açık: ${acik.join(', ')}.`;
  if (gun !== null && gun < 365 && v.eosTarihi) {
    return `Üretici desteği ${tarihTR(v.eosTarihi)} tarihinde bitiyor · ${gun} gün kaldı.`;
  }
  const bilinmeyen = bilinmeyenAlanlar(v);
  if (bilinmeyen.length > 0) return `Girilmemiş alan: ${bilinmeyen.join(', ')}.`;
  return `${v.tur.ad} · ${etiketle(v.tur.sinif)}.`;
}

function korumaMetni(v: V): string {
  const parcalar = korumaAcigi(v);
  if (v.acikZafiyet > 0) parcalar.push(`${v.acikZafiyet} açık zafiyet`);
  if (parcalar.length > 0) return parcalar.join(' · ');
  // Ölçülmemiş kontrol "açık yok" DEĞİLDİR; sayısı ayrı söylenir.
  const olculmemis = bilinmeyenAlanlar(v)
    .filter((a) => a !== 'kritiklik' && a !== 'EOS tarihi');
  if (olculmemis.length > 0) return `${olculmemis.length} alan ölçülmedi`;
  return 'bilinen açık yok';
}

function Ozet({ v, simdi, duzenle, iliskiler, yasam }: {
  v: V; simdi: number; duzenle: () => void; iliskiler: () => void; yasam: () => void;
}) {
  const d = varlikDurumu(v, simdi);
  const gun = omurGunu(v, simdi);
  const bilinmeyen = bilinmeyenAlanlar(v);

  const konum = [v.tesis?.ad, v.unite?.kod, v.bolge?.kod].filter(Boolean).join(' · ') || '—';

  /* Kimlik alanları: yalnız DOLU olanlar listelenir, boş olanların sayısı
     dip nota iner — 20 tane "—" satırı çekmeceyi okunmaz yapardı. */
  const kimlik: [string, string | null][] = [
    ['Hostname', v.hostname], ['IP', v.ipAdresi], ['MAC', v.macAdresi],
    ['İşletim sistemi', v.isletimSistemi], ['Firmware', v.firmware],
    ['Sürüm', v.surum], ['Üretici', v.uretici], ['Model', v.model],
    ['Seri no', v.seriNo], ['Raf / oda', v.rafOda],
    ['Kimlik doğrulama', v.kimlikDogrulama],
  ];
  const dolu = kimlik.filter((x): x is [string, string] => !!x[1]);

  const zincir: { id: string; kod: string; alt: string; yol: string; suren?: boolean }[] = [
    ...v.riskler.slice(0, 2).map((r) => ({
      id: `r-${r.id}`, kod: r.kod, alt: r.baslik, yol: '/riskler',
    })),
    ...(v.eosTarihi && gun !== null && gun < 365
      ? [{ id: 'omur', kod: 'Ömür kuyruğu', alt: `EOS ${ayYil(v.eosTarihi)}`, yol: '/omur' }]
      : []),
    ...(v.sonYedek
      ? [{ id: 'yedek', kod: 'Konfigürasyon yedeği',
        alt: zamanTR(v.sonYedek.zaman), yol: '/yedekleme' }]
      : []),
    ...(v.sonKesif
      ? [{ id: 'kesif', kod: 'Keşif kaydı',
        alt: `${v.sonKesif.kaynak} · ${tarihTR(v.sonKesif.sonGorulme)}`, yol: '/kesif' }]
      : []),
  ];

  const ilkIliski = v.iliskiler[0];
  const iliskiMetni = ilkIliski
    ? `${v.iliskiler.length} bağ · ${ILISKI_CUMLE[ilkIliski.tip] ?? etiketle(ilkIliski.tip)} `
      + `${ilkIliski.diger.etiket}`
    : 'bağ tanımlı değil';

  return (
    <>
      <CekmeceKimlik durum={d} soz={durumSozu(v, simdi)} baslik={v.ad}
        cumle={kimlikCumlesi(v, simdi)} />

      <CekmeceAlanlar alanlar={[
        {
          etiket: 'Kritiklik',
          deger: etiketle(v.kritiklik),
          durum: v.kritiklik === 'bilinmiyor' ? 'unk' : undefined,
        },
        {
          etiket: 'Ömür sonu (EOS)',
          deger: v.eosTarihi ? tarihTR(v.eosTarihi) : 'girilmedi',
          durum: gun === null ? 'unk' : gun < 0 ? 'bd' : gun < 365 ? 'md' : undefined,
        },
        { etiket: 'Konum', deger: konum },
        {
          etiket: 'Koruma',
          deger: korumaMetni(v),
          durum: korumaAcigi(v).length > 0 ? 'md' : undefined,
        },
        {
          etiket: 'Sahip',
          deger: v.sahip?.ad ?? 'atanmadı',
          durum: v.sahip ? undefined : 'md',
        },
        { etiket: 'İlişki', deger: iliskiMetni },
      ]} />

      {dolu.length > 0 && (
        <CekmeceAlanlar alanlar={dolu.slice(0, 6).map(([etiket, deger]) => ({ etiket, deger }))} />
      )}

      {zincir.length > 0 && <CekmeceBagli baslik="Zincir" kayitlar={zincir} />}

      <CekmeceEylemler
        birincil={
          <Dugme tur="cekmece" onClick={duzenle} disabled={!v.yazilabilir}>
            Kaydı düzenle
          </Dugme>
        }
        ikincil={
          <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
            <Dugme onClick={iliskiler}>İlişkiler</Dugme>
            <Dugme onClick={yasam} disabled={!v.yazilabilir && !v.onaylanabilir}>
              Yaşam döngüsü
            </Dugme>
          </div>
        }
        dipNot={[
          `${YASAM_ETIKET[v.yasamDongusu] ?? etiketle(v.yasamDongusu)} · `
            + `son güncelleme ${tarihTR(v.guncellendi)}`,
          v.tedarikci ? `tedarikçi ${v.tedarikci.ad}` : null,
          bilinmeyen.length > 0 ? `${bilinmeyen.length} alan bilinmiyor` : null,
          dolu.length > 6 ? `${dolu.length - 6} kimlik alanı daha kayıtta` : null,
          !kullanimda(v) ? 'kayıt silinmedi, yaşam döngüsü kapandı' : null,
        ].filter(Boolean).join(' · ')}
      />
    </>
  );
}
