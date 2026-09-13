#!/usr/bin/env node
/* GEREKÇE TARAMASI — "maliyeti anlatan gerekçe, gerekçe değildir".

   ── Kural nereden geldi ───────────────────────────────────────────────
   `Plant360` bekçinin göremediği bir tanımlayıcıydı ve muafiyeti üç
   yerde SABİTLENMİŞTİ. Gerekçesi şuydu: "tanımlayıcıyı yakalamak dosya
   adlarını da kirli sayardı" — yani kusurun neden kusur OLMADIĞINI
   değil, DÜZELTMENİN NEYE MAL OLACAĞINI anlatıyordu. Düzeltme yapıldı
   (dosya yeniden adlandırıldı) ve muafiyet buharlaştı: demek ki gerekçe
   diye duran şey bir gerekçe değildi.

   KURAL: bir gerekçe kusurun kendisini değil düzeltme maliyetini
   anlatıyorsa, o bir gerekçe değildir.

   ── NE YAPAR, NE YAPMAZ ───────────────────────────────────────────────
   Bu araç bir KAPI DEĞİLDİR ve kırmızı yakmaz. Yaptığı şey TARAMA:
   maliyet/takvim sözcüğü taşıyan gerekçeleri işaretler, insan
   sınıflandırır. Sezgisel bir kalıbı kapıya bağlamak, bu projede tekrar
   tekrar batan şeyin ta kendisi olurdu — çıktı bir kusur AVIDIR,
   muhasebe değil.

   Karışık satırlar (hem maliyet hem kusur gerekçesi) ayrı işaretlenir:
   onlarda soru "gerekçe var mı" değil, "gerekçe maliyet cümlesi
   olmadan da ayakta duruyor mu"dur.

   ── TARAMANIN KENDİ SINIRI ────────────────────────────────────────────
   Kalıp maliyet SÖZCÜKLERİNİ arar, argümanı anlamaz. Maliyeti REDDETMEK
   için anan bir gerekçe de işaretlenir ("… iş yükü değil, katman
   yanlış"). Ölçüldü: `components/kabuk/tip.ts` gerekçesi kusur tarafına
   oturtulduktan sonra bile, karşıtlık cümlesindeki sözcük yüzünden
   işaretlenmeye devam etti. Doğru gerekçe karşıtlığa ihtiyaç duymaz —
   kusurun neden kusur olmadığını tek başına söyler; cümle o hâle
   getirildi.

   Bu sınır, aracın kapı OLMAMASININ da sebebidir.

   Kullanım:  node arac/gerekce-tarama.mjs
*/
import { readFileSync } from 'node:fs';

const MALIYET = /ertelen|maliyet|pahalı|büyük iş|zaman almaz|sonraya|kapsamına almadı|değişikliği ister|dosya adı değiş|çok yer|elle yaz|iş yükü|süre|bütçe/i;
const KUSUR = /yanlış pozitif|kod anahtar|eşleştirme anahtar|kayıtlı model|model adı|sözleşme|çekirdek varsayılan|r0-8|r0-9|render edil|async olamaz|bilmez|bilmemeli|fikstür|galeri|ölçü birimi/i;

const kaynaklar = [
  ['arac/cekirdek-sozcuk-muafiyet.json', (d) => Object.entries(d.dosyalar).map(([k, v]) => [k, typeof v === 'string' ? v : v.sebep])],
  ['arac/beklenen-fark.json', (d) => Object.entries(d.muafiyetler ?? {}).map(([k, v]) => [k, typeof v === 'string' ? v : v.sebep])],
  ['tests/bekci/terim-fikstur.json', (d) => Object.entries(d.terimler).flatMap(([t, x]) => Object.entries(x.bilincli_kor ?? {}).map(([k, v]) => [`${t}/${k}`, v]))],
  /* Sektör terimi izin listesinin SINIFLANDIRMA gerekçeleri. Bunlar
     muafiyetin ta kendisidir: bir satırın neden hâlâ listede olduğunu
     söylerler. Tarama dışında kalsalardı kuralın en çok gerektiği yer
     denetlenmemiş olurdu. ERTELENMİŞ satırların `kapanis` metni de
     taranır — "sonra bakarız" bir kapanış aşaması değildir. */
  ['tests/bekci/sektor-terimi-izin.json', (d) => Object.entries(d.siniflandirma ?? {})
    .flatMap(([k, v]) => [
      [`${k} · sebep`, v.sebep],
      ...(v.kapanis ? [[`${k} · kapanış`, v.kapanis]] : []),
    ])],
];

let sayac = 0;
for (const [yol, cikar] of kaynaklar) {
  let d;
  try { d = JSON.parse(readFileSync(yol, 'utf8')); } catch { continue; }
  const satirlar = cikar(d);
  console.log(`\n### ${yol}  (${satirlar.length} gerekçe)`);
  for (const [ad, sebep] of satirlar) {
    const s = String(sebep ?? '');
    const maliyet = MALIYET.test(s);
    const kusur = KUSUR.test(s);
    if (maliyet && !kusur) { sayac += 1; console.log(`  ⚑ MALİYET  ${ad}\n      ${s.slice(0, 150)}`); }
    else if (maliyet) console.log(`  ~ karışık  ${ad} — maliyet sözcüğü var ama kusur gerekçesi de var`);
  }
}
console.log(`\nyalnız maliyeti anlatan gerekçe: ${sayac}`);
