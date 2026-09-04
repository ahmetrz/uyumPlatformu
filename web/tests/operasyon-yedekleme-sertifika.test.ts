import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Yedekleme politikası · restore testi · tedarikçi · sertifika

   `lib/eylemler2/operasyon.ts` %45,2 kapsamdaydı; kapsanmayan yarısı
   tam olarak burasıydı. Çivilenen ürün kuralları:

   · SERTİFİKA DURUMU TÜRETİLİR, elle girilmez. Eskiden elle giriliyordu
     ve yenilenen bir sertifika kayıtta 'suresi_doldu' kalıyordu — yani
     uyum panosunda kapanmayan bir kırmızı.
   · TEDARİKÇİ UZAKTAN ERİŞİMİ bir uyum kontrolünün kanıtıdır: değişimi
     denetim izine yazılmadan kabul edilmez.
   · `oturumKaydiVar` ÜÇ DURUMLUDUR — null "bilinmiyor"dur, "hayır"
     değil. `undefined` ile `null` da ayrı şeydir: ilki "bu alana hiç
     dokunma", ikincisi "bilinmiyor olarak yaz".
   · RESTORE TESTİ yedeğin geri dönebildiğinin KANITIDIR (§12) ve kendi
     iz satırını bırakır.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yedekleme-'));
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
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'yedek@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const {
  yedeklemePolitikasiKaydet, yedeklemeKosusuKaydet, restoreTestiKaydet,
  tedarikciKaydet, sertifikaKaydet,
} = await import('@/lib/eylemler2/operasyon');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);
const REDDEDILDI = /yetki|kapsam/i;

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;
const gunSonra = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  oturum.eposta = kisi.eposta;
});

describe('Yedekleme politikası ve koşusu', () => {
  it('politika açılır, ikinci kayıt günceller', async () => {
    const ad = benzersiz('pol');
    expect(hataMetni(await yedeklemePolitikasiKaydet({
      ad, kapsam: 'SCADA sunucuları', siklik: 'gunluk', saklamaGun: 30,
    }))).toBe('');
    const p = await db.yedeklemePolitikasi.findFirstOrThrow({ where: { ad } });
    expect(p.saklamaGun).toBe(30);

    expect(hataMetni(await yedeklemePolitikasiKaydet({
      id: p.id, ad, siklik: 'haftalik', saklamaGun: 90,
    }))).toBe('');
    const guncel = await db.yedeklemePolitikasi.findUniqueOrThrow({ where: { id: p.id } });
    expect(guncel.saklamaGun).toBe(90);
    expect(guncel.siklik).toBe('haftalik');
    expect(await db.yedeklemePolitikasi.count({ where: { ad } })).toBe(1);
  });

  it('boş ad ve negatif saklama süresi reddedilir [YED-POL-002]', async () => {
    expect(hataMetni(await yedeklemePolitikasiKaydet({ ad: '   ' }))).not.toBe('');
    expect(hataMetni(await yedeklemePolitikasiKaydet({
      ad: benzersiz('pol-eksi'), saklamaGun: -5,
    }))).not.toBe('');
  });

  it('koşu politikaya bağlanır; başarısız koşu sebebiyle saklanır', async () => {
    const ad = benzersiz('pol-kosu');
    await yedeklemePolitikasiKaydet({ ad });
    const p = await db.yedeklemePolitikasi.findFirstOrThrow({ where: { ad } });

    expect(hataMetni(await yedeklemeKosusuKaydet({
      politikaId: p.id, durum: 'basarisiz', hata: 'hedef disk dolu',
    }))).toBe('');
    const k = await db.yedeklemeKosusu.findFirstOrThrow({
      where: { politikaId: p.id }, orderBy: { zaman: 'desc' },
    });
    expect(k.durum).toBe('basarisiz');
    // Başarısızlığın SEBEBİ saklanır; yoksa koşu "oldu/olmadı"ya iner.
    expect(k.hata).toBe('hedef disk dolu');
  });

  it('sözlük dışı koşu durumu reddedilir', async () => {
    const ad = benzersiz('pol-durum');
    await yedeklemePolitikasiKaydet({ ad });
    const p = await db.yedeklemePolitikasi.findFirstOrThrow({ where: { ad } });
    expect(hataMetni(await yedeklemeKosusuKaydet({
      politikaId: p.id, durum: 'belki',
    }))).not.toBe('');
  });

  it('restore testi KANITTIR: koşuya bağlanır ve iz bırakır [YED-POL-001]', async () => {
    const ad = benzersiz('pol-restore');
    await yedeklemePolitikasiKaydet({ ad });
    const p = await db.yedeklemePolitikasi.findFirstOrThrow({ where: { ad } });
    await yedeklemeKosusuKaydet({ politikaId: p.id, durum: 'basarili', boyutMb: 120 });
    const kosu = await db.yedeklemeKosusu.findFirstOrThrow({
      where: { politikaId: p.id }, orderBy: { zaman: 'desc' },
    });

    expect(hataMetni(await restoreTestiKaydet({
      kosuId: kosu.id, sonuc: 'basarili', sureDk: 45, not: 'tam geri yükleme',
    }))).toBe('');
    const test = await db.geriYuklemeTesti.findFirstOrThrow({ where: { kosuId: kosu.id } });
    expect(test.sonuc).toBe('basarili');
    expect(test.sureDk).toBe(45);

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'GeriYuklemeTesti', varlikId: test.id },
    });
    expect(iz?.yeniDeger).toBe('basarili');
  });

  it('okuyucu politika/koşu/restore yazamaz', async () => {
    await kimlikle([yetki('okuyucu')], async () => {
      expect(hataMetni(await yedeklemePolitikasiKaydet({ ad: benzersiz('x') })))
        .toMatch(REDDEDILDI);
      expect(hataMetni(await yedeklemeKosusuKaydet({ politikaId: 'x', durum: 'basarili' })))
        .toMatch(REDDEDILDI);
      expect(hataMetni(await restoreTestiKaydet({ kosuId: 'x', sonuc: 'basarili' })))
        .toMatch(REDDEDILDI);
    });
  });
});

describe('Tedarikçi kaydı', () => {
  it('uzaktan erişim değişimi DENETİM İZİNE yazılır', async () => {
    const ad = benzersiz('ted');
    expect(hataMetni(await tedarikciKaydet({
      ad, uzaktanErisimVar: true, uzaktanErisimYontemi: 'VPN', oturumKaydiVar: false,
    }))).toBe('');
    const t = await db.tedarikci.findFirstOrThrow({ where: { ad } });

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Tedarikci', varlikId: t.id, alan: 'uzaktanErisim' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.yeniDeger).toContain('var');
    expect(iz?.yeniDeger).toContain('VPN');
    expect(iz?.yeniDeger).toMatch(/oturum kaydı yok/);
    expect(iz?.eylem).toBe('olusturma');
  });

  it('oturumKaydiVar ÜÇ DURUMLUDUR ve null "bilinmiyor" yazılır', async () => {
    const ad = benzersiz('ted-uc');
    await tedarikciKaydet({ ad, uzaktanErisimVar: false, oturumKaydiVar: null });
    const t = await db.tedarikci.findFirstOrThrow({ where: { ad } });
    expect(t.oturumKaydiVar).toBeNull();

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Tedarikci', varlikId: t.id, alan: 'uzaktanErisim' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.yeniDeger).toMatch(/oturum kaydı bilinmiyor/);
  });

  it('alan HİÇ GÖNDERİLMEZSE mevcut değer korunur — undefined ≠ null', async () => {
    /* `undefined` "bu alana dokunma", `null` "bilinmiyor olarak yaz"
       demektir. İkisi karışırsa bir güncelleme, dokunulmayan alanı
       sessizce siler. */
    const ad = benzersiz('ted-koru');
    await tedarikciKaydet({
      ad, uzaktanErisimVar: true, uzaktanErisimYontemi: 'Jump host', oturumKaydiVar: true,
    });
    const t = await db.tedarikci.findFirstOrThrow({ where: { ad } });

    await tedarikciKaydet({ id: t.id, ad, uzaktanErisimVar: true, kritiklik: 'yuksek' });
    const guncel = await db.tedarikci.findUniqueOrThrow({ where: { id: t.id } });
    expect(guncel.oturumKaydiVar).toBe(true);
    expect(guncel.uzaktanErisimYontemi).toBe('Jump host');
    expect(guncel.kritiklik).toBe('yuksek');
  });

  it('güncelleme izi ÖNCEKİ hâli de taşır', async () => {
    const ad = benzersiz('ted-once');
    await tedarikciKaydet({ ad, uzaktanErisimVar: false, oturumKaydiVar: null });
    const t = await db.tedarikci.findFirstOrThrow({ where: { ad } });
    await tedarikciKaydet({
      id: t.id, ad, uzaktanErisimVar: true, uzaktanErisimYontemi: 'RDP', oturumKaydiVar: true,
    });
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Tedarikci', varlikId: t.id, alan: 'uzaktanErisim' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.eylem).toBe('guncelleme');
    expect(iz?.oncekiDeger).toContain('yok');
    expect(iz?.yeniDeger).toContain('RDP');
  });

  it('boş ad reddedilir; okuyucu tedarikçi yazamaz', async () => {
    expect(hataMetni(await tedarikciKaydet({ ad: '  ', uzaktanErisimVar: false })))
      .not.toBe('');
    expect(hataMetni(await kimlikle([yetki('okuyucu')], () => tedarikciKaydet({
      ad: benzersiz('ted-ret'), uzaktanErisimVar: false,
    })))).toMatch(REDDEDILDI);
  });
});

describe('Sertifika kaydı — durum TÜRETİLİR', () => {
  it('geçerli · yaklaşıyor · süresi doldu, bitiş tarihinden hesaplanır', async () => {
    const bak = async (ad: string, gun: number) => {
      await sertifikaKaydet({ ad, bitis: gunSonra(gun) });
      return (await db.sertifika.findFirstOrThrow({
        where: { ad }, orderBy: { bitis: 'desc' },
      })).durum;
    };
    expect(await bak(benzersiz('crt-uzak'), 200)).toBe('gecerli');
    expect(await bak(benzersiz('crt-yakin'), 10)).toBe('yaklasiyor');
    expect(await bak(benzersiz('crt-gecmis'), -3)).toBe('suresi_doldu');
  });

  it('YENİLENEN sertifika kırmızıda kalmaz — kusurun kendisi buydu', async () => {
    const ad = benzersiz('crt-yenile');
    await sertifikaKaydet({ ad, bitis: gunSonra(-10) });
    const s = await db.sertifika.findFirstOrThrow({ where: { ad } });
    expect(s.durum).toBe('suresi_doldu');

    await sertifikaKaydet({ id: s.id, ad, bitis: gunSonra(400) });
    expect((await db.sertifika.findUniqueOrThrow({ where: { id: s.id } })).durum)
      .toBe('gecerli');
  });

  it('bitiş tarihi zorunludur; okuyucu sertifika yazamaz', async () => {
    expect(hataMetni(await sertifikaKaydet({ ad: benzersiz('crt-bos'), bitis: '' })))
      .not.toBe('');
    expect(hataMetni(await kimlikle([yetki('okuyucu')], () => sertifikaKaydet({
      ad: benzersiz('crt-ret'), bitis: gunSonra(30),
    })))).toMatch(REDDEDILDI);
  });
});
