'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Alan, BosIlk, Dugme, Hata, Im, Ipucu, Kesir, type Durum,
} from '@/components/atlas/temel';
import {
  Matris, Tablo, type Kolon, type MatrisSatiri, type Satir,
} from '@/components/atlas/tablo';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import {
  Cekmece, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler, CekmeceKimlik,
} from '@/components/atlas/cekmece';
import { useEylem } from '@/components/useEylem';
import { kanitTalebiEkle } from '@/lib/eylemler2/denetim';
import { DURUM_ETIKET, etiketle } from '@/lib/sabitler';
import {
  acikMi, agirlik, aileDurumu, enKotuHam, kisaTarih, sakinMi, satirAgirligi,
  type CerceveVerisi, type Kontrol, type TesisSatiri,
} from './mantik';

/* O1 · Uyum kontrol odası — "nerede uyumsuzuz?" (03-screens O1)

   Canvas'ta tek modül vardır: santral × kontrol ailesi matrisi. Hücrede
   YALNIZ işaretçi bulunur; durum sözcüğü tüm ekranda yalnız çekmecenin
   kimlik bloğunda geçer (06 §A2).

   Kapsam kararı ekranda ezilmez: matriste satırı olan santralleri
   `UygulanabilirlikKarari` belirler (veri.ts). Kapsam dışı ve kararsız
   tesisler matrise girmez, altta sessiz bir satırda özetlenir. */

/* 10px mono affordance satırındaki bağlantılar satırın tipografisini bozmaz;
   ayırt edici olan renk (ink/secondary) ve hover. */
const BAG_STILI = {
  fontSize: 'inherit', fontWeight: 400, letterSpacing: 'inherit',
} as const;

/* ── Dikkat listesi — matrisin altındaki ikincil yüzey ────────────────
   PİLOT KUSURU: Atlas 2'de matris 5 satıra düşünce ekranın alt yarısı
   (≈340px) tamamen boş kalıyordu. Boşluk sadeliğin kanıtı değil; "az
   gürültü" ile "hiçbir şey yok" aynı şey değildir.

   Bu yüzey YENİ VERİ ÇEKMEZ ve YENİ İŞ KURALI TANIMLAMAZ: zaten yüklü
   olan `cerceve.satirlar[].kontroller` üzerinden, matrisin kendi
   fonksiyonlarıyla (`acikMi`, `agirlik` — mantik.ts) süzülüp sıralanır.
   Matris "NEREDE uyumsuzuz" der ama hücre bir aileyi temsil ettiği için
   "HANGİ kontrol, KİMDE, NE ZAMAN" sorularını yanıtlayamaz; bu liste tam
   olarak o üç sütunu verir ve satıra basınca matrisin açtığı ÇEKMECENİN
   AYNISINI açar. KPI kutusu eklenmedi — sarmalayıcı kart yok, aynı
   `Tablo` primitifi ve aynı işaretçi grameri kullanılır. */
const DIKKAT_KOLONLARI: Kolon[] = [
  { baslik: 'Aile', genislik: 'minmax(120px, 0.7fr)', ikincil: true },
  { baslik: 'Sahip', genislik: '132px', ikincil: true },
  { baslik: 'Kanıt', genislik: '132px' },
  { baslik: 'Son tarih', genislik: '150px' },
];

/** 06 §A3: tabloda 5–9 satır; kalanı kuyruk satırı toplar. */
const DIKKAT_BUTCESI = 6;

/** Aynı ağırlıkta olanlarda termini geçmiş olan üste çıkar. */
const TERMIN_SIRASI: Record<string, number> = { bd: 0, md: 1, unk: 2, ok: 3 };

type Secim = { tesisId: string; kontrol: Kontrol; aileId: string };

/** Seçili çerçevenin künyesi — hepsi zaten yüklü alanlar, tek sessiz satır. */
function cerceveBaglami(cerceve: CerceveVerisi): string {
  const parcalar: string[] = [];
  if (cerceve.surumEtiketi) parcalar.push(`sürüm ${cerceve.surumEtiketi}`);
  if (cerceve.yururluk) parcalar.push(`yürürlük ${kisaTarih(cerceve.yururluk)}`);
  if (cerceve.surec) {
    parcalar.push(cerceve.surec.kalanGun != null
      ? `süreç ${cerceve.surec.kod} · ${cerceve.surec.kalanGun} gün`
      : `süreç ${cerceve.surec.kod}`);
  }
  if (cerceve.denetim) parcalar.push(`denetim ${cerceve.denetim.kod}`);
  if (cerceve.kural) {
    parcalar.push(`kapsam kuralı v${cerceve.kural.surum}`
      + (cerceve.kural.sonHesap ? ` · son hesap ${kisaTarih(cerceve.kural.sonHesap)}` : '')
      + (cerceve.kural.elIleSayisi > 0 ? ` · ${cerceve.kural.elIleSayisi} el ile` : ''));
  }
  return parcalar.join(' · ');
}

/** Ekranın açılış konumu: hangi çerçeve, hangi kırılım.
    `/uyum?kontrol=EPDK-SYM-4.2.1` → o kontrolün çerçevesi + ailesi açılır
    (O2 alt maddesinden gelen sıçrama). */
type Odak = { cerceve: string; aile: string | null; madde: string | null };

/* Kapsam URL'de yaşar: çerçeve değiştirici paylaşılabilir bir bağlantı üretmeli
   ama tarayıcı geçmişini kirletmemeli — `components/atlas/kapsam.ts` sözleşmesi:
   seçim `push`, kapsam `replace`.
   Statik dışa aktarımda sunucu `searchParams` okuyamadığı için Next'in native
   History API köprüsü kullanılır; `useSearchParams` kendiliğinden senkron kalır. */
function kapsamiYaz(cerceveKodu: string) {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams(window.location.search);
  p.set('cerceve', cerceveKodu);
  p.delete('kontrol');   // kırılım çerçeveyle birlikte sıfırlanır
  window.history.replaceState(null, '', `?${p.toString()}`);
}

function acilisOdagi(
  cerceveler: CerceveVerisi[], kontrolParam: string | null, cerceveParam: string | null,
): Odak {
  if (kontrolParam) {
    for (const c of cerceveler) {
      for (const a of c.aileler) {
        const y = a.yapraklar.find((x) => x.kod === kontrolParam || x.kisaKod === kontrolParam);
        if (y) return { cerceve: c.kod, aile: a.id, madde: y.id };
      }
    }
  }
  const c = cerceveler.find((x) => x.kod === cerceveParam)
    ?? cerceveler.find((x) => x.satirlar.length > 0)
    ?? cerceveler[0];
  return { cerceve: c?.kod ?? '', aile: null, madde: null };
}

export default function UyumIstemci({
  cerceveler, yazabilir,
}: { cerceveler: CerceveVerisi[]; yazabilir: boolean }) {
  const parametreler = useSearchParams();
  const kontrolParam = parametreler.get('kontrol');
  const cerceveParam = parametreler.get('cerceve');

  const [odak, setOdak] = useState<Odak>(
    () => acilisOdagi(cerceveler, kontrolParam, cerceveParam));
  const [secim, setSecim] = useState<Secim | null>(null);
  /* Dikkat listesi bütçeyi aşınca kuyruk satırı açar — salt sunum durumu. */
  const [dikkatAcik, setDikkatAcik] = useState(false);

  const { aile: odakAile, madde: odakMadde } = odak;
  const cerceve = cerceveler.find((c) => c.kod === odak.cerceve) ?? cerceveler[0];

  function cerceveSec(kod: string) {
    setOdak({ cerceve: kod, aile: null, madde: null });
    setSecim(null);
    setDikkatAcik(false);
    kapsamiYaz(kod);
  }

  function kirilimiSifirla() {
    setOdak((o) => ({ ...o, aile: null, madde: null }));
    setSecim(null);
    kapsamiYaz(odak.cerceve);
  }

  /* ── kolonlar: aile kırılımı (varsayılan) ya da tek ailenin yaprakları ── */
  const aile = odakAile ? cerceve?.aileler.find((a) => a.id === odakAile) ?? null : null;
  const kolonlar = useMemo(() => {
    if (!cerceve) return [];
    /* Sütun başlığı çerçeve detayını o ailede açar (03-screens O1). */
    if (aile) {
      return aile.yapraklar.map((y) => ({
        id: y.id, baslik: y.kisaKod, aileId: aile.id,
        yol: `/uyum/${cerceve.kod}?aile=${encodeURIComponent(aile.kod)}`
          + `&kontrol=${encodeURIComponent(y.kod)}`,
      }));
    }
    return cerceve.aileler.map((a) => ({
      id: a.id, baslik: a.kisa, aileId: a.id,
      yol: `/uyum/${cerceve.kod}?aile=${encodeURIComponent(a.kod)}`,
    }));
  }, [cerceve, aile]);

  /* ── satırlar: her hücre bir işaretçi + tek satırlık ipucu ─────────── */
  const satirVerisi = useMemo(() => {
    if (!cerceve) return [];
    return cerceve.satirlar.map((s) => {
      const hucreler = kolonlar.map((k) => {
        const adaylar = aile
          ? s.kontroller.filter((x) => x.maddeId === k.id)
          : s.kontroller.filter((x) => x.aileId === k.aileId);
        const enKotu = enKotuHam(adaylar.map((x) => x.ham));
        const surukleyen = adaylar.find((x) => x.ham === enKotu) ?? adaylar[0] ?? null;
        return {
          durum: aileDurumu(adaylar.map((x) => x.ham)),
          kontrol: surukleyen,
          aileId: k.aileId,
          adet: adaylar.length,
          acik: adaylar.filter((x) => acikMi(x.ham)).length,
        };
      });
      return {
        satir: s,
        hucreler,
        agirlik: satirAgirligi(hucreler.map((h) => h.durum)),
        sakin: sakinMi(hucreler.map((h) => h.durum)),
      };
    }).sort((a, b) => b.agirlik - a.agirlik);
  }, [cerceve, kolonlar, aile]);

  /* ── dikkat listesi: takip gerektiren kontroller, en ağırdan hafife ──
     Kaynak matrisin ta kendisi (`cerceve.satirlar`); kırılım seçiliyse
     kapsam o aileye daralır, çünkü ekranın odağı da oraya daralmıştır. */
  const dikkat = useMemo(() => {
    if (!cerceve) return [] as { satir: TesisSatiri; kontrol: Kontrol }[];
    const liste: { satir: TesisSatiri; kontrol: Kontrol }[] = [];
    for (const s of cerceve.satirlar) {
      for (const k of s.kontroller) {
        if (!acikMi(k.ham)) continue;
        if (odakAile && k.aileId !== odakAile) continue;
        liste.push({ satir: s, kontrol: k });
      }
    }
    return liste.sort((a, b) => {
      const w = agirlik(b.kontrol.ham) - agirlik(a.kontrol.ham);
      if (w !== 0) return w;
      const t = (d: Durum | null) => (d ? TERMIN_SIRASI[d] ?? 4 : 4);
      const tf = t(a.kontrol.terminIm) - t(b.kontrol.terminIm);
      if (tf !== 0) return tf;
      return a.satir.ad.localeCompare(b.satir.ad, 'tr');
    });
  }, [cerceve, odakAile]);

  const dikkatGorunur = dikkatAcik ? dikkat : dikkat.slice(0, DIKKAT_BUTCESI);
  const dikkatSatirlari: Satir[] = dikkatGorunur.map(({ satir, kontrol }) => ({
    id: kontrol.anahtar,
    durum: kontrol.im ?? 'unk',
    kenar: kontrol.im ?? 'unk',
    /* Durum SÖZCÜĞÜ yok — işaretçi + kod + başlık (06 §A2/§A4-3). */
    konu: `${kontrol.kisaKod} · ${kontrol.baslik}`,
    alt: satir.ad,
    hucreler: [
      cerceve?.aileler.find((a) => a.id === kontrol.aileId)?.kisa ?? '—',
      kontrol.sahip ?? '—',
      /* Kanıt tazeliği: işaretçi taze/eskimiş/yok ayrımını taşır, metin
         yalnız sayıyı ve nedeni söyler ("3 · süresi doldu"). */
      <span key="k" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s6)' }}>
        <Im durum={kontrol.kanitIm} ad="Kanıt tazeliği" />
        {kontrol.kanitYazi}
      </span>,
      kontrol.terminIm
        ? (
          <span key="t" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s6)' }}>
            <Im durum={kontrol.terminIm} ad="Termin" />
            {kontrol.termin}
          </span>
        )
        : kontrol.termin,
    ],
  }));

  const matrisSatirlari: MatrisSatiri[] = satirVerisi.map((v) => ({
    id: v.satir.id,
    ad: v.satir.ad,
    alt: v.satir.alt,
    sakin: v.sakin,
    /* Satır etiketi santralin kendi ekranına gider; hücre çekmeceyi açar. */
    yol: `/tesisler/${v.satir.id}`,
    hucreler: v.hucreler.map((h) => ({
      /* null → hücre boş kalır: kapsam dışı, bilinmeyen DEĞİLDİR. */
      durum: h.durum,
      ipucu: h.kontrol
        ? (h.durum === null ? `${h.kontrol.kisaKod} · bu tesiste kapsam dışı` : h.kontrol.ipucu)
        : 'Bu ailede kontrol tanımlı değil',
    })),
  }));

  if (!cerceve) {
    return (
      <main data-yuzey="defter">
        <EkranBasligi eyebrow="UYUM" baslik="Uyum kontrol odası" />
        <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <BosIlk cumle="Sistemde aktif regülasyon tanımlı değil."
            eylem={<Link className="dg dg-birincil" href="/regulasyonlar">Regülasyon kütüphanesi</Link>} />
        </section>
      </main>
    );
  }

  const m = cerceve.metrikler;
  const kapsamDisi = cerceve.kapsam.filter((k) => k.durum === 'disarida');
  const kararsiz = cerceve.kapsam.filter((k) => k.durum === 'kararsiz');

  /* Metrik satırı: 4 metrik. Yüzdenin yanında bilinmeyen payı DAİMA görünür. */
  const metrikler = [
    {
      deger: m.uyumYuzde === null ? '—' : `%${m.uyumYuzde}`,
      yazi: 'Uyum',
      durum: m.uyumYuzde === null ? ('unk' as Durum) : undefined,
    },
    {
      deger: m.bilinmeyenYuzde === null ? '—' : `%${m.bilinmeyenYuzde}`,
      yazi: 'Bilinmeyen',
      durum: (m.bilinmeyen > 0 ? 'unk' : undefined) as Durum | undefined,
    },
    {
      deger: m.kanitYuzde === null ? '—' : `%${m.kanitYuzde}`,
      yazi: 'Kanıt',
      durum: (m.kanitYuzde !== null && m.kanitYuzde < 50 ? 'md' : undefined) as Durum | undefined,
    },
    {
      deger: m.kanitDoldu,
      yazi: 'Kanıt doldu',
      durum: (m.kanitDoldu > 0 ? 'bd' : undefined) as Durum | undefined,
    },
  ];

  const seciliKontrol = secim?.kontrol ?? null;
  const seciliSatir = secim ? cerceve.satirlar.find((s) => s.id === secim.tesisId) ?? null : null;

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        {/* Başlık cevabı verir: uyumsuz varsa onu, yoksa takipteki yükü söyler. */}
        <EkranBasligi
          eyebrow={`${cerceve.gorunenAd} · ${m.kapsamdakiTesis} tesis kapsamda`}
          vurgu={`${m.uyumsuz > 0 ? m.uyumsuz : m.acik} kontrol`}
          baslik={m.uyumsuz > 0 ? 'uyumsuz' : m.acik > 0 ? 'takipte' : 'uyumlu'}
          metrikler={metrikler}
        />

        <section className="ekran-govde">
          <Filtreler
            secenekler={cerceveler.map((c) => ({ id: c.kod, ad: c.gorunenAd }))}
            aktif={cerceve.kod}
            sec={cerceveSec}
            kapsam={
              <Link className="kapsam-dugme" href={`/uyum/${cerceve.kod}`}>
                Çerçeve detayı ▸
              </Link>
            }
          />

          {cerceve.aileler.length === 0 ? (
            <BosIlk
              cumle={`${cerceve.gorunenAd} kataloğu henüz yüklenmedi.`}
              eylem={<Link className="dg dg-birincil" href="/ice-aktarim">Katalog içe aktar</Link>}
            />
          ) : cerceve.satirlar.length === 0 ? (
            /* Boş: çerçeve hiçbir tesiste uygulanabilir değil (03-screens O1) */
            <BosIlk
              cumle={`${cerceve.gorunenAd} bu portföyde hiçbir tesise uygulanabilir bulunmadı`
                + `${kapsamDisi.length ? ` — ${kapsamDisi.length} tesis kapsam dışı` : ''}`
                + `${kararsiz.length ? `, ${kararsiz.length} tesiste karar üretilemedi` : ''}.`}
              eylem={
                <Link className="dg dg-birincil" href={`/uyum/${cerceve.kod}`}>
                  Kapsam kurallarını aç
                </Link>
              }
            />
          ) : (
            <div style={{ marginTop: 'var(--s22)' }}>
              {aile && (
                <p className="dip-not" style={{ marginTop: 0, marginBottom: 'var(--s10)' }}>
                  Kırılım · {aile.baslik}
                  {odakMadde && ` · ${aile.yapraklar.find((y) => y.id === odakMadde)?.kisaKod ?? ''}`}
                  {' · '}
                  <button type="button" className="dg dg-satir" style={BAG_STILI}
                    onClick={kirilimiSifirla}>
                    Tüm aileler
                  </button>
                </p>
              )}

              <Matris
                kolonBasliklari={kolonlar.map((k) => ({ ad: k.baslik, yol: k.yol }))}
                satirlar={matrisSatirlari}
                secili={secim?.tesisId ?? null}
                sec={(satirId, kolon) => {
                  const v = satirVerisi.find((x) => x.satir.id === satirId);
                  const h = v?.hucreler[kolon];
                  if (!v || !h?.kontrol) return;
                  setSecim({ tesisId: satirId, kontrol: h.kontrol, aileId: h.aileId });
                }}
              />

              {/* 10px mono affordance satırı */}
              <p className="dip-not">
                Hücreye gelince özet · tıklayınca çekmece · santral adı 360&apos;a,
                sütun başlığı çerçeve detayına gider
              </p>

              {/* Kapsam dışı ve kararsız tesisler: ayrı ve sessiz. */}
              {(kapsamDisi.length > 0 || kararsiz.length > 0) && (
                <p className="dip-not" style={{ marginTop: 'var(--s6)' }}>
                  {kapsamDisi.length > 0 && (
                    <Ipucu genis
                      metin={kapsamDisi.slice(0, 6).map((k) => `${k.ad}: ${k.gerekce}`).join(' · ')}>
                      <span className="acikla">{kapsamDisi.length} tesis kapsam dışı</span>
                    </Ipucu>
                  )}
                  {kapsamDisi.length > 0 && kararsiz.length > 0 && ' · '}
                  {kararsiz.length > 0 && (
                    <Ipucu genis
                      metin={kararsiz.map((k) => `${k.ad}: ${k.gerekce}`).join(' · ')}>
                      <span className="acikla">
                        {/* Kural varsa bu bir veri boşluğudur; kural yoksa kapsam
                            yalnız sürecin tesis listesinden gelir. */}
                        {cerceve.kural
                          ? `${kararsiz.length} tesiste kapsam kararı yok`
                          : `${kararsiz.length} tesis süreç kapsamında değil`}
                      </span>
                    </Ipucu>
                  )}
                  {' · '}
                  <Link className="dg dg-satir" style={BAG_STILI} href={`/uyum/${cerceve.kod}`}>
                    Kapsam kuralı ▸
                  </Link>
                </p>
              )}

              {/* ── İkincil yüzey: dikkat listesi ────────────────────────
                  Matrisin altındaki boşluk artık matrisin cevaplayamadığı
                  soruyu taşıyor: hangi kontrol, kimde, ne zaman, kanıtı ne
                  durumda. Yeni sorgu ya da yeni iş kuralı yok. */}
              <div className="uyum-ikincil">
                {dikkat.length > 0 ? (
                  <>
                    <p className="t-colhead uyum-ikincil-bas">
                      Dikkat listesi
                      <span className="ayrinti">
                        {dikkat.length} kontrol takipte
                        {aile ? ` · ${aile.kisa} kırılımı` : ''}
                      </span>
                    </p>
                    <Tablo
                      sik
                      konuBasligi="Kontrol"
                      kolonlar={DIKKAT_KOLONLARI}
                      satirlar={dikkatSatirlari}
                      secili={secim
                        ? `${secim.tesisId}::${secim.kontrol.maddeId}`
                        : null}
                      /* Aynı çekmece: liste matrisin kısayolu, ayrı bir
                         ekran değil. */
                      sec={(id) => {
                        const hedef = dikkat.find((d) => d.kontrol.anahtar === id);
                        if (!hedef) return;
                        setSecim({
                          tesisId: hedef.satir.id,
                          kontrol: hedef.kontrol,
                          aileId: hedef.kontrol.aileId,
                        });
                      }}
                      kuyruk={!dikkatAcik && dikkat.length > DIKKAT_BUTCESI
                        ? {
                          metin: `+${dikkat.length - DIKKAT_BUTCESI} kontrol · daha hafif`,
                          ac: () => setDikkatAcik(true),
                        }
                        : null}
                    />
                  </>
                ) : (
                  /* Boş olmak da bir cevaptır — ama sessiz bir boşlukla
                     değil, tek cümleyle söylenir. */
                  <p className="dip-not" style={{ marginTop: 0 }}>
                    {cerceve.gorunenAd} kapsamında takip gerektiren kontrol yok.
                  </p>
                )}

                {/* Çerçeve künyesi — hangi sürüme, hangi sürece, hangi
                    denetime bakıyoruz. Tek satır, kutu yok. */}
                <p className="dip-not">{cerceveBaglami(cerceve)}</p>
              </div>
            </div>
          )}
        </section>
      </main>

      {secim && seciliKontrol && seciliSatir && (
        <HucreCekmecesi
          cerceve={cerceve}
          satir={seciliSatir}
          kontrol={seciliKontrol}
          aileId={secim.aileId}
          yazabilir={yazabilir}
          kapat={() => setSecim(null)}
        />
      )}
    </>
  );
}

/* ═══ Çekmece — hücrenin tam hikâyesi ══════════════════════════════════ */

function HucreCekmecesi({
  cerceve, satir, kontrol, aileId, yazabilir, kapat,
}: {
  cerceve: CerceveVerisi;
  satir: CerceveVerisi['satirlar'][number];
  kontrol: Kontrol;
  aileId: string;
  yazabilir: boolean;
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [form, setForm] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);
  const [talep, setTalep] = useState({
    baslik: `${kontrol.kisaKod} ${kontrol.baslik} — ${satir.ad}`,
    sonTarih: '',
  });

  const aile = cerceve.aileler.find((a) => a.id === aileId);
  const aileKontrolleri = satir.kontroller.filter((k) => k.aileId === aileId);
  const aileAcik = aileKontrolleri.filter((k) => acikMi(k.ham)).length;
  const im = kontrol.im ?? 'unk';

  return (
    <Cekmece kod={`${satir.kod} · ${aile?.kisa ?? cerceve.gorunenAd}`} kapat={kapat}>
      {/* Durum SÖZCÜĞÜ ürün genelinde yalnız burada geçer (06 §A2). */}
      <CekmeceKimlik
        durum={im}
        soz={DURUM_ETIKET[kontrol.ham as keyof typeof DURUM_ETIKET] ?? 'Değerlendirilmedi'}
        baslik={`${cerceve.gorunenAd} ${kontrol.kisaKod} — ${kontrol.baslik}`}
        cumle={kontrol.gerekce}
      />

      <CekmeceAlanlar
        alanlar={[
          { etiket: 'Kanıt', deger: kontrol.kanitYazi, durum: kontrol.kanitIm },
          { etiket: 'Sahip', deger: kontrol.sahip ?? '—' },
          { etiket: 'Son tarih', deger: kontrol.termin, durum: kontrol.terminIm ?? undefined },
          {
            etiket: `${aile?.baslik ?? 'Aile'} · takipte`,
            deger: <Kesir pay={aileAcik} payda={aileKontrolleri.length} />,
          },
        ]}
      />

      {kontrol.zincir.length > 0 ? (
        <CekmeceBagli kayitlar={kontrol.zincir} />
      ) : (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Zincir</p>
          <p className="cekmece-dip" style={{ margin: 0 }}>
            Bu kontrole bağlı risk, bulgu veya proje kaydı yok.
          </p>
        </div>
      )}

      <CekmeceEylemler
        birincil={
          form ? (
            <div style={{ display: 'grid', gap: 'var(--s12)' }}>
              <Alan etiket="Talep başlığı" zorunlu>
                <input className="gr" value={talep.baslik} disabled={bekliyor}
                  onChange={(e) => setTalep({ ...talep, baslik: e.target.value })} />
              </Alan>
              <Alan etiket="Son tarih">
                <input className="gr" type="date" value={talep.sonTarih} disabled={bekliyor}
                  onChange={(e) => setTalep({ ...talep, sonTarih: e.target.value })} />
              </Alan>
              {hata && <Hata cumle={hata} />}
              <div style={{ display: 'flex', gap: 'var(--s12)' }}>
                <Dugme tur="birincil" disabled={bekliyor || !cerceve.denetim}
                  onClick={() => calistir(
                    () => kanitTalebiEkle({
                      denetimId: cerceve.denetim!.id,
                      baslik: talep.baslik,
                      aciklama: `${kontrol.kod} · ${satir.ad} · ${kontrol.gerekce}`,
                      sonTarih: talep.sonTarih || null,
                    }),
                    () => { setForm(false); setGonderildi(true); },
                  )}>
                  Talebi aç
                </Dugme>
                <Dugme tur="ikincil" onClick={() => setForm(false)}>Vazgeç</Dugme>
              </div>
            </div>
          ) : (
            <Dugme tur="cekmece" disabled={!yazabilir || !cerceve.denetim}
              onClick={() => setForm(true)}>
              Kanıt talep et
            </Dugme>
          )
        }
        ikincil={
          <Link className="dg dg-ikincil"
            style={{ display: 'block', textAlign: 'center' }}
            href={`/uyum/${cerceve.kod}?aile=${encodeURIComponent(aile?.kod ?? '')}`
              + `&kontrol=${encodeURIComponent(kontrol.kod)}`}>
            Kontrol ağacı
          </Link>
        }
        dipNot={[
          gonderildi && 'Kanıt talebi açıldı; denetim izine yazıldı.',
          !cerceve.denetim && 'Bu çerçevede açık denetim yok — talep denetime bağlanır.',
          !yazabilir && cerceve.denetim && 'Kanıt talebi için denetim yazma yetkisi gerekir.',
          `Güven · ${etiketle(kontrol.guven)}`,
          cerceve.surec?.kod,
        ].filter(Boolean).join(' · ')}
      />
    </Cekmece>
  );
}
