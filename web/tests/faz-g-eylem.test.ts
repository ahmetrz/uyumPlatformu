import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   FAZ G eylemleri — OT-55/56/57 · UY-59/63/64/65/66

   Yetki kapısı SAHTELENMEZ: yalnız `aktifKullanici` değiştirilir.
   Motor da sahtelenmez; `bildirimSurelerini` gerçek veritabanına karşı
   koşar.

   Çivilenen kurallar:
     · sayım hiçbir varlığı SİLMEZ,
     · eksik kapanan sayımın izi kaç satırın sayılmadığını YAZAR,
     · ölçülmemiş tedarik süresine sıfır yazılamaz,
     · karantinadaki medyaya kullanım kaydı girilemez; onaysız kullanım
       kaydedilir ve uyarır,
     · zararlı bulunan medya kendiliğinden karantinaya alınır,
     · olgunluk 3+ gerekçe ister,
     · işleyiş testi örneklemsiz kaydedilemez,
     · bildirim kuralı YOKSA motor hiçbir şey yapmaz,
     · kararsız gözden geçirme tamamlanamaz,
     · eğitim geçerliliği TAMAMLANMA tarihinden hesaplanır.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-faz-g-'));
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
  id: '', adSoyad: 'FAZ G Testi', eposta: 'faz-g@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { sayimAc, sayimDurumu, sayimKapat, sayimSatiriKaydet } =
  await import('@/lib/eylemler2/sayim');
const { yedekParcaKaydet, yedekParcaSay, yedekParcaVarlikBagla } =
  await import('@/lib/eylemler2/yedekParca');
const {
  medyaDurumu, medyaKaydet, medyaKullanimKaydet, medyaTaramaKaydet,
} = await import('@/lib/eylemler2/tasinabilirMedya');
const { kontrolTestiKaydet, olgunlukKaydet, hedefOlgunlukKaydet } =
  await import('@/lib/eylemler2/uyumOlcum');
const { bildirimKuraliKaydet, olayBildirimiKaydet } =
  await import('@/lib/eylemler2/bildirimYukumlulugu');
const {
  gozdenGecirmeKarariEkle, gozdenGecirmeKaydet, gozdenGecirmeTamamla,
} = await import('@/lib/eylemler2/gozdenGecirme');
const { egitimKaydet, egitimKaydiEkle, egitimMaddeBagla } =
  await import('@/lib/eylemler2/egitim');
const { bildirimSurelerini } = await import('@/lib/motorlar/bildirimSuresi');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let tesisId = '';
let ikinciKisi = '';

beforeAll(async () => {
  const kisiler = await db.kullanici.findMany({
    where: { aktif: true }, select: { id: true, eposta: true }, take: 2,
  });
  oturum.id = kisiler[0].id;
  oturum.eposta = kisiler[0].eposta;
  ikinciKisi = kisiler[1].id;
  /* Varlığı OLAN bir santral seç: sayım açma kapısı boş kapsamı
     reddeder ve fikstür o kapıya takılmamalı. */
  const v = await db.varlik.findFirst({
    where: { silindi: null, tesisId: { not: null } }, select: { tesisId: true },
  });
  tesisId = v!.tesisId!;
});

afterAll(async () => { await rm(dizin, { recursive: true, force: true }); });

/* ═══ OT-55 · Sayım ════════════════════════════════════════════════════ */

describe('OT-55 · Fiziksel envanter sayımı', () => {
  let sayimId = '';

  it('sayım açılır ve kapsamdaki her varlık için satır üretilir', async () => {
    const beklenen = await db.varlik.count({ where: { tesisId, silindi: null } });
    expect(beklenen).toBeGreaterThan(0);

    const s = await sayimAc({ ad: 'FAZ G sayımı', tesisId });
    expect(hataMetni(s)).toBe('');
    sayimId = s.id!;

    const kayit = await db.envanterSayimi.findUniqueOrThrow({
      where: { id: sayimId }, include: { _count: { select: { satirlar: true } } },
    });
    expect(kayit.kapsamSayisi).toBe(beklenen);
    expect(kayit._count.satirlar).toBe(beklenen);
    /* Satırlar SAYILMADI ile başlar: hiçbiri "bulunamadı" değildir. */
    expect(await db.sayimSatiri.count({
      where: { sayimId, sonuc: 'sayilmadi' },
    })).toBe(beklenen);
  });

  it('kapsamda varlık olmayan santralde sayım AÇILMAZ', async () => {
    const bos = await db.tesis.create({
      data: { kod: `FAZG-BOS-${Date.now()}`, ad: 'Varlıksız santral' },
    });
    const s = await sayimAc({ ad: 'Boş', tesisId: bos.id });
    expect(hataMetni(s)).toMatch(/hiç varlık yok/i);
  });

  it('satır sonucu yazılır ve iz düşer', async () => {
    const satir = await db.sayimSatiri.findFirstOrThrow({ where: { sayimId } });
    expect(hataMetni(await sayimDurumu({ id: sayimId, durum: 'sahada' }))).toBe('');
    expect(hataMetni(await sayimSatiriKaydet({
      sayimId, satirId: satir.id, sonuc: 'bulunamadi', not: 'Panoda yok',
    }))).toBe('');

    const sonra = await db.sayimSatiri.findUniqueOrThrow({ where: { id: satir.id } });
    expect(sonra.sonuc).toBe('bulunamadi');
    expect(sonra.sayanId).toBe(oturum.id);
    expect(sonra.sayimZamani).not.toBeNull();
  });

  /* En kritik kural: sayım envanteri değiştirmez. */
  it('"bulunamadı" varlığı SİLMEZ — envanterden düşürme ayrı bir karardır', async () => {
    const satir = await db.sayimSatiri.findFirstOrThrow({
      where: { sayimId, sonuc: 'bulunamadi' },
    });
    const varlik = await db.varlik.findUniqueOrThrow({ where: { id: satir.varlikId! } });
    expect(varlik.silindi).toBeNull();
  });

  it('KAYITSIZ cihaz kimliksiz eklenemez, kimlikle eklenir', async () => {
    expect(hataMetni(await sayimSatiriKaydet({
      sayimId, sonuc: 'fazladan', sahaKimligi: '   ',
    }))).toMatch(/saha kimliği/i);

    expect(hataMetni(await sayimSatiriKaydet({
      sayimId, sonuc: 'fazladan', sahaKimligi: 'MAC 00:1B:44:11:3A:B7',
    }))).toBe('');

    const yeni = await db.sayimSatiri.findFirstOrThrow({
      where: { sayimId, sonuc: 'fazladan' },
    });
    expect(yeni.varlikId).toBeNull();
  });

  it('sayılmamış satır varken gerekçesiz KAPANMAZ; gerekçe ize YAZILIR', async () => {
    expect(hataMetni(await sayimKapat({ id: sayimId }))).toMatch(/gerekçe zorunlu/i);

    expect(hataMetni(await sayimKapat({
      id: sayimId, gerekce: 'Saha erişimi kapandı',
    }))).toBe('');

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'EnvanterSayimi', varlikId: sayimId, alan: 'durum' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.gerekce).toMatch(/HİÇ SAYILMADI/);
    expect(iz?.yeniDeger).toBe('kapali');
  });

  it('kapanmış sayıma satır yazılamaz', async () => {
    expect(hataMetni(await sayimSatiriKaydet({
      sayimId, sonuc: 'fazladan', sahaKimligi: 'X',
    }))).toMatch(/kapandı/i);
  });

  it('yetkisiz kullanıcı sayım açamaz', async () => {
    expect(hataMetni(await kimlikle([yetki('okuyucu')], () =>
      sayimAc({ ad: 'Olmaz', tesisId })))).toMatch(/yetki/i);
  });
});

/* ═══ OT-56 · Yedek parça ══════════════════════════════════════════════ */

describe('OT-56 · Kritik yedek parça', () => {
  let parcaId = '';

  it('ölçülmemiş tedarik süresi BOŞ kalır; sıfır reddedilir', async () => {
    expect(hataMetni(await yedekParcaKaydet({
      kod: `FAZG-P0-${Date.now()}`, ad: 'Sıfır süre', stokAdedi: 1,
      kritikEsik: 1, tedarikSuresiGun: 0,
    }))).toMatch(/hemen gelir/);

    const kod = `FAZG-P1-${Date.now()}`;
    expect(hataMetni(await yedekParcaKaydet({
      kod, ad: 'CPU kartı', stokAdedi: 0, kritikEsik: 1, tesisId,
    }))).toBe('');
    const p = await db.yedekParca.findFirstOrThrow({ where: { kod } });
    parcaId = p.id;
    expect(p.tedarikSuresiGun).toBeNull();
  });

  it('kritik varlığa bağlanınca AÇIK RİSK olur', async () => {
    const varlik = await db.varlik.findFirst({
      where: { tesisId, silindi: null }, select: { id: true },
    });
    expect(hataMetni(await yedekParcaVarlikBagla({
      parcaId, varlikId: varlik!.id,
    }))).toBe('');
    /* İkinci çağrı idempotent: aynı bağ iki kez yazılmaz. */
    expect(hataMetni(await yedekParcaVarlikBagla({
      parcaId, varlikId: varlik!.id,
    }))).toBe('');
    expect(await db.yedekParcaVarlik.count({ where: { parcaId } })).toBe(1);
  });

  it('stok sayımı adedi ve SAYIM TARİHİNİ günceller, iz bırakır', async () => {
    expect(hataMetni(await yedekParcaSay({
      id: parcaId, stokAdedi: 3, not: 'Yıllık sayım',
    }))).toBe('');
    const p = await db.yedekParca.findUniqueOrThrow({ where: { id: parcaId } });
    expect(p.stokAdedi).toBe(3);
    expect(p.sonSayim).not.toBeNull();

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'YedekParca', varlikId: parcaId, alan: 'stokAdedi' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.oncekiDeger).toBe('0');
    expect(iz?.yeniDeger).toBe('3');
  });

  it('negatif stok sayımı reddedilir', async () => {
    expect(hataMetni(await yedekParcaSay({ id: parcaId, stokAdedi: -1 })))
      .toMatch(/negatif/i);
  });
});

/* ═══ OT-57 · Taşınabilir medya ════════════════════════════════════════ */

describe('OT-57 · Taşınabilir medya', () => {
  let medyaId = '';
  let varlikId = '';

  beforeAll(async () => {
    const v = await db.varlik.findFirstOrThrow({
      where: { tesisId, silindi: null }, select: { id: true },
    });
    varlikId = v.id;
  });

  it('şifreleme ÜÇ değerlidir; ölçülmemiş `null` kalır', async () => {
    const kod = `FAZG-M-${Date.now()}`;
    expect(hataMetni(await medyaKaydet({
      kod, ad: 'Saha USB', tip: 'usb_bellek', tesisId, sifreli: null,
    }))).toBe('');
    const m = await db.tasinabilirMedya.findFirstOrThrow({ where: { kod } });
    medyaId = m.id;
    expect(m.sifreli).toBeNull();
    expect(m.sonTarama).toBeNull();
  });

  it('ONAYSIZ kullanım reddedilmez, uyarıyla kaydedilir', async () => {
    const s = await medyaKullanimKaydet({
      medyaId, varlikId, baslangic: new Date().toISOString(),
      amac: 'Firmware yükleme', onaylandi: false,
    });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.uyari).toBeTruthy();

    const k = await db.medyaKullanimi.findFirstOrThrow({ where: { medyaId } });
    expect(k.onaylayanId).toBeNull();
  });

  it('ZARARLI bulunan medya kendiliğinden KARANTİNAYA alınır', async () => {
    expect(hataMetni(await medyaTaramaKaydet({
      id: medyaId, temiz: false, not: 'Zararlı imza',
    }))).toBe('');
    const m = await db.tasinabilirMedya.findUniqueOrThrow({ where: { id: medyaId } });
    expect(m.durum).toBe('karantina');
    expect(m.sonTarama).not.toBeNull();
  });

  it('KARANTİNADAKİ medyaya kullanım kaydı GİRİLEMEZ', async () => {
    const s = await medyaKullanimKaydet({
      medyaId, varlikId, baslangic: new Date().toISOString(),
      amac: 'Olmaz', onaylandi: true,
    });
    expect(hataMetni(s)).toMatch(/KARANTİNADA/);
  });

  it('imha edilen medyanın durumu bir daha değişmez', async () => {
    expect(hataMetni(await medyaDurumu({
      id: medyaId, durum: 'imha', gerekce: 'Fiziksel imha tutanağı',
    }))).toBe('');
    expect(hataMetni(await medyaDurumu({
      id: medyaId, durum: 'kayitli', gerekce: 'geri al',
    }))).toMatch(/İmha edilmiş/);
  });
});

/* ═══ UY-59 · Olgunluk  ·  UY-64 · Kontrol testi ═══════════════════════ */

describe('UY-59 · Olgunluk  ·  UY-64 · Kontrol testi', () => {
  let durumId = '';

  beforeAll(async () => {
    const d = await db.maddeDurumu.findFirstOrThrow({ select: { id: true } });
    durumId = d.id;
  });

  it('seviye 3 ve üstü GEREKÇE ister', async () => {
    expect(hataMetni(await olgunlukKaydet({
      maddeDurumuId: durumId, seviye: 3,
    }))).toMatch(/gerekçe ister/);

    expect(hataMetni(await olgunlukKaydet({
      maddeDurumuId: durumId, seviye: 3, gerekce: 'Prosedür yayımlandı, kurum geneli',
    }))).toBe('');
    const d = await db.maddeDurumu.findUniqueOrThrow({ where: { id: durumId } });
    expect(d.olgunlukSeviyesi).toBe(3);
  });

  it('ölçümü KALDIRMAK serbesttir ve iz düşer', async () => {
    expect(hataMetni(await olgunlukKaydet({
      maddeDurumuId: durumId, seviye: null,
    }))).toBe('');
    const d = await db.maddeDurumu.findUniqueOrThrow({ where: { id: durumId } });
    expect(d.olgunlukSeviyesi).toBeNull();

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'MaddeDurumu', varlikId: durumId, alan: 'olgunlukSeviyesi' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.yeniDeger).toBe('ölçülmedi');
  });

  it('HEDEF seviye uyum/onay ister — yazma yetmez', async () => {
    const d = await db.maddeDurumu.findUniqueOrThrow({
      where: { id: durumId }, select: { maddeId: true },
    });
    expect(hataMetni(await kimlikle([yetki('katkici')], () =>
      hedefOlgunlukKaydet({ maddeId: d.maddeId, seviye: 4 })))).toMatch(/yetki/i);

    expect(hataMetni(await hedefOlgunlukKaydet({
      maddeId: d.maddeId, seviye: 4,
    }))).toBe('');
    const m = await db.madde.findUniqueOrThrow({ where: { id: d.maddeId } });
    expect(m.olgunlukSeviyesi).toBe(4);
  });

  it('işleyiş testi ÖRNEKLEMSİZ kaydedilemez', async () => {
    expect(hataMetni(await kontrolTestiKaydet({
      maddeDurumuId: durumId, yontem: 'isleyis', sonuc: 'uygun',
      testTarihi: new Date(Date.now() - 86_400_000).toISOString(),
    }))).toMatch(/ÖRNEKLEM ister/);
  });

  it('tutarlı işleyiş testi kaydedilir ve DEĞİŞTİRİLEMEZ', async () => {
    expect(hataMetni(await kontrolTestiKaydet({
      maddeDurumuId: durumId, yontem: 'isleyis',
      evrenSayisi: 100, orneklemSayisi: 20, uygunSayisi: 18,
      sonuc: 'kismen', testTarihi: new Date(Date.now() - 86_400_000).toISOString(),
      not: 'İki kayıtta imza eksik',
    }))).toBe('');

    const t = await db.kontrolTesti.findFirstOrThrow({
      where: { maddeDurumuId: durumId }, orderBy: { olusturuldu: 'desc' },
    });
    expect(t.orneklemSayisi).toBe(20);
    expect(t.testEdenId).toBe(oturum.id);
    /* Test kaydını GÜNCELLEYEN bir eylem YOKTUR: düzeltme yeni kayıttır. */
    expect(Object.keys(await import('@/lib/eylemler2/uyumOlcum')))
      .not.toContain('kontrolTestiGuncelle');
  });

  it('tasarım testine örneklem yazılamaz', async () => {
    expect(hataMetni(await kontrolTestiKaydet({
      maddeDurumuId: durumId, yontem: 'tasarim', orneklemSayisi: 5,
      sonuc: 'uygun', testTarihi: new Date(Date.now() - 86_400_000).toISOString(),
    }))).toMatch(/örneklemi yoktur/);
  });
});

/* ═══ UY-63 · Bildirim süresi ══════════════════════════════════════════ */

describe('UY-63 · Bildirim süresi', () => {
  it('KURAL YOKKEN motor hiçbir şey yapmaz ve bunu SÖYLER', async () => {
    await db.bildirimYukumlulugu.updateMany({ data: { aktif: false } });
    const k = await bildirimSurelerini();
    expect(k.kuralYok).toBe(true);
    expect(k.uretilen).toBe(0);
  });

  it('kural DAYANAKSIZ yazılamaz', async () => {
    expect(hataMetni(await bildirimKuraliKaydet({
      kod: 'FAZG-K0', ad: 'Dayanaksız', asgariSiddet: 'yuksek',
      sureSaat: 24, dayanak: '  ', merci: 'Kurum',
    }))).toMatch(/hangi mevzuat/);
  });

  it('kural yazılır; süresi geçen olay için GÖREV açılır', async () => {
    expect(hataMetni(await bildirimKuraliKaydet({
      kod: `FAZG-K1-${Date.now()}`, ad: 'FAZ G bildirim kuralı',
      asgariSiddet: 'yuksek', sureSaat: 24,
      dayanak: 'Test dayanağı — kurum içi',
      merci: 'Test mercisi',
    }))).toBe('');

    const olay = await db.olay.create({
      data: {
        kod: `FAZG-OLAY-${Date.now()}`, baslik: 'Süresi geçmiş olay',
        siddet: 'kritik', durum: 'acik', tesisId,
        baslangic: new Date(Date.now() - 72 * 3_600_000),
      },
    });

    const k = await bildirimSurelerini();
    expect(k.kuralYok).toBe(false);
    expect(k.geciken).toBeGreaterThan(0);

    const gorev = await db.gorev.findFirst({
      where: { kaynakTipi: 'Olay', kaynakId: olay.id, tip: 'son_tarih' },
    });
    expect(gorev).not.toBeNull();
    expect(gorev!.baslik).toMatch(/GEÇTİ/);

    /* Motor olayın kendisine DOKUNMAZ: "bildirildi" yazamaz. */
    const sonra = await db.olay.findUniqueOrThrow({ where: { id: olay.id } });
    expect(sonra.bildirimTarihi).toBeNull();
    expect(sonra.bildirimGerekli).toBeNull();

    /* İkinci koşuda aynı olay için ikinci görev AÇILMAZ. */
    const ikinci = await bildirimSurelerini();
    expect(await db.gorev.count({
      where: { kaynakTipi: 'Olay', kaynakId: olay.id, tip: 'son_tarih' },
    })).toBe(1);
    expect(ikinci.uretilen).toBe(0);
  });

  it('"bildirim gerekmiyor" demek GEREKÇE ister', async () => {
    const olay = await db.olay.findFirstOrThrow({ where: { tesisId } });
    expect(hataMetni(await olayBildirimiKaydet({
      olayId: olay.id, bildirildi: false,
    }))).toMatch(/gerekçe ister/);

    expect(hataMetni(await olayBildirimiKaydet({
      olayId: olay.id, bildirildi: false, gerekce: 'Kapsam dışı — müşteri sistemi',
    }))).toBe('');
    const o = await db.olay.findUniqueOrThrow({ where: { id: olay.id } });
    expect(o.bildirimGerekli).toBe(false);
  });

  it('gelecek tarihli bildirim damgası reddedilir', async () => {
    const olay = await db.olay.findFirstOrThrow({ where: { tesisId } });
    expect(hataMetni(await olayBildirimiKaydet({
      olayId: olay.id, bildirildi: true,
      bildirimTarihi: new Date(Date.now() + 86_400_000).toISOString(),
    }))).toMatch(/gelecekte olamaz/);
  });
});

/* ═══ UY-65 · Yönetim gözden geçirmesi ═════════════════════════════════ */

describe('UY-65 · Yönetim gözden geçirmesi', () => {
  let ggId = '';

  it('toplantı planlanır', async () => {
    const s = await gozdenGecirmeKaydet({
      baslik: 'FAZ G gözden geçirmesi',
      tarih: new Date(Date.now() - 86_400_000).toISOString(),
      gundem: 'Uyum durumu',
    });
    expect(hataMetni(s)).toBe('');
    ggId = s.id!;
  });

  it('KARARSIZ toplantı "yapıldı" işaretlenemez', async () => {
    expect(hataMetni(await gozdenGecirmeTamamla({
      id: ggId, ozet: 'Görüşüldü',
    }))).toMatch(/en az bir karar/i);
  });

  it('karar SORUMLU ve SON TARİH ister; görev açabilir', async () => {
    expect(hataMetni(await gozdenGecirmeKarariEkle({
      gozdenGecirmeId: ggId, karar: 'kısa', sorumluId: ikinciKisi,
      sonTarih: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    }))).toMatch(/10 karakter/);

    expect(hataMetni(await gozdenGecirmeKarariEkle({
      gozdenGecirmeId: ggId,
      karar: 'Ağ segmentasyonu ikinci çeyrekte gözden geçirilecek',
      sorumluId: ikinciKisi,
      sonTarih: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      gorevAc: true,
    }))).toBe('');

    const karar = await db.gozdenGecirmeKarari.findFirstOrThrow({
      where: { gozdenGecirmeId: ggId },
    });
    expect(karar.gorevId).not.toBeNull();
    const gorev = await db.gorev.findUniqueOrThrow({ where: { id: karar.gorevId! } });
    expect(gorev.sorumluId).toBe(ikinciKisi);
  });

  it('kararlı ve özetli toplantı tamamlanır', async () => {
    expect(hataMetni(await gozdenGecirmeTamamla({
      id: ggId, ozet: 'Uyum durumu ve açık bulgular görüşüldü.',
    }))).toBe('');
    const gg = await db.yonetimGozdenGecirme.findUniqueOrThrow({ where: { id: ggId } });
    expect(gg.durum).toBe('yapildi');
  });

  it('yapılmış toplantının kaydı DEĞİŞTİRİLEMEZ', async () => {
    expect(hataMetni(await gozdenGecirmeKaydet({
      id: ggId, baslik: 'Değişti', tarih: new Date().toISOString(),
    }))).toMatch(/değiştirilemez/);
  });
});

/* ═══ UY-66 · Eğitim ═══════════════════════════════════════════════════ */

describe('UY-66 · Eğitim kütüğü', () => {
  let egitimId = '';

  it('eğitim tanımlanır; süresiz eğitim geçerlidir', async () => {
    const kod = `FAZG-E-${Date.now()}`;
    expect(hataMetni(await egitimKaydet({
      kod, ad: 'Siber güvenlik farkındalığı', zorunlu: true, gecerlilikAy: 12,
    }))).toBe('');
    const e = await db.egitim.findFirstOrThrow({ where: { kod } });
    egitimId = e.id;
    expect(e.gecerlilikAy).toBe(12);
  });

  it('geçerlilik TAMAMLANMA tarihinden hesaplanır', async () => {
    /* İki yıl önce alınmış 12 aylık eğitim BUGÜN geçerli olmamalı. */
    const eski = new Date(Date.now() - 730 * 86_400_000);
    expect(hataMetni(await egitimKaydiEkle({
      egitimId, kullaniciId: ikinciKisi, tamamlanma: eski.toISOString(),
    }))).toBe('');

    const kayit = await db.egitimKaydi.findFirstOrThrow({
      where: { egitimId, kullaniciId: ikinciKisi },
    });
    expect(kayit.gecerlilikBitis).not.toBeNull();
    expect(kayit.gecerlilikBitis!.getTime()).toBeLessThan(Date.now());
  });

  it('aynı gün ikinci kayıt açılmaz (idempotent)', async () => {
    const tarih = new Date(Date.now() - 10 * 86_400_000).toISOString();
    await egitimKaydiEkle({ egitimId, kullaniciId: oturum.id, tamamlanma: tarih });
    await egitimKaydiEkle({ egitimId, kullaniciId: oturum.id, tamamlanma: tarih });
    expect(await db.egitimKaydi.count({
      where: { egitimId, kullaniciId: oturum.id },
    })).toBe(1);
  });

  it('gelecek tarihli katılım reddedilir', async () => {
    expect(hataMetni(await egitimKaydiEkle({
      egitimId, kullaniciId: ikinciKisi,
      tamamlanma: new Date(Date.now() + 86_400_000).toISOString(),
    }))).toMatch(/gelecekte olamaz/);
  });

  it('eğitim kontrol maddesine bağlanır (idempotent)', async () => {
    const m = await db.madde.findFirstOrThrow({ select: { id: true } });
    expect(hataMetni(await egitimMaddeBagla({ egitimId, maddeId: m.id }))).toBe('');
    expect(hataMetni(await egitimMaddeBagla({ egitimId, maddeId: m.id }))).toBe('');
    expect(await db.egitimMadde.count({ where: { egitimId } })).toBe(1);
  });

  it('eğitim TANIMI uyum/onay ister; KATILIM kaydı yazma ile girilir', async () => {
    expect(hataMetni(await kimlikle([yetki('katkici')], () =>
      egitimKaydet({ kod: 'FAZG-X', ad: 'Olmaz' })))).toMatch(/yetki/i);

    const tarih = new Date(Date.now() - 5 * 86_400_000).toISOString();
    expect(hataMetni(await kimlikle([yetki('katkici')], () =>
      egitimKaydiEkle({ egitimId, kullaniciId: ikinciKisi, tamamlanma: tarih }))))
      .toBe('');
  });
});
