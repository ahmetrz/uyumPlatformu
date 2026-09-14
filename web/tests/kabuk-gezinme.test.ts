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
/* Kapsam künyesi ("Demo Enerji · N santral") sağ uçta yer tutar. */
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
  /* ── Grup yapısı ekran okuyucuya ULAŞIR ───────────────────────────
     Gören kullanıcı grupları dikey çizgiden ayırır (`.grup + .grup`
     border-left). Ekran okuyucu o çizgiyi göremez; grup bir rol ve ad
     taşımazsa `/uyum`un on dokuz bağı TEK yığın olarak duyulur.

     Önce `baslik?` diye İSTEĞE BAĞLI ve GÖRÜNÜR bir alan vardı; hiçbir
     alanda doldurulmamıştı (ölü kod) ve doldurulsa da `aria-hidden` ile
     gizleniyordu — yani hem ölü hem erişilemezdi. Ad bugün ZORUNLU ve
     `aria-label` olarak veriliyor: satırın eni değişmez. */
  it('[SIS-KBK-019] her ikincil grubun ADI vardır — adsız grup ekran '
    + 'okuyucuda ayrımsız bir yığın olur', async () => {
    const { IKINCIL } = await import('@/components/kabuk/yonler');
    const adsiz: string[] = [];
    for (const [alan, gruplar] of Object.entries(IKINCIL)) {
      gruplar.forEach((g, i) => {
        if (!(g.ad ?? '').trim()) adsiz.push(`${alan}[${i}]`);
      });
    }
    expect(adsiz, `adsız grup: ${adsiz.join(' ')}`).toEqual([]);
  });

  it('[SIS-KBK-019] bir alanın grup adları BİRBİRİNDEN farklıdır — aynı '
    + 'ad iki grubu tek grup gibi duyurur', async () => {
    const { IKINCIL } = await import('@/components/kabuk/yonler');
    for (const [alan, gruplar] of Object.entries(IKINCIL)) {
      const adlar = gruplar.map((g) => g.ad);
      expect(new Set(adlar).size, `${alan}: yinelenen grup adı`).toBe(adlar.length);
    }
  });

  it('[SIS-KBK-019] TERİMLİ grup adı kiracının SÖZLÜĞÜNDEN çözülür — üst '
    + 'alan "Enerji portföyü" derken grubun "Portföy" demesi, ekran '
    + 'okuyucuya ürünün kendi sözlüğünü yalanlayan bir ad duyurur', async () => {
    const { alanlariCoz, ikincilSec } = await import('@/components/kabuk/yonler');
    const sozluk = { portfoy: { tekil: 'enerji portföyü' } };

    const alan = alanlariCoz(sozluk).find((a) => a.yol === '/portfoy');
    const grup = ikincilSec('/portfoy', sozluk)[0];
    expect(grup.ad, 'grup adı sözlükten çözülmüyor').toBe(alan?.ad);

    /* Sözlük yoksa ÇEKİRDEK karşılık kalır — uydurma yok. */
    expect(ikincilSec('/portfoy')[0].ad).toBe('Portföy');
    expect(ikincilSec('/portfoy', null)[0].ad).toBe('Portföy');
  });

  it('[SIS-KBK-019] terimsiz grup adı sözlükle DEĞİŞMEZ — çekirdek kavram '
    + 'sektör paketinden ad almaz', async () => {
    const { ikincilSec } = await import('@/components/kabuk/yonler');
    const sozluk = { portfoy: { tekil: 'enerji portföyü' }, tesis: { tekil: 'santral' } };
    const once = ikincilSec('/uyum').map((g) => g.ad);
    expect(ikincilSec('/uyum', sozluk).map((g) => g.ad)).toEqual(once);
  });

  it('[SIS-KBK-019] kabuk sözlüğü ikincil sıraya GERÇEKTEN geçirir — saf '
    + 'fonksiyonun çözebiliyor olması, çağrı yerinin çözdüğü anlamına '
    + 'gelmez (sabotaj turunda yakalandı: kanca doğruydu, kablo yoktu)', () => {
    const kabuk = readFileSync('components/kabuk/Kabuk.tsx', 'utf8');
    expect(kabuk, 'ikincil sıra sözlüksüz çağrılıyor')
      .toMatch(/ikincilSec\(patika,\s*veri\.sozluk\)/);
    /* Alan adı ile grup adı AYNI kaynaktan konuşur; ikisi ayrışırsa
       ekran okuyucu "Enerji portföyü → Portföy" duyar. */
    expect(kabuk, 'alan adı başka bir sözlükten çözülüyor')
      .toMatch(/alanlariCoz\(veri\.sozluk\)/);
  });

  it('[SIS-KBK-019] kabuk grubu ROL ve AD ile çizer — ad yalnız görünür '
    + 'bir etiket olarak kalırsa erişilebilir olmaz', () => {
    const kabuk = readFileSync('components/kabuk/Kabuk.tsx', 'utf8');
    expect(kabuk, 'grup rolü yok').toContain('role="group"');
    expect(kabuk, 'grup adı aria-label değil').toContain('aria-label={grup.ad}');
    /* Eski ölü dal geri gelmesin: görünür başlık sırayı 2176'ya çıkarır
       ve iki satır bütçesi 2260'tır — ölçüm ihtiyatlı bir ALT SINIR
       kullandığı için gerçek metriklerde üçüncü satır riski vardı. */
    expect(kabuk, 'ölü görünür-başlık dalı geri gelmiş')
      .not.toContain('grup.baslik');
  });

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

/* ── DAR BANTTA SIRA KATLANIR ─────────────────────────────────────────
   Ölçülen kusur (mobil audit, 375×812): dokunmatik bantta ikincil sıra
   yatay kayıyordu ve 45 kayan rotanın 24'ünde AKTİF SEKME EKRANIN
   DIŞINDAYDI — `/egitimler`'de sıranın 1 982'nci pikselinde, beş ekran
   ötede. "Neredeyim" sorusu bakarak cevaplanamıyordu. Üstelik `/uyum`
   sırasının on dokuz bağından ÜÇÜ görünüyordu (%16).

   Kural saf bir fonksiyondadır (`katlanirMi`) ve burada gerçek gezinme
   yapısına karşı sınanır: eşik uydurulmuş bir sayı değil, ürünün
   ÖLÇÜLEN sıralarını ikiye ayıran sınırdır. */
describe('kabuk · dar bantta ikincil sıra katlanır', () => {
  it('üçten çok bağ taşıyan sıra KATLANIR [SIS-KBK-022]', async () => {
    const { ikincilSec, katlanirMi } = await import('@/components/kabuk/yonler');
    /* 375px'e sığmayan iki sıra: Uyum 19 bağ (2 111px) · Varlık 5 bağ (519px). */
    expect(katlanirMi(ikincilSec('/uyum'))).toBe(true);
    expect(katlanirMi(ikincilSec('/envanter'))).toBe(true);
  });

  it('375px’e SIĞAN sıra katlanmaz — bugünkü davranış korunur [SIS-KBK-023]', async () => {
    const { ikincilSec, katlanirMi } = await import('@/components/kabuk/yonler');
    /* İkisi de iki bağ; ölçüldü, 375px'te kaymıyorlar. */
    expect(katlanirMi(ikincilSec('/riskler'))).toBe(false);
    expect(katlanirMi(ikincilSec('/portfoy'))).toBe(false);
    /* Alanı olmayan rotada sıra YOKTUR; boş sıra katlanmaz. */
    expect(katlanirMi(ikincilSec('/'))).toBe(false);
  });

  it('eşik ürünün sıralarını İKİYE ayırır — ortada sıra yok [SIS-KBK-024]', async () => {
    const { IKINCIL, DAR_BANT_BAG_TAVANI } = await import('@/components/kabuk/yonler');
    const sayilar = Object.values(IKINCIL)
      .map((g) => g.reduce((n, x) => n + x.ogeler.length, 0))
      .sort((a, b) => a - b);
    /* Eşiğin İKİ YANINDA da gerçek sıra olmalı: bir yanı boş kalırsa
       kural ölçülmemiş bir varsayımdır, sınır değil. */
    expect(sayilar.some((n) => n <= DAR_BANT_BAG_TAVANI), 'katlanmayan sıra yok').toBe(true);
    expect(sayilar.some((n) => n > DAR_BANT_BAG_TAVANI), 'katlanan sıra yok').toBe(true);
    /* Eşik hiçbir gerçek sıranın TAM ÜSTÜNDE durmaz: tavana eşit bir sıra
       olsaydı bir bağ eklendiği gün davranış sessizce değişirdi. */
    expect(sayilar).not.toContain(DAR_BANT_BAG_TAVANI);
  });

  it('aktif bölüm grubuyla birlikte bulunur — "neredeyim" [SIS-KBK-025]', async () => {
    const { ikincilSec, aktifBolum } = await import('@/components/kabuk/yonler');
    const gruplar = ikincilSec('/uyum');
    /* Kusurun doğduğu rota: sıranın en sonundaki bağ. */
    const son = aktifBolum(gruplar, '/egitimler');
    expect(son?.grup.ad).toBe('Kayıt ve kanıt');
    expect(son?.oge.ad).toBe('Eğitim kütüğü');
    /* Alt ekranı olan öğede de grup bulunur (üçüncül sıra, Varlık). */
    const alt = aktifBolum(ikincilSec('/envanter'), '/kesif');
    expect(alt?.oge.yol).toBe('/envanter');
    /* Bu alanda olmayan bir patika aktif bölüm VERMEZ — düğme o zaman
       alan adını yazar, uydurma bir bölüm değil. */
    expect(aktifBolum(gruplar, '/envanter')).toBeNull();
  });

  it('katlanan sıra CSS’te gizlenir, seçici yalnız dar bantta çizilir [SIS-KBK-026]', () => {
    const bloklar = css.match(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g) ?? [];
    const dar = bloklar.filter((b) => /max-width:\s*700px/.test(b)).join('\n');
    /* Bant kararı CSS'in: bileşen bandı ölçseydi sunucu geniş bandı
       çizer, istemci dar bandı düzeltirdi. */
    expect(dar).toMatch(/\.ab-ikincil\[data-katlanir\]\s*>\s*\.grup\s*\{[^}]*display:\s*none/);
    expect(dar).toMatch(/\.ab-bolum\s*\{[^}]*display:\s*flex/);
    /* Geniş ekranda seçici YOKTUR: medyasız temel kural onu gizler. */
    const medyasiz = css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
    expect(medyasiz).toMatch(/\n\.ab-bolum\s*\{[^}]*display:\s*none/);
  });
});

/* ── KATLANAN SIRANIN TARAYICI KAPISI KÖR OLAMAZ ──────────────────────
   Katlamanın GERÇEK ölçüsü tarayıcıdadır (`arac/gezinme-testi.mjs`,
   `kapi-gezinme`): 375px'te seçici dokunulur, panel açılır, son gruptaki
   bölüme varılır. Burada ölçülen o değil, kapının KENDİSİDİR — kapı bir
   sınıf adına bakıyor ve bileşen o adı değiştirirse kapı hiçbir şey
   bulamadan yeşil yanardı. Seçiciler iki dosyada da AYNI olmak zorunda. */
describe('kabuk · katlama kapısı bileşene bağlı', () => {
  const kapi = readFileSync('arac/gezinme-testi.mjs', 'utf8');
  const bilesen = readFileSync('components/kabuk/BolumSecici.tsx', 'utf8');

  it('kapı katlanan sırayı GERÇEKTEN sürüyor [SIS-KBK-027]', () => {
    /* Hedef son grubun son bağıdır: kusurun doğduğu, yatay sırada
       1 982'nci pikseldeki bağ. */
    expect(kapi).toMatch(/KATLAMA\s*=\s*\{[^}]*rota:\s*'\/uyum'[^}]*hedef:\s*'\/egitimler'/);
    /* Panel açılır, bağ sayılır, grup başlığı aranır, dokunularak
       gidilir ve panelin KAPANDIĞI doğrulanır — dördü de kapıda. */
    expect(kapi).toMatch(/\.ab-bolum-dugme/);
    expect(kapi).toMatch(/panelBaglari/);
    expect(kapi).toMatch(/görünür grup başlığı/);
    expect(kapi).toMatch(/panel açık kaldı/);
    /* SIFIR ÖLÇÜM KIRMIZIDIR: seçici bulunamazsa kapı sessizce geçmez. */
    expect(kapi).toMatch(/olculenKatlama === 0[\s\S]{0,200}process\.exitCode = 1/);
  });

  it('üçüncül sıra aktif ekranı GÖRÜNÜR açar — ve sayfayı itmez [SIS-KBK-029]', () => {
    const kabuk = readFileSync('components/kabuk/Kabuk.tsx', 'utf8');
    /* Kaydırma YALNIZ sıranın kendi kutusunda olur. `scrollIntoView`
       ataları da kaydırır ve ekranı başlıktan aşağı iterdi; ölçüm bunu
       kapıda da sınıyor ama kaynakta da yasaktır. */
    expect(kabuk).toMatch(/ucunculKok/);
    expect(kabuk).toMatch(/sira\.scrollLeft\s*=/);
    expect(kabuk, 'scrollIntoView atalara dokunur — sayfayı iter')
      .not.toMatch(/ucuncul[\s\S]{0,400}scrollIntoView/);
    /* Yumuşak geçiş YOK: bu bir animasyon değil açılış konumudur. */
    expect(kabuk).not.toMatch(/scrollLeft[\s\S]{0,120}behavior/);
    /* Görünür olan öğe OYNATILMAZ: her rota değişiminde sırayı zıplatmak
       da bir kusurdur; koşul iki yönlü. */
    expect(kabuk).toMatch(/if \(sol < sira\.scrollLeft\)[\s\S]{0,240}else if \(sag >/);
    /* Kapı bunu üç rotada sürer ve sıfır ölçüm kırmızı yakar. */
    expect(kapi).toMatch(/UCUNCUL_ROTALARI\s*=\s*\[[^\]]*'\/tedarikciler'/);
    expect(kapi).toMatch(/görünür alanın DIŞINDA/);
    expect(kapi).toMatch(/sayfayı kaydırdı/);
    expect(kapi).toMatch(/olculenUcuncul === 0[\s\S]{0,200}process\.exitCode = 1/);
  });

  it('kapının seçicileri bileşenin GERÇEK sınıflarıyla aynı [SIS-KBK-028]', () => {
    /* Kapı bu üç seçiciye bakıyor; üçü de bileşende birebir olmalı.
       Bir yeniden adlandırma iki dosyadan yalnız birini değiştirirse
       kapı kör kalır ve kör kapı her zaman yeşildir. */
    for (const sec of ['ab-bolum-dugme', 'ab-bolum-menu', 'baslik']) {
      expect(kapi, `kapı "${sec}" seçicisini kullanmıyor`).toContain(sec);
      expect(bilesen, `bileşende "${sec}" sınıfı yok`).toContain(sec);
    }
    /* Panel öğeleri `role="menuitem"` taşır — kapı onu sayıyor. */
    expect(kapi).toContain('[role="menuitem"]');
    expect(bilesen).toContain("role=\"menuitem\"");
  });
});
