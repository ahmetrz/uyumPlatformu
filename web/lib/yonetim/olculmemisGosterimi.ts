/* ═══ Değerlendirilmemiş santral özeti — sunum ayarı ══════════════════

   Saha ekranında değerlendirilmemiş santraller ÖNCE tuvalin solunda
   176px'lik dikey bir liste kolonuydu. Kolon, takımyıldızın (ekranın asıl
   karar yüzeyi) genişliğinin altıda birini alıyor ve on bir satırı eşit
   ağırlıkta diziyordu. Oysa o satırların hiçbirinin endeksi YOKTUR —
   yani sıralanacak, karşılaştırılacak, taranacak bir şey taşımıyorlardı:
   liste bir yoklamaydı. Aynı santraller alttaki plaka şeridinde ikinci
   kez zaten görünüyordu.

   Yerine geçen: başlık altında tek satırlık ÖZET + istenirse açılan
   doklu detay paneli.

   ── NE YÖNETİLEBİLİR, NE YÖNETİLEMEZ ─────────────────────────────────
   `sahaModulleri.ts` kuralı burada da geçerlidir: sunum yönetilir, KURAL
   yönetilmez. Bu yüzden "tamamen gizle" seçeneği BİLEREK YOKTUR.

   Değerlendirilmemiş sayısı, "bilinmeyen ≠ sıfır" kuralının ekrandaki
   karşılığıdır: bugün portföyün on altı santralinden on biri hiç
   ölçülmemiştir. Bu sayıyı kapatılabilir yapmak, ekranın söylemek
   zorunda olduğu tek şeyi bir ayara bağlamak olurdu — ölçülmemiş bir
   portföy, ölçülmüş gibi görünürdü. Sayı her yerleşimde durur; yönetilen
   yalnız ne kadar AYRINTI eşlik ettiğidir. */

export type OlculmemisGosterimi = {
  /** `ozet` sayı + oran + MWe + ilk adlar · `sayi` yalnız sayı + oran. */
  gosterim: 'ozet' | 'sayi';
  /** İlk görünümde yazılan santral adı sayısı (0–5). `sayi` kipinde yok sayılır. */
  ilkKac: number;
  /** Detay listesi doklu panelde açılabilsin mi. */
  detay: 'panel' | 'kapali';
};

export const OLCULMEMIS_ILK_KAC_TAVAN = 5;

export const OLCULMEMIS_VARSAYILAN: OlculmemisGosterimi = {
  gosterim: 'ozet', ilkKac: 3, detay: 'panel',
};

export function olculmemisDogrula(
  deger: unknown,
): { ok: true; deger: OlculmemisGosterimi } | { ok: false; hata: string } {
  if (!deger || typeof deger !== 'object') {
    return { ok: false, hata: 'Gösterim bir nesne olmalı ({ gosterim, ilkKac, detay }).' };
  }
  const d = deger as Record<string, unknown>;
  if (d.gosterim !== 'ozet' && d.gosterim !== 'sayi') {
    return { ok: false, hata: '"gosterim" yalnız "ozet" ya da "sayi" olabilir; sayı her yerleşimde görünür, kapatılamaz.' };
  }
  if (typeof d.ilkKac !== 'number' || !Number.isInteger(d.ilkKac)
    || d.ilkKac < 0 || d.ilkKac > OLCULMEMIS_ILK_KAC_TAVAN) {
    return { ok: false, hata: `"ilkKac" 0 ile ${OLCULMEMIS_ILK_KAC_TAVAN} arasında tam sayı olmalı.` };
  }
  if (d.detay !== 'panel' && d.detay !== 'kapali') {
    return { ok: false, hata: '"detay" yalnız "panel" ya da "kapali" olabilir.' };
  }
  return { ok: true, deger: { gosterim: d.gosterim, ilkKac: d.ilkKac, detay: d.detay } };
}

/** Bozuk/eksik kayıtta kod varsayılanı; ekran asla boş kalmaz. */
export function olculmemisNormalle(deger: unknown): OlculmemisGosterimi {
  const d = olculmemisDogrula(deger);
  return d.ok ? d.deger : OLCULMEMIS_VARSAYILAN;
}

/** Konsol listesi / fark tablosu için tek satır özet. */
export function olculmemisMetni(g: OlculmemisGosterimi): string {
  const kip = g.gosterim === 'ozet' ? `özet · ilk ${g.ilkKac} ad` : 'yalnız sayı';
  return `${kip} · detay: ${g.detay === 'panel' ? 'panelde açılır' : 'kapalı'}`;
}

/* ── İlk görünüm ───────────────────────────────────────────────────────
   "+N diğer" eşiği AYRI bir ayar DEĞİLDİR ve bilerek öyle bırakıldı:
   N, toplam eksi gösterilen addır. Ayrı bir eşik kaydı aynı sayının
   ikinci kaynağı olurdu ve ikisi çeliştiğinde ekran hangisine uyacağını
   bilemezdi. Eşik, `ilkKac`ın kendisidir. */
export function ozetKur(
  adlar: readonly string[], g: OlculmemisGosterimi,
): { gosterilen: string[]; kalan: number } {
  const kac = g.gosterim === 'sayi' ? 0 : Math.min(g.ilkKac, adlar.length);
  return { gosterilen: adlar.slice(0, kac), kalan: adlar.length - kac };
}
