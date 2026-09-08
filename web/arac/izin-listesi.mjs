/* İZİN LİSTESİ SÜZGECİ — sözlükle ifade EDİLEBİLİR terimler.

   Bekçinin izin listesi iki ayrı işin dosyalarını bir arada tutar:

     · SÖZLÜK işi — `santral` · `ünite` · `plant`. Karşılığı
       `lib/dil/terimler.ts` anahtarlarında vardır (`tesis` · `birim`) ve
       çevirisi bir metin değişikliğidir.
     · ŞEMA/ÖZNİTELİK işi — `MW` · `tip kodu` · `türbin` · `üretim tipi` ·
       `kod jetonu`. Sözlükte KARŞILIĞI YOKTUR; temizliği kolon göçü ya da
       öznitelik şeması ister (P1'in öbür ekseni).

   `sozluk-farki.mjs` yalnız birincisini sorar: "sözlük ekrana ulaşıyor
   mu". Bir dosya yalnız `MW` yüzünden listede duruyorsa o rotanın SÖZLÜK
   çevirisi bitmiştir ve iddia açılmalıdır — `envanter/Yonetisim.tsx` tam
   olarak bu durumda.

   Kalıplar KOPYALANMAZ: bekçinin kendi tablosu (`tests/bekci/terimler`)
   okunur. İki araç aynı soruya iki türlü cevap verirse hangisinin doğru
   olduğu belirsizleşir. */
import { TERIMLER, terimleriBul } from '../tests/bekci/terimler';

/** Sözlükte karşılığı olan bekçi terim kategorileri. */
export const SOZLUKLESEBILIR = new Set(['santral', 'ünite', 'plant']);

/* Kategori adı bekçide değişirse bu küme sessizce boşalır ve iddia her
   rota için açılır — yanlış yönde bir sessizlik. Küme, tablonun gerçek
   kategorileriyle burada eşleştirilir. */
const bilinen = new Set(TERIMLER.map((t) => t.ad));
for (const ad of SOZLUKLESEBILIR) {
  if (!bilinen.has(ad)) {
    throw new Error(`izin-listesi: '${ad}' bekçinin terim tablosunda yok —`
      + ' kategori adı değişmiş; SOZLUKLESEBILIR güncellenmeli.');
  }
}

/** Dosya SÖZLÜK terimi taşıyor mu (şema terimleri sayılmaz). */
export function sozlukTerimiTasiyorMu(dosya) {
  return terimleriBul(dosya).some((t) => SOZLUKLESEBILIR.has(t.terim));
}

/** İzin listesinde SÖZLÜK terimiyle duran dosyalar. */
export function sozluklesebilirTerimliDosyalar(liste) {
  return liste.filter(sozlukTerimiTasiyorMu);
}
