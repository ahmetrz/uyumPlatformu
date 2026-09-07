import { describe, expect, it } from 'vitest';
import { TERIMLER, eslesmeSayisi, taranacakDosyalar } from './terimler';
import { readFileSync } from 'node:fs';
import { katlamaliVarMi } from '../../arac/turkce-arama.mjs';

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

/* ═══════════════════════════════════════════════════════════════════════
   KÜÇÜK HARFLİ KOD BİÇİMLERİ

   Kodlar (`JES` · `RES` · `HES` · `GES` · `DGKÇ`) HAM metinde, büyük
   harfle aranır. Gerekçe sağlam: küçültülmüş metinde `res` "süresi",
   `hes` "hesap", `jes` "jest", `ges` "gerekli" içine düşer ve bekçi
   yanlış pozitif üretir. Ayrım büyük/küçük harf SINIRINDADIR, katlamada
   değil.

   Bunun bedeli: küçük harfle yazılmış kod biçimleri görünmez. İki şekil
   ayrı ayrı ölçüldü ve ayrı kararlar verildi.
   ═══════════════════════════════════════════════════════════════════════ */

/** camelCase kod biçimi — `hesId`, `resKapasite`, `jesSayisi`, `gesTipi`. */
const CAMEL_ORTA = /(?<=[a-z])(Jes|Res|Hes|Ges)(?=[A-Z0-9]|$)/g;
const CAMEL_BAS = /\b(jes|res|hes|ges)(?=[A-Z])/g;

describe('Bekçi körlüğü · küçük harfli kod biçimi', () => {
  it('camelCase kod biçimi depoda HİÇ geçmiyor (ölçüm) [URN-ALN-007]', () => {
    /* Karar bu ölçüme dayanıyor: eşleşme OLSAYDI bunlar bekçinin
       göremediği gerçek borç olurdu ve izin listesine gerekçesiyle
       eklenmeleri gerekirdi (alt küme dişini meşru ihlal eden ikinci
       durum). Eşleşme YOK — o yüzden kalıp bekçiye EKLENMEDİ ve körlük
       burada, ölçülebilir biçimde tutuluyor.

       Bu iddia ileriye dönüktür: biri yarın `hesId` yazarsa test
       KIRMIZI döner. O gün iki seçenek vardır — tanımlayıcıyı sektörsüz
       adlandırmak (yeğlenen) ya da kalıbı bekçiye ekleyip yanlış
       pozitifleri ayrı ayrı elemek. */
    const bulunan: string[] = [];
    for (const d of taranacakDosyalar()) {
      const metin = readFileSync(d, 'utf8');
      for (const re of [CAMEL_ORTA, CAMEL_BAS]) {
        for (const m of metin.matchAll(new RegExp(re.source, re.flags))) {
          bulunan.push(`${d} → ${m[0]}`);
        }
      }
    }
    expect(bulunan,
      'camelCase kod biçimi belirdi: ya tanımlayıcıyı sektörsüz adlandırın '
      + 'ya da bekçiye kalıbı ekleyip yanlış pozitifleri eleyin')
      .toEqual([]);
  });

  it('bugünkü bekçi camelCase kod biçimini GÖRMÜYOR — bilinçli [URN-ALN-007]', () => {
    for (const yazim of ['hesId', 'resKapasite', 'jesSayisi', 'gesTipi', 'santralHes']) {
      expect(bugun('tip kodu', `const ${yazim} = 1;`), yazim).toBe(0);
    }
  });

  it('küçük harf araması neden yapılmıyor — yanlış pozitif kanıtı [URN-ALN-007]', () => {
    /* "Kodları küçültülmüş metinde de arayalım" önerisi bu satırda düşer:
       dört sıradan Türkçe sözcük eşleşir. */
    const duzKucuk = /\b(jes|res|hes|ges)\b/g;
    const tuzak = 'hesap resim jest gerekli süresi';
    expect(eslesmeSayisi(duzKucuk, tuzak), 'sınırlı kalıp yakalamadı').toBe(0);
    const sinirsiz = /(jes|res|hes|ges)/g;
    expect(eslesmeSayisi(sinirsiz, tuzak),
      'sınırsız küçük harf araması masum sözcükleri yakalar').toBeGreaterThan(3);
  });

  /* ── ÖLÇÜM SONDALARI DA AYNI TUZAĞA DÜŞÜYOR ────────────────────────
     Bekçiyi bu dosya koruyor; ama tek seferlik ölçüm sondaları kalıbı
     HER ÖLÇÜMDE sıfırdan türetiyor ve aynı hataya yeniden düşüyor.
     Gerçekten oldu (7 Eyl 2026): `/tedarikciler` çekmecesini iki sözlükle
     karşılaştıran bir sonda `/arıtma/i` kullandı ve ekranda AÇIKÇA duran
     "ARITMA TESİSİ · 7" satırını göremedi; "terim yok" dedi.

     Çare test değil ARAÇ: `arac/turkce-arama.mjs`. Aşağıdaki vaka o
     aracın kendi kalıcı kanıtıdır — kör hâl ile gören hâl yan yana. */
  it('ölçüm sondası: `/…/i` kör, `katlamaliVarMi` görür [URN-ALN-007]', () => {
    const ekran = 'ARITMA TESİSİ · 7';
    expect(/arıtma/i.test(ekran), '`/i` bayrağı Türkçede kör DEĞİLMİŞ — kalıp değişti?')
      .toBe(false);
    expect(/tesis/i.test(ekran), '`TESİSİ` içindeki `İ` `/i` ile `i`ye katlanmıyor')
      .toBe(false);
    expect(katlamaliVarMi(/arıtma/, ekran), 'çift küçültme "ARITMA"yı görmeli').toBe(true);
    expect(katlamaliVarMi(/tesis/, ekran), 'çift küçültme "TESİSİ"yi görmeli').toBe(true);
    // Ters yön: yalnız DEĞİŞMEZ katlamada görünen yazım da yakalanmalı.
    expect(katlamaliVarMi(/termik/, 'TERMIK SANTRAL'), 'TERMIK → değişmez katlama')
      .toBe(true);
    // Kör kalmaması gereken yerde yanlış pozitif de üretmemeli.
    expect(katlamaliVarMi(/arıtma/, 'TEDARİKÇİ · SÖZLEŞME')).toBe(false);
  });

  it('`plant` sınırsız aranınca "toplantı"yı yakalıyordu [URN-ALN-007]', () => {
    /* `\bRES\b`in "SÜRESİ" içinde eşleşmesiyle AYNI SINIF: sınır
       konmadan aranan kısa gövde uzun sözcüğün içine düşer. Burada
       İngilizce "plant", Türkçe "toplantı"nın ortasında (top-PLANT-ı).

       Ölçüldü (7 Eyl 2026): 18 yanlış pozitif ve izin listesinde ALTI
       dosya yalnız bu yüzden duruyordu — hiçbirinde tek bir sektör
       sözcüğü yoktu. Yani yanlış pozitif sessizce "iş var" gösteriyordu. */
    const sinirsiz = /plant/gi;
    expect(eslesmeSayisi(sinirsiz, 'toplantı kararı'), 'eski kalıp toplantıyı yakalıyordu')
      .toBe(1);
    expect(bugun('plant', 'toplantı kararı'), 'bugünkü kalıp toplantıyı GÖRMEMELİ').toBe(0);
    expect(bugun('plant', 'toplantıda alınan kararlar')).toBe(0);
    // Gerçek geçişler yakalanmaya devam eder.
    expect(bugun('plant', 'Plant 360 ekranı')).toBe(1);
    expect(bugun('plant', 'the plant is offline')).toBe(1);
    /* Bitişik yazım kod tanımlayıcısıdır, sözcük değil. Örnek DEPODAKİ
       bir bileşen değil (ekran artık `Tesis360`); ölçülen şey kalıbın
       kendisi — bitişik yazım her zaman böyle davranmalı. */
    expect(bugun('plant', 'Plant360'), 'bitişik yazım sözcük değildir').toBe(0);
  });

  it('CSS jetonu (`--hes`) — öncesi 0, sonrası 1 [URN-ALN-007]', () => {
    /* İkinci şekil ölçümde VAR çıktı: 12 geçiş, 3 dosya. Üçü de zaten
       izin listesindeydi, o yüzden kalıbı eklemek listeye satır
       EKLEMEDİ (236 → 236) ve alt küme dişi ihlal edilmedi. */
    const once = /(?<![\p{L}\p{N}_])(?:JES|JEO|RES|HES|GES|DGKC|DGKÇ|TERMIK|TERMİK)(?![\p{L}\p{N}_])/gu;
    expect(eslesmeSayisi(once, 'color: var(--hes);'), 'eski kalıp CSS jetonunu görüyordu').toBe(0);
    expect(bugun('kod jetonu', 'color: var(--hes);')).toBe(1);
    expect(bugun('kod jetonu', '--jesd: #333;'), '--jesd de kod jetonudur').toBe(1);
    // `--resim` bir kod jetonu DEĞİLDİR: sınır `-` dâhil.
    expect(bugun('kod jetonu', '--resim: url(x);'), '--resim yanlış eşleşti').toBe(0);
  });
});
