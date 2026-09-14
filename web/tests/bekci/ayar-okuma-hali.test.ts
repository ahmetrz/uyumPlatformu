import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* OKUMA HÂLİ ≠ DÜZENLEME HÂLİ — SIS-OKM-001.

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   `/ayarlar` açılır açılmaz ALTI giriş alanı çiziyordu: profilde ad,
   unvan ve salt okunur e-posta; parolada mevcut, yeni ve tekrar. Oysa
   ekranın birincil görevi "ben kimim, nereye girebiliyorum, oturumum ne
   durumda" sorusunu OKUMAKTIR — kullanıcıların çoğu hiçbir alanı
   değiştirmeden çıkar. Parola bölümü bunun en keskin hâliydi: parola
   özeti ekrana İNMEZ (`veri.ts`), yani okunacak bir değer yoktu ve
   bölüm üç BOŞ kutudan ibaretti.

   Ürünün kendi kalıbı zaten bunun tersidir: `bulgular/[id]` ve
   `/regulasyonlar` değerleri okutur, düzenlemeyi kullanıcının kararıyla
   açar. `/ayarlar` istisnaydı.

   ── BU BEKÇİ NE TUTAR ─────────────────────────────────────────────────
   Kaynağı okur ve kuralı üç yönden ölçer: (a) okuma dalında yazılabilir
   alan YOK, (b) kapı kapalı DOĞAR (`useState(false)`), (c) açılan kip
   kapanabilir (`Vazgeç`). Dördüncü vaka kuralı GENELLER: ekrandaki
   yazılabilir alanların TAMAMI bir kapının arkasındadır — yarın
   kapısız yeni bir form eklenirse sayı tutmaz.

   SINIR (beyanlı): kapı alanların KONUMUNU ölçer, formun doğru
   çalıştığını değil — R-D ve R-F'te kabul edilmiş aynı sınır. */

const EKRAN = 'app/(kabuk)/(operasyonel)/ayarlar/AyarlarIstemci.tsx';
const KAYNAK = readFileSync(EKRAN, 'utf8');

/* Ekrandaki iki okuma/düzenleme kapısı. Ad listesi ELLE yazılır ama
   kapısız alan dördüncü vakada yakalanır: liste eksilirse o vaka
   kırmızı yanar. */
const KAPILAR = ['duzenle', 'degistir'];

/** `<input …/>` etiketlerinin tam metni. Etiket ilk `/>` ile biter —
 *  bu dosyada öznitelik değerlerinin içinde `/>` yok. */
function inputlar(s: string): string[] {
  const c: string[] = [];
  for (let i = s.indexOf('<input'); i >= 0; i = s.indexOf('<input', i + 1)) {
    const son = s.indexOf('/>', i);
    c.push(s.slice(i, son < 0 ? i + 200 : son + 2));
  }
  return c;
}

/** Salt okunur alan yazma yüzeyi değildir: değeri gösterir. */
const yazilabilir = (etiket: string) => !/readOnly/.test(etiket);
const yazilabilirSayisi = (s: string) => inputlar(s).filter(yazilabilir).length;

/** `(` ile eşleşen `)` indeksi. Dengesiz parantez KIRMIZI yakar — sessiz
 *  düşmez; yanlış dal okumaktansa kapı patlasın. */
function esle(s: string, ac: number): number {
  let d = 0;
  for (let i = ac; i < s.length; i += 1) {
    if (s[i] === '(') d += 1;
    else if (s[i] === ')') { d -= 1; if (d === 0) return i; }
  }
  throw new Error(`parantez kapanmıyor: ${ac}`);
}

/** `{!bayrak ? ( OKUMA ) : ( DÜZENLEME )}` dallarını ayırır. */
function dallar(s: string, bayrak: string): { okuma: string; duzenleme: string } {
  const im = s.indexOf(`!${bayrak} ? (`);
  if (im < 0) throw new Error(`okuma/düzenleme kapısı yok: !${bayrak}`);
  const a0 = s.indexOf('(', im);
  const a1 = esle(s, a0);
  const ara = s.slice(a1 + 1, s.indexOf('(', a1 + 1));
  if (!/^\s*:\s*$/.test(ara)) throw new Error(`kapının ikinci dalı yok: ${bayrak}`);
  const b0 = s.indexOf('(', a1 + 1);
  return { okuma: s.slice(a0 + 1, a1), duzenleme: s.slice(b0 + 1, esle(s, b0)) };
}

describe('Ayarlar · okuma hâli düzenleme hâli değildir [SIS-OKM-001]', () => {
  it.each(KAPILAR)('[SIS-OKM-001] `%s` kapısının OKUMA dalı yazılabilir alan '
    + 'çizmez, DÜZENLEME dalı çizer', (bayrak) => {
    const { okuma, duzenleme } = dallar(KAYNAK, bayrak);
    expect(yazilabilirSayisi(okuma), `${bayrak}: okuma dalında yazılabilir alan var`)
      .toBe(0);
    /* Boş bir düzenleme dalı kuralı bedavaya geçirirdi. */
    expect(yazilabilirSayisi(duzenleme), `${bayrak}: düzenleme dalı boş`)
      .toBeGreaterThan(0);
  });

  it.each(KAPILAR)('[SIS-OKM-001] `%s` kapısı KAPALI doğar — `useState(true)` '
    + 'kapı değil, yalnız bir değişken adıdır', (bayrak) => {
    expect(KAYNAK, `${bayrak} kapalı doğmuyor`)
      .toMatch(new RegExp(`\\[${bayrak}, set\\w+\\] = useState\\(false\\)`));
  });

  it.each(KAPILAR)('[SIS-OKM-001] `%s` kipinden VAZGEÇİLEBİLİR — açılan bir '
    + 'kip kapanamıyorsa kullanıcı okuma hâline dönemez', (bayrak) => {
    expect(dallar(KAYNAK, bayrak).duzenleme, `${bayrak}: çıkış yok`)
      .toContain('Vazgeç');
  });

  it.each(KAPILAR)('[SIS-OKM-001] `%s` kipinden vazgeçmek ÖNCEKİ DENEMEYİ de '
    + 'siler — kalan hata, üç boş alanın üstünde eski bir denemeyi anlatır '
    + 've kullanıcı onu bu formun cevabı sanar', (bayrak) => {
    /* Kipi AÇAN düğme de temizler: kip kapanmadan sayfa yenilenirse hata
       ayakta kalır ve ikinci açılışta yine karşılar. */
    const { duzenleme } = dallar(KAYNAK, bayrak);
    const vazgec = KAYNAK.slice(KAYNAK.indexOf('const vazgec = () => {',
      KAYNAK.indexOf(`[${bayrak}, set`)));
    expect(vazgec.slice(0, vazgec.indexOf('};')), `${bayrak}: vazgeç hatayı bırakıyor`)
      .toContain('setHata(null)');
    expect(duzenleme, `${bayrak}: vazgeç düğmesi vazgec() çağırmıyor`)
      .toContain('onClick={vazgec}');
  });

  it('[SIS-OKM-001] kipi AÇAN düğme de hatayı siler — kapanmadan tazelenen '
    + 'bir ekranda hata ayakta kalır ve ikinci açılışta yine karşılar', () => {
    KAPILAR.forEach((bayrak) => {
      const { okuma } = dallar(KAYNAK, bayrak);
      expect(okuma, `${bayrak}: açan düğme hatayı silmiyor`).toContain('setHata(null)');
    });
  });

  it('[SIS-OKM-001] kip değişiminde ODAK taşınır — kipi açan düğme DOM\'dan '
    + 'silindiğinde klavye kullanıcısının odağı gövdeye düşer', () => {
    /* Kancanın kendisi: açılışta ilk alana, kapanışta açan düğmeye. */
    const kanca = KAYNAK.slice(KAYNAK.indexOf('function useKipOdagi('));
    const govde = kanca.slice(0, kanca.indexOf('\n}'));
    expect(govde, 'odak açılışta ilk alana gitmiyor').toContain('ilkAlan.current');
    expect(govde, 'odak kapanışta açan düğmeye dönmüyor').toContain('acanDugme.current');
    /* İLK ÇİZİMDE TAŞINMAZ: ekran açılır açılmaz odağı bir düğmeye
       çekmek, kullanıcının hiç istemediği bir yere ışınlanmasıdır.
       Ölçülen şey BAYRAĞIN ADI DEĞİL, korumanın kendisidir: sabotaj
       turunda `if (…) return;` satırı silindiğinde `useRef` bildirimi
       yerinde kaldığı için ada bakan bir iddia yeşil kalıyordu. */
    const oncesi = govde.slice(0, govde.indexOf('.focus()'));
    expect(oncesi, 'ilk çizimde odak taşımayı durduran erken çıkış yok')
      .toMatch(/if\s*\(ilkCizim\.current\)[^\n]*return;/);
    /* Ve iki bölüm de kancayı ÇAĞIRIR — yazılmış ama çağrılmamış bir
       kanca hiçbir şey yapmaz. */
    expect(KAYNAK.match(/useKipOdagi\(/g) ?? [], 'kanca her kipte çağrılmıyor')
      .toHaveLength(KAPILAR.length + 1);
  });

  it('[SIS-OKM-001] ekrandaki yazılabilir alanların TAMAMI bir kapının '
    + 'arkasında — kapısız yeni bir form buradan geçemez', () => {
    const kapili = KAPILAR.reduce(
      (n, b) => n + yazilabilirSayisi(dallar(KAYNAK, b).duzenleme), 0);
    const toplam = yazilabilirSayisi(KAYNAK);
    expect(toplam, 'ekranda hiç yazılabilir alan yok — kural ölçtüğü şeyi '
      + 'kaybetmiş').toBeGreaterThan(0);
    expect(kapili, `${toplam - kapili} yazılabilir alan kapı dışında`)
      .toBe(toplam);
  });
});
