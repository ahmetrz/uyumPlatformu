/* Yardım — SAF mantık (proje kalıbı: page.tsx → mantik.ts).

   Kısayol listesi TEK yerde yaşar: hem `/yardim` ekranı hem `?` ile açılan
   kısayol katmanı (`components/YardimKatmani.tsx`) buradan okur. İki
   liste olsaydı biri eninde sonunda eski kalırdı — kısayol belgesinin
   yapabileceği en kötü şey, var olmayan bir tuşu öğretmektir.

   Bu dosya veri okumaz, tarayıcıya dokunmaz; her şey test edilebilir. */

export type Kisayol = {
  /** Tuş dizisi — her eleman ayrı bir `<kbd>` olur. */
  tuslar: string[];
  /** Ne yapar (tek cümle). */
  yapar: string;
  /** Nerede geçerli: her ekran mı, yalnız palet açıkken mi. */
  baglam: 'her yerde' | 'palet açıkken';
};

/* Yalnız GERÇEKTEN bağlı kısayollar listelenir. `/` süzgeç odağı hiçbir
   ekranda bağlı değil (ölçüldü: kaynakta `key === '/'` dinleyen yok);
   bağlanmayan tuş listeye YAZILMAZ — yazılsaydı uydurma olurdu. */
export const KISAYOLLAR: Kisayol[] = [
  { tuslar: ['Ctrl', 'K'], yapar: 'Genel aramayı aç / kapat (Mac: ⌘ K)', baglam: 'her yerde' },
  { tuslar: ['?'], yapar: 'Bu kısayol katmanını aç / kapat (Shift + /)', baglam: 'her yerde' },
  { tuslar: ['Esc'], yapar: 'Açık katmanı kapat (arama, yardım, çekmece)', baglam: 'her yerde' },
  { tuslar: ['Tab'], yapar: 'İlk odakta "İçeriğe atla" bağı görünür; Enter kabuğu atlar', baglam: 'her yerde' },
  { tuslar: ['↑', '↓'], yapar: 'Sonuçlar arasında gez', baglam: 'palet açıkken' },
  { tuslar: ['Enter'], yapar: 'Seçili sonucu aç', baglam: 'palet açıkken' },
];

/** Katmanı açan pencere olayı — KomutPaleti'nin `arama:ac` kalıbıyla aynı. */
export const YARDIM_AC = 'yardim:ac';

/* Bir klavye olayı yazı alanından mı geliyor? `?` bir metin karakteridir:
   arama kutusuna "?" yazan kişinin karşısına yardım katmanı açılmamalı.
   Karar öğenin kendisinden verilir, olayın hedef yolundan değil — DOM'a
   bağımlı olmayan tek sorgu budur ve testte sahte öğeyle çağrılabilir. */
export type OdakOgesi = {
  tagName?: string;
  isContentEditable?: boolean;
  /** `<input type=…>` — düğme/onay kutusu türleri yazı almaz. */
  type?: string;
} | null | undefined;

const YAZI_ALMAYAN_INPUT = new Set([
  'button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file', 'image',
]);

export function yazmaAlanindaMi(el: OdakOgesi): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const ad = (el.tagName ?? '').toUpperCase();
  if (ad === 'TEXTAREA' || ad === 'SELECT') return true;
  if (ad === 'INPUT') return !YAZI_ALMAYAN_INPUT.has((el.type ?? 'text').toLowerCase());
  return false;
}

/* `?` tuşu: `e.key === '?'` bütün düzenlerde (TR-Q'da Shift+_ ) doğru
   karakteri verir; `Shift + /` yalnız US düzeninde `?` üretir. Bu yüzden
   karar KARAKTERE göre verilir, fiziksel tuşa göre değil. Ctrl/Alt/⌘ ile
   basılmışsa kısayol değil, başka bir şeydir. */
export function yardimTusuMu(e: {
  key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean;
}): boolean {
  return e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey;
}
