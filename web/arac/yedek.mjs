#!/usr/bin/env node
/* Ürünün KENDİ verisinin yedeği, kanıt bütünlüğü ve geri yükleme (P2-7 · R3).

   ── Neden bir araç, neden düz prosedür değil ──────────────────────────
   Ürün, `restoreTestiKaydet` ile şunu dayatıyor: **geri yüklenebildiği
   kanıtlanmamış yedek, yedek değildir.** Düz metin bir prosedür koşulmaz,
   bu yüzden bayatlar. Buradaki komutlar koşulur ve sonuç verir.

   ── YEDEK BİR DİZİNDİR, BİR DOSYA DEĞİL (R3 ile değişti) ──────────────
   Eskiden yedek tek bir `.db` dosyasıydı ve kanıt DOSYALARINI almıyordu.
   Bir uyum ürününde denetçiye gösterilen şey kanıt dosyasıdır: onu almayan
   bir yedek, geri yüklendiğinde ekranı doldurur ama kanıtı getirmez.
   Bugün yedek üç parçadır:

     <dizin>/veritabani.db | veritabani.dump   veri
     <dizin>/kanit/<aa>/<bb>/<özet>            kanıt dosyaları (içerik adresli)
     <dizin>/manifest.json                     anahtar · boyut · özet

   Manifest olmadan "yedek tam mı" sorusu SORULAMAZ: dosya sisteminde dosya
   saymak, veritabanının hangi dosyayı beklediğini söylemez.

   ── İKİ SAĞLAYICI ─────────────────────────────────────────────────────
   Kurulum PostgreSQL'dir; geliştirme ve demo SQLite (R5 · P7). Yedek
   aracının tek sağlayıcı bilmesi, kurulumda ÇALIŞMAYAN bir yedekleme
   prosedürü demek olurdu.
     · SQLite     → `VACUUM INTO`. Canlı dosyayı `cp` ile kopyalamak GÜVENLİ
       DEĞİLDİR: kopyanın ortasında bir yazma commit'lenirse dosya tutarsız
       çıkar ve bunu ancak geri yüklerken — yani ihtiyacınız olan anda —
       fark edersiniz.
     · PostgreSQL → `pg_dump -Fc`, geri yükleme `pg_restore`. İstemci
       araçları yoksa araç ADIYLA söyler ve durur; sessizce "yedek alındı"
       DEMEZ.

   ── `.env` BİLEREK DIŞARIDADIR ────────────────────────────────────────
   Bağlantı dizesi ve işletim sınırları sır niteliğindedir; veri yedeğine
   erişen herkes bağlantı dizesine de erişmiş olmamalıdır. Ayrı ve erişimi
   dar bir yerde saklanır.

   Kullanım:
     node arac/yedek.mjs --al [dizin]           yedek alır ve doğrular
     node arac/yedek.mjs --dogrula <dizin>      yedeği tek başına doğrular
     node arac/yedek.mjs --karsilastir <dizin>  canlıyla + KANIT BÜTÜNLÜĞÜ
     node arac/yedek.mjs --geri-yukle <dizin>   BOŞ ortama geri yükler */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import {
  copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync,
  rmSync, statSync, writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

/* ── sağlayıcı ve yollar ─────────────────────────────────────────────── */

/** Bağlantı dizesinden sağlayıcı — `lib/veritabani.ts` ile AYNI kural.
    Tanınmayan şema sessizce SQLite'a düşmez; düşerse yanlış sağlayıcıya
    yedek alınır ve bunu ancak geri yüklerken fark edersiniz. */
export function saglayiciCoz(url) {
  const u = (url ?? '').trim();
  if (u === '') return 'sqlite';
  if (/^postgres(ql)?:\/\//i.test(u)) return 'postgresql';
  if (/^file:/i.test(u) || u.startsWith('.') || u.startsWith('/')) return 'sqlite';
  throw new Error(`DATABASE_URL tanınmayan bir sağlayıcı gösteriyor: ${u.slice(0, 24)}…`);
}

/** SQLite dosyasının yolu. `file:` bağlantısı `prisma/` dizinine görelidir
    (Prisma sözleşmesi); bağlantı yoksa depodaki geliştirme veritabanı. */
export function sqliteYolu(url = process.env.DATABASE_URL) {
  const kok = path.join(process.cwd(), 'prisma');
  if (!url || !/^file:/i.test(url)) return path.join(kok, 'dev.db');
  const dosya = url.replace(/^file:/i, '').split('?')[0];
  return path.resolve(kok, dosya);
}

/** Kanıt deposunun kökü — ürün koduyla AYNI kural (`lib/uyum/kanitDeposu.ts`).
    İki yerde iki farklı varsayılan olsaydı yedek başka bir dizine bakardı. */
export function kanitKoku() {
  const ozel = process.env.KANIT_DEPO_KOKU?.trim();
  return ozel && ozel.length > 0 ? ozel : path.join(process.cwd(), 'veri', 'kanit');
}

const ANAHTAR_BICIMI = /^[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}$/;
const MANIFEST = 'manifest.json';

/* ── özetler ─────────────────────────────────────────────────────────── */

/** Dosyanın BAYT özeti (tam SHA-256). */
export function ozet(yol) {
  return createHash('sha256').update(readFileSync(yol)).digest('hex');
}

const kisaOzet = (metin) => createHash('sha256').update(metin).digest('hex').slice(0, 16);

/* ── PostgreSQL istemci araçları ─────────────────────────────────────── */

/** Aracın VARLIĞINI ölçer. Yoksa ADIYLA söyler: "yedek alınamadı" diyen ama
    hangi aracın eksik olduğunu söylemeyen bir hata, operatörü tahmine
    zorlar. */
function pgAraci(ad) {
  const r = spawnSync(ad, ['--version'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    throw new Error(
      `PostgreSQL istemci aracı bulunamadı: ${ad}. Kurulum PostgreSQL ise yedek `
      + 'bu araç olmadan ALINAMAZ (postgresql-client paketi).');
  }
  return (r.stdout || '').trim();
}

/* PAROLA SÜREÇ ARGÜMANINA KONMAZ (bağımsız inceleme, P2).

   Bağlantı dizesi parolayı taşır ve argüman olarak verildiğinde Linux'ta
   `/proc/<pid>/cmdline` üzerinden aynı makinedeki HER kullanıcıya
   görünür: yedek alınırken `ps auxww` koşan biri üretim parolasını okur.
   "Sır değeri saklanmaz" kuralı sırrın nerede DURDUĞUYLA ilgilidir ve
   süreç tablosu da bir yerdir.

   Bu yüzden parola ortam değişkeniyle (`PGPASSWORD`) verilir ve URL'in
   kalanı ayrı argümanlara bölünür. */
function pgBaglanti(url) {
  const u = new URL(url);
  const args = ['-h', u.hostname, '-p', u.port || '5432',
    '-U', decodeURIComponent(u.username), '-d', decodeURIComponent(u.pathname.slice(1))];
  const cevre = { ...process.env };
  if (u.password) cevre.PGPASSWORD = decodeURIComponent(u.password);
  return { args, cevre };
}

/** Alan ayracı: birim ayracı (U+001F). Metin alanlarında (kanıt adı) virgül,
    sekme ve boru işareti geçebilir; birim ayracı geçemez. */
const AYRAC = String.fromCharCode(31);
/** Satır ayracı: kayıt ayracı (U+001E). Kanıt adında satır sonu geçebilir
    ve `\n`e göre bölmek o kaydı ikiye bölerdi — bölünen kaydın gerçek
    depo anahtarı başka bir sütuna kayar ve o kanıt HİÇ denetlenmezdi
    (bağımsız inceleme bulgusu). */
const SATIR_AYRACI = String.fromCharCode(30);

function pgSorgu(url, sql) {
  pgAraci('psql');
  const { args, cevre } = pgBaglanti(url);
  const r = spawnSync('psql', [...args, '-At', '-F', AYRAC, '-R', SATIR_AYRACI, '-c', sql],
    { encoding: 'utf8', env: cevre });
  if (r.status !== 0) throw new Error(`psql başarısız: ${(r.stderr || '').trim()}`);
  return r.stdout.split(SATIR_AYRACI).filter((x) => x.length > 0).map((x) => x.split(AYRAC));
}

/* ── canlı veritabanından KANIT KAYITLARI ────────────────────────────── */

/* `Kanit` ve `KanitSurumu` AYRI AYRI okunur: eski bir sürümün dosyası
   yedekte yoksa kanıtın geçmişi geri gelmez ve değişmez iz iddiası orada
   biter. `depoAnahtari is not null` OLUMLU bir yüklemdir; dosyasız kanıt
   (NULL) kapsam dışıdır ve bu bir olgudur, kusur değil. */
const KANIT_SQL_SQLITE = `
  select 'Kanit' as kaynak, id, ad, depoAnahtari, dosyaHash
    from Kanit where depoAnahtari is not null
  union all
  select 'KanitSurumu' as kaynak, id, coalesce(dosyaAdi, id) as ad, depoAnahtari, dosyaHash
    from KanitSurumu where depoAnahtari is not null`;

const KANIT_SQL_PG = `
  select 'Kanit', id, ad, "depoAnahtari", coalesce("dosyaHash", '')
    from "Kanit" where "depoAnahtari" is not null
  union all
  select 'KanitSurumu', id, coalesce("dosyaAdi", id), "depoAnahtari", coalesce("dosyaHash", '')
    from "KanitSurumu" where "depoAnahtari" is not null`;

/* Özet NORMALLENİR: boş dize ile NULL aynı şeydir (özet yok) ve iki
   sağlayıcı aynı veriden AYNI kararı vermelidir. Ölçüldü (bağımsız
   inceleme): PostgreSQL dalı `coalesce(...,'')` sonucunu null'a çeviriyor,
   SQLite dalı boş dizeyi taşıyordu — aynı kayıt SQLite'ta "ÇÜRÜK",
   PostgreSQL'de "sağlam" görünüyordu. */
const ozetNormal = (h) => (typeof h === 'string' && /^[0-9a-f]{64}$/.test(h) ? h : null);

/** Veritabanının BEKLEDİĞİ kanıt dosyaları. Yedeğin tamlığı bu listeye göre
    ölçülür — diskteki dosyaları saymak, eksik dosyayı göstermez. */
export function kanitKayitlari(url = process.env.DATABASE_URL) {
  if (saglayiciCoz(url) === 'postgresql') {
    return pgSorgu(url, KANIT_SQL_PG)
      .map(([kaynak, id, ad, anahtar, hash]) => ({ kaynak, id, ad, anahtar, hash: ozetNormal(hash) }));
  }
  const d = new Database(sqliteYolu(url), { readonly: true });
  try {
    return d.prepare(KANIT_SQL_SQLITE).all().map((r) => ({
      kaynak: r.kaynak, id: r.id, ad: r.ad, anahtar: r.depoAnahtari, hash: ozetNormal(r.dosyaHash),
    }));
  } finally { d.close(); }
}

/* ── kanıt deposunu tarama ───────────────────────────────────────────── */

/** Depoyu gezer ve HER dosyanın anahtarını · boyutunu · özetini ölçer.
    "Depo yok" ile "depo boş" AYRI şeylerdir ve `varMi` ikisini ayırır:
    okunamayan bir depo, boş bir depo gibi raporlanamaz. */
export function depoyuTara(kok = kanitKoku()) {
  if (!existsSync(kok)) return { kok, varMi: false, dosyalar: [] };
  const dosyalar = [];
  const gez = (dizin, parca) => {
    for (const g of readdirSync(dizin, { withFileTypes: true })) {
      const tam = path.join(dizin, g.name);
      if (g.isDirectory()) { gez(tam, [...parca, g.name]); continue; }
      const anahtar = [...parca, g.name].join('/');
      dosyalar.push({
        anahtar,
        bicimGecerli: ANAHTAR_BICIMI.test(anahtar),
        boyutBayt: statSync(tam).size,
        ozet: ozet(tam),
      });
    }
  };
  gez(kok, []);
  dosyalar.sort((a, b) => a.anahtar.localeCompare(b.anahtar));
  return { kok, varMi: true, dosyalar };
}

/* ── veritabanı ölçümleri ────────────────────────────────────────────── */

/** MANTIKSAL parmak izi: her tablonun satır sayısı. "Bu yedek canlıyla aynı
    veriyi mi taşıyor" sorusu bayt düzeyinde SORULAMAZ — `VACUUM INTO` ve
    `pg_dump` aynı veriyi farklı baytlarla yazar. */
function sqliteRaporu(yol) {
  const d = new Database(yol, { readonly: true });
  try {
    const butunluk = d.pragma('integrity_check', { simple: true });
    if (butunluk !== 'ok') throw new Error(`Bütünlük denetimi başarısız: ${butunluk}`);
    const yabanci = d.pragma('foreign_key_check');
    const tablolar = d.prepare(
      "select name from sqlite_master where type='table' and name not like 'sqlite_%' "
      + 'order by name').all().map((r) => r.name);
    const gocler = d.prepare(
      'select migration_name from _prisma_migrations order by migration_name').all()
      .map((r) => r.migration_name);
    return {
      butunluk,
      yabanciAnahtarKusuru: yabanci.length,
      tablo: tablolar.length,
      icerikOzeti: kisaOzet(tablolar
        .map((t) => `${t}:${d.prepare(`select count(*) c from "${t}"`).get().c}`).join('\n')),
      gocSayisi: gocler.length,
      sonGoc: gocler.at(-1) ?? null,
      kullanici: d.prepare('select count(*) c from Kullanici').get().c,
      izKaydi: d.prepare('select count(*) c from AktiviteKaydi').get().c,
    };
  } finally { d.close(); }
}

function pgRaporu(url) {
  const gocler = pgSorgu(url,
    'select migration_name from _prisma_migrations order by migration_name').map((r) => r[0]);
  /* Satır sayıları GERÇEK sayımdır, `pg_stat` tahmini değil: tahminî sayı
     "aynı içerik" sorusunu yanlış cevaplayabilir ve bir yedeği yanlışlıkla
     güncel gösterir. */
  const tablolar = pgSorgu(url,
    "select tablename from pg_tables where schemaname='public' order by tablename")
    .map((r) => r[0]);
  const sayim = tablolar.length === 0 ? [] : pgSorgu(url, tablolar
    .map((t) => `select '${t}' t, count(*) c from "${t}"`).join(' union all '))
    .sort((a, b) => a[0].localeCompare(b[0]));
  const [kullanici, iz] = pgSorgu(url,
    'select (select count(*) from "Kullanici"), (select count(*) from "AktiviteKaydi")')[0];
  return {
    /* BİLİNMEYEN ≠ SIFIR (bağımsız inceleme, P2). PostgreSQL'de SQLite'ın
       `integrity_check`/`foreign_key_check` karşılığı bir tek komut
       yoktur; ikisi de ÖLÇÜLMEDİ. Manifeste `'ok'` ve `0` yazmak, aylar
       sonra manifesti okuyan denetçiye yapılmamış bir ölçümü yapılmış
       gibi gösterirdi. `null` yazılır ve çıktı "ölçülmedi" der. */
    butunluk: null,
    yabanciAnahtarKusuru: null,
    tablo: tablolar.length,
    icerikOzeti: kisaOzet(sayim.map(([t, c]) => `${t}:${c}`).join('\n')),
    gocSayisi: gocler.length,
    sonGoc: gocler.at(-1) ?? null,
    kullanici: Number(kullanici),
    izKaydi: Number(iz),
  };
}

/* ── yedek alma ──────────────────────────────────────────────────────── */

/** Yedek alır: veritabanı + kanıt deposu + manifest. Hedef dizin varsa ve
    boş değilse YAZMAZ — var olan bir yedeğin üstüne yazmak, bir yedeği
    sessizce yok etmektir. */
export function al(hedefDizin, url = process.env.DATABASE_URL) {
  const saglayici = saglayiciCoz(url);
  if (existsSync(hedefDizin) && readdirSync(hedefDizin).length > 0) {
    throw new Error(`Hedef dizin zaten var ve boş değil, üstüne yazılmaz: ${hedefDizin}`);
  }
  mkdirSync(path.join(hedefDizin, 'kanit'), { recursive: true });

  /* 1 · veritabanı */
  let dbDosyasi;
  if (saglayici === 'sqlite') {
    const kaynak = sqliteYolu(url);
    if (!existsSync(kaynak)) throw new Error(`Kaynak veritabanı yok: ${kaynak}`);
    dbDosyasi = 'veritabani.db';
    const d = new Database(kaynak, { readonly: true });
    try {
      // Yol içinde tek tırnak olabilir; SQL dizesine kaçışsız girmez.
      d.exec(`VACUUM INTO '${path.join(hedefDizin, dbDosyasi).replace(/'/g, "''")}'`);
    } finally { d.close(); }
  } else {
    pgAraci('pg_dump');
    dbDosyasi = 'veritabani.dump';
    const { args, cevre } = pgBaglanti(url);
    const r = spawnSync('pg_dump', [...args, '--format=custom', '--no-owner', '--no-privileges',
      '--file', path.join(hedefDizin, dbDosyasi)], { encoding: 'utf8', env: cevre });
    if (r.status !== 0) throw new Error(`pg_dump başarısız: ${(r.stderr || '').trim()}`);
  }
  const dbYolu = path.join(hedefDizin, dbDosyasi);

  /* 2 · kanıt deposu — içerik adresli ağaç OLDUĞU GİBİ kopyalanır. Anahtar
     içeriğin özetidir; ağacı yeniden adlandırmak bütünlük kanıtını atmak
     olurdu. */
  const depo = depoyuTara();
  for (const f of depo.dosyalar) {
    const hedef = path.join(hedefDizin, 'kanit', f.anahtar);
    mkdirSync(path.dirname(hedef), { recursive: true });
    copyFileSync(path.join(depo.kok, f.anahtar), hedef);
  }

  /* 3 · manifest — özet KOPYADAN ölçülür, kaynaktan değil: manifest yedekte
     NE OLDUĞUNU anlatmalı, ne olması gerektiğini değil. Kopyalama sırasında
     bozulan bir dosya, kaynaktan ölçen bir manifestte sağlam görünürdü. */
  const dosyalar = depo.dosyalar.map((f) => {
    const y = path.join(hedefDizin, 'kanit', f.anahtar);
    return { anahtar: f.anahtar, bicimGecerli: f.bicimGecerli, boyutBayt: statSync(y).size, ozet: ozet(y) };
  });

  const manifest = {
    bicimSurumu: 1,
    alindi: new Date().toISOString(),
    saglayici,
    veritabani: { dosya: dbDosyasi, boyutBayt: statSync(dbYolu).size, ozet: ozet(dbYolu) },
    veritabaniOzeti: saglayici === 'sqlite' ? sqliteRaporu(dbYolu) : pgRaporu(url),
    kanit: {
      kok: depo.kok,
      depoVarMi: depo.varMi,
      dosyaSayisi: dosyalar.length,
      toplamBayt: dosyalar.reduce((t, f) => t + f.boyutBayt, 0),
      dosyalar,
    },
  };
  writeFileSync(path.join(hedefDizin, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  return denetle(hedefDizin);
}

/* ── doğrulama ───────────────────────────────────────────────────────── */

/** Yedeği TEK BAŞINA doğrular: manifest okunur, veritabanı ve her kanıt
    dosyası manifestteki özetle karşılaştırılır. Canlıya BAKMAZ — elinizde
    yalnız yedek varken de cevap verebilmelidir. */
export function denetle(dizin) {
  if (!existsSync(dizin)) throw new Error(`Yedek bulunamadı: ${dizin}`);
  const mYolu = path.join(dizin, MANIFEST);
  if (!existsSync(mYolu)) throw new Error(`Manifest yok, bu bir yedek dizini değil: ${dizin}`);
  const m = JSON.parse(readFileSync(mYolu, 'utf8'));

  const dbYolu = path.join(dizin, m.veritabani.dosya);
  if (!existsSync(dbYolu)) {
    throw new Error(`Yedekteki veritabanı dosyası yok: ${m.veritabani.dosya}`);
  }
  const dbOzet = ozet(dbYolu);
  if (dbOzet !== m.veritabani.ozet) {
    throw new Error(`Yedekteki veritabanı ÇÜRÜK: manifest ${m.veritabani.ozet.slice(0, 16)}…, `
      + `dosya ${dbOzet.slice(0, 16)}…`);
  }

  /* SQLite yedeği KENDİNİ denetleyebilir (`integrity_check`); PostgreSQL
     dökümü ancak `pg_restore --list` ile okunur. İkisi de "dosya okunuyor
     mu" sorusunu cevaplar ama AYNI DERİNLİKTE DEĞİL — bu fark yazılıdır ve
     manifestteki ölçüm SQLite'ta yeniden ölçülür: manifeste yazılan sayıya
     inanmak, manifesti doğrulamamak olurdu. */
  let ozetler = m.veritabaniOzeti;
  if (m.saglayici === 'sqlite') {
    ozetler = sqliteRaporu(dbYolu);
  } else {
    pgAraci('pg_restore');
    const r = spawnSync('pg_restore', ['--list', dbYolu], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`Yedekteki döküm okunamadı: ${(r.stderr || '').trim()}`);
  }

  const eksik = [];
  const curuk = [];
  for (const f of m.kanit.dosyalar) {
    const y = path.join(dizin, 'kanit', f.anahtar);
    if (!existsSync(y)) { eksik.push(f); continue; }
    if (ozet(y) !== f.ozet) curuk.push(f);
  }

  return {
    dizin,
    saglayici: m.saglayici,
    alindi: m.alindi,
    veritabani: { ...m.veritabani, yol: dbYolu },
    ozetler,
    kanit: { ...m.kanit, eksikDosyalar: eksik, curukDosyalar: curuk },
    /* DEPOSU ÖLÇÜLEMEYEN YEDEK DOĞRULANMIŞ DEĞİLDİR (bağımsız inceleme, P2).
       İlk sürümde depo dizini hiç yokken `dosyalar` boş kalıyor, `eksik`
       ve `curuk` da boş çıkıyor ve yedek "DOĞRULANDI" damgasıyla sıfır
       çıkış koduyla arşive giriyordu — kanıt dosyası bekleyen bir
       veritabanının yanında sıfır dosyalı bir yedek. Boş sonuç "geçti"
       sayılmaz. */
    saglam: eksik.length === 0 && curuk.length === 0 && m.kanit.depoVarMi !== false,
  };
}

/* ── canlıyla karşılaştırma + KANIT BÜTÜNLÜĞÜ ────────────────────────── */

/** Yedek ile canlı arasındaki farkı SAYIYLA söyler ve kanıt bütünlüğünü
    VERİTABANINA KARŞI denetler: veritabanının beklediği her depo anahtarı
    yedekte var mı, özeti `dosyaHash` ile tutuyor mu. */
export function karsilastir(dizin, url = process.env.DATABASE_URL) {
  const y = denetle(dizin);
  const saglayici = saglayiciCoz(url);
  const canli = saglayici === 'sqlite' ? sqliteRaporu(sqliteYolu(url)) : pgRaporu(url);
  const manifestte = new Map(y.kanit.dosyalar.map((f) => [f.anahtar, f]));

  const eksik = [];
  const curuk = [];
  const bicimsiz = [];
  const beklenen = new Set();
  for (const k of kanitKayitlari(url)) {
    beklenen.add(k.anahtar);
    if (!ANAHTAR_BICIMI.test(k.anahtar)) { bicimsiz.push(k); continue; }
    const f = manifestte.get(k.anahtar);
    if (!f) { eksik.push(k); continue; }
    /* `dosyaHash` NULL olabilir (dosya sürümlemesinden önceki kayıt). O
       zaman ANAHTARIN KENDİSİ özet taşır — içerik adresli depo bunu
       garanti eder — ve doğrulama ondan yapılır. Karşılaştıracak bir şey
       olmadığında "geçti" demek, hiçbir şeye bakmadan temiz raporlamaktır. */
    const beklenenOzet = k.hash ?? k.anahtar.split('/')[2];
    if (f.ozet !== beklenenOzet) curuk.push({ ...k, yedekteki: f.ozet, beklenen: beklenenOzet });
  }

  /* Veritabanının artık işaret etmediği dosya: içerik adresli depoda bu
     NORMALDİR — aynı içerik birden çok kayıt tarafından paylaşılır ve
     arşivlenen kayıt dosyayı bırakmaz. Kusur değildir, sayı olarak
     raporlanır: "sessizce yok say" ile "kusur say" arasındaki üçüncü yol. */
  const sahipsiz = [...manifestte.keys()].filter((a) => !beklenen.has(a));

  return {
    yedek: y,
    canli,
    saglayici,
    ayniIcerik: y.ozetler.icerikOzeti === canli.icerikOzeti,
    gocFarki: canli.gocSayisi - y.ozetler.gocSayisi,
    izFarki: canli.izKaydi - y.ozetler.izKaydi,
    kanitBeklenen: beklenen.size,
    kanitEksik: eksik,
    kanitCuruk: curuk,
    kanitBicimsiz: bicimsiz,
    kanitSahipsiz: sahipsiz,
    saglam: y.saglam && eksik.length === 0 && curuk.length === 0 && bicimsiz.length === 0,
  };
}

/* ── geri yükleme ────────────────────────────────────────────────────── */

/** Yedeği BOŞ bir ortama geri yükler. Dolu ortama yazmaz: geri yükleme veri
    kaybettirir ve "üstüne yaz" bir İNSAN kararıdır. */
export function geriYukle(dizin, o = {}) {
  const url = o.url ?? process.env.DATABASE_URL;
  const saglayici = saglayiciCoz(url);
  const y = denetle(dizin);
  if (y.saglayici !== saglayici) {
    throw new Error(`Yedek ${y.saglayici} sağlayıcısından, hedef ${saglayici}. `
      + 'Sağlayıcılar arası geri yükleme bu araçla YAPILMAZ.');
  }

  /* 1 · veritabanı */
  if (saglayici === 'sqlite') {
    const hedef = o.hedefDb ?? sqliteYolu(url);
    if (existsSync(hedef) && !o.ustuneYaz) throw new Error(`Hedef veritabanı dolu: ${hedef}`);
    mkdirSync(path.dirname(hedef), { recursive: true });
    /* Yan dosyalar da silinir: eski bir `-wal` yeni veritabanının üstüne
       eski yazmaları geri oynatır ve geri yükleme sessizce bozulur. */
    for (const ek of ['', '-wal', '-shm']) rmSync(`${hedef}${ek}`, { force: true });
    copyFileSync(y.veritabani.yol, hedef);
  } else {
    pgAraci('pg_restore');
    /* BOŞ ORTAM KONTROLÜ POSTGRESQL'DE DE VARDIR (bağımsız inceleme, P1).
       İlk sürümde yalnız SQLite dalı kontrol ediyordu; kurulumun
       sağlayıcısı PostgreSQL olduğu için vaat tam da müşteri yolunda
       tutulmuyordu. Kontrolsüz `pg_restore` dolu bir veritabanına COPY
       bölümlerini işler: A kurulumunun satırları B'nin canlı tablolarına
       KARIŞIR ve araç ancak sonunda "başarısız" der. */
    const [[tabloSayisi]] = pgSorgu(url,
      "select count(*) from pg_tables where schemaname='public'");
    if (Number(tabloSayisi) > 0 && !o.ustuneYaz) {
      throw new Error(`Hedef veritabanı dolu: ${Number(tabloSayisi)} tablo var. `
        + 'Geri yükleme veri kaybettirir; üstüne yazmak İNSAN kararıdır (--ustune-yaz).');
    }
    const { args, cevre } = pgBaglanti(url);
    /* `--single-transaction`: yarım kalan bir geri yükleme GERİ ALINIR.
       Aksi hâlde hata anında veritabanı yarı dolu kalır ve o hâl, ne
       eski ne yeni — geri dönülecek bir yer bırakmaz. */
    const r = spawnSync('pg_restore', [...args, '--no-owner', '--no-privileges',
      '--single-transaction', ...(o.ustuneYaz ? ['--clean', '--if-exists'] : []),
      y.veritabani.yol], { encoding: 'utf8', env: cevre });
    if (r.status !== 0) throw new Error(`pg_restore başarısız: ${(r.stderr || '').trim()}`);
  }

  /* 2 · kanıt deposu — içerik adresli olduğu için üstüne yazmak güvenlidir:
     aynı anahtar aynı baytlar demektir. Yazılan her dosya OKUNARAK
     doğrulanır; "kopyaladım" bir iddia, "özeti tuttu" bir ölçümdür. */
  const depoHedef = o.hedefKanit ?? kanitKoku();
  let yazilan = 0;
  for (const f of y.kanit.dosyalar) {
    const hedef = path.join(depoHedef, f.anahtar);
    mkdirSync(path.dirname(hedef), { recursive: true });
    copyFileSync(path.join(dizin, 'kanit', f.anahtar), hedef);
    if (ozet(hedef) !== f.ozet) throw new Error(`Geri yüklenen kanıt ÇÜRÜK: ${f.anahtar}`);
    yazilan += 1;
  }
  return { saglayici, veritabani: y.veritabani.dosya, kanitDosyasi: yazilan, kanitKoku: depoHedef };
}

/* ── çıktı ───────────────────────────────────────────────────────────── */

function yazOzet(b) {
  console.log(`  dizin        : ${b.dizin}`);
  console.log(`  sağlayıcı    : ${b.saglayici}`);
  console.log(`  alındı       : ${b.alindi}`);
  console.log(`  veritabanı   : ${b.veritabani.dosya} · `
    + `${(b.veritabani.boyutBayt / 1024 / 1024).toFixed(2)} MB · ${b.veritabani.ozet.slice(0, 16)}…`);
  console.log(`  bütünlük     : ${b.ozetler.butunluk ?? 'ölçülmedi (PostgreSQL)'}`);
  console.log(`  yabancı anahtar kusuru: ${b.ozetler.yabanciAnahtarKusuru ?? 'ölçülmedi (PostgreSQL)'}`);
  console.log(`  tablo        : ${b.ozetler.tablo}`);
  console.log(`  göç          : ${b.ozetler.gocSayisi} (son: ${b.ozetler.sonGoc})`);
  console.log(`  içerik özeti : ${b.ozetler.icerikOzeti}`);
  console.log(`  kullanıcı    : ${b.ozetler.kullanici} · iz kaydı: ${b.ozetler.izKaydi}`);
  /* SAYI YAZILIR, YOKLUK DEĞİL. "kanıt dosyası yok" bir İDDİADIR ve depo
     okunamadığında da aynı cümleyi kurar; "dosya: 0" bir ÖLÇÜMDÜR.
     Deponun kendisi yoksa bu ayrıca söylenir — sıfır ile okunamayan
     birbirinin yerine geçmez. */
  console.log(`  kanıt dosyası: ${b.kanit.dosyaSayisi} · `
    + `${(b.kanit.toplamBayt / 1024).toFixed(1)} KB · depo kökü: ${b.kanit.kok}`
    + `${b.kanit.depoVarMi ? '' : ' (depo dizini YOKTU — ölçüm yapılamadı)'}`);
  for (const f of b.kanit.eksikDosyalar) console.log(`  YEDEKTE EKSİK: ${f.anahtar}`);
  for (const f of b.kanit.curukDosyalar) console.log(`  YEDEKTE ÇÜRÜK: ${f.anahtar}`);
}

const bu = path.resolve(process.argv[1] ?? '');
if (bu === path.resolve(new URL(import.meta.url).pathname)) {
  /* Bayraklar konumdan AYRILIR: `--geri-yukle --ustune-yaz /yol` yazan
     operatör, konumsal okumada `--ustune-yaz`ı dizin sanan bir araca
     çarpardı (bağımsız inceleme bulgusu). */
  const argumanlar = process.argv.slice(2);
  const kip = argumanlar.find((a) => a.startsWith('--'));
  const arg = argumanlar.find((a) => !a.startsWith('--'));
  try {
    if (kip === '--al') {
      const damga = new Date().toISOString().replace(/[:.]/g, '-');
      const hedef = path.resolve(arg ?? path.join('yedek', `uyum-${damga}`));
      const rapor = al(hedef);
      console.log(rapor.saglam ? 'YEDEK ALINDI ve DOĞRULANDI\n' : 'YEDEK ALINDI ama KUSURLU\n');
      yazOzet(rapor);
      console.log('\nNot: `.env` bu yedekte YOKTUR ve olmamalıdır — ayrı saklayın.');
      process.exit(rapor.saglam ? 0 : 1);
    } else if (kip === '--dogrula') {
      if (!arg) throw new Error('Doğrulanacak yedek dizinini verin');
      const rapor = denetle(path.resolve(arg));
      console.log(rapor.saglam ? 'YEDEK DOĞRULANDI\n' : 'YEDEK KUSURLU\n');
      yazOzet(rapor);
      process.exit(rapor.saglam ? 0 : 1);
    } else if (kip === '--karsilastir') {
      if (!arg) throw new Error('Karşılaştırılacak yedek dizinini verin');
      const k = karsilastir(path.resolve(arg));
      console.log('YEDEK\n'); yazOzet(k.yedek);
      console.log(`\nCANLI (${k.saglayici})\n`);
      console.log(`  tablo        : ${k.canli.tablo}`);
      console.log(`  göç          : ${k.canli.gocSayisi} (son: ${k.canli.sonGoc})`);
      console.log(`  içerik özeti : ${k.canli.icerikOzeti}`);
      console.log(`  kullanıcı    : ${k.canli.kullanici} · iz kaydı: ${k.canli.izKaydi}`);
      console.log(`\naynı içerik (mantıksal): ${k.ayniIcerik ? 'evet' : 'HAYIR'}`);
      console.log(`göç farkı  : ${k.gocFarki} `
        + '(yedek koddan geriyse geri yükleme sonrası göç ŞART)');
      console.log(`iz farkı   : ${k.izFarki} kayıt`);
      console.log('\nKANIT BÜTÜNLÜĞÜ');
      console.log(`  veritabanının beklediği dosya : ${k.kanitBeklenen}`);
      console.log(`  yedekteki dosya               : ${k.yedek.kanit.dosyaSayisi}`);
      console.log(`  sahipsiz (kayıt işaret etmiyor): ${k.kanitSahipsiz.length}`);
      for (const e of k.kanitEksik) {
        console.log(`  EKSİK · ${e.kaynak} ${e.id} · "${e.ad}" · anahtar ${e.anahtar}`);
      }
      for (const c of k.kanitCuruk) {
        console.log(`  ÇÜRÜK · ${c.kaynak} ${c.id} · "${c.ad}" · anahtar ${c.anahtar} · `
          + `yedekteki ${c.yedekteki.slice(0, 16)}… ≠ beklenen ${c.beklenen.slice(0, 16)}…`);
      }
      for (const b2 of k.kanitBicimsiz) {
        console.log(`  BİÇİMSİZ ANAHTAR · ${b2.kaynak} ${b2.id} · "${b2.ad}" · ${b2.anahtar}`);
      }
      console.log(`\nSONUÇ: ${k.saglam ? 'SAĞLAM' : 'KUSURLU'}`);
      process.exit(k.saglam ? 0 : 1);
    } else if (kip === '--geri-yukle') {
      if (!arg) throw new Error('Geri yüklenecek yedek dizinini verin');
      const r = geriYukle(path.resolve(arg), { ustuneYaz: process.argv.includes('--ustune-yaz') });
      console.log(`GERİ YÜKLENDİ · sağlayıcı ${r.saglayici} · ${r.veritabani} · `
        + `kanıt dosyası: ${r.kanitDosyasi} → ${r.kanitKoku}`);
    } else {
      console.log(readFileSync(new URL(import.meta.url)).toString()
        .split('Kullanım:')[1].split('*/')[0].trimEnd());
      process.exit(1);
    }
  } catch (e) {
    console.error(`HATA: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
