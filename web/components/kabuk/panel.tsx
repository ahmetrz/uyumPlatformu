'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { Im, DURUM_SOZU, type Durum } from './temel';

/* ═══════════════════════════════════════════════════════════════════════
   DETAY PANELİ

   Orijinal prototiplerde ÇEKMECE YOKTUR. Detay üç yerden birinde durur:
     A · a-assets   → 400px sağa DOKLU panel, sayfanın parçası;
     B · b-plant360 → 420px hero paneli, aynı ekranın içinde;
     C · c-compliance → satırın ALTINDA açılan blok.
   Ortak nokta: okuyucu kütüğü/tuvali GÖRMEYE DEVAM EDER. 420px'lik
   kayan bir çekmece bunun tam tersini yapıyordu.

   Bu bileşen A/B yönünün doklu panelidir. Sayfa ızgarasını her ekranda
   yeniden kurmak yerine sağ kenara SABİTLENİR ve arkasındaki içeriğe
   ince bir perde çekilir; modal DEĞİLDİR: odak hapsedilmez, arkadaki
   içerik okunur kalır, Esc ve ✕ kapatır ve kapanış hiçbir şeyi commit
   etmez. C ekranlarında bunun yerine `GenisleyenSatir` kullanılır.

   Ad `Cekmece` olarak korundu: elli küsur ekran bu adı çağırıyor ve ad
   bir VERİ SÖZLEŞMESİDİR; değişen şey sunumdur. */

/* `etiket`/`ad` verilmezse bugünkü "Seçili kayıt · <kod>" başlığı çıkar;
   elli küsur çağrı yeri değişmez. Kayıt DIŞI bir detay (örneğin bir liste)
   açıldığında başlık ona göre yazılır — panel "seçili kayıt" demez. */
export function Cekmece({ kod, kapat, children, etiket, ad }: {
  kod: string; kapat: () => void; children: ReactNode;
  etiket?: string; ad?: string;
}) {
  const kokRef = useRef<HTMLElement | null>(null);
  const oncekiOdak = useRef<Element | null>(null);

  useEffect(() => {
    oncekiOdak.current = document.activeElement;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') kapat(); };
    document.addEventListener('keydown', esc);
    kokRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', esc);
      (oncekiOdak.current as HTMLElement | null)?.focus?.();
    };
  }, [kapat]);

  return (
    <aside className="ab-panel" ref={kokRef} tabIndex={-1}
      aria-label={ad ? `${ad} · ${kod}` : `Kayıt detayı ${kod}`}>
      <header>
        <span className="etiket vurgu">{etiket ?? 'Seçili kayıt'}</span>
        <span className="mono kod">{kod}</span>
        <button type="button" className="ab-dugme sag" onClick={kapat}>Kapat</button>
      </header>
      <div className="govde">{children}</div>
    </aside>
  );
}

/** Kimlik bloğu — durumun SÖZCÜKLE yazıldığı tek yer. */
export function CekmeceKimlik({ durum, soz, baslik, cumle }: {
  durum: Durum; soz?: string; baslik: ReactNode; cumle?: string;
}) {
  return (
    <div className="ab-panel-kimlik">
      <span className="ust">
        <Im durum={durum} />
        <span className={`mono soz d-${durum}`}>{soz ?? DURUM_SOZU[durum]}</span>
      </span>
      <h2>{baslik}</h2>
      {cumle && <p className="cumle">{cumle}</p>}
    </div>
  );
}

/** Etiket/değer çiftleri — 4–6 alan. */
export function CekmeceAlanlar({ alanlar }: {
  alanlar: { etiket: string; deger: ReactNode; durum?: Durum }[];
}) {
  return (
    <dl className="ab-panel-ciftler">
      {alanlar.map((a) => (
        <div key={a.etiket}>
          <dt>{a.etiket}</dt>
          <dd className={a.durum ? `d-${a.durum}` : undefined}>{a.deger}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Yönetişim zinciri — tür üstte, kod ortada, ayrıntı altta. */
export function CekmeceBagli({ baslik = 'Zincir', kayitlar }: {
  baslik?: string;
  kayitlar: { id: string; kod: string; alt: string; yol: string; suren?: boolean }[];
}) {
  return (
    <>
      <p className="etiket ab-panel-blokbas">{baslik}</p>
      <div className="ab-panel-zincir">
        {kayitlar.map((k) => {
          const [tur, ...kalan] = k.alt.split(' · ');
          return (
            <Link key={k.id} href={k.yol}>
              <span className="ust">
                <span className="tur">{tur}</span>
                {k.suren && <span className="ab-glif g-kismi" aria-hidden />}
              </span>
              <span className="mono kod">{k.kod}</span>
              {kalan.length > 0 && <span className="alt">{kalan.join(' · ')}</span>}
            </Link>
          );
        })}
      </div>
    </>
  );
}

/** Eylemler + denetim izini bildiren dip not. */
export function CekmeceEylemler({ birincil, ikincil, dipNot }: {
  birincil?: ReactNode; ikincil?: ReactNode; dipNot?: string;
}) {
  return (
    <div className="ab-panel-eylem">
      {birincil}
      {ikincil && <div className="ikincil">{ikincil}</div>}
      {dipNot && <p className="mono dip">{dipNot}</p>}
    </div>
  );
}
