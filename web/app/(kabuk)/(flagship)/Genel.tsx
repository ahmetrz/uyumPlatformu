'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type JSX } from 'react';
import { kucukGorsel } from '@/lib/gorsel';
import { SahaArkaPlani } from './SahaArkaPlani';
import { kunyeYollari } from './kunyeYolu';
import { centikYazi, eksenPenceresi, pencereOrani } from './eksenPenceresi';
import { tipEtiketleri } from './tipEtiketi';
import { tipAdi, tipRengi, uygunRengi } from '@/components/kabuk/tip';
import type {
  AkisHaftasi, RiskIzgarasi, TesisKarti, TakvimKalemi, TipKatmani,
} from './veri';
import { SAHA_YERLESIM_VARSAYILAN, gorunur, kpiSirasi, type SahaYerlesimi } from '@/lib/yonetim/sahaModulleri';
import {
  OLCULMEMIS_VARSAYILAN, ozetKur, type OlculmemisGosterimi,
} from '@/lib/yonetim/olculmemisGosterimi';
import { Cekmece } from '@/components/kabuk/panel';
import { birimliToplam, olculenYazi } from '@/lib/alan/oznitelik';
import { useTerim } from '@/lib/dil/SozlukSaglayici';

/* ═══════════════════════════════════════════════════════════════════════
   SAHA — ANA EKRAN · ENERGY INTELLIGENCE

   Görsel kök: `b-executive.html` (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §2);
   Eylül 2026 UX denetimi (#65 · envanter ve audit; ayrı belge yok, ölçüm
   PR gövdelerinde durur) ölçüsünü yeniden kurdu.

   ── TEK EKRAN SÖZLEŞMESİ ──────────────────────────────────────────────
   1366×768 / 1440×900 / 1280×800'de `scrollHeight === innerHeight`:
   kritik içerik VE tesis şeridi aynı anda görünür. Denetim ölçtü:
   eski ekran 1340px'ti, şerit 795px'te başlıyordu — üç çözünürlükte de
   tesis görselleri ilk ekranın altındaydı. Yükseklik bütçesi CSS'te
   (`.ab-b-saha.ab-b-genel` ızgarası: `minmax(0,1fr) auto auto`), içerik ondan taşmaz.

   Bunun için EKRANDAN ÇIKANLAR (uzman ekranlarında yaşamaya devam eder):
   · 5×5 risk ısı haritası → /riskler (Risk artık kendi alanı);
     yerinde tek satırlık özet kaldı: "N kritik · M yüksek · K ölçülemedi".
   · 90 günlük düzenleyici takvim → /denetimler (yaklaşan denetim KPI'da).
   · 12 haftalık uygunsuzluk akışı → /bulgular.
   `veri.ts` bu üçünü hesaplamaya devam eder (iş mantığı değişmedi);
   bileşen yalnız çizmez.

   ── PROTOTİPTEN AYRILAN NOKTA VE NEDENİ ───────────────────────────────
   Prototipin merkezinde Türkiye haritası ve enlem/boylama oturmuş tesis
   işaretçileri var. ŞEMADA KOORDİNAT YOK — `Tesis.konum` serbest metin.
   İşaretçileri göz kararı yerleştirmek, ekranda GERÇEK OLMAYAN bir coğrafya
   çizmek olurdu. Bunun yerine aynı işaretçi grameri (45° döndürülmüş kare,
   kritikte halka, sağında iki satırlık künye) GERÇEK iki eksene oturtuldu:
   yatay uyum endeksi, dikey kurulu güç. Ölçülmemiş tesis eksene KONMAZ,
   yanında kendi şeridinde listelenir (UNKNOWN ≠ ZERO).

   Kalan bölümler gerçek veriyle:
   · dikkat listesi = açık/aksiyonda bulgular, öncelik sırasıyla;
   · katmanlar = `TesisTipi` başına `uyumOzeti`;
   · eğilim = `UyumAnlik` kayıtları — yoksa ÇİZİLMEZ.

   ── BİLGİ KATMANI (Faz 3 kapanış, 2026-09) ─────────────────────────────
   Varsayılan görünümde yalnız BİRİNCİL katman yazılır: endeks, ilk 3
   müdahale, takımyıldız, 4 öncelik sayısı, tesis şeridi. İKİNCİL katman
   (kontrol kodu, çerçeve, tanım cümleleri, yöntem notları, toplamlar)
   ekrandan silinmez; `title`a ve hedef ekrana taşınır. Ölçüt: "bu metin
   ilk bakışta karar verdiriyor mu?" — hayırsa varsayılan görünümde yok.
   Veri kaybı yok: aynı alanlar görünür ikinci satırda, ERİŞİLEBİLİR ADDA
   ya da tıklama hedefinde durur. `title` artık bilginin TEK kapısı
   olamaz — odaklanamayan bir öğede hiçbir klavye ve dokunma kullanıcısına
   ulaşmaz (`kanit:tuval`, tavan sıfır).
   ═══════════════════════════════════════════════════════════════════════ */

const KISA_TARIH = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' });
function kisaTarih(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : KISA_TARIH.format(d).toLocaleUpperCase('tr-TR');
}

/* `terminSozu` SİLİNDİ: tek kullanıcısı bulgu satırının `title`ıydı ve o
   `title` odaklanamayan bir öğede durduğu için hiçbir klavye ve dokunma
   kullanıcısına ulaşmıyordu. Kaldırılınca geriye kullanıcısı olmayan bir
   biçimleyici kalıyordu — ölü kod, yarın birinin "zaten var" diye geri
   bağlayacağı bir tuzaktır. */
/** Görünür termin: yalnız karar taşıyan parça. Gecikme sözcükle ("gün
    gecikti"), plan tarihle; tarih yoksa hiç yazılmaz. */
function terminKisa(gecikmisGun: number | null, hedefTarih: string | null): string | null {
  if (gecikmisGun !== null) return `${gecikmisGun} gün gecikti`;
  return hedefTarih ? kisaTarih(hedefTarih) : null;
}

export type Kayit = {
  id: string; baslik: string; aciklama: string | null;
  /** kapsam öğesinin adı ve tesis köprüsü (köprüsüz öğede null) */
  tesisAd: string; tesisId: string | null; kontrolKodu: string; cerceve: string;
  onem: string; durum: string; sorumlu: string | null;
  hedefTarih: string | null; gecikmisGun: number | null;
  aksiyonTamam: number; aksiyonToplam: number;
};

type Ozet = {
  uyumYuzde: number | null; bilinmeyenOran: number | null;
  kritikRisk: number; gecikmisAksiyon: number;
  yaklasanDenetim: { kod: string; ad: string; tarih: string; kalanGun: number } | null;
  tesisSayisi: number; gucYazi: string | null;
};

/** Katman panelinde çizilen tip sayısı — kalanı sayıyla söylenir. */
const KATMAN_TAVANI = 3;

/* ── GÜÇ YAZISI TEK YERDEN ────────────────────────────────────────────
   Bu ekran gücü DÖRT yerde yazıyor (katman meta, panel listesi, plaka,
   künye) ve hepsi birimi dizeye gömüyordu. Birim artık veriden gelir ve
   sektöre göre değişir; ekran birim SEÇMEZ. Yazım tek yardımcıya bağlı
   ki dördü ayrışmasın — aynı verinin iki türlü yazılması bu depoda
   ölçülmüş bir kusurdu (`lib/alan/oznitelik.ts`). */
const kartGucu = (s: { guc: number | null; gucBirim: string | null }) =>
  olculenYazi({ deger: s.guc, birim: s.gucBirim });

const gucYazisi = (t: { guc: number | null; gucBirim: string | null }) =>
  olculenYazi({ deger: t.guc, birim: t.gucBirim });

/** Bir tesis kümesinin güç toplamı; birimler karışıksa `null`. */
const olculmemisToplami = (
  liste: readonly { guc: number | null; gucBirim: string | null }[],
) => ((x) => olculenYazi({
  deger: x.toplam === null ? null : Math.round(x.toplam * 10) / 10, birim: x.birim,
}))(birimliToplam(liste.map((s) => ({ deger: s.guc, birim: s.gucBirim }))));
/** Müdahale listesinde çizilebilecek EN ÇOK bulgu; kaçının çizileceğini
    yükseklik bütçesi belirler (aşağıda `Mudahale`). Toplam başlıkta
    sayıyla durur, sığmayanlar "+N diğer" ile söylenir. */
const MUDAHALE_TAVANI = 4;
/** "+N diğer" satırının sabit yüksekliği (kabuk.css `.mudahale .kalan`:
    16px satır + 8px boşluk). Ölçülmez, sabit tutulur ki bütçe hesabı
    satır çizilmeden önce de doğru olsun.

    20 → 24: bu satır bir BAĞDIR (bulgular ekranına gider) ve 20px,
    ürünün beyan ettiği WCAG 2.2 AA 24×24 eşiğinin altındaydı. Kusur
    elle değil KAPIYLA bulundu: axe kural kümesine `wcag22aa` etiketi
    eklenince `target-size` üç bantta da kırmızı yaktı (`/` · serious).
    Eşik ürünün kendi CSS'inde yazılıydı ama hiçbir kapı onu ölçmüyordu.

    Bütçe maliyeti 4px'tir ve BİLEREK ödenir: sığmayan bir kalem daha
    düşebilir, ama ulaşılamayan bir bağ hiç kalem göstermemekle aynı
    şeydir. Sayı CSS ile TEK KAYNAKTAN tutulur — ikisi ayrışırsa bütçe
    hesabı satır çizilmeden önce yanlış olur. */
const KALAN_SATIR_PX = 24;

/* Değerlendirilmemişler GÜCE göre sıralı; gücü bilinmeyen sona düşer —
   gücü 0 sayılarak sıralanmaz. Sıra hem özetteki ilk adlarda hem panelde
   aynıdır: kullanıcı özette gördüğü üç adı panelin başında yeniden bulur. */
function olculmemisSirali(tesisler: TesisKarti[]): TesisKarti[] {
  return tesisler.filter((s) => s.endeks === null)
    .sort((a, b) => (b.guc ?? -1) - (a.guc ?? -1));
}

const ONEM_SINIF: Record<string, string> = {
  kritik: 'bd', yuksek: 'bd', orta: 'md', dusuk: 'pl',
};

export default function Genel({
  bugun, ozet, odak, kuyruk, toplamKayit, kapsamli = false,
  tesisler, tipler, risk, egilim, yerlesim = SAHA_YERLESIM_VARSAYILAN,
  olculmemisGosterimi = OLCULMEMIS_VARSAYILAN, tanimlayabilir = false,
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
  tesisler: TesisKarti[];
  tipler: TipKatmani[];
  risk: RiskIzgarasi;
  /* Sunucu hesaplar, ana ekran ÇİZMEZ (tek ekran sözleşmesi, yukarıda).
     Prop imzasında kalır: `page.tsx` veriyi olduğu gibi geçer, veri
     akışı değişmez. */
  takvim?: TakvimKalemi[];
  akis?: AkisHaftasi[];
  egilim: { etiket: string; yuzde: number }[] | null;
  /* Boş durumun EYLEMİ yetkiye bağlıdır. Yüklem `/yonetim-tezgahi`
     sayfasının kendi kapısıyla AYNIDIR; kabuğun `kullanici.yonetim`
     bayrağı da aynı kuralı kullanıyor (`components/kabuk/kabukVerisi`).
     Ölçüldü (bağımsız inceleme, PR #51 tur 2): yetkisiz bir okuyucu boş
     sahada "Tesis tanımla →" görüp tıklıyor ve `Yetkisiz` ekranına
     düşüyordu — "ÇÖZÜME işaret eder" ölçütü onun için geçmiyordu. */
  tanimlayabilir?: boolean;
}) {
  const dikkat = odak ? [odak, ...kuyruk] : kuyruk;
  const katmanVar = gorunur(yerlesim, 'katman');
  const { t: terim, tBas } = useTerim();
  const olculmemisSerit = olculmemisSirali(tesisler);
  const [olculmemisAcik, setOlculmemisAcik] = useState(false);
  /* Aynı görünen adı taşıyan iki tip (enerji · su "Merkez BT") sektörle
     ayrılır; çakışma yoksa ad olduğu gibi kalır (`tipEtiketi.ts`). */
  const tipEtiketi = tipEtiketleri(tipler);
  /* Panelin adı KAPSAMDAN gelir. Kapsamı daraltılmış bir kullanıcıya
     "Grup durumu" demek, ekranın gösterdiği sayıların kapsamını yanlış
     beyan etmektir: sayılar zaten daraltılmış, yanlış olan tek şey
     etiketti. Sayı da yazılır — "kaç tesis" kapsamın kendisidir. */
  const durumEtiketi = kapsamli
    ? `Kapsamınız · ${ozet.tesisSayisi} ${terim('tesis')}`
    : 'Grup durumu';

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
        <aside className="ab-b-dikkat" aria-label={durumEtiketi}>
          {/* ETİKET VERİDEN TÜRER. Ekran kapsam ne olursa olsun "Grup
              durumu" diyordu: tek bir tesisin sorumlusu, yalnız kendi
              tesisini gösteren bir ekranda "grup" yazısı okuyordu.
              Kapsam bayrağı zaten vardı ve YALNIZ boş durum cümlesinde
              kullanılıyordu — sayılar doğru daraltılmış, etiket yanlış. */}
          <p className="etiket">{durumEtiketi} · {bugun}</p>
          <div className="endeks">
            <span className="sayi">{ozet.uyumYuzde === null ? '—' : `%${ozet.uyumYuzde}`}</span>
            <span className="yan">
              <span className="ad">Uyum endeksi</span>
              {/* PAYDA KURALI GÖRÜNÜR. Ürünün en pahalı semantiği burada
                  duruyor: değerlendirilmemiş kontrol paydaya GİRMEZ,
                  yani üstteki yüzde "ölçülenlerin yüzdesi"dir. Kural
                  eskiden odaklanamayan bir `title`taydı — fareyle
                  gezinmeyen hiç kimse, yani klavye ve dokunma
                  kullanıcılarının tamamı, endeksin neyin üzerinden
                  hesaplandığını göremiyordu. */}
              <span className="alt">
                {ozet.bilinmeyenOran === null
                  ? 'değerlendirme yok — endeks hesaplanamıyor'
                  : `%${ozet.bilinmeyenOran} bilinmeyen · paydaya girmez`}
              </span>
            </span>
          </div>

          {gorunur(yerlesim, 'egilim') && <Egilim seri={egilim} />}

          <Mudahale dikkat={dikkat} toplamKayit={toplamKayit} kapsamli={kapsamli} />
        </aside>

        {/* ── Takımyıldız — koordinat DEĞİL, endeks × güç ───────────── */}
        <Takimyildizi tesisler={tesisler} gosterim={olculmemisGosterimi}
          serit={olculmemisSerit} panelAcik={olculmemisAcik} setPanelAcik={setOlculmemisAcik}
          tanimlayabilir={tanimlayabilir}
          portfoy={{ sayi: ozet.tesisSayisi, gucYazi: ozet.gucYazi }} />

        {/* ── Katman paneli · 320px — gizlenebilir (saha.yerlesim) ──────
            Panel içeriği KAP BOYUNU AŞABİLİR ve kendi içinde kayar; ne
            kadarı sözlüğe bağlıdır, çünkü katman adı terimden gelir.
            Ölçüldü (1366×768, kap 427px): `enerji` 427 → kaymıyor ·
            `su` 437 → 10px · `stres` 471 → 44px kayıyor. Kaydırılabilir
            bölge klavyeyle odaklanabilir OLMAK ZORUNDA — panelde
            odaklanabilir tek bir çocuk yok, yani kaydırma yalnız fareye
            açık kalırdı (axe · serious · scrollable-region-focusable;
            tesis ekranının `.ab-b-panel`i ile aynı gerekçe).

            Bu kusuru axe KAPISI bulmadı, elle ölçüldü: axe 1440×900,
            768×1024 ve 375×780 tarar; panel bu üç bantta kaymıyor
            (535/535 · dar bantta `overflow-y: visible`). Kaydığı bant
            olan 1366×768 yalnız düzen kapısının bandıdır. Kapının
            ölçmediği bant kapının "temiz" dediği bant değildir —
            boşluk R0 kütüğüne yazıldı. */}
        {katmanVar && (
          <aside className="ab-b-katman" aria-label="Üretim tipine göre uyum" tabIndex={0}>
            {/* `title` KALKTI: panelin kendi erişilebilir adı zaten
                "Üretim tipine göre uyum" (aşağıdaki `aria-label`). */}
            <p className="etiket">Üretim tipi · uyum</p>
            <div className="katmanlar">
              {/* Boş durum tohumlu veride hiç oluşmaz: sözlük kapısı bu satıra
                  UĞRAYAMADI, sızıntı bir üstteki kardeşi düzeltilirken elle
                  görüldü. Kapının erişemediği durum kapının temiz dediği durum
                  değildir. */}
              {tipler.length === 0 && (
                <p className="bos">
                  Kapsamınızda {terim('tesis')} yok — uyum katmanları{' '}
                  {terim('tesis')} kayıtlarından türetilir.{' '}
                  {tanimlayabilir
                    ? <Link href="/yonetim-tezgahi">{tBas('tesis')} tanımla →</Link>
                    : <>Tanımlama yetkisi yöneticinizdedir.</>}
                </p>
              )}
              {tipler.slice(0, KATMAN_TAVANI).map((t) => (
                <div key={t.kod} className="katman">
                  <div className="bas">
                    <span className="ad">{tipEtiketi.get(t.kod) ?? tipAdi(t.kod, t.ad)}</span>
                    <span className="mono deger">{t.endeks === null ? '—' : `%${t.endeks}`}</span>
                  </div>
                  {/* Güç YAZISI birimiyle veriden gelir; birimler
                      karışıksa toplam hiç yazılmaz (`birimliToplam`). */}
                  {/* `title` KALKTI: görünür metnin birebir tekrarıydı,
                      tek fazlası kontrol sayısıydı ve o sayı artık aynı
                      satırdaki yığının erişilebilir adında duruyor. */}
                  <p className="mono meta">
                    {t.tesisSayisi} {terim('tesis')}
                    {gucYazisi(t) && ` · ${gucYazisi(t)}`}
                  </p>
                  <Yigin uygun={t.uygun} kismi={t.kismi} uygunsuz={t.uygunsuz}
                    bilinmeyen={t.bilinmeyen} tip={t.kod} kontrol={t.kontrolSayisi} />
                </div>
              ))}
              {tipler.length > KATMAN_TAVANI && (
                /* Kalan tipler SAYIYLA: yedi tip adı üç satır 11px mono
                   tutuyordu ve panelin sorusuna ("hangi tip en zayıf?")
                   cevap taşımıyordu. Karar yüzeyinde yalnız sayı; adlar
                   isteyene açılır (SAH-SDL-001). İlk yazım adları `title`a
                   koymuştu — bağımsız inceleme (PR #64) ölçtü: `title`
                   fareye açıktır, klavye ve dokunma ona erişemez. Bu
                   yüzden açılır liste: `summary` odaklanabilir, dokunulur. */
                <details className="katman-diger">
                  <summary className="mono kalan">
                    Diğer {tipler.length - KATMAN_TAVANI} tip
                    {' · '}{tipler.slice(KATMAN_TAVANI).reduce((a, t) => a + t.tesisSayisi, 0)}{' '}{terim('tesis')}
                  </summary>
                  <ul className="mono diger-liste">
                    {tipler.slice(KATMAN_TAVANI).map((t) => (
                      <li key={t.kod}>
                        <span className="ad">{tipEtiketi.get(t.kod) ?? tipAdi(t.kod, t.ad)}</span>
                        <span className="sayi">{t.tesisSayisi} {terim('tesis')}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </aside>
        )}
      </section>

      {/* ═══ Öncelik göstergeleri ══════════════════════════════════════ */}
      <OncelikSeridi ozet={ozet} risk={risk} sira={kpiSirasi(yerlesim)} />

      {/* ═══ Saha şeridi — YALNIZ DAR BANT (≤1100px) ══════════════════
          ÖLÇÜLDÜ (19 Eyl 2026), sınır iki pikselde kesin:

            1101px → künye 4 · güçsüz şerit 4 · şerit 8 · ŞERİDE ÖZGÜ AD 0
            1100px → künye 0 · güçsüz şerit 4 · şerit 8 · ŞERİDE ÖZGÜ AD 4

          Yani 1101'de şerit, ekranda BAŞKA YERDE OLMAYAN tek bir ad bile
          taşımıyor: takımyıldızın künyeleri (4) ile güçsüz şeridi (4)
          sekizin sekizini de zaten yazıyor. 1100'de künye çizilmiyor
          (`kabuk.css` · `max-width: 1100px` · "dar bantta serbest yüzen
          künye YANLIŞ BİÇİMDİR") ve şerit, en kötü dört tesisin adının
          okunduğu TEK yüzey oluyor.

          Bu yüzden şerit KALDIRILMADI, BANDINA ÇEKİLDİ: 1101px ve
          yukarısında gizlenir (tekrar), 1100px ve aşağısında kalır
          (tek ad yüzeyi). Kullanıcı bu bölgeyi üç kez bildirdi (görsel
          boyu · kaydırma çubuğu ×2); geniş bantta 304k px² ve 159px tek
          ekran bütçesi, karşılığında sıfır yeni ad ve sıfır yeni hedef.

          Gizleme KURALI kapıdadır ve gerçek tarayıcıda iki bantta
          ölçülür (`arac/tuval-kanit.mjs`): şerit gizliyken şeride özgü
          ad sayısı SIFIR olmak zorundadır — bir gün künye eşiği ya da
          tuval kümesi değişirse kapı kırmızı yanar, ad sessizce
          kaybolmaz. */}
      <section className="ab-b-serit" aria-label="Saha seçici">
        <header>
          {/* "Tesise geçmek için seçin · yatay kaydırın" yönlendirmesi
              kaldırıldı: kartlar bağdır, şerit kesilerek biter — davranış
              kendini gösterir; sözle tekrar karar taşımıyordu. */}
          {/* Güç YAZISI sunucudan birimiyle gelir; birim ekranda
              seçilmez. Ölçülmemişte ya da birimler karışıkken sayı hiç
              yazılmaz — karışık bir toplamı tek birimle etiketlemek
              yanlış bir sayıyı doğru gibi gösterirdi. */}
          {/* `title` KALKTI: aynı sayıları görünür metin zaten yazıyor,
              "Saha seçici" de bölümün erişilebilir adı. */}
          <span className="etiket">
            {tBas('tesis', 'cogul')} · {ozet.tesisSayisi}
            {ozet.gucYazi && ` · ${ozet.gucYazi}`}
          </span>
        </header>
        {/* ── ŞERİT ÖLÇÜLENLERİ TAŞIR — ÖLÇÜLDÜ, TEKRAR BULUNDU ──────────
            Kullanıcı şeridin kaydırma çubuğunu iki kez bildirdi. Sebep
            çubukta değil UZUNLUKTAYDI: 24 kart × 218px = 5 224px ve
            1914px'lik bantta başparmak %37.

            İlk plan "yalnız müdahale gerektirenleri göster" idi; ÖLÇÜM
            ONU ÇÜRÜTTÜ (18 Eyl 2026): 24 tesisin 6'sının uygunsuzu var,
            **16'sı ÖLÇÜLMEMİŞ**, 2'si ölçülmüş ve temiz. "Müdahale
            gerektiren" = uygunsuz + bilinmeyen = 22/24; süzmek yalnız
            iki kartı düşürürdü. Şerit çok şey gösterdiği için uzun
            değil — tesislerin ÜÇTE İKİSİ ölçülmediği için uzun.

            Asıl bulgu bir TEKRARDI: o 16 tesis aynı ekranda İKİ KEZ
            duruyor. Takımyıldızın değerlendirilmemiş bandı onları
            sayısıyla (16/24), güç toplamıyla, ilk üç adıyla ve
            açılır paneliyle zaten gösteriyor — şerit aynı 16 adı ikinci
            kez, bu kez 3 488px yer kaplayarak tekrarlıyordu. Tekrar eden
            bir değer, farklı bir karar amacı taşımıyorsa bilişsel yük
            kusurudur.

            BİLGİ GİZLENMİYOR ("bilinmeyen ≠ sıfır"): ölçülmemişler
            bandında adlarıyla ve sayısıyla durur, başlık portföyün
            TAMAMINI söyler (sayı ve güç toplamı) ve şeridin sonundaki bağ
            hepsine götürür. Şerit yalnız ÖLÇÜLEN uyumun karar sırasını
            taşır — uygunsuzu olan önde.

            Bekçi: hiçbir ÖLÇÜLEN tesis şeritten sessizce düşemez
            (`tests/bekci/saha-serit.test.ts`, SAH-SER-002). */}
        <div className="kartlar">
          {[...tesisler]
            .filter((s) => s.endeks !== null)
            .sort((a, b) => ((b.sayim.uyumsuz ?? 0) > 0 ? 1 : 0) - ((a.sayim.uyumsuz ?? 0) > 0 ? 1 : 0))
            .map((s) => <SahaKarti key={s.id} s={s} />)}
          {/* Portföyün tamamına giden kapı. Şeridin SONUNDA durur: karar
              sırası önce, gezinme sonra. */}
          {/* Kart TERİMİ TAŞIMAZ ve bu bilinçli: "24 tesisler" Türkçede
              yanlıştır (sayıdan sonra tekil gelir) ve doğru eki uydurmak
              sektör bağımsızlığını kırardı: terim sözlükten gelir ve her
              sektörün terimi FARKLI ek alır. Terimi bir üstteki başlık
              zaten söylüyor (ad · sayı · güç); kart yalnız sayıyı ve kapıyı
              taşır. Erişilebilir adı terimi İÇERİR, çünkü ekran
              okuyucu başlığı o an duymuyor olabilir. */}
          <Link href="/tesisler" className="kart tumu"
            aria-label={`${ozet.tesisSayisi} ${tBas('tesis', 'cogul').toLocaleLowerCase('tr-TR')} — tümünü aç`}>
            <span className="say">{ozet.tesisSayisi}</span>
            <span className="soz">tümü →</span>
          </Link>
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
          <Cekmece kod={`${olculmemisSerit.length} ${terim('tesis')}`}
            etiket="Değerlendirilmemiş"
            ad={`Değerlendirilmemiş ${terim('tesis', 'cogul')}`}
            kapat={() => setOlculmemisAcik(false)}>
            <p className="ab-olculmemis-not">
              Bu {terim('tesis', 'cogul')} için uyum endeksi <strong>ölçülmedi</strong> — sıfır değil.
              Güce göre sıralı; toplam{' '}
              {olculmemisToplami(olculmemisSerit) ?? 'birimler karışık, toplanmadı'}.
            </p>
            <ul className="ab-olculmemis-liste">
              {olculmemisSerit.map((s) => (
                <li key={s.id}>
                  <Link href={`/tesisler/${s.id}`}
                    aria-label={`${s.ad} · ${kartGucu(s) ?? 'güç kaydı yok'} · değerlendirilmedi`}>
                    {/* `color` veriyoruz: tarama deseni de kenarlık da
                        `currentColor` okur, ikisi tek yerden gelsin. */}
                    <span className="kare" aria-hidden style={{ color: tipRengi(s.tipKod) }} />
                    <span className="ad">{s.ad}</span>
                    <span className="mono guc">{kartGucu(s) ?? '—'}</span>
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
        {/* ── ÖLÇÜ GÖRÜNÜR OLMALI ────────────────────────────────────
            Bu kalem ve "Risk yoğunluğu" aynı satırda İKİ FARKLI "kritik"
            sayısı gösteriyordu (ölçüldü: 6 ve 8) ve farkı yalnız
            `title`ta yazıyordu. Sayılar doğru — tanımlar farklı: burası
            ARTIK SKORU ≥ 15 olanları sayar, öbürü olasılık × en büyük
            etki matrisinin kritik bandını. Ama okuyanın elinde yalnız
            aynı sözcük ve iki farklı sayı vardı; ya biri yanlış sanılır
            ya hiç fark edilmez.

            Depo bu sınıfı bir kez düzeltmişti: kritik bilgi yalnız
            `title`ta duramaz (odaklanamaz, dokunmatikte hiç açılmaz).
            Ölçü artık cümlede. Satır sayısı DEĞİŞMİYOR — ölçülemeyen
            sayısı aynı cümleye katılır, ikinci satır açılmaz. */}
        <span className="cumle">
          artık skor ≥ 15
          {olculemeyenRisk > 0 && <> · <span className="unk">{olculemeyenRisk} ölçülemedi</span></>}
        </span>
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
        {/* "N ölçülemedi" aynı satırda Kritik risk kaleminde zaten yazılı;
            aynı sayı iki kez karar taşımıyordu — burada `title`ta kalır.
            Tek istisna: kritik ve yüksek sıfırken ölçülemeyen varsa
            bilinmeyen durumu SÖZCÜKLE söylenmek zorundadır, renk tek
            kanal olamaz (SAH-SDL-001). */}
        {/* Bu kalemin "kritik"i MATRİS BANDIDIR, artık skor değil —
            bir üstteki kalemle aynı sözcüğü kullandığı için ölçüsü
            görünür yazılır. Cümle yuvası zaten boştu. */}
        <span className="cumle">
          olasılık × etki
          {risk.kritik === 0 && risk.yuksek === 0 && olculemeyenRisk > 0
            && <> · <span className="unk">{olculemeyenRisk} ölçülemedi</span></>}
        </span>
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
      /* SEBEP GÖRÜNÜR. Eskiden ekran yalnız "Eğilim · kayıt yok"
         diyordu ve NİÇİN çizilemediği `title`ta duruyordu. Eğilim
         dönemsel anlık görüntü kayıtlarından çizilir; kayıt yoksa
         çizilecek nokta da yoktur — ve bu seri SİSTEM SAATİNDEN
         TÜRETİLMEZ (uydurulmuş bir eğilim, ölçülmemiş bir değeri
         ölçülmüş gibi gösterirdi). Son cümle bir iç değişmezdir ve
         yeri kullanıcı ipucu değil, bu yorumdur. */
      <p className="ab-b-egilim-yok">
        Eğilim · dönemsel kayıt yok — çizilecek nokta yok
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

/* Künye yönü eşikleri — İKİSİ DE TUVAL YÜZDESİDİR (ham endeks değil).
   `SOLA`: tuvalin sağ yarısındaki nokta künyesini sola açar, yoksa künye
   sağ kenardan taşar. `SOLA_DAR`: dar bantta eşik erkene çekilir çünkü
   aynı künye dar tuvalde oransal olarak daha çok yer kaplar (kabuk.css,
   medya sorgusu). Eski değerler ham endeks üzerindendi (58 ve 40) ve
   eski yerleşim `4 + endeks × 0,86` olduğu için tuval yüzdesine yakın
   düşüyorlardı; pencere geldikten sonra yakınlık kalmadı, bu yüzden
   eşikler doğrudan tuval yüzdesi olarak yazılıyor. */
const SOLA_ESIGI = 58;
const SOLA_DAR_ESIGI = 38;

/* ── Takımyıldız ──────────────────────────────────────────────────────
   Yatay: uyum endeksi (0–100). Dikey: kurulu güç (karekök ölçek, çünkü
   1800 güçlük bir tesis ile 15 güçlük bir tesis aynı eksende doğrusal
   konursa küçükler tek şeride yığılır).

   ── DEĞERLENDİRİLMEMİŞ ŞERİDİ ─────────────────────────────────────────
   Hiç değerlendirilmemiş tesisin uyum endeksi YOKTUR. Onu ekseninde
   bir yere koymak — 0'a, ortalamaya, herhangi bir yere — uydurmaktır ve
   "bilinmeyen ≠ sıfır" kuralının en pahalı ihlali olurdu: %0 uyumlu
   görünen bir tesis, aslında henüz hiç bakılmamış tesisdir.

   Bunlar önceden tuvalin ALTINDA düz bir kod dizisiydi; on bir tesis,
   yani portföyün üçte ikisi, ana ekranda görünmüyordu. Artık tuvalin
   İÇİNDE, eksenin solunda kendi şeridinde duruyorlar.

   Şerit ÖLÇEKLİ DEĞİL SIRALIDIR ve bu bilinçli bir karardır. Önce güce
   göre ölçekli denendi ve ölçüldü: değerlendirilmemiş on bir tesisin
   dokuzu 15–25 bandında toplanıyor, künyeler üst üste biniyor ve
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
        /* BEKLENEN YOKLUK: açık bulgu olmaması iyi haberdir. İşaret
           edeceği bir çözüm yoktur; olmayan bir eylem uydurmak
           kullanıcıyı gereksiz bir yola sokardı. Bayrak sınıftan
           gelir (`bos iyi`), kütükten değil. */
        <p className="bos iyi">
          {kapsamli
            ? 'Kapsamınızdaki tesislerde açık bulgu yok; müdahale bekleyen kayıt bulunmuyor.'
            : 'Açık bulgu yok; müdahale bekleyen kayıt bulunmuyor.'}
        </p>
      ) : dikkat.slice(0, cizilecek).map((b, i) => (
        <Link key={b.id} href={`/bulgular/${b.id}`}
          className={`kalem${i >= gorunen ? ' gizli' : ''}`}
          aria-hidden={i >= gorunen || undefined} tabIndex={i >= gorunen ? -1 : undefined}>
          <span className={`sap ${ONEM_SINIF[b.onem] ?? 'pl'}`} aria-hidden />
          <span className="govde">
            <span className="konu">{b.baslik}</span>
            {/* Tek satır: tesis · termin · kontrol kodu. Gecikme
                sözcükle ("gün gecikti"), salt renkle değil.

                KONTROL KODU GÖRÜNÜR OLDU. Eskiden kod ve çerçeve
                `title`a taşınmıştı ve gerekçesi "karar taşımaz"dı; ama
                `title` odaklanamayan bir öğede hiçbir klavye ya da
                dokunma kullanıcısına ulaşmıyordu — yani bilgi "ikinci
                düzeye" değil, ERİŞİLMEZ bir yere taşınmıştı. Kod bir
                bulguyu mevzuattaki yerine bağlayan tek anahtardır ve
                satıra sığar; çerçeve kodun ön ekinde zaten okunur
                (`EPDK-…`) ve bulgular ekranında tam hâliyle durur. */}
            {/* AD VE GECİKME GÖVDE, KOD MONO. DESIGN.md: "Gövde nötr
                kalır; sayı ve kod daima mono." Satırın tamamı mono olunca
                tesis adı ve "12 gün gecikti" cümlesi de kod sesiyle
                konuşuyordu; ölçüldü, ekrandaki 22 mono cümleden dördü bu
                satırdı. */}
            <span className="meta">
              {b.tesisAd}
              {terminKisa(b.gecikmisGun, b.hedefTarih) && ` · ${terminKisa(b.gecikmisGun, b.hedefTarih)}`}
              {b.kontrolKodu && <> · <span className="mono">{b.kontrolKodu}</span></>}
            </span>
          </span>
          {/* SIRA RAKAMLARI SİLİNDİ (01 / 02 / 03). İki kusuru vardı:
              rengi `--hr2` olduğu için 1,30:1 kontrastla okunamıyordu —
              yani bilgi taşıyorsa erişilemez, taşımıyorsa süstü — ve
              taşıdığı "sıra" zaten satırların DİZİLİŞİNDE var. Kuyruk
              önceliğe göre sıralı; numaralandırmak aynı şeyi ikinci kez
              söylüyordu. `aria-hidden` olması da bunu söylüyordu:
              okuyucuya verilmeyen bir bilgi, gözle de gerekmiyordu. */}
        </Link>
      ))}
      {cizilecek > 0 && kalan > 0 && (
        <Link href="/bulgular" className="kalan" title={`${kalan} bulgu daha · bulgular ekranı`}>+{kalan} diğer →</Link>
      )}
    </div>
  );
}

function Takimyildizi({ tesisler, gosterim = OLCULMEMIS_VARSAYILAN, serit, panelAcik,
  setPanelAcik, tanimlayabilir = false, portfoy }: {
  tesisler: TesisKarti[];
  /** Portföyün TAMAMI — çizilen küme değil. Geniş bantta şerit (ve onun
      başlığı) gizlendiği için bu iki sayının TEK yüzeyi burasıdır;
      kullanıcı gördüğü nokta sayısını portföyün tamamı sanmasın. */
  portfoy: { sayi: number; gucYazi: string | null };
  /** Boş durumun eylemi yetkiye bağlıdır — `Genel`den geçer. */
  tanimlayabilir?: boolean;
  /** Değerlendirilmemiş özetinin ayrıntı düzeyi — konsol `saha.olculmemis`. */
  gosterim?: OlculmemisGosterimi;
  /* Liste ve panelin AÇIKLIĞI yukarıda tutulur. Sebep ölçüldü: panel bu
     bileşenin içinde çizilirken görünmüyordu — `.ab-b-takim` `z-index: 1`
     ile kendi YIĞINLAMA BAĞLAMINI kurar ve `position: fixed` panel o
     bağlamın içinde kalır; DOM'da sonra gelen kardeş `.ab-b-katman` (aynı
     z-index) onun üstüne boyanır. Panel `.ab-b-alan`ın DIŞINDA, `Genel`in
     kökünde çizilerek bağlamdan çıkarıldı. */
  serit: TesisKarti[];
  panelAcik: boolean;
  setPanelAcik: (a: boolean) => void;
}) {
  const { t: terim, tBas } = useTerim();
  const olculmemis = tesisler.filter((s) => s.endeks === null);
  /* ÜÇÜNCÜ KÜME — BİLİNMEYEN ≠ SIFIR, İKİNCİ EKSENDE DE.
     Bu dosyanın kendi başlığı "ölçülmemiş tesis eksene KONMAZ" diyordu
     ve bunu YALNIZ yatay eksende (uyum endeksi) uyguluyordu. Dikey eksen
     kurulu güçtür ve `dikey()` gücü olmayan tesisi `√(0/enGuc)` ile
     TABANA çakıyordu: gücü ÖLÇÜLMEMİŞ tesis, gücü sıfır ÖLÇÜLMÜŞ tesisle
     aynı yerde duruyordu. Ölçüldü (bağımsız audit, 1440×900): dört tesis
     tabanda tek noktaya yığılmış, künyeleri şerit şerit yukarı itilmiş ve
     biri kendi işaretinden 303 piksel uzağa düşmüştü.
     Bugün: gücü ölçülmemiş tesis tuvale KONMAZ — uyum endeksi ölçülmüş
     olduğu için yatay yerini korur ve eksenin altında ADI KONMUŞ kendi
     şeridinde durur. Bilgi kaybolmaz, yalan söylenmez. */
  const tuvalde = tesisler.filter((s) => s.endeks !== null && s.guc !== null);
  const gucsuz = tesisler.filter((s) => s.endeks !== null && s.guc === null);
  /* ── EKSEN PENCERELERİ ────────────────────────────────────────────
     Gerekçe, ölçüm ve karekökün niçin kalktığı `eksenPenceresi.ts`te.
     Pencere ÇİZİLEN kümeden gelir, bütün portföyden değil: eksene
     konmayan bir tesis (endeksi ya da gücü ölçülmemiş) ölçeği de
     belirleyemez — ölçmediğimiz bir değerin ekseni gerdiğini söylemek,
     onu ölçülmüş saymak olurdu. */
  const xPencere = eksenPenceresi(tuvalde.map((s) => s.endeks!), {
    taban: 0, tavan: 100, adim: 10,
  });
  const yPencere = eksenPenceresi(tuvalde.map((s) => s.guc!), { taban: 0 });

  /* DİKEY EKSENİN BİRİMİ — çizilen tesislerin TAMAMI aynı birimi
     taşımıyorsa çentik SAYI YAZMAZ. Ürün bu kuralı toplamlarda zaten
     uyguluyor (`birimliToplam`: karışık birimde toplam anlamsızdır ve
     sayı hiç yazılmaz); bir eksen de karışık birimle etiketlenemez.
     Sayı yerine hiçbir şey yazılmaz — eksenin adı ("↑ kurulu güç")
     kalır, uydurma bir birim eklenmez. */
  const yBirimler = new Set(tuvalde.map((s) => s.gucBirim ?? ''));
  const yBirim = yBirimler.size === 1 ? [...yBirimler][0] : null;

  /* Tuval payı: sol eksen çizgisi 8px, sağda künye nefesi. Nokta yatayda
     %4…%90, dikeyde tabandan %8…%86 arasına oturur — pay eskisiyle AYNI,
     değişen yalnız o payın içine hangi ARALIĞIN sığdığı. */
  const yatay = (s: TesisKarti) =>
    4 + (xPencere && s.endeks !== null ? pencereOrani(s.endeks, xPencere) : 0) * 86;
  const dikey = (s: TesisKarti) =>
    8 + (yPencere && s.guc !== null ? pencereOrani(s.guc, yPencere) : 0) * 78;
  const gucToplami = olculmemisToplami(olculmemis);
  const { gosterilen: ilkAdlar, kalan } = ozetKur(serit.map((s) => s.ad), gosterim);

  /* Eksene yakın işaretin künyesi YUKARI açılır: "Demo Enerji Genel Müdürlük" (güç 0)
     künyesi x ekseninin adıyla üst üste biniyordu (ölçüldü, 1366×768).
     Eşik %14 = künye yüksekliği (28px) / tuval yüksekliği (~300px) payı. */
  const yukari = (s: TesisKarti) => dikey(s) < 14;
  /* Künye çakışması NOKTAYI OYNATMADAN çözülür — kural ve ölçülen kusur
     `kunyeYolu.ts`te. Nokta ölçülen veridir; yerini değiştirmek grafiği
     yalan söyletir.

     ÇÖZÜCÜYE TUVAL YÜZDESİ VERİLİR, ENDEKS DEĞİL. Eskiden `x` olarak
     ham uyum endeksi (0–100) geçiyordu ve bu yalnız KAZA ESERİ
     çalışıyordu: eski yerleşim `4 + endeks × 0,86` olduğu için ikisi
     birbirine yakındı. Pencere geldiği an ikisi ayrışır — %52–67 arası
     bir pencerede endeks 52 ile 67 tuvalin iki ucudur, ama ham sayı
     olarak 15 birim uzaktır ve künye genişliği (%28) o ölçekte
     "çakışma yok" der. Çözücü ekranda NEREDE durduğuna bakmalıdır. */
  const yerler = kunyeYollari(tuvalde.map((s) => ({
    x: yatay(s), y: dikey(s), yukari: yukari(s),
    /* `.sola` eşiği ekranın kendi kuralıyla AYNI olmalı (aşağıda
       `SOLA_ESIGI`); ikisi ayrışırsa kural künyeyi yanlış yöne açık
       sanır. İkisi de artık TUVAL YÜZDESİDİR. */
    sola: yatay(s) > SOLA_ESIGI,
  })));

  return (
    /* `section` + erişilebilir ad = ADLI BÖLGE: kaydıran bir kap
       odaklanabilir OLMAK ZORUNDADIR (axe · scrollable-region-focusable),
       ama adsız bir sekme durağı klavye kullanıcısına "burası neresi"yi
       söylemez — `div`in adı okuyucuya hiç ulaşmıyordu (rolü yok).
       Kardeş `.ab-b-katman` ile aynı kalıp: adlı bölge + `tabIndex`. */
    <section className="ab-b-takim" aria-label={`${tBas('tesis')} takımyıldızı`} tabIndex={0}>
      {/* Yön bilgisi ÜÇ kanaldan söyleniyordu (başlık kuyruğu, eksen
          adları, hedef köşesi); ikisi kaldı: eksen okları ("uyum endeksi →",
          "↑ kurulu güç") ve "↗ güçlü ve uyumlu" köşesi. Başlık kuyruğu
          önce `title`a taşınmış, sonra SİLİNMİŞTİ (odaklanamayan `title`
          kimseye ulaşmıyor); yön bugün eksen adları ve pencere
          çentikleriyle söyleniyor — aynı bilgi, bir kez. */}
      {/* Başlık ve değerlendirilmemiş özeti AYNI SATIRDA — ve bu satır
          artık gerçekten tek satır. Kap `column` olduğu için ikisi alt
          alta düşüyordu ve 1366×768'de 71px yiyordu (ölçüldü); o 71px'in
          25'i yalnız ayrılıktan geliyordu ve güç şeridinin görünmemesiyle
          ödeniyordu. İkisi aynı bilgi grubudur: "bu tuval neyi çiziyor ve
          neyi çizemiyor". Dar bantta sararlar; kolon zaten kayabilir. */}
      <div className="ab-takim-bas">
        {/* `title` KALKTI: yönü ekran zaten İKİ kanaldan söylüyor —
            eksen adları ("uyum endeksi →" · "↑ kurulu güç") ve artık
            pencerenin uçlarını yazan çentikler. Üçüncü kanal, kimsenin
            klavyeyle ulaşamadığı bir kopyaydı. */}
        {/* BAŞLIK PORTFÖYÜ SÖYLER, EŞLEMEYİ DEĞİL. Eskiden "uyum × güç"
            yazıyordu; o eşlemeyi eksen adları ("uyum endeksi →" · "↑ kurulu
            güç") zaten söylüyor — bu bileşenin kendi kuralı yönün ÜÇÜNCÜ
            kanalını daha önce kaldırmıştı, başlık dördüncüsüydü. Yerine
            şeridin geniş bantta gizlenen başlığındaki iki sayı geçti.
            Güç YAZISI sunucudan birimiyle gelir; ölçülmemişte ya da
            birimler karışıkken hiç yazılmaz — karışık bir toplamı tek
            birimle etiketlemek yanlış bir sayıyı doğru gibi gösterirdi. */}
        <p className="etiket ust">
          {tBas('tesis', 'cogul')} · {portfoy.sayi}
          {portfoy.gucYazi && ` · ${portfoy.gucYazi}`}
        </p>
        {olculmemis.length > 0 && (
          /* Özet satırı: sayı ÖNCE ve tek başına okunur; oran ("11/16")
             sayının söylemediğini söyler — portföyün üçte ikisi hiç
             ölçülmemiş. Adlar ikincil mürekkeple, tek satırda, sığdığı
             kadar. Uzun yöntem notu `title`ta kalır, ekranda değil. */
          <div className="ab-olculmemis">
            <span className="im" aria-hidden style={{ color: 'var(--i3)' }} />
            <span className="ad">Değerlendirilmemiş</span>
            {/* `title` KALKTI: oranı ("16/24"), güç toplamını ve
                "Değerlendirilmemiş" sözcüğünü görünür satır zaten
                yazıyor — "sıfır değil" o sözcüğün kendisidir. */}
            <span className="sayi mono">
              {olculmemis.length}<span className="bolu">/{tesisler.length}</span>
            </span>
            {gucToplami && <span className="guc-toplam mono">{gucToplami}</span>}
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
      {tesisler.length === 0 ? (
        /* İLK KURULUM BOŞLUĞU: bu bölüm ekranın BİRİNCİL içeriğidir ve
           boşken kullanıcı ilerleyemez — bu yüzden bir bağ taşır. Bir
           kart NOTU değildir; not, kullanıcıyı çalıştığı ekrandan
           koparmaz (etkileşim sadeleştirme: gereksiz gezinme yok). */
        <p className="bos">
          Kapsamınızda {terim('tesis')} yok — uyum tuvali{' '}
          {terim('tesis')} kayıtlarından çizilir.{' '}
          {tanimlayabilir
            ? <Link href="/yonetim-tezgahi">{tBas('tesis')} tanımla →</Link>
            : <>Tanımlama yetkisi yöneticinizdedir.</>}
        </p>
      ) : (
        <div className="ab-tuval-sar">
          <div className="ab-tuval">
            {tuvalde.map((s, i) => {
              /* `x` TUVAL YÜZDESİDİR — hem yerleşim hem künye yönü
                 eşikleri aynı ölçekten okunur (bkz. `SOLA_ESIGI`). */
              const x = yatay(s);
              const yer = yerler[i];
              const uygunsuz = s.sayim.uyumsuz ?? 0;
              return (
                <Link key={s.id} href={`/tesisler/${s.id}`}
                  /* ERİŞİLEBİLİR AD BAĞIN KENDİNDE. Künye yüzeyi dar
                     bantta çizilmiyor (kabuk.css); ad bağın METNİNDEN
                     geliyor olsaydı orada bağın adı da yok olurdu ve
                     geriye adsız bir elmas kalırdı. */
                  aria-label={`${s.ad} · ${kartGucu(s) ?? '—'} · %${s.endeks}${uygunsuz > 0 ? ` · ${uygunsuz} uygunsuz` : ''}`}
                  title={`${s.ad} · ${kartGucu(s) ?? '—'} · %${s.endeks}${uygunsuz > 0 ? ` · ${uygunsuz} uygunsuz` : ''}`}
                  /* Odak sırası: uygunsuzu olan tesis öne (`oncelik`, tam
                     mürekkep + halka), temiz olan arkaya (ikincil mürekkep).
                     Künye yönü: %58'in sağında sola, komşusu varsa alta,
                     eksene yakınsa üste; `sola-dar` dar bantta erken sola
                     (kabuk.css, medya). */
                  /* Yan, kuralın SEÇTİĞİ yandır: doğal yanı dolu bir künye
                     öbür yana geçer ve işaretine yakın kalır. */
                  className={`isaret${yer.sola ? ' sola' : ''}${
                    x > SOLA_DAR_ESIGI ? ' sola-dar' : ''}${
                    uygunsuz > 0 ? ' oncelik' : ''}${yukari(s) ? ' kunye-yukari' : ''}`}
                  style={{ left: `${x}%`, bottom: `${dikey(s)}%`,
                    ['--yol' as string]: yer.yol }}>
                  {uygunsuz > 0 && <span className="halka" aria-hidden />}
                  <span className="kare" aria-hidden
                    style={{ background: tipRengi(s.tipKod) }} />
                  <span className="kunye">
                    <span className="ad">{s.ad}</span>
                    {/* Güç dikey eksende ve kartta okunur; künye yalnız
                        endeks ve uygunsuz sayısını yazar (güç `title`ta). */}
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
            {/* ÇENTİKLER PENCEREYİ YAZAR. Yakınlaştırılmış bir eksen,
                aralığını söylemediği sürece yalandır: "%50 → %70"
                yazan bir eksende okuyan kişi farkı doğru ölçekler,
                yazmayan bir eksende dört puanlık farkı uçurum sanır.
                `aria-hidden` bilinçli — her noktanın erişilebilir adı
                kendi MUTLAK değerini zaten taşıyor (`%62`), pencere
                yalnız göreli konumu okumak için gerekli. */}
            {xPencere && (
              <>
                <span className="mono centik bas" aria-hidden>%{centikYazi(xPencere.alt, xPencere.adim)}</span>
                <span className="mono centik son" aria-hidden>%{centikYazi(xPencere.ust, xPencere.adim)}</span>
              </>
            )}
            {/* Dikey çentik YALNIZ birim tekse yazılır (bkz. `yBirim`).
                Birim üst çentikte durur: büyüklüğü orada okunur ve iki
                kez yazmak aynı bilgiyi tekrar ettirirdi. */}
            {yPencere && yBirim !== null && (
              <>
                <span className="mono centik y-alt" aria-hidden>{centikYazi(yPencere.alt, yPencere.adim)}</span>
                <span className="mono centik y-ust" aria-hidden>
                  {centikYazi(yPencere.ust, yPencere.adim)}{yBirim && ` ${yBirim}`}
                </span>
              </>
            )}
            <span className="mono eksenad x">uyum endeksi →</span>
            <span className="mono eksenad y">↑ kurulu güç</span>
            <span className="mono hedef" aria-hidden>↗ güçlü ve uyumlu</span>
          </div>
          {gucsuz.length > 0 && (
            /* GÜCÜ ÖLÇÜLMEMİŞ ŞERİDİ — eksenin ALTINDA, adı konmuş.
               Bu tesislerin uyum endeksi ÖLÇÜLDÜ, kurulu gücü ölçülmedi.

               BİÇİM NEDEN LİSTE, KONUMLU DAĞILIM DEĞİL: ilk yazımda
               işaretler yatay eksene (uyum endeksi) oturtuldu ve künyeler
               yanlarına yazıldı. Ölçüldü (1440×900): şerit TEK SATIR
               olduğu için dört künye aynı Y'de çakıştı ve okunamaz bir
               metin çıktı — tuvalde düzelttiğim kusurun aynısını şeridin
               içinde yeniden ürettim. Kaldı ki tuvalin sorduğu soru
               "güçlü mü ve uyumlu mu"dur; gücü ölçülmemiş bir tesis o
               soruyu yanıtlayamaz, yatay yerini korumak onu hâlâ tuvalin
               parçasıymış gibi gösterir. Bugün: sıralı, sıkışık bir
               liste — en düşük endeks önce, yani karar sırasıyla. */
            <div className="ab-gucsuz">
              {/* `title` KALKTI: sebebi etiketin kendisi söylüyor
                  ("Kurulu güç ölçülmedi"), sonucu da konumu — şerit
                  eksenin ALTINDA duruyor. Not, odaklanamayan bir öğede
                  yalnız fareyle ulaşılabilir bir kopyaydı. */}
              <p className="mono etiket">
                Kurulu güç ölçülmedi · {gucsuz.length} {terim('tesis')}
              </p>
              <ul className="serit">
                {[...gucsuz].sort((a, b) => (a.endeks ?? 0) - (b.endeks ?? 0)).map((g) => {
                  const uygunsuz = g.sayim.uyumsuz ?? 0;
                  return (
                    <li key={g.id}>
                      <Link href={`/tesisler/${g.id}`}
                        className={uygunsuz > 0 ? 'oncelik' : undefined}>
                        <span className="kare" aria-hidden
                          style={{ background: tipRengi(g.tipKod) }} />
                        <span className="ad">{g.ad}</span>
                        <span className="mono deger">%{g.endeks}</span>
                        {uygunsuz > 0 && (
                          <span className="mono uygunsuz">{uygunsuz} uygunsuz</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

    </section>
  );
}

/** Değerlendirilmemiş yığının TEK cümlesi — hem erişilebilir ad hem
 *  `title`. İkisi ayrışırsa bilgi yine yalnız birinde kalır. */
const BOS_YIGIN_SOZU = 'Değerlendirilmemiş — endeks ölçülmedi, sıfır değil';

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
    /* Erişilebilir ad ile `title` AYNI cümledir. Eskiden ad yalnız
       "değerlendirilmemiş" diyordu ve kuralın kendisi ("sıfır değil")
       yalnız `title`ta duruyordu — yani fareyle gezinmeyen hiç kimse
       göremiyordu. `title` fare kolaylığı olarak kalır, BİLGİ ADDADIR. */
    return <div className="ab-b-yigin bos" role="img" aria-label={BOS_YIGIN_SOZU} title={BOS_YIGIN_SOZU} />;
  }
  const p = (n: number) => `${(n / toplam) * 100}%`;
  const sayim = `${uygun} uygun, ${kismi} kısmi, ${uygunsuz} uygunsuz, ${bilinmeyen} değerlendirilmedi`;
  /* Kontrol sayısı ERİŞİLEBİLİR ADIN İÇİNDE. Eskiden yalnız `title`ta
     duruyordu: ekran okuyucu "13 uygun, 11 kısmi…" duyuyor ama NEYİN
     içinde olduğunu duymuyordu; klavye kullanıcısı hiç göremiyordu. */
  const soz = kontrol !== undefined ? `${kontrol} kontrol · ${sayim}` : sayim;
  return (
    <div className="ab-b-yigin" role="img" aria-label={soz} title={soz}>
      {uygun > 0 && <span style={{ width: p(uygun), background: uygunRengi(tip) }} />}
      {kismi > 0 && <span className="kismi" style={{ width: p(kismi) }} />}
      {uygunsuz > 0 && <span className="uygunsuz" style={{ width: p(uygunsuz) }} />}
      {bilinmeyen > 0 && <span className="bilinmeyen" style={{ width: p(bilinmeyen) }} />}
    </div>
  );
}

/* ── Saha kartı ─────────────────────────────────────────────────────── */
function SahaKarti({ s }: { s: TesisKarti }) {
  const foto = kucukGorsel(s.gorselAnahtari);
  const uygunsuz = s.sayim.uyumsuz ?? 0;
  const skorSozu = s.endeks === null ? 'değerlendirilmedi' : `%${s.endeks}`;
  return (
    <Link href={`/tesisler/${s.id}`} className={`kart${uygunsuz > 0 ? ' uyari' : ''}`}
      /* Kırmızı iç çerçeve kalktı (SAH-SER-001): uygunsuzluk yığın
         çubuğunda, skor renginde ve burada SÖZCÜKLE durur — renk tek
         kanal olmasın. Tip de burada: üst satır dar kartta kırpılabilir
         (inceleme bulgusu, PR #64), tam etiket bağ başlığında durur. */
      title={`${s.ad} · ${tipAdi(s.tipKod, s.tipAd)} · ${kartGucu(s) ?? 'güç ölçülmedi'} · ${skorSozu}${uygunsuz > 0 ? ` · ${uygunsuz} uygunsuz` : ''}`}>
      {/* Şerit hero'nun altındadır; kartlar ilk boyamayı beklemesin diye
          tembel yüklenir. Hero fonu (`SahaArkaPlani`) `fetchPriority="high"` ile kalır. */}
      {foto
        // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım
        ? <img src={foto} alt="" aria-hidden loading="lazy" decoding="async" />
        : <span className="fotoyok" aria-hidden />}
      <span className="icerik">
        {/* Üst satır: tip · güç solda, skor sağda; ad tam genişlikte kendi
            satırında. Üç satırlık blok (tip / ad / güç·skor) 1366×768'de
            fotoğraf bandına 39px bırakıyordu (ölçüldü); iki satır 73px
            bırakır ve ad kırpılmadan tam genişlikte kalır. */}
        <span className="ust">
          <span className="kimlik">
            <span className="mono tip" style={{ color: tipRengi(s.tipKod) }}>
              {tipAdi(s.tipKod, s.tipAd)}
            </span>
            <span className="mono guc">{kartGucu(s) ?? '—'}</span>
          </span>
          <span className="mono skor">{s.endeks === null ? '—' : `%${s.endeks}`}</span>
        </span>
        <span className="ad">{s.ad}</span>
        <Yigin uygun={s.sayim.uyumlu ?? 0} kismi={s.sayim.kismi ?? 0}
          uygunsuz={uygunsuz} bilinmeyen={s.bilinmeyen} tip={s.tipKod ?? ''} />
      </span>
    </Link>
  );
}
