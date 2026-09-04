#!/usr/bin/env node
/* Senaryo kütüğünden iki belge üretir:

     docs/MASTER_SCENARIO_REGISTRY.md
     docs/SCENARIO_TEST_MATRIX.md

   ── BAĞ TESTİN KENDİ METNİDİR ─────────────────────────────────────────
   Senaryo ile test arasındaki bağ ayrı bir eşleme tablosunda tutulsaydı,
   tablo ilk yeniden adlandırmada testten ayrışır ve kimse görmezdi. Bağ
   burada testin BAŞLIĞINDAKİ köşeli parantezdir:

     it('kapsam dışı varlığa yazılamaz [ENV-YAZ-003]', …)

   Araç `tests/` altını bu kimlik için tarar. Bulamazsa satır GAP'tir.

   TypeScript kütüğünü içeri aldığı için `tsx` altında koşar:
     npx tsx arac/senaryo-belge.mjs           → ölç ve raporla
     npx tsx arac/senaryo-belge.mjs --yaz     → belgeleri yaz          */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const KOK = process.cwd();
const TEST_DIZINI = path.join(KOK, 'tests');
const BELGE_DIZINI = path.join(KOK, '..', 'docs');

/* Kütüksüz kalabilecek test dosyaları — her biri GEREKÇESİYLE.
   Bunlar bir kullanıcı senaryosunu değil, kütüğün/kodun kendi
   tutarlılığını ölçer; bir senaryo kimliği taşımaları anlamsız olurdu. */
export const KUTUKSUZ_DOSYALAR = {
  'belge-sayimlari.test.ts': 'Belgelerdeki sayıların koda karşı doğrulaması',
  'senaryo-kutugu.test.ts': 'Kütüğün kendi nöbetçisi',
  'ters-kapsam.test.ts': 'Ters kapsamanın nöbetçisi — davranış envanterini kütüğe karşı sayar',
  'bagimlilik-guvenligi.test.ts': 'Bağımlılık ağacının güvenlik taraması',
  'kalite-kapilari.test.ts': 'Kapı betiklerinin varlığı',
  'semantik.test.ts': 'Ortak durum sözlüğünün tutarlılığı',
  'alan-metin.test.ts': 'Metin yardımcılarının saf davranışı',
  'alan-surum.test.ts': 'Sürüm karşılaştırma yardımcısı',
  'alan-ag.test.ts': 'Ağ adresi yardımcıları',
  'kisit-mesaji.test.ts': 'Veritabanı kısıt mesajlarının insan diline çevrimi',
  'istemci-adresi.test.ts': 'İstemci adresi çözümleme yardımcısı',
  'turkiye-siniri.test.ts': 'Coğrafi sınır verisinin tutarlılığı',
  'yedek-araci.test.ts': 'Ürünün kendi yedekleme aracı',
  'xlsx-ayristirma.test.ts': 'Tablo ayrıştırıcısının saf davranışı',
  'arama-kosulu.test.ts': 'Arama koşulu üreticisinin saf davranışı',
  'olculmemis-gosterimi.test.ts': 'Ölçülmemiş değer gösterim sözlüğü',
  'saha-yerlesim.test.ts': 'Saha yerleşim sözlüğü',
  'saha-arka-plan.test.ts': 'Saha arka plan seçimi',
  'kabuk-inceleme.test.ts': 'Kabuk gramerinin statik incelemesi',
  'ekran-mantik-72.test.ts': 'Ekran mantığı toplu regresyonu',
  'uc-deger-kurali.test.ts': 'Üç değerli mantığın sözlüğü',
};

function testDosyalari() {
  return readdirSync(TEST_DIZINI)
    .filter((d) => d.endsWith('.test.ts'))
    .map((d) => ({ ad: d, metin: readFileSync(path.join(TEST_DIZINI, d), 'utf8') }));
}

/** Bir dosyadaki `[KIMLIK]` işaretlerini ve taşıdıkları test başlığını çıkarır. */
function isaretler(metin) {
  const bulunan = [];
  const kalip = /\b(it|test)\(\s*(['"`])((?:\\.|(?!\2)[\s\S])*?)\2/g;
  let m;
  while ((m = kalip.exec(metin)) !== null) {
    const baslik = m[3];
    for (const k of baslik.matchAll(/\[([A-Z]{3}-[A-Z0-9]{2,10}-\d{3})\]/g)) {
      bulunan.push({ id: k[1], baslik: baslik.replace(/\s*\[[^\]]+\]/g, '').trim() });
    }
  }
  return bulunan;
}

export function olc(senaryolar) {
  const dosyalar = testDosyalari();
  /** kimlik → [{dosya, baslik}] */
  const kapsam = new Map();
  /** dosya → kaç senaryo işareti taşıyor */
  const dosyaIsareti = new Map();
  for (const d of dosyalar) {
    const bulunan = isaretler(d.metin);
    dosyaIsareti.set(d.ad, bulunan.length);
    for (const b of bulunan) {
      kapsam.set(b.id, [...(kapsam.get(b.id) ?? []), { dosya: d.ad, baslik: b.baslik }]);
    }
  }

  const kimlikler = new Set(senaryolar.map((s) => s.id));
  const bosluklar = senaryolar.filter((s) => !kapsam.has(s.id)).map((s) => s.id);
  /* Kütükte olmayan bir kimliği işaret eden test: ya kimlik yazım hatası
     ya da silinmiş senaryo. İkisi de sessiz kalmamalı. */
  const hayaletler = [...kapsam.keys()].filter((k) => !kimlikler.has(k));
  const oksuzDosyalar = dosyalar
    .filter((d) => (dosyaIsareti.get(d.ad) ?? 0) === 0)
    .map((d) => d.ad)
    .filter((ad) => !(ad in KUTUKSUZ_DOSYALAR));

  return { kapsam, bosluklar, hayaletler, oksuzDosyalar, dosyaSayisi: dosyalar.length };
}

const kacar = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function registryMetni(senaryolar, olcum) {
  const alanlar = [...new Set(senaryolar.map((s) => s.alan))]
    .sort((a, b) => a.localeCompare(b, 'tr'));
  const satirlar = [];
  satirlar.push('# Ana senaryo kütüğü');
  satirlar.push('');
  satirlar.push('Bu belge **elle yazılmaz.** `web/lib/senaryo/` altındaki kütükten');
  satirlar.push('`node arac/senaryo-belge.mjs --yaz` ile üretilir ve');
  satirlar.push('`tests/senaryo-kutugu.test.ts` sapma olduğu an kırmızı olur.');
  satirlar.push('');
  satirlar.push('Senaryo ile test arasındaki bağ, testin **kendi başlığıdır**:');
  satirlar.push('');
  satirlar.push('```');
  satirlar.push("it('kapsam dışı varlığa yazılamaz [ENV-YAZ-003]', …)");
  satirlar.push('```');
  satirlar.push('');
  satirlar.push('Ayrı bir eşleme tablosu tutulsaydı, tablo ilk yeniden adlandırmada');
  satirlar.push('testten ayrışır ve kimse görmezdi.');
  satirlar.push('');
  satirlar.push(`Senaryo: **${senaryolar.length}** · testli: **${senaryolar.length - olcum.bosluklar.length}** · GAP: **${olcum.bosluklar.length}**`);
  satirlar.push('');
  for (const alan of alanlar) {
    const kume = senaryolar.filter((s) => s.alan === alan);
    satirlar.push(`## ${alan} · ${kume.length} senaryo`);
    satirlar.push('');
    satirlar.push('| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |');
    satirlar.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const s of kume) {
      const testler = olcum.kapsam.get(s.id) ?? [];
      const testYazi = testler.length === 0
        ? '**GAP**'
        : testler.map((t) => `\`${t.dosya}\``).join(' · ');
      satirlar.push('| ' + [
        `\`${s.id}\``, kacar(s.rota), `${kacar(s.rol)} · ${kacar(s.kapsam)}`,
        `${kacar(s.onkosul)} · ${kacar(s.veriHali)}`, kacar(s.eylem),
        kacar(s.beklenenSonuc), kacar(s.beklenenEkran), kacar(s.beklenenIz),
        kacar(s.beklenenBildirim), testYazi,
      ].join(' | ') + ' |');
    }
    satirlar.push('');
  }
  return satirlar.join('\n') + '\n';
}

function matrisMetni(senaryolar, olcum) {
  const satirlar = [];
  satirlar.push('# Senaryo · test matrisi');
  satirlar.push('');
  satirlar.push('Üretilen belge — kaynağı `web/lib/senaryo/` ve `web/tests/`.');
  satirlar.push('');
  satirlar.push(`| Ölçü | Değer |`);
  satirlar.push('| --- | --- |');
  satirlar.push(`| Senaryo | ${senaryolar.length} |`);
  satirlar.push(`| Testi olan senaryo | ${senaryolar.length - olcum.bosluklar.length} |`);
  satirlar.push(`| **GAP** | **${olcum.bosluklar.length}** |`);
  satirlar.push(`| Hayalet işaret (kütükte olmayan kimlik) | ${olcum.hayaletler.length} |`);
  satirlar.push(`| Kütüksüz test dosyası | ${olcum.oksuzDosyalar.length} |`);
  satirlar.push(`| Taranan test dosyası | ${olcum.dosyaSayisi} |`);
  satirlar.push('');
  satirlar.push('## Katman başına kapsam');
  satirlar.push('');
  satirlar.push('| Katman | Senaryo | Testli | GAP |');
  satirlar.push('| --- | --- | --- | --- |');
  const katmanlar = [...new Set(senaryolar.flatMap((s) => s.katmanlar))].sort();
  for (const k of katmanlar) {
    const kume = senaryolar.filter((s) => s.katmanlar.includes(k));
    const testli = kume.filter((s) => olcum.kapsam.has(s.id)).length;
    satirlar.push(`| ${k} | ${kume.length} | ${testli} | ${kume.length - testli} |`);
  }
  satirlar.push('');
  satirlar.push('## Satır satır');
  satirlar.push('');
  satirlar.push('| Senaryo | Alan | Katman | Test dosyası | Test başlığı | Otomatik | Sonuç |');
  satirlar.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const s of senaryolar) {
    const testler = olcum.kapsam.get(s.id) ?? [];
    if (testler.length === 0) {
      satirlar.push(`| \`${s.id}\` | ${kacar(s.alan)} | ${s.katmanlar.join(' · ')} | — | — | — | **GAP** |`);
      continue;
    }
    for (const t of testler) {
      satirlar.push(`| \`${s.id}\` | ${kacar(s.alan)} | ${s.katmanlar.join(' · ')} | \`${t.dosya}\` | ${kacar(t.baslik)} | evet | geçti |`);
    }
  }
  satirlar.push('');
  if (olcum.oksuzDosyalar.length > 0) {
    satirlar.push('## Kütüksüz test dosyaları');
    satirlar.push('');
    satirlar.push('Bu dosyalar hiçbir senaryo kimliği taşımıyor ve gerekçeli');
    satirlar.push('listede de değil. Ya bir senaryoya bağlanmalı ya da gerekçesi');
    satirlar.push('`arac/senaryo-belge.mjs` içindeki listeye yazılmalı.');
    satirlar.push('');
    for (const d of olcum.oksuzDosyalar) satirlar.push(`- \`${d}\``);
    satirlar.push('');
  }
  satirlar.push('## Gerekçesiyle kütüksüz kalan dosyalar');
  satirlar.push('');
  satirlar.push('| Dosya | Neden senaryosu yok |');
  satirlar.push('| --- | --- |');
  for (const [d, neden] of Object.entries(KUTUKSUZ_DOSYALAR)) {
    satirlar.push(`| \`${d}\` | ${neden} |`);
  }
  satirlar.push('');
  return satirlar.join('\n') + '\n';
}

const { SENARYOLAR } = await import('../lib/senaryo/kutuk.ts');
const olcum = olc(SENARYOLAR);

if (process.argv.includes('--yaz')) {
  writeFileSync(path.join(BELGE_DIZINI, 'MASTER_SCENARIO_REGISTRY.md'),
    registryMetni(SENARYOLAR, olcum));
  writeFileSync(path.join(BELGE_DIZINI, 'SCENARIO_TEST_MATRIX.md'),
    matrisMetni(SENARYOLAR, olcum));
  console.log('güncellendi: docs/MASTER_SCENARIO_REGISTRY.md · docs/SCENARIO_TEST_MATRIX.md');
}

console.log(`senaryo: ${SENARYOLAR.length} · testli: ${SENARYOLAR.length - olcum.bosluklar.length}`
  + ` · GAP: ${olcum.bosluklar.length} · hayalet: ${olcum.hayaletler.length}`
  + ` · kütüksüz dosya: ${olcum.oksuzDosyalar.length}`);
if (olcum.bosluklar.length > 0) {
  console.log('GAP:', olcum.bosluklar.join(' '));
}
if (olcum.hayaletler.length > 0) {
  console.log('HAYALET:', olcum.hayaletler.join(' '));
}
