import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   İKİ AŞAMALI KAPININ NÖBETÇİSİ — kural değil, KURALIN UYGULANMASI

   `tests/kapsam-kapisi.test.ts` kuralın kendisini sabitler (izinVar +
   KAPSAM_SONRA nasıl davranır). Bu dosya başka bir soruyu sorar:
   **kural gerçekten uygulanmış mı?**

   Kusurun biçimi şudur ve gözle görünmez:

     const k = await yetkiZorunlu('risk', 'yazma');        ← KAPSAMSIZ
     const risk = await db.risk.findUnique(...);
     if (risk.tesisId && !izinVar(k, 'risk', 'yazma', { tesisId: ... }))

   Alttaki satır "kaydın tesisine bakıyorum" der; ama üstteki kapsamsız
   çağrı, `kapsamUyar` gereği TESİSE KISITLI HER ROLÜ daha oraya
   varmadan reddeder. Sonuç: santral yöneticisi KENDİ santralinin
   kaydını açamaz. Ekran "yazabilirsin" der, sunucu "yetkiniz yok".
   2026-09-02'de `risk.ts` ve `istisna.ts` üzerinde ölçüldü.

   Ters yön de kusurdur: ön kapı `KAPSAM_SONRA` ile gevşetilip ikinci
   aşama `kayıt kapsamsızsa denetimi atla` diye yazılırsa, tesise kısıtlı
   rol tesis alanını boş bırakarak kurumsal kayıt açar — bu bir YETKİ
   YÜKSELTMESİDİR. Bu yüzden ikinci aşama `kapsamZorunlu` ile yapılır;
   o yardımcı kapsamsız kaydı `{}` ile sorar ve kısıtlı rolü reddeder.

   ── AÇIK BORÇ ─────────────────────────────────────────────────────────
   Kusur ilk ölçüldüğünde 17 çağrı yerindeydi. Hepsini tek seferde
   düzeltmek, davranış testi olmayan yetki yollarına kör dokunmak olurdu;
   bu yüzden her biri KENDİ testiyle birlikte kapanıyor. `ACIK_BORC`
   kapanmamışların kütüğüdür ve bu test onu iki yönden kilitler:
     · listede olmayan yeni bir kusur eklenemez,
     · listede duran bir satır düzeltilince listeden ÇIKARILMAK zorundadır.
   Yani borç yalnız küçülebilir; sessizce büyüyemez, sessizce unutulamaz.
   ═══════════════════════════════════════════════════════════════════════ */

/** Henüz kapatılmamış çağrı yerleri: `dosya · fonksiyon`. Yalnız küçülür. */
const ACIK_BORC = new Set([
  'konfigYedek.ts · varlikYedekDurumu',
  'konfigYedek.ts · yedegeErisim',
  'olay.ts · olayKapisi',
]);

const DIZIN = path.join(process.cwd(), 'lib', 'eylemler2');

/** Dosyayı fonksiyon gövdelerine ayırır (dışa aktarılan ve yerel yardımcılar). */
function govdeler(metin: string): { ad: string; govde: string }[] {
  const parcalar = metin.split(/\n(?:export )?async function /).slice(1);
  return parcalar.map((p) => ({ ad: p.slice(0, p.indexOf('(')).trim(), govde: p }));
}

/** Ön kapı kapsam argümanı taşıyor mu? (üçüncü argüman) */
function onKapiKapsamli(govde: string): boolean | null {
  // `s` (dotAll) bayrağı derleme hedefinin altında kalıyor; çağrı birden
  // çok satıra yayılabildiği için satır sonlarını boşluğa çeviriyoruz.
  const m = /yetkiZorunlu\(([^;]*?)\)/.exec(govde.replace(/\n/g, ' '));
  if (!m) return null;
  // Argümanları üst düzeyde say: `{ tesisId: x }` tek argümandır.
  let derinlik = 0;
  let sayi = 1;
  for (const ch of m[1]) {
    if (ch === '(' || ch === '{' || ch === '[') derinlik += 1;
    if (ch === ')' || ch === '}' || ch === ']') derinlik -= 1;
    if (ch === ',' && derinlik === 0) sayi += 1;
  }
  return sayi >= 3;
}

/** Gövde, kaydı okuduktan SONRA tesis kapsamı denetliyor mu? */
function ikinciAsamaVar(govde: string): boolean {
  return /izinVar\([^)]*\{\s*tesisId/.test(govde) || /kapsamZorunlu\(/.test(govde);
}

const bulunan = new Set<string>();
for (const ad of readdirSync(DIZIN).filter((f) => f.endsWith('.ts')).sort()) {
  for (const { ad: fn, govde } of govdeler(readFileSync(path.join(DIZIN, ad), 'utf8'))) {
    const kapsamli = onKapiKapsamli(govde);
    if (kapsamli === null) continue;            // yetki kapısı yok: bu testin konusu değil
    if (kapsamli) continue;                     // ön kapı kapsam taşıyor
    if (ikinciAsamaVar(govde)) bulunan.add(`${ad} · ${fn}`);
  }
}

describe('İki aşamalı kapı — uygulanmış mı', () => {
  it('LİSTEDE OLMAYAN yeni bir kapsamsız ön kapı eklenemez', () => {
    const yeni = [...bulunan].filter((y) => !ACIK_BORC.has(y)).sort();
    expect(yeni, [
      'Bu eylem kaydın tesisini denetliyor ama ÖN KAPIYI kapsamsız çağırıyor;',
      'tesise kısıtlı rol daha ilk adımda reddedilir.',
      "Düzeltme: `yetkiZorunlu(modul, islem, KAPSAM_SONRA)` + kayıt okunduktan",
      'sonra `kapsamZorunlu(k, modul, islem, { tesisId }, mesaj)`.',
    ].join('\n')).toEqual([]);
  });

  it('BORÇ KÜTÜĞÜ bayat değildir — düzeltilen satır listeden çıkarılır', () => {
    const bayat = [...ACIK_BORC].filter((b) => !bulunan.has(b)).sort();
    expect(bayat, 'bu çağrı yerleri artık kusurlu değil; ACIK_BORC listesinden silin')
      .toEqual([]);
  });

  it('borç yalnız küçülür — bugünkü sayı kayıt altındadır', () => {
    // Sayı düşerse bu satır da düşer; yükselirse yukarıdaki ilk test patlar.
    expect(ACIK_BORC.size).toBeLessThanOrEqual(3);
  });
});
