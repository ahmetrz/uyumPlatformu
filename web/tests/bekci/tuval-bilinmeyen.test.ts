import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* İKİNCİ EKSENDE DE BİLİNMEYEN ≠ SIFIR — SIS-SAHA-002.

   ── ÖLÇÜLEN KUSUR (bağımsız audit, 14 Eylül 2026, 1440×900) ───────────
   Saha tuvali iki ekseni olan bir dağılımdır: yatay uyum endeksi, dikey
   kurulu güç. Dosyanın kendi başlığı "Ölçülmemiş tesis eksene KONMAZ"
   diyordu ve bunu YALNIZ yatay eksende uyguluyordu: `endeks === null`
   olan tesis tuvalden çıkıyor, kendi özetinde sayılıyordu.

   Dikey eksende aynı kural YOKTU. `dikey()` gücü olmayan tesis için
   `√(0 / enGuc)` hesaplıyor ve onu TABANA çakıyordu — yani "kurulu gücü
   ÖLÇÜLMEDİ" ile "kurulu gücü sıfır ÖLÇÜLDÜ" ekranda aynı yerde
   duruyordu. Ürünün bağlayıcı kuralı bunu yasaklar ve kusurun ikinci bir
   bedeli daha vardı: tabana yığılan dört tesisin künyeleri şerit şerit
   yukarı itiliyor, biri kendi işaretinden 303 piksel uzağa, BAŞKA bir
   kümenin içine düşüyordu (bkz. `kunyeYolu.ts`).

   ── BU BEKÇİ NE TUTAR ─────────────────────────────────────────────────
   Kaynağı okur: tuvale giren küme gücü ölçülmüş olanlarla SINIRLIDIR,
   gücü ölçülmemiş olanlar kendi şeridinde ADIYLA durur ve o şerit
   ekrandan düşmez. Bilgi gizlenmesin diye şeridin endeksi ve uygunsuz
   sayısını yazdığı da ölçülür.

   SINIR (beyanlı): kapı kümelerin AYRILDIĞINI ölçer, ekrandaki görsel
   sonucu değil — R-D ve R-F'te kabul edilmiş aynı sınır. */

const EKRAN = 'app/(kabuk)/(flagship)/Genel.tsx';
const KAYNAK = readFileSync(EKRAN, 'utf8');

describe('Saha tuvali · bilinmeyen güç eksene konmaz [SIS-SAHA-002]', () => {
  it('[SIS-SAHA-002] tuvale YALNIZ gücü ölçülmüş tesis girer — `guc === null` '
    + 'olan tesisi tabana koymak "gücü sıfır" demektir', () => {
    expect(KAYNAK, 'tuval kümesi gücü ölçülmüşle sınırlanmamış')
      .toMatch(/const tuvalde = tesisler\.filter\(\(s\) =>[^\n]*s\.guc !== null\)/);
    /* Tuval döngüsü o kümeden beslenmeli; eski `olculen` geri gelmemeli. */
    expect(KAYNAK, 'tuval döngüsü başka bir kümeden besleniyor')
      .toContain('{tuvalde.map((s, i) => {');
    expect(KAYNAK, 'eski `olculen` kümesi tuvale geri gelmiş')
      .not.toContain('{olculen.map(');
  });

  it('[SIS-SAHA-002] gücü ölçülmemiş tesis EKRANDAN DÜŞMEZ — ayrı şeridinde '
    + 'adıyla, endeksiyle ve uygunsuz sayısıyla durur', () => {
    expect(KAYNAK, 'gücü ölçülmemiş küme türetilmiyor')
      .toMatch(/const gucsuz = tesisler\.filter\(\(s\) =>[^\n]*s\.guc === null\)/);
    const serit = KAYNAK.slice(KAYNAK.indexOf('{gucsuz.length > 0 && ('));
    const blok = serit.slice(0, serit.indexOf('\n          )}'));
    expect(blok.length, 'şerit hiç çizilmiyor').toBeGreaterThan(0);
    expect(blok, 'şerit adını söylemiyor').toMatch(/Kurulu güç ölçülmedi/);
    expect(blok, 'şerit tesis adını yazmıyor').toContain('{g.ad}');
    expect(blok, 'şerit uyum endeksini yazmıyor').toContain('%{g.endeks}');
    expect(blok, 'şerit uygunsuz sayısını yazmıyor').toContain('uygunsuz');
  });

  it('[SIS-SAHA-002] şerit KONUMLU DAĞILIM DEĞİL — tek satırlık bir bantta '
    + 'yatay konumlanan künyeler birbirinin üstüne biner (ölçüldü: ilk '
    + 'yazımda dört künye çakıştı ve okunamaz metin çıktı)', () => {
    const serit = KAYNAK.slice(KAYNAK.indexOf('{gucsuz.length > 0 && ('));
    const blok = serit.slice(0, serit.indexOf('\n          )}'));
    expect(blok, 'şerit yine mutlak konumla çiziliyor').not.toMatch(/left: `\$\{/);
    expect(blok, 'şerit liste değil').toContain('<ul className="serit">');
  });

  it('[SIS-SAHA-002] şerit KARAR SIRASINDA — en düşük endeks önce; '
    + 'rastgele sıra, bakılacak tesisi okuyanın aramasına bırakır', () => {
    const serit = KAYNAK.slice(KAYNAK.indexOf('{gucsuz.length > 0 && ('));
    const blok = serit.slice(0, serit.indexOf('\n          )}'));
    expect(blok, 'şerit sıralanmıyor')
      .toMatch(/\.sort\(\(a, b\) => \(a\.endeks \?\? 0\) - \(b\.endeks \?\? 0\)\)/);
  });
});
