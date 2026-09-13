import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · S1 · SUNUCU EYLEMİNİN KAPSAM VE YETKİ CÜMLELERİ [SIS-YTK-011]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   R-F'in türeticisi önce yalnız `app/**` tarıyordu. Bağımsız inceleme
   (#50 tur 1) bunun bir körlük olduğunu gösterdi: sunucu eyleminin
   fırlattığı mesaj EKRANDA görünür (`hata()` onu kullanıcıya yazar) ve
   o mesajların çoğu bir YETKİ ya da KAPSAM iddiasıdır — yani S1.

   Kapsam genişleyince 20 ölçülmemiş S1 satırı ortaya çıktı. S1'in
   tavanı SIFIRDIR ve gerekçeli istisna kabul edilmez; kuralın kendisi
   bu turda yazıldı ve ilk sınavı kendi genişlemesi oldu.

   ── ÖLÇÜLEN İDDİALAR ──────────────────────────────────────────────────
   POL-081  "Anahtar iptal edilmiş; kapsamı değiştirilemez."
   POL-088  "Bu görevi yalnız sorumlusu ya da uyum onay yetkisi olan
             kapatabilir"
   POL-090  "Bu kaydın kapsam öğesi yok — karar yazılamaz"
   POL-117  "Hiçbir maddeye bağlı olmayan kanıt yalnız kapsamsız uyum
             onay yetkisiyle düzenlenebilir; kapsamı bilinmiyor."
   POL-120  "Kapanmış denetimin kapsamı değiştirilemez"
   POL-131  "Silinmiş connector kapsamı değiştirilemez"
   POL-079  "<kapsam> yapılandırma JSON'una yazılamaz."

   Her vaka GERÇEK sunucu eylemini çağırır ve İKİ şeyi birden ölçer:
   eylem REDDEDER **ve** kayıt DEĞİŞMEZ. Yalnız reddi ölçmek yetmez —
   reddeden ama yan etkisini çoktan yazmış bir eylem de "reddetti"
   görünürdü.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-s1-eylem-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');
const { apiAnahtariKapsamGuncelle } = await import('@/lib/eylemler2/apiAnahtari');
const { gorevDurum } = await import('@/lib/eylemler2/gorev');
const { kanitKaydet } = await import('@/lib/eylemler2/kanit');
const { kapsamCikar } = await import('@/lib/eylemler2/denetim');
const { connectorKapsamKaydet, connectorKaydet } = await import('@/lib/eylemler2/entegrasyon');
const { uygulanabilirlikOverride } = await import('@/lib/eylemler2/tesis360');
const { kanitPaketiUretEylem } = await import('@/lib/eylemler2/disaAktarim');
const { redKaydiIncele } = await import('@/lib/eylemler2/reddedilenKayit');

const damga = Date.now();
type Yetki = {
  rol: string; modul: string | null; tesisId: string | null;
  surecId: string | null; regulasyonId: string | null;
};
const oturum = {
  id: '', adSoyad: 'Kurgusal S1 eylem', eposta: `s1e-${damga}@kurgusal.local`,
  unvan: null, yetkiler: [] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const rol = (r: string, tesisId: string | null = null): Yetki[] =>
  [{ rol: r, modul: null, tesisId, surecId: null, regulasyonId: null }];

/** Başka bir kullanıcı — "yalnız sorumlusu" iddiası için gerekli. */
let baskasiId = '';

beforeAll(async () => {
  oturum.id = (await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: 'Kurgusal S1 eylem', aktif: true },
  })).id;
  baskasiId = (await db.kullanici.create({
    data: { eposta: `baska-${damga}@kurgusal.local`, adSoyad: 'Kurgusal başkası', aktif: true },
  })).id;
});

afterAll(async () => {
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

describe('POL-081 · İPTAL EDİLMİŞ anahtarın kapsamı değişmez [SIS-YTK-011]', () => {
  it('iptalli anahtarda kapsam güncellemesi REDDEDİLİR, kapsam AYNI kalır [SIS-YTK-011]', async () => {
    oturum.yetkiler = rol('yonetici');
    const anahtar = await db.apiAnahtari.create({
      data: {
        ad: `Kurgusal iptalli ${damga}`, onEk: `kur${damga}`.slice(0, 12),
        tokenHash: `kurgusal-hash-${damga}`, kapsamJson: '["okuma"]',
        iptalZamani: new Date(), kullaniciId: oturum.id, olusturanId: oturum.id,
      },
    });
    /* Kapsam GEÇERLİ verilir: iddia "boş kapsam reddedilir" değil,
       "İPTAL EDİLMİŞ anahtarın kapsamı değişmez". Geçersiz bir kapsamla
       gelen red, ölçmek istediğimiz kapıyı hiç sınamazdı. */
    const s = await apiAnahtariKapsamGuncelle({
      id: anahtar.id, uclar: ['facilities'], saltOkunur: true,
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('değiştirilemez');
    const sonra = await db.apiAnahtari.findUniqueOrThrow({ where: { id: anahtar.id } });
    expect(sonra.kapsamJson, 'kapatılmış kapının kapsamı yazıldı').toBe('["okuma"]');
  });
});

describe('POL-088 · görevi YALNIZ sorumlusu ya da onay yetkisi kapatır [SIS-YTK-011]', () => {
  it('BAŞKASININ görevini onaysız rol kapatamaz ve durum DEĞİŞMEZ [SIS-YTK-011]', async () => {
    /* `tesis_yoneticisi` uyumda YAZAR ama ONAYLAMAZ — ayrım tam burada. */
    oturum.yetkiler = rol('tesis_yoneticisi');
    const gorev = await db.gorev.create({
      data: {
        baslik: `Kurgusal görev ${damga}`, tip: 'manuel',
        sorumluId: baskasiId, durum: 'acik',
      },
    });
    const s = await gorevDurum({ id: gorev.id, durum: 'tamamlandi' });
    expect(s.ok).toBe(false);
    const sonra = await db.gorev.findUniqueOrThrow({ where: { id: gorev.id } });
    expect(sonra.durum, 'başkasının görevi kapatıldı').toBe('acik');
    expect(sonra.kapanis).toBeNull();
  });

  it('UYUM ONAY yetkisi olan rol kapatabilir — kapı sıkı ama kilitli değil [SIS-YTK-011]', async () => {
    oturum.yetkiler = rol('yonetici');
    const gorev = await db.gorev.create({
      data: {
        baslik: `Kurgusal görev onaylı ${damga}`, tip: 'manuel',
        sorumluId: baskasiId, durum: 'acik',
      },
    });
    const s = await gorevDurum({ id: gorev.id, durum: 'tamamlandi' });
    expect(s.ok).toBe(true);
  });
});

describe('POL-117 · ÖKSÜZ kanıt kapsamsız onay yetkisi ister [SIS-YTK-011]', () => {
  it('maddeye bağlı OLMAYAN kanıtı dar kapsamlı rol DÜZENLEYEMEZ [SIS-YTK-011]', async () => {
    /* "Kapsamı yok" ile "her kapsamda" aynı şey değildir: öksüz kanıta
       tesise kısıtlı bir rol dokunamaz. */
    const tesis = await db.tesis.findFirstOrThrow({ select: { id: true } });
    const kanit = await db.kanit.create({
      data: { ad: `Kurgusal öksüz kanıt ${damga}`, tip: 'politika' },
    });
    expect(await db.kanitBaglantisi.count({ where: { kanitId: kanit.id } })).toBe(0);
    oturum.yetkiler = rol('tesis_yoneticisi', tesis.id);
    const s = await kanitKaydet({ id: kanit.id, ad: `Değiştirilmiş ${damga}`, tip: 'politika' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('kapsamı bilinmiyor');
    const sonra = await db.kanit.findUniqueOrThrow({ where: { id: kanit.id } });
    expect(sonra.ad, 'öksüz kanıt dar kapsamlı rolce değiştirildi')
      .toBe(`Kurgusal öksüz kanıt ${damga}`);
  });
});

describe('POL-120 · KAPANMIŞ denetimin kapsamı değişmez [SIS-YTK-011]', () => {
  it('kapanış aşamasındaki denetimden kapsam ÇIKARILAMAZ [SIS-YTK-011]', async () => {
    oturum.yetkiler = rol('yonetici');
    const denetim = await db.denetim.findFirst({
      where: { kapsamlar: { some: {} } },
      select: { id: true, durum: true, kapsamlar: { select: { id: true }, take: 1 } },
    });
    if (!denetim || denetim.kapsamlar.length === 0) {
      throw new Error('fikstürde kapsamlı denetim yok — ölçüm koşamaz');
    }
    const oncekiDurum = denetim.durum;
    await db.denetim.update({ where: { id: denetim.id }, data: { durum: 'kapanis' } });
    const kapsamId = denetim.kapsamlar[0].id;
    const s = await kapsamCikar({ id: kapsamId });
    expect(s.ok).toBe(false);
    expect(await db.denetimKapsami.count({ where: { id: kapsamId } }),
      'kapanmış denetimin kapsam satırı silindi').toBe(1);
    await db.denetim.update({ where: { id: denetim.id }, data: { durum: oncekiDurum } });
  });
});

describe('POL-131 · SİLİNMİŞ connectorın kapsamı değişmez [SIS-YTK-011]', () => {
  it('silinmiş connectorda kapsam kaydı REDDEDİLİR, kapsam AYNI kalır [SIS-YTK-011]', async () => {
    oturum.yetkiler = rol('yonetici');
    const c = await db.connector.create({
      data: {
        kod: `KURGU-SIL-${damga}`, ad: `Kurgusal silinmiş ${damga}`,
        tip: 'manual_import', kaynakSistem: 'kurgusal',
        silindi: new Date(), kapsamTesisleriJson: '[]',
      },
    });
    const s = await connectorKapsamKaydet({ connectorId: c.id, tesisKodlari: ['KURGU-1'] });
    expect(s.ok).toBe(false);
    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.kapsamTesisleriJson, 'silinmiş connectorın kapsamı yazıldı').toBe('[]');
  });
});

describe('POL-079 · kapsam YAPILANDIRMA JSON\'undan yazılamaz [SIS-YTK-011]', () => {
  it('yapılandırmaya gömülen kapsam REDDEDİLİR — iki kaynak, iki gerçek [SIS-YTK-011]', async () => {
    /* Kapsam iki yerden yazılabilseydi ekranda görünen kapsam ile
       uygulanan kapsam ayrışırdı; kapı bunun için var. */
    oturum.yetkiler = rol('yonetici');
    const s = await connectorKaydet({
      kod: `KURGU-KPS-${damga}`, ad: `Kurgusal kapsamlı ${damga}`, tip: 'manual_import',
      kaynakSistem: 'kurgusal', yapilandirmaJson: '{"kapsamTesisKodlari":["KURGU-1"]}',
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('yazılamaz');
    expect(await db.connector.count({ where: { kod: `KURGU-KPS-${damga}` } }),
      'reddedilen connector yine de yazıldı').toBe(0);
  });
});

describe('POL-090 · KAPSAM ÖĞESİ olmayan kayda karar yazılmaz [SIS-YTK-011]', () => {
  it('öğesiz kayıtta uygulanabilirlik kararı REDDEDİLİR [SIS-YTK-011]', async () => {
    /* Karar KAPSAM ÖĞESİNE yazılır (B1); köprüsü olmayan bir kayıt
       kararı nereye yazacağını bilmez ve ürün bir öğe UYDURMAZ. */
    oturum.yetkiler = rol('yonetici');
    const tesis = await db.tesis.create({
      data: { kod: `KURGU-OGESIZ-${damga}`, ad: `Kurgusal öğesiz ${damga}` },
    });
    expect(await db.kapsamOgesi.count({ where: { tesisId: tesis.id } })).toBe(0);
    const reg = await db.regulasyon.findFirstOrThrow({ select: { id: true } });
    const s = await uygulanabilirlikOverride({
      tesisId: tesis.id, regulasyonId: reg.id, uygulanabilir: true,
      gerekce: 'Kurgusal gerekçe — ölçüm için yazıldı.',
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('kapsam öğesi yok');
  });
});

describe('POL-113 · DENETİM okuma yetkisi olmadan kanıt paketi üretilemez [SIS-YTK-011]', () => {
  it('denetim modülünde okuması OLMAYAN rol paket üretemez [SIS-YTK-011]', async () => {
    /* `risk_sahibi` yalnız risk ve uyum okur; denetim modülü kapalıdır. */
    oturum.yetkiler = rol('risk_sahibi');
    /* Girdi GEÇERLİ verilir: iddia "boş tesis listesi reddedilir" değil,
       "denetim okuması olmayan rol paket ÜRETEMEZ". Geçersiz girdiyle
       gelen bir red, ölçmek istediğimiz kapıyı hiç sınamazdı. */
    const reg = await db.regulasyon.findFirstOrThrow({ select: { id: true } });
    const tesis = await db.tesis.findFirstOrThrow({ select: { id: true } });
    const s = await kanitPaketiUretEylem({
      regulasyonId: reg.id, tesisIdleri: [tesis.id],
      baslangic: '2026-01-01', bitis: '2026-09-10',
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('kanıt paketi üretilemez');
  });
});

describe('POL-112 · DENETİM İZİ salt okunur — veritabanı reddeder [SIS-YTK-011]', () => {
  /* Ekran "veritabanı tetikleyicisi bu kütükte güncelleme ve silmeyi
     REDDEDER" diyor. Bu iddia uygulama katmanında değil, ŞEMADA yaşıyor
     ve tek ölçme yolu veritabanına gerçekten yazmayı denemektir: kodu
     okuyarak "biz zaten güncellemiyoruz" demek, iddianın söylediği şeyi
     (veritabanı reddeder) hiç sınamaz. */
  it('iz satırı GÜNCELLENEMEZ — tetikleyici reddeder [SIS-YTK-011]', async () => {
    const kayit = await db.aktiviteKaydi.create({
      data: {
        varlikTipi: 'KurgusalVarlik', varlikId: `kurgu-${damga}`,
        eylem: 'olusturma', gerekce: 'Kurgusal iz — ölçüm için.',
      },
    });
    await expect(db.aktiviteKaydi.update({
      where: { id: kayit.id }, data: { gerekce: 'DEĞİŞTİRİLDİ' },
    })).rejects.toThrow();
    const sonra = await db.aktiviteKaydi.findUniqueOrThrow({ where: { id: kayit.id } });
    expect(sonra.gerekce).toBe('Kurgusal iz — ölçüm için.');
  });

  it('iz satırı SİLİNEMEZ — tetikleyici reddeder [SIS-YTK-011]', async () => {
    const kayit = await db.aktiviteKaydi.create({
      data: {
        varlikTipi: 'KurgusalVarlik', varlikId: `kurgu-sil-${damga}`,
        eylem: 'olusturma', gerekce: 'Kurgusal iz — silme denemesi.',
      },
    });
    await expect(db.aktiviteKaydi.delete({ where: { id: kayit.id } })).rejects.toThrow();
    expect(await db.aktiviteKaydi.count({ where: { id: kayit.id } })).toBe(1);
  });

  it('EKLEME açıktır — kütük yalnız büyür [SIS-YTK-011]', async () => {
    /* Her yazmayı reddeden bir tetikleyici de "salt okunur" iddiasını
       sağlar görünürdü; iz kütüğünün ÇALIŞMASI da ölçülür. */
    const once = await db.aktiviteKaydi.count();
    await db.aktiviteKaydi.create({
      data: {
        varlikTipi: 'KurgusalVarlik', varlikId: `kurgu-ek-${damga}`,
        eylem: 'olusturma', gerekce: 'Kurgusal iz — ekleme.',
      },
    });
    expect(await db.aktiviteKaydi.count()).toBe(once + 1);
  });
});

describe('POL-097 · connector yapılandırmak YÖNETİM YAZMA ister [SIS-YTK-011]', () => {
  it('yönetim yazması OLMAYAN rol connector kaydedemez, satır AÇILMAZ [SIS-YTK-011]', async () => {
    /* Ekran "Bu ekrandan yalnız okuyabilirsiniz" diyor; iddianın öbür
       yüzü sunucudadır ve ölçülen odur — ekranın düğmeyi gizlemesi,
       sunucunun aynı cevabı verdiğini KANITLAMAZ. */
    oturum.yetkiler = rol('okuyucu');
    const kod = `KURGU-YET-${damga}`;
    const s = await connectorKaydet({
      kod, ad: `Kurgusal yetkisiz ${damga}`, tip: 'manual_import',
      kaynakSistem: 'kurgusal',
    });
    expect(s.ok).toBe(false);
    expect(await db.connector.count({ where: { kod } }),
      'okuyucu rolü connector açtı').toBe(0);
  });

  it('yönetim YAZMASI olan rol kaydedebilir — kapı kilitli değil [SIS-YTK-011]', async () => {
    oturum.yetkiler = rol('yonetici');
    const kod = `KURGU-YET-OK-${damga}`;
    const s = await connectorKaydet({
      kod, ad: `Kurgusal yetkili ${damga}`, tip: 'manual_import',
      kaynakSistem: 'kurgusal',
    });
    expect(s.ok).toBe(true);
    expect(await db.connector.count({ where: { kod } })).toBe(1);
  });
});

describe('POL-130 · düşen kayıt HAM HÂLİYLE saklanır [SIS-YTK-011]', () => {
  it('reddedilen kaydın ham gövdesi DEĞİŞMEDEN durur [SIS-YTK-011]', async () => {
    /* Ekranın cümlesi: "Bir connector koşusunda düşen her kayıt —
       şemadan, eşlemeden, doğrulamadan ya da kapsamdan — burada ham
       hâliyle görünür." Ham gövde dokunulmazdır: normalleştirilmiş
       hâli saklayıp hamı atmak, kaydın neden düştüğünü sonsuza kadar
       tartışılır bırakırdı. */
    const ham = JSON.stringify({ kurgusalAlan: 'ham değer', sayi: 42 });
    const kayit = await db.reddedilenKayit.create({
      data: {
        kaynakSistem: 'kurgusal', asama: 'kapsam', sebep: 'Kapsam dışı',
        hamJson: ham, durum: 'acik',
      },
    });
    oturum.yetkiler = rol('yonetici');
    /* İnceleme NOTU zorunludur; notsuz bir çağrı kapıdan döner ve
       ölçmek istediğimiz şeyi (kararın ham gövdeye dokunmaması) hiç
       sınamazdı. */
    const s = await redKaydiIncele({
      idler: [kayit.id], durum: 'incelendi',
      not: 'Kurgusal inceleme notu — ölçüm için yazıldı.',
    });
    expect(s.ok).toBe(true);
    const sonra = await db.reddedilenKayit.findUniqueOrThrow({ where: { id: kayit.id } });
    /* Karar DURUMU değiştirir; HAM GÖVDEYE dokunmaz. */
    expect(sonra.durum).toBe('incelendi');
    expect(sonra.hamJson, 'ham gövde karar sırasında değişti').toBe(ham);
  });
});
