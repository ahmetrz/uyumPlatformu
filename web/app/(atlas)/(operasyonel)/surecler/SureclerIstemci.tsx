'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BosFiltre, BosIlk, Dugme, Kesir, Segment, type Durum,
} from '@/components/atlas/temel';
import { Tablo, type Kolon, type Satir } from '@/components/atlas/tablo';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/atlas/cekmece';
import { ZamanCizelgesi, type ZamanKarti } from '@/components/atlas/zaman';
import { tarihTR } from '@/lib/sabitler';
import { Ara, DisaAktar, Kapsam } from './Kontroller';
import { DurumFormu, KapsamPaneli, SurecFormu } from './Formlar';
import {
  altSatir, butcele, capa, denetimMetni, donemler, gecikti, geriMetni, kalanGun,
  kapandiMi, kimlikCumlesi, konum, santralMetni, surecEtiketi, surecImi, ufuk,
  type Kodlu, type S,
} from './ortak';

/* Uyum süreç kütüğü — "hangi kampanya denetim tarihine yetişmiyor?"

   /uyum ile ÇAKIŞMAZ: orada santral × kontrol ailesi matrisi kalıcı
   çerçeveyi anlatır, burada takvimi olan bir kampanya kütüğü var. Bu ekran
   ikinci bir matris kurmaz; iki canvas modülü taşır (06 §A1): denetim
   takvimi (zaman çizelgesi) + öncelik tablosu.

   Durum sözcüğü canvasta geçmez: işaretçi kampanyanın taahhüdünü tutup
   tutmadığını söyler, yaşam döngüsü sözcüğü yalnız çekmecenin kimlik
   bloğunda yazılır (06 §A2). */

/** 06 §A3: tabloda 5–9 satır görünür. Kritik satırlar öne sabitlenir ama
    bütçeyi delmez — kuyruk kaç kritik kayıt taşıdığını sayıyla söyler. */
const GORUNUR_BUTCE = 7;

/** Çizelgede aynı anda en fazla 3 kart: çekmece açıkken eksen ~680px kalır
    ve 208px'lik dördüncü kart oraya sığmaz (02-components §14). */
const KART_BUTCESI = 3;

const KOLONLAR: Kolon[] = [
  { baslik: 'Uyum', genislik: '128px', siraAnahtari: 'uyum' },
  { baslik: 'Bilinmeyen', genislik: '98px', sag: true, siraAnahtari: 'bilinmeyen' },
  { baslik: 'Denetim', genislik: '116px', siraAnahtari: 'denetim' },
  { baslik: 'Kapsam', genislik: '138px', ikincil: true },
];

const MERCEKLER = [
  { id: 'yuruyen', ad: 'Yürüyen' },
  { id: 'gecikmis', ad: 'Gecikmiş' },
  { id: 'takip', ad: 'Takipte' },
  { id: 'kapanan', ad: 'Kapanan' },
  { id: 'hepsi', ad: 'Tümü' },
];

type Anahtar = 'konu' | 'uyum' | 'bilinmeyen' | 'denetim';
type SiraYonu = 'artan' | 'azalan';
type Kip = 'ozet' | 'form' | 'kapsam' | 'durum';

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

export default function SureclerIstemci({
  surecler, simdi, regulasyonlar, tesisler, yazabilir, onaylayabilir,
}: {
  surecler: S[];
  simdi: number;
  regulasyonlar: Kodlu[];
  tesisler: Kodlu[];
  yazabilir: boolean;
  onaylayabilir: boolean;
}) {
  const [mercek, setMercek] = useState('yuruyen');
  const [regF, setRegF] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [sira, setSira] = useState<{ anahtar: Anahtar; yon: SiraYonu }>(
    { anahtar: 'denetim', yon: 'artan' });
  const [secili, setSecili] = useState<string | null>(null);
  const [kip, setKip] = useState<Kip>('ozet');
  const [yeniAcik, setYeniAcik] = useState(false);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  /* ── türetme: her kampanya bir takvim satırına indirgenir ───────────── */
  const kayitlar = useMemo(() => surecler.map((s) => ({
    s,
    im: surecImi(s, simdi),
    denetim: denetimMetni(s, simdi),
    capa: capa(s),
  })), [surecler, simdi]);

  type Kayit = (typeof kayitlar)[number];

  /* ── metrikler · filtrelerden BAĞIMSIZ, kütüğün tamamı ─────────────── */
  const yuruyen = kayitlar.filter((k) => !kapandiMi(k.s) && k.s.durum !== 'pasif');
  const gecikmis = kayitlar.filter((k) => gecikti(k.s, simdi)).length;
  const uyumsuz = surecler.reduce((a, s) => a + s.sayim.uyumsuz, 0);
  const bilinmeyen = surecler.reduce((a, s) => a + s.sayim.bilinmeyen, 0);
  const acikBulgu = surecler.reduce((a, s) => a + s.acikBulgu, 0);
  const kapanan = kayitlar.length - yuruyen.length;
  const takvimsiz = yuruyen.filter((k) => !k.s.bitis).length;

  /* ── mercek + kapsam ───────────────────────────────────────────────── */
  const suzulmus = useMemo(() => kayitlar.filter((k) => {
    const acik = !kapandiMi(k.s) && k.s.durum !== 'pasif';
    if (mercek === 'yuruyen' && !acik) return false;
    if (mercek === 'gecikmis' && !gecikti(k.s, simdi)) return false;
    if (mercek === 'takip' && !(acik
      && (k.s.sayim.uyumsuz > 0 || k.s.sayim.bilinmeyen > 0 || k.s.acikBulgu > 0))) return false;
    if (mercek === 'kapanan' && acik) return false;
    if (regF && k.s.regulasyon.id !== regF) return false;
    if (arama) {
      const havuz = `${k.s.kod} ${k.s.ad} ${k.s.regulasyon.kod} `
        + k.s.tesisler.map((t) => `${t.kod} ${t.ad}`).join(' ');
      if (!havuz.toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    }
    return true;
  }), [kayitlar, mercek, regF, arama, simdi]);

  /* Taahhüdünü tutmayan ve ölçülemeyen kampanyalar sıralamadan bağımsız
     üste sabitlenir (06 §A2); kuyruğa yalnız bütçe dolduğunda ve sayısı
     kuyruk etiketinde yazılı olarak iner. */
  const bolumler = useMemo(() => {
    const yon = sira.yon === 'artan' ? 1 : -1;
    const karsilastir = (x: Kayit, y: Kayit) => {
      switch (sira.anahtar) {
        case 'uyum': {
          // Ölçülmemiş kampanya en sona iner ama "sıfır uyum" sayılmaz.
          const a = x.s.sayim.yuzde ?? -1;
          const b = y.s.sayim.yuzde ?? -1;
          return (a - b) * yon;
        }
        case 'bilinmeyen':
          return (x.s.sayim.bilinmeyen - y.s.sayim.bilinmeyen) * yon;
        case 'denetim': {
          const a = x.capa ?? Number.POSITIVE_INFINITY;
          const b = y.capa ?? Number.POSITIVE_INFINITY;
          return (a - b) * yon;
        }
        default:
          return x.s.ad.localeCompare(y.s.ad, 'tr') * yon;
      }
    };
    return {
      sabit: suzulmus.filter((k) => k.im === 'bd' || k.im === 'unk').sort(karsilastir),
      kalan: suzulmus.filter((k) => k.im !== 'bd' && k.im !== 'unk').sort(karsilastir),
    };
  }, [suzulmus, sira]);

  const { gorunur, toplanan, toplananSabit } = useMemo(
    () => butcele(bolumler.sabit, bolumler.kalan, GORUNUR_BUTCE, kuyrukAcik),
    [bolumler, kuyrukAcik],
  );

  /* ── zaman çizelgesi ───────────────────────────────────────────────────
     Ölçek süzülmüş kümeden değil KÜTÜĞÜN tamamından gelir: mercek
     değiştikçe eksenin gerilmesi takvimi okunmaz yapardı. */
  const eksen = useMemo(() => ufuk(surecler, simdi), [surecler, simdi]);

  const kartlar: ZamanKarti[] = useMemo(() => [...suzulmus]
    .filter((k) => k.capa !== null)
    .sort((x, y) => (x.capa as number) - (y.capa as number))
    .slice(0, KART_BUTCESI)
    .map((k) => ({
      id: k.s.id,
      ad: k.s.ad,
      geri: geriMetni(k.capa, simdi),
      // Kart 208px: kimlik zaten başlıkta, kapsam satırına yalnız çerçeve
      // ve yayılım sığar.
      kapsam: `${k.s.regulasyon.kod} · ${santralMetni(k.s)}`,
      durum: k.im,
      konum: konum(k.capa, eksen),
    })), [suzulmus, eksen, simdi]);

  const secilen = kayitlar.find((k) => k.s.id === secili) ?? null;
  const filtreAktif = mercek !== 'yuruyen' || regF !== null || arama.trim() !== '';

  const satirlar: Satir[] = gorunur.map((k) => ({
    id: k.s.id,
    durum: k.im,
    kenar: k.im,
    konu: k.s.ad,
    alt: altSatir(k.s),
    hucreler: [
      <Segment key="u" ok={k.s.sayim.uyumlu} md={k.s.sayim.kismi}
        bd={k.s.sayim.uyumsuz} unk={k.s.sayim.bilinmeyen} />,
      k.s.sayim.toplam > 0
        ? <Kesir key="b" pay={k.s.sayim.bilinmeyen} payda={k.s.sayim.toplam} />
        : <Bos key="b" />,
      <span key="d" style={k.denetim.durum ? { color: `var(--${k.denetim.durum})` } : undefined}>
        {k.denetim.metin}
      </span>,
      santralMetni(k.s),
    ],
  }));

  const baslik = gecikmis > 0
    ? { vurgu: `${gecikmis} kampanya`, ad: 'denetim tarihini aştı', durum: 'bd' as Durum }
    : yuruyen.length > 0
      ? { vurgu: `${yuruyen.length} kampanya`, ad: 'yürüyor', durum: undefined }
      : { vurgu: undefined, ad: 'Yürüyen kampanya yok', durum: undefined };

  function sec(id: string) {
    setSecili((o) => (o === id ? null : id));
    setKip('ozet');
    setYeniAcik(false);
  }

  return (
    <>
      <main style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Uyum kampanyaları · ${kayitlar.length} kayıt`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            { deger: gecikmis, yazi: 'Gecikmiş', durum: gecikmis > 0 ? 'bd' : undefined },
            { deger: uyumsuz, yazi: 'Uyumsuz madde', durum: uyumsuz > 0 ? 'bd' : undefined },
            { deger: bilinmeyen, yazi: 'Bilinmeyen', durum: bilinmeyen > 0 ? 'unk' : undefined },
            { deger: acikBulgu, yazi: 'Açık bulgu', durum: acikBulgu > 0 ? 'md' : undefined },
          ]}
        />

        <section className="ekran-govde">
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Ara etiket="Kampanya, çerçeve ya da santral ara" deger={arama}
                  degistir={(v) => { setArama(v); setKuyrukAcik(false); }} />
                <Kapsam etiket="Çerçeve" aktif={regF}
                  sec={(id) => { setRegF(id); setKuyrukAcik(false); }}
                  secenekler={regulasyonlar.map((r) => ({ id: r.id, ad: r.kod }))} />
                {yazabilir && (
                  <button type="button" className="kapsam-dugme"
                    onClick={() => { setYeniAcik(true); setSecili(null); }}>
                    + Yeni kampanya
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
                tikla={sec}
              />
            </div>
          )}

          {gorunur.length > 0 || toplanan.length > 0 ? (
            /* Çizelge kartları eksenin şeridini biraz taşabilir; tablo bu
               yüzden şeritten sonra fazladan boşlukla başlar. */
            <div style={{ marginTop: 'var(--s26)' }}>
              <Tablo
                konuBasligi="Kampanya"
                kolonlar={KOLONLAR}
                satirlar={satirlar}
                secili={secili}
                sec={sec}
                sirala={{
                  anahtar: sira.anahtar,
                  yon: sira.yon,
                  degistir: (a) => setSira((o) => ({
                    anahtar: a as Anahtar,
                    yon: o.anahtar === a && o.yon === 'artan' ? 'azalan' : 'artan',
                  })),
                }}
                kuyruk={toplanan.length > 0
                  ? {
                    /* Kuyruk ne taşıdığını SAYIYLA söyler; kritik kayıt
                       sessizce gömülmez, tek tıkla açılır. */
                    metin: toplananSabit > 0
                      ? `+${toplanan.length} kampanya · ${toplananSabit} tanesi öncelikli`
                      : `+${toplanan.length} kampanya · takvimini tutuyor`,
                    ac: () => setKuyrukAcik(true),
                  }
                  : null}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s16)',
                padding: 'var(--s14) 0 0' }}>
                <p className="dip-not" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                  {dipNot(gorunur.length, takvimsiz, kapanan, mercek)}
                </p>
                <DisaAktar
                  dosya="uyum-surecleri"
                  sayfaAdi="Kampanyalar"
                  basliklar={['Kod', 'Ad', 'Çerçeve', 'Durum', 'Başlangıç', 'Denetim tarihi',
                    'Santraller', 'Uyumlu', 'Kısmi', 'Uyumsuz', 'Bilinmeyen', 'Açık bulgu']}
                  satirlar={suzulmus.map((k) => [
                    k.s.kod, k.s.ad, k.s.regulasyon.kod, surecEtiketi(k.s.durum),
                    k.s.baslangic ? tarihTR(k.s.baslangic) : '',
                    k.s.bitis ? tarihTR(k.s.bitis) : '',
                    k.s.tesisler.map((t) => t.kod).join(', '),
                    k.s.sayim.uyumlu, k.s.sayim.kismi, k.s.sayim.uyumsuz,
                    k.s.sayim.bilinmeyen, k.s.acikBulgu,
                  ])} />
              </div>
            </div>
          ) : filtreAktif ? (
            <BosFiltre temizle={() => {
              setMercek('yuruyen'); setRegF(null); setArama('');
            }} />
          ) : (
            <BosIlk
              cumle="Uyum kütüğünde kampanya yok."
              eylem={yazabilir
                ? <Dugme tur="birincil" onClick={() => setYeniAcik(true)}>Kampanya başlat</Dugme>
                : undefined}
            />
          )}
        </section>
      </main>

      {secilen && (
        <Cekmece kod={secilen.s.kod} kapat={() => { setSecili(null); setKip('ozet'); }}>
          {kip === 'ozet' && (
            <Ozet
              kayit={secilen}
              simdi={simdi}
              yazabilir={yazabilir}
              onaylayabilir={onaylayabilir}
              duzenle={() => setKip('form')}
              kapsam={() => setKip('kapsam')}
              durum={() => setKip('durum')}
            />
          )}
          {kip === 'form' && (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Kampanyayı düzenle</p>
              </div>
              <div className="cekmece-blok">
                <SurecFormu surec={secilen.s} regulasyonlar={regulasyonlar}
                  kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
          {kip === 'kapsam' && (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>
                  Kapsam · {secilen.s.tesisler.length} santral
                </p>
              </div>
              <div className="cekmece-blok">
                <KapsamPaneli surec={secilen.s} tesisler={tesisler}
                  kilitli={!yazabilir || kapandiMi(secilen.s)} />
              </div>
              <div className="cekmece-blok" style={{ marginTop: 'var(--s20)' }}>
                <Dugme onClick={() => setKip('ozet')}>Kampanya kaydına dön</Dugme>
              </div>
            </>
          )}
          {kip === 'durum' && (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Yaşam döngüsü</p>
              </div>
              <div className="cekmece-blok">
                <DurumFormu surec={secilen.s} kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
        </Cekmece>
      )}

      {yeniAcik && !secilen && (
        <Cekmece kod="Yeni kampanya" kapat={() => setYeniAcik(false)}>
          <div className="cekmece-blok">
            <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Yeni uyum kampanyası</p>
          </div>
          <div className="cekmece-blok">
            <SurecFormu surec={null} regulasyonlar={regulasyonlar}
              kapat={() => setYeniAcik(false)} />
          </div>
        </Cekmece>
      )}
    </>
  );
}

function dipNot(gorunur: number, takvimsiz: number, kapanan: number, mercek: string): string {
  const parcalar = [`${gorunur} satır görünüyor`, 'kolon başlığından sıralama'];
  // Bilinmeyen takvim sıfır sayılmaz: kaç kampanyanın denetim tarihi girilmedi.
  if (takvimsiz > 0) parcalar.push(`${takvimsiz} kampanyanın denetim tarihi girilmedi`);
  if (kapanan > 0 && mercek === 'yuruyen') parcalar.push(`${kapanan} kapanmış kayıt bu mercekte gizli`);
  return parcalar.join(' · ');
}

/* ── Çekmece özeti ──────────────────────────────────────────────────── */

function Ozet({ kayit, simdi, yazabilir, onaylayabilir, duzenle, kapsam, durum }: {
  kayit: { s: S; im: Durum; denetim: { metin: string; durum?: Durum } };
  simdi: number;
  yazabilir: boolean;
  onaylayabilir: boolean;
  duzenle: () => void;
  kapsam: () => void;
  durum: () => void;
}) {
  const { s, im, denetim } = kayit;
  const kalan = kalanGun(s, simdi);

  /* Zincir kampanyanın bağlandığı halkaları anlatır: çerçeve (uyum kontrol
     odası), yürüyen denetim ve açık bulgular. Olmayan halka uydurulmaz. */
  const acikDenetim = s.denetimler.find((d) => d.durum !== 'kapanis') ?? s.denetimler[0] ?? null;
  const zincir = [
    {
      id: `c-${s.regulasyon.id}`, kod: s.regulasyon.kod,
      alt: `çerçeve · ${s.regulasyon.ad}`,
      yol: `/uyum/${encodeURIComponent(s.regulasyon.kod)}`,
    },
    ...(acikDenetim ? [{
      id: `d-${acikDenetim.id}`, kod: acikDenetim.kod,
      alt: s.denetimler.length > 1 ? `denetim · ${s.denetimler.length} kayıt` : 'denetim',
      yol: `/denetimler/${acikDenetim.id}`,
      suren: acikDenetim.durum !== 'kapanis',
    }] : []),
    ...(s.acikBulgu > 0 ? [{
      id: `b-${s.id}`, kod: `${s.acikBulgu} açık bulgu`,
      alt: 'kampanya kaynaklı', yol: '/bulgular', suren: true,
    }] : []),
  ];

  const soz = gecikti(s, simdi) ? 'Denetim tarihi aşıldı' : surecEtiketi(s.durum);

  return (
    <>
      <CekmeceKimlik durum={im} soz={soz} baslik={s.ad} cumle={kimlikCumlesi(s, simdi)} />

      <CekmeceAlanlar alanlar={[
        {
          etiket: 'Uyum',
          deger: s.sayim.yuzde === null ? 'ölçülmedi' : `%${s.sayim.yuzde}`,
          durum: s.sayim.yuzde === null ? 'unk' : undefined,
        },
        {
          etiket: 'Bilinmeyen',
          deger: s.sayim.toplam > 0
            ? <Kesir pay={s.sayim.bilinmeyen} payda={s.sayim.toplam} />
            : 'değerlendirme yok',
          durum: s.sayim.bilinmeyen > 0 ? 'unk' : undefined,
        },
        {
          etiket: 'Denetim tarihi',
          deger: s.bitis
            ? `${tarihTR(s.bitis)}${kalan !== null && kalan >= 0 ? ` · ${kalan} gün` : ''}`
            : 'girilmedi',
          durum: denetim.durum,
        },
        {
          etiket: 'Kapsam',
          deger: `${santralMetni(s)}${s.sayim.toplam > 0 ? ` · ${s.sayim.toplam} madde` : ''}`,
          durum: s.tesisler.length === 0 ? 'unk' : undefined,
        },
      ]} />

      <CekmeceBagli kayitlar={zincir} />

      <CekmeceEylemler
        birincil={
          <Link href={`/surecler/${s.id}`}>
            <Dugme tur="cekmece">Kaydı aç · maddeler</Dugme>
          </Link>
        }
        ikincil={(yazabilir || onaylayabilir) && (
          <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
            {yazabilir && <Dugme onClick={kapsam}>Kapsam</Dugme>}
            {yazabilir && <Dugme onClick={duzenle}>Düzenle</Dugme>}
            {onaylayabilir && <Dugme onClick={durum}>Durum</Dugme>}
          </div>
        )}
        dipNot={`${s.regulasyon.kod} · ${s.kod}`
          + (s.baslangic ? ` · başlangıç ${tarihTR(s.baslangic)}` : '')
          + (s.sayim.kapsamDisi > 0 ? ` · ${s.sayim.kapsamDisi} madde kapsam dışı` : '')}
      />
    </>
  );
}
