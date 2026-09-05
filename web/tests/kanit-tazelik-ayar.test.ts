import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Kanıt tazelik eşiği (kanitTazelik modülü, B sınıfı) — GERÇEK veritabanı

   Sözleşme:
     1. Kayıt yok → kod varsayılanı (90/180), kaynak `varsayilan`.
     2. Geçerli override yalnız Öner → Onayla → Uygula (dört göz) ile yazılır;
        `ayarKaydet` B anahtarı reddeder; öneren onaylayamaz.
     3. Geçersiz kayıt (şema dışı ya da çift tutarsız) → kod varsayılanı +
        `gecersiz_kayit`; bilinmiyor ≠ sıfır, ekran asla 0 günle koşmaz.
     4. Tek doğruluk kaynağı sunucuda (`kanitEsikleri`); kanıt kütüphanesi,
        bulgu detayı ve raporlar aynı eşiği prop olarak alır.
     5. Etki ön izlemesi kaç kanıt / kaç bulgu / kaç kaydın kova değiştireceğini
        sayar; bilinmeyen sayı null.
     6. Audit izi: talep ve uygulama AktiviteKaydi'na düşer.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kanit-esik-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

type Yetki = {
  rol: string; surecId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const yetki = (rol: string): Yetki => ({
  rol, surecId: null, tesisId: null, tuzelKisiId: null, regulasyonId: null, modul: null,
});
const oturum = {
  id: '', adSoyad: 'Test Yöneticisi', eposta: 'yonetim@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { ayarKaydet, etkiHesapla, degisiklikOner, degisiklikOnayla, degisiklikUygula } = await import('@/lib/eylemler2/yonetim');
const { kanitEsikleri } = await import('@/lib/yapilandirma/kanitEsik');
const { ayarOku } = await import('@/lib/yapilandirma/oku');
const { AYAR_SOZLUGU, ayarCiftDogrula } = await import('@/lib/yapilandirma/tanimlar');
const { ayarinModulu, MODUL_SOZLUGU } = await import('@/lib/yonetim/moduller');
const { KANIT_ESIK_VARSAYILAN, kanitTazelik, kanitKovasi } = await import('@/lib/sabitler');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);
const TAZE = 'kanit.tazelik.taze_gun';
const DOLMUS = 'kanit.tazelik.dolmus_gun';
const GEREKCE = 'İç denetim 2026-Q3 bulgusu: kanıt yenileme periyodu kısaltılıyor';

async function kimlikle<T>(kim: { id?: string; yetkiler: Yetki[] }, is: () => Promise<T>): Promise<T> {
  const onceki = { id: oturum.id, yetkiler: oturum.yetkiler };
  if (kim.id) oturum.id = kim.id;
  oturum.yetkiler = kim.yetkiler;
  try { return await is(); } finally { oturum.id = onceki.id; oturum.yetkiler = onceki.yetkiler; }
}

let yoneticiA = '';
let yoneticiB = '';
const kisiB = () => ({ id: yoneticiB, yetkiler: [yetki('yonetici')] });
const temizle = async () => {
  await db.degisiklikTalebi.deleteMany({ where: { hedefId: { in: [TAZE, DOLMUS] } } });
  await db.yapilandirma.deleteMany({ where: { anahtar: { in: [TAZE, DOLMUS] } } });
};

beforeAll(async () => {
  const kisiler = await db.kullanici.findMany({ where: { aktif: true }, take: 2, orderBy: { id: 'asc' } });
  expect(kisiler.length).toBe(2);
  [yoneticiA, yoneticiB] = kisiler.map((k) => k.id);
  oturum.id = yoneticiA;
  await temizle();
});
afterAll(temizle);

/* ── 0 · Kütük: modül B sınıfı, konsolda, anahtarlar modüle bağlı ─────── */
describe('kütük — kanitTazelik B sınıfı ve konsolda', () => {
  it('modül B / konsol / hedef ayar', () => {
    const m = MODUL_SOZLUGU.kanitTazelik;
    expect(m.sinif).toBe('B');
    expect(m.yer).toBe('konsol');
    expect(m.hedefTipi).toBe('ayar');
  });
  it('iki anahtar da B sınıfı, uyum grubunda ve kanitTazelik modülüne bağlı', () => {
    for (const a of [TAZE, DOLMUS]) {
      expect(AYAR_SOZLUGU[a].sinif).toBe('B');
      expect(AYAR_SOZLUGU[a].grup).toBe('uyum');
      expect(ayarinModulu(a)?.kod).toBe('kanitTazelik');
    }
    expect(AYAR_SOZLUGU[TAZE].varsayilan).toBe(KANIT_ESIK_VARSAYILAN.taze);
    expect(AYAR_SOZLUGU[DOLMUS].varsayilan).toBe(KANIT_ESIK_VARSAYILAN.dolmus);
  });
});

/* ── 1 · Kayıt yok → kod varsayılanı ───────────────────────────────────── */
describe('kayıt yok → kod varsayılanı', () => {
  it('kanitEsikleri 90/180 ve kaynak varsayilan', async () => {
    const e = await kanitEsikleri();
    expect(e.esik).toEqual({ taze: 90, dolmus: 180 });
    expect(e.kaynak).toEqual({ taze: 'varsayilan', dolmus: 'varsayilan' });
    expect(e.uyari).toBeNull();
  });
  it('saf hesap: eşik parametresi sınıflamayı değiştirir', () => {
    const simdi = new Date();
    const gun = (n: number) => new Date(simdi.getTime() - n * 86_400_000);
    expect(kanitKovasi(30)).toBe('taze');
    expect(kanitKovasi(120)).toBe('yenilenmeli');
    expect(kanitKovasi(200)).toBe('dolmus');
    expect(kanitKovasi(45, { taze: 30, dolmus: 60 })).toBe('yenilenmeli');
    expect(kanitKovasi(45, { taze: 60, dolmus: 120 })).toBe('taze');
    // kanitTazelik varsayılan ile 120 gün → kismi; dar eşikle → uyumsuz
    const v = kanitTazelik(gun(120));
    const d = kanitTazelik(gun(120), { taze: 30, dolmus: 60 });
    expect(v).not.toBe(d);
  });
});

/* ── 2 · RBAC ve sınıf kapısı ─────────────────────────────────────────── */
describe('kapılar — B anahtarı doğrudan yazılmaz, okuyucu öneremez', () => {
  it('ayarKaydet B anahtarını reddeder [KNT-TAZ-001]', async () => {
    const s = await ayarKaydet({ anahtar: TAZE, deger: 60, gerekce: GEREKCE });
    expect(hataMetni(s)).toMatch(/onay/i);
    expect((await ayarOku(TAZE)).kaynak).toBe('varsayilan');
  });
  it('okuyucu öneremez (sunucu kapısı)', async () => {
    const s = await kimlikle({ yetkiler: [yetki('okuyucu')] }, () => degisiklikOner({
      hedefTipi: 'ayar', hedefId: TAZE, sonra: { anahtar: TAZE, deger: 60 }, gerekce: GEREKCE }));
    expect(hataMetni(s)).toMatch(/yetki/i);
  });
  it('şema dışı değer önerilemez (aralık 7–365)', async () => {
    expect(hataMetni(await degisiklikOner({ hedefTipi: 'ayar', hedefId: TAZE, sonra: { anahtar: TAZE, deger: 3 }, gerekce: GEREKCE }))).not.toBe('');
    expect(hataMetni(await degisiklikOner({ hedefTipi: 'ayar', hedefId: TAZE, sonra: { anahtar: TAZE, deger: 'abc' }, gerekce: GEREKCE }))).not.toBe('');
  });
  it('çift tutarsızlığı önerirken reddedilir: taze ≥ dolmuş', async () => {
    const s = await degisiklikOner({ hedefTipi: 'ayar', hedefId: TAZE, sonra: { anahtar: TAZE, deger: 200 }, gerekce: GEREKCE });
    expect(hataMetni(s)).toMatch(/küçük/i);
    expect(ayarCiftDogrula({ [TAZE]: 180, [DOLMUS]: 180 })).not.toBeNull();
    expect(ayarCiftDogrula({ [TAZE]: 90, [DOLMUS]: 180 })).toBeNull();
  });
});

/* ── 3 · Dört göz akışı ve etki ────────────────────────────────────────── */
describe('geçerli override — Öner → Onayla → Uygula', () => {
  let talepId = '';

  it('etki ön izlemesi: kanıt / bulgu / yeniden sınıflanacak sayıları', async () => {
    const e = await etkiHesapla({ hedefTipi: 'ayar', hedefId: TAZE, sonra: { anahtar: TAZE, deger: 30 } });
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    const basliklar = e.etki.map((x) => x.baslik);
    expect(basliklar).toEqual(expect.arrayContaining(['Kanıt (aktif kütük)', 'Bağlı bulgu', 'Yeniden sınıflanacak kanıt']));
    const kanit = e.etki.find((x) => x.baslik === 'Kanıt (aktif kütük)');
    const yeniden = e.etki.find((x) => x.baslik === 'Yeniden sınıflanacak kanıt');
    expect(typeof kanit?.deger).toBe('number');
    expect(typeof yeniden?.deger).toBe('number');
    expect(yeniden!.deger!).toBeLessThanOrEqual(kanit!.deger!);
    // Aynı değerle etki: hiçbir kanıt kova değiştirmez
    const ayni = await etkiHesapla({ hedefTipi: 'ayar', hedefId: TAZE, sonra: { anahtar: TAZE, deger: 90 } });
    if (ayni.ok) expect(ayni.etki.find((x) => x.baslik === 'Yeniden sınıflanacak kanıt')?.deger).toBe(0);
  });

  it('öneri açılır; değer henüz yazılmaz; talep izi düşer', async () => {
    const s = await degisiklikOner({ hedefTipi: 'ayar', hedefId: TAZE, sonra: { anahtar: TAZE, deger: 60 }, gerekce: GEREKCE });
    expect(hataMetni(s)).toBe('');
    talepId = (s as { id?: string }).id ?? '';
    expect(talepId).not.toBe('');
    expect((await kanitEsikleri()).esik.taze).toBe(90);
    expect(await db.aktiviteKaydi.count({ where: { varlikTipi: 'DegisiklikTalebi', varlikId: talepId, eylem: 'olusturma' } })).toBe(1);
    const t = await db.degisiklikTalebi.findUniqueOrThrow({ where: { id: talepId } });
    expect(JSON.parse(t.etkiJson ?? '[]').some((x: { baslik: string }) => x.baslik === 'Yeniden sınıflanacak kanıt')).toBe(true);
  });

  it('self approval reddi: öneren onaylayamaz', async () => {
    expect(hataMetni(await degisiklikOnayla({ id: talepId }))).toMatch(/dört göz/i);
  });

  it('onaysız uygulama reddi', async () => {
    expect(hataMetni(await degisiklikUygula({ id: talepId }))).toMatch(/onaylan/i);
  });

  it('ikinci yönetici onaylar; uygulanınca sunucu tek kaynak yeni eşiği okur', async () => {
    expect(hataMetni(await kimlikle(kisiB(), () => degisiklikOnayla({ id: talepId })))).toBe('');
    expect((await kanitEsikleri()).esik.taze).toBe(90); // onay ≠ uygulama
    expect(hataMetni(await degisiklikUygula({ id: talepId }))).toBe('');
    const e = await kanitEsikleri();
    expect(e.esik).toEqual({ taze: 60, dolmus: 180 });
    expect(e.kaynak.taze).toBe('yapilandirma');
    expect(e.kaynak.dolmus).toBe('varsayilan');
    expect(e.uyari).toBeNull();
  });

  it('audit izi: uygulama Yapilandirma varlığına önce → sonra yazar', async () => {
    const iz = await db.aktiviteKaydi.findFirst({ where: { varlikTipi: 'Yapilandirma', varlikId: TAZE }, orderBy: { zaman: 'desc' } });
    expect(iz).not.toBeNull();
    expect(iz?.oncekiDeger ?? '').toMatch(/90/);
    expect(iz?.yeniDeger ?? '').toMatch(/60/);
    expect(iz?.aktorId).toBe(yoneticiA);
  });
});

/* ── 4 · Geçersiz kayıt → varsayılan + gecersiz_kayit ─────────────────── */
describe('geçersiz kayıt → kod varsayılanı, bilinmiyor ≠ sıfır', () => {
  it('şema dışı satır (dize) → 90 + gecersiz_kayit', async () => {
    await db.yapilandirma.upsert({ where: { anahtar: TAZE }, update: { degerJson: '"abc"' }, create: { anahtar: TAZE, degerJson: '"abc"' } });
    const e = await kanitEsikleri();
    expect(e.esik.taze).toBe(90);
    expect(e.kaynak.taze).toBe('gecersiz_kayit');
  });
  it('aralık dışı satır (3) → varsayılan + gecersiz_kayit', async () => {
    await db.yapilandirma.update({ where: { anahtar: TAZE }, data: { degerJson: '3' } });
    const e = await kanitEsikleri();
    expect(e.esik.taze).toBe(90);
    expect(e.kaynak.taze).toBe('gecersiz_kayit');
  });
  it('bozuk JSON satırı → varsayılan + gecersiz_kayit', async () => {
    await db.yapilandirma.update({ where: { anahtar: TAZE }, data: { degerJson: '{oops' } });
    const e = await kanitEsikleri();
    expect(e.esik.taze).toBe(90);
    expect(e.kaynak.taze).toBe('gecersiz_kayit');
  });
  it('çift tutarsız (taze 200 / dolmuş 180 tek tek geçerli) → İKİSİ de varsayılan + uyarı', async () => {
    await db.yapilandirma.update({ where: { anahtar: TAZE }, data: { degerJson: '200' } });
    const e = await kanitEsikleri();
    expect(e.esik).toEqual({ taze: 90, dolmus: 180 });
    expect(e.kaynak).toEqual({ taze: 'gecersiz_kayit', dolmus: 'gecersiz_kayit' });
    expect(e.uyari).toMatch(/tutarsız/);
    expect(e.esik.taze).not.toBe(0);
  });
  it('kayıt silinince yeniden varsayilan', async () => {
    await db.yapilandirma.deleteMany({ where: { anahtar: TAZE } });
    const e = await kanitEsikleri();
    expect(e.kaynak.taze).toBe('varsayilan');
  });
});
