import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yedek-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const {
  yedekVarMi, sonYedekYasi, konfigurasyonDegistiMi, sonBilinenIyi,
  kritikVarliklardaEksikYedek, yedekKontrolBagi, yedekMetadataYaz,
  yedekKaynagiBagliMi, YEDEK_VARLIK_TIPI,
} = await import('@/lib/entegrasyon/konfigYedek');
const { yedekDogrulamayiIsle, YEDEK_KURALLARI, KOSU_KAYNAGI } =
  await import('@/lib/motorlar/yedekDogrulama');

const GUN = 86_400_000;

/** Testin kullanacağı kritik varlıklar — seed'den gelir, yaratılmaz. */
let varliklar: { id: string; etiket: string; tesisId: string | null }[] = [];
const v = (i: number) => varliklar[i];

async function yedekEkle(varlikId: string, o: {
  gun: number; basarili?: boolean; hash?: string | null;
  surum?: string | null; iyi?: boolean; dogrulandi?: boolean; hata?: string | null;
}) {
  return db.konfigurasyonYedegi.create({ data: {
    varlikId,
    kaynakSistem: 'test-backup',
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
