import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ASGARI_SOZCUK, aciklar, ayrisma, erisimDagilimi, sirayla, sozcukler, tamAyrisma,
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
const TANIK_BOS = path.join(KOK, 'arac', 'dom-tanik-bos.json');
const TANIK_KUTUK = path.join(KOK, 'arac', 'dom-tanik-kutugu.json');
const POLITIKA = path.join(KOK, 'arac', 'politika-cumleleri.json');

type TanikCiktisi = {
  uretilme: string;
  rota: string[];
  atlanan: { rota: string; sebep: string }[];
  politikaAdaylari: { cumle: string; rotalar: string[] }[];
  bosDurumlar: { metin: string; rotalar: string[]; sinif: string;
    iyiHaber?: boolean; eylem: boolean }[];
  /* Sıfır satırlı ama kapsamında CÜMLE OLMAYAN yüzeyler (Brief M · FAZ 1). */
  cumlesizYuzeyler?: { rota: string; etiket: string; kapsam: string; baslik: string }[];
  /* Taranan tablo/liste/işaret sayısı ve dişin GERÇEK popülasyonu. */
  veriYuzeyi?: number;
  bosYuzeySayisi?: number;
  /* Boş kurulum öncülü: veritabanı GERÇEKTEN boş muydu (P1-3). */
  oncul?: { kullanici: number | null; tesis: number | null; madde: number | null } | null;
};
type TanikSatiri = {
  kod: string; rota: string; cekirdek: string; sinif: string;
  sonucSinifi?: string; gerekce?: string;
  olcum?: { dosya: string; vaka: string };
};

const tanikVar = existsSync(TANIK);
const tanik: TanikCiktisi | null = tanikVar
  ? JSON.parse(readFileSync(TANIK, 'utf8')) as TanikCiktisi : null;
/* BOŞ KURULUM koşumu ayrı bir çıktıdır: cümlesiz boş yüzey ancak veri
   YOKKEN görünür. Tohumlu koşumda tabloların çoğu doludur ve ölçüm
   doğası gereği 0 çıkar — "tohumlu koşumda 0" ile "böyle bir kusur yok"
   AYNI ŞEY DEĞİLDİR. */
const bosVar = existsSync(TANIK_BOS);
const bosTanik: TanikCiktisi | null = bosVar
  ? JSON.parse(readFileSync(TANIK_BOS, 'utf8')) as TanikCiktisi : null;
const tanikKutuk = JSON.parse(readFileSync(TANIK_KUTUK, 'utf8')) as {
  tavanlar: { olculmeyen: number; atlananRota?: number; bosAtlananRota?: number };
  /* ELLE yazılan ilk tur tavanı — taban dal yokken cırcırın tavanı. */
  ilkTurTavani?: { satir?: number };
  beyan?: { bosYuzey?: number; gerekce?: string };
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
    /* ── TABAN TESTİN İÇİNDE DEĞİL (Brief M · FAZ 2) ─────────────────
       Sabit `30` buradaydı ve ölçülen 35'ti: beş satırlık sessiz daralma
       penceresi. Deponun kendi kuralı — "testin içine sabit yazılmış bir
       taban, arada sessiz bir daralma penceresi bırakır" — bu vakada
       uygulanmamıştı. */
    const kapsamHatasi = tabanKarari('tanik.kapsam', gorulen, tabanOku().tabanlar);
    expect(kapsamHatasi, kapsamHatasi ?? '').toBeNull();
    const oran = gorulen / politika.satirlar.length;
    console.log(`tanık kapsamı: ${gorulen}/${politika.satirlar.length} `
      + `(%${(oran * 100).toFixed(1)})`);
    /* Ve sınır GERÇEKTEN bir sınır: tanık her şeyi görüyorsa bu vakanın
       adı yalan olurdu. */
    expect(domdaGorulmeyen.length,
      'tanık kütüğün TAMAMINI görüyor — sınır beyanı artık yanlış')
      .toBeGreaterThan(0);
  });

  it('TANIK KAPSAMI TEK YÖNLÜ — oran taban dala göre DÜŞEMEZ [URN-TNK-001]', () => {
    /* ── ÖLÇÜLEN RİSK (Brief M · FAZ 2) ──────────────────────────────
       Tanık kütüğün küçük bir bölümünü görüyor ve bu BEYANLI bir sınır;
       sorun sınırın kendisi değil, SESSİZCE DARALABİLMESİ. Salt SAYIYA
       bakan bir taban yetmez: kütük büyürken tanık sabit kalırsa sayı
       korunur, ORAN düşer ve "ayrışma 0" giderek daha az şey söyler.
       Bu yüzden ölçü ORANDIR ve taban dala göre yalnız artabilir. */
    if (!tanik) return;
    const git = (a: string[]) => execFileSync('git', a,
      { cwd: KOK, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    let tabanDalVar = true;
    try { git(['rev-parse', '--verify', 'origin/main']); } catch { tabanDalVar = false; }
    if (!tabanDalVar) {
      expect(process.env.CI ?? '', "CI'da taban dal okunamadı").toBe('');
      return;
    }
    const oku = (yol: string) => {
      let ham: string | null = null;
      let varMi = true;
      try { git(['cat-file', '-e', yol]); } catch { varMi = false; }
      if (varMi) { try { ham = git(['show', yol]); } catch { ham = null; } }
      return tabanDalKarari(varMi, ham);
    };
    const tabanTanik = oku('origin/main:web/arac/dom-tanik.json');
    const tabanKutuk = oku('origin/main:web/arac/politika-cumleleri.json');
    for (const k of [tabanTanik, tabanKutuk]) {
      if (k.hal === 'olculemedi') {
        expect(process.env.CI ?? '', `TABAN DAL ÖLÇÜLEMEDİ (${k.sebep})`).toBe('');
        return;
      }
    }
    const gorulenBugun = (() => {
      const { domdaGorulmeyen } = ayrisma(
        tanik.politikaAdaylari.map((a) => a.cumle),
        politika.satirlar.map((s) => s.cumle),
      );
      return politika.satirlar.length - domdaGorulmeyen.length;
    })();
    const bugunku = gorulenBugun / politika.satirlar.length;
    if (tabanTanik.hal === 'taban_yok' || tabanKutuk.hal === 'taban_yok') {
      /* İlk tur: kütükler bu dalda doğdu. Oran yine de ÖLÇÜLÜR ve
         `olcum-tabani.json`daki sayı tabanıyla korunur (yukarıdaki vaka). */
      expect(bugunku, 'oran ölçülemedi').toBeGreaterThan(0);
      return;
    }
    const tt = tabanTanik.belge as TanikCiktisi;
    const tk = tabanKutuk.belge as { satirlar: { cumle: string }[] };
    const { domdaGorulmeyen: tabanGorulmeyen } = ayrisma(
      tt.politikaAdaylari.map((a) => a.cumle),
      tk.satirlar.map((s) => s.cumle),
    );
    const tabanOran = (tk.satirlar.length - tabanGorulmeyen.length) / tk.satirlar.length;
    console.log(`tanık kapsam oranı · taban %${(tabanOran * 100).toFixed(1)} `
      + `→ bugün %${(bugunku * 100).toFixed(1)}`);
    /* ── MAYIN DİŞ DÜZELTİLDİ (bağımsız inceleme · P2-8) ─────────────
       İlk yazım "yuvarlama payı yok, oran DÜŞEMEZ" diyordu. Ölçüldü:
       kütüğün %84'ü zaten açılış hâlinde görünmüyor (çekmece · sekme ·
       form), yani tanığın göremediği SIRADAN bir politika cümlesi
       eklemek oranı 35/220'den 35/221'e düşürür ve kapı kırmızı yanardı.
       Bu bir kapı değil MAYINDIR: her temiz dalı kırmızı yakar ve tek
       çıkışları cümleyi yanlış yere taşımak, payı yapay büyütmek ya da
       cırcırı gevşetmektir — üçü de bu deponun kaçındığı şey. Bu depo
       aynı sınıfı bir kez daha yaşadı (`yeniler.length > 0` dişi).

       Ölçülmek istenen şey "oran hiç düşmesin" değil, TANIĞIN
       DARALMAMASI. İkisi kütük büyümediğinde aynı şeydir; büyüdüğünde
       ayrışır ve ayrım burada yazılıdır:
         · kütük BÜYÜMEDİYSE → oran düşemez (tanık daraldı demektir),
         · kütük BÜYÜDÜYSE   → PAY düşemez (tanık aynı satırları hâlâ
           görüyor; yeni satırın açılışta görünmesi beklenemez).
       İkisi de türetilmiş; uydurulmuş bir tolerans katsayısı yok. */
    const tabanGorulen = tk.satirlar.length - tabanGorulmeyen.length;
    if (politika.satirlar.length <= tk.satirlar.length) {
      expect(bugunku,
        `TANIK KAPSAMI DARALDI: %${(tabanOran * 100).toFixed(1)} → `
        + `%${(bugunku * 100).toFixed(1)} (kütük büyümedi: `
        + `${tk.satirlar.length} → ${politika.satirlar.length})`)
        .toBeGreaterThanOrEqual(tabanOran);
    } else {
      expect(gorulenBugun,
        `TANIK DARALDI: gördüğü satır ${tabanGorulen} → ${gorulenBugun}. `
        + 'Kütük büyüdü, ama tanığın ZATEN gördüğü satırlar da azaldı.')
        .toBeGreaterThanOrEqual(tabanGorulen);
    }
  });

  it('ULAŞILAMAYAN her satır KATEGORİSİYLE beyanlı — kategorisiz "ulaşılamadı" yok [URN-TNK-001]', () => {
    /* Kategoriler KODDAN türetilir (`erisimKategorisi`) ve üçü birlikte
       ulaşılamayan satırların TAMAMINI kaplamak zorundadır: dördüncü bir
       hâl doğarsa toplam tutmaz ve kapı kırmızı yanar. Çıplak bir
       "ulaşılamadı" bir sonraki turda "zaten görmüyorduk" diye
       büyütülür — kategori bunu imkânsız kılar. */
    if (!tanik) return;
    const { domdaGorulmeyen } = ayrisma(
      tanik.politikaAdaylari.map((a) => a.cumle),
      politika.satirlar.map((s) => s.cumle),
    );
    const gorulmeyen = new Set(domdaGorulmeyen);
    const ulasilamayan = politika.satirlar.filter((s) => gorulmeyen.has(s.cumle));
    const gezilen = new Set(tanik.rota);
    const dagilim = erisimDagilimi(ulasilamayan, gezilen);
    console.log(`ulaşılamayan ${ulasilamayan.length} satır · ${JSON.stringify(dagilim)}`);
    /* ── DİŞ FALSİFİYE EDİLEBİLİR OLMALI (bağımsız inceleme · P2-5) ───
       İlk yazım `toplam === ulasilamayan.length` diyordu ve kural
       sonunda KOŞULSUZ bir `return 'acilista-yok'` taşıdığı için bu
       eşitlik HİÇBİR GİRDİDE yanlış olamıyordu — tautoloji, yani ölü
       kural. Bugün sınıflanamayan satır `siniflanmadi` altında AYRI
       sayılır ve sıfır olmak zorundadır: dördüncü bir hâl doğduğunda
       (yeni bir kök, tanınmayan bir yol) kapı kırmızı yanar. */
    expect(dagilim.siniflanmadi,
      `SINIFLANAMAYAN ${dagilim.siniflanmadi} satır — kategorisiz "ulaşılamadı" `
      + 'kabul edilmez; `erisimKategorisi` yeni hâli tanımıyor')
      .toBe(0);
    const toplam = Object.values(dagilim).reduce((a, b) => a + b, 0);
    expect(toplam, 'dağılım toplamı ulaşılamayan sayısını tutmuyor')
      .toBe(ulasilamayan.length);
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

  it('CÜMLESİZ BOŞ YÜZEY YOK — boş kurulumda ölçülür, tavan SIFIR [URN-TNK-001]', () => {
    /* ══ Brief M · FAZ 1 ══════════════════════════════════════════════
       ── ÖLÇÜLEN KUSUR ───────────────────────────────────────────────
       Düzeltme turunda `VeriTablosu` KENDİ boş durumunu bıraktı ve
       gerekçe doğruydu: paylaşılan bir bileşen boşluğun SEBEBİNİ
       bilemez. Ama sonucu bir delik açtı — sıfır satırlı bir tablo HİÇ
       CÜMLE OLMADAN render edilebiliyor. Cümle yoksa kaynak türeticisi
       okuyacak metin bulamaz, satır kütüğe girmez ve "eylemsiz 0" yeşil
       kalır. Kütük bir satırı SİLEREK iyileşmişti; bu bir bulgudur.

       ── NEDEN TANIKTA ───────────────────────────────────────────────
       Kaynak türeticisi bunu yapısal olarak ölçemez: "bu tablo boş mu
       render edilecek" sorusunun cevabı çalışma anındadır. Üstelik
       bileşen sıfır satırda HİÇBİR ŞEY çizmiyor — ortada bir `<table>`
       bile yok. Bu yüzden bileşen görünmez bir işaret basar
       (`[data-bos-yuzey]`) ve tanık sözleşmeyi oradan okur.

       ── NEDEN BOŞ KURULUM ───────────────────────────────────────────
       Tohumlu koşumda tabloların çoğu doludur ve ölçüm doğası gereği 0
       çıkar (ölçüldü: tohumlu koşum 0). "Tohumlu koşumda 0" ile "böyle
       bir kusur yok" AYNI ŞEY DEĞİLDİR. */
    if (!bosTanik) {
      expect(process.env.CI ?? '', "CI'da BOŞ KURULUM tanık çıktısı YOK: "
        + '`PORT=3210 node arac/dom-tanik.mjs --bos --yaz`').toBe('');
      return;
    }
    const kusur = (bosTanik.cumlesizYuzeyler ?? [])
      .map((c) => `${c.rota} · <${c.etiket}> · kapsam "${c.kapsam}" · "${c.baslik}"`);
    expect(kusur, `CÜMLESİZ boş yüzey — sıfır satırlı bir veri yüzeyi, `
      + `kapsamında hiçbir boş durum cümlesi olmadan render ediliyor:\n${kusur.join('\n')}`)
      .toEqual([]);
  });

  it('BOŞ KOŞUMUN ÖNCÜLÜ ÖLÇÜLÜ — veritabanı gerçekten BOŞTU [URN-TNK-001]', () => {
    /* ── ÖLÇÜLEN RİSK (bağımsız inceleme · P1-3) ─────────────────────
       Koşumun bütün anlamı "veri yok" hâli, ama hiçbir adım bunu
       doğrulamıyordu. `lib/db.ts` `DATABASE_URL` yoksa TOHUMLU
       `prisma/dev.db`ye düşer: env aktarımı bir gün bozulursa tanık
       tohumlu veriyi ölçer, tablolar dolu olur ve cümlesiz yüzey DOĞASI
       GEREĞİ 0 çıkar. Kapının yeşilliği o zaman bir ölçüm değil, bir
       yan etki olurdu. Öncül artık kütüğe yazılır ve BURADA okunur. */
    if (!bosTanik) return;
    const o = bosTanik.oncul;
    expect(o, 'boş koşum ÖNCÜLÜNÜ yazmamış — veritabanının boş olduğu ölçülmedi')
      .toBeTruthy();
    console.log(`boş kurulum öncülü · Kullanici ${o!.kullanici} · `
      + `Tesis ${o!.tesis} · Madde ${o!.madde}`);
    expect(o!.kullanici, 'kurucu hesap tek değil — fikstür beklendiği gibi kurulmamış').toBe(1);
    expect(o!.tesis, 'Tesis tablosu DOLU — tanık tohumlu bir kurulumu ölçmüş').toBe(0);
    expect(o!.madde, 'Madde tablosu DOLU — tanık tohumlu bir kurulumu ölçmüş').toBe(0);
  });

  it('BOŞ KOŞUMDA atlanan rota da BEYANLI — sessiz daralma yok [URN-TNK-001]', () => {
    /* Bağımsız inceleme (P2-9): `atlanan` tavanı yalnız tohumlu koşumda
       denetleniyordu. Boş koşum bugün ALTI rota atlıyor (tohum kimlikli
       detay rotaları boş kurulumda 404 verir — beklenen ve doğru) ve
       bunun ne tavanı ne beyanı vardı; yarın otuz rota düşse koşum
       sessizce daralırdı. */
    if (!bosTanik) return;
    const BILINEN = ['cok-parametreli', 'tohum-degeri-yok', 'HTTP'];
    const yabanci = bosTanik.atlanan
      .filter((a) => !BILINEN.some((b) => a.sebep.startsWith(b)))
      .map((a) => `${a.rota} — ${a.sebep}`);
    expect(yabanci, `boş koşum BEKLENMEYEN sebeple rota atladı:\n${yabanci.join('\n')}`)
      .toEqual([]);
    const tavan = tanikKutuk.tavanlar.bosAtlananRota ?? 0;
    console.log(`boş koşum · atlanan rota: ${bosTanik.atlanan.length} (tavan ${tavan})`);
    expect(bosTanik.atlanan.length,
      `boş koşumda ${bosTanik.atlanan.length} rota atlandı, beyan edilen tavan ${tavan}`)
      .toBeLessThanOrEqual(tavan);
  });

  it('DİŞİN POPÜLASYONU ÖLÇÜLÜR — sıfır yüzey tarayan diş sıfır kusur bulur [URN-TNK-001]', () => {
    /* ── DİŞİN KENDİ KUSURU, AYNI TURDA ÖLÇÜLDÜ ─────────────────────
       İlk yazım sıfır satırlı düğümü ararken `gorunur()` istiyordu —
       yani YÜKSEKLİĞİ SIFIR olmayanı. Sıfır satırlı bir listenin
       yüksekliği tanımı gereği sıfırdır: diş aradığı şeyi eliyordu,
       popülasyon 0'a düşüyordu ve kapı "0 kusur" diyerek geçiyordu.
       Bu turun kovaladığı kusurun ta kendisi, bu kez yeni dişte.

       Bugün taranan yüzey sayısı YAZILIR ve bir TABAN taşır. Kusur
       sayısı sıfır olabilir; ölçüm sayısı olamaz. */
    if (!bosTanik) return;   /* yokluğu yukarıdaki vaka kırmızı yakar */
    /* ── İKİ SAYI, İKİ TABAN (bağımsız inceleme · P2-1) ──────────────
       `veriYuzeyi` TARANAN yüzey sayısıdır; tek başına taban tutunca
       bütün tablolar dolsa bile (yani diş hiçbir BOŞ yüzeye bakmasa)
       gezinme listeleri sayesinde yerinde kalıyor ve kapı "0 kusur"
       diyerek geçiyordu. Dişin GERÇEK popülasyonu `bosYuzeySayisi`:
       kaç sıfır satırlı yüzeye bakıldı. İkisi de ölçülür ve ikisi de
       tabanlıdır. */
    const olculen = bosTanik.veriYuzeyi ?? 0;
    console.log(`cümlesiz yüzey dişi · taranan veri yüzeyi: ${olculen}`);
    const hata = tabanKarari('tanik.veriYuzeyi', olculen, tabanOku().tabanlar);
    expect(hata, hata ?? '').toBeNull();

    /* ── DİŞİN GERÇEK POPÜLASYONU: TABAN DEĞİL, BEYAN ────────────────
       `bosYuzeySayisi` dişin baktığı sıfır satırlı yüzey sayısıdır ve
       bugün SIFIR — çünkü altı çağıranın altısı da tablodan ÖNCE kendi
       boş durumunu çiziyor. Sıfır bir TABAN olamaz (deponun kendi
       kuralı: "sıfır ölçüm bir ölçüm değildir") ama sessiz de
       bırakılamaz: `veriYuzeyi` tek başına taban tutunca bütün tablolar
       dolsa bile sayı yerinde kalıyor ve kapı "0 kusur" diyordu
       (bağımsız inceleme · P2-1). Bugün sayı BEYANLIDIR: değişirse bir
       çağıran tabloyu cümlesiz boş bırakmaya başlamış demektir ve bu
       bilerek yeniden beyan edilmelidir. */
    const beyan = tanikKutuk.beyan?.bosYuzey;
    const gercek = bosTanik.bosYuzeySayisi ?? 0;
    console.log(`cümlesiz yüzey dişi · sıfır satırlı yüzey: ${gercek} (beyan ${beyan})`);
    expect(gercek,
      `DİŞİN POPÜLASYONU DEĞİŞTİ: beyan ${beyan} → ölçülen ${gercek}. Bir çağıran `
      + 'paylaşılan tabloyu cümlesiz boş bırakmaya başlamış olabilir; sayıyı '
      + '`dom-tanik-kutugu.json` → `beyan.bosYuzey` altında GEREKÇESİYLE yenileyin.')
      .toBe(beyan);
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
