'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos, useUrlSira } from '@/components/kabuk/urlDurumu';
import Link from 'next/link';
import { Im, Ipucu, Dugme, BosIlk, BosFiltre, type Durum } from '@/components/kabuk/temel';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi, Filtreler } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { csvAktar, damgaliAd, exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { an } from '@/lib/an';
import {
  ONEM_DERECELERI, ONEM_ETIKET, AKSIYON_ETIKET, BULGU_DURUM_ETIKET,
  etiketle, eylemCumlesi, tarihTR, zamanTR, type Onem,
} from '@/lib/sabitler';
import {
  acikMi, aksiyonAcikMi, aksiyonImi, bulguImi, dogrulamaBekliyorMu,
  dogrulamaHucresi, gecikmeGunu, kalanGun, kisaTarih, surukleyenAksiyon,
  type AksiyonOzeti, type DogrulamaHucresi as DogrulamaVerisi,
} from './mantik';

export type IzKaydi = {
  id: string; aktor: string; eylem: string; varlikTipi: string;
  alan: string | null; once: string | null; sonra: string | null;
  dosya: string | null; zaman: string;
};

export type Bulgu = {
  id: string; baslik: string; aciklama: string; durum: string; onem: string;
  kaynak: string | null; tespit: string; hedef: string | null; kapanma: string | null;
  retestGerekli: boolean; retestSonucu: string | null;
  kapanisDogrulama: string | null; kapanisDogrulayan: string | null;
  sorumlu: string | null;
  maddeKod: string; maddeBaslik: string;
  tesisId: string; tesisKod: string; tesisAd: string;
  surecId: string; surecKod: string; regKod: string;
  aksiyonlar: AksiyonOzeti[];
  iz: IzKaydi[];
};

/* Kolonlar soldan sağa ilerlemeyi anlatır: bulgu · aksiyon · sahip · son
   tarih · doğrulama. Başlıklar 8.5px mono (`t-colhead`) ve sıralanabilir. */
type Anahtar = 'konu' | 'aksiyon' | 'sahip' | 'termin' | 'dogrulama';

const KOLONLAR: Kolon[] = [
  { baslik: 'Aksiyon', siraAnahtari: 'aksiyon', genislik: 'minmax(150px, 0.82fr)' },
  { baslik: 'Sahip', siraAnahtari: 'sahip', genislik: '126px', ikincil: true },
  { baslik: 'Son tarih', siraAnahtari: 'termin', genislik: '140px' },
  { baslik: 'Doğrulama', siraAnahtari: 'dogrulama', genislik: '132px' },
];

/** 06 §A3: tabloda 5–9 satır. Sürükleyici olmayanlar kuyruğa iner. */
const GORUNUR_BUTCE = 8;
/** Termini bu kadar gün içinde olan kayıt "bu hafta" sayılır ve toplanmaz. */
const BU_HAFTA = 7;

const MERCEKLER = [
  { id: 'acik', ad: 'Açık' },
  { id: 'gecikmis', ad: 'Gecikmiş' },
  { id: 'dogrulama', ad: 'Doğrulama bekleyen' },
  { id: 'aksiyonsuz', ad: 'Aksiyonsuz' },
  { id: 'hepsi', ad: 'Tümü' },
];


export default function BulgularIstemci({
  bulgular, toplam, metrikler, kapsamli = false,
}: {
  bulgular: Bulgu[];
  /** kütüğün GERÇEK büyüklüğü — sunucu tavanı satırları kestiyse fark açılır */
  toplam: number;
  /** kesilmemiş kütük üzerinde sayılmış metrikler (bkz. veri.ts → sayimGecisi) */
  metrikler: {
    acik: number; gecikmis: number; dogrulama: number;
    zamaninda: number; aksiyonsuz: number; kapali: number;
  };
  /** liste bir santral kapsamıyla daraltıldı mı — boş ekranın SÖZÜ değişir */
  kapsamli?: boolean;
}) {
  const [mercek, setMercek] = useUrlDurumu<string>('mercek', 'acik');
  const [onemF, setOnemF] = useUrlDurumuBos('onem');
  const [arama, setArama] = useState('');
  const [sira, setSira] = useUrlSira<Anahtar>({ anahtar: 'termin', yon: 'artan' });
  const [secili, setSecili] = useUrlDurumuBos('sec');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  /* ── türetme: her bulgu bir ilerleme satırına indirgenir ───────────── */
  const satirVerisi = useMemo(() => bulgular.map((b) => {
    const gecikme = gecikmeGunu(b);
    const kalan = kalanGun(b);
    const aksiyon = surukleyenAksiyon(b);
    return {
      b,
      im: bulguImi(b),
      gecikme,
      kalan,
      aksiyon,
      dogrulama: dogrulamaHucresi(b),
      sahip: aksiyon?.sorumlu ?? b.sorumlu ?? null,
      biten: b.aksiyonlar.filter((a) => a.durum === 'tamamlandi').length,
      // Sürükleyici satır asla toplanmaz: gecikmiş · aksiyonsuz · termini bu hafta.
      surukleyici: gecikme !== null || b.aksiyonlar.length === 0
        || (kalan !== null && kalan <= BU_HAFTA),
    };
  }), [bulgular]);

  type SatirVerisi = (typeof satirVerisi)[number];

  /* ── Metrikler: KESİLMEMİŞ kütükten, sunucudan gelir ─────────────────
     Bu altı sayı eskiden elde duran satırlardan hesaplanıyordu; sunucu
     satırları bir tavanla kestiği anda hepsi sessizce küçülürdü. Artık
     sunucudaki hafif sayım geçişi ölçüyor (veri.ts → sayimGecisi):
     satır için `take`, sayım için ayrı bir tam geçiş. */
  const {
    acik: acikSayisi, gecikmis: gecikmisSayisi, dogrulama: dogrulamaSayisi,
    zamaninda: zamanindaSayisi, aksiyonsuz: aksiyonsuzSayisi, kapali: kapaliSayisi,
  } = metrikler;
  /** Sunucu tavanı kütüğü kesti mi — kesme SESSİZ kalmaz. */
  const kesildi = toplam > bulgular.length;

  /* ── mercek + kapsam ───────────────────────────────────────────────── */
  const suzulmus = useMemo(() => satirVerisi.filter((s) => {
    if (mercek === 'acik' && !acikMi(s.b.durum)) return false;
    if (mercek === 'gecikmis' && s.gecikme === null) return false;
    if (mercek === 'dogrulama' && !dogrulamaBekliyorMu(s.b)) return false;
    if (mercek === 'aksiyonsuz' && (s.b.aksiyonlar.length > 0 || !acikMi(s.b.durum))) return false;
    if (onemF && s.b.onem !== onemF) return false;
    if (arama) {
      const havuz = `${s.b.baslik} ${s.b.maddeKod} ${s.b.tesisKod} ${s.b.tesisAd} `
        + `${s.aksiyon?.baslik ?? ''} ${s.sahip ?? ''}`;
      if (!havuz.toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    }
    return true;
  }), [satirVerisi, mercek, onemF, arama]);

  /* ── sıralama · gecikmiş satırlar sıralamadan bağımsız üste sabit ──── */
  const bolumler = useMemo(() => {
    const yon = sira.yon === 'artan' ? 1 : -1;
    const metin = (s: SatirVerisi) => {
      switch (sira.anahtar) {
        case 'konu': return s.b.baslik;
        case 'aksiyon': return s.aksiyon?.baslik ?? '￿';
        case 'sahip': return s.sahip ?? '￿';
        default: return '';
      }
    };
    const sayi = (s: SatirVerisi) => {
      if (sira.anahtar === 'termin') {
        return s.b.hedef ? new Date(s.b.hedef).getTime() : Number.POSITIVE_INFINITY;
      }
      const sirasi: Record<string, number> = { bd: 0, unk: 1, md: 2, ok: 3 };
      return s.dogrulama.im ? sirasi[s.dogrulama.im] ?? 4 : 4;
    };
    const karsilastir = (x: SatirVerisi, y: SatirVerisi) =>
      (sira.anahtar === 'termin' || sira.anahtar === 'dogrulama'
        ? sayi(x) - sayi(y)
        : metin(x).localeCompare(metin(y), 'tr')) * yon;

    return {
      // 1) gecikmişler: en geç kalan en üstte, sıralamadan bağımsız
      gecikmisler: suzulmus.filter((s) => s.gecikme !== null)
        .sort((x, y) => (y.gecikme ?? 0) - (x.gecikme ?? 0)),
      // 2) diğer sürükleyiciler: aksiyonsuz + termini bu hafta
      surukleyiciler: suzulmus.filter((s) => s.gecikme === null && s.surukleyici)
        .sort(karsilastir),
      // 3) kalan: kuyruğa toplanabilir
      kalanlar: suzulmus.filter((s) => !s.surukleyici).sort(karsilastir),
    };
  }, [suzulmus, sira]);

  /* ── görünür satırlar + sağlıklı kuyruk ────────────────────────────── */
  const { gorunur, toplanan } = useMemo(() => {
    const { gecikmisler, surukleyiciler, kalanlar } = bolumler;
    const sabit = [...gecikmisler, ...surukleyiciler];
    if (kuyrukAcik) return { gorunur: [...sabit, ...kalanlar], toplanan: [] as SatirVerisi[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return {
      gorunur: [...sabit, ...kalanlar.slice(0, slot)],
      toplanan: kalanlar.slice(slot),
    };
  }, [bolumler, kuyrukAcik]);

  const secilenVeri = satirVerisi.find((s) => s.b.id === secili) ?? null;
  const filtreAktif = mercek !== 'acik' || onemF !== null || arama.trim() !== '';

  const satirlar: Satir[] = gorunur.map((s) => ({
    id: s.b.id,
    durum: s.im,
    kenar: s.im,
    konu: s.b.baslik,
    alt: `${s.b.maddeKod} · ${s.b.tesisKod}`,
    hucreler: [
      <AksiyonHucresi key="a" aksiyon={s.aksiyon} />,
      s.sahip ?? <Bos key="s" />,
      <TerminHucresi key="t" hedef={s.b.hedef} gecikme={s.gecikme} />,
      <DogrulamaHucresi key="d" hucre={s.dogrulama} />,
    ],
  }));

  const baslik = gecikmisSayisi > 0
    ? { vurgu: `${gecikmisSayisi} bulgu`, ad: 'takıldı', durum: 'bd' as Durum }
    : dogrulamaSayisi > 0
      ? { vurgu: `${dogrulamaSayisi} bulgu`, ad: 'doğrulama bekliyor', durum: 'md' as Durum }
      : acikSayisi > 0
        ? { vurgu: `${acikSayisi} bulgu`, ad: 'zamanında ilerliyor', durum: undefined }
        : { vurgu: undefined, ad: 'Açık bulgu yok', durum: undefined };

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <EkranBasligi
          /* Kesme SESSİZ OLMAZ: tavana çarpıldıysa cümle kaç satırın elde
             olduğunu ve kütüğün gerçek büyüklüğünü birlikte söyler. */
          eyebrow={kesildi
            ? `Bulgu & düzeltici aksiyon · ${acikSayisi} açık · gösterilen ${bulgular.length} / ${toplam}`
            : `Bulgu & düzeltici aksiyon · ${acikSayisi} açık`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            { deger: gecikmisSayisi, yazi: 'Gecikmiş', durum: gecikmisSayisi > 0 ? 'bd' : undefined },
            { deger: dogrulamaSayisi, yazi: 'Doğrulama bekliyor', durum: dogrulamaSayisi > 0 ? 'md' : undefined },
            { deger: zamanindaSayisi, yazi: 'Zamanında' },
          ]}
        />

        <section className="ab-ekran-govde">
          {/* 5 görünür mercek + 2 kapsam kontrolü (02-components §4).
              Kutulu arama alanı ve yerel <select> yok — kapsam grameri. */}
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Ara deger={arama} degistir={(v) => { setArama(v); setKuyrukAcik(false); }} />
                <Kapsam etiket="Önem" aktif={onemF}
                  sec={(id) => { setOnemF(id); setKuyrukAcik(false); }}
                  secenekler={ONEM_DERECELERI.map((o) => ({ id: o, ad: ONEM_ETIKET[o] }))} />
              </>
            }
          />

          {gorunur.length > 0 || toplanan.length > 0 ? (
            <div style={{ marginTop: 'var(--s22)' }}>
              <Tablo
                konuBasligi="Bulgu"
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
                  ? { metin: `+${toplanan.length} bulgu · zamanında ilerliyor`,
                    ac: () => setKuyrukAcik(true) }
                  : null}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s16)',
                padding: 'var(--s14) 0 0' }}>
                <p className="ab-dip" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                  {dipNot(gorunur.length, aksiyonsuzSayisi, kapaliSayisi)}
                </p>
                <DisaAktar satirlar={suzulmus.map((s) => [
                  s.b.baslik, s.b.maddeKod, s.b.tesisKod, s.b.surecKod,
                  ONEM_ETIKET[s.b.onem as Onem] ?? etiketle(s.b.onem),
                  BULGU_DURUM_ETIKET[s.b.durum as keyof typeof BULGU_DURUM_ETIKET]
                    ?? etiketle(s.b.durum),
                  s.aksiyon?.baslik ?? '', s.sahip ?? '',
                  s.b.hedef ? tarihTR(s.b.hedef) : '', s.gecikme ?? '',
                  s.dogrulama.kanit ?? '',
                ])} />
              </div>
            </div>
          ) : filtreAktif ? (
            <BosFiltre temizle={() => { setMercek('acik'); setOnemF(null); setArama(''); }} />
          ) : (
            <BosIlk
              /* "Açık bulgu yok" ile "kapsamınızda bulgu yok" AYNI ŞEY
                 DEĞİLDİR: ilki iyi haber, ikincisi yetki sınırıdır. */
              cumle={kapsamli && bulgular.length === 0
                ? 'Kapsamınızda bulgu kaydı yok.'
                : 'Açık bulgu yok.'}
              eylem={kapaliSayisi > 0
                ? <Dugme tur="ikincil" onClick={() => setMercek('hepsi')}>
                  Kapanmış {kapaliSayisi} kayıt
                </Dugme>
                : undefined}
            />
          )}
        </section>
      </main>

      {secilenVeri && (
        <BulguCekmecesi veri={secilenVeri} kapat={() => setSecili(null)} />
      )}
    </>
  );
}

function dipNot(gorunur: number, aksiyonsuz: number, kapali: number): string {
  const parcalar = [`${gorunur} satır görünüyor`, 'kolon başlığından sıralama'];
  if (aksiyonsuz > 0) parcalar.push(`${aksiyonsuz} bulgunun aksiyonu yok`);
  if (kapali > 0) parcalar.push(`${kapali} kapanmış kayıt bu mercekte gizli`);
  return parcalar.join(' · ');
}

/* ── Kapsam kontrolleri ─────────────────────────────────────────────────
   Kutu yok, kenarlık yok: arama tek satır alt çizgili girdi, önem derecesi
   9.5px mono açılır liste (02-components §4). */

function Ara({ deger, degistir }: { deger: string; degistir: (v: string) => void }) {
  return (
    <input
      className="ab-gr"
      aria-label="Bulgu, madde veya sahip ara"
      placeholder="Ara"
      value={deger}
      onChange={(e) => degistir(e.target.value)}
      style={{
        width: 132, background: 'none', border: 0,
        borderBottom: 'var(--bw-hair) solid var(--hr2)',
        padding: '3px 0', fontFamily: 'var(--veri)', fontSize: 'var(--t-label)',
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
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 190,
        background: 'var(--panel)', border: 'var(--bw-strong) solid var(--hr2)',
        boxShadow: 'none', padding: 'var(--s8)',
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

  /* Excel ve CSV AYNI diziyi okur: iki biçim ayrı yazılsaydı zamanla
     ayrışır ve iki dosyayı karşılaştıran kişi hangisine inanacağını
     bilemezdi. */
  const sayfa = () => ({
            ad: 'Bulgular',
            satirlar: [
              ['Bulgu', 'Madde', 'Tesis', 'Süreç', 'Önem', 'Durum', 'Aksiyon',
                'Sahip', 'Son tarih', 'Gecikme (gün)', 'Doğrulama'],
              ...satirlar,
            ],
          });

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
          onClick={(e) => kapatVe(e, () => exceleAktar(damgaliAd('bulgular', an(), 'xlsx'), [sayfa()]))}>
          Excel
        </button>
        <button type="button" className="ab-filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, () => csvAktar(damgaliAd('bulgular', an(), 'csv'), sayfa()))}>
          CSV
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

/* ── Hücreler ───────────────────────────────────────────────────────────
   06 §A2: hücrede durum sözcüğü yok — işaretçi durumu, metin OLGUYU taşır. */

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

/* Semantik tabloda `nowrap` hücre sütunu içeriğine kadar genişletir ve
   kütüğü yatay kaydırırdı (ölçüldü: 1366px'te 56px). Aksiyon cümlesi
   sarılır; kırpılmaz — kaybolan sözcük yok. */
const KIRP = { minWidth: 0, flex: '1 1 auto', overflowWrap: 'anywhere' } as const;

const SATIR_ICI = {
  display: 'flex', alignItems: 'center', gap: 'var(--s10)', minWidth: 0,
} as const;

function AksiyonHucresi({ aksiyon }: { aksiyon: AksiyonOzeti | null }) {
  if (!aksiyon) {
    // unknown ≠ zero: aksiyonu olmayan bulgu bilinmeyen elması taşır (06 §A3).
    return (
      <span style={SATIR_ICI}>
        <Im durum="unk" ad="Aksiyon planlanmadı" />
        <span style={{ ...KIRP, color: 'var(--i3)' }}>aksiyon yok</span>
      </span>
    );
  }
  return (
    <span style={SATIR_ICI}>
      <Im durum={aksiyonImi(aksiyon)}
        ad={`Aksiyon · ${AKSIYON_ETIKET[aksiyon.durum as keyof typeof AKSIYON_ETIKET] ?? aksiyon.durum}`} />
      <span style={KIRP}>{aksiyon.baslik}</span>
    </span>
  );
}

function TerminHucresi({ hedef, gecikme }: { hedef: string | null; gecikme: number | null }) {
  if (!hedef) return <Bos />;
  if (gecikme === null) return <>{kisaTarih(hedef)}</>;
  // "13 gün gecikmiş" yerine olguyu yazarız: tarih + aşım (06 §A2).
  return (
    <span style={{ color: 'var(--bd)', fontWeight: 600 }}>
      {kisaTarih(hedef)} · +{gecikme} g
    </span>
  );
}

/** İşaretçi doğrulamanın durumunu taşır; metin yalnız KANIT OLGUSUNU
    (retest tarihi / doğrulayan) yazar — kanıt yoksa metin de yoktur. */
function DogrulamaHucresi({ hucre }: { hucre: DogrulamaVerisi }) {
  if (!hucre.im) return <Bos />;
  const govde = (
    <span style={SATIR_ICI}>
      <Im durum={hucre.im} ad={hucre.ad} />
      {hucre.olgu && <span style={KIRP}>{hucre.olgu}</span>}
    </span>
  );
  // Retest kanıtı yalnız yardımcı metadata — aynı bilgi çekmecede de var.
  return hucre.kanit ? <Ipucu metin={hucre.kanit} genis>{govde}</Ipucu> : govde;
}

/* ── Çekmece · bulgu → aksiyon → doğrulama geçmişi ───────────────────── */

type Secim = {
  b: Bulgu; im: Durum; gecikme: number | null; aksiyon: AksiyonOzeti | null;
  dogrulama: DogrulamaVerisi; sahip: string | null; biten: number;
};

/** Durum sözcüğünün canvasta geçebildiği TEK yer çekmecenin kimlik bloğu. */
const SOZ: Record<Durum, string> = {
  bd: 'Gecikmiş', md: 'Doğrulama bekliyor', ok: 'Zamanında',
  unk: 'Aksiyon yok', tamam: 'Kapandı', pl: 'Riski kabul edildi',
};

function BulguCekmecesi({ veri, kapat }: { veri: Secim; kapat: () => void }) {
  const { b, im, gecikme, dogrulama, sahip, biten } = veri;
  const acikAksiyon = b.aksiyonlar.filter(aksiyonAcikMi).length;

  return (
    <Cekmece kod={`${b.maddeKod} · ${b.tesisKod}`} kapat={kapat}>
      <CekmeceKimlik
        durum={im}
        soz={im === 'bd' && gecikme !== null ? `${SOZ.bd} · ${gecikme} gün` : SOZ[im]}
        baslik={b.baslik}
        cumle={b.aciklama.length > 220 ? `${b.aciklama.slice(0, 219)}…` : b.aciklama}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Önem', deger: ONEM_ETIKET[b.onem as Onem] ?? etiketle(b.onem) },
        { etiket: 'Kayıt durumu',
          deger: BULGU_DURUM_ETIKET[b.durum as keyof typeof BULGU_DURUM_ETIKET] ?? etiketle(b.durum) },
        { etiket: 'Santral', deger: b.tesisAd },
        { etiket: 'Sahip', deger: sahip ?? '—' },
        { etiket: 'Son tarih',
          deger: b.hedef ? kisaTarih(b.hedef) : '—',
          durum: gecikme !== null ? 'bd' : undefined },
        { etiket: 'Aksiyon',
          deger: b.aksiyonlar.length === 0 ? '—' : `${biten} / ${b.aksiyonlar.length}` },
      ]} />

      {/* Akış: soldan sağa okunan ilerlemenin dikey karşılığı. */}
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Akış</p>
        <Adim durum="tamam" ad="Bulgu"
          not={`Tespit ${kisaTarih(b.tespit)}${b.kaynak ? ` · ${etiketle(b.kaynak)}` : ''}`} />
        {b.aksiyonlar.length === 0 ? (
          <Adim durum="unk" ad="Aksiyon" not="Planlanmadı" />
        ) : (
          b.aksiyonlar.map((a) => (
            <Adim key={a.id} durum={aksiyonImi(a)} ad={a.baslik}
              not={[a.sorumlu, a.tamamlanma ? `bitti ${kisaTarih(a.tamamlanma)}`
                : a.hedef ? `hedef ${kisaTarih(a.hedef)}` : null].filter(Boolean).join(' · ') || '—'} />
          ))
        )}
        <Adim durum={dogrulama.im ?? 'unk'} ad="Doğrulama"
          not={dogrulama.kanit ?? (acikAksiyon > 0 ? `${acikAksiyon} aksiyon sürüyor` : 'Kayıt yok')} />
      </div>

      {/* Denetim izi — kim, ne zaman, neyi değiştirdi. */}
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Denetim izi</p>
        {b.iz.length === 0 ? (
          <p style={{ margin: 0, fontFamily: 'var(--veri)', fontSize: 'var(--t-label)',
            color: 'var(--i3)' }}>Kayıt yok</p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s10)' }}>
            {b.iz.map((k) => (
              <div key={k.id} style={{ display: 'grid', gap: 2,
                borderLeft: 'var(--bw-edge) solid var(--hr2)', paddingLeft: 'var(--s12)' }}>
                <span style={{ fontSize: 'var(--t-field)' }}>
                  <b style={{ fontWeight: 600 }}>{k.aktor}</b>{' '}
                  {eylemCumlesi(k.eylem, k.varlikTipi === 'Bulgu' ? null : k.varlikTipi, k.alan)}
                </span>
                <span style={{ fontFamily: 'var(--veri)', fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                  {zamanTR(k.zaman)}
                  {(k.once || k.sonra) && ` · ${etiketle(k.once, '—')} → ${etiketle(k.sonra, '—')}`}
                  {k.dosya && ` · ${k.dosya}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <CekmeceBagli kayitlar={[
        { id: 'surec', kod: b.surecKod, alt: `${b.regKod} · ${b.maddeKod}`,
          yol: `/surecler/${b.surecId}`, suren: true },
        { id: 'tesis', kod: b.tesisKod, alt: b.tesisAd, yol: `/tesisler/${b.tesisId}` },
      ]} />

      <CekmeceEylemler
        birincil={
          /* Bağlantı doğrudan .dg-cekmece taşır: <a> içine <button> koymak
             geçersiz iç içelik ve tıklama gezinmeyi tetiklemiyor. */
          <Link href={`/bulgular/${b.id}`} className="ab-dugme tam">Kaydı aç</Link>
        }
        dipNot="Aksiyon planlama, durum değişikliği ve kanıt bağlama kayıt ekranında yapılır; her değişiklik denetim izine yazılır."
      />
    </Cekmece>
  );
}

function Adim({ durum, ad, not }: { durum: Durum; ad: string; not: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', alignItems: 'start',
      gap: 'var(--s8)', padding: 'var(--s10) 0',
      borderBottom: 'var(--bw-hair) solid var(--hr)' }}>
      <span style={{ paddingTop: 3 }}><Im durum={durum} /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 'var(--t-field)', fontWeight: 600 }}>{ad}</span>
        <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--veri)',
          fontSize: 'var(--t-label)', color: 'var(--i3)' }}>{not}</span>
      </span>
    </div>
  );
}
