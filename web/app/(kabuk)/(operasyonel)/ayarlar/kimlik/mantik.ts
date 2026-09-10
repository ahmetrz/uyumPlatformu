/* P6 · KİMLİK YÖNETİMİ EKRANI · SAF KATMAN

   Ekranın TEK birincil işi: "kurum hesabıyla giriş açık mı, değilse
   NEYİ eksik". İkinci soru ("oturum ne kadar yaşıyor") aynı ekrandadır
   çünkü ikisi de aynı kararın parçasıdır — kim, ne kadar süreyle içeride
   kalabilir.

   ── SIR DEĞERİ BU KATMANA DA GİRMEZ ───────────────────────────────────
   Ekrana yalnız MASKELİ ADRES gider (`sirMaskesi` sunucuda çağrılır).
   Bu dosya sırrı ne alır ne döndürür; alsaydı bir gün bir prop olarak
   istemciye inerdi. */

import type { Durum } from '@/components/kabuk/temel';

export type SaglayiciOzeti = {
  id: string;
  ad: string;
  issuer: string | null;
  clientId: string | null;
  /** SIRRA GİDEN ADRES — sırrın kendisi değil. */
  sirMaskeli: string;
  yetkilendirmeUcu: string | null;
  jetonUcu: string | null;
  jwksUcu: string | null;
  yonlendirmeUri: string | null;
  rolIddiasi: string | null;
  rolEslemesiJson: string | null;
  jitAcik: boolean;
  bagli: boolean;
  aktif: boolean;
  /** Yapılandırmada eksik olanlar — ADIYLA. */
  eksikler: string[];
  /** Bu sağlayıcıya bağlı kullanıcı sayısı. */
  bagSayisi: number;
};

export type KimlikVerisi = {
  saglayicilar: SaglayiciOzeti[];
  politika: { mutlakSaat: number; atilDakika: number; mfaZorunlu: boolean };
  /** Politika kaydı VAR MI — yoksa ekran "varsayılan" der, sıfır demez. */
  politikaKayitli: boolean;
  /** MFA anahtarı kurulumda tanımlı mı — yoksa MFA "bağlı değil". */
  mfaAnahtariVar: boolean;
  mfaAnahtarNotu: string;
  /** Doğrulanmış MFA kaydı olan kullanıcı sayısı. */
  mfaKurulu: number;
  kullaniciSayisi: number;
};

export type SaglayiciHali = 'aktif' | 'bagli' | 'eksik' | 'hazir';

/**
 * Sağlayıcının HÂLİ — dört ayrı durum, dördü ayrı şey.
 *
 * `eksik` ile `hazir` karıştırılmaz: biri yapılandırması tamamlanmamış
 * sağlayıcıdır, öbürü tamamlanmış ama insanın henüz bağlamadığı. İkisini
 * aynı renge boyamak, yöneticiye "ne yapmam gerek" sorusunu
 * cevaplatmazdı.
 */
export function saglayiciHali(s: SaglayiciOzeti): SaglayiciHali {
  if (s.aktif) return 'aktif';
  if (s.bagli) return 'bagli';
  return s.eksikler.length > 0 ? 'eksik' : 'hazir';
}

export const HAL_SOZU: Record<SaglayiciHali, string> = {
  aktif: 'Giriş ekranında görünüyor',
  bagli: 'Bağlı — giriş ekranında GÖRÜNMÜYOR',
  eksik: 'Yapılandırma eksik — bağlı değil',
  hazir: 'Yapılandırma tam — bağlanmayı bekliyor',
};

export const HAL_SINIFI: Record<SaglayiciHali, Durum> = {
  aktif: 'ok', bagli: 'md', eksik: 'unk', hazir: 'md',
};

/** Ekranın tek cümlelik özeti — üç saniye kuralı. */
export function kimlikCumlesi(v: KimlikVerisi): string {
  const aktif = v.saglayicilar.filter((s) => s.aktif).length;
  if (v.saglayicilar.length === 0) {
    return 'Kurum kimlik sağlayıcısı tanımlı değil — giriş yalnız yerel hesapla yapılır.';
  }
  if (aktif === 0) {
    return `${v.saglayicilar.length} sağlayıcı tanımlı, HİÇBİRİ giriş ekranında görünmüyor.`;
  }
  return `${aktif} sağlayıcı giriş ekranında görünüyor`
    + ` · ${v.saglayicilar.reduce((t, s) => t + s.bagSayisi, 0)} kullanıcı bağlı.`;
}

/** MFA özeti — "kurulu değil" ile "kurulamıyor" AYRI cümlelerdir. */
export function mfaCumlesi(v: KimlikVerisi): { cumle: string; durum: Durum } {
  if (!v.mfaAnahtariVar) {
    return {
      cumle: `Çok adımlı doğrulama BAĞLI DEĞİL: ${v.mfaAnahtarNotu}`,
      durum: 'unk',
    };
  }
  if (v.politika.mfaZorunlu && v.mfaKurulu < v.kullaniciSayisi) {
    return {
      cumle: `MFA zorunlu ama ${v.kullaniciSayisi - v.mfaKurulu} kullanıcıda kurulu değil`
        + ' — bu hesaplar yerel parolayla giriş YAPAMAZ.',
      durum: 'bd',
    };
  }
  return {
    cumle: `${v.mfaKurulu}/${v.kullaniciSayisi} kullanıcıda doğrulanmış TOTP kaydı var.`,
    durum: v.mfaKurulu > 0 ? 'ok' : 'md',
  };
}
