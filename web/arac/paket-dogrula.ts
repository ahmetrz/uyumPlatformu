/* PAKET DOĞRULAYICI — yazar aracı (docs/SEKTOR_PAKETI_SOZLESMESI.md §3).

   Kullanım:
     npm run paket:dogrula -- paketler/TR-ENERJI            → hata satırları; temizse çıkış 0
     npm run paket:dogrula -- paketler/TR-ENERJI --ozet-yaz → manifest.icerikOzetleri'ni dosyalardan
                                                              yeniden hesaplayıp YAZAR, sonra doğrular
     npm run paket:dogrula -- paketler/TR-ENERJI --oscal <dizin>
                                                           → geçerli paketin her çerçevesini OSCAL 1.1
                                                              katalog JSON'u olarak <dizin>/<KOD>.oscal.json'a yazar
                                                              (CSV → OSCAL dönüşümü; §3 — paketin içine yazmaz)

   Tarayıcısız, saniyeler içinde. Her hata bir satır: dosya:konum — SINIF:
   ne yanlış → nasıl düzeltilir. Kapı DEĞİLDİR (yazar aracıdır); iskelet
   paketlerin doğrulayıcıdan geçtiğini CI `tests/paket-iskeletler.test.ts`
   ile ölçer. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { hataSatiri, ozetleriHesapla, paketiDogrula } from '../lib/paket/dogrula';
import { oscalYaz } from '../lib/paket/oscal';

const argv = process.argv.slice(2);
const dizin = argv.find((a) => !a.startsWith('--'));
const ozetYaz = argv.includes('--ozet-yaz');
const oscalIndeksi = argv.indexOf('--oscal');
const oscalDizini = oscalIndeksi === -1 ? null : argv[oscalIndeksi + 1];
if (!dizin || (oscalIndeksi !== -1 && !oscalDizini)) {
  console.error('kullanım: npm run paket:dogrula -- <paket dizini> [--ozet-yaz] [--oscal <çıktı dizini>]');
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
console.log(`${dizin}: sözlük ${oz.sozluk} · tür ${oz.kapsamTurleri} · öznitelik ${oz.oznitelikler} · çerçeve ${oz.cerceveler} · madde ${oz.maddeler} · eşleme ${oz.eslemeler} · yükümlülük ${oz.yukumlulukler} · form ${oz.formlar} · rapor ${oz.raporlar} · rol ${oz.roller} · kaynak ${oz.kaynaklar}`);
/* MUAFİYET ADIYLA GÖRÜNÜR. Alan eşleme beyanının tek kaçış kapısı
   `temsili: true`dir (kaynak belgesi yok → beyan istenmez) ve bayrağı
   paketin KENDİ yazarı koyar. Hiçbir yerde okunmuyorsa kaçış kapısı
   sessizdir; okuyanın önüne çıkması gerekir (bağımsız inceleme, P2). */
if (s.icerik) {
  const muaf = s.icerik.cerceveler.filter((c) => c.kimlik.temsili);
  console.log(muaf.length
    ? `  alan eşleme beyanından MUAF (temsilî · kaynak belgesi yok): ${muaf.map((c) => c.kimlik.kod).join(', ')}`
    : '  alan eşleme beyanından muaf çerçeve yok — her çerçeve beyanlı');
}
if (s.ok) {
  console.log('GEÇERLİ — paket kurulabilir (çerçeveler TASLAK gelir; aktifleştirme insan kararıdır)');
  if (oscalDizini && s.icerik) {
    mkdirSync(oscalDizini, { recursive: true });
    for (const c of s.icerik.cerceveler) {
      writeFileSync(path.join(oscalDizini, `${c.kimlik.kod}.oscal.json`), JSON.stringify(oscalYaz(c.kimlik, c.maddeler), null, 2) + '\n');
    }
    console.log(`OSCAL yazıldı: ${s.icerik.cerceveler.length} çerçeve → ${oscalDizini}`);
  }
  process.exit(0);
}
console.log(`${s.hatalar.length} hata:`);
for (const h of s.hatalar) console.log('  ' + hataSatiri(h));
process.exit(1);
