import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · "DEMO OTURUMU SALT OKUNURDUR" — GERÇEK YOLLA [SIS-DEM-001]

   ── ÖLÇÜLEN İDDİA (POL-026) ───────────────────────────────────────────
   `/yardim` ekranı şunu yazıyor:

     "Demo oturumu salt okunurdur: demo hesabı hiçbir koşulda yazma
      yetkisi taşımaz, kayıt oluşturan/değiştiren eylemler kapalıdır."

   ── NEDEN GERÇEK YOL ──────────────────────────────────────────────────
   `yetkiZorunlu`nun demo dalını tek başına sınamak bu iddiayı ölçmez:
   iddia EYLEMLER hakkındadır, kapı hakkında değil. Bir eylem kapıyı hiç
   çağırmasa da kapının kendi testi yeşil kalırdı — R-F'i doğuran kusur
   tam buydu (MFA katmanı doğruydu, `girisYap` onu çağırmıyordu).

   Bu yüzden burada GERÇEK bir sunucu eylemi çağrılır ve iki şey birden
   ölçülür: eylem REDDEDER ve veritabanına HİÇBİR SATIR YAZILMAZ.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-demo-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;
/* DEMO modülde bir sabittir ve içe aktarma anında okunur — bu satır
   import'lardan ÖNCE gelmek zorunda. */
process.env.NEXT_PUBLIC_DEMO = '1';

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { DEMO } = await import('@/lib/demo');
const { riskKaydet } = await import('@/lib/eylemler2/risk');
const { yetkiZorunlu } = await import('@/lib/erisim');

const damga = Date.now();
const KOD = `RSK-DEMO-${damga}`;

/* Demo oturumu: TAM YETKİLİ bir kullanıcı taklit edilir. İddia "demo
   kullanıcısının yetkisi yok" değil, "demo oturumunda yazma KAPALI" —
   yetkili bir hesapla sınanmazsa ölçüm, yetkisizliği ölçmüş olurdu. */
const oturum = {
  id: 'demo-kullanici', adSoyad: 'Demo', eposta: 'demo@kurgusal.local', unvan: null,
  yetkiler: [{ rol: 'yonetici', modul: null, tesisId: null, surecId: null, regulasyonId: null }],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

let oncekiSayi = 0;

beforeAll(async () => { oncekiSayi = await db.risk.count(); });

afterAll(async () => {
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

describe('demo oturumunda YAZMA kapalı [SIS-DEM-001]', () => {
  it('ortam gerçekten DEMO — ölçüm boşa koşmuyor [SIS-DEM-001]', () => {
    /* Bu vaka olmadan, `NEXT_PUBLIC_DEMO` yanlış kurulduğunda dosyanın
       tamamı "yazma reddedildi" yerine "yetki yok" ölçer ve yine yeşil
       kalırdı: hiçbir şey ölçmeden yeşil yanan kapı. */
    expect(DEMO).toBe(true);
  });

  it('GERÇEK eylem (riskKaydet) REDDEDER [SIS-DEM-001]', async () => {
    const s = await riskKaydet({
      kod: KOD, baslik: 'Kurgusal risk — demo ölçümü',
      aciklama: 'Demo oturumunda yazılmamalı', olasilik: 3, etkiSiber: 3,
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('Demo');
  });

  it('ve HİÇBİR SATIR yazılmadı [SIS-DEM-001]', async () => {
    expect(await db.risk.count({ where: { kod: KOD } })).toBe(0);
    expect(await db.risk.count()).toBe(oncekiSayi);
  });

  it('OKUMA aynı oturumda AÇIK — kapı yazmayı kapatır, ekranı değil [SIS-DEM-001]', async () => {
    /* "Salt okunur" iki yarım cümledir; yalnız birini ölçmek, her şeyi
       kapatan bir kapıyı da yeşil gösterirdi. */
    await expect(yetkiZorunlu('risk', 'okuma')).resolves.toBeTruthy();
  });

  it('YAZMA dışındaki değiştiren işlemler de kapalı [SIS-DEM-001]', async () => {
    /* İddia "kayıt oluşturan/DEĞİŞTİREN eylemler" der: onay da bir
       değiştirmedir ve kapı `islem !== 'okuma'` diye sorar. */
    await expect(yetkiZorunlu('risk', 'onay')).rejects.toThrow(/Demo/);
  });
});
