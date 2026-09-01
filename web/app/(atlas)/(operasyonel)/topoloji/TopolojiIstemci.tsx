'use client';
import { useMemo, useState } from 'react';
import { BosFiltre, BosIlk } from '@/components/atlas/temel';
import { EkranBasligi, Filtreler, KipDegistir } from '@/components/atlas/ekran';
import { Tablo, type Kolon } from '@/components/atlas/tablo';
import {
  Cekmece, CekmeceAlanlar, CekmeceBagli, CekmeceKimlik,
} from '@/components/atlas/cekmece';
import { tarihTR, zamanTR } from '@/lib/sabitler';
import {
  AnlikAlmaFormu, AnlikEylemleri, SapmaKararlari, kaynakSozu,
  type MaddeSecenegi, type Tesis,
} from './Karar';
import {
  GORUNUR_TAVAN, KARSILASTIRMA_SOZU, MERCEKLER, SAPMA_DURUM_SOZU,
  SAPMA_TIP_ETIKETI, SIDDET_ETIKETI,
  acikMi, anlikImi, anlikKarsilastirmasi, anliklariSirala, ekranHali,
  karsilastirmaHucresi, mercekten, sapmaImi, sapmaKenari, sayimHesapla, sirala,
  toplanabilir,
  type AnlikSatiri, type KarsilastirmaIzi, type Mercek, type SapmaSatiri,
  type SunucuOzeti, type TemelSatiri,
} from './mantik';

/* O12 · Topoloji sapma tezgâhı.

   Yoğunluk sözleşmesi: 4 metrik, 5–9 görünür satır + katlanmış kuyruk,
   durum kelimesi canvas'ta YAZILMAZ (yalnız çekmece kimlik bloğunda),
   kart ızgarası/zebra/rozet yok, detay modalda açılmaz.

   ÜÇ AYRI SIFIR birbirine karıştırılmaz ve ekran hepsini ayrı söyler:
     · anlık yok            → hiç ölçülmedi
     · temel yok            → ölçüldü ama karşılaştırılamıyor
     · karşılaştırılmadı    → temel var, karşılaştırma çalışmadı
     · sapma yok            → ÖLÇÜLMÜŞ sıfır, zamanıyla birlikte yazılır */

type Kip = 'sapma' | 'anlik';

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
  sapmalar, anliklar, temeller, ozet, iz, tesisler, maddeDurumlari,
  yazabilir, onaylayabilir, riskYazabilir, uyumYazabilir, sapmaTavani, anlikTavani,
}: {
  sapmalar: SapmaSatiri[];
  anliklar: AnlikSatiri[];
  temeller: TemelSatiri[];
  /** sunucunun tavandan bağımsız saydığı açık/kritik sapma */
  ozet: SunucuOzeti;
  iz: KarsilastirmaIzi;
  tesisler: Tesis[];
  maddeDurumlari: MaddeSecenegi[];
  yazabilir: boolean;
  onaylayabilir: boolean;
  riskYazabilir: boolean;
  uyumYazabilir: boolean;
  sapmaTavani: number;
  anlikTavani: number;
}) {
  const [kip, setKip] = useState<Kip>('sapma');
  const [mercek, setMercek] = useState<Mercek>('acik');
  const [seciliSapma, setSeciliSapma] = useState<string | null>(null);
  const [seciliAnlik, setSeciliAnlik] = useState<string | null>(null);
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
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi eyebrow="Topoloji sapması · pasif gözlem"
          baslik="Topoloji anlığı alınmadı" />
        <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <AnlikAlmaFormu tesisler={tesisler} yazabilir={yazabilir} />
          <BosIlk cumle={'Kapsamınızda topoloji anlığı yok — bu "sapma yok" demek'
            + ' değildir, hiç ölçülmedi demektir. Onaylı ağ kaydından bir anlık'
            + ' dondurun, sonra onu temel olarak onaylayın.'} />
        </section>
      </main>
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

        <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <AnlikAlmaFormu tesisler={tesisler} yazabilir={yazabilir} />

          {/* Temel şeridi: her kapsamın temeli VAR MI — sapmanın hesaplanıp
              hesaplanmadığı bu satırda okunur, tabloda değil. */}
          <section className="blok" style={{ maxWidth: 'none', marginBottom: 'var(--s20)' }}>
            <p className="t-label" style={{ margin: 0 }}>Onaylı temel · kapsam başına</p>
            <ul style={{ listStyle: 'none', margin: 'var(--s12) 0 0', padding: 0,
              display: 'grid', gap: 'var(--s6)' }}>
              {temelSeridi.map((t) => (
                <li key={t.kapsamId} style={{ display: 'flex', gap: 'var(--s10)',
                  alignItems: 'baseline', fontSize: 'var(--t-code-lg)' }}>
                  <span style={{ fontWeight: 600, minWidth: 90 }}>{t.tesisKodu}</span>
                  <span style={{ fontFamily: 'var(--mo)',
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
              <p className="dip-not" style={{ marginTop: 'var(--s10)' }}>
                Temeli onaylı {temeller.length - temelSeridi.length} kapsam daha var;
                sapması olan ve temeli eksik olanlar yukarıda listelendi.
              </p>
            )}
            <p className="dip-not">
              {izCumlesi}
              {iz.motorDurumu
                ? ` · motorun son koşusu: ${iz.motorDurumu}`
                  + `${iz.motorZamani ? ` (${zamanTR(iz.motorZamani)})` : ''}`
                : ' · motor bu kapsamda hiç koşmadı'}
            </p>
          </section>

          <KipDegistir
            secenekler={[
              { id: 'sapma', ad: `Sapmalar · ${sapmalar.length}` },
              { id: 'anlik', ad: `Anlık görüntüler · ${anliklar.length}` },
            ]}
            aktif={kip}
            sec={(id) => { setKip(id as Kip); setSeciliSapma(null); setSeciliAnlik(null); }}
          />

          {kip === 'sapma' ? (
            <>
              <Filtreler secenekler={MERCEKLER} aktif={mercek}
                sec={(id) => setMercek(id as Mercek)} />

              {sapmalar.length === 0 ? (
                <p className="dip-not" style={{ marginTop: 'var(--s18)' }}>
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
              <p className="t-label" style={{ margin: 'var(--s24) 0 0' }}>Temelde</p>
              <CekmeceAlanlar alanlar={farkAlanlari(sapma.onceki)} />
            </>
          )}
          {sapma.sonraki && (
            <>
              <p className="t-label" style={{ margin: 'var(--s24) 0 0' }}>Bu anlıkta</p>
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
    </>
  );
}
