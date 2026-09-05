'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type JSX } from 'react';
import { kucukGorsel } from '@/lib/gorsel';
import { SahaArkaPlani } from './SahaArkaPlani';
import { tipAdi, tipRengi, uygunRengi } from '@/components/kabuk/tip';
import type {
  AkisHaftasi, RiskIzgarasi, SantralKarti, TakvimKalemi, TipKatmani,
} from './veri';
import { SAHA_YERLESIM_VARSAYILAN, gorunur, kpiSirasi, type SahaYerlesimi } from '@/lib/yonetim/sahaModulleri';
import {
  OLCULMEMIS_VARSAYILAN, ozetKur, type OlculmemisGosterimi,
} from '@/lib/yonetim/olculmemisGosterimi';
import { Cekmece } from '@/components/kabuk/panel';

/* ═══════════════════════════════════════════════════════════════════════
   SAHA — ANA EKRAN · ENERGY INTELLIGENCE

   Görsel kök: `b-executive.html` (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §2);
   Eylül 2026 UX denetimi (docs/UX_DENETIM_2026-09.md §6–§8) ölçüsünü
   yeniden kurdu.

   ── TEK EKRAN SÖZLEŞMESİ ──────────────────────────────────────────────
   1366×768 / 1440×900 / 1280×800'de `scrollHeight === innerHeight`:
   kritik içerik VE santral şeridi aynı anda görünür. Denetim ölçtü:
   eski ekran 1340px'ti, şerit 795px'te başlıyordu — üç çözünürlükte de
   santral görselleri ilk ekranın altındaydı. Yükseklik bütçesi CSS'te
   (`.ab-b-saha.ab-b-genel` ızgarası: `minmax(0,1fr) auto auto`), içerik ondan taşmaz.

   Bunun için EKRANDAN ÇIKANLAR (uzman ekranlarında yaşamaya devam eder):
   · 5×5 risk ısı haritası → /riskler (Risk artık kendi alanı);
     yerinde tek satırlık özet kaldı: "N kritik · M yüksek · K ölçülemedi".
   · 90 günlük düzenleyici takvim → /denetimler (yaklaşan denetim KPI'da).
   · 12 haftalık uygunsuzluk akışı → /bulgular.
   `veri.ts` bu üçünü hesaplamaya devam eder (iş mantığı değişmedi);
   bileşen yalnız çizmez.

   ── PROTOTİPTEN AYRILAN NOKTA VE NEDENİ ───────────────────────────────
   Prototipin merkezinde Türkiye haritası ve enlem/boylama oturmuş santral
   işaretçileri var. ŞEMADA KOORDİNAT YOK — `Tesis.konum` serbest metin.
   İşaretçileri göz kararı yerleştirmek, ekranda GERÇEK OLMAYAN bir coğrafya
   çizmek olurdu. Bunun yerine aynı işaretçi grameri (45° döndürülmüş kare,
   kritikte halka, sağında iki satırlık künye) GERÇEK iki eksene oturtuldu:
   yatay uyum endeksi, dikey kurulu güç. Ölçülmemiş santral eksene KONMAZ,
   yanında kendi şeridinde listelenir (UNKNOWN ≠ ZERO).

   Kalan bölümler gerçek veriyle:
   · dikkat listesi = açık/aksiyonda bulgular, öncelik sırasıyla;
   · katmanlar = `TesisTipi` başına `uyumOzeti`;
   · eğilim = `UyumAnlik` kayıtları — yoksa ÇİZİLMEZ.

   ── BİLGİ KATMANI (Faz 3 kapanış, 2026-09) ─────────────────────────────
   Varsayılan görünümde yalnız BİRİNCİL katman yazılır: endeks, ilk 3
   müdahale, takımyıldız, 4 öncelik sayısı, santral şeridi. İKİNCİL katman
   (kontrol kodu, çerçeve, tanım cümleleri, yöntem notları, toplamlar)
   ekrandan silinmez; `title`a ve hedef ekrana taşınır. Ölçüt: "bu metin
   ilk bakışta karar verdiriyor mu?" — hayırsa varsayılan görünümde yok.
   Veri kaybı yok: aynı alanlar `title`, erişilebilir ad veya tıklama
   hedefinde durur.
   ═══════════════════════════════════════════════════════════════════════ */

const KISA_TARIH = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' });
function kisaTarih(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : KISA_TARIH.format(d).toLocaleUpperCase('tr-TR');
}

/** Son tarih cümlesi (tam, `title` için) — gecikme SÖZCÜKLE de anlatılır. */
function terminSozu(gecikmisGun: number | null, hedefTarih: string | null): string {
  if (gecikmisGun !== null) return `son tarih ${gecikmisGun} gün geçti`;
  return hedefTarih ? `son tarih ${kisaTarih(hedefTarih)}` : 'son tarih yok';
}
/** Görünür termin: yalnız karar taşıyan parça. Gecikme sözcükle ("gün
    gecikti"), plan tarihle; tarih yoksa hiç yazılmaz (tamamı `title`ta). */
function terminKisa(gecikmisGun: number | null, hedefTarih: string | null): string | null {
  if (gecikmisGun !== null) return `${gecikmisGun} gün gecikti`;
  return hedefTarih ? kisaTarih(hedefTarih) : null;
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
/** Müdahale listesinde çizilebilecek EN ÇOK bulgu; kaçının çizileceğini
    yükseklik bütçesi belirler (aşağıda `Mudahale`). Toplam başlıkta
    sayıyla durur, sığmayanlar "+N diğer" ile söylenir. */
const MUDAHALE_TAVANI = 4;
/** "+N diğer" satırının sabit yüksekliği (kabuk.css `.mudahale .kalan`:
    16px satır + 4px üst boşluk). Ölçülmez, sabit tutulur ki bütçe hesabı
    satır çizilmeden önce de doğru olsun. */
const KALAN_SATIR_PX = 20;

/* Değerlendirilmemişler GÜCE göre sıralı; gücü bilinmeyen sona düşer —
   "0 MW" diye sıralanmaz. Sıra hem özetteki ilk adlarda hem panelde
   aynıdır: kullanıcı özette gördüğü üç adı panelin başında yeniden bulur. */
function olculmemisSirali(santraller: SantralKarti[]): SantralKarti[] {
  return santraller.filter((s) => s.endeks === null)
    .sort((a, b) => (b.gucMw ?? -1) - (a.gucMw ?? -1));
}

const ONEM_SINIF: Record<string, string> = {
  kritik: 'bd', yuksek: 'bd', orta: 'md', dusuk: 'pl',
};

export default function Genel({
  bugun, ozet, odak, kuyruk, toplamKayit, kapsamli = false,
  santraller, tipler, risk, egilim, yerlesim = SAHA_YERLESIM_VARSAYILAN,
  olculmemisGosterimi = OLCULMEMIS_VARSAYILAN,
}: {
  /* Sunum katmanı yerleşimi — yönetim konsolu `saha.yerlesim` (A sınıfı).
     Yalnız `lib/yonetim/sahaModulleri.ts` beyaz listesindeki bloklar
     gizlenir/sıralanır; zorunlu yüzeyler her yerleşimde çizilir. Bölge
     düzeni (dikkat · takımyıldız · katman / KPI / şerit) SABİTTİR. */
  yerlesim?: SahaYerlesimi;
  /* Değerlendirilmemiş özetinin ayrıntı düzeyi — konsol `saha.olculmemis`
     (A sınıfı). SAYININ KENDİSİ ayara bağlı değildir; yönetilen yalnız
     ona ne kadar ayrıntı eşlik ettiğidir. */
  olculmemisGosterimi?: OlculmemisGosterimi;
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
  /* Sunucu hesaplar, ana ekran ÇİZMEZ (tek ekran sözleşmesi, yukarıda).
     Prop imzasında kalır: `page.tsx` veriyi olduğu gibi geçer, veri
     akışı değişmez. */
  takvim?: TakvimKalemi[];
  akis?: AkisHaftasi[];
  egilim: { etiket: string; yuzde: number }[] | null;
}) {
  const dikkat = odak ? [odak, ...kuyruk] : kuyruk;
  const katmanVar = gorunur(yerlesim, 'katman');
  const olculmemisSerit = olculmemisSirali(santraller);
  const [olculmemisAcik, setOlculmemisAcik] = useState(false);

  return (
    <main className="ab-b-saha ab-b-genel">
      {/* Kök ekranın görünür bir başlığı yok — fotoğrafik alan doğrudan
          açılıyor ve bu bilinçli. Ekran okuyucu için sayfanın adı yine de
          gerekli: başlıksız bir sayfada kullanıcı nerede olduğunu ve
          başlık atlamayla (H) neye gideceğini bilemez. */}
      <h1 className="ab-gizli-okuma">Saha · grup durumu ve öncelikler</h1>
      {/* ═══ Fotoğrafik alan ═══════════════════════════════════════════ */}
      <section className={`ab-b-alan${katmanVar ? '' : ' katmansiz'}`}>
        {/* Fon: 5 görsellik havuz, oturum içinde sırayla döner; dekoratif,
            işaretçi almaz. Karanlık/kontrast katmanı `.perde` ayrı durur. */}
        <SahaArkaPlani />
        <span className="perde" aria-hidden />

        {/* ── Dikkat paneli · 430px ─────────────────────────────────── */}
        <aside className="ab-b-dikkat" aria-label="Grup durumu">
          <p className="etiket">Grup durumu · {bugun}</p>
          <div className="endeks">
            <span className="sayi">{ozet.uyumYuzde === null ? '—' : `%${ozet.uyumYuzde}`}</span>
            <span className="yan">
              <span className="ad">Uyum endeksi</span>
              <span className="alt"
                title={ozet.bilinmeyenOran === null
                  ? 'Hiç değerlendirme yok — endeks hesaplanamıyor'
                  : `%${ozet.bilinmeyenOran} kontrol değerlendirilmedi; paydaya girmez (bilinmeyen ≠ sıfır)`}>
                {ozet.bilinmeyenOran === null
                  ? 'değerlendirme yok'
                  : `%${ozet.bilinmeyenOran} bilinmeyen`}
              </span>
            </span>
          </div>

          {gorunur(yerlesim, 'egilim') && <Egilim seri={egilim} />}

          <Mudahale dikkat={dikkat} toplamKayit={toplamKayit} kapsamli={kapsamli} />
        </aside>

        {/* ── Takımyıldız — koordinat DEĞİL, endeks × güç ───────────── */}
        <Takimyildizi santraller={santraller} gosterim={olculmemisGosterimi}
          serit={olculmemisSerit} panelAcik={olculmemisAcik} setPanelAcik={setOlculmemisAcik} />

        {/* ── Katman paneli · 320px — gizlenebilir (saha.yerlesim) ────── */}
        {katmanVar && (
          <aside className="ab-b-katman" aria-label="Üretim tipine göre uyum">
            <p className="etiket" title="Üretim tipine göre uyum katmanları">Üretim tipi · uyum</p>
            <div className="katmanlar">
              {tipler.length === 0 && <p className="bos">Kapsamında santral yok.</p>}
              {tipler.slice(0, KATMAN_TAVANI).map((t) => (
                <div key={t.kod} className="katman">
                  <div className="bas">
                    <span className="ad">{tipAdi(t.kod, t.ad)}</span>
                    <span className="mono deger">{t.endeks === null ? '—' : `%${t.endeks}`}</span>
                  </div>
                  <p className="mono meta" title={`${t.santralSayisi} santral · ${t.gucMw} MWe · ${t.kontrolSayisi} kontrol`}>
                    {t.santralSayisi} santral · {t.gucMw} MWe
                  </p>
                  <Yigin uygun={t.uygun} kismi={t.kismi} uygunsuz={t.uygunsuz}
                    bilinmeyen={t.bilinmeyen} tip={t.kod} kontrol={t.kontrolSayisi} />
                </div>
              ))}
              {tipler.length > KATMAN_TAVANI && (
                <p className="mono kalan">
                  {tipler.slice(KATMAN_TAVANI).map((t) => tipAdi(t.kod, t.ad)).join(' · ')}
                  {' — '}{tipler.slice(KATMAN_TAVANI).reduce((a, t) => a + t.santralSayisi, 0)} santral
                </p>
              )}
            </div>
          </aside>
        )}
      </section>

      {/* ═══ Öncelik göstergeleri ══════════════════════════════════════ */}
      <OncelikSeridi ozet={ozet} risk={risk} sira={kpiSirasi(yerlesim)} />

      {/* ═══ Saha şeridi ═══════════════════════════════════════════════ */}
      <section className="ab-b-serit" aria-label="Saha seçici">
        <header>
          {/* "Tesise geçmek için seçin · yatay kaydırın" yönlendirmesi
              kaldırıldı: kartlar bağdır, şerit kesilerek biter — davranış
              kendini gösterir; sözle tekrar karar taşımıyordu. */}
          <span className="etiket"
            title={`Saha seçici · ${ozet.tesisSayisi} üretim tesisi · ${ozet.toplamGucMw} MWe`}>
            Santraller · {ozet.tesisSayisi} · {ozet.toplamGucMw} MWe
          </span>
        </header>
        <div className="kartlar">
          {santraller.map((s) => <SahaKarti key={s.id} s={s} />)}
        </div>
      </section>

      {/* ── Değerlendirilmemiş detayı ─────────────────────────────────
          Panel BURADA, `.ab-b-alan`ın DIŞINDA çizilir ve bu zorunluluk
          ölçümle bulundu: takımyıldızın içinde çizilirken görünmüyordu.
          `.ab-b-alan > .ab-b-takim` `z-index: 1` ile kendi yığınlama
          bağlamını kurar; `position: fixed` panel o bağlamın içinde
          hapsolur ve DOM'da sonra gelen kardeş `.ab-b-katman` (aynı
          z-index) üstüne boyanır. z-index'i büyütmek çare değildir —
          çocuk, atasının bağlamından dışarı çıkamaz.

          Doklu panel, satır arası açılan bir bloğa yeğlendi: 768px'te
          genişleyen blok ızgarayı iter ve tek ekran sözleşmesini
          (`scrollHeight === innerHeight`) kırardı. Panel `fixed`tir,
          yerleşimi hiç etkilemez; arkadaki takımyıldız okunur kalır. */}
      {olculmemisAcik && olculmemisSerit.length > 0 && (
        <div id="olculmemis-panel">
          <Cekmece kod={`${olculmemisSerit.length} santral`} etiket="Değerlendirilmemiş"
            ad="Değerlendirilmemiş santraller" kapat={() => setOlculmemisAcik(false)}>
            <p className="ab-olculmemis-not">
              Bu santrallerin uyum endeksi <strong>ölçülmedi</strong> — sıfır değil.
              Güce göre sıralı; toplam{' '}
              {olculmemisSerit.reduce((a, s) => a + (s.gucMw ?? 0), 0).toFixed(1)} MWe.
            </p>
            <ul className="ab-olculmemis-liste">
              {olculmemisSerit.map((s) => (
                <li key={s.id}>
                  <Link href={`/tesisler/${s.id}`}
                    aria-label={`${s.ad} · ${s.gucMw ?? 'güç kaydı yok'} MW · değerlendirilmedi`}>
                    {/* `color` veriyoruz: tarama deseni de kenarlık da
                        `currentColor` okur, ikisi tek yerden gelsin. */}
                    <span className="kare" aria-hidden style={{ color: tipRengi(s.tipKod) }} />
                    <span className="ad">{s.ad}</span>
                    <span className="mono guc">{s.gucMw ?? '—'} MW</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Cekmece>
        </div>
      )}
    </main>
  );
}

/* ── Öncelik göstergeleri ─────────────────────────────────────────────
   Kritik risk · gecikmiş aksiyon · yaklaşan denetim · risk yoğunluğu.
   Dördü de birer BAĞDIR: sayı bir soru, hedef ekran onun cevabı. Sıfır
   ile "ölçülemedi" karışmasın diye kritik riskin yanına olasılık/etki
   girilmemiş risk sayısı ayrıca yazılır — 0 kritik risk, hiçbir riskin
   puanlanmadığı bir portföyde güven vermez.

   Dördüncü kalem eski 5×5 ısı haritasının yerini tutar: matrisin kendisi
   /riskler'de; burada yalnız üç sayısı (kritik · yüksek · ölçülemedi).
   Not: "Kritik risk" artık skor ≥ 15 sayar, ısı haritası kritiği
   olasılık × en büyük etki ≥ 15 sayar — iki farklı tanım, iki farklı
   kalem; birleştirilmez. */
function OncelikSeridi({ ozet, risk, sira }: { ozet: Ozet; risk: RiskIzgarasi; sira: string[] }) {
  const yaklasan = ozet.yaklasanDenetim;
  const olculemeyenRisk = risk.olculemeyen;
  /* Yakınlık sözcükle: "≤ 7 gün" alarmı renkten önce metinde durur. */
  const denetimDurumu = yaklasan === null ? 'unk' : yaklasan.kalanGun <= 7 ? 'md' : 'pl';
  const yogunlukDurumu = risk.kritik > 0 ? 'bd' : risk.yuksek > 0 ? 'md' : olculemeyenRisk > 0 ? 'unk' : 'ok';

  /* Kalemler kimlikle tanımlı (`lib/yonetim/sahaModulleri.ts` KPI kütüğü);
     sıra ve görünürlük `sira` ile gelir — konsol yalnız bu iki şeyi yönetir,
     kalemin durum semantiği ve hedefi burada kalır. Kalem sayısı sütun
     sayısını verir (`k3`, `k2`): şerit tek satırda kalır. */
  const kalemler: Record<string, JSX.Element> = {
    kpiKritikRisk: (
      <Link key="kpiKritikRisk" href="/riskler"
        className={`kalem d-${ozet.kritikRisk > 0 ? 'bd' : olculemeyenRisk > 0 ? 'unk' : 'ok'}`}
        title={`Artık skor ≥ 15 · açık veya işlemde${olculemeyenRisk > 0 ? ` · ${olculemeyenRisk} risk ölçülemedi (olasılık/etki girilmemiş)` : ''}`}>
        <span className="etiket">Kritik risk</span>
        <span className="mono deger">{ozet.kritikRisk}</span>
        {olculemeyenRisk > 0 && (
          <span className="cumle"><span className="unk">{olculemeyenRisk} ölçülemedi</span></span>
        )}
      </Link>
    ),
    kpiGecikmisAksiyon: (
      <Link key="kpiGecikmisAksiyon" href="/bulgular" className={`kalem d-${ozet.gecikmisAksiyon > 0 ? 'bd' : 'ok'}`}
        title={ozet.gecikmisAksiyon > 0
          ? 'Hedef tarihi geçmiş, hâlâ planlı veya devam eden aksiyonlar'
          : 'Hedef tarihi geçmiş aksiyon yok'}>
        <span className="etiket">Gecikmiş aksiyon</span>
        <span className="mono deger">{ozet.gecikmisAksiyon}</span>
      </Link>
    ),
    kpiYaklasanDenetim: (
      <Link key="kpiYaklasanDenetim" href="/denetimler" className={`kalem d-${denetimDurumu}`}
        title={yaklasan === null
          ? 'Planlı denetim yok'
          : `${yaklasan.ad} · ${yaklasan.kod} · ${kisaTarih(yaklasan.tarih)} · ${yaklasan.kalanGun} gün kaldı`}>
        <span className="etiket">Yaklaşan denetim</span>
        {yaklasan === null ? (
          <>
            <span className="mono deger">—</span>
            <span className="cumle">planlı denetim yok</span>
          </>
        ) : (
          <>
            {/* Değer gün sayısı (sayı kanalı); ad ve tarih cümlede, kod
                `title`ta. Uzun ad cümle sonundan kırpılır — sayı hiç kırpılmaz. */}
            <span className="mono deger">
              {yaklasan.kalanGun}<span className="birim"> gün</span>
            </span>
            <span className="cumle">
              {yaklasan.ad} · <span className="mono">{kisaTarih(yaklasan.tarih)}</span>
            </span>
          </>
        )}
      </Link>
    ),
    kpiRiskYogunlugu: (
      <Link key="kpiRiskYogunlugu" href="/riskler" className={`kalem d-${yogunlukDurumu}`}
        title={`Olasılık × etki matrisi Risk alanında${olculemeyenRisk > 0 ? ` · ${olculemeyenRisk} risk ölçülemedi` : ''}`}>
        <span className="etiket">Risk yoğunluğu</span>
        <span className="mono deger">
          {risk.kritik}<span className="birim"> kritik</span>
          {' · '}{risk.yuksek}<span className="birim"> yüksek</span>
        </span>
        {olculemeyenRisk > 0 && (
          <span className="cumle"><span className="unk">{olculemeyenRisk} ölçülemedi</span></span>
        )}
      </Link>
    ),
  };
  const gorunen = sira.filter((id) => id in kalemler);
  if (gorunen.length === 0) return null;
  return (
    <section className={`ab-kpi${gorunen.length < 4 ? ` k${gorunen.length}` : ''}`} aria-label="Öncelik göstergeleri">
      {/* Cümle satırı yalnız KARAR taşıyan parçayı yazar: "ölçülemedi"
          (bilinmeyen ≠ sıfır) ve denetimin adı/tarihi. Tanım cümleleri
          ("artık skor ≥ 15", "hedef tarihi geçmiş...", "olasılık × etki")
          `title`a taşındı — ilk bakışta karar verdirmiyordu. */}
      {gorunen.map((id) => kalemler[id])}
    </section>
  );
}

/* ── Eğilim ───────────────────────────────────────────────────────────
   Anlık görüntü yoksa çizgi de yok. Prototipte 12 aylık bir çubuk dizisi
   vardı; onu sistem saatinden türetmek "iyileşiyoruz" demek olurdu. */
function Egilim({ seri }: { seri: { etiket: string; yuzde: number }[] | null }) {
  if (!seri) {
    return (
      <p className="ab-b-egilim-yok" title="Dönemsel anlık görüntü kaydı yok — eğilim çizilemiyor; sistem saatinden türetilmez">
        Eğilim · kayıt yok
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
   konursa küçükler tek şeride yığılır).

   ── DEĞERLENDİRİLMEMİŞ ŞERİDİ ─────────────────────────────────────────
   Hiç değerlendirilmemiş santralin uyum endeksi YOKTUR. Onu ekseninde
   bir yere koymak — 0'a, ortalamaya, herhangi bir yere — uydurmaktır ve
   "bilinmeyen ≠ sıfır" kuralının en pahalı ihlali olurdu: %0 uyumlu
   görünen bir santral, aslında henüz hiç bakılmamış santraldir.

   Bunlar önceden tuvalin ALTINDA düz bir kod dizisiydi; on bir santral,
   yani portföyün üçte ikisi, ana ekranda görünmüyordu. Artık tuvalin
   İÇİNDE, eksenin solunda kendi şeridinde duruyorlar.

   Şerit ÖLÇEKLİ DEĞİL SIRALIDIR ve bu bilinçli bir karardır. Önce güce
   göre ölçekli denendi ve ölçüldü: değerlendirilmemiş on bir santralin
   dokuzu 15–25 MW bandında toplanıyor, künyeler üst üste biniyor ve
   yirmi sekiz çakışma çıkıyordu — yani "gerçek dikey konum" okunabilir
   hiçbir şey üretmiyordu. Şimdi güce göre sıralı, eşit aralıklı
   duruyorlar; SIRA gerçektir, büyüklük künyede rakamla yazılıdır.
   Şerit başlığı da "güce göre sıralı" der, "ölçekli" demez.

   Kalan iki kural:
     · YATAY konum yoktur; şerit eksenin dışındadır ve kesik çizgiyle
       ayrılır.
     · İşaret dolu değil TARALIDIR: ürünün "değerlendirilmedi" glifiyle
       aynı dil (bkz. DESIGN.md · glif ailesi). Renk tipten gelir ki
       hangi üretim tipinin bakılmadığı görünsün. */

/* ═══ Müdahale gerektirenler — yükseklik bütçesine göre kalem sayısı ═══
   Dikkat paneli tek ekran sözleşmesiyle sabit yüksekliktedir; liste
   artan yeri alır. Eskiden tavan (4) her çözünürlükte çiziliyor, sığmayan
   kalem kutunun altında KIRPILIYORDU (1366×768'de 3. kalemin meta satırı
   43px dışarıdaydı — Eylül 2026 kabul turu). Kural: içerik kesilmez;
   sığmayan kalem çizilmez, "+N diğer" ile söylenir.

   Yöntem: kalemler çizilir, ResizeObserver kutunun yüksekliğini ve
   kalemlerin alt kenarını ölçer; alt kenarı (gerekirse "+N diğer" satırı
   da hesaba katılarak) kutuya sığan EN ÇOK kalem kalır. Sığmayan kalem
   `display:none` DEĞİL, akıştan çıkarılıp görünmez tutulur (`.gizli`):
   yüksekliği ölçülebilir kalır, alan büyüyünce (1440×900) ya da yazı
   tipi geç yüklenip satır sayısı değişince hesap güncel kalır. Yazı tipi
   yüklenmesi de yeniden hesap tetikler. En az bir kalem her zaman
   çizilir. Durum yalnız geri çağrılarda değişir (render/etkide setState
   yok). */
function Mudahale({ dikkat, toplamKayit, kapsamli }: {
  dikkat: Kayit[]; toplamKayit: number; kapsamli: boolean;
}) {
  const kutu = useRef<HTMLDivElement>(null);
  const [gorunen, setGorunen] = useState(MUDAHALE_TAVANI);
  const cizilecek = Math.min(dikkat.length, MUDAHALE_TAVANI);

  useEffect(() => {
    const el = kutu.current;
    if (!el || cizilecek === 0) return;
    const hesapla = () => {
      const kutuR = el.getBoundingClientRect();
      const kalemler = [...el.querySelectorAll<HTMLElement>('.kalem')];
      /* Alt kenar, kutu üstüne göre. Görünen kalemde doğrudan ölçülür;
         gizli kalem akış dışıdır, bir öncekinin altına kendi yüksekliği
         eklenir (üst kenarlık dahil, offsetHeight). */
      let alt = 0;
      let sigan = 1;
      kalemler.forEach((k, i) => {
        alt = k.classList.contains('gizli')
          ? alt + k.offsetHeight
          : k.getBoundingClientRect().bottom - kutuR.top;
        if (i === 0) return;
        const kalanPay = toplamKayit > i + 1 ? KALAN_SATIR_PX : 0;
        if (sigan === i && alt + kalanPay <= kutuR.height) sigan = i + 1;
      });
      setGorunen((eski) => (eski === sigan ? eski : sigan));
    };
    const gozle = new ResizeObserver(hesapla);
    gozle.observe(el);
    let gecerli = true;
    document.fonts?.ready.then(() => { if (gecerli) hesapla(); });
    return () => { gecerli = false; gozle.disconnect(); };
  }, [cizilecek, toplamKayit]);

  const kalan = toplamKayit - Math.min(gorunen, cizilecek);
  return (
    <div className="mudahale" ref={kutu}>
      <div className="bas">
        <span className="etiket">Müdahale gerektirenler</span>
        <span className="mono adet">{toplamKayit}</span>
      </div>
      {cizilecek === 0 ? (
        <p className="bos">
          {kapsamli
            ? 'Kapsamındaki santrallerde açık bulgu yok.'
            : 'Açık bulgu yok.'}
        </p>
      ) : dikkat.slice(0, cizilecek).map((b, i) => (
        <Link key={b.id} href={`/bulgular/${b.id}`}
          className={`kalem${i >= gorunen ? ' gizli' : ''}`}
          aria-hidden={i >= gorunen || undefined} tabIndex={i >= gorunen ? -1 : undefined}>
          <span className={`sap ${ONEM_SINIF[b.onem] ?? 'pl'}`} aria-hidden />
          <span className="govde">
            <span className="konu">{b.baslik}</span>
            {/* Tek satır: tesis · termin. Kontrol kodu ve çerçeve karar
                taşımaz, `title`a taşındı (bulgu ekranında tam). Gecikme
                sözcükle ("gün gecikti"), salt renkle değil. */}
            <span className="mono meta"
              title={`${b.tesisAd} · ${terminSozu(b.gecikmisGun, b.hedefTarih)} · ${b.kontrolKodu} · ${b.cerceve}`}>
              {b.tesisAd}
              {terminKisa(b.gecikmisGun, b.hedefTarih) && ` · ${terminKisa(b.gecikmisGun, b.hedefTarih)}`}
            </span>
          </span>
          <span className="sira" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
        </Link>
      ))}
      {cizilecek > 0 && kalan > 0 && (
        <Link href="/bulgular" className="mono kalan" title={`${kalan} bulgu daha · bulgular ekranı`}>+{kalan} diğer →</Link>
      )}
    </div>
  );
}

function Takimyildizi({ santraller, gosterim = OLCULMEMIS_VARSAYILAN, serit, panelAcik, setPanelAcik }: {
  santraller: SantralKarti[];
  /** Değerlendirilmemiş özetinin ayrıntı düzeyi — konsol `saha.olculmemis`. */
  gosterim?: OlculmemisGosterimi;
  /* Liste ve panelin AÇIKLIĞI yukarıda tutulur. Sebep ölçüldü: panel bu
     bileşenin içinde çizilirken görünmüyordu — `.ab-b-takim` `z-index: 1`
     ile kendi YIĞINLAMA BAĞLAMINI kurar ve `position: fixed` panel o
     bağlamın içinde kalır; DOM'da sonra gelen kardeş `.ab-b-katman` (aynı
     z-index) onun üstüne boyanır. Panel `.ab-b-alan`ın DIŞINDA, `Genel`in
     kökünde çizilerek bağlamdan çıkarıldı. */
  serit: SantralKarti[];
  panelAcik: boolean;
  setPanelAcik: (a: boolean) => void;
}) {
  const olculen = santraller.filter((s) => s.endeks !== null);
  const olculmemis = santraller.filter((s) => s.endeks === null);
  /* Ölçek TÜM portföyden gelir: eksen ve panel aynı dikey ölçeği
     paylaşmazsa iki taraf karşılaştırılamaz hâle gelir. */
  const enGuc = Math.max(1, ...santraller.map((s) => s.gucMw ?? 0));
  const dikey = (s: SantralKarti) => 8 + Math.sqrt((s.gucMw ?? 0) / enGuc) * 100 * 0.78;
  const mweToplam = olculmemis.reduce((a, s) => a + (s.gucMw ?? 0), 0).toFixed(1);
  const { gosterilen: ilkAdlar, kalan } = ozetKur(serit.map((s) => s.ad), gosterim);

  /* Künye çakışması — ÖLÇÜLDÜ, varsayılmadı: Kızıldere III (%56 · 165 MW)
     ile Gökçedağ (%67 · 135 MW) dikeyde 31px, künye ise 28px yüksek;
     ikisi birbirinin üstüne biniyordu. Nokta yerini DEĞİŞTİRMEK veriyi
     bozar, o yüzden yalnız künye kayar: yakın komşusu olan işaret
     künyesini işaretin altına açar. */
  const kaydir = olculen.map((s, i) => olculen.some((o, j) => (
    j < i
    && Math.abs((o.endeks ?? 0) - (s.endeks ?? 0)) < 20
    && Math.abs(dikey(o) - dikey(s)) < 11
  )));
  /* Eksene yakın işaretin künyesi YUKARI açılır: "Zorlu Enerji Genel Müdürlük" (0 MW)
     künyesi x ekseninin adıyla üst üste biniyordu (ölçüldü, 1366×768).
     Eşik %14 = künye yüksekliği (28px) / tuval yüksekliği (~300px) payı. */
  const yukari = (s: SantralKarti) => dikey(s) < 14;

  return (
    <div className="ab-b-takim" aria-label="Santral takımyıldızı">
      {/* Yön bilgisi ÜÇ kanaldan söyleniyordu (başlık kuyruğu, eksen
          adları, hedef köşesi); ikisi kaldı: eksen okları ("uyum endeksi →",
          "↑ kurulu güç") ve "↗ güçlü ve uyumlu" köşesi. Başlık kuyruğu
          `title`a taşındı — aynı bilgi, bir kez. */}
      {/* Başlık ve değerlendirilmemiş özeti AYNI satırda: özet ayrı bir
          satıra inseydi tuvalden ~42px yükseklik alırdı ve 768px'te künye
          çakışması ölçülen bir risk. Burada yükseklik maliyeti yok, tuval
          hem enine (eski 176px kolon kalktı) hem boyuna kazanıyor. */}
      <div className="ab-takim-bas">
        <p className="etiket ust" title="Yatay: uyum endeksi (sağa → daha uyumlu) · Dikey: kurulu güç (yukarı ↑ daha büyük)">
          Santraller · uyum × güç
        </p>
        {olculmemis.length > 0 && (
          /* Özet satırı: sayı ÖNCE ve tek başına okunur; oran ("11/16")
             sayının söylemediğini söyler — portföyün üçte ikisi hiç
             ölçülmemiş. Adlar ikincil mürekkeple, tek satırda, sığdığı
             kadar. Uzun yöntem notu `title`ta kalır, ekranda değil. */
          <div className="ab-olculmemis">
            <span className="im" aria-hidden style={{ color: 'var(--i3)' }} />
            <span className="ad">Değerlendirilmemiş</span>
            <span className="sayi mono"
              title={`${olculmemis.length} santralin uyum endeksi ölçülmedi — sıfır değil. Toplam ${mweToplam} MWe.`}>
              {olculmemis.length}<span className="bolu">/{santraller.length}</span>
            </span>
            <span className="mwe mono">{mweToplam} MWe</span>
            {ilkAdlar.length > 0 && (
              <span className="adlar">{ilkAdlar.join(' · ')}</span>
            )}
            {gosterim.detay === 'panel' ? (
              <button type="button" className="ab-olculmemis-ac"
                aria-expanded={panelAcik} aria-controls="olculmemis-panel"
                onClick={() => setPanelAcik(!panelAcik)}>
                {kalan > 0 ? `+${kalan} diğer` : 'listeyi aç'}
              </button>
            ) : (
              /* Detay kapalıyken "+N diğer" bir DÜĞME olamaz: açacağı
                 yer yok. Sayı yine de söylenir, sessizce düşmez. */
              kalan > 0 && <span className="kalan mono">+{kalan} diğer</span>
            )}
          </div>
        )}
      </div>
      {santraller.length === 0 ? (
        <p className="bos">Kapsamda santral yok.</p>
      ) : (
        <div className="ab-tuval-sar">
          <div className="ab-tuval">
            {olculen.map((s, i) => {
              const x = s.endeks!;
              const uygunsuz = s.sayim.uyumsuz ?? 0;
              return (
                <Link key={s.id} href={`/tesisler/${s.id}`}
                  title={`${s.ad} · ${s.gucMw ?? '—'} MW · %${s.endeks}${uygunsuz > 0 ? ` · ${uygunsuz} uygunsuz` : ''}`}
                  /* Odak sırası: uygunsuzu olan santral öne (`oncelik`, tam
                     mürekkep + halka), temiz olan arkaya (ikincil mürekkep).
                     Künye yönü: %58'in sağında sola, komşusu varsa alta,
                     eksene yakınsa üste; `sola-dar` dar bantta erken sola
                     (kabuk.css, medya). */
                  className={`isaret${x > 58 ? ' sola' : ''}${x > 40 ? ' sola-dar' : ''}${
                    uygunsuz > 0 ? ' oncelik' : ''}${
                    yukari(s) ? ' kunye-yukari' : kaydir[i] ? ' kunye-asagi' : ''}`}
                  style={{ left: `${4 + x * 0.86}%`, bottom: `${dikey(s)}%` }}>
                  {uygunsuz > 0 && <span className="halka" aria-hidden />}
                  <span className="kare" aria-hidden
                    style={{ background: tipRengi(s.tipKod) }} />
                  <span className="kunye">
                    <span className="ad">{s.ad}</span>
                    {/* Güç dikey eksende ve kartta okunur; künye yalnız
                        endeks ve uygunsuz sayısını yazar (MW `title`ta). */}
                    <span className="mono alt">
                      %{s.endeks}
                      {uygunsuz > 0 && ` · ${uygunsuz} uygunsuz`}
                    </span>
                  </span>
                </Link>
              );
            })}
            <span className="eksen x" aria-hidden />
            <span className="eksen y" aria-hidden />
            {/* Eksen adı ORTADA, uçlarda %0 / %100 çentikleri: eksenin
                ne ölçtüğü ilk bakışta; sağ üst köşe hedef bölgeyi adlandırır.
                Hepsi mevcut tuvalin içinde, yükseklik bütçesi değişmez. */}
            <span className="mono centik c0" aria-hidden>%0</span>
            <span className="mono centik c100" aria-hidden>%100</span>
            <span className="mono eksenad x">uyum endeksi →</span>
            <span className="mono eksenad y">↑ kurulu güç</span>
            <span className="mono hedef" aria-hidden>↗ güçlü ve uyumlu</span>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Üç parçalı yığın ────────────────────────────────────────────────
   Prototipte üç parça vardı (uygun · kısmi · uygunsuz). DÖRDÜNCÜ parça
   burada eklendi: bilinmeyen. Onu çubuktan düşürmek, değerlendirilmemiş
   kontrolü sessizce "uygun" saymak olurdu. */
function Yigin({ uygun, kismi, uygunsuz, bilinmeyen, tip, kontrol }: {
  uygun: number; kismi: number; uygunsuz: number; bilinmeyen: number; tip: string;
  /** toplam kontrol sayısı — yalnız `title`ta */
  kontrol?: number;
}) {
  const toplam = uygun + kismi + uygunsuz + bilinmeyen;
  if (toplam === 0) {
    /* Sözcük yok: taralı çubuk ürünün "değerlendirilmedi" glifidir ve
       kartta skor zaten "—". On bir kartta aynı sözcüğü yazmak metin
       duvarıydı; erişilebilir ad ve `title` sözcüğü taşır. */
    return <div className="ab-b-yigin bos" role="img" aria-label="değerlendirilmemiş" title="Değerlendirilmemiş — endeks ölçülmedi, sıfır değil" />;
  }
  const p = (n: number) => `${(n / toplam) * 100}%`;
  const soz = `${uygun} uygun, ${kismi} kısmi, ${uygunsuz} uygunsuz, ${bilinmeyen} değerlendirilmedi`;
  return (
    <div className="ab-b-yigin" role="img" aria-label={soz}
      title={kontrol !== undefined ? `${kontrol} kontrol · ${soz}` : soz}>
      {uygun > 0 && <span style={{ width: p(uygun), background: uygunRengi(tip) }} />}
      {kismi > 0 && <span className="kismi" style={{ width: p(kismi) }} />}
      {uygunsuz > 0 && <span className="uygunsuz" style={{ width: p(uygunsuz) }} />}
      {bilinmeyen > 0 && <span className="bilinmeyen" style={{ width: p(bilinmeyen) }} />}
    </div>
  );
}

/* ── Saha kartı ─────────────────────────────────────────────────────── */
function SahaKarti({ s }: { s: SantralKarti }) {
  const foto = kucukGorsel(s.gorselAnahtari);
  const uygunsuz = s.sayim.uyumsuz ?? 0;
  return (
    <Link href={`/tesisler/${s.id}`} className={`kart${uygunsuz > 0 ? ' uyari' : ''}`}>
      {/* Şerit hero'nun altındadır; kartlar ilk boyamayı beklemesin diye
          tembel yüklenir. Hero fonu (`SahaArkaPlani`) `fetchPriority="high"` ile kalır. */}
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
