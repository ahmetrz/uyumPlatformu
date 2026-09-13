import { describe, expect, it } from 'vitest';
import {
  enZayif, karneOzeti, mercekle,
} from '@/app/(kabuk)/(operasyonel)/raporlar/karne/mantik';
import type { PortfoySatiri } from '@/app/(tam)/portfoy/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   UYUM KARNESİ — müşterinin yanında götürdüğü tek sayfa

   Karne bir DENETİM ÇIKTISIDIR: içindeki bir sayı yanlışsa belgenin
   kendisi şüpheli olur. Bu yüzden üç karar burada sabitlenir — ölçülmemiş
   değerin sıfır sayılmaması, farklı ölçülerin toplanmaması ve merceğin
   kapsamı gerçekten daraltması.
   ═══════════════════════════════════════════════════════════════════════ */

const satir = (ek: Partial<PortfoySatiri> & { id: string }): PortfoySatiri => ({
  kod: ek.id.toUpperCase(), ad: ek.id,
  tipKod: null, tipAdi: 'Tip', tuzelKisi: null, konum: null,
  guc: 100, gucBirim: 'MW', gorselAnahtari: null,
  enlem: null, boylam: null, konumKaynagi: null, konumDogrulandi: false,
  kritiklik: null, uyumYuzde: 80, bilinmeyenOran: 0,
  acikBulgu: 0, acikRisk: 0, sektorId: null,
  ...ek,
});

describe('Karne · özet', () => {
  it('ölçülmemiş uyum yüzdesi ORTALAMAYA katılmaz, ayrıca sayılır [RAP-KRN-001]', () => {
    const o = karneOzeti([
      satir({ id: 'a', uyumYuzde: 60 }),
      satir({ id: 'b', uyumYuzde: null }),
      satir({ id: 'c', uyumYuzde: 90 }),
    ]);
    expect(o.kayit).toBe(3);
    /* "3 kaydın 2'si ölçüldü" — eksik olan sıfır sayılmıyor. */
    expect(o.olculen).toBe(2);
  });

  it('açık bulgu ve risk kapsamdaki satırlardan toplanır [RAP-KRN-001]', () => {
    const o = karneOzeti([
      satir({ id: 'a', acikBulgu: 3, acikRisk: 1 }),
      satir({ id: 'b', acikBulgu: 2, acikRisk: 4 }),
    ]);
    expect(o.acikBulgu).toBe(5);
    expect(o.acikRisk).toBe(5);
  });

  it('tek ölçüde kapasite toplanır ve ölçüsünü taşır [RAP-KRN-001]', () => {
    const o = karneOzeti([
      satir({ id: 'a', guc: 100, gucBirim: 'MW' }),
      satir({ id: 'b', guc: 65, gucBirim: 'MW' }),
    ]);
    expect(o.kapasite.toplam).toBe(165);
    expect(o.kapasite.birim).toBe('MW');
    expect(o.kapasite.karisikBirim).toBe(false);
  });
});

describe('Karne · farklı ölçüler toplanmaz', () => {
  it('iki sektöre yayılan kapsamda TOPLAM ÜRETİLMEZ [RAP-KRN-002]', () => {
    /* İki farklı büyüklüğü toplayıp tek birimle etiketlemek, yanlış bir
       sayıyı doğru gibi göstermekti. Sayı da yazılmaz, birim de:
       ikisinden birini bırakmak okuyucuya toplanabilir bir büyüklük
       olduğunu söylerdi. */
    const o = karneOzeti([
      satir({ id: 'a', guc: 100, gucBirim: 'MW' }),
      satir({ id: 'b', guc: 120000, gucBirim: 'm³/gün' }),
    ]);
    expect(o.kapasite.karisikBirim).toBe(true);
    expect(o.kapasite.toplam).toBeNull();
    expect(o.kapasite.birim).toBeNull();
  });

  it('ölçülmemiş kapasite sıfır sayılmaz — sayım ayrı raporlanır [RAP-KRN-002]', () => {
    const o = karneOzeti([
      satir({ id: 'a', guc: 100, gucBirim: 'MW' }),
      satir({ id: 'b', guc: null, gucBirim: null }),
    ]);
    expect(o.kapasite.toplam).toBe(100);
    expect(o.kapasite.olculen).toBe(1);
    expect(o.kapasite.toplamKayit).toBe(2);
  });
});

describe('Karne · en zayıf seçimi', () => {
  it('ölçülmemiş kayıt "en zayıf" listesine GİRMEZ [RAP-KRN-001]', () => {
    /* Bilinmeyeni en kötü saymak, onu ölçülmüş gibi göstermenin başka
       bir biçimidir. */
    const z = enZayif([
      satir({ id: 'a', uyumYuzde: 40 }),
      satir({ id: 'b', uyumYuzde: null }),
      satir({ id: 'c', uyumYuzde: 55 }),
    ]);
    expect(z.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('artan yüzde sırası; eşitlikte ada göre [RAP-KRN-001]', () => {
    const z = enZayif([
      satir({ id: 'zeta', uyumYuzde: 50 }),
      satir({ id: 'alfa', uyumYuzde: 50 }),
      satir({ id: 'beta', uyumYuzde: 10 }),
    ]);
    expect(z.map((s) => s.id)).toEqual(['beta', 'alfa', 'zeta']);
  });

  it('en fazla beş kayıt döner [RAP-KRN-001]', () => {
    const cok = Array.from({ length: 9 }, (_, i) =>
      satir({ id: `s${i}`, uyumYuzde: i * 5 }));
    expect(enZayif(cok)).toHaveLength(5);
  });
});

describe('Karne · mercek kapsamı daraltır', () => {
  it('mercek yokken bütün kayıtlar görünür [RAP-KRN-002]', () => {
    const hepsi = [satir({ id: 'a', sektorId: 'S1' }), satir({ id: 'b', sektorId: 'S2' })];
    expect(mercekle(hepsi, null)).toHaveLength(2);
  });

  it('mercek varken YALNIZ o sektörün kayıtları kalır [RAP-KRN-002]', () => {
    const hepsi = [
      satir({ id: 'a', sektorId: 'S1' }),
      satir({ id: 'b', sektorId: 'S2' }),
      /* Sektörü BİLİNMEYEN kayıt hiçbir merceğe girmez: bir kovaya
         atmak bilinmeyeni o sektöre ait saymak olurdu. */
      satir({ id: 'c', sektorId: null }),
    ];
    expect(mercekle(hepsi, 'S1').map((s) => s.id)).toEqual(['a']);
  });
});
