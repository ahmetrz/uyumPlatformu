import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { tabanKarari, tabanOku } from '../../arac/olcum-tabani.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · BÜYÜK HARF YAPISAL KAŞA AİTTİR (URN-KBK-021)

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Odak turu (15 Eylül 2026, kullanıcı geri bildirimi: "her tarafta
   metin, nereye odaklanacağımı anlamıyorum"). 1440×900'de ölçüldü:
     · `/`          83 büyük harfli metin parçası — 24'ü TESİS ADI (kart
                    adı, 20px), 3'ü üretim tipi adı (18px), biri tam bir
                    cümle ("Kurulu güç ölçülmedi · 4 tesis — uyum endeksi
                    ölçüldü, dikey eksende yeri yok");
     · `/tesisler`  seçili tesisin adı 34px büyük harf, 16 satır adı 16px
                    büyük harf, üstlerinde tip·bölge 10.5px büyük harf;
     · `/tesisler/[id]` tesis adı 78px büyük harf (CSS + JS iki kez);
     · `/envanter`  ekran başlığı 15px büyük harf;
     · `/uyum`      altbilgideki "6 hücre değerlendirilmedi — sıfır değil,
                    bilinmeyen" cümlesi `.etiket` ile büyük harf.

   Kaş etiketi (Label, 10px, büyük harf) DESIGN.md'de "kendi başına bilgi
   taşımaz" diye tanımlı. Veri de aynı sesle konuşunca kaş işlevsizleşir:
   hiçbir şey öne çıkmaz, ekran tek bir bağırtıya döner.

   ── KURAL ─────────────────────────────────────────────────────────────
   (1) 13px ve üstü büyük harf YALNIZ gezinme ve koddur. İzin listesi
       aşağıda adıyla ve gerekçesiyle durur; listede olmayan büyük boy
       büyük harf kuralı KIRMIZIDIR.
   (2) İzin listesi yalnız küçülür: listedeki her satır CSS'te hâlâ
       büyük harf ve ≥13px olmalı — ölü bir izin, sonraki bir kuralın
       kapıdan sessizce geçmesine yol açar.
   (3) Her büyük harf kuralı boyunu BİLDİRİR (font-size). Boyunu
       söylemeyen kural ölçülemez ve ölçülemeyen kural temiz sayılmaz.
   (4) ÖLÇÜM TABANI: tarama en az N büyük harf kuralı görmeli
       (`kabuk.buyukHarfKurali`); sıfır ölçümle "temiz" denmez.

   Kural CSS'in kendisine bakar, ekrana değil: ekran ölçümü DOM tanığında
   ve odak turunun PR gövdesinde durur. Burada ölçülen, bir veri
   kuralının büyük harfe GERİ DÖNMESİNİN kırmızı yakmasıdır.
   ═══════════════════════════════════════════════════════════════════════ */

const css = readFileSync('app/kabuk.css', 'utf8');

/** `:root` içindeki `--t-*` jetonları (px). */
function jetonlar(): Record<string, number> {
  const j: Record<string, number> = {};
  for (const m of css.matchAll(/(--t-[a-z-]+):\s*([\d.]+)px/g)) j[m[1]] = Number(m[2]);
  return j;
}

/** Bir `font-size` değerinin EN BÜYÜK piksel karşılığı — `var()` jetondan,
    `clamp()`/`min()` içinden en büyük sayı: büyük harfin yasak olduğu
    boy, değerin alabileceği en büyük boydur. */
function pikselBoyu(deger: string, j: Record<string, number>): number | null {
  const varm = deger.match(/var\((--t-[a-z-]+)\)/);
  if (varm) return j[varm[1]] ?? null;
  const sayilar = [...deger.matchAll(/([\d.]+)px/g)].map((m) => Number(m[1]));
  return sayilar.length ? Math.max(...sayilar) : null;
}

type Kural = { secici: string; boy: number | null; boyYazisi: string | null };

/** Bütün `text-transform: uppercase` kuralları (medya blokları dâhil). */
function buyukHarfKurallari(): Kural[] {
  const j = jetonlar();
  const out: Kural[] = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/text-transform:\s*uppercase/.test(m[2])) continue;
    const secici = m[1].trim().split('\n').pop()!.trim();
    const fs = m[2].match(/font-size:\s*([^;]+)/);
    out.push({ secici, boyYazisi: fs ? fs[1].trim() : null, boy: fs ? pikselBoyu(fs[1], j) : null });
  }
  return out;
}

/* 13px ve üstü büyük harfin İZİNLİ olduğu tek yer: gezinme ve kod.
   Liste yalnız küçülür; yeni bir satır "bu da gezinmedir" gerekçesi
   ister ve o gerekçe buraya yazılır. */
const BUYUK_BOY_IZINLI: [string, string][] = [
  ['.ab-ust > nav a', 'alan sekmesi — birincil gezinme (DESIGN.md · Alan sekmeleri)'],
  ['.ab-ikincil a', 'ikincil sıra — gezinme'],
  ['.ab-bolum-menu [role=\'menuitem\']', 'katlanan sıranın paneli — gezinme'],
  ['.ab-bolum-dugme .oge-ad', 'bölüm seçici düğmesi — gezinme, "neredeyim"'],
  ['.ab-b-portfoy-ust nav button', 'üretim tipi sekmeleri — portföyün süzgeç gezinmesi'],
  ['.ab-b-ikili .birim .kod', 'birim KODU — kod zaten büyük harftir, dönüşüm yalnız tutarlılık'],
];
const ESIK = 13;

describe('bekçi · büyük harf yapısal kaşa aittir [URN-KBK-021]', () => {
  const kurallar = buyukHarfKurallari();

  it('ÖLÇÜM TABANI — tarama gerçekten büyük harf kuralı görüyor [SIS-KBK-031]', () => {
    const hata = tabanKarari('kabuk.buyukHarfKurali', kurallar.length, tabanOku().tabanlar);
    expect(hata, hata ?? '').toBeNull();
  });

  it('her büyük harf kuralı boyunu bildirir [SIS-KBK-031]', () => {
    const boyutsuz = kurallar.filter((k) => k.boy === null).map((k) => `${k.secici} (${k.boyYazisi ?? 'font-size yok'})`);
    expect(boyutsuz).toEqual([]);
  });

  it('13px ve üstü büyük harf YALNIZ gezinme ve koddur [SIS-KBK-031]', () => {
    const izinli = new Set(BUYUK_BOY_IZINLI.map(([s]) => s));
    const ihlal = kurallar
      .filter((k) => k.boy !== null && k.boy >= ESIK && !izinli.has(k.secici))
      .map((k) => `${k.secici} · ${k.boyYazisi}`);
    expect(ihlal).toEqual([]);
  });

  it('izin listesi ölü satır taşımaz — listedeki her satır hâlâ büyük boy büyük harf [SIS-KBK-031]', () => {
    const olu = BUYUK_BOY_IZINLI
      .filter(([s]) => !kurallar.some((k) => k.secici === s && k.boy !== null && k.boy >= ESIK))
      .map(([s]) => s);
    expect(olu).toEqual([]);
  });

  it('ad · başlık · cümle · boş durum · değer hiçbir boyda büyük harf olmaz [SIS-KBK-031]', () => {
    /* Sınıf adı SEMANTİK taşır: `.ad` bir kayıt adıdır, `h1`/`h2` başlık,
       `.bos` boş durum cümlesi, `.cumle` cümle, `.deger` sayı. Kaş
       etiketleri (`.etiket`, `.kolonbas`, `dt`, `.grupad`, `.eksenad`)
       bu listede değildir. Ölçülen istisna: `.ab-b-dikkat .endeks .ad` ve
       `.ab-olculmemis .ad` — ikisi de 10px KAŞ metnidir ("Uyum endeksi",
       "Değerlendirilmemiş"), ad değil; sınıf adı yanlış ama boy kaş boyu.
       Diş bu yüzden BOYLA birlikte yargılar: ad sınıfı taşıyan büyük
       harf kuralı ancak kaş boyunda (≤ 11px) kalabilir. */
    const kusurlu = kurallar
      .filter((k) => /(^|\s)(h1|h2|h3)$|\.(ad|bos|cumle|deger|konu|baslik-metin)$/.test(k.secici))
      .filter((k) => k.boy === null || k.boy > 11)
      .map((k) => `${k.secici} · ${k.boyYazisi}`);
    expect(kusurlu).toEqual([]);
  });
});
