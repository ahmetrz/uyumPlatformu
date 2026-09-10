import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { guvenliSayfaAdi, kalkanliSatir, xlsxKitabi } from '@/lib/disaAktarim/xlsx';

/* ═══════════════════════════════════════════════════════════════════════
   XLSX ÜRETİMİ — denetçiye giden çalışma kitabının kuralları

   CSV'nin kuralları körlemesine kopyalanmadı; XLSX'te ne olduğu ÖLÇÜLDÜ.
   Ölçüm şuydu: SheetJS tehlikeli dizeyi kendiliğinden formül hücresi
   yapmıyor, ama `t="str"` (formül SONUCU) tipiyle yazıyor. Bu dosya iki
   şeyi birden sabitler — üretilen kitapta formül hücresi YOKTUR ve
   kalkan CSV ile AYNI kuralı uygular.
   ═══════════════════════════════════════════════════════════════════════ */

const oku = (buf: Buffer) => XLSX.read(buf, { type: 'buffer' });

describe('XLSX · formül enjeksiyonu', () => {
  const SALDIRI = "=cmd|'/C calc'!A0";

  it('tehlikeli dize FORMÜL HÜCRESİ olarak yazılmaz', () => {
    const kitap = oku(xlsxKitabi([{ ad: 'S', satirlar: [['ad'], [SALDIRI]] }]));
    const sayfa = kitap.Sheets[kitap.SheetNames[0]!]!;
    for (const [adres, hucre] of Object.entries(sayfa)) {
      if (adres.startsWith('!')) continue;
      expect((hucre as { f?: string }).f, `${adres} formül hücresi`).toBeUndefined();
    }
  });

  it('tehlikeli dize KALKANDAN geçer (CSV ile aynı kural)', () => {
    const kitap = oku(xlsxKitabi([{ ad: 'S', satirlar: [['ad'], [SALDIRI]] }]));
    const sayfa = kitap.Sheets[kitap.SheetNames[0]!]!;
    expect((sayfa.A2 as { v: string }).v).toBe(`'${SALDIRI}`);
  });

  it('dört tehlikeli başlangıcın dördü de kalkanlı', () => {
    /* `=` `+` `-` `@` — Excel dördünü de formül başlangıcı sayar. */
    const satir = kalkanliSatir(['=A1', '+A1', '-A1', '@A1']);
    expect(satir).toEqual(["'=A1", "'+A1", "'-A1", "'@A1"]);
  });

  it('SAYI GİBİ metin bozulmaz — denetim formundaki eksi değer korunur', () => {
    /* `-5` bir saldırı değil; ona tırnak koymak formu bozardı. */
    expect(kalkanliSatir(['-5', '3,14', '1.234'])).toEqual(['-5', '3,14', '1.234']);
  });

  it('SAYI tipi SAYI kalır — denetçi toplam alabilsin', () => {
    const kitap = oku(xlsxKitabi([{ ad: 'S', satirlar: [['n'], [42]] }]));
    const sayfa = kitap.Sheets[kitap.SheetNames[0]!]!;
    expect((sayfa.A2 as { t: string; v: number }).t).toBe('n');
    expect((sayfa.A2 as { t: string; v: number }).v).toBe(42);
  });
});

describe('XLSX · kitabın kendisi', () => {
  it('SIFIR sayfalı kitap üretilmez — Excel onu bozuk sayar', () => {
    expect(() => xlsxKitabi([])).toThrow(/en az bir sayfa/);
  });

  it('sayfa adındaki yasak karakterler temizlenir, 31 karaktere kırpılır', () => {
    expect(guvenliSayfaAdi('Ek-3: Seviye [taslak]/2')).toBe('Ek-3 Seviye taslak 2');
    expect(guvenliSayfaAdi('x'.repeat(50))).toHaveLength(31);
    expect(guvenliSayfaAdi('   ')).toBe('Sayfa');
  });

  it('AYNI ADLI iki sayfa çakışmaz — çakışma dosyayı bozardı', () => {
    const kitap = oku(xlsxKitabi([
      { ad: 'Bölüm', satirlar: [['a']] },
      { ad: 'Bölüm', satirlar: [['b']] },
    ]));
    expect(kitap.SheetNames).toHaveLength(2);
    expect(new Set(kitap.SheetNames).size).toBe(2);
  });

  it('boş olmayan sayfa BAŞLIĞI dondurur', () => {
    const kitap = oku(xlsxKitabi([{ ad: 'S', satirlar: [['ad'], ['x']] }]));
    expect(kitap.SheetNames[0]).toBe('S');
  });
});
