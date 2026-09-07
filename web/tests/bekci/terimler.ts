/* Sektör terimi kalıpları ve tarayıcısı — bekçinin ORTAK çekirdeği.

   Ayrı modül, çünkü iki test dosyası (bekçinin kendisi ve katlama körlüğü
   vakaları) aynı kalıpları kullanıyor. Bir test dosyasından öbürüne
   import etmek, oradaki `describe` bloklarını ikinci kez kaydettirir ve
   vaka sayısını sessizce ikiye katlardı. */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
/* Çift küçültme ve Unicode sınır ARTIK ORTAK: aynı tuzak ölçüm
   sondalarını da vuruyor ve onları hiçbir test korumuyor (bkz.
   `arac/turkce-arama.mjs` başlığı). Kalıp tek yerde durur; bu dosyanın
   kalıcı vakaları (`katlama-korlugu.test.ts`) onu koruyor. */
import { eslesmeSayisi, katlamaliSayi, sinirKalibi } from '../../arac/turkce-arama.mjs';

export { eslesmeSayisi };

/* ── İKİ AYRI TÜRKÇE TUZAĞI ───────────────────────────────────────────

   1 · SÖZCÜK SINIRI. JavaScript'te `\b` ASCII tanımlıdır: `Ü`, `İ`, `Ç`,
       `ş` sözcük KARAKTERİ SAYILMAZ ve Türkçe sözcükleri ortadan böler.
       İki yönde de bozuyordu:
         · `\bRES\b` "SÜRESİ" içinde EŞLEŞİYORDU (S | Ü | RES | İ) —
           sektör terimi taşımayan dört dosya listeye böyle girmişti;
         · `\bDGKÇ\b` gerçek `DGKÇ` kodunu HİÇ görmüyordu, çünkü sondaki
           `Ç`den sonra `\b` bir sözcük karakteri istiyor.
       Sınır artık Unicode harflerine göre.

   2 · BÜYÜK HARF KATLAMASI — TEK KATLAMA HER İKİ YÖNDE DE KÖR.
       `/ünite/i` kalıbı `ÜNİTE` ile EŞLEŞMEZ: Türkçe `İ` (U+0130)
       Unicode basit katlamada `i`ye inmez. Tek bir küçültme seçmek
       sorunu ÇÖZMÜYOR, yalnız yerini değiştiriyor:

         sözcük     toLocaleLowerCase('tr-TR')   toLowerCase()
         ÜNİTE      ünite            ✓           üni̇te          ✗
         TERMİK     termik           ✓           termi̇k         ✗
         TERMIK     termık           ✗           termik         ✓
         BIRIM      bırım            ✗           birim          ✓
         UNITE      unıte            ✗           unite          ✓

       Türkçe katlama `I`yı `ı` yapar, değişmez katlama `İ`yi `i` + ayrı
       birleşen noktaya böler. Bu yüzden arama İKİSİNİN BİRLEŞİMİ
       üzerinde yapılır: terim herhangi birinde görünüyorsa görünmüştür.

       Kodlar (`JES` · `RES` · `MW`) yine HAM metinde aranır; küçültülmüş
       metinde aramak `RES`i `res` yapıp Türkçe sözcüklerin içine
       düşürürdü.

   Bugün depoda `ÜNİTE`, `TERMİK`, ASCII `TERMIK` ya da şapkasız `rüzgar`
   GEÇMİYOR; bu düzeltmeler bulunan borcu değil, bekçinin körlüğünü
   kapatıyor. `tests/bekci/katlama-korlugu.test.ts` her birini kalıcı
   vaka olarak tutuyor: katlama mantığı ileride sadeleştirilirse körlük
   sessizce geri gelmesin. */
const sinir = (govde: string) => sinirKalibi(govde);

/** `ham` = kaynağın kendisi · `kucuk` = İKİ küçültmenin birleşimi */
type Hedef = 'ham' | 'kucuk';

export const TERIMLER: { ad: string; kaliplar: { re: RegExp; hedef: Hedef }[] }[] = [
  { ad: 'santral', kaliplar: [{ re: /santral/g, hedef: 'kucuk' }] },
  { ad: 'ünite', kaliplar: [
    { re: /ünite/g, hedef: 'kucuk' },
    // ASCII yazım (`UNITE` · `unite`): değişmez katlama bunu görür.
    { re: new RegExp(sinir('unite').source, 'gu'), hedef: 'kucuk' },
  ] },
  { ad: 'MW', kaliplar: [{ re: sinir('MW[ep]?'), hedef: 'ham' }] },
  { ad: 'tip kodu', kaliplar: [
    { re: sinir('JES|JEO|RES|HES|GES|DGKC|DGKÇ|TERMIK|TERMİK'), hedef: 'ham' },
  ] },
  { ad: 'türbin', kaliplar: [{ re: /türbin/g, hedef: 'kucuk' }] },
  { ad: 'üretim tipi', kaliplar: [
    // Şapkasız `rüzgar` da yazımda geçer; ikisi de sektör sözcüğüdür.
    { re: /jeotermal|rüzgâr|rüzgar|hidroelektrik/g, hedef: 'kucuk' },
  ] },
  /* ── `plant` SÖZCÜK SINIRLI ARANIR ─────────────────────────────────
     Sınırsız kalıp Türkçe "toplantı" içinde eşleşiyordu (top-PLANT-ı) ve
     18 yanlış pozitif üretiyordu; `lib/uyum/gozdenGecirme.ts` yalnız bu
     yüzden listede duruyordu — dosyada tek bir sektör sözcüğü yok.
     Bu, `\bRES\b`in "SÜRESİ" içinde eşleşmesiyle aynı sınıf: sınır
     konmadan aranan kısa gövde, uzun sözcüğün içine düşer.

     Sınır Unicode harflerine göre (`sinirKalibi`), ASCII `\b`ye göre
     değil: "Plant360" ve "plant_kodu" gibi bitişik yazımlar yine
     yakalanmamalı, ama "toplantı" da yakalanmamalı. Kalıp `i` bayrağı
     TAŞIMAZ ve `ham` metinde aranır — İngilizce sözcük, Türkçe katlama
     tuzağına girmez. */
  { ad: 'plant', kaliplar: [{ re: sinirKalibi('plant|Plant|PLANT'), hedef: 'ham' }] },
  /* ── KÜÇÜK HARFLİ KOD BİÇİMİ · CSS JETONU ──────────────────────────
     Kodlar ham metinde BÜYÜK harfle aranır; küçültülmüşte `res` Türkçe
     sözcüklerin içine düşerdi. Bu, küçük harfle yazılmış kod
     biçimlerini kör bırakıyordu ve depoda BİR TANESİ gerçekten var:
     CSS özel özellikleri (`--jes` · `--hes` · `--res` · `--ges` ·
     `--jesd`) — 12 geçiş, 3 dosya. Üçü de zaten izin listesindeydi
     (başka terimlerden), ama o terimler temizlenince bekçi dosyayı
     TEMİZ sayacaktı: renk kimliği hâlâ enerji koduna bağlıyken.

     Sondaki isteğe bağlı `d`, eski koyu yüzey jetonlarıdır (`--jesd`;
     `components/kabuk/tip.ts` yorumunda anılıyor). Sınır `-` dâhil ve
     başka harfe izin yok: `--resim` bir kod jetonu DEĞİLDİR. */
  { ad: 'kod jetonu', kaliplar: [
    { re: /--(?:jes|jeo|res|hes|ges|dgkc|termik)d?(?![\p{L}\p{N}_-])/gu, hedef: 'ham' },
  ] },
];

/** Dosyada (adı dâhil) geçen sektör terimleri — hangi terim, kaç kez.

    `kucuk` hedefli kalıplar İKİ küçültmede birden aranır ve BÜYÜK sayı
    alınır. Kirlilik kararı ikisinin BİRLEŞİMİDİR (biri bulduysa
    bulunmuştur); sayı ise iki katlamanın büyüğüdür — aynı geçiş her iki
    kopyada da görüneceği için toplamak onu ikiye katlardı. İki farklı
    yazımın (`ÜNİTE` ve `UNITE`) aynı dosyada bulunduğu nadir durumda
    sayı alt sınırdır; KARAR yine de doğrudur ve karar ölçülen şeydir. */
export function terimleriBul(yol: string, icerik?: string): { terim: string; sayi: number }[] {
  const ham = `${icerik ?? readFileSync(yol, 'utf8')}\n${yol}`;
  const bulunan: { terim: string; sayi: number }[] = [];
  for (const { ad, kaliplar } of TERIMLER) {
    let sayi = 0;
    for (const { re, hedef } of kaliplar) {
      sayi += hedef === 'ham' ? eslesmeSayisi(re, ham) : katlamaliSayi(re, ham);
    }
    if (sayi > 0) bulunan.push({ terim: ad, sayi });
  }
  return bulunan;
}


const KOKLER = ['app', 'components', 'lib'] as const;
const UZANTI = /\.(ts|tsx|css)$/;

export function* kaynakDosyalari(kok: string): Generator<string> {
  for (const e of readdirSync(kok, { withFileTypes: true })) {
    const p = path.join(kok, e.name);
    if (e.isDirectory()) {
      // Üretilen Prisma istemcisi kaynak değildir; şemadan türer.
      if (e.name === 'prisma-client') continue;
      yield* kaynakDosyalari(p);
    } else if (UZANTI.test(e.name)) yield p;
  }
}

/** Taranan bütün kaynak dosyaları (`app/` · `components/` · `lib/`). */
export function taranacakDosyalar(): string[] {
  return KOKLER.flatMap((k) => [...kaynakDosyalari(k)]);
}
