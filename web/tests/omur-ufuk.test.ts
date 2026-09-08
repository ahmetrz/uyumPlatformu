import { describe, expect, it } from 'vitest';
import { ufukBantlari, ufukUzunlugu } from '@/app/(kabuk)/(operasyonel)/omur/mantik';

/* Ömür şeridinin ACİLİYET BANTLARI — saf mantık, tarayıcısız.

   Bantlar bir DEĞER değil ÖLÇEKTİR: şeridin arkasında durup "bu kadarı
   90 günün içinde" der. Bir ölçek işareti, işaret ettiği yer yoksa ölçek
   değil GÜRÜLTÜDÜR — ve bu dosyanın sınadığı kusur tam olarak buydu.

   `ufukUzunlugu` ufku TAM AY adımlarına kuantalar ve tabanı 12 aydır:
   12 × 30,44 = 365,28 gün. `BANT_1Y` ise 365 gündür. Aradaki 0,28 gün
   yüzünden ham `uzunluk > BANT_1Y` karşılaştırması 12 aylık ufukta da
   `>1 yıl` bandını üretiyordu: şeridin %0,08'i. ÖLÇÜLDÜ (üretim
   sunucusu): bant her ende 1px, etiketi şeridin 27px dışında, sayfa
   1440'ta 3px · 768'de 3px · 375'te 4px kayıyor. */

const GUN = 24 * 60 * 60 * 1000;
const SIMDI = Date.UTC(2026, 8, 7);

/** `ufukUzunlugu`nun gerçekten ürettiği uzunluk — elle sayı yazılmaz. */
const ufuk = (gunSonra: number | null) => ufukUzunlugu(
  gunSonra === null ? [null] : [SIMDI + gunSonra * GUN], SIMDI,
);

const adlar = (uzunluk: number) => ufukBantlari(uzunluk).map((b) => b.ad);

describe('ömür ufku · aciliyet bantları', () => {
  it('12 ay tabanında ">1 yıl" bandı ÇİZİLMEZ', () => {
    /* Taban ufuk: ileri tarihli karar yok. Bir yılın ötesinde
       gösterilecek bir şey de yoktur — taban 12 ise en uzak karar 11 ay
       içindedir. */
    expect(adlar(ufuk(null))).toEqual(['şimdi', '<90 gün', '<1 yıl']);
  });

  it('en uzak karar 11 ay içindeyken de çizilmez — ufuk yine tabanda', () => {
    expect(ufuk(300)).toBe(ufuk(null));
    expect(adlar(ufuk(300))).not.toContain('>1 yıl');
  });

  it('ufuk bir yılı BİR AY aşınca (13 ay) bant belirir', () => {
    const u = ufuk(350); // ≈11,5 ay → ceil+1 = 13 ay
    expect(u).toBeGreaterThan(ufuk(null));
    expect(adlar(u)).toEqual(['şimdi', '<90 gün', '<1 yıl', '>1 yıl']);
  });

  it('belirdiğinde bant KIL PAYI değildir — şeridin %5\'inden geniştir', () => {
    /* Kusurun ölçüsü buydu: 12 ayda bant şeridin %0,08\'iydi ve kendi
       adını taşıyamıyordu. Belirdiği ilk adımda (13 ay) %7,7\'dir. */
    const [uzak] = ufukBantlari(ufuk(350)).filter((b) => b.sinif === 'bant-uzak');
    expect(uzak.son - uzak.bas).toBeGreaterThan(0.05);
  });

  it('uzun ufukta bant büyür ve <1 yıl bandı yerinde kalır', () => {
    const u = ufuk(900); // ≈29,6 ay → 31 ay
    const b = ufukBantlari(u);
    const yil = b.find((x) => x.sinif === 'bant-1y');
    const uzak = b.find((x) => x.sinif === 'bant-uzak');
    expect(yil?.son).toBeCloseTo(uzak?.bas ?? -1, 10);
    expect((uzak?.son ?? 0) - (uzak?.bas ?? 0)).toBeGreaterThan(0.5);
  });

  it('"şimdi" bandı bilerek SIFIR genişliktedir ve hep çizilir', () => {
    for (const gun of [null, 300, 350, 900]) {
      const [ilk] = ufukBantlari(ufuk(gun));
      expect(ilk.sinif).toBe('bant-simdi');
      expect(ilk.son - ilk.bas).toBe(0);
    }
  });
});
