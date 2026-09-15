import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* ═══════════════════════════════════════════════════════════════════════
   ODAK VE HİYERARŞİ TURU — arketip ekran `/uyum`

   ÖLÇÜLEN KUSUR (15 Eylül 2026, kullanıcı geri bildirimi + ekran
   görüntüsü, 1440×900): ekranda ~40 eş ağırlıklı büyük harfli etiket
   (üç gezinme sırası, kenar çubuğu, lejant, ölçüt satırı); cevap
   ("8 uygunsuz") sağ üstte 11px'te; matris kod sırasında, uygunsuz satır
   kalabalığın içinde; matrisle altbilgi arasında boş bir EĞİLİM kutusu.
   "Nereye odaklanmam gerektiğini anlamıyorum."

   Tek tasarım yönü seçildi ve mevcut gramerle kuruldu: Uyum gezinmesi
   Varlık'ın iki kademeli yapısına geçti (19 bağ → 3 + üçüncül), başlık
   cevabı taşıyor ve cümle düzeninde, matris önem sırasında, lejant
   kapalı, eğilim matrisin ALTINDA. Aşağıdaki vakalar bu kararların her
   birini KAYNAKTA sabitler; her biri sabotajla kanıtlanmıştır
   (`arac/sabotaj.mjs`). Görsel sonuç tarayıcıda ölçüldü ve PR
   gövdesinde durur; burada ölçülen, kararın geri alınmasının kırmızı
   yakmasıdır.
   ═══════════════════════════════════════════════════════════════════════ */

const ISTEMCI = readFileSync('app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx', 'utf8');
const CSS = readFileSync('app/kabuk.css', 'utf8');
const DESIGN = readFileSync('DESIGN.md', 'utf8');

/* Bir CSS bloğunun gövdesi: `sec {` ile ilk `}` arası. Medya blokları
   dahil, seçici HANGİ blokta geçerse geçsin gövdesini döner. */
function kuralGovdeleri(css: string, secici: string): string[] {
  const kacis = secici.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|[\\n,}])\\s*${kacis}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]);
}

describe('uyum · gezinme iki kademeli — 19 bağ üç bağa iner, rota kaybolmaz', () => {
  it('Uyum sırası ÜÇ ikincil öğe taşır ve her biri alt ekranlarını taşır [SIS-KBK-030]', async () => {
    const { ikincilSec } = await import('@/components/kabuk/yonler');
    const gruplar = ikincilSec('/uyum');
    const ogeler = gruplar.flatMap((g) => g.ogeler);
    expect(ogeler.length).toBe(3);
    /* Her ikincil öğe bir üçüncül sıra açar; alt listesi boş bir öğe
       "iki kademe" değil, düz sıraya geri dönmüş bir öğedir. */
    for (const o of ogeler) expect(o.alt?.length ?? 0, `${o.ad} alt sırası`).toBeGreaterThan(1);
    /* Her öğenin yolu kendi alt sırasının İLK bağıdır: ikincil öğeye
       dokunmak üçüncül sıranın ilk ekranına gider, saklı bir rotaya değil. */
    for (const o of ogeler) expect(o.alt?.[0]?.yol).toBe(o.yol);
  });

  it('düzleştirilmiş üçüncül küme ESKİ on dokuz rotanın tamamıdır [SIS-KBK-030]', async () => {
    const { ikincilSec } = await import('@/components/kabuk/yonler');
    const yollar = ikincilSec('/uyum').flatMap((g) => g.ogeler.flatMap((o) => (o.alt ?? [o]).map((a) => a.yol)));
    /* Yeniden gruplama bir ulaşım yolu değişikliğidir, kapsam değişikliği
       değil: eski sıranın on dokuz rotasının on dokuzu da bir üçüncül
       sırada durur ve hiçbiri iki kez listelenmez. */
    const eski = [
      '/uyum', '/regulasyonlar', '/paketler', '/mevzuat-radari', '/kisisel-veri',
      '/surecler', '/eslestirme', '/degerlendirme-aktarim',
      '/denetimler', '/bulgular', '/projeler', '/denetci-erisimi', '/gozden-gecirme',
      '/raporlar', '/dokumanlar', '/kanitlar', '/aktivite', '/saklama', '/egitimler',
    ];
    expect([...yollar].sort()).toEqual([...eski].sort());
    expect(new Set(yollar).size).toBe(yollar.length);
  });

  it('üçüncül sıra her Uyum rotasında AÇILIR ve bulunulan öğeyi taşır [SIS-KBK-030]', async () => {
    const { ucunculSec, ikincilSec } = await import('@/components/kabuk/yonler');
    const yollar = ikincilSec('/uyum').flatMap((g) => g.ogeler.flatMap((o) => (o.alt ?? []).map((a) => a.yol)));
    for (const yol of yollar) {
      const u = ucunculSec(yol);
      expect(u, `${yol} üçüncül sırası`).not.toBeNull();
      expect(u!.ogeler.some((o) => o.yol === yol), `${yol} kendi sırasında`).toBe(true);
    }
  });
});

describe('uyum · başlık cevabı taşır ve cümle düzenindedir', () => {
  it('ekran başlığının vurgusu UYGUNSUZ SAYISIDIR; taslakta "Ölçülmedi" [SIS-UYM-033]', () => {
    /* Manşet sayıyı ölçüt satırından ALIR, orası dağılımdır. Sıfır
       uygunsuz "Uygunsuz yok" der; taslak çerçevede sayı yoktur ve sıfır
       basılmaz (bilinmeyen ≠ sıfır). */
    const lede = ISTEMCI.match(/<EkranBasligi[\s\S]*?\/>/)?.[0] ?? '';
    expect(lede).toMatch(/vurgu=\{cerceve\.taslak \? 'Ölçülmedi' : m\.uygunsuz > 0 \? `\$\{m\.uygunsuz\} uygunsuz` : 'Uygunsuz yok'\}/);
    expect(lede).toMatch(/vurguDurumu=\{cerceve\.taslak \? 'unk' : m\.uygunsuz > 0 \? 'bd' : 'ok'\}/);
    /* Başlık soruyu SORAR, vurgu cevaptır: "8 uygunsuz — nerede, ve neden?" */
    expect(lede).toMatch(/baslik="— nerede, ve neden\?"/);
  });

  it('`.ab-lede h1` BÜYÜK HARF DEĞİLDİR — kabuğun tek büyük yumuşak sesi [SIS-UYM-034]', () => {
    const govdeler = kuralGovdeleri(CSS, '.ab-lede h1');
    expect(govdeler.length, '.ab-lede h1 kuralı').toBeGreaterThan(0);
    for (const g of govdeler) expect(g).not.toMatch(/text-transform\s*:\s*uppercase/);
    /* Kimlik korunur: aile, boy ve ağırlık aynı kalır; yalnız kayıt değişti. */
    expect(govdeler.join('\n')).toMatch(/font-size:\s*26px/);
    /* Karar tasarım belgesinde de yazılıdır; kod ile belge ayrışamaz. */
    expect(DESIGN).toMatch(/\*\*Display\*\*[^\n]*cümle düzeni/);
  });
});

describe('uyum · matris önem sırasında açılır, kod sırası tek dokunuşta', () => {
  it('varsayılan sıra ÖNEMDİR ve ağırlık `satirAgirligi`den gelir [SIS-UYM-035]', () => {
    expect(ISTEMCI).toMatch(/useState<'onem' \| 'kod'>\('onem'\)/);
    /* Ağırlık ekranda YENİDEN yazılmaz: `mantik.ts`teki tek kaynaktan
       gelir (bd 10 000 · md 100 · unk 1) ve azalan sırada uygulanır. */
    expect(ISTEMCI).toMatch(/satirAgirligi\(\[\.\.\.s\.hucreler\.values\(\)\]\.map\(\(k\) => k\.im\)\)/);
    expect(ISTEMCI).toMatch(/\.sort\(\(a, b\) => agirlik\(b\) - agirlik\(a\)\)/);
    /* Kod sırası SİLİNMEDİ: denetçinin arama işi için iki düğme var. */
    expect(ISTEMCI).toMatch(/aria-label="Satır sırası"/);
    expect(ISTEMCI).toMatch(/setSira\('kod'\)/);
  });

  it('`satirAgirligi` uygunsuzu önce, bilinmeyeni uygunun ÜSTÜNE koyar [SIS-UYM-035]', async () => {
    const { satirAgirligi } = await import('@/app/(kabuk)/(operasyonel)/uyum/mantik');
    const bd = satirAgirligi(['bd', 'ok', 'ok']);
    const md = satirAgirligi(['md', 'md', 'ok']);
    const unk = satirAgirligi(['unk', 'ok', 'ok']);
    const ok = satirAgirligi(['ok', 'ok', 'ok']);
    expect(bd).toBeGreaterThan(md);
    expect(md).toBeGreaterThan(unk);
    /* Bilinmeyen ≠ sıfır: değerlendirilmemiş satır uygunun altına atılmaz. */
    expect(unk).toBeGreaterThan(ok);
    expect(ok).toBe(0);
  });
});

describe('uyum · kenar çubuğu ve eğilim ikinci plandadır', () => {
  it('okuma anahtarı KAPALI bir `<details>` olarak durur [SIS-UYM-036]', () => {
    const anahtar = ISTEMCI.match(/<details className="bolum anahtar-kutu"[^>]*>/)?.[0];
    expect(anahtar, 'details.anahtar-kutu').toBeDefined();
    /* Varsayılan kapalı: lejant her açılışta dört durum çizmek yerine
       gerekince açılır. `open` yazılırsa eski hâle dönülmüş olur. */
    expect(anahtar).not.toMatch(/\bopen\b/);
    expect(ISTEMCI).toMatch(/<summary className="etiket">Okuma anahtarı<\/summary>/);
    /* Özet dokunulur ve odaklanabilir olduğunu CSS'te söyler. */
    expect(CSS).toMatch(/details\.anahtar-kutu > summary:focus-visible/);
  });

  it('eğilim şeridi MATRİSTEN SONRA gelir; matris üstü yardımcı cümle yoktur [SIS-UYM-037]', () => {
    const matris = ISTEMCI.indexOf('<UyumMatrisi');
    const egilim = ISTEMCI.indexOf('<EgilimSeridi');
    expect(matris).toBeGreaterThan(0);
    expect(egilim).toBeGreaterThan(matris);
    /* Eski giriş bloğu ("Satır = kontrol · sütun = …") kaynakta da CSS'te
       de YOK: matrisin kendisi zaten ne olduğunu söyler. */
    expect(ISTEMCI).not.toMatch(/className="ab-c-giris"/);
    expect(kuralGovdeleri(CSS, '.ab-c-giris')).toHaveLength(0);
    /* Şerit matristen ince bir çizgiyle ayrılır, kutuya alınmaz. */
    expect(kuralGovdeleri(CSS, '.ab-trend').join('\n')).toMatch(/border-top/);
  });
});

describe('uyum · tekdüze kapsam kolonu çizilmez, tek cümleyle söylenir', () => {
  it('her satır tam kapsamdaysa kolon KALKAR ve altbilgi olguyu söyler [SIS-UYM-038]', () => {
    expect(ISTEMCI).toMatch(/const kapsamTekduze = satirlar\.every\(\(s\) => s\.kapsamda === tesisler\.length\);/);
    /* Kolon şablonu, başlık hücresi ve satır hücresi ÜÇÜ de aynı bayrağa
       bağlıdır; biri unutulursa ızgara kayar. */
    expect(ISTEMCI).toMatch(/repeat\(\$\{tesisler\.length\}, 88px\)\$\{kapsamTekduze \? '' : ' 78px'\}/);
    expect(ISTEMCI).toMatch(/\{!kapsamTekduze && \(\s*<span className="kolonbas" role="columnheader"[^>]*>Kapsam<\/span>/);
    expect(ISTEMCI).toMatch(/\{!kapsamTekduze && \(\s*<span\s+className=\{`mono kapsam/);
    expect(ISTEMCI).toMatch(/aria-colspan=\{tesisler\.length \+ \(kapsamTekduze \? 2 : 3\)\}/);
    /* Bilgi kaybolmaz: altbilgi olguyu bir kez söyler. */
    expect(ISTEMCI).toMatch(/Her kontrol \{tesisler\.length\} \{terim\('tesis', 'iyelik'\)\} tamamında kapsamda/);
  });

  it('tek bir eksik satır kolonu GERİ getirir — ölçüt veriden [SIS-UYM-038]', () => {
    /* Bayrak `every` ile hesaplanır: bir satır bile eksikse false.
       Sabit bir tesis sayısına ya da satır sayısına bağlı DEĞİLDİR. */
    const satir = ISTEMCI.match(/const kapsamTekduze = ([^;]+);/)?.[1] ?? '';
    expect(satir).toMatch(/\.every\(/);
    expect(satir).not.toMatch(/\d/);
  });
});
