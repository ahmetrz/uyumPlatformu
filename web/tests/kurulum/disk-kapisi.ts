/* VITEST DİSK KAPISI — yanlış-kırmızıyı kod kusurundan ayırır.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Testlerin çoğu SAHTE DEĞİL: her biri `prisma/dev.db`nin geçici bir
   KOPYASINI açar. Yazılabilir alan bitince kopyalama ENOSPC ile düşer ve
   vitest bunu sıradan bir hata gibi raporlar.

   Ölçüldü (7 Eyl 2026, aynı oturumda İKİ kez): 145 ve 109 test dosyası
   kırmızı yandı, kod kaynaklı tek bir kusur yoktu. Yığın izinde ENOSPC
   satırı vardı ama 148 dosyalık çıktının içinde kayboluyordu; ilk bakışta
   büyük bir gerileme gibi görünüyor.

   Bu KUSURU ÖNLEYEN bir kapı değil — yazma yine de bitebilir. Yaptığı
   şey, koşum başlamadan alanı ÖLÇMEK ve düşük olduğunda kırmızının
   sebebini önden söylemektir: yarım saatlik yanlış iz sürmeyi keser.

   ── EŞİK ──────────────────────────────────────────────────────────────
   Ölçülen: `prisma/dev.db` ~4 MB ve testler paralel koşuyor; en yoğun
   anda onlarca eşzamanlı kopya oluyor, üstüne v8 kapsam raporu ve tsx
   önbelleği. 512 MB, ölçülen tepenin birkaç katı.

   Alan ölçülemezse koşum ENGELLENMEZ: bilinmeyen sıfır değildir, ama
   bilinmeyen yüzünden çalışan bir kapıyı durdurmak da ölçmemekten
   kötüdür. Uyarı satırı yine de basılır.

   ── KOŞUM KENDİ ÇÖPÜNÜ TOPLAR (7 Eyl 2026'da eklendi) ─────────────────
   Bu dosya bir zamanlar temizliği ELLE öneriyordu ("rm -rf /tmp/uyum-*")
   ve elle önerilen temizlik, koşulmayan kapıyla aynı kaderi paylaştı:
   ÖLÇÜLDÜ — 8 188 artık dizin, 27 GB. Disk dolunca ortaya çıkan şey
   ENOSPC bile olmadı; vitest keşfi SESSİZCE sıfır vaka döndürdü ve
   `sayimlar:denetle` "taze · 0 vaka · gerçek keşifle doğrulandı" yazdı.
   Yani dolu disk, bir kapıyı yalancı yeşile çevirdi.

   ── ÖLÇÜT SAHİPLİKTİR, "GÖRÜNTÜDE YOKLUK" DEĞİL ───────────────────────
   İlk düzeltme, koşum başındaki dizin listesini anlık görüntü alıp sonunda
   FARKI siliyordu. Kusur (Codex incelemesi · #30, P2): iki koşum aynı
   makinede çakışırsa, A'nın görüntüsünden SONRA açılan B'nin dizinleri
   A'ya "yeni" görünür ve A'nın kapanışı B'nin CANLI veritabanını siler.
   Yorum paralel koşumu korumayı amaçlıyordu, kod tam tersini yapıyordu.

   Ölçüt artık gerçek sahiplik: koşum KENDİ KÖKÜNÜ açar
   (`uyum-kosum-XXXX/`) ve `TMPDIR`i ona çevirir. `os.tmpdir()` POSIX'te
   `TMPDIR`i okur ve vitest işçileri ortamı kalıtır; böylece bu koşumun
   açtığı her `uyum-*` dizini KÖKÜN İÇİNDE doğar. Kapanış tek bir şey
   siler: kendi kökünü. Başka bir koşumun kökü ayrı bir dizindir ve
   görülmez bile — test dosyalarının hiçbirine dokunmak gerekmedi.

   Kökün DIŞINDA kalan eski artıklar (bu düzeltmeden önceki koşumlardan)
   silinmez: sahibi bilinmeyen dosyayı silmek, tam da kapatılan kusurun
   kendisidir. Sayıları raporlanır. */
import { mkdtempSync, readdirSync, rmSync, statfsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ASGARI_MB = 512;

/** `os.tmpdir()` altındaki `uyum-*` dizinleri — testlerin DB kopyaları. */
function geciciDizinler(): string[] {
  try {
    return readdirSync(os.tmpdir(), { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith('uyum-'))
      .map((e) => path.join(os.tmpdir(), e.name));
  } catch {
    return [];
  }
}


export default function kurulum() {
  /* Vitest, globalSetup'ın DÖNDÜRDÜĞÜ işlevi
     teardown olarak çağırır; ayrı bir `teardown` dışa aktarımı, dosyada
     `export default` varken ÇALIŞMIYOR (ölçüldü: 512 dizinle başlayan
     koşum 678 dizinle bitti, tek biri silinmedi). Kapanış artık bu
     kapanışın (closure) kendisi. */
  /* KOŞUMUN KENDİ KÖKÜ. `TMPDIR` bundan sonra buraya bakar; işçilerde
     `os.tmpdir()` bu dizini döner ve testlerin `mkdtempSync` çağrıları
     kökün içine düşer. Sahiplik böyle kurulur — silme kararı bir liste
     karşılaştırmasına değil, "bu dizini BEN açtım" olgusuna dayanır. */
  const kosumKoku = mkdtempSync(path.join(os.tmpdir(), 'uyum-kosum-'));
  process.env.TMPDIR = kosumKoku;
  const oksuzler = geciciDizinler().length;
  if (oksuzler > 0) {
    console.warn(`disk-kapisi: kök dışında ${oksuzler} eski geçici dizin var; `
      + 'sahibi bilinmediği için DOKUNULMUYOR (elle: rm -rf "$TMPDIR"/uyum-*).');
  }
  const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  let bos: number | null = null;
  try {
    const s = statfsSync(kok);
    bos = Math.floor((s.bavail * s.bsize) / (1024 * 1024));
  } catch {
    console.warn('disk-kapisi: boş alan ÖLÇÜLEMEDİ — koşum yine de başlıyor.');
    return;
  }
  if (bos < ASGARI_MB) {
    console.error(`\n╔══ DİSK YETERSİZ ─ ${bos} MB boş, en az ${ASGARI_MB} MB gerekli.`);
    console.error('║  Her test `prisma/dev.db`nin geçici bir KOPYASINI açar; alan');
    console.error('║  bitince kopyalama ENOSPC ile düşer ve ONLARCA dosya kırmızı');
    console.error('║  yanar. Bu KOD KUSURU DEĞİLDİR — aynı ağaç temizlikten sonra');
    console.error('║  yeşil koşar (ölçüldü: 145 ve 109 dosya, iki kez).');
    console.error('║  Temizlik: rm -rf .next out ; npm cache clean --force');
    console.error('║  (geçici DB kopyaları koşum sonunda KENDİLİĞİNDEN silinir)');
    console.error('╚══════════════════════════════════════════════════════════════\n');
  }
  return () => temizle(kosumKoku);
}

/** Koşum bitince BU KOŞUMUN açtığı geçici dizinleri siler.

    Silme başarısız olursa koşum kırmızıya dönmez: temizlik bir ölçü
    değil, bir bakım işidir ve testlerin sonucunu değiştirmemelidir.
    Ama SESSİZ de kalmaz — kaç dizinin kaldığı yazılır. */
function temizle(kosumKoku: string) {
  /* TEK BİR ŞEY silinir: bu koşumun kendi kökü. İçindekiler bu koşumun
     testlerinin açtıklarıdır; dışarısı başkasınındır ve öyle kalır. */
  try {
    rmSync(kosumKoku, { recursive: true, force: true });
  } catch (e) {
    console.warn(`disk-kapisi: koşum kökü silinemedi (${kosumKoku}): ${(e as Error).message}`);
  }
}
