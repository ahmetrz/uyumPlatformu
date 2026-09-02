'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { NOTR_TRIPTIK, kucukGorsel } from '@/lib/gorsel';
import { tipAdi, tipRengi, uygunRengi } from '@/components/kabuk/tip';
import type {
  AkisHaftasi, RiskIzgarasi, SantralKarti, TakvimKalemi, TipKatmani,
} from './veri';

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
/** Müdahale listesinde çizilebilecek EN ÇOK bulgu; kaçının çizileceğini
    yükseklik bütçesi belirler (aşağıda `Mudahale`). Toplam başlıkta
    sayıyla durur, sığmayanlar "+N diğer" ile söylenir. */
const MUDAHALE_TAVANI = 4;
/** "+N diğer" satırının sabit yüksekliği (kabuk.css `.mudahale .kalan`:
    16px satır + 4px üst boşluk). Ölçülmez, sabit tutulur ki bütçe hesabı
    satır çizilmeden önce de doğru olsun. */
const KALAN_SATIR_PX = 20;

const ONEM_SINIF: Record<string, string> = {
  kritik: 'bd', yuksek: 'bd', orta: 'md', dusuk: 'pl',
};

export default function Genel({
  bugun, ozet, odak, kuyruk, toplamKayit, kapsamli = false,
  santraller, tipler, risk, egilim,
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
  /* Sunucu hesaplar, ana ekran ÇİZMEZ (tek ekran sözleşmesi, yukarıda).
     Prop imzasında kalır: `page.tsx` veriyi olduğu gibi geçer, veri
     akışı değişmez. */
  takvim?: TakvimKalemi[];
  akis?: AkisHaftasi[];
  egilim: { etiket: string; yuzde: number }[] | null;
}) {
  const dikkat = odak ? [odak, ...kuyruk] : kuyruk;

  return (
    <main className="ab-b-saha ab-b-genel">
      {/* Kök ekranın görünür bir başlığı yok — fotoğrafik alan doğrudan
          açılıyor ve bu bilinçli. Ekran okuyucu için sayfanın adı yine de
          gerekli: başlıksız bir sayfada kullanıcı nerede olduğunu ve
          başlık atlamayla (H) neye gideceğini bilemez. */}
      <h1 className="ab-gizli-okuma">Saha · grup durumu ve öncelikler</h1>
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

          <Mudahale dikkat={dikkat} toplamKayit={toplamKayit} kapsamli={kapsamli} />
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
        </aside>
      </section>

      {/* ═══ Öncelik göstergeleri ══════════════════════════════════════ */}
      <OncelikSeridi ozet={ozet} risk={risk} />

      {/* ═══ Saha şeridi ═══════════════════════════════════════════════ */}
      <section className="ab-b-serit" aria-label="Saha seçici">
        <header>
          <span className="etiket">
            Saha seçici · {ozet.tesisSayisi} üretim tesisi · {ozet.toplamGucMw} MWe
          </span>
          <span className="etiket sag">
            Tesise geçmek için seçin
            {santraller.length > 6 && ' · yatay kaydırın'}
          </span>
        </header>
        <div className="kartlar">
          {santraller.map((s) => <SahaKarti key={s.id} s={s} />)}
        </div>
      </section>

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
function OncelikSeridi({ ozet, risk }: { ozet: Ozet; risk: RiskIzgarasi }) {
  const yaklasan = ozet.yaklasanDenetim;
  const olculemeyenRisk = risk.olculemeyen;
  /* Yakınlık sözcükle: "≤ 7 gün" alarmı renkten önce metinde durur. */
  const denetimDurumu = yaklasan === null ? 'unk' : yaklasan.kalanGun <= 7 ? 'md' : 'pl';
  const yogunlukDurumu = risk.kritik > 0 ? 'bd' : risk.yuksek > 0 ? 'md' : olculemeyenRisk > 0 ? 'unk' : 'ok';
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
            {/* Değer gün sayısı (sayı kanalı), ad ve kod cümlede: tek ekran
                bütçesinde 62px'lik kalemde uzun denetim adı kırpılıyordu
                (ölçüldü: "ISO 27001 Gö…" 1366'da). Ad tam yazılır, gerekirse
                cümle sonu kırpılır — sayı hiç kırpılmaz. */}
            <span className="mono deger">
              {yaklasan.kalanGun}<span className="birim"> gün</span>
            </span>
            <span className="cumle">
              {yaklasan.ad} · <span className="mono">{yaklasan.kod} · {kisaTarih(yaklasan.tarih)}</span>
              {yaklasan.kalanGun <= 7 && ' · yakın'}
            </span>
          </>
        )}
      </Link>
      <Link href="/riskler" className={`kalem d-${yogunlukDurumu}`}>
        <span className="etiket">Risk yoğunluğu</span>
        <span className="mono deger">
          {risk.kritik}<span className="birim"> kritik</span>
          {' · '}{risk.yuksek}<span className="birim"> yüksek</span>
        </span>
        <span className="cumle">
          olasılık × etki matrisi Risk alanında
          {olculemeyenRisk > 0 && <> · <span className="unk">{olculemeyenRisk} ölçülemedi</span></>}
        </span>
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
            {/* Tek satır, uzunu üç noktayla biter (kabuk.css). Sıra:
                tesis · termin · kontrol kodu — kesilen parça en az karar
                taşıyan kod olur; termin (gecikme sözcükle) görünür kalır.
                Tamamı `title`ta. */}
            <span className="mono meta"
              title={`${b.tesisAd} · ${terminSozu(b.gecikmisGun, b.hedefTarih)} · ${b.kontrolKodu}`}>
              {b.tesisAd} · {terminSozu(b.gecikmisGun, b.hedefTarih)} · {b.kontrolKodu}
            </span>
          </span>
          <span className="sira" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
        </Link>
      ))}
      {cizilecek > 0 && kalan > 0 && (
        <Link href="/bulgular" className="mono kalan">+{kalan} diğer · bulgular</Link>
      )}
    </div>
  );
}

function Takimyildizi({ santraller }: { santraller: SantralKarti[] }) {
  const olculen = santraller.filter((s) => s.endeks !== null);
  const olculmemis = santraller.filter((s) => s.endeks === null);
  /* Ölçek TÜM portföyden gelir: şerit ile eksen aynı dikey ölçeği
     paylaşmazsa iki taraf karşılaştırılamaz hâle gelir. */
  const enGuc = Math.max(1, ...santraller.map((s) => s.gucMw ?? 0));
  const dikey = (s: SantralKarti) => 8 + Math.sqrt((s.gucMw ?? 0) / enGuc) * 100 * 0.78;
  /* Şerit güce göre SIRALI (yukarıdaki nota bakın); gücü bilinmeyen
     sona düşer — "0 MW" diye sıralanmaz. */
  const serit = [...olculmemis].sort((a, b) => (b.gucMw ?? -1) - (a.gucMw ?? -1));

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
  /* Eksene yakın işaretin künyesi YUKARI açılır: "Zorlu Center" (0 MW)
     künyesi x ekseninin adıyla üst üste biniyordu (ölçüldü, 1366×768).
     Eşik %14 = künye yüksekliği (28px) / tuval yüksekliği (~300px) payı. */
  const yukari = (s: SantralKarti) => dikey(s) < 14;

  return (
    <div className="ab-b-takim" aria-label="Santral takımyıldızı">
      {/* Okuma anahtarı başlığın içinde, tek satır: eksen adları tek başına
          "ne iyi" sorusunu yanıtlamıyordu (ürün sahibi kabulü 2026-09,
          madde 5). Yeni modül değil, başlığın kuyruğu. */}
      <p className="etiket ust">
        Santraller · uyum endeksi × kurulu güç
        <span className="okuma">sağa → daha uyumlu · yukarı ↑ daha büyük güç</span>
      </p>
      {santraller.length === 0 ? (
        <p className="bos">Kapsamda santral yok.</p>
      ) : (
        <div className="ab-tuval-sar">
          {olculmemis.length > 0 && (
            <div className="serit">
              <p className="mono serit-bas">
                değerlendirilmemiş
                <span className="alt">güce göre sıralı</span>
              </p>
              {serit.map((s) => (
                <Link key={s.id} href={`/tesisler/${s.id}`} className="kalem"
                  /* Durum sözcüğü şeridin BAŞLIĞINDA bir kez yazılır; her
                     satırda tekrarlamak on bir kez aynı şeyi söylemekti.
                     Ekran okuyucu için bağın erişilebilir adına giriyor —
                     görsel kısalık, sözlü eksiklik demek değil. */
                  aria-label={`${s.ad} · ${s.gucMw ?? 'güç kaydı yok'} MW · değerlendirilmedi`}>
                  {/* `color` veriyoruz: tarama deseni de kenarlık da
                      `currentColor` okur, ikisi tek yerden gelsin. */}
                  <span className="kare" aria-hidden
                    style={{ color: tipRengi(s.tipKod) }} />
                  <span className="ad">{s.ad}</span>
                  <span className="mono guc">{s.gucMw ?? '—'} MW</span>
                </Link>
              ))}
            </div>
          )}

          <div className="ab-tuval">
            {olculen.map((s, i) => {
              const x = s.endeks!;
              const uygunsuz = s.sayim.uyumsuz ?? 0;
              return (
                <Link key={s.id} href={`/tesisler/${s.id}`}
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
      {olculmemis.length > 0 && (
        <p className="mono olculmemis-not">
          {/* Yön adı YAZILMAZ: şerit geniş bantta solda, dar bantta
              tuvalin altındadır. TEK satır: yükseklik bütçesi (tek ekran
              sözleşmesi) ikinci satırı karşılamaz. */}
          Değerlendirilmemiş · {olculmemis.length} santral ·
          {` ${olculmemis.reduce((a, s) => a + (s.gucMw ?? 0), 0).toFixed(1)} MWe`}
          {' · endeks ölçülmedi, sıfır değil'}
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
