import { describe, expect, it } from 'vitest';
import {
  OLCULMEMIS_ILK_KAC_TAVAN, OLCULMEMIS_VARSAYILAN,
  olculmemisDogrula, olculmemisMetni, olculmemisNormalle, ozetKur,
} from '@/lib/yonetim/olculmemisGosterimi';

/* Saha ekranındaki "değerlendirilmemiş" özetinin kuralları.

   En önemlisi ilk bloktur: SAYI KAPATILAMAZ. Bu bir sunum tercihi değil,
   "bilinmeyen ≠ sıfır" kuralının ekrandaki karşılığıdır — bugün portföyün
   on altı santralinden on biri hiç ölçülmemiştir ve bunu gizleyebilen bir
   ayar, ölçülmemiş bir portföyü ölçülmüş gibi gösterirdi. */

describe('Değerlendirilmemiş özeti · yönetilemez olan', () => {
  it('gösterimi tamamen kapatan bir değer REDDEDİLİR', () => {
    for (const kapatma of ['kapali', 'gizli', 'yok', false, null]) {
      const s = olculmemisDogrula({ gosterim: kapatma, ilkKac: 3, detay: 'panel' });
      expect(s.ok, `gosterim=${String(kapatma)} kabul edilmemeliydi`).toBe(false);
    }
  });

  it('reddin gerekçesi kullanıcıya kuralı söyler', () => {
    const s = olculmemisDogrula({ gosterim: 'kapali', ilkKac: 3, detay: 'panel' });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toContain('kapatılamaz');
  });

  it('varsayılan kendi doğrulamasından geçer', () => {
    expect(olculmemisDogrula(OLCULMEMIS_VARSAYILAN).ok).toBe(true);
  });
});

describe('Değerlendirilmemiş özeti · yönetilebilen', () => {
  it('iki gösterim kipi de geçerlidir', () => {
    for (const g of ['ozet', 'sayi'] as const) {
      expect(olculmemisDogrula({ gosterim: g, ilkKac: 2, detay: 'panel' }).ok).toBe(true);
    }
  });

  it('detay panelde açılabilir ya da kapalı olabilir', () => {
    for (const d of ['panel', 'kapali'] as const) {
      expect(olculmemisDogrula({ gosterim: 'ozet', ilkKac: 3, detay: d }).ok).toBe(true);
    }
  });

  it('ilkKac sınırların dışına çıkamaz', () => {
    expect(olculmemisDogrula({ gosterim: 'ozet', ilkKac: 0, detay: 'panel' }).ok).toBe(true);
    expect(olculmemisDogrula({ gosterim: 'ozet', ilkKac: OLCULMEMIS_ILK_KAC_TAVAN, detay: 'panel' }).ok).toBe(true);
    expect(olculmemisDogrula({ gosterim: 'ozet', ilkKac: -1, detay: 'panel' }).ok).toBe(false);
    expect(olculmemisDogrula({ gosterim: 'ozet', ilkKac: OLCULMEMIS_ILK_KAC_TAVAN + 1, detay: 'panel' }).ok).toBe(false);
    expect(olculmemisDogrula({ gosterim: 'ozet', ilkKac: 2.5, detay: 'panel' }).ok).toBe(false);
  });

  it('bozuk kayıt ekranı boş bırakmaz, kod varsayılanına düşer', () => {
    for (const bozuk of [null, undefined, 'metin', 42, {}, { gosterim: 'ozet' }]) {
      expect(olculmemisNormalle(bozuk)).toEqual(OLCULMEMIS_VARSAYILAN);
    }
  });

  it('konsol özeti insan cümlesidir', () => {
    expect(olculmemisMetni({ gosterim: 'ozet', ilkKac: 3, detay: 'panel' }))
      .toBe('özet · ilk 3 ad · detay: panelde açılır');
    expect(olculmemisMetni({ gosterim: 'sayi', ilkKac: 3, detay: 'kapali' }))
      .toBe('yalnız sayı · detay: kapalı');
  });
});

/* ── "+N diğer" DOĞRU olmak zorundadır ────────────────────────────────
   Ekranda "Alaşehir JES · İkizdere HES · Demirciler RES  +8 diğer" yazar.
   Bu cümle ancak yazılan ad sayısı + N === toplam ise doğrudur. İlk
   uygulamada özet başlıkla aynı satırdaydı, CSS adlardan ikisini üç
   noktayla yutuyordu ve ekranda 1 ad + "+8 diğer" görünüyordu — 11 - 1 = 10
   iken. Kusur ölçümle yakalandı (1366×768), özet kendi satırına alındı ve
   adların kesilmesi kaldırıldı. Aşağıdaki değişmez o kusurun nöbetçisidir. */
describe('Değerlendirilmemiş özeti · "+N diğer" değişmezi', () => {
  const adlar = ['Alaşehir JES', 'İkizdere HES', 'Demirciler RES', 'Kuzgun HES', 'Mercan HES'];

  it('gösterilen + kalan HER ZAMAN toplamı verir', () => {
    for (const gosterim of ['ozet', 'sayi'] as const) {
      for (let ilkKac = 0; ilkKac <= OLCULMEMIS_ILK_KAC_TAVAN; ilkKac += 1) {
        for (let n = 0; n <= adlar.length; n += 1) {
          const { gosterilen, kalan } = ozetKur(adlar.slice(0, n), { gosterim, ilkKac, detay: 'panel' });
          expect(gosterilen.length + kalan, `gosterim=${gosterim} ilkKac=${ilkKac} n=${n}`).toBe(n);
          expect(kalan).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('yalnız sayı kipinde hiç ad yazılmaz, kalan toplamın kendisidir', () => {
    const { gosterilen, kalan } = ozetKur(adlar, { gosterim: 'sayi', ilkKac: 3, detay: 'panel' });
    expect(gosterilen).toEqual([]);
    expect(kalan).toBe(adlar.length);
  });

  it('istenen ad sayısı listeden çoksa taşma olmaz', () => {
    const { gosterilen, kalan } = ozetKur(['Tek Santral'], { gosterim: 'ozet', ilkKac: 5, detay: 'panel' });
    expect(gosterilen).toEqual(['Tek Santral']);
    expect(kalan).toBe(0);
  });

  it('adlar listedeki SIRAYI korur — özetteki üç ad panelin ilk üçüdür', () => {
    const { gosterilen } = ozetKur(adlar, { gosterim: 'ozet', ilkKac: 3, detay: 'panel' });
    expect(gosterilen).toEqual(adlar.slice(0, 3));
  });
});
