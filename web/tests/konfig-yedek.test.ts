import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yedek-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Yetki kapısı: eylem katmanı `yetkiZorunlu`/`izinVar` üzerinden geçer.
   Testte HTTP oturumu yok; kapı seed'deki GERÇEK bir kullanıcıyla açılır
   (denetim izi yabancı anahtarı gerçek kullanıcı ister). Kapının
   ARKASINDAKİ kurallar — başarısız yedek doğrulanamaz, gerekçesiz bulgu
   kapanmaz, tek "son bilinen iyi" kalır — sahte değildir, gerçek kodda
   koşar. `kapsamKisiti` ayarlanınca gerçek kapsam dallanması devreye girer. */
const sahteKullanici = {
  id: '', adSoyad: 'Test Yedek Sorumlusu', eposta: 'y@test', unvan: null,
  yetkiler: [{ rol: 'yonetici', surecId: null, tesisId: null, tuzelKisiId: null,
    regulasyonId: null, modul: null }],
};
let kapsamKisiti: string | null = null;

vi.mock('@/lib/erisim', async (asil) => {
  const gercek = await asil<typeof import('@/lib/erisim')>();
  return {
    ...gercek,
    yetkiZorunlu: async () => sahteKullanici,
    izinVar: (
      _k: unknown, _m: unknown, _i: unknown,
      kapsam?: { tesisId?: string | null },
    ) => (kapsamKisiti === null
      || kapsam?.tesisId == null
      || kapsam.tesisId === kapsamKisiti),
  };
});

const { db } = await import('@/lib/db');
const {
  yedekVarMi, sonYedekYasi, konfigurasyonDegistiMi, sonBilinenIyi,
  kritikVarliklardaEksikYedek, yedekKontrolBagi, yedekMetadataYaz,
  yedekKaynagiBagliMi, YEDEK_VARLIK_TIPI,
} = await import('@/lib/entegrasyon/konfigYedek');
const { yedekDogrulamayiIsle, YEDEK_KURALLARI, KOSU_KAYNAGI } =
  await import('@/lib/motorlar/yedekDogrulama');
const {
  yedegiDogrula, sonBilinenIyiIsaretle, yedekBulgusunuIsle, varlikYedekDurumu,
} = await import('@/lib/eylemler2/konfigYedek');
const { hazirlik, kritikHucresi, filoOzeti, testHucresi } =
  await import('@/app/(atlas)/(operasyonel)/yedekleme/mantik');
import type { Santral } from '@/app/(atlas)/(operasyonel)/yedekleme/mantik';

const GUN = 86_400_000;

let yedekSayaci = 0;

/** Testin kullanacağı kritik varlıklar — seed'den gelir, yaratılmaz. */
let varliklar: { id: string; etiket: string; tesisId: string | null }[] = [];
const v = (i: number) => varliklar[i];

async function yedekEkle(varlikId: string, o: {
  gun: number; basarili?: boolean; hash?: string | null;
  surum?: string | null; iyi?: boolean; dogrulandi?: boolean; hata?: string | null;
}) {
  /* Her satır kaynak sistemdeki AYRI bir yedek koşusudur; tabloda
     (kaynakSistem, kaynakKayitId) tekil olduğu için her birine kendi
     kaynak kayıt kimliği verilir. */
  return db.konfigurasyonYedegi.create({ data: {
    varlikId,
    kaynakSistem: 'test-backup',
    kaynakKayitId: `test-yedek-${++yedekSayaci}`,
    yedekZamani: new Date(Date.now() - o.gun * GUN),
    basarili: o.basarili ?? true,
    icerikHash: o.hash === undefined ? 'HASH-A' : o.hash,
    surum: o.surum ?? null,
    sonBilinenIyi: o.iyi ?? false,
    dogrulandi: o.dogrulandi ?? false,
    hata: o.hata ?? null,
  } });
}

describe('Konfigürasyon yedeği — üç değerli kontrol', () => {
  beforeAll(async () => {
    const yonetici = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
    sahteKullanici.id = yonetici.id;
    varliklar = await db.varlik.findMany({
      where: { silindi: null, kritiklik: 'kritik' },
      select: { id: true, etiket: true, tesisId: true },
      orderBy: { etiket: 'asc' },
      take: 6,
    });
    expect(varliklar.length).toBeGreaterThanOrEqual(6);
  });

  /* ── Motorun kaynaksız davranışı ÖNCE: bu noktada tabloda hiç kayıt yok ── */

  it('kaynak bağlı değilken motor HATA VERMEZ, temiz kapanır ve bunu koşu kaydında söyler', async () => {
    await db.konfigurasyonYedegi.deleteMany();
    expect(await yedekKaynagiBagliMi()).toBe(false);

    // Kaynak kesilmişken eski açık bulgular KAPATILMAMALI — bir tane koyalım.
    const kalinti = await db.veriKalitesiBulgusu.create({ data: {
      kural: YEDEK_KURALLARI.yok, kaynakTipi: 'Varlik', kaynakId: v(0).id,
      aciklama: 'önceki koşudan kalan açık bulgu' } });

    const sonuc = await yedekDogrulamayiIsle();
    expect(sonuc).toEqual({ islenen: 0, uretilen: 0 });

    const kosu = await db.entegrasyonKosusu.findFirst({
      where: { kaynak: KOSU_KAYNAGI }, orderBy: { baslangic: 'desc' } });
    expect(kosu?.durum).toBe('kaynak_bagli_degil'); // koşu kaydı sebebi söylüyor
    expect(kosu?.hata).toBeNull();                  // ama bu bir HATA değil
    expect(kosu?.bitis).not.toBeNull();             // sessizce asılı kalmadı

    const hala = await db.veriKalitesiBulgusu.findUniqueOrThrow({ where: { id: kalinti.id } });
    expect(hala.durum).toBe('acik'); // kaynak kesildi diye "çözüldü" sayılmadı
    await db.veriKalitesiBulgusu.delete({ where: { id: kalinti.id } });
  });

  /* ── yedekVarMi: yok ile bilinmiyor asla karışmaz ────────────────────── */

  it('hiç kayıt yokken sonuç "bilinmiyor" — "yok" DEĞİL', async () => {
    const s = await yedekVarMi(v(0).id);
    expect(s.sonuc).toBe('bilinmiyor');
    expect(s.sonuc).not.toBe('yok');
    expect(s.kayitSayisi).toBe(0);
    expect(await sonYedekYasi(v(0).id)).toBeNull(); // 0 değil, null
    expect(s.gerekce).toMatch(/ÖLÇÜLMEDİĞİ/);
  });

  it('kayıt var ama hepsi başarısızsa sonuç "yok" — "bilinmiyor" DEĞİL', async () => {
    await yedekEkle(v(1).id, { gun: 2, basarili: false, hata: 'FTP zaman aşımı' });
    await yedekEkle(v(1).id, { gun: 9, basarili: false, hata: 'kimlik reddedildi' });
    const s = await yedekVarMi(v(1).id);
    expect(s.sonuc).toBe('yok');
    expect(s.kayitSayisi).toBe(2);
    expect(s.basariliSayisi).toBe(0);
    expect(s.sonHata).toBe('FTP zaman aşımı');
    expect(await sonYedekYasi(v(1).id)).toBeNull(); // başarılı yedek yok → ölçülemedi
  });

  it('en az bir başarılı kayıt varsa sonuç "var" ve yaş gün olarak ölçülür', async () => {
    await yedekEkle(v(2).id, { gun: 3 });
    const s = await yedekVarMi(v(2).id);
    expect(s.sonuc).toBe('var');
    expect(await sonYedekYasi(v(2).id)).toBe(3);
  });

  /* ── Hash karşılaştırması ────────────────────────────────────────────── */

  it('son iki yedeğin hash\'i farklıysa konfigürasyon değişimi tespit edilir', async () => {
    await yedekEkle(v(3).id, { gun: 20, hash: 'HASH-ESKI', surum: 'v1.2' });
    await yedekEkle(v(3).id, { gun: 1, hash: 'HASH-YENI', surum: 'v1.2' });
    const d = await konfigurasyonDegistiMi(v(3).id);
    expect(d.sonuc).toBe('var');
    expect(d.son?.icerikHash).toBe('HASH-YENI');
    expect(d.onceki?.icerikHash).toBe('HASH-ESKI');
  });

  it('hash aynıysa "yok" (değişmedi) döner', async () => {
    await yedekEkle(v(4).id, { gun: 15, hash: 'AYNI' });
    await yedekEkle(v(4).id, { gun: 1, hash: 'AYNI' });
    const d = await konfigurasyonDegistiMi(v(4).id);
    expect(d.sonuc).toBe('yok');
  });

  it('hash yoksa "bilinmiyor" — hash\'siz iki yedek "değişmedi" sayılmaz', async () => {
    await yedekEkle(v(5).id, { gun: 15, hash: null, surum: 'v3' });
    await yedekEkle(v(5).id, { gun: 1, hash: null, surum: 'v3' });
    const d = await konfigurasyonDegistiMi(v(5).id);
    expect(d.sonuc).toBe('bilinmiyor');
    expect(d.sonuc).not.toBe('yok');
    expect(d.gerekce).toMatch(/hash/i);

    // tek başarılı yedek de karşılaştırılamaz → bilinmiyor
    const tek = await konfigurasyonDegistiMi(v(2).id);
    expect(tek.sonuc).toBe('bilinmiyor');
  });

  /* ── Son bilinen iyi ─────────────────────────────────────────────────── */

  it('son bilinen iyi: işaretli EN SON yedek seçilir; işaret yoksa "yok", kayıt yoksa "bilinmiyor"', async () => {
    // hiç kayıt yok → bilinmiyor
    const bos = await sonBilinenIyi(v(0).id);
    expect(bos.sonuc).toBe('bilinmiyor');
    expect(bos.yedek).toBeNull();

    // kayıt var ama işaretli yok → yok
    const isaretsiz = await sonBilinenIyi(v(4).id);
    expect(isaretsiz.sonuc).toBe('yok');

    // iki işaretli varsa en yenisi kazanır
    await yedekEkle(v(2).id, { gun: 40, hash: 'H1', surum: 'v1', iyi: true });
    await yedekEkle(v(2).id, { gun: 10, hash: 'H2', surum: 'v2', iyi: true, dogrulandi: true });
    const iyi = await sonBilinenIyi(v(2).id);
    expect(iyi.sonuc).toBe('var');
    expect(iyi.yedek?.surum).toBe('v2');
    expect(iyi.yedek?.dogrulandi).toBe(true);
  });

  /* ── Kritik varlıklarda eksik yedek: yok ile bilinmeyen ayrı ─────────── */

  it('kritik varlık raporu yedeksiz ile bilinmeyeni AYRI listeler, toplamaz', async () => {
    const r = await kritikVarliklardaEksikYedek();
    expect(r.kaynakBagli).toBe(true);
    // v(1): iki başarısız deneme → kanıtlı yokluk
    expect(r.yedeksiz.some((x) => x.varlikId === v(1).id)).toBe(true);
    expect(r.bilinmeyen.some((x) => x.varlikId === v(1).id)).toBe(false);
    // İki liste kesişmez
    const kesisim = r.yedeksiz.filter((a) => r.bilinmeyen.some((b) => b.varlikId === a.varlikId));
    expect(kesisim).toHaveLength(0);
    // v(2): başarılı yedeği var → hiçbir listede değil
    expect(r.yedeksiz.concat(r.bilinmeyen).some((x) => x.varlikId === v(2).id)).toBe(false);
  });

  /* ── Motor: bulgu üretir, RİSK/BULGU AÇMAZ ───────────────────────────── */

  it('motor yedeksiz kritik varlığı veri kalitesi bulgusu yapar; otomatik RİSK/BULGU AÇMAZ', async () => {
    const [riskOnce, bulguOnce, adayOnce, gorevOnce] = await Promise.all([
      db.risk.count(), db.bulgu.count(), db.projeAdayi.count(), db.gorev.count(),
    ]);

    const sonuc = await yedekDogrulamayiIsle();
    expect(sonuc.islenen).toBeGreaterThan(0);
    expect(sonuc.uretilen).toBeGreaterThan(0);

    const bulgular = await db.veriKalitesiBulgusu.findMany({
      where: { durum: 'acik', kural: YEDEK_KURALLARI.yok, kaynakId: v(1).id } });
    expect(bulgular).toHaveLength(1);
    expect(bulgular[0].aciklama).toMatch(/Risk kaydı AÇILMADI/);

    // Bilinmeyen AYRI kuralda — "yedeksiz" sayısına karışmıyor
    const bilinmeyenler = await db.veriKalitesiBulgusu.findMany({
      where: { durum: 'acik', kural: YEDEK_KURALLARI.bilinmiyor } });
    for (const b of bilinmeyenler) expect(b.aciklama).toMatch(/ÖLÇÜLMEMİŞ/);

    // Hiçbir karar tablosuna dokunulmadı
    const [riskSonra, bulguSonra, adaySonra, gorevSonra] = await Promise.all([
      db.risk.count(), db.bulgu.count(), db.projeAdayi.count(), db.gorev.count(),
    ]);
    expect(riskSonra).toBe(riskOnce);
    expect(bulguSonra).toBe(bulguOnce);
    expect(adaySonra).toBe(adayOnce);
    expect(gorevSonra).toBe(gorevOnce);

    // Koşu kaydı bırakıldı
    const kosu = await db.entegrasyonKosusu.findFirst({
      where: { kaynak: KOSU_KAYNAGI }, orderBy: { baslangic: 'desc' } });
    expect(kosu?.durum).toBe('basarili');

    // İkinci koşu mükerrer bulgu üretmez
    const ikinci = await yedekDogrulamayiIsle();
    expect(ikinci.uretilen).toBe(0);
  });

  it('yedek gelince motor açık bulguyu çözer (insan müdahalesi olmadan KAPATMAZ, çözer)', async () => {
    await yedekEkle(v(1).id, { gun: 0, basarili: true, hash: 'YENI-HASH' });
    await yedekDogrulamayiIsle();
    const acik = await db.veriKalitesiBulgusu.findMany({
      where: { durum: 'acik', kural: YEDEK_KURALLARI.yok, kaynakId: v(1).id } });
    expect(acik).toHaveLength(0);
  });

  /* ── Uyum bağı: öneri üretir, MaddeDurumu'na yazmaz ──────────────────── */

  it('yedekKontrolBagi 8.1.1 ve 8.1.2 önerisi üretir ama MaddeDurumu\'na DOKUNMAZ', async () => {
    const once = await db.maddeDurumu.findMany({
      select: { id: true, durum: true, guven: true, guncellendi: true } });

    const baglar = await yedekKontrolBagi(v(1).id);
    expect(baglar.map((b) => b.maddeKodu)).toEqual(['EPDK-SYM-8.1.1', 'EPDK-SYM-8.1.2']);
    expect(baglar.every((b) => b.otomatikUygulanir === false)).toBe(true);
    expect(baglar.every((b) => b.maddeId !== null)).toBe(true); // maddeler veride var
    expect(baglar[0].katki).toBe('destekler'); // v(1) artık başarılı yedeğe sahip

    const sonra = await db.maddeDurumu.findMany({
      select: { id: true, durum: true, guven: true, guncellendi: true } });
    expect(sonra).toEqual(once);
  });

  it('yedeksiz varlıkta 8.1.1 zayıflar, kanıtsız varlıkta "kanit_yok" olur', async () => {
    await db.konfigurasyonYedegi.deleteMany({ where: { varlikId: v(1).id } });
    await yedekEkle(v(1).id, { gun: 1, basarili: false, hata: 'yine başarısız' });
    const zayif = await yedekKontrolBagi(v(1).id);
    expect(zayif[0].katki).toBe('zayiflatir');
    expect(zayif[1].katki).toBe('kanit_yok'); // doğrulanacak yedek yok

    const kanitsiz = await yedekKontrolBagi(v(0).id); // hiç kayıt yok
    expect(kanitsiz[0].katki).toBe('kanit_yok');
  });

  /* ── Dış kaynaktan yazım: idempotent + köken ─────────────────────────── */

  it('yedekMetadataYaz idempotenttir ve köken kaydı düşer', async () => {
    const koken = {
      kaynakSistem: 'acme-backup', kaynakKayitId: 'JOB-42',
      toplanma: new Date(), guven: null,
    };
    const ilk = await yedekMetadataYaz({
      koken, varlikId: v(0).id, yedekZamani: new Date(Date.now() - GUN),
      basarili: true, icerikHash: 'X1', surum: 'r1' });
    expect(ilk.yeni).toBe(true);

    const tekrar = await yedekMetadataYaz({
      koken, varlikId: v(0).id, yedekZamani: new Date(Date.now() - GUN),
      basarili: true, icerikHash: 'X1', surum: 'r1' });
    expect(tekrar.yeni).toBe(false);
    expect(tekrar.id).toBe(ilk.id); // ikinci senkron yeni satır AÇMADI

    const kayitlar = await db.konfigurasyonYedegi.findMany({
      where: { varlikId: v(0).id, kaynakSistem: 'acme-backup' } });
    expect(kayitlar).toHaveLength(1);

    const kokenSatiri = await db.veriKokeni.findFirst({
      where: { varlikTipi: YEDEK_VARLIK_TIPI, varlikId: ilk.id } });
    expect(kokenSatiri?.kaynakSistem).toBe('acme-backup');
    expect(kokenSatiri?.kaynakKayitId).toBe('JOB-42');
    expect(kokenSatiri?.guven).toBeNull();            // ölçülmedi ≠ sıfır güven
    expect(kokenSatiri?.dogrulamaDurumu).toBe('dogrulanmadi'); // motor doğrulayamaz
  });

  /* Idempotency artık VERİTABANINDA duruyor. Eskiden aynılık VeriKokeni
     tablosunda arama yaparak kuruluyordu; eşzamanlı iki içe aktarım ikisi
     de "köken yok" görüp aynı yedeği iki kez yazabilirdi. Bu test o kapıyı
     kapalı tutar: kısıt kalkarsa aşağıdaki create BAŞARILI OLUR ve test
     kırmızıya döner. */
  it('aynı (kaynakSistem, kaynakKayitId) ikinci satır olarak YAZILAMAZ', async () => {
    await expect(db.konfigurasyonYedegi.create({ data: {
      varlikId: v(1).id,
      kaynakSistem: 'acme-backup',
      kaynakKayitId: 'JOB-42',          // yukarıdaki testte zaten yazıldı
      yedekZamani: new Date(),
      basarili: true,
    } })).rejects.toThrow(/[Uu]nique/);   // FK/başka bir hata değil: TEKİLLİK

    expect(await db.konfigurasyonYedegi.count({
      where: { kaynakSistem: 'acme-backup', kaynakKayitId: 'JOB-42' } })).toBe(1);
  });

  it('farklı kaynak sistemler aynı kayıt kimliğini kullanabilir', async () => {
    /* Tekillik (kaynakSistem, kaynakKayitId) ÇİFTİ üzerinedir: iki ayrı
       yedekleme ürününün ikisinin de "JOB-42" demesi çakışma değildir. */
    const yazim = await yedekMetadataYaz({
      koken: { kaynakSistem: 'diger-backup', kaynakKayitId: 'JOB-42',
        toplanma: new Date(), guven: null },
      varlikId: v(1).id, yedekZamani: new Date(), basarili: true });
    expect(yazim.yeni).toBe(true);
    expect(await db.konfigurasyonYedegi.count({ where: { kaynakKayitId: 'JOB-42' } })).toBe(2);
  });

  it('kökensiz yazım reddedilir — kaynağı bilinmeyen veri otomatik sayılmaz', async () => {
    await expect(yedekMetadataYaz({
      koken: { kaynakSistem: '', kaynakKayitId: 'X', toplanma: new Date(), guven: null },
      varlikId: v(0).id, yedekZamani: new Date(), basarili: true,
    })).rejects.toThrow(/kaynakSistem/);
    await expect(yedekMetadataYaz({
      koken: { kaynakSistem: 'acme-backup', kaynakKayitId: '', toplanma: new Date(), guven: null },
      varlikId: v(0).id, yedekZamani: new Date(), basarili: true,
    })).rejects.toThrow(/kaynakKayitId/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   §18 · YEDEKLEME EKRANININ BAĞLADIĞI İNSAN KARARLARI

   `yedegiDogrula`, `sonBilinenIyiIsaretle` ve `yedekBulgusunuIsle` yazılmış
   ama hiçbir ekrandan çağrılmıyordu. /yedekleme onları bağladı; buradaki
   testler bağlanan davranışın sözleşmesini dondurur.

   Ekranın SERT KURALI da burada ölçülür: "hiç yedek doğrulaması yapılmadı"
   ile "yedek doğrulaması başarısız" AYNI GÖRÜNMEZ — ne renkte, ne metinde,
   ne de sayaçta.
   ═══════════════════════════════════════════════════════════════════════ */

/** Ekran mantığı için iskelet santral — saf türetme testleri DB'ye dokunmaz. */
function santral(ozel: Partial<Santral> = {}): Santral {
  return {
    id: 't1', kod: 'AAA', ad: 'A Santrali', tip: null,
    toplam: 10, yedekli: 10, yedeksiz: 0, bilinmeyen: 0, kirilim: [],
    politika: {
      id: 'p1', ad: 'A Santrali — yedekleme', kapsam: null, siklik: 'gunluk',
      saklamaGun: 30, hedef: 'uzak', rpoSaat: 24, rtoSaat: 8, haricTutulan: null,
    },
    kosuOzeti: { basarili: 5, kismi: 0, basarisiz: 0 },
    sonKosuId: 'k1',
    santralKatmani: {
      bagli: true, gerekce: '5 koşu, 1 geri yükleme testi.', politikaAdi: 'A Santrali — yedekleme',
      sonKosu: { zaman: new Date().toISOString(), durum: 'basarili', hata: null },
      sonRestoreTesti: { zaman: new Date().toISOString(), sonuc: 'basarili', sureDk: 45 },
    },
    varlikKatmani: {
      kaynakBagli: true, yedeksiz: [], bilinmeyen: [], yedegiVar: 4, toplamKritik: 4,
    },
    celiskiler: [], bulgular: [],
    planlanabilir: true, yazabilir: true, bulguIsleyebilir: true,
    ...ozel,
  };
}

const eksik = (etiket: string, gerekce: string, kayitSayisi: number) => ({
  varlikId: `v-${etiket}`, etiket, ad: `${etiket} cihazı`, kritiklik: 'kritik',
  beyan: 'bilinmiyor', kayitSayisi, gerekce,
});

describe('§18 · Ekran mantığı — "ölçülmedi" ile "başarısız" ayrı görünür', () => {
  it('kanıtlı yedek açığı ile ölçüm boşluğu farklı renk, farklı metin, ayrı sayaç', () => {
    const acik = santral({
      varlikKatmani: {
        kaynakBagli: true,
        yedeksiz: [eksik('PLC-1', '3 yedek denemesinin tamamı başarısız.', 3)],
        bilinmeyen: [], yedegiVar: 3, toplamKritik: 4,
      },
    });
    const olculmemis = santral({
      varlikKatmani: {
        kaynakBagli: false,
        yedeksiz: [],
        bilinmeyen: [eksik('PLC-2', 'Ne otomatik yedek kaydı ne de envanter beyanı var.', 0)],
        yedegiVar: 3, toplamKritik: 4,
      },
    });

    const a = kritikHucresi(acik);
    const b = kritikHucresi(olculmemis);

    // Renk: biri kanıtlı açık (bd), öteki kör nokta (unk). Asla aynı.
    expect(a.renk).toBe('bd');
    expect(b.renk).toBe('unk');
    expect(a.renk).not.toBe(b.renk);

    // Metin: "yedeksiz" ile "ölçülmedi" aynı sözcüğü kullanmaz.
    expect(a.yazi).toMatch(/yedeksiz/);
    expect(b.yazi).toMatch(/ölçülmedi/);
    expect(b.yazi).not.toMatch(/yedeksiz/);

    // Kaynak bağlı değilken ipucu "yedek yok" İDDİA ETMEZ.
    expect(b.ipucu).toMatch(/ÖLÇÜLMEDİ|ölçülmedi|değil/);

    // Satır işaretçisi: kanıtlı açık kırmızı, ölçüm boşluğu gri.
    expect(hazirlik(acik)).toBe('bd');
    expect(hazirlik(olculmemis)).toBe('unk');
  });

  it('filo sayaçları toplanmaz: açık ile ölçüm boşluğu iki ayrı metrik', () => {
    const filo = filoOzeti([
      santral({ id: 'a', varlikKatmani: {
        kaynakBagli: true,
        yedeksiz: [eksik('PLC-1', 'hepsi başarısız', 2)],
        bilinmeyen: [], yedegiVar: 1, toplamKritik: 2 } }),
      santral({ id: 'b', varlikKatmani: {
        kaynakBagli: false, yedeksiz: [],
        bilinmeyen: [eksik('PLC-2', 'ölçülmedi', 0), eksik('PLC-3', 'ölçülmedi', 0)],
        yedegiVar: 0, toplamKritik: 2 } }),
    ]);
    expect(filo.kritikYedeksiz).toBe(1);
    expect(filo.kritikBilinmeyen).toBe(2);
    // Tek sayıya indirgenmiş bir "3 sorunlu varlık" YOK.
    expect(filo.kritikToplam).toBe(4);
  });

  it('"test yok" ile "test başarısız" farklı hücre metni ve farklı renk taşır', () => {
    const testYok = santral({ santralKatmani: {
      bagli: true, gerekce: 'x', politikaAdi: 'p', sonKosu: null, sonRestoreTesti: null } });
    const basarisiz = santral({ santralKatmani: {
      bagli: true, gerekce: 'x', politikaAdi: 'p',
      sonKosu: null,
      sonRestoreTesti: { zaman: new Date().toISOString(), sonuc: 'basarisiz', sureDk: 10 } } });

    expect(testHucresi(testYok).yazi).toBe('test yok');
    expect(testHucresi(testYok).renk).toBe('bd');
    expect(testHucresi(basarisiz).yazi).toMatch(/başarısız/);
    expect(testHucresi(basarisiz).renk).toBe('md');
    expect(testHucresi(testYok).yazi).not.toBe(testHucresi(basarisiz).yazi);
  });
});

describe('§18 · Yedek doğrulama ve son bilinen iyi — insan kararı', () => {
  it('BAŞARISIZ yedek doğrulanmış sayılamaz ve "son bilinen iyi" olamaz', async () => {
    const hedef = v(4);
    const kotu = await yedekEkle(hedef.id, { gun: 1, basarili: false, hata: 'FTP bağlantısı reddedildi' });

    const d = await yedegiDogrula({ yedekId: kotu.id, dogrulandi: true });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.hata).toMatch(/[Bb]aşarısız/);

    const i = await sonBilinenIyiIsaretle({ yedekId: kotu.id });
    expect(i.ok).toBe(false);

    // Veri GERÇEKTEN değişmedi.
    const sonra = await db.konfigurasyonYedegi.findUniqueOrThrow({ where: { id: kotu.id } });
    expect(sonra.dogrulandi).toBe(false);
    expect(sonra.sonBilinenIyi).toBe(false);
  });

  it('doğrulama izi kim/ne zaman/ne karar bırakır; geri alma damgayı düşürür', async () => {
    const hedef = v(4);
    const iyiYedek = await yedekEkle(hedef.id, { gun: 2, basarili: true });

    expect(await yedegiDogrula({
      yedekId: iyiYedek.id, dogrulandi: true,
      gerekce: 'Yedek dosyası açıldı, proje ağacı okundu',
    })).toEqual({ ok: true });

    const dogrulanmis = await db.konfigurasyonYedegi.findUniqueOrThrow({ where: { id: iyiYedek.id } });
    expect(dogrulanmis.dogrulandi).toBe(true);
    expect(dogrulanmis.dogrulamaZamani).not.toBeNull();

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'KonfigurasyonYedegi', varlikId: iyiYedek.id, alan: 'dogrulandi' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.aktorId).toBe(sahteKullanici.id);
    expect(iz?.yeniDeger).toBe('true');
    expect(iz?.gerekce).toMatch(/proje ağacı/);

    // Geri alındığında damga DÜŞER: doğrulanmamış yedek "doğrulandı" görünmez.
    expect(await yedegiDogrula({ yedekId: iyiYedek.id, dogrulandi: false })).toEqual({ ok: true });
    const geri = await db.konfigurasyonYedegi.findUniqueOrThrow({ where: { id: iyiYedek.id } });
    expect(geri.dogrulandi).toBe(false);
    expect(geri.dogrulamaZamani).toBeNull();
  });

  it('"son bilinen iyi" varlıkta TEK kalır — işaret tek işlemde taşınır', async () => {
    const hedef = v(5);
    const eski = await yedekEkle(hedef.id, { gun: 30, basarili: true, surum: 'v1' });
    const yeni = await yedekEkle(hedef.id, { gun: 2, basarili: true, surum: 'v2' });

    expect(await sonBilinenIyiIsaretle({ yedekId: eski.id })).toEqual({ ok: true });
    expect(await sonBilinenIyiIsaretle({
      yedekId: yeni.id, gerekce: 'v2 sahada doğrulandı' })).toEqual({ ok: true });

    const isaretliler = await db.konfigurasyonYedegi.findMany({
      where: { varlikId: hedef.id, sonBilinenIyi: true } });
    expect(isaretliler).toHaveLength(1);
    expect(isaretliler[0].id).toBe(yeni.id);

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'KonfigurasyonYedegi', varlikId: yeni.id, alan: 'sonBilinenIyi' },
    });
    expect(iz?.oncekiDeger).not.toBeNull();   // taşındığı yer izde yazılı
    expect(iz?.gerekce).toMatch(/v2 sahada/);
  });
});

describe('§18 · Veri kalitesi bulgusu — motor kapatamaz, insan gerekçeyle kapatır', () => {
  async function bulguAc(kural: string) {
    return db.veriKalitesiBulgusu.create({ data: {
      kural, kaynakTipi: 'Varlik', kaynakId: v(0).id,
      aciklama: 'Test bulgusu', durum: 'acik' } });
  }

  it('gerekçesiz kapatma reddedilir; bulgu AÇIK kalır', async () => {
    const b = await bulguAc(YEDEK_KURALLARI.yok);
    const sonuc = await yedekBulgusunuIsle({
      bulguId: b.id, karar: 'yok_sayildi', gerekce: '   ' });
    expect(sonuc.ok).toBe(false);
    expect((await db.veriKalitesiBulgusu.findUniqueOrThrow({ where: { id: b.id } })).durum)
      .toBe('acik');
  });

  it('yedek dışı bir bulgu bu eylemle işlenemez', async () => {
    const b = await bulguAc('sahipsiz_varlik');
    const sonuc = await yedekBulgusunuIsle({
      bulguId: b.id, karar: 'cozuldu', gerekce: 'Sahip atandı' });
    expect(sonuc.ok).toBe(false);
    expect((await db.veriKalitesiBulgusu.findUniqueOrThrow({ where: { id: b.id } })).durum)
      .toBe('acik');
  });

  it('gerekçeli "yok sayma" kararı kapanışı ve izi birlikte yazar', async () => {
    const b = await bulguAc(YEDEK_KURALLARI.bilinmiyor);
    expect(await yedekBulgusunuIsle({
      bulguId: b.id, karar: 'yok_sayildi',
      gerekce: 'Varlık hurdaya ayrıldı, envanterden düşecek',
    })).toEqual({ ok: true });

    const kapali = await db.veriKalitesiBulgusu.findUniqueOrThrow({ where: { id: b.id } });
    expect(kapali.durum).toBe('yok_sayildi');
    expect(kapali.kapanis).not.toBeNull();

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'VeriKalitesiBulgusu', varlikId: b.id } });
    expect(iz?.aktorId).toBe(sahteKullanici.id);
    expect(iz?.gerekce).toMatch(/hurdaya/);

    // Kapalı bulgu ikinci kez işlenemez.
    const tekrar = await yedekBulgusunuIsle({
      bulguId: b.id, karar: 'cozuldu', gerekce: 'yeniden' });
    expect(tekrar.ok).toBe(false);
  });
});

describe('§18 · Çekmece okuma yüzeyi — kapsam ve bilinmeyen', () => {
  it('kapsam dışı varlığın yedek detayı OKUNAMAZ', async () => {
    const hedef = await db.varlik.findFirstOrThrow({
      where: { silindi: null, tesisId: { not: null } },
      select: { id: true, tesisId: true },
    });
    const baskaTesis = await db.tesis.findFirstOrThrow({
      where: { id: { not: hedef.tesisId as string } }, select: { id: true } });

    kapsamKisiti = baskaTesis.id;
    try {
      const sonuc = await varlikYedekDurumu(hedef.id);
      expect(sonuc.ok).toBe(false);
      if (!sonuc.ok) expect(sonuc.hata).toMatch(/kapsam/i);
    } finally {
      kapsamKisiti = null;
    }

    // Kapsam içinde AYNI çağrı okunur — test "her şeyi reddet" ölçmüyor.
    const izinli = await varlikYedekDurumu(hedef.id);
    expect(izinli.ok).toBe(true);
  });

  it('hiç kaydı olmayan varlık "yedek yok" değil "ölçülmedi" döner', async () => {
    const bos = await db.varlik.findFirstOrThrow({
      where: { silindi: null, konfigYedekleri: { none: {} } },
      select: { id: true },
    });
    const sonuc = await varlikYedekDurumu(bos.id);
    expect(sonuc.ok).toBe(true);
    if (sonuc.ok) {
      expect(sonuc.veri.varlik.sonuc).toBe('bilinmiyor');
      expect(sonuc.veri.varlik.sonuc).not.toBe('yok');
      expect(sonuc.veri.iyi.sonuc).toBe('bilinmiyor');
      expect(sonuc.veri.kayitlar).toHaveLength(0);
      expect(sonuc.veri.varlik.gerekce).toMatch(/ÖLÇÜLMEDİĞİ|ölçülmedi/i);
    }
  });
});
