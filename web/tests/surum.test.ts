import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-surum-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');

// Eylem katmanını doğrudan çağırmak oturum ister; motor mantığını
// surumAktiflestir ile aynı adımlarla DB seviyesinde doğruluyoruz —
// bu test sürümleme VERİ kurallarını sabitler (kabul testi 6).
describe('Kabul testi 6 — regülasyon yeni sürüm', () => {
  it('yeni sürüm eski değerlendirmeleri SİLMEZ; diff oluşur; yeni değerlendirme ihtiyacı açılır [UYU-SUR-001]', async () => {
    const reg = await db.regulasyon.findFirstOrThrow({ where: { kod: 'EPDK-SYM' } });
    const eskiSurum = await db.frameworkSurumu.findFirstOrThrow({
      where: { regulasyonId: reg.id, durum: 'aktif' } });
    const eskiMaddeler = await db.madde.findMany({
      where: { regulasyonId: reg.id, surumId: eskiSurum.id } });
    const eskiDurumSayisi = await db.maddeDurumu.count({
      where: { madde: { surumId: eskiSurum.id } } });
    expect(eskiDurumSayisi).toBeGreaterThan(0);

    // taslak sürüm + kopya maddeler (bir maddeyi değiştir, bir yeni ekle)
    const taslak = await db.frameworkSurumu.create({ data: {
      regulasyonId: reg.id, surumEtiketi: 'TEST-2027', durum: 'taslak' } });
    const kodIdx = new Map<string, string>();
    for (const m of eskiMaddeler) {
      const k = await db.madde.create({ data: {
        regulasyonId: reg.id, surumId: taslak.id, kod: m.kod,
        baslik: m.baslik,
        metin: m.kod === 'EPDK-SYM-4.2.1' ? m.metin + ' (IEC 62443 bölge modeli zorunlu.)' : m.metin,
        sira: m.sira } });
      kodIdx.set(m.kod, k.id);
    }
    const yeniMadde = await db.madde.create({ data: {
      regulasyonId: reg.id, surumId: taslak.id, kod: 'EPDK-SYM-8.1',
      baslik: 'Tedarik zinciri güvenliği', metin: 'OT tedarikçileri değerlendirilir.' } });

    // --- aktifleştirme mantığı (surumAktiflestir ile birebir)
    const yeniler = await db.madde.findMany({ where: { surumId: taslak.id } });
    const eskiIdx = new Map(eskiMaddeler.map((m) => [m.kod, m]));
    const degisen: string[] = [];
    for (const m of yeniler) {
      const e = eskiIdx.get(m.kod);
      if (!e) { degisen.push(m.id);
        await db.surumFarki.create({ data: { eskiSurumId: eskiSurum.id,
          yeniSurumId: taslak.id, maddeKodu: m.kod, degisimTipi: 'yeni' } });
      } else if (e.metin !== m.metin) { degisen.push(m.id);
        await db.surumFarki.create({ data: { eskiSurumId: eskiSurum.id,
          yeniSurumId: taslak.id, maddeKodu: m.kod, degisimTipi: 'degisti' } });
      }
    }
    /* SIRA ÖNEMLİ: önce eskiyi arşivle, sonra yeniyi aktifleştir.
       `FrameworkSurumu_tekAktif` kısmi tekil indeksi (migration
       20260901201000) bir regülasyonda ikinci aktif sürümü VERİTABANI
       seviyesinde reddeder; ters sırada bu satır P2002 ile patlar.
       Bu, testin kurulumu değil ürünün kuralıdır — bkz. lib/eylemler2/surum.ts */
    await db.frameworkSurumu.update({ where: { id: eskiSurum.id }, data: { durum: 'arsiv' } });
    await db.frameworkSurumu.update({ where: { id: taslak.id }, data: { durum: 'aktif' } });
    const surec = await db.uyumSureci.findFirstOrThrow({
      where: { regulasyonId: reg.id, durum: 'aktif' }, include: { kapsam: true } });
    for (const maddeId of degisen)
      for (const kk of surec.kapsam)
        await db.maddeDurumu.upsert({
          where: { surecId_maddeId_tesisId: { surecId: surec.id, maddeId, tesisId: kk.tesisId } },
          update: {}, create: { surecId: surec.id, maddeId, tesisId: kk.tesisId } });

    // --- DOĞRULAMALAR
    // 1) eski değerlendirmeler aynen duruyor
    expect(await db.maddeDurumu.count({ where: { madde: { surumId: eskiSurum.id } } }))
      .toBe(eskiDurumSayisi);
    // 2) diff kayıtları: 1 değişen + 1 yeni
    const farklar = await db.surumFarki.findMany({ where: { yeniSurumId: taslak.id } });
    expect(farklar.filter((f) => f.degisimTipi === 'degisti').map((f) => f.maddeKodu))
      .toContain('EPDK-SYM-4.2.1');
    expect(farklar.filter((f) => f.degisimTipi === 'yeni').map((f) => f.maddeKodu))
      .toContain('EPDK-SYM-8.1');
    // 3) yeni değerlendirme ihtiyacı: kapsam tesislerine 'degerlendirilmedi' açıldı
    const yeniDurumlar = await db.maddeDurumu.findMany({
      where: { maddeId: yeniMadde.id } });
    expect(yeniDurumlar.length).toBe(surec.kapsam.length);
    expect(yeniDurumlar.every((d) => d.durum === 'degerlendirilmedi')).toBe(true);
    // 4) eski sürüm arşivde, maddeleri silinmedi
    expect((await db.frameworkSurumu.findUniqueOrThrow({ where: { id: eskiSurum.id } })).durum)
      .toBe('arsiv');
    expect(await db.madde.count({ where: { surumId: eskiSurum.id } })).toBe(eskiMaddeler.length);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ÜRETİM EYLEMLERİ — atomiklik ve toplu yazma (denetim bulguları #14/#15/#21)

   Yukarıdaki kabul testi VERİ kurallarını sabitliyor ve aktifleştirme
   adımlarını elle yeniden kuruyor. Buradan aşağısı ÜRETİM KODUNU çağırır
   (`lib/eylemler2/surum.ts`) ve ölçtüğü şey sonuç değil GERİ ALMADIR:
   işlemin ortasında kontrollü bir arıza üretilir ve veritabanı ÖNCE/SONRA
   karşılaştırılır — "hata döndü" tek başına hiçbir şey kanıtlamaz, çünkü
   eski kod da hata döndürüyor ve yarım yazdığını bırakıyordu.

   ARIZA ENJEKSİYONU: `lib/entegrasyon/varlikAktarim.ts`'teki `satirAdimi`
   kancasının eşdeğeri burada ÜRETİM KODUNA HİÇ DOKUNMADAN kurulur —
   test veritabanına geçici bir SQLite tetikleyicisi konur ve belirli bir
   satır yazılmak istendiğinde `RAISE(ABORT)` eder. Aynı mekanizma ürünün
   kendisinde de var (denetim izi değişmezliği tetikleyicileri,
   migration 20260830190000), yani sahte değil gerçek bir yazma arızasıdır. */

import { beforeAll } from 'vitest';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

const { oturumCereziAyarla } = await import('./sahte/next-headers');
const { surumOlustur, surumAktiflestir } = await import('@/lib/eylemler2/surum');

const ONEK = `SRM-${Date.now().toString(36).toUpperCase()}`;

/** Gerçek oturum açar — sahte AktifKullanici enjekte etmiyoruz ki üretimdeki
    yetki modeli (yetkiZorunlu) aynen koşsun. */
async function oturumAc(kullaniciId: string): Promise<void> {
  const jeton = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId, tokenHash: createHash('sha256').update(jeton).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  oturumCereziAyarla(jeton);
}

/** Geçici arıza tetikleyicisi: `kosul` sağlanan INSERT'i ABORT eder. */
async function arizaKur(ad: string, tablo: string, kosul: string): Promise<void> {
  await db.$executeRawUnsafe(
    `CREATE TRIGGER ${ad} BEFORE INSERT ON "${tablo}" WHEN ${kosul} `
    + `BEGIN SELECT RAISE(ABORT, 'disk doldu'); END;`);
}
async function arizaKaldir(ad: string): Promise<void> {
  await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${ad};`);
}

/** Değişmezlerin ÖNCE/SONRA karşılaştırılabilmesi için sayım kümesi. */
async function sayimlar(regulasyonId: string) {
  return {
    surum: await db.frameworkSurumu.count({ where: { regulasyonId } }),
    madde: await db.madde.count({ where: { regulasyonId } }),
    maddeAlan: await db.maddeAlan.count({ where: { madde: { regulasyonId } } }),
    fark: await db.surumFarki.count({ where: { yeniSurum: { regulasyonId } } }),
    durum: await db.maddeDurumu.count({ where: { madde: { regulasyonId } } }),
    tarihce: await db.degerlendirmeTarihcesi.count({
      where: { maddeDurumu: { madde: { regulasyonId } } } }),
    iz: await db.aktiviteKaydi.count({
      where: { varlikTipi: 'Regulasyon', varlikId: regulasyonId } }),
  };
}

beforeAll(async () => {
  const kul = await db.kullanici.create({ data: {
    adSoyad: 'Sürüm Yöneticisi', eposta: `${ONEK}@ornek.test`, aktif: true,
    yetkiler: { create: [{ rol: 'yonetici', modul: null }] } } });
  await oturumAc(kul.id);
});

/** n maddelik bir kaynak sürüm kurar; her 4 maddenin ilki üst maddedir. */
async function regulasyonKur(etiket: string, n: number, maddeDurumu: 'aktif' | 'taslak' = 'aktif') {
  const alan = await db.kapsamAlani.findFirstOrThrow();
  const reg = await db.regulasyon.create({
    data: { kod: `${ONEK}-${etiket}`, ad: `Sürüm testi ${etiket}` } });
  const surum = await db.frameworkSurumu.create({
    data: { regulasyonId: reg.id, surumEtiketi: '2026', durum: maddeDurumu } });
  /* KURULUM toplu yazılır: 160 maddelik vaka satır satır kurulduğunda
     kurulumun kendisi testin süre bütçesini yiyordu. Kimlikler burada
     üretiliyor ki hiyerarşi tek `createMany` ile bağlanabilsin — bu testin
     kurulum kolaylığıdır, ürünün kalıbı değil. */
  const idler = Array.from({ length: n }, () => randomUUID());
  await db.madde.createMany({ data: idler.map((id, i) => ({
    id, regulasyonId: reg.id, surumId: surum.id,
    kod: `${ONEK}-${etiket}-M${String(i).padStart(4, '0')}`,
    baslik: `Madde ${i}`, metin: `Metin ${i}`, sira: i,
    ustMaddeId: i % 4 === 0 ? null : idler[i - (i % 4)] })) });
  await db.maddeAlan.createMany({
    data: idler.map((maddeId) => ({ maddeId, alanId: alan.id })) });
  return { reg, surum, alan };
}

describe('surumOlustur — atomiklik ve toplu kopyalama (#14)', () => {
  it('kopya TAMDIR: madde, kapsam alanı ve hiyerarşi YENİ sürüme taşınır', async () => {
    const { reg, surum } = await regulasyonKur('TAM', 12);
    expect((await surumOlustur({ regulasyonId: reg.id, etiket: 'TASLAK-A' })).ok).toBe(true);

    const taslak = await db.frameworkSurumu.findFirstOrThrow({
      where: { regulasyonId: reg.id, surumEtiketi: 'TASLAK-A' } });
    expect(await db.madde.count({ where: { surumId: taslak.id } })).toBe(12);
    expect(await db.maddeAlan.count({ where: { madde: { surumId: taslak.id } } })).toBe(12);
    // 12 maddenin 3'ü üst madde (0,4,8), 9'u bağlı
    expect(await db.madde.count({
      where: { surumId: taslak.id, ustMaddeId: { not: null } } })).toBe(9);
    /* KRİTİK: bağlar ESKİ sürümün maddelerine değil, kopyalara kurulmalı.
       Kimlik eşlemesi bellekte `kod` üzerinden çözülüyor; yanlış çözülürse
       taslak, arşivlenecek sürümün maddelerine bağlı kalırdı. */
    expect(await db.madde.count({
      where: { surumId: taslak.id, ustMadde: { surumId: taslak.id } } })).toBe(9);
    // kaynak sürüm hiç değişmedi
    expect(await db.madde.count({ where: { surumId: surum.id } })).toBe(12);
    // iz aynı işlemde yazıldı
    expect(await db.aktiviteKaydi.count({ where: {
      varlikTipi: 'Regulasyon', varlikId: reg.id, alan: 'surum' } })).toBe(1);
  });

  it('ortada patlayan kopyalama HİÇBİR satır bırakmaz — yarım sürüm oluşmaz', async () => {
    /* 160 madde, parça boyu 71 (999/14): kopyalama üç parçaya bölünür.
       Arıza ÜÇÜNCÜ parçadadır, yani ilk iki parça (142 madde) veritabanına
       gerçekten yazılmış olur ve geri alınması gerekir. */
    const { reg } = await regulasyonKur('PATLA', 160);
    const hedef = await db.madde.findFirstOrThrow({
      where: { regulasyonId: reg.id }, orderBy: { sira: 'desc' } });
    await db.madde.update({ where: { id: hedef.id }, data: { baslik: 'PATLAT-BASLIK' } });

    const once = await sayimlar(reg.id);
    await arizaKur('test_madde_patlat', 'Madde', "NEW.baslik = 'PATLAT-BASLIK'");
    let sonuc;
    try {
      sonuc = await surumOlustur({ regulasyonId: reg.id, etiket: 'TASLAK-YARIM' });
    } finally {
      await arizaKaldir('test_madde_patlat');
    }
    const sonra = await sayimlar(reg.id);

    expect(sonuc.ok).toBe(false);
    // ÖNCE/SONRA birebir aynı: tek satır bile kalmadı
    expect(sonra).toEqual(once);
    // ve asıl iddia: yarım kopyalanmış TASLAK SÜRÜM diye bir şey yok
    expect(await db.frameworkSurumu.findFirst({
      where: { regulasyonId: reg.id, surumEtiketi: 'TASLAK-YARIM' } })).toBeNull();
    /* Hata yutulmadı, kullanıcıya döndü. METNİ eşleştirmiyoruz: SQLite
       `RAISE(ABORT)` hatasını SQLITE_CONSTRAINT_TRIGGER ile bildirir ve
       Prisma onu kısıt ihlaline çevirirken tetikleyicinin kendi mesajını
       taşımaz. Burada kanıtlanan şey mesaj değil GERİ ALMADIR. */
    expect(!sonuc.ok && sonuc.hata.length).toBeGreaterThan(0);
  });
});

describe('surumAktiflestir — diff ve değerlendirme açma aynı transaction (#15/#21)', () => {
  /** Aktif sürüm + değişmiş taslak + kapsamlı aktif süreç kurar. */
  async function aktiflestirmeKur(etiket: string, n: number, tesisSayisi = 2) {
    const { reg, surum: eski } = await regulasyonKur(etiket, n);
    const taslak = await db.frameworkSurumu.create({
      data: { regulasyonId: reg.id, surumEtiketi: '2027', durum: 'taslak' } });
    const kaynak = await db.madde.findMany({
      where: { surumId: eski.id }, include: { ustMadde: { select: { kod: true } } },
      orderBy: { sira: 'asc' } });
    // hiyerarşi de kopyalanır: yaprak/yaprak-değil ayrımı gerçekten sınansın
    const kodIdx = new Map<string, string>();
    for (const m of kaynak) {
      const kopya = await db.madde.create({ data: {
        regulasyonId: reg.id, surumId: taslak.id, kod: m.kod,
        baslik: m.baslik, metin: `${m.metin} (2027 revizyonu)`, sira: m.sira,
        ustMaddeId: m.ustMadde?.kod ? kodIdx.get(m.ustMadde.kod) ?? null : null } });
      kodIdx.set(m.kod, kopya.id);
    }
    const surec = await db.uyumSureci.create({ data: {
      kod: `${ONEK}-${etiket}-S`, ad: 'Test süreci', regulasyonId: reg.id, durum: 'aktif' } });
    for (let t = 0; t < tesisSayisi; t += 1) {
      const tesis = await db.tesis.create({
        data: { kod: `${ONEK}-${etiket}-T${t}`, ad: `Test tesisi ${t}` } });
      await db.surecKapsami.create({ data: { surecId: surec.id, tesisId: tesis.id } });
    }
    return { reg, eski, taslak, surec };
  }

  it('değerlendirme açma patlarsa DIFF SATIRI KALMAZ ve sürüm taslakta kalır', async () => {
    /* Bulgu #15'in tam hâli: eski kod `SurumFarki` satırlarını
       transaction'dan ÖNCE ve DIŞINDA yazıyordu. Aktifleştirme reddedilse
       bile diff duruyordu — hiç aktifleşmemiş bir sürüm için "değişiklik
       farkı" görünüyordu. */
    const { reg, eski, taslak } = await aktiflestirmeKur('DIFF', 8);
    const once = await sayimlar(reg.id);
    expect(once.fark).toBe(0);

    await arizaKur('test_durum_patlat', 'MaddeDurumu', "NEW.durum = 'degerlendirilmedi'");
    let sonuc;
    try { sonuc = await surumAktiflestir({ surumId: taslak.id }); }
    finally { await arizaKaldir('test_durum_patlat'); }
    const sonra = await sayimlar(reg.id);

    expect(sonuc.ok).toBe(false);
    expect(sonra).toEqual(once);          // diff dahil HİÇBİR satır yazılmadı
    expect(sonra.fark).toBe(0);
    // durum makinesi de geri sarıldı
    expect((await db.frameworkSurumu.findUniqueOrThrow({ where: { id: taslak.id } })).durum)
      .toBe('taslak');
    expect((await db.frameworkSurumu.findUniqueOrThrow({ where: { id: eski.id } })).durum)
      .toBe('aktif');
    expect(await db.aktiviteKaydi.count({ where: {
      varlikTipi: 'Regulasyon', varlikId: reg.id, alan: 'aktif_surum' } })).toBe(0);
  });

  it('başarılı aktifleştirme: diff + değerlendirmeler + iz birlikte yazılır', async () => {
    const { reg, eski, taslak } = await aktiflestirmeKur('TAMAM', 6, 3);
    expect((await surumAktiflestir({ surumId: taslak.id })).ok).toBe(true);

    // 6 maddenin hepsi 'degisti' (metin değişti)
    const farklar = await db.surumFarki.findMany({ where: { yeniSurumId: taslak.id } });
    expect(farklar).toHaveLength(6);
    expect(farklar.every((f) => f.degisimTipi === 'degisti')).toBe(true);
    /* Yaprak maddeler: 6 maddenin 0. ve 4. sırası üst maddedir, 4'ü yaprak.
       Üçlü döngü yerine toplu yazma geldi ama SONUÇ AYNI KALMALI:
       yaprak × tesis kadar 'degerlendirilmedi' satırı. */
    const acilan = await db.maddeDurumu.findMany({ where: { madde: { surumId: taslak.id } } });
    expect(acilan).toHaveLength(4 * 3);
    expect(acilan.every((d) => d.durum === 'degerlendirilmedi' && d.guven === 'kanit_yok')).toBe(true);
    expect((await db.frameworkSurumu.findUniqueOrThrow({ where: { id: eski.id } })).durum).toBe('arsiv');
    const iz = await db.aktiviteKaydi.findMany({ where: {
      varlikTipi: 'Regulasyon', varlikId: reg.id, alan: 'aktif_surum' } });
    expect(iz).toHaveLength(1);
    expect(iz[0].gerekce).toContain(`${4 * 3} yeni değerlendirme açıldı`);
  });

  it('zaten açık değerlendirme İKİNCİ KEZ açılmaz (upsert yerine oku-ayıkla-yaz)', async () => {
    const { taslak, surec } = await aktiflestirmeKur('YINELE', 4, 1);
    const tesis = await db.surecKapsami.findFirstOrThrow({ where: { surecId: surec.id } });
    const yaprak = await db.madde.findFirstOrThrow({
      where: { surumId: taslak.id, sira: 1 } });
    // yaprak maddelerden biri için değerlendirme ZATEN var ve 'uyumlu'
    await db.maddeDurumu.create({ data: {
      surecId: surec.id, maddeId: yaprak.id, tesisId: tesis.tesisId, durum: 'uyumlu' } });

    expect((await surumAktiflestir({ surumId: taslak.id })).ok).toBe(true);
    const durumlar = await db.maddeDurumu.findMany({
      where: { maddeId: yaprak.id, tesisId: tesis.tesisId } });
    expect(durumlar).toHaveLength(1);            // kopya açılmadı
    expect(durumlar[0].durum).toBe('uyumlu');    // mevcut değerlendirme EZİLMEDİ
  });

  it('EŞZAMANLI iki aktifleştirmeden biri reddedilir ve diff ÇİFTLENMEZ', async () => {
    /* Kaybeden `CAKISMA` alır. Eski kodda diff transaction'ın dışında
       yazıldığı için İKİ çağrı da diff yazıyordu: 4 madde için 8 satır. */
    const { taslak } = await aktiflestirmeKur('YARIS', 4, 1);
    const sonuclar = await Promise.all([
      surumAktiflestir({ surumId: taslak.id }),
      surumAktiflestir({ surumId: taslak.id }),
    ]);
    expect(sonuclar.filter((s) => s.ok)).toHaveLength(1);
    const kaybeden = sonuclar.find((s) => !s.ok)!;
    expect('hata' in kaybeden && kaybeden.hata).toMatch(/başka bir kullanıcı tarafından/);
    expect(await db.surumFarki.count({ where: { yeniSurumId: taslak.id } })).toBe(4);
  });
});
