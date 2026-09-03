import { describe, expect, it } from 'vitest';
import { ayniKimlikMi, kimlikKatla } from '@/lib/alan/metin';

/* Bu dosyanın var olma sebebi ölçülmüş bir kusurdur: zafiyet
   korelasyonunda `'SIEMENS'` ile `'Siemens'` eşleşmiyordu, çünkü
   karşılaştırma Türkçe katlama kullanıyordu ve Türkçe'de `I`nin küçüğü
   noktasız `ı`dır. Üreticisi büyük harfle yazılmış her cihazın zafiyeti
   ekranda hiç görünmezdi. */

describe('Kimlik katlama · Türkçe I tuzağı', () => {
  it('JavaScript ve Türkçe katlamaları GERÇEKTEN ayrışır', () => {
    /* Kusurun kaynağını teste yazıyoruz: bir gün biri "neden özel bir
       katlama var" diye sorduğunda cevabı burada bulsun. */
    expect('SIEMENS'.toLocaleLowerCase('tr')).toBe('sıemens');
    expect('SIEMENS'.toLowerCase()).toBe('siemens');
    expect('SIEMENS'.toLocaleLowerCase('tr')).not.toBe('SIEMENS'.toLowerCase());
  });

  it('büyük/küçük yazım kimliği değiştirmez', () => {
    for (const [a, b] of [
      ['SIEMENS', 'Siemens'], ['CISCO', 'cisco'], ['ABB', 'abb'],
      ['SIMATIC', 'simatic'], ['Schneider', 'SCHNEIDER'],
    ]) {
      expect(ayniKimlikMi(a, b), `${a} ↔ ${b}`).toBe(true);
    }
  });

  it('ayraçlar ve boşluklar kimliği değiştirmez', () => {
    for (const [a, b] of [
      ['S7-1500', 's7 1500'], ['S7_1500', 'S7.1500'], ['AC 500', 'ac500'],
      ['MiCOM/P141', 'micom p141'],
    ]) {
      expect(ayniKimlikMi(a, b), `${a} ↔ ${b}`).toBe(true);
    }
  });

  it('I ailesinin tamamı tek harfe iner', () => {
    expect(kimlikKatla('İIıi')).toBe('iiii');
    expect(ayniKimlikMi('KIZILDERE', 'kizildere')).toBe(true);
  });

  it('gerçekten farklı kimlikler ayrı kalır', () => {
    expect(ayniKimlikMi('S7-1500', 'S7-1200')).toBe(false);
    expect(ayniKimlikMi('Siemens', 'Schneider')).toBe(false);
  });
});

describe('Kimlik katlama · boş girdi eşleşme SAYILMAZ', () => {
  it('boş ve null girdi null döner', () => {
    for (const bos of [null, undefined, '', '   ', '---', '  ._-  ']) {
      expect(kimlikKatla(bos), String(bos)).toBeNull();
    }
  });

  it('iki boş kimlik AYNI sayılmaz', () => {
    /* Aksi hâlde üreticisi de modeli de boş iki kayıt "aynı ürün" diye
       eşleşir ve advisory bütün kimliksiz cihazlara yapışırdı. */
    expect(ayniKimlikMi(null, null)).toBe(false);
    expect(ayniKimlikMi('', '')).toBe(false);
    expect(ayniKimlikMi('Siemens', null)).toBe(false);
  });
});
