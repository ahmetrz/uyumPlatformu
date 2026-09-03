'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import Link from 'next/link';
import { BosIlk, Im, TikSeridi, Yetkisiz } from '@/components/kabuk/temel';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi, KipDegistir } from '@/components/kabuk/ekran';
import { Cekmece } from '@/components/kabuk/panel';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import type { ConnectorSagligi, EntegrasyonOzeti } from '@/lib/entegrasyon/saglikOzeti';
import { TumunuCalistir } from './Eylemler';
import {
  ConnectorOzeti, KaliteOzeti, MotorOzeti, YeniConnector,
} from './Cekmeceler';
import { KaynakOzeti, KokenTipiOzeti } from './KokenCekmeceleri';
import {
  CONNECTOR_TIP, ENTEGRASYON_IM, ENTEGRASYON_SOZU, GORUNUR_BUTCE, TETIKLEYEN,
  baslikMetni, bolumle, connectorAlt, connectorToplanabilir, dkFmt, kaliteImi,
  kaliteSirala, kaliteToplanabilir, kaynakImi, kaynakToplanabilir, kokenImi,
  kokenSirala, kokensizVar, kokensizYazisi, metrikleriHesapla, motorImi,
  motorToplanabilir, motorlariSirala, ortalamaGuvenYazisi, ortamRengi, ortamYazisi,
  kosuGecmisi, kosuGecmisiEtiketi,
  saglayiciImi, saglayiciNotu, sonKosu, sureFmt,
  tazelikDurumu, tazelikYazisi,
  type KaliteBulgusu, type Kip, type KokenOzeti, type KokenSayimSatiri,
  type KaynakSatiri, type Motor,
} from './mantik';

/* Platform sağlığı — "otomasyon sessizce mi durdu?"

   Tek canvas modülü + kip anahtarı: motorlar · entegrasyonlar · veri
   kalitesi. Üçü de aynı soruya cevap verdiği için aynı tabloda yaşar;
   yığılmasınlar diye kip değiştirilir (02-components §12).

   Durum sözcüğü canvasta YAZILMAZ: işaretçi koşunun tamamlanıp
   tamamlanmadığını söyler, sayı kolonları ne işlendiğini. Sözcük yalnız
   çekmecenin kimlik bloğunda geçer. Detay modalda değil 420px çekmecede
   açılır — önceki sürümdeki iki <dialog> kalktı. */

const MOTOR_KOLONLARI: Kolon[] = [
  /* Geçmiş şeridi SON KOŞUDAN ÖNCE gelir: okuyucu önce eğilimi ("beş
     koşudur patlıyor"), sonra son olayın zamanını görür. */
  { baslik: 'Son 5 koşu', genislik: '52px' },
  { baslik: 'Son koşu', genislik: '146px' },
  { baslik: 'İşlenen → üretilen', genislik: '134px', sag: true },
  { baslik: 'Süre', genislik: '78px', sag: true, ikincil: true },
];

/* ORTAM kolonu birincildir ve dar alanda DÜŞMEZ: bir connector'ın hangi
   ortamın sistemine baktığı güvenlik bilgisidir. Sayaçlar ikincildir —
   çekmece açıkken kaybolmaları bir şey gizlemez. */
const ENTEGRASYON_KOLONLARI: Kolon[] = [
  { baslik: 'Ortam', genislik: '94px' },
  { baslik: 'Son koşu', genislik: '146px' },
  { baslik: 'Alınan → kabul', genislik: '124px', sag: true, ikincil: true },
  { baslik: 'Veri tazeliği', genislik: '118px', sag: true, ikincil: true },
];

const KOKEN_KOLONLARI: Kolon[] = [
  { baslik: 'Beslediği kayıt', genislik: '104px', sag: true },
  { baslik: 'Doğrulanmamış', genislik: '108px', sag: true },
  { baslik: 'Bayat', genislik: '70px', sag: true, ikincil: true },
  { baslik: 'Ort. güven', genislik: '90px', sag: true, ikincil: true },
];

/* Kural ve tespit tarihi satırın ALT SATIRINDA duruyordu; ayrıca kolon
   yapmak aynı olguyu iki kez yazmak olurdu. Kolonlar bulgunun işaret ettiği
   kayda ve tespit tarihine ayrıldı. */
const KALITE_KOLONLARI: Kolon[] = [
  { baslik: 'İlgili kayıt', genislik: '190px' },
  { baslik: 'Tespit', genislik: '104px', sag: true, ikincil: true },
];

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

export default function SaglikIstemci({
  motorlar, kalite, entegrasyon, koken, yazabilir,
}: {
  motorlar: Motor[]; kalite: KaliteBulgusu[];
  entegrasyon: EntegrasyonOzeti; koken: KokenOzeti; yazabilir: boolean;
}) {
  const [kip, setKip] = useUrlDurumu<Kip>('kip', 'motor');
  const [secili, setSecili] = useUrlDurumuBos('sec');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [yeniAcik, setYeniAcik] = useState(false);

  /* Metrikler kipten BAĞIMSIZ: platformun tamamını anlatır (06 §A2). */
  const m = useMemo(
    () => metrikleriHesapla(motorlar, entegrasyon.connectorlar, kalite),
    [motorlar, entegrasyon.connectorlar, kalite],
  );

  const siraliMotorlar = useMemo(() => motorlariSirala(motorlar), [motorlar]);
  const siraliKalite = useMemo(() => kaliteSirala(kalite), [kalite]);
  const siraliSayimlar = useMemo(() => kokenSirala(koken.sayimlar), [koken.sayimlar]);

  const motorBolum = useMemo(
    () => bolumle(siraliMotorlar, motorToplanabilir, kuyrukAcik, GORUNUR_BUTCE),
    [siraliMotorlar, kuyrukAcik]);
  const connectorBolum = useMemo(
    () => bolumle(entegrasyon.connectorlar, connectorToplanabilir, kuyrukAcik, GORUNUR_BUTCE),
    [entegrasyon.connectorlar, kuyrukAcik]);
  const kaliteBolum = useMemo(
    () => bolumle(siraliKalite, kaliteToplanabilir, kuyrukAcik, GORUNUR_BUTCE),
    [siraliKalite, kuyrukAcik]);
  const kaynakBolum = useMemo(
    () => bolumle(koken.kaynaklar, kaynakToplanabilir, kuyrukAcik, GORUNUR_BUTCE),
    [koken.kaynaklar, kuyrukAcik]);
  /* Kökeni olmayan kayıt taşıyan tip HİÇBİR KOŞULDA kuyruğa inmez —
     `kokenToplanabilir` yalnız tamamen doğrulanmış satırı toplar. */
  const tipBolum = useMemo(
    () => bolumle(siraliSayimlar, (x) => kokenImi(x) === 'ok', kuyrukAcik, GORUNUR_BUTCE),
    [siraliSayimlar, kuyrukAcik]);

  const secilenMotor = kip === 'motor'
    ? motorlar.find((x) => x.ad === secili) ?? null : null;
  const secilenConnector = kip === 'entegrasyon'
    ? entegrasyon.connectorlar.find((c) => c.id === secili) ?? null : null;
  const secilenBulgu = kip === 'kalite'
    ? kalite.find((b) => b.id === secili) ?? null : null;
  /* Köken kipinde iki kayıt ailesi var (kaynak sistem · kayıt tipi); seçim
     kimliği önekle ayrılır ki id uzayları çakışmasın. */
  const secilenKaynak = kip === 'koken' && secili?.startsWith('kaynak:')
    ? koken.kaynaklar.find((x) => `kaynak:${x.kaynakSistem}` === secili) ?? null : null;
  const secilenTip = kip === 'koken' && secili?.startsWith('tip:')
    ? koken.sayimlar.find((x) => `tip:${x.varlikTipi}` === secili) ?? null : null;

  // Kip değişince seçim ve kuyruk sıfırlanır: id uzayları ayrıdır.
  function kipiDegistir(yeni: string) {
    setKip(yeni as Kip);
    setSecili(null);
    setKuyrukAcik(false);
    setYeniAcik(false);
  }

  /** Köken kipinin kip düğmesindeki sayısı: doğrulama bekleyen kayıt.
      Metrik satırı DÖRTTE kalsın diye sayı burada yaşar (06 §A2). */
  const bekleyenSayisi = koken.bekleyenler.length;

  const bas = baslikMetni(m);
  const sec = (id: string) => setSecili((o) => (o === id ? null : id));

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Platform sağlığı · ${m.motorToplam} motor · ${m.connectorToplam} bağlantı`}
          vurgu={bas.vurgu}
          vurguDurumu={bas.durum}
          baslik={bas.ad}
          sag={<TumunuCalistir yazabilir={yazabilir} />}
          metrikler={[
            { deger: m.basarisiz, yazi: 'Koşu hatası',
              durum: m.basarisiz > 0 ? 'bd' : undefined },
            // Bilinmeyen ≠ sıfır: hiç koşmamış kaynak "sağlıklı" değildir.
            { deger: m.olculmedi, yazi: 'Hiç ölçülmedi',
              durum: m.olculmedi > 0 ? 'unk' : undefined },
            { deger: m.kimlikBekleyen, yazi: 'Kimlik bekliyor',
              durum: m.kimlikBekleyen > 0 ? 'pl' : undefined },
            { deger: m.kaliteAcik, yazi: 'Veri boşluğu',
              durum: m.kaliteAcik > 0 ? 'md' : undefined },
          ]}
        />

        <section className="ab-ekran-govde">
          <KipDegistir
            aktif={kip}
            sec={kipiDegistir}
            secenekler={[
              { id: 'motor', ad: `Motorlar ${m.motorToplam}` },
              { id: 'entegrasyon', ad: `Entegrasyonlar ${m.connectorToplam}` },
              { id: 'kalite', ad: `Veri kalitesi ${m.kaliteAcik}` },
              { id: 'koken', ad: `Veri kökeni ${bekleyenSayisi}` },
            ]}
          />

          <div style={{ marginTop: 'var(--s26)' }}>
            {kip === 'motor' && (
              <MotorTablosu bolum={motorBolum} secili={secili} sec={sec}
                kuyrugaAc={() => setKuyrukAcik(true)} olculmedi={m.olculmedi} />
            )}
            {kip === 'entegrasyon' && (
              <EntegrasyonTablosu ozet={entegrasyon} bolum={connectorBolum}
                secili={secili} sec={sec} kuyrugaAc={() => setKuyrukAcik(true)}
                yazabilir={yazabilir} yeniAc={() => { setSecili(null); setYeniAcik(true); }} />
            )}
            {kip === 'kalite' && (
              <KaliteTablosu bolum={kaliteBolum} secili={secili} sec={sec}
                kuyrugaAc={() => setKuyrukAcik(true)} toplam={kalite.length} />
            )}
            {kip === 'koken' && (
              <KokenBolumu ozet={koken} kaynakBolum={kaynakBolum} tipBolum={tipBolum}
                secili={secili} sec={sec} kuyrugaAc={() => setKuyrukAcik(true)} />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end',
            padding: 'var(--s14) 0 0' }}>
            <DisaAktar motorlar={motorlar} kalite={kalite} entegrasyon={entegrasyon} />
          </div>
        </section>
      </main>

      {secilenMotor && (
        <Cekmece kod={secilenMotor.ad} kapat={() => setSecili(null)}>
          <MotorOzeti motor={secilenMotor} yazabilir={yazabilir} />
        </Cekmece>
      )}

      {secilenConnector && (
        <Cekmece kod={secilenConnector.kod} kapat={() => setSecili(null)}>
          <ConnectorOzeti c={secilenConnector} ozet={entegrasyon}
            yazabilir={yazabilir} kapat={() => setSecili(null)} />
        </Cekmece>
      )}

      {yeniAcik && !secilenConnector && (
        <Cekmece kod="YENİ BAĞLANTI" kapat={() => setYeniAcik(false)}>
          <YeniConnector yazabilir={yazabilir} kapat={() => setYeniAcik(false)} />
        </Cekmece>
      )}

      {secilenKaynak && (
        <Cekmece kod={secilenKaynak.kaynakSistem} kapat={() => setSecili(null)}>
          <KaynakOzeti k={secilenKaynak} ozet={koken} />
        </Cekmece>
      )}

      {secilenTip && (
        <Cekmece kod={secilenTip.varlikTipi} kapat={() => setSecili(null)}>
          <KokenTipiOzeti s={secilenTip} />
        </Cekmece>
      )}

      {secilenBulgu && (
        <Cekmece kod={secilenBulgu.kural} kapat={() => setSecili(null)}>
          <KaliteOzeti b={secilenBulgu} />
        </Cekmece>
      )}
    </>
  );
}

/* ── Motor tablosu ──────────────────────────────────────────────────── */

function MotorTablosu({ bolum, secili, sec, kuyrugaAc, olculmedi }: {
  bolum: { gorunur: Motor[]; toplanan: Motor[] };
  secili: string | null; sec: (id: string) => void; kuyrugaAc: () => void;
  olculmedi: number;
}) {
  const satirlar: Satir[] = bolum.gorunur.map((mo) => {
    const s = sonKosu(mo);
    const im = motorImi(mo);
    return {
      id: mo.ad,
      durum: im,
      kenar: im,
      konu: mo.etiket,
      alt: `${mo.ad}${mo.elleCalisir ? '' : ' · zincirden koşar'}`,
      hucreler: [
        /* Koşu geçmişi şeridi: satır artık "son koşu ne oldu" değil "son
           beş koşu ne oldu" diyor. "Bir kez patladı" ile "beş koşudur
           patlıyor" aynı satırdı ve fark ancak çekmece açılınca
           görülüyordu — ikisi çok farklı kararlar gerektirir. */
        <TikSeridi key="g" tikler={kosuGecmisi(mo)} etiket={kosuGecmisiEtiketi(mo)} />,
        s ? zamanTR(s.baslangic) : <span key="k" style={{ color: 'var(--i3)' }}>koşu kaydı yok</span>,
        s ? `${s.islenen} → ${s.uretilen}` : <Bos key="i" />,
        s ? sureFmt(s.sureMs) : <Bos key="s" />,
      ],
    };
  });

  if (satirlar.length === 0 && bolum.toplanan.length === 0) {
    return <BosIlk cumle="Motor kataloğu boş — hiçbir otomasyon tanımlı değil." />;
  }

  const parcalar = [`${bolum.gorunur.length} motor görünüyor`];
  if (olculmedi > 0) parcalar.push(`${olculmedi} kaynak hiç ölçülmedi — sıfır değil, bilinmeyen`);
  parcalar.push('şerit son 5 koşu · ayrıntı kaydın çekmecesinde');

  return (
    <Tablo
      konuBasligi="Motor"
      kolonlar={MOTOR_KOLONLARI}
      satirlar={satirlar}
      secili={secili}
      sec={sec}
      kuyruk={bolum.toplanan.length > 0
        ? { metin: `+${bolum.toplanan.length} motor · son koşusu hatasız bitti`, ac: kuyrugaAc }
        : null}
      dipNot={parcalar.join(' · ')}
    />
  );
}

/* ── Entegrasyon tablosu ─────────────────────────────────────────────── */

function EntegrasyonTablosu({ ozet, bolum, secili, sec, kuyrugaAc, yazabilir, yeniAc }: {
  ozet: EntegrasyonOzeti;
  bolum: { gorunur: ConnectorSagligi[]; toplanan: ConnectorSagligi[] };
  secili: string | null; sec: (id: string) => void; kuyrugaAc: () => void;
  yazabilir: boolean; yeniAc: () => void;
}) {
  /* Yetkisiz kullanıcıya maskeli sır referansı bile gitmez: özet katmanı
     boş döner ve ekran bunu boş veri gibi değil, kapalı kapı gibi gösterir. */
  if (!ozet.yetkili) return <Yetkisiz rol="yönetim okuma" />;

  if (ozet.connectorlar.length === 0) {
    return (
      <>
        <BosIlk
          cumle={'Tanımlı connector yok. Bir dış sistem bağlandığında son '
            + 'koşusu, alınan/kabul/red sayaçları ve veri tazeliği burada görünür.'}
          eylem={yazabilir
            ? <button type="button" className="ab-dugme birincil" onClick={yeniAc}>
                Bağlantı tanımla
              </button>
            : undefined}
        />
        <SaglayiciDurumu ozet={ozet} />
      </>
    );
  }

  const satirlar: Satir[] = bolum.gorunur.map((c) => {
    const s = c.sonKosu;
    const im = ENTEGRASYON_IM[c.durum];
    const tz = tazelikDurumu(c.tazelik);
    return {
      id: c.id,
      durum: im,
      kenar: im,
      konu: c.ad,
      alt: connectorAlt(c),
      hucreler: [
        /* Ortam bir DURUM değil, kaydın niteliğidir: işaretçiyle değil
           kendi rengiyle yazılır ve üretim ayrı okunur. */
        <span key="o" className="mono" style={{ color: ortamRengi(c.ortam),
          fontSize: 'var(--t-label)' }}>
          {ortamYazisi(c.ortam)}
        </span>,
        s ? zamanTR(s.baslangic) : <span key="k" style={{ color: 'var(--i3)' }}>koşu kaydı yok</span>,
        s ? `${s.alinan} → ${s.kabulEdilen}` : <Bos key="a" />,
        <span key="t" style={tz ? { color: `var(--${tz})` } : undefined}>
          {tazelikYazisi(c.tazelik)}
        </span>,
      ],
    };
  });

  const parcalar = [`${bolum.gorunur.length} bağlantı görünüyor`];
  const uretim = ozet.connectorlar.filter((c) => c.ortam === 'uretim').length;
  const ortamsiz = ozet.connectorlar.filter((c) => c.ortam === null).length;
  if (uretim > 0) parcalar.push(`${uretim} bağlantı ÜRETİM sistemine bakıyor`);
  // Bilinmeyen ortam sıfır sayılmaz: sayılsaydı "hiç üretim yok" gibi okunurdu.
  if (ortamsiz > 0) parcalar.push(`${ortamsiz} bağlantının ortamı kayıtta yok`);
  const kuruSayisi = ozet.connectorlar.filter((c) => c.kuruGecmis.length > 0).length;
  if (kuruSayisi > 0) {
    parcalar.push(`${kuruSayisi} bağlantının kuru koşusu var — kuru koşu veri yazmaz, `
      + 'gerçek koşu sayılmaz');
  }
  if (ozet.zamanlayici.okundu) {
    const koşmayan = Object.keys(ozet.zamanlayici.connectorSebep).length;
    parcalar.push(`zamanlayıcı: ${ozet.zamanlayici.connectorVadeli.length} vadesi gelmiş · `
      + `${koşmayan} koşmuyor (sebebi kaydın çekmecesinde)`);
  } else {
    parcalar.push('zamanlayıcı durumu okunamadı — koşmadıkları anlamına gelmez');
  }
  if (ozet.bagimsizKosular.length > 0) {
    parcalar.push('connector kaydına bağlı olmayan koşular: '
      + ozet.bagimsizKosular.map((b) =>
        `${b.toplam} ${TETIKLEYEN[b.tetikleyen] ?? etiketle(b.tetikleyen)}`
        + (b.basarisiz > 0 ? ` (${b.basarisiz} hatalı)` : '')
        + (b.bayat > 0 ? ` (${b.bayat} bayat)` : '')).join(' · '));
  }
  if (ozet.arsivKosuSayisi > 0) {
    parcalar.push(`${ozet.arsivKosuSayisi} koşu artık listelenmeyen bir connector kaydına ait`);
  }

  return (
    <>
      <Tablo
        konuBasligi="Bağlantı"
        kolonlar={ENTEGRASYON_KOLONLARI}
        satirlar={satirlar}
        secili={secili}
        sec={sec}
        kuyruk={bolum.toplanan.length > 0
          ? { metin: `+${bolum.toplanan.length} bağlantı · son koşusu hatasız bitti`, ac: kuyrugaAc }
          : null}
        dipNot={parcalar.join(' · ')}
      />
      {yazabilir && (
        <div style={{ marginTop: 'var(--s12)' }}>
          <button type="button" className="ab-dugme ab-baskida-gizle" onClick={yeniAc}>
            ＋ Yeni bağlantı
          </button>
        </div>
      )}
      <SaglayiciDurumu ozet={ozet} />
      <ReddedilenBagi adet={ozet.reddedilenAcik} />
    </>
  );
}

/** Sır sağlayıcı defteri. BAĞLI OLMAYAN SAĞLAYICI GİZLENMEZ: `vault` bugün
    bağlı değildir ve bunu söylemek, "sır neden çözülmüyor" sorusunun tek
    dürüst cevabıdır. Durum sözcüğü işaretçinin yanına tekrar yazılmaz;
    bağlı olmayanın yerine NE GEREKTİĞİ yazılır. */
function SaglayiciDurumu({ ozet }: { ozet: EntegrasyonOzeti }) {
  if (ozet.saglayicilar.length === 0) return null;
  return (
    <div style={{ marginTop: 'var(--s22)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Sır sağlayıcıları</p>
      <div style={{ display: 'grid', gap: 'var(--s8)' }}>
        {ozet.saglayicilar.map((sg) => {
          const not = saglayiciNotu(sg);
          return (
            <div key={sg.ad} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
              gap: 'var(--s8)', alignItems: 'start' }}>
              <span style={{ paddingTop: 3 }}>
                <Im durum={saglayiciImi(sg)}
                  ad={sg.bagli ? `${sg.ad} bağlı` : `${sg.ad} bağlı değil`} />
              </span>
              <span style={{ minWidth: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
                <span className="mono">{sg.ad}</span>
                {not && <span style={{ color: 'var(--pl)' }}> · {not}</span>}
              </span>
            </div>
          );
        })}
      </div>
      <p className="etiket" style={{ margin: 'var(--s10) 0 0' }}>
        Sırrın DEĞERİ hiçbir sağlayıcıdan bu ekrana inmez; yalnız adresi ve
        sağlayıcının bağlı olup olmadığı görünür.
      </p>
    </div>
  );
}

/** Dead-letter kuyruğu ayrı rotada yaşar (yoğunluk sözleşmesi), ama sayısı
    burada görünür: fark edilmeyen bir kuyruk, olmayan bir kuyruktur. */
function ReddedilenBagi({ adet }: { adet: number }) {
  return (
    <p style={{ margin: 'var(--s16) 0 0', fontSize: 'var(--t-field)' }}>
      <Link href="/saglik/reddedilenler" className="ab-dugme">
        {adet > 0
          ? `${adet} reddedilen kayıt inceleme bekliyor →`
          : 'Reddedilen kayıt kuyruğu →'}
      </Link>
    </p>
  );
}

/* ── Veri kalitesi tablosu ───────────────────────────────────────────── */

function KaliteTablosu({ bolum, secili, sec, kuyrugaAc, toplam }: {
  bolum: { gorunur: KaliteBulgusu[]; toplanan: KaliteBulgusu[] };
  secili: string | null; sec: (id: string) => void; kuyrugaAc: () => void;
  toplam: number;
}) {
  if (toplam === 0) {
    return (
      <BosIlk cumle={'Açık veri kalitesi bulgusu yok. Motor koştuğunda bulduğu '
        + 'boşluklar burada listelenir.'} />
    );
  }

  const satirlar: Satir[] = bolum.gorunur.map((b) => ({
    id: b.id,
    durum: kaliteImi(b),
    kenar: kaliteImi(b),
    konu: b.aciklama,
    alt: `${etiketle(b.kural)} · ${etiketle(b.kaynakTipi)}`,
    hucreler: [
      b.kayitEtiket
        ? <span key="r" className="mono">{b.kayitEtiket}</span>
        : <span key="r" style={{ color: 'var(--i3)' }}>kayıt silinmiş</span>,
      tarihTR(b.olusturuldu),
    ],
  }));

  const silinmis = bolum.gorunur.filter((b) => b.kayitEtiket === null).length
    + bolum.toplanan.filter((b) => b.kayitEtiket === null).length;

  const parcalar = [`${toplam} açık bulgu`];
  if (silinmis > 0) {
    parcalar.push(`${silinmis} bulgunun işaret ettiği kayıt silinmiş — doğrulanamıyor`);
  }

  return (
    <Tablo
      konuBasligi="Bulgu"
      kolonlar={KALITE_KOLONLARI}
      satirlar={satirlar}
      secili={secili}
      sec={sec}
      kuyruk={bolum.toplanan.length > 0
        ? { metin: `+${bolum.toplanan.length} bulgu daha`, ac: kuyrugaAc }
        : null}
      dipNot={parcalar.join(' · ')}
    />
  );
}

/* ── Veri kökeni bölümü ─────────────────────────────────────────────── */

/**
 * Köken kipi iki kayıt ailesi taşır: KAYNAK SİSTEM (veriyi kim besliyor)
 * ve KAYIT TİPİ (o verinin kökeni ne durumda). İkisi ayrı tablolarda
 * durur çünkü ayrı sorulardır; seçim kimlikleri `kaynak:`/`tip:` önekiyle
 * ayrılır.
 *
 * DEĞİŞMEZ: kökeni olmayan kayıt gizlenmez. Tip tablosunun ilk sayısal
 * kolonu "kökeni yok"tur ve kökeni olmayan kayıt taşıyan satır hiçbir
 * koşulda kuyruğa toplanmaz.
 */
function KokenBolumu({ ozet, kaynakBolum, tipBolum, secili, sec, kuyrugaAc }: {
  ozet: KokenOzeti;
  kaynakBolum: { gorunur: KaynakSatiri[]; toplanan: KaynakSatiri[] };
  tipBolum: { gorunur: KokenSayimSatiri[]; toplanan: KokenSayimSatiri[] };
  secili: string | null; sec: (id: string) => void; kuyrugaAc: () => void;
}) {
  if (!ozet.yetkili) return <Yetkisiz rol="envanter okuma" />;

  const kaynakSatirlari: Satir[] = kaynakBolum.gorunur.map((k) => {
    const im = kaynakImi(k);
    return {
      id: `kaynak:${k.kaynakSistem}`,
      durum: im,
      kenar: im,
      konu: k.kaynakSistem,
      alt: `${k.dogrulanmis} doğrulanmış · son aktarım ${tarihTR(k.sonAktarim)}`,
      hucreler: [
        k.kayit,
        k.dogrulanmadi > 0
          ? <span key="d" style={{ color: 'var(--md)' }}>{k.dogrulanmadi}</span>
          : k.dogrulanmadi,
        k.bayat > 0
          ? <span key="b" style={{ color: 'var(--unk)' }}>{k.bayat}</span>
          : k.bayat,
        // Ölçülmemiş güven "%0" yazılmaz.
        <span key="g" style={k.ortalamaGuven === null ? { color: 'var(--i3)' } : undefined}>
          {ortalamaGuvenYazisi(k.ortalamaGuven)}
        </span>,
      ],
    };
  });

  const kaynakNotu = [
    ozet.kaynaklar.length > 0
      ? `${kaynakBolum.gorunur.length} kaynak sistem görünüyor`
      : 'Hiç köken kaydı yok — gelen verinin kaynağı henüz yazılmamış',
    `bayat eşiği ${ozet.esikGun} gün`,
  ];
  if (ozet.kapsanamayanTipler.length > 0) {
    kaynakNotu.push(`santral kapsamına daraltılamayan tipler rapordan düştü: `
      + ozet.kapsanamayanTipler.join(', '));
  }
  if (ozet.tesisiBilinmeyen > 0) {
    kaynakNotu.push(`${ozet.tesisiBilinmeyen} köken satırının santrali belirlenemedi`);
  }

  return (
    <>
      {ozet.kaynaklar.length === 0 ? (
        <BosIlk cumle={'Hiç köken kaydı yok. Bir connector veri getirdiğinde hangi '
          + 'kaynağın hangi kaydı beslediği burada görünür. Kökeni olmayan '
          + 'kayıtlar aşağıda yine de sayılır.'} />
      ) : (
        <Tablo
          konuBasligi="Kaynak sistem"
          kolonlar={KOKEN_KOLONLARI}
          satirlar={kaynakSatirlari}
          secili={secili}
          sec={sec}
          kuyruk={kaynakBolum.toplanan.length > 0
            ? { metin: `+${kaynakBolum.toplanan.length} kaynak · kayıtları doğrulanmış`,
              ac: kuyrugaAc }
            : null}
          dipNot={kaynakNotu.join(' · ')}
        />
      )}

      <TipKokenleri bolum={tipBolum} secili={secili} sec={sec} />
    </>
  );
}

/** Kayıt tipine göre köken — "kökeni yok" sayısının yaşadığı yer.
    Tablo DEĞİL bir liste: aynı canvasta iki başlıklı tablo, hangisinin
    hangi soruya cevap verdiğini bulanıklaştırırdı. */
function TipKokenleri({ bolum, secili, sec }: {
  bolum: { gorunur: KokenSayimSatiri[]; toplanan: KokenSayimSatiri[] };
  secili: string | null; sec: (id: string) => void;
}) {
  if (bolum.gorunur.length === 0 && bolum.toplanan.length === 0) return null;
  const kokensiz = bolum.gorunur.filter(kokensizVar).length
    + bolum.toplanan.filter(kokensizVar).length;

  return (
    <div style={{ marginTop: 'var(--s26)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Kayıt tipine göre köken
      </p>
      <div style={{ display: 'grid', gap: 'var(--s8)' }}>
        {bolum.gorunur.map((t) => {
          const im = kokenImi(t);
          const id = `tip:${t.varlikTipi}`;
          return (
            <button key={id} type="button" onClick={() => sec(id)}
              aria-pressed={secili === id}
              style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto',
                gap: 'var(--s8)', alignItems: 'center', textAlign: 'left',
                background: 'none', border: 0, padding: '2px 0', cursor: 'pointer',
                color: 'inherit', font: 'inherit' }}>
              <span><Im durum={im} /></span>
              <span style={{ minWidth: 0, fontSize: 'var(--t-field)' }}>
                {etiketle(t.varlikTipi)}
              </span>
              <span className="mono" style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                {/* Kökeni yok · doğrulama bekleyen · doğrulanmış */}
                <span style={{ color: kokensizVar(t) ? 'var(--unk)' : undefined }}>
                  kökeni yok {kokensizYazisi(t)}
                </span>
                {' · '}
                <span style={{ color: t.otomatik > 0 ? 'var(--md)' : undefined }}>
                  bekleyen {t.otomatik}
                </span>
                {' · doğrulanmış '}{t.dogrulanmis}
              </span>
            </button>
          );
        })}
      </div>
      <p className="etiket" style={{ margin: 'var(--s10) 0 0' }}>
        {kokensiz > 0
          ? `${kokensiz} kayıt tipinde kaynak bağlamı olmayan kayıt var — bu kayıtlar `
            + 'gizlenmez ve hiçbir koşulda “doğrulanmış” görünmez.'
          : 'Her kayıt tipinde kaynağı belli olmayan kayıt yok.'}
        {bolum.toplanan.length > 0
          && ` +${bolum.toplanan.length} tipin tamamı doğrulanmış (kuyrukta).`}
      </p>
    </div>
  );
}

/** Dışa aktarım tabloyu izleyen tek sessiz bağlantı — filtre bütçesi dışında. */
function DisaAktar({ motorlar, kalite, entegrasyon }: {
  motorlar: Motor[]; kalite: KaliteBulgusu[]; entegrasyon: EntegrasyonOzeti;
}) {
  const kok = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const kapat = (e: Event) => {
      const el = kok.current;
      if (!el?.open) return;
      if (e.type === 'keydown') {
        if ((e as KeyboardEvent).key === 'Escape') el.open = false;
        return;
      }
      if (!el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener('mousedown', kapat);
    document.addEventListener('keydown', kapat);
    return () => {
      document.removeEventListener('mousedown', kapat);
      document.removeEventListener('keydown', kapat);
    };
  }, []);

  const kapatVe = (e: React.MouseEvent, is: () => void) => {
    e.currentTarget.closest('details')?.removeAttribute('open');
    is();
  };

  function aktar() {
    // Koşu satırları motor kaydından türetilir: hiçbir motor listeden düşmez.
    const kosular = motorlar
      .flatMap((mo) => mo.kosular.map((k) => ({ mo, k })))
      .sort((a, b) => b.k.baslangic.localeCompare(a.k.baslangic));

    exceleAktar('platform-sagligi', [
      { ad: 'Motor koşuları', satirlar: [
        ['Motor', 'İş adı', 'Durum', 'Başlangıç', 'Süre', 'İşlenen', 'Üretilen', 'Hata'],
        ...kosular.map(({ mo, k }) => [
          mo.etiket, k.isAdi, etiketle(k.durum), zamanTR(k.baslangic),
          sureFmt(k.sureMs), k.islenen, k.uretilen, k.hata,
        ]),
      ] },
      { ad: 'Veri kalitesi', satirlar: [
        ['Kural', 'Açıklama', 'Kaynak tipi', 'İlgili kayıt', 'Tespit'],
        ...kalite.map((b) => [
          etiketle(b.kural), b.aciklama, etiketle(b.kaynakTipi),
          b.kayitEtiket ?? 'kayıt silinmiş', tarihTR(b.olusturuldu),
        ]),
      ] },
      // Sır referansı MASKELİ dışa aktarılır; sır DEĞERİ hiçbir sütunda yok.
      ...(entegrasyon.yetkili ? [{ ad: 'Entegrasyonlar', satirlar: [
        ['Connector', 'Kod', 'Tip', 'Kaynak sistem', 'Durum', 'Son koşu', 'Son başarı',
          'Alınan', 'Kabul', 'Red', 'Yinelenen', 'Süre', 'Deneme', 'Tazelik',
          'Gecikme (×)', 'Hata', 'Ayrıntı (hata değil)', 'Sır referansı (maskeli)'],
        ...entegrasyon.connectorlar.map((c) => [
          c.ad, c.kod, CONNECTOR_TIP[c.tip] ?? etiketle(c.tip), c.kaynakSistem,
          ENTEGRASYON_SOZU[c.durum],
          c.sonKosu ? zamanTR(c.sonKosu.baslangic) : 'hiç koşmadı',
          c.sonBasariliKosu ? zamanTR(c.sonBasariliKosu) : 'hiç',
          c.sonKosu?.alinan ?? null, c.sonKosu?.kabulEdilen ?? null,
          c.sonKosu?.reddedilen ?? null, c.sonKosu?.yinelenen ?? null,
          sureFmt(c.sonKosu?.sureMs ?? null), c.sonKosu?.denemeNo ?? null,
          c.tazelik.durum === 'bilinmiyor' ? 'ölçülemedi'
            : `${dkFmt(c.tazelik.gecenDk ?? 0)}`,
          c.tazelik.gecikmeOrani, c.sonKosu?.hata ?? c.sonHata,
          c.sonKosu?.ayrinti ?? c.kimlikGerekce, c.sirMaskeli,
        ]),
      ] }] : []),
    ]);
  }

  return (
    <details ref={kok} className="ab-baskida-gizle" style={{ position: 'relative' }}>
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        ⤓ Dışa aktar <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', bottom: '100%', right: 0, zIndex: 5, minWidth: 150,
        background: 'var(--panel)', border: 'var(--bw-strong) solid var(--hr2)',
        boxShadow: 'none', padding: 'var(--s8)',
      }}>
        <button type="button" className="ab-filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, aktar)}>
          Excel
        </button>
        <button type="button" className="ab-filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, pdfYazdir)}>
          PDF
        </button>
      </div>
    </details>
  );
}
