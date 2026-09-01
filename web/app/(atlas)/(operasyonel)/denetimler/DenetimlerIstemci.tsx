'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dugme, Kesir, BosIlk, BosFiltre, type Durum } from '@/components/abacus/temel';
import { Tablo, type Kolon, type Satir } from '@/components/abacus/tablo';
import { EkranBasligi, Filtreler } from '@/components/abacus/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/abacus/panel';
import { ZamanCizelgesi, type ZamanKarti } from '@/components/abacus/zaman';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { DENETIM_ASAMALARI, DENETIM_TIP_ETIKET, tarihTR } from '@/lib/sabitler';
import { DenetimFormu } from './Formlar';
import {
  altSatir, asamaEtiketi, asamaIndeksi, capa, denetimImi, donemler, geriMetni,
  kapandiMi, kimlikCumlesi, KISA_ASAMA, konum, planMetni,
  santralMetni, tipEtiketi, ufuk,
  type Asama, type D, type SurecSecenegi,
} from './ortak';

/* O5 · Audit Overview — "hangi denetim takvimini tutmuyor?"
   İki canvas modülü (06 §A1): denetim takvimi (zaman çizelgesi) + öncelik
   tablosu. Durum sözcüğü canvasta geçmez; işaretçi takvimi tutup tutmadığını
   söyler, "Aşama" kolonu yaşam döngüsündeki yeri yazar — ikisi farklı şey.
   Detay modalda değil 420px çekmecede ya da /denetimler/[id] rotasında açılır. */

/** 06 §A3: tabloda 5–9 satır görünür; sabitlenen satırlar bütçenin dışındadır. */
const GORUNUR_BUTCE = 7;

/** Zaman çizelgesinde aynı anda en fazla 3 kart: çekmece açıkken eksen
    ~680px kalır ve 208px'lik dördüncü kart oraya sığmaz (02-components §14). */
const KART_BUTCESI = 3;

const KOLONLAR: Kolon[] = [
  { baslik: 'Aşama', genislik: '112px', siraAnahtari: 'asama' },
  { baslik: 'Kanıt', genislik: '84px', sag: true, siraAnahtari: 'kanit' },
  { baslik: 'Plan', genislik: '132px', siraAnahtari: 'plan' },
  { baslik: 'Santral', genislik: '140px', ikincil: true },
];

const MERCEKLER = [
  { id: 'yuruyen', ad: 'Yürüyen' },
  { id: 'gecikmis', ad: 'Gecikmiş' },
  { id: 'kanit', ad: 'Kanıt bekleyen' },
  { id: 'kapanan', ad: 'Kapanan' },
  { id: 'hepsi', ad: 'Tümü' },
];

type Anahtar = 'konu' | 'asama' | 'kanit' | 'plan';
type SiraYonu = 'artan' | 'azalan';

export default function DenetimlerIstemci({
  denetimler, simdi, yeniKod, yazabilir, surecler,
}: {
  denetimler: D[]; simdi: number; yeniKod: string; yazabilir: boolean;
  surecler: SurecSecenegi[];
}) {
  const [mercek, setMercek] = useState('yuruyen');
  const [asamaF, setAsamaF] = useState<string | null>(null);
  const [tipF, setTipF] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [sira, setSira] = useState<{ anahtar: Anahtar; yon: SiraYonu }>(
    { anahtar: 'plan', yon: 'artan' });
  const [secili, setSecili] = useState<string | null>(null);
  const [yeniAcik, setYeniAcik] = useState(false);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  /* ── türetme: her denetim bir takvim satırına indirgenir ───────────── */
  const kayitlar = useMemo(() => denetimler.map((d) => ({
    d,
    im: denetimImi(d, simdi),
    plan: planMetni(d, simdi),
    capa: capa(d),
  })), [denetimler, simdi]);

  type Kayit = (typeof kayitlar)[number];

  /* ── metrikler · filtrelerden BAĞIMSIZ, programın tamamı ───────────── */
  const yuruyen = kayitlar.filter((k) => !kapandiMi(k.d));
  const takvimiKacan = yuruyen.filter((k) => k.im === 'bd').length;
  const gecikmisKanit = denetimler.reduce((a, d) => a + d.talep.gecikmis, 0);
  const acikKanit = denetimler.reduce((a, d) => a + d.talep.acik, 0);
  const acikBulgu = denetimler.reduce((a, d) => a + d.acikBulgu, 0);
  const kapanan = kayitlar.length - yuruyen.length;
  const takvimsiz = yuruyen.filter((k) => k.im === 'unk').length;

  /* ── mercek + kapsam ───────────────────────────────────────────────── */
  const suzulmus = useMemo(() => kayitlar.filter((k) => {
    if (mercek === 'yuruyen' && kapandiMi(k.d)) return false;
    if (mercek === 'gecikmis' && !(k.im === 'bd' && !kapandiMi(k.d))) return false;
    if (mercek === 'kanit' && k.d.talep.acik === 0) return false;
    if (mercek === 'kapanan' && !kapandiMi(k.d)) return false;
    if (asamaF && k.d.durum !== asamaF) return false;
    if (tipF && k.d.tip !== tipF) return false;
    if (arama) {
      const havuz = `${k.d.kod} ${k.d.ad} ${k.d.denetleyen ?? ''} `
        + `${k.d.tesisler.map((t) => `${t.kod} ${t.ad}`).join(' ')} ${tipEtiketi(k.d.tip)}`;
      if (!havuz.toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    }
    return true;
  }), [kayitlar, mercek, asamaF, tipF, arama]);

  /* Takvimi kaçıran satırlar sıralamadan bağımsız üste sabitlenir (06 §A2)
     ve ASLA kuyruğa inmez; kapanmış ve zamanında ilerleyenler toplanabilir. */
  const bolumler = useMemo(() => {
    const yon = sira.yon === 'artan' ? 1 : -1;
    const karsilastir = (x: Kayit, y: Kayit) => {
      switch (sira.anahtar) {
        case 'asama':
          return (asamaIndeksi(x.d.durum) - asamaIndeksi(y.d.durum)) * yon;
        case 'kanit':
          return (x.d.talep.acik - y.d.talep.acik) * yon;
        case 'plan': {
          const a = x.capa ?? Number.POSITIVE_INFINITY;
          const b = y.capa ?? Number.POSITIVE_INFINITY;
          return (a - b) * yon;
        }
        default:
          return x.d.ad.localeCompare(y.d.ad, 'tr') * yon;
      }
    };
    return {
      sabit: suzulmus.filter((k) => k.im === 'bd' || k.im === 'unk')
        .sort((x, y) => (y.d.talep.gecikmis - x.d.talep.gecikmis) || karsilastir(x, y)),
      kalan: suzulmus.filter((k) => k.im !== 'bd' && k.im !== 'unk').sort(karsilastir),
    };
  }, [suzulmus, sira]);

  const { gorunur, toplanan } = useMemo(() => {
    const { sabit, kalan } = bolumler;
    if (kuyrukAcik) return { gorunur: [...sabit, ...kalan], toplanan: [] as Kayit[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return { gorunur: [...sabit, ...kalan.slice(0, slot)], toplanan: kalan.slice(slot) };
  }, [bolumler, kuyrukAcik]);

  /* ── zaman çizelgesi ───────────────────────────────────────────────────
     Ölçek süzülmüş kümeden değil PROGRAMIN tamamından gelir: mercek
     değiştikçe eksenin gerilmesi takvimi okunmaz yapardı. */
  const eksen = useMemo(() => ufuk(kayitlar.map((k) => k.d), simdi), [kayitlar, simdi]);

  const kartlar: ZamanKarti[] = useMemo(() => {
    const adaylar = [...suzulmus]
      .filter((k) => k.capa !== null)
      .sort((x, y) => (x.capa as number) - (y.capa as number))
      .slice(0, KART_BUTCESI);
    /* Ayırma ve kaç kartın sığdığı artık ZamanCizelgesi'nin işi: eksen
       genişliğini ölçüyor, biz tahmin etmiyoruz. Buradan HAM konum gider. */
    return adaylar.map((k) => ({
      id: k.d.id,
      ad: k.d.ad,
      geri: geriMetni(k.capa, simdi),
      // Kart 208px: kimlik zaten başlıkta, kapsam satırına yalnız yayılım
      // sığar — kod da eklenirse satır kırılır ve kart şeridi taşar.
      kapsam: santralMetni(k.d),
      durum: k.im,
      konum: konum(k.capa, eksen),
    }));
  }, [suzulmus, eksen, simdi]);

  const secilen = kayitlar.find((k) => k.d.id === secili) ?? null;
  const filtreAktif = mercek !== 'yuruyen' || asamaF !== null || tipF !== null
    || arama.trim() !== '';

  const satirlar: Satir[] = gorunur.map((k) => ({
    id: k.d.id,
    durum: k.im,
    kenar: k.im,
    konu: k.d.ad,
    alt: altSatir(k.d),
    hucreler: [
      KISA_ASAMA[k.d.durum as Asama] ?? asamaEtiketi(k.d.durum),
      k.d.talep.toplam > 0
        ? <Kesir key="k" pay={k.d.talep.saglandi} payda={k.d.talep.toplam} />
        : <Bos key="k" />,
      <span key="p" style={k.plan.durum ? { color: `var(--${k.plan.durum})` } : undefined}>
        {k.plan.metin}
      </span>,
      santralMetni(k.d),
    ],
  }));

  const baslik = takvimiKacan > 0
    ? { vurgu: `${takvimiKacan} denetim`, ad: 'takvimini tutmuyor', durum: 'bd' as Durum }
    : yuruyen.length > 0
      ? { vurgu: `${yuruyen.length} denetim`, ad: 'yürüyor', durum: undefined }
      : { vurgu: undefined, ad: 'Yürüyen denetim yok', durum: undefined };

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Denetim programı · ${kayitlar.length} kayıt`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            { deger: gecikmisKanit, yazi: 'Gecikmiş kanıt',
              durum: gecikmisKanit > 0 ? 'bd' : undefined },
            { deger: acikKanit, yazi: 'Açık kanıt' },
            { deger: acikBulgu, yazi: 'Açık bulgu',
              durum: acikBulgu > 0 ? 'md' : undefined },
          ]}
        />

        <section className="ab-ekran-govde">
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Ara deger={arama} degistir={(v) => { setArama(v); setKuyrukAcik(false); }} />
                <Kapsam etiket="Aşama" aktif={asamaF}
                  sec={(id) => { setAsamaF(id); setKuyrukAcik(false); }}
                  secenekler={DENETIM_ASAMALARI.map((a) => ({ id: a, ad: asamaEtiketi(a) }))} />
                <Kapsam etiket="Tip" aktif={tipF}
                  sec={(id) => { setTipF(id); setKuyrukAcik(false); }}
                  secenekler={Object.entries(DENETIM_TIP_ETIKET)
                    .map(([id, ad]) => ({ id, ad }))} />
                {yazabilir && (
                  <button type="button" className="ab-dugme"
                    onClick={() => { setYeniAcik(true); setSecili(null); }}>
                    + Yeni denetim
                  </button>
                )}
              </>
            }
          />

          {kartlar.length > 0 && (
            <div style={{ marginTop: 'var(--s24)' }}>
              <ZamanCizelgesi
                donemler={donemler(eksen, simdi)}
                kartlar={kartlar}
                bugun={konum(simdi, eksen)}
                tikla={(id) => setSecili((o) => (o === id ? null : id))}
              />
            </div>
          )}

          {gorunur.length > 0 || toplanan.length > 0 ? (
            /* Çizelge kartları eksenin şeridini biraz taşabilir; tablo bu
               yüzden şeritten sonra fazladan boşlukla başlar. */
            <div style={{ marginTop: 'var(--s26)' }}>
              <Tablo
                konuBasligi="Denetim"
                kolonlar={KOLONLAR}
                satirlar={satirlar}
                secili={secili}
                sec={(id) => setSecili((o) => (o === id ? null : id))}
                sirala={{
                  anahtar: sira.anahtar,
                  yon: sira.yon,
                  degistir: (a) => setSira((o) => ({
                    anahtar: a as Anahtar,
                    yon: o.anahtar === a && o.yon === 'artan' ? 'azalan' : 'artan',
                  })),
                }}
                kuyruk={toplanan.length > 0
                  ? { metin: `+${toplanan.length} denetim · takvimini tutuyor`,
                    ac: () => setKuyrukAcik(true) }
                  : null}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s16)',
                padding: 'var(--s14) 0 0' }}>
                <p className="ab-dip" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                  {dipNot(gorunur.length, takvimsiz, kapanan, mercek)}
                </p>
                <DisaAktar satirlar={suzulmus.map((k) => [
                  k.d.kod, k.d.ad, tipEtiketi(k.d.tip), k.d.denetleyen ?? '',
                  asamaEtiketi(k.d.durum),
                  k.d.planBaslangic ? tarihTR(k.d.planBaslangic) : '',
                  k.d.planBitis ? tarihTR(k.d.planBitis) : '',
                  k.d.tesisler.map((t) => t.kod).join(', '),
                  k.d.talep.acik, k.d.talep.gecikmis, k.d.acikBulgu,
                ])} />
              </div>
            </div>
          ) : filtreAktif ? (
            <BosFiltre temizle={() => {
              setMercek('yuruyen'); setAsamaF(null); setTipF(null); setArama('');
            }} />
          ) : (
            <BosIlk
              cumle="Denetim programında kayıt yok."
              eylem={yazabilir
                ? <Dugme tur="birincil" onClick={() => setYeniAcik(true)}>Denetim planla</Dugme>
                : undefined}
            />
          )}
        </section>
      </main>

      {secilen && (
        <Cekmece kod={secilen.d.kod} kapat={() => setSecili(null)}>
          <Ozet kayit={secilen} simdi={simdi} />
        </Cekmece>
      )}

      {yeniAcik && !secilen && (
        <Cekmece kod={yeniKod} kapat={() => setYeniAcik(false)}>
          <div className="ab-panel-blok">
            <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Yeni denetim</p>
          </div>
          <div className="ab-panel-blok">
            <DenetimFormu yeniKod={yeniKod} surecler={surecler}
              kapat={() => setYeniAcik(false)} />
          </div>
        </Cekmece>
      )}
    </>
  );
}

function dipNot(gorunur: number, takvimsiz: number, kapanan: number, mercek: string): string {
  const parcalar = [`${gorunur} satır görünüyor`, 'kolon başlığından sıralama'];
  // Bilinmeyen takvim sıfır sayılmaz: kaç denetimin planı hiç girilmediğini söyler.
  if (takvimsiz > 0) parcalar.push(`${takvimsiz} denetimin planı girilmedi`);
  if (kapanan > 0 && mercek === 'yuruyen') parcalar.push(`${kapanan} kapanmış kayıt bu mercekte gizli`);
  return parcalar.join(' · ');
}

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

/* ── Çekmece özeti ──────────────────────────────────────────────────── */

function Ozet({ kayit, simdi }: {
  kayit: { d: D; im: Durum; plan: { metin: string; durum?: Durum } };
  simdi: number;
}) {
  const { d, im, plan } = kayit;

  /* Zincir denetimin bağlandığı iki halkayı anlatır: çerçeve (uyum süreci)
     ve denetimin doğurduğu bulgular. Olmayan halka uydurulmaz. */
  const zincir = [
    ...(d.surec ? [{
      id: `d-${d.surec.id}`, kod: d.surec.regKod,
      alt: `çerçeve · ${d.surec.kod}`,
      yol: `/uyum/${encodeURIComponent(d.surec.regKod)}`,
    }] : []),
    ...(d.toplamBulgu > 0 ? [{
      id: `b-${d.id}`, kod: `${d.acikBulgu}/${d.toplamBulgu} bulgu`,
      alt: 'denetim kaynaklı', yol: '/bulgular', suren: d.acikBulgu > 0,
    }] : []),
  ];

  return (
    <>
      <CekmeceKimlik durum={im} soz={asamaEtiketi(d.durum)} baslik={d.ad}
        cumle={kimlikCumlesi(d, simdi)} />

      <CekmeceAlanlar alanlar={[
        {
          etiket: 'Kanıt talebi',
          deger: d.talep.toplam > 0 ? `${d.talep.saglandi} / ${d.talep.toplam}` : 'yok',
          durum: d.talep.gecikmis > 0 ? 'bd' : d.talep.acik > 0 ? 'md' : undefined,
        },
        { etiket: 'Plan', deger: plan.metin, durum: plan.durum },
        {
          etiket: 'Kapsam',
          deger: `${santralMetni(d)}${d.maddeSayisi > 0 ? ` · ${d.maddeSayisi} madde` : ''}`,
        },
        { etiket: 'Denetleyen', deger: d.denetleyen ?? tipEtiketi(d.tip) },
      ]} />

      {zincir.length > 0 ? (
        <CekmeceBagli kayitlar={zincir} />
      ) : (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Zincir</p>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Çerçeve bağı ve bulgu yok — denetimin uyum kütüğüne dokunuşu kayıtlı değil.
          </p>
        </div>
      )}

      <CekmeceEylemler
        birincil={
          <Link href={`/denetimler/${d.id}`}>
            <Dugme tur="tam">Kaydı aç</Dugme>
          </Link>
        }
        dipNot={`${tipEtiketi(d.tip)} · aşama ${asamaIndeksi(d.durum) + 1}/${DENETIM_ASAMALARI.length}`
          + (d.planBitis ? ` · plan bitişi ${tarihTR(d.planBitis)}` : '')}
      />
    </>
  );
}

/* ── Kapsam kontrolleri ─────────────────────────────────────────────────
   Kutu yok, kenarlık yok: arama tek satır alt çizgili girdi, aşama ve tip
   9.5px mono açılır liste (02-components §4). */

function Ara({ deger, degistir }: { deger: string; degistir: (v: string) => void }) {
  return (
    <input
      className="ab-gr"
      aria-label="Denetim, denetleyen ya da santral ara"
      placeholder="Ara"
      value={deger}
      onChange={(e) => degistir(e.target.value)}
      style={{
        width: 118, background: 'none', border: 0,
        borderBottom: 'var(--bw-hair) solid var(--hr2)',
        padding: '3px 0', fontFamily: 'var(--veri)', fontSize: 'var(--t-label)',
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
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 190,
        maxHeight: 300, overflowY: 'auto', background: 'var(--panel)',
        border: 'var(--bw-strong) solid var(--hr2)', boxShadow: 'none',
        padding: 'var(--s8)',
      }}>
        {[{ id: '', ad: 'Tümü' }, ...secenekler].map((s) => (
          <button key={s.id} type="button" className="ab-filtre"
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
function DisaAktar({ satirlar }: { satirlar: (string | number)[][] }) {
  const kok = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => disariKapat(kok), []);

  const kapatVe = (e: React.MouseEvent, is: () => void) => {
    e.currentTarget.closest('details')?.removeAttribute('open');
    is();
  };

  return (
    <details ref={kok} className="ab-baskida-gizle" style={{ position: 'relative' }}>
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        ⤓ Dışa aktar <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', bottom: '100%', right: 0, zIndex: 5, minWidth: 150,
        background: 'var(--panel)', border: 'var(--bw-strong) solid var(--hr2)',
        boxShadow: 'none', padding: 'var(--s8)',
      }}>
        <button type="button" className="ab-filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, () => exceleAktar('denetimler', [{
            ad: 'Denetimler',
            satirlar: [
              ['Kod', 'Ad', 'Tip', 'Denetleyen', 'Aşama', 'Plan başlangıç', 'Plan bitiş',
                'Santraller', 'Açık kanıt', 'Gecikmiş kanıt', 'Açık bulgu'],
              ...satirlar,
            ],
          }]))}>
          Excel
        </button>
        <button type="button" className="ab-filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, pdfYazdir)}>
          PDF
        </button>
      </div>
    </details>
  );
}
