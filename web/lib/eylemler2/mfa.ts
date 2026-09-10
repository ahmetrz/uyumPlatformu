'use server';

/* ═══ P6 · MFA (TOTP) · KENDİ HESABIN ═════════════════════════════════

   Bu dosyadaki eylemler KULLANICININ KENDİ hesabı içindir; kapı bir modül
   yetkisi değil OTURUMDUR — hiçbir modülde yetkisi olmayan bir hesap da
   ikinci faktörünü kurabilmelidir (`hesap.ts → kendiHesabi` ile aynı
   gerekçe).

   ── ÜÇ AŞAMA, ÜÇÜ DE AYRI ─────────────────────────────────────────────
   1. KUR — sır üretilir, ZARFLANIR, kayıt `dogrulandi=false` açılır.
      Kullanıcı henüz korunmuyor: doğrulanmamış bir kayıt "kurulu"
      sayılsaydı, doğrulayıcısına sırrı ekleyemeyen kullanıcı kendi
      hesabından kilitlenirdi.
   2. DOĞRULA — ilk kod girilir; ancak o zaman kayıt kurulu olur ve
      kurtarma kodları BİR KEZ gösterilir.
   3. KALDIR — kayıt silinir. Politika MFA'yı zorunlu kılıyorsa kaldırma
      REDDEDİLİR: kullanıcının kendi eliyle politikayı delmesi olurdu.

   ── SIR NE İZE NE EKRANA GİRER ────────────────────────────────────────
   Denetim izine "MFA kuruldu" yazılır, sır yazılmaz. Sır ekranda YALNIZ
   kaydolma anında görünür (doğrulayıcıya girilebilsin diye) ve
   veritabanında AÇIK durmaz. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { aktifKullanici, parolaOzetle } from '../auth';
import { DEMO } from '../demo';
import { MARKA_AD } from '../marka';
import { coz, sifrele } from '../kimlik/sifreleme';
import {
  TOTP_RET_SOZU, kaydolmaUri, kurtarmaKodlariUret, kurtarmaNormalize,
  totpDogrula, totpSirriUret,
} from '../kimlik/totp';
import { politikaCoz } from '../kimlik/politika';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

const YOL = '/ayarlar';

async function kendiHesabi() {
  const k = await aktifKullanici();
  if (!k) throw new Error('Oturum gerekli');
  if (DEMO) throw new Error('Demo sürümü: MFA kaydı açılmaz.');
  return k;
}

export type KurulumSonucu =
  | { ok: true; sirBase32: string; uri: string }
  | { ok: false; hata: string };

/**
 * TOTP kaydını AÇAR (henüz korumaz).
 *
 * Anahtar referansı kurulumda yoksa bu eylem SESSİZCE düz metne düşmez:
 * "bağlı değil" der ve kayıt açılmaz.
 */
export async function mfaKur(): Promise<KurulumSonucu> {
  try {
    const k = await kendiHesabi();

    const mevcut = await db.mfaKaydi.findUnique({
      where: { kullaniciId: k.id }, select: { id: true, dogrulandi: true },
    });
    if (mevcut?.dogrulandi) {
      return { ok: false, hata: 'Hesabınızda doğrulanmış bir MFA kaydı zaten var.' };
    }

    const sir = totpSirriUret();
    const zarf = await sifrele(sir);
    if (!zarf.ok) return { ok: false, hata: zarf.hata };

    /* Doğrulanmamış eski kayıt DEĞİŞTİRİLİR, ikincisi açılmaz: aynı
       kullanıcı için iki sır, hangisinin geçerli olduğunu belirsiz
       bırakırdı (`kullaniciId` zaten tekil). */
    await db.mfaKaydi.upsert({
      where: { kullaniciId: k.id },
      create: { kullaniciId: k.id, sirZarfi: zarf.zarf, dogrulandi: false },
      update: { sirZarfi: zarf.zarf, dogrulandi: false, sonAdim: null },
    });

    await iz({
      aktorId: k.id, varlikTipi: 'MfaKaydi', varlikId: k.id,
      eylem: 'olusturma', alan: 'kayit',
      /* SIR YAZILMAZ — yalnız kaydın açıldığı. */
      sonra: 'TOTP kaydı açıldı (doğrulanmadı)',
      gerekce: 'Kullanıcı ikinci faktör kaydı başlattı',
    });

    revalidatePath(YOL);
    return {
      ok: true,
      sirBase32: sir,
      /* Yayıncı MARKADAN gelir, koda gömülmez. */
      uri: kaydolmaUri({ yayinci: MARKA_AD, hesap: k.eposta, sirBase32: sir }),
    };
  } catch (e) {
    const s = hata(e);
    return { ok: false, hata: s.ok ? 'Beklenmeyen hata' : s.hata };
  }
}

export type DogrulamaSonucu =
  | { ok: true; kurtarmaKodlari: string[] }
  | { ok: false; hata: string };

/** İlk kodu doğrular; ancak bundan sonra kayıt KURULU sayılır. */
export async function mfaDogrula(girdi: { kod: string }): Promise<DogrulamaSonucu> {
  try {
    const k = await kendiHesabi();
    const v = z.object({ kod: bosluksuz('Kod').max(12) }).parse(girdi);

    const kayit = await db.mfaKaydi.findUnique({ where: { kullaniciId: k.id } });
    if (!kayit) return { ok: false, hata: 'Önce MFA kaydı açın.' };
    if (kayit.dogrulandi) return { ok: false, hata: 'Bu kayıt zaten doğrulanmış.' };

    const sir = await coz(kayit.sirZarfi);
    if (!sir.ok) return { ok: false, hata: sir.hata };

    const sonuc = totpDogrula({
      sirBase32: sir.deger, kod: v.kod, simdiMs: Date.now(),
      sonKullanilanAdim: kayit.sonAdim,
    });
    if (!sonuc.ok) return { ok: false, hata: TOTP_RET_SOZU[sonuc.sebep] };

    /* Kurtarma kodları BİR KEZ gösterilir; veritabanına ÖZETLERİ gider.
       Kodun kendisi saklansaydı, veritabanı yedeği ikinci faktörü tümden
       geçersiz kılardı. */
    const kodlar = kurtarmaKodlariUret();
    await db.$transaction(async (tx) => {
      await tx.mfaKaydi.update({
        where: { id: kayit.id },
        data: { dogrulandi: true, sonAdim: sonuc.adim, sonKullanim: new Date() },
      });
      await tx.mfaKurtarmaKodu.deleteMany({ where: { kayitId: kayit.id } });
      for (const kod of kodlar) {
        await tx.mfaKurtarmaKodu.create({
          data: { kayitId: kayit.id, kodHash: parolaOzetle(kurtarmaNormalize(kod)) },
        });
      }
      await iz({
        aktorId: k.id, varlikTipi: 'MfaKaydi', varlikId: k.id,
        eylem: 'guncelleme', alan: 'dogrulandi',
        once: 'doğrulanmadı', sonra: 'doğrulandı',
        gerekce: `${kodlar.length} kurtarma kodu üretildi (özetleri saklandı)`,
      }, tx);
    });

    revalidatePath(YOL);
    return { ok: true, kurtarmaKodlari: kodlar };
  } catch (e) {
    const s = hata(e);
    return { ok: false, hata: s.ok ? 'Beklenmeyen hata' : s.hata };
  }
}

/**
 * Kaydı kaldırır — MFA ZORUNLUYSA REDDEDİLİR.
 *
 * Zorunluluk açıkken kullanıcının kendi kaydını silmesi, politikayı
 * ekranda "açık" bırakıp fiilen delmek olurdu.
 */
export async function mfaKaldir(): Promise<Sonuc> {
  try {
    const k = await kendiHesabi();
    const politika = politikaCoz(await db.oturumPolitikasi.findUnique({
      where: { kiraci: 'varsayilan' },
      select: { mutlakSaat: true, mfaZorunlu: true },
    }).then((p) => (p ? { mutlakSaat: p.mutlakSaat, mfaZorunlu: p.mfaZorunlu } : null)));

    if (politika.mfaZorunlu) {
      return {
        ok: false,
        hata: 'Bu kurulumda çok adımlı doğrulama zorunlu — kaydınızı kaldıramazsınız.'
          + ' Doğrulayıcınızı değiştirecekseniz önce yeni kaydı kurun.',
      };
    }

    const kayit = await db.mfaKaydi.findUnique({
      where: { kullaniciId: k.id }, select: { id: true },
    });
    if (!kayit) return { ok: false, hata: 'Hesabınızda MFA kaydı yok.' };

    await db.$transaction(async (tx) => {
      /* Kurtarma kodları kaskatla düşer (şemada `onDelete: Cascade`);
         bu bir MÜŞTERİ VERİSİ değil, kullanıcının kendi kimlik doğrulama
         kaydıdır ve R-C kapsamı dışındadır (R-C paket işlemleri içindir). */
      await tx.mfaKaydi.delete({ where: { id: kayit.id } });
      await iz({
        aktorId: k.id, varlikTipi: 'MfaKaydi', varlikId: k.id,
        eylem: 'silme', alan: 'kayit',
        once: 'doğrulanmış TOTP kaydı', sonra: 'kayıt yok',
        gerekce: 'Kullanıcı kendi ikinci faktörünü kaldırdı',
      }, tx);
    });

    revalidatePath(YOL);
    return tamam();
  } catch (e) {
    return hata(e);
  }
}

/* ── Giriş anında doğrulama BU DOSYADA DEĞİL ─────────────────────────
   `mfaGirisDogrula` `lib/kimlik/mfaGiris.ts`e TAŞINDI ve gerekçe orada
   yazılı: bu dosya `'use server'`dır, ihraç ettiği her fonksiyon bir uç
   noktadır ve o fonksiyon `kullaniciId`yi OTURUMDAN alamaz (çağrıldığı
   anda oturum yoktur). Burada kalsaydı oturumsuz bir çağıran istediği
   kullanıcı için kod deneyebilir ve kurtarma kodlarını tüketebilirdi
   (bağımsız inceleme bulgusu, #49). */
