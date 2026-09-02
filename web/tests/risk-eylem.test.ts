import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   §13 · Risk kütüğü eylemleri — GERÇEK veritabanı, GERÇEK yetki kapısı

   `lib/eylemler2/risk.ts` bugüne kadar hiç test görmedi (kapsam %0). Orada
   üç şey yaşıyor ve üçü de sessizce yanlış olabilir:

     1. SKOR KURALI — "bilinmeyen ≠ sıfır". Ölçülmemiş bir etki boyutu
        hesaba KATILMAZ; hepsi bilinmiyorsa skor null kalır. Bu kural
        yanlışsa ekran ölçülmemiş bir riski "düşük" diye gösterir.
     2. KAPSAM KAPISI — tesise kısıtlı bir rol, BAŞKA tesisin riskini
        yazamamalı; ama KENDİ tesisininkini YAZABİLMELİ.
     3. KABUL YOLU (§13.2) — kabul süreli ve onaylı olmak zorunda;
        `riskIslem` üzerinden kabule geçilememeli.

   Yetki kapısı SAHTELENMEZ. Yalnız `aktifKullanici` değiştirilir; kapının
   kendisi (`yetkiZorunlu` → `izinVar` → `kapsamUyar`) gerçek kodda koşar.
   Kapıyı sahtelemek, tam da ölçmek istediğimiz şeyi ölçüm dışı bırakırdı.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-risk-'));
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

/** Testin o an "kim olduğu". Kapı bunu okur, gerisini kendi kurallarıyla yapar. */
const oturum = {
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'risk@test', unvan: null,
  yetkiler: [yetki('yonetici')] as Yetki[],
};

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});

const { db } = await import('@/lib/db');
const { riskKaydet, riskIslem, riskKabul } = await import('@/lib/eylemler2/risk');

type Sonuc = { ok: true } | { ok: false; hata: string };
const hataMetni = (s: Sonuc) => (s.ok ? '' : s.hata);

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

let tesisA = '';
let tesisB = '';

/** Belirli bir kimlikle koşar, sonra oturumu yöneticiye geri alır. */
async function kimlikle<T>(yetkiler: Yetki[], is: () => Promise<T>): Promise<T> {
  const onceki = oturum.yetkiler;
  oturum.yetkiler = yetkiler;
  try { return await is(); } finally { oturum.yetkiler = onceki; }
}

const izler = (varlikId: string) => db.aktiviteKaydi.findMany({
  where: { varlikTipi: 'Risk', varlikId }, orderBy: { zaman: 'asc' },
});

/** Yeni risk açar ve satırı döndürür. */
async function riskAc(ek: Partial<Parameters<typeof riskKaydet>[0]> = {}) {
  const kod = ek.kod ?? benzersiz('RSK-T');
  const sonuc = await riskKaydet({
    kod, baslik: 'Test riski', aciklama: 'Test açıklaması', ...ek,
  });
  expect(hataMetni(sonuc)).toBe('');
  return db.risk.findFirstOrThrow({ where: { kod } });
}

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  oturum.id = kisi.id;
  const tesisler = await db.tesis.findMany({ select: { id: true }, take: 2, orderBy: { kod: 'asc' } });
  [tesisA, tesisB] = tesisler.map((t) => t.id);
});

describe('Skor — bilinmeyen sıfır DEĞİLDİR', () => {
  it('hiçbir boyut ölçülmemişse skor null kalır', async () => {
    // En pahalı kusur burada olurdu: ölçülmemiş risk 0 skorla "en düşük"
    // sıraya düşer ve ısı haritasının boş hücresinde kaybolur.
    const r = await riskAc();
    expect(r.dogalRisk).toBeNull();
    expect(r.artikRisk).toBeNull();
  });

  it('olasılık bilinip etki bilinmiyorsa skor yine null kalır', async () => {
    const r = await riskAc({ olasilik: 4 });
    expect(r.artikRisk).toBeNull();
  });

  it('etki bilinip olasılık bilinmiyorsa skor null kalır', async () => {
    const r = await riskAc({ etkiSiber: 5 });
    expect(r.artikRisk).toBeNull();
  });

  it('skor = olasılık × EN YÜKSEK bilinen etki', async () => {
    const r = await riskAc({ olasilik: 3, etkiUretim: 2, etkiSiber: 5, etkiCevre: 1 });
    expect(r.artikRisk).toBe(15);
  });

  it('ölçülmemiş boyut ortalamayı AŞAĞI ÇEKMEZ — hesaba hiç girmez', async () => {
    /* İki risk, tek farkı ölçülmemiş boyut sayısı. Bilinmeyen 0 sayılsaydı
       ya da ortalama alınsaydı ikisi farklı skor verirdi. */
    const az = await riskAc({ olasilik: 4, etkiSiber: 4 });
    const cok = await riskAc({
      olasilik: 4, etkiSiber: 4,
      etkiUretim: null, etkiEmniyet: null, etkiRegulasyon: null, etkiFinans: null,
    });
    expect(az.artikRisk).toBe(16);
    expect(cok.artikRisk).toBe(16);
  });
});

describe('Girdi doğrulama', () => {
  it('puanı 1-5 aralığının dışına çıkaramaz', async () => {
    expect(hataMetni(await riskKaydet({
      kod: benzersiz('RSK-X'), baslik: 'a', aciklama: 'b', olasilik: 6,
    }))).toMatch(/1-5/);
    expect(hataMetni(await riskKaydet({
      kod: benzersiz('RSK-X'), baslik: 'a', aciklama: 'b', olasilik: 0,
    }))).toMatch(/1-5/);
  });

  it('yalnız boşluktan oluşan başlığı reddeder', async () => {
    expect(hataMetni(await riskKaydet({
      kod: benzersiz('RSK-X'), baslik: '   ', aciklama: 'b',
    }))).not.toBe('');
  });

  it('olmayan riski güncelleyemez', async () => {
    expect(hataMetni(await riskKaydet({
      id: 'yok-boyle-bir-id', kod: benzersiz('RSK-X'), baslik: 'a', aciklama: 'b',
    }))).toMatch(/bulunamadı/i);
  });
});

describe('Kapsam kapısı', () => {
  it('tesise kısıtlı rol KENDİ tesisinin riskini yazabilir', async () => {
    /* İKİ AŞAMALI KAPI (bkz. erisim.ts · KAPSAM_SONRA). Ön kapı kapsamsız
       çağrılırsa tesise kısıtlı rol daha ilk adımda reddedilir: ekran
       "yazabilirsin" der, sunucu "yetkin yok" der. Kapsam, kayıt okunduktan
       SONRA denetlenmelidir. */
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => riskKaydet({
      kod: benzersiz('RSK-KAPSAM'), baslik: 'Kendi tesisi', aciklama: 'a', tesisId: tesisA,
    }));
    expect(hataMetni(sonuc)).toBe('');
  });

  it('tesise kısıtlı rol BAŞKA tesisin riskini yazamaz', async () => {
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => riskKaydet({
      kod: benzersiz('RSK-KAPSAM'), baslik: 'Başka tesis', aciklama: 'a', tesisId: tesisB,
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('tesise kısıtlı rol TESİSSİZ (kurumsal) risk açamaz', async () => {
    /* Kapının atlanabileceği tek delik burasıydı: tesis alanı boş
       bırakılırsa kapsam denetimi yapacak bir tesis kalmaz. Tesissiz risk
       kurumsaldır ve kapsamsız işlemdir; tesise kısıtlı rol yapamaz. */
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => riskKaydet({
      kod: benzersiz('RSK-KURUM'), baslik: 'Kurumsal', aciklama: 'a',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('okuyucu rolü hiçbir risk yazamaz', async () => {
    const sonuc = await kimlikle([yetki('okuyucu')], () => riskKaydet({
      kod: benzersiz('RSK-RO'), baslik: 'a', aciklama: 'b',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
  });

  it('kaydın GERÇEK tesisi güncellemede de denetlenir', async () => {
    // Girdi tesisId taşımasa bile kaydın kendi kapsamı bağlayıcıdır:
    // aksi hâlde alan boş bırakılarak kapı atlanabilirdi.
    const r = await riskAc({ tesisId: tesisB, kod: benzersiz('RSK-GERCEK') });
    const sonuc = await kimlikle([yetki('tesis_yoneticisi', tesisA)], () => riskKaydet({
      id: r.id, kod: r.kod, baslik: 'Değişti', aciklama: 'a',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    const sonra = await db.risk.findUniqueOrThrow({ where: { id: r.id } });
    expect(sonra.baslik).toBe('Test riski');
  });
});

describe('İşlem tipi', () => {
  it('azalt/kaçın/devret riski işleme alır', async () => {
    const r = await riskAc();
    expect(hataMetni(await riskIslem({ id: r.id, islemTipi: 'azalt' }))).toBe('');
    const sonra = await db.risk.findUniqueOrThrow({ where: { id: r.id } });
    expect(sonra.islemTipi).toBe('azalt');
    expect(sonra.durum).toBe('islemde');
    expect(sonra.islemTarihi).not.toBeNull();
  });

  it('KABULE bu yoldan geçilemez — kabul ayrı ve onaylıdır (§13.2)', async () => {
    const r = await riskAc();
    expect(hataMetni(await riskIslem({ id: r.id, islemTipi: 'kabul' })))
      .toMatch(/geçersiz işlem tipi/i);
    const sonra = await db.risk.findUniqueOrThrow({ where: { id: r.id } });
    expect(sonra.durum).toBe('acik');
  });

  it('işlem tipi değişince eski KABUL izleri silinir', async () => {
    /* Kabul edilmiş bir risk "azalt"a çevrilirse kabul bitişi ve onaylayan
       kalmamalı: kalırsa kütük hem kabul hem işlemde görünür ve süre
       dolduğunda kimse uyarılmaz. */
    const r = await riskAc();
    const yarin = new Date(Date.now() + 86_400_000).toISOString();
    expect(hataMetni(await riskKabul({ id: r.id, kabulBitis: yarin, gerekce: 'geçici' }))).toBe('');
    expect(hataMetni(await riskIslem({ id: r.id, islemTipi: 'devret' }))).toBe('');
    const sonra = await db.risk.findUniqueOrThrow({ where: { id: r.id } });
    expect(sonra.kabulBitis).toBeNull();
    expect(sonra.onaylayanId).toBeNull();
  });

  it('verilen gerekçe denetim izine yazılır', async () => {
    const r = await riskAc();
    await riskIslem({ id: r.id, islemTipi: 'kacin', gerekce: 'saha kapanıyor' });
    const kayit = await izler(r.id);
    expect(kayit.at(-1)?.gerekce).toBe('saha kapanıyor');
  });
});

describe('Risk kabulü (§13.2) — süreli ve onaylı', () => {
  it('gelecekteki bitiş + gerekçe ile kabul edilir; onaylayan eylemi yapandır', async () => {
    const r = await riskAc();
    const yarin = new Date(Date.now() + 86_400_000).toISOString();
    expect(hataMetni(await riskKabul({
      id: r.id, kabulBitis: yarin, gerekce: 'telafi kontrolü var',
    }))).toBe('');
    const sonra = await db.risk.findUniqueOrThrow({ where: { id: r.id } });
    expect(sonra.durum).toBe('kabul_edildi');
    expect(sonra.islemTipi).toBe('kabul');
    expect(sonra.onaylayanId).toBe(oturum.id);
    expect(sonra.kabulBitis).not.toBeNull();
  });

  it('SÜRESİZ kabul yoktur — geçmiş tarih reddedilir', async () => {
    const r = await riskAc();
    const dun = new Date(Date.now() - 86_400_000).toISOString();
    expect(hataMetni(await riskKabul({ id: r.id, kabulBitis: dun, gerekce: 'a' })))
      .toMatch(/gelecekte/i);
    expect((await db.risk.findUniqueOrThrow({ where: { id: r.id } })).durum).toBe('acik');
  });

  it('geçersiz tarih metni reddedilir', async () => {
    const r = await riskAc();
    expect(hataMetni(await riskKabul({ id: r.id, kabulBitis: 'yarın', gerekce: 'a' })))
      .toMatch(/geçersiz/i);
  });

  it('GEREKÇESİZ kabul yoktur', async () => {
    const r = await riskAc();
    const yarin = new Date(Date.now() + 86_400_000).toISOString();
    expect(hataMetni(await riskKabul({ id: r.id, kabulBitis: yarin, gerekce: '   ' })))
      .not.toBe('');
    expect((await db.risk.findUniqueOrThrow({ where: { id: r.id } })).durum).toBe('acik');
  });

  it('yazma yetkisi kabule YETMEZ — onay yetkisi ister', async () => {
    /* `risk_sahibi` riski yazabilir ama kabul edemez: kabul, riski üstlenme
       kararıdır ve onay yetkisi taşıyan biri imzalamalıdır. */
    const r = await riskAc();
    const yarin = new Date(Date.now() + 86_400_000).toISOString();
    const sonuc = await kimlikle([yetki('risk_sahibi')], () => riskKabul({
      id: r.id, kabulBitis: yarin, gerekce: 'kabul ediyorum',
    }));
    expect(hataMetni(sonuc)).toMatch(/yetki/i);
    expect((await db.risk.findUniqueOrThrow({ where: { id: r.id } })).durum).toBe('acik');
  });

  it('kabul denetim izine gerekçesiyle düşer', async () => {
    const r = await riskAc();
    const yarin = new Date(Date.now() + 86_400_000).toISOString();
    await riskKabul({ id: r.id, kabulBitis: yarin, gerekce: 'bütçe 2027' });
    const kayit = await izler(r.id);
    const onay = kayit.find((i) => i.eylem === 'onay');
    expect(onay?.gerekce).toBe('bütçe 2027');
    expect(onay?.yeniDeger).toBe('kabul_edildi');
  });
});

describe('Denetim izi', () => {
  it('yeni risk OLUŞTURMA izi bırakır', async () => {
    const r = await riskAc();
    const kayit = await izler(r.id);
    expect(kayit[0]?.eylem).toBe('olusturma');
    expect(kayit[0]?.yeniDeger).toBe(r.kod);
  });

  it('güncellemede skor değişimi "bilinmiyor" diye yazılır, 0 diye değil', async () => {
    // İz de ürünün kuralına uyar: ölçülmemiş skor izde de 0 görünmez.
    const r = await riskAc();
    await riskKaydet({
      id: r.id, kod: r.kod, baslik: r.baslik, aciklama: r.aciklama,
      olasilik: 2, etkiVeri: 3,
    });
    const kayit = await izler(r.id);
    const guncelleme = kayit.find((i) => i.eylem === 'guncelleme');
    expect(guncelleme?.oncekiDeger).toBe('bilinmiyor');
    expect(guncelleme?.yeniDeger).toBe('6');
  });
});
