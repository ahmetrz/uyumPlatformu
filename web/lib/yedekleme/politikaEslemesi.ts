/**
 * Yedekleme politikası ↔ kapsam ögesi eşlemesi.
 *
 * Bağ şemada YABANCI ANAHTARLA kurulmuş değil, politika ADINDA
 * (`${tesis.ad} — kontrol sistemi yedeklemesi`). `kapsam` alanı ayırt
 * edici değil — tesislerin çoğunda aynı metin.
 *
 * Kural EKRANDA YAZILI ("Ad … ile başlamıyor — kayıt bu tesise
 * bağlanmaz") ve bu yüzden ölçülebilir bir yerde durmalı: sayfanın
 * gövdesindeki bir döngü, ekranın cümlesini doğrulayan bir vakaya
 * kapalıdır — R-F'nin ölçmek istediği BAĞ tam olarak budur.
 *
 * İki incelik kasıtlıdır:
 * 1. ÖNCE UZUN ADLAR denenir; yoksa "Çayırhan" adlı kapsam ögesi,
 *    "Çayırhan B" ögesinin politikasını kapardı.
 * 2. Eşleşen politika havuzdan DÜŞER; iki öge aynı kaydı paylaşamaz.
 */
export function politikaEslemesi<Ad extends { ad: string }, P extends { ad: string }>(
  ogeler: readonly (Ad & { id: string })[],
  politikalar: readonly P[],
): Map<string, P> {
  const havuz = new Set(politikalar);
  const harita = new Map<string, P>();
  for (const t of [...ogeler].sort((a, b) => b.ad.length - a.ad.length)) {
    for (const p of havuz) {
      if (p.ad.startsWith(t.ad)) { harita.set(t.id, p); havuz.delete(p); break; }
    }
  }
  return harita;
}
