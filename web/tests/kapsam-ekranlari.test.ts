import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB importlardan ÖNCE ayarlanır (db modülü ilk erişimde okur).
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kapsam-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { izinliTesisIdleri } = await import('@/lib/erisim');
const { modulOkuyabilir } = await import('@/app/kapsam');

const { riskEkranVerisi } = await import('@/app/(kabuk)/(operasyonel)/riskler/veri');
const { riskDetayVerisi } = await import('@/app/(kabuk)/(operasyonel)/riskler/[id]/veri');
const { bulguEkranVerisi } = await import('@/app/(kabuk)/(operasyonel)/bulgular/veri');
const { bulguDetayVerisi } = await import('@/app/(kabuk)/(operasyonel)/bulgular/[id]/veri');
const { kimlikEkranVerisi } = await import('@/app/(kabuk)/(operasyonel)/kimlik/veri');
const { omurEkranVerisi } = await import('@/app/(kabuk)/(operasyonel)/omur/veri');
const { aktiviteVerisi } = await import('@/app/(kabuk)/(operasyonel)/aktivite/veri');
const { varlikAktarimVerisi } = await import('@/app/(kabuk)/(operasyonel)/varlik-aktarim/veri');
const { denetimDetayVerisi } = await import('@/app/(kabuk)/(operasyonel)/denetimler/[id]/veri');
const { reddedilenlerVerisi } =
  await import('@/app/(kabuk)/(operasyonel)/saglik/reddedilenler/veri');
const { portfoyEkranVerisi } = await import('@/app/(tam)/portfoy/veri');
const { genelEkranVerisi } = await import('@/app/(kabuk)/(flagship)/veri');
const { tesis360Verisi } = await import('@/app/(kabuk)/(flagship)/tesisler/[id]/veri');

import type { AktifKullanici } from '@/lib/auth';

/* ═══════════════════════════════════════════════════════════════════════
   SANTRAL KAPSAMI — EKRAN SEVİYESİ NEGATİF TESTLER

   Ürünün yetki modeli `lib/erisim.ts → izinliTesisIdleri(k, modul)`:
     null = kapsam sınırı yok · [] = hiçbir santral · dizi = yalnız o küme.

   Bu dosya SINIRIN YERİNİ ölçer, "her şeyi gizle"yi değil. Her ekran için
   dört ayak birlikte kanıtlanır ve DÖRDÜ DE zorunludur:

     (a) A santraline kısıtlı kullanıcının çıktısında B santralinin id'si,
         kodu ve ayırt edici bir alanı HİÇ geçmiyor — çıktının TAMAMI
         `JSON.stringify` edilip aranır, yalnız satır sayısına bakılmaz.
         Satır sayısı bir sızıntıyı yakalamaz: kayıt gizlenip santral adı
         bir açılırda, bir sayaçta ya da bir bağ kutusunda kalabilir.
     (b) Metrikler/sayaçlar da daraltılmış veriden geliyor — satırı gizleyip
         sayacı gizlememek, sayının kendisini bir sızıntıya çevirir.
     (c) KAPSAMSIZ kullanıcı aynı çağrıda hepsini görüyor — yoksa test
         "her şeyi gizle"yi doğrulardı, sınırı değil.
     (d) Detay rotası kapsam dışı kaydı AÇMIYOR ve varlığını DOĞRULAMIYOR
         (null döner; çağıran `notFound()` der).

   Ayrıca iki eksen ayrı ayrı ölçülür:
     · SANTRAL KAPSAMI — yukarıdaki dört ayak.
     · MODÜL İZNİ      — doğru modülde yetkisi olmayan ama BAŞKA bir modülde
       yetkili bir kullanıcı (yalnız `risk_sahibi`) veriye hiç erişemiyor.
       Yalnız "kapsamı dar kullanıcı az satır görüyor" testi bu boşluğu
       YAKALAMAZ: kapsamsız ama yanlış modülde yetkili biri her şeyi görürdü.

   Ve sınırsız okumaya karşı:
     · satır tavanı (`take`) çalışıyor, sayaçlar KESİLMEMİŞ veriden geliyor,
       kesme ekranda söyleniyor.
   ═══════════════════════════════════════════════════════════════════════ */

const ONEK = 'KEK'; // kapsam-ekran-kanıtı

const kimlik = {
  tesisA: '', tesisB: '',
  riskA: '', riskB: '', riskN: '',
  bulguA: '', bulguB: '',
  varlikA: '', varlikB: '', varlikN: '',
  denetimA: '', denetimB: '', denetimN: '',
  maddeId: '',
};

let kA: AktifKullanici;
let kB: AktifKullanici;
let kGlobal: AktifKullanici;
/** Yalnız `risk` (+`uyum` okuma) yetkisi olan rol — modül kapısının probu. */
let kRiskSahibi: AktifKullanici;

/** AktifKullanici şeklini DB'deki GERÇEK yetki satırlarından kurar. */
async function aktifKullaniciYukle(id: string): Promise<AktifKullanici> {
  const k = await db.kullanici.findUniqueOrThrow({
    where: { id }, include: { yetkiler: true },
  });
  return {
    id: k.id, adSoyad: k.adSoyad, eposta: k.eposta, unvan: k.unvan,
    yetkiler: k.yetkiler.map((y) => ({
      rol: y.rol, surecId: y.surecId, tesisId: y.tesisId,
      tuzelKisiId: y.tuzelKisiId, regulasyonId: y.regulasyonId, modul: y.modul,
    })),
  };
}

/** B santralinin ekranda ASLA görünmemesi gereken izleri: id · kod · ad. */
function bIzleri(): string[] {
  return [kimlik.tesisB, `${ONEK}-B`, 'Kapsam Santral B'];
}

/** Çıktının TAMAMINDA arar — satır, açılır, sayaç, bağ kutusu, ham JSON. */
function icermiyor(veri: unknown, izler: string[]) {
  const metin = JSON.stringify(veri);
  for (const iz of izler) expect(metin).not.toContain(iz);
}

function iceriyor(veri: unknown, izler: string[]) {
  const metin = JSON.stringify(veri);
  for (const iz of izler) expect(metin).toContain(iz);
}

const GUN = 86_400_000;
const gecmis = new Date(Date.now() - 400 * GUN);
const gelecek = new Date(Date.now() + 30 * GUN);

beforeAll(async () => {
  const tip = await db.tesisTipi.create({ data: { kod: `${ONEK}-TIP`, ad: 'Kapsam tipi' } });
  const tesisA = await db.tesis.create({
    data: { kod: `${ONEK}-A`, ad: 'Kapsam Santral A', tipId: tip.id, kuruluGucMw: 11 },
  });
  const tesisB = await db.tesis.create({
    data: { kod: `${ONEK}-B`, ad: 'Kapsam Santral B', tipId: tip.id, kuruluGucMw: 22 },
  });
  kimlik.tesisA = tesisA.id;
  kimlik.tesisB = tesisB.id;

  const tur = await db.varlikTuru.create({
    data: { kod: `${ONEK}-TUR`, ad: 'Kapsam türü', sinif: 'OT' },
  });

  /* Varlıklar — üçü de ÖMÜR SİNYALİ taşır (destek bitmiş), yani ömür
     kuyruğuna girerler. Üçüncüsünün santrali BİLİNMİYOR. */
  const varlikVer = (etiket: string, ad: string, tesisId: string | null) => ({
    etiket, ad, turId: tur.id, tesisId, kritiklik: 'kritik',
    destekBitis: gecmis, eosTarihi: gecmis, eolTarihi: gecmis,
  });
  const vA = await db.varlik.create({
    data: varlikVer(`${ONEK}-A-VARLIK`, 'A varligi', tesisA.id),
  });
  const vB = await db.varlik.create({
    data: varlikVer(`${ONEK}-B-VARLIK`, 'B gizli varlik', tesisB.id),
  });
  const vN = await db.varlik.create({
    data: varlikVer(`${ONEK}-N-VARLIK`, 'Santralsiz varlik', null),
  });
  kimlik.varlikA = vA.id;
  kimlik.varlikB = vB.id;
  kimlik.varlikN = vN.id;

  /* Uyum zinciri: regülasyon → madde → süreç → (santral × madde) durumu. */
  const reg = await db.regulasyon.create({ data: { kod: `${ONEK}-REG`, ad: 'Kapsam regülasyonu' } });
  const madde = await db.madde.create({
    data: {
      regulasyonId: reg.id, kod: `${ONEK}-M1`, baslik: 'Kapsam maddesi', metin: 'metin',
    },
  });
  kimlik.maddeId = madde.id;
  const surec = await db.uyumSureci.create({
    data: {
      kod: `${ONEK}-SUREC`, ad: 'Kapsam süreci', regulasyonId: reg.id, durum: 'aktif',
      kapsam: { create: [{ tesisId: tesisA.id }, { tesisId: tesisB.id }] },
    },
  });
  const mdA = await db.maddeDurumu.create({
    data: { surecId: surec.id, maddeId: madde.id, tesisId: tesisA.id, durum: 'uyumsuz' },
  });
  const mdB = await db.maddeDurumu.create({
    data: { surecId: surec.id, maddeId: madde.id, tesisId: tesisB.id, durum: 'uyumsuz' },
  });

  const bA = await db.bulgu.create({
    data: {
      maddeDurumuId: mdA.id, baslik: `${ONEK} A bulgusu`, aciklama: 'A aciklama.',
      onemDerecesi: 'kritik', durum: 'acik', hedefTarih: gecmis,
    },
  });
  const bB = await db.bulgu.create({
    data: {
      maddeDurumuId: mdB.id, baslik: `${ONEK} B gizli bulgu`, aciklama: 'B aciklama.',
      onemDerecesi: 'kritik', durum: 'acik', hedefTarih: gecmis,
    },
  });
  kimlik.bulguA = bA.id;
  kimlik.bulguB = bB.id;

  /* Riskler. rA KAPSAM İÇİ ama bağlı varlıklarından biri KAPSAM DIŞI:
     satır görünse bile B varlığının etiketi/adı sızmamalı. */
  const rA = await db.risk.create({
    data: {
      kod: `${ONEK}-RSK-A`, baslik: 'A riski', aciklama: 'A risk aciklamasi',
      tesisId: tesisA.id, artikRisk: 20, durum: 'acik', bulguId: bA.id,
      varliklar: { create: [{ varlikId: vA.id }, { varlikId: vB.id }] },
    },
  });
  const rB = await db.risk.create({
    data: {
      kod: `${ONEK}-RSK-B`, baslik: 'B gizli risk', aciklama: 'B risk aciklamasi',
      tesisId: tesisB.id, artikRisk: 21, durum: 'acik', bulguId: bB.id,
      varliklar: { create: [{ varlikId: vB.id }] },
    },
  });
  const rN = await db.risk.create({
    data: {
      kod: `${ONEK}-RSK-N`, baslik: 'Portfoy riski', aciklama: 'santrali bilinmiyor',
      tesisId: null, artikRisk: 9, durum: 'acik',
    },
  });
  kimlik.riskA = rA.id;
  kimlik.riskB = rB.id;
  kimlik.riskN = rN.id;

  /* Kimlik hesapları — üçüncüsünün santrali bilinmiyor. A hesabına KAPSAM
     DIŞI bir varlık için yetki verilmiş: atama satırı kalır, etiketi gitmez. */
  const hA = await db.kimlikHesabi.create({
    data: {
      hesapAdi: `${ONEK}-A-HESAP`, tip: 'servis', tesisId: tesisA.id,
      kaynakSistem: 'KEKAD', ayricalikli: true,
      atamalar: { create: [{ varlikId: vA.id, yetkiSeviyesi: 'yonetici' },
        { varlikId: vB.id, yetkiSeviyesi: 'yonetici' }] },
    },
  });
  await db.kimlikHesabi.create({
    data: {
      hesapAdi: `${ONEK}-B-HESAP`, tip: 'servis', tesisId: tesisB.id,
      kaynakSistem: 'KEKAD', ayricalikli: true,
      atamalar: { create: [{ varlikId: vB.id, yetkiSeviyesi: 'yonetici' }] },
    },
  });
  await db.kimlikHesabi.create({
    data: { hesapAdi: `${ONEK}-N-HESAP`, tip: 'servis', tesisId: null, kaynakSistem: 'KEKAD' },
  });
  expect(hA.id).toBeTruthy();

  /* Denetimler — üçüncüsünün KAPSAM SATIRI YOK (portföy geneli). */
  const dA = await db.denetim.create({
    data: {
      kod: `${ONEK}-DEN-A`, ad: 'A denetimi', tip: 'ic_denetim', surecId: surec.id,
      planBitis: gelecek, kapsamlar: { create: [{ tesisId: tesisA.id }] },
    },
  });
  const dB = await db.denetim.create({
    data: {
      kod: `${ONEK}-DEN-B`, ad: 'B gizli denetim', tip: 'ic_denetim', surecId: surec.id,
      planBitis: gelecek, kapsamlar: { create: [{ tesisId: tesisB.id }] },
    },
  });
  const dN = await db.denetim.create({
    data: {
      kod: `${ONEK}-DEN-N`, ad: 'Portfoy denetimi', tip: 'ic_denetim', surecId: surec.id,
      planBitis: gelecek,
    },
  });
  kimlik.denetimA = dA.id;
  kimlik.denetimB = dB.id;
  kimlik.denetimN = dN.id;
  // B denetiminin bulgusu B santralindedir; detayda da görünmemeli.
  await db.bulgu.update({ where: { id: bB.id }, data: { denetimId: dB.id } });
  await db.bulgu.update({ where: { id: bA.id }, data: { denetimId: dA.id } });

  /* Varlık aktarımı: önizleme satırları iki santrali de hedefliyor,
     yinelenen listesi iki santralin MEVCUT varlığını da adlandırıyor. */
  await db.varlikAktarimi.create({
    data: {
      dosyaAdi: `${ONEK}-aktarim.csv`, kaynakTipi: 'csv', durum: 'dogrulama_bekliyor',
      okunan: 2, gecerli: 2, yinelenen: 2,
      raporJson: JSON.stringify({
        satirlar: [
          { satirNo: 1, etiket: `${ONEK}-A-VARLIK`, islem: 'guncelleme', hedefId: vA.id,
            eslesmeAlani: 'etiket', bosAlanlar: [], veri: { etiket: `${ONEK}-A-VARLIK`, tesisId: tesisA.id } },
          { satirNo: 2, etiket: `${ONEK}-B-VARLIK`, islem: 'guncelleme', hedefId: vB.id,
            eslesmeAlani: 'etiket', bosAlanlar: [], veri: { etiket: `${ONEK}-B-VARLIK`, tesisId: tesisB.id } },
        ],
        hatalar: [],
        yinelenenler: [
          { satirNo: 1, etiket: `${ONEK}-A-VARLIK`, hedefId: vA.id,
            hedefEtiket: `${ONEK}-A-VARLIK`, eslesmeAlani: 'etiket' },
          { satirNo: 2, etiket: `${ONEK}-B-VARLIK`, hedefId: vB.id,
            hedefEtiket: `${ONEK}-B-VARLIK`, eslesmeAlani: 'etiket' },
        ],
      }),
    },
  });

  /* Dead-letter: santral ham yükün `tesisKodu` beyanından türetilir;
     üçüncüsü hiç beyan etmiyor (santrali BİLİNMİYOR). */
  const connector = await db.connector.create({
    data: { kod: `${ONEK}-CON`, ad: 'Kapsam connector', tip: 'ot_discovery',
      kaynakSistem: 'kek_kesif' },
  });
  for (const [kod, sebep] of [
    [`${ONEK}-A`, 'A kaydi dustu'],
    [`${ONEK}-B`, 'B kaydi dustu'],
    [null, 'santralsiz kayit dustu'],
  ] as const) {
    await db.reddedilenKayit.create({
      data: {
        connectorId: connector.id, kaynakSistem: 'kek_kesif', asama: 'dogrulama',
        sebep, durum: 'acik',
        hamJson: JSON.stringify(kod ? { tesisKodu: kod, etiket: `ham-${kod}` } : { etiket: 'ham-yok' }),
      },
    });
  }

  /* Denetim izi: santrali türetilebilen iki kayıt + türetilemeyen bir kayıt. */
  await db.aktiviteKaydi.create({
    data: { varlikTipi: 'Risk', varlikId: rA.id, eylem: 'guncelleme', alan: 'artikRisk',
      yeniDeger: `${ONEK}-IZ-A` },
  });
  await db.aktiviteKaydi.create({
    data: { varlikTipi: 'Risk', varlikId: rB.id, eylem: 'guncelleme', alan: 'artikRisk',
      yeniDeger: `${ONEK}-IZ-B` },
  });
  await db.aktiviteKaydi.create({
    data: { varlikTipi: 'Madde', varlikId: madde.id, eylem: 'guncelleme', alan: 'baslik',
      yeniDeger: `${ONEK}-IZ-BILINMEYEN` },
  });

  const uA = await db.kullanici.create({
    data: {
      eposta: `${ONEK}-a@test.local`, adSoyad: 'A Santral Yoneticisi',
      yetkiler: { create: [{ rol: 'yonetici', tesisId: tesisA.id }] },
    },
  });
  const uB = await db.kullanici.create({
    data: {
      eposta: `${ONEK}-b@test.local`, adSoyad: 'B Santral Yoneticisi',
      yetkiler: { create: [{ rol: 'yonetici', tesisId: tesisB.id }] },
    },
  });
  const uG = await db.kullanici.create({
    data: {
      eposta: `${ONEK}-global@test.local`, adSoyad: 'Kurum Yoneticisi',
      yetkiler: { create: [{ rol: 'yonetici' }] },
    },
  });
  const uR = await db.kullanici.create({
    data: {
      eposta: `${ONEK}-risk@test.local`, adSoyad: 'Risk Sahibi',
      yetkiler: { create: [{ rol: 'risk_sahibi' }] },
    },
  });

  kA = await aktifKullaniciYukle(uA.id);
  kB = await aktifKullaniciYukle(uB.id);
  kGlobal = await aktifKullaniciYukle(uG.id);
  kRiskSahibi = await aktifKullaniciYukle(uR.id);
});

/* ═══ 0 · Kurulum kendini doğrular ═════════════════════════════════════ */

describe('kurulum', () => {
  it('kapsam kümeleri beklendiği gibi', async () => {
    expect(izinliTesisIdleri(kA, 'risk')).toEqual([kimlik.tesisA]);
    expect(izinliTesisIdleri(kB, 'uyum')).toEqual([kimlik.tesisB]);
    expect(izinliTesisIdleri(kGlobal, 'envanter')).toBeNull();
    // risk_sahibi: yalnız risk + uyum okur; envanter/denetim/yonetim yok.
    expect(izinliTesisIdleri(kRiskSahibi, 'risk')).toBeNull();
    expect(izinliTesisIdleri(kRiskSahibi, 'envanter')).toEqual([]);
    expect(izinliTesisIdleri(kRiskSahibi, 'denetim')).toEqual([]);
  });

  it('yasak veri VERİTABANINDA gerçekten var — "dönmedi" ile "yoktu" karışmasın', async () => {
    expect(await db.risk.count({ where: { tesisId: kimlik.tesisB, silindi: null } }))
      .toBeGreaterThan(0);
    expect(await db.bulgu.count({ where: { maddeDurumu: { tesisId: kimlik.tesisB } } }))
      .toBeGreaterThan(0);
    expect(await db.kimlikHesabi.count({ where: { tesisId: kimlik.tesisB } })).toBeGreaterThan(0);
    expect(await db.varlik.count({ where: { tesisId: kimlik.tesisB } })).toBeGreaterThan(0);
  });
});

/* ═══ 1 · /riskler ═════════════════════════════════════════════════════ */

describe('/riskler · kapsam', () => {
  it('A kullanıcısı B santralinin hiçbir izini görmüyor', async () => {
    const veri = await riskEkranVerisi(kA);
    icermiyor(veri, [...bIzleri(), `${ONEK}-RSK-B`, 'B gizli risk',
      // kapsam içi riske bağlı KAPSAM DIŞI varlık da sızmamalı
      `${ONEK}-B-VARLIK`, 'B gizli varlik']);
    iceriyor(veri, [`${ONEK}-RSK-A`, 'A riski', `${ONEK}-A`]);
  });

  it('santrali bilinmeyen risk yalnız kapsamsız kullanıcıya görünüyor', async () => {
    icermiyor(await riskEkranVerisi(kA), [`${ONEK}-RSK-N`]);
    iceriyor(await riskEkranVerisi(kGlobal), [`${ONEK}-RSK-N`]);
  });

  it('metrikler de daraltılmış veriden geliyor', async () => {
    const a = await riskEkranVerisi(kA);
    const g = await riskEkranVerisi(kGlobal);
    // A'nın en yüksek aktif skoru 20 (A riski); B'nin 21'i sayaca girmemeli.
    expect(a.metrikler.enYuksek).toBe(20);
    expect(g.metrikler.enYuksek).toBeGreaterThanOrEqual(21);
    expect(a.metrikler.aktif).toBeLessThan(g.metrikler.aktif);
    expect(a.toplam).toBeLessThan(g.toplam);
    // Satır sayısı ile sayaç aynı kümeden: A tek riskini görür.
    expect(a.riskler.filter((r) => r.kod.startsWith(`${ONEK}-RSK`))).toHaveLength(1);
  });

  it('kapsamsız kullanıcı aynı çağrıda hepsini görüyor', async () => {
    iceriyor(await riskEkranVerisi(kGlobal),
      [`${ONEK}-RSK-A`, `${ONEK}-RSK-B`, `${ONEK}-RSK-N`, `${ONEK}-B`]);
  });

  it('boş ekranın sözü değişsin diye kapsam bayrağı taşınıyor', async () => {
    expect((await riskEkranVerisi(kA)).kapsamli).toBe(true);
    expect((await riskEkranVerisi(kGlobal)).kapsamli).toBe(false);
  });

  it('detay kapsam dışı riski AÇMIYOR ve varlığını doğrulamıyor', async () => {
    expect(await riskDetayVerisi(kA, kimlik.riskB)).toBeNull();
    // Aynı çağrı kapsamsız kullanıcıda kaydı verir — "her şeyi gizle" değil.
    expect(await riskDetayVerisi(kGlobal, kimlik.riskB)).not.toBeNull();
    // Olmayan id ile kapsam dışı id AYNI yanıtı verir: varlık doğrulanamaz.
    expect(await riskDetayVerisi(kA, 'olmayan-id')).toBeNull();
  });

  it('detay ekranı da B santralinin izini taşımıyor', async () => {
    const veri = await riskDetayVerisi(kA, kimlik.riskA);
    expect(veri).not.toBeNull();
    icermiyor(veri, [...bIzleri(), 'B gizli varlik', `${ONEK}-B-VARLIK`]);
  });

  it('santrali bilinmeyen risk detayı da yalnız kapsamsıza açılıyor', async () => {
    expect(await riskDetayVerisi(kA, kimlik.riskN)).toBeNull();
    expect(await riskDetayVerisi(kGlobal, kimlik.riskN)).not.toBeNull();
  });
});

/* ═══ 2 · /bulgular ════════════════════════════════════════════════════ */

describe('/bulgular · kapsam', () => {
  it('A kullanıcısı B santralinin bulgusunu görmüyor', async () => {
    const veri = await bulguEkranVerisi(kA);
    icermiyor(veri, [...bIzleri(), `${ONEK} B gizli bulgu`]);
    iceriyor(veri, [`${ONEK} A bulgusu`, `${ONEK}-A`]);
  });

  it('metrikler kesilmemiş AMA daraltılmış kütükten geliyor', async () => {
    const a = await bulguEkranVerisi(kA);
    const b = await bulguEkranVerisi(kB);
    const g = await bulguEkranVerisi(kGlobal);
    expect(a.metrikler.acik).toBeLessThan(g.metrikler.acik);
    expect(a.toplam).toBeLessThan(g.toplam);
    expect(a.metrikler.acik + b.metrikler.acik).toBeLessThanOrEqual(g.metrikler.acik);
    // Sayaç satır dizisinden DEĞİL, ayrı sayım geçişinden gelir.
    expect(a.metrikler.gecikmis).toBeGreaterThan(0);
  });

  it('kapsamsız kullanıcı iki santralin bulgusunu da görüyor', async () => {
    iceriyor(await bulguEkranVerisi(kGlobal),
      [`${ONEK} A bulgusu`, `${ONEK} B gizli bulgu`, `${ONEK}-B`]);
  });

  it('detay kapsam dışı bulguyu AÇMIYOR', async () => {
    expect(await bulguDetayVerisi(kA, kimlik.bulguB)).toBeNull();
    expect(await bulguDetayVerisi(kA, 'olmayan-id')).toBeNull();
    expect(await bulguDetayVerisi(kGlobal, kimlik.bulguB)).not.toBeNull();
    icermiyor(await bulguDetayVerisi(kA, kimlik.bulguA), bIzleri());
  });
});

/* ═══ 3 · /kimlik ══════════════════════════════════════════════════════ */

describe('/kimlik · kapsam ve modül', () => {
  it('A kullanıcısı B santralinin hesabını ve varlık etiketini görmüyor', async () => {
    const veri = await kimlikEkranVerisi(kA);
    icermiyor(veri, [...bIzleri(), `${ONEK}-B-HESAP`, 'B gizli varlik', `${ONEK}-B-VARLIK`]);
    iceriyor(veri, [`${ONEK}-A-HESAP`, `${ONEK}-A-VARLIK`]);
  });

  it('kapsam dışı varlığa verilmiş atama SATIRI kalır, ETİKETİ gitmez', async () => {
    const veri = await kimlikEkranVerisi(kA);
    const hesap = veri.hesaplar.find((h) => h.hesapAdi === `${ONEK}-A-HESAP`);
    expect(hesap).toBeDefined();
    // İki atama da görünür (gizli yetki diye bir şey yok), biri etiketsiz.
    expect(hesap!.yetkiler).toHaveLength(2);
    expect(hesap!.yetkiler.filter((y) => y.varlikEtiketi === null)).toHaveLength(1);
  });

  it('santrali bilinmeyen hesap yalnız kapsamsız kullanıcıya görünüyor', async () => {
    icermiyor(await kimlikEkranVerisi(kA), [`${ONEK}-N-HESAP`]);
    iceriyor(await kimlikEkranVerisi(kGlobal), [`${ONEK}-N-HESAP`]);
  });

  it('santral süzgeci açılırı da daraltılıyor (metrik değil ama kimlik taşır)', async () => {
    const veri = await kimlikEkranVerisi(kA);
    expect(veri.tesisler.some((t) => t.id === kimlik.tesisB)).toBe(false);
    expect(veri.tesisler.some((t) => t.id === kimlik.tesisA)).toBe(true);
  });

  it('MODÜL: envanterde okuma izni olmayan rol veriye HİÇ erişemiyor', async () => {
    expect(modulOkuyabilir(kRiskSahibi, 'envanter')).toBe(false);
    await expect(kimlikEkranVerisi(kRiskSahibi)).rejects.toThrow(/envanter/);
  });
});

/* ═══ 4 · /omur ════════════════════════════════════════════════════════ */

describe('/omur · kapsam, modül ve satır tavanı', () => {
  it('A kullanıcısı B santralinin varlığını görmüyor', async () => {
    const veri = await omurEkranVerisi(kA);
    icermiyor(veri, [...bIzleri(), `${ONEK}-B-VARLIK`, 'B gizli varlik']);
    iceriyor(veri, [`${ONEK}-A-VARLIK`]);
  });

  it('santrali bilinmeyen varlık yalnız kapsamsız kullanıcıya görünüyor', async () => {
    icermiyor(await omurEkranVerisi(kA), [`${ONEK}-N-VARLIK`]);
    iceriyor(await omurEkranVerisi(kGlobal), [`${ONEK}-N-VARLIK`]);
  });

  it('sayaçlar da daraltılmış veriden geliyor', async () => {
    const a = await omurEkranVerisi(kA);
    const g = await omurEkranVerisi(kGlobal);
    expect(a.toplamVarlik).toBeLessThan(g.toplamVarlik);
    expect(a.kuyrukToplami).toBeLessThan(g.kuyrukToplami);
    expect(a.metrikler.destekBitti).toBeLessThanOrEqual(g.metrikler.destekBitti);
    expect(a.metrikler.destekBitti).toBeGreaterThan(0);
  });

  it('kuyruk sayacı SATIR dizisinden değil, kesilmemiş sayımdan geliyor', async () => {
    const g = await omurEkranVerisi(kGlobal);
    // Tavan uygulanmış olsa bile toplam gerçek kalır.
    expect(g.kuyrukToplami).toBeGreaterThanOrEqual(g.kayitlar.length);
    expect(g.kayitlar.length).toBeLessThanOrEqual(g.satirTavani);
  });

  it('MODÜL: envanterde okuma izni olmayan rol veriye HİÇ erişemiyor', async () => {
    await expect(omurEkranVerisi(kRiskSahibi)).rejects.toThrow(/envanter/);
  });
});

/* ═══ 5 · /aktivite (denetim izi) ══════════════════════════════════════ */

describe('/aktivite · denetim izi kararı', () => {
  it('MODÜL: denetim okuma izni olmayan rol kütüğe HİÇ erişemiyor', async () => {
    // KARAR: kütük `denetim/okuma` ister. `risk_sahibi` dışarıda kalır.
    expect(modulOkuyabilir(kRiskSahibi, 'denetim')).toBe(false);
    await expect(aktiviteVerisi(kRiskSahibi)).rejects.toThrow(/denetim/);
  });

  it('santrali TÜRETİLEBİLEN kayıt kapsama uyuyor', async () => {
    const veri = await aktiviteVerisi(kA);
    iceriyor(veri, [`${ONEK}-IZ-A`]);
    icermiyor(veri, [`${ONEK}-IZ-B`]);
  });

  it('santrali TÜRETİLEMEYEN kayıt yalnız kapsamsız kullanıcıya görünüyor', async () => {
    icermiyor(await aktiviteVerisi(kA), [`${ONEK}-IZ-BILINMEYEN`]);
    iceriyor(await aktiviteVerisi(kGlobal), [`${ONEK}-IZ-BILINMEYEN`]);
  });

  it('kapsamsız kullanıcı üç kaydı da görüyor', async () => {
    iceriyor(await aktiviteVerisi(kGlobal),
      [`${ONEK}-IZ-A`, `${ONEK}-IZ-B`, `${ONEK}-IZ-BILINMEYEN`]);
  });

  it('kesme sessiz değil: toplam pencereden büyük olabilir ve taşınır', async () => {
    const g = await aktiviteVerisi(kGlobal);
    expect(g.kayitlar.length).toBeLessThanOrEqual(g.pencere);
    expect(g.toplam).toBeGreaterThanOrEqual(g.kayitlar.length);
  });
});

/* ═══ 6 · /varlik-aktarim ══════════════════════════════════════════════ */

describe('/varlik-aktarim · kapsam', () => {
  it('önizleme, yinelenen listesi ve kod sözlüğü B santralini taşımıyor', async () => {
    const veri = await varlikAktarimVerisi(kA);
    icermiyor(veri, [...bIzleri(), `${ONEK}-B-VARLIK`]);
    iceriyor(veri, [`${ONEK}-A-VARLIK`, `${ONEK}-A`]);
  });

  it('yinelenen SAYACI da daraltılmış listeden geliyor', async () => {
    const a = await varlikAktarimVerisi(kA);
    const g = await varlikAktarimVerisi(kGlobal);
    const kayitA = a.aktarimlar.find((x) => x.dosyaAdi === `${ONEK}-aktarim.csv`)!;
    const kayitG = g.aktarimlar.find((x) => x.dosyaAdi === `${ONEK}-aktarim.csv`)!;
    expect(kayitA.onizleme).toHaveLength(1);
    expect(kayitG.onizleme).toHaveLength(2);
    expect(kayitA.yinelenen).toBe(1);
    expect(kayitG.yinelenen).toBe(2);
  });

  it('MODÜL: envanterde okuma izni olmayan rol veriye HİÇ erişemiyor', async () => {
    await expect(varlikAktarimVerisi(kRiskSahibi)).rejects.toThrow(/envanter/);
  });
});

/* ═══ 7 · /saglik/reddedilenler ════════════════════════════════════════ */

describe('/saglik/reddedilenler · kapsam', () => {
  it('A kullanıcısı B connector kaydının ham yükünü görmüyor', async () => {
    const veri = await reddedilenlerVerisi(kA);
    icermiyor(veri, [...bIzleri(), 'B kaydi dustu', `ham-${ONEK}-B`]);
    iceriyor(veri, ['A kaydi dustu']);
  });

  it('santrali türetilemeyen kayıt yalnız kapsamsız kullanıcıya görünüyor', async () => {
    icermiyor(await reddedilenlerVerisi(kA), ['santralsiz kayit dustu']);
    iceriyor(await reddedilenlerVerisi(kGlobal), ['santralsiz kayit dustu']);
  });

  it('kuyruk toplamı da daraltılıyor', async () => {
    const a = await reddedilenlerVerisi(kA);
    const g = await reddedilenlerVerisi(kGlobal);
    expect(a.toplam).toBe(a.satirlar.length);
    expect(a.toplam).toBeLessThan(g.toplam);
  });

  it('MODÜL: yönetim okuma izni olmayan rol kuyruğa erişemiyor', async () => {
    const veri = await reddedilenlerVerisi(kRiskSahibi);
    expect(veri.yetkili).toBe(false);
    expect(veri.satirlar).toHaveLength(0);
  });
});

/* ═══ 8 · /denetimler/[id] ═════════════════════════════════════════════ */

describe('/denetimler/[id] · kapsam', () => {
  it('kapsam dışı denetim AÇILMIYOR', async () => {
    expect(await denetimDetayVerisi(kA, kimlik.denetimB)).toBeNull();
    expect(await denetimDetayVerisi(kA, 'olmayan-id')).toBeNull();
    expect(await denetimDetayVerisi(kGlobal, kimlik.denetimB)).not.toBeNull();
  });

  it('kapsam satırı olmayan denetim portföy geneli sayılır (liste ile aynı kural)', async () => {
    expect(await denetimDetayVerisi(kA, kimlik.denetimN)).not.toBeNull();
  });

  it('kapsam içi denetimin içindeki B satırları da temizleniyor', async () => {
    // B kapsamını A denetimine EKLE: çok santralli denetim senaryosu.
    await db.denetimKapsami.create({
      data: { denetimId: kimlik.denetimA, tesisId: kimlik.tesisB },
    });
    const veri = await denetimDetayVerisi(kA, kimlik.denetimA);
    expect(veri).not.toBeNull();
    icermiyor(veri, bIzleri());
    // Metrik de daraltılmış kümeden: denetim tek santral kapsıyor görünür.
    expect(veri!.denetim.tesisler.map((t) => t.id)).toEqual([kimlik.tesisA]);
    // Kapsamsız kullanıcı iki santrali de görür.
    const g = await denetimDetayVerisi(kGlobal, kimlik.denetimA);
    expect(g!.denetim.tesisler).toHaveLength(2);
  });
});

/* ═══ 9 · /portfoy ═════════════════════════════════════════════════════ */

describe('/portfoy · kapsam', () => {
  it('A kullanıcısı B santralinin plakasını görmüyor', async () => {
    const veri = await portfoyEkranVerisi(kA);
    icermiyor(veri, bIzleri());
    iceriyor(veri, [`${ONEK}-A`, 'Kapsam Santral A']);
  });

  it('toplam kurulu güç de daraltılmış satırlardan toplanıyor', async () => {
    const a = await portfoyEkranVerisi(kA);
    const g = await portfoyEkranVerisi(kGlobal);
    expect(a.toplamGucMw).toBe(11);
    expect(g.toplamGucMw).toBeGreaterThan(a.toplamGucMw);
    expect(a.satirlar).toHaveLength(1);
  });

  it('kapsamsız kullanıcı iki santrali de görüyor', async () => {
    iceriyor(await portfoyEkranVerisi(kGlobal), [`${ONEK}-A`, `${ONEK}-B`]);
  });
});

/* ═══ 10 · / (yönetici özeti) ══════════════════════════════════════════ */

describe('/ (yönetici özeti) · kapsam', () => {
  it('odak kartı ve kuyruk B santralini taşımıyor', async () => {
    const veri = await genelEkranVerisi(kA);
    icermiyor(veri, [...bIzleri(), `${ONEK} B gizli bulgu`, `${ONEK}-DEN-B`]);
  });

  it('dört metriğin dördü de daraltılmış veriden geliyor', async () => {
    const a = await genelEkranVerisi(kA);
    const g = await genelEkranVerisi(kGlobal);
    expect(a.ozet.tesisSayisi).toBe(1);
    expect(g.ozet.tesisSayisi).toBeGreaterThan(1);
    expect(a.ozet.toplamGucMw).toBe(11);
    expect(a.ozet.kritikRisk).toBeLessThan(g.ozet.kritikRisk);
    expect(a.toplamKayit).toBeLessThanOrEqual(g.toplamKayit);
  });
});

/* ═══ 11 · /tesisler/[id] (Santral 360) ════════════════════════════════ */

describe('/tesisler/[id] · kapsam', () => {
  it('kapsam dışı santral AÇILMIYOR ve varlığı doğrulanmıyor', async () => {
    expect(await tesis360Verisi(kA, kimlik.tesisB)).toBeNull();
    expect(await tesis360Verisi(kA, 'olmayan-id')).toBeNull();
    expect(await tesis360Verisi(kGlobal, kimlik.tesisB)).not.toBeNull();
  });

  it('alt gezinme şeridi de kapsam dışı santrali anmıyor', async () => {
    const veri = await tesis360Verisi(kA, kimlik.tesisA);
    expect(veri).not.toBeNull();
    icermiyor(veri, bIzleri());
    expect(veri!.santraller.map((s) => s.id)).toEqual([kimlik.tesisA]);
  });
});

/* ═══ 12 · Satır tavanı — sınırsız okumaya karşı ═══════════════════════ */

describe('satır tavanı ve dürüst kesme', () => {
  it('/riskler: tavanın üstünde veri varken satır sayısı tavanda kalır, sayaç gerçek kalır',
    async () => {
      const oncesi = await riskEkranVerisi(kGlobal);
      const tavan = oncesi.satirTavani;
      const eklenecek = tavan + 5 - oncesi.toplam;
      const veriler = Array.from({ length: Math.max(eklenecek, 1) }, (_, i) => ({
        kod: `${ONEK}-TAVAN-${String(i).padStart(4, '0')}`,
        baslik: 'tavan riski', aciklama: 'tavan', tesisId: kimlik.tesisA,
        artikRisk: 1, durum: 'acik',
      }));
      await db.risk.createMany({ data: veriler });

      const sonrasi = await riskEkranVerisi(kGlobal);
      expect(sonrasi.riskler.length).toBe(tavan);
      // (b) sayaç KESİLMİŞ listeden değil, gerçek toplamdan gelir
      expect(sonrasi.toplam).toBeGreaterThan(tavan);
      expect(sonrasi.metrikler.aktif).toBeGreaterThan(tavan);
      // (c) ekran kesmeyi söyleyebilsin diye fark taşınır
      expect(sonrasi.toplam - sonrasi.riskler.length).toBeGreaterThan(0);

      await db.risk.deleteMany({ where: { kod: { startsWith: `${ONEK}-TAVAN-` } } });
    });
});
