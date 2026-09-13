/* ═══════════════════════════════════════════════════════════════════════
   R1 · MEVZUAT RADARI · AYRIŞTIRICILAR

   İki biçim: `rss` (besleme) ve `liste` (bağ listesi olan bir sayfa).
   İkisi de SAF: metin girer, giriş listesi çıkar.

   ── BİÇİM TANINMAZSA "BOŞ" DEĞİL "BİLİNMİYOR" ────────────────────────
   Ayrıştırıcı hiçbir giriş bulamadığında iki hâl vardır ve ayrılmaları
   şarttır: kaynak GERÇEKTEN boş (yeni yayın yok) ya da biçim değişti ve
   biz artık okuyamıyoruz. İkincisini "değişiklik yok" saymak, radarı
   sessizce kör eder — ürünün en pahalı kusur sınıfı budur. Bu yüzden
   dönüş `{ tanindi, girisler }` taşır: `tanindi === false` ise çağıran
   `farkVar`ı NULL yazar.
   ═══════════════════════════════════════════════════════════════════════ */

import type { Giris } from './radar';

export type Ayristirma = { tanindi: boolean; girisler: Giris[]; sebep: string | null };

const etiket = (govde: string, ad: string): string | null => {
  const m = new RegExp(`<${ad}[^>]*>([\\s\\S]*?)</${ad}>`, 'i').exec(govde);
  return m ? metniTemizle(m[1]) : null;
};

/** CDATA, varlık ve etiket temizliği — ÖZET kısa tutulur, tam metin değil. */
export function metniTemizle(ham: string): string {
  return ham
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `ozet` kaynağın KISA özetidir; telifli tam metin taşınmaz. */
export const OZET_SINIRI = 400;

function tarihCoz(ham: string | null): Date | null {
  if (!ham) return null;
  const t = new Date(ham);
  return Number.isNaN(t.getTime()) ? null : t;
}

export function rssAyristir(govde: string): Ayristirma {
  if (!/<rss[\s>]|<feed[\s>]/i.test(govde)) {
    return { tanindi: false, girisler: [], sebep: 'RSS/Atom kökü bulunamadı' };
  }
  const girisler: Giris[] = [];
  for (const m of govde.matchAll(/<(item|entry)[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const parca = m[2];
    const baslik = etiket(parca, 'title');
    /* Atom'da bağ bir öznitelikte durur. */
    const bag = etiket(parca, 'link')
      ?? /<link[^>]*href=["']([^"']+)["']/i.exec(parca)?.[1]
      ?? null;
    if (!baslik || !bag) continue;
    const ozet = etiket(parca, 'description') ?? etiket(parca, 'summary');
    girisler.push({
      url: bag.trim(),
      baslik,
      yayinTarihi: tarihCoz(etiket(parca, 'pubDate') ?? etiket(parca, 'updated')),
      ozet: ozet ? ozet.slice(0, OZET_SINIRI) : null,
    });
  }
  if (girisler.length === 0) {
    return { tanindi: false, girisler: [], sebep: 'RSS kökü var ama hiçbir öğe okunamadı' };
  }
  return { tanindi: true, girisler, sebep: null };
}

export function listeAyristir(govde: string, taban: string): Ayristirma {
  const girisler: Giris[] = [];
  for (const m of govde.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const baslik = metniTemizle(m[2]);
    if (!baslik || baslik.length < 6) continue;
    let url = m[1].trim();
    if (url.startsWith('#') || url.startsWith('javascript:')) continue;
    if (url.startsWith('/')) {
      try { url = new URL(url, taban).toString(); } catch { continue; }
    }
    girisler.push({ url, baslik, yayinTarihi: null, ozet: null });
  }
  if (girisler.length === 0) {
    return { tanindi: false, girisler: [], sebep: 'sayfada okunabilir bağ bulunamadı' };
  }
  return { tanindi: true, girisler, sebep: null };
}

export function ayristir(tur: string, govde: string, taban: string): Ayristirma {
  if (tur === 'rss') return rssAyristir(govde);
  if (tur === 'liste') return listeAyristir(govde, taban);
  return { tanindi: false, girisler: [], sebep: `tanınmayan kaynak türü: ${tur}` };
}
