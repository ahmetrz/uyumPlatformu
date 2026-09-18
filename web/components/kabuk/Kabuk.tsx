'use client';
import Link from 'next/link';
import { SozlukSaglayici, type SektorSecenegi } from '@/lib/dil/SozlukSaglayici';
import SektorMercegi from './SektorMercegi';
import BolumSecici from './BolumSecici';
import { t, type Sozluk } from '@/lib/dil/terimler';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import HesapMenusu from '@/components/kabuk/HesapMenusu';
import AramaDugmesi from '@/components/AramaDugmesi';
import KomutPaleti from '@/components/KomutPaleti';
import YardimKatmani from '@/components/YardimKatmani';
import {
  aktifMi, alanAktif, alanlariCoz, ikincilSec, katlanirMi, ogeAktif, sayacEtiketi, sayacMetni,
  ucunculSec, yogunlukSec,
} from './yonler';

/* Uygulama kabuğu — TEK KABUK.

   UX denetimi 2026-09 (PR #7) üç ayrı kabuğun (A tezgâh · B saha · C
   defter) ölçülen maliyetini yazdı: üç palet, dört yazı ailesi (24 font
   dosyası, 915 KB), üç gezinme grameri, üç farklı içerik başlangıcı
   (52 / 56 / 207px). Onaylanan yön: Saha'nın dili master, tek kabuk.

   Dikey yapı (yukarıdan aşağıya, hepsi kabuğun malı):
     56px  `.ab-ust`     marka · beş alan · arama · bildirim · hesap menüsü
     36px  `.ab-ikincil` alanın kendi ekranları (Saha ve yardımcı rotalarda YOK)
     30px  `.ab-ucuncul` aktif grubun alt ekranları (yalnız Varlık)
     1fr   `#icerik`     ekranın kendi <main>'i
     32px  `.ab-durum`   sistem durumu: veri kesiti · bağlayıcı sayımları
     32px  `.ab-alt`     ayak: ürün · sürüm · yardım · destek · telif
   Amiral yoğunlukta (Saha, Portföy, Harita, Tesis 360) iki satır
   sıkışır (durum 26 + ayak 22) ama BİRLEŞMEZ: ürün sahibi kabulü
   (2026-09) "footer ≠ sistem durumu" kuralının her ekranda iki ayrı
   semantik bölge olmasını ister; Saha'nın yükseklik bütçesi 48px'e
   göre kurulur (`.ab-b-genel`).

   Kabuk yoğunluğu ve alanı ROTADAN türetir; ekranlar bir şey geçirmez.
   URL'ler, RBAC ve kapsam DEĞİŞMEZ — bu salt sunum katmanıdır.

   Korunan kararlar: `aria-current="page"` belgede TEK (alan sekmesi);
   ikincil sıra `aria-current="true"` taşır ("bulunduğun bölüm"); odak
   halkası `:focus-visible`; atla bağı belgenin ilk odaklanabilir öğesi;
   durum satırının sayıları YETKİ kapısından geçer (`veri.ayak`). */

export type KabukKullanicisi = { ad: string; unvan: string | null; demo?: boolean; yonetim?: boolean } | null;

export type KabukVerisi = {
  kullanici: KabukKullanicisi;
  /** İkincil sıranın sağ ucu için: grup · tüzel kişi sayısı · tesis sayısı. */
  kapsam: { grup: string; tuzelKisi: number; tesis: number } | null;
  /** Sistem durumu — yalnız yetkili kullanıcıya doldurulur, yoksa `null`. */
  ayak: { toplam: number; sayimlar: Record<string, number>; sonKosu: string | null } | null;
  /** Veri kesiti damgası (ISO). Uydurulmaz; yoksa `null`. */
  kesit: string | null;
  /** Aktif kullanıcının okunmamış bildirim sayısı; oturum yoksa 0. */
  okunmamis: number;
  /** Ayak künyesi: package.json sürümü ve çalışma ortamı. */
  surum: string;
  ortam: 'demo' | 'gelistirme' | 'uretim';
  /** Ayak künye metni — yönetim konsolundan (A sınıfı) ayarlanır; kod varsayılanı platform adı. */
  kunye: string;
  /** KURULUMUN ve ÜRÜNÜN görünen adları — SUNUCUDAN iner, istemci paketinden
      okunmaz. Ölçüldü (P7 · compose duman kapısı): `NEXT_PUBLIC_*` değeri
      İSTEMCİ paketine DERLEME ANINDA gömülür; kurulum onu çalışma anında
      verdiğinde sunucu kurulumun adını, istemci derleme anındaki varsayılanı
      çizdi — 58 sayfada hidrasyon uyuşmazlığı (React #418) ve hidrasyondan
      sonra YANLIŞ kiracı adı. Tek imajla çok kurulum ancak böyle olur. */
  kiraciAd: string;
  markaAd: string;
  /** Kapsamın terim sözlüğü; `null` = sektör tek değil ya da yok →
      çekirdek sözcük. Kabuğun altındaki her istemci bileşen buna
      `useTerim()` ile erişir (`lib/dil/SozlukSaglayici.tsx`). */
  sozluk: Sozluk | null;
  /** Kapsamda geçen sektörler; ikiden azsa mercek çizilmez. */
  sektorler: SektorSecenegi[];
  /** Tesis → sektör eşlemesi; kayıt listeleri mercekle bunu süzer. */
  tesisSektoru: Record<string, string>;
};

const TARIH = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
});

function damga(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? '—' : TARIH.format(t);
}

export default function Kabuk({ veri, children }: { veri: KabukVerisi; children: ReactNode }) {
  const patika = usePathname() ?? '/';
  const yogunluk = yogunlukSec(patika);
  const ikincil = ikincilSec(patika, veri.sozluk);
  const ucuncul = ucunculSec(patika);
  /* Kabuk, sağlayıcının KENDİSİDİR: `useTerim()` burada çağrılamaz
     (bağlam bir alt katmanda başlar), sözlük doğrudan veriden okunur. */
  const alanlar = useMemo(() => alanlariCoz(veri.sozluk), [veri.sozluk]);

  /* ── AKTİF ÜÇÜNCÜL EKRAN GÖRÜNÜR OLARAK AÇILIR ─────────────────────
     ÖLÇÜLEN KUSUR (mobil audit, 375×812): üçüncül sıra dar bantta yatay
     kayıyor ve sıfırdan başlıyordu; ölçülen 19 rotanın ALTISINDA aktif
     ekran görünür alanın dışındaydı (`/tedarikciler` 537px, `/yedek-parca`
     441px, `/varlik-aktarim` 376px, `/esleme` 330px, `/yedekleme` 353px,
     `/zimmetlerim` 280px). Kullanıcı "hangi alt ekrandayım" sorusunu
     bakarak cevaplayamıyor, önce kaydırması gerekiyordu.

     Sıra buradaki KATLANMAZ — ikincil sıradan farkı ölçüde: en genişi
     649px, yani 1,7 ekran ve grup adı başta sabit duruyor. İkinci bir
     açılır katman, birincinin altında, bir tıklamayı iki yapardı.
     Yetersiz olan kaydırma değil, KONUMDU.

     Yalnız sıranın KENDİ `scrollLeft`i değişir: `scrollIntoView` atalara
     da dokunur ve sayfayı kaydırırdı. Yumuşak geçiş YOK — bu bir
     animasyon değil, açılış konumudur; hareket azaltma tercihi olan
     kullanıcı için de doğru davranış anında doğru yerde olmaktır. */
  const ucunculKok = useRef<HTMLElement>(null);
  useEffect(() => {
    const sira = ucunculKok.current;
    if (!sira) return;
    const aktif = sira.querySelector<HTMLElement>('a[aria-current="true"]');
    if (!aktif) return;
    if (sira.scrollWidth <= sira.clientWidth) return;
    const sol = aktif.offsetLeft - sira.offsetLeft;
    const sag = sol + aktif.offsetWidth;
    /* Görünür pencerenin dışındaysa içeri al; içindeyse DOKUNMA —
       her rota değişiminde sırayı zıplatmak da bir kusurdur. */
    if (sol < sira.scrollLeft) sira.scrollLeft = Math.max(0, sol - 20);
    else if (sag > sira.scrollLeft + sira.clientWidth) {
      sira.scrollLeft = sag - sira.clientWidth + 20;
    }
  }, [patika]);
  return (
    /* Sözlük kabuğun KÖKÜNDE verilir: altındaki her istemci bileşen —
       ekranların kendileri dâhil — `useTerim()` ile aynı sözcüğü okur ve
       hiçbir katman prop taşımak zorunda kalmaz. */
    <SozlukSaglayici sozluk={veri.sozluk} sektorler={veri.sektorler}
      tesisSektoru={veri.tesisSektoru}>
    <div className="ab" data-yogunluk={yogunluk}>
      {/* İÇERİĞE ATLA — belgenin İLK odaklanabilir öğesi. Görünmez; klavye
          odağı gelince görünür (`.ab-atla`). Hedef `#icerik` sarmalayıcısı
          (bir `<div>`: `<main>` her ekranın KENDİ kökündedir, kabuk ikinci
          bir main açmaz). */}
      <a href="#icerik" className="ab-atla">İçeriğe atla</a>
      <header className="ab-ust">
        <Link href="/" className="marka" aria-label={`${veri.markaAd} — ana ekran`}>
          {veri.kiraciAd.toLocaleUpperCase('tr-TR')}<span className="ikinci">{veri.markaAd}</span>
        </Link>
        {/* ── ÖRNEK VERİ İŞARETİ ────────────────────────────────────────
            Depodaki bütün kayıtlar KURGUSALDIR: hiçbir gerçek kurum,
            tesis ya da kişi yoktur. İşaret ayakta küçük puntoyla
            duruyordu; ayağı gören yok. Bir demo ekranının ekran
            görüntüsü alınıp sunuma konduğunda, o görüntünün üstünde
            "örnek veri" yazmalı — yoksa kurgusal bir sayı gerçek bir
            iddiaya dönüşür.

            ÜRETİMDE GÖSTERİLMEZ: gerçek kiracının kendi verisine "örnek"
            demek, ürünün söylediği her şeyi şüpheli yapardı. Koşul
            bu yüzden "demo mu" değil "üretim DEĞİL mi" — geliştirme
            ortamında da görünür, çünkü orada da veri kurgusaldır ve
            işaretin kapalı unutulması tam olarak böyle başlar. */}
        {veri.ortam !== 'uretim' && (
          <span className="ab-ornek-veri" title="Bu kurulumdaki bütün kayıtlar kurgusaldır">
            Örnek veri
          </span>
        )}
        <nav aria-label="Alanlar">
          {alanlar.map((o) => (
            <Link key={o.yol} href={o.yol}
              aria-current={alanAktif(o, patika) ? 'page' : undefined}>
              {o.ad}
            </Link>
          ))}
        </nav>
        {/* Mercek yardımcı bir eylem DEĞİL bağlam kontrolüdür ("neye
            bakıyorum") ve üst çubuğun DOĞRUDAN çocuğudur — yardımcı
            kümenin (`.sag`) içinde değil. Ölçüldü (8 Eyl 2026): içinde
            durduğunda dar bant sıralaması (`order`) `.sag`ın içine
            hapsoluyordu ve mercek gezinmeden önce yerleştirilemiyordu;
            oysa öncelik sırası marka → mercek → gezinme → hesaptır. */}
        <SektorMercegi />
        <div className="sag">
          <AramaDugmesi />
          {veri.kullanici && <BildirimBagi n={veri.okunmamis} patika={patika} />}
          {veri.kullanici && <HesapMenusu kullanici={veri.kullanici} patika={patika} />}
        </div>
      </header>

      {ikincil.length > 0 && (
        <nav className="ab-ikincil" aria-label="Bölümler"
          data-katlanir={katlanirMi(ikincil) ? 'true' : undefined}>
          {/* DAR BANTTA SIRA KATLANIR (mobil audit ölçümü:
              `yonler.ts → DAR_BANT_BAG_TAVANI`). Katlanan sıra 375px'te
              gizlenir ve yerine tek bir bölüm seçici düğmesi geçer;
              ≤700px dışında seçici çizilmez, sıra bugünkü gibi sarar.
              İKİSİ DE BELGEDEDİR ama yalnız biri görünür: bant kararı
              CSS'indir, bileşen bandı ölçmez — ölçseydi sunucu geniş
              bandı çizer, istemci dar bandı düzeltir ve ilk karede
              yanlış yüzey yanardı. Kapalı seçicinin bağları DOM'da
              YOKTUR (hesap menüsüyle aynı), o yüzden bağ tekrarı da
              yoktur. */}
          {katlanirMi(ikincil) && (
            <BolumSecici gruplar={ikincil} patika={patika}
              alanAd={alanlar.find((o) => alanAktif(o, patika))?.ad ?? 'Bölümler'} />
          )}
          {/* Grup ADIYLA duyurulur. Görsel ayrım dikey çizgidir
              (`.grup + .grup`); ekran okuyucu onu göremez ve `/uyum`un
              on dokuz bağını TEK yığın olarak duyardı. `aria-label`
              satırın enini DEĞİŞTİRMEZ — görünür başlık üçüncü satır
              riski doğuruyordu (bkz. yonler.ts). */}
          {ikincil.map((grup) => (
            <div key={grup.ad} className="grup" role="group" aria-label={grup.ad}>
              {grup.ogeler.map((o) => (
                <Link key={o.yol} href={o.yol}
                  aria-current={ogeAktif(o, patika) ? 'true' : undefined}>
                  {o.ad}
                </Link>
              ))}
            </div>
          ))}
          {veri.kapsam && (
            <span className="mono etiket sag dar-gizle">
              {veri.kapsam.grup} · {veri.kapsam.tesis} {t(veri.sozluk, 'tesis')}
            </span>
          )}
        </nav>
      )}

      {/* Üçüncül sıra — aktif grubun alt ekranları (yalnız Varlık'ta var).
          Grup adı satırın başında durur ki "Keşif" tek başına değil
          "Envanter › Keşif" olarak okunsun; alt ekranın aktifliği
          `aria-current="true"` (belgede tek "page" alan sekmesidir). */}
      {ucuncul && (
        <nav className="ab-ucuncul" ref={ucunculKok}
          aria-label={`${ucuncul.grup.ad} ekranları`}>
          <span className="grupad">{ucuncul.grup.ad}</span>
          {ucuncul.ogeler.map((o) => (
            <Link key={o.yol} href={o.yol}
              aria-current={aktifMi(o.yol, patika) ? 'true' : undefined}>
              {o.ad}
            </Link>
          ))}
        </nav>
      )}

      {/* ── BASKI KÜNYESİ — YALNIZ YAZDIRMADA GÖRÜNÜR ──────────────────
          `@media print` üst çubuğu gizliyor; "Örnek veri" rozeti orada
          durduğu için YAZDIRILAN sayfada kayboluyordu. Bir demo
          ekranının çıktısı toplantı masasına konduğunda üstünde kurgusal
          olduğu YAZMALI — ekranda görünüp kâğıtta kaybolan bir uyarı,
          en çok ihtiyaç duyulan yerde yok demektir.

          Ayrı bir öğe: rozeti baskıda göstermek için üst çubuğu açmak,
          gezinmeyi de kâğıda basardı. */}
      {veri.ortam !== 'uretim' && (
        <div className="ab-baski-kunye" aria-hidden>
          <strong>ÖRNEK VERİ</strong>
          <span>{veri.kunye} · bu çıktıdaki bütün kayıtlar kurgusaldır ve
            gerçek bir kuruma ait değildir</span>
        </div>
      )}

      {/* Atla bağının hedefi. `tabIndex={-1}`: bağ tıklanınca odak buraya
          iner, sonraki Tab içerikten devam eder (Safari/Firefox'ta
          `href="#…"` tek başına odağı taşımıyordu). */}
      <div id="icerik" tabIndex={-1} className="ab-icerik">{children}</div>

      <SistemDurumu veri={veri} />
      <Ayak veri={veri} />

      {/* Komut paleti (Ctrl/⌘+K) ve kısayol katmanı (?) kabuğun İÇİNDE:
          token'lar `.ab` üzerinde yaşar, dışarıda monte edilince renksiz
          kalıyordu. */}
      <KomutPaleti />
      <YardimKatmani />
    </div>
    </SozlukSaglayici>
  );
}

/* ═══ Okunmamış bildirim rozeti (D30) ═════════════════════════════════
   Sıfırda HİÇ çizilmez (`sayacMetni` null döner). Görünen metin 99'da
   kırpılır, ekran okuyucuya gerçek sayı okunur; rozetin kendisi
   `aria-hidden` çünkü bağın erişilebilir adı zaten sayıyı taşır. */
function Sayac({ n }: { n: number }) {
  const metin = sayacMetni(n);
  if (metin === null) return null;
  return <span className="ab-sayac mono" aria-hidden>{metin}</span>;
}

/* ═══ Bildirim bağı — tek sayaçlı eylem ═══════════════════════════════
   Eskiden Bildirim · Ayarlar · Yardım · Çıkış dört eş çerçeveli düğmeydi
   ve birincil gezinmeyle ağırlık yarıştırıyordu (ürün sahibi, 2026-09).
   Şimdi üst çubukta iki yardımcı eylem kalır: bu bağ (çerçevesiz, yalnız
   sayaç rozeti dikkat çeker) ve hesap menüsü (Ayarlar · Yardım · Yönetim
   · Çıkış, `HesapMenusu`). `aria-current="page"` /bildirimler'de burada
   yanar — belgede tek geçerli sayfa sözleşmesi korunur. */
function BildirimBagi({ n, patika }: { n: number; patika: string }) {
  return (
    <Link href="/bildirimler" className="bildirim"
      aria-current={aktifMi('/bildirimler', patika) ? 'page' : undefined}
      aria-label={n > 0 ? `Bildirimler — ${sayacEtiketi(n)}` : 'Bildirimler'}>
      Bildirim<Sayac n={n} />
    </Link>
  );
}

/* ═══ Sistem durumu — bağlayıcı dürüstlüğü ════════════════════════════
   Denetim §9: sistem durumu AYAK DEĞİLDİR. Ayak kurumsal künyedir (sürüm,
   yardım, telif); durum satırı canlı veridir (veri kesiti, bağlayıcı
   sayımları, son koşu). İkisi aynı satırda dururken kullanıcı hangisinin
   "şimdi" hangisinin "her zaman" olduğunu ayıramıyordu.

   `veri.ayak` null ise sayımlar HİÇ çizilmez: yetkisiz kullanıcı için
   sunucu onu zaten doldurmaz. Bağlanmamış kaynak "canlı" gösterilmez.
   Veri kesiti damgası eskiden üst çubuktaydı; oraya değil buraya aittir
   — o da bir sağlık bilgisidir. */

const DURUM_KALEMLERI: { anahtar: string; etiket: string; sinif: string }[] = [
  { anahtar: 'etkin', etiket: 'bağlı', sinif: 'g-uygun' },
  { anahtar: 'kimlik_bekleniyor', etiket: 'kimlik bekliyor', sinif: 'g-kismi' },
  { anahtar: 'taslak', etiket: 'yapılandırılmamış', sinif: 'g-yok' },
  { anahtar: 'duraklatildi', etiket: 'duraklatıldı', sinif: 'g-disi' },
  { anahtar: 'hatali', etiket: 'hatalı', sinif: 'g-uygunsuz' },
];

function SistemDurumu({ veri }: { veri: KabukVerisi }) {
  const a = veri.ayak;
  return (
    <section className="ab-durum ab-baskida-gizle" aria-label="Sistem durumu">
      <span className="kalem">
        <span className="etiket">Veri kesiti</span>
        <span className="mono">{veri.kesit ? damga(veri.kesit) : 'yok'}</span>
      </span>
      {a && (
        <>
          <span className="kalem">
            <span className="etiket">Bağlayıcı</span>
            <span className="mono">{a.toplam}</span>
            {a.toplam === 0 && <span>tanımlı değil</span>}
          </span>
          {DURUM_KALEMLERI.filter((k) => (a.sayimlar[k.anahtar] ?? 0) > 0).map((k) => (
            <span key={k.anahtar} className="kalem">
              <span className={`ab-glif ${k.sinif}`} aria-hidden />
              <span>{k.etiket}</span>
              <span className="mono">{a.sayimlar[k.anahtar]}</span>
            </span>
          ))}
          <span className="kalem sag">
            <span className="etiket">Son başarılı koşu</span>
            <span className="mono">{damga(a.sonKosu)}</span>
          </span>
        </>
      )}
    </section>
  );
}

/* ═══ Ayak — kurumsal künye ═══════════════════════════════════════════
   Sabit metin; veriye bağlı tek öğe sürüm/ortam. Gizlilik / kullanım
   koşulları sayfası UYDURULMAZ (kurum metni yok; denetim §9'daki yer
   tutucular bilinçli olarak bırakıldı): yalnız VAR OLAN hedeflere
   bağlanır — yardımın destek ve kısayol bölümleri. `/sistem` (tasarım sistemi referansı) gezinmede yeri olmayan
   ama ulaşılabilir kalması gereken rotadır; yeri ayaktır. */
const ORTAM_ADI: Record<KabukVerisi['ortam'], string> = {
  demo: 'demo', gelistirme: 'geliştirme', uretim: 'üretim',
};

function Ayak({ veri }: { veri: KabukVerisi }) {
  return (
    <footer className="ab-alt ab-baskida-gizle">
      {/* ── KİMLİK KÜMESİ · solda ────────────────────────────────────
          Üç öğe de aynı soruyu yanıtlar: "bu kurulum NEDİR". Ayrı bir
          kutu ya da çizgi açmazlar; kümeyi boşluk kurar. */}
      <span className="kunye">{veri.kunye}</span>
      {/* Derleme koordinatı. Başlıktaki "Örnek veri" işaretiyle TEKRAR
          DEĞİLDİR: o işaret "bu sayılar gerçek mi" sorusunu yanıtlar ve
          bir UYARIDIR; bu dize "hangi derlemedeyim" sorusunu yanıtlar ve
          destek kaydına yazılacak koordinattır. İki ayrı karar amacı. */}
      <span className="surum mono">v{veri.surum} · {ORTAM_ADI[veri.ortam]}</span>
      {/* ── TELİF KİRACININ ADIDIR, SABİT DEĞİL ──────────────────────
          Ölçüldü (18 Eyl 2026): burada `© 2026 Demo Enerji` KODA
          GÖMÜLÜYDÜ. Başlık kiracı adını yapılandırmadan okuyordu
          (`veri.kiraciAd`), ayak okumuyordu — yani su kiracısı kurunca
          başlıkta "ŞEHİR SU", ayakta "Demo Enerji" yazıyordu. Üstelik
          "Enerji" ÇEKİRDEK bir kabuk bileşeninde duran bir SEKTÖR
          sözcüğüydü (sektör bağımsızlık kuralı).

          Marka kapısı bunu göremiyordu: nöbetçi adla yalnız `MARKA_AD`
          sızıntısını ölçüyor, `KIRACI_AD` için böyle bir diş yoktu.
          Kapıya o diş eklendi (`arac/marka-kapisi.mjs`).

          Yıl da sabit yazılmaz: bir sonraki yıl ürün kendi künyesinde
          bayat bir tarih gösterirdi. */}
      <span className="telif">© {new Date().getFullYear()} {veri.kiraciAd}</span>
      {/* ── GEZİNME KÜMESİ · sağda ───────────────────────────────────
          "Nereye gidebilirim". `margin-left: auto` ile kimlik kümesinden
          ayrılır; eskiden telif bu kümenin İÇİNE düşüyor ve bağlarla tek
          küme gibi okunuyordu. */}
      <nav aria-label="Ayak bağları">
        <Link href="/yardim">Yardım</Link>
        <Link href="/yardim#yardim-destek">Destek</Link>
        <Link href="/yardim#yardim-kisayol">Kısayollar</Link>
        <Link href="/sistem">Tasarım sistemi</Link>
      </nav>
    </footer>
  );
}
