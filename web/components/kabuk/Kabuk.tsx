'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import CikisDugmesi from '@/components/CikisDugmesi';
import AramaDugmesi from '@/components/AramaDugmesi';
import KomutPaleti from '@/components/KomutPaleti';
import YardimKatmani from '@/components/YardimKatmani';
import {
  ALANLAR, UST_BAGLAR, aktifMi, alanAktif, ikincilSec, sayacEtiketi, sayacMetni,
  yogunlukSec,
} from './yonler';

/* Uygulama kabuğu — TEK KABUK.

   UX denetimi 2026-09 (PR #7) üç ayrı kabuğun (A tezgâh · B saha · C
   defter) ölçülen maliyetini yazdı: üç palet, dört yazı ailesi (24 font
   dosyası, 915 KB), üç gezinme grameri, üç farklı içerik başlangıcı
   (52 / 56 / 207px). Onaylanan yön: Saha'nın dili master, tek kabuk.

   Dikey yapı (yukarıdan aşağıya, hepsi kabuğun malı):
     56px  `.ab-ust`     marka · beş alan · arama · hesap · çıkış
     36px  `.ab-ikincil` alanın kendi ekranları (Saha ve yardımcı rotalarda YOK)
     1fr   `#icerik`     ekranın kendi <main>'i
     32px  `.ab-durum`   sistem durumu: veri kesiti · bağlayıcı sayımları
     32px  `.ab-alt`     ayak: ürün · sürüm · yardım · destek · telif
   Amiral yoğunlukta (Saha, Portföy, Harita, Santral 360) durum ve ayak
   TEK 28px satırda birleşir: tek ekrana sığma bütçesi (denetim §7) başka
   türlü tutmuyordu.

   Kabuk yoğunluğu ve alanı ROTADAN türetir; ekranlar bir şey geçirmez.
   URL'ler, RBAC ve kapsam DEĞİŞMEZ — bu salt sunum katmanıdır.

   Korunan kararlar: `aria-current="page"` belgede TEK (alan sekmesi);
   ikincil sıra `aria-current="true"` taşır ("bulunduğun bölüm"); odak
   halkası `:focus-visible`; atla bağı belgenin ilk odaklanabilir öğesi;
   durum satırının sayıları YETKİ kapısından geçer (`veri.ayak`). */

export type KabukKullanicisi = { ad: string; unvan: string | null; demo?: boolean } | null;

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
          {veri.kullanici && (
            <span className="kisi dar-gizle">
              <span className="ad">{veri.kullanici.ad}</span>
              {veri.kullanici.unvan && <span className="etiket">{veri.kullanici.unvan}</span>}
            </span>
          )}
          <HesapBaglari veri={veri} patika={patika} />
          {veri.kullanici && !veri.kullanici.demo && <CikisDugmesi />}
        </div>
      </header>

      {ikincil.length > 0 && (
        <nav className="ab-ikincil" aria-label="Bölümler">
          {ikincil.map((grup, i) => (
            <div key={grup.baslik ?? i} className="grup">
              {grup.baslik && <span className="etiket" aria-hidden>{grup.baslik}</span>}
              {grup.ogeler.map((o) => (
                <Link key={o.yol} href={o.yol}
                  aria-current={aktifMi(o.yol, patika) ? 'true' : undefined}>
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

/* ═══ Hesap bağları — Bildirim · Ayarlar · Yardım ═════════════════════
   Çıkış'ın yanında tek küme. Bildirim bağı sayacı taşır; rayda ikinci
   bir bildirim öğesi kalmadığı için yinelenme yok. Yalnız oturumla:
   üç rota da oturum kapılı. Hesap bağları da `aria-current="page"`
   taşır — belgede tek geçerli sayfa sözleşmesi buraya da uzanır
   (yardımcı rotalarda alan sekmesi yanmaz, bu bağ yanar). */
function HesapBaglari({ veri, patika }: { veri: KabukVerisi; patika: string }) {
  if (!veri.kullanici) return null;
  const n = veri.okunmamis;
  return (
    <nav aria-label="Hesap" className="hesap">
      <Link href="/bildirimler" className="ab-dugme"
        aria-current={aktifMi('/bildirimler', patika) ? 'page' : undefined}
        aria-label={n > 0 ? `Bildirimler — ${sayacEtiketi(n)}` : 'Bildirimler'}>
        Bildirim<Sayac n={n} />
      </Link>
      {UST_BAGLAR.map((o) => (
        <Link key={o.yol} href={o.yol} className="ab-dugme"
          aria-current={aktifMi(o.yol, patika) ? 'page' : undefined}>
          {o.ad}
        </Link>
      ))}
    </nav>
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
        Zorlu Enerji Yönetişim Platformu
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
