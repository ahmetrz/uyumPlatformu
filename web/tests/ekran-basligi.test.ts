import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   EKRAN BAŞLIĞI TEK BAŞINA OKUNUR OLMALI

   ── ÖLÇÜLDÜ: SEKİZ EKRANIN H1'İ CÜMLE DEĞİL PARÇAYDI ──────────────────
   `EkranBasligi` künyeyi (eyebrow) ve başlığı ayrı basar. Sekiz ekran
   ismin başını künyeye, sonunu başlığa koymuş ve okuyucunun ikisini
   birleştirmesini beklemişti:

     /egitimler          künye "UY-66 · Eğitim"      h1 "kütüğü"
     /sayim              künye "OT-55 · Envanter"    h1 "sayımı"
     /tasinabilir-medya  künye "OT-57 · Taşınabilir" h1 "medya"
     /yedek-parca        künye "OT-56 · Kritik"      h1 "yedek parça"

   Oysa H1 TEK BAŞINA durur: ekran okuyucunun sayfa başlığı odur, arama
   sonucunda o görünür, ekranı ilk kez açanın gözü oraya düşer.
   "Kütüğü" bir başlık değildir.

   ── BU TESTİN İKİ KURALI ──────────────────────────────────────────────
   1 · Başlık tek başına anlamlı olmalı: en az iki sözcük ve küçük bir
       ekle başlamamalı ("kütüğü", "medya", "ve kontrollü imha").
   2 · Künye son kullanıcıya İSTER KODU göstermemeli: `UY-66`, `OT-55`
       ürün belgesinin sözlüğüdür, ekranın değil.

   Kural KAYNAK ÜZERİNDEN ölçülür; tarayıcı gerekmez, CI'da koşar.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();

function tsxDosyalari(dizin: string, birikim: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    const yol = path.join(dizin, ad);
    if (statSync(yol).isDirectory()) tsxDosyalari(yol, birikim);
    else if (ad.endsWith('.tsx')) birikim.push(yol);
  }
  return birikim;
}

type Kunye = {
  dosya: string;
  /** Sabit metin verilmişse o; ifade verilmişse `null`. */
  eyebrow: string | null;
  baslik: string | null;
  /** `vurgu` hiç verilmemiş ya da `undefined` dönebiliyor mu? */
  vurguEksikOlabilir: boolean;
};

/** `<EkranBasligi …>` çağrıları. */
function basliklar(): Kunye[] {
  const cikti: Kunye[] = [];
  for (const yol of tsxDosyalari(path.join(KOK, 'app'))) {
    const kaynak = readFileSync(yol, 'utf8');
    for (const m of kaynak.matchAll(/<EkranBasligi\b([\s\S]*?)\/>/g)) {
      const govde = m[1]!;
      const sabit = (ad: string) => {
        const d = govde.match(new RegExp(`\\b${ad}=["']([^"']*)["']`));
        return d ? d[1]! : null;
      };
      /* `vurgu={… : undefined}` ya da hiç `vurgu` yoksa vurgu eksik
         olabilir demektir; başlık o hâlde TEK BAŞINA okunacaktır. */
      const vurguVar = /\bvurgu=/.test(govde);
      const vurguIfade = govde.match(/\bvurgu=\{([\s\S]*?)\}\s*\n/);
      cikti.push({
        dosya: path.relative(KOK, yol).replace(/\\/g, '/'),
        eyebrow: sabit('eyebrow'),
        baslik: sabit('baslik'),
        vurguEksikOlabilir: !vurguVar
          || (vurguIfade ? /undefined/.test(vurguIfade[1]!) : false),
      });
    }
  }
  return cikti;
}

/* Büyük harfle başlayan sabit başlık TEK BAŞINA okunur ("Olaylar",
   "Tedarikçiler"). Küçük harfle başlayan sabit başlık bir DEVAMDIR
   ("sözleşmesi", "hesabı", "kütüğü") ve ancak önünde her koşulda bir
   vurgu duruyorsa meşrudur. */
const DEVAM_BASLIGI = /^[a-zçğıöşü]/;

describe('Ekran başlığı · H1 tek başına okunur', () => {
  const hepsi = basliklar();

  it('en az yirmi ekranda ölçüm yapıldı', () => {
    expect(hepsi.length).toBeGreaterThan(20);
  });

  it('vurgusuz kalabilen başlık cümle parçası olamaz [SIS-BSL-001]', () => {
    const parcalar = hepsi
      .filter((b) => b.baslik !== null && b.vurguEksikOlabilir)
      .filter((b) => DEVAM_BASLIGI.test(b.baslik!.trim()))
      .map((b) => `${b.dosya}: "${b.baslik}" (vurgu eksik olabilir)`);
    expect(parcalar, parcalar.join('\n')).toEqual([]);
  });

  it('künyede ister kodu geçmiyor [SIS-BSL-002]', () => {
    /* `UY-66 ·`, `OT-55 ·` gibi kodlar ürün belgesinin sözlüğüdür. */
    const kodlu = hepsi
      .filter((b) => b.eyebrow !== null && /\b(UY|OT)-\d{2,3}[a-z]?\b/.test(b.eyebrow!))
      .map((b) => `${b.dosya}: "${b.eyebrow}"`);
    expect(kodlu, kodlu.join('\n')).toEqual([]);
  });
});
