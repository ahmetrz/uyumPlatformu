#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   R-F · POLİTİKA CÜMLESİ KÜTÜĞÜ · TÜRETİCİ

   ── NE ÖLÇER ─────────────────────────────────────────────────────────
   Ekranda görünen ve sistemin NE YAPACAĞINI / NE YAPMAYACAĞINI iddia
   eden cümleleri koddan TÜRETİR ve kütükle (`politika-cumleleri.json`)
   karşılaştırır.

   ── NEDEN ELLE LİSTE OLMAZ ───────────────────────────────────────────
   Elle yazılmış liste yeni ekran eklendiği gün eksik kalır ve bekçi ona
   hiç bakmaz. Bu depoda aynı kusur iki kez ölçüldü: kapı iş adları
   (sabit liste, beşinci iş hiç girmedi) ve dışa aktarım yüzeyleri.

   ── KALIP NASIL SEÇİLDİ ──────────────────────────────────────────────
   Politika iddiasını alan doğrulamasından ("Negatif olamaz") ayıran şey
   ÖZNEDİR: iddia sisteme bağlanır. Bu yüzden iki koşul birden aranır —
   bir SİSTEM ÖZNESİ ve bir POLİTİKA YÜKLEMİ. Türkçede yüklemin en güçlü
   işareti olumsuz geniş zamandır (-maz/-mez): "açılmaz", "silmez",
   "değiştirmez".

   Kalıbın kendisi ölçüldü: yalnız yüklem arandığında 1 137 aday çıkıyor
   ve içi alan doğrulaması ve durum etiketiyle doluydu; özne koşulu
   eklenince 72'ye indi.
   ═══════════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const KOK = process.cwd();
const TARANAN = ['app'];
const KUTUK = path.join(KOK, 'arac', 'politika-cumleleri.json');

/** İddiayı SİSTEME bağlayan sözcük. */
export const OZNE = /\b(bu ekran|bu kutu|bu liste|bu kurulum\w*|bu ortam\w*|bu sayfa|bu aktarım|sunucu|motor|kütük|ürün|sistem|platform|kayıt|kayıtlar|kapsam|yetki\w*|hiçbir|otomatik|denetim izi|iz)\b/iu;

/** Sistemin ne yapacağı/yapmayacağı. */
export const YUKLEM = /(\b\w+m[ae]z\b|\b\w+[ae]m[ae]z(siniz)?\b|\bzorunlu\b|\byalnız(ca)?\b|\bsadece\b|\breddedil\w*|\bizin verilm\w*|\bkapalı\b|\bdeğişmez\b)/iu;

export const yorumsuz = (m) => m
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((s) => s.replace(/\/\/.*$/, '')).join('\n');

/** Bir metin sabiti politika cümlesi mi? */
export function politikaMi(s) {
  if (s.split(/\s+/).length < 4) return false;
  /* JSX ve biçem parçası cümle değildir. */
  if (/[<>]|style=\{|className=|var\(--/.test(s)) return false;
  return OZNE.test(s) && YUKLEM.test(s);
}

export function turet() {
  const cikan = [];
  for (const kok of TARANAN) {
    for (const f of readdirSync(path.join(KOK, kok), { recursive: true }).map(String)) {
      if (!/\.(tsx|ts)$/.test(f) || /\.(test|demo)\.tsx?$/.test(f)) continue;
      const rel = `${kok}/${f}`;
      const kod = yorumsuz(readFileSync(path.join(KOK, rel), 'utf8'));
      for (const m of kod.matchAll(/'([^'\\\n]{25,300})'|"([^"\\\n]{25,300})"|`([^`\\]{25,300})`/g)) {
        const cumle = (m[1] ?? m[2] ?? m[3]).trim();
        if (!politikaMi(cumle)) continue;
        if (!cikan.some((c) => c.cumle === cumle)) cikan.push({ yer: rel, cumle });
      }
    }
  }
  return cikan.sort((a, b) => a.cumle.localeCompare(b.cumle, 'tr'));
}

export function kutuguOku() {
  return JSON.parse(readFileSync(KUTUK, 'utf8'));
}

/* Doğrudan koşulduğunda: türet ve raporla. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const bulunan = turet();
  const yaz = process.argv.includes('--yaz');
  if (yaz) {
    const eski = (() => { try { return kutuguOku(); } catch { return { satirlar: [] }; } })();
    const eskiler = new Map(eski.satirlar.map((s) => [s.cumle, s]));
    /* YENİ SATIRA BOŞ KOD VERİLİR. İndise göre kod üretmek, listeye bir
       cümle eklendiği gün var olan kodlarla ÇAKIŞIYORDU (ölçüldü: dört
       çift kod). Kod bir kez verilir ve cümle kalktığında geri gelmez. */
    let sonraki = eski.satirlar.reduce(
      (a, s) => Math.max(a, Number((s.kod ?? '').replace('POL-', '')) || 0), 0);
    const satirlar = bulunan.map((b) => {
      const varolan = eskiler.get(b.cumle);
      if (varolan) return varolan;
      sonraki += 1;
      return {
        kod: `POL-${String(sonraki).padStart(3, '0')}`,
        cumle: b.cumle, yer: b.yer, sinif: 'SINIFLANDIRILMADI',
      };
    });
    writeFileSync(KUTUK, `${JSON.stringify({ ...eski, satirlar }, null, 2)}\n`);
    console.log(`kütük yazıldı: ${satirlar.length} satır`);
  } else {
    console.log(`politika cümlesi: ${bulunan.length}`);
    for (const b of bulunan) console.log(`  ${b.yer} :: ${b.cumle.slice(0, 100)}`);
  }
}
