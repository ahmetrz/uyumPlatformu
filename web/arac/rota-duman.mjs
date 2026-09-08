import { chromium } from 'playwright-core';
import { tabanDogrula, tabanYaz } from './olcum-tabani.mjs';
import { yonlendirmeKarari } from './rota-kurallari.mjs';
import { girisYap, sayfaEnvanteri, tarayiciYolu, tohumDegeri } from './kosu-ortak.mjs';

/* Rota duman testi — KAPSAM DOSYA SİSTEMİNDEN TÜRER.

   ── Kapatılan kusur ───────────────────────────────────────────────────
   Bu araç ELLE YAZILMIŞ iki liste taşıyordu ve "31/31 geçti" yazıyordu.
   `next build` ise 40 rota üretiyordu. Dokuz rota hiç yoklanmıyordu ve
   çıktı bunu SÖYLEMİYORDU: okuyan "hepsi geçti" sanıyordu. Elle liste,
   ekran eklendiği gün sessizce eksilir; eksildiğini de kimse görmez.

   Kapsam artık `app` altındaki her `page.tsx` taramasından gelir. Yeni bir ekran
   eklendiği anda listeye kendiliğinden girer; yoklanamıyorsa çıktı
   NEDENİNİ yazar. "Geçti" ile "bakılmadı" bir daha karışmaz.

   ── Dinamik rotalar ───────────────────────────────────────────────────
   `[id]` / `[cerceve]` taşıyan rotalar için URL, TOHUM VERİTABANINDAKİ
   GERÇEK KAYITLARDAN üretilir (`prisma/dev.db`). Uydurma id ile 200
   üretmeye çalışmak yanlış güven verir: sayfa `notFound()` döndürürse
   404, dönmezse de gerçekte var olmayan bir kaydı gösteriyor demektir.
   Tohum kaydı yoksa rota "TEST EDİLEMEDİ · tohumda kayıt yok" diye
   raporlanır ve kapsam sayısına GEÇTİ olarak yazılmaz.

   ── Kabuk grameri ─────────────────────────────────────────────────────
   Araç bir dönem önceki arayüz katmanının ray seçicilerine
   bakıyordu; kabuk üç yöne bölününce o seçiciler DOM'dan kalktı ve
   otuz yedi rota "ray yok" diye yanlış kusurlandı. Ölçüm artık güncel
   gramerle yapılır (bkz. components/kabuk/Kabuk.tsx · app/kabuk.css):
     · kök `.ab[data-yogunluk]`  → hangi kabuk (a tezgâh · b saha · c defter)
     · A: `.ab-a-ray`       · B: `.ab-b-ust nav[aria-label="Saha"]`
     · C: `.ab-c-nav`       · aktif öğe: `[aria-current="page"]` (TEK)
     · her ekran TEK `<main>` çizer (kabuk çizmez) — atla bağının varışı
     · C dizin sütunu konumu `[aria-current="true"]` ile işaretler.

   Kullanım:
     PORT=3111 node arac/rota-duman.mjs
     PORT=3111 node arac/rota-duman.mjs --json    → makine okunur özet
     npm run rota:duman
*/

const KOK = `http://localhost:${process.env.PORT || 3111}`;
const JSON_CIKTI = process.argv.includes('--json');

/* ── 1. Rota envanteri ─────────────────────────────────────────────── */

/* `rotaEnvanteri` `kosu-ortak.mjs`e TAŞINDI: oturumsuz liste çapraz
   kontrolü de aynı envanteri istiyor ve iki kopya birbirinden
   uzaklaşırdı. Burada yalnız çağrılır (`sayfaEnvanteri`). */
const rotaEnvanteri = sayfaEnvanteri;

/* ── 2. Dinamik segmentlerin gerçek değerleri ──────────────────────── */

/* Eşleme ve tohum okuması `kosu-ortak.mjs` içindedir: aynı liste
   tarayıcılı kapılarda da gerekiyor ve iki kopya birbirinden uzaklaşırdı
   (o modülün var oluş gerekçesi). Burada yalnız çağrılır. */

/** Dinamik rotayı gerçek değerle somutlaştırır. */
function somutlastir(giris) {
  if (giris.dinamik.length === 0) return { url: giris.rota };
  if (giris.dinamik.length > 1) return { hata: 'çok parametreli rota — eşleme tanımlı değil' };
  const t = tohumDegeri(giris.rota);
  if (t.hata) return { hata: t.hata };
  /* Duman testi rotanın ÇİZİLDİĞİNİ yoklar; bir örnek yeter. İçeriğe
     bağlı kusuru arayan tarayıcılı kapılar varyantların hepsini tarar
     (`dinamikRotalar`). */
  const deger = t.degerler[0];
  return {
    url: giris.rota.replace(/\[[^\]]+\]/, encodeURIComponent(deger)),
    not: `${t.kaynak}=${deger.slice(0, 12)}…`,
  };
}

/* ── 3. Beklentiler ────────────────────────────────────────────────── */

/* Kabuk: `(kabuk)` ve `(tam)` gruplarındaki her ekran `.ab[data-yogunluk]`
   kabuğunu taşır (`app/(tam)/layout.tsx` de Kabuk'u sarar; `/portfoy` B
   yüzeyine düşer ve saha sekme çubuğunu alır). `(giris)` kendi kabuğunu
   taşır — gezinmesi YOKTUR, bu bir kusur değil karardır. */
const kabukBekleniyor = (g) => g.grup.includes('(kabuk)') || g.grup.includes('(tam)');

/* Kabuk gezinmesinde KENDİ ÖĞESİ olmayan ekranlar: aktif öğe ya üst
   rotanınkidir ya da hiç yoktur. Aktif öğe sayısı > 1 her zaman kusurdur
   (iki yerde birden duruyormuş gibi görünür). C defterinde sekmede yeri
   olmayan bölümler (`/surecler`, `/raporlar`, `/kanitlar`…) dizin
   sütununda `aria-current="true"` ile işaretlenir; o yüzden "aktif öğe
   yok" kusuru yalnız dizin konumu da YOKSA yazılır. Buradaki liste,
   her iki kanalı da taşımayan YARDIMCI rotalardır (bkz. yonler.ts
   ALAN_ROTALARI): `/sistem*` ayaktaki "Tasarım sistemi" bağından ulaşılır;
   `/yonetim-tezgahi` yalnız yetkiliye açık yönetim tezgâhıdır, beş alandan
   birine ait değildir — üstte alan yanmaz, ikincil sıra çizilmez. */
const RAY_OGESI_YOK = new Set(['/sistem', '/sistem/bilesenler', '/yonetim-tezgahi']);

/** Bir URL yolunu envanterdeki rota kalıbına eşler (dinamik segment dahil). */
function rotaEslestir(patika, envanter) {
  const tam = envanter.find((g) => g.rota === patika);
  if (tam) return tam;
  const parca = patika.split('/').filter(Boolean);
  return envanter.find((g) => {
    const kalip = g.rota.split('/').filter(Boolean);
    if (kalip.length !== parca.length) return false;
    return kalip.every((k, i) => (/^\[.*\]$/.test(k) ? true : k === parca[i]));
  }) ?? null;
}

/* Giriş öncesi yoklanacak rota: oturum açıldıktan sonra `/giris` kendini
   `/`'a atar, yani oturumlu yoklama bu ekranı HİÇ görmez. */
const GIRIS_ROTASI = '/giris';



/* ── 4. Tarayıcı ───────────────────────────────────────────────────── */

const b = await chromium.launch({ executablePath: tarayiciYolu() });
const s = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const hatalar = [];
s.on('pageerror', (e) => hatalar.push(`${s.url()} :: ${e.message.slice(0, 120)}`));

/* Giriş `kosu-ortak.mjs → girisYap` ile YAPILIR, burada kopyalanmaz.
   Kopya vardı ve tam da beklenen şekilde ıraksadı: sinematik giriş
   eklendiğinde (PR #28) ortak işlev CTA adımını aldı, bu kopya almadı ve
   bu araç giriş yapamaz oldu — `page.fill` "element is not visible" ile
   düştü. Kusur CI'da görünmedi, çünkü bu araç CI'da koşmuyor. */

async function yokla(giris, url, envanter) {
  const y = await s.goto(KOK + url, { waitUntil: 'domcontentloaded' });
  await s.waitForTimeout(450);
  const kod = y?.status() ?? 0;
  /* BİLİNÇLİ yönlendirmede beklenti VARILAN ekranındır: `/tesisler`
     kendini `/portfoy`ya atar ve `/portfoy` (tam) katmanındadır, rayı
     yoktur — bunu "ray yok" kusuru saymak aracın kendi körlüğü olurdu.
     Beklentiyi devretmek YALNIZ izinli yönlendirmede yapılır; izinsiz bir
     varış değişiminde beklenti KAYNAĞINKİ kalır ve ayrıca kusur yazılır,
     yoksa regresyon varışın kontrollerini geçip kaybolurdu. */
  const varilan = new URL(s.url()).pathname;
  const karar = yonlendirmeKarari(url, varilan);
  const hedefGirisi = karar.beklentiDevret ? rotaEslestir(varilan, envanter) : null;
  const beklenti = hedefGirisi ?? giris;
  const olcu = await s.evaluate(() => {
    /* `.ab[data-yogunluk]` tek başına KABUK değil, belirteç köküdür: giriş,
       bakım, 404 ve kök hata ekranı da paleti almak için onu taşır ama
       gezinme çizmez. Kabuğu ayıran şey atla bağıdır (`.ab-atla`) — yalnız
       components/kabuk/Kabuk.tsx onu basar. */
    const kabuk = document.querySelector('.ab[data-yogunluk]:has(> .ab-atla)');
    if (!kabuk) return null;
    const yon = kabuk.getAttribute('data-yogunluk');
    /* Tek kabuk: birincil gezinme beş alan sekmesidir — aktif "sayfa"
       orada duyurulur; ikincil sıra `aria-current="true"` taşır. */
    const gezinme = document.querySelector('.ab-ust nav[aria-label="Alanlar"]');
    /* Aktif öğe TÜM belgede sayılır: hesap bağları (`/ayarlar`, `/yardim`,
       `/bildirimler`) gezinmenin dışında durur ama `aria-current="page"`
       taşır; "tek geçerli sayfa" sözleşmesi belgeye aittir, çubuğa değil. */
    /* Yol çubuğunun (ekmek kırıntısı, `.yol`) son öğesi `aria-current="location"`
       taşır (Faz 3): gezinme "hangi bölüm", yol "bu bölümde hangi kayıt" der.
       Belge genelinde tek `aria-current="page"` sözleşmesi böylece bozulmaz;
       `.yol` süzgeci geriye dönük güvence olarak kalır. */
    const aktifler = [...document.querySelectorAll('[aria-current="page"]')]
      .filter((e) => !e.closest('.yol'));
    const aktif = aktifler[0] ?? null;
    return {
      yon,
      gezinmeVar: Boolean(gezinme),
      genislik: gezinme ? Math.round(gezinme.getBoundingClientRect().width) : null,
      aktifSayi: aktifler.length,
      aktifAd: aktif ? (aktif.getAttribute('aria-label') ?? aktif.textContent).trim().slice(0, 22) : null,
      dizinKonumu: document.querySelectorAll('.ab-ikincil [aria-current="true"], .ab-c-ekrandizin [aria-current="true"]').length,
      /* Ana bölge TEK olmalıdır. Kabuk `<main>` basmaz (bkz. Kabuk.tsx
         §309): ekran kendi ana bölgesini çizer. Bir ekran bunu unutursa
         sayfanın hiç ana bölgesi olmaz ve atla bağı bir yere varmaz.
         axe'ın wcag2a/aa kümesi bunu GÖRMEZ (`landmark-one-main` en iyi
         uygulama kuralıdır); /uyum bu yüzden aylarca ana bölgesiz kaldı,
         yalnız Lighthouse erişilebilirliği 98'de takılıyordu. */
      anaSayi: document.querySelectorAll('main, [role="main"]').length,
    };
  });

  const kusurlar = [];
  if (kod !== 200) kusurlar.push(`HTTP ${kod}`);
  /* Oturumluyken girişe atılmak yetki/oturum kusurudur, yönlendirme değil. */
  if (url !== GIRIS_ROTASI && varilan.startsWith('/giris')) kusurlar.push('girişe atıldı');
  /* Listede olmayan HER varış değişimi kusurdur — varış bilinen bir rota
     olsa, hatta 200 dönse bile. İstenen ekran çizilmemiştir. */
  else if (karar.kusur) kusurlar.push(karar.kusur);
  if (kabukBekleniyor(beklenti) && !olcu) kusurlar.push('kabuk yok');
  if (!kabukBekleniyor(beklenti) && olcu) kusurlar.push('beklenmeyen kabuk');
  if (olcu && !olcu.gezinmeVar) kusurlar.push(`${olcu.yon} kabuğunun gezinmesi yok`);
  if (olcu && olcu.aktifSayi > 1) kusurlar.push(`aktif öğe ${olcu.aktifSayi} (>1)`);
  if (olcu && olcu.anaSayi !== 1) kusurlar.push(`ana bölge ${olcu.anaSayi} (1 olmalı)`);
  if (olcu && olcu.aktifSayi === 0 && olcu.dizinKonumu === 0 && kabukBekleniyor(beklenti)
    && !RAY_OGESI_YOK.has(beklenti.rota)) kusurlar.push('aktif öğe yok');
  return { kod, olcu, kusurlar, varilan: varilan === url ? null : varilan };
}

/* ── 5. Koşu ───────────────────────────────────────────────────────── */

const envanter = rotaEnvanteri();
const sonuclar = [];

/* Giriş ekranı ÖNCE, oturum açılmadan. */
for (const g of envanter.filter((x) => x.rota === GIRIS_ROTASI)) {
  const r = await yokla(g, g.rota, envanter);
  sonuclar.push({ ...g, url: g.rota, durum: r.kusurlar.length ? 'KUSURLU' : 'GEÇTİ', ...r, not: 'oturum açılmadan' });
}

await girisYap(s, KOK);

for (const g of envanter.filter((x) => x.rota !== GIRIS_ROTASI)) {
  const c = somutlastir(g);
  if (c.hata) {
    sonuclar.push({ ...g, url: null, durum: 'TEST EDİLEMEDİ', sebep: c.hata, kusurlar: [] });
    continue;
  }
  const r = await yokla(g, c.url, envanter);
  const notlar = [c.not, r.varilan ? `→ ${r.varilan}` : null].filter(Boolean).join(' · ');
  sonuclar.push({ ...g, url: c.url, durum: r.kusurlar.length ? 'KUSURLU' : 'GEÇTİ', ...r, not: notlar || null });
}

await b.close();

/* ── 6. Rapor ──────────────────────────────────────────────────────── */

const gecen = sonuclar.filter((r) => r.durum === 'GEÇTİ').length;
const kusurlu = sonuclar.filter((r) => r.durum === 'KUSURLU');
const edilemeyen = sonuclar.filter((r) => r.durum === 'TEST EDİLEMEDİ');

if (JSON_CIKTI) {
  console.log(JSON.stringify({
    toplam: sonuclar.length, gecen, kusurlu: kusurlu.length, edilemeyen: edilemeyen.length,
    sayfaHatasi: hatalar.length, rotalar: sonuclar,
  }, null, 2));
} else {
  for (const r of sonuclar) {
    const im = r.durum === 'GEÇTİ' ? 'OK  ' : r.durum === 'KUSURLU' ? 'KUSUR' : 'YOK ';
    const ray = r.olcu
      ? `kabuk=${r.olcu.yon} gezinme=${r.olcu.gezinmeVar ? `${r.olcu.genislik}px` : 'YOK'}`
        + ` aktif=${r.olcu.aktifSayi}:${r.olcu.aktifAd ?? '—'}`
        + (r.olcu.dizinKonumu ? ` dizin=${r.olcu.dizinKonumu}` : '')
      : (r.durum === 'GEÇTİ' ? 'kabuk yok (giriş katmanı)' : '');
    const kuyruk = r.durum === 'TEST EDİLEMEDİ'
      ? `TEST EDİLEMEDİ · ${r.sebep}`
      : `${r.kod ?? ''} ${ray}${r.kusurlar.length ? `  ← ${r.kusurlar.join(', ')}` : ''}${r.not ? `  (${r.not})` : ''}`;
    console.log(`${im} ${r.rota.padEnd(24)} ${kuyruk}`);
  }
  console.log(`\nkapsam: ${gecen}/${sonuclar.length} rota geçti`
    + ` · kusurlu ${kusurlu.length} · test edilemedi ${edilemeyen.length}`
    + ` · sayfa hatası ${hatalar.length}`);
  if (edilemeyen.length) {
    console.log('\nTest edilemeyenler:');
    for (const r of edilemeyen) console.log(`  ${r.rota} → ${r.sebep}`);
  }
  if (hatalar.length) console.log(hatalar.slice(0, 6));
}


/* ── ÖLÇÜM KAPSAMI TABANI ─────────────────────────────────────────────
   Cırcır BORÇ için tavan tutar; bu taban KAPSAM için taban tutar. Kusur
   sayısı sıfır olabilir; ÖLÇÜM sayısı olamaz — sıfır ölçümle "kusur yok"
   demek, hiçbir şeye bakmadan temiz raporlamaktır
   (`arac/olcum-tabani.mjs` başlığındaki ölçülmüş olay). Taban ÖNCE
   bakılır: geçersiz bir ölçümün borç kararı da geçersizdir. */
if (process.argv.includes('--taban-yaz')) {
  const { onceki, yeni } = tabanYaz('duman.rota', sonuclar.length);
  console.log(`taban güncellendi: duman.rota ${onceki ?? '(yok)'} → ${yeni}`);
} else {
  try {
    tabanDogrula('duman.rota', sonuclar.length);
  } catch (e) {
    console.error(`\n${e.message}`);
    process.exitCode = 1;
  }
}

if (kusurlu.length || edilemeyen.length || hatalar.length) process.exitCode = 1;
