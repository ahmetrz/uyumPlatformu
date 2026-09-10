import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/* ═══════════════════════════════════════════════════════════════════════
   `'use server'` DOSYASI YALNIZ ASYNC FONKSİYON İHRAÇ EDER [URN-KUR-010]

   ÖLÇÜLDÜ (9 Eyl 2026, R12): `lib/eylemler2/denetimFormu.ts` iki sabit
   ihraç ediyordu —

       export const FORM_TURLERI = ['oz_denetim', 'soa'] as const;

   `tsc --noEmit` temiz, `eslint` temiz, üretim derlemesi temiz, rota duman
   testi 200 döndü. Kusur ancak CANLI SUNUCUDA DÜĞMEYE BASILINCA çıktı:
   eylem 500 verdi ve gerçek sebep yalnız sunucu günlüğünde durdu —

       A "use server" file can only export async functions, found object.

   Bu sınıfın tehlikesi sessizliğidir: ekran derlenir, sayfa açılır, kapı
   yeşil yanar ve yalnız KULLANICININ tıkladığı yol kırılır. Bu yüzden
   kural bir bekçiyle tutuluyor — bir sonraki sabit, tıklamayı bekleyip
   müşteri kurulumunda patlamasın.

   Tür ihraçları serbesttir: `export type` ve `export interface` derleme
   sonrası ORTADAN KALKAR, çalışma zamanında ihraç değildir.
   ═══════════════════════════════════════════════════════════════════════ */

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Yasak ihraç satırlarını döndürür — SAF, fikstürle sabotajlanabilir. */
export function yasakIhraclar(kaynak: string): { satir: number; metin: string }[] {
  if (!/^\s*['"]use server['"]/m.test(kaynak)) return [];
  const bulunan: { satir: number; metin: string }[] = [];
  kaynak.split('\n').forEach((ham, i) => {
    const s = ham.trim();
    if (!s.startsWith('export')) return;
    /* Tür ihracı çalışma zamanında yoktur. */
    if (/^export\s+(type|interface)\b/.test(s)) return;
    /* Tek meşru çalışma zamanı ihracı: async fonksiyon. */
    if (/^export\s+async\s+function\b/.test(s)) return;
    /* `export {}` boş ihraç da zararsızdır (modül işareti). */
    if (/^export\s*\{\s*\}\s*;?$/.test(s)) return;
    bulunan.push({ satir: i + 1, metin: s.slice(0, 120) });
  });
  return bulunan;
}

function eylemDosyalari(): string[] {
  const dizin = path.join(WEB, 'lib/eylemler2');
  return readdirSync(dizin)
    .filter((d) => d.endsWith('.ts'))
    .map((d) => path.join('lib/eylemler2', d))
    .concat(['lib/eylemler.ts', 'lib/girisEylemleri.ts']);
}

describe("`'use server'` ihraç kuralı [URN-KUR-010]", () => {
  it('sunucu eylemi dosyalarının HİÇBİRİ nesne/sabit ihraç etmiyor', () => {
    const kusurlar: string[] = [];
    let taranan = 0;
    for (const yol of eylemDosyalari()) {
      let kaynak: string;
      try { kaynak = readFileSync(path.join(WEB, yol), 'utf8'); } catch { continue; }
      if (!/^\s*['"]use server['"]/m.test(kaynak)) continue;
      taranan += 1;
      for (const k of yasakIhraclar(kaynak)) {
        kusurlar.push(`${yol}:${k.satir} → ${k.metin}`);
      }
    }
    /* SIFIR ÖLÇÜMLE "kusur yok" DEMEK, hiçbir şeye bakmadan temiz
       raporlamaktır: tarama gerçekten dosya görmüş olmalı. */
    expect(taranan, 'hiçbir `use server` dosyası taranmadı — tarama boş bakıyor')
      .toBeGreaterThan(20);
    expect(kusurlar, `yasak ihraç:\n${kusurlar.join('\n')}`).toEqual([]);
  });

  it('SABOTAJ: sabit ihracı yakalanır', () => {
    /* Kusurun ÖLÇÜLEN hâli — R12'de tam olarak bu satır 500 üretti. */
    const kaynak = "'use server';\n"
      + "export const FORM_TURLERI = ['oz_denetim', 'soa'] as const;\n"
      + 'export async function x() { return 1; }\n';
    expect(yasakIhraclar(kaynak)).toHaveLength(1);
    expect(yasakIhraclar(kaynak)[0]!.metin).toContain('FORM_TURLERI');
  });

  it('SENKRON fonksiyon ihracı da yakalanır', () => {
    expect(yasakIhraclar("'use server';\nexport function x() { return 1; }\n"))
      .toHaveLength(1);
  });

  it('yeniden ihraç (`export *`, `export {…}`) yakalanır', () => {
    /* Nesne taşıyabilir; ihracın ne olduğu bu dosyadan görünmez. */
    expect(yasakIhraclar("'use server';\nexport * from './x';\n")).toHaveLength(1);
    expect(yasakIhraclar("'use server';\nexport { a } from './x';\n")).toHaveLength(1);
  });

  it('TÜR ihracı serbesttir — çalışma zamanında yoktur', () => {
    const kaynak = "'use server';\n"
      + 'export type Sonuc = { ok: true } | { ok: false };\n'
      + 'export interface X { a: number }\n'
      + 'export async function f() { return 1; }\n';
    expect(yasakIhraclar(kaynak)).toEqual([]);
  });

  it("`'use server'` OLMAYAN dosya bu kuralın dışındadır", () => {
    expect(yasakIhraclar("export const A = [1, 2];\n")).toEqual([]);
  });
});
