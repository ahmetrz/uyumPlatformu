import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-ist-'));
const testDb = path.join(dizin, 't.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { sonTarihleriIsle } = await import('@/lib/motorlar/sonTarih');

describe('İstisna / waiver yaşam döngüsü (§50)', () => {
  it('onaylı istisna maddeyi kapsam dışına alır; süre dolunca yeniden değerlendirme açılır [UYU-IST-002]', async () => {
    const durum = await db.maddeDurumu.findFirstOrThrow({
      where: { durum: 'uyumlu' }, include: { madde: true } });

    // onay yan etkisinin veri kuralları (gorev.ts onayYanEtkisi ile birebir)
    const istisna = await db.istisna.create({ data: {
      maddeId: durum.maddeId, tesisId: durum.tesisId,
      gerekce: 'Donanım değişimi bekleniyor; geçici muafiyet.',
      bitis: new Date(Date.now() - 3_600_000), // test için: süresi zaten geçmiş
      durum: 'aktif' } });
    await db.degerlendirmeTarihcesi.create({ data: {
      maddeDurumuId: durum.id, eskiDurum: durum.durum, yeniDurum: 'kapsamdisi',
      gerekce: 'İstisna onayı (test)' } });
    await db.maddeDurumu.update({ where: { id: durum.id }, data: { durum: 'kapsamdisi' } });

    // deadline motoru: süresi dolan istisna → yeniden değerlendirme
    await sonTarihleriIsle();

    expect((await db.istisna.findUniqueOrThrow({ where: { id: istisna.id } })).durum)
      .toBe('suresi_doldu');
    const yeniDurum = await db.maddeDurumu.findUniqueOrThrow({ where: { id: durum.id } });
    expect(yeniDurum.durum).toBe('degerlendirilmedi'); // uyumlu'ya GERİ DÖNMEZ — insan yeniden değerlendirir
    // tarihçe iki geçişi de tutuyor
    const tarihce = await db.degerlendirmeTarihcesi.findMany({
      where: { maddeDurumuId: durum.id }, orderBy: { zaman: 'asc' } });
    expect(tarihce.map((t) => t.yeniDurum)).toContain('kapsamdisi');
    expect(tarihce[tarihce.length - 1].yeniDurum).toBe('degerlendirilmedi');
    // yeniden değerlendirme görevi açıldı
    expect(await db.gorev.count({ where: {
      kaynakTipi: 'MaddeDurumu', kaynakId: durum.id, durum: 'acik' } })).toBeGreaterThan(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ONAY YAN ETKİSİ — atomiklik (denetim bulgusu #16)

   Yukarıdaki test yan etkinin VERİ kurallarını elle kuruyor. Buradan
   aşağısı üretim eylemini (`lib/eylemler2/gorev.ts` → `onayKarar`) çağırır
   ve ölçtüğü şey sonuç değil GERİ ALMADIR: yan etkinin ortasında kontrollü
   bir yazma arızası üretilir, veritabanı ÖNCE/SONRA karşılaştırılır.

   Kusur şuydu: `onayKarar` sahiplenmeyi atomik yapmıştı ama yan etki
   (`onayYanEtkisi`) transaction DIŞINDAYDI — istisna `aktif` yazılıyor,
   sonra N adet `MaddeDurumu` tek tek `kapsamdisi`'ye çekiliyordu. Ortada
   patlarsa istisna AKTİF görünürken maddelerin bir kısmı kapsam İÇİNDE
   kalıyor ve uyum yüzdesi yanlış hesaplanıyordu — üstelik yarım kalmışlık
   hiçbir yerde yazmıyordu.

   ARIZA ENJEKSİYONU üretim koduna dokunmadan, geçici bir SQLite
   tetikleyicisiyle yapılır (aynı mekanizma üründe de var: denetim izi
   değişmezliği, migration 20260830190000). */

import { beforeAll } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';

const { oturumCereziAyarla } = await import('./sahte/next-headers');
const { onayKarar } = await import('@/lib/eylemler2/gorev');

const ONEK = `IST-${Date.now().toString(36).toUpperCase()}`;
const kimlik = { onaylayan: '', talepEden: '' };

async function arizaKur(ad: string, tablo: string, kosul: string): Promise<void> {
  await db.$executeRawUnsafe(
    `CREATE TRIGGER ${ad} BEFORE INSERT ON "${tablo}" WHEN ${kosul} `
    + `BEGIN SELECT RAISE(ABORT, 'disk doldu'); END;`);
}
async function arizaKaldir(ad: string): Promise<void> {
  await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${ad};`);
}

beforeAll(async () => {
  const onaylayan = await db.kullanici.create({ data: {
    adSoyad: 'İstisna Onaylayan', eposta: `${ONEK}-onay@ornek.test`, aktif: true,
    yetkiler: { create: [{ rol: 'yonetici', modul: null }] } } });
  const talepEden = await db.kullanici.create({ data: {
    adSoyad: 'İstisna Talep Eden', eposta: `${ONEK}-talep@ornek.test`, aktif: true } });
  kimlik.onaylayan = onaylayan.id;
  kimlik.talepEden = talepEden.id;
  // gerçek oturum — sahte AktifKullanici enjekte edilmiyor
  const jeton = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: onaylayan.id, tokenHash: createHash('sha256').update(jeton).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  oturumCereziAyarla(jeton);
});

/** Bir madde + bir tesis + `surecSayisi` adet açık değerlendirme, bekleyen
    istisna ve onay talebi kurar. `surecSayisi` yan etkinin döngü genişliğidir. */
async function istisnaKur(etiket: string, surecSayisi: number) {
  const reg = await db.regulasyon.create({
    data: { kod: `${ONEK}-${etiket}`, ad: `İstisna testi ${etiket}` } });
  const madde = await db.madde.create({ data: {
    regulasyonId: reg.id, kod: `${ONEK}-${etiket}-M1`,
    baslik: 'Test maddesi', metin: 'Test metni' } });
  const tesis = await db.tesis.create({
    data: { kod: `${ONEK}-${etiket}-T`, ad: 'İstisna tesisi' } });
  const durumIdler: string[] = [];
  for (let i = 0; i < surecSayisi; i += 1) {
    const surec = await db.uyumSureci.create({ data: {
      kod: `${ONEK}-${etiket}-S${i}`, ad: `Süreç ${i}`, regulasyonId: reg.id, durum: 'aktif' } });
    const d = await db.maddeDurumu.create({ data: {
      surecId: surec.id, maddeId: madde.id, tesisId: tesis.id, durum: 'uyumlu' } });
    durumIdler.push(d.id);
  }
  const istisna = await db.istisna.create({ data: {
    maddeId: madde.id, tesisId: tesis.id, durum: 'onay_bekliyor',
    gerekce: 'Donanım değişimi bekleniyor; geçici muafiyet.',
    bitis: new Date(Date.now() + 30 * 86_400_000) } });
  const talep = await db.onayTalebi.create({ data: {
    tip: 'istisna', kaynakTipi: 'Istisna', kaynakId: istisna.id,
    ozet: `${etiket} istisna talebi`, talepEdenId: kimlik.talepEden, durum: 'bekliyor' } });
  return { istisna, talep, durumIdler };
}

async function yanEtkiSayimlari(istisnaId: string, talepId: string, durumIdler: string[]) {
  return {
    istisnaDurumu: (await db.istisna.findUniqueOrThrow({ where: { id: istisnaId } })).durum,
    talepDurumu: (await db.onayTalebi.findUniqueOrThrow({ where: { id: talepId } })).durum,
    kapsamdisi: await db.maddeDurumu.count({
      where: { id: { in: durumIdler }, durum: 'kapsamdisi' } }),
    tarihce: await db.degerlendirmeTarihcesi.count({
      where: { maddeDurumuId: { in: durumIdler } } }),
    durumIzi: await db.aktiviteKaydi.count({
      where: { varlikTipi: 'MaddeDurumu', varlikId: { in: durumIdler } } }),
    talepIzi: await db.aktiviteKaydi.count({
      where: { varlikTipi: 'OnayTalebi', varlikId: talepId } }),
  };
}

describe('Onay yan etkisi tek transaction (#16)', () => {
  it('yan etki ortada patlarsa SAHİPLENME DE geri alınır — istisna aktif kalmaz', async () => {
    const { istisna, talep, durumIdler } = await istisnaKur('YARIM', 3);
    const once = await yanEtkiSayimlari(istisna.id, talep.id, durumIdler);
    expect(once).toEqual({ istisnaDurumu: 'onay_bekliyor', talepDurumu: 'bekliyor',
      kapsamdisi: 0, tarihce: 0, durumIzi: 0, talepIzi: 0 });

    // tarihçe yazımında patlat: istisna 'aktif' yazıldıktan SONRAKİ adım
    await arizaKur('test_tarihce_patlat', 'DegerlendirmeTarihcesi',
      "NEW.yeniDurum = 'kapsamdisi'");
    let sonuc;
    try { sonuc = await onayKarar({ id: talep.id, karar: 'onaylandi', gerekce: 'onay' }); }
    finally { await arizaKaldir('test_tarihce_patlat'); }

    expect(sonuc.ok).toBe(false);
    /* ÖNCE/SONRA birebir aynı. Eski kodda burada istisna 'aktif',
       talep 'onaylandi' ve talep izi 1 olurdu — yani "onaylanmış istisna"
       ile "hâlâ kapsam içindeki maddeler" yan yana kalırdı. */
    expect(await yanEtkiSayimlari(istisna.id, talep.id, durumIdler)).toEqual(once);
  });

  it('başarılı onayda istisna + N durum + N tarihçe + N iz BİRLİKTE yazılır', async () => {
    const { istisna, talep, durumIdler } = await istisnaKur('TAMAM', 3);
    expect((await onayKarar({ id: talep.id, karar: 'onaylandi', gerekce: 'onay' })).ok).toBe(true);
    expect(await yanEtkiSayimlari(istisna.id, talep.id, durumIdler)).toEqual({
      istisnaDurumu: 'aktif', talepDurumu: 'onaylandi',
      kapsamdisi: 3, tarihce: 3, durumIzi: 3, talepIzi: 1 });
    // iz satırları toplu yazıldı ama İÇERİK aynı kaldı
    const izler = await db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'MaddeDurumu', varlikId: { in: durumIdler } } });
    expect(izler.every((i) => i.eylem === 'durum_degisimi' && i.alan === 'durum'
      && i.oncekiDeger === 'uyumlu' && i.yeniDeger === 'kapsamdisi'
      && i.aktorId === kimlik.onaylayan
      && (i.gerekce ?? '').includes(istisna.id))).toBe(true);
    // zaten 'kapsamdisi' olan satır ikinci kez tarihçeye yazılmaz
    expect(await db.degerlendirmeTarihcesi.count({
      where: { maddeDurumuId: { in: durumIdler } } })).toBe(3);
  });

  it('red kararında istisna reddedilir, madde durumlarına DOKUNULMAZ', async () => {
    const { istisna, talep, durumIdler } = await istisnaKur('RED', 2);
    expect((await onayKarar({
      id: talep.id, karar: 'reddedildi', gerekce: 'gerekçe yetersiz' })).ok).toBe(true);
    expect(await yanEtkiSayimlari(istisna.id, talep.id, durumIdler)).toEqual({
      istisnaDurumu: 'reddedildi', talepDurumu: 'reddedildi',
      kapsamdisi: 0, tarihce: 0, durumIzi: 0, talepIzi: 1 });
  });

  it('sahiplenmeyi kaybeden çağrı yan etkiyi HİÇ çalıştırmaz', async () => {
    const { istisna, talep, durumIdler } = await istisnaKur('IKINCI', 2);
    expect((await onayKarar({ id: talep.id, karar: 'onaylandi', gerekce: 'ilk' })).ok).toBe(true);
    const ilkSonrasi = await yanEtkiSayimlari(istisna.id, talep.id, durumIdler);

    const ikinci = await onayKarar({ id: talep.id, karar: 'reddedildi', gerekce: 'ikinci' });
    expect(ikinci.ok).toBe(false);
    // ikinci çağrı ne istisnayı reddetti ne yeni tarihçe/iz yazdı
    expect(await yanEtkiSayimlari(istisna.id, talep.id, durumIdler)).toEqual(ilkSonrasi);
  });
});
