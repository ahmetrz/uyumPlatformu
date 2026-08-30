'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const GRUPLAR: { baslik: string; linkler: { yol: string; ad: string; ikon: string }[] }[] = [
  {
    baslik: 'İzleme',
    linkler: [
      { yol: '/', ad: 'Genel bakış', ikon: '◪' },
      { yol: '/tesisler', ad: 'Santral 360', ikon: '⚡' },
      { yol: '/surecler', ad: 'Uyum süreçleri', ikon: '◉' },
      { yol: '/bulgular', ad: 'Bulgular', ikon: '▲' },
      { yol: '/riskler', ad: 'Riskler', ikon: '◬' },
      { yol: '/gorevler', ad: 'Görevler & onay', ikon: '☑' },
    ],
  },
  {
    baslik: 'Yönetişim',
    linkler: [
      { yol: '/denetimler', ad: 'Denetimler', ikon: '🗹' },
      { yol: '/envanter', ad: 'IT/OT Envanteri', ikon: '▣' },
      { yol: '/projeler', ad: 'Projeler', ikon: '▸' },
      { yol: '/raporlar', ad: 'Raporlar', ikon: '≡' },
      { yol: '/aktivite', ad: 'Aktivite', ikon: '↻' },
    ],
  },
  {
    baslik: 'Kütüphane',
    linkler: [
      { yol: '/regulasyonlar', ad: 'Regülasyonlar', ikon: '§' },
      { yol: '/eslestirme', ad: 'Eşleştirme', ikon: '⇄' },
      { yol: '/ice-aktarim', ad: 'İçe aktarım', ikon: '⤓' },
    ],
  },
  {
    baslik: 'Yönetim',
    linkler: [
      { yol: '/tanimlar', ad: 'Tanımlar', ikon: '⚙' },
      { yol: '/yetkiler', ad: 'Kullanıcı & yetki', ikon: '⛨' },
      { yol: '/saglik', ad: 'Platform sağlığı', ikon: '♥' },
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
          <span className="isaret">ŞU</span>
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
                  <span aria-hidden style={{ width: 16, textAlign: 'center' }}>{l.ikon}</span>
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
