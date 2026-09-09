import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hataSatiri, paketiDogrula } from '@/lib/paket/dogrula';
import { CSV_BASLIK, SOZLUK_SATIRI, cerceve, paketYaz, type PaketDosyalari } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · 2.4 — EŞLEME CSV TÜRÜ (URN-PKT-014)

   `esleme/<KOD>.json` kimlik (kaynak/hedef çerçeve + sürüm etiketi, paket
   içi ya da kurulu; lisans) + `esleme/<KOD>.csv`
   (`kaynak_kod;hedef_kod;denklik;aciklama`). Yapı kusuru (tekrar başlık,
   başlığı aşan dolu hücre) LİSANS'tan ÖNCE reddedilir — okunmayan hücre
   içerik taşırdı (PR #41 birinci turda düzeltilen kalıp). Açıklama ≤ 200 ve
   yalnız metin izinliyken. Kurucu `MaddeEslestirmesi`ye koken=paket yazar;
   kiracının ya da başka paketin eşlemesi ezilmez (çelişki); paketin KENDİ
   eşlemesi taslak yenilemesinde bağ sayılmaz, kiracınınki sayılır; bırakılan
   eşleme pasif (silme yok), yeniden beyan aktifler, kaldırma pasifler.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-esleme-paket-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { paketiKaldir, paketiKur } = await import('@/lib/paket/kur');

const ESLEME_BASLIK = 'kaynak_kod;hedef_kod;denklik;aciklama';
const KIMLIK = (ek: Record<string, unknown> = {}) => ({
  kod: 'ESL-A-B', ad: 'A → B eşlemesi',
  kaynak: { cerceve: 'ESL-A', surumEtiketi: 'test-1' }, hedef: { cerceve: 'ESL-B', surumEtiketi: 'test-1' },
  lisans: { tur: 'kamuya_acik', metinDahil: true }, eslemeDosyasi: 'ESL-A-B.csv', ...ek,
});
const CERCEVELER: PaketDosyalari = {
  'sozluk.json': [SOZLUK_SATIRI('tesis', 'şube')],
  'cerceve/ESL-A.json': cerceve('ESL-A', { tur: 'kamuya_acik', metinDahil: false }),
  'cerceve/ESL-A.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n2;;Kapsam;;1;;\n`,
  'cerceve/ESL-B.json': cerceve('ESL-B', { tur: 'kamuya_acik', metinDahil: false }),
  'cerceve/ESL-B.csv': `${CSV_BASLIK}\nB1;;Birinci;;0;;\nB2;;İkinci;;1;;\n`,
};
const manifest = { kod: 'ESLEME-PAKET', sektor: { kod: 'ESLEME-SEKTOR', ad: 'Eşleme' } };
const DOGRU = `${ESLEME_BASLIK}\n1;B1;tam;Aynı amaç\n2;B2;kismi;\n`;
const paket = (csv: string, kimlikEk: Record<string, unknown> = {}, dosyalar: PaketDosyalari = CERCEVELER, m: Record<string, unknown> = manifest) =>
  paketYaz({ ...dosyalar, 'esleme/ESL-A-B.json': KIMLIK(kimlikEk), 'esleme/ESL-A-B.csv': csv }, m);
const hatalar = (d: string) => paketiDogrula(d).hatalar.map((h) => `${h.sinif}|${h.dosya}|${h.konum ?? ''}`);
const TELIFLI = { ...manifest, lisans: { tur: 'telifli', metinDahil: false } };

describe('doğrulayıcı · eşleme kimliği ve CSV [URN-PKT-014]', () => {
  it('geçerli eşleme satır sayısıyla sayılır; kimlik ve satırlar okunur; metinDahil=true ile açıklama geçer [URN-PKT-014]', () => {
    const s = paketiDogrula(paket(DOGRU));
    expect(s.ok, s.hatalar.map(hataSatiri).join('\n')).toBe(true);
    expect(s.sayilar).toMatchObject({ eslemeler: 2, cerceveler: 2 });
    expect(s.icerik!.eslemeler[0].kimlik).toMatchObject({ kod: 'ESL-A-B', kaynak: { cerceve: 'ESL-A', surumEtiketi: 'test-1' } });
    expect(s.icerik!.eslemeler[0].satirlar).toEqual([
      { kaynakKod: '1', hedefKod: 'B1', denklik: 'tam', aciklama: 'Aynı amaç' },
      { kaynakKod: '2', hedefKod: 'B2', denklik: 'kismi', aciklama: null },
    ]);
  });

  it('dosya adı ≠ kod KİMLİK; kaynak = hedef çerçeve BIÇIM; paket içi çerçeveye yanlış etiket KİMLİK; CSV yok BIÇIM [URN-PKT-014]', () => {
    expect(hatalar(paketYaz({ ...CERCEVELER, 'esleme/BASKA.json': KIMLIK(), 'esleme/ESL-A-B.csv': DOGRU }, manifest))).toContain('KİMLİK|esleme/BASKA.json|kod');
    expect(hatalar(paket(DOGRU, { hedef: { cerceve: 'ESL-A', surumEtiketi: 'test-1' } }))).toContain('BIÇIM|esleme/ESL-A-B.json|hedef.cerceve');
    expect(hatalar(paket(DOGRU, { kaynak: { cerceve: 'ESL-A', surumEtiketi: 'baska' } }))).toContain('KİMLİK|esleme/ESL-A-B.json|kaynak.surumEtiketi');
    expect(hatalar(paket(DOGRU, { eslemeDosyasi: 'yok.csv' }))).toContain('BIÇIM|esleme/ESL-A-B.json|eslemeDosyasi');
  });

  it('YAPI KUSURU LİSANS\'TAN ÖNCE: tekrar başlık ve başlığı aşan dolu hücre BIÇIM, o satırda LİSANS üretilmez; eksik/bilinmeyen sütun BIÇIM [URN-PKT-014]', () => {
    /* Telifli pakette gizli metin, ikinci `aciklama` kopyasına ya da satır
       sonuna konabilirdi: okunmaz ama pakette taşınır. Önce yapı. */
    const tekrar = paketiDogrula(paket(`${ESLEME_BASLIK};aciklama\n1;B1;tam;;Gizli tam metin\n`, { lisans: { tur: 'telifli', metinDahil: false } }, CERCEVELER, TELIFLI));
    expect(tekrar.hatalar.filter((h) => h.dosya === 'esleme/ESL-A-B.csv').map((h) => `${h.sinif}|${h.konum}`)).toEqual(['BIÇIM|1']);
    expect(tekrar.hatalar.some((h) => h.sinif === 'LİSANS')).toBe(false);
    const fazla = paketiDogrula(paket(`${ESLEME_BASLIK}\n1;B1;tam;;Gizli tam metin\n2;B2;kismi;\n`, { lisans: { tur: 'telifli', metinDahil: false } }, CERCEVELER, TELIFLI));
    expect(fazla.hatalar.filter((h) => h.dosya === 'esleme/ESL-A-B.csv').map((h) => `${h.sinif}|${h.konum}`)).toEqual(['BIÇIM|2']);
    expect(fazla.hatalar[0].mesaj).toMatch(/başlığı aşan 1 dolu hücre/);
    expect(hatalar(paket(`kaynak_kod;hedef_kod\n1;B1\n`))).toContain('BIÇIM|esleme/ESL-A-B.csv|1');
    expect(hatalar(paket(`${ESLEME_BASLIK};metin\n1;B1;tam;;\n`))).toContain('BIÇIM|esleme/ESL-A-B.csv|1');
  });

  it('satır: boş kod KİMLİK, tekrar çift KİMLİK, denklik bilinmiyor BIÇIM, paket içi çerçevede olmayan madde KİMLİK [URN-PKT-014]', () => {
    expect(hatalar(paket(`${ESLEME_BASLIK}\n;B1;tam;\n`))).toContain('KİMLİK|esleme/ESL-A-B.csv|2');
    expect(hatalar(paket(`${ESLEME_BASLIK}\n1;B1;tam;\n1;B1;kismi;\n`))).toContain('KİMLİK|esleme/ESL-A-B.csv|3');
    expect(hatalar(paket(`${ESLEME_BASLIK}\n1;B1;esit;\n`))).toContain('BIÇIM|esleme/ESL-A-B.csv|2');
    const kaynakYok = paketiDogrula(paket(`${ESLEME_BASLIK}\n9;B1;tam;\n`));
    expect(kaynakYok.hatalar.map((h) => `${h.sinif}|${h.konum}|${h.mesaj}`)).toEqual(['KİMLİK|2|kaynak_kod paketin ESL-A çerçevesinde yok: 9']);
    expect(paketiDogrula(paket(`${ESLEME_BASLIK}\n1;B9;tam;\n`)).hatalar[0].mesaj).toMatch(/hedef_kod paketin ESL-B çerçevesinde yok: B9/);
  });

  it('açıklama: telifli pakette, metinDahil=false eşlemede, telifli çerçeveye karşı LİSANS (sebep adıyla); > 200 karakter BIÇIM [URN-PKT-014]', () => {
    const lisans = (d: string) => paketiDogrula(d).hatalar.filter((h) => h.dosya === 'esleme/ESL-A-B.csv').map((h) => `${h.sinif}|${h.konum}|${h.mesaj}`);
    expect(lisans(paket(DOGRU, { lisans: { tur: 'telifli', metinDahil: false } }, CERCEVELER, TELIFLI))).toEqual(['LİSANS|2|lisans sınırı: açıklama girilemez — paket telifli (1→B1)']);
    expect(lisans(paket(DOGRU, { lisans: { tur: 'kamuya_acik', metinDahil: false } }))).toEqual(['LİSANS|2|lisans sınırı: açıklama girilemez — eşleme metinDahil=false (1→B1)']);
    const telifliCerceve = { ...CERCEVELER, 'cerceve/ESL-A.json': cerceve('ESL-A', { tur: 'telifli', metinDahil: false }) };
    expect(lisans(paket(DOGRU, {}, telifliCerceve))).toEqual(['LİSANS|2|lisans sınırı: açıklama girilemez — ESL-A çerçevesi telifli (1→B1)']);
    expect(lisans(paket(`${ESLEME_BASLIK}\n1;B1;tam;${'x'.repeat(201)}\n`))).toEqual([`BIÇIM|2|açıklama 201 karakter > 200 — not, metin değil (1→B1)`]);
    expect(paketiDogrula(paket(DOGRU, { lisans: { tur: 'telifli', metinDahil: false } }, CERCEVELER, TELIFLI)).hatalar.filter((h) => h.konum === '3')).toEqual([]);
  });
});

describe('kurucu · eşleme yazımı, kendi eşlemesi bağ değil, kiracı eşlemesi bağ [URN-PKT-014]', () => {
  let kuranId = '';
  beforeAll(async () => { kuranId = (await db.kullanici.findFirstOrThrow({ where: { aktif: true } })).id; });
  const kur = (d: string) => paketiKur(d, { kuranId, istemci: db });
  const madde = (kod: string) => db.madde.findFirstOrThrow({ where: { kod, surum: { durum: { not: 'arsiv' } } }, select: { id: true } });
  const paketEslemeleri = (surumId: string) => db.maddeEslestirmesi.findMany({ where: { paketSurumId: surumId }, include: { kaynak: { select: { kod: true } }, hedef: { select: { kod: true } } }, orderBy: { kaynak: { kod: 'asc' } } });

  it('eşlemeler koken=paket, aktif, denklik ve açıklamayla yazılır; sayılır [URN-PKT-014]', async () => {
    const s = await kur(paket(DOGRU, {}, CERCEVELER, { ...manifest, surum: '0.1.0' }));
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.sayilar).toMatchObject({ eslemeler: 2, cerceveler: 2, maddeler: 4 });
    const es = await paketEslemeleri(s.rapor.surumId);
    expect(es.map((e) => `${e.kaynak.kod}→${e.hedef.kod}:${e.denklik}:${e.aciklama ?? '-'}:${e.koken}:${e.aktif}`))
      .toEqual(['ESL-A-1→ESL-B-B1:tam:Aynı amaç:paket:true', 'ESL-A-2→ESL-B-B2:kismi:-:paket:true']);
  });

  it('paketin KENDİ eşlemesi bağ değildir: aynı etiketle yenilenen taslak eşlemeleri yeniden yazar; kiracının eşlemesi bağdır: yenileme SÜRÜM [URN-PKT-014]', async () => {
    const v2 = { ...CERCEVELER, 'cerceve/ESL-A.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n2;;Kapsam;;1;;\n3;;Ek madde;;2;;\n` };
    const s = await kur(paket(DOGRU, {}, v2, { ...manifest, surum: '0.2.0' }));
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.sayilar).toMatchObject({ eslemeler: 2, maddeler: 5 });
    expect(s.rapor.pasiflestirilen).toMatchObject({ eslemeler: 0, kurallar: 0 });
    expect((await paketEslemeleri(s.rapor.surumId)).map((e) => `${e.kaynak.kod}→${e.hedef.kod}`)).toEqual(['ESL-A-1→ESL-B-B1', 'ESL-A-2→ESL-B-B2']);
    // kiracı kendi eşlemesini bağlar → taslak artık yenilenemez
    await db.maddeEslestirmesi.create({ data: { kaynakId: (await madde('ESL-A-1')).id, hedefId: (await madde('ESL-B-B2')).id, denklik: 'ilgili', koken: 'kiraci' } });
    const v3 = { ...v2, 'cerceve/ESL-A.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n2;;Kapsam;;1;;\n3;;Ek madde;;2;;\n4;;Dördüncü;;3;;\n` };
    const r = await kur(paket(DOGRU, {}, v3, { ...manifest, surum: '0.3.0' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.hatalar[0]).toMatchObject({ sinif: 'SÜRÜM', dosya: 'cerceve/ESL-A.json', mesaj: expect.stringContaining('(1 bağ, 0 düzenleme izi)') });
    // hiçbir şey değişmedi: 0.2.0 kurulu, kiracı eşlemesi yerinde
    expect((await db.icerikPaketiSurumu.findFirstOrThrow({ where: { paket: { kod: 'ESLEME-PAKET' }, durum: 'kurulu' } })).surum).toBe('0.2.0');
    expect(await db.maddeEslestirmesi.count({ where: { koken: 'kiraci', denklik: 'ilgili', kaynak: { kod: 'ESL-A-1' }, hedef: { kod: 'ESL-B-B2' } } })).toBe(1);
  });

  it('kurulu çerçeveye eşleme: yalnız eşleme taşıyan yatay paket; başka kökenli eşleme çelişki; bırakılan pasif, yeniden beyan aktif; kaldırma pasifler [URN-PKT-014]', async () => {
    const yatay = (csv: string, surum: string, kimlikEk: Record<string, unknown> = {}) => paketYaz(
      { 'esleme/ESL-KURULU.json': KIMLIK({ kod: 'ESL-KURULU', eslemeDosyasi: 'ESL-KURULU.csv', ...kimlikEk }), 'esleme/ESL-KURULU.csv': csv },
      { kod: 'ESLEME-KURULU', tur: 'yatay', sektor: null, surum });
    // 1→B1 ESLEME-PAKET'in eşlemesi (başka köken) → çelişki; 2→B1 yeni
    const a = await kur(yatay(`${ESLEME_BASLIK}\n1;B1;tam;\n2;B1;kismi;\n`, '0.1.0'));
    expect(a.ok, JSON.stringify(a)).toBe(true);
    if (!a.ok) return;
    expect(a.rapor.sayilar).toMatchObject({ eslemeler: 1, cerceveler: 0 });
    expect(a.rapor.celiskiler).toEqual([{ tablo: 'MaddeEslestirmesi', anahtar: 'ESL-KURULU:1→B1', sebep: expect.stringContaining('eşlemesi var') }]);
    expect((await paketEslemeleri(a.rapor.surumId)).map((e) => `${e.kaynak.kod}→${e.hedef.kod}`)).toEqual(['ESL-A-2→ESL-B-B1']);
    // kiracı eşlemesi 1→B2 (önceki testten) ezilmez; 0.2.0 2→B1'i bırakır → pasif
    const b = await kur(yatay(`${ESLEME_BASLIK}\n1;B2;tam;\n`, '0.2.0'));
    expect(b.ok, JSON.stringify(b)).toBe(true);
    if (!b.ok) return;
    expect(b.rapor.celiskiler).toEqual([{ tablo: 'MaddeEslestirmesi', anahtar: 'ESL-KURULU:1→B2', sebep: expect.stringContaining('eşlemesi var') }]);
    expect(await db.maddeEslestirmesi.count({ where: { koken: 'kiraci', denklik: 'ilgili', aktif: true, kaynak: { kod: 'ESL-A-1' }, hedef: { kod: 'ESL-B-B2' } } })).toBe(1);
    expect(b.rapor.pasiflestirilen).toMatchObject({ eslemeler: 1, kurallar: 0 });
    const birakilan = await db.maddeEslestirmesi.findFirstOrThrow({ where: { paketSurumId: a.rapor.surumId } });
    expect(birakilan).toMatchObject({ aktif: false, koken: 'paket' });
    // 0.3.0 yeniden beyan → aktif ve yeni sürüme geçer
    const c = await kur(yatay(`${ESLEME_BASLIK}\n2;B1;kismi;\n`, '0.3.0'));
    expect(c.ok, JSON.stringify(c)).toBe(true);
    if (!c.ok) return;
    expect(await db.maddeEslestirmesi.findUniqueOrThrow({ where: { id: birakilan.id } })).toMatchObject({ aktif: true, paketSurumId: c.rapor.surumId });
    // kaldırma = arşiv: paketin eşlemesi pasif, kiracının ve öbür paketin eşlemesi aktif, satır sayısı aynı
    const once = await db.maddeEslestirmesi.count();
    const k = await paketiKaldir('ESLEME-KURULU', db);
    expect(k.ok, JSON.stringify(k)).toBe(true);
    if (k.ok) expect(k.arsivlenen).toMatchObject({ eslemeler: 1, kurallar: 0 });
    expect((await db.maddeEslestirmesi.findUniqueOrThrow({ where: { id: birakilan.id } })).aktif).toBe(false);
    expect(await db.maddeEslestirmesi.count({ where: { aktif: true } })).toBe(once - 1);
    expect(await db.maddeEslestirmesi.count()).toBe(once);
  });

  it('kurulu çerçeve çözümü: yanlış sürüm etiketi KİMLİK, olmayan madde KİMLİK, telifli kurulu çerçeveye açıklama LİSANS — hiçbir satır yazılmaz [URN-PKT-014]', async () => {
    const yatay = (csv: string, kimlikEk: Record<string, unknown> = {}) => paketYaz(
      { 'esleme/ESL-HATA.json': KIMLIK({ kod: 'ESL-HATA', eslemeDosyasi: 'ESL-HATA.csv', ...kimlikEk }), 'esleme/ESL-HATA.csv': csv },
      { kod: 'ESLEME-HATA', tur: 'yatay', sektor: null, surum: '0.1.0' });
    const once = await db.maddeEslestirmesi.count();
    const etiket = await kur(yatay(`${ESLEME_BASLIK}\n1;B1;tam;\n`, { hedef: { cerceve: 'ESL-B', surumEtiketi: 'yok' } }));
    expect(etiket.ok).toBe(false);
    if (!etiket.ok) expect(etiket.hatalar[0]).toMatchObject({ sinif: 'KİMLİK', konum: 'hedef.cerceve', mesaj: expect.stringContaining('ESL-B yok sürümü bulunamadı') });
    const kod = await kur(yatay(`${ESLEME_BASLIK}\n9;B1;tam;\n`));
    expect(kod.ok).toBe(false);
    if (!kod.ok) expect(kod.hatalar[0]).toMatchObject({ sinif: 'KİMLİK', konum: '9→B1', mesaj: expect.stringContaining('ESL-A test-1 sürümünde 9 yok') });
    await db.regulasyon.update({ where: { kod: 'ESL-B' }, data: { lisansTuru: 'telifli' } });
    const telifli = await kur(yatay(`${ESLEME_BASLIK}\n2;B2;tam;Açıklama metni\n`));
    expect(telifli.ok).toBe(false);
    if (!telifli.ok) expect(telifli.hatalar[0]).toMatchObject({ sinif: 'LİSANS', mesaj: expect.stringContaining('ESL-B kurulu çerçevesi telifli') });
    await db.regulasyon.update({ where: { kod: 'ESL-B' }, data: { lisansTuru: 'kamuya_acik' } });
    expect(await db.maddeEslestirmesi.count()).toBe(once);
    expect(await db.icerikPaketi.findUnique({ where: { kod: 'ESLEME-HATA' } })).toBeNull();
  });
});

describe('taslak yenilemesinde bırakılan KENDİ eşlemesi RAPORA yazılır [URN-PKT-014]', () => {
  /* Bağımsız inceleme bulgusu (PR #43): taslak yenilenirken `madde.deleteMany`
     paketin kendi eşlemelerini kaskatla siliyor; uzlaştırma listesi SİLMEDEN
     SONRA okunduğu için rapor "0 eşleme bırakıldı" diyordu ve denetim izine o
     sayı giriyordu. Yeniden yazılan satır YENİ kimlik alır: karşılaştırma
     kimlikle değil ÇİFTLE yapılır, yoksa yenileme "hepsi bırakıldı" derdi. */
  let kuranId = '';
  beforeAll(async () => { kuranId = (await db.kullanici.findFirstOrThrow({ where: { aktif: true } })).id; });
  const KSK: PaketDosyalari = {
    'sozluk.json': [SOZLUK_SATIRI('tesis', 'şube')],
    'cerceve/KSK-A.json': cerceve('KSK-A', { tur: 'kamuya_acik', metinDahil: false }),
    'cerceve/KSK-A.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n2;;Kapsam;;1;;\n`,
    'cerceve/KSK-B.json': cerceve('KSK-B', { tur: 'kamuya_acik', metinDahil: false }),
    'cerceve/KSK-B.csv': `${CSV_BASLIK}\nB1;;Birinci;;0;;\nB2;;İkinci;;1;;\n`,
  };
  const kskPaket = (csv: string, dosyalar: PaketDosyalari, surum: string) => paketYaz({
    ...dosyalar,
    'esleme/KSK-A-B.json': { kod: 'KSK-A-B', ad: 'KSK eşlemesi', kaynak: { cerceve: 'KSK-A', surumEtiketi: 'test-1' }, hedef: { cerceve: 'KSK-B', surumEtiketi: 'test-1' }, lisans: { tur: 'kamuya_acik', metinDahil: true }, eslemeDosyasi: 'KSK-A-B.csv' },
    'esleme/KSK-A-B.csv': csv,
  }, { kod: 'KASKAT-PAKET', sektor: { kod: 'KASKAT-SEKTOR', ad: 'Kaskat' }, surum });

  it('iki eşlemeden birine düşen sürüm: kalan yeniden yazılır, düşen RAPORA girer [URN-PKT-014]', async () => {
    const ilk = await paketiKur(kskPaket(`${ESLEME_BASLIK}\n1;B1;tam;Aynı amaç\n2;B2;kismi;\n`, KSK, '0.1.0'), { kuranId, istemci: db });
    expect(ilk.ok, JSON.stringify(ilk)).toBe(true);
    if (!ilk.ok) return;
    expect(ilk.rapor.sayilar.eslemeler).toBe(2);
    /* Madde ağacı değişir → taslak YENİLENİR (kaskat yolu); CSV tek eşleme taşır. */
    const v2 = { ...KSK, 'cerceve/KSK-A.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n2;;Kapsam;;1;;\n3;;Üçüncü;;2;;\n` };
    const s2 = await paketiKur(kskPaket(`${ESLEME_BASLIK}\n1;B1;tam;Aynı amaç\n`, v2, '0.2.0'), { kuranId, istemci: db });
    expect(s2.ok, JSON.stringify(s2)).toBe(true);
    if (!s2.ok) return;
    expect(s2.rapor.sayilar.eslemeler).toBe(1);
    expect(s2.rapor.pasiflestirilen.eslemeler, 'bırakılan eşleme raporda görünmedi').toBe(1);
    const kalan = await db.maddeEslestirmesi.findMany({ where: { paketSurumId: s2.rapor.surumId }, include: { kaynak: { select: { kod: true } }, hedef: { select: { kod: true } } } });
    expect(kalan.map((e) => `${e.kaynak.kod}→${e.hedef.kod}`)).toEqual(['KSK-A-1→KSK-B-B1']);
  });

  it('hiçbir eşleme düşmeyen yenilemede rapor 0 der — yeniden yazım "bırakıldı" sayılmaz [URN-PKT-014]', async () => {
    const v3 = { ...KSK, 'cerceve/KSK-B.csv': `${CSV_BASLIK}\nB1;;Birinci;;0;;\nB2;;İkinci;;1;;\nB3;;Üçüncü;;2;;\n` };
    const s3 = await paketiKur(kskPaket(`${ESLEME_BASLIK}\n1;B1;tam;Aynı amaç\n`, v3, '0.3.0'), { kuranId, istemci: db });
    expect(s3.ok, JSON.stringify(s3)).toBe(true);
    if (s3.ok) expect(s3.rapor.pasiflestirilen.eslemeler).toBe(0);
  });
});
