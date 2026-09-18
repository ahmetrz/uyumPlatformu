import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · SAHA ŞERİDİ ÖLÇÜLENİ DÜŞÜREMEZ (SAH-SER-002)

   ── ÖLÇÜLEN ───────────────────────────────────────────────────────────
   Kullanıcı saha şeridinin kaydırma çubuğunu İKİ KEZ bildirdi (15 ve
   18 Eyl 2026): "siteden bağımsız, kötü ve çok dikkat çekiyor". Çubuğun
   RENGİ düşürülemez (WCAG 1.4.11 · 3:1, `DESIGN.md`de dört zeminde
   ölçülü) ve GİZLENEMEZ (gizleme izni kabuk gezinme raylarıyla sınırlı,
   URN-CBK-001). Kalan tek yol uzunluktu ve orası ölçüldü:

     24 kart × 218px = 5 224px · 1914px bantta başparmak %37

   İlk plan "yalnız müdahale gerektirenleri göster" idi ve ÖLÇÜM ONU
   ÇÜRÜTTÜ: 6 tesisin uygunsuzu var, **16'sı ÖLÇÜLMEMİŞ**, 2'si temiz.
   "Müdahale gerektiren" = uygunsuz + bilinmeyen = 22/24; süzmek iki
   kartı düşürürdü. Şerit çok şey gösterdiği için uzun değildi.

   Asıl bulgu bir TEKRARDI: o 16 tesis aynı ekranda İKİ KEZ duruyor —
   takımyıldızın değerlendirilmemiş bandında (sayı · güç · ilk üç ad ·
   açılır panel) ve şeritte 16 kart olarak (3 488px). Tekrar eden bir
   değer farklı bir karar amacı taşımıyorsa bilişsel yük kusurudur.

   ── BU BEKÇİ NEYİ KORUR ───────────────────────────────────────────────
   Süzgeç bir RİSK taşır: ölçütü kayan bir filtre, bir gün gerçekten
   karar gerektiren bir tesisi sessizce düşürebilir. Diş bu yüzden
   ölçütün KENDİSİNİ sabitler.

   1 · Şerit ÖLÇÜLENİ süzer — ölçütü `endeks !== null`dur. Uygunsuzluğa,
       skora ya da tipe göre süzmek YASAK: o ölçütler bir uygunsuzu
       gizleyebilir.
   2 · Süzülen küme ADLARIYLA başka bir yüzeyde durur — takımyıldızın
       değerlendirilmemiş şeridi (`olculmemisSirali` · `serit=`).
   3 · Başlık PORTFÖYÜN TAMAMINI söyler; şeridin uzunluğu değil.
   4 · Şeridin sonunda tümüne giden bağ vardır.
   ═══════════════════════════════════════════════════════════════════════ */

const KAYNAK = readFileSync(
  join(__dirname, '..', '..', 'app', '(kabuk)', '(flagship)', 'Genel.tsx'), 'utf8',
);
/** Yorumsuz: gerekçe metnindeki kod örneği kural sayılmaz. */
const KOD = KAYNAK.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** `.kartlar` bloğunun gövdesi. */
function seritGovdesi(): string {
  const bas = KOD.indexOf('<div className="kartlar">');
  expect(bas, 'şerit kabı (.kartlar) bulunamadı').toBeGreaterThan(-1);
  return KOD.slice(bas, KOD.indexOf('</div>', bas));
}

describe('bekçi · saha şeridi', () => {
  it('BİRİNCİ DİŞ · süzgeç ÖLÇÜLMÜŞLÜĞE bakar, uygunsuzluğa değil [SAH-SER-002]', () => {
    const g = seritGovdesi();
    const suzgec = /\.filter\(\((\w+)\) => \1\.endeks !== null\)/.exec(g);
    expect(suzgec, 'Şerit süzgeci `endeks !== null` DEĞİL. Uygunsuzluğa, skora ya da '
      + 'tipe göre süzmek bir uygunsuzu gizleyebilir; ölçüt yalnız ÖLÇÜLMÜŞLÜKTÜR.\n'
      + g.slice(0, 400)).not.toBeNull();
    /* İkinci bir süzgeç eklemek ölçütü sessizce daraltır. */
    expect((g.match(/\.filter\(/g) ?? []).length, 'Şeritte birden çok süzgeç var — '
      + 'ölçüt tek olmalı').toBe(1);
  });

  it('İKİNCİ DİŞ · süzülen küme başka bir yüzeyde ADIYLA durur [SAH-SER-002]', () => {
    /* Ölçülmemişler takımyıldızın kendi şeridinde gösterilir; o bağ
       koparsa 16 tesis ekrandan TÜMÜYLE kaybolur ve "bilinmeyen ≠ sıfır"
       kuralı çiğnenir. */
    expect(KOD, 'ölçülmemiş şeridi türetilmiyor').toMatch(/olculmemisSirali\(tesisler\)/);
    expect(KOD, 'ölçülmemiş şeridi takımyıldıza verilmiyor — süzülen küme hiçbir '
      + 'yüzeyde görünmüyor olurdu').toMatch(/serit=\{olculmemisSerit\}/);
    expect(KOD, 'ölçülmemiş süzgeci `endeks === null` değil')
      .toMatch(/\.filter\(\((\w+)\) => \1\.endeks === null\)/);
  });

  it('ÜÇÜNCÜ DİŞ · başlık portföyün TAMAMINI söyler [SAH-SER-002]', () => {
    const bas = KOD.indexOf('<section className="ab-b-serit"');
    const baslik = KOD.slice(bas, KOD.indexOf('</header>', bas));
    expect(baslik, 'şerit başlığı toplam tesis sayısını taşımıyor — kullanıcı '
      + 'gördüğü kart sayısını portföyün tamamı sanardı').toMatch(/ozet\.tesisSayisi/);
  });

  it('DÖRDÜNCÜ DİŞ · şeridin sonunda tümüne giden bağ var [SAH-SER-002]', () => {
    const g = seritGovdesi();
    expect(g, 'şeritte portföye giden bağ yok').toMatch(/href="\/tesisler"/);
    /* Bağ SONDA durur: karar sırası önce, gezinme sonra. */
    expect(g.indexOf('href="/tesisler"'), 'tümü bağı kartlardan ÖNCE geliyor')
      .toBeGreaterThan(g.indexOf('SahaKarti'));
  });
});
