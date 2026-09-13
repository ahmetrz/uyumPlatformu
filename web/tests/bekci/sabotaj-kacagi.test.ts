import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

/* ═══════════════════════════════════════════════════════════════════════
   SABOTAJ DEPOYA GİREMEZ · BEKÇİ [SIS-SAB-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Ölçüldü (bağımsız inceleme, PR #51 tur 2): bir sabotaj turunda
   kaldırılan iddia GERİ KONMADI ve depoya girdi. `politika-s2-eylem`
   içindeki POL-005 vakasında ikinci tanığın yerinde tek başına bir
   "sabotaj" yorumu duruyordu; yorum bir ölçümü ANLATIYOR, kod onu
   YAPMIYORDU.

   Kusur sessizdi ve sessiz kalmasının sebebi yapısaldı: kalan iddialar
   geçtiği için CI yeşildi, kapı sayısı değişmedi, test envanteri aynı
   dosyayı aynı vaka sayısıyla gördü. Sabotajı geri alan adım BAŞARISIZ
   OLAMIYORDU — "temizlik adımı SON KOŞULUNU doğrular" kuralının sabotaj
   turundaki karşılığı yoktu. Bugün var.

   ── NE ÖLÇÜLÜR ────────────────────────────────────────────────────────
   Sabotaj turunda kullanılan İŞARET, izlenen hiçbir kaynak dosyada
   kalmamalı. Aranan şey bir SÖZCÜK değil, o sözcüğün bir ifadenin
   YERİNE geçmiş olduğu hâldir: "sabotaj" bu depoda yüzlerce yorumda
   geçer (kural metinleri, gerekçeler, sabotaj yüzeyi notları) ve onları
   yakalayan bir bekçi gürültüye boğulur, sonra da susturulur.

   Kapsam `git ls-files` ile alınır: izlenmeyen dosya bu bekçinin konusu
   değildir — sabotaj ZATEN çalışma ağacında yapılır. Ölçülen şey
   COMMIT EDİLEBİLİR hâldir.
   ═══════════════════════════════════════════════════════════════════════ */

/** Sabotaj işareti: tek başına bir ifade olarak duran "sabotaj" yorumu.
    Blok yorum ve satır yorumu biçimleri, satır başına çapalı. */
export const ISARET = new RegExp(
  `^\\s*(${'\\/\\*'}\\s*sabotaj\\s*${'\\*\\/'}|\\/\\/\\s*sabotaj\\s*)$`, 'i');

function gitCikti(args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (e) {
    /* `git grep` eşleşme bulamazsa çıkış 1 verir — bu bir HATA değil,
       "temiz" cevabıdır ve öyle okunur. Başka bir çıkış kodu gerçek bir
       hatadır ve yutulmaz. */
    const h = e as { status?: number; stdout?: string };
    if (h.status === 1) return h.stdout ?? '';
    throw e;
  }
}

describe('sabotaj işareti depoda KALMAZ [SIS-SAB-001]', () => {
  const dosyalar = gitCikti(['ls-files', '-z'])
    .split('\0').filter((d) => /\.(ts|tsx|mjs|js|css)$/.test(d));

  it('KAPSAM boş değil — kalıp bozulursa bekçi her şeyi geçirirdi [SIS-SAB-001]', () => {
    /* Sıfır dosyayla "işaret yok" demek, hiçbir şeye bakmadan temiz
       raporlamaktır; bu depoda sayı kapısı tam bu şekilde kandırıldı. */
    expect(dosyalar.length, 'git ls-files hiçbir kaynak dosya döndürmedi')
      .toBeGreaterThan(200);
  });

  it('HİÇBİR izlenen kaynak dosyada yalnız başına sabotaj yorumu yok [SIS-SAB-001]', () => {
    const ham = gitCikti(['grep', '-n', '-i', '-E',
      '^[[:space:]]*(/\\*[[:space:]]*sabotaj[[:space:]]*\\*/|//[[:space:]]*sabotaj[[:space:]]*)$',
      '--', '*.ts', '*.tsx', '*.mjs', '*.js', '*.css']);
    const bulunan = ham.split('\n').filter(Boolean);
    expect(bulunan, 'SABOTAJ DEPOYA GİRDİ — geri alınmamış bir sabotaj işareti:\n'
      + `${bulunan.join('\n')}\n`
      + 'Sabotaj turunda kaldırılan iddia GERİ KONMALIDIR; yorum bir ölçümü '
      + 'anlatıp kod onu yapmıyorsa test iddia ettiği şeyi sınamıyordur.')
      .toEqual([]);
  });

  it('KALIBIN KENDİ YÜRÜYÜŞÜ: neyi yakalar, neyi yakalamaz [SIS-SAB-001]', () => {
    /* Yakalar: bir ifadenin YERİNE geçmiş işaret. */
    expect(ISARET.test('    /' + '* sabotaj *' + '/')).toBe(true);
    expect(ISARET.test('  // sabotaj')).toBe(true);
    expect(ISARET.test('/' + '* SABOTAJ *' + '/')).toBe(true);
    /* Yakalamaz: sabotaj SÖZCÜĞÜNÜ anlatan gerçek yorumlar. */
    expect(ISARET.test('   /' + '* Sabotaj yüzeyi: FORCE geri gelirse kırmızı yanar. *' + '/'))
      .toBe(false);
    expect(ISARET.test('     * sabotaj kuralı sabote eder, ölçüm ortamını değil.')).toBe(false);
    expect(ISARET.test("    const ad = 'sabotaj';")).toBe(false);
  });
});
