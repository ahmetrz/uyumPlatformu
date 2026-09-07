import { describe, expect, it } from 'vitest';
import {
  CEKIRDEK_TERIMLER, sozlukKur, t, tBas,
  type Bicim, type Sozluk, type TerimAnahtari,
} from '@/lib/dil/terimler';

/* ═══════════════════════════════════════════════════════════════════════
   P1 · terim sözlüğü (URN-ALN-004)

   Sınav: AYNI kod, sözlük kuruluyken sektörün sözcüğünü, sözlüksüzken
   çekirdek sözcüğü versin. İkisi de görünsün diye iki ayrı bileşen
   yazılsaydı, ikisi ilk değişiklikte ayrışırdı.
   ═══════════════════════════════════════════════════════════════════════ */

const BICIMLER: Bicim[] = ['tekil', 'cogul', 'iyelik', 'belirtme', 'bulunma', 'yonelme'];

/** Enerji sözlüğü — `prisma/seed.ts` içindeki satırların aynısı. */
const ENERJI: Sozluk = sozlukKur([
  { anahtar: 'tesis', tekil: 'santral', cogul: 'santraller', iyelik: 'santralin',
    belirtme: 'santrali', bulunma: 'santralde', yonelme: 'santrale' },
  { anahtar: 'birim', tekil: 'üretim ünitesi', cogul: 'üretim üniteleri',
    iyelik: 'üretim ünitesinin', belirtme: 'üretim ünitesini',
    bulunma: 'üretim ünitesinde', yonelme: 'üretim ünitesine' },
  { anahtar: 'tesis360', tekil: 'Santral 360', cogul: 'Santral 360',
    iyelik: 'Santral 360', belirtme: 'Santral 360', bulunma: 'Santral 360',
    yonelme: 'Santral 360' },
]);

describe('Terim sözlüğü (§P1)', () => {
  it('ekran adı sözlükle "Santral 360", sözlüksüz "Tesis 360" [URN-ALN-004]', () => {
    expect(t(ENERJI, 'tesis360')).toBe('Santral 360');
    expect(t(null, 'tesis360')).toBe('Tesis 360');
  });

  /* URN-ALN-003 (UI bekçi testi) HENÜZ YOK — Aşama F. Bu vaka onun yerine
     geçmez: yalnız SÖZLÜĞÜN çekirdek karşılıklarını ölçer, ekranlardaki
     sabit metinleri değil. O yüzden 003 değil 004 ile işaretli. */
  it('çekirdek karşılıklar hiçbir sektör sözcüğü taşımaz [URN-ALN-004]', () => {
    /* Çekirdek "santral" derse, sektör paketi kurmayan kiracı enerji
       sözcüğü görür — ürünün tamamı bu ayrımın üstünde duruyor. */
    const yasak = /santral|ünite|MWe|jeotermal|türbin/i;
    const kirli: string[] = [];
    for (const anahtar of Object.keys(CEKIRDEK_TERIMLER) as TerimAnahtari[]) {
      for (const bicim of BICIMLER) {
        const deger = CEKIRDEK_TERIMLER[anahtar][bicim];
        if (yasak.test(deger)) kirli.push(`${anahtar}.${bicim}="${deger}"`);
      }
    }
    expect(kirli, 'çekirdek sözlükte sektör sözcüğü').toEqual([]);
  });

  it('her çekirdek terimin ALTI biçimi de dolu', () => {
    /* Eksik bir çekirdek biçim `undefined` yayar ve ekranda "undefined"
       yazar; sektör sözlüğü eksik olabilir, çekirdek olamaz. */
    for (const anahtar of Object.keys(CEKIRDEK_TERIMLER) as TerimAnahtari[]) {
      for (const bicim of BICIMLER) {
        expect(CEKIRDEK_TERIMLER[anahtar][bicim], `${anahtar}.${bicim}`).toBeTruthy();
      }
    }
  });

  it('Türkçe hâller BİRLEŞTİRİLMEZ, sözlükten okunur', () => {
    /* "santral" + "in" tesadüfen doğru çıkar; "üretim ünitesi" + "in"
       ("üretim ünitesiin") çıkmaz. Testin ölçtüğü şey budur. */
    expect(t(ENERJI, 'birim', 'iyelik')).toBe('üretim ünitesinin');
    expect(t(ENERJI, 'birim', 'bulunma')).toBe('üretim ünitesinde');
    expect(t(null, 'birim', 'iyelik')).toBe('birimin');
  });

  it('sektör sözlüğünde olmayan terim ÇEKİRDEĞE düşer', () => {
    // Enerji sözlüğü `varlik` tanımlamıyor: ekran boş kalmaz.
    expect(t(ENERJI, 'varlik', 'cogul')).toBe('varlıklar');
  });

  it('yarım sektör satırı yalnız EKSİK biçimde çekirdeğe düşer', () => {
    const yarim = sozlukKur([{ anahtar: 'tesis', tekil: 'tesis birimi', cogul: null,
      iyelik: null, belirtme: null, bulunma: null, yonelme: null }]);
    expect(t(yarim, 'tesis')).toBe('tesis birimi');
    expect(t(yarim, 'tesis', 'cogul')).toBe('tesisler');
    expect(t(yarim, 'tesis', 'bulunma')).toBe('tesiste');
  });

  it('boş dize çeviri sayılmaz', () => {
    const bos = sozlukKur([{ anahtar: 'tesis', tekil: '', cogul: '', iyelik: null,
      belirtme: null, bulunma: null, yonelme: null }]);
    expect(t(bos, 'tesis')).toBe('tesis');
  });

  it('çekirdeğin tanımadığı anahtar ATLANIR', () => {
    const yabanci = sozlukKur([{ anahtar: 'turbin', tekil: 'türbin', cogul: null,
      iyelik: null, belirtme: null, bulunma: null, yonelme: null }]);
    expect(Object.keys(yabanci)).toEqual([]);
  });

  it('cümle başı büyütmesi Türkçe yerel ayarla yapılır (i → İ)', () => {
    /* `toUpperCase()` "i"yi "I" yapar ve "Işletme" yazar. Sözlükten gelen
       her sözcük bu yoldan geçiyor. */
    const il = sozlukKur([{ anahtar: 'tesis', tekil: 'iletim merkezi', cogul: null,
      iyelik: null, belirtme: null, bulunma: null, yonelme: null }]);
    expect(tBas(il, 'tesis')).toBe('İletim merkezi');
    expect(tBas(ENERJI, 'birim', 'cogul')).toBe('Üretim üniteleri');
  });
});
