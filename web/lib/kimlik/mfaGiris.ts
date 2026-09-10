import 'server-only';

/* ═══ P6 · MFA · GİRİŞ ANINDA DOĞRULAMA ═══════════════════════════════

   ── NEDEN `'use server'` DOSYASINDA DEĞİL ─────────────────────────────
   Bu fonksiyon bir SUNUCU EYLEMİ OLAMAZ ve olması bir açıktı (bağımsız
   inceleme bulgusu, #49). Gerekçe: `kullaniciId`yi OTURUMDAN alamaz —
   çağrıldığı anda henüz oturum yoktur, kullanıcı tam da giriş yapmaya
   çalışmaktadır. Kardeş MFA eylemleri (`mfaKur` · `mfaDogrula` ·
   `mfaKaldir`) `kendiHesabi()` ile oturuma bakar; bu bakamaz.

   Bir `'use server'` dosyasından ihraç edilseydi derlenmiş bir uç
   noktaya dönüşür ve oturumsuz bir çağıran, istediği `kullaniciId` ile
   çağırıp iki şey elde ederdi: bir kodun geçerli olup olmadığını
   söyleyen bir KÂHİN ve kurtarma kodlarını TÜKETME imkânı. Bu yüzden
   `server-only` bir modülde durur; onu yalnız `girisEylemleri.ts`
   çağırır ve çağırmadan önce PAROLAYI doğrulamış olur.

   ── TEKRAR ENGELİ ATOMİK ──────────────────────────────────────────────
   `sonAdim` okuması ile yazması arasında bir yield noktası var; koşulsuz
   `update` iki eşzamanlı çağrının aynı kodu geçirmesine izin verirdi
   (aynı bulgu). Yazma `updateMany` ile OKUNAN adıma koşullanır: satır
   bu arada ilerlediyse hiçbir satır eşleşmez ve kod TEKRAR sayılır. */

import { db } from '../db';
import { parolaDogru } from '../auth';
import { iz } from '../eylemler2/ortak';
import { coz } from './sifreleme';
import { TOTP_RET_SOZU, kurtarmaNormalize, totpDogrula } from './totp';

export type GirisDogrulamasi =
  | { ok: true; kurtarmaIle: boolean }
  | { ok: false; hata: string };

export async function mfaGirisDogrula(o: {
  kullaniciId: string; kod: string; simdiMs?: number;
}): Promise<GirisDogrulamasi> {
  const kayit = await db.mfaKaydi.findUnique({
    where: { kullaniciId: o.kullaniciId },
    include: { kurtarmaKodlari: { where: { kullanildi: null } } },
  });
  if (!kayit || !kayit.dogrulandi) {
    return { ok: false, hata: 'Bu hesapta doğrulanmış bir MFA kaydı yok.' };
  }
  const simdiMs = o.simdiMs ?? Date.now();

  const sir = await coz(kayit.sirZarfi);
  if (sir.ok) {
    const sonuc = totpDogrula({
      sirBase32: sir.deger, kod: o.kod, simdiMs, sonKullanilanAdim: kayit.sonAdim,
    });
    if (sonuc.ok) {
      /* KOŞULLU YAZMA: okunan adım hâlâ geçerli mi. Değilse başka bir
         çağrı bu kodu (ya da daha ilerisini) çoktan kullanmıştır. */
      const { count } = await db.mfaKaydi.updateMany({
        where: { id: kayit.id, sonAdim: kayit.sonAdim },
        data: { sonAdim: sonuc.adim, sonKullanim: new Date(simdiMs) },
      });
      if (count === 0) return { ok: false, hata: TOTP_RET_SOZU.tekrar };
      /* BAŞARILI İKİNCİ FAKTÖR DE İZ BIRAKIR. Kurtarma dalı bunu zaten
         yazıyordu, TOTP dalı yazmıyordu — komşu yolun doğru yapması
         bunun bilinçli bir karar değil atlanmış bir dal olduğunu
         gösterir (bağımsız inceleme bulgusu, #49). */
      await iz({
        aktorId: o.kullaniciId, varlikTipi: 'MfaKaydi', varlikId: o.kullaniciId,
        eylem: 'guncelleme', alan: 'giris',
        sonra: 'TOTP doğrulandı',
        gerekce: 'Girişte ikinci faktör doğrulandı',
      });
      return { ok: true, kurtarmaIle: false };
    }
    if (sonuc.sebep === 'tekrar') return { ok: false, hata: TOTP_RET_SOZU.tekrar };
  }

  const aday = kurtarmaNormalize(o.kod);
  for (const kod of kayit.kurtarmaKodlari) {
    if (!parolaDogru(aday, kod.kodHash)) continue;
    /* KOŞULLU YAZMA: iki eşzamanlı deneme aynı kodu kullanamasın. */
    const { count } = await db.mfaKurtarmaKodu.updateMany({
      where: { id: kod.id, kullanildi: null }, data: { kullanildi: new Date(simdiMs) },
    });
    if (count === 0) break;
    await iz({
      aktorId: o.kullaniciId, varlikTipi: 'MfaKaydi', varlikId: o.kullaniciId,
      eylem: 'guncelleme', alan: 'kurtarma',
      sonra: 'kurtarma kodu kullanıldı',
      gerekce: `Kalan kurtarma kodu: ${kayit.kurtarmaKodlari.length - 1}`,
    });
    return { ok: true, kurtarmaIle: true };
  }

  return { ok: false, hata: sir.ok ? TOTP_RET_SOZU.kod_yanlis : sir.hata };
}

/** Hesabın DOĞRULANMIŞ bir ikinci faktörü var mı — giriş akışının sorusu. */
export async function mfaKuruluMu(kullaniciId: string): Promise<boolean> {
  const k = await db.mfaKaydi.findUnique({
    where: { kullaniciId }, select: { dogrulandi: true },
  });
  return k?.dogrulandi === true;
}
