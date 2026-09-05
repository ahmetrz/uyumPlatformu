'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import { BosIlk, BosFiltre, Dugme, TikSeridi } from '@/components/kabuk/temel';
import { EkranBasligi, Filtreler } from '@/components/kabuk/ekran';
import { VeriTablosu, type VtKolon } from '@/components/kabuk/tablo';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { RISK_DURUM_ETIKET, etiketle, tarihTR } from '@/lib/sabitler';
import { RiskFormu, KararFormu } from './Formlar';
import {
  aktifMi, altSatir, gecikmis, gunFarki, hucreEsigi, hucredeMi, isiHaritasi, kabulDoldu,
  maxEtki, santralMetni, skorDurumu, skorAgirligi, SKOR_TAVANI, SKOR_TIK,
  type BulguSecenegi, type IsiHucresi, type Kisi, type Kodlu, type R,
} from './ortak';

/* O3 · Risk Register — "hangi risk önce?"
   Skor LİDER kolondur (03-screens O3): işlem/treatment sözcükleri tablodan
   kaldırıldı, durum satırda kelimeyle YAZILMAZ.

   Skor İKİ KANAL taşır — rakam+renk ve tik şeridi. Eskiden
   şiddet yalnız rengin içindeydi; "durum yalnız renkle anlatılmaz"
   sözleşmesi bu satırda çiğneniyordu ve renk göremeyen bir okuyucu için 22
   ile 4 aynı görünüyordu. Şerit aynı bilgiyi uzunlukla da kodlar.
   Detay modalda değil 420px çekmecede ya da /riskler/[id] rotasında açılır. */

/* A5 kütük grameri (Faz 3): semantik tablo, skor LİDER kolon. Sıralama
   skora göredir ve sabittir — başlık düğmesi bu yüzden yok; dip not söyler. */
const KOLONLAR: VtKolon<R>[] = [
  { anahtar: 'skor', baslik: 'Skor', genislik: '92px', ad: 'Artık risk skoru',
    hucre: (r) => <SkorHucresi risk={r} /> },
  { anahtar: 'risk', baslik: 'Risk',
    hucre: (r) => (
      <span className="kimlik-metin">
        <span className="konu">{r.baslik}</span>
        <span className="alt">{altSatir(r)}</span>
      </span>
    ) },
  { anahtar: 'santral', baslik: 'Santral', genislik: '190px', ikincil: true,
    hucre: (r) => <span className="ikincil">{santralMetni(r)}</span> },
  { anahtar: 'sahip', baslik: 'Sahip', genislik: '130px',
    hucre: (r) => (
      <span style={!r.sahip ? { color: 'var(--md)' } : undefined}>{r.sahip?.ad ?? 'atanmadı'}</span>
    ) },
];

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
  const [filtre, setFiltre] = useUrlDurumu<string>('mercek', 'aktif');
  const [tesisF, setTesisF] = useUrlDurumuBos('tesis');
  const [sahipF, setSahipF] = useUrlDurumuBos('sahip');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [seciliId, setSeciliId] = useUrlDurumuBos('sec');
  const [kip, setKip] = useUrlDurumu<Kip>('kip', 'ozet');
  const [yeniAcik, setYeniAcik] = useState(false);
  /** C18 · ısı haritasında seçili hücre — liste bu hücreye daralır */
  const [hucre, setHucre] = useState<IsiHucresi | null>(null);

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
  /* Harita tabanı: sekme + santral + sahip süzgeçleri uygulanmış, HÜCRE
     süzgeci uygulanmamış küme. Harita bu kümeden sayılır ki bir hücreye
     tıklayınca diğer hücrelerin sayıları sıfırlanmasın — okuyucu haritada
     gezinirken bağlamı kaybetmez. */
  const haritaTabani = useMemo(() => riskler.filter((r) => {
    if (filtre === 'aktif' && !aktifMi(r)) return false;
    if (filtre === 'kritik' && !(aktifMi(r) && r.artikRisk !== null && r.artikRisk >= 15)) return false;
    if (filtre === 'ot' && !(aktifMi(r) && r.ot)) return false;
    if (filtre === 'kabul' && r.durum !== 'kabul_edildi') return false;
    if (filtre === 'kapali' && r.durum !== 'kapali') return false;
    if (tesisF && r.tesis?.id !== tesisF) return false;
    if (sahipF === 'yok' ? !!r.sahip : sahipF !== null && r.sahip?.id !== sahipF) return false;
    return true;
  }), [riskler, filtre, tesisF, sahipF]);
  const harita = useMemo(() => isiHaritasi(haritaTabani), [haritaTabani]);
  const taban = useMemo(
    () => (hucre ? haritaTabani.filter((r) => hucredeMi(r, hucre)) : haritaTabani),
    [haritaTabani, hucre],
  );

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
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
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

        <section className="ab-ekran-govde">
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
                <button type="button" className="ab-dugme"
                  onClick={() => { setYeniAcik(true); setSeciliId(null); }}>
                  + Yeni risk
                </button>
              </>
            }
          />

          {/* Isı haritası ile kütük YAN YANA (≥1101px): harita 300px'lik
              sol okuma sütunudur — Uyum ekranındaki dizin gibi bağlam
              verir, kütük sağda ilk ekranda başlar. Eylül 2026 denetimi
              haritayı tam genişlik bir bant olarak ölçtü: 5×5 ızgara 300px
              yükseklik alıyor, sağında ~800px boş kalıyor ve kütük
              1366×768'de 557px'te başlıyordu. */}
          <div className="ab-r-yanyana">
          <IsiHaritasiPaneli
            harita={harita}
            secili={hucre}
            sec={(h) => {
              setHucre((onceki) =>
                onceki && h && onceki.olasilik === h.olasilik && onceki.etki === h.etki ? null : h);
              setKuyrukAcik(false);
            }}
            kesildi={kesildi}
          />

            <div className="kutuk">
            {gosterilen.length === 0 ? (
              <BosDurum
                hicKayitYok={riskler.length === 0}
                kapsamli={kapsamli}
                aktifFiltre={filtre}
                kapaliyaGec={() => { setFiltre('kapali'); setTesisF(null); setSahipF(null); setHucre(null); }}
                temizle={() => { setFiltre('aktif'); setTesisF(null); setSahipF(null); setHucre(null); }}
                yeni={() => setYeniAcik(true)}
              />
            ) : (
              <div style={{ borderTop: 'var(--bw-strong) solid var(--hr2)' }}>
                <VeriTablosu<R>
                  etiket="Risk kütüğü"
                  kolonlar={KOLONLAR}
                  satirlar={gosterilen}
                  secili={seciliId}
                  sec={(id) => { if (id) sec(id); else cekmeceyiKapat(); }}
                  durum={(r) => skorDurumu(r.artikRisk)}
                  bosCumle={null}
                  kuyruk={toplanan.length > 0
                    ? { metin: `${kuyrukSkorlari.length ? `≤${Math.max(...kuyrukSkorlari)}` : '—'} · ${kuyrukEtiketi} · portföy`,
                      ac: () => setKuyrukAcik(true) }
                    : null}
                  dipNot={<>
                    Sıralama artık skora göre
                    {skorsuzSayisi > 0 && ` · ${skorsuzSayisi} risk skorsuz`}
                    {hucre && ` · haritadan süzülü: olasılık ${hucre.olasilik} × etki ${hucre.etki}`}
                    {kuyrukAcik && sakin.length > 0 && (
                      <> · <button type="button" className="ab-vt-dip-eylem" onClick={() => setKuyrukAcik(false)}>Kuyruğu topla</button></>
                    )}
                  </>}
                />
              </div>
            )}
            </div>
          </div>
        </section>
      </main>

      {secili && (
        <Cekmece kod={secili.kod} kapat={cekmeceyiKapat}>
          {kip === 'ozet' && (
            <Ozet risk={secili} duzenle={() => setKip('form')} karar={() => setKip('karar')} />
          )}
          {kip === 'form' && (
            <>
              <div className="ab-panel-blok">
                <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Yeniden değerlendir</p>
              </div>
              <div className="ab-panel-blok">
                <RiskFormu risk={secili} yeniKod={yeniKod} kullanicilar={kullanicilar}
                  tesisler={tesisler} sistemler={sistemler} bulgular={bulgular}
                  kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
          {kip === 'karar' && (
            <>
              <div className="ab-panel-blok">
                <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Karar kaydet</p>
              </div>
              <div className="ab-panel-blok">
                <KararFormu risk={secili} kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
        </Cekmece>
      )}

      {yeniAcik && !secili && (
        <Cekmece kod={yeniKod} kapat={() => setYeniAcik(false)}>
          <div className="ab-panel-blok">
            <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Yeni risk</p>
          </div>
          <div className="ab-panel-blok">
            <RiskFormu risk={null} yeniKod={yeniKod} kullanicilar={kullanicilar}
              tesisler={tesisler} sistemler={sistemler} bulgular={bulgular}
              kapat={() => setYeniAcik(false)} />
          </div>
        </Cekmece>
      )}
    </>
  );
}

/* ── C18 · Isı haritası (olasılık × etki) ───────────────────────────
   5×5; satır 0 = etki 5 (üst), sütun 0 = olasılık 1 (sol). Her hücre bir
   <button aria-pressed>: adet yazılıdır; eşik bölgesi (düşük / orta /
   kritik) eksen konumu + zemin rengi + kritikte kalın rakam ve iç çizgi
   ile anlatılır, sözcük ekran okuyucuya `aria-label`da okunur ve göze
   ızgara altındaki tek lejantta yazılır. Her hücrede sözcüğü yinelemek
   (25 × 10px "DÜŞÜK/ORTA/KRİTİK") <11px sayacını 26→51 çıkarmıştı ve
   haritayı gürültülü kılıyordu (ürün sahibi kabulü 2026-09). Boş hücre
   "0" yazar — burada sıfır GERÇEK sıfırdır (sayım), bilinmeyen ayrı
   satırda sayılır ("ölçülemedi").

   Harita ELDEKİ satırlardan sayılır; sunucu tavanı kütüğü kestiyse dipnot
   bunu söyler — harita "kütüğün tamamı" diye yalan söylemez. */

const ESIK_SOZU: Record<'ilk' | 'orta' | 'son', string> = {
  ilk: 'düşük', orta: 'orta', son: 'kritik',
};

function IsiHaritasiPaneli({ harita, secili, sec, kesildi }: {
  harita: ReturnType<typeof isiHaritasi>;
  secili: IsiHucresi | null;
  sec: (h: IsiHucresi | null) => void;
  kesildi: boolean;
}) {
  const hicYok = harita.yerlesen === 0;
  return (
    <section className="ab-isi" aria-label="Risk ısı haritası: olasılık × etki">
      <div className="bas">
        <span className="etiket">Isı haritası · olasılık × etki</span>
        <span className="mono cumle">
          {harita.yerlesen} risk yerleşti
          {harita.olculemeyen > 0 && <> · <span className="unk">{harita.olculemeyen} ölçülemedi</span></>}
          {kesildi && ' · yalnız yüklü satırlar'}
        </span>
        {secili && (
          <button type="button" className="ab-dugme eylem" onClick={() => sec(null)}>
            Hücre süzgecini kaldır
          </button>
        )}
      </div>

      {hicYok ? (
        <p className="cumle bos">
          Bu süzgeçte olasılığı ve etkisi bilinen risk yok — harita çizilmedi.
        </p>
      ) : (
        <div className="izgara" role="group" aria-label="Hücreler; tıklayınca liste o hücreye daralır">
          <span className="eksen dikey" aria-hidden>etki ↑</span>
          {harita.hucreler.map((satir, si) => {
            const etki = 5 - si;
            return satir.map((adet, oi) => {
              const olasilik = oi + 1;
              const esik = hucreEsigi(olasilik, etki);
              const basili = !!secili && secili.olasilik === olasilik && secili.etki === etki;
              return (
                <button
                  key={`${olasilik}-${etki}`}
                  type="button"
                  className={`hucre e-${esik}${adet === 0 ? ' bos' : ''}`}
                  style={{ gridColumn: oi + 2, gridRow: si + 1 }}
                  aria-pressed={basili}
                  aria-label={`Olasılık ${olasilik}, etki ${etki}: ${adet} risk, ${ESIK_SOZU[esik]} bölge`}
                  onClick={() => sec({ olasilik, etki })}
                >
                  <span className="mono adet">{adet}</span>
                </button>
              );
            });
          })}
          <span className="eksen yatay" aria-hidden>olasılık →</span>
          <ul className="lejant" aria-label="Eşik bölgeleri">
            {(['ilk', 'orta', 'son'] as const).map((e) => (
              <li key={e}><span className={`renk e-${e}`} aria-hidden />{ESIK_SOZU[e]}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ── Skor hücresi ────────────────────────────────────────────────────
   İKİ KANAL taşır: rakam+renk ve tik şeridi. Şerit "durum yalnız renkle
   anlatılmaz" sözleşmesinin bu satırdaki karşılığıdır — kritik satır
   rengi görülmese de uzunluğuyla ayrışır. Skorsuz risk kesikli şerit
   alır: ölçülmemiş bir risk sıfır ağırlıklı DEĞİLDİR. */

function SkorHucresi({ risk }: { risk: R }) {
  const durum = skorDurumu(risk.artikRisk);
  const agirlik = skorAgirligi(risk.artikRisk);
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)' }}>
      <span style={{
        fontFamily: 'var(--veri)', fontSize: 'var(--t-lead)', fontWeight: 600,
        color: `var(--${durum})`, fontVariantNumeric: 'tabular-nums', minWidth: '2ch',
        textAlign: 'right',
      }}>
        {risk.artikRisk ?? '—'}
      </span>
      <TikSeridi
        dolu={agirlik ?? 0}
        toplam={SKOR_TIK}
        durum={durum}
        olculmedi={agirlik === null}
        etiket={agirlik === null
          ? 'Artık risk skoru ölçülmedi'
          : `Artık risk ${risk.artikRisk} / ${SKOR_TAVANI}`}
      />
    </span>
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
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 210,
        maxHeight: 300, overflowY: 'auto', background: 'var(--panel)',
        border: 'var(--bw-strong) solid var(--hr2)', boxShadow: 'none',
        padding: 'var(--s8)',
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
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Zincir</p>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Kontrol · bulgu · proje bağı yok — kapanma yolu tanımlı değil.
          </p>
        </div>
      )}

      {varlikBaglari.length > 0 && (
        <CekmeceBagli baslik="Varlıklar" kayitlar={varlikBaglari} />
      )}

      <CekmeceEylemler
        birincil={<Dugme tur="tam" onClick={karar}>Karar kaydet</Dugme>}
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
      <div className="ab-blok" style={{ marginTop: 'var(--s26)' }}>
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
