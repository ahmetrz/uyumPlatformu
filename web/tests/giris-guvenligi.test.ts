import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB importlardan ÖNCE ayarlanır (db modülü ilk erişimde okur).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-giris-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Bu dosya "önünde TEK ters vekil olan" bir dağıtımı taklit eder.

   NİÇİN AÇIKÇA AYARLANIYOR: `lib/istemciAdresi.ts` artık VARSAYILAN OLARAK
   iletilen adres başlıklarına GÜVENMEZ (bkz. tests/istemci-adresi.test.ts).
   Yapılandırma olmadan `istemciAdresi()` her istekte `null` döner ve bu
   dosyanın "kaynak adres denetim izine yazılır / adres kovası ayrışır"
   iddiaları ölçülemez hâle gelirdi. Ölçülen şey giriş ucunun davranışıdır;
   vekil sözleşmesinin kendisi ayrı dosyada sınanır. */
process.env.TRUST_PROXY = '1';

const { vekilPolitikasiniSifirla } = await import('@/lib/istemciAdresi');
vekilPolitikasiniSifirla();

const { db } = await import('@/lib/db');
const { parolaOzetle } = await import('@/lib/auth');
const { girisYap } = await import('@/lib/girisEylemleri');
const {
  girisOraniAyarla, istemciAdresi, BILINMEYEN_HESAP,
} = await import('@/lib/girisKorumasi');
const { oranSayaclariniSifirla } = await import('@/lib/api/oranSinir');
const { basliklariAyarla, basliklariTemizle } = await import('@/tests/sahte/next-headers');

/* ═══════════════════════════════════════════════════════════════════════
   §14 · GİRİŞ UCU SERTLEŞTİRMESİ

   Denetimde iki eksik bulundu ve kapatıldı; bu dosya ikisini de kilitler:

     1. Başarısız giriş HİÇ kaydedilmiyordu — bir hesaba yüz yanlış parola
        denenmesi ile hiç denenmemesi denetim izinde aynı görünüyordu.
     2. Giriş ucunda oran sınırı YOKTU — `lib/api/oranSinir.ts` yazılmış ama
        yalnız API uçlarına takılmıştı, parola denemesi sınırsızdı.

   Ayrıca sızıntı kuralı sabitlenir: istemciye dönen mesaj HER durumda
   aynıdır (hesap sayımı yapılamaz), gerçek sebep yalnız denetim izindedir.
   ═══════════════════════════════════════════════════════════════════════ */

const ONEK = 'GIRIS';
const PAROLA = 'dogru-parola-1234';
const EPOSTA = `${ONEK.toLowerCase()}-kurban@test.local`;
const PASIF_EPOSTA = `${ONEK.toLowerCase()}-pasif@test.local`;
const ADRES = '203.0.113.77';

let kullaniciId = '';
let pasifId = '';

/** `girisYap` başarıda `redirect()` fırlatır (next/navigation ikizi
    `REDIRECT:<yol>` hatası atar). Test bunu bir SONUÇ gibi okur. */
async function giris(eposta: string, parola: string):
Promise<{ ok: true } | { ok: false; hata: string }> {
  try {
    const s = await girisYap({ eposta, parola });
    return s as { ok: false; hata: string };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m.startsWith('REDIRECT:')) return { ok: true };
    throw e;
  }
}

const girisKayitlari = (varlikId: string, eylem: 'red' | 'olusturma') =>
  db.aktiviteKaydi.findMany({
    where: { varlikTipi: 'Oturum', varlikId, eylem, alan: 'giris' },
    orderBy: { zaman: 'desc' },
  });

/* Eşikler test için DARALTILIR. Sebep dürüstçe şudur: her deneme bir
   scrypt(N=2^15) çağrısıdır (~100 ms) ve üretim eşiği olan 40 deneme tek
   testi saniyelerce sürdürür. Ölçülen MEKANİZMADIR — "sınır dolunca
   doğru parola bile geçmez" — sayının kendisi değil. */
const HESAP_SINIRI = 3;
const ADRES_SINIRI = 6;

beforeAll(async () => {
  girisOraniAyarla({
    hesapSiniri: HESAP_SINIRI, adresSiniri: ADRES_SINIRI,
    /* Adres çözülemediğinde kullanılan PAYLAŞILAN kova. Üretimde bu eşik
       kasten çok geniştir (bir adresi değil bir popülasyonu temsil eder);
       burada mekanizmayı ölçebilmek için daraltılır. */
    bilinmeyenSiniri: ADRES_SINIRI, pencereMs: 15 * 60_000 });
  const hash = parolaOzetle(PAROLA);
  kullaniciId = (await db.kullanici.create({ data: {
    eposta: EPOSTA, adSoyad: 'Giriş Kurbanı', parolaHash: hash, aktif: true } })).id;
  pasifId = (await db.kullanici.create({ data: {
    eposta: PASIF_EPOSTA, adSoyad: 'Pasif Kullanıcı', parolaHash: hash, aktif: false } })).id;
});

beforeEach(async () => {
  await oranSayaclariniSifirla();
  /* Tek vekilli topolojide vekil `xff = [istemci]` yazar; sondan bir atlama
     bu tek halkayı seçer. */
  basliklariAyarla({ 'x-forwarded-for': ADRES });
});

/* ═══ 1 · başarısız giriş denetim izine yazılır ══════════════════════ */

describe('Başarısız giriş denetim izine YAZILIR', () => {
  it('yanlış parola: red kaydı açılır, gerçek sebep kayda girer', async () => {
    const once = (await girisKayitlari(kullaniciId, 'red')).length;
    const s = await giris(EPOSTA, 'kesinlikle-yanlis');
    expect(s.ok).toBe(false);

    const kayitlar = await girisKayitlari(kullaniciId, 'red');
    expect(kayitlar).toHaveLength(once + 1);
    expect(kayitlar[0].gerekce).toBe('parola hatalı');
    expect(kayitlar[0].aktorId).toBe(kullaniciId);
    expect(kayitlar[0].yeniDeger).toContain(EPOSTA);
    expect(kayitlar[0].yeniDeger).toContain(ADRES);
  });

  it('PAROLA hiçbir alanda geçmez — ne açık ne özet', async () => {
    await giris(EPOSTA, PAROLA + '-yanlis');
    const kayitlar = await girisKayitlari(kullaniciId, 'red');
    const metin = JSON.stringify(kayitlar);
    expect(metin).not.toContain(PAROLA);
    expect(metin).not.toContain('parolaHash');
    expect(metin).not.toContain('s1$');
  });

  it('tanımsız e-posta: kayıt yine açılır, aktör null kalır (uydurulmaz)', async () => {
    const yok = 'boyle-bir-hesap-yok@test.local';
    const s = await giris(yok, 'her-neyse');
    expect(s.ok).toBe(false);

    const kayit = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'Oturum', varlikId: BILINMEYEN_HESAP, alan: 'giris' },
      orderBy: { zaman: 'desc' } });
    expect(kayit.aktorId).toBeNull();
    expect(kayit.gerekce).toBe('tanımsız e-posta');
    expect(kayit.yeniDeger).toContain(yok);
  });

  it('pasif kullanıcı doğru parolayla da giremez ve sebebi ayrı kaydedilir', async () => {
    const s = await giris(PASIF_EPOSTA, PAROLA);
    expect(s.ok).toBe(false);
    const kayitlar = await girisKayitlari(pasifId, 'red');
    expect(kayitlar[0].gerekce).toBe('kullanıcı pasif');
    // Oturum AÇILMADI — reddedilen giriş satır bırakmaz
    expect(await db.oturum.count({ where: { kullaniciId: pasifId } })).toBe(0);
  });

  it('istemciye dönen mesaj HER ret için AYNIDIR — hesap sayımı yapılamaz [OTR-GRS-002]', async () => {
    const yok = await giris('hic-yok@test.local', 'x');
    const yanlis = await giris(EPOSTA, 'x');
    const pasif = await giris(PASIF_EPOSTA, PAROLA);
    expect(yok.ok).toBe(false);
    expect(yanlis.ok).toBe(false);
    expect(pasif.ok).toBe(false);
    const mesajlar = new Set([
      (yok as { hata: string }).hata,
      (yanlis as { hata: string }).hata,
      (pasif as { hata: string }).hata,
    ]);
    expect(mesajlar.size).toBe(1);
    expect([...mesajlar][0]).toBe('E-posta veya parola hatalı');
  });

  it('başarılı giriş de kaynak adresle birlikte kaydedilir [OTR-GRS-001]', async () => {
    const s = await giris(EPOSTA, PAROLA);
    expect(s.ok).toBe(true);
    const kayitlar = await girisKayitlari(kullaniciId, 'olusturma');
    expect(kayitlar.length).toBeGreaterThan(0);
    expect(kayitlar[0].yeniDeger).toContain(ADRES);
    expect(await db.oturum.count({ where: { kullaniciId } })).toBeGreaterThan(0);
  });
});

/* ═══ 1b · E40 · `next` dönüş hedefi ═════════════════════════════════
   Başarıda `redirect()` hedefi `next`ten gelir; yalnız site içi göreli yol
   kabul edilir. Ret dallarında `next` HİÇ okunmaz — yönlendirme yok. */

async function girisHedefi(eposta: string, parola: string, next?: string | null):
Promise<string | null> {
  try {
    await girisYap({ eposta, parola, next });
    return null;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m.startsWith('REDIRECT:')) return m.slice('REDIRECT:'.length);
    throw e;
  }
}

describe('Giriş sonrası dönüş hedefi (?next=)', () => {
  it('site içi göreli yol: giriş başarınca oraya döner', async () => {
    expect(await girisHedefi(EPOSTA, PAROLA, '/riskler?mercek=kritik')).toBe('/riskler?mercek=kritik');
  });

  it('dış ya da protokol-göreli adres köke düşer — açık yönlendirme yok', async () => {
    expect(await girisHedefi(EPOSTA, PAROLA, 'https://sahte.site/giris')).toBe('/');
    expect(await girisHedefi(EPOSTA, PAROLA, '//sahte.site')).toBe('/');
  });

  it('next yokken kök; yanlış parolada next okunmaz, yönlendirme olmaz', async () => {
    expect(await girisHedefi(EPOSTA, PAROLA)).toBe('/');
    expect(await girisHedefi(EPOSTA, 'yanlis-parola', '/riskler')).toBeNull();
  });
});

/* ═══ 2 · kaba kuvvet kancası ════════════════════════════════════════ */

describe('Kaba kuvvet: giriş ucunda oran sınırı UYGULANIR', () => {
  it(`hesap sayacı ${HESAP_SINIRI} denemede dolar ve DOĞRU parolayı bile durdurur`, async () => {
    for (let i = 0; i < HESAP_SINIRI; i++) {
      const s = await giris(EPOSTA, `yanlis-${i}`);
      expect(s.ok).toBe(false);
    }
    /* Sınırın işe yaradığının kanıtı: DOĞRU parola bile geçmez. Yalnız
       "yanlış parola reddedildi" demek hiçbir şey kanıtlamazdı. */
    const s = await giris(EPOSTA, PAROLA);
    expect(s.ok).toBe(false);
    expect((s as { hata: string }).hata).toMatch(/çok fazla başarısız giriş/i);

    // Sınır ihlali de denetim izine girer — sessiz düşmez.
    const kayit = (await girisKayitlari(BILINMEYEN_HESAP, 'red'))[0];
    expect(kayit.gerekce).toBe('deneme sınırı aşıldı');
  });

  it('sınır HESAP başınadır — başka hesap etkilenmez', async () => {
    for (let i = 0; i < HESAP_SINIRI + 2; i++) await giris(EPOSTA, `yanlis-${i}`);
    // Aynı adresten, başka hesaba: adres kotası hâlâ geniş, geçmeli.
    const s = await giris(PASIF_EPOSTA, PAROLA);
    expect((s as { hata: string }).hata).toBe('E-posta veya parola hatalı');
  });

  it('BAŞARILI giriş hesap sayacını düşürür — koruma kilitleme silahı değildir', async () => {
    for (let i = 0; i < HESAP_SINIRI - 1; i++) await giris(EPOSTA, `yanlis-${i}`);
    expect((await giris(EPOSTA, PAROLA)).ok).toBe(true);
    /* Sayaç sıfırlanmasaydı bir saldırgan bildiği hesaba yedi yanlış parola
       gönderip sahibini pencere boyunca dışarıda bırakabilirdi. */
    expect((await giris(EPOSTA, PAROLA)).ok).toBe(true);
  });

  it('adres sayacı kimlik doldurmayı yakalar — her deneme BAŞKA hesaba', async () => {
    /* Hesap sayacı bu saldırıyı hiç görmez: her denemede farklı e-posta.
       Adres kovası devreye girer. */
    for (let i = 0; i < ADRES_SINIRI; i++) {
      await giris(`kurban-${i}@test.local`, 'ortak-parola');
    }
    const s = await giris('kurban-son@test.local', 'ortak-parola');
    expect((s as { hata: string }).hata).toMatch(/çok fazla başarısız giriş/i);
  });

  it('adres sayacı BAŞARILI girişle aklanmaz', async () => {
    for (let i = 0; i < ADRES_SINIRI; i++) {
      await giris(`stuff-${i}@test.local`, 'x');
    }
    // Tek bir başarılı giriş, aynı adresten gelen kırk denemeyi aklamaz.
    const s = await giris(EPOSTA, PAROLA);
    expect(s.ok).toBe(false);
    expect((s as { hata: string }).hata).toMatch(/çok fazla başarısız giriş/i);
  });

  it('kota parola doğrulamasından ÖNCE tüketilir', async () => {
    /* Sınır scrypt'ten sonra uygulansaydı, sınırsız parola denemesi
       sunucuyu (N=2^15) hâlâ meşgul edebilirdi. Kanıt: sınır dolduktan
       sonra gelen denemede parola hiç doğrulanmaz — bu yüzden DOĞRU
       parolayla YANLIŞ parola aynı yanıtı verir. */
    for (let i = 0; i < HESAP_SINIRI; i++) await giris(EPOSTA, `y-${i}`);
    const dogru = await giris(EPOSTA, PAROLA);
    const yanlis = await giris(EPOSTA, 'baska-yanlis');
    expect((dogru as { hata: string }).hata).toBe((yanlis as { hata: string }).hata);
  });
});

/* ═══ 3 · kaynak adres çözümü ════════════════════════════════════════ */

/* Sözleşmenin TAMAMI (TRUST_PROXY biçimleri, bozuk zincir, uzun başlık,
   liste modu, taklit başlıkla sınır atlatma denemesi) tests/istemci-adresi
   dosyasındadır. Burada yalnız GİRİŞ UCUNUN o sözleşmeyi kullandığı
   ölçülür — yani "hangi adres denetim izine ve hangi kovaya gider". */

describe('Kaynak adres, giriş ucunda', () => {
  it('yapılandırılmış vekil topolojisinde gerçek istemci adresi çözülür', async () => {
    basliklariAyarla({ 'x-forwarded-for': '198.51.100.5' });
    expect(await istemciAdresi()).toBe('198.51.100.5');
  });

  it('istemcinin YAZDIĞI sahte ön ek denetim izine GEÇMEZ', async () => {
    /* Saldırgan `XFF: 1.2.3.4` gönderir; vekil kendi gördüğü adresi EKLER.
       Eski kod ilk girdiyi alıyordu, yani denetim izine SALDIRGANIN yazdığı
       adres düşüyordu — olay müdahalesini yanlış kaynağa yönlendiren bir iz.
       Artık taklit edilen ön ek yok sayılır. */
    basliklariAyarla({ 'x-forwarded-for': `1.2.3.4, ${ADRES}` });
    expect(await istemciAdresi()).toBe(ADRES);

    const s = await giris(EPOSTA, 'kesinlikle-yanlis');
    expect(s.ok).toBe(false);
    const kayit = (await girisKayitlari(kullaniciId, 'red'))[0];
    expect(kayit.yeniDeger).toContain(ADRES);
    expect(kayit.yeniDeger).not.toContain('1.2.3.4');
  });

  it('başlık yoksa adres BİLİNMİYORdur — sahte bir adres uydurulmaz', async () => {
    basliklariTemizle();
    expect(await istemciAdresi()).toBeNull();

    /* `null` denetim izine '0.0.0.0' gibi GERÇEK GÖRÜNEN bir değer olarak
       yazılmaz; "adres bilinmiyor" cümlesi olay müdahalesine dürüst bilgi
       verir. */
    const s = await giris(EPOSTA, 'kesinlikle-yanlis');
    expect(s.ok).toBe(false);
    const kayit = (await girisKayitlari(kullaniciId, 'red'))[0];
    expect(kayit.yeniDeger).toContain('adres bilinmiyor');
  });

  it('adres BİLİNMESE DE sınır işler — "okunamadı" bir muafiyet değildir', async () => {
    basliklariTemizle();
    /* Adressiz istekler TEK paylaşılan kovada toplanır. Alternatifi (kovayı
       yine de başlıktan seçmek) tam olarak kapatılan kusurdur. */
    for (let i = 0; i < ADRES_SINIRI; i++) await giris(`a-${i}@test.local`, 'x');
    const s = await giris('a-son@test.local', 'x');
    expect((s as { hata: string }).hata).toMatch(/çok fazla başarısız giriş/i);
  });
});
