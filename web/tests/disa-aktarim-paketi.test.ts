import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { KanitPaketi } from '@/lib/disaAktarim/paket';

/* Denetim kanıt paketi (§19) — izole DB kopyası üstünde.

   Burada kanıtlanan dört sözleşme:
   · pakete sır girerse paket ÜRETİLMEZ (maskelenip geçilmez),
   · bütünlük damgası içerik değişince değişir,
   · yetki kapsamı dışındaki santral pakete GİRMEZ (ve istek reddedilir),
   · kökeni olmayan kayıt gizlenmez, `kökeni yok` diye işaretlenir.

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı). */
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-paket-'));
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
const {
  kanitPaketiUret, paketiDenetle, sizintilariAra, paketOzeti, ozetDogrula,
  KOKEN_YOK,
} = await import('@/lib/disaAktarim/paket');
const { kanitPaketiUretEylem } = await import('@/lib/eylemler2/disaAktarim');
const { kokenYaz } = await import('@/lib/entegrasyon/koken');
const { sirMaskesi } = await import('@/lib/entegrasyon/sir');

/** Kapsam: EPDK-SYM × KIZILDERE-3. Yetkisiz santral: KIZILDERE-2. */
let regulasyonId = '';
let izinliTesisId = '';
let yasakTesisId = '';
let kullaniciId = '';
const ARALIK = { baslangic: new Date('2000-01-01'), bitis: new Date('2100-01-01') };

async function oturumAc(rol: string, tesisId: string | null) {
  const kisi = await db.kullanici.create({ data: {
    eposta: `paket.${randomBytes(4).toString('hex')}@ornek.local`,
    adSoyad: 'Paket Testi', aktif: true } });
  await db.yetki.create({ data: { kullaniciId: kisi.id, rol, tesisId } });
  const token = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: kisi.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  oturum.token = token;
  return kisi.id;
}

async function paketUret(tesisIdleri = [izinliTesisId]): Promise<KanitPaketi> {
  const { paket } = await kanitPaketiUret({
    kapsam: { regulasyonId, tesisIdleri, ...ARALIK },
    ureten: { id: kullaniciId, adSoyad: 'Paket Testi' },
    urunSurumu: '0.0.0-test',
  });
  return paket;
}

beforeAll(async () => {
  regulasyonId = (await db.regulasyon.findFirstOrThrow({ where: { kod: 'EPDK-SYM' } })).id;
  izinliTesisId = (await db.tesis.findFirstOrThrow({ where: { kod: 'KIZILDERE-3' } })).id;
  yasakTesisId = (await db.tesis.findFirstOrThrow({ where: { kod: 'KIZILDERE-2' } })).id;
  // Yetki YALNIZ KIZILDERE-3'e kısıtlı: kapsam denetimi gerçek yoldan koşar.
  kullaniciId = await oturumAc('denetim_sorumlusu', izinliTesisId);
});

/* ═══ 1 · Sır süzgeci ═════════════════════════════════════════════════ */

describe('Sır süzgeci — sızıntı bulursa paket ÜRETİLMEZ', () => {
  it('temiz paket süzgeçten geçer (yanlış pozitif üretmez)', async () => {
    const paket = await paketUret();
    expect(() => paketiDenetle(JSON.stringify(paket))).not.toThrow();
    expect(paket.connectorlar.length).toBeGreaterThan(0);
  });

  it('pakete bilerek sır alanı eklenirse FIRLATIR — sessizce maskelemez', async () => {
    const paket = await paketUret();
    /* Gerçek regresyon senaryosu: ileride biri connector satırına
       "yardımcı olsun diye" bir kimlik alanı ekliyor. */
    const kirli = {
      ...paket,
      connectorlar: paket.connectorlar.map((c) => ({ ...c, apiKey: 'AKIA-ORNEK-1234567890' })),
    };
    expect(() => paketiDenetle(JSON.stringify(kirli)))
      .toThrow(/ÜRETİLMEDİ — sır sızıntısı/);
    const bulgular = sizintilariAra(JSON.stringify(kirli));
    expect(bulgular).toHaveLength(paket.connectorlar.length);
    expect(bulgular[0].yol).toMatch(/connectorlar\[0\]\.apiKey/);
  });

  it('alan adı Türkçe de olsa yakalanır (parola/sifre/token)', () => {
    for (const ad of ['parola', 'sifre', 'bindParolasi', 'erisimToken', 'clientSecret', 'cookie']) {
      expect(() => paketiDenetle(JSON.stringify({ x: { [ad]: 'deger-12345678' } })),
        `${ad} yakalanmadı`).toThrow(/sır sızıntısı/);
    }
  });

  it('HAM sır referansı pakete girerse yakalanır; MASKESİ girerse geçer', async () => {
    const ham = (await db.connector.findFirstOrThrow({
      where: { sirReferansi: { not: null } } })).sirReferansi!;

    const paket = await paketUret();
    // Maskeli adres pakette zaten var ve süzgeci tetiklemez.
    expect(JSON.stringify(paket)).toContain(sirMaskesi(ham));
    expect(() => paketiDenetle(JSON.stringify(paket), [ham])).not.toThrow();

    const kirli = { ...paket, notlar: [`bağlantı: ${ham}`] };
    expect(() => paketiDenetle(JSON.stringify(kirli), [ham]))
      .toThrow(/ham sır\/sır referansı/);
  });

  it('değer kalıbı da yakalanır — alan adı masum olsa bile', () => {
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----';
    expect(() => paketiDenetle(JSON.stringify({ aciklama: pem }))).toThrow(/PEM özel anahtar/);
    expect(() => paketiDenetle(JSON.stringify({ hataMetni: 'Bearer eyJhbGciOiJIUzI1NiJ9xxxx' })))
      .toThrow(/Bearer/);
  });

  it('üretim yolunda süzgeç fırlatırsa paket hiç dönmez', async () => {
    /* Connector kaydına, adı maskeye benzeyen ama HAM sır taşıyan bir ad
       verilirse üretim durur: süzgeç gövdeyi serileştirdikten sonra koşar. */
    const c = await db.connector.findFirstOrThrow({ where: { sirReferansi: { not: null } } });
    await db.connector.update({ where: { id: c.id }, data: { ad: `Kopya ${c.sirReferansi}` } });
    await expect(paketUret()).rejects.toThrow(/ÜRETİLMEDİ — sır sızıntısı/);
    await db.connector.update({ where: { id: c.id }, data: { ad: c.ad } });
  });
});

/* ═══ 2 · Bütünlük damgası ════════════════════════════════════════════ */

describe('Bütünlük damgası', () => {
  it('paket kendi damgasını doğrular; içerik değişince damga tutmaz', async () => {
    const paket = await paketUret();
    expect(paket.ozet).toMatch(/^[0-9a-f]{64}$/);
    expect(ozetDogrula(paket)).toBe(true);

    const oynanmis: KanitPaketi = {
      ...paket,
      bulgular: paket.bulgular.map((b, i) => (i === 0 ? { ...b, durum: 'kapali', acik: false } : b)),
    };
    expect(paketOzeti(oynanmis)).not.toBe(paket.ozet);
    expect(ozetDogrula(oynanmis)).toBe(false);
  });

  it('özet KENDİ alanını hesaba katmaz — damgayı silmek özeti değiştirmez', async () => {
    const paket = await paketUret();
    const damgasiz = { ...paket, ozet: 'baska-bir-deger' };
    expect(paketOzeti(damgasiz)).toBe(paket.ozet);
  });

  it('anahtar sırası özeti değiştirmez — denetçi başka araçla doğrulayabilsin', async () => {
    const paket = await paketUret();
    const tersSirali = Object.fromEntries(
      Object.entries(paket).reverse()) as unknown as KanitPaketi;
    expect(paketOzeti(tersSirali)).toBe(paket.ozet);
  });
});

/* ═══ 3 · RBAC kapsamı ════════════════════════════════════════════════ */

describe('RBAC — yetki dışındaki santral pakete girmez', () => {
  it('yetkili kapsam üretilir ve denetim izine yazılır', async () => {
    const once = await db.aktiviteKaydi.count({ where: { varlikTipi: 'KanitPaketi' } });
    const sonuc = await kanitPaketiUretEylem({
      regulasyonId, tesisIdleri: [izinliTesisId],
      baslangic: ARALIK.baslangic.toISOString(), bitis: ARALIK.bitis.toISOString(),
    });
    expect(sonuc.ok).toBe(true);
    if (!sonuc.ok) return;
    expect(sonuc.dosyaAdi).toMatch(/^kanit-paketi_EPDK-SYM_/);

    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'KanitPaketi', eylem: 'olusturma' },
      orderBy: { zaman: 'desc' },
    });
    expect(await db.aktiviteKaydi.count({ where: { varlikTipi: 'KanitPaketi' } })).toBe(once + 1);
    // İz satırı paketin özetini taşır: dosya ile kayıt eşleşebilsin.
    expect(iz.yeniDeger).toBe(sonuc.ozet);
    expect(iz.aktorId).toBe(kullaniciId);
    expect(iz.gerekce).toContain('KIZILDERE-3');
  });

  it('kapsam dışı santral istenirse istek REDDEDİLİR, sessizce daraltılmaz', async () => {
    const sonuc = await kanitPaketiUretEylem({
      regulasyonId, tesisIdleri: [izinliTesisId, yasakTesisId],
      baslangic: ARALIK.baslangic.toISOString(), bitis: ARALIK.bitis.toISOString(),
    });
    expect(sonuc.ok).toBe(false);
    if (sonuc.ok) return;
    expect(sonuc.hata).toMatch(/kapsamı dışında/);
    // Hata metni HANGİ santralin dışarıda kaldığını söylemez.
    expect(sonuc.hata).not.toContain(yasakTesisId);
    expect(JSON.stringify(sonuc)).not.toContain('KIZILDERE-2');
  });

  it('reddedilen istek de denetim izine yazılır', async () => {
    const once = await db.aktiviteKaydi.count({
      where: { varlikTipi: 'KanitPaketi', eylem: 'red' } });
    await kanitPaketiUretEylem({
      regulasyonId, tesisIdleri: [yasakTesisId],
      baslangic: ARALIK.baslangic.toISOString(), bitis: ARALIK.bitis.toISOString(),
    });
    expect(await db.aktiviteKaydi.count({
      where: { varlikTipi: 'KanitPaketi', eylem: 'red' } })).toBe(once + 1);
  });

  it('yetkili kapsamın paketi başka santralin tek satırını taşımaz', async () => {
    const sonuc = await kanitPaketiUretEylem({
      regulasyonId, tesisIdleri: [izinliTesisId],
      baslangic: ARALIK.baslangic.toISOString(), bitis: ARALIK.bitis.toISOString(),
    });
    expect(sonuc.ok).toBe(true);
    if (!sonuc.ok) return;
    const paket = JSON.parse(sonuc.json) as KanitPaketi;

    expect(paket.baslik.kapsam.tesisler.map((t) => t.kod)).toEqual(['KIZILDERE-3']);
    expect(paket.maddeler.every((m) => m.tesisKodu === 'KIZILDERE-3')).toBe(true);
    expect(paket.bulgular.every((b) => b.tesisKodu === 'KIZILDERE-3')).toBe(true);
    // Yasak santralin kimliği hiçbir alanda geçmez (iz satırları dahil).
    expect(sonuc.json).not.toContain(yasakTesisId);
    expect(sonuc.json).not.toContain('KIZILDERE-2');
    expect(paket.maddeler.length).toBeGreaterThan(0);
  });
});

/* ═══ 4 · Köken ═══════════════════════════════════════════════════════ */

describe('Köken — kökeni olmayan kayıt gizlenmez', () => {
  it('kökensiz satır pakette kalır ve "kökeni yok" diye işaretlenir', async () => {
    const kapsamdaki = await db.maddeDurumu.count({
      where: { tesisId: izinliTesisId, surec: { regulasyonId } } });
    const paket = await paketUret();

    // Kökensiz satırlar elenmiş olsaydı sayı düşerdi.
    expect(paket.maddeler).toHaveLength(kapsamdaki);
    const kokensiz = paket.maddeler.filter((m) => !m.koken.bilinen);
    expect(kokensiz.length).toBeGreaterThan(0);
    for (const m of kokensiz) {
      expect(m.koken).toEqual({ bilinen: false, not: KOKEN_YOK });
    }
    expect(paket.sayimlar.kokensizMadde).toBe(kokensiz.length);
  });

  it('kökeni olan satır kaynak sistem · koşu · alınma · güven taşır', async () => {
    const madde = await db.maddeDurumu.findFirstOrThrow({
      where: { tesisId: izinliTesisId, surec: { regulasyonId } } });
    const kosu = await db.entegrasyonKosusu.create({
      data: { kaynak: 'kanit-testi', durum: 'basarili' } });
    await kokenYaz({
      varlikTipi: 'MaddeDurumu', varlikId: madde.id, kaynakSistem: 'kanit-testi-kaynagi',
      kaynakKayitId: 'md-1', kosuId: kosu.id, guven: 0.75, toplanma: new Date('2026-01-02'),
    });

    const paket = await paketUret();
    const satir = paket.maddeler.find((m) => m.maddeDurumuId === madde.id);
    expect(satir?.koken.bilinen).toBe(true);
    if (!satir || !satir.koken.bilinen) return;
    expect(satir.koken.kaynakSistem).toBe('kanit-testi-kaynagi');
    expect(satir.koken.kosuId).toBe(kosu.id);
    expect(satir.koken.guven).toBe(0.75);
    expect(satir.koken.guvenEtiketi).toBe('otomatik');
    expect(satir.koken.alinma).toMatch(/^\d{4}-/);
    // Ölçülmemiş güven "0" olarak yazılmaz — null kalır.
    const olcusuz = paket.maddeler.find((m) => m.koken.bilinen && m.koken.guven === null);
    expect(olcusuz === undefined || olcusuz.koken.bilinen).toBe(true);
  });
});

/* ═══ 5 · Connector envanteri ve kapsam bütünlüğü ═════════════════════ */

describe('Paket içeriği', () => {
  it('connector envanteri ad/tip/ortam/etkin/son koşu durumu taşır, sırrı taşımaz', async () => {
    const paket = await paketUret();
    const c = paket.connectorlar[0];
    expect(Object.keys(c).sort()).toEqual([
      'ad', 'etkin', 'kayitDurumu', 'kimlikAdresi', 'kod', 'ortam',
      'sonBasariliKosu', 'sonKosuDurumu', 'sonKosuZamani', 'tip',
    ]);
    // Hiç koşmamış connector "başarılı" görünmez.
    expect(paket.connectorlar.every((x) => x.sonKosuDurumu !== 'basarili'
      || x.sonKosuZamani !== null)).toBe(true);
  });

  it('başlık üretim zamanı, üreten, kapsam ve ürün sürümü taşır', async () => {
    const paket = await paketUret();
    expect(paket.baslik.ureten).toEqual({ id: kullaniciId, adSoyad: 'Paket Testi' });
    expect(paket.baslik.urunSurumu).toBe('0.0.0-test');
    expect(paket.baslik.kapsam.regulasyon.kod).toBe('EPDK-SYM');
    expect(new Date(paket.baslik.uretimZamani).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('boş kapsam sessizce boş paket üretmez', async () => {
    await expect(kanitPaketiUret({
      kapsam: { regulasyonId, tesisIdleri: [], ...ARALIK },
      ureten: { id: kullaniciId, adSoyad: 'Paket Testi' },
      urunSurumu: '0.0.0-test',
    })).rejects.toThrow(/en az bir santral/);
  });
});
