'use client';
import { useMemo, useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import Link from 'next/link';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { VARLIK_SINIF_ETIKET, etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import { IliskiEditoru, VarlikFormu, YasamFormu } from './Formlar';
import { VeriTablosu, type VtKolon, type VtSira } from '@/components/kabuk/tablo';
import {
  ILISKI_CUMLE, KRITIKLIKLER, MERCEKLER, MERCEK_TASMA, YASAM_ETIKET,
  ayYil, bilinmeyenAlanlar, bolumle, karariBloklayanBilinmeyen,
  korumaAcigi, kullanimda, kuyrukMetni, metrikleriHesapla, olgu, omurGunu,
  sirala, suz, varlikDurumu,
  type Bolge, type Kisi, type Kodlu, type Mercek, type Tur, type Unite, type V,
} from './mantik';

/* ═══════════════════════════════════════════════════════════════════════
   VARLIK ZİHNİ — A · INDUSTRIAL PRECISION

   Görsel source of truth: `a-assets.html`
   (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §1).

   Prototipin grameri: 42px kip çubuğu (VARLIK ZİHNİ + İLİŞKİ/TABLO
   ikilisi + zincir künyesi), altında ya 534px ZİNCİR TUVALİ ya tablo,
   sağda 400px düğüm paneli, en altta 30px envanter kaynağı ayağı.

   ── PROTOTİPİN OMURGASI, EKRANIN YENİ SORUSU ──────────────────────────
   Eski ekran ilişki grafiğini "varlık ↔ ağ bölgesi ↔ sistem" olarak
   çiziyordu: teknik bir yerleşim şeması. Prototip YEDİ HALKALI bir
   YÖNETİŞİM zinciri çiziyor —
     SANTRAL → SİSTEM → VARLIK → ZAFİYET → RİSK → KONTROL → PROJE
   — yani "bu kutu hangi regülasyon maddesini kırıyor ve kim düzeltiyor".
   Zincirin son üç halkası veride vardı ama bu ekranda HİÇ GÖRÜNMÜYORDU.

   ── PROTOTİPTEN AYRILAN, KASITLI ──────────────────────────────────────
   · Prototipte düğümler sabit koordinatlarda; burada halka başına sütun
     ve satır sırası VERİDEN gelir, düğüm sayısı da öyle. Sabit yerleşim
     dört düğümden fazlasını taşıyamazdı.
   · "CMDB SENKRON 04:12 · BAŞARILI" künyesi UYDURULMADI: ayak, gerçek
     keşif kayıtlarının KAYNAKLARINI ve son görülme zamanını yazar;
     kayıt yoksa "bağlı kaynak yok" der (harita §7 kusur 8).
   · Kademeli açılımda sönümlenen düğüm `opacity` ile birlikte
     `aria-hidden` ALMAZ ve odaklanabilir kalır: sönümleme bir görsel
     sıralama, erişim kısıtı değil (kusur 4).
   · Yazma yolları (kayıt · ilişki · yaşam döngüsü) prototipte yok; 400px
     panel sekmelerle onları taşır — ekran salt okunur olamaz.

   İŞ MANTIĞI DEĞİŞMEDİ: mercekler, süzme/sıralama/bölümleme, kapsam,
   satır satır yazma yetkisi ve form eylemleri `mantik.ts` ile
   `Formlar.tsx`ten olduğu gibi gelir.
   ═══════════════════════════════════════════════════════════════════════ */

type Kip = 'zincir' | 'tablo';
type PanelKipi = 'ozet' | 'form' | 'iliski' | 'yasam';

/** Zincirin halkaları — prototipin sütun başlıkları. */
const HALKALAR = [
  'Santral', 'Sistem / servis', 'Varlık', 'Zafiyet', 'Risk', 'Kontrol', 'Proje / CAPA',
] as const;

type Dugum = {
  id: string; ad: string; alt: string; durum: string;
  yol?: string; secilebilir?: boolean;
};

export default function EnvanterIstemci({
  varliklar, turler, tesisler, uniteler, sistemler, bolgeler, kullanicilar,
  yazabilir, simdi, baslangicArama = '',
}: {
  varliklar: V[]; turler: Tur[]; tesisler: Kodlu[]; uniteler: Unite[];
  sistemler: Kodlu[]; bolgeler: Bolge[]; kullanicilar: Kisi[];
  yazabilir: boolean; simdi: number;
  /** `?bolge=KOD` bağından gelen başlangıç arama metni (topoloji çekmecesi). */
  baslangicArama?: string;
}) {
  const [kip, setKip] = useUrlDurumu<Kip>('kip', 'zincir');
  const [mercek, setMercek] = useUrlDurumu<Mercek>('mercek', 'sinyal');
  const [tesisF, setTesisF] = useUrlDurumuBos('tesis');
  const [turF, setTurF] = useUrlDurumuBos('tur');
  const [kritiklikF, setKritiklikF] = useState<string | null>(null);
  const [arama, setArama] = useState(baslangicArama);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [seciliId, setSeciliId] = useUrlDurumuBos('sec');
  const [panelKipi, setPanelKipi] = useState<PanelKipi>('ozet');
  const [yeniAcik, setYeniAcik] = useState(false);

  const m = useMemo(() => metrikleriHesapla(varliklar, simdi), [varliklar, simdi]);

  const suzulmus = useMemo(
    () => suz(varliklar, {
      mercek, tesisId: tesisF, turKapsami: turF, kritiklik: kritiklikF, arama,
    }, simdi),
    [varliklar, mercek, tesisF, turF, kritiklikF, arama, simdi],
  );
  const sirali = useMemo(() => sirala(suzulmus, simdi), [suzulmus, simdi]);
  const { gorunur, toplanan } = useMemo(
    () => bolumle(sirali, simdi, kuyrukAcik), [sirali, simdi, kuyrukAcik],
  );

  const secili = varliklar.find((v) => v.id === seciliId) ?? null;
  const filtreAktif = mercek !== 'sinyal' || tesisF !== null || turF !== null
    || kritiklikF !== null || arama.trim() !== '';

  function sec(id: string | null) {
    setSeciliId(id); setPanelKipi('ozet'); setYeniAcik(false);
  }
  function filtreleriTemizle() {
    setMercek('sinyal'); setTesisF(null); setTurF(null);
    setKritiklikF(null); setArama('');
  }

  /* ── Zincir: yedi halka, seçili varlıktan türetilir ─────────────── */
  const zincir = useMemo(
    () => zinciriKur(sirali, secili, tesisler, sistemler, simdi),
    [sirali, secili, tesisler, sistemler, simdi],
  );

  /* Envanter kaynağı UYDURULMAZ: gerçek keşif kayıtlarının kaynakları. */
  const kaynaklar = useMemo(() => {
    const harita = new Map<string, string>();
    for (const v of varliklar) {
      if (!v.sonKesif) continue;
      const onceki = harita.get(v.sonKesif.kaynak);
      if (!onceki || v.sonKesif.sonGorulme > onceki) {
        harita.set(v.sonKesif.kaynak, v.sonKesif.sonGorulme);
      }
    }
    return [...harita.entries()].sort((a, b) => b[1].localeCompare(a[1]));
  }, [varliklar]);

  const sahipsiz = varliklar.filter((v) => kullanimda(v) && !v.sahip).length;
  const santralsiz = varliklar.filter((v) => kullanimda(v) && !v.tesis).length;
  const kaynakCumlesi = kaynaklar.length === 0
    ? 'Kaynak: bağlı kaynak yok — kayıtlar elle girildi'
    : `Kaynak: ${kaynaklar.map(([k]) => k).join(' · ')} · son görülme ${zamanTR(kaynaklar[0][1])}`;

  /* Tablo sıralaması yalnız GÖRÜNÜMDÜR: süzgeç ve mercek mantığına
     dokunmaz, dışa aktarım `sirali` dizisini kullanmayı sürdürür. */
  const [tabloSira, setTabloSira] = useState<VtSira | null>(null);

  return (
    <main className="ab-a-ekran">
      {/* ── 42px kip çubuğu ──────────────────────────────────────────── */}
      <div className="ab-a-kip">
        {/* `h1`: görsel olarak aynı, semantik olarak sayfanın adı. */}
        <h1 className="ad">Varlık zihni</h1>
        <div className="ikili" role="group" aria-label="Görünüm">
          <button type="button" aria-pressed={kip === 'zincir'}
            onClick={() => setKip('zincir')}>İlişki görünümü</button>
          <button type="button" aria-pressed={kip === 'tablo'}
            onClick={() => setKip('tablo')}>Tablo görünümü</button>
        </div>
        {/* Künye: envanter KAYNAĞI. Eskiden 30px'lik ayrı bir ayakta
            yaşıyordu (`.ab-a-envayak`); Eylül 2026 denetimi onu kabuğun
            sistem durumu satırıyla çift ayak olarak ölçtü. Zincir dizisi
            burada yazılmaz — tuvalin sütun başlıkları zaten o sırayı verir. */}
        {/* Sayaç süzgeç şeridinden buraya: şerit 1366px'te iki satıra
            kırılıyordu (ölçüldü: 90px), tuval 224px'te başlıyordu. */}
        <span className="mono sayac" aria-live="polite">
          {suzulmus.length} / {m.kullanimdaki} varlık
          {m.bilinmeyen > 0 && ` · ${m.bilinmeyen} ölçülmemiş`}
          {sahipsiz > 0 && ` · ${sahipsiz} sahipsiz`}
          {santralsiz > 0 && ` · ${santralsiz} santralsiz`}
          {m.emekli > 0 && ` · ${m.emekli} emekli`}
        </span>
        <span className="mono kunye" title={kaynakCumlesi}>
          {kaynakCumlesi}
        </span>
        <span className={`mono aktif${secili ? ' var' : ''}`}>
          {secili ? '1 aktif zincir' : 'zincir seçilmedi'}
        </span>
      </div>

      {/* ── Süzgeç şeridi ────────────────────────────────────────────── */}
      <div className="ab-a-suzgec">
        <div className="mercekler" role="group" aria-label="Mercek">
          {[...MERCEKLER, ...MERCEK_TASMA].map((o) => (
            <button key={o.id} type="button" aria-pressed={mercek === o.id}
              onClick={() => { setMercek(o.id); setKuyrukAcik(false); }}>
              {o.ad}
            </button>
          ))}
        </div>
        <input className="ab-a-ara" type="search" value={arama} placeholder="Etiket, ad, IP, seri no"
          aria-label="Varlık ara"
          onChange={(e) => { setArama(e.target.value); setKuyrukAcik(false); }} />
        <Sec etiket="Santral" aktif={tesisF} sec={setTesisF}
          secenekler={tesisler.map((t) => ({ id: t.id, ad: t.ad }))} />
        <Sec etiket="Tür" aktif={turF} sec={setTurF}
          secenekler={[
            ...Object.entries(VARLIK_SINIF_ETIKET).map(([kod, ad]) => ({ id: `s:${kod}`, ad })),
            ...turler.map((t) => ({ id: `t:${t.id}`, ad: t.ad })),
          ]} />
        <Sec etiket="Kritiklik" aktif={kritiklikF} sec={setKritiklikF}
          secenekler={KRITIKLIKLER.map((x) => ({ id: x, ad: etiketle(x) }))} />
        {filtreAktif && (
          <button type="button" className="ab-dugme" onClick={filtreleriTemizle}>
            Süzgeci temizle
          </button>
        )}
        {yazabilir && (
          <button type="button" className="ab-dugme birincil"
            onClick={() => { setYeniAcik(true); setSeciliId(null); }}>
            + Yeni varlık
          </button>
        )}
      </div>

      {/* ── Gövde: tuval/tablo + 400px panel ─────────────────────────── */}
      <div className="ab-a-calisma">
        <div className="ab-a-tuval">
          {suzulmus.length === 0 ? (
            <p className="bos">
              {filtreAktif
                ? 'Bu süzgeçte varlık yok.'
                : varliklar.length === 0
                  ? 'Kapsamınızda varlık kaydı yok.'
                  : 'Sinyal merceğinde varlık yok — bilinen açık ve geçmiş ömür yok.'}
            </p>
          ) : kip === 'zincir' ? (
            <Zincir zincir={zincir} secili={secili} sec={sec} />
          ) : (
            <>
              <VarlikTablosu satirlar={gorunur} secili={seciliId} sec={sec} simdi={simdi}
                sira={tabloSira} siraDegistir={setTabloSira} />
              <div className="ab-a-tabloayak">
                <p className="mono">
                  {gorunur.length} satır · {suzulmus.length} mercekte
                  {m.bilinmeyen > 0 && ` · ${m.bilinmeyen} varlıkta ömür/kritiklik girilmedi`}
                  {m.emekli > 0 && mercek !== 'emekli' && ` · ${m.emekli} emekli kayıt gizli`}
                </p>
                {toplanan.length > 0 && !kuyrukAcik && (
                  <button type="button" className="ab-dugme" onClick={() => setKuyrukAcik(true)}>
                    {kuyrukMetni(toplanan, simdi)}
                  </button>
                )}
                <DisaAktar varliklar={sirali} simdi={simdi} />
              </div>
            </>
          )}
        </div>

        <aside className="ab-a-panel" aria-label="Seçili düğüm">
          {yeniAcik && !secili ? (
            <>
              <header>
                <span className="etiket vurgu">Yeni varlık</span>
                <button type="button" className="ab-dugme" onClick={() => setYeniAcik(false)}>
                  Kapat
                </button>
              </header>
              <div className="govde">
                <VarlikFormu varlik={null} turler={turler} tesisler={tesisler}
                  uniteler={uniteler} sistemler={sistemler} bolgeler={bolgeler}
                  kullanicilar={kullanicilar} kapat={() => setYeniAcik(false)} />
              </div>
            </>
          ) : !secili ? (
            <>
              <header>
                <span className="etiket vurgu">Seçili düğüm</span>
                <span className="mono etiket">yok</span>
              </header>
              <div className="govde">
                <p className="bos">
                  Zincirde ya da tabloda bir varlık seçin; yedi halka o varlıktan geçen
                  yolu gösterir.
                </p>
              </div>
            </>
          ) : (
            <>
              <header>
                <span className="etiket vurgu">Seçili düğüm</span>
                <span className="mono etiket">varlık katmanı</span>
                <button type="button" className="ab-dugme sag" onClick={() => sec(null)}>
                  Kapat
                </button>
              </header>
              <nav className="sekmeler" aria-label="Düğüm paneli">
                {([
                  ['ozet', 'Özet'],
                  ['form', 'Kayıt'],
                  ['iliski', 'İlişki'],
                  ['yasam', 'Yaşam'],
                ] as [PanelKipi, string][]).map(([id, ad]) => (
                  <button key={id} type="button" aria-pressed={panelKipi === id}
                    onClick={() => setPanelKipi(id)}>{ad}</button>
                ))}
              </nav>
              <div className="govde">
                {panelKipi === 'ozet' && <Ozet v={secili} simdi={simdi} />}
                {panelKipi === 'form' && (
                  <VarlikFormu varlik={secili} turler={turler} tesisler={tesisler}
                    uniteler={uniteler} sistemler={sistemler} bolgeler={bolgeler}
                    kullanicilar={kullanicilar} kapat={() => setPanelKipi('ozet')} />
                )}
                {panelKipi === 'iliski' && (
                  <IliskiEditoru varlik={secili} varliklar={varliklar}
                    sec={(id) => sec(id)} kapat={() => setPanelKipi('ozet')} />
                )}
                {panelKipi === 'yasam' && (
                  <YasamFormu varlik={secili} kapat={() => setPanelKipi('ozet')} />
                )}
              </div>
            </>
          )}
        </aside>
      </div>

    </main>
  );
}

/* ── Zincir kurucusu ──────────────────────────────────────────────────
   Halkalar seçili varlıktan türer. Seçim yoksa ilk üç halka süzülmüş
   kümeden dolar ve son dördü BOŞ kalır — sahte bir zincir çizilmez. */
function zinciriKur(
  sirali: V[], secili: V | null, tesisler: Kodlu[], sistemler: Kodlu[], simdi: number,
): Dugum[][] {
  const say = (fn: (v: V) => boolean) => sirali.filter(fn).length;

  const santraller: Dugum[] = tesisler
    .filter((t) => sirali.some((v) => v.tesis?.id === t.id))
    .sort((a, b) => say((v) => v.tesis?.id === b.id) - say((v) => v.tesis?.id === a.id))
    .map((t) => ({
      id: `t-${t.id}`, ad: t.ad, alt: `${say((v) => v.tesis?.id === t.id)} varlık`,
      durum: secili?.tesis?.id === t.id ? 'on' : 'dim',
    }));
  if (sirali.some((v) => !v.tesis)) {
    santraller.push({
      id: 't-yok', ad: 'Santrali girilmemiş',
      alt: `${say((v) => !v.tesis)} varlık`,
      durum: secili && !secili.tesis ? 'on' : 'dim',
    });
  }

  const santralId = secili?.tesis?.id ?? null;
  const kapsam = santralId ? sirali.filter((v) => v.tesis?.id === santralId) : sirali;

  const sistemDugumleri: Dugum[] = sistemler
    .filter((sx) => kapsam.some((v) => v.sistem?.id === sx.id))
    .map((sx) => ({
      id: `d-${sx.id}`, ad: sx.ad, alt: `${sx.kod} · ${kapsam.filter((v) => v.sistem?.id === sx.id).length} varlık`,
      durum: secili?.sistem?.id === sx.id ? 'on' : 'dim',
    }));
  if (kapsam.some((v) => !v.sistem)) {
    sistemDugumleri.push({
      id: 's-yok', ad: 'Sisteme bağlanmamış',
      alt: `${kapsam.filter((v) => !v.sistem).length} varlık`,
      durum: secili && !secili.sistem ? 'on' : 'dim',
    });
  }

  const sistemId = secili?.sistem?.id ?? null;
  const varlikKumesi = secili
    ? kapsam.filter((v) => (sistemId ? v.sistem?.id === sistemId : !v.sistem))
    : kapsam;
  const varlikDugumleri: Dugum[] = varlikKumesi.slice(0, ZINCIR_TAVANI).map((v) => ({
    id: `v-${v.id}`, ad: v.ad,
    alt: `${v.etiket}${v.ipAdresi ? ` · ${v.ipAdresi}` : ''}`,
    durum: secili?.id === v.id ? 'on' : 'dim',
    secilebilir: true,
  }));

  if (!secili) return [santraller, sistemDugumleri, varlikDugumleri, [], [], [], []].map(kirp);

  const zafiyetler: Dugum[] = secili.zafiyetler.slice(0, ZINCIR_TAVANI).map((z) => ({
    id: `z-${z.id}`, ad: z.baslik,
    alt: [z.ref, z.cvss !== null ? `CVSS ${z.cvss.toString().replace('.', ',')}` : null]
      .filter(Boolean).join(' · ') || 'referanssız kayıt',
    durum: z.cvss !== null && z.cvss >= 7 ? 'on-bd' : 'on',
  }));

  const riskler: Dugum[] = secili.riskler.map((r) => ({
    id: `r-${r.id}`, ad: r.baslik, yol: `/riskler/${r.id}`,
    alt: `${r.kod} · ${r.artikRisk === null ? 'artık risk ölçülmedi' : `artık risk ${r.artikRisk}`}`,
    durum: r.artikRisk !== null && r.artikRisk >= 15 ? 'on-bd' : 'on',
  }));

  const kontroller: Dugum[] = secili.riskler
    .map((r) => r.kontrol)
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .filter((x, i, d) => d.findIndex((y) => y.kod === x.kod) === i)
    .map((x) => ({
      id: `k-${x.kod}`, ad: x.baslik, alt: `${x.kod} · ${etiketle(x.durum)}`,
      durum: x.durum === 'uyumsuz' ? 'on-bd' : 'on', yol: '/uyum',
    }));

  const projeler: Dugum[] = secili.projeler.map((pr) => ({
    id: `p-${pr.id}`, ad: pr.ad, alt: `${pr.kod} · ${etiketle(pr.durum)}`,
    durum: 'on', yol: '/projeler',
  }));

  /* Ömür halkası prototipte yok ama zincirin gerçek bir kırılma noktası:
     desteği bitmiş varlık kontrolü kendi başına düşürür. */
  const gun = omurGunu(secili, simdi);
  if (gun !== null && gun < 0 && secili.eosTarihi) {
    zafiyetler.push({
      id: 'z-omur', ad: 'Üretici desteği bitti',
      alt: `EOS ${ayYil(secili.eosTarihi)} · ${Math.abs(gun)} gün`,
      durum: 'on-bd', yol: '/omur',
    });
  }

  return [santraller, sistemDugumleri, varlikDugumleri, zafiyetler, riskler, kontroller, projeler]
    .map(kirp);
}

/** Halkayı tavana indirir ve KESİLENİ SÖYLER — sessiz kırpma yalan olurdu. */
function kirp(halka: Dugum[]): Dugum[] {
  if (halka.length <= ZINCIR_TAVANI) return halka;
  const secili = halka.filter((d) => d.durum.startsWith('on'));
  const kalan = halka.filter((d) => !d.durum.startsWith('on'));
  const gorunur = [...secili, ...kalan].slice(0, ZINCIR_TAVANI);
  return [
    ...gorunur,
    {
      id: 'kirpik', ad: `+${halka.length - gorunur.length} kayıt daha`,
      alt: 'süzgeçle daralt', durum: 'kirpik',
    },
  ];
}

/** Bir halkada çizilen en fazla düğüm; kalanı sayıyla söylenir. */
const ZINCIR_TAVANI = 8;

function Zincir({ zincir, secili, sec }: {
  zincir: Dugum[][]; secili: V | null; sec: (id: string | null) => void;
}) {
  return (
    <div className="ab-zincir">
      <div className="basliklar">
        {HALKALAR.map((h) => <span key={h} className="kolonbas">{h}</span>)}
      </div>
      <div className="sutunlar">
        {zincir.map((halka, i) => (
          <div key={HALKALAR[i]} className="sutun">
            {halka.length === 0 ? (
              <span className="bos">
                {secili ? 'bağlı kayıt yok' : 'varlık seçin'}
              </span>
            ) : halka.map((d) => {
              const govde = (
                <>
                  <span className="ad">{d.ad}</span>
                  <span className="mono alt">{d.alt}</span>
                </>
              );
              if (d.secilebilir) {
                return (
                  <button key={d.id} type="button" className={`dugum ${d.durum}`}
                    aria-pressed={d.durum.startsWith('on')}
                    onClick={() => sec(d.id.slice(2) === secili?.id ? null : d.id.slice(2))}>
                    {govde}
                  </button>
                );
              }
              if (d.yol) {
                return (
                  <Link key={d.id} href={d.yol} className={`dugum ${d.durum}`}>{govde}</Link>
                );
              }
              return <span key={d.id} className={`dugum ${d.durum}`}>{govde}</span>;
            })}
          </div>
        ))}
      </div>
      <p className="mono dip">
        Kademeli açılım: bir varlığa tıkla → sağdaki halkalar o varlığın zincirini gösterir.
        {' '}Görünen {zincir.reduce((a, h) => a + h.length, 0)} düğüm.
      </p>
    </div>
  );
}

/* ── Tablo ────────────────────────────────────────────────────────────
   Semantik kütük (`VeriTablosu`): gerçek `<table>`, yapışkan başlık ve
   kod sütunu, `aria-sort`, ok tuşuyla dolaşım. Görsel gramer aynı:
   sol kenar durum çubuğu, mono kod, olgu alt satırı ("yamasız", "yedek
   yok"). Sıralanabilir sütunlar: etiket, varlık, tür, santral, zafiyet,
   destek sonu. Bilinmeyen tarih/sayı SONA gider, sıfır sayılmaz. */
const sonaAt = <T,>(a: T | null | undefined, b: T | null | undefined, kiyas: (x: T, y: T) => number) =>
  a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : kiyas(a, b);
const tr = (a: string, b: string) => a.localeCompare(b, 'tr');

function VarlikTablosu({ satirlar, secili, sec, simdi, sira, siraDegistir }: {
  satirlar: V[]; secili: string | null; sec: (id: string | null) => void; simdi: number;
  sira: VtSira | null; siraDegistir: (s: VtSira | null) => void;
}) {
  const kolonlar: VtKolon<V>[] = [
    { anahtar: 'etiket', baslik: 'Etiket', genislik: '168px',
      sirala: (a, b) => tr(a.etiket, b.etiket),
      hucre: (v) => <span className="mono kod">{v.etiket}</span> },
    { anahtar: 'ad', baslik: 'Varlık',
      sirala: (a, b) => tr(a.ad, b.ad),
      hucre: (v) => {
        const o = olgu(v, simdi);
        return <span className="konu">{v.ad}{o && <span className="alt">{o}</span>}</span>;
      } },
    { anahtar: 'tur', baslik: 'Tür', genislik: '120px', ikincil: true,
      sirala: (a, b) => tr(a.tur.ad, b.tur.ad),
      hucre: (v) => <span className="mono ikincil">{v.tur.ad}</span> },
    { anahtar: 'tesis', baslik: 'Santral', genislik: '140px',
      sirala: (a, b) => sonaAt(a.tesis?.ad, b.tesis?.ad, tr),
      hucre: (v) => <span className="ikincil">{v.tesis?.ad ?? '—'}</span> },
    { anahtar: 'bolge', baslik: 'Ağ bölgesi', genislik: '124px', ikincil: true,
      hucre: (v) => <span className="mono ikincil">{v.bolge?.kod ?? '—'}</span> },
    { anahtar: 'zafiyet', baslik: 'Zafiyet', genislik: '84px', sag: true, ad: 'Açık zafiyet sayısı',
      sirala: (a, b) => a.acikZafiyet - b.acikZafiyet,
      hucre: (v) => <span className={`mono${v.acikZafiyet > 0 ? ' vurgu' : ''}`}>{v.acikZafiyet}</span> },
    { anahtar: 'eos', baslik: 'Destek sonu', genislik: '104px', sag: true,
      sirala: (a, b) => sonaAt(a.eosTarihi, b.eosTarihi, (x, y) => String(x).localeCompare(String(y))),
      hucre: (v) => {
        const gun = omurGunu(v, simdi);
        const sinif = gun !== null && gun < 0 ? ' vurgu' : gun !== null && gun < 365 ? ' uyari' : '';
        return <span className={`mono${sinif}`}>{v.eosTarihi ? ayYil(v.eosTarihi) : '—'}</span>;
      } },
  ];
  return (
    <VeriTablosu<V>
      etiket="Varlık kütüğü"
      kolonlar={kolonlar}
      satirlar={satirlar}
      secili={secili}
      sec={sec}
      durum={(v) => varlikDurumu(v, simdi)}
      sira={sira}
      siraDegistir={siraDegistir}
      yukseklik="calc(100dvh - 56px - 36px - 42px - 56px - 120px)"
    />
  );
}

/* ── Panel özeti ──────────────────────────────────────────────────── */

function durumSozu(v: V, simdi: number): string {
  const gun = omurGunu(v, simdi);
  if (gun !== null && gun < 0) return 'Desteksiz';
  if (v.yamaDurumu === 'yamasiz') return 'Yamasız';
  if (gun !== null && gun < 365) return 'Ömür sonu yakın';
  if (korumaAcigi(v).length > 0) return 'Koruma açığı';
  if (karariBloklayanBilinmeyen(v)) return 'Ömür/kritiklik girilmedi';
  return 'Kaydı tam';
}

function kimlikCumlesi(v: V, simdi: number): string {
  const gun = omurGunu(v, simdi);
  if (gun !== null && gun < 0 && v.eosTarihi) {
    return `Üretici desteği ${tarihTR(v.eosTarihi)} tarihinde bitti; `
      + `${Math.abs(gun)} gündür desteksiz çalışıyor.`;
  }
  const acik = korumaAcigi(v);
  if (acik.length > 0) return `Bilinen açık: ${acik.join(', ')}.`;
  if (gun !== null && gun < 365 && v.eosTarihi) {
    return `Üretici desteği ${tarihTR(v.eosTarihi)} tarihinde bitiyor · ${gun} gün kaldı.`;
  }
  const bilinmeyen = bilinmeyenAlanlar(v);
  if (bilinmeyen.length > 0) return `Girilmemiş alan: ${bilinmeyen.join(', ')}.`;
  return `${v.tur.ad} · ${etiketle(v.tur.sinif)}.`;
}

function korumaMetni(v: V): string {
  const parcalar = korumaAcigi(v);
  if (v.acikZafiyet > 0) parcalar.push(`${v.acikZafiyet} açık zafiyet`);
  if (parcalar.length > 0) return parcalar.join(' · ');
  const olculmemis = bilinmeyenAlanlar(v)
    .filter((a) => a !== 'kritiklik' && a !== 'EOS tarihi');
  if (olculmemis.length > 0) return `${olculmemis.length} alan ölçülmedi`;
  return 'bilinen açık yok';
}

function Ozet({ v, simdi }: { v: V; simdi: number }) {
  const d = varlikDurumu(v, simdi);
  const gun = omurGunu(v, simdi);
  const bilinmeyen = bilinmeyenAlanlar(v);
  const konum = [v.tesis?.ad, v.unite?.kod, v.bolge?.kod].filter(Boolean).join(' · ') || '—';

  const kimlik: [string, string | null][] = [
    ['Hostname', v.hostname], ['IP', v.ipAdresi], ['MAC', v.macAdresi],
    ['İşletim sistemi', v.isletimSistemi], ['Firmware', v.firmware],
    ['Sürüm', v.surum], ['Üretici', v.uretici], ['Model', v.model],
    ['Seri no', v.seriNo], ['Raf / oda', v.rafOda],
    ['Kimlik doğrulama', v.kimlikDogrulama],
  ];
  const dolu = kimlik.filter((x): x is [string, string] => !!x[1]);
  const ilkIliski = v.iliskiler[0];

  return (
    <>
      <div className="kimlik">
        <span className={`ab-glif g-${GLIF[d] ?? 'yok'}`} aria-hidden />
        <span className="mono soz">{durumSozu(v, simdi)}</span>
        <h2>{v.ad}</h2>
        <p className="mono kod">{v.etiket} · {v.tur.ad}</p>
        <p className="cumle">{kimlikCumlesi(v, simdi)}</p>
      </div>

      <dl className="ciftler">
        <Cift ad="Kritiklik" deger={etiketle(v.kritiklik)}
          bilinmeyen={v.kritiklik === 'bilinmiyor'} />
        <Cift ad="Ömür sonu (EOS)" deger={v.eosTarihi ? tarihTR(v.eosTarihi) : 'girilmedi'}
          bilinmeyen={gun === null} vurgu={gun !== null && gun < 0} />
        <Cift ad="Konum" deger={konum} />
        <Cift ad="Koruma" deger={korumaMetni(v)} vurgu={korumaAcigi(v).length > 0} />
        <Cift ad="Sahip" deger={v.sahip?.ad ?? 'atanmadı'} bilinmeyen={!v.sahip} />
        <Cift ad="İlişki" deger={ilkIliski
          ? `${v.iliskiler.length} bağ · ${ILISKI_CUMLE[ilkIliski.tip] ?? etiketle(ilkIliski.tip)}`
            + ` ${ilkIliski.diger.etiket}`
          : 'bağ tanımlı değil'} />
      </dl>

      {dolu.length > 0 && (
        <>
          <p className="etiket blokbas">Kimlik alanları</p>
          <dl className="ciftler">
            {dolu.map(([ad, deger]) => <Cift key={ad} ad={ad} deger={deger} mono />)}
          </dl>
        </>
      )}

      {(v.zafiyetler.length > 0 || v.riskler.length > 0) && (
        <>
          <p className="etiket blokbas">
            Açık zafiyet · {v.zafiyetler.length}
          </p>
          {v.zafiyetler.map((z) => (
            <div key={z.id} className="zafiyet">
              <span className={`mono skor${z.cvss !== null && z.cvss >= 7 ? ' vurgu' : ''}`}>
                {z.cvss === null ? '—' : z.cvss.toString().replace('.', ',')}
              </span>
              <span className="konu">{z.ref ?? z.baslik}</span>
              <span className="mono son">
                {z.sonTarih ? tarihTR(z.sonTarih) : 'son tarih yok'}
              </span>
            </div>
          ))}
          {v.zafiyetler.length === 0 && (
            <p className="bos">Açık zafiyet kaydı yok.</p>
          )}
        </>
      )}

      <p className="etiket blokbas">Yönetişim izi</p>
      <div className="mono iz">
        {v.riskler.length === 0 && v.projeler.length === 0 ? (
          <p className="bos">Bu varlık bir risk ya da projeye bağlı değil.</p>
        ) : (
          <>
            {v.riskler.map((r) => (
              <div key={r.id}>
                <span className="tur">Risk</span>
                <Link href={`/riskler/${r.id}`}>{r.kod}</Link>
                {r.kontrol && (
                  <> → <span className="tur">Kontrol</span> {r.kontrol.kod}{' '}
                    <span className={r.kontrol.durum === 'uyumsuz' ? 'kirmizi' : undefined}>
                      {etiketle(r.kontrol.durum)}
                    </span>
                  </>
                )}
              </div>
            ))}
            {v.projeler.map((pr) => (
              <div key={pr.id}>
                <span className="tur">Proje</span>
                <Link href="/projeler">{pr.kod}</Link> · {etiketle(pr.durum)}
              </div>
            ))}
          </>
        )}
      </div>

      <p className="mono dipnot">
        {[
          `${YASAM_ETIKET[v.yasamDongusu] ?? etiketle(v.yasamDongusu)} · `
            + `son güncelleme ${tarihTR(v.guncellendi)}`,
          v.sonYedek ? `son yedek ${zamanTR(v.sonYedek.zaman)}` : 'yedek kaydı yok',
          v.sonKesif ? `${v.sonKesif.kaynak} · ${tarihTR(v.sonKesif.sonGorulme)}` : null,
          v.tedarikci ? `tedarikçi ${v.tedarikci.ad}` : null,
          bilinmeyen.length > 0 ? `${bilinmeyen.length} alan bilinmiyor` : null,
          !kullanimda(v) ? 'kayıt silinmedi, yaşam döngüsü kapandı' : null,
          !v.yazilabilir ? 'bu santralde yazma yetkiniz yok' : null,
        ].filter(Boolean).join(' · ')}
      </p>
    </>
  );
}

const GLIF: Record<string, string> = {
  ok: 'uygun', md: 'kismi', bd: 'uygunsuz', unk: 'yok', pl: 'yok', tamam: 'uygun',
};

function Cift({ ad, deger, mono, vurgu, bilinmeyen }: {
  ad: string; deger: string; mono?: boolean; vurgu?: boolean; bilinmeyen?: boolean;
}) {
  return (
    <div>
      <dt>{ad}</dt>
      <dd className={[mono && 'mono', vurgu && 'vurgu', bilinmeyen && 'unk']
        .filter(Boolean).join(' ')}>{deger}</dd>
    </div>
  );
}

/* ── Süzgeç açılırı ─────────────────────────────────────────────────── */
function Sec({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  return (
    <label className="ab-a-sec">
      <span className="etiket">{etiket}</span>
      <select value={aktif ?? ''} onChange={(e) => sec(e.target.value || null)}>
        <option value="">tümü</option>
        {secenekler.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
      </select>
    </label>
  );
}

/* ── Dışa aktarım ───────────────────────────────────────────────────
   Sütun kümesi ve `exceleAktar` sözleşmesi DEĞİŞMEDİ; yalnız açılır
   menü yerine iki düğme, A yüzeyinin gramerinde. */
function DisaAktar({ varliklar, simdi }: { varliklar: V[]; simdi: number }) {
  const satirlar = () => varliklar.map((v) => [
    v.etiket, v.ad, v.tur.ad, etiketle(v.tur.sinif),
    v.tesis?.kod ?? '', v.bolge?.kod ?? '', v.sistem?.kod ?? '',
    etiketle(v.kritiklik), v.isletimSistemi ?? '',
    v.eosTarihi ? tarihTR(v.eosTarihi) : '',
    etiketle(v.yamaDurumu), etiketle(v.edrDurumu), etiketle(v.yedekDurumu),
    etiketle(v.izlemeDurumu), etiketle(v.logKaynagi), etiketle(v.internetMaruziyeti),
    YASAM_ETIKET[v.yasamDongusu] ?? etiketle(v.yasamDongusu),
    v.sahip?.ad ?? '', korumaAcigi(v).join(', '), bilinmeyenAlanlar(v).join(', '),
    varlikDurumu(v, simdi),
  ]);

  return (
    <span className="ab-a-disa ab-baskida-gizle">
      <button type="button" className="ab-dugme"
        onClick={() => exceleAktar('envanter', [{
          ad: 'Envanter',
          satirlar: [
            ['Etiket', 'Ad', 'Tür', 'Sınıf', 'Santral', 'Ağ bölgesi', 'Sistem',
              'Kritiklik', 'İşletim sistemi', 'EOS', 'Yama', 'EDR', 'Yedek',
              'İzleme', 'Log', 'İnternet maruziyeti', 'Yaşam döngüsü', 'Sahip',
              'Koruma açığı', 'Bilinmeyen alanlar', 'İşaret'],
            ...satirlar(),
          ],
        }])}>Excel</button>
      <button type="button" className="ab-dugme" onClick={() => pdfYazdir()}>Yazdır</button>
    </span>
  );
}
