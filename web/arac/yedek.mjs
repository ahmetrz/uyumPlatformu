#!/usr/bin/env node
/* Ürünün KENDİ verisinin yedeği ve geri yükleme doğrulaması (P2-7).

   ── Neden bir araç, neden düz prosedür değil ──────────────────────────
   Ürün, müşterinin yedeklerini izliyor ve `restoreTestiKaydet` ile şunu
   dayatıyor: **geri yüklenebildiği kanıtlanmamış yedek, yedek değildir.**
   Ürünün kendi yedeği için yazılı bir prosedür yoktu; olsaydı bile düz
   metin bir prosedür koşulmaz, bu yüzden bayatlar. Buradaki üç komut
   koşulur ve sonuç verir.

   ── Neden `cp` DEĞİL ──────────────────────────────────────────────────
   Veritabanı tek bir SQLite dosyasıdır (`prisma/dev.db`) ve canlı
   dosyayı kopyalamak GÜVENLİ DEĞİLDİR: kopyanın ortasında bir yazma
   commit'lenirse dosya tutarsız çıkar ve bunu ancak geri yüklerken fark
   edersiniz. Doğru yol `VACUUM INTO`: SQLite yedeği kendi kilit
   düzeniyle, tutarlı bir anlık görüntü olarak yazar. Yan fayda, çıktının
   sıkıştırılmış (boş sayfasız) olmasıdır.

   ── Yedeğin KAPSAMADIĞI şeyler (bilerek) ──────────────────────────────
   · `.env` — bağlantı dizesi ve işletim sınırları. Sır niteliğindedir,
     veri yedeğiyle AYNI yere konmaz; ayrı ve erişimi dar bir yerde
     saklanır. Bu aracın işi değildir ve olmamalıdır.
   · Kanıt DOSYALARI — bugün yoktur. `Kanit.dosyaYolu` kolonu şemada
     duruyor ama hiçbir kod ona yazmıyor (API ucu bilerek döndürmüyor
     bile). Dosya yükleme geldiği gün bu araç eksik kalır ve `--dogrula`
     bunu söyleyemez; o gün burası büyütülmelidir. Bugün yazılmayan bir
     dizini yedekliyormuş gibi yapmak, olmayan bir güvence satmaktır.

   Kullanım:
     node arac/yedek.mjs --al [hedef.db]     yedek alır ve doğrular
     node arac/yedek.mjs --dogrula <yedek>   yedeği tek başına doğrular
     node arac/yedek.mjs --karsilastir <yedek>  canlıyla farkı özetler */

import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const KAYNAK = path.join(process.cwd(), 'prisma', 'dev.db');

/** Dosyanın BAYT özeti. Aynı yedeğin iki kopyasını ayırt etmeye yarar;
    canlıyla karşılaştırmaya YARAMAZ — `VACUUM INTO` boş sayfaları atarak
    yazdığı için mantıken aynı veri farklı bayt üretir. */
export function ozet(yol) {
  return createHash('sha256').update(readFileSync(yol)).digest('hex').slice(0, 16);
}

/** MANTIKSAL parmak izi: her tablonun satır sayısı. Geri yükleme kararı
    "bu yedek canlıyla aynı veriyi mi taşıyor" sorusuna dayanır ve o soru
    bayt düzeyinde sorulamaz. */
function icerikOzeti(d) {
  const tablolar = d.prepare(
    "select name from sqlite_master where type='table' "
    + "and name not like 'sqlite_%' order by name").all().map((r) => r.name);
  const satirlar = tablolar.map(
    (t) => `${t}:${d.prepare(`select count(*) c from "${t}"`).get().c}`);
  return createHash('sha256').update(satirlar.join('\n')).digest('hex').slice(0, 16);
}

/** Veritabanının kendi kendini denetlemesi + taşıdığı göç durumu.
    Göç durumu KRİTİKTİR: koddan ESKİ bir yedeği geri yüklerseniz şema
    eksik kalır ve ürün açılışta değil, ilk o tabloya dokunulduğunda
    patlar — yani saatler sonra ve alakasız bir ekranda. */
export function denetle(yol) {
  if (!existsSync(yol)) throw new Error(`Yedek bulunamadı: ${yol}`);
  const d = new Database(yol, { readonly: true });
  try {
    const butunluk = d.pragma('integrity_check', { simple: true });
    if (butunluk !== 'ok') throw new Error(`Bütünlük denetimi başarısız: ${butunluk}`);
    const yabanci = d.pragma('foreign_key_check');
    const tablo = d.prepare(
      "select count(*) c from sqlite_master where type='table'").get().c;
    const gocler = d.prepare(
      'select migration_name from _prisma_migrations order by migration_name').all()
      .map((r) => r.migration_name);
    // Boş bir yedek de "bütün"dür; satır saymadan doğrulama eksik kalır.
    const kullanici = d.prepare('select count(*) c from Kullanici').get().c;
    const iz = d.prepare('select count(*) c from AktiviteKaydi').get().c;
    return {
      yol,
      boyutBayt: statSync(yol).size,
      ozet: ozet(yol),
      icerikOzeti: icerikOzeti(d),
      butunluk,
      yabanciAnahtarKusuru: yabanci.length,
      tablo,
      gocSayisi: gocler.length,
      sonGoc: gocler.at(-1) ?? null,
      kullanici,
      izKaydi: iz,
    };
  } finally { d.close(); }
}

/** `VACUUM INTO` ile tutarlı anlık görüntü. Hedef VARSA yazmaz —
    var olan bir yedeğin üstüne yazmak, bir yedeği sessizce yok etmektir. */
export function al(hedef) {
  if (!existsSync(KAYNAK)) throw new Error(`Kaynak veritabanı yok: ${KAYNAK}`);
  if (existsSync(hedef)) throw new Error(`Hedef zaten var, üstüne yazılmaz: ${hedef}`);
  mkdirSync(path.dirname(hedef), { recursive: true });
  const d = new Database(KAYNAK, { readonly: true });
  try {
    // Tırnak kaçışı: yol içinde tek tırnak olabilir.
    d.exec(`VACUUM INTO '${hedef.replace(/'/g, "''")}'`);
  } finally { d.close(); }
  return denetle(hedef);
}

/** Yedek ile canlı arasındaki farkı SAYIYLA söyler. Geri yükleme kararı
    "eski mi yeni mi" sorusuna dayanır; tahminle verilmez. */
export function karsilastir(yedek) {
  const y = denetle(yedek);
  const c = denetle(KAYNAK);
  return {
    yedek: y,
    canli: c,
    // Bayt değil, MANTIKSAL karşılaştırma.
    ayniIcerik: y.icerikOzeti === c.icerikOzeti,
    gocFarki: c.gocSayisi - y.gocSayisi,
    izFarki: c.izKaydi - y.izKaydi,
  };
}

function yaz(b) {
  console.log(`  dosya      : ${b.yol}`);
  console.log(`  boyut      : ${(b.boyutBayt / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  bayt özeti : ${b.ozet}`);
  console.log(`  içerik özeti: ${b.icerikOzeti}`);
  console.log(`  bütünlük   : ${b.butunluk}`);
  console.log(`  yabancı anahtar kusuru: ${b.yabanciAnahtarKusuru}`);
  console.log(`  tablo      : ${b.tablo}`);
  console.log(`  göç        : ${b.gocSayisi} (son: ${b.sonGoc})`);
  console.log(`  kullanıcı  : ${b.kullanici} · iz kaydı: ${b.izKaydi}`);
}

const bu = path.resolve(process.argv[1] ?? '');
if (bu === path.resolve(new URL(import.meta.url).pathname)) {
  const [kip, arg] = process.argv.slice(2);
  try {
    if (kip === '--al') {
      const damga = new Date().toISOString().replace(/[:.]/g, '-');
      const hedef = path.resolve(arg ?? path.join('yedek', `uyum-${damga}.db`));
      const rapor = al(hedef);
      console.log('YEDEK ALINDI ve DOĞRULANDI\n');
      yaz(rapor);
      console.log('\nNot: `.env` bu yedekte YOKTUR ve olmamalıdır — ayrı saklayın.');
    } else if (kip === '--dogrula') {
      if (!arg) throw new Error('Doğrulanacak yedek dosyasını verin');
      const rapor = denetle(path.resolve(arg));
      console.log('YEDEK DOĞRULANDI\n');
      yaz(rapor);
    } else if (kip === '--karsilastir') {
      if (!arg) throw new Error('Karşılaştırılacak yedek dosyasını verin');
      const k = karsilastir(path.resolve(arg));
      console.log('YEDEK\n'); yaz(k.yedek);
      console.log('\nCANLI\n'); yaz(k.canli);
      console.log(`\naynı içerik (mantıksal): ${k.ayniIcerik ? 'evet' : 'HAYIR'}`);
      console.log(`göç farkı  : ${k.gocFarki} (yedek koddan geriyse geri yükleme sonrası `
        + '`npx prisma migrate deploy` ŞART)');
      console.log(`iz farkı   : ${k.izFarki} kayıt`);
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
