'use client';
import { useMemo, useState } from 'react';
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

/* A4 · Santral haritası — İSTEMCİ.

   Tuval bir enlem/boylam çerçevesidir, ülke sınırı ÇİZİLMEZ (gerekçe
   `mantik.ts` başında). İşaret dolu ise konum kesindir; içi boş ise il
   merkezine yaklaştırılmıştır ve künyede öyle yazar. Renk uyum durumunu
   taşır ama TEK KANAL DEĞİLDİR: seçili santralin künyesi sözcükle yazar,
   yaklaşık işaret kesik çizgiyle ayrılır.

   Haritaya yerleştirilemeyen santral kaybolmaz: tuvalin altında kendi
   listesinde durur ve koordinatı oradan girilir. */

export default function HaritaIstemci({
  satirlar, yazabilir, kapsamli = false,
}: {
  satirlar: PortfoySatiri[];
  yazabilir: boolean;
  kapsamli?: boolean;
}) {
  const [secili, setSecili] = useState<string | null>(null);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);

  const yerlesim = useMemo(() => yerlesimKur(satirlar), [satirlar]);
  const isaretler = useMemo(() => yiginKaydir(yerlesim.isaretler), [yerlesim]);
  const olculer = useMemo(() => olcu(yerlesim), [yerlesim]);
  const izgara = useMemo(() => kilavuz(), []);
  const baslik = baslikMetni(olculer);

  const secilen = isaretler.find((i) => i.id === secili) ?? null;
  const duzenlenenSatir = satirlar.find((s) => s.id === duzenlenen) ?? null;

  if (satirlar.length === 0) {
    return (
      <main className="ab-b-harita">
        <EkranBasligi eyebrow="Santral haritası" baslik="Kapsamınızda santral yok" />
        <section className="ab-ekran-govde">
          <BosIlk
            cumle={kapsamli
              ? 'Santral kapsamınız boş; harita gösterilecek kayıt bulamadı.'
              : 'Portföyde aktif santral yok.'}
            eylem={<Link href="/portfoy" className="ab-dugme">Portföyü aç</Link>} />
        </section>
      </main>
    );
  }

  return (
    <main className="ab-b-harita">
      <EkranBasligi
        eyebrow={`Santral haritası · ${olculer.toplam} santral · enlem/boylam çerçevesi`}
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
            {`${isaretler.length} santral enlem/boylam çerçevesine yerleştirildi. `
              + `${olculer.dogrulanmis} doğrulanmış koordinat, `
              + `${olculer.dogrulanmamis} doğrulanmamış, `
              + `${olculer.yaklasik} il merkezine yaklaşık. `
              + 'Her işaret bir düğmedir; sekme ile gezilir, Enter ile künyesi açılır.'}
          </p>
          <svg viewBox={`0 0 ${TUVAL.en} ${TUVAL.boy}`} role="group"
            aria-label="Santral konumları · enlem/boylam çerçevesi">

            {/* Ülke sınırı — kılavuzun ÜSTÜNDE, işaretlerin ALTINDA.
                Sırası bilinçli: kılavuz sınırın içinden geçmeye devam
                eder (çerçeve hâlâ okunur), sınır ise hiçbir santral
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
              <IsaretDugumu key={i.id} isaret={i}
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
          ) : (
            <div className="ab-harita-bos">
              <p className="etiket">Seçili santral</p>
              <p className="cumle">
                Bir işarete tıklayın: künye, koordinat kaynağı ve açık kayıt
                sayıları burada açılır.
              </p>
            </div>
          )}
        </div>

        {yerlesim.yerlestirilemeyen.length > 0 && (
          <div className="ab-harita-eksik">
            <p className="etiket">
              Haritaya yerleştirilemedi · {yerlesim.yerlestirilemeyen.length} santral
            </p>
            <p className="cumle">
              Bu santrallerin ne kesin koordinatı ne de tanınan bir il kaydı var.
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

/* ── İşaret ───────────────────────────────────────────────────────────
   Düğme: klavyeyle gezilebilir, `aria-pressed` seçimi taşır. Yaklaşık
   konum kesik çizgiyle ve boş içle ayrılır — renk tek kanal değildir. */
function IsaretDugumu({ isaret, secili, sec }: {
  isaret: Isaret; secili: boolean; sec: () => void;
}) {
  const uyum = isaret.uyumYuzde === null ? 'ölçülmedi' : `%${isaret.uyumYuzde}`;
  const yer = isaret.kaynak === 'dogrulanmis' ? 'doğrulanmış konum'
    : isaret.kaynak === 'dogrulanmamis' ? 'koordinat doğrulanmadı'
      : 'il merkezi · yaklaşık';
  return (
    <g className={`isaret d-${isaret.durum} k-${isaret.kaynak}${secili ? ' secili' : ''}`}>
      <circle cx={isaret.x} cy={isaret.y} r={isaret.r} className="halka" />
      <circle
        cx={isaret.x} cy={isaret.y} r={Math.max(isaret.r, 11)}
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
  return (
    <ul className="ab-harita-gosterge" aria-label="Okuma anahtarı">
      <li><span className="ornek d-ok" /> uyum %85 ve üzeri</li>
      <li><span className="ornek d-md" /> %60–84</li>
      <li><span className="ornek d-bd" /> %60 altı</li>
      <li>
        <span className="ornek d-unk" /> ölçülmedi
        {olculmeyen > 0 && <span className="sayi"> · {olculmeyen} santral</span>}
      </li>
      <li><span className="ornek k-il" /> il merkezine yaklaşık</li>
    </ul>
  );
}

/* ── Seçili santral künyesi ─────────────────────────────────────────── */
function SeciliKunye({ isaret, yazabilir, duzenle, kapat }: {
  isaret: Isaret; yazabilir: boolean; duzenle: () => void; kapat: () => void;
}) {
  return (
    <div className="ab-harita-kunye" role="status">
      <div className="bas">
        <span className="etiket">Seçili santral</span>
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
          <dd>{isaret.gucMw === null ? 'kayıt yok' : `${isaret.gucMw} MWe`}</dd>
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
   Boş bırakıp kaydetmek koordinatı SİLER ve santral yaklaşık işarete
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
        ve santral il merkezine yaklaştırılır. Değişiklik denetim izine yazılır.
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
