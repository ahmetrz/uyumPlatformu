'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos, useUrlSira } from '@/components/kabuk/urlDurumu';
import { Alan, BosFiltre, BosIlk, Dugme, Hata, Im, type Durum } from '@/components/kabuk/temel';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi, Filtreler } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { kanitEkle } from '@/lib/eylemler';
import { kanitKaydet, kanitDosyasiYukle } from '@/lib/eylemler2/kanit';
import {
  GIZLILIK_DUZEYLERI, GIZLILIK_ETIKETI, KANIT_DURUMLARI, KANIT_DURUM_ETIKETI,
  KANIT_TIPLERI as TUM_KANIT_TIPLERI, KANIT_TIP_ETIKETI,
  type KanitDurumu, type KanitTipi,
} from '@/lib/uyum/kanitMetadata';
import { DOSYA_SINIRI, IZINLI_TIPLER } from '@/lib/uyum/kanitDosyaKurali';
import { BULGU_DURUM_ETIKET, KANIT_ESIK_VARSAYILAN, etiketle, tarihTR, type KanitEsik } from '@/lib/sabitler';
import { an } from '@/lib/an';
import { kisaTarih } from '../bulgular/mantik';
import {
  MERCEKLER, baglantiOzeti, bagliMi, baslikMetni, dipNot, dosyaCumlesi, kanitImi,
  kimlikSozu, metrikleriHesapla, sirala, suz, tazelik, tipEtiketi,
  type KanitSatiri, type Mercek, type SiraAnahtari,
} from './mantik';
import type { MaddeDurumuSecenegi } from './veri';

/* C21 · Kanıt kütüphanesi — İSTEMCİ.

   Kolonlar: kanıt (konu) · tip · tarih · bağlı kayıt · yükleyen. İşaretçi
   tazeliği taşır (taze/yenilenmeli/doldu), bağlantısız kanıt bilinmeyen
   elması alır — "0 bağ" bir durum değil, bir bilinmezliktir.

   Kanıt ekleme `kanitEkle` eylemine bağlanır: ad · tip · madde durumu.

   ── UY-12 · UY-13 (bu turda eklendi) ──────────────────────────────────
   Çekmece artık metadata'yı DÜZENLER ve dosya YÜKLER. İki kural ekranda
   da geçerlidir:
     · `durum` (kabul) ile `bitis` (geçerlilik) AYRI alanlardır; reddedilmiş
       bir kanıt süresi dolana kadar geçerli görünmez.
     · Dosyası olmayan kanıt "dosya var" demez. `depoAnahtari` yoksa dosya
       YOKTUR; eski `dosyaYolu` metni yalnız birinin bir yol yazdığını
       söyler ve ekran ikisini karıştırmaz. */

/** `kanitEkle` şemasının kabul ettiği DAR küme (lib/eylemler.ts ile aynı).
    Yeni `kanitKaydet` on iki tipin tamamını kabul eder; hızlı ekleme formu
    bilerek dar kalır, tip sonradan çekmeceden genişletilir. */
const KANIT_TIPLERI = ['politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor'];

const KOLONLAR: Kolon[] = [
  { baslik: 'Tip', siraAnahtari: 'tip', genislik: '132px', ikincil: true },
  { baslik: 'Tarih', siraAnahtari: 'tarih', genislik: '170px' },
  { baslik: 'Bağlı kayıt', siraAnahtari: 'bagli', genislik: 'minmax(150px, 0.8fr)' },
  { baslik: 'Yükleyen', siraAnahtari: 'yukleyen', genislik: '126px', ikincil: true },
];

/** 06 §A3: tabloda 5–9 satır. Taze ve bağlı olanlar kuyruğa iner. */
const GORUNUR_BUTCE = 8;

export default function KanitlarIstemci({
  kanitlar, toplam, kapsamDisi, maddeDurumlari, yazabilir, kapsamli = false, esik = KANIT_ESIK_VARSAYILAN,
}: {
  kanitlar: KanitSatiri[];
  /** tazelik eşiği — sunucu `kanitEsikleri()`ndan; istemci 90/180 bilmez */
  esik?: KanitEsik;
  /** kütüğün GERÇEK büyüklüğü — sunucu tavanı satırları kestiyse fark açılır */
  toplam: number;
  /** kapsam daraltıldığı için listelenmeyen bağlantısız kanıt sayısı */
  kapsamDisi: number;
  maddeDurumlari: MaddeDurumuSecenegi[];
  yazabilir: boolean;
  kapsamli?: boolean;
}) {
  const [mercek, setMercek] = useUrlDurumu<Mercek>('mercek', 'hepsi');
  const [tipF, setTipF] = useUrlDurumuBos('tip');
  const [arama, setArama] = useState('');
  const [sira, setSira] = useUrlSira<SiraAnahtari>({ anahtar: 'tarih', yon: 'artan' });
  const [secili, setSecili] = useUrlDurumuBos('sec');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [formAcik, setFormAcik] = useState(false);

  /* Anı bir kez okuruz: sunucu ile tarayıcı aynı "şimdi"yi görsün
     (lib/an.ts). Tazelik kararı bu ana göre verilir. */
  const simdi = useMemo(() => an(), []);

  const metrikler = useMemo(() => metrikleriHesapla(kanitlar, simdi, esik), [kanitlar, simdi, esik]);
  const kesildi = toplam > kanitlar.length;

  /* Tip seçenekleri elde duran kütükten türetilir — olmayan tip listeye girmez. */
  const tipler = useMemo(() => [...new Set(kanitlar.map((k) => k.tip))]
    .sort((a, b) => tipEtiketi(a).localeCompare(tipEtiketi(b), 'tr'))
    .map((t) => ({ id: t, ad: tipEtiketi(t) })), [kanitlar]);

  const suzulmus = useMemo(
    () => sirala(suz(kanitlar, { mercek, tip: tipF, arama }, simdi, esik), sira.anahtar, sira.yon),
    [kanitlar, mercek, tipF, arama, sira, simdi, esik],
  );

  /* Sürükleyici satır asla toplanmaz: süresi dolmuş · yenilenmeli · bağlantısız.
     Taze ve bağlı kanıtlar kuyruğa iner. */
  const { gorunur, toplanan } = useMemo(() => {
    const sabit = suzulmus.filter((k) => kanitImi(k, simdi, esik) !== 'ok');
    const kalan = suzulmus.filter((k) => kanitImi(k, simdi, esik) === 'ok');
    if (kuyrukAcik) return { gorunur: [...sabit, ...kalan], toplanan: [] as KanitSatiri[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return { gorunur: [...sabit, ...kalan.slice(0, slot)], toplanan: kalan.slice(slot) };
  }, [suzulmus, kuyrukAcik, simdi, esik]);

  const secilen = kanitlar.find((k) => k.id === secili) ?? null;
  const filtreAktif = mercek !== 'hepsi' || tipF !== null || arama.trim() !== '';

  const satirlar: Satir[] = gorunur.map((k) => {
    const im = kanitImi(k, simdi, esik);
    return {
      id: k.id,
      durum: im,
      kenar: im,
      konu: k.ad,
      alt: k.dosyaYolu ? `sürüm ${k.surum} · dosya yolu kayıtlı` : `sürüm ${k.surum} · dosya yolu kayıtlı değil`,
      hucreler: [
        tipEtiketi(k.tip),
        <TarihHucresi key="t" kanit={k} simdi={simdi} esik={esik} />,
        <BagHucresi key="b" kanit={k} />,
        k.yukleyen ?? <Bos key="y" />,
      ],
    };
  });

  const baslik = baslikMetni(metrikler, kapsamli);

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={kesildi
            ? `Kanıt kütüphanesi · ${metrikler.toplam} kanıt · gösterilen ${kanitlar.length} / ${toplam}`
            : `Kanıt kütüphanesi · ${metrikler.toplam} kanıt`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            { deger: metrikler.dolmus, yazi: 'Süresi dolmuş', durum: metrikler.dolmus > 0 ? 'bd' : undefined },
            { deger: metrikler.yenilenmeli, yazi: 'Yenilenmeli', durum: metrikler.yenilenmeli > 0 ? 'md' : undefined },
            { deger: metrikler.bagsiz, yazi: 'Bağlantısız', durum: metrikler.bagsiz > 0 ? 'unk' : undefined },
          ]}
        />

        <section className="ab-ekran-govde">
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id as Mercek); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Ara deger={arama} degistir={(v) => { setArama(v); setKuyrukAcik(false); }} />
                <Kapsam etiket="Tip" aktif={tipF} secenekler={tipler}
                  sec={(id) => { setTipF(id); setKuyrukAcik(false); }} />
              </>
            }
          />

          {yazabilir && (
            <div style={{ marginTop: 'var(--s16)' }}>
              {formAcik ? (
                <KanitFormu maddeDurumlari={maddeDurumlari} kapat={() => setFormAcik(false)} />
              ) : (
                <Dugme tur="ikincil" onClick={() => setFormAcik(true)}>Kanıt kaydı ekle</Dugme>
              )}
            </div>
          )}

          {gorunur.length > 0 || toplanan.length > 0 ? (
            <div style={{ marginTop: 'var(--s22)' }}>
              <Tablo
                konuBasligi="Kanıt"
                kolonlar={KOLONLAR}
                satirlar={satirlar}
                secili={secili}
                sec={(id) => setSecili((o) => (o === id ? null : id))}
                sirala={{
                  anahtar: sira.anahtar,
                  yon: sira.yon,
                  degistir: (a) => setSira((o) => ({
                    anahtar: a as SiraAnahtari,
                    yon: o.anahtar === a && o.yon === 'artan' ? 'azalan' : 'artan',
                  })),
                }}
                kuyruk={toplanan.length > 0
                  ? { metin: `+${toplanan.length} kanıt · taze ve bağlı`, ac: () => setKuyrukAcik(true) }
                  : null}
              />
              <p className="ab-dip" style={{ margin: 'var(--s14) 0 0' }}>
                {dipNot({ gorunur: gorunur.length, toplam, yuklenen: kanitlar.length, kapsamDisi })}
              </p>
            </div>
          ) : filtreAktif ? (
            <BosFiltre temizle={() => { setMercek('hepsi'); setTipF(null); setArama(''); }} />
          ) : (
            <BosIlk
              /* "Kanıt yok" ile "kapsamınızda kanıt yok" aynı şey değildir:
                 ilki kütüphanenin hâli, ikincisi yetki sınırıdır. */
              cumle={kapsamli
                ? kapsamDisi > 0
                  ? `Kapsamınızda kanıt kaydı yok. ${kapsamDisi} kanıt santral kapsamınız dışında (bağlantısız ya da başka santrale bağlı).`
                  : 'Kapsamınızda kanıt kaydı yok.'
                : 'Kanıt kaydı yok.'}
              eylem={yazabilir && !formAcik
                ? <Dugme tur="ikincil" onClick={() => setFormAcik(true)}>Kanıt kaydı ekle</Dugme>
                : undefined}
            />
          )}
        </section>
      </main>

      {secilen && (
        <KanitCekmecesi kanit={secilen} simdi={simdi} esik={esik} kapat={() => setSecili(null)} />
      )}
    </>
  );
}

/* ── Kanıt ekleme formu ─────────────────────────────────────────────────
   `kanitEkle({ maddeDurumuId, ad, tip })` — kayıt bir madde durumuna
   bağlanarak doğar, çünkü bağlantısız kanıt ekranın "bilinmez" satırıdır;
   yeni kaydı bilerek bilinmez yapmayız. Dosya alanı YOK: bu sürümde
   yükleme yoktur ve form bunu yazar. */
function KanitFormu({ maddeDurumlari, kapat }: {
  maddeDurumlari: MaddeDurumuSecenegi[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [ad, setAd] = useState('');
  const [tip, setTip] = useState('kayit');
  const [maddeDurumuId, setMaddeDurumuId] = useState(maddeDurumlari[0]?.id ?? '');

  if (maddeDurumlari.length === 0) {
    return (
      <div className="ab-panel-blok">
        <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i3)' }}>
          <Im durum="unk" ad="Madde durumu yok" /> Kapsamınızda kanıt bağlanacak madde durumu yok;
          kanıt kaydı bir madde durumu olmadan açılmaz.
        </p>
        <div style={{ marginTop: 'var(--s12)' }}>
          <Dugme tur="ikincil" onClick={kapat}>Kapat</Dugme>
        </div>
      </div>
    );
  }

  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s12)', maxWidth: 560 }}>
      <p className="etiket" style={{ margin: 0 }}>Yeni kanıt kaydı</p>
      <Alan etiket="Kanıt adı" zorunlu>
        <input className="ab-gr" value={ad} disabled={bekliyor}
          onChange={(e) => setAd(e.target.value)} />
      </Alan>
      <Alan etiket="Tip">
        <select className="ab-gr" value={tip} disabled={bekliyor}
          onChange={(e) => setTip(e.target.value)}>
          {KANIT_TIPLERI.map((t) => <option key={t} value={t}>{etiketle(t)}</option>)}
        </select>
      </Alan>
      <Alan etiket="Karşıladığı madde durumu" zorunlu>
        <select className="ab-gr" value={maddeDurumuId} disabled={bekliyor}
          onChange={(e) => setMaddeDurumuId(e.target.value)}>
          {maddeDurumlari.map((m) => (
            <option key={m.id} value={m.id}>
              {m.tesisKod} · {m.surecKod} · {m.maddeKod} — {m.maddeBaslik}
            </option>
          ))}
        </select>
      </Alan>
      <p className="ab-dip" style={{ margin: 0 }}>
        Dosya yükleme bu sürümde yok; kayıt &quot;dosya yolu kayıtlı değil&quot; olarak düşer ve denetim izine yazılır.
      </p>
      {hata && <Hata cumle={hata} />}
      <div style={{ display: 'flex', gap: 'var(--s12)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !ad.trim() || !maddeDurumuId}
          onClick={() => calistir(
            () => kanitEkle({ maddeDurumuId, ad, tip }),
            () => { setAd(''); kapat(); },
          )}>
          Kaydet
        </Dugme>
        <Dugme tur="ikincil" disabled={bekliyor} onClick={kapat}>Vazgeç</Dugme>
      </div>
    </div>
  );
}

/* ── Kapsam kontrolleri (bulgular ekranıyla aynı gramer) ─────────────── */

function Ara({ deger, degistir }: { deger: string; degistir: (v: string) => void }) {
  return (
    <input
      className="ab-gr"
      aria-label="Kanıt, madde, bulgu veya yükleyen ara"
      placeholder="Ara"
      value={deger}
      onChange={(e) => degistir(e.target.value)}
      style={{
        width: 132, background: 'none', border: 0,
        borderBottom: 'var(--bw-hair) solid var(--hr2)',
        padding: '3px 0', fontFamily: 'var(--veri)', fontSize: 'var(--t-label)',
        letterSpacing: 'var(--tr-label)', textTransform: 'uppercase',
      }}
    />
  );
}

function Kapsam({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  const secim = secenekler.find((s) => s.id === aktif);
  const kok = useRef<HTMLDetailsElement | null>(null);

  // Açık kalan bir kapsam listesi altındaki tabloyu örter: dışarı tık ve Esc kapatır.
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
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 190,
        background: 'var(--panel)', border: 'var(--bw-strong) solid var(--hr2)',
        boxShadow: 'none', padding: 'var(--s8)',
      }}>
        {[{ id: '', ad: 'Tümü' }, ...secenekler].map((s) => (
          <button key={s.id} type="button" className="ab-filtre"
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

/* ── Hücreler ───────────────────────────────────────────────────────────
   06 §A2: hücrede durum sözcüğü yok — işaretçi durumu, metin OLGUYU taşır. */

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

/* `display: block` ŞART: `overflow: hidden` ve `text-overflow` satır içi
   (inline) bir kutuda yok sayılır. Bu stil bazen flex bir ebeveynin
   (`SATIR_ICI`) çocuğu, bazen doğrudan ızgara hücresinin çocuğu oluyor;
   ikinci durumda kutu inline kalıyor, kırpma hiç çalışmıyor ve hücre
   içeriği kadar uzuyordu — /kanitlar 1440px'te 548px'lik bir hücreyle
   sayfayı 108px yatay kaydırıyordu. */
const KIRP = {
  display: 'block', minWidth: 0, flex: '1 1 auto',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
} as const;

const SATIR_ICI = {
  display: 'flex', alignItems: 'center', gap: 'var(--s10)', minWidth: 0,
} as const;

/** Tarih olgusu: toplanma (ya da başlangıç) + varsa geçerlilik bitişi. */
function TarihHucresi({ kanit, simdi, esik }: { kanit: KanitSatiri; simdi: number; esik: KanitEsik }) {
  const t = tazelik(kanit, simdi, esik);
  const ref = kanit.toplanma ?? kanit.baslangic;
  const govde = kanit.bitis
    ? `${kisaTarih(ref)} → ${kisaTarih(kanit.bitis)}`
    : `${kisaTarih(ref)} · ${t.gun} g`;
  return (
    <span style={SATIR_ICI}>
      <Im durum={t.durum} ad={`${t.etiket} · ${t.gun} gün`} />
      <span style={{ ...KIRP, ...(t.kova === 'dolmus' ? { color: 'var(--bd)', fontWeight: 600 } : {}) }}>
        {govde}
      </span>
    </span>
  );
}

/** Bağlı kayıt: ilk bağın kodu + sayı özeti; bağ yoksa bilinmeyen elması. */
function BagHucresi({ kanit }: { kanit: KanitSatiri }) {
  if (!bagliMi(kanit)) {
    return (
      <span style={SATIR_ICI}>
        <Im durum="unk" ad="Bağlı kayıt yok" />
        <span style={{ ...KIRP, color: 'var(--i3)' }}>bağlantısız</span>
      </span>
    );
  }
  const ilk = kanit.bulgular[0]?.baslik
    ?? (kanit.maddeler[0] ? `${kanit.maddeler[0].maddeKod} · ${kanit.maddeler[0].tesisKod}` : null)
    ?? kanit.tesisler[0]?.kod
    ?? `${kanit.varlikSayisi} varlık`;
  return (
    <span style={KIRP} title={baglantiOzeti(kanit)}>
      {ilk}
      <span style={{ color: 'var(--i3)' }}> · {baglantiOzeti(kanit)}</span>
    </span>
  );
}

/* ── Çekmece · künye + bağlı kayıtlara zincir ────────────────────────── */

function KanitCekmecesi({ kanit, simdi, esik, kapat }: {
  kanit: KanitSatiri; simdi: number; esik: KanitEsik; kapat: () => void;
}) {
  const im: Durum = kanitImi(kanit, simdi, esik);
  const t = tazelik(kanit, simdi, esik);
  const kayitlar = [
    ...kanit.bulgular.map((b) => ({
      id: `bulgu-${b.id}`, kod: b.baslik,
      alt: `Bulgu · ${BULGU_DURUM_ETIKET[b.durum as keyof typeof BULGU_DURUM_ETIKET] ?? etiketle(b.durum)} · ${b.tesisKod}`,
      yol: `/bulgular/${b.id}`, suren: b.durum === 'acik' || b.durum === 'aksiyonda',
    })),
    ...kanit.maddeler.map((m) => ({
      id: `madde-${m.maddeDurumuId}`, kod: m.maddeKod,
      alt: `Madde · ${m.regKod} · ${m.surecKod} · ${m.tesisKod}`,
      yol: `/surecler/${m.surecId}`,
    })),
    ...kanit.tesisler.map((ts) => ({
      id: `tesis-${ts.id}`, kod: ts.kod, alt: `Santral · ${ts.ad}`, yol: `/tesisler/${ts.id}`,
    })),
  ];

  return (
    <Cekmece kod={`${tipEtiketi(kanit.tip)} · v${kanit.surum}`} kapat={kapat}>
      <CekmeceKimlik
        durum={im}
        soz={kimlikSozu(kanit, simdi, esik)}
        baslik={kanit.ad}
        cumle={dosyaCumlesi(kanit)}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Tip', deger: tipEtiketi(kanit.tip) },
        { etiket: 'Tazelik', deger: `${t.etiket} · ${t.gun} gün`, durum: t.durum },
        { etiket: t.kaynak === 'toplanma' ? 'Toplanma' : 'Geçerlilik başlangıcı',
          deger: tarihTR(kanit.toplanma ?? kanit.baslangic) },
        { etiket: 'Geçerlilik bitişi',
          deger: kanit.bitis ? tarihTR(kanit.bitis) : 'kayıt yok',
          durum: t.kaynak === 'bitis' ? 'bd' : undefined },
        { etiket: 'Yükleyen', deger: kanit.yukleyen ?? 'kayıt yok' },
        { etiket: 'Sahip', deger: kanit.sahip ?? 'kayıt yok' },
        { etiket: 'Kaynak sistem', deger: kanit.kaynakSistem ?? (kanit.otomatik ? 'otomatik · sistem adı kayıt yok' : 'elle') },
        { etiket: 'Gizlilik', deger: etiketle(kanit.gizlilik) },
        { etiket: 'Bağlantı', deger: baglantiOzeti(kanit), durum: bagliMi(kanit) ? undefined : 'unk' },
      ]} />

      {kayitlar.length > 0 ? (
        <CekmeceBagli baslik="Bağlı kayıtlar" kayitlar={kayitlar} />
      ) : (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Bağlı kayıtlar</p>
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i3)' }}>
            <Im durum="unk" ad="Bağlı kayıt yok" /> Bu kanıt hiçbir madde, bulgu ya da santrale bağlı değil;
            neyi karşıladığı bilinmiyor.
          </p>
        </div>
      )}

      <MetadataBlogu kanit={kanit} />
      <DosyaBlogu kanit={kanit} />
      <SurumBlogu kanit={kanit} />

      <CekmeceEylemler
        dipNot={'Kanıt bağlama bulgu ekranında ve süreç madde listesinde de '
          + 'yapılabilir. İçerik değişince YENİ SÜRÜM açılır ve gerekçesi '
          + 'değişmez sürüm kütüğüne yazılır; metadata değişikliği sürüm '
          + 'açmaz. Her değişiklik denetim izine düşer.'}
      />
    </Cekmece>
  );
}

/* ═══ UY-12 · Metadata ═════════════════════════════════════════════════

   Kanıt kaydı bir ad ve bir tipten ibaretti; denetimde sorulan hiçbir
   soru o kayıttan cevaplanamıyordu. Bu blok beş boşluğu birden kapatır:
   kabul durumu, sahiplik, kaynak, geçerlilik aralığı, gizlilik.

   ── DURUM İLE TARİH KARIŞTIRILMAZ ─────────────────────────────────────
   `durum` "kabul edildi mi", `bitis` "ne zamana kadar geçerli" der.
   Reddedilmiş bir kanıt süresi dolana kadar geçerli görünemez. */

function MetadataBlogu({ kanit }: { kanit: KanitSatiri }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [f, setF] = useState({
    ad: kanit.ad,
    tip: kanit.tip,
    durum: kanit.durum,
    gizlilik: kanit.gizlilik,
    kaynakSistem: kanit.kaynakSistem ?? '',
    kaynakUrl: kanit.kaynakUrl ?? '',
    baslangic: kanit.baslangic.slice(0, 10),
    bitis: kanit.bitis?.slice(0, 10) ?? '',
    toplanma: kanit.toplanma?.slice(0, 10) ?? '',
  });

  const durum = (KANIT_DURUMLARI as readonly string[]).includes(kanit.durum)
    ? kanit.durum as KanitDurumu : 'gecerli';
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Künye (UY-12)</p>
      <dl className="ab-panel-ciftler">
        <div>
          <dt>Kabul durumu</dt>
          <dd className={durum === 'gecerli' ? undefined : durum === 'reddedildi' ? 'd-bd' : 'd-md'}>
            {KANIT_DURUM_ETIKETI[durum]}
          </dd>
        </div>
        <div>
          <dt>Kaynak adresi</dt>
          <dd className={kanit.kaynakUrl ? undefined : 'd-unk'}>
            {kanit.kaynakUrl ?? 'girilmedi'}
          </dd>
        </div>
        <div>
          <dt>İçerik özeti</dt>
          <dd className={kanit.dosyaHash ? 'mono' : 'd-unk'}>
            {kanit.dosyaHash ? `${kanit.dosyaHash.slice(0, 16)}…` : 'hesaplanmadı'}
          </dd>
        </div>
      </dl>

      {!kanit.duzenlenebilir ? (
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
          Bu kanıtı düzenlemek, bağlı olduğu santrallerin HEPSİNDE uyum yazma
          yetkisi ister. Bağı olmayan kanıt yalnız kapsamsız yetkiyle
          düzenlenir.
        </p>
      ) : !acik ? (
        <div style={{ marginTop: 'var(--s12)' }}>
          <Dugme onClick={() => setAcik(true)}>Künyeyi düzenle</Dugme>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s12)' }}>
          <Alan etiket="Ad" zorunlu>
            <input className="ab-gr" value={f.ad}
              onChange={(e) => setF({ ...f, ad: e.target.value })} />
          </Alan>
          <Alan etiket="Tip">
            <select className="ab-gr" value={f.tip}
              onChange={(e) => setF({ ...f, tip: e.target.value })}>
              {TUM_KANIT_TIPLERI.map((t) => (
                <option key={t} value={t}>{KANIT_TIP_ETIKETI[t as KanitTipi]}</option>
              ))}
            </select>
          </Alan>
          <Alan etiket="Kabul durumu">
            <select className="ab-gr" value={f.durum}
              onChange={(e) => setF({ ...f, durum: e.target.value })}>
              {KANIT_DURUMLARI.map((d) => (
                <option key={d} value={d}>{KANIT_DURUM_ETIKETI[d]}</option>
              ))}
            </select>
          </Alan>
          <Alan etiket="Gizlilik">
            <select className="ab-gr" value={f.gizlilik}
              onChange={(e) => setF({ ...f, gizlilik: e.target.value })}>
              {GIZLILIK_DUZEYLERI.map((g) => (
                <option key={g} value={g}>{GIZLILIK_ETIKETI[g]}</option>
              ))}
            </select>
          </Alan>
          <Alan etiket="Kaynak sistem">
            <input className="ab-gr" value={f.kaynakSistem}
              placeholder="elle toplandıysa boş bırakın"
              onChange={(e) => setF({ ...f, kaynakSistem: e.target.value })} />
          </Alan>
          <Alan etiket="Kaynak adresi">
            <input className="ab-gr" value={f.kaynakUrl}
              onChange={(e) => setF({ ...f, kaynakUrl: e.target.value })} />
          </Alan>
          <Alan etiket="Geçerlilik başlangıcı">
            <input className="ab-gr" type="date" value={f.baslangic}
              onChange={(e) => setF({ ...f, baslangic: e.target.value })} />
          </Alan>
          <Alan etiket="Geçerlilik bitişi (boş = süresiz)">
            <input className="ab-gr" type="date" value={f.bitis}
              onChange={(e) => setF({ ...f, bitis: e.target.value })} />
          </Alan>
          <Alan etiket="Toplanma tarihi">
            <input className="ab-gr" type="date" value={f.toplanma}
              onChange={(e) => setF({ ...f, toplanma: e.target.value })} />
          </Alan>
          {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor || !f.ad.trim()}
              onClick={() => calistir(() => kanitKaydet({
                id: kanit.id, ad: f.ad, tip: f.tip, durum: f.durum,
                gizlilik: f.gizlilik,
                kaynakSistem: f.kaynakSistem || null,
                kaynakUrl: f.kaynakUrl || null,
                gecerlilikBaslangic: f.baslangic || null,
                gecerliBitis: f.bitis || null,
                toplanmaTarihi: f.toplanma || null,
              }), () => setAcik(false))}>
              Kaydet
            </Dugme>
            <Dugme tur="ret" onClick={() => setAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Künye değişikliği SÜRÜM AÇMAZ — sürüm yalnız dosya içeriği
            değişince açılır. Kabul durumu değişikliği kendi denetim izi
            satırını alır.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══ UY-13 · Dosya ════════════════════════════════════════════════════

   Ürün yüklenen dosyayı AÇMAZ, ayrıştırmaz, önizlemez ve çalıştırmaz;
   bir bayt dizisi olarak saklar ve SHA-256 özetini alır. Depo içerik
   adreslidir: kullanıcının verdiği ad hiçbir zaman dosya yoluna geçmez.

   ── "DOSYA YOK" İLE "YOL YAZILMIŞ" AYRI ───────────────────────────────
   `depoAnahtari` yoksa dosya YOKTUR. Eski `dosyaYolu` metni yalnız
   birinin bir yol yazdığını söyler; o yolda bir dosya olduğu
   ÖLÇÜLMEMİŞTİR ve ekran bunu "dosya var" diye okumaz. */

const bayt = (n: number): string =>
  (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`);

function DosyaBlogu({ kanit }: { kanit: KanitSatiri }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const [dosya, setDosya] = useState<{ ad: string; tip: string; boyut: number } | null>(null);
  const [icerik, setIcerik] = useState<string | null>(null);
  const [okumaHatasi, setOkumaHatasi] = useState<string | null>(null);
  const [ozet, setOzet] = useState<string | null>(null);

  async function dosyaSec(d: File) {
    setOkumaHatasi(null); setOzet(null);
    if (!(d.type in IZINLI_TIPLER)) {
      setOkumaHatasi(`İçerik tipi kabul edilmiyor: ${d.type || 'bilinmiyor'}.`);
      setDosya(null); setIcerik(null);
      return;
    }
    if (d.size > DOSYA_SINIRI) {
      setOkumaHatasi(`Dosya ${bayt(DOSYA_SINIRI)} sınırını aşıyor (${bayt(d.size)}).`);
      setDosya(null); setIcerik(null);
      return;
    }
    const tampon = new Uint8Array(await d.arrayBuffer());
    /* Yığın taşmasın diye parça parça kodlanır: `String.fromCharCode(...)`
       tek seferde çağrıldığında büyük dosyada argüman sınırını aşar. */
    let ikili = '';
    for (let i = 0; i < tampon.length; i += 8192) {
      ikili += String.fromCharCode(...tampon.subarray(i, i + 8192));
    }
    setDosya({ ad: d.name, tip: d.type, boyut: d.size });
    setIcerik(btoa(ikili));
  }

  const gecerli = icerik !== null && gerekce.trim().length >= 10;

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Dosya (UY-13)</p>

      {kanit.depoAnahtari ? (
        <dl className="ab-panel-ciftler">
          <div><dt>Dosya</dt><dd>{kanit.dosyaAdi ?? 'ad kayıtlı değil'}</dd></div>
          <div>
            <dt>Boyut</dt>
            <dd className={kanit.dosyaBoyut === null ? 'd-unk' : undefined}>
              {kanit.dosyaBoyut === null ? 'ölçülmedi' : bayt(kanit.dosyaBoyut)}
            </dd>
          </div>
          <div><dt>Tip</dt><dd className="mono">{kanit.dosyaTipi ?? 'bilinmiyor'}</dd></div>
          <div><dt>Sürüm</dt><dd>v{kanit.surum}</dd></div>
        </dl>
      ) : (
        <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--unk)' }}>
          Bu kanıta dosya yüklenmedi.
          {kanit.dosyaYolu && (
            <> Kütükte bir yol metni var (<span className="mono">{kanit.dosyaYolu}</span>)
              ama o yolda bir dosya olduğu ÖLÇÜLMEDİ.</>
          )}
        </p>
      )}

      {!kanit.duzenlenebilir ? null : !acik ? (
        <div style={{ marginTop: 'var(--s12)' }}>
          <Dugme onClick={() => setAcik(true)}>
            {kanit.depoAnahtari ? 'Yeni sürüm yükle' : 'Dosya yükle'}
          </Dugme>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s12)' }}>
          <Alan etiket="Dosya" zorunlu>
            <input className="ab-gr" type="file"
              accept={Object.keys(IZINLI_TIPLER).join(',')}
              onChange={(e) => {
                const d = e.target.files?.[0];
                if (d) void dosyaSec(d);
              }} />
          </Alan>
          {dosya && (
            <p className="mono" style={{ margin: 0, fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
              {dosya.ad} · {bayt(dosya.boyut)} · {dosya.tip}
            </p>
          )}
          {okumaHatasi && (
            <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{okumaHatasi}</p>
          )}
          <Alan etiket="Sürüm gerekçesi" zorunlu>
            <textarea className="ab-gr" rows={2} value={gerekce} style={{ resize: 'vertical' }}
              placeholder="Bu sürüm neden yükleniyor? (en az 10 karakter)"
              onChange={(e) => setGerekce(e.target.value)} />
          </Alan>
          {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
          {ozet && (
            <p style={{ margin: 0, fontSize: 'var(--t-field)' }} role="status">{ozet}</p>
          )}
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor || !gecerli}
              onClick={() => calistir(async () => {
                const r = await kanitDosyasiYukle({
                  kanitId: kanit.id, dosyaAdi: dosya!.ad, mimeTipi: dosya!.tip,
                  icerik: icerik!, gerekce,
                });
                if (r.ok) {
                  /* Aynı içerik yeniden yüklendiğinde sürüm AÇILMAZ ve bu
                     sessiz geçmez: kullanıcı yeni sürüm açtığını sanmasın. */
                  setOzet(r.zatenVardi
                    ? `İçerik birebir aynı — yeni sürüm açılmadı (v${r.surum} kaldı).`
                    : `Yeni sürüm yazıldı: v${r.surum}.`);
                }
                return r;
              })}>
              {bekliyor ? 'Yükleniyor…' : 'Yükle'}
            </Dugme>
            <Dugme tur="ret" onClick={() => setAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Ürün dosyayı AÇMAZ, ayrıştırmaz ve çalıştırmaz; bayt dizisi olarak
            saklar ve SHA-256 özetini alır. İzinli tipler:{' '}
            {Object.values(IZINLI_TIPLER).join(' · ')}. En büyük boyut{' '}
            {bayt(DOSYA_SINIRI)}. Aynı içerik ikinci kez yüklenirse yeni sürüm
            AÇILMAZ.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══ UY-12 · Sürüm geçmişi ════════════════════════════════════════════

   Satırlar DEĞİŞMEZDİR ve bu bir yorum değil bir veritabanı kuralıdır:
   `KanitSurumu` tablosunda güncelleme ve silme tetikleyiciyle yasaktır
   (`AktiviteKaydi` ve `DegerlendirmeTarihcesi` ile aynı koruma). */

function SurumBlogu({ kanit }: { kanit: KanitSatiri }) {
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Sürüm geçmişi · {kanit.surumler.length}
      </p>
      {kanit.surumler.length === 0 ? (
        <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--unk)' }}>
          Kayıtlı sürüm yok — bu kanıta hiç dosya yüklenmedi. Kütükteki
          sürüm sayacı (v{kanit.surum}) bir içerik geçmişini temsil ETMEZ.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s12)' }}>
          {kanit.surumler.map((sv) => (
            <div key={sv.surum} style={{ borderLeft: 'var(--bw-edge) solid var(--hr2)',
              paddingLeft: 'var(--s12)', display: 'grid', gap: 'var(--s3)' }}>
              <span style={{ fontSize: 'var(--t-field)', fontWeight: 600 }}>
                v{sv.surum} · {sv.dosyaAdi ?? 'dosya adı kayıtlı değil'}
              </span>
              <span className="mono" style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                {tarihTR(sv.zaman)}
                {sv.yukleyen && ` · ${sv.yukleyen}`}
                {sv.dosyaBoyut !== null && ` · ${bayt(sv.dosyaBoyut)}`}
                {sv.dosyaHash && ` · ${sv.dosyaHash.slice(0, 12)}…`}
              </span>
              <span style={{ fontSize: 'var(--t-label)', color: 'var(--i2)' }}>
                {sv.gerekce}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
        Sürüm satırları DEĞİŞMEZ: güncelleme ve silme veritabanı
        tetikleyicisiyle yasaklıdır.
      </p>
    </div>
  );
}
