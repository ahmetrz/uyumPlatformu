'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { cikisYap } from '@/lib/girisEylemleri';
import { UST_BAGLAR, aktifMi } from '@/components/kabuk/yonler';
import type { KabukKullanicisi } from '@/components/kabuk/Kabuk';

/* ═══ Hesap menüsü — Ayarlar · Yardım · Yönetim tezgâhı · Çıkış ══════
   Üst çubuğun sağında tek düğme: kullanıcının adı (+ unvanı) ve bir ▾.
   Açılınca WAI-ARIA "menu button" kalıbı: `aria-haspopup="menu"`,
   `aria-expanded`, liste `role="menu"`, öğeler `role="menuitem"`; ↑↓
   dolaşır, Home/End uçlara, Esc kapatır ve odağı düğmeye döndürür, dış
   tıklama kapatır. Menü rota bağlarından oluştuğu için öğeler `<a>`dır
   (Enter tarayıcının kendi gezinmesi); Çıkış bir eylemdir, `<button>`.

   `aria-current="page"`: /ayarlar ya da /yardim'da alan sekmesi yanmaz
   (yardımcı rota); "tek geçerli sayfa" sözleşmesi DÜĞMEDE yanar
   (`data-icinde`) — menü kapalıyken öğe belgede yoktur, rota-duman
   sayımı düğmeyi görür. Sözleşme: `arac/rota-duman.mjs` §aktifler.

   Yönetim tezgâhı bağı yalnız `kullanici.yonetim` ise çizilir; yüklem
   sayfanın kendi kapısıyla aynıdır (kabukVerisi). Demo kullanıcısında
   çıkış yoktur (oturum yerine bayrak). */
export default function HesapMenusu({ kullanici, patika }: {
  kullanici: NonNullable<KabukKullanicisi>; patika: string;
}) {
  const [acik, setAcik] = useState(false);
  const [bekliyor, baslat] = useTransition();
  const kok = useRef<HTMLDivElement>(null);
  const dugme = useRef<HTMLButtonElement>(null);
  const liste = useRef<HTMLDivElement>(null);
  const id = useId();

  /* UY-52 · API sözleşmesi tezgâhın YANINDA durur: ikisi de yönetim
     yetkisine bağlı ve ikisi de "dışarıdan kim girebiliyor" sorusunun
     parçası. Sözleşmeyi bir alan rayına koymak, entegrasyonu yazan
     kişinin bakacağı yeri uyum ya da varlık ekranlarının arasına
     gömerdi. */
  const yollar = [
    ...UST_BAGLAR,
    ...(kullanici.yonetim
      ? [
        { ad: 'Yönetim tezgâhı', yol: '/yonetim-tezgahi' },
        { ad: 'API sözleşmesi', yol: '/api-sozlesmesi' },
      ]
      : []),
  ];
  const icinde = yollar.some((o) => aktifMi(o.yol, patika));

  /* Rota değişimi kapatır — efekt içinde setState yerine "önceki patika"
     kalıbı: render sırasında karşılaştırılır, ek çevrim yaratmaz. */
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

  /* Açılışta ilk öğeye odak. */
  useEffect(() => {
    if (acik) liste.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
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

  return (
    <div className="ab-hesap" ref={kok} onKeyDown={tusla}>
      <button type="button" ref={dugme} className="ab-hesap-dugme"
        aria-haspopup="menu" aria-expanded={acik} aria-controls={id}
        aria-current={icinde ? 'page' : undefined}
        aria-label={`Hesap menüsü — ${kullanici.ad}`}
        onClick={() => setAcik((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !acik) { e.preventDefault(); setAcik(true); } }}>
        <span className="kisi">
          <span className="ad">{kullanici.ad}</span>
          {kullanici.unvan && <span className="etiket dar-gizle">{kullanici.unvan}</span>}
        </span>
        <span className="ok" aria-hidden>{acik ? '▴' : '▾'}</span>
      </button>
      {acik && (
        <div id={id} ref={liste} role="menu" className="ab-hesap-menu" aria-label="Hesap">
          {yollar.map((o) => (
            <Link key={o.yol} href={o.yol} role="menuitem"
              className={aktifMi(o.yol, patika) ? 'aktif' : undefined}>
              {o.ad}
            </Link>
          ))}
          {!kullanici.demo && (
            <button type="button" role="menuitem" className="cikis" disabled={bekliyor}
              onClick={() => baslat(async () => { await cikisYap(); })}>
              Çıkış
            </button>
          )}
        </div>
      )}
    </div>
  );
}
