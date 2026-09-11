import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ASGARI_SOZCUK, aciklar, ayrisma, sirayla, sozcukler, tamAyrisma,
} from '../../arac/tanik-karsilastirma.mjs';
import { ilkTurTavani, tabanDalKarari } from '../../arac/taban-dal.mjs';
import { tabanKarari, tabanOku } from '../../arac/olcum-tabani.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   İKİNCİ BAĞIMSIZ POPÜLASYON TANIĞI · BEKÇİ [URN-TNK-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Bu depoda iki kütüğün de POPÜLASYONU tek bir düzenli ifadeden
   türüyordu ve "tavan sıfır" dişi yalnız TÜRETİCİNİN GÖRDÜĞÜNÜ koruyor:

     politika  : 131 → 184 → 213 → 215
     boş durum : 74 → 94 → 95 → 102 → 100 → 126

   Yedi kez genişleyen bir türeticinin "ölçülmeyen 0" çıktısı, payda
   bağımsız doğrulanmadıkça bir ölçüm DEĞİLDİR. Sayaç cırcırı,
   türeticinin hiç görmediği cümleyi göremez.

   ── TANIĞIN MEKANİZMASI FARKLIDIR ─────────────────────────────────────
   `arac/dom-tanik.mjs` kaynağı HİÇ OKUMAZ: ürünü gerçek bir tarayıcıda
   açar ve KULLANICIYA GÖRÜNEN metni toplar. Aynı kusurun iki farklı
   mekanizmada birden olması gerekir ki ayrışma görünmesin.

   ── BU BEKÇİNİN ÖLÇTÜĞÜ ───────────────────────────────────────────────
   1. Tanığın GÖRDÜĞÜ her cümle bir kütükte AÇIKLANIYOR mu (mutlak).
   2. Tanık kütüğünde ÖLÜ satır var mı.
   3. Tanık kütüğünün her satırı ÖLÇÜMÜNÜ taşıyor mu (tavan sıfır).
   4. Tanığın ERİŞİMİ daralmış mı — kör bir tanık sıfır ayrışma bulur.
   5. Karşılaştırma ölçütünün kendisi kaçamak mı (sentetik vakalar).

   ── TANIK ÇIKTISI YOKSA ───────────────────────────────────────────────
   `arac/dom-tanik.json` canlı sunucu ister ve her `npm test` koşusunda
   üretilemez. Çıktı yoksa bekçi CI'da KIRMIZI, yerelde beyanlı atlar —
   "ölçülmedi" yazar, "geçti" değil.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const TANIK = path.join(KOK, 'arac', 'dom-tanik.json');
const TANIK_KUTUK = path.join(KOK, 'arac', 'dom-tanik-kutugu.json');
const POLITIKA = path.join(KOK, 'arac', 'politika-cumleleri.json');

type TanikCiktisi = {
  uretilme: string;
  rota: string[];
  atlanan: { rota: string; sebep: string }[];
  politikaAdaylari: { cumle: string; rotalar: string[] }[];
  bosDurumlar: { metin: string; rotalar: string[]; sinif: string;
    iyiHaber?: boolean; eylem: boolean }[];
};
type TanikSatiri = {
  kod: string; rota: string; cekirdek: string; sinif: string;
  sonucSinifi?: string; gerekce?: string;
  olcum?: { dosya: string; vaka: string };
};

const tanikVar = existsSync(TANIK);
const tanik: TanikCiktisi | null = tanikVar
  ? JSON.parse(readFileSync(TANIK, 'utf8')) as TanikCiktisi : null;
const tanikKutuk = JSON.parse(readFileSync(TANIK_KUTUK, 'utf8')) as {
  tavanlar: { olculmeyen: number; atlananRota?: number };
  /* ELLE yazılan ilk tur tavanı — taban dal yokken cırcırın tavanı. */
  ilkTurTavani?: { satir?: number };
  satirlar: TanikSatiri[];
};
const politika = JSON.parse(readFileSync(POLITIKA, 'utf8')) as {
  satirlar: { cumle: string }[];
};

/* Tanığın ERİŞİM TABANI. Sıfır rota gezen bir tanık sıfır ayrışma
   bulur ve kapı yeşil yanar — "hiçbir şeye bakmadan temiz raporlamak"
   bu dosyada tam olarak böyle görünürdü. */
/* ── TABAN TESTİN İÇİNDE DEĞİL, `olcum-tabani.json` İÇİNDE (P2-3) ────
   Deponun kendi kuralı: "testin içine sabit yazılmış bir taban, arada
   sessiz bir daralma penceresi bırakır." Tanık 65 rota geziyordu ve
   testteki sabit 55'ti: tanık on rotayı kaybetse kapı hâlâ yeşil
   yanardı — ölçtüğü tam da "tanığın erişimi daralmadı" iddiasıydı.
   Aynı kusur bu depoda politika tabanı için ÖLÇÜLMÜŞTÜ (131 ↔ 216). */

describe('DOM tanığı · POPÜLASYON AYRIŞMASI [URN-TNK-001]', () => {
  it('TANIK ÇIKTISI VAR — yoksa CI kırmızı, yerelde "ölçülmedi" [URN-TNK-001]', () => {
    if (tanikVar) { expect(tanik!.politikaAdaylari.length).toBeGreaterThan(0); return; }
    expect(process.env.CI ?? '', 'CI\'da tanık çıktısı YOK: `PORT=3210 node arac/dom-tanik.mjs --yaz`')
      .toBe('');
  });

  it('TANIĞIN ERİŞİMİ DARALMADI — kör tanık sıfır ayrışma bulur [URN-TNK-001]', () => {
    if (!tanik) return;
    const tabanlar = tabanOku().tabanlar;
    for (const [anahtar, olculen] of [
      ['tanik.rota', tanik.rota.length],
      ['tanik.cumle', tanik.politikaAdaylari.length],
      ['tanik.bosDurum', tanik.bosDurumlar.length],
    ] as const) {
      const hata = tabanKarari(anahtar, olculen, tabanlar);
      expect(hata, hata ?? '').toBeNull();
    }
    /* Atlanan rota SESSİZ olamaz: tanığın göremediği yer, ayrışmanın
       göremediği yerdir. */
    /* ── ATLAMA SESSİZ OLAMAZ, AMA SIFIR DA OLMAK ZORUNDA DEĞİL (P3-10) ─
       Eski diş `atlanan` listesinin BOŞ olmasını istiyordu ve türetici
       atlamaları listeye HİÇ yazmıyordu: iki kural birbirini besliyor,
       tanık rota kaybettikçe kapı daha da mutlu oluyordu. Bugün atlama
       işaretli girer; diş sebebin BİLİNEN bir sınıftan olmasını ve
       sayının tavan altında kalmasını ister. */
    const BILINEN = ['cok-parametreli', 'tohum-degeri-yok', 'HTTP'];
    const yabanci = tanik.atlanan
      .filter((a) => !BILINEN.some((b) => a.sebep.startsWith(b)))
      .map((a) => `${a.rota} — ${a.sebep}`);
    expect(yabanci, `tanık BEKLENMEYEN sebeple rota atladı:\n${yabanci.join('\n')}`)
      .toEqual([]);
    /* Sayı da TAVANLIDIR ve tavan kütükte beyanlıdır: bugün ÖLÇÜLEN 0
       (59 düz + 6 tek parametreli = 65 rota, atlanan yok). Sıfıra inmiş
       bir tavan için "yalnız küçülür" yetmez — beyansız bir atlama
       kapıyı kırmızı yakar. */
    const tavan = tanikKutuk.tavanlar.atlananRota ?? 0;
    expect(tanik.atlanan.length,
      `tanık ${tanik.atlanan.length} rota atladı, beyan edilen tavan ${tavan}:\n`
      + tanik.atlanan.map((a) => `  ${a.rota} — ${a.sebep}`).join('\n'))
      .toBeLessThanOrEqual(tavan);
  });

  it('TANIĞIN ERİŞİM SINIRI ÖLÇÜLÜR ve BEYANLIDIR — "ayrışma 0" yetmez [URN-TNK-001]', () => {
    if (!tanik) return;
    /* ── EN ÖNEMLİ SINIR, EN KOLAY GİZLENEN SINIR ─────────────────────
       Tanık yalnız sayfanın AÇILIŞ hâlini gezer: çekmece açmaz, form
       doldurmaz, sekme değiştirmez. Yani kütüğün BÜYÜK BİR KISMINI
       hiç göremez ve "ayrışma 0" çıktısı bunu SÖYLEMEZ.

       Bu sayı beyansız kalsaydı tanığın erişimi bir gün sessizce
       daralır ve kapı yine "ayrışma 0" derdi — düzeltmek istediğimiz
       körlüğün ta kendisi. Bugün sayı ölçülür ve bir TABAN taşır:
       tanığın gördüğü kütük satırı sayısı yalnız ARTABİLİR. */
    const { domdaGorulmeyen } = ayrisma(
      tanik.politikaAdaylari.map((a) => a.cumle),
      politika.satirlar.map((s) => s.cumle),
    );
    const gorulen = politika.satirlar.length - domdaGorulmeyen.length;
    /* ÖLÇÜLDÜ (11 Eyl 2026): 216 satırın 32'si tanığın erişiminde.
       Taban bu ölçümün ALTINDADIR ve yalnız yükselir; kalan 184 satır
       BEYANLI SINIRDIR, ölçülmemişlik değil — hepsinin kendi gerçek
       yol ölçümü vardır (`olculmedi` 0). */
    expect(gorulen,
      `tanık kütüğün ${gorulen}/${politika.satirlar.length} satırını görüyor; `
      + 'taban 30 — erişim daraldıysa "ayrışma 0" bir şey söylemiyor demektir')
      .toBeGreaterThanOrEqual(30);
    /* Ve sınır GERÇEKTEN bir sınır: tanık her şeyi görüyorsa bu vakanın
       adı yalan olurdu. */
    expect(domdaGorulmeyen.length,
      'tanık kütüğün TAMAMINI görüyor — sınır beyanı artık yanlış')
      .toBeGreaterThan(0);
  });

  it('EKRANDA GÖRÜLEN her cümle bir kütükte AÇIKLANIYOR [URN-TNK-001]', () => {
    if (!tanik) return;
    const { acikta } = tamAyrisma(
      tanik.politikaAdaylari.map((a) => a.cumle),
      politika.satirlar.map((s) => s.cumle),
      tanikKutuk.satirlar,
    );
    const yer = new Map(tanik.politikaAdaylari.map((a) => [a.cumle, a.rotalar[0]]));
    const liste = acikta.map((c) => `${yer.get(c)} :: ${c.slice(0, 110)}`);
    expect(liste, 'TÜRETİCİ KÖR: ekranda okunan ama hiçbir kütükte olmayan cümle:\n'
      + `${liste.join('\n')}\n`
      + 'çözüm: türeticiyi genişlet ya da satırı arac/dom-tanik-kutugu.json\'a '
      + 'ÖLÇÜMÜYLE ekle. Sayıyı düşürme — yükselt.').toEqual([]);
  });

  it('TANIK KÜTÜĞÜNDE ölü satır YOK [URN-TNK-001]', () => {
    if (!tanik) return;
    const { olu } = tamAyrisma(
      tanik.politikaAdaylari.map((a) => a.cumle),
      politika.satirlar.map((s) => s.cumle),
      tanikKutuk.satirlar,
    );
    expect(olu, `artık hiçbir ekranda görünmeyen tanık satırı: ${olu.join(', ')}`)
      .toEqual([]);
  });

  it('TANIK KÜTÜĞÜNÜN her satırı ÖLÇÜMÜNÜ taşır — tavan SIFIR [URN-TNK-001]', () => {
    const olcumsuz = tanikKutuk.satirlar.filter((s) => !s.olcum).map((s) => s.kod);
    expect(olcumsuz, `ölçümsüz tanık satırı: ${olcumsuz.join(', ')}`).toEqual([]);
    expect(tanikKutuk.tavanlar.olculmeyen, 'tanık kütüğünün ölçülmeyen tavanı sıfır olmalı')
      .toBe(0);
  });

  it('ÖLÇÜM referansı GERÇEK: dosya var ve vaka o dosyada [URN-TNK-001]', () => {
    const kusur: string[] = [];
    for (const s of tanikKutuk.satirlar) {
      if (!s.olcum) continue;
      const yol = path.join(KOK, s.olcum.dosya);
      if (!existsSync(yol)) { kusur.push(`${s.kod}: dosya yok — ${s.olcum.dosya}`); continue; }
      if (!readFileSync(yol, 'utf8').includes(s.olcum.vaka)) {
        kusur.push(`${s.kod}: vaka yok — "${s.olcum.vaka}" (${s.olcum.dosya})`);
      }
    }
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('TANIK KÜTÜĞÜ CIRCIRDADIR — taban dala göre BÜYÜYEMEZ [URN-TNK-001]', () => {
    /* Kaçış kapısının kendisi cırcırdadır: "türeticiyi genişletmek"
       yerine her cümleyi tanık kütüğüne atmak, körlüğü kütüğe taşımak
       olurdu. Satır sayısı taban dala göre artamaz; artması gerekiyorsa
       türetici genişletilir. */
    const git = (a: string[]) => execFileSync('git', a,
      { cwd: KOK, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    let tabanDalVar = true;
    try { git(['rev-parse', '--verify', 'origin/main']); } catch { tabanDalVar = false; }
    if (!tabanDalVar) {
      expect(process.env.CI ?? '', 'CI\'da taban dal okunamadı').toBe('');
      return;
    }
    const YOL = 'origin/main:web/arac/dom-tanik-kutugu.json';
    let tabandaVar = true;
    try { git(['cat-file', '-e', YOL]); } catch { tabandaVar = false; }
    let ham: string | null = null;
    if (tabandaVar) { try { ham = git(['show', YOL]); } catch { ham = null; } }
    const karar = tabanDalKarari(tabandaVar, ham);
    if (karar.hal === 'olculemedi') {
      expect(process.env.CI ?? '', `TABAN DAL ÖLÇÜLEMEDİ (${karar.sebep})`).toBe('');
      return;
    }
    /* ── SESSİZ `return` KALDIRILDI (düzeltme turu · tur 2 · P2-4) ─────
       Bu kütük BU DALDA doğdu: taban dalda yok, yani `taban_yok` hâli
       VARSAYIMSAL DEĞİL, tam da bu turun hâli. Eski satır sessizce
       dönüyordu — yani tanık cırcırı, tanığı GETİREN turda hiçbir şey
       ölçmüyordu ve kapı yeşil yanıyordu. Ölçüm aracının kendisi,
       deponun adı konmuş kusurunu taşıyordu.

       Taban yoksa tavan kütüğün ELLE beyan ettiği `ilkTurTavani`dir;
       `tavanlar` alanı bu işi göremez, onu türetici yazar (kütük kendini
       kendisiyle karşılaştırır ve her zaman geçer). Beyansızsa KIRMIZI. */
    let tavan: number;
    let kaynak: string;
    if (karar.hal === 'taban_yok') {
      const k = ilkTurTavani(tanikKutuk.ilkTurTavani?.satir, 'satır');
      expect('hata' in k ? k.hata : null, 'hata' in k ? k.hata : '').toBeNull();
      tavan = (k as { tavan: number }).tavan;
      kaynak = 'kütüğün ELLE yazdığı ilk tur beyanı';
    } else {
      const taban = karar.belge as { satirlar: { kod: string }[] };
      tavan = taban.satirlar.length;
      kaynak = 'taban dal (origin/main)';
    }
    console.log(`tanık cırcırı · tavan ${tavan} (${kaynak}) · ölçülen ${tanikKutuk.satirlar.length}`);
    expect(tanikKutuk.satirlar.length,
      `tanık kütüğü ${tavan} → ${tanikKutuk.satirlar.length} BÜYÜDÜ (tavan kaynağı: ${kaynak}); `
      + 'körlüğü kütüğe taşımak yerine türeticiyi genişletin')
      .toBeLessThanOrEqual(tavan);
  });
});

/* ═══ ÖLÇÜTÜN KENDİSİ · SENTETİK VAKALAR ═════════════════════════════
   Kural saf bir fonksiyondadır ve sentetik girdilerle sınanır —
   sabotaj kuralı sabote eder, ölçüm ortamını değil. */

describe('AÇIKLAMA ÖLÇÜTÜ kaçamak DEĞİL [URN-TNK-001]', () => {
  it('ARA DEĞER dolmuş cümle, şablonu AÇIKLAR [URN-TNK-001]', () => {
    expect(aciklar(
      'Eksikler ayrı sayılır:  değerlendirilmedi ·  kanıtsız',
      'Eksikler ayrı sayılır: 2 değerlendirilmedi · 1 kanıtsız',
    )).toBe(true);
  });

  it('BAŞKA bir cümle açıklamaz — ölçüt her şeyi eşleştirmiyor [URN-TNK-001]', () => {
    expect(aciklar(
      'Kapsam boş bırakılamaz ve dış denetçiye her şey açılmaz',
      'Yedekleme politikası kaydı bir yedekleme işi başlatmaz',
    )).toBe(false);
  });

  it('ÇOK KISA kütük satırı hiçbir şeyi açıklayamaz [URN-TNK-001]', () => {
    /* İki sözcüklük bir satır her metinde "bulunur" ve ayrışmayı
       sessizce sıfırlardı; eşik ölçütün kaçamak olmasını engeller. */
    expect(ASGARI_SOZCUK).toBeGreaterThanOrEqual(4);
    expect(aciklar('kayıt yok', 'kayıt bulunamadı, yok sayıldı')).toBe(false);
  });

  it('SIRA ÖNEMLİ — aynı sözcükler farklı sırada açıklamaz [URN-TNK-001]', () => {
    expect(sirayla(['bir', 'iki', 'uc'], ['bir', 'iki', 'uc'])).toBe(true);
    expect(sirayla(['bir', 'iki', 'uc'], ['uc', 'iki', 'bir'])).toBe(false);
  });

  it('SAYILAR düşer, harfler kalır [URN-TNK-001]', () => {
    expect(sozcukler('12 kayıt açık · 3 kapalı')).toEqual(['kayıt', 'açık', 'kapalı']);
  });

  it('BOŞ kütükte HİÇBİR ŞEY açıklanmaz — ayrışma sessizce sıfırlanamaz [URN-TNK-001]', () => {
    const { acikta } = tamAyrisma(['Ekranda duran bir politika cümlesi burada'], [], []);
    expect(acikta.length, 'boş kütük her şeyi açıklıyor görünüyor').toBe(1);
  });
});

/* ═══ BOŞ DURUM TARAFI ═══════════════════════════════════════════════ */

describe('DOM tanığı · BOŞ DURUM ayrışması [URN-TNK-001]', () => {
  it('EKRANDA görülen boş durumun EYLEMİ de var [URN-TNK-001]', () => {
    if (!tanik) return;
    /* R-G'nin sıfır kilidi kaynaktan ölçülür; tanık aynı sözü RENDER
       EDİLMİŞ tarafta okur. İYİ HABER boş durumu (`bos iyi`) dişin
       dışındadır ve muafiyeti KODDAN gelir, kütükten değil. */
    const eylemsiz = tanik.bosDurumlar
      .filter((b) => !b.eylem && !/\bbos\s+iyi\b|\biyi\b/.test(b.sinif))
      .map((b) => `${b.rotalar.join(', ')} :: ${b.metin.slice(0, 80)}`);
    expect(eylemsiz, 'RENDER EDİLMİŞ ekranda eylemsiz boş durum:\n'
      + eylemsiz.join('\n')).toEqual([]);
  });
});
