import 'server-only';
import { tesisKapsamda } from '@/lib/api/yetki';
import { izinliTesisIdleri, type Modul } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';

/* ═══ EKRAN KAPSAMI — santral sınırının TEK yeri ══════════════════════════
   `lib/erisim.ts → izinliTesisIdleri(k, modul)` kullanıcının bir modülde
   görebildiği santral kümesini verir:
     null  = kapsam sınırı yok (tüm santraller)
     []    = hiçbir santral
     dizi  = yalnız o santraller

   Bu dosya o sözleşmeyi Prisma `where` parçasına ve satır kararına çevirir.
   Yetki MODELİ burada DEĞİŞMEZ — `lib/erisim.ts` tek karar mercii kalır;
   burada yalnız aynı kararın ekran tarafındaki iki biçimi yaşar.

   ── SANTRALİ BİLİNMEYEN KAYIT ─────────────────────────────────────────
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
 * Birden çok modülden okuyan ekranlar için birleşik kapsam (santral
 * portföyü yüzeyleri: F1 · F2 · F3). "Bu santrale HERHANGİ bir modülden
 * okuma hakkım var mı?" sorusunu yanıtlar.
 *
 * Kesişim DEĞİL birleşim alınır bilinçli olarak: kesişim, denetim modülüne
 * kapsamsız yetkili bir dış denetçiyi envanter kapsamı yüzünden santralden
 * tümüyle dışarı atardı. Birleşim yalnız "santral listesinde görünme"
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
 * Kullanıcı bu modülü OKUYABİLİR mi? — santral kapsamından AYRI bir eksen
 * ve ikisi birbirinin yerini tutmaz: kapsamsız (`null`) ama yanlış modülde
 * yetkili bir kullanıcı, kapsam süzgecinden geçer ve her şeyi görürdü.
 *
 * NEDEN `izinVar(k, modul, 'okuma')` DEĞİL: `lib/erisim.ts → kapsamUyar`
 * kuralına göre kapsamsız (`{}`) bir işlem GLOBAL bir işlemdir ve tesise
 * KISITLI bir yetki onu geçemez. Yani `izinVar(k,'envanter','okuma')`
 * yalnız A santraline yetkili bir kullanıcı için `false` döner — bu doğru
 * yanıttır ama SORU yanlıştır: ekran "tüm santralleri okuyabilir misin"
 * diye sormamalı, "okuyabildiğin santral var mı" diye sormalıdır.
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
 * Hata metni yalnız MODÜLÜ söyler, hiçbir santralin adını/kodunu değil.
 */
export function modulKapisi(k: AktifKullanici, modul: Modul): void {
  if (!modulOkuyabilir(k, modul)) {
    throw new Error(`Bu ekran ${modul} modülünde okuma izni ister`);
  }
}
