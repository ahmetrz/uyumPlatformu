/* Şema bekçilerinin SAF çekirdeği — `prisma/schema.prisma` metnini model ve
   alan adlarına ayırır; veritabanı ve dosya sistemi bilmez.

   Ayrı modül, çünkü iki test dosyası kullanır (`kapsam-omurga` ve
   `sema-sektorsuz`) ve kalıcı vakalar sentetik şema parçalarını da aynı
   ayrıştırıcıdan geçirir: bekçi gerçek şemada yeşilse, aynı kod kirli
   bir parçada kırmızı olmalıdır — sabotaj testin içinde yaşar. */

export type SemaModeli = { ad: string; alanlar: string[] };

/** `model X { … }` bloklarını ayrıştırır. Alan = yorum ve `@@` satırı
    olmayan her satırın ilk sözcüğü (ilişki alanları dâhil — ad taşırlar). */
export function semaModelleri(sema: string): SemaModeli[] {
  const modeller: SemaModeli[] = [];
  for (const m of sema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const alanlar = m[2].split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('//') && !s.startsWith('@@'))
      .map((s) => s.split(/\s+/)[0]);
    modeller.push({ ad: m[1], alanlar });
  }
  return modeller;
}

/** Omurga: `kapsamOgesiId` taşıyan modeller — tanım şemanın kendisinden
    türer, elle liste tutulmaz (tutulsaydı yeni omurga tablosu bekçinin
    dışında doğardı). */
export function omurgaModelleri(modeller: readonly SemaModeli[]): string[] {
  return modeller.filter((m) => m.alanlar.includes('kapsamOgesiId')).map((m) => m.ad);
}

/** Omurga tablosunda doğrudan `tesisId` — köprünün yeniden çakılması. */
export function omurgaIhlalleri(modeller: readonly SemaModeli[]): string[] {
  return modeller
    .filter((m) => m.alanlar.includes('kapsamOgesiId') && m.alanlar.includes('tesisId'))
    .map((m) => m.ad);
}

/** Paketin öznitelik olarak beyan ettiği bir anahtarla AYNI adlı çekirdek
    kolonu: sektöre özgü alan kolona geri sızmış demektir. */
export function sektorKolonlari(
  modeller: readonly SemaModeli[], anahtarlar: readonly string[],
): { model: string; alan: string }[] {
  const kume = new Set(anahtarlar);
  const bulgular: { model: string; alan: string }[] = [];
  for (const m of modeller) {
    for (const a of m.alanlar) if (kume.has(a)) bulgular.push({ model: m.ad, alan: a });
  }
  return bulgular;
}
