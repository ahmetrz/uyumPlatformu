import { TEMEL } from './demo';
import { CEKIRDEK_TERIMLER } from './dil/terimler';

/* Fotoğraf varlık kataloğu — 05-photography.md.
   Tesis→anahtar ilişkisi VERİDE (Tesis.gorselAnahtari) yaşar; burası yalnız
   "o anahtar için hangi boyutlar üretilmiş" sorusunu yanıtlayan manifesttir.

   Bağlayıcı kurallar (§1):
   1. Bir görsel yalnız gösterdiği tesisi temsil eder.
   2. Üretim tipleri asla birbirinin yerine geçmez.
   3. Karşılığı yoksa nötr grup kompozisyonu veya hiç hero yok — "yakın" bir
      tesisin fotoğrafı ASLA doldurma amacıyla kullanılmaz.
   6. Fallback tipografiktir, kırık görsel değildir. */



/** Tam boy hero kırpımı üretilmiş anahtarlar (560px hero / 300px plaka).
    Set: ürün sahibinin sağladığı 17 temsilî görsel (10'u 2026-09-01, 7'si
    2026-09-02), künye `public/tesisler/KUNYE.md`. Portföydeki her tesis
    kendi görselini taşır. Anahtar → dosya adı `<anahtar>-<tip>.webp`. */
const HERO: Record<string, string> = {
  /* ── DOSYA ADLARI FİKSTÜR KÜNYESİDİR ────────────────────────────────
     Buradaki değerler `public/tesisler/genis/` altındaki GERÇEK dosya
     adlarıdır ve fotoğrafın NE GÖSTERDİĞİNİ söyler (künye:
     `public/tesisler/KUNYE.md`). Üretim tipi kısaltmaları ürünün
     sözcüğü değil, temsilî görsel setinin künyesidir; silmek künyeyi
     kopardığı için yapılmıyor.
     BORÇ: kurgusal demo seti P2'de kiracı içeriğine taşınacak; dosya
     bekçi listesinde o güne kadar duruyor. */
  sahaa1: 'sahaa1-jes',
  sahaa2: 'sahaa2-jes',
  sahaa3: 'sahaa3-jes',
  sahabjes: 'sahab-jes',
  sahac: 'sahac-res',
  sahaf: 'sahaf-hes',
  sahaj: 'sahaj-hes',
  sahai: 'sahai-hes',
  sahak: 'sahak-hes',
  sahah: 'sahah-hes',
  sahag: 'sahag-hes',
  sahad: 'sahad-res',
  sahal: 'sahal-hes',
  saham: 'saham-dgkc',
  // Saha B'de iki tesis var: `sahabjes` JES, `sahabges` hibrit GES.
  sahabges: 'sahab-ges',
  sahae: 'sahae-res',
  // Üretim tesisi değil, genel müdürlük binası — tipi `MERKEZ`.
  merkezbt: 'merkezbt-merkez',
};

/** 240×150 seçici küçük görseli üretilmiş anahtarlar (hero setinden kırpım).
    Şu an portföydeki 17 tesisin 17'sinin de görseli var; anahtarı olmayan
    bir kayıt eklenirse tipografik fallback'e düşer — §1: başka bir tesisin
    görseli dolgu amacıyla ASLA kullanılmaz. */
const KUCUK = new Set(Object.keys(HERO));

/** Yönetim konsolu için: seçilebilir görsel anahtarları (dosya listesi
    KODDADIR — repo'ya eklenen fotoğraf; seçim ise Tesis.gorselAnahtari'nda,
    konsoldan A sınıfı olarak atanır). */
export const GORSEL_ANAHTARLARI: readonly string[] = Object.keys(HERO);

/** Hero/plaka fotoğrafı — yoksa null (çağıran tipografik fallback render eder). */
export function heroGorseli(anahtar: string | null | undefined): string | null {
  if (!anahtar) return null;
  const d = HERO[anahtar];
  return d ? `${TEMEL}/tesisler/genis/${d}.webp` : null;
}

/** Seçici küçük görseli — yoksa null. */
export function kucukGorsel(anahtar: string | null | undefined): string | null {
  if (!anahtar || !KUCUK.has(anahtar)) return null;
  return `${TEMEL}/tesisler/kucuk/${anahtar}.webp`;
}

/** Alt metin tesisi ve tipini adlandırmak ZORUNDADIR (§5).

    Terim ÇAĞIRANDAN gelir: bu modül `db` bilmez ve sözlüğü okuyamaz;
    çağıran ekran zaten sözlüğe sahip (`useTerim` ya da sunucuda çözülmüş
    sözlük). Varsayılan çekirdek sözcüktür — sözlüksüz bir çağrı alt
    metni boş bırakmaz. */
export function gorselAlt(
  ad: string, tipAdi: string, konum?: string | null,
  tesisSozu: string = CEKIRDEK_TERIMLER.tesis.tekil,
): string {
  return `${ad} — ${tipAdi.toLocaleLowerCase('tr-TR')} ${tesisSozu}${konum ? `, ${konum}` : ''}`;
}

/* Üretim tipi kimlik rengi ve adı ARTIK BURADA DEĞİL:
   `components/kabuk/tip.ts`. Nedeni eski token'lara (`--jesd`)
   bağlıydı ve koyu/açık yüzeyi ÇAĞIRANIN bilmesini istiyordu; yeni kabukta
   yüzeyi YÖN belirler, ekran değil. */
