import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Connector yapılandırma tezgâhı ve sır sözleşmesi (§8).

   Bu dosyanın koruduğu üç cümle:

   1. BAĞLANAMAYAN ADAPTÖR TEST EDİLİNCE SAHTE BAŞARI DÖNMEZ. Sunucu
      eyleminin `ok:true` dönmesi "bağlandı" demek değildir; ekran
      `kimlik_bekleniyor`ı HATA olarak değil, bekleyen kurulum adımı
      olarak gösterir.
   2. SIR DEĞERİ FORMA VE İSTEMCİYE HİÇ GİTMEZ. Özet katmanının ürettiği
      hiçbir alanda sırrın kendisi bulunmaz; form varsayılanı da referansı
      geri doldurmaz.
   3. SAYAÇ SÖZLEŞMESİ DONDURULUR: alinan = kabul + red, yinelenen ⊆ kabul.

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı). */
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-saglik-connector-'));
const testDb = path.join(dizin, 't.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Sır DEĞERİ: bu metin hiçbir özette, hiçbir formda, hiçbir izde
   görünmemeli. Referans (`env:SAGLIK_TEST_SIRRI`) bir ADRESTİR ve
   görünebilir; ikisini ayıran tam olarak bu testtir. */
const SIR_DEGERI = 'sr-gizli-parola-9f3a2b7c-ASLA-GORUNMEMELI';
process.env.SAGLIK_TEST_SIRRI = SIR_DEGERI;

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
const { entegrasyonSagligiOzeti, connectorSagligi } =
  await import('@/lib/entegrasyon/saglikOzeti');
const { connectorTest } = await import('@/lib/eylemler2/entegrasyon');
const { connectorCalismaAyari } = await import('@/lib/eylemler2/connectorCalisma');
const { sirSaglayicilari, sirMaskesi } = await import('@/lib/entegrasyon/sir');
const M = await import('@/app/(atlas)/(operasyonel)/saglik/mantik');
const { aktifKullanici } = await import('@/lib/auth');

type ConnectorGirdi = Parameters<typeof connectorSagligi>[0];
type KosuGirdi = Parameters<typeof connectorSagligi>[1][number];

const SIMDI = new Date('2026-08-31T12:00:00Z');
const dkOnce = (dk: number) => new Date(SIMDI.getTime() - dk * 60_000);

const conn = (y: Partial<ConnectorGirdi> = {}): ConnectorGirdi => ({
  id: 'c1', kod: 'TT-01', ad: 'Test bağlantısı', tip: 'ad_entra',
  durum: 'etkin', kaynakSistem: 'ornek.local', kimlikTipi: 'none',
  sirReferansi: null, pollAralikDk: null, sonBasariliKosu: null,
  sonHata: null, etkin: true, imlec: null, ...y,
});

const kosu = (y: Partial<KosuGirdi> = {}): KosuGirdi => ({
  id: 'k1', durum: 'basarili', tetikleyen: 'zamanlanmis',
  baslangic: dkOnce(10), bitis: dkOnce(9), sureMs: 60_000,
  alinan: 10, kabulEdilen: 10, reddedilen: 0, yinelenen: 0, denemeNo: 1,
  imlecOnce: null, imlecSonra: null, hata: null, ayrinti: null, ...y,
});

let connectorId = '';

beforeAll(async () => {
  const kisi = await db.kullanici.create({ data: {
    eposta: 'saglik.tezgah@ornek.local', adSoyad: 'Sağlık Tezgâhı', aktif: true } });
  await db.yetki.create({ data: { kullaniciId: kisi.id, rol: 'yonetici' } });

  const token = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: kisi.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  oturum.token = token;

  /* `ad_entra` adaptörü `BaglanmamisAdaptor`dur: gerçek bir dış sisteme
     BAĞLANMAZ ve bunu açıkça söyler. Test tam olarak bunu ister — gerçek
     bir kuruma bağlanmayı değil. */
  const c = await db.connector.create({ data: {
    kod: 'TEZGAH-01', ad: 'Tezgâh testi', tip: 'ad_entra',
    kaynakSistem: 'entra.ornek.local', kimlikTipi: 'api_key',
    sirReferansi: 'env:SAGLIK_TEST_SIRRI', durum: 'taslak', etkin: false,
    ortam: 'uretim', senkronKipi: 'delta', ardisikHataSiniri: 5, ardisikHata: 2,
  } });
  connectorId = c.id;
});

/* ═══ 1 · Sahte başarı yasağı ════════════════════════════════════════ */

describe('Bağlanamayan adaptör test edilince SAHTE BAŞARI dönmez', () => {
  it('eylem ok:true döner ama baglandi:false — ikisi aynı şey değildir', async () => {
    const y = await connectorTest(connectorId);
    expect(y.ok).toBe(true);
    if (!y.ok) return;
    // `ok` eylemin koştuğunu söyler; bağlanmayı YALNIZ `baglandi` söyler.
    expect(y.baglandi).toBe(false);
    expect(y.kimlikEksik).toBe(true);
    expect(y.ayrinti).toMatch(/Bağlı değil/i);
    // Sır DEĞERİ ayrıntıya sızmaz.
    expect(y.ayrinti).not.toContain(SIR_DEGERI);
  });

  it('ekran bunu HATA olarak değil, bekleyen kurulum adımı olarak gösterir', async () => {
    const y = await connectorTest(connectorId);
    const sonuc = M.testSonucunuYorumla(y);
    expect(sonuc.tur).toBe('kimlik_bekleniyor');
    // `pl` = planlı/bekleyen. `bd` (hata) ya da `ok` (başarı) DEĞİL.
    expect(M.TEST_IM[sonuc.tur]).toBe('pl');
    expect(M.TEST_IM[sonuc.tur]).not.toBe('bd');
    expect(M.TEST_IM[sonuc.tur]).not.toBe('ok');
    expect(M.TEST_SOZU[sonuc.tur]).toContain('kurulum');
  });

  it('test kimlik eksikliğinde connector\'ı "hatali" damgalamaz', async () => {
    await connectorTest(connectorId);
    const c = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
    expect(c.durum).not.toBe('hatali');
    expect(c.durum).toBe('taslak');
  });

  it('yorumlayıcı ok:true + baglandi:false + kimlikEksik:false durumunu '
    + 'BAŞARILI saymaz', () => {
    const sonuc = M.testSonucunuYorumla({
      ok: true, baglandi: false, kimlikEksik: false, ayrinti: 'uç nokta 500 döndü' });
    expect(sonuc.tur).toBe('basarisiz');
    expect(M.TEST_IM[sonuc.tur]).toBe('bd');
  });

  it('eylemin kendisi patlarsa da başarı uydurulmaz', () => {
    const sonuc = M.testSonucunuYorumla({ ok: false, hata: 'Oturum gerekli' });
    expect(sonuc.tur).toBe('basarisiz');
    expect(sonuc.ayrinti).toBe('Oturum gerekli');
  });
});

/* ═══ 2 · Sır değeri hiçbir yüzeye çıkmaz ════════════════════════════ */

describe('Sır DEĞERİ forma ve istemciye hiç gitmez', () => {
  it('özet katmanının tamamında sır değeri geçmez; yalnız maskeli adres geçer', async () => {
    const k = await aktifKullanici();
    expect(k).not.toBeNull();
    const ozet = await entegrasyonSagligiOzeti(k!, { simdi: SIMDI });
    const seri = JSON.stringify(ozet);

    // Değer YOK…
    expect(seri).not.toContain(SIR_DEGERI);
    // …ama adres VAR: kullanıcı sırrın nerede aranacağını görmeli.
    expect(seri).toContain('SAGLIK_TEST_SIRRI');

    const c = ozet.connectorlar.find((x) => x.id === connectorId);
    expect(c).toBeDefined();
    expect(c!.sirMaskeli).toBe(sirMaskesi('env:SAGLIK_TEST_SIRRI'));
    // Ham referans alanı özet nesnesinde HİÇ YOK (şekil disiplini).
    expect(c).not.toHaveProperty('sirReferansi');
  });

  it('form varsayılanı kayıtlı referansı GERİ DOLDURMAZ', async () => {
    const k = await aktifKullanici();
    const ozet = await entegrasyonSagligiOzeti(k!, { simdi: SIMDI });
    const c = ozet.connectorlar.find((x) => x.id === connectorId)!;

    const f = M.formVarsayilani(c);
    expect(f.sirReferansi).toBe('');
    expect(JSON.stringify(f)).not.toContain(SIR_DEGERI);
    // Boş bırakılan referansla kaydetmek SESSİZCE geçmez: form uyarır.
    expect(M.formSorunlari(f).join(' ')).toMatch(/yeniden yazın/);
  });

  it('yeni kayıt formu üretim ortamında DOĞMAZ', () => {
    expect(M.formVarsayilani(null).ortam).toBe('gelistirme');
  });

  it('geçersiz referans biçimi istemcide de yakalanır', () => {
    const f = { ...M.formVarsayilani(null), kod: 'X-1', ad: 'X', kaynakSistem: 'x',
      kimlikTipi: 'api_key', sirReferansi: 'sadece-parola' };
    expect(M.formSorunlari(f).join(' ')).toMatch(/biçimi/);
    expect(M.referansBicimiTamam('env:AD_PAROLA')).toBe(true);
    expect(M.referansBicimiTamam('dosya:/run/secrets/ad#parola')).toBe(true);
    expect(M.referansBicimiTamam('vault:ot/ad#parola')).toBe(true);
  });
});

/* ═══ 3 · Sır sağlayıcı durumu gizlenmez ═════════════════════════════ */

describe('Sır sağlayıcıları ekranda görünür; bağlı olmayan gizlenmez', () => {
  it('vault kayıtlıdır, BAĞLI DEĞİLDİR ve gerekeni söyler', async () => {
    const k = await aktifKullanici();
    const ozet = await entegrasyonSagligiOzeti(k!, { simdi: SIMDI });
    const vault = ozet.saglayicilar.find((s) => s.ad === 'vault');
    expect(vault).toBeDefined();
    expect(vault!.bagli).toBe(false);
    expect(vault!.gereken).toBeTruthy();
    // Bağlı olmayan sağlayıcı HATA değil, bekleyen kurulum adımıdır.
    expect(M.saglayiciImi(vault!)).toBe('pl');
    expect(M.saglayiciNotu(vault!)).toBe(vault!.gereken);
    // Bağlı sağlayıcının yanına "bağlı" sözcüğü TEKRAR yazılmaz.
    const env = ozet.saglayicilar.find((s) => s.ad === 'env')!;
    expect(M.saglayiciImi(env)).toBe('ok');
    expect(M.saglayiciNotu(env)).toBeNull();
  });

  it('defterdeki sağlayıcılar ekran listesiyle aynıdır', async () => {
    const k = await aktifKullanici();
    const ozet = await entegrasyonSagligiOzeti(k!, { simdi: SIMDI });
    expect(ozet.saglayicilar.map((s) => s.ad))
      .toEqual(sirSaglayicilari().map((s) => s.ad));
  });

  it('yetkisiz kullanıcıya sağlayıcı defteri de gitmez', async () => {
    const ozet = await entegrasyonSagligiOzeti(
      { id: 'x', adSoyad: 'x', eposta: 'x@x', yetkiler: [] } as never, { simdi: SIMDI });
    expect(ozet.yetkili).toBe(false);
    expect(ozet.saglayicilar).toEqual([]);
    expect(ozet.zamanlayici.okundu).toBe(false);
  });
});

/* ═══ 4 · Zamanlayıcı görünürlüğü ════════════════════════════════════ */

describe('"Bu connector neden senkronize olmuyor?" sorusunun yanıtı ekranda', () => {
  it('zamanlayıcı pasif connector için SEBEP döndürür ve ekran onu yazar', async () => {
    const k = await aktifKullanici();
    const ozet = await entegrasyonSagligiOzeti(k!, { simdi: SIMDI });
    expect(ozet.zamanlayici.okundu).toBe(true);

    const cevap = M.vadeCevabi(ozet.zamanlayici, connectorId);
    expect(cevap.tur).toBe('koşmuyor');
    // Sebep metni zamanlayıcının kendi kararıdır, ekran uydurmaz.
    expect(cevap.cumle).toBe(ozet.zamanlayici.connectorSebep[connectorId]);
    expect(cevap.cumle).toMatch(/Pasif|Taslak/i);
  });

  it('zamanlayıcı okunamadıysa "koşmuyor" DENMEZ — bilinmiyor denir', () => {
    const cevap = M.vadeCevabi({
      okundu: false, hata: 'bağlantı yok', connectorVadeli: [],
      connectorSebep: {}, motorVadeli: [], motorSebep: {},
    }, 'c1');
    expect(cevap.tur).toBe('bilinmiyor');
    expect(M.VADE_IM[cevap.tur]).toBe('unk');
  });

  it('zamanlayıcının hiç görmediği kayıt "vadesi gelmedi" sayılmaz', () => {
    const cevap = M.vadeCevabi({
      okundu: true, hata: null, connectorVadeli: [], connectorSebep: {},
      motorVadeli: [], motorSebep: {},
    }, 'yok-boyle-bir-id');
    expect(cevap.tur).toBe('bilinmiyor');
  });
});

/* ═══ 5 · Ortam bir güvenlik bilgisidir ══════════════════════════════ */

describe('Ortam: üretime bakan kayıt ayırt edilir, bilinmeyen uydurulmaz', () => {
  it('ortam okunamadıysa "gelistirme" VARSAYILMAZ', () => {
    const s = connectorSagligi(conn(), [], { simdi: SIMDI });
    expect(s.ortam).toBeNull();
    expect(M.ortamYazisi(s.ortam)).toBe('bilinmiyor');
    expect(M.ortamYazisi(s.ortam)).not.toBe('Geliştirme');
    expect(M.uretimMi(s.ortam)).toBe(false);
    expect(M.ortamRengi(s.ortam)).toBe('var(--unk)');
  });

  it('boş metin de bilinmiyordur', () => {
    const s = connectorSagligi(conn({ ortam: '  ' }), [], { simdi: SIMDI });
    expect(s.ortam).toBeNull();
  });

  it('üretim kaydı kendi rengiyle ayrılır', () => {
    const s = connectorSagligi(conn({ ortam: 'uretim' }), [], { simdi: SIMDI });
    expect(M.uretimMi(s.ortam)).toBe(true);
    expect(M.ortamRengi(s.ortam)).toBe('var(--aksan)');
    expect(M.ortamYazisi(s.ortam)).toBe('Üretim');
  });

  it('ortam değişimi gerekçesiz kaydedilemez (istemci ve sunucu aynı kuralı uygular)',
    async () => {
      const f = { ...M.formVarsayilani(null), ortam: 'uretim', gerekce: '' };
      expect(M.ortamGerekcesiEksik(f, 'test')).toBe(true);
      expect(M.ortamGerekcesiEksik({ ...f, gerekce: 'onaylandı' }, 'test')).toBe(false);
      expect(M.ortamGerekcesiEksik(f, 'uretim')).toBe(false);

      const y = await connectorCalismaAyari({
        kod: 'TEZGAH-01', ortam: 'test', senkronKipi: 'delta',
        ardisikHataSiniri: 5, gerekce: null,
      });
      expect(y.ok).toBe(false);
      if (!y.ok) expect(y.hata).toMatch(/gerekçe zorunlu/i);

      // Reddedilen çağrı hiçbir şeyi değiştirmemiş olmalı.
      const c = await db.connector.findUniqueOrThrow({ where: { kod: 'TEZGAH-01' } });
      expect(c.ortam).toBe('uretim');
    });

  it('gerekçeli ortam değişimi kendi denetim izi satırını bırakır', async () => {
    const y = await connectorCalismaAyari({
      kod: 'TEZGAH-01', ortam: 'test', senkronKipi: 'tam',
      ardisikHataSiniri: 3, gerekce: 'Üretim bağlantısı kesildi, teste alındı',
    });
    expect(y.ok).toBe(true);

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Connector', eylem: 'ortam_degisikligi' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz).not.toBeNull();
    expect(iz!.oncekiDeger).toBe('uretim');
    expect(iz!.yeniDeger).toBe('test');
    expect(iz!.gerekce).toContain('teste alındı');

    const c = await db.connector.findUniqueOrThrow({ where: { kod: 'TEZGAH-01' } });
    expect(c.senkronKipi).toBe('tam');
    expect(c.ardisikHataSiniri).toBe(3);
  });
});

/* ═══ 6 · Sayaç sözleşmesi (donduran test) ═══════════════════════════ */

describe('Sayaç sözleşmesi: alinan = kabul + red; yinelenen ⊆ kabul', () => {
  it('yinelenen içeren BAŞARILI delta koşusu tutarsız İŞARETLENMEZ', () => {
    /* Sertifikasyon ajanının sandbox\'ta gözlediği durum: alınan 3 /
       kabul 3 / red 0 / yinelenen 3. Eski formül `yinelenen`i ikinci kez
       topladığı için bunu "sayaçlar tutmuyor" sayıyordu; delta koşuda
       yinelenen NORMALDİR ve uyarı gürültüye dönüşüyordu. */
    const s = connectorSagligi(conn(), [kosu({
      alinan: 3, kabulEdilen: 3, reddedilen: 0, yinelenen: 3,
    })], { simdi: SIMDI });
    expect(s.sonKosu!.sayacTutarsiz).toBe(false);
    expect(s.sonKosu!.yinelenenTutarsiz).toBe(false);
  });

  it('alinan ≠ kabul + red GERÇEK tutarsızlıktır', () => {
    const s = connectorSagligi(conn(), [kosu({
      alinan: 10, kabulEdilen: 4, reddedilen: 2, yinelenen: 0,
    })], { simdi: SIMDI });
    expect(s.sonKosu!.sayacTutarsiz).toBe(true);
  });

  it('yinelenen kabul edileni AŞAMAZ — aşarsa alt küme kuralı bozulmuştur', () => {
    const s = connectorSagligi(conn(), [kosu({
      alinan: 5, kabulEdilen: 3, reddedilen: 2, yinelenen: 4,
    })], { simdi: SIMDI });
    expect(s.sonKosu!.sayacTutarsiz).toBe(false);
    expect(s.sonKosu!.yinelenenTutarsiz).toBe(true);
  });

  it('süren koşunun sayaçları henüz tamam değildir; tutarsız sayılmaz', () => {
    const s = connectorSagligi(conn(), [kosu({
      durum: 'calisiyor', bitis: null, alinan: 9, kabulEdilen: 1,
      reddedilen: 0, yinelenen: 0,
    })], { simdi: SIMDI });
    expect(s.sonKosu!.sayacTutarsiz).toBe(false);
    expect(s.sonKosu!.yinelenenTutarsiz).toBe(false);
  });
});

/* ═══ 7 · Hata modeli ve devre kesici ════════════════════════════════ */

describe('Hata modeli: "sınıf yok" ile "sınıf bilinmiyor" ayrıdır', () => {
  it('başarılı koşuda sınıf YOKTUR; başarısız koşuda YAZILMAMIŞ olması boşluktur', () => {
    expect(M.hataSinifiYazisi({ hataSinifi: null, durum: 'basarili' }))
      .toEqual({ metin: 'sınıf yok', eksik: false });
    const eksik = M.hataSinifiYazisi({ hataSinifi: null, durum: 'basarisiz' });
    expect(eksik.eksik).toBe(true);
    expect(eksik.metin).toMatch(/kayıt boşluğu/);
    expect(M.hataSinifiYazisi({ hataSinifi: 'sir', durum: 'basarisiz' }).metin)
      .toBe('Sır / kimlik bilgisi');
  });

  it('devre kesici bir damga değil, ilerlemedir', () => {
    expect(M.devreKesiciIlerlemesi({ ardisikHata: 3, ardisikHataSiniri: 5 }))
      .toMatchObject({ metin: '3/5 ardışık hata', durum: 'md' });
    expect(M.devreKesiciIlerlemesi({ ardisikHata: 5, ardisikHataSiniri: 5 }).durum).toBe('bd');
    // Sayaç bilinmiyorsa SIFIR uydurulmaz.
    const bilinmeyen = M.devreKesiciIlerlemesi({ ardisikHata: null, ardisikHataSiniri: 5 });
    expect(bilinmeyen.durum).toBe('unk');
    expect(bilinmeyen.oran).toBeNull();
    // Sınır yoksa oran da yoktur — "otomatik duraklatma yok" ayrı bir bilgidir.
    expect(M.devreKesiciIlerlemesi({ ardisikHata: 2, ardisikHataSiniri: null }).oran)
      .toBeNull();
  });
});

/* ═══ 8 · Adaptörün istediği sırlar ══════════════════════════════════ */

describe('Adaptör beyanı: "sır yok" ile "varlığı bilinmiyor" ayrıdır', () => {
  it('beyan okunamadıysa boş dizi UYDURULMAZ', () => {
    const s = connectorSagligi(conn(), [], { simdi: SIMDI });
    expect(s.gerekenSirlar).toBeNull();
    expect(M.sirBeyanImi(null)).toBe('unk');
    expect(M.sirBeyanYazisi(null)).toMatch(/ölçülmedi/);
    // Boş dizi bambaşka bir şeydir: "bu adaptör sır istemiyor".
    expect(M.sirBeyanImi([])).toBe('ok');
    expect(M.sirBeyanYazisi([])).toMatch(/sır istemiyor/);
  });

  it('bilinmeyen varlık "yok" ile aynı kovaya konmaz', () => {
    expect(M.sirBeyanImi([{ durum: 'bilinmiyor' }])).toBe('unk');
    expect(M.sirBeyanImi([{ durum: 'yok' }])).toBe('pl');
    expect(M.sirBeyanImi([{ durum: 'var' }])).toBe('ok');
    expect(M.sirBeyanYazisi([{ durum: 'var' }, { durum: 'bilinmiyor' }]))
      .toMatch(/varlığı bilinmiyor/);
  });

  it('gerçek connector satırında adaptör beyanı okunur ve değer taşımaz', async () => {
    const k = await aktifKullanici();
    const ozet = await entegrasyonSagligiOzeti(k!, { simdi: SIMDI });
    const c = ozet.connectorlar.find((x) => x.id === connectorId)!;
    // ad_entra adaptörü kayıtlıdır: beyan ÖLÇÜLEBİLİR (null değil).
    expect(c.gerekenSirlar).not.toBeNull();
    expect(JSON.stringify(c.gerekenSirlar)).not.toContain(SIR_DEGERI);
  });
});

/* ═══ 9 · Kuru koşu gerçek koşu sayılmaz ═════════════════════════════ */

describe('Kuru koşu GERÇEK koşu değildir', () => {
  it('yalnız kuru koşmuş connector "hiç koşmadı" görünür ve tazeliği bilinmez', () => {
    const s = connectorSagligi(conn({ kimlikTipi: 'none' }), [
      kosu({ id: 'kk1', durum: 'basarili', kuruKosu: true }),
    ], { simdi: SIMDI });
    expect(s.durum).toBe('hic_kosmadi');
    expect(s.hicKosmadi).toBe(true);
    expect(s.sonKosu).toBeNull();
    expect(s.sonKuruKosu).not.toBeNull();
    expect(s.tazelik.durum).toBe('bilinmiyor');
    // Ekran da kuru koşuyu "başarılı" işaretleyemez.
    expect(M.kuruImi({ durum: 'basarili' })).not.toBe('ok');
  });

  it('kuru koşu raporu bozuksa sessizce "rapor yok" denmez', () => {
    const s = connectorSagligi(conn(), [
      kosu({ id: 'kk2', kuruKosu: true, kuruOzetJson: '{bozuk json' }),
    ], { simdi: SIMDI });
    expect(s.sonKuruKosu!.kuruOzet).toBeNull();
    expect(s.sonKuruKosu!.kuruOzetBozuk).toBe(true);
  });
});
