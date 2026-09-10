import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { cumleMetni, nedenSoyluyor, ozellik, turet } from '../../arac/bos-durum-kutugu.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   BOŞ DURUM İKİ ÖLÇÜTÜ KARŞILAR · BEKÇİ [SIS-BSD-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Kurulum provası (10 Eyl 2026): paket kurulduktan sonra `/regulasyonlar`
   sekiz çerçevenin sekizi için de "kataloğu henüz yüklenmedi" diyordu ve
   veritabanında 3 803 madde TASLAKTA bekliyordu. Cümle tek yan tümceydi,
   sebebi söylemiyordu; önerdiği eylem de kullanıcıyı ZATEN YÜKLÜ
   kataloğu ikinci kez yazmaya götürüyordu. Aynı sınıf `/tesisler`te de
   duruyordu: "tesis yok" diyor, tesisin nerede açıldığını söylemiyordu.

   ── İKİ ÖLÇÜT ─────────────────────────────────────────────────────────
   a · NEDEN boş — cümle "X yok" demekle kalmaz; en az iki yan tümceyle
       sebebini ya da sonucunu söyler.
   b · NE YAPMALIYIM — `eylem` verilmiştir. İSTİSNASI iyi haber boş
       durumudur ("elenen satır yok — hepsi geçti"): işaret edeceği bir
       çözüm yoktur ve olmayan bir eylem uydurmak kullanıcıyı gereksiz
       bir yola sokar. Bayrak bileşenin kendi API'sinden gelir
       (`BosIlk iyiHaber`), kütükten değil — elle işaretlenemez.

   ── SINIR AÇIKÇA YAZILIDIR ────────────────────────────────────────────
   Kapı cümlenin bir şey SÖYLEDİĞİNİ ölçer, söylediğinin DOĞRU olduğunu
   değil — R-D ve R-F'te kabul edilmiş aynı sınır.
   ═══════════════════════════════════════════════════════════════════════ */

const KUTUK = path.join(process.cwd(), 'arac', 'bos-durumlar.json');
type Satir = {
  yer: string; satir: number; cumle: string;
  iyiHaber: boolean; neden: boolean; eylem: boolean;
};
type Kutuk = {
  tavanlar: { nedensiz: number; eylemsiz: number };
  tavanGerekceleri?: { alan: string; eski: number; yeni: number; gerekce: string }[];
  istisnalar?: { yer: string; cumle: string; sebep: string; olcum: { dosya: string; vaka: string } }[];
  satirlar: Satir[];
};
const kutuk = JSON.parse(readFileSync(KUTUK, 'utf8')) as Kutuk;
const bulunan = turet() as Satir[];
const anahtar = (s: { yer: string; cumle: string }) => `${s.yer} :: ${s.cumle}`;

describe('boş durum KÜTÜKTE [SIS-BSD-001]', () => {
  it('TÜRETME boş değil — kalıp bozulursa bekçi her şeyi geçirirdi [SIS-BSD-001]', () => {
    /* Sıfır ölçümle "kusur yok" demek hiçbir şeye bakmadan temiz
       raporlamaktır; bu depoda sayı kapısı tam bu şekilde kandırıldı. */
    expect(bulunan.length).toBeGreaterThanOrEqual(50);
  });

  it('KODDAKİ her boş durum kütükte VAR [SIS-BSD-001]', () => {
    const kutuktekiler = new Set(kutuk.satirlar.map(anahtar));
    const eksik = bulunan.filter((b) => !kutuktekiler.has(anahtar(b))).map(anahtar);
    expect(eksik, `kütüğe girmemiş boş durum:\n${eksik.join('\n')}\n`
      + 'çözüm: node arac/bos-durum-kutugu.mjs --yaz').toEqual([]);
  });

  it('KÜTÜKTEKİ her satır kodda VAR — ölü satır kalmaz [SIS-BSD-001]', () => {
    const koddakiler = new Set(bulunan.map(anahtar));
    const olu = kutuk.satirlar.filter((s) => !koddakiler.has(anahtar(s))).map(anahtar);
    expect(olu, `kodda olmayan kütük satırı:\n${olu.join('\n')}`).toEqual([]);
  });

  it('KÜTÜK ÖLÇÜMÜ elle yazılmaz — türetilenle BİREBİR [SIS-BSD-001]', () => {
    /* Ölçüt elle verilseydi bir satıra "neden: true" yazıp kapıdan
       geçmek mümkün olurdu; cırcırın anlamı buharlaşırdı. */
    const kusur: string[] = [];
    const kutuktekiler = new Map(kutuk.satirlar.map((s) => [anahtar(s), s]));
    for (const b of bulunan) {
      const k = kutuktekiler.get(anahtar(b));
      if (!k) continue;
      if (k.neden !== b.neden) kusur.push(`${anahtar(b)}: neden kütükte ${k.neden}, türetilen ${b.neden}`);
      if (k.eylem !== b.eylem) kusur.push(`${anahtar(b)}: eylem kütükte ${k.eylem}, türetilen ${b.eylem}`);
      if (k.iyiHaber !== b.iyiHaber) kusur.push(`${anahtar(b)}: iyiHaber ayrışmış`);
    }
    expect(kusur, kusur.join('\n')).toEqual([]);
  });
});

describe('İKİ ÖLÇÜT ve CIRCIR [SIS-BSD-001]', () => {
  const nedensiz = bulunan.filter((b) => !b.neden);
  const eylemsiz = bulunan.filter((b) => !b.eylem);

  it('EYLEMSİZ boş durum SIFIRDIR — iyi haber dışında istisna yok [SIS-BSD-001]', () => {
    /* Eylemsiz bir boş durum kullanıcıyı ekranda bırakır. İyi haber
       durumu bu sayıya girmez ve bu bir kaçış kapısı değil, ölçütün
       kendisidir. */
    expect(eylemsiz.map(anahtar), `eylemsiz boş durum:\n${eylemsiz.map(anahtar).join('\n')}`)
      .toEqual([]);
    expect(kutuk.tavanlar.eylemsiz, 'eylemsiz tavanı sıfır olmalı').toBe(0);
  });

  it('NEDENSİZ SAYISI TAVANI AŞMAZ — cırcır yalnız küçülür [SIS-BSD-001]', () => {
    expect(nedensiz.length,
      `nedensiz boş durum ${nedensiz.length}, tavan ${kutuk.tavanlar.nedensiz}:\n`
      + nedensiz.map(anahtar).join('\n')).toBeLessThanOrEqual(kutuk.tavanlar.nedensiz);
  });

  it('TAVAN ölçülenin ÜSTÜNDE tutulmaz — gevşeklik dişi [SIS-BSD-001]', () => {
    expect(kutuk.tavanlar.nedensiz).toBe(nedensiz.length);
  });

  it('KALAN NEDENSİZ satır BEYANLIDIR ve ölçümü GERÇEKTİR [SIS-BSD-001]', () => {
    /* Türetici JSX metin sabitini okur; çağrılan bir fonksiyonun
       döndürdüğü cümleyi okuyamaz. Bu türeticinin SINIRIDIR ve sınır
       beyanla taşınır: istisna hangi dosyada hangi vakayla ölçüldüğünü
       söyler, ölü referans kabul edilmez. */
    const istisnalar = kutuk.istisnalar ?? [];
    const kusur: string[] = [];
    for (const n of nedensiz) {
      const i = istisnalar.find((x) => x.yer === n.yer && x.cumle === n.cumle);
      if (!i) { kusur.push(`beyansız nedensiz boş durum: ${anahtar(n)}`); continue; }
      if ((i.sebep ?? '').trim().length < 40) kusur.push(`${anahtar(n)}: sebep kusuru anlatmıyor`);
      const yol = path.join(process.cwd(), i.olcum.dosya);
      if (!existsSync(yol)) { kusur.push(`${anahtar(n)}: ölçüm dosyası yok — ${i.olcum.dosya}`); continue; }
      if (!readFileSync(yol, 'utf8').includes(i.olcum.vaka)) {
        kusur.push(`${anahtar(n)}: ölçüm vakası yok — "${i.olcum.vaka}"`);
      }
    }
    /* Ölü istisna da kırmızıdır: düzelen bir satır listede kalmaz. */
    for (const i of istisnalar) {
      if (!nedensiz.some((n) => n.yer === i.yer && n.cumle === i.cumle)) {
        kusur.push(`ölü istisna: ${i.yer} :: ${i.cumle}`);
      }
    }
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('TABAN DAL CIRCIRI: nedensiz sayısı tabana göre BÜYÜYEMEZ [SIS-BSD-001]', () => {
    /* Tavan dosyanın kendi içinde tutarlı olabilir ve yine de gevşemiş
       olabilir: satır eklenir, tavan da onunla yükselir. Karşılaştırma
       TABAN DALDAN yapılır. Üç hâl ayrı okunur ve ikisi kırmızı DEĞİLDİR. */
    const git = (a: string[]) => execFileSync('git', a,
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    let tabanDalVar = true;
    try { git(['rev-parse', '--verify', 'origin/main']); } catch { tabanDalVar = false; }
    if (!tabanDalVar) {
      expect(process.env.CI ?? '', "CI'da taban dal okunamadı — cırcır ölçülemedi").toBe('');
      return;
    }
    let taban: Kutuk | null = null;
    try {
      taban = JSON.parse(git(['show', 'origin/main:web/arac/bos-durumlar.json']));
    } catch { taban = null; }
    if (taban === null) return; /* kütüğü GETİREN dal */
    expect(nedensiz.length,
      `nedensiz ${taban.tavanlar.nedensiz} → ${nedensiz.length}: liste YALNIZ küçülebilir`)
      .toBeLessThanOrEqual(taban.tavanlar.nedensiz);
    expect(eylemsiz.length).toBeLessThanOrEqual(taban.tavanlar.eylemsiz);
  });
});

describe('ÖLÇÜTÜN KENDİ YÜRÜYÜŞÜ [SIS-BSD-001]', () => {
  it('TEK TÜMCE sebebi söylemez — provanın kusuru [SIS-BSD-001]', () => {
    /* Kapının var oluş sebebi olan cümlenin kendisi. */
    expect(nedenSoyluyor('EPDK-SGYM-EK3 kataloğu henüz yüklenmedi.')).toBe(false);
    expect(nedenSoyluyor('Kapsamınızda risk kaydı yok.')).toBe(false);
    expect(nedenSoyluyor('Tanımlı eğitim yok.')).toBe(false);
  });

  it('İKİ TÜMCE sebebi söyler [SIS-BSD-001]', () => {
    expect(nedenSoyluyor('Değerlendirme aktarımı kaydı yok. Bir kuru koşu, hiçbir '
      + 'değerlendirmeye dokunmadan ne olacağını hesaplar.')).toBe(true);
    expect(nedenSoyluyor('Kataloğu YÜKLÜ: 578 madde taslak sürümünde ve aktifleştirme '
      + 'bekliyor. Aktifleştirme insan kararıdır.')).toBe(true);
  });

  it('KISALTMA tümce ayırmaz — yanlış pozitif üretmez [SIS-BSD-001]', () => {
    /* İlk yazımda ayırıcının geriye bakışı TERSİNE çalışıyordu ve
       sebebini SÖYLEYEN cümleler de "neden yok" sayılıyordu (ölçüldü:
       47 yanlış pozitif). Kısaltma dişi o düzeltmenin bekçisidir. */
    expect(nedenSoyluyor('6698 s. md. 13 uyarınca kayıt yok.')).toBe(false);
    expect(nedenSoyluyor('Kayıt yok (bkz. KURULUM.md).')).toBe(false);
  });

  it('ŞABLON YERİ tümce ayırmaz [SIS-BSD-001]', () => {
    /* `${terim('tesis')}` içindeki nokta bir tümce sonu değildir. */
    expect(nedenSoyluyor('${a.b.c} kaydı yok.')).toBe(false);
  });

  it('ÖZNİTELİK okuyucu DENGELİ okur — iç içe süslü parantez kesmez [SIS-BSD-001]', () => {
    const govde = '<BosIlk cumle={a ? `x ${f({ y: 1 })}` : "z"} eylem={<A b={1} />} />';
    expect(ozellik(govde, 'eylem')).toContain('<A b={1} />');
    expect(cumleMetni(ozellik(govde, 'cumle'))).toContain('x ${f({ y: 1 })}');
  });
});
