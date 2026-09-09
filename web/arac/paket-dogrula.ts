/* PAKET DOĞRULAYICI — yazar aracı (docs/SEKTOR_PAKETI_SOZLESMESI.md §3).

   Kullanım:
     npm run paket:dogrula -- paketler/TR-ENERJI            → hata satırları; temizse çıkış 0
     npm run paket:dogrula -- paketler/TR-ENERJI --ozet-yaz → manifest.icerikOzetleri'ni dosyalardan
                                                              yeniden hesaplayıp YAZAR, sonra doğrular

   Tarayıcısız, saniyeler içinde. Her hata bir satır: dosya:konum — SINIF:
   ne yanlış → nasıl düzeltilir. Kapı DEĞİLDİR (yazar aracıdır); iskelet
   paketlerin doğrulayıcıdan geçtiğini CI `tests/paket-iskeletler.test.ts`
   ile ölçer. */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { hataSatiri, ozetleriHesapla, paketiDogrula } from '../lib/paket/dogrula';

const argv = process.argv.slice(2);
const dizin = argv.find((a) => !a.startsWith('--'));
const ozetYaz = argv.includes('--ozet-yaz');
if (!dizin) {
  console.error('kullanım: npm run paket:dogrula -- <paket dizini> [--ozet-yaz]');
  process.exit(2);
}

if (ozetYaz) {
  const manifestYolu = path.join(dizin, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestYolu, 'utf8')) as Record<string, unknown>;
  manifest.icerikOzetleri = ozetleriHesapla(dizin);
  writeFileSync(manifestYolu, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`özetler yazıldı: ${Object.keys(manifest.icerikOzetleri as object).length} dosya`);
}

const s = paketiDogrula(dizin);
const oz = s.sayilar;
console.log(`${dizin}: sözlük ${oz.sozluk} · tür ${oz.kapsamTurleri} · öznitelik ${oz.oznitelikler} · çerçeve ${oz.cerceveler} · madde ${oz.maddeler} · yükümlülük ${oz.yukumlulukler} · form ${oz.formlar} · rapor ${oz.raporlar} · rol ${oz.roller}`);
if (s.ok) {
  console.log('GEÇERLİ — paket kurulabilir (çerçeveler TASLAK gelir; aktifleştirme insan kararıdır)');
  process.exit(0);
}
console.log(`${s.hatalar.length} hata:`);
for (const h of s.hatalar) console.log('  ' + hataSatiri(h));
process.exit(1);
