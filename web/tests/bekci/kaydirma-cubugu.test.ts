import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { tabanKarari, tabanOku } from '../../arac/olcum-tabani.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · KAYDIRMA ÇUBUĞU DA ÜRÜNÜN PARÇASIDIR (URN-CBK-001)

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Kullanıcı geri bildirimi (15 Eyl 2026): "anasayfadaki kaydırma çubuğu
   siteyle uyumsuz görünüyor". Tarayıcıda ölçüldü (1600×900, üretim
   derlemesi): ana sayfada kayan TEK kap tesis şeridiydi (`div.kartlar`,
   3 624px taşma) ve kaydırma çubuğu için HİÇBİR kararı yoktu —
   `scrollbar-width: auto` · `scrollbar-color: auto`. Çubuğu işletim
   sistemi çiziyordu: kalın, yuvarlak uçlu, açık gri bir başparmak.
   Ürün radius 0, saç çizgisi ve ölçülü mürekkeple kurulu; o çubuk
   ekrandaki en parlak ve en yuvarlak nesneydi.

   Kusurun sınıfı "tek tek doğru, birlikte tutarsız"tır: her jeton
   ölçülüydü, hiçbiri kaydırma çubuğunu KAPSAMIYORDU. Kapılar da göremez
   — başsız tarayıcı örtüşen (overlay) çubuk çizer ve ölçüde 0px görünür
   (ölçüldü: dört ayrı bayrak kombinasyonunda da 0px). Bu yüzden ölçü
   ekranda değil KAYNAKTA alınır.

   ── KURAL ─────────────────────────────────────────────────────────────
   (1) Karar KABUĞUN KÖKÜNDEDİR ve İKİ KURALDIR, çünkü `scrollbar-color`
       kalıtımlı, `scrollbar-width` DEĞİLDİR. Renk `.ab`ten iner; incelik
       `.ab, .ab *` ile her öğeye yazılır. Bu ayrım tarayıcıda ölçüldü:
       ikisi de yalnız `.ab`e yazıldığında şeridin hesaplanan değeri
       `auto / rgb(106,118,121)` çıkıyordu — renk inmiş, GENİŞLİK
       İNMEMİŞTİ. Kaynağa bakan bir bekçi bunu göremez; bu yüzden diş
       iki kuralı da ADIYLA arar.
   (2) Renk JETONDAN gelir (`--cubuk`) ve belge kökündeki literal
       (`globals.css`) ondan SAPAMAZ — iki kaynak bir gün ayrışır.
   (3) `::-webkit-scrollbar` yalnız `display: none` biçiminde kalabilir.
       Renk/boy veren bir `::-webkit-scrollbar` kuralı Chromium'da
       çubuğu örtüşen kipten KLASİK kipe düşürür: çubuk her platformda
       kalıcı olarak yer kaplar ve fotoğrafik alandan piksel çalar.
   (4) Çubuğu GİZLEMEK istisnadır ve listesi burada, adıyla durur. Bu
       depo dersi ölçtü: `.ab-ikincil` 1440px'te gizli çubukla üç ekranı
       bulunamaz kılmıştı. Liste yalnız küçülür; ölü satır taşıyamaz.
   (5) ÖLÇÜM TABANI: tarama en az N kayan kap kararı görmeli
       (`kabuk.kayanKap`); sıfır ölçümle "temiz" denmez.
   ═══════════════════════════════════════════════════════════════════════ */

/** Yorumsuz CSS: kural ararken yorum metni kural sayılmaz. */
const yorumsuz = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const CSS = yorumsuz(readFileSync('app/kabuk.css', 'utf8'));
const BELGE_CSS = yorumsuz(readFileSync('app/globals.css', 'utf8'));

type Kural = { secici: string; govde: string };

function kurallar(css: string): Kural[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ secici: m[1].trim().split('\n').pop()!.trim(), govde: m[2] }));
}

const KURALLAR = kurallar(CSS);

/* Çubuğun GİZLİ olduğu tek yer: yatay kayan GEZİNME sıraları, dar bantta.
   Gerekçe her satırda; liste yalnız küçülür. */
const GIZLI_IZINLI: [string, string][] = [
  ['.ab-ust > nav', 'alan sekmeleri dar bantta kayar — 36px sırada çubuk yüksekliği yok'],
  ['.ab-ust', 'üst çubuk 1100px altında kayar — marka yapışkan, çubuk sırayı böler'],
  ['.ab-ikincil', 'ikincil sıra ≤700px kayar — geniş bantta KAYMAZ, sarar (gizli çubuk kusuru orada ölçüldü)'],
  ['.ab-ucuncul', 'üçüncül sıra 30px sabittir — 8px çubuk satırın dörtte birini yer'],
  ['.ab-ikili', 'kip ikilisi dar bantta kayar — iki düğmelik grup, çubuk grubu böler'],
];

describe('bekçi · kaydırma çubuğu ürün kararıdır [URN-CBK-001]', () => {
  const kayanKaplar = [...CSS.matchAll(/overflow(-x|-y)?:\s*(auto|scroll)/g)];

  it('ÖLÇÜM TABANI — tarama gerçekten kayan kap görüyor [SIS-CBK-001]', () => {
    const hata = tabanKarari('kabuk.kayanKap', kayanKaplar.length, tabanOku().tabanlar);
    expect(hata, hata ?? '').toBeNull();
  });

  it('renk kararı kabuğun KÖKÜNDE bir kez verilir ve jetondan gelir [SIS-CBK-001]', () => {
    const kok = KURALLAR.find((k) => k.secici === '.ab' && /scrollbar-color/.test(k.govde));
    expect(kok, '`.ab` çubuk rengini taşımıyor — kalıtım kaynağı yok').toBeDefined();
    expect(kok!.govde).toMatch(/scrollbar-color:\s*var\(--cubuk\)\s+transparent/);
  });

  it('incelik KALITIMSIZDIR: kabuğun altındaki her öğeye yazılır [SIS-CBK-001]', () => {
    /* `scrollbar-width` kalıtılmaz. Yalnız `.ab`te kalırsa kayan kapların
       hesaplanan değeri `auto` döner ve çubuk işletim sisteminin
       kalınlığında çizilir — ölçüldü, kusurun kendisi budur. */
    const genislik = KURALLAR.filter((k) => /scrollbar-width:\s*thin/.test(k.govde));
    expect(genislik.length, 'incelik kuralı yok').toBeGreaterThan(0);
    const torunKapsar = genislik.some((k) => /\.ab\s*\*/.test(k.secici));
    expect(torunKapsar, `incelik yalnız şu seçicilerde: ${genislik.map((k) => k.secici).join(' · ')}`
      + ' — `scrollbar-width` kalıtımsızdır, torunları kapsayan bir kural şart').toBe(true);
  });

  it('belge kökü aynı kararı taşır ve jetondan SAPMAZ [SIS-CBK-001]', () => {
    const jeton = CSS.match(/--cubuk:\s*(#[0-9A-Fa-f]{6})/);
    expect(jeton, '`--cubuk` jetonu palette yok').not.toBeNull();
    const html = kurallar(BELGE_CSS).find((k) => k.secici === 'html');
    expect(html, 'globals.css `html` kuralı yok').toBeDefined();
    expect(html!.govde).toMatch(/scrollbar-width:\s*thin/);
    const literal = html!.govde.match(/scrollbar-color:\s*(#[0-9A-Fa-f]{6})\s+transparent/);
    expect(literal, 'belge kökü çubuk rengini literal olarak bildirmiyor').not.toBeNull();
    expect(literal![1].toLowerCase(), 'belge kökü literali `--cubuk` jetonundan AYRIŞTI')
      .toBe(jeton![1].toLowerCase());
  });

  it('hiçbir kap kararı `auto`ya geri çevirmez [SIS-CBK-001]', () => {
    const geri = KURALLAR.filter((k) => /scrollbar-(width|color):\s*auto/.test(k.govde))
      .map((k) => k.secici);
    expect(geri).toEqual([]);
  });

  it('`::-webkit-scrollbar` yalnız gizleme biçiminde kalır [SIS-CBK-001]', () => {
    /* Renk/boy veren bir kural çubuğu klasik kipe düşürür ve ikinci bir
       kaynak açar; ikisi de bilerek yasak. */
    const kusurlu = KURALLAR
      .filter((k) => k.secici.includes('::-webkit-scrollbar'))
      .filter((k) => !/^\s*display:\s*none;?\s*$/.test(k.govde))
      .map((k) => `${k.secici} {${k.govde.trim()}}`);
    expect(kusurlu).toEqual([]);
  });

  it('çubuğu gizleyen her kural izin listesindedir [SIS-CBK-001]', () => {
    const izinli = new Set(GIZLI_IZINLI.map(([s]) => s));
    const disarida = KURALLAR
      .filter((k) => /scrollbar-width:\s*none/.test(k.govde))
      .map((k) => k.secici)
      .filter((s) => !izinli.has(s));
    expect(disarida).toEqual([]);
  });

  it('izin listesi ölü satır taşımaz [SIS-CBK-001]', () => {
    const gizleyen = new Set(KURALLAR
      .filter((k) => /scrollbar-width:\s*none/.test(k.govde))
      .map((k) => k.secici));
    const olu = GIZLI_IZINLI.filter(([s]) => !gizleyen.has(s)).map(([s]) => s);
    expect(olu).toEqual([]);
  });

  it('gizleme yalnız GEZİNME sıralarında — içerik kabı çubuğunu gizleyemez [SIS-CBK-001]', () => {
    /* Kayan bir İÇERİK kabında (şerit, tablo, tuval, matris) çubuk tek
       affordanstır. Gezinme sıraları `.ab-ust` · `.ab-ikincil` ·
       `.ab-ucuncul` · `.ab-ikili` ile başlar; başka bir seçici bu listeye
       giremez. */
    const gezinme = /^\.ab-(ust|ikincil|ucuncul|ikili)\b/;
    const icerik = GIZLI_IZINLI.filter(([s]) => !gezinme.test(s)).map(([s]) => s);
    expect(icerik).toEqual([]);
  });
});
