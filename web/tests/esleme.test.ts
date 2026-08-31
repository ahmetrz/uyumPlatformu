import { z } from 'zod';
import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-esleme-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const {
  eslemeUygula, gozlemeUygula, kurallariDogrula, kurallariCoz,
  profilYayinla, profilSurumleri, profilSurumu, connectorProfili, donusumUygula,
} = await import('@/lib/entegrasyon/esleme');
const { senkronizasyonKos } = await import('@/lib/entegrasyon/cekirdek');
const { adaptorKaydet } = await import('@/lib/entegrasyon/kayit');
const { temelDogrula } = await import('@/lib/entegrasyon/sozlesme');
import type { EslemeKurali } from '@/lib/entegrasyon/esleme';
import type {
  Adaptor, AdaptorBaglami as Baglam, CekmeSonucu, Gozlem,
} from '@/lib/entegrasyon/sozlesme';

/* Eşleme tezgâhı (§7) — sürümleme, varsayılan/ölçüm ayrımı, güven, red kaydı.

   Bu dosya hiçbir dış sisteme bağlanmaz: girdisi elle yazılmış ham
   kayıtlardır, çıktısı platform alanlarıdır. */

/* Kuralları elle yazmak için gevşek kapı: doğrulamanın bilinmeyen hedefi
   yakaladığını da sınayabilmek için tip zorlaması burada bilinçli gevşetilir. */
function kural(o: Record<string, unknown>): EslemeKurali {
  return o as unknown as EslemeKurali;
}

function gozlem(id: string, kaynak: string, ham: Record<string, unknown>): Gozlem {
  return {
    tip: 'varlik',
    koken: { kaynakSistem: kaynak, kaynakKayitId: id, toplanma: new Date(), guven: null },
    etiket: `HAM-${id}`,
    ham,
  } as Gozlem;
}

function adaptorYap(tip: string, cek: (b: Baglam) => Promise<CekmeSonucu>): Adaptor {
  const a: Adaptor = {
    tip,
    baglanabilir: true,
    yapilandirmaSemasi: z.looseObject({}),
    gerekenSirlar: [],
    async testConnection() { return { ok: true, ayrinti: 'eşleme fikstürü' }; },
    async discover() { return { ozet: 'eşleme fikstürü', tahminiKayit: null }; },
    fetchChanges: cek,
    normalize: () => [],
    validate: (g) => temelDogrula(g),
    async health() { return { durum: 'saglikli', ayrinti: 'eşleme fikstürü', tazelikDk: null }; },
  } as Adaptor;
  adaptorKaydet(a, true);
  return a;
}

let sayac = 0;
async function connectorYap(tip: string) {
  sayac++;
  return db.connector.create({ data: {
    kod: `ESL-CON-${sayac}-${Date.now()}`,
    ad: `Eşleme connector ${sayac}`,
    tip,
    kaynakSistem: `ESL-SISTEM-${sayac}`,
    etkin: true,
    durum: 'etkin',
  } });
}

describe('Eşleme tezgâhı (§7)', () => {
  beforeAll(async () => {
    await db.eslemeProfili.deleteMany({ where: { kod: { startsWith: 'TEST-' } } });
  });

  /* ═══ Saf motor ═════════════════════════════════════════════════════ */

  it('VARSAYILAN BİR ÖLÇÜM DEĞİLDİR: kaynağın verdiği alan ile varsayılan ayırt edilir', () => {
    const kurallar = [
      kural({ kaynakAlan: 'serial', hedefAlan: 'seriNo', donusum: 'buyukHarf',
        guvenKurali: { agirlik: 0.9 } }),
      kural({ kaynakAlan: 'zone', hedefAlan: 'bolgeKodu', varsayilan: 'OT-SEVIYE-2',
        guvenKurali: { agirlik: 0.5 } }),
      kural({ kaynakAlan: 'tag', hedefAlan: 'etiket' }),
    ];
    const s = eslemeUygula(kurallar, { serial: 'ab-123', tag: 'PLC-01' });

    expect(s.alanlar.seriNo.kaynagi).toBe('kaynak');
    expect(s.alanlar.seriNo.deger).toBe('AB-123');
    expect(s.alanlar.bolgeKodu.kaynagi).toBe('varsayilan');
    expect(s.alanlar.bolgeKodu.deger).toBe('OT-SEVIYE-2');
    expect(s.alanlar.bolgeKodu.not).toContain('ölçüm değil');
    expect(s.ozel.bolgeKodu).toBe('OT-SEVIYE-2');

    /* Güven YALNIZ kaynaktan gelen alandan hesaplanır: bolgeKodu
       varsayılanla doldu, katkı vermez. 0.9 tek katkı → 0.9. */
    expect(s.guven).toBe(0.9);
    expect(s.reddedildi).toBe(false);
  });

  it('güven ÖLÇÜLEMİYORSA null döner — sıfır DEĞİL', () => {
    // (a) hiç güven kuralı yok → ölçüm yapılmadı
    const a = eslemeUygula([kural({ kaynakAlan: 'tag', hedefAlan: 'etiket' })], { tag: 'X' });
    expect(a.guven).toBeNull();

    // (b) güven kuralı var ama hiçbiri kaynaktan dolmadı → yine ölçülemedi
    const b = eslemeUygula(
      [kural({ kaynakAlan: 'serial', hedefAlan: 'seriNo', guvenKurali: { agirlik: 0.9 } })],
      { baska: 'değer' },
    );
    expect(b.guven).toBeNull();
    expect(b.guven).not.toBe(0);
    expect(b.alanlar.seriNo.kaynagi).toBe('yok');

    // (c) iki alan doldu → gürültülü-VEYA, 0–1 arası
    const c = eslemeUygula([
      kural({ kaynakAlan: 'serial', hedefAlan: 'seriNo', guvenKurali: { agirlik: 0.9 } }),
      kural({ kaynakAlan: 'host', hedefAlan: 'hostname', guvenKurali: { agirlik: 0.45 } }),
    ], { serial: 'S1', host: 'h1' });
    expect(c.guven).toBeGreaterThan(0.9);
    expect(c.guven).toBeLessThanOrEqual(0.99);
  });

  it('eksik cezası güveni düşürür ama sıfırlamaz', () => {
    const kurallar = [
      kural({ kaynakAlan: 'serial', hedefAlan: 'seriNo', guvenKurali: { agirlik: 0.8 } }),
      kural({ kaynakAlan: 'host', hedefAlan: 'hostname', guvenKurali: { agirlik: 0.4, eksikCezasi: 0.5 } }),
    ];
    const tam = eslemeUygula(kurallar, { serial: 'S1', host: 'h1' });
    const eksik = eslemeUygula(kurallar, { serial: 'S1' });
    expect(eksik.guven).not.toBeNull();
    expect(eksik.guven!).toBeLessThan(tam.guven!);
    expect(eksik.guven!).toBeGreaterThan(0);
  });

  it('TANINMAYAN ENUM SESSİZ DÜŞMEZ: sorun `asama: esleme` ile raporlanır', () => {
    const kurallar = [
      kural({ kaynakAlan: 'tag', hedefAlan: 'etiket' }),
      kural({ kaynakAlan: 'type', hedefAlan: 'turKodu', enumEsleme: { PLC: 'plc', RTU: 'rtu' } }),
    ];
    const s = eslemeUygula(kurallar, { tag: 'A-1', type: 'HMI-PANEL' });

    expect(s.sorunlar.length).toBe(1);
    expect(s.sorunlar[0].asama).toBe('esleme');
    expect(s.sorunlar[0].etki).toBe('alan');            // zorunlu değil → kayıt düşmez
    expect(s.sorunlar[0].sebep).toContain('enum karşılığı yok');
    expect(s.reddedildi).toBe(false);
    // Alan BİLİNMİYOR kaldı — uydurma değer yazılmadı.
    expect(s.alanlar.turKodu.deger).toBeNull();
    expect(s.alanlar.turKodu.kaynagi).toBe('yok');
    expect(s.ozel.turKodu).toBeNull();

    // Aynı kural ZORUNLU olsaydı kaydın tümü düşerdi.
    const zorunlu = eslemeUygula([
      kural({ kaynakAlan: 'tag', hedefAlan: 'etiket' }),
      kural({ kaynakAlan: 'type', hedefAlan: 'turKodu', zorunlu: true,
        enumEsleme: { PLC: 'plc' } }),
    ], { tag: 'A-1', type: 'HMI-PANEL' });
    expect(zorunlu.reddedildi).toBe(true);
    expect(zorunlu.sorunlar[0].etki).toBe('kayit');
  });

  it('kapalı liste (sözlük) alanı sessizce genişletilmez', () => {
    const s = eslemeUygula(
      [kural({ kaynakAlan: 'crit', hedefAlan: 'kritiklik' })],
      { crit: 'FELAKET' },
    );
    expect(s.sorunlar[0].sebep).toContain('sözlüğünde yok');
    expect(s.alanlar.kritiklik.deger).toBeNull();

    const gecerli = eslemeUygula(
      [kural({ kaynakAlan: 'crit', hedefAlan: 'kritiklik' })],
      { crit: 'Kritik' },
    );
    expect(gecerli.sorunlar).toEqual([]);
    expect(gecerli.alanlar.kritiklik.deger).toBe('kritik');
  });

  it('dönüşümler: tanınmayan değer 0/false olmaz, SEBEP döner', () => {
    expect(donusumUygula('00-11-22-33-44-55', 'mac')).toEqual({ ok: true, deger: '00:11:22:33:44:55' });
    expect(donusumUygula('1.234,5', 'sayi')).toEqual({ ok: true, deger: 1234.5 });
    expect(donusumUygula('evet', 'mantik')).toEqual({ ok: true, deger: true });
    const belirsiz = donusumUygula('belki', 'mantik');
    expect(belirsiz.ok).toBe(false);
    expect(donusumUygula('abc', 'sayi').ok).toBe(false);   // sessizce 0 DEĞİL
    expect(donusumUygula('10.0.0.300', 'ip').ok).toBe(false);
  });

  it('nokta gösterimi ve normalize başlık eşleşmesi', () => {
    const s = eslemeUygula([
      kural({ kaynakAlan: 'device.serial', hedefAlan: 'seriNo' }),
      kural({ kaynakAlan: 'Seri Numarası', hedefAlan: 'etiket' }),
    ], { device: { serial: 'S-9' }, seriNumarasi: 'E-9' });
    expect(s.alanlar.seriNo.deger).toBe('S-9');
    expect(s.alanlar.etiket.deger).toBe('E-9');
  });

  it('kural doğrulama: bilinmeyen hedef, çift kural, zorunlu+varsayılan çelişkisi yakalanır', () => {
    const sorunlar = kurallariDogrula([
      kural({ kaynakAlan: 'a', hedefAlan: 'yokBoyleAlan' }),
      kural({ kaynakAlan: 'b', hedefAlan: 'etiket' }),
      kural({ kaynakAlan: 'c', hedefAlan: 'etiket' }),
      kural({ kaynakAlan: 'd', hedefAlan: 'hostname', zorunlu: true, varsayilan: 'x' }),
    ]);
    expect(sorunlar.join(' · ')).toContain('bilinmeyen hedef alan');
    expect(sorunlar.join(' · ')).toContain('2 kural yazılmış');
    expect(sorunlar.join(' · ')).toContain('varsayılan zorunluluğu susturur');
    expect(() => kurallariCoz('{bozuk')).toThrow(/okunamadı/);
  });

  /* ═══ Sürümleme ═════════════════════════════════════════════════════ */

  it('SÜRÜMLÜ: yeni sürüm eskisini EZMEZ — yeni satır açılır, eski arşive geçer', async () => {
    const kod = 'TEST-SURUM';
    const v1 = await profilYayinla({
      kod, ad: 'Sürüm 1', connectorTipi: 'test_surum',
      kurallar: [kural({ kaynakAlan: 'serial', hedefAlan: 'seriNo' })],
    });
    const v2 = await profilYayinla({
      kod, ad: 'Sürüm 2', connectorTipi: 'test_surum',
      kurallar: [kural({ kaynakAlan: 'sn', hedefAlan: 'seriNo', donusum: 'buyukHarf' })],
    });

    expect(v1.surum).toBe(1);
    expect(v2.surum).toBe(2);
    expect(v1.id).not.toBe(v2.id);

    const surumler = await profilSurumleri(kod);
    expect(surumler.map((p) => p.surum)).toEqual([2, 1]);
    expect(surumler.find((p) => p.surum === 1)!.durum).toBe('arsiv');
    expect(surumler.find((p) => p.surum === 2)!.durum).toBe('etkin');

    // Eski sürümün KURALI hâlâ okunabilir — ezilmedi.
    const eski = await profilSurumu(kod, 1);
    expect(eski!.kurallar[0].kaynakAlan).toBe('serial');
    expect(eski!.kurallar[0].donusum).toBeUndefined();

    // Etkin profil seçimi en yüksek etkin sürümü verir.
    const etkin = await connectorProfili({ tip: 'test_surum' });
    expect(etkin!.surum).toBe(2);
  });

  /* ═══ Çekirdek ile bütünleşme ═══════════════════════════════════════ */

  it('EŞLEME DEĞİŞİNCE ESKİ İÇE AKTARIM GEÇMİŞİ BOZULMAZ', async () => {
    const kaynak = 'TEST-ESLEME-GECMIS';
    const tip = 'test_esleme_gecmis';
    let kayitlar: Gozlem[] = [
      gozlem('e1', kaynak, { tag: 'ESL-0001', serial: 'sn-1' }),
    ];
    adaptorYap(tip, async () => ({ gozlemler: kayitlar, yeniImlec: null, devamVar: false }));
    const c = await connectorYap(tip);

    // v1: etiket 'tag' alanından gelir
    await profilYayinla({
      kod: 'TEST-GECMIS', ad: 'v1', connectorTipi: tip,
      kurallar: [
        kural({ kaynakAlan: 'tag', hedefAlan: 'etiket' }),
        kural({ kaynakAlan: 'serial', hedefAlan: 'seriNo', guvenKurali: { agirlik: 0.8 } }),
      ],
    });
    const ilk = await senkronizasyonKos(c.id);
    expect(ilk.durum).toBe('basarili');
    expect(ilk.eslemeProfilSurumu).toBe(1);

    const eskiKoken = await db.veriKokeni.findFirstOrThrow({
      where: { kaynakSistem: kaynak, kaynakKayitId: 'e1' },
    });
    expect(eskiKoken.eslemeProfilSurumu).toBe(1);
    expect(eskiKoken.guven).toBe(0.8);            // profilin ölçtüğü güven kökene girdi
    expect(eskiKoken.kayitOzeti).toMatch(/^[0-9a-f]{64}$/);
    const eskiKayit = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak, kaynakKayitId: 'e1' },
    });
    /* normalJson eşleştirme geçişinden sonra {tip, gozlem, koken, eslesme}
       biçimine sarılıyor; iki biçimi de kabul et — sınanan şey ETİKETİN
       v1 kuralıyla 'tag' alanından geldiği. */
    const eskiGovde = JSON.parse(eskiKayit.normalJson!) as
      { etiket?: string; gozlem?: { etiket?: string } };
    expect(eskiGovde.gozlem?.etiket ?? eskiGovde.etiket).toBe('ESL-0001');

    // v2: etiket artık BAŞKA alandan geliyor — eşleme değişti
    await profilYayinla({
      kod: 'TEST-GECMIS', ad: 'v2', connectorTipi: tip,
      kurallar: [
        kural({ kaynakAlan: 'assetTag', hedefAlan: 'etiket' }),
        kural({ kaynakAlan: 'serial', hedefAlan: 'seriNo', guvenKurali: { agirlik: 0.8 } }),
      ],
    });

    // Yeni bir kaynak kaydı v2 ile gelir; eski kayda DOKUNULMAZ.
    kayitlar = [gozlem('e2', kaynak, { assetTag: 'ESL-0002', serial: 'sn-2' })];
    const ikinci = await senkronizasyonKos(c.id);
    expect(ikinci.durum).toBe('basarili');
    expect(ikinci.eslemeProfilSurumu).toBe(2);

    const yeniKoken = await db.veriKokeni.findFirstOrThrow({
      where: { kaynakSistem: kaynak, kaynakKayitId: 'e2' },
    });
    expect(yeniKoken.eslemeProfilSurumu).toBe(2);

    // ESKİ kaydın kökeni ve içeriği DEĞİŞMEDİ: hangi kuralla yorumlandığı duruyor.
    const eskiKokenSonra = await db.veriKokeni.findFirstOrThrow({
      where: { kaynakSistem: kaynak, kaynakKayitId: 'e1' },
    });
    expect(eskiKokenSonra.eslemeProfilSurumu).toBe(1);
    expect(eskiKokenSonra).toEqual(eskiKoken);
    const eskiKayitSonra = await db.kesifKaydi.findFirstOrThrow({
      where: { kaynak, kaynakKayitId: 'e1' },
    });
    expect(eskiKayitSonra).toEqual(eskiKayit);

    // v1 kuralı hâlâ okunabilir: "bu alan neden böyle" sorusunun yanıtı var.
    const v1 = await profilSurumu('TEST-GECMIS', 1);
    expect(v1!.kurallar[0].kaynakAlan).toBe('tag');
    expect(v1!.durum).toBe('arsiv');
  });

  it('tanınmayan enum GERÇEK koşuda ReddedilenKayit\'e `asama: esleme` ile yazılır', async () => {
    const kaynak = 'TEST-ESLEME-RED';
    const tip = 'test_esleme_red';
    adaptorYap(tip, async () => ({
      gozlemler: [gozlem('r1', kaynak, { tag: 'RED-0001', type: 'BILINMEYEN-TIP' })],
      yeniImlec: null, devamVar: false,
    }));
    const c = await connectorYap(tip);
    await profilYayinla({
      kod: 'TEST-RED', ad: 'red profili', connectorTipi: tip,
      kurallar: [
        kural({ kaynakAlan: 'tag', hedefAlan: 'etiket' }),
        kural({ kaynakAlan: 'type', hedefAlan: 'turKodu', enumEsleme: { PLC: 'plc' } }),
      ],
    });

    const sonuc = await senkronizasyonKos(c.id);
    expect(sonuc.durum).toBe('basarili');
    expect(sonuc.kabulEdilen).toBe(1);            // alan düştü, KAYIT düşmedi

    const redler = await db.reddedilenKayit.findMany({
      where: { kosuId: sonuc.kosuId!, asama: 'esleme' },
    });
    expect(redler.length).toBe(1);
    expect(redler[0].asama).toBe('esleme');
    expect(redler[0].kaynakKayitId).toBe('r1');
    expect(redler[0].sebep).toContain('enum karşılığı yok');
    expect(redler[0].sebep).toContain('alan boş kaldı');
    expect(redler[0].durum).toBe('acik');
    expect(redler[0].hamJson).toContain('BILINMEYEN-TIP');
  });

  it('KURU koşu eşleme redlerini VERİTABANINA YAZMAZ, özete yazar', async () => {
    const kaynak = 'TEST-ESLEME-KURU';
    const tip = 'test_esleme_kuru';
    adaptorYap(tip, async () => ({
      gozlemler: [gozlem('k1', kaynak, { tag: 'KURU-0001', type: 'BILINMEYEN-TIP' })],
      yeniImlec: null, devamVar: false,
    }));
    const c = await connectorYap(tip);
    await profilYayinla({
      kod: 'TEST-KURU', ad: 'kuru profili', connectorTipi: tip,
      kurallar: [
        kural({ kaynakAlan: 'tag', hedefAlan: 'etiket' }),
        kural({ kaynakAlan: 'type', hedefAlan: 'turKodu', enumEsleme: { PLC: 'plc' } }),
      ],
    });

    const redOnce = await db.reddedilenKayit.count();
    const sonuc = await senkronizasyonKos(c.id, { kuru: true });
    expect(sonuc.durum).toBe('basarili');
    expect(await db.reddedilenKayit.count()).toBe(redOnce);   // hiçbir red satırı yazılmadı
    expect(sonuc.kuruOzet!.eslemeProfili).toEqual({ kod: 'TEST-KURU', surum: 1 });
    expect(sonuc.kuruOzet!.uyarilar.join(' ')).toContain('enum karşılığı yok');
    expect(await db.kesifKaydi.count({ where: { kaynak } })).toBe(0);
  });

  it('gozlemeUygula: profil gözlemin alanlarını ezer, ölçülen güveni kökene taşır', () => {
    const g = gozlem('g1', 'X', { tag: 'YENI-ETIKET', owner: 'ali@ornek' });
    const { gozlem: sonuc, uygulama } = gozlemeUygula([
      kural({ kaynakAlan: 'tag', hedefAlan: 'etiket', guvenKurali: { agirlik: 0.7 } }),
      kural({ kaynakAlan: 'owner', hedefAlan: 'sahipEposta' }),
    ], g);

    expect((sonuc as { etiket?: string }).etiket).toBe('YENI-ETIKET');
    expect(sonuc.koken.guven).toBe(0.7);
    // Gözlem şemasında yeri olmayan eşlenmiş alan düşürülmez.
    expect((sonuc as unknown as { eslenenAlanlar?: Record<string, unknown> })
      .eslenenAlanlar?.sahipEposta).toBe('ali@ornek');
    expect(uygulama.ozel.sahipEposta).toBe('ali@ornek');
  });
});
