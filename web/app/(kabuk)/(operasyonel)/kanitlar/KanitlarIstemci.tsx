'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alan, BosFiltre, BosIlk, Dugme, Hata, Im, type Durum } from '@/components/kabuk/temel';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi, Filtreler } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { kanitEkle } from '@/lib/eylemler';
import { BULGU_DURUM_ETIKET, etiketle, tarihTR } from '@/lib/sabitler';
import { an } from '@/lib/an';
import { kisaTarih } from '../bulgular/mantik';
import {
  MERCEKLER, baglantiOzeti, bagliMi, baslikMetni, dipNot, dosyaCumlesi, kanitImi,
  kimlikSozu, metrikleriHesapla, sirala, suz, tazelik, tipEtiketi,
  type KanitSatiri, type Mercek, type SiraAnahtari, type SiraYonu,
} from './mantik';
import type { MaddeDurumuSecenegi } from './veri';

/* C21 · Kanıt kütüphanesi — İSTEMCİ.

   Kolonlar: kanıt (konu) · tip · tarih · bağlı kayıt · yükleyen. İşaretçi
   tazeliği taşır (taze/yenilenmeli/doldu), bağlantısız kanıt bilinmeyen
   elması alır — "0 bağ" bir durum değil, bir bilinmezliktir.

   Kanıt ekleme `kanitEkle` eylemine bağlanır: ad · tip · madde durumu.
   Dosya yükleme YOK; form bunu söyler, kayıt "dosya yolu kayıtlı değil"
   olarak düşer. Gerçek olmayan bir "yüklendi" durumu üretilmez. */

/** `kanitEkle` şemasının kabul ettiği tipler (lib/eylemler.ts ile aynı küme). */
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
  kanitlar, toplam, kapsamDisi, maddeDurumlari, yazabilir, kapsamli = false,
}: {
  kanitlar: KanitSatiri[];
  /** kütüğün GERÇEK büyüklüğü — sunucu tavanı satırları kestiyse fark açılır */
  toplam: number;
  /** kapsam daraltıldığı için listelenmeyen bağlantısız kanıt sayısı */
  kapsamDisi: number;
  maddeDurumlari: MaddeDurumuSecenegi[];
  yazabilir: boolean;
  kapsamli?: boolean;
}) {
  const [mercek, setMercek] = useState<Mercek>('hepsi');
  const [tipF, setTipF] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [sira, setSira] = useState<{ anahtar: SiraAnahtari; yon: SiraYonu }>(
    { anahtar: 'tarih', yon: 'artan' });
  const [secili, setSecili] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [formAcik, setFormAcik] = useState(false);

  /* Anı bir kez okuruz: sunucu ile tarayıcı aynı "şimdi"yi görsün
     (lib/an.ts). Tazelik kararı bu ana göre verilir. */
  const simdi = useMemo(() => an(), []);

  const metrikler = useMemo(() => metrikleriHesapla(kanitlar, simdi), [kanitlar, simdi]);
  const kesildi = toplam > kanitlar.length;

  /* Tip seçenekleri elde duran kütükten türetilir — olmayan tip listeye girmez. */
  const tipler = useMemo(() => [...new Set(kanitlar.map((k) => k.tip))]
    .sort((a, b) => tipEtiketi(a).localeCompare(tipEtiketi(b), 'tr'))
    .map((t) => ({ id: t, ad: tipEtiketi(t) })), [kanitlar]);

  const suzulmus = useMemo(
    () => sirala(suz(kanitlar, { mercek, tip: tipF, arama }, simdi), sira.anahtar, sira.yon),
    [kanitlar, mercek, tipF, arama, sira, simdi],
  );

  /* Sürükleyici satır asla toplanmaz: süresi dolmuş · yenilenmeli · bağlantısız.
     Taze ve bağlı kanıtlar kuyruğa iner. */
  const { gorunur, toplanan } = useMemo(() => {
    const sabit = suzulmus.filter((k) => kanitImi(k, simdi) !== 'ok');
    const kalan = suzulmus.filter((k) => kanitImi(k, simdi) === 'ok');
    if (kuyrukAcik) return { gorunur: [...sabit, ...kalan], toplanan: [] as KanitSatiri[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return { gorunur: [...sabit, ...kalan.slice(0, slot)], toplanan: kalan.slice(slot) };
  }, [suzulmus, kuyrukAcik, simdi]);

  const secilen = kanitlar.find((k) => k.id === secili) ?? null;
  const filtreAktif = mercek !== 'hepsi' || tipF !== null || arama.trim() !== '';

  const satirlar: Satir[] = gorunur.map((k) => {
    const im = kanitImi(k, simdi);
    return {
      id: k.id,
      durum: im,
      kenar: im,
      konu: k.ad,
      alt: k.dosyaYolu ? `sürüm ${k.surum} · dosya yolu kayıtlı` : `sürüm ${k.surum} · dosya yolu kayıtlı değil`,
      hucreler: [
        tipEtiketi(k.tip),
        <TarihHucresi key="t" kanit={k} simdi={simdi} />,
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
        <KanitCekmecesi kanit={secilen} simdi={simdi} kapat={() => setSecili(null)} />
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

const KIRP = {
  minWidth: 0, flex: '1 1 auto',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
} as const;

const SATIR_ICI = {
  display: 'flex', alignItems: 'center', gap: 'var(--s10)', minWidth: 0,
} as const;

/** Tarih olgusu: toplanma (ya da başlangıç) + varsa geçerlilik bitişi. */
function TarihHucresi({ kanit, simdi }: { kanit: KanitSatiri; simdi: number }) {
  const t = tazelik(kanit, simdi);
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

function KanitCekmecesi({ kanit, simdi, kapat }: {
  kanit: KanitSatiri; simdi: number; kapat: () => void;
}) {
  const im: Durum = kanitImi(kanit, simdi);
  const t = tazelik(kanit, simdi);
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
        soz={kimlikSozu(kanit, simdi)}
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

      <CekmeceEylemler
        dipNot="Kanıt bağlama bulgu kayıt ekranında ve süreç madde listesinde yapılır; dosya yükleme bu sürümde yoktur. Her değişiklik denetim izine yazılır."
      />
    </Cekmece>
  );
}
