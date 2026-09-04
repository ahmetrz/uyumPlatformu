import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* ═══════════════════════════════════════════════════════════════════════
   KABUK · İKİNCİL GEZİNME SIRASININ ULAŞILABİLİRLİĞİ

   ── NİYE VAR ──────────────────────────────────────────────────────────
   İkincil sıra `height: 36px` + `overflow-x: auto` + `scrollbar-width:
   none` idi. Uyum alanının 16 bağı 1440px'lik pencerede 1699px'e uzuyor,
   son üçü — "Denetim izi", "Saklama ve imha", "Eğitim kütüğü" — ekranın
   dışında kalıyordu. Sıra teknik olarak kayıyordu ama kaydırma çubuğu
   gizli olduğu için EKRANDA HİÇBİR İPUCU YOKTU: fare kullanan bir kişi o
   üç ekranı bulamıyordu. Üç ekran, keşfedilemez olduğu için yok gibiydi.

   Yatay taşma kapısı (`arac/yatay-tasma.mjs`) bunu göremez: kırpma
   sıranın KENDİ kabında olur, `documentElement.scrollWidth` büyümez.
   Bu yüzden kural burada, kaynağın kendisinde donduruldu.

   ── BU TEST NEYİ İDDİA EDER ───────────────────────────────────────────
   Piksel ölçümü tarayıcıda alındı; burada TEKRAR ÖLÇÜLMEZ. Burada
   donan şey KURALDIR:

   1 · Geniş ekranda sıra SARAR — gizli kaydırma çubuğuna geri dönülemez.
   2 · Sabit `height` konulamaz: sardığında ikinci satırı kırpardı.
   3 · Yatay kaydırma yalnız dokunmatik banda (≤700px) izinlidir.
   4 · Bağların toplam eni, tek satırın sığdırabileceğinden gerçekten
       fazladır — yani 1. kural bir tedbir değil, bir zorunluluktur.

   4. iddia için ihtiyatlı bir alt sınır kullanılır: karakter başına
   `EN_KARAKTER` px. Tarayıcıda ölçülen gerçek değer bundan yüksekti
   (1699px toplam → ~6.34 px/karakter); alt sınır seçilmesi testin
   YANLIŞ ALARM veremeyeceği anlamına gelir — hesap gerçeğin altında
   kalır, üstünde değil.
   ═══════════════════════════════════════════════════════════════════════ */

const css = readFileSync('app/kabuk.css', 'utf8');

/** `.ab-ikincil { … }` gövdesini, medya sorgusu dışındaki temel kuraldan. */
function temelKural(): string {
  /* Medya bloklarını at, sonra temel kuralı bul. */
  const medyasiz = css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const m = medyasiz.match(/\n\.ab-ikincil\s*\{([^}]*)\}/);
  if (!m) throw new Error('.ab-ikincil temel kuralı bulunamadı');
  return m[1];
}

/** Dokunmatik bandın (`max-width: 700px`) `.ab-ikincil` gövdesi. */
function darBantKurali(): string | null {
  const bloklar = css.match(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g) ?? [];
  for (const b of bloklar) {
    if (!/max-width:\s*700px/.test(b)) continue;
    const m = b.match(/\.ab-ikincil\s*\{([^}]*)\}/);
    if (m) return m[1];
  }
  return null;
}

describe('kabuk · ikincil sıra geniş ekranda kırpılmaz', () => {
  it('temel kural SARAR — bağların hepsi ulaşılabilir [SIS-KBK-010]', () => {
    expect(temelKural()).toMatch(/flex-wrap:\s*wrap/);
  });

  it('temel kuralda gizli kaydırma çubuğu YOK [SIS-KBK-011]', () => {
    const g = temelKural();
    /* İkisi birlikte kusurun ta kendisiydi: kayan ama ipucu vermeyen sıra. */
    expect(g).not.toMatch(/scrollbar-width/);
    expect(g).not.toMatch(/overflow-x/);
  });

  it('temel kuralda sabit yükseklik YOK — ikinci satır kırpılamaz [SIS-KBK-012]', () => {
    const g = temelKural();
    expect(g).not.toMatch(/(^|[^-])height:\s*\d/);
    expect(g).toMatch(/min-height:\s*36px/);
  });

  it('yatay kaydırma yalnız dokunmatik banda izinli [SIS-KBK-013]', () => {
    const dar = darBantKurali();
    expect(dar, 'dokunmatik bant kuralı kayboldu').not.toBeNull();
    expect(dar!).toMatch(/overflow-x:\s*auto/);
    expect(dar!).toMatch(/flex-wrap:\s*nowrap/);
  });
});

/* ── Sarmanın zorunlu olduğunun kanıtı ───────────────────────────────── */

/* İhtiyatlı alt sınır: Barlow Condensed 14px büyük harf + .05em harf
   aralığı. Tarayıcıda ölçülen ~6.34; burada 6.0 kullanılır. */
const EN_KARAKTER = 6.0;
/* `.ab-ikincil a { padding: 0 10px }` */
const BAG_DOLGUSU = 20;
/* `.ab-ikincil .grup { gap: 2px; padding: 0 8px }` */
const BAG_ARASI = 2;
const GRUP_DOLGUSU = 16;
/* `.ab-ikincil { padding: 0 12px }` */
const KAP_DOLGUSU = 24;
/* Kapsam künyesi ("Zorlu Enerji · N santral") sağ uçta yer tutar. */
const KUNYE_ENI = 150;

function siraEni(gruplar: readonly { ogeler: readonly { ad: string }[] }[]): number {
  let en = KAP_DOLGUSU;
  for (const g of gruplar) {
    en += GRUP_DOLGUSU + Math.max(0, g.ogeler.length - 1) * BAG_ARASI;
    for (const o of g.ogeler) en += o.ad.length * EN_KARAKTER + BAG_DOLGUSU;
  }
  return Math.round(en);
}

describe('kabuk · sarma bir tedbir değil, ölçülmüş bir zorunluluk', () => {
  it('Uyum alanının sırası 1440px pencereye SIĞMAZ [SIS-KBK-014]', async () => {
    const { IKINCIL } = await import('@/components/kabuk/yonler');
    const en = siraEni(IKINCIL['/uyum']);
    /* Kırpma eşiği: pencere eni eksi künyenin tuttuğu yer. */
    expect(en).toBeGreaterThan(1440 - KUNYE_ENI);
  });

  it('sararken hiçbir alan iki satırı aşmaz [SIS-KBK-015]', async () => {
    const { IKINCIL } = await import('@/components/kabuk/yonler');
    /* Kabuğun yükseklik bütçesi iki satıra göre kurulu (36 + 30). Üç
       satıra taşan bir alan, gövdeden 36px daha çalar ve amiral
       ekranların tek ekrana sığma sözünü bozar. */
    const ucSatir = Object.entries(IKINCIL)
      .filter(([, gruplar]) => siraEni(gruplar) > 2 * (1280 - KUNYE_ENI))
      .map(([alan]) => alan);
    expect(ucSatir).toEqual([]);
  });

  it('hiçbir ikincil bağ adı kırpılacak kadar uzun değil [SIS-KBK-016]', async () => {
    const { IKINCIL } = await import('@/components/kabuk/yonler');
    const uzun: string[] = [];
    for (const gruplar of Object.values(IKINCIL)) {
      for (const g of gruplar) {
        for (const o of g.ogeler) {
          /* Tek bir bağ 375px'lik bandın yarısını geçerse, dokunmatikte
             kaydırma da onu okunur kılmaz. */
          if (o.ad.length * EN_KARAKTER + BAG_DOLGUSU > 190) uzun.push(o.ad);
        }
      }
    }
    expect(uzun).toEqual([]);
  });
});

/* ── Üçüncül sıra SARAMAZ — o yüzden SIĞMAK ZORUNDA ──────────────────── */

/* `.ab-ucuncul` bilerek 30px sabit ve yatay kayar: ikincil sıranın
   altında ikinci bir sarma katmanı, hiyerarşiyi okunmaz kılardı. Ama bu,
   ikincil sırayı kırpan kusurun aynısını doğurabilir. Tek koruma,
   içeriğin en dar masaüstünde GERÇEKTEN sığmasıdır.

   Burada ihtiyatlı yön TERSİNE döner: sığma iddiası için karakter eni
   ABARTILIR (Inter 13px için 7.5px), böylece test iyimserlik yapamaz. */
const UC_EN_KARAKTER = 7.5;
/* `.ab-ucuncul { padding: 0 20px }` + grup adının etiketi ve ayracı. */
const UC_KAP_DOLGUSU = 40;
const UC_GRUPAD_EK = 28;

describe('kabuk · üçüncül sıra en dar masaüstünde sığar', () => {
  it('hiçbir Varlık grubu 1024px bandını taşırmaz [SIS-KBK-017]', async () => {
    const { IKINCIL } = await import('@/components/kabuk/yonler');
    const tasan: string[] = [];
    for (const gruplar of Object.values(IKINCIL)) {
      for (const g of gruplar) {
        for (const o of g.ogeler) {
          if (!o.alt?.length) continue;
          let en = UC_KAP_DOLGUSU + UC_GRUPAD_EK + o.ad.length * UC_EN_KARAKTER;
          for (const a of o.alt) en += a.ad.length * UC_EN_KARAKTER + BAG_DOLGUSU;
          if (en > 1024) tasan.push(`${o.ad} (${Math.round(en)}px)`);
        }
      }
    }
    expect(tasan).toEqual([]);
  });
});

/* ── Rota envanteri EKSİKSİZ olmalı ──────────────────────────────────── */

/* UX denetiminde ölçüldü: `/degerlendirme-aktarim` gezinmede duruyordu,
   sayfası vardı, çalışıyordu — ama `arac/rotalar.json` içinde YOKTU. O
   dosya bütün tarayıcılı kapıların (taşma, axe, duman, UX) okuduğu tek
   listedir; listede olmayan ekran hiçbir kapıdan geçmez. Bir ekran
   sessizce denetim dışında kalmıştı.

   Bu test o boşluğu kapatır: `app/` altındaki her STATİK sayfa listede
   olmalı. Dinamik rotalar (`[id]`) dışarıdadır — kayıt kimliği olmadan
   açılamazlar ve kapılar statik rota kapılarıdır. */

describe('rota envanteri · hiçbir ekran kapıların dışında kalmaz', () => {
  it('app/ altındaki her statik sayfa rotalar.json içinde [SIS-KBK-018]', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const path = await import('node:path');

    const sayfalar: string[] = [];
    const gez = (dizin: string, url: string) => {
      for (const ad of readdirSync(dizin)) {
        const tam = path.join(dizin, ad);
        if (statSync(tam).isDirectory()) {
          /* `(giris)` grubu KABUKSUZDUR: oturum yok, gezinme yok, ray
             yok (`/giris`, `/bakim`). Kapılar oturum açıp kabuk ölçer;
             bu grup onların konusu değildir. `api/` ekran değildir.
             Öteki `(grup)` klasörleri URL'e girmez; `[dinamik]` rotalar
             kayıt kimliği ister ve statik kapılardan geçmez. */
          if (ad === '(giris)' || ad === 'api') continue;
          if (ad.startsWith('(')) gez(tam, url);
          else if (!ad.startsWith('[')) gez(tam, `${url}/${ad}`);
        } else if (ad === 'page.tsx') {
          sayfalar.push(url);
        }
      }
    };
    gez('app', '');

    const rotalar: string[] = JSON.parse(readFileSync('arac/rotalar.json', 'utf8'));
    const kayitli = new Set(rotalar);
    const beklenen = sayfalar;

    expect(beklenen.length).toBeGreaterThan(45);
    expect(beklenen.filter((y) => !kayitli.has(y))).toEqual([]);
  });
});
