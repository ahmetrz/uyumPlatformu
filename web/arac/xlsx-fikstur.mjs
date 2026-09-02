#!/usr/bin/env node
/* `.xlsx` fikstürü üreticisi — DONMUŞ İKİLİ, GÖRÜNÜR TARİF.

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   İçe aktarım hattının iki okuyucusu da (`lib/entegrasyon/varlikAktarim.ts
   · dosyayiAyristir` ve `lib/eylemler.ts · aktarimYukle`) `.xlsx`
   ayrıştırıyor, ama TESTLERİN HİÇBİRİ bir `.xlsx` ikilisi beslemiyordu:
   `tests/varlik-aktarim.test.ts` yalnız CSV tamponu veriyor. Yani
   ayrıştırıcı kütüphanesi değişirse — sürüm yükseltmesi ya da paket
   değişimi — davranış sessizce kayabilirdi. Kullanıcının yüklediği
   dosyayı okuyan yolda bu kabul edilemez.

   Fikstür DONMUŞ olmalı: testin ürettiği bir tampon, okuyucu ve yazıcı
   aynı kütüphaneden geldiği için ikisi birden yanlış olsa da kendi
   içinde tutarlı görünür. Depoda duran bir ikili ise ne yazarsa onu
   yazar; sonradan gelen HER okuyucu onu doğru çözmek zorundadır.

   Üretici burada durur ki ikili "sihirli" olmasın: içeriği okunabilir,
   yeniden üretilebilir ve gerekçesi yazılıdır.

   ── Fikstürün taşıdığı tuzaklar ───────────────────────────────────────
   Her satır ölçülmüş bir davranışı sınar; hiçbiri süs değildir:
     · boş başlıklı kolon        → `kolon N` adını almalı
     · tekrarlanan başlık        → `ad #2` olmalı, üzerine YAZILMAMALI
     · tarih hücresi             → ISO'ya inmeli (`cellDates`)
     · sayı hücresi              → metne, ondalık kaybolmadan
     · mantıksal hücre           → evet/hayır
     · BOŞ hücre                 → boş metin; ASLA `0` uydurulmamalı
     · baştaki/sondaki boşluk    → kırpılmalı
     · Türkçe karakter           → bozulmamalı (İ ı ğ ş ö ç ü)
     · tümü boş satır            → düşmeli

   Kullanım: node arac/xlsx-fikstur.mjs --yaz
*/

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { WEB } from './kosu-ortak.mjs';

const HEDEF = path.join(WEB, 'tests', 'fixture', 'aktarim-ornek.xlsx');

/* Başlık satırı: beşinci kolon BİLEREK boştur, altıncı BİLEREK tekrardır. */
const BASLIKLAR = ['Asset Tag', 'Site Code', 'Device Type', 'Firmware Version', '', 'Asset Tag'];

/* Satırlar JavaScript tipleriyle verilir; yazıcı hücre tipini buradan
   türetir (tarih hücresi gerçekten tarih hücresi olur, metin değil). */
const SATIRLAR = [
  ['KD3-SCADA-01', 'KIZILDERE3', 'SCADA-SRV', 2.11, new Date(Date.UTC(2026, 2, 14)), true],
  [],                                                    // tümü boş → düşer
  ['  GKC-PLC-04  ', 'GOKCEDAG', 'PLC', null, null, false], // boşluk + BOŞ hücre
  ['ŞŞ-ÖLÇÜM-09', 'ALASEHIR', 'Sıcaklık ölçer', 0, null, null], // Türkçe + sıfır
];

const { utils, write } = await import('xlsx');

const sayfa = utils.aoa_to_sheet([BASLIKLAR, ...SATIRLAR], { cellDates: true });
const kitap = utils.book_new();
utils.book_append_sheet(kitap, sayfa, 'Envanter');

if (!process.argv.includes('--yaz')) {
  console.log('xlsx-fikstur: yazmak için --yaz verin.');
  console.log(`hedef: ${path.relative(WEB, HEDEF)}`);
  process.exit(0);
}

const tampon = write(kitap, { type: 'buffer', bookType: 'xlsx', cellDates: true });
writeFileSync(HEDEF, tampon);
console.log(`xlsx-fikstur: ${path.relative(WEB, HEDEF)} yazıldı · ${tampon.length} bayt`);
