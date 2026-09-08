import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/* ═══════════════════════════════════════════════════════════════════════
   TEK NÜSHA — "kapının okuduğu şey tek yerde tutulur; ikincisi kırmızıdır"

   Bu projede tekrar tekrar batan şey aynı sınıftı ve her seferinde başka
   kılıkta geldi:

     · `rota-duman` ve `gezinme-testi` KENDİ `girisYap` kopyalarını
       taşıyordu; #28 ortak işleve bir CTA adımı verdi, kopyalar almadı ve
       iki araç da main'e KIRIK girdi;
     · `statik-kontrol` kendi `tarayiciYolu`nu taşıyordu ve kopya çoktan
       ayrışmıştı (`PLAYWRIGHT_BROWSERS_PATH` · `chrome-linux64` ·
       headless-shell yollarını görmüyordu);
     · `konsol-olcum` üçüncü bir `girisYap` kopyası taşıyordu;
     · `kabuk.css` `unite`/`uniteler` sınıf adlarını tutuyordu, JSX
       `birim`/`birimler`e geçmişti: dar bant yerleşimi ölü koddu ve
       375px'te iki öğe üst üste biniyordu;
     · oturumsuz rota listesi ELLE tutulan başka bir listeye karşı
       kontrol ediliyordu — iki elle liste birbirini doğrulamaz.

   Kural DAR ve YAPISAL, kopya ARAMASI değil:

     1 · `arac/kosu-ortak.mjs`in İŞLEV olarak dışa verdiği hiçbir ad,
         `arac/` altındaki başka bir dosyada YENİDEN TANIMLANAMAZ.
         Korunan ad kümesi modülün KENDİSİNDEN türer: oraya yeni bir
         işlev eklendiği anda kural onu da kapsar, elle liste yok.
         `export const` DEĞERLER kapsam dışıdır — `KOK` gibi yerel yol
         sabitlerini her araç kendi bağlamıyla tanımlayabilir; kopya
         olarak sürüklenen şey DAVRANIŞTIR.

     2 · Kapıların okuduğu her JSON LİSTESİ tek dosyadır ve o dosya
         okunamadığında kapı SESSİZCE boş listeye düşmez. Liste
         dosyaları diskten TÜRETİLİR; buradaki sayı elle tutulmaz.
   ═══════════════════════════════════════════════════════════════════════ */

const WEB = fileURLToPath(new URL('..', import.meta.url));
const ARAC = path.join(WEB, 'arac');

/** Yorumları atar: yorumdaki bir örnek kod parçası tanım sayılmamalı. */
const yorumsuz = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** `kosu-ortak.mjs`in İŞLEV olarak dışa verdiği adlar — kaynağından türer. */
function korunanAdlar(): string[] {
  const s = yorumsuz(readFileSync(path.join(ARAC, 'kosu-ortak.mjs'), 'utf8'));
  return [...s.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
}

/** `arac/` altındaki, ortak modül DIŞINDAKİ bütün `.mjs` dosyaları. */
const araclar = () =>
  readdirSync(ARAC).filter((d) => d.endsWith('.mjs') && d !== 'kosu-ortak.mjs').sort();

/** `ad` bu kaynakta ÜST DÜZEY bir tanım olarak geçiyor mu? */
export function yenidenTanim(kaynak: string, ad: string): boolean {
  const re = new RegExp(
    `^\\s*(?:export\\s+)?(?:async\\s+function|function|const|let|var|class)\\s+${ad}\\b`,
    'm',
  );
  return re.test(yorumsuz(kaynak));
}

describe('tek nüsha · 1 · ortak davranış yeniden tanımlanmaz', () => {
  it('korunan ad kümesi ORTAK MODÜLDEN türer, elle yazılmaz', () => {
    const adlar = korunanAdlar();
    expect(adlar.length).toBeGreaterThan(5);
    // Kusurun kendisini üreten iki ad kümede OLMALI.
    expect(adlar).toContain('girisYap');
    expect(adlar).toContain('tarayiciYolu');
  });

  it('`arac/` altında ortak işlevlerin ikinci tanımı YOK', () => {
    const adlar = korunanAdlar();
    const ihlaller: string[] = [];
    for (const dosya of araclar()) {
      const kaynak = readFileSync(path.join(ARAC, dosya), 'utf8');
      for (const ad of adlar) if (yenidenTanim(kaynak, ad)) ihlaller.push(`${dosya} → ${ad}`);
    }
    expect(
      ihlaller,
      `Ortak modülün işlevi başka dosyada yeniden tanımlanmış:\n  ${ihlaller.join('\n  ')}\n`
      + '  Kopya değil, `kosu-ortak.mjs`ten içe aktarın: kopya ilk değişiklikte ayrışır\n'
      + '  ve ayrıştığını hiçbir şey söylemez (ölçüldü: üç `girisYap`, iki `tarayiciYolu`).',
    ).toEqual([]);
  });

  it('KURAL İŞLİYOR — sahte bir ikinci tanım yakalanır', () => {
    /* Kuralın kendisi sınanmalı: yalnız "bugün ihlal yok" diyen bir
       iddia, kural bozulduğunda da yeşil kalır. */
    expect(yenidenTanim('async function girisYap(s) {}', 'girisYap')).toBe(true);
    expect(yenidenTanim('const tarayiciYolu = () => {}', 'tarayiciYolu')).toBe(true);
    expect(yenidenTanim('import { girisYap } from "./kosu-ortak.mjs";', 'girisYap')).toBe(false);
    expect(yenidenTanim('await girisYap(sayfa);', 'girisYap')).toBe(false);
    // Yorum içindeki örnek bir tanım İHLAL DEĞİLDİR.
    expect(yenidenTanim('/* function girisYap() {} */', 'girisYap')).toBe(false);
  });
});

/* ── 2 · Liste dosyaları ───────────────────────────────────────────────
   Kapsam DİSKTEN türer: `arac/*.json` ve `tests/bekci/*.json`. Elle
   yazılmış bir liste, yeni bir liste eklendiği gün eksilir ve
   eksildiğini kimse görmez — bu dosyanın anlattığı kusurun aynısı. */
const listeDosyalari = () => [
  ...readdirSync(ARAC).filter((d) => d.endsWith('.json')).map((d) => path.join('arac', d)),
  ...(existsSync(path.join(WEB, 'tests/bekci'))
    ? readdirSync(path.join(WEB, 'tests/bekci'))
      .filter((d) => d.endsWith('.json')).map((d) => path.join('tests/bekci', d))
    : []),
];

describe('tek nüsha · 2 · kapı listeleri', () => {
  it('her liste dosyası VAR, okunur ve geçerli JSON', () => {
    const liste = listeDosyalari();
    expect(liste.length).toBeGreaterThan(0);
    for (const y of liste) {
      const tam = path.join(WEB, y);
      expect(existsSync(tam), `${y} yok`).toBe(true);
      expect(() => JSON.parse(readFileSync(tam, 'utf8')), `${y} bozuk JSON`).not.toThrow();
    }
  });

  it('hiçbir listenin İKİNCİ NÜSHASI yok — aynı içerik iki dosyada duramaz', () => {
    /* İçerik özdeşliği, kopyayı ADINDAN bağımsız yakalar: bir listeyi
       başka adla kopyalamak da ikinci nüshadır. */
    const gorulen = new Map<string, string>();
    const ikizler: string[] = [];
    for (const y of listeDosyalari()) {
      const icerik = JSON.stringify(JSON.parse(readFileSync(path.join(WEB, y), 'utf8')));
      const ilk = gorulen.get(icerik);
      if (ilk) ikizler.push(`${ilk} ≡ ${y}`);
      else gorulen.set(icerik, y);
    }
    expect(ikizler, `aynı içeriği taşıyan iki liste:\n  ${ikizler.join('\n  ')}`).toEqual([]);
  });

  it('her listenin EN AZ BİR okuyucusu var — okunmayan liste ölü koddur', () => {
    const kaynaklar: string[] = [];
    const gez = (kok: string) => {
      for (const e of readdirSync(kok, { withFileTypes: true })) {
        const p = path.join(kok, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === 'prisma-client' || e.name === '.next') continue;
          gez(p);
        } else if (/\.(mjs|ts|tsx)$/.test(e.name)) kaynaklar.push(readFileSync(p, 'utf8'));
      }
    };
    for (const k of ['arac', 'tests', 'lib', 'app', 'components']) {
      if (existsSync(path.join(WEB, k))) gez(path.join(WEB, k));
    }
    const govde = kaynaklar.join('\n');
    const okunmayan = listeDosyalari()
      .map((y) => path.basename(y))
      .filter((ad) => !govde.includes(ad));
    expect(
      okunmayan,
      `hiçbir kapı okumuyor: ${okunmayan.join(', ')} — ya bağlayın ya silin`,
    ).toEqual([]);
  });
});
