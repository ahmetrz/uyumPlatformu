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

  it('KAPSAM SAYISI YAZILIR: kaç demo ikizi ölçülüyor, kaçı ölçülmüyor', async () => {
    /* ── BAĞIMSIZ İNCELEME ŞÜPHESİ (PR #51, tur 1) ────────────────────
       Kütük CÜMLEYE göre anahtarlıdır: POL-098 tek bir satırdır ve tek
       bir ikizi sürmek onu "ölçüldü" yapar. Depoda ise 56 `.demo.ts`
       vardır — yani iddianın büyük kısmı ölçüsüzdür ve BU SAYI HİÇBİR
       YERDE YAZMIYORDU. "Bilinmeyen ≠ sıfır": ölçülmeyen kapsam, sıfır
       kusur diye görünemez.

       Bu vaka kusur ARAMAZ, SAYIYI YAZAR ve bir TAVAN tutar: ölçülen
       ikiz sayısı düşerse kırmızı yanar. Kapsamın tamamı R0 kütüğünde
       sahibi ve kapanış aşamasıyla duruyor. */
    const { readdirSync, readFileSync } = await import('node:fs');
    const hepsi = readdirSync('lib/eylemler2').filter((f) => f.endsWith('.demo.ts'));
    /* ── SAYIM İÇE AKTARIMDAN TÜRETİLİR, AD GEÇİŞİNDEN DEĞİL ───────────
       İlk yazım dosya metninde adın HERHANGİ BİR YERDE geçmesine
       bakıyordu ve `olculen` dizisini elle bir adla başlatıyordu
       (bağımsız inceleme, PR #51 tur 2): bir yorum satırına altı ad
       yazmak tabanı 10'a çıkarıyor, üstteki vaka silinse bile taban 4'te
       kalıyordu — yani "4/56 ölçülüyor" yalan olabilirdi.

       Bugün ölçülen şey GERÇEK BİR İÇE AKTARIMDIR: test dosyası ikizi
       `import … '@/lib/eylemler2/X.demo'` ile alıyor mu. Yorumlar ve
       dizeler ayıklanır; elle başlatılan liste yok. */
    const ICE_AKTARIM = /@\/lib\/eylemler2\/([A-Za-z0-9_.-]+)\.demo/g;
    const yorumsuz = (k: string) => k
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const olculen = new Set<string>();
    for (const dosya of readdirSync('tests').filter((f) => f.endsWith('.test.ts'))) {
      const kod = yorumsuz(readFileSync(`tests/${dosya}`, 'utf8'));
      for (const m of kod.matchAll(ICE_AKTARIM)) olculen.add(`${m[1]}.demo.ts`);
    }
    /* Ölçülen ikizler GERÇEKTEN var olmalı — ölü bir ad sayıyı şişirir. */
    const gercek = [...olculen].filter((f) => hepsi.includes(f));
    console.log(`POL-098 kapsamı: ${gercek.length}/${hepsi.length} demo ikizi `
      + `gerçek yolla ölçülüyor · ölçülmeyen ${hepsi.length - gercek.length}`);
    expect(hepsi.length, 'demo ikizi bulunamadı — vaka kalıbı bozuk').toBeGreaterThan(0);
    expect(gercek.length, 'ölçülen demo ikizi sayısı DÜŞTÜ — kapsam daraldı')
      .toBeGreaterThanOrEqual(4);
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
    /* POPÜLASYON DİŞİ: sıfır olayla "motor olaya dokunmadı" boş bir
       iddiadır — `[] === []` her zaman geçer. */
    expect(olayOnce.length, 'fikstürde olay yok — vaka boş küme ölçüyor')
      .toBeGreaterThan(0);
    const gonderilenOnce = await db.bildirimKaydi.count({
      where: { durum: { in: ['gonderildi', 'teyit_alindi'] } },
    });
    /* Motorun İŞLEYECEĞİ kayıt da ölçülür: hiç bildirim yükümlülüğü
       yoksa motor zaten hiçbir şey yapmaz ve vaka onun tembelliğini
       "politika" diye raporlar. */
    expect(await db.bildirimYukumlulugu.count(),
      'fikstürde bildirim yükümlülüğü yok — motor işleyecek bir şey bulamaz')
      .toBeGreaterThan(0);
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
    /* Motorun İŞLEYECEĞİ anlık da ölçülür: sıfır anlıkla motor hiçbir
       şey yapmaz ve "kayıt değiştirmedi" iddiası boşa döner. */
    expect(await db.topolojiAnlik.count(),
      'fikstürde topoloji anlığı yok — motor karşılaştıracak bir şey bulamaz')
      .toBeGreaterThan(0);
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
    /* FİKSTÜR KENDİ KURULUR. Tohumdaki açık bir bulguyu aramak iki
       yönden kırılgandı: PostgreSQL şablonunda o satır yok (ölçüldü —
       `kapi-postgres` kırmızı yandı) ve vaka bulguyu KAPATTIĞI için aynı
       veritabanında ikinci kez koşamıyordu. Kendi kaydını kuran vaka her
       sağlayıcıda ve her koşuda aynı şeyi ölçer. */
    const b = await db.veriKalitesiBulgusu.create({
      data: {
        kural: 'kritikligi_bilinmeyen', kaynakTipi: 'Tesis',
        kaynakId: `kurgusal-${damga}`, durum: 'acik',
        aciklama: 'Kurgusal prova bulgusu — geri alınamazlık ölçümü.',
      },
    });
    const { veriKalitesiBulgusuKapat } = await import('@/lib/eylemler2/varlikDurusu');

    const ilk = await veriKalitesiBulgusuKapat({
      bulguId: b.id, karar: 'kabul_edildi', gerekce: 'Kurgusal prova: kabul edildi.',
    });
    expect(ilk.ok, ilk.ok ? '' : ilk.hata).toBe(true);
    const kapali = await db.veriKalitesiBulgusu.findUnique({ where: { id: b.id } });
    expect(kapali?.durum).toBe('kapandi');

    const onceIz = await izSayisi();
    const ikinci = await veriKalitesiBulgusuKapat({
      bulguId: b.id, karar: 'giderildi', gerekce: 'Kurgusal prova: ikinci karar denemesi.',
    });
    expect(ikinci.ok, 'kapanmış bulgu ikinci kez karara bağlandı').toBe(false);
    const sonra = await db.veriKalitesiBulgusu.findUnique({ where: { id: b.id } });
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
    /* POPÜLASYON DİŞİ: kayıt hiç yoksa `once?.degerJson` ve
       `sonra?.degerJson` ikisi de `undefined` olur ve "ayar DEĞİŞMEZ"
       yarısı hiçbir şey ölçmez. Bu yüzden vaka kendi fikstürünü kurar —
       reddin ölçüleceği bir DEĞER olmalı. */
    if (!(await oku())) {
      await db.yapilandirma.create({ data: {
        anahtar: 'saha.yerlesim',
        degerJson: JSON.stringify({ kpi: [], sutunlar: [] }) } });
    }
    const once = await oku();
    expect(once, 'vaka boş küme ölçüyor: saha.yerlesim kaydı yok').not.toBeNull();
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
    const { AYAR_SOZLUGU } = await import('@/lib/yapilandirma/tanimlar');
    /* ── ERKEN ÇIKIŞ YOK (bağımsız inceleme bulgusu, PR #51 tur 1) ──────
       Eski hâl `if (!s.ok) { …tek dize kontrolü…; return; }` idi: eylem
       BAŞKA bir sebeple düşerse (anahtar kaybolur, sınıf değişir, şema
       kayar) vaka hiçbir şey ölçmeden yeşil bitiyordu. Dosyanın kendi
       kuralı "HER VAKA İKİ ŞEY ÖLÇER" — ölçmeyen bir dal o kuralın
       kaçış kapısıdır.

       Bugün önkoşul ÖNCE ölçülür (anahtar var mı, B sınıfı mı),
       sonra `s.ok` MUTLAK olarak beklenir. */
    const anahtar = 'motor.son_tarih.bulgu_gun';
    const tanim = AYAR_SOZLUGU[anahtar];
    expect(tanim, `vaka olmayan bir ayarı sürüyor: ${anahtar}`).toBeTruthy();
    expect(tanim?.sinif, 'vaka onay akışı olmayan bir ayarı sürüyor').toBe('B');
    const once = await ayarOku(anahtar);
    const talepOnce = await db.degisiklikTalebi.count({
      where: { hedefTipi: 'ayar', hedefId: anahtar, durum: 'incelemede' } });
    const s = await degisiklikOner({
      hedefTipi: 'ayar', hedefId: anahtar,
      sonra: { anahtar, deger: Number(once.deger) + 1 },
      gerekce: 'Kurgusal prova: öneri açılıyor, karar beklenecek.',
    });
    expect(s.ok, s.ok ? '' : `öneri açılamadı: ${s.hata}`).toBe(true);
    const sonra = await ayarOku(anahtar);
    expect(sonra.deger, 'öneri açmak kaynağı DEĞİŞTİRDİ').toEqual(once.deger);
    /* İkinci tanık: öneri GERÇEKTEN açıldı. Kaynağın değişmemesi, hiç
       öneri açılmadıysa da doğrudur — o hâlde ölçülen şey politika
       değil, hiçliktir. Talep `incelemede` durumunda doğar. */
    expect(await db.degisiklikTalebi.count({
      where: { hedefTipi: 'ayar', hedefId: anahtar, durum: 'incelemede' } }),
      'öneri kaydı yazılmadı — vaka gerçek yolu sürmüyor')
      .toBe(talepOnce + 1);
  });
});

describe('POL-041 · "Platform bilinmeyeni sıfırdan ayırır… 0 yazılmaz" [SIS-DGM-001]', () => {
  it('HİÇ BAŞARILI connector koşusu yokken veri kesiti damgası NULL — sistem saati değil', async () => {
    /* Yardım ekranının cevabı bir MEKANİZMA adlandırıyor: "hiçbir
       bağlayıcı koşmadıysa veri kesiti damgası '—'dır; sistem saati
       damga diye gösterilmez." Gerçek yol o mekanizmadır. */
    const { kabukVerisi } = await import('@/components/kabuk/kabukVerisi');
    /* ── MEKANİZMA `Connector.sonBasariliKosu`DIR ──────────────────────
       Vaka eskiden damgayı `EntegrasyonKosusu` kayıtlarıyla
       karşılaştırıyordu — YANLIŞ TABLO. `durumAyagiVerisi` damgayı
       `Connector.sonBasariliKosu` alanının `_max`ından alır (`silindi:
       null` süzgeciyle). Tohumda yedi başarılı `EntegrasyonKosusu`
       satırı VAR ve hiçbir connector'da `sonBasariliKosu` YOK; yani
       eski karşılaştırma hiçbir zaman doğru şeye bakmıyordu ve `else`
       dalı hiç koşmuyordu. Bu, incelemenin işaretlediği "boş kümede
       koşan vaka" sınıfının bir örneğiydi. */
    const v = await kabukVerisi();
    /* İDDİANIN ÖZÜ: damga ya BİR KOŞUDAN gelir ya da YOKTUR. Üçüncü
       ihtimal — sistem saatini damga diye göstermek — "veri taze" demek
       olurdu; ölçülen tam olarak budur.

       İKİ DAL AYNI ŞEYİ ÖLÇMEZ ve bu bilerek yazılmıştır — bağımsız
       inceleme (PR #51, tur 1) eski hâlin `null` dalını TAUTOLOJİ diye
       işaretledi ve haklıydı: `expect(v.kesit).toBeNull()` az önce
       girilen dalın koşulunu tekrar ediyordu. Bugün `null` dalı da bir
       şey ölçer: damga yoksa BAŞARILI BİR KOŞU DA OLMAMALIDIR. Başarılı
       koşu varken "—" göstermek, bilineni bilinmeyen saymaktır ve
       "bilinmeyen ≠ sıfır" kuralının ters yönüdür. */
    const enSon = async () => (await db.connector.aggregate({
      where: { silindi: null }, _max: { sonBasariliKosu: true },
    }))._max.sonBasariliKosu;

    /* DAL 1 · BİLİNMEYEN. Hiçbir connector başarıyla koşmadıysa damga
       NULL olmalı — bugünün tarihi değil. */
    expect(await enSon(), 'önkoşul: fikstürde başarılı koşu olmamalı').toBeNull();
    expect(v.kesit, 'başarılı koşu yokken damga uydurulmuş — sistem saati '
      + 'damga diye gösteriliyor').toBeNull();

    /* DAL 2 · BİLİNEN. Gerçek yol sürülür: bir connector'a başarılı koşu
       yazılır ve damganın TAM O DEĞER olduğu ölçülür. İki dal da
       fikstüre bağlı değildir; ikisi de her koşumda koşar. */
    const c = await db.connector.findFirst({ where: { silindi: null }, select: { id: true } });
    expect(c, 'fikstürde connector yok — vaka boş küme ölçüyor').not.toBeNull();
    const damga = new Date('2026-03-04T05:06:07.000Z');
    await db.connector.update({ where: { id: c!.id }, data: { sonBasariliKosu: damga } });
    try {
      const v2 = await kabukVerisi();
      expect(v2.kesit, 'damga koşudan gelmiyor — uydurulmuş').toBe(damga.toISOString());
    } finally {
      /* Fikstür GERİ ALINIR: sonraki vakalar bu yazımı görmemeli. */
      await db.connector.update({ where: { id: c!.id }, data: { sonBasariliKosu: null } });
    }
    expect(await enSon(), 'fikstür geri alınmadı').toBeNull();
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
    /* POPÜLASYON DİŞİ: sıfır kayıtla `for` gövdesi hiç koşmaz ve
       "sunucunun yazdığı her kayıt kökenlidir" iddiası ölçülmemiş olur.
       Fikstür boşsa vaka KENDİ kaydını kurar — kuru koşusuyla birlikte,
       çünkü ölçülen şey kökenin VARLIĞIDIR. */
    if (uygulananlar.length === 0) {
      /* FİKSTÜR KENDİ KURULUR. Tohumda `DegerlendirmeAktarimi` SIFIR
         satırdır (ölçüldü) — yani bu yarı bugüne kadar hiç koşmamıştı.
         Köken bir SELF-RELATION'dır: uygulama kaydı kendi kuru
         koşusuna bağlanır. */
      const r = await db.regulasyon.findFirst({ select: { id: true } });
      const ko = await db.kapsamOgesi.findFirst({ select: { id: true } });
      expect(r, 'fikstürde regülasyon yok — vaka kurulamıyor').not.toBeNull();
      expect(ko, 'fikstürde kapsam öğesi yok — vaka kurulamıyor').not.toBeNull();
      const kuru = await db.degerlendirmeAktarimi.create({ data: {
        regulasyonId: r!.id, kapsamOgesiId: ko!.id, kaynakAdi: 'kurgusal-prova.csv',
        durum: 'kuru_kosu', okunan: 1, eslesen: 1, elenen: 0, degisen: 0 },
        select: { id: true } });
      const yeniKayit = await db.degerlendirmeAktarimi.create({ data: {
        regulasyonId: r!.id, kapsamOgesiId: ko!.id, kaynakAdi: 'kurgusal-prova.csv',
        durum: 'uygulandi', kuruKosuId: kuru.id, okunan: 1, eslesen: 1,
        elenen: 0, degisen: 1 }, select: { id: true, kuruKosuId: true } });
      uygulananlar.push(yeniKayit);
    }
    expect(uygulananlar.length, 'vaka boş küme ölçüyor').toBeGreaterThan(0);
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
    /* POPÜLASYON DİŞİ: sıfır keşif kaydıyla "CMDB'ye yazmadı" boş bir
       iddiadır — eşleştirecek hiçbir şey yoktur. */
    expect(await db.kesifKaydi.count(),
      'fikstürde keşif kaydı yok — vaka boş küme ölçüyor').toBeGreaterThan(0);
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
