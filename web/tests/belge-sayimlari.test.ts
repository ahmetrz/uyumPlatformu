import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/* Belge sapması bekçisi.

   ── Kapatılan sorun ────────────────────────────────────────────────────
   Durum belgeleri elle yazılmış sayılar taşıyordu ve birbirleriyle
   çelişiyorlardı: bir belge "428 test", başkası "689", gerçek başka.
   Okuyucu hangisinin doğru olduğunu bilemez; daha kötüsü, bilmediğini de
   bilemez. Bir sayı belgede DONDUĞU anda belge yalan söylemeye başlar ve
   yalanı kimse fark etmez, çünkü belgeyi kimse koda karşı koşturmaz.

   Bu test koşturur. İki kural:

   1. Kanonik belgeler sayıyı `arac/sayimlar.mjs`'in ürettiği bloktan alır;
      blok kaynaktan türetilmiş gerçekle birebir tutmalıdır.
   2. Kanonik belgelerde blok DIŞINDA elle yazılmış sayaç cümlesi
      ("N test", "N motor", "N rota"…) BULUNMAZ. Yasak, sayının yanlış
      olmasına değil, DONMASINA karşıdır.

   Tarihsel analizler bu kuralın dışındadır ama kendilerini açıkça
   işaretlemek zorundadır — işaretsiz eski belge, güncel sanılan eski
   belgedir ve en tehlikelisi odur. */

const KOK = path.resolve('..');

async function araci() {
  return import('../arac/sayimlar.mjs');
}

/** Sayı taşımasına izin verilen tek yer: üretilen blok. */
const KANONIK = [
  'PRE_INTERNAL_INTEGRATION_READINESS.md',
  'INTEGRATION_DAY_RUNBOOK.md',
  'README.md',
  'docs/POSTGRES_READINESS.md',
  'docs/PERFORMANS_TABANI.md',
];

/** Kendini tarihsel ilan etmesi gereken belgeler. */
const TARIHSEL = [
  'ARCHITECTURE_GAP_ANALYSIS.md',
  'DESIGN_HANDOFF_GAP.md',
  /* Bir denetimin ÖNCE/SONRA kaydıdır: amacı gereği o günkü sayılarla
     dondurulmuştur. Sonradan düzeltilirse denetim kaydı olmaktan çıkar. */
  'ENTEGRASYON_GAP_MATRIX.md',
];

const TARIHSEL_IM = '<!-- TARİHSEL ANLIK GÖRÜNTÜ -->';

/* Elle yazılmış sayaç cümlesi kalıpları. Sayının kendisi değil, sayının
   bir ÖLÇÜYE bağlanması yasak — "10.000 satır" bir ölçüm sonucudur ve
   serbesttir, "43 test dosyası" ise donmuş bir sayaçtır. */
const SAYAC_KALIPLARI = [
  /\b\d{1,5}\s*(?:\/\s*\d{1,5}\s*)?test\b/i,
  /\btest\s*(?:sayısı|dosyası)?\s*[:=]\s*\d/i,
  /\b\d{1,3}\s*(?:otomasyon\s*)?motor(?:u|ü)?\b/i,
  /\b\d{1,3}\s*adaptör/i,
  /\b\d{1,3}\s*rota\b/i,
  /\b\d{1,3}\s*(?:uygulanmış\s*)?göç\b/i,
  /\b\d{1,3}\s*Prisma\s*model/i,
  /\b\d{1,4}\s*(?:passed|geçti)\b/i,
];

function oku(bagil: string): string {
  return readFileSync(path.join(KOK, bagil), 'utf8');
}

describe('Belge sayımları koda karşı doğrulanır', () => {
  it('araç, vitest ile AYNI dosya kümesini sayar', async () => {
    const { sayimlar } = await araci();
    const s = sayimlar();
    /* Araç `tests` altındaki her `.test.ts` dosyasını sayar; vitest'in
       yapılandırılmış glob'u da öyle. İkisi ayrışırsa sayım sessizce
       yanlış olurdu. Alt sınır, dosya kümesinin boş dönmediğinin kanıtı. */
    expect(s['test dosyası']).toBeGreaterThan(30);
    expect(s['test vakası']).toBeGreaterThan(s['test dosyası']);
    expect(s['atlanan test']).toBeLessThanOrEqual(s['test vakası']);
  });

  it('sayılan her ölçü kaynaktan türetilir ve sıfır değildir', async () => {
    const { sayimlar } = await araci();
    for (const [ad, deger] of Object.entries(sayimlar())) {
      if (ad === 'atlanan test') continue;   // sıfır olması İYİDİR
      expect(deger, `${ad} sıfır çıktı — sayım kırılmış olmalı`).toBeGreaterThan(0);
    }
  });

  it.each(['PRE_INTERNAL_INTEGRATION_READINESS.md'])(
    '%s içindeki blok GÜNCEL', async (bagil) => {
      const { blok, BASLA, BITIS } = await araci();
      const metin = oku(bagil);
      const b = metin.indexOf(BASLA);
      const e = metin.indexOf(BITIS);
      expect(b, `${bagil} sayım bloğu taşımıyor`).toBeGreaterThan(-1);
      const mevcut = metin.slice(b, e + BITIS.length).trim();
      expect(
        mevcut,
        `${bagil} güncel değil. Düzeltme: cd web && node arac/sayimlar.mjs --yaz`,
      ).toBe(blok().trim());
    },
  );

  it('kanonik belgelerde blok DIŞINDA elle sayaç yok', async () => {
    const { BASLA, BITIS } = await araci();
    const suclular: string[] = [];
    for (const bagil of KANONIK) {
      const metin = oku(bagil);
      const b = metin.indexOf(BASLA);
      const e = metin.indexOf(BITIS);
      const disi = b >= 0 && e >= 0
        ? metin.slice(0, b) + metin.slice(e + BITIS.length)
        : metin;
      disi.split('\n').forEach((satir, i) => {
        if (satir.trimStart().startsWith('<!--')) return;
        for (const k of SAYAC_KALIPLARI) {
          if (k.test(satir)) { suclular.push(`${bagil}:${i + 1} → ${satir.trim().slice(0, 90)}`); break; }
        }
      });
    }
    expect(
      suclular,
      'Elle yazılmış sayaç donar ve belge yalan söylemeye başlar. '
      + 'Sayıyı `arac/sayimlar.mjs` bloğuna bırakın ya da cümleyi sayısız yazın.',
    ).toEqual([]);
  });

  it('tarihsel belgeler kendilerini AÇIKÇA işaretler', () => {
    for (const bagil of TARIHSEL) {
      const bas = oku(bagil).split('\n').slice(0, 20).join('\n');
      expect(
        bas,
        `${bagil} tarihsel ama işaretsiz — işaretsiz eski belge, güncel sanılan eski belgedir.`,
      ).toContain(TARIHSEL_IM);
    }
  });
});
