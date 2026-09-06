import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   P0 · URN-KUR — kurgu, kurallar ve ad

   Bu dosyadaki dört test, P0'ın kabul kriterlerini ölçer. Kriterler belge
   cümleleridir; belge cümleleri sessizce bayatlar. Buradaki testler
   bayatlamayı ilk koşuda kırmızı yapar.

   En önemlisi URN-KUR-004: ürünün adı GEÇİCİDİR
   (`docs/URUN_VIZYONU.md` §10) ve değiştirmek tek satır olmalıdır. Ad
   koda sızarsa değişim bir tarama–değiştir turuna döner ve her turda bir
   yer atlanır — atlanan yer de en görünür yerde yakalanır. */

const WEB = path.resolve(__dirname, '..');
const KOK = path.resolve(WEB, '..');

/** Ürün adının TEK kaynağı; ölçüm bu dosyayı hariç tutar. */
const MARKA_DOSYASI = path.join(WEB, 'lib', 'marka.ts');

/** Adı `marka.ts`'ten okur — testin kendisi de adı gömmez. */
function markaAdi(): string {
  const kaynak = readFileSync(MARKA_DOSYASI, 'utf8');
  const m = /export const MARKA_AD = [^|]*\|\| '([^']+)'/.exec(kaynak);
  if (!m) throw new Error('lib/marka.ts içinde MARKA_AD varsayılanı bulunamadı');
  return m[1];
}

function kaynakDosyalari(): string[] {
  const atla = new Set(['node_modules', '.next', 'prisma-client', 'out', 'coverage', 'vendor']);
  const cikti: string[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      if (atla.has(ad)) continue;
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (/\.(ts|tsx|css)$/.test(ad)) cikti.push(tam);
    }
  };
  for (const alt of ['app', 'components', 'lib', 'tests', 'arac']) {
    const y = path.join(WEB, alt);
    if (existsSync(y)) gez(y);
  }
  return cikti;
}

describe('P0 · ürün adı ve kurgu', () => {
  it('ürün adı yalnız lib/marka.ts içinde düz metin geçer [URN-KUR-004]', () => {
    const ad = markaAdi();
    const sizinti = kaynakDosyalari()
      .filter((f) => f !== MARKA_DOSYASI)
      .filter((f) => readFileSync(f, 'utf8').includes(ad))
      .map((f) => path.relative(KOK, f));

    expect(sizinti, `Ad şu dosyalarda düz metin: ${sizinti.join(', ')}. `
      + 'MARKA_AD içe aktarılmalı — ad değişimi tek satır kalmalı.').toEqual([]);
  });

  it('CLAUDE.md bağlayıcı kuralları kalan/değişen ayrımıyla yazar [URN-KUR-001]', () => {
    const s = readFileSync(path.join(KOK, 'CLAUDE.md'), 'utf8');
    expect(s).toMatch(/^### Kalan kurallar$/m);
    expect(s).toMatch(/^### Değişen kurallar$/m);
    /* Tek dillilik ve gömülü ad iddiaları kalkmış olmalı. */
    expect(s).not.toMatch(/Ürün metinleri, kod yorumları, commit mesajları ve belgeler\s*\n?Türkçedir\./);
    expect(s).not.toMatch(/Ürünün adı \*\*[^*]+\*\*'dur/);
    /* Değişen kuralların üçü adıyla anılmalı. */
    expect(s).toContain('MARKA_AD');
    expect(s).toMatch(/çok dilli/i);
    expect(s).toMatch(/müşteri\/kiracı/);
  });

  it('PRODUCT.md ürünleştirme kurgusunu anlatır [URN-KUR-002]', () => {
    const s = readFileSync(path.join(WEB, 'PRODUCT.md'), 'utf8');
    for (const rol of ['Kiracı yöneticisi', 'Ürün yöneticisi', 'Destek']) {
      expect(s, `${rol} kullanıcı tipi yazılı değil`).toContain(rol);
    }
    expect(s, 'konumlandırma hâlâ dört mekanizma sayıyor').toMatch(/\*\*beş\*\*\s*\n?mekanizma/);
    expect(s, 'ürün adı belgede düz metin geçiyor').not.toContain(markaAdi());
    expect(s).toContain('MARKA_AD');
  });

  it('CLAUDE.md yönlendirme tablosunda ölü atıf yoktur [URN-KUR-003]', () => {
    expect(existsSync(path.join(KOK, 'docs', 'URUN_VIZYONU.md'))).toBe(true);

    const s = readFileSync(path.join(KOK, 'CLAUDE.md'), 'utf8');
    const bolum = s.slice(s.indexOf('## Nereye bakılır'), s.indexOf('## Bağlayıcı kurallar'));
    /* YALNIZ tablo satırları (`|` ile başlayanlar). Tablonun altındaki
       düzyazı bilerek var olmayan dosyalardan söz edebilir — "bu belge
       henüz yok, P1 üretecek" gibi. Kriter tabloyu ölçer: tablo bir
       yönlendirmedir, düzyazı bir açıklamadır. */
    const tablo = bolum.split('\n').filter((l) => l.trimStart().startsWith('|')).join('\n');
    /* Tablo satırlarındaki her backtick'li yol adayı; yalnız gerçekten
       dosya/dizin gibi görünenler (uzantılı ya da `/` ile biten). */
    const hedefler = [...tablo.matchAll(/`([^`]+)`/g)]
      .map((m) => m[1])
      .filter((y) => /\.(md|mjs|json|ts|tsx|prisma|yml)$/.test(y) || y.endsWith('/'));

    expect(hedefler.length, 'tablo hiç hedef göstermiyor — ayrıştırma kırılmış olabilir')
      .toBeGreaterThan(10);

    const olu = hedefler.filter((y) => !existsSync(path.join(KOK, y)));
    expect(olu, `Var olmayan hedefler: ${olu.join(', ')}`).toEqual([]);
  });
});
