import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-entg-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { senkronizasyonKos, bayatKosulariKapat } = await import('@/lib/entegrasyon/cekirdek');
const { adaptorKaydet, adaptorCoz, adaptorSil, kayitliTipler } = await import('@/lib/entegrasyon/kayit');
const { BaglanmamisAdaptor, temelDogrula } = await import('@/lib/entegrasyon/sozlesme');
import type {
  Adaptor, AdaptorBaglami as Baglam, CekmeSonucu, Gozlem,
} from '@/lib/entegrasyon/sozlesme';

/* SAHTE ADAPTÖR YALNIZ TESTTE: üretim kayıt defteri (lib/entegrasyon/kayit.ts)
   yalnız `adaptorler/` altındaki gerçek adaptörleri yükler ve onların yedisi
   "bağlı değil" der. Buradaki fikstür çekirdeğin sözleşmeye karşı davranışını
   ölçer; üretimde sahte connector YOKTUR. */

function gozlem(id: string, kaynak: string, ek: Record<string, unknown> = {}): Gozlem {
  return {
    tip: 'varlik',
    koken: { kaynakSistem: kaynak, kaynakKayitId: id, toplanma: new Date(), guven: null },
    hostname: `sunucu-${id}`,
    ham: { id, kaynak },
    ...ek,
  } as Gozlem;
}

function adaptorYap(
  tip: string,
  cek: (b: Baglam) => Promise<CekmeSonucu>,
  ekstra: Partial<Adaptor> = {},
): Adaptor {
  const a: Adaptor = {
    tip,
    baglanabilir: true,
    async testConnection() { return { ok: true, ayrinti: 'sahte fikstür' }; },
    async discover() { return { ozet: 'sahte fikstür', tahminiKayit: null }; },
    fetchChanges: cek,
    normalize: () => [],                       // kanca uygulanmadı → fetchChanges çıktısı geçerli
    validate: (g) => temelDogrula(g),
    async health() { return { durum: 'saglikli', ayrinti: 'sahte fikstür', tazelikDk: null }; },
    ...ekstra,
  } as Adaptor;
  adaptorKaydet(a, true);
  return a;
}

let sayac = 0;
async function connectorYap(tip: string, ek: Record<string, unknown> = {}) {
  sayac++;
  return db.connector.create({ data: {
    kod: `TEST-CON-${sayac}-${Date.now()}`,
    ad: `Test connector ${sayac}`,
    tip,
    kaynakSistem: `TEST-SISTEM-${sayac}`,
    etkin: true,
    durum: 'etkin',
    ...ek,
  } });
}

const bekleyici = () => {
  const beklemeler: number[] = [];
  return { beklemeler, bekle: async (ms: number) => { beklemeler.push(ms); } };
};

describe('Connector senkronizasyon çekirdeği (izole DB kopyası)', () => {
  beforeAll(async () => {
    await db.entegrasyonKosusu.deleteMany({ where: { connectorId: { not: null } } });
  });

  it('kayıt defteri: gerçek adaptörler yüklenir, bilinmeyen tip açık hata verir', () => {
    const tipler = kayitliTipler();
    expect(tipler).toContain('manual_import');
    expect(tipler.every((t) => adaptorCoz(t).tip === t)).toBe(true);
    expect(() => adaptorCoz('yok_boyle_bir_tip')).toThrow(/adaptör kayıtlı değil/);
  });

  it('idempotent senkronizasyon: aynı kaynak kaydı ikinci koşuda YENİ satır açmaz', async () => {
    const kaynak = 'TEST-IDEMPOTENT';
    let kayitlar = [gozlem('a1', kaynak), gozlem('a2', kaynak), gozlem('a3', kaynak)];
    adaptorYap('test_idempotent', async () => ({ gozlemler: kayitlar, yeniImlec: 'c1', devamVar: false }));
    const c = await connectorYap('test_idempotent');

    const ilk = await senkronizasyonKos(c.id);
    expect(ilk.durum).toBe('basarili');
    expect([ilk.alinan, ilk.kabulEdilen, ilk.reddedilen, ilk.yinelenen]).toEqual([3, 3, 0, 0]);
    expect(await db.kesifKaydi.count({ where: { kaynak } })).toBe(3);
    // köken yazıldı: otomatik gelen kayıt kökensiz kalmaz
    const kokenler = await db.veriKokeni.findMany({ where: { kaynakSistem: kaynak } });
    expect(kokenler.length).toBe(3);
    expect(kokenler.every((k) => k.kokenTipi === 'otomatik' && k.dogrulamaDurumu === 'dogrulanmadi')).toBe(true);
    expect(kokenler.every((k) => k.guven === null)).toBe(true);   // null = ÖLÇÜLMEDİ

    // aynı üç kayıt + bir yeni kayıt
    kayitlar = [...kayitlar, gozlem('a4', kaynak)];
    const ikinci = await senkronizasyonKos(c.id);
    expect(ikinci.durum).toBe('basarili');
    expect([ikinci.alinan, ikinci.kabulEdilen, ikinci.yinelenen]).toEqual([4, 4, 3]);
    expect(await db.kesifKaydi.count({ where: { kaynak } })).toBe(4);   // 3 yinelenen çoğaltılmadı
    expect(await db.veriKokeni.count({ where: { kaynakSistem: kaynak } })).toBe(4);
  });

  it('insan kararı korunur: incelenmiş keşif kaydı yeniden senkronizasyonda başa dönmez', async () => {
    const kaynak = 'TEST-KARAR';
    adaptorYap('test_karar', async () => ({ gozlemler: [gozlem('k1', kaynak)], yeniImlec: null, devamVar: false }));
    const c = await connectorYap('test_karar');
    await senkronizasyonKos(c.id);
    await db.kesifKaydi.updateMany({ where: { kaynak }, data: { durum: 'onaylandi' } });
    await senkronizasyonKos(c.id);
    const kayit = await db.kesifKaydi.findFirstOrThrow({ where: { kaynak } });
    expect(kayit.durum).toBe('onaylandi');
  });

  it('delta imleci: başarılı koşuda ilerler, BAŞARISIZ koşuda ilerlemez (kayıt kaybolmasın)', async () => {
    const kaynak = 'TEST-IMLEC';
    let patlat = false;
    adaptorYap('test_imlec', async () => {
      if (patlat) throw new Error('ETIMEDOUT: kaynak sisteme ulaşılamadı');
      return { gozlemler: [gozlem('i1', kaynak)], yeniImlec: 'imlec-1', devamVar: false };
    });
    const c = await connectorYap('test_imlec');

    const ilk = await senkronizasyonKos(c.id);
    expect(ilk.durum).toBe('basarili');
    expect(ilk.imlecSonra).toBe('imlec-1');
    expect((await db.connector.findUniqueOrThrow({ where: { id: c.id } })).imlec).toBe('imlec-1');

    patlat = true;
    const { beklemeler, bekle } = bekleyici();
    const ikinci = await senkronizasyonKos(c.id, { bekle });
    expect(ikinci.durum).toBe('basarisiz');
    expect(ikinci.imlecOnce).toBe('imlec-1');
    expect(ikinci.imlecSonra).toBeNull();
    expect(ikinci.denemeNo).toBe(3);                 // geçici hata → 3 deneme
    expect(beklemeler).toEqual([1_000, 4_000]);      // üstel geri çekilme
    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.imlec).toBe('imlec-1');             // İLERLEMEDİ
    expect(sonra.durum).toBe('hatali');
    expect(sonra.sonHata).toContain('ETIMEDOUT');
    const kosu = await db.entegrasyonKosusu.findUniqueOrThrow({ where: { id: ikinci.kosuId! } });
    expect(kosu.durum).toBe('basarisiz');
    expect(kosu.bitis).not.toBeNull();               // 'calisiyor' kalmadı
    expect(kosu.denemeNo).toBe(3);
    expect(kosu.imlecSonra).toBeNull();
  });

  it('yetki hatası GEÇİCİ değildir: tekrar denenmez', async () => {
    adaptorYap('test_yetki', async () => { throw new Error('401 Unauthorized: kimlik reddedildi'); });
    const c = await connectorYap('test_yetki');
    const { beklemeler, bekle } = bekleyici();
    const sonuc = await senkronizasyonKos(c.id, { bekle });
    expect(sonuc.durum).toBe('basarisiz');
    expect(sonuc.denemeNo).toBe(1);
    expect(beklemeler).toEqual([]);
    expect(sonuc.hata).toContain('tekrar denenmedi');
  });

  it('reddedilen kayıt sayacı: sebepler koşu kaydında görünür, kayıt sessizce düşmez', async () => {
    const kaynak = 'TEST-RED';
    adaptorYap('test_red', async () => ({
      gozlemler: [
        gozlem('r1', kaynak),
        gozlem('r2', kaynak, { hostname: null, etiket: null }),          // eşleme anahtarı yok
        { ...gozlem('r3', kaynak), koken: { kaynakSistem: kaynak, kaynakKayitId: '', toplanma: new Date(), guven: null } } as Gozlem,
        gozlem('r4', kaynak),
      ],
      yeniImlec: null, devamVar: false,
    }));
    const c = await connectorYap('test_red');
    const sonuc = await senkronizasyonKos(c.id);

    expect(sonuc.durum).toBe('basarili');
    expect(sonuc.alinan).toBe(4);
    expect(sonuc.kabulEdilen).toBe(2);
    expect(sonuc.reddedilen).toBe(2);
    expect(sonuc.alinan).toBe(sonuc.kabulEdilen + sonuc.reddedilen);   // sayaç sözleşmesi
    const kosu = await db.entegrasyonKosusu.findUniqueOrThrow({ where: { id: sonuc.kosuId! } });
    expect(kosu.reddedilen).toBe(2);
    expect(kosu.hata).toContain('2 kayıt reddedildi');
    expect(kosu.hata).toContain('eşleme anahtarı yok');
    expect(kosu.hata).toContain('köken eksik');
    expect(kosu.hata!.length).toBeLessThanOrEqual(2_000);
    expect(await db.kesifKaydi.count({ where: { kaynak } })).toBe(2);
  });

  it('bayat "calisiyor" koşusu kapatılır; TAZE koşu ikinci koşuyu engeller', async () => {
    const kaynak = 'TEST-BAYAT';
    adaptorYap('test_bayat', async () => ({ gozlemler: [gozlem('b1', kaynak)], yeniImlec: null, devamVar: false }));
    const c = await connectorYap('test_bayat');

    // süreç ölmüş gibi: 30 dk önce başlamış, hâlâ 'calisiyor'
    const bayat = await db.entegrasyonKosusu.create({ data: {
      kaynak: c.tip, connectorId: c.id, durum: 'calisiyor',
      baslangic: new Date(Date.now() - 30 * 60_000) } });

    const sonuc = await senkronizasyonKos(c.id);
    const kapanan = await db.entegrasyonKosusu.findUniqueOrThrow({ where: { id: bayat.id } });
    expect(kapanan.durum).toBe('basarisiz');          // 'calisiyor' bırakılmadı
    expect(kapanan.bitis).not.toBeNull();
    expect(kapanan.hata).toContain('yarıda kaldı');
    expect(sonuc.durum).toBe('basarili');             // bayat kayıt yeni koşuyu bloklamadı

    // taze bir 'calisiyor' koşusu varken ikinci koşu BAŞLAMAZ
    await db.entegrasyonKosusu.create({ data: {
      kaynak: c.tip, connectorId: c.id, durum: 'calisiyor' } });
    const oncekiSayi = await db.entegrasyonKosusu.count({ where: { connectorId: c.id } });
    const cakisan = await senkronizasyonKos(c.id);
    expect(cakisan.durum).toBe('atlandi');
    expect(cakisan.kosuId).toBeNull();
    expect(cakisan.ayrinti).toContain('zaten sürüyor');
    expect(await db.entegrasyonKosusu.count({ where: { connectorId: c.id } })).toBe(oncekiSayi);

    // süpürücü doğrudan da çağrılabilir (zamanlanmış temizlik)
    expect(await bayatKosulariKapat(c.id, 0)).toBe(1);
  });

  it('bağlanamayan adaptör: koşu kimlik_bekleniyor ile kapanır, HATA sayılmaz', async () => {
    class BagliDegil extends BaglanmamisAdaptor {
      readonly tip = 'test_baglanmamis';
      readonly gereken = 'AD servis hesabı ve LDAPS sertifikası';
    }
    adaptorKaydet(new BagliDegil(), true);
    const c = await connectorYap('test_baglanmamis', { imlec: 'imlec-0' });

    const sonuc = await senkronizasyonKos(c.id);
    expect(sonuc.durum).toBe('kimlik_bekleniyor');
    expect(sonuc.ayrinti).toContain('AD servis hesabı');
    expect(sonuc.alinan).toBe(0);

    const kosu = await db.entegrasyonKosusu.findUniqueOrThrow({ where: { id: sonuc.kosuId! } });
    expect(kosu.durum).toBe('kimlik_bekleniyor');
    expect(kosu.bitis).not.toBeNull();
    expect(kosu.imlecSonra).toBeNull();

    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.durum).not.toBe('hatali');           // kırmızı değil, bekliyor
    expect(sonra.durum).toBe('taslak');
    expect(sonra.sonHata).toBeNull();
    expect(sonra.imlec).toBe('imlec-0');              // koşu başlamadı, imleç sabit
    expect(sonra.sonBasariliKosu).toBeNull();         // "başarılı" numarası yapılmadı
  });

  it('boş sonuç "hiç kayıt yok" demektir, "bağlanamadım" demek DEĞİLDİR', async () => {
    adaptorYap('test_bos', async () => ({ gozlemler: [], yeniImlec: 'bos-1', devamVar: false }));
    const c = await connectorYap('test_bos');
    const sonuc = await senkronizasyonKos(c.id);
    expect(sonuc.durum).toBe('basarili');            // kimlik_bekleniyor ile karıştırılmadı
    expect(sonuc.alinan).toBe(0);
    expect(sonuc.hata).toBeNull();
    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.imlec).toBe('bos-1');               // kaynak "değişiklik yok" dedi, imleç ilerledi
    expect(sonra.sonBasariliKosu).not.toBeNull();
  });

  it('adaptörü olmayan tip sessizce geçilmez: koşu basarisiz kapanır', async () => {
    const c = await connectorYap('test_kayitsiz_tip');
    const sonuc = await senkronizasyonKos(c.id);
    expect(sonuc.durum).toBe('basarisiz');
    expect(sonuc.hata).toContain('adaptör kayıtlı değil');
    const kosu = await db.entegrasyonKosusu.findUniqueOrThrow({ where: { id: sonuc.kosuId! } });
    expect(kosu.durum).toBe('basarisiz');
    expect(kosu.bitis).not.toBeNull();
    expect(() => adaptorCoz('test_kayitsiz_tip')).toThrow(/adaptör kayıtlı değil/);
  });

  it('sır: adaptöre ulaşır ama hiçbir kalıcı alana yazılmaz', async () => {
    const kaynak = 'TEST-SIR';
    const SIR = 'p@rola-COK-GIZLI-9137';
    process.env.UYUM_TEST_SIR = SIR;
    let gorulen: string | null = null;
    adaptorYap('test_sir', async (b) => {
      gorulen = b.sir;
      // Kötü davranan adaptör: sırrı ham yüke ve imlece sızdırıyor.
      return {
        gozlemler: [gozlem('s1', kaynak, { ham: { id: 's1', authorization: `Bearer ${SIR}` } })],
        yeniImlec: null, devamVar: false,
      };
    });
    const c = await connectorYap('test_sir', {
      kimlikTipi: 'api_key', sirReferansi: 'env:UYUM_TEST_SIR' });

    const sonuc = await senkronizasyonKos(c.id);
    expect(sonuc.durum).toBe('basarili');
    expect(gorulen).toBe(SIR);                        // sır gerçekten çözüldü

    const kayit = await db.kesifKaydi.findFirstOrThrow({ where: { kaynak } });
    expect(kayit.hamJson).not.toContain(SIR);
    expect(kayit.hamJson).toContain('[SIR]');         // maskelendi, atılmadı
    expect(JSON.stringify(sonuc)).not.toContain(SIR);
    const kosu = await db.entegrasyonKosusu.findUniqueOrThrow({ where: { id: sonuc.kosuId! } });
    expect(JSON.stringify(kosu)).not.toContain(SIR);
    expect(JSON.stringify(await db.connector.findUniqueOrThrow({ where: { id: c.id } }))).not.toContain(SIR);
    delete process.env.UYUM_TEST_SIR;
  });

  it('çözülemeyen sır koşuyu başarısız kapatır (sessiz boş sonuç değil)', async () => {
    adaptorYap('test_sirsiz', async () => ({ gozlemler: [], yeniImlec: null, devamVar: false }));
    const c = await connectorYap('test_sirsiz', {
      kimlikTipi: 'api_key', sirReferansi: 'env:UYUM_TANIMSIZ_DEGISKEN' });
    const sonuc = await senkronizasyonKos(c.id);
    expect(sonuc.durum).toBe('basarisiz');
    expect(sonuc.hata).toContain('Sır çözülemedi');
    expect(sonuc.hata).toContain('UYUM_TANIMSIZ_DEGISKEN');   // adres görünür, değer yok
  });

  it('pasif ve silinmiş connector koşturulmaz (koşu kaydı da açılmaz)', async () => {
    adaptorYap('test_pasif', async () => ({ gozlemler: [], yeniImlec: null, devamVar: false }));
    const pasif = await connectorYap('test_pasif', { etkin: false, durum: 'duraklatildi' });
    const p = await senkronizasyonKos(pasif.id);
    expect(p.durum).toBe('atlandi');
    expect(p.kosuId).toBeNull();

    const silinmis = await connectorYap('test_pasif', { silindi: new Date() });
    const s = await senkronizasyonKos(silinmis.id);
    expect(s.durum).toBe('atlandi');
    expect(await db.entegrasyonKosusu.count({ where: { connectorId: { in: [pasif.id, silinmis.id] } } })).toBe(0);
  });

  it('sayfalama: imleç sayfa sayfa ilerler, ilerlemeyen imleç sonsuz döngüye girmez', async () => {
    const kaynak = 'TEST-SAYFA';
    let cagri = 0;
    adaptorYap('test_sayfa', async () => {
      cagri++;
      if (cagri === 1) return { gozlemler: [gozlem('p1', kaynak)], yeniImlec: 'sayfa-1', devamVar: true };
      return { gozlemler: [gozlem('p2', kaynak)], yeniImlec: 'sayfa-2', devamVar: false };
    });
    const c = await connectorYap('test_sayfa');
    const sonuc = await senkronizasyonKos(c.id);
    expect(sonuc.durum).toBe('basarili');
    expect(sonuc.alinan).toBe(2);
    expect(sonuc.imlecSonra).toBe('sayfa-2');

    // imleci ilerletmeden devamVar=true diyen adaptör: açık hata, sonsuz döngü yok
    adaptorYap('test_sayfa', async () => ({ gozlemler: [], yeniImlec: null, devamVar: true }));
    const d = await connectorYap('test_sayfa');
    const dongu = await senkronizasyonKos(d.id);
    expect(dongu.durum).toBe('basarisiz');
    expect(dongu.hata).toContain('sonsuz döngü');
    adaptorSil('test_sayfa');
  });
});
