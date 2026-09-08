import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kurgusal-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { KISILER, TUM_KURULUS_ADLARI } = await import('../../prisma/kurgusal-adlar');

/* ═══════════════════════════════════════════════════════════════════════
   KURGUSAL AD BEKÇİSİ — depoya gerçek bir kuruluş adı giremez

   ── DOĞURAN KUSUR (ölçüldü · 8 Eylül 2026) ────────────────────────────
   Tohumda on sekiz GERÇEK şirket adı vardı ve bazılarına uydurma
   güvenlik zafiyeti bağlıydı: bir firma için "uzaktan erişimi var,
   oturum kaydı YOK, kritiklik kritik". Depo public, sayfa YAYINDA ve
   demo dışarıya gösteriliyor — yani gerçek firmalar hakkında gerçekmiş
   gibi okunacak olumsuz bir iddia. Kusur main'e girdi ve yayına çıktı.

   Ürünün kuralı bunu zaten yasaklıyordu; kuralı TUTAN bir şey yoktu.

   ── NİÇİN KARA LİSTE DEĞİL ────────────────────────────────────────────
   "Siemens · ABB · Cisco…" diye bir yasak liste bilinen kötü örnekleri
   yakalar, YARIN eklenecek on dokuzuncuyu yakalamaz. Bu bekçi tersten
   kurulu: ad kaynağı TEKTİR (`prisma/kurgusal-adlar.ts`) ve
   veritabanına oradan gelmeyen bir kuruluş adı düşerse kırmızı yanar.
   Yeni sektör verisi eklendikçe aynı kusur tekrar doğacak; kaynağı tek
   yere bağlamak kalıcı çözümdür.

   ── NEYİ ÖLÇMEZ ───────────────────────────────────────────────────────
   Bekçi VERİTABANINA bakar, kaynak metnine değil: kusur "tohumda bir
   dize var" değil, "ekranda gerçek bir firma adı görünüyor"du. Aradaki
   fark önemli — adı bir değişkene alıp dolambaçtan geçirmek kaynağı
   temiz gösterir, ekranı temizlemez.

   Kamuya açık resmî kaynaklar (CBDDÖ gibi) kurgusallaştırılmaz ve
   listede ADIYLA durur: bir düzenleyici kurumun adı bir iddia değil,
   belgelenmiş bir gerçektir (`CLAUDE.md` §0.2).
   ═══════════════════════════════════════════════════════════════════════ */

const yabanci = (adlar: (string | null)[]) =>
  [...new Set(adlar.filter((x): x is string => !!x))]
    .filter((ad) => !TUM_KURULUS_ADLARI.has(ad));

describe('Kurgusal ad bekçisi · kuruluşlar [URN-KUR-005]', () => {
  it('TEDARİKÇİ adları tek kaynaktan gelir [URN-KUR-005]', async () => {
    const t = await db.tedarikci.findMany({ select: { ad: true } });
    expect(t.length, 'tedarikçi yok — fikstür bozuk, bekçi hiçbir şey ölçmüyor')
      .toBeGreaterThan(0);
    expect(yabanci(t.map((x) => x.ad)),
      'kurgusal-adlar.ts dışından tedarikçi adı: gerçek bir firmaya kurgusal '
      + 'güvenlik verisi bağlanmış olabilir').toEqual([]);
  });

  it('VARLIK üreticileri tek kaynaktan gelir [URN-KUR-005]', async () => {
    /* Nötr bir envanter satırındaki üretici adı da gerçek olmamalı:
       satır bugün nötr, yarın bir zafiyet kaydına bağlanır. */
    const v = await db.varlik.findMany({ select: { uretici: true } });
    expect(yabanci(v.map((x) => x.uretici))).toEqual([]);
  });

  it('YAZILIM üreticileri tek kaynaktan gelir [URN-KUR-005]', async () => {
    const y = await db.yazilimUrunu.findMany({ select: { uretici: true } });
    expect(yabanci(y.map((x) => x.uretici))).toEqual([]);
  });

  it('DENETLEYİCİ adları tek kaynaktan gelir [URN-KUR-005]', async () => {
    const d = await db.denetim.findMany({ select: { denetleyen: true } });
    expect(yabanci(d.map((x) => x.denetleyen))).toEqual([]);
  });

  it('TÜZEL KİŞİ adları tek kaynaktan gelir [URN-KUR-005]', async () => {
    const tk = await db.tuzelKisi.findMany({ select: { ad: true } });
    expect(yabanci(tk.map((x) => x.ad))).toEqual([]);
  });

  it('KİŞİ adları rol taşır, gerçek ad taşımaz [URN-KUR-005]', async () => {
    /* Gerçek bir kişi adı, kurgusal bir yetki ve davranış kaydına
       bağlandığı anda o kişi hakkında bir iddiaya dönüşür. */
    const k = await db.kullanici.findMany({ select: { adSoyad: true } });
    expect(k.length).toBeGreaterThan(0);
    const kume = new Set<string>(KISILER);
    expect(k.map((x) => x.adSoyad).filter((a) => !kume.has(a))).toEqual([]);
  });
});
