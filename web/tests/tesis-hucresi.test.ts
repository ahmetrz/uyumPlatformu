import { describe, expect, it } from 'vitest';
import { tesisHucresiMetni, type TesisHucresi } from '@/lib/dil/hucre';
import type { Sozluk } from '@/lib/dil/terimler';

/* ═══════════════════════════════════════════════════════════════════════
   TESİS HÜCRESİ — mantık olguyu döner, sözcüğü dil katmanı koyar

   Kapatılan kusur: iki `mantik.ts` modülü `santralMetni()` adıyla METİN
   üretiyordu ve içinde "santral" · "portföy" sabitleri vardı. Sektör
   sözcüğü çekirdek mantığa gömülüydü; kiracının sektörü değiştiğinde
   ekran yanlış sözcüğü yazar ve bunu söyleyecek hiçbir şey olmazdı.
   ═══════════════════════════════════════════════════════════════════════ */

const SEKTOR: Sozluk = {
  tesis: { tekil: 'santral', cogul: 'santraller' },
  portfoy: { tekil: 'filo' },
};

describe('tesis hücresi · sözcük sözlükten gelir', () => {
  it('ÇEKİRDEK sözlük sektörsüz yazar', () => {
    expect(tesisHucresiMetni({ tur: 'coklu', sayi: 3 }, null)).toBe('3 tesis');
    expect(tesisHucresiMetni({ tur: 'portfoy' }, null)).toBe('portföy');
  });

  it('SEKTÖR sözlüğü aynı olguyu kendi sözcüğüyle yazar', () => {
    /* Kusurun kanıtı: eskiden bu çıktı KODDA sabitti ve sözlük ne derse
       desin değişmezdi. */
    expect(tesisHucresiMetni({ tur: 'coklu', sayi: 3 }, SEKTOR)).toBe('3 santral');
    expect(tesisHucresiMetni({ tur: 'portfoy' }, SEKTOR)).toBe('filo');
  });

  it('sayıdan sonra TEKİL biçim — "3 tesisler" yanlıştır', () => {
    /* Türkçede sayı çoğul eki almaz. Sözlükte çoğul biçim DURUYOR ve
       başka bağlamlarda kullanılıyor; burada bilerek çağrılmıyor. */
    expect(tesisHucresiMetni({ tur: 'coklu', sayi: 2 }, SEKTOR)).not.toContain('santraller');
  });

  it('KAYIT ADI çevrilmez — veri, terim değildir', () => {
    const ad = 'Saha A-3';
    expect(tesisHucresiMetni({ tur: 'ad', ad }, SEKTOR)).toBe(ad);
    expect(tesisHucresiMetni({ tur: 'ad', ad }, null)).toBe(ad);
  });

  it('BOŞ ile PORTFÖY ayrı değerlerdir — birleştirilemez', () => {
    /* "Kapsam yok" ile "kapsam her yer" aynı sözcükle yazılamaz; üç
       değerli mantık kuralının aynısı (bilinmeyen ≠ sıfır). */
    const bos = tesisHucresiMetni({ tur: 'bos' }, SEKTOR);
    const portfoy = tesisHucresiMetni({ tur: 'portfoy' }, SEKTOR);
    expect(bos).not.toBe(portfoy);
    expect(bos).toBe('kapsam boş');
  });

  it('YARIM sözlük çekirdeğe düşer, boş bırakmaz', () => {
    const yarim: Sozluk = { tesis: { tekil: 'santral' } };
    expect(tesisHucresiMetni({ tur: 'coklu', sayi: 1 }, yarim)).toBe('1 santral');
    expect(tesisHucresiMetni({ tur: 'portfoy' }, yarim)).toBe('portföy');
  });

  it('dört türün HEPSİ karşılık üretir — sessiz boşluk yok', () => {
    const hepsi: TesisHucresi[] = [
      { tur: 'ad', ad: 'X' }, { tur: 'coklu', sayi: 2 }, { tur: 'portfoy' }, { tur: 'bos' },
    ];
    for (const h of hepsi) {
      expect(tesisHucresiMetni(h, null).length, `${h.tur} boş döndü`).toBeGreaterThan(0);
    }
  });
});
