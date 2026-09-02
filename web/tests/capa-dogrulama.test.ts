import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   CAPA · C20 tamamlama notu + doğrulama, C24 kapanış kapısı

   Ölçülen şey mesaj değil SONUÇTUR: aksiyon satırında hangi doğrulama
   durumu kaldı, denetim izine hangi satır düştü, denetim hangi aşamada.

   Kurulum, proje kalıbıyla aynıdır (tests/yaris-kosullari.test.ts):
   dev.db'nin kopyası üzerinde koşar, TEST_DB db'ye dokunan HER importtan
   ÖNCE ayarlanır. Yetki kapısı seed'deki gerçek bir kullanıcıyla açılır;
   kapının ARKASINDAKİ kurallar (görev ayrılığı, not zorunluluğu, kapanış
   sayımı) sahte değildir, gerçek kodda koşar.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-capa-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const sahteKullanici = {
  id: '', adSoyad: 'Test Doğrulayıcı', eposta: 'capa@test', unvan: null,
  yetkiler: [{ rol: 'yonetici', surecId: null, tesisId: null, tuzelKisiId: null,
    regulasyonId: null, modul: null }],
};

vi.mock('@/lib/erisim', async (asil) => {
  const gercek = await asil<typeof import('@/lib/erisim')>();
  return { ...gercek, yetkiZorunlu: async () => sahteKullanici, izinVar: () => true };
});

const { db } = await import('@/lib/db');
const { aksiyonDurumDegistir, aksiyonDogrula, bulguGuncelle } = await import('@/lib/eylemler');
const { asamaIlerlet } = await import('@/lib/eylemler2/denetim');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

/** Seed'den bir madde durumu — bulgu bunun çocuğudur. */
let maddeDurumuId = '';
/** Doğrulayandan FARKLI bir sorumlu; görev ayrılığı testinde tersi kurulur. */
let baskaKullaniciId: string | null = null;

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  sahteKullanici.id = kisi.id;
  const baska = await db.kullanici.findFirst({ where: { aktif: true, id: { not: kisi.id } } });
  baskaKullaniciId = baska?.id ?? null;
  const md = await db.maddeDurumu.findFirstOrThrow();
  maddeDurumuId = md.id;
});

async function bulguAc(ek: { denetimId?: string; durum?: string } = {}) {
  return db.bulgu.create({ data: {
    maddeDurumuId, baslik: benzersiz('CAPA bulgusu'), aciklama: 'test', onemDerecesi: 'orta',
    durum: ek.durum ?? 'acik', denetimId: ek.denetimId ?? null,
  } });
}

async function aksiyonAc(bulguId: string, ek: {
  durum?: string; sorumluId?: string | null; dogrulamaDurumu?: string;
} = {}) {
  return db.aksiyon.create({ data: {
    bulguId, baslik: benzersiz('Aksiyon'), durum: ek.durum ?? 'devam',
    sorumluId: ek.sorumluId ?? baskaKullaniciId,
    dogrulamaDurumu: ek.dogrulamaDurumu ?? 'gerekmez',
    tamamlanma: ek.durum === 'tamamlandi' ? new Date() : null,
  } });
}

async function aksiyonOku(id: string) {
  return db.aksiyon.findUniqueOrThrow({ where: { id } });
}

async function izSatirlari(varlikTipi: string, varlikId: string) {
  return db.aktiviteKaydi.findMany({
    where: { varlikTipi, varlikId }, orderBy: { zaman: 'asc' },
  });
}

/* ═══ C20 · tamamlama notu ═════════════════════════════════════════════ */

describe('C20 — aksiyon tamamlama notu', () => {
  it('tamamlanma dışı bir durum geçişi mevcut notu SİLMEZ (not verilmedi = korunur)', async () => {
    const b = await bulguAc();
    const a = await aksiyonAc(b.id, { durum: 'tamamlandi' });
    await db.aksiyon.update({ where: { id: a.id }, data: { etkinlikNotu: 'Yama uygulandı.' } });
    // İstemci not vermeden 'devam'a çeker (select değişimi) — not korunmalı.
    expect((await aksiyonDurumDegistir({ id: a.id, durum: 'devam' })).ok).toBe(true);
    expect((await aksiyonOku(a.id)).etkinlikNotu).toBe('Yama uygulandı.');
    // null da "sil" demek değildir: eski istemci sözleşmesi bile notu düşürmez.
    expect((await aksiyonDurumDegistir({ id: a.id, durum: 'planlandi', not: null })).ok).toBe(true);
    expect((await aksiyonOku(a.id)).etkinlikNotu).toBe('Yama uygulandı.');
  });

  it('notsuz "tamamlandi" geçişi reddedilir; satır ve iz dokunulmaz kalır', async () => {
    const b = await bulguAc();
    const a = await aksiyonAc(b.id);

    const s = await aksiyonDurumDegistir({ id: a.id, durum: 'tamamlandi' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/Tamamlama notu/);

    const son = await aksiyonOku(a.id);
    expect(son.durum).toBe('devam');
    expect(son.dogrulamaDurumu).toBe('gerekmez');
    expect(await izSatirlari('Aksiyon', a.id)).toHaveLength(0);
  });

  it('notlu tamamlama: durum tamamlandi, doğrulama kuyruğa ("bekliyor") girer, not izde gerekçedir', async () => {
    const b = await bulguAc();
    const a = await aksiyonAc(b.id);

    const s = await aksiyonDurumDegistir({ id: a.id, durum: 'tamamlandi', not: 'Yama uygulandı' });
    expect(s.ok).toBe(true);

    const son = await aksiyonOku(a.id);
    expect(son.durum).toBe('tamamlandi');
    expect(son.dogrulamaDurumu).toBe('bekliyor');
    expect(son.tamamlanma).not.toBeNull();
    expect(son.etkinlikNotu).toBe('Yama uygulandı');

    const iz = await izSatirlari('Aksiyon', a.id);
    expect(iz).toHaveLength(1);
    expect(iz[0]).toMatchObject({ eylem: 'durum_degisimi', oncekiDeger: 'devam', yeniDeger: 'tamamlandi', gerekce: 'Yama uygulandı' });
  });

  it('tamamlanmış aksiyon geri çekilince eski doğrulama düşer (gerekmez, doğrulayan boş)', async () => {
    const b = await bulguAc();
    const a = await aksiyonAc(b.id, { durum: 'tamamlandi', dogrulamaDurumu: 'dogrulandi' });
    await db.aksiyon.update({ where: { id: a.id }, data: { dogrulayanId: sahteKullanici.id, dogrulamaTarihi: new Date() } });

    const s = await aksiyonDurumDegistir({ id: a.id, durum: 'devam' });
    expect(s.ok).toBe(true);

    const son = await aksiyonOku(a.id);
    expect(son.durum).toBe('devam');
    expect(son.tamamlanma).toBeNull();
    expect(son.dogrulamaDurumu).toBe('gerekmez');
    expect(son.dogrulayanId).toBeNull();
    expect(son.dogrulamaTarihi).toBeNull();
  });
});

/* ═══ C20 · doğrulama (görev ayrılığı) ═════════════════════════════════ */

describe('C20 — aksiyon doğrulama', () => {
  it('bitmemiş aksiyon doğrulanamaz', async () => {
    const b = await bulguAc();
    const a = await aksiyonAc(b.id, { durum: 'devam' });

    const s = await aksiyonDogrula({ id: a.id, sonuc: 'etkin' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/Yalnız tamamlanmış/);
    expect((await aksiyonOku(a.id)).dogrulamaDurumu).toBe('gerekmez');
  });

  it('görev ayrılığı: sorumlu kendi aksiyonunu doğrulayamaz', async () => {
    const b = await bulguAc();
    const a = await aksiyonAc(b.id, { durum: 'tamamlandi', dogrulamaDurumu: 'bekliyor', sorumluId: sahteKullanici.id });

    const s = await aksiyonDogrula({ id: a.id, sonuc: 'etkin' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/Görev ayrılığı/);
    expect((await aksiyonOku(a.id)).dogrulamaDurumu).toBe('bekliyor');
    expect(await izSatirlari('Aksiyon', a.id)).toHaveLength(0);
  });

  it('"etkisiz" kararı gerekçesiz yazılamaz', async () => {
    const b = await bulguAc();
    const a = await aksiyonAc(b.id, { durum: 'tamamlandi', dogrulamaDurumu: 'bekliyor' });

    const s = await aksiyonDogrula({ id: a.id, sonuc: 'etkisiz' });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/gerekçe/);
    expect((await aksiyonOku(a.id)).dogrulamaDurumu).toBe('bekliyor');
  });

  it('"etkin": dogrulandi + doğrulayan aktif kullanıcı + izde "onay/dogrulama" satırı', async () => {
    const b = await bulguAc();
    const a = await aksiyonAc(b.id, { durum: 'tamamlandi', dogrulamaDurumu: 'bekliyor' });
    await db.aksiyon.update({ where: { id: a.id }, data: { etkinlikNotu: 'Yama uygulandı' } });

    const s = await aksiyonDogrula({ id: a.id, sonuc: 'etkin', not: 'Sahada teyit edildi' });
    expect(s.ok).toBe(true);

    const son = await aksiyonOku(a.id);
    expect(son.dogrulamaDurumu).toBe('dogrulandi');
    expect(son.dogrulayanId).toBe(sahteKullanici.id);
    expect(son.dogrulamaTarihi).not.toBeNull();
    // Doğrulayanın notu tamamlama notunu SİLMEZ; ikisi birlikte durur.
    expect(son.etkinlikNotu).toBe('Yama uygulandı\nDoğrulama: Sahada teyit edildi');

    const iz = await izSatirlari('Aksiyon', a.id);
    expect(iz).toHaveLength(1);
    expect(iz[0]).toMatchObject({
      eylem: 'onay', alan: 'dogrulama', oncekiDeger: 'bekliyor', yeniDeger: 'dogrulandi',
      aktorId: sahteKullanici.id, gerekce: 'Sahada teyit edildi',
    });
  });

  it('"etkisiz" + gerekçe: reddedildi + izde "red/dogrulama" satırı', async () => {
    const b = await bulguAc();
    const a = await aksiyonAc(b.id, { durum: 'tamamlandi', dogrulamaDurumu: 'bekliyor' });

    const s = await aksiyonDogrula({ id: a.id, sonuc: 'etkisiz', not: 'Sorun tekrar etti' });
    expect(s.ok).toBe(true);

    const son = await aksiyonOku(a.id);
    expect(son.dogrulamaDurumu).toBe('reddedildi');
    expect(son.durum).toBe('tamamlandi');         // durum değişmez, sorumluya geri döner
    expect(son.etkinlikNotu).toBe('Doğrulama: Sorun tekrar etti');

    const iz = await izSatirlari('Aksiyon', a.id);
    expect(iz).toHaveLength(1);
    expect(iz[0]).toMatchObject({ eylem: 'red', alan: 'dogrulama', yeniDeger: 'reddedildi', gerekce: 'Sorun tekrar etti' });
  });
});

/* ═══ C20 · kök neden / retest izi ═════════════════════════════════════ */

describe('C20 — bulgu kök neden ve retest', () => {
  it('kök neden, retest bayrağı ve retest sonucu ayrı iz satırlarıyla yazılır', async () => {
    const b = await bulguAc();

    const s = await bulguGuncelle({ id: b.id, kokNeden: 'Yama takvimi yoktu', retestGerekli: true, retestSonucu: 'Retest: geçti' });
    expect(s.ok).toBe(true);

    const son = await db.bulgu.findUniqueOrThrow({ where: { id: b.id } });
    expect(son.kokNeden).toBe('Yama takvimi yoktu');
    expect(son.retestGerekli).toBe(true);
    expect(son.retestSonucu).toBe('Retest: geçti');

    const alanlar = (await izSatirlari('Bulgu', b.id)).map((x) => x.alan).sort();
    expect(alanlar).toEqual(['kokNeden', 'retestGerekli', 'retestSonucu']);
  });

  it('boş dize null olur: "kök neden girildi ama boş" diye bir durum yoktur', async () => {
    const b = await bulguAc();
    await bulguGuncelle({ id: b.id, kokNeden: 'Geçici' });

    const s = await bulguGuncelle({ id: b.id, kokNeden: '   ' });
    expect(s.ok).toBe(true);
    expect((await db.bulgu.findUniqueOrThrow({ where: { id: b.id } })).kokNeden).toBeNull();
  });
});

/* ═══ C24 · kapanış kapısı ═════════════════════════════════════════════ */

async function denetimAc(durum: string) {
  return db.denetim.create({ data: {
    kod: benzersiz('CAPA'), ad: 'CAPA kapısı denetimi', tip: 'ic_denetim', durum } });
}

describe('C24 — dogrulama → kapanis kapısı', () => {
  it('tamamlanmış ama doğrulanmamış aksiyon varken kapanış reddedilir; aşama yerinde kalır', async () => {
    const d = await denetimAc('dogrulama');
    const b = await bulguAc({ denetimId: d.id, durum: 'kapali' });
    await aksiyonAc(b.id, { durum: 'tamamlandi', dogrulamaDurumu: 'bekliyor' });

    const s = await asamaIlerlet({ id: d.id });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/doğrulanmamış aksiyon var: 1/);

    const son = await db.denetim.findUniqueOrThrow({ where: { id: d.id } });
    expect(son.durum).toBe('dogrulama');
    // Geçiş geri alındı: iz de geri alındı (tek transaction).
    expect(await izSatirlari('Denetim', d.id)).toHaveLength(0);
  });

  it('"gerekmez" da doğrulanmamış sayılır — bağımsız bir göz henüz bakmamıştır', async () => {
    const d = await denetimAc('dogrulama');
    const b = await bulguAc({ denetimId: d.id, durum: 'kapali' });
    await aksiyonAc(b.id, { durum: 'tamamlandi', dogrulamaDurumu: 'gerekmez' });

    const s = await asamaIlerlet({ id: d.id });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/doğrulanmamış aksiyon var: 1/);
  });

  it('etkisiz bulunan (reddedilen) aksiyon da kapanışı durdurur', async () => {
    const d = await denetimAc('dogrulama');
    const b = await bulguAc({ denetimId: d.id, durum: 'kapali' });
    await aksiyonAc(b.id, { durum: 'tamamlandi', dogrulamaDurumu: 'reddedildi' });

    const s = await asamaIlerlet({ id: d.id });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/etkisiz bulunan aksiyon var: 1/);
    expect(hataMetni(s)).not.toMatch(/doğrulanmamış aksiyon/);
    expect((await db.denetim.findUniqueOrThrow({ where: { id: d.id } })).durum).toBe('dogrulama');
  });

  it('aksiyon "etkin" doğrulanınca aynı denetim kapanışa geçer ve iz düşer', async () => {
    const d = await denetimAc('dogrulama');
    const b = await bulguAc({ denetimId: d.id, durum: 'kapali' });
    const a = await aksiyonAc(b.id, { durum: 'tamamlandi', dogrulamaDurumu: 'bekliyor' });

    expect((await asamaIlerlet({ id: d.id })).ok).toBe(false);

    const dogrulama = await aksiyonDogrula({ id: a.id, sonuc: 'etkin' });
    expect(dogrulama.ok).toBe(true);

    const s = await asamaIlerlet({ id: d.id });
    expect(s.ok).toBe(true);
    expect((await db.denetim.findUniqueOrThrow({ where: { id: d.id } })).durum).toBe('kapanis');

    const iz = await izSatirlari('Denetim', d.id);
    expect(iz).toHaveLength(1);
    expect(iz[0]).toMatchObject({ eylem: 'durum_degisimi', oncekiDeger: 'dogrulama', yeniDeger: 'kapanis' });
  });

  it('başka denetimin doğrulanmamış aksiyonu bu denetimin kapanışını etkilemez', async () => {
    const d = await denetimAc('dogrulama');
    const yabanci = await denetimAc('dogrulama');
    const b = await bulguAc({ denetimId: yabanci.id, durum: 'kapali' });
    await aksiyonAc(b.id, { durum: 'tamamlandi', dogrulamaDurumu: 'bekliyor' });

    const s = await asamaIlerlet({ id: d.id });
    expect(s.ok).toBe(true);
    expect((await db.denetim.findUniqueOrThrow({ where: { id: d.id } })).durum).toBe('kapanis');
  });
});
