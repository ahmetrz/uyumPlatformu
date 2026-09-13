import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { taranacakDosyalar, terimleriBul } from './terimler';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · sektör terimi (P1 · URN-ALN-003) — CIRCIR

   Çekirdek sektör taşımaz: "santral" enerji kiracısının sözcüğüdür ve
   `SektorSozlugu`ndan gelir, koda gömülmez. Bugün 258 dosya hâlâ gömülü
   terim taşıyor; hepsini bir seferde çevirmek tek dev bir yama olurdu.
   Bu yüzden kapı ÖNCE kuruluyor, temizlik sonra: liste bir borç kütüğü,
   test de cırcır dişlisi.

   ── NEDEN TANIMLAYICILAR DA TARANIYOR ─────────────────────────────────
   Paket tarifi yalnız "JSX/metin literali" diyordu. Öyle bir tarama
   `type Santral`, `santraller: Santral[]`, `santralId`, `Plant360Veri`
   gibi 400'den fazla eşleşmeyi GÖRMEZ ve paketin iddiasını
   ("çekirdek hiçbir sektör terimi taşımaz") boşa çıkarırdı. Tarama ham
   metin üstündedir: literal, tanımlayıcı, yorum, CSS sınıfı ve DOSYA ADI
   dâhil. Sektör sözcüğünün nerede durduğu değil, DURUYOR OLMASI kusurdur.

   ── İKİ YÖNLÜ ─────────────────────────────────────────────────────────
   (a) Listede OLMAYAN dosyada terim → kırmızı. Cırcırın dişi budur.
   (b) Listede OLAN dosyada terim kalmamış → kırmızı. Dişli geri
       kaymasın diye: temizlenen dosya listeden DÜŞMEK zorundadır, yoksa
       liste bir gün sadece eski bir hikâye olur ve kimse eritmez.
   (c) Liste `tavan`ı (DOSYA sayısı) aşamaz ve tavan listeden uzaklaşamaz.
   (e) Ölçülen TERİM TOPLAMI `terimTavani`yi aşamaz — dosya sayısı sabitken
       bir dosyanın derinleşmesini yalnız bu diş görür.
   (d) Liste, TABAN DALDAKİ listenin ALT KÜMESİ olmalı.

   ── (d) NEDEN GEREKLİ ─────────────────────────────────────────────────
   (c) tek başına sayıyı sabit tutar ama TAKASI görmez: bir dosyayı
   temizleyip yerine yenisini listeye koymak sayıyı değiştirmez ve
   cırcır sessizce yana kayar. (d) listeyi taban daldaki (`origin/main`)
   hâliyle karşılaştırır; yeni bir yol eklenmişse adıyla söyler.

   ── ÖLÇÜLEMEYEN "GEÇTİ" DEĞİLDİR — AMA CI'DA "ÖLÇÜLEMEDİ" DE DEĞİL ────
   Taban dal YERELDE haklı sebeplerle yok olabilir: sığ bir klon, `origin`
   uzağı olmayan bir çalışma kopyası, listenin henüz taban dala girmemiş
   olması. Orada diş (d) KOŞMAZ, vitest raporunda ATLANMIŞ görünür ve
   gerekçesi yazılır; yeşil yazılmaz.

   CI'DA aynı şey KIRMIZIDIR. Orada taban dalın okunamamasının meşru bir
   sebebi yok: iş akışı onu ayrı bir adımda getiriyor. "Ölçülmedi" demek,
   cırcırın sessizce kapanması olurdu — üstelik o adım `continue-on-error`
   taşıdığı için boru hattı yeşil kalır ve kimse koruma kalktığını fark
   etmezdi. Bir kapının en tehlikeli hâli kırmızı olması değil, sessizce
   yokluğudur.

   Atlama ÇALIŞMA ZAMANINDA yapılır (`ctx.skip`), `it.skipIf` ile değil:
   statik atlama vitest'in keşif çıktısını ortama göre değiştirir ve
   `arac/test-envanteri.mjs` anlık görüntüsü CI ile yerelde ayrışırdı.

   Taban dal `BEKCI_TABAN` ile değiştirilebilir (varsayılan `origin/main`).
   ═══════════════════════════════════════════════════════════════════════ */

const IZIN_DOSYASI = 'tests/bekci/sektor-terimi-izin.json';

/* Terimler ve neden bu terimler:
   · `santral` — kiracının sözcüğü; çekirdeğinki `tesis`.
   · `ünite`/`unite` — çekirdeğinki `birim` (model P1'de yeniden adlandırıldı).
   · `MW`/`MWe`/`MWp` — elektrik gücü birimi; nitelik birimini sektör
     paketi verir (`SektorOznitelikSemasi.birim`).
   · tip kodları — enerji üretim tipleri; `TesisTipi` verisinden gelmeli.
   · `türbin`, `jeotermal`, `rüzgâr`, `hidroelektrik` — üretim teknolojisi.
   · `plant` — aynı sözcüğün İngilizcesi; bileşen ve jeton adlarında.
   Kapsam dışı bırakılanlar ve nedenleri izin dosyasının başlığındadır. */

type Sinif = { tur: 'kalici' | 'ertelenmis'; sebep: string; kapanis?: string };

const izin = JSON.parse(readFileSync(IZIN_DOSYASI, 'utf8')) as {
  tavan: number; terimTavani: number; ertelenmisTavani: number;
  dosyalar: string[]; siniflandirma: Record<string, Sinif>;
  tavanGerekceleri?: Record<string, { eski: number; yeni: number; sebep: string }>;
};
const izinKumesi = new Set(izin.dosyalar);

/* ── KALICI ve ERTELENMİŞ: TEK KARIŞIK SAYI BIRAKILMAZ ────────────────
   Bir borç kütüğünde "11 dosya kaldı" cümlesi iki AYRI şeyi topluyordu:
   ilkesel gerekçeyle orada duran satırlar (sıfır beklenmiyor) ile
   kapanacağı gün belli olan satırlar. Toplanınca ikisi de okunamaz hâle
   gelir: sayı düşmüyor diye alarm verilir ama düşmesi beklenmeyen bir
   taban vardır; ya da tersine, ertelenmiş bir satır "zaten kalıcı" diye
   sessizce unutulur.

   KALICI, ERTELENMİŞ'in kaçış kapısıdır: bir dosyayı "kalıcı" ilan etmek
   onu bütün cırcırdan çıkarır. Bu yüzden KALICI kümesi de ALT KÜME
   dişiyle korunur (diş (i)): taban dalda ertelenmiş olan bir dosya bu
   dalda kalıcıya TERFİ EDEMEZ; ederse adıyla söylenir. */
const siniflar = izin.siniflandirma ?? {};
const sinifi = (yol: string): Sinif | undefined => siniflar[yol];
const yollar = (tur: Sinif['tur']) =>
  izin.dosyalar.filter((d) => sinifi(d)?.tur === tur);

const TABAN_DAL = process.env.BEKCI_TABAN?.trim() || 'origin/main';

/* GitHub Actions ikisini de kurar; öbür koşucuların çoğu `CI`yi kurar.
   Yerelde `CI=1` ile koşan biri bilerek CI sözleşmesini seçmiş olur. */
const KOSUCU = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);

/** Taban listesinin okunamama nedeni — ikisi AYNI ŞEY DEĞİLDİR:

    `dal`   — taban dalın kendisi yok (sığ klon, `origin` uzağı yok, fetch
              düştü). CI'da bunun meşru bir sebebi yoktur ve kusurdur.
    `liste` — dal var ama listeyi HENÜZ taşımıyor. Bu yalnız cırcırın
              KURULDUĞU birleştirmede olur: karşılaştırılacak önceki hâl
              yoktur. Kalıcı bir kaçış yolu değildir, çünkü listeyi taban
              daldan silmek için önce çalışma ağacından silmek gerekir ve
              o durumda bu dosya baştan okunamayacağı için bütün bekçi
              çöker. */
type TabanYok = { yok: string; tur: 'dal' | 'liste' };

/** Taban daldaki izin listesi; okunamıyorsa NEDENİ ve TÜRÜYLE. */
type Tavanlar = Partial<Record<'tavan' | 'terimTavani' | 'ertelenmisTavani', number>>;

function tabanListesi(): {
  dosyalar: string[];
  siniflandirma: Record<string, Sinif> | null;
  tavanlar: Tavanlar;
} | TabanYok {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${TABAN_DAL}^{commit}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return { tur: 'dal', yok: `${TABAN_DAL} dalı okunamadı (sığ klon ya da eksik fetch)` };
  }
  /* `<ref>:./yol` biçimi yolu ÇALIŞMA DİZİNİNE göre çözer; depo kökü
     `web/`in bir üstünde olduğu için düz `<ref>:tests/...` bulunamazdı. */
  let ham: string;
  try {
    ham = execFileSync('git', ['show', `${TABAN_DAL}:./${IZIN_DOSYASI}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return { tur: 'liste', yok: `${TABAN_DAL} listeyi henüz taşımıyor (cırcır ilk kurulum)` };
  }
  try {
    const j = JSON.parse(ham) as { dosyalar?: unknown; siniflandirma?: unknown };
    if (!Array.isArray(j.dosyalar)) {
      return { tur: 'dal', yok: `${TABAN_DAL} sürümünde 'dosyalar' dizisi yok` };
    }
    return {
      dosyalar: j.dosyalar as string[],
      /* Tavanların TABAN DALDAKİ değeri: yükseltme ancak buna göre
         anlaşılır. Taşımayan bir taban `undefined` bırakır ve o tavan
         için karşılaştırma yapılmaz (ölçülmedi — geçti değil). */
      tavanlar: {
        tavan: (j as Record<string, unknown>).tavan as number | undefined,
        terimTavani: (j as Record<string, unknown>).terimTavani as number | undefined,
        ertelenmisTavani: (j as Record<string, unknown>).ertelenmisTavani as number | undefined,
      },
      /* Taban dal sınıflandırmayı henüz taşımıyor olabilir (bu dilimin
         KENDİSİ onu getiriyor); diş (i) o hâlde ayrıca atlanır. */
      siniflandirma: (j.siniflandirma ?? null) as Record<string, Sinif> | null,
    };
  } catch {
    return { tur: 'dal', yok: `${TABAN_DAL} sürümü çözümlenemedi (bozuk JSON)` };
  }
}

const taranan = taranacakDosyalar();
const kirli = taranan
  .map((yol) => ({ yol, terimler: terimleriBul(yol) }))
  .filter((x) => x.terimler.length > 0);
const kirliKumesi = new Set(kirli.map((x) => x.yol));

describe('Bekçi · sektör terimi (cırcır)', () => {
  it('taranan yüzey boş değil', () => {
    /* Bir yol hatası tarama kümesini boşaltırsa bütün bekçi sessizce
       yeşile döner. Ölçülen şeyin var olduğunu önce burası söyler. */
    expect(taranan.length, 'kaynak dosya bulunamadı — tarama kökleri bozuk')
      .toBeGreaterThan(300);
  });

  it('izin listesinde OLMAYAN dosyada sektör terimi yok [URN-ALN-003]', () => {
    const kacaklar = kirli
      .filter((x) => !izinKumesi.has(x.yol))
      .map((x) => `${x.yol} → ${x.terimler.map((t) => `${t.terim}×${t.sayi}`).join(', ')}`);
    expect(kacaklar,
      'Sektör terimi izin listesinde olmayan dosyada. Terimi sözlükten '
      + `çözün (lib/dil/terimler.ts); listeye EKLEMEYİN (${IZIN_DOSYASI}).`)
      .toEqual([]);
  });

  it('izin listesindeki dosya HÂLÂ kirli — temizleneni listeden düşürün', () => {
    /* Cırcırın geri kaymasını engelleyen diş. Temizlenmiş bir dosya
       listede kalırsa, o dosya ileride sessizce yeniden kirlenebilir. */
    const temizlenmis = izin.dosyalar.filter((d) => !kirliKumesi.has(d));
    expect(temizlenmis,
      `Bu dosyalarda sektör terimi kalmamış: ${IZIN_DOSYASI} içinden çıkarın `
      + 've commit mesajına kalan sayıyı yazın.')
      .toEqual([]);
  });

  it('izin listesindeki her yol gerçekten var', () => {
    const yok = izin.dosyalar.filter((d) => !taranan.includes(d));
    expect(yok, 'Taşınmış ya da silinmiş yol; izin listesini güncelleyin')
      .toEqual([]);
  });

  it('liste taban daldaki listenin ALT KÜMESİ [URN-ALN-003]', (ctx) => {
    const taban = tabanListesi();
    if ('yok' in taban) {
      if (taban.tur === 'dal' && KOSUCU) {
        /* CI'da taban dalın okunamamasının meşru sebebi yok: iş akışı onu
           getirmekle yükümlü. Burada "ölçülmedi" demek cırcırı SESSİZCE
           kapatırdı — üstelik getirme adımı `continue-on-error` taşıdığı
           için boru hattı yeşil kalır ve kimse korumanın kalktığını fark
           etmezdi. Bir kapının en tehlikeli hâli kırmızı olması değil,
           sessizce yokluğudur. */
        expect.fail(
          `CI'da taban dal okunamadı: ${taban.yok}. Bu diş CI'da ATLANMAZ. `
          + "İş akışındaki \"Taban dalı al\" adımını (git fetch --depth=1 "
          + 'origin main:refs/remotes/origin/main) kontrol edin.',
        );
      }
      /* ÖLÇÜLMEDİ — geçti değil. Rapor bunu gerekçesiyle atlanmış gösterir.
         İki hâl: yerelde taban dal yok, ya da (her ortamda) taban dal
         listeyi henüz taşımıyor — karşılaştırılacak önceki hâl yoktur. */
      ctx.skip(`ölçülmedi${taban.tur === 'liste' ? '' : ' (yerel)'}: ${taban.yok}`);
      return;
    }
    const tabanKumesi = new Set(taban.dosyalar);
    const eklenen = izin.dosyalar.filter((d) => !tabanKumesi.has(d));
    expect(eklenen.map((d) => `izin listesine dosya eklenmiş: ${d}`),
      `İzin listesi ${TABAN_DAL} sürümünün alt kümesi değil. Liste YALNIZ `
      + 'erir: bir dosyayı temizleyip yerine başkasını koymak da ekleme '
      + `sayılır. (Taban dal ilerlediyse önce ${TABAN_DAL} birleştirin.)`)
      .toEqual([]);
  });

  it('liste tavanı aşmıyor ve düzenli', () => {
    /* `tavan` cırcırın kurulduğu gündeki dosya sayısıdır ve ARTMAZ.
       Sıralı + tekrarsız olması, listeyi eriten commit'lerin diff'ini
       okunur tutar: eklenen bir satır göze batar. */
    expect(izin.dosyalar.length, 'izin listesi büyümüş — dosya EKLENEMEZ')
      .toBeLessThanOrEqual(izin.tavan);
    /* TAVANIN ADI İDDİASIYLA UYUŞMALI. Bir turda `tavan` yanlışlıkla
       terim toplamına çekilmişti: 111 dosya için 780'lik bir tavan hiçbir
       şey tutmuyordu ve test yine yeşil yanıyordu. Tavan, listenin BUGÜNKÜ
       boyundan uzak olamaz — uzaklaşırsa cırcır yaşarken ölmüş demektir. */
    expect(izin.tavan - izin.dosyalar.length,
      'tavan listeden çok büyük: cırcır gevşemiş. Tavanı bugünkü dosya '
      + 'sayısına çekin (tavan YALNIZ düşer).')
      .toBeLessThanOrEqual(0);
    expect(izin.dosyalar, 'izin listesi sıralı değil')
      .toEqual([...izin.dosyalar].sort());
    expect(new Set(izin.dosyalar).size, 'izin listesinde tekrar var')
      .toBe(izin.dosyalar.length);
  });

  it('her satır SINIFLANDIRILMIŞ — kalıcı mı, ertelenmiş mi [URN-ALN-003]', () => {
    /* Diş (f). Sınıfsız bir satır "11 dosya kaldı" cümlesini yeniden tek
       karışık sayıya çevirir: okuyan kişi hangisinin kapanacağını, hangisinin
       zaten kapanmayacağını bilemez. */
    const sinifsiz = izin.dosyalar.filter((d) => !sinifi(d));
    expect(sinifsiz, `Sınıflandırılmamış satır. ${IZIN_DOSYASI} → `
      + "`siniflandirma` altına 'kalici' ya da 'ertelenmis' olarak yazın.")
      .toEqual([]);

    const oksuz = Object.keys(siniflar).filter((d) => !izinKumesi.has(d));
    expect(oksuz, 'Listede olmayan yol için sınıflandırma kaydı var — '
      + 'dosya temizlendiyse kaydı da düşürün.')
      .toEqual([]);
  });

  it('ERTELENMİŞ satır hangi aşamada kapanacağını YAZAR [URN-ALN-003]', () => {
    /* Diş (g) — "süresiz beyan yoktur" kuralının bu kütükteki karşılığı.
       Kapanış aşaması yazılmamış bir erteleme, ertelenmiş değil unutulmuş
       demektir. Simetrik olarak KALICI bir satır kapanış TAŞIYAMAZ: kapanışı
       olan şey kalıcı değildir, yanlış sınıflandırılmıştır. */
    const kapanissiz = yollar('ertelenmis')
      .filter((d) => !(sinifi(d)?.kapanis ?? '').trim());
    expect(kapanissiz, "ERTELENMİŞ satırda `kapanis` yok: hangi aşamada "
      + 'kapanacağı yazılmadan erteleme süresiz beyandır.')
      .toEqual([]);

    const yanlisKalici = yollar('kalici').filter((d) => sinifi(d)?.kapanis);
    expect(yanlisKalici, 'KALICI satırda `kapanis` var — kapanışı olan satır '
      + "kalıcı değildir, 'ertelenmis' olarak yazın.")
      .toEqual([]);

    const sebepsiz = izin.dosyalar.filter((d) => (sinifi(d)?.sebep ?? '').trim().length < 40);
    expect(sebepsiz, 'Gerekçe yok ya da bir cümle bile değil. Gerekçe KUSURU '
      + 'anlatır (CLAUDE.md); `npm run gerekce:tarama` bu alanları da tarar.')
      .toEqual([]);
  });

  it('KALICI kümesi taban daldakinin ALT KÜMESİ — terfi sessiz olamaz', (ctx) => {
    /* Diş (i). KALICI, cırcırın kaçış kapısıdır: bir satırı kalıcı ilan
       etmek onu ERTELENMİŞ tavanından ve kapanış zorunluluğundan birden
       çıkarır. (d) dişinin aynısı sınıf üstünde koşar — taban dalda
       ertelenmiş olan bu dalda kalıcıya terfi edemez. */
    const taban = tabanListesi();
    if ('yok' in taban) {
      if (taban.tur === 'dal' && KOSUCU) {
        expect.fail(`CI'da taban dal okunamadı: ${taban.yok}. Bu diş CI'da ATLANMAZ.`);
      }
      ctx.skip(`ölçülmedi${taban.tur === 'liste' ? '' : ' (yerel)'}: ${taban.yok}`);
      return;
    }
    if (!taban.siniflandirma) {
      /* Sınıflandırmayı bu dilim GETİRİYOR: taban dalda karşılaştırılacak
         önceki hâl yok. (d) dişinin 'liste' hâliyle aynı gerekçe. */
      ctx.skip(`ölçülmedi: ${TABAN_DAL} sınıflandırmayı henüz taşımıyor (ilk kurulum)`);
      return;
    }
    const tabanKalici = new Set(
      Object.entries(taban.siniflandirma)
        .filter(([, v]) => v.tur === 'kalici').map(([k]) => k));
    const terfi = yollar('kalici').filter((d) => !tabanKalici.has(d));
    expect(terfi.map((d) => `ERTELENMİŞ → KALICI terfisi: ${d}`),
      `KALICI kümesi ${TABAN_DAL} sürümünün alt kümesi değil. Bir satırı `
      + 'kalıcı ilan etmek onu cırcırdan çıkarır; terfi ayrı bir karardır ve '
      + 'gerekçesi taban dalda yazılı olmalıdır.')
      .toEqual([]);
  });

  it('ERTELENMİŞ terim toplamı `ertelenmisTavani`yi aşmıyor [URN-ALN-003]', () => {
    /* Cırcırın ASIL ölçüsü budur: eriyecek olan sayı. Toplam tavan
       (`terimTavani`) kalıcıları da içerdiği için sıfıra inemez ve
       "kaç kaldı" sorusuna yanlış cevap verir. */
    const kirliHarita = new Map(kirli.map((x) => [x.yol, x.terimler]));
    const say = (yol: string) =>
      (kirliHarita.get(yol) ?? []).reduce((a, t) => a + t.sayi, 0);
    const ertelenmisToplam = yollar('ertelenmis').reduce((a, d) => a + say(d), 0);
    expect(ertelenmisToplam,
      `ertelenmiş terim toplamı ${ertelenmisToplam} > tavan ${izin.ertelenmisTavani}: `
      + 'kapanacak borç derinleşmiş. Tavanı YÜKSELTMEYİN.')
      .toBeLessThanOrEqual(izin.ertelenmisTavani);
    expect(izin.ertelenmisTavani - ertelenmisToplam,
      'ertelenmiş tavanı ölçümden uzaklaşmış: cırcır gevşemiş. Tavanı '
      + 'bugünkü toplama çekin (tavan YALNIZ düşer).')
      .toBeLessThanOrEqual(0);
  });

  it('terim toplamı `terimTavani`yi aşmıyor [URN-ALN-003]', () => {
    /* İKİNCİ DİŞ: dosya sayısı tek başına DERİNLEŞMEYİ görmez. Listedeki
       bir dosyada terim sayısı ikiye katlansa dosya sayısı değişmez ve
       cırcır sessizce geri kayardı. Toplam da yalnız DÜŞER. */
    const toplam = kirli.reduce(
      (a, x) => a + x.terimler.reduce((b, t) => b + t.sayi, 0), 0);
    expect(toplam, `terim toplamı ${toplam} > tavan ${izin.terimTavani}: `
      + 'bir dosya derinleşmiş. Terimi sözlükten çözün; tavanı YÜKSELTMEYİN.')
      .toBeLessThanOrEqual(izin.terimTavani);

    /* GEVŞEKLİK DİŞİ — ÖLÇÜLDÜ VE EKSİKTİ. `tavan` bu kontrolü taşıyordu
       (`tavan - dosya sayısı <= 0`), `terimTavani` taşımıyordu: 85 → 500
       yazıp koştum, ONBİR VAKA DA YEŞİL kaldı. Bir tavanı ölçümün
       üstüne çekmek cırcırı kırmadan öldürür. Tavan, ölçülen sayının
       BUGÜNKÜ değerinden uzaklaşamaz. */
    expect(izin.terimTavani - toplam,
      `terim tavanı ölçümden ${izin.terimTavani - toplam} uzakta: cırcır `
      + 'gevşemiş. Tavanı bugünkü toplama çekin (tavan YALNIZ düşer).')
      .toBeLessThanOrEqual(0);
  });

  it('tavan YÜKSELTMESİ gerekçe ister [URN-ALN-003]', (ctx) => {
    /* Kural: "taban yazımı ve tavan yükseltmesi gerekçe ister." Gevşeklik
       dişi bir tavanı ölçümün ÜSTÜNE çekmeyi engeller; bu diş ölçümün
       KENDİSİ büyüdüğünde sorulması gereken soruyu sorar — kapsam mı
       genişledi, yoksa borç mu derinleşti? İkisi aynı sayıyı üretir ve
       yalnız yazılı bir gerekçe ayırır.

       Düşüş ve sabit kalma serbesttir: cırcırın gitmesi gereken yön odur. */
    const taban = tabanListesi();
    if ('yok' in taban) {
      if (taban.tur === 'dal' && KOSUCU) {
        expect.fail(`CI'da taban dal okunamadı: ${taban.yok}. Bu diş CI'da ATLANMAZ.`);
      }
      ctx.skip(`ölçülmedi${taban.tur === 'liste' ? '' : ' (yerel)'}: ${taban.yok}`);
      return;
    }
    const adlar = ['tavan', 'terimTavani', 'ertelenmisTavani'] as const;
    const olculebilir = adlar.filter((ad) => typeof taban.tavanlar[ad] === 'number');
    if (olculebilir.length === 0) {
      ctx.skip(`ölçülmedi: ${TABAN_DAL} bu tavanları henüz taşımıyor (ilk kurulum)`);
      return;
    }
    const kusurlar: string[] = [];
    for (const ad of olculebilir) {
      const eski = taban.tavanlar[ad] as number;
      const yeni = izin[ad];
      if (yeni <= eski) continue;                    /* düşüş / sabit — serbest */
      const g = izin.tavanGerekceleri?.[ad];
      if (!g) {
        kusurlar.push(`${ad}: ${eski} → ${yeni} yükseltilmiş, gerekçesi yok`);
      } else if (g.eski !== eski || g.yeni !== yeni) {
        /* Gerekçe BU yükseltmeyi anlatmalı. Eski bir gerekçe yeni bir
           yükseltmeyi kapatamaz, yoksa bir kez yazılan cümle sonsuza
           kadar geçerli olur. */
        kusurlar.push(`${ad}: gerekçe ${g.eski} → ${g.yeni} diyor, ölçülen ${eski} → ${yeni}`);
      } else if ((g.sebep ?? '').trim().length < 40) {
        kusurlar.push(`${ad}: gerekçe bir cümle bile değil`);
      }
    }
    expect(kusurlar, 'Tavan yükseltmesi gerekçesiz. `tavanGerekceleri` altına '
      + "{ eski, yeni, sebep } yazın; sebep KAPSAMIN neden büyüdüğünü anlatmalı "
      + '(yeni yüzey ailesi, yeni tarama kökü), düzeltmenin maliyetini değil.')
      .toEqual([]);
  });
});
