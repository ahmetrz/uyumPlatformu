import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Denetim yaşam döngüsü — aşama geçişleri ve kanıt talepleri

   `tests/denetim-kapsam.test.ts` yalnız KAPSAM eylemlerini ölçüyordu;
   dosyanın geri kalanı (%61,1) ölçüsüzdü. Buradaki kurallar bir denetimin
   savunulabilirliğini taşıyor:

   · SIRA ZORUNLU — aşama atlanmaz. Atlanabilseydi "saha" yapılmadan
     "bulgu" aşamasına geçilir, denetim izi olmamış bir işi anlatırdı.
   · KAPANIŞ ONAY İSTER ve AÇIK İŞLE KAPANMAZ: açık kanıt talebi, açık
     bulgu, doğrulanmamış aksiyon ya da ETKİSİZ bulunmuş aksiyon varsa
     kapanış reddedilir. Reddedilen aksiyonun da kapanışı durdurması
     bilinçlidir: etkisiz bir düzeltmeyle denetim kapanamaz.
   · GERİ ALMA gerekçe ister ve gerekçe İZE yazılır.
   · KAPANMIŞ denetime kanıt talebi eklenmez.
   · Talep 'saglandi' ise ya mevcut kanıt bağlanır ya da yeni kanıt
     açılır — ikisi de yoksa reddedilir; "sağlandı" ama kanıtsız bir
     talep, denetim izinde hiçbir şey ifade etmez.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-denetim-asama-'));
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
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'asama@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const {
  denetimKaydet, asamaIlerlet, asamaGeriAl, kanitTalebiEkle, kanitTalebiDurum,
} = await import('@/lib/eylemler2/denetim');
const { DENETIM_ASAMALARI } = await import('@/lib/sabitler');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);
const REDDEDILDI = /yetki|kapsam/i;

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

/** Denetim açar ve id'sini döndürür. */
async function denetimAc(): Promise<string> {
  const kod = benzersiz('DEN');
  const s = await denetimKaydet({ kod, ad: 'Test denetimi', tip: 'ic_denetim' });
  expect(hataMetni(s)).toBe('');
  return (await db.denetim.findUniqueOrThrow({ where: { kod } })).id;
}

/** Aşamayı doğrudan kurar (kapı denenmeden zemin hazırlamak için). */
async function asamayaGetir(id: string, asama: string) {
  await db.denetim.update({ where: { id }, data: { durum: asama } });
}
const asamasi = async (id: string) =>
  (await db.denetim.findUniqueOrThrow({ where: { id } })).durum;

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  oturum.eposta = kisi.eposta;
});

describe('denetimKaydet', () => {
  it('denetim açılır ve iz bırakır', async () => {
    const id = await denetimAc();
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Denetim', varlikId: id, eylem: 'olusturma' },
    });
    expect(iz).not.toBeNull();
    expect(await asamasi(id)).toBe('plan');
  });

  it('AYNI KOD ikinci kez kullanılamaz', async () => {
    const kod = benzersiz('DEN-tekil');
    expect(hataMetni(await denetimKaydet({ kod, ad: 'İlk', tip: 'ic_denetim' }))).toBe('');
    expect(hataMetni(await denetimKaydet({ kod, ad: 'İkinci', tip: 'ic_denetim' })))
      .toMatch(/zaten kullanılıyor/i);
  });

  it('plan bitişi başlangıçtan önce olamaz', async () => {
    expect(hataMetni(await denetimKaydet({
      kod: benzersiz('DEN-tarih'), ad: 'Ters tarih', tip: 'ic_denetim',
      planBaslangic: '2026-06-01', planBitis: '2026-05-01',
    }))).toMatch(/başlangıçtan önce/i);
  });

  it('olmayan uyum sürecine bağlanamaz; okuyucu denetim açamaz', async () => {
    expect(hataMetni(await denetimKaydet({
      kod: benzersiz('DEN-surec'), ad: 'Hayalet süreç', tip: 'ic_denetim',
      surecId: 'yok-boyle-surec',
    }))).toMatch(/bulunamadı/i);
    expect(hataMetni(await kimlikle([yetki('okuyucu')], () => denetimKaydet({
      kod: benzersiz('DEN-ret'), ad: 'Olmaz', tip: 'ic_denetim',
    })))).toMatch(REDDEDILDI);
  });
});

describe('Aşama geçişleri', () => {
  it('SIRA ZORUNLU: her ilerletme yalnız bir sonraki aşamaya gider [DEN-LST-001]', async () => {
    const id = await denetimAc();
    // Kapanış öncesine kadar sırayla yürü.
    for (let i = 0; i < DENETIM_ASAMALARI.length - 2; i += 1) {
      expect(await asamasi(id)).toBe(DENETIM_ASAMALARI[i]);
      expect(hataMetni(await asamaIlerlet({ id }))).toBe('');
    }
    expect(await asamasi(id)).toBe(DENETIM_ASAMALARI.at(-2));
  });

  it('KAPANIŞ aşamasından ileri gidilemez', async () => {
    const id = await denetimAc();
    await asamayaGetir(id, 'kapanis');
    expect(hataMetni(await asamaIlerlet({ id }))).toMatch(/zaten kapanış/i);
  });

  it('kapanışa geçiş ONAY yetkisi ister — yazma yetmez', async () => {
    const id = await denetimAc();
    await asamayaGetir(id, DENETIM_ASAMALARI.at(-2)!);
    expect(hataMetni(await kimlikle([yetki('denetim_sorumlusu')], () => asamaIlerlet({ id }))))
      .toBe('');   // denetim_sorumlusu onay taşır
    await asamayaGetir(id, DENETIM_ASAMALARI.at(-2)!);
    expect(hataMetni(await kimlikle([yetki('katkici')], () => asamaIlerlet({ id }))))
      .toMatch(REDDEDILDI);
  });

  it('AÇIK KANIT TALEBİYLE kapanmaz ve aşama GERİ ALINIR [DEN-ASM-001]', async () => {
    /* Kapanış kontrolü "önce yaz sonra doğrula" biçimindedir; reddedilirse
       transaction geri alınır ve aşama HİÇ DEĞİŞMEMİŞ olmalıdır. Yarım
       durum kalırsa denetim "kapandı" görünür, kapanmamıştır. */
    const id = await denetimAc();
    await asamayaGetir(id, 'kanit_talebi');
    expect(hataMetni(await kanitTalebiEkle({ denetimId: id, baslik: 'Politika belgesi' })))
      .toBe('');
    const oncekiAsama = DENETIM_ASAMALARI.at(-2)!;
    await asamayaGetir(id, oncekiAsama);

    const s = await asamaIlerlet({ id });
    expect(hataMetni(s)).toMatch(/açık kanıt talebi/i);
    expect(await asamasi(id)).toBe(oncekiAsama);
  });

  it('kapanış izi, reddedilen geçişte YAZILMAZ', async () => {
    const id = await denetimAc();
    await asamayaGetir(id, 'kanit_talebi');
    await kanitTalebiEkle({ denetimId: id, baslik: 'Kapanışı durduran talep' });
    await asamayaGetir(id, DENETIM_ASAMALARI.at(-2)!);
    await asamaIlerlet({ id });

    const kapanisIzi = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Denetim', varlikId: id, alan: 'durum', yeniDeger: 'kapanis' },
    });
    expect(kapanisIzi).toBeNull();
  });

  it('temiz denetim kapanabilir', async () => {
    const id = await denetimAc();
    await asamayaGetir(id, DENETIM_ASAMALARI.at(-2)!);
    expect(hataMetni(await asamaIlerlet({ id }))).toBe('');
    expect(await asamasi(id)).toBe('kapanis');
  });
});

describe('asamaGeriAl', () => {
  it('gerekçeyle bir önceki aşamaya döner; gerekçe İZE yazılır', async () => {
    const id = await denetimAc();
    await asamayaGetir(id, 'saha');
    expect(hataMetni(await asamaGeriAl({ id, gerekce: 'saha planı değişti' }))).toBe('');
    expect(await asamasi(id)).toBe('kanit_talebi');

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Denetim', varlikId: id, alan: 'durum' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.gerekce).toBe('saha planı değişti');
    expect(iz?.oncekiDeger).toBe('saha');
  });

  it('GEREKÇESİZ geri alınamaz', async () => {
    const id = await denetimAc();
    await asamayaGetir(id, 'saha');
    expect(hataMetni(await asamaGeriAl({ id, gerekce: '   ' }))).not.toBe('');
    expect(await asamasi(id)).toBe('saha');
  });

  it('ilk aşamadan geriye gidilemez; yazma yetkisi yetmez', async () => {
    const id = await denetimAc();
    expect(hataMetni(await asamaGeriAl({ id, gerekce: 'olmaz' })))
      .toMatch(/zaten ilk aşamada/i);

    await asamayaGetir(id, 'saha');
    expect(hataMetni(await kimlikle([yetki('tesis_yoneticisi')],
      () => asamaGeriAl({ id, gerekce: 'yetkisiz deneme' })))).toMatch(REDDEDILDI);
  });
});

describe('Kanıt talepleri', () => {
  it('talep açılır; KAPANMIŞ denetime eklenemez', async () => {
    const id = await denetimAc();
    expect(hataMetni(await kanitTalebiEkle({ denetimId: id, baslik: 'Ağ şeması' }))).toBe('');
    await asamayaGetir(id, 'kapanis');
    expect(hataMetni(await kanitTalebiEkle({ denetimId: id, baslik: 'Geç kalan' })))
      .toMatch(/kapanmış denetime/i);
  });

  it('"sağlandı" KANITSIZ olamaz', async () => {
    const id = await denetimAc();
    await kanitTalebiEkle({ denetimId: id, baslik: 'Kanıt bekleyen' });
    const talep = await db.kanitTalebi.findFirstOrThrow({ where: { denetimId: id } });
    expect(hataMetni(await kanitTalebiDurum({ id: talep.id, durum: 'saglandi' })))
      .toMatch(/kanıt seçin veya yeni kanıt adı/i);
    expect((await db.kanitTalebi.findUniqueOrThrow({ where: { id: talep.id } })).durum)
      .toBe('acik');
  });

  it('yeni kanıt adıyla sağlanır ve kanıt kaydı açılır', async () => {
    const id = await denetimAc();
    await kanitTalebiEkle({ denetimId: id, baslik: 'Yedek raporu' });
    const talep = await db.kanitTalebi.findFirstOrThrow({ where: { denetimId: id } });
    const kanitAd = benzersiz('kanit');

    expect(hataMetni(await kanitTalebiDurum({
      id: talep.id, durum: 'saglandi', yeniKanitAd: kanitAd,
    }))).toBe('');
    const guncel = await db.kanitTalebi.findUniqueOrThrow({ where: { id: talep.id } });
    expect(guncel.durum).toBe('saglandi');
    expect(guncel.kanitId).not.toBeNull();
    const kanit = await db.kanit.findUniqueOrThrow({ where: { id: guncel.kanitId! } });
    expect(kanit.ad).toBe(kanitAd);
  });

  it('reddedilen talepte kanıt bağı ÇÖZÜLÜR', async () => {
    const id = await denetimAc();
    await kanitTalebiEkle({ denetimId: id, baslik: 'Sonra reddedilecek' });
    const talep = await db.kanitTalebi.findFirstOrThrow({ where: { denetimId: id } });
    await kanitTalebiDurum({
      id: talep.id, durum: 'saglandi', yeniKanitAd: benzersiz('kanit-red'),
    });
    expect(hataMetni(await kanitTalebiDurum({ id: talep.id, durum: 'reddedildi' }))).toBe('');
    const guncel = await db.kanitTalebi.findUniqueOrThrow({ where: { id: talep.id } });
    expect(guncel.durum).toBe('reddedildi');
    expect(guncel.kanitId).toBeNull();
  });

  it('olmayan talep ve olmayan kanıt reddedilir; okuyucu talep açamaz', async () => {
    expect(hataMetni(await kanitTalebiDurum({ id: 'yok', durum: 'acik' })))
      .toMatch(/bulunamadı/i);

    const id = await denetimAc();
    await kanitTalebiEkle({ denetimId: id, baslik: 'Kanıt bağı denemesi' });
    const talep = await db.kanitTalebi.findFirstOrThrow({ where: { denetimId: id } });
    expect(hataMetni(await kanitTalebiDurum({
      id: talep.id, durum: 'saglandi', kanitId: 'yok-boyle-kanit',
    }))).toMatch(/bulunamadı/i);

    expect(hataMetni(await kimlikle([yetki('okuyucu')],
      () => kanitTalebiEkle({ denetimId: id, baslik: 'Olmaz' })))).toMatch(REDDEDILDI);
  });
});
