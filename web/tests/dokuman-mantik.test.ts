import { describe, expect, it } from 'vitest';
import {
  GECISLER, KARSILAYAN, MERCEKLER, YAKLASMA_GUNU,
  aramaUygula, baslikMetni, dipNot, gecisGecerli, gozdenGecirmeHali, gozdenGecirmeYazisi,
  kapsamYazisi, karsiliksizKontroller, kodOner, mercekUygula, olcu, sirala,
  sonrakiGozdenGecirme, yarimKarsilananlar,
  type BelgeSatiri, type KontrolSatiri,
} from '@/app/(kabuk)/(operasyonel)/dokumanlar/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   C22/C23 · Belge kütüğü saf kuralları

   Sınanan üç değişmez:
   1. takvimsiz ≠ gecikmiş (bilinmeyen kendi kovasında durur),
   2. yalnız YÜRÜRLÜKTEKİ belge bir kontrolü karşılar,
   3. kapsam bağı yoksa belge kurumsaldır (boş liste ≠ hiçbiri).
   ═══════════════════════════════════════════════════════════════════════ */

const T0 = Date.UTC(2026, 8, 2, 12, 0, 0); // 2 Eylül 2026
const gun = (n: number) => new Date(T0 + n * 86_400_000);
const iso = (n: number) => gun(n).toISOString();

/* Varsayılanlar `??` ile DEĞİL yayılma ile birleşir: `??` açıkça verilen
   `null`'ı yutar ve "takvimsiz" kurmak isteyen bir vaka sessizce takvimli
   olurdu (bu tuzağa bir kez düşüldü, testler yeşil görünüyordu). */
function belge(ek: Partial<BelgeSatiri> = {}): BelgeSatiri {
  return {
    id: 'b1', kod: 'POL-2026-001', baslik: 'Bilgi Güvenliği Politikası',
    tur: 'politika', durum: 'yururlukte', surum: '1.0',
    sahip: 'Ahmet Terzi', onaylayan: null,
    yururlukTarihi: iso(-200),
    gozdenGecirmeAy: 12,
    sonrakiGozdenGecirme: iso(165),
    disKaynak: null, kaynakSistem: null,
    gizlilik: 'kurumsal', aciklama: null,
    maddeler: [{ id: 'm1', kod: 'ISO-27001-A.5.9', baslik: 'Envanter', regulasyon: 'ISO-27001' }],
    tesisler: [],
    kanitSayisi: 0,
    ...ek,
  };
}

describe('Gözden geçirme takvimi', () => {
  it('periyot yoksa takvim KURULMAZ — uydurulmuş tarih "gecikmedi" yalanı üretir', () => {
    expect(sonrakiGozdenGecirme(null, gun(-10), gun(-100))).toBeNull();
    expect(sonrakiGozdenGecirme(0, gun(-10), gun(-100))).toBeNull();
  });

  it('taban son gözden geçirme, o yoksa yürürlük tarihidir', () => {
    // Son gözden geçirme 3 Ağu 2026; +12 ay → 3 Ağu 2027 (yürürlük tarihi değil).
    const a = sonrakiGozdenGecirme(12, gun(-30), gun(-400));
    expect(a?.toISOString().slice(0, 10)).toBe('2027-08-03');
    const b = sonrakiGozdenGecirme(6, null, new Date(Date.UTC(2026, 2, 2)));
    expect(b?.toISOString().slice(0, 10)).toBe('2026-09-02');
    // İkisi de yoksa takvim kurulamaz.
    expect(sonrakiGozdenGecirme(12, null, null)).toBeNull();
  });

  it('takvimsiz GECİKMİŞ değildir; ayrı kovada ve bilinmeyen glifiyle durur', () => {
    const h = gozdenGecirmeHali(null, T0);
    expect(h.kod).toBe('takvimsiz');
    expect(h.durum).toBe('unk');
    expect(h.gun).toBeNull();
    expect(gozdenGecirmeYazisi(h)).toBe('periyot tanımlı değil');
  });

  it('geçmiş · yaklaşan · güncel eşikleri', () => {
    expect(gozdenGecirmeHali(gun(-1), T0).kod).toBe('gecti');
    expect(gozdenGecirmeHali(gun(YAKLASMA_GUNU), T0).kod).toBe('yaklasti');
    expect(gozdenGecirmeHali(gun(YAKLASMA_GUNU + 1), T0).kod).toBe('guncel');
    expect(gozdenGecirmeYazisi(gozdenGecirmeHali(gun(-9), T0))).toBe('9 gün geçti');
  });
});

describe('Yaşam döngüsü geçişleri', () => {
  it('taslaktan doğrudan yürürlüğe atlanamaz — inceleme adımı onaylayanı kayda geçirir', () => {
    expect(gecisGecerli('taslak', 'yururlukte')).toBe(false);
    expect(gecisGecerli('taslak', 'incelemede')).toBe(true);
    expect(gecisGecerli('incelemede', 'yururlukte')).toBe(true);
  });

  it('yürürlükten kalkmış belge geri döndürülmez', () => {
    expect(GECISLER.yururlukten_kalkti).toHaveLength(0);
    expect(gecisGecerli('yururlukten_kalkti', 'yururlukte')).toBe(false);
  });

  it('askıya alınan belge yürürlüğe dönebilir ya da tümüyle kalkabilir', () => {
    expect(gecisGecerli('askida', 'yururlukte')).toBe(true);
    expect(gecisGecerli('askida', 'yururlukten_kalkti')).toBe(true);
    expect(gecisGecerli('askida', 'taslak')).toBe(false);
  });
});

describe('Karşılıksız kontrol — ekranın asıl sorusu', () => {
  const kontrol = (belgeler: { id: string; kod: string; durum: string }[]): KontrolSatiri => ({
    maddeId: `m-${belgeler.map((b) => b.kod).join('-') || 'bos'}`,
    kod: 'EPDK-SYM-6.1.1', baslik: 'Geçit kuralları',
    regulasyon: 'EPDK-SYM', zorunlulukTipi: 'REGULATION', belgeler,
  });

  it('yalnız YÜRÜRLÜKTEKİ belge karşılar', () => {
    expect(KARSILAYAN).toEqual(['yururlukte']);
    const liste = [
      kontrol([]),
      kontrol([{ id: 'd1', kod: 'POL-1', durum: 'taslak' }]),
      kontrol([{ id: 'd2', kod: 'POL-2', durum: 'askida' }]),
      kontrol([{ id: 'd3', kod: 'POL-3', durum: 'yururlukte' }]),
    ];
    const eksik = karsiliksizKontroller(liste);
    expect(eksik).toHaveLength(3);
    expect(eksik.map((k) => k.belgeler[0]?.durum ?? 'yok')).toEqual(['yok', 'taslak', 'askida']);
  });

  it('"yarım karşılanan" ayrı sayılır: kütükte ad var, denetimde karşılık yok', () => {
    const liste = [
      kontrol([]),                                                    // hiç yok
      kontrol([{ id: 'd1', kod: 'POL-1', durum: 'incelemede' }]),     // yarım
      kontrol([{ id: 'd3', kod: 'POL-3', durum: 'yururlukte' }]),     // tamam
    ];
    const yarim = yarimKarsilananlar(liste);
    expect(yarim).toHaveLength(1);
    expect(yarim[0].belgeler[0].kod).toBe('POL-1');
    // Hiç belgesi olmayan kontrol "yarım" değildir; ikisi ayrı iştir.
    expect(yarim.some((k) => k.belgeler.length === 0)).toBe(false);
  });

  it('yürürlükte bir belge varsa taslak kardeşleri kontrolü karşılıksız yapmaz', () => {
    const k = kontrol([
      { id: 'd1', kod: 'POL-1', durum: 'taslak' },
      { id: 'd2', kod: 'POL-2', durum: 'yururlukte' },
    ]);
    expect(karsiliksizKontroller([k])).toHaveLength(0);
  });
});

describe('Kapsam sözcüğü', () => {
  it('boş liste "hiçbir santral" değil "ayrım yok" demektir', () => {
    expect(kapsamYazisi([])).toBe('kurumsal · tüm portföy');
  });
  it('üçe kadar kod yazılır, fazlası sayıyla kırpılır', () => {
    const t = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, kod: `T-${i}`, ad: `Santral ${i}` }));
    expect(kapsamYazisi(t(2))).toBe('T-0 · T-1');
    expect(kapsamYazisi(t(5))).toBe('T-0 · T-1 · T-2 +2');
  });
});

describe('Mercek, arama ve sıralama', () => {
  const liste = [
    belge({ id: 'a', kod: 'POL-A', durum: 'yururlukte', sonrakiGozdenGecirme: iso(-40) }),
    belge({ id: 'b', kod: 'POL-B', durum: 'taslak', sonrakiGozdenGecirme: null, maddeler: [] }),
    belge({ id: 'c', kod: 'PRS-C', durum: 'yururlukte', sonrakiGozdenGecirme: iso(10) }),
    belge({ id: 'd', kod: 'PRS-D', durum: 'askida', sonrakiGozdenGecirme: iso(300) }),
  ];

  it('mercekler kütüğü daraltır; karşılıksız kontrol mercek DEĞİLDİR', () => {
    expect(MERCEKLER.map((m) => m.kod)).not.toContain('karsiliksiz');
    expect(mercekUygula(liste, 'yururlukte', T0).map((b) => b.id)).toEqual(['a', 'c']);
    expect(mercekUygula(liste, 'gecikmis', T0).map((b) => b.id)).toEqual(['a']);
    expect(mercekUygula(liste, 'takvimsiz', T0).map((b) => b.id)).toEqual(['b']);
    expect(mercekUygula(liste, 'bagsiz', T0).map((b) => b.id)).toEqual(['b']);
    expect(mercekUygula(liste, 'tumu', T0)).toHaveLength(4);
  });

  it('arama kod, başlık, bağlı kontrol ve santral kodunu tarar', () => {
    const l = [belge({ id: 'x', kod: 'POL-X', baslik: 'OT Güvenlik Politikası',
      maddeler: [{ id: 'm', kod: 'EPDK-SYM-4.2.1', baslik: 'SCADA segmentasyonu', regulasyon: 'EPDK-SYM' }],
      tesisler: [{ id: 't', kod: 'KIZILDERE-3', ad: 'Kızıldere III JES' }] })];
    expect(aramaUygula(l, 'scada')).toHaveLength(1);
    expect(aramaUygula(l, 'POL-X')).toHaveLength(1);
    /* Türkçe katlama sınırı BİLİNÇLİDİR (lib/aramaKosulu.ts § Türkçe uyarısı):
       "KIZILDERE" küçüldüğünde 'kızıldere' olur; ASCII 'i' ile yazılan sorgu
       eşleşmez, Türkçe 'ı' ile yazılan eşleşir. Uydurma ASCII katlaması
       yapılmıyor; bu satır davranışı gizlemek değil SABİTLEMEK için var. */
    expect(aramaUygula(l, 'kızıldere')).toHaveLength(1);
    expect(aramaUygula(l, 'kizildere')).toHaveLength(0);
    expect(aramaUygula(l, 'yedekleme')).toHaveLength(0);
    // Tek harf aramada liste daralmaz (gürültü olurdu).
    expect(aramaUygula(l, 'o')).toHaveLength(1);
  });

  it('acil sıralaması: gecikmiş → yaklaşan → güncel → takvimsiz (bilinmeyen sona)', () => {
    expect(sirala(liste, 'acil', T0).map((b) => b.id)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('kontrol sıralaması en çok kontrol karşılayanı öne alır', () => {
    const cok = belge({ id: 'cok', kod: 'POL-Z', maddeler: [
      { id: 'm1', kod: 'A', baslik: 'a', regulasyon: 'R' },
      { id: 'm2', kod: 'B', baslik: 'b', regulasyon: 'R' },
    ] });
    expect(sirala([liste[1], cok], 'kontrol', T0)[0].id).toBe('cok');
  });
});

describe('Ölçü ve başlık cümlesi', () => {
  it('takvimsiz ve gecikmiş AYRI sayılır', () => {
    const o = olcu([
      belge({ id: '1', sonrakiGozdenGecirme: iso(-5) }),
      belge({ id: '2', sonrakiGozdenGecirme: null, gozdenGecirmeAy: null }),
      belge({ id: '3', sonrakiGozdenGecirme: iso(10) }),
      belge({ id: '4', durum: 'taslak', sonrakiGozdenGecirme: null, maddeler: [] }),
    ], T0);
    expect(o).toMatchObject({
      toplam: 4, gecikmis: 1, takvimsiz: 2, yaklasan: 1, yururlukte: 3, taslak: 1, bagsiz: 1,
    });
  });

  it('başlık en kötü olguyu önce söyler; iyi haber en sonda', () => {
    const bos = { toplam: 0, yururlukte: 0, gecikmis: 0, yaklasan: 0, takvimsiz: 0, taslak: 0, bagsiz: 0 };
    expect(baslikMetni(bos, 0).ad).toBe('Kütük boş');
    expect(baslikMetni({ ...bos, toplam: 3, gecikmis: 2 }, 5).ad).toBe('gözden geçirmesi geçti');
    expect(baslikMetni({ ...bos, toplam: 3 }, 4).ad).toBe('belgesiz');
    expect(baslikMetni({ ...bos, toplam: 3, takvimsiz: 1 }, 0).ad).toBe('takvimsiz');
    expect(baslikMetni({ ...bos, toplam: 3, yaklasan: 1 }, 0).ad).toBe('gözden geçirme yaklaştı');
    expect(baslikMetni({ ...bos, toplam: 3, yururlukte: 3 }, 0).durum).toBe('ok');
  });
});

describe('Kod önerisi ve dip not', () => {
  it('kod türe ve yıla göre sıradaki numarayı verir', () => {
    expect(kodOner('politika', [], 2026)).toBe('POL-2026-001');
    expect(kodOner('politika', ['POL-2026-001', 'POL-2026-004', 'PRS-2026-009'], 2026))
      .toBe('POL-2026-005');
    expect(kodOner('prosedur', ['POL-2026-001'], 2026)).toBe('PRS-2026-001');
    // Başka yılın kodları sırayı ilerletmez.
    expect(kodOner('politika', ['POL-2025-099'], 2026)).toBe('POL-2026-001');
  });

  it('dip not kesmeyi sessiz bırakmaz', () => {
    expect(dipNot({ gorunur: 8, toplam: 40, yuklenen: 30 }))
      .toContain('kütükte 40 belge var, 30 tanesi yüklendi');
    expect(dipNot({ gorunur: 3, toplam: 3, yuklenen: 3 }))
      .toBe('3 belge görünüyor · kolon başlığından sıralama');
  });
});
