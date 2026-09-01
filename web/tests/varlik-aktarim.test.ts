import { describe, expect, it, beforeAll, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

// ENV, db'ye dokunan HER importtan önce ayarlanmalı (izolasyon kalıbı)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-varlik-aktarim-'));
const testDb = path.join(dizin, 't.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Görev B (aktarimOnayla) server action'dır ve oturum ister; çerez ikizi
   gerçek bir Oturum satırının token'ını döndürür. Bu paketteki diğer
   testler next/headers kullanmaz — mock onları etkilemez. */
const OTURUM_TOKENI = randomBytes(32).toString('base64url');
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => ({ value: OTURUM_TOKENI }), set: () => {}, delete: () => {},
  }),
}));

const { db } = await import('@/lib/db');
const {
  eslemeOner, eslemeDogrula, satirlariCoz, dosyayiAyristir, tarihCoz,
  referanslariYukle, mevcutVarliklariYukle, kapsamKur, aktarimiUygula,
} = await import('@/lib/entegrasyon/varlikAktarim');
type Esleme = Record<string, string>;
type AktifKullanici = import('@/lib/auth').AktifKullanici;

/* P1-2 · CMDB toplu aktarımı.

   Sınanan sözleşme maddeleri:
     · kolon eşleme önerilir, kullanıcı onaylar; etiket eşlenmeden aktarım yok
     · etiket zorunlu — yoksa satır reddedilir
     · duplicate tespiti üç anahtar üzerinden; ÇAKIŞAN eşleşme yazılmaz
     · commit atomik — ortada patlayan satır TÜMÜNÜ geri alır
     · idempotent — aynı aktarım iki kez onaylanamaz, aynı içerik varlık çoğaltmaz
     · santral kapsamı — yetkisiz tesise satır yazılamaz
     · boş hücre 'bilinmiyor'/null olur, 0/false OLMAZ */

const KAPSAMSIZ = { izinliTesisler: null, yazabilir: () => true };
const BOS_REF = {
  turler: new Map<string, string>(), tesisler: new Map<string, string>(),
  sistemler: new Map<string, string>(), bolgeler: new Map<string, string>(),
  kullanicilar: new Map<string, string>(),
};

/* ── ortam: testin kendi türü, tesisleri, kullanıcıları ──────────────── */
let turId = '';
let turKod = '';
let tesisA = { id: '', kod: '' };
let tesisB = { id: '', kod: '' };
let global: AktifKullanici;
let tesisliA: AktifKullanici;

beforeAll(async () => {
  const tur = await db.varlikTuru.create({
    data: { kod: 'TEST-AKTARIM-TUR', ad: 'Aktarım test türü', sinif: 'BT' } });
  turId = tur.id; turKod = tur.kod;

  const a = await db.tesis.create({ data: { kod: 'TEST-AKT-A', ad: 'Aktarım Test A' } });
  const b = await db.tesis.create({ data: { kod: 'TEST-AKT-B', ad: 'Aktarım Test B' } });
  tesisA = { id: a.id, kod: a.kod };
  tesisB = { id: b.id, kod: b.kod };

  const k1 = await db.kullanici.create({
    data: { eposta: 'aktarim.global@test.local', adSoyad: 'Global Onaycı' } });
  const k2 = await db.kullanici.create({
    data: { eposta: 'aktarim.tesisa@test.local', adSoyad: 'A Santral Onaycısı' } });
  global = kisi(k1.id, [yetki({ rol: 'yonetici' })]);
  tesisliA = kisi(k2.id, [yetki({ rol: 'yonetici', tesisId: tesisA.id })]);
});

const yetki = (p: Partial<AktifKullanici['yetkiler'][number]>) => ({
  rol: 'yonetici', surecId: null, tesisId: null, tuzelKisiId: null,
  regulasyonId: null, modul: null, ...p,
});
const kisi = (id: string, yetkiler: AktifKullanici['yetkiler']): AktifKullanici => ({
  id, adSoyad: 'Test', eposta: `${id}@test.local`, unvan: null, yetkiler,
});

/** Doğrulanmış (onay bekleyen) bir aktarım kaydı kurar. */
async function aktarimKur(
  dosyaAdi: string, basliklar: string[], satirlar: string[][], esleme: Esleme,
) {
  const ham = satirlar.map((s) =>
    Object.fromEntries(basliklar.map((b, i) => [b, s[i] ?? ''])));
  return db.varlikAktarimi.create({ data: {
    dosyaAdi, kaynakTipi: 'csv', durum: 'dogrulama_bekliyor',
    basliklarJson: JSON.stringify(basliklar),
    eslemeJson: JSON.stringify(esleme),
    okunan: ham.length,
    raporJson: JSON.stringify({ ham }),
  } });
}

/* ═══════════════════════════════════════════════════════════════════════ */

describe('Kolon eşleme — öneri üretilir, kararı kullanıcı verir', () => {
  it('yaygın başlıklar tr/en fark etmeksizin önerilir; tanınmayan başlık boş kalır', () => {
    const oneri = eslemeOner([
      'asset_tag', 'Serial No', 'Üretici', 'site_code', 'MAC Address',
      'End of Support', 'muhasebe_kodu',
    ]);
    expect(oneri['asset_tag']).toBe('etiket');
    expect(oneri['Serial No']).toBe('seriNo');
    expect(oneri['Üretici']).toBe('uretici');
    expect(oneri['site_code']).toBe('tesisKodu');
    expect(oneri['MAC Address']).toBe('macAdresi');
    expect(oneri['End of Support']).toBe('eosTarihi');
    // Tanınmayan başlık UYDURULMAZ — boş kalır, kullanıcı seçer.
    expect(oneri['muhasebe_kodu']).toBe('');
  });

  it('aynı hedef alana iki başlık önerilmez', () => {
    const oneri = eslemeOner(['serial', 'serial_number']);
    expect(Object.values(oneri).filter((v) => v === 'seriNo')).toHaveLength(1);
  });

  it('etiket eşlenmeden aktarım yapılamaz; çift eşleme reddedilir', () => {
    expect(eslemeDogrula({ ad: 'ad' }).join(' ')).toContain('Etiket alanı eşlenmeden');
    expect(eslemeDogrula({ a: 'etiket', b: 'etiket' }).join(' ')).toContain('2 kolon eşlenmiş');
    expect(eslemeDogrula({ a: 'etiket', b: 'seriNo' })).toEqual([]);
  });
});

describe('Doğrulama — zorunlu alan, sözlük, tarih', () => {
  const coz = (satirlar: Record<string, string>[], esleme: Esleme, ek = {}) =>
    satirlariCoz({ satirlar, esleme, referanslar: BOS_REF, mevcutlar: [], kapsam: KAPSAMSIZ, ...ek });

  it('etiketi boş satır REDDEDİLİR, sessizce atlanmaz', () => {
    const s = coz(
      [{ tag: 'A-1' }, { tag: '' }, { tag: '   ' }],
      { tag: 'etiket', tur: 'turKodu' },
    );
    // İki boş etiket + türü çözülemeyen A-1 → üç satır da reddedilir.
    expect(s.sayac.hatali).toBe(3);
    expect(s.hatalar.filter((h) => h.sebep.includes('Etiket boş'))).toHaveLength(2);
    expect(s.hatalar.filter((h) => h.sebep.includes('tür kodu zorunlu'))).toHaveLength(1);
    expect(s.satirlar).toHaveLength(0);
  });

  it('dosya içinde tekrar eden etiket ikinci kez yazılmaz', () => {
    const ref = { ...BOS_REF, turler: new Map([['testtur', 'T1']]) };
    const s = coz([{ tag: 'A-1', t: 'test-tur' }, { tag: 'a-1', t: 'test-tur' }],
      { tag: 'etiket', t: 'turKodu' }, { referanslar: ref });
    expect(s.sayac.gecerli).toBe(1);
    expect(s.hatalar[0].sebep).toContain('etiket tekrarı');
  });

  it('sözlük dışı değer ve okunamayan tarih satırı reddeder — uydurulmaz', () => {
    const ref = { ...BOS_REF, turler: new Map([['testtur', 'T1']]) };
    const s = coz(
      [{ tag: 'A-1', t: 'test-tur', k: 'çok kritik', e: '31/31/2026' }],
      { tag: 'etiket', t: 'turKodu', k: 'kritiklik', e: 'eosTarihi' },
      { referanslar: ref },
    );
    expect(s.sayac.gecerli).toBe(0);
    expect(s.hatalar[0].sebep).toContain('Kritiklik');
    expect(s.hatalar[0].sebep).toContain('EOS');
  });

  it('tarih GG.AA.YYYY ve YYYY-AA-GG okur, anlamsızı reddeder', () => {
    expect(tarihCoz('31.12.2026').ok).toBe(true);
    expect(tarihCoz('2026-12-31').ok).toBe(true);
    expect(tarihCoz('31.02.2026').ok).toBe(false); // 31 Şubat yok
    expect(tarihCoz('yakında').ok).toBe(false);
  });

  it('tanımsız referans kodu satırı reddeder, boş id yazmaz', () => {
    const s = coz([{ tag: 'A-1', t: 'OLMAYAN-TUR' }], { tag: 'etiket', t: 'turKodu' });
    expect(s.hatalar[0].sebep).toContain('tanımlı değil');
  });
});

describe('Duplicate tespiti — üç anahtar, çakışma yazılmaz', () => {
  const mevcutlar = [
    { id: 'V-A', etiket: 'A-1', seriNo: 'S1', macAdresi: 'AA:BB:CC:DD:EE:FF', tesisId: null },
    { id: 'V-B', etiket: 'B-1', seriNo: 'S2', macAdresi: null, tesisId: null },
  ];
  const ref = { ...BOS_REF, turler: new Map([['testtur', 'T1']]) };
  const esleme: Esleme = { tag: 'etiket', t: 'turKodu', sn: 'seriNo', mac: 'macAdresi' };
  const coz = (satirlar: Record<string, string>[]) =>
    satirlariCoz({ satirlar, esleme, referanslar: ref, mevcutlar, kapsam: KAPSAMSIZ });

  it('etiket eşleşmesi güncelleme, eşleşmeyen yeni', () => {
    const s = coz([{ tag: 'A-1', t: 'test-tur' }, { tag: 'C-1', t: 'test-tur' }]);
    expect(s.satirlar[0]).toMatchObject({ islem: 'guncelleme', hedefId: 'V-A', eslesmeAlani: 'etiket' });
    expect(s.satirlar[1]).toMatchObject({ islem: 'yeni', hedefId: null });
    expect(s.sayac.yinelenen).toBe(1);
  });

  it('seri no ve MAC üzerinden de eşleşir; MAC biçimi normalize edilir', () => {
    const s = coz([
      { tag: 'YENI-1', t: 'test-tur', sn: 's1' },
      { tag: 'YENI-2', t: 'test-tur', mac: 'aa-bb-cc-dd-ee-ff' },
    ]);
    expect(s.satirlar[0]).toMatchObject({ hedefId: 'V-A', eslesmeAlani: 'seriNo' });
    expect(s.satirlar[1]).toMatchObject({ hedefId: 'V-A', eslesmeAlani: 'macAdresi' });
  });

  it('ÇAKIŞAN eşleşme (etiket→A, seri→B) sessizce birine yazılmaz', () => {
    const s = coz([{ tag: 'A-1', t: 'test-tur', sn: 'S2' }]);
    expect(s.satirlar).toHaveLength(0);
    expect(s.hatalar[0].sebep).toContain('Çakışan eşleşme');
    expect(s.hatalar[0].sebep).toContain('etiket→A-1');
    expect(s.hatalar[0].sebep).toContain('seriNo→B-1');
  });
});

describe('Dosya ayrıştırma', () => {
  it('CSV başlık satırını ve hücreleri okur; boş satır atılır', async () => {
    const csv = 'asset_tag;serial;site_code\nA-1;S-1;TEST-AKT-A\n\nA-2;;TEST-AKT-A\n';
    const c = await dosyayiAyristir(Buffer.from(csv, 'utf8'), 'envanter.csv');
    expect(c.kaynakTipi).toBe('csv');
    expect(c.basliklar).toEqual(['asset_tag', 'serial', 'site_code']);
    expect(c.satirlar).toHaveLength(2);
    // Boş hücre '' gelir — 0 ya da 'null' metni DEĞİL.
    expect(c.satirlar[1].serial).toBe('');
  });
});

/* ═══ Uçtan uca: commit, atomiklik, idempotency, kapsam ════════════════ */

describe('Commit — transaction, köken, denetim izi', () => {
  it('onay yeni varlık açar, kökeni guven=null ile yazar, izi bırakır', async () => {
    const a = await aktarimKur(
      'ilk-yukleme.csv',
      ['tag', 'ad', 'tur', 'tesis', 'kritiklik'],
      [['E2E-1', 'Test sunucu', turKod, tesisA.kod, 'yuksek']],
      { tag: 'etiket', ad: 'ad', tur: 'turKodu', tesis: 'tesisKodu', kritiklik: 'kritiklik' },
    );
    const sonuc = await aktarimiUygula({ aktarimId: a.id, onaylayan: global });
    expect(sonuc).toEqual({ eklenen: 1, guncellenen: 0 });

    const v = await db.varlik.findUniqueOrThrow({ where: { etiket: 'E2E-1' } });
    expect(v.ad).toBe('Test sunucu');
    expect(v.turId).toBe(turId);
    expect(v.tesisId).toBe(tesisA.id);
    expect(v.kritiklik).toBe('yuksek');

    const koken = await db.veriKokeni.findFirstOrThrow({
      where: { varlikTipi: 'Varlik', varlikId: v.id } });
    expect(koken.kaynakSistem).toBe('dosya:ilk-yukleme.csv');
    expect(koken.kaynakKayitId).toBe('E2E-1');
    // guven null = ÖLÇÜLMEDİ. 1.0 yazmak yalan olurdu.
    expect(koken.guven).toBeNull();
    expect(koken.kokenTipi).toBe('otomatik');
    expect(koken.dogrulamaDurumu).toBe('dogrulanmadi');

    const kayit = await db.varlikAktarimi.findUniqueOrThrow({ where: { id: a.id } });
    expect(kayit.durum).toBe('onaylandi');
    expect(kayit.onaylayanId).toBe(global.id);
    expect(await db.aktiviteKaydi.count({
      where: { varlikTipi: 'VarlikAktarimi', varlikId: a.id, eylem: 'onay' } })).toBe(1);
  });

  it('boş hücre bilinmiyor/null yazar — 0 ya da false YAZMAZ', async () => {
    const a = await aktarimKur(
      'bos-hucreler.csv',
      ['tag', 'tur', 'tesis', 'kritiklik', 'edr', 'uzak', 'yama'],
      [['E2E-BOS', turKod, tesisA.kod, '', '', '', '']],
      { tag: 'etiket', tur: 'turKodu', tesis: 'tesisKodu', kritiklik: 'kritiklik',
        edr: 'edrDurumu', uzak: 'uzaktanErisim', yama: 'yamaDurumu' },
    );
    await aktarimiUygula({ aktarimId: a.id, onaylayan: global });
    const v = await db.varlik.findUniqueOrThrow({ where: { etiket: 'E2E-BOS' } });
    expect(v.kritiklik).toBe('bilinmiyor');
    expect(v.edrDurumu).toBe('bilinmiyor');
    expect(v.yamaDurumu).toBe('bilinmiyor');
    // Üç durumlu alan: bilinmiyorsa null. false OLURSA "uzaktan erişim yok"
    // diye okunur ve yanlış bir güvence verir.
    expect(v.uzaktanErisim).toBeNull();
    expect(v.uzaktanErisim).not.toBe(false);
  });

  it('güncellemede boş hücre bilinen değeri SİLMEZ', async () => {
    const a = await aktarimKur(
      'guncelle-bos.csv', ['tag', 'tur', 'kritiklik'],
      [['E2E-1', turKod, '']],
      { tag: 'etiket', tur: 'turKodu', kritiklik: 'kritiklik' },
    );
    await aktarimiUygula({ aktarimId: a.id, onaylayan: global });
    const v = await db.varlik.findUniqueOrThrow({ where: { etiket: 'E2E-1' } });
    expect(v.kritiklik).toBe('yuksek'); // 'bilinmiyor'a düşmedi
  });
});

describe('Atomiklik — yarım import yok', () => {
  it('ortada patlayan satır TÜM aktarımı geri alır; hiçbir satır yazılmaz', async () => {
    const a = await aktarimKur(
      'patlayan.csv', ['tag', 'tur', 'tesis'],
      [
        ['ROLLBACK-1', turKod, tesisA.kod],
        ['ROLLBACK-2', turKod, tesisA.kod],
        ['ROLLBACK-3', turKod, tesisA.kod],
      ],
      { tag: 'etiket', tur: 'turKodu', tesis: 'tesisKodu' },
    );

    await expect(aktarimiUygula({
      aktarimId: a.id, onaylayan: global,
      // Kontrollü arıza: ikinci satırda patlat.
      satirAdimi: (_s, i) => { if (i === 1) throw new Error('disk doldu'); },
    })).rejects.toThrow('hiçbir satır yazılmadı');

    // İlk satır da dahil HİÇBİRİ yazılmamış olmalı.
    expect(await db.varlik.count({
      where: { etiket: { in: ['ROLLBACK-1', 'ROLLBACK-2', 'ROLLBACK-3'] } } })).toBe(0);
    expect(await db.veriKokeni.count({
      where: { kaynakSistem: 'dosya:patlayan.csv' } })).toBe(0);
    expect(await db.aktiviteKaydi.count({
      where: { korelasyonId: a.id } })).toBe(0);

    // Sessiz hata yok: aktarım 'hata' durumuna düşer, neden raporda durur.
    const kayit = await db.varlikAktarimi.findUniqueOrThrow({ where: { id: a.id } });
    expect(kayit.durum).toBe('hata');
    expect(kayit.eklenen).toBe(0);
    expect(JSON.parse(kayit.raporJson ?? '{}').hataMesaji).toContain('disk doldu');
    expect(await db.aktiviteKaydi.count({
      where: { varlikTipi: 'VarlikAktarimi', varlikId: a.id } })).toBe(1);
  });

  it('geri alınmış aktarım yeniden onaylanamaz', async () => {
    const kayit = await db.varlikAktarimi.findFirstOrThrow({
      where: { dosyaAdi: 'patlayan.csv' } });
    await expect(aktarimiUygula({ aktarimId: kayit.id, onaylayan: global }))
      .rejects.toThrow('onay beklemiyor');
  });
});

describe('Idempotency', () => {
  it('aynı aktarım ikinci kez onaylanamaz', async () => {
    const a = await db.varlikAktarimi.findFirstOrThrow({ where: { dosyaAdi: 'ilk-yukleme.csv' } });
    await expect(aktarimiUygula({ aktarimId: a.id, onaylayan: global }))
      .rejects.toThrow('ikinci kez aktarılamaz');
  });

  it('aynı içerik yeniden aktarılırsa yeni varlık açılmaz, mevcut güncellenir', async () => {
    const oncekiSayi = await db.varlik.count();
    const a = await aktarimKur(
      'ilk-yukleme.csv', ['tag', 'ad', 'tur', 'tesis', 'kritiklik'],
      [['E2E-1', 'Test sunucu (v2)', turKod, tesisA.kod, 'kritik']],
      { tag: 'etiket', ad: 'ad', tur: 'turKodu', tesis: 'tesisKodu', kritiklik: 'kritiklik' },
    );
    const sonuc = await aktarimiUygula({ aktarimId: a.id, onaylayan: global });
    expect(sonuc).toEqual({ eklenen: 0, guncellenen: 1 });
    expect(await db.varlik.count()).toBe(oncekiSayi);

    const v = await db.varlik.findUniqueOrThrow({ where: { etiket: 'E2E-1' } });
    expect(v.ad).toBe('Test sunucu (v2)');
    expect(v.kritiklik).toBe('kritik');
    // Köken çoğalmaz: aynı (varlık, kaynak, kaynak kaydı) tazelenir.
    expect(await db.veriKokeni.count({ where: {
      varlikId: v.id, kaynakSistem: 'dosya:ilk-yukleme.csv' } })).toBe(1);
  });
});

describe('Santral kapsamı — yetkisiz tesise yazılamaz', () => {
  it('kapsam dışı tesisin satırı hata listesine düşer, kapsam içi yazılır', async () => {
    const a = await aktarimKur(
      'kapsam.csv', ['tag', 'tur', 'tesis'],
      [
        ['KAPSAM-ICI', turKod, tesisA.kod],
        ['KAPSAM-DISI', turKod, tesisB.kod],
        ['KAPSAM-GLOBAL', turKod, ''], // tesissiz = global yazma
      ],
      { tag: 'etiket', tur: 'turKodu', tesis: 'tesisKodu' },
    );
    const sonuc = await aktarimiUygula({ aktarimId: a.id, onaylayan: tesisliA });
    expect(sonuc).toEqual({ eklenen: 1, guncellenen: 0 });

    expect(await db.varlik.count({ where: { etiket: 'KAPSAM-ICI' } })).toBe(1);
    expect(await db.varlik.count({ where: { etiket: 'KAPSAM-DISI' } })).toBe(0);
    expect(await db.varlik.count({ where: { etiket: 'KAPSAM-GLOBAL' } })).toBe(0);

    const rapor = JSON.parse(
      (await db.varlikAktarimi.findUniqueOrThrow({ where: { id: a.id } })).raporJson ?? '{}');
    const sebepler = (rapor.hatalar as { etiket: string; sebep: string }[])
      .map((h) => `${h.etiket}: ${h.sebep}`).join(' | ');
    expect(sebepler).toContain('KAPSAM-DISI');
    expect(sebepler).toContain('Kapsam dışı');
    expect(sebepler).toContain('KAPSAM-GLOBAL');
  });

  it('kapsam dışı MEVCUT varlığın güncellenmesi de reddedilir', async () => {
    // B santralinde global yetkiyle bir varlık açılır…
    const kur = await aktarimKur(
      'b-santral.csv', ['tag', 'tur', 'tesis'],
      [['KAPSAM-B-VARLIK', turKod, tesisB.kod]],
      { tag: 'etiket', tur: 'turKodu', tesis: 'tesisKodu' },
    );
    await aktarimiUygula({ aktarimId: kur.id, onaylayan: global });

    // …A santralinin yöneticisi onu dosyadan güncelleyemez.
    const a = await aktarimKur(
      'sizinti-denemesi.csv', ['tag', 'tur', 'kritiklik'],
      [['KAPSAM-B-VARLIK', turKod, 'kritik']],
      { tag: 'etiket', tur: 'turKodu', kritiklik: 'kritiklik' },
    );
    const sonuc = await aktarimiUygula({ aktarimId: a.id, onaylayan: tesisliA });
    expect(sonuc).toEqual({ eklenen: 0, guncellenen: 0 });
    const v = await db.varlik.findUniqueOrThrow({ where: { etiket: 'KAPSAM-B-VARLIK' } });
    expect(v.kritiklik).toBe('bilinmiyor'); // 'kritik' yazılmadı
  });

  it('kapsamsız doğrulama: santral kısıtlı kullanıcı için izinliTesisIdleri daraltır', () => {
    const kapsam = kapsamKur(tesisliA);
    expect(kapsam.izinliTesisler).toEqual([tesisA.id]);
    expect(kapsam.yazabilir(tesisA.id)).toBe(true);
    expect(kapsam.yazabilir(tesisB.id)).toBe(false);
    expect(kapsam.yazabilir(null)).toBe(false);
    expect(kapsamKur(global).izinliTesisler).toBeNull();
  });
});

describe('Referans yükleme', () => {
  it('kod ve ad üzerinden id çözülür; mevcut varlıklar üç anahtarla indekslenir', async () => {
    const ref = await referanslariYukle();
    expect(ref.turler.get('testaktarimtur')).toBe(turId);
    expect(ref.tesisler.get('testakta')).toBe(tesisA.id);
    expect(ref.tesisler.get('aktarimtesta')).toBe(tesisA.id); // ad da anahtar
    const mevcutlar = await mevcutVarliklariYukle();
    expect(mevcutlar.some((v) => v.etiket === 'E2E-1')).toBe(true);
  });
});

/* ═══ Görev B · regülasyon maddesi aktarımı da atomik ══════════════════
   `lib/eylemler.ts → aktarimOnayla` satırları transaction DIŞINDA yazıyordu:
   ortada patlayan satır yarım import bırakıyor, üstelik `IceAktarim.durum`
   `dogrulama_bekliyor` kaldığı için aynı dosya yeniden onaylanabiliyordu. */

/** Çerez ikizinin döndürdüğü jetona karşılık gelen GERÇEK oturumu kurar.
    Birden çok describe bloğu server action çağırıyor; `Oturum.tokenHash`
    tekil olduğu için oturum yalnız bir kez açılabilir. */
let oturumHazir: Promise<void> | null = null;
function oturumKur(): Promise<void> {
  oturumHazir ??= (async () => {
    const k = await db.kullanici.create({
      data: { eposta: 'aktarim.oturum@test.local', adSoyad: 'Oturumlu Onaycı' } });
    await db.yetki.create({ data: { kullaniciId: k.id, rol: 'yonetici' } });
    await db.oturum.create({ data: {
      kullaniciId: k.id,
      tokenHash: createHash('sha256').update(OTURUM_TOKENI).digest('hex'),
      bitis: new Date(Date.now() + 3_600_000) } });
  })();
  return oturumHazir;
}

describe('aktarimOnayla (regülasyon maddesi) — atomik', () => {
  let regId = '';
  let ilkAktarim = '';

  beforeAll(async () => {
    await oturumKur();

    const reg = await db.regulasyon.create({
      data: { kod: 'TEST-AKT-REG', ad: 'Aktarım test regülasyonu' } });
    regId = reg.id;
    const alan = await db.kapsamAlani.findFirstOrThrow();
    const a = await db.iceAktarim.create({ data: {
      regulasyonId: regId, kaynakTipi: 'excel', kaynakAdi: 'maddeler.csv',
      durum: 'dogrulama_bekliyor', okunan: 2,
      raporJson: JSON.stringify({ satirlar: [
        { kod: 'TEST-AKT-REG-4', baslik: 'Üst', metin: 'Üst madde',
          ustKod: null, kanitTipi: null, alanlar: [alan.kod], islem: 'yeni' },
        { kod: 'TEST-AKT-REG-4.1', baslik: 'Alt', metin: 'Alt madde',
          ustKod: '4', kanitTipi: 'kayit', alanlar: [alan.kod], islem: 'yeni' },
      ] }) } });
    ilkAktarim = a.id;
  });

  it('davranış korunur: maddeler ve üst-alt bağı aynı transaction içinde kurulur', async () => {
    const { aktarimOnayla } = await import('@/lib/eylemler');
    expect(await aktarimOnayla({ id: ilkAktarim })).toEqual({ ok: true });

    const maddeler = await db.madde.findMany({
      where: { regulasyonId: regId }, orderBy: { kod: 'asc' } });
    expect(maddeler.map((m) => m.kod)).toEqual(['TEST-AKT-REG-4', 'TEST-AKT-REG-4.1']);
    // Üst madde aynı koşuda yazıldı; bağ yine de kuruldu (okumalar da tx üzerinden).
    const ust = maddeler.find((m) => m.kod === 'TEST-AKT-REG-4')!;
    const alt = maddeler.find((m) => m.kod === 'TEST-AKT-REG-4.1')!;
    expect(alt.ustMaddeId).toBe(ust.id);
    expect(await db.maddeAlan.count({ where: { maddeId: { in: [ust.id, alt.id] } } })).toBe(2);

    const kayit = await db.iceAktarim.findUniqueOrThrow({ where: { id: ilkAktarim } });
    expect(kayit.durum).toBe('onaylandi');
    expect(kayit.eklenen).toBe(2);
    expect(await db.aktiviteKaydi.count({
      where: { varlikTipi: 'IceAktarim', varlikId: ilkAktarim } })).toBe(1);
  });

  it('onaylanmış aktarım ikinci kez işlenmez', async () => {
    const { aktarimOnayla } = await import('@/lib/eylemler');
    expect(await aktarimOnayla({ id: ilkAktarim }))
      .toEqual({ ok: false, hata: 'Kayıt onay beklemiyor' });
  });

  it('ortada patlayan satır yarım import BIRAKMAZ; durum değişmez', async () => {
    const { aktarimOnayla } = await import('@/lib/eylemler');
    const a = await db.iceAktarim.create({ data: {
      regulasyonId: regId, kaynakTipi: 'excel', kaynakAdi: 'patlak-maddeler.csv',
      durum: 'dogrulama_bekliyor', okunan: 2,
      raporJson: JSON.stringify({ satirlar: [
        { kod: 'TEST-AKT-REG-9', baslik: 'İyi', metin: 'yazılabilir',
          ustKod: null, kanitTipi: null, alanlar: [], islem: 'yeni' },
        // metin null → Madde.metin NOT NULL: satır DB seviyesinde patlar
        { kod: 'TEST-AKT-REG-9.1', baslik: 'Kötü', metin: null,
          ustKod: null, kanitTipi: null, alanlar: [], islem: 'yeni' },
      ] }) } });

    const s = await aktarimOnayla({ id: a.id });
    expect(s.ok).toBe(false);
    // İlk satır da geri alındı — yarım import yok.
    expect(await db.madde.count({
      where: { kod: { in: ['TEST-AKT-REG-9', 'TEST-AKT-REG-9.1'] } } })).toBe(0);
    // Durum `onaylandi` görünmez; dosya yeniden onaylanabilir durumda kalır.
    expect((await db.iceAktarim.findUniqueOrThrow({ where: { id: a.id } })).durum)
      .toBe('dogrulama_bekliyor');
  });
});

/* ═══ Toplu yazım — hız için sözleşme gevşetilmedi ═════════════════════

   İki sıcak yol (aktarimOnayla · aktarimiUygula) satır başına 3–5 sorgu
   yerine toplu `createMany`/`createManyAndReturn` kullanıyor
   (ölçüm: `node arac/olcek.mjs`). Aşağıdaki testler hızın SONUCU
   değiştirmediğini donduruyor: parametre sınırı, şema varsayılanları,
   köken idempotency'si ve doğrulama durumunun korunması. */

describe('Toplu yazım — SQLite parametre sınırı ve şema varsayılanları', () => {
  it('999 parametreyi aşan aktarım parçalanır; tek satır bile kaybolmaz', async () => {
    /* Varlik satırı ~27 kolon bağlar: 40 satır tek ifadede 999'u aşar.
       120 satır hem `Varlik` hem `VeriKokeni` hem `AktiviteKaydi` toplu
       yazımını birden çok parçaya böler. Parçalama yanlış olsaydı sorgu
       yavaşlamaz, `parameter limit ... exceeded` ile aktarım DÜŞERDİ. */
    const n = 120;
    const satirlar = Array.from({ length: n }, (_, i) =>
      [`PARCA-${String(i).padStart(3, '0')}`, `Parça varlığı ${i}`, turKod, tesisA.kod]);
    const a = await aktarimKur('parca.csv', ['tag', 'ad', 'tur', 'tesis'], satirlar,
      { tag: 'etiket', ad: 'ad', tur: 'turKodu', tesis: 'tesisKodu' });

    expect(await aktarimiUygula({ aktarimId: a.id, onaylayan: global }))
      .toEqual({ eklenen: n, guncellenen: 0 });
    expect(await db.varlik.count({ where: { etiket: { startsWith: 'PARCA-' } } })).toBe(n);
    expect(await db.veriKokeni.count({ where: { kaynakSistem: 'dosya:parca.csv' } })).toBe(n);
    expect(await db.aktiviteKaydi.count({ where: { korelasyonId: a.id } })).toBe(n);
  });

  it('eşlenmemiş alan toplu INSERT içinde de ŞEMA VARSAYILANINI alır', async () => {
    /* Toplu yazımda satırların anahtar kümeleri farklı olabilir
       (`bos: 'atla'` alanları dolu hücrede yazılır, boşta hiç yazılmaz).
       Prisma bunları tek INSERT'e toplarken eksik kolona şema
       varsayılanını koymalı — komşu satırın değerini DEĞİL. */
    const a = await aktarimKur(
      'karisik-anahtar.csv', ['tag', 'tur', 'tesis', 'yasam'],
      [
        ['KARISIK-1', turKod, tesisA.kod, 'bakim'],
        ['KARISIK-2', turKod, tesisA.kod, ''],      // boş → şema varsayılanı
        ['KARISIK-3', turKod, tesisA.kod, 'emekli'],
      ],
      { tag: 'etiket', tur: 'turKodu', tesis: 'tesisKodu', yasam: 'yasamDongusu' },
    );
    await aktarimiUygula({ aktarimId: a.id, onaylayan: global });
    const al = async (e: string) =>
      (await db.varlik.findUniqueOrThrow({ where: { etiket: e } })).yasamDongusu;
    expect(await al('KARISIK-1')).toBe('bakim');
    expect(await al('KARISIK-2')).toBe('aktif');   // Varlik.yasamDongusu varsayılanı
    expect(await al('KARISIK-3')).toBe('emekli');
  });
});

describe('Toplu köken yazımı — kokenYaz sözleşmesi korunur', () => {
  it('yeniden aktarım kökeni tazeler; doğrulamayı DÜŞÜRMEZ, profil sürümünü SİLMEZ', async () => {
    const kur = () => aktarimKur(
      'koken-sozlesme.csv', ['tag', 'tur', 'tesis'],
      [['KOKEN-SOZ-1', turKod, tesisA.kod]],
      { tag: 'etiket', tur: 'turKodu', tesis: 'tesisKodu' });

    await aktarimiUygula({ aktarimId: (await kur()).id, onaylayan: global });
    const v = await db.varlik.findUniqueOrThrow({ where: { etiket: 'KOKEN-SOZ-1' } });
    const ilk = await db.veriKokeni.findFirstOrThrow({
      where: { varlikId: v.id, kaynakSistem: 'dosya:koken-sozlesme.csv' } });
    expect(ilk.guven).toBeNull();          // ÖLÇÜLMEDİ — sıfır güven değil
    expect(ilk.kokenTipi).toBe('otomatik');
    expect(ilk.dogrulamaDurumu).toBe('dogrulanmadi');

    /* Bir insan kaydı doğrular ve eşleme profili sürümü işaretlenir.
       Yeniden senkronizasyon bunların İKİSİNİ DE korumalı: doğrulama
       insanın kararıdır, profil sürümü de kaydın nasıl yorumlandığının
       tek kanıtıdır. `?? null` yazan bir toplu yazıcı ikisini de silerdi. */
    await db.veriKokeni.update({ where: { id: ilk.id }, data: {
      dogrulamaDurumu: 'dogrulandi', kokenTipi: 'dogrulanmis',
      dogrulayanId: global.id, dogrulamaZamani: new Date(),
      eslemeProfilSurumu: 7, kayitOzeti: 'ozet-abc' } });

    await aktarimiUygula({ aktarimId: (await kur()).id, onaylayan: global });

    // Köken ÇOĞALMAZ — (varlık, kaynak, kaynak kaydı) tekildir.
    expect(await db.veriKokeni.count({ where: {
      varlikId: v.id, kaynakSistem: 'dosya:koken-sozlesme.csv' } })).toBe(1);
    const sonra = await db.veriKokeni.findUniqueOrThrow({ where: { id: ilk.id } });
    expect(sonra.dogrulamaDurumu).toBe('dogrulandi');
    expect(sonra.kokenTipi).toBe('dogrulanmis');
    expect(sonra.dogrulayanId).toBe(global.id);
    expect(sonra.eslemeProfilSurumu).toBe(7);
    expect(sonra.kayitOzeti).toBe('ozet-abc');
    expect(sonra.guven).toBeNull();
    // Tazelenen alanlar gerçekten tazelendi (kayıt bayat görünmesin).
    expect(sonra.aktarim.getTime()).toBeGreaterThanOrEqual(ilk.aktarim.getTime());
  });
});

/* ═══ maddeAlanAta / maddeKaydet — yarım eşleştirme yok ════════════════
   SALDIRGAN_DENETIM #6: `deleteMany` transaction DIŞINDA koşuyor, bağlar
   ardından döngüde tek tek kuruluyordu. Döngü ortasında patlarsa madde
   KAPSAM ALANI OLMADAN kalıyordu — ve bu sessiz kalmıyordu, sonraki içe
   aktarımda o maddenin satırları "alan kolonu tanımlı bir kapsam alanıyla
   eşleşmiyor" diye elenmeye başlıyordu. Hata sebebinden uzakta görünüyordu.

   Arıza döngünün İÇİNDEN enjekte edilir: alan listesinin ORTASINA var
   olmayan bir kimlik konur. İlk `create` başarılı olur, ikincisi yabancı
   anahtarda patlar. Kanıtlanan şey "hata döndü" değil, VERİNİN HİÇ
   DEĞİŞMEMİŞ olmasıdır. */

describe('maddeAlanAta — silme + yeniden kurma atomiktir', () => {
  let maddeId = '';
  let alanA = '';
  let alanB = '';

  beforeAll(async () => {
    await oturumKur();
    const reg = await db.regulasyon.create({
      data: { kod: 'TEST-ALAN-REG', ad: 'Alan atama testi' } });
    const m = await db.madde.create({ data: {
      regulasyonId: reg.id, kod: 'TEST-ALAN-REG-1', baslik: 'Alanlı madde',
      metin: 'Kapsam alanları bu maddede duruyor' } });
    maddeId = m.id;
    const alanlar = await db.kapsamAlani.findMany({ take: 2, orderBy: { kod: 'asc' } });
    expect(alanlar.length).toBe(2);
    alanA = alanlar[0].id; alanB = alanlar[1].id;
    await db.maddeAlan.createMany({ data: [
      { maddeId, alanId: alanA }, { maddeId, alanId: alanB } ] });
  });

  const bagliAlanlar = async () => (await db.maddeAlan.findMany({
    where: { maddeId }, select: { alanId: true }, orderBy: { alanId: 'asc' } }))
    .map((x) => x.alanId).sort();

  it('döngü ortasında patlayan atama HİÇBİR bağı silmez', async () => {
    const { maddeAlanAta } = await import('@/lib/eylemler');
    const once = await bagliAlanlar();
    expect(once).toHaveLength(2);

    const s = await maddeAlanAta({ maddeId, alanIdler: [alanA, 'OLMAYAN-ALAN-KIMLIGI'] });
    expect(s.ok).toBe(false);

    // Ne silme uygulandı ne de yarım atama yazıldı — tablo aynen duruyor.
    expect(await bagliAlanlar()).toEqual(once);
  });

  it('geçerli atama uygulanır (kapı fazla dar değil)', async () => {
    const { maddeAlanAta } = await import('@/lib/eylemler');
    expect(await maddeAlanAta({ maddeId, alanIdler: [alanB] })).toEqual({ ok: true });
    expect(await bagliAlanlar()).toEqual([alanB]);
    expect(await db.aktiviteKaydi.count({
      where: { varlikTipi: 'Madde', varlikId: maddeId, alan: 'alanlar' } })).toBe(1);
  });

  it('maddeKaydet de yarım bırakmaz: madde yazılmaz, alanlar silinmez', async () => {
    const { maddeKaydet } = await import('@/lib/eylemler');
    const oncekiMadde = await db.madde.findUniqueOrThrow({ where: { id: maddeId } });
    const once = await bagliAlanlar();

    const s = await maddeKaydet({
      id: maddeId, regulasyonId: oncekiMadde.regulasyonId, kod: oncekiMadde.kod,
      baslik: 'Değişmemeli', metin: 'Bu metin yazılmamalı',
      alanIdler: [alanA, 'OLMAYAN-ALAN-KIMLIGI'],
    });
    expect(s.ok).toBe(false);

    const sonra = await db.madde.findUniqueOrThrow({ where: { id: maddeId } });
    expect(sonra.baslik).toBe(oncekiMadde.baslik); // madde güncellemesi de geri sarıldı
    expect(sonra.metin).toBe(oncekiMadde.metin);
    expect(await bagliAlanlar()).toEqual(once);
  });
});
