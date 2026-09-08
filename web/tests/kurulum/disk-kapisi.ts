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

   Artık koşum başlamadan hangi geçici dizinlerin VAR OLDUĞU kaydedilir
   ve koşum bitince YALNIZ YENİLER silinir. Var olanlara dokunulmaz:
   aynı makinede paralel koşan başka bir vitest'in dizinlerini silmek,
   onun testlerini yarıda keserdi. */
import { readdirSync, rmSync, statfsSync } from 'node:fs';
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
  /* Koşumdan ÖNCE var olanlar. Vitest, globalSetup'ın DÖNDÜRDÜĞÜ işlevi
     teardown olarak çağırır; ayrı bir `teardown` dışa aktarımı, dosyada
     `export default` varken ÇALIŞMIYOR (ölçüldü: 512 dizinle başlayan
     koşum 678 dizinle bitti, tek biri silinmedi). Kapanış artık bu
     kapanışın (closure) kendisi. */
  const kosumdanOnce = new Set(geciciDizinler());
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
  return () => temizle(kosumdanOnce);
}

/** Koşum bitince BU KOŞUMUN açtığı geçici dizinleri siler.

    Silme başarısız olursa koşum kırmızıya dönmez: temizlik bir ölçü
    değil, bir bakım işidir ve testlerin sonucunu değiştirmemelidir.
    Ama SESSİZ de kalmaz — kaç dizinin kaldığı yazılır. */
function temizle(kosumdanOnce: Set<string>) {
  const kalanlar = geciciDizinler().filter((d) => !kosumdanOnce.has(d));
  let silinen = 0;
  const basarisiz: string[] = [];
  for (const d of kalanlar) {
    try { rmSync(d, { recursive: true, force: true }); silinen += 1; } catch { basarisiz.push(d); }
  }
  if (basarisiz.length) {
    console.warn(`disk-kapisi: ${silinen} geçici dizin silindi, ${basarisiz.length} silinemedi.`);
  }
}
