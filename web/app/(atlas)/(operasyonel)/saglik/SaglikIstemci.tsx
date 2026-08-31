'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BosIlk, Yetkisiz } from '@/components/atlas/temel';
import { Tablo, type Kolon, type Satir } from '@/components/atlas/tablo';
import { EkranBasligi, KipDegistir } from '@/components/atlas/ekran';
import { Cekmece } from '@/components/atlas/cekmece';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import type { ConnectorSagligi, EntegrasyonOzeti } from '@/lib/entegrasyon/saglikOzeti';
import { TumunuCalistir } from './Eylemler';
import { ConnectorOzeti, KaliteOzeti, MotorOzeti } from './Cekmeceler';
import {
  CONNECTOR_TIP, ENTEGRASYON_IM, ENTEGRASYON_SOZU, GORUNUR_BUTCE, TETIKLEYEN,
  baslikMetni, bolumle, connectorAlt, connectorToplanabilir, dkFmt, kaliteImi,
  kaliteSirala, kaliteToplanabilir, metrikleriHesapla, motorImi,
  motorToplanabilir, motorlariSirala, sonKosu, sureFmt,
  tazelikDurumu, tazelikYazisi,
  type KaliteBulgusu, type Kip, type Motor,
} from './mantik';

/* Platform sağlığı — "otomasyon sessizce mi durdu?"

   Tek canvas modülü + kip anahtarı: motorlar · entegrasyonlar · veri
   kalitesi. Üçü de aynı soruya cevap verdiği için aynı tabloda yaşar;
   yığılmasınlar diye kip değiştirilir (02-components §12).

   Durum sözcüğü canvasta YAZILMAZ: işaretçi koşunun tamamlanıp
   tamamlanmadığını söyler, sayı kolonları ne işlendiğini. Sözcük yalnız
   çekmecenin kimlik bloğunda geçer. Detay modalda değil 420px çekmecede
   açılır (06 §B4) — Ozalit sürümündeki iki <dialog> kalktı. */

const MOTOR_KOLONLARI: Kolon[] = [
  { baslik: 'Son koşu', genislik: '146px' },
  { baslik: 'İşlenen → üretilen', genislik: '134px', sag: true },
  { baslik: 'Süre', genislik: '78px', sag: true, ikincil: true },
];

const ENTEGRASYON_KOLONLARI: Kolon[] = [
  { baslik: 'Son koşu', genislik: '146px' },
  { baslik: 'Alınan → kabul', genislik: '124px', sag: true },
  { baslik: 'Veri tazeliği', genislik: '118px', sag: true, ikincil: true },
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
  motorlar, kalite, entegrasyon, yazabilir,
}: {
  motorlar: Motor[]; kalite: KaliteBulgusu[];
  entegrasyon: EntegrasyonOzeti; yazabilir: boolean;
}) {
  const [kip, setKip] = useState<Kip>('motor');
  const [secili, setSecili] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  /* Metrikler kipten BAĞIMSIZ: platformun tamamını anlatır (06 §A2). */
  const m = useMemo(
    () => metrikleriHesapla(motorlar, entegrasyon.connectorlar, kalite),
    [motorlar, entegrasyon.connectorlar, kalite],
  );

  const siraliMotorlar = useMemo(() => motorlariSirala(motorlar), [motorlar]);
  const siraliKalite = useMemo(() => kaliteSirala(kalite), [kalite]);

  const motorBolum = useMemo(
    () => bolumle(siraliMotorlar, motorToplanabilir, kuyrukAcik, GORUNUR_BUTCE),
    [siraliMotorlar, kuyrukAcik]);
  const connectorBolum = useMemo(
    () => bolumle(entegrasyon.connectorlar, connectorToplanabilir, kuyrukAcik, GORUNUR_BUTCE),
    [entegrasyon.connectorlar, kuyrukAcik]);
  const kaliteBolum = useMemo(
    () => bolumle(siraliKalite, kaliteToplanabilir, kuyrukAcik, GORUNUR_BUTCE),
    [siraliKalite, kuyrukAcik]);

  const secilenMotor = kip === 'motor'
    ? motorlar.find((x) => x.ad === secili) ?? null : null;
  const secilenConnector = kip === 'entegrasyon'
    ? entegrasyon.connectorlar.find((c) => c.id === secili) ?? null : null;
  const secilenBulgu = kip === 'kalite'
    ? kalite.find((b) => b.id === secili) ?? null : null;

  // Kip değişince seçim ve kuyruk sıfırlanır: id uzayları ayrıdır.
  function kipiDegistir(yeni: string) {
    setKip(yeni as Kip);
    setSecili(null);
    setKuyrukAcik(false);
  }

  const bas = baslikMetni(m);
  const sec = (id: string) => setSecili((o) => (o === id ? null : id));

  return (
    <>
      <main style={{ minWidth: 0 }}>
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

        <section className="ekran-govde">
          <KipDegistir
            aktif={kip}
            sec={kipiDegistir}
            secenekler={[
              { id: 'motor', ad: `Motorlar ${m.motorToplam}` },
              { id: 'entegrasyon', ad: `Entegrasyonlar ${m.connectorToplam}` },
              { id: 'kalite', ad: `Veri kalitesi ${m.kaliteAcik}` },
            ]}
          />

          <div style={{ marginTop: 'var(--s26)' }}>
            {kip === 'motor' && (
              <MotorTablosu bolum={motorBolum} secili={secili} sec={sec}
                kuyrugaAc={() => setKuyrukAcik(true)} olculmedi={m.olculmedi} />
            )}
            {kip === 'entegrasyon' && (
              <EntegrasyonTablosu ozet={entegrasyon} bolum={connectorBolum}
                secili={secili} sec={sec} kuyrugaAc={() => setKuyrukAcik(true)} />
            )}
            {kip === 'kalite' && (
              <KaliteTablosu bolum={kaliteBolum} secili={secili} sec={sec}
                kuyrugaAc={() => setKuyrukAcik(true)} toplam={kalite.length} />
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
          <ConnectorOzeti c={secilenConnector} />
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
  parcalar.push('koşu geçmişi kaydın çekmecesinde');

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

function EntegrasyonTablosu({ ozet, bolum, secili, sec, kuyrugaAc }: {
  ozet: EntegrasyonOzeti;
  bolum: { gorunur: ConnectorSagligi[]; toplanan: ConnectorSagligi[] };
  secili: string | null; sec: (id: string) => void; kuyrugaAc: () => void;
}) {
  /* Yetkisiz kullanıcıya maskeli sır referansı bile gitmez: özet katmanı
     boş döner ve ekran bunu boş veri gibi değil, kapalı kapı gibi gösterir. */
  if (!ozet.yetkili) return <Yetkisiz rol="yönetim okuma" />;

  if (ozet.connectorlar.length === 0) {
    return (
      <BosIlk cumle={'Tanımlı connector yok. Bir dış sistem bağlandığında son '
        + 'koşusu, alınan/kabul/red sayaçları ve veri tazeliği burada görünür.'} />
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
        s ? zamanTR(s.baslangic) : <span key="k" style={{ color: 'var(--i3)' }}>koşu kaydı yok</span>,
        s ? `${s.alinan} → ${s.kabulEdilen}` : <Bos key="a" />,
        <span key="t" style={tz ? { color: `var(--${tz})` } : undefined}>
          {tazelikYazisi(c.tazelik)}
        </span>,
      ],
    };
  });

  const parcalar = [`${bolum.gorunur.length} bağlantı görünüyor`];
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
    <details ref={kok} className="yazdirmada-gizle" style={{ position: 'relative' }}>
      <summary className="kapsam-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        ⤓ Dışa aktar <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', bottom: '100%', right: 0, zIndex: 5, minWidth: 150,
        background: 'var(--card)', border: 'var(--bw-strong) solid var(--hr2)',
        boxShadow: 'var(--sh-tip)', padding: 'var(--s8)',
      }}>
        <button type="button" className="filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, aktar)}>
          Excel
        </button>
        <button type="button" className="filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, pdfYazdir)}>
          PDF
        </button>
      </div>
    </details>
  );
}
