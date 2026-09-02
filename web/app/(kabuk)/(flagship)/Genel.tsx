'use client';
import Link from 'next/link';
import { NOTR_TRIPTIK, kucukGorsel } from '@/lib/gorsel';
import { tipAdi, tipRengi, uygunRengi } from '@/components/kabuk/tip';
import type {
  AkisHaftasi, RiskIzgarasi, SantralKarti, TakvimKalemi, TipKatmani,
} from './veri';

/* ═══════════════════════════════════════════════════════════════════════
   SAHA — B · ENERGY INTELLIGENCE

   Görsel source of truth: `b-executive.html`
   (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §2).

   Prototipin grameri: 648px koyu fotoğrafik alan, üzerinde SOLDA 430px
   dikkat paneli, SAĞDA 320px katman paneli; altında altı kartlık saha
   şeridi; en altta 430px düzenleyici takvim + akış bandı. Ray YOKTUR;
   gezinme kabuğun 56px sekme çubuğundadır.

   ── PROTOTİPTEN AYRILAN TEK NOKTA VE NEDENİ ───────────────────────────
   Prototipin merkezinde Türkiye haritası ve enlem/boylama oturmuş santral
   işaretçileri var. ŞEMADA KOORDİNAT YOK — `Tesis.konum` serbest metin.
   İşaretçileri göz kararı yerleştirmek, ekranda GERÇEK OLMAYAN bir coğrafya
   çizmek olurdu. Bunun yerine aynı işaretçi grameri (45° döndürülmüş kare,
   kritikte halka, sağında iki satırlık künye) GERÇEK iki eksene oturtuldu:
   yatay uyum endeksi, dikey kurulu güç. Soru da aynı kalıyor: "hangi büyük
   santralim zayıf?" Ölçülmemiş santral eksene KONMAZ, altta ayrı listelenir
   (UNKNOWN ≠ ZERO).

   Diğer bölümler prototipin ölçüleriyle birebir; veriler gerçek:
   · dikkat listesi = açık/aksiyonda bulgular, öncelik sırasıyla;
   · katmanlar = `TesisTipi` başına `uyumOzeti`;
   · risk yoğunluğu = 5×5 olasılık × en büyük etki, ölçülemeyen ayrı;
   · takvim = 90 gün içindeki denetim ve süreç bitişleri;
   · akış = 12 haftanın açılan/kapanan bulguları;
   · eğilim = `UyumAnlik` kayıtları — yoksa ÇİZİLMEZ.
   ═══════════════════════════════════════════════════════════════════════ */

const KISA_TARIH = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' });
function kisaTarih(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : KISA_TARIH.format(d).toLocaleUpperCase('tr-TR');
}

/** Son tarih cümlesi — gecikme SÖZCÜKLE de anlatılır, salt renkle değil. */
function terminSozu(gecikmisGun: number | null, hedefTarih: string | null): string {
  if (gecikmisGun !== null) return `son tarih ${gecikmisGun} gün geçti`;
  return hedefTarih ? `son tarih ${kisaTarih(hedefTarih)}` : 'son tarih yok';
}

export type Kayit = {
  id: string; baslik: string; aciklama: string | null;
  tesisAd: string; tesisId: string; kontrolKodu: string; cerceve: string;
  onem: string; durum: string; sorumlu: string | null;
  hedefTarih: string | null; gecikmisGun: number | null;
  aksiyonTamam: number; aksiyonToplam: number;
};

type Ozet = {
  uyumYuzde: number | null; bilinmeyenOran: number | null;
  kritikRisk: number; gecikmisAksiyon: number;
  yaklasanDenetim: { kod: string; ad: string; tarih: string; kalanGun: number } | null;
  tesisSayisi: number; toplamGucMw: number;
};

/** Katman panelinde çizilen tip sayısı — kalanı sayıyla söylenir. */
const KATMAN_TAVANI = 3;

const ONEM_SINIF: Record<string, string> = {
  kritik: 'bd', yuksek: 'bd', orta: 'md', dusuk: 'pl',
};

export default function Genel({
  bugun, ozet, odak, kuyruk, toplamKayit, kapsamli = false,
  santraller, tipler, risk, takvim, akis, egilim,
}: {
  kullanici: string;
  /* Sunucuda biçimlendirilmiş tarih. Burada `new Date()` ÇAĞIRMA: bu
     bileşen istemcide de çalışır, statik dışa aktarımda HTML derleme
     gününü taşır ve tarayıcı ziyaret gününü yazarsa React hidrasyonu
     kırılır (#418). Kusur geliştirme kipinde görünmez. */
  bugun: string;
  ozet: Ozet;
  odak: Kayit | null;
  kuyruk: Kayit[];
  toplamKayit: number;
  kapsamli?: boolean;
  santraller: SantralKarti[];
  tipler: TipKatmani[];
  risk: RiskIzgarasi;
  takvim: TakvimKalemi[];
  akis: AkisHaftasi[];
  egilim: { etiket: string; yuzde: number }[] | null;
}) {
  const dikkat = odak ? [odak, ...kuyruk] : kuyruk;

  return (
    <main className="ab-b-saha">
      {/* ═══ Fotoğrafik alan ═══════════════════════════════════════════ */}
      <section className="ab-b-alan">
        {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım */}
        <img src={NOTR_TRIPTIK} alt="" aria-hidden decoding="async" fetchPriority="high" />
        <span className="perde" aria-hidden />

        {/* ── Dikkat paneli · 430px ─────────────────────────────────── */}
        <aside className="ab-b-dikkat" aria-label="Grup durumu">
          <p className="etiket">Grup durumu · {bugun}</p>
          <div className="endeks">
            <span className="sayi">{ozet.uyumYuzde === null ? '—' : `%${ozet.uyumYuzde}`}</span>
            <span className="yan">
              <span className="ad">Uyum endeksi</span>
              <span className="alt">
                {ozet.bilinmeyenOran === null
                  ? 'hiç değerlendirme yok'
                  : `%${ozet.bilinmeyenOran} bilinmeyen · payda dışı`}
              </span>
            </span>
          </div>

          <Egilim seri={egilim} />

          <div className="mudahale">
            <div className="bas">
              <span className="etiket">Müdahale gerektirenler</span>
              <span className="mono adet">{toplamKayit}</span>
            </div>
            {dikkat.length === 0 ? (
              <p className="bos">
                {kapsamli
                  ? 'Kapsamındaki santrallerde açık bulgu yok.'
                  : 'Açık bulgu yok.'}
              </p>
            ) : dikkat.slice(0, 4).map((b, i) => (
              <Link key={b.id} href={`/bulgular/${b.id}`} className="kalem">
                <span className={`sap ${ONEM_SINIF[b.onem] ?? 'pl'}`} aria-hidden />
                <span className="govde">
                  <span className="konu">{b.baslik}</span>
                  <span className="mono meta">
                    {b.tesisAd} · {b.kontrolKodu} ·{' '}
                    {terminSozu(b.gecikmisGun, b.hedefTarih)}
                  </span>
                </span>
                <span className="sira" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
              </Link>
            ))}
          </div>
        </aside>

        {/* ── Takımyıldız — koordinat DEĞİL, endeks × güç ───────────── */}
        <Takimyildizi santraller={santraller} />

        {/* ── Katman paneli · 320px ─────────────────────────────────── */}
        <aside className="ab-b-katman" aria-label="Üretim tipine göre uyum">
          <p className="etiket">Üretim tipine göre uyum katmanları</p>
          <div className="katmanlar">
            {tipler.length === 0 && <p className="bos">Kapsamında santral yok.</p>}
            {tipler.slice(0, KATMAN_TAVANI).map((t) => (
              <div key={t.kod} className="katman">
                <div className="bas">
                  <span className="ad">{tipAdi(t.kod, t.ad)}</span>
                  <span className="mono deger">{t.endeks === null ? '—' : `%${t.endeks}`}</span>
                </div>
                <p className="mono meta">
                  {t.santralSayisi} santral · {t.gucMw} MWe · {t.kontrolSayisi} kontrol
                </p>
                <Yigin uygun={t.uygun} kismi={t.kismi} uygunsuz={t.uygunsuz}
                  bilinmeyen={t.bilinmeyen} tip={t.kod} />
              </div>
            ))}
            {tipler.length > KATMAN_TAVANI && (
              <p className="mono kalan">
                {tipler.slice(KATMAN_TAVANI).map((t) => tipAdi(t.kod, t.ad)).join(' · ')}
                {' — '}{tipler.slice(KATMAN_TAVANI).reduce((a, t) => a + t.santralSayisi, 0)} santral
              </p>
            )}
          </div>

          <div className="yogunluk">
            <p className="etiket">Risk yoğunluğu</p>
            <RiskIzgara izgara={risk} />
          </div>
        </aside>
      </section>

      {/* ═══ Öncelik göstergeleri ══════════════════════════════════════ */}
      <OncelikSeridi ozet={ozet} olculemeyenRisk={risk.olculemeyen} />

      {/* ═══ Saha şeridi ═══════════════════════════════════════════════ */}
      <section className="ab-b-serit" aria-label="Saha seçici">
        <header>
          <span className="etiket">
            Saha seçici · {ozet.tesisSayisi} üretim tesisi · {ozet.toplamGucMw} MWe
          </span>
          <span className="etiket sag">
            Tesise geçmek için seçin · kapsam tüm uygulamada korunur
            {santraller.length > 6 && ' · yatay kaydırın'}
          </span>
        </header>
        <div className="kartlar">
          {santraller.map((s) => <SahaKarti key={s.id} s={s} />)}
        </div>
      </section>

      {/* ═══ Düzenleyici bant ══════════════════════════════════════════ */}
      <section className="ab-b-bant">
        <div className="takvim">
          <p className="etiket">Düzenleyici takvim · 90 gün</p>
          {takvim.length === 0 ? (
            <p className="bos">Önümüzdeki 90 günde planlı denetim veya süreç bitişi yok.</p>
          ) : takvim.slice(0, 6).map((t) => (
            <Link key={t.id} href={t.yol} className="satir">
              <span className={`mono gun${t.kalanGun <= 7 ? ' yakin' : ''}`}>
                {kisaTarih(t.tarih)}
              </span>
              <span className="konu">{t.baslik}</span>
              <span className="mono etiket">{t.etiket}</span>
              <span className="mono kalan">{t.kalanGun} g</span>
            </Link>
          ))}
        </div>
        <div className="akis">
          <div className="bas">
            <span className="etiket">Uygunsuzluk akışı · açılan / kapanan · 12 hafta</span>
            <span className="mono net">
              Net {netIslem(akis) > 0 ? '+' : ''}{netIslem(akis)}
            </span>
          </div>
          <Akis akis={akis} />
        </div>
      </section>
    </main>
  );
}

/* ── Öncelik göstergeleri ─────────────────────────────────────────────
   `ozet` bu üç sayıyı sunucuda zaten hesaplıyordu; ekranda yazılmıyordu.
   Üçü de birer BAĞDIR: sayı bir soru, hedef ekran onun cevabı. Sıfır ile
   "ölçülemedi" karışmasın diye kritik riskin yanına olasılık/etki
   girilmemiş risk sayısı ayrıca yazılır — 0 kritik risk, hiçbir riskin
   puanlanmadığı bir portföyde güven vermez. */
function OncelikSeridi({ ozet, olculemeyenRisk }: { ozet: Ozet; olculemeyenRisk: number }) {
  const yaklasan = ozet.yaklasanDenetim;
  /* Yakınlık sözcükle: "≤ 7 gün" alarmı renkten önce metinde durur. */
  const denetimDurumu = yaklasan === null ? 'unk' : yaklasan.kalanGun <= 7 ? 'md' : 'pl';
  return (
    <section className="ab-kpi" aria-label="Öncelik göstergeleri">
      <Link href="/riskler"
        className={`kalem d-${ozet.kritikRisk > 0 ? 'bd' : olculemeyenRisk > 0 ? 'unk' : 'ok'}`}>
        <span className="etiket">Kritik risk</span>
        <span className="mono deger">{ozet.kritikRisk}</span>
        <span className="cumle">
          artık skor ≥ 15 · açık veya işlemde
          {olculemeyenRisk > 0 && (
            <> · <span className="unk">{olculemeyenRisk} risk ölçülemedi</span></>
          )}
        </span>
      </Link>
      <Link href="/bulgular" className={`kalem d-${ozet.gecikmisAksiyon > 0 ? 'bd' : 'ok'}`}>
        <span className="etiket">Gecikmiş aksiyon</span>
        <span className="mono deger">{ozet.gecikmisAksiyon}</span>
        <span className="cumle">
          {ozet.gecikmisAksiyon > 0
            ? 'hedef tarihi geçmiş, hâlâ planlı veya devam eden'
            : 'hedef tarihi geçmiş aksiyon yok'}
        </span>
      </Link>
      <Link href="/denetimler" className={`kalem d-${denetimDurumu}`}>
        <span className="etiket">Yaklaşan denetim</span>
        {yaklasan === null ? (
          <>
            <span className="mono deger">—</span>
            <span className="cumle">planlı denetim yok</span>
          </>
        ) : (
          <>
            <span className="deger ad">{yaklasan.ad}</span>
            <span className="mono cumle">
              {yaklasan.kod} · {kisaTarih(yaklasan.tarih)} · {yaklasan.kalanGun} gün kaldı
              {yaklasan.kalanGun <= 7 && ' · yakın'}
            </span>
          </>
        )}
      </Link>
    </section>
  );
}

/* ── Eğilim ───────────────────────────────────────────────────────────
   Anlık görüntü yoksa çizgi de yok. Prototipte 12 aylık bir çubuk dizisi
   vardı; onu sistem saatinden türetmek "iyileşiyoruz" demek olurdu. */
function Egilim({ seri }: { seri: { etiket: string; yuzde: number }[] | null }) {
  if (!seri) {
    return (
      <p className="ab-b-egilim-yok">
        Dönemsel anlık görüntü kaydı yok — eğilim çizilemiyor.
      </p>
    );
  }
  const en = Math.max(...seri.map((s) => s.yuzde), 1);
  const son = seri[seri.length - 1];
  const ilk = seri[0];
  const fark = son.yuzde - ilk.yuzde;
  return (
    <div className="ab-b-egilim">
      <div className="cubuklar" role="img"
        aria-label={`Uyum endeksi eğilimi: ${seri.map((s) => `${s.etiket} %${s.yuzde}`).join(', ')}`}>
        {seri.map((s, i) => (
          <span key={s.etiket} className={i === seri.length - 1 ? 'son' : undefined}
            style={{ height: `${Math.max(6, (s.yuzde / en) * 100)}%` }} />
        ))}
      </div>
      <div className="mono uc">
        <span>{ilk.etiket}</span>
        <span className={fark >= 0 ? 'iyi' : 'kotu'}>
          {fark >= 0 ? '+' : ''}{fark} puan
        </span>
        <span>{son.etiket}</span>
      </div>
    </div>
  );
}

/* ── Takımyıldız ──────────────────────────────────────────────────────
   Yatay: uyum endeksi (0–100). Dikey: kurulu güç (karekök ölçek, çünkü
   1800 MW'lık bir HES ile 15 MW'lık bir GES aynı eksende doğrusal
   konursa küçükler tek şeride yığılır). */
function Takimyildizi({ santraller }: { santraller: SantralKarti[] }) {
  const olculen = santraller.filter((s) => s.endeks !== null);
  const olculmemis = santraller.filter((s) => s.endeks === null);
  const enGuc = Math.max(1, ...olculen.map((s) => s.gucMw ?? 0));

  return (
    <div className="ab-b-takim" aria-label="Santral takımyıldızı">
      <p className="etiket ust">Santraller · uyum endeksi × kurulu güç</p>
      {olculen.length === 0 ? (
        <p className="bos">Hiçbir santralde değerlendirilmiş kontrol yok.</p>
      ) : (
        <div className="ab-tuval">
          {olculen.map((s) => {
            const x = s.endeks!;
            const y = Math.sqrt((s.gucMw ?? 0) / enGuc) * 100;
            const uygunsuz = s.sayim.uyumsuz ?? 0;
            return (
              <Link key={s.id} href={`/tesisler/${s.id}`}
                className={`isaret${x > 58 ? ' sola' : ''}`}
                style={{ left: `${4 + x * 0.86}%`, bottom: `${8 + y * 0.78}%` }}>
                {uygunsuz > 0 && <span className="halka" aria-hidden />}
                <span className="kare" aria-hidden
                  style={{ background: tipRengi(s.tipKod) }} />
                <span className="kunye">
                  <span className="ad">{s.ad}</span>
                  <span className="mono alt">
                    {s.gucMw ?? '—'} MW · %{s.endeks}
                    {uygunsuz > 0 && ` · ${uygunsuz} uygunsuz`}
                  </span>
                </span>
              </Link>
            );
          })}
          <span className="eksen x" aria-hidden />
          <span className="eksen y" aria-hidden />
          <span className="mono eksenad x">uyum endeksi →</span>
          <span className="mono eksenad y">↑ kurulu güç</span>
        </div>
      )}
      {olculmemis.length > 0 && (
        <p className="mono olculmemis">
          Eksende yok · hiç değerlendirilmemiş: {olculmemis.map((s) => s.kod).join(' · ')}
        </p>
      )}
    </div>
  );
}

/* ── Üç parçalı yığın ────────────────────────────────────────────────
   Prototipte üç parça vardı (uygun · kısmi · uygunsuz). DÖRDÜNCÜ parça
   burada eklendi: bilinmeyen. Onu çubuktan düşürmek, değerlendirilmemiş
   kontrolü sessizce "uygun" saymak olurdu. */
function Yigin({ uygun, kismi, uygunsuz, bilinmeyen, tip }: {
  uygun: number; kismi: number; uygunsuz: number; bilinmeyen: number; tip: string;
}) {
  const toplam = uygun + kismi + uygunsuz + bilinmeyen;
  if (toplam === 0) {
    return <div className="ab-b-yigin bos"><span className="mono">değerlendirilmemiş</span></div>;
  }
  const p = (n: number) => `${(n / toplam) * 100}%`;
  return (
    <div className="ab-b-yigin" role="img"
      aria-label={`${uygun} uygun, ${kismi} kısmi, ${uygunsuz} uygunsuz, ${bilinmeyen} değerlendirilmedi`}>
      {uygun > 0 && <span style={{ width: p(uygun), background: uygunRengi(tip) }} />}
      {kismi > 0 && <span className="kismi" style={{ width: p(kismi) }} />}
      {uygunsuz > 0 && <span className="uygunsuz" style={{ width: p(uygunsuz) }} />}
      {bilinmeyen > 0 && <span className="bilinmeyen" style={{ width: p(bilinmeyen) }} />}
    </div>
  );
}

/* ── 5×5 risk yoğunluğu ───────────────────────────────────────────── */
function RiskIzgara({ izgara }: { izgara: RiskIzgarasi }) {
  const { hucreler, enYuksek, kritik, yuksek, olculemeyen } = izgara;
  return (
    <>
      <div className="ab-b-izgara" role="img"
        aria-label={`Risk yoğunluğu: ${kritik} kritik, ${yuksek} yüksek risk`}>
        {hucreler.map((satir, i) => satir.map((n, j) => {
          const etki = 5 - i; const olasilik = j + 1;
          const yogunluk = enYuksek === 0 ? 0 : n / enYuksek;
          return (
            <span key={`${i}-${j}`}
              className={`hucre${n > 0 && olasilik * etki >= 15 ? ' kritik' : ''}`}
              style={{ opacity: n === 0 ? 0.34 : 0.4 + yogunluk * 0.6 }}
              title={`Olasılık ${olasilik} × etki ${etki} · ${n} risk`}
            >
              {n > 0 && <span className="mono adet">{n}</span>}
            </span>
          );
        }))}
      </div>
      <div className="mono ab-b-izgara-uc">
        <span>olasılık →</span><span>↑ etki</span>
      </div>
      <p className="mono ab-b-izgara-ozet">
        {kritik} kritik · {yuksek} yüksek
        {olculemeyen > 0 && <> · <span className="unk">{olculemeyen} ölçülemedi</span></>}
      </p>
    </>
  );
}

/* ── Saha kartı ─────────────────────────────────────────────────────── */
function SahaKarti({ s }: { s: SantralKarti }) {
  const foto = kucukGorsel(s.gorselAnahtari);
  const uygunsuz = s.sayim.uyumsuz ?? 0;
  return (
    <Link href={`/tesisler/${s.id}`} className={`kart${uygunsuz > 0 ? ' uyari' : ''}`}>
      {/* Şerit hero'nun altındadır; kartlar ilk boyamayı beklemesin diye
          tembel yüklenir. Hero (`ab-b-alan`) `fetchPriority="high"` ile kalır. */}
      {foto
        // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım
        ? <img src={foto} alt="" aria-hidden loading="lazy" decoding="async" />
        : <span className="fotoyok" aria-hidden />}
      <span className="perde" aria-hidden />
      <span className="icerik">
        <span className="mono tip" style={{ color: tipRengi(s.tipKod) }}>
          {tipAdi(s.tipKod, s.tipAd)}
        </span>
        <span className="ad">{s.ad}</span>
        <span className="olcu">
          <span className="mono guc">{s.gucMw ?? '—'} MW</span>
          <span className="mono skor">{s.endeks === null ? '—' : `%${s.endeks}`}</span>
        </span>
        <Yigin uygun={s.sayim.uyumlu ?? 0} kismi={s.sayim.kismi ?? 0}
          uygunsuz={uygunsuz} bilinmeyen={s.bilinmeyen} tip={s.tipKod ?? ''} />
      </span>
    </Link>
  );
}

/* ── Akış ───────────────────────────────────────────────────────────── */
function netIslem(akis: AkisHaftasi[]): number {
  return akis.reduce((t, h) => t + h.acilan - h.kapanan, 0);
}

function Akis({ akis }: { akis: AkisHaftasi[] }) {
  const en = Math.max(1, ...akis.flatMap((h) => [h.acilan, h.kapanan]));
  return (
    <>
      <div className="ab-b-akis" role="img"
        aria-label={akis.map((h) => `${h.etiket}: ${h.acilan} açıldı, ${h.kapanan} kapandı`).join('; ')}>
        {akis.map((h) => (
          <span key={h.etiket} className="hafta">
            <span className="acilan" style={{ height: `${(h.acilan / en) * 46}px` }} />
            <span className="kapanan" style={{ height: `${(h.kapanan / en) * 46}px` }} />
          </span>
        ))}
      </div>
      <div className="mono ab-b-akis-uc">
        <span>{akis[0]?.etiket ?? ''}</span>
        <span>açılan ▲ · kapanan ▼</span>
        <span>bu hafta</span>
      </div>
    </>
  );
}
