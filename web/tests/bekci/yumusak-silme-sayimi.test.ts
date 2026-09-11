import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/* ═══════════════════════════════════════════════════════════════════════
   YUMUŞAK SİLİNMİŞ KAYIT SAYILMAZ · BEKÇİ [SIS-SIL-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   `Madde.silindi` YUMUŞAK silme alanıdır: satır durur, listeden düşer.
   Madde LİSTESİ her yerde `silindi: null` süzgecinden geçiyordu; madde
   SAYISI (`_count`) geçmiyordu. İki sayı sessizce ayrışıyordu.

   Kusur üç ayrı yerde bulundu ve üçü de ayrı turda çıktı — yani örnek
   avlamak SINIFI kapatmadı:

     · `/regulasyonlar` — sayı ekranın BOŞLUK CÜMLESİNİ belirliyordu
       (bağımsız inceleme, PR #51 tur 1);
     · `/yonetim-tezgahi` — sayı bir KARAR sürüyordu ("madde içe
       aktarılmadı" eksiği); maddeleri tümüyle silinmiş aktif bir
       regülasyon "578 kullanım" gösterip eksiği GİZLİYORDU;
     · `/uyum` — taslağın madde sayısı ekrana "N madde, aktifleştirme
       bekliyor" diye çıkıyor ve ŞİŞİYORDU.
   (son ikisi: tur 2)

   ── NE ÖLÇÜLÜR ────────────────────────────────────────────────────────
   `_count` içinde `maddeler` sayan HER yer `where: { silindi: null }`
   taşır. Bu bir SAYIM kuralıdır ve "bilinmeyen ≠ sıfır"ın kardeşidir:
   SİLİNMİŞ ≠ VAR. Meşru istisna gerekçeli listede durur ve liste yalnız
   küçülür.
   ═══════════════════════════════════════════════════════════════════════ */

/** `_count: { … }` bloklarını DENGELİ okur. Düzenli ifade yetmez:
    `_count: { select: { maddeler: { where: { silindi: null } } } }` üç
    katman iç içedir ve sabit derinlikli bir kalıp onu kaçırır — kaçıran
    bir bekçi de her şeyi geçirir. */
export function sayimBloklari(kod: string): string[] {
  const cikan: string[] = [];
  const kalip = /_count\s*:\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = kalip.exec(kod)) !== null) {
    let i = m.index + m[0].length;
    let derinlik = 1;
    for (; i < kod.length && derinlik > 0; i += 1) {
      if (kod[i] === '{') derinlik += 1;
      else if (kod[i] === '}') derinlik -= 1;
    }
    cikan.push(kod.slice(m.index, i).replace(/\s+/g, ' '));
  }
  return cikan;
}

function yorumsuz(kod: string): string {
  return kod.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Gerekçeli istisna — yalnız küçülür. Bugün BOŞ. */
const IZIN: { yer: string; sebep: string }[] = [];

describe('madde sayımı SİLİNMİŞİ saymaz [SIS-SIL-001]', () => {
  const dosyalar = execFileSync('git', ['ls-files', '-z', 'app', 'lib', 'components'],
    { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\0').filter((d) => /\.(ts|tsx)$/.test(d) && !/prisma-client/.test(d));

  const bulunan: { yer: string; blok: string }[] = [];
  for (const d of dosyalar) {
    const kod = yorumsuz(readFileSync(d, 'utf8'));
    for (const blok of sayimBloklari(kod)) {
      if (/\bmaddeler\b/.test(blok)) bulunan.push({ yer: d, blok });
    }
  }

  it('KAPSAM boş değil — kalıp bozulursa bekçi her şeyi geçirirdi [SIS-SIL-001]', () => {
    /* Sıfır ölçümle "kusur yok" demek hiçbir şeye bakmadan temiz
       raporlamaktır; bu depoda sayım kapısı tam bu şekilde kandırıldı. */
    expect(bulunan.length, 'madde sayan hiçbir `_count` bulunamadı — kalıp bozuk')
      .toBeGreaterThanOrEqual(3);
  });

  it('HER madde sayımı `silindi: null` süzgeci TAŞIR [SIS-SIL-001]', () => {
    const kusur = bulunan
      .filter((b) => !/maddeler\s*:\s*\{[^}]*silindi\s*:\s*null/.test(b.blok))
      .filter((b) => !IZIN.some((i) => i.yer === b.yer))
      .map((b) => `${b.yer} :: ${b.blok.slice(0, 120)}`);
    expect(kusur, 'SİLİNMİŞ MADDE SAYILIYOR — sayı listeden ayrışır:\n'
      + `${kusur.join('\n')}\n`
      + 'Çözüm: `_count: { select: { maddeler: { where: { silindi: null } } } }`')
      .toEqual([]);
  });

  it('İZİN LİSTESİ ÖLÜ SATIR taşımaz — yalnız küçülür [SIS-SIL-001]', () => {
    const olu = IZIN.filter((i) => !bulunan.some((b) => b.yer === i.yer)).map((i) => i.yer);
    expect(olu, `kodda olmayan izin satırı: ${olu.join(', ')}`).toEqual([]);
  });

  it('KALIBIN KENDİ YÜRÜYÜŞÜ [SIS-SIL-001]', () => {
    const suzgecli = '_count: { select: { maddeler: { where: { silindi: null } } } }';
    const suzgecsiz = '_count: { select: { maddeler: true } }';
    /* DENGELİ okuma üç katmanı da alır — sabit derinlikli bir kalıp
       burayı kaçırıyordu ve bekçi hiçbir şey bulamıyordu. */
    expect(sayimBloklari(suzgecli)[0]).toBe(suzgecli);
    expect(sayimBloklari(suzgecsiz)[0]).toBe(suzgecsiz);
    expect(/maddeler\s*:\s*\{[^}]*silindi\s*:\s*null/.test(suzgecli)).toBe(true);
    expect(/maddeler\s*:\s*\{[^}]*silindi\s*:\s*null/.test(suzgecsiz),
      'süzgeçsiz sayım geçti — bekçi hiçbir şey ölçmüyor').toBe(false);
  });
});
