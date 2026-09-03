'use client';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import Link from 'next/link';
import { Alan, BosFiltre, BosIlk, Dugme, Hata, Im, type Durum } from '@/components/kabuk/temel';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi, Filtreler } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { dokumanKaydet, dokumanDurumDegistir, dokumanGozdenGecirildi } from '@/lib/eylemler2/dokuman';
import { etiketle, tarihTR } from '@/lib/sabitler';
import { an } from '@/lib/an';
import {
  DURUM_IM, DURUM_SOZU, GECISLER, MERCEKLER, SIRALAMALAR, TURLER, TUR_SOZU,
  aramaUygula, baslikMetni, dipNot, gozdenGecirmeHali, gozdenGecirmeYazisi, kapsamYazisi,
  karsiliksizKontroller, kodOner, mercekUygula, olcu, sirala, yarimKarsilananlar,
  type BelgeDurumu, type BelgeSatiri, type KontrolSatiri, type Mercek, type Siralama, type Tur,
} from './mantik';

/* C22 politika · C23 doküman kütüğü — İSTEMCİ.

   EKRANIN SORUSU tablonun kendisi değildir: "hangi kontrol gereğini
   karşılayan YÜRÜRLÜKTE bir belgemiz yok?" Bu yüzden karşılıksız kontrol
   paneli tablonun ÜSTÜNDE durur ve kapatılamaz — kütüğü tarayıp eksiği
   kendi başına çıkarmak kimsenin işi olmamalı.

   İki eksik hâli AYRI yazılır:
     · karşılıksız  — hiçbir belge bağlı değil;
     · yarım        — belge bağlı ama hiçbiri yürürlükte (taslak/askıda).
   İkincisi daha sinsidir: kütükte bir ad görünür, denetimde karşılığı
   yoktur. */

const KOLONLAR: Kolon[] = [
  { baslik: 'Tür', genislik: '104px', ikincil: true },
  { baslik: 'Durum', genislik: '150px' },
  { baslik: 'Gözden geçirme', genislik: '176px' },
  { baslik: 'Kontrol', genislik: 'minmax(140px, 0.7fr)' },
  { baslik: 'Sahip', genislik: '126px', ikincil: true },
];

/** Tabloda tutulan satır bütçesi; güncel ve takvimli belgeler kuyruğa iner. */
const GORUNUR_BUTCE = 8;

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

/* `display: block` ŞART: `overflow`/`text-overflow` satır içi kutuda
   YOK SAYILIR. Kontrol hücresi doğrudan ızgara hücresinin çocuğu olarak
   satır içi kalıyordu, üç nokta hiç çalışmıyor ve "EPDK-SYM-4.2.2 +1"
   123px'te sabit durup sayfayı 375px'te 74px yatay kaydırıyordu. */
const KIRP = {
  display: 'block', minWidth: 0, flex: '1 1 auto',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
} as const;

const SATIR_ICI = {
  display: 'flex', alignItems: 'center', gap: 'var(--s10)', minWidth: 0,
} as const;

/* Çengel aboneliği modül düzeyindedir: her renderda yeni bir işlev
   üretilirse `useSyncExternalStore` her seferinde yeniden abone olur. */
const CENGEL_ONEKI = '#belge=';
const cengelOku = () => window.location.hash;
function cengeleAbone(bildir: () => void) {
  window.addEventListener('hashchange', bildir);
  return () => window.removeEventListener('hashchange', bildir);
}

/** Çekmece seçimi: çengelden mi geliyor, kullanıcının elinden mi. */
type Secim = { kaynak: 'cengel' } | { kaynak: 'el'; id: string | null };

type Secenek = { id: string; kod: string; baslik: string; regulasyon: string };
type TesisSecenegi = { id: string; kod: string; ad: string };

export default function DokumanlarIstemci({
  belgeler, toplam, kapsamDisi, kontroller, maddeSecenekleri, tesisSecenekleri,
  kisiler, mevcutKodlar, yazabilir, onaylayabilir, kapsamli = false,
}: {
  belgeler: BelgeSatiri[];
  toplam: number;
  kapsamDisi: number;
  kontroller: KontrolSatiri[];
  maddeSecenekleri: Secenek[];
  tesisSecenekleri: TesisSecenegi[];
  kisiler: { id: string; ad: string }[];
  mevcutKodlar: string[];
  yazabilir: boolean;
  onaylayabilir: boolean;
  kapsamli?: boolean;
}) {
  const [mercek, setMercek] = useUrlDurumu<Mercek>('mercek', 'tumu');
  const [turF, setTurF] = useUrlDurumuBos('tur');
  const [arama, setArama] = useState('');
  const [siralama, setSiralama] = useState<Siralama>('acil');
  const [secim, setSecim] = useState<Secim>({ kaynak: 'cengel' });
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [formAcik, setFormAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<BelgeSatiri | null>(null);

  /* Anı BİR KEZ okuruz: sunucu ile tarayıcı aynı "şimdi"yi görsün, gecikme
     kararı satır satır kaymasın (lib/an.ts). */
  const simdi = useMemo(() => an(), []);

  /* ── Derin bağ · #belge=KOD ─────────────────────────────────────────
     Uyum matrisi bir hücrede "bu kontrolü karşılayan belge"yi gösterir ve
     oradan buraya KODLA bağlanır. Adres SORGU değil ÇENGEL taşır: sorgu
     `useSearchParams` demek, o da Suspense sınırı demek, o da statik dışa
     aktarımda bu ekranın önden basılmış HTML'ini kaybetmek demektir. Çengel
     yalnız tarayıcıda okunur, sunucu çıktısı bozulmaz.

     Çengel React'in değil ADRES ÇUBUĞUNUN durumudur; efektle state'e
     kopyalanmaz (cascading render), `useSyncExternalStore` ile abone
     olunur. Kullanıcı çekmeceyi kapattığı an seçim ELE geçer ve çengel
     artık konuşmaz — yoksa kapanan çekmece yeniden açılırdı.

     Kod eşleşmezse ya da belge kullanıcının kapsamı dışındaysa çekmece
     kapalı kalır: hata verilmez, belgenin varlığı da yokluğu da sızmaz. */
  const cengel = useSyncExternalStore(cengeleAbone, cengelOku, () => '');
  const cengelKodu = cengel.startsWith(CENGEL_ONEKI)
    ? decodeURIComponent(cengel.slice(CENGEL_ONEKI.length))
    : '';
  const cengelBelgesi = cengelKodu
    ? belgeler.find((b) => b.kod === cengelKodu)?.id ?? null
    : null;
  const secili = secim.kaynak === 'cengel' ? cengelBelgesi : secim.id;
  const secBelge = (id: string | null) => setSecim({ kaynak: 'el', id });

  const olculer = useMemo(() => olcu(belgeler, simdi), [belgeler, simdi]);
  const karsiliksiz = useMemo(() => karsiliksizKontroller(kontroller), [kontroller]);
  const yarim = useMemo(() => yarimKarsilananlar(kontroller), [kontroller]);
  const kesildi = toplam > belgeler.length;

  const turler = useMemo(() => [...new Set(belgeler.map((b) => b.tur))]
    .sort((a, b) => (TUR_SOZU[a as Tur] ?? a).localeCompare(TUR_SOZU[b as Tur] ?? b, 'tr'))
    .map((t) => ({ id: t, ad: TUR_SOZU[t as Tur] ?? t })), [belgeler]);

  const suzulmus = useMemo(() => {
    let liste = mercekUygula(belgeler, mercek, simdi);
    if (turF) liste = liste.filter((b) => b.tur === turF);
    return sirala(aramaUygula(liste, arama), siralama, simdi);
  }, [belgeler, mercek, turF, arama, siralama, simdi]);

  /* Sürükleyici satır toplanmaz: gecikmiş · takvimsiz · askıda. Güncel ve
     takvimli belgeler kuyruğa iner — iyi haber yer kaplamaz. */
  const { gorunur, toplanan } = useMemo(() => {
    const acil = (b: BelgeSatiri) => {
      const h = gozdenGecirmeHali(
        b.sonrakiGozdenGecirme ? new Date(b.sonrakiGozdenGecirme) : null, simdi);
      return h.kod === 'gecti' || h.kod === 'takvimsiz' || b.durum === 'askida';
    };
    const sabit = suzulmus.filter(acil);
    const kalan = suzulmus.filter((b) => !acil(b));
    if (kuyrukAcik) return { gorunur: [...sabit, ...kalan], toplanan: [] as BelgeSatiri[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return { gorunur: [...sabit, ...kalan.slice(0, slot)], toplanan: kalan.slice(slot) };
  }, [suzulmus, kuyrukAcik, simdi]);

  const secilen = belgeler.find((b) => b.id === secili) ?? null;
  const filtreAktif = mercek !== 'tumu' || turF !== null || arama.trim() !== '';
  const baslik = baslikMetni(olculer, karsiliksiz.length);

  const satirlar: Satir[] = gorunur.map((b) => {
    const h = gozdenGecirmeHali(
      b.sonrakiGozdenGecirme ? new Date(b.sonrakiGozdenGecirme) : null, simdi);
    const im = DURUM_IM[b.durum as BelgeDurumu] ?? 'unk';
    /* Satırın işareti EN KÖTÜ olguyu taşır: yürürlükteki bir belge gözden
       geçirmesi geçmişse yeşil kalamaz. */
    const enKotu: Durum = h.kod === 'gecti' ? 'bd' : im === 'ok' && h.kod === 'yaklasti' ? 'md' : im;
    return {
      id: b.id,
      durum: enKotu,
      kenar: enKotu,
      konu: b.baslik,
      alt: `${b.kod} · sürüm ${b.surum} · ${kapsamYazisi(b.tesisler)}`,
      hucreler: [
        TUR_SOZU[b.tur as Tur] ?? b.tur,
        <DurumHucresi key="d" belge={b} />,
        <GozdenHucresi key="g" belge={b} simdi={simdi} />,
        <KontrolHucresi key="k" belge={b} />,
        b.sahip ?? <Bos key="s" />,
      ],
    };
  });

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={kesildi
            ? `Belge kütüğü · ${olculer.toplam} belge · gösterilen ${belgeler.length} / ${toplam}`
            : `Belge kütüğü · ${olculer.toplam} belge · ${kontroller.length} kontrol`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            { deger: olculer.gecikmis, yazi: 'Gözden geçirmesi geçti',
              durum: olculer.gecikmis > 0 ? 'bd' : undefined },
            { deger: karsiliksiz.length, payda: kontroller.length, yazi: 'Karşılıksız kontrol',
              durum: karsiliksiz.length > 0 ? 'bd' : undefined },
            { deger: olculer.takvimsiz, yazi: 'Takvimsiz',
              durum: olculer.takvimsiz > 0 ? 'unk' : undefined },
            { deger: olculer.yururlukte, yazi: 'Yürürlükte' },
          ]}
        />

        <section className="ab-ekran-govde">
          <BoslukPaneli karsiliksiz={karsiliksiz} yarim={yarim} toplam={kontroller.length} />

          <Filtreler
            secenekler={MERCEKLER.map((m) => ({ id: m.kod, ad: m.ad }))}
            aktif={mercek}
            sec={(id) => { setMercek(id as Mercek); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Ara deger={arama} degistir={(v) => { setArama(v); setKuyrukAcik(false); }} />
                <label className="ab-dok-sira">
                  <span className="etiket">Sırala</span>
                  <select className="ab-gr" value={siralama}
                    onChange={(e) => setSiralama(e.target.value as Siralama)}>
                    {SIRALAMALAR.map((s) => <option key={s.kod} value={s.kod}>{s.ad}</option>)}
                  </select>
                </label>
                <label className="ab-dok-sira">
                  <span className="etiket">Tür</span>
                  <select className="ab-gr" value={turF ?? ''}
                    onChange={(e) => { setTurF(e.target.value || null); setKuyrukAcik(false); }}>
                    <option value="">Tümü</option>
                    {turler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
                  </select>
                </label>
              </>
            }
          />

          {yazabilir && (
            <div style={{ marginTop: 'var(--s16)' }}>
              {formAcik ? (
                <BelgeFormu
                  belge={duzenlenen}
                  maddeSecenekleri={maddeSecenekleri}
                  tesisSecenekleri={tesisSecenekleri}
                  kisiler={kisiler}
                  mevcutKodlar={mevcutKodlar}
                  kapat={() => { setFormAcik(false); setDuzenlenen(null); }}
                />
              ) : (
                <Dugme tur="ikincil" onClick={() => { setDuzenlenen(null); setFormAcik(true); }}>
                  Belge ekle
                </Dugme>
              )}
            </div>
          )}

          {gorunur.length > 0 || toplanan.length > 0 ? (
            <div style={{ marginTop: 'var(--s22)' }}>
              <Tablo
                konuBasligi="Belge"
                kolonlar={KOLONLAR}
                satirlar={satirlar}
                secili={secili}
                sec={(id) => secBelge(secili === id ? null : id)}
                kuyruk={toplanan.length > 0
                  ? { metin: `+${toplanan.length} belge · güncel ve takvimli`, ac: () => setKuyrukAcik(true) }
                  : null}
              />
              <p className="ab-dip" style={{ margin: 'var(--s14) 0 0' }}>
                {dipNot({ gorunur: gorunur.length, toplam, yuklenen: belgeler.length })}
                {kapsamDisi > 0 && ` · ${kapsamDisi} belge santral kapsamınız dışında`}
              </p>
            </div>
          ) : filtreAktif ? (
            <BosFiltre temizle={() => { setMercek('tumu'); setTurF(null); setArama(''); }} />
          ) : (
            <BosIlk
              cumle={kapsamli
                ? 'Kapsamınızda belge kaydı yok. Kurumsal belgeler santral ayrımı olmadan herkese görünür; demek ki kütük gerçekten boş.'
                : 'Belge kütüğü boş. Politika, prosedür ve planlar buraya kaydedilir; dosyanın kendisi kurumun doküman sisteminde kalır.'}
              eylem={yazabilir && !formAcik
                ? <Dugme tur="ikincil" onClick={() => setFormAcik(true)}>Belge ekle</Dugme>
                : undefined}
            />
          )}
        </section>
      </main>

      {secilen && (
        <BelgeCekmecesi
          belge={secilen}
          simdi={simdi}
          yazabilir={yazabilir}
          onaylayabilir={onaylayabilir}
          duzenle={() => { setDuzenlenen(secilen); setFormAcik(true); secBelge(null); }}
          kapat={() => secBelge(null)}
        />
      )}
    </>
  );
}

/* ── Boşluk paneli — ekranın asıl cevabı ──────────────────────────────
   Sayı DEĞİL, hangi kontrol olduğu yazılır: "4 karşılıksız" bir uyarıdır,
   "EPDK-SYM-6.1.1 Geçit kuralları" bir iştir. */
function BoslukPaneli({ karsiliksiz, yarim, toplam }: {
  karsiliksiz: KontrolSatiri[]; yarim: KontrolSatiri[]; toplam: number;
}) {
  const [genis, setGenis] = useState(false);
  const yalnizBos = karsiliksiz.filter((k) => k.belgeler.length === 0);
  const gosterilen = genis ? yalnizBos : yalnizBos.slice(0, 6);

  if (karsiliksiz.length === 0) {
    return (
      <div className="ab-dok-bosluk d-ok">
        <p className="etiket">Kontrol karşılığı</p>
        <p className="cumle">
          <Im durum="ok" ad="Tümü karşılandı" /> {toplam} kontrol gereğinin
          hepsinin yürürlükte en az bir belgesi var.
        </p>
      </div>
    );
  }

  return (
    <div className="ab-dok-bosluk d-bd">
      <p className="etiket">Kontrol karşılığı · {karsiliksiz.length} / {toplam} eksik</p>
      {yalnizBos.length > 0 && (
        <>
          <p className="cumle">
            <b>{yalnizBos.length} kontrole</b> hiçbir belge bağlı değil.
          </p>
          <ul className="ab-dok-liste">
            {gosterilen.map((k) => (
              <li key={k.maddeId}>
                <Im durum="bd" ad="Belge yok" />
                <Link className="kod"
                  href={`/uyum/${encodeURIComponent(k.regulasyon)}`
                    + `?kontrol=${encodeURIComponent(k.kod)}`}>{k.kod}</Link>
                <span className="ad">{k.baslik}</span>
                <span className="reg">{k.regulasyon}</span>
              </li>
            ))}
          </ul>
          {yalnizBos.length > gosterilen.length && (
            <Dugme tur="satir" onClick={() => setGenis(true)}>
              +{yalnizBos.length - gosterilen.length} kontrol daha
            </Dugme>
          )}
        </>
      )}
      {yarim.length > 0 && (
        <>
          <p className="cumle uyari">
            <b>{yarim.length} kontrolün</b> belgesi var ama hiçbiri yürürlükte değil —
            kütükte adı görünür, denetimde karşılığı yoktur.
          </p>
          <ul className="ab-dok-liste">
            {yarim.map((k) => (
              <li key={k.maddeId}>
                <Im durum="md" ad="Yalnız taslak/askıda belge" />
                <Link className="kod"
                  href={`/uyum/${encodeURIComponent(k.regulasyon)}`
                    + `?kontrol=${encodeURIComponent(k.kod)}`}>{k.kod}</Link>
                <span className="ad">{k.baslik}</span>
                <span className="reg">
                  {k.belgeler.map((b) => `${b.kod} · ${DURUM_SOZU[b.durum as BelgeDurumu] ?? b.durum}`).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ── Hücreler ─────────────────────────────────────────────────────────── */

function DurumHucresi({ belge }: { belge: BelgeSatiri }) {
  const d = belge.durum as BelgeDurumu;
  return (
    <span style={SATIR_ICI}>
      <Im durum={DURUM_IM[d] ?? 'unk'} ad={DURUM_SOZU[d] ?? belge.durum} />
      <span style={KIRP}>
        {DURUM_SOZU[d] ?? belge.durum}
        <span style={{ color: 'var(--i3)' }}> · v{belge.surum}</span>
      </span>
    </span>
  );
}

function GozdenHucresi({ belge, simdi }: { belge: BelgeSatiri; simdi: number }) {
  const h = gozdenGecirmeHali(
    belge.sonrakiGozdenGecirme ? new Date(belge.sonrakiGozdenGecirme) : null, simdi);
  return (
    <span style={SATIR_ICI}>
      <Im durum={h.durum} ad={gozdenGecirmeYazisi(h)} />
      <span style={{ ...KIRP, ...(h.kod === 'gecti' ? { color: 'var(--bd)', fontWeight: 600 } : {}) }}>
        {h.kod === 'takvimsiz'
          ? 'periyot tanımlı değil'
          : `${tarihTR(belge.sonrakiGozdenGecirme)} · ${gozdenGecirmeYazisi(h)}`}
      </span>
    </span>
  );
}

function KontrolHucresi({ belge }: { belge: BelgeSatiri }) {
  if (belge.maddeler.length === 0) {
    return (
      <span style={SATIR_ICI}>
        <Im durum="unk" ad="Kontrole bağlanmamış" />
        <span style={{ ...KIRP, color: 'var(--i3)' }}>bağlanmamış</span>
      </span>
    );
  }
  const ilk = belge.maddeler[0];
  return (
    <span style={KIRP} title={belge.maddeler.map((m) => `${m.kod} ${m.baslik}`).join(' · ')}>
      {ilk.kod}
      {belge.maddeler.length > 1 && (
        <span style={{ color: 'var(--i3)' }}> +{belge.maddeler.length - 1}</span>
      )}
    </span>
  );
}

/* ── Çekmece ──────────────────────────────────────────────────────────── */

function BelgeCekmecesi({ belge, simdi, yazabilir, onaylayabilir, duzenle, kapat }: {
  belge: BelgeSatiri; simdi: number;
  yazabilir: boolean; onaylayabilir: boolean;
  duzenle: () => void; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [gerekce, setGerekce] = useState('');
  const [hedef, setHedef] = useState<string>('');

  const d = belge.durum as BelgeDurumu;
  const h = gozdenGecirmeHali(
    belge.sonrakiGozdenGecirme ? new Date(belge.sonrakiGozdenGecirme) : null, simdi);
  const im = DURUM_IM[d] ?? 'unk';
  const gecisler = GECISLER[d] ?? [];

  const kayitlar = [
    ...belge.maddeler.map((m) => ({
      id: `madde-${m.id}`, kod: m.kod,
      alt: `Kontrol · ${m.regulasyon} · ${m.baslik}`,
      yol: `/uyum/${encodeURIComponent(m.regulasyon)}`,
    })),
    ...belge.tesisler.map((t) => ({
      id: `tesis-${t.id}`, kod: t.kod, alt: `Santral · ${t.ad}`, yol: `/tesisler/${t.id}`,
    })),
  ];

  return (
    <Cekmece kod={`${TUR_SOZU[belge.tur as Tur] ?? belge.tur} · ${belge.kod}`} kapat={kapat}>
      <CekmeceKimlik
        durum={im}
        soz={`${DURUM_SOZU[d] ?? belge.durum} · sürüm ${belge.surum}`}
        baslik={belge.baslik}
        cumle={belge.aciklama ?? 'Açıklama kaydı yok.'}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Tür', deger: TUR_SOZU[belge.tur as Tur] ?? belge.tur },
        { etiket: 'Durum', deger: DURUM_SOZU[d] ?? belge.durum, durum: im },
        { etiket: 'Yürürlük', deger: belge.yururlukTarihi ? tarihTR(belge.yururlukTarihi) : 'yürürlüğe girmedi',
          durum: belge.yururlukTarihi ? undefined : 'unk' },
        { etiket: 'Gözden geçirme periyodu',
          deger: belge.gozdenGecirmeAy ? `${belge.gozdenGecirmeAy} ay` : 'tanımlı değil',
          durum: belge.gozdenGecirmeAy ? undefined : 'unk' },
        { etiket: 'Sonraki gözden geçirme',
          deger: belge.sonrakiGozdenGecirme
            ? `${tarihTR(belge.sonrakiGozdenGecirme)} · ${gozdenGecirmeYazisi(h)}`
            : 'takvim kurulmadı',
          durum: h.durum },
        { etiket: 'Sahip', deger: belge.sahip ?? 'kayıt yok' },
        { etiket: 'Onaylayan', deger: belge.onaylayan ?? 'kayıt yok' },
        { etiket: 'Kapsam', deger: kapsamYazisi(belge.tesisler) },
        { etiket: 'Gizlilik', deger: etiketle(belge.gizlilik) },
        { etiket: 'Bağlı kanıt', deger: belge.kanitSayisi > 0 ? `${belge.kanitSayisi} kanıt` : 'yok',
          durum: belge.kanitSayisi > 0 ? undefined : 'unk' },
      ]} />

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Dosyanın yeri</p>
        <p style={{ margin: 0, fontSize: 'var(--t-field)' }}>
          {belge.disKaynak
            ? <span className="mono">{belge.disKaynak}</span>
            : <><Im durum="unk" ad="Kaynak kayıtlı değil" /> kaynak yolu kayıtlı değil</>}
        </p>
        <p className="ab-dip" style={{ margin: 'var(--s8) 0 0' }}>
          Belgenin kendisi {belge.kaynakSistem ?? 'kurumun doküman sisteminde'} durur; bu platform
          kütüğü tutar, dosyayı saklamaz ve bu adrese istek atmaz.
        </p>
      </div>

      {kayitlar.length > 0 ? (
        <CekmeceBagli baslik="Karşıladığı kontroller" kayitlar={kayitlar} />
      ) : (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Karşıladığı kontroller</p>
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i3)' }}>
            <Im durum="unk" ad="Kontrol bağı yok" /> Bu belge hiçbir kontrol gereğine bağlı değil;
            neyi karşıladığı bilinmiyor.
          </p>
        </div>
      )}

      {(yazabilir || onaylayabilir) && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)', display: 'grid', gap: 'var(--s12)' }}>
          <p className="etiket" style={{ margin: 0 }}>Yaşam döngüsü</p>
          {gecisler.length === 0 ? (
            <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i3)' }}>
              Yürürlükten kalkmış belge geri döndürülmez; yerine yeni sürüm açılır.
            </p>
          ) : (
            <>
              <Alan etiket="Yeni durum">
                <select className="ab-gr" value={hedef} disabled={bekliyor}
                  onChange={(e) => setHedef(e.target.value)}>
                  <option value="">Seçin</option>
                  {gecisler.map((g) => (
                    <option key={g} value={g}
                      disabled={g === 'yururlukte' && !onaylayabilir}>
                      {DURUM_SOZU[g]}{g === 'yururlukte' && !onaylayabilir ? ' · onay yetkisi gerekir' : ''}
                    </option>
                  ))}
                </select>
              </Alan>
              {hedef === 'askida' && (
                <Alan etiket="Gerekçe" zorunlu>
                  <textarea className="ab-gr" value={gerekce} disabled={bekliyor}
                    placeholder="Belge neden askıya alınıyor? Hangi boşluk oluşuyor?"
                    onChange={(e) => setGerekce(e.target.value)} />
                </Alan>
              )}
              <div style={{ display: 'flex', gap: 'var(--s12)', flexWrap: 'wrap' }}>
                <Dugme tur="birincil"
                  disabled={bekliyor || !hedef || (hedef === 'askida' && !gerekce.trim())}
                  onClick={() => calistir(
                    () => dokumanDurumDegistir({ id: belge.id, durum: hedef, gerekce: gerekce || null }),
                    () => { setHedef(''); setGerekce(''); },
                  )}>
                  Durumu değiştir
                </Dugme>
                {onaylayabilir && d === 'yururlukte' && (
                  <Dugme tur="ikincil" disabled={bekliyor}
                    onClick={() => calistir(() => dokumanGozdenGecirildi({ id: belge.id }))}>
                    Gözden geçirdim
                  </Dugme>
                )}
                {yazabilir && <Dugme tur="ikincil" disabled={bekliyor} onClick={duzenle}>Künyeyi düzenle</Dugme>}
              </div>
            </>
          )}
          {hata && <Hata cumle={hata} />}
        </div>
      )}

      <CekmeceEylemler
        dipNot="Yürürlüğe alma uyum onay yetkisi ister; her geçiş ve gözden geçirme denetim izine yazılır. Belgenin dosyası bu platformda saklanmaz."
      />
    </Cekmece>
  );
}

/* ── Belge künyesi formu ─────────────────────────────────────────────── */

function BelgeFormu({ belge, maddeSecenekleri, tesisSecenekleri, kisiler, mevcutKodlar, kapat }: {
  belge: BelgeSatiri | null;
  maddeSecenekleri: Secenek[];
  tesisSecenekleri: TesisSecenegi[];
  kisiler: { id: string; ad: string }[];
  mevcutKodlar: string[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [tur, setTur] = useState<Tur>((belge?.tur as Tur) ?? 'politika');
  const [kod, setKod] = useState(belge?.kod ?? '');
  const [baslik, setBaslik] = useState(belge?.baslik ?? '');
  const [surum, setSurum] = useState(belge?.surum ?? '1.0');
  const [sahipId, setSahipId] = useState('');
  const [ay, setAy] = useState(belge?.gozdenGecirmeAy ? String(belge.gozdenGecirmeAy) : '');
  const [disKaynak, setDisKaynak] = useState(belge?.disKaynak ?? '');
  const [aciklama, setAciklama] = useState(belge?.aciklama ?? '');
  const [maddeler, setMaddeler] = useState<string[]>(belge?.maddeler.map((m) => m.id) ?? []);
  const [tesisler, setTesisler] = useState<string[]>(belge?.tesisler.map((t) => t.id) ?? []);

  /* Kod önerisi yalnız YENİ kayıtta; var olan belgenin kodu kimliğidir. */
  const onerilen = useMemo(
    () => (belge ? belge.kod : kodOner(tur, mevcutKodlar, new Date(an()).getFullYear())),
    [belge, tur, mevcutKodlar]);
  const kullanilanKod = kod.trim() || onerilen;

  const gruplu = useMemo(() => {
    const g = new Map<string, Secenek[]>();
    for (const m of maddeSecenekleri) {
      const liste = g.get(m.regulasyon) ?? [];
      liste.push(m);
      g.set(m.regulasyon, liste);
    }
    return [...g.entries()];
  }, [maddeSecenekleri]);

  const degistir = (liste: string[], id: string) =>
    (liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]);

  return (
    <div className="ab-panel-blok ab-dok-form">
      <p className="etiket" style={{ margin: 0 }}>
        {belge ? `Künye · ${belge.kod}` : 'Yeni belge'}
      </p>

      <div className="ab-dok-form-ikili">
        <Alan etiket="Tür">
          <select className="ab-gr" value={tur} disabled={bekliyor || Boolean(belge)}
            onChange={(e) => setTur(e.target.value as Tur)}>
            {TURLER.map((t) => <option key={t} value={t}>{TUR_SOZU[t]}</option>)}
          </select>
        </Alan>
        <Alan etiket="Kod" zorunlu>
          <input className="ab-gr" value={kod} placeholder={onerilen} disabled={bekliyor}
            onChange={(e) => setKod(e.target.value)} />
        </Alan>
      </div>

      <Alan etiket="Başlık" zorunlu>
        <input className="ab-gr" value={baslik} disabled={bekliyor}
          onChange={(e) => setBaslik(e.target.value)} />
      </Alan>

      <div className="ab-dok-form-ikili">
        <Alan etiket="Sürüm">
          <input className="ab-gr" value={surum} disabled={bekliyor}
            onChange={(e) => setSurum(e.target.value)} />
        </Alan>
        <Alan etiket="Gözden geçirme periyodu · ay">
          <input className="ab-gr" type="number" min={1} max={120} value={ay} disabled={bekliyor}
            placeholder="tanımsız" onChange={(e) => setAy(e.target.value)} />
        </Alan>
      </div>

      <Alan etiket="Sahip">
        <select className="ab-gr" value={sahipId} disabled={bekliyor}
          onChange={(e) => setSahipId(e.target.value)}>
          <option value="">{belge?.sahip ?? 'Seçilmedi'}</option>
          {kisiler.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
        </select>
      </Alan>

      <Alan etiket="Doküman sistemindeki yolu">
        <input className="ab-gr" value={disKaynak} disabled={bekliyor}
          placeholder="\\kurumsal-dosya\yonetisim\..."
          onChange={(e) => setDisKaynak(e.target.value)} />
      </Alan>

      <Alan etiket="Açıklama">
        <textarea className="ab-gr" value={aciklama} disabled={bekliyor}
          onChange={(e) => setAciklama(e.target.value)} />
      </Alan>

      <fieldset className="ab-dok-secim">
        <legend className="etiket">Karşıladığı kontroller · {maddeler.length} seçili</legend>
        <div className="kutu">
          {gruplu.map(([reg, liste]) => (
            <div key={reg} className="grup">
              <p className="baslik mono">{reg}</p>
              {liste.map((m) => (
                <label key={m.id} className="satir">
                  <input type="checkbox" checked={maddeler.includes(m.id)} disabled={bekliyor}
                    onChange={() => setMaddeler((o) => degistir(o, m.id))} />
                  <span className="mono kod">{m.kod}</span>
                  <span className="ad">{m.baslik}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="ab-dok-secim">
        <legend className="etiket">
          Kapsam · {tesisler.length === 0 ? 'kurumsal (tüm portföy)' : `${tesisler.length} santral`}
        </legend>
        <div className="kutu kisa">
          {tesisSecenekleri.map((t) => (
            <label key={t.id} className="satir">
              <input type="checkbox" checked={tesisler.includes(t.id)} disabled={bekliyor}
                onChange={() => setTesisler((o) => degistir(o, t.id))} />
              <span className="mono kod">{t.kod}</span>
              <span className="ad">{t.ad}</span>
            </label>
          ))}
        </div>
        <p className="ab-dip" style={{ margin: 'var(--s8) 0 0' }}>
          Hiçbiri seçilmezse belge kurumsaldır ve tüm portföyü bağlar.
        </p>
      </fieldset>

      <p className="ab-dip" style={{ margin: 0 }}>
        Yeni belge <b>taslak</b> olarak açılır; yürürlüğe alma ayrı bir onay adımıdır.
        Dosya yüklenmez, yalnız kurumsal sistemdeki yolu kaydedilir.
      </p>

      {hata && <Hata cumle={hata} />}
      <div style={{ display: 'flex', gap: 'var(--s12)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !baslik.trim() || !kullanilanKod.trim()}
          onClick={() => calistir(
            () => dokumanKaydet({
              id: belge?.id,
              kod: kullanilanKod, baslik, tur, surum: surum || '1.0',
              sahipId: sahipId || undefined,
              aciklama: aciklama || null,
              gozdenGecirmeAy: ay ? Number(ay) : null,
              disKaynak: disKaynak || null,
              maddeIdleri: maddeler, tesisIdleri: tesisler,
            }),
            kapat,
          )}>
          Kaydet
        </Dugme>
        <Dugme tur="ikincil" disabled={bekliyor} onClick={kapat}>Vazgeç</Dugme>
      </div>
    </div>
  );
}

/* ── Arama (kardeş ekranlarla aynı gramer) ───────────────────────────── */

function Ara({ deger, degistir }: { deger: string; degistir: (v: string) => void }) {
  return (
    <input
      className="ab-gr"
      aria-label="Belge, kod, kontrol ya da santral ara"
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
