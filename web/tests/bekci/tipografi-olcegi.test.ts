import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tabanDogrula } from '../../arac/olcum-tabani.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · TİPOGRAFİK ÖLÇEK JETONDAN GELİR (URN-TIP-001)

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   18 Eylül 2026, `app/kabuk.css` (yorumlar çıkarılarak taranmıştır):

     · 360 `font-size` bildiriminin **240'ı (%66) jeton katmanını
       ATLIYORDU** — jeton katmanı vardı ve ürünün üçte ikisi onu
       kullanmıyordu.
     · Jeton katmanının KENDİSİ de şişmişti: 15 jeton yalnız 10 ayrı
       değere çakışıyordu. Dördü (`--t-colhead` · `--t-code` ·
       `--t-caption` · `--t-code-lg`) aynı 11px'i, üçü (`--t-cell` ·
       `--t-field` · `--t-body`) aynı 12,5px'i taşıyordu.
     · `--t-code-lg` adında "büyük" diyordu ve `--t-code` ile AYNI
       değerdeydi. Bu en sinsisidir: değeri okuyan kimse yok, ADI okunuyor
       ve ad olmayan bir ayrımı vaat ediyor.

   Asıl kusur kademe SAYISI değil DAĞILIMIYDI: üç piksel aralığında altı
   kademe (11 · 12 · 12,5 · 13 · 13,5 · 14) ve tek başına 11px bütün
   bildirimlerin %44'ü; üst uç ise neredeyse boş. Ortada yığılmış bir
   ölçek hiyerarşi ANLATMAZ — aynı şeyi söylemenin altı yolunu üretir.

   ── PAYDA KÖR DOĞDU ve BU BİR BULGUDUR ────────────────────────────────
   Bu kapının İLK yazımı yalnız `app/kabuk.css`e bakıyordu ve "sapma 0"
   diyordu. Ölçüldü (aynı gün, tarayıcıda): `/uyum` ekranında 11,5px ve
   12px kademeler GÖRÜNÜYORDU — kapının hiç bakmadığı iki yüzeyden:

     · TSX satır içi `style={{ fontSize: 'var(--t-…)' }}` — **305 başvuru,
       50 dosya**. Jeton adları değişince hepsi TANIMSIZ değişkene
       düştü; tanımsız `var()` özelliği geçersiz kılar ve öğe kalıtımla
       gelen boya döner. Yani ekran sessizce bozuldu ve kapı yeşildi.
     · `components/giris/giris.module.css` — 15 bildirim, kapının
       evreninde HİÇ yoktu.

   Gerçek popülasyon 360 değil ~680'di; kapı %47'sini görmüyordu. Bu
   deponun dört kez ölçtüğü sınıf budur: **payda kör olduğunda oran her
   zaman iyi görünür.** Bugün tarama üç yüzeyi birden gezer ve tanımsız
   jeton başvurusu AYRI bir diştir.

   ── DİŞLER ────────────────────────────────────────────────────────────
   1 · JETONDAN GEÇ — her `font-size` ya `var(--t-*)` kullanır ya izin
       listesinde ADIYLA ve SAYISIYLA durur.
   2 · TAVAN — bir istisna değerinin sayısı `azami`yi aşamaz.
   3 · ÖLÜ SATIR YOK — kaynakta karşılığı kalmayan izin satırı kırmızıdır.
   4 · JETON ÇAKIŞMASI YOK — iki jeton aynı değeri taşıyamaz
       (`--t-code-lg` sınıfı).
   5 · ÖLÜ JETON YOK — tanımlanan her jeton en az bir kez KULLANILIR.
   6 · TANIMSIZ JETON YOK — başvurulan her `--t-*` TANIMLI olmalıdır.
       Bu diş yukarıdaki 305 başvuruluk regresyonun karşılığıdır ve
       kaynağa bakar; ekranda görünmesini beklemek geç kalmaktır.
   7 · ÖLÇÜM TABANI — tarama en az N bildirim görmeli. Sıfır bildirim
       gören bir tarama da "sapma 0" der.
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
    yorumunda yazılı) ve oradaki tek boy belge tabanıdır. Evrenin dışında
    tutulması bir karardır, körlük değil. */
const OLCULEN_CSS = CSS_DOSYALARI.filter((y) => !y.endsWith('globals.css'));

const cssMetni = OLCULEN_CSS.map((y) => yorumsuz(readFileSync(y, 'utf8'))).join('\n');
const kodMetni = KOD_DOSYALARI.map((y) => readFileSync(y, 'utf8')).join('\n');

/** Bütün `font-size` bildirimleri (CSS) + satır içi `fontSize` (TSX). */
const cssBildirim = [...cssMetni.matchAll(/font-size:\s*([^;}]+)[;}]/g)].map((m) => m[1].trim());
const kodBildirim = [...kodMetni.matchAll(/fontSize:\s*'([^']+)'/g)].map((m) => m[1].trim());
const bildirimler = [...cssBildirim, ...kodBildirim];
const jetonlu = bildirimler.filter((d) => d.startsWith('var(--t-'));
const jetonsuz = bildirimler.filter((d) => !d.startsWith('var(--t-'));

/** Jeton tanımları (yalnız kabuk.css tanımlar) ve BAŞVURULAR (her yer). */
const tanimlar = new Map(
  [...yorumsuz(readFileSync('app/kabuk.css', 'utf8')).matchAll(/(--t-[a-z-]+):\s*([0-9.]+px)\s*;/g)]
    .map((m) => [m[1], m[2]] as const),
);
const basvurular = new Set(
  [...`${cssMetni}\n${kodMetni}`.matchAll(/var\((--t-[a-z-]+)\)/g)].map((m) => m[1]),
);

const IZIN = JSON.parse(readFileSync('tests/bekci/tipografi-izin.json', 'utf8')) as {
  istisnalar: { deger: string; azami: number; sinif: string; sebep: string }[];
};

describe('Tipografik ölçek jetondan gelir [URN-TIP-001]', () => {
  it('ÖLÇÜM TABANI · tarama üç yüzeyi de görüyor [URN-TIP-001]', () => {
    tabanDogrula('tipografi.bildirim', bildirimler.length);
    /* Kapının ilk yazımı TSX'i hiç görmüyordu; evrenin kod tarafı
       boşalırsa aynı körlük sessizce geri gelir. */
    expect(kodBildirim.length, 'TSX satır içi fontSize hiç görülmedi — tarama körleşmiş').toBeGreaterThan(0);
    expect(OLCULEN_CSS.length).toBeGreaterThan(1);
  });

  it('BİRİNCİ DİŞ · jeton dışı her bildirim izin listesinde [URN-TIP-001]', () => {
    const izinli = new Set(IZIN.istisnalar.map((i) => i.deger));
    const kacak = [...new Set(jetonsuz)].filter((d) => !izinli.has(d));
    expect(kacak, `Jeton dışı ve BEYANSIZ font-size:\n  ${kacak.join('\n  ')}\n`
      + 'Ya bir `--t-*` jetonu kullanın, ya tipografi-izin.json içine '
      + 'DEĞERİYLE, SAYISIYLA ve gerekçesiyle yazın.').toEqual([]);
  });

  it('İKİNCİ DİŞ · istisna sayısı tavanı aşmıyor [URN-TIP-001]', () => {
    const asanlar = IZIN.istisnalar
      .map((i) => ({ ...i, gercek: jetonsuz.filter((d) => d === i.deger).length }))
      .filter((i) => i.gercek > i.azami);
    expect(asanlar.map((a) => `${a.deger}: azami ${a.azami}, gerçek ${a.gercek}`),
      'İstisna listesi YALNIZ KÜÇÜLÜR.').toEqual([]);
  });

  it('ÜÇÜNCÜ DİŞ · izin listesinde ölü satır yok [URN-TIP-001]', () => {
    const olu = IZIN.istisnalar.filter((i) => !jetonsuz.includes(i.deger));
    expect(olu.map((o) => o.deger),
      'Kaynakta karşılığı kalmayan izin satırı, olmayan bir istisna gösterir.').toEqual([]);
  });

  it('DÖRDÜNCÜ DİŞ · iki jeton aynı değeri taşımıyor [URN-TIP-001]', () => {
    const tersi = new Map<string, string[]>();
    for (const [ad, deger] of tanimlar) tersi.set(deger, [...(tersi.get(deger) ?? []), ad]);
    const cakisan = [...tersi.entries()].filter(([, adlar]) => adlar.length > 1);
    expect(cakisan.map(([d, a]) => `${d} ← ${a.join(', ')}`),
      'Aynı değeri taşıyan iki jeton, olmayan bir ayrımı vaat eder.').toEqual([]);
  });

  it('BEŞİNCİ DİŞ · tanımlanan her jeton kullanılıyor [URN-TIP-001]', () => {
    const olu = [...tanimlar.keys()].filter((ad) => !basvurular.has(ad));
    expect(olu, 'Kullanılmayan jeton, var olmayan bir kademe vaat eder.').toEqual([]);
  });

  it('ALTINCI DİŞ · başvurulan her jeton TANIMLI [URN-TIP-001]', () => {
    /* ÖLÇÜLDÜ: jeton adları değişince 50 dosyadaki 305 satır içi başvuru
       tanımsıza düştü. Tanımsız `var()` özelliği geçersiz kılar — ekran
       sessizce kalıtıma döner, hiçbir kapı kırmızı yanmaz. */
    const tanimsiz = [...basvurular].filter((ad) => !tanimlar.has(ad));
    expect(tanimsiz, 'Tanımsız jeton başvurusu: özellik geçersiz olur ve '
      + 'öğe kalıtımla gelen boya SESSİZCE döner.').toEqual([]);
  });

  it('ÖLÇEK · kademeler artan, tekrarsız ve ayırt edilebilir [URN-TIP-001]', () => {
    const degerler = [...tanimlar.values()].map((v) => parseFloat(v));
    expect(new Set(degerler).size).toBe(degerler.length);
    const sirali = [...degerler].sort((a, b) => a - b);
    const zayif = sirali.slice(1)
      .map((d, i) => ({ alt: sirali[i], ust: d, oran: d / sirali[i] }))
      .filter((a) => a.oran < 1.08);
    expect(zayif.map((z) => `${z.alt} → ${z.ust} (×${z.oran.toFixed(3)})`),
      'Ayırt edilemeyen komşu kademe, hiyerarşi değil tekrar üretir.').toEqual([]);
  });

  it('KAPSAM · bildirimlerin ezici çoğunluğu jetondan geçiyor [URN-TIP-001]', () => {
    const oran = jetonlu.length / bildirimler.length;
    expect(oran, `jetondan geçen ${jetonlu.length}/${bildirimler.length}`)
      .toBeGreaterThan(0.95);
  });
});
