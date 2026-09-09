/* Göç zinciri kapısının davranış testi (arac/goc-zinciri.mjs).

   Kapı, BOŞ bir veritabanında bütün göçleri sırayla uygular ve sonucu
   schema.prisma ile karşılaştırır: fark sıfır olmalıdır. `kapi:sema-sapmasi`
   mevcut dev.db'yi ölçer; elle düzeltilmiş bir göçün (P4 · 2.4) diskteki
   ürünü doğru, zincirdeki hâli yanlış olabilir — müşteri kurulumu yalnız
   zinciri görür. Sabotaj burada KALICIDIR: bir göçten ADD COLUMN silinmiş
   zincir kopyası ve göçsüz bir şema kolonu kırmızı yanmak zorundadır. */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { WEB, gocZinciriOlc, karar } from '../arac/goc-zinciri.mjs';

const GOCLER = path.join(WEB, 'prisma', 'migrations');
const SEMA = path.join(WEB, 'prisma', 'schema.prisma');
/* Elle yazılan ADD COLUMN göçü — kapının var olma sebebi (P4 · 2.4). */
const ESLEME_GOCU = '20260909150000_p4_esleme_aktif';
const SURE = 180_000;

function gecici(ad: string) {
  const yuva = path.join(WEB, '.parti');
  mkdirSync(yuva, { recursive: true });
  return mkdtempSync(path.join(yuva, `${ad}-`));
}

describe('göç zinciri kapısı — boş veritabanı = schema.prisma', () => {
  it('[URN-KUR-008] boş veritabanında bütün göçler uygulanır ve schema.prisma ile fark sıfırdır', () => {
    const o = gocZinciriOlc();
    expect(o.gocler.length).toBeGreaterThan(0);
    expect(o.uygulanan).toEqual(o.gocler);
    expect(o.fark).toBe('');
    expect(karar(o)).toEqual([]);
  }, SURE);

  it('[URN-KUR-008] sabotaj: ADD COLUMN silinmiş zincir kopyası kırmızı yanar — zincir sessizce uygulanır, şema farkı yakalar', () => {
    const kopya = gecici('goc-sabotaj');
    try {
      cpSync(GOCLER, kopya, { recursive: true });
      const dosya = path.join(kopya, ESLEME_GOCU, 'migration.sql');
      const sql = readFileSync(dosya, 'utf8');
      expect(sql).toMatch(/ADD COLUMN "aktif"/);
      writeFileSync(dosya, sql.replace(/^ALTER TABLE "MaddeEslestirmesi" ADD COLUMN "aktif".*$/m, '-- sabotaj: kolon eklenmedi'));
      const o = gocZinciriOlc({ gocDizini: kopya });
      expect(o.uygulanan).toEqual(o.gocler);
      expect(o.fark).toMatch(/"aktif"/);
      expect(karar(o).join('\n')).toMatch(/ayrışıyor/);
    } finally {
      rmSync(kopya, { recursive: true, force: true });
    }
  }, SURE);

  it('[URN-KUR-008] sabotaj: göçsüz şema kolonu kırmızı yanar', () => {
    const kopya = gecici('sema-sabotaj');
    try {
      const sema = readFileSync(SEMA, 'utf8');
      expect(sema).toMatch(/^model RolKatalogu \{/m);
      const semaYolu = path.join(kopya, 'schema.prisma');
      writeFileSync(semaYolu, sema.replace(/^model RolKatalogu \{\n/m, 'model RolKatalogu {\n  sabotajKolonu Int?\n'));
      const o = gocZinciriOlc({ sema: semaYolu });
      expect(o.fark).toMatch(/sabotajKolonu/);
      expect(karar(o).join('\n')).toMatch(/ayrışıyor/);
    } finally {
      rmSync(kopya, { recursive: true, force: true });
    }
  }, SURE);
});
