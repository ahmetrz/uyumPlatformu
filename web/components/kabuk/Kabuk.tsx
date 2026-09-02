'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import CikisDugmesi from '@/components/CikisDugmesi';
import AramaDugmesi from '@/components/AramaDugmesi';
import KomutPaleti from '@/components/KomutPaleti';
import YardimKatmani from '@/components/YardimKatmani';
import {
  ALANLAR, A_RAY, B_SEKMELER, C_DIZIN, C_SEKMELER, UST_BAGLAR,
  aktifMi, alanAktif, sayacEtiketi, sayacMetni, sekmeAktif, yonSec, type Oge,
} from './yonler';

/* Uygulama kabuğu — ÜÇ AYRI KABUK, tek gramerin renk varyantı değil.

   Görsel source of truth: `a-executive.html`, `b-executive.html`,
   `c-compliance.html` (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §1).
   Ölçüler prototiplerden hesaplandı: A 52px çubuk + 60px ray + 30px ayak,
   B 56px sekme çubuğu ve ray YOK, C künye + 2px kural + serif sekme +
   212px dizin sütunu.

   Kabuk hangi yönü çizeceğini ROTADAN türetir; ekranlar bir şey
   geçirmez. URL'ler, RBAC ve kapsam DEĞİŞMEZ — bu salt sunum katmanıdır.

   PROTOTİPTE OLMAYAN, BURADA EKLENEN (harita §7):
   · `aria-current="page"` tekil ve gerçek — prototipte yalnız renkti;
   · odak halkası (`:focus-visible`) — prototipte tanımsızdı;
   · dar bant davranışı — prototipler tek genişlikte tasarlanmıştı;
   · durum ayağının sayıları YETKİ kapısından geçer (bkz. `sayilar`). */

export type KabukKullanicisi = { ad: string; unvan: string | null; demo?: boolean } | null;

export type KabukVerisi = {
  kullanici: KabukKullanicisi;
  /** Kapsam çubuğu ve künye için: grup · tüzel kişi sayısı · santral sayısı. */
  kapsam: { grup: string; tuzelKisi: number; santral: number } | null;
  /** Durum ayağı — yalnız yetkili kullanıcıya doldurulur, yoksa `null`. */
  ayak: { toplam: number; sayimlar: Record<string, number>; sonKosu: string | null } | null;
  /** Veri kesiti damgası (ISO). Uydurulmaz; yoksa `null`. */
  kesit: string | null;
  /** Aktif kullanıcının okunmamış bildirim sayısı; oturum yoksa 0. */
  okunmamis: number;
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
  const yon = yonSec(patika);
  return (
    <div className="ab" data-yon={yon}>
      {/* İÇERİĞE ATLA — belgenin İLK odaklanabilir öğesi, üç kabukta da.
          Görünmez; klavye odağı gelince görünür (`.ab-atla`). Hedef,
          ekran gövdesini saran `#icerik` sarmalayıcısı (bir `<div>`: `<main>`
          her ekranın KENDİ kökündedir, kabuk ikinci bir main açmaz): kabuk başına
          on altı ray öğesi + beş alan + arama + hesap bağları var, klavye
          kullanıcısı her sayfada bunların hepsini geçmek zorunda değil. */}
      <a href="#icerik" className="ab-atla">İçeriğe atla</a>
      {yon === 'a' && <KabukA veri={veri} patika={patika}>{children}</KabukA>}
      {yon === 'b' && <KabukB veri={veri} patika={patika}>{children}</KabukB>}
      {yon === 'c' && <KabukC veri={veri} patika={patika}>{children}</KabukC>}
      {/* Komut paleti (Ctrl/⌘+K) ve kısayol katmanı (?) kabuğun İÇİNDE:
          token'lar `.ab[data-yon]` üzerinde yaşar, dışarıda monte edilince
          renksiz kalıyordu. Üç yerleşim de (flagship / operasyonel / tam)
          buradan alır. */}
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

/* ═══ Hesap bağları — Ayarlar · Yardım (· Bildirim) ═══════════════════
   Üç kabukta Çıkış'ın yanında aynı küme. Rayda yeri olmayan iki rota
   buradan ulaşılır; B ve C'de bildirim kutusuna giden başka bağ olmadığı
   için bildirim bağı DA burada durur ve sayacı taşır — A'da ray öğesi
   zaten taşıdığından yinelenmez. Düğme grameri (`ab-dugme`) ortaktır. */
function HesapBaglari({ veri, patika, bildirim }: {
  veri: KabukVerisi; patika: string; bildirim: boolean;
}) {
  const n = veri.okunmamis;
  return (
    <nav aria-label="Hesap" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {bildirim && veri.kullanici && (
        <Link href="/bildirimler" className="ab-dugme"
          aria-current={aktifMi('/bildirimler', patika) ? 'page' : undefined}
          aria-label={n > 0 ? `Bildirimler — ${sayacEtiketi(n)}` : 'Bildirimler'}>
          Bildirim<Sayac n={n} />
        </Link>
      )}
      {/* Hesap bağları yalnız oturumla: /ayarlar ve /yardim ikisi de oturum
          kapılı; oturumsuz ziyaretçiye (giriş ekranı dışı 404 vb.) bağ yok. */}
      {veri.kullanici && UST_BAGLAR.map((o) => (
        <Link key={o.yol} href={o.yol} className="ab-dugme"
          aria-current={aktifMi(o.yol, patika) ? 'page' : undefined}>
          {o.ad}
        </Link>
      ))}
    </nav>
  );
}

/* ═══ Ortak alan gezinmesi ════════════════════════════════════════════
   Üç kabukta da AYNI beş alan; gramer kabuğa göre değişir, küme değişmez.
   B kabuğunda bu sekme çubuğunun kendisidir ve `aria-current="page"`
   taşır. A ve C'de İKİNCİ bir gezinme katmanıdır (ray / defter sekmeleri
   asıl "sayfa"yı işaretler); aynı ekranda iki "geçerli sayfa" duyurulmasın
   diye burada `aria-current="location"` kullanılır — "bulunduğun alan". */
function Alanlar({ sinif, patika }: { sinif: string; patika: string }) {
  return (
    <nav className={sinif} aria-label="Alanlar">
      {ALANLAR.map((o) => (
        <Link key={o.yol} href={o.yol}
          aria-current={alanAktif(o, patika) ? 'location' : undefined}>
          {o.ad}
        </Link>
      ))}
    </nav>
  );
}

/* ═══ A · Industrial Precision ════════════════════════════════════════ */

function KabukA({ veri, patika, children }: {
  veri: KabukVerisi; patika: string; children: ReactNode;
}) {
  return (
    <div className="ab-a">
      <header className="ab-a-ust">
        <Link href="/" className="marka" aria-label="Zorlu Enerji Yönetişim Platformu — ana ekran">ZE</Link>
        <Alanlar sinif="ab-a-alanlar" patika={patika} />
        <div className="grup dar-gizle">
          <span className="etiket">Kapsam</span>
          <span className="deg">{veri.kapsam?.grup ?? 'Grup tanımsız'}</span>
          {veri.kapsam && (
            <span className="deg ikincil mono">
              {veri.kapsam.tuzelKisi} tüzel kişi · {veri.kapsam.santral} santral
            </span>
          )}
        </div>
        <div className="grup gizlenebilir">
          <span className="etiket">Veri kesiti</span>
          <span className="deg mono">{damga(veri.kesit)}</span>
        </div>
        <div className="grup esnek" />
        {/* `korunan`: bu iki blok hiçbir genişlikte daralmaz ya da düşmez —
            arama ve oturum eylemleri her zaman erişilebilir kalır. */}
        <div className="grup korunan">
          <AramaDugmesi />
        </div>
        <div className="grup korunan" style={{ borderRight: 0 }}>
          {veri.kullanici && (
            <>
              <span className="deg">{veri.kullanici.ad}</span>
              <span className="etiket">{veri.kullanici.unvan ?? ''}</span>
            </>
          )}
          <HesapBaglari veri={veri} patika={patika} bildirim={false} />
          {veri.kullanici && !veri.kullanici.demo && <CikisDugmesi />}
        </div>
      </header>

      <div className="ab-a-govde">
        <nav className="ab-a-ray" aria-label="Tezgâh ekranları">
          {A_RAY.map((o) => {
            /* Bildirim öğesi okunmamış sayısını taşır: rozet görsel,
               sayı bağın erişilebilir adında ("Bildirim — 3 okunmamış
               bildirim"). Sıfırda ne rozet ne ek ad. */
            const bildirim = o.yol === '/bildirimler';
            const n = bildirim ? veri.okunmamis : 0;
            return (
              <Link
                key={o.yol}
                href={o.yol}
                className={o.ayrik ? 'ayrik' : undefined}
                aria-current={aktifMi(o.yol, patika) ? 'page' : undefined}
                aria-label={n > 0 ? `${o.ad} — ${sayacEtiketi(n)}` : undefined}
                title={o.ad}
              >
                <span className="ab-glif" aria-hidden>{o.kod}</span>
                <span className="ad">{o.ad}</span>
                {bildirim && <Sayac n={n} />}
              </Link>
            );
          })}
        </nav>
        {/* Ekran gövdesini saran TEK ana bölge; atla bağının hedefi.
            `tabIndex={-1}`: bağ tıklanınca odak buraya iner, sonraki Tab
            içerikten devam eder (Safari/Firefox'ta `href="#…"` tek
            başına odağı taşımıyordu). */}
        <div id="icerik" tabIndex={-1} className="ab-a-icerik">{children}</div>
      </div>

      <Ayak veri={veri} />
    </div>
  );
}

/* ═══ B · Energy Intelligence ═════════════════════════════════════════ */

function KabukB({ veri, patika, children }: {
  veri: KabukVerisi; patika: string; children: ReactNode;
}) {
  return (
    <div className="ab-b">
      <header className="ab-b-ust">
        <Link href="/" className="marka" aria-label="Zorlu Enerji Yönetişim Platformu — ana ekran">
          ZORLU ENERJİ<span className="ikinci">Yönetişim Platformu</span>
        </Link>
        <nav aria-label="Saha">
          {B_SEKMELER.map((o) => (
            <Link key={o.yol} href={o.yol}
              aria-current={sekmeAktif(o.yol, patika) ? 'page' : undefined}>
              {o.ad}
            </Link>
          ))}
        </nav>
        <div className="sag">
          <span className="mono etiket">
            {veri.kesit ? `Veri kesiti ${damga(veri.kesit)}` : 'Veri kesiti yok'}
          </span>
          <AramaDugmesi />
          {veri.kullanici && <span style={{ fontSize: 13 }}>{veri.kullanici.ad}</span>}
          <HesapBaglari veri={veri} patika={patika} bildirim />
          {veri.kullanici && !veri.kullanici.demo && <CikisDugmesi />}
        </div>
      </header>
      {/* Atla bağının hedefi — bkz. KabukA'daki not. */}
      <div id="icerik" tabIndex={-1} style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

/* ═══ C · Operational Luxury ══════════════════════════════════════════ */

function KabukC({ veri, patika, children }: {
  veri: KabukVerisi; patika: string; children: ReactNode;
}) {
  /* Dizin sütunu aktif bölümü işaretler ama TÜM bölümleri gösterir:
     defterin içindekiler tablosu, ziyaret edilmemiş bölümü de listeler. */
  return (
    <div className="ab-c">
      <header className="ab-c-kunye">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <Link href="/" className="marka">Zorlu Enerji Yönetişim Platformu</Link>
          <span className="etiket">Uyum defteri</span>
        </div>
        {/* Künyenin bölüm dizisi: gazete başlığındaki "Ekonomi · Spor ·
            Kültür" satırı gibi, defterin dışındaki alanlara açılan kapı. */}
        <Alanlar sinif="ab-c-alanlar" patika={patika} />
        <div className="sag" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span className="mono etiket">
            {veri.kesit ? `Veri kesiti ${damga(veri.kesit)}` : 'Veri kesiti yok'}
          </span>
          <AramaDugmesi />
          {veri.kullanici && <span style={{ fontSize: 13 }}>{veri.kullanici.ad}</span>}
          <HesapBaglari veri={veri} patika={patika} bildirim />
          {veri.kullanici && !veri.kullanici.demo && <CikisDugmesi />}
        </div>
      </header>
      <div className="ab-c-kural-kalin" />
      <nav className="ab-c-nav" aria-label="Defter">
        {C_SEKMELER.map((o) => (
          <Link key={o.yol} href={o.yol}
            aria-current={aktifMi(o.yol, patika) ? 'page' : undefined}>
            {o.ad}
          </Link>
        ))}
        {veri.kapsam && (
          <span className="mono etiket sag">
            {veri.kapsam.grup} · {veri.kapsam.santral} santral
          </span>
        )}
      </nav>
      <div className="ab-c-kural" />
      {/* Defter gövdesi İKİ HÜCRELİ bir ızgaradır: dizin sütunu + içerik.
          Varsayılan dizin BURADA çizilir — on beş C ekranının her birine
          ayrı ayrı koymak, birinde unutulduğunda o ekranı 212px'lik
          sütuna sıkıştırıyordu (ölçüldü).

          Kendi dizinini veren ekran (uyum matrisi: çerçeve · kontrol
          ailesi · OKUMA ANAHTARI — prototip `c-compliance` sol kolonu)
          kökünde `data-dizin="ekran"` taşır; CSS o durumda varsayılan
          dizini gizler ve ızgarayı tek sütuna indirir. `:has()`
          desteklenmeyen bir tarayıcıda iki dizin de görünür — bozulma
          değil, fazlalık.

          Atla bağının hedefi (`#icerik`) bu sarmalayıcıdır; `<main>` değil,
          `<div>`: ekranlar kendi `<main>`'ini çizer, kabuk ikincisini açarsa
          belgede iki ana bölge olur (axe: landmark-no-duplicate-main). */}
      <div id="icerik" tabIndex={-1} className="ab-c-govde">
        <CDizin />
        {children}
      </div>
    </div>
  );
}

/** Defterin VARSAYILAN dizini — kendi dizinini vermeyen C ekranları için. */
export function CDizin() {
  const patika = usePathname() ?? '/';
  return (
    <aside className="ab-c-dizin" aria-label="Defter dizini">
      {C_DIZIN.map((b) => (
        <div key={b.baslik} className="bolum">
          <span className="etiket">{b.baslik}</span>
          {b.ogeler.map((o) => <DizinSatiri key={o.yol} oge={o} patika={patika} />)}
        </div>
      ))}
    </aside>
  );
}

function DizinSatiri({ oge, patika }: { oge: Oge; patika: string }) {
  const aktif = aktifMi(oge.yol, patika);
  return (
    <Link href={oge.yol} className="satir" aria-current={aktif ? 'true' : undefined}>
      <span>{oge.ad}</span>
    </Link>
  );
}

/* ═══ Durum ayağı — bağlayıcı dürüstlüğü ══════════════════════════════
   Yalnız A kabuğunda çizilir (prototipte 30px ayak orada vardı).
   `veri.ayak` null ise HİÇ çizilmez: yetkisiz kullanıcı için sunucu onu
   zaten doldurmaz. Bağlanmamış kaynak "canlı" gösterilmez. */

const AYAK_KALEMLERI: { anahtar: string; etiket: string; sinif: string }[] = [
  { anahtar: 'etkin', etiket: 'bağlı', sinif: 'g-uygun' },
  { anahtar: 'kimlik_bekleniyor', etiket: 'kimlik bekliyor', sinif: 'g-kismi' },
  { anahtar: 'taslak', etiket: 'yapılandırılmamış', sinif: 'g-yok' },
  { anahtar: 'duraklatildi', etiket: 'duraklatıldı', sinif: 'g-disi' },
  { anahtar: 'hatali', etiket: 'hatalı', sinif: 'g-uygunsuz' },
];

/* Ayağın sağ ucu: tasarım sistemi referansı (`/sistem`). Rayda yeri yok —
   günlük tezgâh ekranı değil — ama gezinmeden ulaşılamayan rota da
   olamaz; ayak, referans bağlantısının doğal yeridir. */
function SistemBagi() {
  return <Link href="/sistem" className="sistem">Tasarım sistemi</Link>;
}

function Ayak({ veri }: { veri: KabukVerisi }) {
  if (!veri.ayak) {
    return (
      <footer className="ab-a-ayak ab-baskida-gizle">
        <span className="sag" /><SistemBagi />
      </footer>
    );
  }
  const a = veri.ayak;
  return (
    <footer className="ab-a-ayak ab-baskida-gizle" aria-label="Bağlayıcı durumu">
      <span>bağlayıcı {a.toplam}</span>
      {AYAK_KALEMLERI.filter((k) => (a.sayimlar[k.anahtar] ?? 0) > 0).map((k) => (
        <span key={k.anahtar} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className={`ab-glif ${k.sinif}`} aria-hidden />
          {k.etiket} {a.sayimlar[k.anahtar]}
        </span>
      ))}
      {a.toplam === 0 && <span>hiç bağlayıcı tanımlı değil</span>}
      <span className="sag">son başarılı koşu {damga(a.sonKosu)}</span>
      <SistemBagi />
    </footer>
  );
}
