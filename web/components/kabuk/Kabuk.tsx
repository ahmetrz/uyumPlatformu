'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import HesapMenusu from '@/components/kabuk/HesapMenusu';
import AramaDugmesi from '@/components/AramaDugmesi';
import KomutPaleti from '@/components/KomutPaleti';
import YardimKatmani from '@/components/YardimKatmani';
import {
  ALANLAR, aktifMi, alanAktif, ikincilSec, ogeAktif, sayacEtiketi, sayacMetni, ucunculSec,
  yogunlukSec,
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
   Amiral yoğunlukta (Saha, Portföy, Harita, Santral 360) iki satır
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
  /** İkincil sıranın sağ ucu için: grup · tüzel kişi sayısı · santral sayısı. */
  kapsam: { grup: string; tuzelKisi: number; santral: number } | null;
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
  const ikincil = ikincilSec(patika);
  const ucuncul = ucunculSec(patika);
  return (
    <div className="ab" data-yogunluk={yogunluk}>
      {/* İÇERİĞE ATLA — belgenin İLK odaklanabilir öğesi. Görünmez; klavye
          odağı gelince görünür (`.ab-atla`). Hedef `#icerik` sarmalayıcısı
          (bir `<div>`: `<main>` her ekranın KENDİ kökündedir, kabuk ikinci
          bir main açmaz). */}
      <a href="#icerik" className="ab-atla">İçeriğe atla</a>
      <header className="ab-ust">
        <Link href="/" className="marka" aria-label="Zorlu Enerji Yönetişim Platformu — ana ekran">
          ZORLU ENERJİ<span className="ikinci">Yönetişim Platformu</span>
        </Link>
        <nav aria-label="Alanlar">
          {ALANLAR.map((o) => (
            <Link key={o.yol} href={o.yol}
              aria-current={alanAktif(o, patika) ? 'page' : undefined}>
              {o.ad}
            </Link>
          ))}
        </nav>
        <div className="sag">
          <AramaDugmesi />
          {veri.kullanici && <BildirimBagi n={veri.okunmamis} patika={patika} />}
          {veri.kullanici && <HesapMenusu kullanici={veri.kullanici} patika={patika} />}
        </div>
      </header>

      {ikincil.length > 0 && (
        <nav className="ab-ikincil" aria-label="Bölümler">
          {ikincil.map((grup, i) => (
            <div key={grup.baslik ?? i} className="grup">
              {grup.baslik && <span className="etiket" aria-hidden>{grup.baslik}</span>}
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
              {veri.kapsam.grup} · {veri.kapsam.santral} santral
            </span>
          )}
        </nav>
      )}

      {/* Üçüncül sıra — aktif grubun alt ekranları (yalnız Varlık'ta var).
          Grup adı satırın başında durur ki "Keşif" tek başına değil
          "Envanter › Keşif" olarak okunsun; alt ekranın aktifliği
          `aria-current="true"` (belgede tek "page" alan sekmesidir). */}
      {ucuncul && (
        <nav className="ab-ucuncul" aria-label={`${ucuncul.grup.ad} ekranları`}>
          <span className="grupad">{ucuncul.grup.ad}</span>
          {ucuncul.ogeler.map((o) => (
            <Link key={o.yol} href={o.yol}
              aria-current={aktifMi(o.yol, patika) ? 'true' : undefined}>
              {o.ad}
            </Link>
          ))}
        </nav>
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
      <span className="kunye">
        {veri.kunye}
        <span className="mono"> · v{veri.surum} · {ORTAM_ADI[veri.ortam]}</span>
      </span>
      <nav aria-label="Ayak bağları">
        <Link href="/yardim">Yardım</Link>
        <Link href="/yardim#yardim-destek">Destek</Link>
        <Link href="/yardim#yardim-kisayol">Kısayollar</Link>
        <Link href="/sistem">Tasarım sistemi</Link>
      </nav>
      <span className="telif">© 2026 Zorlu Enerji</span>
    </footer>
  );
}
