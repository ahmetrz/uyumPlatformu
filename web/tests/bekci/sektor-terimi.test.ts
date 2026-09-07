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
   (c) Liste `tavan`ı aşamaz.
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
   sebebi yok: iş akışı onu ayrı bir adımda getiriyor ("Taban commit'i
   getir" · `fetch-depth: 0`). "Ölçülmedi" demek, cırcırın sessizce
   kapanması olurdu. Bir kapının en tehlikeli hâli kırmızı olması değil,
   sessizce yokluğudur.

   NOT (#29 birleşmesi): bekçinin KENDİ getirme adımı vardı ve
   `continue-on-error` taşıyordu — yani düşse bile boru hattı yeşil
   kalıyor, koruma yalnız buradaki iddia sayesinde kırmızıya dönüyordu.
   O adım SİLİNDİ: `git fetch --depth=1`, borç cırcırının aldığı TAM
   klonu sığlaştırıp onun taban geçmişini kesiyordu. Artık tek bir adım
   ikisini de besliyor ve `continue-on-error` TAŞIMIYOR: getirme düşerse
   iş akışı orada durur. Buradaki iddia yine de gerekli — adım sessizce
   kaldırılırsa onu söyleyecek olan bu.

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
   · `plant` — aynı sözcüğün İngilizcesi; `Plant360` gibi bileşen adları
     (bir dönem sınır kalıbı yüzünden GÖRÜNMÜYORDU; 7 Eyl 2026'da
     kapatıldı ve `Plant360` → `Tesis360` yeniden adlandırıldı).
   Kapsam dışı bırakılanlar ve nedenleri izin dosyasının başlığındadır. */

const izin = JSON.parse(readFileSync(IZIN_DOSYASI, 'utf8')) as {
  tavan: number; dosyalar: string[];
};
const izinKumesi = new Set(izin.dosyalar);

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
function tabanListesi(): { dosyalar: string[] } | TabanYok {
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
    const j = JSON.parse(ham) as { dosyalar?: unknown };
    if (!Array.isArray(j.dosyalar)) {
      return { tur: 'dal', yok: `${TABAN_DAL} sürümünde 'dosyalar' dizisi yok` };
    }
    return { dosyalar: j.dosyalar as string[] };
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
           kapatırdı. Bir kapının en tehlikeli hâli kırmızı olması değil,
           sessizce yokluğudur. */
        expect.fail(
          `CI'da taban dal okunamadı: ${taban.yok}. Bu diş CI'da ATLANMAZ. `
          + 'İş akışındaki "Taban commit\'i getir" adımını kontrol edin '
          + '(checkout `fetch-depth: 0` + `git fetch origin '
          + '+refs/heads/main:refs/remotes/origin/main`). Bekçinin kendi '
          + '`--depth=1` adımı #29 birleşmesinde SİLİNDİ: sığ getirme, borç '
          + 'cırcırının aldığı TAM klonu sığlaştırıp onun taban geçmişini '
          + 'kesiyordu — iki cırcır aynı ref\'i farklı derinlikte isteyemez.',
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
    expect(izin.dosyalar, 'izin listesi sıralı değil')
      .toEqual([...izin.dosyalar].sort());
    expect(new Set(izin.dosyalar).size, 'izin listesinde tekrar var')
      .toBe(izin.dosyalar.length);
  });
});
