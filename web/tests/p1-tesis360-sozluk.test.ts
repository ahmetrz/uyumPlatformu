import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB importlardan ÖNCE: gerçek dev.db'ye dokunulmaz (tests/sahte/db.ts kuralı).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-sozluk-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { tesis360Verisi } = await import('@/app/(kabuk)/(flagship)/tesisler/[id]/veri');
const { t } = await import('@/lib/dil/terimler');

/** AktifKullanici şeklini DB'deki GERÇEK yetki satırlarından kurar —
    `kapsam-ekranlari.test.ts` ile aynı kalıp: uydurma bir yetki nesnesi,
    kapsam kapısını test etmeyen bir test üretirdi. */
async function aktifKullanici() {
  const k = await db.kullanici.findFirstOrThrow({
    where: { aktif: true, yetkiler: { some: { rol: 'yonetici', tesisId: null } } },
    include: { yetkiler: true },
  });
  return {
    id: k.id, adSoyad: k.adSoyad, eposta: k.eposta, unvan: k.unvan,
    yetkiler: k.yetkiler.map((y) => ({
      rol: y.rol, surecId: y.surecId, tesisId: y.tesisId,
      tuzelKisiId: y.tuzelKisiId, regulasyonId: y.regulasyonId, modul: y.modul,
    })),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   P1 · `/tesisler/[id]` ekranı sözlükten konuşuyor mu (URN-ALN-004)

   Birim testi `t()`nin doğru seçtiğini gösteriyor; bu test SÖZLÜĞÜN
   EKRANA KADAR geldiğini gösteriyor. İkisi ayrı sorulardır: doğru bir
   yardımcı, veri yolunda unutulursa ekranda hiç görünmez.

   Aynı çağrı iki kez yapılır; arada değişen tek şey VERİDİR (sektör
   sözlüğü silinir). Bileşen, sorgu ve kullanıcı aynı kalır.
   ═══════════════════════════════════════════════════════════════════════ */

describe('Tesis 360 · terim sözlüğü ekrana ulaşıyor', () => {
  it('enerji sözlüğü kuruluyken ekran adı "Santral 360" [URN-ALN-004]', async () => {
    const tesis = await db.tesis.findFirstOrThrow({
      where: { tip: { sektorId: { not: null } } }, select: { id: true } });
    const sonuc = await tesis360Verisi(await aktifKullanici(), tesis.id);
    expect(sonuc, 'ekran verisi gelmedi').not.toBeNull();
    expect(sonuc!.sozluk, 'tesisin sektör sözlüğü çözülmedi').not.toBeNull();
    expect(t(sonuc!.sozluk, 'tesis360')).toBe('Santral 360');
    expect(t(sonuc!.sozluk, 'birim', 'cogul')).toBe('üretim üniteleri');
  });

  it('sözlük kaldırılınca AYNI ekran "Tesis 360" der [URN-ALN-004]', async () => {
    await db.sektorSozlugu.deleteMany({});
    const tesis = await db.tesis.findFirstOrThrow({
      where: { tip: { sektorId: { not: null } } }, select: { id: true } });
    const sonuc = await tesis360Verisi(await aktifKullanici(), tesis.id);
    expect(sonuc).not.toBeNull();
    /* `null` = "sözlük yok"; boş bir sözlük nesnesi DEĞİL. İkisini
       ayırmak, "kurulu ama boş" ile "hiç kurulmamış"ı ayırmaktır. */
    expect(sonuc!.sozluk, 'sözlük yokken boş nesne döndü').toBeNull();
    expect(t(sonuc!.sozluk, 'tesis360')).toBe('Tesis 360');
    expect(t(sonuc!.sozluk, 'birim', 'cogul')).toBe('birimler');
  });
});
