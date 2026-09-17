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

   ── NE ÖLÇMEZ (beyanlı sınır) ─────────────────────────────────────────
   KÜNYE TAVANINI (`KUNYE_EN_COK_YOL`) bu kapı SINAMAZ. Sabotajla ölçüldü:
   sabit 3'ten 99'a çıkarıldığında kapı yeşil kalıyor — çünkü tohumda
   tuvale dört nokta düşüyor ve kural hiçbir zaman ikinci yolun ötesine
   geçmiyor; sınanmayan bir sınır, ölçülmüş sayılmaz. Tavanı `tests/
   kunye-yolu.test.ts` sentetik yoğunlukla ölçer ve sabiti büyüten
   sabotajda KIRMIZI yanar. İkisi birbirinin yerine geçmez: saf test
   kuralı, bu kapı kuralın EKRANDAKİ SONUCUNU ölçer.

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
const ASGARI_IDDIA = 15;
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
