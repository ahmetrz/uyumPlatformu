import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DEGISMEZLIK_YOLU, TABAN_ADI, TABAN_YOLU, karar as tabanKarari, taze } from '../arac/pg-taban.mjs';
import { DEGISMEZLIK_VAKALARI, karar as gocKarari, pgAdi } from '../arac/pg-goc.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   R5 · PostgreSQL göçü ve değişmezliği [URN-KUR-009]

   İki kapı var ve ikisi de farklı şeyi ölçer:

   · `kapi:pg-taban` — veritabanı İSTEMEZ. Taban göçünü şemadan yeniden
     üretir ve depodakiyle karşılaştırır. Şema değişip taban güncellenmezse
     yeni PostgreSQL kurulumu şemadan AYRIŞIR.
   · `kapi:pg-goc` — boş bir PostgreSQL veritabanına tabanı uygular, şema
     farkını, NESNE ENVANTERİNİ ve değişmezliği ölçer.

   Bu dosya kapıların KARAR fonksiyonlarını (saf) ve taban göçünün diskteki
   hâlini ölçer; canlı PostgreSQL koşusu CI'nın `kapi-postgres` işidir.

   ÖLÇÜLEN KUSUR (9 Eylül 2026): `prisma migrate diff` YALNIZ Prisma modelini
   görür. SQLite zincirindeki iki tetikleyici (`kanit_surumu_*`) ve üç indeks
   (kısmi/ifade) taban göçünde YOKTU; kapı yine de "şema farkı 0" diyordu ve
   PostgreSQL kurulumu korumasızdı. Bugün kapı iki sağlayıcının nesne
   adlarını karşılaştırıyor.
   ═══════════════════════════════════════════════════════════════════════ */

const WEB = process.cwd();
const bos = {
  baglanti: true, psqlVar: true, dbAdi: 'x', uygulanan: [TABAN_ADI], beklenenGoc: [TABAN_ADI],
  fark: '', farkHatasi: '', satirsizGuncelleme: { gecti: true, mesaj: '' }, temizlendi: true, hata: '',
  eksikTetikleyici: [], eksikIndeks: [], envanterHatasi: '',
  degismezlik: DEGISMEZLIK_VAKALARI.map((v: { ad: string }) => ({ ad: v.ad, reddedildi: true, mesajUydu: true, mesaj: '' })),
};

describe('PostgreSQL taban göçü [URN-KUR-009]', () => {
  it('taban göçü diskte VAR ve şemadan üretilen hâliyle BİREBİR aynı', () => {
    expect(existsSync(TABAN_YOLU), 'taban göçü yok').toBe(true);
    const olcum = taze({ web: WEB });
    expect(tabanKarari(olcum).kirmizi, tabanKarari(olcum).mesaj).toBe(false);
    expect(olcum.mevcutSatir, 'sıfır satırlık bir taban ölçüm değildir').toBeGreaterThan(3000);
    /* BAYAT ve YOK dalları da ölçülür: yalnız "taze hâl yeşil" diye bakan bir
       test, tazelik kontrolü tamamen kaldırıldığında da yeşil kalırdı
       (sabotaj S128 bunu yakaladı — kapının kendi kör noktasıydı). */
    expect(tabanKarari({ ...olcum, taze: false }).kirmizi, 'bayat taban yeşil geçti').toBe(true);
    expect(tabanKarari({ ...olcum, taze: false }).mesaj).toMatch(/BAYAT/);
    expect(tabanKarari({ ...olcum, var: false }).kirmizi, 'taban yokken yeşil geçti').toBe(true);
  });

  it('taban göçü ELLE YAZILAN DDL\'i taşır: dokuz tetikleyici ve üç indeks [URN-KUR-009]', () => {
    /* `migrate diff` bunların hiçbirini görmez; taban göçüne elle eklenmezse
       PostgreSQL kurulumu "fark 0" der ve YİNE DE korumasız kalır. */
    const taban = readFileSync(TABAN_YOLU, 'utf8');
    const elle = readFileSync(DEGISMEZLIK_YOLU, 'utf8');
    expect(taban.endsWith(`${elle.trimEnd()}\n`), 'elle yazılan DDL taban göçünün sonunda değil').toBe(true);
    for (const ad of ['aktivite_guncelleme_yasak', 'aktivite_silme_yasak', 'aktivite_truncate_yasak',
      'degerlendirme_tarihcesi_guncelleme_yasak', 'degerlendirme_tarihcesi_silme_yasak', 'degerlendirme_tarihcesi_truncate_yasak',
      'kanit_surumu_guncelleme_yasak', 'kanit_surumu_silme_yasak', 'kanit_surumu_truncate_yasak']) {
      expect(taban, `tetikleyici yok: ${ad}`).toContain(`CREATE TRIGGER ${ad}`);
    }
    for (const ad of ['FrameworkSurumu_tekAktif', 'VarlikAtamaTalebi_tek_aktif', 'ErisimAtamasi_tekil_coalesce_key']) {
      expect(taban, `indeks yok: ${ad}`).toContain(`CREATE UNIQUE INDEX "${ad}"`);
    }
    /* SQLite `char(31)` yazar; PostgreSQL'de o işlev YOKTUR (`chr`).
       Ölçüm İFADENİN kendisine bakar, yorumdaki sözcüğe değil. */
    expect(taban).toContain('COALESCE("varlikId", chr(31))');
    expect(taban).not.toContain('COALESCE("varlikId", char(31))');
    /* TRUNCATE tetikleyicileri PostgreSQL'e ÖZGÜ boşluğu kapatır: TRUNCATE
       SATIR tetikleyicilerini atlar, onlarsız değişmezlik iddiası yalandır. */
    expect((taban.match(/BEFORE TRUNCATE ON/g) ?? []).length).toBe(3);
    expect((taban.match(/FOR EACH ROW EXECUTE FUNCTION denetim_izi_degismez/g) ?? []).length).toBe(6);
  });

  it('SQLite zincirindeki elle yazılan DDL, PostgreSQL tarafında KARŞILIKSIZ kalmaz [URN-KUR-009]', () => {
    /* Kaynak SQLite göçlerinden okunur: yeni bir tetikleyici/kısmi indeks
       eklenip PostgreSQL'e taşınmazsa bu vaka kırmızı yanar. */
    const gocDizini = path.join(WEB, 'prisma', 'migrations');
    const hepsi = readdirSync(gocDizini, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(gocDizini, d.name, 'migration.sql'))
      .filter((y) => existsSync(y))
      .map((y) => readFileSync(y, 'utf8')).join('\n');
    const taban = readFileSync(TABAN_YOLU, 'utf8');
    const tetikAdlari = [...hepsi.matchAll(/CREATE TRIGGER\s+"?([A-Za-z0-9_]+)"?/g)].map((m) => m[1]);
    const indeksAdlari = [...hepsi.matchAll(/CREATE UNIQUE INDEX\s+"([A-Za-z0-9_]+)"[^;]*(?:WHERE|COALESCE)/g)].map((m) => m[1]);
    expect(tetikAdlari.length, 'SQLite zincirinde tetikleyici bulunamadı — tarama boş bakıyor').toBeGreaterThanOrEqual(6);
    expect(indeksAdlari.length, 'SQLite zincirinde elle indeks bulunamadı — tarama boş bakıyor').toBeGreaterThanOrEqual(3);
    for (const ad of tetikAdlari) expect(taban, `SQLite tetikleyicisi PostgreSQL tabanında yok: ${ad}`).toContain(`CREATE TRIGGER ${ad}`);
    for (const ad of indeksAdlari) expect(taban, `SQLite indeksi PostgreSQL tabanında yok: ${ad}`).toContain(`"${ad}"`);
  });
});

describe('PostgreSQL göç kapısının kararı [URN-KUR-009]', () => {
  it('temiz ölçüm yeşildir; PG_URL yoksa ÖLÇÜLMEDİ ve KIRMIZIdır', () => {
    expect(gocKarari(bos).kirmizi).toBe(false);
    const bagsiz = gocKarari({ ...bos, baglanti: false });
    expect(bagsiz.kirmizi).toBe(true);
    expect(bagsiz.kirmizilar.join(' ')).toMatch(/ÖLÇÜLMEDİ/);
  });

  it('eksik tetikleyici, eksik indeks ve reddedilmeyen yasak eylem KIRMIZIdır', () => {
    expect(gocKarari({ ...bos, eksikTetikleyici: ['kanit_surumu_silme_yasak'] }).kirmizilar.join(' '))
      .toMatch(/OLMAYAN tetikleyici/);
    expect(gocKarari({ ...bos, eksikIndeks: ['FrameworkSurumu_tekAktif'] }).kirmizilar.join(' '))
      .toMatch(/OLMAYAN indeks/);
    const delik = { ...bos, degismezlik: bos.degismezlik.map((d, i) => (i === 0 ? { ...d, reddedildi: false } : d)) };
    expect(gocKarari(delik).kirmizilar.join(' ')).toMatch(/DEĞİŞMEZLİK DELİK/);
    const yanlisMesaj = { ...bos, degismezlik: bos.degismezlik.map((d, i) => (i === 1 ? { ...d, mesajUydu: false } : d)) };
    expect(gocKarari(yanlisMesaj).kirmizilar.join(' ')).toMatch(/mesaj SQLite tarafıyla uyuşmuyor/);
  });

  it('satır seviyesi kanıtı: hiçbir satıra dokunmayan UPDATE reddedilirse KIRMIZI', () => {
    /* `FOR EACH STATEMENT` yazılmış bir tetikleyici SQLite'tan sessizce ayrışır. */
    expect(gocKarari({ ...bos, satirsizGuncelleme: { gecti: false, mesaj: 'x' } }).kirmizilar.join(' '))
      .toMatch(/FOR EACH STATEMENT/);
  });

  it('sıfır göç ve temizlenmemiş veritabanı KIRMIZIdır — sıfır ölçüm ölçüm değildir', () => {
    expect(gocKarari({ ...bos, uygulanan: [] }).kirmizilar.join(' ')).toMatch(/hiçbir göç uygulanmadı/);
    expect(gocKarari({ ...bos, temizlendi: false }).kirmizilar.join(' ')).toMatch(/silinemedi/);
  });

  it('PostgreSQL ad kısaltması YALANCI kırmızı üretmez [URN-KUR-009]', () => {
    /* PostgreSQL tanımlayıcısı 63 BAYTTIR; uzun `@@unique` adı ORTADAN kırpılır,
       sonek korunur. Düz kırpma iki indeksi "yok" sayıyordu (kapının kendi kusuru). */
    expect(pgAdi('Yetki_kod')).toBe('Yetki_kod');
    expect(pgAdi('ProjeBaglantisi_projeId_maddeId_bulguId_riskId_tesisId_varlikId_key'))
      .toBe('ProjeBaglantisi_projeId_maddeId_bulguId_riskId_tesisId_varl_key');
    expect(pgAdi('Yetki_kullaniciId_surecId_kapsamOgesiId_tuzelKisiId_regulasyonId_modul_key'))
      .toBe('Yetki_kullaniciId_surecId_kapsamOgesiId_tuzelKisiId_regulas_key');
    for (const ad of ['ProjeBaglantisi_projeId_maddeId_bulguId_riskId_tesisId_varlikId_key']) {
      expect(Buffer.byteLength(pgAdi(ad), 'utf8')).toBeLessThanOrEqual(63);
    }
  });
});

describe('sağlayıcı tek kaynaktan okunur [URN-KUR-009]', () => {
  it('taban göçünün adı ve kilit dosyası PostgreSQL der', () => {
    const kilit = readFileSync(path.join(path.dirname(path.dirname(TABAN_YOLU)), 'migration_lock.toml'), 'utf8');
    expect(kilit).toMatch(/provider = "postgresql"/);
    /* SQLite tarafı DEĞİŞMEZ: geliştirme ve demo orada kalır. */
    expect(readFileSync(path.join(WEB, 'prisma', 'migrations', 'migration_lock.toml'), 'utf8')).toMatch(/provider = "sqlite"/);
  });
});
