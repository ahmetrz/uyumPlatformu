import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tabanDogrula } from '../../arac/olcum-tabani.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · TİPOGRAFİ ÜÇ EKSENDE DE JETONDAN GELİR (URN-TIP-001)

   ── ÖLÇÜLEN KUSUR · AYNI SINIF, ÜÇ EKSEN ─────────────────────────────
   18 Eylül 2026, üç yüzey taranarak (CSS + TSX satır içi `style`):

     eksen            bildirim   benzersiz   jetondan geçen
     boy              682        23          %33
     harf aralığı     104        20          %15
     satır aralığı     83        25           %5

   Üçünde de kusur kademe SAYISI değil DAĞILIMIYDI ve üçünde de jeton
   katmanı VARDI — ürün onu kullanmıyordu. Üstelik çakışma biçimi de
   aynıydı:

     · boyda    `--t-code-lg` adında "büyük" diyor, `--t-code` ile AYNI
                değerdeydi; dört jeton 11px'te, üçü 12,5px'te çakışıyordu.
     · harf aralığında `--tr-section` · `--tr-screen` · `--tr-board`
                ÜÇÜ DE `-.01em` taşıyordu — üç ad, tek değer.

   Ad, değerin vermediği bir ayrımı vaat ettiğinde en sinsi kusuru üretir:
   değeri okuyan kimse yoktur, ADI okunur.

   ── PAYDA KÖR DOĞDU ve BU BİR BULGUDUR ────────────────────────────────
   Bu kapının İLK yazımı yalnız `app/kabuk.css`e bakıyordu ve "sapma 0"
   diyordu. Ölçüldü (aynı gün, tarayıcıda): `/uyum` ekranında 11,5px ve
   12px kademeler GÖRÜNÜYORDU — kapının hiç bakmadığı iki yüzeyden:

     · TSX satır içi `style={{ fontSize: 'var(--t-…)' }}` — **305 başvuru,
       50 dosya**. Jeton adları değişince hepsi TANIMSIZ değişkene düştü;
       tanımsız `var()` özelliği geçersiz kılar ve öğe kalıtımla gelen
       boya döner. Yani ekran sessizce bozuldu ve kapı yeşildi.
     · `components/giris/giris.module.css` — 15 bildirim, evrende HİÇ yoktu.

   Gerçek popülasyon 360 değil ~680'di; kapı %47'sini görmüyordu. Bu
   deponun dört kez ölçtüğü sınıf budur: **payda kör olduğunda oran her
   zaman iyi görünür.**

   ── DİŞLER (her eksen için AYRI koşar) ────────────────────────────────
   1 · JETONDAN GEÇ — her bildirim ya `var(--ön-ek*)` kullanır ya izin
       listesinde EKSENİYLE, DEĞERİYLE ve SAYISIYLA durur.
   2 · TAVAN — bir istisna değerinin sayısı `azami`yi aşamaz.
   3 · ÖLÜ SATIR YOK — kaynakta karşılığı kalmayan izin satırı kırmızıdır.
   4 · JETON ÇAKIŞMASI YOK — iki jeton aynı değeri taşıyamaz.
   5 · ÖLÜ JETON YOK — tanımlanan her jeton en az bir kez KULLANILIR.
   6 · TANIMSIZ JETON YOK — başvurulan her jeton TANIMLI olmalıdır.
       305 başvuruluk regresyonun karşılığıdır; ekranda görünmesini
       beklemek geç kalmaktır.
   7 · ÖLÇÜM TABANI — tarama en az N bildirim görmeli.
   8 · AYIRT EDİLEBİLİR KADEME — sayısal eksenlerde komşu kademeler
       arasındaki oran %8'in altına inemez. 1,15 ile 1,2 arasındaki %4,
       hiçbir okuyucuya hiyerarşi anlatmaz; hiyerarşi değil TEKRAR üretir.
   ═══════════════════════════════════════════════════════════════════════ */

/** Yorumsuz kaynak: gerekçe metnindeki sayı kural sayılmaz. */
const yorumsuz = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Taranan yüzeyler — evren burada kurulur ve dar kurulursa kapı körleşir. */
function dosyalar(kok: string, uzanti: string[]): string[] {
  const cikti: string[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      if (ad === 'node_modules' || ad === '.next') continue;
      const yol = join(d, ad);
      if (statSync(yol).isDirectory()) gez(yol);
      else if (uzanti.some((u) => ad.endsWith(u))) cikti.push(yol);
    }
  };
  gez(kok);
  return cikti;
}

const CSS_DOSYALARI = ['app', 'components'].flatMap((k) => dosyalar(k, ['.css']));
const KOD_DOSYALARI = ['app', 'components', 'lib'].flatMap((k) => dosyalar(k, ['.tsx', '.ts']));

/** `globals.css` belge katmanıdır: `.ab` jetonlarını GÖREMEZ (kendi
    yorumunda yazılı). Evrenin dışında tutulması bir karardır, körlük değil. */
const OLCULEN_CSS = CSS_DOSYALARI.filter((y) => !y.endsWith('globals.css'));

const cssMetni = OLCULEN_CSS.map((y) => yorumsuz(readFileSync(y, 'utf8'))).join('\n');
const kodMetni = KOD_DOSYALARI.map((y) => readFileSync(y, 'utf8')).join('\n');
const kabukCss = yorumsuz(readFileSync('app/kabuk.css', 'utf8'));

type Eksen = {
  ad: string;
  onEk: string;
  cssKalip: RegExp;
  kodKalip: RegExp;
  /** Sayısal ölçek mi? Yalnız sayısal eksende komşu oran ölçülür. */
  sayisal: boolean;
};

const EKSENLER: Eksen[] = [
  { ad: 'boy', onEk: '--t-', cssKalip: /font-size:\s*([^;}]+)[;}]/g, kodKalip: /fontSize:\s*'([^']+)'/g, sayisal: true },
  { ad: 'iz', onEk: '--tr-', cssKalip: /letter-spacing:\s*([^;}]+)[;}]/g, kodKalip: /letterSpacing:\s*'([^']+)'/g, sayisal: false },
  { ad: 'satir', onEk: '--lh-', cssKalip: /line-height:\s*([^;}]+)[;}]/g, kodKalip: /lineHeight:\s*'([^']+)'/g, sayisal: true },
];

function olc(e: Eksen) {
  const css = [...cssMetni.matchAll(e.cssKalip)].map((m) => m[1].trim());
  const kod = [...kodMetni.matchAll(e.kodKalip)].map((m) => m[1].trim());
  const hepsi = [...css, ...kod];
  const jetonlu = hepsi.filter((d) => d.startsWith(`var(${e.onEk}`));
  const tanimlar = new Map(
    [...kabukCss.matchAll(new RegExp(`(${e.onEk}[a-z-]+):\\s*([^;]+);`, 'g'))]
      .map((m) => [m[1], m[2].trim()] as const),
  );
  const basvurular = new Set(
    [...`${cssMetni}\n${kodMetni}`.matchAll(new RegExp(`var\\((${e.onEk}[a-z-]+)\\)`, 'g'))].map((m) => m[1]),
  );
  return { hepsi, kod, jetonlu, jetonsuz: hepsi.filter((d) => !d.startsWith('var(')), tanimlar, basvurular };
}

const IZIN = JSON.parse(readFileSync('tests/bekci/tipografi-izin.json', 'utf8')) as {
  istisnalar: { eksen: string; deger: string; azami: number; sinif: string; sebep: string }[];
};

describe('Tipografi üç eksende de jetondan gelir [URN-TIP-001]', () => {
  it('ÖLÇÜM TABANI · ÜÇ EKSENİN DE paydası ölçülüyor [URN-TIP-001]', () => {
    /* Taban ekseni BAŞINADIR. İlk yazımda yalnız `boy` tabanlıydı ve bu
       aynı körlüğün yeni kılığıydı: iz ya da satır tarayıcısı sıfıra
       düşse kapı yeşil kalırdı — payda kör olduğunda oran her zaman iyi
       görünür ve bu deponun DÖRT KEZ ölçtüğü sınıf budur. */
    const TABAN: Record<string, string> = {
      boy: 'tipografi.bildirim',
      iz: 'tipografi.izBildirimi',
      satir: 'tipografi.satirBildirimi',
    };
    for (const e of EKSENLER) tabanDogrula(TABAN[e.ad], olc(e).hepsi.length);
    /* Kapının ilk yazımı TSX'i hiç görmüyordu; evrenin kod tarafı
       boşalırsa aynı körlük sessizce geri gelir. */
    expect(olc(EKSENLER[0]).kod.length, 'TSX satır içi fontSize hiç görülmedi — tarama körleşmiş').toBeGreaterThan(0);
    expect(OLCULEN_CSS.length).toBeGreaterThan(1);
  });

  for (const e of EKSENLER) {
    const m = olc(e);
    const izinliler = IZIN.istisnalar.filter((i) => i.eksen === e.ad);

    it(`BİRİNCİ DİŞ · ${e.ad}: jeton dışı her bildirim izin listesinde [URN-TIP-001]`, () => {
      const izinli = new Set(izinliler.map((i) => i.deger));
      const kacak = [...new Set(m.jetonsuz)].filter((d) => !izinli.has(d));
      expect(kacak, `${e.ad} ekseninde jeton dışı ve BEYANSIZ:\n  ${kacak.join('\n  ')}\n`
        + `Ya bir \`${e.onEk}*\` jetonu kullanın, ya tipografi-izin.json içine `
        + 'EKSENİYLE, DEĞERİYLE, SAYISIYLA ve gerekçesiyle yazın.').toEqual([]);
    });

    it(`İKİNCİ DİŞ · ${e.ad}: istisna sayısı tavanı aşmıyor [URN-TIP-001]`, () => {
      const asan = izinliler
        .map((i) => ({ ...i, gercek: m.jetonsuz.filter((d) => d === i.deger).length }))
        .filter((i) => i.gercek > i.azami)
        .map((a) => `${a.deger}: azami ${a.azami}, gerçek ${a.gercek}`);
      expect(asan, 'İstisna listesi YALNIZ KÜÇÜLÜR.').toEqual([]);
    });

    it(`ÜÇÜNCÜ DİŞ · ${e.ad}: izin listesinde ölü satır yok [URN-TIP-001]`, () => {
      const olu = izinliler.filter((i) => !m.jetonsuz.includes(i.deger)).map((o) => o.deger);
      expect(olu, 'Kaynakta karşılığı kalmayan izin satırı, olmayan bir istisna gösterir.').toEqual([]);
    });

    it(`DÖRDÜNCÜ DİŞ · ${e.ad}: iki jeton aynı değeri taşımıyor [URN-TIP-001]`, () => {
      const tersi = new Map<string, string[]>();
      for (const [ad, deger] of m.tanimlar) tersi.set(deger, [...(tersi.get(deger) ?? []), ad]);
      const cakisan = [...tersi.entries()].filter(([, a]) => a.length > 1).map(([d, a]) => `${d} ← ${a.join(', ')}`);
      expect(cakisan, 'Aynı değeri taşıyan iki jeton, olmayan bir ayrımı vaat eder.').toEqual([]);
    });

    it(`BEŞİNCİ DİŞ · ${e.ad}: tanımlanan her jeton kullanılıyor [URN-TIP-001]`, () => {
      const olu = [...m.tanimlar.keys()].filter((ad) => !m.basvurular.has(ad));
      expect(olu, 'Kullanılmayan jeton, var olmayan bir kademe vaat eder.').toEqual([]);
    });

    it(`ALTINCI DİŞ · ${e.ad}: başvurulan her jeton TANIMLI [URN-TIP-001]`, () => {
      const tanimsiz = [...m.basvurular].filter((ad) => !m.tanimlar.has(ad));
      expect(tanimsiz, 'Tanımsız jeton başvurusu: özellik geçersiz olur ve '
        + 'öğe kalıtımla gelen boya SESSİZCE döner.').toEqual([]);
    });

    it(`KAPSAM · ${e.ad}: bildirimlerin ezici çoğunluğu jetondan geçiyor [URN-TIP-001]`, () => {
      const oran = m.jetonlu.length / m.hepsi.length;
      expect(oran, `${e.ad}: jetondan geçen ${m.jetonlu.length}/${m.hepsi.length}`).toBeGreaterThan(0.9);
    });

    if (e.sayisal) {
      it(`SEKİZİNCİ DİŞ · ${e.ad}: komşu kademeler ayırt edilebilir [URN-TIP-001]`, () => {
        const degerler = [...m.tanimlar.values()].map((v) => parseFloat(v));
        expect(new Set(degerler).size).toBe(degerler.length);
        const sirali = [...degerler].sort((a, b) => a - b);
        const zayif = sirali.slice(1)
          .map((d, i) => ({ alt: sirali[i], ust: d, oran: d / sirali[i] }))
          .filter((a) => a.oran < 1.08)
          .map((z) => `${z.alt} → ${z.ust} (×${z.oran.toFixed(3)})`);
        expect(zayif, 'Ayırt edilemeyen komşu kademe, hiyerarşi değil tekrar üretir.').toEqual([]);
      });
    }
  }
});
