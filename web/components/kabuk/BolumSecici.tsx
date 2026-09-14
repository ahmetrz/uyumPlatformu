'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { aktifBolum, ogeAktif, type Grup } from '@/components/kabuk/yonler';

/* ═══ Bölüm seçici — DAR BANTTA katlanan ikincil sıra ═════════════════
   Yalnız dokunmatik bantta (≤700px) görünür; geniş ekranda ikincil sıra
   bugünkü gibi SARAR ve bu düğme çizilmez (`app/kabuk.css`, `.ab-bolum`).
   Katlama eşiğinin ölçümü `yonler.ts → DAR_BANT_BAG_TAVANI` başlığında.

   ETKİLEŞİM GRAMERİ HESAP MENÜSÜNÜN AYNISIDIR (`HesapMenusu.tsx`):
   WAI-ARIA "menu button" — `aria-haspopup="menu"`, `aria-expanded`,
   liste `role="menu"`, öğeler `role="menuitem"`; ↑↓ dolaşır, Home/End
   uçlara, Esc kapatır ve odağı düğmeye döndürür, dış tıklama kapatır,
   rota değişimi kapatır. Ürünün ikinci bir açılır kalıbı YOKTUR: aynı
   jest iki yerde aynı şeyi yapar.

   AKTİF ÖĞE SÖZLEŞMESİ DEĞİŞMEZ: belgedeki tek `aria-current="page"`
   alan sekmesindedir; bölüm bağları ikincil sıradaki gibi
   `aria-current="true"` taşır ("bulunduğun bölüm"). Düğme hiçbirini
   taşımaz — bir gezinme HEDEFİ değil, listeyi açan kontroldür.

   GRUP ADI GÖRÜNÜR: düğmede aktif grubun adı küçük puntoyla, panelde
   grup başlıkları olarak. Ölçüldü (mobil audit): sıra kayarken grup
   adları yalnız `aria-label` ile ekran okuyucuya ulaşıyordu, gören
   kullanıcı üç çıplak sekme görüyordu. */
export default function BolumSecici({ gruplar, patika, alanAd }: {
  gruplar: Grup[]; patika: string; alanAd: string;
}) {
  const [acik, setAcik] = useState(false);
  const kok = useRef<HTMLDivElement>(null);
  const dugme = useRef<HTMLButtonElement>(null);
  const liste = useRef<HTMLDivElement>(null);
  const id = useId();
  const simdi = aktifBolum(gruplar, patika);

  /* Rota değişimi kapatır — efekt içinde setState yerine "önceki patika"
     kalıbı (hesap menüsüyle aynı): render sırasında karşılaştırılır. */
  const [sonPatika, setSonPatika] = useState(patika);
  if (sonPatika !== patika) { setSonPatika(patika); if (acik) setAcik(false); }

  /* Dış tıklama kapatır. */
  useEffect(() => {
    if (!acik) return;
    const dis = (e: MouseEvent) => {
      if (kok.current && !kok.current.contains(e.target as Node)) setAcik(false);
    };
    document.addEventListener('mousedown', dis);
    return () => document.removeEventListener('mousedown', dis);
  }, [acik]);

  /* Açılışta AKTİF öğeye odak — yoksa ilk öğeye. Kullanıcı listeyi
     "neredeyim" sorusuyla açar; odak cevabın üstünde başlar. */
  useEffect(() => {
    if (!acik) return;
    const l = liste.current;
    if (!l) return;
    (l.querySelector<HTMLElement>('[role="menuitem"][aria-current="true"]')
      ?? l.querySelector<HTMLElement>('[role="menuitem"]'))?.focus();
  }, [acik]);

  function tusla(e: React.KeyboardEvent<HTMLDivElement>) {
    const ogeler = [...(liste.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = ogeler.indexOf(document.activeElement as HTMLElement);
    const git = (n: number) => { e.preventDefault(); ogeler[(n + ogeler.length) % ogeler.length]?.focus(); };
    if (e.key === 'Escape') { e.preventDefault(); setAcik(false); dugme.current?.focus(); }
    else if (e.key === 'ArrowDown') git(i + 1);
    else if (e.key === 'ArrowUp') git(i - 1);
    else if (e.key === 'Home') git(0);
    else if (e.key === 'End') git(ogeler.length - 1);
    else if (e.key === 'Tab') setAcik(false);
  }

  const bagSayisi = gruplar.reduce((n, g) => n + g.ogeler.length, 0);
  return (
    <div className="ab-bolum" ref={kok} onKeyDown={tusla}>
      <button type="button" ref={dugme} className="ab-bolum-dugme"
        aria-haspopup="menu" aria-expanded={acik} aria-controls={id}
        aria-label={`Bölüm seç — ${alanAd} alanının ${bagSayisi} bölümü`}
        onClick={() => setAcik((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !acik) { e.preventDefault(); setAcik(true); } }}>
        <span className="konum">
          {/* Grup adı DARALAN taraftır: bölüm adı kırpılmaz — kullanıcının
              aradığı cevap odur; grup bağlamdır ve üç noktaya iner. */}
          <span className="grup-ad">{simdi ? simdi.grup.ad : alanAd}</span>
          <span className="oge-ad">{simdi ? simdi.oge.ad : 'Bölüm seç'}</span>
        </span>
        <span className="ok" aria-hidden>{acik ? '▴' : '▾'}</span>
      </button>
      {acik && (
        <div id={id} ref={liste} role="menu" className="ab-bolum-menu" aria-label="Bölümler">
          {gruplar.map((g) => (
            <div key={g.ad} className="oebek" role="group" aria-label={g.ad}>
              {/* Grup başlığı GÖRÜNÜR: `aria-label` gören kullanıcıya
                  ulaşmıyordu ve on dokuz bağ tek yığın olarak okunuyordu. */}
              <p className="mono etiket baslik">{g.ad}</p>
              {g.ogeler.map((o) => (
                <Link key={o.yol} href={o.yol} role="menuitem"
                  aria-current={ogeAktif(o, patika) ? 'true' : undefined}>
                  {o.ad}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
