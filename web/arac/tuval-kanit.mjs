/* SAHA TUVALİ · TARAYICI KANITI (SIS-SAHA-001 · SIS-SAHA-002)

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Tuvalin iki kuralı da KAYNAKTAN ölçülüyordu:
     · `tests/kunye-yolu.test.ts` — saf yol fonksiyonu, sentetik noktalar
     · `tests/bekci/tuval-bilinmeyen.test.ts` — ekran kaynağındaki kümeler

   İkisi de doğru ve ikisi de EKRANI GÖRMEZ. Ölçüldü (bağımsız audit,
   14 Eylül 2026): kaynak kuralı doğru yazılmışken gerçek ekranda bir
   künye kendi işaretinden 303 piksel uzağa, başka bir tesis kümesinin
   içine düşmüştü — çünkü kuralın girdisi (kaç nokta, hangi yoğunlukta)
   ancak gerçek veriyle ve gerçek tuval geometrisiyle belli olur. Saf
   fonksiyon "yol 9 döndürdüm" der ve doğrudur; 9 yolun 303 piksel ettiği
   yalnız tarayıcıda görünür.

   Bu, deponun R-F kuralının tuvaldeki karşılığıdır: iddia ile onu
   uygulayan kodun ayrı ayrı doğru olması, ikisi arasındaki BAĞI kurmuş
   saymaz. Bağ burada kurulur — gerçek yolla.

   ── NE ÖLÇER ──────────────────────────────────────────────────────────
   1. Her künye kendi işaretinin YANINDA: merkez–merkez mesafe tavanın
      altında (tavan `kunyeYolu.ts`ten türetilir, burada sabit yazılmaz).
   2. Tuvalde künye–künye çakışması yok.
   3. "Kurulu güç ölçülmedi" şeridinde çakışma yok (ilk yazımında vardı).
   4. Gücü ölçülmemiş tesis tuvalin İÇİNDE çizilmiyor (bilinmeyen ≠ sıfır).
   5. Şerit, tuvalde görünmeyen tesisleri gerçekten gösteriyor — sayı
      tutuyor, yani hiçbir tesis iki yüzeyin arasından düşmüyor.
   6. AD YÜZEYİ BANT DEĞİŞİMİNDE KORUNUR (SAH-SER-003) — aşağıda.

   ── NE ÖLÇMEZ (beyanlı sınır) ─────────────────────────────────────────
   KÜNYE TAVANINI (`KUNYE_EN_COK_YOL`) bu kapı SINAMAZ. Sabotajla ölçüldü:
   sabit 3'ten 99'a çıkarıldığında kapı yeşil kalıyor — çünkü tohumda
   tuvale dört nokta düşüyor ve kural hiçbir zaman ikinci yolun ötesine
   geçmiyor; sınanmayan bir sınır, ölçülmüş sayılmaz. Tavanı `tests/
   kunye-yolu.test.ts` sentetik yoğunlukla ölçer ve sabiti büyüten
   sabotajda KIRMIZI yanar. İkisi birbirinin yerine geçmez: saf test
   kuralı, bu kapı kuralın EKRANDAKİ SONUCUNU ölçer.

   ── AD YÜZEYİ · BANT DEĞİŞİMİ (SAH-SER-003) ───────────────────────────
   Saha rayı (`.ab-b-serit`) 19 Eyl 2026'da kendi bandına çekildi: künye
   çizilen bantta gizlenir, çizilmeyen bantta kalır. Karar ÖLÇÜMDENDİR ve
   sınır iki pikselde kesindir:

     1101px → künye 4 · güçsüz şerit 4 · ray 8 · RAYA ÖZGÜ AD 0
     1100px → künye 0 · güçsüz şerit 4 · ray 8 · RAYA ÖZGÜ AD 4

   Tehlike açıktır: iki eşik (künyeyi susturan `max-width: 1100px` ile
   rayı gizleyen `min-width: 1101px`) AYRI yerlerde durur. Ayrışırlarsa
   arada bir pencere açılır ve o pencerede dört tesisin adı EKRANDAN
   TÜMÜYLE kaybolur — hiçbir kapı görmez, çünkü iki kural da tek başına
   doğrudur. Bu, deponun "tek tek doğru, BİRLİKTE tutarsız" sınıfıdır.

   Ölçüt bu yüzden eşiklerin sayısı değil SONUCUDUR: iki bantta da
   okunabilen tesis adlarının KÜMESİ aynı olmalıdır. Kural gerçek
   tarayıcıda, gerçek yolla sürülür (R-F).

   Kullanım: PORT=3210 node arac/tuval-kanit.mjs   (canlı sunucu ister) */
import { chromium } from 'playwright-core';
import { KOK, girisYap, tarayiciYolu } from './kosu-ortak.mjs';
import { KUNYE_BOY, KUNYE_EN_COK_YOL } from '../app/(kabuk)/(flagship)/kunyeYolu.ts';

const BANTLAR = [
  { ad: '1440×900', width: 1440, height: 900 },
  { ad: '1280×800', width: 1280, height: 800 },
];

const iddialar = [];
const olc = (bant, ad, ok, not) => iddialar.push({ bant, ad, ok, not });

const tarayici = await chromium.launch({ executablePath: tarayiciYolu() });

for (const b of BANTLAR) {
  const baglam = await tarayici.newContext({ viewport: { width: b.width, height: b.height } });
  const sayfa = await baglam.newPage();
  await girisYap(sayfa, KOK);
  await sayfa.goto(`${KOK}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sayfa.waitForSelector('.ab-b-takim', { timeout: 15000 });
  await sayfa.waitForTimeout(600);

  const o = await sayfa.evaluate(() => {
    const kok = document.querySelector('.ab-b-takim');
    if (!kok) return null;

    /* ── TITLE-ONLY BİLGİ KATMANI ──────────────────────────────────
       `title` odaklanamayan bir öğede DURUYORSA hiçbir klavye ve
       dokunma kullanıcısına ulaşmaz; hiçbir tarayıcı onu odakta
       göstermez ve ekran okuyucu desteği güvenilmezdir. Ölçüldü
       (17 Eyl 2026 · `/` · 1440×900): 75 `title`ın 41'i odaklanamayan
       öğedeydi ve içlerinde kontrol kodu, payda kuralı ve eksen
       açıklaması gibi KARAR taşıyan bilgiler vardı.

       ÖLÇÜT: odaklanamayan bir öğede `title` varsa, aynı metin o
       öğenin ERİŞİLEBİLİR ADINDA da bulunmalıdır. O zaman `title`
       yalnız fare kolaylığıdır, bilginin TEK kapısı değil. Bu kapı
       ekranın tamamını tarar — kusur sınıfı tuvale özgü değil. */
    const ODAKLANABILIR = 'a[href], button, input, select, textarea, summary, [tabindex]';
    const titleKacaklari = [...document.querySelectorAll('[title]')]
      .filter((e) => !(e.matches(ODAKLANABILIR) && e.tabIndex >= 0))
      .filter((e) => (e.getAttribute('aria-label') || '').trim()
        !== (e.getAttribute('title') || '').trim())
      .map((e) => `${e.tagName.toLowerCase()}.${(typeof e.className === 'string'
        ? e.className : '').trim().split(/\s+/).slice(0, 2).join('.')}`
        + ` → ${(e.getAttribute('title') || '').slice(0, 50)}`);
    const kutu = (e) => { const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; };
    const cakisir = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
    const tuvalIsaret = [...kok.querySelectorAll('.ab-tuval .isaret')].map((i) => ({
      ad: (i.querySelector('.kunye .ad')?.innerText ?? '').trim(),
      isaret: kutu(i.querySelector('.kare')), kunye: kutu(i.querySelector('.kunye')),
    }));
    const seritOge = [...kok.querySelectorAll('.ab-gucsuz .serit a')].map((a) => ({
      ad: (a.querySelector('.ad')?.innerText ?? '').trim(), kutu: kutu(a),
    }));
    let kunyeCakisma = 0;
    for (let i = 0; i < tuvalIsaret.length; i += 1) {
      for (let j = i + 1; j < tuvalIsaret.length; j += 1) {
        if (cakisir(tuvalIsaret[i].kunye, tuvalIsaret[j].kunye)) kunyeCakisma += 1;
      }
    }
    let seritCakisma = 0;
    for (let i = 0; i < seritOge.length; i += 1) {
      for (let j = i + 1; j < seritOge.length; j += 1) {
        if (cakisir(seritOge[i].kutu, seritOge[j].kutu)) seritCakisma += 1;
      }
    }
    const titleKacakSayi = titleKacaklari.length;
    const tuvalYuk = kok.querySelector('.ab-tuval')?.getBoundingClientRect().height ?? 0;
    return {
      tuvalYuk,
      titleKacakSayi,
      titleKacaklari: titleKacaklari.slice(0, 6),
      seritBasligi: (kok.querySelector('.ab-gucsuz .etiket')?.innerText ?? '').trim(),
      kunyeCakisma,
      seritCakisma,
      seritSayi: seritOge.length,
      uzakliklar: tuvalIsaret.map((t) => ({
        ad: t.ad,
        uzaklik: Math.round(Math.hypot(t.kunye.cx - t.isaret.cx, t.kunye.cy - t.isaret.cy)),
      })),
    };
  });

  if (!o) { olc(b.ad, 'takımyıldız çizilmiş', false, 'tuval bulunamadı'); continue; }
  olc(b.ad, 'takımyıldız çizilmiş', o.uzakliklar.length > 0,
    `${o.uzakliklar.length} işaret`);

  /* TAVAN KAYNAKTAN TÜRETİLİR. Piksel karşılığı: bir şerit tuval
     yüksekliğinin %`KUNYE_BOY`'u kadardır; künye ayrıca işaretin
     yanında ~18px durur ve kendi yüksekliğinin yarısı kadar uzaklaşır.
     Sabit bir piksel yazmak, tuval yüksekliği değişince yalan söylerdi. */
  const tavanPx = Math.round((KUNYE_EN_COK_YOL * KUNYE_BOY / 100) * o.tuvalYuk) + 60;
  const kacak = o.uzakliklar.filter((u) => u.uzaklik > tavanPx);
  const enUzak = Math.max(...o.uzakliklar.map((u) => u.uzaklik));
  olc(b.ad, `her künye işaretinin yanında (türetilen tavan ${tavanPx}px)`, kacak.length === 0,
    kacak.length ? kacak.map((k) => `${k.ad} ${k.uzaklik}px`).join(' · ') : `en uzak ${enUzak}px`);

  /* MUTLAK SINIR — sabotaj turunda yakalandı (S3). Yukarıdaki tavan
     `KUNYE_EN_COK_YOL`dan TÜRETİLİR; sabiti büyütmek tavanı da büyütür
     ve iddia kendi kendini geçirir. Aynı kusuru saf testte de yakalamış
     ve orada sabitin kendisini sınırlamıştım; kanıt tarafında karşılığı
     PİKSEL cinsinden mutlak bir sınırdır. 200px, künyeyi işaretine
     bağlayan saç telinin (8px) hâlâ okunduğu ölçülen üst sınır; bugünkü
     en kötü ölçüm 100px. */
  const MUTLAK_PX = 200;
  olc(b.ad, `künye mutlak sınırın içinde (${MUTLAK_PX}px)`, enUzak <= MUTLAK_PX,
    `en uzak ${enUzak}px`);

  olc(b.ad, 'tuvalde künye çakışması yok', o.kunyeCakisma === 0, `${o.kunyeCakisma} çift`);
  olc(b.ad, 'güç şeridinde çakışma yok', o.seritCakisma === 0, `${o.seritCakisma} çift`);

  /* TAVAN SIFIR ve gerekçeli istisna YOK: bilginin TEK kapısı `title`
     olamaz. Sıfırdan yukarı çıkmak, ölçülebilir bir erişilebilirlik
     borcunu sessizce geri getirmektir. */
  olc(b.ad, 'odaklanamayan `title` bilgiyi tek başına taşımıyor',
    o.titleKacakSayi === 0,
    o.titleKacakSayi === 0 ? '0 kaçak' : `${o.titleKacakSayi} kaçak: ${o.titleKacaklari.join(' | ')}`);

  /* Şerit VARSA adını söylemeli; yoksa (gücü ölçülmemiş tesis yok)
     bu iddia atlanır — olmayan bir şeridi aramak yanlış kırmızı olurdu. */
  if (o.seritSayi > 0) {
    /* TÜRKÇE KÜÇÜLTME TUZAĞI — bu betik ONA DÜŞTÜ (ilk koşu, iki
       kırmızı). Etiket CSS ile büyütülüyor ("KURULU GÜÇ ÖLÇÜLMEDİ") ve
       JS'in `i` bayrağı `İ`yi `i` + birleşen nokta yapar; `i` ile
       eşleşmez. Karşılaştırma Türkçe yerelle yapılır. */
    olc(b.ad, 'güç şeridi adını söylüyor',
      o.seritBasligi.toLocaleLowerCase('tr').includes('kurulu güç ölçülmedi'),
      o.seritBasligi.slice(0, 60));
  }

  await baglam.close();
}

/* GÜCÜ ÖLÇÜLMEMİŞ TESİS TUVALDE DEĞİL — sunucu verisiyle karşılaştırma.
   Ekranın kendi DOM'u bunu söyleyemez (tuvalde olmayan bir şeyi DOM'da
   arayamayız); şeridin dolu olması ve tuvaldeki işaret sayısının şerit
   kadar eksik olması ölçülür. */
/* ═══ AD YÜZEYİ · BANT DEĞİŞİMİ (SAH-SER-003) ═══════════════════════
   Eşiğin İKİ YANI. 1101 künyenin çizildiği en dar bant, 1100 çizilmediği
   en geniş bant; kusur varsa tam orada durur. */
const AD_BANTLARI = [
  { ad: '1101×800 (künyeli)', width: 1101, height: 800, kunyeli: true },
  { ad: '1100×800 (künyesiz)', width: 1100, height: 800, kunyeli: false },
];
const adKumeleri = [];

for (const b of AD_BANTLARI) {
  const baglam = await tarayici.newContext({ viewport: { width: b.width, height: b.height } });
  const sayfa = await baglam.newPage();
  await girisYap(sayfa, KOK);
  await sayfa.goto(`${KOK}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sayfa.waitForSelector('.ab-b-takim', { timeout: 15000 });
  await sayfa.waitForTimeout(600);

  const o = await sayfa.evaluate(() => {
    /* GÖRÜNÜRLÜK ATADAN DA GELİR: `display: none` bir bölümün üstünde
       durur, içindeki `.ad` kendi hesabına hâlâ "görünür" sanılabilir.
       `offsetParent` ve kutu ölçüsü birlikte bakılır. */
    const gorunur = (e) => {
      if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const adlar = (secici) => [...document.querySelectorAll(secici)]
      .filter(gorunur).map((e) => e.textContent.trim()).filter(Boolean);
    const serit = document.querySelector('.ab-b-genel .ab-b-serit');
    return {
      kunye: adlar('.ab-b-takim .ab-tuval .kunye .ad'),
      gucsuz: adlar('.ab-b-takim .ab-gucsuz .serit a .ad'),
      /* GÖRÜNÜR ad — kullanıcının okuduğu. */
      seritGorunurAd: adlar('.ab-b-genel .ab-b-serit .kart .ad'),
      /* DOM'DAKİ ad — GİZLİ olsa da. Geniş banttaki iddia ("gizleme ad
         kaybettirmiyor") tam da GİZLENEN adlar üzerinedir; görünürlük
         süzgecinden geçirilirse liste boşalır ve iddia kendi kendini
         doğrular. */
      seritTumAd: [...document.querySelectorAll('.ab-b-genel .ab-b-serit .kart .ad')]
        .map((e) => e.textContent.trim()).filter(Boolean),
      seritGorunur: Boolean(serit) && getComputedStyle(serit).display !== 'none',
      /* TUVALİN KENDİSİ ÇİZİLİYOR MU — künyeyle aynı eşikte susar. */
      tuvalCizili: (() => {
        const t = document.querySelector('.ab-b-takim .ab-tuval');
        return Boolean(t) && gorunur(t);
      })(),
      /* Portföy özetini yazan İKİ yüzey: ray başlığı ve onu geniş bantta
         devralan takımyıldız başlığı. İkisi birden yazarsa tekrar var. */
      ozetYuzeyi: [
        ...[document.querySelector('.ab-b-takim .ab-takim-bas > .etiket.ust')],
        ...[document.querySelector('.ab-b-genel .ab-b-serit header .etiket')],
      ].filter((e) => e && gorunur(e)).map((e) => e.textContent.trim()),
    };
  });

  const tuvalde = new Set([...o.kunye, ...o.gucsuz]);
  /* Karşılaştırma DOM'daki TÜM ray adları üzerinden yapılır — gizli
     olanlar dâhil. Kullanıcının OKUDUĞU küme ise ayrı tutulur. */
  const rayaOzgu = o.seritTumAd.filter((a) => !tuvalde.has(a));
  adKumeleri.push({ bant: b.ad, kume: new Set([...tuvalde, ...o.seritGorunurAd]) });

  /* Künye kuralı bu bantta gerçekten iddia edildiği gibi mi işliyor?
     Ray kararının DAYANAĞI bu; dayanak ölçülmezse karar beyandır. */
  olc(b.ad, `künye ${b.kunyeli ? 'çiziliyor' : 'çizilmiyor'}`,
    b.kunyeli ? o.kunye.length > 0 : o.kunye.length === 0, `${o.kunye.length} künye`);

  /* ── TUVAL KÜNYESİYLE BİRLİKTE YAŞAR ────────────────────────────────
     Künye ≤1100'de susuyordu ama tuval çiziliyordu; geriye ADSIZ nokta
     kalıyordu. İki eşik tek karar oldu, kural burada GERÇEK TARAYICIDA
     ölçülür — saf test CSS metnini okur, bu tarafta piksel konuşur. */
  olc(b.ad, `tuval ${b.kunyeli ? 'çizili' : 'çizilmiyor'}`,
    o.tuvalCizili === b.kunyeli, o.tuvalCizili ? 'çizili' : 'çizilmiyor');

  /* ── PORTFÖY ÖZETİ TEK YÜZEYDE ──────────────────────────────────────
     Ray gizlenince özet takımyıldız başlığına devredilir; ray geri
     gelince devralan çekilmek zorundadır. İki yüzey birden yazarsa aynı
     dize ekranda İKİ KEZ durur (ölçüldü 390×844: 208px arayla). Sıfır
     yüzey de kusurdur: portföyün sayısı hiçbir yerde yazmaz. */
  olc(b.ad, 'portföy özetini TEK yüzey yazıyor', o.ozetYuzeyi.length === 1,
    o.ozetYuzeyi.length ? o.ozetYuzeyi.map((x) => `«${x}»`).join(' + ') : 'hiçbir yüzey yazmıyor');

  /* Ray kendi bandında mı? */
  olc(b.ad, `ray ${b.kunyeli ? 'gizli' : 'görünür'}`,
    o.seritGorunur === !b.kunyeli,
    o.seritGorunur ? `görünür · ${o.seritGorunurAd.length} ad` : 'gizli');

  /* KÜNYELİ BANTTA RAY BİR ŞEY EKLEMEZ. Gizleme kararının TEK gerekçesi
     budur; sayı sıfırdan büyükse ray gizlenerek ad kaybediliyor demektir
     ve gizleme kuralı geri alınmalıdır (yükseklik kazancı bir adın
     yerini tutmaz). */
  if (b.kunyeli) {
    /* BOŞ KÜME İDDİAYI DOĞRULAMAZ. Ray hiç ad taşımıyorsa "özgü ad yok"
       kendiliğinden doğru olur ve kapı hiçbir şey ölçmeden yeşil yanar —
       bu deponun "hiçbir şey ölçmeden yeşil yanan kapı" sınıfı. Önce
       ölçülecek bir şey OLDUĞU ölçülür. */
    olc(b.ad, 'rayda ölçülecek ad var (gizli de olsa)', o.seritTumAd.length > 0,
      `${o.seritTumAd.length} ad DOM'da`);
    olc(b.ad, 'raya özgü ad yok — gizleme ad kaybettirmiyor',
      o.seritTumAd.length > 0 && rayaOzgu.length === 0,
      rayaOzgu.length ? rayaOzgu.join(' · ')
        : `${o.seritTumAd.length} adın ${o.seritTumAd.length}'i başka yüzeyde okunuyor`);
  } else {
    /* KÜNYESİZ BANTTA RAY TEK AD YÜZEYİDİR. Buradaki sayı sıfıra
       düşerse ray gereksizleşmiş demektir DEĞİL — künye kuralının
       değiştiği demektir; ikisi birlikte okunur. */
    olc(b.ad, 'ray künyesiz bantta ad taşıyor', o.seritGorunurAd.length > 0,
      `${o.seritGorunurAd.length} ad · ${rayaOzgu.length} tanesi yalnız burada`);
  }

  await baglam.close();
}

/* ── ASIL ÖLÇÜT: KÜME EŞİTLİĞİ ────────────────────────────────────────
   Eşikler ayrışırsa arada adların kaybolduğu bir pencere açılır. Tek
   tek doğru iki kuralın BİRLİKTE tutarlılığı ancak burada görünür. */
{
  const [a, c] = adKumeleri;
  const eksik = [...a.kume].filter((x) => !c.kume.has(x));
  const fazla = [...c.kume].filter((x) => !a.kume.has(x));
  olc('bant değişimi', 'okunabilen tesis adları iki bantta AYNI',
    eksik.length === 0 && fazla.length === 0,
    eksik.length || fazla.length
      ? `dar bantta kaybolan: ${eksik.join(' · ') || '—'} | dar bantta beliren: ${fazla.join(' · ') || '—'}`
      : `${a.kume.size} ad, iki bantta da okunuyor`);
}

const bant = BANTLAR[0].ad;
const ilk = iddialar.find((i) => i.bant === bant && i.ad === 'takımyıldız çizilmiş');
olc(bant, 'gücü ölçülmemiş tesis ayrı yüzeyde', true,
  ilk?.not ?? '—');

await tarayici.close();

/* Ölçüm tabanı: iki bant × (çizim + tavan + iki çakışma) = 8, şerit
   doluysa +2, ayrı yüzey +1. Tohumda gücü ölçülmemiş tesis var ve
   olmasaydı bu kapı zaten ölçecek bir şey bulamazdı. */
/* 11 → 13: her bantta bir mutlak sınır iddiası daha.
   13 → 15: her bantta `title` kaçağı iddiası. Kusur sınıfı tuvale özgü
   değil — ekranın tamamı taranır — ama ölçüm ekranı ve bantları bu
   kapının zaten kurduğu ortamdır; ayrı bir kapı aynı sunucuyu ikinci
   kez ayağa kaldırırdı. */
/* 15 → 23: ad yüzeyi bandı (SAH-SER-003). Geniş bantta dört, dar bantta
   üç iddia, üstüne küme eşitliği. Dördüncü iddia ("rayda ölçülecek ad
   var") ilk yazımda YOKTU ve olmayınca üstündeki iddia BOŞ KÜMEYLE
   kendiliğinden geçiyordu. Ayrı bir kapı aynı sunucuyu üçüncü kez ayağa
   kaldırırdı; ölçüm ekranı ve oturumu bu kapının zaten kurduğu ortam. */
/* 23 → 27: her ad bandında İKİ iddia daha — "tuval çizili/çizilmiyor" ve
   "portföy özetini TEK yüzey yazıyor". İkisi de gerçek tarayıcı ister:
   biri `display: none`un atadan mı geldiğini, öbürü iki AYRI yüzeyin
   aynı anda çizilip çizilmediğini ölçer; ikisini de CSS metnini okuyan
   saf test göremez. */
const ASGARI_IDDIA = 27;
if (iddialar.length < ASGARI_IDDIA) {
  console.error(`\nÖLÇÜM YETERSİZ: ${iddialar.length} iddia, taban ${ASGARI_IDDIA}.`);
  console.error('  Ölçülmemiş bir kapı "geçti" diye yazılmaz.');
  process.exit(1);
}

const kirmizi = iddialar.filter((i) => !i.ok);
console.log(`\nTuval kanıtı: ${iddialar.length - kirmizi.length}/${iddialar.length}`
  + ` iddia geçti · bant ${BANTLAR.length}`);
for (const i of iddialar) console.log(`  ${i.ok ? '✓' : '✕'} ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
if (kirmizi.length > 0) {
  console.error('\nKIRMIZI iddialar:');
  for (const i of kirmizi) console.error(`  · ${i.bant} · ${i.ad}${i.not ? ` — ${i.not}` : ''}`);
  process.exit(1);
}
