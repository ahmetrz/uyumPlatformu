import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { hataSatiri, paketiDogrula } from '@/lib/paket/dogrula';
import { CSV_BASLIK, SOZLUK_SATIRI, cerceve, paketYaz, type PaketDosyalari } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · 2.2 — FORM VE RAPOR ŞABLONU TÜRLERİ (URN-PKT-012)

   Form `form/<KOD>.json` (+ isteğe bağlı XLSX: sayfa ve hücreler DOSYAYA
   karşı okunur; telifli pakette XLSX yasak), rapor `rapor/<KOD>.json`
   (sıralama alanların permütasyonu). Kurucu FormSablonu/RaporSablonu
   kataloğuna köken ve aktif ile yazar; kopuk madde referansı KİMLİK ve
   hiçbir satır yazılmaz; yükseltmede bırakılan şablon pasif; kaldırma pasif.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-sablon-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { paketiKaldir, paketiKur } = await import('@/lib/paket/kur');

/** Bellekte küçük bir XLSX: "Form" sayfası A1:B4. */
function xlsx(sayfa = 'Form'): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Alan', 'Değer'], ['Politika', ''], ['Tarih', ''], ['Sorumlu', '']]);
  XLSX.utils.book_append_sheet(wb, ws, sayfa);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const FORM = (ek: Record<string, unknown> = {}, alanEk: Record<string, unknown> = {}) => ({
  kod: 'SAB-FORM', ad: 'Şablon formu', tur: 'denetim',
  bolumler: [{ kod: 'genel', baslik: 'Genel', alanlar: [
    { anahtar: 'politikaVar', etiket: 'Politika var mı', tip: 'mantik', maddeKod: 'SAB-REG-1', zorunlu: true, ...alanEk },
    { anahtar: 'tarih', etiket: 'Tarih', tip: 'tarih' },
  ] }],
  ...ek,
});
const RAPOR = (ek: Record<string, unknown> = {}) => ({
  kod: 'SAB-RAPOR', ad: 'Şablon raporu',
  alanlar: [{ anahtar: 'oge', etiket: 'Öğe', kaynak: 'kapsamOgesi.ad' }, { anahtar: 'durum', etiket: 'Durum', kaynak: 'madde.durum' }],
  siralama: ['oge', 'durum'], kunye: { baslik: 'Şablon raporu' }, sayfa: { boyut: 'A4', yon: 'dikey' },
  ...ek,
});
const TEMEL: PaketDosyalari = {
  'sozluk.json': [SOZLUK_SATIRI('tesis', 'şube')],
  'cerceve/SAB-REG.json': cerceve('SAB-REG', { tur: 'kamuya_acik', metinDahil: false }),
  'cerceve/SAB-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n2;;Kapsam;;1;;\n`,
};
const manifest = { kod: 'SABLON-PAKET', sektor: { kod: 'SABLON-SEKTOR', ad: 'Şablon' } };
/* Form şablonu da ALAN EŞLEME BEYANI ister (R-D · URN-PKT-022): şablonun
   her alanı bir ürün alanıdır ve beyansız alan kırmızıdır. Bu dosyanın
   ölçtüğü şey beyan değil ŞABLON BİÇİMİ, bu yüzden beyan burada bir
   sabittir; beyanın kendi dişleri `paket-alan-eslemesi.test.ts`te. */
const G = 'Ürünün bu alanı şablonun sorduğu sorunun cevabının yazıldığı yerdir; anlamı sorunun kendisidir.';
const esleme = (...alanlar: string[]) => ({
  'SAB-FORM': alanlar.map((a) => ({ kaynakAlan: null, urunAlani: a, gerekce: G })),
});
/** İki alanlı (varsayılan) form için manifest. */
const MAN = { ...manifest, alanEslemesi: esleme('politikaVar', 'tarih') };
/** Tek alanlı form için manifest — fazla beyan ÖLÜ BEYAN olurdu. */
const MAN_TEK = { ...manifest, alanEslemesi: esleme('politikaVar') };
const siniflar = (d: string) => paketiDogrula(d).hatalar.map((h) => `${h.sinif}|${h.dosya}|${h.konum ?? ''}`);

describe('doğrulayıcı · form ve rapor şablonu [URN-PKT-012]', () => {
  it('JSON form ve rapor geçer, sayılır; dosya adı koddan farklıysa KİMLİK [URN-PKT-012]', () => {
    const s = paketiDogrula(paketYaz({ ...TEMEL, 'form/SAB-FORM.json': FORM(), 'rapor/SAB-RAPOR.json': RAPOR() }, MAN));
    expect(s.ok, s.hatalar.map(hataSatiri).join('\n')).toBe(true);
    expect(s.sayilar).toMatchObject({ formlar: 1, raporlar: 1 });
    expect(siniflar(paketYaz({ ...TEMEL, 'form/BASKA.json': FORM() }, MAN))).toContain('KİMLİK|form/BASKA.json|kod');
  });

  it('XLSX: sayfa ve hücreler dosyaya karşı okunur — yok sayfa, aralık dışı hücre, hücresiz alan BIÇIM; doğru olan geçer [URN-PKT-012]', () => {
    const dogru = paketYaz({ ...TEMEL, 'form/SAB-FORM.xlsx': xlsx().toString('binary'),
      'form/SAB-FORM.json': FORM({ dosya: 'SAB-FORM.xlsx', sayfa: 'Form', bolumler: [{ kod: 'genel', baslik: 'Genel', alanlar: [
        { anahtar: 'politikaVar', etiket: 'Politika', tip: 'mantik', hucre: 'B2' }, { anahtar: 'tarih', etiket: 'Tarih', tip: 'tarih', hucre: 'B3' }] }] }) }, MAN);
    // paketYaz metni utf8 yazar; ikili dosyayı ayrıca gerçek baytlarıyla yaz
    writeFileSync(path.join(dogru, 'form', 'SAB-FORM.xlsx'), xlsx());
    const sonuc = paketiDogrula(dogru);
    // özet ikili dosya yeniden yazıldığı için uyuşmaz — yalnız o hata olmalı
    expect(sonuc.hatalar.filter((h) => !/özet uyuşmazlığı/.test(h.mesaj)).map(hataSatiri)).toEqual([]);

    const yokSayfaDizini = paketYaz({ ...TEMEL, 'form/SAB-FORM.json': FORM({ dosya: 'SAB-FORM.xlsx', sayfa: 'Form', bolumler: [{ kod: 'genel', baslik: 'Genel', alanlar: [
      { anahtar: 'politikaVar', etiket: 'Politika', tip: 'mantik', hucre: 'B2' }] }] }) }, MAN_TEK);
    writeFileSync(path.join(yokSayfaDizini, 'form', 'SAB-FORM.xlsx'), xlsx('Baska'));
    const yokSayfa = paketiDogrula(yokSayfaDizini);
    expect(yokSayfa.hatalar.some((h) => h.sinif === 'BIÇIM' && h.konum === 'sayfa' && /sayfa yok: Form \(dosyadaki sayfalar: Baska\)/.test(h.mesaj)),
      yokSayfa.hatalar.map(hataSatiri).join('\n')).toBe(true);

    const disari = paketYaz({ ...TEMEL, 'form/SAB-FORM.json': FORM({ dosya: 'SAB-FORM.xlsx', sayfa: 'Form', bolumler: [{ kod: 'genel', baslik: 'Genel', alanlar: [
      { anahtar: 'politikaVar', etiket: 'Politika', tip: 'mantik', hucre: 'Z99' }, { anahtar: 'tarih', etiket: 'Tarih', tip: 'tarih' }] }] }) }, MAN);
    writeFileSync(path.join(disari, 'form', 'SAB-FORM.xlsx'), xlsx());
    const d = paketiDogrula(disari).hatalar.filter((h) => !/özet|listesinde yok/.test(h.mesaj));
    expect(d.map((h) => h.konum)).toEqual(['genel.politikaVar.hucre', 'genel.tarih.hucre']);
    expect(d[0].mesaj).toMatch(/Z99 "Form" sayfasının aralığı dışında/);
  });

  it('manifesti kamuya açık ama TELİFLİ ÇERÇEVE taşıyan pakette de XLSX yasak [URN-PKT-012] [URN-PKT-002]', () => {
    /* Bağımsız inceleme bulgusu (PR #43): yasak yalnız manifest lisansına
       bakıyordu; telifli çerçeve taşıyan bir paket XLSX hücresinde tam metin
       kaçırabilirdi (hücre metni denetlenmiyor). */
    const t = paketYaz({ ...TEMEL,
      'cerceve/SAB-ISO.json': cerceve('SAB-ISO', { tur: 'telifli', metinDahil: false }),
      'cerceve/SAB-ISO.csv': `${CSV_BASLIK}\nA.5;;Organizasyonel kontroller;;0;;\n`,
      'form/SAB-FORM.json': FORM({ dosya: 'SAB-FORM.xlsx', sayfa: 'Form' }, { hucre: 'B2' }) }, MAN);
    writeFileSync(path.join(t, 'form', 'SAB-FORM.xlsx'), xlsx());
    const h = paketiDogrula(t).hatalar.filter((x) => x.sinif === 'LİSANS');
    expect(h.map((x) => x.mesaj).join('\n')).toMatch(/telifli çerçeve taşıyan paket \(SAB-ISO\) XLSX form taşıyamaz/);
  });

  it('telifli pakette XLSX form LİSANS; JSON yapı geçer; hücre var dosya yoksa BIÇIM [URN-PKT-012]', () => {
    const telifli = { ...MAN, lisans: { tur: 'telifli', metinDahil: false } };
    const t = paketYaz({ ...TEMEL, 'form/SAB-FORM.json': FORM({ dosya: 'SAB-FORM.xlsx', sayfa: 'Form' }, { hucre: 'B2' }) }, telifli);
    writeFileSync(path.join(t, 'form', 'SAB-FORM.xlsx'), xlsx());
    expect(paketiDogrula(t).hatalar.some((h) => h.sinif === 'LİSANS' && /telifli paket XLSX form taşıyamaz/.test(h.mesaj))).toBe(true);
    expect(paketiDogrula(paketYaz({ ...TEMEL, 'form/SAB-FORM.json': FORM() }, telifli)).ok).toBe(true);
    expect(siniflar(paketYaz({ ...TEMEL, 'form/SAB-FORM.json': FORM({}, { hucre: 'B2' }) }, MAN))).toContain('BIÇIM|form/SAB-FORM.json|genel.politikaVar');
  });

  it('rapor: sıralama alanların permütasyonu olmalı; secim tipi seçenek ister [URN-PKT-012]', () => {
    expect(siniflar(paketYaz({ ...TEMEL, 'rapor/SAB-RAPOR.json': RAPOR({ siralama: ['oge'] }) }, manifest))).toContain('BIÇIM|rapor/SAB-RAPOR.json|siralama');
    expect(siniflar(paketYaz({ ...TEMEL, 'rapor/SAB-RAPOR.json': RAPOR({ siralama: ['oge', 'durum', 'yok'] }) }, manifest))).toContain('BIÇIM|rapor/SAB-RAPOR.json|siralama');
    expect(siniflar(paketYaz({ ...TEMEL, 'form/SAB-FORM.json': FORM({}, { tip: 'secim' }) }, MAN))).toContain('BIÇIM|form/SAB-FORM.json|genel.politikaVar');
  });
});

describe('kurucu · şablon kataloğu, köken, uzlaştırma [URN-PKT-012]', () => {
  let kuranId = '';
  beforeAll(async () => { kuranId = (await db.kullanici.findFirstOrThrow({ where: { aktif: true } })).id; });
  const kur = (dosyalar: PaketDosyalari, m: Record<string, unknown>) => paketiKur(paketYaz(dosyalar, m), { kuranId, istemci: db });

  it('kopuk madde referansı KİMLİK ve hiçbir satır yazılmaz; çözülen referansla şablonlar koken=paket yazılır [URN-PKT-012]', async () => {
    const kopuk = await kur({ ...TEMEL, 'form/SAB-FORM.json': FORM({}, { maddeKod: 'SAB-REG-99' }) }, { ...MAN, surum: '0.1.0' });
    expect(kopuk.ok).toBe(false);
    if (!kopuk.ok) expect(kopuk.hatalar[0]).toMatchObject({ sinif: 'KİMLİK', dosya: 'form/SAB-FORM.json', mesaj: expect.stringContaining('SAB-REG-99') });
    expect(await db.icerikPaketi.findUnique({ where: { kod: 'SABLON-PAKET' } })).toBeNull();
    expect(await db.formSablonu.findUnique({ where: { kod: 'SAB-FORM' } })).toBeNull();

    const s = await kur({ ...TEMEL, 'form/SAB-FORM.json': FORM(), 'rapor/SAB-RAPOR.json': RAPOR() }, { ...MAN, surum: '0.1.0' });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.sayilar).toMatchObject({ formlar: 1, raporlar: 1 });
    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'SABLON-SEKTOR' } });
    const form = await db.formSablonu.findUniqueOrThrow({ where: { kod: 'SAB-FORM' } });
    expect(form).toMatchObject({ koken: 'paket', paketSurumId: s.rapor.surumId, sektorId: sektor.id, aktif: true, tur: 'denetim', dosyaAdi: null });
    expect(JSON.parse(form.tanimJson).bolumler[0].alanlar[0].maddeKod).toBe('SAB-REG-1');
    expect(await db.raporSablonu.findUniqueOrThrow({ where: { kod: 'SAB-RAPOR' } })).toMatchObject({ koken: 'paket', aktif: true });
  });

  it('kiracı şablonu ezilmez (çelişki); yükseltmede bırakılan şablon pasif; kaldırma pasifler [URN-PKT-012]', async () => {
    await db.raporSablonu.create({ data: { kod: 'KIRACI-RAPOR', ad: 'Kiracının raporu', tanimJson: '{}', koken: 'kiraci' } });
    const s = await kur({ ...TEMEL, 'rapor/KIRACI-RAPOR.json': RAPOR({ kod: 'KIRACI-RAPOR', ad: 'Paketin raporu' }) }, { ...manifest, surum: '0.2.0' });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.celiskiler).toEqual([{ tablo: 'RaporSablonu', anahtar: 'KIRACI-RAPOR', sebep: expect.stringContaining('kiracı') }]);
    expect((await db.raporSablonu.findUniqueOrThrow({ where: { kod: 'KIRACI-RAPOR' } })).ad).toBe('Kiracının raporu');
    // 0.2.0 SAB-FORM ve SAB-RAPOR'u beyan etmiyor → pasif, silinmez
    expect(s.rapor.pasiflestirilen).toMatchObject({ formlar: 1, raporlar: 1 });
    expect(await db.formSablonu.findUniqueOrThrow({ where: { kod: 'SAB-FORM' } })).toMatchObject({ aktif: false });
    expect(await db.raporSablonu.findUniqueOrThrow({ where: { kod: 'SAB-RAPOR' } })).toMatchObject({ aktif: false });
    const g = await kur({ ...TEMEL, 'form/SAB-FORM.json': FORM() }, { ...MAN, surum: '0.3.0' });
    expect(g.ok).toBe(true);
    expect(await db.formSablonu.findUniqueOrThrow({ where: { kod: 'SAB-FORM' } })).toMatchObject({ aktif: true });
    const k = await paketiKaldir('SABLON-PAKET', db);
    expect(k.ok).toBe(true);
    if (k.ok) expect(k.arsivlenen).toMatchObject({ formlar: 1, raporlar: 1 });
    expect(await db.formSablonu.findUniqueOrThrow({ where: { kod: 'SAB-FORM' } })).toMatchObject({ aktif: false });
    expect((await db.raporSablonu.findUniqueOrThrow({ where: { kod: 'KIRACI-RAPOR' } })).aktif).toBe(true);
  });
});
