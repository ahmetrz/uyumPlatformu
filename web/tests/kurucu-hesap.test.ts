import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  BOS_KURULUM_SOZU, KURUCU_PAROLA_EN_AZ, KURUCU_ROL, girdiKusurlari,
  istemciKur, kurucuHesapAc, ozetle,
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

const KOK = process.cwd();
const yuva = path.join(KOK, '.parti');
mkdirSync(yuva, { recursive: true });
const calisma = mkdtempSync(path.join(yuva, 'kurucu-hesap-'));
const bosDb = path.join(calisma, 'bos.db');
let db: PrismaClient;

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
}, 180_000);

afterAll(async () => {
  if (POSTGRES) return;
  await db?.$disconnect();
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
