#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   TERS KAPSAMA KAPISI — davranış → senaryo

   ── NEDEN VAR ─────────────────────────────────────────────────────────
   `arac/senaryo-belge.mjs` şu soruyu sorar: "yazdığım her senaryonun bir
   testi var mı?" (senaryo → test). Bu iyi bir soru ama TERSİNİ sormaz:

     "üründe kullanıcının tetikleyebildiği her davranış kütükte YAZILI mı?"

   Kütük elle yazılır. Elle yazılan bir liste, ürün büyürken sessizce
   eksilir: yeni bir sunucu eylemi eklenir, kimse senaryo yazmaz, kütük
   yine "GAP 0" der çünkü OLMAYAN senaryonun testi de yoktur. Bu araç o
   kör noktayı kapatır: envanteri KAYNAK KODDAN çıkarır, kütükle karşı
   karşıya getirir ve eşleşmeyeni sayar.

   ── İKİ ENVANTER, İKİ AYRI İDDİA ──────────────────────────────────────
   Bu aracın verdiği söz iki parçadır ve ikisi farklı şey söyler. Tek bir
   "kapsandı" damgası basmak yanıltıcı olurdu.

   A · SUNUCU DAVRANIŞI — durum değiştiren ya da veri döndüren her giriş
       noktası: rota, sunucu eylemi, API ucu, motor, zamanlanmış iş.
       İDDİA: her biri, senaryo işareti taşıyan en az bir test dosyasında
       geçer (rotalar için: kütükte o rotayı taşıyan en az bir senaryo).
       Bağ MEKANİKTİR — ayrı bir eşleme tablosu tutulmaz; tablo ilk
       yeniden adlandırmada koddan ayrışır ve kimse görmez.

   B · ARAYÜZ DAVRANIŞI — sunucuya gitmeden kullanıcının tetiklediği
       etkileşim: süzgeç, kip/sekme, çekmece, genişleyen satır, form,
       toplu seçim, taşma menüsü.
       İDDİA: bu davranışların yaşadığı rota, kütükte BOZULMUŞ VERİ hâli
       de taşır (`veriHali` ∈ yok · kısmi · bilinmiyor · bayat · çelişen),
       çünkü her süzgeç boş sonuç, her çekmece eksik kayıt üretebilir.
       Yalnız mutlu yol senaryosu taşıyan bir rota bu kapıdan geçemez.

   ── NEDEN "TEST DOSYASINDA GEÇİYOR", "ŞU SATIRDA ÇAĞRILIYOR" DEĞİL ────
   Testler eylemi çoğu kez bir yardımcının içinden çağırır:

       const r = await riskAc();            // içeride riskKaydet çağırır
       it('… [RSK-LST-002]', …)

   `it` gövdesini tarasaydık bu bağ görünmezdi ve araç, gerçekte test
   edilen bir eylemi "kapsanmadı" diye işaretlerdi. Dosya düzeyinde
   tarama, aracın verdiği sözü tam olarak karşılar: "bu eylem, şu
   senaryoları test eden dosyada kullanılıyor."

   ── KOŞU ──────────────────────────────────────────────────────────────
     node arac/ters-kapsam.mjs            → rapor
     node arac/ters-kapsam.mjs --json     → makine okunur çıktı
   Tarayıcı istemez; CI'da koşar. `tests/ters-kapsam.test.ts` nöbetçidir.
   ═══════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SENARYO_KALIBI = /\[([A-Z]{3}-[A-Z0-9]{2,10}-\d{3})\]/g;

/** Bozulmuş veri hâlleri — mutlu yolun dışındaki her şey. */
const BOZUK_HALLER = ['yok', 'kısmi', 'bilinmiyor', 'bayat', 'çelişen', 'yinelenen', 'tek'];

function* dosyalar(dizin, kabul) {
  let girisler;
  try { girisler = readdirSync(dizin); } catch { return; }
  for (const ad of girisler) {
    const tam = path.join(dizin, ad);
    if (statSync(tam).isDirectory()) {
      if (ad === 'node_modules' || ad === 'prisma-client') continue;
      yield* dosyalar(tam, kabul);
    } else if (kabul(ad)) yield tam;
  }
}

const oku = (f) => readFileSync(f, 'utf8');

/* ── KÜTÜK ──────────────────────────────────────────────────────────── */

/** Senaryo kütüğünü TS kaynağından okur — derlemeye gerek yok. */
function kutuguOku() {
  const senaryolar = [];
  for (const f of dosyalar(path.join(KOK, 'lib/senaryo'), (a) => a.endsWith('.ts'))) {
    const metin = oku(f);
    /* Her senaryo bir nesne değişmezi; `id:` satırından başlayıp
       `katmanlar:` satırında biter. Alan alan ayrıştırmak yerine bloğu
       alıp içinden gerekli üç alanı çekiyoruz. */
    for (const blok of metin.matchAll(
      /\{\s*\n?\s*id:\s*'([A-Z]{3}-[A-Z0-9]{2,10}-\d{3})'[\s\S]*?katmanlar:\s*\[([^\]]*)\]/g,
    )) {
      const govde = blok[0];
      const cek = (alan) => {
        const m = govde.match(new RegExp(`${alan}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
        return m ? m[1].replace(/\\'/g, "'") : '';
      };
      senaryolar.push({
        id: blok[1],
        rota: cek('rota'),
        eksen: cek('eksen'),
        veriHali: cek('veriHali'),
        alan: cek('alan'),
      });
    }
  }
  return senaryolar;
}

/** Test dosyası → içindeki senaryo kimlikleri + tam metin. */
function testleriOku() {
  const testler = [];
  for (const f of dosyalar(path.join(KOK, 'tests'), (a) => a.endsWith('.test.ts') || a.endsWith('.test.tsx'))) {
    const metin = oku(f);
    const kimlikler = [...metin.matchAll(SENARYO_KALIBI)].map((m) => m[1]);
    if (kimlikler.length === 0) continue;
    testler.push({ ad: path.basename(f), metin, kimlikler: [...new Set(kimlikler)] });
  }
  return testler;
}

/* ── ENVANTER A · SUNUCU DAVRANIŞI ──────────────────────────────────── */

/** `app/**\/page.tsx` → ürün rotası. Grup dizinleri `(ad)` yola girmez. */
function rotalariCikar() {
  const rotalar = [];
  for (const f of dosyalar(path.join(KOK, 'app'), (a) => a === 'page.tsx')) {
    const gorece = path.relative(path.join(KOK, 'app'), path.dirname(f));
    const yol = '/' + gorece.split(path.sep).filter((p) => !p.startsWith('(')).join('/');
    const temiz = yol === '/' ? '/' : yol.replace(/\/$/, '');
    rotalar.push({ tur: 'rota', kimlik: temiz, kaynak: path.relative(KOK, f) });
  }
  return rotalar.sort((a, b) => a.kimlik.localeCompare(b.kimlik, 'tr'));
}

/** `'use server'` başlıklı her modülün dışa açtığı fonksiyonlar. */
function eylemleriCikar() {
  const eylemler = [];
  for (const f of dosyalar(path.join(KOK, 'lib/eylemler2'), (a) => a.endsWith('.ts'))) {
    if (f.endsWith('.demo.ts')) continue;
    const metin = oku(f);
    if (!metin.startsWith("'use server'")) continue;
    const modul = path.basename(f, '.ts');
    for (const m of metin.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm)) {
      eylemler.push({ tur: 'sunucu eylemi', kimlik: `${modul}.${m[1]}`, ad: m[1], kaynak: path.relative(KOK, f) });
    }
  }
  return eylemler;
}

/** Motor giriş noktaları — kullanıcı ya da zamanlayıcı tetikler. */
function motorlariCikar() {
  const motorlar = [];
  for (const f of dosyalar(path.join(KOK, 'lib/motorlar'), (a) => a.endsWith('.ts'))) {
    const metin = oku(f);
    const modul = path.basename(f, '.ts');
    for (const m of metin.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm)) {
      motorlar.push({ tur: 'motor', kimlik: `${modul}.${m[1]}`, ad: m[1], kaynak: path.relative(KOK, f) });
    }
  }
  return motorlar;
}

/** Kuyruk ve zamanlayıcı giriş noktaları. */
function isleriCikar() {
  const isler = [];
  for (const f of dosyalar(path.join(KOK, 'lib/is'), (a) => a.endsWith('.ts'))) {
    const metin = oku(f);
    const modul = path.basename(f, '.ts');
    for (const m of metin.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm)) {
      isler.push({ tur: 'zamanlanmış iş', kimlik: `${modul}.${m[1]}`, ad: m[1], kaynak: path.relative(KOK, f) });
    }
  }
  return isler;
}

/** `app/api/**\/route.api.ts` → METOT + yol. */
function uclariCikar() {
  const uclar = [];
  for (const f of dosyalar(path.join(KOK, 'app/api'), (a) => a.endsWith('.api.ts'))) {
    const metin = oku(f);
    const yol = '/' + path.relative(path.join(KOK, 'app'), path.dirname(f)).split(path.sep).join('/');
    for (const m of metin.matchAll(/export\s*\{\s*([A-Z,\s]+?)\s*\}/g)) {
      for (const metot of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        uclar.push({ tur: 'API ucu', kimlik: `${metot} ${yol}`, ad: yol, kaynak: path.relative(KOK, f) });
      }
    }
  }
  return uclar.sort((a, b) => a.kimlik.localeCompare(b.kimlik));
}

/* ── ENVANTER B · ARAYÜZ DAVRANIŞI ──────────────────────────────────── */

/* Paylaşılan primitiflerin adı, arayüz davranışının kimliğidir. Bir
   ekran `<Filtreler>` kullanıyorsa orada süzgeç vardır; `sec=` veren bir
   `<VeriTablosu>` satır seçimiyle çekmece açar. Serbest metin aramak
   yerine primitif adını aramak, ürün grameriyle aynı dili konuşur. */
const ARAYUZ_IZLERI = [
  { tur: 'süzgeç', kalip: /<Filtreler\b/ },
  { tur: 'kip değiştirici', kalip: /<KipDegistir\b/ },
  { tur: 'çekmece', kalip: /<Cekmece\b|\bsec=\{/ },
  { tur: 'genişleyen satır', kalip: /<GenisleyenSatir\b/ },
  { tur: 'form', kalip: /<form\b/ },
  { tur: 'aşama hattı', kalip: /<TezgahHatti\b|<Asamalar\b/ },
  { tur: 'kapanış şeridi', kalip: /<KapanisBandi\b/ },
];

/* Rotanın KENDİ dizinindeki tsx dosyaları taranır — alt dizinlere
   İNİLMEZ. İlk sürüm özyinelemeli tarıyordu ve `/tesisler` (tek satırlık
   bir yönlendirme) alt rotası `[id]` yüzünden "formu var" görünüyordu;
   `/sistem` de `bilesenler` alt rotasının bütün etkileşimlerini
   üstleniyordu. Next.js bir rotanın bileşenlerini `page.tsx` ile aynı
   dizinde tutar; kapsam da orada biter. */
function arayuzDavranislariCikar(rotalar) {
  const bulunan = [];
  for (const r of rotalar) {
    const dizin = path.join(KOK, path.dirname(r.kaynak));
    let metin = '';
    for (const ad of readdirSync(dizin)) {
      const tam = path.join(dizin, ad);
      if (!statSync(tam).isFile() || !ad.endsWith('.tsx')) continue;
      metin += oku(tam);
    }
    for (const iz of ARAYUZ_IZLERI) {
      if (iz.kalip.test(metin)) {
        bulunan.push({ tur: `arayüz · ${iz.tur}`, kimlik: `${r.kimlik} · ${iz.tur}`, rota: r.kimlik });
      }
    }
  }
  return bulunan;
}

/* ── EŞLEME ─────────────────────────────────────────────────────────── */

/** Rota kimliğini kütükteki yazımla eşler ( '' ve '/' aynı ekrandır ). */
const rotaEs = (a, b) => a === b || (a === '/' && b === '') || (a === '' && b === '/');

export function esle() {
  const senaryolar = kutuguOku();
  const testler = testleriOku();

  const rotalar = rotalariCikar();
  const sunucu = [
    ...rotalar,
    ...eylemleriCikar(),
    ...motorlariCikar(),
    ...isleriCikar(),
    ...uclariCikar(),
  ];
  const arayuz = arayuzDavranislariCikar(rotalar);

  const sonuc = [];

  for (const d of sunucu) {
    if (d.tur === 'rota') {
      const es = senaryolar.filter((s) => rotaEs(s.rota, d.kimlik));
      sonuc.push({ ...d, senaryolar: es.map((s) => s.id), kanit: 'kütükte rota' });
      continue;
    }
    if (d.tur === 'API ucu') {
      const yol = d.ad.replace(/^\//, '');
      const es = testler.filter((t) => t.metin.includes(yol));
      sonuc.push({
        ...d,
        senaryolar: [...new Set(es.flatMap((t) => t.kimlikler))],
        kanit: es.length ? `test: ${es.map((t) => t.ad).join(', ')}` : '',
      });
      continue;
    }
    /* Eylem · motor · iş: fonksiyon adı, senaryo işaretli bir test
       dosyasında kimlik olarak geçiyor mu? */
    const kalip = new RegExp(`\\b${d.ad}\\b`);
    const es = testler.filter((t) => kalip.test(t.metin));
    sonuc.push({
      ...d,
      senaryolar: [...new Set(es.flatMap((t) => t.kimlikler))],
      kanit: es.length ? `test: ${es.map((t) => t.ad).join(', ')}` : '',
    });
  }

  for (const d of arayuz) {
    const rotaSenaryolari = senaryolar.filter((s) => rotaEs(s.rota, d.rota));
    const bozuk = rotaSenaryolari.filter((s) => BOZUK_HALLER.includes(s.veriHali));
    sonuc.push({
      ...d,
      senaryolar: bozuk.map((s) => s.id),
      kanit: bozuk.length ? `bozuk veri hâli: ${[...new Set(bozuk.map((s) => s.veriHali))].join(' · ')}` : '',
    });
  }

  return { sonuc, senaryolar, testler };
}

/* ── RAPOR ──────────────────────────────────────────────────────────── */

function main() {
  const jsonIste = process.argv.includes('--json');
  const { sonuc, senaryolar } = esle();
  const bosta = sonuc.filter((d) => d.senaryolar.length === 0);

  const turler = [...new Set(sonuc.map((d) => d.tur))].sort((a, b) => a.localeCompare(b, 'tr'));

  if (jsonIste) {
    const cikti = {
      toplam: sonuc.length,
      eslenen: sonuc.length - bosta.length,
      bosta: bosta.map((d) => ({ tur: d.tur, kimlik: d.kimlik })),
      senaryoSayisi: senaryolar.length,
    };
    writeFileSync(path.join(KOK, 'arac/ters-kapsam.json'), JSON.stringify(cikti, null, 2) + '\n');
    console.log(JSON.stringify(cikti, null, 2));
    return bosta.length === 0 ? 0 : 1;
  }

  console.log('');
  console.log('TÜR'.padEnd(26) + 'TOPLAM'.padStart(8) + 'EŞLENEN'.padStart(9) + 'BOŞTA'.padStart(7));
  for (const t of turler) {
    const grup = sonuc.filter((d) => d.tur === t);
    const bos = grup.filter((d) => d.senaryolar.length === 0).length;
    console.log(t.padEnd(26) + String(grup.length).padStart(8) + String(grup.length - bos).padStart(9) + String(bos).padStart(7));
  }
  console.log(''.padEnd(50, '─'));
  console.log('TOPLAM'.padEnd(26) + String(sonuc.length).padStart(8)
    + String(sonuc.length - bosta.length).padStart(9) + String(bosta.length).padStart(7));

  if (bosta.length) {
    console.log('\nSENARYOSU OLMAYAN DAVRANIŞ:');
    for (const d of bosta) console.log(`  ${d.tur.padEnd(24)} ${d.kimlik}`);
  }

  console.log(`\nkütük: ${senaryolar.length} senaryo · envanter: ${sonuc.length} davranış`
    + ` · SENARYOSUZ DAVRANIŞ: ${bosta.length}`);
  return bosta.length === 0 ? 0 : 1;
}

/* Nöbetçi test bu dosyayı içeri alır; `main` yalnız doğrudan koşuda
   çalışmalı, yoksa test süreci `process.exit` ile ölürdü. */
const dogrudan = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (dogrudan) process.exit(main());
