import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   O12 · TOPOLOJİ SAPMA TEZGÂHI — insan onayı regresyonu

   Ekran sapmayı ÖNERİ olarak sunar; kabul/ret kararını insan verir.
   Buradaki testler ekranın yaptığını değil, YAPAMADIĞINI ölçer:

     · anlık almak temel KURMAZ,
     · karşılaştırma karar VERMEZ (yazdığı her sapma 'gozlendi' doğar),
     · gerekçesiz / yetersiz gerekçeli / yetkisiz karar GEÇMEZ,
     · incelemeye almak sapmayı KAPATMAZ,
     · kritik sapma risk/bulgu kaydını KENDİ AÇMAZ,
     · karar AgGeciti / AgBolgesi / Varlik'a DOKUNMAZ.

   Ayrıca ekranın "bilinmeyen ≠ sıfır" sözü sabitlenir: karşılaştırma
   yapılmamış bir kapsam "sapma yok" DEĞİL "bilinmiyor" gösterir.

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-topo-tezgah-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Oturum ikizi: gerçek RBAC yolu koşsun diye çerez sahte, kullanıcı gerçek. */
const oturum = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (ad: string) =>
      ad === 'oturum' && oturum.token ? { name: ad, value: oturum.token } : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

const { db } = await import('@/lib/db');
const T = await import('@/lib/entegrasyon/topoloji');
const E = await import('@/lib/eylemler2/topoloji');
const M = await import('@/app/(atlas)/(operasyonel)/topoloji/mantik');

type Oge = import('@/lib/entegrasyon/topoloji').TopolojiOgesi;

/* ═══ Sabit test topolojisi ═══════════════════════════════════════════ */

const dugum = (anahtar: string, ip: string, bolgeKodu: string, bolgeTipi: string): Oge =>
  ({ tip: 'dugum', anahtar, ozellikler: { ip, bolgeKodu, bolgeTipi } });

const TEMEL_OGELER: Oge[] = [
  dugum('SRV-KURUMSAL-01', '10.10.0.5', 'Z-KURUMSAL', 'kurumsal'),
  dugum('SRV-DMZ-01', '10.20.0.5', 'Z-OT-DMZ', 'ot_dmz'),
  dugum('PLC-01', '192.168.10.11', 'Z-OT', 'ot'),
  { tip: 'gecit', anahtar: 'Z-KURUMSAL>Z-OT-DMZ',
    ozellikler: { kaynakBolge: 'Z-KURUMSAL', hedefBolge: 'Z-OT-DMZ',
      kaynakTipi: 'kurumsal', hedefTipi: 'ot_dmz', protokoller: ['https'], onaylandi: true } },
];

/** Temelde olmayan, KURUMSAL'dan OT'ye doğrudan bağlantı → kritik sapma. */
const SAPMALI_OGELER: Oge[] = [
  ...TEMEL_OGELER,
  { tip: 'baglanti', anahtar: 'SRV-KURUMSAL-01>PLC-01',
    ozellikler: { kaynak: 'SRV-KURUMSAL-01', hedef: 'PLC-01',
      kaynakBolge: 'Z-KURUMSAL', hedefBolge: 'Z-OT',
      kaynakTipi: 'kurumsal', hedefTipi: 'ot', protokoller: ['opc-ua'] } },
];

let yoneticiToken = '';
let okuyucuToken = '';
let yoneticiId = '';

async function kullaniciAc(eposta: string, rol: string): Promise<{ id: string; token: string }> {
  const kisi = await db.kullanici.create({ data: { eposta, adSoyad: eposta, aktif: true } });
  await db.yetki.create({ data: { kullaniciId: kisi.id, rol } });
  const token = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: kisi.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  return { id: kisi.id, token };
}

let sayac = 0;
async function tesisAc(): Promise<string> {
  sayac += 1;
  const t = await db.tesis.create({
    data: { kod: `TZG-${sayac}`, ad: `Tezgâh testi ${sayac}`, durum: 'aktif' } });
  return t.id;
}

/** Temeli onaylanmış bir kapsam + kritik sapması yazılmış bir anlık kurar. */
async function sapmaliKapsam(): Promise<{ tesisId: string; anlikId: string; sapmaId: string }> {
  const tesisId = await tesisAc();
  const temel = await T.anlikAl(tesisId, 'test_kaynak', TEMEL_OGELER);
  await T.temelBelirle(temel.id, yoneticiId, 'Tezgâh testi için temel onaylandı.');
  const yeni = await T.anlikAl(tesisId, 'test_kaynak', SAPMALI_OGELER);
  const sonuc = await E.anligiKarsilastirEylem({ anlikId: yeni.id });
  expect(sonuc.ok).toBe(true);
  const sapma = await db.topolojiSapmasi.findFirstOrThrow({
    where: { anlikId: yeni.id, siddet: 'kritik' } });
  return { tesisId, anlikId: yeni.id, sapmaId: sapma.id };
}

beforeAll(async () => {
  const yonetici = await kullaniciAc('tezgah.yonetici@ornek.local', 'yonetici');
  yoneticiId = yonetici.id;
  yoneticiToken = yonetici.token;
  // 'okuyucu' envanter'de yalnız okuma taşır: karar veremez, anlık alamaz.
  okuyucuToken = (await kullaniciAc('tezgah.okuyucu@ornek.local', 'okuyucu')).token;
  oturum.token = yoneticiToken;
});

/* ═══ 1 · Ekran sözlüğü sunucudan geri kalmaz ═════════════════════════ */

describe('İstemci ikizi sunucu sözlüğünü tam kapsar', () => {
  it('her sapma tipi, şiddeti ve durumu için ekranda bir söz vardır', () => {
    // İkiz eksik kalırsa ekranda boş hücre çıkar ve kimse fark etmez:
    // yeni bir sapma tipi sessizce görünmez olur.
    for (const tip of T.SAPMA_TIPLERI) {
      expect(M.SAPMA_TIP_ETIKETI[tip], `sapma tipi ekranda karşılıksız: ${tip}`)
        .toBeTruthy();
    }
    for (const s of T.SIDDETLER) {
      expect(M.SIDDET_ETIKETI[s], `şiddet ekranda karşılıksız: ${s}`).toBeTruthy();
      expect(M.SIDDET_SIRASI[s]).toBeTypeOf('number');
    }
    for (const d of T.SAPMA_DURUMLARI) {
      expect(M.SAPMA_DURUM_SOZU[d], `durum ekranda karşılıksız: ${d}`).toBeTruthy();
    }
    expect([...M.ACIK_DURUMLAR].sort()).toEqual([...T.ACIK_DURUMLAR].sort());
  });

  it('ekranın gerekçe eşiği sunucununkinden GEVŞEK değildir', async () => {
    const { sapmaId } = await sapmaliKapsam();
    const kisa = 'x'.repeat(M.GEREKCE_ASGARI - 1);
    // Ekran pasif diyorsa sunucu da reddetmeli; tersi olsaydı kullanıcı
    // düğmeye basar, sunucu reddeder ve hata "sebepsiz" görünürdü.
    expect(M.kararPasifMi({ acik: true, yetkili: true, gerekce: kisa, bekliyor: false }))
      .not.toBe('');
    const sonuc = await E.sapmaKararVer({ sapmaId, karar: 'kabul', gerekce: kisa });
    expect(sonuc.ok).toBe(false);
  });
});

/* ═══ 2 · Karar kapısı — ekran tarafı ═════════════════════════════════ */

describe('kararPasifMi: karar düğmesinin dört kapısı', () => {
  const temelGirdi = { acik: true, yetkili: true, gerekce: 'yeterince uzun gerekçe', bekliyor: false };

  it('bütün kapılar açıkken düğme ETKİN olur', () => {
    expect(M.kararPasifMi(temelGirdi)).toBe('');
  });

  it('gerekçe boşsa karar verilemez', () => {
    expect(M.kararPasifMi({ ...temelGirdi, gerekce: '   ' })).toContain('Gerekçe');
  });

  it('gerekçe eşiğin altındaysa karar verilemez — boşluk doldurmak sayılmaz', () => {
    expect(M.kararPasifMi({ ...temelGirdi, gerekce: 'kisa' })).not.toBe('');
    expect(M.kararPasifMi({ ...temelGirdi, gerekce: `${' '.repeat(40)}kisa   ` })).not.toBe('');
  });

  it('yetkisiz kullanıcı için düğme etkinleşmez', () => {
    expect(M.kararPasifMi({ ...temelGirdi, yetkili: false })).toContain('yetki');
  });

  it('karara bağlanmış sapma yeniden karara açılmaz', () => {
    expect(M.kararPasifMi({ ...temelGirdi, acik: false })).not.toBe('');
  });

  it('süren istek varken ikinci karar gönderilemez', () => {
    expect(M.kararPasifMi({ ...temelGirdi, bekliyor: true })).not.toBe('');
  });
});

/* ═══ 3 · Karar kapısı — sunucu tarafı ════════════════════════════════ */

describe('Sapma kararı İNSAN ONAYI ister', () => {
  it('gerekçesiz karar reddedilir ve sapma AÇIK kalır', async () => {
    const { sapmaId } = await sapmaliKapsam();
    const sonuc = await E.sapmaKararVer({ sapmaId, karar: 'kabul', gerekce: '' });
    expect(sonuc.ok).toBe(false);

    const sapma = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapmaId } });
    expect(sapma.durum).toBe('gozlendi');
    expect(sapma.kararVerenId).toBeNull();
    expect(sapma.kararZamani).toBeNull();
  });

  it('envanter/onay yetkisi olmayan kullanıcı karar VEREMEZ', async () => {
    const { sapmaId } = await sapmaliKapsam();
    oturum.token = okuyucuToken;
    try {
      const sonuc = await E.sapmaKararVer({
        sapmaId, karar: 'kabul', gerekce: 'Okuyucu bunu kabul etmeye çalışıyor.' });
      expect(sonuc.ok).toBe(false);
    } finally { oturum.token = yoneticiToken; }

    const sapma = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapmaId } });
    expect(sapma.durum).toBe('gozlendi');
    expect(sapma.kararVerenId).toBeNull();
  });

  it('oturumsuz çağrı karar veremez — "sistem kararı" diye bir şey yok', async () => {
    const { sapmaId } = await sapmaliKapsam();
    const eski = oturum.token;
    oturum.token = null;
    try {
      const sonuc = await E.sapmaKararVer({
        sapmaId, karar: 'kabul', gerekce: 'Oturumsuz kabul denemesi yapılıyor.' });
      expect(sonuc.ok).toBe(false);
    } finally { oturum.token = eski; }

    const sapma = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapmaId } });
    expect(sapma.durum).toBe('gozlendi');
  });

  it('geçerli karar KARAR VERENİ ve gerekçeyi kaydeder', async () => {
    const { sapmaId } = await sapmaliKapsam();
    const gerekce = 'Bakım penceresinde eklendi, geçici bağlantı kaldırılacak.';
    const sonuc = await E.sapmaKararVer({ sapmaId, karar: 'ret', gerekce });
    expect(sonuc.ok).toBe(true);

    const sapma = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapmaId } });
    expect(sapma.durum).toBe('ret');
    expect(sapma.kararVerenId).toBe(yoneticiId);
    expect(sapma.kararGerekcesi).toBe(gerekce);

    // Denetim izi kararı gerekçesiyle taşır — karar izsiz verilemez.
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'TopolojiSapmasi', varlikId: sapmaId, eylem: 'durum_degisimi' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.gerekce).toBe(gerekce);
    expect(iz?.aktorId).toBe(yoneticiId);
  });

  it('incelemeye almak KARAR DEĞİLDİR: sapma açık kalır, karar veren yazılmaz', async () => {
    const { sapmaId } = await sapmaliKapsam();
    const sonuc = await E.sapmayiIncelemeyeAl({ sapmaId });
    expect(sonuc.ok).toBe(true);

    const sapma = await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapmaId } });
    expect(sapma.durum).toBe('inceleme');
    expect(M.ACIK_DURUMLAR).toContain(sapma.durum);
    expect(sapma.kararVerenId).toBeNull();
    expect(sapma.kararGerekcesi).toBeNull();
  });
});

/* ═══ 4 · Tespit karar değildir ═══════════════════════════════════════ */

describe('Tespit → öneri; karar ayrı adım', () => {
  it('kayıttan alınan anlık kendiliğinden TEMEL OLMAZ', async () => {
    const tesisId = await tesisAc();
    const bolge = await db.agBolgesi.create({
      data: { tesisId, kod: `TZG-Z-${sayac}`, ad: 'Tezgâh bölgesi', tip: 'ot' } });
    const tur = await db.varlikTuru.findFirstOrThrow();
    await db.varlik.create({ data: {
      etiket: `TZG-VARLIK-${sayac}`, ad: 'Tezgâh varlığı',
      turId: tur.id, tesisId, bolgeId: bolge.id } });

    const sonuc = await E.kayittanAnlikAl({ tesisId, not: 'Tezgâh testi' });
    expect(sonuc.ok).toBe(true);

    const anlik = await db.topolojiAnlik.findUniqueOrThrow({ where: { id: sonuc.anlikId! } });
    expect(anlik.temelMi).toBe(false);
    expect(anlik.onaylayanId).toBeNull();
    expect(await T.temelAnlik(tesisId)).toBeNull();
  });

  it('karşılaştırma sapma YAZAR ama hiçbirine karar VERMEZ', async () => {
    const { anlikId } = await sapmaliKapsam();
    const sapmalar = await db.topolojiSapmasi.findMany({ where: { anlikId } });

    expect(sapmalar.length).toBeGreaterThan(0);
    for (const s of sapmalar) {
      expect(s.durum).toBe('gozlendi');
      expect(s.kararVerenId).toBeNull();
      // Kritik sapma bir risk/bulgu ADAYI üretir; kaydı motor AÇMAZ.
      expect(s.uretilenRiskId).toBeNull();
      expect(s.uretilenBulguId).toBeNull();
    }
  });

  it('kritik sapmanın risk kaydını yalnız insan açar ve iki kez açılamaz', async () => {
    const { sapmaId } = await sapmaliKapsam();
    const aday = T.sapmaAdayi(await db.topolojiSapmasi.findUniqueOrThrow({ where: { id: sapmaId } }));
    expect(aday).not.toBeNull();

    const kod = `TZG-RSK-${sayac}`;
    const ilk = await E.sapmadanRiskAc({
      sapmaId, kod, gerekce: 'Segmentasyon ihlali risk kütüğüne alınıyor.' });
    expect(ilk.ok).toBe(true);

    const risk = await db.risk.findUniqueOrThrow({ where: { kod } });
    // Skor alanları BİLEREK boş: olasılık/etki ölçülmedi, uydurulmadı.
    expect(risk.olasilik).toBeNull();
    expect(risk.dogalRisk).toBeNull();

    const ikinci = await E.sapmadanRiskAc({
      sapmaId, kod: `${kod}-B`, gerekce: 'İkinci kez açma denemesi yapılıyor.' });
    expect(ikinci.ok).toBe(false);
  });

  it('karar ne AgGeciti ne AgBolgesi ne de Varlik kaydına dokunur', async () => {
    const oncesi = await Promise.all([
      db.agGeciti.count(), db.agBolgesi.count(), db.varlik.count(),
      db.varlikIliskisi.count(),
    ]);
    const { sapmaId } = await sapmaliKapsam();
    await E.sapmayiIncelemeyeAl({ sapmaId });
    await E.sapmaKararVer({
      sapmaId, karar: 'kabul', gerekce: 'Yeni bağlantı onaylı değişiklikle geldi.' });
    const sonrasi = await Promise.all([
      db.agGeciti.count(), db.agBolgesi.count(), db.varlik.count(),
      db.varlikIliskisi.count(),
    ]);
    // Sapma bir GÖZLEMDİR; gerçeği değiştirmek insanın ayrı bir işidir.
    expect(sonrasi).toEqual(oncesi);
  });
});

/* ═══ 5 · Bilinmeyen ≠ sıfır ══════════════════════════════════════════ */

describe('Karşılaştırma izi: "sapma yok" ile "hiç bakılmadı" aynı değildir', () => {
  it('temeli olmayan kapsamda karşılaştırma REDDEDİLİR ve iz yazılmaz', async () => {
    const tesisId = await tesisAc();
    const anlik = await T.anlikAl(tesisId, 'test_kaynak', TEMEL_OGELER);

    const sonuc = await E.anligiKarsilastirEylem({ anlikId: anlik.id });
    expect(sonuc.ok).toBe(false);

    const iz = await T.karsilastirmaIzi([anlik.id]);
    // İz yazılsaydı ekran bunu "karşılaştırıldı, fark yok" sanardı.
    expect(iz.anligaGore.get(anlik.id)).toBeUndefined();

    const gorunum: import('@/app/(atlas)/(operasyonel)/topoloji/mantik').AnlikSatiri = {
      id: anlik.id, tesisId, tesisKodu: 'TZG', kaynak: 'test_kaynak',
      alindi: new Date().toISOString(), ozetHash: anlik.ozetHash, temelMi: false,
      onaylayan: null, onayZamani: null, not: null, ogeSayisi: anlik.ogeSayisi,
      sapmaSayisi: 0, acikSapma: 0, kritikSapma: 0, karsilastirmaZamani: null,
      temelVar: false, temelOnaylanabilir: true, karsilastirilabilir: true,
    };
    expect(M.anlikKarsilastirmasi(gorunum)).toBe('temelsiz');
    expect(M.anlikImi(gorunum)).toBe('unk');
  });

  it('elle karşılaştırma denetim izine yazılır — "son karşılaştırma" uydurulmaz', async () => {
    const { anlikId } = await sapmaliKapsam();
    const iz = await T.karsilastirmaIzi([anlikId]);
    expect(iz.anligaGore.get(anlikId)).toBeInstanceOf(Date);
    expect(iz.sonKarsilastirma).not.toBeNull();
    expect(iz.tetikleyen).toBe('elle');
  });

  it('kanıtsız anlık "fark yok" DEĞİL "karşılaştırılmadı" gösterilir', () => {
    const taban = {
      id: 'a', tesisId: 't', tesisKodu: 'T', kaynak: 'test_kaynak',
      alindi: '2026-08-01T00:00:00.000Z', ozetHash: 'h', temelMi: false,
      onaylayan: null, onayZamani: null, not: null, ogeSayisi: 3,
      sapmaSayisi: 0, acikSapma: 0, kritikSapma: 0, karsilastirmaZamani: null,
      temelVar: true, temelOnaylanabilir: true, karsilastirilabilir: true,
    };
    expect(M.anlikKarsilastirmasi(taban)).toBe('karsilastirilmadi');
    expect(M.anlikKarsilastirmasi({ ...taban, karsilastirmaZamani: '2026-08-02T00:00:00.000Z' }))
      .toBe('sapmasiz');
    expect(M.anlikKarsilastirmasi({ ...taban, sapmaSayisi: 2 })).toBe('sapma');
    expect(M.anlikKarsilastirmasi({ ...taban, temelMi: true })).toBe('temel');
    // Dört hâlin sözü de birbirinden FARKLI olmalı; aynı cümleye düşerlerse
    // ekran ayrımı gösteremez.
    const sozler = new Set(Object.values(M.KARSILASTIRMA_SOZU));
    expect(sozler.size).toBe(Object.keys(M.KARSILASTIRMA_SOZU).length);
  });

  it('motor imleci kanıtı yalnız temel anlıktan ÖNCE onaylandıysa sayılır', () => {
    const ortak = {
      alindi: '2026-08-10T00:00:00.000Z',
      izZamani: null,
      motorImleci: '2026-08-12T00:00:00.000Z',
      motorZamani: '2026-08-12T01:00:00.000Z',
    };
    // Temel anlıktan ÖNCE onaylanmış → motor onu atlayamazdı: kanıt geçerli.
    expect(M.anlikKarsilastirmaZamani({
      ...ortak, temelVar: true, temelOnayZamani: '2026-08-01T00:00:00.000Z',
    })).toBe(ortak.motorZamani);
    // Temel SONRA onaylandı → o koşuda atlanmış olabilir: kanıt sayılmaz.
    expect(M.anlikKarsilastirmaZamani({
      ...ortak, temelVar: true, temelOnayZamani: '2026-08-11T00:00:00.000Z',
    })).toBeNull();
    // İmlecin ötesinde kalan anlık işlenmemiştir.
    expect(M.anlikKarsilastirmaZamani({
      ...ortak, alindi: '2026-08-13T00:00:00.000Z',
      temelVar: true, temelOnayZamani: '2026-08-01T00:00:00.000Z',
    })).toBeNull();
    // Elle iz her zaman en güçlü kanıttır.
    expect(M.anlikKarsilastirmaZamani({
      ...ortak, izZamani: '2026-08-14T00:00:00.000Z', temelVar: false, temelOnayZamani: null,
    })).toBe('2026-08-14T00:00:00.000Z');
  });

  it('ekran başlığı dört sıfırı AYRI cümleyle söyler', () => {
    const bosSayim = {
      acik: 0, kritikAcik: 0, inceleme: 0, temelsizKapsam: 0,
      anliksizKapsam: 0, karsilastirilmamisAnlik: 0, bekleyenAday: 0,
    };
    const izsiz = {
      sonKarsilastirma: null, tetikleyen: null,
      motorImleci: null, motorDurumu: null, motorZamani: null,
    } as const;
    const izli = { ...izsiz, sonKarsilastirma: '2026-08-20T10:00:00.000Z',
      tetikleyen: 'motor' as const };

    const anliksiz = M.ekranHali(bosSayim, izsiz, false);
    const temelsiz = M.ekranHali({ ...bosSayim, temelsizKapsam: 1 }, izsiz, true);
    const bakilmadi = M.ekranHali(bosSayim, izsiz, true);
    const olculmus = M.ekranHali(bosSayim, izli, true);
    const acikVar = M.ekranHali({ ...bosSayim, acik: 2, kritikAcik: 1 }, izli, true);

    const cumleler = [anliksiz, temelsiz, bakilmadi, olculmus, acikVar]
      .map((h) => `${h.vurgu ?? ''}${h.metin}`);
    expect(new Set(cumleler).size).toBe(5);
    // Ölçülmemiş hiçbir hâl "sapma yok" diyemez.
    expect(anliksiz.metin).not.toContain('Sapma yok');
    expect(temelsiz.metin).not.toContain('Sapma yok');
    expect(bakilmadi.metin).not.toContain('Sapma yok');
    expect(olculmus.metin).toBe('Sapma yok');
    expect(olculmus.durum).toBe('ok');
    expect(acikVar.durum).toBe('bd');
  });
});

/* ═══ 6 · Liste disiplini ═════════════════════════════════════════════ */

describe('Sıralama ve katlama açık sapmayı gizlemez', () => {
  const sapma = (ek: Partial<import('@/app/(atlas)/(operasyonel)/topoloji/mantik').SapmaSatiri>) => ({
    id: Math.random().toString(36).slice(2), tip: 'yeni_dugum', siddet: 'orta',
    durum: 'gozlendi', aciklama: 'x', anahtar: 'A', tesisId: null, tesisKodu: null,
    anlikId: 'an', anlikKaynak: 'test_kaynak', anlikAlindi: '2026-08-01T00:00:00.000Z',
    olusturuldu: '2026-08-01T00:00:00.000Z', kararVeren: null, kararZamani: null,
    kararGerekcesi: null, adayVar: false, uretilenRiskId: null, uretilenRiskKodu: null,
    uretilenBulguId: null, onceki: null, sonraki: null, kararVerilebilir: true, ...ek,
  });

  it('açık kritik sapma listenin başında durur, kapalı olan sonda', () => {
    const liste = [
      sapma({ durum: 'kabul', siddet: 'kritik' }),
      sapma({ durum: 'gozlendi', siddet: 'dusuk' }),
      sapma({ durum: 'gozlendi', siddet: 'kritik' }),
    ];
    const sirali = M.sirala(liste);
    expect(sirali[0].siddet).toBe('kritik');
    expect(sirali[0].durum).toBe('gozlendi');
    expect(sirali[2].durum).toBe('kabul');
  });

  it('karar bekleyen sapma ASLA katlanmış kuyruğa inmez', () => {
    expect(M.toplanabilir(sapma({ durum: 'gozlendi' }))).toBe(false);
    expect(M.toplanabilir(sapma({ durum: 'inceleme' }))).toBe(false);
    expect(M.toplanabilir(sapma({ durum: 'kabul' }))).toBe(true);
    expect(M.toplanabilir(sapma({ durum: 'ret' }))).toBe(true);
  });

  it('işaretçi KARAR hâlini kodlar; kritik açık sapma kenarını korur', () => {
    expect(M.sapmaImi(sapma({ durum: 'gozlendi' }))).toBe('unk');
    expect(M.sapmaImi(sapma({ durum: 'inceleme' }))).toBe('md');
    expect(M.sapmaImi(sapma({ durum: 'kabul' }))).toBe('ok');
    expect(M.sapmaImi(sapma({ durum: 'ret' }))).toBe('pl');
    expect(M.sapmaKenari(sapma({ durum: 'gozlendi', siddet: 'kritik' }))).toBe('bd');
  });
});

/* ═══ 7 · Tek doğruluk kaynağı ve tavandan bağımsız metrik ════════════
   Denetim bulgusu #22: dört okuma yardımcısı yazılmıştı ama hiçbir yerden
   çağrılmıyordu; ekran aynı işi kendi ham `db` sorgularıyla yeniden
   yapıyordu. Ekran yardımcılara taşındı. Bu blok o taşımanın davranışını
   dondurur — özellikle metriğin TAVANDAN bağımsız olduğunu. */

describe('Ekran sorguları tek kaynaktan gelir', () => {
  it('sapmalariListele kapsam dışını GETİRMEZ ve şiddete göre sıralar', async () => {
    const { tesisId, sapmaId } = await sapmaliKapsam();
    const baskaTesis = await tesisAc();

    const kapsamda = await T.sapmalariListele({ tesisIdleri: [tesisId] });
    expect(kapsamda.some((s) => s.id === sapmaId)).toBe(true);
    // Şiddet sırası veritabanının alfabesine bırakılmaz.
    const siddetler = kapsamda.map((s) => M.SIDDET_SIRASI[s.siddet] ?? 9);
    expect([...siddetler].sort((a, b) => a - b)).toEqual(siddetler);

    const baskaKapsam = await T.sapmalariListele({ tesisIdleri: [baskaTesis] });
    expect(baskaKapsam.some((s) => s.id === sapmaId)).toBe(false);

    // [] = hiçbir tesis: boş liste, "hepsi" DEĞİL.
    expect(await T.sapmalariListele({ tesisIdleri: [] })).toEqual([]);
  });

  it('anliklariListele ekranın ihtiyaç duyduğu sayaçları taşır', async () => {
    const { tesisId, anlikId } = await sapmaliKapsam();
    const anliklar = await T.anliklariListele([tesisId], 20);
    const bu = anliklar.find((a) => a.id === anlikId);
    expect(bu).toBeTruthy();
    // Ekranın "öğe" ve "sapma" kolonları bu sayaçlardan doğar.
    expect(bu!._count.gozlemler).toBeGreaterThan(0);
    expect(bu!._count.sapmalar).toBeGreaterThan(0);
  });

  it('METRİK TAVANDAN BAĞIMSIZDIR: kesilmiş liste sayıyı düşüremez', async () => {
    const { tesisId } = await sapmaliKapsam();
    /* Kapsamda BİRDEN ÇOK açık sapma olmalı, yoksa "tavanla kesilmiş liste"
       ile "tam sayım" aynı sonucu verir ve test kuralı ölçmez. İkinci bir
       anlık, temelde olmayan yeni bir düğüm getirir. */
    const ucuncu = await T.anlikAl(tesisId, 'test_kaynak', [
      ...SAPMALI_OGELER,
      dugum('SRV-EK-01', '10.10.0.9', 'Z-KURUMSAL', 'kurumsal'),
    ]);
    expect((await E.anligiKarsilastirEylem({ anlikId: ucuncu.id })).ok).toBe(true);

    const ozet = await T.topolojiOzeti([tesisId]);
    expect(ozet.acikSapma).toBeGreaterThan(1);

    // Ekranın gördüğü liste tavanla BİRE indirilse bile metrik değişmez:
    // sunucunun `count` ile ölçtüğü sayı geçerlidir.
    const kesilmis = await T.sapmalariListele({ tesisIdleri: [tesisId], limit: 1 });
    const satirlar = kesilmis.map((s) => ({
      id: s.id, tip: s.tip, siddet: s.siddet, durum: s.durum, aciklama: s.aciklama,
      anahtar: null, tesisId: s.tesisId, tesisKodu: null, anlikId: s.anlikId,
      anlikKaynak: s.anlik.kaynak, anlikAlindi: s.anlik.alindi.toISOString(),
      olusturuldu: s.olusturuldu.toISOString(), kararVeren: null, kararZamani: null,
      kararGerekcesi: null, adayVar: s.siddet === 'kritik', uretilenRiskId: null,
      uretilenRiskKodu: null, uretilenBulguId: null, onceki: null, sonraki: null,
      kararVerilebilir: true,
    }));

    const tavansiz = M.sayimHesapla(satirlar, [], []);
    const ozetli = M.sayimHesapla(satirlar, [], [],
      { acikSapma: ozet.acikSapma, kritikAcik: ozet.kritikAcik });

    expect(ozetli.acik).toBe(ozet.acikSapma);
    expect(ozetli.kritikAcik).toBe(ozet.kritikAcik);
    /* Kesilmiş listeden sayılan metrik gerçeğin ALTINDA kalır; ekranın
       kullandığı sayı bu DEĞİLDİR. Bu satır, özet parametresi kaldırılıp
       sayım yeniden listeden yapılırsa kırmızıya döner. */
    expect(satirlar.length).toBe(1);
    expect(tavansiz.acik).toBeLessThan(ozetli.acik);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   TOPLU TEMEL DURUMU — şeridin okuduğu üç sayı

   /topoloji temel şeridi eskiden kapsam BAŞINA dört sorgu koşuyordu ve
   biri temelin BÜTÜN gözlemlerini belleğe çeken `temelAnlik()`ti; şerit o
   gözlemlerin tek birini bile çizmez. Örnek veride anlık tablosu boş
   olduğu için "anlığı yoksa sorma" kısayolu maliyeti gizliyordu — gerçek
   gözlem akmaya başladığı gün yirmi santral seksen sorgu ve yirmi tam
   topoloji okuması ederdi. Toplu okuma sorgu sayısını SANTRAL SAYISINDAN
   BAĞIMSIZ üçe indirir.

   Hızın bedeli doğruluk olamaz: şeridin ayırdığı ÜÇ SAYI (temel yok /
   gözlem yok / ölçülmüş sıfır) burada ayrı ayrı sabitlenir.
   ═══════════════════════════════════════════════════════════════════════ */
describe('Toplu temel durumu', () => {
  it('temeli olan kapsamın üç sayısı da doğru okunur', async () => {
    const { tesisId } = await sapmaliKapsam();
    const harita = await T.temelDurumlari([tesisId]);
    const d = harita.get(tesisId);
    expect(d).toBeDefined();
    expect(d!.temelVar).toBe(true);
    expect(d!.temel!.kaynak).toBe('test_kaynak');
    expect(d!.temel!.onayZamani).not.toBeNull();
    // İki anlık alındı: biri temel oldu, biri karşılaştırıldı.
    expect(d!.anlikSayisi).toBe(2);
    expect(d!.temelOlmayanAnlik).toBe(1);
    expect(d!.acikSapma).toBeGreaterThan(0);
  });

  it('temel SEÇİLEN anlıktır — sıralama tekil okumayla aynı', async () => {
    const tesisId = await tesisAc();
    const ilk = await T.anlikAl(tesisId, 'test_kaynak', TEMEL_OGELER);
    await T.temelBelirle(ilk.id, yoneticiId, 'İlk temel onaylandı.');
    const ikinci = await T.anlikAl(tesisId, 'test_kaynak', SAPMALI_OGELER);
    await T.temelBelirle(ikinci.id, yoneticiId, 'Temel yenilendi, eskisi düşmeli.');

    const d = (await T.temelDurumlari([tesisId])).get(tesisId)!;
    // Eski temel düşer; toplu okuma da YENİ temeli göstermeli.
    expect(d.temel!.id).toBe(ikinci.id);
    expect((await T.temelAnlik(tesisId))!.id).toBe(ikinci.id);
  });

  it('gözlemi olmayan kapsam haritada YOKTUR — çağıran sıfır gösterir', async () => {
    const bos = await tesisAc();
    expect((await T.temelDurumlari([bos])).has(bos)).toBe(false);
  });

  it('anlığı olan ama temeli ONAYLANMAMIŞ kapsam: temelVar false, sayı sıfır değil',
    async () => {
      const tesisId = await tesisAc();
      await T.anlikAl(tesisId, 'test_kaynak', TEMEL_OGELER);
      const d = (await T.temelDurumlari([tesisId])).get(tesisId)!;
      // "Temel yok" ile "gözlem yok" AYRI şeylerdir; ikisi de sapma
      // hesaplanmadığını söyler ama sebepleri farklıdır.
      expect(d.temelVar).toBe(false);
      expect(d.anlikSayisi).toBe(1);
      expect(d.temelOlmayanAnlik).toBe(1);
      expect(d.acikSapma).toBe(0);
    });

  it('kapsam sınırı uygulanır: listede olmayan santral haritaya GİRMEZ', async () => {
    const { tesisId: a } = await sapmaliKapsam();
    const { tesisId: b } = await sapmaliKapsam();
    const yalnizA = await T.temelDurumlari([a]);
    expect(yalnizA.has(a)).toBe(true);
    expect(yalnizA.has(b)).toBe(false);
    // Boş kapsam hiçbir şey göstermez (sınırsız DEĞİL).
    expect((await T.temelDurumlari([])).size).toBe(0);
    // Sınırsız kapsam ikisini de görür.
    const hepsi = await T.temelDurumlari(null);
    expect(hepsi.has(a) && hepsi.has(b)).toBe(true);
  });

  /* Aşağıdaki iki durum `temelBelirle()` ile ÜRETİLEMEZ (o eylem eski
     temeli düşürür ve onaylayan ister). Satırlar bu yüzden doğrudan
     yazılıyor: korunan şey eylemin davranışı değil, OKUYUCUNUN bozuk ya da
     elle değiştirilmiş veriye verdiği cevaptır. Tekil `temelAnlik()` bu
     iki kuralı taşıyor; toplu okuma ondan sapamaz. */
  it('onaysız satır temel SAYILMAZ (iki okuma da aynı der)', async () => {
    const tesisId = await tesisAc();
    const a = await T.anlikAl(tesisId, 'test_kaynak', TEMEL_OGELER);
    // Temel işareti var, onay YOK — örneğin yarım kalmış bir düzenleme.
    await db.topolojiAnlik.update({
      where: { id: a.id }, data: { temelMi: true, onaylayanId: null } });

    expect(await T.temelAnlik(tesisId)).toBeNull();
    /* Sapma motoru bu soruyu `temelVarMi` ile sorar. Onaysız satırı temel
       sayarsa ONAYLANMAMIŞ bir temele göre sapma hesaplar — kural 2'nin
       ("temelsizken sapma hesaplanmaz") tam ihlali. */
    expect(await T.temelVarMi(tesisId)).toBe(false);
    const d = (await T.temelDurumlari([tesisId])).get(tesisId)!;
    expect(d.temelVar).toBe(false);
    expect(d.temel).toBeNull();
    // Anlık yine sayılır: "temel yok" ile "gözlem yok" karışmamalı.
    expect(d.anlikSayisi).toBe(1);
  });

  it('birden çok temel işaretliyse EN SON ONAYLANAN seçilir', async () => {
    const tesisId = await tesisAc();
    const eski = await T.anlikAl(tesisId, 'test_kaynak', TEMEL_OGELER);
    const yeni = await T.anlikAl(tesisId, 'test_kaynak', SAPMALI_OGELER);
    // İki satır da temel işaretli: `temelBelirle` bunu üretmez ama bozuk
    // veri üretebilir. Sıra tanımlı olmalı, "hangisi gelirse" olmamalı.
    await db.topolojiAnlik.update({ where: { id: eski.id }, data: {
      temelMi: true, onaylayanId: yoneticiId,
      onayZamani: new Date('2026-01-01T00:00:00.000Z') } });
    await db.topolojiAnlik.update({ where: { id: yeni.id }, data: {
      temelMi: true, onaylayanId: yoneticiId,
      onayZamani: new Date('2026-06-01T00:00:00.000Z') } });

    expect((await T.temelAnlik(tesisId))!.id).toBe(yeni.id);
    expect((await T.temelDurumlari([tesisId])).get(tesisId)!.temel!.id).toBe(yeni.id);
  });

  it('temelVarMi gözlem yüklemeden aynı cevabı verir', async () => {
    const { tesisId } = await sapmaliKapsam();
    const bos = await tesisAc();
    expect(await T.temelVarMi(tesisId)).toBe(true);
    expect(await T.temelVarMi(bos)).toBe(false);
    // Tekil referansla birebir: onaysız satır temel SAYILMAZ.
    expect((await T.temelAnlik(tesisId)) !== null).toBe(true);
    expect((await T.temelAnlik(bos)) !== null).toBe(false);
  });
});
