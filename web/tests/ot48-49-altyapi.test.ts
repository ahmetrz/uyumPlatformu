import { describe, expect, it } from 'vitest';
import {
  DURUM_SINIFI, hazirlikCumlesi, hazirlikOzeti, kontrolleriSirala, type Kontrol,
} from '../lib/altyapi/hazirlikKarari';
import {
  SAGLAYICILAR, aileninSaglayicilari, cokOrnekEngelleri, etkinSaglayici,
} from '../lib/altyapi/saglayicilar';
import {
  MUTLAK_TABAN_MS, ozetle, tabanaGoreKarsilastir, yuzdelik,
} from '../arac/yuzdelik.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   OT-48 · Üretim ölçeği altyapısı  ·  OT-49 · Performans ölçümü

   İki maddenin ortak kuralı:

     ÖLÇÜLMEMİŞ, "İYİ" DEĞİLDİR.

   Bir kontrol koşamadıysa hazırlık iddia edilmez; bir yüzdelik
   hesaplanamadıysa `0 ms` yazılmaz; bağlı olmayan bir sağlayıcı listeden
   çıkarılmaz. Üçü de aynı hatanın üç yüzüdür: bilgisizliği başarı gibi
   göstermek.
   ═══════════════════════════════════════════════════════════════════════ */

function kontrol(ozel: Partial<Kontrol> = {}): Kontrol {
  return {
    kod: 'k1', ad: 'Kontrol', zorunlu: true, durum: 'hazir',
    ayrinti: 'geçti', yapilacak: null, ...ozel,
  };
}

/* ═══ OT-48 · hazırlık kararı ═════════════════════════════════════════ */

describe('OT-48 · dört durum üçe indirilmez', () => {
  it('ölçülemeyen ZORUNLU kontrol ayrı sayılır', () => {
    const o = hazirlikOzeti([
      kontrol({ kod: 'a' }),
      kontrol({ kod: 'b', durum: 'bilinmiyor' }),
    ]);
    expect(o.olculemeyenZorunlu).toBe(1);
    expect(o.calismayaHazir).toBe(false);
  });

  /* "Hazır değil" ile "hazır olduğunu bilmiyoruz" farklı cümlelerdir;
     ikincisi bir ölçüm işidir, bir kurulum işi değil. */
  it('ölçülemeyen zorunlu kontrol varken HAZIR cümlesi kurulmaz', () => {
    const cumle = hazirlikCumlesi(hazirlikOzeti([
      kontrol({ kod: 'a', durum: 'bilinmiyor' }),
    ]));
    expect(cumle).toMatch(/ölçülemedi/);
    expect(cumle).not.toMatch(/hazır ·/i);
  });

  it('arıza her şeyin önüne geçer', () => {
    const cumle = hazirlikCumlesi(hazirlikOzeti([
      kontrol({ kod: 'a', durum: 'bozuk' }),
      kontrol({ kod: 'b', durum: 'bilinmiyor' }),
      kontrol({ kod: 'c', durum: 'eksik' }),
    ]));
    expect(cumle).toMatch(/ARIZALI/);
  });

  /* Bilgi kalemlerini zorunlu saymak, çalışan bir kurulumu kırmızı
     gösterir ve ekrana bir daha bakılmaz. */
  it('zorunlu olmayan eksik kontrol hazırlığı BOZMAZ', () => {
    const o = hazirlikOzeti([
      kontrol({ kod: 'a' }),
      kontrol({ kod: 'b', zorunlu: false, durum: 'eksik' }),
    ]);
    expect(o.calismayaHazir).toBe(true);
    expect(hazirlikCumlesi(o)).toMatch(/Çalışmaya hazır/);
    expect(hazirlikCumlesi(o)).toMatch(/zorunlu değil/);
  });

  it('hiç kontrol koşmadıysa hazırlık ÖLÇÜLMEMİŞTİR', () => {
    const o = hazirlikOzeti([]);
    expect(o.calismayaHazir).toBe(false);
    expect(hazirlikCumlesi(o)).toMatch(/ölçülmedi/);
  });

  it('"bilinmiyor" GRİ çizilir, kırmızı değil', () => {
    expect(DURUM_SINIFI.bilinmiyor).toBe('unk');
    expect(DURUM_SINIFI.bozuk).toBe('bd');
    expect(DURUM_SINIFI.eksik).toBe('md');
    expect(DURUM_SINIFI.hazir).toBe('ok');
  });

  it('sıralama en kötüyü öne alır; eşitlikte zorunlu olan önce gelir', () => {
    const sirali = kontrolleriSirala([
      kontrol({ kod: 'h', ad: 'Hazır', durum: 'hazir' }),
      kontrol({ kod: 'e2', ad: 'B eksik', durum: 'eksik', zorunlu: false }),
      kontrol({ kod: 'e1', ad: 'A eksik', durum: 'eksik', zorunlu: true }),
      kontrol({ kod: 'b', ad: 'Bozuk', durum: 'bozuk' }),
      kontrol({ kod: 'u', ad: 'Ölçülemedi', durum: 'bilinmiyor' }),
    ]);
    expect(sirali.map((k) => k.kod)).toEqual(['b', 'u', 'e1', 'e2', 'h']);
  });
});

/* ═══ OT-48 · sağlayıcı kütüğü ════════════════════════════════════════ */

describe('OT-48 · bağlı olmayan sağlayıcı gizlenmez', () => {
  /* Bağlı olmayanı listeden çıkarmak ekranı "her şey yolunda" gösterirdi;
     oysa asıl bilgi hangi yeteneğin HENÜZ olmadığıdır. */
  it('kütükte hem bağlı hem bağlı OLMAYAN sağlayıcılar var', () => {
    expect(SAGLAYICILAR.some((s) => s.bagli)).toBe(true);
    expect(SAGLAYICILAR.some((s) => !s.bagli)).toBe(true);
  });

  it('bağlı olmayan her sağlayıcı NEYİN gerektiğini yazar', () => {
    for (const s of SAGLAYICILAR.filter((x) => !x.bagli)) {
      expect(s.gereken, `${s.ad} gerekeni yazmıyor`).toBeTruthy();
      expect(s.gereken!.length).toBeGreaterThan(40);
    }
  });

  it('bağlı sağlayıcı "gereken" taşımaz — eksik bir şey yok', () => {
    for (const s of SAGLAYICILAR.filter((x) => x.bagli)) {
      expect(s.gereken).toBeNull();
    }
  });

  it('her ailede en çok bir bağlı sağlayıcı vardır', () => {
    for (const aile of ['veritabani', 'nesne_deposu', 'koordinasyon'] as const) {
      expect(aileninSaglayicilari(aile).filter((s) => s.bagli).length)
        .toBeLessThanOrEqual(1);
    }
  });

  it('etkin sağlayıcı yalnız BAĞLI olandır', () => {
    const vt = etkinSaglayici('veritabani');
    expect(vt?.ad).toBe('sqlite');
    expect(vt?.bagli).toBe(true);
  });

  /* Tek örnek bir KUSUR değil, bir kurulum kararıdır; ama "yatay
     ölçekleyelim" denince engelin adı bilinmelidir. */
  it('çok örnek engeli ADIYLA raporlanır', () => {
    const engeller = cokOrnekEngelleri();
    expect(engeller.some((e) => e.saglayici === 'sqlite')).toBe(true);
    expect(engeller.some((e) => e.saglayici === 'yerel_dosya')).toBe(true);
    /* Veritabanı kilidi çok örnekte güvenlidir; engel listesine GİRMEZ. */
    expect(engeller.some((e) => e.aile === 'koordinasyon')).toBe(false);
  });
});

/* ═══ OT-49 · yüzdelik matematiği ═════════════════════════════════════ */

describe('OT-49 · ölçülmeyen yüzdelik 0 ms DEĞİLDİR', () => {
  it('boş kümede yüzdelik null döner', () => {
    expect(yuzdelik([], 50)).toBeNull();
    expect(yuzdelik([], 95)).toBeNull();
  });

  /* Nearest-rank: dönen değer GERÇEKTEN ÖLÇÜLMÜŞ bir süredir. Doğrusal
     ara değer, hiç gözlenmemiş bir sayıyı rapora yazardı. */
  it('nearest-rank gerçekten ölçülmüş bir değeri döndürür', () => {
    const d = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(d).toContain(yuzdelik(d, 50));
    expect(yuzdelik(d, 50)).toBe(50);
    expect(yuzdelik(d, 95)).toBe(100);
    expect(yuzdelik(d, 100)).toBe(100);
    expect(yuzdelik(d, 10)).toBe(10);
  });

  it('sırasız girdi sıralanır', () => {
    expect(yuzdelik([90, 10, 50], 50)).toBe(50);
  });

  it('geçersiz yüzde sessizce geçmez', () => {
    expect(() => yuzdelik([1, 2], 0)).toThrow();
    expect(() => yuzdelik([1, 2], 101)).toThrow();
  });

  /* Hata veren isteğin süresi kısadır ve p50'yi olduğundan İYİ gösterir. */
  it('başarısız istek gecikme hesabına GİRMEZ ama sayılır', () => {
    const o = ozetle([
      { ok: true, sureMs: 100, durum: 200 },
      { ok: true, sureMs: 200, durum: 200 },
      { ok: false, sureMs: 3, durum: 500 },
    ]);
    expect(o.istek).toBe(3);
    expect(o.basarisiz).toBe(1);
    expect(o.p50).toBe(100);
    expect(o.enHizli).toBe(100);
    expect(o.durumlar['500']).toBe(1);
  });

  it('hiç başarılı istek yoksa yüzdelikler null kalır', () => {
    const o = ozetle([{ ok: false, sureMs: 5, durum: 503 }]);
    expect(o.p50).toBeNull();
    expect(o.p95).toBeNull();
    expect(o.hataOrani).toBe(1);
  });

  it('hiç istek yoksa hata oranı ölçülmemiştir', () => {
    expect(ozetle([]).hataOrani).toBeNull();
  });
});

describe('OT-49 · taban karşılaştırması', () => {
  /* İlk ölçümü "geçti" saymak, hiçbir şeye karşı karşılaştırmadan başarı
     ilan etmek olurdu. */
  it('taban yoksa sonuç "geçti" DEĞİL, "taban_yok"tur', () => {
    expect(tabanaGoreKarsilastir({ p50: 10, p95: 20, p99: 30 }, null).durum)
      .toBe('taban_yok');
  });

  it('oranı VE mutlak eşiği aşan fark gerileme sayılır', () => {
    const k = tabanaGoreKarsilastir(
      { p50: 100, p95: 400, p99: 500 },
      { p50: 100, p95: 200, p99: 250 },
    );
    expect(k.durum).toBe('geriledi');
    expect(k.gerekce).toMatch(/p95 200→400/);
  });

  /* Paylaşımlı bir makinede p95 gürültü bandı ~50 ms ölçüldü. Yalnız
     orana bakan bir kapı her koşuda rastgele bağırır ve üç koşu sonra
     kimse ona bakmaz; gerçek gerileme de o gürültünün içinde kaybolur. */
  it('oranı aşan ama küçük mutlak fark GERİLEME sayılmaz', () => {
    const k = tabanaGoreKarsilastir(
      { p50: 12, p95: 40, p99: 45 },
      { p50: 10, p95: 20, p99: 22 },
    );
    expect(k.durum).toBe('kabul');
    expect(MUTLAK_TABAN_MS).toBeGreaterThan(20);
  });

  it('ölçülemeyen yüzdelik ne iyileşme ne gerilemedir', () => {
    const k = tabanaGoreKarsilastir(
      { p50: null, p95: null, p99: null },
      { p50: 10, p95: 20, p99: 30 },
    );
    expect(k.durum).toBe('kabul');
    expect(k.sapmalar!.every((s: { durum: string }) => s.durum === 'olculmedi')).toBe(true);
  });

  it('iyileşme gerileme sayılmaz', () => {
    const k = tabanaGoreKarsilastir(
      { p50: 10, p95: 20, p99: 30 },
      { p50: 100, p95: 200, p99: 300 },
    );
    expect(k.durum).toBe('kabul');
  });
});
