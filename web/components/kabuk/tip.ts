/* Tesis tipi kimliği — SUNUM tarafı.

   Renk KİMLİKTİR, durum değil: bir tip her yüzeyde aynı rengi taşır,
   "iyi" ya da "kötü" demez. Ton kararı CSS'e bırakılır; bu dosya yalnız
   "hangi yuva" sorusunu yanıtlar.

   Önceki arayüz katmanındaki eşdeğeri eski token'lara bağlıydı ve
   koyu/açık yüzeyi çağıranın bilmesini istiyordu. Yeni kabukta yüzeyi
   YÖN belirler, ekran değil.

   ── TİP ADI ARTIK BURADA DEĞİL (P1 · Aşama E) ─────────────────────────
   Burada bir `TIP_ADI` sözlüğü vardı ve `TesisTipi.ad` ile AYNI bilgiyi
   ikinci kez tutuyordu: bütün çağıranlar zaten veritabanındaki adı
   `yedek` olarak geçiriyordu, gömülü sözlük onu susturuyordu. Kopya
   silindi; ad tek kaynaktan, VERİDEN gelir. Yan etkisi ölçüldü: yalnız
   `DGKC` tipinin yazımı değişti ("Doğal gaz kombine çevrim" → tohumdaki
   "Doğal Gaz Kombine Çevrim").

   ── YUVA SİSTEMİ (P1) ─────────────────────────────────────────────────
   CSS artık üretim tipi kısaltmalarını jeton adı olarak taşımıyor;
   SEKTÖRSÜZ dört yuva var: `--tip-a` … `--tip-d`. Hangi tip hangi
   yuvayı alır, YALNIZ aşağıdaki tabloda yazılıdır.

   ── BU TABLO GEÇİCİDİR ────────────────────────────────────────────────
   `TIP_YUVASI` enerji kodlarına bakıyor ve bu dosyayı bekçinin izin
   listesinde tutan tek şey odur. Kalıcı yeri SEKTÖR PAKETİDİR (P4):
   paketin tip tanımı kendi yuvasını söyler. P1'de oraya konmadı, çünkü
   paket biçimi henüz yok — şimdi tasarlansaydı P4'te ikinci kez
   tasarlanırdı.

   Tablo `lib/` yerine BURADA duruyor: yeni bir `lib/` dosyası enerji
   kodları taşıyacağı için bekçinin izin listesine EKLENMESİ gerekirdi ve
   cırcırın tek kuralı listeye ekleme yapılmamasıdır. Bu dosya zaten
   listede ve zaten tip sunumunun sahibi; borç büyümüyor, yer değiştirmiyor.

   ── KAPASİTE AŞILIRSA NE OLUR ─────────────────────────────────────────
   Dört yuva var, tohumda ALTI tesis tipi (`JEO` `RES` `HES` `GES` `DGKC`
   `MERKEZ`). Dördü yuvalı, ikisi NÖTR mürekkebe düşüyor.

   Yuva SARILMAZ. Sarma, beşinci tipe birinci tipin rengini verirdi ve
   renk burada kimlik olduğu için bu "bu ikisi aynı şeydir" demek olurdu
   — sessizce yanlış. Nötre düşmek ise doğru bir cümle kurar: "bu tipin
   ayırt edici bir kimlik rengi yok."

   ── NÖTRE DÜŞMENİN İKİ AYRI SEBEBİ VAR ────────────────────────────────
   `tipYuvasi()` ikisine de `null` döner ve bu doğrudur: ikisinin de
   yuvası yoktur. Ama SEBEPLERİ aynı değil ve ikisini tek listede
   göstermek, bakan kişiye iki eksik varmış gibi okutur — oysa biri
   eksik değil:

     · `DGKC` — KAPASİTE EKSİĞİ. Üretim tesisi tipidir, kimlik rengini
       hak eder; yuva kalmadığı için renksiz. Yuva sayısı artarsa ya da
       sektör paketi kendi yuvasını getirirse (P4) düzelir.
     · `MERKEZ` — TASARIM GEREĞİ. Üretim tesisi değil, genel müdürlük
       binası. Üretim tipi kimlik paletinde yeri YOKTUR; yuva açılsa bile
       renk almaz. Bu bir eksik değil, bir karar.

   Ayrım SUNUMDADIR: `tipYuvasi()` iki hâli ayırmaz, `/sistem` sayfası
   ikisini ayrı cümlelerde yazar. */

/** Tip kodu → kimlik yuvası. GEÇİCİ; P4'te sektör paketine taşınır. */
const TIP_YUVASI: Record<string, 'a' | 'b' | 'c' | 'd'> = {
  JEO: 'a', HES: 'b', RES: 'c', GES: 'd',
};

/** Yuvanın CSS değişkeni — adlar TAM YAZILIR, birleştirilmez.

    Önce yuva harfi şablon dizesiyle sona ekleniyordu ve tasarım kapısı
    (`arac/iz-tarama.mjs`) bunu haklı olarak kusur saydı: statik tarayıcı
    çalışma zamanında kurulan bir jeton adını doğrulayamaz, dolayısıyla
    dört jetonu ÖLÜ, gövdeyi de TANIMSIZ gördü. Tam yazılmış adlar hem
    kapıyı çalışır tutar hem de bir yuva silindiğinde derlemeyi kırar.

    (Bu yorum da o birleştirmeyi ÖRNEK OLARAK yazmıyor: yazsaydı tarayıcı
    onu kaynakta bulur ve aynı kusuru bildirirdi.) */
const YUVA_DEGISKENI: Record<'a' | 'b' | 'c' | 'd', string> = {
  a: 'var(--tip-a)', b: 'var(--tip-b)', c: 'var(--tip-c)', d: 'var(--tip-d)',
};

/** Tipin kimlik yuvası; yoksa `null` (kapasite dışı ya da tanımsız tip). */
export function tipYuvasi(kod: string | null | undefined): 'a' | 'b' | 'c' | 'd' | null {
  return TIP_YUVASI[(kod ?? '').toUpperCase()] ?? null;
}

/** Yuvası olan bütün tip kodları — `/sistem` sayfası bunu listeler. */
export const YUVALI_TIPLER = Object.keys(TIP_YUVASI);

/** Kimlik rengi BEKLENMEYEN tipler ve nedenleri. Yuva kıtlığı değil,
    karar: bu tipler üretim tipi kimlik paletinin dışındadır.

    `TIP_YUVASI` gibi bu tablo da GEÇİCİ ve sektöre gömülü; ikisi P4'te
    birlikte sektör paketine taşınır. */
const KIMLIKSIZ_TIPLER: Record<string, string> = {
  MERKEZ: 'üretim tesisi değil',
};

/** Bir tipin kimlik rengi taşımama SEBEBİ.

    Ayrık değer, dize değil: "kapasite eksiği" ile "bilerek kimliksiz"
    aynı türden şeyler değil ve ikisini tek dizeyle taşımak, çağıranı
    metne bakıp karar vermeye zorlardı. */
export type Kimliksizlik =
  | { tur: 'kapasite' }
  | { tur: 'tasarim'; gerekce: string };

/** Tipin kimlik rengi TAŞIMAMA sebebi; sebebi bilinmiyorsa `null`.

    `tipYuvasi()` yuvasız her tipe `null` döner ve doğru davranır: renk
    seçimi üç hâlde de aynıdır, nötr mürekkep. Bu işlev o `null`ın
    ARDINDAKİ sebebi söyler ve yalnız SUNUM için vardır.

      { tur: 'kapasite' }            → üretim tipi, rengi hak ediyor,
                                       yuva kalmadı. GERÇEK eksik.
      { tur: 'tasarim', gerekce }    → paletin dışında olması bir karar.
                                       Eksik DEĞİL.
      null                           → BİLİNMİYOR. Bugün hiçbir çağrı
                                       buraya düşmüyor; anlam boş
                                       bırakıldı ki üçüncü bir durum
                                       çıktığında sıfır yerine "bilmiyoruz"
                                       yazacak yer olsun.

    ── `kapasite`NİN VARSAYIMI ───────────────────────────────────────
    Kod boş değilse ve tasarım tablosunda yoksa `kapasite` denir. Bu,
    kodun tip sicilinden (`TesisTipi`) geldiğini VARSAYAR — çağıranın
    sorumluluğu. Sicilde olmayan bir kod bugün yanlışlıkla "kapasite
    eksiği" görünür; üçüncü değer tam da bunun için ayrıldı: sicili
    bilen bir çağrı noktası çıktığında oradan `null` döner ve satır
    "bilinmiyor" der, uydurma bir eksik saymaz. */
export function kimliksizlikNedeni(kod: string | null | undefined): Kimliksizlik | null {
  const k = (kod ?? '').trim().toUpperCase();
  const gerekce = KIMLIKSIZ_TIPLER[k];
  if (gerekce) return { tur: 'tasarim', gerekce };
  // Kod hiç verilmemişse sebebi söylenemez — sıfır değil, bilinmiyor.
  if (!k) return null;
  return { tur: 'kapasite' };
}

/** Kimlik rengi; yuvası olmayan tip için nötr mürekkep. */
export function tipRengi(kod: string | null | undefined): string {
  const yuva = tipYuvasi(kod);
  return yuva ? YUVA_DEGISKENI[yuva] : 'var(--i2)';
}

/** Yığın çubuğunun "uygun" parçası: kimliği olmayan tipte durum rengine
    düşer, yoksa nötr gri "bilinmeyen" tarama deseniyle karışırdı. */
export function uygunRengi(kod: string | null | undefined): string {
  const yuva = tipYuvasi(kod);
  return yuva ? YUVA_DEGISKENI[yuva] : 'var(--ok)';
}

/** Tipin görünen adı. Ad VERİDEN gelir (`TesisTipi.ad`, çağıranın
    geçirdiği `yedek`); kod yalnız ad yokken son çare olarak yazılır. */
export function tipAdi(kod: string | null | undefined, yedek?: string | null): string {
  if (!kod) return yedek ?? 'tipi tanımsız';
  return yedek ?? kod;
}
