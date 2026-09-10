/* ═══════════════════════════════════════════════════════════════════════
   R1 · MEVZUAT RADARI · SAF KARARLAR

   Bu dosyada AĞ YOKTUR ve olmayacaktır. Radar üç karar verir ve üçü de
   girdiden çıktıya saf fonksiyonlardır:

     1. Bu kaynağa BUGÜN istek gönderilebilir mi (robots + kota)?
     2. Gelen yanıt ne anlama geliyor (fark var · yok · BİLİNMİYOR)?
     3. Hangi girişler YENİ aday?

   Kararı saf tutmanın sebebi ölçüldü: motorun kendisi ağa çıkarsa, "bu
   kaynak engelliyken istek gönderilmiyor" iddiası ancak ağa çıkan bir
   testle ölçülebilirdi — ve ağa çıkan test bu depoda KIRMIZIDIR.
   ═══════════════════════════════════════════════════════════════════════ */

/** Ürünün robots.txt'te kendini tanıttığı ad. */
export const AJAN = 'UyumRadar';

export const GUN_MS = 24 * 3_600_000;

/* ── robots.txt ────────────────────────────────────────────────────────
   Asgari ama DOĞRU TARAFA yanılan bir ayrıştırıcı: `User-agent` grupları
   toplanır, bize ait grup yoksa `*` grubu uygulanır, en UZUN eşleşen
   kural kazanır (Allow ve Disallow arasında beraberlik Allow'a gider —
   RFC 9309'un kuralı).

   Ayrıştırılamayan bir robots.txt "izin var" sayılmaz: bir kamu
   kurumunun erişim kuralını anlayamadıysak, o kuralı yok saymak yerine
   beklemek doğrudur. */

type Kural = { izin: boolean; yol: string };

export function robotsAyristir(metin: string, ajan = AJAN): Kural[] {
  const satirlar = metin.split('\n').map((s) => s.replace(/#.*$/, '').trim());
  const gruplar = new Map<string, Kural[]>();
  let aktifAjanlar: string[] = [];
  let kuralGeldi = false;

  for (const satir of satirlar) {
    if (!satir) continue;
    const i = satir.indexOf(':');
    if (i < 0) continue;
    const alan = satir.slice(0, i).trim().toLowerCase();
    const deger = satir.slice(i + 1).trim();

    if (alan === 'user-agent') {
      /* Ardışık User-agent satırları TEK grubu paylaşır; araya kural
         girdiyse yeni grup başlar. */
      if (kuralGeldi) { aktifAjanlar = []; kuralGeldi = false; }
      aktifAjanlar.push(deger.toLowerCase());
      for (const a of aktifAjanlar) if (!gruplar.has(a)) gruplar.set(a, []);
      continue;
    }
    if (alan !== 'allow' && alan !== 'disallow') continue;
    kuralGeldi = true;
    for (const a of aktifAjanlar) {
      gruplar.get(a)?.push({ izin: alan === 'allow', yol: deger });
    }
  }

  return gruplar.get(ajan.toLowerCase()) ?? gruplar.get('*') ?? [];
}

/** Kural yolu adrese uyuyor mu — `*` ve `$` desteklenir.
 *
 * ── KAÇIRMA BİR KEZ YAPILIR ───────────────────────────────────────────
 * İlk yazımda `$`-çıpalı dal kaçırmayı İKİ KEZ uyguluyordu: önce tüm
 * dizgeye, sonra `*`'a göre bölünen her parçaya yeniden. İkinci tur, ilk
 * turun ürettiği `\.` kaçışını `\\.` (ters eğik çizgi + nokta HARFİYEN)
 * hâline getiriyor ve üretilen desen hiçbir gerçek adrese uymuyordu.
 *
 * Sonucu ÖLÇÜLDÜ (bağımsız inceleme, PR #50 tur 1): `Disallow: /*.pdf$`
 * kuralı `/a.pdf` adresine UYMUYORDU — kural yok sayılıyor, başka kural
 * da yoksa `robotsIzni` "izin var" diyor ve ürün, robots.txt'in AÇIKÇA
 * kapattığı bir adrese istek gönderiyordu. `.pdf$` · `.doc$` kalıbı
 * resmî yayın sitelerinde yaygındır; kusur kâğıt üstünde değil, ürünün
 * en sert vaadinin (engeli aşmayız) tam ortasındaydı.
 *
 * Bugün gövde bir kez ayrılır, parçalar bir kez kaçırılır, çıpa desenin
 * SONUNA eklenir — kaçırma ile çıpa artık aynı ifadede kesişmiyor. */
function yolUyuyorMu(kuralYolu: string, yol: string): boolean {
  if (kuralYolu === '') return false;
  const kacir = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const cipali = kuralYolu.endsWith('$');
  const govde = cipali ? kuralYolu.slice(0, -1) : kuralYolu;
  const desen = `^${govde.split('*').map(kacir).join('.*')}${cipali ? '$' : ''}`;
  return new RegExp(desen).test(yol);
}

export type RobotsKarari =
  | { izin: true }
  | { izin: false; sebep: string };

/**
 * robots.txt bu adrese izin veriyor mu?
 *
 * `metin` null ise robots.txt OKUNAMADI. Standart 404'ü "izin var"
 * sayar; ama okunamama sebebi 404 mü 500 mü bilinmiyorsa BEKLERİZ —
 * çağıran bunu `durum` alanıyla ayırır.
 */
export function robotsIzni(metin: string, yol: string, ajan = AJAN): RobotsKarari {
  const kurallar = robotsAyristir(metin, ajan);
  let enIyi: Kural | null = null;
  for (const k of kurallar) {
    if (!yolUyuyorMu(k.yol, yol)) continue;
    if (!enIyi
      || k.yol.length > enIyi.yol.length
      /* Aynı uzunlukta beraberlik İZNE gider (RFC 9309). */
      || (k.yol.length === enIyi.yol.length && k.izin)) enIyi = k;
  }
  if (!enIyi || enIyi.izin) return { izin: true };
  return { izin: false, sebep: `robots.txt bu yolu kapatıyor (${enIyi.yol})` };
}

/* ── GÜNDE BİR İSTEK ───────────────────────────────────────────────────
   Kaynak başına günde tek istek. Sebep nezaket değil ölçü: bir mevzuat
   sayfası günde birden çok kez değişmez, ama günde on kez istek gönderen
   bir ürün kamu kaynağı için gürültüdür ve engellenmeyi hak eder. */

export function kotaVar(sonTarama: Date | null, simdiMs: number): boolean {
  if (sonTarama === null) return true;
  return simdiMs - sonTarama.getTime() >= GUN_MS;
}

/* ── TARAMA SONUCU ─────────────────────────────────────────────────────
   `farkVar` ÜÇ DEĞERLİDİR. Buradaki tek iş, "bakılamadı"yı "fark yok"a
   çevirmemek. */

export type Getirme =
  | { ok: true; httpKodu: number; govde: string }
  | { ok: false; httpKodu: number | null; hata: string };

export type TaramaSonucu = {
  farkVar: boolean | null;
  sebep: string | null;
  httpKodu: number | null;
  durum: 'hazir' | 'engelli' | 'hata';
  durumNotu: string | null;
};

/** Anti-bot yanıtları — ATLATILMAZ, kaynak engelli işaretlenir. */
export const ANTI_BOT = [401, 403, 418, 429];

export function getirmeKarari(g: Getirme): TaramaSonucu | null {
  if (g.ok) return null;
  if (g.httpKodu !== null && ANTI_BOT.includes(g.httpKodu)) {
    return {
      farkVar: null,
      sebep: `kaynak isteği reddetti (HTTP ${g.httpKodu}) — atlatılmadı`,
      httpKodu: g.httpKodu,
      durum: 'engelli',
      durumNotu: 'Kaynak otomatik erişime kapalı. ELLE izlenir;'
        + ' ürün bu engeli aşmaz.',
    };
  }
  return {
    farkVar: null,
    sebep: `kaynağa ulaşılamadı: ${g.hata}`,
    httpKodu: g.httpKodu,
    durum: 'hata',
    durumNotu: g.hata,
  };
}

/* ── ADAY AYIKLAMA ─────────────────────────────────────────────────────
   Giriş listesi ayrıştırıcıdan gelir (RSS ya da liste). Burada yalnız
   YENİLİK kararı verilir: aynı `url` ikinci kez aday olmaz. */

export type Giris = {
  url: string;
  baslik: string;
  yayinTarihi: Date | null;
  ozet: string | null;
};

export function yeniGirisler(girisler: readonly Giris[], bilinenUrller: readonly string[]): Giris[] {
  const bilinen = new Set(bilinenUrller);
  const gorulen = new Set<string>();
  const cikan: Giris[] = [];
  for (const g of girisler) {
    if (!g.url || bilinen.has(g.url) || gorulen.has(g.url)) continue;
    gorulen.add(g.url);
    cikan.push(g);
  }
  return cikan;
}

/* ── EKRAN SÖZLERİ ─────────────────────────────────────────────────────
   "Engelli" ile "karşılaştırılamadı" AYRI cümlelerdir ve ekranda ayrı
   görünürler: biri kaynağın kararı, öbürü bizim bilgi eksiğimiz. */

export const DURUM_SOZU: Record<string, string> = {
  hazir: 'Taranabilir',
  engelli: 'ENGELLİ — kaynak otomatik erişime kapalı, elle izlenir',
  hata: 'Ulaşılamadı — son koşuda hata alındı',
};

export const FARK_SOZU = {
  var: 'Değişiklik bulundu',
  yok: 'Değişiklik yok',
  bilinmiyor: 'KARŞILAŞTIRILAMADI — sonuç bilinmiyor',
} as const;

export function farkSozu(farkVar: boolean | null): string {
  if (farkVar === null) return FARK_SOZU.bilinmiyor;
  return farkVar ? FARK_SOZU.var : FARK_SOZU.yok;
}

/** Aday durumları — `ilgisiz` de bir karardır ve gerekçe ister. */
export const ADAY_DURUMLARI = ['yeni', 'incelendi', 'ilgisiz', 'surum_taslagi_acildi'] as const;
export type AdayDurumu = (typeof ADAY_DURUMLARI)[number];

export const ADAY_DURUM_SOZU: Record<AdayDurumu, string> = {
  yeni: 'Yeni — inceleme bekliyor',
  incelendi: 'İncelendi',
  ilgisiz: 'İlgisiz bulundu',
  surum_taslagi_acildi: 'Sürüm taslağı açıldı',
};
