'use client';
import { useMemo, useState } from 'react';
import { BosIlk, BosFiltre, Dugme, Im, Ipucu, type Durum } from '@/components/atlas/temel';
import { Tablo, type Kolon, type Satir } from '@/components/atlas/tablo';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/atlas/cekmece';
import { tarihTR, zamanTR } from '@/lib/sabitler';
import {
  EtkiDogrulama, OlayBaglari, OlayDuzenleFormu, OneriYenile, YeniOlayFormu,
} from './Eylemler';
import {
  ETKI_ALANLARI, ETKI_ALAN_ETIKET, KADEME, KOPUKLUK_SOZU, TESPIT_SOZU,
  acikMi, bekleyenAlanlar, bildirimBekliyor, dogrulanmisAlanlar, imSozu,
  olayImi, olgu, seviyeDurumu, seviyeSozu, sirala, surukleyici,
  zincirKopuk, zincirOzeti,
  type BagAdayi, type BagTipi, type EtkiAlani, type HalkaGorunumu,
  type OlayKaydi, type Santral,
} from './mantik';

/* O · Olaylar — "bu olay üretimi nasıl etkiledi, kim onayladı?"

   Tek tablo, üç metrik, 420px çekmece. Yoğunluk sözleşmesi (06 §A3):
   en fazla 4 metrik, 5–9 görünür satır + toplanan kuyruk, canvas'ta durum
   SÖZCÜĞÜ yok (şiddet harf kademesiyle, durum işaretçiyle taşınır).

   Ekranın sert kuralı: ÖNERİ ile DOĞRULANMIŞ ETKİ karışmaz. Tabloda ve
   çekmecede öneri gri, elmas işaretli ve "öneri" etiketlidir; doğrulanmış
   etki koyu ve kendi renginde durur. Doğrulanmamış öneri metriklerde
   "etki" sayılmaz, yalnız "doğrulama bekleyen" sayılır. */

const GORUNUR_BUTCE = 8;

const KOLONLAR: Kolon[] = [
  { baslik: 'Tespit', genislik: '132px', ikincil: true },
  { baslik: 'Zincir', genislik: '178px', ikincil: true },
  { baslik: 'Üretim etkisi', genislik: '176px' },
];

const MERCEKLER = [
  { id: 'acik', ad: 'Açık' },
  { id: 'dogrulama', ad: 'Doğrulama bekleyen' },
  { id: 'kopuk', ad: 'Zinciri kopuk' },
  { id: 'bildirim', ad: 'Bildirim bekleyen' },
  { id: 'hepsi', ad: 'Tümü' },
];

type Kip = 'ozet' | 'duzenle';

export default function OlaylarIstemci({
  olaylar, santraller, adaylar, yazabilir, dogrulayabilir,
}: {
  olaylar: OlayKaydi[];
  santraller: Santral[];
  adaylar: Record<BagTipi, BagAdayi[]>;
  yazabilir: boolean;
  dogrulayabilir: boolean;
}) {
  const [mercek, setMercek] = useState('acik');
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [kip, setKip] = useState<Kip>('ozet');
  const [yeniAcik, setYeniAcik] = useState(false);

  const sayim = useMemo(() => ({
    toplam: olaylar.length,
    acik: olaylar.filter(acikMi).length,
    dogrulamaBekleyen: olaylar.filter((o) => bekleyenAlanlar(o).length > 0).length,
    kopuk: olaylar.filter(zincirKopuk).length,
    bildirim: olaylar.filter(bildirimBekliyor).length,
    dogrulanmis: olaylar.filter((o) => dogrulanmisAlanlar(o).length > 0).length,
    bozukOneri: olaylar.filter((o) => o.oneriBozuk).length,
  }), [olaylar]);

  const suzulmus = useMemo(() => olaylar.filter((o) => {
    if (mercek === 'acik') return acikMi(o);
    if (mercek === 'dogrulama') return bekleyenAlanlar(o).length > 0;
    if (mercek === 'kopuk') return zincirKopuk(o);
    if (mercek === 'bildirim') return bildirimBekliyor(o);
    return true;
  }), [olaylar, mercek]);

  const sirali = useMemo(() => [...suzulmus].sort(sirala), [suzulmus]);
  const one = sirali.filter(surukleyici).slice(0, GORUNUR_BUTCE);
  const kalan = sirali.filter((o) => !one.includes(o));
  const gosterilen = kuyrukAcik ? sirali : [...one, ...kalan].slice(0, GORUNUR_BUTCE);
  const toplanan = kuyrukAcik ? [] : sirali.filter((o) => !gosterilen.includes(o));

  const secili = olaylar.find((o) => o.id === seciliId) ?? null;

  if (olaylar.length === 0) {
    return (
      <>
        <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
          <EkranBasligi eyebrow="Operasyonel güvenlik" baslik="Olaylar" />
          <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
            <BosIlk
              cumle="Kapsamınızda olay kaydı yok. Olay açıldığında etki zinciri motoru öneriyi üretir; etki alanları insan doğrulamasıyla dolar."
              eylem={yazabilir
                ? <Dugme tur="birincil" onClick={() => setYeniAcik(true)}>Olay aç</Dugme>
                : undefined}
            />
          </section>
        </main>
        {yeniAcik && (
          <Cekmece kod="Yeni olay" kapat={() => setYeniAcik(false)}>
            <div className="cekmece-blok">
              <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Olay aç</p>
            </div>
            <div className="cekmece-blok">
              <YeniOlayFormu santraller={santraller} kapat={() => setYeniAcik(false)} />
            </div>
          </Cekmece>
        )}
      </>
    );
  }

  const baslik = sayim.dogrulamaBekleyen > 0
    ? { vurgu: `${sayim.dogrulamaBekleyen} olayda`, metin: 'etki önerisi doğrulanmadı' }
    : sayim.kopuk > 0
      ? { vurgu: `${sayim.kopuk} olayda`, metin: 'etki zinciri kurulamadı' }
      : { vurgu: undefined, metin: 'Etki zinciri güncel' };

  const dipNot = [
    `${sayim.toplam} olay · ${sayim.acik} açık`,
    `${sayim.dogrulanmis} olayda doğrulanmış etki`,
    sayim.kopuk > 0 && `${sayim.kopuk} olayda zincir kopuk`,
    sayim.bozukOneri > 0 && `${sayim.bozukOneri} öneri kaydı okunamadı`,
  ].filter(Boolean).join(' · ');

  const satirlar: Satir[] = gosterilen.map((o) => {
    const im = olayImi(o);
    return {
      id: o.id,
      durum: im,
      kenar: im,
      konu: o.baslik,
      alt: olgu(o),
      hucreler: [
        o.tespitKaynagi
          ? TESPIT_SOZU[o.tespitKaynagi] ?? o.tespitKaynagi
          : <BilinmeyenHucre key="t" ad="Tespit kaynağı kaydedilmemiş" />,
        <span key="z" style={{ color: zincirKopuk(o) ? 'var(--unk)' : 'var(--i2)' }}>
          {zincirOzeti(o)}
        </span>,
        <UretimHucresi key="u" o={o} />,
      ],
    };
  });

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Olaylar · ${sayim.toplam} kayıt`}
          vurgu={baslik.vurgu}
          baslik={baslik.metin}
          vurguDurumu={sayim.dogrulamaBekleyen > 0 ? 'md' : undefined}
          metrikler={[
            {
              deger: sayim.dogrulamaBekleyen,
              yazi: 'Doğrulama bekleyen öneri',
              durum: sayim.dogrulamaBekleyen > 0 ? 'md' : undefined,
            },
            {
              deger: sayim.kopuk,
              yazi: 'Zinciri kopuk olay',
              durum: sayim.kopuk > 0 ? 'unk' : undefined,
            },
            {
              deger: sayim.bildirim,
              yazi: 'Bildirim tarihi girilmemiş',
              durum: sayim.bildirim > 0 ? 'bd' : undefined,
            },
          ]}
        />

        <section className="ekran-govde" style={{ paddingTop: 'var(--s20)' }}>
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id); setKuyrukAcik(false); }}
            kapsam={yazabilir ? (
              <button type="button" className="kapsam-dugme"
                onClick={() => { setYeniAcik(true); setSeciliId(null); }}>
                + Yeni olay
              </button>
            ) : undefined}
          />

          {sirali.length === 0 ? (
            <BosFiltre temizle={() => setMercek('hepsi')} />
          ) : (
            <Tablo
              konuBasligi="Olay"
              kolonlar={KOLONLAR}
              satirlar={satirlar}
              secili={seciliId}
              sec={(id) => {
                setSeciliId(id === seciliId ? null : id);
                setKip('ozet');
                setYeniAcik(false);
              }}
              kuyruk={toplanan.length > 0
                ? { metin: `+${toplanan.length} olay · sert olgu taşımıyor`,
                  ac: () => setKuyrukAcik(true) }
                : null}
              dipNot={dipNot}
            />
          )}

          {kuyrukAcik && (
            <p className="dip-not" style={{ marginTop: 'var(--s10)' }}>
              <button type="button" className="dg dg-satir"
                onClick={() => setKuyrukAcik(false)}>Kuyruğu topla</button>
            </p>
          )}
          <p className="dip-not" style={{ marginTop: 'var(--s6)' }}>
            Şiddet kademesi A→D · A en yüksek · elmas işaretli değerler motor
            ÖNERİSİdir, doğrulanana kadar etki sayılmaz
          </p>
        </section>
      </main>

      {secili && (
        <Cekmece kod={secili.kod} kapat={() => { setSeciliId(null); setKip('ozet'); }}>
          {kip === 'ozet' ? (
            <Detay
              o={secili}
              adaylar={adaylar}
              dogrulayabilir={dogrulayabilir}
              duzenle={() => setKip('duzenle')}
            />
          ) : (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Olayı düzenle</p>
              </div>
              <div className="cekmece-blok">
                <OlayDuzenleFormu olay={secili} santraller={santraller}
                  kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
        </Cekmece>
      )}

      {yeniAcik && !secili && (
        <Cekmece kod="Yeni olay" kapat={() => setYeniAcik(false)}>
          <div className="cekmece-blok">
            <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Olay aç</p>
          </div>
          <div className="cekmece-blok">
            <YeniOlayFormu santraller={santraller} kapat={() => setYeniAcik(false)} />
          </div>
        </Cekmece>
      )}
    </>
  );
}

/* ── hücreler ─────────────────────────────────────────────────────────── */

function BilinmeyenHucre({ ad }: { ad: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s6)',
      color: 'var(--i3)' }}>
      <Im durum="unk" ad={ad} /> —
    </span>
  );
}

/** Üretim etkisi hücresi — üç ayrı yüz:
    doğrulanmış değer (koyu, kendi rengi) · öneri (gri, elmas, "öneri")
    · hiçbiri (elmas + tire). İkisi asla aynı biçimde görünmez. */
function UretimHucresi({ o }: { o: OlayKaydi }) {
  const dogrulanmis = o.etki.uretimEtkisi;
  if (dogrulanmis !== null) {
    return (
      <span style={{ fontWeight: 600, color: `var(--${seviyeDurumu('uretimEtkisi', dogrulanmis)})` }}
        title={`Doğrulanmış etki · ${o.dogrulayan ?? 'doğrulayan kaydı yok'}`}>
        {seviyeSozu(dogrulanmis)}
      </span>
    );
  }
  const onerilen = o.oneri?.degerler.uretimEtkisi ?? 'bilinmiyor';
  if (o.oneriBozuk) return <BilinmeyenHucre ad="Öneri kaydı okunamadı" />;
  if (onerilen === 'bilinmiyor') {
    return <BilinmeyenHucre ad="Motor üretim etkisini belirleyemedi" />;
  }
  /* Satırın kendisi <button>; içine ikinci bir düğme konamaz (iç içe
     interaktif öge = hydration hatası). Dayanak metni ipucunda ve —
     kritik bilgi hover'da yaşamadığı için — çekmecede tam hâliyle durur. */
  return (
    <Ipucu genis metin={o.oneri?.dayanaklar.uretimEtkisi ?? ''}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s6)',
        fontSize: 'var(--t-cell)', color: 'var(--i2)', whiteSpace: 'nowrap',
        borderBottom: '1px dashed var(--hr2)' }}>
        <Im durum="unk" ad="Motor önerisi — doğrulanmadı" />
        {seviyeSozu(onerilen)} · öneri
      </span>
    </Ipucu>
  );
}

/* ── çekmece ──────────────────────────────────────────────────────────── */

function Detay({
  o, adaylar, dogrulayabilir, duzenle,
}: {
  o: OlayKaydi;
  adaylar: Record<BagTipi, BagAdayi[]>;
  dogrulayabilir: boolean;
  duzenle: () => void;
}) {
  const im = olayImi(o);
  const bekleyen = bekleyenAlanlar(o);

  return (
    <>
      <CekmeceKimlik durum={im} soz={imSozu(o)} baslik={o.baslik}
        cumle={o.ozet ?? undefined} />

      <CekmeceAlanlar alanlar={[
        {
          etiket: 'Tespit kaynağı',
          deger: o.tespitKaynagi ? TESPIT_SOZU[o.tespitKaynagi] ?? o.tespitKaynagi : '—',
          durum: o.tespitKaynagi ? undefined : 'unk',
        },
        { etiket: 'Şiddet', deger: `${KADEME[o.siddet] ?? '—'} · ${o.siddet}` },
        { etiket: 'Santral', deger: o.tesisAd ?? '—', durum: o.tesisAd ? undefined : 'unk' },
        { etiket: 'Başlangıç', deger: zamanTR(o.baslangic) },
        {
          etiket: 'Bildirim',
          deger: o.bildirimGerekli === null ? 'Değerlendirilmedi'
            : o.bildirimGerekli === false ? 'Gerekmiyor'
              : o.bildirimTarihi ? tarihTR(o.bildirimTarihi) : 'Gerekli · tarih girilmemiş',
          durum: o.bildirimGerekli === null ? 'unk'
            : bildirimBekliyor(o) ? 'bd' : undefined,
        },
      ]} />

      <EtkiBlogu o={o} />
      <ZincirBlogu o={o} />

      {(o.kokNeden || o.sinirlama || o.kurtarma || o.ogrenilenler) && (
        <CekmeceAlanlar alanlar={[
          { etiket: 'Kök neden', deger: o.kokNeden ?? '—', durum: o.kokNeden ? undefined : 'unk' },
          { etiket: 'Sınırlama', deger: o.sinirlama ?? '—', durum: o.sinirlama ? undefined : 'unk' },
          { etiket: 'Kurtarma', deger: o.kurtarma ?? '—', durum: o.kurtarma ? undefined : 'unk' },
          { etiket: 'Öğrenilenler', deger: o.ogrenilenler ?? '—',
            durum: o.ogrenilenler ? undefined : 'unk' },
        ]} />
      )}

      {o.riskler.length > 0 && <CekmeceBagli baslik="Bağlı risk" kayitlar={o.riskler} />}
      {o.bulgular.length > 0 && <CekmeceBagli baslik="Bağlı bulgu" kayitlar={o.bulgular} />}
      {o.projeler.length > 0 && <CekmeceBagli baslik="Bağlı proje" kayitlar={o.projeler} />}
      {o.degisiklikler.length > 0
        && <CekmeceBagli baslik="Bağlı değişiklik" kayitlar={o.degisiklikler} />}

      <OlayBaglari olay={o} adaylar={adaylar} yazilabilir={o.yazilabilir} />

      <EtkiDogrulama
        olay={o}
        bekleyen={bekleyen}
        dogrulayabilir={dogrulayabilir}
      />

      <CekmeceEylemler
        ikincil={o.yazilabilir ? <Dugme onClick={duzenle}>Kaydı düzenle</Dugme> : undefined}
        dipNot={o.yazilabilir
          ? 'Durum, müdahale ve öğrenme alanları düzenleme formunda; etki alanları orada YOKTUR.'
          : 'Bu olayın santral kapsamında yazma yetkiniz yok — kayıt okunabilir, değiştirilemez.'}
      />
      <OneriYenile olayId={o.id} yazabilir={o.yazilabilir}
        uretilme={o.oneri?.uretilme ?? null} />
    </>
  );
}

/** Öneri ve doğrulanmış etki AYRI kolonlarda: biri diğerinin yerine geçemez. */
function EtkiBlogu({ o }: { o: OlayKaydi }) {
  return (
    <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Etki</p>

      <div style={{ display: 'grid', gridTemplateColumns: '86px 1fr 1fr',
        gap: 'var(--s8) var(--s10)', alignItems: 'baseline' }}>
        <span className="t-caption" />
        <span className="t-caption">Motor önerisi</span>
        <span className="t-caption">Doğrulanmış</span>

        {ETKI_ALANLARI.map((alan) => {
          const onerilen = o.oneri?.degerler[alan] ?? 'bilinmiyor';
          const dogrulanmis = o.etki[alan];
          return (
            <EtkiSatiri key={alan} alan={alan} onerilen={onerilen}
              dayanak={o.oneri?.dayanaklar[alan] ?? null}
              dogrulanmis={dogrulanmis} oneriBozuk={o.oneriBozuk} />
          );
        })}
      </div>

      <p className="cekmece-dip" style={{ margin: 'var(--s14) 0 0' }}>
        {o.dogrulamaZamani
          ? `Son doğrulama ${zamanTR(o.dogrulamaZamani)}`
            + (o.dogrulayan ? ` · ${o.dogrulayan}` : '')
          : 'Hiçbir etki alanı doğrulanmadı — bu olay raporlarda etkisiz DEĞİL, '
            + 'değerlendirilmemiş sayılır.'}
      </p>
    </div>
  );
}

function EtkiSatiri({
  alan, onerilen, dayanak, dogrulanmis, oneriBozuk,
}: {
  alan: EtkiAlani; onerilen: string; dayanak: string | null;
  dogrulanmis: string | null; oneriBozuk: boolean;
}) {
  const oneriDurumu: Durum = 'unk';
  return (
    <>
      <span style={{ fontSize: 'var(--t-label)', color: 'var(--i2)' }}>
        {ETKI_ALAN_ETIKET[alan]}
      </span>

      {/* Öneri: DAİMA gri + elmas. Doğrulanmış değerle aynı ağırlığı almaz. */}
      <span style={{ minWidth: 0 }}>
        {oneriBozuk ? (
          <span style={{ fontSize: 'var(--t-label)', color: 'var(--bd)' }}>
            öneri kaydı okunamadı
          </span>
        ) : (
          <Ipucu genis metin={dayanak ?? 'dayanak kaydı yok'}>
            <button type="button" className="acikla"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s6)',
                fontSize: 'var(--t-cell)', color: 'var(--i2)', textAlign: 'left' }}>
              <Im durum={oneriDurumu} ad="Motor önerisi" />
              {seviyeSozu(onerilen)}
            </button>
          </Ipucu>
        )}
      </span>

      {/* Doğrulanmış etki: gerçek değer. Yoksa TİRE — sıfır ya da "yok" değil. */}
      <span style={{ fontSize: 'var(--t-cell)', fontWeight: dogrulanmis ? 600 : 400,
        color: dogrulanmis ? `var(--${seviyeDurumu(alan, dogrulanmis)})` : 'var(--i3)' }}>
        {dogrulanmis ? seviyeSozu(dogrulanmis) : '—'}
      </span>
    </>
  );
}

/** Zincir görünümü: varlık → sistem → süreç → tesis. Kopan halka
    NEREDE koptuğunu yazar; boş bırakılıp "yok" gibi görünmez. */
function ZincirBlogu({ o }: { o: OlayKaydi }) {
  const zincir = o.oneri?.zincir ?? [];
  return (
    <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>
        Etki zinciri{zincir.length > 0 ? ` · ${zincir.length} halka` : ''}
      </p>
      {zincir.length === 0 ? (
        <p className="cekmece-dip" style={{ margin: 0 }}>
          {o.oneriBozuk
            ? 'Öneri kaydı okunamadı — motoru yeniden çalıştırın.'
            : o.oneri === null
              ? 'Etki önerisi henüz üretilmedi — motor bu olayı işlemedi.'
              : 'Olaya varlık ya da sistem bağlanmamış; zincir kurulamıyor.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          {zincir.map((h, i) => <Halka key={i} h={h} />)}
        </div>
      )}
    </div>
  );
}

function Halka({ h }: { h: HalkaGorunumu }) {
  const adimlar = [
    h.varlik ? { ad: h.varlik.etiket, alt: `varlık · ${h.varlik.kritiklik}` } : null,
    h.sistem ? { ad: h.sistem.kod, alt: `sistem · ${h.sistem.kritiklik}` } : null,
    ...h.surecler.map((s) => ({ ad: s.kod, alt: `süreç · ${seviyeSozu(s.uretimEtkisi)}` })),
    ...h.tesisler.map((t) => ({
      ad: t.kod,
      alt: `tesis · ${t.kritikAltyapi === true ? 'kritik altyapı'
        : t.kritiklikSinifi ? `sınıf ${t.kritiklikSinifi}` : 'sınıf kaydı yok'}`,
    })),
  ].filter((x): x is { ad: string; alt: string } => x !== null);

  return (
    <div style={{ background: 'var(--card)', border: 'var(--bw-hair) solid var(--hr2)',
      padding: 'var(--s12) var(--s14)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline',
        gap: 'var(--s6)' }}>
        {adimlar.map((a, i) => (
          <span key={`${a.ad}-${i}`} style={{ display: 'inline-flex', alignItems: 'baseline',
            gap: 'var(--s6)' }}>
            {i > 0 && <span aria-hidden style={{ color: 'var(--i3)' }}>→</span>}
            <span title={a.alt} style={{ fontFamily: 'var(--mo)', fontSize: 'var(--t-label)',
              fontWeight: 600 }}>{a.ad}</span>
          </span>
        ))}
      </div>
      <p className="cekmece-dip" style={{ margin: 'var(--s6) 0 0' }}>
        {adimlar.map((a) => a.alt).join(' · ')}
      </p>
      {h.kopukluk && (
        <p style={{ margin: 'var(--s8) 0 0', display: 'flex', alignItems: 'center',
          gap: 'var(--s6)', fontSize: 'var(--t-label)', color: 'var(--unk)' }}>
          <Im durum="unk" ad="Zincir kopuk" />
          zincir burada kopuyor — {KOPUKLUK_SOZU[h.kopukluk] ?? h.kopukluk}
        </p>
      )}
    </div>
  );
}
