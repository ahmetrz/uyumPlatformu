import { describe, expect, it } from 'vitest';
import {
  aralikMetni, araliktaMi, asgariyiKarsilarMi, karsilastir, surumCozumle, tekSurumAraligi,
} from '@/lib/alan/surum';

/* Sürüm karşılaştırması firmware uyumunun (OT-22), CVE korelasyonunun
   (OT-25) ve SBOM eşlemesinin (OT-26) ortak matematiğidir. Buradaki bir
   kusur üç modülde birden yanlış cevap üretir; bu yüzden testler kenar
   durumlara yüklenir. */

describe('Sürüm · dize karşılaştırması YASAK olduğu için', () => {
  it('1.10.0, 1.9.0\'dan BÜYÜKTÜR (dizede küçüktür)', () => {
    expect('1.10.0' < '1.9.0').toBe(true);          // dizenin yalanı
    expect(karsilastir('1.10.0', '1.9.0')).toBe(1); // sayının gerçeği
  });

  it('çok haneli parçalar doğru sıralanır', () => {
    expect(karsilastir('2.100.0', '2.99.9')).toBe(1);
    expect(karsilastir('1.0.0', '1.0.0.1')).toBe(-1);
    expect(karsilastir('1.0.0.0', '1.0.0')).toBe(0); // eksik hane 0 sayılır
  });

  it('baştaki sıfırlar sürümü değiştirmez', () => {
    expect(karsilastir('01.02.03', '1.2.3')).toBe(0);
  });
});

describe('Sürüm · sahadaki biçimler', () => {
  it('öntakılar atılır', () => {
    for (const s of ['v1.2.3', 'V1.2.3', 'R1.2.3', 'rev 1.2.3', 'FW-1.2.3']) {
      expect(karsilastir(s, '1.2.3'), s).toBe(0);
    }
  });

  it('farklı ayırıcılar kabul edilir', () => {
    for (const s of ['1-2-3', '1_2_3', '1 2 3', '1:2:3']) {
      expect(karsilastir(s, '1.2.3'), s).toBe(0);
    }
  });

  it('harfle biten sürüm çözümlenir ve önsürüm sayılır', () => {
    const s = surumCozumle('2.9.0b');
    expect(s?.parcalar).toEqual([2, 9, 0]);
    expect(s?.onsurum).toBe('b');
  });

  it('dört parçalı OT sürümleri çözümlenir', () => {
    expect(surumCozumle('4.0.0.15')?.parcalar).toEqual([4, 0, 0, 15]);
  });
});

describe('Sürüm · KARŞILAŞTIRILAMAZ eşit DEĞİLDİR', () => {
  it('çözümlenemeyen girdi null döner, 0 değil', () => {
    for (const bozuk of ['', '   ', 'bilinmiyor', 'N/A', 'latest', null, undefined]) {
      expect(karsilastir(bozuk, '1.0.0'), String(bozuk)).toBeNull();
      expect(karsilastir('1.0.0', bozuk), String(bozuk)).toBeNull();
    }
  });

  it('iki FARKLI önsürüm etiketi arasında sıra UYDURULMAZ', () => {
    /* `rc1` ile `beta` arasında evrensel bir sıra yoktur. Bir sıra
       varmış gibi davranmak, yanlış cevaptan daha kötüdür: cevap
       kendinden emin görünür. */
    expect(karsilastir('1.0.0-rc1', '1.0.0-beta')).toBeNull();
    expect(karsilastir('1.0.0-rc1', '1.0.0-rc1')).toBe(0);
  });

  it('yayın sürümü önsürümden büyüktür', () => {
    expect(karsilastir('1.2.0', '1.2.0-rc1')).toBe(1);
    expect(karsilastir('1.2.0-rc1', '1.2.0')).toBe(-1);
  });
});

/** -1 / 0 / 1 — `-0` üretmez (bkz. bakışım testi). */
function isaret(n: number): -1 | 0 | 1 {
  if (n < 0) return -1;
  if (n > 0) return 1;
  return 0;
}

describe('Sürüm · sıralama tutarlıdır', () => {
  const sirali = ['1.0.0', '1.0.1', '1.2.0', '1.10.0', '2.0.0', '10.0.0'];

  it('artan dizide her komşu çift doğru sıralanır', () => {
    for (let i = 0; i < sirali.length - 1; i += 1) {
      expect(karsilastir(sirali[i], sirali[i + 1]), `${sirali[i]} < ${sirali[i + 1]}`).toBe(-1);
    }
  });

  it('karşılaştırma bakışımlıdır (a<b ⟺ b>a) ve dönüşlüdür', () => {
    for (const a of sirali) {
      expect(karsilastir(a, a)).toBe(0);
      for (const b of sirali) {
        const ab = karsilastir(a, b);
        const ba = karsilastir(b, a);
        expect(ab).not.toBeNull();
        /* Kendi işaret yardımcımız: JavaScript'te `-(0)` ve `Math.sign(-0)`
           `-0` üretir, `Object.is(-0, 0)` ise false döner — testin kendi
           tuzağı, kodun kusuru değil. */
        expect(isaret(ba as number)).toBe(isaret(-(ab as number)));
      }
    }
  });

  it('geçişlidir (a<b ve b<c ⇒ a<c)', () => {
    for (let i = 0; i < sirali.length; i += 1) {
      for (let j = i + 1; j < sirali.length; j += 1) {
        for (let k = j + 1; k < sirali.length; k += 1) {
          expect(karsilastir(sirali[i], sirali[k]), `${sirali[i]} < ${sirali[k]}`).toBe(-1);
        }
      }
    }
  });
});

describe('Sürüm aralığı · advisory korelasyonu', () => {
  const aralik = { alt: '2.0.0', altDahil: true, ust: '2.4.5', ustDahil: false };

  it('uç noktalar sözleşmeye göre dahil/hariç', () => {
    expect(araliktaMi('2.0.0', aralik)).toBe(true);   // alt dahil
    expect(araliktaMi('1.9.9', aralik)).toBe(false);
    expect(araliktaMi('2.4.4', aralik)).toBe(true);
    expect(araliktaMi('2.4.5', aralik)).toBe(false);  // üst hariç
    expect(araliktaMi('2.4.6', aralik)).toBe(false);
  });

  it('açık uçlu aralık çalışır', () => {
    expect(araliktaMi('99.0.0', { alt: '1.0.0', altDahil: true, ust: null, ustDahil: false })).toBe(true);
    expect(araliktaMi('0.1.0', { alt: null, altDahil: false, ust: '1.0.0', ustDahil: false })).toBe(true);
  });

  it('çözümlenemeyen sürüm için KARAR VERİLEMEZ — "etkilenmiyor" değil', () => {
    /* Korelasyonda en tehlikeli yanlış budur: sürümü okunamayan bir
       cihaz "temiz" görünürse zafiyet ekranda hiç belirmez. */
    expect(araliktaMi('bilinmiyor', aralik)).toBeNull();
    expect(araliktaMi(null, aralik)).toBeNull();
    expect(araliktaMi('', aralik)).toBeNull();
  });

  it('tek sürümlük aralık yalnız o sürümü kapsar', () => {
    const t = tekSurumAraligi('3.1.4');
    expect(araliktaMi('3.1.4', t)).toBe(true);
    expect(araliktaMi('3.1.3', t)).toBe(false);
    expect(araliktaMi('3.1.5', t)).toBe(false);
  });

  it('metin gösterimi okunur', () => {
    expect(aralikMetni(aralik)).toBe('≥ 2.0.0 ve < 2.4.5');
    expect(aralikMetni(tekSurumAraligi('1.0.0'))).toBe('yalnız 1.0.0');
    expect(aralikMetni({ alt: null, altDahil: false, ust: null, ustDahil: false })).toBe('tüm sürümler');
  });
});

describe('Asgari sürüm · unknown COMPLIANT sayılmaz', () => {
  it('kurulu sürüm asgariye eşit ya da büyükse karşılar', () => {
    expect(asgariyiKarsilarMi('2.0.0', '2.0.0')).toBe(true);
    expect(asgariyiKarsilarMi('2.0.1', '2.0.0')).toBe(true);
    expect(asgariyiKarsilarMi('1.9.9', '2.0.0')).toBe(false);
  });

  it('okunamayan kurulu sürüm null döner — uyumlu SAYILMAZ', () => {
    expect(asgariyiKarsilarMi(null, '2.0.0')).toBeNull();
    expect(asgariyiKarsilarMi('bilinmiyor', '2.0.0')).toBeNull();
    /* Çağıran `?? true` yazarsa kural bozulur; bu test o kusurun
       nöbetçisi değil ama sözleşmeyi kayda geçirir: null UYUMLU DEĞİL. */
    expect(asgariyiKarsilarMi('bilinmiyor', '2.0.0')).not.toBe(true);
  });
});
