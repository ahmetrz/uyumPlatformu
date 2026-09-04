import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Yönetim konsolu eylemleri — GERÇEK veritabanı, GERÇEK yetki kapısı

   Konsolun güvenlik sözleşmesi dört maddedir ve dördü de sunucuda durur;
   bu dosya hepsini kapıdan geçirerek sınar:

     1. RBAC sunucuda: okuyucu okur ama yazamaz/onaylayamaz; UI gizlemesi
        yetki değildir.
     2. A sınıfı doğrudan yazılır ama İZSİZ yazılmaz: kim / ne zaman /
        önce → sonra / gerekçe AktiviteKaydi'na düşer.
     3. B sınıfı doğrudan yazılmaz: Öner → Onayla → Uygula. Dört göz —
        öneren onaylayamaz. Onaysız uygulama yok; red nedensiz olmaz.
        Uygulanınca ayar `ayar()` üzerinden motorlara yansır.
     4. Yıkıcı işlem bağlı kayıt varken reddedilir ve gerekçe ister;
        santral görseli başka santralın anahtarını dolgu olarak ALAMAZ.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yonetim-'));
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
const {
  katalogKaydet, katalogArsivle, tesisGorselAta, ayarKaydet, etkiHesapla,
  degisiklikOner, degisiklikOnayla, degisiklikReddet, degisiklikIptal, degisiklikUygula,
} = await import('@/lib/eylemler2/yonetim');
const { ayar, ayarOku } = await import('@/lib/yapilandirma/oku');
const { AYAR_SOZLUGU } = await import('@/lib/yapilandirma/tanimlar');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

/** Kimliği (id + roller) geçici değiştirir; dört göz için ikinci kişi gerekir. */
async function kimlikle<T>(kim: { id?: string; yetkiler: Yetki[] }, is: () => Promise<T>): Promise<T> {
  const onceki = { id: oturum.id, yetkiler: oturum.yetkiler };
  if (kim.id) oturum.id = kim.id;
  oturum.yetkiler = kim.yetkiler;
  try { return await is(); } finally { oturum.id = onceki.id; oturum.yetkiler = onceki.yetkiler; }
}

const GEREKCE = 'Denetim bulgusu 2026-14 gereği eşik güncelleniyor';
let yoneticiA = '';
let yoneticiB = '';
let grupId = '';

beforeAll(async () => {
  const kisiler = await db.kullanici.findMany({ where: { aktif: true }, take: 2, orderBy: { id: 'asc' } });
  expect(kisiler.length).toBe(2);
  [yoneticiA, yoneticiB] = kisiler.map((k) => k.id);
  oturum.id = yoneticiA;
  grupId = (await db.grup.findFirstOrThrow()).id;
  // Temiz zemin: bu testin dokunduğu ayarlar ve açık talepler
  await db.degisiklikTalebi.deleteMany({});
  await db.yapilandirma.deleteMany({ where: { anahtar: { in: ['saha.takvim_gun', 'risk.esik.kritik', 'kabuk.kunye'] } } });
});

/* ── 1 · RBAC sunucuda ─────────────────────────────────────────────────── */
describe('RBAC — okuyucu okur, yazamaz, onaylayamaz', () => {
  const okuyucu = { yetkiler: [yetki('okuyucu')] };

  it('katalogKaydet reddedilir ve hiçbir satır yazılmaz', async () => {
    const once = await db.grup.count();
    const s = await kimlikle(okuyucu, () => katalogKaydet({ tip: 'grup', degerler: { kod: 'RBAC-X', ad: 'Yetkisiz grup' } }));
    expect(hataMetni(s)).toMatch(/yetki/i);
    expect(await db.grup.count()).toBe(once);
  });

  it('ayarKaydet reddedilir', async () => {
    const s = await kimlikle(okuyucu, () => ayarKaydet({ anahtar: 'kabuk.kunye', deger: 'x', gerekce: GEREKCE }));
    expect(hataMetni(s)).toMatch(/yetki/i);
    expect((await ayarOku('kabuk.kunye')).kaynak).toBe('varsayilan');
  });

  it('degisiklikOner ve degisiklikOnayla reddedilir', async () => {
    const o = await kimlikle(okuyucu, () => degisiklikOner({
      hedefTipi: 'ayar', hedefId: 'risk.esik.kritik', sonra: { anahtar: 'risk.esik.kritik', deger: 18 }, gerekce: GEREKCE }));
    expect(hataMetni(o)).toMatch(/yetki/i);
    const a = await kimlikle(okuyucu, () => degisiklikOnayla({ id: 'yok' }));
    expect(hataMetni(a)).toMatch(/yetki/i);
  });

  it('okuyucu etkiyi HESAPLAYABİLİR (okuma yetkisi yeter)', async () => {
    const s = await kimlikle(okuyucu, () => etkiHesapla({ hedefTipi: 'grup', hedefId: grupId }));
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.etki.find((e) => e.baslik === 'Tüzel kişi')?.deger).toBeGreaterThan(0);
  });

  it('yönetim yetkisi olmayan yazar rol (bt_yoneticisi) de konsola yazamaz [YTK-LST-002]', async () => {
    const s = await kimlikle({ yetkiler: [yetki('bt_yoneticisi')] },
      () => katalogKaydet({ tip: 'grup', degerler: { kod: 'RBAC-Y', ad: 'BT grubu' } }));
    expect(hataMetni(s)).toMatch(/yetki/i);
  });
});

/* ── 2 · A sınıfı: doğrudan ama izli ───────────────────────────────────── */
describe('A sınıfı — doğrudan yazılır, iz bırakır, şema korur', () => {
  let yeniGrup = '';

  it('grup oluşturma: kayıt + olusturma izi (kim, sonra)', async () => {
    const s = await katalogKaydet({ tip: 'grup', degerler: { kod: 'TEST-HOLD', ad: 'Test Holding' }, gerekce: 'Yeni iştirak' });
    expect(hataMetni(s)).toBe('');
    yeniGrup = (s as { id?: string }).id ?? '';
    expect(yeniGrup).not.toBe('');
    const iz = await db.aktiviteKaydi.findFirst({ where: { varlikTipi: 'Grup', varlikId: yeniGrup, eylem: 'olusturma' } });
    expect(iz?.aktorId).toBe(yoneticiA);
    expect(iz?.yeniDeger ?? '').toMatch(/TEST-HOLD/);
    expect(iz?.gerekce).toBe('Yeni iştirak');
  });

  it('güncelleme: once/sonra izi alanı yazar', async () => {
    const s = await katalogKaydet({ tip: 'grup', id: yeniGrup, degerler: { kod: 'TEST-HOLD', ad: 'Test Holding A.Ş.' } });
    expect(hataMetni(s)).toBe('');
    const iz = await db.aktiviteKaydi.findFirst({ where: { varlikTipi: 'Grup', varlikId: yeniGrup, eylem: 'guncelleme' } });
    expect(iz?.oncekiDeger ?? '').toMatch(/Test Holding"/);
    expect(iz?.yeniDeger ?? '').toMatch(/A\.Ş\./);
  });

  it('şema: boş kod reddedilir; bilinmeyen tip reddedilir', async () => {
    expect(hataMetni(await katalogKaydet({ tip: 'grup', degerler: { kod: '  ', ad: 'x' } }))).not.toBe('');
    expect(hataMetni(await katalogKaydet({ tip: 'tesis', degerler: { kod: 'A', ad: 'x' } }))).not.toBe('');
    expect(hataMetni(await katalogKaydet({ tip: 'varlikTuru', degerler: { kod: 'VT-X', ad: 'x', sinif: 'YOK' } }))).not.toBe('');
  });

  it('bağlı kayıt varken arşiv reddedilir; bağsız kayıt gerekçeyle silinir', async () => {
    const engel = await katalogArsivle({ tip: 'grup', id: grupId, gerekce: GEREKCE });
    expect(hataMetni(engel)).toMatch(/bağlı \d+ tüzel kişi/);
    expect(await db.grup.findUnique({ where: { id: grupId } })).not.toBeNull();

    expect(hataMetni(await katalogArsivle({ tip: 'grup', id: yeniGrup, gerekce: 'kısa' }))).toMatch(/10/);
    expect(hataMetni(await katalogArsivle({ tip: 'grup', id: yeniGrup, gerekce: 'Yanlış açılan test kaydı kaldırılıyor' }))).toBe('');
    expect(await db.grup.findUnique({ where: { id: yeniGrup } })).toBeNull();
    const iz = await db.aktiviteKaydi.findFirst({ where: { varlikTipi: 'Grup', varlikId: yeniGrup, eylem: 'silme' } });
    expect(iz?.gerekce).toMatch(/test kaydı/);
  });

  it('varlık türü pasife alma varlıkları silmez', async () => {
    const tur = await db.varlikTuru.findFirstOrThrow({ where: { aktif: true, varliklar: { some: {} } }, include: { _count: { select: { varliklar: true } } } });
    const s = await katalogArsivle({ tip: 'varlikTuru', id: tur.id, gerekce: 'Tür yeni sınıflandırmada birleştirildi' });
    expect(hataMetni(s)).toBe('');
    expect((await db.varlikTuru.findUniqueOrThrow({ where: { id: tur.id } })).aktif).toBe(false);
    expect(await db.varlik.count({ where: { turId: tur.id } })).toBe(tur._count.varliklar);
    await db.varlikTuru.update({ where: { id: tur.id }, data: { aktif: true } });
  });

  it('A sınıfı ayar doğrudan yazılır, okuyucu görür, iz düşer [YON-AYR-001]', async () => {
    const s = await ayarKaydet({ anahtar: 'saha.takvim_gun', deger: 120, gerekce: GEREKCE });
    expect(hataMetni(s)).toBe('');
    expect(await ayar<number>('saha.takvim_gun')).toBe(120);
    const iz = await db.aktiviteKaydi.findFirst({ where: { varlikTipi: 'Yapilandirma', varlikId: 'saha.takvim_gun' } });
    expect(iz?.aktorId).toBe(yoneticiA);
    expect(iz?.gerekce).toBe(GEREKCE);
  });

  it('A sınıfı ayar şema dışı değeri reddeder; B sınıfı ayar ayarKaydet ile YAZILAMAZ', async () => {
    expect(hataMetni(await ayarKaydet({ anahtar: 'saha.takvim_gun', deger: 3, gerekce: GEREKCE }))).not.toBe('');
    expect(hataMetni(await ayarKaydet({ anahtar: 'saha.takvim_gun', deger: 120, gerekce: 'kısa' }))).toMatch(/10/);
    const b = await ayarKaydet({ anahtar: 'risk.esik.kritik', deger: 18, gerekce: GEREKCE });
    expect(hataMetni(b)).toMatch(/onay|B sınıfı/i);
    expect((await ayarOku('risk.esik.kritik')).kaynak).toBe('varsayilan');
  });
});

/* ── 3 · Santral görseli ───────────────────────────────────────────────── */
describe('Santral görsel eşlemesi — başka santralın görseli dolgu olmaz', () => {
  it('bilinmeyen anahtar reddedilir', async () => {
    const t = await db.tesis.findFirstOrThrow();
    expect(hataMetni(await tesisGorselAta({ tesisId: t.id, gorselAnahtari: 'yok-boyle', gerekce: GEREKCE }))).not.toBe('');
  });

  it('başka santralda kullanılan anahtar reddedilir', async () => {
    const [a, b] = await db.tesis.findMany({ where: { gorselAnahtari: { not: null } }, take: 2 });
    expect(a && b).toBeTruthy();
    const s = await tesisGorselAta({ tesisId: a.id, gorselAnahtari: b.gorselAnahtari, gerekce: GEREKCE });
    expect(hataMetni(s)).toMatch(/başka|kullanılıyor/i);
    expect((await db.tesis.findUniqueOrThrow({ where: { id: a.id } })).gorselAnahtari).toBe(a.gorselAnahtari);
  });

  it('boş atama (plaka) izle yapılır ve geri alınır', async () => {
    const t = await db.tesis.findFirstOrThrow({ where: { gorselAnahtari: { not: null } } });
    expect(hataMetni(await tesisGorselAta({ tesisId: t.id, gorselAnahtari: null, gerekce: 'Fotoğraf lisansı doğrulanamadı' }))).toBe('');
    expect((await db.tesis.findUniqueOrThrow({ where: { id: t.id } })).gorselAnahtari).toBeNull();
    const iz = await db.aktiviteKaydi.findFirst({ where: { varlikTipi: 'Tesis', varlikId: t.id, alan: 'gorselAnahtari' }, orderBy: { zaman: 'desc' } });
    expect(iz?.oncekiDeger).toBe(t.gorselAnahtari);
    expect(hataMetni(await tesisGorselAta({ tesisId: t.id, gorselAnahtari: t.gorselAnahtari, gerekce: 'Lisans doğrulandı, geri alınıyor' }))).toBe('');
  });
});

/* ── 4 · B sınıfı: Öner → Onayla → Uygula (dört göz) ───────────────────── */
describe('B sınıfı — değişiklik talebi akışı', () => {
  const ANAHTAR = 'risk.esik.kritik';
  let talepId = '';
  const kisiB = () => ({ id: yoneticiB, yetkiler: [yetki('yonetici')] });

  it('öneri: talep incelemede açılır, değer HENÜZ yazılmaz, once/etki dondurulur', async () => {
    const s = await degisiklikOner({ hedefTipi: 'ayar', hedefId: ANAHTAR, sonra: { anahtar: ANAHTAR, deger: 18 }, gerekce: GEREKCE });
    expect(hataMetni(s)).toBe('');
    talepId = (s as { id?: string }).id ?? '';
    const t = await db.degisiklikTalebi.findUniqueOrThrow({ where: { id: talepId } });
    expect(t.durum).toBe('incelemede');
    expect(t.talepEdenId).toBe(yoneticiA);
    expect(JSON.parse(t.onceJson ?? '{}').deger).toBe(AYAR_SOZLUGU[ANAHTAR].varsayilan);
    expect(t.etkiJson).not.toBeNull();
    expect(await ayar<number>(ANAHTAR)).toBe(AYAR_SOZLUGU[ANAHTAR].varsayilan);
  });

  it('aynı hedefe ikinci açık talep reddedilir; aynı değere öneri reddedilir', async () => {
    expect(hataMetni(await degisiklikOner({ hedefTipi: 'ayar', hedefId: ANAHTAR, sonra: { anahtar: ANAHTAR, deger: 19 }, gerekce: GEREKCE }))).toMatch(/açık/i);
    expect(hataMetni(await degisiklikOner({ hedefTipi: 'ayar', hedefId: 'risk.esik.yuksek',
      sonra: { anahtar: 'risk.esik.yuksek', deger: AYAR_SOZLUGU['risk.esik.yuksek'].varsayilan }, gerekce: GEREKCE }))).not.toBe('');
  });

  it('çift kısıt: yüksek eşik ≥ kritik eşik önerisi reddedilir', async () => {
    const s = await degisiklikOner({ hedefTipi: 'ayar', hedefId: 'risk.esik.yuksek',
      sonra: { anahtar: 'risk.esik.yuksek', deger: 20 }, gerekce: GEREKCE });
    expect(hataMetni(s)).toMatch(/kritik/i);
  });

  it('onaysız uygulama reddedilir', async () => {
    expect(hataMetni(await degisiklikUygula({ id: talepId }))).toMatch(/onaylan/i);
  });

  it('dört göz: öneren onaylayamaz', async () => {
    expect(hataMetni(await degisiklikOnayla({ id: talepId }))).toMatch(/dört göz/i);
    expect((await db.degisiklikTalebi.findUniqueOrThrow({ where: { id: talepId } })).durum).toBe('incelemede');
  });

  it('red nedensiz olmaz', async () => {
    expect(hataMetni(await kimlikle(kisiB(), () => degisiklikReddet({ id: talepId, neden: 'hayır' })))).toMatch(/10/);
  });

  it('ikinci yönetici onaylar → onaylandi; iz düşer; değer hâlâ yazılmamış', async () => {
    expect(hataMetni(await kimlikle(kisiB(), () => degisiklikOnayla({ id: talepId })))).toBe('');
    const t = await db.degisiklikTalebi.findUniqueOrThrow({ where: { id: talepId } });
    expect(t.durum).toBe('onaylandi');
    expect(t.onaylayanId).toBe(yoneticiB);
    expect(await ayar<number>(ANAHTAR)).toBe(AYAR_SOZLUGU[ANAHTAR].varsayilan);
    expect(await db.aktiviteKaydi.count({ where: { varlikTipi: 'DegisiklikTalebi', varlikId: talepId, eylem: 'onay' } })).toBe(1);
  });

  it('onaylanmış talep geri çekilemez (yalnız incelemede)', async () => {
    expect(hataMetni(await degisiklikIptal({ id: talepId }))).not.toBe('');
  });

  it('uygula: Yapilandirma yazılır, motor okur, talep uygulandi', async () => {
    expect(hataMetni(await degisiklikUygula({ id: talepId }))).toBe('');
    expect(await ayar<number>(ANAHTAR)).toBe(18);
    expect((await ayarOku(ANAHTAR)).kaynak).toBe('yapilandirma');
    const t = await db.degisiklikTalebi.findUniqueOrThrow({ where: { id: talepId } });
    expect(t.durum).toBe('uygulandi');
    expect(t.uygulayanId).toBe(yoneticiA);
    expect(hataMetni(await degisiklikUygula({ id: talepId }))).not.toBe('');
  });

  it('red akışı: neden yazılır, değer değişmez', async () => {
    const s = await degisiklikOner({ hedefTipi: 'ayar', hedefId: ANAHTAR, sonra: { anahtar: ANAHTAR, deger: 22 }, gerekce: GEREKCE });
    const id = (s as { id?: string }).id ?? '';
    expect(hataMetni(await kimlikle(kisiB(), () => degisiklikReddet({ id, neden: 'Risk komitesi kararı bekleniyor' })))).toBe('');
    const t = await db.degisiklikTalebi.findUniqueOrThrow({ where: { id } });
    expect(t.durum).toBe('reddedildi');
    expect(t.redNedeni).toMatch(/komite/);
    expect(await ayar<number>(ANAHTAR)).toBe(18);
  });

  it('iptal: yalnız talep eden, yalnız incelemede', async () => {
    const s = await degisiklikOner({ hedefTipi: 'ayar', hedefId: ANAHTAR, sonra: { anahtar: ANAHTAR, deger: 25 }, gerekce: GEREKCE });
    const id = (s as { id?: string }).id ?? '';
    expect(hataMetni(await kimlikle(kisiB(), () => degisiklikIptal({ id })))).not.toBe('');
    expect(hataMetni(await degisiklikIptal({ id }))).toBe('');
    expect((await db.degisiklikTalebi.findUniqueOrThrow({ where: { id } })).durum).toBe('iptal');
  });

  it('uygulanabilirlik kuralı önerisi etki ön izlemesi taşır ve uygulanınca kapsam yeniden hesaplanır', async () => {
    const kural = await db.uygulanabilirlikKurali.findFirstOrThrow();
    const kosul = JSON.parse(kural.kosulJson) as Record<string, unknown>;
    const sonra = { regulasyonId: kural.regulasyonId, ad: `${kural.ad} (rev)`, kosulJson: JSON.stringify(kosul), aciklama: kural.aciklama, aktif: true };
    const etki = await etkiHesapla({ hedefTipi: 'uygulanabilirlikKurali', hedefId: kural.id, sonra });
    expect(etki.ok).toBe(true);
    if (etki.ok) expect(etki.etki.some((e) => /evet|kapsam/i.test(e.baslik))).toBe(true);

    const s = await degisiklikOner({ hedefTipi: 'uygulanabilirlikKurali', hedefId: kural.id, sonra, gerekce: GEREKCE });
    expect(hataMetni(s)).toBe('');
    const id = (s as { id?: string }).id ?? '';
    expect(hataMetni(await kimlikle(kisiB(), () => degisiklikOnayla({ id })))).toBe('');
    const u = await degisiklikUygula({ id });
    expect(hataMetni(u)).toBe('');
    expect((u as { yenidenHesaplanan?: number }).yenidenHesaplanan).toBeGreaterThan(0);
    const g = await db.uygulanabilirlikKurali.findUniqueOrThrow({ where: { id: kural.id } });
    expect(g.ad).toMatch(/\(rev\)$/);
    expect(g.surum).toBe(kural.surum + 1);
  });

  it('bozuk koşul JSON önerisi reddedilir', async () => {
    const kural = await db.uygulanabilirlikKurali.findFirstOrThrow();
    const s = await degisiklikOner({ hedefTipi: 'uygulanabilirlikKurali', hedefId: kural.id,
      sonra: { regulasyonId: kural.regulasyonId, ad: 'x', kosulJson: '{"yanlis":1}', aktif: true }, gerekce: GEREKCE });
    expect(hataMetni(s)).toMatch(/herhangi|hepsi|Koşul/i);
  });
});
