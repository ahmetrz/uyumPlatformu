'use client';
import { useCallback, useRef, useState } from 'react';
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
  /* Bu öğeyi AKTİF sayan ek yollar. Bağlantı buraya gitmez; yalnız aktif
     durum eşleşmesi genişler. Gerekçe: Santral 360 (`/tesisler/<id>`)
     rayda kendi öğesi olmayan bir DETAY ekranıdır ve `/tesisler` listesi
     `/portfoy`ya yönlendirildiği için ray hiçbir alanı aktif göstermiyor,
     ikincil liste "Bugün"e düşüyordu: kullanıcı bir santralin içindeyken
     ray ona nerede olduğunu söylemiyordu. */
  esYollar?: string[];
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
  /* Bildirim kutusu listenin BAŞINDA duruyor ve rayın sayaç taşıyan tek
     öğesi. Gerekçe rayın kendi kuralı: "sayaç yalnız bir kararı değiştiren
     yerde". Son tarih motoru her koşuda bildirim yazıyordu ve hiçbir ekran
     okumuyordu (bulgu #11); okunmamış sayısı ray dışında hiçbir yerde
     görünmezse kutu yine sessiz kalırdı. Sayacı `(operasyonel)/layout.tsx`
     `sayilar` üzerinden verir; sıfırsa hiç çizilmez. */
  { ad: 'Bildirimler', yol: '/bildirimler' },
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
  /* İKİ AYRI EŞLEME EKRANI VAR ve adları bunu söylemek zorunda:
     /eslestirme  madde ↔ madde denkliğini kütükler (çapraz eşleme,
                  tanımlar yetkisi); /esleme dış sistemin ALANINI platform
                  alanına çeviren sürümlü kural profilini yönetir (yönetim
                  yetkisi). Rayda ikincisinin etiketi "Eşleme profilleri":
                  iki öğe "Eşleştirme" ve "Eşleme" diye yan yana dursaydı
                  hangisinin hangisi olduğu ancak açınca anlaşılırdı.
                  Bulgu #10'a kadar bu ekran hiç yoktu: profil connector'a
                  bağlanabiliyor ama hiçbir yerde doğamıyordu. */
  { ad: 'Eşleştirme', yol: '/eslestirme' },
  { ad: 'Eşleme profilleri', yol: '/esleme' },
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

function yolTutar(yol: string, patika: string): boolean {
  if (yol === '/') return patika === '/';
  return patika === yol || patika.startsWith(`${yol}/`);
}

function aktifMi(oge: RayOgesi, patika: string): boolean {
  if (yolTutar(oge.yol, patika)) return true;
  return (oge.esYollar ?? []).some((y) => yolTutar(y, patika));
}

/* ── Atlas 2 · Alan haritası ──────────────────────────────────────────
   Kabuk artık iki kademeli: 64px'lik BİRİNCİL ALAN RAYI (7 alan) ve
   192px'lik BAĞLAMSAL İKİNCİL LİSTE (aktif alanın ekranları).
   27 öğelik tek düz liste tarama yükü yaratıyordu; alan rayı zihinsel
   haritayı 7 bölgeye indirir, ikincil liste her alanda ≤8 öğe kalır.
   URL'ler, RBAC ve kapsam DEĞİŞMEZ — bu salt bir sunum katmanıdır.
   /tesisler → /portfoy yönlendirmesi ve /sistem (rayda hiç olmayan
   tanılama ekranı) eski davranışını korur. */
export type RayAlani = {
  kod: string;        /* monogram — 2 harf, mono */
  ad: string;
  /* 64px raydaki görünen etiket. KURAL: alan adının İLK SÖZCÜĞÜ, tek parça.
     Pilot kusuru: etiket doğrudan `ad`dan basılıyordu; "Risk & denetim" ve
     "Varlık & OT" 58px'lik kolona sığmayıp "RİSK &" / "DENETİM" ve
     "VARLIK &" / "OT" diye kırılıyordu — ikinci satırda tek başına kalan
     "OT" ve asılı kalan "&" rayı bir menü değil, bozuk bir tablo gibi
     gösteriyordu. Rayı genişletmek çözüm değil (iki kademeli kabuğun tüm
     kazancı 64px'te). Onun yerine etiket tek sözcüğe indirildi, CSS'te
     `white-space: nowrap` ile kırılma İMKÂNSIZ hâle getirildi ve kaybolan
     ikinci sözcük üç yerden geri verildi: monogram (RD / VO), bağlantının
     `aria-label` + `title` değeri ve ikincil kolonun başlığı — böylece
     tam ad her zaman bir yerde okunur. */
  kisa: string;
  ekranlar: RayOgesi[];
};

export const ALANLAR: RayAlani[] = [
  { kod: 'BG', ad: 'Bugün', kisa: 'Bugün', ekranlar: [
    { ad: 'Genel bakış', yol: '/' },
    { ad: 'Bildirimler', yol: '/bildirimler' },
  ]},
  { kod: 'PF', ad: 'Portföy', kisa: 'Portföy', ekranlar: [
    /* `/tesisler` kanonik listeyi (`/portfoy`) açar; `/tesisler/<id>`
       Santral 360'tır. İkisi de bu alanın içindedir — es yol olarak
       eklenmeseydi santralin içindeyken ray "Bugün"e düşerdi. */
    { ad: 'Enerji portföyü', yol: '/portfoy', esYollar: ['/tesisler'] },
  ]},
  { kod: 'UY', ad: 'Uyum', kisa: 'Uyum', ekranlar: [
    { ad: 'Uyum matrisi', yol: '/uyum' },
    { ad: 'Uyum süreçleri', yol: '/surecler' },
    { ad: 'Regülasyonlar', yol: '/regulasyonlar', ayrac: true },
    { ad: 'Eşleştirme', yol: '/eslestirme' },
    { ad: 'Madde aktarımı', yol: '/ice-aktarim' },
  ]},
  { kod: 'RD', ad: 'Risk & denetim', kisa: 'Risk', ekranlar: [
    { ad: 'Risk', yol: '/riskler' },
    { ad: 'Denetim', yol: '/denetimler' },
    { ad: 'Bulgu & CAPA', yol: '/bulgular' },
    { ad: 'Projeler', yol: '/projeler' },
    { ad: 'Raporlar', yol: '/raporlar', ayrac: true },
  ]},
  { kod: 'VO', ad: 'Varlık & OT', kisa: 'Varlık', ekranlar: [
    { ad: 'Varlıklar', yol: '/envanter' },
    { ad: 'Keşif', yol: '/kesif' },
    { ad: 'Topoloji', yol: '/topoloji' },
    { ad: 'Ömür', yol: '/omur' },
    { ad: 'Yedek & DR', yol: '/yedekleme' },
    { ad: 'Erişim', yol: '/kimlik' },
    { ad: 'Tedarikçiler', yol: '/tedarikciler' },
    { ad: 'Varlık aktarımı', yol: '/varlik-aktarim', ayrac: true },
  ]},
  { kod: 'OP', ad: 'Operasyon', kisa: 'Operasyon', ekranlar: [
    { ad: 'Olaylar', yol: '/olaylar' },
    { ad: 'Değişiklikler', yol: '/operasyon' },
    { ad: 'Platform sağlığı', yol: '/saglik' },
  ]},
  { kod: 'YN', ad: 'Yönetim', kisa: 'Yönetim', ekranlar: [
    { ad: 'Yönetim tezgâhı', yol: '/yonetim-tezgahi' },
    { ad: 'Eşleme profilleri', yol: '/esleme' },
    { ad: 'Kullanıcı & yetki', yol: '/yetkiler' },
    { ad: 'Denetim izi', yol: '/aktivite' },
  ]},
];

export default function Ray({
  ayak = null,
  sayilar,
  kullanici = null,
}: {
  /** Geriye dönük: eski düz liste artık kullanılmaz; alan haritası sabittir. */
  ogeler?: RayOgesi[];
  ayak?: RayAyagi;
  /** Rota → sayaç. Sunucudan gelir; sıfır/undefined ise sayaç gösterilmez. */
  sayilar?: Record<string, { sayi: number; kritik?: boolean }>;
  /* Oturum sahibi ve çıkış. Faz 6'ya kadar bu blok üst çubuktaydı; üst
     çubuk Atlas'a taşınmadığı için oturumu KAPATMANIN hiçbir yolu
     kalmamıştı. Kim olduğunu görmeden yetki kapsamını okumak da güç. */
  kullanici?: { ad: string; unvan: string | null; demo?: boolean } | null;
}) {
  const patika = usePathname() ?? '/';

  const aktifAlan = ALANLAR.find((a) => a.ekranlar.some((e) => aktifMi(e, patika)));
  /* Hiçbir alan eşleşmezse (ör. /sistem) ikincil liste Bugün'ü gösterir;
     alan rayında hiçbir alan aktif işaretlenmez — dürüst durum. */
  const listeAlani = aktifAlan ?? ALANLAR[0];

  const alanSayaci = (a: RayAlani) => {
    let toplam = 0; let kritik = false;
    for (const e of a.ekranlar) {
      const s = sayilar?.[e.yol];
      if (s && s.sayi > 0) { toplam += s.sayi; if (s.kritik) kritik = true; }
    }
    return toplam > 0 ? { sayi: toplam, kritik } : null;
  };

  /* ── 1024–1199 · bağlamsal açılır liste ────────────────────────────
     Bu bantta ikincil kolon (192px) gizlenir ve geriye yalnız 64px alan
     rayı kalır. Pilot kusuru: kardeş ekranlara (aynı alandaki diğer
     ekranlar) ulaşmanın TEK yolu komut paleti ya da adres çubuğu
     oluyordu — alan rozetine tıklamak kişiyi alanın İLK ekranına
     atıyordu, dolayısıyla "Bulgu & CAPA"dan "Projeler"e geçmek için
     önce "Risk"e uğramak gerekiyordu.
     Çözüm bir açma/kapama düğmesi (`aria-expanded` + `aria-controls`) ve
     panel olarak ZATEN VAR OLAN ikincil kolonun kendisi. Liste İKİNCİ KEZ
     çizilmez: ayrı bir kopya, gizli olsa bile ikinci bir
     `aria-current="page"` üretir ve ekranda "geçerli sayfa" iki kez
     duyurulur — rota duman testinin de yakaladığı gerçek bir kusur.
     HOVER'A BAĞLI DEĞİLDİR: düğme doğal olarak odaklanabilir, Enter/Space
     açar, Esc kapatır ve odağı düğmeye geri verir, bağlantıya basınca
     kendiliğinden kapanır. Panel yalnız bu bantta çizilir; ≥1200'de
     ikincil kolon zaten görünür, <1024'te ray yatay şeride iner. */
  const [baglamAcik, setBaglamAcik] = useState(false);
  const [oncekiYol, setOncekiYol] = useState(patika);
  const ozetRef = useRef<HTMLButtonElement>(null);

  /* Rota değişince panel kapanır. Efekt DEĞİL, render sırasında düzeltme
     (React'in "prop değişince state'i ayarla" kalıbı): Ray istemci
     gezinmesinde yeniden bağlanmadığı için komut paletiyle ya da geri
     tuşuyla gidildiğinde açık panel bir sonraki ekranın üstünde kalırdı. */
  if (oncekiYol !== patika) {
    setOncekiYol(patika);
    setBaglamAcik(false);
  }

  const baglamKapat = useCallback((odagiGeriVer: boolean) => {
    setBaglamAcik(false);
    if (odagiGeriVer) ozetRef.current?.focus();
  }, []);

  return (
    <nav
      className="atlas-ray"
      aria-label="Ana menü"
      /* Esc rayın TAMAMINDA kapatır, yalnız panelin içinde değil: kullanıcı
         paneli açtıktan sonra odağı alan rayına geri alabilir ve o noktada
         Esc'in ölü tuş olması kaçış yolunu kapatır. */
      onKeyDown={(e) => { if (e.key === 'Escape' && baglamAcik) baglamKapat(true); }}
    >
      {/* Birincil alan rayı — 64px */}
      <div className="ray-alanlar" aria-label="Alanlar">
        {ALANLAR.map((a) => {
          const aktif = aktifAlan?.kod === a.kod;
          const s = alanSayaci(a);
          return (
            <Link
              key={a.kod}
              href={a.ekranlar[0].yol}
              className="ray-alan"
              aria-current={aktif ? 'true' : undefined}
              /* Görünen etiket kısaltılmıştır (`kisa`); erişilebilir ad ve
                 ipucu TAM adı taşır — "VARLIK" gören ekran okuyucu kullanıcısı
                 da "Varlık & OT" duyar. */
              aria-label={a.ad}
              title={a.ad}
            >
              <span className="harf" aria-hidden>{a.kod}</span>
              <span className="etiket">{a.kisa}</span>
              {s && <span className={`sayi${s.kritik ? ' kritik' : ''}`}>{s.sayi}</span>}
            </Link>
          );
        })}

        {/* Açma/kapama düğmesi alan bağlantılarının ARDINDA durur — hem
            görsel hem DOM sırasında. Böylece odak sırası "7 alan → düğme →
            panel bağlantıları" olur; açılan panel tetikleyicisinin hemen
            ardından gelir, arada dolaşılacak yedi öğe kalmaz. */}
        <button
          type="button"
          ref={ozetRef}
          className="ray-baglam-ozet"
          aria-expanded={baglamAcik}
          aria-controls="ray-ikincil"
          aria-label={`${listeAlani.ad} · alan ekranları`}
          onClick={() => setBaglamAcik((v) => !v)}
        >
          <span className="harf" aria-hidden>{listeAlani.kod}</span>
          <span className="etiket" aria-hidden>Ekranlar</span>
          <span className="ok" aria-hidden>▸</span>
        </button>
      </div>

      {/* İkincil bağlamsal liste — 192px: marka + aktif alanın ekranları.
          1024–1199'da bu kolon açılır panele dönüşür (`data-acik`); başka
          bantlarda `data-acik` hiçbir şeyi değiştirmez, kolon zaten açıktır
          ya da zaten yoktur. */}
      <div
        id="ray-ikincil"
        className="ray-ikincil"
        data-acik={baglamAcik ? '1' : undefined}
      >
      <Link href="/" className="ray-marka">
        <span className="ad">Energy Operations</span>
        <span className="alt">Atlas</span>
      </Link>

      {/* Alanın TAM adı. 64px raydaki etiket tek sözcüğe indirildiği için
          ("Risk", "Varlık") ikinci sözcük buradan geri gelir; ayrıca liste
          hangi alanın ekranlarını gösterdiğini artık söylüyor. Bu bir GRUP
          başlığı değil (02-components §1 yasağı liste İÇİNDEKİ gruplamaya
          bakar) — listenin tamamının bağlamıdır. */}
      <p className="ray-baslik">{listeAlani.ad}</p>

      {/* Bağlantı listesi KENDİ İÇİNDE kayar; marka ve oturum bloğu sabit. */}
      <div className="ray-liste">
      {listeAlani.ekranlar.map((o) => {
        const aktif = aktifMi(o, patika);
        const s = sayilar?.[o.yol] ?? (o.sayi != null ? { sayi: o.sayi, kritik: o.kritik } : null);
        return (
          <Link
            key={o.yol}
            href={o.yol}
            className={`ray-link${o.ayrac ? ' ray-ayrik' : ''}`}
            aria-current={aktif ? 'page' : undefined}
            /* Panel modunda seçim yapıldı, panel kapanır; geniş bantta
               `baglamAcik` zaten false, çağrı bedelsizdir. */
            onClick={() => baglamKapat(false)}
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
      </div>
    </nav>
  );
}
