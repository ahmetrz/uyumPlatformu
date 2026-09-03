import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Varlık yönetişimi eylemleri — yetki · kapsam · doğrulama · iz
   OT-05 · OT-08 · OT-09 · OT-16 · OT-17 · OT-28 · OT-33

   `varlik-durusu-eylem.test.ts` ile aynı dört soru, aynı sertlikte:
   yetkisiz rol reddedilir · başka santralin kaydına yazılamaz ·
   geçersiz girdi ÜRÜNE GİRMEDEN reddedilir · her yazma ize düşer.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yonetisim-'));
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

/* KAPSAM testleri `yonetici` rolüyle yapılır, `tesis_yoneticisi` ile DEĞİL.
   Sebebi ölçüldü: `tesis_yoneticisi` rolünde `envanter/onay` ve
   `tanimlar/onay` YOKTUR (lib/erisim.ts), yani ön kapı onu zaten
   reddeder ve test kapsam kuralını hiç sınamaz — kural kaldırılsa bile
   yeşil kalırdı (sabotajla ölçüldü). Santrale kısıtlı bir `yonetici`,
   yetkiyi TAŞIYAN ama kapsamı DAR olan tek roldür ve kapsam kuralını
   sınayan tek doğru öznedir. */
const kisitliYonetici = (tesisId: string) => [yetki('yonetici', tesisId)];

const oturum = {
  id: '', adSoyad: 'Yönetişim Testi', eposta: 'yonetisim@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const {
  adimVarligiAta, ekipKaydet, ekipUyeligiKaydet, etkiDegerlendirmesiKaydet,
  hesapTipiKaydet, kesifYetkiKarari, konfigSapmasiKarari, konfigTemeliOnayla,
  ouiKutuguYukle, pasifGozlemYukle, prosesAdimiKaydet, topluSahipDevri,
  varligaEkipAta,
} = await import('@/lib/eylemler2/varlikYonetisim');

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

let tesisA = ''; let tesisB = '';
let varlikA = ''; let varlikB = '';
let surecA = ''; let pasifKullanici = '';

async function izVarMi(varlikTipi: string, varlikId: string, alan: string) {
  return db.aktiviteKaydi.findFirst({
    where: { varlikTipi, varlikId, alan }, orderBy: { zaman: 'desc' },
  });
}

beforeAll(async () => {
  const tesisler = await db.tesis.findMany({ take: 2, orderBy: { kod: 'asc' } });
  tesisA = tesisler[0].id; tesisB = tesisler[1].id;
  const kullanici = await db.kullanici.findFirst({ where: { aktif: true } });
  oturum.id = kullanici!.id;

  pasifKullanici = (await db.kullanici.create({
    data: { eposta: benzersiz('pasif') + '@test', adSoyad: 'Pasif Kişi', aktif: false },
  })).id;

  const tur = (await db.varlikTuru.findFirst())!;
  const yap = async (tesisId: string) => db.varlik.create({
    data: {
      etiket: benzersiz('YONETISIM'), ad: 'Yönetişim test varlığı',
      turId: tur.id, tesisId,
    },
  });
  varlikA = (await yap(tesisA)).id;
  varlikB = (await yap(tesisB)).id;

  surecA = (await db.isSureci.create({
    data: { kod: benzersiz('SUREC'), ad: 'Test süreci', tesisId: tesisA },
  })).id;
});

/* ══ OT-05 · Proses adımı ════════════════════════════════════════════ */

describe('OT-05 · proses adımı kütük yetkisi ve süreç kapsamı ister', () => {
  it('envanter yazma yetkisi YETMEZ: adım kütük kaydıdır', async () => {
    const s = await kimlikle([yetki('okuyucu')], () => prosesAdimiKaydet({
      surecId: surecA, kod: benzersiz('A'), ad: 'Adım', sira: 1,
    }));
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(REDDEDILDI);
  });

  it('BAŞKA santralin sürecine adım yazılamaz', async () => {
    const s = await kimlikle(kisitliYonetici(tesisB), () => prosesAdimiKaydet({
      surecId: surecA, kod: benzersiz('A'), ad: 'Adım', sira: 90,
    }));
    expect(s.ok).toBe(false);
  });

  it('adım yazılır ve İZE düşer', async () => {
    const kod = benzersiz('ADIM');
    const s = await prosesAdimiKaydet({ surecId: surecA, kod, ad: 'İlk adım', sira: 1 });
    expect(hataMetni(s)).toBe('');
    const a = await db.prosesAdimi.findFirst({ where: { surecId: surecA, kod } });
    expect(a).not.toBeNull();
    expect(await izVarMi('ProsesAdimi', a!.id, 'kod')).not.toBeNull();
  });

  it('aynı sıra iki kez kullanılamaz ve mesaj çakışanı SÖYLER', async () => {
    const s = await prosesAdimiKaydet({
      surecId: surecA, kod: benzersiz('ADIM'), ad: 'Çakışan', sira: 1,
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/sıra/i);
  });

  it('sıfır ya da negatif sıra reddedilir', async () => {
    const s = await prosesAdimiKaydet({
      surecId: surecA, kod: benzersiz('ADIM'), ad: 'Sıfır', sira: 0,
    });
    expect(s.ok).toBe(false);
  });
});

describe('OT-05 · adım–varlık bağı üç durumlu değerleri KORUR', () => {
  let adimId = '';
  beforeAll(async () => {
    adimId = (await db.prosesAdimi.create({
      data: { surecId: surecA, kod: benzersiz('BAG'), ad: 'Bağ adımı', sira: 50 },
    })).id;
  });

  it('bağ kurulur, değerlendirilmemiş alanlar NULL kalır', async () => {
    const s = await adimVarligiAta({ adimId, varlikId: varlikA, rol: 'kontrol' });
    expect(hataMetni(s)).toBe('');
    const bag = await db.adimVarligi.findFirst({ where: { adimId, varlikId: varlikA } });
    /* `false` varsayılanı, değerlendirilmemiş bir bağı "tek nokta değil"
       saymak olurdu. */
    expect(bag?.tekNokta).toBeNull();
    expect(bag?.yedekli).toBeNull();
  });

  it('kapsam dışı varlık adıma bağlanamaz', async () => {
    const s = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => adimVarligiAta({
      adimId, varlikId: varlikB, rol: 'olcum',
    }));
    expect(s.ok).toBe(false);
  });
});

/* ══ OT-08 · Etki değerlendirmesi ════════════════════════════════════ */

describe('OT-08 · sayı yazan değerlendirme GEREKÇE ister', () => {
  it('gerekçesiz MW kaybı reddedilir', async () => {
    const s = await etkiDegerlendirmesiKaydet({
      varlikId: varlikA, uretimKaybiMw: 12.5, gerekce: 'kısa',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/gerekçe/i);
  });

  it('negatif MW kaybı reddedilir', async () => {
    const s = await etkiDegerlendirmesiKaydet({
      varlikId: varlikA, uretimKaybiMw: -3,
      gerekce: 'Negatif değer denemesi yapılıyor burada.',
    });
    expect(s.ok).toBe(false);
  });

  it('SIFIR geçerli bir ölçümdür ve hesaplanmamışlıkla karışmaz', async () => {
    const s = await etkiDegerlendirmesiKaydet({
      varlikId: varlikA, uretimKaybiMw: 0, kayipTipi: 'yok',
      gerekce: 'Cihaz yedekli; durması üretimi etkilemiyor (test #1).',
    });
    expect(hataMetni(s)).toBe('');
    const e = await db.etkiDegerlendirmesi.findUnique({ where: { varlikId: varlikA } });
    expect(e?.uretimKaybiMw).toBe(0);
    expect(e?.kayipTipi).toBe('yok');
  });

  it('gerekçesiz ama SAYISIZ değerlendirme geçer (yalnız nitel)', async () => {
    const s = await etkiDegerlendirmesiKaydet({
      varlikId: varlikB, emniyetEtkisi: 'yuksek',
    });
    expect(hataMetni(s)).toBe('');
  });

  it('yazma İZE düşer', async () => {
    expect(await izVarMi('Varlik', varlikA, 'etkiDegerlendirmesi')).not.toBeNull();
  });

  it('kapsam dışı varlığa etki yazılamaz', async () => {
    const s = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () =>
      etkiDegerlendirmesiKaydet({ varlikId: varlikB, emniyetEtkisi: 'orta' }));
    expect(s.ok).toBe(false);
  });
});

/* ══ OT-09 · Ekip ve sahiplik ════════════════════════════════════════ */

describe('OT-09 · PASİF kullanıcı sahiplik zincirine sokulmaz', () => {
  let ekipId = '';
  beforeAll(async () => {
    const s = await ekipKaydet({
      kod: benzersiz('EKIP'), ad: 'OT Bakım', tip: 'ot', tesisId: tesisA,
    });
    expect(hataMetni(s as Sonuc)).toBe('');
    ekipId = (await db.ekip.findFirst({ where: { tesisId: tesisA }, orderBy: { olusturuldu: 'desc' } }))!.id;
  });

  it('pasif kullanıcı ekibe EKLENEMEZ — zincir sahte sağlam görünürdü', async () => {
    const s = await ekipUyeligiKaydet({
      ekipId, kullaniciId: pasifKullanici, rol: 'sahip',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/pasif/i);
  });

  it('aktif kullanıcı eklenir ve İZE düşer', async () => {
    const s = await ekipUyeligiKaydet({ ekipId, kullaniciId: oturum.id, rol: 'sahip' });
    expect(hataMetni(s)).toBe('');
    expect(await izVarMi('Ekip', ekipId, `uyelik:${oturum.id}`)).not.toBeNull();
  });

  it('BAŞKA santralin ekibi oluşturulamaz', async () => {
    const s = await kimlikle(kisitliYonetici(tesisA), () => ekipKaydet({
      kod: benzersiz('EKIP'), ad: 'Karşı ekip', tip: 'bt', tesisId: tesisB,
    }));
    expect(s.ok).toBe(false);
  });

  it('varlığa ekip atanır; PASİF ekibe atanamaz', async () => {
    expect(hataMetni(await varligaEkipAta({ varlikId: varlikA, ekipId }))).toBe('');
    await db.ekip.update({ where: { id: ekipId }, data: { aktif: false } });
    const s = await varligaEkipAta({ varlikId: varlikA, ekipId });
    expect(s.ok).toBe(false);
    await db.ekip.update({ where: { id: ekipId }, data: { aktif: true } });
  });
});

describe('OT-09 · toplu devir geri alınamaz; kuralları serttir', () => {
  it('gerekçesiz devir reddedilir', async () => {
    const s = await topluSahipDevri({
      varlikIdleri: [varlikA], hedefKullaniciId: oturum.id, gerekce: 'kısa',
    });
    expect(s.ok).toBe(false);
  });

  it('PASİF kullanıcıya devir reddedilir', async () => {
    const s = await topluSahipDevri({
      varlikIdleri: [varlikA], hedefKullaniciId: pasifKullanici,
      gerekce: 'Pasif kullanıcıya devir denemesi yapılıyor.',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/pasif/i);
  });

  it('listede TEK bir kapsam dışı varlık varsa devrin TAMAMI reddedilir', async () => {
    const s = await kimlikle(kisitliYonetici(tesisA), () => topluSahipDevri({
      varlikIdleri: [varlikA, varlikB], hedefKullaniciId: oturum.id,
      gerekce: 'Kısmi devir olmamalı; hepsi ya da hiçbiri.',
    }));
    expect(s.ok).toBe(false);
    /* Kısmi devir, kullanıcının hangi kayıtların değiştiğini bilmediği
       bir sonuç üretirdi. */
    const v = await db.varlik.findUnique({ where: { id: varlikA }, select: { sahipId: true } });
    expect(v?.sahipId).not.toBe(oturum.id);
  });

  it('devir her kayıt için AYRI iz bırakır ve özet döner', async () => {
    const s = await topluSahipDevri({
      varlikIdleri: [varlikA, varlikB], hedefKullaniciId: oturum.id,
      gerekce: 'Sahiplik OT bakım ekibine devredildi (talep #7781).',
    });
    expect(hataMetni(s)).toBe('');
    expect(s.ozet?.degisen).toBe(2);
    expect(await izVarMi('Varlik', varlikA, 'sahipId')).not.toBeNull();
    expect(await izVarMi('Varlik', varlikB, 'sahipId')).not.toBeNull();
  });

  it('ikinci devir aynı hedefe YAZMAZ — gereksiz iz üretmez', async () => {
    const s = await topluSahipDevri({
      varlikIdleri: [varlikA], hedefKullaniciId: oturum.id,
      gerekce: 'Aynı hedefe ikinci devir denemesi yapılıyor.',
    });
    expect(s.ozet?.degisen).toBe(0);
    expect(s.ozet?.degismeyen).toBe(1);
  });

  it('boş liste reddedilir', async () => {
    const s = await topluSahipDevri({
      varlikIdleri: [], hedefKullaniciId: null, gerekce: 'Boş liste denemesi yapılıyor.',
    });
    expect(s.ok).toBe(false);
  });
});

/* ══ OT-16 · Keşif yetki kararı ══════════════════════════════════════ */

describe('OT-16 · gerekçesiz yok sayma sunucuda da reddedilir', () => {
  let kesifId = '';
  beforeAll(async () => {
    kesifId = (await db.kesifKaydi.create({
      data: {
        kaynak: 'csv', kaynakKayitId: benzersiz('KESIF'),
        tesisId: tesisA, hamJson: '{}',
      },
    })).id;
  });

  it('gerekçesiz "yetkisiz" kararı reddedilir', async () => {
    const s = await kesifYetkiKarari({ kesifId, yetkiDurumu: 'yetkisiz', gerekce: 'kısa' });
    expect(s.ok).toBe(false);
  });

  it('gerekçeli karar yazılır ve İZE düşer', async () => {
    const s = await kesifYetkiKarari({
      kesifId, yetkiDurumu: 'yetkisiz',
      gerekce: 'Envanterde karşılığı yok; saha ekibine soruldu (talep #9912).',
    });
    expect(hataMetni(s)).toBe('');
    const kk = await db.kesifKaydi.findUnique({ where: { id: kesifId } });
    expect(kk?.yetkiDurumu).toBe('yetkisiz');
    expect(kk?.yetkiKararVerenId).toBe(oturum.id);
    expect(await izVarMi('KesifKaydi', kesifId, 'yetkiDurumu')).not.toBeNull();
  });

  it('"bilinen" kararı gerekçe İSTEMEZ', async () => {
    expect(hataMetni(await kesifYetkiKarari({ kesifId, yetkiDurumu: 'bilinen' }))).toBe('');
  });

  it('kapsam dışı keşif kaydına karar verilemez', async () => {
    const s = await kimlikle(kisitliYonetici(tesisB), () => kesifYetkiKarari({
      kesifId, yetkiDurumu: 'bilinen',
    }));
    expect(s.ok).toBe(false);
  });
});

/* ══ OT-17 · OUI kütüğü ve pasif gözlem ══════════════════════════════ */

describe('OT-17 · OUI kütüğü YÜKLENİR, uydurulmaz', () => {
  it('okunamayan kütük reddedilir', async () => {
    const s = await ouiKutuguYukle({ icerik: 'satırsız içerik', kaynak: 'test' });
    expect(s.ok).toBe(false);
  });

  it('geçerli satırlar alınır, bozuk satırlar SAYILIR', async () => {
    const s = await ouiKutuguYukle({
      icerik: '# yorum\n001B1B\tÖrnek Otomasyon\n00-1C-1C;İkinci Üretici\nbozuk\n',
      kaynak: 'IEEE OUI dışa aktarımı',
    });
    expect(hataMetni(s)).toBe('');
    expect(s.ozet?.alinan).toBe(2);
    expect(s.ozet?.reddedilen).toBe(1);
    expect((await db.ouiKaydi.findUnique({ where: { onEk: '001B1B' } }))?.uretici)
      .toBe('Örnek Otomasyon');
  });

  it('kütük yükleme kütük yetkisi ister', async () => {
    const s = await kimlikle([yetki('okuyucu')], () => ouiKutuguYukle({
      icerik: '001B1B\tX', kaynak: 'test',
    }));
    expect(s.ok).toBe(false);
  });
});

describe('OT-17 · pasif gözlem AĞA DOKUNMAZ, protokol uydurmaz', () => {
  it('geçersiz JSON reddedilir', async () => {
    const s = await pasifGozlemYukle({ icerik: '{ bozuk', kaynak: 'firewall', tesisId: tesisA });
    expect(s.ok).toBe(false);
  });

  it('OUI ve TANINAN protokol türetilir, tanınmayan NULL kalır', async () => {
    const kaynak = benzersiz('span');
    const s = await pasifGozlemYukle({
      icerik: JSON.stringify([
        { kayitId: 'g1', mac: '00:1b:1b:aa:bb:cc', port: 502, tasima: 'tcp' },
        { kayitId: 'g2', mac: '00:1b:1b:aa:bb:dd', port: 8080, tasima: 'tcp' },
        { kayitId: 'g3', mac: '00:1b:1b:aa:bb:ee', port: 102, tasima: 'tcp' },
        { mac: 'kimliksiz' },
      ]),
      kaynak, tesisId: tesisA,
    });
    expect(hataMetni(s)).toBe('');
    expect(s.ozet?.alinan).toBe(3);
    expect(s.ozet?.reddedilen).toBe(1);
    /* Yalnız 502 tek adaylı; 102 iki protokol paylaşır ve karar verilmez. */
    expect(s.ozet?.protokollu).toBe(1);

    const g1 = await db.kesifKaydi.findUnique({
      where: { kaynak_kaynakKayitId: { kaynak, kaynakKayitId: 'g1' } },
    });
    expect(g1?.otProtokolu).toBe('modbus');
    expect(g1?.ouiOnEki).toBe('001B1B');

    const g3 = await db.kesifKaydi.findUnique({
      where: { kaynak_kaynakKayitId: { kaynak, kaynakKayitId: 'g3' } },
    });
    expect(g3?.otProtokolu).toBeNull();
  });

  it('yeniden görülen cihazın İNSAN KARARI silinmez', async () => {
    const kaynak = benzersiz('span');
    const belge = JSON.stringify([{ kayitId: 'tekrar', mac: '00:1b:1b:11:22:33' }]);
    await pasifGozlemYukle({ icerik: belge, kaynak, tesisId: tesisA });
    const kayit = await db.kesifKaydi.findUnique({
      where: { kaynak_kaynakKayitId: { kaynak, kaynakKayitId: 'tekrar' } },
    });
    await kesifYetkiKarari({
      kesifId: kayit!.id, yetkiDurumu: 'gerekceyle_yoksayildi',
      gerekce: 'Geçici test cihazı; 2026 sonuna kadar kabul edildi.',
    });

    const s = await pasifGozlemYukle({ icerik: belge, kaynak, tesisId: tesisA });
    expect(s.ozet?.guncellenen).toBe(1);
    const sonra = await db.kesifKaydi.findUnique({ where: { id: kayit!.id } });
    expect(sonra?.yetkiDurumu).toBe('gerekceyle_yoksayildi');
  });

  it('kapsam dışı santrale gözlem yüklenemez', async () => {
    const s = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => pasifGozlemYukle({
      icerik: JSON.stringify([{ kayitId: 'x' }]), kaynak: benzersiz('span'), tesisId: tesisB,
    }));
    expect(s.ok).toBe(false);
  });
});

/* ══ OT-28 · Konfigürasyon tabanı ve sapması ═════════════════════════ */

describe('OT-28 · özetsiz yedek TABAN OLAMAZ', () => {
  let ozetliYedek = ''; let ozetsizYedek = '';
  beforeAll(async () => {
    ozetliYedek = (await db.konfigurasyonYedegi.create({
      data: {
        varlikId: varlikA, kaynakSistem: 'test', kaynakKayitId: benzersiz('YEDEK'),
        yedekZamani: new Date(), icerikHash: 'a'.repeat(64), basarili: true,
      },
    })).id;
    ozetsizYedek = (await db.konfigurasyonYedegi.create({
      data: {
        varlikId: varlikA, kaynakSistem: 'test', kaynakKayitId: benzersiz('YEDEK'),
        yedekZamani: new Date(), icerikHash: null, basarili: true,
      },
    })).id;
  });

  it('özeti olmayan yedek reddedilir — sonsuza kadar karar verilemez üretirdi', async () => {
    const s = await konfigTemeliOnayla({ varlikId: varlikA, yedekId: ozetsizYedek });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/özet/i);
  });

  it('başka varlığın yedeği taban olamaz', async () => {
    const s = await konfigTemeliOnayla({ varlikId: varlikB, yedekId: ozetliYedek });
    expect(s.ok).toBe(false);
  });

  it('geçerli yedek taban olur ve İZE düşer', async () => {
    const s = await konfigTemeliOnayla({
      varlikId: varlikA, yedekId: ozetliYedek, not: 'Devreye alma sonrası onaylı hâl.',
    });
    expect(hataMetni(s)).toBe('');
    const t = await db.konfigTemeli.findUnique({ where: { varlikId: varlikA } });
    expect(t?.ozetHash).toBe('a'.repeat(64));
    expect(await izVarMi('Varlik', varlikA, 'konfigTemeli')).not.toBeNull();
  });

  it('taban onayı ONAY yetkisi ister', async () => {
    const s = await kimlikle([yetki('okuyucu')], () => konfigTemeliOnayla({
      varlikId: varlikA, yedekId: ozetliYedek,
    }));
    expect(s.ok).toBe(false);
  });
});

describe('OT-28 · sapma kararı gerekçe ve referans ister', () => {
  let sapmaId = '';
  beforeAll(async () => {
    const temel = await db.konfigTemeli.findUnique({ where: { varlikId: varlikA } });
    sapmaId = (await db.konfigSapmasi.create({
      data: {
        temelId: temel!.id, varlikId: varlikA,
        gozlenenHash: 'b'.repeat(64), aciklama: 'Test sapması',
      },
    })).id;
  });

  it('"onaylı" kararı DEĞİŞİKLİK REFERANSI ister', async () => {
    const s = await konfigSapmasiKarari({
      sapmaId, durum: 'onayli', gerekce: 'Planlı değişiklikten geldi, kabul edildi.',
    });
    expect(s.ok).toBe(false);
    expect(hataMetni(s)).toMatch(/referans/i);
  });

  it('"açık" bir KARAR değildir', async () => {
    const s = await konfigSapmasiKarari({
      sapmaId, durum: 'acik', gerekce: 'Açık bırakma denemesi yapılıyor burada.',
    });
    expect(s.ok).toBe(false);
  });

  it('referanslı onaylı karar yazılır ve İZE düşer', async () => {
    const s = await konfigSapmasiKarari({
      sapmaId, durum: 'onayli', degisiklikRef: 'CHG-2026-0412',
      gerekce: 'Planlı firmware yükseltmesinden geldi (CHG-2026-0412).',
    });
    expect(hataMetni(s)).toBe('');
    expect(await izVarMi('KonfigSapmasi', sapmaId, 'durum')).not.toBeNull();
  });
});

/* ══ OT-33 · Hesap tipi ══════════════════════════════════════════════ */

describe('OT-33 · MFA üç durumludur ve NULL korunur', () => {
  let hesapId = '';
  beforeAll(async () => {
    hesapId = (await db.kimlikHesabi.create({
      data: { hesapAdi: benzersiz('svc'), tip: 'servis', tesisId: tesisA },
    })).id;
  });

  it('kaynak tipi ve MFA yazılır, İZE düşer', async () => {
    const s = await hesapTipiKaydet({
      hesapId, kaynakTipi: 'yerel', mfaVar: false, ayricalikli: true,
    });
    expect(hataMetni(s)).toBe('');
    const h = await db.kimlikHesabi.findUnique({ where: { id: hesapId } });
    expect(h?.kaynakTipi).toBe('yerel');
    expect(h?.mfaVar).toBe(false);
    expect(await izVarMi('KimlikHesabi', hesapId, 'kaynakTipi')).not.toBeNull();
  });

  it('MFA verilmezse NULL kalır — "MFA yok" SAYILMAZ', async () => {
    await hesapTipiKaydet({ hesapId, kaynakTipi: 'dizin' });
    const h = await db.kimlikHesabi.findUnique({ where: { id: hesapId } });
    expect(h?.mfaVar).toBeNull();
  });

  it('geçersiz kaynak tipi reddedilir', async () => {
    const s = await hesapTipiKaydet({ hesapId, kaynakTipi: 'bulut' });
    expect(s.ok).toBe(false);
  });

  it('kapsam dışı hesaba yazılamaz', async () => {
    const s = await kimlikle([yetki('tesis_yoneticisi', tesisB)], () => hesapTipiKaydet({
      hesapId, kaynakTipi: 'dizin',
    }));
    expect(s.ok).toBe(false);
  });
});
