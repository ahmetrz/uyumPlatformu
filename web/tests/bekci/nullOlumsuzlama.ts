/* NULL-OLUMSUZLAMA BEKÇİSİNİN SAF ÇEKİRDEĞİ — veritabanı bilmez, dosya
   sistemini yalnız `taranacakKaynaklar()` içinde okur.

   SINIF: nullable bir kolon üzerinde olumsuz yüklem (`NOT: { x: v }`,
   `x: { not: v }`, `x: { notIn: [...] }`, ham SQL `NOT IN` · `<>` · `!=`)
   SQL'in üç değerli mantığında NULL satırı SESSİZCE düşürür: `NOT (rol =
   'kapasite')` rolü NULL satırda NULL'dır, NULL da "doğru" değildir.
   Ölçüldü (8 Eylül 2026): enerji Tesis 360'ta rolü boş yedi öznitelik
   böyle kayboldu ve 3 292 yeşil test görmedi.

   KARAR KURALI — bir bulgu ancak şu hâllerde GÜVENLİDİR:
     · olumsuzlanan değer NULL'un kendisidir (`{ not: null }` = IS NOT NULL);
     · kolon şemada NOT NULL'dır (NULL satır olamaz);
     · aynı `where` içinde NULL AÇIKÇA ele alınmıştır — ya `OR`
       dalıyla dâhil (`{ x: null }`) ya `NOT: { x: null }` / `x: { not: null }`
       ile dışlanmıştır.
   Geri kalan her bulgu BEYAN ister: gerekçeli izin listesi (`null-olumsuzlama-
   izin.json`), yalnız küçülür.

   Statik ayrıştırma sınırı: model, bulguyu kapsayan `db.<model>.<işlem>(`
   çağrısından çözülür; çağrı dışında kurulan filtre parçası (`const kutuk =
   { durum: { not: 'kapali' } }`) modelini bilemez ve beyan ister — beyan
   satırı `model` yazar, bekçi yazılan modeli şemaya karşı doğrular. */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export type SemaAlan = { ad: string; tip: string; nullable: boolean; liste: boolean; iliski: boolean };
export type SemaModel = { ad: string; alanlar: Map<string, SemaAlan> };

/** `model X { … }` bloklarını alan · tip · null'luk · ilişki bilgisiyle ayrıştırır. */
export function semaAyristir(sema: string): Map<string, SemaModel> {
  const modeller = new Map<string, SemaModel>();
  const bloklar = [...sema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
  for (const m of bloklar) modeller.set(m[1], { ad: m[1], alanlar: new Map() });
  for (const m of bloklar) {
    const model = modeller.get(m[1])!;
    for (const ham of m[2].split('\n')) {
      const s = ham.trim();
      if (!s || s.startsWith('//') || s.startsWith('@@')) continue;
      const [ad, tipHam] = s.split(/\s+/);
      if (!ad || !tipHam) continue;
      const liste = tipHam.endsWith('[]');
      const nullable = tipHam.endsWith('?');
      const tip = tipHam.replace(/\[\]$|\?$/, '');
      model.alanlar.set(ad, { ad, tip, nullable, liste, iliski: modeller.has(tip) });
    }
  }
  return modeller;
}

/** Yorumları ve dize İÇERİKLERİNİ boşlukla maskeler; uzunluk ve satır
    sonları korunur (konum → satır hesabı bozulmaz). Türkçe "not:" yorumu
    ile Prisma `not:` süzgeci böyle ayrılır. Satır içinde kapanmayan tek
    tırnak (ör. düzenli ifade içinde) dize sayılmaz. */
export function kodMaskele(metin: string): string {
  const out = metin.split('');
  const n = metin.length;
  let i = 0;
  const bosalt = (k: number) => { if (metin[k] !== '\n') out[k] = ' '; };
  while (i < n) {
    const c = metin[i];
    const d = metin[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && metin[i] !== '\n') { out[i] = ' '; i++; }
      continue;
    }
    if (c === '/' && d === '*') {
      bosalt(i); bosalt(i + 1); i += 2;
      while (i < n && !(metin[i] === '*' && metin[i + 1] === '/')) { bosalt(i); i++; }
      if (i < n) { bosalt(i); bosalt(i + 1); i += 2; }
      continue;
    }
    if (c === '"' || c === "'") {
      // aynı satırda kapanış yoksa dize değildir (düzenli ifade, kesme işareti)
      let j = i + 1; let kapandi = false;
      while (j < n && metin[j] !== '\n') {
        if (metin[j] === '\\') { j += 2; continue; }
        if (metin[j] === c) { kapandi = true; break; }
        j++;
      }
      if (!kapandi) { i++; continue; }
      for (let k = i + 1; k < j; k++) bosalt(k);
      i = j + 1;
      continue;
    }
    if (c === '`') {
      i++;
      while (i < n && metin[i] !== '`') {
        if (metin[i] === '\\') { bosalt(i); i++; if (i < n) bosalt(i); i++; continue; }
        if (metin[i] === '$' && metin[i + 1] === '{') {
          // şablon ifadesi KOD'dur: maskelenmez, iç içe süslüler izlenir
          let derinlik = 0;
          while (i < n) {
            if (metin[i] === '{') derinlik++;
            else if (metin[i] === '}') { derinlik--; if (derinlik === 0) { i++; break; } }
            i++;
          }
          continue;
        }
        bosalt(i); i++;
      }
      i++;
      continue;
    }
    i++;
  }
  return out.join('');
}

const ACAN: Record<string, string> = { '(': ')', '{': '}', '[': ']' };

/** `acik` konumundaki parantezin eşini döndürür; bulunamazsa metin sonu. */
export function esKapanis(kod: string, acik: number): number {
  const yigin: string[] = [];
  for (let i = acik; i < kod.length; i++) {
    const c = kod[i];
    if (ACAN[c]) yigin.push(ACAN[c]);
    else if (c === ')' || c === '}' || c === ']') {
      if (yigin.pop() !== c) return kod.length;
      if (yigin.length === 0) return i;
    }
  }
  return kod.length;
}

const ISLEMLER = 'findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|count|aggregate|groupBy|update|updateMany|delete|deleteMany|upsert';
const CAGRI = new RegExp(`\\b(?:db|tx|prisma|istemci)\\.(\\w+)\\.(?:${ISLEMLER})\\s*\\(`, 'g');

export type Cagri = { model: string | null; ozellik: string; bas: number; son: number };

/** Dosyadaki Prisma çağrılarının kapsamları (maskelenmiş kod üzerinde). */
export function cagrilar(kod: string, sema: Map<string, SemaModel>): Cagri[] {
  const sonuc: Cagri[] = [];
  for (const m of kod.matchAll(CAGRI)) {
    const acik = m.index! + m[0].length - 1;
    const modelAdi = m[1][0].toUpperCase() + m[1].slice(1);
    sonuc.push({ model: sema.has(modelAdi) ? modelAdi : null, ozellik: m[1], bas: acik, son: esKapanis(kod, acik) });
  }
  return sonuc;
}

/** Belirteci kapsayan nesne anahtarları, dıştan içe; `sinir`a kadar geri
    yürür. Her kapsayan `{`/`[`/`(` için önündeki `anahtar:` okunur. */
export function anahtarZinciri(kod: string, konum: number, sinir: number): { zincir: string[]; acilislar: number[] } {
  const zincir: string[] = [];
  const acilislar: number[] = [];
  let derinlik = 0;
  for (let i = konum - 1; i > sinir; i--) {
    const c = kod[i];
    if (c === '}' || c === ')' || c === ']') derinlik++;
    else if (c === '{' || c === '(' || c === '[') {
      if (derinlik > 0) { derinlik--; continue; }
      const onu = kod.slice(Math.max(sinir, i - 120), i);
      const m = /(\w+)\s*:\s*$/.exec(onu);
      zincir.unshift(m ? m[1] : c === '[' ? '(dizi)' : c === '(' ? '(çağrı)' : '(nesne)');
      acilislar.unshift(i);
    }
  }
  return { zincir, acilislar };
}

/* Modeli değiştirmeyen anahtarlar: mantık bağlaçları, dizi/nesne/parantez
   sarmalayıcıları (`...(k ? { NOT: … } : {})` gibi ifadeler) ve ilişki
   niceleyicileri. */
const SAYDAM = new Set(['AND', 'OR', 'NOT', '(nesne)', '(dizi)', '(çağrı)', 'some', 'every', 'none', 'is', 'isNot']);

/** Anahtar zincirini şemada yürütür: ilişki alanı modeli değiştirir,
    skaler alan zinciri bitirir. */
export function zinciriCoz(
  sema: Map<string, SemaModel>, model: string, zincir: readonly string[],
): { model: string; alan: SemaAlan | null; sorun: string | null } {
  let m = sema.get(model);
  if (!m) return { model, alan: null, sorun: `model şemada yok: ${model}` };
  for (const k of zincir) {
    if (SAYDAM.has(k)) continue;
    const a = m.alanlar.get(k);
    if (!a) return { model: m.ad, alan: null, sorun: `\`${k}\` ${m.ad} modelinde yok` };
    if (a.iliski) { m = sema.get(a.tip)!; continue; }
    return { model: m.ad, alan: a, sorun: null };
  }
  return { model: m.ad, alan: null, sorun: 'zincir skaler alana ulaşmadı' };
}

export type Tur = 'not' | 'notIn' | 'NOT' | 'sql';
export type Karar = 'guvenli' | 'beyan';
export type Bulgu = {
  dosya: string; satir: number; tur: Tur;
  /** çağrıdan çözülen model; çağrı dışı parça ya da SQL için null */
  model: string | null;
  alan: string | null;
  karar: Karar;
  sebep: string;
};

function satirNo(metin: string, konum: number): number {
  let s = 1;
  for (let i = 0; i < konum && i < metin.length; i++) if (metin[i] === '\n') s++;
  return s;
}

/** Aynı `where` içinde ve AYNI ilişki yolunda NULL'un açıkça ele alınıp
    alınmadığı: `alan: null` (dâhil etme) ya da `alan: { not: null }` /
    `NOT: { alan: null }` (bilerek dışlama). Yol ölçütü şarttır — kökteki
    `durum: { not: 'x' }` yüklemini `bulgu: { durum: null }` temizlemez;
    ikisi başka tablonun kolonudur (ölçüldü: inceleme bulgusu, PR #41).
    Mantık dalı (AND/OR/NOT) ve niceleyici (some/every/none) yolu
    değiştirmez: hangi dalda olduğu değil, hangi kolon olduğu sayılır. */
export function nullAcikcaEleAlinmis(kod: string, whereAc: number, yol: readonly string[], alan: string): boolean {
  const metin = kod.slice(whereAc, esKapanis(kod, whereAc) + 1);
  const kalip = new RegExp(`\\b${alan}\\s*:\\s*(?:null\\b|\\{\\s*not\\s*:\\s*null\\b)`, 'g');
  for (const m of metin.matchAll(kalip)) {
    const { zincir } = anahtarZinciri(kod, whereAc + m.index!, whereAc);
    const adayYol = zincir.filter((k) => !SAYDAM.has(k));
    if (adayYol.length === yol.length && adayYol.every((k, i) => k === yol[i])) return true;
  }
  return false;
}

const NULL_DEGER = /^\s*null\b/;

/** Tek dosyanın ham metnini tarar. `dosya` yalnız bulgu künyesi içindir. */
export function dosyayiTara(dosya: string, ham: string, sema: Map<string, SemaModel>): Bulgu[] {
  const bulgular: Bulgu[] = [];
  if (dosya.endsWith('.sql')) {
    ham.split('\n').forEach((satir, i) => {
      // tırnaklı dize içindeki `!=` yüklem değildir (göç, JSON sabiti yazıyor olabilir)
      const kodSatiri = satir.replace(/--.*$/, '').replace(/'(?:[^']|'')*'/g, "''");
      if (/\bNOT\s+IN\b|<>|!=/i.test(kodSatiri)) {
        bulgular.push({ dosya, satir: i + 1, tur: 'sql', model: null, alan: null, karar: 'beyan',
          sebep: 'ham SQL olumsuz yüklem — kolonun NULL hâli sütun adıyla beyan ister' });
      }
    });
    return bulgular;
  }

  const kod = kodMaskele(ham);
  const kapsamlar = cagrilar(kod, sema);
  const kapsayan = (konum: number) => kapsamlar.find((c) => konum > c.bas && konum < c.son) ?? null;

  const ekle = (b: Bulgu | null) => { if (b) bulgular.push(b); };
  const karar = (tur: Tur, konum: number, cagri: Cagri | null, zincirTamami: string[], acilislar: number[],
    hedefNull: boolean): Bulgu | null => {
    const satir = satirNo(ham, konum);
    const alanAdi = zincirTamami[zincirTamami.length - 1] ?? null;
    if (hedefNull) {
      return { dosya, satir, tur, model: cagri?.model ?? null, alan: alanAdi, karar: 'guvenli',
        sebep: 'olumsuzlanan değer NULL\'un kendisi (IS NOT NULL)' };
    }
    if (!cagri) {
      return { dosya, satir, tur, model: null, alan: alanAdi, karar: 'beyan',
        sebep: 'çağrı bağlamı dışında kurulan filtre parçası — model statik çözülemedi' };
    }
    if (!cagri.model) {
      return { dosya, satir, tur, model: null, alan: alanAdi, karar: 'beyan',
        sebep: `\`${cagri.ozellik}\` şemada model değil` };
    }
    const kok = zincirTamami[0];
    // `data` / `select` / `create` nesnesindeki `not:` yüklem değil, alandır (Türkçe "not") — bulgu yok
    if (kok !== 'where' && kok !== 'having') return null;
    const cozum = zinciriCoz(sema, cagri.model, zincirTamami.slice(1));
    if (!cozum.alan) {
      return { dosya, satir, tur, model: cozum.model, alan: alanAdi, karar: 'beyan', sebep: cozum.sorun ?? 'çözülemedi' };
    }
    if (cozum.alan.iliski) {
      return { dosya, satir, tur, model: cozum.model, alan: cozum.alan.ad, karar: 'beyan',
        sebep: 'ilişki olumsuzlaması — bağı olmayan satır da "olumsuz" sayılır, yokluk semantiği beyan ister' };
    }
    if (!cozum.alan.nullable) {
      return { dosya, satir, tur, model: cozum.model, alan: cozum.alan.ad, karar: 'guvenli',
        sebep: `${cozum.model}.${cozum.alan.ad} NOT NULL` };
    }
    const whereAc = acilislar[0];
    // yüklemin ilişki yolu: `where` ve alanın kendisi hariç, mantık/niceleyici anahtarları atılmış
    const yol = zincirTamami.slice(1, -1).filter((k) => !SAYDAM.has(k));
    if (nullAcikcaEleAlinmis(kod, whereAc, yol, cozum.alan.ad)) {
      return { dosya, satir, tur, model: cozum.model, alan: cozum.alan.ad, karar: 'guvenli',
        sebep: `${cozum.model}.${cozum.alan.ad} nullable; NULL aynı where içinde açıkça ele alınmış` };
    }
    return { dosya, satir, tur, model: cozum.model, alan: cozum.alan.ad, karar: 'beyan',
      sebep: `${cozum.model}.${cozum.alan.ad} NULLABLE ve NULL ele alınmamış — NULL satır sessizce düşer` };
  };

  // x: { not: v } · x: { notIn: [...] }
  for (const m of kod.matchAll(/\b(not|notIn)\s*:/g)) {
    const tur = m[1] as Tur;
    const konum = m.index!;
    const cagri = kapsayan(konum);
    const sinir = cagri ? cagri.bas : Math.max(0, konum - 4000);
    const { zincir, acilislar } = argumanKokuAt(anahtarZinciri(kod, konum, sinir), !!cagri);
    const hedefNull = NULL_DEGER.test(kod.slice(konum + m[0].length, konum + m[0].length + 12));
    if (!cagri) {
      /* Çağrı dışında yalnız SÜZGEÇ PARÇASI sayılır: `alan: { not: … }`
         biçimi VE parçayı taşıyan `const X = {` dosyada başka yerde
         kullanılıyor. Veri nesnesindeki `not:` (Türkçe "not", tohum
         yapılandırması) sayılmaz. */
      const onu = kod.slice(Math.max(0, konum - 60), konum);
      if (!/\w+\s*:\s*\{\s*$/.test(onu)) continue;
      if (!parcaKullaniliyor(kod, acilislar, 2)) continue;
      ekle(karar(tur, konum, null, zincir.slice(-1), acilislar, hedefNull));
      continue;
    }
    if (zincir.length === 0) continue;
    ekle(karar(tur, konum, cagri, zincir, acilislar, hedefNull));
  }

  // NOT: { a: v, b: null } · NOT: fn(...)
  for (const m of kod.matchAll(/\bNOT\s*:/g)) {
    const konum = m.index!;
    const cagri = kapsayan(konum);
    const sinir = cagri ? cagri.bas : Math.max(0, konum - 4000);
    const { zincir, acilislar } = argumanKokuAt(anahtarZinciri(kod, konum, sinir), !!cagri);
    if (!cagri && !parcaKullaniliyor(kod, acilislar, 1)) continue;
    const sonra = konum + m[0].length;
    const acik = kod.slice(sonra).search(/\S/);
    const ilk = kod[sonra + acik];
    if (ilk !== '{') {
      bulgular.push({ dosya, satir: satirNo(ham, konum), tur: 'NOT', model: cagri?.model ?? null, alan: null,
        karar: 'beyan', sebep: 'NOT ifadesi statik nesne değil (çağrı/yayma) — olumsuzlanan alanlar beyan ister' });
      continue;
    }
    const nesneAc = sonra + acik;
    const nesne = kod.slice(nesneAc + 1, esKapanis(kod, nesneAc));
    // birinci derinlikteki anahtarlar
    let derinlik = 0; const anahtarlar: { ad: string; hedefNull: boolean }[] = [];
    for (let i = 0; i < nesne.length; i++) {
      const c = nesne[i];
      if (c === '{' || c === '[' || c === '(') derinlik++;
      else if (c === '}' || c === ']' || c === ')') derinlik--;
      else if (derinlik === 0) {
        const km = /^(\w+)\s*:/.exec(nesne.slice(i));
        if (km && (i === 0 || /[\s,{]/.test(nesne[i - 1]))) {
          anahtarlar.push({ ad: km[1], hedefNull: NULL_DEGER.test(nesne.slice(i + km[0].length, i + km[0].length + 12)) });
          i += km[0].length - 1;
        }
      }
    }
    if (anahtarlar.length === 0) {
      bulgular.push({ dosya, satir: satinNoGuvenli(ham, konum), tur: 'NOT', model: cagri?.model ?? null, alan: null,
        karar: 'beyan', sebep: 'NOT nesnesinde anahtar bulunamadı (yayma?) — beyan ister' });
      continue;
    }
    for (const a of anahtarlar) {
      ekle(karar('NOT', konum, cagri, [...zincir, a.ad], acilislar, a.hedefNull));
    }
  }

  // rel: { isNot: … } — ilişki olumsuzlaması; `isNot: null` = bağ VAR (güvenli)
  for (const m of kod.matchAll(/\bisNot\s*:/g)) {
    const konum = m.index!;
    const cagri = kapsayan(konum);
    const hedefNull = NULL_DEGER.test(kod.slice(konum + m[0].length, konum + m[0].length + 12));
    const { zincir } = argumanKokuAt(
      anahtarZinciri(kod, konum, cagri ? cagri.bas : Math.max(0, konum - 4000)), !!cagri);
    bulgular.push({ dosya, satir: satirNo(ham, konum), tur: 'NOT', model: cagri?.model ?? null,
      alan: zincir[zincir.length - 1] ?? null,
      karar: hedefNull ? 'guvenli' : 'beyan',
      sebep: hedefNull ? 'isNot: null — bağın varlığı (IS NOT NULL)'
        : 'ilişki olumsuzlaması (isNot) — bağı olmayan satır da "olumsuz" sayılır, beyan ister' });
  }

  // ham SQL: $queryRaw` … ` · $executeRaw · better-sqlite3 prepare(" … ") / db.exec(" … ")
  for (const m of ham.matchAll(/\$(?:queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe)\b|\.prepare\s*\(|\bdb\.exec\s*\(/g)) {
    const parca = ham.slice(m.index!, m.index! + 1500);
    const son = parca.search(/`\s*[;,)]|`\)|\)\s*;|\n\s*\n/);
    const sql = son > 0 ? parca.slice(0, son) : parca;
    if (/\bNOT\s+IN\b|<>|!=/i.test(sql)) {
      bulgular.push({ dosya, satir: satirNo(ham, m.index!), tur: 'sql', model: null, alan: null, karar: 'beyan',
        sebep: 'ham SQL olumsuz yüklem — kolonun NULL hâli beyan ister' });
    }
  }
  return bulgular;
}

function satinNoGuvenli(ham: string, konum: number): number { return satirNo(ham, konum); }

/** Çağrı içindeyse en dıştaki `(nesne)` çağrının argüman nesnesidir, anahtar değil. */
function argumanKokuAt(
  z: { zincir: string[]; acilislar: number[] }, cagriIcinde: boolean,
): { zincir: string[]; acilislar: number[] } {
  if (cagriIcinde && z.zincir[0] === '(nesne)') return { zincir: z.zincir.slice(1), acilislar: z.acilislar.slice(1) };
  return z;
}

/** Çağrı dışı SÜZGEÇ PARÇASI: olumsuzlamayı doğrudan taşıyan nesne
    (`derinlik` 2 = `const k = { alan: { not } }`, 1 = `const k = { NOT: {…} }`)
    bir `const AD = {` bağlamış ve AD dosyada başka yerde de geçiyor.
    Daha derindeki bir sabit (tohum dizisi içindeki yapılandırma nesnesi)
    süzgeç değildir; oradaki `not:` Türkçe nottur. */
function parcaKullaniliyor(kod: string, acilislar: number[], derinlik: 1 | 2): boolean {
  const ac = acilislar[acilislar.length - derinlik];
  if (ac === undefined) return false;
  const onu = kod.slice(Math.max(0, ac - 160), ac);
  const m = /(?:const|let)\s+(\w+)\s*(?::[^=]*)?=\s*$/.exec(onu);
  if (!m) return false;
  const adet = (kod.match(new RegExp(`\\b${m[1]}\\b`, 'g')) ?? []).length;
  return adet >= 2;
}

const KOKLER = ['app', 'components', 'lib', 'arac', 'prisma'] as const;
const UZANTI = /\.(ts|tsx|mjs|sql)$/;

export function* kaynakDosyalari(kok: string): Generator<string> {
  for (const e of readdirSync(kok, { withFileTypes: true })) {
    const p = path.join(kok, e.name);
    if (e.isDirectory()) {
      if (e.name === 'prisma-client' || e.name === 'node_modules') continue;
      yield* kaynakDosyalari(p);
    } else if (UZANTI.test(e.name)) yield p;
  }
}

/** Taranan üretim kaynakları: app · components · lib · arac · prisma (göç SQL'i dâhil). */
export function taranacakKaynaklar(): string[] {
  return KOKLER.flatMap((k) => [...kaynakDosyalari(k)]);
}

export function depoyuTara(sema: Map<string, SemaModel>): { dosyalar: number; cagrilar: number; bulgular: Bulgu[] } {
  const dosyalar = taranacakKaynaklar();
  let cagriSayisi = 0;
  const bulgular: Bulgu[] = [];
  for (const d of dosyalar) {
    const ham = readFileSync(d, 'utf8');
    if (!d.endsWith('.sql')) cagriSayisi += cagrilar(kodMaskele(ham), sema).length;
    bulgular.push(...dosyayiTara(d, ham, sema));
  }
  return { dosyalar: dosyalar.length, cagrilar: cagriSayisi, bulgular };
}

/** Beyan satırı — izin listesi biçimi. */
export type IzinSatiri = {
  dosya: string; tur: Tur; alan: string | null;
  /** çağrı dışı parça için insan beyanı: hangi modelin alanı */
  model?: string;
  sinif: 'kalici' | 'ertelenmis'; gerekce: string; kapanis?: string;
};

export const bulguAnahtari = (b: { dosya: string; tur: Tur; alan: string | null }) => `${b.dosya}|${b.tur}|${b.alan ?? '-'}`;
