import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   BOŞ KURULUM DUMAN KAPISI — MÜŞTERİNİN BİRİNCİ GÜNÜ [SIS-BOS-001]

   ── NEDEN BU KAPI VAR ─────────────────────────────────────────────────
   Kurulum provası (10 Eyl 2026) ürünün kurulup İÇİNE GİRİLEMEDİĞİNİ
   gösterdi: 174 tablo göç etti, sağlık ucu 200 döndü, `Kullanici`
   tablosunda sıfır satır vardı ve belgede ilk kullanıcıyı kuran adım
   yoktu. Kurucu hesap aracı o ÖRNEĞİ kapattı; SINIFI kapatmadı.

   Sınıf şudur: **dört bin testin hepsi tohumlanmış bir veritabanı
   varsayıyor.** `prisma/dev.db` kopyalanıyor, `rota:duman` fikstür
   tohumluyor, `kapi-compose` de öyle. Müşterinin birinci günü — hiçbir
   satırın olmadığı an — hiçbir kapının ölçtüğü şey değildi.

   Bu kapı TOHUMA DOKUNMAZ. Dokunduğu an ölçtüğü şey müşterinin birinci
   günü olmaktan çıkar ve "zaten kurulmuş bir sistemde şu da çalışıyor"a
   döner.

   ── NE ÖLÇÜLÜR ────────────────────────────────────────────────────────
   Sıfır satırdan başlayıp satılabilir bir duruma kadar YAZMA yolu:
   göç → ilk kullanıcı → giriş → paket → insan kararıyla aktifleştirme →
   kapsam öğesi ve tesis → madde durumu → denetim formu → yedek.

   Her adım ADIYLA, SÜRESİYLE ve SONUCUYLA raporlanır: "çalıştı" yetmez.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
/* Kapı SQLite'ta ölçer: boş bir veritabanını dosya olarak kurmak
   sağlayıcıdan bağımsız bir ilk gün için yeterlidir ve PostgreSQL
   koşumunda üretilmiş istemci SQLite adaptörünü kabul etmez
   (`arac/pg-istemci.mjs`). PostgreSQL'in ilk günü gerçek compose
   kurulumunda ölçüldü (`docs/KURULUM_PROVASI.md`). */
const POSTGRES = /^postgres(ql)?:\/\//i.test(
  process.env.TEST_PG_URL ?? process.env.DATABASE_URL ?? '');
const tanimla = POSTGRES ? describe.skip : describe;

/* ── ATLAMA BEYANLI OLABİLİR, SESSİZ OLAMAZ ────────────────────────────
   Bağımsız inceleme bulgusu (PR #51, tur 1): `describe.skip` çıkış
   kodunu DEĞİŞTİRMEZ. Tek bir ortam değişkeni (`DATABASE_URL`) bu
   kapıyı, hiçbir şey ölçmeden sıfırla çıkan bir CI adımına çeviriyordu —
   "otuz iki kapının hiçbiri bunu göremedi" diye doğan kapının başına
   gelebilecek en kötü şey. Deponun kendi kalıbı (`bekci/bos-durum`,
   `bekci/politika-olcumu`) ölçemediği anda CI'da kırmızı yanmaktır.

   İki diş:
   1. ADANMIŞ KAPI ÖLÇMEK ZORUNDADIR. `npm run kapi:bos-kurulum`
      `KAPI_BOS_KURULUM=1` ile koşar; o bayrak varken atlama KIRMIZIDIR.
      Adanmış adımın tam kümedeki koşumdan farkı budur — adım "aynı
      dosyayı ikinci kez koşmak" değil, "atlanamayacağı ortamda
      koşmak"tır.
   2. TAM KÜMEDE atlama kabul edilir ama SEBEBİ ÖLÇÜLÜR: yalnız gerçek
      bir PostgreSQL koşumunda (`TEST_PG_URL`) atlanabilir. `kapi` işine
      bir gün `DATABASE_URL: postgresql://…` yazılırsa kapı sessizce
      kaybolmaz, kırmızı yanar. */
describe('SAĞLAYICI BEYANI · atlama sessiz olamaz [SIS-BOS-001]', () => {
  it('atlandıysa SEBEBİ ölçülür; adanmış kapıda atlama YASAK [SIS-BOS-001]', () => {
    if (!POSTGRES) {
      /* Gerçek kapı koştu. Ölçüm burada değil, dokuz adımda. */
      expect(process.env.TEST_DB, 'kapı boş veritabanına kurulmadı').toBeTruthy();
      return;
    }
    expect(process.env.KAPI_BOS_KURULUM ?? '',
      'ADANMIŞ KAPI ATLANDI: `kapi:bos-kurulum` müşterinin birinci gününü '
      + 'ölçmek zorundadır; PostgreSQL koşumu için `npm test`/`test:pg` '
      + 'kullanılır').toBe('');
    expect(process.env.TEST_PG_URL ?? '',
      'ATLAMA SEBEPSİZ: kapı yalnız gerçek bir PostgreSQL test koşumunda '
      + '(`TEST_PG_URL`) atlanabilir — `DATABASE_URL` ile atlatılamaz')
      .not.toBe('');
  });
});

const yuva = path.join(KOK, '.parti');
mkdirSync(yuva, { recursive: true });
const calisma = mkdtempSync(path.join(yuva, 'bos-kurulum-'));
const bosDb = path.join(calisma, 'bos.db');
/* TEST_DB, `lib/db` sahtesinin okuduğu değişkendir; TOHUM KOPYALANMAZ. */
process.env.TEST_DB = bosDb;

const KURUCU = { eposta: 'kurucu@ilkgun.local', ad: 'Kurgusal İlk Kullanıcı' };
const PAROLA = 'ilk-gun-kurgusal-parolasi';

/* ── ÇEREZ VE BAŞLIK: GERÇEK GİRİŞ YOLU SÜRÜLÜR ────────────────────────
   `girisYap` oturumu çerezle açar. Çerezi sahtelemek yerine GERÇEK bir
   depo verilir: oturum yazılır, `aktifKullanici` onu geri okur. Böylece
   ölçülen şey "parola doğru mu" değil, GİRİŞİN KENDİSİDİR. */
const cerezDeposu = new Map<string, string>();
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (ad: string) => (cerezDeposu.has(ad) ? { name: ad, value: cerezDeposu.get(ad) } : undefined),
    set: (ad: string | { name: string; value: string }, deger?: string) => {
      if (typeof ad === 'string') cerezDeposu.set(ad, deger ?? '');
      else cerezDeposu.set(ad.name, ad.value);
    },
    delete: (ad: string) => { cerezDeposu.delete(ad); },
  }),
  headers: async () => new Headers({ 'x-forwarded-for': '127.0.0.1' }),
}));

const { db } = await import('@/lib/db');
const { kurucuHesapAc, istemciKur } = await import('../arac/kurucu-hesap');
const { girisYap } = await import('@/lib/girisEylemleri');
const { aktifKullanici } = await import('@/lib/auth');
const { paketKur } = await import('@/lib/eylemler2/paket');
const { surumAktiflestir } = await import('@/lib/eylemler2/surum');
const { tesisKaydet, maddeDurumGuncelle } = await import('@/lib/eylemler');
const { denetimFormuUretEylem } = await import('@/lib/eylemler2/denetimFormu');

/** Adım kütüğü — her adım ADIYLA, SÜRESİYLE ve SONUCUYLA raporlanır. */
const adimlar: { ad: string; ms: number; sonuc: string }[] = [];
async function adim<T>(ad: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    const r = await fn();
    adimlar.push({ ad, ms: Date.now() - t0, sonuc: 'geçti' });
    return r;
  } catch (e) {
    /* İLK SATIR DEĞİL, İLK DOLU SATIR. Prisma hataları satır başıyla
       başlar; `split('\n')[0]` boş dize verir ve kapı "KIRMIZI · " diye
       sebepsiz bir satır yazardı — ölçüm aracının kendi körlüğü. */
    const sebep = String((e as Error).message ?? e)
      .split('\n').map((s) => s.trim()).find((s) => s.length > 0) ?? 'sebep yazılmadı';
    adimlar.push({ ad, ms: Date.now() - t0, sonuc: `KIRMIZI · ${sebep}` });
    throw e;
  }
}

beforeAll(() => {
  if (POSTGRES) return;
  const ayar = path.join(calisma, 'prisma.config.ts');
  writeFileSync(ayar, [
    "import { defineConfig } from 'prisma/config';",
    'export default defineConfig({',
    `  schema: ${JSON.stringify(path.join(KOK, 'prisma', 'schema.prisma'))},`,
    `  migrations: { path: ${JSON.stringify(path.join(KOK, 'prisma', 'migrations'))} },`,
    `  datasource: { url: ${JSON.stringify(`file:${bosDb}`)} },`,
    '});',
    '',
  ].join('\n'));
  execFileSync(path.join(KOK, 'node_modules', '.bin', 'prisma'),
    ['migrate', 'deploy', '--config', ayar],
    { cwd: KOK, stdio: 'ignore', env: { ...process.env, BROWSER: 'none' } });
}, 300_000);

afterAll(async () => {
  if (!POSTGRES) {
    /* ADIM ÖLÇÜMÜ HER KOŞUMDA YAZILIR — "çalıştı" yetmez. */
    const satirlar = adimlar.map((a) => `  ${a.sonuc === 'geçti' ? '✓' : '✗'} ${a.ad} · ${a.ms} ms · ${a.sonuc}`);
    console.log(`\nBOŞ KURULUM DUMAN KAPISI · ${adimlar.length} adım\n${satirlar.join('\n')}`);
    await db.$disconnect();
  }
  rmSync(calisma, { recursive: true, force: true });
  if (existsSync(calisma)) throw new Error(`geçici dizin silinemedi: ${calisma}`);
});

tanimla('MÜŞTERİNİN BİRİNCİ GÜNÜ · sıfır satırdan başlar [SIS-BOS-001]', () => {
  let kurucuId = '';
  let regulasyonId = '';
  let tesisId = '';

  it('1 · GÖÇ ZİNCİRİ boş veritabanına uygulandı ve kurulum GERÇEKTEN boş [SIS-BOS-001]', async () => {
    await adim('göç zinciri · boş veritabanı', async () => {
      const t = await db.$queryRawUnsafe<{ c: number }[]>(
        "SELECT count(*) AS c FROM sqlite_master WHERE type='table'");
      expect(Number(t[0].c), 'göç uygulanmadı').toBeGreaterThan(100);
      /* TOHUMA DOKUNULMADI: bunu ölçen şey sıfırlardır. */
      expect(await db.kullanici.count(), 'kurulum boş değil — tohum sızmış').toBe(0);
      expect(await db.regulasyon.count(), 'çerçeve tohumlanmış').toBe(0);
      expect(await db.tesis.count(), 'tesis tohumlanmış').toBe(0);
    });
  });

  it('2 · KURUCU HESAP açıldı — kurulum artık girilebilir [SIS-BOS-001]', async () => {
    const s = await adim('kurucu hesap', async () => {
      const r = await kurucuHesapAc(istemciKur(`file:${bosDb}`),
        { ...KURUCU, parola: PAROLA });
      if (!r.ok) throw new Error(r.hata);
      return r;
    });
    kurucuId = s.kullaniciId;
    expect(await db.kullanici.count()).toBe(1);
    expect(await db.yetki.count(), 'kurucunun yetkisi yazılmadı').toBe(1);
  });

  it('3 · GİRİŞ yapıldı — oturum gerçekten açıldı [SIS-BOS-001]', async () => {
    await adim('giriş', async () => {
      /* BAŞARILI GİRİŞ `redirect()` FIRLATIR — Next'in yönlendirme
         sinyali bir Error olarak taşınır ve `girisYap` başarıda onu
         atar. Yani burada "hata yok" yeterli DEĞİL: yönlendirme
         sinyalini başarı, başka her fırlatmayı kırmızı saymak gerekir.
         Sinyali hata sanan bir kapı, çalışan girişi kırmızı yakardı. */
      const yonlendirmeMi = (e: unknown) => {
        const s = String((e as Error)?.message ?? e);
        return s.startsWith('REDIRECT:') || s.includes('NEXT_REDIRECT');
      };
      try {
        const r = await girisYap({ eposta: KURUCU.eposta, parola: PAROLA });
        if (!r.ok) throw new Error(r.hata ?? 'giriş reddedildi');
      } catch (e) {
        if (!yonlendirmeMi(e)) throw e;
      }
      /* Oturumun AÇILDIĞI çerezden değil, kullanıcının geri OKUNMASINDAN
         ölçülür: çerez yazılıp oturum yazılmasaydı da çerez dolu olurdu. */
      const k = await aktifKullanici();
      expect(k?.id, 'oturum açıldı ama kullanıcı okunamadı').toBe(kurucuId);
    });
  });

  it('4 · PAKET kuruldu — çerçeveler TASLAK geldi [SIS-BOS-001]', async () => {
    await adim('TR-ENERJI paketi', async () => {
      const r = await paketKur({ kod: 'TR-ENERJI' });
      if (!r.ok) throw new Error(r.hata);
      expect(r.rapor.sayilar.cerceveler, 'çerçeve kurulmadı').toBeGreaterThan(0);
      expect(r.rapor.sayilar.maddeler, 'madde kurulmadı').toBeGreaterThan(0);
    });
    /* AKTİFLEŞTİRME İNSAN KARARIDIR: paket hiçbir sürümü yürürlüğe almaz. */
    expect(await db.frameworkSurumu.count({ where: { durum: 'aktif' } }),
      'paket kendiliğinden çerçeve aktifleştirdi').toBe(0);
  });

  it('5 · AKTİFLEŞTİRME insan kararıyla verildi [SIS-BOS-001]', async () => {
    await adim('çerçeve aktifleştirme · insan kararı', async () => {
      const taslak = await db.frameworkSurumu.findFirst({
        where: { durum: 'taslak' }, orderBy: { olusturuldu: 'asc' },
        select: { id: true, regulasyonId: true },
      });
      if (!taslak) throw new Error('taslak sürüm yok');
      regulasyonId = taslak.regulasyonId;
      const r = await surumAktiflestir({ surumId: taslak.id });
      if (!r.ok) throw new Error(r.hata);
    });
    expect(await db.frameworkSurumu.count({ where: { durum: 'aktif' } })).toBe(1);
  });

  it('6 · İLK TESİS kaydedildi [SIS-BOS-001]', async () => {
    await adim('ilk tesis', async () => {
      const r = await tesisKaydet({ kod: 'ILK-01', ad: 'Kurgusal İlk Saha' });
      if (!r.ok) throw new Error(r.hata);
      const t = await db.tesis.findFirst({ where: { kod: 'ILK-01' }, select: { id: true } });
      if (!t) throw new Error('tesis yazılmadı');
      tesisId = t.id;
    });
    expect(await db.tesis.count()).toBe(1);
    /* KAPSAM ÖĞESİ tesisle birlikte doğar — uyum zincirinin öznesi odur. */
    expect(await db.kapsamOgesi.count({ where: { tesisId } }),
      'tesis kaydı kapsam öğesi açmadı').toBeGreaterThan(0);
  });

  it('7 · BİR MADDEYE DURUM yazıldı [SIS-BOS-001]', async () => {
    await adim('madde durumu', async () => {
      const madde = await db.madde.findFirst({
        where: { surum: { durum: 'aktif' } }, select: { id: true },
      });
      if (!madde) throw new Error('aktif sürümde madde yok');
      const kapsam = await db.kapsamOgesi.findFirst({ where: { tesisId }, select: { id: true } });
      const surec = await db.uyumSureci.create({
        data: { kod: 'ILK-GUN-01', ad: 'Kurgusal ilk değerlendirme', regulasyonId, durum: 'aktif' },
        select: { id: true },
      });
      const durum = await db.maddeDurumu.create({
        data: { maddeId: madde.id, surecId: surec.id, kapsamOgesiId: kapsam!.id, durum: 'baslanmadi' },
        select: { id: true },
      });
      const r = await maddeDurumGuncelle({
        id: durum.id, durum: 'kismi', not: 'Kurgusal ilk gün değerlendirmesi.',
      });
      if (!r.ok) throw new Error(r.hata || 'maddeDurumGuncelle boş hata döndü');
      const sonra = await db.maddeDurumu.findUnique({ where: { id: durum.id } });
      expect(sonra?.durum, 'durum yazılmadı').toBe('kismi');
    });
  });

  it('8 · DENETİM FORMU üretildi [SIS-BOS-001]', async () => {
    await adim('denetim formu', async () => {
      const r = await denetimFormuUretEylem({
        regulasyonId, tesisIdleri: [tesisId], tur: 'oz_denetim',
      });
      if (!r.ok) throw new Error(r.hata);
      /* Sunucu dosya YAZMAZ: indirme istemcide yapılır. Bu yüzden ölçüm
         iki gövdenin de DOLU olmasıdır — boş bir CSV de "form üretildi"
         görünürdü. */
      expect(r.csvAdi, 'CSV adı yok').toBeTruthy();
      expect(r.csv.length, 'CSV gövdesi boş').toBeGreaterThan(0);
      expect(r.xlsxAdi, 'XLSX adı yok').toBeTruthy();
      expect(r.xlsxBase64.length, 'XLSX gövdesi boş').toBeGreaterThan(0);
      expect(r.olcum, 'form ölçümü yok').toBeTruthy();
    });
  });

  it('9 · YEDEK alındı ve DOĞRULANDI [SIS-BOS-001]', async () => {
    await adim('yedek + doğrulama', async () => {
      const hedef = path.join(calisma, 'yedek');
      const depo = path.join(calisma, 'kanit');
      mkdirSync(depo, { recursive: true });
      const yedek = path.join(KOK, 'arac', 'yedek.mjs');
      const cevre = { ...process.env, DATABASE_URL: `file:${bosDb}`, KANIT_DEPO_KOKU: depo };
      const kosYedek = (...args: string[]) => {
        try {
          return execFileSync('node', [yedek, ...args], { cwd: KOK, encoding: 'utf8', env: cevre });
        } catch (e) {
          const h = e as { stdout?: string; stderr?: string; message: string };
          throw new Error(`${args[0]}: ${(h.stderr || h.stdout || h.message).split('\n').slice(-3).join(' · ')}`);
        }
      };
      kosYedek('--al', hedef);
      const cikti = kosYedek('--karsilastir', hedef);
      expect(cikti, 'yedek doğrulaması sağlam demiyor').toMatch(/SAĞLAM/);
    });
  });

  it('KAPININ KENDİSİ · dokuz adımın dokuzu da GEÇTİ ve tohuma dokunulmadı [SIS-BOS-001]', () => {
    /* Sıfır adımla "kapı geçti" demek, hiçbir şeye bakmadan temiz
       raporlamaktır. */
    expect(adimlar.length, 'adım kütüğü boş — kapı hiçbir şey ölçmedi').toBe(9);
    const kirmizilar = adimlar.filter((a) => a.sonuc !== 'geçti');
    expect(kirmizilar.map((a) => `${a.ad}: ${a.sonuc}`)).toEqual([]);
    /* Kapının ölçüm dosyası TOHUM DEĞİLDİR — bu iddia dosyanın kendi
       yolundan ölçülür. */
    expect(process.env.TEST_DB, 'kapı tohuma bağlandı').toBe(bosDb);
    expect(bosDb.includes('dev.db'), 'kapı geliştirme veritabanını kullandı').toBe(false);
  });
});
