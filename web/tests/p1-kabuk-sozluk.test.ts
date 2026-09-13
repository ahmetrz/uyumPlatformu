import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB importlardan ÖNCE: gerçek dev.db'ye dokunulmaz (tests/sahte/db.ts kuralı).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kabuk-sozluk-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { kapsamAnahtari, kapsamSozlugu } = await import('@/lib/dil/sozlukOku');
const { t } = await import('@/lib/dil/terimler');

/* ═══════════════════════════════════════════════════════════════════════
   P1 · Aşama E — KABUK sözlükten konuşuyor mu (URN-ALN-004)

   Kabuk paylaşılan katmandır ve tek bir kaydın değil KAPSAMIN dilini
   konuşur. Üç hâl ayrı ayrı ölçülür, çünkü üçü de ekranda farklı bir
   cümle üretir:

     tek sektör   → sektörün sözcüğü ("16 santral")
     sözlük yok   → çekirdek sözcük   ("16 tesis")
     çok sektör   → çekirdek sözcük   — birini seçmek portföyün öbür
                    yarısı için yanlış olurdu

   Üçüncüsü en kolay unutulanıdır: bugün depoda tek sektör var, kural
   yazılmasa kimse fark etmezdi ve ikinci sektör geldiği gün kabuk
   sessizce yanlış sözcüğü seçerdi.
   ═══════════════════════════════════════════════════════════════════════ */

describe('Kabuk · kapsam sözlüğü', () => {
  it('tek sektörlü kapsamda sektörün sözcüğü iner [URN-ALN-004]', async () => {
    /* Kapsam BURADA kurulur, `null` (=tümü) ile değil. Önce tohumun tek
       sektörlü olmasına yaslanıyordu; ikinci sektör eklenince vaka
       kırmızı yandı — ve HAKLIYDI: `null` kapsamda artık iki sektör var,
       doğru cevap çekirdek sözcüktür. Kırmızının sebebi kuralın değil
       FİKSTÜRÜN varsayımıydı: "tek sektörlü kapsam" demek isteyip
       "bütün kapsam" yazmıştı. Vaka artık kendi kapsamını kurar ve
       tohuma kaç sektör eklenirse eklensin aynı şeyi ölçer. */
    const enerji = await db.sektor.findFirstOrThrow({
      where: { kod: 'ELEKTRIK-URETIM' }, select: { id: true } });
    const tesisler = await db.tesis.findMany({
      where: { durum: 'aktif', tip: { sektorId: enerji.id } }, select: { id: true } });
    expect(tesisler.length, 'enerji kapsamı boş — fikstür bozuk').toBeGreaterThan(0);

    const sozluk = await kapsamSozlugu(kapsamAnahtari(tesisler.map((x) => x.id)));
    expect(sozluk, 'kapsam sözlüğü çözülmedi').not.toBeNull();
    expect(t(sozluk, 'tesis')).toBe('santral');
    expect(t(sozluk, 'tesis', 'cogul')).toBe('santraller');
  });

  it('sektörün sözlüğü yoksa ÇEKİRDEK sözcük iner [URN-ALN-004]', async () => {
    await db.sektorSozlugu.deleteMany({});
    const sozluk = await kapsamSozlugu(null);
    /* `null` = "sözlük yok"; boş nesne DEĞİL. Ekran çekirdek sözcüğü
       yazar ve boş kalmaz. */
    expect(sozluk).toBeNull();
    expect(t(sozluk, 'tesis')).toBe('tesis');
  });

  it('kapsam İKİ sektöre yayılıyorsa hiçbiri seçilmez [URN-ALN-004]', async () => {
    /* İkinci bir sektör + tipi + tesisi kurulur ve YALNIZ ilk sektörün
       sözlüğü doldurulur: kural "sözlüğü olanı seç" değil, "sektör tek
       değilse seçme"dir. İkisi ayrı şeydir. */
    const enerji = await db.sektor.findFirstOrThrow({
      where: { kod: 'ELEKTRIK-URETIM' }, select: { id: true } });
    await db.sektorSozlugu.create({ data: {
      sektorId: enerji.id, anahtar: 'tesis', tekil: 'santral', cogul: 'santraller' } });
    /* Ön koşul da DAR kapsamda ölçülür (yukarıdaki vakayla aynı gerekçe):
       önce tek sektörün sözcüğü indiği görülür, sonra kapsam genişletilip
       seçimin DÜŞTÜĞÜ görülür. İkisi arasındaki fark kuralın kendisidir. */
    const enerjiTesisleri = await db.tesis.findMany({
      where: { durum: 'aktif', tip: { sektorId: enerji.id } }, select: { id: true } });
    expect(t(await kapsamSozlugu(kapsamAnahtari(enerjiTesisleri.map((x) => x.id))), 'tesis'),
      'tek sektörde önce çalışmalı').toBe('santral');

    const su = await db.sektor.create({ data: { kod: 'TEST-SU', ad: 'Su ve Atıksu' } });
    const tip = await db.tesisTipi.create({ data: {
      kod: 'TEST-ARITMA', ad: 'Arıtma', sektorId: su.id } });
    await db.tesis.create({ data: { kod: 'TEST-ARITMA-1', ad: 'Test Arıtma', tipId: tip.id } });

    const karisik = await kapsamSozlugu(null);
    expect(karisik, 'iki sektörlü kapsamda bir sektörün sözlüğü seçildi').toBeNull();
    expect(t(karisik, 'tesis')).toBe('tesis');
  });

  it('kapsam anahtarı sıralı ve tekrarsızdır', () => {
    /* `cache()` argüman kimliğine göre anahtarlar; aynı kapsamın iki
       farklı sıralaması iki ayrı sorgu olurdu. */
    expect(kapsamAnahtari(['b', 'a', 'b'])).toBe('a,b');
    expect(kapsamAnahtari(null)).toBeNull();
  });
});
