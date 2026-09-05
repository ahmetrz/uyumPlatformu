'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import {
  Alan, BosFiltre, BosIlk, Dugme, Im, type Durum,
} from '@/components/kabuk/temel';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi, Filtreler } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import BaglamCubugu from '@/components/kabuk/BaglamCubugu';
import { DENKLIK_ETIKET, DURUM_ETIKET, GUVEN_ETIKET, ONEM_ETIKET, tarihTR } from '@/lib/sabitler';
import { Ara, DisaAktar, Kapsam } from '../Kontroller';
import { useEylem } from '@/components/useEylem';
import { an } from '@/lib/an';
import { degerlendirmeDogrula, kontrolEkibiAta } from '@/lib/eylemler2/uyumSahiplik';
import { kontrolTestiKaydet, olgunlukKaydet } from '@/lib/eylemler2/uyumOlcum';
import {
  OLGUNLUK_ADI, OLGUNLUK_KISA, OLGUNLUK_SINIFI, OLGUNLUK_SOZU, olgunlukDurumu,
} from '@/lib/uyum/olgunluk';
import {
  DURUS_SINIFI, DURUS_SOZU, SONUC_ETIKETI, YONTEM_ETIKETI, testDurusu,
} from '@/lib/uyum/kontrolTesti';
import {
  DOGRULAMA_SINIFI, DOGRULAMA_SOZU, SAHIPLIK_SINIFI, SAHIPLIK_SOZU,
  dogrulamaDurumu, kontrolSahipligi,
} from '@/lib/uyum/kontrolSahipligi';
import { eksikDagilimi, kapsamaCumlesi, kapsamaOzeti } from '@/lib/uyum/kapsama';
import {
  BulguFormu, DegerlendirmeFormu, IstisnaFormu, KanitFormu,
} from '../Formlar';
import {
  butcele, degerlendirmeAlti, degerlendirmeCumlesi, degerlendirmeImi,
  degerlendirmeSirasi, degerlendirmeSozu, gecikti, gunAy, kalanGun,
  kanitMetni, kanitYok, santralMetni, takipte,
  type Degerlendirme, type Kisi, type S,
} from '../ortak';

/* Kampanya kaydı — "bu kampanyada hangi madde hangi santralde takılı?"

   Tek canvas modülü vardır: öncelik tablosu. Kayıt ekranı bir matris
   KURMAZ — santral × kontrol matrisi /uyum'un işi; burada satır bir
   değerlendirme kaydıdır ve sahibi, kanıtı, bulgusu ile yönetilir.

   Durum sözcüğü canvasta geçmez; yalnız çekmecenin kimlik bloğunda. */

/** 06 §A3: tabloda 5–9 satır. Kritik satırlar öne sabitlenir ama bütçeyi
    delmez — kuyruk kaç takip kaydı taşıdığını sayıyla söyler. */
const GORUNUR_BUTCE = 8;

const KOLONLAR: Kolon[] = [
  { baslik: 'Santral', genislik: '132px', siraAnahtari: 'santral' },
  { baslik: 'Sorumlu', genislik: '140px', ikincil: true },
  { baslik: 'Kanıt', genislik: '106px' },
  { baslik: 'Değerlendirme', genislik: '116px', siraAnahtari: 'zaman' },
];

const MERCEKLER = [
  { id: 'takip', ad: 'Takipte' },
  { id: 'uyumsuz', ad: 'Uyumsuz' },
  { id: 'bilinmeyen', ad: 'Bilinmeyen' },
  { id: 'kanitsiz', ad: 'Kanıtsız' },
  { id: 'hepsi', ad: 'Tümü' },
];

export type DetayVerisi = {
  surec: S;
  simdi: number;
  kayitlar: Degerlendirme[];
  kullanicilar: Kisi[];
  alanlar: { kod: string; ad: string }[];
  yazabilir: boolean;
  /** UY-07 · sorumlu ekip seçenekleri (aktif ekipler). */
  ekipler: { id: string; kod: string; ad: string; aktifUye: number }[];
};

type Anahtar = 'konu' | 'santral' | 'zaman';
type SiraYonu = 'artan' | 'azalan';
type Kip = 'ozet' | 'degerlendir' | 'bulgu' | 'kanit' | 'istisna';

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

export default function SurecDetayIstemci({ veri }: { veri: DetayVerisi }) {
  const { surec: s, simdi, kayitlar } = veri;
  const [mercek, setMercek] = useUrlDurumu<string>('mercek', 'takip');
  const [tesisF, setTesisF] = useUrlDurumuBos('tesis');
  const [alanF, setAlanF] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [sira, setSira] = useState<{ anahtar: Anahtar; yon: SiraYonu } | null>(null);
  const [secili, setSecili] = useUrlDurumuBos('sec');
  const [kip, setKip] = useUrlDurumu<Kip>('kip', 'ozet');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  /* ── mercek + kapsam ───────────────────────────────────────────────── */
  const suzulmus = useMemo(() => kayitlar.filter((d) => {
    if (mercek === 'takip' && !takipte(d)) return false;
    if (mercek === 'uyumsuz' && !(d.durum === 'uyumsuz' || d.acikBulgu > 0)) return false;
    if (mercek === 'bilinmeyen'
      && !(d.durum === 'incelemede' || d.durum === 'degerlendirilmedi')) return false;
    if (mercek === 'kanitsiz' && !kanitYok(d)) return false;
    if (tesisF && d.tesis.id !== tesisF) return false;
    if (alanF && !d.madde.alanlar.includes(alanF)) return false;
    if (arama) {
      const havuz = `${d.madde.kod} ${d.madde.baslik} ${d.madde.bolum} `
        + `${d.tesis.kod} ${d.tesis.ad} ${d.sorumlu?.ad ?? ''}`;
      if (!havuz.toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    }
    return true;
  }), [kayitlar, mercek, tesisF, alanF, arama]);

  /* Uyumsuz ve açık bulgulu satırlar sıralamadan bağımsız üste sabitlenir
     (06 §A2); kuyruğa yalnız bütçe dolduğunda ve sayısı kuyruk etiketinde
     yazılı olarak iner. */
  const bolumler = useMemo(() => {
    const karsilastir = (x: Degerlendirme, y: Degerlendirme) => {
      if (!sira) return degerlendirmeSirasi(x, y);
      const yon = sira.yon === 'artan' ? 1 : -1;
      switch (sira.anahtar) {
        case 'santral':
          return x.tesis.kod.localeCompare(y.tesis.kod, 'tr') * yon;
        case 'zaman': {
          // Hiç değerlendirilmemiş kayıt en sona iner; "eski" sayılmaz.
          const a = x.sonDegerlendirme ? Date.parse(x.sonDegerlendirme) : Number.POSITIVE_INFINITY;
          const b = y.sonDegerlendirme ? Date.parse(y.sonDegerlendirme) : Number.POSITIVE_INFINITY;
          return (a - b) * yon;
        }
        default:
          return x.madde.baslik.localeCompare(y.madde.baslik, 'tr') * yon;
      }
    };
    return {
      sabit: suzulmus.filter((d) => degerlendirmeImi(d) === 'bd').sort(karsilastir),
      kalan: suzulmus.filter((d) => degerlendirmeImi(d) !== 'bd').sort(karsilastir),
    };
  }, [suzulmus, sira]);

  const { gorunur, toplanan, toplananSabit } = useMemo(
    () => butcele(bolumler.sabit, bolumler.kalan, GORUNUR_BUTCE, kuyrukAcik),
    [bolumler, kuyrukAcik],
  );

  const secilen = kayitlar.find((d) => d.id === secili) ?? null;
  const filtreAktif = mercek !== 'takip' || tesisF !== null || alanF !== null
    || arama.trim() !== '';

  const satirlar: Satir[] = gorunur.map((d) => {
    const im = degerlendirmeImi(d);
    const kanit = kanitMetni(d);
    return {
      id: d.id,
      durum: im,
      kenar: im,
      konu: d.madde.baslik,
      alt: `${degerlendirmeAlti(d)} · ${d.madde.bolum}`,
      hucreler: [
        d.tesis.ad,
        d.sorumlu?.ad ?? <span key="s" style={{ color: 'var(--md)' }}>atanmadı</span>,
        <span key="k" style={kanit.durum ? { color: `var(--${kanit.durum})` } : undefined}>
          {kanit.metin}
        </span>,
        d.sonDegerlendirme
          ? gunAy(Date.parse(d.sonDegerlendirme))
          : <Bos key="z" />,
      ],
    };
  });

  const kalan = kalanGun(s, simdi);
  const acikBulgu = kayitlar.reduce((a, d) => a + d.acikBulgu, 0);
  const takipSayisi = kayitlar.filter(takipte).length;

  const baslik = s.sayim.uyumsuz > 0
    ? { vurgu: `${s.sayim.uyumsuz} madde`, ad: 'uyumsuz', durum: 'bd' as Durum }
    : takipSayisi > 0
      ? { vurgu: `${takipSayisi} madde`, ad: 'takipte', durum: undefined }
      : { vurgu: undefined, ad: 'Takipte madde yok', durum: undefined };

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <BaglamCubugu
          kirintiler={[
            { ad: 'Uyum kampanyaları', yol: '/surecler' },
            { ad: s.kod },
          ]}
          sag={
            <Link href={`/uyum/${encodeURIComponent(s.regulasyon.kod)}`} className="ab-dugme satir">
              {s.regulasyon.kod} çerçevesi ▸
            </Link>
          }
        />

        <EkranBasligi
          eyebrow={`${s.ad} · ${santralMetni(s)} kapsamda`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            {
              deger: s.sayim.yuzde === null ? '—' : `%${s.sayim.yuzde}`,
              yazi: 'Uyum',
              durum: s.sayim.yuzde === null ? 'unk' : undefined,
            },
            {
              deger: s.sayim.bilinmeyen,
              payda: s.sayim.toplam > 0 ? s.sayim.toplam : undefined,
              yazi: 'Bilinmeyen',
              durum: s.sayim.bilinmeyen > 0 ? 'unk' : undefined,
            },
            { deger: acikBulgu, yazi: 'Açık bulgu', durum: acikBulgu > 0 ? 'bd' : undefined },
            {
              deger: kalan === null ? '—' : kalan < 0 ? `+${-kalan}` : kalan,
              yazi: kalan !== null && kalan < 0 ? 'Gün aşıldı' : 'Gün kaldı',
              durum: kalan === null ? 'unk' : gecikti(s, simdi) ? 'bd' : undefined,
            },
          ]}
        />

        <HazirlikBlogu kayitlar={kayitlar} simdi={simdi} />

        <section className="ab-ekran-govde">
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Ara etiket="Madde, bölüm ya da santral ara" deger={arama}
                  degistir={(v) => { setArama(v); setKuyrukAcik(false); }} />
                <Kapsam etiket="Santral" aktif={tesisF}
                  sec={(id) => { setTesisF(id); setKuyrukAcik(false); }}
                  secenekler={s.tesisler.map((t) => ({ id: t.id, ad: t.ad }))} />
                <Kapsam etiket="Alan" aktif={alanF}
                  sec={(id) => { setAlanF(id); setKuyrukAcik(false); }}
                  secenekler={veri.alanlar.map((a) => ({ id: a.kod, ad: `${a.kod} — ${a.ad}` }))} />
              </>
            }
          />

          {gorunur.length > 0 || toplanan.length > 0 ? (
            <div style={{ marginTop: 'var(--s24)' }}>
              <Tablo
                sik
                konuBasligi="Madde"
                kolonlar={KOLONLAR}
                satirlar={satirlar}
                secili={secili}
                sec={(id) => { setSecili((o) => (o === id ? null : id)); setKip('ozet'); }}
                sirala={{
                  anahtar: sira?.anahtar ?? '',
                  yon: sira?.yon ?? 'artan',
                  degistir: (a) => setSira((o) => ({
                    anahtar: a as Anahtar,
                    yon: o?.anahtar === a && o.yon === 'artan' ? 'azalan' : 'artan',
                  })),
                }}
                kuyruk={toplanan.length > 0
                  ? {
                    /* Kuyruk ne taşıdığını SAYIYLA söyler: kritik kayıt
                       sessizce gömülmez, tek tıkla açılır. */
                    metin: toplananSabit > 0
                      ? `+${toplanan.length} değerlendirme · ${toplananSabit} tanesi öncelikli`
                      : `+${toplanan.length} değerlendirme · takip gerektirmiyor`,
                    ac: () => setKuyrukAcik(true),
                  }
                  : null}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s16)',
                padding: 'var(--s14) 0 0' }}>
                <p className="ab-dip" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                  {dipNot({
                    gorunur: gorunur.length,
                    takipte: takipSayisi,
                    bilinmeyen: s.sayim.bilinmeyen,
                    kapsamDisi: s.sayim.kapsamDisi,
                    elSirali: sira !== null,
                  })}
                </p>
                <DisaAktar
                  dosya={s.kod}
                  sayfaAdi="Madde durumları"
                  basliklar={['Madde', 'Başlık', 'Bölüm', 'Santral', 'Durum', 'Sorumlu',
                    'Son değerlendirme', 'Açık bulgu', 'Kanıt']}
                  satirlar={suzulmus.map((d) => [
                    d.madde.kod, d.madde.baslik, d.madde.bolum, d.tesis.kod,
                    DURUM_ETIKET[d.durum as keyof typeof DURUM_ETIKET] ?? d.durum,
                    d.sorumlu?.ad ?? '',
                    d.sonDegerlendirme ? tarihTR(d.sonDegerlendirme) : '',
                    d.acikBulgu, d.kanitlar.length,
                  ])} />
              </div>
            </div>
          ) : filtreAktif ? (
            <BosFiltre temizle={() => {
              setMercek('takip'); setTesisF(null); setAlanF(null); setArama('');
            }} />
          ) : (
            <div style={{ marginTop: 'var(--s26)' }}>
              <BosIlk
                cumle={s.tesisler.length === 0
                  ? 'Kapsamda santral yok — değerlendirme açılmadı.'
                  : 'Bu kampanyada değerlendirme kaydı yok; regülasyonun yaprak maddesi bulunmuyor.'}
                eylem={
                  <Link className="ab-dugme birincil" href="/surecler">
                    {s.tesisler.length === 0 ? 'Kapsamı düzenle' : 'Kampanya kütüğü'}
                  </Link>
                }
              />
            </div>
          )}
        </section>
      </main>

      {secilen && (
        <Cekmece kod={`${secilen.madde.kisaKod} · ${secilen.tesis.kod}`}
          kapat={() => { setSecili(null); setKip('ozet'); }}>
          {kip === 'ozet' ? (
            <Ozet
              kayit={secilen}
              ekipler={veri.ekipler}
              yazabilir={veri.yazabilir}
              git={setKip}
            />
          ) : (
            <>
              <div className="ab-panel-blok">
                <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>
                  {KIP_BASLIGI[kip]}
                </p>
              </div>
              <div className="ab-panel-blok">
                {kip === 'degerlendir' && (
                  <DegerlendirmeFormu kayit={secilen} kullanicilar={veri.kullanicilar}
                    kapat={() => setKip('ozet')} />
                )}
                {kip === 'bulgu' && (
                  <BulguFormu kayit={secilen} kapat={() => setKip('ozet')} />
                )}
                {kip === 'kanit' && (
                  <KanitFormu kayit={secilen} kapat={() => setKip('ozet')} />
                )}
                {kip === 'istisna' && (
                  <IstisnaFormu kayit={secilen} kapat={() => setKip('ozet')} />
                )}
              </div>
            </>
          )}
        </Cekmece>
      )}
    </>
  );
}

const KIP_BASLIGI: Record<Exclude<Kip, 'ozet'>, string> = {
  degerlendir: 'Değerlendirmeyi güncelle',
  bulgu: 'Bulgu aç',
  kanit: 'Kanıt bağla',
  istisna: 'İstisna talep et',
};

function dipNot({ gorunur, takipte: takipSayisi, bilinmeyen, kapsamDisi, elSirali }: {
  gorunur: number; takipte: number; bilinmeyen: number;
  kapsamDisi: number; elSirali: boolean;
}): string {
  const parcalar = [`${gorunur} / ${takipSayisi} takip satırı görünüyor`];
  parcalar.push(elSirali ? 'kolon başlığından sıralama' : 'sıralama önceliğe göre');
  // Bilinmeyen sıfır sayılmaz: kaç madde hiç değerlendirilmedi.
  if (bilinmeyen > 0) parcalar.push(`${bilinmeyen} madde değerlendirilmedi`);
  if (kapsamDisi > 0) parcalar.push(`${kapsamDisi} madde kapsam dışı`);
  return parcalar.join(' · ');
}

/* ── Çekmece özeti ──────────────────────────────────────────────────── */

function Ozet({ kayit, yazabilir, ekipler, git }: {
  kayit: Degerlendirme;
  yazabilir: boolean;
  ekipler: { id: string; kod: string; ad: string; aktifUye: number }[];
  git: (k: Kip) => void;
}) {
  const im = degerlendirmeImi(kayit);
  const kanit = kanitMetni(kayit);

  const bulguBaglari = kayit.bulgular.slice(0, 4).map((b) => ({
    id: `b-${b.id}`,
    kod: b.baslik,
    alt: `${ONEM_ETIKET[b.onem as keyof typeof ONEM_ETIKET] ?? b.onem} · bulgu`,
    yol: `/bulgular/${b.id}`,
    suren: b.durum === 'acik' || b.durum === 'aksiyonda',
  }));

  return (
    <>
      {/* Durum SÖZCÜĞÜ ürün genelinde yalnız burada geçer (06 §A2). */}
      <CekmeceKimlik
        durum={im}
        soz={degerlendirmeSozu(kayit)}
        baslik={`${kayit.madde.kisaKod} — ${kayit.madde.baslik}`}
        cumle={degerlendirmeCumlesi(kayit)}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Santral', deger: kayit.tesis.ad },
        {
          etiket: 'Sorumlu',
          deger: kayit.sorumlu?.ad ?? 'atanmadı',
          durum: kayit.sorumlu ? undefined : 'md',
        },
        { etiket: 'Kanıt', deger: kanit.metin, durum: kanit.durum },
        {
          etiket: 'Son değerlendirme',
          deger: kayit.sonDegerlendirme ? tarihTR(kayit.sonDegerlendirme) : 'hiç yapılmadı',
          durum: kayit.sonDegerlendirme ? undefined : 'unk',
        },
      ]} />

      <SahiplikBlogu kayit={kayit} ekipler={ekipler} />

      <OlgunlukBlogu kayit={kayit} yazabilir={yazabilir} />
      <TestBlogu kayit={kayit} yazabilir={yazabilir} />

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Madde metni</p>
        <p style={{ margin: 0, fontSize: 'var(--t-cell)', lineHeight: 1.7, color: 'var(--i2)' }}>
          {kayit.madde.metin}
        </p>
        <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
          {kayit.madde.bolum}
          {kayit.madde.alanlar.length > 0 && ` · ${kayit.madde.alanlar.join(' · ')}`}
          {kayit.madde.kanitTipi && ` · beklenen kanıt ${kayit.madde.kanitTipi}`}
        </p>
      </div>

      {bulguBaglari.length > 0 && (
        <CekmeceBagli
          baslik={kayit.bulgular.length > 4 ? `Bulgular · ${kayit.bulgular.length} kayıt` : 'Bulgular'}
          kayitlar={bulguBaglari}
        />
      )}

      {kayit.kanitlar.length > 0 && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Kanıtlar</p>
          {kayit.kanitlar.map((k) => (
            <div key={k.id} className="ab-panel-alan">
              <span className="etiket">{k.tip}</span>
              <span className="deger" style={{ fontWeight: 400 }}>
                {k.ad} · {tarihTR(k.baslangic)}
              </span>
            </div>
          ))}
        </div>
      )}

      {kayit.madde.esler.length > 0 && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Çapraz eşleme</p>
          {kayit.madde.esler.slice(0, 5).map((e) => (
            <div key={e.kod} className="ab-panel-alan">
              <span className="etiket">{e.kod}</span>
              <span className="deger" style={{ fontWeight: 400 }}>
                {DENKLIK_ETIKET[e.denklik as keyof typeof DENKLIK_ETIKET] ?? e.denklik}
              </span>
            </div>
          ))}
          <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
            Aynı kanıt eşleşen maddeleri de karşılayabilir ·{' '}
            <Link className="ab-dugme satir" style={{ fontSize: 'inherit', fontWeight: 400 }}
              href="/eslestirme">Eşleme kütüğü ▸</Link>
          </p>
        </div>
      )}

      <CekmeceEylemler
        birincil={yazabilir
          ? <Dugme tur="tam" onClick={() => git('degerlendir')}>Değerlendir</Dugme>
          : undefined}
        ikincil={yazabilir && (
          <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
            <Dugme onClick={() => git('bulgu')}>Bulgu aç</Dugme>
            <Dugme onClick={() => git('kanit')}>Kanıt</Dugme>
            <Dugme onClick={() => git('istisna')}>İstisna</Dugme>
          </div>
        )}
        dipNot={`${kayit.madde.kod} · ${GUVEN_ETIKET[kayit.guven as keyof typeof GUVEN_ETIKET] ?? kayit.guven}`
          + (yazabilir ? '' : ' · yazma yetkiniz yok, kayıt salt okunur')}
      />
    </>
  );
}

/* ═══ UY-07 · Sorumluluk zinciri ve dört göz ═══════════════════════════

   Kontrolün "sorumlusu" tek bir kullanıcı kimliğiydi ve üç şeyi birden
   yapamıyordu: kişi ayrıldığında kontrol öksüz kalıyordu, hazırlayan ile
   doğrulayan aynı kişi olabiliyordu, ve sorumlu değişikliği denetim
   izine DÜŞMÜYORDU (ölçülmüş kusur; `maddeDurumGuncelle` içinde
   düzeltildi).

   ── DOĞRULAMA BİR ONAY DEĞİLDİR ───────────────────────────────────────
   Onay akışı ayrı bir mekanizmadır. Buradaki doğrulama, kararı verenden
   BAŞKA birinin dayanağı okuyup "yeterli" demesidir. Kendi kararını
   doğrulamak hiç doğrulanmamış olmakla aynı kapıya çıkar — ama ekranda
   "doğrulandı" yazar; bu yüzden düğme hiç görünmez ve sunucu da
   reddeder. */

function SahiplikBlogu({ kayit, ekipler }: {
  kayit: Degerlendirme;
  ekipler: { id: string; kod: string; ad: string; aktifUye: number }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [ekipAcik, setEkipAcik] = useState(false);
  const [ekipSecim, setEkipSecim] = useState(kayit.ekip?.id ?? '');
  const [dogrulamaAcik, setDogrulamaAcik] = useState(false);
  const [gerekce, setGerekce] = useState('');

  const sahiplik = kontrolSahipligi({
    sorumlu: kayit.sorumlu
      ? { id: kayit.sorumlu.id, ad: kayit.sorumlu.ad, aktif: kayit.sorumluAktif }
      : null,
    ekip: kayit.ekip
      ? {
        id: kayit.ekip.id, kod: kayit.ekip.kod,
        aktif: kayit.ekip.aktif, aktifUye: kayit.ekip.aktifUye,
      }
      : null,
  });

  const dogrulama = dogrulamaDurumu({
    dogrulamaZamani: kayit.dogrulamaZamani ? Date.parse(kayit.dogrulamaZamani) : null,
    sonDegerlendirme: kayit.sonDegerlendirme ? Date.parse(kayit.sonDegerlendirme) : null,
    simdi: an(),
  });

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Sorumluluk ve doğrulama (UY-07)
      </p>
      <p style={{ margin: '0 0 var(--s12)', display: 'flex', alignItems: 'center',
        gap: 'var(--s8)', fontSize: 'var(--t-field)' }}>
        <Im durum={SAHIPLIK_SINIFI[sahiplik]} ad={SAHIPLIK_SOZU[sahiplik]} />
        {SAHIPLIK_SOZU[sahiplik]}
      </p>

      <dl className="ab-panel-ciftler">
        <div>
          <dt>Sorumlu ekip</dt>
          <dd className={kayit.ekip ? undefined : 'd-unk'}>
            {kayit.ekip
              ? `${kayit.ekip.kod} · ${kayit.ekip.aktifUye} aktif üye`
              : 'atanmadı'}
          </dd>
        </div>
        <div>
          <dt>Değerlendiren</dt>
          <dd className={kayit.degerlendiren ? undefined : 'd-unk'}>
            {kayit.degerlendiren?.ad ?? 'kayıtlı değil'}
          </dd>
        </div>
        <div>
          <dt>Doğrulama</dt>
          <dd className={`d-${DOGRULAMA_SINIFI[dogrulama]}`}>
            {DOGRULAMA_SOZU[dogrulama]}
            {kayit.dogrulayan && ` · ${kayit.dogrulayan.ad}`}
          </dd>
        </div>
      </dl>

      {dogrulama === 'degerlendirme_sonrasi_degisti' && (
        <p style={{ margin: 'var(--s10) 0 0', fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
          Doğrulamadan SONRA değerlendirme değişti: ekrandaki damga artık
          başka bir kararı işaret ediyor. Damga silinmedi — silmek, hiç
          doğrulanmamış izlenimi verirdi; yeniden doğrulanması gerekir.
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap',
        marginTop: 'var(--s12)' }}>
        {ekipler.length > 0 && !ekipAcik && (
          <Dugme onClick={() => setEkipAcik(true)}>
            {kayit.ekip ? 'Ekibi değiştir' : 'Ekip ata'}
          </Dugme>
        )}
        {kayit.dogrulayabilir && !dogrulamaAcik && (
          <Dugme tur="tam" onClick={() => setDogrulamaAcik(true)}>
            {kayit.dogrulayan ? 'Doğrulamayı geri al' : 'Değerlendirmeyi doğrula'}
          </Dugme>
        )}
      </div>

      {!kayit.dogrulayabilir && (
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
          {kayit.sonDegerlendirme === null
            ? 'Bu kontrol hiç değerlendirilmedi; doğrulanacak bir karar yok.'
            : kayit.degerlendiren === null
              ? 'Değerlendirmeyi kimin yaptığı kayıtlı değil; dört göz kanıtlanamaz.'
              : 'Doğrulama, kararı verenden BAŞKA birinin uyum onay yetkisiyle '
                + 'yapması gereken bir iştir.'}
        </p>
      )}

      {ekipAcik && (
        <div style={{ display: 'grid', gap: 'var(--s10)', marginTop: 'var(--s12)' }}>
          <Alan etiket="Sorumlu ekip">
            <select className="ab-gr" value={ekipSecim}
              onChange={(e) => setEkipSecim(e.target.value)}>
              <option value="">— atama yok —</option>
              {ekipler.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.kod} · {e.ad} · {e.aktifUye} aktif üye
                </option>
              ))}
            </select>
          </Alan>
          {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(
                () => kontrolEkibiAta({
                  maddeDurumuId: kayit.id, ekipId: ekipSecim || null,
                }),
                () => setEkipAcik(false),
              )}>Kaydet</Dugme>
            <Dugme tur="ret" onClick={() => setEkipAcik(false)} disabled={bekliyor}>
              Vazgeç
            </Dugme>
          </div>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Ekip ataması bir DEĞERLENDİRME değildir: kaydın son
            değerlendirme tarihini ileri almaz ve kanıt tazeliğini
            etkilemez.
          </p>
        </div>
      )}

      {dogrulamaAcik && (
        <div style={{ display: 'grid', gap: 'var(--s10)', marginTop: 'var(--s12)' }}>
          <Alan etiket="Gerekçe" zorunlu>
            <textarea className="ab-gr" rows={2} value={gerekce} style={{ resize: 'vertical' }}
              placeholder={kayit.dogrulayan
                ? 'Doğrulama neden geri alınıyor? (en az 10 karakter)'
                : 'Dayanağı yeterli kılan ne? (en az 10 karakter)'}
              onChange={(e) => setGerekce(e.target.value)} />
          </Alan>
          {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor || gerekce.trim().length < 10}
              onClick={() => calistir(
                () => degerlendirmeDogrula({
                  maddeDurumuId: kayit.id, onay: !kayit.dogrulayan, gerekce,
                }),
                () => { setDogrulamaAcik(false); setGerekce(''); },
              )}>
              {kayit.dogrulayan ? 'Geri al' : 'Doğrula'}
            </Dugme>
            <Dugme tur="ret" onClick={() => setDogrulamaAcik(false)} disabled={bekliyor}>
              Vazgeç
            </Dugme>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ UY-16 · Kapsama · tazelik · denetime hazırlık ════════════════════

   Ekranın tepesindeki "%N uyum" tek başına denetimde hiçbir şey söylemez:
   bir kurum %95 uyumlu görünüp %30 kapsamalı olabilir ve kalan %70 hiç
   bakılmamıştır. Bu blok üç ayrı soruyu ayrı ayrı sorar ve
   BİRLEŞTİRMEZ.

   ── TEK PUAN YOK ──────────────────────────────────────────────────────
   Bilinçli olarak bir "hazırlık puanı" üretilmiyor: tek yüzde, üç farklı
   işi (değerlendir · kanıt topla · doğrula) tek sayıya gömer ve o sayıyı
   yükseltmenin en kolay yolu kapsamı daraltmak olur. Onun yerine hangi
   eksiğin kaç kontrolü etkilediği SAYILIR. */

function HazirlikBlogu({ kayitlar, simdi }: {
  kayitlar: Degerlendirme[]; simdi: number;
}) {
  const satirlar = kayitlar.map((d) => ({
    durum: d.durum,
    guven: d.guven,
    kanitBayat: d.kanitBayat,
    dogrulandi: dogrulamaDurumu({
      dogrulamaZamani: d.dogrulamaZamani ? Date.parse(d.dogrulamaZamani) : null,
      sonDegerlendirme: d.sonDegerlendirme ? Date.parse(d.sonDegerlendirme) : null,
      simdi,
    }) === 'dogrulandi',
    gecerliKanit: d.gecerliKanit,
  }));
  const o = kapsamaOzeti(satirlar);
  const eksik = eksikDagilimi(satirlar);
  const yuzde = (x: number | null) => (x === null ? 'ölçülmedi' : `%${x}`);

  return (
    <section className="ab-blok">
      <p className="etiket">Denetime hazırlık (UY-16)</p>
      <p style={{ margin: '0 0 var(--s12)', fontSize: 'var(--t-field)',
        color: o.savunulamaz > 0 ? 'var(--bd)' : o.zayif > 0 ? 'var(--md)' : 'var(--i2)' }}>
        {kapsamaCumlesi(o)}
      </p>
      <dl className="ab-panel-ciftler">
        <div>
          <dt>Kapsama</dt>
          <dd className={o.kapsamaOrani === null ? 'd-unk' : undefined}>
            {yuzde(o.kapsamaOrani)} · {o.degerlendirilen}/{o.kapsamda}
          </dd>
        </div>
        <div>
          <dt>Kanıtlı</dt>
          <dd className={o.kanitOrani === null ? 'd-unk' : undefined}>
            {yuzde(o.kanitOrani)}
            {o.bayatKanitli > 0 && ` · ${o.bayatKanitli} bayat`}
          </dd>
        </div>
        <div>
          <dt>Doğrulanmış</dt>
          <dd className={o.dogrulamaOrani === null ? 'd-unk' : undefined}>
            {yuzde(o.dogrulamaOrani)}
          </dd>
        </div>
        <div>
          <dt>Savunulabilir</dt>
          <dd className={o.hazirlikOrani === null ? 'd-unk' : undefined}>
            {yuzde(o.hazirlikOrani)} · {o.savunulabilir}/{o.kapsamda}
          </dd>
        </div>
        <div>
          <dt>Kapsam dışı</dt>
          <dd className={o.kapsamDisi > 0 ? 'd-md' : undefined}>{o.kapsamDisi}</dd>
        </div>
      </dl>
      <p className="ab-dip">
        Eksikler ayrı sayılır — tek bir hazırlık puanı üretilmez:
        {' '}{eksik.degerlendirilmedi} değerlendirilmedi ·
        {' '}{eksik.kanitYok} kanıtsız ·
        {' '}{eksik.kanitBayat} kanıtı bayat ·
        {' '}{eksik.dogrulanmadi} doğrulanmadı.
        Kapsam dışı kontrol paydaya girmez ama AYRI raporlanır: paydayı
        küçülterek oranı yükseltmek, kapsamı daraltarak &quot;iyileşmenin&quot;
        en kolay yoludur.
      </p>
    </section>
  );
}


/* ═══ UY-59 · Olgunluk bloğu ══════════════════════════════════════════

   Olgunluk uyum durumundan AYRIDIR: bir kontrol uyumlu olup olgunluk
   1'de olabilir — çalışıyor ama tek bir kişiye bağlı. Bu ayrım
   kaybolursa, kurumun en kırılgan kontrolleri yeşil görünür. */
function OlgunlukBlogu({ kayit, yazabilir }: {
  kayit: Degerlendirme; yazabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [seviye, setSeviye] = useState<string>(
    kayit.olgunluk === null ? '' : String(kayit.olgunluk));
  const [gerekce, setGerekce] = useState('');
  const d = olgunlukDurumu({ olculen: kayit.olgunluk, hedef: kayit.hedefOlgunluk });
  const secilen = seviye === '' ? null : Number(seviye);

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Olgunluk</p>
      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s12)' }}>
        <Im durum={OLGUNLUK_SINIFI[d]} />{' '}
        {kayit.olgunluk === null
          ? 'Ölçülmedi — sıfır DEĞİL. Sıfır "uygulama başlamadı" demektir.'
          : OLGUNLUK_ADI[kayit.olgunluk]}
        {kayit.hedefOlgunluk !== null
          && ` · hedef: ${OLGUNLUK_KISA[kayit.hedefOlgunluk]} · ${OLGUNLUK_SOZU[d]}`}
        {kayit.hedefOlgunluk === null && ' · hedef seviye tanımlanmamış'}
      </p>
      {yazabilir && (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          <select className="ab-gr" value={seviye} onChange={(e) => setSeviye(e.target.value)}>
            <option value="">ölçülmedi</option>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} · {OLGUNLUK_ADI[n]}</option>
            ))}
          </select>
          {/* Seviye 3 ve üstü "yazılı ve kurum genelinde aynı" iddiasıdır
              ve gerekçe ister; denetçinin ilk soracağı şey odur. */}
          {secilen !== null && secilen >= 3 && (
            <textarea className="ab-gr" rows={2} value={gerekce}
              placeholder="Bu seviye neye dayanıyor?"
              onChange={(e) => setGerekce(e.target.value)} />
          )}
          <Dugme disabled={bekliyor
            || (secilen !== null && secilen >= 3 && !gerekce.trim())}
            onClick={() => calistir(() => olgunlukKaydet({
              maddeDurumuId: kayit.id, seviye: secilen, gerekce: gerekce || null,
            }))}>
            Olgunluğu kaydet
          </Dugme>
          {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
        </div>
      )}
    </div>
  );
}

/* ═══ UY-64 · Kontrol testi bloğu ═════════════════════════════════════

   Tasarım testi kontrolün ÇALIŞTIĞINI göstermez; politikanın doğru
   yazıldığını gösterir. Blok bu ikisini asla aynı kefeye koymaz. */
function TestBlogu({ kayit, yazabilir }: {
  kayit: Degerlendirme; yazabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [yontem, setYontem] = useState<'tasarim' | 'isleyis'>('isleyis');
  const [f, setF] = useState({ evren: '', orneklem: '', uygun: '', tarih: '', not: '' });
  const [sonuc, setSonuc] = useState<'uygun' | 'kismen' | 'uygun_degil'>('uygun');
  const g = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  const durus = testDurusu({
    testler: kayit.testler.map((t) => ({
      yontem: t.yontem, sonuc: t.sonuc, testTarihi: new Date(t.testTarihi).getTime(),
    })),
    /* `an()` sunucu ve tarayıcının AYNI şimdiyi görmesini sağlar; ham
       `Date.now()` statik yayında hidrasyon uyuşmazlığı üretir (lib/an.ts). */
    simdi: an(),
  });

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Kontrol testi</p>
      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s12)' }}>
        <Im durum={DURUS_SINIFI[durus]} /> {DURUS_SOZU[durus]}
      </p>
      {kayit.testler.length > 0 && (
        <ul style={{ margin: '0 0 var(--s12)', paddingLeft: '1.1em',
          fontSize: 'var(--t-cell)', color: 'var(--i2)', lineHeight: 1.7 }}>
          {kayit.testler.map((t) => (
            <li key={t.id}>
              {tarihTR(t.testTarihi)} · {YONTEM_ETIKETI[t.yontem as 'tasarim' | 'isleyis']
                .split(' —')[0]} · {SONUC_ETIKETI[t.sonuc as 'uygun']}
              {t.orneklemSayisi !== null
                && ` · ${t.uygunSayisi}/${t.orneklemSayisi} örnek (evren ${t.evrenSayisi})`}
              {` · ${t.testEden}`}
            </li>
          ))}
        </ul>
      )}
      {yazabilir && !acik && (
        <Dugme onClick={() => setAcik(true)}>Test kaydet</Dugme>
      )}
      {yazabilir && acik && (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          <Alan etiket="Yöntem" zorunlu>
            <select className="ab-gr" value={yontem}
              onChange={(e) => setYontem(e.target.value as typeof yontem)}>
              <option value="isleyis">{YONTEM_ETIKETI.isleyis}</option>
              <option value="tasarim">{YONTEM_ETIKETI.tasarim}</option>
            </select>
          </Alan>
          {/* İşleyiş testi ÖRNEKLEM ister: "test ettik" demek kaç kayda
              bakıldığını söylemeden bir iddiadır. */}
          {yontem === 'isleyis' && (
            <div style={{ display: 'flex', gap: 'var(--s10)' }}>
              <Alan etiket="Evren" zorunlu>
                <input className="ab-gr" type="number" min={1} value={f.evren}
                  onChange={g('evren')} />
              </Alan>
              <Alan etiket="Örneklem" zorunlu>
                <input className="ab-gr" type="number" min={1} value={f.orneklem}
                  onChange={g('orneklem')} />
              </Alan>
              <Alan etiket="Uygun" zorunlu>
                <input className="ab-gr" type="number" min={0} value={f.uygun}
                  onChange={g('uygun')} />
              </Alan>
            </div>
          )}
          <Alan etiket="Sonuç" zorunlu>
            <select className="ab-gr" value={sonuc}
              onChange={(e) => setSonuc(e.target.value as typeof sonuc)}>
              <option value="uygun">{SONUC_ETIKETI.uygun}</option>
              <option value="kismen">{SONUC_ETIKETI.kismen}</option>
              <option value="uygun_degil">{SONUC_ETIKETI.uygun_degil}</option>
            </select>
          </Alan>
          <Alan etiket="Test tarihi" zorunlu>
            <input className="ab-gr" type="date" value={f.tarih} onChange={g('tarih')} />
          </Alan>
          <textarea className="ab-gr" rows={2} value={f.not} placeholder="Not"
            onChange={g('not')} />
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor || !f.tarih}
              onClick={() => calistir(async () => {
                const s = await kontrolTestiKaydet({
                  maddeDurumuId: kayit.id,
                  yontem,
                  evrenSayisi: yontem === 'isleyis' ? Number(f.evren) : null,
                  orneklemSayisi: yontem === 'isleyis' ? Number(f.orneklem) : null,
                  uygunSayisi: yontem === 'isleyis' ? Number(f.uygun) : null,
                  sonuc,
                  testTarihi: new Date(f.tarih).toISOString(),
                  not: f.not || null,
                });
                if (s.ok) setAcik(false);
                return s;
              })}>
              Kaydet
            </Dugme>
            <Dugme onClick={() => setAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
          {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
        </div>
      )}
    </div>
  );
}
