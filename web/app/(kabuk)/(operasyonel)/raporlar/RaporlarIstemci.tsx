'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUrlDurumu } from '@/components/kabuk/urlDurumu';
import Link from 'next/link';
import { Bar, Segment, BosIlk, type Durum } from '@/components/kabuk/temel';
import { Matris, type MatrisSatiri } from '@/components/kabuk/tablo';
import { EkranBasligi, KipDegistir } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { csvAktar, damgaliAd, exceleAktar, pdfYazdir, type Sayfa } from '@/components/disaAktar';
import { useSozluk, useTerim } from '@/lib/dil/SozlukSaglayici';
import { t, tBas, type Sozluk } from '@/lib/dil/terimler';
import { an } from '@/lib/an';
import { DURUM_ETIKET, KANIT_ESIK_VARSAYILAN, ONEM_ETIKET, etiketle, type KanitEsik } from '@/lib/sabitler';
import {
  ALT_ESIK, HEDEF_ESIK, baglantisizKanit, hucreDurumu, hucreIpucu, hucreSozu,
  portfoyOzeti, sakin, siralaTesisler, tazelikKovalari, yasKovalari, zayifHucreSayisi,
  type Bulgu, type Kanit, type Tesis, type Surec,
} from './mantik';

/* Portföy raporu — "hangi tesis × süreç hücresi zayıf?"
   İki canvas modülü (06 §A1): tesis × süreç uyum matrisi ve tek bir
   dağılım tablosu (bulgu yaşı / kanıt tazeliği kiple değişir).

   Durum sözcüğü canvasta GEÇMEZ: matris hücresinde YALNIZ işaretçi vardır,
   dağılım satırında rengi çubuğun dolgusu taşır. Sözcük yalnız çekmecenin
   kimlik bloğunda yazılır.

   Bilinmeyen sıfır sayılmaz: değerlendirilmemiş madde yüzdenin paydasına
   girmez, hücrenin yarısından fazlası bilinmiyorsa hücre yüzde değil
   BİLİNMEYEN işareti gösterir; kapsam dışı hücre ise tümüyle boş kalır. */

type Kip = 'bulgu' | 'kanit';

export default function RaporlarIstemci({
  surecler, tesisler, bulgular, kanitlar, kisitliKapsam, raporZamani, kanitEsik = KANIT_ESIK_VARSAYILAN,
}: {
  surecler: Surec[];
  /** kanıt tazelik eşiği — sunucudan (`kanitEsikleri()`), Kanıt kütüphanesiyle aynı kaynak */
  kanitEsik?: KanitEsik;
  tesisler: Tesis[];
  bulgular: Bulgu[];
  kanitlar: Kanit[];
  kisitliKapsam: boolean;
  /** Rapor anı SUNUCUDA damgalanır: istemcide üretilse hidrasyonda kayardı. */
  raporZamani: string;
}) {
  const [kip, setKip] = useUrlDurumu<Kip>('kip', 'bulgu');
  const [secim, setSecim] = useState<{ tesisId: string; kolon: number } | null>(null);

  const sozluk = useSozluk();
  const { t: terim, tBas: terimBas } = useTerim();
  const sirali = useMemo(() => siralaTesisler(tesisler), [tesisler]);
  const portfoy = useMemo(() => portfoyOzeti(tesisler), [tesisler]);
  const zayif = useMemo(() => zayifHucreSayisi(tesisler), [tesisler]);
  const kovalar = useMemo(() => yasKovalari(bulgular), [bulgular]);
  const tazelik = useMemo(() => tazelikKovalari(kanitlar, kanitEsik), [kanitlar, kanitEsik]);

  const acikBulgu = bulgular.filter((b) => b.acik).length;
  const eskiBulgu = kovalar[3]?.sayi ?? 0;
  const dolmusKanit = tazelik[2]?.sayi ?? 0;

  const satirlar: MatrisSatiri[] = sirali.map((s) => ({
    id: s.id,
    ad: s.ad,
    alt: s.kod,
    yol: s.tesisId ? `/tesisler/${s.tesisId}` : undefined,
    sakin: sakin(s),
    hucreler: s.hucreler.map((h, i) => ({
      durum: hucreDurumu(h),
      ipucu: hucreIpucu(h, surecler[i], s.kod),
    })),
  }));

  const secilen = secim
    ? (() => {
      const tesis = tesisler.find((s) => s.id === secim.tesisId);
      const surec = surecler[secim.kolon];
      const hucre = tesis?.hucreler[secim.kolon];
      return tesis && surec && hucre ? { tesis, surec, hucre } : null;
    })()
    : null;

  /* Başlık hücrenin NOTUNU söyler ("eşiğin altında"), maddelerin durumunu
     değil — çekmecedeki `hucreSozu` ile aynı dili konuşur. */
  const baslik = zayif > 0
    ? { vurgu: `${zayif} hücre`, ad: 'eşiğin altında', durum: 'bd' as Durum }
    : portfoy.yuzde !== null
      ? { vurgu: `%${portfoy.yuzde}`, ad: `${terim('portfoy')} uyumu`, durum: undefined }
      : { vurgu: undefined, ad: `${terimBas('portfoy')} uyumu henüz ölçülmedi`, durum: undefined };

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`${terimBas('portfoy')} raporu · ${raporZamani}`
            + ` · ${tesisler.length} ${terim('tesis')} × ${surecler.length} süreç`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            {
              deger: portfoy.yuzde === null ? '—' : `%${portfoy.yuzde}`,
              yazi: 'Değerlendirilen uyum',
              durum: portfoy.yuzde === null ? 'unk'
                : portfoy.yuzde >= 90 ? 'ok' : portfoy.yuzde >= 60 ? 'md' : 'bd',
            },
            {
              deger: portfoy.bilinmeyen, yazi: 'Bilinmeyen madde',
              durum: portfoy.bilinmeyen > 0 ? 'md' : undefined,
            },
            { deger: eskiBulgu, yazi: '90+ gün bulgu', durum: eskiBulgu > 0 ? 'bd' : undefined },
            {
              deger: dolmusKanit, yazi: 'Süresi dolmuş kanıt',
              durum: dolmusKanit > 0 ? 'bd' : undefined,
            },
          ]}
        />

        <section className="ab-ekran-govde">
          {/* Karne bu ekranın YAZDIRMA GÖRÜNÜMÜ değil, ayrı bir soruya
              cevap veren paylaşılabilir bir belgedir ("denetime ne
              göstereceğim"). Bağ burada duruyor çünkü kullanıcı o soruyu
              tam bu ekranda soruyor. */}
          <p className="ab-baskida-gizle" style={{ margin: '0 0 var(--s16)' }}>
            <Link href="/raporlar/karne" className="ab-dugme">
              Uyum karnesi · tek sayfa, yazdırılabilir →
            </Link>
          </p>
          {/* ── Modül 1 · tesis × süreç uyum matrisi ─────────────────── */}
          {satirlar.length === 0 ? (
            <div style={{ marginTop: 'var(--s26)' }}>
              <BosIlk
                cumle={kisitliKapsam
                  ? `Yetkinizin kapsamındaki ${terim('tesis', 'cogul')} için tanımlı `
                    + 'uyum süreci yok.'
                  : 'Uyum süreçlerinin kapsamı boş — matris çizilemiyor.'}
                eylem={<Link href="/surecler" className="ab-dugme">Uyum kampanyalarını aç</Link>} />
            </div>
          ) : (
            <div style={{ marginTop: 'var(--s26)' }}>
              <Matris
                kolonBasliklari={surecler.map((s) => ({
                  ad: s.regKod, yol: `/uyum/${encodeURIComponent(s.regKod)}`,
                }))}
                satirlar={satirlar}
                secili={secim?.tesisId ?? null}
                sec={(tesisId, kolon) => setSecim((o) => (
                  o && o.tesisId === tesisId && o.kolon === kolon
                    ? null
                    : { tesisId, kolon }))}
                dipNot={matrisDipNot(tesisler, portfoy.bilinmeyen, kisitliKapsam, sozluk)}
              />
            </div>
          )}

          {/* ── Modül 2 · dağılım · bulgu yaşı / kanıt tazeliği ────────── */}
          <section style={{ marginTop: 'var(--s30)' }}>
            <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
              Dağılım · {acikBulgu} açık bulgu · {kanitlar.length} kanıt
            </p>
            <KipDegistir
              aktif={kip}
              sec={(id) => setKip(id as Kip)}
              secenekler={[
                { id: 'bulgu', ad: `Bulgu yaşı ${acikBulgu}` },
                { id: 'kanit', ad: `Kanıt tazeliği ${kanitlar.length}` },
              ]}
            />
            <div style={{ marginTop: 'var(--s20)' }}>
              {kip === 'bulgu'
                ? <BulguYasi kovalar={kovalar} toplam={acikBulgu} bulgular={bulgular} />
                : <KanitTazeligi kovalar={tazelik} toplam={kanitlar.length}
                    baglantisiz={baglantisizKanit(kanitlar)} esik={kanitEsik} />}
            </div>
          </section>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s16)',
            padding: 'var(--s18) 0 0' }}>
            <p className="ab-dip" style={{ margin: 0, flex: 1, minWidth: 0 }}>
              Anlık rapor · dışa aktarım ekrandaki kapsamı taşır ·{' '}
              {/* Ekran dökümü ile KANIT PAKETİ ayrı şeylerdir: buradaki
                  Excel/PDF ekrandaki satırları taşır, kanıt paketi kökeni,
                  denetim izini ve bütünlük damgasını taşır. */}
              <Link href="/raporlar/kanit-paketi">denetim kanıt paketi</Link>{' · '}
              {/* Denetim FORMU üçüncü bir şeydir: kanıt paketi kökeni ve
                  bütünlük damgasını taşır, form ise denetçinin doldurmayı
                  beklediği kontrol tablosunu — kapsam kararı ve gerekçesiyle. */}
              <Link href="/raporlar/denetim-formlari">denetim formları</Link>
            </p>
            <DisaAktar surecler={surecler} tesisler={tesisler} sozluk={sozluk}
              bulgular={bulgular} kanitlar={kanitlar} />
          </div>
        </section>
      </main>

      {secilen && (
        <HucreCekmecesi
          tesis={secilen.tesis}
          surec={secilen.surec}
          hucre={secilen.hucre}
          bulgular={bulgular}
          kapat={() => setSecim(null)}
        />
      )}
    </>
  );
}

function matrisDipNot(tesisler: Tesis[], bilinmeyen: number, kisitli: boolean,
  sozluk: Sozluk | null): string {
  const kapsamDisi = tesisler.reduce(
    (a, s) => a + s.hucreler.filter((h) => !h.kapsamda).length, 0);
  const parcalar = [`${tesisler.length} ${t(sozluk, 'tesis')} · sütun başlığı çerçeveyi açar`];
  // Boş hücre kapsam dışıdır; bilinmeyenle karıştırılmasın diye ayrı yazılır.
  if (kapsamDisi > 0) parcalar.push(`${kapsamDisi} hücre kapsam dışı (boş)`);
  if (bilinmeyen > 0) parcalar.push(`${bilinmeyen} madde değerlendirilmedi`);
  if (kisitli) parcalar.push('matris yetkinizin kapsamıyla sınırlı');
  return parcalar.join(' · ');
}

/* ── Dağılım tabloları — kart yok, zebra yok; rengi çubuk taşır ─────── */

function DagilimSatiri({ etiket, oran, durum, sag, not }: {
  etiket: string; oran: number; durum: Durum; sag: string; not?: string;
}) {
  return (
    <div className="ab-dagilim" style={{ alignItems: 'center', padding: 'var(--s12) 0',
      borderBottom: 'var(--bw-hair) solid var(--hr)' }}>
      <span style={{ fontSize: 'var(--t-cell)', fontWeight: 600 }}>{etiket}</span>
      <Bar oran={oran} durum={durum} />
      <span style={{ fontFamily: 'var(--veri)', fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
        {not ?? ''}
      </span>
      <span style={{ textAlign: 'right', fontFamily: 'var(--veri)', fontSize: 'var(--t-row)',
        fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {sag}
      </span>
    </div>
  );
}

function BulguYasi({ kovalar, toplam, bulgular }: {
  kovalar: ReturnType<typeof yasKovalari>; toplam: number; bulgular: Bulgu[];
}) {
  if (toplam === 0) {
    return <BosIlk iyiHaber cumle="Açık bulgu yok — yaş dağılımı çizilecek kayıt bulunmuyor." />;
  }
  const enCok = Math.max(1, ...kovalar.map((k) => k.sayi));
  const agirToplam = kovalar.reduce((a, k) => a + k.agir, 0);
  const kapali = bulgular.length - toplam;
  return (
    <>
      <div className="ab-dagilim" style={{ padding: '0 0 var(--s8)',
        borderBottom: 'var(--bw-strong) solid var(--hr2)' }}>
        <span className="kolonbas">Yaş</span>
        <span className="kolonbas">Dağılım</span>
        <span className="kolonbas">Kritik ve yüksek</span>
        <span className="kolonbas" style={{ textAlign: 'right' }}>Bulgu</span>
      </div>
      {kovalar.map((k) => (
        <DagilimSatiri key={k.etiket} etiket={k.etiket} durum={k.durum}
          oran={(k.sayi / enCok) * 100} sag={String(k.sayi)}
          not={`${k.agir} bulgu`} />
      ))}
      <p className="ab-dip">
        90 günü aşan açık bulgu denetimde doğrudan bulguya dönüşür ·
        {` ${agirToplam} açık bulgu kritik ya da yüksek`}
        {kapali > 0 && ` · ${kapali} kapanmış bulgu dağılımın dışında`}
      </p>
    </>
  );
}

function KanitTazeligi({ kovalar, toplam, baglantisiz, esik }: {
  kovalar: ReturnType<typeof tazelikKovalari>; toplam: number; baglantisiz: number; esik: KanitEsik;
}) {
  if (toplam === 0) {
    return (
      <BosIlk cumle="Kanıt kütüğünde kayıt yok — tazelik ölçülemiyor."
        eylem={<Link href="/kanitlar" className="ab-dugme">Kanıt kütüphanesini aç</Link>} />
    );
  }
  const [taze, orta, eski] = kovalar;
  return (
    <>
      <div style={{ marginBottom: 'var(--s18)' }}>
        <Segment ok={taze.sayi} md={orta.sayi} bd={eski.sayi} />
      </div>
      <div className="ab-dagilim" style={{ padding: '0 0 var(--s8)',
        borderBottom: 'var(--bw-strong) solid var(--hr2)' }}>
        <span className="kolonbas">Yaş</span>
        <span className="kolonbas">Dağılım</span>
        <span className="kolonbas">Karşılığı</span>
        <span className="kolonbas" style={{ textAlign: 'right' }}>Kanıt</span>
      </div>
      {kovalar.map((k) => (
        <DagilimSatiri key={k.etiket} etiket={k.etiket} durum={k.durum}
          oran={(k.sayi / toplam) * 100} sag={String(k.sayi)} not={k.aciklama} />
      ))}
      <p className="ab-dip">
        Kanıt {esik.taze} günde yenilenmeli, {esik.dolmus} günü aşan kanıt denetimde kabul edilmez
        {baglantisiz > 0 && ` · ${baglantisiz} kanıt hiçbir maddeye bağlı değil`}
      </p>
    </>
  );
}

/* ── Çekmece · seçili tesis × süreç hücresi ────────────────────────── */

function HucreCekmecesi({ tesis, surec, hucre, bulgular, kapat }: {
  tesis: Tesis;
  surec: Surec;
  hucre: Tesis['hucreler'][number];
  bulgular: Bulgu[];
  kapat: () => void;
}) {
  const d = hucreDurumu(hucre) ?? 'unk';
  const ilgiliBulgu = bulgular.filter(
    (b) => b.tesisKod === tesis.kod && b.regKod === surec.regKod && b.acik);

  const cumle = !hucre.kapsamda
    ? `${tesis.ad} bu sürecin kapsamında değil; hücre boş bırakıldı, sıfır sayılmadı.`
    : hucre.yuzde === null
      ? `${hucre.kapsam} madde tanımlı, hiçbiri değerlendirilmedi — yüzde hesaplanmaz.`
      : `Değerlendirilen ${hucre.degerlendirilen} madde üzerinden %${hucre.yuzde}`
        + (hucre.bilinmeyen > 0 ? ` · ${hucre.bilinmeyen} madde bilinmiyor.` : '.');

  return (
    <Cekmece kod={`${tesis.kod} · ${surec.kod}`} kapat={kapat}>
      <CekmeceKimlik durum={d} soz={hucreSozu(hucre)} baslik={surec.ad} cumle={cumle} />

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s18)' }}>
        <Segment
          ok={hucre.sayilar.uyumlu ?? 0}
          md={hucre.sayilar.kismi ?? 0}
          bd={hucre.sayilar.uyumsuz ?? 0}
          unk={hucre.bilinmeyen}
        />
      </div>

      <CekmeceAlanlar alanlar={[
        {
          etiket: 'Değerlendirilen uyum',
          deger: hucre.yuzde === null ? 'bilinmiyor' : `%${hucre.yuzde}`,
          durum: d,
        },
        {
          etiket: `${DURUM_ETIKET.uyumlu} / ${DURUM_ETIKET.kismi} / ${DURUM_ETIKET.uyumsuz}`,
          deger: `${hucre.sayilar.uyumlu ?? 0} / ${hucre.sayilar.kismi ?? 0} / ${hucre.sayilar.uyumsuz ?? 0}`,
        },
        {
          etiket: 'Bilinmeyen madde',
          deger: hucre.bilinmeyen,
          durum: hucre.bilinmeyen > 0 ? 'md' : undefined,
        },
        {
          etiket: 'Kapsam dışı madde',
          deger: hucre.sayilar.kapsamdisi ?? 0,
        },
      ]} />

      <CekmeceBagli
        baslik={ilgiliBulgu.length > 0 ? `Açık bulgu · ${ilgiliBulgu.length}` : 'Zincir'}
        kayitlar={[
          {
            id: 'cerceve',
            kod: surec.regKod,
            alt: `çerçeve · ${surec.kod}`,
            yol: `/uyum/${encodeURIComponent(surec.regKod)}`,
          },
          ...ilgiliBulgu.slice(0, 3).map((b) => ({
            id: b.id,
            kod: b.baslik,
            alt: `${ONEM_ETIKET[b.onem as keyof typeof ONEM_ETIKET] ?? etiketle(b.onem)} · ${b.yasGun} gün`,
            yol: `/bulgular/${b.id}`,
            suren: b.yasGun > 90,
          })),
        ]}
      />

      <CekmeceEylemler
        dipNot={`${tesis.ad} · ${hucre.kapsam} madde kapsamda`
          + (ilgiliBulgu.length > 3 ? ` · ${ilgiliBulgu.length - 3} açık bulgu daha` : '')
          + ` · eşik %${HEDEF_ESIK} hedef, %${ALT_ESIK} alt sınır`
          + ' · bilinmeyen madde yüzdenin paydasına girmez'}
      />
    </Cekmece>
  );
}

/* ── Dışa aktarım — tabloyu izleyen tek sessiz bağlantı ──────────────── */

/* ── DIŞA AKTARIM BAŞLIKLARI SÖZLÜKTEN GELİR ────────────────────────
   Karar (7 Eyl 2026): ekran "Arıtma tesisi" diyorsa dosya da öyle der.
   `components/disaAktar.ts` ilkeyi zaten yazmıştı — bir ekranın Excel'i
   ile CSV'si farklı sütun kümesi taşırsa okuyan kişi ürünün yalan
   söylediğini düşünür; ekranla dosya arasındaki sözcük farkı da aynı
   şeyi yapar.

   Denetim artefaktı bu karardan ETKİLENMEZ: kanıt paketi
   (`lib/disaAktarim/paket.ts`) etiket değil KOD anahtarı yazar
   (`maddeBasligi`, `baslik`) ve kendi şema sürümünü taşır
   (`PAKET_SEMA_SURUMU`). İçe aktarım da başlık metnine göre eşleşmez —
   sütunları insan eşler (`lib/entegrasyon/varlikAktarim.ts`). */
function DisaAktar({ surecler, tesisler, bulgular, kanitlar, sozluk }: {
  surecler: Surec[]; tesisler: Tesis[]; bulgular: Bulgu[]; kanitlar: Kanit[];
  sozluk: Sozluk | null;
}) {
  const kok = useRef<HTMLDetailsElement | null>(null);

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

  const kapatVe = (e: React.MouseEvent, is: () => void) => {
    e.currentTarget.closest('details')?.removeAttribute('open');
    is();
  };

  /* Bir Excel kitabı üç sayfa taşır; CSV bir TABLODUR ve üç sayfayı tek
     dosyaya yapıştırmak dosyayı okuyan aracı yanıltırdı. Bu yüzden CSV
     menüsü sayfayı ADIYLA sunar ve kullanıcı hangisini indirdiğini bilir. */
  const sayfalar = (): Sayfa[] => [
      {
        ad: 'Uyum matrisi',
        satirlar: [
          ['Süreç', 'Regülasyon', tBas(sozluk, 'tesis'), 'Uyum %', 'Uyumlu', 'Kısmi',
            'Uyumsuz', 'Bilinmeyen', 'Kapsam dışı'],
          ...tesisler.flatMap((t) => t.hucreler.flatMap((h, i) => (h.kapsamda ? [[
            surecler[i].kod, surecler[i].regKod, t.kod,
            h.yuzde ?? '', h.sayilar.uyumlu ?? 0, h.sayilar.kismi ?? 0,
            h.sayilar.uyumsuz ?? 0, h.bilinmeyen, h.sayilar.kapsamdisi ?? 0,
          ]] : []))),
        ],
      },
      {
        ad: 'Bulgular',
        satirlar: [
          ['Bulgu', 'Durum', 'Önem', tBas(sozluk, 'tesis'), 'Regülasyon', 'Yaş (gün)'],
          ...bulgular.map((b) => [
            b.baslik, etiketle(b.durum), etiketle(b.onem), b.tesisKod, b.regKod, b.yasGun,
          ]),
        ],
      },
      {
        ad: 'Kanıtlar',
        satirlar: [
          ['Kanıt', 'Tip', 'Yaş (gün)', 'Bağlantı sayısı'],
          ...kanitlar.map((k) => [k.ad, etiketle(k.tip), k.gun, k.baglanti]),
        ],
      },
  ];

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
          onClick={(e) => kapatVe(e, () =>
            exceleAktar(damgaliAd('uyum-raporu', an(), 'xlsx'), sayfalar()))}>
          Excel (3 sayfa)
        </button>
        {sayfalar().map((sf) => (
          <button key={sf.ad} type="button" className="ab-filtre"
            style={{ display: 'block', width: '100%', textAlign: 'left' }}
            onClick={(e) => kapatVe(e, () =>
              csvAktar(damgaliAd(`uyum-raporu-${sf.ad}`, an(), 'csv'), sf))}>
            CSV · {sf.ad}
          </button>
        ))}
        <button type="button" className="ab-filtre"
          style={{ display: 'block', width: '100%', textAlign: 'left' }}
          onClick={(e) => kapatVe(e, pdfYazdir)}>
          PDF
        </button>
      </div>
    </details>
  );
}
