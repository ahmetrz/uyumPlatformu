'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CikisDugmesi from '@/components/CikisDugmesi';

/* NavRail — 02-components §1.
   Düz liste, operasyonel katmanda grup başlığı YOK. Aynı anda tek aktif öğe.
   Sayaç yalnız bir kararı değiştiren yerde; gecikmiş varsa state/critical. */

export type RayOgesi = {
  ad: string;
  yol: string;
  sayi?: number | null;
  kritik?: boolean;
  /* Bu öğeden ÖNCE ince bir ayraç çizilir. Grup BAŞLIĞI değildir —
     operasyonel katmanda başlık yasak (02-components §1). Ayraç yalnız
     "buradan sonrası günlük tezgâh değil, yönetim ve kayıt" der; okuyucu
     bunu sözcük olmadan görür. */
  ayrac?: boolean;
};

/* Flagship katmanı — kısa liste + ayak (efsane veya fotoğraf şeridi) */
export const RAY_FLAGSHIP: RayOgesi[] = [
  { ad: 'Bugün', yol: '/' },
  // Tasarımın rayında "Enerji portföyü" ve "Santraller" ayrı öğeler; bu
  // uygulamada ikisi de aynı ekranı (F2) açtığı için tek öğede birleştirildi.
  // Kayıtlı sapma: iki aktif öğe göstermemek için (02-components §1).
  { ad: 'Enerji portföyü', yol: '/portfoy' },
  { ad: 'Uyum', yol: '/uyum' },
  { ad: 'Risk', yol: '/riskler' },
  { ad: 'Denetim', yol: '/denetimler' },
  { ad: 'Yönetim', yol: '/yonetim-tezgahi' },
];

/* Operasyonel katman — tezgâh ekranları.

   Faz 6'da yirmi dört ekran oldu ve hepsini tek düz listeye dökmek rayı
   okunmaz yapıyordu. Liste iki bloğa ayrıldı: üstte GÜNLÜK TEZGÂH (bir
   uyum ekibinin her gün açtığı ekranlar), altta YÖNETİM VE KAYIT
   (kurulum, kütük, denetim izi — haftada bir açılır). Ayrımı ince bir
   ayraç taşır; grup BAŞLIĞI yoktur, çünkü operasyonel katmanda başlık
   yasaktır (02-components §1). Sıra iş akışını izler: uyum → risk →
   denetim → bulgu → proje, sonra varlık zinciri, sonra operasyon. */
export const RAY_OPERASYONEL: RayOgesi[] = [
  // ── günlük tezgâh ──
  { ad: 'Uyum', yol: '/uyum' },
  { ad: 'Uyum süreçleri', yol: '/surecler' },
  { ad: 'Risk', yol: '/riskler' },
  { ad: 'Denetim', yol: '/denetimler' },
  { ad: 'Bulgu & CAPA', yol: '/bulgular' },
  { ad: 'Projeler', yol: '/projeler' },
  { ad: 'Varlıklar', yol: '/envanter' },
  { ad: 'Keşif', yol: '/kesif' },
  { ad: 'Topoloji', yol: '/topoloji' },
  { ad: 'Ömür', yol: '/omur' },
  { ad: 'Yedek & DR', yol: '/yedekleme' },
  { ad: 'Erişim', yol: '/kimlik' },
  { ad: 'Tedarikçiler', yol: '/tedarikciler' },
  { ad: 'Olaylar', yol: '/olaylar' },
  { ad: 'Değişiklikler', yol: '/operasyon' },
  // ── yönetim ve kayıt ──
  /* İki aktarım hattı AYRI ekranlardır ve adları bunu söylemek zorunda:
     /varlik-aktarim CMDB varlıklarını taşır (envanter yetkisi),
     /ice-aktarim regülasyon MADDELERİNİ taşır (tanımlar yetkisi).
     Eskiden ikincisi rayda hiç yoktu ve birincisi "İçe aktarım" adıyla
     duruyordu — hangi hattın hangisi olduğu ancak açınca anlaşılıyordu. */
  { ad: 'Yönetim tezgâhı', yol: '/yonetim-tezgahi', ayrac: true },
  { ad: 'Regülasyonlar', yol: '/regulasyonlar' },
  { ad: 'Eşleştirme', yol: '/eslestirme' },
  { ad: 'Varlık aktarımı', yol: '/varlik-aktarim' },
  { ad: 'Madde aktarımı', yol: '/ice-aktarim' },
  { ad: 'Kullanıcı & yetki', yol: '/yetkiler' },
  { ad: 'Raporlar', yol: '/raporlar' },
  { ad: 'Denetim izi', yol: '/aktivite' },
  { ad: 'Platform sağlığı', yol: '/saglik' },
];

export type RayAyagi =
  | { tip: 'efsane'; bantlar: string[]; yazi: string }
  | { tip: 'serit'; gorsel: string; alt: string; yazi: string }
  | null;

function aktifMi(yol: string, patika: string): boolean {
  if (yol === '/') return patika === '/';
  return patika === yol || patika.startsWith(yol + '/');
}

export default function Ray({
  ogeler,
  ayak = null,
  sayilar,
  kullanici = null,
}: {
  ogeler: RayOgesi[];
  ayak?: RayAyagi;
  /** Rota → sayaç. Sunucudan gelir; sıfır/undefined ise sayaç gösterilmez. */
  sayilar?: Record<string, { sayi: number; kritik?: boolean }>;
  /* Oturum sahibi ve çıkış. Faz 6'ya kadar bu blok üst çubuktaydı; üst
     çubuk Atlas'a taşınmadığı için oturumu KAPATMANIN hiçbir yolu
     kalmamıştı. Kim olduğunu görmeden yetki kapsamını okumak da güç. */
  kullanici?: { ad: string; unvan: string | null; demo?: boolean } | null;
}) {
  const patika = usePathname() ?? '/';

  return (
    <nav className="atlas-ray" aria-label="Ana menü">
      <Link href="/" className="ray-marka">
        <span className="ad">Energy Operations</span>
        <span className="alt">Atlas</span>
      </Link>

      {/* Bağlantı listesi KENDİ İÇİNDE kayar. Faz 6'da liste 14'ten 24
          öğeye çıktı ve 1000px'lik bir görüntü alanında oturum bloğunu
          ekranın altına itiyordu: çıkış düğmesi katlamanın altında
          kalıyordu. Marka ve oturum bloğu sabit, yalnız liste kayar. */}
      <div className="ray-liste">
      {ogeler.map((o) => {
        const aktif = aktifMi(o.yol, patika);
        const s = sayilar?.[o.yol] ?? (o.sayi != null ? { sayi: o.sayi, kritik: o.kritik } : null);
        return (
          <Link
            key={o.yol}
            href={o.yol}
            className={`ray-link${o.ayrac ? ' ray-ayrik' : ''}`}
            aria-current={aktif ? 'page' : undefined}
          >
            <span className="etiket">{o.ad}</span>
            {s && s.sayi > 0 && (
              <span className={`sayi${s.kritik ? ' kritik' : ''}`}>{s.sayi}</span>
            )}
          </Link>
        );
      })}
      </div>

      {ayak && (
        <div className="ray-ayak">
          {ayak.tip === 'efsane' ? (
            <div className="ray-efsane">
              <p className="t-colhead" style={{ margin: '0 0 var(--s10)' }}>Grup kesiti</p>
              {ayak.bantlar.map((renk, i) => (
                <div key={i} className="bant" style={{ background: renk }} />
              ))}
              <p className="t-colhead" style={{ margin: 'var(--s10) 0 0', lineHeight: 1.6 }}>
                {ayak.yazi}
              </p>
            </div>
          ) : (
            <div className="ray-serit">
              {/* eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım: optimizasyon kapalı */}
              <img src={ayak.gorsel} alt={ayak.alt} loading="lazy" decoding="async" />
              <span className="perde" aria-hidden />
              <span className="yazi">{ayak.yazi}</span>
            </div>
          )}
        </div>
      )}

      {kullanici && (
        <div className={`ray-kullanici${ayak ? '' : ' ust-bosluk'}`}>
          <span className="ad">{kullanici.ad}</span>
          {kullanici.unvan && <span className="unvan">{kullanici.unvan}</span>}
          {/* Demo yayınında oturum yok: çıkış düğmesi hiçbir şey yapmaz,
              o yüzden gösterilmez — çalışmayan bir düğme koymuyoruz. */}
          {!kullanici.demo && <CikisDugmesi />}
        </div>
      )}
    </nav>
  );
}
