import { db } from '@/lib/db';

/* Durum ayağı — Atlas 2 kabuğunun 28px'lik alt şeridi.

   BAĞLAYICI DÜRÜSTLÜĞÜ: buradaki her sayı gerçek `Connector` tablosu
   sayımıdır. kimlik_bekleniyor bir HATA DEĞİLDİR — bekleyen kurulum
   adımıdır ve "bekliyor" olarak yazılır; asla "bağlı" taklidi yapılmaz.
   Hiç connector yoksa şerit bunu da açıkça söyler. BİLİNMEYEN ≠ YANLIŞ:
   son başarılı koşu yoksa tarih uydurulmaz, "—" yazılır.

   Sunucu bileşenidir; her gezinmede taze sayım okur. Sorgu iki basit
   aggregate'ten ibarettir (groupBy + max), ek yük ihmal edilebilir. */

const TARIH = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
});

export default async function DurumAyagi() {
  let gruplar: { durum: string; _count: { _all: number } }[] = [];
  let sonKosu: Date | null = null;
  try {
    [gruplar, sonKosu] = await Promise.all([
      db.connector.groupBy({ by: ['durum'], _count: { _all: true } }),
      db.connector
        .aggregate({ _max: { sonBasariliKosu: true } })
        .then((a) => a._max.sonBasariliKosu),
    ]);
  } catch {
    /* Demo/statik derlemede veritabanı yoksa şerit çizilmez —
       uydurma sayı göstermekten iyidir. */
    return null;
  }

  const say = (d: string) => gruplar.find((g) => g.durum === d)?._count._all ?? 0;
  const toplam = gruplar.reduce((t, g) => t + g._count._all, 0);

  /* etiket + glif sınıfı; sıfır olan kalem hiç çizilmez (gürültü değil) */
  const kalemler: { sinif: string; etiket: string; deger: number }[] = [
    { sinif: 'im-bagli', etiket: 'bağlı', deger: say('etkin') },
    { sinif: 'im-kimlik', etiket: 'kimlik bekliyor', deger: say('kimlik_bekleniyor') },
    { sinif: 'im-yapilandirilmamis', etiket: 'yapılandırılmamış', deger: say('taslak') },
    { sinif: 'im-durakladi', etiket: 'duraklatıldı', deger: say('duraklatildi') },
    { sinif: 'im-hatali', etiket: 'hatalı', deger: say('hatali') },
  ].filter((k) => k.deger > 0);

  return (
    <footer className="durum-ayak baskida-gizle" aria-label="Bağlayıcı durumu">
      <span className="oge">bağlayıcılar <span className="deger">{toplam}</span></span>
      {kalemler.map((k) => (
        <span key={k.sinif} className="oge">
          <span className={`im ${k.sinif}`} aria-hidden />
          {k.etiket} <span className="deger">{k.deger}</span>
        </span>
      ))}
      {toplam === 0 && <span className="oge">hiç bağlayıcı tanımlı değil</span>}
      <span className="sag">
        son başarılı koşu <span className="deger">{sonKosu ? TARIH.format(sonKosu) : '—'}</span>
      </span>
    </footer>
  );
}
