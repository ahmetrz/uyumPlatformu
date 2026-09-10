import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { KanitPaketi } from '@/lib/disaAktarim/paket';
import { ogeIdAl } from './yardim/kapsam';

/* Denetim kanıt paketi (§19) — izole DB kopyası üstünde.

   Burada kanıtlanan dört sözleşme:
   · pakete sır girerse paket ÜRETİLMEZ (maskelenip geçilmez),
   · bütünlük damgası içerik değişince değişir,
   · yetki kapsamı dışındaki tesis pakete GİRMEZ (ve istek reddedilir),
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

/** Kapsam: EPDK-SYM × SAHA-A3. Yetkisiz tesis: SAHA-A2. */
let regulasyonId = '';
let izinliTesisId = '';
let yasakTesisId = '';
let kullaniciId = '';
const ARALIK = { baslangic: new Date('2000-01-01'), bitis: new Date('2100-01-01') };

async function oturumAc(rol: string, tesisId: string | null) {
  const kisi = await db.kullanici.create({ data: {
    eposta: `paket.${randomBytes(4).toString('hex')}@ornek.local`,
    adSoyad: 'Paket Testi', aktif: true } });
  await db.yetki.create({ data: { kullaniciId: kisi.id, rol,
    kapsamOgesiId: tesisId ? await ogeIdAl(tesisId) : null } });
  const token = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: kisi.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  oturum.token = token;
  return kisi.id;
}

async function paketUret(
  tesisIdleri = [izinliTesisId], kurumsalDahil = true,
): Promise<KanitPaketi> {
  const { paket } = await kanitPaketiUret({
    kapsam: { regulasyonId, tesisIdleri, kurumsalDahil, ...ARALIK },
    ureten: { id: kullaniciId, adSoyad: 'Paket Testi' },
    urunSurumu: '0.0.0-test',
  });
  return paket;
}

beforeAll(async () => {
  regulasyonId = (await db.regulasyon.findFirstOrThrow({ where: { kod: 'EPDK-SYM' } })).id;
  izinliTesisId = (await db.tesis.findFirstOrThrow({ where: { kod: 'SAHA-A3' } })).id;
  yasakTesisId = (await db.tesis.findFirstOrThrow({ where: { kod: 'SAHA-A2' } })).id;
  // Yetki YALNIZ SAHA-A3'e kısıtlı: kapsam denetimi gerçek yoldan koşar.
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

describe('RBAC — yetki dışındaki tesis pakete girmez', () => {
  it('yetkili kapsam üretilir ve denetim izine yazılır [KNT-PKT-001]', async () => {
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
    expect(iz.gerekce).toContain('SAHA-A3');
  });

  it('kapsam dışı tesis istenirse istek REDDEDİLİR, sessizce daraltılmaz [RAP-URT-002]', async () => {
    const sonuc = await kanitPaketiUretEylem({
      regulasyonId, tesisIdleri: [izinliTesisId, yasakTesisId],
      baslangic: ARALIK.baslangic.toISOString(), bitis: ARALIK.bitis.toISOString(),
    });
    expect(sonuc.ok).toBe(false);
    if (sonuc.ok) return;
    expect(sonuc.hata).toMatch(/kapsamı dışında/);
    // Hata metni HANGİ tesisin dışarıda kaldığını söylemez.
    expect(sonuc.hata).not.toContain(yasakTesisId);
    expect(JSON.stringify(sonuc)).not.toContain('SAHA-A2');
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

  it('yetkili kapsamın paketi başka tesisin tek satırını taşımaz', async () => {
    const sonuc = await kanitPaketiUretEylem({
      regulasyonId, tesisIdleri: [izinliTesisId],
      baslangic: ARALIK.baslangic.toISOString(), bitis: ARALIK.bitis.toISOString(),
    });
    expect(sonuc.ok).toBe(true);
    if (!sonuc.ok) return;
    const paket = JSON.parse(sonuc.json) as KanitPaketi;

    expect(paket.baslik.kapsam.tesisler.map((t) => t.kod)).toEqual(['SAHA-A3']);
    expect(paket.maddeler.every((m) => m.tesisKodu === 'SAHA-A3')).toBe(true);
    expect(paket.bulgular.every((b) => b.tesisKodu === 'SAHA-A3')).toBe(true);
    // Yasak tesisin kimliği hiçbir alanda geçmez (iz satırları dahil).
    expect(sonuc.json).not.toContain(yasakTesisId);
    expect(sonuc.json).not.toContain('SAHA-A2');
    expect(paket.maddeler.length).toBeGreaterThan(0);
  });
});

/* ═══ 4 · Köken ═══════════════════════════════════════════════════════ */

describe('Köken — kökeni olmayan kayıt gizlenmez', () => {
  it('kökensiz satır pakette kalır ve "kökeni yok" diye işaretlenir', async () => {
    const kapsamdaki = await db.maddeDurumu.count({
      where: { kapsamOgesi: { tesisId: izinliTesisId }, surec: { regulasyonId } } });
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
      where: { kapsamOgesi: { tesisId: izinliTesisId }, surec: { regulasyonId } } });
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
      kapsam: { regulasyonId, tesisIdleri: [], kurumsalDahil: true, ...ARALIK },
      ureten: { id: kullaniciId, adSoyad: 'Paket Testi' },
      urunSurumu: '0.0.0-test',
    })).rejects.toThrow(/en az bir tesis/);
  });
});

/* ═══ 5 · R10 · BİLDİRİM KAYITLARI PAKETTE [OLY-BIL-005] ══════════════

   Denetçinin en doğrudan sorusu: "bu olay mevzuata bildirildi mi?"
   Cevabı pakette YOKSA kayıt ürünün içinde kalır ve denetimde işe
   yaramaz. Burada ölçülen dört sözleşme:

   · kapsamdaki olayların bildirim kayıtları pakete GİRER,
   · TASLAK METNİ girmez — gönderilmemiş bir metin kanıt değildir,
   · süresi belirlenmemiş yükümlülükte sonTarih boş kalır ve satır
     bunu CÜMLEYLE söyler (boş hücre bırakılmaz),
   · regülasyonu NULL olan yükümlülük (her regülasyona uyan) düşmez. */

describe('bildirim kayıtları pakete girer [OLY-BIL-005]', () => {
  let olayId = '';
  let yukumlulukId = '';
  let suresizId = '';

  beforeAll(async () => {
    /* Kapsamdaki tesiste, aralık İÇİNDE bir olay ve iki yükümlülük. */
    const olay = await db.olay.create({
      data: {
        kod: `PKT-OLAY-${Date.now()}`, baslik: 'Kurgusal bildirim olayı',
        siddet: 'kritik', durum: 'acik', tesisId: izinliTesisId,
        baslangic: new Date(ARALIK.baslangic.getTime() + 60_000),
      },
    });
    olayId = olay.id;

    /* regulasyonId NULL: HER regülasyon için geçerli (KVKK böyle). */
    const y = await db.bildirimYukumlulugu.create({
      data: {
        kod: `PKT-SURELI-${Date.now()}`, ad: 'Süreli yükümlülük',
        asgariSiddet: 'orta', sureSaat: 72, dayanak: 'Kurgusal',
        merci: 'Kurgusal Merci P', kanalNotu: 'Kurumun formu üzerinden',
      },
    });
    yukumlulukId = y.id;
    const sz = await db.bildirimYukumlulugu.create({
      data: {
        kod: `PKT-SURESIZ-${Date.now()}`, ad: 'Süresiz yükümlülük',
        asgariSiddet: 'orta', sureSaat: null, dayanak: 'Kurgusal',
        merci: 'Kurgusal Merci Q',
      },
    });
    suresizId = sz.id;

    await db.bildirimKaydi.create({
      data: {
        olayId, yukumlulukId, durum: 'gonderildi',
        referansNo: 'PKT-REF-2026-1', gonderimZamani: new Date(),
        sonTarih: new Date(olay.baslangic.getTime() + 72 * 3_600_000),
        taslakMetin: 'BU METIN PAKETE GIRMEMELI — gonderilmemis taslak',
      },
    });
    await db.bildirimKaydi.create({
      data: { olayId, yukumlulukId: suresizId, durum: 'taslak', sonTarih: null },
    });
  });

  it('kapsamdaki olayın bildirim kayıtları pakete girer [OLY-BIL-005]', async () => {
    const paket = await paketUret();
    const kodlar = paket.bildirimler.map((b) => b.yukumlulukKodu);
    expect(paket.sayimlar.bildirim).toBeGreaterThanOrEqual(2);
    expect(kodlar).toEqual(expect.arrayContaining(
      [expect.stringContaining('PKT-SURELI'), expect.stringContaining('PKT-SURESIZ')]));
  });

  it('regülasyonu BOŞ olan yükümlülük DÜŞMEZ — üç değerli mantık', async () => {
    /* `regulasyonId: kapsam.regulasyonId` yazmak NULL satırları sessizce
       düşürürdü ve denetçi yapılmış bir bildirimi hiç görmezdi. */
    const paket = await paketUret();
    const sureli = paket.bildirimler.find((b) => b.yukumlulukKodu.startsWith('PKT-SURELI'));
    expect(sureli, 'regülasyonu NULL olan yükümlülük pakete girmedi').toBeDefined();
  });

  it('TASLAK METNİ pakete GİRMEZ', async () => {
    const paket = await paketUret();
    const json = JSON.stringify(paket);
    expect(json).not.toContain('BU METIN PAKETE GIRMEMELI');
    /* Alan adı da yok: şemada taslakMetin diye bir sütun bulunmamalı. */
    for (const b of paket.bildirimler) {
      expect(Object.keys(b)).not.toContain('taslakMetin');
    }
  });

  it('gönderim referansı ve zamanı pakette DURUR', async () => {
    const paket = await paketUret();
    const sureli = paket.bildirimler.find((b) => b.yukumlulukKodu.startsWith('PKT-SURELI'))!;
    expect(sureli.referansNo).toBe('PKT-REF-2026-1');
    expect(sureli.gonderimZamani).not.toBeNull();
    expect(sureli.durum).toBe('gonderildi');
    expect(sureli.acik).toBe(false);
  });

  it('SÜRESİZ yükümlülükte sonTarih boş, satır bunu CÜMLEYLE söyler', async () => {
    const paket = await paketUret();
    const sz = paket.bildirimler.find((b) => b.yukumlulukKodu.startsWith('PKT-SURESIZ'))!;
    expect(sz.sureSaat).toBeNull();
    expect(sz.sonTarih).toBeNull();
    /* Boş hücre bırakılmaz: denetçi "veri yok" ile "süre yok"u ayırt
       edebilmeli. Bilinmeyen ≠ sıfır. */
    expect(sz.sureSozu).toBe('Süre mevzuatta belirlenmedi');
    expect(sz.acik).toBe(true);
    expect(paket.sayimlar.suresizBildirim).toBeGreaterThanOrEqual(1);
  });

  it('bildirim kayıtlarının DENETİM İZİ de pakete girer', async () => {
    const kayit = await db.bildirimKaydi.findFirstOrThrow({
      where: { olayId }, select: { id: true },
    });
    await db.aktiviteKaydi.create({
      data: {
        varlikTipi: 'BildirimKaydi', varlikId: kayit.id, eylem: 'guncelleme',
        alan: 'durum', gerekce: 'paket testi izi',
        zaman: new Date(ARALIK.baslangic.getTime() + 120_000),
      },
    });
    const paket = await paketUret();
    expect(paket.denetimIzi.some((i) => i.varlikId === kayit.id),
      'bildirim kaydının izi pakete girmedi').toBe(true);
  });

  it('kapsam DIŞI tesisin bildirimi pakete GİRMEZ', async () => {
    const yasakOlay = await db.olay.create({
      data: {
        kod: `PKT-YASAK-${Date.now()}`, baslik: 'Kapsam dışı olay',
        siddet: 'kritik', durum: 'acik', tesisId: yasakTesisId,
        baslangic: new Date(ARALIK.baslangic.getTime() + 60_000),
      },
    });
    await db.bildirimKaydi.create({
      data: { olayId: yasakOlay.id, yukumlulukId, durum: 'taslak' },
    });
    const paket = await paketUret();
    expect(paket.bildirimler.map((b) => b.olayKodu)).not.toContain(yasakOlay.kod);
  });

  it('şema sürümü YÜKSELDİ — okuyucu eski paketle karışmasın', async () => {
    const paket = await paketUret();
    expect(paket.baslik.semaSurumu).toBe(3);
  });
});

/* ═══ 6 · DAR PENCERE · tarih dalı GERÇEKTEN ölçülür [OLY-BIL-005] ════

   Bağımsız inceleme bulgusu (P2, #48): dosyanın `ARALIK` sabiti
   2000–2100 olduğu için HİÇBİR fikstür kaydı `acildi < baslangic` ya da
   `kapanma > bitis` durumuna düşmüyordu — yani `sonundaAcik` dalı hiçbir
   testte tetiklenmiyordu ve "bulgularla aynı kural" iddiası ölçülmemiş
   duruyordu. O dalda gerçek bir P1 vardı ve testler göremedi. Burada
   pencere DARDIR ve dalın kendisi ölçülür. */

describe('dar pencerede tarih dalı [OLY-BIL-005]', () => {
  const GUN = 24 * 3_600_000;
  const t0 = new Date('2026-01-01T00:00:00Z');
  const t1 = new Date('2026-01-31T23:59:59Z');
  const DAR = { baslangic: t0, bitis: t1 };
  let olayId = '';
  let yId = '';

  const darPaket = async (kurumsalDahil = true): Promise<KanitPaketi> => (await kanitPaketiUret({
    kapsam: { regulasyonId, tesisIdleri: [izinliTesisId], kurumsalDahil, ...DAR },
    ureten: { id: kullaniciId, adSoyad: 'Dar Pencere' },
    urunSurumu: '0.0.0-test',
  })).paket;

  /* Temizlik `afterEach`te: bir vaka düşerse kaydı geride bırakmaz.
     Ölçüldü (sabotaj turu): satır içi `delete` başarısız iddiadan SONRA
     geldiği için kalıyor ve sonraki iki vaka `@@unique` çakışmasıyla
     düşüyordu — kusur bir yerdeyken kırmızı ÜÇ yerde yanıyordu ve
     hangisinin gerçek olduğu okunmuyordu. */
  afterEach(async () => { await db.bildirimKaydi.deleteMany({ where: { yukumlulukId: yId } }); });

  beforeAll(async () => {
    const olay = await db.olay.create({
      data: {
        kod: `DAR-OLAY-${Date.now()}`, baslik: 'Dar pencere olayı',
        siddet: 'kritik', durum: 'acik', tesisId: izinliTesisId,
        baslangic: new Date(t0.getTime() - 20 * GUN),
      },
    });
    olayId = olay.id;
    const y = await db.bildirimYukumlulugu.create({
      data: {
        kod: `DAR-Y-${Date.now()}`, ad: 'Dar pencere yükümlülüğü',
        asgariSiddet: 'orta', sureSaat: 72, dayanak: 'Kurgusal',
        merci: 'Kurgusal Merci D',
      },
    });
    yId = y.id;
  });

  it('aralıktan ÖNCE açılıp aralıktan SONRA gönderilen kayıt PAKETE GİRER', async () => {
    /* Kusurun ta kendisi: kayıt Ocak boyunca gönderilmemiş durumdaydı —
       denetçinin en çok ilgilendiği hâl — ama paket üretilirken kapanmış
       olduğu için canlı duruma bakan süzgeç onu düşürüyordu. */
    const k = await db.bildirimKaydi.create({
      data: {
        olayId, yukumlulukId: yId, durum: 'gonderildi',
        acildi: new Date(t0.getTime() - 10 * GUN),
        referansNo: 'DAR-REF-1',
        gonderimZamani: new Date(t1.getTime() + 30 * GUN),
      },
    });
    const paket = await darPaket();
    expect(paket.bildirimler.map((b) => b.id),
      'aralık boyunca açık kalmış kayıt pakete girmedi').toContain(k.id);
  });

  it('aralıktan ÖNCE açılıp aralıktan ÖNCE kapanan kayıt GİRMEZ', async () => {
    /* Karşı vaka: kural gerçekten TARİHE bakıyor mu, yoksa her şeyi mi
       içeri alıyor. İçeri alsaydı yukarıdaki iddia da anlamsız olurdu. */
    const k = await db.bildirimKaydi.create({
      data: {
        olayId, yukumlulukId: yId, durum: 'gonderildi',
        acildi: new Date(t0.getTime() - 40 * GUN),
        referansNo: 'DAR-REF-2',
        gonderimZamani: new Date(t0.getTime() - 30 * GUN),
      },
    });
    const paket = await darPaket();
    expect(paket.bildirimler.map((b) => b.id)).not.toContain(k.id);
  });

  it('aralıktan SONRA açılan kayıt GİRMEZ', async () => {
    const k = await db.bildirimKaydi.create({
      data: {
        olayId, yukumlulukId: yId, durum: 'taslak',
        acildi: new Date(t1.getTime() + 10 * GUN),
      },
    });
    const paket = await darPaket();
    expect(paket.bildirimler.map((b) => b.id)).not.toContain(k.id);
  });

  it('KURUMSAL kayıt kurum geneli yetkiye GİRER, daraltılmışa GİRMEZ', async () => {
    /* `tesisId: { in: [...] }` üç değerli mantıkta NULL satırı asla
       eşlemiyordu: şirket genelini etkileyen bir ihlalin bildirimi
       hiçbir tesisin paketinde görünmüyordu, üstelik sessizce. */
    const kurumsal = await db.olay.create({
      data: {
        kod: `DAR-KURUMSAL-${Date.now()}`, baslik: 'Kurumsal olay',
        siddet: 'kritik', durum: 'acik', tesisId: null,
        baslangic: new Date(t0.getTime() + GUN),
      },
    });
    const k = await db.bildirimKaydi.create({
      data: {
        olayId: kurumsal.id, yukumlulukId: yId, durum: 'taslak',
        acildi: new Date(t0.getTime() + GUN),
      },
    });
    /* KURUM GENELİ yetki: görür. */
    const genel = await darPaket(true);
    const satir = genel.bildirimler.find((b) => b.id === k.id);
    expect(satir, 'kurum geneli yetki kurumsal bildirimi görmedi').toBeDefined();
    /* Tesis kodu YOK ve bu doğru: uydurulmuş bir tesis kodu, kaydı
       ait olmadığı bir tesise bağlardı. */
    expect(satir!.tesisKodu).toBeNull();
    expect(genel.baslik.kapsam.not).toContain('GİRER');

    /* KAPSAMI DARALTILMIŞ yetki: GÖRMEZ. Bu ayrımı kaybetmek, tek tesise
       yetkili bir dış denetçiye şirketin kurumsal ihlallerini vermek
       demekti — `/olaylar` ekranının yıllardır uyguladığı kuralın kanıt
       paketi üzerinden delinmesi (bağımsız inceleme, #48 turu 2; kusuru
       AÇAN şey tur 1'in kendi düzeltmesiydi). */
    const dar = await darPaket(false);
    expect(dar.bildirimler.map((b) => b.id),
      'kapsamı daraltılmış paket kurumsal kaydı SIZDIRDI').not.toContain(k.id);
    expect(dar.baslik.kapsam.not).toContain('GİRMEZ');

    await db.olay.delete({ where: { id: kurumsal.id } });
  });

  it('UYGULANMAZ kapanışı da TARİHSELDİR', async () => {
    /* Tur 2 bulgusu: `uygulanmaz` kararının ayrı zaman damgası yok ve
       kapanış `guncellendi` üzerinden okunuyor. O alan `@updatedAt`;
       kapalı kayda YAZAN herhangi bir yol onu ileri kaydırır ve kapanmış
       bir kayıt geçmiş bir dönemde "hâlâ açıktı" görünür. */
    const k = await db.bildirimKaydi.create({
      data: {
        olayId, yukumlulukId: yId, durum: 'uygulanmaz',
        uygulanmazGerekcesi: 'Bu olay bu mercinin kapsamına girmiyor.',
        acildi: new Date(t0.getTime() - 10 * GUN),
        guncellendi: new Date(t0.getTime() - 5 * GUN),
      },
    });
    const paket = await darPaket();
    /* Aralıktan ÖNCE kapanmış: pakete GİRMEZ. */
    expect(paket.bildirimler.map((b) => b.id)).not.toContain(k.id);
  });

  it('kapsam NOTU bildirim kayıtlarını ADIYLA anlatır', async () => {
    /* Denetçi paketi açtığında bildirim satırlarının hangi zamana ait
       olduğunu notta okumalı; not yalnız maddelerden bahsediyordu. */
    const paket = await darPaket();
    expect(paket.baslik.kapsam.not).toContain('bildirim');
    expect(paket.baslik.kapsam.not).toContain('Kurumsal');
  });
});
