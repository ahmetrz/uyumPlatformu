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

/**
 * Tek bir ölçümün kararı. Eksik/bozuk ölçüm kusur ÜRETMEZ — ölçülemeyen
 * bir şey "kusurlu" da olamaz (bkz. bilinmeyen ≠ sıfır).
 * @param {{disari?:number, tasma?:number, kendiOverflow?:string,
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
    return { kusur: true, tur: 'kap dışı', sebep: `kap ${kap} · kutunun ${Math.round(disari)}px'i kırpılıyor` };
  }

  const tasma = Number(olcum?.tasma);
  if (!Number.isFinite(tasma) || tasma <= tolerans) return { kusur: false, sebep: null };
  if (String(olcum?.kendiOverflow ?? 'visible') !== 'visible') {
    return { kusur: false, sebep: 'öğe kendi kırpmasını yönetiyor' };
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
