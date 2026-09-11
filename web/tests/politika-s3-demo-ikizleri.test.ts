import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · S3 · DEMO İKİZLERİNİN POLİTİKA CÜMLELERİ [SIS-DEM-003]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Statik demo, ürünün EN ÇOK GÖSTERİLEN yüzeyidir: satış gezintisi
   oradan yürür. Ekranda on bir ayrı politika cümlesi duruyor —
   "Demo sürümü: değişiklikler bu ortamda kaydedilmez" (POL-098) ve on
   tane "… bu ortamda çalışmaz" (POL-100 · 101 · 102 · 103 · 106 · 107 ·
   108 · 109 · 110 · 111).

   Bu cümleler bir ORTAM VAADİDİR: gezintide yapılan hiçbir şey kalıcı
   değildir. İhlali veri sızdırmaz (S3), ama satış görüşmesinde
   "kaydedildi" sanılan bir değişiklik, ürünün ilk günden verdiği sözü
   bozar.

   ── GERÇEK YOL NEDİR ──────────────────────────────────────────────────
   Demo ikizi çalışma anında SEÇİLMEZ; `next.config.ts` derleme anında
   `resolveAlias` ile `@/lib/eylemler2/X` isteğini `./X.demo.ts`e
   ÇEVİRİR. Yani cümlenin gerçek yolu ÜÇ parçadır ve üçü de burada
   ölçülür:

     1. EŞLEME KAPSAMI — yazan her modülün ikizi var mı? Olmayan modül
        derleme anında patlar; ekran cümleyi hiç söyleyemez.
     2. İHRAÇ PARİTESİ — ikiz, gerçeğin ihraç ettiği HER adı taşıyor mu?
        Eksik ad `undefined is not a function` demektir: ekran "Demo
        sürümü: …" DEMEZ, ÇÖKER. Cümlenin doğru olması, söylenebilmesine
        bağlıdır.
     3. SESSİZ BAŞARI YOK — ikizin yazma ihraçları AÇIK RET döner.

   Dördüncü diş yapısaldır: ikiz veritabanına hiç DOKUNAMAZ. Ret dönen
   ama yolda bir satır yazmış bir ikiz de "kaydedilmez" görünürdü.

   ── KAPSAM ELLE YAZILMAZ ──────────────────────────────────────────────
   Modül listesi `next.config.ts`in kullandığı ÖLÇÜTLE türetilir
   (`lib/eylemler2/*.ts` + `'use server'`). Elle bir ad listesi, config
   değişince sessizce bayatlardı.
   ═══════════════════════════════════════════════════════════════════════ */

const EYLEM_DIZINI = 'lib/eylemler2';

/** `next.config.ts` ile AYNI ölçüt: `'use server'` taşıyan, ikiz olmayan modül. */
function yazanModuller(): string[] {
  return readdirSync(EYLEM_DIZINI)
    .filter((d) => d.endsWith('.ts') && !d.endsWith('.demo.ts'))
    .filter((d) => /^\s*['"]use server['"]/m.test(
      readFileSync(`${EYLEM_DIZINI}/${d}`, 'utf8')))
    .map((d) => d.slice(0, -3))
    .sort();
}

/** Yorum ve dize ayıklanmış kod — ad taraması metinden kandırılmasın. */
function yorumsuz(kod: string): string {
  return kod
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Kaynaktan ihraç adları: `export const X` · `export async function X` · `export function X`. */
function ihracAdlari(yol: string): string[] {
  const kod = yorumsuz(readFileSync(yol, 'utf8'));
  const adlar = new Set<string>();
  const KALIP = /export\s+(?:async\s+)?(?:const|function|let)\s+([A-Za-z_$][\w$]*)/g;
  for (const m of kod.matchAll(KALIP)) adlar.add(m[1]);
  /* `export { a, b }` biçimi de sayılır. */
  for (const m of kod.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const parca of m[1].split(',')) {
      const ad = parca.split(/\s+as\s+/).pop()?.trim();
      if (ad && /^[A-Za-z_$][\w$]*$/.test(ad)) adlar.add(ad);
    }
  }
  return [...adlar].sort();
}

/** Yalnız TİP ihraçları ikizde aranmaz — çalışma anında var olmazlar. */
function tipIhraclari(yol: string): Set<string> {
  const kod = yorumsuz(readFileSync(yol, 'utf8'));
  const t = new Set<string>();
  for (const m of kod.matchAll(/export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/g)) t.add(m[1]);
  for (const m of kod.matchAll(/export\s+type\s*\{([^}]*)\}/g)) {
    for (const p of m[1].split(',')) {
      const ad = p.split(/\s+as\s+/).pop()?.trim();
      if (ad) t.add(ad);
    }
  }
  return t;
}

const MODULLER = yazanModuller();

describe('DEMO İKİZİ · eşleme kapsamı [SIS-DEM-003]', () => {
  it('POPÜLASYON BOŞ DEĞİL — ölçüt bozulursa vaka hiçbir şey ölçmezdi [SIS-DEM-003]', () => {
    /* `'use server'` kalıbı ya da dizin adı değişirse liste sessizce
       boşalır ve aşağıdaki HER döngü sıfır turda yeşil biterdi. */
    expect(MODULLER.length, 'yazan modül bulunamadı — türetme ölçütü bozuk')
      .toBeGreaterThan(20);
  });

  it('YAZAN HER MODÜLÜN ikizi VAR — eksik ikiz demo derlemesini patlatır [SIS-DEM-003]', () => {
    const hepsi = new Set(readdirSync(EYLEM_DIZINI));
    const eksik = MODULLER.filter((ad) => !hepsi.has(`${ad}.demo.ts`));
    expect(eksik, `ikizi olmayan yazan modül: ${eksik.join(', ')}`).toEqual([]);
  });

  it('FAZLA İKİZ DE YOKTUR — yüklenemeyen ikiz ÖLÜ ATIFTIR [SIS-DEM-003]', () => {
    /* ── ÖLÇÜLDÜ (Brief L · faz 3) ────────────────────────────────────
       `kapsamMesaji.demo.ts` depoda duruyordu ve HİÇBİR yoldan
       yüklenemiyordu: gerçek modül `'use server'` değil `server-only`
       olduğu için takma ad listesine hiç girmiyor, tüketicileri de onu
       GÖRELİ yolla (`./kapsamMesaji`) alıyor — takma ad yalnız `@/`
       isteğini yeniden yazar, göreli isteği asla.

       Zararı sessizdi ve ertelenmişti: dosya "demo davranışı burada"
       diye okunuyordu, oysa demo o kodu hiç çalıştırmıyordu. Gerçek
       modüle bir gün `'use server'` eklenirse ikiz SESSİZCE etkinleşir
       ve ekran, kimsenin gözden geçirmediği bir davranışa döner.

       Bu diş kümeyi İKİ YÖNLÜ tutar: eksik ikiz de fazla ikiz de
       kırmızıdır. */
    const ikizler = readdirSync(EYLEM_DIZINI)
      .filter((d) => d.endsWith('.demo.ts'))
      .map((d) => d.slice(0, -8))
      .sort();
    const fazla = ikizler.filter((ad) => !MODULLER.includes(ad));
    expect(fazla, `eşlenmeyen — yani hiç yüklenemeyen — ikiz: ${fazla.join(', ')}`)
      .toEqual([]);
    expect(ikizler, 'ikiz kümesi eşlenen modül kümesiyle BİREBİR değil')
      .toEqual(MODULLER);
  });
});

describe('DEMO İKİZİ · ihraç paritesi [SIS-DEM-003]', () => {
  it('İKİZ, gerçeğin HER çalışma-anı ihracını taşır — eksik ad ekranı ÇÖKERTİR [SIS-DEM-003]', () => {
    /* Bu dişin ölçtüğü şey cümlenin SÖYLENEBİLİRLİĞİdir: ikizde olmayan
       bir ad, demo ekranında "Demo sürümü: …" yerine bir çalışma-anı
       hatası üretir. Politika cümlesi doğru olsa bile kullanıcı onu
       göremez. */
    const kusurlar: string[] = [];
    for (const ad of MODULLER) {
      const gercekYol = `${EYLEM_DIZINI}/${ad}.ts`;
      const ikizYol = `${EYLEM_DIZINI}/${ad}.demo.ts`;
      const tipler = tipIhraclari(gercekYol);
      const gercek = ihracAdlari(gercekYol).filter((x) => !tipler.has(x));
      const ikiz = new Set(ihracAdlari(ikizYol));
      const eksik = gercek.filter((x) => !ikiz.has(x));
      if (eksik.length > 0) kusurlar.push(`${ad}: ${eksik.join(', ')}`);
    }
    expect(kusurlar, `ikizde EKSİK ihraç:\n  ${kusurlar.join('\n  ')}`).toEqual([]);
  });
});

describe('DEMO İKİZİ · sessiz başarı yok [SIS-DEM-003]', () => {
  it('HER ikizin HER ihracı çağrılır: `{ ok: true }` dönen YOKTUR [SIS-DEM-003]', async () => {
    /* ── GERÇEK YOL ────────────────────────────────────────────────────
       İkiz gerçekten içe aktarılır ve ihraçları gerçekten çağrılır.
       Statik bir tarama "ok: false yazıyor mu" derdi; burada dönen
       DEĞER ölçülüyor. */
    let cagrilan = 0;
    let reddeden = 0;
    const sessizBasari: string[] = [];
    /* ── POPÜLASYON İKİ BAĞIMSIZ YOLDAN TÜRETİLİR ──────────────────────
       `MODULLER` dosya sisteminden + `'use server'` ölçütünden gelir
       (config'in ölçütü). `import.meta.glob` ise Vite'ın kendi derleme
       anı taramasıdır. İkisinin AYNI kümeyi vermesi ayrıca ölçülür:
       tek yola bakan bir sayım, o yol bozulunca sessizce boşalırdı. */
    const yuklerler = import.meta.glob('../lib/eylemler2/*.demo.ts') as
      Record<string, () => Promise<Record<string, unknown>>>;
    const globAdlari = new Set(Object.keys(yuklerler)
      .map((y) => y.split('/').pop()!.replace(/\.demo\.ts$/, '')));
    const globdaYok = MODULLER.filter((ad) => !globAdlari.has(ad));
    expect(globdaYok, `Vite taramasında olmayan ikiz: ${globdaYok.join(', ')}`).toEqual([]);

    for (const ad of MODULLER) {
      const ikiz = await yuklerler[`../lib/eylemler2/${ad}.demo.ts`]();
      for (const [isim, deger] of Object.entries(ikiz)) {
        if (typeof deger !== 'function') continue;
        cagrilan += 1;
        let sonuc: unknown;
        try {
          sonuc = await (deger as (g: unknown) => Promise<unknown>)({});
        } catch {
          /* Argüman şeklinden patlayan ikiz de YAZMAZ; ret sayılmaz ama
             sessiz başarı da değildir. */
          continue;
        }
        const s = sonuc as { ok?: unknown; hata?: unknown } | null;
        if (s && typeof s === 'object' && 'ok' in s) {
          if (s.ok === true) { sessizBasari.push(`${ad}.${isim}`); continue; }
          reddeden += 1;
          expect(typeof s.hata, `${ad}.${isim} ret gerekçesi taşımıyor`).toBe('string');
          expect((s.hata as string).length, `${ad}.${isim} ret gerekçesi boş`)
            .toBeGreaterThan(0);
        }
        /* `ok` taşımayan dönüş bir OKUMA yardımcısıdır (arama · sözlük ·
           modül sınıfı); "kaydedilmez" vaadini ihlal etmez ve yapısal
           diş (aşağıda) yazamayacağını ayrıca ölçer. */
      }
    }
    expect(cagrilan, 'hiçbir ihraç çağrılmadı — vaka boş küme üzerinde koştu')
      .toBeGreaterThan(50);
    expect(reddeden, 'hiçbir ret ölçülmedi — yalnız okuma yardımcıları çağrılmış')
      .toBeGreaterThan(50);
    expect(sessizBasari, `demo ikizi SESSİZCE BAŞARI döndü: ${sessizBasari.join(', ')}`)
      .toEqual([]);
    // eslint-disable-next-line no-console
    console.log(`POL-098 · POL-100…111 kapsamı: ${MODULLER.length}/${MODULLER.length} `
      + `demo ikizi gerçek yolla sürüldü · ${cagrilan} ihraç çağrıldı · `
      + `${reddeden} ret ölçüldü`);
  });
});

describe('DEMO İKİZİ · yapısal olarak YAZAMAZ [SIS-DEM-003]', () => {
  it('HİÇBİR ikiz veritabanına dokunmaz — ret dönüp yolda satır yazan ikiz de olmaz [SIS-DEM-003]', () => {
    /* Ret dönmek yetmez: yan etkisini çoktan yazmış bir ikiz de
       "kaydedilmez" GÖRÜNÜRDÜ. Yapısal diş bunu kapatır — ikiz
       veritabanı modülünü hiç içe aktarmaz. */
    const kusurlar: string[] = [];
    for (const ad of MODULLER) {
      const kod = yorumsuz(readFileSync(`${EYLEM_DIZINI}/${ad}.demo.ts`, 'utf8'));
      if (/from\s+['"][^'"]*veritabani['"]|\bprisma\b|@\/lib\/db\b/.test(kod)) {
        kusurlar.push(`${ad}.demo.ts`);
      }
    }
    expect(kusurlar, `veritabanına dokunan demo ikizi: ${kusurlar.join(', ')}`).toEqual([]);
  });
});
