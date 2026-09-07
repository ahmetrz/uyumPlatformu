/* Kalite kapılarının SAF kuralları — tarayıcı açmadan test edilebilsin
   diye ayrı modülde durur (rota-kurallari.mjs ile aynı gerekçe).

   Buradaki hiçbir işlev ağ, dosya ya da tarayıcı bilmez; girdiyi alır,
   kararı döner. Kararın kendisi araçların içine gömülü kalsaydı "eşik
   %0,5 mi %5 mi", "hangi etki ciddi sayılır" gibi sorular yalnız canlı
   sunucuyla yoklanabilirdi — tests/kalite-kapilari.test.ts bunları
   sunucusuz doğrular. */

/** Rota → dosya adı gövdesi: `/` → `ana`, `/raporlar/kanit-paketi` → `raporlar__kanit-paketi`. */
export function rotaAdi(rota) {
  const temiz = String(rota ?? '').replace(/^\/+|\/+$/g, '');
  if (temiz === '') return 'ana';
  return temiz.replace(/\//g, '__').replace(/[^\w.-]/g, '_');
}

/** Altın görüntü dosya adı: `<rota>-<bant>.png`. */
export function altinDosyaAdi(rota, en) {
  return `${rotaAdi(rota)}-${en}.png`;
}

/**
 * Görsel fark kararı. Eşik YÜZDEDİR (varsayılan %0,5): farklı piksel
 * sayısının toplam piksele oranı eşiği AŞARSA kusur. Toplam sıfırsa
 * (boş görüntü) karşılaştırılacak bir şey yoktur — kusur sayılır, çünkü
 * "boş görüntü boş görüntüye eşit" demek sessiz bir geçiş olurdu.
 */
export function gorselFark(farkPiksel, toplamPiksel, esikYuzde = 0.5) {
  if (!Number.isFinite(toplamPiksel) || toplamPiksel <= 0) {
    return { yuzde: null, kusur: true, sebep: 'karşılaştırılacak piksel yok' };
  }
  const yuzde = (farkPiksel / toplamPiksel) * 100;
  return {
    yuzde,
    kusur: yuzde > esikYuzde,
    sebep: yuzde > esikYuzde ? `fark %${yuzde.toFixed(2)} > eşik %${esikYuzde}` : null,
  };
}

/**
 * Lighthouse kategori puanlarından eşiğin altında kalanları listeler.
 * `puanlar` 0–100 ölçeğindedir; `null` puan (kategori ölçülemedi) da
 * eşiğin altı sayılır — ölçülemeyen kategori "geçti" olamaz.
 */
export function esikAltindakiler(puanlar, esik = 90) {
  return Object.entries(puanlar ?? {})
    .filter(([, p]) => p === null || p === undefined || !Number.isFinite(p) || p < esik)
    .map(([kategori, puan]) => ({ kategori, puan: Number.isFinite(puan) ? puan : null }));
}

/** Lighthouse 0–1 puanını 0–100 tam sayıya çevirir; ölçülemeyen `null` kalır. */
export function yuzPuan(skor) {
  if (skor === null || skor === undefined || !Number.isFinite(skor)) return null;
  return Math.round(skor * 100);
}

/* axe-core etki dereceleri; ciddi ve kritik kapıyı kapatır. `minor` ve
   `moderate` raporlanır ama çıkış kodunu değiştirmez — bir sonraki
   turun listesidir, bu turun engeli değil. */
export const CIDDI_ETKILER = new Set(['serious', 'critical']);

export function axeCiddiMi(etki) {
  return CIDDI_ETKILER.has(String(etki ?? '').toLowerCase());
}

/** İhlal listesini ciddi/kritik ve diğer diye ikiye ayırır. */
export function axeOzeti(ihlaller) {
  const ciddi = [];
  const diger = [];
  for (const i of ihlaller ?? []) (axeCiddiMi(i.impact) ? ciddi : diger).push(i);
  return { ciddi, diger, kapiKapali: ciddi.length > 0 };
}

/* ═══════════════════════════════════════════════════════════════════════
   KIRPILAN İÇERİK — "kaydırılabiliyor mu" değil, "ERİŞİLEBİLİYOR MU"

   Yatay taşma kapısı sayfanın yana kaymasını ölçer ve kaydırma kabı
   içindeki taşmayı haklı olarak kusur saymaz: kap kaydırmayı üstlenmiş,
   içerik hâlâ erişilebilirdir. Ama aynı muafiyet `overflow: hidden` için
   GEÇERLİ DEĞİLDİR — orada içerik ne belgeyi kaydırır ne de kullanıcı
   ona ulaşabilir. Sessizce yok olur; kapı da yok olduğunu göremez.

   Ölçüldü (bu kural yazılmadan önce, /tesisler/[id]):
     · 375px — 420px veri paneli `left: -45px`'e oturuyor; kendi sol
       45px'i plakanın `overflow: hidden` kenarında kesiliyordu ("UYUM
       ENDEKSİ" → "UM ENDEKSİ"). Kimlik ve ölçü şeridi 0px kutuya
       çöküyor, metin üst üste binmiş hayalet olarak kalıyordu.
     · 768px — beş ölçü 276px'e sıkışıyor, değerler komşu sütunun
       üstüne biniyordu ("165 M" · "Yüksek 3").
   Yatay taşma kapısı ikisine de "0 kusur" diyordu.

   ── İKİ ÖLÇÜM, TEK SORU ───────────────────────────────────────────────
   `disari`  Öğenin KUTUSU, kırpan atanın görünür kutusunun dışında kalan
             kadarı. Panelin sol 45px'i budur.
   `tasma`   Öğenin AKIŞ İÇİ ve GÖRÜNÜR içeriğinin kendi kutusunu aştığı
             kadarı. Sıfıra çökmüş kutu bunun uç hâlidir.

   `tasma` bilerek `scrollWidth` DEĞİLDİR: `scrollWidth` konumlandırılmış
   ve gizli soyları da sayar; ölçüldüğünde ipucu balonları ve tuval
   künyeleri yanlış alarm üretti (ölçüldü: 8 rotada 60'tan çok yanlış
   bulgu). Akış içi + görünür ölçüm bunların hiçbirini üretmez.

   Ayrım şudur:
     · yol üstünde `auto`/`scroll` kap → içerik ERİŞİLEBİLİR, kusur değil
     · kap `hidden` / `clip`          → içerik KAYIP, kusur
     · kırpan kap yok                 → taşma belgeye çıkar; birinci
                                        kusur türü zaten yakalar

   `tasma` için öğe KENDİ kırpmasını yönetiyorsa (kendi `overflow-x`'i
   görünür değil) suçlanmaz: üç nokta ya da kendi kaydırma kabı onun
   sözleşmesidir. `disari` için böyle bir muafiyet YOKTUR — kendi
   kırpmasını yöneten bir öğe de atasının kenarında kesilebilir. */

/** Kırpılma toleransı (px): alt piksel yuvarlaması ve 1px kenarlıklar kusur üretmesin. */
export const KIRPILMA_TOLERANSI = 4;

/** Erişilebilirliği koruyan kap türleri — bunların içindeki taşma kusur değildir. */
export const KAYDIRAN_KAPLAR = new Set(['auto', 'scroll', 'overlay']);

/** Kırpmayı GÖSTEREN işaretler: üç nokta ve satır kırpma. */
const KESME_ISARETI = (o) => String(o?.metinTasmasi ?? 'clip') !== 'clip'
  || Number(o?.satirKirpma ?? 0) > 0;

/**
 * Tek bir ölçümün kararı. Eksik/bozuk ölçüm kusur ÜRETMEZ — ölçülemeyen
 * bir şey "kusurlu" da olamaz (bkz. bilinmeyen ≠ sıfır).
 * @param {{disari?:number, tasma?:number, kendiOverflow?:string,
 *          metinTasmasi?:string, satirKirpma?:number,
 *          kapMetinTasmasi?:string, kapSatirKirpma?:number,
 *          kapTuru?:string|null, erisilir?:boolean}|null|undefined} olcum
 * @param {number} [tolerans]
 */
export function kirpilmaKarari(olcum, tolerans = KIRPILMA_TOLERANSI) {
  if (olcum?.erisilir) return { kusur: false, sebep: 'kaydırılarak erişilir' };
  const kap = olcum?.kapTuru === null || olcum?.kapTuru === undefined
    ? null : String(olcum.kapTuru);
  if (kap === null) return { kusur: false, sebep: 'kırpan ata yok — taşma belgeye çıkar' };

  const disari = Number(olcum?.disari);
  if (Number.isFinite(disari) && disari > tolerans) {
    /* Kırpan ATA görünür bir kesme işareti taşıyorsa (üç nokta, satır
       kırpma) kırpma DUYURULMUŞTUR: işaret kesme kenarında çizilir ve
       "devamı var" der — o kutunun kestiği çocuk da o işaretin
       kapsamındadır. Ölçüldü (/kanitlar · 375px): kırpan ata
       `text-overflow: ellipsis` VE `title` taşıyordu; 12 borç satırı bu
       yüzden yanlış alarmdı. İşaretsiz kırpan ata (hero plakası gibi)
       muaf DEĞİLDİR ve suçlu kalır. */
    if (KESME_ISARETI({ metinTasmasi: olcum?.kapMetinTasmasi, satirKirpma: olcum?.kapSatirKirpma })) {
      return { kusur: false, sebep: 'kırpan ata kesmeyi GÖSTEREREK yönetiyor' };
    }
    return { kusur: true, tur: 'kap dışı', sebep: `kap ${kap} · kutunun ${Math.round(disari)}px'i kırpılıyor` };
  }

  const tasma = Number(olcum?.tasma);
  if (!Number.isFinite(tasma) || tasma <= tolerans) return { kusur: false, sebep: null };
  /* Öğenin KENDİ kırpması ancak GÖRÜNÜR bir işaret taşıyorsa muaftır.
     Eskiden yalnız `overflow-x !== visible` bakılıyordu ve bu, işaretsiz
     kırpmayı da aklıyordu: `overflow: hidden` + `white-space: nowrap`,
     üç nokta OLMADAN, metni sessizce keser. Metin düğümleri ağaçta
     gezilmediği için o kayıp başka hiçbir yerde de görünmezdi. */
  if (String(olcum?.kendiOverflow ?? 'visible') !== 'visible') {
    if (KESME_ISARETI(olcum)) return { kusur: false, sebep: 'öğe kırpmayı GÖSTEREREK yönetiyor' };
    return {
      kusur: true,
      tur: 'işaretsiz kırpma',
      sebep: `öğe kendi içeriğinin ${Math.round(tasma)}px'ini İŞARETSİZ kesiyor`,
    };
  }
  return { kusur: true, tur: 'kutuya sığmıyor', sebep: `kap ${kap} · içeriğin ${Math.round(tasma)}px'i kutunun dışında` };
}

/**
 * Aynı kırpmanın iç içe her katmanı ayrı kusur gibi görünür; suç EN
 * DIŞTAKİNE yazılır. `yol` gövdeden öğeye kadar çocuk indislerinin
 * dizisidir; atası da kusurluysa çocuk düşer.
 * @template {{yol?: number[]}} T
 * @param {T[]|null|undefined} adaylar
 * @returns {T[]}
 */
export function enDistakiKirpilmalar(adaylar) {
  const liste = (adaylar ?? []).filter((a) => Array.isArray(a?.yol));
  const anahtar = (yol) => yol.join('.');
  const kusurlu = new Set(liste.map((a) => anahtar(a.yol)));
  return liste.filter((a) => {
    for (let i = 1; i < a.yol.length; i += 1) {
      if (kusurlu.has(anahtar(a.yol.slice(0, i)))) return false;
    }
    return true;
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   KALİTE BORCU CIRCIRI — liste yalnız KÜÇÜLEBİLİR

   Bir kapıyı "bütün bulgular bitince bloklayıcı yaparız" diye beklet-
   mek, kapıyı aylarca isteğe bağlı bırakır; o arada borç sessizce
   büyür ve kimse fark etmez. Alternatif: bugünkü borcu YAZIYA DÖK,
   kapıyı BUGÜN bloklayıcı yap, listeyi bir cırcırla koru.

   Liste bir mazeret değil bir TAVANDIR. Dört diş geri dönmeyi engeller:

     1 · TAVAN     — listedeki ölçüm `azami`yi aşarsa kırmızı.
     2 · ALT KÜME  — listede olmayan her bulgu kırmızı.
     3 · TABAN DAL — dal listesi `origin/main` listesinin alt kümesi
                     olmalı: satır eklemek ya da tavan yükseltmek kırmızı.
     4 · OKUNAMAZSA KIRMIZI — taban dal okunamıyorsa CI'da kırmızı;
                     yerelde yalnız gerekçeli atlama.

   Üçüncü diş olmasaydı ilk ikisi kâğıttan olurdu: bulguyu düzeltmek
   yerine listeye bir satır eklemek kapıyı yeşile döndürürdü. Taban dal
   DAL DEĞİL `origin/main`'dir — dalın kendi listesine bakmak, dalın
   kendi eklemesini meşrulaştırırdı. */

/* ── BORÇ ANAHTARI · İKİ KAPININ ORTAK DEĞİŞMEZİ ───────────────────
   Anahtar; rota + bant + kural/tür YANINDA kararlı bir HEDEF KİMLİĞİ
   taşır. Taşımıyordu — ve İKİ kapıda da taşımıyordu: taşma kapısında
   hedef yalnız SAYIMA giriyordu (imza), anahtara değil. Sonuç, artık
   bloklayıcı olan bir kapının İÇİNDE bir bypass'tı:

     bir PR izinli hedefi kaldırır, aynı rotada + aynı bantta + aynı
     kuralla BAŞKA bir hedef getirir; sayı tavanı aşmadığı için bulgu
     "mevcut borç" sayılır ve ciddi bir ihlal, bir başkasının yerine
     sessizce geçer.

   Hedef kimliğini iki kapı da ayrı üretir (`tasmaHedefi`, `axeKimlikBicimi`)
   ama TEK sözleşmeye uyar ve `tests/kalite-kapilari.test.ts` ikisini
   birlikte sınar: aynı rota + bant + kural, FARKLI hedef → FARKLI
   anahtar. Böylece bir sonraki ayrışma incelemede değil KAPIDA çıkar. */
export function borcAnahtari(k) {
  return [k?.kapi, k?.tur, k?.rota, k?.bant, k?.hedef ?? ''].join('|');
}

/**
 * Taşma kapısının hedef kimliği: etiket + kutu eni.
 *
 * Kutu eni yerleşimden gelir (`table-layout: fixed` sütun genişliği),
 * satır sayısından değil — tekrarlayan satırlar tek hedefte birleşir,
 * yapısal olarak başka bir kırpma ayrı hedef olur.
 */
export function tasmaHedefi(oge) {
  const etiket = String(oge?.etiket ?? '').trim() || '‹etiketsiz›';
  const en = Number(oge?.genislik);
  return `${etiket}@${Number.isFinite(en) ? Math.round(en) : '?'}px`;
}

/* ── axe HEDEF KİMLİĞİ · YAPISAL YOL + SIRA ─────────────────────────
   Kimlik axe'ın `target` seçicisinden TÜRETİLMEZ ve bu, ÖLÇÜMLE
   kararlaştırıldı — tahminle değil.

   axe hedefi, düğümü DOM'da benzersiz kılan EN KISA seçicidir; yani
   sayfadaki ÖTEKİ düğümlere bağlıdır. Ölçüldü (/saklama · 375px, tek
   bir LegalHold kaydı eklenerek):

     0 kayıt → ".ab-vt-sar"            · 1 eşleşme
     1 kayıt → "section > .ab-vt-sar"  · 2 eşleşme

   Yani hem eşleşme SAYISI hem HAM SEÇİCİNİN KENDİSİ veriyle değişti.
   Kimliği ikisinden birine bağlamak, veri değişince satırı "yeni"
   gösterir, DİŞ 3 yeniden yazmayı yasaklar ve düzeltmeyi yapan kişi
   KİLİTLENİR — tavanları öğe sayısına bağlayıp CI'yı kırdıran hatanın
   aynı ailesi.

   Kimlik bunun yerine SAYFANIN YAPISINDAN üretilir:

     yapısal yol  gövdeye doğru en fazla dört kademe; her kademe
                  `etiket` + SIRALI sınıfları. `:nth-child` YOKTUR, yani
                  ilgisiz bir kardeşin eklenmesi kimliği kaydırmaz.
     sıra         AYNI yapısal yola uyan düğümler arasındaki sıra;
                  HER ZAMAN yazılır — tek düğümde de "#1".

   Sıranın her zaman yazılması şart: yalnız çakışınca eklenseydi, ikinci
   düğüm ortaya çıktığında BİRİNCİNİN kimliği "yol" → "yol#1" diye
   değişirdi; kaçınılmak istenen kilidin ta kendisi. */

/** Yapısal kimliğin metin biçimi. Sıra HER ZAMAN yazılır. */
/** Örtüşme toleransı: alt piksel ve kenar teması gürültü üretmesin. */
export const ORTUSME_TOLERANSI = 2;

/**
 * ÜÇÜNCÜ KUSUR TÜRÜ — AKIŞ İÇİ ÖRTÜŞME.
 *
 * İlk iki ölçü "içerik kayıp mı" diye sorar: sayfa kayıyor mu, kırpılıyor
 * mu. İkisi de SESSİZ kalırken içerik yine okunamaz olabilir — iki metin
 * üst üste binerse ikisi de oradadır, ikisi de görünürdür ve ikisi de
 * okunmaz. Ölçüldü (/riskler/[id] · 375px): son kırıntı eylem düğmesinin
 * üstüne biniyordu; sayfa kaymıyordu, kırpan ata yoktu, axe örtüşme
 * ölçmez. Kusur gözle bulundu — ve göz 69 rota × 2 bantta ölçeklenmez.
 *
 * MUAFİYET: kasıtlı KATMANLAR. İpucu balonu, açılır menü, yapışkan
 * başlık, kip penceresi — hepsi bir şeyin üstüne binmek için vardır.
 * Ayrım "üst üste mi" değil, "AYNI AKIŞ tarafından mı yerleştirildi":
 * iki taşıyıcının en yakın akış-dışı atası AYNIYSA ikisini de aynı
 * yerleşim algoritması koymuştur ve kesişme o algoritmanın kusurudur.
 * Ataları farklıysa biri bilerek katmanlanmıştır.
 *
 * @param {{akisDisi?:boolean, en?:number, boy?:number}|null|undefined} olcum
 * @param {number} [tolerans]
 */
export function ortusmeKarari(olcum, tolerans = ORTUSME_TOLERANSI) {
  if (!olcum) return { kusur: false, sebep: 'ölçüm yok' };
  if (olcum.akisDisi) {
    return { kusur: false, sebep: 'kasıtlı katman — taşıyıcılar ayrı akış bağlamında' };
  }
  const en = Number(olcum.en);
  const boy = Number(olcum.boy);
  /* Ölçülemeyen örtüşme kusur DEĞİLDİR (bilinmeyen ≠ sıfır'ın kapı
     karşılığı: ölçülemeyen bir şey "kusurlu" da olamaz). */
  if (!Number.isFinite(en) || !Number.isFinite(boy)) return { kusur: false, sebep: 'ölçülemedi' };
  /* Kesişme İKİ eksende birden anlamlı olmalı: bitişik iki kutunun
     paylaştığı kenar (1px) ya da alt piksel yuvarlaması örtüşme değildir. */
  if (en <= tolerans || boy <= tolerans) {
    return { kusur: false, sebep: `kesişme ${Math.round(en)}×${Math.round(boy)}px — tolerans içinde` };
  }
  return {
    kusur: true,
    tur: 'akış içi örtüşme',
    sebep: `${Math.round(en)}×${Math.round(boy)}px kesişiyor — ikisi de okunmuyor`,
  };
}

/**
 * Örtüşme hedefi: İKİ taşıyıcının YAPISAL kimliği, sırası sabit
 * (çift = tek kusur, hangi taraf önce ölçülürse ölçülsün aynı anahtar).
 *
 * Kutu ENİ bilerek KULLANILMAZ. Öteki iki ölçüde `etiket@kutuEni`
 * yeterlidir çünkü orada en yerleşimden gelir; örtüşmede iki tarafın da
 * eni METİNDEN gelebilir ve ölçüldü: aynı kalıbın üç kaydında ikinci
 * düğme `button@102px` ve `button@101px` çıkıyor (etiket kayıt sayacı
 * taşıyor). Kimliği ene bağlamak satırı her tohumda "yeni" gösterir ve
 * DİŞ 3 onu yeniden yazmayı yasaklardı — axe kimliğinde ölçülüp
 * kapatılan boşluğun aynısı.
 */
export function ortusmeHedefi(a, b) {
  const kimlik = (o) => o?.yapisal || o?.etiket || '';
  return [kimlik(a), kimlik(b)].sort().join(' ↔ ');
}

export function axeKimlikBicimi(kimlik) {
  const yol = String(kimlik?.yol ?? '').trim() || '‹yolsuz›';
  const sira = Number(kimlik?.sira);
  return `${yol}#${Number.isFinite(sira) && sira > 0 ? sira : '?'}`;
}

/**
 * Aynı yapısal yolu paylaşan düğümler: sıra olmasaydı kimlik onları
 * ayırt etmezdi. Kapı bunu yazar — "birleştirildi" değil "AYRIŞTIRILDI".
 */
export function ayristirilanHedefler(kimlikler) {
  const grup = new Map();
  for (const k of kimlikler ?? []) {
    const yol = String(k?.yol ?? '');
    if (!grup.has(yol)) grup.set(yol, new Set());
    grup.get(yol).add(axeKimlikBicimi(k));
  }
  return [...grup.entries()]
    .filter(([, hedefler]) => hedefler.size > 1)
    .map(([yol, hedefler]) => ({ norm: yol, hedefler: [...hedefler] }));
}

/**
 * DİŞ 1 + DİŞ 2 — bulguları izin listesine karşı süzer.
 * @param {{kapi:string,tur:string,rota:string,bant:number,hedef?:string,
 *          olcum:number,birim?:string,not?:string,hedefDegisti?:string[]}[]} bulgular
 * @param {{kapi:string,tur:string,rota:string,bant:number,hedef?:string,azami:number}[]} borc
 */
export function borcSuzgeci(bulgular, borc) {
  const liste = new Map((borc ?? []).map((b) => [borcAnahtari(b), b]));
  const yeni = [];
  const asan = [];
  const kalan = [];
  /* Hedefsiz anahtar: aynı rota + bant + kural, başka hedef. Bir bulgu
     YENİ ama bu öbekte listede satır VARSA, büyük olasılıkla bir hedef
     ÖTEKİNİN YERİNE geçmiştir — bypass'ın tam kendisi. Ayrı raporlanır,
     çünkü "yeni kusur" ile "kusur yer değiştirdi" farklı işlerdir. */
  const obek = new Map();
  for (const b of borc ?? []) {
    const o = [b.kapi, b.tur, b.rota, b.bant].join('|');
    if (!obek.has(o)) obek.set(o, []);
    obek.get(o).push(b.hedef);
  }
  for (const b of bulgular ?? []) {
    const satir = liste.get(borcAnahtari(b));
    if (!satir) {                                                 // DİŞ 2
      const listedeki = obek.get([b.kapi, b.tur, b.rota, b.bant].join('|'));
      yeni.push(listedeki ? { ...b, hedefDegisti: listedeki } : b);
      continue;
    }
    if (Number(b.olcum) > Number(satir.azami)) {                  // DİŞ 1
      asan.push({ ...b, azami: satir.azami });
      continue;
    }
    kalan.push({ ...b, azami: satir.azami });
  }
  /* Düzelmiş satır: listede var ama artık bulunmuyor. Kapıyı kırmızı
     yakmaz — silinmesi gerektiğini SÖYLER. */
  const gorulen = new Set((bulgular ?? []).map(borcAnahtari));
  const duzelmis = (borc ?? []).filter((b) => !gorulen.has(borcAnahtari(b)));
  return { yeni, asan, kalan, duzelmis, kapiKapali: yeni.length > 0 || asan.length > 0 };
}

/**
 * DİŞ 3 — dal listesi taban dal listesinin ALT KÜMESİ mi.
 * Satır eklemek ya da tavan yükseltmek kırmızıdır; satır silmek ve
 * tavan düşürmek serbesttir (cırcır bu yöne döner).
 */
export function circirKarari(dalBorcu, tabanBorcu, turBeyani = {}) {
  /* ── YENİ KUSUR TÜRÜ ────────────────────────────────────────────────
     Yeni bir kusur TÜRÜ ölçülmeye başlandığında (üçüncü ölçü olarak
     örtüşme gibi) o türün ilk bulguları tabanda OLAMAZ: taban dalın
     aracı o türü hiç ölçmemiştir. Cırcır bunu "eklendi" diye okur ve
     yeni bir kapının kurulmasını imkânsız kılardı — oysa kapıyı kurmak
     borcu BÜYÜTMEZ, GÖRÜNÜR yapar.

     Kapı BEYANA bağlıdır (`kalite-borcu.json → _yeni_tur`) ve bir
     kaldıraç değildir, çünkü açılma koşulu yine TABANIN şeklidir: yalnız
     taban o türü henüz beyan etmemişken açılır. Beyan main'e girdiği an
     bu yol o tür için kalıcı olarak ölür.

     Var olan bir türe satır eklemenin yolu DEĞİLDİR: beyan `kapi/tur`
     çiftine bakar, satırın kendisine değil. Yeni bir tür adı uydurup
     satır yazmak da işe yaramaz — bulgular gerçek `tur` ile üretilir,
     uydurma türe yazılan satır hiçbir bulguyu karşılamaz ve ölü satır
     olarak DÜZELMİŞ raporunda görünür. */
  const kume = (l) => new Set((l ?? []).map(String));
  const dalBeyan = kume(turBeyani.dalBeyan);
  const dalKayit = kume(turBeyani.dalKayit);
  const tabanKayit = kume(turBeyani.tabanKayit);
  /* Tabanın ZATEN ÖLÇTÜĞÜ türler: kayıt defteri + tabanda satırı olan
     her tür. İkincisi ÖNYÜKLEME kilidi — kayıt defteri tabana girene
     kadar (yani bu değişiklik main'e alınana kadar) `tabanKayit` boştur
     ve tek başına hiçbir şeyi engellemezdi.

     Tabanın BEYANINA (`_yeni_tur`) bakılmaz ve bakılmamalı: beyan bir
     NİYETTİR, ölçüm değil. Kapıyı kapatan şey türün ölçülmüş OLMASIDIR;
     defter + borç bunu söyler, beyan söylemez. */
  const tabandaOlculen = new Set([
    ...tabanKayit,
    ...(tabanBorcu ?? []).map((b) => `${b?.kapi}/${b?.tur}`),
  ]);
  const yeniTurMu = (b) => {
    const ad = `${b?.kapi}/${b?.tur}`;
    /* 1 · Dal BEYAN etmiş olmalı (`_yeni_tur`).
       2 · Dalın KAYIT DEFTERİNDE olmalı: aracın gerçekten ürettiği bir
           tür. Uydurma ad buradan geçemez.
       3 · Taban onu ÖLÇMEMİŞ olmalı — ne kayıt defterinde ne borcunda.
           Bu diş olmadan beyan bir KALDIRAÇTI: `_yeni_tur` bu değişiklikle
           geldiği için taban beyanı BOŞTUR ve o hâliyle `kirpilan-icerik`
           gibi ÇOKTAN ÖLÇÜLEN bir tür beyan edilip o türde istediğin
           kadar satır eklenebilirdi. */
    return dalBeyan.has(ad) && dalKayit.has(ad) && !tabandaOlculen.has(ad);
  };
  /* 4 · KAYIT DEFTERİ KÜÇÜLEMEZ. Küçülebilseydi bir PR türü defterden
     düşürür, bir sonraki PR onu "yeni" diye yeniden beyan ederdi. */
  const dusenTur = [...tabanKayit].filter((t) => !dalKayit.has(t));
  const taban = new Map((tabanBorcu ?? []).map((b) => [borcAnahtari(b), b]));
  /* ── ANAHTAR ŞEMASI GEÇİŞİ ──────────────────────────────────────────
     Anahtara HEDEF eklendiğinde her satırın anahtarı değişir ve cırcır
     bunu "hepsi eklenmiş" diye okur. Oysa aynı borç, DAHA KESİN
     yazılmıştır; büyüme değildir.

     Geçiş bir KALDIRAÇ DEĞİLDİR, çünkü koşulu TABANIN şeklidir ve dal
     onu belirleyemez: yalnız taban satırı hedefsizken açılır. Taban bir
     kez hedefli satır taşıdıktan sonra (yani bu değişiklik main'e
     girdikten sonra) bu dal kalıcı olarak ölür — hiçbir PR onu geri
     açamaz.

     Geçiş de sınırsız değildir: bir eski satırın altına, o satırın
     TAVANINDAN çok yeni satır konamaz ve hiçbirinin tavanı eskisini
     aşamaz. Yani "daha kesin yazmak" borcu büyütmenin yolu olamaz. */
  const eskiObek = new Map();
  for (const t of tabanBorcu ?? []) {
    if (t?.hedef !== undefined && t?.hedef !== null) continue;
    eskiObek.set([t.kapi, t.tur, t.rota, t.bant].join('|'), t);
  }

  const eklenen = [];
  const yukseltilen = [];
  const gecis = new Map();
  for (const b of dalBorcu ?? []) {
    const t = taban.get(borcAnahtari(b));
    if (t) {
      if (Number(b.azami) > Number(t.azami)) yukseltilen.push({ ...b, tabanAzami: t.azami });
      continue;
    }
    const eski = eskiObek.get([b.kapi, b.tur, b.rota, b.bant].join('|'));
    if (!eski) { eklenen.push(b); continue; }
    if (!gecis.has(eski)) gecis.set(eski, []);
    gecis.get(eski).push(b);
  }

  for (const [eski, yeniler] of gecis) {
    if (yeniler.length > Number(eski.azami)) {
      eklenen.push(...yeniler.map((b) => ({ ...b, gecisAsimi: eski.azami })));
      continue;
    }
    for (const b of yeniler) {
      if (Number(b.azami) > Number(eski.azami)) yukseltilen.push({ ...b, tabanAzami: eski.azami });
    }
  }

  /* Beyan edilmiş yeni türün satırları "eklendi" saymaz ama GİZLENMEZ:
     ayrı başlıkta raporlanır. */
  const yeniTur = eklenen.filter(yeniTurMu);
  const gercekEklenen = eklenen.filter((b) => !yeniTurMu(b));

  return {
    eklenen: gercekEklenen,
    yukseltilen,
    yeniTur,
    dusenTur,
    gecis: [...gecis.values()].flat().length,
    kapiKapali: gercekEklenen.length > 0 || yukseltilen.length > 0 || dusenTur.length > 0,
  };
}

/**
 * `CI` ortam değişkeni GERÇEKTEN CI'yı mı söylüyor.
 *
 * `Boolean(process.env.CI)` yetmez: kabuklar ve araçlar `CI=false` ya da
 * `CI=0` ihraç eder ve dizge olarak ikisi de doğrudur. O hâlde yerel bir
 * kabuk kendini CI sanır ve belgelenmiş `--circir-atla` çıkışı sessizce
 * kaybolurdu. Değer AYRIŞTIRILIR; tanımsızlık CI değildir.
 */
export function ciMi(deger) {
  const v = String(deger ?? '').trim().toLowerCase();
  if (v === '') return false;
  return !['0', 'false', 'no', 'off'].includes(v);
}
