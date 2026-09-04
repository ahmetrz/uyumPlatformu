#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   EYLEM DİLİ VE BOZUK DURUM KAPISI

   ── NİÇİN VAR ─────────────────────────────────────────────────────────
   Bir ekranın en çok okunan cümlesi, çoğu zaman hiçbir şeyin olmadığı
   anda yazdığı cümledir. O anda kullanıcı iki şey sorar:

     1 · Ne oldu?
     2 · Şimdi ne yapabilirim?

   Ürün birinci soruyu iyi cevaplıyor — "değerlendirme kaydı yok",
   "onaylı firmware tabanı tanımlanmamış". İkinciyi çoğu yerde hiç
   cevaplamıyor. Kullanıcı doğru bilgilendirilir ve orada bırakılır.

   Bu araç iki şeyi sayar:

   A · EYLEMSİZ BOZUK DURUM — `BosIlk`, `Olculmedi`, `BaglantiYok`,
       `EntegrasyonYok`, `KismiVeri`, `Bakimda` bileşenlerinden `eylem`
       özelliği verilmeden çizilenler. Bunlar "ne oldu" der, "ne
       yapabilirim" demez.

   B · SİSTEM DİLİ — son kullanıcı yüzeyinde geliştirici sözcüğü:
       provider, adapter, registry, mutation, boolean, foreign key,
       payload, connector … `docs/END_USER_UX_AUDIT.md` bu aileyi bir kez
       taradı; burada NÖBET tutulur ki geri sızmasın.

   ── NE SAYILMAZ ───────────────────────────────────────────────────────
   Tablo hücresindeki "kayıt yok" bir durum ETİKETİDİR, boş durum bloğu
   değildir; oraya cümle koymak hücreyi bozar. Araç yalnız bozuk durum
   BİLEŞENLERİNE bakar, serbest metne değil.

   `BosFiltre` eylemi zorunlu bir parametre olarak alır (`temizle`), bu
   yüzden listede yoktur — tipin kendisi kuralı zaten dayatıyor.

   Kullanım: node arac/eylem-dili.mjs
             node arac/eylem-dili.mjs --json
   ═══════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Eylem taşıması beklenen bozuk durum bileşenleri. */
export const BOZUK_DURUMLAR = [
  'BosIlk', 'Olculmedi', 'BaglantiYok', 'EntegrasyonYok', 'KismiVeri', 'Bakimda',
];

/* Son kullanıcı yüzeyinde geçmemesi gereken geliştirici sözcükleri.
   Kod yorumlarında ve tip adlarında serbesttir; aranan yer JSX metnidir. */
const SISTEM_SOZCUKLERI = [
  'provider', 'adapter', 'registry', 'mutation', 'boolean', 'foreign key',
  'payload', 'endpoint', 'nullable', 'schema', 'upsert', 'idempotent',
];

function* dosyalar(dizin) {
  for (const ad of readdirSync(dizin)) {
    const tam = path.join(dizin, ad);
    if (statSync(tam).isDirectory()) {
      if (ad === 'node_modules' || ad === 'prisma-client') continue;
      yield* dosyalar(tam);
    } else if (ad.endsWith('.tsx')) yield tam;
  }
}

/** `<Ad ... />` ya da `<Ad ...>` açılışının tam metnini döndürür. */
function etiketMetni(metin, baslangic) {
  let derinlik = 0;
  for (let i = baslangic; i < metin.length; i += 1) {
    const c = metin[i];
    if (c === '{') derinlik += 1;
    else if (c === '}') derinlik -= 1;
    else if (c === '>' && derinlik === 0) return metin.slice(baslangic, i + 1);
  }
  return metin.slice(baslangic, baslangic + 400);
}

export function olc() {
  const eylemsiz = [];
  const sistemDili = [];

  for (const f of dosyalar(path.join(KOK, 'app'))) {
    const metin = readFileSync(f, 'utf8');
    const gorece = path.relative(KOK, f);

    for (const ad of BOZUK_DURUMLAR) {
      const kalip = new RegExp(`<${ad}(?=[\\s/>])`, 'g');
      for (const m of metin.matchAll(kalip)) {
        const govde = etiketMetni(metin, m.index);
        if (/\beylem=/.test(govde)) continue;
        const satir = metin.slice(0, m.index).split('\n').length;
        const cumle = govde.match(/(?:cumle|ne)="([^"]{0,70})/)?.[1]
          ?? govde.match(/(?:cumle|ne)=\{['"]([^'"]{0,70})/)?.[1] ?? '';
        eylemsiz.push({ dosya: gorece, satir, bilesen: ad, cumle });
      }
    }

    /* JSX metni: `>metin<` arasında kalan görünür sözcükler. */
    for (const m of metin.matchAll(/>([^<>{}\n]{4,200})</g)) {
      const parca = m[1];
      for (const s of SISTEM_SOZCUKLERI) {
        if (new RegExp(`\\b${s}\\b`, 'i').test(parca)) {
          sistemDili.push({
            dosya: gorece,
            satir: metin.slice(0, m.index).split('\n').length,
            sozcuk: s,
            metin: parca.trim().slice(0, 60),
          });
        }
      }
    }
  }
  return { eylemsiz, sistemDili };
}

const dogrudan = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (dogrudan) {
  const { eylemsiz, sistemDili } = olc();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ eylemsiz, sistemDili }, null, 2));
  } else {
    console.log('\nEYLEMSİZ BOZUK DURUM — "ne oldu" der, "ne yapabilirim" demez:');
    for (const e of eylemsiz) {
      console.log(`  ${e.bilesen.padEnd(16)} ${e.dosya}:${e.satir}  ${e.cumle}`);
    }
    console.log(`\n  toplam: ${eylemsiz.length}`);
    console.log('\nSON KULLANICI YÜZEYİNDE SİSTEM DİLİ:');
    for (const s of sistemDili) console.log(`  ${s.sozcuk.padEnd(12)} ${s.dosya}:${s.satir}  ${s.metin}`);
    console.log(`\n  toplam: ${sistemDili.length}`);
  }
  process.exit(eylemsiz.length + sistemDili.length === 0 ? 0 : 1);
}
