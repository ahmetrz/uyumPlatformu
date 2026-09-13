/* İKİNCİ BAĞIMSIZ POPÜLASYON TANIĞI — RENDER EDİLMİŞ DOM

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Bu depoda iki kütük, popülasyonunu TEK bir regex türeticisinden alıyor:

     · `arac/politika-kutugu.mjs`  → politika cümleleri
     · `arac/bos-durum-kutugu.mjs` → boş durumlar

   Cırcırın "tavan sıfır" dişi, yalnız TÜRETİCİNİN GÖRDÜĞÜ popülasyonu
   korur. Türetici kör olduğunda kapı, göremediği kadarını "sıfır kusur"
   diye raporlar — ve bu, ölçülmüş bir başarısızlık biçimidir:

     politika evreni : 131 → 184   (tırnaksız JSX metni görülmüyordu)
     boş durum evreni: 74 → 94 → 95 → 102 → 100   (beş kez genişledi)

   Beş kez kör çıkan bir türeticinin "ölçülmeyen 0" çıktısı, popülasyonu
   BAĞIMSIZ doğrulanmadıkça bir ölçüm değildir. Alet, ürün değil.

   ── TANIĞIN MEKANİZMASI FARKLIDIR ─────────────────────────────────────
   Bu betik kaynağı HİÇ OKUMAZ. Ürünü gerçek bir tarayıcıda açar ve
   KULLANICIYA GÖRÜNEN metni toplar. Aynı kusur iki mekanizmada birden
   olmadıkça ayrışma görünür: regex bir metni kaçırırsa DOM onu yakalar,
   DOM bir metni gösteremezse (ölü kütük satırı) regex tarafı açıkta kalır.

   Demo ikizlerinde aynı kalıp zaten kullanıldı: popülasyon hem dosya
   sisteminden hem `import.meta.glob`tan türetilir ve ikisinin aynı
   kümeyi verdiği ölçülür.

   ── NE ÜRETİR ─────────────────────────────────────────────────────────
   `arac/dom-tanik.json`:
     { uretilme, rota: [...], politikaAdaylari: [...], bosDurumlar: [...] }

   Karşılaştırmayı bekçi yapar (`tests/bekci/dom-tanik.test.ts`); bu
   betik yalnız TOPLAR. Toplayan ile yargılayanı ayırmak bilinçlidir:
   yargı saf bir fonksiyonda kalsın ve sentetik kütüklerle sınanabilsin.

   Kullanım: PORT=3210 node arac/dom-tanik.mjs        (canlı sunucu ister)
             PORT=3210 node arac/dom-tanik.mjs --yaz  (kütüğü yaz)        */
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { KOK, WEB, girisYap, sayfaEnvanteri, tarayiciYolu, tohumDegeri } from './kosu-ortak.mjs';
import { CUMLE_TABANI, CUMLE_TAVANI } from './politika-kutugu.mjs';
import { sebepBayragi, tabanDogrula, tabanYaz } from './olcum-tabani.mjs';

/* ── İKİ VERİ HÂLİ, TEK TANIK ────────────────────────────────────────
   Tanık iki kez koşar ve ikisi de AYNI aracın koşumudur:

     (varsayılan)  TOHUMLU kurulum → `arac/dom-tanik.json`
     `--bos`       BOŞ kurulum     → `arac/dom-tanik-bos.json`

   Neden iki hâl gerekti (Brief M · FAZ 1): cümlesiz boş yüzey ancak
   VERİ YOKKEN görünür. Tohumlu kurulumda tabloların çoğu doludur ve
   ölçüm 0 çıkar — ölçüldü, bu turda tohumlu koşumda cümlesiz yüzey 0.
   "Tohumlu koşumda 0" ile "böyle bir kusur yok" AYNI ŞEY DEĞİLDİR;
   ikisini ayıran tek şey boş veriyle bir koşumdur.

   ── FİKSTÜRÜNÜ KENDİ KURAR ──────────────────────────────────────────
   Boş koşum, kendi veritabanını kurar: göç zinciri uygulanır, ürünün
   KENDİ kurucu hesap aracıyla (`arac/kurucu-hesap.ts`) tek bir yönetici
   açılır, sunucu o veritabanıyla ayrı bir portta başlatılır ve koşum
   sonunda ikisi de kaldırılır. Kendi kurmadığı bir duruma yaslanan kapı
   yanlış sebeple geçebilir — bu deponun POL-084'te ölçtüğü sınıf. */
export const CIKTI = path.join(WEB, 'arac', 'dom-tanik.json');
export const CIKTI_BOS = path.join(WEB, 'arac', 'dom-tanik-bos.json');

/* ── POLİTİKA ADAYI SEÇİCİSİ ───────────────────────────────────────────
   Kütüğün kendi sınıflandırıcısı (`politikaMi`) burada YENİDEN
   KULLANILIR — bilerek. Tanığın işi "politika nedir"i yeniden tanımlamak
   değil, POPÜLASYONUN kendisini ikinci bir yoldan görmek. Ölçüt aynı
   kalmazsa iki taraf hiçbir zaman örtüşmez ve ayrışma dişi gürültüye
   boğulur. */
const { politikaMi } = await import('./politika-kutugu.mjs');

/** Ekranda görünen metin bloklarını normalleştirir. */
const duz = (m) => String(m ?? '').replace(/\s+/g, ' ').trim();

/* Toplanan metin, kütüğün taşıdığı biçime yaklaştırılır: kütük JSX
   kaynağındaki metni tutar (`&quot;` çözülmüş, satır sonları boşluk).
   Tam eşleşme beklenmez — karşılaştırma NORMALLEŞTİRİLMİŞ ÇEKİRDEK
   üzerinden yapılır (bkz. `cekirdek`, bekçi tarafında). */

async function sayfaTopla(page) {
  /* ── SINIRLAR TÜRETİCİDEN GELİR (düzeltme turu · tur 2 · P2-7) ──────
     Tanık `25` ve `400`ü KENDİ İÇİNE yazıyordu. İki ayrı yerde iki ayrı
     sayı tutmak, tanığın var oluş sebebini yok eder: türeticinin sınırı
     değiştiği gün ayrışma GERÇEK bir körlüğü değil, iki sabitin
     kaymasını gösterirdi — ve bu, tanığın yakaladığı dördüncü körlüğün
     ta kendisiydi. Sayılar `page.evaluate`e argüman olarak geçer;
     tarayıcı bağlamı modül kapsamını görmez. */
  return page.evaluate(({ taban, tavan }) => {
    const cikan = { politika: [], bos: [], cumlesiz: [], bosYuzeySayisi: 0, veriYuzeyi: 0 };
    const gorunur = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    /* POLİTİKA ADAYI: kendi içinde başka blok taşımayan metin taşıyıcıları.
       İç içe elemanları iki kez saymamak için yalnız "yaprak blok"lar
       alınır — yoksa aynı cümle sarmalayıcılarıyla birlikte onlarca kez
       görünürdü. */
    const bloklar = document.querySelectorAll('p, li, span, div, td, th, h1, h2, h3, h4, summary, figcaption, label');
    for (const el of bloklar) {
      if (el.querySelector('p, li, div, td, th, h1, h2, h3, h4, summary')) continue;
      if (!gorunur(el)) continue;
      const metin = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (metin.length < taban || metin.length > tavan) continue;
      cikan.politika.push(metin);
    }
    /* ── BOŞ DURUM · TANIĞIN KENDİ KUSURU DÜZELTİLDİ ──────────────────
       İlk yazım `[class*="bos"]` kullanıyordu ve bu İKİ YÖNDE de yanlıştı:

       (a) YANLIŞ POZİTİF: alt dize eşleşmesi `ab-dok-bosluk` ve
           `ab-harita-bos` gibi YERLEŞİM sınıflarını da yakalıyordu.
           `/topoloji`nin "22 kapsam · 4 temeli onaylı" ÖZET paneli boş
           durum sanılıp "eylemsiz" diye kırmızı yakmıştı.
       (b) YANLIŞ NEGATİF: ürünün asıl boş durum bileşeni `BosIlk`
           `bos` sınıfını HİÇ basmıyor — `div.ab-blok` + `span.etiket`
           ("Boş · ilk kurulum") basıyor. Yani tanık, aradığı şeyi hiç
           göremiyordu.

       Bugün ürünün KENDİ sözleşmesi okunur: bileşenin etiket metni ve
       satır içi `bos` SINIF ADI (alt dize değil, tam belirteç). */
    const ETIKETLER = { 'Boş · ilk kurulum': 'BosIlk', 'Beklenen durum': 'BosIlk-iyi', 'Süzgeç': 'BosFiltre' };
    const ekle = (el, tur) => {
      if (!gorunur(el)) return;
      const metin = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (metin.length < 3) return;
      cikan.bos.push({
        metin,
        tur,
        sinif: el.getAttribute('class') || '',
        iyiHaber: tur === 'BosIlk-iyi' || el.classList.contains('iyi'),
        eylem: !!el.querySelector('a[href], button'),
      });
    };
    for (const el of document.querySelectorAll('div.ab-blok > span.etiket')) {
      const tur = ETIKETLER[(el.textContent || '').replace(/\s+/g, ' ').trim()];
      if (tur) ekle(el.parentElement, tur);
    }
    for (const el of document.querySelectorAll('.bos')) ekle(el, 'satirIci');

    /* ══ CÜMLESİZ BOŞ YÜZEY ═══════════════════════════════════════════
       ── ÖLÇÜLEN KUSUR (Brief M · FAZ 1) ─────────────────────────────
       Düzeltme turunda `VeriTablosu` KENDİ boş durumunu bıraktı ve
       gerekçe doğruydu: paylaşılan bir bileşen boşluğun SEBEBİNİ
       bilemez. Ama sonucu bir delik açtı — bugün sıfır satırlı bir
       tablo HİÇ CÜMLE OLMADAN render edilebiliyor. Cümle yoksa kaynak
       türeticisi onu göremez (okuyacağı bir metin yoktur), kütüğe
       girmez ve "eylemsiz 0" yeşil kalır. Kütük bir satırı SİLEREK
       iyileşmişti; bu bir bulgudur.

       Kaynak türeticisi bunu YAPISAL OLARAK ölçemez: "bu tablo boş
       render edilecek mi" sorusunun cevabı çalışma anındadır. Diş bu
       yüzden TANIKTA durur.

       ── ÖLÇÜT ───────────────────────────────────────────────────────
       Sıfır VERİ SATIRI olan her görünür tablo/liste için, düğümün
       KAPSAMINDA bir boş durum cümlesi bulunmalıdır. Kapsam = en yakın
       bölüm atası; cümle = ürünün kendi boş durum işaretleri
       (`BosIlk` · `BosFiltre` · `.bos` · `.ab-vt-cagiran`) ya da o
       kapsamda tablonun BAŞLIĞI OLMAYAN, en az 12 karakterlik görünür
       bir metin. İkisi de yoksa yüzey CÜMLESİZDİR. */
    const YUKLENIYOR = (el) => !!el.closest('.ab-iskelet, [aria-busy="true"]')
      || !!el.querySelector('.ab-iskelet');
    /* Kapsam ve işaret tanımları AŞAĞIDA kullanılan yerlerden ÖNCE. */
    /* Kapsam DAR tutulur: `main` BİLEREK yok. Sayfanın herhangi bir
       yerindeki bir boş durum işareti, BAŞKA bir bölümdeki cümlesiz
       tabloyu aklıyordu — ölçüt o zaman "sayfada bir yerde cümle var"
       olur ve dişin ölçtüğü şey kaybolur. */
    /* ── KAPSAM GERÇEKTEN DAR OLMALI (bağımsız inceleme · P2-4) ──────
       `section` bazı ekranlarda EKRANIN TAMAMIDIR
       (`section.ab-ekran-govde`): o bölümde tek bir `.bos` varsa aynı
       bölümdeki BÜTÜN cümlesiz tablolar aklanıyordu — ölçütün kaçındığı
       "sayfada bir yerde cümle var" hâli, bir seviye aşağıda aynen.
       Ekran gövdesi artık kapsam SAYILMAZ; o düğüme düşen bir yüzeyin
       cümlesi kendi yakınında olmak zorunda. */
    const BOLUM = 'section:not(.ab-ekran-govde), article, .ab-blok, .ab-panel, .ab-kutu, .ab-kart';
    /* Ürünün KENDİ boş durum sözleşmesi. Genel metin yedeği DENENDİ ve
       GERİ ALINDI (ölçüldü: diş 0 buldu, çünkü her kapsayıcıda başlık,
       süzgeç etiketi ya da düğme metni var — yedek "cümle" diye onları
       sayıyordu ve diş ÖLÜ kalıyordu). Başlık bir boş durum cümlesi
       değildir: sebebi söylemez, çözüme işaret etmez ve boş durum
       kütüğüne girmez. Ölçülen şey tam olarak budur — sözleşmeye
       girmeyen bir boşluk, kütüğün göremediği bir boşluktur. */
    const ISARET = '.bos, .ab-vt-cagiran, .ab-bos';
    /* ── AKLAYAN CÜMLE GÖRÜNÜR OLMALI (bağımsız inceleme · P2-3) ─────
       İlk yazım yalnız `querySelector` yapıyordu: `display:none` bir
       `.bos`, gizli bir sekme panelindeki `BosIlk` ya da medya
       sorgusuyla saklanmış bir boş durum, GÖRÜNÜR cümlesiz bir tabloyu
       AKLIYORDU. Kütük "bu boşluğun cümlesi var" der, ekranda cümle
       yoktur — dişin kovaladığı kusurun kendi aklama tarafındaki
       hâli. */
    /* ── BİR CÜMLE BİR YÜZEYİ AKLAR (Codex · P2) ────────────────────
       "Kapsamda cümle var mı" diye soran bir ölçüt, aynı bölümü
       PAYLAŞAN iki yüzeyden birinin cümlesiyle ÖBÜRÜNÜ de aklıyordu:
       ikinci tablo cümlesiz kalabilir ve diş bunu hiç göremezdi. Bugün
       sorulan şey SAYIDIR — kapsamdaki görünür cümle sayısı, o
       kapsamdaki boş yüzey sayısından azsa fark kadar yüzey
       cümlesizdir. Kapsamı daraltmak yetmedi; bölüm gerçekten iki
       yüzey taşıyabiliyor. */
    /* ── AKLAYAN ŞEY BİR BOŞ DURUM CÜMLESİ OLMALI (Codex · P2) ──────
       `div.ab-blok > span.etiket` yalnız boş durumlara ait değil: aynı
       kalıbı `Hata` · `Ölçülmedi` · `Bağlantı yok` · `Bakımda` da
       kullanıyor. `.bos` ise bazı yerlerde GÖRSEL bir değiştirici
       (`.ab-b-yigin.bos`). İkisi de cümle sayılırsa gerçekten cümlesiz
       bir yüzey aklanır. Bugün etiket ÜRÜNÜN kendi boş durum
       sözleşmesinden (`ETIKETLER`) gelmek zorunda, `.bos` ise görünür
       ve en az `CUMLE_ASGARI` karakterlik metin taşımak zorunda. */
    const CUMLE_ASGARI = 12;
    const cumleSayisi = (kapsam) => {
      let n = 0;
      for (const el of kapsam.querySelectorAll(`${ISARET}, div.ab-blok > span.etiket`)) {
        if (!gorunur(el)) continue;
        if (el.matches('div.ab-blok > span.etiket')) {
          const ad = (el.textContent || '').replace(/\s+/g, ' ').trim();
          if (!ETIKETLER[ad]) continue;
          n += 1;
          continue;
        }
        const metin = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (metin.length < CUMLE_ASGARI) continue;
        n += 1;
      }
      return n;
    };
    /* ── VERİ SATIRI ≠ HER `tr` (bağımsız inceleme · P1-1) ───────────
       `tbody` içinde veri OLMAYAN satırlar var: kuyruk satırı
       (`tr.kuyruk`) ve grup başlığı (`th[scope="colgroup"]` taşıyan
       satır). Bunları saymak dişi EN OLASI canlı hâlinde kör ediyordu:
       `bosCumle={null}` geçen beş çağıranın BEŞİ DE `kuyruk={…}`
       kalıbında; süzgeç tabloyu boşalttığında sıfır veri satırı + bir
       kuyruk satırı kalıyor, `sayi > 0` diye eleniyor ve ne işaret ne
       cümle aranıyordu. */
    const veriSatiri = (t) => {
      const govde = t.tBodies && t.tBodies.length ? t.tBodies[0] : t;
      let n = 0;
      for (const tr of govde.querySelectorAll('tr')) {
        if (tr.closest('thead')) continue;
        if (tr.classList.contains('kuyruk')) continue;
        if (tr.querySelector('th[scope="colgroup"]')) continue;
        n += 1;
      }
      return n;
    };
    /* ── `gorunur` BURADA KULLANILAMAZ (ölçülmüş kusur) ──────────────
       İlk yazım `gorunur(dugum)` istiyordu ve diş POPÜLASYONU SIFIRA
       düşürüyordu: SIFIR SATIRLI bir listenin YÜKSEKLİĞİ SIFIRDIR, yani
       aradığı şeyin tanımı gereği eleniyordu. Diş "0 kusur" diyordu ve
       hiçbir şeye bakmamıştı — bu turun kovaladığı kusurun ta kendisi,
       bu kez kendi dişimde. Burada yalnız GİZLENMİŞ olma sorulur. */
    /* ── ATALARIN HESAPLANAN BİÇİMİ DE SORULUR (Codex · P2) ─────────
       `getComputedStyle(el)` yalnız DÜĞÜMÜN KENDİ `display`ini söyler:
       CSS ile gizlenmiş bir ATA (kapalı `details`, gizleyen bir sınıf)
       altındaki boş yüzey GÖRÜNÜR sayılıyordu — ama aynı atanın
       altındaki CÜMLESİ `gorunur()` süzgecinden düşüyordu. Yani kapı,
       kullanıcının hiç görmediği bir yüzey için YANLIŞ bir kusur
       raporlayabilirdi. Ata zinciri yürünür. */
    const gizli = (el) => {
      if (!el.isConnected) return true;
      if (el.closest('[hidden], [aria-hidden="true"]')) return true;
      for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
        const st = getComputedStyle(a);
        if (st.display === 'none' || st.visibility === 'hidden') return true;
      }
      return false;
    };
    /* ── ÜRÜNÜN BEYAN ETTİĞİ BOŞ VERİ YÜZEYİ ─────────────────────────
       Paylaşılan tablo sıfır satırda HİÇBİR ŞEY çizmiyor; ortada bir
       `<table>` bile olmadığı için aşağıdaki tarama onu göremez.
       Bileşen bu yüzden görünmez bir işaret basıyor
       (`[data-bos-yuzey]`) ve tanık sözleşmeyi buradan okur. */
    const bosYuzeyler = [];
    for (const isaret of document.querySelectorAll('[data-bos-yuzey]')) {
      /* ── İŞARETİN KENDİ `aria-hidden`I ONU ELEMEZ (Codex · P1) ────
         Önceki düzeltme "gizli bir sekme panelindeki işaret cümle talep
         etmez" diye `gizli(isaret)` koydu. Ama işaretin KENDİSİ
         `aria-hidden="true"` taşıyor ve `closest()` elemanın kendisini
         de sayar: HER işaret eleniyordu, yani işaret yolu hiç
         çalışmıyordu. Düzeltmenin kendisi dişi öldürmüştü. Bugün
         yalnız ATANIN gizliliği sorulur. */
      if (gizli(isaret.parentElement ?? isaret)) continue;
      cikan.veriYuzeyi += 1;
      cikan.bosYuzeySayisi += 1;
      const kapsam = isaret.closest(BOLUM) || isaret.parentElement;
      if (!kapsam) continue;
      bosYuzeyler.push({
        kapsam,
        etiket: isaret.getAttribute('data-bos-yuzey'),
        baslik: (kapsam.innerText || kapsam.textContent || '')
          .replace(/\s+/g, ' ').trim().slice(0, 80),
      });
    }
    for (const dugum of document.querySelectorAll('table, ul, ol')) {
      if (gizli(dugum) || YUKLENIYOR(dugum)) continue;
      /* İç içe liste/tablo iki kez sayılmasın: en dıştaki boş olan alınır. */
      if (dugum.parentElement && dugum.parentElement.closest('table, ul, ol')) continue;
      /* Sayım İÇ İÇE ELEMEDEN SONRA (P2-1): taranmayan düğüm tabanı
         beslememeli. */
      cikan.veriYuzeyi += 1;
      const sayi = dugum.tagName === 'TABLE'
        ? veriSatiri(dugum)
        : dugum.querySelectorAll(':scope > li').length;
      if (sayi > 0) continue;
      const kapsam = dugum.closest(BOLUM) || dugum.parentElement;
      if (!kapsam) continue;
      cikan.bosYuzeySayisi += 1;   /* POPÜLASYON: kaç sıfır satırlı düğüme bakıldı */
      bosYuzeyler.push({
        kapsam,
        etiket: dugum.tagName.toLowerCase(),
        baslik: (dugum.querySelector('thead') ? dugum.querySelector('thead').innerText : '')
          .replace(/\s+/g, ' ').trim().slice(0, 80),
      });
    }
    /* ── KAPSAM BAŞINA YARGI ─────────────────────────────────────────
       Yüzeyler önce TOPLANDI; karar burada, kapsam kapsam veriliyor.
       Kapsamdaki görünür cümle sayısı kadar yüzey aklanır, GERİSİ
       cümlesizdir. Hangi yüzeyin aklandığı sorusu sorulmaz — soru
       "bu bölümde her boş yüzeye bir cümle düşüyor mu"dur. */
    const kapsamlar = new Map();
    for (const y of bosYuzeyler) {
      if (!kapsamlar.has(y.kapsam)) kapsamlar.set(y.kapsam, []);
      kapsamlar.get(y.kapsam).push(y);
    }
    for (const [kapsam, liste] of kapsamlar) {
      for (const y of liste.slice(cumleSayisi(kapsam))) {
        cikan.cumlesiz.push({
          etiket: y.etiket,
          kapsam: (kapsam.getAttribute('class') || kapsam.tagName).slice(0, 60),
          baslik: y.baslik,
        });
      }
    }
    /* ── "İKİNCİ ŞEKİL" TARAMASI KALDIRILDI (bağımsız inceleme · P2-2) ─
       Görünür ama metinsiz yaprak bölümleri sayan bir tarama yazılmıştı;
       hesaplanıyor, konsola basılıyor, KÜTÜĞE YAZILMIYOR ve hiçbir vaka
       okumuyordu — yani hiçbir girdide kırmızı yanamayan ölü bir ölçüm.
       Üstelik `gorunur()` kullanıyordu: bu dosyanın kendi uyarısının
       tersi (boş bir bölümün yüksekliği de sıfırdır), yani aradığı şeyi
       tanımı gereği eliyordu. Tablonun hiç render edilmediği hâli zaten
       ürünün BEYAN ETTİĞİ işaret yakalıyor. */
    return cikan;
  }, { taban: CUMLE_TABANI, tavan: CUMLE_TAVANI });
}

/* ══ DİŞİN POZİTİF KONTROLÜ (Codex · P2) ═══════════════════════════════
   Ürün bugün SIFIR SATIRLI hiçbir veri yüzeyi çizmiyor: her ekran
   tablodan ÖNCE kendi boş durumunu basıyor. Popülasyon bu yüzden meşru
   olarak 0 — ama SIFIR popülasyonlu bir diş, TAMAMEN BOZUKKEN de
   "0 kusur" der ve ikisi dışarıdan AYNI görünür. `veriYuzeyi` tabanı
   bunu savunamaz: o sayı DOLU tablo/listeleri de sayar, yani sıfır
   satırlı yol hiç yürünmese bile yerinde kalır (ölçüldü, S-M2).

   Bugün toplayıcı, ürünün DIŞINDA, bilinen bir sentetik sayfada da
   koşar: cümlesi OLAN bir yüzey (aklanmalı), cümlesi OLMAYAN bir yüzey
   (yakalanmalı) ve cümlesiz bir İŞARET (yakalanmalı). Beklenen sayılar
   kütüğe yazılır, bekçi birebir tutar. Toplayıcının herhangi bir yolu
   körleşirse bu sayılar düşer ve kapı KIRMIZI yanar — ürün hiç
   değişmeden. Fikstür ÜRÜNE girmez; yalnız tanığın belleğindedir.

   ── DÖRDÜNCÜ KART: YÜKSEKLİK EKSENİ (S-M10 · YAKMAYAN sabotaj) ──────
   İlk fikstürde üç kart vardı ve boş yüzeylerin ikisi de `<thead>`
   taşıyan bir tabloydu — yani YÜKSEKLİĞİ SIFIR DEĞİLDİ. Sabotaj turunda
   sıfır satırlı yol için `gorunur()` koşulu geri kondu (dişin ilk
   ölçülmüş körlüğü) ve pozitif kontrol KIRMIZI YANMADI: fikstür tam da
   o ekseni hiç sınamıyordu. Bu bir BULGUDUR ve fikstürün kusuruydu.
   Dördüncü kart cümlesiz ve BOŞ bir `<ul>` taşır; boş bir listenin
   yüksekliği tanımı gereği sıfırdır, yani körlüğün ESKİ hâli bu kartı
   anında düşürür ve kontrol kırmızı yanar. */
const OZ_DENETIM_HTML = `<main>
  <div class="ab-kart">
    <div class="ab-blok"><span class="etiket">Boş · ilk kurulum</span>
      <p class="cumle">Kapsamınızda kayıt yok; ilk kaydı yönetim tezgâhında açarsınız.</p></div>
    <table><thead><tr><th>Ad</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="ab-kart">
    <table><thead><tr><th>Ad</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="ab-kart"><span data-bos-yuzey="tablo" aria-hidden="true"></span></div>
  <div class="ab-kart"><ul></ul></div>
</main>`;

async function ozDenetim(baglam) {
  const sayfa = await baglam.newPage();
  try {
    await sayfa.setContent(OZ_DENETIM_HTML, { waitUntil: 'load' });
    const { cumlesiz, bosYuzeySayisi, veriYuzeyi } = await sayfaTopla(sayfa);
    return { veriYuzeyi, bosYuzey: bosYuzeySayisi, cumlesiz: cumlesiz.length };
  } finally {
    await sayfa.close();
  }
}

/** Gezilecek rota kümesi — envanterden TÜRETİLİR, elle liste yok. */
/* ── ATLANAN ROTA SESSİZ DÜŞMEZ (düzeltme turu · tur 2 · P3-10) ──────
   Eski yazımda iki `continue` vardı ve birinin yorumu "atlanır, SAYILIR"
   diyordu — ama sayılmıyordu: rota `atlanan`a hiç girmiyor, kütükte iz
   bırakmıyordu. Bekçi de `atlanan` listesinin BOŞ olmasını istiyordu,
   yani tanık rota kaybettikçe kapı daha da mutlu oluyordu. Tanığın
   göremediği yer, ayrışmanın göremediği yerdir: körlük sıfır kusura
   dönüşüyordu.

   Bugün atlama İŞARETLİ: sebebiyle `atlanan`a girer ve bekçi sebebin
   BİLİNEN bir sınıftan olmasını ve sayının tavan altında kalmasını
   ister. Atlamanın kendisi meşru olabilir; SESSİZ olması olamaz. */
function rotalar(atlananListesi) {
  const liste = [];
  for (const s of sayfaEnvanteri()) {
    if (s.dinamik.length === 0) { liste.push(s.rota); continue; }
    if (s.dinamik.length > 1) {
      atlananListesi.push({ rota: s.rota, sebep: 'cok-parametreli' });
      continue;
    }
    const kalip = s.rota;
    const t = tohumDegeri(kalip);
    if (t.hata || !t.degerler?.length) {
      atlananListesi.push({ rota: kalip, sebep: `tohum-degeri-yok: ${t.hata ?? 'boş'}` });
      continue;
    }
    liste.push(kalip.replace(/\[[^\]]+\]/, t.degerler[0]));
  }
  return [...new Set(liste)].sort();
}

const BOS_KOSUM = process.argv.includes('--bos');

/* ── BOŞ KURULUM FİKSTÜRÜ ─────────────────────────────────────────────
   Göç zinciri + TEK kurucu hesap. Tohum YOK: ölçülmek istenen hâl tam
   olarak "müşterinin birinci günü". Kurucu, ürünün KENDİ aracıyla
   açılır — buraya ikinci bir hesap açma yolu yazmak, o aracın
   "kurulumda bir kullanıcı varsa hiçbir şey yazma" korumasını kapının
   içinden delmek olurdu. */
const BOS_GIRIS = { eposta: 'kurgusal.kurucu@bos.local', parola: 'BosKurulumKurgusalParola-2026' };
let bosDbYolu = null;
let bosSunucu = null;
/* ── KISMÎ FİKSTÜR DE SİLİNİR (Codex · P2) ───────────────────────────
   Dizin `bosKurulumKur()` DÖNMEDEN önce oluşuyor; kurulum (göç, kurucu
   hesap, sunucu) ortada atarsa `fikstur` null kalıyor ve temizlik
   dizini `f`den türettiği için onu HİÇ silmiyordu — üstelik hemen
   ardından "veritabanı SİLİNMEDİ" diye atıp ASIL hatayı maskeliyordu.
   Dizin bugün modül düzeyinde tutulur: yarım kurulum da temizlenir. */
let bosDizin = null;
let ozDenetimSonucu = null;
/* Boş kurulum öncülü — kütüğe yazılır ve bekçi okur (P1-3). */
const ONCUL = { kullanici: null, tesis: null, madde: null, sunucuOturum: null };

async function bosKurulumKur() {
  const { mkdtempSync, mkdirSync, rmSync } = await import('node:fs');
  const { execFileSync, spawn } = await import('node:child_process');
  /* ── ÇALIŞMA DİZİNİ DEPO İÇİNDE ─────────────────────────────────────
     Ölçüldü: `os.tmpdir()` altına yazılan `prisma.config.ts` "Failed to
     load config file … as a TypeScript/JavaScript module" ile düştü —
     `prisma/config` içe aktarımı orada çözülemiyor (yukarı doğru
     `node_modules` yok). Boş kurulum duman kapısı da bu yüzden
     `.parti/` altında çalışıyor. */
  const yuva = path.join(WEB, '.parti');
  mkdirSync(yuva, { recursive: true });
  const dizin = mkdtempSync(path.join(yuva, 'dom-tanik-bos-'));
  bosDizin = dizin;
  bosDbYolu = path.join(dizin, 'bos.db');
  const url = `file:${bosDbYolu}`;
  /* ── GÖÇ HEDEFİ `DATABASE_URL` DEĞİL, AYAR DOSYASIDIR ─────────────
     Ölçüldü: `prisma.config.ts` veri kaynağını SABİT yazıyor
     (`file:prisma/dev.db`), yani `DATABASE_URL` ile başka bir dosyaya
     göç edilemiyor — komut "No pending migrations" deyip GEÇİYOR ve
     ardından kurucu adımı "table Kullanici does not exist" ile
     düşüyordu. Sessizce yanlış veritabanına bakan bir kurulum, bu
     kapının ölçmek istediği şeyi baştan kaybettirirdi.
     Kalıp boş kurulum duman kapısından alındı (`tests/
     bos-kurulum-duman.test.ts`): koşuma özel bir ayar dosyası yazılır. */
  const ayar = path.join(dizin, 'prisma.config.ts');
  writeFileSync(ayar, [
    "import { defineConfig } from 'prisma/config';",
    'export default defineConfig({',
    `  schema: ${JSON.stringify(path.join(WEB, 'prisma', 'schema.prisma'))},`,
    `  migrations: { path: ${JSON.stringify(path.join(WEB, 'prisma', 'migrations'))} },`,
    `  datasource: { url: ${JSON.stringify(url)} },`,
    '});',
    '',
  ].join('\n'));
  execFileSync(path.join(WEB, 'node_modules', '.bin', 'prisma'),
    ['migrate', 'deploy', '--config', ayar],
    { cwd: WEB, stdio: 'pipe', env: { ...process.env, BROWSER: 'none' } });
  /* Kurucu hesap: ürünün KENDİ aracı, BELGELENMİŞ komut satırından —
     modülü içe aktarmak değil. İki sebep: (1) `docs/KURULUM.md`'nin
     müşteri mühendisine yazdırdığı yolun ta kendisi budur, yani kapı
     ürünün gerçek kurulum yolunu sürer; (2) parola yalnız stdin'den
     geçer, `ps` çıktısına düşmez — aracın kendi kuralı. */
  execFileSync('npx', ['tsx', 'arac/kurucu-hesap.ts',
    `--eposta=${BOS_GIRIS.eposta}`, '--ad=Kurgusal Kurucu'],
  { cwd: WEB, env: { ...process.env, DATABASE_URL: url },
    input: BOS_GIRIS.parola, stdio: ['pipe', 'pipe', 'pipe'] });

  /* ── "VERİTABANI BOŞ" ÖNCÜLÜ ÖLÇÜLÜR (bağımsız inceleme · P1-3) ────
     Koşumun BÜTÜN anlamı "veri yok" hâli; ama hiçbir adım bunu
     doğrulamıyordu. `lib/db.ts` `DATABASE_URL` yoksa TOHUMLU
     `prisma/dev.db`ye düşer — env aktarımı bir gün bozulursa koşum
     tohumlu veriyi ölçer, tablolar dolu olur ve cümlesiz yüzey DOĞASI
     GEREĞİ 0 çıkar. Bu, bu dosyanın kendi yazdığı cümlenin gerçekleşmiş
     hâli olurdu. Öncül artık ölçülüyor ve kütüğe YAZILIYOR. */
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(bosDbYolu, { readonly: true });
  const say = (t) => db.prepare(`select count(*) c from "${t}"`).get().c;
  ONCUL.kullanici = say('Kullanici');
  ONCUL.tesis = say('Tesis');
  ONCUL.madde = say('Madde');
  db.close();
  if (ONCUL.kullanici !== 1 || ONCUL.tesis !== 0 || ONCUL.madde !== 0) {
    throw new Error('BOŞ KURULUM ÖNCÜLÜ TUTMADI: '
      + `Kullanici ${ONCUL.kullanici} (1 bekleniyor) · Tesis ${ONCUL.tesis} (0) · `
      + `Madde ${ONCUL.madde} (0). Tanık TOHUMLU bir veritabanını ölçüyor olabilir.`);
  }
  /* ── ÖNCÜLÜN İKİNCİ TANIĞI: GİRİŞİN KENDİSİ (Codex · P2) ──────────
     Yukarıdaki sayım DOSYAYI okur, sunucuyu değil: çocuk süreç
     `DATABASE_URL`i yitirip TOHUMLU `dev.db`ye düşerse fikstür dosyası
     yine boştur ve öncül "tuttu" der.

     İkinci tanık zaten yolun içinde: fikstürün kurucu hesabı
     (`kurgusal.kurucu@bos.local`) YALNIZ bu veritabanında var. Sunucu
     başka bir veritabanı okusaydı o kimlikle giriş BAŞARISIZ olurdu.
     Giriş sonucu artık kütüğe yazılıyor ve bekçi onu okuyor — yani
     "sunucu fikstürü okuyor" bir varsayım değil, ölçülmüş bir sonuç. */
  /* ── ÖNCE PORT BOŞ MU (bağımsız inceleme · P1-2) ──────────────────
     Tek kontrol "3211 yanıt veriyor mu" idi. O portta BAŞKA bir süreç
     dinliyorsa (önceki koşumun zombisi, paralel bir iş, geliştiricinin
     TOHUMLU sunucusu) `next start` EADDRINUSE ile ölür, `fetch` yabancı
     sunucudan 200 alır ve tanık BAŞKA BİR KURULUMU "boş kurulum" diye
     ölçer — tohumlu bir sunucuya rastlarsa cümlesiz yüzey doğal olarak
     0 çıkar ve kapı YANLIŞ SEBEPLE yeşil yanar. */
  /* ── PORT ÇAKIŞMASI (Codex · P2) ───────────────────────────────────
     `BOS_PORT` sabit 3211 varsayıyordu; `PORT=3211 npm run kapi:parti`
     koşulduğunda parti kendi paylaşılan sunucusunu 3211'e kuruyor ve bu
     adım "PORT ZATEN DOLU" diyerek yerel kapanışı imkânsız kılıyordu.
     Varsayılan artık PAYLAŞILAN porttan TÜRETİLİR. */
  const paylasilan = Number(process.env.PORT ?? 3210);
  const port = Number(process.env.BOS_PORT ?? (paylasilan + 1 === paylasilan
    ? 3211 : paylasilan + 1));
  const kok = `http://127.0.0.1:${port}`;
  try {
    await fetch(`${kok}/giris`, { signal: AbortSignal.timeout(1500) });
    throw new Error(`PORT ${port} ZATEN DOLU: boş kurulum sunucusu kurulamaz. `
      + 'Orada dinleyen süreci durdurun — tanık başka bir kurulumu ölçmemeli.');
  } catch (e) {
    if (String(e.message).startsWith('PORT ')) throw e;   /* bizim attığımız */
  }
  bosSunucu = spawn('npx', ['next', 'start', '-p', String(port)], {
    cwd: WEB, env: { ...process.env, DATABASE_URL: url, PORT: String(port) },
    stdio: 'pipe', detached: true,
  });
  /* Süreç ÖLDÜYSE bekleme döngüsü boşuna dönmesin. */
  let sunucuOldu = null;
  bosSunucu.on('exit', (kod) => { sunucuOldu = kod; });
  bosSunucu.on('error', (hata) => { sunucuOldu = hata.message; });
  for (let i = 0; i < 60; i += 1) {
    if (sunucuOldu !== null) {
      throw new Error(`boş kurulum sunucusu ÖLDÜ (${sunucuOldu}) — `
        + 'port çakışması ya da derleme çıktısı eksik olabilir');
    }
    try {
      const y = await fetch(`${kok}/giris`, { signal: AbortSignal.timeout(2000) });
      if (y.ok) return { kok, dizin, rmSync, port };
    } catch { /* henüz kalkmadı */ }
    await new Promise((r) => { setTimeout(r, 1000); });
  }
  throw new Error(`boş kurulum sunucusu ${port} portunda kalkmadı`);
}

/* ── TEMİZLİK TEK YERDE ve SON KOŞULUNU DOĞRULAR ─────────────────────
   ZAMAN AŞIMI "KAPANDI" DEĞİLDİR (bağımsız inceleme · P3-2): ilk yazım
   `fetch(..., timeout(1000))` atınca `kapandi = true` diyordu — YAVAŞ
   ama AYAKTA bir sunucu `AbortError` atar ve temizlik "doğrulandı"
   sayılırdı. Bugün yalnız BAĞLANTI REDDİ kapanma sayılır; zaman aşımı
   tekrar denenir ve süre dolarsa KIRMIZIDIR. */
async function bosTemizle(f) {
  const { existsSync, rmSync } = await import('node:fs');
  if (bosSunucu && bosSunucu.pid) {
    try { process.kill(-bosSunucu.pid, 'SIGTERM'); } catch { /* zaten gitti */ }
  }
  if (f) {
    let kapandi = false;
    for (let i = 0; i < 30; i += 1) {
      try {
        await fetch(`${f.kok}/giris`, { signal: AbortSignal.timeout(1000) });
      } catch (e) {
        /* `AbortError` = zaman aşımı → sunucu AYAKTA olabilir, sayma. */
        if (e.name !== 'AbortError' && e.name !== 'TimeoutError') { kapandi = true; break; }
      }
      await new Promise((r) => { setTimeout(r, 500); });
    }
    if (!kapandi) throw new Error(`boş kurulum sunucusu KAPANMADI: ${f.kok} `
      + '(bağlantı reddi görülmedi — süreç hâlâ dinliyor olabilir)');
  }
  const dizin = (f && f.dizin) || bosDizin;
  if (dizin && existsSync(dizin)) rmSync(dizin, { recursive: true, force: true });
  if (bosDbYolu && existsSync(bosDbYolu)) {
    throw new Error(`boş kurulum veritabanı SİLİNMEDİ: ${bosDbYolu}`);
  }
}

const atlanan = [];
const cumlesizYuzeyler = [];   // sıfır satırlı ama cümlesiz tablo/liste
let bosYuzeyPopulasyonu = 0;   // BAKILAN sıfır satırlı düğüm sayısı
let veriYuzeyiPopulasyonu = 0; // TARANAN tablo/liste sayısı (taban)
const ROTALAR = rotalar(atlanan);
const politikaAdaylari = new Map();   // metin → [rota]
const bosDurumlar = new Map();        // metin → { rotalar, sinif, eylem } · EN KÖTÜ hâl

/* Boş koşumda kök ve kimlik FİKSTÜRDEN gelir; tohumlu koşumda aynen
   eski davranış. */
/* ── KURULUM ATARSA DA TEMİZLİK KOŞAR (bağımsız inceleme · P3-1) ─────
   Fikstür `try` bloğunun DIŞINDA kuruluyordu: göç/kurucu/sunucu
   adımlarından biri atarsa çalışma dizini ve — spawn edildiyse —
   sunucu süreci kalıyordu. Bir sonraki koşumun port çakışması tam
   buradan doğar. */
/* ── TARAYICI DA AYNI TEMİZLİK YOLUNDAN GEÇER (Codex · P2) ───────────
   Fikstür `try` içine alınmıştı ama `chromium.launch()` ARADA
   kalıyordu: tarayıcı yoksa ya da başlatma atarsa fikstür kurulmuş,
   sunucu ayağa kalkmış oluyor ve HİÇBİR temizlik koşmuyordu — bir
   sonraki yerel koşum dolu portla karşılaşıyordu. İkisi de tek
   `try`'da. */
let fikstur = null;
let browser = null;
try {
  fikstur = BOS_KOSUM ? await bosKurulumKur() : null;
  browser = await chromium.launch({
    executablePath: tarayiciYolu(), headless: true, args: ['--no-sandbox'],
  });
} catch (hata) {
  if (browser) await browser.close();
  await bosTemizle(fikstur);
  throw hata;
}
const SUNUCU = fikstur ? fikstur.kok : KOK;
const OTURUM = BOS_KOSUM ? BOS_GIRIS : undefined;

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const oturumAcildi = await girisYap(page, SUNUCU, OTURUM);
  if (BOS_KOSUM) {
    ONCUL.sunucuOturum = oturumAcildi === true;
    if (!ONCUL.sunucuOturum) {
      throw new Error('BOŞ KURULUM SUNUCUSU FİKSTÜRÜ OKUMUYOR: kurucu hesabıyla '
        + 'giriş açılamadı. Sunucu başka bir veritabanına (tohumlu dev.db) '
        + 'düşmüş olabilir.');
    }
  }
  for (const rota of ROTALAR) {
    try {
      const yanit = await page.goto(`${SUNUCU}${rota}`, { waitUntil: 'networkidle', timeout: 30_000 });
      if (!yanit || yanit.status() >= 400) { atlanan.push({ rota, sebep: `HTTP ${yanit?.status() ?? '—'}` }); continue; }
      const { politika, bos, cumlesiz, bosYuzeySayisi, veriYuzeyi } = await sayfaTopla(page);
      veriYuzeyiPopulasyonu += veriYuzeyi;
      for (const c of cumlesiz) cumlesizYuzeyler.push({ rota, ...c });
      bosYuzeyPopulasyonu += bosYuzeySayisi;
      for (const m of politika) {
        if (!politikaMi(m)) continue;
        const k = duz(m);
        if (!politikaAdaylari.has(k)) politikaAdaylari.set(k, []);
        if (!politikaAdaylari.get(k).includes(rota)) politikaAdaylari.get(k).push(rota);
      }
      for (const b of bos) {
        /* ── İLK GELEN DEĞİL, EN KÖTÜ HÂL KAZANIR (P3-11) ────────────
           Eski yazım `if (!bosDurumlar.has(k))` diyordu: aynı metin iki
           ekranda görünüyorsa yalnız İLKİNİN öznitelikleri saklanıyordu.
           Birinci ekranda eylem varsa, ikincideki EYLEMSİZ hâl kütüğe
           hiç girmiyordu — ve cırcırın tuttuğu sayı tam olarak
           "eylemsiz 0"dı. İlk gelenin kazandığı bir ölçüm, ölçtüğü
           kusuru saklar. */
        const k = duz(b.metin);
        const varolan = bosDurumlar.get(k);
        if (!varolan) {
          bosDurumlar.set(k, {
            rotalar: [rota], tur: b.tur, sinif: b.sinif, iyiHaber: b.iyiHaber, eylem: b.eylem });
          continue;
        }
        if (!varolan.rotalar.includes(rota)) varolan.rotalar.push(rota);
        varolan.eylem = varolan.eylem && b.eylem;          // eylemsiz hâl kazanır
        varolan.iyiHaber = varolan.iyiHaber && b.iyiHaber; // muafiyet DARALIR
      }
    } catch (e) { atlanan.push({ rota, sebep: e.message.slice(0, 120) }); }
  }
  ozDenetimSonucu = await ozDenetim(context);
  await context.close();
} finally {
  await browser.close();
  /* TEMİZLİK SON KOŞULUNU DOĞRULAR: "durdurdum · sildim" diyen adım
     dediğini yaptığını ÖLÇER. Öldüren sinyal, doğrulayan `fetch` —
     tek araca bakan kontrol, o araç yoksa kandırılır. */
  if (fikstur) await bosTemizle(fikstur);
}

const kutuk = {
  uretilme: new Date().toISOString(),
  rota: ROTALAR,
  atlanan,
  politikaAdaylari: [...politikaAdaylari.entries()]
    .map(([cumle, rotalar]) => ({ cumle, rotalar })).sort((a, b) => a.cumle.localeCompare(b.cumle)),
  bosDurumlar: [...bosDurumlar.entries()]
    .map(([metin, d]) => ({ metin, ...d })).sort((a, b) => a.metin.localeCompare(b.metin)),
  /* DİŞİN POPÜLASYONU İKİ SAYIDIR ve İKİSİ DE YAZILIR (bağımsız
     inceleme · P2-1). İlk yazımda `veriYuzeyi` tek başına taban
     tutuyordu; oysa o TARANAN yüzey sayısıdır — bütün tablolar dolsa
     (yani diş hiçbir boş yüzeye BAKMASA) gezinme listeleri sayesinde
     yerinde kalır ve kapı "0 kusur" diyerek geçerdi. `bosYuzeySayisi`
     dişin GERÇEK popülasyonudur: kaç sıfır satırlı yüzeye bakıldı. */
  veriYuzeyi: veriYuzeyiPopulasyonu,
  bosYuzeySayisi: bosYuzeyPopulasyonu,
  /* Boş kurulum öncülü — bekçi bunu okur (P1-3). */
  oncul: BOS_KOSUM ? { ...ONCUL } : null,
  /* Sıfır satırlı ama kapsamında CÜMLE OLMAYAN yüzeyler (Brief M · FAZ 1). */
  cumlesizYuzeyler: cumlesizYuzeyler
    .sort((a, b) => `${a.rota}${a.baslik}`.localeCompare(`${b.rota}${b.baslik}`)),
  /* Dişin POZİTİF KONTROLÜ — ürünün dışında, bilinen bir sayfada. */
  ozDenetim: ozDenetimSonucu,
};

console.log(`DOM tanığı${BOS_KOSUM ? ' · BOŞ KURULUM' : ''}: ${ROTALAR.length} rota gezildi · atlanan ${atlanan.length}`);
console.log(`  politika adayı: ${kutuk.politikaAdaylari.length}`);
console.log(`  boş durum: ${kutuk.bosDurumlar.length}`);
console.log(`  taranan veri yüzeyi (tablo/liste): ${veriYuzeyiPopulasyonu}`);
console.log(`  sıfır satırlı düğüm: ${bosYuzeyPopulasyonu}`);
console.log(`  CÜMLESİZ boş yüzey: ${kutuk.cumlesizYuzeyler.length}`);
console.log('  öz denetim (sentetik sayfa · dişin pozitif kontrolü): '
  + `taranan ${ozDenetimSonucu?.veriYuzeyi ?? '—'} · sıfır satırlı `
  + `${ozDenetimSonucu?.bosYuzey ?? '—'} · cümlesiz ${ozDenetimSonucu?.cumlesiz ?? '—'}`);
for (const c of kutuk.cumlesizYuzeyler) {
  console.log(`    ${c.rota} · <${c.etiket}> · kapsam "${c.kapsam}" · başlık "${c.baslik}"`);
}
for (const a of atlanan) console.log(`  atlandı ${a.rota} — ${a.sebep}`);

/* ── ÖLÇÜM TABANI · `olcum-tabani.json` (düzeltme turu · tur 2 · P2-3) ──
   Sıfır rota gezen bir tanık sıfır ayrışma bulur; ama sabit `30`
   ARACIN İÇİNE yazılıydı ve tanık 65 rota geziyordu — otuz beş rota
   kaybedilse araç yine "yeterli" diyordu. Kendi kütüğünü yazan araç
   tabanını da yazar: taban ancak `--taban-yaz --sebep="..."` ile ve
   gerekçesi DOSYAYA işlenerek iner. */
const TANIK_TABANLARI = [
  ['tanik.rota', ROTALAR.length],
  ['tanik.cumle', kutuk.politikaAdaylari.length],
  ['tanik.bosDurum', kutuk.bosDurumlar.length],
];
if (BOS_KOSUM) {
  /* Boş koşum tanık TABANLARINI yazmaz ve doğrulamaz: gezdiği rota
     kümesi aynı, ama gördüğü cümle/boş durum sayısı DOĞASI GEREĞİ
     farklıdır (veri yok). O tabanlar tohumlu koşumun ölçüsüdür;
     buradan yazmak ikisini karıştırırdı. */
} else if (process.argv.includes('--taban-yaz')) {
  for (const [anahtar, olculen] of TANIK_TABANLARI) {
    const { onceki, yeni } = tabanYaz(anahtar, olculen, { sebep: sebepBayragi(process.argv) });
    console.log(`taban yazıldı: ${anahtar} ${onceki ?? '—'} → ${yeni}`);
  }
} else {
  for (const [anahtar, olculen] of TANIK_TABANLARI) tabanDogrula(anahtar, olculen);
}

if (process.argv.includes('--yaz')) {
  const hedef = BOS_KOSUM ? CIKTI_BOS : CIKTI;
  writeFileSync(hedef, `${JSON.stringify(kutuk, null, 2)}\n`);
  console.log(`güncellendi: ${path.relative(WEB, hedef)}`);
}
