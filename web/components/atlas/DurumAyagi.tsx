import { aktifKullanici } from '@/lib/auth';
import { durumAyagiVerisi } from './durumAyagiVerisi';

/* Durum ayağı — Atlas 2 kabuğunun 28px'lik alt şeridi.

   BAĞLAYICI DÜRÜSTLÜĞÜ: buradaki her sayı gerçek `Connector` tablosu
   sayımıdır. kimlik_bekleniyor bir HATA DEĞİLDİR — bekleyen kurulum
   adımıdır ve "bekliyor" olarak yazılır; asla "bağlı" taklidi yapılmaz.
   Hiç connector yoksa şerit bunu da açıkça söyler. BİLİNMEYEN ≠ YANLIŞ:
   son başarılı koşu yoksa tarih uydurulmaz, "—" yazılır.

   Yetki kapısı ve silinen kayıt yüklemi `durumAyagiVerisi.ts`tedir; iki
   inceleme kusurunun gerekçesi ve testleri orada. Burada yalnız sunum var.

   Sunucu bileşenidir; her gezinmede taze sayım okur. Sorgu iki basit
   aggregate'ten ibarettir (groupBy + max), ek yük ihmal edilebilir. */

const TARIH = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
});

export default async function DurumAyagi() {
  /* Oturum okuması da korunur: kabuk giriş ekranında da yüklenebilir ve
     orada `aktifKullanici` çerez okumaya çalışırken atabilir. */
  let veri = null;
  try {
    veri = await durumAyagiVerisi(await aktifKullanici());
  } catch {
    return null;
  }
  if (!veri) return null;

  const say = (d: string) => veri.sayimlar[d] ?? 0;

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
      <span className="oge">bağlayıcılar <span className="deger">{veri.toplam}</span></span>
      {kalemler.map((k) => (
        <span key={k.sinif} className="oge">
          <span className={`ab-glif ${k.sinif}`} aria-hidden />
          {k.etiket} <span className="deger">{k.deger}</span>
        </span>
      ))}
      {veri.toplam === 0 && <span className="oge">hiç bağlayıcı tanımlı değil</span>}
      <span className="sag">
        son başarılı koşu{' '}
        <span className="deger">{veri.sonKosu ? TARIH.format(veri.sonKosu) : '—'}</span>
      </span>
    </footer>
  );
}
