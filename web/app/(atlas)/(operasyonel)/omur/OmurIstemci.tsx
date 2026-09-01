'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Im, Dugme, BosIlk } from '@/components/abacus/temel';
import { Tablo, type Kolon, type Satir } from '@/components/abacus/tablo';
import { EkranBasligi, Filtreler } from '@/components/abacus/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/abacus/panel';
import { OmurUfku } from '@/components/abacus/zaman';
import { tarihTR } from '@/lib/sabitler';
import {
  aciliyetSirasi, ayYil, buyuk, donemler, geriMetni, grupla, GRUPLAR, kisaEtiket,
  konumlariAyir, omruCoz, sureMetni, ufkaYay, ufukBantlari, ufukKonumu, ufukUzunlugu,
  type GrupAnahtari, type Omur, type VarlikKaydi,
} from './mantik';

/* O13 · EOL / EOS & Ömür yönetimi — "önce neyi değiştiriyoruz?"
   İki canvas modülü (06 §A1): ömür ufku zaman çizelgesi + öncelik tablosu.
   Durum sözcüğü canvas'ta geçmez; satır alt satırı olguyu yazar
   (`EOS Kas 24 · +21 ay`, `WinCC V7.4 · EOS Oca 26`, `tarih eksik`). */

/** 06 §A3: tabloda 5–9 satır görünür; sabitlenmiş satırlar bu bütçenin dışındadır. */
const GORUNUR_BUTCE = 9;

/** Zaman çizelgesinde aynı anda en fazla 4 kart (03-screens O13). */
const KART_BUTCESI = 4;

const KOLONLAR: Kolon[] = [
  { genislik: '150px', ikincil: true },  // santral — çekmece açıkken düşer
  { genislik: '150px' },                 // telafi edici kontrol — sert sinyal, düşmez
  { genislik: '140px' },                 // bağlı proje
];

const YASAM_DONGUSU: Record<string, string> = {
  planlandi: 'Planlandı', aktif: 'Aktif', bakim: 'Bakımda',
  emekli: 'Emekli', imha: 'İmha edildi',
};

const KRITIKLIK: Record<string, string> = {
  kritik: 'kritik', yuksek: 'yüksek', orta: 'orta', dusuk: 'düşük',
};

export default function OmurIstemci({
  kayitlar, toplamVarlik, kuyrukToplami, metrikler, simdi, kapsamli = false,
}: {
  kayitlar: VarlikKaydi[]; toplamVarlik: number; simdi: number;
  /** kuyruğun GERÇEK büyüklüğü — sunucu tavanı satırları kestiyse fark açılır */
  kuyrukToplami: number;
  /** kesilmemiş kuyruk üzerinde sayılmış metrikler (sunucuda `count`) */
  metrikler: { destekBitti: number; yaklasan: number; projeyeBagli: number };
  /** kuyruk bir santral kapsamıyla daraltıldı mı — boş ekranın SÖZÜ değişir */
  kapsamli?: boolean;
}) {
  const [gruplama, setGruplama] = useState<GrupAnahtari>('aciliyet');
  const [secili, setSecili] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const satirlar = useMemo(
    () => kayitlar.map((v) => omruCoz(v, simdi)).sort(aciliyetSirasi),
    [kayitlar, simdi],
  );

  const gruplar = useMemo(
    () => grupla(satirlar, gruplama, simdi), [satirlar, gruplama, simdi],
  );

  /* Gruplama yalnız sırayı değiştirir; kuyruğun içeriği aynı kalır. */
  const sirali = useMemo(
    () => (gruplama === 'aciliyet' ? satirlar : gruplar.flatMap((g) => g.uyeler)),
    [satirlar, gruplar, gruplama],
  );

  /* ── metrikler · üçü de SUNUCUDAN, kesilmemiş kuyruk üzerinde sayılır ──
     Eskiden bu üç sayı elde duran satırlardan hesaplanıyordu; sunucu
     satırları bir tavanla kestiği anda o sayılar sessizce küçülürdü.
     Satır için `take`, sayım için `count` (bkz. veri.ts). */
  const { destekBitti, yaklasan: yaklasanSayi, projeyeBagli } = metrikler;
  /* `eolEksik` yalnız elde duran satırların dip notudur ve öyle yazılır —
     bir metrik değildir, kuyruğun tamamı hakkında iddia taşımaz. */
  const eolEksik = satirlar.filter((o) => o.eolEksik).length;
  /** Sunucu tavanı kuyruğu kesti mi — kesme SESSİZ kalmaz. */
  const kesildi = kuyrukToplami > satirlar.length;

  /* ── görünür satırlar + toplanan kuyruk ────────────────────────────────
     Sabitlenenler (puan ≤ 2): kendi tarihi geçmiş varlıklar ve ömür tarihi
     hiç olmayanlar. `telafi yok` bunları bir kademe öne alır ve hiçbir
     sıralamada kuyruğa inmezler (06 §A3). */
  const { gorunur, toplanan } = useMemo(() => {
    const sabit = sirali.filter((o) => o.puan <= 2);
    const kalan = sirali.filter((o) => o.puan > 2);
    if (kuyrukAcik) return { gorunur: sirali, toplanan: [] as Omur[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return { gorunur: [...sabit, ...kalan.slice(0, slot)], toplanan: kalan.slice(slot) };
  }, [sirali, kuyrukAcik]);

  /* Şeridin ölçeği veriden gelir: en uzak karar ne kadar ilerideyse ufuk o
     kadar (en az 12 ay). Eksen tırnakları ve kartlar aynı ölçeği paylaşır. */
  const uzunluk = useMemo(
    () => ufukUzunlugu(satirlar.map((o) => o.karar), simdi), [satirlar, simdi],
  );

  /* ── zaman çizelgesi kartları ──────────────────────────────────────────
     Aciliyet kipinde kart bir varlıktır; gruplandığında kart grubun kendisi
     olur ve grubun en acil üyesini açar. Konumlar statik yerleşimdir —
     hareket yalnız yeniden dizilmede (motion/reveal). */
  const kartlar = useMemo(() => {
    type Kart = { id: string; ad: string; kapsam: string; karar: number | null; gecmis: boolean };
    let secim: Kart[];

    if (gruplama === 'aciliyet') {
      secim = ufkaYay(satirlar, simdi, uzunluk, KART_BUTCESI).map((o) => ({
        id: o.v.id,
        ad: kisaEtiket(o.v.etiket),
        kapsam: buyuk([o.v.tesisAd ?? '—', o.v.turAd].join(' · ')),
        karar: o.karar,
        gecmis: o.gecmis,
      }));
    } else {
      secim = ufkaYay(gruplar, simdi, uzunluk, KART_BUTCESI).map((g) => ({
        id: g.uyeler[0].v.id,
        ad: g.ad,
        kapsam: buyuk(`${g.uyeler.length} varlık · ${g.desteksiz} desteksiz`),
        karar: g.karar,
        gecmis: g.gecmis,
      }));
    }

    const dizili = secim;
    const konumlar = konumlariAyir(dizili.map((k) => ufukKonumu(k.karar, simdi, uzunluk)));
    return dizili.map((k, i) => ({
      id: k.id,
      ad: k.ad,
      geri: geriMetni(k.karar, simdi, uzunluk),
      kapsam: k.kapsam,
      gecmis: k.gecmis,
      konum: konumlar[i],
    }));
  }, [satirlar, gruplar, gruplama, simdi, uzunluk]);

  const secilen = satirlar.find((o) => o.v.id === secili) ?? null;
  const eksen = donemler(simdi, uzunluk);

  const tabloSatirlari: Satir[] = gorunur.map((o) => ({
    id: o.v.id,
    durum: o.durum,
    kenar: o.durum,
    konu: (
      <>
        {o.v.ad}
        {o.v.tedarikciAd && (
          <span style={{ fontFamily: 'var(--veri)', fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
            {' · '}{o.v.tedarikciAd}
          </span>
        )}
      </>
    ),
    alt: `${o.v.etiket} · ${o.olgu}${gruplama === 'tur' ? ` · ${o.v.turAd}` : ''}`,
    hucreler: [
      o.v.tesisAd ?? <Bos key="t" />,
      <TelafiHucresi key="k" o={o} />,
      o.proje
        ? <span key="p" style={{ fontFamily: 'var(--veri)', fontSize: 'var(--t-code)',
          color: 'var(--aksan)' }}>{o.proje.kod}</span>
        : <Bos key="p" />,
    ],
  }));

  if (satirlar.length === 0) {
    return (
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Ömür yönetimi · ${toplamVarlik} varlık`}
          baslik="Ömür kuyruğu boş"
        />
        <div className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          {/* "EOL kaydı yok" ile "kapsamınızda kayıt yok" AYNI ŞEY DEĞİLDİR. */}
          <BosIlk cumle={kapsamli ? 'Kapsamınızda EOL kaydı yok.' : 'EOL kaydı yok.'} />
        </div>
      </main>
    );
  }

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={kesildi
            ? `Ömür yönetimi · ${toplamVarlik} varlık · gösterilen ${satirlar.length}`
            : `Ömür yönetimi · ${toplamVarlik} varlık`}
          vurgu={`${kuyrukToplami} varlık`}
          baslik="ömür kararı bekliyor"
          metrikler={[
            { deger: destekBitti, yazi: 'Destek bitti', durum: destekBitti > 0 ? 'bd' : undefined },
            { deger: yaklasanSayi, yazi: '12 ay içinde', durum: yaklasanSayi > 0 ? 'md' : undefined },
            { deger: projeyeBagli, yazi: 'Projeye bağlı' },
          ]}
        />

        <div style={{ padding: '0 var(--gutter-op)' }}>
          <Filtreler
            secenekler={GRUPLAR}
            aktif={gruplama}
            sec={(id) => setGruplama(id as GrupAnahtari)}
          />
        </div>

        <div className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          {/* Gruplama değişince şerit yeniden dizilir: key değişimi
              `blok-gir`i (motion/reveal, 300ms) yeniden çalıştırır.
              prefers-reduced-motion altında atlas.css süreyi 1ms'e indirir. */}
          <div
            key={gruplama}
            style={{ position: 'relative', animation: 'blok-gir var(--mo-reveal) var(--ez)' }}
          >
            {/* Dönem tırnakları artık primitifin içinde: ekranın eksenin piksel
                konumuna göre kendi katmanını bindirmesi kırılgandı. */}
            <OmurUfku kartlar={kartlar} donemler={eksen} bantlar={ufukBantlari(uzunluk)}
              tikla={(id) => setSecili((o) => (o === id ? null : id))} />
          </div>

          <div style={{ marginTop: 'var(--s26)' }}>
            <Tablo
              kolonlar={KOLONLAR}
              satirlar={tabloSatirlari}
              secili={secili}
              sec={(id) => setSecili((o) => (o === id ? null : id))}
              kuyruk={toplanan.length > 0
                ? { metin: kuyrukMetni(toplanan), ac: () => setKuyrukAcik(true) }
                : null}
            />
            <p className="ab-dip">
              Satıra ya da karta tıklayınca çekmece açılır
              {eolEksik > 0 && (
                <>
                  {' · '}
                  <Link href="/saglik" style={{ color: 'var(--i2)', textDecoration: 'underline' }}>
                    {eolEksik} varlıkta EOL tarihi yok · veri kalitesi kuyruğu
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </main>

      {/* O11 rotası geldiğinde buraya bağlanacak: satır/kart tıklaması
          çekmece yerine varlık detayı rotasına gidecek. */}
      {secilen && <OmurCekmecesi o={secilen} simdi={simdi} kapat={() => setSecili(null)} />}
    </>
  );
}

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

/** `telafi yok` sert sinyaldir: state/critical, hiçbir sıralamada toplanmaz. */
function TelafiHucresi({ o }: { o: Omur }) {
  if (o.telafiYok) {
    return <span style={{ color: 'var(--bd)', fontWeight: 600 }}>telafi yok</span>;
  }
  const ilk = o.v.kontroller[0];
  const kalan = o.v.kontroller.length - 1;
  return (
    <span style={{ fontFamily: 'var(--veri)', fontSize: 'var(--t-code)', overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
      {ilk.kod}{kalan > 0 ? ` +${kalan}` : ''}
    </span>
  );
}

/** Kuyruk satırı neyi topladığını yazar — "diğerleri" demez. */
function kuyrukMetni(toplanan: Omur[]): string {
  const yazilim = toplanan.filter((o) => o.yazilimKaynakli).length;
  const yaklasan = toplanan.filter((o) => o.yaklasan).length;
  const parcalar = [`+${toplanan.length} varlık`];
  if (yazilim > 0) parcalar.push(`${yazilim} yazılımı desteksiz`);
  if (yaklasan > 0) parcalar.push(`${yaklasan} varlık 12 ay içinde`);
  return parcalar.join(' · ');
}

/* ── Çekmece · 420px, kimlik → alanlar → zincir → eylem ─────────────────
   Durum sözcüğü yalnız burada geçer (06 §A2). */

function OmurCekmecesi({ o, simdi, kapat }: { o: Omur; simdi: number; kapat: () => void }) {
  const { v } = o;
  const soz = o.durum === 'bd' ? 'Desteksiz'
    : o.durum === 'unk' ? 'Ömür tarihi yok' : 'Ömür sonu yakın';

  const kayitlar: { id: string; kod: string; alt: string; yol: string; suren?: boolean }[] = [
    ...v.projeler.map((p) => ({
      id: `p-${p.id}`, kod: p.kod, alt: p.ad, yol: '/projeler', suren: p.durum === 'devam',
    })),
    ...v.riskler.map((r) => ({
      id: `r-${r.id}`, kod: r.kod, alt: kisalt(r.baslik), yol: '/riskler',
    })),
    // Telafi edici kontrol riskin üzerinden yaşar; zincir risk kütüğüne çıkar.
    ...v.kontroller.map((k) => ({
      id: `k-${k.kod}`, kod: k.kod, alt: `${k.baslik} · ${k.riskKod}`, yol: '/riskler',
    })),
  ];
  if (o.eolEksik) {
    kayitlar.push({
      id: 'vk', kod: 'Veri kalitesi', alt: 'EOL tarihi eksik', yol: '/saglik',
    });
  }

  return (
    <Cekmece kod={v.etiket} kapat={kapat}>
      <CekmeceKimlik durum={o.durum} soz={soz} baslik={v.ad} cumle={cumle(o, simdi)} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Tür', deger: <TurAlani v={v} />,
          durum: KRITIKLIK[v.kritiklik] ? undefined : 'unk' },
        { etiket: 'Santral', deger: v.tesisAd ?? '—' },
        { etiket: 'Tedarikçi', deger: v.tedarikciAd ?? '—' },
        { etiket: 'Yaşam döngüsü', deger: <YasamDongusu o={o} />,
          durum: o.eolEksik ? 'unk' : undefined },
      ]} />

      {kayitlar.length > 0 ? (
        <CekmeceBagli kayitlar={kayitlar} />
      ) : (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Zincir</p>
          <p style={{ margin: 0, fontFamily: 'var(--veri)', fontSize: 'var(--t-label)',
            color: 'var(--i3)' }}>
            Bağlı proje, risk ya da telafi edici kontrol yok
          </p>
        </div>
      )}

      <CekmeceEylemler
        birincil={(
          <Dugme tur="tam" disabled
            style={{ opacity: 0.55, cursor: 'not-allowed' }}>
            Projeye bağla
          </Dugme>
        )}
        dipNot={'Varlık–proje bağı bu sürümde yazılamıyor: proje bağlantısı bugün yalnız '
          + 'madde ve bulgu üzerinden kuruluyor. Yazma açıldığında eylem denetim izine düşecek.'}
      />
    </Cekmece>
  );
}

/** Tür + kritiklik; kritiklik değerlendirilmemişse elmas taşır (unknown ≠ zero). */
function TurAlani({ v }: { v: VarlikKaydi }) {
  const k = KRITIKLIK[v.kritiklik];
  if (k) return <>{v.turAd} · {k}</>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s8)' }}>
      {v.turAd} · <Im durum="unk" ad="Kritiklik değerlendirilmedi" /> kritiklik yok
    </span>
  );
}

function YasamDongusu({ o }: { o: Omur }) {
  const ad = YASAM_DONGUSU[o.v.yasamDongusu] ?? o.v.yasamDongusu;
  if (o.eolEksik) {
    // unknown ≠ zero: EOL tarihi yoksa 0 ya da "yakında" değil, elmas + olgu.
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s8)' }}>
        {ad} · <Im durum="unk" ad="EOL tarihi eksik" /> tarih eksik
      </span>
    );
  }
  return <>{ad} · EOL {tarihTR(o.v.eolTarihi)}</>;
}

/** Kimlik cümlesi: tek cümlede kararı süren olgular. */
function cumle(o: Omur, simdi: number): string {
  const { v } = o;
  const parcalar: string[] = [];
  const gecti = (iso: string | null) => iso !== null && new Date(iso).getTime() < simdi;

  if (gecti(v.eosTarihi)) {
    parcalar.push(`EOS ${tarihTR(v.eosTarihi)} tarihinde geçti`);
  }
  if (gecti(v.destekBitis)) {
    parcalar.push(`üretici desteği ${tarihTR(v.destekBitis)} tarihinde bitti`);
  }
  const y = v.bitenYazilimlar[0];
  if (y) {
    parcalar.push(`${[y.ad, y.surum].filter(Boolean).join(' ')} desteği ${tarihTR(y.eos)} `
      + 'tarihinde bitti');
  }
  if (o.yaklasan && v.eosTarihi) {
    parcalar.push(`EOS ${ayYil(v.eosTarihi)} · `
      + `${sureMetni(new Date(v.eosTarihi).getTime() - simdi)} kaldı`);
  }
  if (o.tarihYok) {
    parcalar.push('destek, EOL ve EOS tarihlerinin hiçbiri kayıtlı değil');
  }
  if (o.telafiYok) parcalar.push('telafi edici kontrol tanımlı değil');
  else parcalar.push(`${v.kontroller.length} telafi edici kontrol tanımlı`);

  const metin = parcalar.join(' · ');
  return `${metin.charAt(0).toLocaleUpperCase('tr-TR')}${metin.slice(1)}.`;
}

function kisalt(s: string, n = 64): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
