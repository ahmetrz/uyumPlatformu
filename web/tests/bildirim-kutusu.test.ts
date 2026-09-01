import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   O25 · BİLDİRİM KUTUSU — sahiplik ve "bilinmeyen ≠ sıfır" regresyonu

   Denetim bulgusu #11: `lib/motorlar/sonTarih.ts` her koşuda `Bildirim`
   yazıyor, hiçbir ekran okumuyor, `bildirimOkundu` hiçbir yerden
   çağrılmıyordu. Yüzey açıldı; bu dosya o yüzeyin YAPAMAYACAĞINI ölçer:

     · başkasının bildirimini okundu işaretleyemez,
     · başkasının kutusunu "hepsi" ile de kapatamaz,
     · uyum modülünde hiçbir kapsamda okuma izni olmayan kullanıcı
       kutuya hiç dokunamaz,
     · ama SANTRALE KISITLI bir kullanıcı kendi kutusunu kapatabilir
       (eski kapı tam da onları dışarıda bırakıyordu),
     · okunmamış bildirim yokken "en eski okunmamış" SIFIR GÜN değildir,
     · kaynağı çözülemeyen bildirim "kapsam dışı" ile aynı kovada değildir.

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-bildirim-'));
const testDb = path.join(dizin, 'test.db');
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
const { bildirimOkundu } = await import('@/lib/eylemler2/bildirim');
const M = await import('@/app/(atlas)/(operasyonel)/bildirimler/mantik');

type Satir = import('@/app/(atlas)/(operasyonel)/bildirimler/mantik').BildirimSatiri;

/* ═══ Fikstür ═════════════════════════════════════════════════════════ */

const ONEK = 'BLD';
const GUN = 86_400_000;

type Kisi = { id: string; token: string };

async function kullaniciAc(
  eposta: string, yetki: { rol: string; modul?: string; tesisId?: string },
): Promise<Kisi> {
  const kisi = await db.kullanici.create({
    data: { eposta, adSoyad: eposta, aktif: true } });
  await db.yetki.create({ data: {
    kullaniciId: kisi.id, rol: yetki.rol,
    modul: yetki.modul ?? null, tesisId: yetki.tesisId ?? null } });
  const token = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: kisi.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  return { id: kisi.id, token };
}

async function bildirimAc(kullaniciId: string, baslik: string, tip = 'uyari') {
  return db.bildirim.create({ data: {
    kullaniciId, baslik: `${ONEK} ${baslik}`, govde: 'test gövdesi', tip } });
}

let ali: Kisi;      // kurum geneli okuyucu
let veli: Kisi;     // kurum geneli okuyucu (Ali'nin kutusuna dokunamamalı)
let saha: Kisi;     // SANTRALE kısıtlı tesis yöneticisi
let riskci: Kisi;   // yalnız risk modülünde yetkili — uyum okuma YOK
let tesisId = '';

beforeAll(async () => {
  const tesis = await db.tesis.create({
    data: { kod: `${ONEK}-SNT`, ad: 'Bildirim testi santrali', durum: 'aktif' } });
  tesisId = tesis.id;

  ali = await kullaniciAc(`${ONEK}-ali@test.local`, { rol: 'okuyucu' });
  veli = await kullaniciAc(`${ONEK}-veli@test.local`, { rol: 'okuyucu' });
  saha = await kullaniciAc(`${ONEK}-saha@test.local`,
    { rol: 'tesis_yoneticisi', tesisId });
  /* Yetkinin `modul` alanı 'risk' → `izinVar`/`izinliTesisIdleri` uyum
     modülünde hiçbir şey döndürmez. Tüm rollerde uyum okuma var; modül
     daraltması yetkisizliği kurmanın gerçek yoludur. */
  riskci = await kullaniciAc(`${ONEK}-riskci@test.local`,
    { rol: 'risk_sahibi', modul: 'risk' });
});

/* ═══ 1 · Kutu kapısı ═════════════════════════════════════════════════ */

describe('kutuKapisiAcik: kutu kapısı kapsamsız izin ARAMAZ', () => {
  it('kapsam sınırı yoksa (null) kapı açıktır', () => {
    expect(M.kutuKapisiAcik(null)).toBe(true);
  });

  it('SANTRALE KISITLI kullanıcı için kapı açıktır', () => {
    // Regresyon: `izinVar(k,'uyum','okuma')` bu kullanıcıyı geçirmez ve
    // bildirimi asıl alanlar tam da onlardır.
    expect(M.kutuKapisiAcik(['tesis-1'])).toBe(true);
  });

  it('uyum modülünde hiçbir kapsamda okuma yoksa kapı KAPALIDIR', () => {
    expect(M.kutuKapisiAcik([])).toBe(false);
  });
});

/* ═══ 2 · Sahiplik — ekranın yapamadığı ═══════════════════════════════ */

describe('Bildirim kutusu SAHİPLİK sınırı', () => {
  it('kullanıcı KENDİ bildirimini okundu işaretleyebilir', async () => {
    const b = await bildirimAc(ali.id, 'kendi bildirimim');
    oturum.token = ali.token;
    const sonuc = await bildirimOkundu({ id: b.id });
    expect(sonuc.ok).toBe(true);
    expect((await db.bildirim.findUniqueOrThrow({ where: { id: b.id } })).okundu)
      .not.toBeNull();
  });

  it('BAŞKASININ bildirimini okundu işaretleme denemesi REDDEDİLİR', async () => {
    const b = await bildirimAc(ali.id, 'Ali için yazıldı');
    oturum.token = veli.token;

    const sonuc = await bildirimOkundu({ id: b.id });
    /* Yanıt `ok` döner ama HİÇBİR SATIR DEĞİŞMEZ. Ayrı bir "bu senin
       değil" hatası, var olmayan bir bildirimle başkasına ait bir
       bildirimi ayırt ettirir ve başka kutuları yoklamaya yarardı.
       Ölçülen şey yanıtın metni değil, VERİTABANININ hâli. */
    expect(sonuc.ok).toBe(true);
    expect((await db.bildirim.findUniqueOrThrow({ where: { id: b.id } })).okundu)
      .toBeNull();
  });

  it('"hepsi" yalnız ÇAĞIRANIN kutusunu kapatır', async () => {
    const aliBildirimi = await bildirimAc(ali.id, 'toplu · Ali');
    const veliBildirimi = await bildirimAc(veli.id, 'toplu · Veli');

    oturum.token = veli.token;
    expect((await bildirimOkundu({ hepsi: true })).ok).toBe(true);

    expect((await db.bildirim.findUniqueOrThrow({ where: { id: veliBildirimi.id } })).okundu)
      .not.toBeNull();
    // Ali'nin kutusu Veli'nin toplu işaretinden ETKİLENMEZ.
    expect((await db.bildirim.findUniqueOrThrow({ where: { id: aliBildirimi.id } })).okundu)
      .toBeNull();
  });

  it('YETKİSİZ kullanıcı kendi bildirimine de dokunamaz', async () => {
    const b = await bildirimAc(riskci.id, 'yetkisiz kullanıcının bildirimi');
    oturum.token = riskci.token;

    const sonuc = await bildirimOkundu({ id: b.id });
    expect(sonuc.ok).toBe(false);
    if (!sonuc.ok) expect(sonuc.hata).toContain('yetkiniz yok');
    expect((await db.bildirim.findUniqueOrThrow({ where: { id: b.id } })).okundu)
      .toBeNull();
  });

  it('OTURUMSUZ çağrı hiçbir satıra dokunmaz', async () => {
    const b = await bildirimAc(ali.id, 'oturumsuz deneme');
    oturum.token = null;
    const sonuc = await bildirimOkundu({ id: b.id });
    expect(sonuc.ok).toBe(false);
    expect((await db.bildirim.findUniqueOrThrow({ where: { id: b.id } })).okundu)
      .toBeNull();
  });

  it('SANTRALE KISITLI kullanıcı kendi kutusunu kapatabilir', async () => {
    /* Regresyon: kapı `yetkiZorunlu('uyum','okuma')` iken bu çağrı
       "yetkiniz yok" alıyordu — yani son tarih motorunun uyardığı santral
       sorumlusu, kendi uyarısını okundu işaretleyemiyordu. */
    const b = await bildirimAc(saha.id, 'santral sorumlusunun uyarısı');
    oturum.token = saha.token;
    const sonuc = await bildirimOkundu({ id: b.id });
    expect(sonuc.ok).toBe(true);
    expect((await db.bildirim.findUniqueOrThrow({ where: { id: b.id } })).okundu)
      .not.toBeNull();
  });
});

/* ═══ 3 · Bilinmeyen ≠ sıfır ══════════════════════════════════════════ */

/* Sabit "şimdi": `Date.now()` iki kez okunursa aradaki milisaniyeler
   `Math.floor` sınırında gün sayısını bir aşağı düşürür ve test kendi
   kurgusuna göre kayar. */
const SIMDI = Date.UTC(2026, 8, 1, 12, 0, 0);

const satir = (ek: Partial<Satir>): Satir => ({
  id: `b-${Math.random()}`,
  baslik: 'başlık',
  govde: null,
  tip: 'bilgi',
  kaynakTipi: 'Bulgu',
  kaynakId: 'x',
  okundu: null,
  olusturuldu: new Date(SIMDI - 3 * GUN).toISOString(),
  kaynakHali: 'kapsamda',
  kaynakYolu: '/bulgular/x',
  tesisKodu: 'SNT-A',
  ...ek,
});

describe('Bildirim kutusu: bilinmeyen ≠ sıfır', () => {
  const simdi = SIMDI;

  it('okunmamış bildirim yokken "en eski okunmamış" SIFIR GÜN DEĞİL, null olur', () => {
    const okunmus = [
      satir({ okundu: new Date().toISOString() }),
      satir({ okundu: new Date().toISOString() }),
    ];
    const sayim = M.sayimHesapla(okunmus, simdi);
    expect(sayim.okunmamis).toBe(0);
    // 0 yazmak "ölçtük, sıfır gün bekliyor" demek olurdu; ölçülecek şey yok.
    expect(sayim.enEskiGun).toBeNull();
  });

  it('okunmamış varken en eski okunmamışın YAŞI ölçülür', () => {
    const sayim = M.sayimHesapla([
      satir({ olusturuldu: new Date(simdi - 10 * GUN).toISOString() }),
      satir({ olusturuldu: new Date(simdi - 2 * GUN).toISOString() }),
    ], simdi);
    expect(sayim.enEskiGun).toBe(10);
  });

  it('okunmuş bildirimin bekleme süresi 0 DEĞİL, null', () => {
    expect(M.bekleyenGun(satir({ okundu: new Date().toISOString() }), simdi)).toBeNull();
    expect(M.bekleyenGun(satir({}), simdi)).toBe(3);
  });

  it('kaynağı ÇÖZÜLEMEYEN bildirim, kapsam dışıyla AYNI KOVADA değildir', () => {
    const sayim = M.sayimHesapla([
      satir({ kaynakHali: 'bilinmiyor', kaynakYolu: null, tesisKodu: null }),
      satir({ kaynakHali: 'kapsamDisi', kaynakYolu: null, tesisKodu: null }),
      satir({ kaynakHali: 'kapsamda' }),
    ], simdi);
    expect(sayim.kaynagiBilinmeyen).toBe(1);
    expect(sayim.kaynagiKapsamDisi).toBe(1);
  });

  it('kaynağı çözülemeyen satırın işaretçisi ve sözü BİLİNMİYOR der', () => {
    expect(M.KAYNAK_HAL_SOZU.bilinmiyor).toContain('bilinmiyor');
    expect(M.KAYNAK_HAL_SOZU.kapsamDisi).toContain('kapsam');
    // Ekranın sözlüğünde `bilinmiyor` diye bir DURUM yoktur; işaretçi 'unk'tur
    // ve onun sözü "değerlendirilmedi"dir.
    expect(M.bildirimImi(satir({ tip: 'bilgi' }))).toBe('unk');
  });

  it('ekranHali: "hiç bildirim yok" ile "hepsi okunmuş" AYRI cümlelerdir', () => {
    const bosSayim = M.sayimHesapla([], simdi);
    const hicYok = M.ekranHali(bosSayim, 0);
    const hepsiOkundu = M.ekranHali(bosSayim, 12);

    expect(hicYok.durum).toBe('unk');
    expect(hicYok.metin).toContain('hiç bildirim yazılmadı');
    // ÖLÇÜLMÜŞ sıfır: kutuda kayıt var, okunmamışı yok.
    expect(hepsiOkundu.durum).toBe('ok');
    expect(hepsiOkundu.metin).toContain('Okunmamış bildirim yok');
    expect(hicYok.metin).not.toBe(hepsiOkundu.metin);
  });
});

/* ═══ 4 · Yoğunluk sözleşmesi ═════════════════════════════════════════ */

describe('Bildirim kutusu: okunmamış satır katlanmaz', () => {
  it('okunmamış bildirim kuyruğa İNEMEZ, okunmuş inebilir', () => {
    expect(M.toplanabilir(satir({}))).toBe(false);
    expect(M.toplanabilir(satir({ okundu: new Date().toISOString() }))).toBe(true);
  });

  it('sıralama okunmamışı ve eskalasyonu öne alır', () => {
    const sirali = M.sirala([
      satir({ id: 'okunmus', okundu: new Date().toISOString(), tip: 'eskalasyon' }),
      satir({ id: 'bilgi', tip: 'bilgi' }),
      satir({ id: 'eskalasyon', tip: 'eskalasyon' }),
    ]);
    expect(sirali.map((b) => b.id)).toEqual(['eskalasyon', 'bilgi', 'okunmus']);
  });
});
