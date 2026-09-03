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

   ── AÇIK BORÇ: KAPANDI ────────────────────────────────────────────────
   Kusur ilk ölçüldüğünde 17 çağrı yerindeydi (2026-09-02). Hepsini tek
   seferde düzeltmek, davranış testi olmayan yetki yollarına kör dokunmak
   olurdu; bu yüzden her biri KENDİ davranış testiyle birlikte kapandı —
   risk · istisna · envanter · keşif · denetim · görev · operasyon ·
   tedarikçi oturumu · olay · konfigürasyon yedeği.

   `ACIK_BORC` bugün BOŞTUR ve bu test iki yönden kilitli kalır:
     · listede olmayan yeni bir kusur eklenemez,
     · listeye bir satır konur da düzeltilirse çıkarılmak ZORUNDADIR.
   Yani liste yalnız küçülebilir. Boş olması, kuralın artık kendiliğinden
   uygulandığı anlamına GELMEZ: kapı yeni bir eylemde yine unutulabilir,
   ilk test o gün adıyla söyleyerek düşer.
   ═══════════════════════════════════════════════════════════════════════ */

/** Kapatılmamış çağrı yerleri: `dosya · fonksiyon`. **BUGÜN BOŞ.**
    Boş kalması bir başarı değil, bir SÖZDÜR: yeni bir kapsamsız ön kapı
    eklenirse aşağıdaki ilk test onu adıyla söyleyerek düşer. */
const ACIK_BORC = new Set<string>([]);

/* Sunucu eylemi taşıyan HER yer taranır. Yalnız `eylemler2` bakmak,
   `eylemler.ts` ve `girisEylemleri.ts` içindeki çağrı yerlerini kapının
   dışında bırakıyordu. */
const KOK = path.join(process.cwd(), 'lib');
const KAYNAKLAR: string[] = [
  ...readdirSync(path.join(KOK, 'eylemler2'))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => path.join('eylemler2', f)),
  'eylemler.ts',
  'girisEylemleri.ts',
].sort();

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

/** Gövdenin KENDİSİ kapsam denetliyor mu? */
function kapsamDenetler(govde: string): boolean {
  return /izinVar\([^)]*\{\s*tesisId/.test(govde) || /kapsamZorunlu\(/.test(govde);
}

/** Dosyadaki YARDIMCILARDAN hangileri kapsam denetliyor?
    `dokuman.ts` denetimini `kapsamYetkisi`e devrediyor; bunu görmeyen bir
    nöbetçi çalışan kodu kusurlu ilan eder (ölçüldü — yanlış alarm). */
function denetleyenYardimcilar(metin: string): string[] {
  const adlar: string[] = [];
  for (const m of metin.matchAll(/\n(?:export )?(?:async )?function (\w+)\(/g)) {
    const bas = m.index ?? 0;
    const sonrakiler = [...metin.slice(bas + 1).matchAll(/\n(?:export )?(?:async )?function /g)];
    const son = sonrakiler.length ? bas + 1 + (sonrakiler[0].index ?? 0) : metin.length;
    if (kapsamDenetler(metin.slice(bas, son))) adlar.push(m[1]);
  }
  return adlar;
}

/** Gövde, kaydı okuduktan SONRA kapsamı denetliyor mu — kendisi ya da
    denetleyen bir yardımcıyı çağırarak? */
function ikinciAsamaVar(govde: string, yardimcilar: string[]): boolean {
  if (kapsamDenetler(govde)) return true;
  return yardimcilar.some((ad) => new RegExp(`\\b${ad}\\(`).test(govde));
}

/** Ön kapı `KAPSAM_SONRA` ile mi açıldı? */
function kapsamSonraMi(govde: string): boolean {
  return /yetkiZorunlu\([^;]*KAPSAM_SONRA/.test(govde.replace(/\n/g, ' '));
}

const bulunan = new Set<string>();
const acikKapi = new Set<string>();
for (const ad of KAYNAKLAR) {
  const metin = readFileSync(path.join(KOK, ad), 'utf8');
  const yardimcilar = denetleyenYardimcilar(metin);
  for (const { ad: fn, govde } of govdeler(metin)) {
    const kapsamli = onKapiKapsamli(govde);
    if (kapsamli === null) continue;            // yetki kapısı yok: bu testin konusu değil
    const etiket = `${path.basename(ad)} · ${fn}`;
    /* AÇIK KAPI: ön kapı `KAPSAM_SONRA` ile gevşetilmiş ama ikinci aşama
       hiç yazılmamış. `erisim.ts` bunu açıkça uyarır — "bu sabit tek
       başına bir yetki kapısı DEĞİLDİR" — ve tam bu hâl bir yetki
       yükseltmesidir: tesise kısıtlı rol her kayda erişir. Nöbetçi
       yalnız kapsamsız ön kapıyı arasaydı bu hâli hiç göremezdi. */
    if (kapsamSonraMi(govde) && !ikinciAsamaVar(govde, yardimcilar)) acikKapi.add(etiket);
    if (kapsamli) continue;                     // ön kapı kapsam taşıyor
    if (ikinciAsamaVar(govde, yardimcilar)) bulunan.add(etiket);
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

  it('KAPSAM_SONRA verilip ikinci aşama YAZILMAMIŞ eylem yoktur', () => {
    /* Ters kusur: ön kapı gevşetilir, gerçek denetim hiç yazılmaz. Kapı
       ardına kadar açık kalır ve hiçbir hata mesajı çıkmaz — kod
       "yetkilendirilmiş" görünür. */
    expect([...acikKapi].sort(), [
      'Bu eylem ön kapıyı `KAPSAM_SONRA` ile açıyor ama kaydın kapsamını',
      'HİÇ denetlemiyor. `KAPSAM_SONRA` tek başına bir yetki kapısı değildir:',
      'kayıt okunduktan sonra `kapsamZorunlu(...)` çağrılmak ZORUNDADIR.',
    ].join('\n')).toEqual([]);
  });

  it('borç KAPANDI ve kapalı kalır', () => {
    // Bir gün yeniden borç yazmak gerekirse bu satır bilinçli olarak
    // değiştirilir; kazayla büyümesi mümkün değildir.
    expect([...ACIK_BORC]).toEqual([]);
  });
});
