import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ReactElement, ReactNode } from 'react';
/* Yalnız TİP: `import type` derlemede silinir, dolayısıyla TEST_DB
   ayarlanmadan önce hiçbir modül yüklenmez (proje kalıbı korunur). */
import type {
  KaynakSatiri, KokenSayimSatiri,
} from '@/app/(kabuk)/(operasyonel)/saglik/mantik';

/* Veri kökeni (provenance) sözleşmesi — izole DB kopyası üstünde.

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı). */
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-koken-'));
const testDb = path.join(dizin, 't.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Oturum ikizi: gerçek RBAC yolu koşsun diye çerez sahte, kullanıcı gerçek. */
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
const { kokenYaz, kokenDogrula, kokenleriGetir } = await import('@/lib/entegrasyon/koken');
const { kokenSayimlari, dogrulanmamisKayitlar, kaynakSistemDagilimi, bayatKokenler } =
  await import('@/lib/entegrasyon/kokenRapor');
const { kokenDogrulaEylem, kokenTopluDogrula } = await import('@/lib/eylemler2/koken');
const { varlikKaydet } = await import('@/lib/eylemler2/envanter');
const { KokenRozeti, KokenSatiri, guvenYazisi, kokenGorunumu } =
  await import('@/components/kabuk/Koken');
/* /saglik köken bölümünün SAF mantığı: kökeni olmayan kaydın ekranda nasıl
   göründüğünü belirleyen yer burasıdır (§12 + §18). */
const S = await import('@/app/(kabuk)/(operasyonel)/saglik/mantik');

/* ── React ağacından düz metin: jsdom yok, bileşenler saf fonksiyon ── */
function metin(dugum: ReactNode): string {
  if (dugum == null || typeof dugum === 'boolean') return '';
  if (typeof dugum === 'string' || typeof dugum === 'number') return String(dugum);
  if (Array.isArray(dugum)) return dugum.map(metin).join('');
  const oge = dugum as ReactElement<{ children?: ReactNode }>;
  if (typeof oge === 'object' && 'props' in oge) return metin(oge.props?.children);
  return '';
}

let kullaniciId = '';
let tesisId = '';
let turId = '';

async function varlikAc(etiket: string, ekstra: Record<string, unknown> = {}) {
  return db.varlik.create({ data: { etiket, ad: etiket, turId, tesisId, ...ekstra } });
}

beforeAll(async () => {
  const tesis = await db.tesis.findFirstOrThrow();
  tesisId = tesis.id;
  turId = (await db.varlikTuru.findFirstOrThrow()).id;

  const kisi = await db.kullanici.create({ data: {
    eposta: 'koken.testi@ornek.local', adSoyad: 'Köken Testi', aktif: true } });
  kullaniciId = kisi.id;
  await db.yetki.create({ data: { kullaniciId: kisi.id, rol: 'yonetici' } });

  const token = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: kisi.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  oturum.token = token;
});

describe('Köken sözleşmesi — kökeni olmayan kayıt manueldir', () => {
  it('köken satırı olmayan varlık MANUEL sayılır, "otomatik" kovasına girmez', async () => {
    const once = (await kokenSayimlari()).satirlar.find((s) => s.varlikTipi === 'Varlik');
    expect(once?.manuel).not.toBeNull(); // Varlik evreni bilinir

    const v = await varlikAc('KOKEN-MANUEL-1');
    const sonra = (await kokenSayimlari()).satirlar.find((s) => s.varlikTipi === 'Varlik');

    expect(sonra!.manuel).toBe(once!.manuel! + 1);
    expect(sonra!.otomatik).toBe(once!.otomatik);
    expect(await kokenleriGetir('Varlik', v.id)).toHaveLength(0);
  });

  it('evreni bilinmeyen varlık tipinde manuel sayısı null döner — SIFIR değil', async () => {
    // Zafiyet'in tesise giden yolu yok: kayıt evreni bilinmiyor.
    const v = await varlikAc('KOKEN-EVRENSIZ-1');
    await kokenYaz({ varlikTipi: 'Zafiyet', varlikId: v.id,
      kaynakSistem: 'test-tarayici', kaynakKayitId: 'CVE-TEST-0001' });

    const satir = (await kokenSayimlari()).satirlar.find((s) => s.varlikTipi === 'Zafiyet');
    expect(satir).toBeDefined();
    expect(satir!.manuel).toBeNull();
    expect(satir!.toplam).toBeNull();
    expect(satir!.otomatik).toBeGreaterThan(0);
  });

  it('bileşen kökensiz kayıt için boş dönmez — "Elle girildi" der', () => {
    expect(metin(KokenRozeti({ koken: null }))).toContain('ELLE GİRİLDİ');
    expect(metin(KokenSatiri({ koken: null }))).toContain('Elle girildi');
    expect(metin(KokenSatiri({ koken: undefined }))).not.toBe('');
  });
});

describe('guven: null ÖLÇÜLMEDİ demektir, guven: 0 ölçülmüş sıfırdır', () => {
  it('null "ölçülmedi" yazar, 0 "%0" yazar — ikisi aynı görünmez', () => {
    expect(guvenYazisi(null)).toBe('ölçülmedi');
    expect(guvenYazisi(undefined)).toBe('ölçülmedi');
    expect(guvenYazisi(0)).toBe('%0');
    expect(guvenYazisi(0.87)).toBe('%87');
    expect(guvenYazisi(null)).not.toBe(guvenYazisi(0));
  });

  it('çekmece satırı null güveni "%0" olarak GÖSTERMEZ', () => {
    const ortak = { kokenTipi: 'otomatik' as const, kaynakSistem: 'kaynak-x',
      dogrulamaDurumu: 'dogrulanmadi' as const, toplanma: new Date() };
    const olculmemis = metin(KokenSatiri({ koken: { ...ortak, guven: null } }));
    const sifir = metin(KokenSatiri({ koken: { ...ortak, guven: 0 } }));

    expect(olculmemis).toContain('ölçülmedi');
    expect(olculmemis).not.toContain('%0');
    expect(sifir).toContain('%0');
    expect(sifir).not.toContain('ölçülmedi');
  });

  it('kaynak dağılımında ölçülmemiş güven ortalamaya girmez', async () => {
    const a = await varlikAc('KOKEN-GUVEN-A');
    const b = await varlikAc('KOKEN-GUVEN-B');
    await kokenYaz({ varlikTipi: 'Varlik', varlikId: a.id,
      kaynakSistem: 'guven-kaynagi', kaynakKayitId: 'g-a', guven: null });
    await kokenYaz({ varlikTipi: 'Varlik', varlikId: b.id,
      kaynakSistem: 'guven-kaynagi', kaynakKayitId: 'g-b', guven: 0 });

    const satir = (await kaynakSistemDagilimi()).satirlar
      .find((s) => s.kaynakSistem === 'guven-kaynagi');
    expect(satir!.guveniOlculmemis).toBe(1);
    expect(satir!.guveniOlculen).toBe(1);
    expect(satir!.ortalamaGuven).toBe(0); // yalnız ölçülmüş 0 ortalamaya girdi
  });
});

describe('Köken yazımı idempotenttir', () => {
  it('aynı kaynak + kaynakKayitId ikinci kez yazılınca tek satır kalır, tazelenir', async () => {
    const v = await varlikAc('KOKEN-IDEMPOTENT-1');
    await kokenYaz({ varlikTipi: 'Varlik', varlikId: v.id, kaynakSistem: 'cmdb-x',
      kaynakKayitId: 'CI-001', guven: 0.5 });
    const ilk = await kokenleriGetir('Varlik', v.id);
    expect(ilk).toHaveLength(1);

    await kokenYaz({ varlikTipi: 'Varlik', varlikId: v.id, kaynakSistem: 'cmdb-x',
      kaynakKayitId: 'CI-001', guven: 0.9 });
    const ikinci = await kokenleriGetir('Varlik', v.id);
    expect(ikinci).toHaveLength(1);
    expect(ikinci[0].id).toBe(ilk[0].id);
    expect(ikinci[0].guven).toBe(0.9);
    expect(ikinci[0].aktarim.getTime()).toBeGreaterThanOrEqual(ilk[0].aktarim.getTime());

    // Farklı kaynak aynı kaydı besleyebilir — o AYRI satırdır.
    await kokenYaz({ varlikTipi: 'Varlik', varlikId: v.id, kaynakSistem: 'tarayici-y',
      kaynakKayitId: 'CI-001' });
    expect(await kokenleriGetir('Varlik', v.id)).toHaveLength(2);
  });

  it('kaynakKayitId olmadan köken yazılamaz — idempotency buna dayanır', async () => {
    const v = await varlikAc('KOKEN-ANAHTARSIZ-1');
    await expect(kokenYaz({ varlikTipi: 'Varlik', varlikId: v.id,
      kaynakSistem: 'cmdb-x', kaynakKayitId: '' })).rejects.toThrow(/kaynakKayitId/);
  });
});

describe('Elle güncelleme doğrulamayı ne zaman düşürür', () => {
  async function dogrulanmisVarlik(etiket: string) {
    const v = await varlikAc(etiket, { seriNo: 'SN-1', rafOda: 'A-01', kritiklik: 'orta' });
    await kokenYaz({ varlikTipi: 'Varlik', varlikId: v.id,
      kaynakSistem: 'cmdb-x', kaynakKayitId: `ci-${etiket}`, guven: 0.8 });
    const koken = (await kokenleriGetir('Varlik', v.id))[0];
    await kokenDogrula(koken.id, kullaniciId, 'dogrulandi');
    return { v, kokenId: koken.id };
  }

  const temelGirdi = (v: { id: string; etiket: string; ad: string }) => ({
    id: v.id, etiket: v.etiket, ad: v.ad, turId, tesisId,
    seriNo: 'SN-1', rafOda: 'A-01', kritiklik: 'orta',
  });

  it('kimlik/durum alanı değişince doğrulama DÜŞER ve iz bırakır', async () => {
    const { v, kokenId } = await dogrulanmisVarlik('KOKEN-DUSER-1');

    const sonuc = await varlikKaydet({ ...temelGirdi(v), seriNo: 'SN-2' });
    expect(sonuc).toEqual({ ok: true });

    const sonra = await db.veriKokeni.findUniqueOrThrow({ where: { id: kokenId } });
    expect(sonra.dogrulamaDurumu).toBe('dogrulanmadi');
    expect(sonra.kokenTipi).toBe('otomatik');
    expect(sonra.dogrulayanId).toBeNull();

    const izler = await db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'VeriKokeni', varlikId: kokenId, eylem: 'dogrulama_dusuruldu' } });
    expect(izler).toHaveLength(1);
    expect(izler[0].alan).toContain('seriNo');
  });

  it('durum alanı (kritiklik) değişikliği de doğrulamayı düşürür', async () => {
    const { v, kokenId } = await dogrulanmisVarlik('KOKEN-DUSER-2');
    await varlikKaydet({ ...temelGirdi(v), kritiklik: 'kritik' });
    expect((await db.veriKokeni.findUniqueOrThrow({ where: { id: kokenId } })).dogrulamaDurumu)
      .toBe('dogrulanmadi');
  });

  it('kozmetik alan (ad, rafOda) değişince doğrulama DÜŞMEZ', async () => {
    const { v, kokenId } = await dogrulanmisVarlik('KOKEN-KOZMETIK-1');

    const sonuc = await varlikKaydet({ ...temelGirdi(v), ad: 'Yeni okunur ad', rafOda: 'B-42' });
    expect(sonuc).toEqual({ ok: true });

    const sonra = await db.veriKokeni.findUniqueOrThrow({ where: { id: kokenId } });
    expect(sonra.dogrulamaDurumu).toBe('dogrulandi');
    expect(sonra.dogrulayanId).toBe(kullaniciId);
    expect(await db.aktiviteKaydi.count({
      where: { varlikId: kokenId, eylem: 'dogrulama_dusuruldu' } })).toBe(0);
    // kozmetik güncelleme yine de uygulanmış olmalı (davranış bozulmadı)
    expect((await db.varlik.findUniqueOrThrow({ where: { id: v.id } })).rafOda).toBe('B-42');
  });
});

describe('Doğrulama eylemi — insan işi, gerekçeli', () => {
  async function kokenAc(etiket: string, kaynakKayitId: string) {
    const v = await varlikAc(etiket);
    await kokenYaz({ varlikTipi: 'Varlik', varlikId: v.id,
      kaynakSistem: 'cmdb-x', kaynakKayitId });
    return (await kokenleriGetir('Varlik', v.id))[0].id;
  }

  it('gerekçesiz doğrulama REDDEDİLİR ve kayıt değişmez', async () => {
    const kokenId = await kokenAc('KOKEN-GEREKCESIZ-1', 'ci-gerekcesiz-1');

    const bos = await kokenDogrulaEylem({ kokenId, sonuc: 'dogrulandi', gerekce: '   ' });
    expect(bos.ok).toBe(false);
    const yok = await kokenDogrulaEylem({ kokenId, sonuc: 'dogrulandi' });
    expect(yok.ok).toBe(false);
    if (!yok.ok) expect(yok.hata).toMatch(/Gerekçe/i);

    expect((await db.veriKokeni.findUniqueOrThrow({ where: { id: kokenId } })).dogrulamaDurumu)
      .toBe('dogrulanmadi');
  });

  it('gerekçeli doğrulama kökeni doğrulanmış yapar, doğrulayanı ve izi yazar', async () => {
    const kokenId = await kokenAc('KOKEN-DOGRU-1', 'ci-dogru-1');

    const sonuc = await kokenDogrulaEylem({ kokenId, sonuc: 'dogrulandi',
      gerekce: 'Saha envanteriyle karşılaştırıldı, seri numarası eşleşti.' });
    expect(sonuc).toEqual({ ok: true });

    const koken = await db.veriKokeni.findUniqueOrThrow({ where: { id: kokenId } });
    expect(koken.dogrulamaDurumu).toBe('dogrulandi');
    expect(koken.kokenTipi).toBe('dogrulanmis');
    expect(koken.dogrulayanId).toBe(kullaniciId); // motor değil, gerçek kullanıcı
    expect(koken.dogrulamaZamani).not.toBeNull();

    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'VeriKokeni', varlikId: kokenId, eylem: 'onay' } });
    expect(iz.aktorId).toBe(kullaniciId);
    expect(iz.gerekce).toContain('seri numarası eşleşti');
  });

  it('reddedilen köken silinmez, "reddedildi" olarak durur ve otomatik gibi gösterilmez', async () => {
    const kokenId = await kokenAc('KOKEN-RED-1', 'ci-red-1');
    expect(await kokenDogrulaEylem({ kokenId, sonuc: 'reddedildi',
      gerekce: 'Kaynak sistem yanlış tesise yazmış.' })).toEqual({ ok: true });

    const koken = await db.veriKokeni.findUniqueOrThrow({ where: { id: kokenId } });
    expect(koken.dogrulamaDurumu).toBe('reddedildi');
    expect(metin(KokenRozeti({ koken: { kokenTipi: 'otomatik', kaynakSistem: 'cmdb-x',
      guven: null, dogrulamaDurumu: 'reddedildi' } }))).toContain('REDDEDİLDİ');
  });

  it('geçersiz sonuç değeri kabul edilmez', async () => {
    const kokenId = await kokenAc('KOKEN-GECERSIZ-1', 'ci-gecersiz-1');
    const sonuc = await kokenDogrulaEylem({ kokenId, sonuc: 'belki', gerekce: 'deneme' });
    expect(sonuc.ok).toBe(false);
  });

  it('oturum yoksa doğrulama yapılamaz — motor kendi verisini doğrulayamaz', async () => {
    const kokenId = await kokenAc('KOKEN-OTURUMSUZ-1', 'ci-oturumsuz-1');
    const eski = oturum.token;
    oturum.token = null;
    try {
      const sonuc = await kokenDogrulaEylem({ kokenId, sonuc: 'dogrulandi', gerekce: 'motor' });
      expect(sonuc.ok).toBe(false);
    } finally { oturum.token = eski; }
    expect((await db.veriKokeni.findUniqueOrThrow({ where: { id: kokenId } })).dogrulamaDurumu)
      .toBe('dogrulanmadi');
  });
});

describe('Toplu doğrulama — her kayıt için AYRI iz', () => {
  it('üç kayıt doğrulanır, üç ayrı denetim satırı düşer', async () => {
    const idler: string[] = [];
    for (const n of [1, 2, 3]) {
      const v = await varlikAc(`KOKEN-TOPLU-${n}`);
      await kokenYaz({ varlikTipi: 'Varlik', varlikId: v.id,
        kaynakSistem: 'cmdb-x', kaynakKayitId: `ci-toplu-${n}` });
      idler.push((await kokenleriGetir('Varlik', v.id))[0].id);
    }

    const sonuc = await kokenTopluDogrula({ kokenIdler: idler, sonuc: 'dogrulandi',
      gerekce: 'Yıllık envanter sayımında hepsi yerinde görüldü.' });
    expect(sonuc).toEqual({ ok: true });

    for (const id of idler) {
      const koken = await db.veriKokeni.findUniqueOrThrow({ where: { id } });
      expect(koken.dogrulamaDurumu).toBe('dogrulandi');
      expect(koken.dogrulayanId).toBe(kullaniciId);
      // tek satırlık toplu iz YOK: her köken kendi satırını aldı
      expect(await db.aktiviteKaydi.count({
        where: { varlikTipi: 'VeriKokeni', varlikId: id, eylem: 'onay' } })).toBe(1);
    }
  });

  it('gerekçesiz toplu doğrulama hiçbir kaydı değiştirmez', async () => {
    const v = await varlikAc('KOKEN-TOPLU-GEREKCESIZ');
    await kokenYaz({ varlikTipi: 'Varlik', varlikId: v.id,
      kaynakSistem: 'cmdb-x', kaynakKayitId: 'ci-toplu-gerekcesiz' });
    const kokenId = (await kokenleriGetir('Varlik', v.id))[0].id;

    expect((await kokenTopluDogrula({ kokenIdler: [kokenId], sonuc: 'dogrulandi' })).ok).toBe(false);
    expect((await db.veriKokeni.findUniqueOrThrow({ where: { id: kokenId } })).dogrulamaDurumu)
      .toBe('dogrulanmadi');
  });

  it('listedeki bir kayıt geçersizse HİÇBİRİ yazılmaz (yarım toplu onay yok)', async () => {
    const v = await varlikAc('KOKEN-TOPLU-YARIM');
    await kokenYaz({ varlikTipi: 'Varlik', varlikId: v.id,
      kaynakSistem: 'cmdb-x', kaynakKayitId: 'ci-toplu-yarim' });
    const kokenId = (await kokenleriGetir('Varlik', v.id))[0].id;

    const sonuc = await kokenTopluDogrula({
      kokenIdler: [kokenId, 'olmayan-koken-id'], sonuc: 'dogrulandi',
      gerekce: 'Sayım listesi' });
    expect(sonuc.ok).toBe(false);
    expect((await db.veriKokeni.findUniqueOrThrow({ where: { id: kokenId } })).dogrulamaDurumu)
      .toBe('dogrulanmadi');
  });
});

describe('Raporlama — kapsam ve bayatlık', () => {
  it('doğrulama bekleyenler en uzun bekleyen başta gelir ve limite saygı duyar', async () => {
    const { satirlar, toplam } = await dogrulanmamisKayitlar('Varlik', 3);
    expect(satirlar.length).toBeLessThanOrEqual(3);
    expect(toplam).toBeGreaterThanOrEqual(satirlar.length);
    for (const s of satirlar) expect(s.bekleyenGun).toBeGreaterThanOrEqual(0);
    const zamanlar = satirlar.map((s) => s.aktarim.getTime());
    expect([...zamanlar].sort((a, b) => a - b)).toEqual(zamanlar);
  });

  it('tesisIdler = [] hiçbir kayıt döndürmez; kapsam dışı tesis süzülür', async () => {
    const bos = await dogrulanmamisKayitlar('Varlik', 50, { tesisIdler: [] });
    expect(bos.satirlar).toHaveLength(0);

    const kendi = await dogrulanmamisKayitlar('Varlik', 50, { tesisIdler: [tesisId] });
    expect(kendi.satirlar.length).toBeGreaterThan(0);

    const baska = await dogrulanmamisKayitlar('Varlik', 50, { tesisIdler: ['olmayan-tesis'] });
    expect(baska.satirlar).toHaveLength(0);
  });

  it('kapsanamayan varlık tipi sessizce yutulmaz, notta raporlanır', async () => {
    const rapor = await kokenSayimlari({ tesisIdler: [tesisId] });
    expect(rapor.not.kapsanamayanTipler).toContain('Zafiyet');
  });

  it('bayat köken eşiği pozitif olmalı; eski aktarım bayat sayılır', async () => {
    await expect(bayatKokenler(0)).rejects.toThrow(/pozitif/);

    const v = await varlikAc('KOKEN-BAYAT-1');
    await kokenYaz({ varlikTipi: 'Varlik', varlikId: v.id,
      kaynakSistem: 'eski-kaynak', kaynakKayitId: 'ci-bayat-1' });
    const kokenId = (await kokenleriGetir('Varlik', v.id))[0].id;
    await db.veriKokeni.update({ where: { id: kokenId },
      data: { aktarim: new Date(Date.now() - 90 * 86_400_000) } });

    const bayat = await bayatKokenler(30);
    const satir = bayat.satirlar.find((s) => s.kokenId === kokenId);
    expect(satir).toBeDefined();
    expect(satir!.gecenGun).toBeGreaterThanOrEqual(89);
    expect((await bayatKokenler(365)).satirlar.find((s) => s.kokenId === kokenId)).toBeUndefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   /saglik KÖKEN BÖLÜMÜ — değişmez: KAYNAK BAĞLAMI OLMAYAN KAYIT
   'DOĞRULANMIŞ' GÖRÜNEMEZ; kökeni olmayan kayıt GİZLENMEZ.
   ═══════════════════════════════════════════════════════════════════════ */

/** Ekran satırı fabrikası — alanların hepsi açıkça verilir. */
function sayim(ozel: Partial<KokenSayimSatiri> = {}): KokenSayimSatiri {
  return {
    varlikTipi: 'Varlik', manuel: 0, otomatik: 0, dogrulanmis: 0,
    reddedildi: 0, kokenli: 0, toplam: 0, ...ozel,
  };
}

describe('Kökeni olmayan kayıt "doğrulanmış" görünemez', () => {
  it('köken kaydı olmayan bir kayıt için rozet ASLA "DOĞRULANMIŞ" demez', () => {
    for (const koken of [null, undefined]) {
      const g = kokenGorunumu(koken);
      expect(g.etiket).toBe('ELLE GİRİLDİ');
      expect(g.etiket).not.toBe('DOĞRULANMIŞ');
      expect(g.kaynak).toBeNull();
      expect(metin(KokenRozeti({ koken }))).not.toContain('DOĞRULANMIŞ');
    }
  });

  it('kökeni olmayan kayıt taşıyan satır hiçbir koşulda "ok" işaretlenmez', () => {
    // Kaydın tamamı doğrulanmış olsa BİLE, kökensiz kayıt varsa satır `unk`.
    const s = sayim({ manuel: 1, dogrulanmis: 99, kokenli: 99, toplam: 100 });
    expect(S.kokensizVar(s)).toBe(true);
    expect(S.kokenImi(s)).toBe('unk');
    expect(S.kokenImi(s)).not.toBe('ok');
    expect(S.kokenSozu(s)).toMatch(/Kaynak bağlamı olmayan/);
    expect(S.kokenCumlesi(s)).toMatch(/hiçbir koşulda "doğrulanmış" görünmez/);
  });

  it('yalnız kökenli ve doğrulanmış satır "ok" olabilir', () => {
    const temiz = sayim({ manuel: 0, dogrulanmis: 12, kokenli: 12, toplam: 12 });
    expect(S.kokenImi(temiz)).toBe('ok');
    // Tek bir kökensiz kayıt eklemek satırı derhal `unk` yapar.
    expect(S.kokenImi({ ...temiz, manuel: 1, toplam: 13 })).toBe('unk');
  });

  it('kökeni olmayan kayıt GİZLENMEZ: satırı kuyruğa toplanamaz', () => {
    const kokensiz = sayim({ manuel: 3, dogrulanmis: 5, kokenli: 5, toplam: 8 });
    expect(S.kokenToplanabilir(kokensiz)).toBe(false);

    /* Yoğunluk bütçesi doldurulmuş olsa bile kökensiz satır görünür kalır:
       `bolumle` yalnız toplanabilir satırları kuyruğa indirir. */
    const doluDoğrulanmis = Array.from({ length: 12 }, (_, i) =>
      sayim({ varlikTipi: `Temiz${i}`, dogrulanmis: 1, kokenli: 1, toplam: 1 }));
    const bolum = S.bolumle(
      S.kokenSirala([...doluDoğrulanmis, kokensiz]), S.kokenToplanabilir, false);
    expect(bolum.gorunur).toContain(kokensiz);
    expect(bolum.toplanan).not.toContain(kokensiz);
  });

  it('kayıt evreni bilinmiyorsa SIFIR yazılmaz', () => {
    const bilinmeyen = sayim({ manuel: null, toplam: null, otomatik: 2, kokenli: 2 });
    expect(S.kokensizYazisi(bilinmeyen)).toBe('bilinmiyor');
    expect(S.kokensizYazisi(bilinmeyen)).not.toBe('0');
    expect(S.kokensizVar(bilinmeyen)).toBe(true);
    expect(S.kokensizYazisi(sayim({ manuel: 0 }))).toBe('0');
  });

  it('reddedilmiş köken "otomatik" gibi gösterilmez ve satırı kritik yapar', () => {
    const s = sayim({ reddedildi: 2, dogrulanmis: 4, kokenli: 6, toplam: 6 });
    expect(S.kokenImi(s)).toBe('bd');
    expect(S.kokenToplanabilir(s)).toBe(false);
  });
});

describe('Köken bölümü — gerçek kayıt üstünde (izole DB kopyası)', () => {
  it('kökensiz açılan varlık ekranda "kökeni yok" olarak sayılır, '
    + '"doğrulanmış" kovasına GİRMEZ', async () => {
    const once = (await kokenSayimlari()).satirlar.find((x) => x.varlikTipi === 'Varlik')!;
    await varlikAc('SAGLIK-KOKENSIZ-1');
    const sonra = (await kokenSayimlari()).satirlar.find((x) => x.varlikTipi === 'Varlik')!;

    expect(sonra.manuel).toBe(once.manuel! + 1);
    expect(sonra.dogrulanmis).toBe(once.dogrulanmis);
    expect(sonra.otomatik).toBe(once.otomatik);

    // Ekran satırı: kökensiz kayıt var → `unk`, kuyruğa inmez, sayısı yazılır.
    const satir: KokenSayimSatiri = {
      varlikTipi: sonra.varlikTipi, manuel: sonra.manuel, otomatik: sonra.otomatik,
      dogrulanmis: sonra.dogrulanmis, reddedildi: sonra.reddedildi,
      kokenli: sonra.kokenli, toplam: sonra.toplam,
    };
    expect(S.kokenImi(satir)).not.toBe('ok');
    expect(S.kokenToplanabilir(satir)).toBe(false);
    expect(S.kokensizYazisi(satir)).toBe(String(sonra.manuel));
  });

  it('doğrulama insanın işidir: seçim ya da gerekçe yoksa düğme açılmaz', () => {
    expect(S.dogrulamaPasif([], 'gerekçe', true, false)).toBe(true);
    expect(S.dogrulamaPasif(['k1'], '   ', true, false)).toBe(true);
    expect(S.dogrulamaPasif(['k1'], 'gerekçe', false, false)).toBe(true);
    expect(S.dogrulamaPasif(['k1'], 'gerekçe', true, true)).toBe(true);
    expect(S.dogrulamaPasif(['k1'], 'gerekçe', true, false)).toBe(false);
  });

  it('ölçülmemiş ortalama güven "%0" yazılmaz', () => {
    expect(S.ortalamaGuvenYazisi(null)).toBe('ölçülmedi');
    expect(S.ortalamaGuvenYazisi(0)).toBe('%0');
    expect(S.ortalamaGuvenYazisi(null)).not.toBe(S.ortalamaGuvenYazisi(0));
  });

  it('bayat köken kaynağı HATA değil, güncelliği BİLİNMEYEN sayılır', () => {
    const kaynak: KaynakSatiri = {
      kaynakSistem: 'k', kayit: 5, dogrulanmis: 5, dogrulanmadi: 0, reddedildi: 0,
      guveniOlculen: 5, guveniOlculmemis: 0, ortalamaGuven: 0.9,
      sonAktarim: new Date().toISOString(), bayat: 3,
    };
    expect(S.kaynakImi(kaynak)).toBe('unk');
    expect(S.kaynakImi({ ...kaynak, bayat: 0 })).toBe('ok');
    expect(S.kaynakImi({ ...kaynak, dogrulanmadi: 1 })).toBe('md');
    expect(S.kaynakImi({ ...kaynak, reddedildi: 1 })).toBe('bd');
  });
});
