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

   ── ÜÇ YÜZEY TARANIR ──────────────────────────────────────────────────
   İlk yazımda yalnız `<BosIlk>` taranıyordu ve bu bir KÖRLÜKTÜ: bağımsız
   inceleme (PR #51, tur 1) evrenin ~%62'sinin görülmediğini ölçtü —
   `<BosFiltre />` (yirmi beş çağrı) ve satır içi `className="bos"`
   metinleri (yirmi) kütükte HİÇ YOKTU ve üçü de "neden" ölçütünü
   geçmiyordu. Aracın kendi başlığındaki `/tesisler` örneği bile kütükte
   yoktu — yani kapı, var oluş sebebini ölçemiyordu. Aynı sınıf #50'de de
   çıkmıştı (R-F türeticisi yalnız `app/`e bakıyordu): türetici körse
   cırcır, GÖREBİLDİĞİ kadarını sıfır kusur diye raporlar.

   Bugün üç yüzey de taranır:

     BosIlk     — çağrı başına bir satır; cümle çağrıda yazılıdır.
     BosFiltre  — TANIM başına bir satır. Cümle bileşenin İÇİNDE, bir
                  kez yazılıdır; yirmi beş çağrıyı ayrı satır saymak
                  cırcırı cümle değil ÇAĞRI sayar hâle getirir ve tek bir
                  düzeltme yirmi beş düzeltme gibi görünürdü. Çağrı
                  sayısı satırda `cagri` alanında yazılıdır — sıfıra
                  düşerse satır ölür ve kapı bunu görür.
     satırIçi   — `<p className="bos">` / `<span className="bos">`.

   SINIRI: satır içi yüzeyde "eylem" bir bileşen özniteliği değil,
   gövdedeki gerçek bir bağdır (`<Link` · `<Dugme` · `href=` · `onClick`).
   "İyi haber" de aynı yerden okunur: `className="bos iyi"`. İkisi de
   KODDAN gelir, kütükten değil — elle işaretlenemez.

   ── SINIR AÇIKÇA YAZILIDIR ────────────────────────────────────────────
   Kapı cümlenin bir şey SÖYLEDİĞİNİ ölçer, söylediğinin DOĞRU olduğunu
   değil — R-D ve R-F'te kabul edilmiş aynı sınır. Doğruluk incelemenin
   ve provanın işidir; "kapı yeşil" onu doğrulanmış saymaz.

   İKİNCİ SINIR AYNI CÜMLEDEN GELİR VE BEYANLIDIR: "neden" ölçütü
   YAPISALDIR, iki kelimelik bir kuyruk onu geçer —

       nedenSoyluyor('Tanımlı eğitim yok. Böyle işte.')  → true

   ve bu bir kaçış kapısıdır. Bağımsız inceleme (PR #51, tur 1) haklı
   olarak işaretledi. UZUNLUK EŞİĞİ DENENDİ VE GERİ ALINDI, çünkü ölçüldü:
   16 karakterlik bir alt sınır, sebebini GERÇEKTEN söyleyen
   "…kaynak sistem yok — duruş ölçülmedi." satırını kırmızı yakıyordu
   ("duruş ölçülmedi" = 15 karakter), oysa kaçamağın kendisi ("Böyle
   işte" = 10) yalnız beş karakter aşağıdaydı. Yani eşik, doğru cümleyi
   cezalandırıp yanlış cümleyi durdurmuyordu — ölçütü değil kütüğü
   değiştiren bir eşiktir.

   Sınır bu yüzden KAPATILMADI, YAZILDI: kapı cümlenin BİR ŞEY
   söylediğini ölçer; söylediğinin işe yaradığını okuyan insandır. Aynı
   kabul edilmiş sınır R-D §1.10'da da yazılıdır. Sınırın kendisi bir
   vakayla ölçülür (`bekci/bos-durum.test.ts`): iki kelimelik kuyruk
   GEÇER — beyan ile ölçüm ayrışırsa kapı kırmızıdır.

   ── POPÜLASYON TABANI ─────────────────────────────────────────────────
   Sayı raporlayan her kapı bir ölçüm tabanı taşır ve bu kapı da taşır
   (`bos.durum`, `arac/olcum-tabani.json`). Taban testin içine sabit
   yazılırsa şu geçer (bağımsız inceleme, PR #51 tur 1): satırların bir
   kısmı başka bir sarmalayıcıya taşınır, ölü satır kontrolü `--yaz` ile
   susturulur, `nedensiz` doğal olarak düşer ve cırcır "yalnız küçüldü"
   der — hiçbir kusur düzelmemiştir. Taban ancak ÖLÇÜMLE ve DOSYAYA
   yazılan bir gerekçeyle iner.

   Kullanım: node arac/bos-durum-kutugu.mjs [--yaz] [--taban-yaz --sebep="..."]
   ═══════════════════════════════════════════════════════════════════════ */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sebepBayragi, tabanDogrula, tabanYaz } from './olcum-tabani.mjs';

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

/** Taranan dosyaların (yol, içerik) listesi. */
export function dosyalar() {
  const cikan = [];
  for (const kok of TARANAN) {
    for (const f of readdirSync(path.join(KOK, kok), { recursive: true }).map(String)) {
      if (!/\.tsx$/.test(f) || /\.test\.tsx$/.test(f)) continue;
      const rel = `${kok}/${f}`;
      cikan.push({ yer: rel, kod: readFileSync(path.join(KOK, rel), 'utf8') });
    }
  }
  return cikan;
}

/** `<p className="bos…">…</p>` / `<span …>` gövdelerini çıkarır.
    İç içe aynı etiket sayılır; kapanışı bulamazsa satır atlanmaz —
    gövde dosyanın sonuna kadar alınır ve cümle boş çıkarsa zaten
    kütüğe girmez. */
export function satirIciBul(kod) {
  const cikan = [];
  const kalip = /<(p|span)\s+className="bos([^"]*)"\s*>/g;
  let m;
  while ((m = kalip.exec(kod)) !== null) {
    const etiket = m[1];
    const ac = new RegExp(`<${etiket}[\\s>]`, 'g');
    const kapa = new RegExp(`</${etiket}>`, 'g');
    let i = m.index + m[0].length;
    let derinlik = 1;
    while (derinlik > 0 && i < kod.length) {
      ac.lastIndex = i; kapa.lastIndex = i;
      const a = ac.exec(kod); const k = kapa.exec(kod);
      if (!k) { i = kod.length; break; }
      if (a && a.index < k.index) { derinlik += 1; i = a.index + a[0].length; continue; }
      derinlik -= 1; i = k.index + k[0].length;
    }
    cikan.push({
      konum: m.index,
      sinif: `bos${m[2]}`,
      govde: kod.slice(m.index + m[0].length, i),
    });
  }
  return cikan;
}

/** Bir JSX ifadesi SEÇİM mi (yalnız dize seçen bir ifade) yoksa
    HESAP mı (çağrı, alan erişimi, aritmetik)? Seçimse cümle oradadır ve
    okunmalıdır: `{secili ? 'bağlı kayıt yok' : 'kayıt yok'}` bir boş
    durum cümlesidir, `{t(sozluk, 'tesis')}` ise bir terim yerleşimidir.
    Ayrım YAPISALDIR: seçimde dizelerin dışında yalnız koşul işleçleri
    ve boşluk kalır. */
export function ifadeSecim(ifade) {
  const kalan = ifade.replace(/'[^'\\]*'|"[^"\\]*"|`[^`\\]*`/g, '')
    .replace(/[?:()&|!\s]/g, '').replace(/[A-Za-zÇĞİÖŞÜçğıöşü0-9_.]+/g, '');
  return kalan === '' && /['"`]/.test(ifade);
}

/** Satır içi gövdeden okunabilir metin. Dize SEÇEN ifadeler açılır,
    HESAPLAYAN ifadeler "…" olur, etiketler düşer, `{' '}` boşluğa iner. */
export function satirIciMetin(govde) {
  return govde
    .replace(/\{'\s*'\}/g, ' ')
    .replace(/\{([^{}]*)\}/g, (_, ic) => (ifadeSecim(ic) ? cumleMetni(ic) : '…'))
    .replace(/<[^>]*>/g, ' ')
    .replace(/…(\s*…)+/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Satır içi yüzeyde EYLEM: gövdede gerçek bir bağ ya da düğme var mı.
    Öznitelik yok, bu yüzden kod okunur — kütükten işaretlenemez. */
export function satirIciEylem(govde) {
  return /<Link\b|<Dugme\b|\bhref=|\bonClick=/.test(govde);
}

/** `BosFiltre` bileşeninin TANIMI: cümlesi, eylemi ve çağrı sayısı. */
export function bosFiltreSatiri(hepsi) {
  const tanimlayan = hepsi.find((d) => /export function BosFiltre\b/.test(d.kod));
  if (!tanimlayan) return null;
  const bas = tanimlayan.kod.indexOf('export function BosFiltre');
  /* Gövde: bir sonraki üst düzey `export function`a kadar. */
  const sonrasi = tanimlayan.kod.slice(bas + 1);
  const bit = sonrasi.search(/\nexport (function|const) /);
  const govde = bit === -1 ? sonrasi : sonrasi.slice(0, bit);
  const cumle = satirIciMetin(
    (/<p className="cumle">([\s\S]*?)<\/p>/.exec(govde) ?? [, ''])[1]);
  if (!cumle) return null;
  const cagri = hepsi.reduce(
    (t, d) => t + (d.kod.match(/<BosFiltre[\s/>]/g) ?? []).length, 0);
  return {
    yer: tanimlayan.yer,
    satir: tanimlayan.kod.slice(0, bas).split('\n').length,
    tur: 'BosFiltre',
    cagri,
    cumle: cumle.slice(0, 300),
    iyiHaber: false,
    neden: nedenSoyluyor(cumle),
    eylem: satirIciEylem(govde),
  };
}

export function turet() {
  const cikan = [];
  const hepsi = dosyalar();
  const filtre = bosFiltreSatiri(hepsi);
  if (filtre) cikan.push(filtre);
  for (const { yer: rel, kod } of hepsi) {
    /* Satır içi yüzey: `<p className="bos">` / `<span className="bos">`.
       `bos iyi` sınıfı BEKLENEN YOKLUK demektir ve eylem istemez —
       bayrak koddan gelir, kütükten değil. */
    for (const c of satirIciBul(kod)) {
      const metin = satirIciMetin(c.govde);
      if (!metin || metin === '…') continue;
      const iyiHaber = /\biyi\b/.test(c.sinif);
      cikan.push({
        yer: rel,
        satir: kod.slice(0, c.konum).split('\n').length,
        tur: 'satirIci',
        cumle: metin.slice(0, 300),
        iyiHaber,
        neden: nedenSoyluyor(metin),
        eylem: iyiHaber || satirIciEylem(c.govde),
      });
    }
    if (!kod.includes('<BosIlk')) continue;
    {
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
          tur: 'BosIlk',
          cumle: metin.slice(0, 300),
          iyiHaber,
          neden: nedenSoyluyor(metin),
          eylem: iyiHaber || ozellik(c.govde, 'eylem') !== null,
        });
      }
    }
  }
  return cikan.sort((a, b) => `${a.yer}:${String(a.satir).padStart(6, '0')}`
    .localeCompare(`${b.yer}:${String(b.satir).padStart(6, '0')}`, 'tr'));
}

export function kutuguOku() { return JSON.parse(readFileSync(KUTUK, 'utf8')); }

/** Sınıf başına tavanlar. Tek bir toplam tavan, sıkı bir sınıfın
    (ör. `BosIlk`, eylemsiz = 0) gevşek bir sınıfın borcuyla
    karışmasına izin verir: `BosIlk`e eylemsiz bir satır eklenir,
    `satirIci`den biri düzelir ve toplam DEĞİŞMEZ. Tavan sınıf başına
    tutulunca bu takas imkânsızdır. */
export const SINIFLAR = ['BosIlk', 'BosFiltre', 'satirIci'];

export function sinifTavanlari(bulunan) {
  const t = {};
  for (const s of SINIFLAR) {
    const k = bulunan.filter((b) => b.tur === s);
    t[s] = { nedensiz: k.filter((b) => !b.neden).length, eylemsiz: k.filter((b) => !b.eylem).length };
  }
  return t;
}

if (process.argv[1] && /bos-durum-kutugu\.mjs$/.test(process.argv[1])) {
  const bulunan = turet();
  const ikisi = bulunan.filter((b) => b.neden && b.eylem);
  const nedensiz = bulunan.filter((b) => !b.neden);
  const eylemsiz = bulunan.filter((b) => !b.eylem);
  if (process.argv.includes('--taban-yaz')) {
    const { onceki, yeni } = tabanYaz('bos.durum', bulunan.length,
      { sebep: sebepBayragi(process.argv) });
    console.log(`taban yazıldı: bos.durum ${onceki ?? '—'} → ${yeni}`);
  } else {
    tabanDogrula('bos.durum', bulunan.length);
  }
  if (process.argv.includes('--yaz')) {
    const eski = (() => { try { return kutuguOku(); } catch { return {}; } })();
    writeFileSync(KUTUK, `${JSON.stringify({
      not: 'Boş durum kütüğü. Satırlar arac/bos-durum-kutugu.mjs ile TÜRETİLİR, elle yazılmaz.',
      tavanlar: { nedensiz: nedensiz.length, eylemsiz: eylemsiz.length },
      sinifTavanlari: sinifTavanlari(bulunan),
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
  for (const [ad, t] of Object.entries(sinifTavanlari(bulunan))) {
    const k = bulunan.filter((b) => b.tur === ad).length;
    console.log(`  ${ad}: ${k} satır · nedensiz ${t.nedensiz} · eylemsiz ${t.eylemsiz}`);
  }
}
