import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import {
  BOS_KURULUM_SOZU, KURULUM_KURUCU_ANAHTARI, KURUCU_PAROLA_EN_AZ, KURUCU_ROL,
  baglantiOzeti, girdiKusurlari, hataTemizle, istemciKur, kurucuHesapAc, ozetle,
  sqliteYolu,
} from '../arac/kurucu-hesap';
import { parolaDogru } from '@/lib/auth';
import { ROL_IZINLERI } from '@/lib/erisim';
import { PAROLA_EN_AZ } from '@/app/(kabuk)/(operasyonel)/ayarlar/mantik';
import type { PrismaClient } from '@/lib/prisma-client/client';

/* ═══════════════════════════════════════════════════════════════════════
   KURUCU HESAP · BOŞ KURULUMUN İLK KULLANICISI [SIS-KUR-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Kurulum provası: belge harfiyen izlendi, kurulum ayağa kalktı ve
   İÇİNE GİRİLEMEDİ — `Kullanici` tablosu boştu, giriş ekranı parola
   istiyordu, belgede ilk kullanıcıyı kuran adım yoktu. Kapılar bunu
   göremezdi çünkü `rota:duman` da `kapi-compose` de kuruluma bir
   kullanıcı KOYARAK ölçüyordu.

   ── NEDEN BOŞ VERİTABANI KURUYORUZ ────────────────────────────────────
   Ölçülecek şey "boş kurulum" davranışıdır; `prisma/dev.db` doludur ve
   ondan kullanıcı silmek denetim izi değişmezliği tetikleyicilerine
   çarpar. Bu yüzden zincir boş bir dosyaya uygulanır — kurulumun
   yaptığının aynısı.

   ── İKİ AYRI ŞEY ÖLÇÜLÜR ──────────────────────────────────────────────
   1. Aracın KENDİ davranışı (boş kurulumda açar, dolu kurulumda yazmaz).
   2. Aracın ürünle BAĞLARI: parola özeti girişin doğrulayıcısıyla
      uyuşuyor mu, alt sınır ürünün alt sınırıyla aynı mı, rol gerçek
      katalogda var mı. R-F'in dersi: iki parçanın ayrı ayrı doğru olması
      aralarındaki bağı kurmuş SAYILMAZ — kurucu hesabın özeti girişin
      beklediğinden farklıysa kusur "parola yanlış" diye görünür.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── SAĞLAYICI · BU DOSYA SQLITE KOŞUMUNDA ÖLÇER ────────────────────────
   Ölçüldü (parti kapanışı, `kapi-postgres`): bu dosya PostgreSQL
   koşumunda DOSYA DÜZEYİNDE düşüyordu. Sebep deponun kendi ölçtüğü
   kuraldır (`arac/pg-istemci.mjs`): üretilmiş Prisma istemcisi
   SAĞLAYICIYA BAĞLIDIR ve postgres istemcisine SQLite adaptörü
   takılamaz. Yani "boş bir SQLite kur" adımı postgres koşumunda
   imkânsızdır, kodun kusuru değildir.

   Kurucu hesabın PostgreSQL yolu ÖLÇÜLMEDİ DEĞİLDİR: gerçek compose
   kurulumunda (PostgreSQL) koşturuldu — 2 sn, ikinci koşu reddedildi ve
   hiçbir şey yazmadı (`docs/KURULUM_PROVASI.md` §1). Buradaki atlama o
   ölçümün yerine geçmez; yalnız aynı şeyi ikinci sağlayıcıda tekrar
   ölçemediğimizi söyler.

   Saf vakalar (bağlar: parola özeti, alt sınır, rol kataloğu) veritabanı
   istemez ve HER İKİ koşumda da koşar. */
const POSTGRES = /^postgres(ql)?:\/\//i.test(
  process.env.TEST_PG_URL ?? process.env.DATABASE_URL ?? '');
const dbTanimla = POSTGRES ? describe.skip : describe;

/* ── ATLAMA BEYANLI OLABİLİR, SESSİZ OLAMAZ ────────────────────────────
   Bağımsız inceleme bulgusu (PR #51, tur 1): `describe.skip` çıkış
   kodunu değiştirmez — tek bir `DATABASE_URL` bu dosyanın veritabanı
   isteyen vakalarını sessizce yok ediyordu ve `arac/test-envanteri.json`
   yine "atlanan: 0" diyordu. Atlamanın SEBEBİ ölçülür: yalnız gerçek bir
   PostgreSQL test koşumunda (`TEST_PG_URL`) atlanabilir. */
describe('SAĞLAYICI BEYANI · atlama sessiz olamaz [SIS-KUR-001]', () => {
  it('atlandıysa SEBEBİ gerçek bir PostgreSQL koşumudur [SIS-KUR-001]', () => {
    if (!POSTGRES) return; /* Gerçek vakalar koştu. */
    expect(process.env.TEST_PG_URL ?? '',
      'ATLAMA SEBEPSİZ: veritabanı vakaları yalnız `TEST_PG_URL` ile '
      + 'koşan bir PostgreSQL kümesinde atlanabilir').not.toBe('');
  });
});

const KOK = process.cwd();
const yuva = path.join(KOK, '.parti');
mkdirSync(yuva, { recursive: true });
const calisma = mkdtempSync(path.join(yuva, 'kurucu-hesap-'));
const bosDb = path.join(calisma, 'bos.db');
/* YARIŞ vakalarının KENDİ boş kurulumu. Göç zinciri iki kez uygulanmaz —
   henüz hiçbir şey yazılmamış dosya KOPYALANIR; "boş" olması ölçülür. */
const yarisDb = path.join(calisma, 'yaris.db');
let db: PrismaClient;
let dbYaris: PrismaClient;

const PAROLA = 'kurgusal-prova-parolasi-2026';

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
  db = istemciKur(`file:${bosDb}`);
  copyFileSync(bosDb, yarisDb);
  dbYaris = istemciKur(`file:${yarisDb}`);
}, 180_000);

afterAll(async () => {
  if (POSTGRES) return;
  await db?.$disconnect();
  await dbYaris?.$disconnect();
  rmSync(calisma, { recursive: true, force: true });
  /* "Sildim" diyen adım sildiğini ölçer. */
  if (existsSync(calisma)) throw new Error(`geçici dizin silinemedi: ${calisma}`);
});

/** Üç tablonun satır sayısı — "hiçbir şey yazmadı" DELTA ile ölçülür. */
async function sayim() {
  return {
    kullanici: await db.kullanici.count(),
    yetki: await db.yetki.count(),
    iz: await db.aktiviteKaydi.count(),
  };
}

describe('BAĞLAR · veritabanı istemez, her iki sağlayıcıda koşar [SIS-KUR-001]', () => {
  it('PAROLA ALT SINIRI ürünün sınırıyla AYNI — bağ [SIS-KUR-001]', () => {
    /* Kopyalanan sayı bir gün ayrışır. En yetkili hesabın parolası
       ürünün geri kalanından zayıf olamaz. */
    expect(KURUCU_PAROLA_EN_AZ).toBe(PAROLA_EN_AZ);
    expect(girdiKusurlari({ eposta: 'a@b.local', ad: 'A', parola: 'x'.repeat(PAROLA_EN_AZ - 1) })
      .some((k) => k.alan === 'parola')).toBe(true);
    expect(girdiKusurlari({ eposta: 'a@b.local', ad: 'A', parola: 'x'.repeat(PAROLA_EN_AZ) })
      .some((k) => k.alan === 'parola')).toBe(false);
  });

  it('ROL gerçek yetki kataloğunda VAR — bağ [SIS-KUR-001]', () => {
    /* Katalogda olmayan bir rol, yetki satırı yazılmış ama hiçbir şeye
       izin vermeyen bir kurucu hesap üretirdi: giriş yapar, hiçbir ekranı
       göremez ve kusur "ürün bozuk" diye görünür. */
    expect(Object.keys(ROL_IZINLERI)).toContain(KURUCU_ROL);
  });

  it('HATA METNİ parola özetini SIZDIRMAZ [SIS-KUR-001]', () => {
    /* Bağımsız inceleme şüphesi (PR #51, tur 1): Prisma'nın doğrulama
       hatası sorunlu `data` nesnesini metne basar ve orada `parolaHash`
       durur. Aracın sözü "parolayı hiçbir yere yazmaz — ne günlüğe"
       idi; özet parolanın türevidir ve aynı söze tabidir. */
    const ozet = ozetle(PAROLA);
    const ham = `Invalid \`prisma.kullanici.create()\` invocation\n`
      + `{ eposta: "a@b.local", parolaHash: "${ozet}" }`;
    const temiz = hataTemizle(ham, ozet);
    expect(temiz, 'özet ham metinden silinmedi').not.toContain(ozet);
    expect(temiz).toContain('«parola özeti gizlendi»');
    /* İKİ DİŞ AYRI AYRI ÖLÇÜLÜR. Sabotaj turu (S86) ilk yazımda
       YAKMADI: iki diş tam olarak aynı vakayı örtüyordu, biri
       kaldırılınca öbürü sonucu kurtarıyordu ve "ölçtüm" dediğimiz şey
       yalnız kesişimdi. R-E'nin dersi: örtüşen iki savunmadan yalnız
       kesişimi ölçen bir vaka, ikisinin de tek tek doğru olduğunu
       SÖYLEMİŞ SAYILMAZ.

       Diş 2 · BİÇİM — özet elde YOKKEN de yakalanır; başka bir kayıttan
       (ör. giriş denemesi) gelmiş olabilir. */
    expect(hataTemizle(`kayit: ${ozet} sonu`), 'biçim dişi tutmadı').not.toContain(ozet);
    /* Diş 1 · DEĞER — biçim değişse bile BU çağrının özeti silinir.
       Özet şeması bir gün `s2$…` olursa biçim dişi kör kalır; değer
       dişi kalmaz. Vaka bu yüzden biçim dişinin TANIMADIĞI bir özet
       kullanır: yalnız birinci diş yakalayabilir. */
    const gelecekOzet = 's2$AAAA$BBBB';
    expect(hataTemizle(`kayit: ${gelecekOzet} sonu`), 'önkoşul: biçim dişi bunu tanımamalı')
      .toContain(gelecekOzet);
    expect(hataTemizle(`kayit: ${gelecekOzet} sonu`, gelecekOzet),
      'değer dişi tutmadı — biçimi değişen bir özet günlüğe sızar')
      .not.toContain(gelecekOzet);
    /* Metnin geri kalanı KORUNUR: sansürlenen mesaj, kusuru anlatmayan
       bir mesaja dönüşürse operatör sebebi göremez. */
    expect(temiz).toContain('prisma.kullanici.create()');
  });

  it('SQLITE YOLU Prisma kuralıyla çözülür ve GÖRÜNÜR [SIS-KUR-001]', () => {
    /* Bağımsız inceleme bulgusu (PR #51, tur 1): göreli yol iki kez
       birleşiyordu ve operatör bunu göremiyordu. Davranış Prisma'nın
       kuralıyla AYNI (göreli yol şema dizinine göredir) ve öyle kaldı;
       düzeltilen şey GÖRÜNÜRLÜK. */
    const kok = process.cwd();
    expect(sqliteYolu('file:./dev.db')).toBe(path.join(kok, 'prisma', 'dev.db'));
    expect(sqliteYolu(undefined)).toBe(path.join(kok, 'prisma', 'dev.db'));
    expect(sqliteYolu('file:/mutlak/yol/x.db')).toBe('/mutlak/yol/x.db');
    /* Şaşırtan hâl: `prisma/` iki kez. Prisma da bunu yapar; araç
       sessiz kalmaz, çözdüğü yolu YAZAR. */
    expect(sqliteYolu('file:./prisma/dev.db'))
      .toBe(path.join(kok, 'prisma', 'prisma', 'dev.db'));
    expect(baglantiOzeti('file:./prisma/dev.db'))
      .toContain(path.join('prisma', 'prisma', 'dev.db'));
    /* PostgreSQL özeti KİMLİK BİLGİSİ TAŞIMAZ: bağlantı dizesinde
       parola durur ve o dize kabuk günlüğüne basılmaz. */
    const ozet = baglantiOzeti('postgresql://kullanici:gizliparola@sunucu:5432/uyum');
    expect(ozet).toBe('PostgreSQL (DATABASE_URL)');
    expect(ozet).not.toContain('gizliparola');
  });

  it('PAROLA ÖZETİ girişin doğrulayıcısıyla UYUŞUR — bağ [SIS-KUR-001]', () => {
    /* R-F'in dersi: araç doğru, giriş doğru, aralarındaki bağ ölçülmemiş.
       Parametreler ayrışırsa kurucu hesap giriş yapamaz ve kusur "parola
       yanlış" diye — en yanıltıcı hâliyle — görünür. */
    const ozet = ozetle(PAROLA);
    expect(ozet.startsWith('s1$'), 'kayıt biçimi ayrışmış').toBe(true);
    expect(parolaDogru(PAROLA, ozet), 'giriş bu özeti doğrulayamıyor').toBe(true);
    expect(parolaDogru(`${PAROLA}x`, ozet), 'yanlış parola kabul edildi').toBe(false);
  });
});

dbTanimla('BOŞ kurulumda kurucu hesap [SIS-KUR-001]', () => {
  it('göç zinciri uygulandı ve kurulum GERÇEKTEN boş [SIS-KUR-001]', async () => {
    /* Sıfır ölçümle "boş kurulumda çalışıyor" demek, hiçbir şeye
       bakmadan temiz raporlamaktır. */
    const t = await db.$queryRawUnsafe<{ c: number }[]>(
      "SELECT count(*) AS c FROM sqlite_master WHERE type='table'");
    expect(Number(t[0].c), 'göç uygulanmamış').toBeGreaterThan(100);
    expect(await db.kullanici.count()).toBe(0);
  });

  it('GEÇERSİZ girdi reddedilir ve HİÇBİR ŞEY yazılmaz [SIS-KUR-001]', async () => {
    const once = await sayim();
    for (const [girdi, bekle] of [
      [{ eposta: 'adres-değil', ad: 'Ad', parola: PAROLA }, /adres olmalı/],
      [{ eposta: 'a@b.local', ad: '   ', parola: PAROLA }, /boş olamaz/],
      [{ eposta: 'a@b.local', ad: 'Ad', parola: 'kısa' }, /en az 12 karakter/],
    ] as const) {
      const s = await kurucuHesapAc(db, girdi);
      expect(s.ok, `kabul edilmemeliydi: ${JSON.stringify(girdi.eposta)}`).toBe(false);
      if (!s.ok) expect(s.hata).toMatch(bekle);
    }
    expect(await sayim(), 'reddedilen girdi yan etki bıraktı').toEqual(once);
  });




  it('kurucu hesap AÇILIR: kullanıcı + KÜRESEL yetki + denetim izi [SIS-KUR-001]', async () => {
    const s = await kurucuHesapAc(db, {
      eposta: '  Kurucu@Prova.Local ', ad: ' Kurgusal Kurucu ', parola: PAROLA,
    });
    expect(s.ok, s.ok ? '' : s.hata).toBe(true);
    if (!s.ok) return;

    const k = await db.kullanici.findUnique({ where: { id: s.kullaniciId } });
    /* E-posta KÜÇÜLTÜLÜR: aynı adres iki hesap açamasın (giriş de
       küçültülmüş adresle arar). */
    expect(k?.eposta).toBe('kurucu@prova.local');
    expect(k?.adSoyad).toBe('Kurgusal Kurucu');
    expect(k?.aktif).toBe(true);
    expect(parolaDogru(PAROLA, k?.parolaHash ?? null), 'kayıtlı özet girişi geçmiyor')
      .toBe(true);

    const y = await db.yetki.findMany({ where: { kullaniciId: s.kullaniciId } });
    expect(y).toHaveLength(1);
    expect(y[0].rol).toBe(KURUCU_ROL);
    /* Kapsam alanlarının HEPSİ null = küresel yetki. Biri dolu olsaydı
       kurucu hesap kendi kurulumunun bir kısmını göremezdi. */
    expect([y[0].modul, y[0].surecId, y[0].kapsamOgesiId, y[0].tuzelKisiId, y[0].regulasyonId])
      .toEqual([null, null, null, null, null]);

    const iz = await db.aktiviteKaydi.findMany({ where: { varlikId: s.kullaniciId } });
    expect(iz, 'denetim izinin ilk satırı yazılmamış').toHaveLength(1);
    expect(iz[0].eylem).toBe('olusturma');
    expect(iz[0].kaynak).toBe('kurulum');
    /* Aktör NULL ve bu bilerek: hesabı açan kişi henüz platformun
       kullanıcısı değil, veritabanına erişimi olan operatördür. */
    expect(iz[0].aktorId).toBeNull();
  });

  it('PAROLA denetim izine GİRMEZ — ne kendisi, ne özeti, ne uzunluğu [SIS-KUR-001]', async () => {
    const iz = await db.aktiviteKaydi.findMany();
    const metin = JSON.stringify(iz);
    expect(metin.includes(PAROLA), 'parola ize sızmış').toBe(false);
    expect(metin, 'parola özeti ize sızmış').not.toMatch(/s1\$[0-9a-f]{32}\$/);
    /* UZUNLUK da yazılmaz — ama "28" gibi bir sayı zaman damgasında ya da
       cuid içinde de geçer. Ham metinde sayı aramak YANLIŞ POZİTİF üretir
       (ölçüldü: vaka tam bu yüzden kırmızı yandı). Bu yüzden uzunluk
       İDDİASI ham metinde değil, izin KENDİ ALANLARINDA ölçülür. */
    for (const i of iz) {
      for (const alan of [i.gerekce, i.yeniDeger, i.oncekiDeger, i.alan]) {
        expect(alan ?? '', 'parola uzunluğu ize sızmış')
          .not.toMatch(new RegExp(`\\b${PAROLA.length}\\b`));
      }
    }
  });
});

dbTanimla('DOLU kurulumda araç HİÇBİR ŞEY yazmaz [SIS-KUR-001]', () => {
  it('ikinci koşu REDDEDİLİR ve üç tabloda da satır değişmez [SIS-KUR-001]', async () => {
    /* Aracın var oluş koşulu. Bu dal düşerse araç kalıcı bir arka
       kapıya döner: kapsayıcı kabuğuna erişen herkes, istediği an
       kendine küresel yönetici üretir. Yalnız reddi ölçmek YETMEZ —
       reddeden ama yan etkisini çoktan yazmış bir araç da "reddetti"
       görünürdü. */
    expect(await db.kullanici.count(), 'önkoşul: kurulum dolu olmalı')
      .toBeGreaterThan(0);
    const once = await sayim();
    const s = await kurucuHesapAc(db, {
      eposta: 'ikinci@prova.local', ad: 'İkinci Kurucu', parola: PAROLA,
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toBe(BOS_KURULUM_SOZU);
    expect(await sayim(), 'dolu kurulumda yan etki yazıldı').toEqual(once);
  });
});

dbTanimla('YARIŞ · iki operatör aynı anda [SIS-KUR-001]', () => {
  /* ── BAĞIMSIZ İNCELEME BULGUSU (PR #51, tur 1) ────────────────────────
     Kod "boşluk kontrolü transaction'ın İÇİNDEDİR, yani TOCTOU yok"
     diyordu. Kontrol gerçekten içerideydi — ama içeride olmak bu yarışı
     KAPATMAZ: PostgreSQL varsayılanı READ COMMITTED'tır ve BOŞ bir
     tabloda `count()` hiçbir kilit almaz. İki operatör aynı dakikada
     koşarsa ikisi de sıfır görür ve kurulum İKİ küresel yöneticiyle
     açılır. SQLite tek yazar olduğu için kusur geliştirme
     sağlayıcısında görünmüyordu: garanti ÜRETİM sağlayıcısında
     tutmuyordu.

     İKİ VAKA İKİ AYRI ŞEY ÖLÇER ve karıştırılmamalıdır:
     · Birincisi ARADAKİ ANI kurar — `Kullanici` hâlâ boş, ama yarışı
       kazanan taraf tekil satırını çoktan yazmış. `count()` bu anda
       KÖRDÜR; reddeden tek şey birincil anahtardır. Sağlayıcıdan
       bağımsızdır ve sabotajı yakan vaka budur.
     · İkincisi SONUCU ölçer: iki koşum gerçekten birlikte başlatılır ve
       kurulumda tek bir yönetici kalır. Hangi dişin (sayım mı, anahtar
       mı) devreye girdiği araya bağlıdır; better-sqlite3 yazarları
       sıraya soktuğu için burada çoğu zaman sayım kapatır — bu yüzden
       tek başına bu vaka YETMEZ. */

  it('ARADAKİ AN: tekil satır varken kullanıcı tablosu BOŞ — araç REDDEDER [SIS-KUR-001]', async () => {
    expect(await dbYaris.kullanici.count(), 'önkoşul: kurulum boş olmalı').toBe(0);
    /* Yarışı kazananın yazdığı satır. Kullanıcısı henüz görünmüyor:
       kaybeden transaction'ın anlık görüntüsü tam olarak budur. */
    await dbYaris.yapilandirma.create({
      data: { anahtar: KURULUM_KURUCU_ANAHTARI, degerJson: JSON.stringify({ eposta: 'kazanan@prova.local' }) },
    });
    const once = {
      kullanici: await dbYaris.kullanici.count(),
      yetki: await dbYaris.yetki.count(),
      iz: await dbYaris.aktiviteKaydi.count(),
    };
    expect(once.kullanici, 'vaka aradaki anı kurmuyor').toBe(0);

    const s = await kurucuHesapAc(dbYaris, {
      eposta: 'kaybeden@prova.local', ad: 'Kaybeden', parola: PAROLA,
    });
    expect(s.ok, 'ikinci yönetici açıldı — yarış kapalı değil').toBe(false);
    /* Operatör ham bir veritabanı hatası değil, ne olduğunu söyleyen
       cümleyi görür. */
    if (!s.ok) expect(s.hata).toBe(BOS_KURULUM_SOZU);
    /* Reddi ölçmek YETMEZ: reddeden ama kullanıcıyı çoktan yazmış bir
       araç da "reddetti" görünürdü. Transaction TÜMÜYLE geri alınmalı. */
    expect({
      kullanici: await dbYaris.kullanici.count(),
      yetki: await dbYaris.yetki.count(),
      iz: await dbYaris.aktiviteKaydi.count(),
    }, 'kaybeden transaction yan etki bıraktı').toEqual(once);

    /* Kurulan an geri alınır: sonraki vaka gerçekten boş bir kurulumda
       koşmalı. "Sildim" diyen adım sildiğini ÖLÇER. */
    await dbYaris.yapilandirma.delete({ where: { anahtar: KURULUM_KURUCU_ANAHTARI } });
    expect(await dbYaris.yapilandirma.count({ where: { anahtar: KURULUM_KURUCU_ANAHTARI } }))
      .toBe(0);
  });

  it('SONUÇ: iki koşum BİRLİKTE başlar, kurulumda TEK yönetici kalır [SIS-KUR-001]', async () => {
    expect(await dbYaris.kullanici.count(), 'önkoşul: kurulum boş olmalı').toBe(0);
    /* `Promise.all` şart: sıralı çağrıda kapı zaten reddeder ve YARIŞ
       HİÇ KURULMAMIŞ olur — deponun kendi kaydındaki yakmayan sabotaj
       tam bu sınıftandı (CLAUDE.md · R-E tablosu). */
    const sonuclar = await Promise.all([
      kurucuHesapAc(dbYaris, { eposta: 'yaris-a@prova.local', ad: 'A', parola: PAROLA }),
      kurucuHesapAc(dbYaris, { eposta: 'yaris-b@prova.local', ad: 'B', parola: PAROLA }),
    ]);
    const acilan = sonuclar.filter((s) => s.ok);
    expect(acilan, 'kurulum iki yöneticiyle açıldı').toHaveLength(1);
    for (const s of sonuclar) if (!s.ok) expect(s.hata).toBe(BOS_KURULUM_SOZU);

    expect(await dbYaris.kullanici.count(), 'iki kullanıcı yazıldı').toBe(1);
    expect(await dbYaris.yetki.count(), 'iki yetki satırı yazıldı').toBe(1);
    expect(await dbYaris.aktiviteKaydi.count(), 'iz iki kez yazıldı').toBe(1);
    expect(await dbYaris.yapilandirma.count({ where: { anahtar: KURULUM_KURUCU_ANAHTARI } }),
      'tekil satır yazılmadı — yarışı kapatan diş yok').toBe(1);
  });
});

describe('PAROLA ARGÜMANDAN ALINMAZ [SIS-KUR-001]', () => {
  it('--parola verilirse araç koşmadan REDDEDER [SIS-KUR-001]', () => {
    /* Komut satırı `ps` çıktısında ve kabuk geçmişinde görünür. Sessizce
       kabul etmek, parolayı makinede iz bırakarak saklamaktır. */
    const r = spawnSync(path.join(KOK, 'node_modules', '.bin', 'tsx'),
      ['arac/kurucu-hesap.ts', '--eposta=a@b.local', '--ad=A', '--parola=gizli'],
      { cwd: KOK, encoding: 'utf8', input: '', timeout: 120_000 });
    expect(r.status, `çıktı: ${r.stdout}${r.stderr}`).toBe(2);
    expect(r.stderr).toMatch(/Parola argümandan alınmaz/);
  });
});
