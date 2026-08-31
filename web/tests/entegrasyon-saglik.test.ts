import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AktifKullanici } from '@/lib/auth';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-entegrasyon-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

// Sır DEĞERİ gerçekten çözülebilir olmalı ki "maskeliyoruz" iddiası anlamlı olsun.
const SIR_DEGERI = 'ustGizli-P4rola-9x7q';
process.env.ENTEGRASYON_TEST_SIR = SIR_DEGERI;

const {
  connectorSagligi, tazelikHesapla, kosuBayatMi, durumSayilari,
  entegrasyonSagligiOzeti, BAYAT_KOSU_ESIGI_DK,
} = await import('@/lib/entegrasyon/saglikOzeti');
const { siriCoz } = await import('@/lib/entegrasyon/sir');
type ConnectorGirdi = Parameters<typeof connectorSagligi>[0];
type KosuGirdi = Parameters<typeof connectorSagligi>[1][number];

const SIMDI = new Date('2026-08-31T12:00:00Z');
const dkOnce = (dk: number) => new Date(SIMDI.getTime() - dk * 60_000);

const conn = (y: Partial<ConnectorGirdi> = {}): ConnectorGirdi => ({
  id: 'c1', kod: 'AD-01', ad: 'Active Directory', tip: 'ad_entra',
  durum: 'etkin', kaynakSistem: 'entra.zorlu.local', kimlikTipi: 'none',
  sirReferansi: null, pollAralikDk: null, sonBasariliKosu: null,
  sonHata: null, etkin: true, imlec: null, ...y,
});

const kosu = (y: Partial<KosuGirdi> = {}): KosuGirdi => ({
  id: 'k1', durum: 'basarili', tetikleyen: 'zamanlanmis',
  baslangic: dkOnce(10), bitis: dkOnce(9), sureMs: 60_000,
  alinan: 10, kabulEdilen: 10, reddedilen: 0, yinelenen: 0, denemeNo: 1,
  imlecOnce: null, imlecSonra: null, hata: null, ...y,
});

describe('Entegrasyon sağlığı — sessiz hata yasağı', () => {
  it('hiç koşmamış connector SAĞLIKLI görünmez; "hiç koşmadı" ayrı bir durumdur', () => {
    const s = connectorSagligi(conn(), [], { simdi: SIMDI });
    expect(s.durum).toBe('hic_kosmadi');
    expect(s.durum).not.toBe('basarili');
    expect(s.hicKosmadi).toBe(true);
    expect(s.sonKosu).toBeNull();
    // Veri tazeliği de "taze" diye uydurulmaz.
    expect(s.tazelik.durum).toBe('bilinmiyor');
    expect(s.tazelik.gecenDk).toBeNull();
  });

  it('etkin ama hiç koşmamış connector, sayaçlarda başarılı kovasına düşmez', () => {
    const sayilar = durumSayilari([connectorSagligi(conn({ etkin: true }), [], { simdi: SIMDI })]);
    expect(sayilar.basarili).toBe(0);
    expect(sayilar.hic_kosmadi).toBe(1);
  });

  it('yorumlanamayan koşu durumu "bilinmiyor" döner — başarılı da başarısız da sayılmaz', () => {
    const s = connectorSagligi(conn(), [kosu({ durum: 'yarim_kaldi' })], { simdi: SIMDI });
    expect(s.durum).toBe('bilinmiyor');
  });
});

describe('kimlik_bekleniyor ile basarisiz ayrımı', () => {
  it('kimlik referansı olmayan connector başarısız DEĞİL, kimlik bekleniyor sayılır', () => {
    const s = connectorSagligi(
      conn({ kimlikTipi: 'api_key', sirReferansi: null }),
      [kosu({ durum: 'basarisiz', hata: 'bağlantı kurulamadı' })],
      { simdi: SIMDI });
    expect(s.durum).toBe('kimlik_bekleniyor');
    expect(s.durum).not.toBe('basarisiz');
    expect(s.kimlikEksik).toBe(true);
    expect(s.kimlikGerekce).toContain('sır referansı tanımlı değil');
  });

  it('kimlik referansı biçimsel olarak geçersizse de kimlik bekleniyor sayılır', () => {
    const s = connectorSagligi(
      conn({ kimlikTipi: 'basic', sirReferansi: 'AD_PAROLA' }), [], { simdi: SIMDI });
    expect(s.durum).toBe('kimlik_bekleniyor');
    expect(s.kimlikGerekce).toContain('geçersiz');
  });

  it('kimlik yerindeyken başarısız koşu GERÇEKTEN başarısız gösterilir', () => {
    const s = connectorSagligi(
      conn({ kimlikTipi: 'api_key', sirReferansi: 'env:ENTEGRASYON_TEST_SIR' }),
      [kosu({ durum: 'basarisiz', hata: 'HTTP 500' })],
      { simdi: SIMDI });
    expect(s.durum).toBe('basarisiz');
    expect(s.kimlikEksik).toBe(false);
    expect(s.sonKosu?.hata).toBe('HTTP 500');
  });

  it('iki durum aynı kovaya konmaz', () => {
    const bekleyen = connectorSagligi(conn({ kimlikTipi: 'api_key' }), [], { simdi: SIMDI });
    const basarisiz = connectorSagligi(
      conn({ id: 'c2', kimlikTipi: 'none' }), [kosu({ durum: 'basarisiz', hata: 'x' })],
      { simdi: SIMDI });
    const sayilar = durumSayilari([bekleyen, basarisiz]);
    expect(sayilar.kimlik_bekleniyor).toBe(1);
    expect(sayilar.basarisiz).toBe(1);
  });
});

describe('Bayat koşu — ölmüş süreç "çalışıyor" görünemez', () => {
  it('durum=calisiyor ama başlangıcı çok eski koşu bayat işaretlenir', () => {
    const eski = kosu({ durum: 'calisiyor', bitis: null, sureMs: null,
      baslangic: dkOnce(BAYAT_KOSU_ESIGI_DK * 3) });
    expect(kosuBayatMi(eski, SIMDI)).toBe(true);
    const s = connectorSagligi(conn(), [eski], { simdi: SIMDI });
    expect(s.durum).toBe('bayat_kosu');
    expect(s.bayatKosu).toBe(true);
    expect(s.sonKosu?.bayat).toBe(true);
  });

  it('yeni başlamış calisiyor koşusu bayat DEĞİLDİR', () => {
    const taze = kosu({ durum: 'calisiyor', bitis: null, sureMs: null, baslangic: dkOnce(3) });
    expect(kosuBayatMi(taze, SIMDI)).toBe(false);
    const s = connectorSagligi(conn(), [taze], { simdi: SIMDI });
    expect(s.durum).toBe('calisiyor');
    expect(s.bayatKosu).toBe(false);
  });

  it('bayat koşu geçmiş satırında da işaretli kalır', () => {
    const s = connectorSagligi(conn(), [
      kosu({ id: 'k9', durum: 'calisiyor', bitis: null, baslangic: dkOnce(600) }),
      kosu({ id: 'k8', durum: 'basarili', baslangic: dkOnce(700) }),
    ], { simdi: SIMDI });
    expect(s.gecmis.map((g) => g.bayat)).toEqual([true, false]);
  });
});

describe('Veri tazeliği — bilinmeyen ≠ gecikmiş', () => {
  it('pollAralikDk yokken tazelik BİLİNMİYOR döner, gecikmiş değil', () => {
    const t = tazelikHesapla(dkOnce(60 * 24 * 30), null, SIMDI);
    expect(t.durum).toBe('bilinmiyor');
    expect(t.durum).not.toBe('gecikmis');
    expect(t.gecikmeOrani).toBeNull();   // ölçülemedi — SIFIR değil
    expect(t.beklenenDk).toBeNull();
    expect(t.gecenDk).toBe(60 * 24 * 30); // geçen süre yine de bilinir
  });

  it('poll aralığı tanımlıyken gecikme = geçen süre / beklenen aralık', () => {
    const t = tazelikHesapla(dkOnce(300), 60, SIMDI);
    expect(t.gecikmeOrani).toBeCloseTo(5, 5);
    expect(t.durum).toBe('gecikmis');
  });

  it('beklenen aralık içindeki connector taze sayılır', () => {
    const t = tazelikHesapla(dkOnce(30), 60, SIMDI);
    expect(t.durum).toBe('taze');
    expect(t.gecikmeOrani).toBeCloseTo(0.5, 5);
  });

  it('hiç başarılı koşu yoksa geçen süre de bilinmez', () => {
    const t = tazelikHesapla(null, 60, SIMDI);
    expect(t.durum).toBe('bilinmiyor');
    expect(t.gecenDk).toBeNull();
    expect(t.aciklama).toContain('Hiç başarılı koşu yok');
  });

  it('sonBasariliKosu yazılmamışsa geçmişteki başarılı koşudan türetilir', () => {
    const s = connectorSagligi(
      conn({ pollAralikDk: 60, sonBasariliKosu: null }),
      [kosu({ durum: 'basarisiz', baslangic: dkOnce(5), bitis: dkOnce(5), hata: 'x' }),
        kosu({ id: 'k0', durum: 'basarili', baslangic: dkOnce(40), bitis: dkOnce(39) })],
      { simdi: SIMDI });
    expect(s.sonBasariliKosu).not.toBeNull();
    expect(s.tazelik.durum).toBe('taze');
  });
});

describe('Reddedilen kayıtlar sessizce yutulmaz', () => {
  it('reddedilen > 0 ise sebep okunabilir', () => {
    const s = connectorSagligi(conn(), [kosu({
      alinan: 10, kabulEdilen: 7, reddedilen: 3,
      hata: '3 kayıt reddedildi: kaynakKayitId eksik' })], { simdi: SIMDI });
    expect(s.sonKosu?.reddSebebi).toContain('kaynakKayitId eksik');
    expect(s.sonKosu?.reddSebebiEksik).toBe(false);
  });

  it('reddedilen > 0 ama sebep yazılmamışsa boşluk işaretlenir', () => {
    const s = connectorSagligi(conn(), [kosu({
      alinan: 10, kabulEdilen: 7, reddedilen: 3, hata: null })], { simdi: SIMDI });
    expect(s.sonKosu?.reddSebebiEksik).toBe(true);
  });

  it('sayaçlar tutmuyorsa (alınan ≠ kabul+red+yinelenen) tutarsızlık görünür', () => {
    const s = connectorSagligi(conn(), [kosu({
      alinan: 10, kabulEdilen: 3, reddedilen: 1, yinelenen: 0 })], { simdi: SIMDI });
    expect(s.sonKosu?.sayacTutarsiz).toBe(true);
  });
});

describe('Sır sızıntısı koruması', () => {
  const c = conn({ kimlikTipi: 'api_key', sirReferansi: 'env:ENTEGRASYON_TEST_SIR' });

  it('sır referansı MASKELİ döner — yalnız adres, değer değil', () => {
    const s = connectorSagligi(c, [kosu()], { simdi: SIMDI });
    expect(s.sirMaskeli).toBe('env: ENTEGRASYON_TEST_SIR');
    expect(s).not.toHaveProperty('sirReferansi');
  });

  it('sır DEĞERİ dönen hiçbir alanda bulunmaz', async () => {
    // Değer gerçekten çözülebiliyor: maskeleme "zaten yoktu" değil, bilinçli seçim.
    const cozum = await siriCoz('env:ENTEGRASYON_TEST_SIR');
    expect(cozum).toEqual({ ok: true, deger: SIR_DEGERI });

    const s = connectorSagligi(c, [
      kosu({ hata: 'yetkilendirme reddedildi', imlecSonra: '2026-08-31T11:00:00Z' }),
    ], { simdi: SIMDI });
    expect(JSON.stringify(s)).not.toContain(SIR_DEGERI);
    for (const deger of Object.values(s)) {
      expect(JSON.stringify(deger ?? null)).not.toContain(SIR_DEGERI);
    }
  });
});

/* ═══ Sorgu katmanı — gerçek (kopyalanmış) veritabanına karşı ═════════ */

const kisi = (yetkiler: AktifKullanici['yetkiler']): AktifKullanici => ({
  id: 'k1', adSoyad: 'Test', eposta: 't@t', unvan: null, yetkiler,
});
const yetki = (p: Partial<AktifKullanici['yetkiler'][number]>) => ({
  rol: 'yonetici', surecId: null, tesisId: null, tuzelKisiId: null,
  regulasyonId: null, modul: null, ...p,
});

describe('entegrasyonSagligiOzeti (izole DB kopyası)', () => {
  it('connector kaydı yokken boş özet döner — çökmez, "sağlıklı" da demez', async () => {
    const ozet = await entegrasyonSagligiOzeti(kisi([yetki({})]));
    expect(ozet.yetkili).toBe(true);
    expect(ozet.connectorlar).toEqual([]);
    expect(ozet.sayilar.basarili).toBe(0);
    expect(ozet.sayilar.hic_kosmadi).toBe(0);
  });

  it('yetkisiz kullanıcı sır referansını BİLE görmez', async () => {
    const ozet = await entegrasyonSagligiOzeti(kisi([yetki({ rol: 'katkici' })]));
    expect(ozet.yetkili).toBe(false);
    expect(ozet.connectorlar).toEqual([]);
    expect(JSON.stringify(ozet)).not.toContain('env:');
  });

  it('okuma yetkisi olan connector satırlarını görür, yazma yetkisi gerekmez', async () => {
    const ozet = await entegrasyonSagligiOzeti(kisi([yetki({ rol: 'okuyucu' })]));
    expect(ozet.yetkili).toBe(true);
  });
});
