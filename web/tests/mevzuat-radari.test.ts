import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Getirme } from '@/lib/mevzuat/radar';

/* ═══════════════════════════════════════════════════════════════════════
   R1 · MEVZUAT RADARI — SAF KARARLAR VE ZİNCİRİN KENDİSİ [MEV-RAD-001]

   ── AĞ YOK ────────────────────────────────────────────────────────────
   `getir` dışarıdan verilir ve SAHTE bir kaynağı temsil eder. Fikstürler
   EL YAPIMIDIR: hiçbir gerçek sayfadan kopyalanmadı, adresler kurgusal
   (`ornek` alan adı, RFC 2606'nın ayırdığı alan). Ağa çıkan bir test bu
   depoda KIRMIZIDIR ve bunu `tests/bekci/radar-agsiz.test.ts` ölçer.

   ── NEDEN ZİNCİR ÖLÇÜLÜR ──────────────────────────────────────────────
   R-F'in doğduğu kusur: parçalar tek tek doğru, bağ yok. Burada saf
   kararlar ayrı ayrı sınanır AMA asıl iddia zincirde ölçülür — motor
   engelli kaynağa istek göndermiyor mu, "karşılaştırılamadı" gerçekten
   NULL mu yazılıyor, aynı kayıt ikinci koşuda yeniden aday oluyor mu.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-radar-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { mevzuatRadariniKos, robotsAdresi } = await import('@/lib/uyum/mevzuatRadariKosumu');
const {
  AJAN, FARK_SOZU, farkSozu, getirmeKarari, kotaVar, robotsAyristir, robotsIzni, yeniGirisler,
} = await import('@/lib/mevzuat/radar');
const { listeAyristir, rssAyristir } = await import('@/lib/mevzuat/ayristir');

/* ── EL YAPIMI FİKSTÜRLER ──────────────────────────────────────────────
   Üçü de bu dosyada yazıldı; hiçbiri bir kamu sayfasından alınmadı. */

const ROBOTS_ACIK = [
  'User-agent: *',
  'Disallow: /ozel/',
  'Allow: /duyuru/',
].join('\n');

const ROBOTS_KAPALI = [
  'User-agent: *',
  'Disallow: /',
].join('\n');

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Kurgusal Düzenleyici · duyurular</title>
  <item>
    <title>Kurgusal tebliğ değişikliği — birinci</title>
    <link>https://kurgusal-merci.ornek/duyuru/1</link>
    <pubDate>Mon, 01 Sep 2026 09:00:00 +0000</pubDate>
    <description>Kurgusal özet metni.</description>
  </item>
  <item>
    <title>Kurgusal tebliğ değişikliği — ikinci</title>
    <link>https://kurgusal-merci.ornek/duyuru/2</link>
    <pubDate>Tue, 02 Sep 2026 09:00:00 +0000</pubDate>
  </item>
</channel></rss>`;

const damga = Date.now();
const SIMDI = Date.UTC(2026, 8, 10, 12, 0, 0);
const KANAL = 'https://kurgusal-merci.ornek/duyuru/besleme.xml';

let acikId = '';
let engelliId = '';
let kapaliId = '';

/** İstenen her adresi KAYDEDEN sahte kaynak. */
function sahteKaynak(cevaplar: Record<string, Getirme>) {
  const istenenler: string[] = [];
  return {
    istenenler,
    getir: async (url: string): Promise<Getirme> => {
      istenenler.push(url);
      return cevaplar[url] ?? { ok: false, httpKodu: 404, hata: 'yok' };
    },
  };
}

beforeAll(async () => {
  /* Fikstürdeki kaynaklar bu turu etkilemesin. */
  await db.mevzuatKaynagi.updateMany({ data: { etkin: false } });

  acikId = (await db.mevzuatKaynagi.create({
    data: {
      kod: `MEV-ACIK-${damga}`, ad: 'Kurgusal Düzenleyici · duyurular',
      yayinKanali: KANAL, tur: 'rss', merci: 'Kurgusal Düzenleyici',
      etkin: true,
    },
  })).id;
  engelliId = (await db.mevzuatKaynagi.create({
    data: {
      kod: `MEV-ENGELLI-${damga}`, ad: 'Kurgusal engelli kaynak',
      yayinKanali: 'https://kapali-merci.ornek/liste', tur: 'liste',
      etkin: true, durum: 'engelli',
      durumNotu: 'Kaynak otomatik erişime kapalı.',
    },
  })).id;
  kapaliId = (await db.mevzuatKaynagi.create({
    data: {
      kod: `MEV-KAPALI-${damga}`, ad: 'Kurgusal etkin OLMAYAN kaynak',
      yayinKanali: 'https://etkinsiz.ornek/liste', tur: 'liste', etkin: false,
    },
  })).id;
});

afterAll(async () => {
  await rm(dizin, { recursive: true, force: true });
  expect(existsSync(dizin), 'geçici veritabanı dizini silinmedi').toBe(false);
});

describe('MOTOR SARMALAYICISI [MEV-RAD-001]', () => {
  it('etkin kaynak yoksa `mevzuatRadariniIsle` ağa HİÇ çıkmaz [MEV-RAD-001]', async () => {
    /* Motorun kendisi ölçülür (`mevzuatRadari.mevzuatRadariniIsle`):
       taraması açık kaynak yoksa hiçbir istek gönderilmez ve sayaçlar
       sıfır döner. "Sıfır kaynak" bir hata değildir — kurulum henüz
       hiçbir kanalı izlemeye karar vermemiştir. */
    const { mevzuatRadariniIsle } = await import('@/lib/motorlar/mevzuatRadari');
    await db.mevzuatKaynagi.updateMany({ data: { etkin: false } });
    const s = await mevzuatRadariniIsle();
    expect(s.islenen).toBe(0);
    expect(s.uretilen).toBe(0);
    expect(s.ayrinti.taranan).toBe(0);
    await db.mevzuatKaynagi.updateMany({
      where: { kod: { in: [`MEV-ACIK-${damga}`, `MEV-ENGELLI-${damga}`] } },
      data: { etkin: true },
    });
  });

  it('`getirmeyiYap` FIRLATMAZ — hatayı DÖNDÜRÜR [MEV-RAD-001]', async () => {
    /* Sarmalayıcı fırlatsaydı tek bozuk kaynak bütün koşuyu düşürürdü
       ve öbür kaynaklar sessizce taranmamış kalırdı. Adres geçersizdir:
       ağ trafiği YOKTUR, `fetch` daha adresi çözerken düşer. */
    const { getirmeyiYap } = await import('@/lib/motorlar/mevzuatRadari');
    const y = await getirmeyiYap('bu bir adres degil');
    expect(y.ok).toBe(false);
    if (!y.ok) {
      expect(y.httpKodu).toBeNull();
      expect(y.hata.length).toBeGreaterThan(0);
    }
  });
});

describe('SAF · robots.txt [MEV-RAD-001]', () => {
  it('kapalı yol REDDEDİLİR, açık yol geçer [MEV-RAD-001]', () => {
    expect(robotsIzni(ROBOTS_ACIK, '/duyuru/besleme.xml').izin).toBe(true);
    const r = robotsIzni(ROBOTS_ACIK, '/ozel/liste');
    expect(r.izin).toBe(false);
    if (!r.izin) expect(r.sebep).toContain('robots.txt');
  });

  it('EN UZUN kural kazanır — Allow, kapsayan Disallow\'u yener [MEV-RAD-001]', () => {
    const metin = 'User-agent: *\nDisallow: /\nAllow: /duyuru/';
    expect(robotsIzni(metin, '/duyuru/x').izin).toBe(true);
    expect(robotsIzni(metin, '/baska').izin).toBe(false);
  });

  it('BİZE ÖZEL grup varsa yıldız grubu uygulanmaz [MEV-RAD-001]', () => {
    const metin = `User-agent: *\nDisallow: /\n\nUser-agent: ${AJAN}\nAllow: /`;
    expect(robotsIzni(metin, '/duyuru').izin).toBe(true);
    expect(robotsAyristir(metin, 'BaskaAjan')).toEqual([{ izin: false, yol: '/' }]);
  });

  it('BOŞ robots.txt izin verir — kural yoksa yasak da yok [MEV-RAD-001]', () => {
    expect(robotsIzni('', '/duyuru').izin).toBe(true);
  });
});

describe('SAF · kota ve üç değerli sonuç [MEV-RAD-001]', () => {
  it('kaynak başına GÜNDE BİR istek [MEV-RAD-001]', () => {
    expect(kotaVar(null, SIMDI)).toBe(true);
    expect(kotaVar(new Date(SIMDI - 3_600_000), SIMDI)).toBe(false);
    expect(kotaVar(new Date(SIMDI - 25 * 3_600_000), SIMDI)).toBe(true);
  });

  it('ANTI-BOT yanıtı ENGELLİ yazar, atlatmaz [MEV-RAD-001]', () => {
    for (const kod of [401, 403, 418, 429]) {
      const k = getirmeKarari({ ok: false, httpKodu: kod, hata: 'red' });
      expect(k?.durum).toBe('engelli');
      expect(k?.farkVar).toBeNull();
      expect(k?.durumNotu).toContain('aşmaz');
    }
  });

  it('BİLİNMEYEN "fark yok" DEĞİLDİR — cümlesi ayrıdır [MEV-RAD-001]', () => {
    expect(farkSozu(null)).toBe(FARK_SOZU.bilinmiyor);
    expect(farkSozu(false)).toBe(FARK_SOZU.yok);
    expect(farkSozu(true)).toBe(FARK_SOZU.var);
    expect(farkSozu(null)).not.toBe(farkSozu(false));
  });

  it('aynı URL ikinci kez aday OLMAZ [MEV-RAD-001]', () => {
    const g = [
      { url: 'https://a.ornek/1', baslik: 'A', yayinTarihi: null, ozet: null },
      { url: 'https://a.ornek/2', baslik: 'B', yayinTarihi: null, ozet: null },
    ];
    expect(yeniGirisler(g, ['https://a.ornek/1']).map((x) => x.url))
      .toEqual(['https://a.ornek/2']);
    /* Aynı koşuda tekrarlanan giriş de bir kez sayılır. */
    expect(yeniGirisler([...g, g[0]], []).length).toBe(2);
  });
});

describe('SAF · ayrıştırma [MEV-RAD-001]', () => {
  it('RSS okunur; özet KISALTILIR [MEV-RAD-001]', () => {
    const a = rssAyristir(RSS);
    expect(a.tanindi).toBe(true);
    expect(a.girisler.map((g) => g.url))
      .toEqual(['https://kurgusal-merci.ornek/duyuru/1', 'https://kurgusal-merci.ornek/duyuru/2']);
    expect(a.girisler[0].yayinTarihi).toBeInstanceOf(Date);
    expect(a.girisler[1].ozet).toBeNull();
  });

  it('TANINMAYAN biçim "boş" değil BİLİNMİYOR döner [MEV-RAD-001]', () => {
    /* Kusurun kendisi: biçim değişince radar sessizce körleşirdi. */
    const a = rssAyristir('<html><body>Sayfa taşındı</body></html>');
    expect(a.tanindi).toBe(false);
    expect(a.girisler).toEqual([]);
    expect(a.sebep).toBeTruthy();
  });

  it('liste bağları GÖRECELİ adresle de çözülür [MEV-RAD-001]', () => {
    const a = listeAyristir(
      '<a href="/duyuru/9">Kurgusal duyuru başlığı</a><a href="#x">kısa</a>',
      'https://kurgusal-merci.ornek/liste',
    );
    expect(a.girisler.map((g) => g.url)).toEqual(['https://kurgusal-merci.ornek/duyuru/9']);
  });
});

describe('ZİNCİR · motor önerir, değiştirmez [MEV-RAD-001]', () => {
  it('AÇIK kaynak taranır ve adaylar AÇILIR [MEV-RAD-001]', async () => {
    const s = sahteKaynak({
      'https://kurgusal-merci.ornek/robots.txt': { ok: true, httpKodu: 200, govde: ROBOTS_ACIK },
      [KANAL]: { ok: true, httpKodu: 200, govde: RSS },
    });
    const kosu = await mevzuatRadariniKos(db, { getir: s.getir, simdiMs: SIMDI });
    expect(kosu.taranan).toBe(1);
    expect(kosu.acilanAday).toBe(2);
    const adaylar = await db.mevzuatDegisiklikAdayi.findMany({ where: { kaynakId: acikId } });
    expect(adaylar.length).toBe(2);
    expect(adaylar.every((a) => a.durum === 'yeni')).toBe(true);
  });

  it('ROBOTS.TXT kaynağın KENDİSİNDEN ÖNCE istenir [MEV-RAD-001]', async () => {
    /* Sıra tersine dönerse ürün, izin vermeyen bir kaynağa en az bir kez
       istek göndermiş olur ve kural kâğıt üstünde kalır. */
    await db.mevzuatKaynagi.update({ where: { id: acikId }, data: { sonTarama: null } });
    const s = sahteKaynak({
      'https://kurgusal-merci.ornek/robots.txt': { ok: true, httpKodu: 200, govde: ROBOTS_ACIK },
      [KANAL]: { ok: true, httpKodu: 200, govde: RSS },
    });
    await mevzuatRadariniKos(db, { getir: s.getir, simdiMs: SIMDI + 1 });
    expect(s.istenenler[0]).toBe(robotsAdresi(KANAL));
    expect(s.istenenler[1]).toBe(KANAL);
  });

  it('ikinci koşu AYNI adayları yeniden AÇMAZ [MEV-RAD-001]', async () => {
    await db.mevzuatKaynagi.update({ where: { id: acikId }, data: { sonTarama: null } });
    const s = sahteKaynak({
      'https://kurgusal-merci.ornek/robots.txt': { ok: true, httpKodu: 200, govde: ROBOTS_ACIK },
      [KANAL]: { ok: true, httpKodu: 200, govde: RSS },
    });
    const kosu = await mevzuatRadariniKos(db, { getir: s.getir, simdiMs: SIMDI + 2 });
    expect(kosu.acilanAday).toBe(0);
    expect(await db.mevzuatDegisiklikAdayi.count({ where: { kaynakId: acikId } })).toBe(2);
    /* Yeni bir şey yoksa `farkVar` FALSE — "bilinmiyor" değil. */
    const son = await db.mevzuatTaramasi.findFirstOrThrow({
      where: { kaynakId: acikId }, orderBy: { zaman: 'desc' },
    });
    expect(son.farkVar).toBe(false);
  });

  it('ENGELLİ kaynağa HİÇ İSTEK gönderilmez [MEV-RAD-001]', async () => {
    const s = sahteKaynak({});
    await mevzuatRadariniKos(db, { getir: s.getir, simdiMs: SIMDI + 3 });
    expect(s.istenenler.some((u) => u.includes('kapali-merci.ornek'))).toBe(false);
    expect(await db.mevzuatTaramasi.count({ where: { kaynakId: engelliId } })).toBe(0);
  });

  it('ETKİN OLMAYAN kaynağa da HİÇ İSTEK gönderilmez [MEV-RAD-001]', async () => {
    const s = sahteKaynak({});
    await mevzuatRadariniKos(db, { getir: s.getir, simdiMs: SIMDI + 4 });
    expect(s.istenenler.some((u) => u.includes('etkinsiz.ornek'))).toBe(false);
    expect(await db.mevzuatTaramasi.count({ where: { kaynakId: kapaliId } })).toBe(0);
  });

  it('KOTA dolduysa aynı gün İKİNCİ istek gitmez [MEV-RAD-001]', async () => {
    const s = sahteKaynak({
      'https://kurgusal-merci.ornek/robots.txt': { ok: true, httpKodu: 200, govde: ROBOTS_ACIK },
      [KANAL]: { ok: true, httpKodu: 200, govde: RSS },
    });
    const kosu = await mevzuatRadariniKos(db, { getir: s.getir, simdiMs: SIMDI + 5 });
    expect(kosu.kotaBekleyen).toBe(1);
    expect(s.istenenler).toEqual([]);
  });

  it('robots.txt KAPATIRSA kaynak ENGELLİ olur ve sayfaya gidilmez [MEV-RAD-001]', async () => {
    await db.mevzuatKaynagi.update({
      where: { id: acikId }, data: { sonTarama: null, durum: 'hazir' },
    });
    const s = sahteKaynak({
      'https://kurgusal-merci.ornek/robots.txt': { ok: true, httpKodu: 200, govde: ROBOTS_KAPALI },
      [KANAL]: { ok: true, httpKodu: 200, govde: RSS },
    });
    await mevzuatRadariniKos(db, { getir: s.getir, simdiMs: SIMDI + 6 });
    expect(s.istenenler).toEqual([robotsAdresi(KANAL)]);
    const k = await db.mevzuatKaynagi.findUniqueOrThrow({ where: { id: acikId } });
    expect(k.durum).toBe('engelli');
    expect(k.durumNotu).toContain('aşmaz');
    const son = await db.mevzuatTaramasi.findFirstOrThrow({
      where: { kaynakId: acikId }, orderBy: { zaman: 'desc' },
    });
    expect(son.farkVar).toBeNull();
  });

  it('MOTOR `etkin` alanına DOKUNMAZ [MEV-RAD-001]', async () => {
    /* Engelli hâle düşen bir kaynağı motor kendi kapatamaz: taramayı
       açmak da kapatmak da insan kararıdır. */
    const k = await db.mevzuatKaynagi.findUniqueOrThrow({ where: { id: acikId } });
    expect(k.etkin).toBe(true);
  });

  it('BİÇİM tanınmazsa farkVar NULL ve sebep YAZILI [MEV-RAD-001]', async () => {
    await db.mevzuatKaynagi.update({
      where: { id: acikId }, data: { sonTarama: null, durum: 'hazir' },
    });
    const s = sahteKaynak({
      'https://kurgusal-merci.ornek/robots.txt': { ok: true, httpKodu: 200, govde: ROBOTS_ACIK },
      [KANAL]: { ok: true, httpKodu: 200, govde: '<html>taşındı</html>' },
    });
    const kosu = await mevzuatRadariniKos(db, { getir: s.getir, simdiMs: SIMDI + 7 });
    expect(kosu.bilinmeyen).toBe(1);
    const son = await db.mevzuatTaramasi.findFirstOrThrow({
      where: { kaynakId: acikId }, orderBy: { zaman: 'desc' },
    });
    expect(son.farkVar).toBeNull();
    expect(son.sebep).toContain('biçim okunamadı');
  });

  it('MOTOR aday DURUMUNU yazmaz — hepsi "yeni" kalır [MEV-RAD-001]', async () => {
    const durumlar = await db.mevzuatDegisiklikAdayi.findMany({
      where: { kaynakId: acikId }, select: { durum: true, kararVerenId: true },
    });
    expect(durumlar.every((d) => d.durum === 'yeni' && d.kararVerenId === null)).toBe(true);
  });
});
