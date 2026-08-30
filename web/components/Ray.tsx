'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { IKONLAR, MarkaIsareti } from '@/components/sahneler';

const GRUPLAR: { baslik: string; linkler: { yol: string; ad: string; ikon: string }[] }[] = [
  {
    baslik: 'İzleme',
    linkler: [
      { yol: '/', ad: 'Genel bakış', ikon: 'genel-bakis' },
      { yol: '/tesisler', ad: 'Santral 360', ikon: 'santral' },
      { yol: '/surecler', ad: 'Uyum süreçleri', ikon: 'surecler' },
      { yol: '/bulgular', ad: 'Bulgular', ikon: 'bulgular' },
      { yol: '/riskler', ad: 'Riskler', ikon: 'riskler' },
      { yol: '/gorevler', ad: 'Görevler & onay', ikon: 'gorevler' },
    ],
  },
  {
    baslik: 'Yönetişim',
    linkler: [
      { yol: '/denetimler', ad: 'Denetimler', ikon: 'denetimler' },
      { yol: '/envanter', ad: 'IT/OT Envanteri', ikon: 'envanter' },
      { yol: '/operasyon', ad: 'Operasyon', ikon: 'tanimlar' },
      { yol: '/projeler', ad: 'Projeler', ikon: 'projeler' },
      { yol: '/raporlar', ad: 'Raporlar', ikon: 'raporlar' },
      { yol: '/aktivite', ad: 'Aktivite', ikon: 'aktivite' },
    ],
  },
  {
    baslik: 'Kütüphane',
    linkler: [
      { yol: '/regulasyonlar', ad: 'Regülasyonlar', ikon: 'regulasyonlar' },
      { yol: '/eslestirme', ad: 'Eşleştirme', ikon: 'eslestirme' },
      { yol: '/ice-aktarim', ad: 'İçe aktarım', ikon: 'ice-aktarim' },
    ],
  },
  {
    baslik: 'Yönetim',
    linkler: [
      { yol: '/tanimlar', ad: 'Tanımlar', ikon: 'tanimlar' },
      { yol: '/yetkiler', ad: 'Kullanıcı & yetki', ikon: 'yetkiler' },
      { yol: '/saglik', ad: 'Platform sağlığı', ikon: 'saglik' },
    ],
  },
];

export default function Ray() {
  const yol = usePathname();
  const [acik, setAcik] = useState(false);

  return (
    <>
      <nav className={`rail${acik ? ' acik' : ''}`} aria-label="Ana menü">
        <Link href="/" className="rail-marka" onClick={() => setAcik(false)}>
          <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
            <MarkaIsareti boy={26} />
          </span>
          <span>Şebeke Uyum</span>
        </Link>
        {GRUPLAR.map((g) => (
          <div key={g.baslik}>
            <div className="rail-grup">{g.baslik}</div>
            {g.linkler.map((l) => {
              const aktif = l.yol === '/' ? yol === '/' : yol.startsWith(l.yol);
              return (
                <Link key={l.yol} href={l.yol} onClick={() => setAcik(false)}
                  className={`rail-link${aktif ? ' aktif' : ''}`}>
                  <span aria-hidden style={{ width: 18, display: 'inline-flex' }}>
                    {IKONLAR[l.ikon]?.({ boy: 17 }) ?? l.ikon}
                  </span>
                  {l.ad}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <button className="rail-ac" style={{ position: 'fixed', left: 12, top: 12, zIndex: 50 }}
        onClick={() => setAcik(!acik)} aria-label="Menüyü aç/kapat">☰</button>
    </>
  );
}
