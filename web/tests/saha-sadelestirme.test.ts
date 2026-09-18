import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { tipEtiketleri } from '@/app/(kabuk)/(flagship)/tipEtiketi';

/* ═══════════════════════════════════════════════════════════════════════
   SAHA · SADELEŞTİRME TURU (15 Eyl 2026)

   Kullanıcı ölçtü: "santral görsellerinin boyutları farklı (yükseklik)".
   Tarayıcı ölçtü: 24 kartın yüksekliği eşit (168px), görseller tek boyut
   (240×150). Fark görselde değil üstündeki katmandaydı — boydan boya
   fotoğraf + %38 opaklık + gradyan perde + ilk dört kartta kırmızı iç
   çerçeve. Kart artık iki satırlık ızgara: fotoğraf bandı + metin bloğu.

   Aynı turda karar yüzeyinden çıkan üç tekrar/yöntem notu ve aynı adlı
   iki tipin ("Merkez BT" · enerji ve su) etiketi de burada sabittir.
   Her vaka sabotajlıdır (`arac/sabotaj.mjs`).
   ═══════════════════════════════════════════════════════════════════════ */

const GENEL = readFileSync('app/(kabuk)/(flagship)/Genel.tsx', 'utf8');
const CSS = readFileSync('app/kabuk.css', 'utf8');

/** `\n<seçici> { … }` bloğunun gövdesi; yoksa null. */
function blok(secici: string): string | null {
  const kacis = secici.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return CSS.match(new RegExp(`\\n${kacis} \\{([^}]*)\\}`))?.[1] ?? null;
}
const SAHA_KARTI = GENEL.slice(GENEL.indexOf('function SahaKarti'));

describe('saha şeridi · fotoğraf sabit bant, metin bandın altında', () => {
  it('kart iki satırlık ızgaradır: fotoğraf bandı + metin bloğu [SAH-SER-001]', () => {
    const kart = blok('.ab-b-serit .kart');
    expect(kart).not.toBeNull();
    expect(kart).toMatch(/grid-template-rows: minmax\(0, 1fr\) auto/);
    expect(kart).toMatch(/background: var\(--panel\)/);
  });

  it('fotoğraf kartı boydan boya kaplamaz; perde yok [SAH-SER-001]', () => {
    const img = blok('.ab-b-serit .kart > img');
    expect(img).not.toBeNull();
    expect(img).toMatch(/object-fit: cover/);
    expect(img).not.toMatch(/position: absolute|inset: 0/);
    /* Gradyan perde metnin altına gömülen fotoğrafın aracıydı; metin artık
       bandın altında, perdeye gerek yok — ne kural ne span. */
    expect(CSS).not.toMatch(/\.ab-b-serit \.kart > \.perde/);
    expect(SAHA_KARTI).not.toMatch(/className="perde"/);
  });

  it('fotoğrafsız tesis aynı bandı düz zeminle alır — sahte görsel yok [SAH-SER-001]', () => {
    const yok = blok('.ab-b-serit .kart .fotoyok');
    expect(yok).toMatch(/background: var\(--panel2\)/);
    expect(yok).not.toMatch(/inset: 0/);
    expect(SAHA_KARTI).toMatch(/<span className="fotoyok" aria-hidden \/>/);
  });

  it('uygunsuz kartta çerçeve yok; skor rengi ve bağ başlığında SÖZCÜK [SAH-SER-001]', () => {
    /* Çerçeve kartları ayrı boyda gösteriyordu ve yığın çubuğuyla aynı
       şeyi ikinci kez söylüyordu. Renk tek kanal olmasın diye sözcük
       bağın başlığına taşındı. */
    expect(CSS).not.toMatch(/\.ab-b-serit \.kart\.uyari \{/);
    expect(blok('.ab-b-serit .kart.uyari .skor')).toMatch(/var\(--bd\)/);
    expect(SAHA_KARTI).toMatch(/title=\{`\$\{s\.ad\}[^\n]*\$\{uygunsuz\} uygunsuz/);
    expect(SAHA_KARTI).toMatch(/'güç ölçülmedi'/);
    expect(SAHA_KARTI).toMatch(/'değerlendirilmedi'/);
    /* Tip de başlıkta: kimlik satırı dar kartta üç noktayla kırpılır
       (sessiz kesme değil), tam etiket bağ başlığında (PR #64 bulgusu). */
    expect(SAHA_KARTI).toMatch(/title=\{`\$\{s\.ad\} · \$\{tipAdi\(s\.tipKod, s\.tipAd\)\}/);
    expect(blok('.ab-b-serit .kart .kimlik')).toMatch(/text-overflow: ellipsis/);
    expect(blok('.ab-b-serit .kart .kimlik')).toMatch(/display: block/);
  });

  it('yığın çubuğu bandın altında okunur boyda (3px)', () => {
    expect(blok('.ab-b-serit .kart .ab-b-yigin')).toMatch(/height: 3px/);
  });
});

describe('saha · karar yüzeyinde tekrar ve yöntem notu yok', () => {
  it('katman panelinin kalan satırı SAYI söyler; adlar klavye ve dokunmayla açılan listede [SAH-SDL-001]', () => {
    const bas = GENEL.indexOf('<details className="katman-diger">');
    expect(bas).toBeGreaterThan(0);
    const d = GENEL.slice(bas, GENEL.indexOf('</details>', bas));
    const ozet = d.slice(d.indexOf('<summary'), d.indexOf('</summary>'));
    expect(ozet).toMatch(/Diğer \{tipler\.length - KATMAN_TAVANI\} tip/);
    expect(ozet).not.toMatch(/\.map\(/);
    /* Adlar `title`ta DEĞİL: `title` yalnız fareye açıktır, klavye ve
       dokunma erişemez (bağımsız inceleme, PR #64). Odaklanabilir
       `summary` + görünür liste. */
    expect(ozet).not.toMatch(/title=/);
    expect(d).toMatch(/<ul className="mono diger-liste">/);
    expect(d).toMatch(/\{tipEtiketi\.get\(t\.kod\) \?\? tipAdi\(t\.kod, t\.ad\)\}/);
    expect(CSS).toMatch(/\.ab-b-katman \.katman-diger > summary:focus-visible/);
    expect(CSS).toMatch(/\.ab-b-katman \.katman-diger > summary \{[^}]*min-height: 24px/);
  });

  it('gücü ölçülmemiş şeridinin etiketi sebebi söyler ve `title` TAŞIMAZ [SAH-SDL-001]', () => {
    /* KARAR DEĞİŞTİ (17 Eyl 2026) ve bu testin ESKİ hâli değişikliği
       engelliyordu. Yöntem notu ("… dikey eksende yeri yok") bir tur
       önce `title`a taşınmıştı; bu test onu ORADA arıyor, yani notun
       `title`ta KALMASINI şart koşuyordu.

       Ölçüldü: `title`, odaklanamayan bir `<p>`de hiçbir klavye ve
       dokunma kullanıcısına ulaşmaz ve hiçbir tarayıcı onu odakta
       göstermez — not "ikinci düzeye" değil ERİŞİLMEZ bir yere
       taşınmıştı. Bugün sebebi etiketin KENDİSİ söylüyor ("Kurulu güç
       ölçülmedi") ve sonucu konumu söylüyor: şerit eksenin ALTINDADIR.
       Not silindi; ekranda tekrar da yok, erişilmez kopya da. */
    const s = GENEL.slice(GENEL.indexOf('<div className="ab-gucsuz">'));
    const p = s.slice(0, s.indexOf('</p>'));
    expect(p, '`title` geri gelmiş — erişilmez kopya').not.toMatch(/title=/);
    expect(p).toMatch(/Kurulu güç ölçülmedi/);
    expect(p, 'yöntem notu ekrana geri yazılmış').not.toMatch(/dikey eksende/);
    expect(p).not.toMatch(/className="not"/);
  });

  it('risk yoğunluğu "ölçülemedi"yi yalnız kritik ve yüksek sıfırken yazar [SAH-SDL-001]', () => {
    /* Aynı "2 ölçülemedi" aynı satırda Kritik risk kaleminde zaten
       yazılıydı. Bilinmeyen ≠ sıfır kuralı bozulmaz: kritik ve yüksek
       sıfırken ölçülemeyen varsa sözcük yine ekrandadır. */
    const bas = GENEL.indexOf('kpiRiskYogunlugu: (');
    const k = GENEL.slice(bas, GENEL.indexOf('  };', bas));
    /* ── İDDİA KOŞULDADIR, BİÇİMDE DEĞİL ────────────────────────────
       İlk yazım kaynağın tam satır düzenine çakılıydı (`… > 0 && \(`)
       ve kalem bir satır kaydığında kırmızı yandı — oysa koşul
       birebir aynıydı. Böyle bir test, iddiasını değil BİÇİMİNİ
       korur: doğru bir düzenlemeyi cezalandırır, yanlış bir koşulu
       aynı biçimde yazan birini geçirir. Bugün üç koşul ayrı ayrı
       aranır ve araya giren boşluk/satır sonu serbesttir. */
    expect(k, 'risk yoğunluğu "ölçülemedi"yi kritik sıfır koşuluna bağlamıyor')
      .toMatch(/risk\.kritik === 0\s*&&\s*risk\.yuksek === 0\s*&&\s*olculemeyenRisk > 0/);
    /* Koşulsuz yazım YASAK: aynı sayı satırda ikinci kez karar taşımaz.

       İLK YAZIM SABOTAJDA YANMADI (R-E bulgusu): kalıp `&& \(` biçimini
       arıyordu, oysa JSX fragmanı (`&& <>`) da aynı kusuru üretir.
       Diş, yazımın BİÇİMİNİ değil, JSX ifade kabının NEYLE BAŞLADIĞINI
       ölçer: kap doğrudan `olculemeyenRisk > 0` ile başlıyorsa koşul
       kaldırılmış demektir. */
    expect(k, 'risk yoğunluğu "ölçülemedi"yi KOŞULSUZ yazıyor — '
      + 'kritik/yüksek sıfır koşulu kaldırılmış')
      .not.toMatch(/\{\s*olculemeyenRisk > 0\s*&&/);
    const kr = GENEL.slice(GENEL.indexOf('kpiKritikRisk: ('), GENEL.indexOf('kpiGecikmisAksiyon: ('));
    expect(kr, 'kritik risk kalemi ölçülemeyeni koşula bağlamıyor')
      .toMatch(/\{olculemeyenRisk > 0 &&/);
  });
});

describe('tip etiketi · aynı ad, iki tip', () => {
  it('çakışan ad sektörle ayrılır; çakışmayan ad olduğu gibi kalır [SAH-SDL-001]', () => {
    const e = tipEtiketleri([
      { kod: 'MERKEZ', ad: 'Merkez BT', sektorAd: 'Enerji' },
      { kod: 'SU-MERKEZ', ad: 'Merkez BT', sektorAd: 'Su' },
      { kod: 'JES', ad: 'Jeotermal', sektorAd: 'Enerji' },
    ]);
    expect(e.get('MERKEZ')).toBe('Merkez BT · Enerji');
    expect(e.get('SU-MERKEZ')).toBe('Merkez BT · Su');
    expect(e.get('JES')).toBe('Jeotermal');
  });

  it('sektörü de aynı ya da bilinmeyen iki tip kodla ayrılır — iki tip hiçbir zaman aynı etiketle çizilmez', () => {
    const e = tipEtiketleri([{ kod: 'A', ad: 'Merkez BT' }, { kod: 'B', ad: 'Merkez BT' }]);
    expect(new Set(e.values()).size).toBe(2);
    expect(e.get('A')).toContain('A');
    const f = tipEtiketleri([{ kod: 'A', ad: 'X', sektorAd: 'S' }, { kod: 'B', ad: 'X', sektorAd: 'S' }]);
    expect(new Set(f.values()).size).toBe(2);
  });

  it('tek sektörlü kiracı hiçbir ek görmez', () => {
    const e = tipEtiketleri([
      { kod: 'JES', ad: 'Jeotermal', sektorAd: 'Enerji' }, { kod: 'RES', ad: 'Rüzgâr', sektorAd: 'Enerji' },
    ]);
    expect([...e.values()]).toEqual(['Jeotermal', 'Rüzgâr']);
  });

  it('ekran etiketi haritadan okur: üçlü blok ve kalan satırı', () => {
    expect(GENEL).toMatch(/const tipEtiketi = tipEtiketleri\(tipler\)/);
    /* İki yerde: üçlü bloğun adı ve açılır listenin satırı. */
    expect(GENEL.match(/<span className="ad">\{tipEtiketi\.get\(t\.kod\) \?\? tipAdi\(t\.kod, t\.ad\)\}<\/span>/g))
      .toHaveLength(2);
  });

  it('küresel güvence: kiracı adı üretilen bir etiketle birebir aynı olsa da iki tip aynı etiketi almaz', () => {
    /* Bağımsız inceleme (PR #64): tip adı kısıtsız kiracı verisidir; "X · A"
       adlı üçüncü bir tip, kodla ayrılmış "X · A" etiketiyle çakışırdı. */
    const e = tipEtiketleri([
      { kod: 'A', ad: 'X', sektorAd: 'S' }, { kod: 'B', ad: 'X', sektorAd: 'S' }, { kod: 'C', ad: 'X · A' },
    ]);
    expect(new Set(e.values()).size).toBe(3);
    expect(e.get('A')).toBe('X · A');
    expect(e.get('C')).toBe('X · A (2)');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   SAH-SDL-002 · EKRANIN BİRİNCİL İŞİ MÜDAHALEDİR

   Ürün kararı (17 Eyl 2026): Saha ekranının TEK birincil işi "bugün neye
   dokunmalıyım". Ölçek bunun TERSİNİ söylüyordu ve ölçüldü: durum
   manşeti 68px, eylem taşıyan tek satır (bulgu başlığı) 13px — beş kat
   fark, karar değerinin ters yönünde. Bu blok kararı sayıya bağlar;
   sayısız bir karar, bir sonraki turda sessizce geri alınır.
   ═══════════════════════════════════════════════════════════════════════ */
describe('SAH-SDL-002 · hiyerarşi karar değerini izler', () => {
  /* Jeton tablosu: ölçek 18 Eyl 2026'da jetona taşındı, bu yüzden kural
     artık literal px değil `var(--t-*)` yazıyor. Yardımcı jetonu ÇÖZER —
     iddia zayıflatılmaz, yalnız okunacağı yer değişir. */
  const JETON = new Map(
    [...CSS.matchAll(/(--t-[a-z-]+):\s*([0-9.]+)px\s*;/g)].map((m) => [m[1], Number(m[2])] as const),
  );
  const px = (secici: string) => {
    const blok = CSS.slice(CSS.indexOf(secici));
    const govde = blok.slice(0, blok.indexOf('}'));
    const jeton = govde.match(/font-size:\s*var\((--t-[a-z-]+)\)/);
    if (jeton) return JETON.get(jeton[1]) ?? null;
    const m = govde.match(/font-size:\s*([0-9.]+)px/);
    return m ? Number(m[1]) : null;
  };

  it('durum manşeti, eylemli satırı ÜÇ KATTAN fazla ezmez [SAH-SDL-002]', () => {
    const mansetPx = px('.ab-b-dikkat .endeks .sayi {');
    const konuPx = px('.ab-b-dikkat .kalem .konu {');
    expect(mansetPx, 'manşet ölçüsü okunamadı').toBeTruthy();
    expect(konuPx, 'bulgu başlığı ölçüsü okunamadı').toBeTruthy();
    /* Eşik ORAN, sabit sayı değil: ikisinden biri değişse de kural
       ölçmeye devam eder. 68/13 = 5,2 idi; ölçek jetona taşındıktan sonra 40/16 = 2,5. */
    expect(mansetPx! / konuPx!,
      'durum manşeti eylemli satırı yeniden eziyor').toBeLessThanOrEqual(3);
  });

  it('HAYALET SIRA RAKAMLARI ekranda yok [SAH-SDL-002]', () => {
    /* 26px, `--hr2` rengiyle 1,30:1 — bilgi taşıyorsa erişilemez,
       taşımıyorsa süs; `aria-hidden` olması ikincisini söylüyordu. */
    expect(GENEL, 'sıra rakamları geri gelmiş').not.toMatch(/className="sira"/);
  });

  it('ray KARAR SIRASINA dizilir — uygunsuzu olan önde [SAH-SDL-002]', () => {
    const bas = GENEL.indexOf('<div className="kartlar">');
    const blok = GENEL.slice(bas, GENEL.indexOf('</div>', bas));
    expect(blok, 'ray sunucunun verdiği sırayı olduğu gibi çiziyor')
      .toMatch(/\.sort\(\(a, b\) =>/);
    expect(blok).toMatch(/uyumsuz/);
  });

  it('panel etiketi KAPSAMDAN türer — koşulsuz "Grup durumu" yok [SAH-SDL-002]', () => {
    /* Kapsamı daraltılmış kullanıcıya "Grup durumu" demek, ekranın
       gösterdiği sayıların kapsamını yanlış beyan etmektir. */
    expect(GENEL).toMatch(/const durumEtiketi = kapsamli/);
    expect(GENEL, 'etiket yeniden sabit yazılmış')
      .not.toMatch(/<p className="etiket">Grup durumu/);
    expect(GENEL).toMatch(/aria-label=\{durumEtiketi\}/);
  });
});
