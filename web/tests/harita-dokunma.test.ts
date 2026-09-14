import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* ═══════════════════════════════════════════════════════════════════════
   HARİTA · DOKUNULABİLİRLİK (HRT-DOK-010 · HRT-DOK-011)

   Gerçek ölçü TARAYICIDADIR (`arac/harita-kanit.mjs`, `kanit:harita`):
   vuruş dairesinin ekranda kaç piksel olduğunu ancak orası söyler.
   Burada ölçülen o değil, KURALIN KENDİSİ ve kapının KÖR OLMADIĞIDIR —
   kapı sınıf adlarına bakar ve bileşen bir adı değiştirirse kapı hiçbir
   şey bulamadan yeşil yanar.

   Ölçülen kusur (mobil audit, 375×812): vuruş dairesi SVG kullanıcı
   biriminde (`r = max(isaret.r, 11)`) veriliyordu. Tuval 960 birim geniş
   ve `width: 100%` çiziliyor; 375px'te daire ekranda 11px ÇAP oluyordu.
   Kaynağa bakan hiçbir test bunu göremez: kodda yazan sayı 11 ve doğru
   görünüyor. Bir ölçünün başka bir şeye SESSİZCE bağlı olması.
   ═══════════════════════════════════════════════════════════════════════ */

const ekran = readFileSync('app/(tam)/harita/HaritaIstemci.tsx', 'utf8');
const kapi = readFileSync('arac/harita-kanit.mjs', 'utf8');
const css = readFileSync('app/kabuk.css', 'utf8');

describe('harita · dokunma hedefi', () => {
  it('vuruş yarıçapı ÖLÇEKTEN türetilir, sabit yazılmaz [HRT-DOK-010]', () => {
    /* Ölçek çalışma anında ölçülür; sabit bir sayı tuval daralınca
       sessizce küçülürdü — kusur tam olarak buydu. */
    expect(ekran).toMatch(/ResizeObserver/);
    expect(ekran).toMatch(/setOlcek\(TUVAL\.en \/ en\)/);
    expect(ekran).toMatch(/const vurusR = 12 \* olcek;/);
    /* Yarıçap işaretin kendi halkasından KÜÇÜK olamaz: büyük güçlü
       tesisin halkası zaten 24px'i aşar ve onu küçültmek veriyi bozardı. */
    expect(ekran).toMatch(/r=\{Math\.max\(isaret\.r, vurusR\)\}/);
  });

  it('işarete ulaşmanın dokunulabilir karşılığı VAR [HRT-DOK-011]', () => {
    /* Liste bir süs değil: satır SEÇER (gezinmez), seçim `aria-pressed`
       ile ekran okuyucuya da söylenir. */
    expect(ekran).toMatch(/ab-harita-liste secilir/);
    expect(ekran).toMatch(/aria-pressed=\{secili === i\.id\}/);
    expect(ekran).toMatch(/onClick=\{\(\) => setSecili\(\(o\) => \(o === i\.id \? null : i\.id\)\)\}/);
    /* Durum TEK KANALA bağlı değil: glifin okunur bir adı var. */
    expect(ekran).toMatch(/DURUM_ADI\[i\.durum\]/);
    /* Boş panelin yerini liste aldı: "bir işarete tıklayın" deyip
       seçtirmeyen eski yüzey geri gelemez. */
    expect(ekran).not.toMatch(/İlk \{terim\('tesis'\)\} künyesini aç/);
  });

  /* ── SABOTAJ BULGUSU (R-E) ─────────────────────────────────────────
     Yukarıdaki vaka listenin VAR OLDUĞUNU ölçüyordu, GÖRÜNDÜĞÜNÜ değil.
     Sabotaj turunda `<ul … hidden>` yazıldığında kırmızı YANMADI: liste
     kaynakta duruyor, kullanıcı için yok. Sabotaj kusurun eski hâlini
     (küçük hedef TEK yol) birebir geri getiriyordu, yani bulgu testteydi.
     Vaka bu yüzden eklendi: listeyi kaynakta bırakıp gizleyen her yol —
     `hidden` özniteliği ya da CSS — artık kırmızıdır.

     Tarayıcı kapısı (`kanit:harita`) bunu zaten görürdü; ama sabotaj
     kütüğü vitest katmanını koşar ve o katmanın körlüğü kendi başına
     bir kusurdur: körlüğü "öbür kapı görür" diye bırakmak, iki kapının
     da birbirine güvendiği bir boşluk açar. */
  it('liste kaynakta durup GİZLENEMEZ [HRT-DOK-011]', () => {
    /* Öznitelik yolu: `hidden`, `aria-hidden`, sıfır boy. */
    const listeEtiketi = ekran.match(/<ul className="ab-harita-liste secilir"[^>]*>/);
    expect(listeEtiketi, 'liste etiketi bulunamadı — sınıf değişmiş olabilir').not.toBeNull();
    expect(listeEtiketi![0]).not.toMatch(/\bhidden\b|aria-hidden/);
    /* CSS yolu: liste ya da satırı gizleyen bir kural yok. */
    const gizleyen = (css.match(/[^{}]*\.(ab-harita-liste|satirdugme)[^{}]*\{[^}]*\}/g) ?? [])
      .filter((k) => /display:\s*none|visibility:\s*hidden/.test(k));
    expect(gizleyen, `listeyi gizleyen kural:\n${gizleyen.join('\n')}`).toEqual([]);
  });

  it('tarayıcı kapısı KÖR değil — seçicileri ekrana bağlı [HRT-DOK-011]', () => {
    for (const sec of ['ab-harita-liste .satirdugme', 'isaret .vurus', 'isaret.secili']) {
      expect(kapi, `kapı "${sec}" seçicisini kullanmıyor`).toContain(sec);
    }
    for (const sinif of ['satirdugme', 'ab-harita-liste', 'vurus']) {
      expect(ekran, `ekranda "${sinif}" sınıfı yok`).toContain(sinif);
    }
    /* Kapı iki bantta koşar ve eşiği ürünün KENDİ beyanından alır. */
    expect(kapi).toMatch(/const ESIK = 24;/);
    expect(kapi).toMatch(/375, height: 812/);
    /* Sıfır ölçümle "geçti" yazılmaz. */
    expect(kapi).toMatch(/ÖLÇÜM YETERSİZ/);
  });
});
