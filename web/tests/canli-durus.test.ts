import { describe, expect, it } from 'vitest';
import {
  CANLI_KAT, DURUS_ALANLARI, GUNCEL_KAT, KAYNAK_ONCELIGI_VARSAYILAN,
  TAZELIK_DURUMLARI, TAZELIK_SINIFI, TAZELIK_SOZU,
  alaniCoz, canliDenebilirMi, canliDurusCumlesi, canliDurusOzeti, durusuCoz,
  tazelik, type AlanGozlemi, type KaynakGozlemi,
} from '@/lib/varlik/canliDurus';

/* ═══════════════════════════════════════════════════════════════════════
   OT-21b · Canlı duruş

   Bu dosyanın çivilediği kurallar:
     · "CANLI" yalnız kaynak GERÇEKTEN bağlıyken yazılabilir,
     · eşik sabit dakika değil, kaynağın KENDİ poll aralığının katıdır,
     · poll aralığı olmayan (elle beslenen) kaynak asla canlı değildir,
     · kaynak bağlı değilse bu bir KUSUR DEĞİL, bir kurulum adımıdır,
     · eski veri yeniyi EZMEZ; kaynak önceliği yalnız berabere bozar,
     · çakışma gizlenmez.
   ═══════════════════════════════════════════════════════════════════════ */

const DK = 60_000;
const SIMDI = 1_760_000_000_000;

function girdi(ek: Partial<Parameters<typeof tazelik>[0]> = {}) {
  return {
    kaynakZamani: SIMDI - 1 * DK,
    bagli: true,
    hatali: false,
    pollAralikDk: 5,
    simdi: SIMDI,
    ...ek,
  };
}

describe('Tazelik — "canlı" bir iddiadır', () => {
  it('bağlı olmayan kaynak CANLI değil, "kaynak bağlı değil"dir', () => {
    const t = tazelik(girdi({ bagli: false, kaynakZamani: SIMDI }));
    expect(t.durum).toBe('kaynak_yok');
    expect(canliDenebilirMi(t)).toBe(false);
  });

  it('veri saniyeler önce gelse bile bağlı olmayan kaynak canlı sayılmaz [DUR-TAZ-002]', () => {
    /* Bu, ürünün en pahalı yalanının testi: veri taze diye kaynağı bağlı
       göstermek. Bağlantı bilgisi olmadan tazelik bir iddiadır. */
    expect(tazelik(girdi({ bagli: false, kaynakZamani: SIMDI })).durum)
      .toBe('kaynak_yok');
  });

  it('kaynak hatalıysa tazelik değil HATA raporlanır [DUR-TAZ-004]', () => {
    const t = tazelik(girdi({ hatali: true }));
    expect(t.durum).toBe('hata');
    expect(canliDenebilirMi(t)).toBe(false);
  });

  it('kaynak zaman bildirmediyse tazelik ÖLÇÜLEMEZ — "güncel" sayılmaz', () => {
    const t = tazelik(girdi({ kaynakZamani: null }));
    expect(t.durum).toBe('bilinmiyor');
    expect(t.yasDk).toBeNull();
  });

  it('poll aralığı olmayan kaynak ne kadar yeni olursa olsun canlı değildir [DUR-TAZ-003]', () => {
    /* Bir dosya yüklemesi bir AKIŞ değildir. */
    const t = tazelik(girdi({ pollAralikDk: null, kaynakZamani: SIMDI }));
    expect(t.durum).toBe('bilinmiyor');
    expect(t.yasDk).toBe(0);
    expect(t.canliEsikDk).toBeNull();
  });

  it('poll aralığı sıfır ya da negatifse de akış sayılmaz', () => {
    expect(tazelik(girdi({ pollAralikDk: 0 })).durum).toBe('bilinmiyor');
    expect(tazelik(girdi({ pollAralikDk: -5 })).durum).toBe('bilinmiyor');
  });

  it('eşik POLL ARALIĞININ KATIDIR — sabit bir dakika değil', () => {
    /* 5 dk'da bir sorgulanan kaynak için 20 dk artık canlı değil;
       günde bir koşan kaynak için aynı 20 dk hâlâ CANLI. */
    const hizli = tazelik(girdi({ pollAralikDk: 5, kaynakZamani: SIMDI - 20 * DK }));
    const yavas = tazelik(girdi({ pollAralikDk: 1440, kaynakZamani: SIMDI - 20 * DK }));
    expect(hizli.durum).toBe('guncel');
    expect(yavas.durum).toBe('canli');
  });

  it('canlı eşiği tam sınırda hâlâ canlıdır [DUR-TAZ-001]', () => {
    const t = tazelik(girdi({ pollAralikDk: 10, kaynakZamani: SIMDI - 20 * DK }));
    expect(t.canliEsikDk).toBe(20);
    expect(t.durum).toBe('canli');
  });

  it('güncel eşiğinin bir dakika ötesi BAYATtır', () => {
    const t = tazelik(girdi({ pollAralikDk: 10, kaynakZamani: SIMDI - 61 * DK }));
    expect(t.durum).toBe('bayat');
  });

  it('konsoldan gelen katlar kod varsayılanını EZER', () => {
    const gecmis = SIMDI - 30 * DK;
    expect(tazelik(girdi({ pollAralikDk: 10, kaynakZamani: gecmis })).durum)
      .toBe('guncel');
    expect(tazelik(girdi({
      pollAralikDk: 10, kaynakZamani: gecmis, canliKat: 4,
    })).durum).toBe('canli');
    expect(tazelik(girdi({
      pollAralikDk: 10, kaynakZamani: gecmis, guncelKat: 2,
    })).durum).toBe('bayat');
  });

  it('gelecekten gelen zaman negatif yaş üretmez', () => {
    const t = tazelik(girdi({ kaynakZamani: SIMDI + 10 * DK }));
    expect(t.yasDk).toBe(0);
    expect(t.durum).toBe('canli');
  });

  it('kod varsayılanları makuldür: canlı katı güncel katından küçüktür', () => {
    expect(CANLI_KAT).toBeLessThan(GUNCEL_KAT);
    expect(CANLI_KAT).toBeGreaterThan(0);
  });
});

describe('Duruş sözlüğü — bilinmeyen sağlıklıya düşmez', () => {
  it('her durumun sözü ve sınıfı vardır', () => {
    for (const d of TAZELIK_DURUMLARI) {
      expect(TAZELIK_SOZU[d]).toBeTruthy();
      expect(TAZELIK_SINIFI[d]).toBeTruthy();
    }
  });

  it('yalnız canlı ve güncel "ok" sayılır', () => {
    const ok = TAZELIK_DURUMLARI.filter((d) => TAZELIK_SINIFI[d] === 'ok');
    expect([...ok].sort()).toEqual(['canli', 'guncel']);
  });

  it('kaynağın bağlı olmaması KUSUR değil, kurulum adımıdır', () => {
    expect(TAZELIK_SINIFI.kaynak_yok).toBe('pl');
    expect(TAZELIK_SINIFI.kaynak_yok).not.toBe('bd');
  });

  it('bilinmiyor kendi sınıfını taşır — sağlıklıya da kusura da düşmez', () => {
    expect(TAZELIK_SINIFI.bilinmiyor).toBe('unk');
  });

  it('yalnız "canli" durumu CANLI sözcüğünü hak eder', () => {
    for (const d of TAZELIK_DURUMLARI) {
      const t = { durum: d, yasDk: 0, canliEsikDk: 10 };
      expect(canliDenebilirMi(t)).toBe(d === 'canli');
    }
    expect(TAZELIK_SOZU.canli).toBe('CANLI');
    expect(TAZELIK_SOZU.kaynak_yok).not.toMatch(/canlı/i);
  });
});

/* ── Çakışma çözümü ──────────────────────────────────────────────────── */

function g(
  kaynakSistem: string, deger: string | null,
  kaynakZamani: number | null, guven: number | null = null,
): AlanGozlemi {
  return {
    kaynakSistem,
    deger,
    kaynakZamani,
    guven,
    tazelik: tazelik(girdi({ kaynakZamani })),
  };
}

describe('Çakışma çözümü — eski veri yeniyi EZMEZ', () => {
  it('hiç değer yoksa null döner', () => {
    const s = alaniCoz([g('edr', null, SIMDI)], KAYNAK_ONCELIGI_VARSAYILAN);
    expect(s.deger).toBeNull();
    expect(s.kaynakSistem).toBeNull();
    expect(s.cakisanlar).toEqual([]);
  });

  it('boş metin değer sayılmaz', () => {
    expect(alaniCoz([g('edr', '', SIMDI)]).deger).toBeNull();
  });

  it('en YENİ ölçüm kazanır — kaynak önceliği bunu bozamaz [DUR-CAK-001]', () => {
    /* `edr` öncelik listesinde `siem`den önce gelir; ama üç saat önce
       ölçülmüş bir değer, az önce ölçülmüşü ezemez. */
    const s = alaniCoz([
      g('edr', 'Windows 10', SIMDI - 180 * DK),
      g('siem', 'Windows 11', SIMDI - 1 * DK),
    ], KAYNAK_ONCELIGI_VARSAYILAN);
    expect(s.deger).toBe('Windows 11');
    expect(s.kaynakSistem).toBe('siem');
  });

  it('zamanı olmayan gözlem, zamanı olana karşı ASLA kazanmaz', () => {
    const s = alaniCoz([
      g('edr', 'zamansiz', null),
      g('siem', 'zamanli', SIMDI - 5000 * DK),
    ], KAYNAK_ONCELIGI_VARSAYILAN);
    expect(s.deger).toBe('zamanli');
  });

  it('sıra bağımsızdır: aynı küme hangi sırayla gelirse gelsin aynı kazanır', () => {
    const a = g('edr', 'zamansiz', null);
    const b = g('siem', 'zamanli', SIMDI - 5000 * DK);
    expect(alaniCoz([a, b]).deger).toBe(alaniCoz([b, a]).deger);
  });

  it('zaman eşitse GÜVENİ yüksek olan kazanır', () => {
    const s = alaniCoz([
      g('siem', 'dusuk', SIMDI, 0.2),
      g('vuln_scanner', 'yuksek', SIMDI, 0.9),
    ], KAYNAK_ONCELIGI_VARSAYILAN);
    expect(s.deger).toBe('yuksek');
  });

  it('zaman ve güven eşitse kaynak önceliği berabere bozar', () => {
    const s = alaniCoz([
      g('siem', 'siemden', SIMDI, 0.5),
      g('edr', 'edrden', SIMDI, 0.5),
    ], KAYNAK_ONCELIGI_VARSAYILAN);
    expect(s.deger).toBe('edrden');
  });

  it('öncelik listesinde olmayan kaynak listedekinin ARKASINA düşer', () => {
    const s = alaniCoz([
      g('bilinmeyen_urun', 'yabanci', SIMDI, 0.5),
      g('siem', 'listede', SIMDI, 0.5),
    ], KAYNAK_ONCELIGI_VARSAYILAN);
    expect(s.deger).toBe('listede');
  });

  it('çakışma GİZLENMEZ — farklı değer bildiren kaynaklar ayrıca döner', () => {
    const s = alaniCoz([
      g('edr', 'Windows 10', SIMDI - 180 * DK),
      g('siem', 'Windows 11', SIMDI - 1 * DK),
    ], KAYNAK_ONCELIGI_VARSAYILAN);
    expect(s.cakisanlar).toHaveLength(1);
    expect(s.cakisanlar[0]!.kaynakSistem).toBe('edr');
  });

  it('aynı değeri söyleyen kaynak ÇAKIŞMA sayılmaz', () => {
    const s = alaniCoz([
      g('edr', 'Windows 11', SIMDI - 180 * DK),
      g('siem', 'Windows 11', SIMDI - 1 * DK),
    ], KAYNAK_ONCELIGI_VARSAYILAN);
    expect(s.cakisanlar).toEqual([]);
  });
});

/* ── Varlık düzeyi çözüm ─────────────────────────────────────────────── */

function kaynak(ek: Partial<KaynakGozlemi> = {}): KaynakGozlemi {
  return {
    kaynakSistem: 'edr',
    bagli: true,
    hatali: false,
    pollAralikDk: 5,
    kaynakZamani: SIMDI - 1 * DK,
    guven: null,
    alanlar: {},
    ...ek,
  };
}

describe('durusuCoz — alan başına kazanan, kaynak başına tazelik', () => {
  it('hiç kaynak yoksa her alan "kaynak yok" der', () => {
    const c = durusuCoz([], { simdi: SIMDI });
    for (const alan of DURUS_ALANLARI) {
      expect(c[alan].deger).toBeNull();
      expect(c[alan].tazelik).toBeNull();
    }
    const o = canliDurusOzeti(DURUS_ALANLARI.map((a) => c[a]));
    expect(o.hicKaynakYok).toBe(true);
    expect(canliDurusCumlesi(o)).toMatch(/kaynak sistem bağlı değil/);
  });

  it('kazanan kaynak ALANDAN ALANA değişebilir', () => {
    /* Uç nokta ajanı işletim sistemini bilir, firmware'i bilmez;
       OT keşif ürünü tam tersi. */
    const c = durusuCoz([
      kaynak({ kaynakSistem: 'edr', alanlar: { isletimSistemi: 'Windows 11' } }),
      kaynak({
        kaynakSistem: 'ot_discovery', pollAralikDk: 60,
        alanlar: { firmware: 'v4.2.1' },
      }),
    ], { simdi: SIMDI });
    expect(c.isletimSistemi.kaynakSistem).toBe('edr');
    expect(c.firmware.kaynakSistem).toBe('ot_discovery');
    expect(c.yamaSeviyesi.deger).toBeNull();
  });

  it('bağlı olmayan kaynağın verdiği değer gösterilir ama CANLI denmez', () => {
    const c = durusuCoz([
      kaynak({ bagli: false, alanlar: { isletimSistemi: 'Windows 11' } }),
    ], { simdi: SIMDI });
    expect(c.isletimSistemi.deger).toBe('Windows 11');
    expect(c.isletimSistemi.tazelik!.durum).toBe('kaynak_yok');
    expect(canliDenebilirMi(c.isletimSistemi.tazelik!)).toBe(false);
  });

  it('konsoldan gelen kaynak sırası kullanılır', () => {
    const iki = [
      kaynak({ kaynakSistem: 'siem', guven: 0.5, alanlar: { firmware: 'siem' } }),
      kaynak({ kaynakSistem: 'edr', guven: 0.5, alanlar: { firmware: 'edr' } }),
    ];
    expect(durusuCoz(iki, { simdi: SIMDI }).firmware.deger).toBe('edr');
    expect(durusuCoz(iki, {
      simdi: SIMDI, kaynakOnceligi: ['siem', 'edr'],
    }).firmware.deger).toBe('siem');
  });

  it('özet hatalı ve çakışan alanları ayrı sayar', () => {
    const c = durusuCoz([
      kaynak({ kaynakSistem: 'edr', alanlar: { isletimSistemi: 'A', firmware: 'F1' } }),
      kaynak({
        kaynakSistem: 'siem', kaynakZamani: SIMDI - 2 * DK,
        alanlar: { firmware: 'F2' },
      }),
    ], { simdi: SIMDI });
    const o = canliDurusOzeti(DURUS_ALANLARI.map((a) => c[a]));
    expect(o.hicKaynakYok).toBe(false);
    expect(o.canli).toBe(2);
    expect(o.kaynaksiz).toBe(2);
    expect(o.cakisan).toBe(1);
    expect(canliDurusCumlesi(o)).toMatch(/farklı değer/);
  });

  it('kaynak hata veriyorsa özet cümlesi bunu ÖNCE söyler', () => {
    const c = durusuCoz([
      kaynak({ hatali: true, alanlar: { isletimSistemi: 'A' } }),
    ], { simdi: SIMDI });
    const o = canliDurusOzeti(DURUS_ALANLARI.map((a) => c[a]));
    expect(o.hatali).toBe(1);
    expect(canliDurusCumlesi(o)).toMatch(/hata veriyor/);
  });
});
