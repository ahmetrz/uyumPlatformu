import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CSV_BASLIK, SOZLUK_SATIRI, cerceve, paketYaz, type PaketDosyalari } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · UYGULANABİLİRLİK BEYANI — kurulum, uzlaştırma, kaldırma, /uyum
   (URN-PKT-020 · URN-PKT-021)

   Paket çerçevenin hangi kapsam öğesi TÜRÜNE, hangi koşulla asıldığını
   BEYAN eder; kurucu bunu `UygulanabilirlikKurali` (köken paket) olarak
   yazar. Sınananlar:

   · beyan → kural (köken paket, aktif, koşul beyandan türetilmiş);
   · koşul değişince kural SÜRÜMÜ artar — eski kararın hangi kuralla
     verildiği belli kalır;
   · beyan bırakılınca kural PASİF (silinmez, R-C); kaldırma da pasifler;
   · kiracının kendi kuralına DOKUNULMAZ;
   · `/uyum`: paket TASLAK kurar, ekran çerçeveyi "aktif sürüm yok · N
     madde taslak" diye gösterir — 0 kontrol diye DEĞİL (bilinmeyen ≠
     sıfır) ve hiçbir sürüm kendiliğinden aktifleşmez.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-paket-uyg-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { paketiKaldir, paketiKur } = await import('@/lib/paket/kur');
const { cerceveleriYukle } = await import('@/app/(kabuk)/(operasyonel)/uyum/veri');

const KOK = process.cwd();
const OZNITELIK = { anahtar: 'uygGuc', tip: 'sayi', birim: 'MWe', etiketAnahtari: 'uygGuc', rol: null, grup: null, secenekler: null, kuraldaKullanilir: true, sira: 1 };
const TUR = { kod: 'uyg_sistem', ad: 'Uygulanabilirlik sistemi', etiketAnahtari: null, tesiseBagli: false, sira: 10 };
const manifest = { kod: 'UYG-PAKET', sektor: { kod: 'UYG-SEKTOR', ad: 'Uygulanabilirlik' } };
const dosyalar = (beyan: unknown): PaketDosyalari => ({
  'sozluk.json': [SOZLUK_SATIRI('tesis', 'santral')],
  'kapsam-turleri.json': [TUR],
  'oznitelikler.json': [OZNITELIK],
  'cerceve/UYG-REG.json': { ...cerceve('UYG-REG', { tur: 'kamuya_acik', metinDahil: false }), uygulanabilirlik: beyan },
  'cerceve/UYG-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n`,
});
const BEYAN = { kapsamTurleri: ['tesis'], kosul: { herhangi: [{ alan: 'uygGuc', islec: '>=', deger: 100 }] }, aciklama: 'MADDE 2 (1)' };
let kuranId: string;
const kur = (beyan: unknown, surum: string) => paketiKur(paketYaz(dosyalar(beyan), { ...manifest, surum }), { kuranId, istemci: db });
const kural = () => db.uygulanabilirlikKurali.findFirstOrThrow({ where: { regulasyon: { kod: 'UYG-REG' } } });

beforeAll(async () => { kuranId = (await db.kullanici.findFirstOrThrow({ where: { aktif: true } })).id; });

describe('beyan → UygulanabilirlikKurali [URN-PKT-020]', () => {
  it('kurulum kuralı köken paket olarak yazar; koşul beyandan türer, karar YAZILMAZ [URN-PKT-020]', async () => {
    const s = await kur(BEYAN, '0.1.0');
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.sayilar.kurallar).toBe(1);
    const k = await kural();
    expect(k).toMatchObject({ koken: 'paket', aktif: true, surum: 1, paketSurumId: s.rapor.surumId, aciklama: 'MADDE 2 (1)' });
    expect(JSON.parse(k.kosulJson)).toEqual({ hepsi: [{ alan: 'kapsamTuru', islec: 'icinde', deger: ['tesis'] }, BEYAN.kosul] });
    // motor ÖNERİR: kurulum hiçbir kapsam kararı yazmaz
    expect(await db.uygulanabilirlikKarari.count({ where: { kuralId: k.id } })).toBe(0);
  });

  it('koşul değişince kural sürümü artar; aynı koşulda artmaz [URN-PKT-020]', async () => {
    const ayni = await kur(BEYAN, '0.1.1');
    expect(ayni.ok).toBe(true);
    expect((await kural()).surum).toBe(1);
    const degisik = await kur({ ...BEYAN, kosul: { herhangi: [{ alan: 'uygGuc', islec: '>=', deger: 50 }] } }, '0.2.0');
    expect(degisik.ok, JSON.stringify(degisik)).toBe(true);
    const k = await kural();
    expect(k.surum).toBe(2);
    expect(JSON.parse(k.kosulJson).hepsi[1].herhangi[0].deger).toBe(50);
  });

  it('beyan bırakılınca kural PASİF — satır durur, motor koşmaz [URN-PKT-020]', async () => {
    const s = await kur(null, '0.3.0');
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.sayilar.kurallar).toBe(0);
    expect(s.rapor.pasiflestirilen.kurallar).toBe(1);
    expect(await db.uygulanabilirlikKurali.count({ where: { regulasyon: { kod: 'UYG-REG' } } })).toBe(1);
    expect((await kural()).aktif).toBe(false);
  });

  it('kiracının kendi kuralına dokunulmaz; kaldırma paket kuralını pasifler, silmez [URN-PKT-020]', async () => {
    const geri = await kur(BEYAN, '0.4.0');
    expect(geri.ok).toBe(true);
    const reg = await db.regulasyon.findUniqueOrThrow({ where: { kod: 'UYG-REG' } });
    const kiraci = await db.uygulanabilirlikKurali.create({
      data: { regulasyonId: reg.id, ad: 'Kiracı kuralı', kosulJson: JSON.stringify({ hepsi: [{ alan: 'uygGuc', islec: '>=', deger: 5 }] }) },
    });
    expect(kiraci).toMatchObject({ koken: 'kiraci', paketSurumId: null, aktif: true });
    const yeni = await kur(BEYAN, '0.5.0');
    expect(yeni.ok, JSON.stringify(yeni)).toBe(true);
    expect((await db.uygulanabilirlikKurali.findUniqueOrThrow({ where: { id: kiraci.id } }))).toMatchObject({ aktif: true, koken: 'kiraci' });

    const once = await db.uygulanabilirlikKurali.count({ where: { regulasyonId: reg.id } });
    const k = await paketiKaldir('UYG-PAKET', db);
    expect(k.ok, JSON.stringify(k)).toBe(true);
    if (!k.ok) return;
    expect(k.arsivlenen.kurallar).toBe(1);
    expect(await db.uygulanabilirlikKurali.count({ where: { regulasyonId: reg.id } })).toBe(once);
    expect((await db.uygulanabilirlikKurali.findUniqueOrThrow({ where: { id: kiraci.id } })).aktif).toBe(true);
    expect((await db.uygulanabilirlikKurali.findFirstOrThrow({ where: { regulasyonId: reg.id, koken: 'paket' } })).aktif).toBe(false);
  });
});

describe('motor beyanı KAPSAM ÖĞESİ TÜRÜYLE koşar [URN-PKT-020]', () => {
  /* Beyandaki tür bağı ancak motorun bağlamına GİRERSE iş görür: türü
     bağlama koymayan bir motor, `kapsamTuru icinde [...]` koşulunu sonsuza
     kadar "bilinmiyor" sayar ve hiçbir karar üretmez — sessizce. Bu test
     kurulum → kural → motor → karar zincirinin tamamını koşar. */
  it('türü listede olan öğe kapsamda, olmayan kapsam dışı; gerekçe türü yazar [URN-PKT-020]', async () => {
    const { tesisKapsaminiHesapla } = await import('@/lib/motorlar/uygulanabilirlik');
    const s = await kur({ kapsamTurleri: ['tesis'], kosul: { herhangi: [{ alan: 'uygGuc', islec: '>=', deger: 100 }] } }, '0.6.0');
    expect(s.ok, JSON.stringify(s)).toBe(true);
    const reg = await db.regulasyon.findUniqueOrThrow({ where: { kod: 'UYG-REG' } });
    /* Kiracının kuralı (önceki testte açıldı) bu ölçümü bulandırır: pasifleştirilir. */
    await db.uygulanabilirlikKurali.updateMany({ where: { regulasyonId: reg.id, koken: 'kiraci' }, data: { aktif: false } });

    const tesis = await db.tesis.findFirstOrThrow({ where: { kapsamOgesi: { tur: { kod: 'tesis' } } }, include: { kapsamOgesi: true } });
    await db.tesisOzellik.create({ data: { tesisId: tesis.id, anahtar: 'uygGuc', sayisalDeger: 790, kaynak: 'olcum' } });
    await tesisKapsaminiHesapla(tesis.id);
    const karar = await db.uygulanabilirlikKarari.findUniqueOrThrow({ where: { kapsamOgesiId_regulasyonId: { kapsamOgesiId: tesis.kapsamOgesi!.id, regulasyonId: reg.id } } });
    expect(karar.uygulanabilir, 'tür bağı bağlama girmedi — kapsamda olan öğe kapsam dışı sayıldı').toBe(true);
    expect(karar.gerekce, 'gerekçe hangi koşulla karar verildiğini yazmıyor').toContain('kapsamTuru');

    /* Türü listede OLMAYAN öğe (kurum) kapsam dışıdır — "bilinmiyor" değil. */
    const kurum = await db.tesis.findFirstOrThrow({ where: { kapsamOgesi: { tur: { kod: 'kurum' } } }, include: { kapsamOgesi: true } });
    await db.tesisOzellik.create({ data: { tesisId: kurum.id, anahtar: 'uygGuc', sayisalDeger: 790, kaynak: 'olcum' } });
    await tesisKapsaminiHesapla(kurum.id);
    const kurumKarari = await db.uygulanabilirlikKarari.findUniqueOrThrow({ where: { kapsamOgesiId_regulasyonId: { kapsamOgesiId: kurum.kapsamOgesi!.id, regulasyonId: reg.id } } });
    expect(kurumKarari.uygulanabilir).toBe(false);
  });
});

describe('TR-ENERJI kurulumu · /uyum kanıtı [URN-PKT-021]', () => {
  it('paket kurulur: iki çerçeve TASLAK, 601 madde, hiçbir sürüm aktif değil [URN-PKT-021]', async () => {
    const s = await paketiKur(path.join(KOK, 'paketler', 'TR-ENERJI'), { kuranId, istemci: db });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.sayilar).toMatchObject({ cerceveler: 2, maddeler: 601, kurallar: 2 });
    const surumler = await db.frameworkSurumu.findMany({ where: { paketSurumId: s.rapor.surumId }, orderBy: { surumEtiketi: 'asc' } });
    expect(surumler.map((x) => x.durum)).toEqual(['taslak', 'taslak']);
    /* Paketin beyanı SÜRÜME iner: kurulumda buharlaşınca veritabanında kurgusal metin
       gerçek mevzuattan ayırt edilemiyordu (inceleme, PR #43 tur 2). */
    expect(surumler.every((x) => (x.paketNotu ?? '').length > 0), 'paket notu kurulumda düştü').toBe(true);
    expect(surumler.every((x) => x.temsili === false), 'resmî içerik temsilî işaretlendi').toBe(true);
    /* Kıyas: tohumla kurulan DEMO çerçevesi TEMSİLÎ işaretlidir — kurgusal metin
       veritabanında gerçek mevzuattan ayırt edilebilir. */
    const demo = await db.frameworkSurumu.findFirst({ where: { regulasyon: { kod: 'CBDDO' } } });
    expect(demo?.temsili, 'demo çerçevesi temsilî işaretlenmedi').toBe(true);
    expect(demo?.paketNotu ?? '').toMatch(/TEMSİLÎ/);
    expect(await db.frameworkSurumu.count({ where: { paketSurumId: s.rapor.surumId, durum: 'aktif' } })).toBe(0);
  });

  it('madde köken alanları veritabanına iner: kaynak adresi, belge içi konum, erişim ve yürürlük tarihi [URN-PKT-019]', async () => {
    const m = await db.madde.findFirstOrThrow({ where: { kod: 'EPDK-SGYM-EK3-EAG-1' } });
    expect(m.maddeKaynakUrl).toMatch(/^https:\/\/www\.epdk\.gov\.tr\//);
    expect(m.kaynakSayfa).toMatch(/^Ek-3 · 01-/);
    expect(m.kaynakErisimTarihi?.toISOString().slice(0, 10)).toBe('2026-09-09');
    expect(m.gecerliBaslangic?.toISOString().slice(0, 10)).toBe('2024-01-28');
    expect(m.metin.length).toBeGreaterThan(40);
    const bolum = await db.madde.findFirstOrThrow({ where: { kod: 'EPDK-SGYM-BOLUM-1' } });
    expect(bolum.metin).toBe('metin girilmedi'); // uydurulmaz, boş bırakılmaz, sıfır sayılmaz
    /* EPDK kademesi ürünün HEDEF OLGUNLUĞUNA yazılmaz (bağımsız inceleme, PR #43 tur 2):
       `gereksinimTipi` kademeyi taşır, `olgunlukSeviyesi` BOŞ kalır — yoksa 508 zorunlu
       kontrolün hedefi ürünün en alt üç kademesine çekilir ve ad-hoc uygulama "hedefte"
       (yeşil) görünür. */
    expect(m.gereksinimTipi, 'kademe veritabanına inmedi').toBe('Seviye 1');
    expect(m.olgunlukSeviyesi, 'düzenleyicinin kademesi hedef olgunluk diye yazıldı').toBeNull();
    expect(await db.madde.count({ where: { kod: { startsWith: 'EPDK-SGYM-EK3-' }, gereksinimTipi: { not: null } } })).toBe(565);
    expect(await db.madde.count({ where: { kod: { startsWith: 'EPDK-SGYM-EK3-' }, olgunlukSeviyesi: { not: null } } })).toBe(0);
  });

  it('/uyum: çerçeve görünür ve "aktif sürüm yok · N madde taslak" der — 0 kontrol demez [URN-PKT-021]', async () => {
    const cerceveler = await cerceveleriYukle(null);
    const sgym = cerceveler.find((c) => c.kod === 'EPDK-SGYM');
    const ek3 = cerceveler.find((c) => c.kod === 'EPDK-SGYM-EK3');
    expect(sgym, 'çerçeve /uyum listesinde yok').toBeTruthy();
    expect(sgym!.taslak).toEqual({ surumEtiketi: 'RG-2025-11-25-33088', maddeSayisi: 23 });
    expect(ek3!.taslak).toEqual({ surumEtiketi: 'RG-2025-11-25-33088', maddeSayisi: 578 });
    // taslak maddeler matrise GİRMEZ: aktif sürüm yok
    expect(sgym!.metrikler.maddeSayisi).toBe(0);
    expect(sgym!.surumEtiketi).toBe('RG-2025-11-25-33088'); // Regulasyon.surum — kimlikten
    // aktif sürümü olan çerçevede taslak alanı boştur (kıyas kaydı)
    const aktifli = cerceveler.find((c) => c.taslak === null && c.metrikler.maddeSayisi > 0);
    expect(aktifli, 'aktif sürümlü çerçeve yok — kıyas ölçülemedi').toBeTruthy();
  });
});
