import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* KABUK DA BİR EKRANDIR.

   Kapsam çubuğu her sayfanın tepesinde "N tüzel kişi · M santral" yazar.
   Bu sayı KAPSAMSIZ okunursa, tek santrale kısıtlı bir kullanıcı
   göremediği santrallerin VAR OLDUĞUNU öğrenir — /portfoy ve /tesisler
   için kapatılan sızıntının aynısı, yalnız kabukta ve her ekranda.

   Kapsam BİRLEŞİK alınır (uyum ∪ envanter ∪ risk ∪ denetim): çubuk "bu
   üründe hangi sahaya girebiliyorum" sorusunu yanıtlar, tek bir modülün
   penceresini değil.

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı). */
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kabuk-'));
const testDb = path.join(dizin, 't.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const oturum = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (ad: string) =>
      ad === 'oturum' && oturum.token ? { name: ad, value: oturum.token } : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

const { db } = await import('@/lib/db');
const { kabukVerisi } = await import('@/components/kabuk/kabukVerisi');

let aktifToplam = 0;
let kizildere3 = '';

async function oturumAc(rol: string, tesisId: string | null) {
  const kisi = await db.kullanici.create({ data: {
    eposta: `kabuk.${randomBytes(4).toString('hex')}@ornek.local`,
    adSoyad: 'Kabuk Testi', aktif: true } });
  await db.yetki.create({ data: { kullaniciId: kisi.id, rol, tesisId } });
  const token = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: kisi.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  oturum.token = token;
  return kisi.id;
}

beforeAll(async () => {
  aktifToplam = await db.tesis.count({ where: { durum: 'aktif' } });
  kizildere3 = (await db.tesis.findFirstOrThrow({ where: { kod: 'KIZILDERE-3' } })).id;
  expect(aktifToplam).toBeGreaterThan(1);
});

describe('Kabuk kapsam çubuğu santral sayısını sızdırmaz', () => {
  it('kapsamsız yetki bütün aktif santralleri sayar', async () => {
    await oturumAc('yonetici', null);
    const v = await kabukVerisi();
    expect(v.kapsam?.santral).toBe(aktifToplam);
  });

  it('tek santrale kısıtlı kullanıcı YALNIZ onu sayar [YTK-LST-001]', async () => {
    await oturumAc('denetim_sorumlusu', kizildere3);
    const v = await kabukVerisi();
    expect(v.kapsam?.santral).toBe(1);
    /* Tüzel kişi de aynı kapsamdan türer: bir santral en fazla bir tüzel
       kişiye bağlıdır, dolayısıyla sayı 1'i geçemez. Kapsamsız
       `tuzelKisi.count()` aynı sızıntının başka biçimiydi. */
    expect(v.kapsam?.tuzelKisi).toBeLessThanOrEqual(1);
  });

  it('oturum yoksa kapsam BOŞTUR — "sınırsız" değil', async () => {
    oturum.token = null;
    const v = await kabukVerisi();
    expect(v.kullanici).toBeNull();
    expect(v.kapsam?.santral ?? 0).toBe(0);
  });
});

describe('Kabuk okunmamış bildirim sayacı (D30) — kutu sahipliği', () => {
  it('YALNIZ aktif kullanıcının okunmamış bildirimlerini sayar', async () => {
    const benimId = await oturumAc('okuyucu', null);
    /* Başkasının kutusuna düşen bildirim benim rozetime girmez; okunmuş
       olan (okundu ≠ null) da girmez. Yalnız ikinci kayıt sayılmalı. */
    const digeri = await db.kullanici.create({ data: {
      eposta: `kabuk.baska.${randomBytes(4).toString('hex')}@ornek.local`,
      adSoyad: 'Başka Kişi', aktif: true } });
    await db.bildirim.createMany({ data: [
      { kullaniciId: digeri.id, baslik: 'başkasının' },
      { kullaniciId: benimId, baslik: 'benim, okunmadı' },
      { kullaniciId: benimId, baslik: 'benim, okundu', okundu: new Date() },
    ] });
    const v = await kabukVerisi();
    expect(v.okunmamis).toBe(1);
  });

  it('oturum yoksa sayaç 0 — sorgu yapılmaz, rozet çizilmez', async () => {
    oturum.token = null;
    const v = await kabukVerisi();
    expect(v.okunmamis).toBe(0);
  });
});
