import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* ═══════════════════════════════════════════════════════════════════════
   TASARIM BELGESİ ↔ KABUK.CSS — DEĞER EŞİTLİĞİ

   `DESIGN.md` jeton değerlerini metin olarak ANIYOR; `app/kabuk.css` o
   değerlerin tek kaynağı. İkisi elle güncellendiği sürece ayrışırlar ve
   ayrıştıkları FARK EDİLMEZ: belge okunur, koda bakılmaz.

   Bu tam olarak oldu. Tip kimlik yuvaları P1'de yeniden adlandırılırken
   belgede ÜÇ değer bayat çıktı — hem gövdede hem ön bilgide:

     --tip-a  belgede #C47A3F  ·  CSS'te #B7734A
     --tip-b  belgede #5F8FA8  ·  CSS'te #5A87A3
     --tip-c  belgede #9DB3A8  ·  CSS'te #93A6AD

   Üçü de elle bulundu. Kimse görmüyordu; yarın da görmeyecekti. Bu
   dosya, marka adı için kurulan belge-eşitliği testinin kardeşidir
   (`tests/marka-adi.test.ts`): belgeler yapılandırmadan BESLENMİYOR ama
   ondan SAPAMAZ.

   ── ÜÇ İDDİA ──────────────────────────────────────────────────────────
   1. Ön bilgideki (`colors:`) her anahtar bir CSS jetonudur ve değeri
      birebir aynıdır. Anahtar adları bilerek jeton adlarıyla aynı
      tutuldu (`--` olmadan): eşleme tablosu kurmak, kendisi sürüklenen
      üçüncü bir kopya olurdu.
   2. Gövdede anılan her `#RRGGBB`, yanında yazılı jetonun CSS'teki
      değerine eşittir.
   3. Belgede anılan hiçbir jeton CSS'te eksik olamaz (ölü alıntı).

   Üçüncü iddia ilk koşuşunda DÖRDÜNCÜ bir sapma buldu: `--kolon-dar`.
   Böyle bir jeton hiç yoktu — belgenin Tablo maddesi Faz 2'nin div/ızgara
   kütüğünü anlatmayı sürdürüyordu (`darSablon`, oransal kolon bütçesi,
   "700px'te aralık 16 → 10px"), oysa Faz 3'te kütük semantik `<table>`
   oldu ve o mekanizmanın tamamı kalktı. Renk denetimi bunu bulamazdı:
   sapan değer değil, anlatılan SİSTEMDİ. Madde koda bakılarak yeniden
   yazıldı.
   ═══════════════════════════════════════════════════════════════════════ */

const CSS = readFileSync('app/kabuk.css', 'utf8');
const BELGE = readFileSync('DESIGN.md', 'utf8');

/** `app/kabuk.css` içindeki jeton → değer. Tek satırda birden çok tanım
    olabilir (`--tip-a: #…; --tip-b: #…;`), kalıp satır değil BİLDİRİM
    tarar. */
const cssJetonlari = (): Map<string, string> => {
  const m = new Map<string, string>();
  for (const e of CSS.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})\b/g)) {
    m.set(e[1], e[2].toUpperCase());
  }
  return m;
};

/** Ön bilgideki `colors:` bloğu — `anahtar: "#RRGGBB"`. */
const onBilgiRenkleri = (): Map<string, string> => {
  const blok = BELGE.match(/^colors:\n((?:[ \t]+.*\n)+)/m);
  const m = new Map<string, string>();
  if (!blok) return m;
  for (const e of blok[1].matchAll(/^\s+([a-z0-9-]+):\s*"(#[0-9A-Fa-f]{6})"/gm)) {
    m.set(e[1], e[2].toUpperCase());
  }
  return m;
};

/** Gövdede `--jeton` ile `#RRGGBB` eşleşmeleri.

    ── SIRA SÖZLEŞMESİDİR: ÖNCE JETON, SONRA DEĞER ────────────────────
    Belge her yerde "`--ok` uygun (`#6FA07E`)" biçiminde yazar. Kalıp
    ilk yazıldığında YÖNSÜZDÜ — en yakın jetonu iki yönde de arıyordu —
    ve durum ailesi satırında yanlış eşledi: jetonlarla değerler
    dönüşümlü dizildiği için `#6FA07E` kendinden SONRA gelen `--md`ye
    daha yakın düşüyordu. Beş sahte sapma üretti.

    Arama artık yalnız GERİYE bakar. Değerden önce jeton yoksa bu da
    kusurdur: "değer önce" yazımı sözleşmeyi bozar ve kalıbı yeniden
    belirsizleştirirdi.

    Pencere 90 karakter: aynı madde içinde kalır, bir öncekine taşmaz. */
function govdeAlintilari(): { jeton: string | null; deger: string; baglam: string }[] {
  const govde = BELGE.split(/^---$/m).slice(2).join('---');
  const cikti: { jeton: string | null; deger: string; baglam: string }[] = [];
  for (const e of govde.matchAll(/`(#[0-9A-Fa-f]{6})`/g)) {
    const bas = Math.max(0, e.index - 90);
    const oncesi = govde.slice(bas, e.index);
    const jetonlar = [...oncesi.matchAll(/`--([a-z0-9-]+)`/g)];
    cikti.push({
      jeton: jetonlar.length ? jetonlar[jetonlar.length - 1][1] : null,
      deger: e[1].toUpperCase(),
      baglam: govde.slice(Math.max(0, e.index - 45), e.index + 25).replace(/\n/g, ' ').trim(),
    });
  }
  return cikti;
}

/* Senaryo kimliği YOK ve bu bilerek: dosya bir kullanıcı senaryosunu
   değil, belgenin koda karşı tutarlılığını ölçer — `belge-sayimlari`
   ile aynı sınıf. Gerekçesi `arac/senaryo-belge.mjs` içindeki
   `KUTUKSUZ_DOSYALAR` listesinde yazılıdır. */
describe('DESIGN.md · jeton değerleri kabuk.css ile eşit', () => {
  it('ölçülen küme boş değil', () => {
    /* Bir ayrıştırma hatası kümeyi boşaltırsa bütün test sessizce yeşile
       döner. Ölçülen şeyin var olduğunu önce burası söyler. */
    expect(cssJetonlari().size, 'kabuk.css jetonu okunamadı').toBeGreaterThan(12);
    expect(onBilgiRenkleri().size, 'ön bilgi renkleri okunamadı').toBeGreaterThan(12);
    expect(govdeAlintilari().length, 'gövdede jetonlu değer alıntısı bulunamadı')
      .toBeGreaterThan(12);
  });

  it('ön bilgideki her renk CSS jetonuyla AYNI değeri taşır', () => {
    const css = cssJetonlari();
    const sapan = [...onBilgiRenkleri()]
      .filter(([ad, deger]) => css.get(ad) !== deger)
      .map(([ad, deger]) => `--${ad}: belgede ${deger} · CSS'te ${css.get(ad) ?? 'YOK'}`);
    expect(sapan,
      'DESIGN.md ön bilgisi kabuk.css ile ayrıştı — değeri KAYNAKTAN alın')
      .toEqual([]);
  });

  it('gövdede her değerin ÖNÜNDE jetonu yazılıdır', () => {
    const jetonsuz = govdeAlintilari().filter((a) => a.jeton === null)
      .map((a) => `${a.deger} — "${a.baglam}"`);
    expect(jetonsuz,
      'Değer jetonsuz anılmış. Sözleşme: önce `--jeton`, sonra `#RRGGBB` — '
      + 'yoksa değer hangi jetona ait olduğu bilinmeden belgede yaşar.')
      .toEqual([]);
  });

  it('gövdede anılan her değer CSS jetonuyla AYNI', () => {
    const css = cssJetonlari();
    const sapan = govdeAlintilari()
      .filter((a) => a.jeton !== null && css.get(a.jeton) !== a.deger)
      .map((a) => `--${a.jeton}: belgede ${a.deger} · CSS'te ${css.get(a.jeton!) ?? 'YOK'}`
        + ` — "${a.baglam}"`);
    expect(sapan, 'DESIGN.md gövdesi kabuk.css ile ayrıştı').toEqual([]);
  });

  it('belgede anılan HER jeton CSS\'te tanımlıdır (ölü alıntı yok)', () => {
    /* Silinmiş bir jetonun belgede yaşamayı sürdürmesi, okuyucuyu var
       olmayan bir sözleşmeye yönlendirir.

       Kural RENKLE SINIRLI DEĞİL: belge tipografi ve ölçü jetonlarını da
       anıyor (`--t-hero`, `--s12`, `--gutter`) ve onlar da silinebilir.
       Denetim "CSS'te bir tanımı var mı" diye sorar, değerinin biçimini
       sormaz. İlk yazımda yalnız renk adlarına bakıyordu ve uydurma bir
       ada (`--olujeton`) kör kalıyordu. */
    const tanimli = new Set([...CSS.matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const govde = BELGE.split(/^---$/m).slice(2).join('---');
    const anilan = new Set([...govde.matchAll(/`--([a-z0-9-]+)`/g)].map((m) => m[1]));
    const olu = [...anilan].filter((a) => !tanimli.has(a)).sort();
    expect(olu, 'DESIGN.md\'de anılan jeton kabuk.css\'te tanımlı değil — '
      + 'ya jeton silinmiş ya da belgede yazım hatası var').toEqual([]);
  });
});
