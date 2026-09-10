import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { PrismaClient } from '@/lib/prisma-client/client';
import { CSV_BASLIK, SOZLUK_SATIRI, cerceve, paketYaz, type PaketDosyalari } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · PAKET KURUCU ve KALDIRICI — GERÇEK veritabanı
   (URN-PKT-003 · 004 · 006 · 007)

   · doğrulanmış paket TEK transaction'da yazılır; ortada patlarsa HİÇBİR
     satır kalmaz (kısmi yazma yok);
   · çerçeve TASLAK gelir — kurucu hiçbir sürümü aktif yapmaz; sürümün
     yayım ve yürürlük tarihi iki dalda da (yeni · yenilenen) yazılır;
   · yazılan her satır koken=paket + paketSurumId;
   · aynı sürüm ikinci kez kurulunca idempotent;
   · kiracının satırı EZİLMEZ, raporda çelişki olarak işaretlenir; kiracı
     kaydı bağlı taslak üzerine yazılamaz — bağ listesi şemadan bekçiyle
     doğrulanır (kapsam alanı eşlemesi dâhil);
   · yükseltme uzlaştırması: yeni sürümün bırakmadığı tür/yükümlülük pasif,
     taslak sürüm arşiv; sözlük/öznitelik "artık" olarak raporlanır; silme yok;
   · kaldırma = arşiv; hiçbir satır silinmez; aktif sürüm taşıyan paket
     kaldırılamaz ve bu karar arşiv yazımıyla AYNI transaction'dadır.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-paket-kur-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { paketiKaldir, paketiKur } = await import('@/lib/paket/kur');
const { METIN_GELMEDI, TELIFLI_METIN } = await import('@/lib/paket/bicim');

const TARIHLER = { yayimTarihi: '2024-01-15', yururlukTarih: '2024-07-01' };
const DOSYALAR = {
  'sozluk.json': [SOZLUK_SATIRI('tesis', 'şube'), SOZLUK_SATIRI('kurum', 'banka')],
  'kapsam-turleri.json': [{ kod: 'test_sistem', ad: 'Test sistemi', etiketAnahtari: null, tesiseBagli: false, sira: 10 }],
  'oznitelikler.json': [
    { anahtar: 'testKapasite', tip: 'sayi', birim: 'adet', etiketAnahtari: 'testKapasite', rol: 'kapasite', grup: null, secenekler: null, kuraldaKullanilir: true, sira: 1 },
    { anahtar: 'testSinif', tip: 'metin', birim: null, etiketAnahtari: 'testSinif', rol: null, grup: 'Test', secenekler: [{ deger: 'a', ad: 'A' }], kuraldaKullanilir: false, sira: 2 },
  ],
  'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'kamuya_acik', metinDahil: false }, TARIHLER),
  'cerceve/TEST-REG.csv': `${CSV_BASLIK}\nB1;;Birinci Bölüm;;0;;\n1;B1;Amaç;;1;;\n2;B1;Kapsam;;2;2;\n`,
  'cerceve/TEST-ISO.json': cerceve('TEST-ISO', { tur: 'telifli', metinDahil: false }),
  'cerceve/TEST-ISO.csv': `${CSV_BASLIK}\nA.5;;Organizasyonel kontroller;;0;;\nA.5.1;A.5;Bilgi güvenliği politikaları;;1;;\n`,
  'yukumlulukler.json': [{ kod: 'TEST-BILDIRIM', ad: 'Olay bildirimi', regulasyonKod: 'TEST-REG', asgariSiddet: 'yuksek', sureSaat: 72, dayanak: 'md. 2', merci: 'Kurum' }],
};

let kuranId: string;
beforeAll(async () => {
  kuranId = (await db.kullanici.findFirstOrThrow({ where: { aktif: true } })).id;
});

const kur = (dosyalar: PaketDosyalari = DOSYALAR, manifest: Record<string, unknown> = {}) =>
  paketiKur(paketYaz(dosyalar, manifest), { kuranId, istemci: db });

describe('kurucu — tek transaction, taslak sürüm, köken [URN-PKT-003]', () => {
  it('doğrulanmış paket yazılır: sayılar, taslak sürümler, köken, lisans alanı, metin sabitleri, sürüm tarihleri [URN-PKT-003]', async () => {
    const s = await kur();
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.sayilar).toEqual({ sozluk: 2, kapsamTurleri: 1, oznitelikler: 2, cerceveler: 2, maddeler: 5, yukumlulukler: 1, formlar: 0, raporlar: 0, roller: 0, eslemeler: 0, kurallar: 0 });
    expect(s.rapor.celiskiler).toEqual([]);
    expect(s.rapor.pasiflestirilen).toEqual({ kapsamTurleri: 0, yukumlulukler: 0, cerceveSurumleri: 0, sozluk: 0, oznitelikler: 0, formlar: 0, raporlar: 0, roller: 0, eslemeler: 0, kurallar: 0 });
    expect(s.rapor.pasifAnahtarlar).toEqual({ sozluk: [], oznitelikler: [] });

    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'TEST-SEKTOR' } });
    const sozluk = await db.sektorSozlugu.findMany({ where: { sektorId: sektor.id } });
    expect(sozluk).toHaveLength(2);
    for (const r of sozluk) expect(r).toMatchObject({ koken: 'paket', paketSurumId: s.rapor.surumId });

    const reg = await db.regulasyon.findUniqueOrThrow({ where: { kod: 'TEST-REG' }, include: { surumler: true } });
    expect(reg).toMatchObject({ lisansTuru: 'kamuya_acik', metinDahil: false, koken: 'paket' });
    expect(reg.surumler.map((v) => v.durum)).toEqual(['taslak']);
    // paketin beyan ettiği yayım VE yürürlük tarihi sürüme yazıldı (yeni sürüm dalı)
    expect(reg.surumler[0]).toMatchObject({ yayimTarihi: new Date(TARIHLER.yayimTarihi), yururlukTarih: new Date(TARIHLER.yururlukTarih) });
    const iso = await db.regulasyon.findUniqueOrThrow({ where: { kod: 'TEST-ISO' }, include: { surumler: true } });
    expect(iso).toMatchObject({ lisansTuru: 'telifli', metinDahil: false });
    expect(iso.surumler[0]).toMatchObject({ yayimTarihi: null, yururlukTarih: null });
    expect(await db.frameworkSurumu.count({ where: { regulasyonId: { in: [reg.id, iso.id] }, durum: 'aktif' } })).toBe(0);

    const maddeler = await db.madde.findMany({ where: { regulasyonId: reg.id }, orderBy: { sira: 'asc' } });
    expect(maddeler.map((m) => m.kod)).toEqual(['TEST-REG-B1', 'TEST-REG-1', 'TEST-REG-2']);
    expect(maddeler[1].ustMaddeId).toBe(maddeler[0].id);
    expect(maddeler[2]).toMatchObject({ metin: METIN_GELMEDI, olgunlukSeviyesi: 2, zorunlulukTipi: 'REGULATION' });
    const isoMaddeler = await db.madde.findMany({ where: { regulasyonId: iso.id } });
    for (const m of isoMaddeler) expect(m.metin).toBe(TELIFLI_METIN);

    expect(await db.kapsamOgesiTuru.findUniqueOrThrow({ where: { kod: 'test_sistem' } })).toMatchObject({ koken: 'paket', sektorId: sektor.id, aktif: true });
    expect(await db.bildirimYukumlulugu.findUniqueOrThrow({ where: { kod: 'TEST-BILDIRIM' } })).toMatchObject({ koken: 'paket', regulasyonId: reg.id, sureSaat: 72 });
    const paket = await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'TEST-PAKET' }, include: { surumler: true } });
    expect(paket.surumler).toHaveLength(1);
    expect(paket.surumler[0]).toMatchObject({ surum: '0.1.0', durum: 'kurulu', kuranId });
  });

  it('aynı sürüm ikinci kez kurulunca idempotent: satır sayıları değişmez, ikinci sürüm kaydı açılmaz [URN-PKT-003]', async () => {
    const once = { madde: await db.madde.count(), sozluk: await db.sektorSozlugu.count(), surum: await db.icerikPaketiSurumu.count() };
    const s = await kur();
    expect(s.ok).toBe(true);
    expect({ madde: await db.madde.count(), sozluk: await db.sektorSozlugu.count(), surum: await db.icerikPaketiSurumu.count() }).toEqual(once);
  });

  it('kısmi yazma YOK: sonda patlayan kurulum hiçbir satır bırakmaz [URN-PKT-003]', async () => {
    /* Yükümlülük en son yazılır ve olmayan regülasyona işaret ediyor →
       transaction ortada patlar; paket, sektör, sözlük, madde — hiçbiri kalmamalı. */
    const s = await kur({
      'sozluk.json': [SOZLUK_SATIRI('tesis', 'patlak')],
      'kapsam-turleri.json': [{ kod: 'patlak_tur', ad: 'Patlak tür', etiketAnahtari: null, tesiseBagli: false, sira: 1 }],
      'cerceve/PATLAK-REG.json': cerceve('PATLAK-REG', { tur: 'kamuya_acik', metinDahil: false }),
      'cerceve/PATLAK-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n`,
      'yukumlulukler.json': [{ kod: 'PATLAK', ad: 'Patlak bildirim', regulasyonKod: 'YOK-REG', asgariSiddet: 'yuksek', sureSaat: 1, dayanak: 'dayanak', merci: 'merci' }],
    }, { kod: 'PATLAK-PAKET', sektor: { kod: 'PATLAK-SEKTOR', ad: 'Patlak' } });
    expect(s.ok).toBe(false);
    if (s.ok) return;
    expect(s.hatalar[0]).toMatchObject({ sinif: 'KİMLİK', dosya: 'yukumlulukler.json' });
    expect(await db.icerikPaketi.findUnique({ where: { kod: 'PATLAK-PAKET' } })).toBeNull();
    expect(await db.sektor.findUnique({ where: { kod: 'PATLAK-SEKTOR' } })).toBeNull();
    expect(await db.regulasyon.findUnique({ where: { kod: 'PATLAK-REG' } })).toBeNull();
    expect(await db.kapsamOgesiTuru.findUnique({ where: { kod: 'patlak_tur' } })).toBeNull();
    expect(await db.bildirimYukumlulugu.findUnique({ where: { kod: 'PATLAK' } })).toBeNull();
  });

  it('ayniIslemde (iz) patlarsa kurulum da geri alınır — durum ve iz aynı transaction\'da [URN-PKT-007]', async () => {
    const once = await db.icerikPaketi.count();
    const izsiz: PaketDosyalari = {
      'sozluk.json': [SOZLUK_SATIRI('tesis', 'izsiz')],
      'cerceve/IZSIZ-REG.json': cerceve('IZSIZ-REG', { tur: 'kamuya_acik', metinDahil: false }),
      'cerceve/IZSIZ-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n`,
    };
    await expect(paketiKur(paketYaz(izsiz, { kod: 'IZSIZ-PAKET', sektor: { kod: 'IZSIZ-SEKTOR', ad: 'İzsiz' } }), {
      kuranId, istemci: db, ayniIslemde: async () => { throw new Error('iz yazılamadı (sentetik)'); },
    })).rejects.toThrow(/iz yazılamadı/);
    expect(await db.icerikPaketi.count()).toBe(once);
    expect(await db.icerikPaketi.findUnique({ where: { kod: 'IZSIZ-PAKET' } })).toBeNull();
    expect(await db.sektor.findUnique({ where: { kod: 'IZSIZ-SEKTOR' } })).toBeNull();
    expect(await db.regulasyon.findUnique({ where: { kod: 'IZSIZ-REG' } })).toBeNull();
  });

  it('doğrulayıcıdan geçmeyen paket veritabanına dokunmaz [URN-PKT-003]', async () => {
    const once = await db.icerikPaketi.count();
    const s = await kur(DOSYALAR, { kod: 'BOZUK', surum: 'bozuk' });
    expect(s.ok).toBe(false);
    expect(await db.icerikPaketi.count()).toBe(once);
  });

  it('kurulu olmayan bağımlılık kurulumu durdurur [URN-PKT-003]', async () => {
    const s = await kur(DOSYALAR, { kod: 'BAGIMLI', bagimliliklar: ['YOK-PAKET'] });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hatalar[0].mesaj).toMatch(/bağımlılık kurulu değil: YOK-PAKET/);
  });
});

describe('güncelleme ve kaldırma — kiracı ezilmez, silme yok [URN-PKT-004]', () => {
  it('aynı anahtarda kiracı satırı varsa dokunulmaz ve raporda çelişki olur; paket satırı güncellenir; yenilenen taslağın tarihi de yazılır [URN-PKT-004]', async () => {
    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'TEST-SEKTOR' } });
    // kiracı kendi sözlüğünü yazmış (koken=kiraci) — paketle aynı anahtar
    await db.sektorSozlugu.create({ data: { sektorId: sektor.id, anahtar: 'birim', dil: 'tr', tekil: 'kiracı birimi', koken: 'kiraci' } });
    const s = await kur({ ...DOSYALAR,
      'sozluk.json': [SOZLUK_SATIRI('tesis', 'lokasyon'), SOZLUK_SATIRI('kurum', 'banka'), SOZLUK_SATIRI('birim', 'paket birimi')],
      'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'kamuya_acik', metinDahil: false }, { ...TARIHLER, yururlukTarih: '2025-01-01' }),
    }, { surum: '0.2.0' });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.celiskiler).toEqual([{ tablo: 'SektorSozlugu', anahtar: 'birim@tr', sebep: expect.stringContaining('kiracı satırı var') }]);
    const birim = await db.sektorSozlugu.findUniqueOrThrow({ where: { sektorId_anahtar_dil: { sektorId: sektor.id, anahtar: 'birim', dil: 'tr' } } });
    expect(birim).toMatchObject({ tekil: 'kiracı birimi', koken: 'kiraci' });
    const tesis = await db.sektorSozlugu.findUniqueOrThrow({ where: { sektorId_anahtar_dil: { sektorId: sektor.id, anahtar: 'tesis', dil: 'tr' } } });
    expect(tesis).toMatchObject({ tekil: 'lokasyon', koken: 'paket', paketSurumId: s.rapor.surumId });
    const surumler = await db.icerikPaketiSurumu.findMany({ where: { paket: { kod: 'TEST-PAKET' } }, orderBy: { surum: 'asc' } });
    expect(surumler.map((v) => [v.surum, v.durum])).toEqual([['0.1.0', 'onceki'], ['0.2.0', 'kurulu']]);
    // yenilenen (mevcut) taslak dalı: yürürlük tarihi güncellendi
    const taslak = await db.frameworkSurumu.findFirstOrThrow({ where: { regulasyon: { kod: 'TEST-REG' }, surumEtiketi: 'test-1' } });
    expect(taslak).toMatchObject({ durum: 'taslak', yururlukTarih: new Date('2025-01-01'), paketSurumId: s.rapor.surumId });
  });

  it('kiracının KAPSAM ALANI eşlemesi (MaddeAlan) bağlı taslak üzerine yazılamaz — deleteMany kaskatla silmez [URN-PKT-004]', async () => {
    /* Ölçüldü: `alanlar` bağ listesinde yoktu; madde silinince MaddeAlan
       kaskatla gidiyordu ve kurulum "başarılı" bitiyordu (inceleme bulgusu). */
    const iso = await db.regulasyon.findUniqueOrThrow({ where: { kod: 'TEST-ISO' } });
    const madde = await db.madde.findFirstOrThrow({ where: { regulasyonId: iso.id, ustMaddeId: { not: null } } });
    const alan = await db.kapsamAlani.create({ data: { kod: 'TEST-ALAN', ad: 'Test alanı' } });
    await db.maddeAlan.create({ data: { maddeId: madde.id, alanId: alan.id } });
    const s = await kur(DOSYALAR, { surum: '0.2.5' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hatalar[0]).toMatchObject({ sinif: 'SÜRÜM', dosya: 'cerceve/TEST-ISO.json', mesaj: expect.stringContaining('kiracı kaydı bağlı') });
    expect(await db.maddeAlan.count({ where: { maddeId: madde.id } })).toBe(1);
    expect(await db.madde.findUnique({ where: { id: madde.id } })).not.toBeNull();
    expect(await db.icerikPaketiSurumu.findFirst({ where: { surum: '0.2.5' } })).toBeNull();
  });

  it('kiracı kaydı bağlı taslak üzerine yazılamaz — SÜRÜM hatası, hiçbir şey değişmez [URN-PKT-004]', async () => {
    const reg = await db.regulasyon.findUniqueOrThrow({ where: { kod: 'TEST-REG' } });
    const [a, b] = await db.madde.findMany({ where: { regulasyonId: reg.id, ustMaddeId: { not: null } }, orderBy: { sira: 'asc' } });
    // kiracı iki maddeyi kendi eliyle eşlemiş (koken=kiraci)
    await db.maddeEslestirmesi.create({ data: { kaynakId: a.id, hedefId: b.id, denklik: 'ilgili', koken: 'kiraci' } });
    const once = await db.madde.count({ where: { regulasyonId: reg.id } });
    const s = await kur(DOSYALAR, { surum: '0.3.0' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hatalar[0]).toMatchObject({ sinif: 'SÜRÜM', konum: 'surumEtiketi' });
    expect(await db.madde.count({ where: { regulasyonId: reg.id } })).toBe(once);
    expect(await db.maddeEslestirmesi.count({ where: { kaynakId: a.id } })).toBe(1);
    /* Sorgu PAKETE bağlanır: fikstürdeki BAŞKA bir paketin aynı sürüm
       etiketini taşıması bu iddiayı yanlış kırmızı yakardı (ölçüldü —
       DEMO-TR-ENERJI 0.3.0'a çıkınca oldu). */
    expect(await db.icerikPaketiSurumu.findFirst({
      where: { surum: '0.3.0', paket: { kod: 'TEST-PAKET' } },
    })).toBeNull();
  });

  it('kaldırma = arşiv: paket/sürüm arşiv, taslak çerçeve arşiv, tür ve yükümlülük pasif; HİÇBİR satır silinmez [URN-PKT-004]', async () => {
    const once = { madde: await db.madde.count(), sozluk: await db.sektorSozlugu.count(), tur: await db.kapsamOgesiTuru.count(), yuk: await db.bildirimYukumlulugu.count() };
    const s = await paketiKaldir('TEST-PAKET', db);
    expect(s.ok, JSON.stringify(s)).toBe(true);
    expect({ madde: await db.madde.count(), sozluk: await db.sektorSozlugu.count(), tur: await db.kapsamOgesiTuru.count(), yuk: await db.bildirimYukumlulugu.count() }).toEqual(once);
    expect((await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'TEST-PAKET' } })).durum).toBe('arsiv');
    expect(await db.icerikPaketiSurumu.count({ where: { paket: { kod: 'TEST-PAKET' }, durum: { not: 'arsiv' } } })).toBe(0);
    expect(await db.frameworkSurumu.count({ where: { regulasyon: { kod: { in: ['TEST-REG', 'TEST-ISO'] } }, durum: 'taslak' } })).toBe(0);
    expect((await db.kapsamOgesiTuru.findUniqueOrThrow({ where: { kod: 'test_sistem' } })).aktif).toBe(false);
    expect((await db.bildirimYukumlulugu.findUniqueOrThrow({ where: { kod: 'TEST-BILDIRIM' } })).aktif).toBe(false);
    const tekrar = await paketiKaldir('TEST-PAKET', db);
    expect(tekrar.ok).toBe(false);
  });

  it('aktif çerçeve sürümü taşıyan paket kaldırılamaz [URN-PKT-004]', async () => {
    /* Kendi çerçevesiyle: TEST-REG/TEST-ISO taslakları başka paketin (ve
       arşivlenmiş) — bir paket öbürünün sürümünü ezemez, o da ölçülür. */
    const s = await kur({
      'cerceve/AKTIF-REG.json': cerceve('AKTIF-REG', { tur: 'kamuya_acik', metinDahil: false }),
      'cerceve/AKTIF-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n`,
    }, { kod: 'AKTIF-PAKET', sektor: { kod: 'AKTIF-SEKTOR', ad: 'Aktif' } });
    const baska = await kur(DOSYALAR, { kod: 'BASKA-PAKET', sektor: { kod: 'BASKA-SEKTOR', ad: 'Başka' } });
    expect(baska.ok).toBe(false);
    if (!baska.ok) expect(baska.hatalar[0].sinif).toBe('SÜRÜM');
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    // insan aktifleştirdi (test bunu doğrudan yazar; ürün yolu surumAktiflestir)
    await db.frameworkSurumu.update({ where: { id: s.rapor.taslakSurumler[0].surumId }, data: { durum: 'aktif' } });
    const k = await paketiKaldir('AKTIF-PAKET', db);
    expect(k.ok).toBe(false);
    if (!k.ok) expect(k.hata).toMatch(/aktif çerçeve sürümü/);
    expect((await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'AKTIF-PAKET' } })).durum).toBe('kurulu');
  });

  it('kaldırmada "aktif sürüm var mı" kararı arşiv yazımıyla AYNI transaction\'da — kök istemciye dokunan kaldırma kırmızı [URN-PKT-007]', async () => {
    /* Ölçüldü: sayım transaction DIŞINDA yapılıyordu; "sıfır" ile arşiv
       arasına başka bir isteğin aktifleştirmesi girince arşivlenmiş paket
       aktif çerçeve taşıyabiliyordu (inceleme bulgusu). Sahte istemci: kök
       düzeyde HER model erişimi kaydedilir ve tanımsız döner; okuma yalnız
       transaction istemcisinden yapılabilir. */
    const kokte: string[] = [];
    const tx = {
      icerikPaketi: { findUnique: async () => ({ id: 'p1', durum: 'kurulu', surumler: [{ id: 's1' }] }) },
      frameworkSurumu: { count: async () => 1 },
    };
    const sahte = new Proxy({}, { get(_, ozellik) {
      if (ozellik === '$transaction') return (fn: (t: unknown) => Promise<unknown>) => fn(tx);
      kokte.push(String(ozellik));
      return undefined;
    } }) as unknown as PrismaClient;
    const s = await paketiKaldir('SAHTE', sahte);
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/aktif çerçeve sürümü/);
    expect(kokte).toEqual([]);
  });

  it('ayniIslemde (iz) patlarsa arşiv de geri alınır [URN-PKT-007]', async () => {
    // AKTIF-PAKET: aktif sürümü var, kaldırılamaz — önce sürümü taslağa çeviriyoruz (insan kararı, testte doğrudan)
    await db.frameworkSurumu.updateMany({ where: { regulasyon: { kod: 'AKTIF-REG' } }, data: { durum: 'taslak' } });
    await expect(paketiKaldir('AKTIF-PAKET', db, { ayniIslemde: async () => { throw new Error('iz yazılamadı (sentetik)'); } }))
      .rejects.toThrow(/iz yazılamadı/);
    expect((await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'AKTIF-PAKET' } })).durum).toBe('kurulu');
    expect(await db.frameworkSurumu.count({ where: { regulasyon: { kod: 'AKTIF-REG' }, durum: 'taslak' } })).toBe(1);
  });
});

describe('yükseltme uzlaştırması — bırakılan içerik pasif/arşiv, silme yok, sözlük ve öznitelik "artık" [URN-PKT-006]', () => {
  const TURLER = [
    { kod: 'yuk_tur_a', ad: 'Tür A', etiketAnahtari: null, tesiseBagli: false, sira: 1 },
    { kod: 'yuk_tur_b', ad: 'Tür B', etiketAnahtari: null, tesiseBagli: false, sira: 2 },
  ];
  const OZNITELIKLER = [
    { anahtar: 'yukOzA', tip: 'sayi', birim: null, etiketAnahtari: 'yukOzA', rol: null, grup: null, secenekler: null, kuraldaKullanilir: false, sira: 1 },
    { anahtar: 'yukOzB', tip: 'sayi', birim: null, etiketAnahtari: 'yukOzB', rol: null, grup: null, secenekler: null, kuraldaKullanilir: false, sira: 2 },
  ];
  const YUKUMLULUKLER = [
    { kod: 'YUK-BIL-A', ad: 'Bildirim A', regulasyonKod: 'YUK-A', asgariSiddet: 'yuksek', sureSaat: 24, dayanak: 'md. 1', merci: 'Kurum' },
    { kod: 'YUK-BIL-B', ad: 'Bildirim B', regulasyonKod: 'YUK-B', asgariSiddet: 'yuksek', sureSaat: 48, dayanak: 'md. 1', merci: 'Kurum' },
  ];
  const CERCEVE_A = { 'cerceve/YUK-A.json': cerceve('YUK-A', { tur: 'kamuya_acik', metinDahil: false }), 'cerceve/YUK-A.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n` };
  const v1: PaketDosyalari = {
    'sozluk.json': [SOZLUK_SATIRI('tesis', 'istasyon'), SOZLUK_SATIRI('birim', 'hat')],
    'kapsam-turleri.json': TURLER, 'oznitelikler.json': OZNITELIKLER, ...CERCEVE_A,
    'cerceve/YUK-B.json': cerceve('YUK-B', { tur: 'kamuya_acik', metinDahil: false }), 'cerceve/YUK-B.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n`,
    'yukumlulukler.json': YUKUMLULUKLER,
  };
  /* v2 "B"leri bırakır: tür B, öznitelik B, sözlük `birim`, çerçeve YUK-B, yükümlülük B */
  const v2: PaketDosyalari = {
    'sozluk.json': [SOZLUK_SATIRI('tesis', 'istasyon')],
    'kapsam-turleri.json': [TURLER[0]], 'oznitelikler.json': [OZNITELIKLER[0]], ...CERCEVE_A,
    'yukumlulukler.json': [YUKUMLULUKLER[0]],
  };
  const manifest = { kod: 'YUKSELT-PAKET', sektor: { kod: 'YUKSELT-SEKTOR', ad: 'Yükselt' } };
  const sayim = async () => ({
    tur: await db.kapsamOgesiTuru.count(), yuk: await db.bildirimYukumlulugu.count(), surum: await db.frameworkSurumu.count(),
    sozluk: await db.sektorSozlugu.count(), oz: await db.sektorOznitelikSemasi.count(), madde: await db.madde.count(),
  });

  it('v0.2.0 B\'yi bırakınca: tür B ve yükümlülük B pasif, YUK-B taslağı arşiv, A yeni sürüme geçer; hiçbir satır silinmez; sözlük/öznitelik B artık [URN-PKT-006]', async () => {
    const a = await kur(v1, { ...manifest, surum: '0.1.0' });
    expect(a.ok, JSON.stringify(a)).toBe(true);
    const once = await sayim();
    const b = await kur(v2, { ...manifest, surum: '0.2.0' });
    expect(b.ok, JSON.stringify(b)).toBe(true);
    if (!b.ok) return;
    expect(b.rapor.pasiflestirilen).toEqual({ kapsamTurleri: 1, yukumlulukler: 1, cerceveSurumleri: 1, sozluk: 1, oznitelikler: 1, formlar: 0, raporlar: 0, roller: 0, eslemeler: 0, kurallar: 0 });
    expect(b.rapor.pasifAnahtarlar).toEqual({ sozluk: ['birim@tr'], oznitelikler: ['yukOzB'] });
    expect(await sayim()).toEqual(once);
    expect(await db.kapsamOgesiTuru.findUniqueOrThrow({ where: { kod: 'yuk_tur_b' } })).toMatchObject({ aktif: false, koken: 'paket' });
    expect(await db.kapsamOgesiTuru.findUniqueOrThrow({ where: { kod: 'yuk_tur_a' } })).toMatchObject({ aktif: true, paketSurumId: b.rapor.surumId });
    expect(await db.bildirimYukumlulugu.findUniqueOrThrow({ where: { kod: 'YUK-BIL-B' } })).toMatchObject({ aktif: false });
    expect(await db.bildirimYukumlulugu.findUniqueOrThrow({ where: { kod: 'YUK-BIL-A' } })).toMatchObject({ aktif: true, paketSurumId: b.rapor.surumId });
    expect((await db.frameworkSurumu.findFirstOrThrow({ where: { regulasyon: { kod: 'YUK-B' } } })).durum).toBe('arsiv');
    expect(await db.frameworkSurumu.findFirstOrThrow({ where: { regulasyon: { kod: 'YUK-A' } } })).toMatchObject({ durum: 'taslak', paketSurumId: b.rapor.surumId });
    // sözlük ve öznitelik satırı YERİNDE ama PASİF (2.1): silinmez, okuyucular görmez; kalanlar aktif
    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'YUKSELT-SEKTOR' } });
    expect(await db.sektorSozlugu.findUnique({ where: { sektorId_anahtar_dil: { sektorId: sektor.id, anahtar: 'birim', dil: 'tr' } } })).toMatchObject({ koken: 'paket', aktif: false });
    expect(await db.sektorSozlugu.findUnique({ where: { sektorId_anahtar_dil: { sektorId: sektor.id, anahtar: 'tesis', dil: 'tr' } } })).toMatchObject({ aktif: true, paketSurumId: b.rapor.surumId });
    expect(await db.sektorOznitelikSemasi.findUnique({ where: { sektorId_anahtar: { sektorId: sektor.id, anahtar: 'yukOzB' } } })).toMatchObject({ koken: 'paket', aktif: false });
    expect(await db.sektorOznitelikSemasi.findUnique({ where: { sektorId_anahtar: { sektorId: sektor.id, anahtar: 'yukOzA' } } })).toMatchObject({ aktif: true });
  });

  it('uzlaştırma kiracı satırına dokunmaz: kiracı türü pasifleşmez; tekrar kurulumda uzlaştırma sıfır [URN-PKT-006]', async () => {
    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'YUKSELT-SEKTOR' } });
    await db.kapsamOgesiTuru.create({ data: { kod: 'yuk_kiraci_turu', ad: 'Kiracı türü', koken: 'kiraci', sektorId: sektor.id } });
    const c = await kur(v2, { ...manifest, surum: '0.2.1' });
    expect(c.ok, JSON.stringify(c)).toBe(true);
    if (c.ok) expect(c.rapor.pasiflestirilen).toEqual({ kapsamTurleri: 0, yukumlulukler: 0, cerceveSurumleri: 0, sozluk: 0, oznitelikler: 0, formlar: 0, raporlar: 0, roller: 0, eslemeler: 0, kurallar: 0 });
    expect((await db.kapsamOgesiTuru.findUniqueOrThrow({ where: { kod: 'yuk_kiraci_turu' } })).aktif).toBe(true);
    expect((await db.kapsamOgesiTuru.findUniqueOrThrow({ where: { kod: 'yuk_tur_b' } })).aktif).toBe(false);
  });
});

const SABIT = (tekil: string): PaketDosyalari => ({
  'sozluk.json': [SOZLUK_SATIRI('tesis', tekil)],
  'cerceve/SABIT-REG.json': cerceve('SABIT-REG', { tur: 'kamuya_acik', metinDahil: false }),
  'cerceve/SABIT-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n`,
});
const MANIFEST_SABIT = { kod: 'SABIT-PAKET', sektor: { kod: 'SABIT-SEKTOR', ad: 'Sabit' }, surum: '1.0.0' };
const maddeIdleri = async (regKod: string) =>
  (await db.madde.findMany({ where: { regulasyon: { kod: regKod } }, select: { id: true } })).map((x) => x.id).sort();

describe('kurulu sürüm değişmez · bağımlılık kararı transaction içinde [URN-PKT-008]', () => {
  const manifest = MANIFEST_SABIT;

  it('aynı sürüm numarasıyla İÇERİĞİ DEĞİŞMİŞ paket reddedilir (SÜRÜM); sürüm kaydı ve içerik değişmez; aynı içerik idempotent; yeni numara geçer [URN-PKT-008]', async () => {
    /* Ölçüldü: özetleri yeniden yazılmış paket aynı `surum` ile kurulunca sürüm
       kaydı ve altındaki içerik eziliyor, "o sürümde ne vardı" izi yok oluyordu. */
    const a = await kur(SABIT('sabit'), manifest);
    expect(a.ok, JSON.stringify(a)).toBe(true);
    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'SABIT-SEKTOR' } });
    const surumKaydi = await db.icerikPaketiSurumu.findFirstOrThrow({ where: { paket: { kod: 'SABIT-PAKET' }, surum: '1.0.0' } });
    const b = await kur(SABIT('değişti'), manifest);
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.hatalar[0]).toMatchObject({ sinif: 'SÜRÜM', konum: 'surum', mesaj: expect.stringContaining('değişmez alanları farklı: icerikOzetleri') });
    const tesis = await db.sektorSozlugu.findUniqueOrThrow({ where: { sektorId_anahtar_dil: { sektorId: sektor.id, anahtar: 'tesis', dil: 'tr' } } });
    expect(tesis.tekil).toBe('sabit');
    const sonra = await db.icerikPaketiSurumu.findUniqueOrThrow({ where: { id: surumKaydi.id } });
    expect(sonra.ozetJson).toBe(surumKaydi.ozetJson);
    expect(sonra.manifestJson).toBe(surumKaydi.manifestJson);
    const c = await kur(SABIT('sabit'), manifest);
    expect(c.ok, JSON.stringify(c)).toBe(true);
    const d = await kur(SABIT('değişti'), { ...manifest, surum: '1.0.1' });
    expect(d.ok, JSON.stringify(d)).toBe(true);
    expect((await db.sektorSozlugu.findUniqueOrThrow({ where: { id: tesis.id } })).tekil).toBe('değişti');
  });

  it('değişmez alan (sektör · lisans) aynı sürümde değişemez; betimleyici alan (ad) değişebilir ve madde kimlikleri korunur [URN-PKT-008]', async () => {
    /* Ölçüldü: yalnız özetler karşılaştırılınca aynı sürümde `sektor` değiştirilip
       sözlük başka sektöre yazılabiliyordu (inceleme bulgusu). */
    const once = await maddeIdleri('SABIT-REG');
    const sektor = await kur(SABIT('değişti'), { ...manifest, surum: '1.0.1', sektor: { kod: 'SABIT-SEKTOR-2', ad: 'Sabit 2' } });
    expect(sektor.ok).toBe(false);
    if (!sektor.ok) expect(sektor.hatalar[0].mesaj).toMatch(/değişmez alanları farklı: sektor/);
    expect(await db.sektor.findUnique({ where: { kod: 'SABIT-SEKTOR-2' } })).toBeNull();
    const lisans = await kur(SABIT('değişti'), { ...manifest, surum: '1.0.1', lisans: { tur: 'telifli', metinDahil: false } });
    expect(lisans.ok).toBe(false);
    if (!lisans.ok) expect(lisans.hatalar[0].mesaj).toMatch(/değişmez alanları farklı: lisans/);
    const ad = await kur(SABIT('değişti'), { ...manifest, surum: '1.0.1', ad: 'Sabit paket, yeni ad' });
    expect(ad.ok, JSON.stringify(ad)).toBe(true);
    expect((await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'SABIT-PAKET' } })).ad).toBe('Sabit paket, yeni ad');
    // aynı içerik: madde ağacına dokunulmadı, kimlikler aynı
    expect(await maddeIdleri('SABIT-REG')).toEqual(once);
  });

  it('bağımlılık kararı transaction İÇİNDE — transaction öncesi kök istemciye dokunan kurulum kırmızı [URN-PKT-007]', async () => {
    /* Sahte istemci: `$transaction` sınırda patlar; ondan önce kök düzeyde
       HER model erişimi kaydedilir. Doğrulayıcı dosyadan geçer, veritabanına
       ilk dokunuş transaction olmalı. */
    const kokte: string[] = [];
    const sahte = new Proxy({}, { get(_, ozellik) {
      if (ozellik === '$transaction') return async () => { throw new Error('TRANSACTION-SINIRI'); };
      kokte.push(String(ozellik));
      return undefined;
    } }) as unknown as PrismaClient;
    const dizin = paketYaz(SABIT('sabit'), { ...manifest, kod: 'BAGIMLI-PAKET', bagimliliklar: ['SABIT-PAKET'] });
    await expect(paketiKur(dizin, { kuranId, istemci: sahte })).rejects.toThrow('TRANSACTION-SINIRI');
    expect(kokte).toEqual([]);
  });
});

describe('kaldırma bağımlıları korur · geri kurulum arşiv taslağını taslağa döndürür [URN-PKT-009]', () => {
  const BAG: PaketDosyalari = {
    'cerceve/BAG-REG.json': cerceve('BAG-REG', { tur: 'kamuya_acik', metinDahil: false }),
    'cerceve/BAG-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n`,
  };

  it('kurulu bir paket bağımlıysa kaldırma reddedilir; bağımlı kaldırılınca kaldırılır [URN-PKT-009]', async () => {
    /* Ölçüldü: yalnız paketin kendi aktif sürümüne bakılıyordu; A kaldırılınca
       A'ya bağımlı B "kurulu" kalıyordu (inceleme bulgusu). */
    const b = await kur(BAG, { kod: 'BAGIMLI-PAKET', sektor: { kod: 'BAGIMLI-SEKTOR', ad: 'Bağımlı' }, bagimliliklar: ['SABIT-PAKET'] });
    expect(b.ok, JSON.stringify(b)).toBe(true);
    const red = await paketiKaldir('SABIT-PAKET', db);
    expect(red.ok).toBe(false);
    if (!red.ok) expect(red.hata).toMatch(/bağımlı kurulu paket var: BAGIMLI-PAKET/);
    expect((await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'SABIT-PAKET' } })).durum).toBe('kurulu');
    expect((await paketiKaldir('BAGIMLI-PAKET', db)).ok).toBe(true);
    const k = await paketiKaldir('SABIT-PAKET', db);
    expect(k.ok, JSON.stringify(k)).toBe(true);
  });

  it('kaldırılan paket aynı içerikle geri kurulur: arşiv taslak taslağa döner, madde kimlikleri korunur, paket kurulu [URN-PKT-009]', async () => {
    /* Ölçüldü: kaldırma taslağı arşive çekiyor, geri kurulum "taslak değil" diye
       reddediyordu — aynı içerikle geri dönüş yeni etiket istiyordu (inceleme bulgusu). */
    const once = await maddeIdleri('SABIT-REG');
    expect((await db.frameworkSurumu.findFirstOrThrow({ where: { regulasyon: { kod: 'SABIT-REG' } } })).durum).toBe('arsiv');
    const g = await kur(SABIT('değişti'), { ...MANIFEST_SABIT, surum: '1.0.1', ad: 'Sabit paket, yeni ad' });
    expect(g.ok, JSON.stringify(g)).toBe(true);
    expect((await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'SABIT-PAKET' } })).durum).toBe('kurulu');
    expect((await db.frameworkSurumu.findFirstOrThrow({ where: { regulasyon: { kod: 'SABIT-REG' } } })).durum).toBe('taslak');
    expect(await maddeIdleri('SABIT-REG')).toEqual(once);
  });
});

describe('kiracının madde DÜZENLEMESİ (skaler, iz bırakır) taslak yenilemesinde ezilmez [URN-PKT-004]', () => {
  const DUZ = (baslik: string, etiket = 'test-1'): PaketDosyalari => ({
    'cerceve/DUZ-REG.json': cerceve('DUZ-REG', { tur: 'kamuya_acik', metinDahil: false }, { surumEtiketi: etiket }),
    'cerceve/DUZ-REG.csv': `${CSV_BASLIK}\n1;;${baslik};;0;;\n`,
  });
  const manifest = { kod: 'DUZENLE-PAKET', sektor: { kod: 'DUZENLE-SEKTOR', ad: 'Düzenle' } };

  it('hedef olgunluk gibi skaler düzenleme izi olan madde: yeni sürüm aynı etiketi yenileyemez (SÜRÜM); yeni etiket kurulur [URN-PKT-004]', async () => {
    /* Ölçüldü: bağ kontrolü yalnız ilişkilere bakıyordu; `hedefOlgunlukKaydet`
       ilişki değil skaler yazar, `deleteMany` düzenlemeyi ve iz hedefini yok
       ediyordu (inceleme bulgusu). Karar kaynağı değişmez denetim izidir. */
    const a = await kur(DUZ('Amaç'), { ...manifest, surum: '0.1.0' });
    expect(a.ok, JSON.stringify(a)).toBe(true);
    const madde = await db.madde.findFirstOrThrow({ where: { regulasyon: { kod: 'DUZ-REG' } } });
    // kiracı hedef olgunluk kaydetti — ürün yolu `hedefOlgunlukKaydet`: madde.update + iz (test ikisini doğrudan yazar)
    await db.madde.update({ where: { id: madde.id }, data: { olgunlukSeviyesi: 3 } });
    await db.aktiviteKaydi.create({ data: { aktorId: kuranId, varlikTipi: 'Madde', varlikId: madde.id, eylem: 'guncelleme', alan: 'hedefOlgunluk', oncekiDeger: 'tanımsız', yeniDeger: '3' } });
    const b = await kur(DUZ('Amaç (yeni başlık)'), { ...manifest, surum: '0.2.0' });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.hatalar[0]).toMatchObject({ sinif: 'SÜRÜM', mesaj: expect.stringContaining('1 düzenleme izi') });
    expect(await db.madde.findUniqueOrThrow({ where: { id: madde.id } })).toMatchObject({ olgunlukSeviyesi: 3, baslik: 'Amaç' });
    expect(await db.icerikPaketiSurumu.findFirst({ where: { paket: { kod: 'DUZENLE-PAKET' }, surum: '0.2.0' } })).toBeNull();
    const c = await kur(DUZ('Amaç (yeni başlık)', 'test-2'), { ...manifest, surum: '0.2.0' });
    expect(c.ok, JSON.stringify(c)).toBe(true);
    expect(await db.frameworkSurumu.count({ where: { regulasyon: { kod: 'DUZ-REG' } } })).toBe(2);
    expect(await db.madde.findUniqueOrThrow({ where: { id: madde.id } })).toMatchObject({ olgunlukSeviyesi: 3 });
  });
});

describe('kurulu TELİFLİ çerçeveye paket metin getiremez [URN-PKT-002]', () => {
  /* Bağımsız inceleme bulgusu (PR #43): doğrulayıcı paketin KENDİ kimliğini
     bilir, kurucu KURULUYU. Kurulu `Regulasyon.lisansTuru='telifli'` iken
     ikinci bir paket aynı kodu "kamuya_acik, metinDahil" diye beyan edip tam
     metin yazabiliyordu; eşlemede bu kilit vardı, çerçeve metninde yoktu. */
  it('kurulu regülasyon telifliyse kamuya açık beyanlı paket LİSANS ile reddedilir [URN-PKT-002]', async () => {
    const sektor = { kod: 'TELIF-SEKTOR', ad: 'Telif' };
    const telifli = paketYaz({
      'sozluk.json': [SOZLUK_SATIRI('tesis', 'şube')],
      'cerceve/TLF-REG.json': cerceve('TLF-REG', { tur: 'telifli', metinDahil: false }),
      'cerceve/TLF-REG.csv': `${CSV_BASLIK}\nA.5;;Organizasyonel kontroller;;0;;\n`,
    }, { kod: 'TELIF-A', sektor, surum: '0.1.0' });
    const a = await paketiKur(telifli, { kuranId, istemci: db });
    expect(a.ok, JSON.stringify(a)).toBe(true);
    expect((await db.regulasyon.findUniqueOrThrow({ where: { kod: 'TLF-REG' } })).lisansTuru).toBe('telifli');

    const acik = paketYaz({
      'sozluk.json': [SOZLUK_SATIRI('tesis', 'şube')],
      'cerceve/TLF-REG.json': { ...cerceve('TLF-REG', { tur: 'kamuya_acik', metinDahil: true }), surumEtiketi: 'test-2' },
      'cerceve/TLF-REG.csv': `${CSV_BASLIK}\nA.5;;Organizasyonel kontroller;Standardın tam metni buraya yazılamaz;0;;\n`,
    }, { kod: 'TELIF-B', sektor, surum: '0.1.0' });
    const b = await paketiKur(acik, { kuranId, istemci: db });
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.hatalar[0]).toMatchObject({ sinif: 'LİSANS', mesaj: expect.stringContaining('kurulu çerçevesi telifli') });
    // hiçbir satır yazılmadı: ikinci paket kurulmadı, metin girmedi
    expect(await db.icerikPaketi.count({ where: { kod: 'TELIF-B' } })).toBe(0);
    expect(await db.madde.count({ where: { kod: 'TLF-REG-A.5', metin: { contains: 'tam metni' } } })).toBe(0);
  });
});

describe('madde ağacı partilerle yazılır — üst madde aynı partideyse önce yazılır [URN-PKT-003]', () => {
  it('211 satır (kök + 150 kardeş + 60 halkalık zincir) doğru üst bağlarıyla yazılır [URN-PKT-003]', async () => {
    /* Ölçüldü: 600 madde tek tek `create` ile ve bütçesiz transaction'da yazılıyordu
       (inceleme bulgusu). Parti büyüklüğü 200: kardeşler partiyi doldurur, zincir
       her adımda partiyi boşaltmaya zorlar. */
    const satirlar: string[] = ['R;;Kök;;0;;'];
    for (let i = 1; i <= 150; i++) satirlar.push(`C${i};R;Çocuk ${i};;${i};;`);
    let ust = 'C1';
    for (let i = 1; i <= 60; i++) { satirlar.push(`Z${i};${ust};Zincir ${i};;${200 + i};;`); ust = `Z${i}`; }
    const s = await kur({
      'cerceve/PARTI-REG.json': cerceve('PARTI-REG', { tur: 'kamuya_acik', metinDahil: false }),
      'cerceve/PARTI-REG.csv': `${CSV_BASLIK}\n${satirlar.join('\n')}\n`,
    }, { kod: 'PARTI-PAKET', sektor: { kod: 'PARTI-SEKTOR', ad: 'Parti' } });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.sayilar.maddeler).toBe(211);
    const maddeler = await db.madde.findMany({ where: { regulasyon: { kod: 'PARTI-REG' } }, select: { id: true, kod: true, ustMaddeId: true } });
    expect(maddeler).toHaveLength(211);
    const idler = new Map(maddeler.map((m) => [m.kod, m.id]));
    const ustu = new Map(maddeler.map((m) => [m.kod, m.ustMaddeId]));
    expect(ustu.get('PARTI-REG-R')).toBeNull();
    for (let i = 1; i <= 150; i++) expect(ustu.get(`PARTI-REG-C${i}`), `C${i}`).toBe(idler.get('PARTI-REG-R'));
    expect(ustu.get('PARTI-REG-Z1')).toBe(idler.get('PARTI-REG-C1'));
    for (let i = 2; i <= 60; i++) expect(ustu.get(`PARTI-REG-Z${i}`), `Z${i}`).toBe(idler.get(`PARTI-REG-Z${i - 1}`));
  });
});
