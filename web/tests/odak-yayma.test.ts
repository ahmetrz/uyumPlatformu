import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  HEPSI, enZayif, sirala, suz, type PortfoySatiri,
} from '@/app/(tam)/portfoy/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   ODAK TURU · YAYMA — arketipten öbür ekranlara

   `/uyum` arketipinde kurulan yön (başlık cevabı taşır ve cümle
   düzenindedir · önem sırası · ikincil bilgi katlanır · kaş ile veri
   ayrı sesle konuşur) ana sayfaya, portföye, tesis dosyasına ve
   envantere taşındı. Büyük harf kuralının kendisi bekçide
   (`tests/bekci/buyuk-harf.test.ts`); burada ekranların KENDİ
   kararları sabitlenir. Her vaka sabotajlıdır (`arac/sabotaj.mjs`).
   ═══════════════════════════════════════════════════════════════════════ */

const PORTFOY = readFileSync('app/(tam)/portfoy/Portfoy.tsx', 'utf8');
const TESIS360 = readFileSync('app/(kabuk)/(flagship)/tesisler/[id]/Tesis360.tsx', 'utf8');
const UYUM = readFileSync('app/(kabuk)/(operasyonel)/uyum/UyumIstemci.tsx', 'utf8');
const CSS = readFileSync('app/kabuk.css', 'utf8');

function satir(kismi: Partial<PortfoySatiri> & { id: string; ad: string }): PortfoySatiri {
  return {
    tipKod: 'JES', tipAdi: 'Jeotermal', tuzelKisi: null, konum: null, kritiklik: null,
    guc: null, gucBirim: null, uyumYuzde: null, bilinmeyenOran: null,
    acikBulgu: 0, acikRisk: 0, gorselAnahtari: null, sektorId: null,
    ...kismi,
  } as PortfoySatiri;
}

describe('portföy · ekran en zayıftan açılır', () => {
  it('varsayılan sıralama anahtarı UYUM endeksidir, kapasite değil [PRT-ODK-001]', () => {
    /* Ölçüldü: ekran kapasite sırasıyla açılıyor ve kendi notunda "kapasite
       bir zayıflık ölçüsü değil — en zayıf işareti bu sıralamada yok"
       diyordu; ilk açılışta cevap yoktu. */
    expect(PORTFOY).toMatch(/useState<SiralamaAnahtari>\('uyum'\)/);
    expect(PORTFOY).not.toMatch(/useState<SiralamaAnahtari>\('guc'\)/);
    /* Kimlik paneli de sıralı listenin İLKİNİ gösterir: seçim başta boş,
       `secili` sıralı listeye düşer. Ölçüldü: seçim sırasız listenin
       ilkiyle başlıyordu ve panel en zayıfı değil başka bir tesisi
       gösteriyordu — sıra ile panel iki ayrı şey söylüyordu. */
    expect(PORTFOY).toMatch(/useState<string \| null>\(null\)/);
    expect(PORTFOY).toMatch(/gorunen\.find\(\(s\) => s\.id === seciliId\) \?\? gorunen\[0\]/);
  });

  it('uyum sırası en düşük endeksi ÖNE, ölçülmemişi SONA koyar — bilinmeyen ≠ sıfır [PRT-ODK-001]', () => {
    const liste = [
      satir({ id: 'a', ad: 'A', uyumYuzde: 73 }),
      satir({ id: 'b', ad: 'B', uyumYuzde: null }),
      satir({ id: 'c', ad: 'C', uyumYuzde: 42 }),
      satir({ id: 'd', ad: 'D', uyumYuzde: 0 }),
    ];
    const sirali = sirala(suz(liste, { tip: HEPSI, tuzelKisi: HEPSI }), 'uyum').map((s) => s.id);
    /* Ölçülmüş SIFIR en zayıftır ve öne gelir; ölçülmemiş (null) sıfırdan
       KÜÇÜK sayılmaz, en sona düşer. */
    expect(sirali).toEqual(['d', 'c', 'a', 'b']);
    /* İlk satır "en zayıf"tır ve gerekçesi endeksle yazılır. */
    expect(enZayif(liste, 'uyum')).toEqual({ id: 'd', neden: '%0 uyum' });
    /* Hiçbiri ölçülmemişse en zayıf YOKTUR — uydurulmaz. */
    expect(enZayif([satir({ id: 'x', ad: 'X' })], 'uyum')).toBeNull();
  });
});

describe('tesis dosyası · başlık cümle düzeninde', () => {
  it('h1 adı JS ile de büyük harfe çevirmez — CSS kuralı tek başına yetmezdi [TES-ODK-001]', () => {
    /* Ad iki yerde birden büyük harfe çevriliyordu: CSS `text-transform` ve
       `toLocaleUpperCase('tr-TR')`. Yalnız CSS düzeltilseydi ekran aynı
       kalırdı ve bekçi yeşil yanardı. */
    const h1 = TESIS360.match(/<h1>[\s\S]*?<\/h1>/)?.[0] ?? '';
    expect(h1).toContain('{ilkKelime}');
    expect(h1).not.toMatch(/toLocaleUpperCase/);
    expect(CSS).toMatch(/\.ab-b-plaka \.kimlik h1 \{[^}]*line-height: \.92/);
    expect(CSS).not.toMatch(/\.ab-b-plaka \.kimlik h1 \{[^}]*text-transform: uppercase/);
  });
});

describe('uyum · altbilgi dip nottur, kaş değil', () => {
  it('cümle taşıyan altbilgi `.ab-dip.satir` ile yazılır ve kural CSS’te durur [SIS-UYM-039]', () => {
    expect(UYUM).toMatch(/<p className="ab-dip satir" style=\{\{ marginTop: 26 \}\}>/);
    expect(UYUM).not.toMatch(/<p className="etiket" style=\{\{ marginTop: 26/);
    expect(CSS).toMatch(/\n\.ab-dip\.satir \{[^}]*display: flex/);
  });
});

describe('saha · şerit kartının adı ve tip etiketi cümle düzeninde', () => {
  it('kart adı ve tip etiketi büyük harf taşımaz [SAH-ODK-001]', () => {
    /* Bu vaka bir zamanlar gücü ölçülmemiş şeridinin notunu da ölçüyordu
       (`.ab-gucsuz .not`, kaştan büyük harf miras alıyordu). Sadeleştirme
       turu (15 Eyl 2026) notu ekrandan `title`a taşıdı; o sözleşme artık
       SAH-SDL-001'in (tests/saha-sadelestirme.test.ts) — burada tutmak
       kütüğe tersine bir beyan yazardı (bağımsız inceleme, PR #64). */
    /* Kart adı ve tip etiketi cümle düzeninde (24 kart × 2 satır). */
    expect(CSS).toMatch(/\.ab-b-serit \.kart \.ad \{[^}]*\}/);
    expect(CSS.match(/\.ab-b-serit \.kart \.ad \{[^}]*\}/)?.[0]).not.toMatch(/uppercase/);
    expect(CSS.match(/\.ab-b-serit \.kart \.tip \{[^}]*\}/)?.[0]).not.toMatch(/uppercase/);
  });
});
