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
  });

  it('yığın çubuğu bandın altında okunur boyda (3px)', () => {
    expect(blok('.ab-b-serit .kart .ab-b-yigin')).toMatch(/height: 3px/);
  });
});

describe('saha · karar yüzeyinde tekrar ve yöntem notu yok', () => {
  it('katman panelinin kalan satırı SAYI söyler, tip adları title\'ta [SAH-SDL-001]', () => {
    const bas = GENEL.indexOf('<p className="mono kalan"');
    expect(bas).toBeGreaterThan(0);
    const p = GENEL.slice(bas, GENEL.indexOf('</p>', bas));
    const kapanis = p.indexOf('}>');
    const acilis = p.slice(0, kapanis);
    const govde = p.slice(kapanis + 2);
    expect(acilis).toMatch(/title=\{tipler\.slice\(KATMAN_TAVANI\)/);
    expect(govde).toMatch(/Diğer \{tipler\.length - KATMAN_TAVANI\} tip/);
    expect(govde).not.toMatch(/\.map\(/);
  });

  it('gücü ölçülmemiş şeridinin yöntem notu ekranda değil title\'ta [SAH-SDL-001]', () => {
    const s = GENEL.slice(GENEL.indexOf('<div className="ab-gucsuz">'));
    const p = s.slice(0, s.indexOf('</p>'));
    const kapanis = p.indexOf('}>');
    expect(p.slice(0, kapanis)).toMatch(/title=\{`Bu \$\{terim\('tesis', 'cogul'\)\} için uyum endeksi ölçüldü/);
    expect(p.slice(kapanis + 2)).toMatch(/Kurulu güç ölçülmedi/);
    expect(p.slice(kapanis + 2)).not.toMatch(/dikey eksende/);
    expect(p).not.toMatch(/className="not"/);
  });

  it('risk yoğunluğu "ölçülemedi"yi yalnız kritik ve yüksek sıfırken yazar [SAH-SDL-001]', () => {
    /* Aynı "2 ölçülemedi" aynı satırda Kritik risk kaleminde zaten
       yazılıydı. Bilinmeyen ≠ sıfır kuralı bozulmaz: kritik ve yüksek
       sıfırken ölçülemeyen varsa sözcük yine ekrandadır. */
    const bas = GENEL.indexOf('kpiRiskYogunlugu: (');
    const k = GENEL.slice(bas, GENEL.indexOf('  };', bas));
    expect(k).toMatch(/\{risk\.kritik === 0 && risk\.yuksek === 0 && olculemeyenRisk > 0 && \(/);
    expect(k).not.toMatch(/\n\s*\{olculemeyenRisk > 0 && \(/);
    const kr = GENEL.slice(GENEL.indexOf('kpiKritikRisk: ('), GENEL.indexOf('kpiGecikmisAksiyon: ('));
    expect(kr).toMatch(/\{olculemeyenRisk > 0 && \(/);
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
    expect(GENEL).toMatch(/<span className="ad">\{tipEtiketi\.get\(t\.kod\) \?\? tipAdi\(t\.kod, t\.ad\)\}<\/span>/);
    expect(GENEL).toMatch(/title=\{tipler\.slice\(KATMAN_TAVANI\)\n\s*\.map\(\(t\) => tipEtiketi\.get\(t\.kod\)/);
  });
});
