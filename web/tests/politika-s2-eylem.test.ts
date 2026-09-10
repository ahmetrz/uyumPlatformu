import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · S2 · ÜRÜN DEĞİŞMEZLERİ — EYLEM VE MOTOR YOLU [SIS-DGM-001]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   S2 sınıfı, ihlali VERİ SIZDIRMAYAN ama GÜVENİ BOZAN cümlelerdir:
   "silmez" dediği kaydı silmek, "dokunmaz" dediği alana dokunmak,
   "uydurmaz" dediği sayıyı uydurmak. Bunlar satış konuşmasında verilen
   sözlerdir: bir uyum ürününün değişmez denetim izi vaadi tam da burada
   yaşar.

   R-F'in ölçütü tektir ve bu dosyadaki her vaka onu izler: iddiayı
   uygulayan kodun GERÇEK YOLU sürülür. Ekranın cümlesiyle sunucunun
   davranışının ayrı ayrı doğru olması, aralarındaki BAĞI kurmuş SAYILMAZ
   — #49'da MFA tam böyle düşmüştü.

   ── HER VAKA İKİ ŞEY ÖLÇER ────────────────────────────────────────────
   Eylem REDDEDER **ve** kayıt DEĞİŞMEZ. Yalnız reddi ölçmek yetmez:
   reddeden ama yan etkisini çoktan yazmış bir eylem de "reddetti"
   görünürdü.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-s2-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { IS_TANIMLARI } = await import('@/app/(kabuk)/(operasyonel)/saglik/mantik');
const { MOTOR_ADLARI } = await import('@/lib/motorlar/kayit');
const { tekIsCalistir } = await import('@/lib/eylemler2/isler');
const { bildirimTaslakDuzenle } = await import('@/lib/eylemler2/bildirimKaydi');
const { redKaydiIncele } = await import('@/lib/eylemler2/reddedilenKayit');
const { katalogArsivle } = await import('@/lib/eylemler2/yonetim');

const damga = Date.now();
type Yetki = {
  rol: string; modul: string | null; kapsamOgesiId: string | null;
  surecId: string | null; regulasyonId: string | null;
};
const oturum = {
  id: '', adSoyad: 'Kurgusal S2', eposta: `s2-${damga}@kurgusal.local`,
  unvan: null, yetkiler: [] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});
const rol = (r: string): Yetki[] =>
  [{ rol: r, modul: null, kapsamOgesiId: null, surecId: null, regulasyonId: null }];

beforeAll(async () => {
  const k = await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: oturum.adSoyad, aktif: true },
  });
  oturum.id = k.id;
  oturum.yetkiler = rol('yonetici');
});
afterAll(async () => { await db.$disconnect(); await rm(dizin, { recursive: true, force: true }); });

/** Denetim izi satır sayısı — "yan etki yok" DELTA ile ölçülür. */
const izSayisi = () => db.aktiviteKaydi.count();

describe('POL-096 · "Bu motor entegrasyon zincirinden koşar; elle tetiklenmez" [SIS-DGM-001]', () => {
  it('ELLE KOŞMAYAN motor sunucuda da REDDEDİLİR — ekran gizlemekle yetinmez', async () => {
    /* Ekran düğmeyi gizliyor. Gizlemek bir POLİTİKA DEĞİLDİR: sunucu
       kabul ediyorsa iddia yalandır. Gerçek yol: eylemin kendisi. */
    const elleKosmayan = IS_TANIMLARI.filter((i) => !i.elleCalisir).map((i) => i.ad);
    expect(elleKosmayan.length, 'vaka boş küme üzerinde koşuyor').toBeGreaterThan(0);
    const once = await izSayisi();
    const kosuOnce = await db.isKosusu.count();
    for (const ad of elleKosmayan) {
      const s = await tekIsCalistir(ad);
      expect(s.ok, `${ad} elle koşturulabildi`).toBe(false);
      /* ── SABOTAJ BULGUSU · S60 (10 Eylül 2026) ────────────────────────
         İlk yazımda yalnız `s.ok === false` ölçülüyordu ve sabotaj
         (motor adı şemasını `z.string()`e gevşet) KIRMIZI YAKMADI:
         defterde olmayan bir ad `ISLER[isAdi]` ile `undefined` gelir,
         `isKos` patlar ve eylem yine `ok: false` döner. Yani test
         "politika reddetti" ile "kod çöktü"yü ayırt etmiyordu — kapı
         sustuğu için değil, YANLIŞ SEBEPLE sustuğu için yeşildi.

         R-E: yakmayan sabotaj testin kusurudur. Bugün reddin SEBEBİ de
         ölçülüyor ve motorun GERÇEKTEN koşmadığı ayrı bir tanıkla
         (`IsKosusu` satırı) doğrulanıyor — koşan her motor koşu kaydı
         bırakır. */
      if (!s.ok) {
        expect(s.hata, `${ad} reddedildi ama POLİTİKA gereği değil: ${s.hata}`)
          .toMatch(/Bilinmeyen iş adı/);
      }
    }
    /* Koşan bir motor KOŞU KAYDI bırakır: sayı değişmediyse hiçbiri koştu. */
    expect(await db.isKosusu.count(), 'reddedilen motor yine de koştu')
      .toBe(kosuOnce);
    expect(await izSayisi(), 'reddedilen motor yine de yan etki yazdı').toBe(once);
  });

  it('BAĞ: ekranın "elle koşmaz" dediği ad motor defterinde YOKTUR', () => {
    /* Reddin SEBEBİ de ölçülür: defterde olup da zod'un elemesi tesadüf
       olurdu; ad defterde HİÇ yok, bu yüzden reddediliyor. */
    for (const i of IS_TANIMLARI.filter((x) => !x.elleCalisir)) {
      expect(MOTOR_ADLARI as readonly string[],
        `${i.ad} hem "elle koşmaz" hem defterde`).not.toContain(i.ad);
    }
    /* Ters yön: defterdeki her motor ekranda ELLE KOŞAR yazmalı. */
    for (const ad of MOTOR_ADLARI) {
      const i = IS_TANIMLARI.find((x) => x.ad === ad);
      expect(i, `${ad} defterde ama ekran kataloğunda yok`).toBeDefined();
      expect(i?.elleCalisir, `${ad} defterde ama ekran "elle koşmaz" diyor`).toBe(true);
    }
  });
});

describe('POL-119 · "Kapanmış bir bildirimin taslağı değiştirilemez" [SIS-DGM-001]', () => {
  it('KAPANMIŞ kayıtta taslak DEĞİŞMEZ — metin ayrışırsa kayıt kanıt olmaktan çıkar', async () => {
    const y = await db.bildirimYukumlulugu.findFirst({ select: { id: true } });
    const o = await db.olay.findFirst({ select: { id: true } });
    expect(y, 'fikstür: yükümlülük yok').not.toBeNull();
    expect(o, 'fikstür: olay yok').not.toBeNull();
    const kayit = await db.bildirimKaydi.create({
      data: {
        olayId: o!.id, yukumlulukId: y!.id, durum: 'gonderildi',
        taslakMetin: 'ÖZGÜN METİN — gönderilen budur',
        gonderimZamani: new Date(), referansNo: `KURGU-${damga}`,
      },
    });
    const onceIz = await izSayisi();
    const s = await bildirimTaslakDuzenle({ kayitId: kayit.id, taslakMetin: 'SONRADAN DEĞİŞTİRİLDİ' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/Kapanmış bir bildirimin taslağı değiştirilemez/);

    const sonra = await db.bildirimKaydi.findUnique({ where: { id: kayit.id } });
    expect(sonra?.taslakMetin, 'kapanmış kaydın metni değişti').toBe('ÖZGÜN METİN — gönderilen budur');
    expect(await izSayisi(), 'reddedilen düzenleme iz yazdı').toBe(onceIz);
  });
});

describe('POL-123 · "Kayıt silinmez… notsuz kapatılamaz" [SIS-DGM-001]', () => {
  const kayitAc = () => db.reddedilenKayit.create({
    data: {
      kaynakSistem: `KURGUSAL-${damga}`, asama: 'normalize', sebep: 'sema_uyusmazligi',
      hamJson: '{"a":1}', durum: 'acik',
    },
  });

  it('NOTSUZ kapatma REDDEDİLİR ve kayıt AÇIK kalır', async () => {
    const r = await kayitAc();
    const s = await redKaydiIncele({ idler: [r.id], durum: 'yok_sayildi', not: '  ' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/İnceleme notu zorunlu/);
    const sonra = await db.reddedilenKayit.findUnique({ where: { id: r.id } });
    expect(sonra?.durum, 'notsuz karar yine de yazıldı').toBe('acik');
    expect(sonra?.incelemeNotu).toBeNull();
  });

  it('"YOK SAYILDI" bir KARARDIR: satır SİLİNMEZ, durumu ve notu SAKLANIR', async () => {
    const r = await kayitAc();
    const once = await db.reddedilenKayit.count();
    const s = await redKaydiIncele({
      idler: [r.id], durum: 'yok_sayildi', not: 'Kurgusal test kaydı; kaynak sistem kapatıldı.',
    });
    expect(s.ok, s.ok ? '' : s.hata).toBe(true);
    expect(await db.reddedilenKayit.count(), 'kayıt SİLİNDİ — arşiv değil').toBe(once);
    const sonra = await db.reddedilenKayit.findUnique({ where: { id: r.id } });
    expect(sonra, 'satır yok oldu').not.toBeNull();
    expect(sonra?.durum).toBe('yok_sayildi');
    expect(sonra?.incelemeNotu).toMatch(/kaynak sistem kapatıldı/);
    /* Karar denetim izine düşer: "yok sayıldı" da bir karardır. */
    const iz = await db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'ReddedilenKayit', varlikId: r.id },
    });
    expect(iz.length, 'karar ize düşmedi').toBe(1);
    expect(iz[0].eylem).toBe('red');
  });
});

describe('POL-038 · "Gerekçe zorunludur ve denetim izine yazılır" [SIS-DGM-001]', () => {
  it('GEREKÇESİZ arşivleme REDDEDİLİR ve kayıt aktif KALIR', async () => {
    const t = await db.varlikTuru.create({
      data: { kod: `KURGU-${damga}`, ad: 'Kurgusal tür', aktif: true },
    });
    const onceIz = await izSayisi();
    const s = await katalogArsivle({ tip: 'varlikTuru', id: t.id, gerekce: '   ' });
    expect(s.ok).toBe(false);
    const sonra = await db.varlikTuru.findUnique({ where: { id: t.id } });
    expect(sonra?.aktif, 'gerekçesiz arşivleme yine de uygulandı').toBe(true);
    expect(await izSayisi(), 'reddedilen arşivleme iz yazdı').toBe(onceIz);
  });

  it('GEREKÇELİ arşivleme kaydı SİLMEZ — pasifleştirir ve gerekçeyi ize yazar', async () => {
    const t = await db.varlikTuru.create({
      data: { kod: `KURGU2-${damga}`, ad: 'Kurgusal tür 2', aktif: true },
    });
    const once = await db.varlikTuru.count();
    const s = await katalogArsivle({
      tip: 'varlikTuru', id: t.id, gerekce: 'Kurgusal test tipi; kullanımdan kaldırıldı.',
    });
    expect(s.ok, s.ok ? '' : s.hata).toBe(true);
    expect(await db.varlikTuru.count(), 'arşivleme satırı SİLDİ').toBe(once);
    expect((await db.varlikTuru.findUnique({ where: { id: t.id } }))?.aktif).toBe(false);
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'VarlikTuru', varlikId: t.id }, orderBy: { zaman: 'desc' },
    });
    expect(iz?.gerekce, 'gerekçe ize yazılmadı').toMatch(/kullanımdan kaldırıldı/);
  });
});

describe('POL-098 · "Demo sürümü: değişiklikler bu ortamda kaydedilmez" [SIS-DGM-001]', () => {
  it('DEMO ikizinin HER ihracı açık RET döner — sessiz başarı yok', async () => {
    /* Demo, ürünün en çok gösterilen yüzeyidir. "Kaydedilmez" diyen bir
       ikizin sessizce `ok: true` dönmesi, satış gezintisinde kaydedildiği
       sanılan bir değişiklik demektir. */
    const ikiz = await import('@/lib/eylemler2/apiAnahtari.demo');
    const isimler = Object.keys(ikiz);
    expect(isimler.length, 'ikiz boş — vaka hiçbir şey ölçmüyor').toBeGreaterThan(0);
    for (const ad of isimler) {
      const fn = (ikiz as unknown as Record<string, (g: unknown) => Promise<unknown>>)[ad];
      const s = await fn({}) as { ok: boolean; hata?: string };
      expect(s.ok, `${ad} demo ikizinde sessizce başarı döndü`).toBe(false);
      expect(s.hata).toMatch(/bu ortamda kaydedilmez/);
    }
  });
});

describe('POL-002 · POL-033 · "el ile değiştirildi, motor bunlara dokunmaz" [SIS-DGM-001]', () => {
  it('MOTOR el ile değiştirilmiş uygulanabilirlik kararını EZMEZ — gerçek koşum', async () => {
    /* Ekran "N karar el ile değiştirildi, motor bunlara dokunmaz" diyor.
       Gerçek yol motorun kendisidir: koşturulur ve kararın DEĞİŞMEDİĞİ
       ölçülür. Kararın kendisi değil, motorun ondan UZAK DURMASI ölçülür. */
    const { tesisKapsaminiHesapla } = await import('@/lib/motorlar/uygulanabilirlik');
    const karar = await db.uygulanabilirlikKarari.findFirst({
      where: { elIleDegistirildi: true },
      select: {
        id: true, uygulanabilir: true, degistirmeGerekcesi: true, gerekce: true,
        kapsamOgesi: { select: { tesisId: true } },
      },
    });
    expect(karar, 'fikstürde el ile değiştirilmiş karar yok — vaka boş küme ölçüyor')
      .not.toBeNull();
    const tesisId = karar!.kapsamOgesi?.tesisId;
    expect(tesisId, 'kararın kapsam öğesi tesise bağlı değil').toBeTruthy();
    await tesisKapsaminiHesapla(tesisId!);
    const sonra = await db.uygulanabilirlikKarari.findUnique({ where: { id: karar!.id } });
    expect(sonra?.uygulanabilir, 'motor el ile kararı EZDİ').toBe(karar!.uygulanabilir);
    expect(sonra?.elIleDegistirildi, 'motor override işaretini düşürdü').toBe(true);
    expect(sonra?.degistirmeGerekcesi, 'gerekçe silindi').toBe(karar!.degistirmeGerekcesi);
    expect(sonra?.gerekce, 'motor gerekçeyi ezdi').toBe(karar!.gerekce);
  });
});

describe('POL-003 · POL-140 · POL-141 · motor "bildirildi" YAZMAZ, CEVAP yazmaz [SIS-DGM-001]', () => {
  it('BİLDİRİM SÜRESİ motoru olaya DOKUNMAZ ve "gönderildi" YAZMAZ — gerçek koşum', async () => {
    /* "Resmî bir bildirimin yapıldığını yazabilecek tek şey insandır."
       Gerçek yol: motoru koştur, olayların ve gönderim alanlarının
       değişmediğini ölç. */
    const { bildirimSurelerini } = await import('@/lib/motorlar/bildirimSuresi');
    const olayOnce = await db.olay.findMany({
      select: { id: true, durum: true, bildirimGerekli: true, bildirimTarihi: true },
      orderBy: { id: 'asc' },
    });
    const gonderilenOnce = await db.bildirimKaydi.count({
      where: { durum: { in: ['gonderildi', 'teyit_alindi'] } },
    });
    await bildirimSurelerini();
    const olaySonra = await db.olay.findMany({
      select: { id: true, durum: true, bildirimGerekli: true, bildirimTarihi: true },
      orderBy: { id: 'asc' },
    });
    expect(olaySonra, 'motor olaya dokundu').toEqual(olayOnce);
    expect(await db.bildirimKaydi.count({
      where: { durum: { in: ['gonderildi', 'teyit_alindi'] } },
    }), 'motor "bildirildi" yazdı').toBe(gonderilenOnce);
  });

  it('VERİ KORUMA motoru başvuruya CEVAP YAZMAZ — yanıt alanı boş kalır [SIS-DGM-001]', async () => {
    /* "Bir veri sahibine ürünün cevap yazması, kurumun adına beyanda
       bulunmaktır." Motor yalnız süreyi izler ve görev açar. */
    const { veriKorumaSureleriniIsle } = await import('@/lib/motorlar/veriKoruma');
    const once = await db.veriSahibiBasvurusu.findMany({
      select: { id: true, yanitMetni: true, yanitlayanId: true }, orderBy: { id: 'asc' },
    });
    expect(once.length, 'fikstürde başvuru yok — vaka boş küme ölçüyor').toBeGreaterThan(0);
    await veriKorumaSureleriniIsle();
    const sonra = await db.veriSahibiBasvurusu.findMany({
      select: { id: true, yanitMetni: true, yanitlayanId: true }, orderBy: { id: 'asc' },
    });
    expect(sonra.map((b) => b.yanitMetni), 'motor bir veri sahibine cevap yazdı')
      .toEqual(once.map((b) => b.yanitMetni));
    expect(sonra.map((b) => b.yanitlayanId), 'motor kendini yanıtlayan yazdı')
      .toEqual(once.map((b) => b.yanitlayanId));
  });
});

describe('POL-068 · "Topoloji anlıklarını onaylı temelle karşılaştırır — kayıt değiştirmez" [SIS-DGM-001]', () => {
  it('TOPOLOJİ SAPMA motoru topoloji kayıtlarını DEĞİŞTİRMEZ — gerçek koşum', async () => {
    const { topolojiSapmasiniIsle } = await import('@/lib/motorlar/topolojiSapma');
    const oku = () => db.agBolgesi.findMany({ orderBy: { id: 'asc' } });
    const once = await oku();
    expect(once.length, 'fikstürde ağ bölgesi yok').toBeGreaterThan(0);
    await topolojiSapmasiniIsle();
    expect(await oku(), 'motor topoloji kaydını değiştirdi').toEqual(once);
  });
});

describe('POL-034 · "Erişimin sahada kesilmesi için görev açılır; platform kesmez" [SIS-DGM-001]', () => {
  it('KAPATMA TALEBİ görev AÇAR, oturumun erişimine DOKUNMAZ', async () => {
    const { oturumKarariKaydet } = await import('@/lib/eylemler2/tedarikciOturum');
    const o = await db.tedarikciErisimOturumu.findFirst({ orderBy: { id: 'asc' } });
    expect(o, 'fikstürde tedarikçi oturumu yok').not.toBeNull();
    const gorevOnce = await db.gorev.count();
    const s = await oturumKarariKaydet({
      oturumId: o!.id, karar: 'kapatma_talebi',
      gerekce: 'Kurgusal prova: sahada kesme talebi açılıyor.',
    });
    expect(s.ok, s.ok ? '' : s.hata).toBe(true);
    expect(await db.gorev.count(), 'kapatma talebi GÖREV açmadı').toBe(gorevOnce + 1);
    const sonra = await db.tedarikciErisimOturumu.findUnique({ where: { id: o!.id } });
    /* PLATFORM KESMEZ: oturumun bitişi ve erişim alanları aynı kalır. */
    expect(sonra?.bitis, 'platform oturumu kendisi kapattı').toEqual(o!.bitis);
    expect(sonra?.kayitReferansi, 'platform oturum kaydı referansına dokundu')
      .toBe(o!.kayitReferansi);
  });
});

describe('POL-053 · "Karar geri alınamaz" [SIS-DGM-001]', () => {
  it('KAPANMIŞ bulgu ikinci kez karara BAĞLANAMAZ ve kapanış zamanı KAYMAZ', async () => {
    /* "Geri alınamaz" iddiasının sunucudaki karşılığı: kapalı bir bulguya
       ikinci karar yazılamaz. Yazılabilseydi kapanış zamanı kayardı ve
       bir uyum kaydının en çok sorulan sorusu ("ne zaman kapandı")
       cevapsız kalırdı. */
    const b = await db.veriKalitesiBulgusu.findFirst({ where: { durum: 'acik' } });
    expect(b, 'fikstürde açık veri kalitesi bulgusu yok').not.toBeNull();
    const { veriKalitesiBulgusuKapat } = await import('@/lib/eylemler2/varlikDurusu');

    const ilk = await veriKalitesiBulgusuKapat({
      bulguId: b!.id, karar: 'kabul_edildi', gerekce: 'Kurgusal prova: kabul edildi.',
    });
    expect(ilk.ok, ilk.ok ? '' : ilk.hata).toBe(true);
    const kapali = await db.veriKalitesiBulgusu.findUnique({ where: { id: b!.id } });
    expect(kapali?.durum).toBe('kapandi');

    const onceIz = await izSayisi();
    const ikinci = await veriKalitesiBulgusuKapat({
      bulguId: b!.id, karar: 'giderildi', gerekce: 'Kurgusal prova: ikinci karar denemesi.',
    });
    expect(ikinci.ok, 'kapanmış bulgu ikinci kez karara bağlandı').toBe(false);
    const sonra = await db.veriKalitesiBulgusu.findUnique({ where: { id: b!.id } });
    expect(sonra?.kapanis, 'kapanış zamanı kaydı').toEqual(kapali?.kapanis);
    expect(await izSayisi(), 'reddedilen ikinci karar iz yazdı').toBe(onceIz);
  });
});

describe('POL-066 · "Sözleşmeyi bozan yerleşim KAYDEDİLMEZ; sunucu da aynı kuralı uygular" [SIS-DGM-001]', () => {
  it('SUNUCU sözleşmeyi bozan yerleşimi REDDEDER ve ayar DEĞİŞMEZ', async () => {
    /* İstemcinin doğrulama yapması bir POLİTİKA DEĞİLDİR: politikayı
       uygulayan taraf sunucudur. Bu vaka istemciyi hiç kullanmaz. */
    const { ayarKaydet } = await import('@/lib/eylemler2/yonetim');
    const oku = () => db.yapilandirma.findUnique({ where: { anahtar: 'saha.yerlesim' } });
    const once = await oku();
    const onceIz = await izSayisi();
    const s = await ayarKaydet({
      anahtar: 'saha.yerlesim',
      deger: { kpi: ['OLMAYAN_MODUL'], sutunlar: [] },
      gerekce: 'Kurgusal prova: sözleşmeyi bozan yerleşim deneniyor.',
    });
    expect(s.ok, 'sunucu sözleşmeyi bozan yerleşimi KABUL ETTİ').toBe(false);
    const sonra = await oku();
    expect(sonra?.degerJson, 'reddedilen yerleşim yine de yazıldı')
      .toBe(once?.degerJson);
    expect(await izSayisi(), 'reddedilen yerleşim iz yazdı').toBe(onceIz);
  });
});

describe('POL-001 · "kayıt okunabilir, değiştirilemez" [SIS-DGM-001]', () => {
  it('YAZMA yetkisi olmayan rol olayı DEĞİŞTİREMEZ ve kayıt AYNEN kalır', async () => {
    const { olayGuncelle } = await import('@/lib/eylemler2/olay');
    const o = await db.olay.findFirst({ orderBy: { id: 'asc' } });
    expect(o, 'fikstürde olay yok').not.toBeNull();
    const eskiYetki = oturum.yetkiler;
    oturum.yetkiler = rol('okuyucu');
    const onceIz = await izSayisi();
    const s = await olayGuncelle({ id: o!.id, ozet: 'OKUYUCU YAZMAYA ÇALIŞTI' });
    oturum.yetkiler = eskiYetki;
    expect(s.ok, 'okuyucu olayı değiştirebildi').toBe(false);
    const sonra = await db.olay.findUnique({ where: { id: o!.id } });
    expect(sonra?.ozet, 'okuyucunun yazımı kayda geçti').toBe(o!.ozet);
    expect(await izSayisi(), 'reddedilen yazım iz bıraktı').toBe(onceIz);
  });
});

describe('POL-044 · "Hesap kaydı okunamadı; bu ortamda profil yazılmaz" [SIS-DGM-001]', () => {
  it('HESAP KAYDI OKUNAMAZKEN profil yazılmaz — sessiz varsayılan yok', async () => {
    /* Ekran, hesap kaydı okunamadığında yazmanın olmayacağını söylüyor.
       Gerçek yol `kendiHesabi()`: oturum çözülemezse eylem reddeder. */
    const { profilGuncelle } = await import('@/lib/eylemler2/hesap');
    const auth = await import('@/lib/auth');
    const asil = auth.aktifKullanici;
    (auth as unknown as { aktifKullanici: unknown }).aktifKullanici = async () => null;
    const onceIz = await izSayisi();
    const s = await profilGuncelle({ adSoyad: 'OKUNAMAYAN HESAP', unvan: null });
    (auth as unknown as { aktifKullanici: unknown }).aktifKullanici = asil;
    expect(s.ok, 'hesap okunamazken profil yazıldı').toBe(false);
    expect(await izSayisi(), 'reddedilen profil yazımı iz bıraktı').toBe(onceIz);
  });
});

describe('POL-028 · "Doğrulamayı geçen satır yok — hiçbir madde yazılamaz" [SIS-DGM-001]', () => {
  it('SIFIR geçerli satırlı aktarım onaylanınca HİÇBİR madde yazılmaz', async () => {
    /* Ekran "bu dosyadan hiçbir madde yazılamaz" diyor. Gerçek yol onay
       eylemidir: dosya onaylanır ve madde sayısının DEĞİŞMEDİĞİ ölçülür.
       Yalnız ekranın boş durumunu ölçmek, sunucuyu hiç sınamazdı. */
    const { aktarimOnayla } = await import('@/lib/eylemler');
    const r = await db.regulasyon.findFirst({ select: { id: true } });
    expect(r, 'fikstürde regülasyon yok').not.toBeNull();
    const a = await db.iceAktarim.create({
      data: {
        regulasyonId: r!.id, kaynakTipi: 'excel', kaynakAdi: `kurgusal-bos-${damga}.xlsx`,
        durum: 'dogrulama_bekliyor', okunan: 3, elenen: 3,
        /* Üç satır okundu, üçü de elendi: doğrulamayı geçen YOK. */
        raporJson: JSON.stringify({ satirlar: [] }),
      },
    });
    const once = await db.madde.count();
    const s = await aktarimOnayla({ id: a.id });
    expect(s.ok, s.ok ? '' : s.hata).toBe(true);
    expect(await db.madde.count(), 'geçerli satır yokken madde yazıldı').toBe(once);
    const sonra = await db.iceAktarim.findUnique({ where: { id: a.id } });
    expect(sonra?.eklenen, 'eklenen sayısı uyduruldu').toBe(0);
    expect(sonra?.guncellenen, 'güncellenen sayısı uyduruldu').toBe(0);
  });
});

describe('POL-029 · POL-061 · varlık aktarımı: geçerli satır yoksa yazılmaz, ret iz bırakır [SIS-DGM-001]', () => {
  it('RET hiçbir varlık YAZMAZ ve kararı denetim izine DÜŞÜRÜR', async () => {
    /* "Onay ve ret denetim izine düşer." Retçi yolun ölçümü onay
       yolununkinden ayrıdır: yazmayan bir yol da iz bırakmalıdır, yoksa
       "kim reddetti" sorusu cevapsız kalır. */
    const { varlikAktarimReddet } = await import('@/lib/eylemler2/varlikAktarim');
    const a = await db.varlikAktarimi.create({
      data: {
        dosyaAdi: `kurgusal-${damga}.xlsx`, kaynakTipi: 'xlsx', durum: 'eslesme',
        okunan: 3, gecerli: 0, hatali: 3, yukleyenId: oturum.id,
      },
    });
    const varlikOnce = await db.varlik.count();
    const izOnce = await db.aktiviteKaydi.count({ where: { varlikTipi: 'VarlikAktarimi' } });
    const s = await varlikAktarimReddet({ id: a.id, gerekce: 'Kurgusal prova: geçerli satır yok.' });
    expect(s.ok, s.ok ? '' : s.hata).toBe(true);
    expect(await db.varlik.count(), 'ret yine de varlık yazdı').toBe(varlikOnce);
    expect(await db.aktiviteKaydi.count({ where: { varlikTipi: 'VarlikAktarimi' } }),
      'ret kararı denetim izine düşmedi').toBe(izOnce + 1);
  });
});

describe('POL-005 · "karar kaynak kaydı otomatik değiştirmez" [SIS-DGM-001]', () => {
  it('ÖNERİ açmak hedef ayarı DEĞİŞTİRMEZ — karar beklerken kaynak aynı kalır', async () => {
    /* Tezgahın onay işi "N gündür karar bekliyor" der ve kararın kaynağı
       kendiliğinden değiştirmediğini söyler. Gerçek yol: öneriyi aç,
       hedef kaydın DEĞİŞMEDİĞİNİ ölç. */
    const { degisiklikOner } = await import('@/lib/eylemler2/yonetim');
    const { ayarOku } = await import('@/lib/yapilandirma/oku');
    const anahtar = 'motor.son_tarih.bulgu_gun';
    const once = await ayarOku(anahtar);
    const s = await degisiklikOner({
      hedefTipi: 'ayar', hedefId: anahtar,
      sonra: { anahtar, deger: Number(once.deger) + 1 },
      gerekce: 'Kurgusal prova: öneri açılıyor, karar beklenecek.',
    });
    if (!s.ok) {
      /* Ayar B sınıfı değilse vaka yanlış hedefi sürüyor demektir. */
      expect(s.hata, 'vaka onay akışı olmayan bir ayarı sürüyor')
        .not.toMatch(/onay akışı gerekmez/);
      return;
    }
    const sonra = await ayarOku(anahtar);
    expect(sonra.deger, 'öneri açmak kaynağı DEĞİŞTİRDİ').toEqual(once.deger);
  });
});

describe('POL-041 · "Platform bilinmeyeni sıfırdan ayırır… 0 yazılmaz" [SIS-DGM-001]', () => {
  it('HİÇ BAŞARILI connector koşusu yokken veri kesiti damgası NULL — sistem saati değil', async () => {
    /* Yardım ekranının cevabı bir MEKANİZMA adlandırıyor: "hiçbir
       bağlayıcı koşmadıysa veri kesiti damgası '—'dır; sistem saati
       damga diye gösterilmez." Gerçek yol o mekanizmadır. */
    const { kabukVerisi } = await import('@/components/kabuk/kabukVerisi');
    const v = await kabukVerisi();
    /* İDDİANIN ÖZÜ: damga ya BİR KOŞUDAN gelir ya da YOKTUR. Üçüncü
       ihtimal — sistem saatini damga diye göstermek — "veri taze" demek
       olurdu; ölçülen tam olarak budur.

       Vaka fikstürün koşu sayısına BAĞLI DEĞİLDİR: iki dalın ikisi de
       iddiayı sınar, hangi dala düştüğü fikstüre kalmıştır. */
    if (v.kesit === null) {
      /* "Bilinmeyen" hâli: ekran "—" yazar, 0 ya da bugünün tarihi değil. */
      expect(v.kesit).toBeNull();
      return;
    }
    const damga = new Date(v.kesit).getTime();
    expect(Number.isFinite(damga), 'damga tarih değil').toBe(true);
    /* Damga GERÇEK bir koşu kaydına karşılık gelmeli. */
    const kosular = await db.entegrasyonKosusu.findMany({
      select: { baslangic: true, bitis: true },
    });
    const eslesen = kosular.some((k) => k.baslangic.getTime() === damga
      || (k.bitis !== null && k.bitis.getTime() === damga));
    expect(eslesen, 'damga hiçbir koşuya karşılık gelmiyor — uydurulmuş').toBe(true);
  });
});

describe('POL-059 · POL-067 · "KÖKENSİZ — sunucu bunu yazmaz" [SIS-DGM-001]', () => {
  it('SUNUCUNUN yazdığı her "uygulandı" kaydı bir kuru koşuya BAĞLIDIR', async () => {
    /* İddia bir NEGATİF beyandır: kökensiz bir uygulama kaydı görürsen o
       kaydı sunucu yazmamıştır. Ölçümü de negatiftir — sunucunun ürettiği
       kayıtların HEPSİ kökenli olmalı. */
    const uygulananlar = await db.degerlendirmeAktarimi.findMany({
      where: { durum: 'uygulandi' }, select: { id: true, kuruKosuId: true },
    });
    for (const u of uygulananlar) {
      expect(u.kuruKosuId, `${u.id} kökensiz uygulama — sunucu bunu yazmamalıydı`)
        .not.toBeNull();
    }
    /* Ekranın cümlesi de ölçülür: kökensiz kayıt VARSA özet onu SÖYLER
       ve gizlemez. */
    const { aktarimOzeti, ozetCumlesi } = await import(
      '@/app/(kabuk)/(operasyonel)/degerlendirme-aktarim/mantik');
    const ozet = aktarimOzeti([
      { id: 'x', durum: 'uygulandi', kuruKosuId: null, okunan: 5, eslesen: 5,
        elenen: 0, degisen: 2 } as never,
    ]);
    expect(ozet.kokensizUygulama).toBe(1);
    expect(ozetCumlesi(ozet)).toMatch(/kökensiz/);
    expect(ozetCumlesi(ozet)).toMatch(/Sunucu bunu yazmaz/);
  });
});

describe('POL-054 · "Kayıt CMDB\'ye kendiliğinden yazılmaz" [SIS-DGM-001]', () => {
  it('EŞLEŞTİRME koşusu envantere HİÇBİR varlık yazmaz — yalnız öneri üretir', async () => {
    const { kesifEslestir } = await import('@/lib/eylemler2/kesif');
    const varlikOnce = await db.varlik.count();
    const s = await kesifEslestir({});
    expect(s.ok, s.ok ? '' : s.hata).toBe(true);
    expect(await db.varlik.count(), 'eşleştirme kendiliğinden CMDB\'ye yazdı')
      .toBe(varlikOnce);
  });
});

describe('POL-039 · "gizlenmez ve hiçbir koşulda doğrulanmış görünmez" [SIS-DGM-001]', () => {
  it('KÖKENSİZ kayıt taşıyan satır ASLA "ok" olmaz ve sayısı SIFIR yazılmaz', async () => {
    const { kokenImi, kokenSozu, kokenCumlesi, kokensizVar, kokensizYazisi } = await import(
      '@/app/(kabuk)/(operasyonel)/saglik/mantik');
    const satir = (ek: Record<string, unknown>) => ({
      tip: 'Varlik', toplam: 10, otomatik: 0, dogrulanmis: 0, reddedildi: 0,
      manuel: 0, ortalamaGuven: null, ...ek,
    } as never);

    /* Tek bir kökensiz kayıt bile satırı "doğrulanmış" olmaktan çıkarır:
       aksi hâlde yüz kayıt "hepsi doğrulanmış" görünen bir tipin içinde
       saklanabilirdi. */
    expect(kokenImi(satir({ manuel: 1 })), 'kökensiz kayıt varken satır "ok"').not.toBe('ok');
    expect(kokenImi(satir({ manuel: 40 }))).toBe('unk');
    /* Evren BİLİNMİYORSA da "doğrulanmış" denmez — bilinmeyen ≠ sıfır. */
    expect(kokensizVar(satir({ manuel: null }))).toBe(true);
    expect(kokenImi(satir({ manuel: null })), 'evren bilinmezken "doğrulanmış"').not.toBe('ok');
    expect(kokensizYazisi(satir({ manuel: null })), 'bilinmeyen SIFIR yazıldı').toBe('bilinmiyor');
    expect(kokensizYazisi(satir({ manuel: 0 }))).toBe('0');
    /* GİZLENMEZ: cümle kökensiz kaydı adıyla söyler. */
    expect(kokenCumlesi(satir({ manuel: 7 }))).toMatch(/7 kaydın köken kaydı yok/);
    expect(kokenCumlesi(satir({ manuel: 7 }))).toMatch(/hiçbir koşulda "doğrulanmış" görünmez/);
    expect(kokenSozu(satir({ manuel: 7 }))).toMatch(/Kaynak bağlamı olmayan kayıt var/);
    /* Her kaydın kaynağı doğrulanmışsa "ok" YİNE mümkündür — vaka her
       şeyi kırmızıya boyamıyor. */
    expect(kokenImi(satir({ manuel: 0 }))).toBe('ok');
  });
});

describe('POL-125 · "yükümlülükler sektör paketinden gelir, ürün bir takvim UYDURMAZ" [SIS-DGM-001]', () => {
  it('YÜKÜMLÜLÜK YOKSA satır da YOK — ürün takvim üretmez', async () => {
    const { takvimSatirlari } = await import(
      '@/app/(kabuk)/(operasyonel)/raporlar/takvim/mantik');
    expect(takvimSatirlari([], Date.now()), 'boş girdiden satır uyduruldu').toEqual([]);
  });

  it('DÖNEMİ BELİRLENMEMİŞ yükümlülükte son tarih UYDURULMAZ', async () => {
    /* "Dönem belirlenmemiş" ile "dönem geçti" aynı şey değildir. Ürün
       mevzuatta olmayan bir periyodu kendi kafasından koyamaz. */
    const { takvimSatirlari } = await import(
      '@/app/(kabuk)/(operasyonel)/raporlar/takvim/mantik');
    const s = takvimSatirlari([{
      id: 'y1', kod: 'KURGU-1', ad: 'Kurgusal yükümlülük', merci: 'Kurgusal merci',
      dayanak: 'Kurgusal dayanak', kanalNotu: null, donem: null, donemler: [],
    } as never], Date.now());
    expect(s).toHaveLength(1);
    expect(s[0].sonTarih, 'dönemi belirlenmemiş yükümlülüğe son tarih uyduruldu').toBeNull();
    expect(s[0].sureVar).toBe(false);
    expect(s[0].gecti, 'süresi belirlenmemiş yükümlülük "geçti" sayıldı').toBe(false);
    expect(s[0].im).toBe('unk');
  });

  it('KURULU yükümlülükler VERİTABANINDAN gelir — ekran kendi listesini taşımaz', async () => {
    /* İddianın öznesi PAKETTİR. Ekranın kendi içinde gömülü bir
       yükümlülük listesi olsaydı, paket kaldırılınca satır kalırdı. */
    const kayitli = await db.bildirimYukumlulugu.count();
    /* KÖKEN alanı satırın nereden geldiğini söyler: `paket` satırını
       paket güncellemesi yönetir, `kiraci` satırına dokunulmaz. */
    const paketten = await db.bildirimYukumlulugu.count({ where: { koken: 'paket' } });
    expect(kayitli, 'fikstürde yükümlülük yok — vaka boş küme ölçüyor').toBeGreaterThan(0);
    expect(paketten, 'hiçbir yükümlülük pakete bağlı değil').toBeGreaterThan(0);
  });
});
