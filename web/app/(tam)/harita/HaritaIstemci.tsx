'use client';
import { useSozluk, useTerim } from '@/lib/dil/SozlukSaglayici';
import { olculenYazi } from '@/lib/alan/oznitelik';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Alan, Dugme, Hata, Im, BosIlk } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { useEylem } from '@/components/useEylem';
import { tesisKonumKaydet } from '@/lib/eylemler2/konum';
import type { PortfoySatiri } from '../portfoy/mantik';
import {
  SINIR_YOLLARI,
  TUVAL, baslikMetni, cerceveUyarisi, kaynakYazisi, kilavuz, koordinatGecerli,
  olcu, yerlesimKur, yiginKaydir, type Isaret,
} from './mantik';

/* A4 · Tesis haritası — İSTEMCİ.

   Tuval bir enlem/boylam çerçevesidir, ülke sınırı ÇİZİLMEZ (gerekçe
   `mantik.ts` başında). İşaret dolu ise konum kesindir; içi boş ise il
   merkezine yaklaştırılmıştır ve künyede öyle yazar. Renk uyum durumunu
   taşır ama TEK KANAL DEĞİLDİR: seçili tesisin künyesi sözcükle yazar,
   yaklaşık işaret kesik çizgiyle ayrılır.

   Haritaya yerleştirilemeyen tesis kaybolmaz: tuvalin altında kendi
   listesinde durur ve koordinatı oradan girilir. */

export default function HaritaIstemci({
  satirlar, yazabilir, kapsamli = false,
}: {
  satirlar: PortfoySatiri[];
  yazabilir: boolean;
  kapsamli?: boolean;
}) {
  const { t: terim, tBas } = useTerim();
  const [secili, setSecili] = useState<string | null>(null);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);

  const yerlesim = useMemo(() => yerlesimKur(satirlar), [satirlar]);
  const isaretler = useMemo(() => yiginKaydir(yerlesim.isaretler), [yerlesim]);

  /* ── VURUŞ ALANI CSS PİKSELİNDE ÖLÇÜLÜR, KULLANICI BİRİMİNDE DEĞİL ──
     ÖLÇÜLEN KUSUR (mobil audit, 375×812): işaretin vuruş dairesi
     `r = max(isaret.r, 11)` ile KULLANICI BİRİMİNDE veriliyordu. Tuval
     960 birim geniş ve `width: 100%` ile çiziliyor; dar bantta ölçek
     düşünce o yarıçap da düşüyor ve daire ekranda 11px ÇAP olarak
     çıkıyordu — ürünün beyan ettiği WCAG 2.2 AA 24×24 eşiğinin yarısından
     az. Yazan kişi 11'i piksel sanmıştı; SVG onu tuvalin ölçeğiyle
     çarpıyordu. Bir ölçünün başka bir şeye SESSİZCE bağlı olması.

     Bugün ölçek çalışma anında ölçülür ve yarıçap ondan TÜRETİLİR:
     hangi genişlikte olursa olsun daire 24 CSS pikselidir. Sunucuda
     ölçek bilinemez; varsayılan 1 bugünkü davranıştır ve daire şeffaf
     olduğu için ilk karede görünen hiçbir şey değişmez. */
  const tuvalKok = useRef<SVGSVGElement>(null);
  const [olcek, setOlcek] = useState(1);
  useEffect(() => {
    const svg = tuvalKok.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const olc = () => {
      const en = svg.getBoundingClientRect().width;
      if (en > 0) setOlcek(TUVAL.en / en);
    };
    olc();
    const g = new ResizeObserver(olc);
    g.observe(svg);
    return () => g.disconnect();
  }, []);
  /* 12 CSS px yarıçap = 24 CSS px çap. */
  const vurusR = 12 * olcek;
  const olculer = useMemo(() => olcu(yerlesim), [yerlesim]);
  const izgara = useMemo(() => kilavuz(), []);
  const baslik = baslikMetni(olculer, useSozluk());

  const secilen = isaretler.find((i) => i.id === secili) ?? null;
  const duzenlenenSatir = satirlar.find((s) => s.id === duzenlenen) ?? null;

  if (satirlar.length === 0) {
    return (
      <main className="ab-b-harita">
        <EkranBasligi eyebrow={`${tBas('tesis')} haritası`}
          baslik={`Kapsamınızda ${terim('tesis')} yok`} />
        <section className="ab-ekran-govde">
          <BosIlk
            cumle={kapsamli
              ? `${tBas('tesis')} kapsamınız boş; harita gösterilecek kayıt bulamadı.`
              : `${tBas('portfoy', 'bulunma')} aktif ${terim('tesis')} yok: `
                + 'harita yalnız aktif kayıtları çizer, pasif olanlar '
                + 'gösterilmez.'}
            eylem={<Link href="/portfoy" className="ab-dugme">
              {tBas('portfoy', 'belirtme')} aç
            </Link>} />
        </section>
      </main>
    );
  }

  return (
    <main className="ab-b-harita">
      <EkranBasligi
        eyebrow={`${tBas('tesis')} haritası · ${olculer.toplam} ${terim('tesis')}`
          + ' · enlem/boylam çerçevesi'}
        vurgu={baslik.vurgu}
        vurguDurumu={baslik.durum}
        baslik={baslik.ad}
        metrikler={[
          { deger: olculer.dogrulanmis, yazi: 'Doğrulanmış konum' },
          /* Doğrulanmamış nokta AYRI sayılır: eskiden "kesin"e katılıyordu
             ve ekran onu doğrulanmış gibi gösteriyordu (P3-8). */
          { deger: olculer.dogrulanmamis, yazi: 'Doğrulanmadı',
            durum: olculer.dogrulanmamis > 0 ? 'md' : undefined },
          { deger: olculer.yaklasik, yazi: 'İl merkezine yaklaşık',
            durum: olculer.yaklasik > 0 ? 'md' : undefined },
          { deger: olculer.yerlestirilemeyen, yazi: 'Yerleştirilemedi',
            durum: olculer.yerlestirilemeyen > 0 ? 'unk' : undefined },
        ]}
      />

      <section className="ab-ekran-govde ab-harita-govde">
        <div className="ab-harita-tuval">
          {/* `role="img"` DEĞİL `group`: tuvalin içinde odaklanabilir işaret
              düğmeleri var; img rolü etkileşimli çocuk taşıyamaz (axe
              `nested-interactive`). Özet cümle görsel olarak gizli bir
              paragrafta durur, ekran okuyucu önce onu okur. */}
          <p className="ab-gizli-okuma">
            {`${isaretler.length} ${terim('tesis')} enlem/boylam çerçevesine yerleştirildi. `
              + `${olculer.dogrulanmis} doğrulanmış koordinat, `
              + `${olculer.dogrulanmamis} doğrulanmamış, `
              + `${olculer.yaklasik} il merkezine yaklaşık. `
              + 'Her işaret bir düğmedir; sekme ile gezilir, Enter ile künyesi açılır.'}
          </p>
          <svg ref={tuvalKok} viewBox={`0 0 ${TUVAL.en} ${TUVAL.boy}`} role="group"
            aria-label={`${tBas('tesis')} konumları · enlem/boylam çerçevesi`}>

            {/* Ülke sınırı — kılavuzun ÜSTÜNDE, işaretlerin ALTINDA.
                Sırası bilinçli: kılavuz sınırın içinden geçmeye devam
                eder (çerçeve hâlâ okunur), sınır ise hiçbir tesis
                işaretini örtmez. Dekoratiftir; okuyucuya sunulmaz —
                taşıdığı bilgi işaretlerin koordinatında zaten var. */}
            <g className="sinir" aria-hidden>
              {SINIR_YOLLARI.map((d, i) => <path key={i} d={d} />)}
            </g>

            {/* Kılavuz: tam dereceli meridyen ve paraleller. */}
            <g className="kilavuz" aria-hidden>
              {izgara.dikey.map((d) => (
                <line key={`b${d.boylam}`} x1={d.x} y1={TUVAL.kenar}
                  x2={d.x} y2={TUVAL.boy - TUVAL.kenar} />
              ))}
              {izgara.yatay.map((y) => (
                <line key={`e${y.enlem}`} x1={TUVAL.kenar} y1={y.y}
                  x2={TUVAL.en - TUVAL.kenar} y2={y.y} />
              ))}
            </g>
            <g className="eksen" aria-hidden>
              {izgara.dikey.map((d) => (
                <text key={`bt${d.boylam}`} x={d.x} y={TUVAL.boy - 8} textAnchor="middle">
                  {d.boylam}°D
                </text>
              ))}
              {izgara.yatay.map((y) => (
                <text key={`et${y.enlem}`} x={6} y={y.y + 3}>{y.enlem}°K</text>
              ))}
            </g>

            {isaretler.map((i) => (
              <IsaretDugumu key={i.id} isaret={i} vurusR={vurusR}
                secili={secili === i.id}
                sec={() => setSecili((o) => (o === i.id ? null : i.id))} />
            ))}

            {/* Etiketler işaretlerin ÜSTÜNE çizilir (SVG'de son gelen üstte):
                ad ipucunda yaşayamaz, ekranda durmalı. Dar bantta CSS ile
                gizlenir — orada okunmaz bir yığın olurdu, seçim künyesi
                adı zaten yazar. */}
            <g className="etiketler" aria-hidden>
              {isaretler.map((i) => (
                <text key={i.id} x={i.x + i.etiketDx} y={i.y + i.etiketDy}
                  textAnchor={i.etiketHiza}
                  className={secili === i.id ? 'secili' : undefined}>
                  {i.kod}
                </text>
              ))}
            </g>
          </svg>

          <p className="ab-dip ab-harita-not">
            Tuval bir enlem/boylam çerçevesidir. Ülke silüeti Natural Earth
            1:50m verisinden üretilir (kamu malı) ve bağlam içindir; kıyı
            çizgisi olarak okunmaz. İçi dolu işaret kesin koordinat, içi boş
            işaret il merkezine yaklaştırılmış konumdur. Halka büyüklüğü
            kurulu güçtür.
          </p>

          <Gosterge olculmeyen={olculer.olculmeyenUyum} />
        </div>

        <div className="ab-harita-yan">
          {secilen ? (
            <SeciliKunye
              isaret={secilen}
              yazabilir={yazabilir}
              duzenle={() => setDuzenlenen(secilen.id)}
              kapat={() => setSecili(null)}
            />
          ) : null}

          {/* ── İŞARETİN DOKUNULABİLİR KARŞILIĞI ────────────────────────
              ÖLÇÜLEN KUSUR (mobil audit, 375×812): haritaya varmanın TEK
              yolu 11 piksellik bir noktaya dokunmaktı. İşaret küçük
              KALMAK ZORUNDA — konum ölçülen veridir, büyütmek onu yanlış
              yere taşır (WCAG 2.5.8 "temel" istisnası tam olarak bu) —
              ama küçük bir hedefin TEK yol olması ayrı bir kusurdur ve
              istisna onu örtmez: her yolun dokunulabilir bir karşılığı
              olmalıdır.

              Panel eskiden BOŞTU ve "bir işarete tıklayın" diyordu; oysa
              sistem listeyi zaten elinde tutuyordu. Bugün o liste panelin
              kendisidir: her satır 40px'lik bir hedef, seçim haritada
              yanar, künye üstte açılır. Dar bantta işaret ETİKETLERİ
              gizlendiği için (okunmaz bir yığın olurlardı) ad, kod ve
              uyum oranını gören tek yüzey de burasıdır.

              Satır GEZİNMEZ, SEÇER: künye yanında açılır, kullanıcı
              haritadan kopmaz. Tesisin kendi ekranına giden bağ künyenin
              içindedir — kademeli açılım sırası bozulmaz. */}
          <div className="ab-harita-secim">
            <p className="etiket">
              {isaretler.length} {terim('tesis')} · haritada
            </p>
            <ul className="ab-harita-liste secilir">
              {isaretler.map((i) => (
                <li key={i.id}>
                  <button type="button"
                    className={`satirdugme${secili === i.id ? ' secili' : ''}`}
                    aria-pressed={secili === i.id}
                    onClick={() => setSecili((o) => (o === i.id ? null : i.id))}>
                    <Im durum={i.durum} ad={DURUM_ADI[i.durum]} />
                    <span className="ad">{i.ad}</span>
                    <span className="mono kod">{i.kod}</span>
                    <span className="mono yer">
                      {i.uyumYuzde === null ? 'ölçülmedi' : `%${i.uyumYuzde}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {yerlesim.yerlestirilemeyen.length > 0 && (
          <div className="ab-harita-eksik">
            <p className="etiket">
              Haritaya yerleştirilemedi · {yerlesim.yerlestirilemeyen.length} {terim('tesis')}
            </p>
            <p className="cumle">
              Bu {terim('tesis', 'cogul')}in ne kesin koordinatı ne de tanınan bir il kaydı var.
              Haritanın ortasına konmadılar; uydurulmuş bir nokta sahayı yanlış
              yere gönderir.
            </p>
            <ul className="ab-harita-liste">
              {yerlesim.yerlestirilemeyen.map((s) => (
                <li key={s.id}>
                  <Im durum="unk" ad="Konum bilinmiyor" />
                  <Link href={`/tesisler/${s.id}`} className="ad">{s.ad}</Link>
                  <span className="mono kod">{s.kod}</span>
                  <span className="mono yer">{s.konum ?? 'konum kaydı yok'}</span>
                  {yazabilir && (
                    <Dugme tur="satir" onClick={() => setDuzenlenen(s.id)}>Konum gir</Dugme>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {duzenlenenSatir && (
          <KonumFormu satir={duzenlenenSatir} kapat={() => setDuzenlenen(null)} />
        )}
      </section>
    </main>
  );
}

/* Durum glifinin okunur karşılığı — renk TEK KANAL değildir ve liste
   satırı ekran okuyucuya da aynı şeyi söylemelidir. */
const DURUM_ADI: Record<string, string> = {
  ok: 'uyum %85 ve üzeri', md: 'uyum %60–84', bd: 'uyum %60 altı',
  unk: 'uyum ölçülmedi',
};

/* ── İşaret ───────────────────────────────────────────────────────────
   Düğme: klavyeyle gezilebilir, `aria-pressed` seçimi taşır. Yaklaşık
   konum kesik çizgiyle ve boş içle ayrılır — renk tek kanal değildir. */
function IsaretDugumu({ isaret, vurusR, secili, sec }: {
  isaret: Isaret; vurusR: number; secili: boolean; sec: () => void;
}) {
  const uyum = isaret.uyumYuzde === null ? 'ölçülmedi' : `%${isaret.uyumYuzde}`;
  const yer = isaret.kaynak === 'dogrulanmis' ? 'doğrulanmış konum'
    : isaret.kaynak === 'dogrulanmamis' ? 'koordinat doğrulanmadı'
      : 'il merkezi · yaklaşık';
  return (
    <g className={`isaret d-${isaret.durum} k-${isaret.kaynak}${secili ? ' secili' : ''}`}>
      <circle cx={isaret.x} cy={isaret.y} r={isaret.r} className="halka" />
      <circle
        cx={isaret.x} cy={isaret.y} r={Math.max(isaret.r, vurusR)}
        className="vurus" role="button" tabIndex={0}
        aria-pressed={secili}
        aria-label={`${isaret.ad} · ${isaret.konum ?? 'konum yok'} · uyum ${uyum} · ${yer}`}
        onClick={sec}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sec(); }
        }}
      />
    </g>
  );
}

function Gosterge({ olculmeyen }: { olculmeyen: number }) {
  const { t: terim } = useTerim();
  return (
    <ul className="ab-harita-gosterge" aria-label="Okuma anahtarı">
      <li><span className="ornek d-ok" /> uyum %85 ve üzeri</li>
      <li><span className="ornek d-md" /> %60–84</li>
      <li><span className="ornek d-bd" /> %60 altı</li>
      <li>
        <span className="ornek d-unk" /> ölçülmedi
        {olculmeyen > 0 && <span className="sayi"> · {olculmeyen} {terim('tesis')}</span>}
      </li>
      <li><span className="ornek k-il" /> il merkezine yaklaşık</li>
    </ul>
  );
}

/* ── Seçili tesis künyesi ───────────────────────────────────────────── */
function SeciliKunye({ isaret, yazabilir, duzenle, kapat }: {
  isaret: Isaret; yazabilir: boolean; duzenle: () => void; kapat: () => void;
}) {
  const { t: terim } = useTerim();
  return (
    <div className="ab-harita-kunye" role="status">
      <div className="bas">
        <span className="etiket">Seçili {terim('tesis')}</span>
        <Dugme tur="satir" onClick={kapat}>Kapat</Dugme>
      </div>
      <p className="ad">
        <Im durum={isaret.durum} ad={isaret.uyumYuzde === null ? 'Ölçülmedi' : `Uyum %${isaret.uyumYuzde}`} />
        <Link href={`/tesisler/${isaret.id}`}>{isaret.ad}</Link>
        <span className="mono kod">{isaret.kod}</span>
      </p>
      <dl className="olgular">
        <div><dt>Tip</dt><dd>{isaret.tipAdi}</dd></div>
        <div><dt>Konum kaydı</dt><dd>{isaret.konum ?? 'yok'}</dd></div>
        <div>
          <dt>Koordinat</dt>
          {/* Doğrulanmamış nokta da belirsiz görünür: `unk` sınıfı
              "bu sayıya güvenme" demenin görsel karşılığı. */}
          <dd className={isaret.kaynak === 'dogrulanmis' ? 'mono' : 'mono unk'}>
            {kaynakYazisi(isaret)}
          </dd>
        </div>
        <div>
          <dt>Kurulu güç</dt>
          <dd>{olculenYazi({ deger: isaret.guc, birim: isaret.gucBirim }) ?? 'kayıt yok'}</dd>
        </div>
        <div>
          <dt>Uyum</dt>
          <dd>{isaret.uyumYuzde === null ? 'ölçülmedi' : `%${isaret.uyumYuzde}`}</dd>
        </div>
        <div><dt>Açık bulgu</dt><dd>{isaret.acikBulgu}</dd></div>
        <div><dt>Açık risk</dt><dd>{isaret.acikRisk}</dd></div>
      </dl>
      {yazabilir && (
        <Dugme tur="ikincil" onClick={duzenle}>
          {isaret.kaynak === 'il' ? 'Koordinat gir' : 'Koordinatı düzelt'}
        </Dugme>
      )}
    </div>
  );
}

/* ── Koordinat formu ──────────────────────────────────────────────────
   Boş bırakıp kaydetmek koordinatı SİLER ve tesis yaklaşık işarete
   döner; yanlış girilmiş bir koordinatı geri almanın yolu budur. */
function KonumFormu({ satir, kapat }: { satir: PortfoySatiri; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [enlem, setEnlem] = useState(satir.enlem === null ? '' : String(satir.enlem));
  const [boylam, setBoylam] = useState(satir.boylam === null ? '' : String(satir.boylam));

  const bosluk = enlem.trim() === '' && boylam.trim() === '';
  const e = Number(enlem.replace(',', '.'));
  const b = Number(boylam.replace(',', '.'));
  const gecerli = bosluk || koordinatGecerli(e, b);
  const uyari = !bosluk && gecerli ? cerceveUyarisi(e, b) : null;

  return (
    <div className="ab-panel-blok ab-harita-form">
      <p className="etiket" style={{ margin: 0 }}>Koordinat · {satir.ad}</p>
      <div className="ikili">
        <Alan etiket="Enlem · derece">
          <input className="ab-gr" inputMode="decimal" value={enlem} disabled={bekliyor}
            placeholder="37.7800" onChange={(ev) => setEnlem(ev.target.value)} />
        </Alan>
        <Alan etiket="Boylam · derece">
          <input className="ab-gr" inputMode="decimal" value={boylam} disabled={bekliyor}
            placeholder="29.0900" onChange={(ev) => setBoylam(ev.target.value)} />
        </Alan>
      </div>
      <p className="ab-dip" style={{ margin: 0 }}>
        WGS84 ondalık derece. İkisini de boş bırakıp kaydederseniz koordinat silinir
        ve tesis il merkezine yaklaştırılır. Değişiklik denetim izine yazılır.
      </p>
      {uyari && <p className="ab-dip" style={{ margin: 0, color: 'var(--md)' }}>{uyari}</p>}
      {!gecerli && !bosluk && (
        <p className="ab-dip" style={{ margin: 0, color: 'var(--bd)' }}>
          Sayı olarak okunamadı ya da aralık dışında: enlem -90..90, boylam -180..180.
        </p>
      )}
      {hata && <Hata cumle={hata} />}
      <div style={{ display: 'flex', gap: 'var(--s12)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(
            () => tesisKonumKaydet({
              tesisId: satir.id,
              enlem: bosluk ? null : e,
              boylam: bosluk ? null : b,
            }),
            kapat,
          )}>
          {bosluk ? 'Koordinatı sil' : 'Kaydet'}
        </Dugme>
        <Dugme tur="ikincil" disabled={bekliyor} onClick={kapat}>Vazgeç</Dugme>
      </div>
    </div>
  );
}
