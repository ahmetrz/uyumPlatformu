import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   `xlsx` NÖBETÇİSİ — `npm audit`in artık göremediği yerin bekçisi

   ── Durum ─────────────────────────────────────────────────────────────
   SheetJS npm'e yayın yapmayı 0.18.5'te bıraktı ve dağıtımını kendi
   sitesine taşıdı. npm kayıt defterindeki EN YENİ sürüm hâlâ 0.18.5'tir
   ve iki yüksek önemde açık taşır:
     · GHSA-4r6h-8v6p-xvw6 — Prototype Pollution   (0.19.3'te kapandı)
     · GHSA-5pgg-2g8v-p4x9 — ReDoS                 (0.20.2'de kapandı)
   `npm audit` bu paket için "No fix available" diyordu; doğruydu —
   NPM'DE düzeltme yok. SheetJS'in kendi dağıtımında var.

   Yamalı tarball `web/vendor/` altında DEPODA DURUR ve bağımlılık ona
   `file:` ile bağlanır. Kütüphane aynı kütüphanedir, yalnız yamalı
   sürümüdür; çağrı yerlerinin hiçbiri değişmedi.

   Depoya konmasının sebebi kurumsal ağdır: `cdn.sheetjs.com`a çıkışı
   olmayan (Nexus/Artifactory arkasındaki) bir koşucuda uzak tarball
   kurulamaz. Depodaki dosya her yerde kurulur, IT'den izin istemez.

   ── Bu testin VAR OLMA SEBEBİ ─────────────────────────────────────────
   Bedeli şudur: paket kayıt defterinde durmadığı için `npm audit` onun
   hakkında ARTIK HİÇBİR ŞEY BİLMEZ. Uyarı kayboldu — ama gelecekteki
   uyarılar da kaybolacak. Kaybolan sinyalin yerine bu nöbetçi geçer:

     1. Bağımlılık npm'in yamasız 0.18.x'ine GERİ DÜŞMESİN (birinin
        "audit temiz olsun" diye `npm install xlsx` yazması yeter).
     2. Sürüm iki açığın da kapandığı tabanın altına inmesin.
     3. Depodaki ikili DEĞİŞMESİN. Kayıt defterinin imza zincirinin
        dışındayız; tedarik zinciri bütünlüğünü artık yalnız kilit
        dosyasındaki özet taşıyor. Bu test o özeti dosyanın kendisinden
        yeniden hesaplar — yani "kilitte yazan" ile "diskte duran"
        birbirini doğrular. Biri sessizce takas edilirse burada patlar.

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

const SPEC: string = paket.dependencies.xlsx;

describe('xlsx — depodaki yamalı tarball', () => {
  it('bağımlılık npm kayıt defterine değil DEPODAKİ dosyaya bağlıdır', () => {
    expect(SPEC, 'npm sürümü yamasızdır; bağımlılık `file:vendor/…` olmalı')
      .toMatch(/^file:vendor\/xlsx-\d+\.\d+\.\d+\.tgz$/);
  });

  it('dosya adındaki sürüm yamalı tabanın üstündedir', () => {
    const m = /xlsx-(\d+\.\d+\.\d+)\.tgz$/.exec(SPEC);
    expect(m, 'tarball adından sürüm okunamadı').not.toBeNull();
    expect(enAz(surumParcala(m![1]), TABAN), `${m![1]} < ${TABAN.join('.')}`).toBe(true);
  });

  it('tarball gerçekten depoda durur', () => {
    const yol = path.join(KOK, SPEC.replace(/^file:/, ''));
    expect(existsSync(yol), `depoda yok: ${SPEC}`).toBe(true);
  });

  it('KURULU sürüm de tabanın üstündedir', () => {
    // package.json doğru yazsa bile kurulum başka bir şey getirmiş
    // olabilir; ölçülen şey niyet değil, diskteki gerçektir.
    const kurulu = JSON.parse(
      readFileSync(path.join(KOK, 'node_modules', 'xlsx', 'package.json'), 'utf8'),
    ).version as string;
    expect(enAz(surumParcala(kurulu), TABAN), `kurulu ${kurulu} < ${TABAN.join('.')}`).toBe(true);
  });

  it('depodaki ikilinin ÖZETİ kilit dosyasındakiyle birebir aynıdır', () => {
    /* Zincirin son halkası. Kilitteki özet, tarball SheetJS'in kendi
       dağıtımından indirilirken npm tarafından hesaplandı; buradaki özet
       depodaki dosyadan yeniden hesaplanıyor. İkisi tutuyorsa depodaki
       dosya, üreticinin yayımladığı dosyanın aynısıdır. */
    const giris = kilit.packages?.['node_modules/xlsx'];
    expect(giris, 'kilit dosyasında xlsx girdisi yok').toBeTruthy();
    expect(giris.resolved).toBe(SPEC.replace(/^file:/, 'file:'));
    expect(giris.integrity, 'kilit dosyasında bütünlük özeti yok').toMatch(/^sha512-/);

    const bayt = readFileSync(path.join(KOK, SPEC.replace(/^file:/, '')));
    const ozet = `sha512-${createHash('sha512').update(bayt).digest('base64')}`;
    expect(ozet, 'depodaki tarball kilitte yazan dosya DEĞİL').toBe(giris.integrity);
  });
});
