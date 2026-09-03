import type { Metadata } from 'next';
import Link from 'next/link';
import { DURUM_SOZU, Im, Segment, TikSeridi, type Durum } from '@/components/kabuk/temel';
import { girisZorunlu } from '@/lib/erisim';
import { KISAYOLLAR } from './mantik';

export const metadata: Metadata = { title: 'Yardım' };

/* ═══════════════════════════════════════════════════════════════════════
   YARDIM — okuma anahtarı, kısayollar, sık sorulanlar (E35)

   SALT SUNUM: bu ekran hiç kayıt okumaz; kapsam daraltılacak bir veri
   yok. OTURUM KAPISI yine de var: kabuk kurumun bilgi mimarisini (ray,
   grup adı, kapsam çubuğu) taşır ve SSS kurum içi kuralları anlatır;
   /sistem ile aynı gerekçe, aynı kalıp (`girisZorunlu`). İçeriğin doğruluk kaynağı KOD'dur, bu dosya değil:
     · durum sözcükleri `DURUM_SOZU`dan gelir (elle yazılsaydı biri
       değişince burası yalan söylerdi);
     · kısayollar `mantik.ts`teki `KISAYOLLAR`dan gelir — `?` katmanıyla
       aynı liste;
     · iş kuralları (bulgu kapanış kapısı, OT emniyet kapıları, santral
       kapsamı) `lib/eylemler.ts`, `operasyon/mantik.ts` ve `app/kapsam.ts`
       içindeki gerçek kurallardan ÖZETLENMİŞTİR; oradaki kural değişirse
       buradaki cümle de değişmeli — dosya başına not düşüldü.

   Destek adresi UYDURULMAZ: ürün, kurumun BT destek kanalını bilmez;
   "kurumunuzun BT destek kanalı" der ve bırakır.

   Kök `<main>`: her ekran kendi ana bölgesini çizer; kabuktaki `#icerik`
   yalnız atla bağının hedefi olan bir sarmalayıcıdır, main değil. */

/* Okuma anahtarında gösterilecek durumlar — `Durum` kümesinin tamamı.
   `tamam` da listede: aksiyon/görev satırlarında görülür ve `ok` ile
   aynı glifi paylaşır; kişi "aynı işaret, iki sözcük" görünce şaşırmasın. */
const DURUMLAR: Durum[] = ['ok', 'md', 'bd', 'pl', 'unk', 'tamam'];

const ALANLAR = [
  { ad: 'Saha', yol: '/', kabuk: 'B · saha', ne: 'Yönetici bakışı: bugün santrallerde ne oluyor, en kötü ne, ne bekliyor.' },
  { ad: 'Portföy', yol: '/portfoy', kabuk: 'B · saha', ne: 'Santral listesi ve her santralin 360° künyesi.' },
  { ad: 'Uyum', yol: '/uyum', kabuk: 'C · defter', ne: 'Regülasyon maddeleri, süreçler, çapraz eşleme, kanıt ve raporlar.' },
  { ad: 'Varlık', yol: '/envanter', kabuk: 'A · tezgâh', ne: 'IT/OT envanteri, keşif, topoloji, ömür, yedek, erişim, tedarikçi, olay, değişim, sağlık.' },
  { ad: 'Risk', yol: '/riskler', kabuk: 'C · defter', ne: 'Risk kütüğü, denetimler, bulgu & CAPA, projeler.' },
] as const;

const KABUKLAR = [
  { ad: 'A · Tezgâh', ne: 'Sol ikon rayı + üstte kapsam çubuğu. Varlık alanı, yönetim ve kurulum ekranları burada.' },
  { ad: 'B · Saha', ne: 'Yatay sekme, ray yok, fotoğrafik alan. Ana ekran ve portföy.' },
  { ad: 'C · Defter', ne: 'Serif sekme + sol dizin. Uyum, risk, denetim ve kayıt ekranları — okunacak, imzalanacak şeyler.' },
] as const;

/* Sık sorulanlar. Her cevabın dayandığı kural dosyası parantezle anılır;
   belge koddan bağımsız YAŞAYAMAZ. */
const SSS: { soru: string; cevap: string; kaynak: string }[] = [
  {
    soru: 'Bir maddeye kanıt nasıl bağlanır?',
    cevap: 'Uyum matrisinde ilgili maddenin durum satırını açın; "Kanıt ekle" ile bir kanıt kaydı oluşturulur (tip: politika, kayıt, konfigürasyon, ekran görüntüsü, rapor) ve o madde durumuna bağlanır. Bir kanıt birden çok maddeye bağlanabilir; bağlantı da kayıt da denetim izine düşer. Bağlı kanıtların tamamı Kanıt kütüphanesinde listelenir.',
    kaynak: 'lib/eylemler.ts · kanitEkle',
  },
  {
    soru: 'Bir bulgu nasıl kapanır? Kim kapatabilir?',
    cevap: 'Kapanış bir DOĞRULAMA kapısıdır: bulguyu yalnız uyum onay yetkisi olan kişi (denetim sorumlusu ya da yönetici) kapatabilir ve bulguya bağlı açık aksiyon (planlandı / devam ediyor) kalmamış olmalıdır. Kapanışta doğrulayan kişi ve zaman kayda yazılır; aksiyonlar bitmeden kapatma denemesi kaç aksiyonun açık olduğunu söyleyerek reddedilir.',
    kaynak: 'lib/eylemler.ts · bulgu durumu güncelleme',
  },
  {
    soru: 'OT değişikliğinde "emniyet kapısı" ne demek?',
    cevap: 'OT (saha sistemi) değişikliklerinde beş kapı izlenir: sağlayıcı onayı, bakım penceresi, geri alma planı, ön değişiklik yedeği, üretim etkisi. Kapı boşsa bu "hayır" değil "kaydedilmedi" demektir — ikisi ayrı gösterilir. BT değişikliklerinde kapı yoktur; olmayan kapı için boş kutu çizilmez.',
    kaynak: 'operasyon/mantik.ts · emniyet kapıları',
  },
  {
    soru: 'Santral kapsamı nedir, neden bazı kayıtları göremiyorum?',
    cevap: 'Her kullanıcının modül başına (uyum, envanter, risk, denetim) izinli santral kümesi vardır. Sınırsız yetki tüm santralleri, kısıtlı yetki yalnız o kümeyi gösterir; sayılar ve listeler bu kümeye göre daraltılır — kabuktaki "N santral" sayısı da dâhil. Santrala bağlı olmayan (grup geneli) kayıtlar yalnız sınırsız kapsamda görünür. Göremediğiniz kayıt yok değildir; kapsam dışıdır.',
    kaynak: 'app/kapsam.ts · izinliTesisIdleri',
  },
  {
    soru: 'Bir ölçü "—" ya da "kayıt yok" gösteriyor; sıfır mı?',
    cevap: 'Hayır. Platform bilinmeyeni sıfırdan ayırır: ölçülmemiş, bağlanmamış ya da kaydedilmemiş bir değer boş çizilir, 0 yazılmaz. Örneğin hiçbir bağlayıcı koşmadıysa veri kesiti damgası "—"dır; sistem saati damga diye gösterilmez.',
    kaynak: 'components/kabuk/kabukVerisi.ts · veri kesiti',
  },
  {
    soru: 'Bildirim rozeti neyi sayar?',
    cevap: 'Yalnız sizin kutunuzdaki okunmamış bildirimleri. Sıfırda rozet çizilmez; 99\'dan sonrası "99+" olarak kırpılır, gerçek sayı ekran okuyucuya okunur. Bildirimi açmak okundu yapmaz; satırdaki "Okundu işaretle" ya da listedeki toplu işaret gerekir. Okundu işareti yalnız sizin kutunuzda geçerlidir; kaydın kendisini kapatmaz.',
    kaynak: 'components/kabuk/kabukVerisi.ts · okunmamış sayacı',
  },
  {
    soru: 'Demo hesabındayım; neden yazamıyorum?',
    cevap: 'Demo oturumu salt okunurdur: demo hesabı hiçbir koşulda yazma yetkisi taşımaz, kayıt oluşturan/değiştiren eylemler kapalıdır. Gerçek bir hesapla girdiğinizde eylemler yetkinize göre açılır.',
    kaynak: 'lib/auth.ts · demo oturumu',
  },
  {
    soru: 'Gerçek kurum sistemlerine bağlanıyor mu?',
    cevap: 'Bu sürümde hayır. Bağlayıcılar (AD/Entra ID, EDR, zafiyet tarayıcı, SIEM, yedekleme, ağ cihazı, OT keşif) tanımlıdır ama gerçek uç noktaya bağlanmaz; Sağlık ekranı hiç koşmamış bağlayıcıyı "hiç koşmadı — sağlıklı olduğu anlamına gelmez" diye gösterir, sağlayıcıyı da "bağlı / bağlı değil" olarak.',
    kaynak: 'saglik/Cekmeceler.tsx · connector ve sağlayıcı çekmeceleri',
  },
];

export default async function YardimEkrani() {
  await girisZorunlu();
  return (
    <main className="ab-ekran-govde ab-yardim-ekran">
      <header className="ab-lede">
        <div className="sol">
          <p className="etiket">Yardım · okuma anahtarı, kısayollar, sık sorulanlar</p>
          <h1>Bu ekranlar nasıl okunur?</h1>
        </div>
        <p className="mono ab-dip" style={{ margin: 0 }}>
          Buradaki durum sözcükleri ve kısayollar koddan okunur; iş kuralları
          ilgili kural dosyasından özetlenmiştir ve her cevabın altında o dosya
          anılır.
        </p>
      </header>

      {/* İçindekiler: 5 bölüm, çapa bağlantıları. Uzun sayfa tek akış
          kalır (ayrı rotalara bölünmez) ama başlıklar adreslenebilir —
          Ayak bağlantıları ve Kısayollar katmanı buraya çapa ile gelir. */}
      <nav className="ab-icindekiler" aria-label="İçindekiler">
        <p className="etiket">İçindekiler</p>
        <ol>
          <li><a href="#yardim-platform">Platform nedir</a></li>
          <li><a href="#yardim-anahtar">Okuma anahtarı</a></li>
          <li><a href="#yardim-kisayol">Klavye kısayolları</a></li>
          <li><a href="#yardim-sss">Sık sorulanlar</a></li>
          <li><a href="#yardim-destek">Destek</a></li>
        </ol>
      </nav>

      {/* ── 1 · Platform nedir ─────────────────────────────────────── */}
      <section className="bolum" aria-labelledby="yardim-platform">
        <h2 id="yardim-platform" className="ab-bolum-basligi">Platform nedir</h2>
        <p className="mono ab-dip">
          Enerji üretim grubu için IT/OT yönetişim, uyum ve dönüşüm platformu.
          Beş alan, üç kabuk; alanlar her ekranın üst çubuğunda durur, tek
          tıkla geçilir.
        </p>
        <div className="ab-yardim-tablo-sar">
          <table className="ab-yardim-tablo">
            <thead>
              <tr><th scope="col">Alan</th><th scope="col">Kabuk</th><th scope="col">Ne var</th></tr>
            </thead>
            <tbody>
              {ALANLAR.map((a) => (
                <tr key={a.yol}>
                  <th scope="row"><Link href={a.yol}>{a.ad}</Link></th>
                  <td className="mono">{a.kabuk}</td>
                  <td>{a.ne}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="ab-yardim-liste">
          {KABUKLAR.map((k) => (
            <div key={k.ad} className="ab-yardim-satir">
              <dt className="mono">{k.ad}</dt>
              <dd>{k.ne}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 2 · Okuma anahtarı ─────────────────────────────────────── */}
      <section className="bolum" aria-labelledby="yardim-anahtar">
        <h2 id="yardim-anahtar" className="ab-bolum-basligi">Okuma anahtarı</h2>
        <p className="mono ab-dip">
          Durum yalnız renkle anlatılmaz: şekil ve sözcük birinci kanaldır.
          Aşağıdaki işaretler üç kabukta aynı anlama gelir; yalnız malzeme
          (kare / daire) değişir.
        </p>
        <dl className="ab-yardim-liste">
          {DURUMLAR.map((d) => (
            <div key={d} className="ab-yardim-satir">
              <dt><Im durum={d} /> <span className="mono">{d}</span></dt>
              <dd>{DURUM_SOZU[d]}{d === 'tamam' && ' — aksiyon ve görev satırlarında; "Uyumlu" ile aynı glif'}</dd>
            </div>
          ))}
          <div className="ab-yardim-satir">
            <dt><Segment ok={5} md={2} bd={1} unk={2} /></dt>
            <dd>
              Segment şeridi: bir kümenin dağılımı (uyumlu · kısmi · uyumsuz ·
              değerlendirilmedi). Bilinmeyen daima sonda ve taralıdır; &ldquo;uygun&rdquo;a
              katılmaz. Üstüne gelindiğinde sayılar okunur, ekran okuyucuya da
              aynı sayılar verilir.
            </dd>
          </div>
          <div className="ab-yardim-satir">
            <dt><TikSeridi dolu={3} toplam={5} etiket="Örnek tik şeridi: 5 üzerinden 3" /></dt>
            <dd>
              Tik şeridi: bir oran değil, bir DİZİ ölçüm ya da eşik üstü
              ağırlık. Boş tik &ldquo;o sırada kayıt yok&rdquo; demektir, sıfır değil.
            </dd>
          </div>
          <div className="ab-yardim-satir">
            <dt><span className="mono">—</span></dt>
            <dd>
              Bilinmeyen ≠ sıfır. Ölçülmemiş, bağlanmamış ya da kaydedilmemiş
              değer boş çizilir; &ldquo;0&rdquo; yalnız gerçekten sayılıp sıfır çıkanı
              anlatır.
            </dd>
          </div>
        </dl>
      </section>

      {/* ── 3 · Klavye kısayolları ─────────────────────────────────── */}
      <section className="bolum" aria-labelledby="yardim-kisayol">
        <h2 id="yardim-kisayol" className="ab-bolum-basligi">Klavye kısayolları</h2>
        <p className="mono ab-dip">
          Aynı liste <kbd className="ab-yardim-tus">?</kbd> ile açılan katmanda
          da görünür. Yazı alanındayken <kbd className="ab-yardim-tus">?</kbd> bir
          harftir, katmanı açmaz.
        </p>
        <dl className="ab-yardim-liste">
          {KISAYOLLAR.map((k) => (
            <div key={k.tuslar.join('+')} className="ab-yardim-satir">
              <dt>
                {k.tuslar.map((t, i) => (
                  <span key={t}>
                    {i > 0 && <span className="ab-yardim-arti" aria-hidden>+</span>}
                    <kbd className="ab-yardim-tus">{t}</kbd>
                  </span>
                ))}
              </dt>
              <dd>
                {k.yapar}
                <span className="mono ab-yardim-baglam"> · {k.baglam}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 4 · Sık sorulanlar ─────────────────────────────────────── */}
      <section className="bolum" aria-labelledby="yardim-sss">
        <h2 id="yardim-sss" className="ab-bolum-basligi">Sık sorulanlar</h2>
        <dl className="ab-yardim-sss">
          {SSS.map((s) => (
            <div key={s.soru} className="ab-yardim-soru">
              <dt>{s.soru}</dt>
              <dd>
                <p className="cumle">{s.cevap}</p>
                <p className="mono ab-dip ab-yardim-kaynak">Kural: {s.kaynak}</p>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 5 · Destek ──────────────────────────────────────────────── */}
      <section className="bolum" aria-labelledby="yardim-destek">
        <h2 id="yardim-destek" className="ab-bolum-basligi">Destek</h2>
        <p className="cumle">
          Hesap, yetki ve santral kapsamı için <strong>kurumunuzun BT destek
          kanalına</strong> başvurun; bu platform kendi başına hesap açmaz ve
          yetki genişletmez. Yetkinizi ve kapsamınızı{' '}
          <Link href="/ayarlar">Ayarlar</Link> ekranından görebilirsiniz.
          Bağlayıcı sağlığı ve son veri kesiti her ekranın alt çubuğunda ve{' '}
          <Link href="/saglik">Sağlık</Link> ekranındadır.
        </p>
        <p className="mono ab-dip">
          Bu sayfa hiçbir kayıt okumaz; ekran görüntüsü paylaşırken kapsam
          bilgisi içermez.
        </p>
      </section>
    </main>
  );
}
