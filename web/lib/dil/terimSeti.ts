import { CEKIRDEK_TERIMLER, terim, type Sozluk, type Terim } from './terimler';

/* ═══════════════════════════════════════════════════════════════════════
   TERİM SETİ — statik kataloğun sözlüğe bağlanma biçimi

   ── NİÇİN AYRI BİR MODÜL ──────────────────────────────────────────────
   Bu üç şey (`TerimSeti` · `Metin` · `CEKIRDEK_TERIM_SETI`) önce
   `lib/yonetim/moduller.ts` içinde yaşıyordu ve oradan iki kütük daha
   okuyordu. Sonuç ÖLÇÜLMÜŞ bir DÖNGÜ oldu:

     sahaModulleri → moduller → yapilandirma/tanimlar → sahaModulleri

   Döngü tsc'de ve `next build`de görünmüyordu; yalnız STATİK DEMO
   derlemesinde (`arac/marka-kapisi.mjs`, `NEXT_PUBLIC_DEMO=1`) ön
   render sırasında patlıyordu:

     ReferenceError: Cannot access 'k' before initialization
       at SAHA_YERLESIM_VARSAYILAN (lib/yonetim/moduller.ts)

   Yani kusur, döngünün hangi ucunun önce değerlendirildiğine bağlıydı
   ve derleme kipine göre görünüp kayboluyordu — en kötü tür.

   Çözüm bir sıralama hilesi DEĞİL, bağın kesilmesidir: ortak tipler
   yaprak bir modüle iner ve yalnız `lib/dil/terimler`den okur. Katalog
   modülleri (moduller · sahaModulleri · yapilandirma/tanimlar) artık
   birbirini değil, bu dosyayı okur.

   ── `Metin` NEDİR ─────────────────────────────────────────────────────
   Modül seviyesindeki bir katalog `await` edemez, dolayısıyla sözlüğü
   bekleyemez. Terim taşıyan alan bu yüzden bir İŞLEVDİR: katalog
   çözülmemiş durur, render sınırında (sunucu bileşeni ya da
   `useTerim()` çağıran istemci) `…Coz(terimSeti(sozluk))` ile çözülür.
   Terim taşımayan alan düz dize kalır — her satırı işleve çevirmek
   kütüğü okunmaz yapardı.
   ═══════════════════════════════════════════════════════════════════════ */

/** Statik kataloğun ihtiyaç duyduğu terimler; sözlüğün tamamı değil. */
export type TerimSeti = Record<'tesis' | 'birim' | 'portfoy' | 'tesis360', Terim>;

/** Katalog metni: terim taşımıyorsa dize, taşıyorsa çözücü işlev. */
export type Metin = string | ((x: TerimSeti) => string);

/** Sözlük yokken (sektör paketi kurulu değil ya da kapsam tek sektöre
    inmiyor) ekranda görünen sözcükler. */
export const CEKIRDEK_TERIM_SETI: TerimSeti = {
  tesis: CEKIRDEK_TERIMLER.tesis, birim: CEKIRDEK_TERIMLER.birim,
  portfoy: CEKIRDEK_TERIMLER.portfoy, tesis360: CEKIRDEK_TERIMLER.tesis360,
};

/** Sözlükten terim seti kurar. */
export function terimSeti(sozluk: Sozluk | null | undefined): TerimSeti {
  return {
    tesis: terim(sozluk, 'tesis'), birim: terim(sozluk, 'birim'),
    portfoy: terim(sozluk, 'portfoy'), tesis360: terim(sozluk, 'tesis360'),
  };
}

/** Tek bir katalog alanını çözer. */
export const coz = (m: Metin, x: TerimSeti) => (typeof m === 'string' ? m : m(x));
