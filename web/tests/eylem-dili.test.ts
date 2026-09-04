import { describe, expect, it } from 'vitest';
import { olc, BOZUK_DURUMLAR } from '../arac/eylem-dili.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   BOZUK DURUM NÖBETÇİSİ

   Boş bir ekranda bozuk durum bloğunun cümlesi ekranın TEK içeriğidir ve
   ürünün en çok okunan cümlesidir. Kullanıcı o anda iki şey sorar: *ne
   oldu* ve *şimdi ne yapabilirim.* Ürün uzun süre yalnız birincisini
   cevapladı: ilk tarama eylem taşımayan ELLİ blok buldu.

   Bu nöbetçi ikinci sorunun cevapsız kalmasını engeller. `eylem` ya da
   `iyiHaber` verilmelidir:

     eylem     — yapılacak bir iş var, düğmesi burada.
     iyiHaber  — yokluk BEKLENEN durumdur ("elenen satır yok — hepsi
                 doğrulamayı geçti"). Yapılacak iş olmadığını söylemek de
                 bir cevaptır; sahte bir düğme koymak olmayan bir işi
                 varmış gibi göstermek olurdu.

   `iyiHaber` bir kaçış kapısı değildir: ekranda ayrı çizilir (yeşil sol
   kenar, "Beklenen durum" kaşı) ve yanlış kullanıldığı yerde ölçülmemiş
   bir boşluk "her şey yolunda" diye okunur — bu ürünün en sevmediği kusur.
   ═══════════════════════════════════════════════════════════════════ */

type Bulgu = { dosya: string; satir: number; bilesen: string; cumle: string };

describe('bozuk durum blokları', () => {
  const { eylemsiz, sistemDili } = olc() as {
    eylemsiz: Bulgu[]; sistemDili: { dosya: string; sozcuk: string }[];
  };

  it('her bozuk durum bloğu "şimdi ne yapabilirim" sorusunu cevaplar', () => {
    expect(eylemsiz.map((b) => `${b.bilesen} · ${b.dosya}:${b.satir}`)).toEqual([]);
  });

  it('son kullanıcı yüzeyinde geliştirici sözcüğü yoktur', () => {
    /* Bu aile bir kez temizlendi (docs/END_USER_UX_AUDIT.md · UX-0018);
       nöbet geri sızmasın diye tutuluyor. */
    expect(sistemDili.map((s) => `${s.sozcuk} · ${s.dosya}`)).toEqual([]);
  });

  it('tarama kör kalmamış — bozuk durum ailesi eksiksiz', () => {
    /* Bileşen listesi daralırsa yukarıdaki iki test de sessizce yeşil
       kalırdı: aranmayan bir şey bulunamaz. */
    for (const ad of ['BosIlk', 'Olculmedi', 'BaglantiYok', 'EntegrasyonYok',
      'KismiVeri', 'Bakimda']) {
      expect(BOZUK_DURUMLAR).toContain(ad);
    }
  });
});
