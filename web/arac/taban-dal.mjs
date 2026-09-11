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

/* ═══════════════════════════════════════════════════════════════════════
   TABAN DAL YOKKEN CIRCIR NE YAPAR? [SIS-TAB-002]

   ── ÖLÇÜLEN KUSUR (düzeltme turu · tur 2 · P2-4) ──────────────────────
   `tabanDalKarari` üç hâli AYIRDI, ama çağıranların dördü de ikinci hâli
   aynı satırla karşılıyordu:

     if (karar.hal === 'taban_yok') return;      // sessizce GEÇTİ

   Yorumu "ilk tur: kütük yeni" diyordu ve bu doğruydu — ama sessiz bir
   `return`, cırcırın HİÇ KOŞMAMASIDIR ve kapı yine yeşil yanar. Deponun
   kendi kuralı bunun tersini söyler: "Koşulmayan kapı 'geçti' yazılmaz —
   'ölçülmedi' yazılır."

   Hâl VARSAYIMSAL DEĞİLDİ: `arac/dom-tanik-kutugu.json` bu dalda DOĞDU,
   yani taban dalda yok. Tanık kütüğünün cırcırı ("kütük BÜYÜYEMEZ") tam
   da onu getiren turda hiçbir şey ölçmüyordu — ölçüm aracının kendisi,
   bu deponun adı konmuş kusurunu taşıyordu.

   ── İKİ SINIF, İKİ CEVAP ──────────────────────────────────────────────
   KÜME cırcırları (hangi satır taban dalda VARDI) için tabanın yokluğu
   bir eksiklik değil, en sıkı hâldir: taban BOŞ KÜMEdir, yani satırların
   HEPSİ yenidir ve hepsi yeni satır kuralından geçer. Beyana gerek yok.

   SAYI cırcırları (kaç satır vardı) için böyle bir hâl yoktur: sayının
   karşılaştırılacağı bir şey lazımdır. Kütüğün KENDİ `tavanlar` alanına
   bakmak ÇÖZÜM DEĞİLDİR — o alanı türetici yazar, yani kütük kendini
   kendisiyle karşılaştırır ve her zaman geçer. Bu yüzden ilk tur tavanı
   AYRI ve ELLE beyan edilir (`ilkTurTavani`); beyansızsa KIRMIZIDIR.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * SAF KARAR: taban dal yokken sayı cırcırının kullanacağı tavan.
 *
 * @param {unknown} beyan kütüğün ELLE yazdığı ilk tur tavanı
 * @param {string} alan hangi sayı (hata mesajı için)
 * @returns {{tavan: number}|{hata: string}}
 */
export function ilkTurTavani(beyan, alan) {
  if (!Number.isInteger(beyan) || beyan < 0) {
    return { hata: `TABAN DAL YOK ve kütük İLK TUR TAVANINI beyan etmemiş (${alan}). `
      + 'Sessizce geçmek cırcırın hiç koşmamasıdır: kütüğe `ilkTurTavani` '
      + `alanı ekleyin ve ${alan} için ÖLÇÜLEN sayıyı yazın. Türeticinin `
      + 'yazdığı `tavanlar` alanı bu işi göremez — kütük kendini kendisiyle '
      + 'karşılaştırır ve her zaman geçer.' };
  }
  return { tavan: beyan };
}
