'use client';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Durum } from './temel';

/* ═══════════════════════════════════════════════════════════════════════
   ZAMAN ŞERİDİ

   Orijinal prototiplerde ayrı bir "zaman çizelgesi" bileşeni YOK; en
   yakın gramer `b-executive`in düzenleyici takvimi ile uygunsuzluk akışı
   bandıdır: 1px eksen, aksan renginde "bugün" tırnağı, dönem etiketleri
   eksenin ÜSTÜNDE, kartlar ALTINDA ayrı şeritte.

   YERLEŞİM MATEMATİĞİ Atlas'tan aynen devralındı ve bu bilinçlidir: kart
   ayırma, ölçülen eksen genişliği ve "sığmayan kart çizilmez" kuralı bir
   TASARIM tercihi değil, üç ekranda ölçülmüş bir çakışma düzeltmesidir.
   Değişen malzeme: sınıflar `.ab-zaman*`, kart 208px yerine aynı ölçüde
   ama kabuk tipografisiyle. */

/** Kart gövdesinin piksel genişliği — CSS'teki `.zaman-kart { width }`
    ile aynı sayı. Ayırma matematiği buna dayandığı için TEK yerde durur. */
export const KART_PX = 208;

/** Kartlar arasında bırakılan en küçük boşluk (px). */
const KART_BOSLUK = 16;

/**
 * Tek şeritteki kart konumlarını PİKSEL üzerinden çakışmayacak biçimde
 * ayırır. Ölçü gerçek eksen genişliğinden gelir; oranla tahmin edilmez.
 *
 * Neden ölçüm: üç ekran (denetim, proje, ömür) bu matematiği ayrı ayrı
 * taşıyordu ve üçü de farklı sabitlerle "kaç kart sığar"ı TAHMİN ediyordu.
 * Çekmece açılınca eksen ~1100px'den ~680px'e iniyor ve tahmin tutmuyor,
 * kartlar üst üste biniyordu. Ölçülen genişlikle tahmine gerek kalmıyor.
 *
 * İki geçiş de gerekli: ileri geçiş asgari aralığı açar, geri geçiş sağ
 * kenara yığılmayı engeller. Geri geçiş olmadan ufkun sonuna düşen kartlar
 * sağ sınıra kırpılırken komşularının üstüne biner — kırpma taşan kartı
 * geri çeker ama komşusunu bilmez.
 *
 * Bu bir YERLEŞİM düzeltmesidir, veri düzeltmesi değil: sıra korunur ve
 * kartın kendi tarih etiketi gerçek tarihi söylemeye devam eder.
 * `OmurUfku` iki şeritli olduğu için kendi ayırmasını sürdürür.
 */
export function konumlariAyirPx(konumlar: number[], genislik: number): number[] {
  const adim = KART_PX + KART_BOSLUK;
  const ust = Math.max(0, genislik - KART_PX);
  const px = konumlar.map((k) => Math.max(0, Math.min(1, k)) * genislik);
  for (let i = 1; i < px.length; i += 1) {
    px[i] = Math.max(px[i], px[i - 1] + adim);
  }
  for (let i = px.length - 1; i >= 0; i -= 1) {
    const tavan = ust - (px.length - 1 - i) * adim;
    if (px[i] > tavan) px[i] = tavan;
  }
  return px.map((x) => Math.max(0, x));
}

/** Ölçülen eksene kaç kart SIĞAR. Ekran bütçesini buradan okur; sığmayan
    kart çizilmez, çünkü sığmayan kart komşusunun üstüne biner. */
export function kacKartSigar(genislik: number): number {
  if (genislik <= 0) return 1;
  return Math.max(1, Math.floor((genislik + KART_BOSLUK) / (KART_PX + KART_BOSLUK)));
}

export type ZamanKarti = {
  id: string;
  ad: string;
  /** sağa yaslı geri sayım */
  geri: string;
  kapsam: string;
  durum: Durum;
  /** 0–1 arası eksen üzerindeki oran */
  konum: number;
};

export function ZamanCizelgesi({
  donemler, kartlar, bugun, tikla,
}: {
  donemler: { ad: string; konum: number }[];
  kartlar: ZamanKarti[];
  /** 0–1; verilmezse tırnak çizilmez */
  bugun?: number;
  tikla?: (id: string) => void;
}) {
  /* Eksen genişliği ÖLÇÜLÜR: çekmece açılıp kapandıkça değişiyor ve
     çağıranın bunu tahmin etmesi gerekmiyor. Ölçüm gelene kadar kartlar
     ham konumlarında durur; ResizeObserver ilk boyamadan hemen sonra
     çalıştığı için gözle görülür bir sıçrama olmaz. */
  const kokRef = useRef<HTMLDivElement | null>(null);
  const [genislik, setGenislik] = useState(0);
  useEffect(() => {
    const el = kokRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([g]) => setGenislik(g.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Sığmayan kart ÇİZİLMEZ: sığdırmaya zorlamak onu komşusunun üstüne
     bindirir ve iki kart da okunamaz hâle gelir. */
  const sigan = genislik > 0 ? kartlar.slice(0, kacKartSigar(genislik)) : kartlar;
  const ayrikPx = genislik > 0 ? konumlariAyirPx(sigan.map((k) => k.konum), genislik) : null;
  return (
    <div className="ab-zaman" ref={kokRef}>
      {donemler.map((d) => (
        <span key={d.ad} className="mono donem" style={{ left: `${d.konum * 100}%` }}>{d.ad}</span>
      ))}
      <span className="eksen" />
      {bugun != null && <span className="bugun" style={{ left: `${bugun * 100}%` }} />}
      {sigan.map((k, i) => (
        <button
          key={k.id}
          type="button"
          className={`ab-zaman-kart d-${k.durum}`}
          style={{ left: ayrikPx
            ? `${ayrikPx[i]}px`
            : `min(${k.konum * 100}%, calc(100% - ${KART_PX}px))` } as CSSProperties}
          onClick={() => tikla?.(k.id)}
        >
          <span className="mono geri">{k.geri}</span>
          <span className="ad">{k.ad}</span>
          <span className="mono kapsam">{k.kapsam}</span>
        </button>
      ))}
    </div>
  );
}

/* EOL ufku: kartlar eksenin altında/üstünde dönüşümlü, 3px SOL kenar,
   geçmiş kartlar kritik renkte, gelecek kartlar %80 opaklıkta. */

export function OmurUfku({
  kartlar, donemler = [], bantlar = [], tikla,
}: {
  kartlar: (Omit<ZamanKarti, 'durum'> & { gecmis: boolean })[];
  /* Eksen tırnakları primitifin İÇİNDE yaşar: ekran kendi etiket katmanını
     eksenin piksel konumuna göre bindirirse yerleşim değişince kayar. */
  donemler?: { ad: string; konum: number }[];
  /* ACİLİYET BANTLARI (ŞİMDİ / <90g / <1y / >1y). Şerit aciliyeti bugüne
     kadar yalnız KONUMLA anlatıyordu: kart ne kadar solda o kadar yakın —
     ama "sol" ne kadar yakın? Okuyucu her kartta eksen tırnaklarına bakıp
     "bu 90 günün içinde mi?" diye zihinden hesap yapıyordu; EOS kararının
     eşiği tam olarak budur. Bant bir DEĞER değil ÖLÇEKTİR: arka planda ve
     düşük kontrastta durur, kartların okunmasını bozmaz. */
  bantlar?: { ad: string; bas: number; son: number; sinif: string }[];
  tikla?: (id: string) => void;
}) {
  return (
    <div className="ab-omur">
      {bantlar.map((b) => (
        <span
          key={b.sinif}
          className={`ab-omur-bant ${b.sinif}`}
          style={{ left: `${b.bas * 100}%`, width: `${(b.son - b.bas) * 100}%` }}
          aria-hidden
        >
          <span className="ad">{b.ad}</span>
        </span>
      ))}
      <span className="eksen" />
      {kartlar.map((k, i) => (
        <button
          key={k.id}
          type="button"
          className={`ab-omur-kart ${k.gecmis ? 'gecmis' : 'gelecek'}`}
          style={{ left: `min(${k.konum * 100}%, calc(100% - 196px))`,
            top: i % 2 === 0 ? 0 : 108 }}
          onClick={() => tikla?.(k.id)}
        >
          <span className="mono geri">{k.geri}</span>
          <span className="ad">{k.ad}</span>
          <span className="mono kapsam">{k.kapsam}</span>
        </button>
      ))}
      {/* Dönem tırnakları eksenin ÜSTÜNDE ayrı şerittedir; kartlarla asla
          aynı laneyi paylaşmaz (02-components §14). */}
      {donemler.map((d) => (
        <span key={d.ad} className="mono donem"
          style={{ left: `min(${d.konum * 100}%, calc(100% - 56px))` }}>
          {d.ad}
        </span>
      ))}
      {donemler.length > 0 && (
        <span className="bugun" aria-hidden />
      )}
    </div>
  );
}
