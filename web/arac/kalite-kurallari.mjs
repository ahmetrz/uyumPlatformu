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
