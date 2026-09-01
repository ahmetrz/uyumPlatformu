'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import CikisDugmesi from '@/components/CikisDugmesi';
import {
  A_RAY, B_SEKMELER, C_DIZIN, C_SEKMELER, aktifMi, yonSec, type Oge,
} from './yonler';

/* Abacus kabuğu — ÜÇ AYRI KABUK, tek gramerin renk varyantı değil.

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
      {yon === 'a' && <KabukA veri={veri} patika={patika}>{children}</KabukA>}
      {yon === 'b' && <KabukB veri={veri} patika={patika}>{children}</KabukB>}
      {yon === 'c' && <KabukC veri={veri} patika={patika}>{children}</KabukC>}
    </div>
  );
}

/* ═══ A · Industrial Precision ════════════════════════════════════════ */

function KabukA({ veri, patika, children }: {
  veri: KabukVerisi; patika: string; children: ReactNode;
}) {
  return (
    <div className="ab-a">
      <header className="ab-a-ust">
        <Link href="/" className="marka" aria-label="Enerji Operasyonları — ana ekran">VE</Link>
        <div className="grup">
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
        <div className="grup" style={{ borderRight: 0 }}>
          {veri.kullanici && (
            <>
              <span className="deg">{veri.kullanici.ad}</span>
              <span className="etiket">{veri.kullanici.unvan ?? ''}</span>
              {!veri.kullanici.demo && <CikisDugmesi />}
            </>
          )}
        </div>
      </header>

      <div className="ab-a-govde">
        <nav className="ab-a-ray" aria-label="Tezgâh ekranları">
          {A_RAY.map((o) => (
            <Link
              key={o.yol}
              href={o.yol}
              className={o.ayrik ? 'ayrik' : undefined}
              aria-current={aktifMi(o.yol, patika) ? 'page' : undefined}
              title={o.ad}
            >
              <span className="im" aria-hidden>{o.kod}</span>
              <span className="ad">{o.ad}</span>
            </Link>
          ))}
        </nav>
        <div className="ab-a-icerik">{children}</div>
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
        <Link href="/" className="marka">
          VOLTAJ<span className="ikinci">ATLAS</span>
        </Link>
        <nav aria-label="Saha">
          {B_SEKMELER.map((o) => (
            <Link key={o.yol} href={o.yol}
              aria-current={aktifMi(o.yol, patika) ? 'page' : undefined}>
              {o.ad}
            </Link>
          ))}
        </nav>
        <div className="sag">
          <span className="mono etiket">
            {veri.kesit ? `Veri kesiti ${damga(veri.kesit)}` : 'Veri kesiti yok'}
          </span>
          {veri.kullanici && (
            <>
              <span style={{ fontSize: 13 }}>{veri.kullanici.ad}</span>
              {!veri.kullanici.demo && <CikisDugmesi />}
            </>
          )}
        </div>
      </header>
      <div style={{ minWidth: 0 }}>{children}</div>
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
          <Link href="/" className="marka">Voltaj</Link>
          <span className="etiket">Yönetişim &amp; uyum defteri</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span className="mono etiket">
            {veri.kesit ? `Veri kesiti ${damga(veri.kesit)}` : 'Veri kesiti yok'}
          </span>
          {veri.kullanici && (
            <>
              <span style={{ fontSize: 13 }}>{veri.kullanici.ad}</span>
              {!veri.kullanici.demo && <CikisDugmesi />}
            </>
          )}
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
          Ekran kendi dizinini verebilir (uyum matrisi çerçeve, kontrol
          ailesi ve OKUMA ANAHTARINI oraya koyar — prototip `c-compliance`
          sol kolonu); vermezse `CDizin` varsayılanı çizilir. Bu yüzden
          `children` doğrudan ızgaraya konur. */}
      <main className="ab-c-govde">{children}</main>
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

function Ayak({ veri }: { veri: KabukVerisi }) {
  if (!veri.ayak) return <footer className="ab-a-ayak ab-baskida-gizle" />;
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
    </footer>
  );
}
