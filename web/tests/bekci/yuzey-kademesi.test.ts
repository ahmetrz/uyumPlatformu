import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tabanDogrula } from '../../arac/olcum-tabani.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · KOYU TEMANIN YÜZEY KADEMESİ (SIS-PAL-001)

   ── ÖLÇÜLEN ───────────────────────────────────────────────────────────
   `DESIGN.md` iki yerde kademe BEYAN EDİYORDU — "zemin → panel → panel-2
   ÜÇ KADEME" ve "panel zeminin BİR KADEME üstüdür". Ölçüldü (19 Eyl 2026)
   ve beyan yanlış çıktı; kademe YOKTU:

     zemin → panel   1,042:1      panel → panel2  1,053:1
     zemin → panel2  1,097:1

   Üç yüzey birbirinden %10'dan az ayrışıyordu, yani göz için TEK siyahtı.
   Kullanıcı bunu "çok karanlık ve hâlâ düzenli değil" diye bildirdi: koyu
   arayüzde düzeni yüzey kademesi kurar ve kademe çökünce ekran tek parça
   levhaya döner.

   ── NİÇİN AYRI BİR KAPI ───────────────────────────────────────────────
   `arac/kontrast.mjs` bunu GÖREMEZ ve bu beyanlı bir körlüktü: o kapı
   yalnız MÜREKKEP × YÜZEY oranını ölçer (4,5:1). Yüzeyin YÜZEYE oranını
   hiçbir kapı ölçmüyordu — kademe sessizce düzleşebilir ve kontrast kapısı
   yeşil kalırdı. GERÇEKTEN DE öyle oldu: palet 1,042:1'e çökmüşken bütün
   kapılar yeşildi.

   İki kapı birbirinin yerine geçmez ve ZITTIR: kontrast kapısı yüzeyin
   KARANLIK kalmasını ister (mürekkep okunsun), bu kapı AYRIŞMASINI ister
   (kademe görünsün). Palet ikisinin arasında durur; biri tek başına
   koşarsa öbür uca kaçış serbest kalır.

   ── DİŞLER ────────────────────────────────────────────────────────────
   1 · Kademe SIRALI — zemin < panel < panel-2.
   2 · Her komşu adım algılanabilir (taban `olcum-tabani.json`da, binde).
   3 · Saç çizgileri EN PARLAK yüzeyin de üstünde; yoksa panel üstündeki
       kenarlıklar görünmez olur (bu kusur bu turda GERÇEKTEN oldu: panel
       açılınca eski `--hr` panelden koyu kaldı).
   4 · `DESIGN.md`in yazdığı kademe sayıları ÖLÇÜLENLE aynı — belge bir
       kez daha koddan ayrışmasın (bu kapının doğum sebebi o ayrışmaydı).
   ═══════════════════════════════════════════════════════════════════════ */

const CSS = readFileSync(join(__dirname, '..', '..', 'app', 'kabuk.css'), 'utf8');
const BELGE = readFileSync(join(__dirname, '..', '..', 'DESIGN.md'), 'utf8');

/** `.ab` bloğundaki jeton değerleri — kontrast kapısıyla AYNI imza. */
function jetonlar(): Record<string, string> {
  const bas = CSS.indexOf('.ab {\n  --zemin:');
  expect(bas, 'palet bloğu bulunamadı — imza `.ab {\\n  --zemin:` '
    + 'kontrast kapısının da okuduğu imzadır').toBeGreaterThan(-1);
  const govde = CSS.slice(bas, CSS.indexOf('\n}', bas));
  const cikti: Record<string, string> = {};
  for (const m of govde.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})\b/g)) {
    if (!(m[1] in cikti)) cikti[m[1]] = m[2].toUpperCase();
  }
  return cikti;
}

/** WCAG 2.1 bağıl parlaklık. */
function parlaklik(hex: string): number {
  const h = hex.replace('#', '');
  const k = [0, 2, 4].map((i) => {
    const s = parseInt(h.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}

/** İki rengin kontrast oranı. */
function oran(a: string, b: string): number {
  const [x, y] = [parlaklik(a), parlaklik(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const J = jetonlar();
const KADEME = [
  ['zemin', 'panel'],
  ['panel', 'panel2'],
] as const;

describe('bekçi · yüzey kademesi [SIS-PAL-001]', () => {
  it('BİRİNCİ DİŞ · kademe SIRALI: zemin < panel < panel-2 [SIS-PAL-001]', () => {
    const z = parlaklik(J.zemin);
    const p = parlaklik(J.panel);
    const p2 = parlaklik(J.panel2);
    expect(p, `panel (${J.panel}) zeminden (${J.zemin}) KOYU ya da eşit — `
      + '"panel zeminin bir kademe üstüdür" beyanı tersine dönmüş').toBeGreaterThan(z);
    expect(p2, `panel-2 (${J.panel2}) panelden (${J.panel}) KOYU ya da eşit — `
      + 'kademe sıralı değil').toBeGreaterThan(p);
  });

  it('İKİNCİ DİŞ · her komşu adım ALGILANABİLİR [SIS-PAL-001]', () => {
    /* Taban BİNDE tutulur (1144 = 1,144:1): `olcum-tabani.json` tam sayı
       kütüğüdür ve cırcır "yalnız yükselir" der — yani kademe bir daha
       düzleşemez, ancak gerekçeli `--taban-yaz` ile inebilir. */
    const binde = KADEME.map(([a, b]) => Math.round(oran(J[a], J[b]) * 1000));
    const enDar = Math.min(...binde);
    const dokum = KADEME.map(([a, b], i) => `${a}→${b} ${(binde[i] / 1000).toFixed(3)}:1`).join(' · ');

    /* Mutlak alt sınır: 1,10:1 altı koyu yüzeyde AYRIŞMA SAYILMAZ. Sayı
       ölçümden değil kusurdan gelir — 1,097:1'lik eski kademe "üç kademe"
       diye yazılıyordu ve göz onu tek yüzey görüyordu. */
    expect(enDar, `Kademe çökmüş: ${dokum}. Koyu arayüzde 1,100:1 altı bir `
      + 'adım AYRIŞMA DEĞİLDİR; üç yüzey tek siyah olarak okunur ve ekran '
      + 'düzenini kaybeder.').toBeGreaterThanOrEqual(1100);

    tabanDogrula('palet.kademeBinde', enDar);
  });

  it('ÜÇÜNCÜ DİŞ · saç çizgileri EN PARLAK yüzeyin de üstünde [SIS-PAL-001]', () => {
    /* Bu kusur bu turda GERÇEKTEN oldu: panel #0F1213'ten #1D1F20'ye
       çıkınca eski `--hr` (#1C2123) panelden KOYU kaldı — panel üstündeki
       her kenarlık görünmez olurdu. Ayraç, üstüne çizildiği EN PARLAK
       yüzeyden parlak olmak zorundadır. */
    const p2 = parlaklik(J.panel2);
    expect(parlaklik(J.hr), `--hr (${J.hr}) en parlak yüzeyden (panel-2 `
      + `${J.panel2}) koyu — panel-2 üstündeki kenarlıklar görünmez olur`)
      .toBeGreaterThan(p2);
    expect(parlaklik(J.hr2), `--hr2 (${J.hr2}) --hr'den (${J.hr}) koyu — `
      + 'güçlü ayraç zayıf ayraçtan silik olamaz').toBeGreaterThan(parlaklik(J.hr));
  });

  it('BEŞİNCİ DİŞ · doku saydamlığı KATMANDA durur, her görselde değil [SIS-PAL-001]', () => {
    /* ── ÖLÇÜLEN · bağımsız inceleme, PR #73 (P2) ────────────────────────
       Saha fotoğrafı bu turda dokuya indirildi (`--fon-doku`) ve
       saydamlık iki `img`in HER BİRİNE yazıldı. Çapraz geçişte üstteki
       görsel tabanı ÖRTMEK zorundadır; %14'te durunca örtmüyor,
       KARIŞIYORDU — iki AYRI fotoğraf üst üste, 1 − (1 − 0,14)² ≈ %26.

       Bu bir KADEME kusurudur ve bu kapıya aittir: yüzey kademesi
       `--panel`in parlaklığını ölçer, ama o yüzeyin üstüne binen doku
       ölçülenden koyu bir yüzey üretirse kademe kâğıt üstünde kalır.
       Kullanıcının "fazla karanlık" şikâyetini düzeltirken aynı
       şikâyetin yeni bir kaynağını üretmiştim.

       Diş yapıyı ölçer: saydamlık KATMANDA (`.ab-b-fon`), geçiş
       `img`de ve üst görsel hazır olduğunda TAM OPAK. */
    const kat = /\.ab-b-fon \{[^}]*\}/.exec(CSS)?.[0] ?? '';
    expect(kat, '`.ab-b-fon` bloğu bulunamadı').not.toBe('');
    expect(kat, 'Doku saydamlığı katmanda değil. `--fon-doku` `.ab-b-fon`da durmazsa '
      + 'her görsele ayrı ayrı yazılır ve üst üste binen iki görsel BİRLEŞİR — '
      + 'yüzey ölçülenden koyu olur.').toMatch(/opacity:\s*var\(--fon-doku\)/);

    const tekil = /\.ab-b-fon > img \{[^}]*\}/.exec(CSS)?.[0] ?? '';
    expect(tekil, '`.ab-b-fon > img` bloğu bulunamadı').not.toBe('');
    expect(tekil, 'Doku saydamlığı HEM katmana HEM her görsele yazılmış; ikisi '
      + 'çarpılır ve çapraz geçiş yine karışır.').not.toMatch(/opacity:/);

    expect(CSS, 'Üst görsel geçiş sonunda TAM OPAK değil — tabanı örtmez, onunla '
      + 'karışır (ölçüldü: birleşik %26, hedeflenen %14).')
      .toMatch(/\.ab-b-fon > img\.ust\.hazir \{ opacity: 1; \}/);

    /* Katman saydamsa kendi zeminini taşıyamaz: panel yüzeyi bir ÜST
       kapta durmalı, yoksa doku kendi zeminini de soldurur. */
    const alan = /\.ab-b-alan \{[^}]*\}/.exec(CSS)?.[0] ?? '';
    expect(alan, 'Panel yüzeyi `.ab-b-alan`da değil — saydam fon katmanının arkasında '
      + 'yüzey kalmaz ve kademe sayfa zeminine düşer.').toMatch(/background:\s*var\(--panel\)/);
  });

  it('DÖRDÜNCÜ DİŞ · DESIGN.md yazdığı kademe ÖLÇÜLENLE aynı [SIS-PAL-001]', () => {
    /* Bu kapının doğum sebebi belgenin koddan ayrışmasıydı: belge "üç
       kademe" diyordu, kod kademe taşımıyordu. Beyanı ölçüme bağlamazsak
       aynı ayrışma yarın sessizce geri gelir (R-F'in paletteki karşılığı). */
    const bekleme: [string, string, number][] = [
      ['zemin', 'panel', oran(J.zemin, J.panel)],
      ['panel', 'panel-2', oran(J.panel, J.panel2)],
      ['zemin', 'panel-2', oran(J.zemin, J.panel2)],
    ];
    for (const [a, b, olculen] of bekleme) {
      const kalip = new RegExp(`${a} → ${b} \`([0-9],[0-9]{3}):1\``);
      const m = kalip.exec(BELGE);
      expect(m, `DESIGN.md ${a} → ${b} kademesini YAZMIYOR. Kademe belgede `
        + 'sayısıyla durmalı: "zemin → panel `1,144:1`" biçiminde.').not.toBeNull();
      const yazilan = Number(m![1].replace(',', '.'));
      expect(yazilan, `DESIGN.md ${a} → ${b} için ${m![1]} yazıyor, ölçülen `
        + `${olculen.toFixed(3)} — belge koddan AYRIŞMIŞ.`)
        .toBeCloseTo(Number(olculen.toFixed(3)), 3);
    }
  });
});
