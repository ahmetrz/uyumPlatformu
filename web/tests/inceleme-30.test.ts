/* İNCELEME TURU · #30 — beş bulgu, beşi de gerçek, beşi de main'e girmişti.

   Bulgular otomatik bir inceleme botundan geldi ve MERGE'DEN İKİ DAKİKA
   ÖNCE düştü; merge yalnız CI'ya bakılarak yapıldı, açık incelemeye
   bakılmadı. Bu dosya beşinin de düzeltmesini KANITLAR: her vaka,
   düzeltme geri alındığında düşecek şekilde yazıldı.

   Tek dosyada toplanmalarının sebebi ortak: hepsi bir inceleme turunun
   ürünü ve birlikte okunmaları gerekiyor. Ayrı ayrı dağıtılsalardı
   "bir tur ne buldu" sorusu bir daha cevaplanamazdı. */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ENERJI_SOZLUGU } from '../prisma/sozlukler';
import { kapsamKarari, sozlukKarari } from '@/lib/dil/sozlukDurumu';
import { kuralDegerlendir } from '@/lib/motorlar/uygulanabilirlik';

const KOK = process.cwd();
/* Geri dolgu TEK dosyada değildir ve olamaz: uygulanmış bir göç
   değiştirilemez, yeni çekirdek anahtar yeni bir göç ister. İddia bu
   yüzden dosyaya değil BİRLEŞİME bağlanır — "her satır bir yerde geri
   dolduruluyor". Tek dosyaya bağlıyken ikinci göç yazıldığı an kırmızı
   yanıyordu; kırmızının sebebi kuralın değil, iddianın kapsamıydı. */
const GOC_DIZINI = 'prisma/migrations';

/* ═══ P1 · Göç sözlüğü geri doldurmuyordu ═══════════════════════════════
   Dolu bir veritabanında `migrate deploy` sonrası `SektorSozlugu` boş
   kalıyordu: tek dolum yeri `seed.ts` ve o da `aktiviteKaydi.count() > 0`
   ise hiç koşmuyor. Sonuç, ürünün TEK İDDİASININ yükseltmede kaybolması —
   referans kiracı "santral" yerine çekirdek "tesis" görmeye başlıyordu. */
describe('P1 · sözlük geri dolgusu', () => {
  /* `SektorSozlugu`ya yazan BÜTÜN göçler, dosya adına göre sıralı. */
  const gocler = readdirSync(path.join(KOK, GOC_DIZINI))
    .sort()
    .map((d) => path.join(KOK, GOC_DIZINI, d, 'migration.sql'))
    .filter((y) => existsSync(y))
    .map((y) => readFileSync(y, 'utf8'))
    .filter((s) => s.includes('INSERT INTO "SektorSozlugu"'));
  const sql = gocler.join('\n');

  it('göç dosyası var ve SektorSozlugu\'na satır YAZIYOR', () => {
    const insertler = sql.match(/INSERT INTO "SektorSozlugu"/g) ?? [];
    expect(insertler.length, 'geri dolgu göçü satır yazmıyor')
      .toBe(ENERJI_SOZLUGU.length);
  });

  it('göçteki satırlar `ENERJI_SOZLUGU` ile AYNI şeyi söylüyor', () => {
    /* Göç SQL'dir ve TypeScript okuyamaz; iki nüsha kaçınılmaz. Kaçınılmaz
       olan nüshanın SESSİZCE ayrışmasıdır — bu vaka onu engeller. */
    for (const satir of ENERJI_SOZLUGU) {
      for (const alan of [satir.tekil, satir.cogul, satir.iyelik,
        satir.belirtme, satir.bulunma, satir.yonelme]) {
        expect(sql, `göçte eksik: ${satir.anahtar} → ${alan}`).toContain(`'${alan}'`);
      }
      expect(sql, `göçte anahtar yok: ${satir.anahtar}`).toContain(`'${satir.anahtar}'`);
    }
  });

  it('göç TEKRAR koşulabilir — ikiz satır yazmaz', () => {
    /* Yorumda da geçen `NOT EXISTS` sayılmasın: aranan şey SQL
       korumasının kendisidir. */
    const korumalar = sql.match(/AND NOT EXISTS \(SELECT 1 FROM/g) ?? [];
    expect(korumalar.length, '`NOT EXISTS` koruması eksik: göç elle yeniden '
      + 'koşulursa `(sektorId, anahtar, dil)` tekilliği kırılır')
      .toBe(ENERJI_SOZLUGU.length);
  });

  it('uygulanmış göç DEĞİŞTİRİLMEDİ — ayrı dosyada duruyor', () => {
    /* Prisma uygulanmış göçü sağlama toplamıyla tutar; içeriğini
       değiştirmek onu uygulamış her veritabanında sürüklenme verirdi. */
    const eski = readFileSync(path.join(KOK,
      'prisma/migrations/20260906230000_p1_sektor_bagimsizlik_katmani/migration.sql'), 'utf8');
    expect(eski, 'geri dolgu ESKİ göçe yazılmış — sağlama toplamı kırılır')
      .not.toContain('INSERT INTO "SektorSozlugu"');
  });
});

/* ═══ P1 · "sözlük yok" ile "sözlük BOŞ" aynı şey değil ═════════════════ */
describe('P1 · sözlük durumu ölçülebilir', () => {
  it('sektörü olmayan kayıt: çekirdek DOĞRU cevap, kusur değil', () => {
    expect(sozlukKarari(null, 0)).toBe('sektorsuz');
  });

  it('sektör var, satır yok: bu bir KUSURDUR', () => {
    expect(sozlukKarari('sek-1', 0)).toBe('eksik');
  });

  it('satır var: sözlük okunur', () => {
    expect(sozlukKarari('sek-1', 4)).toBe('var');
  });
});

/* ═══ P2 · Sınıfsız tesis "tek sektör" sayılıyordu ══════════════════════
   `.filter(Boolean)` sektörsüz tesisi ATIYOR, kalanlara "tek sektör"
   diyordu: bir sınıflı + bir sınıfsız tesiste kabuk enerji sözlüğünü
   seçiyor ve sınıfsız kayda da "santral" diyordu. Bilinmeyen ≠ tek. */
describe('P2 · kapsam sözlüğü · bilinmeyen ≠ tek', () => {
  it('tek sektör → o sektör', () => {
    expect(kapsamKarari(['sek-enerji', 'sek-enerji'])).toBe('sek-enerji');
  });

  it('SINIFSIZ tesis varsa çekirdeğe düşer — asıl kusur buydu', () => {
    expect(kapsamKarari(['sek-enerji', null])).toBeNull();
  });

  it('tek tesis ve o da sınıfsızsa çekirdek', () => {
    expect(kapsamKarari([null])).toBeNull();
  });

  it('birden çok sektör → çekirdek', () => {
    expect(kapsamKarari(['sek-enerji', 'sek-su'])).toBeNull();
  });

  it('boş kapsam → çekirdek', () => {
    expect(kapsamKarari([])).toBeNull();
  });
});

/* ═══ P1 · Öznitelik profil alanını eziyordu ════════════════════════════
   `{ ...p, ...nitelikler }` öznitelikleri profilden SONRA yayıyordu.
   Öznitelik anahtarı serbest dizedir; profil alanıyla çakışan tek bir
   anahtar otoriter değeri sessizce değiştirir ve uygulanabilirlik kuralı
   YANLIŞ tesis kümesi üretir. */
describe('P1 · öznitelik profili EZEMEZ', () => {
  const oz = (anahtar: string, sayisalDeger: number | null = null,
    metinDeger: string | null = null) => ({ anahtar, sayisalDeger, metinDeger });
  /* Karar KAMU YÜZEYİNDEN sınanıyor (`kuralDegerlendir`): `baglamKur`
     içeride kalsın diye. Kural "blackStart = true mi" diye sorar; cevap
     profilden mi öznitelikten mi geldiğini doğrudan gösterir. */
  const KURAL = JSON.stringify({ hepsi: [{ alan: 'blackStart', islec: '=', deger: true }] });

  it('çakışmada PROFİL kazanır', () => {
    const s = kuralDegerlendir(KURAL, [oz('blackStart', null, 'hayir')], { blackStart: true });
    expect(s.uygulanabilir, 'öznitelik profil alanını ezdi ve kapsam kararı değişti')
      .toBe(true);
  });

  it('çakışma SESSİZ değil — gerekçede adıyla geçer', () => {
    const s = kuralDegerlendir(KURAL, [oz('blackStart', null, 'hayir')], { blackStart: true });
    expect(s.gerekce).toContain('öznitelik yok sayıldı');
    expect(s.gerekce).toContain('blackStart');
    expect(s.gerekce).toContain('profil alanı');
  });

  it('TÜRETİLMİŞ alan da ezilemez', () => {
    const kural = JSON.stringify({
      hepsi: [{ alan: 'teiasScadaEmsSeriOlmayan', islec: '=', deger: false }] });
    const s = kuralDegerlendir(kural, [oz('teiasScadaEmsSeriOlmayan', 1)],
      { teiasScadaEms: true, seriHaberlesme: true });
    expect(s.uygulanabilir, 'türetilmiş alan öznitelikle ezildi').toBe(true);
    expect(s.gerekce).toContain('türetilmiş alan');
  });

  it('çakışmayan öznitelik bağlama GİRER — kapı fazla katı değil', () => {
    const kural = JSON.stringify({ hepsi: [{ alan: 'kuruluGucMw', islec: '>=', deger: 100 }] });
    const s = kuralDegerlendir(kural, [oz('kuruluGucMw', 165)], { blackStart: true });
    expect(s.uygulanabilir).toBe(true);
    expect(s.gerekce).not.toContain('öznitelik yok sayıldı');
  });

  it('değeri `null` olan öznitelik BİLİNMİYOR sayılır, `false` değil', () => {
    const kural = JSON.stringify({ hepsi: [{ alan: 'kuruluGucMw', islec: '>=', deger: 100 }] });
    const s = kuralDegerlendir(kural, [oz('kuruluGucMw')], {});
    expect(s.uygulanabilir).toBeNull();
  });
});

/* ═══ P2 · `olcek.mjs` eksik `await` ════════════════════════════════════
   `kapsamKur` asenkron; ölçek yolu await etmiyordu ve `satirlariCoz`
   bir Promise alıp `kapsam.yazabilir(...)` üzerinde atıyordu. Araç
   beyanla CI dışında olduğu için hiçbir kapı görmedi. */
describe('P2 · asenkron kapsam her çağrı yerinde bekleniyor', () => {
  it('`kapsamKur` çağrılarının hepsi `await` taşıyor', () => {
    const dosyalar = ['arac/olcek.mjs', 'lib/entegrasyon/varlikAktarim.ts'];
    const beklemeyenler: string[] = [];
    for (const d of dosyalar) {
      const kod = readFileSync(path.join(KOK, d), 'utf8');
      for (const satir of kod.split('\n')) {
        /* Tanım satırı değil, ÇAĞRI satırı aranıyor. */
        if (/\bfunction kapsamKur\b/.test(satir)) continue;
        if (!/\bkapsamKur\s*\(/.test(satir)) continue;
        if (!/await\s+(?:\w+\.)?kapsamKur\s*\(/.test(satir)) {
          beklemeyenler.push(`${d}: ${satir.trim()}`);
        }
      }
    }
    expect(beklemeyenler, '`kapsamKur` asenkrondur; `await`siz çağrı '
      + '`satirlariCoz`a Promise geçirir ve `kapsam.yazabilir` tanımsız olur')
      .toEqual([]);
  });
});

/* ═══ P2 · Disk temizliği başkasının dizinini siliyordu ═════════════════
   Anlık görüntü farkıyla silme, eşzamanlı koşumda B'nin CANLI dizinini
   A'ya "yeni" gösteriyordu. Ölçüt artık sahiplik: koşum kendi kökünü
   açar ve yalnız onu siler. */
describe('P2 · geçici dizin sahipliği', () => {
  it('koşum KENDİ kökünde çalışıyor', () => {
    const kok = os.tmpdir();
    expect(path.basename(kok), 'koşum kökü kurulmamış — `TMPDIR` devredilmedi; '
      + 'temizlik yine görüntü farkına düşer').toMatch(/^uyum-kosum-/);
  });

  it('testin açtığı geçici dizin KÖKÜN İÇİNDE doğuyor', () => {
    const d = mkdtempSync(path.join(os.tmpdir(), 'uyum-vaka-'));
    try {
      expect(path.dirname(d)).toBe(os.tmpdir());
      expect(path.basename(path.dirname(d))).toMatch(/^uyum-kosum-/);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});
