#!/usr/bin/env node
/* ÖLÇÜM TABANI — "hiçbir şey ölçmeyen kapı da geçer" sınıfının çözümü.

   ── Kapatılan kusur ───────────────────────────────────────────────────
   ÖLÇÜLDÜ (7 Eyl 2026): disk dolunca vitest her modülü topladı ama
   hiçbirinin gövdesini çözemedi. Keşif "158 dosya · 0 vaka" döndürdü,
   `sayimlar:yenile` sıfırı anlık görüntüye YAZDI ve `sayimlar:denetle`
   onu okuyup "taze · 0 vaka · gerçek keşifle DOĞRULANDI" dedi. Kapı
   hiçbir şey ölçmediği hâlde YEŞİL yandı.

   O tek kapı yerinde düzeltildi (`kesifKarari`), ama sınıf daha
   geniştir. Sayı raporlayan HER kapı bugün sıfır ölçümle de `exit 0`
   verebilir:

     yatay-tasma   144 ölçüm      → 0 ölçüm de "taşan 0" der
     erisim-axe    216 tarama     → 0 tarama da "ihlal 0" der
     rota-duman     58 rota       → 0 rota da "kusurlu 0" der
     kapi-farki     43 betik      → 0 betik de "beyansız 0" der

   ── CIRCIRIN SİMETRİĞİ ────────────────────────────────────────────────
   Kalite borcu cırcırı BORÇ için TAVAN tutar: sayı yukarı çıkamaz.
   Buradaki ölçü KAPSAM için TABAN tutar: sayı aşağı düşemez. İkisi
   birlikte bir kapıyı iki yönden de kapatır — ne borç sessizce büyür,
   ne ölçüm sessizce küçülür.

   ── TABAN NASIL DEĞİŞİR ───────────────────────────────────────────────
   Kapsam meşru sebeplerle DÜŞEBİLİR: bir rota silinir, bir bant
   emekliye ayrılır, bir betik kaldırılır. O gün taban ÖLÇÜMLE indirilir
   (`--taban-yaz`) ve düşüşün sebebi commit mesajına yazılır. Taban
   kendiliğinden inmez; inmesi bir KARARDIR.

   Taban YÜKSELMESİ serbesttir ve otomatiktir: yeni rota, yeni bant,
   yeni betik kapsamı büyütür. Büyümeyi engellemek, kapsamı korumakla
   ilgisiz bir sürtünme olurdu.

   Kullanım:
     import { tabanDogrula } from './olcum-tabani.mjs';
     tabanDogrula('tasma.olcum', olcumSayisi);     // düşükse ADIYLA atar
     node arac/olcum-tabani.mjs --taban-yaz        // ölçülen değerleri yaz
*/
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TABAN_YOLU = path.join(WEB, 'arac', 'olcum-tabani.json');

/** Taban dosyası — OKUNAMAZSA ATAR, sessizce boşa düşmez.

    `?? {}` deseydik dosya silindiğinde bütün tabanlar sıfır olur ve her
    kapı "taban yok, geç" derdi: kapıyı susturmanın tek adımlık yolu.
    Aynı gerekçe `kalite-borcu.mjs`te de yazılı. */
export function tabanOku(yol = TABAN_YOLU) {
  let ham;
  try {
    ham = readFileSync(yol, 'utf8');
  } catch (e) {
    throw new Error(`ÖLÇÜM TABANI OKUNAMADI: ${yol}\n  ${e.message}\n`
      + '  Bu dosya kapının parçasıdır, muafiyet defteri değil.');
  }
  const belge = JSON.parse(ham);
  if (!belge.tabanlar || typeof belge.tabanlar !== 'object') {
    throw new Error(`ÖLÇÜM TABANI BOZUK: ${yol} içinde 'tabanlar' nesnesi yok.`);
  }
  return belge;
}

/** SAF KARAR: ölçülen sayı taban için yeterli mi?

    `null` = geçti · dize = kırmızı, sebebi yazılı. Ayrı ve saf olması
    bilerek: "sıfır ölçüm" hâlini üretmek için diski doldurmak
    gerekmesin. */
export function tabanKarari(anahtar, olculen, tabanlar) {
  if (!Number.isFinite(olculen) || olculen < 0) {
    return `ÖLÇÜM GEÇERSİZ: ${anahtar} = ${olculen}. Sayı olmayan bir ölçüm, ölçüm değildir.`;
  }
  const taban = tabanlar[anahtar];
  if (taban === undefined) {
    return `ÖLÇÜM TABANI BEYAN EDİLMEMİŞ: ${anahtar}. Sayı raporlayan her kapı `
      + 'tabanını `arac/olcum-tabani.json` içinde beyan eder; beyansız ölçü, '
      + 'sıfıra düştüğünde bunu söyleyemez.';
  }
  if (olculen < taban) {
    return `ÖLÇÜM KAPSAMI DÜŞTÜ: ${anahtar} = ${olculen} < taban ${taban}. `
      + 'Kapı daha AZ şey ölçüyor ve yine de geçebilirdi. Düşüş meşruysa '
      + '(rota silindi, bant emekliye ayrıldı) tabanı ÖLÇÜMLE indirin: '
      + 'node arac/olcum-tabani.mjs --taban-yaz — ve sebebini commit mesajına yazın.';
  }
  return null;
}

/** Kapı içinden çağrılır: düşükse ADIYLA atar. */
export function tabanDogrula(anahtar, olculen, yol = TABAN_YOLU) {
  const hata = tabanKarari(anahtar, olculen, tabanOku(yol).tabanlar);
  if (hata) throw new Error(hata);
  return olculen;
}

/** Ölçülen değeri tabana YAZAR — yalnız `--taban-yaz` ile. */
export function tabanYaz(anahtar, olculen, yol = TABAN_YOLU) {
  const belge = tabanOku(yol);
  const onceki = belge.tabanlar[anahtar];
  belge.tabanlar[anahtar] = olculen;
  writeFileSync(yol, `${JSON.stringify(belge, null, 2)}\n`);
  return { onceki, yeni: olculen };
}
