'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BosFiltre, BosIlk, Dugme, type Durum } from '@/components/atlas/temel';
import { Tablo, type Kolon, type Satir } from '@/components/atlas/tablo';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/atlas/cekmece';
import BaglamCubugu from '@/components/atlas/BaglamCubugu';
import { DENKLIK_ETIKET, DURUM_ETIKET, GUVEN_ETIKET, ONEM_ETIKET, tarihTR } from '@/lib/sabitler';
import { Ara, DisaAktar, Kapsam } from '../Kontroller';
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
};

type Anahtar = 'konu' | 'santral' | 'zaman';
type SiraYonu = 'artan' | 'azalan';
type Kip = 'ozet' | 'degerlendir' | 'bulgu' | 'kanit' | 'istisna';

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

export default function SurecDetayIstemci({ veri }: { veri: DetayVerisi }) {
  const { surec: s, simdi, kayitlar } = veri;
  const [mercek, setMercek] = useState('takip');
  const [tesisF, setTesisF] = useState<string | null>(null);
  const [alanF, setAlanF] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [sira, setSira] = useState<{ anahtar: Anahtar; yon: SiraYonu } | null>(null);
  const [secili, setSecili] = useState<string | null>(null);
  const [kip, setKip] = useState<Kip>('ozet');
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
      <main style={{ minWidth: 0 }}>
        <BaglamCubugu
          kirintiler={[
            { ad: 'Uyum kampanyaları', yol: '/surecler' },
            { ad: s.kod },
          ]}
          sag={
            <Link href={`/uyum/${encodeURIComponent(s.regulasyon.kod)}`} className="dg dg-satir">
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

        <section className="ekran-govde">
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
                <p className="dip-not" style={{ margin: 0, flex: 1, minWidth: 0 }}>
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
                  <Link className="dg dg-birincil" href="/surecler">
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
              yazabilir={veri.yazabilir}
              git={setKip}
            />
          ) : (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>
                  {KIP_BASLIGI[kip]}
                </p>
              </div>
              <div className="cekmece-blok">
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

function Ozet({ kayit, yazabilir, git }: {
  kayit: Degerlendirme;
  yazabilir: boolean;
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

      <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Madde metni</p>
        <p style={{ margin: 0, fontSize: 'var(--t-cell)', lineHeight: 1.7, color: 'var(--i2)' }}>
          {kayit.madde.metin}
        </p>
        <p className="cekmece-dip" style={{ margin: 'var(--s12) 0 0' }}>
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
        <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Kanıtlar</p>
          {kayit.kanitlar.map((k) => (
            <div key={k.id} className="cekmece-alan">
              <span className="etiket">{k.tip}</span>
              <span className="deger" style={{ fontWeight: 400 }}>
                {k.ad} · {tarihTR(k.baslangic)}
              </span>
            </div>
          ))}
        </div>
      )}

      {kayit.madde.esler.length > 0 && (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Çapraz eşleme</p>
          {kayit.madde.esler.slice(0, 5).map((e) => (
            <div key={e.kod} className="cekmece-alan">
              <span className="etiket">{e.kod}</span>
              <span className="deger" style={{ fontWeight: 400 }}>
                {DENKLIK_ETIKET[e.denklik as keyof typeof DENKLIK_ETIKET] ?? e.denklik}
              </span>
            </div>
          ))}
          <p className="cekmece-dip" style={{ margin: 'var(--s12) 0 0' }}>
            Aynı kanıt eşleşen maddeleri de karşılayabilir ·{' '}
            <Link className="dg dg-satir" style={{ fontSize: 'inherit', fontWeight: 400 }}
              href="/eslestirme">Eşleme kütüğü ▸</Link>
          </p>
        </div>
      )}

      <CekmeceEylemler
        birincil={yazabilir
          ? <Dugme tur="cekmece" onClick={() => git('degerlendir')}>Değerlendir</Dugme>
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
