'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Alan, BosIlk, Dugme, Hata, Ipucu, Kesir, type Durum,
} from '@/components/atlas/temel';
import { Matris, type MatrisSatiri } from '@/components/atlas/tablo';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import {
  Cekmece, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler, CekmeceKimlik,
} from '@/components/atlas/cekmece';
import { useEylem } from '@/components/useEylem';
import { kanitTalebiEkle } from '@/lib/eylemler2/denetim';
import { DURUM_ETIKET, etiketle } from '@/lib/sabitler';
import {
  acikMi, aileDurumu, enKotuHam, sakinMi, satirAgirligi,
  type CerceveVerisi, type Kontrol,
} from './mantik';

/* O1 · Uyum kontrol odası — "nerede uyumsuzuz?" (03-screens O1)

   Canvas'ta tek modül vardır: santral × kontrol ailesi matrisi. Hücrede
   YALNIZ işaretçi bulunur; durum sözcüğü tüm ekranda yalnız çekmecenin
   kimlik bloğunda geçer (06 §A2).

   Kapsam kararı ekranda ezilmez: matriste satırı olan santralleri
   `UygulanabilirlikKarari` belirler (veri.ts). Kapsam dışı ve kararsız
   tesisler matrise girmez, altta sessiz bir satırda özetlenir. */

/* Kapsam dışı hücre BOŞ kalır — kapsam dışı, "bilinmeyen" değildir, o yüzden
   elmas basılmaz. `Matris` bugün boş hücre kabul etmiyor (kolon başına bir
   `Durum` bekliyor); sınıf karşılığı olmayan bir işaretçi görünmez kalır ve
   erişilebilir adı hücrenin neden boş olduğunu söyler.
   Kalıcı çözüm: raporda "PAYLAŞILAN DEĞİŞİKLİK İSTEĞİ" (Matris · durum null). */
const BOS_HUCRE = 'kapsamdisi' as unknown as Durum;

/* 10px mono affordance satırındaki bağlantılar satırın tipografisini bozmaz;
   ayırt edici olan renk (ink/secondary) ve hover. */
const BAG_STILI = {
  fontSize: 'inherit', fontWeight: 400, letterSpacing: 'inherit',
} as const;

type Secim = { tesisId: string; kontrol: Kontrol; aileId: string };

/** Ekranın açılış konumu: hangi çerçeve, hangi kırılım.
    `/uyum?kontrol=EPDK-SYM-4.2.1` → o kontrolün çerçevesi + ailesi açılır
    (O2 alt maddesinden gelen sıçrama). */
type Odak = { cerceve: string; aile: string | null; madde: string | null };

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

  const { aile: odakAile, madde: odakMadde } = odak;
  const cerceve = cerceveler.find((c) => c.kod === odak.cerceve) ?? cerceveler[0];

  function cerceveSec(kod: string) {
    setOdak({ cerceve: kod, aile: null, madde: null });
    setSecim(null);
  }

  function kirilimiSifirla() {
    setOdak((o) => ({ ...o, aile: null, madde: null }));
    setSecim(null);
  }

  /* ── kolonlar: aile kırılımı (varsayılan) ya da tek ailenin yaprakları ── */
  const aile = odakAile ? cerceve?.aileler.find((a) => a.id === odakAile) ?? null : null;
  const kolonlar = useMemo(() => {
    if (!cerceve) return [];
    if (aile) return aile.yapraklar.map((y) => ({ id: y.id, baslik: y.kisaKod, aileId: aile.id }));
    return cerceve.aileler.map((a) => ({ id: a.id, baslik: a.kisa, aileId: a.id }));
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

  const matrisSatirlari: MatrisSatiri[] = satirVerisi.map((v) => ({
    id: v.satir.id,
    ad: v.satir.ad,
    alt: v.satir.alt,
    sakin: v.sakin,
    hucreler: v.hucreler.map((h) => ({
      durum: h.durum ?? BOS_HUCRE,
      ipucu: h.kontrol
        ? (h.durum === null ? `${h.kontrol.kisaKod} · bu tesiste kapsam dışı` : h.kontrol.ipucu)
        : 'Bu ailede kontrol tanımlı değil',
    })),
  }));

  if (!cerceve) {
    return (
      <main>
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
      <main style={{ minWidth: 0 }}>
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
                kolonBasliklari={kolonlar.map((k) => k.baslik)}
                satirlar={matrisSatirlari}
                secili={secim?.tesisId ?? null}
                sec={(satirId, kolon) => {
                  const v = satirVerisi.find((x) => x.satir.id === satirId);
                  const h = v?.hucreler[kolon];
                  if (!v || !h?.kontrol) return;
                  setSecim({ tesisId: satirId, kontrol: h.kontrol, aileId: h.aileId });
                }}
              />

              {/* 10px mono affordance satırı — sütun başlığı bugün tıklanabilir
                  değil (primitif sınırı), aile detayı buradan açılır. */}
              <p className="dip-not">
                Hücreye gelince özet · tıklayınca çekmece
                {!aile && ' · aile detayı: '}
                {!aile && cerceve.aileler.map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && ' · '}
                    <Link className="dg dg-satir" style={BAG_STILI}
                      href={`/uyum/${cerceve.kod}?aile=${a.kod}`}>
                      {a.kisa}
                    </Link>
                  </span>
                ))}
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
          <div style={{ display: 'flex', gap: 'var(--s9)' }}>
            <Link className="dg dg-ikincil" style={{ flex: 1, textAlign: 'center' }}
              href={`/uyum/${cerceve.kod}?aile=${aile?.kod ?? ''}&kontrol=${kontrol.kod}`}>
              Kontrol ağacı
            </Link>
            <Link className="dg dg-ikincil" style={{ flex: 1, textAlign: 'center' }}
              href={`/tesisler/${satir.id}`}>
              Santral 360
            </Link>
          </div>
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
