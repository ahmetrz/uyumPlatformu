import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { politikaMi, sonucSinifi, turet, yorumsuz } from '../../arac/politika-kutugu.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · EKRANIN POLİTİKA CÜMLESİ ÖLÇÜLÜR · BEKÇİ [URN-POL-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   #49, iki ayrı inceleme turunda AYNI sınıfı iki kez üretti:

   1. `/ayarlar/kimlik` ekranı "bu kurulumda MFA zorunlu" diyordu;
      `girisYap` parola doğrulandıktan sonra oturumu açıyordu. MFA
      katmanının her parçası tek tek doğruydu ve tek tek test ediliyordu.
   2. Takvim tetikli yükümlülükler için AYRI bir motor yazıldı; eski olay
      motoru simetrik daralmayı almadı ve altı sahte bildirim kaydı doğdu.

   İkisinde de iddia doğruydu, kod doğruydu, BAĞ yoktu — ve hiçbir kapı
   bakmadı, çünkü kapılar parçalara bakar.

   ── NE ÖLÇÜLÜR ────────────────────────────────────────────────────────
   Bu bekçi bağın KENDİSİNİ ölçemez (onu ancak vakanın kendisi ölçer).
   Ölçtüğü şey daha dar ve kapı olarak anlamlı olan: EKRANDA YAZAN HER
   POLİTİKA CÜMLESİ KÜTÜKTE VAR MI ve kütükteki her politika satırı ya
   ÖLÇÜMÜNÜ ya da ÖLÇÜLMEDİĞİNİ SAHİBİYLE söylüyor mu. Sınır R-D ile
   aynıdır ve kabul edilmiştir: kapı beyanın VARLIĞINI ölçer, ölçümün
   iddiayı gerçekten sınadığını değil.

   ── LİSTE TÜRETİLİR ───────────────────────────────────────────────────
   Elle yazılmış liste yeni ekran eklendiği gün eksik kalır. Bu depoda
   aynı kusur iki kez ölçüldü (kapı iş adları · dışa aktarım yüzeyleri).
   ═══════════════════════════════════════════════════════════════════════ */

const KUTUK = path.join(process.cwd(), 'arac', 'politika-cumleleri.json');
const kutuk = JSON.parse(readFileSync(KUTUK, 'utf8')) as {
  not?: string;
  tavanlar: { olculmeyen: number; sinif: Record<string, number> };
  tavanGerekceleri?: { alan: string; eski: number; yeni: number; gerekce: string }[];
  satirlar: {
    kod: string; cumle: string; yer: string; sinif: string; gerekce?: string;
    sonucSinifi?: string;
    olcum?: { dosya: string; vaka: string };
    olculmedi?: { sahip: string; kapanisAsamasi: string };
  }[];
};

const bulunan = turet();

describe('politika cümlesi KÜTÜKTE [URN-POL-001]', () => {
  it('TÜRETME boş değil — kalıp bozulursa bekçi her şeyi geçirirdi [URN-POL-001]', () => {
    /* Sıfır ölçümle "kusur yok" demek hiçbir şeye bakmadan temiz
       raporlamaktır; sayı kapısı bu depoda tam bu şekilde kandırıldı. */
    expect(bulunan.length).toBeGreaterThanOrEqual(50);
  });

  it('KODDAKİ her cümle kütükte VAR [URN-POL-001]', () => {
    const kutuktekiler = new Set(kutuk.satirlar.map((s) => s.cumle));
    const eksik = bulunan.filter((b) => !kutuktekiler.has(b.cumle))
      .map((b) => `${b.yer} :: ${b.cumle}`);
    expect(eksik, `kütüğe girmemiş politika cümlesi:\n${eksik.join('\n')}\n`
      + 'çözüm: node arac/politika-kutugu.mjs --yaz ve satırı SINIFLA').toEqual([]);
  });

  it('KÜTÜKTEKİ her satır kodda VAR — ölü satır kalmaz [URN-POL-001]', () => {
    const koddakiler = new Set(bulunan.map((b) => b.cumle));
    const olu = kutuk.satirlar.filter((s) => !koddakiler.has(s.cumle))
      .map((s) => `${s.kod} :: ${s.cumle}`);
    expect(olu, `kodda olmayan kütük satırı (cümle değişti mi):\n${olu.join('\n')}`)
      .toEqual([]);
  });
});

describe('her POLİTİKA satırı BEYANLI [URN-POL-001]', () => {
  const politikalar = kutuk.satirlar.filter((s) => s.sinif === 'POLITIKA');

  it('sınıf ya POLITIKA ya IDDIA_DEGIL — sınıflanmamış satır KIRMIZI [URN-POL-001]', () => {
    const kusur = kutuk.satirlar
      .filter((s) => s.sinif !== 'POLITIKA' && s.sinif !== 'IDDIA_DEGIL')
      .map((s) => `${s.kod}: ${s.sinif}`);
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('IDDIA_DEGIL satırı NEDEN iddia olmadığını söyler [URN-POL-001]', () => {
    /* Kaçış kapısı gerekçesiz olamaz: "bu bir etiket" demek kolaydır,
       yazmak zordur. */
    const kusur = kutuk.satirlar
      .filter((s) => s.sinif === 'IDDIA_DEGIL' && (s.gerekce ?? '').length < 15)
      .map((s) => s.kod);
    expect(kusur, `gerekçesiz IDDIA_DEGIL: ${kusur.join(', ')}`).toEqual([]);
  });

  it('POLİTİKA satırı ya ÖLÇÜMÜNÜ ya ÖLÇÜLMEDİĞİNİ söyler — ikisi de yoksa KIRMIZI [URN-POL-001]', () => {
    const kusur = politikalar
      .filter((s) => !s.olcum && !s.olculmedi)
      .map((s) => `${s.kod} :: ${s.cumle.slice(0, 60)}`);
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('İKİSİ BİRDEN olamaz — ölçülen satır "ölçülmedi" taşıyamaz [URN-POL-001]', () => {
    const kusur = politikalar.filter((s) => s.olcum && s.olculmedi).map((s) => s.kod);
    expect(kusur, kusur.join(', ')).toEqual([]);
  });

  it('ÖLÇÜM referansı GERÇEK: dosya var ve vaka o dosyada [URN-POL-001]', () => {
    /* Ölü referans, kütüğü bir dilek listesine çevirir. */
    const kusur: string[] = [];
    for (const s of politikalar) {
      if (!s.olcum) continue;
      const yol = path.join(process.cwd(), s.olcum.dosya);
      if (!existsSync(yol)) { kusur.push(`${s.kod}: dosya yok — ${s.olcum.dosya}`); continue; }
      if (!readFileSync(yol, 'utf8').includes(s.olcum.vaka)) {
        kusur.push(`${s.kod}: vaka yok — "${s.olcum.vaka}" (${s.olcum.dosya})`);
      }
    }
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('ÖLÇÜLMEDİ satırı SAHİBİNİ ve KAPANIŞ AŞAMASINI taşır [URN-POL-001]', () => {
    /* "Süresiz beyan yoktur": sahipsiz bir erteleme üç hafta sonra
       sebebi bilinmeyen bir istisnadır. */
    const kusur = politikalar
      .filter((s) => s.olculmedi && (!s.olculmedi.sahip || !s.olculmedi.kapanisAsamasi))
      .map((s) => s.kod);
    expect(kusur, kusur.join(', ')).toEqual([]);
  });

  it('ÖLÇÜLMEYEN SAYISI TAVANI AŞMAZ — cırcır yalnız küçülür [URN-POL-001]', () => {
    const olculmeyen = politikalar.filter((s) => s.olculmedi).length;
    expect(olculmeyen, `ölçülmeyen politika cümlesi ${olculmeyen}, tavan ${kutuk.tavanlar.olculmeyen}`)
      .toBeLessThanOrEqual(kutuk.tavanlar.olculmeyen);
  });

  it('TAVAN ölçülenin ÜSTÜNDE tutulmaz — gevşeklik dişi [URN-POL-001]', () => {
    /* Tavan bugünkü sayının üstüne çıkarılırsa cırcır sessizce gevşer;
       `terimTavani` 85'ten 500'e çekildiğinde on bir vaka da yeşil
       kalıyordu (ölçüldü). */
    const olculmeyen = politikalar.filter((s) => s.olculmedi).length;
    expect(kutuk.tavanlar.olculmeyen).toBe(olculmeyen);
  });
});

describe('SONUÇ SINIFI ve CIRCIR [URN-POL-001]', () => {
  /* ── NEDEN SINIF ───────────────────────────────────────────────────
     "51 politika ölçülmüyor" tek başına bir sayıdır; hangisinin ihlali
     VERİ SIZDIRIR, hangisininki bir cümleyi yanıltır — bunu söylemez.
     Üç sonuç sınıfı bu ayrımı yapar ve en sıkı dişi S1 taşır. */
  const politikalar = kutuk.satirlar.filter((s) => s.sinif === 'POLITIKA');

  it('HER politika satırı sonuç sınıfı TAŞIR [URN-POL-001]', () => {
    const kusur = politikalar.filter((s) => !s.sonucSinifi).map((s) => s.kod);
    expect(kusur, kusur.join(', ')).toEqual([]);
  });

  it('SINIF ELLE VERİLMEZ — kütüktekiyle TÜRETİLEN aynı [URN-POL-001]', () => {
    /* Elle verilseydi bir cümle S1'den S3'e sessizce indirilebilir ve
       cırcırın en sıkı dişi buharlaşırdı — `terimTavani` 85'ten 500'e
       çekildiğinde on bir vakanın da yeşil kalması gibi. */
    const kusur = politikalar
      .filter((s) => s.sonucSinifi !== sonucSinifi(s.cumle))
      .map((s) => `${s.kod}: kütük ${s.sonucSinifi}, türetilen ${sonucSinifi(s.cumle)}`);
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('S1 · YETKİ VE GÜVENLİK: ÖLÇÜLMEYEN SIFIRDIR — istisna YOK [URN-POL-001]', () => {
    /* Bu sınıfın ihlali veri sızdırır ya da bir OT ağına paket yollar.
       R-C bekçisiyle aynı sertlik: gerekçeli istisna kabul edilmez. */
    const acik = politikalar
      .filter((s) => s.sonucSinifi === 'S1' && s.olculmedi)
      .map((s) => `${s.kod} :: ${s.cumle.slice(0, 70)}`);
    expect(acik, `ÖLÇÜLMEYEN S1 politikası:\n${acik.join('\n')}`).toEqual([]);
    expect(kutuk.tavanlar.sinif.S1, 'S1 tavanı sıfır olmalı').toBe(0);
  });

  it('SINIF TAVANLARI ölçülenle BİREBİR — gevşeklik dişi [URN-POL-001]', () => {
    const bugun: Record<string, number> = { S1: 0, S2: 0, S3: 0 };
    for (const s of politikalar) if (s.olculmedi) bugun[s.sonucSinifi ?? 'S3'] += 1;
    expect(kutuk.tavanlar.sinif).toEqual(bugun);
  });

  it('TAVAN YÜKSELMESİ DOSYADA GEREKÇE İSTER — beşinci diş [URN-POL-001]', () => {
    /* CIRCIRIN BEŞİNCİ DİŞİ.
       Tavan bugünkü sayıya eşit olmak zorunda (üçüncü diş) — ama sayı
       ARTARSA tavan da onunla artar ve cırcır sessizce gevşer. Bu depoda
       aynı kusur ölçüldü: `terimTavani` 85'ten 500'e çekildiğinde on bir
       vaka da yeşil kalıyordu.

       Bugün her yükselme dosyanın KENDİ İÇİNDE `tavanGerekceleri`
       altında `eski → yeni` olarak anlatılır. Commit mesajı yetmez:
       commit mesajı dosyayı okuyanın önünde durmaz.

       Gerekçe KUSURU anlatır, maliyeti değil: "bu turda yazmaya vaktimiz
       olmadı" bir gerekçe değildir; "ölçüm alanı şu sebeple genişledi"
       gerekçedir. */
    const gecmis = kutuk.tavanGerekceleri ?? [];
    const bugunku: Record<string, number> = {
      olculmeyen: kutuk.tavanlar.olculmeyen,
      'sinif.S1': kutuk.tavanlar.sinif.S1,
      'sinif.S2': kutuk.tavanlar.sinif.S2,
      'sinif.S3': kutuk.tavanlar.sinif.S3,
    };
    const kusur: string[] = [];
    for (const [alan, deger] of Object.entries(bugunku)) {
      const kayitlar = gecmis.filter((g) => g.alan === alan);
      if (kayitlar.length === 0) continue; /* hiç yükselmemiş */
      const son = kayitlar[kayitlar.length - 1];
      if (son.yeni !== deger) {
        kusur.push(`${alan}: tavan ${deger} ama son gerekçe ${son.eski} → ${son.yeni}`
          + ' diyor — yükselme gerekçesiz kalmış');
      }
      if (son.yeni <= son.eski) kusur.push(`${alan}: gerekçe bir YÜKSELME anlatmıyor`);
      if ((son.gerekce ?? '').trim().length < 40) {
        kusur.push(`${alan}: gerekçe çok kısa — kusuru anlatmıyor`);
      }
    }
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('TABAN DAL CIRCIRI: liste tabana göre BÜYÜYEMEZ [URN-POL-001]', () => {
    /* DÖRDÜNCÜ DİŞ. Tavan dosyanın kendi içinde tutarlı olabilir ve yine
       de gevşemiş olabilir: satır eklenir, tavan da onunla yükselir.
       Bu yüzden karşılaştırma TABAN DALDAN yapılır. Taban okunamazsa
       (yerelde `origin/main` yoksa) diş ATLANIR ve "ölçülmedi" denir —
       CI'da ise okunamamak KIRMIZIDIR ve öyle yazılır. */
    const git = (a: string[]) => execFileSync('git', a,
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

    /* ÜÇ HÂL AYRI OKUNUR ve ikisi kırmızı DEĞİLDİR:
         taban dal yok        → yerelde meşru, CI'da KIRMIZI
         taban dalda dosya yok → kütüğü GETİREN dal; diş uygulanamaz
         ikisi de var          → diş koşar */
    let tabanDalVar = true;
    try { git(['rev-parse', '--verify', 'origin/main']); } catch { tabanDalVar = false; }
    if (!tabanDalVar) {
      expect(process.env.CI ?? '',
        "CI'da taban dal okunamadı — cırcırın dördüncü dişi ölçülemedi").toBe('');
      return;
    }
    let taban: typeof kutuk | null = null;
    try {
      taban = JSON.parse(git(['show', 'origin/main:web/arac/politika-cumleleri.json']));
    } catch {
      /* Kütük tabanda YOK: bu dal onu getiriyor. Karşılaştıracak bir
         geçmiş yok; diş bir sonraki turda işler. */
      taban = null;
    }
    if (taban === null) return;
    const bugun = politikalar.filter((s) => s.olculmedi).length;
    const tabanSayi = (taban.satirlar ?? []).filter((s) => s.olculmedi).length;
    expect(bugun, `ölçülmeyen politika ${tabanSayi} → ${bugun}: liste YALNIZ küçülebilir`)
      .toBeLessThanOrEqual(tabanSayi);

    /* Takas da yakalanır: bir S1'i ölçüp yerine yeni bir S1 eklemek
       toplamı korur ama sınıfı bozar. */
    const tabanS1 = (taban.satirlar ?? [])
      .filter((s) => s.olculmedi && s.sonucSinifi === 'S1').length;
    const bugunS1 = politikalar.filter((s) => s.olculmedi && s.sonucSinifi === 'S1').length;
    expect(bugunS1, `ölçülmeyen S1 ${tabanS1} → ${bugunS1}`).toBeLessThanOrEqual(tabanS1);
  });
});

describe('KALIBIN KENDİ YÜRÜYÜŞÜ [URN-POL-001]', () => {
  it('ÖZNE koşulu alan doğrulamasını dışarıda tutar [URN-POL-001]', () => {
    /* Yalnız yüklem arandığında 1 137 aday çıkıyordu ve içi alan
       doğrulamasıyla doluydu; özne koşulu 72'ye indirdi. */
    expect(politikaMi('Negatif olamaz — lütfen düzeltin')).toBe(false);
    expect(politikaMi('Bitiş tarihi başlangıçtan önce olamaz')).toBe(false);
  });

  it('SİSTEM iddiası yakalanır [URN-POL-001]', () => {
    expect(politikaMi('Bu ekran ağı taramaz, kayıt varlık aktarımıyla gelir')).toBe(true);
    expect(politikaMi('Denetim izi değiştirilemez; bu kayıt yalnız okunur.')).toBe(true);
  });

  it('YORUMDAKİ cümle kütüğe girmez [URN-POL-001]', () => {
    const kod = "/* Bu ekran ağı taramaz — kayıt aktarımla gelir */\nconst x = 1;";
    expect(yorumsuz(kod)).not.toMatch(/taramaz/);
  });

  it('JSX parçası cümle sayılmaz [URN-POL-001]', () => {
    expect(politikaMi('<Im durum={durum} ad="MFA durumu" /> kayıt yalnız okunur'))
      .toBe(false);
  });
});
