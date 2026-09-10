import { describe, expect, it } from 'vitest';
import {
  DONEMSIZ_SOZU, DONEM_DURUMLARI, MOTORUN_YAZABILECEGI_DONEM, TESLIMSIZ_SOZU,
  donemGeriSayimi, donemKapali, donemKarari, donemPenceresi, donemTeyitKapisi,
  donemUygulanmazKapisi, gorunenDonemDurumu, motorYazabilirMiDonem, verildiKapisi,
} from '@/lib/uyum/bildirimDonemi';

/* ═══════════════════════════════════════════════════════════════════════
   R10+ · TAKVİM TETİKLİ YÜKÜMLÜLÜK — SAF KURALLAR [OLY-BIL-006]

   Üç iddia burada ölçülür:

   1. MOTOR DÖNEM AÇAR, VERMEZ. Yazabileceği iki durum var ve `verildi`
      onlardan biri DEĞİL.
   2. DÖNEM YOKSA PENCERE YOK, TESLİM SÜRESİ YOKSA SAYAÇ YOK. Mevzuatın
      vermediği periyot uydurulmaz — bilinmeyen ≠ sıfır.
   3. REFERANSSIZ TESLİM REDDEDİLİR — olay tarafındaki kuralın aynısı.
   ═══════════════════════════════════════════════════════════════════════ */

const GUN = 24 * 3_600_000;
/* 15 Haziran 2026, Pazartesi — dönem hesabının sabit çapası. */
const SIMDI = Date.UTC(2026, 5, 15);

describe('MOTOR DÖNEM AÇAR, VERMEZ [OLY-BIL-006]', () => {
  it('motorun yazabildiği küme İKİ durumdur [OLY-BIL-006]', () => {
    expect([...MOTORUN_YAZABILECEGI_DONEM]).toEqual(['acik', 'suresi_gecti']);
  });

  it('insan kararı olan durumları motor YAZAMAZ', () => {
    for (const d of ['verildi', 'teyit_alindi', 'uygulanmaz']) {
      expect(motorYazabilirMiDonem(d), d).toBe(false);
      expect(donemKapali(d), d).toBe(true);
    }
  });

  it('KAPALI döneme motor DOKUNMAZ — süresi geçmiş olsa bile', () => {
    const gecmis = donemGeriSayimi({ sonTarih: SIMDI - 10 * GUN, simdi: SIMDI });
    for (const d of ['verildi', 'teyit_alindi', 'uygulanmaz']) {
      expect(donemKarari({ mevcutDurum: d, geriSayim: gecmis }), d).toBeNull();
    }
  });

  it('durum kümesi beştir ve motorun yazabildiği onun ALT KÜMESİDİR', () => {
    expect(DONEM_DURUMLARI).toHaveLength(5);
    for (const d of MOTORUN_YAZABILECEGI_DONEM) {
      expect(DONEM_DURUMLARI).toContain(d);
    }
  });
});

describe('DÖNEM BİLİNMİYORSA SAYAÇ YOK [OLY-BIL-006]', () => {
  it('dönem BOŞSA pencere açılmaz ve ekran mevzuatın hâlini söyler [OLY-BIL-006]', () => {
    const s = donemPenceresi({
      donem: null, donemBaslangici: null, teslimGun: 30, simdi: SIMDI,
    });
    expect(s.pencere).toBeNull();
    expect(s.soz).toBe(DONEMSIZ_SOZU);
  });

  it('TESLİM SÜRESİ boşsa pencere açılır ama SON TARİH yoktur', () => {
    /* "Rapor bekleniyor" ile "geciktiniz" ayrı şeylerdir; ikincisini
       söylemek için mevzuatın bir süre vermesi gerekir. */
    const s = donemPenceresi({
      donem: 'yillik', donemBaslangici: '01-01', teslimGun: null, simdi: SIMDI,
    });
    expect(s.pencere).not.toBeNull();
    expect(s.pencere!.sonTarih).toBeNull();
    expect(s.soz).toBe(TESLIMSIZ_SOZU);
  });

  it('son tarihi olmayan dönemde geri sayım YOK ve ASLA "geçti" olmaz', () => {
    const gs = donemGeriSayimi({ sonTarih: null, simdi: SIMDI });
    expect(gs.sureVar).toBe(false);
    expect(gs.kalanDakika).toBeNull();
    expect(gs.gecti).toBe(false);
    expect(donemKarari({ mevcutDurum: 'acik', geriSayim: gs })).toBeNull();
    expect(gorunenDonemDurumu({ donemDurumu: 'acik', geriSayim: gs })).toBe('acik');
  });

  it('dönem başlangıcı yoksa takvim yılı VARSAYILIR ve bu BEYAN EDİLİR', () => {
    /* Varsayılan bir uydurma değildir — ama beyansız kalırsa uydurmadan
       ayırt edilemez. Bayrak ekrana kadar taşınır. */
    const s = donemPenceresi({
      donem: 'yillik', donemBaslangici: null, teslimGun: 30, simdi: SIMDI,
    });
    expect(s.donemBaslangiciVarsayildi).toBe(true);
    expect(new Date(s.pencere!.baslangic).toISOString().slice(0, 10)).toBe('2026-01-01');
  });
});

describe('dönem penceresi doğru hesaplanır [OLY-BIL-006]', () => {
  it('YILLIK · takvim yılı', () => {
    const p = donemPenceresi({
      donem: 'yillik', donemBaslangici: '01-01', teslimGun: 30, simdi: SIMDI,
    }).pencere!;
    expect(p.etiket).toBe('2026');
    expect(new Date(p.baslangic).toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(new Date(p.bitis).toISOString().slice(0, 10)).toBe('2027-01-01');
    /* SON TARİH DÖNEM KAPANDIKTAN SONRA: rapor dönem içinde değil,
       bittikten sonra teslim edilir. */
    expect(new Date(p.sonTarih!).toISOString().slice(0, 10)).toBe('2027-01-31');
  });

  it('ÇEYREKLİK · 15 Haziran ikinci çeyrektedir', () => {
    const p = donemPenceresi({
      donem: 'ceyreklik', donemBaslangici: '01-01', teslimGun: 30, simdi: SIMDI,
    }).pencere!;
    expect(p.etiket).toBe('2026-Ç2');
    expect(new Date(p.baslangic).toISOString().slice(0, 10)).toBe('2026-04-01');
    expect(new Date(p.bitis).toISOString().slice(0, 10)).toBe('2026-07-01');
  });

  it('AYLIK · haziran', () => {
    const p = donemPenceresi({
      donem: 'aylik', donemBaslangici: '01-01', teslimGun: 15, simdi: SIMDI,
    }).pencere!;
    expect(p.etiket).toBe('2026-06');
    expect(new Date(p.baslangic).toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(new Date(p.bitis).toISOString().slice(0, 10)).toBe('2026-07-01');
  });

  it('KİRACININ kendi takvimi: mali yıl 04-01 ise dönem ona göre açılır', () => {
    /* Takvim yılı bir varsayılandır, bir dayatma değil: mali yılı nisanda
       başlayan bir kiracının yıllık raporu ocakta açılmaz. */
    const p = donemPenceresi({
      donem: 'yillik', donemBaslangici: '04-01', teslimGun: 30, simdi: SIMDI,
    }).pencere!;
    expect(new Date(p.baslangic).toISOString().slice(0, 10)).toBe('2026-04-01');
    expect(new Date(p.bitis).toISOString().slice(0, 10)).toBe('2027-04-01');
  });

  it('dönem başlangıcı GELECEKTEYSE bir önceki dönem açılır', () => {
    /* 15 Haziran'da "10-01 başlangıçlı yıllık" dönem, 2025-10-01'de
       başlamış olandır — 2026-10-01 henüz gelmedi. */
    const p = donemPenceresi({
      donem: 'yillik', donemBaslangici: '10-01', teslimGun: 30, simdi: SIMDI,
    }).pencere!;
    expect(new Date(p.baslangic).toISOString().slice(0, 10)).toBe('2025-10-01');
    expect(p.baslangic).toBeLessThanOrEqual(SIMDI);
    expect(p.bitis).toBeGreaterThan(SIMDI);
  });
});

describe('geri sayım ve ekran durumu [OLY-BIL-006]', () => {
  it('süresi geçmiş AÇIK dönem ekranda "süresi geçti" görünür', () => {
    /* Motor periyodik koşar, sayaç anlıktır: uzlaştırılmazsa satır aynı
       anda "Dönem açık" ve "10 gün GECİKME" der — olay tarafında ölçülüp
       kapatılan çelişkinin aynısı. */
    const gs = donemGeriSayimi({ sonTarih: SIMDI - 10 * GUN, simdi: SIMDI });
    expect(gs.gecti).toBe(true);
    expect(gs.soz).toContain('GECİKME');
    expect(gorunenDonemDurumu({ donemDurumu: 'acik', geriSayim: gs })).toBe('suresi_gecti');
  });

  it('İNSAN KARARI ekranda geri alınmaz', () => {
    const gs = donemGeriSayimi({ sonTarih: SIMDI - 99 * GUN, simdi: SIMDI });
    for (const d of ['verildi', 'teyit_alindi', 'uygulanmaz']) {
      expect(gorunenDonemDurumu({ donemDurumu: d, geriSayim: gs }), d).toBe(d);
    }
  });

  it('süresi DOLMAMIŞ dönem açık kalır', () => {
    const gs = donemGeriSayimi({ sonTarih: SIMDI + 10 * GUN, simdi: SIMDI });
    expect(gs.soz).toContain('kaldı');
    expect(gorunenDonemDurumu({ donemDurumu: 'acik', geriSayim: gs })).toBe('acik');
  });
});

describe('İNSAN KARARI KAPILARI [OLY-BIL-006]', () => {
  it('REFERANSSIZ teslim REDDEDİLİR', () => {
    const r = verildiKapisi({ mevcutDurum: 'acik', referansNo: '  ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sebep).toMatch(/referans numarası zorunlu/i);
  });

  it('referansla teslim geçer — süresi geçmiş dönemden de', () => {
    expect(verildiKapisi({ mevcutDurum: 'acik', referansNo: 'EPBS-2026-1' }).ok).toBe(true);
    /* Geç teslim yine de bir teslimdir: kapı engellemez, kayıt gecikmeyi
       saklamaz. */
    expect(verildiKapisi({ mevcutDurum: 'suresi_gecti', referansNo: 'X-1' }).ok).toBe(true);
  });

  it('KAPALI dönem ikinci kez teslim edilemez', () => {
    for (const d of ['verildi', 'teyit_alindi', 'uygulanmaz']) {
      expect(verildiKapisi({ mevcutDurum: d, referansNo: 'X-1' }).ok, d).toBe(false);
    }
  });

  it('teyit TESLİMDEN ÖNCE işlenemez', () => {
    expect(donemTeyitKapisi({ mevcutDurum: 'acik' }).ok).toBe(false);
    expect(donemTeyitKapisi({ mevcutDurum: 'verildi' }).ok).toBe(true);
  });

  it('"uygulanmaz" GEREKÇE ister', () => {
    expect(donemUygulanmazKapisi({ mevcutDurum: 'acik', gerekce: 'kısa' }).ok).toBe(false);
    expect(donemUygulanmazKapisi({
      mevcutDurum: 'acik', gerekce: 'Bu kuruluş bu raporlama kapsamına girmiyor.',
    }).ok).toBe(true);
  });
});
