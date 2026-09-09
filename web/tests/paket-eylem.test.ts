import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · Paket EYLEMLERİ — GERÇEK veritabanı, GERÇEK yetki kapısı
   (URN-PKT-003 · URN-PKT-004)

   `lib/eylemler2/paket.ts` sunucu eylemleri: `paketKur` · `paketKaldir`.
   Kapı sahtelenmez, yalnız `aktifKullanici` değiştirilir. Kurulum yalnız
   ürünün kendi `paketler/` dizininden yapılır; yol dışarı çıkamaz.
   Kaldırma gerekçe ister ve iz düşer.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-paket-eylem-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

type Yetki = {
  rol: string; surecId: string | null; kapsamOgesiId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const yetki = (rol: string): Yetki => ({
  rol, surecId: null, kapsamOgesiId: null, tesisId: null, tuzelKisiId: null, regulasyonId: null, modul: null,
});
const oturum = { id: '', adSoyad: 'Test Kullanıcısı', eposta: 'paket@test', unvan: null, yetkiler: [yetki('yonetici')] as Yetki[] };

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const { db } = await import('@/lib/db');
const { paketKur, paketKaldir } = await import('@/lib/eylemler2/paket');
const { paketDizini } = await import('@/lib/paket/dizin');

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

beforeAll(async () => {
  oturum.id = (await db.kullanici.findFirstOrThrow({ where: { aktif: true } })).id;
});

describe('paketKur — yetki kapısı, dizin sınırı, iz [URN-PKT-003]', () => {
  it('okuyucu rolü paket kuramaz [URN-PKT-003]', async () => {
    const s = await kimlikle([yetki('okuyucu')], () => paketKur({ kod: 'TR-BANKACILIK' }));
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/yetki/i);
    expect(await db.icerikPaketi.findUnique({ where: { kod: 'TR-BANKACILIK' } })).toBeNull();
  });

  it('paket yolu paketler/ dışına çıkamaz — kod deseni ve dizin çözümü [URN-PKT-003]', async () => {
    const s = await paketKur({ kod: '../prisma' });
    expect(s.ok).toBe(false);
    expect(() => paketDizini('../prisma', '/tmp/x')).toThrow(/dışına çıkamaz/);
    expect(() => paketDizini('/etc', '/tmp/x')).toThrow(/dışına çıkamaz/);
    expect(paketDizini('TR-ENERJI', '/tmp/x')).toBe(path.join('/tmp/x', 'paketler', 'TR-ENERJI'));
  });

  it('olmayan paket doğrulayıcı diliyle reddedilir; veritabanına dokunulmaz [URN-PKT-003]', async () => {
    const once = await db.icerikPaketi.count();
    const s = await paketKur({ kod: 'YOK-PAKET' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/Paket reddedildi/);
    expect(await db.icerikPaketi.count()).toBe(once);
  });

  it('yetkili kullanıcı iskelet paketi kurar: rapor döner, çerçeve taslak, iz sayılarla düşer [URN-PKT-003]', async () => {
    const s = await paketKur({ kod: 'TR-BANKACILIK' });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok || !('rapor' in s)) return;
    expect(s.rapor.sayilar.maddeler).toBe(58);
    const paket = await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'TR-BANKACILIK' } });
    const iz = await db.aktiviteKaydi.findFirstOrThrow({ where: { varlikTipi: 'IcerikPaketi', varlikId: paket.id, eylem: 'kurulum' } });
    expect(iz.aktorId).toBe(oturum.id);
    expect(iz.gerekce).toMatch(/çerçeve 1 \(58 madde, TASLAK\)/);
    expect(await db.frameworkSurumu.count({ where: { regulasyon: { kod: 'BDDK-BS' }, durum: 'aktif' } })).toBe(0);
  });
});

describe('paketKaldir — gerekçeli arşiv [URN-PKT-004]', () => {
  it('gerekçesiz kaldırma reddedilir [URN-PKT-004]', async () => {
    const s = await paketKaldir({ kod: 'TR-BANKACILIK', gerekce: 'kısa' });
    expect(s.ok).toBe(false);
    expect((await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'TR-BANKACILIK' } })).durum).toBe('kurulu');
  });

  it('okuyucu kaldıramaz; yetkili gerekçeyle kaldırır → arşiv + iz, satır silinmez [URN-PKT-004]', async () => {
    const red = await kimlikle([yetki('okuyucu')], () => paketKaldir({ kod: 'TR-BANKACILIK', gerekce: 'Paket artık kullanılmayacak' }));
    expect(red.ok).toBe(false);
    const madde = await db.madde.count({ where: { regulasyon: { kod: 'BDDK-BS' } } });
    const s = await paketKaldir({ kod: 'TR-BANKACILIK', gerekce: 'Paket artık kullanılmayacak' });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    const paket = await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'TR-BANKACILIK' } });
    expect(paket.durum).toBe('arsiv');
    expect(await db.madde.count({ where: { regulasyon: { kod: 'BDDK-BS' } } })).toBe(madde);
    const iz = await db.aktiviteKaydi.findFirstOrThrow({ where: { varlikTipi: 'IcerikPaketi', varlikId: paket.id, eylem: 'arsiv' } });
    expect(iz.gerekce).toBe('Paket artık kullanılmayacak');
  });
});
