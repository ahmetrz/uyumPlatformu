'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Im, Bar, Segment, Ipucu, Dugme, Alan, BosIlk, BosFiltre, type Durum,
} from '@/components/abacus/temel';
import { Tablo, type Kolon, type Satir } from '@/components/abacus/tablo';
import { EkranBasligi, Filtreler } from '@/components/abacus/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/abacus/panel';
import { gorevOlustur } from '@/lib/eylemler2/gorev';
import { etiketle, tarihTR } from '@/lib/sabitler';
import {
  BulguIsle, KosuKaydet, PolitikaFormu, RestoreTestiKaydet, VarlikYedegi,
} from './Eylemler';
import {
  BAR_OK_ESIGI, KAPSAMA_ESIGI, TEST_ESIGI,
  barDurumu, bilinmeyenPayi, filoOzeti, haricListesi, hazirlik, kapsama, karsilastir,
  kirilimMetni, kritikHucresi, sonKosu, sonTest, testGunu, testHucresi, toplanabilir,
  yuzde, type Santral,
} from './mantik';

/* O14 istemcisi. Tek canvas modülü: hazırlığa göre sıralı santral tablosu.
   Detay asla modalda değil 420px çekmecede açılır (06 §B4).

   ── EKRANIN SERT KURALI ────────────────────────────────────────────────
   KANITLI AÇIK ile ÖLÇÜM BOŞLUĞU asla aynı sayıda toplanmaz ve asla aynı
   renkte gösterilmez. "3 kritik varlığın yedeği yok" kırmızıdır ve
   kapatılacak bir açıktır; "3 kritik varlığın yedeği hiç ölçülmedi" gridir
   ve bağlanacak bir kaynaktır. Aynı şey restore testinde de geçerli:
   "test yok" ile "test başarısız" iki ayrı hücre metnidir. */

/* Tasarım sözleşmesi: 22px işaretçi · 1fr santral · 200px kapsama barı ·
   190px son restore testi · 170px kritik varlık · 26px ▸
   (işaretçi ve chevron kolonlarını Tablo'nun kendisi ekler).             */
const KAPSAMA_KOL = 200;
const KOLONLAR: Kolon[] = [
  { baslik: 'Beyan kapsaması', genislik: `${KAPSAMA_KOL}px` },
  { baslik: 'Son restore testi', genislik: '190px' },
  { baslik: 'Kritik varlık', genislik: '170px' },
];

/* `.ipucu-sar` inline-flex olduğu için içindeki bar kendiliğinden
   genişleyemez; kolon genişliğinden biraz dar sabit bir kutu veriyoruz. */
const BAR_KUTU = KAPSAMA_KOL - 10;

const MERCEKLER = [
  { id: 'hepsi', ad: 'Tümü' },
  { id: 'hazirDegil', ad: 'Hazır değil' },
  { id: 'testYok', ad: 'Test yok' },
  { id: 'kritikAcik', ad: 'Kritik varlıkta açık' },
  { id: 'olculmemis', ad: 'Ölçülmemiş kritik varlık' },
  { id: 'haric', ad: 'Kapsam dışı sistemi olan' },
];

/* Durum sözcüğünün yazılabildiği TEK yer çekmecenin kimlik bloğudur (06 §A2). */
const SOZ: Record<Durum, string> = {
  bd: 'Kurtarmaya hazır değil',
  md: 'Kısmi hazırlık',
  unk: 'Değerlendirilmedi',
  ok: 'Kurtarmaya hazır',
  pl: 'Planlı',
  tamam: 'Tamamlandı',
};

export default function YedeklemeIstemci({
  santraller, politikaSayisi,
}: { santraller: Santral[]; politikaSayisi: number }) {
  const [mercek, setMercek] = useState('hepsi');
  const [secili, setSecili] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const filo = useMemo(() => filoOzeti(santraller), [santraller]);

  const suzulmus = useMemo(() => santraller.filter((s) => {
    if (mercek === 'hazirDegil') return hazirlik(s) === 'bd';
    if (mercek === 'testYok') return Boolean(s.politika) && testGunu(s) === null;
    if (mercek === 'kritikAcik') return s.varlikKatmani.yedeksiz.length > 0;
    if (mercek === 'olculmemis') return s.varlikKatmani.bilinmeyen.length > 0;
    if (mercek === 'haric') return haricListesi(s.politika).length > 0;
    return true;
  }), [santraller, mercek]);

  /* Hazırlığa göre en kötü üstte. Sağlıklı olanlar (yalnız onlar) kuyruğa
     toplanır; hazır olmayan satır sıralamadan bağımsız üstte kalır. */
  const { gorunur, toplanan } = useMemo(() => {
    const sirali = [...suzulmus].sort(karsilastir);
    if (kuyrukAcik) return { gorunur: sirali, toplanan: [] as Santral[] };
    return {
      gorunur: sirali.filter((s) => !toplanabilir(s)),
      toplanan: sirali.filter(toplanabilir),
    };
  }, [suzulmus, kuyrukAcik]);

  const secilen = santraller.find((s) => s.id === secili) ?? null;

  const satirlar: Satir[] = gorunur.map((s) => {
    const oran = kapsama(s);
    const bilinmeyen = s.bilinmeyen;
    const test = testHucresi(s);
    const kritik = kritikHucresi(s);
    const im = hazirlik(s);
    return {
      id: s.id,
      durum: im,
      kenar: im,
      konu: s.ad,
      // Alt satır durumu tekrar etmez, NE olduğunu yazar (06 §A2).
      alt: `${s.kod} · ${s.toplam} varlık${bilinmeyen > 0 ? ` · ${bilinmeyen} beyan bilinmiyor` : ''}`
        + (s.bulgular.length > 0 ? ` · ${s.bulgular.length} açık yedek bulgusu` : ''),
      hucreler: [
        <KapsamaHucresi key="k" santral={s} oran={oran} />,
        <span key="t" style={{ fontWeight: test.renk ? 600 : 400,
          color: test.renk ? `var(--${test.renk})` : 'var(--i2)' }}>{test.yazi}</span>,
        /* Hücrenin KENDİSİ "ölçülmedi" diyor; yanına ikinci bir işaretçi
           konmaz (06 §A2: durum işaretçiyle gösteriliyorsa metinde tekrar
           edilmez — burada tersi geçerli, metin taşıyorsa işaret tekrar
           etmez). Satırın sol kenarındaki işaretçi zaten santralin
           hazırlığını söylüyor ve o AYRI bir yargı. */
        <Ipucu key="v" genis metin={kritik.ipucu}>
          <span style={{ whiteSpace: 'nowrap', fontWeight: kritik.renk ? 600 : 400,
            borderBottom: '1px dashed var(--hr2)',
            color: kritik.renk ? `var(--${kritik.renk})` : 'var(--i2)' }}>
            {kritik.yazi}
          </span>
        </Ipucu>,
      ],
    };
  });

  const baslik = filo.kritikYedeksiz > 0
    ? { vurgu: `${filo.kritikYedeksiz} kritik varlığın`, ad: 'kullanılabilir yedeği yok' }
    : filo.testYok > 0
      ? { vurgu: `${filo.testYok} santral`, ad: 'hiç restore testi görmedi' }
      : filo.hazirDegil > 0
        ? { vurgu: `${filo.hazirDegil} santral`, ad: 'kurtarmaya hazır değil' }
        : filo.kismi > 0
          ? { vurgu: `${filo.kismi} santral`, ad: 'kısmi hazırlıkta' }
          : { vurgu: `${santraller.length} santral`, ad: 'kurtarmaya hazır' };

  const filtreAktif = mercek !== 'hepsi';

  if (santraller.length === 0) {
    return (
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi eyebrow="Yedekleme & kurtarma" baslik="Yedekleme & kurtarma" />
        <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <BosIlk cumle="Kapsamınızda aktif santral yok." />
        </section>
      </main>
    );
  }

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Yedekleme & kurtarma · ${santraller.length} santral`}
          vurgu={baslik.vurgu}
          baslik={baslik.ad}
          vurguDurumu={filo.kritikYedeksiz > 0 ? 'bd' : undefined}
          metrikler={[
            // Yüzde gösterilen her yerde bilinmeyen payı da gösterilir (06 §A3).
            { deger: yuzde(filo.kapsama),
              yazi: `Beyan kapsaması · bilinmeyen ${yuzde(filo.bilinmeyenPayi)}` },
            { deger: filo.bayatTest, yazi: `Test ${TEST_ESIGI}g+`,
              durum: filo.bayatTest > 0 ? 'bd' : undefined },
            /* İki metrik BİLEREK ayrı: biri kapatılacak açık, öteki
               ölçülecek boşluk. Tek metriğe indirmek ikisini de yanlış
               gösterirdi (bilinmeyen ≠ sıfır, bilinmeyen ≠ ihlal). */
            { deger: filo.kritikYedeksiz, payda: filo.kritikToplam,
              yazi: 'Kritik varlıkta yedek açığı',
              durum: filo.kritikYedeksiz > 0 ? 'bd' : undefined },
            { deger: filo.kritikBilinmeyen, payda: filo.kritikToplam,
              yazi: 'Kritik varlıkta ölçüm yok',
              durum: filo.kritikBilinmeyen > 0 ? 'unk' : undefined },
          ]}
        />

        <div style={{ padding: '0 var(--gutter-op)' }}>
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id); setKuyrukAcik(false); }}
            kapsam={
              <span className="etiket">
                {filo.yedekli} / {filo.toplam} varlık beyanen yedekli
              </span>
            }
          />
        </div>

        <div className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          {politikaSayisi === 0 ? (
            <BosIlk
              cumle="Yedekleme politikası kaydı yok. Kayıtlar dışarıdan aktarılabilir ya da
                santral çekmecesinden elle tanımlanabilir."
              eylem={
                <Link href="/ice-aktarim" className="ab-dugme birincil"
                  style={{ display: 'inline-block' }}>
                  Yedekleme API&apos;sini bağla
                </Link>
              }
            />
          ) : gorunur.length === 0 && toplanan.length === 0 ? (
            filtreAktif ? <BosFiltre temizle={() => setMercek('hepsi')} />
              : <BosIlk cumle="Yedekleme kaydı yok." />
          ) : (
            <Tablo
              kolonlar={KOLONLAR}
              konuBasligi="Santral"
              satirlar={satirlar}
              secili={secili}
              sec={(id) => setSecili((o) => (o === id ? null : id))}
              kuyruk={toplanan.length > 0
                ? { metin: `+${toplanan.length} santral · kapsama tam, restore kanıtı güncel`,
                  ac: () => setKuyrukAcik(true) }
                : null}
              dipNot={dipNot(filo)}
            />
          )}
          {kuyrukAcik && (
            <p className="ab-dip" style={{ marginTop: 'var(--s10)' }}>
              <button type="button" className="ab-dugme satir"
                onClick={() => setKuyrukAcik(false)}>Kuyruğu topla</button>
            </p>
          )}
        </div>
      </main>

      {secilen && <SantralCekmecesi santral={secilen} kapat={() => setSecili(null)} />}
    </>
  );
}

function dipNot(filo: ReturnType<typeof filoOzeti>): string {
  const parcalar = ['Satıra tıklayınca çekmece · kapsama barında tür kırılımı'];
  if (filo.testYok > 0) parcalar.push(`${filo.testYok} santralde hiç restore testi kaydı yok`);
  if (!filo.varlikKaynagiBagli) {
    /* Kaynak hiç bağlı değilse "kritik varlıkların yedeği yok" DENMEZ. Bu
       cümle olmadan gri sayı sessizce sıfır gibi okunurdu. */
    parcalar.push('konfigürasyon yedeği kaynağı hiç bağlı değil — '
      + 'kritik varlık ölçümü YAPILMADI, sonuç "yedek yok" değil');
  }
  if (filo.bilinmeyen > 0) {
    parcalar.push(`${filo.bilinmeyen} varlığın envanter beyanı bilinmiyor — paydada, kapsamada değil`);
  }
  if (filo.politikasiz > 0) parcalar.push(`${filo.politikasiz} santralin politikası yok`);
  if (filo.acikBulgu > 0) parcalar.push(`${filo.acikBulgu} açık yedek bulgusu insan kararı bekliyor`);
  if (filo.celiski > 0) parcalar.push(`${filo.celiski} katman çelişkisi`);
  return parcalar.join(' · ');
}

/* ── Hücreler ─────────────────────────────────────────────────────────── */

function KapsamaHucresi({ santral, oran }: { santral: Santral; oran: number | null }) {
  if (oran === null) {
    // unknown ≠ zero: %0 barı değil bilinmeyen elması + em tire.
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s10)' }}>
        <Im durum="unk" ad="Kapsama ölçülmedi" />
        <span style={{ color: 'var(--i3)' }}>—</span>
      </span>
    );
  }
  return (
    <Ipucu genis metin={kirilimMetni(santral)}>
      {/* blok kutu: `.ilerleme` esnek öğe olarak değil, kutunun tamamını
          kaplayan blok olarak açılsın ki iz (`flex:1`) genişleyebilsin. */}
      <span style={{ display: 'block', width: BAR_KUTU }}>
        <Bar oran={oran} durum={barDurumu(oran)} deger={yuzde(oran)} />
      </span>
    </Ipucu>
  );
}

/* ── Çekmece ──────────────────────────────────────────────────────────── */

type Kip = 'ozet' | 'politika';

function SantralCekmecesi({ santral, kapat }: { santral: Santral; kapat: () => void }) {
  const [kip, setKip] = useState<Kip>('ozet');
  const im = hazirlik(santral);
  const oran = kapsama(santral);
  const bilinmeyen = bilinmeyenPayi(santral);
  const gun = testGunu(santral);
  const haric = haricListesi(santral.politika);
  const p = santral.politika;
  const test = sonTest(santral);
  const kosu = sonKosu(santral);
  const vk = santral.varlikKatmani;

  /* Kimlik bloğu durumu KELİMEYLE söyleyebilen tek yer; sözcük mümkün olan
     en dar gerekçeyi taşır ki satırdaki işaretçiyle örtüşsün. */
  const soz = !p ? 'Yedekleme politikası yok'
    : vk.yedeksiz.length > 0 ? `${vk.yedeksiz.length} kritik varlığın yedeği yok`
      : gun === null ? 'Restore testi yok'
        : gun > TEST_ESIGI ? `Restore kanıtı ${gun} gün eski`
          : test?.sonuc === 'basarisiz' ? 'Son restore testi başarısız'
            : SOZ[im];

  if (kip === 'politika') {
    return (
      <Cekmece kod={`${santral.kod} · Yedekleme politikası`} kapat={kapat}>
        <div className="ab-panel-blok">
          <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>
            {p ? 'Politikayı düzenle' : 'Politika tanımla'}
          </p>
        </div>
        <div className="ab-panel-blok">
          <PolitikaFormu santral={santral} kapat={() => setKip('ozet')} />
        </div>
      </Cekmece>
    );
  }

  return (
    <Cekmece kod={`${santral.kod} · Yedekleme & DR`} kapat={kapat}>
      <CekmeceKimlik
        durum={im}
        soz={soz}
        baslik={santral.ad}
        cumle={`Envanter beyanı: ${santral.yedekli} varlık kapsamda, ${santral.yedeksiz} `
          + `dışında, ${santral.bilinmeyen} bilinmiyor. Ölçüm: ${vk.yedegiVar}/${vk.toplamKritik} `
          + `kritik varlığın kullanılabilir yedeği doğrulandı.`}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Beyan kapsaması',
          deger: `${yuzde(oran)} · bilinmeyen ${yuzde(bilinmeyen)}`,
          durum: oran !== null && oran < KAPSAMA_ESIGI ? 'md'
            : oran !== null && oran >= BAR_OK_ESIGI ? 'ok' : undefined },
        { etiket: 'RPO · kabul edilen veri kaybı',
          deger: p?.rpoSaat != null ? `${p.rpoSaat} saat` : '—',
          durum: p?.rpoSaat == null ? 'unk' : undefined },
        { etiket: 'RTO · hedeflenen kurtarma',
          deger: p?.rtoSaat != null ? `${p.rtoSaat} saat` : '—',
          durum: p?.rtoSaat == null ? 'unk' : undefined },
        { etiket: 'Sıklık', deger: p?.siklik ? etiketle(p.siklik) : '—' },
        { etiket: 'Saklama', deger: p?.saklamaGun != null ? `${p.saklamaGun} gün` : '—' },
        { etiket: 'Hedef', deger: p?.hedef ? etiketle(p.hedef) : '—' },
      ]} />

      {/* ── Santral katmanı ── */}
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
          Santral katmanı · politika → koşu → geri yükleme testi
        </p>
        <p className="ab-panel-dip" style={{ margin: '0 0 var(--s12)' }}>
          {santral.santralKatmani.gerekce}
        </p>

        {test ? (
          <div style={{ borderLeft: 'var(--bw-edge) solid var(--hr2)', paddingLeft: 'var(--s12)',
            display: 'grid', gap: 'var(--s4)' }}>
            <span style={{ fontSize: 'var(--t-field)', fontWeight: 600,
              color: gun !== null && gun > TEST_ESIGI ? 'var(--bd)' : 'var(--murekkep)' }}>
              {tarihTR(test.zaman)} · {gun} gün önce
            </span>
            <span className="mono" style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
              {etiketle(test.sonuc)}{test.sureDk != null && ` · ${test.sureDk} dk`}
            </span>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 'var(--t-field)',
            color: santral.santralKatmani.bagli ? 'var(--bd)' : 'var(--unk)' }}>
            {santral.santralKatmani.bagli
              ? 'Geri yükleme testi kaydı yok — bu santralde yedeğin geri döndüğü hiç kanıtlanmadı.'
              : 'Politika bağı olmadığı için santral katmanı ölçülmedi — "test yok" DEĞİL.'}
          </p>
        )}

        {kosu && (
          <>
            <Segment ok={santral.kosuOzeti.basarili} md={santral.kosuOzeti.kismi}
              bd={santral.kosuOzeti.basarisiz} />
            <p className="mono" style={{ margin: 'var(--s10) 0 0', fontSize: 'var(--t-label)',
              color: 'var(--i3)' }}>
              Son koşu {tarihTR(kosu.zaman)} · {etiketle(kosu.durum)}
            </p>
            {kosu.hata && (
              <p style={{ margin: 'var(--s8) 0 0', fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
                {kosu.hata}
              </p>
            )}
          </>
        )}

        {santral.yazabilir && (
          <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s14)' }}>
            {p ? <KosuKaydet santral={santral} /> : null}
            {p ? <RestoreTestiKaydet santral={santral} /> : null}
            <Dugme onClick={() => setKip('politika')}>
              {p ? 'Politikayı düzenle' : 'Politika tanımla'}
            </Dugme>
          </div>
        )}
      </div>

      {/* ── Varlık katmanı ── */}
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
          Varlık katmanı · kritik varlıkların konfigürasyon yedeği
        </p>

        {!vk.kaynakBagli && (
          <p style={{ margin: '0 0 var(--s12)', display: 'flex', alignItems: 'center',
            gap: 'var(--s6)', fontSize: 'var(--t-field)', color: 'var(--unk)' }}>
            <Im durum="unk" ad="Kaynak bağlı değil" />
            Konfigürasyon yedeği kaynağı bağlı değil — aşağıdaki liste bir açık
            değil, bir ölçüm boşluğudur.
          </p>
        )}

        <p className="mono" style={{ margin: '0 0 var(--s8)', fontSize: 'var(--t-label)',
          color: 'var(--i3)' }}>
          Kanıtlı yedek açığı · {vk.yedeksiz.length}
        </p>
        {vk.yedeksiz.length === 0 ? (
          <p style={{ margin: '0 0 var(--s16)', fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
            Kanıtlı yedek açığı yok.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s12)', marginBottom: 'var(--s16)' }}>
            {vk.yedeksiz.slice(0, 8).map((v) => (
              <VarlikYedegi key={v.varlikId} varlik={v} kaynakBagli={vk.kaynakBagli} />
            ))}
            {vk.yedeksiz.length > 8 && (
              <p className="ab-panel-dip" style={{ margin: 0 }}>
                +{vk.yedeksiz.length - 8} varlık daha
              </p>
            )}
          </div>
        )}

        <p className="mono" style={{ margin: '0 0 var(--s8)', fontSize: 'var(--t-label)',
          color: 'var(--i3)' }}>
          Ölçülmemiş · {vk.bilinmeyen.length}
        </p>
        {vk.bilinmeyen.length === 0 ? (
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
            Ölçülmemiş kritik varlık yok.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s12)' }}>
            {vk.bilinmeyen.slice(0, 8).map((v) => (
              <VarlikYedegi key={v.varlikId} varlik={v} kaynakBagli={vk.kaynakBagli} />
            ))}
            {vk.bilinmeyen.length > 8 && (
              <p className="ab-panel-dip" style={{ margin: 0 }}>
                +{vk.bilinmeyen.length - 8} varlık daha
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Çelişkiler: iki katman birbirini yalanlıyorsa örtülmez ── */}
      {santral.celiskiler.length > 0 && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
            Katman çelişkisi · {santral.celiskiler.length}
          </p>
          <div style={{ display: 'grid', gap: 'var(--s10)' }}>
            {santral.celiskiler.map((c) => (
              <div key={c} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
                alignItems: 'start', gap: 'var(--s8)' }}>
                <span style={{ paddingTop: 3 }}><Im durum="md" ad="Katman çelişkisi" /></span>
                <span style={{ fontSize: 'var(--t-field)' }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Motorun ürettiği, insan kararı bekleyen bulgular ── */}
      {santral.bulgular.length > 0 && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
            Açık yedek bulgusu · {santral.bulgular.length}
          </p>
          <div style={{ display: 'grid', gap: 'var(--s14)' }}>
            {santral.bulgular.slice(0, 6).map((b) => (
              <BulguIsle key={b.id} bulgu={b} yetkili={santral.bulguIsleyebilir} />
            ))}
          </div>
          <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
            Motor bulguyu kendisi kapatamaz; koşul gerçekten düzelirse bir sonraki
            koşuda çözülür. &quot;Yok sayma&quot; kararı insanındır ve gerekçesi izde durur.
          </p>
        </div>
      )}

      {/* ── Politikanın kendi beyanı: kapsam dışı sistemler ── */}
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
          Politikada hariç tutulan sistemler
        </p>
        {haric.length === 0 ? (
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
            {p ? 'Beyan edilmiş kapsam dışı sistem yok.' : 'Politika yok — beyan da yok.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s10)' }}>
            {haric.map((x) => (
              <div key={x} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
                alignItems: 'start', gap: 'var(--s8)' }}>
                <span style={{ paddingTop: 3 }}><Im durum="md" ad="Politikada hariç tutulmuş" /></span>
                <span style={{ fontSize: 'var(--t-field)' }}>{x}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <CekmeceBagli kayitlar={[
        { id: 'tesis', kod: santral.kod, alt: santral.ad, yol: `/tesisler/${santral.id}` },
        { id: 'envanter', kod: 'Varlık envanteri', alt: `${santral.toplam} kayıt`, yol: '/envanter' },
      ]} />

      <TestPlanla santral={santral} />
    </Cekmece>
  );
}

/* `Test planla` yeni bir mutasyon yazmaz: var olan gorevOlustur server
   action'ını `dogrulama` tipiyle çağırır. Yetki (uyum/yazma + tesis kapsamı)
   sunucuda zaten kontrol edilir; burada yalnız yüzeyi kapatıyoruz. */
function TestPlanla({ santral }: { santral: Santral }) {
  const [tarih, setTarih] = useState('');
  const [calisiyor, setCalisiyor] = useState(false);
  const [sonuc, setSonuc] = useState<{ ok: boolean; mesaj: string } | null>(null);

  if (!santral.planlanabilir) {
    return (
      <CekmeceEylemler dipNot={'Restore testi planlamak uyum yazma yetkisi ister; '
        + 'bu santral kapsamında yetkiniz yok.'} />
    );
  }

  async function planla() {
    setCalisiyor(true);
    setSonuc(null);
    const r = await gorevOlustur({
      baslik: `Restore testi · ${santral.ad}`,
      tip: 'dogrulama',
      tesisId: santral.id,
      sonTarih: tarih || null,
    });
    setCalisiyor(false);
    setSonuc(r.ok
      ? { ok: true, mesaj: 'Doğrulama görevi açıldı ve denetim izine yazıldı.' }
      : { ok: false, mesaj: r.hata });
  }

  return (
    <CekmeceEylemler
      birincil={
        <div style={{ display: 'grid', gap: 'var(--s12)' }}>
          <Alan etiket="Hedef tarih">
            <input className="ab-gr" type="date" value={tarih}
              onChange={(e) => { setTarih(e.target.value); setSonuc(null); }} />
          </Alan>
          <Dugme tur="tam" disabled={calisiyor} onClick={planla}>
            {calisiyor ? 'Planlanıyor…' : 'Test planla'}
          </Dugme>
          {sonuc && (
            <p style={{ margin: 0, fontSize: 'var(--t-field)',
              color: sonuc.ok ? 'var(--ok)' : 'var(--bd)' }} role="status">
              {sonuc.mesaj}
            </p>
          )}
        </div>
      }
      dipNot={'Görev doğrulama kuyruğuna düşer; test yürütülüp sonucu kaydedilene kadar '
        + 'bu santralin restore kanıtı değişmez.'}
    />
  );
}
