import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  SINIFLAR, bosFiltreSatiri, cumleMetni, dosyalar, ifadeSecim, nedenSoyluyor,
  ozellik, satirIciBul, satirIciEylem, satirIciKaydi, satirIciMetin,
  sinifTavanlari, turet,
} from '../../arac/bos-durum-kutugu.mjs';
import { tabanKarari, tabanOku } from '../../arac/olcum-tabani.mjs';
import { ilkTurTavani, tabanDalKarari } from '../../arac/taban-dal.mjs';

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

   ── ÜÇ YÜZEY ─────────────────────────────────────────────────────────
   Bağımsız inceleme (PR #51, tur 1) türeticinin evrenin ~%62'sini
   görmediğini ölçtü: yalnız `<BosIlk>` taranıyordu, `<BosFiltre />` ve
   satır içi `className="bos"` metinleri kütükte HİÇ YOKTU. Bugün üçü de
   taranır ve tavanlar SINIF BAŞINA tutulur — tek toplam tavan, sıkı bir
   sınıfın borcunu gevşek bir sınıfın düzelmesiyle takas ettirirdi.

   ── SINIR AÇIKÇA YAZILIDIR ────────────────────────────────────────────
   Kapı cümlenin bir şey SÖYLEDİĞİNİ ölçer, söylediğinin DOĞRU olduğunu
   değil — R-D ve R-F'te kabul edilmiş aynı sınır. Sınırın ucuzluğu da
   ölçülür: iki kelimelik bir kuyruk ölçütü GEÇER ve bunu söyleyen bir
   vaka aşağıda durur. Beyan ile ölçüm ayrışırsa kapı kırmızıdır.
   ═══════════════════════════════════════════════════════════════════════ */

const KUTUK = path.join(process.cwd(), 'arac', 'bos-durumlar.json');
type Satir = {
  yer: string; satir: number; tur: string; cumle: string;
  iyiHaber: boolean; neden: boolean; eylem: boolean;
};
type SinifTavani = { nedensiz: number; eylemsiz: number; iyiHaber: number };
type Kutuk = {
  tavanlar: SinifTavani;
  sinifTavanlari?: Record<string, SinifTavani>;
  tavanGerekceleri?: {
    alan: string; eski: number; yeni: number; gerekce: string;
    sahip?: string; kapanisAsamasi?: string;
  }[];
  istisnalar?: { yer: string; cumle: string; sebep: string; olcum: { dosya: string; vaka: string } }[];
  /* ELLE yazılan ilk tur tavanları — taban dal yokken cırcırın tavanı.
     Türeticinin yazdığı `tavanlar` bu işi göremez (P2-4). */
  ilkTurTavani?: Record<string, number>;
  ilkTurSinifTavanlari?: Record<string, SinifTavani>;
  satirlar: Satir[];
};
const kutuk = JSON.parse(readFileSync(KUTUK, 'utf8')) as Kutuk;
const bulunan = turet() as Satir[];
const anahtar = (s: { yer: string; cumle: string }) => `${s.yer} :: ${s.cumle}`;

describe('boş durum KÜTÜKTE [SIS-BSD-001]', () => {
  it('POPÜLASYON TABANI kütükten değil ÖLÇÜM TABANINDAN gelir [SIS-BSD-001]', () => {
    /* Sıfır ölçümle "kusur yok" demek hiçbir şeye bakmadan temiz
       raporlamaktır; bu depoda sayı kapısı tam bu şekilde kandırıldı.
       Taban testin İÇİNE sabit yazılırsa (eski hâl: 50, ölçülen 94)
       arada sessiz bir daralma penceresi kalır: 44 satır kaybolabilir
       ve hiçbir diş bunu görmez. Bu yüzden taban `olcum-tabani.json`dan
       okunur ve yalnız `--taban-yaz --sebep=` ile iner. */
    const hata = tabanKarari('bos.durum', bulunan.length, tabanOku().tabanlar);
    expect(hata, hata ?? '').toBeNull();
  });

  it('HER SATIR bir SINIF taşır — sınıfsız satır tavana giremez [SIS-BSD-001]', () => {
    const yabanci = bulunan.filter((b) => !SINIFLAR.includes(b.tur));
    expect(yabanci.map((b) => `${b.tur}: ${anahtar(b)}`), 'bilinmeyen yüzey sınıfı').toEqual([]);
    /* Üç yüzeyin ÜÇÜ de gerçekten bulunmalı: bir kalıp bozulursa o
       yüzey sessizce sıfırlanır ve kapı yine yeşil yanardı. */
    for (const s of SINIFLAR) {
      expect(bulunan.filter((b) => b.tur === s).length, `${s} yüzeyi hiç bulunamadı`)
        .toBeGreaterThan(0);
    }
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

  const olculenSinif = sinifTavanlari(bulunan) as Record<string, SinifTavani>;

  it('İLK KURULUM boşluğunda EYLEMSİZ SIFIRDIR — istisnası yalnız iyi haber [SIS-BSD-001]', () => {
    /* `BosIlk` ve `BosFiltre` EKRANIN yerine geçen boş durumlardır:
       kullanıcı orada başka hiçbir şey göremez ve eylemsiz bir boş
       durum onu ekranda bırakır. Tavan SIFIRDIR ve gerekçeli istisna
       kabul edilmez. İyi haber durumu bu sayıya girmez; bayrak
       bileşenin kendi API'sinden gelir, kütükten değil. */
    for (const s of ['BosIlk', 'BosFiltre']) {
      const k = eylemsiz.filter((b) => b.tur === s).map(anahtar);
      expect(k, `${s} · eylemsiz boş durum:\n${k.join('\n')}`).toEqual([]);
      expect(olculenSinif[s].eylemsiz, `${s} eylemsiz tavanı sıfır olmalı`).toBe(0);
    }
  });

  it('EYLEMSİZ SIFIRDA KİLİTLİ — HİÇBİR sınıf yeniden açılamaz [SIS-BSD-001]', () => {
    /* ── R0-21 KAPANDI (Brief L · faz 4) ──────────────────────────────
       Dolu bir ekranın İÇİNDEKİ bölüm notları (`satirIci`) eylemsiz
       kalmıştı ve tavanı ölçülen sayıya (12) sabitlenmişti. On ikisinin
       de çıkışı verildi; çözüm arketipiktir ve üç kuralı var:

         · ÇÖZÜM AYNI EKRANDAYSA eylem YERİNDEDİR — var olan formu açar
           ya da listeden ilk kaydı seçer. Gezinme bağı koymak kullanıcıyı
           çalıştığı ekrandan koparırdı.
         · ÇÖZÜM BAŞKA EKRANDAYSA bağ BAĞLAMI TAŞIR (varlık/tesis kimliği
           sorguda) — kullanıcı hangi kayıt için geldiğini orada ikinci
           kez aramaz.
         · YETKİSİ OLMAYANA ölü bir eylem gösterilmez; çıkış kapsamın
           görüldüğü yere gider.

       Bu diş kilidi mutlak yapar: ölçülen sayıya "eşit tavan" kuralı,
       sıfıra inmiş bir borcu 0'dan 1'e çıkaran bir satırı GEÇİRİRDİ —
       tavan da onunla 1 olurdu ve cırcır sessizce gevşerdi. Kilidi
       açmak bu dişi SİLMEYİ gerektirir. */
    const kalan = eylemsiz.map(anahtar);
    expect(kalan, `EYLEMSİZ boş durum — tavan SIFIRDA kilitli:\n${kalan.join('\n')}`)
      .toEqual([]);
    for (const s of SINIFLAR) {
      expect(olculenSinif[s].eylemsiz, `${s} eylemsiz tavanı sıfır olmalı`).toBe(0);
      expect(kutuk.sinifTavanlari?.[s]?.eylemsiz, `${s} eylemsiz tavanı kütükte sıfır değil`)
        .toBe(0);
    }
    /* Popülasyon dişi: kütük boşalırsa yukarıdaki her şey sıfır turda
       yeşil biterdi — "hiç boş durum yok" ile "hepsi eylemli" aynı
       görünür ve bu dişin var oluş sebebi buharlaşır. */
    expect(bulunan.length, 'boş durum kütüğü BOŞ — vaka hiçbir şey ölçmedi')
      .toBeGreaterThan(50);
  });

  it('SINIF TAVANLARI aşılmaz ve ölçülenin ÜSTÜNDE tutulmaz [SIS-BSD-001]', () => {
    /* TEK TOPLAM TAVAN YETMEZ: `BosIlk`e eylemsiz bir satır eklenir,
       `satirIci`den biri düzelir, toplam DEĞİŞMEZ ve en sıkı sınıf
       sessizce gevşer. Tavan sınıf başına tutulunca bu takas
       imkânsızdır. Tavan ölçülenin üstünde de tutulmaz — üstünde tutulan
       bir tavan, ilerideki bir gevşemeyi şimdiden onaylamaktır. */
    const beyan = kutuk.sinifTavanlari ?? {};
    const kusur: string[] = [];
    for (const s of SINIFLAR) {
      const b = beyan[s];
      if (!b) { kusur.push(`${s}: sınıf tavanı beyan edilmemiş`); continue; }
      for (const alan of ['nedensiz', 'eylemsiz', 'iyiHaber'] as const) {
        const olculen = olculenSinif[s][alan];
        if (olculen > (b[alan] ?? -1)) kusur.push(`${s}.${alan}: ölçülen ${olculen} > tavan ${b[alan]}`);
        if ((b[alan] ?? -1) > olculen) kusur.push(`${s}.${alan}: tavan ${b[alan]} ölçülenin (${olculen}) ÜSTÜNDE`);
      }
    }
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('SIFIR OLMAYAN her sınıf tavanı SAHİBİ ve KAPANIŞ AŞAMASIYLA beyanlı [SIS-BSD-001]', () => {
    /* "Süresiz beyan yoktur." Sıfırdan büyük bir tavan ERTELENMİŞ bir
       kırmızıdır; sahibi ve hangi aşamada kapanacağı yazılmadan
       duramaz. Gerekçe KUSURU anlatır: düzeltmenin maliyetini anlatan
       bir cümle gerekçe değildir. */
    const gerekceler = kutuk.tavanGerekceleri ?? [];
    const kusur: string[] = [];
    for (const s of SINIFLAR) {
      for (const alan of ['nedensiz', 'eylemsiz'] as const) {
        const deger = olculenSinif[s][alan];
        const g = gerekceler.find((x) => x.alan === `${s}.${alan}`);
        if (deger === 0) {
          if (g) kusur.push(`${s}.${alan}: tavan sıfır ama gerekçe duruyor — ölü beyan`);
          continue;
        }
        if (!g) { kusur.push(`${s}.${alan} = ${deger}: BEYANSIZ tavan`); continue; }
        if (g.yeni !== deger) kusur.push(`${s}.${alan}: gerekçe ${g.yeni} diyor, ölçülen ${deger}`);
        if (!(g.sahip ?? '').trim()) kusur.push(`${s}.${alan}: SAHİPSİZ erteleme`);
        if (!(g.kapanisAsamasi ?? '').trim()) kusur.push(`${s}.${alan}: AŞAMASIZ erteleme`);
        if ((g.gerekce ?? '').trim().length < 40) kusur.push(`${s}.${alan}: gerekçe kusuru anlatmıyor`);
      }
    }
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('TOPLAM TAVAN ölçülenle BİREBİR — özet sayı da elle yazılmaz [SIS-BSD-001]', () => {
    expect(kutuk.tavanlar.nedensiz).toBe(nedensiz.length);
    expect(kutuk.tavanlar.eylemsiz).toBe(eylemsiz.length);
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
    /* ── ÜÇ HÂL AYRI OKUNUR ────────────────────────────────────────────
       Tek bir `catch` üç ayrı hâli tek yere toplardı ve üçünde de vaka
       YEŞİL dönerdi (bağımsız inceleme, PR #51 tur 1): dosya tabanda
       YOK (bu kütüğü getiren dalda doğru) · `git show` düştü · JSON
       bozuk. Son ikisi "temiz" değildir: kütük elle bozulursa ya da
       sığ bir çekimde blob okunamazsa cırcır HİÇ KOŞMAZ ve dosya kendi
       içinde tutarlı olduğu için öbür dişler yeşil kalır. Deponun
       dördüncü dişi ("taban dal okunamazsa KIRMIZI") burada da işler. */
    const YOL = 'origin/main:web/arac/bos-durumlar.json';
    let tabandaVar = true;
    try { git(['cat-file', '-e', YOL]); } catch { tabandaVar = false; }
    let ham: string | null = null;
    if (tabandaVar) { try { ham = git(['show', YOL]); } catch { ham = null; } }
    /* KARAR SAF FONKSİYONDA (`arac/taban-dal.mjs`): bu dalda "dosya var
       ama okunamadı" hâli kurulamaz (kütüğü GETİREN dal), yani karar
       burada sınanamaz — sentetik vakaları aşağıda. */
    const karar = tabanDalKarari(tabandaVar, ham);
    if (karar.hal === 'olculemedi') {
      expect(process.env.CI ?? '',
        `TABAN DAL ÖLÇÜLEMEDİ (${karar.sebep}) — cırcır koşmadı`).toBe('');
      return;
    }
    /* ── SESSİZ `return` KALDIRILDI (düzeltme turu · tur 2 · P2-4) ─────
       Bu bir SAYI cırcırıdır: taban yoksa karşılaştırılacak bir sayı da
       yoktur ve sessizce dönmek cırcırın HİÇ koşmaması demekti. Kütüğün
       KENDİ `tavanlar` alanına düşmek çözüm DEĞİLDİR — onu türetici
       yazar, yani kütük kendini kendisiyle karşılaştırır ve her zaman
       geçer. Tavan ELLE beyan edilir (`ilkTurTavani`), beyansızsa
       KIRMIZIDIR. Hâl bugün bu kütük için ULAŞILAMAZ (dosya taban dalda
       VAR) ve kural yine de yazılıdır: dosyanın adı değiştiği gün
       ulaşılır olur ve o gün sessizce yeşil yanmaz. */
    const taban: Kutuk = karar.hal === 'taban_yok'
      ? (() => {
        const alanlar = ['nedensiz', 'eylemsiz'] as const;
        const beyan = kutuk.ilkTurTavani ?? {};
        const tavanlar = {} as Kutuk['tavanlar'];
        for (const alan of alanlar) {
          const k = ilkTurTavani((beyan as Record<string, number>)[alan], alan);
          expect('hata' in k ? k.hata : null, 'hata' in k ? k.hata : '').toBeNull();
          tavanlar[alan] = (k as { tavan: number }).tavan;
        }
        return { ...kutuk, tavanlar, sinifTavanlari: kutuk.ilkTurSinifTavanlari ?? {} } as Kutuk;
      })()
      : karar.belge as Kutuk;
    expect(nedensiz.length,
      `nedensiz ${taban.tavanlar.nedensiz} → ${nedensiz.length}: liste YALNIZ küçülebilir`)
      .toBeLessThanOrEqual(taban.tavanlar.nedensiz);
    expect(eylemsiz.length).toBeLessThanOrEqual(taban.tavanlar.eylemsiz);
    /* SINIF BAŞINA da küçülür: toplam düşerken bir sınıf gevşeyemez. */
    const tabanSinif = taban.sinifTavanlari ?? {};
    for (const s of SINIFLAR) {
      /* YENİ SINIF MUAF DEĞİLDİR. Eski hâl `if (!t) continue` diyordu ve
         sınıf tavanının kapatmak için yazıldığı takası yeni sınıf
         üzerinden geri açıyordu (bağımsız inceleme, PR #51 tur 2): on
         bir eylemsiz satır yeni bir `tur`a taşınır, eski sınıf 11 → 0
         iner (cırcır mutlu), yeni sınıf muaf. Bugün tabanda olmayan bir
         sınıfın tavanı SIFIR varsayılır — R-F ekinin "yeni satırın
         varsayılanı ölçülüdür" kuralının bu kütükteki karşılığı. */
      const t = tabanSinif[s] ?? { nedensiz: 0, eylemsiz: 0, iyiHaber: 0 };
      for (const alan of ['nedensiz', 'eylemsiz', 'iyiHaber'] as const) {
        /* ── YÜKSELME DOSYADA GEREKÇE İSTER (beşinci dişin bu kütükteki
           karşılığı · düzeltme turu) ────────────────────────────────────
           Eski hâl HİÇBİR yükselmeye izin vermiyordu ve bu, türeticinin
           GENİŞLEMESİNİ cezalandırıyordu: dördüncü yüzey açılınca kütüğe
           giren İYİ HABER boşlukları tavanı büyütür ve kapı kırmızı yanar
           — yani "körlüğü düzeltme" yolunu kapatır. Ölçüldü: satirIci
           iyiHaber 3 → 8, hepsi `className="bos iyi"` ile KODDAN işaretli.

           Bugün yükselme mümkündür ama BEDAVA DEĞİL: `tavanGerekceleri`
           altında o yükselmeyi (`eski` → `yeni`) adıyla anlatan bir
           gerekçe ister. Gerekçesiz yükselme hâlâ KIRMIZIDIR ve gerekçe
           yükselmenin KENDİSİNİ anlatmalıdır (ölçülen değerle birebir). */
        const g = (kutuk.tavanGerekceleri ?? []).find((x) => x.alan === `${s}.${alan}`);
        const tabanDeger = t[alan] ?? 0;
        if (olculenSinif[s][alan] > tabanDeger && g
          && g.eski === tabanDeger && g.yeni === olculenSinif[s][alan]
          && (g.gerekce ?? '').trim().length >= 40) continue;
        expect(olculenSinif[s][alan],
          `${s}.${alan}: ${tabanDeger} → ${olculenSinif[s][alan]} — sınıf tavanı `
          + 'BÜYÜYEMEZ (gerekçesiz); `tavanGerekceleri` altında eski → yeni yazın'
          + (tabanSinif[s] ? '' : ' (sınıf tabanda YOK: varsayılan tavan SIFIR)'))
          .toBeLessThanOrEqual(t[alan] ?? 0);
      }
    }
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

  it('SINIR BEYANLIDIR: iki kelimelik kuyruk ölçütü GEÇER [SIS-BSD-001]', () => {
    /* Bağımsız inceleme (PR #51, tur 1) ölçütün ucuz olduğunu ölçtü ve
       haklıydı. UZUNLUK EŞİĞİ DENENDİ VE GERİ ALINDI: 16 karakterlik
       bir alt sınır, sebebini gerçekten söyleyen "…kaynak sistem yok —
       duruş ölçülmedi" satırını kırmızı yakıyordu ("duruş ölçülmedi" =
       15), oysa kaçamak ("Böyle işte" = 10) yalnız beş karakter
       aşağıdaydı — eşik doğru cümleyi cezalandırıp yanlışını
       durdurmuyordu.

       Bu vaka sınırın KENDİSİNİ ölçer. Beyan "iki kelimelik kuyruk
       geçer" diyorsa ölçüm de öyle demelidir; biri değişip öbürü
       kalırsa dosyadaki sınır cümlesi yalan olur. */
    expect(nedenSoyluyor('Tanımlı eğitim yok. Böyle işte.'), 'sınır beyanı ile ölçüm ayrışmış')
      .toBe(true);
    expect(nedenSoyluyor('Kayıt yok. Bilgi için yöneticinize danışın.')).toBe(true);
    /* Sınırın öbür yüzü: eşik olsaydı KIRMIZI yanacak olan doğru cümle. */
    expect(nedenSoyluyor('Bu varlığı besleyen kaynak sistem yok — duruş ölçülmedi.'))
      .toBe(true);
  });

  it('SATIR İÇİ yüzey okunur: gövde, metin ve EYLEM [SIS-BSD-001]', () => {
    const kod = '<div><p className="bos">Kayıt yok; bir varlık seçilmedi.</p>'
      + '<p className="bos iyi">Açık bulgu yok; bekleyen kayıt bulunmuyor.</p>'
      + '<p className="bos">Tesis yok. <Link href="/x">Tanımla →</Link></p></div>';
    const b = satirIciBul(kod);
    expect(b).toHaveLength(3);
    expect(b[1].sinif, 'iyi haber sınıfı okunmadı').toBe('bos iyi');
    expect(satirIciMetin(b[0].govde)).toBe('Kayıt yok; bir varlık seçilmedi.');
    expect(satirIciEylem(b[0].govde), 'eylemsiz gövdede eylem görüldü').toBe(false);
    expect(satirIciEylem(b[2].govde), 'gerçek bağ görülmedi').toBe(true);
    /* İç içe aynı etiket gövdeyi ERKEN KAPATMAZ. */
    const icIce = '<p className="bos">A <p>B</p> C</p>';
    expect(satirIciMetin(satirIciBul(icIce)[0].govde)).toBe('A B C');
  });

  it('İFADE: dize SEÇEN açılır, HESAPLAYAN "…" olur [SIS-BSD-001]', () => {
    /* `{secili ? 'bağlı kayıt yok' : 'kayıt yok'}` bir boş durum
       CÜMLESİDİR ve okunmalıdır; `{t(sozluk, 'tesis')}` bir terim
       yerleşimidir ve cümlenin parçası değildir. Ayrım yapısaldır. */
    expect(ifadeSecim("a ? 'x yok' : 'y yok'"), 'seçim ifadesi hesap sayıldı').toBe(true);
    expect(ifadeSecim("'tek dize'")).toBe(true);
    expect(ifadeSecim("t(sozluk, 'tesis')"), 'çağrı seçim sayıldı').toBe(false);
    expect(ifadeSecim('veri.sayi')).toBe(false);
    const hesap = '<p className="bos">{t(s, \'x\')} kaydı yok.</p>';
    expect(satirIciMetin(satirIciBul(hesap)[0].govde)).toBe('… kaydı yok.');
    const secim = '<p className="bos">{a ? \'X yok\' : \'Y yok\'}</p>';
    expect(satirIciMetin(satirIciBul(secim)[0].govde)).toBe('X yok Y yok');
  });

  it('TABAN YOKKEN SAYI CIRCIRI SESSİZCE GEÇMEZ — ilk tur tavanı ELLE beyanlıdır [SIS-TAB-002]', () => {
    /* ── ÖLÇÜLEN KUSUR (düzeltme turu · tur 2 · P2-4) ─────────────────
       Dört ayrı bekçi `taban_yok` hâlini tek satırla karşılıyordu:
       `if (karar.hal === 'taban_yok') return;` — sessiz bir `return`,
       cırcırın HİÇ KOŞMAMASIDIR. Hâl varsayımsal değildi:
       `dom-tanik-kutugu.json` bu dalda DOĞDU, yani tanık cırcırı tam da
       tanığı getiren turda hiçbir şey ölçmüyordu.

       Beyanın ELLE olması kuralın kendisidir: türeticinin yazdığı
       `tavanlar` alanına düşmek, kütüğü kendisiyle karşılaştırmak olurdu
       ve HER ZAMAN geçerdi. */
    const yok = ilkTurTavani(undefined, 'nedensiz');
    expect('hata' in yok, 'beyansız ilk tur SESSİZCE geçti').toBe(true);
    expect((yok as { hata: string }).hata).toMatch(/ilkTurTavani/);
    /* Sayı olmayan ve negatif beyan da beyan değildir. */
    for (const kotu of ['3', 3.5, -1, null, {}]) {
      expect('hata' in ilkTurTavani(kotu, 'nedensiz'), `beyan kabul edildi: ${JSON.stringify(kotu)}`)
        .toBe(true);
    }
    expect(ilkTurTavani(0, 'nedensiz')).toEqual({ tavan: 0 });
    expect(ilkTurTavani(8, 'satır')).toEqual({ tavan: 8 });
  });

  it('TABAN DAL ÜÇ HÂLİ: yok · okundu · ÖLÇÜLEMEDİ [SIS-TAB-002]', () => {
    /* ── SABOTAJ BULGUSU (R-E · PR #51, tur 1) ─────────────────────────
       Üç hâli tek `catch`e toplayan okumayı sabote ettim (S96) ve KIRMIZI
       YANMADI — çünkü bu dal kütüğü GETİREN bir dalda hiç ULAŞILABİLİR
       değil: `tabandaVar` zaten false ve kod oraya varmıyor. Sabotajın
       kendisi zayıf değildi; ÖLÇÜM ORTAMI kuruluyor değildi. Karar saf
       bir fonksiyona alındı ve sentetik olarak sınanır. */
    expect(tabanDalKarari(false, null).hal, 'dosya tabanda yokken cırcırın tabanı yoktur')
      .toBe('taban_yok');
    expect(tabanDalKarari(true, '{"tavanlar":{"nedensiz":1,"eylemsiz":0}}').hal)
      .toBe('okundu');
    /* İKİ ÖLÇÜLEMEDİ HÂLİ AYRI AYRI: `git show` düştü · JSON bozuk.
       İkisi de "temiz" DEĞİLDİR ve ikisi de aynı kararı verir. */
    expect(tabanDalKarari(true, null).hal, 'okunamayan dosya "temiz" sayıldı')
      .toBe('olculemedi');
    expect(tabanDalKarari(true, '{ bozuk').hal, 'bozuk JSON "temiz" sayıldı')
      .toBe('olculemedi');
    expect(tabanDalKarari(true, '{ bozuk').sebep, 'sebep yazılmamış').toMatch(/bozuk/);
    /* ── SABOTAJ BULGUSU (R-E · PR #51, tur 2) ────────────────────────
       Biçim dişini kaldıran sabotaj (S105) KIRMIZI YAKMADI: diş
       eklenmişti ama VAKASI YOKTU. GEÇERLİ ama YANLIŞ BİÇİM bir JSON
       (`null` · `"x"` · `[]`) "okundu" sayılıyor, çağıran
       `belge.tavanlar` deyince ham bir tip hatasıyla düşüyordu —
       kırmızı yanıyordu ama "ÖLÇÜLEMEDİ (sebep)" demiyordu, yani
       modülün var oluş gerekçesi o dalda çalışmıyordu. */
    for (const ham of ['null', '"x"', '[]', '3']) {
      expect(tabanDalKarari(true, ham).hal, `biçimi yanlış JSON "okundu" sayıldı: ${ham}`)
        .toBe('olculemedi');
    }
    expect(tabanDalKarari(true, '[]').sebep, 'sebep biçimi anlatmıyor').toMatch(/NESNE değil/);
    /* Doğru biçim yine geçer — diş her şeyi reddetmiyor. */
    expect(tabanDalKarari(true, '{"tavanlar":{}}').hal).toBe('okundu');
  });

  it('OKUNAMAYAN gövde SESSİZCE DÜŞMEZ — kütüğe işaretli girer [SIS-BSD-001]', () => {
    /* ── SABOTAJ BULGUSU (R-E · PR #51, tur 2) ────────────────────────
       Sessiz düşürmeyi geri getiren sabotaj (S101) KIRMIZI YAKMADI ve
       sebebi ölçüldü: `ifadeSecim` düzeltildikten sonra depoda okunamayan
       GÖVDE KALMADI, yani sabotajın geri getireceği bir kusur yoktu.
       Güvence GELECEK bir hâle karşıdır; canlı örneği olmayan bir
       güvence ancak SENTETİK bir vakayla ölçülebilir — yoksa "kapı var"
       demek, hiçbir şeye bakmadan temiz raporlamaktır. */
    const okunamaz = satirIciBul('<p className="bos">{hesapla(x)}</p>')[0];
    const k = satirIciKaydi('app/x.tsx', 7, okunamaz) as Satir;
    expect(k, 'okunamayan gövde kütükten DÜŞTÜ').toBeTruthy();
    expect(k.cumle, 'okunamayan satır işaretsiz girdi').toMatch(/^«okunamadı»/);
    expect(k.neden, 'cümlesi okunamayan satır "sebebini söylüyor" sayıldı').toBe(false);

    /* Okunabilen gövde işaretlenmez — diş her şeyi işaretlemiyor. */
    const okunur = satirIciBul('<p className="bos">Kayıt yok; süzgeç eledi.</p>')[0];
    const k2 = satirIciKaydi('app/x.tsx', 9, okunur) as Satir;
    expect(k2.cumle).toBe('Kayıt yok; süzgeç eledi.');
    expect(k2.neden).toBe(true);
  });

  it('BosFiltre TANIM satırı okunur ve ÇAĞRI sayısı gerçektir [SIS-BSD-001]', () => {
    /* Cümle bileşenin İÇİNDE bir kez yazılıdır; yirmi beş çağrıyı ayrı
       satır saymak cırcırı cümle değil ÇAĞRI sayar hâle getirirdi. */
    const satir = bosFiltreSatiri(dosyalar()) as Satir & { cagri: number };
    expect(satir, 'BosFiltre tanımı bulunamadı').toBeTruthy();
    expect(satir.yer).toContain('components/kabuk/temel.tsx');
    expect(satir.cagri, 'çağrı sayısı sıfır — kalıp bozulmuş').toBeGreaterThan(1);
    expect(satir.neden, 'BosFiltre cümlesi sebebini söylemiyor').toBe(true);
    expect(satir.eylem, 'BosFiltre eylemi kayboldu').toBe(true);
  });
});
