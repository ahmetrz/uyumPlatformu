#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   BOŞ DURUM KÜTÜĞÜ · TÜRETİCİ [SIS-BSD-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Kurulum provası (10 Eyl 2026): TR-ENERJI paketi kurulduktan sonra
   `/regulasyonlar` sekiz çerçevenin sekizi için de şunu yazıyordu:

     "EPDK-SGYM-EK3 kataloğu henüz yüklenmedi."   [Katalog içe aktar]

   Veritabanında o anda 3 803 madde TASLAK sürümlerde bekliyordu. Cümle
   tek yan tümceydi, sebebi söylemiyordu ve önerdiği eylem kullanıcıyı
   ZATEN YÜKLÜ kataloğu ikinci kez yazmaya götürüyordu.

   Aynı sınıf `/tesisler`te de duruyor: "BU SÜZGEÇTE TESİS YOK" diyor ama
   tesisin nerede açıldığını (`/yonetim-tezgahi`) söylemiyor.

   ── İKİ ÖLÇÜT ─────────────────────────────────────────────────────────
   Boş durum, sistemin ELİNDEKİ BİLGİYİ kullanmalı ve ÇÖZÜM EYLEMİNE
   işaret etmelidir:

     a · NEDEN boş — cümle "X yok" demekle kalmaz, sebebini ya da
         sonucunu SÖYLER. Ölçüsü yapısaldır: cümle en az İKİ yan tümce
         taşır (nokta · noktalı virgül · iki nokta · uzun tire ile
         ayrılmış ikinci bir içerik). "Kataloğu henüz yüklenmedi." tek
         tümcedir ve düşer; "Kataloğu YÜKLÜ: 578 madde taslakta ve
         aktifleştirme bekliyor. Aktifleştirme insan kararıdır…" geçer.

     b · NE YAPMALIYIM — `eylem` verilmiş mi. Eylemsiz bir boş durum,
         kullanıcıyı ekranda bırakır.

   ── SINIR AÇIKÇA YAZILIDIR ────────────────────────────────────────────
   Kapı cümlenin bir şey SÖYLEDİĞİNİ ölçer, söylediğinin DOĞRU olduğunu
   değil — R-D ve R-F'te kabul edilmiş aynı sınır. Doğruluk incelemenin
   ve provanın işidir; "kapı yeşil" onu doğrulanmış saymaz.

   Kullanım: node arac/bos-durum-kutugu.mjs [--yaz]
   ═══════════════════════════════════════════════════════════════════════ */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const KOK = process.cwd();
const TARANAN = ['app', 'components'];
const KUTUK = path.join(KOK, 'arac', 'bos-durumlar.json');

/** `<BosIlk … />` çağrısını dengeli parantezle çıkarır. */
export function cagrilariBul(kod) {
  const cikan = [];
  const kalip = /<BosIlk(\s)/g;
  let m;
  while ((m = kalip.exec(kod)) !== null) {
    let i = m.index + '<BosIlk'.length;
    let derinlik = 0;
    let tirnak = '';
    for (; i < kod.length; i += 1) {
      const c = kod[i];
      if (tirnak) { if (c === tirnak && kod[i - 1] !== '\\') tirnak = ''; continue; }
      if (c === "'" || c === '"' || c === '`') { tirnak = c; continue; }
      if (c === '{') derinlik += 1;
      else if (c === '}') derinlik -= 1;
      else if (c === '>' && derinlik === 0) break;
    }
    cikan.push({ konum: m.index, govde: kod.slice(m.index, i + 1) });
  }
  return cikan;
}

/** Bir öznitelik değerini dengeli olarak okur (`ad={…}` ya da `ad="…"`). */
export function ozellik(govde, ad) {
  const k = new RegExp(`\\b${ad}=`).exec(govde);
  if (!k) return null;
  let i = k.index + k[0].length;
  if (govde[i] === '"' || govde[i] === "'") {
    const t = govde[i];
    const son = govde.indexOf(t, i + 1);
    return son === -1 ? null : govde.slice(i + 1, son);
  }
  if (govde[i] !== '{') return null;
  let derinlik = 0; let tirnak = '';
  const bas = i;
  for (; i < govde.length; i += 1) {
    const c = govde[i];
    if (tirnak) { if (c === tirnak && govde[i - 1] !== '\\') tirnak = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { tirnak = c; continue; }
    if (c === '{') derinlik += 1;
    else if (c === '}') { derinlik -= 1; if (derinlik === 0) return govde.slice(bas + 1, i); }
  }
  return null;
}

/** Cümle ifadesinden okunabilir metni çıkarır (şablon yerleri kalır). */
export function cumleMetni(ifade) {
  if (ifade === null) return '';
  const parcalar = [...ifade.matchAll(/'([^'\\]*)'|"([^"\\]*)"|`([^`\\]*)`/g)]
    .map((m) => m[1] ?? m[2] ?? m[3]);
  return (parcalar.length > 0 ? parcalar.join(' ') : ifade).replace(/\s+/g, ' ').trim();
}

/**
 * a · NEDEN ölçütü: cümle en az İKİ yan tümce taşıyor mu?
 *
 * Ayırıcıdan SONRA gerçek içerik aranır: "Kayıt yok." sondaki noktayla
 * ikinci tümce sayılmaz. Kısaltmalar (`md.`, `bkz.`) tümce ayırmaz.
 */
const KISALTMALAR = ['md', 'bkz', 'vb', 'örn', 'ör', 'sn', 'dk', 'sy', 'no', 's'];

export function nedenSoyluyor(metin) {
  /* Şablon yerleri bir sözcük sayılır; içindeki noktalar tümce ayırmaz. */
  const govde = metin.replace(/\$\{[^}]*\}/g, '…');
  /* AYIRICIDAN SONRA GERÇEK İÇERİK ARANIR: "Kayıt yok." sondaki noktayla
     ikinci tümce sayılmaz. Kısaltmalar (`md.` · `bkz.`) tümce ayırmaz —
     ilk yazımda bunu engelleyen geriye bakış (`(?<![harf]{1,3})`) TERSİNE
     çalışıyordu: her tümce üç harfle bittiği için hiçbir bölme olmuyor ve
     sebebini SÖYLEYEN cümleler de "neden yok" sayılıyordu (ölçüldü). */
  const kisaltma = new RegExp(`\\b(${KISALTMALAR.join('|')})\\.$`, 'i');
  const parcalar = [];
  let biriken = '';
  for (const parca of govde.split(/([.;:—])\s+/)) {
    if (/^[.;:—]$/.test(parca)) { biriken += parca; continue; }
    if (kisaltma.test(biriken)) { biriken += ` ${parca}`; continue; }
    if (biriken.trim()) parcalar.push(biriken.trim());
    biriken = parca;
  }
  if (biriken.trim()) parcalar.push(biriken.trim());
  const dolu = parcalar.filter((s) => s.replace(/[.;:—]/g, '').split(/\s+/).filter(Boolean).length >= 2);
  return dolu.length >= 2;
}

export function turet() {
  const cikan = [];
  for (const kok of TARANAN) {
    for (const f of readdirSync(path.join(KOK, kok), { recursive: true }).map(String)) {
      if (!/\.tsx$/.test(f) || /\.test\.tsx$/.test(f)) continue;
      const rel = `${kok}/${f}`;
      const kod = readFileSync(path.join(KOK, rel), 'utf8');
      if (!kod.includes('<BosIlk')) continue;
      for (const c of cagrilariBul(kod)) {
        const metin = cumleMetni(ozellik(c.govde, 'cumle'));
        if (!metin) continue;
        /* İYİ HABER boş durumu EYLEM İSTEMEZ ve bu bir kaçış kapısı
           değil, ölçütün kendisidir: "Elenen satır yok — tüm satırlar
           doğrulamayı geçti" cümlesinin işaret edeceği bir çözüm yoktur.
           Olmayan bir eylem uydurmak, kullanıcıyı gereksiz bir yola
           sokmaktır. Bayrak bileşenin kendi API'sinden gelir
           (`BosIlk iyiHaber`), bu kütükten değil — yani elle
           işaretlenemez. */
        const iyiHaber = /\biyiHaber\b/.test(c.govde);
        cikan.push({
          yer: rel,
          satir: kod.slice(0, c.konum).split('\n').length,
          cumle: metin.slice(0, 300),
          iyiHaber,
          neden: nedenSoyluyor(metin),
          eylem: iyiHaber || ozellik(c.govde, 'eylem') !== null,
        });
      }
    }
  }
  return cikan.sort((a, b) => (a.yer + a.satir).localeCompare(b.yer + b.satir, 'tr'));
}

export function kutuguOku() { return JSON.parse(readFileSync(KUTUK, 'utf8')); }

if (process.argv[1] && /bos-durum-kutugu\.mjs$/.test(process.argv[1])) {
  const bulunan = turet();
  const ikisi = bulunan.filter((b) => b.neden && b.eylem);
  const nedensiz = bulunan.filter((b) => !b.neden);
  const eylemsiz = bulunan.filter((b) => !b.eylem);
  if (process.argv.includes('--yaz')) {
    const eski = (() => { try { return kutuguOku(); } catch { return {}; } })();
    writeFileSync(KUTUK, `${JSON.stringify({
      not: 'Boş durum kütüğü. Satırlar arac/bos-durum-kutugu.mjs ile TÜRETİLİR, elle yazılmaz.',
      tavanlar: { nedensiz: nedensiz.length, eylemsiz: eylemsiz.length },
      tavanGerekceleri: eski.tavanGerekceleri ?? [],
      istisnalar: eski.istisnalar ?? [],
      satirlar: bulunan,
    }, null, 2)}\n`);
    console.log(`kütük yazıldı: ${bulunan.length} boş durum`);
  }
  console.log(`boş durum: ${bulunan.length} · İKİ ÖLÇÜTÜ de karşılayan: ${ikisi.length}`
    + ` · nedensiz: ${nedensiz.length} · eylemsiz: ${eylemsiz.length}`);
  for (const b of nedensiz) console.log(`  NEDEN YOK  ${b.yer}:${b.satir} :: ${b.cumle.slice(0, 80)}`);
  for (const b of eylemsiz) console.log(`  EYLEM YOK  ${b.yer}:${b.satir} :: ${b.cumle.slice(0, 80)}`);
  console.log(`  (iyi haber boş durumu: ${bulunan.filter((b) => b.iyiHaber).length} — eylem istemez)`);
}
