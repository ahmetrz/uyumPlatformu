#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   TABAN DAL OKUMASI — ÜÇ HÂL, TEK KARAR [SIS-TAB-002]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Cırcırların dördüncü dişi "taban dal okunamazsa KIRMIZI" der. Üç ayrı
   bekçi bu dişi ayrı ayrı yazıyordu ve bağımsız inceleme (PR #51, tur 1)
   birinde tek bir `catch`in ÜÇ HÂLİ birden yuttuğunu ölçtü:

     · dosya tabanda YOK   → kütüğü GETİREN dal; cırcırın tabanı yok
     · dosya var, OKUNDU   → cırcır koşar
     · dosya var, OKUNAMADI → "temiz" DEĞİLDİR

   Üçünü tek `catch`e toplayan bir okuma, üçünde de YEŞİL döner: kütük
   elle bozulursa ya da sığ bir çekimde blob okunamazsa cırcır hiç
   koşmaz ve dosya kendi içinde tutarlı olduğu için öbür dişler yeşil
   kalır.

   ── NİYE AYRI VE SAF ──────────────────────────────────────────────────
   Sabotaj turu ölçtü (S96): kararı bekçinin içinde sınamak, o dalın
   ULAŞILABİLİR olmasına bağlıdır — kütüğü GETİREN bir dalda "dosya var
   ama okunamadı" hâli hiç kurulamaz ve sabotaj kırmızı YAKMAZ. Kural saf
   bir fonksiyona alınınca sentetik olarak sınanabilir: sabotaj kuralı
   sabote eder, ölçüm ortamını değil (aynı gerekçe `yeniSatirKusurlari`
   için de yazılıydı).
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Taban dal okumasının kararı.
 *
 * @param {boolean} tabandaVar dosya taban dalda mevcut mu (`git cat-file -e`)
 * @param {string|null} ham okunan içerik; okunamadıysa `null`
 * @returns {{hal: 'taban_yok'|'okundu'|'olculemedi', belge?: unknown, sebep?: string}}
 */
export function tabanDalKarari(tabandaVar, ham) {
  if (!tabandaVar) return { hal: 'taban_yok' };
  if (ham === null || ham === undefined) {
    return { hal: 'olculemedi', sebep: 'taban daldaki dosya okunamadı' };
  }
  let belge;
  try {
    belge = JSON.parse(ham);
  } catch (e) {
    return { hal: 'olculemedi', sebep: `taban daldaki kütük bozuk: ${e.message.split('\n')[0]}` };
  }
  /* GEÇERLİ JSON YETMEZ, BİÇİM DE DOĞRU OLMALI. Ölçüldü (bağımsız
     inceleme, PR #51 tur 2): `null`, `"x"` ve `[]` "okundu" sayılıyordu
     ve çağıran `belge.tavanlar`/`belge.satirlar` deyince ham bir tip
     hatasıyla düşüyordu — kırmızı yanıyordu ama "ÖLÇÜLEMEDİ (sebep)"
     demiyordu, yani modülün var oluş gerekçesi o dalda çalışmıyordu. */
  if (belge === null || typeof belge !== 'object' || Array.isArray(belge)) {
    return { hal: 'olculemedi',
      sebep: `taban daldaki kütük bir NESNE değil (${Array.isArray(belge) ? 'dizi' : typeof belge})` };
  }
  return { hal: 'okundu', belge };
}
