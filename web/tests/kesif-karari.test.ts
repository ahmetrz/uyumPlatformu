import { describe, expect, it } from 'vitest';
import { kesifKarari } from '../arac/test-envanteri.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   KEŞİF SIFIR DÖNERSE ÖLÇÜM DEĞİL, KIRIK

   ── Ölçülen olay (7 Eylül 2026) ───────────────────────────────────────
   Disk doldu. Vitest test modüllerinin HEPSİNİ topladı ama hiçbirinin
   gövdesini çözemedi; `unhandledErrors` BOŞ geldi ve keşif
   "158 dosya · 0 vaka" döndürdü.

     · `sayimlar:yenile` bu sıfırı anlık görüntüye YAZDI,
     · `sayimlar:denetle` onu okuyup "taze · 0 vaka · gerçek keşifle
       DOĞRULANDI" dedi ve YEŞİL yandı.

   Kapı hiçbir şey ölçmediği hâlde geçti. Bu, projenin "koşulmayan kapı
   'geçti' diye yazılmaz" kuralının aynısıdır: ölçemeyen kapı da
   "geçti" yazmamalı.

   Diskin dolmasının sebebi ayrıca kapatıldı (`tests/kurulum/disk-kapisi.ts`
   koşum sonunda kendi geçici dizinlerini siliyor); ama SEBEBİ kapatmak
   BELİRTİYİ kapatmaz — bu karar, sıfır dönen her keşfi kırık sayar.

   Karar SAF olduğu için burada diski doldurmadan sınanır.
   ═══════════════════════════════════════════════════════════════════════ */

describe('keşif kararı · sıfır ölçüm değildir', () => {
  it('sağlam keşif GEÇER', () => {
    expect(kesifKarari({ 'tests/a.test.ts': { vaka: 3, atlanan: 0 } })).toBeNull();
  });

  it('HİÇ modül yoksa kırık — sebebi adıyla', () => {
    const m = kesifKarari({});
    expect(m).toMatch(/KEŞİF BOŞ/);
    expect(m).toMatch(/vitest\.config\.ts/);
  });

  it('SIFIR vaka bildiren modül kırık sayılır — ölçülen olayın kendisi', () => {
    const m = kesifKarari({
      'tests/a.test.ts': { vaka: 0, atlanan: 0 },
      'tests/b.test.ts': { vaka: 0, atlanan: 0 },
    });
    expect(m).toMatch(/KEŞİF KIRIK/);
    expect(m).toMatch(/2\/2/);
    expect(m, 'sebep yazılı olmalı: yarım saatlik yanlış iz sürmeyi kesen şey bu')
      .toMatch(/diskte yer kalmaması/);
  });

  it('TEK modül sıfır dönse de kırık — kısmi keşif de ölçüm değildir', () => {
    /* "Çoğu doluysa geçsin" demek, keşfin yarısı çöktüğünde sayının
       sessizce düşmesine izin verirdi; düşen sayı da bir ölçüdür ve
       yanlış olur. */
    const m = kesifKarari({
      'tests/a.test.ts': { vaka: 5, atlanan: 0 },
      'tests/b.test.ts': { vaka: 0, atlanan: 0 },
    });
    expect(m).toMatch(/1\/2/);
    expect(m).toContain('tests/b.test.ts');
  });

  it('ATLANAN vaka sıfır sayılmaz — atlanan da bir vakadır', () => {
    /* `it.skip` bir vakadır ve keşifte görünür; onu kırık saymak, bir
       dosyanın bütün vakalarını atlamayı imkânsız kılardı. */
    expect(kesifKarari({ 'tests/a.test.ts': { vaka: 2, atlanan: 2 } })).toBeNull();
  });
});
