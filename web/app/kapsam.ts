import 'server-only';
import { tesisKapsamda } from '@/lib/api/yetki';
import { izinVar, izinliKapsamOgesiIdleri, izinliTesisIdleri, KAPSAM_SONRA, type Islem, type Modul } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';

/* ═══ EKRAN KAPSAMI — tesis sınırının TEK yeri ══════════════════════════
   `lib/erisim.ts → izinliTesisIdleri(k, modul)` kullanıcının bir modülde
   görebildiği tesis kümesini verir:
     null  = kapsam sınırı yok (tüm tesisler)
     []    = hiçbir tesis
     dizi  = yalnız o tesisler

   Bu dosya o sözleşmeyi Prisma `where` parçasına ve satır kararına çevirir.
   Yetki MODELİ burada DEĞİŞMEZ — `lib/erisim.ts` tek karar mercii kalır;
   burada yalnız aynı kararın ekran tarafındaki iki biçimi yaşar.

   ── TESİSİ BİLİNMEYEN KAYIT ─────────────────────────────────────────
   Kural `lib/api/yetki.ts → tesisKapsamda` ile AYNIDIR ve tekrarlanmaz,
   AYNEN o fonksiyon çağrılır: `tesisId === null` olan kayıt yalnız kapsamı
   sınırsız kullanıcıya görünür. API katmanı ile ekran katmanı bu noktada
   ayrışırsa, aynı kayıt bir kapıdan sızıp diğerinden sızmaz olur ve hangi
   davranışın doğru olduğu bir daha bilinemez.

   Prisma karşılığı da bilinçlidir: `{ tesisId: { in: [...] } }` NULL satırı
   eşleştirmez (SQL `IN` NULL ile hiçbir zaman doğru dönmez), yani süzgeç
   `tesisKapsamda` ile birebir aynı kümeyi seçer. */

/** `izinliTesisIdleri` çıktısı: null = tümü · [] = hiçbiri · dizi = o küme. */
export type TesisKapsami = string[] | null;

/** Satır kararı — `lib/api/yetki.ts`'teki kuralın kendisi (kopyası değil). */
export const kapsamda = tesisKapsamda;

/**
 * Prisma `where` parçası. Doğrudan `tesisId` kolonu taşıyan model için
 * yayılır (`{ silindi: null, ...kapsamKosulu(izinli) }`); ilişki üzerinden
 * bağlı model için iç içe verilir (`{ maddeDurumu: kapsamKosulu(izinli) }`).
 *
 * `null` kapsamda BOŞ nesne döner: sorguya hiç koşul eklenmez.
 */
export function kapsamKosulu(kapsam: TesisKapsami): { tesisId?: { in: string[] } } {
  return kapsam === null ? {} : { tesisId: { in: kapsam } };
}

/**
 * Birden çok modülden okuyan ekranlar için birleşik kapsam (tesis
 * portföyü yüzeyleri: F1 · F2 · F3). "Bu tesise HERHANGİ bir modülden
 * okuma hakkım var mı?" sorusunu yanıtlar.
 *
 * Kesişim DEĞİL birleşim alınır bilinçli olarak: kesişim, denetim modülüne
 * kapsamsız yetkili bir dış denetçiyi envanter kapsamı yüzünden tesisten
 * tümüyle dışarı atardı. Birleşim yalnız "tesis listesinde görünme"
 * kapısıdır; panellerin İÇERİĞİ ayrıca kendi modülüyle daraltılır.
 */
export function birlesikKapsam(...kapsamlar: TesisKapsami[]): TesisKapsami {
  if (kapsamlar.some((k) => k === null)) return null;
  return [...new Set(kapsamlar.flat() as string[])];
}

/** Ekran "kayıt yok" mu diyecek, "kapsamınızda kayıt yok" mu — ikisi farklıdır. */
export function kapsamDaraltildi(kapsam: TesisKapsami): boolean {
  return kapsam !== null;
}

/**
 * Kullanıcı bu modülü OKUYABİLİR mi? — tesis kapsamından AYRI bir eksen
 * ve ikisi birbirinin yerini tutmaz: kapsamsız (`null`) ama yanlış modülde
 * yetkili bir kullanıcı, kapsam süzgecinden geçer ve her şeyi görürdü.
 *
 * NEDEN `izinVar(k, modul, 'okuma')` DEĞİL: `lib/erisim.ts → kapsamUyar`
 * kuralına göre kapsamsız (`{}`) bir işlem GLOBAL bir işlemdir ve tesise
 * KISITLI bir yetki onu geçemez. Yani `izinVar(k,'envanter','okuma')`
 * yalnız A tesisine yetkili bir kullanıcı için `false` döner — bu doğru
 * yanıttır ama SORU yanlıştır: ekran "tüm tesisleri okuyabilir misin"
 * diye sormamalı, "okuyabildiğin tesis var mı" diye sormalıdır.
 * `izinVar` ile sorulsaydı kapsamı dar HER kullanıcı ekrandan tümüyle
 * atılırdı — sızıntıyı kapatırken ürünü kırmak olurdu.
 *
 * Doğru soru `lib/api/yetki.ts → okumaKapsami` içinde zaten sorulmuştur:
 * boş küme = modülde okuma izni yok. Burada AYNI yüklem kullanılır.
 */
export function modulOkuyabilir(k: AktifKullanici, modul: Modul): boolean {
  const idler = izinliTesisIdleri(k, modul);
  return idler === null || idler.length > 0;
}

/**
 * Ekranın MODÜL kapısı — veri katmanının kendi kilidi.
 *
 * Kapı İKİ kez uygulanır ve bu tekrar bilinçlidir:
 *   · sayfa `modulOkuyabilir` ile `<Yetkisiz />` render eder (kullanıcı ne
 *     olduğunu görsün),
 *   · veri katmanı burada FIRLATIR (kapı atlanırsa veri yine de gelmesin).
 * Ekranı susturmak bir yetki kontrolü değildir; sınır veridedir.
 *
 * Hata metni yalnız MODÜLÜ söyler, hiçbir tesisin adını/kodunu değil.
 */
export function modulKapisi(k: AktifKullanici, modul: Modul): void {
  if (!modulOkuyabilir(k, modul)) {
    throw new Error(`Bu ekran ${modul} modülünde okuma izni ister`);
  }
}

/* ═══ YAZMA KAPISI — ekran ile sunucu aynı soruyu sorar ═══════════════════
   `modulOkuyabilir` okuma ekseninde çözülen sorun, yazma ekseninde
   çözülmemişti ve ekranlar kusuru üç kez ayrı ayrı elle yamamıştı
   (`dokumanlar/veri.ts`, `surecler/page.tsx`, `surecler/[id]/page.tsx`);
   geri kalan ekranlar yamamamıştı. Aşağıdaki iki yüklem o yamayı adlandırır
   ve sunucudaki İKİ AŞAMALI KAPI ile birebir aynı iki soruyu sorar. */

/**
 * Kaba kapı — "bu modülde bu işlemi HERHANGİ bir kapsamda yapabilir misin?"
 * Sunucudaki `yetkiZorunlu(modul, islem, KAPSAM_SONRA)` ön kapısının ekran
 * karşılığıdır; aynı sabiti kullanır, yani ikisi ayrışamaz.
 *
 * NEDEN `izinVar(k, modul, islem)` DEĞİL: kapsamsız `{}` çağrı GLOBAL bir
 * işlem sorar ve `kapsamUyar` gereği tesise KISITLI her rolü reddeder.
 * Ekran o yanıtı "yazamazsın" diye okuyup düğmeyi gizliyordu; oysa tesis
 * yöneticisi KENDİ tesisinde pekâlâ yazabilir. Soru yanlıştı: ekran "tüm
 * tesislerde yazabilir misin" diye sormamalı, "yazabildiğin tesis var
 * mı" diye sormalıdır.
 *
 * Tek başına bir yetki kapısı DEĞİLDİR — satır kararı `kapsamdaYetkili`
 * ile verilir, gerçek sınır ise her zaman sunucu eylemindedir.
 */
export function modulYazabilir(k: AktifKullanici, modul: Modul, islem: Islem): boolean {
  return izinVar(k, modul, islem, KAPSAM_SONRA);
}

/**
 * Satır kararı — sunucudaki `kapsamZorunlu` ile AYNI normalleştirme.
 * Kapsamı olmayan kayıt (`tesisId === null`) kapsamsız `{}` sorulur, yani
 * tesise kısıtlı rol kurumsal kayda uzanamaz.
 *
 * Ekranlar bunu `!kayit.tesisId || izinVar(...)` diye yazıyordu; o biçim
 * tesissiz kaydı HERKESE yazılabilir gösteriyor, sunucu ise reddediyordu.
 * Ekranın sunucudan GEVŞEK olması, kullanıcıya kaydedilmeyecek bir düğme
 * göstermek demektir.
 */
export function kapsamdaYetkili(
  k: AktifKullanici, modul: Modul, islem: Islem, tesisId: string | null | undefined,
): boolean {
  return izinVar(k, modul, islem, tesisId ? { tesisId } : {});
}

/* ═══ KAPSAM ÖĞESİ EKSENİ (B1) ═══════════════════════════════════════════
   Omurga tabloları (madde durumu · süreç kapsamı · uygulanabilirlik kararı
   · istisna · kanıt bağı · denetçi kapsamı · aktarım · anlık · yetki) B1'den
   beri TESİSE değil KAPSAM ÖĞESİNE bağlıdır. Onları okuyan ekran kapsamı
   `ogeKapsami` ile öğe kümesi olarak alır ve aşağıdaki yardımcılarla
   sorgular. Tesis tabanlı tablolar (varlık · olay · risk · ağ bölgesi …)
   yukarıdaki `kapsamKosulu` ile süzülmeye devam eder. İki eksen
   KARIŞTIRILMAZ: öğe kümesiyle `tesisId` süzmek ya da tesis kümesiyle
   `kapsamOgesiId` süzmek sessizce boş küme verir ("kapsamınızda kayıt
   yok" görünür, kusur görünmez). Kural `tesisKapsamda` ile aynıdır:
   öğesi olmayan kayıt yalnız kapsamı sınırsız kullanıcıya görünür. */

/** `izinliKapsamOgesiIdleri` çıktısı: null = tümü · [] = hiçbiri · dizi = o küme. */
export type OgeKapsami = string[] | null;

export const ogeKapsami = izinliKapsamOgesiIdleri;

/** Omurga tablosu için Prisma `where` parçası. */
export function ogeKosulu(kapsam: OgeKapsami): { kapsamOgesiId?: { in: string[] } } {
  return kapsam === null ? {} : { kapsamOgesiId: { in: kapsam } };
}

/** Omurga tablosu TESİS kapsamıyla süzülür — tesis merkezli ekranlar
    (portföy, tesis kartları, rapor matrisi) için: öğenin tesis köprüsü
    kapsamda olmalı. Köprüsüz öğenin satırı kapsamı sınırlı kullanıcıya
    görünmez (`tesisKapsamda` kuralı: tesisi bilinmeyen kayıt yalnız
    sınırsız kapsama görünür). */
export function kopruKosulu(kapsam: TesisKapsami): { kapsamOgesi?: { tesisId: { in: string[] } } } {
  return kapsam === null ? {} : { kapsamOgesi: { tesisId: { in: kapsam } } };
}

/** Satır kararı — `tesisKapsamda` kuralının öğe ekseni. */
export function ogeKapsamda(kapsam: OgeKapsami, kapsamOgesiId: string | null): boolean {
  if (kapsamOgesiId === null) return kapsam === null;
  return kapsam === null || kapsam.includes(kapsamOgesiId);
}

/** `kapsamdaYetkili`nin öğe ekseni: öğesiz kayıt kapsamsız `{}` sorulur. */
export function ogeYetkili(
  k: AktifKullanici, modul: Modul, islem: Islem, kapsamOgesiId: string | null | undefined,
): boolean {
  return izinVar(k, modul, islem, kapsamOgesiId ? { kapsamOgesiId } : {});
}

/** Ekranların öğe görünümü: kod ve ad öğeden; `tesisId` köprüsü tesis
    sayfasına bağlantı içindir (köprüsüz öğede null → bağlantı yok). */
export const OGE_GORUNUMU = { select: { id: true, kod: true, ad: true, tesisId: true } } as const;
export type OgeGorunumu = { id: string; kod: string; ad: string; tesisId: string | null };
