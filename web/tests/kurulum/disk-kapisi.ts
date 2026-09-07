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
   kötüdür. Uyarı satırı yine de basılır. */
import { statfsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ASGARI_MB = 512;

export default function kurulum() {
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
    console.error('║  Temizlik: rm -rf .next out /tmp/uyum-* ; npm cache clean --force');
    console.error('╚══════════════════════════════════════════════════════════════\n');
  }
}
