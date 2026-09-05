import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   TERS KAPSAMA · SUNUCU EYLEMLERİ, MOTORLAR VE KUYRUK

   `arac/ters-kapsam.mjs` kaynak koddan davranış envanteri çıkarıp kütükle
   karşılaştırdığında yirmi bir sunucu eylemi, beş motor girişi ve bir
   kuyruk kaydı "hiçbir senaryo işaretli testte geçmiyor" çıktı. Kapsam
   raporu bunları göremezdi: bir eylem hiç çağrılmıyorsa satırları
   kapsanmamış görünür ama kimse bunun bir BOŞLUK olduğunu söylemez.

   Buradaki testlerin çoğu MUTLU YOL DEĞİL. Sebebi kasıtlı: bir eylemin
   en pahalı kusuru, reddetmesi gereken şeyi kabul etmesidir. Kapsam
   kapısı, gerekçe zorunluluğu, tip uyuşmazlığı, karara bağlanmış kaydın
   yeniden karara açılması — kırıldığında sessizce yanlış veri üreten
   yerler bunlar.

   Yetki kapısı SAHTELENMEZ; yalnız `aktifKullanici` değiştirilir. Kapının
   kendisi (`yetkiZorunlu` → `izinVar` → `kapsamUyar`) gerçek kodda koşar.
   ═══════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-ters-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

type Yetki = {
  rol: string; surecId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const yetki = (rol: string, tesisId: string | null = null): Yetki => ({
  rol, surecId: null, tesisId, tuzelKisiId: null, regulasyonId: null, modul: null,
});

const oturum = {
  id: '', adSoyad: 'Ters Kapsama', eposta: 'ters@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');

const { bildirimKuraliSil } = await import('@/lib/eylemler2/bildirimYukumlulugu');
const { egitimMaddeCoz } = await import('@/lib/eylemler2/egitim');
const { connectorSenkronize, connectorKuruKosu, connectorEtkinlik } =
  await import('@/lib/eylemler2/entegrasyon');
const { eslemeSozlugu, eslemeProfiliBagla } = await import('@/lib/eylemler2/esleme');
const { gozdenGecirmeKarariDurum } = await import('@/lib/eylemler2/gozdenGecirme');
const { etkiOnerisiYenile } = await import('@/lib/eylemler2/olay');
const { temelOlarakOnayla, sapmadanBulguAc } = await import('@/lib/eylemler2/topoloji');
const { varlikAktarimYukle, varlikAktarimEsle, varlikAktarimReddet } =
  await import('@/lib/eylemler2/varlikAktarim');
const { alanUygulanabilirligiKaldir, firmwareIstisnasiKaydet } =
  await import('@/lib/eylemler2/varlikDurusu');
const { adimVarligiKaldir, ekipUyeligiKaldir } =
  await import('@/lib/eylemler2/varlikYonetisim');
const { yedekParcaVarlikCoz } = await import('@/lib/eylemler2/yedekParca');
const { modulSinifi } = await import('@/lib/eylemler2/yonetim');
const { zimmetSureSinirlari } = await import('@/lib/eylemler2/zimmet');

const { anlikGoruntuAl } = await import('@/lib/motorlar/anlik');
const { firmwareUyumunuIsle, agTutarliliginiIsle } = await import('@/lib/motorlar/varlikDurusu');
const { konfigDriftiniIsle, envanterGorunurluguIsle } =
  await import('@/lib/motorlar/varlikYonetisim');
const { kuyrukSaglayiciKaydet } = await import('@/lib/is/kuyruk');
const { genelEkranVerisi } = await import('@/app/(kabuk)/(flagship)/veri');
const { ZIMMET_VARSAYILAN_GUN, ZIMMET_AZAMI_GUN } = await import('@/lib/varlik/zimmet');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

/** Belirli bir kimlikle koşar, sonra oturumu yöneticiye geri alır. */
async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let tesisA = '';
let tesisB = '';
let turId = '';

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  const tesisler = await db.tesis.findMany({ select: { id: true }, take: 2, orderBy: { kod: 'asc' } });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
  turId = (await db.varlikTuru.findFirstOrThrow({ select: { id: true } })).id;
});

/* ══ Olay · bildirim yükümlülüğü ═══════════════════════════════════════ */

describe('bildirim kuralı', () => {
  it('kural SİLİNMEZ, pasifleştirilir — geçmiş olayın dayanağı kayıtta kalır [OLY-BLD-001]', async () => {
    const kural = await db.bildirimYukumlulugu.create({ data: {
      kod: benzersiz('BLD'), ad: 'Test yükümlülüğü', asgariSiddet: 'yuksek',
      sureSaat: 24, dayanak: 'Test mevzuatı m.1', merci: 'Test kurumu',
    } });

    const sonuc = await bildirimKuraliSil({ id: kural.id, gerekce: 'Yürürlükten kalktı' });
    expect(hataMetni(sonuc)).toBe('');

    /* Satır DURUYOR — yalnız pasif. Silinmiş olsaydı, o kurala göre
       değerlendirilmiş geçmiş olaylar dayanaksız kalırdı. */
    const sonra = await db.bildirimYukumlulugu.findUnique({ where: { id: kural.id } });
    expect(sonra).not.toBeNull();
    expect(sonra!.aktif).toBe(false);

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'BildirimYukumlulugu', varlikId: kural.id },
    });
    expect(iz?.yeniDeger).toBe('false');
  });
});

/* ══ Eğitim ════════════════════════════════════════════════════════════ */

describe('eğitim–madde bağı', () => {
  it('olmayan bağı kaldırmak hata vermez ve İZ YAZMAZ — idempotent [EGT-MDD-001]', async () => {
    const oncekiIz = await db.aktiviteKaydi.count({ where: { varlikTipi: 'Egitim' } });
    const sonuc = await egitimMaddeCoz({ id: 'boyle-bir-bag-yok' });
    expect(hataMetni(sonuc)).toBe('');
    /* Idempotent olmak "her çağrıda iz yaz" demek değildir: olmayan bir
       şeyi kaldırmak bir olay değildir ve denetim izini kirletmemeli. */
    expect(await db.aktiviteKaydi.count({ where: { varlikTipi: 'Egitim' } })).toBe(oncekiIz);
  });
});

/* ══ Sağlık · connector ════════════════════════════════════════════════ */

describe('connector koşusu', () => {
  it('kuru koşu hiçbir varlık kaydı YAZMAZ [SAG-KOS-001]', async () => {
    const c = await db.connector.findFirstOrThrow({ where: { kod: 'IMP-01' } });
    const once = await db.varlik.count();
    await connectorKuruKosu(c.id);
    /* Kuru koşunun tek sözü budur: denemek yazmak değildir. Koşu
       başarısız da olsa bu iddia geçerli kalmalı. */
    expect(await db.varlik.count()).toBe(once);
  });

  it('tanımsız tetikleyenle senkronizasyon reddedilir [SAG-KOS-002]', async () => {
    const c = await db.connector.findFirstOrThrow({ where: { kod: 'IMP-01' } });
    const once = await db.entegrasyonKosusu.count({ where: { connectorId: c.id } });
    const sonuc = await connectorSenkronize(c.id, 'kim_bilir');
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toMatch(/tetikleyen/i);
    /* Reddedilen tetikleyen bir KOŞU AÇMAZ: açsaydı sağlık ekranı
       hiç olmamış bir denemeyi geçmişe yazardı. */
    expect(await db.entegrasyonKosusu.count({ where: { connectorId: c.id } })).toBe(once);
  });

  it('sır referansı olmadan connector etkinleştirilemez [SAG-ETK-001]', async () => {
    const c = await db.connector.create({ data: {
      kod: benzersiz('TEST-CONN'), ad: 'Sırsız kaynak', tip: 'vuln_scanner',
      kaynakSistem: 'Test kaynağı', kimlikTipi: 'api_key', sirReferansi: null,
    } });
    const sonuc = await connectorEtkinlik(c.id, true);
    expect(hataMetni(sonuc)).toMatch(/[Ss]ır referansı/);
    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.etkin).toBe(false);
  });
});

/* ══ Eşleme tezgâhı ════════════════════════════════════════════════════ */

describe('eşleme sözlüğü ve profil bağı', () => {
  it('sözlük KOPYA verir; çağıran onu değiştirerek kaynağı bozamaz [ESL-SZL-001]', async () => {
    const bir = await eslemeSozlugu();
    const ilkAlan = bir.hedefAlanlar[0];
    const ilkEtiket = ilkAlan.etiket;
    ilkAlan.etiket = 'BOZULDU';
    bir.donusumler.length = 0;

    const iki = await eslemeSozlugu();
    expect(iki.hedefAlanlar[0].etiket).toBe(ilkEtiket);
    expect(iki.donusumler.length).toBeGreaterThan(0);
  });

  it('tipi tutmayan profil bağlanamaz [ESL-BAG-001]', async () => {
    const c = await db.connector.findFirstOrThrow({ where: { kod: 'IMP-01' } });
    const yabanci = await db.eslemeProfili.findFirstOrThrow({
      where: { connectorTipi: { not: c.tip } },
    });
    const sonuc = await eslemeProfiliBagla(c.id, yabanci.id);
    /* Hata İKİ tipi de adlandırmalı: kullanıcı hangisinin yanlış
       olduğunu ekrandan anlayabilmeli. */
    expect(hataMetni(sonuc)).toContain(yabanci.connectorTipi);
    expect(hataMetni(sonuc)).toContain(c.tip);
    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.eslemeProfilId).toBe(c.eslemeProfilId);
  });
});

/* ══ Gözden geçirme kararı ═════════════════════════════════════════════ */

describe('gözden geçirme kararı', () => {
  async function kararAc(durum = 'acik') {
    const gg = await db.yonetimGozdenGecirme.create({ data: {
      kod: benzersiz('GG'), baslik: 'Test toplantısı', tarih: new Date(),
      yurutenId: oturum.id,
    } });
    const gorev = await db.gorev.create({ data: {
      baslik: 'Karardan doğan iş', tip: 'gozden_gecirme',
      sorumluId: oturum.id, durum: 'acik',
    } });
    return db.gozdenGecirmeKarari.create({ data: {
      gozdenGecirmeId: gg.id, karar: 'Test kararı', durum, gorevId: gorev.id,
    } });
  }

  it('karar kapanınca bağlı görev de kapanır [GZD-KRR-001]', async () => {
    const karar = await kararAc();
    const sonuc = await gozdenGecirmeKarariDurum({ id: karar.id, durum: 'tamamlandi' });
    expect(hataMetni(sonuc)).toBe('');
    /* İki yerde ayrı ayrı kapatılması gereken bir iş, bir yerde açık
       kalır ve kuyrukta sonsuza kadar durur. */
    const gorev = await db.gorev.findUniqueOrThrow({ where: { id: karar.gorevId! } });
    expect(gorev.durum).toBe('tamamlandi');
    expect(gorev.kapanis).not.toBeNull();
  });

  it('karar iptali gerekçe ister [GZD-KRR-002]', async () => {
    const karar = await kararAc();
    const sonuc = await gozdenGecirmeKarariDurum({ id: karar.id, durum: 'iptal' });
    expect(hataMetni(sonuc)).toMatch(/gerekçe/i);
    const sonra = await db.gozdenGecirmeKarari.findUniqueOrThrow({ where: { id: karar.id } });
    expect(sonra.durum).toBe('acik');
    /* Görev de açık kalmalı: iptal olmadıysa iş de bitmedi. */
    const gorev = await db.gorev.findUniqueOrThrow({ where: { id: karar.gorevId! } });
    expect(gorev.durum).toBe('acik');
  });
});

/* ══ Olay etkisi · topoloji ════════════════════════════════════════════ */

describe('kapsam kapısı — olay ve topoloji', () => {
  it('kapsam dışı olayın etki önerisi yenilenemez [OLY-ETK-003]', async () => {
    const olay = await db.olay.findFirst({ where: { tesisId: { not: null } } });
    if (!olay) return expect(olay).not.toBeNull();
    const baskaTesis = olay.tesisId === tesisA ? tesisB : tesisA;

    const sonuc = await kimlikle(
      [yetki('santral_kullanicisi', baskaTesis)],
      () => etkiOnerisiYenile(olay.id),
    );
    expect(sonuc.ok).toBe(false);
  });

  it('kapsam dışı anlık temel onaylanamaz [TOP-TML-001]', async () => {
    const anlik = await db.topolojiAnlik.findFirst({ where: { tesisId: { not: null } } });
    if (!anlik) return expect(anlik).not.toBeNull();
    const baskaTesis = anlik.tesisId === tesisA ? tesisB : tesisA;

    const oncekiTemel = await db.topolojiAnlik.findFirst({
      where: { tesisId: anlik.tesisId, temelMi: true }, select: { id: true },
    });
    const sonuc = await kimlikle(
      [yetki('santral_kullanicisi', baskaTesis)],
      () => temelOlarakOnayla({ anlikId: anlik.id, gerekce: 'Test onayı denemesi' }),
    );
    expect(sonuc.ok).toBe(false);
    /* Yürürlükteki temel DEĞİŞMEMELİ — reddedilen bir onay bir yan
       etki bırakırsa kapı yalnız görünüşte kapalıdır. */
    const sonraTemel = await db.topolojiAnlik.findFirst({
      where: { tesisId: anlik.tesisId, temelMi: true }, select: { id: true },
    });
    expect(sonraTemel?.id ?? null).toBe(oncekiTemel?.id ?? null);
  });

  it('madde durumu bağlanmadan sapmadan bulgu açılamaz [TOP-BUL-001]', async () => {
    const sapma = await db.topolojiSapmasi.findFirst();
    if (!sapma) return expect(sapma).not.toBeNull();
    const once = await db.bulgu.count();
    const sonuc = await sapmadanBulguAc({
      sapmaId: sapma.id, maddeDurumuId: '', gerekce: 'Test bulgusu denemesi',
    });
    expect(sonuc.ok).toBe(false);
    /* Bağsız bir bulgu hangi maddeyi ihlal ettiğini söyleyemez; uyum
       matrisinde hiçbir hücreye düşmez ve kimse onu görmez. */
    expect(await db.bulgu.count()).toBe(once);
  });
});

/* ══ Varlık aktarımı ═══════════════════════════════════════════════════ */

describe('varlık aktarımı', () => {
  it('desteklenmeyen dosya türü aktarım kaydı AÇMAZ [VAK-YUK-001]', async () => {
    const once = await db.varlikAktarimi.count();
    const form = new FormData();
    form.set('dosya', new File(['etiket;ad\nA;B'], 'liste.txt', { type: 'text/plain' }));
    const sonuc = await varlikAktarimYukle(form);
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain('.txt');
    expect(await db.varlikAktarimi.count()).toBe(once);
  });

  it('boş dosya da reddedilir ve kayıt açmaz [VAK-YUK-001]', async () => {
    const once = await db.varlikAktarimi.count();
    const form = new FormData();
    form.set('dosya', new File([], 'bos.csv', { type: 'text/csv' }));
    const sonuc = await varlikAktarimYukle(form);
    expect(sonuc.ok).toBe(false);
    expect(await db.varlikAktarimi.count()).toBe(once);
  });

  it('etiket alanı eşlenmeden ilerlenemez [VAK-ESL-001]', async () => {
    const kayit = await db.varlikAktarimi.findFirstOrThrow({ where: { durum: 'eslesme' } });
    const sonuc = await varlikAktarimEsle({ id: kayit.id, esleme: { Ad: 'ad' } });
    /* `Varlik.etiket` benzersiz anahtardır: eşlenmezse her satır yeni
       bir varlık açar ve envanter sessizce ikiye katlanır. */
    expect(hataMetni(sonuc)).toMatch(/[Ee]tiket/);
    const sonra = await db.varlikAktarimi.findUniqueOrThrow({ where: { id: kayit.id } });
    expect(sonra.durum).toBe('eslesme');
  });

  it('onaylanmış aktarım reddedilemez [VAK-RED-001]', async () => {
    const kayit = await db.varlikAktarimi.findFirstOrThrow({ where: { durum: 'onaylandi' } });
    const sonuc = await varlikAktarimReddet({ id: kayit.id, gerekce: 'Test reddi' });
    expect(hataMetni(sonuc)).toMatch(/[Oo]naylanmış/);
    const sonra = await db.varlikAktarimi.findUniqueOrThrow({ where: { id: kayit.id } });
    expect(sonra.durum).toBe('onaylandi');
  });
});

/* ══ Varlık duruşu ve yönetişimi ═══════════════════════════════════════ */

describe('varlık alan işaretleri', () => {
  it('kapsam dışı varlığın uygulanamaz işareti kaldırılamaz [ENV-UYG-001]', async () => {
    const varlik = await db.varlik.findFirstOrThrow({
      where: { tesisId: tesisA, silindi: null }, select: { id: true },
    });
    await db.alanUygulanabilirligi.create({ data: {
      varlikTipi: 'Varlik', varlikId: varlik.id, alan: 'firmware',
      gerekce: 'Test işareti', kaydedenId: oturum.id,
    } });

    const sonuc = await kimlikle(
      [yetki('santral_kullanicisi', tesisB)],
      () => alanUygulanabilirligiKaldir({
        varlikId: varlik.id, alan: 'firmware', gerekce: 'Test kaldırma denemesi',
      }),
    );
    expect(sonuc.ok).toBe(false);
    const kalan = await db.alanUygulanabilirligi.count({
      where: { varlikTipi: 'Varlik', varlikId: varlik.id, alan: 'firmware' },
    });
    expect(kalan).toBe(1);
  });

  it('firmware istisnası uyum DURUMUNU değiştirmez [ENV-FRM-010]', async () => {
    /* GİRDİYİ TEST KURAR. Önceki hâli `firmwareUyumu.findFirstOrThrow()`
       ile veritabanında ne bulursa onu alıyordu ve bu sessiz bir
       varsayımdı: `FirmwareUyumu` TÜRETİLMİŞ veridir — `firmwareUyumunuIsle`
       motoru üretir, seed yazmaz. Geliştirme veritabanında motor koşmuş
       olduğu için test yerelde yeşildi; CI'nın taze seed'inde tablo boştu
       ve test P2025 ile kırıldı.

       Ayrım önemli: bu dosyadaki öbür koşulsuz `findFirstOrThrow()`
       çağrıları tesis, kullanıcı, madde gibi SEED'İN YAZDIĞI tablolara
       bakar ve taze veritabanında da doludur. Kusur "koşulsuz ilk kaydı
       al" deseninde değil, türetilmiş bir tabloyu seed sanmaktaydı.

       Kayıt önce silinip yeniden kurulur; böylece test her ortamda AYNI
       yolu koşar ve girdisi kendi elindedir. */
    const varlik = await db.varlik.findFirstOrThrow({
      where: { silindi: null }, select: { id: true },
    });
    await db.firmwareUyumu.deleteMany({ where: { varlikId: varlik.id } });
    /* Durum bilerek `eski`: `taban_yok` bir kayıtta "durum değişmedi"
       demek ucuzdur. Pahalı kusur, eski firmware'li bir cihazın istisna
       kaydedildikten sonra uyumlu görünmesidir; iddia onu sınamalı. */
    await db.firmwareUyumu.create({ data: {
      varlikId: varlik.id, kuruluSurum: '1.0.0', durum: 'eski',
      gerekce: 'Test girdisi: kurulu sürüm tabanın altında',
    } });

    const sonuc = await firmwareIstisnasiKaydet({
      varlikId: varlik.id,
      gerekce: 'Üretici yeni sürüm yayınlamadı; kabul edildi',
      yukseltmePlani: '2027 planlı duruşunda',
    });
    expect(hataMetni(sonuc)).toBe('');
    const sonra = await db.firmwareUyumu.findUniqueOrThrow({ where: { varlikId: varlik.id } });
    /* Cihaz hâlâ eski sürümdedir. İstisna "biliniyor ve kabul edildi"
       der; "artık uyumlu" DEMEZ. Durumu değiştirseydi risk raporu
       gerçekte yamalanmamış bir filoyu temiz gösterirdi. */
    expect(sonra.durum).toBe('eski');
    expect(sonra.istisnaGerekcesi).not.toBeNull();
    expect(sonra.yukseltmePlani).toBe('2027 planlı duruşunda');
  });
});

describe('bağ kaldırma eylemleri', () => {
  it('olmayan proses adımı bağı sessizce başarılı SAYILMAZ [ENV-PRS-001]', async () => {
    const sonuc = await adimVarligiKaldir({ bagId: 'boyle-bir-bag-yok' });
    expect(sonuc.ok).toBe(false);
  });

  it('olmayan ekip üyeliği sessizce başarılı SAYILMAZ [YTK-EKP-001]', async () => {
    const sonuc = await ekipUyeligiKaldir({
      ekipId: 'boyle-bir-ekip-yok', kullaniciId: oturum.id,
    });
    expect(sonuc.ok).toBe(false);
  });

  it('zaten çözülmüş yedek parça bağı ikinci kez çözülünce iz yazılmaz [YDP-BAG-001]', async () => {
    const once = await db.aktiviteKaydi.count({ where: { varlikTipi: 'YedekParca' } });
    const sonuc = await yedekParcaVarlikCoz({ id: 'boyle-bir-bag-yok' });
    expect(hataMetni(sonuc)).toBe('');
    expect(await db.aktiviteKaydi.count({ where: { varlikTipi: 'YedekParca' } })).toBe(once);
  });
});

/* ══ Kütük okumaları ═══════════════════════════════════════════════════ */

describe('kütükten okuyan eylemler', () => {
  it('tanımsız modül kodu bir sınıfa DÜŞMEZ, null döner [YON-MOD-003]', async () => {
    expect(await modulSinifi('boyle-bir-modul-yok')).toBeNull();
    /* Varsayılana düşseydi, bilinmeyen bir modül konsolda A sınıfı gibi
       görünür ve yetkisiz bir ayarın değiştirilebilir sanılmasına yol
       açardı. */
  });

  it('zimmet süre sınırları TEK kaynaktan gelir [ZIM-SUR-010]', async () => {
    const s = await zimmetSureSinirlari();
    expect(s.varsayilan).toBe(ZIMMET_VARSAYILAN_GUN);
    expect(s.azami).toBe(ZIMMET_AZAMI_GUN);
    expect(s.azami).toBeGreaterThanOrEqual(s.varsayilan);
  });
});

/* ══ Motorlar ══════════════════════════════════════════════════════════ */

describe('motorlar — ikinci koşu yeniden yazmaz', () => {
  it('uyum anlığı günde bir alınır [UYU-ANL-001]', async () => {
    await anlikGoruntuAl();
    const araSayi = await db.uyumAnlik.count();
    const ikinci = await anlikGoruntuAl();
    expect(ikinci.uretilen).toBe(0);
    expect(await db.uyumAnlik.count()).toBe(araSayi);
  });

  it('firmware kararı değişmediyse yeniden YAZILMAZ [ENV-FRM-011]', async () => {
    await firmwareUyumunuIsle();
    const ikinci = await firmwareUyumunuIsle();
    /* `hesaplanma` her koşuda tazelenseydi "bu karar ne zaman değişti"
       sorusu cevapsız kalırdı. */
    expect(ikinci.uretilen).toBe(0);
  });
});

describe('motorlar — ölçülemeyen ile sorunsuz ayrı yazılır', () => {
  it('segmenti atanmamış varlık için ölçüm BORCU açılır, bulgu değil [ENV-AGT-001]', async () => {
    const varlik = await db.varlik.create({ data: {
      etiket: benzersiz('TERS-AG'), ad: 'Ağ borcu deneği', turId,
      tesisId: tesisA, ipAdresi: '10.90.0.7', segmentId: null,
    } });

    await agTutarliliginiIsle();
    const kayitlar = await db.veriKalitesiBulgusu.findMany({
      where: { kaynakTipi: 'Varlik', kaynakId: varlik.id, durum: 'acik' },
      select: { kural: true },
    });
    expect(kayitlar.length).toBeGreaterThan(0);
    /* "Ölçemedik" ile "sorun var" AYNI kural adını taşıyamaz: taşısaydı
       ekran eşlenmemiş bir varlığı yanlış yapılandırılmış gösterirdi. */
    expect(kayitlar.every((k) => k.kural.endsWith('_olculemedi'))).toBe(true);
  });

  it('özeti olmayan yedek konfigürasyon SAPMASI açmaz [TAB-DRF-001]', async () => {
    const varlik = await db.varlik.create({ data: {
      etiket: benzersiz('TERS-KNF'), ad: 'Konfig temeli deneği', turId, tesisId: tesisA,
    } });
    const temel = await db.konfigTemeli.create({ data: {
      varlikId: varlik.id, ozetHash: 'a'.repeat(64), onaylayanId: oturum.id,
    } });

    await konfigDriftiniIsle();
    /* Varlığın hiç başarılı yedeği yok — gözlenen özet null. Karar
       verilemeyen durum sapma AÇMAZ; açsaydı özet hesaplayamayan bir
       kaynak bütün filoyu kırmızıya boyardı. */
    const sapmalar = await db.konfigSapmasi.count({ where: { temelId: temel.id } });
    expect(sapmalar).toBe(0);
  });

  it('"hiç görülmedi" ile "ağda görülmedi" ayrı kurallardır [ENV-GRN-001]', async () => {
    const varlik = await db.varlik.create({ data: {
      etiket: benzersiz('TERS-GRN'), ad: 'Görünürlük deneği', turId, tesisId: tesisA,
    } });

    await envanterGorunurluguIsle();
    const kayit = await db.veriKalitesiBulgusu.findFirst({
      where: { kaynakTipi: 'Varlik', kaynakId: varlik.id, durum: 'acik' },
      select: { kural: true },
    });
    /* Hiç keşfedilmemiş bir varlık "kayboldu" değildir: biri hiç
       ölçülmemiş, öteki ölçülüp eşiği aşmıştır. Tek kural adı altında
       toplansalardı, hiç taranmamış bir santral "cihazları kaybolmuş"
       gibi görünürdü. */
    expect(kayit?.kural).toBe('hic_gorulmedi');
    expect(kayit?.kural).not.toBe('agda_gorulmedi');
  });
});

/* ══ Kuyruk ════════════════════════════════════════════════════════════ */

describe('kuyruk sağlayıcısı', () => {
  it('aynı adla ikinci sağlayıcı sessizce ÜSTÜNE YAZMAZ [SIS-KYR-001]', () => {
    const ad = benzersiz('test-kuyruk');
    const saglayici = {
      ad,
      kuyrukla: async () => 'is-1',
      durum: async () => ({ bekleyen: 0, calisan: 0 }),
    };
    kuyrukSaglayiciKaydet(saglayici as never);
    /* Sessiz değişim en sinsi kusurdur: işler görünmez biçimde başka
       bir kuyruğa gider, eski kuyruk boş görünür ve kimse bir şey
       kaybettiğini anlamaz. */
    expect(() => kuyrukSaglayiciKaydet(saglayici as never)).toThrow(/zaten kayıtlı/);
    /* Açıkça istenirse izin verilir. */
    expect(() => kuyrukSaglayiciKaydet(saglayici as never, true)).not.toThrow();
  });
});

/* ══ Saha ekranı · eğilim ══════════════════════════════════════════════ */

describe('/ · Saha eğilim şeridi', () => {
  it('hiç anlık görüntü yoksa eğilim null kalır — düz sıfır çizgisi çizilmez [SAH-GRS-002]', async () => {
    /* Bu test dosyanın SONUNDA durur: `uyumAnlik` tablosunu boşaltır ve
       yukarıdaki motor testi (UYU-ANL-001) o tablonun dolu hâline
       bakar. Sıra bozulursa motor testi anlamını yitirir. */
    await db.uyumAnlik.deleteMany({});
    const veri = await genelEkranVerisi(oturum);
    /* Boş bir eğilim dizisi dönseydi ekran düz bir çizgi çizerdi ve
       "hiç ölçülmedi" ile "hiç değişmedi" aynı görünürdü. */
    expect(veri.egilim).toBeNull();
  });
});
