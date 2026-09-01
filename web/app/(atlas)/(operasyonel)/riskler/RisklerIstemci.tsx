'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { BosIlk, BosFiltre, Dugme } from '@/components/atlas/temel';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/atlas/cekmece';
import { RISK_DURUM_ETIKET, etiketle, tarihTR } from '@/lib/sabitler';
import { RiskFormu, KararFormu } from './Formlar';
import {
  aktifMi, altSatir, gecikmis, gunFarki, kabulDoldu, maxEtki, santralMetni,
  skorDurumu, SKOR_TAVANI,
  type BulguSecenegi, type Kisi, type Kodlu, type R,
} from './ortak';

/* O3 · Risk Register — "hangi risk önce?"
   Skor LİDER kolondur (03-screens O3): işlem/treatment sözcükleri tablodan
   kaldırıldı, durum satırda kelimeyle YAZILMAZ, yalnız skorun rengi taşır.
   Detay modalda değil 420px çekmecede ya da /riskler/[id] rotasında açılır. */

const KOLONLAR = '64px minmax(0, 1fr) 190px 130px 26px';
const KOLONLAR_DAR = '64px minmax(0, 1fr) 130px 26px';

const GORUNUR_SATIR = 7;

type Kip = 'ozet' | 'form' | 'karar';

export default function RisklerIstemci({
  riskler, yeniKod, kullanicilar, tesisler, sistemler, bulgular,
  toplam, metrikler, kapsamli = false,
}: {
  riskler: R[]; yeniKod: string; kullanicilar: Kisi[]; tesisler: Kodlu[];
  sistemler: Kodlu[]; bulgular: BulguSecenegi[];
  /** kütüğün GERÇEK büyüklüğü — sunucu tavanı satırları kestiyse fark açılır */
  toplam: number;
  /** kesilmemiş kütük üzerinde sayılmış metrikler (sunucuda count/aggregate) */
  metrikler: {
    aktif: number; enYuksek: number | null; kritik: number; gecikmis: number;
    kabul: number; sahipsiz: number; skorsuz: number;
  };
  /** liste bir santral kapsamıyla daraltıldı mı — boş ekranın SÖZÜ değişir */
  kapsamli?: boolean;
}) {
  const [filtre, setFiltre] = useState('aktif');
  const [tesisF, setTesisF] = useState<string | null>(null);
  const [sahipF, setSahipF] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [kip, setKip] = useState<Kip>('ozet');
  const [yeniAcik, setYeniAcik] = useState(false);

  const secili = riskler.find((r) => r.id === seciliId) ?? null;

  /* ── Metrikler: filtrelerden BAĞIMSIZ, KESİLMEMİŞ kütüğün tamamı ──────
     Bu altı sayı eskiden elde duran `riskler` dizisinden hesaplanıyordu;
     sunucu satırları bir tavanla kestiği anda hepsi sessizce küçülürdü.
     Artık sunucuda `count`/`aggregate` ile ölçülüyorlar (bkz. veri.ts):
     satır için `take`, sayım için `count`. */
  const {
    aktif: aktifSayisi, enYuksek, kritik: kritikSayisi, gecikmis: gecikmisSayisi,
    kabul: kabulSayisi, sahipsiz: sahipsizSayisi, skorsuz: skorsuzSayisi,
  } = metrikler;
  /** Sunucu tavanı kütüğü kesti mi — kesme SESSİZ kalmaz. */
  const kesildi = toplam > riskler.length;

  /* ── Filtre + kapsam ────────────────────────────────────────────────── */
  const taban = useMemo(() => riskler.filter((r) => {
    if (filtre === 'aktif' && !aktifMi(r)) return false;
    if (filtre === 'kritik' && !(aktifMi(r) && r.artikRisk !== null && r.artikRisk >= 15)) return false;
    if (filtre === 'ot' && !(aktifMi(r) && r.ot)) return false;
    if (filtre === 'kabul' && r.durum !== 'kabul_edildi') return false;
    if (filtre === 'kapali' && r.durum !== 'kapali') return false;
    if (tesisF && r.tesis?.id !== tesisF) return false;
    if (sahipF === 'yok' ? !!r.sahip : sahipF !== null && r.sahip?.id !== sahipF) return false;
    return true;
  }), [riskler, filtre, tesisF, sahipF]);

  /* Varsayılan sıralama SKOR. Gecikmiş satırlar sıralamadan bağımsız üstte
     (06 §A2) ve asla toplanmaz; skoru bilinmeyen satır en alta iner ama
     "düşük" sayılmaz — bilinmeyen ≠ sıfır. */
  const sirali = useMemo(() => [...taban].sort((a, b) => {
    const ga = gecikmis(a), gb = gecikmis(b);
    if (ga !== gb) return ga ? -1 : 1;
    if (a.artikRisk === null && b.artikRisk === null) return a.kod.localeCompare(b.kod, 'tr');
    if (a.artikRisk === null) return 1;
    if (b.artikRisk === null) return -1;
    return b.artikRisk - a.artikRisk;
  }), [taban]);

  const toplanabilir = (r: R) =>
    !gecikmis(r) && ((r.artikRisk !== null && r.artikRisk <= 7) || r.durum === 'kabul_edildi');
  const one = sirali.filter((r) => !toplanabilir(r));
  const sakin = sirali.filter(toplanabilir);
  /* Toplama yalnız ÖNDE duran satır varken anlamlıdır: "Kabul" filtresinde
     tüm sonuçlar kuyruk ölçütüne uyar; onları tek satıra gömmek listeyi
     boş gösterirdi. */
  const topla = !kuyrukAcik && one.length > 0;
  const gosterilen = topla ? one.slice(0, GORUNUR_SATIR) : [...one, ...sakin];
  const toplanan = topla ? [...one.slice(GORUNUR_SATIR), ...sakin] : [];

  const kuyrukSkorlari = toplanan.map((r) => r.artikRisk).filter((s): s is number => s !== null);
  const kuyrukEtiketi = toplanan.every(toplanabilir)
    ? `${toplanan.length} düşük ve kabul edilmiş risk`
    : `${toplanan.length} risk daha`;

  function sec(id: string) {
    setSeciliId(id);
    setKip('ozet');
    setYeniAcik(false);
  }
  function cekmeceyiKapat() { setSeciliId(null); setKip('ozet'); }

  /* ── Başlık ─────────────────────────────────────────────────────────── */
  const baslik: { vurgu?: string; metin: string } =
    kritikSayisi > 0 ? { vurgu: `${kritikSayisi} kritik`, metin: 'risk açık' }
      : aktifSayisi > 0 ? { vurgu: String(aktifSayisi), metin: 'risk açık' }
        : { metin: 'Aktif risk yok' };

  return (
    <>
      <main style={{ minWidth: 0 }}>
        <EkranBasligi
          /* Kesme SESSİZ OLMAZ: tavana çarpıldıysa cümle kaç satırın elde
             olduğunu ve kütüğün gerçek büyüklüğünü birlikte söyler. */
          eyebrow={kesildi
            ? `Risk defteri · ${aktifSayisi} aktif · gösterilen ${riskler.length} / ${toplam}`
            : `Risk defteri · ${aktifSayisi} aktif`}
          vurgu={baslik.vurgu}
          baslik={baslik.metin}
          metrikler={[
            {
              deger: enYuksek ?? '—',
              payda: enYuksek === null ? undefined : SKOR_TAVANI,
              yazi: 'En yüksek',
              durum: enYuksek === null ? undefined : skorDurumu(enYuksek),
            },
            { deger: gecikmisSayisi, yazi: 'Gecikmiş', durum: gecikmisSayisi > 0 ? 'bd' : undefined },
            { deger: kabulSayisi, yazi: 'Kabul' },
            { deger: sahipsizSayisi, yazi: 'Sahipsiz', durum: sahipsizSayisi > 0 ? 'md' : undefined },
          ]}
        />

        <section className="ekran-govde">
          <Filtreler
            secenekler={[
              { id: 'aktif', ad: 'Aktif' },
              { id: 'kritik', ad: 'Kritik' },
              { id: 'ot', ad: 'OT' },
              { id: 'kabul', ad: 'Kabul' },
              { id: 'kapali', ad: 'Kapalı' },
            ]}
            aktif={filtre}
            sec={(id) => { setFiltre(id); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Kapsam etiket="Santral" aktif={tesisF} sec={setTesisF}
                  secenekler={tesisler.map((t) => ({ id: t.id, ad: t.ad }))} />
                <Kapsam etiket="Sahip" aktif={sahipF} sec={setSahipF}
                  secenekler={[
                    ...kullanicilar.map((u) => ({ id: u.id, ad: u.ad })),
                    { id: 'yok', ad: 'atanmadı' },
                  ]} />
                <button type="button" className="kapsam-dugme"
                  onClick={() => { setYeniAcik(true); setSeciliId(null); }}>
                  + Yeni risk
                </button>
              </>
            }
          />

          {gosterilen.length === 0 ? (
            <BosDurum
              hicKayitYok={riskler.length === 0}
              kapsamli={kapsamli}
              aktifFiltre={filtre}
              kapaliyaGec={() => { setFiltre('kapali'); setTesisF(null); setSahipF(null); }}
              temizle={() => { setFiltre('aktif'); setTesisF(null); setSahipF(null); }}
              yeni={() => setYeniAcik(true)}
            />
          ) : (
            <div className="tbl"
              style={{
                '--kolonlar': KOLONLAR,
                '--kolonlar-dar': KOLONLAR_DAR,
                marginTop: 'var(--s22)',
                borderTop: 'var(--bw-strong) solid var(--hr2)',
              } as CSSProperties}
              role="table">
              {gosterilen.map((r) => (
                <Satir key={r.id} risk={r} secili={seciliId === r.id} sec={() => sec(r.id)} />
              ))}

              {toplanan.length > 0 && (
                <button type="button" className="tbl-satir tbl-kuyruk"
                  onClick={() => setKuyrukAcik(true)}>
                  <span style={{ paddingLeft: 'var(--s16)', fontFamily: 'var(--mn)',
                    fontSize: 'var(--t-lead)', fontWeight: 600, color: 'var(--i2)',
                    fontVariantNumeric: 'tabular-nums' }}>
                    {kuyrukSkorlari.length ? `≤${Math.max(...kuyrukSkorlari)}` : '—'}
                  </span>
                  <span className="tbl-konu" style={{ color: 'var(--i2)' }}>{kuyrukEtiketi}</span>
                  <span className="tbl-hucre tbl-ikincil">portföy</span>
                  <span className="tbl-hucre" />
                  <span className="tbl-ok" style={{ justifySelf: 'end' }} aria-hidden>▾</span>
                </button>
              )}

              {kuyrukAcik && sakin.length > 0 && (
                <p className="dip-not tbl-dip">
                  <button type="button" className="dg dg-satir"
                    onClick={() => setKuyrukAcik(false)}>Kuyruğu topla</button>
                </p>
              )}

              <p className="dip-not tbl-dip">
                Sıralama artık skora göre
                {skorsuzSayisi > 0 && ` · ${skorsuzSayisi} risk skorsuz`}
              </p>
            </div>
          )}
        </section>
      </main>

      {secili && (
        <Cekmece kod={secili.kod} kapat={cekmeceyiKapat}>
          {kip === 'ozet' && (
            <Ozet risk={secili} duzenle={() => setKip('form')} karar={() => setKip('karar')} />
          )}
          {kip === 'form' && (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Yeniden değerlendir</p>
              </div>
              <div className="cekmece-blok">
                <RiskFormu risk={secili} yeniKod={yeniKod} kullanicilar={kullanicilar}
                  tesisler={tesisler} sistemler={sistemler} bulgular={bulgular}
                  kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
          {kip === 'karar' && (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Karar kaydet</p>
              </div>
              <div className="cekmece-blok">
                <KararFormu risk={secili} kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
        </Cekmece>
      )}

      {yeniAcik && !secili && (
        <Cekmece kod={yeniKod} kapat={() => setYeniAcik(false)}>
          <div className="cekmece-blok">
            <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Yeni risk</p>
          </div>
          <div className="cekmece-blok">
            <RiskFormu risk={null} yeniKod={yeniKod} kullanicilar={kullanicilar}
              tesisler={tesisler} sistemler={sistemler} bulgular={bulgular}
              kapat={() => setYeniAcik(false)} />
          </div>
        </Cekmece>
      )}
    </>
  );
}

/* ── Satır ──────────────────────────────────────────────────────────── */

function Satir({ risk, secili, sec }: { risk: R; secili: boolean; sec: () => void }) {
  const durum = skorDurumu(risk.artikRisk);
  const renk = `var(--${durum})`;
  const sahipsiz = !risk.sahip;
  return (
    <button
      type="button"
      role="row"
      aria-selected={secili}
      className="tbl-satir"
      onClick={sec}
      style={{ borderLeftColor: secili ? renk : 'transparent' }}
    >
      <span role="cell" style={{
        paddingLeft: 'var(--s16)', fontFamily: 'var(--mn)', fontSize: 'var(--t-lead)',
        fontWeight: 600, color: renk, fontVariantNumeric: 'tabular-nums',
      }}>
        {risk.artikRisk ?? '—'}
      </span>
      <span role="cell" style={{ minWidth: 0 }}>
        <span className="tbl-konu">{risk.baslik}</span>
        <span className="tbl-alt">{altSatir(risk)}</span>
      </span>
      <span role="cell" className="tbl-hucre tbl-ikincil">{santralMetni(risk)}</span>
      <span role="cell" className="tbl-hucre"
        style={sahipsiz ? { color: 'var(--md)' } : undefined}>
        {risk.sahip?.ad ?? 'atanmadı'}
      </span>
      <span className="tbl-ok" style={{ justifySelf: 'end' }} aria-hidden>▸</span>
    </button>
  );
}

/* ── Kapsam kontrolü (SANTRAL ▾ / SAHİP ▾) ──────────────────────────── */

function Kapsam({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  const secim = secenekler.find((s) => s.id === aktif);
  const kok = useRef<HTMLDetailsElement | null>(null);

  // Açılır kapsam listesi dışarı tıklandığında ve Esc ile kapanır —
  // açık kalan bir menü altındaki tabloyu örter.
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
      <summary className="kapsam-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 210,
        maxHeight: 300, overflowY: 'auto', background: 'var(--card)',
        border: 'var(--bw-strong) solid var(--hr2)', boxShadow: 'var(--sh-tip)',
        padding: 'var(--s8)',
      }}>
        {[{ id: '', ad: 'Tümü' }, ...secenekler].map((s) => (
          <button key={s.id} type="button" className="filtre"
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

/* ── Çekmece özeti ──────────────────────────────────────────────────── */

function Ozet({ risk, duzenle, karar }: {
  risk: R; duzenle: () => void; karar: () => void;
}) {
  const durum = skorDurumu(risk.artikRisk);
  const doldu = kabulDoldu(risk);
  const etki = maxEtki(risk.etkiler);
  const gecikmeGun = risk.bulgu?.hedef ? gunFarki(risk.bulgu.hedef) : null;

  const soz = doldu
    ? 'Kabul süresi doldu'
    : RISK_DURUM_ETIKET[risk.durum as keyof typeof RISK_DURUM_ETIKET] ?? etiketle(risk.durum);

  const cumle = doldu
    ? `Kabul ${tarihTR(risk.kabulBitis)} tarihinde düştü; risk yeniden değerlendirilmeli.`
    : risk.durum === 'kabul_edildi'
      ? `Kabul ${tarihTR(risk.kabulBitis)} tarihine kadar geçerli${risk.onaylayan ? ` · onaylayan ${risk.onaylayan.ad}` : ''}.`
      : gecikmis(risk) && gecikmeGun !== null
        ? `Bağlı bulgu hedefi ${gecikmeGun} gün aşıldı.`
        : risk.aciklama;

  /* Zincir tam olarak DÖRT halkayı anlatır: kontrol boşluğu → bulgu →
     proje → (doğrulama detay rotasında). Aynı türden fazla kayıt varsa
     lider olan gösterilir, kalanı dip nota sayı olarak iner. */
  const ilkKontrol = risk.kontroller[0] ?? null;
  const ilkProje = risk.projeler[0] ?? null;
  const zincir = [
    ...(ilkKontrol ? [{
      id: `k-${ilkKontrol.id}`, kod: ilkKontrol.kod, alt: 'kontrol boşluğu', yol: '/uyum',
    }] : []),
    ...(risk.bulgu ? [{
      id: `b-${risk.bulgu.id}`,
      kod: risk.bulgu.baslik,
      alt: gecikmeGun !== null && gecikmeGun > 0 ? `bulgu · hedef +${gecikmeGun} gün` : 'bulgu',
      yol: `/bulgular/${risk.bulgu.id}`,
    }] : []),
    ...(ilkProje ? [{
      id: `p-${ilkProje.id}`, kod: ilkProje.kod,
      alt: ilkProje.ilerleme !== null ? `proje · %${ilkProje.ilerleme}` : 'proje · kilometre taşı yok',
      yol: '/projeler', suren: ilkProje.durum === 'devam',
    }] : []),
  ];

  const varlikBaglari = risk.varliklar.slice(0, 3).map((v) => ({
    id: `v-${v.id}`, kod: v.etiket, alt: v.ad, yol: '/envanter',
  }));
  const gizliBag = Math.max(0, risk.kontroller.length - 1)
    + Math.max(0, risk.projeler.length - 1)
    + Math.max(0, risk.varliklar.length - 3);

  const eksik = [
    risk.kontroller.length ? null : 'kontrol',
    risk.bulgu ? null : 'bulgu',
    risk.projeler.length ? null : 'proje',
  ].filter((x): x is string => x !== null);

  return (
    <>
      <CekmeceKimlik durum={durum} soz={soz} baslik={risk.baslik} cumle={cumle} />

      <CekmeceAlanlar alanlar={[
        {
          etiket: 'Artık / brüt',
          deger: `${risk.artikRisk ?? '—'} / ${risk.dogalRisk ?? '—'}`,
          durum,
        },
        {
          etiket: 'Olasılık × etki',
          deger: risk.olasilik !== null && etki !== null ? `${risk.olasilik} × ${etki}` : '—',
        },
        {
          etiket: 'Santral',
          deger: `${santralMetni(risk)}${risk.sistem ? ` · ${risk.sistem.kod}` : ''}`,
        },
        {
          etiket: 'Sahip',
          deger: risk.sahip?.ad ?? 'atanmadı',
          durum: risk.sahip ? undefined : 'md',
        },
      ]} />

      {zincir.length > 0 ? (
        <CekmeceBagli
          baslik={eksik.length ? `Zincir · ${eksik.join(' · ')} yok` : 'Zincir'}
          kayitlar={zincir}
        />
      ) : (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Zincir</p>
          <p className="cekmece-dip" style={{ margin: 0 }}>
            Kontrol · bulgu · proje bağı yok — kapanma yolu tanımlı değil.
          </p>
        </div>
      )}

      {varlikBaglari.length > 0 && (
        <CekmeceBagli baslik="Varlıklar" kayitlar={varlikBaglari} />
      )}

      <CekmeceEylemler
        birincil={<Dugme tur="cekmece" onClick={karar}>Karar kaydet</Dugme>}
        ikincil={
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme onClick={duzenle}>Yeniden değerlendir</Dugme>
            <Link href={`/riskler/${risk.id}`}><Dugme>Kaydı aç</Dugme></Link>
          </div>
        }
        dipNot={`Son güncelleme ${tarihTR(risk.guncellendi)}`
          + (risk.islemTipi ? ` · işlem ${etiketle(risk.islemTipi).toLocaleLowerCase('tr-TR')}` : '')
          + (risk.kaynak ? ` · kaynak ${etiketle(risk.kaynak).toLocaleLowerCase('tr-TR')}` : '')
          + (gizliBag > 0 ? ` · ${gizliBag} bağ daha kayıtta` : '')}
      />
    </>
  );
}

/* ── Boş durumlar ───────────────────────────────────────────────────── */

function BosDurum({ hicKayitYok, kapsamli, aktifFiltre, kapaliyaGec, temizle, yeni }: {
  hicKayitYok: boolean; kapsamli: boolean; aktifFiltre: string;
  kapaliyaGec: () => void; temizle: () => void; yeni: () => void;
}) {
  if (hicKayitYok) {
    /* "Kütükte kayıt yok" ile "kapsamınızda kayıt yok" AYNI ŞEY DEĞİLDİR:
       ilki ilk kurulumu, ikincisi yetki sınırını anlatır. Kapsamı
       daraltılmış kullanıcıya boş kütük göstermek, kaydın var olmadığını
       söylemek olurdu. */
    return (
      <div style={{ marginTop: 'var(--s26)' }}>
        <BosIlk cumle={kapsamli
          ? 'Kapsamınızda risk kaydı yok.'
          : 'Risk kütüğünde kayıt yok.'}
          eylem={<Dugme tur="birincil" onClick={yeni}>Risk oluştur</Dugme>} />
      </div>
    );
  }
  if (aktifFiltre === 'aktif') {
    return (
      <div className="blok" style={{ marginTop: 'var(--s26)' }}>
        <p className="cumle" style={{ marginTop: 0 }}>Aktif risk yok</p>
        <div className="eylem" style={{ display: 'flex', gap: 'var(--s12)' }}>
          <Dugme tur="birincil" onClick={kapaliyaGec}>Kapalı riskleri gör</Dugme>
          <Dugme onClick={yeni}>Risk oluştur</Dugme>
        </div>
      </div>
    );
  }
  return <BosFiltre temizle={temizle} />;
}
