import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB importlardan ÖNCE ayarlanır (db modülü ilk erişimde okur).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-hesap-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* D26 · Hesap eylemleri.

   Sahte `AktifKullanici` enjekte edilmez: her senaryo GERÇEK bir oturum
   satırı açar ve jetonunu çerez ikizine koyar; `lib/auth.ts` üretimdeki
   yolu aynen yürür. Böylece "yetkisiz çağrı reddedilir" ve "mevcut oturum
   ayakta kalır" iddiaları kendi sahtelerini değil ürünü ölçer. */

const { db } = await import('@/lib/db');
const { parolaDogru, parolaOzetle } = await import('@/lib/auth');
const { oturumCereziAyarla } = await import('./sahte/next-headers');
const {
  parolaBelirle, parolaDegistir, profilGuncelle, digerOturumlariKapat,
} = await import('@/lib/eylemler2/hesap');
const { PAROLA_EN_AZ, parolaKusuru, sureMetni, digerOturumSayisi, oturumCumlesi, kalanSureMetni } =
  await import('@/app/(kabuk)/(operasyonel)/ayarlar/mantik');
const { ayarlarVerisi } = await import('@/app/(kabuk)/(operasyonel)/ayarlar/veri');
const { guvenliHedef } = await import('@/app/(giris)/giris/mantik');
const {
  istekImi, istekDurumMetni, sureMetni: istekSuresi, anahtarBasinaSayim, sonIstekDipNotu,
} = await import('@/app/(kabuk)/(operasyonel)/yonetim-tezgahi/ortak');
type SonIstek = import('@/app/(kabuk)/(operasyonel)/yonetim-tezgahi/ortak').SonIstek;

const ONEK = `HESAP-${Date.now()}`;
const ESKI = 'eski-parola-123456';
const YENI = 'yeni-parola-abcdef';

const kimlik = { yonetici: '', okuyucu: '', parolasiz: '' };

const ozet = (jeton: string) => createHash('sha256').update(jeton).digest('hex');

/** Gerçek oturum açar, çerezi ayarlar, jetonu döndürür. */
async function oturumAc(kullaniciId: string): Promise<string> {
  const jeton = randomBytes(32).toString('base64url');
  await db.oturum.create({
    data: { kullaniciId, tokenHash: ozet(jeton), bitis: new Date(Date.now() + 3_600_000) },
  });
  oturumCereziAyarla(jeton);
  return jeton;
}

const oturumSayisi = (kullaniciId: string) => db.oturum.count({ where: { kullaniciId } });
const parolaOzeti = async (id: string) =>
  (await db.kullanici.findUniqueOrThrow({ where: { id }, select: { parolaHash: true } })).parolaHash;

beforeAll(async () => {
  const yonetici = await db.kullanici.create({
    data: {
      adSoyad: 'Hesap Yöneticisi', eposta: `${ONEK}-yonetici@ornek.test`, aktif: true,
      parolaHash: parolaOzetle(ESKI),
      yetkiler: { create: [{ rol: 'yonetici', modul: null }] },
    },
  });
  const okuyucu = await db.kullanici.create({
    data: {
      adSoyad: 'Hesap Okuyucu', eposta: `${ONEK}-okuyucu@ornek.test`, aktif: true,
      parolaHash: parolaOzetle(ESKI),
      yetkiler: { create: [{ rol: 'okuyucu', modul: null }] },
    },
  });
  const parolasiz = await db.kullanici.create({
    data: { adSoyad: 'Parolasız Hesap', eposta: `${ONEK}-parolasiz@ornek.test`, aktif: true },
  });
  kimlik.yonetici = yonetici.id;
  kimlik.okuyucu = okuyucu.id;
  kimlik.parolasiz = parolasiz.id;
});

/* ═══ Saf kurallar ════════════════════════════════════════════════════ */

describe('Parola kuralı (paylaşılan)', () => {
  it('alt sınır 12 karakter; kısa parola kusur cümlesi üretir, boş alan susar [OTR-HSP-001]', () => {
    expect(PAROLA_EN_AZ).toBe(12);
    expect(parolaKusuru('')).toBeNull();
    expect(parolaKusuru('kisa')).toMatch(/En az 12/);
    expect(parolaKusuru('tam-on-iki-k')).toBeNull();
  });

  it('süre metni bilinmeyeni sıfır saymaz', () => {
    expect(sureMetni(-1)).toBe('ölçülmedi');
    expect(sureMetni(Number.NaN)).toBe('ölçülmedi');
    expect(sureMetni(30_000)).toBe('az önce');
    expect(sureMetni(5 * 60_000)).toBe('5 dk');
    expect(sureMetni(3 * 3_600_000 + 12 * 60_000)).toBe('3 sa 12 dk');
  });

  it('oturum sayısı: bu tarayıcı düşülür, geçersiz sayı bilinmiyor kalır', () => {
    expect(digerOturumSayisi(1)).toBe(0);
    expect(digerOturumSayisi(3)).toBe(2);
    expect(digerOturumSayisi(0)).toBeNull();
    expect(oturumCumlesi(1)).toMatch(/açık oturum yok/);
    expect(oturumCumlesi(3)).toMatch(/2 açık oturum/);
    expect(oturumCumlesi(0)).toMatch(/okunamadı/);
  });

  it('mutlak bitişe kalan: geçmiş "doldu", gelecek süre, bozuk tarih "ölçülmedi"', () => {
    const simdi = Date.UTC(2026, 0, 1, 12, 0, 0);
    expect(kalanSureMetni(new Date(simdi - 1).toISOString(), simdi)).toBe('doldu');
    expect(kalanSureMetni(new Date(simdi + 90 * 60_000).toISOString(), simdi)).toBe('1 sa 30 dk');
    expect(kalanSureMetni('tarih değil', simdi)).toBe('ölçülmedi');
  });
});

/* ═══ E40 · giriş dönüş hedefi — açık yönlendirme kapısı ═══════════════ */

describe('guvenliHedef (?next=)', () => {
  it('site içi göreli yol olduğu gibi geçer, sorgu ve çapa korunur', () => {
    expect(guvenliHedef('/riskler')).toBe('/riskler');
    expect(guvenliHedef('/bulgular/abc?sekme=iz#ust')).toBe('/bulgular/abc?sekme=iz#ust');
  });

  it('dış adres, protokol-göreli adres ve ters bölü kökü reddedilir → "/"', () => {
    expect(guvenliHedef('https://sahte.site')).toBe('/');
    expect(guvenliHedef('//sahte.site/giris')).toBe('/');
    expect(guvenliHedef('/\\sahte.site')).toBe('/');
    expect(guvenliHedef('javascript:alert(1)')).toBe('/');
    expect(guvenliHedef('riskler')).toBe('/');
  });

  it('boş, dizi, denetim karakteri ve /giris döngüsü → "/"', () => {
    expect(guvenliHedef(undefined)).toBe('/');
    expect(guvenliHedef(null)).toBe('/');
    expect(guvenliHedef('')).toBe('/');
    expect(guvenliHedef(['/uyum', '/riskler'])).toBe('/uyum');   // ilk değer
    expect(guvenliHedef('/uyum\r\nSet-Cookie: x')).toBe('/');
    expect(guvenliHedef('/giris')).toBe('/');
    expect(guvenliHedef('/giris?next=/uyum')).toBe('/');
    expect(guvenliHedef('/girisler')).toBe('/girisler');          // ön ek değil, tam segment
  });
});

/* ═══ D32 · Son API istekleri — saf kurallar ═══════════════════════════ */

describe('Son istekler (yonetim-tezgahi/ortak)', () => {
  const istek = (kismi: Partial<SonIstek>): SonIstek => ({
    id: 'x', zaman: '2026-01-01T00:00:00.000Z', yontem: 'GET', yol: '/api/v1/x',
    durumKodu: 200, sureMs: 12, hataKodu: null, anahtar: { id: 'a1', ad: 'SIEM' }, ...kismi,
  });

  it('işaretçi: 2xx ok · 4xx kısmi · 5xx kritik · 0 (işleniyor) bilinmiyor', () => {
    expect(istekImi(200)).toBe('ok');
    expect(istekImi(201)).toBe('ok');
    expect(istekImi(404)).toBe('md');
    expect(istekImi(500)).toBe('bd');
    expect(istekImi(0)).toBe('unk');
  });

  it('durum metni sözcük taşır, süre null "0 ms" değildir', () => {
    expect(istekDurumMetni(istek({ durumKodu: 0 }))).toBe('işleniyor');
    expect(istekDurumMetni(istek({ durumKodu: 401, hataKodu: 'kimlik' }))).toBe('401 · kimlik');
    expect(istekDurumMetni(istek({}))).toBe('200');
    expect(istekSuresi(null)).toBe('ölçülmedi');
    expect(istekSuresi(0)).toBe('0 ms');
    expect(istekSuresi(1500)).toBe('1.5 sn');
  });

  it('anahtar başına sayım: çoktan aza, anahtarsız istek ayrı kalemde gizlenmez', () => {
    const liste = [
      istek({ id: '1' }), istek({ id: '2' }),
      istek({ id: '3', anahtar: { id: 'a2', ad: 'CMDB' } }),
      istek({ id: '4', anahtar: null, durumKodu: 401, hataKodu: 'kimlik' }),
    ];
    expect(anahtarBasinaSayim(liste)).toEqual([
      { ad: 'SIEM', sayi: 2 }, { ad: 'CMDB', sayi: 1 }, { ad: 'anahtarsız', sayi: 1 },
    ]);
    const dip = sonIstekDipNotu(liste, 50);
    expect(dip).toContain('4 istek · kayıtların tamamı');
    expect(dip).toContain('anahtarsız 1');
    expect(dip).toContain('1 istek hata döndü');
  });

  it('boş liste ölçülmüş sıfırdır; tavan dolunca öncekilerin listede olmadığı söylenir', () => {
    expect(sonIstekDipNotu([], 50)).toMatch(/sayım yapıldı, sonuç sıfır/);
    const dolu = Array.from({ length: 50 }, (_, i) => istek({ id: String(i) }));
    expect(sonIstekDipNotu(dolu, 50)).toMatch(/son 50 istek görünüyor/);
  });
});

/* ═══ parolaBelirle — yönetici kapısı ═════════════════════════════════ */

describe('parolaBelirle', () => {
  it('oturumsuz çağrı reddedilir, parola yazılmaz', async () => {
    oturumCereziAyarla(null);
    const s = await parolaBelirle({ kullaniciId: kimlik.parolasiz, parola: YENI });
    expect(s).toEqual({ ok: false, hata: 'Oturum gerekli' });
    expect(await parolaOzeti(kimlik.parolasiz)).toBeNull();
  });

  it('yönetim/onay yetkisi olmayan (okuyucu) reddedilir', async () => {
    await oturumAc(kimlik.okuyucu);
    const s = await parolaBelirle({ kullaniciId: kimlik.parolasiz, parola: YENI });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/yetkiniz yok \(yonetim\/onay\)/);
    expect(await parolaOzeti(kimlik.parolasiz)).toBeNull();
  });

  it('kısa parola zod kapısında düşer', async () => {
    await oturumAc(kimlik.yonetici);
    const s = await parolaBelirle({ kullaniciId: kimlik.parolasiz, parola: 'kisa' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/en az 12 karakter/);
    expect(await parolaOzeti(kimlik.parolasiz)).toBeNull();
  });

  it('yönetici parola tanımlar: özet yazılır, hedefin TÜM oturumları düşer, iz parolayı taşımaz', async () => {
    // Hedefin iki açık oturumu olsun — ikisi de kesilmeli.
    await oturumAc(kimlik.parolasiz);
    await oturumAc(kimlik.parolasiz);
    expect(await oturumSayisi(kimlik.parolasiz)).toBe(2);

    await oturumAc(kimlik.yonetici);
    const s = await parolaBelirle({ kullaniciId: kimlik.parolasiz, parola: YENI });
    expect(s).toEqual({ ok: true });

    const h = await parolaOzeti(kimlik.parolasiz);
    expect(h).not.toBeNull();
    expect(h).not.toContain(YENI);
    expect(parolaDogru(YENI, h)).toBe(true);
    expect(await oturumSayisi(kimlik.parolasiz)).toBe(0);

    const kayit = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Kullanici', varlikId: kimlik.parolasiz, eylem: 'parola_tanimlama' },
      orderBy: { zaman: 'desc' },
    });
    expect(kayit?.aktorId).toBe(kimlik.yonetici);
    expect(kayit?.gerekce).toBe('2 oturum kapatıldı');
    const metin = JSON.stringify(kayit);
    expect(metin).not.toContain(YENI);
    expect(metin).not.toContain(h as string);
  });

  it('olmayan kullanıcı için anlaşılır ret', async () => {
    await oturumAc(kimlik.yonetici);
    const s = await parolaBelirle({ kullaniciId: 'yok-boyle-biri', parola: YENI });
    expect(s).toEqual({ ok: false, hata: 'Kullanıcı bulunamadı' });
  });
});

/* ═══ parolaDegistir — kişinin kendi kaydı ═══════════════════════════ */

describe('parolaDegistir', () => {
  it('oturumsuz çağrı reddedilir', async () => {
    oturumCereziAyarla(null);
    const s = await parolaDegistir({ eski: ESKI, yeni: YENI });
    expect(s).toEqual({ ok: false, hata: 'Oturum gerekli' });
  });

  it('yanlış mevcut parola reddedilir ve hiçbir şey değişmez', async () => {
    await oturumAc(kimlik.okuyucu);
    const once = await parolaOzeti(kimlik.okuyucu);
    const s = await parolaDegistir({ eski: 'yanlis-parola-9999', yeni: YENI });
    expect(s).toEqual({ ok: false, hata: 'Mevcut parola hatalı' });
    expect(await parolaOzeti(kimlik.okuyucu)).toBe(once);
    expect(await oturumSayisi(kimlik.okuyucu)).toBeGreaterThan(0);
  });

  it('yeni parola eskisiyle aynıysa reddedilir', async () => {
    await oturumAc(kimlik.okuyucu);
    const s = await parolaDegistir({ eski: ESKI, yeni: ESKI });
    expect(s).toEqual({ ok: false, hata: 'Yeni parola mevcut parolayla aynı olamaz' });
  });

  it('yetkisi olmayan hesap bile kendi parolasını değiştirir; diğer oturumlar düşer, MEVCUT kalır', async () => {
    // okuyucu yalnız okuma yetkisi taşır — kendi parolası için yeterli olmalı
    await db.oturum.deleteMany({ where: { kullaniciId: kimlik.okuyucu } });
    const baska = await oturumAc(kimlik.okuyucu);   // başka tarayıcı
    const mevcut = await oturumAc(kimlik.okuyucu);  // bu tarayıcı (çerezde)
    expect(await oturumSayisi(kimlik.okuyucu)).toBe(2);

    const s = await parolaDegistir({ eski: ESKI, yeni: YENI });
    expect(s).toEqual({ ok: true });
    expect(parolaDogru(YENI, await parolaOzeti(kimlik.okuyucu))).toBe(true);

    const kalan = await db.oturum.findMany({ where: { kullaniciId: kimlik.okuyucu } });
    expect(kalan.map((o) => o.tokenHash)).toEqual([ozet(mevcut)]);
    expect(kalan.some((o) => o.tokenHash === ozet(baska))).toBe(false);

    const kayit = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Kullanici', varlikId: kimlik.okuyucu, eylem: 'parola_degisimi' },
    });
    expect(kayit?.gerekce).toContain('1 diğer oturum kapatıldı');
    expect(JSON.stringify(kayit)).not.toContain(YENI);
  });
});

/* ═══ profilGuncelle · digerOturumlariKapat ═══════════════════════════ */

describe('profilGuncelle', () => {
  it('yalnız kendi kaydını yazar; e-postaya dokunmaz; değişen alan iz bırakır', async () => {
    await oturumAc(kimlik.okuyucu);
    const s = await profilGuncelle({ adSoyad: 'Hesap Okuyucu Yeni', unvan: '  ' });
    expect(s).toEqual({ ok: true });
    const k = await db.kullanici.findUniqueOrThrow({ where: { id: kimlik.okuyucu } });
    expect(k.adSoyad).toBe('Hesap Okuyucu Yeni');
    expect(k.unvan).toBeNull();                        // boşluk = bilinmiyor, "" değil
    expect(k.eposta).toBe(`${ONEK}-okuyucu@ornek.test`);
    const izler = await db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'Kullanici', varlikId: kimlik.okuyucu, eylem: 'guncelleme' },
    });
    expect(izler.map((i) => i.alan)).toContain('adSoyad');
    expect(izler.some((i) => i.alan === 'unvan')).toBe(false); // null → null: değişmedi
  });

  it('boş ad soyad reddedilir', async () => {
    await oturumAc(kimlik.okuyucu);
    const s = await profilGuncelle({ adSoyad: '   ', unvan: null });
    expect(s.ok).toBe(false);
  });
});

describe('ayarlarVerisi', () => {
  it('yalnız kendi kaydını okur; bu oturumu çerezden bulur; parola özeti ekrana inmez', async () => {
    await db.oturum.deleteMany({ where: { kullaniciId: kimlik.okuyucu } });
    await oturumAc(kimlik.okuyucu);          // başka cihaz
    await oturumAc(kimlik.okuyucu);          // bu tarayıcı (çerezde)
    const k = await (await import('@/lib/auth')).aktifKullanici();
    expect(k?.id).toBe(kimlik.okuyucu);
    const simdi = Date.now();
    const v = await ayarlarVerisi(k!, simdi);

    expect(v.profil.eposta).toBe(`${ONEK}-okuyucu@ornek.test`);
    expect(v.profil.parolaVar).toBe(true);
    expect(v.oturum.aktifSayi).toBe(2);
    expect(v.oturum.buOturum).not.toBeNull();
    expect(new Date(v.oturum.buOturum!.mutlakBitis).getTime()).toBeGreaterThan(simdi);
    expect(v.hesap.id).toBe(kimlik.okuyucu);
    expect(v.hesap.yetkiler.map((y) => y.rol)).toEqual(['okuyucu']);
    expect(v.yonetimOkuyabilir).toBe(true);   // okuyucu rolü yonetim/okuma taşır

    // Özet, jeton ve başka bir kullanıcının kimliği çıktıda YOK.
    const metin = JSON.stringify(v);
    expect(metin).not.toContain('s1$');
    expect(metin).not.toContain('parolaHash');
    expect(metin).not.toContain('tokenHash');
    expect(metin).not.toContain(kimlik.yonetici);
  });

  it('oturumsuz çağrı bağlamında "bu oturum" bilinmiyor kalır, sayı uydurulmaz', async () => {
    oturumCereziAyarla(null);
    const k = { id: kimlik.parolasiz, adSoyad: 'Parolasız Hesap',
      eposta: `${ONEK}-parolasiz@ornek.test`, unvan: null, yetkiler: [] };
    const v = await ayarlarVerisi(k, Date.now());
    expect(v.oturum.buOturum).toBeNull();
    // Yönetici az önce parola tanımladı (parolaBelirle testi) — artık tanımlı.
    expect(typeof v.profil.parolaVar).toBe('boolean');
    expect(v.hesap.yetkiler).toEqual([]);
    expect(v.yonetimOkuyabilir).toBe(false);
  });
});

describe('digerOturumlariKapat', () => {
  it('mevcut oturum ayakta kalır, gerisi silinir', async () => {
    await db.oturum.deleteMany({ where: { kullaniciId: kimlik.yonetici } });
    await oturumAc(kimlik.yonetici);
    await oturumAc(kimlik.yonetici);
    const mevcut = await oturumAc(kimlik.yonetici);
    const s = await digerOturumlariKapat();
    expect(s).toEqual({ ok: true });
    const kalan = await db.oturum.findMany({ where: { kullaniciId: kimlik.yonetici } });
    expect(kalan.map((o) => o.tokenHash)).toEqual([ozet(mevcut)]);
  });
});
