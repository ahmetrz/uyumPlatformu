/* RAPORLAMA TAKVİMİ EKRANI · SAF KATMAN

   Ekranın iki iddiası burada donuyor:

     · periyodu BİLİNMEYEN yükümlülük listeden DÜŞMEZ ve sayaç GÖSTERMEZ
     · ekranın gösterdiği durum motorun YAZDIĞI durumdan farklı olabilir
       (süresi geçmiş ama motor henüz koşmamış) — ekran bunu SAKLAMAZ ve
       veritabanına da YAZMAZ

   Tarayıcı kanıtı `arac/bildirim-donemi-kanit.mjs`te; orası ekranın
   gerçekten çizildiğini ölçer, burası neyi çizmesi gerektiğini. */

import { describe, expect, it } from 'vitest';
import {
  GRUP_DONEM, GRUP_DONEMSIZ, mercekSuz, takvimOzeti, takvimSatirlari,
  type YukumlulukKaydi,
} from '@/app/(kabuk)/(operasyonel)/raporlar/takvim/mantik';

const GUN = 24 * 3_600_000;
const SIMDI = Date.UTC(2026, 5, 15);

const yukumluluk = (ek: Partial<YukumlulukKaydi> = {}): YukumlulukKaydi => ({
  id: 'y1', kod: 'TEST-YIL', ad: 'Test yıllık raporu', merci: 'Test Mercii',
  dayanak: 'Test Yönetmeliği md. 1', kanalNotu: null,
  donem: 'yillik', donemBaslangici: null, teslimGun: 30, donemler: [],
  ...ek,
});

const donem = (ek: Record<string, unknown> = {}) => ({
  id: 'd1', donemEtiketi: '2026',
  baslangic: new Date(Date.UTC(2026, 0, 1)).toISOString(),
  bitis: new Date(Date.UTC(2027, 0, 1)).toISOString(),
  sonTarih: new Date(SIMDI + 10 * GUN).toISOString(),
  durum: 'acik', referansNo: null, verenAd: null, verilmeZamani: null,
  teyitZamani: null, uygulanmazGerekcesi: null,
  ...ek,
});

describe('raporlama takvimi satırları [OLY-BIL-007]', () => {
  it('açık dönem etiketi, durumu ve geri sayımıyla durur [OLY-BIL-007]', () => {
    const s = takvimSatirlari([yukumluluk({ donemler: [donem()] })], SIMDI);
    expect(s).toHaveLength(1);
    expect(s[0].donemEtiketi).toBe('2026');
    expect(s[0].gorunen).toBe('acik');
    expect(s[0].sureVar).toBe(true);
    expect(s[0].geriSayimSozu).toContain('10 gün');
    expect(s[0].grup).toBe(GRUP_DONEM);
  });

  it('DÖNEMSİZ yükümlülük listeden DÜŞMEZ — kendi grubunda durur [OLY-BIL-007]', () => {
    /* Bu satırın gizlenmesi ekranı "her şey yolunda" gösterirdi:
       kurumun bir raporlama yükümlülüğü var, ürün periyodunu bilmiyor ve
       söylemiyor olurdu. */
    const s = takvimSatirlari(
      [yukumluluk({ donem: null, teslimGun: null })], SIMDI);
    expect(s).toHaveLength(1);
    expect(s[0].grup).toBe(GRUP_DONEMSIZ);
    expect(s[0].donemId).toBeNull();
    expect(s[0].im).toBe('unk');
    expect(s[0].durumSozu).toBe('Dönem mevzuatta belirlenmedi');
  });

  it('dönemsiz satırda SAYAÇ YOK — sıfır da değil [OLY-BIL-007]', () => {
    const s = takvimSatirlari([yukumluluk({ donem: null, teslimGun: null })], SIMDI);
    expect(s[0].sureVar).toBe(false);
    expect(s[0].kalanDakika).toBeNull();
    expect(s[0].gecti).toBe(false);
    expect(s[0].geriSayimSozu).not.toMatch(/\d+ gün/);
  });

  it('teslim süresi olmayan DÖNEM açılır ama sayaç işlemez [OLY-BIL-007]', () => {
    const s = takvimSatirlari(
      [yukumluluk({ teslimGun: null, donemler: [donem({ sonTarih: null })] })], SIMDI);
    expect(s[0].donemId).toBe('d1');
    expect(s[0].grup).toBe(GRUP_DONEM);
    expect(s[0].sureVar).toBe(false);
    expect(s[0].geriSayimSozu).toBe('Teslim süresi mevzuatta belirlenmedi');
  });

  it('periyodu VAR ama dönemi açılmamış yükümlülük "motor işlemedi" der [OLY-BIL-007]', () => {
    /* "Motor henüz koşmadı" ile "yükümlülük yok" aynı şey değildir;
       ikisi de sessizlik olursa ekran ikisini ayırt ettirmez. */
    const s = takvimSatirlari([yukumluluk({ donemler: [] })], SIMDI);
    expect(s[0].grup).toBe(GRUP_DONEMSIZ);
    expect(s[0].durumSozu).toContain('motor bu yükümlülüğü işlemedi');
    expect(s[0].sureVar).toBe(false);
  });

  it('süresi geçmiş dönem, motor henüz yazmamışken de GEÇMİŞ görünür [OLY-BIL-007]', () => {
    /* Ekran motorun koşmasını beklemez ama VERİTABANINA DA YAZMAZ: ham
       durum `acik` kalır, görünen `suresi_gecti` olur. */
    const s = takvimSatirlari(
      [yukumluluk({ donemler: [donem({ sonTarih: new Date(SIMDI - 3 * GUN).toISOString() })] })],
      SIMDI);
    expect(s[0].durum).toBe('acik');
    expect(s[0].gorunen).toBe('suresi_gecti');
    expect(s[0].im).toBe('bd');
    expect(s[0].geriSayimSozu).toContain('GECİKME');
  });

  it('KAPALI dönemde süre geçse bile durum DEĞİŞMEZ [OLY-BIL-007]', () => {
    /* İnsan kararı verilmiş bir döneme motor da ekran da dokunmaz. */
    for (const d of ['verildi', 'teyit_alindi', 'uygulanmaz']) {
      const s = takvimSatirlari([yukumluluk({
        donemler: [donem({ durum: d, sonTarih: new Date(SIMDI - 30 * GUN).toISOString() })],
      })], SIMDI);
      expect(s[0].gorunen).toBe(d);
    }
  });

  it('sıralama: en yakın son tarih üstte, sayaçsızlar altta [OLY-BIL-007]', () => {
    const s = takvimSatirlari([
      yukumluluk({ id: 'a', kod: 'A', donem: null, teslimGun: null }),
      yukumluluk({ id: 'b', kod: 'B',
        donemler: [donem({ id: 'db', sonTarih: new Date(SIMDI + 40 * GUN).toISOString() })] }),
      yukumluluk({ id: 'c', kod: 'C',
        donemler: [donem({ id: 'dc', sonTarih: new Date(SIMDI + 2 * GUN).toISOString() })] }),
      yukumluluk({ id: 'd', kod: 'D', teslimGun: null,
        donemler: [donem({ id: 'dd', sonTarih: null })] }),
    ], SIMDI);
    expect(s.map((x) => x.id)).toEqual(['dc', 'db', 'dd', 'yuk:a']);
  });
});

describe('takvim özeti bilinmeyeni AYRI sayar [OLY-BIL-007]', () => {
  it('dönemsiz yükümlülük açık döneme EKLENMEZ [OLY-BIL-007]', () => {
    const s = takvimSatirlari([
      yukumluluk({ id: 'a', kod: 'A', donemler: [donem({ id: 'da' })] }),
      yukumluluk({ id: 'b', kod: 'B', donem: null, teslimGun: null }),
    ], SIMDI);
    const o = takvimOzeti(s);
    expect(o.acik).toBe(1);
    expect(o.donemsiz).toBe(1);
    expect(o.toplamYukumluluk).toBe(2);
    /* Bilinmeyen kapalıya da açığa da eklenmez — üçü ayrı kova. */
    expect(o.acik + o.suresiGecti + o.kapali).toBe(1);
  });

  it('teslim süresi olmayan dönem "teslimsiz" sayılır [OLY-BIL-007]', () => {
    const s = takvimSatirlari([yukumluluk({
      teslimGun: null, donemler: [donem({ sonTarih: null })],
    })], SIMDI);
    expect(takvimOzeti(s).teslimsiz).toBe(1);
    expect(takvimOzeti(s).donemsiz).toBe(0);
  });
});

describe('mercekler [OLY-BIL-007]', () => {
  const kume = () => takvimSatirlari([
    yukumluluk({ id: 'a', kod: 'A', donemler: [donem({ id: 'da' })] }),
    yukumluluk({ id: 'b', kod: 'B',
      donemler: [donem({ id: 'db', sonTarih: new Date(SIMDI - GUN).toISOString() })] }),
    yukumluluk({ id: 'c', kod: 'C', donemler: [donem({ id: 'dc', durum: 'verildi' })] }),
    yukumluluk({ id: 'd', kod: 'D', donem: null, teslimGun: null }),
  ], SIMDI);

  it('varsayılan mercek kapanmış dönemi gizler, BİLİNMEYENİ GİZLEMEZ [OLY-BIL-007]', () => {
    const s = mercekSuz(kume(), 'acik');
    expect(s.map((x) => x.id).sort()).toEqual(['da', 'db', 'yuk:d']);
  });

  it('"sayacı olmayan" merceği ürünün BİLMEDİKLERİNİ toplar [OLY-BIL-007]', () => {
    const s = mercekSuz(kume(), 'sayacsiz');
    expect(s.map((x) => x.id)).toEqual(['yuk:d']);
  });

  it('"süresi geçti" merceği yalnız gecikmişleri verir [OLY-BIL-007]', () => {
    expect(mercekSuz(kume(), 'gecti').map((x) => x.id)).toEqual(['db']);
  });

  it('"tümü" hiçbir satırı düşürmez [OLY-BIL-007]', () => {
    expect(mercekSuz(kume(), 'hepsi')).toHaveLength(4);
  });
});
