import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { politikaMi, turet, yorumsuz } from '../../arac/politika-kutugu.mjs';

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
  tavanlar: { olculmeyen: number };
  satirlar: {
    kod: string; cumle: string; yer: string; sinif: string; gerekce?: string;
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
