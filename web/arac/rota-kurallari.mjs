/* Rota duman testinin YÖNLENDİRME kuralları — ayrı modülde durur ki
   `rota-duman.mjs` (yüklenince tarayıcı açar) olmadan test edilebilsin.

   ── İNCELEME KUSURU (P1) ──────────────────────────────────────────────
   Araç, istenen rota BAŞKA BİR BİLİNEN ROTAYA düştüğünde kaynağın kabuk
   beklentisini sessizce varışınkiyle DEĞİŞTİRİYOR ve kontrolü GEÇTİ
   sayıyordu. Yani `/riskler`i `/`ye atan bir regresyon 200 döner, flagship
   kabuk kontrollerini geçer ve raporlanan 40/40 kapsamın içinde yer alırdı
   — oysa `/riskler` hiç çizilmemiştir. Kapsam sayısı böyle bir regresyonu
   ÖRTER; "40/40" cümlesi de yanlış olur.

   Artık yalnız burada yazılı olan yönlendirme kabul edilir; başka her
   varış değişimi ROTA KUSURUDUR. Yeni bir yönlendirme eklendiğinde bu
   listeye de eklenmesi gerekir — sessizce geçemez. */

/** Anahtar: istenen rota · Değer: izin verilen TEK varış. */
export const BILINCLI_YONLENDIRME = new Map([
  /* `/tesisler` kanonik santral listesi DEĞİLDİR; liste `/portfoy`dur
     (app/(atlas)/(flagship)/tesisler/page.tsx → redirect('/portfoy')).
     Ray tek aktif öğe göstersin diye iki ekran tek öğede birleştirildi. */
  ['/tesisler', '/portfoy'],
]);

/**
 * Varış değişimi bilinçli mi.
 *
 * Yönlendirme YOKSA (istenen === varılan) bu soru sorulmaz; çağıran
 * `yonlendi` ile birlikte kullanır. Burada `true` yalnız "listede yazılı"
 * demektir — varışın kendisinin geçerli bir rota olması YETMEZ.
 */
export function yonlendirmeIzinli(istenen, varilan) {
  return BILINCLI_YONLENDIRME.get(istenen) === varilan;
}

/**
 * Bir yoklamanın yönlendirme kararı: kusur var mı, kabuk beklentisi
 * devredilecek mi.
 *
 * `beklentiDevret` yalnız İZİNLİ yönlendirmede doğrudur: `/tesisler` →
 * `/portfoy` varışı (tam) katmanındadır ve rayı yoktur, kaynağın
 * beklentisiyle ölçmek aracın kendi körlüğü olurdu. İzinsiz bir varışta
 * beklenti KAYNAĞINKİ kalır — yoksa regresyon varışın kontrollerini geçip
 * kaybolur.
 */
export function yonlendirmeKarari(istenen, varilan) {
  const yonlendi = istenen !== varilan;
  if (!yonlendi) return { yonlendi: false, izinli: false, beklentiDevret: false, kusur: null };
  const izinli = yonlendirmeIzinli(istenen, varilan);
  return {
    yonlendi: true,
    izinli,
    beklentiDevret: izinli,
    kusur: izinli ? null : `beklenmeyen yönlendirme → ${varilan}`,
  };
}
