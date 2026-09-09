import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { taranacakKaynaklar } from './nullOlumsuzlama';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · PASİF SÖZLÜK / ÖZNİTELİK SATIRI EKRANA İNMEZ (2.1 · URN-PKT-011)

   `SektorSozlugu.aktif`, `SektorOznitelikSemasi.aktif` ve (2.4)
   `MaddeEslestirmesi.aktif` paket yükseltmesinde ve kaldırmada false olur;
   satır SİLİNMEZ (R-C). Bayrağın anlamı okuyucuda kurulur: her okuma
   sorgusu `aktif: true` süzmelidir — yoksa pasif sözcük ekranda konuşmaya,
   pasif öznitelik çizilmeye, pasif eşleme türetilmiş durum üretmeye devam
   eder ve bayrak süs olur. Eşleme için ilişki İÇERMELERİ de okumadır
   (`madde.eslestirmeKaynak`): `include`/`select` içinde `where: { aktif:
   true }` olmayan içerme kırmızıdır; `true` kısayolu her zaman kırmızıdır.
   Kurucu (`lib/paket/`) ve sözlük takas aracı (geliştirme aracı, tabloyu
   bütün olarak yazar) kapsam dışıdır.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const KAPSAM_DISI = [/^lib\/paket\//, /^arac\//, /^prisma\//];
/* Okuma biçimleri: `findFirstOrThrow` · `findUniqueOrThrow` · `groupBy` ·
   `aggregate` de okumadır; ilk tarama dördünü de görmüyordu (bağımsız
   inceleme bulgusu, PR #43). Bugün bu dörtle sıfır kullanım var — kapı
   yarın açılacak deliği bekliyor. */
const OKUMA = /\b(?:db|tx|istemci)\.(sektorSozlugu|sektorOznitelikSemasi|maddeEslestirmesi)\.(findMany|findFirstOrThrow|findUniqueOrThrow|findFirst|findUnique|count|groupBy|aggregate)\s*\(/g;
/** Madde üzerinden eşleme içermesi: `eslestirmeKaynak: { ... }` ya da `eslestirmeKaynak: true`. */
const ICERME = /\b(eslestirmeKaynak|eslestirmeHedef)\s*:\s*(\{|true)/g;

type Sorgu = { dosya: string; satir: number; model: string; islem: string; govde: string };

/** `{` ile başlayan nesnenin dengeli kapanışına kadar olan metin. */
function kendiNesnesi(metin: string, acilis: number): string {
  let derinlik = 0;
  for (let i = acilis; i < metin.length; i++) {
    if (metin[i] === '{') derinlik++;
    else if (metin[i] === '}' && --derinlik === 0) return metin.slice(acilis, i + 1);
  }
  return metin.slice(acilis);
}

/** Süzgeç içermenin KENDİ `where`inde olmalı: ilk `aktif: true` ilk `include:`/`select:`ten önce gelir. */
function kendiSuzgeci(govde: string): boolean {
  const aktif = govde.search(/aktif:\s*true/);
  if (aktif === -1) return false;
  const ic = govde.search(/\b(?:include|select)\s*:/);
  return ic === -1 || aktif < ic;
}

function sorgular(): Sorgu[] {
  const sonuc: Sorgu[] = [];
  // üretim kaynakları (app · components · lib · arac · prisma) — testler ve kurucu kapsam dışı
  for (const dosya of taranacakKaynaklar()) {
    const goreli = path.relative(KOK, dosya).split(path.sep).join('/');
    if (!/\.(ts|tsx)$/.test(goreli) || KAPSAM_DISI.some((k) => k.test(goreli))) continue;
    const metin = readFileSync(dosya, 'utf8');
    for (const m of metin.matchAll(OKUMA)) {
      sonuc.push({ dosya: goreli, satir: metin.slice(0, m.index).split('\n').length, model: m[1], islem: m[2],
        govde: metin.slice(m.index! + m[0].length, m.index! + m[0].length + 400) });
    }
    for (const m of metin.matchAll(ICERME)) {
      /* Gövde İÇERMENİN KENDİ nesnesidir (dengeli parantez): sabit pencere
         komşu içermenin `aktif: true`suna taşıyordu ve süzgeçsiz
         `eslestirmeKaynak` yeşil kalıyordu (sabotaj S61 yakaladı). `true`
         kısayolunda süzgeç yazılamaz: gövde boş kalır ve kırmızı yanar. */
      const acilis = m.index! + m[0].length - 1;
      sonuc.push({ dosya: goreli, satir: metin.slice(0, m.index).split('\n').length, model: m[1], islem: 'include',
        govde: m[2] === 'true' ? '' : kendiNesnesi(metin, acilis) });
    }
  }
  return sonuc;
}

describe('Bekçi · sözlük, öznitelik ve eşleme okuyucuları yalnız aktif satırı görür [URN-PKT-011]', () => {
  const tum = sorgular();

  it('ölçüm tabanı: okuyucu sorguları gerçekten bulunuyor', () => {
    expect(tum.filter((s) => s.model !== 'maddeEslestirmesi' && s.islem !== 'include').length, 'sözlük/öznitelik okuma sorgusu sıfır olamaz — tarama boş bakıyor').toBeGreaterThanOrEqual(5);
    expect(tum.filter((s) => s.model === 'maddeEslestirmesi').length, 'eşleme okuma sorgusu sıfır olamaz').toBeGreaterThanOrEqual(3);
    expect(tum.filter((s) => s.islem === 'include').length, 'eşleme içermesi sıfır olamaz').toBeGreaterThanOrEqual(2);
  });

  it('her okuma sorgusu ve eşleme içermesi `aktif: true` süzer — pasif satır ekrana inmez [URN-PKT-011] [URN-PKT-014]', () => {
    /* Süzgeç araması iki yolda da KENDİ nesnesine bakar: düz pencere iç içe bir
       `include: { where: { aktif: true } }` süzgecini ödünç alabiliyordu — S61'in
       `include` tarafı kapatılmış, `findMany` tarafı açık kalmıştı (inceleme, PR #43). */
    const suzgecsiz = tum.filter((s) => !kendiSuzgeci(s.govde));
    expect(suzgecsiz.map((s) => `${s.dosya}:${s.satir} ${s.model}.${s.islem}`), 'aktif süzgeci olmayan okuyucu').toEqual([]);
  });
});
