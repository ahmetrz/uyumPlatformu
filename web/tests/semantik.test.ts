import { describe, it, expect } from 'vitest';
import { uyumOzeti, kanitTazelik, eolDurumu, gecikmisMi } from '@/lib/sabitler';

describe('Uyum semantiği — Unknown asla 0 sayılmaz (§55)', () => {
  it('değerlendirilmemiş kayıtlar yüzdeyi DÜŞÜRMEZ, ayrı raporlanır', () => {
    const o = uyumOzeti({ uyumlu: 2, degerlendirilmedi: 8 });
    expect(o.yuzde).toBe(100);         // değerlendirilen 2/2 uyumlu
    expect(o.bilinmeyenOran).toBe(80); // ama %80'i bilinmiyor — görünür
  });

  it('hiç değerlendirme yoksa yüzde null (0 DEĞİL)', () => {
    const o = uyumOzeti({ degerlendirilmedi: 5, incelemede: 3 });
    expect(o.yuzde).toBeNull();
    expect(o.bilinmeyenOran).toBe(100);
  });

  it('kapsam dışı her iki paydanın da dışında', () => {
    const o = uyumOzeti({ uyumlu: 1, uyumsuz: 1, kapsamdisi: 10 });
    expect(o.yuzde).toBe(50);
    expect(o.kapsam).toBe(2);
  });

  it('kısmi 0.5 ağırlıklı', () => {
    expect(uyumOzeti({ uyumlu: 1, kismi: 2, uyumsuz: 1 }).yuzde).toBe(50);
  });
});

describe('Kanıt tazeliği', () => {
  const gun = (n: number) => new Date(Date.now() - n * 86_400_000);
  it('<90 taze, 90-180 yenilenmeli, >180 süresi doldu', () => {
    expect(kanitTazelik(gun(30)).durum).toBe('uyumlu');
    expect(kanitTazelik(gun(120)).durum).toBe('kismi');
    expect(kanitTazelik(gun(200)).durum).toBe('uyumsuz');
  });
});

describe('EOL/EOS — bilinmeyen ayrı durumdur', () => {
  it('tarih yoksa "Bilinmiyor" (destekte SAYILMAZ)', () => {
    expect(eolDurumu(null).durum).toBe('degerlendirilmedi');
    expect(eolDurumu(null).etiket).toBe('Bilinmiyor');
  });
  it('geçmiş tarih = destek bitti', () => {
    expect(eolDurumu(new Date(Date.now() - 86_400_000)).durum).toBe('uyumsuz');
  });
});

describe('gecikmisMi', () => {
  it('kapalı kayıt gecikmiş sayılmaz', () => {
    expect(gecikmisMi(new Date(Date.now() - 86_400_000), 'kapali')).toBe(false);
    expect(gecikmisMi(new Date(Date.now() - 86_400_000), 'acik')).toBe(true);
  });
});
