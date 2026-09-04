import { beforeAll, describe, it, expect, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { izinVar, izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';

/* Dosyanın ilk bloğu SAF mantıktır (RBAC kararları, veritabanı yok).

   İkinci blok veritabanına dokunur (izole kopya): erişim atamasının
   TEKİLLİĞİ bir kod kuralı değil, veritabanı kısıtıdır ve ancak orada
   ölçülebilir. TEST_DB db'ye dokunan her importtan ÖNCE ayarlanır. */
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-erisim-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const sahteKullanici = {
  id: '', adSoyad: 'Erişim Testi', eposta: 'erisim@test', unvan: null,
  yetkiler: [{ rol: 'yonetici', surecId: null, tesisId: null, tuzelKisiId: null,
    regulasyonId: null, modul: null }],
};
vi.mock('@/lib/erisim', async (asil) => {
  const gercek = await asil<typeof import('@/lib/erisim')>();
  return { ...gercek, yetkiZorunlu: async () => sahteKullanici, izinVar: gercek.izinVar };
});

const { db } = await import('@/lib/db');
const { erisimAta } = await import('@/lib/eylemler2/kimlik');

const kisi = (yetkiler: AktifKullanici['yetkiler']): AktifKullanici => ({
  id: 'k1', adSoyad: 'Test', eposta: 't@t', unvan: null, yetkiler,
});
const yetki = (p: Partial<AktifKullanici['yetkiler'][number]>) => ({
  rol: 'katkici', surecId: null, tesisId: null, tuzelKisiId: null,
  regulasyonId: null, modul: null, ...p,
});

describe('RBAC + kapsam (cross-plant sızıntı koruması)', () => {
  it('tesise kısıtlı katkıcı BAŞKA tesisin kaydına yazamaz', () => {
    const k = kisi([yetki({ tesisId: 'MERKEZ' })]);
    expect(izinVar(k, 'uyum', 'yazma', { tesisId: 'ADANA' })).toBe(false);
    expect(izinVar(k, 'uyum', 'yazma', { tesisId: 'MERKEZ' })).toBe(true);
  });

  it('tesise kısıtlı rol kapsamsız (global) yazma yapamaz', () => {
    const k = kisi([yetki({ tesisId: 'MERKEZ' })]);
    expect(izinVar(k, 'uyum', 'yazma')).toBe(false);
  });

  it('sürece kısıtlı yetki başka sürece yazamaz', () => {
    const k = kisi([yetki({ surecId: 'CBDDO-2026' })]);
    expect(izinVar(k, 'uyum', 'yazma', { surecId: 'EPDK-2026', tesisId: 'X' })).toBe(false);
    expect(izinVar(k, 'uyum', 'yazma', { surecId: 'CBDDO-2026', tesisId: 'X' })).toBe(true);
  });

  it('okuyucu hiçbir modüle yazamaz, okuyabilir', () => {
    const k = kisi([yetki({ rol: 'okuyucu' })]);
    expect(izinVar(k, 'uyum', 'yazma')).toBe(false);
    expect(izinVar(k, 'risk', 'okuma')).toBe(true);
  });

  it('dış denetçi yalnız denetim ve uyum okur [DNE-ERS-002]', () => {
    const k = kisi([yetki({ rol: 'dis_denetci' })]);
    expect(izinVar(k, 'denetim', 'okuma')).toBe(true);
    expect(izinVar(k, 'envanter', 'okuma')).toBe(false);
    expect(izinVar(k, 'denetim', 'yazma')).toBe(false);
  });

  it('katkıcı onay veremez (bulgu kapatma koruması)', () => {
    const k = kisi([yetki({})]);
    expect(izinVar(k, 'uyum', 'onay')).toBe(false);
  });

  it('modül kısıtı diğer modülleri kapatır', () => {
    const k = kisi([yetki({ rol: 'yonetici', modul: 'risk' })]);
    expect(izinVar(k, 'risk', 'yazma')).toBe(true);
    expect(izinVar(k, 'uyum', 'yazma')).toBe(false);
  });

  it('izinliTesisIdleri: kısıtlı kullanıcı yalnız kendi tesislerini görür', () => {
    const k = kisi([yetki({ tesisId: 'A' }), yetki({ tesisId: 'B' })]);
    expect(izinliTesisIdleri(k, 'uyum')).toEqual(['A', 'B']);
    expect(izinliTesisIdleri(kisi([yetki({})]), 'uyum')).toBeNull(); // null = tümü
    expect(izinliTesisIdleri(kisi([]), 'uyum')).toEqual([]); // hiçbiri
  });
});

/* ═══ Erişim ataması tekilliği (veritabanı) ═══════════════════════════

   İdempotency `findFirst` → yoksa `create` kalıbıyla sağlanıyordu ve
   veritabanında hiçbir tekillik kısıtı yoktu: farklı Idempotency-Key
   taşıyan iki eşzamanlı aktarım ikisi de "atama yok" görüp aynı satırı iki
   kez yazabiliyordu. Kısıt artık veritabanında (göç
   20260901210000) — kod kuralı değil.

   İKİNCİ İNDEKS NİÇİN VAR: SQLite tekil indekste NULL'ları BİRBİRİNDEN
   FARKLI sayar; şemadaki `@@unique` tek başına varlığı ya da kapsamı
   olmayan atamaları hiç kapsamazdı. Aşağıdaki iki test bu yüzden hem dolu
   hem NULL'lu üçlüyü ayrı ayrı ölçer. */

describe('ErisimAtamasi tekilliği veritabanı kısıtıdır', () => {
  let hesapId = '';
  let varlikId = '';

  beforeAll(async () => {
    const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
    sahteKullanici.id = kisi.id;
    const hesap = await db.kimlikHesabi.create({ data: {
      hesapAdi: `erisim-tekillik-${Date.now()}`, tip: 'servis' } });
    hesapId = hesap.id;
    varlikId = (await db.varlik.findFirstOrThrow({ select: { id: true } })).id;
  });

  const say = (nerede: object) => db.erisimAtamasi.count({ where: nerede });

  it('aynı atama iki kez yazılamaz — ikinci çağrı satır AÇMAZ', async () => {
    const kapsam = `Tekillik testi ${Date.now()}`;
    expect(await erisimAta({ hesapId, varlikId, kapsam, yetkiSeviyesi: 'okuma' }))
      .toEqual({ ok: true });

    const ikinci = await erisimAta({ hesapId, varlikId, kapsam, yetkiSeviyesi: 'okuma' });
    expect(ikinci.ok).toBe(false);
    if (ikinci.ok) return;
    /* Mesaj NEYİN kopya olduğunu söylemeli: ham kısıt cümlesi ("bu kayıt
       benzersizlik kuralını çiğniyor") kullanıcıya ne yapacağını
       söylemiyor. */
    expect(ikinci.hata).toMatch(/erişim ataması zaten var/i);
    expect(ikinci.hata).toMatch(/inceleme/i);
    expect(await say({ hesapId, varlikId, kapsam })).toBe(1);
  });

  it('farklı yetki seviyesi de İKİNCİ SATIR açmaz — aynı erişimin değişimidir [YTK-ATM-001]', async () => {
    const kapsam = `Seviye testi ${Date.now()}`;
    await erisimAta({ hesapId, varlikId, kapsam, yetkiSeviyesi: 'okuma' });
    const y = await erisimAta({ hesapId, varlikId, kapsam, yetkiSeviyesi: 'yonetici' });
    expect(y.ok).toBe(false);
    expect(await say({ hesapId, varlikId, kapsam })).toBe(1);
  });

  it('kısıt KODA DEĞİL veritabanına yazılıdır: ham insert de reddedilir', async () => {
    const kapsam = `Ham insert ${Date.now()}`;
    await erisimAta({ hesapId, varlikId, kapsam, yetkiSeviyesi: 'okuma' });
    // Eylemin ön kontrolünü atlayıp doğrudan yazmayı dene:
    await expect(db.erisimAtamasi.create({ data: {
      hesapId, varlikId, kapsam, yetkiSeviyesi: 'yazma' } })).rejects.toThrow();
    expect(await say({ hesapId, varlikId, kapsam })).toBe(1);
  });

  it('varlığı ve kapsamı NULL olan atama da tekildir (SQLite NULL tuzağı kapalı)',
    async () => {
      const bos = await db.kimlikHesabi.create({ data: {
        hesapAdi: `erisim-null-${Date.now()}`, tip: 'servis' } });
      expect(await erisimAta({ hesapId: bos.id, yetkiSeviyesi: 'okuma' }))
        .toEqual({ ok: true });
      await expect(db.erisimAtamasi.create({ data: {
        hesapId: bos.id, varlikId: null, kapsam: null, yetkiSeviyesi: 'okuma' } }))
        .rejects.toThrow(/UNIQUE constraint failed/i);
      expect(await say({ hesapId: bos.id })).toBe(1);
    });

  it('farklı kapsam AYRI atamadır — kısıt meşru satırı engellemez', async () => {
    const damga = Date.now();
    await erisimAta({ hesapId, varlikId, kapsam: `A-${damga}`, yetkiSeviyesi: 'okuma' });
    expect(await erisimAta({
      hesapId, varlikId, kapsam: `B-${damga}`, yetkiSeviyesi: 'okuma' }))
      .toEqual({ ok: true });
    expect(await say({ hesapId, varlikId, kapsam: { in: [`A-${damga}`, `B-${damga}`] } }))
      .toBe(2);
  });
});
