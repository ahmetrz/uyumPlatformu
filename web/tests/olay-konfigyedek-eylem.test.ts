import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Olay kapısı + konfigürasyon yedeği — borç kütüğünün SON üç yerleşimi

   İkisi de kapsamı bir YARDIMCININ içinde denetliyor (`olayKapisi`,
   `yedegeErisim`), yani kusur tek yerde durup birçok eylemi birden
   etkiliyordu: olay güncelleme, olay bağlama, etki doğrulama, yedek
   doğrulama, son bilinen iyi işaretleme ve yedek çekmecesi.

   Ölçülen kurallar:
     1. KAPSAM — tesise kısıtlı rol kendi santralinin olayına/yedeğine
        erişebilmeli, başkasınınkine erişememeli; SANTRALSİZ (kurumsal)
        kayıt kapsamsız yetki ister.
     2. OKUMA DA KAPIDIR — yedek çekmecesi bir yetki kaçağı yüzeyi
        olamaz: kapsam dışı varlık için kayıt DÖNMEZ.
     3. ETKİ DOĞRULAMA ONAY İSTER — yazma yetkisi olayın etkisini
        doğrulamaya yetmez; doğrulanmış etki regülasyon bildirimini
        tetikleyen şeydir.
     4. TESİS DEĞİŞTİRİLİRKEN HEDEF SANTRALDE DE yetki aranır — yoksa
        olay, yetkisi olmayan bir santrale taşınabilirdi.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-olay-'));
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

const kimlik = {
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'olay@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => kimlik };
});

const { db } = await import('@/lib/db');
const { olayGuncelle, etkiDogrula } = await import('@/lib/eylemler2/olay');
const { yedegiDogrula, varlikYedekDurumu } = await import('@/lib/eylemler2/konfigYedek');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: { ok: boolean; hata?: string }) => (s.ok ? '' : (s.hata ?? ''));

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = kimlik.yetkiler;
  kimlik.yetkiler = yetkiler;
  try { return await is(); } finally { kimlik.yetkiler = onceki; }
}

let turId = '';
let tesisA = '';
let tesisB = '';

async function olayAc(tesisId: string | null) {
  return db.olay.create({ data: {
    kod: benzersiz('OLY'), baslik: 'Test olayı', tip: 'siber',
    tesisId, siddet: 'orta', durum: 'acik', baslangic: new Date(),
  } });
}

async function varlikAc(tesisId: string | null) {
  return db.varlik.create({ data: {
    etiket: benzersiz('YDK-VRL'), ad: 'Yedek hedefi', turId, tesisId,
  } });
}

async function yedekAc(tesisId: string | null) {
  const varlik = await varlikAc(tesisId);
  const yedek = await db.konfigurasyonYedegi.create({ data: {
    varlikId: varlik.id, kaynakSistem: 'TEST-BACKUP',
    kaynakKayitId: benzersiz('ydk'), yedekZamani: new Date(),
    basarili: true, dogrulandi: false,
  } });
  return { varlik, yedek };
}

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  kimlik.id = kisi.id;
  turId = (await db.varlikTuru.findFirstOrThrow({ select: { id: true } })).id;
  const tesisler = await db.tesis.findMany({ select: { id: true }, take: 2, orderBy: { kod: 'asc' } });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
});

describe('Olay kapısı', () => {
  it('tesise kısıtlı rol KENDİ santralinin olayını güncelleyebilir', async () => {
    const o = await olayAc(tesisA);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => olayGuncelle({
      id: o.id, baslik: 'Kendi sahamız',
    }));
    expect(hataMetni(sonuc as Sonuc)).toBe('');
  });

  it('tesise kısıtlı rol BAŞKA santralin olayını güncelleyemez', async () => {
    const o = await olayAc(tesisB);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => olayGuncelle({
      id: o.id, baslik: 'Başka saha',
    }));
    expect(hataMetni(sonuc as Sonuc)).toMatch(/yetki/i);
    expect((await db.olay.findUniqueOrThrow({ where: { id: o.id } })).baslik).toBe('Test olayı');
  });

  it('tesise kısıtlı rol SANTRALSİZ olaya dokunamaz', async () => {
    /* Santrali olmayan olay kurumsaldır (grup çapında bir siber olay
       gibi). Kapsam denetimi "santral yoksa atla" diye yazılsaydı, tesise
       kısıtlı rol kurumun bütün santralsiz olaylarını düzenlerdi. */
    const o = await olayAc(null);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => olayGuncelle({
      id: o.id, baslik: 'Kurumsal olay',
    }));
    expect(hataMetni(sonuc as Sonuc)).toMatch(/yetki/i);
  });

  it('olay BAŞKA SANTRALE taşınırken hedefte de yetki aranır [OLY-ETK-002]', async () => {
    // Kaynakta yetkisi olan biri, olayı yetkisi olmayan bir santrale
    // taşıyarak kapsamı dolanamaz.
    const o = await olayAc(tesisA);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => olayGuncelle({
      id: o.id, tesisId: tesisB,
    }));
    expect(hataMetni(sonuc as Sonuc)).toMatch(/hedef santral/i);
    expect((await db.olay.findUniqueOrThrow({ where: { id: o.id } })).tesisId).toBe(tesisA);
  });

  it('olmayan olay güncellenemez', async () => {
    expect(hataMetni(await olayGuncelle({ id: 'yok-boyle-bir-id', baslik: 'x' }) as Sonuc))
      .toMatch(/bulunamadı/i);
  });

  it('okuyucu rolü olay güncelleyemez', async () => {
    const o = await olayAc(tesisA);
    const sonuc = await kimlikle([yetki('okuyucu')], () => olayGuncelle({
      id: o.id, baslik: 'x',
    }));
    expect(hataMetni(sonuc as Sonuc)).toMatch(/yetki/i);
  });
});

describe('Etki doğrulama — yazma yetmez', () => {
  it('YAZMA yetkisi olayın etkisini doğrulamaya yetmez', async () => {
    /* Doğrulanmış etki, regülasyon bildirim yükümlülüğünü tetikleyen
       şeydir; onay yetkisi olmadan konamaz. */
    const o = await olayAc(tesisA);
    const sonuc = await kimlikle([yetki('bt_yoneticisi')], () => etkiDogrula({
      olayId: o.id, alan: 'siberEtki', deger: 'yuksek', gerekce: 'SOC kaydı doğrulandı',
    }));
    expect(hataMetni(sonuc as Sonuc)).toMatch(/yetki/i);
    expect((await db.olay.findUniqueOrThrow({ where: { id: o.id } })).etkiDogrulayanId)
      .toBeNull();
  });

  it('BİLİNMİYOR doğrulanamaz — ölçülmemiş etki "doğrulandı" olamaz', async () => {
    /* "Bilinmeyen ≠ sıfır"un bu yüzdeki karşılığı: değerlendirme
       yapılmadıysa alan BOŞ kalır; boşluk doğrulanacak bir şey değildir. */
    const o = await olayAc(tesisA);
    expect(hataMetni(await etkiDogrula({
      olayId: o.id, alan: 'siberEtki', deger: 'bilinmiyor', gerekce: 'bilmiyoruz',
    }) as Sonuc)).toMatch(/bilinmiyor doğrulanamaz/i);
  });

  it('alan için GEÇERSİZ seviye reddedilir', async () => {
    const o = await olayAc(tesisA);
    expect(hataMetni(await etkiDogrula({
      olayId: o.id, alan: 'uretimEtkisi', deger: 'kritik', gerekce: 'üretim etkisi',
    }) as Sonuc)).toMatch(/geçerli değerler/i);
  });

  it('onay yetkisiyle doğrulanır ve DOĞRULAYAN yazılır', async () => {
    const o = await olayAc(tesisA);
    expect(hataMetni(await etkiDogrula({
      olayId: o.id, alan: 'siberEtki', deger: 'yuksek', gerekce: 'SOC kaydı doğrulandı',
    }) as Sonuc)).toBe('');
    const sonra = await db.olay.findUniqueOrThrow({ where: { id: o.id } });
    expect(sonra.etkiDogrulayanId).toBe(kimlik.id);
    expect(sonra.etkiDogrulamaZamani).not.toBeNull();
  });
});

describe('Konfigürasyon yedeği', () => {
  it('yedek doğrulaması insan imzasıyla yazılır', async () => {
    const { yedek } = await yedekAc(tesisA);
    expect(hataMetni(await yedegiDogrula({
      yedekId: yedek.id, dogrulandi: true, gerekce: 'açıldı ve okundu',
    }) as Sonuc)).toBe('');
    const sonra = await db.konfigurasyonYedegi.findUniqueOrThrow({ where: { id: yedek.id } });
    expect(sonra.dogrulandi).toBe(true);
    expect(sonra.dogrulamaZamani).not.toBeNull();
  });

  it('tesise kısıtlı rol KENDİ santralinin yedeğini doğrulayabilir', async () => {
    const { yedek } = await yedekAc(tesisA);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => yedegiDogrula({
      yedekId: yedek.id, dogrulandi: true,
    }));
    expect(hataMetni(sonuc as Sonuc)).toBe('');
  });

  it('tesise kısıtlı rol BAŞKA santralin yedeğini doğrulayamaz', async () => {
    const { yedek } = await yedekAc(tesisB);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => yedegiDogrula({
      yedekId: yedek.id, dogrulandi: true,
    }));
    expect(hataMetni(sonuc as Sonuc)).toMatch(/yetki/i);
    expect((await db.konfigurasyonYedegi.findUniqueOrThrow({ where: { id: yedek.id } })).dogrulandi)
      .toBe(false);
  });

  it('tesise kısıtlı rol SANTRALSİZ varlığın yedeğine dokunamaz', async () => {
    const { yedek } = await yedekAc(null);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => yedegiDogrula({
      yedekId: yedek.id, dogrulandi: true,
    }));
    expect(hataMetni(sonuc as Sonuc)).toMatch(/yetki/i);
  });

  it('olmayan yedek doğrulanamaz', async () => {
    expect(hataMetni(await yedegiDogrula({ yedekId: 'yok-boyle-bir-id', dogrulandi: true }) as Sonuc))
      .toMatch(/bulunamadı/i);
  });
});

describe('Yedek çekmecesi — OKUMA da kapıdır', () => {
  it('kendi santralinin varlığı için çekmece açılır', async () => {
    const { varlik } = await yedekAc(tesisA);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => varlikYedekDurumu(varlik.id));
    expect(sonuc.ok).toBe(true);
  });

  it('KAPSAM DIŞI varlık için kayıt DÖNMEZ', async () => {
    /* Çekmece bir yetki kaçağı yüzeyi olamaz: okuma da kapsam denetlenir,
       yoksa başka santralin yedekleme durumu (ve varlık etiketi) sızardı. */
    const { varlik } = await yedekAc(tesisB);
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => varlikYedekDurumu(varlik.id));
    expect(sonuc.ok).toBe(false);
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('SANTRALSİZ varlığın çekmecesi kapsamsız yetki ister', async () => {
    const { varlik } = await yedekAc(null);
    const kisitli = await kimlikle([yetki('tesis_yoneticisi', tesisA)],
      () => varlikYedekDurumu(varlik.id));
    expect(kisitli.ok).toBe(false);
    // Kapsamsız rol aynı çekmeceyi açabilir.
    expect((await varlikYedekDurumu(varlik.id)).ok).toBe(true);
  });

  it('olmayan varlık için kayıt dönmez', async () => {
    const sonuc = await varlikYedekDurumu('yok-boyle-bir-id');
    expect(sonuc.ok).toBe(false);
    expect(hataMetni(sonuc)).toMatch(/bulunamadı/i);
  });
});
