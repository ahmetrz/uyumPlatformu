import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R15 · KİŞİSEL VERİ KORUMA — KABUL KRİTERLERİ [KVK-ENV-001…004]

   Dört kriter, dört ölçüm:
     KVK-ENV-001  bildirim tarihi boşsa 5 iş günü sayacı ÇALIŞMAZ
     KVK-ENV-002  30 gün geçince `suresi_gecti` + GÖREV; motor cevabı YAZMAZ
     KVK-ENV-003  ihlal olayı KVKK 72 saat yükümlülüğünü tetikler (R10)
     KVK-ENV-004  envanter satırı iş sürecine bağlı olmadan KAYDEDİLEMEZ

   ── FİKSTÜRLER EL YAPIMI ──────────────────────────────────────────────
   Hiçbiri bir kamu kaynağından alınmadı; kurgusal ülke ve kurgusal kişi
   grupları kullanıldı.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kvk-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { veriKorumaSurelerini, kuraliCoz } = await import('@/lib/uyum/veriKorumaKosumu');
const {
  aktarimBildirimDurumu, bildirimDoguran,
} = await import('@/lib/veriKoruma/aktarim');
const {
  basvuruKarari, MOTORUN_YAZABILECEGI, motorYazabilirMi,
} = await import('@/lib/veriKoruma/basvuru');
const {
  geriSayim, isGunuEkle, sonTarih, VARSAYILAN_HAFTA_SONU,
} = await import('@/lib/veriKoruma/sureler');
const { kapsamKosuluSaglaniyor } = await import('@/lib/uyum/bildirimSuresi');
const { uyanYukumlulukler } = await import('@/lib/uyum/bildirimKaydi');
const { veriFaaliyetiKaydet } = await import('@/lib/eylemler2/veriKoruma');

const damga = Date.now();
const GUN = 24 * 3_600_000;

const oturum = {
  id: '', adSoyad: 'Kurgusal KVK', eposta: `kvk-${damga}@kurgusal.local`, unvan: null,
  yetkiler: [{
    rol: 'yonetici', modul: null as string | null, tesisId: null as string | null,
    surecId: null as string | null, regulasyonId: null as string | null,
  }],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

beforeAll(async () => {
  oturum.id = (await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: 'Kurgusal KVK', aktif: true },
  })).id;
});

afterAll(async () => {
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

/* ═══ KVK-ENV-001 ══════════════════════════════════════════════════════ */

describe('KVK-ENV-001 · bildirim tarihi YOKSA sayaç ÇALIŞMAZ', () => {
  const kural = {
    konu: 'aktarim_bildirim_standart_sozlesme', gun: 5, isGunu: true,
    haftaSonu: null, dayanak: 'Kurgusal dayanak — ölçüm fikstürü', aktif: true,
  };
  const SIMDI = new Date('2026-09-10T09:00:00Z').getTime();

  it('tarih GİRİLMEDİYSE hâl "tarih_girilmedi" — geri sayım YOK [KVK-ENV-001]', () => {
    const d = aktarimBildirimDurumu({
      dayanak: 'standart_sozlesme', bildirimTarihiMs: null, kural, simdiMs: SIMDI,
    });
    expect(d.hal).toBe('tarih_girilmedi');
    expect(d.soz).toContain('sayaç çalışmaz');
    /* SAYAÇ ÇALIŞSAYDI "gecikme" görünürdü: hâlin kendisi bunu dışlıyor. */
    expect(d.soz).not.toMatch(/gecikme|kaldı/i);
  });

  it('tarih GİRİLİNCE sayaç işler — kapı sıkı ama kilitli değil [KVK-ENV-001]', () => {
    const d = aktarimBildirimDurumu({
      dayanak: 'standart_sozlesme', bildirimTarihiMs: SIMDI - 2 * GUN,
      kural, simdiMs: SIMDI,
    });
    expect(d.hal).toBe('sayiyor');
    if (d.hal === 'sayiyor') expect(d.geri.sureVar).toBe(true);
  });

  it('SÜRE KURALI yoksa yükümlülük de YOK — ürün süre uydurmaz [KVK-ENV-001]', () => {
    const d = aktarimBildirimDurumu({
      dayanak: 'standart_sozlesme', bildirimTarihiMs: null, kural: null, simdiMs: SIMDI,
    });
    expect(d.hal).toBe('gerekmiyor');
    expect(d.soz).toContain('UYDURMAZ');
  });

  it('BİLDİRİM gerektiren dayanak POZİTİF yüklemle seçilir [KVK-ENV-001]', () => {
    /* Olumsuz yazılsaydı (`!== 'yeterlilik'`) yarın eklenen beşinci bir
       dayanak sessizce bildirim yükümlülüğü doğururdu. */
    expect(bildirimDoguran('standart_sozlesme')).toBe(true);
    for (const d of ['yeterlilik', 'baglayici_kurumsal_kural', 'istisna', 'kurgusal_yeni']) {
      expect(bildirimDoguran(d), `${d} yanlışlıkla bildirim doğurdu`).toBe(false);
    }
  });

  it('İŞ GÜNÜ sayımı hafta sonunu ATLAR ve varsayımı beyan eder [KVK-ENV-001]', () => {
    /* 2026-09-10 Perşembe; +5 iş günü → 2026-09-17 Perşembe.
       Takvim günü olsaydı 2026-09-15 çıkardı: fark ölçülüyor. */
    const persembe = new Date('2026-09-10T00:00:00Z').getTime();
    const bes = isGunuEkle(persembe, 5, VARSAYILAN_HAFTA_SONU);
    expect(new Date(bes).toISOString().slice(0, 10)).toBe('2026-09-17');
    expect(sonTarih(persembe, { ...kural, isGunu: false }))
      .toBe(new Date('2026-09-15T00:00:00Z').getTime());
  });

  it('hafta sonu kümesi HAFTANIN TAMAMI olamaz — sonsuz döngü değil, HATA [KVK-ENV-001]', () => {
    expect(() => isGunuEkle(Date.now(), 1, [0, 1, 2, 3, 4, 5, 6])).toThrow(/iş günü kalmıyor/);
  });
});

/* ═══ KVK-ENV-002 ══════════════════════════════════════════════════════ */

describe('KVK-ENV-002 · 30 gün geçince görev açılır, CEVAP YAZILMAZ', () => {
  it('MOTORUN yazabileceği TEK durum `suresi_gecti` [KVK-ENV-002]', () => {
    expect(MOTORUN_YAZABILECEGI).toEqual(['suresi_gecti']);
    for (const d of ['yanitlandi', 'reddedildi', 'incelemede', 'yeni']) {
      expect(motorYazabilirMi(d), `motor ${d} yazabiliyor`).toBe(false);
    }
  });

  it('SÜRE YOKSA "geçti" de YOK — olmayan ihlal uydurulmaz [KVK-ENV-002]', () => {
    const geri = geriSayim({ baslangicMs: 0, simdiMs: Date.now(), kural: null });
    expect(geri.sureVar).toBe(false);
    expect(basvuruKarari({ mevcutDurum: 'yeni', geri })).toBeNull();
  });

  it('KAPANMIŞ başvuruya motor DOKUNMAZ [KVK-ENV-002]', () => {
    const kural = {
      konu: 'basvuru_yanit', gun: 30, isGunu: false, haftaSonu: null,
      dayanak: 'Kurgusal', aktif: true,
    };
    const geri = geriSayim({
      baslangicMs: Date.now() - 90 * GUN, simdiMs: Date.now(), kural,
    });
    expect(geri.sureVar && geri.gecti).toBe(true);
    for (const d of ['yanitlandi', 'reddedildi']) {
      expect(basvuruKarari({ mevcutDurum: d, geri }), `${d} durumuna dokunuldu`).toBeNull();
    }
    expect(basvuruKarari({ mevcutDurum: 'yeni', geri })).toBe('suresi_gecti');
    /* İDEMPOTENT: ikinci koşu aynı kaydı yeniden işaretlemez. */
    expect(basvuruKarari({ mevcutDurum: 'suresi_gecti', geri })).toBeNull();
  });

  it('GERÇEK koşum: süresi geçen başvuruda GÖREV açılır, YANIT boş kalır [KVK-ENV-002]', async () => {
    const kod = `VSB-KURGU-${damga}`;
    const b = await db.veriSahibiBasvurusu.create({
      data: {
        kod, konu: 'silme', durum: 'yeni',
        alinma: new Date(Date.now() - 90 * GUN),
      },
    });
    const k = await veriKorumaSurelerini(db, { simdiMs: Date.now() });
    expect(k.suresiGecen).toBeGreaterThanOrEqual(1);

    const sonra = await db.veriSahibiBasvurusu.findUniqueOrThrow({ where: { id: b.id } });
    expect(sonra.durum).toBe('suresi_gecti');
    /* EN PAHALI İDDİA: motor cevabı YAZMAZ. */
    expect(sonra.yanitMetni, 'motor başvuruya cevap yazdı').toBeNull();
    expect(sonra.yanitlayanId).toBeNull();
    expect(sonra.gorevId, 'görev açılmadı').not.toBeNull();

    const gorev = await db.gorev.findUniqueOrThrow({ where: { id: sonra.gorevId! } });
    expect(gorev.otomatikUretildi).toBe(true);
    expect(gorev.kaynakTipi).toBe('VeriSahibiBasvurusu');
    expect(gorev.baslik).toContain(kod);

    /* MOTORUN YAZDIĞI İZ BIRAKIR — aktör YOK. */
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'VeriSahibiBasvurusu', varlikId: b.id },
      orderBy: { zaman: 'desc' },
    });
    expect(iz, 'motor izsiz yazdı').not.toBeNull();
    expect(iz!.aktorId).toBeNull();
    expect(iz!.gerekce).toContain('motor');

    /* İKİNCİ KOŞU İDEMPOTENT: ikinci görev açılmaz. */
    const ikinci = await veriKorumaSurelerini(db, { simdiMs: Date.now() });
    const gorevSayisi = await db.gorev.count({
      where: { kaynakTipi: 'VeriSahibiBasvurusu', kaynakId: b.id },
    });
    expect(gorevSayisi, 'ikinci koşu ikinci görev açtı').toBe(1);
    expect(ikinci.acilanGorev).toBe(0);
  });

  it('MOTOR SARMALAYICISI aynı döngüyü koşar — ikinci gerçek yok [KVK-ENV-002]', async () => {
    /* `veriKorumaSureleriniIsle` ince bir kuşaktır: `server-only` ve
       zamanlayıcı girişi. Kendi mantığı OLMAMALIDIR — olsaydı motor ile
       tohum iki ayrı davranış gösterirdi. */
    const { veriKorumaSureleriniIsle } = await import('@/lib/motorlar/veriKoruma');
    const s = await veriKorumaSureleriniIsle();
    expect(s.islenen).toBeGreaterThanOrEqual(0);
    expect(s.uretilen).toBeGreaterThanOrEqual(0);
    expect(s.ayrinti).toHaveProperty('suresiGecen');
  });

  it('SÜRE KURALI yoksa koşum hiçbir şey yazmaz, "süresiz" sayar [KVK-ENV-002]', async () => {
    const kural = await db.veriKorumaSuresi.findUnique({ where: { konu: 'basvuru_yanit' } });
    if (!kural) throw new Error('fikstürde süre kuralı yok — ölçüm koşamaz');
    await db.veriKorumaSuresi.update({ where: { konu: 'basvuru_yanit' }, data: { gun: null } });
    const kod = `VSB-SURESIZ-${damga}`;
    const b = await db.veriSahibiBasvurusu.create({
      data: { kod, konu: 'itiraz', durum: 'yeni', alinma: new Date(Date.now() - 400 * GUN) },
    });
    const k = await veriKorumaSurelerini(db, { simdiMs: Date.now() });
    expect(k.suresiz).toBeGreaterThanOrEqual(1);
    const sonra = await db.veriSahibiBasvurusu.findUniqueOrThrow({ where: { id: b.id } });
    expect(sonra.durum, 'süresiz kayda "süresi geçti" yazıldı').toBe('yeni');
    expect(sonra.sonTarih).toBeNull();
    await db.veriKorumaSuresi.update({
      where: { konu: 'basvuru_yanit' }, data: { gun: kural.gun },
    });
  });

  it('kuralın hafta sonu JSON\'u BOZUKSA varsayıma düşer, boş kümeye DEĞİL [KVK-ENV-002]', () => {
    /* Boş küme "hafta sonu yok" demek olurdu ve sayaç sessizce hızlanırdı. */
    const c = kuraliCoz({
      konu: 'basvuru_yanit', gun: 5, isGunu: true, haftaSonuJson: 'bozuk-json',
      dayanak: 'Kurgusal', aktif: true,
    });
    expect(c?.haftaSonu).toBeNull();
  });
});

/* ═══ KVK-ENV-003 ══════════════════════════════════════════════════════ */

describe('KVK-ENV-003 · ihlal olayı KVKK yükümlülüğünü tetikler (R10)', () => {
  const kural = {
    id: 'k1', kod: 'KVKK-IHLAL-72', ad: 'Kurgusal ihlal bildirimi',
    regulasyonId: null, asgariSiddet: 'orta', sureSaat: 72,
    merci: 'Kurgusal Kurul', aktif: true, tetikleyici: 'olay',
    kapsamKosulu: 'kisisel_veri_ihlali',
  };

  it('KİŞİSEL VERİ ihlali işaretlenmiş olayda yükümlülük UYANIR [KVK-ENV-003]', () => {
    const u = uyanYukumlulukler({
      siddet: 'yuksek', regulasyonIdleri: [], kurallar: [kural],
      kapsam: { kisiselVeriIhlali: true },
    });
    expect(u.map((y) => y.kod)).toEqual(['KVKK-IHLAL-72']);
  });

  it('kişisel veri ihlali DEĞİL denmiş olayda UYANMAZ [KVK-ENV-003]', () => {
    /* Kusurun kendisi: `asgariSiddet: 'orta'` ile HER orta olaya uyuyor,
       kişisel veri işlenmemiş bir kesinti için de taslak açılıyordu. */
    const u = uyanYukumlulukler({
      siddet: 'kritik', regulasyonIdleri: [], kurallar: [kural],
      kapsam: { kisiselVeriIhlali: false },
    });
    expect(u, 'kişisel veri ihlali OLMAYAN olaya KVKK taslağı açıldı').toEqual([]);
  });

  it('DEĞERLENDİRİLMEMİŞ olayda UYANIR — bilinmeyen ≠ hayır [KVK-ENV-003]', () => {
    /* `null` "kişisel veri yok" demek değildir: kimse bakmamış demektir.
       Taslak ihtiyaten açılır ve ekran neden açıldığını söyler. */
    const u = uyanYukumlulukler({
      siddet: 'yuksek', regulasyonIdleri: [], kurallar: [kural],
      kapsam: { kisiselVeriIhlali: null },
    });
    expect(u.map((y) => y.kod)).toEqual(['KVKK-IHLAL-72']);
    const s = kapsamKosuluSaglaniyor('kisisel_veri_ihlali', { kisiselVeriIhlali: null });
    expect(s.uyar).toBe(true);
    if (s.uyar) expect(s.degerlendirildi).toBe(false);
    expect(s.soz).toContain('DEĞERLENDİRİLMEDİ');
  });

  it('TANINMAYAN koşul kodu UYANDIRMAZ — sessizce herkese açmaz [KVK-ENV-003]', () => {
    const s = kapsamKosuluSaglaniyor('kurgusal_bilinmeyen', { kisiselVeriIhlali: true });
    expect(s.uyar).toBe(false);
    expect(s.soz).toContain('Tanınmayan');
  });

  it('KOŞULSUZ yükümlülük eskisi gibi uyar — geriye dönük uyumlu [KVK-ENV-003]', () => {
    const u = uyanYukumlulukler({
      siddet: 'yuksek', regulasyonIdleri: [],
      kurallar: [{ ...kural, kod: 'KOSULSUZ', kapsamKosulu: null }],
      kapsam: { kisiselVeriIhlali: false },
    });
    expect(u.map((y) => y.kod)).toEqual(['KOSULSUZ']);
  });

  it('KOŞUL PAKETTEN gelir — kurulu satır onu taşıyor [KVK-ENV-003]', async () => {
    /* Koşul KODA GÖMÜLMEZ. Fikstür DEMO kiracısıdır; kurulu paket
       (`DEMO-TR-ENERJI`) koşulu beyan eder ve kurucu onu kolona taşır.
       Bu vaka olmadan çekirdek doğru olur ama hiçbir içerik onu
       kullanmamış olurdu — kurulum zinciri hiç ölçülmezdi. */
    const y = await db.bildirimYukumlulugu.findUnique({
      where: { kod: 'DEMO-KISISEL-VERI' },
      select: { kapsamKosulu: true, sureSaat: true, koken: true },
    });
    expect(y, 'demo kişisel veri yükümlülüğü kurulu değil').not.toBeNull();
    expect(y!.kapsamKosulu, 'kurucu koşulu kolona taşımadı').toBe('kisisel_veri_ihlali');
    expect(y!.sureSaat).toBe(72);
    expect(y!.koken).toBe('paket');

    /* KOŞULSUZ satırlar KOŞULSUZ kalır: kurucu herkese koşul yazmıyor. */
    const kosulsuz = await db.bildirimYukumlulugu.findUnique({
      where: { kod: 'DEMO-MERCI-A-24' }, select: { kapsamKosulu: true },
    });
    expect(kosulsuz!.kapsamKosulu).toBeNull();
  });

  it('TR-ENERJI paket DOSYASI KVKK yükümlülüğüne koşulu beyan ediyor [KVK-ENV-003]', async () => {
    /* Gerçek TR paketi bu fikstürde KURULU DEĞİL (demo kiracısı); beyan
       yine de ölçülür — dosyanın kendisi okunur. */
    const { readFileSync } = await import('node:fs');
    const ham = JSON.parse(readFileSync('paketler/TR-ENERJI/yukumlulukler.json', 'utf8')) as
      { kod: string; kapsamKosulu?: string; sureSaat: number | null; dayanak: string }[];
    const kvkk = ham.find((y) => y.kod === 'KVKK-IHLAL-72');
    expect(kvkk, 'TR-ENERJI paketinde KVKK yükümlülüğü yok').toBeDefined();
    expect(kvkk!.kapsamKosulu).toBe('kisisel_veri_ihlali');
    expect(kvkk!.sureSaat).toBe(72);
    expect(kvkk!.dayanak).toContain('6698');
  });

  it('ZİNCİR: kişisel veri ihlali OLMAYAN olayda demo taslağı AÇILMAZ [KVK-ENV-003]', async () => {
    /* R10 ile entegrasyon: motorun kendi döngüsü koşturulur ve kaydın
       AÇILMADIĞI ölçülür. Saf katmanı sınamak yetmezdi — iddia zincir
       hakkında (R-F: gerçek yolu süren vaka). */
    const { olayinKayitlarini } = await import('@/lib/uyum/bildirimKaydiAcma');
    const kurallar = await db.bildirimYukumlulugu.findMany({
      where: { aktif: true },
      select: {
        id: true, kod: true, ad: true, regulasyonId: true, asgariSiddet: true,
        sureSaat: true, merci: true, aktif: true, tetikleyici: true,
        kapsamKosulu: true,
      },
    });
    const olay = await db.olay.create({
      data: {
        kod: `OLY-KVK-${damga}`, baslik: 'Kurgusal kesinti — kişisel veri YOK',
        siddet: 'kritik', durum: 'acik', baslangic: new Date(),
        bildirimGerekli: true, kisiselVeriIhlali: false,
      },
    });
    await olayinKayitlarini(db, {
      id: olay.id, kod: olay.kod, siddet: olay.siddet, baslangic: olay.baslangic,
      bildirimGerekli: olay.bildirimGerekli, kisiselVeriIhlali: false,
      regulasyonIdleri: [],
    }, kurallar, Date.now());

    const kayitlar = await db.bildirimKaydi.findMany({
      where: { olayId: olay.id },
      select: { yukumluluk: { select: { kod: true } } },
    });
    const kodlar = kayitlar.map((x) => x.yukumluluk.kod);
    expect(kodlar, 'kişisel veri ihlali OLMAYAN olaya kişisel veri taslağı açıldı')
      .not.toContain('DEMO-KISISEL-VERI');
    /* KOŞULSUZ yükümlülükler yine açıldı: kapı her şeyi kapatmadı. */
    expect(kodlar).toContain('DEMO-MERCI-A-24');
  });

  it('ZİNCİR: kişisel veri ihlali OLAN olayda taslak AÇILIR [KVK-ENV-003]', async () => {
    const { olayinKayitlarini } = await import('@/lib/uyum/bildirimKaydiAcma');
    const kurallar = await db.bildirimYukumlulugu.findMany({
      where: { aktif: true },
      select: {
        id: true, kod: true, ad: true, regulasyonId: true, asgariSiddet: true,
        sureSaat: true, merci: true, aktif: true, tetikleyici: true,
        kapsamKosulu: true,
      },
    });
    const olay = await db.olay.create({
      data: {
        kod: `OLY-KVK-VAR-${damga}`, baslik: 'Kurgusal kişisel veri ihlali',
        siddet: 'kritik', durum: 'acik', baslangic: new Date(),
        bildirimGerekli: true, kisiselVeriIhlali: true,
      },
    });
    await olayinKayitlarini(db, {
      id: olay.id, kod: olay.kod, siddet: olay.siddet, baslangic: olay.baslangic,
      bildirimGerekli: olay.bildirimGerekli, kisiselVeriIhlali: true,
      regulasyonIdleri: [],
    }, kurallar, Date.now());

    const kayitlar = await db.bildirimKaydi.findMany({
      where: { olayId: olay.id },
      select: { durum: true, sonTarih: true, yukumluluk: { select: { kod: true } } },
    });
    const kvk = kayitlar.find((x) => x.yukumluluk.kod === 'DEMO-KISISEL-VERI');
    expect(kvk, 'kişisel veri ihlalinde taslak açılmadı').toBeDefined();
    /* 72 saatlik süre GERÇEKTEN hesaplandı — motor "gönderildi" yazmadı. */
    expect(kvk!.durum).toBe('taslak');
    expect(kvk!.sonTarih).not.toBeNull();
  });
});

/* ═══ KVK-ENV-004 ══════════════════════════════════════════════════════ */

describe('KVK-ENV-004 · envanter satırı SÜREÇSİZ kaydedilemez', () => {
  it('OLMAYAN sürece bağlı kayıt REDDEDİLİR, satır AÇILMAZ [KVK-ENV-004]', async () => {
    const kod = `KVK-YOK-${damga}`;
    const s = await veriFaaliyetiKaydet({
      kod, ad: 'Kurgusal faaliyet', isSureciId: 'olmayan-surec-kimligi',
      amac: 'Kurgusal amaç', hukukiSebep: 'Kurgusal sebep',
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('sürece bağlanmadan');
    expect(await db.veriIslemeFaaliyeti.count({ where: { kod } })).toBe(0);
  });

  it('BOŞ süreç kimliği de REDDEDİLİR [KVK-ENV-004]', async () => {
    const kod = `KVK-BOS-${damga}`;
    const s = await veriFaaliyetiKaydet({
      kod, ad: 'Kurgusal faaliyet', isSureciId: '   ',
      amac: 'Kurgusal amaç', hukukiSebep: 'Kurgusal sebep',
    });
    expect(s.ok).toBe(false);
    expect(await db.veriIslemeFaaliyeti.count({ where: { kod } })).toBe(0);
  });

  it('KOLON da NOT NULL — sunucu atlansa bile veritabanı reddeder [KVK-ENV-004]', async () => {
    /* Kapı İKİ yerdedir. Dıştaki unutulursa içteki tutar; iddia
       "kaydedilemez" olduğu için ikisi de ölçülür. */
    await expect(db.veriIslemeFaaliyeti.create({
      data: {
        kod: `KVK-SEMA-${damga}`, ad: 'Kurgusal', amac: 'Kurgusal',
        hukukiSebep: 'Kurgusal',
      } as never,
    })).rejects.toThrow();
  });

  it('GEÇERLİ sürece bağlı kayıt GEÇER ve iz bırakır [KVK-ENV-004]', async () => {
    const surec = await db.isSureci.findFirstOrThrow({ select: { id: true, kod: true } });
    const kod = `KVK-OK-${damga}`;
    const s = await veriFaaliyetiKaydet({
      kod, ad: 'Kurgusal geçerli faaliyet', isSureciId: surec.id,
      amac: 'Kurgusal amaç', hukukiSebep: 'Kurgusal sebep',
      veriKategorileri: ['kimlik'],
    });
    expect(s.ok).toBe(true);
    const kayit = await db.veriIslemeFaaliyeti.findUniqueOrThrow({ where: { kod } });
    expect(kayit.isSureciId).toBe(surec.id);
    /* ÖZEL NİTELİKLİ üç değerlidir; verilmediyse DEĞERLENDİRİLMEDİ. */
    expect(kayit.ozelNitelikli).toBeNull();
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'VeriIslemeFaaliyeti', varlikId: kayit.id },
    });
    expect(iz, 'faaliyet izsiz yazıldı').not.toBeNull();
    expect(iz!.aktorId).toBe(oturum.id);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   R-F · S1 · EKRANIN YETKİ CÜMLELERİ GERÇEK YOLLA [KVK-ENV-005]

   Ekran üç S1 iddiası yazıyor ve üçü de bir KAPININ davranışını
   anlatıyor. Kapıyı tek başına sınamak iddiayı ölçmez: iddia EYLEMLER
   hakkındadır (R-F'i doğuran kusur tam buydu).
   ═══════════════════════════════════════════════════════════════════════ */
describe('R-F · S1 · ekranın yetki cümleleri [KVK-ENV-005]', () => {
  const rol = (r: string) => [{
    rol: r, modul: null as string | null, tesisId: null as string | null,
    surecId: null as string | null, regulasyonId: null as string | null,
  }];

  it('UYUM ONAYI olmayan rol başvuruyu karara BAĞLAYAMAZ, kayıt DEĞİŞMEZ [KVK-ENV-005]', async () => {
    const { basvuruyuYanitla, basvuruyuReddet } = await import('@/lib/eylemler2/veriKoruma');
    const kod = `VSB-YETKI-${damga}`;
    const b = await db.veriSahibiBasvurusu.create({
      data: { kod, konu: 'bilgi_talebi', durum: 'yeni', alinma: new Date() },
    });
    /* `katkici` uyumda YAZAR ama ONAYLAMAZ — ayrım tam burada ölçülür. */
    const eski = oturum.yetkiler;
    oturum.yetkiler = rol('katkici');
    const y = await basvuruyuYanitla({
      basvuruId: b.id, yanitMetni: 'Kurgusal yanıt metni — yetkisiz deneme ölçümü.',
    });
    expect(y.ok).toBe(false);
    const r = await basvuruyuReddet({ basvuruId: b.id, gerekce: 'Kurgusal ret gerekçesi' });
    expect(r.ok).toBe(false);
    const sonra = await db.veriSahibiBasvurusu.findUniqueOrThrow({ where: { id: b.id } });
    expect(sonra.durum, 'yetkisiz rol başvuruyu karara bağladı').toBe('yeni');
    expect(sonra.yanitMetni).toBeNull();
    oturum.yetkiler = eski;
  });

  it('TESİSE KISITLI rol de karara bağlayamaz — kurum geneli kapsam ister [KVK-ENV-005]', async () => {
    const { basvuruyuYanitla } = await import('@/lib/eylemler2/veriKoruma');
    const kod = `VSB-KAPSAM-${damga}`;
    const b = await db.veriSahibiBasvurusu.create({
      data: { kod, konu: 'silme', durum: 'yeni', alinma: new Date() },
    });
    const tesis = await db.tesis.findFirstOrThrow({ select: { id: true } });
    const eski = oturum.yetkiler;
    oturum.yetkiler = [{
      rol: 'yonetici', modul: null, tesisId: tesis.id, surecId: null, regulasyonId: null,
    }];
    const y = await basvuruyuYanitla({
      basvuruId: b.id, yanitMetni: 'Kurgusal yanıt metni — kapsam ölçümü için.',
    });
    expect(y.ok).toBe(false);
    expect((await db.veriSahibiBasvurusu.findUniqueOrThrow({ where: { id: b.id } })).durum)
      .toBe('yeni');
    oturum.yetkiler = eski;
  });

  it('UYUM ONAYI olmayan rol BİLDİRİM TARİHİ yazamaz, tarih BOŞ kalır [KVK-ENV-005]', async () => {
    const { aktarimBildirimiIsaretle } = await import('@/lib/eylemler2/veriKoruma');
    const a = await db.yurtDisiAktarim.findFirstOrThrow({
      where: { dayanak: 'standart_sozlesme' }, select: { id: true, bildirimTarihi: true },
    });
    const eski = oturum.yetkiler;
    oturum.yetkiler = rol('okuyucu');
    const s = await aktarimBildirimiIsaretle({
      aktarimId: a.id, bildirimTarihi: '2026-09-01',
    });
    expect(s.ok).toBe(false);
    expect((await db.yurtDisiAktarim.findUniqueOrThrow({ where: { id: a.id } })).bildirimTarihi)
      .toEqual(a.bildirimTarihi);
    oturum.yetkiler = eski;
  });

  it('GELECEK tarihli bildirim REDDEDİLİR — yapılmamış beyan işaretlenemez [KVK-ENV-005]', async () => {
    const { aktarimBildirimiIsaretle } = await import('@/lib/eylemler2/veriKoruma');
    const a = await db.yurtDisiAktarim.findFirstOrThrow({
      where: { dayanak: 'standart_sozlesme' }, select: { id: true },
    });
    const yarin = new Date(Date.now() + 2 * GUN).toISOString().slice(0, 10);
    const s = await aktarimBildirimiIsaretle({ aktarimId: a.id, bildirimTarihi: yarin });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('GELECEKTE olamaz');
  });

  it('DEMO ikizi kişisel veri kaydı YAZMAZ — açık ret döner [KVK-ENV-005]', async () => {
    const demo = await import('@/lib/eylemler2/veriKoruma.demo');
    for (const eylem of [
      demo.veriFaaliyetiKaydet, demo.basvuruyuYanitla,
      demo.basvuruyuReddet, demo.aktarimBildirimiIsaretle,
    ]) {
      const s = await eylem();
      expect(s.ok).toBe(false);
      if (!s.ok) {
        expect(s.hata).toContain('kişisel veri kaydı yazılmaz');
        /* Gerekçe KUSURU anlatır: neden yazılamayacağını söyler. */
        expect(s.hata).toContain('denetim izi');
      }
    }
  });
});
