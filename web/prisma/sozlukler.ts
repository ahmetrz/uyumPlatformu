/* ═══════════════════════════════════════════════════════════════════════
   SEKTÖR TERİM SÖZLÜKLERİ (P1 · URN-ALN-004)

   Çekirdek "tesis" der; sektör paketi kiracının sözcüğünü verir. Burası
   sözlüklerin TEK kaynağıdır: tohum (`seed.ts`) buradan okur, testler
   buradan okur. İki yerde ayrı ayrı yazılsalardı biri güncellenir öbürü
   sessizce eskirdi.

   ── İKİNCİ SÖZLÜK NEDEN ŞİMDİ VAR ─────────────────────────────────────
   `SU_SOZLUGU` bir çeviri değil, TASARIM SINAVIDIR. Enerjinin sözcüğü
   ("santral") tek heceli bir gövde gibi davranır ve ekleri kolay alır;
   altı hâlin yetmesi bu kolaylıktan geliyor olabilirdi. Su sözlüğü
   BİLEŞİK sözcük kullanır ("arıtma tesisi", "arıtma hattı") — üçüncü
   tekil iyelik eki gövdenin İÇİNDE olduğu için ekler değişir:

       santral + in  → santralin          arıtma tesisi + nin → …tesisinin
       santral + i   → santrali           arıtma tesisi + ni  → …tesisini

   Yani "santrali" hem belirtme hem iyelik hâline benziyordu; bileşik
   gövdede ikisi ayrışır. Cümleler bu sözlükle de kurulabiliyorsa altı
   hâl gerçekten yetiyor demektir; kurulamıyorsa hata 15 dosyada
   düzeltilir, 236 dosyada değil.

   ── EKSİK ANAHTAR BİLEREK BIRAKILDI ───────────────────────────────────
   Su sözlüğü `varlik` ve `sistem` anahtarlarını TANIMLAMAZ: çekirdeğe
   düşüşün gerçekten çalıştığı, eksiksiz bir sözlükte görülemez.
   ═══════════════════════════════════════════════════════════════════════ */

export type SozlukSatiri = {
  anahtar: string;
  tekil: string;
  cogul: string;
  iyelik: string;
  belirtme: string;
  bulunma: string;
  yonelme: string;
};

/** `SEKTOR-ENERJI-URETIM` — ilk sektör paketi (referans kiracının dili). */
export const ENERJI_SOZLUGU: SozlukSatiri[] = [
  { anahtar: 'tesis', tekil: 'santral', cogul: 'santraller',
    iyelik: 'santralin', belirtme: 'santrali',
    bulunma: 'santralde', yonelme: 'santrale' },
  { anahtar: 'birim', tekil: 'üretim ünitesi', cogul: 'üretim üniteleri',
    iyelik: 'üretim ünitesinin', belirtme: 'üretim ünitesini',
    bulunma: 'üretim ünitesinde', yonelme: 'üretim ünitesine' },
  { anahtar: 'portfoy', tekil: 'enerji portföyü', cogul: 'enerji portföyleri',
    iyelik: 'enerji portföyünün', belirtme: 'enerji portföyünü',
    bulunma: 'enerji portföyünde', yonelme: 'enerji portföyüne' },
  { anahtar: 'tesis360', tekil: 'Santral 360', cogul: 'Santral 360',
    iyelik: 'Santral 360', belirtme: 'Santral 360',
    bulunma: 'Santral 360', yonelme: 'Santral 360' },
];

/** `SEKTOR-SU-ARITMA` — ikinci sözlük İSKELETİ. Yalnız bugüne kadar
    çevrilmiş yüzeylerin kullandığı anahtarlar; altı hâl eksiksiz. */
export const SU_SOZLUGU: SozlukSatiri[] = [
  { anahtar: 'tesis', tekil: 'arıtma tesisi', cogul: 'arıtma tesisleri',
    iyelik: 'arıtma tesisinin', belirtme: 'arıtma tesisini',
    bulunma: 'arıtma tesisinde', yonelme: 'arıtma tesisine' },
  { anahtar: 'birim', tekil: 'arıtma hattı', cogul: 'arıtma hatları',
    iyelik: 'arıtma hattının', belirtme: 'arıtma hattını',
    bulunma: 'arıtma hattında', yonelme: 'arıtma hattına' },
  { anahtar: 'portfoy', tekil: 'su portföyü', cogul: 'su portföyleri',
    iyelik: 'su portföyünün', belirtme: 'su portföyünü',
    bulunma: 'su portföyünde', yonelme: 'su portföyüne' },
  { anahtar: 'tesis360', tekil: 'Arıtma Tesisi 360', cogul: 'Arıtma Tesisi 360',
    iyelik: 'Arıtma Tesisi 360', belirtme: 'Arıtma Tesisi 360',
    bulunma: 'Arıtma Tesisi 360', yonelme: 'Arıtma Tesisi 360' },
];
