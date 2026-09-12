import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  GEREKCE_ASGARI, kacisKapisiKusurlari, kaynakDizeleri, korGovdeSayisi,
  korToplamSayisi, politikaMi, sonucSinifi, turet, yeniSatirKusurlari, yorumsuz,
} from '../../arac/politika-kutugu.mjs';
import { tabanKarari, tabanOku } from '../../arac/olcum-tabani.mjs';
import { tabanDalKarari } from '../../arac/taban-dal.mjs';

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
  tavanlar: { olculmeyen: number; sinif: Record<string, number>;
    korToplam?: number };
  tavanGerekceleri?: { alan: string; eski: number; yeni: number; gerekce: string }[];
  satirlar: {
    kod: string; cumle: string; yer: string; sinif: string; gerekce?: string;
    sonucSinifi?: string;
    olcum?: { dosya: string; vaka: string };
    /* `gerekce` şemanın PARÇASIDIR ve öyle beyan edilir. Bağımsız
       inceleme (PR #51, tur 1) ölçtü: altıncı diş bu alanı istiyordu,
       kütüğün 39 `olculmedi` satırının HİÇBİRİNDE yoktu ve gerekçe
       metni `kapanisAsamasi` içine sıkışmıştı — üstelik oraya yazılan
       şey bir AŞAMA değil bir HIZDI ("her partide en az beş satır").
       İlk gerçek istisnayı yazan kişi, deponun mevcut şeklini izleyip
       beklenmedik bir kırmızıya çarpardı. */
    olculmedi?: { sahip: string; kapanisAsamasi: string; gerekce?: string };
  }[];
};

const bulunan = turet();

describe('politika cümlesi KÜTÜKTE [URN-POL-001]', () => {
  it('TÜRETME boş değil — kalıp bozulursa bekçi her şeyi geçirirdi [URN-POL-001]', () => {
    /* Sıfır ölçümle "kusur yok" demek hiçbir şeye bakmadan temiz
       raporlamaktır; sayı kapısı bu depoda tam bu şekilde kandırıldı. */
    /* Taban testin İÇİNE sabit yazılmaz: ölçülen 126 iken 50'lik bir
       sabit, arada 76 satırlık sessiz bir daralma penceresi bırakır.
       Taban `olcum-tabani.json`dan okunur ve yalnız `--taban-yaz
       --sebep=` ile iner (PR #51, tur 1 bulgusu). */
    const hata = tabanKarari('politika.cumle', bulunan.length, tabanOku().tabanlar);
    expect(hata, hata ?? '').toBeNull();
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

  it('IDDIA_DEGIL kaçış kapısı CIRCIRDADIR — sessiz indirme yok, yeni muafiyet gerekçeli [URN-POL-001]', () => {
    /* ── BULGU (bağımsız inceleme · düzeltme turu · P1-5) ──────────────
       Yedinci diş de, altıncı diş de, S1 tavanı da, sınıf cırcırı da aynı
       süzgeçle başlıyor: `s.sinif === 'POLITIKA'`. Ama `sinif` ELLE
       yazılıyor ve onu doğrulayan tek diş gerekçenin 15 karakterden uzun
       olmasıydı.

       Yani kilit MUTLAK DEĞİLDİ: yeni bir politika cümlesine
       `"sinif": "IDDIA_DEGIL"` + yirmi dört karakterlik bir gerekçe
       yazmak yedi dişin yedisini birden atlatıyordu. CLAUDE.md'nin
       "kilidi gevşetmek o dişi SİLMEYİ gerektirir" cümlesi bu yüzden
       doğru değildi: bir sayı değil, bir ETİKET değiştirmek yetiyordu.

       Bugün kaçış kapısının kendisi cırcırdadır: `IDDIA_DEGIL` sayısı
       taban dala (`origin/main`) göre BÜYÜYEMEZ. Bir cümleyi iddia
       saymamak hâlâ mümkündür — ama ancak başka birini iddia sayarak. */
    const git = (a: string[]) => execFileSync('git', a,
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    let tabanDalVar = true;
    try { git(['rev-parse', '--verify', 'origin/main']); } catch { tabanDalVar = false; }
    if (!tabanDalVar) {
      expect(process.env.CI ?? '', "CI'da taban dal okunamadı").toBe('');
      return;
    }
    const YOL = 'origin/main:web/arac/politika-cumleleri.json';
    let tabandaVar = true;
    try { git(['cat-file', '-e', YOL]); } catch { tabandaVar = false; }
    let ham: string | null = null;
    if (tabandaVar) { try { ham = git(['show', YOL]); } catch { ham = null; } }
    const karar = tabanDalKarari(tabandaVar, ham);
    if (karar.hal === 'olculemedi') {
      expect(process.env.CI ?? '', `TABAN DAL ÖLÇÜLEMEDİ (${karar.sebep})`).toBe('');
      return;
    }
    /* SESSİZ `return` KALDIRILDI (düzeltme turu · P2-4): bu bir KÜME
       cırcırıdır ve tabanın yokluğu eksiklik değil, EN SIKI hâldir —
       taban BOŞ KÜMEdir, yani satırların hepsi yenidir ve hepsi yeni
       satır kuralından geçer. Eski satır sessizce dönüyordu, yani kütük
       taban dalda yoksa (adı değişti, yeni doğdu) diş hiç koşmuyordu. */
    const taban = karar.hal === 'taban_yok'
      ? { satirlar: [] as { cumle: string; sinif: string }[] }
      : karar.belge as { satirlar: { cumle: string; sinif: string }[] };
    /* ── ÜÇ KUSUR, TEK SAF KARAR (düzeltme turu · tur 2 · P2-8) ───────
       Kural `kacisKapisiKusurlari` içine TAŞINDI. Sebebi bu dosyanın
       kendi kuralı: "kural saf bir fonksiyondadır ve sentetik kütüklerle
       sınanır — sabotaj kuralı sabote eder, ölçüm ortamını değil."
       Karar test gövdesinin içinde yazılıyken onu sınamanın tek yolu
       GERÇEK depoyu ve GERÇEK taban dalı kurcalamaktı.

       Üçüncü kusur BU TURDA eklendi ve kütükte GERÇEK bir satır yaktı:
       POL-193 (giriş ekranının tanıtım satırı) `IDDIA_DEGIL` etiketiyle
       girmişti, gerekçesi 209 karakterdi — yani (a) ve (b) dişlerinin
       ikisinden de temiz geçiyordu. Ama cümlesi S1 TÜRETİYORDU
       ("tesis kapsamı… değişmez denetim izi"). Altıncı dişin "S1'de
       gerekçeli istisna kabul edilmez" kuralı `sinif === 'POLITIKA'`
       süzgecinin ARKASINDA durduğu için etiketi değiştiren satır dişin
       ÖNÜNE hiç gelmiyordu. Satır POLITIKA'ya çevrildi ve gerçek yol
       ölçümüne bağlandı — sayı düşürülmedi, YÜKSELTİLDİ. */
    const tabanSinif = new Map(taban.satirlar.map((s) => [s.cumle, s.sinif]));
    const kusur = kacisKapisiKusurlari(kutuk.satirlar, tabanSinif);
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

  it('YEDİNCİ DİŞ · BORÇ SIFIRDA KİLİTLİ — hiçbir sınıf yeniden açılamaz [URN-POL-001]', () => {
    /* ── R0-17 KAPANDI (Brief L) ──────────────────────────────────────
       S1 · S2 · S3'ün üçü de sıfırlandı: 123 politika cümlesinin 123'ü
       gerçek yolla ölçülüyor. Bu dişten ÖNCE cırcır yalnız "büyümesin"
       diyordu; sıfıra inen bir borç için bu yetmez — yarın eklenen
       ölçüsüz bir cümle tavanı 0'dan 1'e çıkarır ve öbür dişler bunu
       "tavan ölçülene eşit" diye GEÇİRİRDİ.

       Bugün kilit mutlaktır: ÖLÇÜLMEYEN POLİTİKA CÜMLESİ SIFIRDIR.
       Yeni bir cümle ölçümüyle birlikte gelir (altıncı diş zaten bunu
       istiyor); ölçümsüz geliyorsa kapı kırmızıdır ve gerekçe onu
       açmaz. Kilidi gevşetmek, bu dişi SİLMEYİ gerektirir — sessizce
       bir sayı büyütmeyi değil. */
    const acik = politikalar
      .filter((s) => s.olculmedi)
      .map((s) => `${s.kod} (${s.sonucSinifi}) :: ${s.cumle.slice(0, 70)}`);
    expect(acik, `ÖLÇÜLMEYEN politika cümlesi — borç SIFIRDA kilitli:\n${acik.join('\n')}`)
      .toEqual([]);
    expect(kutuk.tavanlar.olculmeyen, 'toplam tavan sıfır olmalı').toBe(0);
    for (const sinif of ['S1', 'S2', 'S3'] as const) {
      expect(kutuk.tavanlar.sinif[sinif], `${sinif} tavanı sıfır olmalı`).toBe(0);
    }
    /* Popülasyon dişi: kütük boşalırsa yukarıdaki her şey sıfır turda
       yeşil biterdi — "hiç cümle yok" ile "hepsi ölçülü" aynı görünür. */
    expect(politikalar.length, 'politika kütüğü BOŞ — vaka hiçbir şey ölçmedi')
      .toBeGreaterThan(100);
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

       ── DİŞİN KENDİ KUSURU · ÖLÇÜLDÜ (10 Eylül 2026) ─────────────────
       İlk yazımda diş, son gerekçenin `yeni` değerinin BUGÜNKÜ tavana
       EŞİT olmasını istiyordu. Bu, yükselmeyi değil DEĞİŞMEYİ ölçüyordu:
       S2 tavanı 26'dan SIFIRA indirildiğinde — yani cırcır tam da
       istenen yönde sıkıldığında — diş kırmızı yandı ve iyileştirmeyi
       bloke etti. Bir gevşeklik dişinin sıkılaşmayı cezalandırması,
       dişin kendi kusurudur.

       Bugün yükselmenin olup olmadığı DOSYANIN İÇİNDEN değil TABAN
       DALDAN okunur: `origin/main`deki tavan ile bugünkü tavan
       karşılaştırılır. Düşüş ve eşitlik gerekçe istemez; YÜKSELİŞ,
       tam o yükselişi (`eski` → `yeni`) adıyla anlatan bir gerekçe
       ister. Böylece "0'dan 5'e çık, eski bir 24→26 kaydına yaslan"
       kaçamağı da kapanır.

       Gerekçe KUSURU anlatır, maliyeti değil: "bu turda yazmaya vaktimiz
       olmadı" bir gerekçe değildir; "ölçüm alanı şu sebeple genişledi"
       gerekçedir. */
    const git = (a: string[]) => execFileSync('git', a,
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    let tabanDalVar = true;
    try { git(['rev-parse', '--verify', 'origin/main']); } catch { tabanDalVar = false; }
    if (!tabanDalVar) {
      expect(process.env.CI ?? '',
        "CI'da taban dal okunamadı — cırcırın beşinci dişi ölçülemedi").toBe('');
      return;
    }
    let taban: typeof kutuk | null = null;
    try {
      taban = JSON.parse(git(['show', 'origin/main:web/arac/politika-cumleleri.json']));
    } catch { taban = null; }
    if (taban === null) return; /* kütüğü GETİREN dal */

    /* ── R0-23 TAVANI DA DENETİMDE (Codex bulgusu) ───────────────────
       Anahtar haritası yalnız `olculmeyen` ve `sinif.*` okuyordu; yeni
       `korToplam` tavanı bu denetimin DIŞINDAYDI. Kör küme büyüdüğünde
       tavanı yeni sayıya çekmek vakayı geçiriyor ve DONDURULMUŞ SINIR
       sessizce yükselmiş oluyordu — gerekçe istenmeden. Dondurmanın
       anlamı tam da bunu engellemek.

       R0-23'ün KİLİT SAYISI TEKTİR ve ADAY POPÜLASYONUN TAMAMIDIR
       (`korToplam`). Çekimli gövde taşıyan alt küme (`korGovde`) bir
       tavan DEĞİL bilgidir ve bu haritaya girmez — gerekçesi kusurdur:
       üst küme sabitken alt küme büyüyebilir (kör bir cümleyi çekimli
       özneyle yeniden yazmak körlüğü değiştirmez, alt kümeyi bir
       artırır) ve bir alt küme tavanı o temiz dalı kırmızı yakardı;
       kapı değil MAYIN olurdu. Üst küme kilitli olduğu için alt küme
       zaten onu aşamaz. */
    const oku = (k: typeof kutuk): Record<string, number> => ({
      olculmeyen: k.tavanlar.olculmeyen,
      'sinif.S1': k.tavanlar.sinif.S1,
      'sinif.S2': k.tavanlar.sinif.S2,
      'sinif.S3': k.tavanlar.sinif.S3,
      korToplam: k.tavanlar.korToplam ?? 0,
    });
    const bugunku = oku(kutuk);
    const tabanki = oku(taban);
    const gecmis = kutuk.tavanGerekceleri ?? [];
    const kusur: string[] = [];
    for (const [alan, deger] of Object.entries(bugunku)) {
      const eski = tabanki[alan];
      if (deger <= eski) continue; /* düşüş ya da eşitlik: gerekçe istemez */
      const kayit = gecmis.find((g) => g.alan === alan && g.eski === eski && g.yeni === deger);
      if (!kayit) {
        kusur.push(`${alan}: tavan ${eski} → ${deger} YÜKSELDİ ama dosyada `
          + 'tam bu yükselmeyi anlatan bir gerekçe yok');
        continue;
      }
      if ((kayit.gerekce ?? '').trim().length < 40) {
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

describe('ALTINCI DİŞ · YENİ CÜMLENİN VARSAYILANI ÖLÇÜLÜ [URN-POL-001]', () => {
  /* ── NEDEN AYRI DİŞ ─────────────────────────────────────────────────
     Cırcırın ilk beş dişi TOPLAMA bakar. Beşi de yeşilken şu geçebilir
     (ölçüldü, sentetik): iki eski cümle ölçülür, bir YENİ cümle
     ölçülmeden eklenir — toplam 65'ten 64'e iner, liste "küçüldü",
     ve depoya ölçülmemiş yeni bir iddia girer.

     Cırcır BORCU ölçer, borcun BİLEŞİMİNİ değil. Yeni satır bu yüzden
     ayrı yargılanır.

     Vakalar SAF fonksiyona koşulur (`yeniSatirKusurlari`): git durumuna
     bağlı olmadıkları için hem CI'da hem yerelde aynı şeyi ölçerler ve
     sabotaj kuralı sabote eder, ölçüm ortamını değil. */

  const TABAN = new Set(['Bu ekran eski bir cümledir ve tabanda vardır.']);
  const satir = (ek: Record<string, unknown>) => ({
    kod: 'POL-TEST', sinif: 'POLITIKA',
    cumle: 'Bu ekran kaydı silmez; arşivler ve iz bırakır', ...ek,
  });
  /* 40 karakteri geçen, KUSURU anlatan bir gerekçe. */
  const GEREKCE = 'Vakayı süren yol henüz yok: ekran bu iddiayı taşıyor ama '
    + 'onu uygulayan katman P2 ile geliyor.';

  it('YENİ + ÖLÇÜLÜ satır temizdir — varsayılan budur [URN-POL-001]', () => {
    const k = yeniSatirKusurlari(
      [satir({ olcum: { dosya: 'tests/x.test.ts', vaka: 'y' } })], TABAN);
    expect(k).toEqual([]);
  });

  it('YENİ + ÖLÇÜMSÜZ + GEREKÇESİZ satır KIRMIZI [URN-POL-001]', () => {
    const k = yeniSatirKusurlari([satir({})], TABAN);
    expect(k.length, k.join('\n')).toBe(1);
    expect(k[0]).toMatch(/ne ÖLÇÜM ne GEREKÇE/);
  });

  it('AŞAMASIZ GEREKÇE kabul edilmez [URN-POL-001]', () => {
    /* "Süresiz beyan yoktur" kuralının bu kütükteki karşılığı: gerekçe
       tek başına yetmez, kapanış aşamasını da yazmalıdır. */
    const k = yeniSatirKusurlari(
      [satir({ olculmedi: { sahip: 'KODLAYAN', gerekce: GEREKCE } })], TABAN);
    expect(k.length, k.join('\n')).toBe(1);
    expect(k[0]).toMatch(/AŞAMASIZ GEREKÇE/);
  });

  it('GEREKÇE + AŞAMA birlikte olunca istisna GEÇERLİDİR [URN-POL-001]', () => {
    /* Diş bir yasak değil, bir BEDEL koyar: istisna mümkündür ama
       yazılıdır ve kapanışı bellidir. */
    const k = yeniSatirKusurlari([satir({
      olculmedi: { sahip: 'KODLAYAN', kapanisAsamasi: 'P2', gerekce: GEREKCE },
    })], TABAN);
    expect(k).toEqual([]);
  });

  it('KISA GEREKÇE kusuru anlatmaz — KIRMIZI [URN-POL-001]', () => {
    /* "Vakit yoktu" bir gerekçe değildir; maliyeti anlatan cümle de
       değildir (CLAUDE.md: gerekçe kusuru anlatır, maliyeti değil). */
    const k = yeniSatirKusurlari([satir({
      olculmedi: { sahip: 'KODLAYAN', kapanisAsamasi: 'P2', gerekce: 'vakit yoktu' },
    })], TABAN);
    expect(k.length, k.join('\n')).toBe(1);
    expect(k[0]).toMatch(/GEREKÇESİ yok ya da/);
    expect('vakit yoktu'.length).toBeLessThan(GEREKCE_ASGARI);
  });

  it('S1 · YENİ cümlede GEREKÇE HİÇ KABUL EDİLMEZ [URN-POL-001]', () => {
    /* İhlali veri sızdıran bir cümle, gerekçesi ne olursa olsun
       ölçülmeden depoya giremez — R-C bekçisiyle aynı sertlik. */
    const cumle = 'Bu ekran yetkisiz kullanıcıya kapsam dışı kaydı göstermez';
    expect(sonucSinifi(cumle), 'vaka gerçekten S1 sürmeli').toBe('S1');
    const k = yeniSatirKusurlari([satir({
      cumle, olculmedi: { sahip: 'KODLAYAN', kapanisAsamasi: 'P2', gerekce: GEREKCE },
    })], TABAN);
    expect(k.length, k.join('\n')).toBe(1);
    expect(k[0]).toMatch(/S1.*ÖLÇÜLMEDEN giremez/);
  });

  it('SINIF KÜTÜKTEN DEĞİL CÜMLEDEN türetilir — S3 etiketiyle kaçılamaz [URN-POL-001]', () => {
    /* Sınıf kütükten okunsaydı, yeni bir S1 cümlesine elle "S3" yazıp
       dişin en sıkı dalından kaçmak mümkün olurdu. */
    const k = yeniSatirKusurlari([satir({
      cumle: 'Bu ekran yetkisiz kullanıcıya kapsam dışı kaydı göstermez',
      sonucSinifi: 'S3',
      olculmedi: { sahip: 'KODLAYAN', kapanisAsamasi: 'P2', gerekce: GEREKCE },
    })], TABAN);
    expect(k.length, k.join('\n')).toBe(1);
    expect(k[0]).toMatch(/S1/);
  });

  it('ESKİ satır bu dişin konusu DEĞİL — cırcırın öbür dişleri tutar [URN-POL-001]', () => {
    const k = yeniSatirKusurlari(
      [{ kod: 'POL-ESKI', sinif: 'POLITIKA', cumle: [...TABAN][0] }], TABAN);
    expect(k).toEqual([]);
  });

  it('IDDIA_DEGIL satırı politika değildir — diş ona bakmaz [URN-POL-001]', () => {
    const k = yeniSatirKusurlari(
      [satir({ sinif: 'IDDIA_DEGIL', gerekce: 'bir durum etiketi' })], TABAN);
    expect(k).toEqual([]);
  });

  it('TOPLAM DÜŞERKEN SIZAN CÜMLE yakalanır — dişin var oluş sebebi [URN-POL-001]', () => {
    /* Cırcırın körlüğünün kendisi: liste küçülürken içeri ölçülmemiş
       yeni bir iddia girer. Beş diş de yeşil kalır, altıncı yanar. */
    const eskiler = ['a', 'b', 'c'].map((c) => `Bu ekran ${c} kaydını silmez`);
    const taban = new Set(eskiler);
    /* İki eskisi ölçüldü, biri hâlâ ölçümsüz, YENİ bir ölçümsüz eklendi:
       ölçülmeyen 3 → 2, yani liste KÜÇÜLDÜ. */
    const bugun = [
      { kod: 'P1', sinif: 'POLITIKA', cumle: eskiler[0], olcum: { dosya: 'x', vaka: 'y' } },
      { kod: 'P2', sinif: 'POLITIKA', cumle: eskiler[1], olcum: { dosya: 'x', vaka: 'y' } },
      { kod: 'P3', sinif: 'POLITIKA', cumle: eskiler[2], olculmedi: { sahip: 'K', kapanisAsamasi: 'P2' } },
      { kod: 'P4', sinif: 'POLITIKA', cumle: 'Bu ekran yeni kaydı silmez', olculmedi: { sahip: 'K', kapanisAsamasi: 'P2' } },
    ];
    const oncekiOlculmeyen = taban.size;
    const bugunkuOlculmeyen = bugun.filter((s) => !s.olcum).length;
    expect(bugunkuOlculmeyen, 'kurgu gerçekten KÜÇÜLME göstermeli')
      .toBeLessThan(oncekiOlculmeyen);
    const k = yeniSatirKusurlari(bugun, taban);
    expect(k.length, `liste küçülürken sızan cümle görülmedi:\n${k.join('\n')}`).toBe(1);
    expect(k[0]).toMatch(/^P4:/);
  });

  /* ─────────────────────────────────────────────────────────────────
     KAÇIŞ KAPISININ KENDİSİ · SAF VAKALAR (düzeltme turu · P2-8)
     Üç kusurun üçü de sentetik kütükle sınanır; kural depodan ve git
     durumundan bağımsızdır. */

  it('KAÇIŞ · sessiz indirme yakalanır — tabanda POLITIKA, dalda IDDIA_DEGIL [URN-POL-001]', () => {
    const c = 'Bu ekran hiçbir kaydı silmez';
    const k = kacisKapisiKusurlari(
      [{ kod: 'P1', sinif: 'IDDIA_DEGIL', cumle: c, gerekce: 'x'.repeat(GEREKCE_ASGARI + 10) }],
      new Map([[c, 'POLITIKA']]));
    expect(k.length, k.join('\n')).toBe(1);
    expect(k[0]).toMatch(/tabanda POLITIKA/);
  });

  it('KAÇIŞ · YENİ S1 cümlesi IDDIA_DEGIL olamaz — gerekçe ne kadar uzun olursa olsun [URN-POL-001]', () => {
    /* Dişin var oluş sebebi: POL-193 tam böyle girmişti — 209 karakterlik
       gerekçe, temiz (a) ve (b), ve S1 türeten bir cümle. */
    const c = 'Regülasyon maddeleri, tesis kapsamı, bulgu ve kanıt zinciri '
      + 'ile değişmez denetim izi.';
    expect(sonucSinifi(c), 'vaka gerçekten S1 sürmeli').toBe('S1');
    const k = kacisKapisiKusurlari(
      [{ kod: 'P1', sinif: 'IDDIA_DEGIL', cumle: c, gerekce: 'x'.repeat(220) }],
      new Map());
    expect(k.length, k.join('\n')).toBe(1);
    expect(k[0]).toMatch(/S1 TÜRETİYOR/);
  });

  it('KAÇIŞ · zayıf gerekçeli YENİ satır yakalanır; güçlü gerekçeli S3 geçer [URN-POL-001]', () => {
    const c = 'Bekleyen reddedilen kayıt yok — kuyruk boş';
    expect(sonucSinifi(c), 'vaka S1 olmamalı, yoksa öbür dişi ölçerdik').not.toBe('S1');
    const zayif = kacisKapisiKusurlari(
      [{ kod: 'P1', sinif: 'IDDIA_DEGIL', cumle: c, gerekce: 'durum etiketi' }], new Map());
    expect(zayif.length, zayif.join('\n')).toBe(1);
    expect(zayif[0]).toMatch(/karakterden kısa/);
    const guclu = kacisKapisiKusurlari(
      [{ kod: 'P1', sinif: 'IDDIA_DEGIL', cumle: c, gerekce: 'x'.repeat(GEREKCE_ASGARI) }],
      new Map());
    expect(guclu).toEqual([]);
  });

  it('KAÇIŞ · TABANDA ZATEN IDDIA_DEGIL olan satır yeniden yargılanmaz [URN-POL-001]', () => {
    /* Aksi hâlde diş, S1 kalıbı genişlediği gün eski satırları toptan
       kırmızı yakar ve kalıbı genişletmeyi — yani körlüğü düzeltmeyi —
       cezalandırırdı. Eski satırların yolu cırcırın öbür dişleridir. */
    const c = 'Kapsamınızdaki tesisler için yetki gerekir';
    expect(sonucSinifi(c)).toBe('S1');
    const k = kacisKapisiKusurlari(
      [{ kod: 'P1', sinif: 'IDDIA_DEGIL', cumle: c, gerekce: 'kısa' }],
      new Map([[c, 'IDDIA_DEGIL']]));
    expect(k).toEqual([]);
  });

  it('KAÇIŞ · POLITIKA satırı bu dişin konusu değil [URN-POL-001]', () => {
    const k = kacisKapisiKusurlari(
      [{ kod: 'P1', sinif: 'POLITIKA', cumle: 'Bu ekran yetki ister', olcum: { dosya: 'x', vaka: 'y' } }],
      new Map());
    expect(k).toEqual([]);
  });

  it('GERÇEK KÜTÜK: taban dala göre yeni satırların hepsi kuralı geçer [URN-POL-001]', () => {
    /* Saf vakalar kuralı ölçer; bu vaka DEPOYU ölçer. Üç hâl dördüncü
       dişteki gibi ayrı okunur. */
    const git = (a: string[]) => execFileSync('git', a,
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    let tabanDalVar = true;
    try { git(['rev-parse', '--verify', 'origin/main']); } catch { tabanDalVar = false; }
    if (!tabanDalVar) {
      expect(process.env.CI ?? '',
        "CI'da taban dal okunamadı — altıncı diş ölçülemedi").toBe('');
      return;
    }
    const YOL = 'origin/main:web/arac/politika-cumleleri.json';
    let tabandaVar = true;
    try { git(['cat-file', '-e', YOL]); } catch { tabandaVar = false; }
    let ham: string | null = null;
    if (tabandaVar) { try { ham = git(['show', YOL]); } catch { ham = null; } }
    /* ÜÇ HÂL TEK KARARDA (`arac/taban-dal.mjs`); sentetik vakaları
       `tests/bekci/bos-durum.test.ts` içinde. */
    const karar = tabanDalKarari(tabandaVar, ham);
    if (karar.hal === 'olculemedi') {
      expect(process.env.CI ?? '',
        `TABAN DAL ÖLÇÜLEMEDİ (${karar.sebep}) — altıncı diş koşmadı`).toBe('');
      return;
    }
    /* SESSİZ `return` KALDIRILDI (düzeltme turu · P2-4): küme cırcırı,
       taban yoksa BOŞ KÜME ile koşar — her satır yenidir. */
    const taban = karar.hal === 'taban_yok'
      ? { satirlar: [] as { cumle: string }[] }
      : karar.belge as { satirlar?: { cumle: string }[] };
    const tabanCumleleri = new Set((taban.satirlar ?? []).map((s) => s.cumle));
    /* KAÇ SATIR YARGILANDI. Bağımsız inceleme (PR #51, tur 1) ölçtü: bu
       dalın altı yeni satırının altısı da `olcum` taşıdığı için kural
       BOŞ KÜME üzerinde koştu ve vaka yine yeşil yandı — "temiz" ile
       "hiç bakılmadı" ayırt edilemiyordu. Sayı yazılınca ayrılır. */
    const yeniler = kutuk.satirlar.filter(
      (s) => s.sinif === 'POLITIKA' && !tabanCumleleri.has(s.cumle));
    console.log(`altıncı diş · yargılanan YENİ politika satırı: ${yeniler.length}`);
    const kusur = yeniSatirKusurlari(kutuk.satirlar, tabanCumleleri);
    expect(kusur, `YENİ politika cümlesi ölçüsüz girmiş:\n${kusur.join('\n')}`)
      .toEqual([]);
    /* ── SAYI YAZILIR, ŞART KOŞULMAZ ───────────────────────────────────
       İlk yazım `yeniler.length > 0` istiyordu ve bu bir kapı değil bir
       MAYINDI (bağımsız inceleme, PR #51 tur 2): "hiç yeni politika
       cümlesi yok" sağlıklı ve beklenen hâldir. Bu PR merge edilir
       edilmez, ekran metnine dokunmayan HER dal kırmızı yanacaktı —
       kusur yok, dal temiz, kapı yanlış. Kapının ilk susturulacağı yer
       tam olarak burasıdır.

       Ölçülmek istenen şey "her dal yeni cümle getirir" değil, "KÜTÜK
       DEĞİŞTİYSE diş boş küme üzerinde koşmadı"dır. Koşul da ona
       bağlandı. */
    let kutukDegisti = true;
    try { git(['diff', '--quiet', 'origin/main', '--', 'web/arac/politika-cumleleri.json']); kutukDegisti = false; }
    catch { kutukDegisti = true; }
    if (kutukDegisti) {
      expect(yeniler.length, 'kütük bu dalda DEĞİŞTİ ama taban dala göre yeni '
        + 'POLITIKA satırı yok — altıncı diş boş küme üzerinde koştu')
        .toBeGreaterThan(0);
    }
  });

  it('KÜTÜKTEKİ her `olculmedi` satırı ŞEMAYA uyar — üç alan da dolu [URN-POL-001]', () => {
    /* Diş yalnız YENİ satırları yargılar; eski satırlar bu şemayı
       taşımasaydı kütük ile kural sessizce ayrışırdı ve ayrışma ancak
       ilk istisnayı yazan kişinin önünde patlardı. */
    const kusur: string[] = [];
    const politikalar = kutuk.satirlar.filter((x) => x.sinif === 'POLITIKA');
    for (const s of politikalar) {
      const b = s.olculmedi;
      if (!b) continue;
      if (!(b.sahip ?? '').trim()) kusur.push(`${s.kod}: SAHİPSİZ`);
      if (!(b.kapanisAsamasi ?? '').trim()) kusur.push(`${s.kod}: AŞAMASIZ`);
      if ((b.gerekce ?? '').trim().length < GEREKCE_ASGARI) {
        kusur.push(`${s.kod}: GEREKÇE yok ya da kusuru anlatmıyor`);
      }
    }
    expect(kusur, kusur.join('\n')).toEqual([]);
    /* SAYI YAZILIR, ŞART KOŞULMAZ — aynı sınıf (PR #51 tur 2). Borç
       sıfırlandığı gün (S3 39 → 0) bir şart, İSTENEN durumu kırmızı
       yakardı. Sayı raporlanır; sıfırsa bu vaka ölçüm yapmadığını
       SÖYLER ve kaldırılması gerektiğini yazar. */
    const olculmeyen = politikalar.filter((s) => s.olculmedi).length;
    if (olculmeyen === 0) {
      console.log('ÖLÇÜM YOK: kütükte `olculmedi` satırı kalmamış — '
        + 'bu vaka artık boş küme ölçüyor, kaldırılabilir.');
    } else {
      console.log(`\`olculmedi\` şeması ölçüldü: ${olculmeyen} satır`);
    }
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


/* ═══ DİZE TARAYICISININ KENDİSİ · SENTETİK VAKALAR ═══════════════════
   Tarayıcı geçen tur regex yerine yazıldı ve HİÇBİR VAKAYA bağlanmadı —
   yani popülasyonu üreten kod, deponun "ölçülmemiş kural" tarifine tam
   olarak uyuyordu. Vakalar burada. */
/* ═══ R0-23 · BEYANLI SINIR DONDURULDU · TEK SAYI ═════════════════════
   `OZNE` özneleri YALIN hâlleriyle arar; çekimli hâlleri ("kütüğün" ·
   "kaydı" · "ürünün") ve öznesi hiç olmayanları GÖRMEZ. Sınır bu turda
   genişletilmedi: kalıbı gövdeye çevirmek ölçülmemiş yeni bir borç açar
   ve bu kütüğün yedinci dişi SIFIRDA KİLİTLİ — her satır gerçek yol
   ölçümüyle gelmek zorunda.

   ── KİLİT SAYI TEKTİR: ADAY POPÜLASYONUN TAMAMI ────────────────────
   Rapor bir ara üç sayı taşıdı ve uzlaşmamıştı. Üçü de AYNI yürüyüşten
   çıkar ve tam olarak şunları sayar:

     357  ADAY POPÜLASYON  `korToplamSayisi()` — 25–400 karakter, en az
                           dört sözcük, JSX/biçem parçası değil, YÜKLEM
                           var, YALIN ÖZNE yok.              ← KİLİT
      51  ALT KÜME         bu 357'nin `OZNE_GOVDE` taşıyanı.  ← BİLGİ
     382  ESKİ/GEÇERSİZ    aynı yürüyüşün, aday süzgeci `politikaMi`
                           ile hizalanmadan önceki hâli; aradaki 25
                           satır politika cümlesi OLAMAZ (ithal yolu,
                           JSX parçası, dört sözcükten kısa dize).
                           Ölçüldü: 357 + 25 = 382.

   ── ALT KÜME NEDEN TAVAN DEĞİL ─────────────────────────────────────
   Alt kümeyi dondurmak üst kümeyi serbest bırakır — P2-14'ün bulduğu
   deliğin ta kendisi. Tersi de kapı değil MAYIN olurdu: üst küme
   sabitken alt küme büyüyebilir, çünkü kör bir cümleyi "Onay olmadan
   yayımlanmaz" yerine "Kaydın onayı olmadan yayımlanmaz" diye yeniden
   yazmak KÖRLÜĞÜ HİÇ DEĞİŞTİRMEZ ama alt kümeyi bir artırır; bir alt
   küme tavanı o temiz dalı kırmızı yakardı. Üst küme kilitli olduğu
   için alt küme zaten onu aşamaz (51 ≤ 357): kapsam kaybı yok.

   Dondurma şudur: ADAY SAYISI BÜYÜYEMEZ. Türeticinin görmediği yeni bir
   politika cümlesi sayıyı artırır ve kapı kırmızı yanar; yazan kişi ya
   kalıbın gördüğü bir özne hâli kullanır ya da kalıbı genişletip borcu
   üstlenir. Tavanın kendisi de taban dala göre kilitlidir (beşinci diş)
   ve sınırın ikinci bekçisi DOM tanığıdır. */
describe('R0-23 · ÇEKİMLİ ÖZNE SINIRI BÜYÜYEMEZ [URN-POL-001]', () => {
  it('KİLİT SAYI: aday popülasyonun TAMAMI tavanlı [URN-POL-001]', () => {
    /* İlk yazım yalnız ALT KÜMEYİ (51) donduruyor ve buna "beyanlı sınır
       donduruldu" diyordu. Ölçüldü (bağımsız inceleme · P2-14): aday
       sayısı 357 — tavan sınırın yedide birini kapsıyordu. Öznesi hiç
       olmayan yeni bir cümle ("Onay olmadan yayımlanmaz.") kör kümeyi
       büyütür ve hiçbir kapı yanmazdı. */
    const toplam = korToplamSayisi();
    const tavan = kutuk.tavanlar.korToplam ?? 0;
    console.log(`R0-23 · KİLİT SAYI · aday popülasyon: ${toplam} (tavan ${tavan})`
      + ` · alt küme (bilgi): ${korGovdeSayisi()}`);
    expect(toplam,
      `BEYANLI SINIR BÜYÜDÜ: ${tavan} → ${toplam}. Türeticinin GÖRMEDİĞİ yeni bir `
      + 'politika adayı eklendi. Ya kalıbın gördüğü bir özne hâli kullanın, ya '
      + '`OZNE`yi genişletip açılan borcu bu partide eritin, ya da tavanı '
      + '`tavanGerekceleri` altında gerekçesiyle yükseltin.')
      .toBeLessThanOrEqual(tavan);
  });

  it('ALT KÜME TAVAN DEĞİL — kütükte tavanı BULUNMAMALI [URN-POL-001]', () => {
    /* Uzlaştırma kararının kendisi ölçülür: `korGovde` bir tavan olarak
       geri gelirse yukarıdaki mayın da geri gelmiş olur. Alt küme
       bilgidir ve yalnız kayıt satırında görünür. */
    expect('korGovde' in kutuk.tavanlar,
      'ALT KÜME YENİDEN TAVAN OLMUŞ: `tavanlar.korGovde` geri gelmiş. Kilit sayı '
      + 'TEKTİR (aday popülasyon); alt küme tavanı, körlüğü hiç değiştirmeyen bir '
      + 'yeniden yazımda temiz dalı kırmızı yakar.')
      .toBe(false);
  });

  it('SINIR GERÇEKTEN BİR SINIR — kör sayı sıfır değil [URN-POL-001]', () => {
    /* Sıfır olsaydı "beyanlı sınır" cümlesi yalan olurdu ve diş hiçbir
       şey ölçmezdi. Sayı ayrıca TABANLIDIR: sıfıra düşerse ya sınır
       gerçekten kapandı (kalıp genişledi) ya da ÖLÇÜM bozuldu — ikisi
       de bakılmadan geçilemez. Kilit sayı da alt küme de sorulur:
       ikisinden biri sıfırlanırsa yürüyüş bozulmuş demektir. */
    expect(korToplamSayisi(), 'aday sayısı 0 — ölçüm bozulmuş olabilir')
      .toBeGreaterThan(0);
    expect(korGovdeSayisi(), 'alt küme 0 — ölçüm bozulmuş olabilir')
      .toBeGreaterThan(0);
  });
});

describe('KAYNAK DİZE TARAYICISI [URN-POL-001]', () => {
  it('AÇGÖZLÜ ALTERNATİF kusuru geri gelmez — uzun eşleşme kısa dizeyi YUTAMAZ [URN-POL-001]', () => {
    /* Tarayıcının var oluş sebebi: eski regex alternatifleri açgözlüydü
       ve tavan 300→400 çıkarılınca POL-062 kütükten SESSİZCE düştü —
       tavanı YÜKSELTMEK popülasyonu KÜÇÜLTÜYORDU. */
    const kod = `const a = "${'u'.repeat(350)}"; const b = 'Bu ekran hiçbir kaydı silmez';`;
    const dar = kaynakDizeleri(kod, 25, 300);
    const genis = kaynakDizeleri(kod, 25, 400);
    expect(dar).toContain('Bu ekran hiçbir kaydı silmez');
    expect(genis, 'tavan yükselince kısa dize kayboldu — açgözlü yutma geri geldi')
      .toContain('Bu ekran hiçbir kaydı silmez');
    expect(genis.length, 'tavan yükselince popülasyon KÜÇÜLDÜ').toBeGreaterThan(dar.length);
  });

  it('TÜRKÇE KESME İŞARETİ tırnak değildir — arasındaki dize YUTULMAZ [URN-POL-001]', () => {
    /* Ölçülen kusur (düzeltme turu · P2-6): `EPDK'nın … TEİAŞ'ın` —
       tarayıcı ilk kesme işaretini açılış sayıp aradaki bölgeyi "dize"
       okuyor ve ATLIYORDU; arada başlayan GERÇEK dize sessizce
       kayboluyordu. Taranan köklerde kesme işareti 224 dosyada geçiyor. */
    const cumle = 'Bu ekran hiçbir kaydı silmez ve kimseye göstermez';
    const kod = `<p>EPDK'nın kuralı: {t('${cumle}')} ve TEİAŞ'ın eki</p>`;
    expect(kaynakDizeleri(kod), 'kesme işareti gerçek dizeyi yuttu').toContain(cumle);
  });

  it('KAÇIŞ karakteri dizeyi erken KAPATMAZ [URN-POL-001]', () => {
    const kod = "const a = 'Bu ekran \\'alıntılı\\' kaydı silmez ve dokunmaz';";
    expect(kaynakDizeleri(kod)).toContain("Bu ekran \\'alıntılı\\' kaydı silmez ve dokunmaz");
  });

  it('KAPANMAYAN tırnak dosyanın geri kalanını YUTMAZ [URN-POL-001]', () => {
    const kod = "const a = 'kapanmadan satır bitti\nconst b = 'Bu ekran hiçbir kaydı silmez';";
    expect(kaynakDizeleri(kod), 'kapanmayan tırnak sonraki dizeyi yuttu')
      .toContain('Bu ekran hiçbir kaydı silmez');
  });

  it('TABAN ve TAVAN dışındaki dizeler elenir — sınırlar dâhildir [URN-POL-001]', () => {
    const tam = 'x'.repeat(25);
    expect(kaynakDizeleri(`'${tam}'`, 25, 400), 'taban DÂHİL değil').toContain(tam);
    expect(kaynakDizeleri(`'${'x'.repeat(24)}'`, 25, 400)).toEqual([]);
    expect(kaynakDizeleri(`'${'x'.repeat(401)}'`, 25, 400)).toEqual([]);
  });
});
