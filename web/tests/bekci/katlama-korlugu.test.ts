import { describe, expect, it } from 'vitest';
import { TERIMLER, eslesmeSayisi } from './terimler';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİNİN KÖRLÜK VAKALARI (P1 · URN-ALN-003)

   Aşağıdaki yazımların HİÇBİRİ bugün depoda geçmiyor. Bu dosya bulunan
   bir borcu değil, bekçinin bir zamanlar GÖREMEDİĞİ yazımları tutuyor:
   üçü de kalıp düzeltilmeden önce sıfır eşleşme veriyordu.

   Neden kalıcı: kalıp mantığı ("iki küçültmenin birleşimi", "Unicode
   sözcük sınırı") sadeleştirilmeye açık görünür — biri "tek küçültme
   yeter" ya da "`\b` zaten çalışıyor" diye kısaltabilir. O gün depoda bu
   yazımlar bulunmadığı için bekçi YEŞİL kalır ve körlük sessizce geri
   gelir. Buradaki vakalar o sadeleştirmeyi kırmızıya çevirir.

   Her vaka iki iddia taşır:
     · ÖNCESİ — düzeltmeden önceki kalıp bu yazımı görmüyordu (0),
     · SONRASI — bugünkü kalıp görüyor (1).
   İkisi birlikte olmazsa vaka bir şey kanıtlamaz: yalnız "sonrası 1"
   demek, kalıbın hiç bozuk olmadığı ihtimalini dışarıda bırakmaz.
   ═══════════════════════════════════════════════════════════════════════ */

/** Bugünkü bekçi: `kucuk` hedefli kalıplar İKİ küçültmenin birleşiminde. */
function bugun(terimAdi: string, metin: string): number {
  const terim = TERIMLER.find((x) => x.ad === terimAdi);
  if (!terim) throw new Error(`terim yok: ${terimAdi}`);
  const kucukler = [metin.toLocaleLowerCase('tr-TR'), metin.toLowerCase()];
  return terim.kaliplar.reduce((a, { re, hedef }) => a + (hedef === 'ham'
    ? eslesmeSayisi(re, metin)
    : Math.max(...kucukler.map((m) => eslesmeSayisi(re, m)))), 0);
}

/* ── Düzeltmeden ÖNCEKİ kalıplar, olduğu gibi ──────────────────────── */
const ONCE = {
  /** v1 · cırcır kurulduğu gün: ASCII `\b`, tek `i` bayrağı. */
  unite: (m: string) => eslesmeSayisi(/ünite|\bunite\b/gi, m),
  tipKodu: (m: string) => eslesmeSayisi(/\b(JES|JEO|RES|HES|GES|DGKC|DGKÇ|TERMIK)\b/g, m),
  /** v3 · yalnız Türkçe katlama (bu adım da kördü, yönü başkaydı). */
  uniteTekKatlama: (m: string) => eslesmeSayisi(/ünite/g, m.toLocaleLowerCase('tr-TR')),
  tipKoduSinirli: (m: string) => eslesmeSayisi(
    new RegExp('(?<![\\p{L}\\p{N}_])(?:JES|JEO|RES|HES|GES|DGKC|DGKÇ|TERMIK)(?![\\p{L}\\p{N}_])', 'gu'), m),
};

describe('Bekçi körlüğü · Türkçe büyük harf katlaması', () => {
  it('ÜNİTE — değişmez katlamada GÖRÜNMEZ, Türkçe katlamada görünür [URN-ALN-007]', () => {
    /* `İ` (U+0130) değişmez katlamada `i` + birleşen nokta olur; `ünite`
       kalıbı o dizeyle eşleşmez. */
    expect('ÜNİTE'.toLowerCase()).not.toBe('ünite');
    expect('ÜNİTE'.toLocaleLowerCase('tr-TR')).toBe('ünite');
    expect(ONCE.unite('ÜNİTE 3'), 'v1 kalıbı ÜNİTE görüyordu').toBe(0);
    expect(bugun('ünite', 'ÜNİTE 3'), 'bugünkü kalıp ÜNİTE görmüyor').toBe(1);
  });

  it('TERMİK — yalnız Türkçe katlamada görünür [URN-ALN-007]', () => {
    expect(ONCE.tipKodu("tip === 'TERMİK'"), 'v1 kalıbı TERMİK görüyordu').toBe(0);
    expect(bugun('tip kodu', "tip === 'TERMİK'")).toBe(1);
  });

  it('TERMIK (ASCII I) — yalnız DEĞİŞMEZ katlamada görünür [URN-ALN-007]', () => {
    /* Türkçe katlama `I`yı `ı` yapar: `TERMIK` → `termık`. Tek başına
       Türkçe katlamaya güvenen bir tarama bu yazımı kaçırırdı. Kod
       terimleri zaten ham metinde arandığı için burada görünür — ama
       küçültmeye taşınırsa kaybolur, iddia onu sabitler. */
    expect('TERMIK'.toLocaleLowerCase('tr-TR')).toBe('termık');
    expect('TERMIK'.toLowerCase()).toBe('termik');
    expect(bugun('tip kodu', "tip === 'TERMIK'")).toBe(1);
  });

  it('UNITE (ASCII I) — yalnız DEĞİŞMEZ katlamada görünür [URN-ALN-007]', () => {
    /* `BIRIM` ile aynı sınıf: Türkçe katlama `I`yı `ı` yaptığı için
       `UNITE` → `unıte` olur ve kaybolur. `birim` bir SEKTÖR TERİMİ
       değil (çekirdeğin kendi sözcüğü), o yüzden bekçi düzeyinde
       sınanamaz; aynı tuzağı sınayan gerçek terim `unite`dir.
       Katlamanın kendisi bir alttaki vakada `BIRIM` ile sabitleniyor. */
    expect('UNITE'.toLocaleLowerCase('tr-TR')).toBe('unıte');
    expect(ONCE.uniteTekKatlama('UNITE 3'), 'tek Türkçe katlama UNITE görüyordu').toBe(0);
    expect(bugun('ünite', 'UNITE 3'), 'bugünkü kalıp UNITE görmüyor').toBe(1);
  });

  it('BIRIM — katlama yönünün kendisi sabitlenir [URN-ALN-007]', () => {
    /* Sektör terimi değil; buradaki iddia kalıba değil KATLAMAYA ait.
       İki küçültmenin birleşimi kaldırılırsa bu satır da düşer. */
    expect('BIRIM'.toLocaleLowerCase('tr-TR')).toBe('bırım');
    expect('BIRIM'.toLowerCase()).toBe('birim');
    const kucukler = ['BIRIM'.toLocaleLowerCase('tr-TR'), 'BIRIM'.toLowerCase()];
    expect(kucukler.some((m) => m.includes('birim')), 'birleşim BIRIM\'i görmüyor').toBe(true);
    expect('BIRIM'.toLocaleLowerCase('tr-TR').includes('birim'),
      'yalnız Türkçe katlama yetiyor sanıldı').toBe(false);
  });
});

describe('Bekçi körlüğü · Unicode sözcük sınırı', () => {
  it('DGKÇ — ASCII `\\b` sondaki Ç yüzünden HİÇ görmüyordu [URN-ALN-007]', () => {
    /* `\\b` ASCII tanımlı: `Ç` sözcük karakteri değil, bu yüzden `Ç`den
       sonraki `\\b` bir sözcük karakteri istiyor ve kod tek başına
       hiçbir zaman eşleşmiyordu. */
    expect(ONCE.tipKodu("tip === 'DGKÇ'"), 'v1 kalıbı DGKÇ görüyordu').toBe(0);
    expect(ONCE.tipKoduSinirli("tip === 'DGKÇ'")).toBe(1);
    expect(bugun('tip kodu', "tip === 'DGKÇ'")).toBe(1);
  });

  it('RES — ASCII `\\b` Türkçe sözcüğün ORTASINDA eşleşiyordu [URN-ALN-007]', () => {
    /* Ters yön: "SÜRESİ" içinde S | Ü | RES | İ diye bölünüyordu ve
       sektör terimi taşımayan dört dosya listeye böyle girmişti. */
    expect(ONCE.tipKodu('SÜRESİ DOLDU'), 'v1 kalıbı SÜRESİ içinde eşleşmiyordu').toBe(1);
    expect(bugun('tip kodu', 'SÜRESİ DOLDU'), 'bugünkü kalıp hâlâ yanlış pozitif veriyor').toBe(0);
    // Gerçek kod hâlâ görünüyor — düzeltme kapıyı kapatmadı.
    expect(bugun('tip kodu', "tip === 'RES'")).toBe(1);
  });

  it('şapkasız rüzgar — yazım varyantı da sektör sözcüğüdür [URN-ALN-007]', () => {
    expect(eslesmeSayisi(/jeotermal|rüzgâr|hidroelektrik/gi, 'Rüzgar santrali'),
      'eski kalıp şapkasız yazımı görüyordu').toBe(0);
    expect(bugun('üretim tipi', 'Rüzgar santrali')).toBe(1);
  });
});
