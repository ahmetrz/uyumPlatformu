import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sebepBayragi, tabanKarari, tabanOku, yazimKarari } from '../arac/olcum-tabani.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   ÖLÇÜM TABANI — cırcırın simetriği

   Kalite borcu cırcırı BORÇ için TAVAN tutar: sayı yukarı çıkamaz.
   Bu ölçü KAPSAM için TABAN tutar: sayı aşağı düşemez.

   ── Neden gerekti ─────────────────────────────────────────────────────
   ÖLÇÜLDÜ: disk dolunca test keşfi "158 dosya · 0 vaka" döndü ve sayım
   kapısı "taze · 0 vaka · gerçek keşifle DOĞRULANDI" diyerek YEŞİL
   yandı. O kapı yerinde düzeltildi; ama sınıf daha geniştir — sayı
   raporlayan her kapı sıfır ölçümle de `exit 0` verebiliyordu:

     yatay-tasma  0 ölçüm  → "0 kusur"
     erisim-axe   0 tarama → "ihlal 0"
     rota-duman   0 rota   → "kusurlu 0"

   Kusur sayısı sıfır OLABİLİR; ölçüm sayısı olamaz.
   ═══════════════════════════════════════════════════════════════════════ */

const TABANLAR = { 'a.olcum': 10 };

describe('ölçüm tabanı · karar', () => {
  it('taban karşılanınca GEÇER', () => {
    expect(tabanKarari('a.olcum', 10, TABANLAR)).toBeNull();
  });

  it('taban AŞILINCA da geçer — kapsamın büyümesi engellenmez', () => {
    /* Büyümeyi engellemek, kapsamı korumakla ilgisiz bir sürtünme
       olurdu: yeni rota, yeni bant, yeni betik hep kapsamı büyütür. */
    expect(tabanKarari('a.olcum', 500, TABANLAR)).toBeNull();
  });

  it('taban ALTINA düşünce KIRMIZI — bir eksik bile', () => {
    const m = tabanKarari('a.olcum', 9, TABANLAR);
    expect(m).toMatch(/ÖLÇÜM KAPSAMI DÜŞTÜ/);
    expect(m).toMatch(/9 < taban 10/);
    expect(m, 'çıkış yolu ADIYLA yazılmalı').toMatch(/--taban-yaz/);
  });

  it('SIFIR ölçüm — kapatılan kusurun ta kendisi', () => {
    expect(tabanKarari('a.olcum', 0, TABANLAR)).toMatch(/ÖLÇÜM KAPSAMI DÜŞTÜ/);
  });

  it('BEYANSIZ ölçü kırmızı — beyansız ölçü sıfıra düştüğünü söyleyemez', () => {
    /* Yeni bir sayı raporlayan kapı eklenip tabanı beyan edilmezse,
       o kapı ilk günden itibaren sıfır ölçümle geçebilirdi. */
    expect(tabanKarari('yeni.olcu', 5, TABANLAR)).toMatch(/TABANI BEYAN EDİLMEMİŞ/);
  });

  it('SAYI OLMAYAN ölçüm reddedilir — NaN bir ölçüm değildir', () => {
    expect(tabanKarari('a.olcum', Number.NaN, TABANLAR)).toMatch(/ÖLÇÜM GEÇERSİZ/);
    expect(tabanKarari('a.olcum', -1, TABANLAR)).toMatch(/ÖLÇÜM GEÇERSİZ/);
  });
});

const YOL = fileURLToPath(new URL('../arac/olcum-tabani.json', import.meta.url));

describe('ölçüm tabanı · dosya', () => {
  it('taban dosyası VAR ve okunur', () => {
    expect(existsSync(YOL)).toBe(true);
    expect(() => tabanOku(YOL)).not.toThrow();
  });

  it('OKUNAMAYAN taban SESSİZCE boşa düşmez, ADIYLA atar', () => {
    /* `?? {}` deseydik dosya silindiğinde bütün tabanlar yok olur ve her
       kapı "taban yok, geç" derdi — kapıyı susturmanın tek adımlık
       yolu. Aynı gerekçe `kalite-borcu.mjs`te de yazılı. */
    expect(() => tabanOku('/olmayan/olcum-tabani.json'))
      .toThrow(/ÖLÇÜM TABANI OKUNAMADI[\s\S]*olmayan\/olcum-tabani\.json/);
  });

  it('BEYAN EDİLEN her taban pozitif bir tam sayıdır', () => {
    /* Sıfır bir taban değildir: sıfır tabanlı bir ölçü, hiçbir şey
       ölçmediğinde de geçer — kapatılan kusurun kendisi. */
    const { tabanlar } = tabanOku(YOL);
    for (const [ad, deger] of Object.entries(tabanlar)) {
      expect(Number.isInteger(deger), `${ad} tam sayı değil`).toBe(true);
      expect(deger as number, `${ad} sıfır ya da negatif`).toBeGreaterThan(0);
    }
  });

  it('SAYI RAPORLAYAN her kapı tabanını BEYAN etmiş', () => {
    /* Kapsam elle yazılmıyor: `arac/*.mjs` içinde `tabanDogrula(` çağıran
       her dosya, çağırdığı anahtarı beyan etmiş olmalı. Yeni bir kapı
       eklenip tabanı unutulursa burası kırmızı yanar. */
    const ARAC = fileURLToPath(new URL('../arac', import.meta.url));
    const { tabanlar } = tabanOku(YOL);
    const eksik: string[] = [];
    for (const d of readdirSync(ARAC).filter((x) => x.endsWith('.mjs'))) {
      /* Yorumlar ayıklanır: `olcum-tabani.mjs`in KENDİ kullanım örneği
         bir kapı çağrısı değildir. Aynı ayıklama `kapi-farki` ve
         `tek-nusha` ölçülerinde de var — yorumdaki örnek kod, kod
         değildir. */
      const kaynak = readFileSync(path.join(ARAC, d), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      for (const m of kaynak.matchAll(/tabanDogrula\(\s*'([^']+)'/g)) {
        if (!(m[1] in tabanlar)) eksik.push(`${d} → ${m[1]}`);
      }
    }
    expect(eksik, `taban beyanı eksik: ${eksik.join(', ')}`).toEqual([]);
  });
});

/* ═══ TABAN YAZIMI GEREKÇE İSTER ═══════════════════════════════════════
   Kural: "taban yazımı ve tavan yükseltmesi gerekçe ister." Cırcır bir
   turda iki kez zayıflatıldı ve ikisi de elle yakalandı; üçüncüsü
   yakalanmayabilir. Yakalamayı insana bırakmak kapı değildir.

   Asimetri bilinçli: taban YÜKSELİRSE kimse korumasız kalmaz (kapsam
   büyüdü), DÜŞERSE kapı daha az şey ölçmeye başlar. Gerekçe yalnız
   düşüşte istenir ve DOSYAYA yazılır — commit mesajı dosyayı okuyanın
   önünde durmaz. */
describe('yazimKarari — taban düşüşü gerekçe ister', () => {
  const SEBEP = '/eski-rota silindi; kapsamdan bir rota düştü, bant sayısı aynı.';

  it('DÜŞÜŞ gerekçesizse reddedilir', () => {
    const k = yazimKarari('duman.rota', 50, 58, '');
    expect(k).toMatch(/TABAN DÜŞÜŞÜ GEREKÇESİZ/);
    expect(k).toContain('58 → 50');
  });

  it('DÜŞÜŞ gerekçeliyse geçer', () => {
    expect(yazimKarari('duman.rota', 50, 58, SEBEP)).toBeNull();
  });

  it('bir cümle bile olmayan gerekçe gerekçe sayılmaz', () => {
    expect(yazimKarari('duman.rota', 50, 58, 'azaldı')).toMatch(/GEREKÇESİZ/);
  });

  it('YÜKSELİŞ gerekçe istemez — kapsamın büyümesi engellenmez', () => {
    expect(yazimKarari('duman.rota', 70, 58, '')).toBeNull();
  });

  it('EŞİT kalmak da gerekçe istemez', () => {
    expect(yazimKarari('duman.rota', 58, 58, '')).toBeNull();
  });

  it('İLK yazım gerekçe istemez — karşılaştırılacak önceki yok', () => {
    expect(yazimKarari('yeni.olcu', 12, undefined, '')).toBeNull();
  });

  it('sayı olmayan ölçüm hiçbir gerekçeyle yazılamaz', () => {
    expect(yazimKarari('duman.rota', Number.NaN, 58, SEBEP)).toMatch(/ÖLÇÜM GEÇERSİZ/);
  });
});

describe('sebepBayragi — tek ayrıştırma', () => {
  it('`--sebep=...` biçimini okur', () => {
    expect(sebepBayragi(['--taban-yaz', '--sebep=rota silindi'])).toBe('rota silindi');
  });

  it('`--sebep ...` biçimini de okur', () => {
    expect(sebepBayragi(['--sebep', 'rota silindi'])).toBe('rota silindi');
  });

  it('bayrak yoksa boş döner — "yok" ile "boş" ayrışmaz, ikisi de gerekçesizdir', () => {
    expect(sebepBayragi(['--taban-yaz'])).toBe('');
  });

  it('değer verilmemiş `--sebep` boş döner, çökmez', () => {
    expect(sebepBayragi(['--sebep'])).toBe('');
  });
});

describe('taban yazan her kapı gerekçeyi GEÇİRİYOR', () => {
  /* İkinci nüsha değil, ATLAMA aranıyor: bir kapı `sebepBayragi`yi
     çağırmayı unutursa gerekçe zorunluluğu o kapıda sessizce kalkar —
     kullanıcı `--sebep` yazar, kapı okumaz, düşüş gerekçesiz geçer. */
  const kapilar = readdirSync(path.resolve(__dirname, '../arac'))
    .filter((a) => a.endsWith('.mjs'))
    .map((a) => ({ ad: a, kod: readFileSync(path.resolve(__dirname, '../arac', a), 'utf8') }))
    /* `olcum-tabani.mjs` TANIMLAYAN modüldür, çağıran değil: tek nüshanın
       kendisi taranırsa kendi imzasıyla eşleşir ve listeyi kirletir. */
    .filter((x) => x.ad !== 'olcum-tabani.mjs' && /\btabanYaz\(/.test(x.kod));

  it('taban yazan kapı bulundu (tarama boş değil)', () => {
    expect(kapilar.map((k) => k.ad).sort()).toEqual(
      ['erisim-axe.mjs', 'gezinme-testi.mjs', 'rota-duman.mjs', 'yatay-tasma.mjs']);
  });

  it('her biri `sebep` geçiriyor', () => {
    const atlayan = kapilar
      /* `s` bayrağı yerine `[^)]`: çağrı tek satırda da çok satırda da
         aynı kalıba uyar ve derleme hedefi es2017'de de geçerlidir. */
      .filter((k) => !/tabanYaz\([^)]*sebep[\s\S]*?:/.test(k.kod))
      .map((k) => k.ad);
    expect(atlayan, 'Bu kapı `tabanYaz`a gerekçe geçirmiyor: `--sebep` yazılsa '
      + 'bile okunmaz ve düşüş gerekçesiz geçer.')
      .toEqual([]);
  });
});
