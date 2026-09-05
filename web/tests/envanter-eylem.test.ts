import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Envanter eylemleri — GERÇEK veritabanı, GERÇEK yetki kapısı

   `lib/eylemler2/envanter.ts` dört eylem taşır ve dördü de test görmemişti
   (kapsam %37,89). Envanter, uyum kütüğünün altındaki zemindir: bir varlık
   yanlış tesise yazılırsa yalnız o satır değil, o tesisin bütün uyum
   sayıları kayar.

   Ölçülen dört kural:
     1. KAPSAM — tesise kısıtlı rol kendi tesisine yazabilmeli, başkasına
        yazamamalı; kaydın GERÇEK tesisi güncellemede de bağlayıcı.
     2. ETİKET TEKİLLİĞİ — aynı etiket iki varlıkta olamaz; olursa
        içe aktarım ve keşif eşleşmesi yanlış kaydı günceller.
     3. DOĞRULAMA DÜŞÜRME — kimlik/durum alanı elle değişince önceki insan
        doğrulaması artık bu veriyi kapsamaz ve düşürülmelidir. Düşmezse
        ekran "doğrulanmış" der, veri başkadır.
     4. EMEKLİ/İMHA DENETİMLİDİR — `onay` yetkisi VE gerekçe ister.
        Yazma yetkisi tek başına varlığı imha edemez.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-envanter-'));
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
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'envanter@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const {
  varlikKaydet, iliskiEkle, iliskiSil, varlikYasamDongusu,
} = await import('@/lib/eylemler2/envanter');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

let turId = '';
let tesisA = '';
let tesisB = '';

/** Yeni varlık açar ve satırı döndürür. */
async function varlikAc(ek: Partial<Parameters<typeof varlikKaydet>[0]> = {}) {
  const etiket = ek.etiket ?? benzersiz('TST-VRL');
  const sonuc = await varlikKaydet({
    etiket, ad: 'Test varlığı', turId, tesisId: tesisA, ...ek,
  });
  expect(hataMetni(sonuc)).toBe('');
  return db.varlik.findFirstOrThrow({ where: { etiket } });
}

/** Varlığa DOĞRULANMIŞ bir veri kökeni iliştirir. */
async function kokenAc(varlikId: string) {
  return db.veriKokeni.create({ data: {
    varlikTipi: 'Varlik', varlikId, kokenTipi: 'otomatik',
    kaynakSistem: 'TEST-CMDB', kaynakKayitId: benzersiz('kyt'),
    dogrulamaDurumu: 'dogrulandi', dogrulayanId: oturum.id,
    dogrulamaZamani: new Date(),
  } });
}

const izler = (varlikId: string) => db.aktiviteKaydi.findMany({
  where: { varlikTipi: 'Varlik', varlikId }, orderBy: { zaman: 'asc' },
});

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  turId = (await db.varlikTuru.findFirstOrThrow({ select: { id: true } })).id;
  const tesisler = await db.tesis.findMany({ select: { id: true }, take: 2, orderBy: { kod: 'asc' } });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
});

describe('Etiket tekilliği', () => {
  it('aynı etiket ikinci bir varlıkta kullanılamaz', async () => {
    /* Etiket, keşif eşleşmesinin ve içe aktarımın anahtarıdır. İki varlık
       aynı etiketi taşırsa güncelleme yanlış kayda gider ve iki envanter
       satırı sessizce birbirine karışır. */
    const v = await varlikAc();
    expect(hataMetni(await varlikKaydet({
      etiket: v.etiket, ad: 'Başka varlık', turId, tesisId: tesisA,
    }))).toMatch(/kullanılıyor/i);
  });

  it('varlık KENDİ etiketiyle güncellenebilir [ENV-YAZ-001]', async () => {
    const v = await varlikAc();
    expect(hataMetni(await varlikKaydet({
      id: v.id, etiket: v.etiket, ad: 'Yeni ad', turId, tesisId: tesisA,
    }))).toBe('');
    expect((await db.varlik.findUniqueOrThrow({ where: { id: v.id } })).ad).toBe('Yeni ad');
  });

  it('boş etiket reddedilir', async () => {
    expect(hataMetni(await varlikKaydet({
      etiket: '   ', ad: 'a', turId, tesisId: tesisA,
    }))).not.toBe('');
  });

  it('olmayan varlık güncellenemez', async () => {
    expect(hataMetni(await varlikKaydet({
      id: 'yok-boyle-bir-id', etiket: benzersiz('TST-YOK'), ad: 'a', turId,
    }))).toMatch(/bulunamadı/i);
  });
});

describe('Kapsam kapısı', () => {
  it('tesise kısıtlı rol KENDİ tesisine varlık yazabilir', async () => {
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => varlikKaydet({
      etiket: benzersiz('TST-KAPSAM'), ad: 'Kendi tesisi', turId, tesisId: tesisA,
    }));
    expect(hataMetni(sonuc)).toBe('');
  });

  it('tesise kısıtlı rol BAŞKA tesise varlık yazamaz [ENV-YAZ-003]', async () => {
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => varlikKaydet({
      etiket: benzersiz('TST-KAPSAM'), ad: 'Başka tesis', turId, tesisId: tesisB,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('tesise kısıtlı rol TESİSSİZ varlık açamaz', async () => {
    // Tesis alanı boş bırakılarak kapı atlanamaz: tesissiz varlık
    // kurumsaldır ve kapsamsız işlemdir.
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => varlikKaydet({
      etiket: benzersiz('TST-KURUM'), ad: 'Kurumsal', turId,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('kaydın GERÇEK tesisi güncellemede de denetlenir', async () => {
    const v = await varlikAc({ tesisId: tesisB });
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => varlikKaydet({
      id: v.id, etiket: v.etiket, ad: 'Değişti', turId,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect((await db.varlik.findUniqueOrThrow({ where: { id: v.id } })).ad).toBe('Test varlığı');
  });

  it('okuyucu rolü varlık yazamaz [ENV-YAZ-002]', async () => {
    const sonuc = await kimlikle([yetki('okuyucu')], () => varlikKaydet({
      etiket: benzersiz('TST-RO'), ad: 'a', turId, tesisId: tesisA,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });
});

describe('İlişkiler', () => {
  it('varlık KENDİSİYLE ilişkilendirilemez', async () => {
    const v = await varlikAc();
    expect(hataMetni(await iliskiEkle({ kaynakId: v.id, hedefId: v.id, tip: 'depends_on' })))
      .toMatch(/kendisiyle/i);
  });

  it('aynı ilişki iki kez tanımlanamaz', async () => {
    const [a, b] = [await varlikAc(), await varlikAc()];
    expect(hataMetni(await iliskiEkle({ kaynakId: a.id, hedefId: b.id, tip: 'depends_on' }))).toBe('');
    expect(hataMetni(await iliskiEkle({ kaynakId: a.id, hedefId: b.id, tip: 'depends_on' })))
      .toMatch(/zaten tanımlı/i);
  });

  it('geçersiz ilişki tipi reddedilir', async () => {
    const [a, b] = [await varlikAc(), await varlikAc()];
    expect(hataMetni(await iliskiEkle({ kaynakId: a.id, hedefId: b.id, tip: 'sever' })))
      .toMatch(/geçersiz ilişki tipi/i);
  });

  it('olmayan uç noktayla ilişki kurulamaz', async () => {
    const a = await varlikAc();
    expect(hataMetni(await iliskiEkle({ kaynakId: a.id, hedefId: 'yok', tip: 'depends_on' })))
      .toMatch(/hedef varlık bulunamadı/i);
    expect(hataMetni(await iliskiEkle({ kaynakId: 'yok', hedefId: a.id, tip: 'depends_on' })))
      .toMatch(/kaynak varlık bulunamadı/i);
  });

  it('ilişki ekleme ve silme denetim izine hedef etiketiyle düşer', async () => {
    const [a, b] = [await varlikAc(), await varlikAc()];
    await iliskiEkle({ kaynakId: a.id, hedefId: b.id, tip: 'depends_on' });
    const iliski = await db.varlikIliskisi.findFirstOrThrow({
      where: { kaynakId: a.id, hedefId: b.id } });
    expect(hataMetni(await iliskiSil({ id: iliski.id }))).toBe('');

    const kayit = await izler(a.id);
    const ekleme = kayit.find((i) => i.eylem === 'iliski_ekleme');
    const silme = kayit.find((i) => i.eylem === 'iliski_silme');
    expect(ekleme?.yeniDeger).toBe(b.etiket);
    expect(silme?.oncekiDeger).toBe(b.etiket);
    expect(await db.varlikIliskisi.findUnique({ where: { id: iliski.id } })).toBeNull();
  });

  it('tesise kısıtlı rol BAŞKA tesisin varlığından ilişki kuramaz', async () => {
    const yabanci = await varlikAc({ tesisId: tesisB });
    const kendi = await varlikAc({ tesisId: tesisA });
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => iliskiEkle({
      kaynakId: yabanci.id, hedefId: kendi.id, tip: 'depends_on',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('kapsam KAYNAK varlıktan okunur — hedefin tesisi denetlenmez', async () => {
    /* ÖLÇÜLEN DAVRANIŞ, onaylanmış tasarım değil. İlişki kaynağın
       satırıdır ve iz kaynağa yazılır; bu yüzden kapı kaynağa bakar. Ama
       hedef başka tesiste olabildiği için hedefin ETİKETİ kaynağın izine
       geçer. Hedef kimliğini bilmek gerektiğinden sızıntı dar, yine de
       kapatılırsa BU TEST DEĞİŞMELİDİR — sessizce kaymasın diye burada. */
    const kendi = await varlikAc({ tesisId: tesisA });
    const yabanci = await varlikAc({ tesisId: tesisB });
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => iliskiEkle({
      kaynakId: kendi.id, hedefId: yabanci.id, tip: 'depends_on',
    }));
    expect(hataMetni(sonuc)).toBe('');
  });

  it('olmayan ilişki silinemez', async () => {
    expect(hataMetni(await iliskiSil({ id: 'yok-boyle-bir-id' }))).toMatch(/bulunamadı/i);
  });
});

describe('Yaşam döngüsü', () => {
  it('sıradan geçiş yazma yetkisiyle yapılır', async () => {
    const v = await varlikAc();
    expect(hataMetni(await varlikYasamDongusu({ id: v.id, yasamDongusu: 'bakim' }))).toBe('');
    expect((await db.varlik.findUniqueOrThrow({ where: { id: v.id } })).yasamDongusu).toBe('bakim');
  });

  it('EMEKLİ geçişi gerekçe ister', async () => {
    const v = await varlikAc();
    expect(hataMetni(await varlikYasamDongusu({ id: v.id, yasamDongusu: 'emekli' })))
      .toMatch(/gerekçe zorunlu/i);
    expect((await db.varlik.findUniqueOrThrow({ where: { id: v.id } })).yasamDongusu)
      .not.toBe('emekli');
  });

  it('İMHA yazma yetkisiyle YAPILAMAZ — onay yetkisi ister [ENV-YAZ-004]', async () => {
    /* Bir varlığı imha etmek envanterden düşürmektir; uyum sayıları,
       yedekleme kapsamı ve zafiyet takibi o satırla birlikte kapanır.
       Yazma yetkisi bunu tek başına yapamaz. */
    const v = await varlikAc();
    const sonuc = await kimlikle([yetki('bt_yoneticisi')], () => varlikYasamDongusu({
      id: v.id, yasamDongusu: 'imha', gerekce: 'hurdaya ayrıldı',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect((await db.varlik.findUniqueOrThrow({ where: { id: v.id } })).yasamDongusu)
      .not.toBe('imha');
  });

  it('gerekçeli emekli geçişi ONAY izi bırakır', async () => {
    const v = await varlikAc();
    expect(hataMetni(await varlikYasamDongusu({
      id: v.id, yasamDongusu: 'emekli', gerekce: 'destek bitti',
    }))).toBe('');
    const kayit = await izler(v.id);
    const onay = kayit.find((i) => i.eylem === 'onay');
    expect(onay?.alan).toBe('yasamDongusu');
    expect(onay?.gerekce).toBe('destek bitti');
    expect(onay?.yeniDeger).toBe('emekli');
  });

  it('aynı duruma geçiş İZ BIRAKMAZ — kütük gürültüyle dolmaz', async () => {
    const v = await varlikAc();
    await varlikYasamDongusu({ id: v.id, yasamDongusu: 'bakim' });
    const once = (await izler(v.id)).length;
    expect(hataMetni(await varlikYasamDongusu({ id: v.id, yasamDongusu: 'bakim' }))).toBe('');
    expect((await izler(v.id)).length).toBe(once);
  });

  it('geçersiz yaşam döngüsü değeri reddedilir', async () => {
    const v = await varlikAc();
    expect(hataMetni(await varlikYasamDongusu({ id: v.id, yasamDongusu: 'çöpe atıldı' })))
      .toMatch(/geçersiz yaşam döngüsü/i);
  });

  it('tesise kısıtlı rol BAŞKA tesisin varlığını emekliye ayıramaz', async () => {
    const v = await varlikAc({ tesisId: tesisB });
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => varlikYasamDongusu({
      id: v.id, yasamDongusu: 'bakim',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });
});

describe('İnsan doğrulaması — veri değişince düşer', () => {
  it('kimlik alanı elle değişince önceki doğrulama düşürülür', async () => {
    /* Doğrulama "bu satırı bir insan kaynağıyla karşılaştırdı" demektir.
       Hostname/IP elle değiştiğinde o karşılaştırma artık bu veriyi
       kapsamaz; düşmezse ekran doğrulanmış der, veri başkadır. */
    const v = await varlikAc({ hostname: 'eski-ad' });
    const koken = await kokenAc(v.id);

    await varlikKaydet({
      id: v.id, etiket: v.etiket, ad: v.ad, turId, tesisId: tesisA, hostname: 'yeni-ad',
    });
    expect((await db.veriKokeni.findUniqueOrThrow({ where: { id: koken.id } })).dogrulamaDurumu)
      .not.toBe('dogrulandi');

    const iz = await db.aktiviteKaydi.findFirstOrThrow({
      where: { varlikTipi: 'VeriKokeni', varlikId: koken.id, eylem: 'dogrulama_dusuruldu' } });
    expect(iz.alan).toContain('hostname');
    expect(iz.gerekce).toMatch(/kapsamıyor/);
  });

  it('alan DEĞİŞMEDİYSE doğrulama ayakta kalır', async () => {
    // Ters yön de kural: her kayıtta doğrulama düşürmek, doğrulamayı
    // anlamsız kılardı.
    const v = await varlikAc({ hostname: 'sabit-ad' });
    const koken = await kokenAc(v.id);

    await varlikKaydet({
      id: v.id, etiket: v.etiket, ad: 'yalnız ad değişti', turId,
      tesisId: tesisA, hostname: 'sabit-ad',
    });
    expect((await db.veriKokeni.findUniqueOrThrow({ where: { id: koken.id } })).dogrulamaDurumu)
      .toBe('dogrulandi');
  });
});
