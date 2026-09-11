/* ROTA AĞACI — ROTA KÜMESİ LİSTEDEN DEĞİL, AĞAÇTAN TÜRETİLİR

   ── ÖLÇÜLEN KUSUR ────────────────────────────────────────────────────
   Ölü bağ bekçisinin ilk yazımı `arac/rotalar.json`u okuyordu ve o
   dosya ÜRETİLMİŞ bir listedir: üreticisi kör kalırsa ya da dosya bayat
   kalırsa bekçi var olmayan bir rotayı "var" sayar. Bu deponun adı
   konmuş başarısızlık biçimi tam olarak budur — popülasyon tek bir
   üreticiden gelir ve kapı onun gördüğü kadarını korur.

   Ayrıca ÇÖZÜMLEYİCİ de gevşekti: `cozulur` herhangi bir ÜST yolun
   envanterde bulunmasını yeterli sayıyordu. `/tesisler/cm1/olmayan/derin`
   yolu `/tesisler` üstü yüzünden ÇÖZÜLÜYORDU — üç seviyelik uydurma bir
   yol kapıdan geçiyordu.

   Üçüncüsü KAPSAMDI: yalnız `href="..."` taranıyordu. Bu depoda gezinme
   `router.push`, `redirect` ve şablon dizeli `href={...}` ile de
   yapılıyor; onların hiçbiri ölçülmüyordu.

   ── BUGÜN ────────────────────────────────────────────────────────────
   Rota deseni kümesi `app/` AĞACINDAN türetilir: her `page.tsx` bir
   rotadır, `(grup)` segmentleri düşer, `[id]` ve `[...slug]` desen
   olarak KALIR. Eşleşme segment segment yapılır ve SEGMENT SAYISI
   uyuşmalıdır.                                                       */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/** Şablon ifadesinin yerine konan işaret — dinamik segment. */
const IFADE = 'IFADE';

/** `app/` ağacından rota DESENLERİ. Elle liste yoktur. */
export function rotaDesenleri(kok) {
  const app = path.join(kok, 'app');
  const desenler = new Set();
  const gez = (dizin, segmentler) => {
    let girisler;
    try { girisler = readdirSync(dizin, { withFileTypes: true }); } catch { return; }
    for (const g of girisler) {
      const tam = path.join(dizin, g.name);
      if (g.isDirectory()) {
        /* `(kabuk)` gibi ROTA GRUBU segmenti yola girmez; `@slot` ve
           `_ozel` dizinleri rota üretmez. */
        if (g.name.startsWith('@') || g.name.startsWith('_')) continue;
        const grup = /^\(.*\)$/.test(g.name);
        gez(tam, grup ? segmentler : [...segmentler, g.name]);
        continue;
      }
      if (!/^page\.(tsx|ts|jsx|js)$/.test(g.name)) continue;
      desenler.add(segmentler.length === 0 ? '/' : `/${segmentler.join('/')}`);
    }
  };
  try { statSync(app); } catch { return desenler; }
  gez(app, []);
  return desenler;
}

/** Sorgu ve çapa atılır; sondaki `/` normalleşir. */
export function kokYol(yol) {
  return String(yol).split(/[?#]/)[0].replace(/\/+$/, '') || '/';
}

/** Bir desen segmenti, bir yol segmentini karşılıyor mu?

    ── ÖLÜ KOŞUL SİLİNDİ (S198 sabotajı) ────────────────────────────────
    Burada `return parca.length > 0` yazıyordu ve sabotaj turunda o
    koşulu `return true` yapmak KIRMIZI YAKMADI. Sebebi kodun kendisiydi:
    `kokYol` sondaki eğik çizgiyi düşürür, `filter(Boolean)` boş
    segmentleri atar ve segment SAYISI zaten uyuşmak zorundadır — yani
    `parca` hiçbir zaman boş gelemez. Koşul bir şeyi korumuyordu; "boş
    segmenti reddediyorum" diye okunan bir satırdı ve yanlış okunuyordu.

    R-E'nin öbür yüzü: yakmayan sabotaj her zaman testin kusuru değildir
    — bazen KURALIN kendisi ölüdür. Ölü kural, düzelttiğini iddia eden
    bir gerekçeyle depoda durmaktansa silinir. Dinamik segmentin TEK
    seviye yediğini garanti eden şey segment sayısı denetimidir ve onu
    S197 sabotajı kırmızı yakıyor. */
function segmentUyar(desen, parca) {
  if (desen.startsWith('[...') || desen.startsWith('[[...')) return true;
  if (desen.startsWith('[') && desen.endsWith(']')) return true;
  return desen === parca;
}

/**
 * Yol, desen kümesindeki BİR desene çözülüyor mu?
 *
 * SEGMENT SAYISI UYUŞUR: üst yolun var olması YETMEZ. Yakalayıcı desen
 * (`[...slug]`) kalan segmentleri yer — yalnız orada sayı serbesttir.
 */
export function rotaCozulur(yol, desenler) {
  const y = kokYol(yol);
  if (y === '/') return desenler.has('/');
  const parcalar = y.split('/').filter(Boolean);
  for (const desen of desenler) {
    const d = desen === '/' ? [] : desen.split('/').filter(Boolean);
    /* ── ZORUNLU ve İSTEĞE BAĞLI YAKALAYICI AYRIDIR (P3-12) ──────────
       Next.js'te `[...yol]` EN AZ BİR segment ister; çıplak üst yol
       (`/belge`) o desenle ÇÖZÜLMEZ. Yalnız `[[...yol]]` sıfır segmenti
       kabul eder. Eski karşılaştırma (`parcalar.length < yakalayici`)
       ikisini de aynı sayıyor, yani ölü bir `/belge` bağını CANLI
       sayıyordu — ve testin kendisi bu yanlışı KİLİTLİYORDU
       (`expect(rotaCozulur('/belge', D)).toBe(true)`).

       Bu dal bugün ULAŞILMAZ: ağaçta yakalayıcı desen YOK (ölçüldü —
       65 desen, yakalayıcı 0). Kural yine de doğrusuyla yazıldı: ilk
       `[...x]` eklendiği gün sessizce yanlış cevap vermesin. */
    const yakalayici = d.findIndex((s) => s.startsWith('[...') || s.startsWith('[[...'));
    if (yakalayici === -1) {
      if (d.length !== parcalar.length) continue;
    } else {
      const istegeBagli = d[yakalayici].startsWith('[[...');
      const asgari = istegeBagli ? yakalayici : yakalayici + 1;
      if (parcalar.length < asgari) continue;
    }
    let uyar = true;
    for (let i = 0; i < d.length; i += 1) {
      if (d[i].startsWith('[...') || d[i].startsWith('[[...')) break;
      if (!segmentUyar(d[i], parcalar[i] ?? '')) { uyar = false; break; }
    }
    if (uyar) return true;
  }
  return false;
}

/** Yorum ayıklanmış kod — yorumdaki örnek bir yol kusur değildir. */
export function yorumsuz(kod) {
  return String(kod)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/* ── HEDEF TÜRLERİ · BEYANLI ───────────────────────────────────────────
   Kalıp listesi tek yerde durur ve her biri adıyla beyanlıdır; yeni bir
   gezinme biçimi eklenirse buraya eklenir ve kapsam ölçülebilir kalır. */
const KALIPLAR = [
  { ad: 'href-duz', re: /\bhref=(?:"(\/[^"]*)"|'(\/[^']*)')/g },
  { ad: 'href-ifade', re: /\bhref=\{\s*(?:"(\/[^"]*)"|'(\/[^']*)'|`(\/[^`]*)`)\s*\}/g },
  { ad: 'router-push', re: /\brouter\.(?:push|replace|prefetch)\(\s*(?:"(\/[^"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/g },
  { ad: 'redirect', re: /\bredirect\(\s*(?:"(\/[^"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/g },
  { ad: 'revalidate', re: /\brevalidatePath\(\s*(?:"(\/[^"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/g },
];

export const HEDEF_TURLERI = KALIPLAR.map((k) => k.ad);

/**
 * Koddaki İÇ BAĞ HEDEFLERİ.
 *
 * Şablon dizelerdeki ifadeler DİNAMİK SEGMENTe çevrilir: değeri çalışma
 * anında doğar ama YOLUN ŞEKLİ statiktir ve şekil ölçülebilir. Bu,
 * beyanlı sınırın DARALMASIDIR — eskiden bütün şablon bağlar ölçümün
 * dışındaydı.
 */
export function bagHedefleri(kod) {
  const temiz = yorumsuz(kod);
  const cikan = [];
  for (const { ad, re } of KALIPLAR) {
    for (const m of temiz.matchAll(new RegExp(re.source, re.flags))) {
      const ham = m[1] ?? m[2] ?? m[3];
      if (!ham) continue;
      const yol = ham.replace(/\$\{[^}]*\}/g, IFADE);
      cikan.push({ tur: ad, ham, yol });
    }
  }
  return cikan;
}

/* ── TARAMA KÖKLERİ ───────────────────────────────────────────────────
   `lib` de taranır ve gerekçesi ÖLÇÜLDÜ: `revalidatePath` çağrılarının
   272'si orada yaşıyor ve DÖRDÜ olmayan bir rotayı (`/maddeler`)
   tazeliyordu — sessiz bir no-op. Kullanıcı kaydı değiştiriyor, hedef
   ekran bayat kalıyor ve hiçbir kapı görmüyordu. `app` + `components`
   ile sınırlı bir tarama, bu sınıfı tanım gereği göremezdi. */
export function kaynakDosyalari(kok, kokler = ['app', 'components', 'lib']) {
  const cikan = [];
  const gez = (d) => {
    let girisler;
    try { girisler = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const g of girisler) {
      const tam = path.join(d, g.name);
      if (g.isDirectory()) { gez(tam); continue; }
      if (!/\.tsx?$/.test(g.name) || /\.test\.tsx?$/.test(g.name)) continue;
      cikan.push({ yer: path.relative(kok, tam), kod: readFileSync(tam, 'utf8') });
    }
  };
  for (const d of kokler) gez(path.join(kok, d));
  return cikan;
}
