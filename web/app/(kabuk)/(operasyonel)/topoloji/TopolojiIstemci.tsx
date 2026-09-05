'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import { BosFiltre, BosIlk } from '@/components/kabuk/temel';
import { EkranBasligi, Filtreler, KipDegistir } from '@/components/kabuk/ekran';
import { Tablo, type Kolon } from '@/components/kabuk/tablo';
import {
  Cekmece, CekmeceAlanlar, CekmeceBagli, CekmeceKimlik,
} from '@/components/kabuk/panel';
import { tarihTR, zamanTR } from '@/lib/sabitler';
import { BolgeCekmecesi, BolgeTuvali } from './Bolgeler';
import {
  AnlikAlmaFormu, AnlikEylemleri, SapmaKararlari, kaynakSozu,
  type MaddeSecenegi, type Tesis,
} from './Karar';
import { SegmentCekmecesi, SegmentGorunumu } from './Segmentler';
import {
  GORUNUR_TAVAN, KARSILASTIRMA_SOZU, MERCEKLER, SAPMA_DURUM_SOZU,
  SAPMA_TIP_ETIKETI, SIDDET_ETIKETI,
  acikMi, anlikImi, anlikKarsilastirmasi, anliklariSirala, bolgeGrafigiKur,
  bolgeninGecitleri, ekranHali,
  karsilastirmaHucresi, mercekten, sapmaImi, sapmaKenari, sayimHesapla, sirala,
  toplanabilir,
  type AnlikSatiri, type BolgeSatiri, type GecitSatiri, type KarsilastirmaIzi,
  type Mercek, type SapmaSatiri, type SegmentSatiri, type SunucuOzeti,
  type TemelSatiri,
} from './mantik';

/* O12 · Topoloji sapma tezgâhı.

   Yoğunluk sözleşmesi: 4 metrik, 5–9 görünür satır + katlanmış kuyruk,
   durum kelimesi canvas'ta YAZILMAZ (yalnız çekmece kimlik bloğunda),
   kart ızgarası/zebra/rozet yok, detay modalda açılmaz.

   ÜÇ AYRI SIFIR birbirine karıştırılmaz ve ekran hepsini ayrı söyler:
     · anlık yok            → hiç ölçülmedi
     · temel yok            → ölçüldü ama karşılaştırılamıyor
     · karşılaştırılmadı    → temel var, karşılaştırma çalışmadı
     · sapma yok            → ÖLÇÜLMÜŞ sıfır, zamanıyla birlikte yazılır

   ÜÇÜNCÜ KİP (B8/B10): "Bölgeler" — AgBolgesi/AgGeciti tanımının Purdue
   bantlarına yerleşmiş diyagramı. Anlıktan BAĞIMSIZDIR: tanım varlık
   aktarımıyla gelir, anlık alınmadan da vardır; bu yüzden anlıksız boş
   ekranda da gösterilir. Sapma görünümüne dokunmaz. */

type Kip = 'sapma' | 'anlik' | 'bolge' | 'segment';

/** Temel şeridinde gösterilen kapsam satırı tavanı (yoğunluk sözleşmesi). */
const SERIT_TAVANI = 6;

const SAPMA_KOLONLARI: Kolon[] = [
  { baslik: 'Tip', genislik: '170px' },
  { baslik: 'Şiddet', genislik: '90px' },
  { baslik: 'Kayıt', genislik: '120px', ikincil: true },
  { baslik: 'Görüldü', genislik: '120px', sag: true, ikincil: true },
];

const ANLIK_KOLONLARI: Kolon[] = [
  { baslik: 'Karşılaştırma', genislik: '170px' },
  { baslik: 'Öğe', genislik: '70px', sag: true },
  { baslik: 'Kapsam', genislik: '110px', ikincil: true },
  { baslik: 'Alındı', genislik: '130px', sag: true, ikincil: true },
];

/** Farkın bir yakası — çekmecede alan/değer olarak açılır. */
function farkAlanlari(kaynak: Record<string, unknown> | null) {
  if (!kaynak) return [];
  return Object.entries(kaynak)
    .filter(([anahtar]) => anahtar !== 'anahtar')
    .slice(0, 6)
    .map(([anahtar, deger]) => ({
      etiket: anahtar,
      deger: deger === null || deger === undefined
        ? 'bilinmiyor'
        : Array.isArray(deger) ? (deger.join(', ') || '—') : String(deger),
      // null "bilinmiyor"dur, "yok" değil — işaretçi de bunu söyler.
      durum: deger === null || deger === undefined ? ('unk' as const) : undefined,
    }));
}

export default function TopolojiIstemci({
  sapmalar, anliklar, temeller, ozet, iz, tesisler, bolgeler, gecitler, segmentler,
  maddeDurumlari, yazabilir, onaylayabilir, riskYazabilir, uyumYazabilir,
  segmentYazabilir, sapmaTavani, anlikTavani,
}: {
  sapmalar: SapmaSatiri[];
  anliklar: AnlikSatiri[];
  temeller: TemelSatiri[];
  /** kapsamdaki ağ bölgeleri ve aralarındaki geçitler (kapsam budaması sunucuda) */
  bolgeler: BolgeSatiri[];
  gecitler: GecitSatiri[];
  /** OT-11 · bölgelere bağlı adresleme segmentleri (kapsam budaması sunucuda) */
  segmentler: SegmentSatiri[];
  /** sunucunun tavandan bağımsız saydığı açık/kritik sapma */
  ozet: SunucuOzeti;
  iz: KarsilastirmaIzi;
  tesisler: Tesis[];
  maddeDurumlari: MaddeSecenegi[];
  yazabilir: boolean;
  onaylayabilir: boolean;
  riskYazabilir: boolean;
  uyumYazabilir: boolean;
  /** segment tanımı kütük kaydıdır: `tanimlar/onay` */
  segmentYazabilir: boolean;
  sapmaTavani: number;
  anlikTavani: number;
}) {
  const [kip, setKip] = useUrlDurumu<Kip>('kip', 'sapma');
  const [mercek, setMercek] = useUrlDurumu<Mercek>('mercek', 'acik');
  /* Seçim adreste taşınır (A6): paylaşılan bağlantı aynı sapma/anlık/bölgeyi
     açar; yenilemede seçim kaybolmaz. */
  const [seciliSapma, setSeciliSapma] = useUrlDurumuBos('sapma');
  const [seciliAnlik, setSeciliAnlik] = useUrlDurumuBos('anlik');
  const [seciliBolgeUrl, setSeciliBolge] = useUrlDurumuBos('bolge');
  const [seciliSegment, setSeciliSegment] = useUrlDurumuBos('segment');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [anlikKuyrugu, setAnlikKuyrugu] = useState(false);

  /* Metrikler filtreden BAĞIMSIZ: kapsamın tamamını anlatır. Açık ve
     kritik sayıları TAVANLA KESİLMİŞ listeden değil, sunucunun `count`
     ile ölçtüğü özetten gelir. */
  const sayim = useMemo(
    () => sayimHesapla(sapmalar, anliklar, temeller, ozet),
    [sapmalar, anliklar, temeller, ozet]);

  const suzulmus = useMemo(
    () => sirala(sapmalar.filter((s) => mercekten(s, mercek))), [sapmalar, mercek]);

  /* Karar bekleyen sapma kuyruğa İNMEZ; tavan yalnız karara bağlanmışları
     keser. Tavanı açık satırlara da uygulamak, on birinci kritik sapmayı
     katlanmış bir satırın altına saklardı. Filtre yalnız kapalı kayıt
     bırakmışsa liste boş kalmaz — tavana kadar onlar gösterilir. */
  const acikSayisi = suzulmus.filter((s) => !toplanabilir(s)).length;
  const tavan = Math.max(GORUNUR_TAVAN, acikSayisi);
  const gosterilen = kuyrukAcik ? suzulmus : suzulmus.slice(0, tavan);
  const toplanan = suzulmus.length - gosterilen.length;

  /* Temel şeridi ÖNCE eksikleri gösterir: temeli olmayan ya da hiç anlığı
     olmayan kapsam listenin dibinde kaybolamaz. Sağlıklı kapsamlar tavanı
     aşarsa sayıyla özetlenir — hiçbiri gizlenmiş sayılmasın diye. */
  const temelSeridi = useMemo(() => {
    const agirlik = (t: TemelSatiri) =>
      (t.anlikSayisi === 0 ? 0 : t.temelVar ? (t.acikSapma > 0 ? 1 : 3) : 0);
    const sirali = [...temeller].sort(
      (a, b) => agirlik(a) - agirlik(b) || a.tesisKodu.localeCompare(b.tesisKodu, 'tr'));
    const eksik = sirali.filter((t) => agirlik(t) < 3);
    return sirali.slice(0, Math.max(SERIT_TAVANI, eksik.length));
  }, [temeller]);

  const anlikListesi = useMemo(() => anliklariSirala(anliklar), [anliklar]);
  const anlikGorunur = anlikKuyrugu ? anlikListesi : anlikListesi.slice(0, GORUNUR_TAVAN);
  const sapma = sapmalar.find((s) => s.id === seciliSapma) ?? null;
  const anlik = anliklar.find((a) => a.id === seciliAnlik) ?? null;

  const hal = ekranHali(sayim, iz, anliklar.length > 0);

  /* Bölge grafiği tanımdan kurulur, anlıktan değil; yerleşim statik ve
     deterministiktir (mantik.ts → bolgeGrafigiKur, testte sabit). */
  const bolgeGrafigi = useMemo(
    () => bolgeGrafigiKur({ bolgeler, gecitler }), [bolgeler, gecitler]);
  /* Anlamlı varsayılan seçim: bölge kipinde hiçbir düğüm seçili değilse
     en çok geçidi olan (çizilen) bölge odaklanır — tuval hiçbir zaman
     "hangi düğüme bakayım" hâlinde açılmaz. Kullanıcı seçimi (adres) her
     zaman öndedir; ikinci tıklama odağı bırakır ve varsayılana DÖNMEZ
     (`'-'` işareti = bilinçli boş seçim). */
  const varsayilanBolge = useMemo(() => {
    if (bolgeGrafigi.dugumler.length === 0) return null;
    const derece = new Map<string, number>();
    for (const k of bolgeGrafigi.kenarlar) {
      derece.set(k.kaynak, (derece.get(k.kaynak) ?? 0) + 1);
      derece.set(k.hedef, (derece.get(k.hedef) ?? 0) + 1);
    }
    return [...bolgeGrafigi.dugumler]
      .sort((a, b) => (derece.get(b.id) ?? 0) - (derece.get(a.id) ?? 0)
        || a.id.localeCompare(b.id, 'tr'))[0]?.id ?? null;
  }, [bolgeGrafigi]);
  const seciliBolge = seciliBolgeUrl === '-' ? null : (seciliBolgeUrl ?? varsayilanBolge);
  const bolge = bolgeler.find((b) => b.id === seciliBolge) ?? null;
  const segment = segmentler.find((s) => s.id === seciliSegment) ?? null;
  const bolgeGecitleri = useMemo(
    () => (bolge ? bolgeninGecitleri(bolge.id, gecitler, bolgeler) : []),
    [bolge, gecitler, bolgeler]);
  // Tuval odak sözleşmesi: aynı düğüme ikinci tıklama odağı bırakır.
  const bolgeOdakla = (id: string) => setSeciliBolge(id === seciliBolge ? '-' : id);
  const bolgeKapat = () => setSeciliBolge('-');

  /* Temel şeridinin tek satırlık özeti. Üç hâl AYRI sayılır: ölçülmüş ve
     temeli onaylı · ölçülmüş ama temeli onaylanmamış (sapma
     HESAPLANMIYOR) · hiç ölçülmemiş. Üçünü tek sayıya toplamak,
     "sapma yok" ile "hiç bakılmadı"yı aynı kefeye koyardı. */
  const temelOzeti = (() => {
    const olculmemis = temelSeridi.filter((t) => t.anlikSayisi === 0).length;
    const temelsiz = temelSeridi.filter((t) => t.anlikSayisi > 0 && !t.temelVar).length;
    const onayli = temelSeridi.filter((t) => t.temelVar).length;
    return [
      `${temelSeridi.length} kapsam`,
      onayli > 0 ? `${onayli} temeli onaylı` : null,
      temelsiz > 0 ? `${temelsiz} temel bekliyor` : null,
      olculmemis > 0 ? `${olculmemis} hiç ölçülmedi` : null,
    ].filter(Boolean).join(' · ');
  })();

  const bolgeGorunumu = bolgeler.length === 0 ? (
    <BosIlk
      cumle={'Kapsamınızda ağ bölgesi tanımı yok — bölge ve geçit tanımı'
        + ' varlık aktarımı (CMDB kaydı) ile gelir; bu ekran ağı taramaz.'}
      eylem={<Link href="/varlik-aktarim" className="ab-dugme">Varlık aktarımını aç</Link>} />
  ) : (
    <>
      <BolgeTuvali grafik={bolgeGrafigi} odak={seciliBolge} odakla={bolgeOdakla} />
      <p className="ab-dip" style={{ marginTop: 'var(--s10)' }}>
        Düğüm = bölge, kenar = geçit (conduit). Bantlar Purdue / IEC 62443
        seviyesidir: SL0 altta, SL4 üstte; seviyesi tanımsız bölge ayrı bantta
        durur. Bir bölgeye tıklayınca komşuları öne çıkar, künyesi ve geçitleri
        sağda açılır. Geçit onayı bu ekranda verilmez.
      </p>
    </>
  );

  const izCumlesi = iz.sonKarsilastirma
    ? `Son karşılaştırma ${zamanTR(iz.sonKarsilastirma)}`
      + (iz.tetikleyen === 'motor' ? ' · motor koşusu' : ' · elle')
    : 'Karşılaştırma hiç yapılmadı — sapma sayısı ölçülmüş sıfır DEĞİL, bilinmiyor';

  const dipNot = [
    `Listede ${sapmalar.length} sapma · kapsamda ${sayim.acik} karar bekliyor`,
    izCumlesi,
    sayim.karsilastirilmamisAnlik > 0
      && `${sayim.karsilastirilmamisAnlik} anlık karşılaştırılmadı`,
    sayim.bekleyenAday > 0
      && `${sayim.bekleyenAday} kritik sapmanın risk/bulgu adayı kayda dönüşmedi`,
    sapmalar.length >= sapmaTavani && `en yeni ${sapmaTavani} sapma gösteriliyor`,
  ].filter(Boolean).join(' · ');

  /* ── hiç anlık yoksa: boş DEĞİL, "hiç ölçülmedi" ──────────────────── */
  if (anliklar.length === 0 && sapmalar.length === 0) {
    return (
      <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi eyebrow="Topoloji sapması · pasif gözlem"
          baslik="Topoloji anlığı alınmadı" />
        <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <AnlikAlmaFormu tesisler={tesisler} yazabilir={yazabilir} />
          <BosIlk
            cumle={'Kapsamınızda topoloji anlığı yok — bu "sapma yok" demek'
              + ' değildir, hiç ölçülmedi demektir. Yukarıdaki formdan onaylı ağ'
              + ' kaydından bir anlık dondurun, sonra onu temel olarak onaylayın.'}
            eylem={<Link href="/envanter" className="ab-dugme">Ağ kaydını aç</Link>} />

          {/* Bölge tanımı anlıktan bağımsızdır: anlık yokken de çizilir,
              çünkü tanım varlık aktarımıyla gelir ve okunabilir olmalıdır. */}
          {bolgeler.length > 0 && (
            <section className="ab-blok" style={{ maxWidth: 'none', marginTop: 'var(--s20)' }}>
              <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>
                Bölgeler · {bolgeler.length} · geçit {gecitler.length} · anlıktan bağımsız tanım
              </p>
              {bolgeGorunumu}
            </section>
          )}
        </section>
      </main>
      {bolge && (
        <BolgeCekmecesi bolge={bolge} gecitler={bolgeGecitleri}
          kapat={bolgeKapat} />
      )}
      </>
    );
  }

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Topoloji sapması · ${anliklar.length} anlık · pasif gözlem`}
          vurgu={hal.vurgu}
          vurguDurumu={hal.durum}
          baslik={hal.metin}
          metrikler={[
            { deger: sayim.acik, yazi: 'Karar bekleyen sapma',
              durum: sayim.acik > 0 ? 'md' : undefined },
            { deger: sayim.kritikAcik, yazi: 'Kritik · açık',
              durum: sayim.kritikAcik > 0 ? 'bd' : undefined },
            { deger: sayim.temelsizKapsam, yazi: 'Temeli onaylanmamış kapsam',
              durum: sayim.temelsizKapsam > 0 ? 'unk' : undefined },
            { deger: iz.sonKarsilastirma ? tarihTR(iz.sonKarsilastirma) : 'yapılmadı',
              yazi: 'Son karşılaştırma',
              durum: iz.sonKarsilastirma ? undefined : 'unk' },
          ]}
        />

        <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <AnlikAlmaFormu tesisler={tesisler} yazabilir={yazabilir} />

          {/* Temel şeridi: her kapsamın temeli VAR MI — sapmanın hesaplanıp
              hesaplanmadığı bu satırda okunur, tabloda değil.

              ÖLÇÜLDÜ: bu blok açıkken 480px yer kaplıyordu ve sapma
              kuyruğunu 871px'e — katlamanın altına — itiyordu. On üç
              satırın sekizi aynı cümleydi ("anlık yok — topoloji hiç
              ölçülmedi"). Kullanıcı buraya sapmaya karar vermeye gelir;
              temel envanteri o kararın BAĞLAMIDIR, kendisi değil.

              Sayı satırı hep görünür (bağlam kaybolmaz), tam liste
              açılır. "Hiç ölçülmedi" sayısı önde durur çünkü sıfır
              sapma ile hiç ölçülmemiş kapsam AYNI ŞEY DEĞİLDİR. */}
          <details className="ab-blok ab-dok-bosluk"
            style={{ maxWidth: 'none', marginBottom: 'var(--s20)' }}>
            <summary>
              <span className="etiket">Onaylı temel · kapsam başına</span>
              <span className="mono" style={{ marginLeft: 'var(--s12)', color: 'var(--i2)' }}>
                {temelOzeti}
              </span>
            </summary>
            <ul style={{ listStyle: 'none', margin: 'var(--s12) 0 0', padding: 0,
              display: 'grid', gap: 'var(--s6)' }}>
              {temelSeridi.map((t) => (
                <li key={t.kapsamId} style={{ display: 'flex', gap: 'var(--s10)',
                  alignItems: 'baseline', fontSize: 'var(--t-code-lg)' }}>
                  <span style={{ fontWeight: 600, minWidth: 90 }}>{t.tesisKodu}</span>
                  <span style={{ fontFamily: 'var(--veri)',
                    color: t.temelVar ? 'var(--i2)' : 'var(--unk)' }}>
                    {t.anlikSayisi === 0
                      ? 'anlık yok — topoloji hiç ölçülmedi'
                      : t.temelVar
                        ? `temel ${tarihTR(t.temelAlindi)} · ${t.anlikSayisi} anlık`
                          + ` · ${t.acikSapma} açık sapma`
                        : `temel onaylanmadı — ${t.anlikSayisi} anlık var, sapma HESAPLANMIYOR`}
                  </span>
                </li>
              ))}
            </ul>
            {temelSeridi.length < temeller.length && (
              <p className="ab-dip" style={{ marginTop: 'var(--s10)' }}>
                Temeli onaylı {temeller.length - temelSeridi.length} kapsam daha var;
                sapması olan ve temeli eksik olanlar yukarıda listelendi.
              </p>
            )}
            <p className="ab-dip">
              {izCumlesi}
              {iz.motorDurumu
                ? ` · motorun son koşusu: ${iz.motorDurumu}`
                  + `${iz.motorZamani ? ` (${zamanTR(iz.motorZamani)})` : ''}`
                : ' · motor bu kapsamda hiç koşmadı'}
            </p>
          </details>

          <KipDegistir
            secenekler={[
              { id: 'sapma', ad: `Sapmalar · ${sapmalar.length}` },
              { id: 'anlik', ad: `Anlık görüntüler · ${anliklar.length}` },
              { id: 'bolge', ad: `Bölgeler · ${bolgeler.length}` },
              { id: 'segment', ad: `Segmentler · ${segmentler.length}` },
            ]}
            aktif={kip}
            sec={(id) => {
              setKip(id as Kip); setSeciliSapma(null); setSeciliAnlik(null);
              setSeciliBolge(null); setSeciliSegment(null);
            }}
          />

          {kip === 'sapma' ? (
            <>
              <Filtreler secenekler={MERCEKLER} aktif={mercek}
                sec={(id) => setMercek(id as Mercek)} />

              {sapmalar.length === 0 ? (
                <p className="ab-dip" style={{ marginTop: 'var(--s18)' }}>
                  {iz.sonKarsilastirma
                    ? `Sapma yok — son karşılaştırma ${zamanTR(iz.sonKarsilastirma)}.`
                      + ' Bu ölçülmüş bir sıfırdır.'
                    : 'Sapma listesi boş ama karşılaştırma hiç yapılmadı:'
                      + ' bu sıfır ÖLÇÜLMEDİ. Bir anlığı temel olarak onaylayın'
                      + ' ve karşılaştırmayı başlatın.'}
                </p>
              ) : gosterilen.length === 0 ? (
                <BosFiltre temizle={() => setMercek('hepsi')} />
              ) : (
                <Tablo
                  konuBasligi="Sapan öğe"
                  kolonlar={SAPMA_KOLONLARI}
                  secili={seciliSapma}
                  sec={(id) => setSeciliSapma(id === seciliSapma ? null : id)}
                  kuyruk={toplanan > 0
                    ? { metin: `Karara bağlanmış ${toplanan} sapma`,
                      ac: () => setKuyrukAcik(true) }
                    : null}
                  dipNot={dipNot}
                  satirlar={gosterilen.map((s) => ({
                    id: s.id,
                    durum: sapmaImi(s),
                    kenar: sapmaKenari(s),
                    konu: s.anahtar ?? SAPMA_TIP_ETIKETI[s.tip] ?? s.tip,
                    alt: `${s.tesisKodu ?? 'tesissiz'} · ${kaynakSozu(s.anlikKaynak)}`,
                    hucreler: [
                      SAPMA_TIP_ETIKETI[s.tip] ?? s.tip,
                      <span key="s" style={s.siddet === 'kritik'
                        ? { color: 'var(--bd)', fontWeight: 600 } : undefined}>
                        {SIDDET_ETIKETI[s.siddet] ?? s.siddet}
                      </span>,
                      s.uretilenRiskKodu ?? (s.uretilenBulguId ? 'bulgu' : '—'),
                      tarihTR(s.olusturuldu),
                    ],
                  }))}
                />
              )}
            </>
          ) : kip === 'bolge' ? (
            <div style={{ marginTop: 'var(--s18)' }}>{bolgeGorunumu}</div>
          ) : kip === 'segment' ? (
            <SegmentGorunumu
              segmentler={segmentler} bolgeler={bolgeler}
              yazabilir={segmentYazabilir}
              secili={seciliSegment} sec={setSeciliSegment}
            />
          ) : (
            <Tablo
              konuBasligi="Anlık görüntü"
              kolonlar={ANLIK_KOLONLARI}
              secili={seciliAnlik}
              sec={(id) => setSeciliAnlik(id === seciliAnlik ? null : id)}
              kuyruk={anlikListesi.length > anlikGorunur.length
                ? { metin: `Daha eski ${anlikListesi.length - anlikGorunur.length} anlık`,
                  ac: () => setAnlikKuyrugu(true) }
                : null}
              dipNot={`${anliklar.length} anlık gösteriliyor (en yeni ${anlikTavani}).`
                + ' Anlık almak temel kurmaz; temeli insan onaylar.'}
              satirlar={anlikGorunur.map((a) => ({
                id: a.id,
                durum: anlikImi(a),
                kenar: anlikImi(a),
                konu: kaynakSozu(a.kaynak),
                alt: `${a.ozetHash.slice(0, 12)} · ${a.ogeSayisi} öğe`,
                hucreler: [
                  <span key="k" style={anlikKarsilastirmasi(a) === 'karsilastirilmadi'
                    || anlikKarsilastirmasi(a) === 'temelsiz'
                    ? { color: 'var(--unk)' } : undefined}>
                    {karsilastirmaHucresi(a)}
                  </span>,
                  a.ogeSayisi,
                  a.tesisKodu ?? 'tesissiz',
                  tarihTR(a.alindi),
                ],
              }))}
            />
          )}
        </section>
      </main>

      {kip === 'sapma' && sapma && (
        <Cekmece kod={`sapma/${sapma.id.slice(-8)}`} kapat={() => setSeciliSapma(null)}>
          <CekmeceKimlik
            durum={sapmaImi(sapma)}
            soz={SAPMA_DURUM_SOZU[sapma.durum] ?? sapma.durum}
            baslik={SAPMA_TIP_ETIKETI[sapma.tip] ?? sapma.tip}
            cumle={sapma.aciklama}
          />

          <CekmeceAlanlar
            alanlar={[
              { etiket: 'Şiddet', deger: SIDDET_ETIKETI[sapma.siddet] ?? sapma.siddet,
                durum: sapma.siddet === 'kritik' ? 'bd' : undefined },
              { etiket: 'Öğe', deger: sapma.anahtar ?? 'kayıtta anahtar yok',
                durum: sapma.anahtar ? undefined : 'unk' },
              { etiket: 'Kapsam', deger: sapma.tesisKodu ?? 'tesissiz',
                durum: sapma.tesisKodu ? undefined : 'unk' },
              { etiket: 'Anlık',
                deger: `${kaynakSozu(sapma.anlikKaynak)} · ${zamanTR(sapma.anlikAlindi)}` },
              { etiket: 'Görüldü', deger: zamanTR(sapma.olusturuldu) },
              ...(acikMi(sapma) ? [] : [{
                etiket: 'Karar',
                deger: `${sapma.kararVeren ?? 'bilinmiyor'}`
                  + ` · ${sapma.kararZamani ? zamanTR(sapma.kararZamani) : '—'}`,
              }]),
            ]}
          />

          {/* Farkın iki yakası: temelde ne vardı, anlıkta ne var. Karar
              vermek için kritik olan bu — hover'a saklanmaz. */}
          {sapma.onceki && (
            <>
              <p className="etiket" style={{ margin: 'var(--s24) 0 0' }}>Temelde</p>
              <CekmeceAlanlar alanlar={farkAlanlari(sapma.onceki)} />
            </>
          )}
          {sapma.sonraki && (
            <>
              <p className="etiket" style={{ margin: 'var(--s24) 0 0' }}>Bu anlıkta</p>
              <CekmeceAlanlar alanlar={farkAlanlari(sapma.sonraki)} />
            </>
          )}

          {(sapma.uretilenRiskId || sapma.uretilenBulguId) && (
            <CekmeceBagli
              baslik="Açılan kayıt"
              kayitlar={[
                ...(sapma.uretilenRiskId ? [{
                  id: sapma.uretilenRiskId,
                  kod: sapma.uretilenRiskKodu ?? 'Risk kaydı',
                  alt: 'sapmadan insan kararıyla açıldı', yol: '/riskler',
                }] : []),
                ...(sapma.uretilenBulguId ? [{
                  id: sapma.uretilenBulguId, kod: 'Bulgu kaydı',
                  alt: 'sapmadan insan kararıyla açıldı', yol: '/bulgular',
                }] : []),
              ]}
            />
          )}

          <SapmaKararlari
            satir={sapma}
            onaylayabilir={onaylayabilir}
            riskYazabilir={riskYazabilir}
            uyumYazabilir={uyumYazabilir}
            maddeDurumlari={maddeDurumlari}
          />
        </Cekmece>
      )}

      {kip === 'anlik' && anlik && (
        <Cekmece kod={anlik.ozetHash.slice(0, 12)} kapat={() => setSeciliAnlik(null)}>
          <CekmeceKimlik
            durum={anlikImi(anlik)}
            soz={KARSILASTIRMA_SOZU[anlikKarsilastirmasi(anlik)]}
            baslik={kaynakSozu(anlik.kaynak)}
            cumle={anlik.temelMi
              ? 'Bu anlık yürürlükteki temeldir; sapmalar buna göre hesaplanır.'
              : anlik.temelVar
                ? 'Bu anlık temele göre karşılaştırılır. Karşılaştırma sapma'
                  + ' YAZAR, karar vermez.'
                : 'Kapsamın onaylı temeli yok. Temel onaylanana kadar sapma'
                  + ' hesaplanmaz — liste boşluğu "fark yok" anlamına gelmez.'}
          />

          <CekmeceAlanlar
            alanlar={[
              { etiket: 'Kapsam', deger: anlik.tesisKodu ?? 'tesissiz',
                durum: anlik.tesisKodu ? undefined : 'unk' },
              { etiket: 'Alındı', deger: zamanTR(anlik.alindi) },
              { etiket: 'Öğe sayısı', deger: anlik.ogeSayisi },
              { etiket: 'Karşılaştırma',
                deger: anlik.karsilastirmaZamani
                  ? zamanTR(anlik.karsilastirmaZamani)
                  : 'yapılmadı',
                durum: anlik.karsilastirmaZamani ? undefined : 'unk' },
              { etiket: 'Sapma',
                deger: `${anlik.sapmaSayisi} · ${anlik.acikSapma} açık`
                  + (anlik.kritikSapma > 0 ? ` · ${anlik.kritikSapma} kritik` : ''),
                durum: anlik.kritikSapma > 0 ? 'bd' : undefined },
              ...(anlik.not ? [{ etiket: 'Not', deger: anlik.not }] : []),
            ]}
          />

          <AnlikEylemleri anlik={anlik} />
        </Cekmece>
      )}

      {kip === 'bolge' && bolge && (
        <BolgeCekmecesi bolge={bolge} gecitler={bolgeGecitleri}
          kapat={bolgeKapat} />
      )}

      {kip === 'segment' && segment && (
        <SegmentCekmecesi segment={segment} bolgeler={bolgeler}
          kapat={() => setSeciliSegment(null)} />
      )}
    </>
  );
}
