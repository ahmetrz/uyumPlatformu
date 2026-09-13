import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   DIŞA AKTARIM KAPSAMI = EKRAN KAPSAMI · BEKÇİ [URN-ERI-002]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Bağımsız inceleme, #48 turu 2: tek tesise yetkili bir DIŞ DENETÇİ,
   `/olaylar` ekranında GÖREMEDİĞİ kurumsal bir KVKK ihlalini kanıt
   paketinde gördü. Ekran ile dışa aktarım aynı soruyu iki ayrı yerde
   cevaplıyordu ve biri öbüründen genişti.

   Örnek kapatıldı; bu bekçi SINIFI kapatır. Bir dışa aktarım yüzeyi
   kapsam kararını KENDİ verirse ekranın kuralı değiştiği gün yüzeyler
   ayrışır ve ayrışma SESSİZDİR: dosya üretilir, iner, kimse görmez.

   ── YÜZEY LİSTESİ TÜRETİLİR, YAZILMAZ ─────────────────────────────────
   Elle yazılmış bir liste, yeni bir dışa aktarım eklendiği gün eksik
   kalır ve bekçi ona hiç bakmaz — "sabit ad listesi" kusurunun bu
   depoda ölçülmüş hâli (`kapi:parti` iş adları). Yüzey, ürettiği ŞEYDEN
   tanınır: kullanıcıya İNEN bir dosya adı üreten sunucu eylemi.
   ═══════════════════════════════════════════════════════════════════════ */

const EYLEM = path.join(process.cwd(), 'lib', 'eylemler2');
const KOK = ['app', 'lib'];

const yorumsuz = (m: string) => m
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((s) => s.replace(/\/\/.*$/, '')).join('\n');

/* YÜZEY, ÜRETTİĞİ ŞEYDEN TANINIR: eylemin DÖNÜŞ nesnesinde tarayıcının
   dosyaya çevireceği bir GÖVDE var mı. Ad tek başına yetmez — yüklenen
   bir dosyanın adını KAYDEDEN içe aktarım kodu da `dosyaAdi` yazar ama
   kullanıcıya hiçbir şey indirmez (ölçüldü: ilk kalıp `kanit.ts` ve
   `varlikAktarim.ts`i yüzey sanıyordu). Gövde alanları: paketin JSON'u,
   formun CSV'si, XLSX'in base64'ü. */
const GOVDE_ALANI = /^\s*(json|csv|xlsxBase64)\s*[,:]/m;

/** Bir `return { … }` penceresinde gövde alanı var mı.

    Tek regexle yazılamaz: dosya adı şablon dizesi taşıyor (`${...}`) ve
    süslü parantez dışlayan bir pencere ilk `${`de kopuyor — ölçüldü,
    kanıt paketi yüzeyi bu yüzden hiç görünmüyordu. Pencere metinden
    kesilir, alan SATIR BAŞINDA aranır: `json` sözcüğünün bir değerin
    içinde geçmesi yüzey yapmaz. */
function govdeDonuyorMu(kaynak: string): boolean {
  for (const m of kaynak.matchAll(/\breturn\s*\{/g)) {
    if (GOVDE_ALANI.test(kaynak.slice(m.index, m.index + 400))) return true;
  }
  return false;
}

/** Kullanıcıya inen GÖVDE üreten sunucu eylemi = dışa aktarım yüzeyi. */
function disaAktarimYuzeyleri(): { ad: string; kaynak: string }[] {
  const cikan: { ad: string; kaynak: string }[] = [];
  for (const ad of readdirSync(EYLEM).filter((f) => f.endsWith('.ts') && !f.endsWith('.demo.ts'))) {
    const kaynak = yorumsuz(readFileSync(path.join(EYLEM, ad), 'utf8'));
    if (govdeDonuyorMu(kaynak)) cikan.push({ ad, kaynak });
  }
  return cikan;
}

describe('dışa aktarım kapsamı EKRAN kapsamından geniş olamaz [URN-ERI-002]', () => {
  const yuzeyler = disaAktarimYuzeyleri();

  it('yüzey listesi TÜRETİLİYOR ve BOŞ DEĞİL', () => {
    /* Sıfır yüzey ölçmek, hiçbir şeye bakmadan temiz raporlamaktır:
       kalıp bozulursa bekçi sessizce her şeyi geçirirdi. */
    expect(yuzeyler.length, 'dışa aktarım yüzeyi bulunamadı — kalıp mı bozuldu')
      .toBeGreaterThanOrEqual(2);
  });

  it('HİÇBİR yüzey kapsam kararını KENDİ vermiyor', () => {
    /* `izinliTesisIdleri` ham karardır ve dışa aktarımda doğrudan
       kullanılırsa "kurumsal kayıt ne olacak" sorusu her yüzeyde
       yeniden cevaplanır — ayrışmanın kaynağı budur. */
    const kusurlar = yuzeyler
      .filter((y) => /izinliTesisIdleri\s*\(/.test(y.kaynak))
      .map((y) => `${y.ad}: kapsamı kendi hesaplıyor (izinliTesisIdleri)`);
    expect(kusurlar, kusurlar.join('\n')).toEqual([]);
  });

  it('HER yüzey TEK kaynağı okuyor', () => {
    const kusurlar = yuzeyler
      .filter((y) => !/disaAktarimKapsami\s*\(/.test(y.kaynak))
      .map((y) => `${y.ad}: disaAktarimKapsami çağırmıyor`);
    expect(kusurlar, kusurlar.join('\n')).toEqual([]);
  });

  it('SABOTAJ: kapsamı kendi hesaplayan bir yüzey metni KIRMIZI', () => {
    /* Bekçinin kendi yürüyüşü ölçülür: kural gerçekten metinde mi
       arıyor, yoksa başka bir sebeple mi susuyor. */
    const sahte = "const izinli = izinliTesisIdleri(k, 'denetim');";
    expect(/izinliTesisIdleri\s*\(/.test(yorumsuz(sahte))).toBe(true);
    const dogru = "const kapsam = disaAktarimKapsami(k, 'denetim');";
    expect(/izinliTesisIdleri\s*\(/.test(yorumsuz(dogru))).toBe(false);
    expect(/disaAktarimKapsami\s*\(/.test(yorumsuz(dogru))).toBe(true);
  });

  it('kalıp GÖVDEYE bakar, ADA değil', () => {
    /* Yalnız `dosyaAdi` aramak yetmiyordu: yüklenen dosyanın adını
       kaydeden içe aktarım kodu da onu yazıyor. Gövde alanı SATIR
       BAŞINDA aranır — bir değerin içinde geçen "json" yüzey yapmaz. */
    expect(govdeDonuyorMu('return { ok: true, dosyaAdi: `x_${a}.json`,\n  json,\n};'))
      .toBe(true);
    expect(govdeDonuyorMu('return { ok: true, veri: { id: kayit.id } };')).toBe(false);
    expect(govdeDonuyorMu('const s = "bu bir json metnidir";')).toBe(false);
  });

  it('SABOTAJ: YORUMDAKİ geçiş bekçiyi yanıltmaz', () => {
    const yorum = "/* eskiden izinliTesisIdleri(k) çağrılıyordu */\nconst x = 1;";
    expect(/izinliTesisIdleri\s*\(/.test(yorumsuz(yorum))).toBe(false);
  });

  it('İÇE aktarım yüzey SAYILMAZ — yüklenen dosyanın adı inen dosya değildir', () => {
    /* ÖLÇÜLDÜ: ilk kalıp yalnız `dosyaAdi` arıyordu ve `varlikAktarim.ts`
       (yüklenen dosyanın adını kaydeder) ile `kanit.ts` (kanıt dosyasını
       saklar) yüzey sanılıyordu. İkisi de kullanıcıya bir şey İNDİRMEZ;
       yüzey sayılsalardı bekçi onlardan kapsam kararı ister, kural
       anlamsız yere genişler ve gerçek yüzeylerin kuralı sulanırdı. */
    expect(yuzeyler.map((y) => y.ad)).not.toContain('varlikAktarim.ts');
    expect(yuzeyler.map((y) => y.ad)).not.toContain('kanit.ts');
  });

  it('İKİ yüzeyin İKİSİ de ölçülüyor — kanıt paketi ve denetim formu', () => {
    /* Sayı ADIYLA sabitlenir: yeni bir dışa aktarım eklenirse bu vaka
       kırmızı yanar ve yazan, kapsam kuralını da düşünmek zorunda kalır.
       Sayının kendisi bir hedef değil, bir DURDURMA noktasıdır. */
    expect(yuzeyler.map((y) => y.ad).sort())
      .toEqual(['denetimFormu.ts', 'disaAktarim.ts']);
  });
});

describe('kapsamı SORGUYA çeviren ad TEK yerde tanımlı [URN-ERI-002]', () => {
  /* ── ÖLÇÜLEN KUSUR ───────────────────────────────────────────────────
     Bağımsız inceleme (#49): `lib/erisim.ts` ölü bir `kapsamKosulu`
     taşıyordu ve `app/kapsam.ts` AYNI ADLA başka bir fonksiyon tanımlıyor.
     İkisi aynı işi yapmıyor — biri kurumsal kaydı `OR: [{ tesisId: null }]`
     ile İÇERİR, öbürü yalnız `{ tesisId: { in: [...] } }` üretir ve üç
     değerli mantıkta NULL satırı ASLA eşlemez. Yanlış olanı içe aktaran
     bir yüzey ne derleme hatası verir ne test kırar: kapsam sessizce
     kayar. Ölü kod silindi; bu vaka onun GERİ GELMESİNİ ölçer.

     Kural ada bağlıdır, dosyaya değil: ad tek modülde yaşadığı sürece
     "hangi `kapsamKosulu`" sorusu hiç doğmaz. */
  const tanimlar = KOK.flatMap((kok) => readdirSync(path.join(process.cwd(), kok), { recursive: true })
    .map(String)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .filter((f) => /export\s+(function|const)\s+kapsamKosulu\b/
      .test(yorumsuz(readFileSync(path.join(process.cwd(), kok, f), 'utf8'))))
    .map((f) => `${kok}/${f}`));

  it('TEK tanım var ve yeri BELLİ', () => {
    expect(tanimlar, `kapsamKosulu ${tanimlar.length} yerde tanımlı:\n${tanimlar.join('\n')}`)
      .toEqual(['app/kapsam.ts']);
  });

  it('SABOTAJ: kalıp gerçekten İHRACI arıyor', () => {
    /* Bekçinin kendi yürüyüşü: yorumdaki ya da çağrıdaki geçiş tanım
       sayılmamalı, yoksa kural her dosyada kırmızı yanar ve susturulur. */
    const kalip = /export\s+(function|const)\s+kapsamKosulu\b/;
    expect(kalip.test(yorumsuz('export function kapsamKosulu(k) {}'))).toBe(true);
    expect(kalip.test(yorumsuz('export const kapsamKosulu = (k) => ({});'))).toBe(true);
    expect(kalip.test(yorumsuz('const w = kapsamKosulu(kapsam);'))).toBe(false);
    expect(kalip.test(yorumsuz('/* export function kapsamKosulu */'))).toBe(false);
  });
});
