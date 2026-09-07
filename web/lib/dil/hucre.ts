import { t, type Sozluk } from './terimler';

/* ═══════════════════════════════════════════════════════════════════════
   HÜCRE OLGUSU — mantık OLGUYU döner, sözcüğü dil katmanı koyar

   ── Kapatılan kusur ───────────────────────────────────────────────────
   İki ekranın mantık modülünde, adı bir ENERJİ SÖZCÜĞÜ taşıyan birer
   işlev vardı (`surecler/ortak.ts` · `operasyon/mantik.ts`) ve ikisi de
   doğrudan METİN üretiyordu: tek tesiste adı, birden çokta "sayı +
   enerji sözcüğü", kapsam yokken 'kapsam boş', tesis yokken 'portföy'.

   İki ayrı kusur iç içeydi. Birincisi TERİM: o sözcük kiracının
   sektörüne aittir ve çekirdek mantığa girmez — sektör değiştiğinde
   ekran yanlış sözcüğü yazar ve bunu söyleyecek hiçbir şey yoktur.
   İkincisi KATMAN: bir `mantik.ts` modülünün görevi olguyu
   hesaplamaktır, cümle kurmak değil. Sözcük orada durduğu sürece
   çeviriye de, sözlüğe de, çoğul kuralına da kapalıdır.

   (Eski işlev adı bu dosyada YAZILMIYOR: bekçi haklı olarak onu da
   sektör terimi sayar ve yeni kod eski sözcüğü çoğaltmaz. Git geçmişi
   ve iki mantık modülünün kendi yorumları o adı taşıyor.)

   Mantık artık AYRIK BİRLEŞİM döner (`tur` ile ayrılır); sözcüğü bu
   modül koyar ve sözlükten çözer. Mantık testi artık sözlük istemez:
   `{ tur: 'coklu', sayi: 3 }` iddiası dile bağlı değildir.

   ── Neden dört değer, üç değil ────────────────────────────────────────
   `bos` ile `portfoy` AYNI ŞEY DEĞİLDİR ve birleştirilemez:
     · `bos`     — kaydın kapsamı YOK. Bilinmeyen değil, boş küme.
     · `portfoy` — kayıt tek bir tesise değil, portföyün TAMAMINA bağlı.
   İkisini tek değere indirmek "kapsam yok" ile "kapsam her yer"i aynı
   sözcükle yazardı — üç değerli mantık kuralının aynısı: bilinmeyen ≠
   sıfır, boş ≠ hepsi.
   ═══════════════════════════════════════════════════════════════════════ */

export type TesisHucresi =
  | { tur: 'ad'; ad: string }
  | { tur: 'coklu'; sayi: number }
  | { tur: 'portfoy' }
  | { tur: 'bos' };

/** Hücre olgusunu okunur metne çevirir — sektör sözcüğü SÖZLÜKTEN gelir.

    Sayıdan sonra TEKİL biçim kullanılır: Türkçede "3 tesis" doğru, "3
    tesisler" yanlıştır. Çoğul biçimi sözlükte duruyor ve başka
    bağlamlarda kullanılıyor; burada bilerek çağrılmıyor. */
export function tesisHucresiMetni(
  hucre: TesisHucresi, sozluk: Sozluk | null | undefined,
): string {
  switch (hucre.tur) {
    case 'ad': return hucre.ad;
    case 'coklu': return `${hucre.sayi} ${t(sozluk, 'tesis')}`;
    case 'portfoy': return t(sozluk, 'portfoy');
    /* Sektörsüz bir arayüz cümlesi; P3'te mesaj kataloğuna taşınacak.
       Sözlükte karşılığı YOK ve olmamalı: "kapsam boş" bir terim değil,
       bir durum cümlesidir. */
    case 'bos': return 'kapsam boş';
  }
}
