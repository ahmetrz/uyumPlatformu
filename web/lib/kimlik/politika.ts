/* ═══ P6 · KİRACI OTURUM POLİTİKASI · SAF KATMAN ══════════════════════

   Oturum ömrü bugüne kadar koda gömülüydü (12 saat mutlak · 2 saat atıl)
   ve gerekçesi `lib/auth.ts` başlığında yazılı. Bu dosya o sayıları
   KİRACIYA açar; VARSAYILANLARI DEĞİŞTİRMEZ.

   ── VARSAYILAN KORUNUR, ÇÜNKÜ GEREKÇESİ DURUYOR ───────────────────────
   12/2 keyfî değildi: mutlak süre kayan olmadığı için çalınmış bir çerez
   sonsuza dek yaşamaz, atıl süre de kilitlenmemiş bir dizüstünü
   devretmez. Kiracı bunu SIKILAŞTIRABİLİR; gevşetmesi de mümkündür ama
   sınırsız değildir — tavanlar burada ve gerekçeleriyle durur.

   ── MFA ZORUNLULUĞU BİR POLİTİKA ALANIDIR, BİR BAYRAK DEĞİL ───────────
   "MFA zorunlu" açıksa TOTP'si olmayan YEREL hesap giriş yapamaz. Kural
   yerel hesaba bakar: kurum hesabıyla (OIDC) gelen kullanıcının ikinci
   faktörü IdP'nin işidir ve orada zorlanır — ürünün onu ikinci kez
   sorması, IdP'nin verdiği kararı bilmediği hâlde tekrar etmesi olurdu.
   Bu sınır BİLİNÇLİDİR ve ekranda yazılıdır. */

export type OturumPolitikasiVerisi = {
  mutlakSaat: number;
  atilSaat: number;
  mfaZorunlu: boolean;
};

/** `lib/auth.ts`teki tarihsel değerler — gerekçesi orada yazılı. */
export const VARSAYILAN_POLITIKA: OturumPolitikasiVerisi = {
  mutlakSaat: 12, atilSaat: 2, mfaZorunlu: false,
};

/* Tavan ve tabanlar. Tavan: bir uyum ürününde bir haftalık oturum, "kim
   yaptı" sorusunu bir haftalık belirsizliğe çevirir. Taban: beş dakikalık
   bir atıl süre, ürünü kullanılamaz kılar ve kullanıcıyı politikayı
   kapatmaya iter — uygulanmayan bir kontrol, olmayan bir kontroldür. */
export const MUTLAK_TAVAN_SAAT = 24;
export const MUTLAK_TABAN_SAAT = 1;
export const ATIL_TAVAN_SAAT = 12;
export const ATIL_TABAN_SAAT = 0.25;

export type PolitikaKapisi = { ok: true } | { ok: false; sebep: string };

export function politikaKapisi(p: {
  mutlakSaat: number; atilSaat: number;
}): PolitikaKapisi {
  if (!Number.isFinite(p.mutlakSaat) || !Number.isFinite(p.atilSaat)) {
    return { ok: false, sebep: 'Süreler sayı olmalı' };
  }
  if (p.mutlakSaat < MUTLAK_TABAN_SAAT || p.mutlakSaat > MUTLAK_TAVAN_SAAT) {
    return {
      ok: false,
      sebep: `Mutlak oturum süresi ${MUTLAK_TABAN_SAAT}–${MUTLAK_TAVAN_SAAT} saat`
        + ' arasında olmalı. Daha uzunu, denetim izinde "kim yaptı" sorusunu'
        + ' bir günlük belirsizliğe çevirir.',
    };
  }
  if (p.atilSaat < ATIL_TABAN_SAAT || p.atilSaat > ATIL_TAVAN_SAAT) {
    return {
      ok: false,
      sebep: `Atıl süre ${ATIL_TABAN_SAAT}–${ATIL_TAVAN_SAAT} saat arasında olmalı.`,
    };
  }
  /* ATIL SÜRE MUTLAKTAN BÜYÜK OLAMAZ. Olsaydı atıl eşiği hiç işlemez ve
     ekran uygulanmayan bir kontrolü uygulanıyor gösterirdi — şemada
     duran ama hiç yazılmayan `sonKullanim` sütununun aynı hatası. */
  if (p.atilSaat > p.mutlakSaat) {
    return {
      ok: false,
      sebep: 'Atıl süre mutlak süreden büyük olamaz — büyük olsaydı atıl eşiği'
        + ' hiçbir zaman işlemez, ekran ise uygulanmayan bir kontrolü uygulanıyor'
        + ' gösterirdi.',
    };
  }
  return { ok: true };
}

/** Kayıt yoksa VARSAYILAN döner — "politika yok" ile "politika sıfır" ayrı. */
export function politikaCoz(
  kayit: Partial<OturumPolitikasiVerisi> | null | undefined,
): OturumPolitikasiVerisi {
  if (!kayit) return { ...VARSAYILAN_POLITIKA };
  return {
    mutlakSaat: kayit.mutlakSaat ?? VARSAYILAN_POLITIKA.mutlakSaat,
    atilSaat: kayit.atilSaat ?? VARSAYILAN_POLITIKA.atilSaat,
    mfaZorunlu: kayit.mfaZorunlu ?? VARSAYILAN_POLITIKA.mfaZorunlu,
  };
}

export type MfaKapisi =
  | { ok: true }
  | { ok: false; sebep: string };

/**
 * MFA zorunluluğu kapısı — YEREL girişte.
 *
 * `mfaKurulu` false ve politika zorunlu ise giriş REDDEDİLİR ve kullanıcı
 * ne yapması gerektiğini öğrenir. Sessizce içeri almak, politikayı ekranda
 * "açık" gösterip fiilen uygulamamak olurdu.
 */
export function mfaGirisKapisi(o: {
  mfaZorunlu: boolean; mfaKurulu: boolean; kurumHesabi: boolean;
}): MfaKapisi {
  if (!o.mfaZorunlu) return { ok: true };
  if (o.kurumHesabi) return { ok: true };
  if (o.mfaKurulu) return { ok: true };
  return {
    ok: false,
    sebep: 'Bu kurulumda çok adımlı doğrulama zorunlu ve hesabınızda tanımlı değil.'
      + ' Yöneticinizden MFA kaydı açmasını isteyin; kurum hesabıyla giriş açıksa'
      + ' ikinci faktör kimlik sağlayıcınızda uygulanır.',
  };
}
