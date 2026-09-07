import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · sektör terimi (P1 · URN-ALN-003) — CIRCIR

   Çekirdek sektör taşımaz: "santral" enerji kiracısının sözcüğüdür ve
   `SektorSozlugu`ndan gelir, koda gömülmez. Bugün 258 dosya hâlâ gömülü
   terim taşıyor; hepsini bir seferde çevirmek tek dev bir yama olurdu.
   Bu yüzden kapı ÖNCE kuruluyor, temizlik sonra: liste bir borç kütüğü,
   test de cırcır dişlisi.

   ── NEDEN TANIMLAYICILAR DA TARANIYOR ─────────────────────────────────
   Paket tarifi yalnız "JSX/metin literali" diyordu. Öyle bir tarama
   `type Santral`, `santraller: Santral[]`, `santralId`, `Plant360Veri`
   gibi 400'den fazla eşleşmeyi GÖRMEZ ve paketin iddiasını
   ("çekirdek hiçbir sektör terimi taşımaz") boşa çıkarırdı. Tarama ham
   metin üstündedir: literal, tanımlayıcı, yorum, CSS sınıfı ve DOSYA ADI
   dâhil. Sektör sözcüğünün nerede durduğu değil, DURUYOR OLMASI kusurdur.

   ── İKİ YÖNLÜ ─────────────────────────────────────────────────────────
   (a) Listede OLMAYAN dosyada terim → kırmızı. Cırcırın dişi budur.
   (b) Listede OLAN dosyada terim kalmamış → kırmızı. Dişli geri
       kaymasın diye: temizlenen dosya listeden DÜŞMEK zorundadır, yoksa
       liste bir gün sadece eski bir hikâye olur ve kimse eritmez.
   ═══════════════════════════════════════════════════════════════════════ */

const KOKLER = ['app', 'components', 'lib'] as const;
const UZANTI = /\.(ts|tsx|css)$/;
const IZIN_DOSYASI = 'tests/bekci/sektor-terimi-izin.json';

/* Terimler ve neden bu terimler:
   · `santral` — kiracının sözcüğü; çekirdeğinki `tesis`.
   · `ünite`/`unite` — çekirdeğinki `birim` (model P1'de yeniden adlandırıldı).
   · `MW`/`MWe`/`MWp` — elektrik gücü birimi; nitelik birimini sektör
     paketi verir (`SektorOznitelikSemasi.birim`).
   · tip kodları — enerji üretim tipleri; `TesisTipi` verisinden gelmeli.
   · `türbin`, `jeotermal`, `rüzgâr`, `hidroelektrik` — üretim teknolojisi.
   · `plant` — aynı sözcüğün İngilizcesi; `Plant360` gibi bileşen adları.
   Kapsam dışı bırakılanlar ve nedenleri izin dosyasının başlığındadır. */
const TERIMLER: { ad: string; kalip: RegExp }[] = [
  { ad: 'santral', kalip: /santral/gi },
  { ad: 'ünite', kalip: /ünite|\bunite\b/gi },
  { ad: 'MW', kalip: /\bMW[ep]?\b/g },
  { ad: 'tip kodu', kalip: /\b(JES|JEO|RES|HES|GES|DGKC|DGKÇ|TERMIK)\b/g },
  { ad: 'türbin', kalip: /türbin/gi },
  { ad: 'üretim tipi', kalip: /jeotermal|rüzgâr|hidroelektrik/gi },
  { ad: 'plant', kalip: /plant/gi },
];

function* kaynakDosyalari(kok: string): Generator<string> {
  for (const e of readdirSync(kok, { withFileTypes: true })) {
    const p = path.join(kok, e.name);
    if (e.isDirectory()) {
      // Üretilen Prisma istemcisi kaynak değildir; şemadan türer.
      if (e.name === 'prisma-client') continue;
      yield* kaynakDosyalari(p);
    } else if (UZANTI.test(e.name)) yield p;
  }
}

/** Dosyada (adı dâhil) geçen sektör terimleri — hangi terim, kaç kez. */
function terimleriBul(yol: string): { terim: string; sayi: number }[] {
  const metin = readFileSync(yol, 'utf8');
  const bulunan: { terim: string; sayi: number }[] = [];
  for (const { ad, kalip } of TERIMLER) {
    const sayi = (metin.match(new RegExp(kalip.source, kalip.flags))?.length ?? 0)
      + (yol.match(new RegExp(kalip.source, kalip.flags))?.length ?? 0);
    if (sayi > 0) bulunan.push({ terim: ad, sayi });
  }
  return bulunan;
}

const izin = JSON.parse(readFileSync(IZIN_DOSYASI, 'utf8')) as {
  tavan: number; dosyalar: string[];
};
const izinKumesi = new Set(izin.dosyalar);

const taranan = KOKLER.flatMap((k) => [...kaynakDosyalari(k)]);
const kirli = taranan
  .map((yol) => ({ yol, terimler: terimleriBul(yol) }))
  .filter((x) => x.terimler.length > 0);
const kirliKumesi = new Set(kirli.map((x) => x.yol));

describe('Bekçi · sektör terimi (cırcır)', () => {
  it('taranan yüzey boş değil', () => {
    /* Bir yol hatası tarama kümesini boşaltırsa bütün bekçi sessizce
       yeşile döner. Ölçülen şeyin var olduğunu önce burası söyler. */
    expect(taranan.length, 'kaynak dosya bulunamadı — tarama kökleri bozuk')
      .toBeGreaterThan(300);
  });

  it('izin listesinde OLMAYAN dosyada sektör terimi yok [URN-ALN-003]', () => {
    const kacaklar = kirli
      .filter((x) => !izinKumesi.has(x.yol))
      .map((x) => `${x.yol} → ${x.terimler.map((t) => `${t.terim}×${t.sayi}`).join(', ')}`);
    expect(kacaklar,
      'Sektör terimi izin listesinde olmayan dosyada. Terimi sözlükten '
      + `çözün (lib/dil/terimler.ts); listeye EKLEMEYİN (${IZIN_DOSYASI}).`)
      .toEqual([]);
  });

  it('izin listesindeki dosya HÂLÂ kirli — temizleneni listeden düşürün', () => {
    /* Cırcırın geri kaymasını engelleyen diş. Temizlenmiş bir dosya
       listede kalırsa, o dosya ileride sessizce yeniden kirlenebilir. */
    const temizlenmis = izin.dosyalar.filter((d) => !kirliKumesi.has(d));
    expect(temizlenmis,
      `Bu dosyalarda sektör terimi kalmamış: ${IZIN_DOSYASI} içinden çıkarın `
      + 've commit mesajına kalan sayıyı yazın.')
      .toEqual([]);
  });

  it('izin listesindeki her yol gerçekten var', () => {
    const yok = izin.dosyalar.filter((d) => !taranan.includes(d));
    expect(yok, 'Taşınmış ya da silinmiş yol; izin listesini güncelleyin')
      .toEqual([]);
  });

  it('liste tavanı aşmıyor ve düzenli', () => {
    /* `tavan` cırcırın kurulduğu gündeki dosya sayısıdır ve ARTMAZ.
       Sıralı + tekrarsız olması, listeyi eriten commit'lerin diff'ini
       okunur tutar: eklenen bir satır göze batar. */
    expect(izin.dosyalar.length, 'izin listesi büyümüş — dosya EKLENEMEZ')
      .toBeLessThanOrEqual(izin.tavan);
    expect(izin.dosyalar, 'izin listesi sıralı değil')
      .toEqual([...izin.dosyalar].sort());
    expect(new Set(izin.dosyalar).size, 'izin listesinde tekrar var')
      .toBe(izin.dosyalar.length);
  });
});
