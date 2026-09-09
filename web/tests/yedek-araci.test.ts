import { describe, expect, it } from 'vitest';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
/* `better-sqlite3`e doğrudan dokunan testler tip bildirimi kullanır
   (`@types/better-sqlite3`, R5 ile eklendi): ürün kodu ona Prisma adaptörü
   üzerinden dokunur, testler ham sürücüyle — SQLite göçlerini ölçen bir
   testin üretilen (sağlayıcıya bağlı) istemciye ihtiyacı yoktur. */
import Database from 'better-sqlite3';
import {
  al, denetle, depoyuTara, geriYukle, kanitKayitlari, karsilastir, ozet, saglayiciCoz,
} from '../arac/yedek.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   Ürünün kendi yedekleme aracı (P2-7 · R3) [URN-KUR-011]

   Ürün, `restoreTestiKaydet` ile müşteriye şunu dayatıyor: **geri
   yüklenebildiği kanıtlanmamış yedek, yedek değildir.** Aynı kural ürünün
   kendi yedekleme aracı için de geçerlidir — bu yüzden araç yazılıp
   bırakılmıyor, ölçülüyor.

   R3 ile ölçülen ALTI şey:
     · yedek TUTARLI ve BÜTÜNDÜR (integrity_check + yabancı anahtar),
     · MANTIKSAL karşılaştırma bayt karşılaştırması DEĞİLDİR — `VACUUM
       INTO` sıkıştırarak yazar, aynı veri farklı bayt üretir; bayt
       karşılaştırması "yedek bozuk" diye yanlış alarm verirdi,
     · KANIT DOSYALARI yedeğe girer ve manifest anahtar · boyut · özet
       taşır — dosyaları almayan bir yedek, geri yüklendiğinde ekranı
       doldurur ama denetçiye gösterilecek şeyi getirmez,
     · veritabanının BEKLEDİĞİ ama yedekte OLMAYAN dosya ADIYLA çıkar ve
       araç sıfır dışı kodla döner,
     · BOŞ depo "dosya: 0" der — "kanıt dosyası yok" DEMEZ; ikincisi bir
       iddiadır ve depo okunamadığında da aynı cümleyi kurar,
     · GERİ YÜKLEME denenir: yedek boş bir ortama açılır ve veritabanı da
       kanıt dosyaları da geri gelir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yedek-'));
const CANLI = path.join(process.cwd(), 'prisma', 'dev.db');

/** Kanıt deposunu kurgusal bir dosyayla doldurup `al()`ı o kökle koşturur.
    Ürünün kendi kuralı: anahtar İÇERİĞİN özetinden türer. */
function depoyaKoy(kok: string, icerik: string) {
  const o = createHash('sha256').update(icerik).digest('hex');
  const anahtar = `${o.slice(0, 2)}/${o.slice(2, 4)}/${o}`;
  const yol = path.join(kok, anahtar);
  mkdirSync(path.dirname(yol), { recursive: true });
  writeFileSync(yol, icerik);
  return { anahtar, ozet: o, yol };
}

/** Canlı veritabanının bir kopyası + kendi kanıt deposu = izole ortam.
    Testler ürünün gerçek `prisma/dev.db`sine YAZMAZ. */
function ortam(ad: string) {
  const kok = path.join(dizin, ad);
  const db = path.join(kok, 'prisma', 'dev.db');
  const depo = path.join(kok, 'kanit-deposu');
  mkdirSync(path.dirname(db), { recursive: true });
  mkdirSync(depo, { recursive: true });
  copyFileSync(CANLI, db);
  return { kok, db, depo, url: `file:${db}` };
}

/** `al()` depo kökünü ortamdan okur (ürün koduyla aynı kural); testte o
    değişken geçici olarak kurgusal depoya çevrilir. */
function depoyla<T>(kok: string, is: () => T): T {
  const onceki = process.env.KANIT_DEPO_KOKU;
  process.env.KANIT_DEPO_KOKU = kok;
  try { return is(); } finally {
    if (onceki === undefined) delete process.env.KANIT_DEPO_KOKU;
    else process.env.KANIT_DEPO_KOKU = onceki;
  }
}

describe('yedek aracı · veritabanı [URN-KUR-011]', () => {
  it('yedek alır, doğrular ve göç durumunu raporlar [URN-KUR-011]', () => {
    const o = ortam('temel');
    const r = depoyla(o.depo, () => al(path.join(dizin, 'temel-yedek'), o.url));
    expect(r.saglayici).toBe('sqlite');
    expect(r.ozetler.butunluk).toBe('ok');
    expect(r.ozetler.yabanciAnahtarKusuru).toBe(0);
    expect(r.ozetler.tablo).toBeGreaterThan(50);
    /* Göç durumu raporlanmazsa, koddan eski bir yedek sessizce geri
       yüklenir ve ürün saatler sonra alakasız bir ekranda patlar. */
    expect(r.ozetler.gocSayisi).toBeGreaterThan(0);
    expect(r.ozetler.sonGoc).toBeTruthy();
    expect(r.ozetler.kullanici).toBeGreaterThan(0);
    expect(r.saglam).toBe(true);
  });

  it('var olan yedeğin ÜSTÜNE YAZMAZ [URN-KUR-011]', () => {
    const o = ortam('ustune');
    const hedef = path.join(dizin, 'ustune-yedek');
    depoyla(o.depo, () => al(hedef, o.url));
    // Üstüne yazmak, bir yedeği sessizce yok etmektir.
    expect(() => depoyla(o.depo, () => al(hedef, o.url))).toThrow(/zaten var/i);
  });

  it('MANTIKSAL karşılaştırma bayt karşılaştırması değildir [URN-KUR-011]', () => {
    /* `VACUUM INTO` boş sayfaları atarak yazar: aynı veri, farklı bayt.
       Bayt karşılaştırması burada "yedek canlıdan farklı" derdi — doğru
       ama yanıltıcı bir cevap. */
    const o = ortam('mantik');
    const hedef = path.join(dizin, 'mantik-yedek');
    const r = depoyla(o.depo, () => al(hedef, o.url));
    const k = depoyla(o.depo, () => karsilastir(hedef, o.url));
    expect(k.ayniIcerik).toBe(true);
    expect(k.gocFarki).toBe(0);
    expect(k.izFarki).toBe(0);
    expect(r.veritabani.ozet).not.toBe(ozet(o.db));       // bayt farkı BEKLENİR
    expect(r.ozetler.icerikOzeti).toBe(k.canli.icerikOzeti);
  });

  it('içerik özeti VERİ DEĞİŞİNCE değişir — yoksa hiçbir şey ölçmezdi [URN-KUR-011]', () => {
    const o = ortam('degisim');
    const once = depoyla(o.depo, () => al(path.join(dizin, 'degisim-1'), o.url)).ozetler.icerikOzeti;
    const d = new Database(o.db);
    d.prepare('insert into Kullanici (id, adSoyad, eposta) values (?, ?, ?)')
      .run('yedek-test-kisi', 'Yedek Testi', `yt-${Date.now()}@test`);
    d.close();
    const sonra = depoyla(o.depo, () => al(path.join(dizin, 'degisim-2'), o.url)).ozetler.icerikOzeti;
    expect(sonra).not.toBe(once);
  });

  it('BOZUK yedek sessizce kabul edilmez [URN-KUR-011]', () => {
    const bozuk = path.join(dizin, 'bozuk');
    mkdirSync(path.join(bozuk, 'kanit'), { recursive: true });
    const db = path.join(bozuk, 'veritabani.db');
    writeFileSync(db, 'bu bir SQLite dosyası değil');
    writeFileSync(path.join(bozuk, 'manifest.json'), JSON.stringify({
      bicimSurumu: 1, alindi: new Date().toISOString(), saglayici: 'sqlite',
      veritabani: { dosya: 'veritabani.db', boyutBayt: 27, ozet: ozet(db) },
      veritabaniOzeti: {}, kanit: { kok: '/yok', depoVarMi: true, dosyaSayisi: 0, toplamBayt: 0, dosyalar: [] },
    }));
    expect(() => denetle(bozuk)).toThrow();
  });

  it('olmayan yedek ve manifestsiz dizin açıkça reddedilir [URN-KUR-011]', () => {
    expect(() => denetle(path.join(dizin, 'yok'))).toThrow(/bulunamadı/i);
    const bos = path.join(dizin, 'manifestsiz');
    mkdirSync(bos, { recursive: true });
    expect(() => denetle(bos)).toThrow(/manifest yok/i);
  });

  it('sağlayıcı bağlantıdan çözülür; tanınmayan şema HATADIR [URN-KUR-011]', () => {
    expect(saglayiciCoz(undefined)).toBe('sqlite');
    expect(saglayiciCoz('file:./dev.db')).toBe('sqlite');
    expect(saglayiciCoz('postgresql://u:p@h:5432/d')).toBe('postgresql');
    // Sessizce SQLite'a düşmek, yanlış sağlayıcıya yedek almak demektir.
    expect(() => saglayiciCoz('mysql://u:p@h/d')).toThrow(/tanınmayan/i);
  });
});

describe('yedek aracı · kanıt dosyaları [URN-KUR-011]', () => {
  it('kanıt dosyalarını ALIR ve manifeste anahtar · boyut · özet yazar [URN-KUR-011]', () => {
    const o = ortam('kanit');
    const a = depoyaKoy(o.depo, 'birinci kanıt dosyası');
    const b = depoyaKoy(o.depo, 'ikinci kanıt dosyası');
    const hedef = path.join(dizin, 'kanit-yedek');
    const r = depoyla(o.depo, () => al(hedef, o.url));

    expect(r.kanit.dosyaSayisi).toBe(2);
    expect(r.kanit.toplamBayt).toBeGreaterThan(0);
    const m = JSON.parse(readFileSync(path.join(hedef, 'manifest.json'), 'utf8'));
    const anahtarlar = m.kanit.dosyalar.map((f: { anahtar: string }) => f.anahtar).sort();
    expect(anahtarlar).toEqual([a.anahtar, b.anahtar].sort());
    for (const f of m.kanit.dosyalar) {
      expect(f.ozet, 'manifest özeti dosyanın kendi özeti olmalı').toHaveLength(64);
      expect(f.boyutBayt).toBeGreaterThan(0);
      // Dosya gerçekten yedeğin İÇİNDE olmalı; manifest satırı tek başına yedek değildir.
      expect(existsSync(path.join(hedef, 'kanit', f.anahtar))).toBe(true);
    }
    expect(r.saglam).toBe(true);
  });

  it('BOŞ depoda "dosya: 0" ölçülür — "kanıt dosyası yok" denmez [URN-KUR-011]', () => {
    /* Sıfır bir ÖLÇÜMDÜR; "yok" bir iddiadır ve depo okunamadığında da aynı
       cümleyi kurar. İkisi ayrı alanlardır: `dosyaSayisi` ile `depoVarMi`. */
    const o = ortam('bos-depo');
    const r = depoyla(o.depo, () => al(path.join(dizin, 'bos-depo-yedek'), o.url));
    expect(r.kanit.dosyaSayisi).toBe(0);
    expect(r.kanit.depoVarMi, 'depo VARDI ve boştu — "yok" değil').toBe(true);

    // Depo DİZİNİ hiç yoksa bu ayrı bir olgudur ve ayrı raporlanır.
    const yokDepo = path.join(dizin, 'hic-olmayan-depo');
    expect(depoyuTara(yokDepo)).toEqual({ kok: yokDepo, varMi: false, dosyalar: [] });
  });

  it('DEPOSU ÖLÇÜLEMEYEN yedek DOĞRULANMIŞ sayılmaz [URN-KUR-011]', () => {
    /* Depo dizini hiç yokken `dosyalar` boş kalır, `eksik`/`curuk` de boş
       çıkar ve yedek sessizce "sağlam" görünürdü — kanıt dosyası bekleyen
       bir veritabanının yanında sıfır dosyalı bir yedek. Boş sonuç "geçti"
       sayılmaz (bağımsız inceleme, P2). */
    const o = ortam('olcumsuz');
    const yokDepo = path.join(dizin, 'hic-kurulmayan-depo');
    const hedef = path.join(dizin, 'olcumsuz-yedek');
    const r = depoyla(yokDepo, () => al(hedef, o.url));
    expect(r.kanit.depoVarMi).toBe(false);
    expect(r.kanit.dosyaSayisi).toBe(0);
    expect(r.saglam, 'depo ölçülemedi — yedek doğrulanmış sayılamaz').toBe(false);
    expect(denetle(hedef).saglam).toBe(false);
  });

  it('BOŞ DİZE `dosyaHash` iki sağlayıcıda da "özet yok" sayılır [URN-KUR-011]', () => {
    /* PostgreSQL dalı `coalesce(...,'')` döndürüyor, SQLite dalı boş dizeyi
       taşıyordu: aynı kayıt bir sağlayıcıda ÇÜRÜK, öbüründe sağlam
       görünürdü (bağımsız inceleme, P3). */
    const o = ortam('bosozet');
    const a = depoyaKoy(o.depo, 'özeti boş yazılmış kanıt');
    const d = new Database(o.db);
    d.prepare('insert into Kanit (id, ad, tip, depoAnahtari, dosyaHash) values (?, ?, ?, ?, ?)')
      .run('kanit-bos-ozet', 'Boş Özet', 'politika', a.anahtar, '');
    d.close();
    const kayit = kanitKayitlari(o.url)
      .find((k: { id: string }) => k.id === 'kanit-bos-ozet') as { hash: string | null } | undefined;
    expect(kayit, 'kayıt okunamadı').toBeTruthy();
    expect(kayit?.hash, 'boş dize özet DEĞİLDİR').toBeNull();
    const hedef = path.join(dizin, 'bosozet-yedek');
    depoyla(o.depo, () => al(hedef, o.url));
    // Özet yoksa doğrulama ANAHTARIN kendisinden yapılır ve kayıt sağlamdır.
    expect(depoyla(o.depo, () => karsilastir(hedef, o.url)).kanitCuruk).toHaveLength(0);
  });

  it('yedekten SİLİNEN kanıt dosyası doğrulamada ADIYLA çıkar [URN-KUR-011]', () => {
    const o = ortam('eksik');
    const a = depoyaKoy(o.depo, 'silinecek kanıt');
    const hedef = path.join(dizin, 'eksik-yedek');
    depoyla(o.depo, () => al(hedef, o.url));

    rmSync(path.join(hedef, 'kanit', a.anahtar));
    const d = denetle(hedef);
    expect(d.saglam).toBe(false);
    expect(d.kanit.eksikDosyalar.map((f: { anahtar: string }) => f.anahtar)).toEqual([a.anahtar]);
  });

  it('yedekte DEĞİŞTİRİLEN kanıt dosyası ÇÜRÜK diye çıkar [URN-KUR-011]', () => {
    const o = ortam('curuk');
    const a = depoyaKoy(o.depo, 'değiştirilecek kanıt');
    const hedef = path.join(dizin, 'curuk-yedek');
    depoyla(o.depo, () => al(hedef, o.url));

    writeFileSync(path.join(hedef, 'kanit', a.anahtar), 'başka içerik');
    const d = denetle(hedef);
    expect(d.saglam).toBe(false);
    expect(d.kanit.curukDosyalar.map((f: { anahtar: string }) => f.anahtar)).toEqual([a.anahtar]);
  });

  it('veritabanının BEKLEDİĞİ ama yedekte olmayan dosya EKSİK diye çıkar [URN-KUR-011]', () => {
    /* Kanıt bütünlüğü diskteki dosyaları saymakla ölçülemez: yedek kendi
       içinde tutarlı olabilir ve yine de veritabanının beklediği dosyayı
       taşımıyor olabilir. Ölçüm VERİTABANINA karşı yapılır. */
    const o = ortam('beklenen');
    const a = depoyaKoy(o.depo, 'veritabanının beklediği kanıt');
    const hedef = path.join(dizin, 'beklenen-yedek');
    depoyla(o.depo, () => al(hedef, o.url));

    // Kayıt yedek ALINDIKTAN SONRA eklenir: yedek o dosyayı taşımıyor.
    const yeni = createHash('sha256').update('yedekte olmayan kanıt').digest('hex');
    const d = new Database(o.db);
    d.prepare('insert into Kanit (id, ad, tip, depoAnahtari, dosyaHash) values (?, ?, ?, ?, ?)')
      .run('kanit-eksik-1', 'Eksik Kanıt', 'politika',
        `${yeni.slice(0, 2)}/${yeni.slice(2, 4)}/${yeni}`, yeni);
    d.close();

    const k = depoyla(o.depo, () => karsilastir(hedef, o.url));
    expect(k.saglam).toBe(false);
    expect(k.kanitEksik).toHaveLength(1);
    expect(k.kanitEksik[0].id).toBe('kanit-eksik-1');
    expect(k.kanitEksik[0].ad).toBe('Eksik Kanıt');
    // Yedekte DURAN dosya kusur değildir; sayı olarak raporlanır.
    expect(k.kanitSahipsiz).toEqual([a.anahtar]);
  });

  it('`dosyaHash` ile TUTMAYAN dosya ÇÜRÜK diye çıkar [URN-KUR-011]', () => {
    const o = ortam('hash');
    const a = depoyaKoy(o.depo, 'özeti bozulacak kanıt');
    const d = new Database(o.db);
    /* Kayıt DOĞRU anahtarı ama BAŞKA bir özeti gösteriyor: dosya diskte
       duruyor, biçimi geçerli, ama veritabanının beklediği içerik değil. */
    d.prepare('insert into Kanit (id, ad, tip, depoAnahtari, dosyaHash) values (?, ?, ?, ?, ?)')
      .run('kanit-curuk-1', 'Çürük Kanıt', 'politika', a.anahtar,
        createHash('sha256').update('bambaşka içerik').digest('hex'));
    d.close();

    const hedef = path.join(dizin, 'hash-yedek');
    depoyla(o.depo, () => al(hedef, o.url));
    const k = depoyla(o.depo, () => karsilastir(hedef, o.url));
    expect(k.saglam).toBe(false);
    expect(k.kanitCuruk).toHaveLength(1);
    expect(k.kanitCuruk[0].id).toBe('kanit-curuk-1');
    expect(k.kanitCuruk[0].yedekteki).toBe(a.ozet);
  });

  it('kanıt SÜRÜMLERİNİN dosyaları da beklenenler arasındadır [URN-KUR-011]', () => {
    /* Eski bir sürümün dosyası yedekte yoksa kanıtın geçmişi geri gelmez
       ve değişmez iz iddiası orada biter. */
    const o = ortam('surum');
    const d = new Database(o.db);
    const eski = createHash('sha256').update('eski sürüm dosyası').digest('hex');
    d.prepare('insert into Kanit (id, ad, tip) values (?, ?, ?)')
      .run('kanit-surumlu', 'Sürümlü Kanıt', 'politika');
    d.prepare('insert into KanitSurumu (id, kanitId, surum, dosyaHash, dosyaAdi, depoAnahtari, gerekce) '
      + 'values (?, ?, ?, ?, ?, ?, ?)')
      .run('surum-1', 'kanit-surumlu', 1, eski, 'eski.pdf',
        `${eski.slice(0, 2)}/${eski.slice(2, 4)}/${eski}`, 'ilk yükleme');
    d.close();

    const kayitlar = kanitKayitlari(o.url);
    expect(kayitlar.some((k: { kaynak: string; id: string }) => k.kaynak === 'KanitSurumu' && k.id === 'surum-1')).toBe(true);
  });
});

describe('yedek aracı · geri yükleme [URN-KUR-011]', () => {
  it('BOŞ ortama geri yükler: veritabanı ve kanıt dosyaları geri gelir [URN-KUR-011]', () => {
    const o = ortam('geri');
    const a = depoyaKoy(o.depo, 'geri gelecek kanıt');
    const hedef = path.join(dizin, 'geri-yedek');
    const alinan = depoyla(o.depo, () => al(hedef, o.url));

    const bos = path.join(dizin, 'bos-ortam');
    const bosDb = path.join(bos, 'prisma', 'dev.db');
    const bosDepo = path.join(bos, 'kanit');
    const r = geriYukle(hedef, { url: `file:${bosDb}`, hedefDb: bosDb, hedefKanit: bosDepo });

    expect(r.kanitDosyasi).toBe(1);
    expect(existsSync(bosDb)).toBe(true);
    expect(ozet(path.join(bosDepo, a.anahtar))).toBe(a.ozet);
    // Geri yüklenen veritabanı yedeğin İÇERİĞİNİ taşımalı, benzerini değil.
    expect(denetle(hedef).ozetler.icerikOzeti).toBe(alinan.ozetler.icerikOzeti);
  });

  it('DOLU ortama üstüne yazmaz — geri yükleme veri kaybettirir [URN-KUR-011]', () => {
    const o = ortam('dolu');
    const hedef = path.join(dizin, 'dolu-yedek');
    depoyla(o.depo, () => al(hedef, o.url));
    // Hedef zaten dolu: "üstüne yaz" bir İNSAN kararıdır, varsayılan değil.
    expect(() => geriYukle(hedef, { url: o.url, hedefDb: o.db, hedefKanit: o.depo }))
      .toThrow(/dolu/i);
  });

  it('SAĞLAYICILAR ARASI geri yükleme reddedilir [URN-KUR-011]', () => {
    const o = ortam('capraz');
    const hedef = path.join(dizin, 'capraz-yedek');
    depoyla(o.depo, () => al(hedef, o.url));
    /* SQLite yedeği PostgreSQL'e açılmaz. Denemek, yarım bir şema ve
       "çalışıyor gibi görünen" bir kurulum bırakırdı. */
    expect(() => geriYukle(hedef, { url: 'postgresql://u:p@h:5432/d' }))
      .toThrow(/sağlayıcılar arası/i);
  });
});

// Geçici dizin bırakılmaz: test kendi çöpünü toplar.
process.on('exit', () => rmSync(dizin, { recursive: true, force: true }));
