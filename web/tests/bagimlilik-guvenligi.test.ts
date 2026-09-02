import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   `xlsx` SÜRÜM NÖBETÇİSİ — `npm audit`in artık göremediği yerin bekçisi

   ── Durum ─────────────────────────────────────────────────────────────
   SheetJS npm'e yayın yapmayı 0.18.5'te bıraktı ve dağıtımını kendi
   sitesine taşıdı. npm kayıt defterindeki EN YENİ sürüm hâlâ 0.18.5'tir
   ve iki yüksek önemde açık taşır:
     · GHSA-4r6h-8v6p-xvw6 — Prototype Pollution   (0.19.3'te kapandı)
     · GHSA-5pgg-2g8v-p4x9 — ReDoS                 (0.20.2'de kapandı)
   `npm audit` bu paket için "No fix available" diyordu; doğruydu —
   NPM'DE düzeltme yok. SheetJS'in kendi dağıtımında var.

   Bu yüzden bağımlılık `https://cdn.sheetjs.com/...` tarball'ına
   bağlandı. Kütüphane aynı kütüphanedir, yalnız yamalı sürümüdür;
   çağrı yerlerinin hiçbiri değişmedi.

   ── Bu testin VAR OLMA SEBEBİ ─────────────────────────────────────────
   Bedeli şudur: bir tarball URL'i kayıt defterinde durmadığı için
   `npm audit` o paket hakkında ARTIK HİÇBİR ŞEY BİLMEZ. Uyarı kayboldu
   — ama gelecekteki uyarılar da kaybolacak. Kaybolan sinyalin yerine
   bu nöbetçi geçer:

     1. Bağımlılık npm'in yamasız 0.18.x'ine GERİ DÜŞMESİN (birinin
        "audit temiz olsun" diye `npm install xlsx` yazması yeter).
     2. Kurulu sürüm iki açığın da kapandığı tabanın altına inmesin.
     3. Kilit dosyası bir bütünlük özeti tutsun — tarball URL'i kayıt
        defterinin imza zincirinin dışındadır, tedarik zinciri
        bütünlüğünü artık YALNIZ bu özet taşır.

   Sürüm yükseltilirken TABAN da yükseltilir; düşürülürken bu test
   düşmeyi görür ve gerekçe yazmaya zorlar.
   ═══════════════════════════════════════════════════════════════════════ */

/** İki açığın da kapandığı en düşük sürüm (ReDoS 0.20.2'de kapandı). */
const TABAN = [0, 20, 2] as const;

const KOK = process.cwd();
const paket = JSON.parse(readFileSync(path.join(KOK, 'package.json'), 'utf8'));
const kilit = JSON.parse(readFileSync(path.join(KOK, 'package-lock.json'), 'utf8'));

/** `1.2.3` → [1, 2, 3]; ayrıştırılamayan parça 0 sayılır. */
function surumParcala(s: string): number[] {
  return s.split('.').map((p) => Number.parseInt(p, 10) || 0);
}

/** a ≥ b mi? */
function enAz(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
}

describe('xlsx — SheetJS kendi dağıtımına bağlı kalır', () => {
  it('bağımlılık npm kayıt defterine değil SheetJS dağıtımına işaret eder', () => {
    const spec: string = paket.dependencies.xlsx;
    expect(spec, 'npm sürümü yamasızdır; bağımlılık cdn.sheetjs.com tarball\'ı olmalı')
      .toMatch(/^https:\/\/cdn\.sheetjs\.com\/xlsx-\d+\.\d+\.\d+\/xlsx-\d+\.\d+\.\d+\.tgz$/);
  });

  it('bağımlılıkta yazan sürüm yamalı tabanın üstündedir', () => {
    const spec: string = paket.dependencies.xlsx;
    const m = /xlsx-(\d+\.\d+\.\d+)\.tgz$/.exec(spec);
    expect(m, 'tarball adından sürüm okunamadı').not.toBeNull();
    expect(enAz(surumParcala(m![1]), TABAN), `${m![1]} < ${TABAN.join('.')}`).toBe(true);
  });

  it('KURULU sürüm de tabanın üstündedir', () => {
    // package.json doğru yazsa bile kurulum başka bir şey getirmiş
    // olabilir; ölçülen şey niyet değil, diskteki gerçektir.
    const kurulu = JSON.parse(
      readFileSync(path.join(KOK, 'node_modules', 'xlsx', 'package.json'), 'utf8'),
    ).version as string;
    expect(enAz(surumParcala(kurulu), TABAN), `kurulu ${kurulu} < ${TABAN.join('.')}`).toBe(true);
  });

  it('kilit dosyası bütünlük özeti taşır', () => {
    // Kayıt defterinin imza zinciri dışında olduğumuz için tedarik
    // zinciri bütünlüğünü artık yalnız bu özet taşıyor.
    const giris = kilit.packages?.['node_modules/xlsx'];
    expect(giris, 'kilit dosyasında xlsx girdisi yok').toBeTruthy();
    expect(giris.resolved).toContain('cdn.sheetjs.com');
    expect(giris.integrity, 'tarball için bütünlük özeti yok').toMatch(/^sha(256|512)-/);
  });
});
